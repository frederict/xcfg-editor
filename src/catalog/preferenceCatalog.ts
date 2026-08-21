import PREFERENCE_LANGUAGE_LIST from './preferenceCatalogLanguages.json'

/**
 * Le catalogue des **préférences générales** de XCTrack : celles qui vivent hors des
 * pages de widgets, dans la section `preferences` d'un export `backup`.
 *
 * Produit par `tools/extract-preferences.py` à partir d'un APK décompressé. Deux sources
 * y sont croisées : les écrans de réglages (`res/xml/preferences_*.xml`), qui donnent le
 * libellé, l'aide, la forme du contrôle et les valeurs permises ; et le `<clinit>` de la
 * classe de configuration, qui donne le type de la valeur, son défaut et sa **portée**.
 * Une troisième, plus maigre, se tient à côté : `directReads`.
 *
 * ## Ce que ce module apporte que les autres catalogues n'ont pas
 *
 * `widgetOptions.ts` décrit ce qu'on règle **dans un widget**. Ici, c'est tout le reste :
 * les unités, les touches, les capteurs, le son, les espaces aériens — 217 clés, dont
 * 136 qu'un fichier réel porte effectivement.
 *
 * ## La portée décide de ce qu'un fichier emporte
 *
 * XCTrack range ses préférences en trois portées, lues dans le bytecode :
 *
 * - `PUBLIC` — écrite dans un export `backup`. **Les 136 clés `PUBLIC` du bytecode sont
 *   exactement les 136 clés du fichier de sauvegarde de référence.** C'est le contrôle
 *   croisé qui valide toute l'extraction. Il n'a pas toujours été aussi net : la 136ᵉ,
 *   `SafeSky.Interval`, passait pour une clé qu'Android persistait seul, faute de lire
 *   les préférences dont la clé est posée par leur constructeur et non au site de
 *   construction. Elle est bien déclarée, et bien `PUBLIC`.
 * - `INTERNAL` — locale à l'appareil (`Devel.*`, `_temp.*`, `App.Guess*`). Jamais
 *   exportée, donc jamais rencontrée par cet éditeur.
 * - `SECURE` — préférences chiffrées : jetons, mots de passe, identifiants de compte.
 *
 * `isExported()` répond à la seule question qui compte pour l'éditeur : cette clé
 * peut-elle apparaître dans un fichier qu'on ouvre ?
 *
 * ## Un fichier par langue, chargé à la demande
 *
 * Comme `widgetOptions/`, le catalogue est coupé en une part invariante (`base.json`,
 * 128 Ko : préférences, écrans, valeurs, défauts, portées) et un fichier de textes par
 * langue (~18 Ko, **repli anglais déjà fusionné**). Rien n'est importé statiquement :
 * `loadPreferenceCatalog()` fait deux `import()`, dont Vite tire deux morceaux séparés.
 * Un pilote qui n'ouvre jamais la page des préférences ne télécharge ni l'un ni l'autre.
 *
 * ## Ce que le catalogue ne dit pas, et le dit
 *
 * - **86 clés n'ont pas de libellé**, dont 49 des 136 d'un fichier réel. XCTrack les
 *   règle dans des écrans construits en code (espaces aériens, cartes, actions
 *   automatiques, sons), où la clé n'est plus argument du même appel que son libellé ;
 *   ou bien ce ne sont pas des réglages du tout, mais de l'état sérialisé
 *   (`Navigation.State`, `Sounds`, `Sensors.Configuration`…). `label` vaut alors `null`,
 *   jamais un texte inventé, et `unlabelled` en donne la liste.
 * - **Les dépendances entre préférences** (une case qui en grise trois autres) ne sont
 *   écrites nulle part dans les ressources. Le catalogue ne les invente pas.
 * - **Ce que XCTrack lit sans le déclarer.** Vingt-quatre clés ne passent par aucun objet
 *   de préférence : la classe de configuration les lit à même les préférences partagées
 *   d'Android. Elles sont dans `directReads()`, **pas** dans la table des préférences —
 *   on n'a lu ni leur portée, ni la moindre écriture de la version courante, et
 *   `isExported()` les dirait exportables sans que rien ne l'ait mesuré. Deux d'entre
 *   elles (`Airspace.State`, `EventMapping`) figurent encore dans un fichier de 0.9.12.3.
 * - **La dimension « version » n'est pas ici.** `meta.versionCode` dit de quelle version
 *   ce catalogue parle ; rien de plus. Elle vit à côté, dans `preferenceVersions.ts` :
 *   vingt-deux paliers de schéma bâtis sur cinquante-cinq relevés d'APK, qui disent
 *   d'une clé si telle version la lit et, sinon, ce qu'on peut en conclure.
 * - **Les huit `Unit.*` et les quinze `Keys.*` n'ont pas de domaine de valeurs ici**, et
 *   ce n'est pas un oubli : leurs écrans n'en portent aucun. Ce qui a pu en être relevé
 *   — le vocabulaire des unités, la table des codes de touche Android — vit dans
 *   `preferenceDomains.ts`, avec ce qui reste inconnu marqué comme tel.
 */

/* ------------------------------------------------------------------ formes des données */

/** La portée d'une préférence, telle que XCTrack la déclare. */
export type PreferenceScope = 'PUBLIC' | 'INTERNAL' | 'SECURE'

/** Le type de la valeur écrite dans le fichier. `null` quand il n'a pas pu être lu. */
export type PreferenceValueKind = 'boolean' | 'int' | 'float' | 'string' | 'enum' | 'json'

/** La forme du contrôle que XCTrack affiche, déduite du nom de l'élément XML. */
export type PreferenceControl =
  | 'checkbox'
  | 'list'
  | 'slider'
  | 'number'
  | 'text'
  | 'color'
  | 'button'
  | 'action'
  | 'screen'

/** D'où vient la valeur par défaut. */
export type DefaultSource =
  /** Écrite dans le constructeur de la classe de configuration. */
  | 'declared'
  /** Écrite dans l'attribut `android:defaultValue` de l'écran. */
  | 'xml'
  /** Calculée au démarrage — les huit `Unit.*` dépendent de la locale de l'appareil. */
  | 'runtime'

/** Ce que porte une clé de personnel, et sur quelle base on l'affirme. */
export interface PersonalData {
  kind: 'identity' | 'credential' | 'contact' | 'device' | 'location' | 'file'
    | 'freeText' | 'equipment' | 'sharing'
  /**
   * `scope` et `inputType` sont **lus dans l'APK** — la portée `SECURE`, le champ de
   * saisie masqué. `declared` est un jugement porté dans le script d'extraction, avec sa
   * raison : le contenu d'une clé ne se lit nulle part.
   */
  basis: 'scope' | 'inputType' | 'declared'
  reason: string
}

/** Ce que le catalogue sait d'une clé de préférence. */
export interface PreferenceEntry {
  /** Ce qui précède le premier point (`Display`), ou `''` pour une clé sans point. */
  family: string
  /** `null` pour une clé qu'Android persiste sans passer par la classe de configuration. */
  scope: PreferenceScope | null
  /** Vrai si la classe de configuration la déclare. */
  declared: boolean
  valueKind: PreferenceValueKind | null
  control: PreferenceControl | null
  /** Clé de ressource du libellé, à résoudre dans les textes. `null` si aucun écran ne la montre. */
  label: string | null
  /** Clé de ressource de l'aide — le `summary` de XCTrack. */
  help: string | null
  /** Libellé écrit en dur dans l'écran, non traduit (écrans `- extra -` et `- development -`). */
  labelText?: string
  helpText?: string
  /** Classe de préférence obfusquée qui la porte — pour l'audit d'un APK à l'autre. */
  impl?: string
  default?: boolean | number | string
  defaultSource?: DefaultSource
  /**
   * Le défaut de l'écran, **quand il contredit celui du bytecode**. Deux clés sont dans
   * ce cas dans la 1.0.3-beta5 ; c'est XCTrack qui se contredit, pas l'extraction.
   */
  xmlDefault?: boolean | number | string
  /** Nom obfusqué de l'énumération, quand la valeur en est une. */
  enum?: string
  /** Les constantes de l'énumération, **dans l'ordre des ordinaux**. */
  enumValues?: string[]
  /** Les valeurs permises, dans l'ordre où l'écran les propose. Voir `valuesSource`. */
  values?: string[]
  /**
   * D'où vient `values`. `entryValues` : la liste de l'écran, **appariée un à un** avec
   * les libellés traduits de `entryLabels`. `enum` : l'ordre des ordinaux, faute
   * d'écran — l'appariement avec des libellés n'existe alors pas.
   *
   * La distinction n'est pas cosmétique : sur `Display.Orientation` les deux listes
   * portent les mêmes cinq valeurs dans un ordre différent, et prendre l'ordre du
   * bytecode collerait « Paysage » sur `PORTRAIT`.
   */
  valuesSource?: 'entryValues' | 'enum'
  /** Nom du tableau de ressources qui porte les libellés traduits des valeurs. */
  entryLabels?: string
  /** Identifiant de l'écran de réglages qui la montre. */
  screen?: string
  /** Rang de la ligne dans son écran, à partir de 0. */
  order?: number
  /** Clé (ou clé de ressource, à défaut) de la catégorie qui la coiffe. */
  category?: string
  min?: number
  max?: number
  decimals?: number
  unit?: string
  personal?: PersonalData
}

/**
 * Une clé que la classe de configuration lit **directement** dans les préférences
 * partagées d'Android, sans objet de préférence : ni `<clinit>`, ni écran de réglages.
 *
 * Ce n'est pas une préférence du catalogue et ça ne doit pas le devenir : sa portée
 * n'est écrite nulle part, et `isExported()` rendrait vrai pour une clé dont rien ne
 * dit qu'elle est exportée. Ce qui est **lu**, et rien de plus : le nom de l'accesseur
 * Android — qui donne le type de la valeur —, la méthode qui fait la lecture, et si la
 * version réécrit la clé quelque part. Sur la 1.0.3-beta5, aucune des vingt-quatre
 * n'est réécrite.
 */
export interface DirectRead {
  /** `getString`, `getStringSet`, `getBoolean`, `getInt`, `getLong` ou `getFloat`. */
  read: string
  /** Classe et méthode qui lisent la clé, noms obfusqués — `a.j0`. */
  by: string
  /** Vrai si une méthode de l'application réécrit cette clé. */
  written: boolean
}

/** Une ligne d'un écran de réglages, dans l'ordre du document. */
export interface ScreenRow {
  /** Nom de l'élément XML : `SwitchPreferenceCompat`, `PreferenceCategory`… */
  tag: string
  key?: string
  title?: string
  titleText?: string
  summary?: string
  summaryText?: string
  depth: number
  category?: string
  /** Ce que la ligne ouvre au lieu de régler une valeur. */
  opens?: 'fragment' | 'activity'
}

/** Un écran de réglages de XCTrack. */
export interface PreferenceScreen {
  /** Nom de la ressource XML : `preferences_display`. `preferences` est l'écran racine. */
  id: string
  /** Fichier de l'APK d'où il sort, pour pouvoir refaire la lecture. */
  file: string
  title: string | null
  rows: ScreenRow[]
}

export interface PreferenceCatalogMeta {
  source: string
  generatedBy: string
  /** La version dont ce catalogue parle. C'est tout ce qu'il sait des versions. */
  versionCode: number | null
  versionName: string | null
  package: string | null
  /** Classe de configuration, racine des préférences, énumération de portée — obfusquées. */
  configClass: string
  preferenceRoot: string
  /** Vide quand la version n'en a pas — avant la 0.9.11, la portée n'existait pas. */
  scopeEnum: string
  /**
   * À quoi la classe de configuration a été reconnue. `scope` : par l'énumération de
   * portée. `screens` : par le recoupement de ses clés avec celles des écrans, le repli
   * des versions qui n'ont pas encore de portée. Un relevé doit dire d'où il vient.
   */
  configCriterion: 'scope' | 'screens' | ''
  languages: string[]
  preferenceCount: number
  declaredCount: number
  exportedCount: number
  labelledCount: number
  personalCount: number
  screenCount: number
  stringCount: number
  arrayCount: number
  /** Combien de clés `directReads` porte. Voir `DirectRead`. */
  directReadCount: number
  /**
   * Les clés où l'écran et le bytecode ne s'accordent pas sur le domaine de valeurs.
   * **Doit rester vide** : une entrée signalerait un appariement raté.
   */
  valueConflicts: string[]
  /**
   * Les clés où les deux sources donnent un défaut différent. Non vide dans la
   * 1.0.3-beta5 (`Sensors.ManualQnh`, `Display.WidgetTitleOutlineColor`) : c'est XCTrack
   * qui se contredit, et `default` retient celui du bytecode, qui fait foi à la lecture.
   */
  defaultConflicts: string[]
}

/** Le contenu brut de `preferenceCatalog/base.json`. */
interface RawBase {
  meta: PreferenceCatalogMeta
  families: Record<string, string[]>
  preferences: Record<string, PreferenceEntry>
  directReads: Record<string, DirectRead>
  screens: PreferenceScreen[]
  unlabelled: string[]
}

/** Le contenu brut d'un fichier `preferenceCatalog/<langue>.json`. */
interface RawTexts {
  language: string
  fallbackLanguage: string
  nativeStringCount: number
  fallbackStringCount: number
  strings: Record<string, string>
  arrays: Record<string, string[]>
}

/** Une valeur permise, résolue : ce qui s'écrit dans le fichier et ce qui s'affiche. */
export interface ResolvedPreferenceValue {
  value: string
  label: string
}

/* ---------------------------------------------------------------- catalogue chargé */

/** Le catalogue chargé, figé sur une langue. */
export interface PreferenceCatalog {
  /** La langue effectivement chargée — pas forcément celle qui a été demandée. */
  readonly language: string
  readonly meta: PreferenceCatalogMeta
  /** Les écrans de réglages, dans l'ordre alphabétique de leur identifiant. */
  readonly screens: readonly PreferenceScreen[]
  /** Combien de textes viennent de la langue elle-même, et combien de l'anglais. */
  readonly nativeStringCount: number
  readonly fallbackStringCount: number
  /** Toutes les clés du catalogue, dans l'ordre alphabétique. */
  keys(): string[]
  /** Ce que le catalogue sait d'une clé, ou `undefined` s'il ne la connaît pas. */
  preference(key: string): PreferenceEntry | undefined
  /**
   * Vrai si un export `backup` **peut** porter cette clé — c'est-à-dire si XCTrack la
   * déclare `PUBLIC`, ou si Android la persiste depuis un écran sans passer par la
   * classe de configuration.
   *
   * ⚠️ Une **possibilité**, pas une observation, pour les six clés du second cas : une
   * préférence qu'Android persiste seul n'entre dans le fichier qu'une fois écrite au
   * moins une fois. Sur le fichier de référence, aucune des six n'y est — elles vivent
   * dans les écrans cachés « - extra - » et « - development - », ou recopient une autre
   * clé. `declared` distingue les deux cas ; une interface qui bâtit une page de réglages
   * a tout intérêt à s'y fier.
   *
   * Faux pour une clé **inconnue** : le catalogue ne peut rien affirmer sur ce qu'il ne
   * connaît pas, et un éditeur qui rencontre une clé inconnue doit la conserver telle
   * quelle, pas décider de son sort. Voir `knows()`.
   */
  isExported(key: string): boolean
  /** Vrai si le catalogue connaît la clé. À demander avant d'interpréter `isExported`. */
  knows(key: string): boolean
  /** Les familles, dans l'ordre alphabétique ; `''` — les clés sans point — en dernier. */
  families(): string[]
  /** Les clés d'une famille, dans l'ordre alphabétique. */
  keysInFamily(family: string): readonly string[]
  /** Un écran par son identifiant. */
  screen(id: string): PreferenceScreen | undefined
  /**
   * Texte d'une ressource. Rend `undefined` — jamais la clé de ressource : un appelant
   * qui reçoit `undefined` sait qu'il n'a rien à afficher, alors qu'un
   * `prefDisplayTheme` affiché tel quel passerait pour un libellé.
   */
  text(resourceKey: string): string | undefined
  /**
   * Libellé d'une préférence. Repli, dans l'ordre : le texte traduit, le texte écrit en
   * dur dans l'écran, puis **la clé elle-même**. Une ligne de réglages sans intitulé
   * serait inutilisable ; `Airspace.LabelsZoom` affiché tel quel reste lisible et signale
   * que le libellé manque. `hasLabel()` permet de le savoir sans deviner.
   */
  label(key: string): string
  /** Vrai si la préférence porte un libellé — traduit ou écrit en dur. */
  hasLabel(key: string): boolean
  /** Texte d'aide d'une préférence — le `summary` de XCTrack. */
  help(key: string): string | undefined
  /**
   * Valeurs permises d'une préférence, dans l'ordre où l'écran les propose, avec leur
   * libellé traduit.
   *
   * Quand les libellés manquent — une énumération lue dans le bytecode, sans écran —
   * chaque valeur porte son propre nom : `LANDING_AUTOMATIC` n'est pas une traduction,
   * c'est ce que le fichier écrit, et c'est plus honnête qu'un texte inventé.
   */
  values(key: string): ResolvedPreferenceValue[]
  /** Les clés qu'aucun écran de réglages ne montre — l'écart, publié plutôt que caché. */
  unlabelled(): readonly string[]
  /** Les clés marquées comme portant une donnée personnelle, dans l'ordre alphabétique. */
  personalKeys(): string[]
  /**
   * Les clés que la classe de configuration lit sans les déclarer, dans l'ordre
   * alphabétique. Voir `DirectRead` : ce sont des **lectures**, pas des préférences —
   * `preference()` et `knows()` les ignorent, et c'est voulu.
   */
  directReads(): Readonly<Record<string, DirectRead>>
}

/** Les langues dans lesquelles XCTrack livre ses libellés de préférences. */
export const PREFERENCE_LANGUAGES: readonly string[] = PREFERENCE_LANGUAGE_LIST

/** La langue du fichier de repli — celle des ressources par défaut de l'APK. */
export const PREFERENCE_FALLBACK_LANGUAGE = 'en'

/**
 * Quel fichier de langue charger pour la langue demandée : celle-là si le catalogue la
 * porte, l'anglais sinon.
 *
 * Comparaison **exacte**, comme dans `widgetNames.ts`, `widgetCatalog.ts` et
 * `widgetOptions.ts` : une langue système relayée telle quelle (`fr-FR`) ne retombe pas
 * sur `fr` mais sur l'anglais. Cette limite est connue ; elle est volontairement la même
 * dans les quatre modules plutôt que corrigée ici seul — la corriger à un seul endroit
 * ferait diverger le libellé d'une préférence du nom d'un widget dans la même fenêtre.
 */
export function preferenceLanguage(requested: string): string {
  return PREFERENCE_LANGUAGES.includes(requested) ? requested : PREFERENCE_FALLBACK_LANGUAGE
}

function makeCatalog(base: RawBase, texts: RawTexts): PreferenceCatalog {
  const text = (resourceKey: string): string | undefined => texts.strings[resourceKey]
  const preference = (key: string): PreferenceEntry | undefined => base.preferences[key]

  const labelOf = (key: string): string | undefined => {
    const entry = preference(key)
    if (entry === undefined) return undefined
    const translated = entry.label === null ? undefined : text(entry.label)
    return translated ?? entry.labelText
  }

  return {
    language: texts.language,
    meta: base.meta,
    screens: base.screens,
    nativeStringCount: texts.nativeStringCount,
    fallbackStringCount: texts.fallbackStringCount,
    keys: () => Object.keys(base.preferences),
    preference,
    knows: (key) => preference(key) !== undefined,
    isExported: (key) => {
      const entry = preference(key)
      if (entry === undefined) return false
      // Une clé qu'Android persiste depuis un écran (`scope: null`) est écrite dans les
      // mêmes préférences partagées que les autres, donc reprise par l'export — une
      // possibilité, pas une observation : les six du cas ne sont dans aucun fichier de
      // référence, faute d'avoir jamais été réglées.
      return entry.scope === 'PUBLIC' || entry.scope === null
    },
    families: () =>
      Object.keys(base.families).sort((a, b) => {
        if (a === '') return 1
        if (b === '') return -1
        return a < b ? -1 : a > b ? 1 : 0
      }),
    keysInFamily: (family) => base.families[family] ?? [],
    screen: (id) => base.screens.find((screen) => screen.id === id),
    text,
    label: (key) => labelOf(key) ?? key,
    hasLabel: (key) => labelOf(key) !== undefined,
    help: (key) => {
      const entry = preference(key)
      if (entry === undefined) return undefined
      const translated = entry.help === null ? undefined : text(entry.help)
      return translated ?? entry.helpText
    },
    values: (key) => {
      const entry = preference(key)
      if (entry?.values === undefined) return []
      const labels = entry.entryLabels === undefined ? undefined : texts.arrays[entry.entryLabels]
      return entry.values.map((value, index) => ({
        value,
        // Un tableau de libellés plus court que la liste des valeurs n'est pas censé
        // exister ; s'il arrivait, la valeur brute vaut mieux qu'un `undefined` affiché.
        label: labels?.[index] ?? value
      }))
    },
    unlabelled: () => base.unlabelled,
    personalKeys: () =>
      Object.keys(base.preferences).filter((key) => base.preferences[key]?.personal !== undefined),
    directReads: () => base.directReads
  }
}

/**
 * Chargements en cours ou terminés, par langue **résolue**. On mémorise la promesse et
 * non le catalogue : deux appels concurrents avant la fin du téléchargement doivent
 * partager la même requête, pas en lancer deux.
 */
const loading = new Map<string, Promise<PreferenceCatalog>>()

/**
 * Charge le catalogue dans la langue demandée, ou en anglais si le catalogue ne la porte
 * pas (voir `preferenceLanguage`). La promesse rendue livre un objet dont tous les
 * accesseurs sont synchrones.
 *
 * Deux `import()`, dont Vite tire deux morceaux séparés : la part invariante, une fois,
 * et le fichier de la langue demandée. Ni l'un ni l'autre ne rejoint le morceau
 * principal. Le glob que Vite déduit du chemin calculé — `./preferenceCatalog/*.json` —
 * ramasse aussi `base.json`, mais `preferenceLanguage` ne pouvant jamais rendre `base`,
 * il n'est chargé que par son `import()` littéral.
 */
export function loadPreferenceCatalog(language: string): Promise<PreferenceCatalog> {
  const code = preferenceLanguage(language)
  const pending = loading.get(code)
  if (pending !== undefined) return pending
  const started = Promise.all([
    import('./preferenceCatalog/base.json'),
    import(`./preferenceCatalog/${code}.json`)
  ])
    .then(([base, texts]) =>
      makeCatalog(base.default as unknown as RawBase, texts.default as unknown as RawTexts))
    .catch((error: unknown) => {
      // Un morceau qui n'arrive pas — réseau coupé en vol, cache purgé — ne doit pas
      // condamner la langue pour toute la session : on oublie l'échec pour qu'un appel
      // ultérieur retente.
      loading.delete(code)
      throw error
    })
  loading.set(code, started)
  return started
}
