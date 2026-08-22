import type { JsonNode } from '../core/jsonDocument'
import { decode, encode, getMember, readString } from '../core/access'
import { readLayout } from './layout'
import { cloneNode } from './mutations'
import {
  derivePagesDocument,
  findFreeTextNodes,
  FREE_TEXT_KEYS,
  type FreeText
} from './scope'
import {
  collectPersonalData,
  findingsIn,
  personalValueText,
  type PersonalFinding,
  type PersonalHome,
  type PersonalKind
} from './personalData'

/**
 * Le socle d'un export **partageable** : un nom de fichier qui ne dit rien du pilote, et
 * une copie du document dont les textes personnels ont été remplacés.
 *
 * ## Trois règles qui commandent tout ce fichier
 *
 * 1. **L'export normal ne passe pas par ici.** La fidélité à l'octet près est la promesse
 *    du projet : un fichier ouvert puis réexporté sans modification ressort avec la même
 *    empreinte SHA-256. Rien de ce module n'est appelé sur ce chemin — `exportContainer`
 *    rend les octets d'origine quand rien n'a bougé, et le sérialiseur les reproduit
 *    quand quelque chose a bougé. L'anonymisation est une **modification demandée** : elle
 *    a le droit de changer les octets, et elle seule.
 * 2. **Le document en mémoire n'est jamais touché.** Chaque fonction rend un arbre neuf.
 *    Un pilote qui demande un aperçu de l'anonymisation, puis y renonce, doit retrouver
 *    son fichier intact — au bit près, et sans que l'historique d'édition ait bougé.
 * 3. **On annonce avant de changer.** L'inventaire de ce qui sera remplacé n'est pas
 *    calculé par un second bout de code qui « devrait » dire la même chose : il est rendu
 *    **par la fonction qui fait le travail**, à côté du document produit. L'appelant
 *    affiche l'inventaire, puis jette le document si le pilote refuse. Les deux ne peuvent
 *    pas diverger, parce qu'il n'y en a qu'un.
 *
 * ## Deux façons de rendre un fichier partageable, et elles ne se remplacent pas
 *
 * 1. **`anonymizeDocument`** dérive un export `pages` : les préférences ne sont pas
 *    filtrées, elles ne sont **jamais mises**. C'est la protection la plus sûre, et elle
 *    coûte tout ce qui est réglage — vario, sons, unités, capteurs.
 * 2. **`anonymizeBackup`** garde la sauvegarde entière et **remplace** les données
 *    personnelles ligne par ligne. Le pilote qui demande de l'aide sur ses réglages de
 *    vario a besoin de celle-là : la première ne porte aucun réglage, donc aucune question.
 *
 * La seconde repose sur une liste nominative (`PREFERENCE_RULES`), donc sur une **liste
 * noire**, avec le mode de défaillance que `scope.ts` décrit : un réglage personnel apparu
 * dans une version future partirait en clair. Deux parades, et aucune n'est du code :
 * l'inventaire est **montré avant** le téléchargement, et `findPersonalSuspects` signale
 * ce qui ressemble à une donnée personnelle sans être déclaré — il avertit, il ne remplace
 * pas.
 *
 * ## Ce module n'affiche rien
 *
 * Il rend des fonctions et des données. Les textes portés par `reason` sont destinés à
 * être montrés au pilote — ils sont en français, comme le reste de l'interface — mais
 * c'est l'interface qui décide où et comment.
 */

/* ------------------------------------------------------------------ nom du fichier */

/**
 * Le préfixe fixe de tout nom produit. Il n'a l'air de rien et il sert deux fois :
 *
 * - **il situe le fichier.** XCTrack écrit ses exports dans son propre dossier, où
 *   `2026-08-20_backup-00.xcfg` se comprend tout seul. Nous écrivons dans le dossier de
 *   téléchargements, entre des relevés bancaires et des photos, où la même chaîne ne
 *   veut plus rien dire ;
 * - **il met le radical hors d'atteinte des noms réservés de Windows.** `CON`, `PRN`,
 *   `AUX`, `NUL`, `COM1`…`LPT9` sont refusés par le système, extension comprise. Un
 *   radical qui commence par `xctrack_` n'en est jamais un, sans avoir à tenir la liste.
 */
export const EXPORT_NAME_PREFIX = 'xctrack'

/** La marque ajoutée au nom quand les textes libres ont été remplacés. */
export const ANONYMOUS_MARK = 'anon'

/** Le format écrit dans le nom quand `info.exportType` est absent ou illisible. */
export const UNKNOWN_FORMAT = 'config'

/** L'extension de repli, quand l'original n'en porte pas d'exploitable. */
export const DEFAULT_EXTENSION = '.xcfg'

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/**
 * Réduit un mot à `[a-z0-9-]`, accents décomposés puis retirés. Sert au seul champ du nom
 * qui vienne du fichier — le format d'export. C'est peu, et c'est exprès : tout ce qui
 * entre dans un nom de fichier depuis le document est une chaîne que nous n'avons pas
 * écrite, donc une chaîne qui peut porter `/`, `:` ou pire.
 */
function slug(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, '')
}

/**
 * L'extension d'origine, **conservée telle quelle** : `.xcfg` et `.xczfg` ne sont pas deux
 * habillages du même format mais deux formats, l'un JSON nu, l'autre une archive ZIP.
 * Renommer l'un en l'autre produit un fichier que XCTrack refuse d'ouvrir.
 *
 * Elle est validée avant d'être reprise. C'est le seul endroit où un nom venu de
 * l'extérieur entre dans le nom que nous fabriquons : une « extension » qui contiendrait
 * `/` ou `:` sortirait un chemin, pas un fichier.
 */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  // Un point en tête n'est pas une extension mais un fichier caché.
  if (dot <= 0) return DEFAULT_EXTENSION
  const extension = fileName.slice(dot)
  return /^\.[A-Za-z0-9]{1,8}$/.test(extension) ? extension : DEFAULT_EXTENSION
}

/**
 * Horodatage local, **à la seconde** : `2026-08-21-153207`.
 *
 * Local et non UTC : le pilote reconnaît l'heure à laquelle il a cliqué, pas un décalage.
 * À la seconde et non à la minute : la seconde est ce qui coûte deux caractères et rend
 * la collision irréelle. La veille d'une manche, deux fichiers homonymes sur une carte SD
 * sont une erreur d'import qui se découvre en vol.
 */
function stamp(when: Date): string {
  return (
    `${pad(when.getFullYear(), 4)}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-` +
    `${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}`
  )
}

export interface ExportNameOptions {
  /**
   * Le nom du fichier ouvert. Il sert **uniquement** à retrouver l'extension : son radical
   * n'est jamais repris, parce qu'il porte souvent un prénom — `2022-02-08_marie_ok.xcfg`
   * existe dans le corpus. Un outil qui promet d'anonymiser un fichier et en recopie le
   * nom sur le fichier partagé n'a rien anonymisé.
   */
  originalFileName?: string
  when: Date
  /** `info.exportType` du document **tel qu'il sera exporté** — voir `documentExportType`. */
  exportType?: string
  /** Vrai si les textes libres ont été remplacés. */
  anonymized?: boolean
}

/**
 * Le nom du fichier produit par une sauvegarde.
 *
 * ## La forme, et ce qu'elle refuse
 *
 * `xctrack_<AAAA-MM-JJ>-<HHMMSS>_<format>[-anon].<extension>`
 *
 * ```
 * xctrack_2026-08-21-153207_backup.xcfg
 * xctrack_2026-08-21-153207_pages-anon.xcfg
 * xctrack_2026-08-21-153207_backup.xczfg
 * ```
 *
 * Le `_` sépare les champs, le `-` sépare l'intérieur d'un champ : c'est la convention de
 * XCTrack lui-même (`2026-08-20_backupwithmedia-00.xcfg`), donc une forme que le pilote a
 * déjà sous les yeux. La date en tête fait que **l'ordre alphabétique est l'ordre
 * chronologique** — la propriété qui rend une liste de fichiers lisible.
 *
 * Trois informations techniques y sont, et pas une de plus :
 *
 * - **le format** (`backup`, `pages`). C'est la seule chose qui change ce que le
 *   destinataire peut faire du fichier : un `backup` réimporte des préférences, un `pages`
 *   non. Le confondre, c'est écraser ses réglages.
 * - **la mention d'anonymisation.** Le pilote qui a produit les deux versions du même
 *   fichier doit savoir laquelle il joint à un message, sans l'ouvrir.
 * - **la date et l'heure**, qui portent l'unicité.
 *
 * Trois informations en sont écartées, et le silence serait pire que le refus :
 *
 * - **l'appareil.** `info.device` vaut `"AIR3 AIR3-7.2 8.1.0"` : trois champs collés dont
 *   le dernier est la version d'Android, qui change à chaque mise à jour, et dont les deux
 *   premiers font doublon. En extraire le modèle demanderait une règle — et le corpus ne
 *   contient **qu'une seule** valeur de `device`. Une règle ajustée sur un unique exemple
 *   est exactement l'erreur que ce projet a déjà commise sur la liste des textes libres :
 *   exacte sur ce qu'on avait sous la main, fausse sur le format. L'appareil reste lisible
 *   là où il est écrit, dans `info.device`.
 * - **le nombre de pages.** Il change à chaque édition, donc il n'identifie rien ; deux
 *   configurations très différentes portent le même compte.
 * - **le nom d'origine**, pour la raison dite plus haut.
 *
 * ## Valide sur les trois systèmes
 *
 * Le nom produit tient dans `[a-z0-9._-]` : ni `:` ni `/` (Windows et macOS), pas d'espace
 * ni d'accent, rien qui demande à être échappé dans un terminal, et un radical qui ne peut
 * pas tomber sur un nom de périphérique Windows. Le seul champ venu du document est le
 * format, passé par `slug`.
 *
 * ## Unicité
 *
 * Elle vient de l'horodatage à la seconde. Deux sauvegardes dans la même seconde
 * demanderaient deux clics à moins d'une seconde d'intervalle **à travers une boîte de
 * dialogue d'enregistrement** ; le cas n'est pas atteignable à la main, et le navigateur
 * suffixe de lui-même en cas de collision dans le dossier de téléchargements.
 *
 * Le garde-fou final ne sert donc jamais — c'est justement pourquoi il est là : la
 * promesse « le nom diffère toujours de l'original » ne doit dépendre d'aucun
 * raisonnement, y compris celui-ci.
 */
export function buildExportFileName(options: ExportNameOptions): string {
  const extension = fileExtension(options.originalFileName ?? '')
  const format = slug(options.exportType ?? '', 16) || UNKNOWN_FORMAT
  const mark = options.anonymized === true ? `-${ANONYMOUS_MARK}` : ''
  const stem = `${EXPORT_NAME_PREFIX}_${stamp(options.when)}_${format}${mark}`

  const name = `${stem}${extension}`
  return name === options.originalFileName ? `${stem}-1${extension}` : name
}

/**
 * `info.exportType` d'un document analysé, pour alimenter `buildExportFileName`.
 *
 * Rendu `undefined` plutôt que deviné : un document dont on ne sait pas s'il est un
 * `backup` prendra `config` dans son nom, ce qui est honnête. Écrire `backup` par défaut
 * mentirait sur un `pages`, et le destinataire réimporterait le mauvais format.
 */
export function documentExportType(document: JsonNode): string | undefined {
  const info = getMember(document, 'info')
  return info === undefined ? undefined : readString(info, 'exportType')
}

/* --------------------------------------------------------------- remplacement des textes */

/** Un numéro qu'aucun réseau ne peut joindre — voir `FREE_TEXT_RULES`. */
export const NEUTRAL_PHONE_NUMBER = '+00 000 00 00 00'

/** Un domaine que la RFC 2606 garantit non résoluble — voir `FREE_TEXT_RULES`. */
export const NEUTRAL_URL = 'https://example.invalid/'

/** L'action que XCTrack pose lui-même sur un lanceur d'intention neuf. */
export const NEUTRAL_INTENT_ACTION = 'org.xcontest.XCTrack.Event.TEST'

/** L'événement que XCTrack pose lui-même sur un `WEmitTestEvent` neuf. */
export const NEUTRAL_TEST_EVENT = 'Battery50'

interface FreeTextRule {
  /**
   * Le texte posé à la place. `rank` est le rang de cette clé-là dans l'inventaire, à
   * partir de 1 : deux titres différents restent deux titres différents.
   */
  replacement: (rank: number) => string
  /** Ce que l'interface dira au pilote pour justifier ce remplacement. */
  reason: string
}

/**
 * Ce qui remplace quoi, et pourquoi — **clé par clé**.
 *
 * ## Remplacer, jamais effacer
 *
 * Un `titletext` vidé casse la mise en page que le destinataire voulait justement
 * recevoir : le widget perd son titre, donc sa hauteur de dessin change. Un `titletext`
 * remplacé la conserve. Toute valeur posée ici a donc la même *nature* que celle qu'elle
 * remplace — un titre reste un titre, un numéro reste un numéro, une URL reste une URL
 * syntaxiquement valide.
 *
 * Deux clés font exception et reçoivent la chaîne vide, `filter` et `suffix`. Ce n'est pas
 * un effacement déguisé : sur ces deux-là, **la chaîne vide est la valeur neutre du
 * réglage**, celle que XCTrack écrit sur un widget neuf. Un `filter` vide veut dire « pas
 * de filtre » et le journal continue de s'afficher ; un `filter` rempli d'un texte factice
 * ne correspondrait à rien et le widget aurait l'air cassé.
 *
 * ## Le numéro de téléphone n'est pas un titre
 *
 * `phoneNumber` est la donnée la plus sensible du `layout`, et la seule dont le
 * remplacement doit être *prouvablement* inoffensif. On n'y met pas un numéro plausible :
 * un destinataire qui appuie sur le bouton appellerait un inconnu. `+00 000 00 00 00`
 * garde le gabarit visuel d'un numéro international — donc la largeur du bouton — et
 * **ne peut aboutir nulle part** : `00` n'est pas un indicatif de pays au sens de l'E.164,
 * c'est le préfixe international lui-même.
 *
 * Même raisonnement pour `url` : `example.invalid` relève du TLD `.invalid` réservé par la
 * RFC 2606, dont la RFC 6761 garantit qu'il ne résout jamais. On aurait pu reprendre le
 * défaut de XCTrack, `https://www.google.com/` — le fichier aurait alors été
 * indiscernable d'une installation neuve, mais le `WWebView` du destinataire serait parti
 * chercher une page chez un tiers sans que personne l'ait demandé.
 *
 * ## Deux clés reprennent le défaut mesuré de XCTrack
 *
 * `action` et `event` reçoivent la valeur que XCTrack écrit lui-même sur un widget neuf
 * (relevé dans `src/catalog/widgetDefaults.json`, 75 widgets posés sur l'appareil puis
 * réexportés). Ces deux clés commandent un comportement, pas un affichage : n'importe
 * quelle valeur inventée ferait un bouton en panne, alors que l'action de test interne de
 * XCTrack fait un bouton inoffensif. `action` est par ailleurs la clé la plus dangereuse
 * de la liste après le téléphone — c'est un URI Android complet, qui peut donc porter un
 * jeton dans sa requête.
 *
 * Les valeurs sont **recopiées** ici, pas importées du catalogue : deux constantes valent
 * mieux qu'une dépendance de l'anonymisation envers un fichier régénéré à chaque APK.
 */
const FREE_TEXT_RULES: Record<string, FreeTextRule> = {
  titletext: {
    replacement: (rank) => `Titre ${rank}`,
    reason: 'Titre personnalisé du gadget : remplacé par un titre neutre, numéroté, pour '
      + 'que la mise en page et la distinction entre gadgets soient conservées.'
  },
  text: {
    replacement: (rank) => `Texte ${rank}`,
    reason: 'Contenu entier d’un gadget de texte libre : remplacé par un texte court, '
      + 'pour que le cadre reste rempli sans déborder.'
  },
  fullName: {
    replacement: (rank) => `Contact ${rank}`,
    reason: 'Nom d’une personne enregistrée sur un bouton d’appel : remplacé par un '
      + 'libellé neutre.'
  },
  phoneNumber: {
    replacement: () => NEUTRAL_PHONE_NUMBER,
    reason: 'Numéro de téléphone : remplacé par un numéro au même gabarit mais non '
      + 'composable — « 00 » n’est pas un indicatif de pays.'
  },
  url: {
    replacement: () => NEUTRAL_URL,
    reason: 'Adresse web saisie, qui peut porter un jeton ou un identifiant : remplacée '
      + 'par une adresse du domaine réservé « .invalid », qui ne résout jamais.'
  },
  title: {
    replacement: (rank) => `Bouton ${rank}`,
    reason: 'Libellé d’un bouton de lancement : remplacé par un libellé neutre, numéroté.'
  },
  name: {
    replacement: (rank) => `Application ${rank}`,
    reason: 'Nom de l’application visée par un bouton de lancement : remplacé par un '
      + 'libellé neutre, numéroté.'
  },
  action: {
    replacement: () => NEUTRAL_INTENT_ACTION,
    reason: 'Action Android d’un bouton de lancement, qui peut être un URI complet : '
      + 'remplacée par l’action de test interne que XCTrack pose sur un bouton neuf.'
  },
  filter: {
    replacement: () => '',
    reason: 'Filtre de journal saisi : remis à vide, c’est-à-dire « pas de filtre », la '
      + 'valeur neutre du réglage.'
  },
  suffix: {
    replacement: () => '',
    reason: 'Texte placé après la valeur affichée : remis à vide, c’est-à-dire « pas de '
      + 'suffixe », la valeur neutre du réglage.'
  },
  event: {
    replacement: () => NEUTRAL_TEST_EVENT,
    reason: 'Nom d’événement saisi : remplacé par l’événement de test que XCTrack pose '
      + 'sur un gadget neuf.'
  }
}

/**
 * La règle appliquée à une clé de `FREE_TEXT_KEYS` qui n'aurait pas la sienne.
 *
 * Elle ne devrait jamais servir — un test vérifie que chaque clé inventoriée a sa règle
 * propre. Elle existe parce que l'alternative serait de lever une exception au milieu
 * d'une sauvegarde : un pilote qui a demandé un fichier anonymisé doit l'obtenir, même si
 * une version future de XCTrack ajoute une clé plus vite que nous.
 */
const UNKNOWN_KEY_RULE: FreeTextRule = {
  replacement: (rank) => `Texte ${rank}`,
  reason: 'Texte libre sans règle propre : remplacé par un texte neutre, par précaution.'
}

/** Un texte remplacé, son emplacement, sa valeur d'origine, et ce qui a pris sa place. */
export interface FreeTextReplacement extends FreeText {
  /** Le texte posé à la place. Vide quand la valeur neutre du réglage est la chaîne vide. */
  replacement: string
  /** Pourquoi cette clé est remplacée, et par quoi. Destiné à être montré au pilote. */
  reason: string
}

/** Le dernier segment d'un chemin de clé : `'contact/phoneNumber'` → `'phoneNumber'`. */
function lastSegment(keyPath: string): string {
  const cut = keyPath.lastIndexOf('/')
  return cut === -1 ? keyPath : keyPath.slice(cut + 1)
}

/**
 * Réécrit les textes libres **du document reçu**, en place, et rend l'inventaire.
 *
 * Interne : tous les appelants publics travaillent sur une copie. Le rang de chaque clé
 * est compté par clé et non globalement, de sorte que les titres se numérotent entre eux.
 */
function replaceFreeTextsInPlace(document: JsonNode): FreeTextReplacement[] {
  const ranks = new Map<string, number>()
  const replacements: FreeTextReplacement[] = []

  for (const { node, ...location } of findFreeTextNodes(readLayout(document))) {
    const key = lastSegment(location.keyPath)
    const rule = FREE_TEXT_RULES[key] ?? UNKNOWN_KEY_RULE
    const rank = (ranks.get(key) ?? 0) + 1
    ranks.set(key, rank)

    const replacement = rule.replacement(rank)
    // `encode` échappe ce qui doit l'être : on n'écrit jamais dans `raw` un texte brut.
    node.raw = encode(replacement)
    replacements.push({ ...location, replacement, reason: rule.reason })
  }

  return replacements
}

export interface FreeTextAnonymization {
  /** Une copie du document, textes libres remplacés. La source n'est pas touchée. */
  document: JsonNode
  /** Ce qui a été remplacé, dans l'ordre du fichier. Vide quand il n'y avait rien. */
  replacements: FreeTextReplacement[]
}

/**
 * Remplace les textes libres du `layout` **sans toucher au reste du document**.
 *
 * Le second étage de l'anonymisation, isolé pour lui-même. `anonymizeDocument` fait les
 * deux étages ; celui-ci existe parce que les deux gestes n'ont pas la même portée et que
 * l'interface doit pouvoir les présenter séparément : dériver un `pages` retire des
 * réglages, remplacer un texte réécrit une page.
 *
 * Tout ce qui n'est pas un texte libre traverse intact, texte source compris — la copie
 * passe par `cloneNode`, jamais par `JSON.parse`, qui détruirait `3.0`, `1.0E7`, `-0.0`,
 * les entiers au-delà de 2^53 et les clés dupliquées.
 */
export function replaceFreeTexts(source: JsonNode): FreeTextAnonymization {
  const document = cloneNode(source)
  return { document, replacements: replaceFreeTextsInPlace(document) }
}

export interface AnonymousExport extends FreeTextAnonymization {
  /**
   * Les clés de premier niveau écartées par la dérivation, dans l'ordre du fichier —
   * `preferences` et `airspaceSelectedChannels` sur un `backup`, rien sur un `pages`.
   */
  droppedRootKeys: string[]
  /** Le format de la source, pour dire à l'appelant si une dérivation a eu lieu. */
  previousExportType: string | undefined
  /**
   * Ce qui, **dans le document produit**, ressemble à une donnée personnelle sans être
   * déclaré. Un avertissement, jamais une action — voir `findPersonalSuspects`.
   */
  suspects: PersonalSuspect[]
}

/**
 * Le document à partager : un `pages` dont les textes libres ont été remplacés.
 *
 * ## Deux étages, et le premier est déjà écrit
 *
 * 1. **Les préférences partent avec le format.** `derivePagesDocument` ne filtre pas les
 *    clés sensibles une à une, il ne garde que les deux clés qu'un `pages` porte — voir
 *    `scope.ts` pour l'argument complet. C'est bien le bon geste : il tient à travers les
 *    versions de XCTrack, là où une liste noire de préférences serait fausse dès la
 *    prochaine. Le nom du pilote, sa voile, ses capteurs appairés, ses fichiers de
 *    waypoints et ses réglages Livetrack ne sont pas retirés, ils ne sont jamais mis.
 * 2. **Les textes libres du `layout` survivraient à cela**, puisqu'ils voyagent avec la
 *    page. C'est le second étage, celui de ce module.
 *
 * ## Ce que l'anonymisation coûte au destinataire
 *
 * Il faut le dire, parce que c'est le prix du partage et non un défaut :
 *
 * - **tout ce qui est réglage global est perdu** — unités, thème, réglages du vario et de
 *   ses sons, seuils d'espaces aériens, Livetrack, capteurs. Ils vivent dans
 *   `preferences`, et un `pages` n'en porte pas. Le destinataire garde les siens : c'est
 *   d'ailleurs ce qu'il veut, ses unités ne sont pas forcément celles de l'expéditeur ;
 * - **les titres personnalisés sont à réécrire.** Ils sont conservés en nombre et en
 *   emplacement, mais leur texte est neutre ;
 * - **les boutons d'appel, de lancement et les vues web sont désamorcés.** Ils gardent
 *   leur place et leur taille, mais pas leur cible ;
 * - **la longueur des textes change**, donc le rendu d'un widget très étroit peut différer
 *   de quelques pixels. On ne peut pas conserver la longueur sans conserver un peu de
 *   l'information qu'on retire.
 *
 * ## Le document rendu n'est pas la source, et la source n'a pas bougé
 *
 * `derivePagesDocument` recopie déjà en profondeur. On réécrit donc **sur sa copie**,
 * sans en faire une seconde. La source est intacte à l'octet près après l'appel, y compris
 * si l'appelant jette le résultat.
 */
export function anonymizeDocument(source: JsonNode): AnonymousExport {
  const derived = derivePagesDocument(source)
  const replacements = replaceFreeTextsInPlace(derived.document)
  return {
    document: derived.document,
    droppedRootKeys: derived.droppedRootKeys,
    previousExportType: derived.previousExportType,
    replacements,
    // Sur le document **produit**, pas sur la source : ce qu'on avertit, c'est ce qui part.
    suspects: findPersonalSuspects(derived.document)
  }
}

/* ================= la sauvegarde entière, données personnelles remplacées ligne par ligne */

/**
 * Ce qu'il advient d'un réglage personnel des préférences.
 *
 * Quatre traitements, et il en faut quatre — à ne pas confondre avec les trois **issues**
 * de la boîte, qui sont le choix du pilote : « remplacé » et « retiré » ne coûtent pas la
 * même chose au destinataire, « conservé » est une décision qui doit se dire, et un
 * emplacement vide n'est ni l'un ni l'autre — il n'y avait rien à faire.
 */
export type PreferenceTreatment = 'replace' | 'drop' | 'keep' | 'empty'

interface PreferenceRule {
  treatment: 'replace' | 'drop' | 'keep'
  /**
   * Le texte posé à la place, pour `replace`. **Toujours une chaîne** : les seules valeurs
   * qu'on sache remplacer sans inventer sont les chaînes, et le remplacement n'a lieu que
   * si la ligne en porte effectivement une — voir `applyPreferenceRule`.
   */
  replacement?: string
  /** Ce que l'interface dira au pilote pour justifier ce traitement. */
  reason: string
}

/**
 * Ce qu'on écrit à la place d'un identifiant : rien, et la ligne part avec.
 *
 * XCTrack n'exporte jamais ses préférences `SECURE` — `NEVER_EXPORTED_PERSONAL_KEYS` le
 * relève dans l'APK — de sorte que cette règle ne se déclenche sur aucun fichier réel.
 * Elle est écrite quand même : le jour où une version en exporte une, le geste doit être
 * déjà décidé, et il ne doit pas être « poser un faux jeton ».
 */
const CREDENTIAL_REASON =
  'Identifiant ou mot de passe. La ligne entière est retirée : un identifiant n’a pas de '
  + 'valeur neutre, et en fabriquer une ferait échouer la connexion du destinataire au '
  + 'lieu de la laisser simplement vide.'

/**
 * **Ce qu'on fait de chacun des 44 réglages personnels, et pourquoi.**
 *
 * ## Trois gestes, et le choix entre eux n'est pas une question de goût
 *
 * - **remplacer** — la ligne garde sa place et son type, avec une valeur neutre à la
 *   place de la vôtre. Réservé aux **chaînes**, seul cas où l'on sache écrire une valeur
 *   que XCTrack accepte sans en inventer la forme. Quand la valeur d'usine relevée dans
 *   l'APK est elle-même neutre — `''` pour des lunettes non appairées, `DEFAULT` pour le
 *   thème de carte — c'est elle qu'on pose : le fichier devient alors indiscernable d'une
 *   installation qui n'a jamais eu ce réglage.
 * - **retirer la ligne** — pour tout ce qui est une **structure**. `Navigation.State`
 *   porte la tâche en cours avec ses coordonnées, `Sensors.Configuration` les capteurs
 *   appairés avec leurs adresses : on n'en connaît pas le schéma, il change à chaque
 *   version, et écrire une structure de remplacement reviendrait à fabriquer une forme
 *   que XCTrack n'écrit jamais — exactement l'erreur que `scope.ts` refuse. Une ligne
 *   absente, en revanche, est une forme que XCTrack connaît par cœur : c'est l'état d'une
 *   installation neuve, et il relit ses réglages par nom, jamais par position
 *   (`core/access.ts`).
 * - **conserver** — quand la ligne ne désigne personne. Un booléen de diffusion
 *   Livetrack est un **choix**, pas une donnée : il ne porte ni nom, ni numéro, ni
 *   adresse, et c'est souvent lui qui fait l'objet de la question posée. Le taire
 *   appauvrirait le fichier sans rien protéger. C'est une décision, donc elle est dite au
 *   pilote comme les deux autres.
 *
 * ## Ce qui n'est pas remplacé faute de le savoir
 *
 * Une chaîne dont on n'a pas relevé la valeur d'usine n'est pas remise à `''` par
 * commodité : `''` peut être une valeur invalide autant qu'une valeur neutre. Sur les
 * clés où l'APK donne `''` comme valeur d'usine (`Glider._model`, `Sensors.LastNetLocation`,
 * `Testing.IGCReplayFilename`, les deux `ActiveLook.*`), c'est un relevé, pas un choix.
 *
 * ## Cette table se périme, et la parade n'est pas dedans
 *
 * C'est une **liste noire** : un réglage personnel apparu dans une version future n'y sera
 * pas, et partira en clair. La parade tient en deux gestes, tous deux hors de ce fichier :
 * l'inventaire est montré **avant** le téléchargement, et `findPersonalSuspects` signale
 * ce qui ressemble à une donnée personnelle sans être déclaré.
 */
const PREFERENCE_RULES: Record<string, PreferenceRule> = {
  'ActiveLook.Device': {
    treatment: 'replace',
    replacement: '',
    reason: 'Les lunettes ActiveLook appairées à votre appareil. Remises à la valeur '
      + 'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucunes lunettes ».'
  },
  'ActiveLook.Name': {
    treatment: 'replace',
    replacement: '',
    reason: 'Le nom de vos lunettes ActiveLook. Remis à la valeur d’usine relevée dans '
      + 'XCTrack — la chaîne vide, c’est-à-dire « aucunes lunettes ».'
  },
  'Airspace.Files': {
    treatment: 'drop',
    reason: 'Les fichiers d’espaces aériens que vous avez chargés. La ligne entière est '
      + 'retirée : ce sont des fichiers de votre appareil, que le destinataire n’a pas.'
  },
  'App.GuessLatitude': {
    treatment: 'drop',
    reason: 'La position présumée de votre appareil — votre domicile, en pratique. La '
      + 'ligne entière est retirée : aucune coordonnée de remplacement ne serait honnête.'
  },
  'App.GuessLongitude': {
    treatment: 'drop',
    reason: 'La position présumée de votre appareil — votre domicile, en pratique. La '
      + 'ligne entière est retirée : aucune coordonnée de remplacement ne serait honnête.'
  },
  'Devel.TTS': {
    treatment: 'replace',
    replacement: 'Texte',
    reason: 'Un texte que vous avez saisi pour la synthèse vocale. Remplacé par un texte '
      + 'court et neutre, pour que le réglage reste renseigné.'
  },
  'Devel.TTSAbbr': {
    treatment: 'replace',
    replacement: 'Texte',
    reason: 'Un texte que vous avez saisi pour la synthèse vocale. Remplacé par un texte '
      + 'court et neutre, pour que le réglage reste renseigné.'
  },
  'Glider.Ctg': {
    treatment: 'keep',
    reason: 'La catégorie de votre voile. Conservée : c’est un réglage de vol, elle ne '
      + 'porte ni nom, ni numéro, ni adresse, et c’est souvent elle qu’on veut partager.'
  },
  'Glider.CtgHG': {
    treatment: 'keep',
    reason: 'La catégorie de votre aile delta. Conservée : c’est un réglage de vol, elle '
      + 'ne porte ni nom, ni numéro, ni adresse, et c’est souvent elle qu’on veut partager.'
  },
  'Glider.Name': {
    treatment: 'replace',
    replacement: 'Voile',
    reason: 'Le nom de votre voile — modèle et taille suffisent à vous reconnaître dans un '
      + 'club. Remplacé par un mot neutre, pour que le réglage reste renseigné.'
  },
  'Glider._model': {
    treatment: 'replace',
    replacement: '',
    reason: 'Le modèle de votre voile. Remis à la valeur d’usine relevée dans XCTrack — la '
      + 'chaîne vide, c’est-à-dire « aucun modèle choisi ».'
  },
  'Glider._producer': {
    treatment: 'replace',
    replacement: '',
    reason: 'Le constructeur de votre voile. Remis à la valeur d’usine relevée dans '
      + 'XCTrack — la chaîne vide, c’est-à-dire « aucun constructeur choisi ».'
  },
  'Internal.ProcessedBootstraps': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Livetrack.ClaimContest': {
    treatment: 'keep',
    reason: 'Un choix de diffusion Livetrack que vous avez fait. Conservé : c’est un '
      + 'réglage, pas une donnée — il ne porte ni nom, ni identifiant de compte.'
  },
  'Livetrack.DeviceId': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Livetrack.Enabled': {
    treatment: 'keep',
    reason: 'Un choix de diffusion Livetrack que vous avez fait. Conservé : c’est un '
      + 'réglage, pas une donnée — il ne porte ni nom, ni identifiant de compte.'
  },
  'Livetrack.FlightPublic': {
    treatment: 'keep',
    reason: 'Un choix de diffusion Livetrack que vous avez fait. Conservé : c’est un '
      + 'réglage, pas une donnée — il ne porte ni nom, ni identifiant de compte.'
  },
  'Livetrack.QuickMessages': {
    treatment: 'drop',
    reason: 'Les messages rapides que vous avez écrits pour le Livetracking. La ligne '
      + 'entière est retirée : c’est une liste de vos phrases, et le destinataire écrira '
      + 'les siennes.'
  },
  'Livetrack.ShowPublic': {
    treatment: 'keep',
    reason: 'Un choix de diffusion Livetrack que vous avez fait. Conservé : c’est un '
      + 'réglage, pas une donnée — il ne porte ni nom, ni identifiant de compte.'
  },
  'Mapsforge.MapFiles': {
    treatment: 'drop',
    reason: 'Les cartes hors-ligne installées sur votre appareil. La ligne entière est '
      + 'retirée : ce sont des fichiers de votre appareil, que le destinataire n’a pas.'
  },
  'Mapsforge.ThemeFile': {
    treatment: 'replace',
    replacement: 'DEFAULT',
    reason: 'Le thème de carte que vous avez installé, désigné par son chemin. Remis à la '
      + 'valeur d’usine relevée dans XCTrack, « DEFAULT » : la carte du destinataire '
      + 's’affiche, au lieu de chercher un fichier qu’il n’a pas.'
  },
  'Maverick.SdkKey': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Navigation.State': {
    treatment: 'drop',
    reason: 'Votre tâche en cours, points de virage et coordonnées compris. La ligne '
      + 'entière est retirée : son schéma change à chaque version de XCTrack, et une '
      + 'structure de remplacement serait une forme que l’application n’écrit jamais.'
  },
  'Navigation.WaypointFiles': {
    treatment: 'drop',
    reason: 'Vos fichiers de waypoints — leur nom désigne souvent la compétition à '
      + 'laquelle vous participez. La ligne entière est retirée : ce sont des fichiers de '
      + 'votre appareil, que le destinataire n’a pas.'
  },
  'Pilot.Name': {
    treatment: 'replace',
    replacement: 'Pilote',
    reason: 'Votre nom, saisi tel quel. Remplacé par un mot neutre plutôt que vidé : '
      + 'XCTrack l’affiche et l’envoie avec le Livetracking, et un nom vide n’est pas une '
      + 'situation qu’on lui connaît.'
  },
  'SafeSky.Address': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'SafeSky.Amt': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'SafeSky.AnonymousUUID': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'SafeSky.AutoIcao': {
    treatment: 'drop',
    reason: 'L’immatriculation déduite de votre aéronef. La ligne entière est retirée : '
      + 'une immatriculation désigne un appareil et son propriétaire, et en inventer une '
      + 'reviendrait à en désigner un autre.'
  },
  'SafeSky.Icao': {
    treatment: 'drop',
    reason: 'L’immatriculation de votre aéronef. La ligne entière est retirée : une '
      + 'immatriculation désigne un appareil et son propriétaire, et en inventer une '
      + 'reviendrait à en désigner un autre.'
  },
  'SafeSky.Salt': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sec.GpsTimeOffset': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sec.ProToTimestamp': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sec.ProUid': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sec.Xcontest.Uid': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sec.test': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Sensors.Configuration': {
    treatment: 'drop',
    reason: 'Vos capteurs appairés, adresses Bluetooth comprises. La ligne entière est '
      + 'retirée : le destinataire appaire les siens, qui sont de toute façon les seuls '
      + 'qu’il puisse utiliser.'
  },
  'Sensors.LastNetLocation': {
    treatment: 'replace',
    replacement: '',
    reason: 'La dernière position ayant servi à interroger le QNH. Remise à la valeur '
      + 'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucune position ».'
  },
  'SkySight.Password': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'SkySight.Username': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'Testing.IGCReplayFilename': {
    treatment: 'replace',
    replacement: '',
    reason: 'Un de vos fichiers de trace. Remis à la valeur d’usine relevée dans '
      + 'XCTrack — la chaîne vide, c’est-à-dire « aucune trace à rejouer ».'
  },
  'XContest.AuthToken': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'XContest.Password': { treatment: 'drop', reason: CREDENTIAL_REASON },
  'XContest.Username': { treatment: 'drop', reason: CREDENTIAL_REASON }
}

/**
 * La règle appliquée à un réglage personnel déclaré qui n'aurait pas la sienne.
 *
 * Elle ne devrait jamais servir — un test vérifie que les clés de `PREFERENCE_RULES` sont
 * exactement celles de `personalKeys.json`. Elle retire la ligne, parce que c'est le seul
 * geste sûr faute de savoir ce que la clé porte : laisser en clair une donnée annoncée
 * remplacée serait la seule issue franchement mauvaise.
 */
const UNKNOWN_PREFERENCE_RULE: PreferenceRule = {
  treatment: 'drop',
  reason: 'Réglage personnel sans règle propre : la ligne entière est retirée, par '
    + 'précaution.'
}

/**
 * Ce qu'on écrit quand une ligne ne porte pas ce que sa règle attendait — un objet là où
 * l'on comptait poser une chaîne, par exemple, parce qu'une version de XCTrack a changé la
 * forme du réglage. On retire alors la ligne au lieu d'écraser une structure par un mot.
 */
const SHAPE_MISMATCH_REASON =
  'Ce réglage ne porte pas le texte que sa règle attendait — sa forme a changé depuis le '
  + 'relevé. La ligne entière est retirée : écrire un mot à la place d’une structure '
  + 'produirait un fichier que XCTrack refuserait.'

/** Ce qu'il est advenu d'un réglage personnel des préférences, prêt à être montré. */
export interface PreferenceOutcome {
  /** La clé, telle qu'elle est écrite dans le fichier — `Pilot.Name`. */
  key: string
  treatment: PreferenceTreatment
  /** La nature du réglage, dans le vocabulaire de `personalData.ts`. */
  kind: PersonalKind
  /**
   * Ce que la ligne portait, en toutes lettres. Passe par `personalValueText`, donc **le
   * contenu d'une structure n'est jamais montré** — on en dit la taille.
   */
  before: string
  /** Le texte posé à la place. Présent pour `replace` seulement, vide compris. */
  after?: string
  reason: string
}

/** Les quatre chiffres d'un traitement des préférences, **nommés**, jamais additionnés. */
export interface PreferenceTally {
  replaced: number
  dropped: number
  kept: number
  empty: number
}

export function tallyPreferences(outcomes: readonly PreferenceOutcome[]): PreferenceTally {
  const tally: PreferenceTally = { replaced: 0, dropped: 0, kept: 0, empty: 0 }
  for (const outcome of outcomes) {
    if (outcome.treatment === 'replace') tally.replaced += 1
    else if (outcome.treatment === 'drop') tally.dropped += 1
    else if (outcome.treatment === 'keep') tally.kept += 1
    else tally.empty += 1
  }
  return tally
}

/** Combien de lignes le traitement change effectivement — remplacées et retirées. */
export function changedPreferenceCount(outcomes: readonly PreferenceOutcome[]): number {
  const tally = tallyPreferences(outcomes)
  return tally.replaced + tally.dropped
}

/**
 * Applique la règle d'une ligne et rend ce qu'il faut en dire. `undefined` en position de
 * nœud veut dire « la ligne part ».
 */
function applyPreferenceRule(
  key: string, value: JsonNode, finding: PersonalFinding
): { kept?: JsonNode; outcome: PreferenceOutcome } {
  const before = personalValueText(finding)
  const base = { key, kind: finding.kind, before }

  // Un emplacement présent mais vide n'est pas une donnée : il n'y a rien à remplacer, et
  // retirer la ligne changerait le fichier sans rien protéger. Même distinction que
  // `PersonalFinding.filled`, et c'est la sienne qui est lue — pas une seconde règle.
  if (!finding.filled) {
    return {
      kept: value,
      outcome: {
        ...base,
        treatment: 'empty',
        reason: 'L’emplacement est présent dans le fichier, mais il ne porte rien : il n’y '
          + 'a rien à remplacer, et la ligne reste telle quelle.'
      }
    }
  }

  const rule = PREFERENCE_RULES[key] ?? UNKNOWN_PREFERENCE_RULE

  if (rule.treatment === 'keep') {
    return { kept: value, outcome: { ...base, treatment: 'keep', reason: rule.reason } }
  }

  if (rule.treatment === 'replace' && rule.replacement !== undefined) {
    if (value.kind !== 'string') {
      return { outcome: { ...base, treatment: 'drop', reason: SHAPE_MISMATCH_REASON } }
    }
    return {
      // `encode` échappe ce qui doit l'être : on n'écrit jamais un texte brut dans `raw`.
      kept: { kind: 'string', raw: encode(rule.replacement) },
      outcome: { ...base, treatment: 'replace', after: rule.replacement, reason: rule.reason }
    }
  }

  return { outcome: { ...base, treatment: 'drop', reason: rule.reason } }
}

/**
 * Traite les réglages personnels **du document reçu**, en place, et rend l'inventaire.
 *
 * ## Toutes les occurrences, y compris les doublons
 *
 * On parcourt `preferences.entries` plutôt que d'écrire par `setString` : celui-ci ne
 * touche que la dernière occurrence d'une clé dupliquée, et laisser la première en place
 * laisserait la donnée personnelle dans le fichier sans erreur ni signal. Même
 * raisonnement que `findFreeTextNodes` et que `removeMember`.
 *
 * ## L'inventaire vient du même endroit que partout ailleurs
 *
 * Ce qui est personnel est décidé par `personalData.ts`, pas ici : `collectPersonalData`
 * dresse la liste, cette fonction décide seulement **quoi en faire**. Les deux modules ne
 * peuvent donc pas compter des choses différentes, et un réglage vide reste vide pour les
 * deux.
 */
function treatPreferencesInPlace(document: JsonNode): PreferenceOutcome[] {
  const preferences = getMember(document, 'preferences')
  if (preferences?.kind !== 'object') return []

  // Une file par clé : le rapprochement tient même si une clé est écrite deux fois, et il
  // ne dépend d'aucune hypothèse sur l'ordre dans lequel l'inventaire a été dressé.
  const pending = new Map<string, PersonalFinding[]>()
  for (const finding of findingsIn(collectPersonalData(document), 'preferences')) {
    const queue = pending.get(finding.key)
    if (queue === undefined) pending.set(finding.key, [finding])
    else queue.push(finding)
  }

  const kept: Array<[string, JsonNode]> = []
  const outcomes: PreferenceOutcome[] = []
  for (const entry of preferences.entries) {
    const key = decode(entry[0])
    const finding = pending.get(key)?.shift()
    if (finding === undefined) {
      // Ce réglage n'est pas déclaré personnel : il traverse intact, texte source compris.
      kept.push(entry)
      continue
    }
    const applied = applyPreferenceRule(key, entry[1], finding)
    if (applied.kept !== undefined) kept.push([entry[0], applied.kept])
    outcomes.push(applied.outcome)
  }

  preferences.entries = kept
  return outcomes
}

/**
 * Vrai si le document porte une section `preferences` — donc s'il y a quelque chose à
 * traiter que `derivePagesDocument` ne retirerait pas en bloc.
 *
 * C'est ce qui décide si la troisième issue **a un sens**. Sur un export `pages`,
 * `anonymizeBackup` et `anonymizeDocument` rendent le même fichier, sous le même nom : le
 * pilote se verrait proposer deux fois le même choix, ce qui est pire qu'un choix de moins.
 */
export function carriesPreferences(document: JsonNode): boolean {
  return getMember(document, 'preferences') !== undefined
}

export interface BackupAnonymization extends FreeTextAnonymization {
  /** Ce qu'il est advenu de chaque réglage personnel, dans l'ordre du fichier. */
  preferences: PreferenceOutcome[]
  /** Ce qui ressemble à une donnée personnelle sans être déclaré — voir `findPersonalSuspects`. */
  suspects: PersonalSuspect[]
}

/**
 * La sauvegarde **entière**, dont les données personnelles sont remplacées plutôt que le
 * bloc retiré.
 *
 * ## Le cas qui n'avait pas de réponse
 *
 * Un pilote veut demander de l'aide sur ses réglages de vario sans publier son nom. Un
 * export `pages` ne porte aucun réglage : il ne peut pas poser la question. Un export
 * complet porte son nom, sa voile, ses capteurs et sa tâche en cours. Cette fonction est
 * la troisième issue : le fichier reste un `backup`, `exportType` compris, et ce qui le
 * désigne est remplacé ou retiré, ligne par ligne, avec l'inventaire de ce qui a été fait.
 *
 * ## Ce que le destinataire perd quand même
 *
 * Les structures ne peuvent pas être remplacées, elles sont retirées : capteurs appairés,
 * tâche en cours, fichiers de waypoints, cartes hors-ligne, messages rapides. Ce sont des
 * ressources de **votre** appareil, que le destinataire n'a pas ; le fichier ne perd donc
 * rien qu'il aurait pu utiliser. Tout ce qui est réglage — vario et ses sons, unités,
 * thème, seuils d'espaces aériens, touches — traverse intact : c'est l'objet de l'issue.
 *
 * ## La source n'est pas touchée
 *
 * `cloneNode` d'abord, jamais `JSON.parse` : `3.0`, `1.0E7`, `-0.0`, les entiers au-delà
 * de 2^53 et les clés dupliquées survivent. Un pilote qui demande un aperçu puis y renonce
 * retrouve son fichier intact, à l'octet près.
 */
export function anonymizeBackup(source: JsonNode): BackupAnonymization {
  const document = cloneNode(source)
  const preferences = treatPreferencesInPlace(document)
  const replacements = replaceFreeTextsInPlace(document)
  return {
    document,
    replacements,
    preferences,
    // Sur le document **produit**, pas sur la source : ce qu'on avertit, c'est ce qui part.
    suspects: findPersonalSuspects(document)
  }
}

/* ============ ce qui ressemble à une donnée personnelle sans être déclaré : on avertit */

/**
 * La longueur au-delà de laquelle une valeur suspecte est montrée tronquée.
 *
 * On la montre pour qu'elle soit **reconnue** par celui qui l'a écrite, pas pour être lue
 * en entier : `Navigation.State` fait 1 332 caractères dans le fichier de référence, et un
 * inventaire qui déroulerait des pavés pareils ne serait plus lu du tout.
 */
export const SUSPECT_VALUE_LIMIT = 120

/** Un texte qui n'est pas déclaré personnel et qui en a pourtant l'air. */
export interface PersonalSuspect {
  /** Où il vit — donc s'il part avec un export « pages ». */
  home: PersonalHome
  /** Le chemin de la ligne : `Devel.Truc`, ou `landscape[0]/widgets[2]/monChamp`. */
  path: string
  /** Ce qui a mis la puce à l'oreille, dit au pilote. */
  clue: string
  /** La valeur telle qu'elle est écrite, tronquée à `SUSPECT_VALUE_LIMIT`. */
  value: string
}

const CLUE_URL = 'Ce texte a la forme d’une adresse web, qui peut porter un jeton ou un identifiant.'
const CLUE_MAIL = 'Ce texte a la forme d’une adresse électronique.'
const CLUE_PATH = 'Ce texte a la forme d’un chemin de fichier sur votre appareil.'
const CLUE_HARDWARE = 'Ce texte a la forme d’une adresse d’appareil Bluetooth ou réseau.'
const CLUE_PHONE = 'Ce texte a la forme d’un numéro de téléphone.'
const CLUE_LETTERS =
  'Ce texte porte des lettres accentuées ou des signes hors de l’alphabet latin simple : '
  + 'il a été écrit, pas choisi dans une liste.'
const CLUE_SENTENCE =
  'Ce texte porte une espace : il se lit comme une phrase, pas comme une valeur à choisir '
  + 'dans une liste.'

/**
 * Les formes qui trahissent une donnée personnelle, dans l'ordre où on les essaie — de la
 * plus précise à la plus large, pour que le motif annoncé soit le plus parlant des deux.
 */
const SUSPECT_SHAPES: ReadonlyArray<{ shape: RegExp; clue: string }> = [
  { shape: /^[A-Za-z][A-Za-z0-9+.-]*:\/\//, clue: CLUE_URL },
  { shape: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/, clue: CLUE_MAIL },
  { shape: /^(\/|[A-Za-z]:\\)/, clue: CLUE_PATH },
  { shape: /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, clue: CLUE_HARDWARE },
  { shape: /^\+?\d[\d\s.()-]{6,}$/, clue: CLUE_PHONE },
  // Les deux plus larges en dernier : hors de l'ASCII imprimable, ou porteur d'une espace.
  { shape: /[^ -~]/, clue: CLUE_LETTERS },
  { shape: /\s/, clue: CLUE_SENTENCE }
]

/**
 * Ce qui rend un texte suspect, ou `undefined` s'il ressemble à un réglage.
 *
 * ## Mesuré : sept fichiers, zéro fausse alerte
 *
 * Le seuil n'a pas été choisi au jugé. Balayage des cinq exports du corpus et des deux
 * fichiers de formes, réglages déclarés personnels mis à part : **aucune valeur ne
 * déclenche la règle**. Ce que XCTrack écrit hors des champs de saisie du pilote est fait
 * de jetons — `LANDSCAPE`, `WhiteHCTheme`, `LANDING_AUTOMATIC`, `m,km`, `km/h`, `METAR`,
 * `001BATTERY20:DISPLAY_NORMAL_BACKLIGHT|…` : jamais d'accent, jamais d'espace. Un texte
 * qui en porte a donc été **écrit**, et c'est exactement la question posée.
 *
 * ## Ce que la règle ne prétend pas
 *
 * Elle ne trouve pas les données personnelles écrites en jetons — un identifiant de
 * compte, une plaque d'immatriculation, un code postal passent au travers. Elle ne dit pas
 * non plus qu'une valeur signalée *est* personnelle : `Display.Theme` d'une version future
 * pourrait s'appeler « Mon thème ». C'est pourquoi elle **avertit** au lieu de remplacer :
 * remplacer en silence ce dont on n'est pas sûr abîmerait des réglages, et le pilote est
 * le seul à savoir s'il a écrit ce texte.
 */
function personalClue(value: string): string | undefined {
  if (value.trim() === '') return undefined
  for (const { shape, clue } of SUSPECT_SHAPES) {
    if (shape.test(value)) return clue
  }
  return undefined
}

function truncate(value: string): string {
  return value.length <= SUSPECT_VALUE_LIMIT ? value : `${value.slice(0, SUSPECT_VALUE_LIMIT)}…`
}

function considerString(
  raw: string, path: string, home: PersonalHome, found: PersonalSuspect[]
): void {
  const value = decode(raw)
  const clue = personalClue(value)
  if (clue !== undefined) found.push({ home, path, clue, value: truncate(value) })
}

/**
 * Parcourt un sous-arbre en signalant les chaînes suspectes. `skip` écarte les clés déjà
 * traitées ailleurs — inutile d'avertir sur un texte qu'on remplace justement.
 */
function scanForSuspects(
  node: JsonNode, path: string, home: PersonalHome,
  skip: (key: string) => boolean, found: PersonalSuspect[]
): void {
  if (node.kind === 'object') {
    for (const [rawKey, value] of node.entries) {
      const key = decode(rawKey)
      const here = path === '' ? key : `${path}/${key}`
      if (value.kind === 'string') {
        if (!skip(key)) considerString(value.raw, here, home, found)
      } else {
        scanForSuspects(value, here, home, skip, found)
      }
    }
    return
  }
  if (node.kind !== 'array') return
  node.items.forEach((item, index) => {
    const here = `${path}[${index}]`
    if (item.kind === 'string') considerString(item.raw, here, home, found)
    else scanForSuspects(item, here, home, skip, found)
  })
}

/**
 * Ce qui, dans un document, ressemble à une donnée personnelle **sans être déclaré**.
 *
 * ## Pourquoi cette fonction existe
 *
 * Les 44 réglages de `personalKeys.json` et les onze champs de `FREE_TEXT_KEYS` sont des
 * listes noires, et le schéma de XCTrack change à chaque version : un 45ᵉ réglage
 * personnel partirait en clair, sans erreur ni signal. C'est le mode de défaillance le
 * plus coûteux possible pour de la confidentialité, et `scope.ts` le dit déjà —
 * « la parade n'est pas dans ce fichier ». La voici.
 *
 * ## Elle avertit, elle ne remplace jamais
 *
 * Même éthique que `warnings.ts` : on signale, on ne corrige pas. Remplacer sur un
 * soupçon abîmerait des réglages légitimes — et un pilote qui ne peut pas prévoir ce que
 * l'outil fait de son fichier ne s'en sert pas. Le pilote, lui, reconnaît immédiatement un
 * texte qu'il a écrit.
 *
 * ## Trois exclusions, et chacune a sa raison
 *
 * - **`info`** n'est pas parcouru. Ses quatre clés sont connues et délibérément
 *   conservées (`scope.ts`), et `device` vaut `"AIR3 AIR3-7.2 8.1.0"` — trois champs
 *   collés par des espaces, donc une fausse alerte à chaque fichier.
 * - **Les réglages déclarés personnels** ne sont pas parcourus **du tout**, contenu
 *   compris : ils ont déjà leur règle, et déballer une structure comme `Navigation.State`
 *   pour en montrer les chaînes est précisément ce que `personalData.ts` interdit.
 * - **Les onze champs de `FREE_TEXT_KEYS`** sont ignorés dans la disposition : ils sont
 *   remplacés par les deux issues anonymisantes, les signaler ferait doublon.
 */
export function findPersonalSuspects(document: JsonNode): PersonalSuspect[] {
  if (document.kind !== 'object') return []
  const found: PersonalSuspect[] = []

  const layout = getMember(document, 'layout')
  if (layout !== undefined) {
    scanForSuspects(layout, '', 'layout', (key) => FREE_TEXT_KEYS.includes(key), found)
  }

  const preferences = getMember(document, 'preferences')
  if (preferences?.kind === 'object') {
    for (const [rawKey, value] of preferences.entries) {
      const key = decode(rawKey)
      if (PREFERENCE_RULES[key] !== undefined) continue
      if (value.kind === 'string') considerString(value.raw, key, 'preferences', found)
      else scanForSuspects(value, key, 'preferences', () => false, found)
    }
  }

  return found
}

/** Les clés que `PREFERENCE_RULES` couvre — pour que les tests le vérifient sans exporter la table. */
export const RULED_PREFERENCE_KEYS: readonly string[] = Object.keys(PREFERENCE_RULES)
