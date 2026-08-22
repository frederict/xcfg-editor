import {
  decode, encode, getMember, hasMember, insertLiteral, insertString, setLiteral, setString
} from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import { readableName } from '../catalog/widgetNames'
import { loadWidgetOptions, optionsFor, optionsLanguage } from '../catalog/widgetOptions'
import type { WidgetOption, WidgetOptionTexts } from '../catalog/widgetOptions'
import {
  compareToDefault, defaultsFor, defaultsTrust, defaultValueAt, DEFAULTS_VERSION_CODE,
  DEFAULTS_VERSION_NAME, formatDefault, missingDefaultKeys,
  type DefaultState, type DefaultsTrust
} from '../catalog/widgetDefaults'
import {
  makeTranslator, UI_FALLBACK_LANGUAGE, type MessageCatalog, type Translator
} from '../i18n'
import frenchWidgets from '../i18n/messages/fr/widgets'

/**
 * Le panneau de propriétés d'un widget : la description du formulaire, puis son rendu.
 *
 * ## Le formulaire se construit depuis le FICHIER, jamais depuis le catalogue
 *
 * Deux raisons, l'une de fidélité, l'autre de conservation.
 *
 * **Fidélité.** L'ordre des clés dans le fichier est plus proche du panneau natif que
 * l'ordre du catalogue. Vérifiable sur la boussole : le relevé
 * (`docs/reference/edition-native.md`) donne `_border, _bg, _theme, rotation,
 * navigation_target, windStyle, showHeading, showBearing, showBackground` — exactement
 * l'ordre des clés du fichier, alors que le catalogue les déclare dans l'ordre du
 * bytecode (`_bg` avant `_border`, `rotation` en dernier). XCTrack sérialise donc ses
 * widgets dans l'ordre où il les affiche : c'est la meilleure source d'ordre dont on
 * dispose, et elle est gratuite.
 *
 * **Conservation.** Une clé que le catalogue ignore reste éditable, sous son nom brut,
 * avec un contrôle déduit de son type JSON. Le corpus en compte 18 (`showWind`,
 * `nav_use_brackets`, `mapWidget_showTerrain`…) : des vestiges que l'application
 * n'expose plus mais qu'elle relit toujours. Partir du catalogue les ferait disparaître
 * du panneau ; partir du fichier les montre toutes. Rien n'est masqué, rien n'est
 * supprimé à l'écriture.
 *
 * Le catalogue apporte le reste — libellé traduit, texte d'aide, valeurs permises —
 * mais **c'est le type JSON qui tranche** en cas de désaccord : le format gagne des
 * clés et en change à chaque version, et le fichier ouvert est la seule chose dont on
 * soit sûr.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne simule aucune dépendance entre options. Le relevé
 * (`docs/reference/edition-native-exploration.md` § 4.4) en décrit cinq — `rotation`
 * grise `showHeading`, `nav_target = NONE` grise `nav_label`… — mais aucune n'est
 * décrite par les métadonnées de l'APK, et la liste n'est certainement pas complète.
 * Tout reste modifiable : un réglage sans effet est ignoré par XCTrack, une option
 * grisée à tort ne l'est pas.
 *
 * Il n'écrit jamais le document en entier : chaque modification passe par `setLiteral`,
 * `setString` ou — pour une clé que le fichier ne portait pas — `insertLiteral` /
 * `insertString`, qui touchent **une** entrée du nœud d'origine. Une clé qu'on ne touche
 * pas ne change pas d'un octet, y compris son texte source (`3.0` reste `3.0`).
 *
 * ## Ce que le fichier n'écrit pas, et que XCTrack applique quand même
 *
 * Un gadget ne porte pas toujours toutes les clés que le relevé lui connaît : le
 * `WXCAssistant` du fichier de 2026 en ignore quinze. Une clé absente n'est pas un
 * manque à réparer — elle vaut son défaut **de façon implicite**, et le relevé lui-même
 * l'a mesuré : les gadgets qui l'ont produit ont été écrits avec leurs seules huit clés
 * universelles, et l'appareil les a affichés sans broncher.
 *
 * Le panneau les rassemble en fin de liste (`missingDefaults`), avec la valeur que
 * XCTrack applique, et — en édition seulement — le bouton qui l'écrit. Écrire ne change
 * rien au comportement d'aujourd'hui : cela **fige** la valeur, qui cesse de suivre les
 * mises à jour de XCTrack. C'est le seul intérêt du geste, et il est dit en toutes
 * lettres plutôt que laissé à deviner — même parti, mêmes mots que l'écran des
 * préférences (`ui/preferencesPage.ts`, `buildImplicitCell`).
 *
 * **Rien n'est proposé que le relevé ne sache écrire.** Une valeur composée
 * (`rotation`, `mapWidget_scale`, `scrollSettings`) est montrée, jamais offerte à
 * l'écriture : c'est la même frontière que `compareToDefault`, qui rend `unknown` dès
 * qu'elle ne peut plus comparer terme à terme. Écrire une valeur devinée dans une
 * configuration de vol serait le seul vrai risque de cette fonctionnalité.
 *
 * ## Le troisième geste, qui lui n'est pas neutre
 *
 * Écrire une clé absente ne change rien à ce que l'appareil fait aujourd'hui. Rétablir la
 * valeur d'usine d'un réglage que le pilote a **choisi**, si : l'appareil ne se comportera
 * plus pareil en vol. Le geste existe donc — un pilote qui cherche « remettre comme au
 * départ » doit le trouver — mais il ne se présente pas comme l'autre : sa propre ligne
 * sous le réglage, à pleine opacité, les deux valeurs en présence affichées, et
 * l'avertissement de version dans la phrase plutôt que dans l'infobulle. Voir
 * `restorable` et `buildRestoreLine`, et le pendant côté préférences
 * (`ui/preferencesPage.ts`).
 */

/* ========================================================== le traducteur, en attendant */

/**
 * Le traducteur de **notre prose**, avec son repli français — provisoire.
 *
 * Ce module est celui où les deux axes de langue se croisent le plus souvent : la même
 * ligne porte « Rotation du compas », qui vient de l'APK et suit le fichier ouvert
 * (`textsFor`, axe `labels`), et « valeur d'usine inconnue », qui est de nous et suit le
 * choix du pilote (`tr`, axe `ui`). Les deux ne passent jamais par la même porte.
 *
 * Le panneau reçoit son traducteur dans ses options (`PropertiesPanelOptions.tr`) et, pour
 * les seules valeurs d'unité qu'il nomme lui-même, en argument de `buildPropertyForm`.
 * `main.ts` — qui le détient déjà, et qui appartient à un autre lot d'extraction — ne le
 * lui passe pas encore : d'ici là, le repli monte le **catalogue français du domaine
 * `widgets`**, c'est-à-dire exactement les phrases que ce module portait en clair jusqu'ici,
 * et rien de plus. Le comportement est donc celui d'aujourd'hui, au caractère près, et
 * `tests/ui/properties.test.ts` l'épingle.
 *
 * `tr` devient obligatoire — et ces dix lignes disparaissent — le jour où `main.ts` ajoute
 * `tr` à ses appels de `buildPropertyForm` et `renderProperties`.
 */
let inheritedProse: Translator | undefined

function prose(tr: Translator | undefined): Translator {
  if (tr !== undefined) return tr
  inheritedProse ??= makeTranslator(
    UI_FALLBACK_LANGUAGE, frenchWidgets as unknown as MessageCatalog
  )
  return inheritedProse
}

/* ------------------------------------------------------- les textes du catalogue */

/**
 * Les jeux de textes déjà chargés, par langue résolue.
 *
 * `buildPropertyForm` est **synchrone** — `main.ts` l'appelle au milieu d'un rendu — et
 * les libellés arrivent désormais par un `import()` : le panneau ne peut donc lire que
 * les langues déjà là. D'où cette table, et le préchargement ci-dessous.
 */
const loaded = new Map<string, WidgetOptionTexts>()

/**
 * Charge les libellés d'une langue et les rend lisibles par `buildPropertyForm`.
 *
 * Deux appelants : le préchargement de ce module, et la réparation du panneau quand le
 * fichier ouvert déclare une autre langue que celle du navigateur.
 */
export function loadOptionTexts(language: string): Promise<WidgetOptionTexts> {
  const code = optionsLanguage(language)
  const known = loaded.get(code)
  if (known !== undefined) return Promise.resolve(known)
  return loadWidgetOptions(code).then((texts) => {
    loaded.set(code, texts)
    return texts
  })
}

/**
 * Les seules étiquettes régionales que les catalogues portent. Toutes les autres langues
 * y sont indexées par code court.
 *
 * La liste et la réduction qui suit **répètent volontairement** celles de `main.ts`
 * (`REGIONAL_LABEL_CODES`, `catalogLanguage`) : c'est la règle qu'il applique à
 * `navigator.language` avant d'en faire la langue de la session, donc la seule qui
 * permette à ce module de précharger le bon fichier. Elle est copiée plutôt
 * qu'importée parce que `main.ts` importe déjà ce module — l'inverse serait circulaire.
 * Mesuré : sans cette réduction, un navigateur `fr-FR` téléchargeait `en.json` puis
 * `fr.json`, soit 20 Ko pour rien et un panneau refait.
 */
const REGIONAL_CODES = ['zh-TW']

/** La langue que `main.ts` déduira du navigateur, et donc celle qu'il faut précharger. */
function browserLanguage(): string {
  const tag = navigator.language
  if (REGIONAL_CODES.includes(tag)) return tag
  return tag.split('-')[0] ?? tag
}

/**
 * Le catalogue de la langue du navigateur, chargé **pendant** l'import dynamique de ce
 * module.
 *
 * `main.ts` fait `import('./properties')` et n'affiche le panneau qu'une fois la
 * promesse tenue ; un `await` de haut niveau se glisse dans ce temps-là, et son coût
 * est celui d'un morceau de 20 Ko qui part en parallèle du reste. Rien à changer chez
 * l'appelant : c'est la raison d'être de cette construction plutôt que d'une API
 * asynchrone qui aurait remonté jusqu'à `main.ts`.
 *
 * La langue choisie est celle du navigateur, parce que c'est la seule que ce module
 * puisse connaître : `main.ts` calcule la langue de la session à partir du fichier
 * ouvert (`Display.Language`) et ne la lui passe qu'à l'appel. Les deux coïncident
 * pour tout fichier qui ne déclare pas de langue — la moitié du corpus — et pour ceux
 * qui déclarent celle du navigateur. Sinon, voir `repairLanguage`.
 */
const preloaded = await loadOptionTexts(browserLanguage())

/**
 * Les libellés à employer pour une langue demandée : les siens s'ils sont chargés,
 * ceux du navigateur sinon — jamais rien, un panneau muet ne rend service à personne.
 */
function textsFor(language: string): WidgetOptionTexts {
  return loaded.get(optionsLanguage(language)) ?? preloaded
}

/* ------------------------------------------------------------------ description */

/**
 * Le contrôle à présenter. `number` n'existe pas dans le catalogue : c'est ce que
 * devient un curseur dont on ignore les bornes — voir `sliderRange`.
 */
export type FieldControl = 'checkbox' | 'enum' | 'slider' | 'number' | 'color' | 'text' | 'unknown'

export interface FieldChoice {
  /** Ce qui s'écrit dans le fichier (`"ARC"`). */
  value: string
  label: string
}

export interface FieldRange { min: number; max: number }

/** Un contrôle du panneau. */
export interface PropertyField {
  /** La clé du fichier (`windStyle`, `_bg`, `rotation`). */
  key: string
  /** Le sous-champ, pour une clé composite (`rotation` → `value`, `showCompass`). */
  field?: string
  /** Identifiant du contrôle : `windStyle`, ou `rotation.showCompass`. */
  path: string
  /** Libellé affiché, valeur déjà substituée s'il en porte une. */
  label: string
  control: FieldControl
  /** Texte source de la valeur, tel qu'il figure dans le fichier — guillemets compris. */
  raw: string
  /** La valeur lisible : chaîne décodée, ou texte du littéral. */
  text: string
  /** Nature du nœud. C'est elle qui décide entre `setString` et `setLiteral`. */
  valueKind: JsonNode['kind']
  choices: FieldChoice[]
  help?: string
  /**
   * Le gabarit du libellé quand il porte la valeur (« Transparence… : %d%% »), pour
   * que le rendu réécrive l'intitulé quand le curseur bouge.
   */
  labelPattern?: string
  /** Bornes d'un curseur, quand elles sont connues. Sinon : champ numérique libre. */
  range?: FieldRange
  /**
   * Ce que le catalogue sait de plus, quand le libellé affiché est un nom brut : le
   * libellé traduit de la clé composite dont ce champ est un sous-champ. Le rendu le
   * pose en infobulle sur la ligne.
   */
  hint?: string
  /** Faux si la clé est absente du catalogue : le libellé est alors le nom brut. */
  known: boolean
  /** D'où vient l'appariement libellé/clé — `args` est sûr, le reste est déduit. */
  labelFrom?: string
  /** 1 pour un sous-champ subordonné d'une clé composite : il s'affiche en retrait. */
  depth: number
  /** L'objet JSON qui porte la clé : le widget, ou l'objet d'une clé composite. */
  owner: JsonNode
  /**
   * Ce que la valeur du fichier vaut face au relevé des défauts de XCTrack
   * (`catalog/widgetDefaults.ts`). C'est ce qui sépare « le pilote a réglé ceci » de
   * « l'application a écrit cela toute seule », et c'est toute la valeur du panneau de
   * consultation. `unknown` est un état à part entière : voir `DefaultState`.
   */
  defaultState: DefaultState
  /** La valeur du relevé, lisible, quand il en décrit une pour cette clé. */
  defaultText?: string
}

/**
 * Une clé que le relevé décrit et que ce gadget-ci ne porte pas.
 *
 * Elle n'a **pas** de contrôle dans le panneau : elle n'est pas dans le fichier, et un
 * champ prérempli au défaut inviterait à « confirmer » une valeur — le premier geste
 * maladroit écrirait alors une ligne de plus sans rien changer à ce que fait l'appareil.
 * Elle porte donc la valeur que XCTrack applique, et un bouton qui l'écrit si on le lui
 * demande. C'est la décision déjà prise pour les préférences, tenue à l'identique ici.
 */
export interface MissingDefault {
  /** La clé du fichier, telle qu'elle s'écrirait (`windStyle`, `nav_label`). */
  key: string
  /** Libellé traduit du catalogue, ou le nom brut de la clé quand il l'ignore. */
  label: string
  /** Faux si la clé est absente du catalogue : le libellé est alors le nom brut. */
  known: boolean
  help?: string
  /**
   * Le contrôle qu'aurait cette clé une fois écrite. Il ne sert ici qu'à **dire** la
   * valeur dans la langue du pilote — « Oui », « Arc », `#FFFF962D` — jamais à l'éditer.
   */
  control: FieldControl
  choices: FieldChoice[]
  /** La valeur du relevé, formatée comme `PropertyField.defaultText`. */
  defaultText: string
  /**
   * Le texte source qui serait inséré dans le fichier — guillemets compris pour une
   * chaîne. `undefined` quand la valeur relevée est composée : voir `writable`.
   */
  raw?: string
  /** Nature du nœud à insérer. C'est elle qui décide entre `insertString` et `insertLiteral`. */
  valueKind: JsonNode['kind']
  /**
   * Vrai quand cet éditeur sait écrire cette valeur — c'est-à-dire quand elle est simple.
   * Une valeur composée n'est pas offerte : la reconstruire nœud par nœud reviendrait à
   * décider de sa forme, et une forme inventée dans un fichier de vol n'est pas un
   * service qu'on rend.
   */
  writable: boolean
}

export interface PropertyForm {
  className: string
  shortName: string
  /**
   * Le libellé du type de gadget, tel que XCTrack le nomme — « Boussole et vent ». C'est
   * un mot de l'APK, dans la langue du fichier ouvert : il suit l'axe `labels`.
   *
   * Le panneau l'encadre de **notre** phrase — « Gadget : … » —, qui suit l'axe `ui` et
   * vit dans le catalogue (`properties.widgetTitle`). Les deux ne se composent qu'au
   * rendu, et jamais ici : un formulaire construit une fois peut être affiché dans une
   * autre langue d'interface sans être refait.
   */
  label: string
  /** La langue **demandée** par l'appelant : celle de la session, côté `main.ts`. */
  language: string
  /**
   * La langue dans laquelle les libellés ont **réellement** été résolus. Elle ne
   * diffère de `language` que le temps d'un rendu, quand le fichier ouvert déclare une
   * langue que ce module n'avait pas préchargée : `renderProperties` la charge alors et
   * refait le panneau (voir `repairLanguage`).
   */
  textLanguage: string
  fields: PropertyField[]
  /**
   * Longueur du bloc de tête — les clés universelles `_border`, `_bg`, `_theme`. Le
   * panneau natif le termine par un séparateur horizontal (§ 4.1 du relevé). C'est le
   * seul séparateur qu'on sache placer : les autres dépendent de regroupements que
   * l'APK ne décrit nulle part, et qu'on n'invente pas.
   */
  headCount: number
  /** Les clés du fichier que le catalogue ne connaît pas, dans l'ordre du fichier. */
  unknownKeys: string[]
  /* -------------------------------------------- comparaison au relevé des défauts */
  /**
   * Vrai si le relevé (`catalog/widgetDefaults.ts`) décrit ce type de widget. Faux : la
   * comparaison n'a rien à dire, et l'interface le dit plutôt que de tout donner pour
   * personnalisé.
   */
  defaultsKnown: boolean
  /** Nombre de contrôles que le relevé permet de juger — `custom` plus `default`. */
  comparableCount: number
  /** Parmi eux, ceux dont la valeur du fichier diffère du défaut de XCTrack. */
  customizedCount: number
  /**
   * Les clés que le relevé décrit et que ce widget ne porte pas, dans l'ordre du relevé.
   *
   * Ce n'est pas un défaut du fichier : XCTrack applique alors la valeur de son code,
   * sans l'écrire. Le panneau les montre, et l'édition permet de les figer.
   */
  missingDefaults: MissingDefault[]
}

/** Les cinq clés de structure. Elles ne sont pas des réglages : le panneau natif ne les montre pas. */
const STRUCTURE_KEYS = new Set(['CLASS', 'X1', 'Y1', 'X2', 'Y2'])

/** Les trois clés universelles réglables, dans l'ordre où le panneau natif les montre. */
const UNIVERSAL_KEYS = new Set(['_border', '_bg', '_theme'])

/** Sous-champ principal d'une clé composite : il porte le libellé de l'option. */
const MAIN_FIELD = 'value'

/* ---------------------------------------------------------------- déduction du type */

function isBooleanLiteral(raw: string): boolean {
  return raw === 'true' || raw === 'false'
}

function isNumberLiteral(raw: string): boolean {
  return raw !== '' && Number.isFinite(Number(raw))
}

/**
 * Le contrôle qu'impose le type JSON, seul. C'est le repli pour une clé inconnue, et
 * l'arbitre quand le catalogue annonce autre chose que ce que le fichier contient.
 */
function controlFromValue(node: JsonNode): FieldControl {
  if (node.kind === 'string') return 'text'
  if (node.kind === 'literal') {
    if (isBooleanLiteral(node.raw)) return 'checkbox'
    if (isNumberLiteral(node.raw)) return 'number'
  }
  return 'unknown'
}

/**
 * Le contrôle retenu. Le catalogue propose, le type du fichier dispose : un `enum` dont
 * la valeur est un booléen est une case, un `slider` dont la valeur est une chaîne est
 * un champ texte. Un désaccord signale une clé que XCTrack a fait évoluer — la suivre
 * vaut mieux que d'afficher un contrôle qui ne sait pas lire sa propre valeur.
 */
function resolveControl(
  option: WidgetOption | undefined, node: JsonNode, hasChoices: boolean
): FieldControl {
  const byValue = controlFromValue(node)
  if (option === undefined) return byValue
  switch (option.control) {
    case 'enum': return byValue === 'text' && hasChoices ? 'enum' : byValue
    case 'slider': return byValue === 'number' ? 'slider' : byValue
    case 'color': return byValue === 'number' ? 'color' : byValue
    default: return byValue
  }
}

/**
 * Bornes d'un curseur. Le catalogue n'en donne aucune ; la seule qui se lise dans les
 * données est le pourcentage — un libellé en `%d%%` (« Transparence d'arrière-plan :
 * %d%% », « Opacité de la superposition thermique : %d%% ») borne sa valeur à 0–100.
 *
 * Pour tous les autres curseurs — `thermals`, `postponedFloorLimit`, `line_thickness` —
 * inventer une échelle reviendrait à écrêter une valeur légitime au premier glissement.
 * Ils deviennent des champs numériques libres, et le restent tant que personne n'aura
 * relevé leurs bornes sur l'appareil.
 */
function sliderRange(pattern: string | undefined, value: number): FieldRange | undefined {
  if (pattern === undefined || !/%[dsf]\s*%%/.test(pattern)) return undefined
  if (value < 0 || value > 100) return undefined
  return { min: 0, max: 100 }
}

/** Substitue la valeur dans un gabarit de libellé : `%d`, `%s`, `%f`, et `%%` littéral. */
export function applyLabelPattern(pattern: string, value: string): string {
  return pattern.replace(/%[dsf]/, value).replace(/%%/g, '%')
}

/** Le libellé d'un champ pour une valeur donnée — l'intitulé d'un curseur suit sa valeur. */
export function fieldLabel(field: PropertyField, text: string): string {
  return field.labelPattern === undefined ? field.label : applyLabelPattern(field.labelPattern, text)
}

/* ------------------------------------------------------------------- les couleurs */

/**
 * Une couleur XCTrack est un **entier signé 32 bits ARGB** : `tracklog_color` vaut
 * `-27091` dans le fichier et s'affiche `FFFF962D` dans le sélecteur natif (§ 4.6 du
 * relevé). La conversion est vérifiée par les tests dans les deux sens.
 */
export function colorToHex(raw: string): string | undefined {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff) return undefined
  return `#${(value >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}

/** Inverse de `colorToHex`. Accepte `#AARRGGBB` et `#RRGGBB` (alpha implicite `FF`). */
export function colorToLiteral(hex: string): string | undefined {
  const digits = hex.replace(/^#/, '').toUpperCase()
  if (!/^[0-9A-F]{6}$|^[0-9A-F]{8}$/.test(digits)) return undefined
  const full = digits.length === 6 ? `FF${digits}` : digits
  return String(parseInt(full, 16) | 0)
}

/** La partie visible d'une couleur ARGB, sous une forme que CSS accepte. */
export function colorSwatch(hex: string): string {
  return `#${hex.replace(/^#/, '').slice(-6)}`
}

/* ------------------------------------------------------------ construction du formulaire */

/** Ce dont la construction a besoin : `Widget` de `src/model/widget.ts` en est un. */
export interface FormSource {
  node: JsonNode
  shortName: string
  className?: string
}

/**
 * Les clés du widget, dans l'ordre du fichier, dédoublonnées.
 *
 * Sur clé dupliquée, XCTrack retient la dernière — comme `getMember`, comme `setLiteral`.
 * On garde donc la **dernière** occurrence, pas la première : le contrôle montre alors la
 * valeur qui fait foi, et l'écrit au bon endroit. Un fichier sain n'a pas de doublon ;
 * `findDuplicateKeys` le signale par ailleurs.
 */
function orderedKeys(node: JsonNode): string[] {
  if (node.kind !== 'object') return []
  const keys: string[] = []
  node.entries.forEach(([rawKey], index) => {
    const key = decode(rawKey)
    const later = node.entries.some(([other], j) => j > index && decode(other) === key)
    if (!later) keys.push(key)
  })
  return keys
}

interface FieldSeed {
  /** Le type du widget : le relevé des défauts est indexé par lui. */
  shortName: string
  key: string
  field?: string
  label: string
  labelPattern?: string
  option?: WidgetOption
  node: JsonNode
  owner: JsonNode
  choices: FieldChoice[]
  help?: string
  hint?: string
  depth: number
}

function buildField(seed: FieldSeed): PropertyField {
  const { node, option } = seed
  const text = node.kind === 'string' ? decode(node.raw) : node.kind === 'literal' ? node.raw : ''
  const control = resolveControl(option, node, seed.choices.length > 0)
  const pattern = seed.labelPattern !== undefined && /%[dsf]/.test(seed.labelPattern)
    ? seed.labelPattern
    : undefined

  const state = compareToDefault(
    seed.shortName, seed.key, seed.field,
    // `object` et `array` ne se comparent pas : `compareToDefault` les refuse elle-même,
    // on lui passe la nature du nœud telle quelle.
    { kind: node.kind === 'string' ? 'string' : node.kind === 'literal' ? 'literal' : 'object', text }
  )
  const expected = defaultValueAt(seed.shortName, seed.key, seed.field)

  const field: PropertyField = {
    key: seed.key,
    path: seed.field === undefined ? seed.key : `${seed.key}.${seed.field}`,
    label: pattern === undefined ? seed.label : applyLabelPattern(pattern, text),
    control,
    raw: node.kind === 'object' || node.kind === 'array' ? serializeJson(node) : node.raw,
    text,
    valueKind: node.kind,
    choices: seed.choices,
    known: option !== undefined,
    depth: seed.depth,
    owner: seed.owner,
    defaultState: state
  }
  if (expected !== undefined && typeof expected !== 'object') {
    field.defaultText = formatDefault(expected)
  }
  if (seed.field !== undefined) field.field = seed.field
  if (seed.help !== undefined) field.help = seed.help
  if (seed.hint !== undefined) field.hint = seed.hint
  if (pattern !== undefined) field.labelPattern = pattern
  if (option !== undefined) field.labelFrom = option.labelFrom
  if (control === 'slider') {
    const range = sliderRange(pattern, Number(text))
    if (range !== undefined) field.range = range
  }
  return field
}

/**
 * Une clé composite donne **plusieurs contrôles** : `rotation` vaut
 * `{"value": …, "showCompass": …}` et se présente en une liste et une case (§ 4.3 du
 * relevé). L'éclatement suit l'objet du fichier, pas la liste `fields` du catalogue :
 * un sous-champ apparu depuis l'extraction doit rester éditable, un sous-champ absent
 * ne doit pas produire de contrôle vide.
 *
 * Le sous-champ `value` reçoit le libellé de l'option ; les autres prennent leur libellé
 * propre — `fieldLabels`, que l'extraction lit sur la case à cocher que XCTrack dessine
 * pour eux — et s'affichent en retrait sous lui : l'indentation est le mécanisme observé
 * pour une sous-option (§ 4.4).
 *
 * **Un sous-champ que XCTrack n'intitule pas** n'en reçoit pas d'inventé : il porte le
 * libellé de son composite suivi de son nom (« Carte routière et style de terrain ·
 * theme »). C'est le cas de `mapWidget_mapAppearance`, dont `theme` et `terrain` ne font
 * qu'une seule liste déroulante dans l'application — les deux moitiés d'un même réglage,
 * qui n'ont donc chacune aucun titre à elles. Le composite inconnu du catalogue, lui,
 * garde sa clé brute : c'est tout ce qu'on sait de lui.
 *
 * Le libellé traduit de l'option reste attaché au champ par `hint`, que le rendu pose en
 * infobulle : rien de ce que le catalogue sait n'est perdu.
 */
function expandComposite(
  shortName: string, node: JsonNode, key: string, option: WidgetOption | undefined,
  parentLabel: string, help: string | undefined, texts: WidgetOptionTexts, tr: Translator
): PropertyField[] {
  const subKeys = orderedKeys(node)
  const hasMain = subKeys.includes(MAIN_FIELD)

  const fields: PropertyField[] = []
  for (const subKey of subKeys) {
    const value = getMember(node, subKey)
    if (value === undefined) continue
    const main = hasMain && subKey === MAIN_FIELD
    // Le `?` de XCTrack porte sur l'option entière. Il se pose sur le sous-champ
    // principal ; à défaut de `value` — `mapWidget_mapAppearance` n'en a pas — sur le
    // premier, qui tient la tête du groupe. Sans quoi l'aide serait dans le catalogue
    // et nulle part à l'écran.
    const head = hasMain ? main : subKey === subKeys[0]
    const fieldResource = option?.fieldLabels?.[subKey]
    const fieldLabel = fieldResource === undefined ? undefined : texts.resourceText(fieldResource)
    fields.push(buildField({
      shortName,
      key,
      field: subKey,
      label: main ? parentLabel : fieldLabel ?? `${parentLabel} · ${subKey}`,
      // Le gabarit de libellé (« Echelle Carte: %d m ») appartient au sous-champ principal.
      ...(main && option !== undefined ? { labelPattern: texts.resourceText(option.label) } : {}),
      ...(option === undefined ? {} : { option }),
      ...(main || option === undefined ? {} : { hint: parentLabel }),
      node: value,
      owner: node,
      choices: main && option !== undefined
        ? namedChoices(texts.optionValues(option), tr)
        : [],
      ...(head && help !== undefined ? { help } : {}),
      depth: hasMain && !main ? 1 : 0
    }))
  }
  return fields
}

/**
 * Les valeurs d'énumération que le catalogue ne sait pas nommer, dites en français.
 *
 * ## Pourquoi elles arrivent nues
 *
 * `optionValues` rend la **constante du fichier** quand l'extraction n'a pas retrouvé la
 * ressource du libellé (`labelFrom: 'branch'`). Mesuré à l'écran, gadget « Altitude
 * GPS » : le menu « Unités » proposait `SYS_UNIT`, `METER`, `FOOT`, `YARD`. On demandait
 * à un pilote de choisir entre `METER` et `FOOT` pour une unité que son instrument lui
 * montre en « m » et en « ft ».
 *
 * ## Ce que cette table est, et ce qu'elle n'est pas
 *
 * Ce n'est **pas** la parole de XCTrack : ce sont **nos** mots, et ils ne prétendent pas
 * reproduire ce que l'appareil affiche — personne ne l'a mesuré pour ce menu-là. Ils
 * nomment une unité, ce qui ne s'invente pas : un mètre est un mètre.
 *
 * D'où la frontière : **seulement les unités et les formats de coordonnées**, où la
 * constante ne laisse aucun doute. Les noms de thèmes de carte (`BIKER`, `MAPZEN`…) sont
 * des noms propres et restent tels quels ; `HORIZONTAL`, `AUTO` ou `GRAPH_THERMAL`
 * demanderaient une interprétation, et une interprétation se mesure avant de s'écrire.
 */
const UNIT_VALUE_KEYS = {
  SYS_UNIT: 'properties.unitSystem',
  METER: 'properties.unitMeter',
  FOOT: 'properties.unitFoot',
  YARD: 'properties.unitYard',
  KM_H: 'properties.unitKmPerHour',
  M_S: 'properties.unitMetersPerSecond',
  MP_H: 'properties.unitMilesPerHour',
  KT: 'properties.unitKnot',
  CELSIUS: 'properties.unitCelsius',
  FAHRENHEIT: 'properties.unitFahrenheit',
  DEG: 'properties.coordDegrees',
  DEG_MIN: 'properties.coordDegreesMinutes',
  DEG_MIN_SEC: 'properties.coordDegreesMinutesSeconds',
  UTM: 'properties.coordUtm'
} as const

/** Les quatorze clés de `UNIT_VALUE_KEYS`, en un type que `t()` accepte. */
type UnitMessageKey = (typeof UNIT_VALUE_KEYS)[keyof typeof UNIT_VALUE_KEYS]

/**
 * Nomme ce que le catalogue laisse nu. Une valeur déjà traduite par XCTrack n'est jamais
 * touchée : sa parole passe avant la nôtre.
 *
 * C'est le seul endroit du module où **notre** mot remplace une valeur du fichier — et il
 * suit donc l'axe `ui`, alors que tout ce qui l'entoure suit l'axe `labels`. La condition
 * `choice.label === choice.value` est exactement la frontière : tant que XCTrack a nommé
 * la valeur, on se tait.
 */
function namedChoices(choices: FieldChoice[], tr: Translator): FieldChoice[] {
  return choices.map((choice) => {
    const key: UnitMessageKey | undefined =
      UNIT_VALUE_KEYS[choice.value as keyof typeof UNIT_VALUE_KEYS]
    if (choice.label !== choice.value || key === undefined) return choice
    return { value: choice.value, label: tr.t(key) }
  })
}

/**
 * Ce qu'on peut dire d'une clé du relevé que le gadget ne porte pas.
 *
 * Le libellé, l'aide et les valeurs permises viennent du catalogue comme pour n'importe
 * quel contrôle ; le **contrôle**, lui, se déduit du type de la valeur relevée, faute de
 * valeur dans le fichier — c'est le même arbitrage qu'ailleurs dans ce module, à ceci
 * près que le type vient du relevé et non du document.
 */
function describeMissing(
  shortName: string, key: string, option: WidgetOption | undefined,
  texts: WidgetOptionTexts, tr: Translator
): MissingDefault {
  const value = defaultValueAt(shortName, key)
  const label = option === undefined ? key : texts.optionLabel(option)
  const help = option === undefined ? undefined : texts.optionHelp(option)
  const defaultText = value === undefined ? '' : formatDefault(value)

  // Composée — objet ou tableau : elle se montre, elle ne s'écrit pas. `formatDefault`
  // en donne la forme JSON compacte, qui suffit à la lire.
  if (value === undefined || typeof value === 'object') {
    return {
      key,
      label,
      known: option !== undefined,
      ...(help === undefined ? {} : { help }),
      control: 'unknown',
      choices: [],
      defaultText,
      valueKind: Array.isArray(value) ? 'array' : 'object',
      writable: false
    }
  }

  const node: JsonNode = typeof value === 'string'
    ? { kind: 'string', raw: encode(value) }
    : { kind: 'literal', raw: defaultText }
  const choices = option === undefined ? [] : namedChoices(texts.optionValues(option), tr)
  const pattern = option === undefined ? undefined : texts.resourceText(option.label)

  return {
    key,
    // Le libellé d'un curseur porte sa valeur (« Echelle Carte: %d m ») : il la porte
    // aussi ici, celle que XCTrack applique, pour se lire comme il se lira une fois écrit.
    label: pattern !== undefined && /%[dsf]/.test(pattern)
      ? applyLabelPattern(pattern, defaultText)
      : label,
    known: option !== undefined,
    ...(help === undefined ? {} : { help }),
    control: resolveControl(option, node, choices.length > 0),
    choices,
    defaultText,
    raw: node.raw,
    valueKind: node.kind,
    writable: true
  }
}

/**
 * Écrit dans le gadget une clé qu'il ne portait pas, à la valeur du relevé.
 *
 * L'insertion se fait **en fin d'objet** (`insertLiteral` / `insertString` de
 * `core/access`, qui documente pourquoi ce rang-là et pas un autre) : c'est la seule
 * position qui ne déplace, ne réécrit et ne réindente aucune clé existante. La
 * différence textuelle se réduit aux caractères ajoutés, et retirer la clé rend le
 * fichier d'origine à l'octet près.
 *
 * Rend `false` sans rien écrire dans les deux cas où l'écriture n'aurait pas de sens :
 * une valeur composée, que ce module refuse d'inventer, et une clé déjà présente — le
 * panneau a pu être construit avant une modification venue d'ailleurs, et insérer une
 * seconde fois créerait le doublon que `findDuplicateKeys` reproche aux fichiers.
 */
export function writeMissingDefault(node: JsonNode, missing: MissingDefault): boolean {
  if (!missing.writable || missing.raw === undefined) return false
  if (node.kind !== 'object' || hasMember(node, missing.key)) return false
  if (missing.valueKind === 'string') insertString(node, missing.key, missing.raw)
  else insertLiteral(node, missing.key, missing.raw)
  return true
}

/**
 * La description du formulaire d'un widget : la liste ordonnée de ses contrôles.
 *
 * `language` est un code du catalogue (`fr`, `en`, `de`… 34 en tout) ; le repli anglais
 * est déjà fondu dans le fichier de langue, et un libellé qui manquerait jusque-là
 * retombe sur le nom brut de la clé.
 *
 * Reste **synchrone** alors que les libellés arrivent par un `import()` : `main.ts`
 * l'appelle au milieu d'un rendu. Si la langue demandée n'est pas chargée, le
 * formulaire est bâti dans celle qui l'est et le dit par `textLanguage` ; c'est
 * `renderProperties` qui répare.
 */
export function buildPropertyForm(
  source: FormSource, language = 'fr', tr?: Translator
): PropertyForm {
  const { node, shortName } = source
  const say = prose(tr)
  const texts = textsFor(language)
  const catalog = new Map<string, WidgetOption>()
  for (const option of optionsFor(shortName)) {
    if (!catalog.has(option.key)) catalog.set(option.key, option)
  }

  const fields: PropertyField[] = []
  const unknownKeys: string[] = []
  let headCount = 0
  let inHead = true

  for (const key of orderedKeys(node)) {
    if (STRUCTURE_KEYS.has(key)) continue
    const value = getMember(node, key)
    if (value === undefined) continue

    const option = catalog.get(key)
    if (option === undefined) unknownKeys.push(key)
    const label = option === undefined ? key : texts.optionLabel(option)
    const help = option === undefined ? undefined : texts.optionHelp(option)

    const before = fields.length
    if (value.kind === 'object') {
      fields.push(...expandComposite(shortName, value, key, option, label, help, texts, say))
    } else {
      const pattern = option === undefined ? undefined : texts.resourceText(option.label)
      fields.push(buildField({
        shortName,
        key,
        label,
        // `buildField` ne retient le gabarit que s'il porte vraiment une valeur.
        ...(pattern === undefined ? {} : { labelPattern: pattern }),
        ...(option === undefined ? {} : { option }),
        node: value,
        owner: node,
        choices: option === undefined ? [] : namedChoices(texts.optionValues(option), say),
        ...(help === undefined ? {} : { help }),
        depth: 0
      }))
    }

    if (inHead && UNIVERSAL_KEYS.has(key)) headCount = fields.length
    else if (fields.length > before) inHead = false
  }

  const className = source.className ?? ''
  // Les comptes se font sur les CONTRÔLES et non sur les clés : une clé composite en
  // produit plusieurs, dont chacun se compare séparément au relevé.
  const comparable = fields.filter((one) => one.defaultState !== 'unknown')
  const form: PropertyForm = {
    className,
    shortName,
    label: readableName(shortName, language),
    language,
    textLanguage: texts.language,
    fields,
    headCount,
    unknownKeys,
    defaultsKnown: defaultsFor(shortName) !== undefined,
    comparableCount: comparable.length,
    customizedCount: comparable.filter((one) => one.defaultState === 'custom').length,
    missingDefaults: missingDefaultKeys(shortName, orderedKeys(node))
      .map((key) => describeMissing(shortName, key, catalog.get(key), texts, say))
  }
  // Le nœud d'origine, retenu pour pouvoir refaire le formulaire dans la bonne langue
  // sans que l'appelant ait à le redonner. Une `WeakMap` plutôt qu'un champ : le
  // formulaire décrit un panneau, il n'a pas à porter le document.
  formSource.set(form, source)
  return form
}

/** Le nœud d'où chaque formulaire a été bâti — voir `repairLanguage`. */
const formSource = new WeakMap<PropertyForm, FormSource>()

/* --------------------------------------------------------------------- modification */

/**
 * Écrit la valeur d'un champ, et rien d'autre.
 *
 * `text` est la valeur telle qu'on la lit : le contenu d'une chaîne sans ses
 * guillemets, le texte source exact d'un littéral. **C'est bien un texte et pas un
 * nombre** : `setLiteral` refuse les nombres pour que JavaScript ne réécrive pas `3.0`
 * en `3` au passage, et cette fonction ne rouvre pas la porte — un nombre saisi par le
 * pilote arrive ici sous la forme qu'il aura dans le fichier.
 *
 * Rend `false` sans rien écrire si la valeur est déjà celle-là : régler une option sur
 * sa valeur courante ne doit pas altérer son texte source.
 *
 * Un champ dont la valeur est un objet ou un tableau n'est pas modifiable ici : le
 * panneau l'affiche en lecture seule plutôt que de risquer de le reconstruire.
 */
export function setFieldValue(field: PropertyField, text: string): boolean {
  if (field.valueKind !== 'string' && field.valueKind !== 'literal') return false
  const key = field.field ?? field.key
  const current = getMember(field.owner, key)

  if (field.valueKind === 'string') {
    if (current?.kind === 'string' && decode(current.raw) === text) return false
    setString(field.owner, key, encode(text))
    field.raw = encode(text)
  } else {
    if (current?.kind === 'literal' && current.raw === text) return false
    setLiteral(field.owner, key, text)
    field.raw = text
  }
  field.text = text
  field.label = fieldLabel(field, text)
  return true
}

/* -------------------------------------------------------------------------- rendu */

/**
 * Au-delà de ce nombre de contrôles, le panneau se dote d'un champ de filtrage.
 *
 * `WCompMap` en a 49 une fois ses clés composites éclatées, `WXCAssistant` davantage
 * encore. Le panneau natif les range en sections repliables, mais **aucune métadonnée
 * ne dit quelle option va dans quelle section** : les reconstituer serait les inventer.
 * Le filtre résout le même problème — atteindre un réglage sans dérouler cinquante
 * lignes — sans rien affirmer sur la structure. Il porte sur le libellé et sur la clé,
 * ce qui permet aussi bien « épaisseur » que « mapWidget_ ».
 */
export const FILTER_THRESHOLD = 12

export interface PropertiesPanelOptions {
  form: PropertyForm
  /**
   * Le traducteur de **notre prose**, dans la langue que le pilote a choisie. Il ne touche
   * jamais aux libellés du panneau, qui viennent de l'APK et suivent le fichier ouvert
   * (`PropertyForm.language`) — voir `src/i18n/axes.ts`.
   *
   * Optionnel le temps que `main.ts` le passe — voir `prose` en tête de ce module.
   */
  tr?: Translator
  /** Appelé après chaque écriture effective, avec le champ modifié. */
  onChange?: (field: PropertyField, form: PropertyForm) => void
  /**
   * Panneau de **consultation** : il montre les réglages, il n'en offre aucun.
   *
   * Ce n'est pas un grisage. Le panneau de consultation ne construit **aucun contrôle de
   * formulaire** — pas de `<input>`, pas de `<select>`, pas de case à cocher désactivée :
   * les valeurs sont du texte. Un contrôle désactivé se réactive depuis la console, se
   * contourne au clavier sur certains navigateurs, et surtout il continue de dire
   * « ceci se règle ». Ce qui n'existe pas ne se réactive pas. `onChange` n'est jamais
   * branché, `setFieldValue` n'est jamais appelée, et le document ne peut donc pas
   * bouger d'un octet — c'est la propriété centrale du projet, et elle a ses tests.
   *
   * Deux exceptions, toutes deux étrangères au document : le champ de filtrage et le
   * `?` de l'aide, qui ne font que masquer et montrer ce qui est déjà à l'écran.
   */
  readOnly?: boolean
  /**
   * Le `info.versionCode` du fichier ouvert. Il ne sert qu'à dire **ce que vaut** la
   * comparaison au relevé des défauts, jamais à la supprimer : voir `defaultsTrust`.
   */
  fileVersionCode?: number
  /** Le `info.versionName` du fichier, pour le nommer dans la note plutôt qu'un nombre. */
  fileVersionName?: string
}

export interface PropertiesPanel {
  element: HTMLElement
  form: PropertyForm
  /** Filtre les contrôles affichés. Chaîne vide : tout est visible. */
  filter: (query: string) => void
  /** Vrai si le panneau est celui de la consultation — voir `readOnly`. */
  readOnly: boolean
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

let panelCount = 0

/** Minuscules sans accents : « épaisseur » doit trouver « Epaisseur des lignes ». */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Le panneau **vivant** : celui que l'appelant a inséré dans le document.
 *
 * Deux chemins refont le panneau après coup — la réparation de langue et l'écriture
 * d'une clé absente — et tous deux doivent reverser leur contenu dans cet élément-là,
 * pas dans le dernier construit. Sans ce repère, la deuxième écriture d'une session
 * remplirait un élément détaché du document et le pilote ne verrait rien bouger.
 */
interface LivePanel { panel?: PropertiesPanel }

export function renderProperties(options: PropertiesPanelOptions): PropertiesPanel {
  const live: LivePanel = {}
  const panel = buildPanel(options, live)
  live.panel = panel
  repairLanguage(panel, options, live)
  return panel
}

/**
 * Refait le panneau depuis un formulaire neuf, **dans l'élément que l'appelant tient**.
 *
 * Refaire tout plutôt que rapiécer une ligne : après une écriture, le formulaire change
 * de longueur, de comptes et de liste de clés absentes. Une reconstruction coûte une
 * page de DOM ; un calcul incrémental coûterait la justesse — c'est déjà l'arbitrage de
 * la liste des gadgets dans `main.ts`.
 *
 * Le filtre en cours est le seul état d'écran qui ne se déduise pas du document : il est
 * repris tel quel, sans quoi une écriture rouvrirait les cinquante lignes que le pilote
 * venait de réduire à trois.
 */
function rebuild(
  live: LivePanel, options: PropertiesPanelOptions, form: PropertyForm
): PropertiesPanel {
  const host = live.panel
  const query = host?.element.querySelector<HTMLInputElement>('.props__filter')?.value ?? ''
  const fresh = buildPanel({ ...options, form }, live)
  if (host === undefined) return fresh
  host.element.replaceChildren(...fresh.element.childNodes)
  host.form = fresh.form
  host.filter = fresh.filter
  if (query !== '') {
    const search = host.element.querySelector<HTMLInputElement>('.props__filter')
    if (search !== null) search.value = query
    host.filter(query)
  }
  return fresh
}

/**
 * Recharge le panneau dans la langue demandée, quand il a dû être bâti dans une autre.
 *
 * Le cas se produit pour un fichier qui déclare `Display.Language` — `complète.xcfg` du
 * corpus déclare `fr` — ouvert sur un navigateur d'une autre langue : `main.ts` demande
 * alors une langue que le préchargement n'avait pas devinée. Plutôt que d'afficher des
 * libellés de la mauvaise langue jusqu'au prochain clic, le panneau se refait lui-même
 * une fois le bon morceau arrivé : il est le seul à pouvoir le faire sans que `main.ts`
 * ait à savoir qu'une langue se charge.
 *
 * Le contenu est remplacé **dans** la section d'origine, celle que l'appelant a déjà
 * insérée dans le document : il n'a rien à rebrancher.
 */
function repairLanguage(
  panel: PropertiesPanel, options: PropertiesPanelOptions, live: LivePanel
): void {
  const { form } = options
  if (form.textLanguage === optionsLanguage(form.language)) return
  const source = formSource.get(form)
  if (source === undefined) return
  void loadOptionTexts(form.language).then(() => {
    rebuild(live, options, buildPropertyForm(source, form.language, options.tr))
  }).catch(() => {
    // Le morceau de langue n'est pas arrivé : le panneau reste dans la langue qu'il a,
    // et reste utilisable. Une langue de repli vaut mieux qu'un panneau vidé.
  })
}

function buildPanel(options: PropertiesPanelOptions, live: LivePanel): PropertiesPanel {
  const { form } = options
  const tr = prose(options.tr)
  const readOnly = options.readOnly === true
  const prefix = `props-${++panelCount}`

  const root = el('section', 'props')
  root.dataset.widget = form.shortName
  // Lisible depuis un test ou un harnais sans dépendre du style : le mode du panneau est
  // une promesse, elle doit être vérifiable de l'extérieur.
  root.dataset.mode = readOnly ? 'lecture' : 'edition'
  if (readOnly) root.classList.add('props--readonly')

  const head = el('header', 'props__head')
  head.append(
    // Notre phrase autour du libellé de XCTrack : « Gadget : » suit le pilote,
    // « Boussole et vent » suit son appareil.
    el('h2', 'props__title', tr.t('properties.widgetTitle', { name: form.label })),
    el('p', 'props__count', tr.t('properties.settingCount', { count: form.fields.length }))
  )
  if (form.className !== '') head.append(el('p', 'props__class', form.className))
  root.append(head)

  const list = el('div', 'props__list')
  const rows: Array<{ element: HTMLElement; haystack: string; state: DefaultState }> = []
  const rules: HTMLElement[] = []

  const restore = readOnly ? undefined : restoreContext(options, live, tr)

  form.fields.forEach((field, index) => {
    // En consultation, `changed` n'est même pas fabriqué : `buildRow` ne construit aucun
    // contrôle qui pourrait l'appeler, et il ne reçoit donc rien à appeler.
    const row = readOnly
      ? buildReadOnlyRow(field, `${prefix}-${index}`, tr)
      : buildRow(
        field, `${prefix}-${index}`, () => options.onChange?.(field, form), tr, restore
      )
    rows.push({
      element: row,
      haystack: normalize(`${field.label} ${field.path}`),
      state: field.defaultState
    })
    list.append(row)
    // Le bloc universel de tête, fermé par un trait — le seul séparatif attesté.
    if (index + 1 === form.headCount && index + 1 < form.fields.length) {
      const rule = el('hr', 'props__rule')
      rules.push(rule)
      list.append(rule)
    }
  })

  /*
   * Deux filtres qui se composent, et non deux filtres qui se remplacent : chercher
   * « couleur » **parmi** ce qui diffère du défaut est exactement la question qu'on se
   * pose devant un `WXCAssistant` de 63 réglages.
   */
  let query = ''
  let onlyCustom = false

  const absent: Array<{ element: HTMLElement; haystack: string }> = []
  const absentBlock = form.missingDefaults.length === 0
    ? undefined
    : buildMissingBlock(options, live, readOnly, absent, tr)

  function apply(): void {
    const needle = normalize(query.trim())
    for (const row of rows) {
      const missed = needle !== '' && !row.haystack.includes(needle)
      row.element.hidden = missed || (onlyCustom && row.state !== 'custom')
    }
    // Le trait sépare le bloc universel du reste : dès qu'on filtre, il ne sépare plus rien.
    for (const rule of rules) rule.hidden = needle !== '' || onlyCustom

    // Les clés absentes suivent la recherche — on cherche un réglage sans savoir si le
    // fichier le porte — mais jamais « seulement ce qui diffère » : une clé qui n'est pas
    // dans le fichier ne s'en écarte pas, elle n'y est pas.
    let shown = 0
    for (const row of absent) {
      const hidden = onlyCustom || (needle !== '' && !row.haystack.includes(needle))
      row.element.hidden = hidden
      if (!hidden) shown += 1
    }
    if (absentBlock !== undefined) absentBlock.hidden = shown === 0
  }

  function filter(next: string): void {
    query = next
    apply()
  }

  // La comparaison au relevé ne s'affiche qu'en consultation : en édition, le pilote est
  // en train de changer ces valeurs, et un compte qui se périme à chaque cran de curseur
  // ne vaut rien. Elle reste calculée dans le formulaire, disponible pour qui la veut.
  if (readOnly) {
    root.append(buildDefaultsSummary(form, options, tr, (value) => {
      onlyCustom = value
      apply()
    }))
  }

  if (form.fields.length > FILTER_THRESHOLD) {
    const search = el('input', 'props__filter')
    search.type = 'search'
    search.placeholder = tr.t('properties.filterSettings')
    search.setAttribute('aria-label', tr.t('properties.filterSettings'))
    search.addEventListener('input', () => { filter(search.value) })
    root.append(search)
  }

  root.append(list)
  // En fin de panneau, après les réglages que le fichier porte : ces clés-là ne sont pas
  // dans le fichier, et c'est aussi là qu'elles s'écriront si on le demande — `insertRaw`
  // pose une clé neuve en fin d'objet.
  if (absentBlock !== undefined) root.append(absentBlock)
  return { element: root, form, filter, readOnly }
}

/* --------------------------------------------- comparaison au relevé des défauts */

/**
 * Le bandeau qui donne le sens de la lecture : combien de réglages le pilote a
 * réellement changés, et ce que vaut ce compte.
 *
 * **Pourquoi un compte et un filtre plutôt qu'un tri.** L'ordre du panneau est celui du
 * fichier, c'est-à-dire celui du panneau natif (voir l'en-tête de ce module) : le
 * remettre en « personnalisés d'abord » romprait la correspondance avec ce que le pilote
 * a sous les yeux sur son instrument, qui est justement ce qu'il cherche à retrouver. La
 * hiérarchie se fait donc par le **poids** — les personnalisés en avant, les défauts en
 * retrait, chacun à sa place — et le filtre répond d'un clic à la question directe :
 * « qu'est-ce qu'il a changé ? ».
 */
function buildDefaultsSummary(
  form: PropertyForm, options: PropertiesPanelOptions, tr: Translator,
  onOnly: (value: boolean) => void
): HTMLElement {
  const box = el('div', 'props__defaults')
  const trust = defaultsTrust(options.fileVersionCode)
  box.dataset.trust = trust
  box.dataset.customized = String(form.customizedCount)
  box.dataset.comparable = String(form.comparableCount)

  if (!form.defaultsKnown) {
    box.append(el('p', 'props__defaults-count', tr.t('properties.noSurveyForType')))
    box.append(el('p', 'props__defaults-note', defaultsNote(trust, options, form, tr)))
    return box
  }

  const count = el(
    'p', 'props__defaults-count',
    form.customizedCount === 0
      ? tr.t('properties.nothingCustomized', { compared: form.comparableCount })
      // Deux comptes, deux accords : le second arrive déjà accordé, en `string`. Voir
      // `properties.customizedRatio` dans `messages/fr/widgets.ts`.
      : tr.t('properties.customizedRatio', {
        count: form.customizedCount,
        compared: tr.t('properties.comparedCount', { count: form.comparableCount })
      })
  )
  box.append(count)

  // Un filtre qui ne laisserait rien à l'écran n'est pas une commande, c'est un piège :
  // il n'apparaît que s'il y a quelque chose à isoler.
  if (form.customizedCount > 0) {
    // Un vrai bouton bordé, pas un lien discret : c'est la commande qui répond à la
    // question principale du panneau, elle doit se voir comme telle.
    const only = el('button', 'btn props__defaults-only', tr.t('properties.onlyDifferent'))
    only.type = 'button'
    only.setAttribute('aria-pressed', 'false')
    only.addEventListener('click', () => {
      const next = only.getAttribute('aria-pressed') !== 'true'
      only.setAttribute('aria-pressed', String(next))
      only.textContent = next
        ? tr.t('properties.showEverything')
        : tr.t('properties.onlyDifferent')
      onOnly(next)
    })
    box.append(only)
  }

  box.append(el('p', 'props__defaults-note', defaultsNote(trust, options, form, tr)))
  return box
}

/**
 * D'où vient le fichier ouvert, dit comme on peut le dire : par son nom quand il en donne
 * un, par son seul `versionCode` sinon. Les deux sont des **identifiants** — ils se passent
 * en `string`, jamais en `number`, sinon « 100 030 » ne se retrouverait dans aucun fichier.
 */
function fileVersion(options: PropertiesPanelOptions, tr: Translator): string {
  const name = options.fileVersionName
  const code = String(options.fileVersionCode)
  return name === undefined
    ? tr.t('properties.fileVersionCoded', { code })
    : tr.t('properties.fileVersionNamed', { name, code })
}

/** La référence du relevé : « Valeurs d'usine relevées sur XCTrack 1.0.3-beta (…) ». */
function surveyReference(tr: Translator): string {
  return tr.t('properties.surveyReference', {
    version: DEFAULTS_VERSION_NAME,
    code: String(DEFAULTS_VERSION_CODE)
  })
}

/**
 * Ce qu'on est en droit de dire de la comparaison, selon d'où vient le fichier.
 *
 * On ne cache jamais la comparaison quand les versions divergent — la plupart des clés
 * ne bougent pas d'une version à l'autre, et le pilote y gagne. On ne la donne pas non
 * plus pour une preuve : c'est ce que cette phrase-là arbitre, et c'est le seul endroit
 * où elle se dit.
 */
function defaultsNote(
  trust: DefaultsTrust, options: PropertiesPanelOptions, form: PropertyForm, tr: Translator
): string {
  // « Défauts » sans autre mot se lit comme « anomalies » : un pilote croit qu'on a
  // trouvé quelque chose de cassé dans sa configuration. Le français ne distingue pas
  // *default* de *fault* ; il faut donc le désambiguïser à chaque emploi — d'où
  // « valeur d'usine » dans le catalogue, dans les cinq langues.
  const survey = surveyReference(tr)
  // Le nombre de clés absentes ne prouve **pas** que le fichier vient d'une autre
  // version, comme on l'a d'abord écrit ici : le fichier de 2026 porte le versionCode du
  // relevé lui-même et son `WXCAssistant` ignore quand même quinze de ses clés. Une clé
  // qu'un gadget n'a jamais reçue reste absente, version pour version. Ce compte dit
  // donc ce qu'il dit, et rien de plus — le détail est en fin de panneau.
  const keys = form.missingDefaults.map((one) => one.key)
  // Une **colonne de clés du fichier**, jointe par `', '` : ce n'est pas une énumération
  // de prose, et `format.list` y ferait lire « windStyle et nav_label ».
  const missing = keys.length === 0
    ? ''
    : tr.t('properties.surveyKeysAbsent', {
      count: keys.length,
      keys: `${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`
    })

  const origin = trust === 'exact'
    ? tr.t('properties.surveyExact', { survey })
    : trust === 'unstated'
      ? tr.t('properties.surveyUnstated', { survey })
      : tr.t('properties.surveyOther', { survey, which: fileVersion(options, tr) })

  // Deux **phrases entières** mises bout à bout, jamais deux fragments : chacune se
  // traduit seule, et l'ordre des mots reste celui de sa langue.
  return joinSentences(origin, missing)
}

/** Deux phrases à la suite, l'espace en moins quand la seconde est absente. */
function joinSentences(...parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join(' ')
}

/* ------------------------------------------ les clés que le fichier ne porte pas */

/**
 * Le bloc de fin : ce que le relevé décrit, que ce gadget n'écrit pas, et ce que
 * l'appareil applique à la place.
 *
 * ## Pourquoi il s'affiche aussi en édition
 *
 * La comparaison au relevé, elle, est réservée à la consultation : un compte de
 * « personnalisés » se périme à chaque cran de curseur. Celui-ci ne bouge pas quand on
 * règle — une clé absente le reste tant qu'on ne l'écrit pas —, et c'est **en édition**
 * qu'il sert : c'est là qu'on peut y répondre.
 *
 * ## Pourquoi un bouton et pas un contrôle prérempli
 *
 * Un champ prérempli au défaut inviterait à « confirmer » une valeur, et le premier
 * geste maladroit écrirait une ligne de plus dans le fichier sans rien changer au
 * comportement de l'appareil. La décision est la même que celle de l'écran des
 * préférences, et jusqu'aux mots du bouton : deux formulations pour un même geste, sur
 * deux écrans du même outil, seraient un défaut à elles seules.
 */
function buildMissingBlock(
  options: PropertiesPanelOptions, live: LivePanel, readOnly: boolean,
  collected: Array<{ element: HTMLElement; haystack: string }>, tr: Translator
): HTMLElement {
  const { form } = options
  const trust = defaultsTrust(options.fileVersionCode)
  const count = form.missingDefaults.length

  const box = el('section', 'props__absent')
  box.dataset.trust = trust
  box.dataset.count = String(count)
  box.append(el('h3', 'props__absent-title', tr.t('properties.absentTitle', { count })))
  // La note vient **avant** les boutons : ce qu'on ne peut pas garantir se dit avant
  // d'offrir le geste, jamais après.
  box.append(el('p', 'props__absent-note', missingNote(trust, options, readOnly, tr)))

  for (const missing of form.missingDefaults) {
    const row = buildMissingRow(missing, options, live, readOnly, tr)
    collected.push({ element: row, haystack: normalize(`${missing.label} ${missing.key}`) })
    box.append(row)
  }
  return box
}

/** Ce que la lecture de ce bloc suppose, selon d'où vient le fichier. */
function missingNote(
  trust: DefaultsTrust, options: PropertiesPanelOptions, readOnly: boolean, tr: Translator
): string {
  const survey = surveyReference(tr)
  const origin = trust === 'exact'
    ? tr.t('properties.surveyExact', { survey })
    : trust === 'unstated'
      ? tr.t('properties.absentUnstated', { survey })
      : tr.t('properties.absentOther', { survey, which: fileVersion(options, tr) })

  // En consultation, rien ne s'écrit : promettre un geste qu'on n'offre pas serait pire
  // que de se taire.
  const gesture = readOnly ? '' : tr.t('properties.absentGesture')

  return joinSentences(tr.t('properties.absentApplied'), origin, gesture)
}

/** Une ligne du bloc : intitulé, valeur appliquée, et le geste qui la fige. */
function buildMissingRow(
  missing: MissingDefault, options: PropertiesPanelOptions, live: LivePanel,
  readOnly: boolean, tr: Translator
): HTMLElement {
  const row = el('div', 'props__absent-row')
  row.dataset.key = missing.key
  row.dataset.control = missing.control
  row.dataset.writable = String(missing.writable)
  if (!missing.known) row.dataset.unknown = 'true'
  // La clé au survol, comme sur les autres lignes — et l'aide du catalogue à la suite,
  // faute d'un `?` : le bloc n'a pas de contrôle auquel le rattacher.
  row.title = missing.help === undefined ? missing.key : `${missing.key} — ${missing.help}`

  const label = el('span', 'props__absent-label', missing.label)
  const readable = readableMissing(missing, tr)
  const value = el('span', 'props__absent-default', readable)
  value.title = tr.t('properties.appliedValue', { value: readable })

  row.append(label, value)
  if (!readOnly) row.append(adoptControl(missing, options, live, tr))
  return row
}

/**
 * La valeur du relevé, dite comme le panneau dit les valeurs — « Oui », « Arc ».
 *
 * La chaîne vide se dit « (vide) », comme partout ailleurs dans le panneau : une case
 * laissée blanche se lirait « on ne sait pas », alors que c'est une valeur, et que le
 * bouton l'écrira telle quelle (`mapWidget_osmLanguage`).
 */
function readableMissing(missing: MissingDefault, tr: Translator): string {
  if (missing.valueKind === 'string' && missing.defaultText === '') {
    return tr.t('properties.emptyValue')
  }
  return readableDefault(missing, tr) ?? missing.defaultText
}

/**
 * Le bouton qui écrit la clé — ou la phrase qui dit pourquoi il n'y en a pas.
 *
 * Pas de bouton sans valeur sûre à écrire : une valeur composée n'est pas reconstruite
 * de mémoire. C'est la même frontière que `compareToDefault`, dont le troisième état
 * n'est pas un repli poli mais un refus de conclure.
 */
function adoptControl(
  missing: MissingDefault, options: PropertiesPanelOptions, live: LivePanel, tr: Translator
): HTMLElement {
  const { form } = options
  const source = formSource.get(form)

  if (!missing.writable || missing.raw === undefined || source === undefined) {
    const note = el(
      'span', 'props__absent-none', tr.t('properties.compositeFactoryValue')
    )
    note.title = tr.t('properties.compositeFactoryValueHelp')
    return note
  }

  const trust = defaultsTrust(options.fileVersionCode)
  const button = el('button', 'btn props__adopt', tr.t('properties.setValue'))
  button.type = 'button'
  // `missing.label` est le libellé de XCTrack : il entre dans notre phrase par un repère.
  button.setAttribute('aria-label', tr.t('properties.setValueAria', { label: missing.label }))
  // L'avertissement dit exactement ce qu'on sait, et pas un mot de plus : « une autre
  // version » quand on l'a lue, « on ne sait pas d'où vient ce fichier » sinon. Les deux
  // paragraphes sont séparés par une ligne vide, comme dans le message lui-même.
  const caveat = trust === 'exact'
    ? ''
    : trust === 'indicative'
      ? tr.t('properties.setCaveatOtherVersion', { version: DEFAULTS_VERSION_NAME })
      : tr.t('properties.setCaveatUnknownVersion', { version: DEFAULTS_VERSION_NAME })
  button.title = [
    tr.t('properties.setValueHelp', {
      key: missing.key, value: readableMissing(missing, tr)
    }),
    caveat
  ].filter((part) => part !== '').join('\n\n')

  button.addEventListener('click', () => {
    if (!writeMissingDefault(source.node, missing)) return
    // Le formulaire est refait depuis le document, jamais rapiécé : la clé écrite devient
    // un contrôle comme les autres, à sa place, et le bloc perd sa ligne.
    const fresh = rebuild(live, options, buildPropertyForm(source, form.language, options.tr))
    const field = fresh.form.fields.find((one) => one.path === missing.key)
    if (field !== undefined) options.onChange?.(field, fresh.form)
    focusRow(live.panel ?? fresh, missing.key)
  })
  return button
}

/** Mène le pilote au contrôle qui vient d'apparaître : sinon le bouton s'évanouit sans dire où. */
function focusRow(panel: PropertiesPanel, key: string): void {
  for (const row of panel.element.querySelectorAll<HTMLElement>('.props__row')) {
    if (row.dataset.key !== key) continue
    row.querySelector<HTMLElement>('input, select, output')?.focus()
    return
  }
}

/**
 * Une ligne du panneau de **consultation** : intitulé, valeur en toutes lettres, et ce
 * que le relevé en dit. Aucun contrôle de formulaire n'est construit ici — c'est la
 * garantie, et elle tient parce qu'il n'y a rien à désactiver.
 */
function buildReadOnlyRow(field: PropertyField, id: string, tr: Translator): HTMLElement {
  const row = el('div', 'props__row')
  row.dataset.key = field.path
  row.dataset.control = field.control
  row.dataset.default = field.defaultState
  if (field.depth > 0) row.dataset.depth = String(field.depth)
  if (!field.known) row.dataset.unknown = 'true'
  row.title = field.hint === undefined ? field.path : `${field.path} — ${field.hint}`

  const label = el('span', 'props__label', field.label)
  label.id = `${id}-label`

  const value = el('span', 'props__value')
  value.id = id
  value.setAttribute('aria-labelledby', label.id)
  if (field.control === 'color') {
    const hex = colorToHex(field.text)
    const swatch = el('span', 'props__swatch')
    swatch.setAttribute('aria-hidden', 'true')
    if (hex !== undefined) {
      swatch.style.backgroundColor = colorSwatch(hex)
      swatch.style.opacity = String(parseInt(hex.slice(1, 3), 16) / 255)
    }
    value.classList.add('props__value--color')
    value.append(swatch, el('span', 'props__hexText', hex ?? field.text))
  } else {
    value.textContent = readableValue(field, tr)
  }

  row.append(label, value, originMark(field, tr))
  if (field.help !== undefined) row.append(...helpParts(field.help, id, tr))
  return row
}

/** La valeur telle qu'on la lit, et non telle qu'elle s'écrit dans le fichier. */
export function readableValue(field: PropertyField, tr: Translator): string {
  if (field.control === 'checkbox') {
    return tr.t(field.text === 'true' ? 'properties.yes' : 'properties.no')
  }
  if (field.control === 'enum') {
    const choice = field.choices.find((one) => one.value === field.text)
    // Une valeur que le catalogue ne connaît pas se montre telle quelle, dite comme telle :
    // c'est un vestige ou une version plus récente, jamais rien à masquer. La constante du
    // fichier passe en `string` — c'est ce qu'on retrouve dans le document.
    return choice === undefined
      ? tr.t('properties.outOfCatalogValue', { value: field.text })
      : choice.label
  }
  if (field.valueKind === 'object' || field.valueKind === 'array') return field.raw
  if (field.valueKind === 'string' && field.text === '') return tr.t('properties.emptyValue')
  return field.text
}

/**
 * La valeur du relevé, dite comme la valeur du fichier l'est juste à côté.
 *
 * Sans cela le panneau se contredirait à chaque ligne : « Arc » d'un côté, « ≠ défaut
 * NONE » de l'autre — deux vocabulaires pour une même énumération, et le lecteur doit
 * faire la traduction lui-même. La constante du fichier reste dans l'infobulle.
 */
export function readableDefault(
  field: Pick<PropertyField, 'defaultText' | 'control' | 'choices'>, tr: Translator
): string | undefined {
  const raw = field.defaultText
  if (raw === undefined) return undefined
  if (field.control === 'checkbox') {
    if (raw === 'true') return tr.t('properties.yes')
    if (raw === 'false') return tr.t('properties.no')
    return raw
  }
  if (field.control === 'enum') {
    return field.choices.find((one) => one.value === raw)?.label ?? raw
  }
  if (field.control === 'color') return colorToHex(raw) ?? raw
  return raw
}

/**
 * La marque qui hiérarchise la lecture : personnalisé, resté au défaut, ou hors relevé.
 *
 * Les trois sont marqués, y compris le troisième. Sans lui, une ligne sans marque se
 * lirait « au défaut » — or `_border`, `_bg` et `_theme` sont sur **tous** les widgets et
 * le relevé n'en dit rien : trois mensonges par widget, chaque fois.
 */
function originMark(field: PropertyField, tr: Translator): HTMLElement {
  if (field.defaultState === 'custom') {
    const readable = readableDefault(field, tr)
    const mark = el('span', 'props__origin props__origin--custom')
    // « ≠ défaut Blanc » posait un signe de mathématiques sur la ligne et le mot qui se
    // lit *anomalie* juste après. La valeur d'usine reste dite — c'est ce qu'on vient
    // chercher ici —, mais nommée pour ce qu'elle est.
    mark.textContent = readable === undefined
      ? tr.t('properties.setByYou')
      : tr.t('properties.setByYouFactory', { value: readable })
    // L'infobulle garde la valeur **telle qu'elle s'écrit dans le fichier** : c'est celle
    // qu'on cherche quand on compare deux sauvegardes ou qu'on lit un rapport de bogue,
    // et la ligne visible, elle, doit parler la langue du pilote.
    mark.title = field.defaultText === undefined
      ? tr.t('properties.setByYouHelp')
      : tr.t('properties.setByYouHelpValue', { value: field.defaultText })
    return mark
  }
  if (field.defaultState === 'default') {
    const mark = el(
      'span', 'props__origin props__origin--same', tr.t('properties.factoryValue')
    )
    mark.title = tr.t('properties.factoryValueHelp')
    return mark
  }
  const mark = el(
    'span', 'props__origin props__origin--unknown', tr.t('properties.factoryValueUnknown')
  )
  mark.title = tr.t('properties.factoryValueUnknownHelp')
  return mark
}

/* ------------------------------------------------- le troisième geste : rétablir l'usine */

/**
 * L'intitulé du troisième geste. **Le même mot à mot que dans l'écran des préférences**
 * (`ui/preferencesPage.ts`, `RESTORE_LABEL`) : deux formulations pour un même geste, sur
 * deux écrans du même outil, seraient un défaut à elles seules — c'est déjà la règle des
 * deux premiers.
 */
export const RESTORE_LABEL = 'Rétablir la valeur d’usine'

/**
 * Le même intitulé, dans la langue du pilote. `RESTORE_LABEL` reste la **constante
 * française héritée** : c'est encore elle que `ui/preferencesPage.ts` emploie, et
 * `tests/ui/properties.test.ts` vérifie que le catalogue français dit **exactement** ce
 * qu'elle dit. Aucune dérive n'est donc possible entre les deux écrans, et le jour où
 * l'écran des réglages généraux versera à son tour, il n'y aura rien à relire.
 */
function restoreLabel(tr: Translator): string {
  return tr.t('properties.restoreFactoryValue')
}

/** Ce qu'il faut pour offrir le troisième geste, une fois par panneau. */
interface RestoreContext {
  /** Ce que vaut le relevé face à ce fichier-ci — voir `defaultsTrust`. */
  trust: DefaultsTrust
  /** Rétablit la valeur d'usine du champ. Rend `false` quand rien n'a bougé. */
  run: (field: PropertyField) => boolean
}

/**
 * Le geste, monté une fois pour tout le panneau.
 *
 * `undefined` en consultation, et `undefined` aussi quand le nœud source est introuvable :
 * sans lui, `rebuild` ne saurait pas d'où relire le formulaire.
 */
function restoreContext(
  options: PropertiesPanelOptions, live: LivePanel, tr: Translator
): RestoreContext | undefined {
  const { form } = options
  const source = formSource.get(form)
  if (source === undefined) return undefined
  return {
    trust: defaultsTrust(options.fileVersionCode),
    run: (field) => {
      if (field.defaultText === undefined) return false
      if (!setFieldValue(field, field.defaultText)) return false
      // Refait depuis le document, jamais rapiécé : la ligne rétablie perd sa marque
      // « personnalisé », le compte du bandeau suit, et le geste disparaît de lui-même.
      const fresh = rebuild(
        live, options, buildPropertyForm(source, form.language, options.tr)
      )
      const same = fresh.form.fields.find((one) => one.path === field.path)
      if (same !== undefined) options.onChange?.(same, fresh.form)
      focusRow(live.panel ?? fresh, field.path)
      return true
    }
  }
}

/**
 * Vrai si « Rétablir la valeur d'usine » peut être offert sur ce champ.
 *
 * `defaultState === 'custom'` porte l'essentiel du refus, et c'est voulu : c'est le seul
 * état où `compareToDefault` a **conclu** que le fichier porte autre chose que le relevé.
 * Son troisième état, `unknown`, n'est pas un repli poli mais un refus de conclure — type
 * de gadget absent du relevé, clé universelle, clé apparue depuis, valeur composée ou de
 * type différent. On ne rétablit pas ce qu'on n'a pas su comparer.
 *
 * Reste à vérifier que la valeur s'écrit : `setFieldValue` ne sait poser qu'une chaîne ou
 * un littéral, jamais reconstruire un objet ou un tableau.
 */
function restorable(field: PropertyField): boolean {
  if (field.defaultState !== 'custom' || field.defaultText === undefined) return false
  return field.valueKind === 'string' || field.valueKind === 'literal'
}

/**
 * La ligne du troisième geste : le bouton, et la phrase qui dit ce qu'il échange.
 *
 * ## Pourquoi il ne ressemble pas à « Définir cette valeur »
 *
 * Le bloc de fin propose d'**écrire une valeur que l'appareil applique déjà** : le geste
 * est neutre, il ne décide que de l'avenir. Celui-ci remplace un réglage que le pilote a
 * choisi — l'appareil ne se comportera plus pareil en vol. Il prend donc sa propre ligne
 * sous le réglage, à pleine opacité, et porte les deux valeurs en présence à côté du
 * bouton : on voit l'échange avant de cliquer, pas après.
 *
 * ## Pourquoi il s'affiche en édition, alors que la comparaison ne s'y affiche pas
 *
 * Le bandeau de comparaison est réservé à la consultation parce qu'un **compte** se périme
 * à chaque cran de curseur. Un geste par ligne ne se périme pas : le panneau est refait
 * depuis le document à chaque écriture. Et c'est en édition qu'il sert — c'est là qu'on
 * peut y répondre. Même raisonnement que le bloc des clés absentes.
 *
 * ## Pourquoi la version se dit à l'écran, et pas seulement au survol
 *
 * Le relevé vient d'**une seule** version de XCTrack. Sur un fichier venu d'ailleurs, la
 * valeur d'usine affichée n'est peut-être pas celle qu'un gadget neuf porterait — et là
 * où « Définir cette valeur » ne risque rien, celui-ci écrirait une valeur relevée
 * ailleurs par-dessus un réglage délibéré. L'avertissement est donc dans la phrase :
 * « avant le clic » exclut le survol.
 */
function buildRestoreLine(
  field: PropertyField, ctx: RestoreContext, tr: Translator
): HTMLElement {
  const line = el('div', 'props__restore')
  line.dataset.trust = ctx.trust
  const factory = readableDefault(field, tr) ?? field.defaultText ?? '?'
  const current = readableValue(field, tr)
  const caveat = restoreCaveat(ctx.trust, tr)

  const button = el('button', 'btn props__restore-btn', restoreLabel(tr))
  button.type = 'button'
  // `field.label` est le libellé de XCTrack — ou la clé brute du fichier quand le
  // catalogue l'ignore : il entre dans notre phrase par un repère, jamais traduit.
  button.setAttribute('aria-label', tr.t('properties.restoreAria', { label: field.label }))
  button.title = joinSentences(
    tr.t('properties.restoreHelp', { path: field.path, factory, current }), caveat
  )
  button.addEventListener('click', () => { ctx.run(field) })

  const note = el('span', 'props__restore-note', joinSentences(
    tr.t('properties.restoreNote', { factory, current }), caveat
  ))

  line.append(button, note)
  return line
}

/**
 * Ce qu'il faut ajouter quand le fichier ne vient pas de la version du relevé.
 *
 * Rien à dire quand elle coïncide : une phrase de prudence servie à tort apprend au
 * lecteur à ne plus lire les phrases de prudence.
 */
function restoreCaveat(trust: DefaultsTrust, tr: Translator): string {
  if (trust === 'exact') return ''
  const key = trust === 'indicative'
    ? 'properties.restoreCaveatOtherVersion'
    : 'properties.restoreCaveatUnknownVersion'
  return tr.t(key, { version: DEFAULTS_VERSION_NAME })
}

/** Une ligne du panneau : intitulé, contrôle, et le `?` de l'aide quand il y en a une. */
function buildRow(
  field: PropertyField, id: string, changed: () => void, tr: Translator,
  restore?: RestoreContext
): HTMLElement {
  const row = el('div', 'props__row')
  row.dataset.key = field.path
  row.dataset.control = field.control
  // La comparaison au relevé est posée ici aussi, sans conséquence visible : le style ne
  // la lit que sous `.props--readonly`. Un harnais ou un test peut donc l'interroger dans
  // les deux modes sans que l'édition change d'aspect.
  row.dataset.default = field.defaultState
  if (field.depth > 0) row.dataset.depth = String(field.depth)
  if (!field.known) row.dataset.unknown = 'true'
  // La clé du fichier au survol : c'est elle qu'on cherche quand on compare deux
  // sauvegardes ou qu'on lit un rapport de bogue.
  row.title = field.hint === undefined ? field.path : `${field.path} — ${field.hint}`

  const label = el('label', 'props__label', field.label)
  label.htmlFor = id

  if (field.control === 'checkbox') {
    // La case porte son libellé : c'est la forme du panneau natif, et elle donne une
    // cible tactile de la largeur de la ligne.
    const box = el('input', 'props__checkbox')
    box.type = 'checkbox'
    box.id = id
    box.checked = field.text === 'true'
    box.addEventListener('change', () => {
      if (setFieldValue(field, box.checked ? 'true' : 'false')) changed()
    })
    row.append(box, label)
  } else {
    row.append(label, buildControl(field, id, label, changed, tr))
  }

  if (!field.known) {
    const badge = el('span', 'props__badge', tr.t('properties.outOfCatalogSetting'))
    // « contrôle » traduisait *control* mot à mot : un pilote y lisait qu'une vérification
    // avait été faite. C'est la commande — case, menu, champ — qui a été devinée.
    badge.title = tr.t('properties.outOfCatalogSettingHelp', { path: field.path })
    row.append(badge)
  }

  if (field.help !== undefined) row.append(...helpParts(field.help, id, tr))
  // Après l'aide : c'est un geste, il vient une fois le réglage lu, jamais avant.
  if (restore !== undefined && restorable(field)) {
    row.append(buildRestoreLine(field, restore, tr))
  }
  return row
}

/** Le `?` cerclé du panneau natif et l'infobulle qu'il déplie. */
function helpParts(help: string, id: string, tr: Translator): HTMLElement[] {
  const text = el('p', 'props__help-text', help)
  text.id = `${id}-help`
  text.hidden = true

  const button = el('button', 'props__help')
  button.type = 'button'
  button.textContent = '?'
  button.setAttribute('aria-label', tr.t('properties.helpAria'))
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', text.id)
  button.addEventListener('click', () => {
    text.hidden = !text.hidden
    button.setAttribute('aria-expanded', text.hidden ? 'false' : 'true')
  })
  return [button, text]
}

function buildControl(
  field: PropertyField, id: string, label: HTMLElement, changed: () => void, tr: Translator
): HTMLElement {
  if (field.control === 'enum') return buildSelect(field, id, changed, tr)
  if (field.control === 'color') return buildColor(field, id, changed)
  if (field.control === 'slider' || field.control === 'number') {
    return buildNumber(field, id, label, changed)
  }
  if (field.control === 'text') return buildText(field, id, changed)

  // Objet imbriqué, tableau, `null`, littéral illisible : montré, jamais réécrit. La
  // règle d'or vaut aussi pour ce qu'on ne comprend pas — on ne le fait pas disparaître.
  const readonly = el('output', 'props__raw', field.raw)
  readonly.id = id
  readonly.title = tr.t('properties.readOnlyValue')
  return readonly
}

function buildSelect(
  field: PropertyField, id: string, changed: () => void, tr: Translator
): HTMLElement {
  const select = el('select', 'props__select')
  select.id = id
  for (const choice of field.choices) {
    const option = el('option', undefined, choice.label)
    option.value = choice.value
    select.append(option)
  }
  // Une valeur que le catalogue ne connaît pas — vestige, ou version plus récente que
  // l'extraction — s'ajoute à la liste plutôt que de se faire remplacer en silence.
  if (!field.choices.some((choice) => choice.value === field.text)) {
    const extra = el(
      'option', undefined, tr.t('properties.outOfCatalogValue', { value: field.text })
    )
    extra.value = field.text
    select.prepend(extra)
  }
  select.value = field.text
  select.addEventListener('change', () => {
    if (setFieldValue(field, select.value)) changed()
  })
  return select
}

function buildNumber(
  field: PropertyField, id: string, label: HTMLElement, changed: () => void
): HTMLElement {
  const input = el('input', field.range === undefined ? 'props__number' : 'props__slider')
  input.type = field.range === undefined ? 'number' : 'range'
  input.id = id
  if (field.range !== undefined) {
    input.min = String(field.range.min)
    input.max = String(field.range.max)
    input.step = '1'
  }
  input.value = field.text
  input.addEventListener('input', () => {
    // Le texte vient du contrôle, pas d'un `Number` : c'est lui qui ira dans le fichier.
    const text = input.value.trim()
    if (text === '' || !Number.isFinite(Number(text))) return
    if (setFieldValue(field, text)) {
      label.textContent = field.label
      changed()
    }
  })
  return input
}

function buildText(field: PropertyField, id: string, changed: () => void): HTMLElement {
  const input = el('input', 'props__text')
  input.type = 'text'
  input.id = id
  input.value = field.text
  input.addEventListener('change', () => {
    if (setFieldValue(field, input.value)) changed()
  })
  return input
}

/**
 * Le sélecteur de couleur : le champ `#AARRGGBB` du panneau natif, et sa pastille.
 * Pas de `<input type="color">` — il ignore la composante alpha, que XCTrack utilise.
 */
function buildColor(field: PropertyField, id: string, changed: () => void): HTMLElement {
  const wrap = el('span', 'props__color')
  const input = el('input', 'props__hex')
  input.type = 'text'
  input.id = id
  input.spellcheck = false
  input.setAttribute('inputmode', 'latin')

  const swatch = el('span', 'props__swatch')
  swatch.setAttribute('aria-hidden', 'true')

  function show(hex: string | undefined): void {
    input.value = hex ?? field.text
    if (hex === undefined) return
    swatch.style.backgroundColor = colorSwatch(hex)
    swatch.style.opacity = String(parseInt(hex.slice(1, 3), 16) / 255)
  }
  show(colorToHex(field.text))

  input.addEventListener('change', () => {
    const literal = colorToLiteral(input.value)
    if (literal === undefined) {
      show(colorToHex(field.text)) // Saisie invalide : on remet ce que le fichier contient.
      return
    }
    if (setFieldValue(field, literal)) {
      show(colorToHex(literal))
      changed()
    }
  })

  wrap.append(input, swatch)
  return wrap
}
