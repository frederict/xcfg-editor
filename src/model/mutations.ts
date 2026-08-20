import type { JsonNode } from '../core/jsonDocument'
import { getMember, readNumber, setLiteral, setString } from '../core/access'
import type { Navigations } from './layout'

/**
 * Primitives de modification du document.
 *
 * Règle unique dont tout le reste découle : **on ne reconstruit jamais un objet**. Une
 * mutation ne fait que trois choses — remplacer la valeur d'une clé existante, déplacer
 * des éléments dans un tableau, recopier un nœud entrée par entrée. Les clés que l'outil
 * ne comprend pas ne sont donc jamais lues, jamais réécrites, jamais perdues : elles
 * voyagent avec leur nœud, texte source compris.
 *
 * Les coordonnées arrivent **déjà calculées** : l'aimantation sur la grille de XCTrack se
 * fait en amont (voir `docs/reference/edition-native-exploration.md` § 2.2). Ces primitives
 * s'emploient indifféremment avec ou sans grille.
 */

export type Orientation = 'portrait' | 'landscape'

/** Les quatre coordonnées d'un widget, dans le repère 0–10000 de la page. */
export interface Bounds { x1: number; y1: number; x2: number; y2: number }

type ArrayNode = Extract<JsonNode, { kind: 'array' }>
type ObjectNode = Extract<JsonNode, { kind: 'object' }>

const BOUND_FIELDS = ['x1', 'y1', 'x2', 'y2'] as const
const BOUND_KEYS = { x1: 'X1', y1: 'Y1', x2: 'X2', y2: 'Y2' } as const

/** Le repère de page de XCTrack : les 519 widgets du corpus y tiennent tous. */
const COORDINATE_MAX = 10000

const PAGE_CLASS_PREFIX = 'org.xcontest.XCTrack.widget.wp.'

/** Les quatre classes que l'appareil propose à la création d'une page. */
export const PAGE_CLASSES = [
  'WPThermalAssistant', 'WPXCAssistant', 'WPCompetition', 'WPEmpty'
] as const

// --------------------------------------------------------------------------- outils

/** Encode une chaîne avec ses guillemets, forme attendue par `setString`. */
function encode(value: string): string {
  return JSON.stringify(value)
}

function requireArray(node: JsonNode | undefined, what: string): ArrayNode {
  if (node?.kind !== 'array') throw new Error(`${what} : tableau attendu`)
  return node
}

/** Index d'un élément existant : 0 à length − 1. */
function requireIndex(index: number, length: number, what: string): number {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new Error(`${what} : index ${index} hors de [0, ${length - 1}]`)
  }
  return index
}

/** Index d'insertion : 0 à length, la borne haute plaçant l'élément en dernier. */
function requireInsertIndex(index: number, length: number, what: string): number {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new Error(`${what} : index ${index} hors de [0, ${length}]`)
  }
  return index
}

function moveItem(items: JsonNode[], from: number, to: number): number {
  const [node] = items.splice(from, 1)
  items.splice(to, 0, node!)
  return to
}

/**
 * Copie profonde d'un nœud. Les entrées d'objet sont recopiées une à une, dans l'ordre,
 * avec leur clé et leur texte source : la copie est indistinguable de l'original une fois
 * réécrite, y compris sur les clés qu'aucune version connue ne documente.
 */
export function cloneNode(node: JsonNode): JsonNode {
  if (node.kind === 'object') {
    return {
      kind: 'object',
      entries: node.entries.map(([key, value]) => [key, cloneNode(value)] as [string, JsonNode])
    }
  }
  if (node.kind === 'array') return { kind: 'array', items: node.items.map(cloneNode) }
  return { ...node }
}

// ------------------------------------------------------------------ coordonnées

function assertCoordinate(value: number, key: string): void {
  if (!Number.isInteger(value) || value < 0 || value > COORDINATE_MAX) {
    throw new Error(`${key} : ${value} n'est pas un entier de [0, ${COORDINATE_MAX}]`)
  }
}

export function readWidgetBounds(widget: JsonNode): Bounds {
  const bounds = {} as Bounds
  for (const field of BOUND_FIELDS) {
    const key = BOUND_KEYS[field]
    const value = readNumber(widget, key)
    if (value === undefined) throw new Error(`widget sans ${key}`)
    bounds[field] = value
  }
  return bounds
}

/**
 * Redimensionne ou repositionne : écrit une à quatre coordonnées, les autres ne sont pas
 * touchées. Le rectangle obtenu est validé **avant la première écriture** — un appel refusé
 * ne laisse pas le widget à moitié modifié — et il doit rester dans la page et dans le bon
 * sens : les 519 widgets du corpus vérifient tous `X1 < X2` et `Y1 < Y2`. Ramener un geste
 * de l'utilisateur dans ces bornes est le travail de l'appelant, pas le nôtre : nous ne
 * corrigeons rien en silence.
 *
 * Une coordonnée déjà à la valeur demandée n'est pas réécrite, ce qui préserve son texte
 * source d'origine — un déplacement nul ne change pas un octet.
 */
export function setWidgetBounds(widget: JsonNode, bounds: Partial<Bounds>): void {
  const current = readWidgetBounds(widget)
  const next = { ...current }
  for (const field of BOUND_FIELDS) {
    const value = bounds[field]
    if (value !== undefined) next[field] = value
  }

  for (const field of BOUND_FIELDS) assertCoordinate(next[field], BOUND_KEYS[field])
  if (next.x1 >= next.x2 || next.y1 >= next.y2) {
    throw new Error(`rectangle vide ou inversé : ${JSON.stringify(next)}`)
  }

  for (const field of BOUND_FIELDS) {
    if (next[field] !== current[field]) setLiteral(widget, BOUND_KEYS[field], String(next[field]))
  }
}

/** Déplace un widget : les quatre coordonnées sont translatées en une seule opération. */
export function moveWidgetBy(widget: JsonNode, dx: number, dy: number): void {
  const bounds = readWidgetBounds(widget)
  setWidgetBounds(widget, {
    x1: bounds.x1 + dx, y1: bounds.y1 + dy, x2: bounds.x2 + dx, y2: bounds.y2 + dy
  })
}

/**
 * Copie indépendante d'un widget, éventuellement replacée. C'est le mécanisme de création :
 * faute de connaître les valeurs par défaut de chaque type — une centaine de clés, dont la
 * plupart ne sont documentées nulle part — on repart d'un widget qui existe.
 */
export function duplicateWidget(widget: JsonNode, bounds?: Partial<Bounds>): JsonNode {
  const copy = cloneNode(widget)
  if (bounds) setWidgetBounds(copy, bounds)
  return copy
}

// --------------------------------------------------------------- widgets d'une page

/**
 * Le tableau `widgets` d'une page. Son ordre est l'ordre de dessin : le premier élément est
 * au fond, le dernier au-dessus.
 */
export function pageWidgets(page: JsonNode): ArrayNode {
  return requireArray(getMember(page, 'widgets'), 'widgets')
}

/** Insère à la position demandée du tableau, donc à ce rang d'empilement. Par défaut au premier plan. */
export function insertWidget(page: JsonNode, widget: JsonNode, index?: number): number {
  const items = pageWidgets(page).items
  const at = index === undefined
    ? items.length
    : requireInsertIndex(index, items.length, 'insertWidget')
  items.splice(at, 0, widget)
  return at
}

/** Retire un widget et le rend à l'appelant — le réinsérer restitue le document d'origine. */
export function removeWidget(page: JsonNode, index: number): JsonNode {
  const items = pageWidgets(page).items
  return items.splice(requireIndex(index, items.length, 'removeWidget'), 1)[0]!
}

/** Change le rang d'empilement d'un widget. `to` est son index d'arrivée. */
export function reorderWidget(page: JsonNode, from: number, to: number): number {
  const items = pageWidgets(page).items
  requireIndex(from, items.length, 'reorderWidget')
  requireIndex(to, items.length, 'reorderWidget')
  return moveItem(items, from, to)
}

/** Avance d'un rang. Sans effet sur le widget déjà au premier plan. */
export function raiseWidget(page: JsonNode, index: number): number {
  const items = pageWidgets(page).items
  requireIndex(index, items.length, 'raiseWidget')
  return moveItem(items, index, Math.min(index + 1, items.length - 1))
}

/** Recule d'un rang. Sans effet sur le widget déjà en arrière-plan. */
export function lowerWidget(page: JsonNode, index: number): number {
  const items = pageWidgets(page).items
  requireIndex(index, items.length, 'lowerWidget')
  return moveItem(items, index, Math.max(index - 1, 0))
}

/** « Amener à l'avant-plan » : dernier du tableau, donc dessiné en dernier. */
export function bringWidgetToFront(page: JsonNode, index: number): number {
  const items = pageWidgets(page).items
  requireIndex(index, items.length, 'bringWidgetToFront')
  return moveItem(items, index, items.length - 1)
}

/** « Envoyer en arrière-plan » : premier du tableau, donc dessiné en premier. */
export function sendWidgetToBack(page: JsonNode, index: number): number {
  const items = pageWidgets(page).items
  requireIndex(index, items.length, 'sendWidgetToBack')
  return moveItem(items, index, 0)
}

/**
 * Déplace un widget d'une page à l'autre, sans le recopier : c'est le même nœud qui voyage,
 * clés inconnues comprises. Appelée avec la même page en source et en cible, l'opération se
 * réduit à un réordonnancement.
 */
export function moveWidgetToPage(
  from: JsonNode, index: number, to: JsonNode, toIndex?: number
): number {
  const fromItems = pageWidgets(from).items
  const toItems = pageWidgets(to).items

  if (fromItems === toItems) {
    requireIndex(index, fromItems.length, 'moveWidgetToPage')
    const at = toIndex === undefined
      ? fromItems.length - 1
      : requireIndex(toIndex, fromItems.length, 'moveWidgetToPage')
    return moveItem(fromItems, index, at)
  }

  const at = toIndex === undefined
    ? toItems.length
    : requireInsertIndex(toIndex, toItems.length, 'moveWidgetToPage')
  const widget = removeWidget(from, index)
  toItems.splice(at, 0, widget)
  return at
}

// ------------------------------------------------------------------------- pages

/** Le tableau des pages d'une orientation. */
export function pagesNode(document: JsonNode, orientation: Orientation): ArrayNode {
  const layout = getMember(document, 'layout')
  if (layout === undefined) throw new Error('document sans layout')
  return requireArray(getMember(layout, orientation), `layout.${orientation}`)
}

/** Nom de classe complet à partir d'un nom court connu, ou nom complet transmis tel quel. */
function pageClassName(className: string): string {
  if (className.includes('.')) return className
  if ((PAGE_CLASSES as readonly string[]).includes(className)) return PAGE_CLASS_PREFIX + className
  throw new Error(`classe de page inconnue : ${className}`)
}

function navigationsNode(navigations: Navigations): JsonNode {
  if (navigations.kind === 'list') {
    return {
      kind: 'array',
      items: navigations.classNames.map((name) => ({ kind: 'string', raw: encode(name) }) as JsonNode)
    }
  }
  return { kind: 'string', raw: encode(navigations.kind) }
}

/**
 * Une page neuve, **sans widgets**. L'appareil, lui, préremplit la page du jeu par défaut de
 * sa classe (12 widgets pour une « Aide thermique ») ; ce jeu n'est pas connu et on ne
 * l'invente pas — on peuple la page en dupliquant des widgets existants.
 */
export function createPage(className: string, navigations: Navigations = { kind: 'all' }): JsonNode {
  const page: ObjectNode = {
    kind: 'object',
    entries: [
      ['"CLASS"', { kind: 'string', raw: encode(pageClassName(className)) }],
      ['"navigations"', navigationsNode(navigations)],
      ['"widgets"', { kind: 'array', items: [] }]
    ]
  }
  return page
}

/** Copie indépendante d'une page et de tous ses widgets. */
export function duplicatePage(page: JsonNode): JsonNode {
  return cloneNode(page)
}

/** Insère une page dans une orientation. Par défaut en dernière position. */
export function insertPage(
  document: JsonNode, orientation: Orientation, page: JsonNode, index?: number
): number {
  const items = pagesNode(document, orientation).items
  const at = index === undefined
    ? items.length
    : requireInsertIndex(index, items.length, 'insertPage')
  items.splice(at, 0, page)
  return at
}

/** Retire une page et la rend à l'appelant — la réinsérer restitue le document d'origine. */
export function removePage(document: JsonNode, orientation: Orientation, index: number): JsonNode {
  const items = pagesNode(document, orientation).items
  return items.splice(requireIndex(index, items.length, 'removePage'), 1)[0]!
}

/** Change l'ordre des pages d'une orientation : c'est l'ordre du carrousel, donc du vol. */
export function reorderPage(
  document: JsonNode, orientation: Orientation, from: number, to: number
): number {
  const items = pagesNode(document, orientation).items
  requireIndex(from, items.length, 'reorderPage')
  requireIndex(to, items.length, 'reorderPage')
  return moveItem(items, from, to)
}

/**
 * Change la classe d'une page. Un nom court doit être l'une des quatre classes proposées par
 * l'appareil ; un nom complet est transmis tel quel, car un fichier peut porter une classe
 * qu'aucune version connue ne documente et ce n'est pas à nous de la refuser.
 *
 * XCTrack, lui, ne sait pas faire : la classe s'y fixe à la création (§ 5.2 du relevé).
 */
export function setPageClass(page: JsonNode, className: string): void {
  setString(page, 'CLASS', encode(pageClassName(className)))
}
