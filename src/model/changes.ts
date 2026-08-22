import type { JsonNode } from '../core/jsonDocument'
import { decode, getMember } from '../core/access'
import type { Orientation } from './mutations'
import { STRUCTURAL_KEYS } from './widget'

/**
 * # L'écart entre le fichier ouvert et le document courant
 *
 * ## Ce que ce module calcule, et ce qu'il refuse de calculer
 *
 * Le pilote d'essai l'a demandé deux fois, dans ces mots : « avant d'enregistrer une
 * configuration avec laquelle je vais voler, je voudrais **la liste** ». L'annulation
 * nomme le **dernier** geste et rien d'autre ; une demi-heure de travail ne se relit pas
 * un pas à la fois.
 *
 * La tentation est alors de regrouper les libellés de l'historique — « Déplacer Altitude
 * GPS » quarante fois deviendrait « 40 déplacements ». **Ce serait faux.** Un gadget
 * déplacé dix fois qui revient à sa place n'a pas changé, et le pilote qui lirait
 * « 10 déplacements » croirait avoir modifié ce qu'il n'a pas modifié — juste avant de
 * confier le fichier à son instrument, c'est-à-dire au pire moment.
 *
 * Ce module ne lit donc **aucun geste**. Il compare **deux états** : le document tel que
 * le fichier l'a livré, et le document tel qu'il est maintenant. Un aller-retour ne laisse
 * aucune trace, parce qu'il n'y a rien à voir entre deux états identiques. C'est la
 * différence entre un journal et un constat, et c'est tout le sujet.
 *
 * Corollaire qui est aussi le cas qui rassure : **un écart vide se dit vide**. Quand le
 * pilote a tout annulé, `identical` vaut vrai, `counts.total` vaut zéro, et l'écran le dit
 * — ce qui est exactement ce que le fichier fera, puisqu'un document non modifié ressort
 * octet pour octet (`exportContainer`, `src/core/container.ts`).
 *
 * ## D'où vient l'état d'origine
 *
 * De `Session.original` (`src/ui/main.ts`), une copie structurelle prise à l'ouverture,
 * avant toute mutation. Trois autres sources existaient et aucune ne convenait :
 *
 * - **`container.source`**, les octets d'origine. Ils sont bien conservés toute la session
 *   — c'est ce qui fait la fidélité à l'octet près — mais les relire demande un décodage,
 *   une analyse, et pour une archive `.xczfg` une décompression **asynchrone**. Un écran
 *   consultable à tout moment ne peut pas dépendre d'une promesse.
 * - **Le premier instantané de l'historique**, `snapshots[0]`. Il est privé, et surtout
 *   **il n'est pas éternel** : passé `HISTORY_LIMIT` pas, les plus anciens sont purgés et
 *   l'origine part avec eux (`prunedOrigin`, `src/model/history.ts`). Un pilote qui
 *   travaille une demi-heure — précisément celui à qui ce relevé s'adresse — est celui qui
 *   la perdrait.
 * - **`container.modified`**, qui ne dit qu'oui ou non.
 *
 * ## L'appariement, et ce qu'il ne promet pas
 *
 * Ni une page ni un gadget ne portent d'identifiant : mesuré sur les 21 fichiers du
 * corpus, une page n'a que `CLASS`, `navigations` et `widgets`, et l'`UUID` des gadgets a
 * disparu en 0.9.8.4 (voir `PageRef`, `src/model/scope.ts`). Comparer deux listes sans
 * identité demande donc un **appariement**, en trois passes :
 *
 * 1. **Les identiques** — un nœud du document courant retrouve, dans l'ordre, le premier
 *    nœud d'origine qui lui est rigoureusement égal.
 * 2. **Les semblables** — parmi ce qui reste, on apparie par ressemblance décroissante :
 *    même classe, mêmes navigations, gadgets communs.
 * 3. **Les places** — un dernier reste apparié par rang identique, ce qui rattrape la page
 *    vide dont on a seulement changé le type.
 *
 * ⚠️ **C'est une heuristique, et elle peut désigner la mauvaise page** quand deux pages se
 * ressemblent beaucoup. Ce qu'elle ne fait jamais, c'est inventer ou oublier un écart :
 * quel que soit l'appariement, deux documents identiques donnent un relevé vide, et deux
 * documents différents donnent un relevé non vide — `identical` et `counts.total` ne
 * peuvent pas se contredire, et `changes.test.ts` le vérifie sur chaque scénario.
 *
 * ## Trois comptes que ce module refuse de gonfler
 *
 * - **Un rang qui glisse n'est pas un déplacement.** Retirer la page 2 fait remonter les
 *   pages 3 à 9 d'un cran ; dire « 7 pages déplacées » serait un mensonge à sept chiffres.
 *   Seul est dit *déplacé* ce qui a changé de place **relativement aux autres** — la plus
 *   longue suite d'éléments restés dans l'ordre est réputée immobile, et le reste bouge.
 * - **Les gadgets d'une page ajoutée ou retirée ne sont pas comptés à part.** La page les
 *   emporte ; les compter en plus ferait lire deux écarts là où le pilote n'en a fait
 *   qu'un. Leur nombre est dit sur la ligne de la page (`widgetCount`).
 * - **Un gadget passé d'une page à l'autre se lit comme un retrait et un ajout.** C'est ce
 *   que les deux pages **portent**, et c'est vrai ; reconstituer l'intention demanderait
 *   de rapprocher deux pages sans preuve. La ligne du gadget dit sa classe des deux côtés,
 *   le pilote reconnaît le sien.
 *
 * ## Ce module ne parle aucune langue
 *
 * Il range des **faits** — une classe, un rang, une ligne du fichier — et laisse la langue
 * les mettre en mots. C'est le motif de `personalData.ts`, à ceci près qu'aucune prose ne
 * lui est même nécessaire : les cinq catalogues n'ont à connaître que le vocabulaire des
 * écrans, et il vit dans le domaine `app` avec l'écran qui le dessine
 * (`buildChangeSummary`, `src/ui/views.ts`). Aucun `import` de `src/i18n/` ici, pas même
 * un type.
 */

/* ------------------------------------------------------------------ égalité de nœuds */

/**
 * Vrai si deux nœuds sont **rigoureusement** le même texte : mêmes clés dans le même
 * ordre, mêmes guillemets, mêmes échappements, mêmes littéraux au caractère près.
 *
 * C'est volontairement plus strict qu'une égalité de valeurs : `3.0` et `3` sont deux
 * nombres égaux et deux fichiers différents, et le projet tient à cette distinction
 * (voir `JsonNode`). L'équivalence tient donc en une phrase — `sameJson(a, b)` vaut vrai
 * si et seulement si `serializeJson(a) === serializeJson(b)` — et `changes.test.ts` le
 * vérifie plutôt que de le supposer.
 */
export function sameJson(before: JsonNode, after: JsonNode): boolean {
  if (before.kind !== after.kind) return false
  if (before.kind === 'object') {
    const other = after as Extract<JsonNode, { kind: 'object' }>
    if (before.entries.length !== other.entries.length) return false
    return before.entries.every(([key, value], index) => {
      const [otherKey, otherValue] = other.entries[index]!
      return key === otherKey && sameJson(value, otherValue)
    })
  }
  if (before.kind === 'array') {
    const other = after as Extract<JsonNode, { kind: 'array' }>
    if (before.items.length !== other.items.length) return false
    return before.items.every((item, index) => sameJson(item, other.items[index]!))
  }
  return before.raw === (after as { raw: string }).raw
}

/* ------------------------------------------------------------------------- le relevé */

/** Ce qui est arrivé à une ligne du fichier — un réglage, une entrée de premier niveau. */
export interface SettingChange {
  /** La ligne du fichier, telle qu'elle y est écrite : `Pilot.Name`, `mapWidget_scale`. */
  key: string
  kind: 'added' | 'removed' | 'changed'
}

/** Ce qui est arrivé à un gadget d'une page présente des deux côtés. */
export interface WidgetChange {
  kind: 'added' | 'removed' | 'kept'
  /** Le nom court de la classe — `WAltitude` —, de quoi retrouver le libellé de XCTrack. */
  shortName: string
  /** Rang de dessin dans le fichier ouvert, à partir de 1. Absent pour un gadget ajouté. */
  fromRank?: number
  /** Rang de dessin dans le document courant, à partir de 1. Absent pour un retrait. */
  toRank?: number
  /** Le gadget a changé de position ou de taille. */
  reshaped: boolean
  /** Le gadget est passé devant ou derrière un voisin — relativement, jamais par glissement. */
  restacked: boolean
  /** Ses réglages qui ont changé, dans l'ordre du fichier. */
  settings: SettingChange[]
  /** Une différence dans ce gadget que rien de ce qui précède n'explique. */
  otherwise: boolean
}

/** Ce qui est arrivé à une page. */
export interface PageChange {
  kind: 'added' | 'removed' | 'kept'
  orientation: Orientation
  /** Rang dans le fichier ouvert, à partir de 1. Absent pour une page ajoutée. */
  fromRank?: number
  /** Rang dans le document courant, à partir de 1. Absent pour une page retirée. */
  toRank?: number
  /** La classe courante de la page — celle d'origine si la page a été retirée. */
  className: string
  /** La classe a changé : le type de page n'est plus le même. */
  classChange?: { from: string; to: string }
  /** Les navigations de la page ont changé. */
  navigationsChanged: boolean
  /** La page a changé de place **relativement aux autres**, pas par glissement. */
  moved: boolean
  /** Ses gadgets qui ont changé. Toujours vide pour une page ajoutée ou retirée. */
  widgets: WidgetChange[]
  /** Combien de gadgets la page porte — ou portait, si elle a été retirée. */
  widgetCount: number
  /** Une différence dans cette page que rien de ce qui précède n'explique. */
  otherwise: boolean
}

/** Les comptes, tels que les deux écrans les annoncent — un seul calcul pour les deux. */
export interface ChangeCounts {
  pagesAdded: number
  pagesRemoved: number
  /** Pages présentes des deux côtés mais qui ne sont plus les mêmes. */
  pagesChanged: number
  widgetsAdded: number
  widgetsRemoved: number
  widgetsChanged: number
  /** Réglages généraux — la section `preferences` du fichier. */
  preferences: number
  /** Les autres lignes du fichier, plus ce qui n'a pas pu être nommé. */
  other: number
  /** La somme des huit précédents : zéro si et seulement si `identical` vaut vrai. */
  total: number
}

export interface DocumentChanges {
  /** Les pages courantes dans l'ordre du fichier, puis celles qui ont été retirées. */
  pages: PageChange[]
  /** Les réglages généraux qui ont changé, dans l'ordre du fichier. */
  preferences: SettingChange[]
  /** Les autres lignes de premier niveau — `info` et ce que la version écrit d'autre. */
  other: SettingChange[]
  /** Les mêmes lignes, dans un autre ordre : rare, mais le fichier n'est plus le même. */
  reordered: boolean
  /**
   * Le document a changé quelque part que ce relevé ne sait pas nommer. C'est la soupape
   * d'honnêteté du module : elle garantit qu'un document modifié n'est **jamais** annoncé
   * intact, même si une version future de XCTrack invente une forme qu'il ne connaît pas.
   * Aucun scénario de `changes.test.ts` ne la déclenche, et c'est ce qu'ils vérifient.
   */
  unexplained: boolean
  counts: ChangeCounts
  /** Vrai si le document courant est, au caractère près, celui qui a été ouvert. */
  identical: boolean
}

/* ------------------------------------------------------------------ outils de lecture */

type ObjectNode = Extract<JsonNode, { kind: 'object' }>

function isObject(node: JsonNode | undefined): node is ObjectNode {
  return node?.kind === 'object'
}

function arrayItems(node: JsonNode | undefined): JsonNode[] | undefined {
  return node?.kind === 'array' ? node.items : undefined
}

function shortNameOf(node: JsonNode): string {
  const member = getMember(node, 'CLASS')
  const full = member?.kind === 'string' ? decode(member.raw) : ''
  return full.split('.').pop() ?? full
}

/** Le nom court de la classe de page, celui que le pilote lit sous chaque vignette. */
function pageClassOf(node: JsonNode): string {
  return shortNameOf(node)
}

/**
 * L'écart entre les lignes de deux objets, clé par clé, **et** l'ordre de ces lignes.
 *
 * Les clés doublées sont comparées comme une liste : le fichier en porte, XCTrack ne
 * retient que la dernière, et se contenter de la dernière ferait disparaître du relevé un
 * changement écrit dans la première.
 */
interface MemberDiff {
  added: string[]
  removed: string[]
  changed: string[]
  /** Les lignes communes ne se suivent plus dans le même ordre. */
  reordered: boolean
}

function occurrences(node: ObjectNode): Map<string, JsonNode[]> {
  const map = new Map<string, JsonNode[]>()
  for (const [rawKey, value] of node.entries) {
    const key = decode(rawKey)
    const list = map.get(key)
    if (list === undefined) map.set(key, [value])
    else list.push(value)
  }
  return map
}

function sameList(before: JsonNode[], after: JsonNode[]): boolean {
  return before.length === after.length &&
    before.every((node, index) => sameJson(node, after[index]!))
}

function diffMembers(before: ObjectNode, after: ObjectNode): MemberDiff {
  const left = occurrences(before)
  const right = occurrences(after)
  const diff: MemberDiff = { added: [], removed: [], changed: [], reordered: false }

  for (const [key, values] of left) {
    const other = right.get(key)
    if (other === undefined) diff.removed.push(key)
    else if (!sameList(values, other)) diff.changed.push(key)
  }
  for (const key of right.keys()) {
    if (!left.has(key)) diff.added.push(key)
  }

  const keptLeft = before.entries.map(([key]) => decode(key)).filter((key) => right.has(key))
  const keptRight = after.entries.map(([key]) => decode(key)).filter((key) => left.has(key))
  diff.reordered = keptLeft.length !== keptRight.length ||
    keptLeft.some((key, index) => key !== keptRight[index])

  return diff
}

/** Les lignes changées d'un objet, dans l'ordre du fichier courant puis de l'ancien. */
function settingChanges(diff: MemberDiff, ignore: ReadonlySet<string>): SettingChange[] {
  const changes: SettingChange[] = []
  for (const key of diff.added) if (!ignore.has(key)) changes.push({ key, kind: 'added' })
  for (const key of diff.changed) if (!ignore.has(key)) changes.push({ key, kind: 'changed' })
  for (const key of diff.removed) if (!ignore.has(key)) changes.push({ key, kind: 'removed' })
  return changes
}

const NO_KEYS: ReadonlySet<string> = new Set()

/* -------------------------------------------------------------------- l'appariement */

/** Un appariement : les deux rangs quand l'élément survit, un seul sinon. */
interface Pairing {
  before?: number
  after?: number
}

/**
 * Apparie deux listes de nœuds sans identifiant : les identiques d'abord, les semblables
 * ensuite, les places en dernier recours. Voir le docblock du module.
 *
 * `similarity` rend un score positif quand deux nœuds peuvent être le même élément
 * modifié, et zéro quand ils ne le peuvent pas. `positional` autorise la troisième passe.
 */
function pairNodes(
  before: JsonNode[],
  after: JsonNode[],
  similarity: (before: JsonNode, after: JsonNode) => number,
  positional: boolean
): Pairing[] {
  const partnerOf = new Map<number, number>()
  const takenBefore = new Set<number>()

  for (let a = 0; a < after.length; a++) {
    for (let b = 0; b < before.length; b++) {
      if (takenBefore.has(b)) continue
      if (!sameJson(before[b]!, after[a]!)) continue
      partnerOf.set(a, b)
      takenBefore.add(b)
      break
    }
  }

  const candidates: Array<{ before: number; after: number; score: number }> = []
  for (let a = 0; a < after.length; a++) {
    if (partnerOf.has(a)) continue
    for (let b = 0; b < before.length; b++) {
      if (takenBefore.has(b)) continue
      const score = similarity(before[b]!, after[a]!)
      if (score > 0) candidates.push({ before: b, after: a, score })
    }
  }
  // Tri complètement déterminé : le score, puis la proximité de rang, puis les rangs
  // eux-mêmes. Sans le dernier critère, deux candidats à égalité seraient départagés par
  // l'ordre de parcours, et le relevé changerait d'un moteur à l'autre.
  candidates.sort((left, right) =>
    right.score - left.score ||
    Math.abs(left.after - left.before) - Math.abs(right.after - right.before) ||
    left.after - right.after ||
    left.before - right.before)
  for (const candidate of candidates) {
    if (partnerOf.has(candidate.after) || takenBefore.has(candidate.before)) continue
    partnerOf.set(candidate.after, candidate.before)
    takenBefore.add(candidate.before)
  }

  if (positional) {
    for (let index = 0; index < Math.min(before.length, after.length); index++) {
      if (partnerOf.has(index) || takenBefore.has(index)) continue
      partnerOf.set(index, index)
      takenBefore.add(index)
    }
  }

  const pairings: Pairing[] = []
  for (let a = 0; a < after.length; a++) {
    const b = partnerOf.get(a)
    pairings.push(b === undefined ? { after: a } : { before: b, after: a })
  }
  for (let b = 0; b < before.length; b++) {
    if (!takenBefore.has(b)) pairings.push({ before: b })
  }
  return pairings
}

/**
 * Lesquels des éléments survivants ont **vraiment** changé de place.
 *
 * La plus longue suite restée dans l'ordre est réputée immobile ; tout le reste a bougé.
 * C'est ce qui empêche le relevé d'annoncer sept déplacements quand le pilote a retiré une
 * page et que les suivantes ont glissé d'un cran — le mensonge que ce module existe pour
 * ne pas commettre. Coût quadratique assumé : une orientation compte au plus une dizaine
 * de pages, une page une trentaine de gadgets.
 */
function movedPairs(pairings: readonly Pairing[]): ReadonlySet<Pairing> {
  const kept = pairings
    .filter((pairing) => pairing.before !== undefined && pairing.after !== undefined)
    .sort((left, right) => left.before! - right.before!)
  if (kept.length === 0) return new Set()

  const length: number[] = kept.map(() => 1)
  const previous: number[] = kept.map(() => -1)
  let best = 0
  for (let index = 1; index < kept.length; index++) {
    for (let earlier = 0; earlier < index; earlier++) {
      if (kept[earlier]!.after! >= kept[index]!.after!) continue
      if (length[earlier]! + 1 <= length[index]!) continue
      length[index] = length[earlier]! + 1
      previous[index] = earlier
    }
    if (length[index]! > length[best]!) best = index
  }

  const still = new Set<Pairing>()
  for (let index = best; index !== -1; index = previous[index]!) still.add(kept[index]!)
  return new Set(kept.filter((pairing) => !still.has(pairing)))
}

/* ----------------------------------------------------------------------- les gadgets */

function widgetSimilarity(before: JsonNode, after: JsonNode): number {
  // Un gadget ne change jamais de classe : XCTrack n'offre pas le geste, et apparier deux
  // classes différentes ferait lire « réglages modifiés » là où l'un a remplacé l'autre.
  if (shortNameOf(before) !== shortNameOf(after)) return 0
  if (!isObject(before) || !isObject(after)) return 1
  const diff = diffMembers(before, after)
  const total = occurrences(after).size
  return 1 + Math.max(0, total - diff.added.length - diff.changed.length)
}

const BOUND_KEYS: ReadonlySet<string> = new Set(['X1', 'Y1', 'X2', 'Y2'])

function widgetChanges(before: JsonNode[], after: JsonNode[]): WidgetChange[] {
  const pairings = pairNodes(before, after, widgetSimilarity, false)
  const moved = movedPairs(pairings)
  const changes: WidgetChange[] = []

  for (const pairing of pairings) {
    const beforeNode = pairing.before === undefined ? undefined : before[pairing.before]!
    const afterNode = pairing.after === undefined ? undefined : after[pairing.after]!

    if (beforeNode === undefined) {
      changes.push({
        kind: 'added', shortName: shortNameOf(afterNode!), toRank: pairing.after! + 1,
        reshaped: false, restacked: false, settings: [], otherwise: false
      })
      continue
    }
    if (afterNode === undefined) {
      changes.push({
        kind: 'removed', shortName: shortNameOf(beforeNode), fromRank: pairing.before! + 1,
        reshaped: false, restacked: false, settings: [], otherwise: false
      })
      continue
    }
    if (sameJson(beforeNode, afterNode) && !moved.has(pairing)) continue

    const kept: WidgetChange = {
      kind: 'kept',
      shortName: shortNameOf(afterNode),
      fromRank: pairing.before! + 1,
      toRank: pairing.after! + 1,
      reshaped: false,
      restacked: moved.has(pairing),
      settings: [],
      otherwise: false
    }
    if (isObject(beforeNode) && isObject(afterNode)) {
      const diff = diffMembers(beforeNode, afterNode)
      kept.reshaped = [...diff.added, ...diff.changed, ...diff.removed].some((key) =>
        BOUND_KEYS.has(key))
      kept.settings = settingChanges(diff, STRUCTURAL_KEYS)
      kept.otherwise = diff.reordered ||
        [...diff.added, ...diff.changed, ...diff.removed].includes('CLASS')
    } else {
      kept.otherwise = !sameJson(beforeNode, afterNode)
    }
    changes.push(kept)
  }
  return changes
}

/* ------------------------------------------------------------------------ les pages */

const PAGE_OWN_KEYS: ReadonlySet<string> = new Set(['CLASS', 'navigations', 'widgets'])

function widgetCountOf(node: JsonNode): number {
  return arrayItems(getMember(node, 'widgets'))?.length ?? 0
}

function pageSimilarity(before: JsonNode, after: JsonNode): number {
  let score = 0
  if (pageClassOf(before) === pageClassOf(after)) score += 2
  const beforeNav = getMember(before, 'navigations')
  const afterNav = getMember(after, 'navigations')
  if (beforeNav !== undefined && afterNav !== undefined && sameJson(beforeNav, afterNav)) {
    score += 1
  }
  const beforeWidgets = arrayItems(getMember(before, 'widgets')) ?? []
  const afterWidgets = arrayItems(getMember(after, 'widgets')) ?? []
  const taken = new Set<number>()
  for (const candidate of afterWidgets) {
    const found = beforeWidgets.findIndex((widget, index) =>
      !taken.has(index) && sameJson(widget, candidate))
    if (found !== -1) { taken.add(found); score += 3 }
  }
  return score
}

function pageChanges(
  orientation: Orientation, before: JsonNode[], after: JsonNode[]
): PageChange[] {
  const pairings = pairNodes(before, after, pageSimilarity, true)
  const moved = movedPairs(pairings)
  const changes: PageChange[] = []

  for (const pairing of pairings) {
    const beforeNode = pairing.before === undefined ? undefined : before[pairing.before]!
    const afterNode = pairing.after === undefined ? undefined : after[pairing.after]!

    if (beforeNode === undefined) {
      changes.push({
        kind: 'added', orientation, toRank: pairing.after! + 1,
        className: pageClassOf(afterNode!), navigationsChanged: false, moved: false,
        widgets: [], widgetCount: widgetCountOf(afterNode!), otherwise: false
      })
      continue
    }
    if (afterNode === undefined) {
      changes.push({
        kind: 'removed', orientation, fromRank: pairing.before! + 1,
        className: pageClassOf(beforeNode), navigationsChanged: false, moved: false,
        widgets: [], widgetCount: widgetCountOf(beforeNode), otherwise: false
      })
      continue
    }
    if (sameJson(beforeNode, afterNode) && !moved.has(pairing)) continue

    const kept: PageChange = {
      kind: 'kept',
      orientation,
      fromRank: pairing.before! + 1,
      toRank: pairing.after! + 1,
      className: pageClassOf(afterNode),
      navigationsChanged: false,
      moved: moved.has(pairing),
      widgets: [],
      widgetCount: widgetCountOf(afterNode),
      otherwise: false
    }
    if (isObject(beforeNode) && isObject(afterNode)) {
      const diff = diffMembers(beforeNode, afterNode)
      const touched = [...diff.added, ...diff.changed, ...diff.removed]
      const fromClass = pageClassOf(beforeNode)
      if (fromClass !== kept.className) kept.classChange = { from: fromClass, to: kept.className }
      kept.navigationsChanged = touched.includes('navigations')
      const beforeWidgets = arrayItems(getMember(beforeNode, 'widgets'))
      const afterWidgets = arrayItems(getMember(afterNode, 'widgets'))
      if (beforeWidgets !== undefined && afterWidgets !== undefined) {
        kept.widgets = widgetChanges(beforeWidgets, afterWidgets)
        // Le tableau des gadgets a bougé sans qu'aucun gadget ne l'explique : c'est la
        // forme du fichier qui a changé, et il faut le dire plutôt que le taire.
        if (touched.includes('widgets') && kept.widgets.length === 0) kept.otherwise = true
      } else if (touched.includes('widgets')) {
        kept.otherwise = true
      }
      kept.otherwise = kept.otherwise || diff.reordered ||
        touched.some((key) => !PAGE_OWN_KEYS.has(key))
    } else {
      kept.otherwise = true
    }
    changes.push(kept)
  }
  return changes
}

/* ------------------------------------------------------------------ le relevé complet */

const ROOT_OWN_KEYS: ReadonlySet<string> = new Set(['layout', 'preferences'])
const ORIENTATIONS: readonly Orientation[] = ['portrait', 'landscape']

function countOf(changes: Omit<DocumentChanges, 'counts' | 'identical'>): ChangeCounts {
  const counts: ChangeCounts = {
    pagesAdded: 0, pagesRemoved: 0, pagesChanged: 0,
    widgetsAdded: 0, widgetsRemoved: 0, widgetsChanged: 0,
    preferences: changes.preferences.length,
    other: changes.other.length + (changes.reordered ? 1 : 0) + (changes.unexplained ? 1 : 0),
    total: 0
  }
  for (const page of changes.pages) {
    if (page.kind === 'added') counts.pagesAdded++
    else if (page.kind === 'removed') counts.pagesRemoved++
    else counts.pagesChanged++
    for (const widget of page.widgets) {
      if (widget.kind === 'added') counts.widgetsAdded++
      else if (widget.kind === 'removed') counts.widgetsRemoved++
      else counts.widgetsChanged++
    }
  }
  counts.total = counts.pagesAdded + counts.pagesRemoved + counts.pagesChanged +
    counts.widgetsAdded + counts.widgetsRemoved + counts.widgetsChanged +
    counts.preferences + counts.other
  return counts
}

/**
 * L'écart entre le document tel que le fichier l'a livré et le document tel qu'il est.
 *
 * **Ne modifie rien** : les deux arbres ressortent tels quels, et aucun nœud n'est
 * conservé dans le relevé — un écran peut le garder aussi longtemps qu'il veut sans
 * empêcher le document de vivre.
 */
export function computeChanges(before: JsonNode, after: JsonNode): DocumentChanges {
  const identical = sameJson(before, after)

  const pages: PageChange[] = []
  const beforeLayout = getMember(before, 'layout')
  const afterLayout = getMember(after, 'layout')
  let unexplained = false

  for (const orientation of ORIENTATIONS) {
    const beforePages = beforeLayout ? arrayItems(getMember(beforeLayout, orientation)) : undefined
    const afterPages = afterLayout ? arrayItems(getMember(afterLayout, orientation)) : undefined
    if (beforePages === undefined || afterPages === undefined) {
      const left = beforeLayout ? getMember(beforeLayout, orientation) : undefined
      const right = afterLayout ? getMember(afterLayout, orientation) : undefined
      if (left === undefined && right === undefined) continue
      if (left === undefined || right === undefined || !sameJson(left, right)) unexplained = true
      continue
    }
    pages.push(...pageChanges(orientation, beforePages, afterPages))
  }

  // Le `layout` lui-même — ses deux tableaux mis à part : une clé de plus, un ordre
  // différent, et ce serait un fichier que l'outil ne sait pas encore lire.
  if (isObject(beforeLayout) && isObject(afterLayout)) {
    const diff = diffMembers(beforeLayout, afterLayout)
    const touched = [...diff.added, ...diff.changed, ...diff.removed]
    if (diff.reordered || touched.some((key) => !ORIENTATIONS.includes(key as Orientation))) {
      unexplained = true
    }
  } else if (beforeLayout !== undefined || afterLayout !== undefined) {
    if (beforeLayout === undefined || afterLayout === undefined ||
      !sameJson(beforeLayout, afterLayout)) unexplained = true
  }

  const beforePreferences = getMember(before, 'preferences')
  const afterPreferences = getMember(after, 'preferences')
  let preferences: SettingChange[] = []
  let reordered = false
  if (isObject(beforePreferences) && isObject(afterPreferences)) {
    const diff = diffMembers(beforePreferences, afterPreferences)
    preferences = settingChanges(diff, NO_KEYS)
    reordered = diff.reordered
  } else if (beforePreferences !== undefined || afterPreferences !== undefined) {
    if (beforePreferences === undefined || afterPreferences === undefined ||
      !sameJson(beforePreferences, afterPreferences)) unexplained = true
  }

  let other: SettingChange[] = []
  if (isObject(before) && isObject(after)) {
    const diff = diffMembers(before, after)
    other = settingChanges(diff, ROOT_OWN_KEYS)
    reordered = reordered || diff.reordered
  } else if (!identical) {
    unexplained = true
  }

  const gathered = { pages, preferences, other, reordered, unexplained }
  let counts = countOf(gathered)
  // La soupape : le document a changé et rien de ce qui précède ne l'a vu. Elle n'est pas
  // censée s'ouvrir — aucun scénario du test ne l'ouvre — mais un relevé qui annoncerait
  // « rien n'a changé » sur un fichier modifié serait pire que pas de relevé du tout.
  if (!identical && counts.total === 0) {
    gathered.unexplained = true
    counts = countOf(gathered)
  }

  return { ...gathered, counts, identical }
}
