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
  card.setAttribute('aria-label', `Page ${rank}, ${kind.label}, ${plural(page.widgets.length, 'gadget', 'gadgets')}`)
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
    el('span', 'card__count', plural(page.widgets.length, 'gadget', 'gadgets'))
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

/* ------------------------------------------- ce que le fichier appelle des remarques */

/**
 * Les familles d'avertissement qui décrivent un **défaut** — quelque chose que le pilote
 * peut vouloir corriger — et non un simple constat sur le fichier.
 *
 * La distinction commande la vue d'ensemble : ce qui demande une action reste déplié
 * au-dessus des pages, le reste se replie derrière une ligne. Un pilote ouvre son
 * fichier pour **voir ses pages** ; quatre encadrés d'égal poids visuel avant la
 * première vignette lui font faire défiler un écran et demi de prose pour rien.
 */
export const ATTENTION_WARNING_KINDS = ['structure', 'geometry', 'personal-data']

/**
 * Sépare ce qui alerte de ce qui renseigne. Le type est volontairement minimal — la
 * seule chose lue est `kind` — pour que cette couche n'ait pas à connaître `warnings.ts`.
 */
export function splitWarnings<T extends { kind: string }>(
  warnings: readonly T[]
): { attention: T[]; remarks: T[] } {
  const attention: T[] = []
  const remarks: T[] = []
  for (const warning of warnings) {
    if (ATTENTION_WARNING_KINDS.includes(warning.kind)) attention.push(warning)
    else remarks.push(warning)
  }
  return { attention, remarks }
}

/**
 * L'intitulé de la ligne repliée. Le mot « remarque » plutôt qu'« avertissement » : rien
 * de ce qui s'y range n'appelle de correction, et un pilote qui lit « avertissement »
 * ouvre en s'attendant à un problème.
 */
export function remarksSummary(count: number): string {
  return `${plural(count, 'remarque', 'remarques')} sur ce fichier`
}

/* --------------------------------------- amener la sélection sous les yeux du pilote */

/**
 * La bande de fenêtre laissée libre par les bandeaux collants : sous la barre de tête,
 * au-dessus du bandeau de réglages. C'est la seule partie de la page qu'un pilote voit
 * réellement, et donc la seule où une sélection se montre.
 */
export interface VisibleBand { top: number; bottom: number }

/**
 * Ce qu'on s'accorde au-dessus et au-dessous du gadget amené à l'écran : de quoi ne pas
 * le coller au bord d'un bandeau, sans plus. La marge cède dès que la bande devient
 * trop courte pour la loger.
 */
export const REVEAL_MARGIN_PX = 12

/**
 * De combien de pixels faire défiler la fenêtre pour qu'un gadget entre dans la bande
 * visible — positif vers le bas, `0` s'il y est déjà.
 *
 * Trois cas, et l'ordre compte :
 *
 * 1. **Le gadget est plus haut que la bande** — page très zoomée, bandeau déployé : rien
 *    ne le fera tenir en entier. On aligne alors son bord **supérieur** sur le haut de la
 *    bande, parce que c'est là que se lisent son nom et sa valeur.
 * 2. **Il dépasse par le bas** — le cas courant, celui du gadget caché sous le bandeau de
 *    réglages : on remonte juste assez.
 * 3. **Il dépasse par le haut** : on redescend juste assez.
 *
 * Le calcul est ici, hors de `main.ts`, parce que c'est la seule partie du geste qui ne
 * dépende ni du DOM ni de la position de défilement — donc la seule qui se teste.
 */
export function revealOffset(
  target: { top: number; bottom: number }, band: VisibleBand
): number {
  const bandHeight = band.bottom - band.top
  if (!Number.isFinite(bandHeight) || bandHeight <= 0) return 0
  const targetHeight = Math.max(0, target.bottom - target.top)
  if (targetHeight >= bandHeight) return Math.round(target.top - band.top)
  const margin = Math.min(REVEAL_MARGIN_PX, Math.floor((bandHeight - targetHeight) / 2))
  const top = target.top - margin
  const bottom = target.bottom + margin
  if (bottom > band.bottom) return Math.round(bottom - band.bottom)
  if (top < band.top) return Math.round(top - band.top)
  return 0
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
  /**
   * Le bandeau de réglages du widget sélectionné, **sous** la page et collant en bas de
   * fenêtre. Rien ne partage la largeur avec la page : à fort zoom, une colonne latérale
   * mordrait sur le seul objet qui compte — la page dessinée à sa taille réelle.
   */
  dock: HTMLElement
  /** La barre contextuelle d'édition : grille, sélection courante, rappels de clavier. */
  bar: HTMLElement
}

/**
 * Ce que la **consultation** ajoute à la vue détaillée : le même bandeau que l'édition,
 * mais en lecture seule, et la sélection d'un widget par simple clic sur la page.
 *
 * Pourquoi le même meuble que l'édition, et pas un autre : la consultation a besoin
 * exactement des deux mêmes choses — la liste des widgets de la page, qui est le seul
 * chemin vers les six widgets qu'aucun clic n'atteint, et un panneau qui montre les
 * réglages. Le bandeau est déjà collant, repliable et redimensionné par le pilote, et sa
 * hauteur est mémorisée : refaire un troisième meuble reviendrait à lui redemander ses
 * préférences.
 *
 * Et surtout, le principe tient : **rien ne partage la largeur avec la page**. Le
 * bandeau passe dessous, comme en édition.
 */
export interface DetailInspecting {
  /** Le bandeau de consultation, construit par `main.ts` — liste et réglages en lecture. */
  dock: HTMLElement
  /** Le rang du widget sélectionné dans `page.widgets`, ou `undefined`. */
  selection: number | undefined
  /**
   * Le pilote a choisi un widget sur la page, ou a cliqué à côté (`undefined`). La vue ne
   * décide de rien : `main.ts` tient la sélection, comme en édition.
   */
  onSelect: (index: number | undefined) => void
  /**
   * Reçoit, à la construction, de quoi remettre le relevé d'accord avec la sélection sans
   * reconstruire la vue. `main.ts` le garde et l'appelle quand la sélection change
   * ailleurs — dans la liste du bandeau, qui est le seul chemin vers les widgets
   * qu'aucun clic n'atteint. La vue reste ainsi la seule à savoir ce qu'elle affiche,
   * et l'appelant n'a pas à refaire son texte à sa place.
   */
  bindRefresh?: (refresh: () => void) => void
}

/* ------------------------------------------- hauteur du bandeau de réglages */

/*
 * La hauteur du bandeau est **réglée par le pilote**, à la poignée posée sur son bord
 * supérieur, et retenue d'une session à l'autre. Le calcul des bornes vit ici, hors de
 * `main.ts`, pour être mesurable en test : c'est la seule partie de la poignée qui ne
 * dépende ni du DOM ni du pointeur.
 *
 * Ce que le bandeau prend, il le prend à la page. La borne haute se juge donc à ce
 * qu'elle LAISSE : le bandeau ne dépasse jamais la moitié de la hauteur que la barre de
 * tête laisse à la fenêtre. Mesuré en fenêtre de 913 px utiles — barre de tête 56 px,
 * enveloppe du bandeau autour de son corps 60 px — cela donne un corps plafonné à
 * 368 px : le bandeau entier fait alors 428 px, la moitié juste, et laisse 429 px de
 * fenêtre sous la barre de tête, soit près des deux tiers d'une page paysage rendue à
 * 200 % (661 px).
 */

/** Clé de `localStorage`. Un réglage d'affichage, jamais une donnée du fichier. */
export const DOCK_HEIGHT_KEY = 'xcfg-editor.dock-height'

/**
 * Sous 112 px, le bandeau ne montre plus rien d'utile : il faut le champ de filtre
 * (33 px), l'écart qui le suit (8 px) et une ligne de réglage entière (42 px) sous les
 * 22 px de marges du corps — 105 px mesurés, arrondis au demi-rem supérieur. La liste
 * des widgets y loge son intitulé et trois rangs de 28 px.
 */
export const DOCK_HEIGHT_MIN = 112

/**
 * Plafond absolu, indépendant de la fenêtre : au-delà, le panneau devient une colonne
 * qu'on parcourt au lieu d'un tableau qu'on lit. Il ne mord qu'à partir de 1456 px de
 * fenêtre utile, où la moitié laissée par la barre de tête le dépasse.
 */
export const DOCK_HEIGHT_MAX = 640

/**
 * Hauteur par défaut du corps, mesurée sur le contenu et non choisie : c'est la falaise.
 * Sur les quinze widgets de la page 1 paysage de la configuration de référence, en
 * fenêtre de 1500 px de large (panneau de 1041 px, deux à trois colonnes), les réglages
 * demandent 123, 123, 159 ×4, 191, 194 ×2, 195, 200, 230, 257, 610 et 1306 px. Un corps
 * de 288 px — 266 px utiles sous ses marges — en montre treize sur quinze **sans aucun
 * défilement** ; le quatorzième en demanderait 632, ce qu'aucun défaut ne peut prendre.
 * Les 208 px d'avant n'en montraient que six.
 */
export const DOCK_HEIGHT_DEFAULT = 288

/** Barre de tête collante, mesurée : elle recouvre le haut de la page en permanence. */
const HEAD_BAR_PX = 56

/** Ce que le bandeau ajoute autour de son corps : poignée 10, barre de tête 48, bords 2. */
const DOCK_CHROME_PX = 60

/**
 * Le plus haut corps admis dans une fenêtre donnée. La règle de la moitié se lit sur le
 * bandeau entier, enveloppe comprise — c'est lui, pas son corps, qui recouvre la page.
 */
export function dockHeightCeiling(viewportHeight: number): number {
  if (!Number.isFinite(viewportHeight)) return DOCK_HEIGHT_MIN
  const half = Math.floor((viewportHeight - HEAD_BAR_PX) / 2) - DOCK_CHROME_PX
  return Math.max(DOCK_HEIGHT_MIN, Math.min(DOCK_HEIGHT_MAX, half))
}

/**
 * Ramène une hauteur demandée dans les bornes de la fenêtre courante. Une valeur qui
 * n'est pas un nombre — un `NaN` sorti d'un calcul de pointeur — retombe sur le défaut
 * plutôt que d'effacer la hauteur du bandeau.
 */
export function clampDockHeight(height: number, viewportHeight: number): number {
  const ceiling = dockHeightCeiling(viewportHeight)
  if (!Number.isFinite(height)) return Math.min(DOCK_HEIGHT_DEFAULT, ceiling)
  return Math.max(DOCK_HEIGHT_MIN, Math.min(ceiling, Math.round(height)))
}

/**
 * La hauteur retenue de la session précédente, ou `undefined` si le pilote n'a jamais
 * touché la poignée. Un enregistrement de `localStorage` n'est jamais une donnée de
 * confiance : absent, illisible, vide, écrit à la main ou venu d'une version antérieure,
 * il est rejeté en silence et le défaut reprend la main.
 *
 * La validation se fait sur les bornes **absolues**, jamais sur celles de la fenêtre
 * courante : une hauteur réglée sur un grand écran reste légitime sur un petit, où
 * `clampDockHeight` la resserrera à l'affichage sans la perdre.
 */
export function readDockHeight(storage: Storage): number | undefined {
  let raw: string | null = null
  try {
    raw = storage.getItem(DOCK_HEIGHT_KEY)
  } catch {
    return undefined
  }
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) return undefined
  const height = Math.round(value)
  if (height < DOCK_HEIGHT_MIN || height > DOCK_HEIGHT_MAX) return undefined
  return height
}

/** Écrit la hauteur choisie. Un stockage refusé — navigation privée — ne casse rien. */
export function writeDockHeight(storage: Storage, height: number): void {
  try {
    storage.setItem(DOCK_HEIGHT_KEY, String(Math.round(height)))
  } catch {
    /* Le réglage ne survivra pas à la session : c'est tout ce qu'on y perd. */
  }
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
  /** Défini uniquement en consultation, et seulement quand la page porte des widgets. */
  inspecting?: DetailInspecting
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
  const { page, index, pageCount, orientation, ctx, zoom, editing, inspecting } = options
  const kind = pageKind(page.className)
  const screenSize = physicalSize(ctx.device, orientation)

  const root = el('div', 'detail')
  // Le mode édition élargit le cadre : c'est la seule différence de gabarit entre les deux
  // modes, et elle profite à la page, jamais à autre chose.
  if (editing) root.classList.add('detail--editing')

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
    // `chip--count` : le seul de ces faits qui change sans que la vue soit reconstruite —
    // ajouter ou supprimer un widget en édition ne redessine que la page. `main.ts` le
    // retrouve par cette classe et le remet à jour, plutôt que d'afficher un compte périmé.
    el('span', 'chip chip--count', plural(page.widgets.length, 'gadget', 'gadgets')),
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

  /**
   * Le relevé sous la page. Il décrit ce qui est **sous le curseur** ; le curseur parti,
   * il retombe sur le widget sélectionné plutôt que sur rien — les deux ne se
   * contredisent pas, ils se relaient, et le bandeau dit la même chose plus bas.
   */
  const describe = (widget: Widget | undefined, hovered: boolean): void => {
    readout.textContent = ''
    const selected = inspecting?.selection === undefined
      ? undefined
      : page.widgets[inspecting.selection]
    const shown = widget ?? selected
    if (!shown) {
      readout.append(el(
        'span', 'readout__hint',
        inspecting === undefined
          ? 'Survolez un gadget pour son nom et ses dimensions.'
          : 'Survolez un gadget pour son nom et ses dimensions ; cliquez-le pour voir ses réglages.'
      ))
      return
    }
    const size = widgetSizeMm(shown, ctx.device, orientation)
    readout.append(
      el('span', 'readout__name', readableName(shown.shortName, ctx.language)),
      el('span', 'readout__size', `${formatMm(size.widthMm)} × ${formatMm(size.heightMm)} mm`),
      el('span', 'readout__class', shown.shortName)
    )
    if (!hovered && widget === undefined) {
      readout.append(el('span', 'readout__pin', 'sélectionné'))
    }
  }
  describe(undefined, false)
  // `selection` est relue à chaque appel : `main.ts` la met à jour sur cet objet-ci.
  inspecting?.bindRefresh?.(() => describe(undefined, false))

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
      hotspot.addEventListener('pointerenter', () => describe(widget, true))
      hotspot.addEventListener('focus', () => describe(widget, true))
      hotspot.addEventListener('blur', () => describe(undefined, false))
      hotspot.dataset.position = String(position)
      if (inspecting !== undefined) {
        // La zone de survol devient la cible de sélection : le geste de la consultation est
        // le clic, celui qu'on fait déjà pour lire une étiquette. Rien n'est déplacé, rien
        // n'est écrit — cliquer ouvre les réglages en lecture, et c'est tout.
        const selected = inspecting.selection === position
        hotspot.setAttribute('aria-pressed', String(selected))
        if (selected) hotspot.classList.add('hotspot--selected')
        hotspot.addEventListener('click', () => {
          // Recliquer le widget déjà choisi le désélectionne : la sortie est là où l'on est.
          inspecting.onSelect(inspecting.selection === position ? undefined : position)
        })
      }
      hotspots.append(hotspot)
    })
    hotspots.addEventListener('pointerleave', () => describe(undefined, false))
    if (inspecting !== undefined) {
      // Un clic dans un interstice — la page en compte, les widgets ne la pavent pas —
      // désélectionne. `currentTarget` et non `target` : les clics des zones ne remontent
      // pas ici par accident, ils y remontent tous.
      hotspots.addEventListener('click', (event) => {
        if (event.target === hotspots) inspecting.onSelect(undefined)
      })
    }
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
  // La page occupe toute la largeur, en édition comme en consultation : elle déborde en
  // défilement horizontal dans `.stage` dès que le zoom la fait dépasser la fenêtre, et la
  // règle graduée, posée dans le même conteneur, défile avec elle.
  root.append(stage)
  // Le survol décrit ce qui est sous le curseur ; en édition, c'est la barre d'édition et
  // le bandeau qui disent la sélection, et deux relevés concurrents se contrediraient.
  if (!editing) root.append(readout)
  root.append(advice)
  // Le bandeau de consultation vient exactement là où celui d'édition se pose : dernier
  // enfant, collant en bas, sous la page et jamais à côté d'elle.
  if (inspecting) root.append(inspecting.dock)
  // Le bandeau vient en dernier : dernier enfant d'un conteneur plus haut que la fenêtre,
  // `position: sticky; bottom: 0` le maintient au bas de l'écran tant que la page défile,
  // puis le laisse se poser à sa place à la fin du défilement.
  if (editing) root.append(editing.dock)
  return root
}
