import rawDefaults from './widgetDefaults.json'

/**
 * Ce que XCTrack écrit **de lui-même** dans un widget neuf, relevé sur l'appareil.
 *
 * ## À quoi cette table répond
 *
 * Dans un `.xcfg`, un widget porte ses cinq clés de structure, ses trois clés
 * universelles, **et tout ce que XCTrack y a ajouté**. Prise au pied de la lettre,
 * l'expression « les options configurées » ne distingue donc rien : tout y est
 * configuré. Un `WXCAssistant` aligne 63 contrôles dont le pilote n'a peut-être touché
 * que trois.
 *
 * Cette table donne le point de comparaison qui manquait. Elle a été obtenue en écrivant
 * chaque widget avec ses **seules huit clés universelles**, en faisant relire le fichier
 * par l'appareil, puis en ré-exportant pour lire ce que XCTrack avait complété :
 * `WTime` → `{"_title": true, "showSec": true}`. Ce qui diffère de ces valeurs-là est le
 * fait du pilote ; ce qui leur est égal est resté ce que l'application avait posé.
 *
 * ## Elle est datée, et cette date compte
 *
 * `1.0.3-beta`, versionCode 100030 — la même version de référence que
 * `ui/warnings.ts` (`REFERENCE_VERSION_CODE`). **Les valeurs par défaut changent d'une
 * version de XCTrack à l'autre**, comme le reste du format. Juger un fichier venu d'une
 * autre version contre ces défauts-là reste utile, mais n'est plus une preuve : c'est
 * `defaultsTrust` qui tranche, et l'interface le dit en toutes lettres plutôt que
 * d'afficher une comparaison qu'elle ne peut pas soutenir.
 *
 * ## Le fichier est copié depuis `docs/`, pas importé
 *
 * `docs/reference/widget-defaults-1.0.3-beta.json` est le relevé, et il y reste : c'est
 * une pièce de documentation, versionnée avec les captures qui l'attestent.
 * `src/catalog/widgetDefaults.json` en est la copie **à l'octet près** — un test le
 * vérifie —, parce qu'un module de `src/` n'a pas à dépendre de l'arborescence de la
 * documentation pour se construire.
 *
 * Poids : 14 Ko bruts, importés **statiquement par `ui/properties.ts`**, lui-même chargé
 * par `import()` au premier widget sélectionné. La table tombe donc dans le morceau des
 * réglages, jamais dans le morceau principal : un coup d'œil à la vue d'ensemble ne la
 * télécharge pas.
 */

/** La version de XCTrack sur laquelle le relevé a été fait. */
export const DEFAULTS_VERSION_CODE = 100030

/** Son nom tel que `info.versionName` l'écrit. */
export const DEFAULTS_VERSION_NAME = '1.0.3-beta'

/**
 * Une valeur du relevé. Les objets sont les clés composites (`rotation`,
 * `mapWidget_scale`) ; le seul tableau du relevé est `WWebView.scrollSettings`.
 */
export type DefaultValue = string | number | boolean | DefaultObject | DefaultValue[]

export interface DefaultObject { [key: string]: DefaultValue }

interface DefaultsFile {
  _source: string
  _methode: string
  _clesUniverselles: string[]
  _note: string
  _widgetCount: number
  widgets: Record<string, DefaultObject>
}

/**
 * Cast explicite plutôt que l'inférence littérale de TypeScript : on indexe par un
 * `shortName` quelconque, y compris un type que le relevé ne connaît pas. Même parti
 * que `widgetNames.ts`.
 */
const DEFAULTS = rawDefaults as DefaultsFile

/** Le relevé brut d'un type de widget, ou `undefined` s'il n'y figure pas. */
export function defaultsFor(shortName: string): DefaultObject | undefined {
  return Object.prototype.hasOwnProperty.call(DEFAULTS.widgets, shortName)
    ? DEFAULTS.widgets[shortName]
    : undefined
}

/** Les types de widgets décrits par le relevé — 75 au moment du relevé. */
export function knownWidgetCount(): number {
  return Object.keys(DEFAULTS.widgets).length
}

/** La provenance du relevé, telle qu'il la porte : à afficher, jamais à réécrire. */
export function defaultsProvenance(): string {
  return DEFAULTS._source
}

/**
 * Les huit clés que le relevé a écrites **à la main** pour fabriquer les widgets : elles
 * ne peuvent donc pas être comparées à un défaut, la table n'en décrivant aucun.
 */
export function universalKeys(): readonly string[] {
  return DEFAULTS._clesUniverselles
}

/**
 * La valeur du relevé pour une clé, ou son sous-champ quand la clé est composite.
 * `undefined` : le relevé ne dit rien de cette clé-là pour ce type de widget.
 */
export function defaultValueAt(
  shortName: string, key: string, field?: string
): DefaultValue | undefined {
  const widget = defaultsFor(shortName)
  if (widget === undefined) return undefined
  if (!Object.prototype.hasOwnProperty.call(widget, key)) return undefined
  const value = widget[key]
  if (field === undefined) return value
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  if (!Object.prototype.hasOwnProperty.call(value, field)) return undefined
  return value[field]
}

/**
 * Ce que la comparaison au relevé peut dire d'un réglage.
 *
 * - `custom` — le relevé décrit cette clé, et le fichier porte autre chose : le pilote
 *   l'a réglée.
 * - `default` — le relevé décrit cette clé, et le fichier porte exactement sa valeur.
 * - `unknown` — **rien à en dire**, et c'est un troisième état à part entière, jamais un
 *   « personnalisé » par défaut. Quatre causes : le type de widget est absent du relevé ;
 *   la clé est universelle (`_border`, `_bg`, `_theme`) et le relevé l'a écrite lui-même ;
 *   la clé n'existait pas à la version du relevé ; la valeur n'est pas comparable
 *   (objet, tableau, ou type JSON différent de celui du relevé — signe que le format a
 *   bougé, pas que le pilote a réglé quelque chose).
 */
export type DefaultState = 'custom' | 'default' | 'unknown'

/**
 * Le texte source d'une valeur du fichier, tel que `PropertyField` le porte : le contenu
 * décodé d'une chaîne, ou le texte exact d'un littéral (`3.0` reste `3.0`).
 */
export interface FileValue {
  kind: 'string' | 'literal' | 'object' | 'array'
  text: string
}

/**
 * Compare une valeur du fichier au relevé.
 *
 * La comparaison se fait **par type**, jamais sur les textes : `3.0` et `3` sont le même
 * nombre, et le fichier a le droit d'écrire l'un pour l'autre — la fidélité à l'octet
 * près est une affaire d'écriture, pas de lecture. Un désaccord de type entre le fichier
 * et le relevé rend `unknown` : il dit que le format a changé, pas que le pilote a réglé
 * cette option-là.
 */
export function compareToDefault(
  shortName: string, key: string, field: string | undefined, value: FileValue
): DefaultState {
  const expected = defaultValueAt(shortName, key, field)
  if (expected === undefined) return 'unknown'
  // Une valeur composée ne se compare pas à un texte sérialisé : deux écritures du même
  // objet diffèrent d'un espace et la comparaison mentirait.
  if (value.kind === 'object' || value.kind === 'array') return 'unknown'
  if (typeof expected === 'object') return 'unknown'

  if (typeof expected === 'boolean') {
    if (value.kind !== 'literal') return 'unknown'
    if (value.text !== 'true' && value.text !== 'false') return 'unknown'
    return value.text === String(expected) ? 'default' : 'custom'
  }

  if (typeof expected === 'number') {
    if (value.kind !== 'literal') return 'unknown'
    const number = Number(value.text)
    if (value.text.trim() === '' || !Number.isFinite(number)) return 'unknown'
    return number === expected ? 'default' : 'custom'
  }

  // Chaîne : le relevé écrit `"SMALL"`, le fichier aussi. Un littéral en face d'une
  // chaîne attendue est un changement de type, pas un réglage.
  if (value.kind !== 'string') return 'unknown'
  return value.text === expected ? 'default' : 'custom'
}

/** La valeur du relevé, sous la forme qu'elle a dans le fichier — pour l'afficher. */
export function formatDefault(value: DefaultValue): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

/**
 * Ce que le relevé décrit et que ce widget-ci ne porte pas, dans l'ordre du relevé.
 *
 * Ce n'est **pas** un défaut du fichier : c'est le signe le plus net qu'il vient d'une
 * autre version de XCTrack, laquelle n'écrivait pas encore — ou n'écrit plus — ces
 * clés-là. L'interface le dit comme tel, et ne propose évidemment pas de les ajouter.
 */
export function missingDefaultKeys(shortName: string, present: Iterable<string>): string[] {
  const widget = defaultsFor(shortName)
  if (widget === undefined) return []
  const seen = new Set(present)
  return Object.keys(widget).filter((key) => !seen.has(key))
}

/**
 * La confiance qu'on peut accorder à la comparaison, pour un fichier donné.
 *
 * `exact` — le fichier vient de la version du relevé : la comparaison dit ce qu'elle dit.
 * `indicative` — une autre version : les valeurs par défaut ont pu changer entre les deux,
 * et un « personnalisé » peut n'être que l'ancien défaut. On compare quand même, parce
 * que la plupart des clés ne bougent pas et que le pilote gagne à le voir — mais on ne
 * le laisse pas croire à une preuve.
 * `unstated` — le fichier ne dit pas d'où il vient (`info.versionCode` absent) : même
 * prudence, sans même pouvoir chiffrer l'écart.
 */
export type DefaultsTrust = 'exact' | 'indicative' | 'unstated'

export function defaultsTrust(fileVersionCode: number | undefined): DefaultsTrust {
  if (fileVersionCode === undefined) return 'unstated'
  return fileVersionCode === DEFAULTS_VERSION_CODE ? 'exact' : 'indicative'
}
