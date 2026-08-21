import { decode, encode, getMember, setLiteral, setString } from '../core/access'
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
 * Il n'écrit jamais le document : chaque modification passe par `setLiteral` ou
 * `setString`, qui remplacent **une** valeur dans le nœud d'origine. Une clé qu'on ne
 * touche pas ne change pas d'un octet, y compris son texte source (`3.0` reste `3.0`).
 */

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

export interface PropertyForm {
  className: string
  shortName: string
  /** « Gadget : Boussole », comme l'intitulé de l'activité native. */
  title: string
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
   * Les clés que le relevé décrit et que ce widget ne porte pas. Ce n'est pas un défaut
   * du fichier : c'est la trace la plus nette d'une autre version de XCTrack.
   */
  missingDefaults: string[]
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
  parentLabel: string, help: string | undefined, texts: WidgetOptionTexts
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
      choices: main && option !== undefined ? texts.optionValues(option) : [],
      ...(head && help !== undefined ? { help } : {}),
      depth: hasMain && !main ? 1 : 0
    }))
  }
  return fields
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
export function buildPropertyForm(source: FormSource, language = 'fr'): PropertyForm {
  const { node, shortName } = source
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
      fields.push(...expandComposite(shortName, value, key, option, label, help, texts))
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
        choices: option === undefined ? [] : texts.optionValues(option),
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
    title: `Gadget : ${readableName(shortName, language)}`,
    language,
    textLanguage: texts.language,
    fields,
    headCount,
    unknownKeys,
    defaultsKnown: defaultsFor(shortName) !== undefined,
    comparableCount: comparable.length,
    customizedCount: comparable.filter((one) => one.defaultState === 'custom').length,
    missingDefaults: missingDefaultKeys(shortName, orderedKeys(node))
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

export function renderProperties(options: PropertiesPanelOptions): PropertiesPanel {
  const panel = buildPanel(options)
  repairLanguage(panel, options)
  return panel
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
function repairLanguage(panel: PropertiesPanel, options: PropertiesPanelOptions): void {
  const { form } = options
  if (form.textLanguage === optionsLanguage(form.language)) return
  const source = formSource.get(form)
  if (source === undefined) return
  void loadOptionTexts(form.language).then(() => {
    const repaired = buildPanel({ ...options, form: buildPropertyForm(source, form.language) })
    panel.element.replaceChildren(...repaired.element.childNodes)
    panel.form = repaired.form
    panel.filter = repaired.filter
  }).catch(() => {
    // Le morceau de langue n'est pas arrivé : le panneau reste dans la langue qu'il a,
    // et reste utilisable. Une langue de repli vaut mieux qu'un panneau vidé.
  })
}

function buildPanel(options: PropertiesPanelOptions): PropertiesPanel {
  const { form } = options
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
    el('h2', 'props__title', form.title),
    el('p', 'props__count', `${form.fields.length} réglage${form.fields.length > 1 ? 's' : ''}`)
  )
  if (form.className !== '') head.append(el('p', 'props__class', form.className))
  root.append(head)

  const list = el('div', 'props__list')
  const rows: Array<{ element: HTMLElement; haystack: string; state: DefaultState }> = []
  const rules: HTMLElement[] = []

  form.fields.forEach((field, index) => {
    // En consultation, `changed` n'est même pas fabriqué : `buildRow` ne construit aucun
    // contrôle qui pourrait l'appeler, et il ne reçoit donc rien à appeler.
    const row = readOnly
      ? buildReadOnlyRow(field, `${prefix}-${index}`)
      : buildRow(field, `${prefix}-${index}`, () => options.onChange?.(field, form))
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

  function apply(): void {
    const needle = normalize(query.trim())
    for (const row of rows) {
      const missed = needle !== '' && !row.haystack.includes(needle)
      row.element.hidden = missed || (onlyCustom && row.state !== 'custom')
    }
    // Le trait sépare le bloc universel du reste : dès qu'on filtre, il ne sépare plus rien.
    for (const rule of rules) rule.hidden = needle !== '' || onlyCustom
  }

  function filter(next: string): void {
    query = next
    apply()
  }

  // La comparaison au relevé ne s'affiche qu'en consultation : en édition, le pilote est
  // en train de changer ces valeurs, et un compte qui se périme à chaque cran de curseur
  // ne vaut rien. Elle reste calculée dans le formulaire, disponible pour qui la veut.
  if (readOnly) {
    root.append(buildDefaultsSummary(form, options, (value) => {
      onlyCustom = value
      apply()
    }))
  }

  if (form.fields.length > FILTER_THRESHOLD) {
    const search = el('input', 'props__filter')
    search.type = 'search'
    search.placeholder = 'Filtrer les réglages'
    search.setAttribute('aria-label', 'Filtrer les réglages')
    search.addEventListener('input', () => { filter(search.value) })
    root.append(search)
  }

  root.append(list)
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
  form: PropertyForm, options: PropertiesPanelOptions, onOnly: (value: boolean) => void
): HTMLElement {
  const box = el('div', 'props__defaults')
  const trust = defaultsTrust(options.fileVersionCode)
  box.dataset.trust = trust
  box.dataset.customized = String(form.customizedCount)
  box.dataset.comparable = String(form.comparableCount)

  if (!form.defaultsKnown) {
    box.append(el(
      'p', 'props__defaults-count',
      'Le relevé des valeurs par défaut ne décrit pas ce type de widget : rien à comparer.'
    ))
    box.append(el('p', 'props__defaults-note', defaultsNote(trust, options, form)))
    return box
  }

  const count = el(
    'p', 'props__defaults-count',
    form.customizedCount === 0
      ? `Aucun réglage ne s’écarte de ce que XCTrack pose sur un widget neuf (${form.comparableCount} comparés).`
      : `${form.customizedCount} réglage${form.customizedCount > 1 ? 's' : ''} ` +
        `personnalisé${form.customizedCount > 1 ? 's' : ''} sur ${form.comparableCount} comparé` +
        `${form.comparableCount > 1 ? 's' : ''}.`
  )
  box.append(count)

  // Un filtre qui ne laisserait rien à l'écran n'est pas une commande, c'est un piège :
  // il n'apparaît que s'il y a quelque chose à isoler.
  if (form.customizedCount > 0) {
    // Un vrai bouton bordé, pas un lien discret : c'est la commande qui répond à la
    // question principale du panneau, elle doit se voir comme telle.
    const only = el('button', 'btn props__defaults-only', 'Seulement ce qui diffère')
    only.type = 'button'
    only.setAttribute('aria-pressed', 'false')
    only.addEventListener('click', () => {
      const next = only.getAttribute('aria-pressed') !== 'true'
      only.setAttribute('aria-pressed', String(next))
      only.textContent = next ? 'Tout afficher' : 'Seulement ce qui diffère'
      onOnly(next)
    })
    box.append(only)
  }

  box.append(el('p', 'props__defaults-note', defaultsNote(trust, options, form)))
  return box
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
  trust: DefaultsTrust, options: PropertiesPanelOptions, form: PropertyForm
): string {
  const reference = `Défauts relevés sur XCTrack ${DEFAULTS_VERSION_NAME} (versionCode ${DEFAULTS_VERSION_CODE})`
  const missing = form.missingDefaults.length === 0
    ? ''
    : ` ${form.missingDefaults.length} réglage${form.missingDefaults.length > 1 ? 's' : ''} ` +
      `du relevé ne figure${form.missingDefaults.length > 1 ? 'nt' : ''} pas dans ce widget ` +
      `(${form.missingDefaults.slice(0, 4).join(', ')}${form.missingDefaults.length > 4 ? '…' : ''}) : ` +
      'signe supplémentaire d’une autre version.'

  if (trust === 'exact') {
    return `${reference} — la version même de ce fichier.${missing}`
  }
  if (trust === 'unstated') {
    return `${reference}. Ce fichier ne dit pas de quelle version il vient : les valeurs ` +
      `par défaut changent d’une version à l’autre, la comparaison est donc indicative.${missing}`
  }
  const name = options.fileVersionName
  const which = name === undefined
    ? `la version ${String(options.fileVersionCode)}`
    : `la version ${name} (versionCode ${String(options.fileVersionCode)})`
  return `${reference}. Ce fichier vient de ${which} : les valeurs par défaut changent ` +
    `d’une version à l’autre, la comparaison est donc indicative.${missing}`
}

/**
 * Une ligne du panneau de **consultation** : intitulé, valeur en toutes lettres, et ce
 * que le relevé en dit. Aucun contrôle de formulaire n'est construit ici — c'est la
 * garantie, et elle tient parce qu'il n'y a rien à désactiver.
 */
function buildReadOnlyRow(field: PropertyField, id: string): HTMLElement {
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
    value.textContent = readableValue(field)
  }

  row.append(label, value, originMark(field))
  if (field.help !== undefined) row.append(...helpParts(field.help, id))
  return row
}

/** La valeur telle qu'on la lit, et non telle qu'elle s'écrit dans le fichier. */
export function readableValue(field: PropertyField): string {
  if (field.control === 'checkbox') return field.text === 'true' ? 'Oui' : 'Non'
  if (field.control === 'enum') {
    const choice = field.choices.find((one) => one.value === field.text)
    // Une valeur que le catalogue ne connaît pas se montre telle quelle, dite comme telle :
    // c'est un vestige ou une version plus récente, jamais rien à masquer.
    return choice === undefined ? `${field.text} (hors catalogue)` : choice.label
  }
  if (field.valueKind === 'object' || field.valueKind === 'array') return field.raw
  if (field.valueKind === 'string' && field.text === '') return '(vide)'
  return field.text
}

/**
 * La valeur du relevé, dite comme la valeur du fichier l'est juste à côté.
 *
 * Sans cela le panneau se contredirait à chaque ligne : « Arc » d'un côté, « ≠ défaut
 * NONE » de l'autre — deux vocabulaires pour une même énumération, et le lecteur doit
 * faire la traduction lui-même. La constante du fichier reste dans l'infobulle.
 */
export function readableDefault(field: PropertyField): string | undefined {
  const raw = field.defaultText
  if (raw === undefined) return undefined
  if (field.control === 'checkbox') return raw === 'true' ? 'Oui' : raw === 'false' ? 'Non' : raw
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
function originMark(field: PropertyField): HTMLElement {
  if (field.defaultState === 'custom') {
    const readable = readableDefault(field)
    const mark = el('span', 'props__origin props__origin--custom')
    mark.textContent = readable === undefined ? 'personnalisé' : `≠ défaut ${readable}`
    // L'infobulle garde la valeur **telle qu'elle s'écrit dans le fichier** : c'est celle
    // qu'on cherche quand on compare deux sauvegardes ou qu'on lit un rapport de bogue,
    // et la ligne visible, elle, doit parler la langue du pilote.
    mark.title = field.defaultText === undefined
      ? 'Cette valeur diffère de ce que XCTrack écrit sur un widget neuf de ce type.'
      : `Sur un widget neuf de ce type, XCTrack écrit « ${field.defaultText} ».`
    return mark
  }
  if (field.defaultState === 'default') {
    const mark = el('span', 'props__origin props__origin--same', '= défaut')
    mark.title = 'Valeur inchangée : c’est ce que XCTrack écrit sur un widget neuf de ce type.'
    return mark
  }
  const mark = el('span', 'props__origin props__origin--unknown', 'hors relevé')
  mark.title =
    'Le relevé des valeurs par défaut ne décrit pas ce réglage — clé universelle écrite ' +
    'à la main lors du relevé, clé apparue depuis, ou valeur non comparable. Rien n’est ' +
    'affirmé de cette ligne.'
  return mark
}

/** Une ligne du panneau : intitulé, contrôle, et le `?` de l'aide quand il y en a une. */
function buildRow(field: PropertyField, id: string, changed: () => void): HTMLElement {
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
    row.append(label, buildControl(field, id, label, changed))
  }

  if (!field.known) {
    const badge = el('span', 'props__badge', 'clé hors catalogue')
    badge.title = `« ${field.path} » n'est pas décrite par le catalogue : contrôle déduit de son type.`
    row.append(badge)
  }

  if (field.help !== undefined) row.append(...helpParts(field.help, id))
  return row
}

/** Le `?` cerclé du panneau natif et l'infobulle qu'il déplie. */
function helpParts(help: string, id: string): HTMLElement[] {
  const text = el('p', 'props__help-text', help)
  text.id = `${id}-help`
  text.hidden = true

  const button = el('button', 'props__help')
  button.type = 'button'
  button.textContent = '?'
  button.setAttribute('aria-label', 'Aide sur ce réglage')
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', text.id)
  button.addEventListener('click', () => {
    text.hidden = !text.hidden
    button.setAttribute('aria-expanded', text.hidden ? 'false' : 'true')
  })
  return [button, text]
}

function buildControl(
  field: PropertyField, id: string, label: HTMLElement, changed: () => void
): HTMLElement {
  if (field.control === 'enum') return buildSelect(field, id, changed)
  if (field.control === 'color') return buildColor(field, id, changed)
  if (field.control === 'slider' || field.control === 'number') {
    return buildNumber(field, id, label, changed)
  }
  if (field.control === 'text') return buildText(field, id, changed)

  // Objet imbriqué, tableau, `null`, littéral illisible : montré, jamais réécrit. La
  // règle d'or vaut aussi pour ce qu'on ne comprend pas — on ne le fait pas disparaître.
  const readonly = el('output', 'props__raw', field.raw)
  readonly.id = id
  readonly.title = 'Valeur non modifiable ici ; elle est conservée telle quelle.'
  return readonly
}

function buildSelect(field: PropertyField, id: string, changed: () => void): HTMLElement {
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
    const extra = el('option', undefined, `${field.text} (hors catalogue)`)
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
