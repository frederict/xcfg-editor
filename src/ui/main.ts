import './style.css'
import './app.css'
// Effet de bord : enregistre les dessins de widgets dans l'annuaire de `render/`.
import '../render/widgets'
import { deviceFor, type Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import { getMember, readString } from '../core/access'
import { exportContainer, openContainer, type Container } from '../core/container'
import { gridFor } from '../model/grid'
import { createHistory, type EditHistory } from '../model/history'
import { readLayout, type Layout, type Page } from '../model/layout'
import { readRenderSettings, resolveLanguage, type RenderSettings } from '../model/preferences'
import type { Widget } from '../model/widget'
import { renderPage } from '../render/canvas'
import { buildDeviceSelector } from './deviceSelector'
import { createEditor, type Editor, type Viewport, type WidgetEdit } from './editor'
import { exportFileName } from './export'
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

/** Vrai si la frappe est destinée au calque ou au panneau : la vue n'y touche pas. */
function insideEditor(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.editor, .panel') !== null
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

/** Reconstruit le panneau depuis le rang sélectionné — jamais depuis un nœud retenu. */
function refreshPanel(): void {
  if (!panelHost || !session) return
  const page = currentPage()
  const widget = selection === undefined ? undefined : page?.widgets[selection]

  if (selectionLabel) {
    selectionLabel.textContent = widget === undefined
      ? 'Aucun widget sélectionné'
      : `${readableName(widget.shortName, session.language)} — rang ${(selection ?? 0) + 1} ` +
        `sur ${page?.widgets.length ?? 0}`
  }

  panelHost.textContent = ''
  if (widget === undefined) {
    panelHost.append(el(
      'p', 'panel__hint',
      'Cliquez un widget sur la page : ses réglages apparaissent ici, dans l’ordre où ' +
      'l’instrument les présente.'
    ))
    return
  }

  const module = propertiesModule
  if (module === undefined) {
    const host = panelHost
    host.append(el('p', 'panel__hint', 'Chargement des réglages…'))
    // `panelHost` a changé : la vue a été reconstruite entre-temps, et elle a rappelé
    // `refreshPanel` de son côté. Ce résultat-ci est périmé.
    void loadProperties().then(() => { if (panelHost === host) refreshPanel() })
    return
  }

  const form = module.buildPropertyForm(widget, session.language)
  panelHost.append(module.renderProperties({
    form,
    onChange: (field) => onPropertyChange(field, widget)
  }).element)
}

function buildEditing(current: Session, page: Page, orientation: Orientation): DetailEditing {
  const grid = gridFor(current.device, orientation)

  const editBar = el('div', 'editbar')
  selectionLabel = el('span', 'editbar__selection')
  editBar.append(
    el('span', 'editbar__badge', 'Édition'),
    selectionLabel,
    // La grille de l'appareil, dite explicitement : c'est elle qui explique pourquoi un
    // widget ne se pose pas exactement là où on l'a lâché.
    el('span', 'editbar__grid', `Grille ${grid.cols} × ${grid.rows}`),
    el(
      'span', 'editbar__hint',
      'Glisser : déplacer · équerres et segments : redimensionner · flèches : une cellule · ' +
      'Maj + flèches : redimensionner · Échap : désélectionner'
    )
  )

  const host = el('aside', 'panel')
  host.setAttribute('aria-label', 'Réglages du widget sélectionné')
  // Fin de glissé d'un curseur, sortie d'un champ : le pas en attente est clos ici
  // plutôt qu'au bout du délai.
  host.addEventListener('change', () => flushRecord())
  panelHost = host

  editor = createEditor({
    page,
    device: current.device,
    orientation,
    language: current.language,
    viewport: editorViewport,
    onEdit: onWidgetEdit,
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

  return { layer: editor.element, panel: host, bar: editBar }
}

function render(): void {
  // Le calque appartient à la vue qu'on efface : on le démonte explicitement, pour que
  // ses écoutes de fenêtre (`pointermove`, `pointerup`) partent avec lui.
  editor?.destroy()
  editor = undefined
  panelHost = undefined
  selectionLabel = undefined

  // La mise en page se relit à chaque dessin depuis le document courant. Après une
  // annulation, ce document est un arbre neuf : rien de ce qui a été lu avant lui ne
  // doit survivre à cette ligne.
  if (session !== undefined && session.container.parseError === undefined) {
    session.layout = readLayout(session.container.document)
  }

  content.textContent = ''
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
    content.append(el(
      'p', 'editnote',
      'Mode édition : ouvrez une page pour en déplacer les widgets et régler leurs options.'
    ))
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

let dragDepth = 0
window.addEventListener('dragenter', (event) => {
  event.preventDefault()
  dragDepth += 1
  document.body.classList.add('is-dragging')
})
window.addEventListener('dragover', (event) => { event.preventDefault() })
window.addEventListener('dragleave', (event) => {
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
  if (editMode) void loadProperties()
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
