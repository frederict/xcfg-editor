/**
 * Base des versions de XCTrack : pour un couple *(widget, clé d'option)*, dans
 * quelles versions existe-t-il ?
 *
 * Produite par `tools/build-version-database.py` à partir des relevés de
 * `tools/extract-version-schema.py`, un par APK. Elle est le préalable à un outil de
 * nettoyage de configuration : sans elle, on ne peut pas distinguer un réglage devenu
 * caduc d'un réglage parfaitement valide.
 *
 * ## Le palier, pas la version
 *
 * Cinquante-quatre versions, bien moins de schémas. Deux constructions successives de
 * `0.9.11.1-beta` acceptent exactement les mêmes clés : pour cet outil elles sont
 * **indiscernables**, et les distinguer dans un menu laisserait croire à un choix qui
 * n'en est pas un. La base regroupe donc les versions consécutives de schéma identique
 * en **paliers**, et c'est le palier qui est l'unité de choix. `tierOf()` traduit un
 * `versionCode` en numéro de palier.
 *
 * ## Trois tables, parce que « je ne l'ai pas vue » n'est pas « elle n'existe pas »
 *
 * C'est la distinction dont tout dépend, et elle n'est pas théorique. **XCTrack
 * conserve les clés qu'il ne connaît plus** : un fichier écrit par 1.0.3 porte encore
 * `showWind` sur les boussoles qu'on n'a pas retouchées depuis que `windStyle` l'a
 * remplacé. Une base qui prendrait toute clé observée pour une clé existante
 * protégerait précisément les reliquats qu'un nettoyage doit ôter ; une base qui
 * prendrait toute clé non extraite pour une clé retirée supprimerait des réglages
 * valides. Il faut donc les deux tables, et la raison de l'écart.
 *
 * - `widgets` — ce que l'extraction a **lu** dans le bytecode. Une observation.
 * - `attested` — ce que des fichiers `.xcfg` réels portent, là où l'extraction n'a
 *   rien vu, **avec la raison** : un trou du relevé (`gap`), ou un reliquat qu'un
 *   XCTrack plus récent a conservé sans le connaître (`legacy`).
 * - `blind` — les clés attestées qu'aucun relevé, d'aucune version, ne retrouve. Pour
 *   celles-là l'extraction est aveugle de bout en bout : son silence ne dit rien.
 *
 * `keyStatus()` rend ces quatre cas explicitement, et un outil de nettoyage n'a le
 * droit de proposer une suppression que sur `'absent'`.
 *
 * ## Chargement
 *
 * Rien n'est importé statiquement : `loadVersionDatabase()` fait deux `import()`, dont
 * Vite tire des morceaux séparés. La base ne tombe donc jamais dans le morceau
 * principal — un pilote qui ouvre une configuration sans jamais demander de diagnostic
 * ne la télécharge pas.
 */

/** Une version de XCTrack, telle que son `AndroidManifest.xml` la déclare. */
export interface VersionEntry {
  /** `versionCode` : c'est lui qui fait autorité, jamais le nom du fichier APK. */
  code: number
  /** `versionName`, tel que `info.versionName` l'écrit dans un `.xcfg`. */
  name: string
  /** Tous les `versionName` menant à ce même schéma sous ce même `versionCode`. */
  names: string[]
  /** Fichiers d'archive ayant livré ce schéma — plusieurs si le numéro est partagé. */
  sources: string[]
  /** Palier auquel la version appartient, ou `null` si son relevé a échoué. */
  tier: number | null
  /**
   * Version publiée (`0.9.11.11`) plutôt que construction intermédiaire
   * (`0.9.11.11-326-g5df67c585`). Un pilote n'a jamais installé les secondes : un
   * sélecteur a tout intérêt à ne proposer que les premières, même si leur schéma
   * compte tout autant pour reconstituer l'histoire.
   */
  release: boolean
}

/** Un palier de schéma : des versions consécutives qui acceptent les mêmes clés. */
export interface TierEntry {
  tier: number
  firstCode: number
  firstName: string
  lastCode: number
  lastName: string
  versionCodes: number[]
  /** Les seules versions publiées du palier — souvent une, parfois aucune. */
  releaseNames: string[]
  widgetCount: number
  pairCount: number
  /** Ce qui a changé par rapport au palier précédent — c'est ce qui le justifie. */
  widgetsAdded: string[]
  widgetsRemoved: string[]
  keysAdded: Record<string, string[]>
  keysRemoved: Record<string, string[]>
}

/** Une version qu'on n'a pas su lire : elle n'a pas un schéma vide, mais aucun schéma. */
export interface VersionFailure {
  source: string
  reason: string
}

/** Confrontation d'un palier aux fichiers `.xcfg` réels qui en proviennent. */
export interface CorpusCheck {
  code: number
  /** Le palier, quand un seul porte ce `versionCode` ; `null` s'ils sont plusieurs. */
  tier: number | null
  /**
   * Tous les paliers portant ce `versionCode`. Ils sont parfois plusieurs : quatre
   * APK déclarent `91192` avec quatre inventaires de clés différents. Un fichier
   * estampillé 91192 peut venir de n'importe lequel — la confrontation vaut donc
   * pour leur réunion.
   */
  tiers: number[]
  /**
   * Combien de fichiers réels ont été confrontés. Le **compte**, jamais les noms :
   * le corpus est le dossier de sauvegardes d'un pilote, et ses noms de fichiers
   * portent des prénoms. Cette base part dans un dépôt public.
   */
  fileCount: number
  pairs: number
  matched: number
  unmatched: Record<string, string[]>
  /** Types de widgets qu'un fichier réel emploie et qu'aucun relevé ne connaît. */
  unknownWidgets: string[]
  /**
   * `versionCode` réellement relevé, quand celui du fichier ne figure dans aucune
   * archive et que la base se replie sur le plus proche. `91230` (0.9.12.3) est dans
   * ce cas : trois fichiers du corpus le déclarent, aucun APK ne le porte.
   *
   * **Ce n'est pas la même version, c'est la plus proche que nous ayons pu lire.**
   * Toute interface qui s'appuie sur ce repli doit le dire au pilote plutôt que de
   * présenter le résultat comme un constat.
   */
  approximatedBy?: number
  note: string | null
}

export interface VersionIndex {
  meta: {
    generatedBy: string
    versionCount: number
    tierCount: number
    failureCount: number
    oldest: string | null
    newest: string | null
  }
  versions: VersionEntry[]
  tiers: TierEntry[]
  failures: VersionFailure[]
  versionCodeConflicts: Array<{
    code: number
    sources: string[]
    note: string
    pairCounts: number[]
  }>
  corpus: CorpusCheck[]
}

export interface VersionSchema {
  tierCount: number
  /** `{widget: {intervalle de paliers: clés}}` — ce que l'extraction a lu. */
  widgets: Record<string, Record<string, string[]>>
  /** Intervalle de paliers où chaque widget existe. */
  widgetTiers: Record<string, string>
  /**
   * `{widget: {clé: {nature: intervalle}}}` — attestée par un fichier réel, absente
   * du relevé. La *nature* dit ce qu'on peut en conclure ; voir `AttestationKind`.
   */
  attested: Record<string, Record<string, Partial<Record<AttestationKind, string>>>>
  /** Attestées quelque part, extraites nulle part : l'absence ne prouve rien. */
  blind: Record<string, string[]>
  /** Type de contrôle des clés absentes du dernier palier, que le catalogue courant
   *  ne décrit plus — ce sont précisément celles qu'un nettoyage rencontrera. */
  controls: Record<string, Record<string, string>>
}

/**
 * Ce que la base sait d'un couple *(widget, clé)* à un palier donné.
 *
 * - `present` — l'extraction l'a lue dans le bytecode de ce palier.
 * - `attested` — l'extraction ne l'a pas vue ici mais la lit dans des paliers
 *   **postérieurs**, et un fichier réel de ce palier-ci la porte : c'est un trou de
 *   l'extraction, la clé existait. À ne jamais supprimer.
 * - `blind` — attestée quelque part, retrouvée dans aucun palier. L'extraction est
 *   aveugle de bout en bout sur cette clé ; on ne peut rien conclure de son silence.
 * - `legacy` — l'extraction ne la lit que dans des paliers **antérieurs**, et un
 *   fichier réel de ce palier-ci la porte quand même. XCTrack conserve les clés qu'il
 *   ne connaît plus : c'est un reliquat, et c'est exactement ce qu'un nettoyage ôte.
 * - `absent` — ni lue, ni attestée, alors que le widget, lui, est connu du palier.
 * - `unknown` — palier inconnu, ou widget absent de toute la base : on ne sait pas.
 *
 * Un nettoyage se défend sur `legacy` et `absent`, jamais sur `attested` ni `blind`.
 */
/**
 * Pourquoi un fichier réel porte une clé que le relevé de sa version ne connaît pas.
 *
 * - `gap` — la clé existait ; c'est le relevé qui l'a manquée (elle apparaît dans des
 *   paliers postérieurs).
 * - `legacy` — la clé n'existe plus ; **XCTrack conserve les clés qu'il ne connaît
 *   plus**, et le fichier en traîne une. C'est ce qu'un nettoyage ôte.
 * - `blind` — aucun palier ne la porte : rien à conclure.
 *
 * La preuve du cas `legacy` tient en une observation : dans un même fichier de 1.0.3,
 * sur cinq widgets cartographiques, deux portent `mapWidget_showTerrain` et trois
 * portent `mapWidget_panningTimeout` — jamais les deux. Les seconds ont été refaits
 * depuis le remplacement, les premiers non.
 */
export type AttestationKind = 'gap' | 'legacy' | 'blind'

/** Ordre d'examen : la nature la plus précise d'abord. */
const ATTESTATION_KINDS: AttestationKind[] = ['gap', 'legacy', 'blind']

export type KeyStatus =
  | 'present' | 'attested' | 'blind' | 'legacy' | 'absent' | 'unknown'

/**
 * `"0-2,5"` contient-il ce palier ?
 *
 * Les intervalles plutôt qu'une liste par clé : une option présente depuis toujours
 * coûte quatre caractères au lieu d'une centaine, et la base entière tient sous les
 * 100 Ko.
 */
export function tierInRange(spec: string, tier: number): boolean {
  if (spec === '') return false
  for (const part of spec.split(',')) {
    const dash = part.indexOf('-')
    if (dash < 0) {
      if (Number(part) === tier) return true
      continue
    }
    if (tier >= Number(part.slice(0, dash)) && tier <= Number(part.slice(dash + 1))) return true
  }
  return false
}

/**
 * Les bornes d'un intervalle `"0-2,5"` — ici 0 et 5. `null` pour l'intervalle vide.
 *
 * Les bornes, et non les paliers un à un : un intervalle troué (`"0-2,5"` ne contient pas
 * 3) reste un intervalle troué, et `tierInRange` est là pour cela. Ce qui se lit ici,
 * c'est « d'où à où », la seule question que pose le classement d'un palier par rapport à
 * une plage de lecture.
 */
export function spanBounds(spec: string): { min: number; max: number } | null {
  if (spec === '') return null
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const part of spec.split(',')) {
    const dash = part.indexOf('-')
    const low = dash < 0 ? Number(part) : Number(part.slice(0, dash))
    const high = dash < 0 ? Number(part) : Number(part.slice(dash + 1))
    if (Number.isNaN(low) || Number.isNaN(high)) continue
    min = Math.min(min, low)
    max = Math.max(max, high)
  }
  return min <= max ? { min, max } : null
}

/** La base chargée, avec ce qu'il faut pour l'interroger sans la reparcourir. */
export class VersionDatabase {
  private readonly tiersByCode = new Map<number, number[]>()

  constructor(readonly index: VersionIndex, readonly schema: VersionSchema) {
    for (const version of index.versions) {
      if (version.tier === null) continue // relevé en échec : pas de schéma connu
      const known = this.tiersByCode.get(version.code)
      if (known === undefined) this.tiersByCode.set(version.code, [version.tier])
      else known.push(version.tier)
    }
  }

  /**
   * Les paliers portant ce `versionCode`. Tableau vide si la base ne connaît pas la
   * version.
   *
   * **Plusieurs, parfois** : quatre APK déclarent `91192` avec trois inventaires de
   * clés différents. Le `versionCode` n'identifie donc pas un schéma, et une API qui
   * rendrait un palier unique masquerait le fait au lieu de le dire.
   */
  tiersOf(versionCode: number): number[] {
    return this.tiersByCode.get(versionCode) ?? []
  }

  /** Le palier décrit, ou `undefined` hors bornes. */
  tier(index: number): TierEntry | undefined {
    return this.index.tiers[index]
  }

  /** Les types de widgets que ce palier accepte. */
  widgetsAt(tier: number): string[] {
    return Object.keys(this.schema.widgetTiers)
      .filter((widget) => tierInRange(this.schema.widgetTiers[widget] ?? '', tier))
      .sort()
  }

  /** Les clés que l'extraction a lues pour ce widget à ce palier. */
  keysAt(widget: string, tier: number): string[] {
    const spans = this.schema.widgets[widget]
    if (spans === undefined) return []
    const keys: string[] = []
    for (const [span, names] of Object.entries(spans)) {
      if (tierInRange(span, tier)) keys.push(...names)
    }
    return keys.sort()
  }

  /**
   * Entre quels paliers l'extraction **lit** cette clé sur ce gadget — les bornes
   * seulement, ce qui suffit à situer un palier avant, après, ou entre les deux.
   * `null` quand aucun relevé ne la lit : l'extraction est alors muette, et son silence
   * ne conclut rien.
   *
   * C'est la question dont dépend le nettoyage : « depuis quelle version ce réglage
   * n'est-il plus lu ? » se répond par `max + 1`, et par rien d'autre.
   */
  keyReadBounds(widget: string, key: string): { min: number; max: number } | null {
    const spans = this.schema.widgets[widget]
    if (spans === undefined) return null
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const [span, keys] of Object.entries(spans)) {
      if (!keys.includes(key)) continue
      const bounds = spanBounds(span)
      if (bounds === null) continue
      min = Math.min(min, bounds.min)
      max = Math.max(max, bounds.max)
    }
    return min <= max ? { min, max } : null
  }

  /**
   * Ce que la base sait de ce couple à ce palier. Voir `KeyStatus` : seul `'absent'`
   * autorise un outil de nettoyage à proposer une suppression.
   */
  keyStatus(widget: string, key: string, tier: number): KeyStatus {
    if (tier < 0 || tier >= this.schema.tierCount) return 'unknown'
    const spans = this.schema.widgets[widget]
    if (spans !== undefined) {
      for (const [span, keys] of Object.entries(spans)) {
        if (keys.includes(key) && tierInRange(span, tier)) return 'present'
      }
    }
    const attestation = this.schema.attested[widget]?.[key]
    if (attestation !== undefined) {
      for (const kind of ATTESTATION_KINDS) {
        const span = attestation[kind]
        if (span !== undefined && tierInRange(span, tier)) {
          return kind === 'gap' ? 'attested' : kind
        }
      }
    }
    if (this.schema.blind[widget]?.includes(key) === true) return 'blind'
    // Le widget lui-même est-il connu de ce palier ? S'il ne l'est pas, on ne sait
    // rien de ses clés — et surtout pas qu'elles auraient été retirées.
    if (this.widgetStatus(widget, tier) !== 'present') return 'unknown'
    return 'absent'
  }

  /**
   * Ce type de widget existe-t-il à ce palier ? `unknown` quand la base ne connaît
   * pas ce type du tout — un widget qu'aucun relevé n'a vu n'est pas un widget retiré.
   */
  widgetStatus(widget: string, tier: number): 'present' | 'absent' | 'unknown' {
    const span = this.schema.widgetTiers[widget]
    if (span === undefined) return 'unknown'
    return tierInRange(span, tier) ? 'present' : 'absent'
  }
}

/**
 * Charge la base. Deux `import()` au chemin littéral : Vite en tire deux morceaux, et
 * ni l'un ni l'autre ne rejoint le morceau principal. Deux appels partagent la même
 * requête — le chargement est mémorisé, et l'échec oublié pour qu'un appel ultérieur
 * puisse retenter.
 */
let loading: Promise<VersionDatabase> | undefined

export function loadVersionDatabase(): Promise<VersionDatabase> {
  if (loading !== undefined) return loading
  const started = Promise.all([
    import('./widgetVersions/index.json'),
    import('./widgetVersions/schema.json'),
  ])
    .then(([index, schema]) => new VersionDatabase(
      index.default as unknown as VersionIndex,
      schema.default as unknown as VersionSchema,
    ))
    .catch((error: unknown) => {
      loading = undefined
      throw error
    })
  loading = started
  return started
}
