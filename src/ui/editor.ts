import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { Page } from '../model/layout'
import { gridFor, snapValue, NORMALIZED_MAX, type Grid, type Orientation, type Rect } from '../model/grid'
import { readWidgetBounds, setWidgetBounds, type Bounds } from '../model/mutations'
import { formatMm, widgetSizeMm } from './views'

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

/** Le libellé d'un geste, tel qu'il s'écrit dans un menu « Annuler … ». */
export function gestureDescription(handle: Handle, shortName: string, language: string): string {
  const verb = handle === 'move' ? 'Déplacer' : 'Redimensionner'
  return `${verb} ${readableName(shortName, language)}`
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
  page: Page, index: number, handle: Handle, rect: Rect, language: string
): WidgetEdit | undefined {
  const widget = widgetAt(page, index)
  const before = readWidgetBounds(widget.node)
  if (sameRect(before, rect)) return undefined
  setWidgetBounds(widget.node, rect)
  return {
    description: gestureDescription(handle, widget.shortName, language),
    widgetIndex: index,
    before,
    after: { ...rect }
  }
}

/** « 12,3 × 4,5 mm » : la taille réelle du widget sur la dalle choisie. */
export function sizeLabel(rect: Rect, device: Device, orientation: Orientation): string {
  const size = widgetSizeMm(rect, device, orientation)
  return `${formatMm(size.widthMm)} × ${formatMm(size.heightMm)} mm`
}

/* ================================================================== calque d'édition */

export interface EditorOptions {
  page: Page
  device: Device
  orientation: Orientation
  language: string
  /**
   * Les dimensions du rendu, en pixels de la fenêtre, relues à chaque geste : la page est
   * zoomable, et sa taille change sous le calque sans que celui-ci en soit averti.
   */
  viewport: () => Viewport
  /** Appelé une fois par geste **effectif**. Le point d'accroche de l'historique. */
  onEdit?: (edit: WidgetEdit) => void
  onSelectionChange?: (index: number | undefined) => void
}

export interface Editor {
  /** Le calque, à poser par-dessus le rendu de la page (`.plate` de `views.ts`). */
  element: HTMLElement
  selection: () => number | undefined
  select: (index: number | undefined) => void
  /** Redessine les marques depuis le document — après une annulation, par exemple. */
  refresh: () => void
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

/** Positionne un élément absolu sur un rectangle de page, en pourcentages. */
function place(node: HTMLElement, rect: Rect): void {
  node.style.left = `${rect.x1 / 100}%`
  node.style.top = `${rect.y1 / 100}%`
  node.style.width = `${(rect.x2 - rect.x1) / 100}%`
  node.style.height = `${(rect.y2 - rect.y1) / 100}%`
}

/**
 * Le calque d'édition. Il ne dessine pas les widgets — c'est `render/canvas.ts` qui s'en
 * charge, en dessous — mais uniquement les marques : cadre, équerres, segments, ellipse,
 * aperçu du geste, cote en millimètres.
 */
export function createEditor(options: EditorOptions): Editor {
  const grid = gridFor(options.device, options.orientation)

  const root = el('div', 'editor')
  root.tabIndex = 0
  root.setAttribute('role', 'application')
  root.setAttribute('aria-label', 'Édition de la page : flèches pour déplacer, Maj + flèches pour redimensionner')

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

  const live = el('p', 'editor__live')
  live.setAttribute('aria-live', 'polite')

  root.append(preview, ghost, marks, badge, live)

  let selected: number | undefined
  let gesture: ActiveGesture | undefined

  const boxes = (): Rect[] => currentBoxes(options.page)

  const announce = (message: string): void => { live.textContent = message }

  // Les marques s'effacent pendant le geste, comme sur l'appareil : ce qui compte alors
  // est le couple aperçu aimanté / rectangle du doigt, et quatre équerres immobiles au
  // point de départ ne feraient que brouiller la lecture de l'écart entre les deux.
  const drawMarks = (): void => {
    if (selected === undefined || gesture !== undefined) {
      marks.hidden = true
      return
    }
    marks.hidden = false
    place(marks, currentBounds(options.page, selected))
  }

  const drawGesture = (): void => {
    if (gesture === undefined) {
      preview.hidden = true
      ghost.hidden = true
      badge.hidden = true
      return
    }
    preview.hidden = false
    place(preview, gesture.rect)

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
    badge.textContent = sizeLabel(gesture.rect, options.device, options.orientation)
    badge.style.left = `${gesture.rect.x1 / 100}%`
    badge.style.top = `${gesture.rect.y2 / 100}%`
  }

  const setSelection = (index: number | undefined): void => {
    if (index === selected) return
    selected = index
    drawMarks()
    options.onSelectionChange?.(index)
    if (index === undefined) {
      announce('Aucun widget sélectionné.')
      return
    }
    const widget = widgetAt(options.page, index)
    announce(
      `${readableName(widget.shortName, options.language)} sélectionné, ` +
      `${sizeLabel(currentBounds(options.page, index), options.device, options.orientation)}.`
    )
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
        options.page, finished.index, finished.handle, finished.rect, options.language
      )
      if (edit !== undefined) {
        options.onEdit?.(edit)
        announce(`${edit.description} : ${sizeLabel(edit.after, options.device, options.orientation)}.`)
      }
    }
    drawGesture()
    drawMarks()
  }

  const onPointerUp = (): void => endGesture(true)
  const onPointerCancel = (): void => endGesture(false)

  const onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0) return
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
    if (gesture !== undefined) return
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
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (gesture !== undefined) endGesture(false)
      else setSelection(undefined)
      return
    }
    const step = ARROWS[event.key]
    if (step === undefined || selected === undefined || gesture !== undefined) return
    event.preventDefault()
    const handle: Handle = event.shiftKey ? 'se' : 'move'
    const rect = currentBounds(options.page, selected)
    const delta = { x: step.x * (NORMALIZED_MAX / grid.cols), y: step.y * (NORMALIZED_MAX / grid.rows) }
    const edit = commitGesture(
      options.page, selected, handle, gestureRect(rect, handle, delta, grid), options.language
    )
    drawMarks()
    if (edit === undefined) return
    options.onEdit?.(edit)
    announce(`${edit.description} : ${sizeLabel(edit.after, options.device, options.orientation)}.`)
  }

  root.addEventListener('pointerdown', onPointerDown as EventListener)
  root.addEventListener('pointermove', onHover as EventListener)
  root.addEventListener('keydown', onKeyDown)

  return {
    element: root,
    selection: () => selected,
    select: (index) => setSelection(index),
    refresh: () => { drawMarks(); drawGesture() },
    destroy: () => {
      endGesture(false)
      root.removeEventListener('pointerdown', onPointerDown as EventListener)
      root.removeEventListener('pointermove', onHover as EventListener)
      root.removeEventListener('keydown', onKeyDown)
      root.remove()
    }
  }
}
