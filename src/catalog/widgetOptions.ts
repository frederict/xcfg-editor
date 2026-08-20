import rawWidgetOptions from './widgetOptions.json'

/**
 * Catalogue des options réglables des widgets XCTrack, extrait des ressources et du
 * bytecode de l'APK (voir `tools/extract-widget-options.py`).
 *
 * ## Forme du catalogue, et pourquoi celle-là
 *
 * Trois tables séparées plutôt qu'un seul arbre :
 *
 * - `strings` — un pool `clé de ressource -> {langue: texte}`, partagé. Une même
 *   ressource libelle souvent plusieurs options (`widgetSettingsShowTitle` sert à
 *   tous les widgets numériques) ; la dupliquer dans 34 langues à chaque emploi
 *   pèserait plusieurs mégaoctets pour rien.
 * - `options` — la description de chaque option, **une seule fois**, sous un
 *   identifiant lisible. Les cinq réglages de `ValueWidget` sont partagés par une
 *   trentaine de widgets : ils ne sont décrits qu'une fois.
 * - `widgets` — pour chaque type de widget, la liste **ordonnée** des identifiants
 *   d'options. L'ordre est celui de leur déclaration dans le bytecode, les classes
 *   de base d'abord : il approche celui du panneau natif, qui montre les options
 *   universelles en tête (cf. `docs/reference/edition-native.md`).
 *
 * Les libellés ne sont pas stockés en clair dans les options mais désignés par leur
 * clé de ressource : `optionLabel()` les résout.
 *
 * ## Ce que le catalogue ne dit pas, volontairement
 *
 * Les dépendances entre options — grisage, apparition, indentation — ne sont
 * décrites nulle part dans l'APK : elles sont codées dans l'application. Elles ont
 * été relevées à la main sur l'appareil (`docs/reference/edition-native-exploration.md`
 * § 4.4) et n'ont pas leur place ici. Le panneau d'édition laisse tout modifiable
 * plutôt que de simuler une logique qu'il ne connaît pas.
 */

/** Type de contrôle à présenter pour une option. */
export type ControlKind =
  | 'checkbox'
  | 'enum'
  | 'slider'
  | 'text'
  | 'color'
  | 'composite'
  | 'unknown'

/** Une valeur permise d'une option de type `enum`. */
export interface OptionValue {
  /** Le nom de la constante, tel qu'il est écrit dans le `.xcfg` (`"NONE"`). */
  value?: string
  /** Clé de ressource du libellé de cette valeur, à résoudre dans `strings`. */
  label?: string
}

/** Une option réglable d'un widget. */
export interface WidgetOption {
  /** La clé du fichier `.xcfg` (`"windStyle"`, `"_bg"`). */
  key: string
  control: ControlKind
  /** Clé de ressource du libellé, à résoudre dans `strings`. */
  label: string
  /**
   * D'où vient l'appariement libellé/clé — utile pour juger sa fiabilité :
   * `args` (les deux dans le même appel de constructeur : sûr), `ctor`, `switch`,
   * `branch`, `class`, `composite` (déductions, par ordre de confiance décroissant).
   */
  labelFrom: string
  /** Clé de ressource du texte d'aide, si l'option en a un (bouton `?`). */
  help?: string
  values?: OptionValue[]
  /** Valeur par défaut d'un widget neuf, quand elle est lisible dans le bytecode. */
  default?: string
  /**
   * Sous-champs d'une clé composite (`rotation` = `{value, showCompass}`), relevés
   * dans le corpus. Une clé composite produit **plusieurs contrôles**.
   */
  fields?: string[]
  /**
   * Autres libellés attachés à une clé composite : ceux de ses sous-contrôles.
   * Quel libellé va à quel sous-champ n'est pas établi — le bytecode ne le dit pas.
   */
  otherLabels?: string[]
  /** Classe qui déclare l'option (`Widget`, `ValueWidget`, `WCompass`…). */
  definedIn: string
  /** Classe de réglage employée, obfusquée. Sert à l'audit d'une extraction. */
  impl: string
}

/** Une option repérée dans le bytecode mais dont le libellé n'a pas pu être relié. */
export interface UnresolvedOption {
  key: string
  definedIn: string
  impl: string
  reason: string
}

export interface OptionCatalogMeta {
  source: string
  generatedBy: string
  languages: string[]
  widgetCount: number
  optionCount: number
  distinctKeyCount: number
  pooledOptionCount: number
  corpusPairs: number
  corpusMatched: number
  corpusMissing: number
  unresolvedCount: number
}

export interface OptionCatalog {
  meta: OptionCatalogMeta
  strings: Record<string, Record<string, string>>
  options: Record<string, WidgetOption>
  widgets: Record<string, string[]>
  unresolved: UnresolvedOption[]
  /**
   * Clés présentes dans des fichiers réels que l'extraction n'a pas su rattacher à
   * une option. L'éditeur les rencontrera : il doit les préserver à l'écriture même
   * s'il ne sait pas les présenter.
   */
  unmatchedCorpusKeys: Record<string, string[]>
}

/**
 * Cast explicite plutôt que de laisser TypeScript inférer le type littéral du JSON :
 * on veut pouvoir interroger le catalogue avec un nom de widget quelconque, y compris
 * inconnu, et l'inférence sur un fichier de cette taille coûte cher au compilateur.
 */
export const WIDGET_OPTIONS = rawWidgetOptions as unknown as OptionCatalog

/** Les 34 langues dans lesquelles XCTrack livre ses libellés. */
export const OPTION_LANGUAGES: readonly string[] = WIDGET_OPTIONS.meta.languages

/**
 * Texte d'une ressource dans la langue demandée.
 *
 * Repli : la langue demandée, puis l'anglais — la langue source du catalogue —,
 * puis `undefined`. Jamais la clé de ressource : un appelant qui reçoit `undefined`
 * sait qu'il n'a rien à afficher, alors qu'un `widgetSettingsShowTitle` affiché tel
 * quel passerait pour un libellé.
 */
export function resourceText(resourceKey: string, language: string): string | undefined {
  const texts = WIDGET_OPTIONS.strings[resourceKey]
  if (texts === undefined) return undefined
  return texts[language] ?? texts.en
}

/**
 * Clés qu'un widget peut porter sans que le catalogue sache les régler. Elles sont à
 * conserver telles quelles à l'écriture : certaines sont des vestiges de versions
 * antérieures (`showWind`, `mapWidget_showTerrain`), d'autres n'ont simplement pas
 * pu être appariées.
 */
export function unmatchedKeysFor(shortName: string): readonly string[] {
  return WIDGET_OPTIONS.unmatchedCorpusKeys[shortName] ?? []
}

/** Les options d'un type de widget, dans l'ordre du panneau natif (approché). */
export function optionsFor(shortName: string): WidgetOption[] {
  const ids = WIDGET_OPTIONS.widgets[shortName]
  if (ids === undefined) return []
  const options: WidgetOption[] = []
  for (const id of ids) {
    const option = WIDGET_OPTIONS.options[id]
    if (option !== undefined) options.push(option)
  }
  return options
}

/** L'option d'un widget portant une clé de configuration donnée, s'il en a une. */
export function optionFor(shortName: string, key: string): WidgetOption | undefined {
  return optionsFor(shortName).find((option) => option.key === key)
}

/**
 * Libellé d'une option. Repli sur la clé de configuration si la ressource manque :
 * mieux vaut afficher `windStyle` que rien du tout dans un panneau de réglages.
 */
export function optionLabel(option: WidgetOption, language: string): string {
  return resourceText(option.label, language) ?? option.key
}

/** Texte d'aide d'une option — celui du bouton `?` de XCTrack. */
export function optionHelp(option: WidgetOption, language: string): string | undefined {
  return option.help === undefined ? undefined : resourceText(option.help, language)
}

/** Une valeur permise, résolue : le nom écrit dans le fichier et son libellé. */
export interface ResolvedValue {
  value: string
  label: string
}

/**
 * Valeurs permises d'une option, dans l'ordre des ordinaux de l'énumération —
 * c'est-à-dire l'ordre du menu déroulant de XCTrack.
 *
 * Les valeurs dont le nom de constante n'a pas pu être lu sont écartées : sans lui,
 * on ne saurait pas quoi écrire dans le fichier.
 */
export function optionValues(option: WidgetOption, language: string): ResolvedValue[] {
  if (option.values === undefined) return []
  const resolved: ResolvedValue[] = []
  for (const entry of option.values) {
    if (entry.value === undefined) continue
    const label = entry.label === undefined ? undefined : resourceText(entry.label, language)
    resolved.push({ value: entry.value, label: label ?? entry.value })
  }
  return resolved
}

/**
 * Vrai si le libellé porte la valeur courante — le cas des curseurs de XCTrack,
 * dont l'intitulé est « Transparence d'arrière-plan : 100 % » et non un simple
 * intitulé suivi d'une valeur à part.
 */
export function labelCarriesValue(option: WidgetOption, language: string): boolean {
  const text = resourceText(option.label, language)
  return text !== undefined && /%[dsf]/.test(text)
}

/**
 * Libellé d'un curseur, valeur substituée. `%d`, `%s` et `%f` reçoivent la valeur,
 * `%%` redevient un `%` littéral. Un libellé sans marqueur est rendu inchangé.
 */
export function formatOptionLabel(
  option: WidgetOption,
  language: string,
  value: number | string
): string {
  const text = resourceText(option.label, language) ?? option.key
  return text.replace(/%[dsf]/, String(value)).replace(/%%/g, '%')
}
