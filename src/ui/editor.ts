import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { JsonNode } from '../core/jsonDocument'
import type { Page } from '../model/layout'
import { gridFor, snapValue, NORMALIZED_MAX, type Grid, type Orientation, type Rect } from '../model/grid'
import { snapBox } from '../render/canvas'
import {
  duplicateWidget, insertWidget, readWidgetBounds, removeWidget, reorderWidget, setWidgetBounds,
  type Bounds
} from '../model/mutations'
import { readWidget } from '../model/widget'
import { formatSizeMm, widgetSizeMm } from './views'
import type { Translator } from '../i18n'

/**
 * L'interaction d'édition : choisir un widget, le déplacer, le redimensionner.
 *
 * Le module est coupé en deux, et la coupure est la raison d'être du fichier :
 *
 * 1. **la géométrie**, en haut — des fonctions pures qui prennent des nombres et rendent
 *    des nombres. Aucune ne touche au DOM, aucune ne lit un élément, aucune ne dépend
 *    d'une mise en page : elles se testent intégralement sous `happy-dom`, qui ne met
 *    justement rien en page (`getBoundingClientRect` y rend des zéros) ;
 * 2. **le calque**, en bas — les marques de sélection, l'aperçu du geste, l'écoute du
 *    pointeur. Il ne calcule rien lui-même : il convertit des pixels en coordonnées de
 *    page et appelle la couche du dessus. Les dimensions du rendu lui sont **fournies**
 *    (`EditorOptions.viewport`) plutôt que mesurées, pour la même raison.
 *
 * Les primitives de `model/mutations.ts` **refusent** une coordonnée hors bornes au lieu
 * de la borner : c'est ici qu'un geste trop ample est ramené dans la page, avant l'appel.
 * Tout ce que `setWidgetBounds` reçoit d'ici est déjà valide — dans `0..10000`, aimanté,
 * et dans le bon sens (`x2 > x1`, `y2 > y1`).
 *
 * Ce qui est repris de l'édition native (relevé § 2 de
 * `docs/reference/edition-native-exploration.md`) : les quatre équerres de coin, les
 * quatre segments de milieu de côté, l'ellipse pointillée de préhension, et surtout le
 * **rectangle aimanté montré pendant que la poignée suit le doigt** — l'écart entre les
 * deux EST le retour visuel de l'aimantation.
 *
 * Ce qui s'en écarte volontairement : la taille du widget est affichée **en millimètres**
 * pendant un redimensionnement (l'appareil n'affiche jamais rien), et un clic simple
 * saisit le widget sans passer par l'ellipse (l'ellipse reste la prise du widget déjà
 * sélectionné, même recouvert). Le chevauchement, lui, n'est pas signalé : il est normal.
 */

/* ======================================================================== géométrie */

/** Un point de la page, dans le même repère que les widgets : 0 à 10000 sur chaque axe. */
export interface Point { x: number; y: number }

/**
 * Les neuf prises d'un widget sélectionné. Les quatre coins redimensionnent deux
 * coordonnées, les quatre milieux de côté une seule, `move` translate les quatre.
 */
export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move'

export const CORNER_HANDLES = ['nw', 'ne', 'sw', 'se'] as const
export const SIDE_HANDLES = ['n', 'e', 's', 'w'] as const

type Edge = 'x1' | 'y1' | 'x2' | 'y2'

/** Quelle poignée agit sur quelles coordonnées. Le reste du rectangle ne bouge pas. */
const HANDLE_EDGES: Record<Handle, readonly Edge[]> = {
  nw: ['x1', 'y1'],
  ne: ['x2', 'y1'],
  sw: ['x1', 'y2'],
  se: ['x2', 'y2'],
  n: ['y1'],
  s: ['y2'],
  w: ['x1'],
  e: ['x2'],
  move: []
}

/** Largeur ou hauteur minimale d'un widget redimensionné : une cellule de la grille. */
const MIN_CELLS = 1

/** Rayon de préhension d'une poignée, en pixels du rendu. */
const HANDLE_RADIUS_PX = 12

/** Les coordonnées agies par une poignée — utile aux tests comme à l'affichage. */
export function handleEdges(handle: Handle): readonly Edge[] {
  return HANDLE_EDGES[handle]
}

function clampToPage(value: number): number {
  return Math.min(NORMALIZED_MAX, Math.max(0, value))
}

export function sameRect(a: Rect, b: Rect): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
}

/**
 * Le widget sous un point, ou `undefined` s'il n'y en a aucun. **L'ordre du tableau est
 * l'ordre de dessin** : le dernier est au-dessus, c'est donc lui qui gagne — la règle
 * relevée sur l'appareil (« le widget le plus en avant l'emporte »). Le parcours part
 * donc de la fin.
 *
 * Les bords comptent : un point posé exactement sur la frontière de deux widgets jointifs
 * choisit le plus en avant des deux, jamais rien.
 */
export function widgetAtPoint(boxes: readonly Rect[], point: Point): number | undefined {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index]!
    // Un rectangle vide ou inversé n'est pas saisissable : aucun widget du corpus n'est
    // dans ce cas (les 519 vérifient `X1 < X2` et `Y1 < Y2`), mais un fichier venu
    // d'ailleurs pourrait l'être, et il ne doit pas piéger le clic.
    if (box.x2 <= box.x1 || box.y2 <= box.y1) continue
    if (point.x >= box.x1 && point.x <= box.x2 && point.y >= box.y1 && point.y <= box.y2) {
      return index
    }
  }
  return undefined
}

/** Le centre d'une poignée, en coordonnées de page. `move` désigne le centre du widget. */
export function handleCenter(rect: Rect, handle: Handle): Point {
  const midX = (rect.x1 + rect.x2) / 2
  const midY = (rect.y1 + rect.y2) / 2
  switch (handle) {
    case 'nw': return { x: rect.x1, y: rect.y1 }
    case 'ne': return { x: rect.x2, y: rect.y1 }
    case 'sw': return { x: rect.x1, y: rect.y2 }
    case 'se': return { x: rect.x2, y: rect.y2 }
    case 'n': return { x: midX, y: rect.y1 }
    case 's': return { x: midX, y: rect.y2 }
    case 'w': return { x: rect.x1, y: midY }
    case 'e': return { x: rect.x2, y: midY }
    default: return { x: midX, y: midY }
  }
}

/**
 * Tolérance de saisie d'une poignée, ramenée aux proportions du widget : sur un widget
 * étroit, une tolérance fixe recouvrirait tout et rendrait le déplacement impossible.
 * Un quart de la dimension est le plafond — les quatre coins ne se rejoignent donc jamais.
 */
function grabTolerance(rect: Rect, tolerance: Point): Point {
  return {
    x: Math.min(tolerance.x, (rect.x2 - rect.x1) / 4),
    y: Math.min(tolerance.y, (rect.y2 - rect.y1) / 4)
  }
}

/**
 * La poignée de redimensionnement sous un point, ou `undefined`. Les coins l'emportent
 * sur les milieux de côté : c'est le geste le plus courant, et il doit rester atteignable
 * sur un petit widget où les deux zones se touchent.
 *
 * L'intérieur ne rend jamais de poignée — c'est `isInMoveGrip` qui décide du déplacement.
 */
export function handleAtPoint(rect: Rect, point: Point, tolerance: Point): Handle | undefined {
  const tol = grabTolerance(rect, tolerance)
  const near = (handle: Handle): boolean => {
    const center = handleCenter(rect, handle)
    return Math.abs(point.x - center.x) <= tol.x && Math.abs(point.y - center.y) <= tol.y
  }
  for (const handle of CORNER_HANDLES) if (near(handle)) return handle
  for (const handle of SIDE_HANDLES) if (near(handle)) return handle
  return undefined
}

/**
 * L'ellipse pointillée du centre, prise de déplacement du widget sélectionné. Ses demi-axes
 * valent le quart du widget, comme sur l'appareil.
 */
export function isInMoveGrip(rect: Rect, point: Point): boolean {
  const radiusX = (rect.x2 - rect.x1) / 4
  const radiusY = (rect.y2 - rect.y1) / 4
  if (radiusX <= 0 || radiusY <= 0) return false
  const center = handleCenter(rect, 'move')
  const dx = (point.x - center.x) / radiusX
  const dy = (point.y - center.y) / radiusY
  return dx * dx + dy * dy <= 1
}

/**
 * Translation ramenée dans la page. **On borne, on ne refuse pas** : un geste qui sortirait
 * s'arrête au bord, et le widget garde exactement sa taille — c'est la différence entre un
 * éditeur utilisable et un éditeur qui lève une erreur au moindre geste ample.
 */
export function clampedTranslation(rect: Rect, delta: Point): Point {
  return {
    x: Math.min(Math.max(delta.x, -rect.x1), NORMALIZED_MAX - rect.x2),
    y: Math.min(Math.max(delta.y, -rect.y1), NORMALIZED_MAX - rect.y2)
  }
}

/**
 * Déplacement : la position est aimantée, **la taille ne l'est pas** — un widget déplacé
 * doit rester exactement le widget qu'il était.
 *
 * Une exception, sur chaque axe indépendamment : **quand le geste bute sur le bord de la
 * page, c'est le bord qui gagne, pas la grille**. Un widget dont la largeur n'est pas un
 * multiple de cellule ne peut pas être à la fois aimanté et collé au bord droit ; entre les
 * deux, l'intention du geste ne fait aucun doute — on l'a poussé dehors, il se colle. Sans
 * cette règle, il resterait bloqué à quelques dizaines d'unités du bord, un liseré que rien
 * ne permettrait jamais de fermer.
 */
export function movedRect(rect: Rect, delta: Point, grid: Grid): Rect {
  const width = rect.x2 - rect.x1
  const height = rect.y2 - rect.y1
  const translation = clampedTranslation(rect, delta)

  const x1 = translation.x !== delta.x
    ? rect.x1 + translation.x
    : Math.min(Math.max(snapValue(rect.x1 + translation.x, grid.cols), 0), NORMALIZED_MAX - width)
  const y1 = translation.y !== delta.y
    ? rect.y1 + translation.y
    : Math.min(Math.max(snapValue(rect.y1 + translation.y, grid.rows), 0), NORMALIZED_MAX - height)

  return { x1, y1, x2: x1 + width, y2: y1 + height }
}

/**
 * Nouveau bord bas (`x1` ou `y1`) : aimanté, dans la page, et tenu à au moins une cellule
 * du bord opposé — un widget ne peut donc ni s'inverser ni se réduire à néant. Le bord
 * opposé n'est **pas** relu ni réécrit : lui aussi doit rester exactement ce qu'il était,
 * y compris si le fichier le posait hors grille.
 */
function resizedLowEdge(target: number, high: number, cellCount: number): number {
  const cell = NORMALIZED_MAX / cellCount
  const wanted = Math.round(snapValue(clampToPage(target), cellCount) / cell)
  const limit = Math.round(high / cell) - MIN_CELLS
  const value = snapValue(Math.max(Math.min(wanted, limit), 0) * cell, cellCount)
  // Dernier garde-fou : sur un widget plus étroit qu'une cellule, l'aimantation seule ne
  // suffirait pas à garantir l'ordre des bords, et `setWidgetBounds` lèverait une erreur.
  return value < high ? value : Math.max(high - 1, 0)
}

/** Symétrique de `resizedLowEdge` pour le bord haut (`x2` ou `y2`). */
function resizedHighEdge(target: number, low: number, cellCount: number): number {
  const cell = NORMALIZED_MAX / cellCount
  const wanted = Math.round(snapValue(clampToPage(target), cellCount) / cell)
  const limit = Math.round(low / cell) + MIN_CELLS
  const value = snapValue(Math.min(Math.max(wanted, limit), cellCount) * cell, cellCount)
  return value > low ? value : Math.min(low + 1, NORMALIZED_MAX)
}

/**
 * Redimensionnement : seules les coordonnées de la poignée saisie bougent (voir
 * `HANDLE_EDGES`). L'équerre haut-gauche touche `x1` et `y1`, jamais `x2` ni `y2`.
 */
export function resizedRect(rect: Rect, handle: Handle, delta: Point, grid: Grid): Rect {
  const edges = HANDLE_EDGES[handle]
  const next = { ...rect }
  if (edges.includes('x1')) next.x1 = resizedLowEdge(rect.x1 + delta.x, rect.x2, grid.cols)
  if (edges.includes('x2')) next.x2 = resizedHighEdge(rect.x2 + delta.x, rect.x1, grid.cols)
  if (edges.includes('y1')) next.y1 = resizedLowEdge(rect.y1 + delta.y, rect.y2, grid.rows)
  if (edges.includes('y2')) next.y2 = resizedHighEdge(rect.y2 + delta.y, rect.y1, grid.rows)
  return next
}

/**
 * Le rectangle qu'un geste produit : aimanté sur la grille, borné à la page, jamais vide
 * ni inversé. C'est le seul point d'entrée du calcul d'un geste, et le seul rectangle qui
 * finit dans le document.
 *
 * **Un geste nul ne produit rien** : départ = arrivée rend le rectangle d'origine, à
 * l'identique. Sans cette sortie anticipée, un widget que le fichier pose hors grille
 * serait aimanté par un simple clic — le document changerait sans que personne n'ait
 * rien demandé.
 */
export function gestureRect(rect: Rect, handle: Handle, delta: Point, grid: Grid): Rect {
  if (delta.x === 0 && delta.y === 0) return { ...rect }
  if (handle === 'move') return movedRect(rect, delta, grid)
  return resizedRect(rect, handle, delta, grid)
}

/**
 * Le rectangle **non aimanté** que suit le doigt, borné lui aussi. Il n'est jamais écrit
 * dans le document : il ne sert qu'à dessiner la poignée là où le curseur se trouve
 * réellement, à côté du rectangle aimanté. C'est l'écart entre les deux qui montre
 * l'aimantation à l'œuvre.
 */
export function fingerRect(rect: Rect, handle: Handle, delta: Point): Rect {
  if (handle === 'move') {
    const translation = clampedTranslation(rect, delta)
    return {
      x1: rect.x1 + translation.x, y1: rect.y1 + translation.y,
      x2: rect.x2 + translation.x, y2: rect.y2 + translation.y
    }
  }
  const edges = HANDLE_EDGES[handle]
  const next = { ...rect }
  if (edges.includes('x1')) next.x1 = Math.min(clampToPage(rect.x1 + delta.x), rect.x2 - 1)
  if (edges.includes('x2')) next.x2 = Math.max(clampToPage(rect.x2 + delta.x), rect.x1 + 1)
  if (edges.includes('y1')) next.y1 = Math.min(clampToPage(rect.y1 + delta.y), rect.y2 - 1)
  if (edges.includes('y2')) next.y2 = Math.max(clampToPage(rect.y2 + delta.y), rect.y1 + 1)
  return next
}

/* =========================================================== pixels ↔ page */

/**
 * Le rendu de la page vu en pixels de la fenêtre. Fourni par l'appelant plutôt que mesuré :
 * `happy-dom` ne met rien en page, `getBoundingClientRect` y rend des zéros, et une
 * géométrie qui dépendrait de cette mesure serait intestable.
 */
export interface Viewport { left: number; top: number; width: number; height: number }

/** Un point de la fenêtre ramené dans le repère de la page. */
export function pixelToPage(clientX: number, clientY: number, viewport: Viewport): Point {
  return {
    x: viewport.width > 0 ? ((clientX - viewport.left) / viewport.width) * NORMALIZED_MAX : 0,
    y: viewport.height > 0 ? ((clientY - viewport.top) / viewport.height) * NORMALIZED_MAX : 0
  }
}

/** Un déplacement en pixels ramené dans le repère de la page. */
export function pixelToPageDelta(dx: number, dy: number, viewport: Viewport): Point {
  return {
    x: viewport.width > 0 ? (dx / viewport.width) * NORMALIZED_MAX : 0,
    y: viewport.height > 0 ? (dy / viewport.height) * NORMALIZED_MAX : 0
  }
}

/** Rayon de préhension d'une poignée, converti dans le repère de la page. */
export function handleTolerance(viewport: Viewport, radiusPx = HANDLE_RADIUS_PX): Point {
  return pixelToPageDelta(radiusPx, radiusPx, viewport)
}

/* ============================================================ geste et historique */

/**
 * Une modification terminée, telle qu'un historique d'annulation peut l'enregistrer :
 * un libellé lisible, le widget concerné, et les deux états entre lesquels basculer.
 *
 * `src/model/history.ts` (écrit ailleurs) n'est **pas** importé ici — c'est lui qui viendra
 * s'abonner à `EditorOptions.onEdit`. `applyWidgetEdit` / `revertWidgetEdit` lui donnent
 * refaire et annuler sans qu'il ait à connaître quoi que ce soit du calque d'édition.
 */
export interface WidgetEdit {
  /** « Déplacer Altitude GPS », « Redimensionner Carte de compétition ». */
  description: string
  /** Rang du widget dans le tableau `widgets` de la page — donc son rang d'empilement. */
  widgetIndex: number
  before: Bounds
  after: Bounds
}

/**
 * Le libellé d'un geste, tel qu'il s'écrit dans un menu « Annuler … ».
 *
 * Deux langues, et elles ne se confondent pas : `language` est celle du **fichier ouvert**,
 * qui donne le nom du gadget, `tr` celle du **pilote**, qui donne le verbe. Voir
 * `src/i18n/axes.ts`.
 */
export function gestureDescription(
  handle: Handle, shortName: string, language: string, tr: Translator
): string {
  const name = readableName(shortName, language)
  return handle === 'move'
    ? tr.t('editor.moveNamed', { name })
    : tr.t('editor.resizeNamed', { name })
}

function widgetAt(page: Page, index: number): Page['widgets'][number] {
  const widget = page.widgets[index]
  if (widget === undefined) throw new Error(`widget ${index} absent de la page`)
  return widget
}

/**
 * Les coordonnées **actuelles** d'un widget, relues dans le document. `Page.widgets` est
 * une photographie prise à la lecture : ses `x1`…`y2` sont périmés dès la première
 * modification, alors que le nœud, lui, est toujours à jour.
 *
 * Un widget auquel il manquerait une coordonnée fait lever `readWidgetBounds` ; ici on
 * retombe sur la photographie, dont `readWidget` comble les trous par des zéros. Le calque
 * survit donc à un fichier abîmé, et le rectangle vide qui en résulte est simplement
 * insaisissable (voir `widgetAtPoint`). L'écriture, elle, reste stricte : `commitGesture`
 * relit le nœud et laisse l'erreur remonter plutôt que d'inventer des coordonnées.
 */
export function currentBounds(page: Page, index: number): Bounds {
  const widget = widgetAt(page, index)
  try {
    return readWidgetBounds(widget.node)
  } catch {
    return { x1: widget.x1, y1: widget.y1, x2: widget.x2, y2: widget.y2 }
  }
}

/** Toutes les boîtes de la page, dans l'ordre de dessin, relues dans le document. */
export function currentBoxes(page: Page): Rect[] {
  return page.widgets.map((_widget, index) => currentBounds(page, index))
}

/** Refaire : réapplique la modification. */
export function applyWidgetEdit(page: Page, edit: WidgetEdit): void {
  setWidgetBounds(widgetAt(page, edit.widgetIndex).node, edit.after)
}

/** Annuler : rétablit l'état antérieur, coordonnée par coordonnée. */
export function revertWidgetEdit(page: Page, edit: WidgetEdit): void {
  setWidgetBounds(widgetAt(page, edit.widgetIndex).node, edit.before)
}

/**
 * Écrit le résultat d'un geste dans le document et rend la modification correspondante,
 * ou `undefined` si le geste n'a rien changé — auquel cas **pas un octet n'est réécrit**
 * et l'historique n'a rien à enregistrer.
 */
export function commitGesture(
  page: Page, index: number, handle: Handle, rect: Rect, language: string, tr: Translator
): WidgetEdit | undefined {
  const widget = widgetAt(page, index)
  const before = readWidgetBounds(widget.node)
  if (sameRect(before, rect)) return undefined
  setWidgetBounds(widget.node, rect)
  return {
    description: gestureDescription(handle, widget.shortName, language, tr),
    widgetIndex: index,
    before,
    after: { ...rect }
  }
}

/** « 12,3 × 4,5 mm » : la taille réelle du widget sur la dalle choisie. */
export function sizeLabel(
  rect: Rect, device: Device, orientation: Orientation, tr: Translator
): string {
  return formatSizeMm(widgetSizeMm(rect, device, orientation), tr.format)
}

/* ============================================== actions sur le widget sélectionné */

/**
 * Les quatre mouvements d'empilement. Le tableau `widgets` **est** l'ordre de dessin : le
 * premier élément est au fond, le dernier au-dessus. « Avancer » va donc vers la fin du
 * tableau, « reculer » vers son début.
 *
 * Le relevé (§ 2) note que les deux boutons natifs « avant-plan » / « arrière-plan » se
 * sont annulés lors du test : leur effet exact sur l'ordre du tableau n'a **pas** été
 * observé directement. Ce qui est repris ici n'est donc pas leur comportement mesuré mais
 * l'ordre de dessin, lui établi par le corpus — une carte posée en premier est recouverte
 * par tout ce qui suit — et par `widgetAtPoint`, qui parcourt déjà le tableau à l'envers.
 */
export type StackAction = 'raise' | 'lower' | 'front' | 'back'

/** Les six actions qui portent sur la sélection, telles qu'elles se nomment. */
export type SelectionAction = 'delete' | 'duplicate' | StackAction

/**
 * Le rang d'arrivée d'un mouvement d'empilement, **calculé avant toute mutation**.
 *
 * C'est la raison pour laquelle `reorderWidget` est préféré ici aux quatre raccourcis de
 * `mutations.ts` (`raiseWidget`, `bringWidgetToFront`…) : ceux-ci ne rendent leur résultat
 * qu'une fois le tableau modifié, alors qu'il faut savoir **avant** si l'opération
 * changerait quelque chose. Un widget déjà au premier plan qu'on remet au premier plan ne
 * doit ni produire un pas d'historique, ni réécrire un octet, ni laisser croire qu'il
 * s'est passé quelque chose.
 */
export function stackTarget(action: StackAction, index: number, count: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error(`stackTarget : rang ${index} hors de [0, ${count - 1}]`)
  }
  const last = count - 1
  switch (action) {
    case 'raise': return Math.min(index + 1, last)
    case 'lower': return Math.max(index - 1, 0)
    case 'front': return last
    default: return 0
  }
}

/**
 * Le rang courant, dit en clair. L'appareil n'en donne **aucun** retour : un widget envoyé
 * sous une carte disparaît de l'écran sans que rien n'indique où il est passé (capture
 * `edition-widget-envoye-en-arriere-plan.png`). Une pile qu'on ne voit pas se lit au
 * moins en toutes lettres.
 */
export function stackLabel(index: number, count: number, tr: Translator): string {
  if (count <= 1) return tr.t('editor.onlyWidget')
  const place = { index: index + 1, total: count }
  if (index === count - 1) return tr.t('editor.rankFront', place)
  if (index === 0) return tr.t('editor.rankBack', place)
  return tr.t('editor.rank', place)
}

/**
 * Ce que devient la sélection quand un widget disparaît.
 *
 * Deux cas, et un seul piège. Le widget supprimé **était** le sélectionné : plus rien
 * n'est sélectionné, comme sur l'appareil (capture
 * `edition-apres-suppression-aucune-selection.png`) et comme dans tout éditeur — désigner
 * d'office le voisin ferait porter la prochaine frappe à un widget que personne n'a
 * choisi. Un **autre** widget est supprimé : tous les rangs au-dessus glissent d'un cran,
 * et la sélection doit glisser avec son widget plutôt que rester sur un nombre.
 *
 * Le résultat est valide par construction — jamais hors des bornes d'après suppression.
 */
export function selectionAfterRemoval(
  countBefore: number, removed: number, selected: number | undefined
): number | undefined {
  if (selected === undefined || selected === removed) return undefined
  const shifted = selected > removed ? selected - 1 : selected
  return shifted >= 0 && shifted < countBefore - 1 ? shifted : undefined
}

/**
 * L'emplacement d'une copie : le widget d'origine décalé d'**une cellule** vers le bas et
 * la droite. Sans ce décalage, la copie recouvrirait exactement l'original et rien à
 * l'écran ne distinguerait « j'ai dupliqué » de « il ne s'est rien passé ».
 *
 * Deux replis, dans cet ordre : un widget déjà collé au coin bas-droit se décale vers le
 * haut-gauche ; un widget qui couvre toute la page ne peut se décaler nulle part et sa
 * copie se superpose — c'est alors le rang, annoncé par la barre d'outils, qui les
 * distingue. Le pas est arrondi à l'entier : les coordonnées du format le sont toutes, et
 * une cellule de la grille 48 × 29 ne tombe pas juste (10000 / 48 = 208,33…).
 *
 * La **taille** n'est jamais touchée : une copie est le widget, ailleurs.
 */
export function duplicateRect(rect: Rect, grid: Grid): Rect {
  const step = {
    x: Math.round(NORMALIZED_MAX / grid.cols),
    y: Math.round(NORMALIZED_MAX / grid.rows)
  }
  const forward = clampedTranslation(rect, step)
  const translation = forward.x === 0 && forward.y === 0
    ? clampedTranslation(rect, { x: -step.x, y: -step.y })
    : forward
  return {
    x1: rect.x1 + translation.x, y1: rect.y1 + translation.y,
    x2: rect.x2 + translation.x, y2: rect.y2 + translation.y
  }
}

/** Le libellé d'une action, tel qu'il s'écrit dans un menu « Annuler … ». */
export function structureDescription(
  action: SelectionAction, shortName: string, language: string, tr: Translator
): string {
  const name = readableName(shortName, language)
  switch (action) {
    case 'delete': return tr.t('editor.deleteNamed', { name })
    case 'duplicate': return tr.t('editor.duplicateNamed', { name })
    case 'raise': return tr.t('editor.raiseNamed', { name })
    case 'lower': return tr.t('editor.lowerNamed', { name })
    case 'front': return tr.t('editor.frontNamed', { name })
    default: return tr.t('editor.backNamed', { name })
  }
}

/* ------------------------------------------------- modifications de structure */

/**
 * Une modification qui change la **composition** de la page, là où `WidgetEdit` ne change
 * que quatre nombres. Trois formes, et chacune porte de quoi se défaire exactement :
 *
 * - `insert` connaît le nœud inséré et son rang : l'annuler, c'est le retirer ;
 * - `remove` **détient le nœud retiré**, entier. C'est le point qui décide de la fidélité
 *   de l'annulation : un widget porte une centaine de clés propres à son type, dont la
 *   plupart ne sont documentées nulle part, et le nœud conservé ici est celui-là même qui
 *   était dans le document — pas une lecture, pas une reconstruction, pas un sous-ensemble
 *   des clés connues. Le réinsérer à son rang rend le document à l'octet près ;
 * - `reorder` retient les deux rangs, et l'inverse d'un déplacement de `from` vers `to`
 *   est le déplacement de `to` vers `from`.
 *
 * Chaque forme dit aussi **où va la sélection** : `selection` après l'action,
 * `selectionBefore` après son annulation. L'interface désigne un widget par son rang et
 * jamais par référence (l'historique rend un arbre neuf à chaque annulation) ; une action
 * qui décale les rangs sans dire ce que devient la sélection la laisserait pointer un
 * voisin, ou le vide.
 */
export interface WidgetInsertion {
  kind: 'insert'
  description: string
  /** Rang auquel le widget a été inséré. */
  index: number
  /** Le nœud inséré, avec toutes ses clés. */
  node: JsonNode
  selection: number | undefined
  selectionBefore: number | undefined
}

export interface WidgetRemoval {
  kind: 'remove'
  description: string
  /** Rang d'où le widget a été retiré — et où il revient à l'annulation. */
  index: number
  /** Le nœud retiré, détaché du document mais intact. */
  node: JsonNode
  selection: number | undefined
  selectionBefore: number | undefined
}

export interface WidgetReorder {
  kind: 'reorder'
  description: string
  from: number
  to: number
  selection: number | undefined
  selectionBefore: number | undefined
}

export type WidgetStructureEdit = WidgetInsertion | WidgetRemoval | WidgetReorder

/**
 * `Page.widgets` est une **photographie** prise à la lecture par `readLayout`, parallèle
 * au tableau `widgets` du document. Une action de structure doit donc bouger les deux, et
 * exactement de la même façon : le calque, le panneau de réglages et l'historique
 * désignent tous un widget par son rang, et un rang qui ne veut pas dire la même chose des
 * deux côtés serait une corruption silencieuse de l'interface.
 *
 * Le tableau est modifié **en place** (`splice`), jamais remplacé : un appelant qui en
 * détient la référence continue de voir la page à jour.
 */
function insertIntoPage(page: Page, node: JsonNode, index: number): void {
  insertWidget(page.node, node, index)
  page.widgets.splice(index, 0, readWidget(node))
}

function removeFromPage(page: Page, index: number): JsonNode {
  const node = removeWidget(page.node, index)
  page.widgets.splice(index, 1)
  return node
}

function reorderInPage(page: Page, from: number, to: number): void {
  reorderWidget(page.node, from, to)
  const [widget] = page.widgets.splice(from, 1)
  if (widget !== undefined) page.widgets.splice(to, 0, widget)
}

/** Refaire : réapplique la modification de structure. */
export function applyStructureEdit(page: Page, edit: WidgetStructureEdit): void {
  if (edit.kind === 'insert') insertIntoPage(page, edit.node, edit.index)
  else if (edit.kind === 'remove') removeFromPage(page, edit.index)
  else reorderInPage(page, edit.from, edit.to)
}

/** Annuler : rétablit la page telle qu'elle était, nœud retiré compris. */
export function revertStructureEdit(page: Page, edit: WidgetStructureEdit): void {
  if (edit.kind === 'insert') removeFromPage(page, edit.index)
  else if (edit.kind === 'remove') insertIntoPage(page, edit.node, edit.index)
  else reorderInPage(page, edit.to, edit.from)
}

/**
 * Supprime un widget. `selected` est la sélection **courante**, qui n'est pas forcément le
 * widget supprimé — c'est elle qui détermine `selection` (voir `selectionAfterRemoval`) ;
 * par défaut, on supprime ce qui est sélectionné, le seul cas que la barre d'outils
 * produise.
 *
 * Contrairement à l'appareil, qui supprime sans confirmation **et sans retour possible**,
 * rien n'est perdu : le nœud voyage dans la modification rendue.
 */
export function removeWidgetAt(
  page: Page, index: number, language: string, tr: Translator,
  selected: number | undefined = index
): WidgetRemoval {
  const widget = widgetAt(page, index)
  const description = structureDescription('delete', widget.shortName, language, tr)
  const countBefore = page.widgets.length
  const node = removeFromPage(page, index)
  return {
    kind: 'remove',
    description,
    index,
    node,
    selection: selectionAfterRemoval(countBefore, index, selected),
    selectionBefore: selected
  }
}

/**
 * Duplique un widget. La copie se pose **juste devant l'original** (rang `index + 1`) et
 * décalée d'une cellule : devant, parce qu'une copie posée derrière disparaîtrait sous son
 * modèle sur les pages où les widgets se recouvrent ; décalée, pour qu'on la voie.
 *
 * `duplicateWidget` recopie le nœud entrée par entrée, texte source compris : la copie est
 * **indépendante** — la modifier ne touche pas l'original — et complète, y compris sur les
 * clés qu'aucune version connue ne documente. C'est le seul mécanisme de création dont on
 * dispose : les valeurs par défaut d'un type de widget ne sont pas connues.
 */
export function duplicateWidgetAt(
  page: Page, index: number, grid: Grid, language: string, tr: Translator
): WidgetInsertion {
  const widget = widgetAt(page, index)
  const copy = duplicateWidget(widget.node, duplicateRect(currentBounds(page, index), grid))
  const at = index + 1
  insertIntoPage(page, copy, at)
  return {
    kind: 'insert',
    description: structureDescription('duplicate', widget.shortName, language, tr),
    index: at,
    node: copy,
    selection: at,
    selectionBefore: index
  }
}

/**
 * Change le rang d'empilement d'un widget, ou rend `undefined` quand il n'y a rien à
 * changer — premier plan sur le widget déjà au premier plan, recul sur celui du fond.
 * Dans ce cas **le document n'est pas touché** et il n'y a rien à enregistrer : un
 * historique qui accumulerait des pas sans effet ferait de « Annuler » une loterie.
 */
export function restackWidget(
  page: Page, index: number, action: StackAction, language: string, tr: Translator
): WidgetReorder | undefined {
  const widget = widgetAt(page, index)
  const to = stackTarget(action, index, page.widgets.length)
  if (to === index) return undefined
  reorderInPage(page, index, to)
  return {
    kind: 'reorder',
    description: structureDescription(action, widget.shortName, language, tr),
    from: index,
    to,
    selection: to,
    selectionBefore: index
  }
}

/* ================================================================== calque d'édition */

export interface EditorOptions {
  page: Page
  device: Device
  orientation: Orientation
  /** La langue des **libellés de XCTrack** — celle du fichier ouvert, jamais notre prose. */
  language: string
  /** Le traducteur de **notre prose**, dans la langue du pilote. Voir `src/i18n/axes.ts`. */
  tr: Translator
  /**
   * Les dimensions du rendu, en pixels de la fenêtre, relues à chaque geste : la page est
   * zoomable, et sa taille change sous le calque sans que celui-ci en soit averti.
   */
  viewport: () => Viewport
  /** Appelé une fois par geste **effectif**. Le point d'accroche de l'historique. */
  onEdit?: (edit: WidgetEdit) => void
  /**
   * Appelé une fois par action de structure **effective** : suppression, duplication,
   * changement de rang. Séparé de `onEdit` parce que ce n'est pas la même chose à
   * défaire — et parce qu'il implique un **redessin de la page**, le calque ne dessinant
   * pas les widgets. Un mouvement d'empilement sans effet n'appelle rien.
   */
  onStructureEdit?: (edit: WidgetStructureEdit) => void
  onSelectionChange?: (index: number | undefined) => void
}

export interface Editor {
  /** Le calque, à poser par-dessus le rendu de la page (`.plate` de `views.ts`). */
  element: HTMLElement
  selection: () => number | undefined
  select: (index: number | undefined) => void
  /** Redessine les marques depuis le document — après une annulation, par exemple. */
  refresh: () => void
  /**
   * Les trois actions sur la sélection, telles que la barre d'outils les déclenche.
   * Exposées pour qu'un menu, un raccourci global ou un test puissent les appeler sans
   * passer par le DOM. Chacune rend la modification produite, ou `undefined` quand il n'y
   * avait rien à faire : rien de sélectionné, geste en cours, ou rang déjà atteint.
   */
  remove: () => WidgetStructureEdit | undefined
  duplicate: () => WidgetStructureEdit | undefined
  restack: (action: StackAction) => WidgetStructureEdit | undefined
  destroy: () => void
}

interface ActiveGesture {
  index: number
  handle: Handle
  startRect: Rect
  origin: { clientX: number; clientY: number }
  viewport: Viewport
  /** Le déplacement brut du pointeur, en coordonnées de page — ce que suit le doigt. */
  delta: Point
  /** Le rectangle aimanté qui en découle — ce qui sera écrit au relâchement. */
  rect: Rect
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Le rectangle tel que le MOTEUR le dessine : bords aimantés sur la grille de rendu de
 * XCTrack — 51 × 29, voir `snapBox` dans `render/canvas.ts`.
 *
 * **Deux grilles, deux usages, à ne pas confondre.** Ce que l'éditeur ÉCRIT dans le
 * fichier reste aimanté sur la grille d'édition (48 × 29, `model/grid.ts`) : ce sont les
 * valeurs que XCTrack lui-même écrirait. Mais ce que l'éditeur DESSINE passe par la
 * grille de rendu, parce que c'est ce que fait l'appareil avant de tracer. Le calque de
 * sélection doit suivre le dessin, faute de quoi le cadre et les poignées flottent
 * jusqu'à 12,5 px à côté du gadget qu'ils désignent.
 *
 * Le rapport largeur/hauteur exact n'importe pas ici : `renderGrid` ne lit que le sens
 * de la page, le grand côté portant 51 divisions et le petit 29.
 */
const RENDER_ASPECT: Record<Orientation, number> = { landscape: 16 / 9, portrait: 9 / 16 }

function drawnRect(rect: Rect, orientation: Orientation): Rect {
  return snapBox(rect, RENDER_ASPECT[orientation])
}

/** Positionne un élément absolu sur un rectangle de page, en pourcentages. */
function place(node: HTMLElement, rect: Rect): void {
  node.style.left = `${rect.x1 / 100}%`
  node.style.top = `${rect.y1 / 100}%`
  node.style.width = `${(rect.x2 - rect.x1) / 100}%`
  node.style.height = `${(rect.y2 - rect.y1) / 100}%`
}

/* ------------------------------------------- placement de la barre d'outils */

/**
 * Écart entre la barre d'outils et le bord du widget qu'elle sert. La valeur est répétée
 * dans `app.css` (les `translateY` de `.editor__toolbar`) : les deux bougent ensemble.
 */
const TOOLBAR_GAP_PX = 6

/**
 * Où poser la barre d'outils. Les trois positions, dans l'ordre où on les essaie :
 *
 * - `above` — au-dessus du widget, **hors** de son rectangle : le cas courant ;
 * - `below` — sous son bord inférieur, quand il n'y a pas la place au-dessus ;
 * - `inside` — dedans, en dernier recours, quand le widget occupe presque toute la
 *   hauteur de la plaque et qu'aucun des deux dehors ne tient.
 *
 * Le critère n'est pas « le widget commence-t-il haut » mais **« la barre tient-elle sans
 * recouvrir »** — ce qui dépend de sa hauteur à l'écran, du zoom courant et de la place
 * restante dans la plaque. Un seuil en unités de page, comme le `TOOLBAR_FLIP = 1000`
 * d'avant, ignore ces trois choses : il envoyait « à l'intérieur » tout widget commençant
 * dans le dixième supérieur, et une barre d'état de 12 mm de haut disparaissait
 * intégralement dessous. C'est le défaut signalé le 2026-08-21.
 *
 * La hauteur de la barre est passée en pixels, mesurée par l'appelant : la fonction reste
 * ainsi vérifiable sans mise en page, là où un `getBoundingClientRect` en test ne rendrait
 * que des zéros.
 */
export type ToolbarPlacement = 'above' | 'below' | 'inside'

export function toolbarPlacement(
  rect: Rect, viewport: Viewport, barHeightPx: number, gapPx: number = TOOLBAR_GAP_PX
): ToolbarPlacement {
  // Plaque de hauteur inconnue — jamais mesurée, ou page démontée : le cas courant est le
  // moins mauvais des trois par défaut.
  if (!(viewport.height > 0)) return 'above'
  const needed = barHeightPx + gapPx
  const topPx = (rect.y1 / NORMALIZED_MAX) * viewport.height
  const bottomPx = (rect.y2 / NORMALIZED_MAX) * viewport.height
  if (topPx >= needed) return 'above'
  if (viewport.height - bottomPx >= needed) return 'below'
  return 'inside'
}

/**
 * L'abscisse de la barre, en pourcentage de la plaque : celle du widget, sauf si la barre
 * en sortait par la droite — un widget collé au bord droit la faisait déborder du rendu,
 * et d'autant plus que le zoom est faible, la barre gardant sa taille en pixels quand la
 * plaque rétrécit. Elle glisse alors vers la gauche juste assez pour rentrer, ce qui pose
 * son bord droit contre celui de la plaque, donc contre celui du widget dans le cas qui
 * pose problème.
 *
 * L'écart gardé à droite est celui des autres bords, et il sert deux fois : `viewport()`
 * mesure la plaque **bordure comprise** — un pixel de chaque côté, `box-sizing:
 * content-box` — quand le calque, lui, ne couvre que l'intérieur ; six pixels absorbent
 * cette différence sans qu'il faille la modéliser.
 *
 * Le résultat est un pourcentage et non des pixels : le zoom redimensionne la plaque sous
 * le calque, et une position relative reste cohérente jusqu'au prochain calcul.
 */
export function toolbarLeftPercent(
  rect: Rect, viewport: Viewport, barWidthPx: number, gapPx: number = TOOLBAR_GAP_PX
): number {
  const wanted = rect.x1 / 100
  if (!(viewport.width > 0)) return wanted
  const rightmost = viewport.width - barWidthPx - gapPx
  // Barre plus large que la plaque — zoom minimal sur une page étroite : elle déborde de
  // toute façon, autant qu'elle déborde du même côté que le rendu commence.
  if (rightmost <= 0) return 0
  const leftPx = (rect.x1 / NORMALIZED_MAX) * viewport.width
  return (Math.min(leftPx, rightmost) / viewport.width) * 100
}

/**
 * Le calque d'édition. Il ne dessine pas les widgets — c'est `render/canvas.ts` qui s'en
 * charge, en dessous — mais uniquement les marques : cadre, équerres, segments, ellipse,
 * aperçu du geste, cote en millimètres.
 */
export function createEditor(options: EditorOptions): Editor {
  const grid = gridFor(options.device, options.orientation)
  const tr = options.tr

  const root = el('div', 'editor')
  root.tabIndex = 0
  root.setAttribute('role', 'application')
  root.setAttribute('aria-label', tr.t('editor.layerLabel'))

  /* Les marques du widget sélectionné, relevées sur l'appareil (§ 2.3). */
  const marks = el('div', 'editor__marks')
  marks.hidden = true
  for (const handle of CORNER_HANDLES) marks.append(el('span', `editor__corner editor__corner--${handle}`))
  for (const handle of SIDE_HANDLES) marks.append(el('span', `editor__side editor__side--${handle}`))
  marks.append(el('span', 'editor__grip'))

  /* Pendant le geste : le rectangle aimanté, et la poignée là où le doigt se trouve. */
  const preview = el('div', 'editor__preview')
  preview.hidden = true
  const ghost = el('div', 'editor__ghost')
  ghost.hidden = true
  const badge = el('div', 'editor__badge')
  badge.hidden = true

  /*
   * La barre d'outils de la sélection. L'appareil en montre une (§ 2, capture
   * `edition-barre-outils-et-widget-selectionne.png`) ; celle-ci s'en écarte sur trois
   * points, et les trois répondent à un manque relevé :
   *
   * - elle **dit le rang** du widget dans la pile. L'appareil n'en donne aucun retour :
   *   envoyer un widget sous une carte le fait disparaître sans rien afficher, et plus
   *   rien n'indique ensuite où il se trouve ni combien de crans le séparent de la
   *   surface (capture `edition-widget-envoye-en-arriere-plan.png`) ;
   * - les boutons d'empilement **sans effet sont désactivés** plutôt que muets — c'est la
   *   même information, lue avant d'appuyer plutôt qu'après ;
   * - « Supprimer » et « Dupliquer » sont écrits en toutes lettres, les quatre mouvements
   *   d'empilement portent une flèche. Un symbole pour « envoyer à l'arrière-plan » se
   *   devine ; un symbole pour « supprimer » se confond avec « fermer », et l'action est
   *   la seule des six qui fasse disparaître quelque chose.
   *
   * Elle est le seul élément du calque qui **intercepte le pointeur**, d'où le garde-fou
   * en tête de `onPointerDown` et de `onHover` : un clic sur un bouton ne doit jamais
   * démarrer un geste sur le widget qui se trouve dessous.
   */
  const toolbar = el('div', 'editor__toolbar')
  toolbar.hidden = true
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', tr.t('editor.toolbarLabel'))

  const toolButton = (
    modifier: string, text: string, label: string, keys: string
  ): HTMLButtonElement => {
    const button = el('button', `editor__tool editor__tool--${modifier}`, text)
    button.type = 'button'
    button.title = tr.t('editor.toolTitle', { label, keys })
    button.setAttribute('aria-label', label)
    return button
  }

  const STACK_TOOLS: ReadonlyArray<readonly [StackAction, string, string, string]> = [
    ['back', '⤓', tr.t('editor.sendToBack'), tr.t('editor.sendToBackKeys')],
    ['lower', '↓', tr.t('editor.lowerOne'), tr.t('editor.lowerOneKeys')],
    ['raise', '↑', tr.t('editor.raiseOne'), tr.t('editor.raiseOneKeys')],
    ['front', '⤒', tr.t('editor.bringToFront'), tr.t('editor.bringToFrontKeys')]
  ]

  const stackButtons = new Map<StackAction, HTMLButtonElement>()
  for (const [action, glyph, label, keys] of STACK_TOOLS) {
    const button = toolButton(action, glyph, label, keys)
    button.addEventListener('click', () => { runRestack(action); root.focus() })
    stackButtons.set(action, button)
    toolbar.append(button)
  }

  const rank = el('span', 'editor__rank')
  const duplicateTool = toolButton(
    'duplicate', tr.t('editor.duplicate'), tr.t('editor.duplicateWidget'),
    tr.t('editor.duplicateKeys')
  )
  duplicateTool.addEventListener('click', () => { runDuplicate(); root.focus() })
  const deleteTool = toolButton(
    'delete', tr.t('editor.delete'), tr.t('editor.deleteWidget'), tr.t('editor.deleteKeys')
  )
  deleteTool.addEventListener('click', () => { runRemove(); root.focus() })
  toolbar.append(rank, duplicateTool, deleteTool)

  const live = el('p', 'editor__live')
  live.setAttribute('aria-live', 'polite')

  root.append(preview, ghost, marks, badge, toolbar, live)

  let selected: number | undefined
  let gesture: ActiveGesture | undefined
  /**
   * Le calque démonté ne doit plus rien écrire. Les écoutes du calque partent avec lui,
   * mais celles des boutons vivent sur les boutons : une référence gardée par un appelant
   * — ou par un test — ne doit pas ressusciter une page que `render()` a déjà remplacée.
   */
  let alive = true

  const boxes = (): Rect[] => currentBoxes(options.page)

  const announce = (message: string): void => { live.textContent = message }

  /**
   * La barre d'outils ne doit jamais masquer le widget qu'elle sert à modifier — voir
   * `toolbarPlacement`, qui décide de laquelle des trois positions elle prend.
   *
   * L'ordre compte : le rang est écrit AVANT la mesure, puisque c'est son intitulé qui
   * fait la largeur de la barre, et la largeur décide du glissement horizontal.
   */
  const drawToolbar = (): void => {
    if (selected === undefined || gesture !== undefined || options.page.widgets.length === 0) {
      toolbar.hidden = true
      return
    }
    const count = options.page.widgets.length
    // La barre s'accroche aux bords DESSINÉS du gadget — voir `drawnRect`.
    const rect = drawnRect(currentBounds(options.page, selected), options.orientation)
    toolbar.hidden = false
    rank.textContent = stackLabel(selected, count, tr)
    for (const [action, button] of stackButtons) {
      button.disabled = stackTarget(action, selected, count) === selected
    }

    const viewport = options.viewport()
    const bar = toolbar.getBoundingClientRect()
    const placement = toolbarPlacement(rect, viewport, bar.height)
    toolbar.classList.toggle('editor__toolbar--below', placement === 'below')
    toolbar.classList.toggle('editor__toolbar--inside', placement === 'inside')
    // Sous le widget, la barre s'accroche à son bord INFÉRIEUR : c'est tout le défaut de
    // l'ancien `--below`, qui gardait `y1` et descendait donc à l'intérieur.
    toolbar.style.top = `${(placement === 'below' ? rect.y2 : rect.y1) / 100}%`
    toolbar.style.left = `${toolbarLeftPercent(rect, viewport, bar.width)}%`
  }

  // Les marques s'effacent pendant le geste, comme sur l'appareil : ce qui compte alors
  // est le couple aperçu aimanté / rectangle du doigt, et quatre équerres immobiles au
  // point de départ ne feraient que brouiller la lecture de l'écart entre les deux.
  const drawMarks = (): void => {
    if (selected === undefined || gesture !== undefined) {
      marks.hidden = true
    } else {
      marks.hidden = false
      place(marks, drawnRect(currentBounds(options.page, selected), options.orientation))
    }
    drawToolbar()
  }

  const drawGesture = (): void => {
    if (gesture === undefined) {
      preview.hidden = true
      ghost.hidden = true
      badge.hidden = true
      return
    }
    preview.hidden = false
    // L'aperçu montre où le gadget SERA dessiné une fois le geste relâché : il passe donc
    // par la grille de rendu, comme le calque de sélection qui le remplacera.
    place(preview, drawnRect(gesture.rect, options.orientation))

    const finger = fingerRect(gesture.startRect, gesture.handle, gesture.delta)
    ghost.hidden = false
    place(ghost, finger)

    // La cote n'apparaît qu'au redimensionnement : c'est le seul geste qui change la
    // taille, donc la lisibilité avec des gants. Pendant un déplacement, elle serait du
    // bruit — et l'appareil, lui, n'affiche jamais rien.
    if (gesture.handle === 'move') {
      badge.hidden = true
      return
    }
    badge.hidden = false
    badge.textContent = sizeLabel(gesture.rect, options.device, options.orientation, tr)
    // La cote reste celle du rectangle ÉCRIT (c'est elle que le pilote emporte), mais elle
    // se pose au coin DESSINÉ, sous l'aperçu qu'elle légende.
    const coin = drawnRect(gesture.rect, options.orientation)
    badge.style.left = `${coin.x1 / 100}%`
    badge.style.top = `${coin.y2 / 100}%`
  }

  const setSelection = (index: number | undefined): void => {
    if (index === selected) return
    selected = index
    drawMarks()
    options.onSelectionChange?.(index)
    if (index === undefined) {
      announce(tr.t('editor.noSelection'))
      return
    }
    const widget = widgetAt(options.page, index)
    announce(tr.t('editor.selected', {
      name: readableName(widget.shortName, options.language),
      size: sizeLabel(
        currentBounds(options.page, index), options.device, options.orientation, tr
      )
    }))
  }

  /* ------------------------------------------------- actions sur la sélection */

  /**
   * La sortie commune des trois actions : la sélection est replacée **là où l'action dit
   * qu'elle va**, les marques et la barre sont redessinées, puis l'appelant est prévenu —
   * dans cet ordre, pour qu'un abonné qui relit la page la trouve déjà cohérente.
   *
   * `setSelection` n'est pas employée ici : elle se tait quand le rang ne change pas de
   * valeur, ce qui est exactement le cas d'un widget qui reste au même rang alors que la
   * page a changé sous lui (une suppression au-dessous, par exemple).
   */
  const finishStructure = (
    edit: WidgetStructureEdit, announcement: string
  ): WidgetStructureEdit => {
    selected = edit.selection
    drawMarks()
    options.onSelectionChange?.(edit.selection)
    options.onStructureEdit?.(edit)
    announce(announcement)
    return edit
  }

  const pageTally = (count: number): string =>
    count === 0 ? tr.t('editor.emptyPage') : tr.t('editor.pageTally', { count })

  const runRemove = (): WidgetStructureEdit | undefined => {
    if (!alive || selected === undefined || gesture !== undefined) return undefined
    const edit = removeWidgetAt(options.page, selected, options.language, tr, selected)
    return finishStructure(edit, tr.t('editor.doneWithTally', {
      what: edit.description,
      tally: pageTally(options.page.widgets.length)
    }))
  }

  const runDuplicate = (): WidgetStructureEdit | undefined => {
    if (!alive || selected === undefined || gesture !== undefined) return undefined
    const edit = duplicateWidgetAt(options.page, selected, grid, options.language, tr)
    return finishStructure(edit, tr.t('editor.doneWithRank', {
      what: edit.description,
      rank: stackLabel(edit.index, options.page.widgets.length, tr)
    }))
  }

  const runRestack = (action: StackAction): WidgetStructureEdit | undefined => {
    if (!alive || selected === undefined || gesture !== undefined) return undefined
    const count = options.page.widgets.length
    const edit = restackWidget(options.page, selected, action, options.language, tr)
    // Rang déjà atteint : rien n'a été écrit et rien n'est enregistré, mais le silence
    // total laisserait croire à un bouton cassé — on redit où en est le widget.
    if (edit === undefined) {
      announce(tr.t('editor.nothingToChange', { rank: stackLabel(selected, count, tr) }))
      return undefined
    }
    return finishStructure(edit, tr.t('editor.doneWithRank', {
      what: edit.description,
      rank: stackLabel(edit.to, count, tr)
    }))
  }

  /* ------------------------------------------------------------------ pointeur */

  const onPointerMove = (event: MouseEvent): void => {
    if (gesture === undefined) return
    const delta = pixelToPageDelta(
      event.clientX - gesture.origin.clientX,
      event.clientY - gesture.origin.clientY,
      gesture.viewport
    )
    gesture.delta = delta
    gesture.rect = gestureRect(gesture.startRect, gesture.handle, delta, grid)
    drawGesture()
  }

  const endGesture = (commit: boolean): void => {
    if (gesture === undefined) return
    const finished = gesture
    gesture = undefined
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    root.classList.remove('editor--busy')

    if (commit) {
      const edit = commitGesture(
        options.page, finished.index, finished.handle, finished.rect, options.language, tr
      )
      if (edit !== undefined) {
        options.onEdit?.(edit)
        announce(tr.t('editor.doneWithSize', {
          what: edit.description,
          size: sizeLabel(edit.after, options.device, options.orientation, tr)
        }))
      }
    }
    drawGesture()
    drawMarks()
  }

  const onPointerUp = (): void => endGesture(true)
  const onPointerCancel = (): void => endGesture(false)

  /** La barre d'outils est le seul enfant du calque qui reçoive le pointeur pour lui. */
  const onToolbar = (target: EventTarget | null): boolean =>
    target instanceof Node && toolbar.contains(target)

  const onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0 || onToolbar(event.target)) return
    const viewport = options.viewport()
    const point = pixelToPage(event.clientX, event.clientY, viewport)
    const current = boxes()

    let index = selected
    let handle: Handle | undefined

    // Le widget déjà sélectionné garde ses prises, même recouvert par un autre : une
    // poignée saisie ne doit jamais sélectionner le voisin qui passe dessous.
    if (index !== undefined && current[index] !== undefined) {
      handle = handleAtPoint(current[index]!, point, handleTolerance(viewport))
      if (handle === undefined && isInMoveGrip(current[index]!, point)) handle = 'move'
    }

    if (handle === undefined) {
      index = widgetAtPoint(current, point)
      setSelection(index)
      if (index === undefined) return
      // Un clic simple saisit le widget : plus direct que l'appareil, qui exige de viser
      // l'ellipse. L'ellipse reste dessinée, et reste la prise du widget recouvert.
      handle = 'move'
    }
    if (index === undefined || current[index] === undefined) return

    gesture = {
      index, handle, startRect: current[index]!, rect: current[index]!, delta: { x: 0, y: 0 },
      origin: { clientX: event.clientX, clientY: event.clientY }, viewport
    }
    root.classList.add('editor--busy')
    root.focus()
    drawMarks()
    drawGesture()
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    event.preventDefault()
  }

  /**
   * Le curseur dit ce que le clic ferait, avant même de cliquer : la seule indication
   * qu'une poignée est atteignable, ses marques étant trop fines pour qu'on en soit sûr.
   */
  const CURSORS: Record<Handle, string> = {
    nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
    n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize', move: 'grab'
  }

  const onHover = (event: MouseEvent): void => {
    if (gesture !== undefined || onToolbar(event.target)) return
    const viewport = options.viewport()
    const point = pixelToPage(event.clientX, event.clientY, viewport)
    const current = boxes()
    let cursor = 'default'
    if (selected !== undefined && current[selected] !== undefined) {
      const handle = handleAtPoint(current[selected]!, point, handleTolerance(viewport))
      if (handle !== undefined) cursor = CURSORS[handle]
      else if (isInMoveGrip(current[selected]!, point)) cursor = CURSORS.move
    }
    if (cursor === 'default' && widgetAtPoint(current, point) !== undefined) cursor = 'grab'
    root.style.cursor = cursor
  }

  /* ------------------------------------------------------------------ clavier */

  const ARROWS: Record<string, Point> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }
  }

  /**
   * Au clavier, le pas est **la cellule** : c'est la seule valeur qui garantisse un
   * déplacement visible et qui laisse le widget sur la grille. Maj redimensionne par le
   * coin bas-droit, le geste le plus courant à la souris.
   */
  /**
   * Les six actions au clavier, dans le prolongement de ce qui existait : les flèches
   * agissent déjà sur la **géométrie** (seules : déplacer, avec Maj : redimensionner), la
   * touche de commande les fait agir sur le **rang** (seule : d'un cran, avec Maj :
   * jusqu'au bout). Suppr et Ctrl + D sont les conventions de tous les éditeurs ; Retour
   * arrière fait aussi bien, c'est la touche de suppression des claviers Mac.
   *
   * `Ctrl` et `Cmd` sont acceptées indifféremment : le même geste sur les deux systèmes.
   */
  const STACK_KEYS: Record<string, readonly [StackAction, StackAction]> = {
    // touche → [sans Maj, avec Maj]
    ArrowUp: ['raise', 'front'],
    ArrowDown: ['lower', 'back']
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (gesture !== undefined) endGesture(false)
      else setSelection(undefined)
      return
    }

    const command = event.ctrlKey || event.metaKey
    if (selected !== undefined && gesture === undefined) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        runRemove()
        return
      }
      if (command && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault()
        runDuplicate()
        return
      }
      const stack = command ? STACK_KEYS[event.key] : undefined
      if (stack !== undefined) {
        event.preventDefault()
        runRestack(stack[event.shiftKey ? 1 : 0])
        return
      }
    }
    // Ctrl + flèche ne déplace plus : la combinaison appartient désormais à l'empilement,
    // et les autres raccourcis de commande (annuler, rétablir) appartiennent à la page.
    if (command) return

    const step = ARROWS[event.key]
    if (step === undefined || selected === undefined || gesture !== undefined) return
    event.preventDefault()
    const handle: Handle = event.shiftKey ? 'se' : 'move'
    const rect = currentBounds(options.page, selected)
    const delta = { x: step.x * (NORMALIZED_MAX / grid.cols), y: step.y * (NORMALIZED_MAX / grid.rows) }
    const edit = commitGesture(
      options.page, selected, handle, gestureRect(rect, handle, delta, grid),
      options.language, tr
    )
    drawMarks()
    if (edit === undefined) return
    options.onEdit?.(edit)
    announce(tr.t('editor.doneWithSize', {
      what: edit.description,
      size: sizeLabel(edit.after, options.device, options.orientation, tr)
    }))
  }

  root.addEventListener('pointerdown', onPointerDown as EventListener)
  root.addEventListener('pointermove', onHover as EventListener)
  root.addEventListener('keydown', onKeyDown)

  return {
    element: root,
    selection: () => selected,
    select: (index) => setSelection(index),
    refresh: () => { drawMarks(); drawGesture() },
    remove: runRemove,
    duplicate: runDuplicate,
    restack: runRestack,
    destroy: () => {
      alive = false
      endGesture(false)
      root.removeEventListener('pointerdown', onPointerDown as EventListener)
      root.removeEventListener('pointermove', onHover as EventListener)
      root.removeEventListener('keydown', onKeyDown)
      root.remove()
    }
  }
}
