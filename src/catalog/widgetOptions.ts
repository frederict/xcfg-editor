import OPTION_LANGUAGE_LIST from './widgetOptionsLanguages.json'
import rawBase from './widgetOptions/base.json'

/**
 * Catalogue des options réglables des widgets XCTrack, extrait des ressources et du
 * bytecode de l'APK (voir `tools/extract-widget-options.py`).
 *
 * ## Forme du catalogue, et pourquoi celle-là
 *
 * Trois tables séparées plutôt qu'un seul arbre :
 *
 * - `strings` — un pool `clé de ressource -> texte`, partagé. Une même ressource
 *   libelle souvent plusieurs options (`widgetSettingsShowTitle` sert à tous les
 *   widgets numériques) ; la dupliquer à chaque emploi pèserait pour rien.
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
 * ## Une seule part invariante, un fichier par langue
 *
 * Le catalogue d'un seul tenant pesait 380 Ko minifiés, dont **314 Ko de traductions
 * en 34 langues** — 83 % du poids — alors que l'éditeur n'en affiche jamais qu'une.
 * Il est donc coupé à la génération, mais **pas comme celui de la palette** :
 *
 * - `widgetOptions/base.json` — 67 Ko compacts : options, widgets, non-résolues,
 *   clés du corpus non appariées. Importé **statiquement**, en un seul morceau. Il
 *   n'est recopié dans aucun fichier de langue : la dupliquer 34 fois coûterait
 *   2,3 Mo et ferait retélécharger 67 Ko à chaque changement de langue.
 * - `widgetOptions/<langue>.json` — 20 Ko : les seuls textes d'une langue, chargés
 *   par un `import()` dont le chemin est calculé. Vite en fait 34 morceaux séparés
 *   et n'en télécharge qu'un.
 *
 * **Ce qui tranche entre les deux découpages est la taille absolue de la part
 * invariante, pas un rapport.** Ici elle pèse 67 Ko, trois fois et demie la part
 * traduite (20 Ko) : la recopier serait ruineux. Dans `widgetCatalog.ts` elle pèse
 * 13 Ko, moins que ses 14 Ko de textes : l'y recopier coûte 13 Ko par langue, et
 * épargne un second `import()`. Le docblock a longtemps dit « treize fois » et
 * « 5 Ko » ; ni l'un ni l'autre n'a jamais été mesuré. `tests/docs/chiffres.test.ts`
 * tient maintenant les cinq nombres de ce paragraphe.
 *
 * D'où **deux API**, et la frontière entre elles est celle de la langue :
 *
 * ```ts
 * optionsFor('WCompass')                    // synchrone : rien de traduit là-dedans
 * const texts = await loadWidgetOptions('fr')
 * texts.optionLabel(option)                 // synchrone à partir d'ici
 * ```
 *
 * La langue est portée par l'objet, pas répétée à chaque appel : un jeu de textes
 * chargé ne répond que dans **sa** langue. Deux appels pour la même langue rendent le
 * même objet — le chargement est mémorisé.
 *
 * ## Le repli anglais est déjà dans le fichier
 *
 * Il n'est pas décoratif : des 34 langues, **l'anglais est la seule complète** sur les
 * 257 ressources ; `hi` n'en traduit que 4, `hr` 43. Plutôt que de charger un second
 * fichier à l'exécution, chaque fichier de langue porte déjà le texte anglais là où sa
 * langue manque. `resourceText()` lit donc une table simple, sans repli à faire — il
 * rend exactement ce que rendait l'ancien `texts[langue] ?? texts.en`.
 *
 * Le repli qui reste ici est celui du **choix du fichier** : voir `optionsLanguage()`.
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
   * Libellé propre de chaque sous-champ d'une clé composite, quand le bytecode
   * l'établit : `{showCompass: "widgetSettingsRotationShowCompass"}`. Il ne l'établit
   * que pour les sous-champs booléens — l'application les dessine en cases à cocher
   * et pose le texte sur la case, ce qui se suit registre par registre. Un sous-champ
   * absent d'ici n'a **pas** de libellé propre dans XCTrack ; c'est le cas de
   * `mapWidget_mapAppearance`, dont `theme` et `terrain` partagent une seule liste
   * déroulante intitulée « Carte routière et style de terrain ».
   */
  fieldLabels?: Record<string, string>
  /**
   * Autres libellés attachés à une clé composite sans avoir pu être rattachés à un
   * sous-champ précis. Inventaire d'audit : ces ressources ne sont pas traduites dans
   * les fichiers de langue, l'affichage ne s'en sert pas.
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
  /** Les 34 langues du catalogue — pas seulement celle qui est chargée. */
  languages: string[]
  widgetCount: number
  optionCount: number
  distinctKeyCount: number
  pooledOptionCount: number
  /** Nombre de ressources traduites, donc de clés de chaque fichier de langue. */
  stringCount: number
  corpusPairs: number
  corpusMatched: number
  corpusMissing: number
  unresolvedCount: number
}

/**
 * La part du catalogue qui ne dépend d'aucune langue. C'est elle qu'on importe
 * statiquement : elle sert aussi bien au panneau de réglages qu'à la palette d'ajout,
 * qui n'y lit que la liste des types.
 */
export interface OptionCatalog {
  meta: OptionCatalogMeta
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

/** Le contenu brut d'un fichier `widgetOptions/<langue>.json`. */
interface RawTexts {
  language: string
  fallbackLanguage: string
  /** Textes réellement traduits dans cette langue. */
  nativeStringCount: number
  /** Textes empruntés à l'anglais faute de traduction — voir l'en-tête du module. */
  fallbackStringCount: number
  /** Clé de ressource -> texte, dans **une seule** langue. */
  strings: Record<string, string>
}

/** Une valeur permise, résolue : le nom écrit dans le fichier et son libellé. */
export interface ResolvedValue {
  value: string
  label: string
}

/** Les textes du catalogue, chargés et figés sur une langue. */
export interface WidgetOptionTexts {
  /** La langue effectivement chargée — pas forcément celle qui a été demandée. */
  readonly language: string
  /** Combien de textes viennent de la langue elle-même, et combien de l'anglais. */
  readonly nativeStringCount: number
  readonly fallbackStringCount: number
  /**
   * Texte d'une ressource. Rend `undefined` — jamais la clé de ressource : un appelant
   * qui reçoit `undefined` sait qu'il n'a rien à afficher, alors qu'un
   * `widgetSettingsShowTitle` affiché tel quel passerait pour un libellé.
   */
  resourceText(resourceKey: string): string | undefined
  /**
   * Libellé d'une option. Repli sur la clé de configuration si la ressource manque :
   * mieux vaut afficher `windStyle` que rien du tout dans un panneau de réglages.
   */
  optionLabel(option: WidgetOption): string
  /** Texte d'aide d'une option — celui du bouton `?` de XCTrack. */
  optionHelp(option: WidgetOption): string | undefined
  /**
   * Valeurs permises d'une option, dans l'ordre des ordinaux de l'énumération —
   * c'est-à-dire l'ordre du menu déroulant de XCTrack.
   *
   * Les valeurs dont le nom de constante n'a pas pu être lu sont écartées : sans lui,
   * on ne saurait pas quoi écrire dans le fichier.
   */
  optionValues(option: WidgetOption): ResolvedValue[]
  /**
   * Vrai si le libellé porte la valeur courante — le cas des curseurs de XCTrack,
   * dont l'intitulé est « Transparence d'arrière-plan : 100 % » et non un simple
   * intitulé suivi d'une valeur à part.
   */
  labelCarriesValue(option: WidgetOption): boolean
  /**
   * Libellé d'un curseur, valeur substituée. `%d`, `%s` et `%f` reçoivent la valeur,
   * `%%` redevient un `%` littéral. Un libellé sans marqueur est rendu inchangé.
   */
  formatOptionLabel(option: WidgetOption, value: number | string): string
}

/**
 * Cast explicite plutôt que de laisser TypeScript inférer le type littéral du JSON :
 * on veut pouvoir interroger le catalogue avec un nom de widget quelconque, y compris
 * inconnu, et l'inférence sur un fichier de cette taille coûte cher au compilateur.
 */
export const WIDGET_OPTIONS = rawBase as unknown as OptionCatalog

/** Les 34 langues dans lesquelles XCTrack livre ses libellés. */
export const OPTION_LANGUAGES: readonly string[] = OPTION_LANGUAGE_LIST

/** La langue du fichier de repli — celle des ressources par défaut de l'APK. */
export const OPTION_FALLBACK_LANGUAGE = 'en'

/**
 * Quel fichier de langue charger pour la langue demandée : celle-là si le catalogue
 * la porte, l'anglais sinon.
 *
 * Comparaison **exacte**, comme dans `widgetNames.ts` et `widgetCatalog.ts` : une
 * langue système relayée telle quelle (`fr-FR`) ne retombe pas sur `fr` mais sur
 * l'anglais. Cette limite est connue ; elle est volontairement la même dans les trois
 * modules plutôt que corrigée ici seul — la corriger à un seul endroit ferait diverger
 * le nom d'un widget du libellé de ses réglages dans le même panneau.
 *
 * Ces 34 langues **ne sont pas** les 33 de `widgetCatalog.ts` : le serbe (`sr`) libelle
 * des options sans avoir de description de widget. Un `optionsLanguage('sr')` rend donc
 * `sr` là où `catalogLanguage('sr')` rend `en`. C'est la raison pour laquelle chaque
 * module porte sa propre liste plutôt que d'en partager une.
 */
export function optionsLanguage(requested: string): string {
  return OPTION_LANGUAGES.includes(requested) ? requested : OPTION_FALLBACK_LANGUAGE
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

function makeTexts(raw: RawTexts): WidgetOptionTexts {
  const resourceText = (resourceKey: string): string | undefined => raw.strings[resourceKey]

  return {
    language: raw.language,
    nativeStringCount: raw.nativeStringCount,
    fallbackStringCount: raw.fallbackStringCount,
    resourceText,
    optionLabel: (option) => resourceText(option.label) ?? option.key,
    optionHelp: (option) => (option.help === undefined ? undefined : resourceText(option.help)),
    optionValues: (option) => {
      if (option.values === undefined) return []
      const resolved: ResolvedValue[] = []
      for (const entry of option.values) {
        if (entry.value === undefined) continue
        const label = entry.label === undefined ? undefined : resourceText(entry.label)
        resolved.push({ value: entry.value, label: label ?? entry.value })
      }
      return resolved
    },
    labelCarriesValue: (option) => {
      const text = resourceText(option.label)
      return text !== undefined && /%[dsf]/.test(text)
    },
    formatOptionLabel: (option, value) => {
      const text = resourceText(option.label) ?? option.key
      return text.replace(/%[dsf]/, String(value)).replace(/%%/g, '%')
    }
  }
}

/**
 * Chargements en cours ou terminés, par langue **résolue**. On mémorise la promesse et
 * non les textes : deux appels concurrents avant la fin du téléchargement doivent
 * partager la même requête, pas en lancer deux.
 */
const loading = new Map<string, Promise<WidgetOptionTexts>>()

/**
 * Charge les textes du catalogue dans la langue demandée, ou en anglais si le
 * catalogue ne la porte pas (voir `optionsLanguage`). La promesse rendue livre un objet
 * dont tous les accesseurs sont synchrones.
 *
 * Le chemin de l'`import()` est calculé : Vite en tire un morceau par fichier de
 * langue, et n'en télécharge qu'un. Le glob qu'il en déduit — `./widgetOptions/*.json` —
 * ramasse aussi `base.json` et lui fabrique un morceau de renvoi de 160 octets ; il n'est
 * jamais chargé, `optionsLanguage` ne pouvant rendre `base`.
 */
export function loadWidgetOptions(language: string): Promise<WidgetOptionTexts> {
  const code = optionsLanguage(language)
  const pending = loading.get(code)
  if (pending !== undefined) return pending
  const started = import(`./widgetOptions/${code}.json`)
    .then((module: { default: RawTexts }) => makeTexts(module.default))
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
