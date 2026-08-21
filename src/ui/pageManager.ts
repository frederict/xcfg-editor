import type { JsonNode } from '../core/jsonDocument'
import type { Page } from '../model/layout'
import {
  createPage,
  duplicatePage,
  insertPage,
  pagesNode,
  removePage,
  reorderPage,
  setPageClass,
  type Orientation
} from '../model/mutations'
import { renderPage } from '../render/canvas'
import { aspectRatioOf, pageKind, type ViewContext } from './views'

/**
 * La gestion des pages : en insérer, en supprimer, en dupliquer, les réordonner.
 *
 * Le module est coupé en deux, comme `editor.ts` :
 *
 * 1. **le modèle des opérations**, en haut — des fonctions pures qui décrivent une
 *    opération, en calculent les conséquences et l'appliquent au document par les
 *    primitives de `model/mutations.ts`. Aucune ne touche au DOM ; ce sont elles que
 *    les tests exercent sur les fichiers réels du corpus ;
 * 2. **le carrousel**, en bas — les vignettes, les points d'insertion, les commandes.
 *    Il ne décide de rien : il construit une opération, en demande la description et
 *    l'annonce, puis appelle `onOperation`. Le document, l'historique et le
 *    rafraîchissement appartiennent à l'appelant.
 *
 * Ce qui est repris de l'édition native (relevé § 5 de
 * `docs/reference/edition-native-exploration.md`) : le carrousel horizontal de vignettes
 * rendues en direct, la classe au-dessus, les icônes d'insertion **entre** les pages
 * plutôt qu'un bouton unique en fin de liste, les quatre classes proposées à la création,
 * le glisser-déposer pour réordonner, la duplication et la corbeille.
 *
 * Ce qui s'en écarte, volontairement :
 *
 * - **la suppression demande confirmation**. L'appareil supprime au premier appui, sans
 *   rien dire ; ici le bouton passe d'abord à « Confirmer », et la conséquence — le
 *   décalage de toutes les pages suivantes — s'écrit à ce moment-là, avant le geste et
 *   non après. L'annulation reste possible ensuite (`model/history.ts`), mais un pilote
 *   qui a fermé l'onglet n'annule plus rien ;
 * - **la classe reste modifiable après création**. XCTrack ne le propose sur aucun de
 *   ses écrans (§ 5.2) ; ce n'est pourtant qu'une clé du fichier, et le refuser serait
 *   contraindre l'éditeur à une limite de l'appareil. C'est donc offert, mais **dit** :
 *   la conséquence côté XCTrack n'a pas été vérifiée sur l'appareil, et l'avertissement
 *   correspondant s'affiche en permanence dès que la commande est active. L'appelant
 *   peut s'en tenir au comportement de l'appareil avec `allowClassChange: false` ;
 * - **les commandes de rang doublent le glisser-déposer**. « ◀ » et « ▶ » font le même
 *   travail au clavier, ce qu'un glisser-déposer ne fait pas.
 *
 * Ce qui n'est **pas** offert : la modification de `navigations`. La boîte des cinq
 * icônes de l'appareil (§ 5.4) demanderait une primitive d'écriture que
 * `model/mutations.ts` n'a pas — `createPage` sait poser des navigations, rien ne sait
 * les changer ensuite. Elles sont donc affichées, jamais éditées.
 */

/* ======================================================== le modèle des opérations */

/** Une page neuve est activée pour toutes les navigations, comme sur l'appareil (§ 5.2). */
const NEW_PAGE_NAVIGATIONS = { kind: 'all' } as const

/** La classe dont XCTrack fait la cible de son basculement automatique en spirale. */
export const THERMAL_ASSISTANT_CLASS = 'WPThermalAssistant'

const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: 'paysage',
  portrait: 'portrait'
}

export interface PageChoice {
  className: string
  label: string
  description: string
}

/**
 * Les quatre entrées de « Choisissez une nouvelle page », dans l'ordre et avec les mots
 * de l'appareil (§ 5.2) — un pilote qui a vu cet écran doit retrouver la même liste.
 */
export const PAGE_CHOICES: readonly PageChoice[] = [
  {
    className: 'WPThermalAssistant',
    label: 'Aide thermique',
    description: 'Cible du basculement automatique en spirale. Masquée hors contexte de vol.'
  },
  {
    className: 'WPXCAssistant',
    label: 'Aide XC',
    description: 'Aide FAI et routes. Aucun basculement automatique.'
  },
  {
    className: 'WPCompetition',
    label: 'Compétition',
    description: 'Navigation en compétition. Masquée hors contexte de vol.'
  },
  {
    className: 'WPEmpty',
    label: 'Vide',
    description: 'Page ordinaire, toujours atteignable par « page suivante ».'
  }
]

/** Les cinq navigations de la boîte de visibilité (§ 5.4), pour l'affichage seul. */
const NAVIGATION_LABELS: Record<string, string> = {
  TaskBackToTakeoff: 'Retour au décollage',
  TaskTriangleClosing: 'Fermeture de triangle',
  TaskToWaypoint: 'Vers une balise',
  TaskCompetition: 'Compétition',
  TaskToLivePilot: 'Vers un pilote en direct'
}

export type PageOperation =
  | { kind: 'insert'; index: number; className: string }
  | { kind: 'duplicate'; index: number }
  | { kind: 'remove'; index: number }
  | { kind: 'reorder'; from: number; to: number }
  | { kind: 'setClass'; index: number; className: string }

/** Le nom court d'une classe de page : `…wp.WPEmpty` → `WPEmpty`. */
export function shortClassName(className: string): string {
  return className.split('.').pop() ?? ''
}

/** Le libellé de création d'une classe — celui de l'appareil, sinon le nom court. */
export function creationLabel(className: string): string {
  const short = shortClassName(className)
  return PAGE_CHOICES.find((choice) => choice.className === short)?.label ?? short
}

function orientationLabel(orientation: Orientation): string {
  return ORIENTATION_LABELS[orientation]
}

/** « 3 » ou « 3 à 5 », en rangs affichés (à partir de 1). */
function rangeLabel(firstRank: number, lastRank: number): string {
  return firstRank === lastRank ? String(firstRank) : `${firstRank} à ${lastRank}`
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular
}

/**
 * La description qui part à l'historique. Elle nomme le **rang**, parce que c'est la
 * seule identité d'une page — « Supprimer la page 3 (paysage) » se relit sans ambiguïté
 * dans un menu « Annuler », ce qu'un identifiant interne ne permettrait pas.
 */
export function describeOperation(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation
): string {
  const where = ` (${orientationLabel(orientation)})`
  switch (operation.kind) {
    case 'insert':
      return `Insérer une page « ${creationLabel(operation.className)} » au rang ${operation.index + 1}${where}`
    case 'duplicate':
      return `Dupliquer la page ${operation.index + 1} au rang ${operation.index + 2}${where}`
    case 'remove':
      return `Supprimer la page ${operation.index + 1}${where}`
    case 'reorder':
      return `Déplacer la page ${operation.from + 1} au rang ${operation.to + 1}${where}`
    case 'setClass': {
      const before = creationLabel(pages[operation.index]?.className ?? '')
      return `Changer le type de la page ${operation.index + 1} : ` +
        `« ${before} » → « ${creationLabel(operation.className)} »${where}`
    }
  }
}

/** Ce que l'interface annonce une fois l'opération faite, `pages` étant l'état d'AVANT. */
export function operationAnnouncement(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation
): string {
  const done = describeOperation(pages, operation, orientation)
  const shift = shiftAdvice(pages, operation)
  return shift === undefined ? `${done}.` : `${done}. ${shift.text}`
}

/* ------------------------------------------------------------------ les conséquences */

export type AdviceKind = 'shift' | 'thermal' | 'visibility' | 'class'

export interface Advice {
  kind: AdviceKind
  text: string
}

/** Les rangs affichés (à partir de 1) des pages d'assistant de thermique. */
export function thermalAssistantRanks(pages: readonly Page[]): number[] {
  const ranks: number[] = []
  pages.forEach((page, index) => {
    if (shortClassName(page.className) === THERMAL_ASSISTANT_CLASS) ranks.push(index + 1)
  })
  return ranks
}

/**
 * La page vers laquelle XCTrack bascule en spirale, ou `undefined` s'il n'y en a aucune.
 *
 * Le manuel est formel là où l'appareil ne dit rien : **s'il existe plusieurs pages
 * `WPThermalAssistant`, c'est la dernière qui sert de cible** (§ 5 du relevé). Les
 * précédentes restent atteignables par « page suivante », mais plus jamais par le
 * basculement automatique — une page que le pilote croit voir arriver en thermique et
 * qui n'arrive pas.
 */
export function autoSwitchTargetRank(pages: readonly Page[]): number | undefined {
  const ranks = thermalAssistantRanks(pages)
  return ranks.length === 0 ? undefined : ranks[ranks.length - 1]
}

/** Nombre de pages que l'appareil montre au sol, hors contexte de vol. */
export function visibleOnGroundCount(pages: readonly Page[]): number {
  return pages.filter((page) => !pageKind(page.className).hiddenOutOfFlight).length
}

/** La classe qu'aurait la page de rang `index` après l'opération, s'il y en a une. */
function resultingClassName(operation: PageOperation, pages: readonly Page[]): string | undefined {
  if (operation.kind === 'insert') return shortClassName(operation.className)
  if (operation.kind === 'setClass') return shortClassName(operation.className)
  if (operation.kind === 'duplicate') return shortClassName(pages[operation.index]?.className ?? '')
  return undefined
}

/**
 * Le décalage des rangs. C'est l'avertissement le plus important de ce module : une page
 * n'a pas de nom, son rang EST son identité, et c'est ce rang que le pilote parcourt en
 * vol par appuis longs. Insérer en 3 ne fait pas qu'ajouter une page : cela change ce que
 * montrent tous les appuis suivants.
 */
function shiftAdvice(pages: readonly Page[], operation: PageOperation): Advice | undefined {
  const count = pages.length
  const identity = 'Le rang est la seule identité d’une page : c’est lui que vous ' +
    'parcourez en vol.'

  if (operation.kind === 'insert' || operation.kind === 'duplicate') {
    const first = operation.kind === 'insert' ? operation.index : operation.index + 1
    if (first >= count) return undefined
    const moved = count - first
    return {
      kind: 'shift',
      text: `${plural(moved, 'La page', 'Les pages')} ${rangeLabel(first + 1, count)} ` +
        `${plural(moved, 'devient', 'deviennent')} ${rangeLabel(first + 2, count + 1)}. ${identity}`
    }
  }

  if (operation.kind === 'remove') {
    const moved = count - operation.index - 1
    if (moved <= 0) return undefined
    return {
      kind: 'shift',
      text: `${plural(moved, 'La page', 'Les pages')} ${rangeLabel(operation.index + 2, count)} ` +
        `${plural(moved, 'devient', 'deviennent')} ${rangeLabel(operation.index + 1, count - 1)}. ${identity}`
    }
  }

  if (operation.kind === 'reorder' && operation.from !== operation.to) {
    const low = Math.min(operation.from, operation.to)
    const high = Math.max(operation.from, operation.to)
    return {
      kind: 'shift',
      text: `Les pages ${rangeLabel(low + 1, high + 1)} changent de rang. ${identity}`
    }
  }

  return undefined
}

/**
 * Ce qu'il faut dire AVANT d'appliquer une opération, `pages` étant l'état courant.
 * Rien n'est corrigé, rien n'est refusé : on énonce la conséquence, le pilote décide.
 */
export function operationAdvice(pages: readonly Page[], operation: PageOperation): Advice[] {
  const advice: Advice[] = []

  const shift = shiftAdvice(pages, operation)
  if (shift) advice.push(shift)

  /* Une seconde page d'assistant de thermique prive la première du basculement. */
  const created = resultingClassName(operation, pages)
  if (created === THERMAL_ASSISTANT_CLASS) {
    const existing = thermalAssistantRanks(pages)
      .filter((rank) => !(operation.kind === 'setClass' && rank === operation.index + 1))
    if (existing.length > 0) {
      const last = existing[existing.length - 1]!
      advice.push({
        kind: 'thermal',
        text: `Ce fichier décrit déjà ${plural(existing.length, 'une page', 'des pages')} ` +
          `d’assistant de thermique (${plural(existing.length, 'page', 'pages')} ${existing.join(', ')}). ` +
          'XCTrack bascule en spirale vers la DERNIÈRE : en créer une autre après elle rend ' +
          `la page ${last} inatteignable par ce basculement, sans rien changer à son contenu.`
      })
    }
  }

  /* Supprimer la dernière page visible au sol laisse un appareil qui ne montre plus rien. */
  if (operation.kind === 'remove') {
    const remaining = pages.filter((_, index) => index !== operation.index)
    if (remaining.length === 0) {
      advice.push({
        kind: 'visibility',
        text: 'C’est la dernière page de cette orientation : le fichier n’en décrirait plus aucune.'
      })
    } else if (visibleOnGroundCount(pages) > 0 && visibleOnGroundCount(remaining) === 0) {
      advice.push({
        kind: 'visibility',
        text: `Il ne resterait que des pages masquées hors contexte de vol : au sol, ` +
          'l’appareil n’en montrerait plus aucune.'
      })
    }
    if (shortClassName(pages[operation.index]?.className ?? '') === THERMAL_ASSISTANT_CLASS) {
      const others = thermalAssistantRanks(pages).filter((rank) => rank !== operation.index + 1)
      advice.push({
        kind: 'thermal',
        text: others.length === 0
          ? 'C’est la seule page d’assistant de thermique : le basculement automatique en ' +
            'spirale n’aurait plus de cible.'
          : `Le basculement automatique en spirale viserait alors la page ${others[others.length - 1]}.`
      })
    }
  }

  if (operation.kind === 'setClass') advice.push(CLASS_CHANGE_ADVICE)

  return advice
}

/**
 * Le seul avertissement de ce module qui porte sur l'outil et non sur le fichier : nous
 * offrons une commande que XCTrack n'a pas, et nous n'avons pas pu en vérifier l'effet.
 */
export const CLASS_CHANGE_ADVICE: Advice = {
  kind: 'class',
  text: 'XCTrack ne permet pas de changer le type d’une page après sa création : il s’y ' +
    'fixe au moment du choix. Ce n’est pourtant qu’une ligne du fichier, et cet éditeur ' +
    'l’écrit ' +
    'volontiers — mais le comportement de l’appareil face à une page ainsi modifiée n’a PAS ' +
    'été vérifié, et les gadgets de la page ne sont pas remplacés par ceux du nouveau type.'
}

/** Ce qu'il faut dire de l'état courant d'une orientation, indépendamment de tout geste. */
export function layoutAdvice(pages: readonly Page[]): Advice[] {
  const advice: Advice[] = []

  const thermal = thermalAssistantRanks(pages)
  if (thermal.length > 1) {
    const target = thermal[thermal.length - 1]!
    const others = thermal.slice(0, -1)
    advice.push({
      kind: 'thermal',
      text: `${thermal.length} pages d’assistant de thermique (pages ${thermal.join(', ')}). ` +
        `XCTrack ne bascule en spirale que vers la dernière, la page ${target} : ` +
        `${plural(others.length, 'la page', 'les pages')} ${others.join(', ')} ` +
        `${plural(others.length, 'reste atteignable', 'restent atteignables')} par « page ` +
        'suivante », jamais par le basculement automatique.'
    })
  }

  const hidden = pages.length - visibleOnGroundCount(pages)
  if (pages.length > 0 && hidden === pages.length) {
    advice.push({
      kind: 'visibility',
      text: 'Toutes les pages de cette orientation sont masquées hors contexte de vol : ' +
        'au sol, l’appareil n’en montre aucune.'
    })
  }

  return advice
}

/* ---------------------------------------------------------------- l'application */

export interface PageOperationResult {
  /** Rang (0-based) à mettre en avant après l'opération, `undefined` si la liste est vide. */
  index: number | undefined
  /** La page retirée, pour une suppression : la réinsérer au même rang restitue le document. */
  removed?: JsonNode
}

/**
 * Applique l'opération au document vivant, par les seules primitives de
 * `model/mutations.ts` — donc sans jamais reconstruire un nœud : les clés que cet outil
 * ne comprend pas voyagent avec leur page, texte source compris.
 *
 * L'appelant enregistre ensuite le pas d'historique sous `describeOperation`.
 */
export function applyPageOperation(
  document: JsonNode, orientation: Orientation, operation: PageOperation
): PageOperationResult {
  const items = pagesNode(document, orientation).items

  switch (operation.kind) {
    case 'insert': {
      const at = insertPage(
        document, orientation, createPage(operation.className, NEW_PAGE_NAVIGATIONS), operation.index
      )
      return { index: at }
    }
    case 'duplicate': {
      const source = items[operation.index]
      if (source === undefined) {
        throw new Error(`duplicatePage : index ${operation.index} hors de [0, ${items.length - 1}]`)
      }
      // Juste après l'original, comme l'appareil dépose la copie à côté de la page tirée.
      const at = insertPage(document, orientation, duplicatePage(source), operation.index + 1)
      return { index: at }
    }
    case 'remove': {
      const removed = removePage(document, orientation, operation.index)
      const left = items.length
      // Le rang mis en avant reste le même : c'est la page suivante qui l'occupe désormais.
      return { index: left === 0 ? undefined : Math.min(operation.index, left - 1), removed }
    }
    case 'reorder': {
      const at = reorderPage(document, orientation, operation.from, operation.to)
      return { index: at }
    }
    case 'setClass': {
      const page = items[operation.index]
      if (page === undefined) {
        throw new Error(`setPageClass : index ${operation.index} hors de [0, ${items.length - 1}]`)
      }
      setPageClass(page, operation.className)
      return { index: operation.index }
    }
  }
}

/* ============================================================ le carrousel */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(className: string, text: string, label?: string): HTMLButtonElement {
  const node = el('button', className, text)
  node.type = 'button'
  if (label !== undefined) node.setAttribute('aria-label', label)
  return node
}

/**
 * Ce que la clé `navigations` dit de la page, en clair.
 *
 * Les trois formes disent maintenant la **même** chose — quand la page s'affiche — au
 * lieu de nommer un réglage : « Toutes les navigations » et « Aucune navigation » se
 * lisaient comme un compte de navigations, pas comme le sort de la page.
 *
 * La phrase est celle de l'appareil, mesurée sur l'AIR³ : sa boîte s'intitule « Choisir
 * les types de navigations pour lesquelles la page sera affichée »
 * (`docs/reference/edition-native-exploration.md` § 5.4). On ne va pas jusqu'à « jamais
 * affichée » pour `none` : ce que fait l'appareil hors navigation n'a pas été mesuré, et
 * l'affirmer ferait dire à l'outil plus qu'il ne sait.
 */
export function navigationsLabel(page: Page): string {
  const navigations = page.navigations
  if (navigations.kind === 'all') return 'Affichée pour toutes les navigations'
  if (navigations.kind === 'none') return 'Affichée pour aucune navigation'
  if (navigations.classNames.length === 0) return 'Affichée pour aucune navigation'
  return 'Affichée pour : ' + navigations.classNames
    .map((name) => NAVIGATION_LABELS[shortClassName(name)] ?? shortClassName(name))
    .join(', ')
}

export interface PageManagerOptions {
  pages: readonly Page[]
  orientation: Orientation
  ctx: ViewContext
  /**
   * L'opération demandée, avec sa description prête pour l'historique. L'appelant mute le
   * document (`applyPageOperation`), enregistre le pas et reconstruit : ce module ne
   * garde aucun état entre deux rendus.
   */
  onOperation: (operation: PageOperation, description: string) => void
  /** Clic sur une vignette : ouvrir la page, comme l'appui simple de l'appareil. */
  onOpen?: (index: number) => void
  /** Changer la classe après création — offert par défaut, voir `CLASS_CHANGE_ADVICE`. */
  allowClassChange?: boolean
}

export interface PageManager {
  root: HTMLElement
  /** Pousse un message dans la zone d'annonce — pour l'appelant qui vient de reconstruire. */
  announce(message: string): void
}

function adviceList(advice: readonly Advice[], className = 'pages__advice'): HTMLElement {
  const list = el('ul', className)
  for (const item of advice) {
    const entry = el('li', `pages__advice-item pages__advice-item--${item.kind}`, item.text)
    list.append(entry)
  }
  return list
}

/**
 * Le carrousel des pages d'une orientation : une colonne par page, un point d'insertion
 * entre chacune et aux deux extrémités.
 *
 * Rien n'est mémorisé d'un rendu à l'autre : l'appelant reconstruit après chaque
 * opération. La confirmation de suppression, elle, ne vit que le temps d'un rendu — un
 * bouton laissé en attente de confirmation redevient inoffensif dès que la liste change.
 */
export function renderPageManager(options: PageManagerOptions): PageManager {
  const { pages, orientation, ctx } = options
  const allowClassChange = options.allowClassChange !== false

  const root = el('section', `pages pages--${orientation}`)
  root.setAttribute('aria-label', `Pages ${orientationLabel(orientation)}`)

  const live = el('p', 'pages__live')
  live.setAttribute('aria-live', 'polite')

  const announce = (message: string): void => { live.textContent = message }

  const request = (operation: PageOperation): void => {
    const description = describeOperation(pages, operation, orientation)
    announce(operationAnnouncement(pages, operation, orientation))
    options.onOperation(operation, description)
  }

  /* --- en-tête : ce que l'orientation compte, et ce qu'elle implique --- */
  const heading = el('h2', 'pages__title')
  heading.append(
    el('span', 'pages__name', orientation === 'landscape' ? 'Paysage' : 'Portrait'),
    el('span', 'pages__count', pages.length === 0
      ? 'aucune page'
      : `${pages.length} ${plural(pages.length, 'page', 'pages')}`)
  )
  root.append(heading)

  const standing = layoutAdvice(pages)
  if (allowClassChange) standing.push(CLASS_CHANGE_ADVICE)
  if (standing.length > 0) root.append(adviceList(standing))

  /* --- le rail : points d'insertion et vignettes en alternance --- */
  const rail = el('ol', 'pages__rail')

  const insertionPoint = (at: number): HTMLElement => {
    const slot = el('li', 'pages__gap')
    slot.dataset.at = String(at)

    const opener = button(
      'pages__insert', '+',
      at === pages.length
        ? `Insérer une page en dernier rang (${at + 1})`
        : `Insérer une page au rang ${at + 1}`
    )
    const choice = el('div', 'pages__choice')
    choice.hidden = true

    opener.setAttribute('aria-expanded', 'false')
    opener.addEventListener('click', () => {
      const open = choice.hidden
      choice.hidden = !open
      opener.setAttribute('aria-expanded', String(open))
    })

    choice.append(el('p', 'pages__choice-title', `Nouvelle page au rang ${at + 1}`))
    const list = el('ul', 'pages__choice-list')
    for (const entry of PAGE_CHOICES) {
      const item = el('li')
      const pick = button('pages__choice-item', '')
      pick.append(
        el('span', 'pages__choice-label', entry.label),
        el('span', 'pages__choice-note', entry.description)
      )
      pick.addEventListener('click', () => {
        request({ kind: 'insert', index: at, className: entry.className })
      })
      item.append(pick)
      list.append(item)
    }
    choice.append(list)

    // Ce que l'insertion à CE rang entraîne, quelle que soit la classe choisie : le
    // décalage se lit avant le clic, pas après.
    const shift = operationAdvice(pages, {
      kind: 'insert', index: at, className: 'WPEmpty'
    }).filter((item) => item.kind === 'shift')
    if (shift.length > 0) choice.append(adviceList(shift, 'pages__choice-advice'))

    const thermal = operationAdvice(pages, {
      kind: 'insert', index: at, className: THERMAL_ASSISTANT_CLASS
    }).filter((item) => item.kind === 'thermal')
    if (thermal.length > 0) choice.append(adviceList(thermal, 'pages__choice-advice'))

    slot.append(opener, choice)
    return slot
  }

  const pageSlot = (page: Page, index: number): HTMLElement => {
    const kind = pageKind(page.className)
    const slot = el('li', 'pages__slot')
    slot.dataset.index = String(index)
    slot.draggable = true

    const card = el('article', 'pagecard')
    if (kind.hiddenOutOfFlight) card.classList.add('pagecard--conditional')

    const head = el('div', 'pagecard__head')
    head.append(
      el('span', 'pagecard__rank', String(index + 1)),
      el('span', 'pagecard__label', kind.label)
    )
    card.append(head)

    const screen = button(
      'pagecard__screen', '',
      `Ouvrir la page ${index + 1}, ${kind.label}, ` +
      `${page.widgets.length} ${plural(page.widgets.length, 'gadget', 'gadgets')}`
    )
    screen.append(renderPage(page, aspectRatioOf(ctx.device, orientation), ctx.settings, ctx.language))
    if (options.onOpen) screen.addEventListener('click', () => options.onOpen?.(index))
    else screen.disabled = true
    card.append(screen)

    const meta = el('div', 'pagecard__meta')
    meta.append(
      el('span', 'pagecard__class', kind.shortName),
      el('span', 'pagecard__widgets',
        `${page.widgets.length} ${plural(page.widgets.length, 'gadget', 'gadgets')}`)
    )
    card.append(meta)
    card.append(el('p', 'pagecard__nav', navigationsLabel(page)))
    if (kind.hiddenOutOfFlight) card.append(el('span', 'flag', 'Masquée hors vol'))

    // La cible du basculement automatique se dit sur la page concernée, là où le pilote
    // la cherche — et non seulement dans le bandeau du haut.
    if (shortClassName(page.className) === THERMAL_ASSISTANT_CLASS) {
      const target = autoSwitchTargetRank(pages)
      card.append(el(
        'p', 'pagecard__thermal',
        target === index + 1
          ? 'Cible du basculement automatique en spirale.'
          : `Pas la cible du basculement : XCTrack bascule vers la page ${target}, la dernière ` +
            'page d’assistant de thermique.'
      ))
    }

    /* --- les commandes de rang --- */
    const ops = el('div', 'pagecard__ops')

    const left = button('btn btn--ghost pagecard__move', '◀', `Reculer la page ${index + 1} d’un rang`)
    left.disabled = index === 0
    left.addEventListener('click', () => request({ kind: 'reorder', from: index, to: index - 1 }))

    const right = button('btn btn--ghost pagecard__move', '▶', `Avancer la page ${index + 1} d’un rang`)
    right.disabled = index >= pages.length - 1
    right.addEventListener('click', () => request({ kind: 'reorder', from: index, to: index + 1 }))

    const copy = button('btn pagecard__duplicate', 'Dupliquer', `Dupliquer la page ${index + 1}`)
    copy.addEventListener('click', () => request({ kind: 'duplicate', index }))

    ops.append(left, right, copy)

    /* --- la suppression, en deux temps : la conséquence d'abord --- */
    const removal = el('div', 'pagecard__removal')
    const remove = button('btn pagecard__remove', 'Supprimer', `Supprimer la page ${index + 1}`)
    const consequences = adviceList(
      operationAdvice(pages, { kind: 'remove', index }), 'pagecard__consequences'
    )
    consequences.hidden = true

    let armed = false
    const disarm = (): void => {
      armed = false
      remove.textContent = 'Supprimer'
      remove.classList.remove('pagecard__remove--armed')
      consequences.hidden = true
    }
    remove.addEventListener('click', () => {
      if (!armed) {
        armed = true
        remove.textContent = 'Confirmer la suppression'
        remove.classList.add('pagecard__remove--armed')
        consequences.hidden = false
        return
      }
      disarm()
      request({ kind: 'remove', index })
    })
    remove.addEventListener('blur', disarm)
    remove.addEventListener('keydown', (event) => { if (event.key === 'Escape') disarm() })
    removal.append(remove, consequences)
    ops.append(removal)
    card.append(ops)

    /* --- la classe, que l'appareil ne sait pas changer --- */
    if (allowClassChange) {
      const field = el('div', 'pagecard__class-field')
      const select = el('select', 'pagecard__class-select')
      select.id = `page-class-${orientation}-${index}`
      const label = el('label', 'pagecard__class-label', 'Type de page')
      label.htmlFor = select.id

      const known = PAGE_CHOICES.some((choice) => choice.className === kind.shortName)
      if (!known) {
        // Une classe qu'aucune version connue ne documente reste proposée telle quelle :
        // la choisir de nouveau ne change rien, mais la faire disparaître de la liste
        // ferait croire à une page d'un des quatre types.
        const current = el('option', undefined, `${kind.shortName} (type inscrit dans le fichier)`)
        current.value = kind.shortName
        select.append(current)
      }
      for (const choice of PAGE_CHOICES) {
        const option = el('option', undefined, choice.label)
        option.value = choice.className
        select.append(option)
      }
      select.value = kind.shortName
      select.addEventListener('change', () => {
        if (select.value === kind.shortName) return
        request({ kind: 'setClass', index, className: select.value })
      })
      field.append(label, select)
      card.append(field)
    }

    slot.append(card)

    /* --- glisser-déposer, comme l'appui maintenu de l'appareil (§ 5.3) --- */
    slot.addEventListener('dragstart', (event) => {
      slot.classList.add('pages__slot--dragged')
      const transfer = (event as DragEvent).dataTransfer
      transfer?.setData('text/plain', String(index))
      if (transfer) transfer.effectAllowed = 'move'
    })
    slot.addEventListener('dragend', () => slot.classList.remove('pages__slot--dragged'))
    slot.addEventListener('dragover', (event) => {
      event.preventDefault()
      slot.classList.add('pages__slot--over')
    })
    slot.addEventListener('dragleave', () => slot.classList.remove('pages__slot--over'))
    slot.addEventListener('drop', (event) => {
      event.preventDefault()
      slot.classList.remove('pages__slot--over')
      const raw = (event as DragEvent).dataTransfer?.getData('text/plain')
      const from = Number(raw)
      if (raw === undefined || raw === '' || !Number.isInteger(from) || from === index) return
      request({ kind: 'reorder', from, to: index })
    })

    return slot
  }

  rail.append(insertionPoint(0))
  pages.forEach((page, index) => {
    rail.append(pageSlot(page, index))
    rail.append(insertionPoint(index + 1))
  })
  root.append(rail)

  if (pages.length === 0) {
    root.append(el(
      'p', 'pages__empty',
      'Cette orientation ne décrit aucune page. Une page neuve arrive vide : ses gadgets ' +
      'se posent ensuite depuis la palette, ou en dupliquant une page existante.'
    ))
  }

  root.append(live)
  return { root, announce }
}
