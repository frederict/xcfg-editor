import CATALOG_LANGUAGE_LIST from './widgetCatalogLanguages.json'

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
 * ## Un fichier par langue, chargé à la demande
 *
 * Le catalogue complet pèse 204 Ko minifiés pour 33 langues, dont l'éditeur n'affiche
 * jamais qu'une. Il est donc **partitionné à la génération** : un fichier autonome par
 * langue, sous `widgetCatalog/`, et un `import()` dynamique dont le chemin est calculé
 * à partir de la langue demandée. Vite en fait autant de morceaux séparés ; le
 * français en transfère 24 Ko au lieu de 204.
 *
 * D'où une **API asynchrone**, seul changement visible pour l'appelant :
 *
 * ```ts
 * const catalog = await loadWidgetCatalog(language)
 * catalog.familyLabel('wgFlying')          // synchrone à partir d'ici
 * catalog.widgetDescription('WStatusLine') // la langue est déjà fixée
 * ```
 *
 * La langue est portée par l'objet, pas répétée à chaque appel : un catalogue chargé
 * ne répond que dans **sa** langue. Deux appels pour la même langue rendent le même
 * objet — le chargement est mémorisé.
 *
 * ## Le repli anglais est déjà dans le fichier
 *
 * Il n'est pas décoratif : des 33 langues, **l'anglais est la seule complète** sur les
 * 172 ressources du catalogue ; `hr` n'en traduit que 16. Plutôt que de charger un
 * second fichier à l'exécution, chaque fichier de langue porte déjà le texte anglais
 * là où sa langue manque — deux fois moins d'octets transférés et une requête au lieu
 * de deux (le chiffrage des deux stratégies est dans l'en-tête du script
 * d'extraction). `catalogText()` lit donc une table simple, sans repli à faire.
 *
 * Le repli qui reste ici est celui du **choix du fichier** : voir `catalogLanguage()`.
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
   * nom ; cette clé est là pour l'audit — et c'est elle qui a résolu six des huit
   * types que `extract-widget-labels.py` laissait sans libellé.
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
  /** Les 33 langues du catalogue — pas seulement celle qui est chargée. */
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

/** Le contenu brut d'un fichier `widgetCatalog/<langue>.json`. */
interface RawCatalog {
  language: string
  fallbackLanguage: string
  /** Textes réellement traduits dans cette langue. */
  nativeStringCount: number
  /** Textes empruntés à l'anglais faute de traduction — voir l'en-tête du module. */
  fallbackStringCount: number
  meta: WidgetCatalogMeta
  families: WidgetFamily[]
  widgets: Record<string, CatalogEntry>
  /** Clé de ressource -> texte, dans **une seule** langue. */
  strings: Record<string, string>
}

/** Un catalogue chargé, figé sur une langue. */
export interface WidgetCatalog {
  /** La langue effectivement chargée — pas forcément celle qui a été demandée. */
  readonly language: string
  readonly meta: WidgetCatalogMeta
  /** Toutes les familles, dans l'ordre de l'écran — famille masquée comprise. */
  readonly families: readonly WidgetFamily[]
  /** Combien de textes viennent de la langue elle-même, et combien de l'anglais. */
  readonly nativeStringCount: number
  readonly fallbackStringCount: number
  /** Les familles que XCTrack propose en usage normal, dans l'ordre de l'écran. */
  visibleFamilies(): readonly WidgetFamily[]
  /**
   * Texte d'une ressource du catalogue. Rend `undefined` — jamais la clé — quand la
   * ressource n'existe ni dans la langue chargée ni en anglais : un appelant qui
   * reçoit `undefined` sait qu'il n'a rien à afficher.
   */
  catalogText(resourceKey: string): string | undefined
  /**
   * Libellé d'une famille. Repli final sur son identifiant : `wgFlying` affiché tel
   * quel reste plus parlant qu'un en-tête vide, et signale l'anomalie.
   */
  familyLabel(familyId: string): string
  /** L'entrée du catalogue pour un type de widget, s'il est au registre. */
  catalogEntry(shortName: string): CatalogEntry | undefined
  /** Identifiant de la famille d'un widget, ou `undefined` s'il n'est pas au registre. */
  familyOf(shortName: string): string | undefined
  /**
   * Vrai si le widget est réservé à la licence Pro. Faux pour un widget inconnu du
   * registre : mieux vaut ne pas badger que badger à tort.
   */
  isProWidget(shortName: string): boolean
  /** Les widgets d'une famille, dans l'ordre de l'écran. */
  widgetsInFamily(familyId: string): readonly string[]
  /**
   * Description d'un widget.
   *
   * Rend `undefined` — et non une chaîne vide, ni le nom du widget — quand le widget
   * est inconnu du registre ou que sa description n'existe dans aucune langue.
   *
   * Les `%s` de la description reçoivent les `descriptionArgs` dans l'ordre ; c'est
   * ainsi que le lien de « Potentiel FAI » atterrit dans son texte.
   */
  widgetDescription(shortName: string): string | undefined
}

/** Les langues dans lesquelles XCTrack livre familles et descriptions. */
export const CATALOG_LANGUAGES: readonly string[] = CATALOG_LANGUAGE_LIST

/** La langue du fichier de repli — celle des ressources par défaut de l'APK. */
export const CATALOG_FALLBACK_LANGUAGE = 'en'

/**
 * Quel fichier de langue charger pour la langue demandée : celle-là si le catalogue
 * la porte, l'anglais sinon.
 *
 * Comparaison **exacte**, comme dans `widgetNames.ts` et `widgetOptions.ts` : une
 * langue système relayée telle quelle (`fr-FR`) ne retombe pas sur `fr` mais sur
 * l'anglais. Cette limite est connue ; elle est volontairement la même dans les trois
 * modules plutôt que corrigée ici seul — la corriger à un seul endroit ferait diverger
 * le nom d'un widget de sa description dans la même palette.
 */
export function catalogLanguage(requested: string): string {
  return CATALOG_LANGUAGES.includes(requested) ? requested : CATALOG_FALLBACK_LANGUAGE
}

function makeCatalog(raw: RawCatalog): WidgetCatalog {
  const catalogText = (resourceKey: string): string | undefined => raw.strings[resourceKey]
  const catalogEntry = (shortName: string): CatalogEntry | undefined => raw.widgets[shortName]

  return {
    language: raw.language,
    meta: raw.meta,
    families: raw.families,
    nativeStringCount: raw.nativeStringCount,
    fallbackStringCount: raw.fallbackStringCount,
    catalogText,
    catalogEntry,
    visibleFamilies: () => raw.families.filter((family) => !family.hidden),
    familyLabel: (familyId) => catalogText(familyId) ?? familyId,
    familyOf: (shortName) => catalogEntry(shortName)?.family,
    isProWidget: (shortName) => catalogEntry(shortName)?.pro ?? false,
    widgetsInFamily: (familyId) =>
      raw.families.find((family) => family.id === familyId)?.widgets ?? [],
    widgetDescription: (shortName) => {
      const entry = catalogEntry(shortName)
      if (entry?.description == null) return undefined
      const text = catalogText(entry.description)
      if (text === undefined) return undefined
      const args = entry.descriptionArgs
      if (args === undefined || args.length === 0) return text
      let index = 0
      return text.replace(/%s/g, () => args[index++] ?? '%s')
    }
  }
}

/**
 * Chargements en cours ou terminés, par langue **résolue**. On mémorise la promesse et
 * non le catalogue : deux appels concurrents avant la fin du téléchargement doivent
 * partager la même requête, pas en lancer deux.
 */
const loading = new Map<string, Promise<WidgetCatalog>>()

/**
 * Charge le catalogue dans la langue demandée, ou en anglais si le catalogue ne la
 * porte pas (voir `catalogLanguage`). La promesse rendue livre un objet dont tous les
 * accesseurs sont synchrones.
 *
 * Le chemin de l'`import()` est calculé : Vite en tire un morceau par fichier de
 * langue, et n'en télécharge qu'un.
 */
export function loadWidgetCatalog(language: string): Promise<WidgetCatalog> {
  const code = catalogLanguage(language)
  const pending = loading.get(code)
  if (pending !== undefined) return pending
  const started = import(`./widgetCatalog/${code}.json`)
    .then((module: { default: RawCatalog }) => makeCatalog(module.default))
    .catch((error: unknown) => {
      // Un morceau qui n'arrive pas — réseau coupé en vol, cache purgé — ne doit pas
      // condamner la langue pour toute la session : on oublie l'échec pour qu'un
      // appel ultérieur retente.
      loading.delete(code)
      throw error
    })
  loading.set(code, started)
  return started
}
