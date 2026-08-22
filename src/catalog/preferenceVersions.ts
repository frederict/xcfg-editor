/**
 * Base des versions de XCTrack, **côté préférences générales** : pour une clé de
 * préférence, dans quelles versions existe-t-elle ?
 *
 * C'est le pendant exact de `widgetVersions.ts`, qui répond à la même question pour
 * un couple *(widget, clé d'option)*. Même matière — les relevés d'APK de
 * `tools/extract-version-schema.py` —, même unité de choix, mêmes trois natures
 * d'attestation. Produite par `tools/build-preference-database.py`.
 *
 * ## Le palier, pas la version
 *
 * Cinquante-cinq relevés, quarante-sept inventaires distincts, **vingt-deux
 * paliers**. Deux versions consécutives qui lisent exactement les mêmes clés sont
 * indiscernables pour un outil de nettoyage : les distinguer dans un menu laisserait
 * croire à un choix qui n'en est pas un. `tiersOf()` traduit un `versionCode` en
 * numéros de palier — au pluriel, parce qu'un `versionCode` n'identifie pas un
 * schéma : `91192` est déclaré par quatre APK dont trois inventaires diffèrent.
 *
 * ## La portée ne définit pas un palier, et c'est mesuré
 *
 * On aurait pu faire entrer `PUBLIC`/`INTERNAL`/`SECURE` dans la signature d'un
 * palier : une clé qui passe `INTERNAL` change bel et bien ce qu'un export peut
 * porter. **Le corpus dit de ne pas le faire.** Dix relevés — de `0.9.9.1-beta-1` à
 * `0.9.10.3-15` — n'ont pas su identifier l'énumération de portée et rendent alors
 * *tout* en `PUBLIC` : 212 clés sur 212 pour `0.9.10-beta`, là où ses voisines en
 * comptent 142 à 158. Bâtir les paliers là-dessus aurait fabriqué deux ruptures
 * massives — 52 clés qui « passent » `PUBLIC` en `0.9.9.1`, 56 qui « repassent »
 * `INTERNAL` en `0.9.11.1` — dont aucune n'a eu lieu.
 *
 * Les versions concernées portent `scopeRead: false`. **Rien ne doit croire leur
 * portée**, et `TierEntry.publicCount` vaut alors `null`.
 *
 * Là même où la portée est lue, elle est un **minorant** : le relevé ne voit pas les
 * préférences dont la clé est posée par leur constructeur. Au dernier palier il en
 * compte 135 quand le fichier de sauvegarde de référence en porte 136 —
 * `SafeSky.Interval` est celle qui manque. `preferenceCatalog.ts`, qui lit la version
 * courante avec un autre outil, la voit ; cette base-ci ne la voit pas.
 *
 * ## Trois tables, parce que « je ne l'ai pas vue » n'est pas « elle n'existe pas »
 *
 * C'est la distinction dont tout dépend, et le corpus la prouve dans les deux sens :
 *
 * - `Sensors.ExtTypes` est lue jusqu'à `0.9.8.7` (palier 5) et plus jamais ensuite ;
 *   un fichier de `0.9.9.1` (palier 6) la porte encore. **XCTrack recopie les clés
 *   qu'il ne connaît plus** : c'est un reliquat, et c'est ce qu'un nettoyage ôte.
 * - `Sound.AcousticVario.CustomProfile` n'est lue qu'à partir de `1.0.0` (palier 18),
 *   et pourtant des fichiers de 2023, 2024 et 2025 la portent. **C'est notre relevé
 *   qui a un trou** : la clé existait, et la supprimer détruirait un réglage valide.
 *
 * Une base qui traiterait ces deux cas de la même façon serait nuisible dans les deux
 * sens. D'où :
 *
 * - `preferences` — ce que l'extraction a **lu**, par intervalles de paliers ;
 * - `attested` — ce qu'un fichier réel porte là où le relevé n'a rien vu, **avec la
 *   raison** : `gap` (trou du relevé) ou `legacy` (reliquat) ;
 * - `blind` — attestées quelque part, retrouvées dans aucun palier : notre silence ne
 *   dit rien. La table est **vide à ce jour**, et ce n'est pas une garantie : elle se
 *   remplira au premier fichier venu d'un appareil que nous n'avons pas.
 *
 * `keyStatus()` rend ces cas explicitement, et un outil de nettoyage n'a le droit de
 * proposer une suppression que sur `'legacy'`.
 *
 * ⚠️ Cette phrase a dit « `'legacy'` et `'absent'` » pendant une nuit — une troisième
 * règle, à côté des deux que portait `widgetVersions.ts`. `absent` veut dire « ni lue, ni
 * attestée » : aucun fichier réel ne vient dire que le réglage est bien un reliquat, et
 * la base compte cinq trous connus qui, sans les fichiers du corpus, auraient exactement
 * cette allure. La règle vit maintenant dans `CLEANABLE_STATUSES` (`src/model/cleanup.ts`),
 * avec son raisonnement.
 *
 * ## Chargement
 *
 * Rien n'est importé statiquement : `loadPreferenceVersions()` fait deux `import()`,
 * dont Vite tire des morceaux séparés. Un pilote qui ouvre une configuration sans
 * jamais demander de diagnostic ne les télécharge pas.
 */

/** Une version de XCTrack, telle que son `AndroidManifest.xml` la déclare. */
export interface PreferenceVersionEntry {
  /** `versionCode` : c'est lui qui fait autorité, jamais le nom du fichier APK. */
  code: number
  /** `versionName`, tel que `info.versionName` l'écrit dans un `.xcfg`. */
  name: string
  /** Tous les `versionName` menant à ce même inventaire sous ce même `versionCode`. */
  names: string[]
  /** Fichiers d'archive ayant livré cet inventaire. */
  sources: string[]
  tier: number
  /**
   * Version publiée (`0.9.12.6`) plutôt que construction intermédiaire
   * (`0.9.11.11-326-g5df67c585`). Un pilote n'a jamais installé les secondes : un
   * sélecteur a tout intérêt à ne proposer que les premières, même si leur inventaire
   * compte tout autant pour reconstituer l'histoire.
   */
  release: boolean
  /**
   * L'énumération de portée a-t-elle été trouvée dans le bytecode de cette version ?
   * Fausse pour huit d'entre elles, qui rendent alors tout en `PUBLIC` : leur portée
   * ne vaut rien, et `publicCount` vaut `null` pour les paliers concernés.
   */
  scopeRead: boolean
}

/** Un palier : des versions consécutives qui lisent exactement les mêmes clés. */
export interface PreferenceTierEntry {
  tier: number
  firstCode: number
  firstName: string
  lastCode: number
  lastName: string
  versionCodes: number[]
  /** Les seules versions publiées du palier — souvent une, parfois aucune. */
  releaseNames: string[]
  keyCount: number
  /**
   * Combien de clés le relevé déclare `PUBLIC` — un **minorant** du nombre de clés
   * qu'un export `backup` porte, et `null` quand la portée n'a pas été lue. Voir
   * l'en-tête du module.
   */
  publicCount: number | null
  /** Ce qui a changé par rapport au palier précédent — c'est ce qui le justifie. */
  keysAdded: string[]
  keysRemoved: string[]
}

/** Un relevé qu'on n'a pas su lire : il n'a pas un inventaire vide, mais aucun. */
export interface PreferenceVersionFailure {
  source: string
  reason: string
}

/** Confrontation d'un palier aux fichiers `.xcfg` réels qui en proviennent. */
export interface PreferenceCorpusCheck {
  code: number
  /** Le palier, quand un seul porte ce `versionCode` ; `null` s'ils sont plusieurs. */
  tier: number | null
  tiers: number[]
  /**
   * Combien de fichiers réels appuient cette confrontation. Un **décompte**, jamais
   * des noms : le corpus vit dans un dépôt privé et ses fichiers s'appellent d'après
   * le pilote. Le nombre porte toute l'information utile ici.
   */
  fileCount: number
  /** Nombre de clés que les fichiers de cette version portent. */
  keys: number
  matched: number
  unmatched: string[]
  /**
   * `versionCode` réellement relevé, quand celui du fichier ne figure dans aucune
   * archive et que la base se replie sur le plus proche. `91230` (0.9.12.3) est dans
   * ce cas : des fichiers du corpus le déclarent, aucun APK ne le porte.
   *
   * **Ce n'est pas la même version, c'est la plus proche que nous ayons pu lire.**
   * Toute interface qui s'appuie sur ce repli doit le dire au pilote.
   */
  approximatedBy: number | null
  note: string | null
}

export interface PreferenceVersionIndex {
  meta: {
    generatedBy: string
    versionCount: number
    tierCount: number
    failureCount: number
    /** Clés distinctes sur toute l'histoire — bien plus que celles d'un palier. */
    keyCount: number
    oldest: string | null
    newest: string | null
  }
  versions: PreferenceVersionEntry[]
  tiers: PreferenceTierEntry[]
  failures: PreferenceVersionFailure[]
  versionCodeConflicts: Array<{
    code: number
    sources: string[]
    note: string
    keyCounts: number[]
  }>
  corpus: PreferenceCorpusCheck[]
  /**
   * Fichiers du corpus écartés, par raison — un export de pages n'accorde rien, et
   * confondre son silence avec un accord gonflerait le taux de réussite.
   */
  corpusSkipped: Array<{ reason: string, fileCount: number }>
}

/**
 * Pourquoi un fichier réel porte une clé que le relevé de sa version ne connaît pas.
 *
 * - `gap` — la clé existait ; c'est le relevé qui l'a manquée (elle reparaît dans des
 *   paliers postérieurs).
 * - `legacy` — la clé n'existe plus ; **XCTrack recopie les clés qu'il ne connaît
 *   plus**, et le fichier en traîne une. C'est ce qu'un nettoyage ôte.
 * - `blind` — aucun palier ne la lit : rien à conclure.
 */
export type PreferenceAttestationKind = 'gap' | 'legacy' | 'blind'

/** Ordre d'examen : la nature la plus précise d'abord. */
const ATTESTATION_KINDS: PreferenceAttestationKind[] = ['gap', 'legacy', 'blind']

/**
 * Ce que le relevé retenait d'une clé au dernier palier qui la lisait — celles-là
 * seules, puisque le catalogue courant décrit déjà les autres.
 */
export interface RetiredPreference {
  /** Absente quand la version qui la portait n'avait pas de portée lisible. */
  scope?: string
  valueKind?: string
  control?: string
  /** Clé de ressource du libellé. Les textes de ce palier ne sont pas publiés ici. */
  label?: string
  family?: string
  personal?: { kind: string, basis: string, reason: string }
  /** Dernier palier qui lisait cette clé. */
  lastTier: number
}

export interface PreferenceVersionSchema {
  tierCount: number
  /** `{intervalle de paliers: clés}` — ce que l'extraction a lu. */
  preferences: Record<string, string[]>
  /** `{clé: {nature: intervalle}}` — attestée par un fichier réel, absente du relevé. */
  attested: Record<string, Partial<Record<PreferenceAttestationKind, string>>>
  /** Attestées quelque part, extraites nulle part : l'absence ne prouve rien. */
  blind: string[]
  /** Ce que le catalogue courant ne décrit plus, faute d'exister encore. */
  retired: Record<string, RetiredPreference>
}

/**
 * Ce que la base sait d'une clé à un palier donné.
 *
 * - `present` — l'extraction l'a lue dans le bytecode de ce palier.
 * - `attested` — l'extraction ne l'a pas vue ici mais la lit dans des paliers
 *   **postérieurs**, et un fichier réel de ce palier-ci la porte : trou du relevé, la
 *   clé existait. À ne jamais supprimer.
 * - `blind` — attestée quelque part, retrouvée dans aucun palier : on ne peut rien
 *   conclure de notre silence. À ne jamais supprimer.
 * - `legacy` — l'extraction ne la lit que dans des paliers **antérieurs**, et un
 *   fichier réel de ce palier-ci la porte quand même : c'est un reliquat.
 * - `absent` — ni lue ici, ni attestée ici, mais **connue d'un autre palier** : la clé
 *   a existé dans XCTrack, pas à ce palier-ci.
 * - `unknown` — palier hors bornes, ou clé qu'aucun palier ne lit et qu'aucun fichier
 *   n'atteste. La base n'en sait **rien**, et ne pas savoir n'autorise pas à effacer.
 *   C'est la différence qui protège les clés venues d'un appareil que nous n'avons pas
 *   relevé.
 */
export type PreferenceKeyStatus =
  | 'present' | 'attested' | 'blind' | 'legacy' | 'absent' | 'unknown'

/**
 * `"0-2,5"` contient-il ce palier ?
 *
 * Les intervalles plutôt qu'une liste par clé : une préférence présente depuis
 * toujours coûte quatre caractères au lieu d'une centaine.
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

/** La base chargée, avec ce qu'il faut pour l'interroger sans la reparcourir. */
export class PreferenceVersionDatabase {
  private readonly tiersByCode = new Map<number, number[]>()
  private readonly keysByTier: string[][]
  /** Toute clé qu'au moins un palier lit — la mémoire de la base, tous paliers confondus. */
  private readonly everKnown = new Set<string>()

  constructor(
    readonly index: PreferenceVersionIndex,
    readonly schema: PreferenceVersionSchema,
  ) {
    for (const version of index.versions) {
      const known = this.tiersByCode.get(version.code)
      if (known === undefined) this.tiersByCode.set(version.code, [version.tier])
      else known.push(version.tier)
    }
    this.keysByTier = Array.from({ length: schema.tierCount }, () => [] as string[])
    for (const [span, keys] of Object.entries(schema.preferences)) {
      for (const key of keys) this.everKnown.add(key)
      for (let tier = 0; tier < schema.tierCount; tier += 1) {
        if (tierInRange(span, tier)) this.keysByTier[tier]!.push(...keys)
      }
    }
    for (const keys of this.keysByTier) keys.sort()
  }

  /**
   * Les paliers portant ce `versionCode`. Tableau vide si la base ne connaît pas la
   * version.
   *
   * **Plusieurs, parfois** : six `versionCode` sont partagés par des inventaires
   * différents. Une API qui rendrait un palier unique masquerait le fait au lieu de
   * le dire.
   */
  tiersOf(versionCode: number): number[] {
    return this.tiersByCode.get(versionCode) ?? []
  }

  /** Le palier décrit, ou `undefined` hors bornes. */
  tier(index: number): PreferenceTierEntry | undefined {
    return this.index.tiers[index]
  }

  /** Les clés que l'extraction a lues à ce palier, dans l'ordre alphabétique. */
  keysAt(tier: number): string[] {
    return this.keysByTier[tier] ?? []
  }

  /**
   * Ce que la base sait de cette clé à ce palier. Voir `PreferenceKeyStatus` : seuls
   * `'legacy'` et `'absent'` autorisent à proposer une suppression.
   */
  keyStatus(key: string, tier: number): PreferenceKeyStatus {
    if (tier < 0 || tier >= this.schema.tierCount) return 'unknown'
    for (const [span, keys] of Object.entries(this.schema.preferences)) {
      if (keys.includes(key) && tierInRange(span, tier)) return 'present'
    }
    const attestation = this.schema.attested[key]
    if (attestation !== undefined) {
      for (const kind of ATTESTATION_KINDS) {
        const span = attestation[kind]
        if (span !== undefined && tierInRange(span, tier)) {
          return kind === 'gap' ? 'attested' : kind
        }
      }
    }
    if (this.schema.blind.includes(key)) return 'blind'
    // Une clé qu'aucun palier ne lit et qu'aucun fichier n'atteste n'est pas une clé
    // retirée : c'est une clé dont la base ne sait rien. Le dire, plutôt que
    // d'autoriser un nettoyage sur du vide.
    if (!this.everKnown.has(key)) return 'unknown'
    return 'absent'
  }

  /** Vrai si au moins un palier lit cette clé. À demander avant d'interpréter `'absent'`. */
  knows(key: string): boolean {
    return this.everKnown.has(key)
  }

  /**
   * Ce que le relevé retenait d'une clé qui n'existe plus au dernier palier —
   * `undefined` pour toute clé que le catalogue courant décrit encore, puisque c'est
   * lui qui fait alors autorité.
   */
  retired(key: string): RetiredPreference | undefined {
    return this.schema.retired[key]
  }

  /** La confrontation au corpus pour ce `versionCode`, si elle a eu lieu. */
  corpusCheck(versionCode: number): PreferenceCorpusCheck | undefined {
    return this.index.corpus.find((check) => check.code === versionCode)
  }
}

/**
 * Charge la base. Deux `import()` au chemin littéral : Vite en tire deux morceaux, et
 * ni l'un ni l'autre ne rejoint le morceau principal. Deux appels partagent la même
 * requête — le chargement est mémorisé, et l'échec oublié pour qu'un appel ultérieur
 * puisse retenter.
 */
let loading: Promise<PreferenceVersionDatabase> | undefined

export function loadPreferenceVersions(): Promise<PreferenceVersionDatabase> {
  if (loading !== undefined) return loading
  const started = Promise.all([
    import('./preferenceVersions/index.json'),
    import('./preferenceVersions/schema.json'),
  ])
    .then(([index, schema]) => new PreferenceVersionDatabase(
      index.default as unknown as PreferenceVersionIndex,
      schema.default as unknown as PreferenceVersionSchema,
    ))
    .catch((error: unknown) => {
      loading = undefined
      throw error
    })
  loading = started
  return started
}
