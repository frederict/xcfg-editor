import './preferences.css'
import {
  decode, encode, getMember, insertLiteral, insertString, setLiteral, setString
} from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import { androidColorToHex } from '../model/preferences'
import {
  loadPreferenceCatalog,
  type PersonalData,
  type PreferenceCatalog,
  type PreferenceControl,
  type PreferenceEntry,
  type PreferenceScope
} from '../catalog/preferenceCatalog'
import {
  collectPersonalData,
  PERSONAL_BASIS_LABELS,
  PERSONAL_CAVEAT,
  PERSONAL_KIND_LABELS,
  SECURE_PERSONAL_KEYS,
  type PersonalCounts
} from '../model/personalData'

/**
 * La page des **réglages généraux** de XCTrack : tout ce qui se règle hors des pages de
 * gadgets — unités, touches, capteurs, son, espaces aériens.
 *
 * ## Deux modes, et le second ne se devine pas
 *
 * Sans `onEdit`, la page est en **lecture seule, et pas en grisage** : elle ne construit
 * alors aucun contrôle de formulaire — pas d'`<input>`, pas de `<select>`, pas de case
 * désactivée. Les valeurs sont du texte, et le document ne peut pas bouger d'un octet.
 * C'est la leçon de `properties.ts` (`renderProperties({ readOnly: true })`) : un
 * contrôle désactivé se réactive depuis la console, ce qui n'existe pas ne se réactive
 * pas. `data-mode="lecture"` le dit de l'extérieur.
 *
 * Avec `onEdit`, la page devient **modifiable** (`data-mode="edition"`), et l'assembleur
 * reçoit chaque écriture pour l'enregistrer dans l'historique et marquer le document.
 *
 * ## Ce qui est modifiable, et pourquoi le reste ne l'est pas
 *
 * Trois filtres, du plus large au plus étroit :
 *
 * 1. **Ce qui n'est pas présentable n'est pas modifiable.** Une clé sans libellé, une
 *    clé d'une autre version, de l'état sérialisé : la page les montre en fin de page,
 *    en texte, exactement comme avant. On ne propose pas de régler ce qu'on ne sait pas
 *    nommer.
 * 2. **Une valeur structurée ne se réécrit jamais.** `Sounds`, `Navigation.State`,
 *    `Sensors.Configuration`, `Maverick.Layout`, `Sensors.AcousticVario.CustomProfile`
 *    (une table de 16 entrées) sont du JSON imbriqué que la page montre sans le déballer.
 *    Elle ne le déballera pas davantage pour l'écrire.
 * 3. **Seuls six types de contrôle sont offerts** — voir `EDITABLE_CONTROLS`. Les
 *    dix-huit lignes de contrôle `action` ouvrent, sur l'appareil, une boîte que rien ne
 *    remplace ici : `Keys.*` attend une **touche pressée** et enregistre son code Android,
 *    dont ce catalogue ne relève aucune correspondance ; `Sensors.AcousticVario.
 *    CustomProfileEnabled` commande la table de 16 entrées qu'on ne réécrit pas. La ligne
 *    reste affichée, avec sa valeur, et dit pourquoi elle ne se règle pas.
 *
 * ## Écrire sans dégrader
 *
 * Une écriture passe par `writePreference`, qui ne touche **que** le nœud de la clé
 * visée, par `setString` / `setLiteral` de `core/access` — jamais par `JSON.stringify` du
 * document. Deux conséquences mesurées :
 *
 * - une valeur reposée à l'identique n'est **pas** réécrite (`'unchanged'`), et le texte
 *   source d'origine reste en place : `3.0` ne devient pas `3` en passant ;
 * - la comparaison des littéraux se fait d'abord sur le texte, puis sur le nombre, ce qui
 *   fait qu'un aller-retour par un champ numérique — où le navigateur normalise ce qu'il
 *   affiche — ne réécrit rien non plus.
 *
 * ## La structure de la page est celle de l'appareil
 *
 * Le catalogue porte l'arborescence des 20 écrans de réglages de XCTrack. L'écran racine
 * (`preferences`) **est** le menu de l'appareil, dans son ordre : « Pilote et comptes »,
 * « Aéronef », « Livetracking »… La page le reprend tel quel plutôt que d'inventer un
 * classement. Un pilote qui cherche un réglage le cherche là où il l'a réglé.
 *
 * Le lien d'une ligne du menu vers l'écran qu'elle ouvre n'est **pas** dans les
 * ressources : la ligne dit seulement qu'elle ouvre un fragment ou une activité. Il est
 * donc rétabli ici par `MENU_SCREENS`, **déduit du nom de la ressource** et vérifié par
 * un test (chaque écran du catalogue est cité une fois et une seule). C'est une
 * déduction, pas un relevé : elle est dite comme telle.
 *
 * ## Ce que le fichier porte et que la page ne sait pas présenter
 *
 * 85 clés sur 216 n'ont aucun libellé, et un fichier réel en porte 49. Les faire
 * disparaître serait mentir sur le contenu du fichier. Elles sont donc rassemblées en
 * fin de page, en trois groupes qui disent chacun **pourquoi** :
 *
 * - *sans libellé* — de vrais réglages, mais XCTrack les configure dans des écrans
 *   construits en code (espaces aériens, cartes, thermiques). La valeur et la comparaison
 *   au défaut restent affichées : le catalogue les connaît, c'est le nom qui manque ;
 * - *état sérialisé* — ce ne sont pas des réglages du tout, mais l'état de
 *   l'application (`Navigation.State`, `Sounds`, `Sensors.Configuration`…). On n'en
 *   montre que la taille, jamais le contenu ;
 * - *inconnue de ce catalogue* — une clé d'une autre version de XCTrack. Le fichier de
 *   2025 en porte 27. La page dit « je ne sais pas » : jamais « supprimable », jamais
 *   « inconnue donc ignorée ».
 *
 * ## Absente n'est pas « réglée au défaut » — et l'écriture ne le décide pas en silence
 *
 * Une clé absente du fichier signifie « XCTrack appliquera son défaut » — ce n'est pas la
 * même chose que « réglée à cette valeur ». Les deux ont leur état, et le compte les
 * sépare. Voir `PreferenceState`.
 *
 * **Décision de cette page : une clé absente le reste tant que le pilote ne demande pas
 * explicitement le contraire.** Elle ne reçoit aucun contrôle — un champ prérempli au
 * défaut inviterait à « confirmer » une valeur, et le premier geste maladroit écrirait
 * une ligne de plus dans le fichier sans rien changer au comportement de l'appareil.
 * À la place, la ligne porte un bouton « Écrire cette clé », dont l'infobulle dit
 * exactement ce qu'il fait et ce qu'il ne fait pas. Une fois la clé écrite — au défaut
 * relevé, tel qu'il s'écrit — la ligne devient une ligne comme les autres.
 *
 * Ce bouton n'apparaît que si le catalogue relève un défaut **écrivable** : les huit
 * `Unit.*` et les autres défauts calculés au démarrage (`defaultSource: 'runtime'`) n'en
 * ont pas, et la ligne le dit plutôt que d'inventer une valeur de départ.
 */

/* ------------------------------------------------------------------ le modèle de page */

/**
 * Ce que vaut une préférence dans ce fichier-ci. Six états, parce que six situations
 * distinctes se présentent réellement et qu'aucune ne se déduit d'une autre.
 */
export type PreferenceState =
  /** Présente, et différente du défaut relevé : le pilote l'a réglée. */
  | 'custom'
  /** Présente, et égale au défaut relevé. */
  | 'default'
  /**
   * Présente, mais rien à comparer : `Unit.*` dont XCTrack calcule le défaut selon la
   * locale, ou clé dont le catalogue ne relève aucun défaut.
   */
  | 'undecidable'
  /**
   * Présente, et XCTrack publie **deux défauts contradictoires** — le bytecode et
   * l'écran ne disent pas la même chose. On ne choisit pas : on montre les deux.
   */
  | 'conflict'
  /** Absente du fichier : XCTrack appliquera son défaut. Ce n'est PAS « au défaut ». */
  | 'absent'
  /**
   * Absente, et Android ne l'écrit qu'une fois réglée au moins une fois sur l'appareil
   * (les clés que la classe de configuration ne déclare pas). Son absence ne dit donc
   * même pas quel défaut s'appliquera.
   */
  | 'unwritten'

/** Pourquoi une clé du fichier n'apparaît pas dans un écran de la page. */
export type LeftoverReason =
  /** De vrais réglages, mais aucun libellé dans l'APK. */
  | 'unlabelled'
  /** De l'état sérialisé, pas un réglage. */
  | 'state'
  /** Le catalogue ne connaît pas cette clé — une autre version de XCTrack l'a écrite. */
  | 'unknown'

/** Une ligne de la page : une clé, ce qu'elle vaut, et ce que ça vaut de le savoir. */
export interface PreferenceRow {
  key: string
  /** Le libellé traduit, ou la clé elle-même quand l'APK n'en porte aucun. */
  label: string
  /** Vrai si `label` est un vrai libellé et non la clé faute de mieux. */
  labelled: boolean
  help?: string
  control: PreferenceControl | null
  scope: PreferenceScope | null
  state: PreferenceState
  /** La valeur en toutes lettres. `undefined` quand la clé est absente du fichier. */
  value?: string
  /** Le texte source de la valeur, tel qu'il est écrit dans le fichier. */
  raw?: string
  /** Le défaut, dit comme la valeur l'est juste à côté. */
  defaultText?: string
  /** Le second défaut, quand XCTrack se contredit — voir `conflict`. */
  otherDefaultText?: string
  /** Pourquoi il n'y a rien à comparer, quand l'état vaut `undecidable`. */
  undecidableReason?: string
  personal?: PersonalData
  /** Vrai si la valeur est un objet ou un tableau : on n'en montre que la taille. */
  structured: boolean
  /** Défini pour une ligne du bloc de fin — voir `LeftoverReason`. */
  reason?: LeftoverReason
  /** Ce qui précède le premier point (`Airspace`), pour grouper le bloc de fin. */
  family: string
}

/** Un bloc de lignes coiffé d'une catégorie, tel que l'écran de XCTrack l'affiche. */
export interface PreferenceCategoryBlock {
  /** Le titre de la catégorie, ou `undefined` pour les lignes de tête d'un écran. */
  title?: string
  rows: PreferenceRow[]
}

/** Un écran de réglages de XCTrack, rendu dans l'ordre de ses lignes. */
export interface PreferenceScreenBlock {
  id: string
  title: string
  blocks: PreferenceCategoryBlock[]
  /** Combien de réglages de cet écran ne quittent jamais l'appareil (INTERNAL, SECURE). */
  neverExported: number
}

/** Une entrée du menu de l'appareil, avec les écrans qu'elle ouvre. */
export interface PreferenceMenuEntry {
  /** La clé de la ligne du menu racine (`_display`), ou `''` pour une ligne sans clé. */
  menuKey: string
  title: string
  screens: PreferenceScreenBlock[]
  /** Ce qu'il faut dire quand la page n'a rien à montrer sous cette entrée. */
  note?: string
  /**
   * Ce que ce fichier-ci porte sous une entrée que la page ne sait pas déplier :
   * combien de clés, et combien d'entre elles portent un libellé. Sans ce compte, une
   * entrée muette ne se distinguerait pas d'une entrée vide.
   */
  tally?: { total: number; labelled: number }
}

export interface PreferencesSummary {
  /** Vrai si le fichier ne porte aucune préférence — un export `pages`, par exemple. */
  empty: boolean
  /** Combien de clés la section `preferences` du fichier porte. */
  fileKeyCount: number
  /** Combien de lignes la page présente dans un écran. */
  presentedCount: number
  customCount: number
  defaultCount: number
  undecidableCount: number
  conflictCount: number
  absentCount: number
  unwrittenCount: number
  unlabelledCount: number
  stateCount: number
  unknownCount: number
  /** Combien de clés du fichier portent une donnée personnelle. */
  personalCount: number
  /**
   * L'inventaire **entier** du fichier, préférences et disposition, tel que
   * `model/personalData.ts` l'établit pour les quatre écrans.
   *
   * Cette page ne montre que les préférences — un écran de réglages n'a pas à montrer ce
   * qu'une boîte de partage montre — mais elle doit **dire** qu'elle ne compte pas tout :
   * les textes écrits dans les gadgets sont les seuls qui partent avec un export
   * « pages », et un pilote qui lit « 16 » ici puis « 5 » dans la boîte de partage doit
   * comprendre que ce ne sont pas deux mesures du même objet.
   *
   * `personalCounts.preferences` et `personalCount` comptent la même chose par deux
   * chemins — le relevé embarqué et le catalogue chargé — et un test exige qu'ils soient
   * égaux sur tous les fichiers du corpus. C'est ce qui rend les deux écrans
   * démontrablement d'accord plutôt que vraisemblablement d'accord.
   */
  personalCounts: PersonalCounts
  /** Combien de réglages connus ne quittent jamais l'appareil. */
  neverExportedCount: number
}

export interface PreferenceInventory {
  summary: PreferencesSummary
  menu: PreferenceMenuEntry[]
  /** Les lignes du bloc de fin, dans l'ordre du fichier. */
  leftovers: PreferenceRow[]
  /** Les clés personnelles présentes dans ce fichier, dans l'ordre du fichier. */
  personal: PreferenceRow[]
}

/* --------------------------------------------------- le menu de l'appareil, rétabli */

/**
 * Quel écran chaque ligne du menu racine ouvre.
 *
 * ⚠️ **Déduit, non relevé.** Les ressources disent qu'une ligne ouvre « un fragment » ou
 * « une activité », jamais lequel : la cible vit dans le code, sous un nom obfusqué. Le
 * rapprochement se fait donc ici sur le nom (`_display` → `preferences_display`), et il
 * est vérifié par un test qui exige que les 19 écrans non racines soient cités une fois
 * et une seule. Une version de XCTrack qui ajouterait un écran ferait donc échouer le
 * test plutôt que de le laisser tomber silencieusement de la page.
 *
 * Deux écrans ne sont pas ouverts depuis le menu racine mais depuis un autre écran :
 * `preferences_units` depuis « Affichage », `preferences_acoustic_vario` depuis « Son et
 * alertes ». Ils sont rattachés à leur parent, comme sur l'appareil.
 */
interface ScreenLink {
  id: string
  /**
   * La clé de la ligne qui ouvre cet écran depuis un **autre** écran que le menu racine.
   * Cette ligne-là porte le titre que l'appareil affiche en haut de l'écran ouvert
   * (« Unités », « Vario sonore ») ; sans elle, deux écrans d'une même entrée de menu
   * s'afficheraient tous deux sous le titre de l'entrée.
   */
  via?: string
}

const MENU_SCREENS: Record<string, readonly ScreenLink[]> = {
  _pilot: [{ id: 'preferences_pilot' }],
  _glider: [{ id: 'preferences_glider' }],
  _livetracking: [{ id: 'preferences_live' }],
  _contest: [{ id: 'preferences_contest' }],
  _sensorsQnh: [{ id: 'preferences_atmosphere' }],
  _sound: [
    { id: 'preferences_sound' },
    { id: 'preferences_acoustic_vario', via: '_sensorsAcousticVario' }
  ],
  _display: [
    { id: 'preferences_display' },
    { id: 'preferences_units', via: '_units' }
  ],
  _activelook: [{ id: 'preferences_activelook' }],
  _maverick: [{ id: 'preferences_maverick' }],
  _keyBindings: [{ id: 'preferences_keybindings' }],
  _sensors: [{ id: 'preferences_sensors' }],
  _shareconfig: [{ id: 'preferences_shareconfig' }],
  _tweaks: [{ id: 'preferences_tweaks' }],
  _testing: [{ id: 'preferences_testing_debug' }],
  _about: [{ id: 'preferences_about' }],
  _extra: [{ id: 'preferences_extra' }],
  _devel: [{ id: 'preferences_devel' }]
}

/**
 * Ce qu'il faut dire des lignes du menu que la page ne peut pas déplier — celles qui
 * ouvrent une activité écrite en code plutôt qu'un écran décrit en XML.
 *
 * Un menu amputé de six lignes se lirait comme un menu complet, et le pilote chercherait
 * en vain « Espaces aériens » : la ligne reste, avec la raison.
 */
/**
 * Les familles de clés qu'une entrée du menu écrit, quand la page ne peut pas déplier
 * son écran.
 *
 * Cela sert à mesurer l'écart plutôt qu'à le taire : « Espaces aériens et obstacles »
 * est la famille la plus fournie d'un fichier réel (18 clés) et la moins libellée (1 sur
 * 18). Sans ce compte, la ligne dirait « écran construit en code » sans que le pilote
 * sache que c'est là que sont ses dix-huit réglages.
 *
 * Le rapprochement est **déduit du préfixe de la clé**, comme `MENU_SCREENS` l'est du
 * nom de la ressource.
 */
const MENU_FAMILIES: Record<string, readonly string[]> = {
  _airspaces: ['Airspace', 'Obstacles'],
  _maps: ['Mapsforge']
}

const MENU_NOTES: Record<string, string> = {
  _airspaces:
    'XCTrack construit cet écran en code : la clé y est posée loin de son libellé, et ' +
    'l’application ne la nomme donc nulle part qu’on puisse lire. Les réglages qu’elle ' +
    'écrit sont bien dans le fichier — ils sont rassemblés plus bas, sous « Réglages sans ' +
    'libellé » et « État sérialisé ».',
  _maps:
    'Écran construit en code, lui aussi sans libellé exploitable. Les clés « Mapsforge » ' +
    'du fichier sont rassemblées plus bas.',
  _editPageSet:
    'Cette ligne ouvre l’éditeur de pages et de gadgets — c’est le reste de cet éditeur ' +
    'qui les montre, pas cette page.',
  _eventMapping:
    'Les actions automatiques sont enregistrées en bloc dans « EventMappingJs » : un ' +
    'programme sérialisé, et non une liste de réglages.',
  _pro:
    'L’abonnement se gère sur le compte XContest, pas dans le fichier de configuration.',
  _sensors:
    'Cet écran sert à apparier les capteurs. Ce qu’il enregistre tient en une seule clé, ' +
    '« Sensors.Configuration », rassemblée plus bas avec le reste de l’état sérialisé.',
  _shareconfig:
    'Cet écran ne porte que deux commandes — exporter, importer une configuration. Il n’a ' +
    'aucun réglage à retenir.',
  _about:
    'Cet écran n’affiche que des informations sur l’application : version, journal des ' +
    'modifications, mentions. Rien qui se règle.',
  '':
    'Ligne d’information sans réglage.'
}

/* ------------------------------------------------------------------ lecture du fichier */

/** Les clés de la section `preferences`, dans l'ordre du fichier, avec leur nœud. */
function readFilePreferences(document: JsonNode): Map<string, JsonNode> {
  const found = new Map<string, JsonNode>()
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') return found
  // Sur clé dupliquée, la dernière l'emporte — comme `getMember`, comme XCTrack.
  for (const [rawKey, value] of section.entries) found.set(decode(rawKey), value)
  return found
}

/** Vrai si le fichier porte bien une section `preferences`, fût-elle vide. */
function hasPreferencesSection(document: JsonNode): boolean {
  const section = getMember(document, 'preferences')
  return section !== undefined && section.kind === 'object'
}

/* ----------------------------------------------------------- la valeur, en toutes lettres */

/** Le texte scalaire d'un nœud : la chaîne décodée, ou le littéral tel qu'il est écrit. */
function scalarText(node: JsonNode): string | undefined {
  if (node.kind === 'string') return decode(node.raw)
  if (node.kind === 'literal') return node.raw
  return undefined
}

/**
 * L'indentation à laquelle une valeur de préférence est écrite : la section
 * `preferences` est au premier niveau du document, ses clés au deuxième, donc leurs
 * valeurs se sérialisent avec quatre espaces de marge.
 */
const PREFERENCE_INDENT = '    '

/**
 * La taille d'une valeur structurée, dite en caractères.
 *
 * `serializeJson` réécrit le nœud **tel que le fichier le porte** — c'est la propriété
 * centrale du projet — et à l'indentation du contexte, le compte est donc exactement
 * celui des caractères que le fichier consacre à cette valeur.
 */
function structuredSize(node: JsonNode): number {
  return serializeJson(node, PREFERENCE_INDENT).length
}

/**
 * Un nombre, à la française : l'espace fine insécable des milliers, celle que
 * `toLocaleString` pose et que la typographie française attend.
 */
function formatCount(value: number): string {
  return value.toLocaleString('fr-FR')
}


/** Au-delà, une valeur scalaire est abrégée à l'affichage. */
const LONG_VALUE = 80

/**
 * La valeur telle qu'on la lit, et non telle qu'elle s'écrit.
 *
 * Une valeur structurée n'est **jamais** dépliée : `Navigation.State` porte la tâche en
 * cours avec ses coordonnées, `Sounds` la table des sons. On en dit la nature et la
 * taille, ce qui suffit à savoir qu'elle est là et ce qu'elle pèse.
 */
export function readableValue(
  node: JsonNode, entry: PreferenceEntry | undefined, catalog: PreferenceCatalog, key: string
): string {
  if (node.kind === 'object') {
    return `objet JSON, ${formatCount(structuredSize(node))} caractères`
  }
  if (node.kind === 'array') {
    const count = node.items.length
    return count === 0
      ? 'liste vide'
      : `liste de ${count} élément${count > 1 ? 's' : ''}, ${formatCount(structuredSize(node))} caractères`
  }

  const text = scalarText(node) ?? node.raw

  if (entry?.control === 'color') {
    const value = Number(text)
    return Number.isFinite(value) ? androidColorToHex(value) : text
  }
  if (entry?.valueKind === 'boolean' || entry?.control === 'checkbox') {
    if (text === 'true') return 'Oui'
    if (text === 'false') return 'Non'
  }
  // Une touche non attribuée vaut -1 : « -1 » ne dit rien, « aucune touche » dit tout.
  if (entry?.family === 'Keys' && entry.control === 'action') {
    return text === '-1' ? 'aucune touche' : `code ${text}`
  }

  const choices = entry === undefined ? [] : catalog.values(key)
  const choice = choices.find((one) => one.value === text)
  if (choice !== undefined) return choice.label
  if (choices.length > 0 && node.kind === 'string') {
    // Une valeur hors du domaine que l'écran propose : dite comme telle, jamais masquée.
    return text === '' ? '(vide)' : `${text} (hors catalogue)`
  }

  if (node.kind === 'string' && text === '') return '(vide)'
  // Une chaîne très longue — `EventMapping` d'une vieille version en fait 140 — mettrait
  // cinq lignes dans une colonne de valeurs. On en montre le début et la longueur ; le
  // texte entier reste dans `raw`, donc dans le document, intact.
  if (text.length > LONG_VALUE) {
    return `${text.slice(0, LONG_VALUE - 20)}… (${formatCount(text.length)} caractères)`
  }
  // `unit` vaut parfois la chaîne vide dans les ressources (`ActiveLook.Luma`) : coller
  // une unité vide laisserait une espace en fin de valeur, visible et fausse.
  const unit = entry?.unit === undefined ? '' : entry.unit.trim()
  return unit === '' ? text : `${text} ${unit}`
}

/** Le défaut du catalogue, dit exactement comme la valeur du fichier l'est. */
function readableDefault(
  value: boolean | number | string, entry: PreferenceEntry, catalog: PreferenceCatalog, key: string
): string {
  const node: JsonNode = typeof value === 'string'
    ? { kind: 'string', raw: JSON.stringify(value) }
    : { kind: 'literal', raw: String(value) }
  return readableValue(node, entry, catalog, key)
}

/** La forme canonique d'un défaut, pour la comparaison au texte du fichier. */
function defaultAsText(value: boolean | number | string): string {
  return typeof value === 'string' ? value : String(value)
}

/**
 * Vrai si la valeur du fichier est celle du relevé.
 *
 * La comparaison se fait sur le texte, puis sur le nombre : XCTrack écrit tantôt `100`,
 * tantôt `"100"` pour la même préférence (`Display.WidgetTitleSize` est une liste de
 * chaînes dont le défaut est déclaré en chaîne), et `1013` vaut `1013.0`.
 */
export function sameAsDefault(fileText: string, defaultValue: boolean | number | string): boolean {
  const expected = defaultAsText(defaultValue)
  if (fileText === expected) return true
  const a = Number(fileText)
  const b = Number(expected)
  return fileText.trim() !== '' && expected.trim() !== '' &&
    Number.isFinite(a) && Number.isFinite(b) && a === b
}

/* ---------------------------------------------------------------- construction des lignes */

interface RowContext {
  catalog: PreferenceCatalog
  file: Map<string, JsonNode>
  /** Les clés que XCTrack se contredit lui-même à défaillir — voir `meta.defaultConflicts`. */
  conflicts: Set<string>
}

function buildRow(key: string, ctx: RowContext): PreferenceRow {
  const { catalog, file } = ctx
  const entry = catalog.preference(key)
  const node = file.get(key)
  const labelled = catalog.hasLabel(key)

  const row: PreferenceRow = {
    key,
    label: catalog.label(key),
    labelled,
    control: entry?.control ?? null,
    scope: entry?.scope ?? null,
    state: 'undecidable',
    structured: node !== undefined && (node.kind === 'object' || node.kind === 'array'),
    family: entry?.family ?? (key.includes('.') ? key.slice(0, key.indexOf('.')) : '')
  }

  const help = catalog.help(key)
  if (entry?.personal !== undefined) row.personal = entry.personal

  if (node === undefined) {
    if (help !== undefined) row.help = applyPattern(help, undefined)
    // Une clé absente n'est pas une clé réglée au défaut : c'est l'information même que
    // cette page doit rendre, et elle a son propre état.
    row.state = entry !== undefined && entry.declared ? 'absent' : 'unwritten'
    if (entry?.default !== undefined && entry.defaultSource !== 'runtime') {
      row.defaultText = readableDefault(entry.default, entry, catalog, key)
    }
    if (entry?.defaultSource === 'runtime') {
      row.undecidableReason = RUNTIME_DEFAULT_REASON
    }
    return row
  }

  row.value = readableValue(node, entry, catalog, key)
  if (help !== undefined) row.help = applyPattern(help, row.value)
  row.raw = node.kind === 'object' || node.kind === 'array'
    ? serializeJson(node, PREFERENCE_INDENT)
    : node.raw

  if (entry === undefined) {
    row.undecidableReason = 'Cet éditeur ne connaît pas cette clé : il n’en sait ni le rôle ni le défaut.'
    return row
  }

  if (ctx.conflicts.has(key) && entry.default !== undefined && entry.xmlDefault !== undefined) {
    row.state = 'conflict'
    row.defaultText = readableDefault(entry.default, entry, catalog, key)
    row.otherDefaultText = readableDefault(entry.xmlDefault, entry, catalog, key)
    return row
  }

  if (entry.defaultSource === 'runtime') {
    row.undecidableReason = RUNTIME_DEFAULT_REASON
    return row
  }
  if (entry.default === undefined) {
    row.undecidableReason = 'Le catalogue ne relève aucune valeur par défaut pour cette clé.'
    return row
  }

  row.defaultText = readableDefault(entry.default, entry, catalog, key)
  const text = scalarText(node)
  if (text === undefined) {
    // Une valeur structurée face à un défaut scalaire : on ne compare pas des formes
    // différentes, on le dit.
    row.undecidableReason = 'La valeur du fichier est une structure ; le défaut relevé est une valeur simple.'
    return row
  }
  row.state = sameAsDefault(text, entry.default) ? 'default' : 'custom'
  return row
}

/**
 * Substitue la valeur dans un gabarit de ressource Android — `%d`, `%s`, `%f` — et
 * réduit `%%` au signe pour cent qu'il représente.
 *
 * Un seul texte du catalogue en porte (`_ttsSpeed` : « Régler la vitesse de lecture
 * (50 à 200%%): %d%% »), mais l'afficher tel quel montrerait au pilote le gabarit et non
 * la phrase. Même règle que `applyLabelPattern` dans `properties.ts` : c'est ce que
 * XCTrack fait lui-même à l'affichage.
 *
 * Sans valeur — la clé est absente du fichier — le trou est marqué par des points de
 * suspension plutôt que rempli : on ne devine pas ce qui n'est pas écrit.
 */
export function applyPattern(text: string, value: string | undefined): string {
  return text.replace(/%(\d+\$)?(\.\d+)?[dsf]/g, value ?? '…').replace(/%%/g, '%')
}

const RUNTIME_DEFAULT_REASON =
  'XCTrack remplit cette liste en code et son défaut dépend de la langue et du pays de ' +
  'l’appareil : il n’y a rien à comparer.'

/**
 * Vrai si la page sait présenter cette clé sous son libellé, dans son écran.
 *
 * `control !== null` écarte les 85 clés qu'aucun écran de réglages ne montre — de l'état
 * sérialisé pour une part, des réglages d'écrans construits en code pour le reste. Le
 * libellé écarte le peu qui resterait sans nom.
 *
 * `declared` n'entre **pas** dans ce filtre, contrairement à ce qu'on ferait pour bâtir
 * une page de réglages depuis le catalogue seul : `SafeSky.Interval`, `_ttsSpeed` et
 * `_ttsPitch` ne sont pas déclarées par la classe de configuration mais portent un
 * libellé, une liste de valeurs, et figurent bel et bien dans un fichier réel. Les
 * écarter les ferait disparaître d'une page qui, elle, part du fichier. `declared` sert
 * ailleurs : à distinguer « absente » de « jamais écrite ».
 */
export function isPresentable(catalog: PreferenceCatalog, key: string): boolean {
  const entry = catalog.preference(key)
  return entry !== undefined && entry.control !== null && catalog.hasLabel(key)
}

/* -------------------------------------------------------------------------- l'écriture */

/**
 * Les contrôles que la page sait offrir honnêtement.
 *
 * `action` en est absent, et c'est la décision qui écarte le plus de lignes (18) : sur
 * l'appareil, ces lignes ouvrent une boîte — capturer une touche, choisir une adresse,
 * bâtir une table de sons — dont ni le domaine ni l'effet de bord ne sont relevés ici.
 * `button` et `screen` ne portent pas de valeur du tout.
 */
export const EDITABLE_CONTROLS: ReadonlySet<PreferenceControl> =
  new Set<PreferenceControl>(['checkbox', 'list', 'slider', 'number', 'text', 'color'])

/**
 * Pourquoi cette ligne-là ne se règle pas, ou `undefined` si elle se règle.
 *
 * Rendre la **raison** plutôt qu'un booléen : la ligne reste affichée, et une ligne qui
 * ne se règle pas doit dire pourquoi — sans quoi le pilote croit à une panne.
 */
export function editRefusal(row: PreferenceRow): string | undefined {
  if (row.reason !== undefined) {
    if (row.reason === 'unknown') {
      return 'Cet éditeur ne sait pas ce que règle cette clé : il ne propose pas de la ' +
        'changer. Elle est conservée telle quelle.'
    }
    if (row.reason === 'state') {
      return 'Cette clé enregistre l’état de l’application, pas un réglage : elle ressort ' +
        'intacte, jamais réécrite.'
    }
    return 'XCTrack ne nomme ce réglage nulle part qu’on puisse lire : sans son libellé, ' +
      'cet éditeur ne propose pas de le changer.'
  }
  if (row.structured) {
    return 'Valeur JSON imbriquée : cette page la montre sans la déballer, et ne la ' +
      'réécrit jamais.'
  }
  if (row.control === null || !EDITABLE_CONTROLS.has(row.control)) {
    if (row.control === 'action') {
      // Formulé sans nombre : la même phrase sert d'infobulle sur une ligne et de note
      // sous un bloc de quinze.
      return 'Sur l’appareil, cela s’obtient par une boîte de dialogue — une touche à ' +
        'presser, une adresse à choisir — dont cet éditeur ne relève pas le domaine.'
    }
    return 'Cela ne se saisit pas : la ligne commande, elle ne porte pas de valeur.'
  }
  return undefined
}

/**
 * Vrai si la valeur de cette clé s'écrit entre guillemets.
 *
 * Le témoin le plus sûr est **ce que le fichier porte déjà** : XCTrack écrit tantôt `100`,
 * tantôt `"100"` pour des réglages voisins, et rien dans le catalogue ne le prédit
 * mieux que le fichier lui-même. Pour une clé absente, c'est le type du défaut relevé qui
 * tranche — c'est lui que XCTrack écrira le jour où il l'écrira.
 */
export function writesString(
  entry: PreferenceEntry | undefined, current: JsonNode | undefined
): boolean {
  if (current?.kind === 'string') return true
  if (current?.kind === 'literal') return false
  if (typeof entry?.default === 'string') return true
  if (entry?.default !== undefined) return false
  return entry?.valueKind === 'string' || entry?.valueKind === 'enum'
}

/** Ce qu'une écriture a réellement fait au document. */
export type WriteOutcome = 'set' | 'inserted' | 'unchanged'

/**
 * Écrit une valeur de préférence, et **rien d'autre**.
 *
 * `text` est la valeur telle qu'on la lit : le contenu d'une chaîne sans ses guillemets,
 * le texte source exact d'un littéral. Ce n'est jamais un nombre JavaScript — c'est
 * précisément ce qui interdit à `JSON.stringify` de réécrire `3.0` en `3`.
 *
 * Rend `'unchanged'` sans rien écrire quand la valeur demandée est déjà celle du fichier.
 * Deux comparaisons, dans cet ordre :
 *
 * 1. **le texte source**, qui suffit dans l'immense majorité des cas et préserve la forme
 *    exacte du fichier (`1.0E7`, `-0.0`, un entier au-delà de 2^53) ;
 * 2. **le nombre**, pour les littéraux seulement, parce qu'un champ numérique de
 *    navigateur normalise ce qu'il affiche : reposer `3.0` par un `<input type="number">`
 *    revient avec `3`, et réécrire serait dégrader une valeur que le pilote n'a pas
 *    changée. `===` et non `Object.is` : `-0.0` face à `0` est traité comme inchangé,
 *    donc préservé, ce qui est le sens conservateur.
 *
 * ⚠️ Cette seconde comparaison passe par `Number`, qui perd la précision au-delà de
 * 2^53 : deux entiers énormes distincts peuvent s'y égaler, et l'écriture serait alors
 * refusée. Refuser une écriture est sans conséquence ; en accepter une qui dégrade ne
 * l'est pas. Aucune préférence présentable ne porte de tel entier.
 *
 * Une clé absente est **insérée en fin de section** : voir `insertRaw` dans
 * `core/access` — c'est la seule position qui ne déplace, ne réécrit et ne réindente
 * aucune clé existante.
 */
export function writePreference(
  document: JsonNode, key: string, text: string, asString: boolean
): WriteOutcome {
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') {
    throw new Error('writePreference : ce document n’a pas de section « preferences »')
  }
  const current = getMember(section, key)

  if (asString) {
    if (current === undefined) {
      insertString(section, key, encode(text))
      return 'inserted'
    }
    if (current.kind === 'string' && decode(current.raw) === text) return 'unchanged'
    setString(section, key, encode(text))
    return 'set'
  }

  if (current === undefined) {
    insertLiteral(section, key, text)
    return 'inserted'
  }
  if (current.kind === 'literal') {
    if (current.raw === text) return 'unchanged'
    const before = Number(current.raw)
    const after = Number(text)
    if (Number.isFinite(before) && Number.isFinite(after) && before === after) return 'unchanged'
  }
  setLiteral(section, key, text)
  return 'set'
}

/** Ce qu'une écriture vient de faire, tel que l'assembleur a besoin de le savoir. */
export interface PreferenceEdit {
  key: string
  /** Le libellé du réglage, celui que la ligne affiche. */
  label: string
  /** `set` : une valeur remplacée. `inserted` : une clé que le fichier ne portait pas. */
  outcome: Exclude<WriteOutcome, 'unchanged'>
  /** La valeur désormais écrite, telle qu'on la lit. */
  text: string
  /** Une phrase pour l'historique : « Régler Thème ». */
  description: string
  /**
   * Vrai pour un contrôle qui émet en continu — curseur, champ numérique. L'assembleur
   * regroupe alors les pas d'historique, comme il le fait pour le panneau des gadgets.
   */
  continuous: boolean
  /**
   * Défini quand l'écriture vient de **renseigner** une donnée personnelle : la clé en
   * porte une, et la valeur écrite n'est pas vide. Une clé personnelle vidée ne le
   * déclenche pas — c'est le contraire d'un risque.
   */
  personal?: PersonalData
}

/* ------------------------------------------------------------------------- l'inventaire */

/**
 * Tout ce que la page a besoin de savoir, calculé sans toucher au DOM.
 *
 * Séparé du rendu pour deux raisons : les comptes se testent sans navigateur, et un
 * appelant qui voudrait seulement le résumé (un bandeau, un avertissement) n'a pas à
 * construire la page.
 */
export function buildPreferenceInventory(
  document: JsonNode, catalog: PreferenceCatalog
): PreferenceInventory {
  const file = readFilePreferences(document)
  const ctx: RowContext = {
    catalog,
    file,
    conflicts: new Set(catalog.meta.defaultConflicts)
  }

  const inventory = collectPersonalData(document)

  const summary: PreferencesSummary = {
    empty: !hasPreferencesSection(document) || file.size === 0,
    fileKeyCount: file.size,
    presentedCount: 0,
    customCount: 0,
    defaultCount: 0,
    undecidableCount: 0,
    conflictCount: 0,
    absentCount: 0,
    unwrittenCount: 0,
    unlabelledCount: 0,
    stateCount: 0,
    unknownCount: 0,
    personalCount: 0,
    personalCounts: inventory.counts,
    neverExportedCount: 0
  }

  // Un fichier sans préférence ne se décrit pas par 93 lignes « absente » : il se dit en
  // une phrase. Compter des manques dans un export qui n'a jamais prétendu les porter
  // serait un reproche adressé au fichier, pas un renseignement.
  if (summary.empty) return { summary, menu: [], leftovers: [], personal: [] }

  const presented = new Set<string>()
  const menu = buildMenu(ctx, presented, summary)
  const leftovers = buildLeftovers(ctx, presented, summary)

  const personal: PreferenceRow[] = []
  for (const key of file.keys()) {
    if (catalog.preference(key)?.personal === undefined) continue
    summary.personalCount += 1
    personal.push(buildRow(key, ctx))
  }

  return { summary, menu, leftovers, personal }
}

function countState(summary: PreferencesSummary, state: PreferenceState): void {
  if (state === 'custom') summary.customCount += 1
  else if (state === 'default') summary.defaultCount += 1
  else if (state === 'undecidable') summary.undecidableCount += 1
  else if (state === 'conflict') summary.conflictCount += 1
  else if (state === 'absent') summary.absentCount += 1
  else summary.unwrittenCount += 1
}

function buildMenu(
  ctx: RowContext, presented: Set<string>, summary: PreferencesSummary
): PreferenceMenuEntry[] {
  const { catalog } = ctx
  const root = catalog.screen('preferences')
  if (root === undefined) return []

  const entries: PreferenceMenuEntry[] = []
  for (const menuRow of root.rows) {
    const menuKey = menuRow.key ?? ''
    const title = (menuRow.title === undefined ? undefined : catalog.text(menuRow.title))
      ?? menuRow.titleText ?? menuKey
    const screens: PreferenceScreenBlock[] = []
    for (const link of MENU_SCREENS[menuKey] ?? []) {
      const block = buildScreen(link, title, ctx, presented, summary)
      if (block !== undefined) screens.push(block)
    }
    const entry: PreferenceMenuEntry = { menuKey, title, screens }
    if (screens.length === 0) {
      const note = MENU_NOTES[menuKey]
      if (note !== undefined) entry.note = note
      const tally = tallyFamilies(ctx, MENU_FAMILIES[menuKey])
      if (tally !== undefined) entry.tally = tally
    }
    entries.push(entry)
  }
  return entries
}

/** Combien de clés de ces familles ce fichier porte, et combien d'entre elles sont nommées. */
function tallyFamilies(
  ctx: RowContext, families: readonly string[] | undefined
): { total: number; labelled: number } | undefined {
  if (families === undefined) return undefined
  let total = 0
  let labelled = 0
  for (const key of ctx.file.keys()) {
    const family = ctx.catalog.preference(key)?.family
    if (family === undefined || !families.includes(family)) continue
    total += 1
    if (isPresentable(ctx.catalog, key)) labelled += 1
  }
  return total === 0 ? undefined : { total, labelled }
}

/** Le titre de la ligne qui ouvre un écran, cherchée dans tous les écrans du catalogue. */
function openerTitle(catalog: PreferenceCatalog, key: string | undefined): string | undefined {
  if (key === undefined) return undefined
  for (const screen of catalog.screens) {
    for (const row of screen.rows) {
      if (row.key !== key) continue
      const translated = row.title === undefined ? undefined : catalog.text(row.title)
      const found = translated ?? row.titleText
      if (found !== undefined) return found
    }
  }
  return undefined
}

function buildScreen(
  link: ScreenLink, menuTitle: string, ctx: RowContext,
  presented: Set<string>, summary: PreferencesSummary
): PreferenceScreenBlock | undefined {
  const { catalog } = ctx
  const screenId = link.id
  const screen = catalog.screen(screenId)
  if (screen === undefined) return undefined

  const title = (screen.title === null ? undefined : catalog.text(screen.title))
    ?? openerTitle(catalog, link.via) ?? menuTitle
  const blocks: PreferenceCategoryBlock[] = [{ rows: [] }]
  let neverExported = 0

  for (const line of screen.rows) {
    if (line.tag === 'PreferenceCategory') {
      const heading = (line.title === undefined ? undefined : catalog.text(line.title))
        ?? line.titleText
      blocks.push(heading === undefined ? { rows: [] } : { title: heading, rows: [] })
      continue
    }
    const key = line.key
    if (key === undefined || !isPresentable(catalog, key)) continue
    if (presented.has(key)) continue
    presented.add(key)

    // Une clé que l'export ne porte jamais ne s'affiche pas comme « absente » : elle
    // n'a aucune raison d'être là, et la compter parmi les manques serait faux.
    if (!catalog.isExported(key) && !ctx.file.has(key)) {
      neverExported += 1
      summary.neverExportedCount += 1
      continue
    }

    const row = buildRow(key, ctx)
    const block = blocks[blocks.length - 1]
    if (block !== undefined) block.rows.push(row)
    summary.presentedCount += 1
    countState(summary, row.state)
  }

  const kept = blocks.filter((block) => block.rows.length > 0)
  if (kept.length === 0 && neverExported === 0) return undefined
  return { id: screenId, title, blocks: kept, neverExported }
}

/**
 * Ce que le fichier porte et qu'aucun écran n'a montré. Dans l'ordre du fichier, parce
 * que c'est le seul ordre dont on soit sûr pour des clés que le catalogue ne classe pas.
 */
function buildLeftovers(
  ctx: RowContext, presented: Set<string>, summary: PreferencesSummary
): PreferenceRow[] {
  const rows: PreferenceRow[] = []
  for (const [key, node] of ctx.file) {
    if (presented.has(key)) continue
    const row = buildRow(key, ctx)
    row.reason = leftoverReason(ctx.catalog, key, node)
    if (row.reason === 'unknown') summary.unknownCount += 1
    else if (row.reason === 'state') summary.stateCount += 1
    else summary.unlabelledCount += 1
    rows.push(row)
  }
  return rows
}

/**
 * Pourquoi cette clé-là n'a pas trouvé sa place dans un écran.
 *
 * L'ordre des questions n'est pas indifférent. « Le catalogue ne la connaît pas » est le
 * fait le plus important — c'est un fichier d'une autre version — et il passe avant la
 * forme de la valeur. Ensuite c'est **le type JSON du fichier qui tranche**, et non le
 * catalogue : `Mapsforge.Terrain` est déclarée `json` mais porte la chaîne `"None"` dans
 * les deux fichiers du corpus, et l'afficher comme de l'état sérialisé serait faux.
 */
function leftoverReason(
  catalog: PreferenceCatalog, key: string, node: JsonNode
): LeftoverReason {
  if (!catalog.knows(key)) return 'unknown'
  if (node.kind === 'object' || node.kind === 'array') return 'state'
  return 'unlabelled'
}

/* ------------------------------------------------------------------------------ le rendu */

export interface PreferencesPageOptions {
  /**
   * Le document ouvert, tel que `openContainer` le rend.
   *
   * Sans `onEdit`, il n'est que **lu**. Avec, la page y écrit — par `writePreference`,
   * donc en ne touchant que le nœud de la clé réglée.
   */
  document: JsonNode
  /** Le catalogue déjà chargé, dans la langue voulue. Voir `openPreferencesPage`. */
  catalog: PreferenceCatalog
  /** Le nom du fichier, pour la tête de page. */
  fileName?: string
  /** `info.versionName` du fichier, pour dire d'où il vient. */
  fileVersionName?: string
  /** `info.versionCode` du fichier — il ne sert qu'à situer, jamais à filtrer. */
  fileVersionCode?: number
  /**
   * Branché sur le bouton « Fermer ». Sans lui, aucun bouton n'est construit : c'est
   * l'assembleur qui décide si la page se ferme, et comment.
   */
  onClose?: () => void
  /**
   * **Branché : la page devient modifiable.** Absent : elle reste ce qu'elle était, une
   * lecture sans le moindre contrôle de formulaire.
   *
   * Appelé après chaque écriture effective — jamais pour une valeur reposée à
   * l'identique. L'assembleur y enregistre le pas d'historique et marque le document ;
   * la page, elle, a déjà écrit et remis ses comptes à jour.
   */
  onEdit?: (edit: PreferenceEdit) => void
}

export interface PreferencesPage {
  element: HTMLElement
  summary: PreferencesSummary
  inventory: PreferenceInventory
  /** Vrai si la page construit des contrôles — c'est-à-dire si `onEdit` était branché. */
  editable: boolean
  /** Filtre les lignes affichées, sur le libellé et sur la clé. Chaîne vide : tout. */
  filter: (query: string) => void
  /** Retire la page du document et appelle `onClose`. Sans effet si déjà fermée. */
  close: () => void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = window.document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Minuscules sans accents : « unité » doit trouver « Unités ». */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function plural(count: number, singular: string, many: string): string {
  return `${formatCount(count)} ${count > 1 ? many : singular}`
}

/** Ce que la marque d'état dit, en toutes lettres. */
export function stateLabel(row: PreferenceRow): string {
  if (row.state === 'custom') {
    return row.defaultText === undefined ? 'réglé' : `≠ défaut ${row.defaultText}`
  }
  if (row.state === 'default') return '= défaut'
  if (row.state === 'conflict') {
    // Les deux défauts à l'écran, et pas seulement dans l'infobulle : XCTrack se
    // contredit, cet éditeur ne tranche pas à sa place et le montre.
    return `défauts contradictoires ${row.defaultText ?? '?'} / ${row.otherDefaultText ?? '?'}`
  }
  if (row.state === 'absent') return 'absente du fichier'
  if (row.state === 'unwritten') return 'jamais écrite'
  return 'rien à comparer'
}

/** L'infobulle de la marque d'état : la phrase entière, pas l'abrégé. */
function stateTitle(row: PreferenceRow): string {
  if (row.state === 'custom') {
    return row.defaultText === undefined
      ? 'Cette valeur diffère de ce que XCTrack applique par défaut.'
      : `Par défaut, XCTrack applique « ${row.defaultText} ».`
  }
  if (row.state === 'default') return 'Valeur inchangée : c’est le défaut de XCTrack.'
  if (row.state === 'conflict') {
    return `XCTrack publie deux défauts contradictoires pour cette clé : ` +
      `« ${row.defaultText ?? '?'} » dans son code et « ${row.otherDefaultText ?? '?'} » dans ` +
      `son écran de réglages. Cet éditeur ne choisit pas : la valeur du fichier fait foi, ` +
      `et la comparaison est suspendue.`
  }
  if (row.state === 'absent') {
    return row.defaultText === undefined
      ? 'Cette clé n’est pas dans le fichier : XCTrack appliquera son défaut. Ce n’est pas la même chose qu’une valeur réglée.'
      : `Cette clé n’est pas dans le fichier : XCTrack appliquera son défaut, « ${row.defaultText} ». ` +
        'Ce n’est pas la même chose qu’une valeur réglée à cette valeur.'
  }
  if (row.state === 'unwritten') {
    return 'Cette clé n’est pas dans le fichier, et XCTrack ne l’y écrit qu’une fois réglée ' +
      'au moins une fois sur l’appareil : son absence ne dit même pas quel défaut s’appliquera.'
  }
  return row.undecidableReason ?? 'Aucune valeur par défaut connue pour cette clé.'
}

/*
 * Le vocabulaire — les mots de chaque nature, ceux de chaque base — vient de
 * `model/personalData.ts`, comme pour la bibliothèque, la boîte de partage et
 * l'avertissement d'export. Il était écrit ici ; le recopier ailleurs aurait fait dire
 * « identité » à un écran et « pilote » à un autre pour la même clé.
 */

/** La marque discrète qui signale une donnée personnelle. Sobre : le pilote décide. */
function personalMark(personal: PersonalData): HTMLElement {
  const mark = el('span', 'prefs__personal', PERSONAL_KIND_LABELS[personal.kind])
  mark.title = `Donnée personnelle — ${personal.reason} (${PERSONAL_BASIS_LABELS[personal.basis]}).`
  return mark
}

interface RenderedRow {
  element: HTMLElement
  haystack: string
  row: PreferenceRow
}

/**
 * Ce que le rendu d'une ligne a besoin de savoir. `edit` absent : la page est en lecture
 * seule et aucun contrôle n'est construit — voir l'en-tête de ce module.
 */
interface PageContext {
  collected: RenderedRow[]
  edit?: EditContext
}

/** Ce qu'il faut pour écrire, et pour dire à la page ce qui vient d'être écrit. */
interface EditContext {
  document: JsonNode
  catalog: PreferenceCatalog
  conflicts: Set<string>
  onEdit: (edit: PreferenceEdit) => void
  /** Rappelé après chaque écriture effective : bandeau, confidentialité, entrées masquées. */
  wrote: (row: PreferenceRow, previous: PreferenceState, edit: PreferenceEdit) => void
  /** Les champs de saisie qui portent une donnée personnelle, pour le masquage. */
  secrets: HTMLInputElement[]
}

/** Un identifiant unique par contrôle : `label.htmlFor` doit désigner quelque chose. */
let controlSeq = 0

/** La valeur en texte, telle que la page en lecture seule la montre. */
function readOnlyValue(row: PreferenceRow): HTMLElement {
  const value = el('span', 'prefs__value', row.value ?? '—')
  if (row.value === undefined) value.classList.add('prefs__value--none')
  if (row.structured) value.classList.add('prefs__value--structured')
  if (row.personal !== undefined && row.value !== undefined && !row.structured) {
    // Le masquage ne retire jamais l'information : il la remplace à l'écran, et la
    // valeur reste dans l'attribut, donc dans le presse-papier et dans les tests.
    value.classList.add('prefs__value--secret')
    value.dataset.clear = row.value
  }
  return value
}

/** Le nœud que la section `preferences` porte aujourd'hui pour cette clé. */
function currentNode(document: JsonNode, key: string): JsonNode | undefined {
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') return undefined
  return getMember(section, key)
}

/**
 * Remet la ligne d'accord avec ce qui vient d'être écrit : la valeur en toutes lettres,
 * son texte source, et l'état — les six états d'origine, recalculés par le même chemin
 * que `buildRow`, jamais par un raccourci qui divergerait.
 */
function restate(
  row: PreferenceRow, text: string, asString: boolean,
  entry: PreferenceEntry, ctx: EditContext
): void {
  const node: JsonNode = asString
    ? { kind: 'string', raw: encode(text) }
    : { kind: 'literal', raw: text }
  row.value = readableValue(node, entry, ctx.catalog, row.key)
  row.raw = node.raw
  if (ctx.conflicts.has(row.key) && entry.default !== undefined && entry.xmlDefault !== undefined) {
    row.state = 'conflict'
    return
  }
  if (entry.defaultSource === 'runtime' || entry.default === undefined) {
    row.state = 'undecidable'
    return
  }
  row.state = sameAsDefault(text, entry.default) ? 'default' : 'custom'
}

function buildRowElement(row: PreferenceRow, ctx: PageContext): HTMLElement {
  const element = el('div', 'prefs__row')
  element.dataset.key = row.key
  element.dataset.state = row.state
  if (row.control !== null) element.dataset.control = row.control
  if (!row.labelled) element.dataset.unlabelled = 'true'
  if (row.personal !== undefined) element.dataset.personal = row.personal.kind

  const entry = ctx.edit?.catalog.preference(row.key)
  const refusal = editRefusal(row)
  const settable = ctx.edit !== undefined && refusal === undefined && entry !== undefined
  const id = `prefs-field-${String(++controlSeq)}`

  const label = el(settable ? 'label' : 'span', 'prefs__label', row.label)
  label.title = row.key
  if (settable) (label as HTMLLabelElement).htmlFor = id
  element.append(label)

  const cell = el('span', 'prefs__cell')
  element.append(cell)

  // Sur une clé d'une autre version ou sur de l'état sérialisé, « rien à comparer » se
  // répéterait à chaque ligne pour redire ce que le titre du bloc dit déjà une fois. La
  // colonne reste, vide : l'alignement des lignes voisines ne bouge pas.
  const mute = row.reason === 'unknown' || row.reason === 'state'
  const state = el('span', `prefs__state prefs__state--${row.state}`, mute ? '' : stateLabel(row))
  if (!mute) state.title = stateTitle(row)
  element.append(state)

  const rendered: RenderedRow = {
    element,
    haystack: normalize(`${row.label} ${row.key} ${row.value ?? ''}`),
    row
  }

  function refreshState(): void {
    element.dataset.state = row.state
    state.className = `prefs__state prefs__state--${row.state}`
    state.textContent = stateLabel(row)
    state.title = stateTitle(row)
    rendered.haystack = normalize(`${row.label} ${row.key} ${row.value ?? ''}`)
  }

  /**
   * Une écriture demandée par un contrôle. Rend `false` quand rien n'a bougé — reposer
   * une valeur à l'identique n'est pas une modification et ne doit pas en avoir l'air.
   */
  function commit(text: string, continuous: boolean): boolean {
    const context = ctx.edit
    if (context === undefined || entry === undefined) return false
    const asString = writesString(entry, currentNode(context.document, row.key))
    const outcome = writePreference(context.document, row.key, text, asString)
    if (outcome === 'unchanged') return false

    const previous = row.state
    restate(row, text, asString, entry, context)
    refreshState()

    const edit: PreferenceEdit = {
      key: row.key,
      label: row.label,
      outcome,
      text,
      description: outcome === 'inserted'
        ? `Écrire ${row.label} dans le fichier`
        : `Régler ${row.label}`,
      continuous
    }
    if (row.personal !== undefined && text.trim() !== '') edit.personal = row.personal
    context.onEdit(edit)
    context.wrote(row, previous, edit)
    return true
  }

  function fillCell(): void {
    cell.textContent = ''
    const context = ctx.edit
    if (!settable || context === undefined || entry === undefined) {
      cell.append(readOnlyValue(row))
      return
    }
    if (row.state === 'absent' || row.state === 'unwritten') {
      cell.append(buildAdoptButton(row, entry, () => {
        // La clé vient d'entrer dans le fichier : la ligne devient une ligne comme les
        // autres, contrôle compris.
        fillCell()
        const first = cell.querySelector<HTMLElement>('input, select')
        first?.focus()
      }, commit))
      return
    }
    cell.append(buildField(row, entry, id, context, commit))
  }

  fillCell()

  if (row.personal !== undefined) element.append(personalMark(row.personal))
  if (row.help !== undefined) element.append(el('p', 'prefs__help', row.help))

  // Une ligne qui ne se règle pas dans une page qui se règle doit dire pourquoi — mais
  // **une fois par bloc**, pas quinze fois de suite : l'écran des touches en compte
  // quinze d'affilée, et la même phrase répétée quinze fois chasse les réglages de
  // l'écran sans rien apprendre de plus. Le bloc porte la phrase (voir `refusalNote`),
  // la ligne porte la marque et l'infobulle.
  if (refusal !== undefined && ctx.edit !== undefined) {
    element.dataset.settable = 'false'
    cell.title = refusal
  }

  ctx.collected.push(rendered)
  return element
}

/**
 * Le bouton d'une clé absente. Il ne préremplit rien : il **écrit**, à la valeur du
 * relevé, et son infobulle dit ce que ça change et ce que ça ne change pas.
 */
function buildAdoptButton(
  row: PreferenceRow, entry: PreferenceEntry,
  done: () => void, commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const seed = entry.defaultSource === 'runtime' ? undefined : entry.default
  if (seed === undefined) {
    const note = el('span', 'prefs__value prefs__value--none', 'pas de valeur de départ')
    note.title = row.undecidableReason ??
      'Le catalogue ne relève aucune valeur par défaut écrivable pour cette clé : ' +
      'cet éditeur n’a rien avec quoi la créer.'
    return note
  }

  const button = el('button', 'btn prefs__adopt', 'Écrire cette clé')
  button.type = 'button'
  button.title =
    `Ajoute « ${row.key} » au fichier, à la valeur ${row.defaultText ?? String(seed)}. ` +
    'Attention : XCTrack applique déjà ce défaut aujourd’hui — écrire la clé change donc ' +
    'le fichier sans changer le comportement de l’appareil. Ce n’est utile que si vous ' +
    'voulez ensuite lui donner une autre valeur.'
  button.addEventListener('click', () => {
    if (commit(typeof seed === 'string' ? seed : String(seed), false)) done()
  })
  return button
}

/** Le contrôle d'une ligne qui se règle, choisi sur le type que XCTrack affiche. */
function buildField(
  row: PreferenceRow, entry: PreferenceEntry, id: string, ctx: EditContext,
  commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const text = row.raw === undefined
    ? ''
    : (row.raw.startsWith('"') ? decode(row.raw) : row.raw)

  if (entry.control === 'checkbox') return buildCheckbox(id, text, commit)
  if (entry.control === 'color') return buildColorField(id, text, commit)
  if (entry.control === 'slider' || entry.control === 'number') {
    return buildNumberField(id, text, entry, commit)
  }
  if (entry.control === 'list') {
    const choices = ctx.catalog.values(row.key)
    // ⚠️ Les huit `Unit.*` et les deux listes de voile n'ont **aucun domaine relevé** :
    // XCTrack les remplit en code. Une liste vide serait un piège, une liste inventée
    // serait pire — un champ texte est la seule chose honnête tant qu'on ne les a pas
    // extraites du bytecode.
    if (choices.length === 0) return buildTextField(id, text, row, ctx, commit, true)
    return buildSelect(id, text, choices, commit)
  }
  return buildTextField(id, text, row, ctx, commit, false)
}

function buildCheckbox(
  id: string, text: string, commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const box = el('input', 'prefs__checkbox')
  box.type = 'checkbox'
  box.id = id
  box.checked = text === 'true'
  box.addEventListener('change', () => { commit(box.checked ? 'true' : 'false', false) })
  return box
}

function buildSelect(
  id: string, text: string, choices: readonly { value: string; label: string }[],
  commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const select = el('select', 'prefs__select')
  select.id = id
  for (const choice of choices) {
    const option = el('option', undefined, choice.label)
    option.value = choice.value
    select.append(option)
  }
  // Une valeur que le catalogue ne propose pas — vestige, ou version plus récente que
  // l'extraction — s'ajoute à la liste plutôt que de se faire remplacer en silence.
  if (!choices.some((choice) => choice.value === text)) {
    const extra = el('option', undefined, `${text} (hors catalogue)`)
    extra.value = text
    select.prepend(extra)
  }
  select.value = text
  select.addEventListener('change', () => { commit(select.value, false) })
  return select
}

/**
 * Un nombre. Curseur quand les bornes sont relevées, champ numérique sinon.
 *
 * Le texte envoyé à l'écriture est celui du contrôle, jamais un `Number` reformaté :
 * c'est lui qui ira dans le fichier.
 */
function buildNumberField(
  id: string, text: string, entry: PreferenceEntry,
  commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const bounded = entry.control === 'slider' && entry.min !== undefined && entry.max !== undefined
  const wrap = el('span', 'prefs__number-wrap')
  const input = el('input', bounded ? 'prefs__slider' : 'prefs__number')
  input.type = bounded ? 'range' : 'number'
  input.id = id
  if (entry.min !== undefined) input.min = String(entry.min)
  if (entry.max !== undefined) input.max = String(entry.max)
  // Un pas déduit du nombre de décimales relevé : `Sensors.ManualQnh` se règle au
  // dixième d'hectopascal sur l'appareil, et un pas entier interdirait 1018,8.
  input.step = entry.decimals === undefined || entry.decimals === 0
    ? '1'
    : String(1 / 10 ** entry.decimals)
  input.value = text

  const readout = el('output', 'prefs__readout')
  readout.htmlFor = id
  const unit = entry.unit === undefined ? '' : entry.unit.trim()
  const show = (): void => { readout.textContent = unit === '' ? input.value : `${input.value} ${unit}` }
  show()

  input.addEventListener('input', () => {
    const next = input.value.trim()
    if (next === '' || !Number.isFinite(Number(next))) return
    commit(next, true)
    show()
  })
  wrap.append(input)
  if (bounded) wrap.append(readout)
  return wrap
}

function buildTextField(
  id: string, text: string, row: PreferenceRow, ctx: EditContext,
  commit: (text: string, continuous: boolean) => boolean, freeList: boolean
): HTMLElement {
  const input = el('input', 'prefs__text')
  input.type = 'text'
  input.id = id
  input.value = text
  input.spellcheck = false
  if (freeList) {
    input.title =
      'XCTrack remplit cette liste en code : son domaine n’est pas relevé, et cet éditeur ' +
      'ne propose donc pas de choix. La valeur est écrite telle que vous la saisissez.'
  }
  input.addEventListener('change', () => { commit(input.value, false) })
  if (row.personal !== undefined) {
    input.classList.add('prefs__text--secret')
    ctx.secrets.push(input)
  }
  return input
}

/**
 * Le champ `#AARRGGBB`, comme le panneau des gadgets. Pas d'`<input type="color">` : il
 * ignore la composante alpha, que XCTrack utilise.
 *
 * ⚠️ Les deux conversions sont recopiées de `properties.ts` plutôt qu'importées : ce
 * module-là ouvre le catalogue d'options des gadgets par un `await` de premier niveau, et
 * l'importer ici ferait télécharger quatre cents kilo-octets à qui n'ouvre que les
 * réglages. Elles tiennent en quatre lignes et ont leurs tests des deux côtés.
 */
export function colorTextToHex(raw: string): string | undefined {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff) return undefined
  return `#${(value >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}

/** Inverse de `colorTextToHex`. Accepte `#AARRGGBB` et `#RRGGBB` (alpha implicite `FF`). */
export function hexToColorText(hex: string): string | undefined {
  const digits = hex.replace(/^#/, '').toUpperCase()
  if (!/^[0-9A-F]{6}$|^[0-9A-F]{8}$/.test(digits)) return undefined
  const full = digits.length === 6 ? `FF${digits}` : digits
  return String(parseInt(full, 16) | 0)
}

function buildColorField(
  id: string, text: string, commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const wrap = el('span', 'prefs__color')
  const input = el('input', 'prefs__hex')
  input.type = 'text'
  input.id = id
  input.spellcheck = false
  const swatch = el('span', 'prefs__swatch')
  swatch.setAttribute('aria-hidden', 'true')

  let source = text
  function show(): void {
    const hex = colorTextToHex(source)
    input.value = hex ?? source
    if (hex === undefined) return
    swatch.style.backgroundColor = `#${hex.slice(-6)}`
    swatch.style.opacity = String(parseInt(hex.slice(1, 3), 16) / 255)
  }
  show()

  input.addEventListener('change', () => {
    const literal = hexToColorText(input.value)
    // Saisie invalide : on remet ce que le fichier contient, sans rien écrire.
    if (literal === undefined) { show(); return }
    if (commit(literal, false)) source = literal
    show()
  })

  wrap.append(input, swatch)
  return wrap
}

/**
 * Le bandeau de tête : ce que le fichier porte, et ce que la page en fait.
 *
 * C'est le seul endroit qui donne le sens de la lecture. Il dit trois choses que rien
 * d'autre ne dit : combien de réglages le pilote a changés, combien de clés la page ne
 * sait pas présenter, et de quelle version le catalogue parle face à celle du fichier.
 */
function buildSummaryBox(
  inventory: PreferenceInventory, options: PreferencesPageOptions
): HTMLElement {
  const box = el('div', 'prefs__summary')
  fillSummaryBox(box, inventory, options)
  return box
}

/**
 * Réécrit le bandeau depuis les comptes courants. Séparé de sa construction parce qu'une
 * écriture change les comptes : un réglage qui passe de « au défaut » à « réglé » doit
 * bouger la première ligne de la page, sinon le bandeau ment dès la première modification.
 */
function fillSummaryBox(
  box: HTMLElement, inventory: PreferenceInventory, options: PreferencesPageOptions
): void {
  const { summary } = inventory
  box.textContent = ''
  box.dataset.custom = String(summary.customCount)
  box.dataset.presented = String(summary.presentedCount)

  box.append(el('p', 'prefs__summary-count',
    `${plural(summary.customCount, 'réglage réglé par le pilote', 'réglages réglés par le pilote')} ` +
    `sur ${plural(summary.presentedCount, 'présenté', 'présentés')} ` +
    `— le fichier porte ${plural(summary.fileKeyCount, 'clé', 'clés')}.`))

  const parts: string[] = []
  if (summary.defaultCount > 0) parts.push(`${formatCount(summary.defaultCount)} au défaut`)
  if (summary.absentCount > 0) {
    parts.push(`${formatCount(summary.absentCount)} absente${summary.absentCount > 1 ? 's' : ''} du fichier`)
  }
  if (summary.unwrittenCount > 0) {
    parts.push(`${formatCount(summary.unwrittenCount)} jamais écrite${summary.unwrittenCount > 1 ? 's' : ''}`)
  }
  if (summary.undecidableCount > 0) parts.push(`${formatCount(summary.undecidableCount)} sans défaut connu`)
  if (summary.conflictCount > 0) {
    parts.push(`${formatCount(summary.conflictCount)} au défaut contradictoire`)
  }
  if (parts.length > 0) box.append(el('p', 'prefs__summary-detail', `${parts.join(', ')}.`))

  const rest: string[] = []
  if (summary.unlabelledCount > 0) {
    rest.push(`${formatCount(summary.unlabelledCount)} sans libellé dans l’application`)
  }
  if (summary.stateCount > 0) rest.push(`${formatCount(summary.stateCount)} d’état sérialisé`)
  if (summary.unknownCount > 0) {
    rest.push(`${formatCount(summary.unknownCount)} inconnue${summary.unknownCount > 1 ? 's' : ''} de ce catalogue`)
  }
  if (rest.length > 0) {
    box.append(el('p', 'prefs__summary-detail',
      `${plural(summary.unlabelledCount + summary.stateCount + summary.unknownCount, 'clé du fichier n’est pas présentée', 'clés du fichier ne sont pas présentées')} ` +
      `dans un écran : ${rest.join(', ')}. Elles sont toutes listées en fin de page.`))
  }

  box.append(el('p', 'prefs__summary-note', catalogNote(options)))
}

/**
 * D'où vient ce que la page affirme, et ce que ça vaut face à ce fichier-ci.
 *
 * On ne masque jamais la comparaison quand les versions divergent — la plupart des clés
 * ne bougent pas d'une version à l'autre. On ne la donne pas non plus pour une preuve.
 */
function catalogNote(options: PreferencesPageOptions): string {
  const { catalog } = options
  const reference = `Libellés et valeurs par défaut extraits de XCTrack ` +
    `${catalog.meta.versionName ?? '?'} (versionCode ${String(catalog.meta.versionCode ?? 0)})`
  const fallback = catalog.fallbackStringCount === 0
    ? ''
    : ` ${formatCount(catalog.fallbackStringCount)} textes manquent dans cette langue et sont ` +
      `affichés en anglais.`

  if (options.fileVersionCode === undefined) {
    return `${reference}. Ce fichier ne dit pas de quelle version il vient : les libellés ` +
      `et les défauts changent d’une version à l’autre, la lecture est donc indicative.${fallback}`
  }
  if (options.fileVersionCode === catalog.meta.versionCode) {
    return `${reference} — la version même de ce fichier.${fallback}`
  }
  const name = options.fileVersionName
  const which = name === undefined
    ? `la version ${String(options.fileVersionCode)}`
    : `la version ${name} (versionCode ${String(options.fileVersionCode)})`
  return `${reference}. Ce fichier vient de ${which} : les libellés et les défauts changent ` +
    `d’une version à l’autre, la lecture est donc indicative.${fallback}`
}

/**
 * Ce que le pilote a besoin de savoir avant de transmettre ce fichier.
 *
 * Sobrement, sans alarmisme : il décide, il a seulement besoin de savoir. Trois faits que
 * rien d'autre ne dit, et dont deux ne se voient pas dans le fichier — ce qui est
 * précisément pourquoi il faut les écrire.
 */
function buildPrivacyBox(inventory: PreferenceInventory, catalog: PreferenceCatalog): HTMLElement {
  const box = el('details', 'prefs__privacy')
  box.dataset.count = String(inventory.summary.personalCount)

  const counts = inventory.summary.personalCounts

  const head = el('summary', 'prefs__privacy-head')
  head.textContent = counts.preferences === 0
    ? 'Aucune donnée personnelle repérée dans les préférences de ce fichier'
    : `${plural(counts.preferences, 'clé de préférences porte', 'clés de préférences portent')} ` +
      `une donnée personnelle · ${String(counts.filled - counts.layout)} renseignées, ` +
      `${String(counts.preferences - (counts.filled - counts.layout))} vides`
  box.append(head)

  const body = el('div', 'prefs__privacy-body')

  // **Ce que cette page ne compte pas, dit ici.** Un écran de réglages n'a pas à montrer
  // ce qu'une boîte de partage montre — mais taire l'existence de l'autre moitié fait
  // lire « 16 » comme « tout ». Les textes des gadgets sont les seuls qui survivent à un
  // export « pages » : c'est le chiffre qui décide de ce qu'on peut envoyer.
  body.append(el('p', 'prefs__privacy-note',
    counts.layout === 0
      ? 'Cette page ne compte que les préférences. La disposition de ce fichier ne porte ' +
        'aucun texte écrit par vous — c’est la boîte « Enregistrer » qui les inventorie, ' +
        'et ce sont les seuls qui partiraient avec un export « pages ».'
      : `Cette page ne compte que les préférences. La disposition en porte ` +
        `${plural(counts.layout, 'de plus', 'de plus')} — des textes écrits par vous dans ` +
        `les gadgets — et ce sont les seuls qui partent avec un export « pages ». La boîte ` +
        `« Enregistrer » les montre un par un.`))

  if (counts.preferences > 0) {
    const list = el('ul', 'prefs__privacy-list')
    for (const row of inventory.personal) {
      const item = el('li', 'prefs__privacy-item')
      item.append(el('span', 'prefs__privacy-key', row.key))
      item.append(el('span', 'prefs__privacy-why',
        `${PERSONAL_KIND_LABELS[row.personal?.kind ?? 'identity']} — ${row.personal?.reason ?? ''}`))
      list.append(item)
    }
    body.append(list)
  }

  const navigation = inventory.personal.find((row) => row.key === 'Navigation.State')
  if (navigation !== undefined) {
    body.append(el('p', 'prefs__privacy-note',
      `« Navigation.State » est une préférence publique de XCTrack : elle voyage avec le ` +
      `fichier. Elle porte la tâche en cours — points de virage et coordonnées — soit ` +
      `${navigation.value ?? 'une structure'} ici. Cette page n’en montre jamais le contenu ; ` +
      `un fichier transmis, lui, l’emporte.`))
  }

  // Deux faits sur des clés qu'aucun fichier ne porte : leur absence est justement ce
  // qui mérite d'être dit, puisque rien à l'écran ne peut la faire deviner.
  if (catalog.knows('App.GuessLatitude')) {
    body.append(el('p', 'prefs__privacy-note',
      `XCTrack garde aussi une position présumée de l’appareil ` +
      `(« App.GuessLatitude », « App.GuessLongitude ») — en pratique le domicile. Elles sont ` +
      `internes à l’appareil : aucun export ne les porte, et ce fichier ne les porte pas.`))
  }
  if (SECURE_PERSONAL_KEYS.length > 0) {
    body.append(el('p', 'prefs__privacy-note',
      `XCTrack chiffre les identifiants de compte (XContest, SkySight, SafeSky…) : les ` +
      `${formatCount(SECURE_PERSONAL_KEYS.length)} clés concernées ne sortent jamais de ` +
      `l’appareil, et aucun export n’en porte.`))
  }

  // La conséquence, qui n'est pas une évidence : les seules clés dont XCTrack déclare
  // lui-même le caractère sensible sont celles qui ne sortent jamais. Tout ce qu'un
  // fichier réel porte de personnel relève donc d'un jugement de cet éditeur — et chaque
  // ligne ci-dessus porte le sien.
  if (counts.judged > 0 && counts.read === 0) {
    body.append(el('p', 'prefs__privacy-note',
      `Aucune des ${formatCount(counts.total)} lignes de ce fichier n’est signalée par ` +
      `XCTrack lui-même : les seules clés dont il déclare la sensibilité sont celles qu’il ` +
      `chiffre, et elles ne sont pas exportées. Ce relevé est donc un jugement de cet ` +
      `éditeur, et chaque ligne dit le sien.`))
  }

  body.append(el('p', 'prefs__privacy-note', PERSONAL_CAVEAT))

  box.append(body)
  return box
}

const LEFTOVER_TITLES: Record<LeftoverReason, string> = {
  unlabelled: 'Réglages sans libellé',
  state: 'État sérialisé, pas des réglages',
  unknown: 'Clés que ce catalogue ne connaît pas'
}

const LEFTOVER_LEADS: Record<LeftoverReason, string> = {
  unlabelled:
    'Ce sont bien des réglages, mais XCTrack les configure dans des écrans construits en ' +
    'code, où la clé n’est plus rattachée à son libellé : l’application ne les nomme nulle ' +
    'part qu’on puisse lire. La valeur et la comparaison au défaut restent justes — c’est ' +
    'le nom qui manque, pas le sens.',
  state:
    'Ces clés ne règlent rien : elles enregistrent l’état de l’application. Cette page en ' +
    'donne la nature et la taille, jamais le contenu.',
  unknown:
    'Cet éditeur ne sait pas ce que ces clés règlent : elles ont été écrites par une autre ' +
    'version de XCTrack que celle dont le catalogue parle. Elles ne sont ni supprimables ni ' +
    'négligeables — simplement inconnues, et conservées telles quelles.'
}

function buildLeftoverSection(
  reason: LeftoverReason, rows: PreferenceRow[], ctx: PageContext
): HTMLElement {
  const section = el('section', 'prefs__leftover')
  section.dataset.reason = reason

  const heading = el('h3', 'prefs__screen-title')
  heading.append(
    el('span', 'prefs__screen-name', LEFTOVER_TITLES[reason]),
    el('span', 'prefs__screen-count', plural(rows.length, 'clé', 'clés'))
  )
  section.append(heading, el('p', 'prefs__lead', LEFTOVER_LEADS[reason]))

  // Les familles, comptées : c'est ce qui rend visible qu'un fichier réel porte
  // 18 clés d'espaces aériens dont une seule est nommée.
  const families = new Map<string, number>()
  for (const row of rows) families.set(row.family, (families.get(row.family) ?? 0) + 1)
  const ranked = [...families].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  if (ranked.length > 1 || (ranked[0]?.[1] ?? 0) > 3) {
    section.append(el('p', 'prefs__families',
      ranked.map(([family, count]) =>
        `${family === '' ? '(sans famille)' : family} : ${formatCount(count)}`).join(' · ')))
  }

  const list = el('div', 'prefs__list')
  for (const row of rows) list.append(buildRowElement(row, ctx))
  section.append(list)
  return section
}

/**
 * Ce qu'il faut dire d'un fichier qui ne porte aucune préférence — la moitié du corpus,
 * et tous les exports `pages`. Un écran vide se lirait comme une panne.
 */
function buildEmptyNote(
  options: PreferencesPageOptions, counts: PersonalCounts
): HTMLElement {
  const box = el('div', 'prefs__empty')
  box.append(el('p', 'prefs__empty-title', 'Ce fichier ne porte aucune préférence générale.'))
  box.append(el('p', 'prefs__empty-text',
    'Seuls les exports « backup » emportent les réglages de l’application. Un export ' +
    '« pages » ne décrit que les pages et leurs gadgets : ouvrir une sauvegarde complète ' +
    'de l’appareil est la seule façon de voir ces réglages-là.'))
  box.append(el('p', 'prefs__empty-text',
    `Rien n’est perdu pour autant : ce que cette page ne montre pas, ce fichier ne le ` +
    `contient pas, et un réexport le laissera tel quel.`))
  // ⚠️ « Pas de préférences » ne veut pas dire « rien de personnel ». Le nom et le numéro
  // d'un bouton d'appel vivent dans la disposition, et un export « pages » les emporte.
  // Laisser la page muette ici, c'est laisser croire le contraire.
  if (counts.layout > 0) {
    box.append(el('p', 'prefs__empty-text prefs__empty-text--warn',
      `Attention : « aucune préférence » ne veut pas dire « rien de personnel ». La ` +
      `disposition de ce fichier porte ${plural(counts.layout, 'texte écrit par vous',
        'textes écrits par vous')} dans ses gadgets — un titre, un nom, un numéro de ` +
      `téléphone —, et un export « pages » les emporte. La boîte « Enregistrer » les ` +
      `montre un par un.`))
  }
  if (options.fileVersionName !== undefined) {
    box.append(el('p', 'prefs__summary-note', catalogNote(options)))
  }
  return box
}

/**
 * Construit la page. Synchrone : le catalogue est déjà là — c'est `openPreferencesPage`
 * qui l'a chargé, ou l'appelant qui le fournit.
 */
export function renderPreferencesPage(options: PreferencesPageOptions): PreferencesPage {
  const inventory = buildPreferenceInventory(options.document, options.catalog)
  const root = el('section', 'prefs')
  // Un fichier sans préférence n'a rien à régler : la page y reste ce qu'elle est, une
  // explication. `onEdit` branché n'y change rien.
  const onEdit = inventory.summary.empty ? undefined : options.onEdit
  const editable = onEdit !== undefined
  // Lisible d'un test ou d'un harnais sans dépendre du style : le mode de la page est une
  // promesse, et une promesse doit se vérifier de l'extérieur.
  root.dataset.mode = editable ? 'edition' : 'lecture'

  const head = el('header', 'prefs__head')
  const titles = el('div', 'prefs__titles')
  // Le menu « Fichier » nomme cette page « Réglages généraux » : un écran et la commande
  // qui l'ouvre doivent porter le même nom, sans quoi le pilote doute d'être au bon endroit.
  titles.append(el('h2', 'prefs__title', 'Réglages généraux'))
  const subtitle = options.fileName === undefined
    ? 'Ce que XCTrack règle hors des pages de gadgets'
    : `${options.fileName} — ce que XCTrack règle hors des pages de gadgets`
  titles.append(el('p', 'prefs__subtitle', subtitle))
  head.append(titles)

  const actions = el('div', 'prefs__actions')
  head.append(actions)
  root.append(head)

  const ctx: PageContext = { collected: [] }

  if (inventory.summary.empty) {
    root.append(buildEmptyNote(options, inventory.summary.personalCounts))
    return finish(root, inventory, ctx, options, actions, editable)
  }

  const summaryBox = buildSummaryBox(inventory, options)
  root.append(summaryBox)
  let privacyBox = buildPrivacyBox(inventory, options.catalog)
  root.append(privacyBox)

  if (onEdit !== undefined) {
    // Ce que le pilote vient de renseigner de personnel, listé au fur et à mesure : une
    // clé qu'on remplit devient quelque chose qui voyage, et c'est le moment de le dire,
    // pas au moment d'envoyer le fichier.
    const filled = el('p', 'prefs__filled')
    filled.hidden = true
    root.insertBefore(filled, privacyBox.nextSibling)
    const written: string[] = []

    ctx.edit = {
      document: options.document,
      catalog: options.catalog,
      conflicts: new Set(options.catalog.meta.defaultConflicts),
      onEdit,
      secrets: [],
      wrote: (row, previous, edit) => {
        recount(inventory.summary, previous, row.state)
        if (edit.outcome === 'inserted') {
          inventory.summary.fileKeyCount = readFilePreferences(options.document).size
        }
        fillSummaryBox(summaryBox, inventory, options)
        if (edit.personal !== undefined || edit.outcome === 'inserted') {
          const open = privacyBox instanceof HTMLDetailsElement && privacyBox.open
          refreshPersonal(inventory, options.document, options.catalog)
          const fresh = buildPrivacyBox(inventory, options.catalog)
          if (open && fresh instanceof HTMLDetailsElement) fresh.open = true
          privacyBox.replaceWith(fresh)
          privacyBox = fresh
        }
        if (edit.personal !== undefined && !written.includes(edit.key)) {
          written.push(edit.key)
          filled.hidden = false
          filled.textContent =
            `Vous venez de renseigner ${plural(written.length, 'donnée personnelle',
              'données personnelles')} — ${written.join(', ')}. ` +
            'Elle voyagera avec ce fichier : la boîte « Enregistrer » vous laisse choisir ' +
            'ce qui part.'
        }
      }
    }
  }

  const menuSection = el('section', 'prefs__menu')
  menuSection.append(el('p', 'prefs__lead', editable
    ? 'Les écrans sont ceux de l’appareil, dans l’ordre de son menu de réglages. Un ' +
      'réglage modifié est écrit dans le document aussitôt ; « Annuler » le défait, et ' +
      'rien ne part sur le disque avant « Enregistrer ».'
    : 'Les écrans sont ceux de l’appareil, dans l’ordre de son menu de réglages.'))
  for (const entry of inventory.menu) menuSection.append(buildMenuElement(entry, ctx))
  root.append(menuSection)

  const reasons: LeftoverReason[] = ['unlabelled', 'state', 'unknown']
  for (const reason of reasons) {
    const rows = inventory.leftovers.filter((row) => row.reason === reason)
    if (rows.length === 0) continue
    root.append(buildLeftoverSection(reason, rows, ctx))
  }

  return finish(root, inventory, ctx, options, actions, editable)
}

/** Un état qui en remplace un autre : le compte suit, sinon le bandeau ment. */
function recount(
  summary: PreferencesSummary, previous: PreferenceState, next: PreferenceState
): void {
  if (previous === next) return
  const field = {
    custom: 'customCount', default: 'defaultCount', undecidable: 'undecidableCount',
    conflict: 'conflictCount', absent: 'absentCount', unwritten: 'unwrittenCount'
  } as const
  summary[field[previous]] -= 1
  summary[field[next]] += 1
}

/** Refait le relevé des données personnelles depuis le document tel qu'il est maintenant. */
function refreshPersonal(
  inventory: PreferenceInventory, document: JsonNode, catalog: PreferenceCatalog
): void {
  const file = readFilePreferences(document)
  const ctx: RowContext = {
    catalog, file, conflicts: new Set(catalog.meta.defaultConflicts)
  }
  inventory.personal = []
  inventory.summary.personalCount = 0
  for (const key of file.keys()) {
    if (catalog.preference(key)?.personal === undefined) continue
    inventory.summary.personalCount += 1
    inventory.personal.push(buildRow(key, ctx))
  }
  inventory.summary.personalCounts = collectPersonalData(document).counts
}

function buildMenuElement(entry: PreferenceMenuEntry, ctx: PageContext): HTMLElement {
  const section = el('section', 'prefs__entry')
  section.dataset.menu = entry.menuKey

  if (entry.screens.length === 0) {
    const line = el('div', 'prefs__entry-quiet')
    line.append(el('span', 'prefs__entry-name', entry.title))
    const note = el('span', 'prefs__entry-note')
    note.append(el('span', 'prefs__entry-why',
      entry.note ?? 'Rien de cet écran n’apparaît dans ce fichier.'))
    if (entry.tally !== undefined) note.append(el('span', 'prefs__entry-tally', tallyText(entry.tally)))
    line.append(note)
    section.append(line)
    return section
  }

  for (const screen of entry.screens) {
    const block = el('section', 'prefs__screen')
    block.dataset.screen = screen.id

    const count = screen.blocks.reduce((total, one) => total + one.rows.length, 0)
    const heading = el('h3', 'prefs__screen-title')
    heading.append(
      el('span', 'prefs__screen-name', screen.title),
      el('span', 'prefs__screen-count', plural(count, 'réglage', 'réglages'))
    )
    block.append(heading)

    for (const group of screen.blocks) {
      if (group.title !== undefined) block.append(el('h4', 'prefs__category', group.title))
      const list = el('div', 'prefs__list')
      for (const row of group.rows) list.append(buildRowElement(row, ctx))
      block.append(list)
      if (ctx.edit !== undefined) {
        for (const note of refusalNotes(group.rows)) block.append(note)
      }
    }

    if (screen.neverExported > 0) {
      block.append(el('p', 'prefs__never',
        `${plural(screen.neverExported, 'réglage de cet écran ne quitte', 'réglages de cet écran ne quittent')} ` +
        `jamais l’appareil : XCTrack ne les exporte pas.`))
    }
    section.append(block)
  }
  return section
}

/**
 * Ce qui, dans ce bloc, ne se règle pas — une phrase par raison, avec son compte.
 *
 * Sur l'écran des touches, quinze lignes de suite portent la même raison : la phrase
 * s'écrit une fois, sous le bloc, comme le fait déjà la note « ne quittent jamais
 * l'appareil ». Chaque ligne garde sa marque (`data-settable="false"`) et son infobulle.
 */
function refusalNotes(rows: readonly PreferenceRow[]): HTMLElement[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const refusal = editRefusal(row)
    if (refusal === undefined) continue
    counts.set(refusal, (counts.get(refusal) ?? 0) + 1)
  }
  return [...counts].map(([reason, count]) =>
    el('p', 'prefs__refusal',
      `${plural(count, 'réglage de ce bloc ne se règle', 'réglages de ce bloc ne se règlent')} ` +
      `pas ici. ${reason}`))
}

/**
 * Le compte qui donne sa mesure au manque : combien de clés ce fichier porte sous cette
 * entrée, et combien d'entre elles la page sait nommer.
 */
export function tallyText(tally: { total: number; labelled: number }): string {
  const carried = `Ce fichier en porte ${plural(tally.total, 'clé', 'clés')}`
  if (tally.labelled === 0) {
    return `${carried} : aucune ne porte de libellé, toutes sont listées en fin de page ` +
      `sous leur nom brut.`
  }
  const rest = tally.total - tally.labelled
  const named = tally.labelled === 1
    ? 'une seule porte un libellé et est affichée dans un autre écran'
    : `${formatCount(tally.labelled)} portent un libellé et sont affichées dans un autre écran`
  return `${carried}, dont ${named} ; ${plural(rest, 'est listée', 'sont listées')} en fin de ` +
    `page sous leur nom brut.`
}

/** Le seuil au-delà duquel un champ de filtrage rend service plutôt que d'encombrer. */
export const FILTER_THRESHOLD = 12

function finish(
  root: HTMLElement, inventory: PreferenceInventory, ctx: PageContext,
  options: PreferencesPageOptions, actions: HTMLElement, editable: boolean
): PreferencesPage {
  const collected = ctx.collected
  let query = ''
  let onlyCustom = false

  function apply(): void {
    const needle = normalize(query.trim())
    for (const row of collected) {
      const missed = needle !== '' && !row.haystack.includes(needle)
      row.element.hidden = missed || (onlyCustom && row.row.state !== 'custom')
    }
  }

  function filter(next: string): void {
    query = next
    apply()
  }

  if (collected.length > FILTER_THRESHOLD) {
    const tools = el('div', 'prefs__tools')

    const search = el('input', 'prefs__filter')
    search.type = 'search'
    search.placeholder = 'Filtrer les réglages'
    search.setAttribute('aria-label', 'Filtrer les réglages')
    search.addEventListener('input', () => { filter(search.value) })
    tools.append(search)

    if (inventory.summary.customCount > 0) {
      const only = el('button', 'btn prefs__only', 'Seulement ce que le pilote a réglé')
      only.type = 'button'
      only.setAttribute('aria-pressed', 'false')
      only.addEventListener('click', () => {
        onlyCustom = only.getAttribute('aria-pressed') !== 'true'
        only.setAttribute('aria-pressed', String(onlyCustom))
        only.textContent = onlyCustom ? 'Tout afficher' : 'Seulement ce que le pilote a réglé'
        apply()
      })
      tools.append(only)
    }

    if (inventory.summary.personalCount > 0) {
      // Utile avant une capture d'écran ou un partage : la page se montre sans les
      // valeurs qui désignent quelqu'un. Rien n'est retiré du fichier, évidemment.
      const mask = el('button', 'btn prefs__mask', 'Masquer les valeurs personnelles')
      mask.type = 'button'
      mask.setAttribute('aria-pressed', 'false')
      mask.addEventListener('click', () => {
        const next = mask.getAttribute('aria-pressed') !== 'true'
        mask.setAttribute('aria-pressed', String(next))
        mask.textContent = next ? 'Montrer les valeurs personnelles' : 'Masquer les valeurs personnelles'
        root.classList.toggle('prefs--masked', next)
        // Une règle de style ne couvre pas le contenu d'un champ de saisie : on bascule
        // le type, ce qui laisse la valeur intacte dans le DOM — comme le fait le
        // masquage du texte, qui la garde dans `data-clear`.
        for (const input of ctx.edit?.secrets ?? []) input.type = next ? 'password' : 'text'
      })
      tools.append(mask)
    }

    root.insertBefore(tools, root.children[1] ?? null)
  }

  let closed = false
  function close(): void {
    if (closed) return
    closed = true
    root.remove()
    options.onClose?.()
  }

  if (options.onClose !== undefined) {
    const button = el('button', 'btn prefs__close', 'Fermer')
    button.type = 'button'
    button.addEventListener('click', close)
    actions.append(button)
  }

  return { element: root, summary: inventory.summary, inventory, editable, filter, close }
}

/* ------------------------------------------------------------- ouverture à la demande */

export interface OpenPreferencesOptions extends Omit<PreferencesPageOptions, 'catalog'> {
  /** La langue de la session, déjà résolue par l'appelant — voir `resolveLanguage`. */
  language: string
}

/**
 * Charge le catalogue puis construit la page.
 *
 * **C'est l'entrée que l'assembleur doit employer**, et il doit l'atteindre par un
 * `import('./preferencesPage')` : ce module importe le catalogue des préférences, dont
 * Vite tire deux morceaux séparés (une part invariante et un fichier par langue) qui ne
 * doivent jamais rejoindre le morceau principal. Un pilote qui n'ouvre jamais cette page
 * ne télécharge ni le module, ni le catalogue.
 *
 * Le poids exact est publié par `PREFERENCES_PAGE_WEIGHT`.
 */
export async function openPreferencesPage(
  options: OpenPreferencesOptions
): Promise<PreferencesPage> {
  const catalog = await loadPreferenceCatalog(options.language)
  return renderPreferencesPage({ ...options, catalog })
}

/**
 * Ce que cette page coûte au réseau — **mesuré** sur `vite build`, pas estimé — pour que
 * l'assembleur sache ce qu'il déclenche et le dise au pilote s'il le juge utile.
 *
 * Quatre morceaux, tous chargés à la demande, aucun dans le morceau principal :
 *
 * | morceau                  |  émis   |  gzip   |
 * |--------------------------|---------|---------|
 * | `preferencesPage-*.js`   | 36,1 Ko | 12,1 Ko |
 * | `preferencesPage-*.css`  |  8,0 Ko |  2,0 Ko |
 * | `preferenceCatalog/base` | 98,8 Ko | 14,8 Ko |
 * | `preferenceCatalog/<lg>` | 24,4 Ko |  6,0 Ko |
 *
 * Soit **167 Ko émis, environ 35 Ko transférés** à la première ouverture, puis 24 Ko de
 * plus par langue supplémentaire — la part invariante ne se retélécharge pas.
 *
 * Le module a pris 9,3 Ko en devenant modifiable : les contrôles, l'écriture et le
 * recalcul des comptes. Ils partent avec le reste, à la demande.
 *
 * ⚠️ Le chiffre du module est un **majorant** : il a été relevé sur un point d'entrée qui
 * n'importe rien d'autre, donc il emporte `core/access`, `core/serializeJson` et
 * `model/preferences`, que le morceau principal de l'éditeur porte déjà.
 */
export const PREFERENCES_PAGE_WEIGHT = {
  /** Le module de page, une fois construit. */
  moduleKb: 36.1,
  /** Sa feuille de style, émise à part par Vite. */
  styleKb: 8,
  /** La part invariante du catalogue : préférences, écrans, valeurs, défauts, portées. */
  catalogBaseKb: 98.8,
  /** Le fichier de textes d'une langue, repli anglais déjà fusionné. */
  catalogLanguageKb: 24.4,
  /** Ce que le réseau transporte réellement à la première ouverture, en gzip. */
  transferredKb: 35
} as const
