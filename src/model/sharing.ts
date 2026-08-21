import type { JsonNode } from '../core/jsonDocument'
import { encode, getMember, readString } from '../core/access'
import { readLayout } from './layout'
import { cloneNode } from './mutations'
import { derivePagesDocument, findFreeTextNodes, type FreeText } from './scope'

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
    reason: 'Titre personnalisé du widget : remplacé par un titre neutre, numéroté, pour '
      + 'que la mise en page et la distinction entre widgets soient conservées.'
  },
  text: {
    replacement: (rank) => `Texte ${rank}`,
    reason: 'Contenu entier d’un widget de texte libre : remplacé par un texte court, '
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
      + 'sur un widget neuf.'
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
  return {
    document: derived.document,
    droppedRootKeys: derived.droppedRootKeys,
    previousExportType: derived.previousExportType,
    replacements: replaceFreeTextsInPlace(derived.document)
  }
}
