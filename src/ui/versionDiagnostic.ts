import { readableName } from '../catalog/widgetNames'
import {
  loadVersionDatabase,
  type CorpusCheck,
  type KeyStatus,
  type VersionDatabase
} from '../catalog/widgetVersions'
import { getMember, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { readLayout, type Layout } from '../model/layout'
import { widgetOptionKeys } from '../model/widget'
import { buildCleanupSection, type CleanupEvent, type CleanupSection } from './cleanupPanel'
import type { CleanupPlan } from '../model/cleanup'
import './versionDiagnostic.css'

/**
 * Choix de la version de XCTrack visée, et **diagnostic** du document ouvert contre ce
 * choix. Le diagnostic lui-même ne supprime rien et ne modifie rien : il dit ce que la
 * base des versions sait, et surtout ce qu'elle ne sait pas.
 *
 * Le **nettoyage** se pose sous lui, et seulement si l'hôte l'ouvre en fournissant
 * `onCleanup` (voir `VersionPanelOptions`). Il ne se défend que sur ce que ce diagnostic
 * sait affirmer — la seule famille `legacy`, celle qu'un fichier réel atteste — et il est
 * écrit ailleurs : `src/ui/cleanupPanel.ts` pour l'écran, `src/model/cleanup.ts` pour le
 * plan et le retrait.
 *
 * ## Cinq décisions, et leurs raisons
 *
 * 1. **Le menu propose des paliers, pas des versions.** 47 versions relevées, 21
 *    schémas distincts : deux versions au schéma identique sont indiscernables pour cet
 *    outil, et les distinguer laisserait croire à un choix sans effet.
 *
 * 2. **Et seulement les paliers qui portent une version publiée** — 11 des 21. Sinon le
 *    pilote choisirait entre quatre constructions intermédiaires de 0.9.11.11, qu'il n'a
 *    jamais installées. Exception assumée : si le fichier ouvert désigne lui-même une
 *    construction non publiée (le cas de `gson-2022.xcfg`, paliers 0 et 1), ce palier-là
 *    est ajouté au menu dans un groupe à part — le masquer rendrait l'outil inutile
 *    précisément pour le fichier qu'on regarde.
 *
 * 3. **L'écart affiché est cumulé depuis le palier proposé précédent**, jamais depuis le
 *    palier immédiatement antérieur. `TierEntry.keysAdded` compare au palier n-1, qui
 *    n'est souvent pas dans le menu : afficher « 2 réglages ajoutés » pour 1.0.0-RC2
 *    alors que 140 séparent 0.9.12.6 de 1.0.0-RC2 serait faux. L'écart est donc recalculé
 *    par différence d'ensembles entre les deux paliers réellement proposés.
 *
 * 4. **Un `versionCode` ne désigne pas un palier.** Cinq collisions connues. Quand il en
 *    désigne plusieurs, on présélectionne **le plus récent**, on le dit, on liste les
 *    autres — et chaque constat du diagnostic est recalculé sous *tous* les paliers
 *    candidats : celui qui change d'un palier à l'autre est marqué « constat instable ».
 *    Le choix arbitraire devient alors sans conséquence, parce qu'il est mesuré.
 *
 * 5. **Le diagnostic se raisonne par instance de gadget, jamais par type.** Une même clé
 *    peut être un reliquat sur un gadget et courante sur un autre dans le même fichier —
 *    c'est le cas mesuré dans une sauvegarde 1.0.3, où deux cartes portent
 *    `mapWidget_showTerrain` et trois `mapWidget_panningTimeout`, jamais les deux.
 *
 * ## Ce que le diagnostic ne couvre pas
 *
 * La base des versions ne décrit que les **gadgets** et leurs options. Tout le reste
 * d'une sauvegarde — réglages du vario, unités, capteurs, espaces aériens — n'y est pas :
 * ce module n'en dit donc rien, et ne doit pas laisser croire le contraire.
 *
 * Les cinq clés de structure (`CLASS`, `X1`, `Y1`, `X2`, `Y2`) ne sont pas des réglages
 * et ne figurent dans aucun relevé : elles sont écartées du décompte, sans quoi chaque
 * gadget produirait cinq constats faux.
 */

/* ------------------------------------------------------------------ vocabulaire */

/**
 * Ce que le fichier dit de sa propre origine. `null` quand `info` ne le dit pas — le
 * cas des exports de 2022, dont l'`info` ne porte même pas d'`exportType`.
 */
export interface DocumentVersion {
  code: number | null
  name: string | null
}

export function readDocumentVersion(document: JsonNode): DocumentVersion {
  const info = getMember(document, 'info')
  if (info === undefined) return { code: null, name: null }
  return {
    code: readNumber(info, 'versionCode') ?? null,
    name: readString(info, 'versionName') ?? null
  }
}

/** Un palier tel que le menu le présente. */
export interface TierOption {
  tier: number
  /** La version publiée qui ouvre le palier — ce qui l'identifie pour le pilote. */
  openingRelease: string
  /** Toutes les versions publiées que le palier couvre. */
  releaseNames: string[]
  /** Vrai quand le palier ne porte aucune version publiée (construction intermédiaire). */
  unpublished: boolean
  /** Première et dernière version du palier, publiées ou non. */
  firstName: string
  lastName: string
  /** Libellé de l'option `<option>`. */
  label: string
  /** Ce qui a changé depuis le palier proposé précédent. */
  delta: TierDelta
}

/**
 * Différence exacte entre deux paliers, calculée par différence d'ensembles sur le
 * schéma — et non par cumul des `keysAdded` intermédiaires, qui compterait une clé
 * ajoutée puis retirée entre-temps.
 */
export interface TierDelta {
  /** Palier de comparaison ; `null` pour le premier proposé, qui n'en a pas. */
  fromTier: number | null
  fromName: string | null
  widgetsAdded: string[]
  widgetsRemoved: string[]
  /** Réglages ajoutés **sur des gadgets qui existaient déjà** — pas ceux des nouveaux. */
  keysAdded: Array<{ widget: string; keys: string[] }>
  keysRemoved: Array<{ widget: string; keys: string[] }>
  keysAddedCount: number
  keysRemovedCount: number
  /** Une phrase, celle qui justifie le choix du palier. */
  summary: string
}

/** Comment la présélection a été obtenue. Le message reste l'autorité. */
export type SuggestionBasis =
  /** Un seul palier porte ce `versionCode`. */
  | 'exact'
  /** Plusieurs paliers le portent : le fichier ne dit pas lequel l'a écrit. */
  | 'ambiguous'
  /** Aucun APK ne porte ce numéro ; la base déclare un repli (`approximatedBy`). */
  | 'approximated'
  /** Le fichier déclare un numéro que la base ne connaît pas, sans repli déclaré. */
  | 'unrecognized'
  /** Le fichier ne déclare pas de `versionCode`. */
  | 'undeclared'

export interface VersionSuggestion {
  version: DocumentVersion
  basis: SuggestionBasis
  /** Les paliers que ce numéro désigne, dans l'ordre. Vide si on ne sait pas. */
  candidateTiers: number[]
  /** Le palier présélectionné, ou `null` quand rien ne permet d'en désigner un. */
  selected: number | null
  /** Le numéro sur lequel la base s'est repliée, quand elle l'a fait. */
  approximatedFrom: number | null
  /** Ce qu'on dit au pilote, sans rien affirmer de plus que ce qu'on sait. */
  message: string
}

/**
 * Nature d'un constat. Les six premières valeurs raffinent `KeyStatus` : `absent` y est
 * éclaté selon **où** le relevé lit la clé, parce qu'une clé apparue *après* le palier
 * visé et une clé lue *avant* seulement n'appellent pas du tout la même conduite.
 */
export type FindingCategory =
  /** `legacy` — attestée après le dernier palier qui la lit. Un reliquat. */
  | 'legacy'
  /** `absent`, lue uniquement à des paliers antérieurs. Reliquat non attesté. */
  | 'past-only'
  /** `absent`, lue uniquement à des paliers postérieurs. Le fichier est plus récent. */
  | 'future-only'
  /** `absent`, lue avant ET après, pas au palier visé : un trou du relevé. */
  | 'straddled'
  /** `absent`, lue nulle part et attestée nulle part. */
  | 'never-read'
  /** `attested` — attestée avant le premier palier qui la lit : trou du relevé. */
  | 'gap'
  /** `blind` — attestée quelque part, lue par aucun palier. */
  | 'blind'
  /** Le gadget lui-même n'est pas connu du palier visé. */
  | 'unknown-widget'

/** Ce qu'un outil de nettoyage aurait le droit de faire d'un constat. */
export type RemovalStance =
  /** Une suppression se défend. */
  | 'defensible'
  /** Ne jamais supprimer : le réglage est valide. */
  | 'never'
  /** Nous ne savons pas — et ne pas savoir n'est pas une autorisation. */
  | 'undecided'

export interface CategoryDescription {
  category: FindingCategory
  /** Le mot du bandeau, celui qui distingue les cas à l'œil. */
  badge: string
  title: string
  /** Ce que la base sait, dit comme elle le sait. */
  evidence: string
  /** Ce qu'un nettoyage peut en faire, et rien de plus. */
  verdict: string
  removal: RemovalStance
}

/**
 * Les huit cas, rédigés une fois pour toutes.
 *
 * Le ton n'est pas un ornement : « cette clé est inconnue du palier visé » n'est pas
 * « cette clé est obsolète », et « notre relevé ne l'a jamais vue » n'est pas « XCTrack
 * l'a retirée ». Confondre `gap` et `legacy` conduirait à effacer des réglages valides ;
 * c'est la distinction dont dépend tout ce chantier, et elle tient dans ces phrases.
 */
export const CATEGORIES: Record<FindingCategory, CategoryDescription> = {
  legacy: {
    category: 'legacy',
    badge: 'reliquat',
    title: 'Reliquats : le palier visé ne lit plus ces réglages',
    evidence:
      'Notre relevé lit ces réglages dans des versions antérieures, plus dans celle-ci — ' +
      'et des fichiers réels écrits par cette version-là les portent quand même. XCTrack ' +
      'conserve les clés qu’il ne connaît plus : c’est un reliquat, mesuré, pas déduit.',
    verdict:
      'Une suppression se défend ici. C’est le seul cas que la base atteste par un ' +
      'fichier réel.',
    removal: 'defensible'
  },
  'past-only': {
    category: 'past-only',
    badge: 'antérieur',
    title: 'Lus par des versions antérieures seulement',
    evidence:
      'Notre relevé lit ces réglages à des paliers antérieurs, plus au palier visé. Aucun ' +
      'fichier réel du corpus ne vient l’attester : la preuve est celle du relevé seul, ' +
      'plus faible que pour un reliquat attesté.',
    verdict:
      'Une suppression se défend, sur la foi du relevé. Rien ne dit que XCTrack les ait ' +
      'retirés : il dit seulement que nous ne les y lisons plus.',
    removal: 'defensible'
  },
  'future-only': {
    category: 'future-only',
    badge: 'postérieur',
    title: 'Apparus après le palier visé',
    evidence:
      'Notre relevé ne lit ces réglages qu’à des paliers postérieurs à celui visé. Ce ' +
      'fichier vient donc d’une version plus récente que la version choisie ici.',
    verdict:
      'Ne pas supprimer. La version visée les ignore ; une version ultérieure les ' +
      'retrouvera intacts.',
    removal: 'never'
  },
  straddled: {
    category: 'straddled',
    badge: 'trou de relevé',
    title: 'Lus avant et après le palier visé, mais pas à ce palier',
    evidence:
      'Notre relevé lit ces réglages de part et d’autre du palier visé et les manque ici. ' +
      'Une option qui disparaîtrait pour reparaître à l’identique serait une singularité ; ' +
      'un trou de notre extraction est l’explication ordinaire.',
    verdict: 'Ne pas supprimer. L’anomalie est de notre côté, pas dans le fichier.',
    removal: 'never'
  },
  'never-read': {
    category: 'never-read',
    badge: 'inconnu',
    title: 'Inconnus de toute la base',
    evidence:
      'Aucun relevé, d’aucune des 47 versions, ne porte ce réglage sur ce gadget, et aucun ' +
      'fichier du corpus ne l’atteste. Nous ne savons pas d’où il vient.',
    verdict:
      'Nous ne savons pas. Ce n’est pas la preuve que le réglage soit caduc — seulement ' +
      'que notre relevé ne le connaît pas.',
    removal: 'undecided'
  },
  gap: {
    category: 'gap',
    badge: 'trou de relevé',
    title: 'Trous de notre relevé : le réglage existait',
    evidence:
      'Notre relevé n’a pas vu ces réglages à ce palier, mais il les lit à des paliers ' +
      'postérieurs, et un fichier réel de ce palier-ci les porte. Le réglage existait bien : ' +
      'c’est notre extraction qui l’a manqué.',
    verdict:
      'Ne jamais supprimer. Ce sont des réglages valides, et les confondre avec des ' +
      'reliquats effacerait des réglages du pilote.',
    removal: 'never'
  },
  blind: {
    category: 'blind',
    badge: 'aveugle',
    title: 'Réglages sur lesquels notre relevé est aveugle',
    evidence:
      'Attestés par des fichiers réels, retrouvés dans aucun palier, d’aucune version. ' +
      'Notre extraction ne les lit nulle part : son silence ne dit rien.',
    verdict: 'Rien à conclure. Ne pas supprimer sur cette base.',
    removal: 'undecided'
  },
  'unknown-widget': {
    category: 'unknown-widget',
    badge: 'gadget inconnu',
    title: 'Gadgets que le palier visé ne connaît pas',
    evidence:
      'Le type de gadget lui-même est absent du relevé de ce palier. Nous ne savons donc ' +
      'rien de ses réglages : un gadget qu’aucun relevé n’a vu n’est pas un gadget retiré.',
    verdict: 'Rien à conclure sur ses réglages.',
    removal: 'undecided'
  }
}

/** L'ordre d'affichage : d'abord ce sur quoi on peut agir, ensuite ce qu'on ignore. */
export const CATEGORY_ORDER: FindingCategory[] = [
  'legacy',
  'past-only',
  'future-only',
  'straddled',
  'gap',
  'blind',
  'never-read',
  'unknown-widget'
]

export type Orientation = 'portrait' | 'landscape'

const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: 'Portrait',
  landscape: 'Paysage'
}

/** Où se trouve le gadget dont on parle, pour que le pilote le retrouve. */
export interface WidgetPlace {
  orientation: Orientation
  /** Rang de la page, à partir de 1 — celui qu'affiche l'interface. */
  page: number
  /** Rang du gadget dans la page, à partir de 1, dans l'ordre de dessin. */
  rank: number
  className: string
  shortName: string
  /** Nom lisible du type de gadget, dans la langue demandée. */
  label: string
}

export interface KeyFinding {
  place: WidgetPlace
  key: string
  status: KeyStatus
  category: FindingCategory
  /**
   * Le constat vaut-il sous **tous** les paliers que le `versionCode` désigne ? Faux
   * quand le choix arbitraire du plus récent change la conclusion.
   */
  stable: boolean
  /** Ce que disent les autres paliers candidats, quand ils divergent. */
  divergences: Array<{ tier: number; category: FindingCategory | null }>
}

export interface WidgetFinding {
  place: WidgetPlace
  status: 'absent' | 'unknown'
}

export interface Diagnosis {
  tier: number
  /** Comment nommer le palier au pilote : « 1.0.0-RC2 » ou « palier 15 ». */
  tierLabel: string
  /** Gadgets examinés, toutes orientations et pages confondues. */
  widgetCount: number
  /** Réglages examinés, clés de structure exclues. */
  keyCount: number
  /** Réglages que le palier visé lit — le cas ordinaire. */
  recognizedCount: number
  counts: Record<FindingCategory, number>
  statusCounts: Record<KeyStatus, number>
  keyFindings: KeyFinding[]
  widgetFindings: WidgetFinding[]
  /** Paliers sous lesquels la stabilité a été éprouvée ; un seul le plus souvent. */
  candidateTiers: number[]
  /** Constats qui changent d'un palier candidat à l'autre. */
  unstableCount: number
}

/* ---------------------------------------------------------------- lecture du schéma */

/**
 * Le raffinement de `KeyStatus` en `FindingCategory`. `absent` est le seul cas qui
 * demande un examen supplémentaire : il recouvre quatre situations dont deux interdisent
 * la suppression.
 */
export function categoryOf(
  db: VersionDatabase, widget: string, key: string, tier: number, status: KeyStatus
): FindingCategory | null {
  switch (status) {
    case 'present': return null
    case 'legacy': return 'legacy'
    case 'attested': return 'gap'
    case 'blind': return 'blind'
    case 'unknown': return 'unknown-widget'
    case 'absent': break
  }
  const bounds = db.keyReadBounds(widget, key)
  if (bounds === null) return 'never-read'
  if (bounds.max < tier) return 'past-only'
  if (bounds.min > tier) return 'future-only'
  return 'straddled'
}

/* ---------------------------------------------------------------- le menu de paliers */

function emptyCounts(): Record<FindingCategory, number> {
  return {
    legacy: 0, 'past-only': 0, 'future-only': 0, straddled: 0,
    'never-read': 0, gap: 0, blind: 0, 'unknown-widget': 0
  }
}

function emptyStatusCounts(): Record<KeyStatus, number> {
  return { present: 0, attested: 0, blind: 0, legacy: 0, absent: 0, unknown: 0 }
}

/** `{gadget → clés}` que le relevé lit à ce palier. */
function pairsAt(db: VersionDatabase, tier: number): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>()
  for (const widget of db.widgetsAt(tier)) {
    table.set(widget, new Set(db.keysAt(widget, tier)))
  }
  return table
}

/** Un nombre à la française : 1 059, avec l'espace fine insécable. */
function french(value: number): string {
  return value.toLocaleString('fr-FR')
}

function plural(count: number, one: string, many: string): string {
  return `${french(count)} ${count > 1 ? many : one}`
}

/**
 * L'écart entre deux paliers, calculé sur les ensembles et non cumulé. Les réglages
 * apportés par un gadget entièrement nouveau ne sont **pas** comptés parmi les réglages
 * ajoutés : ils seraient comptés deux fois, et gonfleraient l'écart d'une manière que
 * le pilote ne pourrait pas relire.
 */
export function tierDelta(
  db: VersionDatabase, fromTier: number | null, toTier: number, language = 'fr'
): TierDelta {
  const target = db.tier(toTier)
  const source = fromTier === null ? undefined : db.tier(fromTier)
  if (fromTier === null || source === undefined) {
    return {
      fromTier: null,
      fromName: null,
      widgetsAdded: [],
      widgetsRemoved: [],
      keysAdded: [],
      keysRemoved: [],
      keysAddedCount: 0,
      keysRemovedCount: 0,
      summary:
        'Premier palier proposé : il n’y a rien avant lui dans ce menu, donc rien à ' +
        `comparer. ${plural(target?.widgetCount ?? 0, 'gadget connu', 'gadgets connus')}.`
    }
  }

  const before = pairsAt(db, fromTier)
  const after = pairsAt(db, toTier)

  const widgetsAdded = [...after.keys()].filter((w) => !before.has(w)).sort()
  const widgetsRemoved = [...before.keys()].filter((w) => !after.has(w)).sort()

  const keysAdded: Array<{ widget: string; keys: string[] }> = []
  const keysRemoved: Array<{ widget: string; keys: string[] }> = []
  let keysAddedCount = 0
  let keysRemovedCount = 0

  for (const [widget, keys] of after) {
    const previous = before.get(widget)
    if (previous === undefined) continue // gadget neuf : compté comme gadget, pas en clés
    const added = [...keys].filter((key) => !previous.has(key)).sort()
    if (added.length > 0) {
      keysAdded.push({ widget, keys: added })
      keysAddedCount += added.length
    }
  }
  for (const [widget, keys] of before) {
    const next = after.get(widget)
    if (next === undefined) continue // gadget disparu : compté comme gadget
    const removed = [...keys].filter((key) => !next.has(key)).sort()
    if (removed.length > 0) {
      keysRemoved.push({ widget, keys: removed })
      keysRemovedCount += removed.length
    }
  }

  const parts: string[] = []
  if (widgetsAdded.length > 0) {
    parts.push(plural(widgetsAdded.length, 'gadget ajouté', 'gadgets ajoutés'))
  }
  if (widgetsRemoved.length > 0) {
    parts.push(plural(widgetsRemoved.length, 'gadget retiré', 'gadgets retirés'))
  }
  if (keysAddedCount > 0) {
    parts.push(plural(keysAddedCount, 'réglage ajouté', 'réglages ajoutés'))
  }
  if (keysRemovedCount > 0) {
    parts.push(plural(keysRemovedCount, 'réglage retiré', 'réglages retirés'))
  }

  const fromName = releaseLabel(db, fromTier)
  const summary = parts.length === 0
    ? `Rien ne distingue ce palier de ${fromName} dans notre relevé.`
    : `Depuis ${fromName} : ${parts.join(', ')}.`

  return {
    fromTier,
    fromName,
    widgetsAdded: widgetsAdded.map((w) => readableName(w, language)),
    widgetsRemoved: widgetsRemoved.map((w) => readableName(w, language)),
    keysAdded,
    keysRemoved,
    keysAddedCount,
    keysRemovedCount,
    summary
  }
}

/** Comment nommer un palier : par sa version publiée quand il en a une. */
export function releaseLabel(db: VersionDatabase, tier: number): string {
  const entry = db.tier(tier)
  if (entry === undefined) return `palier ${tier}`
  const first = entry.releaseNames[0]
  if (first !== undefined) return first
  return `palier ${tier} (${entry.firstName})`
}

/**
 * Les paliers du menu : ceux qui portent au moins une version publiée, plus ceux que le
 * fichier ouvert désigne, fussent-ils des constructions intermédiaires.
 */
export function tierOptions(
  db: VersionDatabase, extraTiers: number[] = [], language = 'fr'
): TierOption[] {
  const wanted = new Set<number>()
  db.index.tiers.forEach((entry, index) => {
    if (entry.releaseNames.length > 0) wanted.add(index)
  })
  for (const tier of extraTiers) {
    if (db.tier(tier) !== undefined) wanted.add(tier)
  }

  const ordered = [...wanted].sort((a, b) => a - b)
  let previous: number | null = null
  const options: TierOption[] = []
  for (const tier of ordered) {
    const entry = db.tier(tier)
    if (entry === undefined) continue
    const releases = [...new Set(entry.releaseNames)]
    const opening = releases[0]
    const delta = tierDelta(db, previous, tier, language)
    const covered = releases.length > 1
      ? ` — ${plural(releases.length, 'version publiée', 'versions publiées')}`
      : ''
    options.push({
      tier,
      openingRelease: opening ?? '',
      releaseNames: releases,
      unpublished: opening === undefined,
      firstName: entry.firstName,
      lastName: entry.lastName,
      label: opening === undefined
        ? `Palier ${tier} — construction ${entry.firstName}`
        : `${opening}${covered}`,
      delta
    })
    previous = tier
  }
  return options
}

/* ------------------------------------------------------------------ présélection */

/** `corpus[].approximatedBy` existe dans la base ; l'interface ne l'a pas encore. */
type CorpusFallback = CorpusCheck & { approximatedBy?: number | null }

function corpusEntry(db: VersionDatabase, code: number): CorpusFallback | undefined {
  return db.index.corpus.find((entry) => entry.code === code)
}

function knownCodeRange(db: VersionDatabase): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const version of db.index.versions) {
    min = Math.min(min, version.code)
    max = Math.max(max, version.code)
  }
  return min <= max ? { min, max } : null
}

/**
 * Le palier à présélectionner, et pourquoi.
 *
 * Trois cas qui ne se confondent pas :
 *
 * - **un seul palier** — on le retient, sans réserve ;
 * - **plusieurs** — le fichier ne dit pas lequel l'a écrit. On retient le plus récent,
 *   on le dit, et le diagnostic marque tout constat qui changerait sous un autre ;
 * - **aucun** — soit la base ne connaît pas ce numéro (on ne choisit rien : deviner
 *   serait inventer), soit elle déclare elle-même un repli (`approximatedBy`), et ce
 *   repli est dit au pilote au lieu d'être masqué.
 */
export function suggestTier(db: VersionDatabase, document: JsonNode): VersionSuggestion {
  const version = readDocumentVersion(document)
  const named = version.name === null ? '' : ` (« ${version.name} »)`

  if (version.code === null) {
    return {
      version,
      basis: 'undeclared',
      candidateTiers: [],
      selected: null,
      approximatedFrom: null,
      message:
        'Ce fichier ne dit pas de quelle version de XCTrack il vient : son bloc `info` ne ' +
        'porte pas de `versionCode`. Rien ne permet de présélectionner un palier — ' +
        'choisissez celui de l’appareil sur lequel vous réimporterez ce fichier.'
    }
  }

  const direct = db.tiersOf(version.code)
  if (direct.length === 1) {
    const tier = direct[0] as number
    return {
      version,
      basis: 'exact',
      candidateTiers: direct,
      selected: tier,
      approximatedFrom: null,
      message:
        `Ce fichier déclare la version ${version.code}${named}. Un seul palier porte ce ` +
        `numéro dans notre base : ${releaseLabel(db, tier)}. C’est lui qui est retenu.`
    }
  }
  if (direct.length > 1) {
    const selected = Math.max(...direct)
    return {
      version,
      basis: 'ambiguous',
      candidateTiers: direct,
      selected,
      approximatedFrom: null,
      message:
        `Ce fichier déclare la version ${version.code}${named}. ` +
        `${plural(direct.length, 'palier porte', 'paliers portent')} ce numéro avec des ` +
        'inventaires de clés différents : le `versionCode` n’identifie pas un schéma, et ' +
        'le fichier ne dit pas lequel l’a écrit. Nous retenons le plus récent, ' +
        `${releaseLabel(db, selected)} — un choix arbitraire, assumé comme tel : chaque ` +
        'constat qui changerait sous un autre de ces paliers est signalé ci-dessous.'
    }
  }

  const fallbackCode = corpusEntry(db, version.code)?.approximatedBy ?? null
  if (fallbackCode !== null && fallbackCode !== undefined) {
    const tiers = db.tiersOf(fallbackCode)
    if (tiers.length > 0) {
      const selected = Math.max(...tiers)
      const several = tiers.length > 1
        ? ` Ce numéro-là désigne lui-même ${plural(tiers.length, 'palier', 'paliers')} ; ` +
          `nous retenons le plus récent, ${releaseLabel(db, selected)}, et signalons ` +
          'ci-dessous tout constat qui changerait sous un autre.'
        : ` Le palier retenu est ${releaseLabel(db, selected)}.`
      return {
        version,
        basis: 'approximated',
        candidateTiers: tiers,
        selected,
        approximatedFrom: fallbackCode,
        message:
          `Ce fichier déclare la version ${version.code}${named}, qu’aucune des archives ` +
          `relevées ne porte. La base se replie sur le numéro le plus proche, ` +
          `${fallbackCode} — ce n’est pas la même version, c’est la plus proche que nous ` +
          `ayons pu lire.${several}`
      }
    }
  }

  const range = knownCodeRange(db)
  const situate = range === null
    ? ''
    : ` Les numéros relevés vont de ${range.min} à ${range.max} ; celui-ci leur est ` +
      `${version.code > range.max ? 'postérieur' : version.code < range.min ? 'antérieur' : 'intercalé'}.`
  return {
    version,
    basis: 'unrecognized',
    candidateTiers: [],
    selected: null,
    approximatedFrom: null,
    message:
      `Ce fichier déclare la version ${version.code}${named}, que notre base ne connaît ` +
      `pas : elle a été extraite de 47 relevés d’APK, et celui-ci n’en fait pas partie.` +
      `${situate} Nous ne présélectionnons rien — désigner un palier au jugé reviendrait ` +
      'à inventer. Choisissez celui de votre appareil.'
  }
}

/* -------------------------------------------------------------------- le diagnostic */

export interface DiagnoseOptions {
  tier: number
  /** Les paliers que le `versionCode` désigne, pour éprouver la stabilité des constats. */
  candidateTiers?: number[]
  language?: string
}

/**
 * Le diagnostic du document contre un palier. Rien n'est modifié, rien n'est proposé à
 * la suppression : on décrit, on situe, on dit ce qu'on ignore.
 */
export function diagnose(
  db: VersionDatabase, layout: Layout, options: DiagnoseOptions
): Diagnosis {
  const { tier } = options
  const language = options.language ?? 'fr'
  const candidateTiers = (options.candidateTiers ?? [tier]).filter((t) => db.tier(t) !== undefined)
  const others = candidateTiers.filter((t) => t !== tier)

  const counts = emptyCounts()
  const statusCounts = emptyStatusCounts()
  const keyFindings: KeyFinding[] = []
  const widgetFindings: WidgetFinding[] = []
  let widgetCount = 0
  let keyCount = 0

  const orientations: Orientation[] = ['landscape', 'portrait']
  for (const orientation of orientations) {
    layout[orientation].forEach((page, pageIndex) => {
      page.widgets.forEach((widget, widgetIndex) => {
        widgetCount += 1
        const place: WidgetPlace = {
          orientation,
          page: pageIndex + 1,
          rank: widgetIndex + 1,
          className: widget.className,
          shortName: widget.shortName,
          label: readableName(widget.shortName, language)
        }
        const widgetStatus = db.widgetStatus(widget.shortName, tier)
        if (widgetStatus !== 'present') widgetFindings.push({ place, status: widgetStatus })

        for (const key of widgetOptionKeys(widget.node)) {
          keyCount += 1
          const status = db.keyStatus(widget.shortName, key, tier)
          statusCounts[status] += 1
          const category = categoryOf(db, widget.shortName, key, tier, status)
          if (category === null) continue
          counts[category] += 1

          const divergences: Array<{ tier: number; category: FindingCategory | null }> = []
          for (const other of others) {
            const otherStatus = db.keyStatus(widget.shortName, key, other)
            const otherCategory = categoryOf(db, widget.shortName, key, other, otherStatus)
            // `null` : le palier candidat, lui, lit cette clé. C'est la divergence la
            // plus importante à dire — elle retire au constat toute force.
            if (otherCategory !== category) divergences.push({ tier: other, category: otherCategory })
          }
          keyFindings.push({
            place,
            key,
            status,
            category,
            stable: divergences.length === 0,
            divergences
          })
        }
      })
    })
  }

  return {
    tier,
    tierLabel: releaseLabel(db, tier),
    widgetCount,
    keyCount,
    recognizedCount: statusCounts.present,
    counts,
    statusCounts,
    keyFindings,
    widgetFindings,
    candidateTiers,
    unstableCount: keyFindings.filter((finding) => !finding.stable).length
  }
}

/**
 * Un constat qui diverge selon le palier candidat doit se lire comme tel : le membre de
 * phrase est fabriqué ici pour que l'écran et les tests disent la même chose.
 */
export function divergenceSentence(db: VersionDatabase, finding: KeyFinding): string {
  if (finding.stable) return ''
  const parts = finding.divergences.map((divergence) => {
    const word = divergence.category === null ? 'reconnu' : CATEGORIES[divergence.category].badge
    return `${releaseLabel(db, divergence.tier)} : ${word}`
  })
  return `Constat instable — sous ${parts.join(' ; ')}.`
}

/** « Portrait · page 2 · rang 1 · Carte de compétition » */
export function placeLabel(place: WidgetPlace): string {
  return `${ORIENTATION_LABELS[place.orientation]} · page ${place.page} · rang ${place.rank}` +
    ` · ${place.label}`
}

/* ------------------------------------------------------------------------ affichage */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export interface VersionPanelOptions {
  /** Le document ouvert. Il n'est jamais modifié. */
  document: JsonNode
  language?: string
  /** Base déjà chargée ; sinon `loadVersionDatabase()` s'en charge à cet instant. */
  database?: VersionDatabase
  /** Notifié à chaque changement de palier retenu, et au premier diagnostic. */
  onChange?: (tier: number | null, diagnosis: Diagnosis | null) => void
  /**
   * **Ce qui ouvre le nettoyage.** Tant qu'il est absent, le panneau constate et ne
   * propose rien — c'est son comportement d'origine, et le seul qui convienne à un hôte
   * incapable de suivre une modification.
   *
   * Le fournir, c'est déclarer deux choses : que `document` est le document **vivant** de
   * l'éditeur, et que l'hôte sait, à réception de l'événement, enregistrer un pas
   * d'annulation sous `description` et redessiner les pages. Un hôte qui ne le ferait pas
   * laisserait le pilote devant un dessin périmé et un « annuler » qui saute par-dessus
   * le nettoyage : ne rien proposer vaut mieux.
   */
  onCleanup?: (event: CleanupEvent) => void
}

export interface VersionPanel {
  element: HTMLElement
  select: HTMLSelectElement
  /** Palier retenu, ou `null` tant que rien n'est choisi. */
  tier: () => number | null
  diagnosis: () => Diagnosis | null
  /**
   * Ce que le nettoyage retirerait, ou `null` s'il n'est pas ouvert. Toujours vide tant
   * qu'aucun palier n'est retenu.
   */
  cleanupPlan: () => CleanupPlan | null
  /** Rebranche le panneau sur un autre document — nouvelle présélection comprise. */
  setDocument: (document: JsonNode) => void
}

/** Valeur d'option réservée : « aucun palier retenu ». */
const NO_TIER = ''

/**
 * Construit le panneau. **Asynchrone à dessein** : la base des versions n'est chargée
 * qu'ici, par deux `import()` dont Vite tire des morceaux séparés. Un pilote qui ouvre
 * une configuration sans jamais demander de diagnostic ne la télécharge pas — c'est
 * l'appelant qui décide du moment en appelant cette fonction.
 */
export async function buildVersionPanel(
  options: VersionPanelOptions
): Promise<VersionPanel> {
  const db = options.database ?? await loadVersionDatabase()
  const language = options.language ?? 'fr'

  let source = options.document
  let layout = readLayout(source)
  let suggestion = suggestTier(db, source)
  let menu = tierOptions(db, suggestion.candidateTiers, language)
  let current: number | null = suggestion.selected
  let report: Diagnosis | null = null
  let cleanup: CleanupSection | undefined

  const root = el('section', 'vdiag')
  root.setAttribute('aria-label', 'Version visée et compatibilité')

  const choice = el('div', 'vdiag__choice')
  const select = el('select', 'vdiag__select')
  select.id = 'vdiag-tier'
  const label = el('label', 'vdiag__label', 'Version de XCTrack visée')
  label.htmlFor = select.id
  const basis = el('p', 'vdiag__basis')
  const delta = el('p', 'vdiag__delta')
  const deltaDetails = el('details', 'vdiag__details')
  const deltaSummary = el('summary', undefined, 'Le détail de ces changements')
  const deltaBody = el('div', 'vdiag__details-body')
  deltaDetails.append(deltaSummary, deltaBody)
  choice.append(label, select, basis, delta, deltaDetails)

  const reportEl = el('div', 'vdiag__report')

  function fillOptions(): void {
    select.textContent = ''
    const placeholder = el('option', undefined, '— aucun palier retenu —')
    placeholder.value = NO_TIER
    select.append(placeholder)

    const published = menu.filter((option) => !option.unpublished)
    const designated = menu.filter((option) => option.unpublished)

    const publishedGroup = el('optgroup')
    publishedGroup.label = 'Versions publiées'
    for (const option of published) {
      const node = el('option', undefined, option.label)
      node.value = String(option.tier)
      publishedGroup.append(node)
    }
    select.append(publishedGroup)

    if (designated.length > 0) {
      const group = el('optgroup')
      group.label = 'Constructions désignées par ce fichier'
      for (const option of designated) {
        const node = el('option', undefined, option.label)
        node.value = String(option.tier)
        group.append(node)
      }
      select.append(group)
    }
    select.value = current === null ? NO_TIER : String(current)
  }

  function renderDelta(): void {
    const option = menu.find((entry) => entry.tier === current)
    if (option === undefined) {
      delta.textContent =
        'Aucun palier retenu : rien n’est comparé, et rien n’est diagnostiqué.'
      deltaDetails.hidden = true
      return
    }
    const covered = option.releaseNames.length > 0
      ? `Versions couvertes : ${option.releaseNames.join(', ')}.`
      : `Construction ${option.firstName} — aucune version publiée à ce palier.`
    delta.textContent = `${option.delta.summary} ${covered}`

    deltaBody.textContent = ''
    const lists: Array<[string, string[]]> = [
      ['Gadgets ajoutés', option.delta.widgetsAdded],
      ['Gadgets retirés', option.delta.widgetsRemoved],
      [
        'Réglages ajoutés sur des gadgets existants',
        option.delta.keysAdded.map(
          (entry) => `${readableName(entry.widget, language)} : ${entry.keys.join(', ')}`
        )
      ],
      [
        'Réglages retirés',
        option.delta.keysRemoved.map(
          (entry) => `${readableName(entry.widget, language)} : ${entry.keys.join(', ')}`
        )
      ]
    ]
    let shown = 0
    for (const [title, items] of lists) {
      if (items.length === 0) continue
      shown += 1
      deltaBody.append(el('h4', 'vdiag__detail-title', title))
      const list = el('ul', 'vdiag__list')
      for (const item of items) list.append(el('li', undefined, item))
      deltaBody.append(list)
    }
    deltaDetails.hidden = shown === 0
  }

  function renderReport(): void {
    reportEl.textContent = ''
    if (current === null || report === null) {
      reportEl.append(el('p', 'vdiag__tally',
        'Choisissez une version pour obtenir le diagnostic de ce fichier.'))
      return
    }

    const tally = el('p', 'vdiag__tally')
    tally.textContent =
      `${plural(report.recognizedCount, 'réglage reconnu', 'réglages reconnus')} sur ` +
      `${french(report.keyCount)} examinés, répartis sur ` +
      `${plural(report.widgetCount, 'gadget', 'gadgets')}. `
    reportEl.append(tally)

    const scope = el('p', 'vdiag__scope')
    scope.textContent =
      'Seuls les gadgets des pages sont examinés : la base des versions ne décrit qu’eux. ' +
      'Les autres réglages d’une sauvegarde — vario, unités, capteurs, espaces aériens — ' +
      'ne sont pas diagnostiqués. Les clés de position et le type de gadget ne sont pas ' +
      'des réglages et ne sont pas comptés.'
    reportEl.append(scope)

    if (report.unstableCount > 0) {
      const unstable = el('p', 'vdiag__unstable')
      unstable.textContent =
        `${plural(report.unstableCount, 'constat change', 'constats changent')} selon le ` +
        'palier retenu parmi ceux que ce fichier désigne. Ils sont signalés un à un.'
      reportEl.append(unstable)
    }

    const byCategory = new Map<FindingCategory, KeyFinding[]>()
    for (const finding of report.keyFindings) {
      const bucket = byCategory.get(finding.category)
      if (bucket === undefined) byCategory.set(finding.category, [finding])
      else bucket.push(finding)
    }

    let sections = 0
    for (const category of CATEGORY_ORDER) {
      if (category === 'unknown-widget') continue
      const findings = byCategory.get(category)
      if (findings === undefined || findings.length === 0) continue
      sections += 1
      reportEl.append(categorySection(category, findings))
    }

    if (report.widgetFindings.length > 0) {
      sections += 1
      reportEl.append(widgetSection(report.widgetFindings))
    }

    if (sections === 0) {
      reportEl.append(el('p', 'vdiag__clean',
        'Aucun écart : tous les réglages de ce fichier sont lus par le palier visé, et ' +
        'tous ses gadgets y existent. Rien à signaler — ce qui ne veut pas dire que le ' +
        'fichier soit conforme, seulement que notre relevé n’y trouve rien à redire.'))
    }
  }

  function categorySection(category: FindingCategory, findings: KeyFinding[]): HTMLElement {
    const description = CATEGORIES[category]
    const section = el('section', `vdiag__cat vdiag__cat--${description.removal}`)
    const heading = el('h3', 'vdiag__cat-title')
    heading.append(el('span', 'vdiag__badge', description.badge))
    heading.append(el('span', 'vdiag__cat-text', description.title))
    heading.append(el('span', 'vdiag__count', french(findings.length)))
    section.append(heading)
    section.append(el('p', 'vdiag__evidence', description.evidence))
    section.append(el('p', 'vdiag__verdict', description.verdict))

    // Un gadget porte souvent plusieurs clés du même cas : une ligne par instance, et
    // non par clé, pour que la liste reste relisible.
    const grouped = new Map<string, { place: WidgetPlace; entries: KeyFinding[] }>()
    for (const finding of findings) {
      const id = `${finding.place.orientation}/${finding.place.page}/${finding.place.rank}`
      const bucket = grouped.get(id)
      if (bucket === undefined) grouped.set(id, { place: finding.place, entries: [finding] })
      else bucket.entries.push(finding)
    }

    const list = el('ul', 'vdiag__list vdiag__list--findings')
    for (const { place, entries } of grouped.values()) {
      const item = el('li')
      item.append(el('span', 'vdiag__place', placeLabel(place)))
      const keys = el('span', 'vdiag__keys', entries.map((entry) => entry.key).join(', '))
      item.append(keys)
      const unstable = entries.filter((entry) => !entry.stable)
      for (const entry of unstable) {
        item.append(el('span', 'vdiag__divergence',
          `${entry.key} — ${divergenceSentence(db, entry)}`))
      }
      list.append(item)
    }
    section.append(list)
    return section
  }

  function widgetSection(findings: WidgetFinding[]): HTMLElement {
    const description = CATEGORIES['unknown-widget']
    const section = el('section', 'vdiag__cat vdiag__cat--undecided')
    const heading = el('h3', 'vdiag__cat-title')
    heading.append(el('span', 'vdiag__badge', description.badge))
    heading.append(el('span', 'vdiag__cat-text', description.title))
    heading.append(el('span', 'vdiag__count', french(findings.length)))
    section.append(heading)
    section.append(el('p', 'vdiag__evidence', description.evidence))
    section.append(el('p', 'vdiag__verdict', description.verdict))
    const list = el('ul', 'vdiag__list vdiag__list--findings')
    for (const finding of findings) {
      const item = el('li')
      item.append(el('span', 'vdiag__place', placeLabel(finding.place)))
      item.append(el('span', 'vdiag__keys', finding.status === 'absent'
        ? 'type connu de notre relevé, mais pas à ce palier'
        : 'type inconnu de tout notre relevé'))
      list.append(item)
    }
    section.append(list)
    return section
  }

  /**
   * Le nettoyage, s'il est ouvert. `forget` distingue les deux façons de refaire le plan :
   * après un geste de nettoyage, le retour en arrière doit survivre au recalcul ; après un
   * changement de version ou de fichier, il n'a plus d'objet.
   *
   * Le palier `-1` sert de « pas de palier retenu » : aucun réglage n'y est reconnu comme
   * reliquat, donc la section est vide, et elle le reste sans cas particulier à écrire.
   */
  function syncCleanup(forget: boolean): void {
    if (cleanup === undefined) return
    const at = current ?? -1
    if (forget) cleanup.reset(layout, at)
    else cleanup.refresh(layout, at)
  }

  function recompute(forget = true): void {
    // La stabilité ne s'éprouve que contre les paliers que le FICHIER désigne, et
    // seulement si le pilote est resté sur l'un d'eux. Dès qu'il vise délibérément une
    // autre version, comparer au palier d'origine ferait de chaque différence attendue
    // un « constat instable » : du bruit, et du bruit qui apprend à ignorer le signal.
    const candidates = current !== null && suggestion.candidateTiers.includes(current)
      ? suggestion.candidateTiers
      : current === null ? [] : [current]

    report = current === null
      ? null
      : diagnose(db, layout, { tier: current, candidateTiers: candidates, language })
    renderBasis()
    renderDelta()
    renderReport()
    syncCleanup(forget)
    options.onChange?.(current, report)
  }

  /**
   * D'où vient la présélection — et, si le pilote s'en est écarté, le rappel qu'il vise
   * autre chose que la version qui a écrit le fichier.
   */
  function renderBasis(): void {
    const chosen = current
    basis.textContent = chosen !== null && chosen !== suggestion.selected
      ? `${suggestion.message} Vous visez une autre version que celle-là : le diagnostic ` +
        `ci-dessous confronte ce fichier à ${releaseLabel(db, chosen)}.`
      : suggestion.message
  }

  select.addEventListener('change', () => {
    current = select.value === NO_TIER ? null : Number(select.value)
    recompute()
  })

  function reload(): void {
    layout = readLayout(source)
    suggestion = suggestTier(db, source)
    menu = tierOptions(db, suggestion.candidateTiers, language)
    current = suggestion.selected
    fillOptions()
    recompute()
  }

  // Bâtie avant le premier `reload()` : c'est lui qui la remplit, comme il remplit le
  // rapport. Elle vient APRÈS le diagnostic, jamais avant — on ne propose pas d'agir à
  // qui n'a pas encore lu ce qu'on a constaté.
  if (options.onCleanup !== undefined) {
    const notify = options.onCleanup
    cleanup = buildCleanupSection({
      db,
      layout,
      tier: current ?? -1,
      language,
      onChange: (event) => {
        // Le document a changé sous le diagnostic : le refaire, sans effacer le retour en
        // arrière que le pilote a sous les yeux.
        recompute(false)
        notify(event)
      }
    })
  }

  reload()
  root.append(choice, reportEl)
  if (cleanup !== undefined) root.append(cleanup.element)

  return {
    element: root,
    select,
    tier: () => current,
    diagnosis: () => report,
    cleanupPlan: () => cleanup?.plan() ?? null,
    setDocument: (next: JsonNode) => {
      source = next
      reload()
    }
  }
}
