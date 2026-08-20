import { physicalSize, type Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { Layout, Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import type { Widget } from '../model/widget'
import { renderPage } from '../render/canvas'

export type Orientation = 'portrait' | 'landscape'

/** Coordonnées normalisées d'un widget — le seul sous-ensemble dont `widgetSizeMm` dépend. */
export interface WidgetBox { x1: number; y1: number; x2: number; y2: number }

export interface WidgetSizeMm { widthMm: number; heightMm: number }

/** Les coordonnées d'un widget sont normalisées sur 10000, quelle que soit la dalle. */
const SCALE = 10000

/**
 * Dimensions réelles d'un widget sur l'appareil choisi. C'est le seul calcul de cette
 * couche, et le seul substitut honnête au test sur l'instrument : « ce texte
 * sera-t-il lisible avec des gants ? » se répond en millimètres, pas en pixels.
 *
 * La dalle est mesurée par `physicalSize` (diagonale en pouces et proportions) ; les
 * coordonnées n'étant que des fractions de cette dalle, la conversion est une simple
 * règle de trois — mais une erreur de facteur y resterait invisible jusqu'à ce que
 * quelqu'un mesure un vrai appareil, d'où les tests.
 */
export function widgetSizeMm(box: WidgetBox, device: Device, orientation: Orientation): WidgetSizeMm {
  const screen = physicalSize(device, orientation)
  return {
    widthMm: ((box.x2 - box.x1) / SCALE) * screen.widthMm,
    heightMm: ((box.y2 - box.y1) / SCALE) * screen.heightMm
  }
}

/**
 * Proportions de la page, dérivées des dimensions physiques plutôt que des pixels :
 * une seule source de vérité, `physicalSize`. C'est ce que `renderPage` attend.
 */
export function aspectRatioOf(device: Device, orientation: Orientation): number {
  const screen = physicalSize(device, orientation)
  return screen.widthMm / screen.heightMm
}

export interface PageKind {
  shortName: string
  label: string
  note: string
  /** Vrai si XCTrack saute la page hors contexte de vol — voir `PAGE_KINDS`. */
  hiddenOutOfFlight: boolean
}

/**
 * Ce que la classe d'une page implique pour le pilote. Le fichier décrit plus de pages
 * que l'appareil n'en montre : `WPCompetition` et `WPThermalAssistant` sont masquées
 * hors contexte de vol (constaté sur l'appareil, `docs/reference/rendu-observe.md`) —
 * une surprise assez coûteuse en vol pour mériter d'être dite ici.
 *
 * `WPXCAssistant` n'a **pas** été observé : on n'affirme donc rien de son comportement
 * plutôt que de le supposer symétrique de l'assistant de thermique.
 */
const PAGE_KINDS: Record<string, Omit<PageKind, 'shortName'>> = {
  WPEmpty: {
    label: 'Page libre',
    note: 'Toujours atteignable par « page suivante ».',
    hiddenOutOfFlight: false
  },
  WPCompetition: {
    label: 'Page de compétition',
    note: 'XCTrack la masque hors contexte de vol : au sol, « page suivante » passe par-dessus.',
    hiddenOutOfFlight: true
  },
  WPThermalAssistant: {
    label: 'Page d’assistant de thermique',
    note: 'XCTrack la masque hors contexte de vol : au sol, « page suivante » passe par-dessus.',
    hiddenOutOfFlight: true
  },
  WPXCAssistant: {
    label: 'Page d’assistant XC',
    note: 'Son comportement hors vol n’a pas été relevé sur l’appareil.',
    hiddenOutOfFlight: false
  }
}

export function pageKind(className: string): PageKind {
  const shortName = className.split('.').pop() ?? ''
  const known = PAGE_KINDS[shortName]
  if (known) return { shortName, ...known }
  return {
    shortName: shortName === '' ? '(classe absente)' : shortName,
    label: 'Page de type inconnu',
    note: 'Cette classe de page n’est pas décrite par cet éditeur ; son contenu reste affiché tel quel.',
    hiddenOutOfFlight: false
  }
}

const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: 'Paysage',
  portrait: 'Portrait'
}

/** Un nombre de millimètres, à la virgule française et au dixième près. */
export function formatMm(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export interface ViewContext {
  device: Device
  settings: RenderSettings
  /** Langue déjà résolue par l'appelant — voir `resolveLanguage`, côté `main.ts`. */
  language: string
}

/* ------------------------------------------------------------------ vue d'ensemble */

function pageCard(
  page: Page, rank: number, orientation: Orientation, ctx: ViewContext, onOpen: () => void
): HTMLElement {
  const kind = pageKind(page.className)

  const card = el('button', 'card')
  card.type = 'button'
  card.setAttribute('aria-label', `Page ${rank}, ${kind.label}, ${plural(page.widgets.length, 'widget', 'widgets')}`)
  card.addEventListener('click', onOpen)

  const screen = el('span', 'card__screen')
  screen.append(renderPage(page, aspectRatioOf(ctx.device, orientation), ctx.settings, ctx.language))

  const head = el('span', 'card__head')
  head.append(
    el('span', 'card__rank', String(rank)),
    el('span', 'card__label', kind.label)
  )

  const meta = el('span', 'card__meta')
  meta.append(
    el('span', 'card__class', kind.shortName),
    el('span', 'card__count', plural(page.widgets.length, 'widget', 'widgets'))
  )

  card.append(head, screen, meta)
  if (kind.hiddenOutOfFlight) {
    card.classList.add('card--conditional')
    card.append(el('span', 'flag', 'Masquée hors vol'))
  }
  return card
}

function orientationSection(
  pages: Page[], orientation: Orientation, ctx: ViewContext, onOpen: (index: number) => void
): HTMLElement {
  const section = el('section', `section section--${orientation}`)

  const heading = el('h2', 'section__title')
  heading.append(
    el('span', 'section__name', ORIENTATION_LABELS[orientation]),
    el('span', 'section__count', pages.length === 0 ? 'aucune page' : plural(pages.length, 'page', 'pages'))
  )
  section.append(heading)

  if (pages.length === 0) {
    section.append(el('p', 'empty-note', 'Ce fichier ne décrit aucune page dans cette orientation.'))
    return section
  }

  const hidden = pages.filter((page) => pageKind(page.className).hiddenOutOfFlight).length
  if (hidden > 0) {
    section.append(el(
      'p', 'section__note',
      `${plural(hidden, 'page est masquée', 'pages sont masquées')} hors contexte de vol : au sol, ` +
      `l’appareil n’en montre que ${pages.length - hidden} sur ${pages.length}.`
    ))
  }

  const grid = el('ol', 'grid')
  pages.forEach((page, index) => {
    const item = el('li', 'grid__item')
    item.append(pageCard(page, index + 1, orientation, ctx, () => onOpen(index)))
    grid.append(item)
  })
  section.append(grid)
  return section
}

/**
 * Toutes les pages du fichier, numérotées à partir de 1 : une page n'a pas de nom, son
 * rang est sa seule identité, et c'est lui qui décide de ce qui s'affiche quand le
 * pilote appuie sur « page suivante » en vol.
 *
 * Les deux orientations sont montrées ensemble — un fichier contient toujours les deux
 * et le pilote bascule de l'une à l'autre. Le paysage vient en premier : c'est
 * l'orientation de tous les fichiers du corpus et celle des supports de cockpit.
 */
export function buildOverview(
  layout: Layout, ctx: ViewContext, onOpen: (orientation: Orientation, index: number) => void
): HTMLElement {
  const root = el('div', 'overview')
  root.append(
    orientationSection(layout.landscape, 'landscape', ctx, (index) => onOpen('landscape', index)),
    orientationSection(layout.portrait, 'portrait', ctx, (index) => onOpen('portrait', index))
  )
  return root
}

/* -------------------------------------------------------------------- vue détaillée */

/**
 * Ce que le mode édition ajoute à la vue détaillée. Les trois éléments sont **construits
 * ailleurs** (`main.ts`, qui seul connaît l'historique et la sélection) : cette couche ne
 * fait que leur donner leur place. Absent, la vue est exactement celle du jalon 1.
 */
export interface DetailEditing {
  /**
   * Le calque d'édition (`ui/editor.ts`). Il se pose DANS `.plate`, et il **remplace**
   * les `.hotspot` de la consultation — deux couches de zones cliquables superposées se
   * voleraient le pointeur.
   */
  layer: HTMLElement
  /** Le panneau de propriétés du widget sélectionné, à droite de la page. */
  panel: HTMLElement
  /** La barre contextuelle d'édition : grille, sélection courante, rappels de clavier. */
  bar: HTMLElement
}

export interface DetailOptions {
  page: Page
  /** Rang de la page dans son orientation, à partir de 0. */
  index: number
  pageCount: number
  orientation: Orientation
  ctx: ViewContext
  zoom: number
  onBack: () => void
  onGo: (index: number) => void
  onZoom: (zoom: number) => void
  /** Défini uniquement en mode édition. */
  editing?: DetailEditing
}

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.5

/**
 * Règle graduée le long de la page : une graduation par centimètre réel, tracée en
 * millimètres comme la page elle-même et donc soumise au même zoom. C'est elle qui
 * rend l'échelle vérifiable — une vraie règle posée sur l'écran doit tomber sur les
 * mêmes traits, sans quoi le zoom est à corriger.
 */
function scaleRuler(widthMm: number): HTMLElement {
  const ruler = el('div', 'ruler')
  ruler.setAttribute('aria-hidden', 'true')
  for (let cm = 0; cm * 10 <= widthMm; cm += 1) {
    const major = cm % 5 === 0
    const tick = el('span', major ? 'ruler__tick ruler__tick--major' : 'ruler__tick')
    tick.style.left = `calc(var(--zoom) * ${cm * 10}mm)`
    if (major && cm > 0) tick.append(el('span', 'ruler__label', `${cm} cm`))
    ruler.append(tick)
  }
  return ruler
}

/**
 * Une page à la fois, à l'échelle 1:1 : la largeur du rendu est fixée à la largeur
 * physique du gabarit exprimée en millimètres, les navigateurs traitant `mm` comme une
 * unité absolue (96 points par pouce). L'affichage réel dépend de la densité de l'écran
 * de l'utilisateur, d'où le facteur de zoom — et la règle graduée pour le régler.
 */
export function buildDetail(options: DetailOptions): HTMLElement {
  const { page, index, pageCount, orientation, ctx, zoom, editing } = options
  const kind = pageKind(page.className)
  const screenSize = physicalSize(ctx.device, orientation)

  const root = el('div', 'detail')

  /* --- barre de navigation --- */
  const bar = el('div', 'detail__bar')

  const back = el('button', 'btn btn--ghost', '← Vue d’ensemble')
  back.type = 'button'
  back.addEventListener('click', options.onBack)

  // L'identité de la page est le titre de la vue : son rang et ce qu'elle est.
  const identity = el('h1', 'detail__identity')
  identity.append(
    el('span', 'detail__rank', String(index + 1)),
    el('span', 'detail__label', `${ORIENTATION_LABELS[orientation]} · ${kind.label}`)
  )

  const steps = el('div', 'detail__steps')
  const previous = el('button', 'btn', 'Page précédente')
  previous.type = 'button'
  previous.disabled = index === 0
  previous.addEventListener('click', () => options.onGo(index - 1))
  const next = el('button', 'btn', 'Page suivante')
  next.type = 'button'
  next.disabled = index >= pageCount - 1
  next.addEventListener('click', () => options.onGo(index + 1))
  steps.append(previous, el('span', 'detail__position', `${index + 1} / ${pageCount}`), next)

  bar.append(back, identity, steps)
  root.append(bar)
  if (editing) root.append(editing.bar)

  /* --- ce que la page implique --- */
  const facts = el('p', 'detail__facts')
  facts.append(
    el('span', 'chip', kind.shortName),
    el('span', 'chip', plural(page.widgets.length, 'widget', 'widgets')),
    el('span', 'chip', `${formatMm(screenSize.widthMm)} × ${formatMm(screenSize.heightMm)} mm`),
    el('span', 'chip chip--quiet', ctx.device.label)
  )
  if (kind.hiddenOutOfFlight) facts.append(el('span', 'flag', 'Masquée hors vol'))
  root.append(facts)
  root.append(el('p', 'detail__note', kind.note))

  /* --- scène : règle, page à l'échelle, zones de survol --- */
  const stage = el('div', 'stage')
  stage.style.setProperty('--zoom', String(zoom))
  stage.style.setProperty('--page-width', `${screenSize.widthMm.toFixed(2)}mm`)

  const plate = el('div', 'plate')
  plate.append(renderPage(page, aspectRatioOf(ctx.device, orientation), ctx.settings, ctx.language))

  const hotspots = el('div', 'hotspots')
  const readout = el('div', 'readout')

  const describe = (widget: Widget | undefined): void => {
    readout.textContent = ''
    if (!widget) {
      readout.append(el('span', 'readout__hint', 'Survolez un widget pour son nom et ses dimensions.'))
      return
    }
    const size = widgetSizeMm(widget, ctx.device, orientation)
    readout.append(
      el('span', 'readout__name', readableName(widget.shortName, ctx.language)),
      el('span', 'readout__size', `${formatMm(size.widthMm)} × ${formatMm(size.heightMm)} mm`),
      el('span', 'readout__class', widget.shortName)
    )
  }
  describe(undefined)

  // Même ordre que le dessin : le dernier widget est au-dessus, et sa zone de survol
  // aussi — l'empilement naturel du DOM suffit, comme dans `renderPage`.
  // En édition, le calque remplace les zones de survol : c'est lui qui décide, en
  // coordonnées de page et non par empilement du DOM, de ce qui se trouve sous le curseur.
  if (!editing) {
    page.widgets.forEach((widget, position) => {
      const size = widgetSizeMm(widget, ctx.device, orientation)
      const hotspot = el('button', 'hotspot')
      hotspot.type = 'button'
      hotspot.style.left = `${widget.x1 / 100}%`
      hotspot.style.top = `${widget.y1 / 100}%`
      hotspot.style.width = `${(widget.x2 - widget.x1) / 100}%`
      hotspot.style.height = `${(widget.y2 - widget.y1) / 100}%`
      hotspot.setAttribute(
        'aria-label',
        `${readableName(widget.shortName, ctx.language)}, ` +
        `${formatMm(size.widthMm)} sur ${formatMm(size.heightMm)} millimètres`
      )
      hotspot.addEventListener('pointerenter', () => describe(widget))
      hotspot.addEventListener('focus', () => describe(widget))
      hotspot.addEventListener('blur', () => describe(undefined))
      hotspot.dataset.position = String(position)
      hotspots.append(hotspot)
    })
    hotspots.addEventListener('pointerleave', () => describe(undefined))
  }

  plate.append(editing ? editing.layer : hotspots)
  stage.append(scaleRuler(screenSize.widthMm), plate)

  /* --- zoom --- */
  const zoomBox = el('div', 'zoom')
  const zoomLabel = el('label', 'zoom__label', 'Zoom')
  const slider = el('input', 'zoom__slider')
  slider.type = 'range'
  slider.min = String(ZOOM_MIN)
  slider.max = String(ZOOM_MAX)
  slider.step = '0.05'
  slider.value = String(zoom)
  slider.id = 'zoom-slider'
  zoomLabel.htmlFor = slider.id
  const value = el('span', 'zoom__value', `${Math.round(zoom * 100)} %`)
  slider.addEventListener('input', () => {
    const factor = Number(slider.value)
    stage.style.setProperty('--zoom', String(factor))
    value.textContent = `${Math.round(factor * 100)} %`
    options.onZoom(factor)
  })
  const reset = el('button', 'btn btn--ghost', 'Rétablir 100 %')
  reset.type = 'button'
  reset.addEventListener('click', () => {
    slider.value = '1'
    slider.dispatchEvent(new Event('input'))
  })
  zoomBox.append(zoomLabel, slider, value, reset)

  const advice = el(
    'p', 'detail__advice',
    'La page est dessinée à sa taille réelle sur l’appareil. Votre écran n’a pas forcément ' +
    'la densité que le navigateur suppose : réglez le zoom jusqu’à ce qu’une règle posée ' +
    'sur l’écran coïncide avec les graduations.'
  )

  root.append(zoomBox)
  if (editing) {
    // La page et son panneau côte à côte : régler une option et voir la page changer
    // sans quitter des yeux ni l'une ni l'autre.
    const workspace = el('div', 'workspace')
    workspace.append(stage, editing.panel)
    root.append(workspace)
  } else {
    root.append(stage, readout)
  }
  root.append(advice)
  return root
}
