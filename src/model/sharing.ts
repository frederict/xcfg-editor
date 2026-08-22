import type { JsonNode } from '../core/jsonDocument'
import { decode, encode, getMember, readString } from '../core/access'
import { readLayout } from './layout'
import { cloneNode } from './mutations'
import {
  derivePagesDocument,
  findFreeTextNodes,
  keepPages,
  FREE_TEXT_KEYS,
  type FreeText,
  type PageRef,
  type PageSelection
} from './scope'
import {
  collectPersonalData,
  findingsIn,
  type PersonalFinding,
  type PersonalHome,
  type PersonalKind,
  type PersonalValue
} from './personalData'
// `import type` : effacé à la compilation. Ce module **ne dépend pas** de `src/i18n/` à
// l'exécution — il rend des clés de message, et `sharingProse(tr)` les traduit pour qui
// tient un traducteur. Voir « La prose de ce module », plus bas.
import type { MessageKey, Translator } from '../i18n'

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
 * ## Ce module n'affiche rien, et ne connaît aucune langue
 *
 * Il rend des fonctions et des données. Ce qui est destiné au pilote — la raison de
 * chaque remplacement, l'indice de chaque soupçon — est porté par une **clé de message**
 * (`reasonKey`, `clueKey`), jamais par une phrase : c'est l'interface qui décide où et
 * comment l'afficher, et `sharingProse(tr)` qui la dit dans la langue du pilote.
 *
 * Le traducteur est **passé**, jamais importé : de `src/i18n/` ce fichier ne prend que des
 * types, effacés à la compilation. Même motif que `personalProse(tr)` dans
 * `personalData.ts` — voir `src/i18n/CLAUDE.md` § 5.
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

/**
 * Les clés de raison de ce module, et elles seules. `MessageKey` tout entier serait trop
 * large : `t()` exigerait alors les repères de la plus exigeante des phrases du catalogue.
 * Restreindre au préfixe rend le type juste — aucune de ces raisons n'attend de repère.
 * Même motif que `LayoutReasonKey` dans `personalData.ts`.
 */
export type SharingReasonKey = Extract<MessageKey, `sharingReason.${string}`>

/** Les sept indices de `SUSPECT_SHAPES`, même raisonnement. */
export type SuspectClueKey = Extract<MessageKey, `suspectClue.${string}`>

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
  /**
   * Ce que l'interface dira au pilote pour justifier ce remplacement — une **clé de
   * message**, pas une phrase : cette liste est celle que le manuel demande de relire
   * avant de télécharger, et elle se lit dans la langue du pilote.
   */
  reasonKey: SharingReasonKey
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
 *
 * ## Les cinq mots posés à la place sont neutres, pas français
 *
 * `Title 1`, `Text 1`, `Contact 1`, `Button 1`, `App 1`. Ils étaient français jusqu'au
 * 22 août 2026 — `Titre 1`, `Bouton 1` — et c'était un défaut, pour une raison qui n'est
 * pas de goût : **ces mots s'écrivent dans le fichier produit**, et ce fichier est fait
 * pour partir. La version partageable existe pour être jointe à une issue, envoyée à un
 * autre pilote, ouverte sur un instrument dont on ne sait rien. Un néerlandophone qui
 * relisait la colonne « après » de l'inventaire y lisait du français, et le destinataire
 * de son fichier aussi.
 *
 * Deux issues étaient possibles : suivre la langue de l'interface, ou n'en suivre aucune.
 * La seconde, parce que ces cinq mots rejoignent alors les quatre valeurs neutres
 * ci-dessus — `+00 000 00 00 00`, `example.invalid`, l'action de test, `Battery50` —, qui
 * ne se traduisent pas non plus. **Une seule convention pour les neuf clés**, et une
 * propriété qui se prouve : ce que l'anonymisation écrit ne dépend pas de qui a cliqué.
 * Suivre la langue de l'interface aurait fait dépendre les octets d'un fichier d'un
 * réglage d'affichage, ce que rien d'autre dans ce dépôt ne fait.
 *
 * Les *raisons*, elles, restent traduites : elles s'affichent, elles ne s'écrivent pas.
 */
const FREE_TEXT_RULES: Record<string, FreeTextRule> = {
  titletext: {
    replacement: (rank) => `Title ${rank}`,
    reasonKey: 'sharingReason.titletext'
  },
  text: {
    replacement: (rank) => `Text ${rank}`,
    reasonKey: 'sharingReason.text'
  },
  fullName: {
    replacement: (rank) => `Contact ${rank}`,
    reasonKey: 'sharingReason.fullName'
  },
  phoneNumber: {
    replacement: () => NEUTRAL_PHONE_NUMBER,
    reasonKey: 'sharingReason.phoneNumber'
  },
  url: {
    replacement: () => NEUTRAL_URL,
    reasonKey: 'sharingReason.url'
  },
  title: {
    replacement: (rank) => `Button ${rank}`,
    reasonKey: 'sharingReason.title'
  },
  name: {
    replacement: (rank) => `App ${rank}`,
    reasonKey: 'sharingReason.name'
  },
  action: {
    replacement: () => NEUTRAL_INTENT_ACTION,
    reasonKey: 'sharingReason.action'
  },
  filter: {
    replacement: () => '',
    reasonKey: 'sharingReason.filter'
  },
  suffix: {
    replacement: () => '',
    reasonKey: 'sharingReason.suffix'
  },
  event: {
    replacement: () => NEUTRAL_TEST_EVENT,
    reasonKey: 'sharingReason.event'
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
  replacement: (rank) => `Text ${rank}`,
  reasonKey: 'sharingReason.unknownFreeText'
}

/** Un texte remplacé, son emplacement, sa valeur d'origine, et ce qui a pris sa place. */
export interface FreeTextReplacement extends FreeText {
  /** Le texte posé à la place. Vide quand la valeur neutre du réglage est la chaîne vide. */
  replacement: string
  /**
   * Pourquoi cette clé est remplacée, et par quoi. Destiné à être montré au pilote —
   * `sharingProse(tr).reason()` en rend la phrase.
   */
  reasonKey: SharingReasonKey
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
    replacements.push({ ...location, replacement, reasonKey: rule.reasonKey })
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
  /**
   * Les pages restées à quai, dans l'ordre du fichier. Vide quand toutes partent — donc
   * vide sur le chemin ordinaire, où `anonymizeDocument` est appelé sans sélection.
   */
  droppedPages: PageRef[]
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
 *
 * ## `selection` : n'emporter que certaines pages
 *
 * Absente, toutes les pages partent — et le fichier produit est **exactement** celui
 * d'avant l'existence de ce paramètre, octet pour octet. Présente, seules les pages
 * désignées partent, et `droppedPages` dit lesquelles sont restées.
 *
 * **Le filtre s'applique au même endroit que tout le reste.** Il n'y a pas un second
 * chemin d'export pour les pages seules : c'est ce qui garantit qu'une page seule subit le
 * **même** expurgement — les préférences ne sont jamais mises, les onze clés de texte
 * libre sont remplacées, et `findPersonalSuspects` avertit sur le document produit. Une
 * seconde porte serait la porte par laquelle la garantie finirait par sortir.
 */
export function anonymizeDocument(
  source: JsonNode, selection?: PageSelection
): AnonymousExport {
  const derived = derivePagesDocument(source)
  // Les pages d'abord, les textes ensuite : une page qui ne part pas n'a pas à figurer
  // dans l'inventaire des remplacements, et la numérotation du fichier produit lui
  // appartient. Voir `keepPages`.
  const droppedPages = selection === undefined ? [] : keepPages(derived.document, selection)
  const replacements = replaceFreeTextsInPlace(derived.document)
  return {
    document: derived.document,
    droppedRootKeys: derived.droppedRootKeys,
    previousExportType: derived.previousExportType,
    replacements,
    // Sur le document **produit**, pas sur la source : ce qu'on avertit, c'est ce qui part.
    suspects: findPersonalSuspects(derived.document),
    droppedPages
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
  /** Ce que l'interface dira au pilote pour justifier ce traitement — une clé de message. */
  reasonKey: SharingReasonKey
}

/**
 * Ce qu'on écrit à la place d'un identifiant : rien, et la ligne part avec.
 *
 * XCTrack n'exporte jamais ses préférences `SECURE` — `NEVER_EXPORTED_PERSONAL_KEYS` le
 * relève dans l'APK — de sorte que cette règle ne se déclenche sur aucun fichier réel.
 * Elle est écrite quand même : le jour où une version en exporte une, le geste doit être
 * déjà décidé, et il ne doit pas être « poser un faux jeton ».
 */
const CREDENTIAL_REASON: SharingReasonKey = 'sharingReason.credential'

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
    reasonKey: 'sharingReason.activeLookDevice'
  },
  'ActiveLook.Name': {
    treatment: 'replace',
    replacement: '',
    reasonKey: 'sharingReason.activeLookName'
  },
  'Airspace.Files': { treatment: 'drop', reasonKey: 'sharingReason.airspaceFiles' },
  // Les deux coordonnées du domicile présumé partagent leur raison : la boîte de partage
  // la dit **une fois** pour le groupe, et cela ne tient qu'à l'unicité de la clé.
  'App.GuessLatitude': { treatment: 'drop', reasonKey: 'sharingReason.guessedPosition' },
  'App.GuessLongitude': { treatment: 'drop', reasonKey: 'sharingReason.guessedPosition' },
  'Devel.TTS': {
    treatment: 'replace',
    replacement: 'Texte',
    reasonKey: 'sharingReason.speechText'
  },
  'Devel.TTSAbbr': {
    treatment: 'replace',
    replacement: 'Texte',
    reasonKey: 'sharingReason.speechText'
  },
  'Glider.Ctg': { treatment: 'keep', reasonKey: 'sharingReason.gliderCategory' },
  'Glider.CtgHG': { treatment: 'keep', reasonKey: 'sharingReason.hangGliderCategory' },
  'Glider.Name': {
    treatment: 'replace',
    replacement: 'Voile',
    reasonKey: 'sharingReason.gliderName'
  },
  'Glider._model': {
    treatment: 'replace',
    replacement: '',
    reasonKey: 'sharingReason.gliderModel'
  },
  'Glider._producer': {
    treatment: 'replace',
    replacement: '',
    reasonKey: 'sharingReason.gliderProducer'
  },
  'Internal.ProcessedBootstraps': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Livetrack.ClaimContest': { treatment: 'keep', reasonKey: 'sharingReason.livetrackChoice' },
  'Livetrack.DeviceId': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Livetrack.Enabled': { treatment: 'keep', reasonKey: 'sharingReason.livetrackChoice' },
  'Livetrack.FlightPublic': { treatment: 'keep', reasonKey: 'sharingReason.livetrackChoice' },
  'Livetrack.QuickMessages': { treatment: 'drop', reasonKey: 'sharingReason.quickMessages' },
  'Livetrack.ShowPublic': { treatment: 'keep', reasonKey: 'sharingReason.livetrackChoice' },
  'Mapsforge.MapFiles': { treatment: 'drop', reasonKey: 'sharingReason.offlineMaps' },
  'Mapsforge.ThemeFile': {
    treatment: 'replace',
    replacement: 'DEFAULT',
    reasonKey: 'sharingReason.mapTheme'
  },
  'Maverick.SdkKey': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Navigation.State': { treatment: 'drop', reasonKey: 'sharingReason.navigationState' },
  'Navigation.WaypointFiles': { treatment: 'drop', reasonKey: 'sharingReason.waypointFiles' },
  'Pilot.Name': {
    treatment: 'replace',
    replacement: 'Pilote',
    reasonKey: 'sharingReason.pilotName'
  },
  'SafeSky.Address': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'SafeSky.Amt': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'SafeSky.AnonymousUUID': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'SafeSky.AutoIcao': { treatment: 'drop', reasonKey: 'sharingReason.derivedRegistration' },
  'SafeSky.Icao': { treatment: 'drop', reasonKey: 'sharingReason.registration' },
  'SafeSky.Salt': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sec.GpsTimeOffset': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sec.ProToTimestamp': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sec.ProUid': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sec.Xcontest.Uid': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sec.test': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Sensors.Configuration': { treatment: 'drop', reasonKey: 'sharingReason.sensors' },
  'Sensors.LastNetLocation': {
    treatment: 'replace',
    replacement: '',
    reasonKey: 'sharingReason.lastNetLocation'
  },
  'SkySight.Password': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'SkySight.Username': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'Testing.IGCReplayFilename': {
    treatment: 'replace',
    replacement: '',
    reasonKey: 'sharingReason.replayFile'
  },
  'XContest.AuthToken': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'XContest.Password': { treatment: 'drop', reasonKey: CREDENTIAL_REASON },
  'XContest.Username': { treatment: 'drop', reasonKey: CREDENTIAL_REASON }
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
  reasonKey: 'sharingReason.unknownPreference'
}

/**
 * Ce qu'on écrit quand une ligne ne porte pas ce que sa règle attendait — un objet là où
 * l'on comptait poser une chaîne, par exemple, parce qu'une version de XCTrack a changé la
 * forme du réglage. On retire alors la ligne au lieu d'écraser une structure par un mot.
 */
const SHAPE_MISMATCH_REASON: SharingReasonKey = 'sharingReason.shapeMismatch'

/** Ce qu'il est advenu d'un réglage personnel des préférences, prêt à être montré. */
export interface PreferenceOutcome {
  /** La clé, telle qu'elle est écrite dans le fichier — `Pilot.Name`. */
  key: string
  treatment: PreferenceTreatment
  /** La nature du réglage, dans le vocabulaire de `personalData.ts`. */
  kind: PersonalKind
  /**
   * Ce que la ligne portait — **les faits, pas la phrase**. `personalProse(tr).value()`
   * la dit dans la langue du pilote, et **le contenu d'une structure n'est jamais
   * montré** : on en dit la taille.
   */
  before: PersonalValue
  /** Le texte posé à la place. Présent pour `replace` seulement, vide compris. */
  after?: string
  /** Pourquoi ce traitement — `sharingProse(tr).reason()` en rend la phrase. */
  reasonKey: SharingReasonKey
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
  // Les faits, recopiés tels quels : la phrase est faite à l'affichage, par la langue.
  const before: PersonalValue = {
    filled: finding.filled,
    ...(finding.value === undefined ? {} : { value: finding.value }),
    ...(finding.values === undefined ? {} : { values: finding.values }),
    ...(finding.entryCount === undefined ? {} : { entryCount: finding.entryCount })
  }
  const base = { key, kind: finding.kind, before }

  // Un emplacement présent mais vide n'est pas une donnée : il n'y a rien à remplacer, et
  // retirer la ligne changerait le fichier sans rien protéger. Même distinction que
  // `PersonalFinding.filled`, et c'est la sienne qui est lue — pas une seconde règle.
  if (!finding.filled) {
    return {
      kept: value,
      outcome: { ...base, treatment: 'empty', reasonKey: 'sharingReason.emptySlot' }
    }
  }

  const rule = PREFERENCE_RULES[key] ?? UNKNOWN_PREFERENCE_RULE

  if (rule.treatment === 'keep') {
    return { kept: value, outcome: { ...base, treatment: 'keep', reasonKey: rule.reasonKey } }
  }

  if (rule.treatment === 'replace' && rule.replacement !== undefined) {
    if (value.kind !== 'string') {
      return { outcome: { ...base, treatment: 'drop', reasonKey: SHAPE_MISMATCH_REASON } }
    }
    return {
      // `encode` échappe ce qui doit l'être : on n'écrit jamais un texte brut dans `raw`.
      kept: { kind: 'string', raw: encode(rule.replacement) },
      outcome: { ...base, treatment: 'replace', after: rule.replacement, reasonKey: rule.reasonKey }
    }
  }

  return { outcome: { ...base, treatment: 'drop', reasonKey: rule.reasonKey } }
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
  /** Ce qui a mis la puce à l'oreille — `sharingProse(tr).clue()` en rend la phrase. */
  clueKey: SuspectClueKey
  /** La valeur telle qu'elle est écrite, tronquée à `SUSPECT_VALUE_LIMIT`. */
  value: string
}

const CLUE_URL: SuspectClueKey = 'suspectClue.url'
const CLUE_MAIL: SuspectClueKey = 'suspectClue.mail'
const CLUE_PATH: SuspectClueKey = 'suspectClue.path'
const CLUE_HARDWARE: SuspectClueKey = 'suspectClue.hardware'
const CLUE_PHONE: SuspectClueKey = 'suspectClue.phone'
const CLUE_LETTERS: SuspectClueKey = 'suspectClue.letters'
const CLUE_SENTENCE: SuspectClueKey = 'suspectClue.sentence'

/**
 * Les formes qui trahissent une donnée personnelle, dans l'ordre où on les essaie — de la
 * plus précise à la plus large, pour que le motif annoncé soit le plus parlant des deux.
 */
const SUSPECT_SHAPES: ReadonlyArray<{ shape: RegExp; clue: SuspectClueKey }> = [
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
function personalClue(value: string): SuspectClueKey | undefined {
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
  if (clue !== undefined) found.push({ home, path, clueKey: clue, value: truncate(value) })
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

/* ---------------------------------------------------------------- la prose, traduite */

/**
 * Les phrases de ce module, dans la langue du pilote.
 *
 * ```ts
 * const prose = sharingProse(tr)
 * prose.reason(outcome)   // « Votre nom, saisi tel quel. Remplacé par un mot neutre… »
 * prose.clue(suspect)     // « Ce texte a la forme d’une adresse électronique. »
 * ```
 *
 * Un objet plutôt que deux fonctions à qui passer `tr` : la boîte de partage affiche
 * quarante-quatre lignes et le construit une fois. Même forme que `personalProse(tr)`.
 *
 * ⚠️ **Une raison partagée reste une clé unique.** Dix-sept réglages portent
 * `sharingReason.credential`, quatre `sharingReason.livetrackChoice` : la boîte groupe
 * par traitement et **dit une fois** la raison commune à tout un groupe, en comparant les
 * clés. Donner à chacun sa propre clé ferait réapparaître dix-sept fois la même phrase.
 */
export interface SharingProse {
  /** Pourquoi ce texte ou ce réglage est traité ainsi, et par quoi il est remplacé. */
  reason(entry: { reasonKey: SharingReasonKey }): string
  /** Ce qui fait qu'un texte non déclaré a l'air d'une donnée personnelle. */
  clue(suspect: { clueKey: SuspectClueKey }): string
}

export function sharingProse(tr: Translator): SharingProse {
  return {
    reason: (entry) => tr.t(entry.reasonKey),
    clue: (suspect) => tr.t(suspect.clueKey)
  }
}
