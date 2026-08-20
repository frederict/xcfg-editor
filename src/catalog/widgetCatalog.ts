import rawWidgetCatalog from './widgetCatalog.json'

/**
 * Le catalogue de la palette d'ajout de widgets : familles, ordre d'affichage,
 * indicateur Pro et descriptions traduites. Extrait du registre statique de l'APK
 * (voir `tools/extract-widget-catalog.py`).
 *
 * ## Ce que ce module apporte que les deux autres n'ont pas
 *
 * `widgetNames.ts` donne le nom d'un widget, `widgetOptions.ts` ses réglages. Ni l'un
 * ni l'autre ne sait **où** un widget se range dans l'écran d'ajout de XCTrack, ni
 * dans quel ordre, ni ce que l'application en dit. C'est ici.
 *
 * ## Forme, et pourquoi celle-là
 *
 * Même découpage que `widgetOptions.json` : un pool `strings` (clé de ressource ->
 * {langue: texte}) partagé par les libellés de famille et les descriptions, et des
 * entrées qui **désignent** leur texte par sa clé plutôt que de le porter en clair.
 * Cinq widgets de debug réemploient leur titre comme description ; le pool le stocke
 * une fois.
 *
 * `families` est un **tableau ordonné**, pas un objet : l'ordre des familles est
 * celui de l'écran (Système, En vol, Air, XContest, Navigation, Compétition,
 * Livetracking, Boutons d'actions, Autres, Test) et il n'est pas alphabétique. De
 * même, `family.widgets` liste les widgets dans l'ordre de l'écran, et
 * `entry.order` en donne le rang. L'interface doit respecter cet ordre : c'est celui
 * que l'utilisateur connaît de son appareil.
 *
 * ## Ce que le catalogue ne dit pas, volontairement
 *
 * - La **taille par défaut** d'un widget neuf : elle n'est pas dans le registre. Elle
 *   a été relevée sur l'appareil (`docs/reference/edition-native-exploration.md`
 *   § 3.4) et n'a pas sa place ici.
 * - Une description **absente** reste absente : `widgetDescription` rend `undefined`
 *   plutôt qu'un texte inventé ou une traduction maison.
 * - La famille masquée `debug_wgDebug` et ses 8 widgets sont **conservés** dans les
 *   données mais marqués `hidden` : XCTrack ne les propose qu'en mode développeur.
 *   Un lecteur de fichier peut malgré tout en rencontrer un, et doit pouvoir le
 *   nommer. C'est à l'interface d'écarter les familles masquées de sa palette —
 *   `visibleFamilies()` est là pour ça.
 * - `WProFallback` et `WPMissing` ne sont dans aucune famille : ils ne sont pas au
 *   registre, parce que XCTrack les fabrique lui-même à la lecture d'un fichier
 *   (§ 3.3). Ils sont donc absents de `widgets`, et `familyOf` rend `undefined`.
 */

/** Une famille de widgets, telle que l'écran d'ajout la présente. */
export interface WidgetFamily {
  /** Clé de ressource du libellé, qui sert aussi d'identifiant (`wgFlying`). */
  id: string
  /** Vrai pour la famille de debug, que XCTrack ne montre pas en usage normal. */
  hidden: boolean
  /** Les widgets de la famille, dans l'ordre de l'écran. */
  widgets: string[]
}

/** Ce que le catalogue sait d'un type de widget. */
export interface CatalogEntry {
  /** Identifiant de la famille — voir `WidgetFamily.id`. */
  family: string
  /** Rang du widget dans sa famille, à partir de 0 : l'ordre de l'écran. */
  order: number
  /** Vrai si XCTrack badge le widget « Pro ». */
  pro: boolean
  /**
   * Clé de ressource du titre. `widgetNames.ts` reste la référence pour afficher un
   * nom ; cette clé est là pour l'audit — et parce qu'elle résout six des huit types
   * que `extract-widget-labels.py` avait laissés non résolus (voir le rapport de
   * livraison).
   */
  title: string | null
  /** Clé de ressource de la description, à résoudre dans `strings`. */
  description: string | null
  /**
   * Valeurs que la description substitue à ses `%s` — un lien, en pratique. Une
   * seule description en porte (`WOptiUnfinishedFAIPotential`).
   */
  descriptionArgs?: string[]
}

export interface WidgetCatalogMeta {
  source: string
  generatedBy: string
  /** Méthode du `.dex` d'où sort le registre, pour pouvoir refaire la lecture. */
  registry: string
  languages: string[]
  familyCount: number
  visibleFamilyCount: number
  widgetCount: number
  visibleWidgetCount: number
  proCount: number
  describedCount: number
  /** Widgets dont la description est le texte même du titre — tous de la famille debug. */
  descriptionSameAsTitleCount: number
  /** Widgets du registre sans aucune description. Vide dans la 1.0.3-beta5. */
  undescribed: string[]
}

export interface WidgetCatalog {
  meta: WidgetCatalogMeta
  strings: Record<string, Record<string, string>>
  families: WidgetFamily[]
  widgets: Record<string, CatalogEntry>
}

/**
 * Cast explicite plutôt que de laisser TypeScript inférer le type littéral du JSON :
 * on veut pouvoir interroger le catalogue avec un nom de widget quelconque, y compris
 * inconnu, et l'inférence sur un fichier de cette taille coûte cher au compilateur.
 */
export const WIDGET_CATALOG = rawWidgetCatalog as unknown as WidgetCatalog

/** Les langues dans lesquelles XCTrack livre familles et descriptions. */
export const CATALOG_LANGUAGES: readonly string[] = WIDGET_CATALOG.meta.languages

/** Toutes les familles, dans l'ordre de l'écran — famille masquée comprise. */
export const WIDGET_FAMILIES: readonly WidgetFamily[] = WIDGET_CATALOG.families

/** Les familles que XCTrack propose en usage normal, dans l'ordre de l'écran. */
export function visibleFamilies(): readonly WidgetFamily[] {
  return WIDGET_FAMILIES.filter((family) => !family.hidden)
}

/**
 * Texte d'une ressource du catalogue dans la langue demandée.
 *
 * Repli identique à celui de `widgetNames.ts` et de `widgetOptions.ts` : la langue
 * demandée, puis l'anglais — la langue source du catalogue —, puis `undefined`. La
 * langue reçue est déjà résolue par l'appelant (`resolveLanguage` dans
 * `src/model/preferences.ts`, appelé depuis `src/ui/main.ts`).
 *
 * Comme dans les deux autres modules, la comparaison est exacte : une langue système
 * relayée telle quelle (`fr-FR`) ne retombe pas sur `fr` mais sur l'anglais. Ce
 * comportement est volontairement le même partout plutôt que corrigé ici seul.
 */
export function catalogText(resourceKey: string, language: string): string | undefined {
  const texts = WIDGET_CATALOG.strings[resourceKey]
  if (texts === undefined) return undefined
  return texts[language] ?? texts.en
}

/**
 * Libellé d'une famille. Repli final sur son identifiant : `wgFlying` affiché tel
 * quel reste plus parlant qu'un en-tête vide, et signale l'anomalie.
 */
export function familyLabel(familyId: string, language: string): string {
  return catalogText(familyId, language) ?? familyId
}

/** L'entrée du catalogue pour un type de widget, s'il est au registre. */
export function catalogEntry(shortName: string): CatalogEntry | undefined {
  return WIDGET_CATALOG.widgets[shortName]
}

/** Identifiant de la famille d'un widget, ou `undefined` s'il n'est pas au registre. */
export function familyOf(shortName: string): string | undefined {
  return catalogEntry(shortName)?.family
}

/**
 * Vrai si le widget est réservé à la licence Pro. Faux pour un widget inconnu du
 * registre : mieux vaut ne pas badger que badger à tort.
 */
export function isProWidget(shortName: string): boolean {
  return catalogEntry(shortName)?.pro ?? false
}

/** Les widgets d'une famille, dans l'ordre de l'écran. */
export function widgetsInFamily(familyId: string): readonly string[] {
  return WIDGET_FAMILIES.find((family) => family.id === familyId)?.widgets ?? []
}

/**
 * Description d'un widget, dans la langue demandée.
 *
 * Rend `undefined` — et non une chaîne vide, ni le nom du widget — quand le widget
 * est inconnu du registre ou que sa description n'existe dans aucune langue. Un
 * appelant qui reçoit `undefined` sait qu'il n'a rien à afficher.
 *
 * Les `%s` de la description reçoivent les `descriptionArgs` dans l'ordre ; c'est
 * ainsi que le lien de « Potentiel FAI » atterrit dans son texte.
 */
export function widgetDescription(shortName: string, language: string): string | undefined {
  const entry = catalogEntry(shortName)
  if (entry?.description == null) return undefined
  const text = catalogText(entry.description, language)
  if (text === undefined) return undefined
  const args = entry.descriptionArgs
  if (args === undefined || args.length === 0) return text
  let index = 0
  return text.replace(/%s/g, () => args[index++] ?? '%s')
}
