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
import { UI_FALLBACK_LANGUAGE, loadTranslator, type Translator } from '../i18n'
import { splitVersionName } from '../catalog/versionName'
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
 * ## Le palier travaille, la version se montre
 *
 * Les 47 versions relevées ne produisent que 21 inventaires de réglages distincts, et
 * c'est cet inventaire — le **palier** — qui fait tout le travail de ce module. Mais le
 * palier est notre concept, pas celui du pilote : il ne cherche pas un inventaire, il
 * cherche l'appareil qu'il a dans les mains. Un AIR³ affichant « 1.0.3-beta » doit
 * trouver « 1.0.3-beta ».
 *
 * Un menu nommé par paliers l'a longtemps rendu invisible à lui-même : son 1.0.3-beta
 * partage son inventaire avec 1.0.0-RC2, et c'est ce dernier nom que le menu portait.
 * Le mot « palier » ne paraît donc plus à l'écran — ni ici, ni dans les messages ; il
 * reste dans les identifiants et dans ces commentaires, où il est à sa place.
 *
 * ## Trois natures d'écart, trois mots — et pas ceux d'un archiviste
 *
 * Le pilote n'a pas à savoir ce qu'est une attestation, une extraction ou un reliquat. Il
 * a besoin de savoir **pourquoi l'outil refuse d'enlever deux cas sur trois** :
 *
 * | Ce que c'est | Le badge | Ce qu'il en fait |
 * |---|---|---|
 * | XCTrack ne lit plus ce réglage, et de vrais fichiers le portent quand même | « périmé » | l'enlever se défend |
 * | notre lecture des versions a un trou à cet endroit | « angle mort » | on n'y touche pas |
 * | aucune version que nous ayons lue ne lit ce réglage | « inconnu » | on ne conclut rien |
 *
 * Les mots d'archiviste ont tous été rendus : *reliquat* → « périmé », *trou de relevé* et
 * *aveugle* → « angle mort », *attesté* → « de vrais fichiers le portent », *antérieur* /
 * *postérieur* → « lu avant seulement » / « apparu après », *caduc* → « périmé »,
 * *constat* → « remarque ». Le badge est en capitales par la CSS, jamais dans le texte.
 *
 * Ces mots-là sont maintenant **au catalogue** — `src/i18n/messages/<langue>/versions.ts`
 * — dans les cinq langues, et ce module n'en porte plus un seul : *blind spot*, *blinde
 * vlek*, *blinder Fleck*, *punto ciego*. Trois catégories (`straddled`, `gap`, `blind`)
 * partagent **une seule clé de badge**, parce que le partage est délibéré : ce sont les
 * titres qui les distinguent, jamais le mot du bandeau. Le traducteur arrive par les
 * options — voir `VersionPanelOptions.tr` — et rien ici ne lit la langue courante.
 *
 * Une seule chose est dite une fois puis reprise par un pronom : **ce que nous avons pu
 * lire des versions de XCTrack**. Le paragraphe de cadrage l'annonce, et « nous » le
 * désigne ensuite partout. Trois mots pour cette même chose — « notre relevé », « la
 * base », « le corpus » — obligeaient le pilote à recommencer l'identification à chaque
 * paragraphe.
 *
 * ## Sept décisions, et leurs raisons
 *
 * 1. **Le menu propose des versions, une entrée par version relevée.** Le palier se
 *    déduit du choix, en silence. Ce que ce regroupement fait perdre — savoir que le
 *    choix entre deux voisines est sans effet — est rendu par une phrase qui nomme
 *    explicitement les versions que ce diagnostic ne sait pas distinguer de celle
 *    choisie. Le pilote reconnaît la sienne, et sait ce que son choix ne change pas.
 *
 * 2. **Les versions publiées d'abord, les constructions intermédiaires à part.**
 *    `1.0.0-RC1-31-g598cd4ebb` n'est pas un nom qu'un pilote a lu sur son appareil ;
 *    `1.0.0-RC2` en est un. Les deux restent atteignables — l'AIR³ est livré avec des
 *    betas, et 1.0.3-beta n'est relevé que sous une construction — mais l'ordre du menu
 *    dit lesquelles sont ordinaires.
 *
 * 3. **Le nom est coupé de son suffixe de construction** (`1.0.3-beta-5-gc036d8f2c` →
 *    `1.0.3-beta`), et le suffixe n'est remis que là où il distingue deux entrées de même
 *    nom — trois constructions de 0.9.12.3, deux de 1.0.0-RC1. Le montrer partout
 *    imposerait à tous le bruit que deux cas justifient.
 *
 * 4. **Ce que le fichier déclare ouvre le menu**, dans son propre groupe, et il est
 *    présélectionné. La question « quelle version visez-vous ? » a une réponse évidente
 *    quand le fichier la porte : la faire chercher parmi quarante-six entrées serait un
 *    travail rendu au pilote sans raison.
 *
 * 5. **Le nom lève l'ambiguïté que le numéro laisse.** `gson-2022.xcfg` déclare le
 *    `versionCode` 90615, que deux relevés portent — mais il déclare aussi le
 *    `versionName` `0.9.6.2-beta-48-gcb6ffef8`, qui n'en désigne qu'un. Retenir le plus
 *    récent « faute de mieux » revenait à ignorer un renseignement que le fichier donne.
 *
 * 6. **Quand ni le numéro ni le nom ne tranchent**, on présélectionne **la plus
 *    récente**, on le dit, on laisse les autres dans le menu — et chaque constat du
 *    diagnostic est recalculé sous *toutes* les candidates : celui qui change de l'une à
 *    l'autre est marqué « remarque instable ». Le choix arbitraire devient sans
 *    conséquence, parce qu'il est mesuré.
 *
 * 7. **Le diagnostic se raisonne par instance de gadget, jamais par type.** Un même
 *    réglage peut être un reliquat sur un gadget et courant sur un autre dans le même
 *    fichier — c'est le cas mesuré dans une sauvegarde 1.0.3, où deux cartes portent
 *    `mapWidget_showTerrain` et trois `mapWidget_panningTimeout`, jamais les deux.
 *
 * L'écart affiché sous le menu est compté **depuis la version publiée précédente**,
 * jamais depuis l'entrée qui précède dans la liste. `TierEntry.keysAdded` compare au
 * palier n-1, souvent une construction intermédiaire : afficher « 2 réglages ajoutés »
 * pour 1.0.0-RC2 alors que 140 la séparent de 0.9.12.6 serait faux.
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

/** Une version telle que le menu la présente — l'unité de choix du pilote. */
export interface VersionOption {
  /** Le `versionCode` de la version ; le premier quand plusieurs archives se confondent. */
  code: number
  /** Tous les `versionCode` menant à cette même entrée. */
  codes: number[]
  /** Le nom que l'appareil affiche, suffixe de construction ôté : « 1.0.3-beta ». */
  release: string
  /** Le suffixe de construction, quand le relevé vient d'une construction : « 5-gc036d8f2c ». */
  build: string | null
  /** Vrai pour une version publiée, fausse pour une construction intermédiaire. */
  published: boolean
  /** Tous les `versionName` complets relevés sous cette entrée. */
  names: string[]
  /**
   * Le palier de schéma dont cette version relève. **Jamais montré au pilote** : c'est
   * la traduction interne de son choix.
   */
  tier: number
  /** Ce que l'`<option>` porte à l'écran. */
  label: string
  /** Ce que l'`<option>` porte comme valeur : `« code:palier »`, unique dans le menu. */
  value: string
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
  /**
   * La version qui a écrit le fichier est désignée sans ambiguïté — soit un seul palier
   * porte son `versionCode`, soit son `versionName` en désigne un seul parmi plusieurs.
   */
  | 'exact'
  /** Plusieurs paliers le portent, et le nom déclaré n'en désigne aucun. */
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
  /**
   * Le `versionCode` dont les entrées du menu sont celles de ce fichier : celui qu'il
   * déclare, ou celui du repli. `null` quand la base ne reconnaît rien.
   */
  selectedCode: number | null
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
 * Ce que l'outil s'autorise, cas par cas. **Ce n'est pas de la prose** : c'est la
 * décision, elle ne dépend d'aucune langue, et elle reste donc ici quand les quatre
 * phrases de chaque cas sont parties au catalogue.
 *
 * Deux cas sur huit seulement autorisent une suppression, et c'est le renseignement
 * central de tout l'écran.
 */
export const CATEGORY_REMOVAL: Readonly<Record<FindingCategory, RemovalStance>> = {
  legacy: 'defensible',
  'past-only': 'defensible',
  'future-only': 'never',
  straddled: 'never',
  'never-read': 'undecided',
  gap: 'never',
  blind: 'undecided',
  'unknown-widget': 'undecided'
}

/** Les quatre phrases d'un cas, sans ce que le code décide. */
type CategoryProse = Pick<CategoryDescription, 'badge' | 'title' | 'evidence' | 'verdict'>

/**
 * Les huit cas, rédigés une fois pour toutes — au catalogue, dans les cinq langues.
 *
 * Le ton n'est pas un ornement : « ce réglage est inconnu de la version visée » n'est pas
 * « ce réglage est périmé », et « notre relevé ne l'a jamais vu » n'est pas « XCTrack l'a
 * retiré ». Confondre `gap` et `legacy` conduirait à effacer des réglages valides ; c'est
 * la distinction dont dépend tout ce chantier, et elle tient dans ces phrases.
 *
 * `straddled`, `gap` et `blind` lisent **le même badge** : « angle mort ». Le partage est
 * voulu — trois familles techniques, une seule chose à retenir : nous ne voyons rien ici,
 * donc nous ne touchons à rien. Ce sont les titres qui les distinguent.
 */
const CATEGORY_PROSE: Readonly<Record<FindingCategory, (tr: Translator) => CategoryProse>> = {
  legacy: (tr) => ({
    badge: tr.t('versions.badgeOutdated'),
    title: tr.t('versions.titleLegacy'),
    evidence: tr.t('versions.evidenceLegacy'),
    verdict: tr.t('versions.verdictLegacy')
  }),
  'past-only': (tr) => ({
    badge: tr.t('versions.badgeReadBefore'),
    title: tr.t('versions.titlePastOnly'),
    evidence: tr.t('versions.evidencePastOnly'),
    verdict: tr.t('versions.verdictPastOnly')
  }),
  'future-only': (tr) => ({
    badge: tr.t('versions.badgeAppearedLater'),
    title: tr.t('versions.titleFutureOnly'),
    evidence: tr.t('versions.evidenceFutureOnly'),
    verdict: tr.t('versions.verdictFutureOnly')
  }),
  straddled: (tr) => ({
    badge: tr.t('versions.badgeBlindSpot'),
    title: tr.t('versions.titleStraddled'),
    evidence: tr.t('versions.evidenceStraddled'),
    verdict: tr.t('versions.verdictStraddled')
  }),
  'never-read': (tr) => ({
    badge: tr.t('versions.badgeUnknown'),
    title: tr.t('versions.titleNeverRead'),
    evidence: tr.t('versions.evidenceNeverRead'),
    verdict: tr.t('versions.verdictNeverRead')
  }),
  gap: (tr) => ({
    badge: tr.t('versions.badgeBlindSpot'),
    title: tr.t('versions.titleGap'),
    evidence: tr.t('versions.evidenceGap'),
    verdict: tr.t('versions.verdictGap')
  }),
  blind: (tr) => ({
    badge: tr.t('versions.badgeBlindSpot'),
    title: tr.t('versions.titleBlind'),
    evidence: tr.t('versions.evidenceBlind'),
    verdict: tr.t('versions.verdictBlind')
  }),
  'unknown-widget': (tr) => ({
    badge: tr.t('versions.badgeUnknownWidget'),
    title: tr.t('versions.titleUnknownWidget'),
    evidence: tr.t('versions.evidenceUnknownWidget'),
    verdict: tr.t('versions.verdictUnknownWidget')
  })
}

/** Un cas, dit dans la langue du pilote. */
export function categoryDescription(
  tr: Translator, category: FindingCategory
): CategoryDescription {
  return {
    category,
    removal: CATEGORY_REMOVAL[category],
    ...CATEGORY_PROSE[category](tr)
  }
}

/** Les huit, dans l'ordre d'affichage. Un écran les construit une fois. */
export function categoryDescriptions(
  tr: Translator
): Record<FindingCategory, CategoryDescription> {
  const table = {} as Record<FindingCategory, CategoryDescription>
  for (const category of CATEGORY_ORDER) table[category] = categoryDescription(tr, category)
  return table
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
  /** Comment nommer la version visée au pilote : « 1.0.0-RC2 », jamais un numéro interne. */
  versionLabel: string
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

/**
 * L'écart entre deux paliers, calculé sur les ensembles et non cumulé. Les réglages
 * apportés par un gadget entièrement nouveau ne sont **pas** comptés parmi les réglages
 * ajoutés : ils seraient comptés deux fois, et gonfleraient l'écart d'une manière que
 * le pilote ne pourrait pas relire.
 */
export function tierDelta(
  db: VersionDatabase, tr: Translator, fromTier: number | null, toTier: number, language = 'fr'
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
      summary: tr.t('versions.noPreviousRelease', { count: target?.widgetCount ?? 0 })
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
    parts.push(tr.t('versions.widgetsAdded', { count: widgetsAdded.length }))
  }
  if (widgetsRemoved.length > 0) {
    parts.push(tr.t('versions.widgetsRemoved', { count: widgetsRemoved.length }))
  }
  if (keysAddedCount > 0) {
    parts.push(tr.t('versions.settingsAdded', { count: keysAddedCount }))
  }
  if (keysRemovedCount > 0) {
    parts.push(tr.t('versions.settingsRemoved', { count: keysRemovedCount }))
  }

  const fromName = versionLabel(db, tr, fromTier)
  // Une colonne de comptes, pas une énumération dans une phrase : `format.list` écrirait
  // « 2 gadgets ajoutés et 12 réglages ajoutés », là où le français du dépôt aligne les
  // quatre mesures. Voir `src/i18n/CLAUDE.md` § 4.
  const summary = parts.length === 0
    ? tr.t('versions.deltaNone', { version: fromName })
    : tr.t('versions.deltaSince', { version: fromName, changes: parts.join(', ') })

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

/**
 * Le suffixe de construction est traité **au même endroit pour toute l'application**
 * (`catalog/versionName.ts`) : deux écrans qui ne l'ôtaient pas pareil donnaient deux
 * noms à la même version, et le pilote en concluait qu'il y en avait deux.
 */
export { splitVersionName } from '../catalog/versionName'

/**
 * Comment nommer une version au pilote. Jamais « palier N » : ce numéro-là ne veut rien
 * dire pour lui.
 *
 * Avec un `versionCode`, c'est la version portant ce numéro qui est nommée — celle que
 * le fichier désigne. Sans lui, c'est la version publiée du palier, à défaut la première
 * qu'il couvre : le palier 20 se dit alors « 1.0.0-RC2 », qui est vrai pour ce qu'on en
 * fait, même si trois autres versions y mènent.
 */
export function versionLabel(
  db: VersionDatabase, tr: Translator, tier: number, code?: number | null
): string {
  if (code !== undefined && code !== null) {
    const entry = db.index.versions.find((v) => v.tier === tier && v.code === code)
    if (entry !== undefined) return plainLabel(tr, entry.name)
  }
  const entry = db.tier(tier)
  if (entry === undefined) return tr.t('versions.unknownVersion')
  return entry.releaseNames[0] ?? plainLabel(tr, entry.firstName)
}

/** « 1.0.3-beta-5-gc036d8f2c » → « 1.0.3-beta (construction 5-gc036d8f2c) ». */
function plainLabel(tr: Translator, name: string): string {
  const { release, build } = splitVersionName(name)
  return build === null ? release : tr.t('versions.buildLabel', { release, build })
}

/**
 * Toutes les versions du menu, **de la plus récente à la plus ancienne** — l'ordre du
 * pilote, qui vise presque toujours l'appareil qu'il a sous la main.
 *
 * Deux archives de même nom et de même schéma (0.9.8.4 sous 90840 et 90841) sont une
 * seule entrée : les distinguer laisserait croire à un choix, alors que ni le nom ni le
 * diagnostic ne changent. Le suffixe de construction n'est remis dans le libellé que
 * lorsque deux entrées portent le même nom — sans quoi le pilote de l'AIR³ lirait
 * « 1.0.3-beta (construction 5-gc036d8f2c) » là où son appareil affiche « 1.0.3-beta ».
 */
export function versionOptions(db: VersionDatabase, tr: Translator): VersionOption[] {
  interface Draft {
    codes: number[]
    release: string
    build: string | null
    published: boolean
    names: string[]
    tier: number
  }
  const drafts = new Map<string, Draft>()
  for (const version of db.index.versions) {
    if (version.tier === null) continue
    const { release, build } = splitVersionName(version.name)
    const id = `${String(version.tier)}|${release}|${build ?? ''}`
    const known = drafts.get(id)
    if (known === undefined) {
      drafts.set(id, {
        codes: [version.code],
        release,
        build,
        published: version.release,
        names: [...version.names],
        tier: version.tier
      })
      continue
    }
    if (!known.codes.includes(version.code)) known.codes.push(version.code)
    known.published ||= version.release
    for (const name of version.names) {
      if (!known.names.includes(name)) known.names.push(name)
    }
  }

  const all = [...drafts.values()]
  // Le suffixe ne sert que là où il départage : trois constructions de 0.9.12.3, deux de
  // 1.0.0-RC1, et 0.9.11.10 qui existe publiée puis reprise. Ailleurs, il est du bruit.
  const shared = new Map<string, number>()
  for (const draft of all) {
    shared.set(draft.release, (shared.get(draft.release) ?? 0) + 1)
  }

  return all
    .sort((a, b) =>
      b.tier - a.tier ||
      Math.max(...b.codes) - Math.max(...a.codes) ||
      Number(b.published) - Number(a.published))
    .map((draft) => {
      const ambiguous = (shared.get(draft.release) ?? 0) > 1
      const label = ambiguous && draft.build !== null
        ? tr.t('versions.buildLabel', { release: draft.release, build: draft.build })
        : draft.release
      return {
        code: draft.codes[0] as number,
        codes: draft.codes,
        release: draft.release,
        build: draft.build,
        published: draft.published,
        names: draft.names,
        tier: draft.tier,
        label,
        value: `${String(draft.codes[0])}:${String(draft.tier)}`
      }
    })
}

/**
 * Le palier de la version publiée qui précède celle-ci — la seule comparaison qu'un
 * pilote sache lire. Comparer à l'entrée précédente du menu le confronterait à une
 * construction intermédiaire qu'il n'a jamais installée ; comparer au palier n-1
 * afficherait l'écart minuscule qui sépare deux constructions voisines.
 */
export function previousPublishedTier(db: VersionDatabase, tier: number): number | null {
  let best: number | null = null
  db.index.tiers.forEach((entry, index) => {
    if (index >= tier || entry.releaseNames.length === 0) return
    if (best === null || index > best) best = index
  })
  return best
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
 * Les paliers que ce couple *(numéro, nom)* désigne. Le nom d'abord : quand deux relevés
 * partagent un `versionCode`, c'est lui — et lui seul — qui dit lequel a écrit le fichier.
 */
function tiersDeclaredBy(db: VersionDatabase, code: number, name: string | null): number[] {
  const byCode = db.tiersOf(code)
  if (name === null || byCode.length < 2) return byCode
  const byName = new Set<number>()
  for (const version of db.index.versions) {
    if (version.tier === null || version.code !== code) continue
    if (version.name === name || version.names.includes(name)) byName.add(version.tier)
  }
  return byName.size === 1 ? [...byName] : byCode
}

/**
 * La version à présélectionner, et pourquoi.
 *
 * Quatre cas qui ne se confondent pas :
 *
 * - **une seule version** — soit son numéro ne mène qu'à un palier, soit le nom qu'elle
 *   déclare tranche entre plusieurs. On la retient, sans réserve ;
 * - **plusieurs** — ni le numéro ni le nom ne disent laquelle a écrit le fichier. On
 *   retient la plus récente, on le dit, et le diagnostic marque tout constat qui
 *   changerait sous une autre ;
 * - **un repli déclaré** — aucune archive ne porte ce numéro, mais la base en désigne
 *   elle-même un voisin (`approximatedBy`) : il est dit au pilote au lieu d'être masqué ;
 * - **rien** — on ne choisit pas : deviner serait inventer.
 */
export function suggestTier(
  db: VersionDatabase, tr: Translator, document: JsonNode
): VersionSuggestion {
  const version = readDocumentVersion(document)
  // Le numéro de version est un **identifiant** : il se passe en `string`, sans quoi il
  // s'écrirait « 100 030 », qui ne se retrouve dans aucun fichier XCTrack.
  const declared = version.name === null
    ? tr.t('versions.declaredByCode', { code: String(version.code) })
    : tr.t('versions.declaredByName', {
      release: splitVersionName(version.name).release,
      code: String(version.code)
    })

  if (version.code === null) {
    return {
      version,
      basis: 'undeclared',
      candidateTiers: [],
      selected: null,
      selectedCode: null,
      approximatedFrom: null,
      message: tr.t('versions.messageUndeclared')
    }
  }

  const byCode = db.tiersOf(version.code)
  const direct = tiersDeclaredBy(db, version.code, version.name)
  if (direct.length === 1) {
    const tier = direct[0] as number
    // Le nom a tranché là où le numéro ne pouvait pas : le dire, parce que c'est ce qui
    // rend la présélection sûre plutôt qu'arbitraire.
    return {
      version,
      basis: 'exact',
      candidateTiers: direct,
      selected: tier,
      selectedCode: version.code,
      approximatedFrom: null,
      message: byCode.length > 1
        ? tr.t('versions.messageExactPinned', { declared, count: byCode.length })
        : tr.t('versions.messageExact', { declared })
    }
  }
  if (direct.length > 1) {
    const selected = Math.max(...direct)
    return {
      version,
      basis: 'ambiguous',
      candidateTiers: direct,
      selected,
      selectedCode: version.code,
      approximatedFrom: null,
      message: tr.t('versions.messageAmbiguous', {
        declared,
        count: direct.length,
        version: versionLabel(db, tr, selected, version.code)
      })
    }
  }

  const fallbackCode = corpusEntry(db, version.code)?.approximatedBy ?? null
  if (fallbackCode !== null && fallbackCode !== undefined) {
    const tiers = db.tiersOf(fallbackCode)
    if (tiers.length > 0) {
      const selected = Math.max(...tiers)
      return {
        version,
        basis: 'approximated',
        candidateTiers: tiers,
        selected,
        selectedCode: fallbackCode,
        approximatedFrom: fallbackCode,
        message: tiers.length > 1
          ? tr.t('versions.messageApproximatedSeveral', {
            declared,
            code: String(fallbackCode),
            count: tiers.length,
            version: versionLabel(db, tr, selected, fallbackCode)
          })
          : tr.t('versions.messageApproximated', {
            declared,
            code: String(fallbackCode),
            version: versionLabel(db, tr, selected, fallbackCode)
          })
      }
    }
  }

  const range = knownCodeRange(db)
  const situate = range === null ? null : situateCode(tr, version.code, range)
  return {
    version,
    basis: 'unrecognized',
    candidateTiers: [],
    selected: null,
    selectedCode: null,
    approximatedFrom: null,
    message: situate === null
      ? tr.t('versions.messageUnrecognized', {
        declared, count: db.index.versions.length
      })
      : tr.t('versions.messageUnrecognizedSituated', {
        declared, count: db.index.versions.length, situate
      })
  }
}

/** Où ce numéro tombe par rapport à ceux que nous connaissons — une phrase entière. */
function situateCode(
  tr: Translator, code: number, range: { min: number; max: number }
): string {
  const bounds = { min: String(range.min), max: String(range.max) }
  if (code > range.max) return tr.t('versions.rangeAbove', bounds)
  if (code < range.min) return tr.t('versions.rangeBelow', bounds)
  return tr.t('versions.rangeBetween', bounds)
}

/* -------------------------------------------------------------------- le diagnostic */

export interface DiagnoseOptions {
  tier: number
  /** Notre prose : il ne sert ici qu'à nommer la version visée. Voir `src/i18n/axes.ts`. */
  tr: Translator
  /** Les paliers que le `versionCode` désigne, pour éprouver la stabilité des constats. */
  candidateTiers?: number[]
  /** La langue des **libellés de XCTrack** — l'autre axe : elle suit le fichier ouvert. */
  language?: string
}

/**
 * Le diagnostic du document contre un palier. Rien n'est modifié, rien n'est proposé à
 * la suppression : on décrit, on situe, on dit ce qu'on ignore.
 */
export function diagnose(
  db: VersionDatabase, layout: Layout, options: DiagnoseOptions
): Diagnosis {
  const { tier, tr } = options
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
    versionLabel: versionLabel(db, tr, tier),
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
export function divergenceSentence(
  db: VersionDatabase, tr: Translator, finding: KeyFinding
): string {
  if (finding.stable) return ''
  const parts = finding.divergences.map((divergence) => tr.t('versions.divergencePart', {
    version: versionLabel(db, tr, divergence.tier),
    word: divergence.category === null
      ? tr.t('versions.badgeRecognized')
      : categoryDescription(tr, divergence.category).badge
  }))
  // Une colonne « version : mot », pas une énumération : `format.list` y écrirait « et »
  // entre deux couples déjà ponctués. Le séparateur, lui, est de la ponctuation de
  // langue — le français pose une espace avant le point-virgule, pas l'anglais.
  return tr.t('versions.unstableFinding', {
    divergences: parts.join(tr.t('versions.divergenceJoin'))
  })
}

/** « Portrait · page 2 · rang 1 · Carte de compétition » */
export function placeLabel(tr: Translator, place: WidgetPlace): string {
  const where = { page: place.page, rank: place.rank, name: place.label }
  return place.orientation === 'portrait'
    ? tr.t('versions.placePortrait', where)
    : tr.t('versions.placeLandscape', where)
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
  /**
   * Le traducteur de **notre prose**, tenu par `main.ts` et passé ici — aucun module ne
   * va chercher la langue courante (`src/i18n/CLAUDE.md` § 5).
   *
   * ⚠️ Facultatif **le temps que `main.ts` ajoute la ligne** : sans lui, le panneau
   * charge le catalogue de la langue d'écriture, le français. C'est un repli, pas une
   * option — il rendrait un écran français à un pilote qui a demandé l'allemand. Le jour
   * où l'appel de `main.ts` porte `tr`, ce paramètre devient obligatoire et le repli
   * disparaît.
   */
  tr?: Translator
  /** La langue des **libellés de XCTrack**, l'autre axe : elle suit le fichier ouvert. */
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
  /** La version que le pilote a choisie, ou `null`. C'est elle qu'il reconnaît. */
  version: () => VersionOption | null
  diagnosis: () => Diagnosis | null
  /**
   * Ce que le nettoyage retirerait, ou `null` s'il n'est pas ouvert. Toujours vide tant
   * qu'aucune version n'est visée.
   */
  cleanupPlan: () => CleanupPlan | null
  /** Rebranche le panneau sur un autre document — nouvelle présélection comprise. */
  setDocument: (document: JsonNode) => void
}

/** Valeur d'option réservée : « aucune version choisie ». */
const NO_VERSION = ''

/**
 * Comment titrer le groupe de tête, celui qui porte la version du fichier. Il est
 * toujours au singulier quand une seule entrée y figure : « les versions que ce fichier
 * peut désigner » pour une seule ligne serait une bizarrerie de plus à déchiffrer.
 *
 * `count > 1` est ici une **condition d'affichage** — quel titre montrer — et non un
 * accord : rien à reverser sur le pluriel du socle, qui choisit une forme et ne choisit
 * pas une phrase.
 */
function fileGroupLabel(tr: Translator, basis: SuggestionBasis, count: number): string {
  if (basis === 'approximated') {
    return count > 1
      ? tr.t('versions.groupNearestSeveral')
      : tr.t('versions.groupNearestOne')
  }
  return count > 1
    ? tr.t('versions.groupCandidates')
    : tr.t('versions.groupWriter')
}

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
  // Le repli le temps que `main.ts` passe `tr` — voir `VersionPanelOptions.tr`. Le
  // catalogue français est un morceau à part : rien de français n'est embarqué ici.
  const tr = options.tr ?? await loadTranslator(UI_FALLBACK_LANGUAGE)
  const language = options.language ?? 'fr'
  const menu = versionOptions(db, tr)

  let source = options.document
  let layout = readLayout(source)
  let suggestion = suggestTier(db, tr, source)
  let chosen: VersionOption | null = null
  let report: Diagnosis | null = null
  let cleanup: CleanupSection | undefined

  /** L'écart depuis la version publiée précédente, calculé une fois par palier. */
  const deltas = new Map<number, TierDelta>()
  function deltaAt(tier: number): TierDelta {
    const known = deltas.get(tier)
    if (known !== undefined) return known
    const fresh = tierDelta(db, tr, previousPublishedTier(db, tier), tier, language)
    deltas.set(tier, fresh)
    return fresh
  }

  const root = el('section', 'vdiag')
  root.setAttribute('aria-label', tr.t('versions.panelLabel'))

  const choice = el('div', 'vdiag__choice')
  const select = el('select', 'vdiag__select')
  select.id = 'vdiag-version'
  const label = el('label', 'vdiag__label', tr.t('versions.targetLabel'))
  label.htmlFor = select.id
  const basis = el('p', 'vdiag__basis')
  const same = el('p', 'vdiag__same')
  const delta = el('p', 'vdiag__delta')
  const deltaDetails = el('details', 'vdiag__details')
  const deltaSummary = el('summary', undefined, tr.t('versions.deltaDetails'))
  const deltaBody = el('div', 'vdiag__details-body')
  deltaDetails.append(deltaSummary, deltaBody)
  choice.append(label, select, basis, same, delta, deltaDetails)

  const reportEl = el('div', 'vdiag__report')

  /**
   * Les entrées du fichier : celles que son `versionCode` — ou le numéro de repli —
   * désigne. Elles ouvrent le menu, parce que c'est la réponse que le pilote cherche.
   */
  function fileOptions(): VersionOption[] {
    const code = suggestion.selectedCode
    if (code === null) return []
    return menu.filter(
      (option) => option.codes.includes(code) && suggestion.candidateTiers.includes(option.tier)
    )
  }

  function group(title: string, entries: VersionOption[]): void {
    if (entries.length === 0) return
    const node = el('optgroup')
    node.label = title
    for (const entry of entries) {
      const line = el('option', undefined, entry.label)
      line.value = entry.value
      node.append(line)
    }
    select.append(node)
  }

  function fillOptions(): void {
    select.textContent = ''
    const placeholder = el('option', undefined, tr.t('versions.noVersionOption'))
    placeholder.value = NO_VERSION
    select.append(placeholder)

    const mine = fileOptions()
    const taken = new Set(mine.map((option) => option.value))
    const rest = menu.filter((option) => !taken.has(option.value))

    group(fileGroupLabel(tr, suggestion.basis, mine.length), mine)
    group(tr.t('versions.groupPublished'),
      rest.filter((option) => option.published))
    // Les constructions intermédiaires viennent en dernier, et sous un titre qui dit
    // pourquoi leur nom est illisible : un pilote ordinaire n'en a jamais installé.
    group(tr.t('versions.groupDevelopment'),
      rest.filter((option) => !option.published))

    select.value = chosen === null ? NO_VERSION : chosen.value
  }

  /**
   * Ce que le choix du pilote ne change pas. C'est la contrepartie honnête d'un menu qui
   * propose des versions là où l'outil ne connaît que des inventaires de réglages : au
   * lieu de fondre quatre versions sous le nom de la première, on les nomme toutes.
   */
  function renderSame(): void {
    if (chosen === null) {
      same.textContent = ''
      same.hidden = true
      return
    }
    const others = menu.filter(
      (option) => option.tier === chosen?.tier && option.value !== chosen.value
    )
    if (others.length === 0) {
      same.textContent = tr.t('versions.sameNone', { version: chosen.label })
      same.hidden = false
      return
    }
    // L'énumération dans une phrase : `format.list` porte la virgule d'Oxford anglaise
    // et l'alternance espagnole *y → e*, qu'un assemblage maison ne rendait pas.
    //
    // Deux messages et non un pluriel : ce qui change est l'accord du verbe avec le sujet
    // énuméré — « accepte » pour une version, « acceptent » pour plusieurs — et les cinq
    // langues accordent de même. Le nombre affiché, lui, est `{total}`, jamais celui-ci.
    const sentence = { list: tr.format.list(others.map((option) => option.label)),
      version: chosen.label, total: others.length + 1 }
    same.textContent = others.length === 1
      ? tr.t('versions.sameOtherOne', sentence)
      : tr.t('versions.sameOtherSeveral', sentence)
    same.hidden = false
  }

  function renderDelta(): void {
    if (chosen === null) {
      delta.textContent = tr.t('versions.noVersionChosen')
      deltaDetails.hidden = true
      return
    }
    const change = deltaAt(chosen.tier)
    delta.textContent = change.summary

    deltaBody.textContent = ''
    // La phrase de cadrage ouvre le volet, avant la première liste. Sans elle, le volet
    // s'ouvre sur quatorze noms techniques d'affilée et le lecteur ne sait pas ce qu'il
    // regarde ni pourquoi les gadgets, eux, y sont nommés en toutes lettres — un
    // pilote-testeur l'a relevé le 2026-08-22. Elle n'est appendue que si quelque chose
    // suit : `shown` décide, plus bas, et le volet reste caché quand il est vide.
    const caveat = el('p', 'vdiag__detail-caveat', tr.t('versions.deltaCaveat'))
    // Les noms de réglages sont ce que XCTrack écrit : une colonne de données, jointe par
    // « , » et non par `format.list`, qui en ferait une phrase.
    const keyLine = (entry: { widget: string; keys: string[] }): string =>
      tr.t('versions.detailLine', {
        name: readableName(entry.widget, language),
        keys: entry.keys.join(', ')
      })
    const lists: Array<[string, string[]]> = [
      [tr.t('versions.detailWidgetsAdded'), change.widgetsAdded],
      [tr.t('versions.detailWidgetsRemoved'), change.widgetsRemoved],
      [tr.t('versions.detailSettingsAdded'), change.keysAdded.map(keyLine)],
      [tr.t('versions.detailSettingsRemoved'), change.keysRemoved.map(keyLine)]
    ]
    let shown = 0
    for (const [title, items] of lists) {
      if (items.length === 0) continue
      shown += 1
      if (shown === 1) deltaBody.append(caveat)
      deltaBody.append(el('h4', 'vdiag__detail-title', title))
      const list = el('ul', 'vdiag__list')
      for (const item of items) list.append(el('li', undefined, item))
      deltaBody.append(list)
    }
    deltaDetails.hidden = shown === 0
  }

  function renderReport(): void {
    reportEl.textContent = ''
    if (chosen === null || report === null) {
      reportEl.append(el('p', 'vdiag__tally', tr.t('versions.chooseVersion')))
      return
    }

    const tally = el('p', 'vdiag__tally')
    tally.textContent = tr.t('versions.tally', {
      count: report.recognizedCount,
      examined: report.keyCount,
      // Le repère se nomme `{instances}` : le diagnostic se raisonne par instance de
      // gadget, et le catalogue français ne doit porter nulle part la chaîne « widget »,
      // pas même dans un nom de repère — voir `versions.detailLine`.
      instances: tr.t('common.widgetCount', { count: report.widgetCount })
    })
    reportEl.append(tally)

    // Le mot dit UNE fois, en tête : plus bas, « nous », c'est ce relevé-là. Trois mots
    // pour la même chose — « notre relevé », « la base », « le corpus » — obligeaient le
    // pilote à deviner qu'il s'agissait du même « quelqu'un » à chaque paragraphe.
    const scope = el('p', 'vdiag__scope')
    scope.textContent = tr.t('versions.scope', { count: db.index.versions.length })
    reportEl.append(scope)

    if (report.unstableCount > 0) {
      const unstable = el('p', 'vdiag__unstable')
      unstable.textContent = tr.t('versions.unstableNotice', { count: report.unstableCount })
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
      reportEl.append(el('p', 'vdiag__clean', tr.t('versions.noFindings')))
    }
  }

  function categorySection(category: FindingCategory, findings: KeyFinding[]): HTMLElement {
    const description = categoryDescription(tr, category)
    const section = el('section', `vdiag__cat vdiag__cat--${description.removal}`)
    const heading = el('h3', 'vdiag__cat-title')
    heading.append(el('span', 'vdiag__badge', description.badge))
    heading.append(el('span', 'vdiag__cat-text', description.title))
    heading.append(el('span', 'vdiag__count', tr.format.number(findings.length)))
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
      item.append(el('span', 'vdiag__place', placeLabel(tr, place)))
      const keys = el('span', 'vdiag__keys', entries.map((entry) => entry.key).join(', '))
      item.append(keys)
      const unstable = entries.filter((entry) => !entry.stable)
      for (const entry of unstable) {
        item.append(el('span', 'vdiag__divergence',
          `${entry.key} — ${divergenceSentence(db, tr, entry)}`))
      }
      list.append(item)
    }
    section.append(list)
    return section
  }

  function widgetSection(findings: WidgetFinding[]): HTMLElement {
    const description = categoryDescription(tr, 'unknown-widget')
    const section = el('section', 'vdiag__cat vdiag__cat--undecided')
    const heading = el('h3', 'vdiag__cat-title')
    heading.append(el('span', 'vdiag__badge', description.badge))
    heading.append(el('span', 'vdiag__cat-text', description.title))
    heading.append(el('span', 'vdiag__count', tr.format.number(findings.length)))
    section.append(heading)
    section.append(el('p', 'vdiag__evidence', description.evidence))
    section.append(el('p', 'vdiag__verdict', description.verdict))
    const list = el('ul', 'vdiag__list vdiag__list--findings')
    for (const finding of findings) {
      const item = el('li')
      item.append(el('span', 'vdiag__place', placeLabel(tr, finding.place)))
      item.append(el('span', 'vdiag__keys', finding.status === 'absent'
        ? tr.t('versions.widgetKnownElsewhere')
        : tr.t('versions.widgetNeverSeen')))
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
   * Le palier `-1` sert de « aucune version visée » : aucun réglage n'y est reconnu comme
   * reliquat, donc la section est vide, et elle le reste sans cas particulier à écrire.
   */
  function syncCleanup(forget: boolean): void {
    if (cleanup === undefined) return
    const at = chosen?.tier ?? -1
    if (forget) cleanup.reset(layout, at)
    else cleanup.refresh(layout, at)
  }

  function recompute(forget = true): void {
    // La stabilité ne s'éprouve que contre les versions que le FICHIER peut désigner, et
    // seulement si le pilote est resté sur l'une d'elles. Dès qu'il vise délibérément
    // autre chose, comparer à la version d'origine ferait de chaque différence attendue
    // une « remarque instable » : du bruit, et du bruit qui apprend à ignorer le signal.
    const tier = chosen?.tier ?? null
    const candidates = tier !== null && suggestion.candidateTiers.includes(tier)
      ? suggestion.candidateTiers
      : tier === null ? [] : [tier]

    report = tier === null
      ? null
      : diagnose(db, layout, { tier, tr, candidateTiers: candidates, language })
    renderBasis()
    renderSame()
    renderDelta()
    renderReport()
    syncCleanup(forget)
    options.onChange?.(tier, report)
  }

  /**
   * D'où vient la présélection — et, si le pilote s'en est écarté, le rappel qu'il vise
   * autre chose que la version qui a écrit le fichier.
   *
   * S'en écarter, c'est viser un autre **inventaire de réglages** : passer de 1.0.2-beta
   * à 1.0.3-beta ne change rien au diagnostic, et prétendre le contraire ferait mentir le
   * paragraphe juste au-dessus, qui vient de dire que ces deux-là sont indiscernables.
   */
  function renderBasis(): void {
    const elsewhere = chosen !== null && chosen.tier !== suggestion.selected
    // Deux phrases entières mises bout à bout, jamais deux fragments : la seconde se
    // traduit seule, et son ordre ne dépend pas de la première.
    basis.textContent = elsewhere && chosen !== null
      ? `${suggestion.message} ${tr.t('versions.aimingElsewhere', { version: chosen.label })}`
      : suggestion.message
  }

  select.addEventListener('change', () => {
    chosen = menu.find((option) => option.value === select.value) ?? null
    recompute()
  })

  function reload(): void {
    layout = readLayout(source)
    suggestion = suggestTier(db, tr, source)
    chosen = pickSuggested()
    fillOptions()
    recompute()
  }

  /**
   * L'entrée présélectionnée : celle du fichier de préférence, à défaut n'importe laquelle
   * du palier retenu — la présélection porte sur un inventaire de réglages, et il arrive
   * qu'aucune entrée ne porte le numéro déclaré (le repli de 0.9.12.3).
   */
  function pickSuggested(): VersionOption | null {
    const tier = suggestion.selected
    if (tier === null) return null
    const mine = fileOptions().find((option) => option.tier === tier)
    return mine ?? menu.find((option) => option.tier === tier) ?? null
  }

  // Bâtie avant le premier `reload()` : c'est lui qui la remplit, comme il remplit le
  // rapport. Elle vient APRÈS le diagnostic, jamais avant — on ne propose pas d'agir à
  // qui n'a pas encore lu ce qu'on a constaté.
  if (options.onCleanup !== undefined) {
    const notify = options.onCleanup
    cleanup = buildCleanupSection({
      db,
      tr,
      layout,
      tier: -1,
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
  if (cleanup !== undefined) {
    root.append(cleanup.element)
  } else {
    // Hors édition, le constat parle de suppressions qui « se défendent » sans qu'aucun
    // bouton ne les permette : un pilote d'essai a cherché ce bouton et ne l'a pas trouvé.
    // Le diagnostic reste entier — c'est ce qu'on vient y lire — mais il dit où agir.
    const elsewhere = el('p', 'vdiag__readonly-note', tr.t('versions.readonlyNote'))
    root.append(elsewhere)
  }

  return {
    element: root,
    select,
    tier: () => chosen?.tier ?? null,
    version: () => chosen,
    diagnosis: () => report,
    cleanupPlan: () => cleanup?.plan() ?? null,
    setDocument: (next: JsonNode) => {
      source = next
      reload()
    }
  }
}
