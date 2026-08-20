import './style.css'
import './app.css'
// Effet de bord : enregistre les dessins de widgets dans l'annuaire de `render/`.
import '../render/widgets'
import { deviceFor, type Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import { getMember, readString } from '../core/access'
import { exportContainer, openContainer, type Container } from '../core/container'
import type { JsonNode } from '../core/jsonDocument'
import { gridFor } from '../model/grid'
import { createHistory, type EditHistory } from '../model/history'
import { readLayout, type Layout, type Page } from '../model/layout'
import { insertWidget } from '../model/mutations'
import { readRenderSettings, resolveLanguage, type RenderSettings } from '../model/preferences'
import { readWidget, type Widget } from '../model/widget'
import { renderPage } from '../render/canvas'
import { buildDeviceSelector } from './deviceSelector'
import {
  createEditor, type Editor, type Viewport, type WidgetEdit, type WidgetStructureEdit
} from './editor'
import { exportFileName } from './export'
import {
  applyPageOperation, operationAnnouncement, renderPageManager, type PageOperation
} from './pageManager'
import type { PropertyField } from './properties'
import {
  aspectRatioOf, buildDetail, buildOverview,
  type DetailEditing, type Orientation, type ViewContext
} from './views'
import { computeWarnings, warningsAt, type Warning } from './warnings'

interface Session {
  container: Container
  layout: Layout
  settings: RenderSettings
  /** Gabarit d'affichage courant : choisi par le pilote, jamais écrit dans le fichier. */
  device: Device
  /** Nom de l'appareil que le fichier déclare, s'il en désigne un — `deviceIsDeclared`. */
  declaredDevice: string | undefined
  language: string
  /** Vrai si la langue vient du navigateur, faute d'indication dans le fichier. */
  languageFromBrowser: boolean
  /** Calculés une fois à l'ouverture : ils ne dépendent pas du gabarit d'affichage. */
  warnings: Warning[]
  /**
   * L'historique d'annulation. `container.document` EST `history.current()` : à
   * l'ouverture on adopte le document vivant de l'historique plutôt que celui du
   * conteneur, pour que les deux ne divergent jamais. Un `undo()` rend un arbre neuf —
   * `container.document` est alors réaffecté, et tout ce qui pointait dans l'ancien
   * (page affichée, sélection, panneau) est retrouvé **par index**, jamais par
   * référence : voir `stepHistory`.
   */
  history: EditHistory
}

type View =
  | { kind: 'overview' }
  | { kind: 'detail'; orientation: Orientation; index: number }

let session: Session | undefined
let failure: string | undefined
let view: View = { kind: 'overview' }
let zoom = 1

/**
 * Mode édition. La consultation est le mode par défaut et reste rigoureusement celle du
 * jalon 1 : tant que ce drapeau est faux, aucun calque, aucun panneau, aucune écriture —
 * la visionneuse validée sur l'appareil ne change pas d'un pixel.
 */
let editMode = false

/**
 * La sélection, **un rang dans le tableau `widgets` de la page affichée**, jamais un
 * nœud ni un objet `Widget`. C'est ce qui la fait survivre à une annulation : le
 * document redevenu neuf, l'index désigne toujours le même widget.
 */
let selection: number | undefined

let editor: Editor | undefined
let panelHost: HTMLElement | undefined
let selectionLabel: HTMLElement | undefined

/**
 * La palette d'ajout s'ouvre en boîte modale, comme la gestion des pages : on l'ouvre, on
 * choisit, elle se ferme. Poser un gadget est un geste ponctuel — le laisser en permanence
 * à l'écran prendrait de la largeur à la page, qui est le seul objet à taille réelle.
 *
 * Le filtre saisi vit ici et non dans le module : la boîte est reconstruite à chaque
 * annulation et à chaque changement de page, et un pilote qui vient de taper « bouss »
 * pour poser trois boussoles ne doit pas le retaper trois fois.
 */
let paletteQuery = ''

/**
 * Le bandeau de réglages, replié ou déployé. L'état survit à la sélection suivante et à la
 * reconstruction de la vue : un pilote qui déplace dix widgets à la suite l'a replié une
 * fois, pas dix. Il vit donc ici, hors de tout ce que `render()` renouvelle.
 */
let dockCollapsed = false
let dockElement: HTMLElement | undefined
let dockTitle: HTMLElement | undefined
let dockClass: HTMLElement | undefined
let dockCount: HTMLElement | undefined
let dockToggle: HTMLButtonElement | undefined

/**
 * La dernière annonce du carrousel. Le module la pose dans sa propre zone, que la
 * reconstruction qui suit l'opération emporte : on la garde ici pour la lui rendre.
 */
let pagesMessage: { orientation: Orientation; text: string } | undefined

/**
 * Seule clé régionale du catalogue de libellés (`widgetLabels.json`) : toutes les
 * autres langues y sont indexées par code court. `navigator.language` rend une
 * étiquette complète — « fr-BE » —, qui ne trouverait rien et retomberait sur
 * l'anglais ; on la réduit donc, sauf pour cette exception.
 */
const REGIONAL_LABEL_CODES = ['zh-TW']

function catalogLanguage(tag: string): string {
  if (REGIONAL_LABEL_CODES.includes(tag)) return tag
  return tag.split('-')[0] ?? tag
}

/**
 * `deviceFor` retombe silencieusement sur l'AIR³ 7.2 quand `info.device` manque ou ne
 * désigne aucun gabarit connu. L'interface doit le dire plutôt que de laisser croire
 * que le fichier a déclaré cet appareil : les millimètres affichés dépendent entièrement
 * de ce choix — et le sélecteur permet d'en changer sans rien réécrire.
 */
function deviceIsDeclared(raw: string | undefined, device: Device): boolean {
  const match = /AIR3-(\d+\.\d+)/i.exec(raw ?? '')
  return match !== null && device.id === `air3-${match[1]}`
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/* ------------------------------------------------------------------------ ossature */

const app = document.querySelector('#app')
if (!(app instanceof HTMLElement)) throw new Error('#app introuvable')

const fileInput = el('input', 'sr-only')
fileInput.type = 'file'
fileInput.accept = '.xcfg,.xczfg'
fileInput.id = 'file-input'

const openLabel = el('label', 'btn btn--primary', 'Ouvrir un fichier')
openLabel.htmlFor = fileInput.id

const exportButton = el('button', 'btn', 'Enregistrer une copie')
exportButton.type = 'button'
exportButton.hidden = true

/**
 * L'entrée en édition : un interrupteur, pas un autre écran. Le pilote garde sa page
 * sous les yeux, son zoom, son gabarit ; seules les zones de survol cèdent la place au
 * calque. Ressortir est aussi immédiat, et ne défait rien.
 */
const editToggle = el('button', 'btn', 'Modifier les pages')
editToggle.type = 'button'
editToggle.hidden = true
editToggle.setAttribute('aria-pressed', 'false')

const undoButton = el('button', 'btn btn--ghost', 'Annuler')
undoButton.type = 'button'
undoButton.hidden = true

const redoButton = el('button', 'btn btn--ghost', 'Rétablir')
redoButton.type = 'button'
redoButton.hidden = true

const fileName = el('span', 'app-bar__file')

const bar = el('header', 'app-bar')
const brand = el('div', 'brand')
const brandRole = el('span', 'brand__role', 'visionneuse')
brand.append(el('span', 'brand__name', 'Configuration XCTrack'), brandRole)
const actions = el('div', 'app-bar__actions')
actions.append(fileName, undoButton, redoButton, editToggle, openLabel, fileInput, exportButton)
bar.append(brand, actions)

const content = el('main', 'content')

/**
 * Barre d'outils d'affichage, hors de `content` : `render()` vide `content` à chaque
 * dessin, et le sélecteur de gabarit doit survivre — il porte un état (appareil
 * personnalisé en cours de saisie, champs « Responsive ») que le vider effacerait.
 */
const tools = el('div', 'tools')
tools.hidden = true

const veil = el('div', 'veil')
veil.append(el('span', 'veil__text', 'Déposez le fichier pour l’ouvrir'))

app.append(bar, tools, content, veil)

/* --------------------------------------------------------------------------- vues */

function landing(): HTMLElement {
  const panel = el('section', 'landing')
  panel.append(
    el('h1', 'landing__title', 'Voyez vos pages XCTrack sur un vrai écran'),
    el(
      'p', 'landing__lead',
      'Ouvrez un fichier .xcfg ou .xczfg exporté depuis l’instrument : ses pages ' +
      's’affichent telles que l’appareil les dessine, à leur taille réelle. Le fichier ' +
      'reste intact — cette visionneuse ne le réécrit pas.'
    )
  )

  const dropzone = el('label', 'dropzone')
  dropzone.htmlFor = fileInput.id
  dropzone.append(
    el('span', 'dropzone__strong', 'Déposez votre fichier ici'),
    el('span', undefined, 'ou cliquez pour le choisir — .xcfg ou .xczfg')
  )
  panel.append(dropzone)

  const steps = el('ul', 'landing__steps')
  const items: [string, string][] = [
    ['Sur l’instrument', 'Réglages, puis « Exporter la configuration ». Le fichier atterrit sur la carte SD.'],
    ['Ici', 'Les pages apparaissent numérotées dans l’ordre où « page suivante » les fait défiler en vol.'],
    ['À savoir', 'XCTrack masque certaines pages hors contexte de vol : le fichier en décrit plus que l’appareil n’en montre.']
  ]
  for (const [title, detail] of items) {
    const step = el('li', 'landing__step')
    step.append(el('span', 'landing__step-title', title), el('span', 'landing__step-text', detail))
    steps.append(step)
  }
  panel.append(steps)
  return panel
}

function problem(title: string, message: string, hint?: string): HTMLElement {
  const panel = el('section', 'problem')
  panel.append(el('h2', 'problem__title', title), el('p', 'problem__message', message))
  if (hint !== undefined) panel.append(el('p', 'problem__hint', hint))
  return panel
}

function metaStrip(current: Session): HTMLElement {
  const strip = el('div', 'meta')
  const add = (label: string, value: string): void => {
    const item = el('div', 'meta__item')
    item.append(el('span', 'meta__label', label), el('span', 'meta__value', value))
    strip.append(item)
  }
  // Le nom du fichier est déjà dans la barre de tête : ne pas le répéter ici.
  add('Format', current.container.kind === 'xczfg' ? 'archive .xczfg' : 'fichier .xcfg')
  // Ce que le fichier dit de l'appareil, distinct du gabarit d'affichage choisi
  // au-dessus : l'un est une donnée, l'autre un réglage de la visionneuse.
  add('Appareil du fichier', current.declaredDevice ?? 'non déclaré')
  add(
    'Libellés',
    current.languageFromBrowser
      ? `${current.language} (langue du navigateur)`
      : `${current.language} (déclaré par le fichier)`
  )
  if (current.settings.fromDefaults) {
    add('Réglages de rendu', 'valeurs supposées, absentes du fichier')
  }
  return strip
}

/** Familles qui décrivent un défaut, et non un simple fait sur le fichier. */
const ATTENTION_KINDS = ['structure', 'geometry', 'personal-data']

/**
 * Un avertissement : ce qu'il dit, pourquoi, et le détail énumérable replié au-delà de
 * quatre éléments — une liste de trente widgets noierait les six autres avertissements.
 */
function warningCard(warning: Warning): HTMLElement {
  const card = el('article', 'warning')
  if (ATTENTION_KINDS.includes(warning.kind)) card.classList.add('warning--attention')
  card.append(
    el('h3', 'warning__title', warning.title),
    el('p', 'warning__detail', warning.detail)
  )

  if (warning.items.length > 0) {
    const list = el('ul', 'warning__items')
    for (const item of warning.items) list.append(el('li', 'warning__item', item))

    if (warning.items.length > 4) {
      const box = el('details', 'warning__more')
      box.append(el('summary', 'warning__summary', `Voir les ${warning.items.length} éléments`), list)
      card.append(box)
    } else {
      card.append(list)
    }
  }
  return card
}

function warningPanel(warnings: Warning[]): HTMLElement | undefined {
  if (warnings.length === 0) return undefined
  const panel = el('section', 'warnings')
  panel.append(el('h2', 'warnings__title', 'Ce que dit ce fichier'))
  for (const warning of warnings) panel.append(warningCard(warning))
  return panel
}

/* ------------------------------------------------------------------- mode édition */

/** La page affichée, relue dans la mise en page courante — jamais mémorisée. */
function currentPage(): Page | undefined {
  if (!session || view.kind !== 'detail') return undefined
  return session.layout[view.orientation][view.index]
}

/**
 * Le rendu de la page en pixels de la fenêtre. Mesuré à chaque appel et non mémorisé :
 * le curseur de zoom redimensionne la plaque sous le calque, qui n'en est pas averti.
 */
function editorViewport(): Viewport {
  const rect = (editor?.element.parentElement ?? content).getBoundingClientRect()
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

/** Types de champ où Ctrl+Z appartient au navigateur, pas au document. */
const TYPING_TYPES = ['text', 'search', 'number', 'email', 'url', 'tel', 'password']

function isTyping(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && TYPING_TYPES.includes(target.type)
}

/** Vrai si la frappe est destinée au calque ou au bandeau : la vue n'y touche pas. */
function insideEditor(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.editor, .dock') !== null
}

/**
 * L'état des commandes d'édition, recalculé après chaque action. Les intitulés d'annulation
 * viennent de l'historique lui-même — « Annuler : Déplacer Altitude GPS » dit ce qui va
 * disparaître, ce qu'un bouton muet ne dit pas.
 */
function syncEditControls(): void {
  const editable = session !== undefined && session.container.parseError === undefined
  const history = session?.history

  brandRole.textContent = editMode ? 'édition' : 'visionneuse'
  editToggle.hidden = !editable
  editToggle.textContent = editMode ? 'Revenir à la consultation' : 'Modifier les pages'
  editToggle.setAttribute('aria-pressed', String(editMode))

  undoButton.hidden = !editMode || !editable
  redoButton.hidden = !editMode || !editable
  undoButton.disabled = history?.canUndo() !== true
  redoButton.disabled = history?.canRedo() !== true
  const undoLabel = history?.undoDescription()
  const redoLabel = history?.redoDescription()
  undoButton.title = undoLabel === undefined ? 'Rien à annuler' : `Annuler : ${undoLabel}`
  redoButton.title = redoLabel === undefined ? 'Rien à rétablir' : `Rétablir : ${redoLabel}`

  // Un document modifié se réécrit à l'export ; intact, il ressort octet pour octet.
  // Le bouton dit lequel des deux va se produire.
  const modified = session?.container.modified === true
  exportButton.textContent = modified ? 'Enregistrer les modifications' : 'Enregistrer une copie'
  exportButton.classList.toggle('btn--primary', modified)
}

/* ------------------------------------------------------------------- historique */

/**
 * Fenêtre de regroupement des écritures d'un même réglage.
 *
 * Un curseur émet un `input` à chaque cran : sans regroupement, tirer la transparence de
 * 100 à 40 laisserait soixante pas d'annulation, et l'historique n'en garde que cent.
 * Comme il fonctionne par instantanés, un pas enregistré tard capture simplement l'état
 * final — un pas, celui que le pilote attend. Le `change` du panneau (fin de glissé,
 * sortie de champ) le clôt bien avant l'expiration du délai, qui n'est qu'un filet.
 */
const RECORD_DELAY_MS = 400

let pendingStep: { key: string; description: string } | undefined
let pendingTimer: number | undefined

function flushRecord(): void {
  if (pendingTimer !== undefined) {
    window.clearTimeout(pendingTimer)
    pendingTimer = undefined
  }
  const step = pendingStep
  pendingStep = undefined
  if (step === undefined || !session) return
  session.history.record(step.description)
  syncEditControls()
}

function recordSoon(key: string, description: string): void {
  if (pendingStep !== undefined && pendingStep.key !== key) flushRecord()
  pendingStep = { key, description }
  if (pendingTimer !== undefined) window.clearTimeout(pendingTimer)
  pendingTimer = window.setTimeout(flushRecord, RECORD_DELAY_MS)
}

let repaintHandle: number | undefined

function scheduleRepaint(): void {
  if (repaintHandle !== undefined) return
  repaintHandle = window.requestAnimationFrame(() => {
    repaintHandle = undefined
    repaint()
  })
}

/**
 * Redessine la page seule, sans reconstruire la vue : le panneau garde son focus, son
 * défilement et son filtre, qu'un `render()` complet lui prendrait à chaque cran de
 * curseur. `renderPage` lit les coordonnées de `Page.widgets`, photographie prise à la
 * lecture : on en reprend donc une neuve — le calque, lui, relit les nœuds à chaque geste
 * et n'a besoin de rien.
 */
function repaint(): void {
  if (!session || view.kind !== 'detail') return
  const orientation = view.orientation
  // Relecture locale : `session.layout` et la page que le calque tient restent le même
  // objet d'un bout à l'autre d'une vue. C'est `render()` qui les renouvelle.
  const page = readLayout(session.container.document)[orientation][view.index]
  const plate = content.querySelector('.plate')
  const drawing = plate?.firstElementChild
  if (!page || !plate || !drawing) return
  plate.replaceChild(
    renderPage(page, aspectRatioOf(session.device, orientation), session.settings, session.language),
    drawing
  )
  // Le nombre de widgets est un fait de la vue, et une action de structure vient peut-être
  // de le changer : il se remet à jour ici, faute de quoi la page dirait « 14 widgets »
  // alors qu'on vient d'en poser un quinzième.
  const count = content.querySelector('.chip--count')
  if (count) {
    const total = page.widgets.length
    count.textContent = `${total} widget${total > 1 ? 's' : ''}`
  }
}

/**
 * Vrai pendant qu'une frappe du calque est en cours de traitement. Le calque appelle
 * `onEdit` de façon synchrone depuis son gestionnaire de touche : le drapeau, posé en
 * phase de capture et retiré au microtâche suivante, dit donc exactement d'où vient la
 * modification qui arrive.
 */
let keyboardGesture = false

/**
 * Un geste terminé sur le calque. Le widget est déjà écrit — `commitGesture` s'en est
 * chargé —, il ne reste qu'à en prendre l'instantané et à marquer le conteneur.
 *
 * Une flèche maintenue se répète : au clavier, les pas se regroupent comme ceux d'un
 * curseur, sans quoi deux secondes d'appui rempliraient à elles seules les cent pas de
 * l'historique. Un glissé, lui, ne produit qu'une modification à son terme : elle est
 * enregistrée aussitôt, et « Annuler » s'allume dans l'instant.
 */
function onWidgetEdit(edit: WidgetEdit): void {
  if (!session) return
  session.container.modified = true
  if (keyboardGesture) {
    recordSoon(`geste:${edit.widgetIndex}:${edit.description}`, edit.description)
  } else {
    flushRecord()
    session.history.record(edit.description)
  }
  scheduleRepaint()
  syncEditControls()
}

/**
 * Une action de structure terminée sur le calque : suppression, duplication, changement
 * de rang. Trois différences avec un simple geste, et elles commandent tout ce qui suit.
 *
 * 1. **Le pas est enregistré aussitôt, jamais regroupé.** Supprimer puis dupliquer sont
 *    deux actions distinctes, même à une seconde d'intervalle.
 * 2. **La page est redessinée.** Le calque ne dessine pas les widgets — il ne pose que
 *    les marques par-dessus le rendu de `render/canvas.ts` : un widget supprimé resterait
 *    à l'écran sans ce redessin, et une copie n'y apparaîtrait pas.
 * 3. **La sélection suit ce que l'action en dit** (`edit.selection`). Le calque l'a déjà
 *    posée et nous l'a annoncée par `onSelectionChange` juste avant cet appel ; on la
 *    relit ici pour que le rang mémorisé par cette vue soit celui du calque, quoi qu'il
 *    arrive à l'ordre des appels.
 *
 * L'annulation, elle, ne repasse jamais par `revertStructureEdit` : l'historique
 * photographie le document entier, ce qui reste juste après un réordonnancement là où un
 * journal d'opérations inverses désignant les widgets par leur rang deviendrait faux.
 */
function onStructureEdit(edit: WidgetStructureEdit): void {
  if (!session) return
  session.container.modified = true
  flushRecord()
  session.history.record(edit.description)
  selection = edit.selection
  scheduleRepaint()
  refreshPanel()
  syncEditControls()
}

/** Une option modifiée dans le panneau. `properties.ts` a déjà écrit la valeur. */
function onPropertyChange(field: PropertyField, widget: Widget): void {
  if (!session) return
  session.container.modified = true
  const label = field.label === '' ? field.path : field.label
  const description = `Régler ${label} — ${readableName(widget.shortName, session.language)}`
  if (field.control === 'slider' || field.control === 'number') {
    recordSoon(`${selection ?? -1}:${field.path}`, description)
  } else {
    flushRecord()
    session.history.record(description)
  }
  scheduleRepaint()
  syncEditControls()
}

/**
 * Annuler et rétablir.
 *
 * `history.undo()` rend un **arbre neuf** : plus rien de ce que l'interface tenait n'y
 * pointe. D'où la règle tenue dans tout ce fichier — l'interface ne mémorise que des
 * entiers. L'orientation et le rang de la page vivent dans `view`, le widget choisi dans
 * `selection` : trois repères qui traversent l'opération intacts. On réaffecte le
 * document, et `render()` reconstruit tout le reste depuis eux (mise en page relue,
 * calque neuf, panneau rebâti sur le nœud retrouvé au même rang).
 */
function stepHistory(direction: 'undo' | 'redo'): void {
  if (!session) return
  flushRecord()
  const history = session.history
  if (!(direction === 'undo' ? history.canUndo() : history.canRedo())) return
  // L'annonce du carrousel décrit l'opération précédente : elle vient d'être défaite, et
  // la redire ferait croire qu'elle tient toujours.
  pagesMessage = undefined
  session.container.document = direction === 'undo' ? history.undo() : history.redo()
  // Revenu à son état d'origine, le document ressort octet pour octet : c'est `modified`
  // qui commande à `exportContainer`, et `isDirty()` sait reconnaître ce retour.
  session.container.modified = history.isDirty()
  render()
}

/* ---------------------------------------------------------- calque et panneau */

/**
 * Le panneau de propriétés se charge à la demande.
 *
 * `properties.ts` traîne derrière lui le catalogue d'options extrait de l'APK — dix mille
 * lignes, quatre cents kilo-octets, quatre fois le reste de l'application. Il ne sert
 * qu'en édition : le charger au premier widget sélectionné laisse la visionneuse aussi
 * légère qu'au jalon 1, et un simple coup d'œil à un fichier ne télécharge pas de quoi
 * l'éditer. L'import est amorcé dès l'entrée en édition — il est donc, en pratique,
 * toujours arrivé avant le premier clic.
 */
type PropertiesModule = typeof import('./properties')

let propertiesModule: PropertiesModule | undefined
let propertiesLoading: Promise<PropertiesModule> | undefined

function loadProperties(): Promise<PropertiesModule> {
  propertiesLoading ??= import('./properties').then((module) => {
    propertiesModule = module
    return module
  })
  return propertiesLoading
}

/**
 * La palette se charge à la demande pour la même raison que le panneau, et c'est le même
 * poids qu'elle traîne : elle dresse la liste des 84 types depuis `widgetOptions.ts`. Les
 * deux imports différés partagent ce catalogue, que l'assembleur range dans un morceau
 * commun — ouvrir la palette après le panneau ne le retélécharge pas.
 */
type PaletteModule = typeof import('./widgetPalette')

let paletteModule: PaletteModule | undefined
let paletteLoading: Promise<PaletteModule> | undefined

function loadPalette(): Promise<PaletteModule> {
  paletteLoading ??= import('./widgetPalette').then((module) => {
    paletteModule = module
    return module
  })
  return paletteLoading
}

/**
 * Les widgets qui serviront de modèles, **dans l'ordre de préférence de la palette** :
 * ceux de la page affichée d'abord, les autres ensuite. La palette retient le premier
 * exemplaire rencontré de chaque type — dupliquer une boussole, c'est donc dupliquer
 * celle qu'on a sous les yeux plutôt qu'une homonyme réglée autrement à l'autre bout du
 * fichier.
 */
function paletteSources(current: Session, page: Page | undefined): JsonNode[] {
  const nodes: JsonNode[] = []
  if (page) for (const widget of page.widgets) nodes.push(widget.node)
  for (const orientation of ['landscape', 'portrait'] as const) {
    for (const other of current.layout[orientation]) {
      if (other === page) continue
      for (const widget of other.widgets) nodes.push(widget.node)
    }
  }
  return nodes
}

/** Vrai si la page peut recevoir un widget : encore faut-il qu'elle ait un tableau. */
function acceptsWidgets(page: Page): boolean {
  return getMember(page.node, 'widgets')?.kind === 'array'
}

/**
 * Un type choisi dans la palette. Le nœud arrive prêt ; l'appelant — c'est-à-dire ici —
 * décide de la page et du rang : **au premier plan**, comme l'appareil, et sélectionné
 * dans la foulée, pour que le réglage suive l'ajout sans un clic de plus.
 *
 * Le document est muté puis photographié par l'historique : on ne passe jamais par
 * `applyStructureEdit`, dont l'inverse deviendrait faux dès le premier réordonnancement.
 */
function addWidgetFromPalette(node: JsonNode, description: string): void {
  const page = currentPage()
  if (!session || !editor || page === undefined || !acceptsWidgets(page)) return
  flushRecord()

  const index = insertWidget(page.node, node)
  // `page.widgets` est la photographie prise par `readLayout`, parallèle au tableau du
  // document : les deux bougent ensemble, sans quoi le calque viserait un autre widget
  // que le document.
  page.widgets.splice(index, 0, readWidget(node))

  session.container.modified = true
  session.history.record(description)
  // Une modification de structure impose le redessin : le calque ne dessine pas les
  // widgets, c'est `render/canvas.ts` qui s'en charge sous lui.
  repaint()
  editor.select(index)
  editor.refresh()
  syncEditControls()
}

/* ------------------------------------------------------- palette d'ajout, en modale */

let paletteDialog: HTMLDialogElement | undefined

/**
 * La palette, dans une boîte modale ouverte par la barre d'édition. Rien ne partage la
 * largeur avec la page : à fort zoom, une liste de 84 types tenue en permanence sur le
 * côté mordrait sur le seul objet dessiné à sa taille réelle.
 *
 * La boîte est **remplie depuis l'état courant** à chaque ouverture et à chaque
 * reconstruction de la vue : les modèles à dupliquer viennent de la mise en page vivante,
 * qu'une annulation renouvelle entièrement.
 */
function fillPaletteDialog(dialog: HTMLDialogElement): void {
  if (!session || view.kind !== 'detail') return
  dialog.textContent = ''

  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Ajouter un gadget'))
  const close = el('button', 'btn', 'Fermer')
  close.type = 'button'
  close.addEventListener('click', () => closePaletteDialog())
  head.append(close)
  box.append(head)

  const page = currentPage()
  if (page === undefined) {
    dialog.append(box)
    return
  }

  if (!acceptsWidgets(page)) {
    box.append(el(
      'p', 'hint-note',
      'Cette page ne décrit aucun tableau de widgets : rien ne peut y être ajouté sans ' +
      'inventer une clé que le fichier n’a pas.'
    ))
    dialog.append(box)
    return
  }

  const module = paletteModule
  if (module === undefined) {
    box.append(el('p', 'hint-note', 'Chargement de la palette…'))
    dialog.append(box)
    // La boîte a pu être fermée ou refaite entre-temps : ce résultat-ci serait périmé.
    void loadPalette().then(() => { if (paletteDialog === dialog) fillPaletteDialog(dialog) })
    return
  }

  const palette = module.renderWidgetPalette({
    existing: paletteSources(session, page),
    device: session.device,
    orientation: view.orientation,
    language: session.language,
    // On ouvre, on choisit, elle se ferme : le widget posé est sélectionné, et ses
    // réglages apparaissent dans le bandeau du bas sans un clic de plus.
    onChoose: (node, description) => {
      closePaletteDialog()
      addWidgetFromPalette(node, description)
    }
  })

  const search = palette.element.querySelector('.palette__search')
  if (search instanceof HTMLInputElement) {
    search.value = paletteQuery
    if (paletteQuery !== '') palette.filter(paletteQuery)
    search.addEventListener('input', () => { paletteQuery = search.value })
  }
  box.append(palette.element)
  dialog.append(box)

  // La boîte était déjà ouverte : ce remplissage-ci vient du module arrivé après coup, ou
  // d'une vue reconstruite sous elle. Le focus est parti avec le contenu remplacé, on le
  // rend au champ de recherche — là où le pilote tapait. À la première ouverture, la boîte
  // n'est pas encore affichée : c'est `openPaletteDialog` qui s'en charge.
  if (dialog.open && search instanceof HTMLInputElement) search.focus()
}

function syncPaletteDialog(): void {
  if (!paletteDialog) return
  if (!session || session.container.parseError !== undefined || view.kind !== 'detail') {
    closePaletteDialog()
    return
  }
  fillPaletteDialog(paletteDialog)
}

function closePaletteDialog(): void {
  const dialog = paletteDialog
  paletteDialog = undefined
  if (!dialog) return
  dialog.close()
  dialog.remove()
}

function openPaletteDialog(): void {
  if (!session || paletteDialog !== undefined) return
  flushRecord()
  const dialog = el('dialog', 'modal modal--palette')
  dialog.setAttribute('aria-label', 'Ajouter un gadget')
  // Échap ferme la boîte native : rien n'est ajouté, le document reste tel qu'il est.
  dialog.addEventListener('cancel', () => {
    paletteDialog = undefined
    dialog.remove()
  })
  paletteDialog = dialog
  fillPaletteDialog(dialog)
  document.body.append(dialog)
  dialog.showModal()
  const search = dialog.querySelector('.palette__search')
  if (search instanceof HTMLInputElement) search.focus()
}

/**
 * Le bandeau, replié ou déployé. Replié, il ne laisse que sa barre de tête : le nom du
 * widget sélectionné et le bouton pour la rouvrir — de quoi savoir sur quoi on agit sans
 * rien prendre à la page.
 */
function syncDock(): void {
  if (!dockElement || !dockToggle || !panelHost) return
  dockElement.classList.toggle('dock--collapsed', dockCollapsed)
  dockToggle.textContent = dockCollapsed ? 'Déplier les réglages' : 'Replier'
  dockToggle.setAttribute('aria-expanded', String(!dockCollapsed))
  panelHost.hidden = dockCollapsed
}

/** Reconstruit le bandeau depuis le rang sélectionné — jamais depuis un nœud retenu. */
function refreshPanel(): void {
  if (!panelHost || !session) return
  const page = currentPage()
  const widget = selection === undefined ? undefined : page?.widgets[selection]
  const name = widget === undefined ? undefined : readableName(widget.shortName, session.language)

  if (selectionLabel) {
    selectionLabel.textContent = widget === undefined
      ? 'Aucun widget sélectionné'
      : `${name} — rang ${(selection ?? 0) + 1} sur ${page?.widgets.length ?? 0}`
  }

  // La barre de tête du bandeau redit ces trois faits : elle reste visible une fois le
  // bandeau replié, où le panneau lui-même a disparu.
  if (dockTitle) dockTitle.textContent = name ?? 'Aucun widget sélectionné'
  if (dockClass) dockClass.textContent = widget?.shortName ?? ''
  if (dockCount) dockCount.textContent = ''

  panelHost.textContent = ''
  if (widget === undefined) {
    panelHost.append(el(
      'p', 'hint-note',
      'Cliquez un widget sur la page : ses réglages apparaissent ici, dans l’ordre où ' +
      'l’instrument les présente.'
    ))
    return
  }

  const module = propertiesModule
  if (module === undefined) {
    const host = panelHost
    host.append(el('p', 'hint-note', 'Chargement des réglages…'))
    // `panelHost` a changé : la vue a été reconstruite entre-temps, et elle a rappelé
    // `refreshPanel` de son côté. Ce résultat-ci est périmé.
    void loadProperties().then(() => { if (panelHost === host) refreshPanel() })
    return
  }

  const form = module.buildPropertyForm(widget, session.language)
  if (dockCount) {
    const total = form.fields.length
    dockCount.textContent = `${total} réglage${total > 1 ? 's' : ''}`
  }
  panelHost.append(module.renderProperties({
    form,
    onChange: (field) => onPropertyChange(field, widget)
  }).element)
}

/**
 * Le bandeau de réglages, sous la page et collant en bas de fenêtre. La barre de tête dit
 * ce qui est réglé ; le corps porte le panneau de `properties.ts` tel quel — c'est le CSS
 * de l'enveloppe qui étale sa liste verticale en colonnes, le module n'en sait rien.
 */
function buildDock(): HTMLElement {
  const dock = el('section', 'dock')
  dock.setAttribute('aria-label', 'Réglages du widget sélectionné')
  // Fin de glissé d'un curseur, sortie d'un champ : le pas en attente est clos ici
  // plutôt qu'au bout du délai.
  dock.addEventListener('change', () => flushRecord())

  const head = el('div', 'dock__head')
  dockTitle = el('h2', 'dock__title', 'Aucun widget sélectionné')
  dockClass = el('span', 'dock__class')
  dockCount = el('span', 'dock__count')
  dockToggle = el('button', 'btn dock__toggle', 'Replier')
  dockToggle.type = 'button'
  dockToggle.addEventListener('click', () => {
    dockCollapsed = !dockCollapsed
    syncDock()
  })
  head.append(dockTitle, dockClass, dockCount, dockToggle)

  panelHost = el('div', 'dock__body')
  panelHost.id = 'dock-body'
  dockToggle.setAttribute('aria-controls', panelHost.id)

  dock.append(head, panelHost)
  dockElement = dock
  return dock
}

function buildEditing(current: Session, page: Page, orientation: Orientation): DetailEditing {
  const grid = gridFor(current.device, orientation)

  const editBar = el('div', 'editbar')
  selectionLabel = el('span', 'editbar__selection')

  // Les deux commandes qui ne portent pas sur le widget sélectionné : ce qu'on ajoute à
  // la page, et les pages elles-mêmes. Elles sont à part du reste de la barre, qui décrit.
  const barActions = el('div', 'editbar__actions')
  const paletteButton = el('button', 'btn', 'Ajouter un gadget')
  paletteButton.type = 'button'
  // La boîte charge le module au besoin et se remplit elle-même quand il arrive.
  paletteButton.addEventListener('click', () => openPaletteDialog())
  const pagesButton = el('button', 'btn', 'Gérer les pages')
  pagesButton.type = 'button'
  pagesButton.addEventListener('click', () => openPagesDialog())
  barActions.append(paletteButton, pagesButton)

  editBar.append(
    el('span', 'editbar__badge', 'Édition'),
    selectionLabel,
    // La grille de l'appareil, dite explicitement : c'est elle qui explique pourquoi un
    // widget ne se pose pas exactement là où on l'a lâché.
    el('span', 'editbar__grid', `Grille ${grid.cols} × ${grid.rows}`),
    barActions,
    el(
      'span', 'editbar__hint',
      'Glisser : déplacer · équerres et segments : redimensionner · flèches : une cellule · ' +
      'Maj + flèches : redimensionner · Ctrl + flèches : changer de rang · Ctrl + D : ' +
      'dupliquer · Suppr : supprimer · Échap : désélectionner'
    )
  )

  const dock = buildDock()

  editor = createEditor({
    page,
    device: current.device,
    orientation,
    language: current.language,
    viewport: editorViewport,
    onEdit: onWidgetEdit,
    onStructureEdit,
    onSelectionChange: (index) => {
      selection = index
      refreshPanel()
    }
  })

  editor.element.addEventListener('keydown', () => {
    keyboardGesture = true
    queueMicrotask(() => { keyboardGesture = false })
  }, true)

  // La sélection se retrouve par son rang dans la page neuve. Un rang devenu hors bornes
  // — page changée sous elle — vaut « rien de sélectionné » plutôt qu'un widget au hasard.
  if (selection !== undefined && selection >= page.widgets.length) selection = undefined
  if (selection !== undefined) editor.select(selection)
  refreshPanel()
  syncDock()

  return { layer: editor.element, dock, bar: editBar }
}

/* ------------------------------------------------------------- gestion des pages */

/**
 * Ce que devient le rang de la page affichée après une opération sur les pages, ou
 * `undefined` si cette page n'existe plus.
 *
 * Une page n'a pas de nom : son rang EST son identité, et toutes ces opérations le
 * changent. La vue mémorise ce rang, jamais la page elle-même — après une annulation, le
 * document est de toute façon un arbre neuf où plus rien de l'ancien ne pointe. Il faut
 * donc reporter le décalage nous-mêmes, sans quoi le pilote qui insère une page en tête
 * se retrouverait à regarder sa voisine sous le même numéro.
 */
function remapPageIndex(operation: PageOperation, index: number): number | undefined {
  switch (operation.kind) {
    case 'insert':
      return index >= operation.index ? index + 1 : index
    case 'duplicate':
      // La copie se pose juste après l'original : seuls les rangs au-delà glissent.
      return index > operation.index ? index + 1 : index
    case 'remove':
      if (index === operation.index) return undefined
      return index > operation.index ? index - 1 : index
    case 'reorder': {
      const { from, to } = operation
      if (index === from) return to
      if (from < index && index <= to) return index - 1
      if (to <= index && index < from) return index + 1
      return index
    }
    case 'setClass':
      return index
  }
}

/**
 * Une opération demandée par le carrousel. Le module ne décide de rien : il construit
 * l'opération et sa description, c'est ici qu'on l'applique au document vivant, qu'on en
 * enregistre le pas et qu'on reconstruit — carrousel compris.
 */
function runPageOperation(
  orientation: Orientation, operation: PageOperation, description: string
): void {
  if (!session) return
  flushRecord()

  // L'annonce se calcule sur l'état d'AVANT, et se garde : la reconstruction du
  // carrousel emporte la zone d'annonce que le module vient de remplir.
  const text = operationAnnouncement(session.layout[orientation], operation, orientation)

  try {
    applyPageOperation(session.container.document, orientation, operation)
  } catch (error) {
    pagesMessage = { orientation, text: `Opération impossible : ${String(error)}` }
    syncPagesDialog()
    return
  }
  pagesMessage = { orientation, text }

  session.container.modified = true
  session.history.record(description)

  if (view.kind === 'detail' && view.orientation === orientation) {
    const next = remapPageIndex(operation, view.index)
    if (next === undefined) {
      // La page qu'on regardait n'existe plus. Retour à la vue d'ensemble plutôt que
      // vers sa voisine : rien ne dit que le pilote voulait celle-là.
      view = { kind: 'overview' }
      selection = undefined
    } else if (next !== view.index) {
      // Même page, autre rang : la sélection, qui est un rang de widget DANS cette page,
      // reste valable telle quelle.
      view = { kind: 'detail', orientation, index: next }
    }
  }

  // `render()` reconstruit la vue ET le carrousel, depuis la mise en page relue.
  render()
}

let pagesDialog: HTMLDialogElement | undefined

/**
 * Le carrousel des deux orientations, dans une boîte modale : c'est la même commande
 * depuis la vue d'ensemble et depuis une page, et elle ne fait perdre ni le zoom, ni le
 * gabarit, ni la sélection en cours.
 */
function fillPagesDialog(dialog: HTMLDialogElement): void {
  if (!session) return
  const current = session
  dialog.textContent = ''

  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Gérer les pages'))
  const close = el('button', 'btn', 'Fermer')
  close.type = 'button'
  close.addEventListener('click', () => closePagesDialog())
  head.append(close)
  box.append(head)

  box.append(el(
    'p', 'modal__lead',
    'Insérer, dupliquer, supprimer, réordonner. Chaque opération est enregistrée : ' +
    '« Annuler » la défait comme le reste. La classe d’une page, elle, n’est pas ' +
    'proposée à la modification — XCTrack la fixe à la création, et l’effet d’un ' +
    'changement après coup n’a pas été vérifié sur l’appareil.'
  ))

  const ctx: ViewContext = {
    device: current.device,
    settings: current.settings,
    language: current.language
  }

  for (const orientation of ['landscape', 'portrait'] as const) {
    const manager = renderPageManager({
      pages: current.layout[orientation],
      orientation,
      ctx,
      // Voir le texte ci-dessus : on s'en tient à ce que l'appareil sait faire.
      allowClassChange: false,
      onOperation: (operation, description) => {
        runPageOperation(orientation, operation, description)
      },
      onOpen: (index) => {
        closePagesDialog()
        view = { kind: 'detail', orientation, index }
        // Un rang de widget ne veut rien dire d'une page à l'autre.
        selection = undefined
        render()
        window.scrollTo({ top: 0 })
      }
    })
    box.append(manager.root)
    // Ce que l'opération précédente a produit, redit dans le carrousel reconstruit.
    if (pagesMessage?.orientation === orientation) manager.announce(pagesMessage.text)
  }

  dialog.append(box)
}

function syncPagesDialog(): void {
  if (!pagesDialog) return
  if (!session || session.container.parseError !== undefined) {
    closePagesDialog()
    return
  }
  fillPagesDialog(pagesDialog)
}

function closePagesDialog(): void {
  const dialog = pagesDialog
  pagesDialog = undefined
  pagesMessage = undefined
  if (!dialog) return
  dialog.close()
  dialog.remove()
}

function openPagesDialog(): void {
  if (!session || pagesDialog !== undefined) return
  flushRecord()
  const dialog = el('dialog', 'modal modal--pages')
  dialog.setAttribute('aria-label', 'Gérer les pages')
  // Échap ferme la boîte native : rien n'est annulé, le document reste tel qu'il est.
  dialog.addEventListener('cancel', () => {
    pagesDialog = undefined
    pagesMessage = undefined
    dialog.remove()
  })
  pagesDialog = dialog
  fillPagesDialog(dialog)
  document.body.append(dialog)
  dialog.showModal()
}

function render(): void {
  // Le calque appartient à la vue qu'on efface : on le démonte explicitement, pour que
  // ses écoutes de fenêtre (`pointermove`, `pointerup`) partent avec lui.
  editor?.destroy()
  editor = undefined
  panelHost = undefined
  selectionLabel = undefined
  dockElement = undefined
  dockTitle = undefined
  dockClass = undefined
  dockCount = undefined
  dockToggle = undefined

  // La mise en page se relit à chaque dessin depuis le document courant. Après une
  // annulation, ce document est un arbre neuf : rien de ce qui a été lu avant lui ne
  // doit survivre à cette ligne.
  if (session !== undefined && session.container.parseError === undefined) {
    session.layout = readLayout(session.container.document)
  }

  // Le carrousel se reconstruit avec la vue, et depuis la mise en page qui vient d'être
  // relue : après une annulation, il montre les pages de l'arbre neuf, pas celles de
  // l'arbre disparu.
  syncPagesDialog()
  syncPaletteDialog()

  content.textContent = ''
  // La page est le seul objet dessiné à sa taille réelle : en édition, le cadre s'élargit
  // pour elle. Remis à faux ici, il n'est rétabli que par la branche qui construit
  // effectivement une page en édition.
  content.classList.remove('content--wide')
  exportButton.hidden = session === undefined
  tools.hidden = session === undefined || session.container.parseError !== undefined
  fileName.textContent = session?.container.fileName ?? ''
  syncEditControls()

  if (failure !== undefined) {
    content.append(problem(
      'Fichier illisible',
      failure,
      'Vérifiez qu’il s’agit bien d’un export XCTrack (.xcfg ou .xczfg).'
    ))
    return
  }

  if (!session) {
    content.append(landing())
    return
  }

  if (session.container.parseError !== undefined) {
    content.append(problem(
      'Contenu illisible',
      `Ce fichier n’a pas pu être analysé : ${session.container.parseError}`,
      'Ses octets sont conservés intacts : « Enregistrer une copie » vous le rend tel qu’il est entré, ' +
      'sans la moindre réécriture.'
    ))
    return
  }

  const ctx: ViewContext = {
    device: session.device,
    settings: session.settings,
    language: session.language
  }

  if (view.kind === 'detail') {
    const pages = session.layout[view.orientation]
    const page = pages[view.index]
    if (page) {
      const orientation = view.orientation
      // Le calque et le panneau ne sont construits qu'en édition : en consultation, la
      // vue détaillée reste celle du jalon 1, zones de survol comprises.
      const editing = editMode ? buildEditing(session, page, orientation) : undefined
      if (editing) content.classList.add('content--wide')
      content.append(buildDetail({
        page,
        index: view.index,
        pageCount: pages.length,
        orientation,
        ctx,
        zoom,
        onBack: () => { view = { kind: 'overview' }; selection = undefined; render() },
        onGo: (index) => {
          view = { kind: 'detail', orientation, index }
          // Un rang de widget ne veut rien dire d'une page à l'autre.
          selection = undefined
          render()
        },
        onZoom: (factor) => { zoom = factor },
        ...(editing === undefined ? {} : { editing })
      }))
      syncEditControls()
      return
    }
    view = { kind: 'overview' }
  }

  const title = el('h1', 'sr-only', 'Pages de la configuration')
  content.append(title, metaStrip(session))
  if (editMode) {
    const note = el('div', 'editnote')
    note.append(el(
      'p', 'editnote__text',
      'Mode édition : ouvrez une page pour y ajouter des gadgets, déplacer ses widgets et ' +
      'régler leurs options. Les pages elles-mêmes — en insérer, en dupliquer, en ' +
      'supprimer, changer leur ordre — se gèrent ici.'
    ))
    const pagesButton = el('button', 'btn btn--primary', 'Gérer les pages')
    pagesButton.type = 'button'
    pagesButton.addEventListener('click', () => openPagesDialog())
    note.append(pagesButton)
    content.append(note)
  }

  // Les données personnelles n'ont pas leur place ici : elles ne concernent le pilote
  // qu'au moment où il s'apprête à donner son fichier — voir l'export.
  const panel = warningPanel(warningsAt(session.warnings, 'import'))
  if (panel) content.append(panel)

  content.append(
    buildOverview(session.layout, ctx, (orientation, index) => {
      view = { kind: 'detail', orientation, index }
      render()
      window.scrollTo({ top: 0 })
    })
  )
}

/* ---------------------------------------------------------------- gabarit d'écran */

/**
 * Le sélecteur est refait à chaque fichier ouvert : sa sélection initiale découle de
 * `info.device`, qui change avec le fichier. Changer de gabarit ne touche jamais au
 * document — seul `session.device` bouge, et la vue est redessinée.
 */
function installDeviceSelector(initialDevice: Device): void {
  tools.textContent = ''
  const selector = buildDeviceSelector({
    initialDevice,
    onChange: (device) => {
      if (!session) return
      session.device = device
      render()
    }
  })
  tools.append(selector.element)
}

/* ------------------------------------------------------------------------- import */

async function load(file: File): Promise<void> {
  // Ferme le pas en attente et son minuteur avant que la session ne disparaisse.
  flushRecord()
  failure = undefined
  session = undefined
  // Un nouveau fichier s'ouvre en consultation : on le regarde avant de le modifier, et
  // l'historique de l'ancien n'a plus aucun sens ici.
  editMode = false
  selection = undefined
  // Le carrousel et la palette parlaient du fichier précédent.
  closePagesDialog()
  closePaletteDialog()
  paletteQuery = ''
  try {
    const container = await openContainer(new Uint8Array(await file.arrayBuffer()), file.name)
    const settings = readRenderSettings(container.document)
    const info = getMember(container.document, 'info')
    const declaredDevice = info ? readString(info, 'device') : undefined
    const device = deviceFor(declaredDevice)
    // C'est l'interface qui connaît le navigateur : `resolveLanguage` reçoit la langue
    // système en paramètre, le modèle ne la lit jamais lui-même.
    const systemLanguage = catalogLanguage(navigator.language)
    // L'historique prend le document en charge dès l'ouverture, et le conteneur adopte
    // SON document : les deux ne peuvent alors plus diverger, et `container.modified`
    // reste faux tant que rien n'a été enregistré — un fichier seulement consulté ressort
    // donc toujours octet pour octet.
    const history = createHistory(container.document)
    container.document = history.current()
    const layout = readLayout(container.document)
    const language = resolveLanguage(settings.language, systemLanguage)
    session = {
      container,
      layout,
      settings,
      history,
      device,
      declaredDevice: deviceIsDeclared(declaredDevice, device) ? device.label : undefined,
      language,
      languageFromBrowser: settings.language.kind === 'system',
      warnings: computeWarnings({ document: container.document, layout, settings, language })
    }
    installDeviceSelector(device)
  } catch (error) {
    failure = String(error)
  }
  view = { kind: 'overview' }
  render()
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void load(file)
  // Permet de rouvrir le même fichier après l'avoir modifié sur le disque.
  fileInput.value = ''
})

/**
 * Le voile « déposez le fichier » ne concerne que les fichiers. Le carrousel des pages se
 * réordonne au glisser-déposer : sans ce filtre, tirer une vignette recouvrirait toute
 * l'application d'une invitation à ouvrir un fichier, et masquerait la cible visée.
 */
function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') === true
}

let dragDepth = 0
window.addEventListener('dragenter', (event) => {
  if (!carriesFiles(event)) return
  event.preventDefault()
  dragDepth += 1
  document.body.classList.add('is-dragging')
})
window.addEventListener('dragover', (event) => {
  if (!carriesFiles(event)) return
  event.preventDefault()
})
window.addEventListener('dragleave', (event) => {
  if (!carriesFiles(event)) return
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) document.body.classList.remove('is-dragging')
})
window.addEventListener('drop', (event) => {
  event.preventDefault()
  dragDepth = 0
  document.body.classList.remove('is-dragging')
  const file = event.dataTransfer?.files?.[0]
  if (file) void load(file)
})

/* -------------------------------------------------------------------------- export */

/**
 * Réémission des octets — la seule action offerte, et la seule offerte aussi quand le
 * fichier est illisible. Le fichier n'est jamais modifié : `exportContainer` rend sa
 * source telle quelle. Le nom, lui, est horodaté et distinct de l'original — deux
 * fichiers homonymes sur une carte SD la veille d'une manche sont une erreur d'import
 * qui se découvre en vol.
 */
async function download(current: Session): Promise<void> {
  const bytes = await exportContainer(current.container)
  // Copie dans un ArrayBuffer simple : `Blob` n'accepte pas une vue dont le tampon
  // pourrait être partagé, et le conteneur ne garantit rien de son origine.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
  const link = el('a')
  link.href = url
  link.download = exportFileName(current.container.fileName, new Date())
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Ce que le pilote s'apprête à donner, dit AVANT le téléchargement et non après : une
 * fois le fichier sur la carte SD ou dans une conversation, l'avertissement arrive trop
 * tard. On avertit, on ne dépouille pas en silence — le document sort intact.
 */
function askBeforeExport(current: Session): void {
  // Les avertissements sont calculés à l'import ; un document modifié en mérite un
  // recalcul, car ce qu'il contient a changé depuis. Ce qui ne change pas : ils sont dits
  // AVANT le téléchargement, modifié ou non.
  const warnings = warningsAt(
    current.container.modified
      ? computeWarnings({
        document: current.container.document,
        layout: current.layout,
        settings: current.settings,
        language: current.language
      })
      : current.warnings,
    'export'
  )
  if (warnings.length === 0) {
    void download(current)
    return
  }

  const dialog = el('dialog', 'modal')
  const box = el('div', 'modal__box')
  box.append(el('h2', 'modal__title', 'Avant de partager ce fichier'))
  for (const warning of warnings) box.append(warningCard(warning))

  box.append(el(
    'p', 'modal__name',
    `Nom du fichier produit : ${exportFileName(current.container.fileName, new Date())}`
  ))

  const actions = el('div', 'modal__actions')
  const cancel = el('button', 'btn', 'Annuler')
  cancel.type = 'button'
  const confirm = el('button', 'btn btn--primary', 'Enregistrer quand même')
  confirm.type = 'button'
  actions.append(cancel, confirm)
  box.append(actions)
  dialog.append(box)

  const close = (): void => {
    dialog.close()
    dialog.remove()
  }
  cancel.addEventListener('click', close)
  confirm.addEventListener('click', () => {
    close()
    void download(current)
  })
  // Échap ferme la boîte native : rien n'est téléchargé, comme « Annuler ».
  dialog.addEventListener('cancel', () => dialog.remove())

  document.body.append(dialog)
  dialog.showModal()
  confirm.focus()
}

exportButton.addEventListener('click', () => {
  // Un pas de curseur encore en attente est clos avant de sortir le fichier : il est
  // déjà écrit dans le document, il doit être annulable après coup.
  flushRecord()
  if (session) askBeforeExport(session)
})

/* ------------------------------------------------------- commandes d'édition */

editToggle.addEventListener('click', () => {
  editMode = !editMode
  // Les deux modules lourds de l'édition sont amorcés dès l'entrée : ils partagent le
  // catalogue d'options, et le premier clic ne doit pas attendre son téléchargement.
  if (editMode) {
    void loadProperties()
    void loadPalette()
  }
  if (!editMode) {
    flushRecord()
    selection = undefined
  }
  render()
})

undoButton.addEventListener('click', () => stepHistory('undo'))
redoButton.addEventListener('click', () => stepHistory('redo'))

/**
 * Prévenir avant de perdre. Le navigateur n'affiche que son propre texte — on ne choisit
 * que le fait de demander —, et il ne le demande qu'après une interaction avec la page,
 * ce qui est toujours le cas ici : un document modifié l'a forcément été à la souris.
 */
window.addEventListener('beforeunload', (event) => {
  if (session?.container.modified !== true) return
  event.preventDefault()
  event.returnValue = ''
})

/* ------------------------------------------------------------------------- clavier */

/**
 * Annuler et rétablir au clavier. Dans un champ de saisie, Ctrl+Z reste celui du
 * navigateur : reprendre un mot effacé n'est pas annuler une modification du document, et
 * les deux se disputeraient la même frappe.
 */
window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
  if (!editMode || session === undefined || isTyping(event.target)) return
  event.preventDefault()
  stepHistory(event.shiftKey ? 'redo' : 'undo')
})

window.addEventListener('keydown', (event) => {
  const current = view
  if (current.kind !== 'detail') return
  // Une boîte modale est ouverte par-dessus : Échap la ferme, les flèches appartiennent à
  // ses commandes. Rien de tout cela ne doit changer la page qui se trouve derrière.
  if (pagesDialog !== undefined || paletteDialog !== undefined) return
  // Les flèches appartiennent au curseur de zoom quand il a le focus.
  if (event.target instanceof HTMLInputElement) return
  // En édition, flèches et Échap appartiennent au calque et au panneau : déplacer un
  // widget d'une cellule ne doit pas changer de page par la même occasion.
  if (insideEditor(event.target)) return
  const pages = session?.layout[current.orientation] ?? []
  const go = (index: number): void => {
    view = { kind: 'detail', orientation: current.orientation, index }
    render()
  }
  if (event.key === 'Escape') { view = { kind: 'overview' }; render() }
  if (event.key === 'ArrowRight' && current.index < pages.length - 1) go(current.index + 1)
  if (event.key === 'ArrowLeft' && current.index > 0) go(current.index - 1)
})

render()
