import './style.css'
import './app.css'
// Effet de bord : enregistre les dessins de widgets dans l'annuaire de `render/`.
import '../render/widgets'
import { deviceFor, type Device } from '../catalog/devices'
import { getMember, readString } from '../core/access'
import { exportContainer, openContainer, type Container } from '../core/container'
import { readLayout, type Layout } from '../model/layout'
import { readRenderSettings, resolveLanguage, type RenderSettings } from '../model/preferences'
import { buildDeviceSelector } from './deviceSelector'
import { buildDetail, buildOverview, type Orientation, type ViewContext } from './views'

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
}

type View =
  | { kind: 'overview' }
  | { kind: 'detail'; orientation: Orientation; index: number }

let session: Session | undefined
let failure: string | undefined
let view: View = { kind: 'overview' }
let zoom = 1

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

const fileName = el('span', 'app-bar__file')

const bar = el('header', 'app-bar')
const brand = el('div', 'brand')
brand.append(
  el('span', 'brand__name', 'Configuration XCTrack'),
  el('span', 'brand__role', 'visionneuse')
)
const actions = el('div', 'app-bar__actions')
actions.append(fileName, openLabel, fileInput, exportButton)
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

function render(): void {
  content.textContent = ''
  exportButton.hidden = session === undefined
  tools.hidden = session === undefined || session.container.parseError !== undefined
  fileName.textContent = session?.container.fileName ?? ''

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
      content.append(buildDetail({
        page,
        index: view.index,
        pageCount: pages.length,
        orientation,
        ctx,
        zoom,
        onBack: () => { view = { kind: 'overview' }; render() },
        onGo: (index) => { view = { kind: 'detail', orientation, index }; render() },
        onZoom: (factor) => { zoom = factor }
      }))
      return
    }
    view = { kind: 'overview' }
  }

  const title = el('h1', 'sr-only', 'Pages de la configuration')
  content.append(
    title,
    metaStrip(session),
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
  failure = undefined
  session = undefined
  try {
    const container = await openContainer(new Uint8Array(await file.arrayBuffer()), file.name)
    const settings = readRenderSettings(container.document)
    const info = getMember(container.document, 'info')
    const declaredDevice = info ? readString(info, 'device') : undefined
    const device = deviceFor(declaredDevice)
    // C'est l'interface qui connaît le navigateur : `resolveLanguage` reçoit la langue
    // système en paramètre, le modèle ne la lit jamais lui-même.
    const systemLanguage = catalogLanguage(navigator.language)
    session = {
      container,
      layout: readLayout(container.document),
      settings,
      device,
      declaredDevice: deviceIsDeclared(declaredDevice, device) ? device.label : undefined,
      language: resolveLanguage(settings.language, systemLanguage),
      languageFromBrowser: settings.language.kind === 'system'
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
 * Réémission des octets, seule action offerte quand le fichier est illisible. Le nom
 * horodaté et distinct de l'original viendra avec la tâche 22 (`src/ui/export.ts`) :
 * ici, le fichier n'est jamais modifié, `exportContainer` rend sa source telle quelle.
 */
exportButton.addEventListener('click', () => {
  const current = session
  if (!current) return
  void (async () => {
    const bytes = await exportContainer(current.container)
    // Copie dans un ArrayBuffer simple : `Blob` n'accepte pas une vue dont le tampon
    // pourrait être partagé, et le conteneur ne garantit rien de son origine.
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
    const link = el('a')
    link.href = url
    link.download = current.container.fileName
    link.click()
    URL.revokeObjectURL(url)
  })()
})

/* ------------------------------------------------------------------------- clavier */

window.addEventListener('keydown', (event) => {
  const current = view
  if (current.kind !== 'detail') return
  // Les flèches appartiennent au curseur de zoom quand il a le focus.
  if (event.target instanceof HTMLInputElement) return
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
