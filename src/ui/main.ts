import './style.css'
import './app.css'
// Effet de bord : enregistre les dessins de widgets dans l'annuaire de `render/`.
import '../render/widgets'
import { deviceFor, type Device } from '../catalog/devices'
import { loadWidgetCatalog, type WidgetCatalog } from '../catalog/widgetCatalog'
import { readableName } from '../catalog/widgetNames'
import { getMember, readNumber, readString } from '../core/access'
import { exportContainer, openContainer, type Container } from '../core/container'
import type { JsonNode } from '../core/jsonDocument'
import { formatTechnicalDetail } from '../core/technicalDetail'
import { gridFor } from '../model/grid'
import { createHistory, type EditHistory } from '../model/history'
import { readLayout, type Layout, type Page } from '../model/layout'
import { insertWidget } from '../model/mutations'
import { readRenderSettings, resolveLanguage, type RenderSettings } from '../model/preferences'
import { readWidget, type Widget } from '../model/widget'
import { renderPage } from '../render/canvas'
import { buildDeviceSelector } from './deviceSelector'
import {
  createEditor, currentBounds,
  type Editor, type Viewport, type WidgetEdit, type WidgetStructureEdit
} from './editor'
import {
  applyPageOperation, operationAnnouncement, renderPageManager, type PageOperation
} from './pageManager'
import type { PropertyField, PropertyForm } from './properties'
import {
  aspectRatioOf, buildDetail, buildOverview, clampDockHeight, dockHeightCeiling,
  DOCK_HEIGHT_DEFAULT, DOCK_HEIGHT_MIN, readDockHeight, remarksSummary, revealOffset,
  splitWarnings, writeDockHeight,
  type DetailEditing, type DetailInspecting, type Orientation, type ViewContext,
  type VisibleBand
} from './views'
import { computeWarnings, REFERENCE_VERSION_CODE, warningsAt, type Warning } from './warnings'
import { renderWidgetList, type WidgetList } from './widgetList'
// Type seul : effacé à la compilation, il ne ramène pas la palette dans le morceau
// principal — même parti que `PropertyField` juste au-dessus.
import type { PaletteSources } from './widgetPalette'
/*
 * Les quatre modules assemblés ici ne sont **jamais** importés autrement que par
 * `import()` : chacun traîne son catalogue derrière lui — celui des préférences pèse
 * à lui seul une trentaine de kilo-octets transférés. Seuls leurs **types** entrent
 * ici, et un type disparaît à la compilation : le morceau principal ne grossit pas.
 */
import type { CurrentDocument, LibraryDialogHandle } from './libraryPanel'
import type { PreferenceEdit } from './preferencesPage'
import type { SharingResult, SharingSource } from './sharingDialog'
import type { VersionPanel } from './versionDiagnostic'
import type { CleanupEvent } from './cleanupPanel'
import type { Library } from '../library/library'
import { initialUiLanguage, loadTranslator, type Translator } from '../i18n'
import { plural } from './prose'
import type { PluralForms } from '../i18n'

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
  /**
   * `info.versionCode` et `info.versionName`, tels que le fichier les déclare. Ils ne
   * servent qu'à **dater** ce qu'on lui compare : le relevé des valeurs par défaut
   * (`catalog/widgetDefaults.ts`) a été fait sur une version donnée, et une divergence
   * doit se dire au lieu de se taire. Absents pour un fichier qui n'en porte pas.
   */
  versionCode: number | undefined
  versionName: string | undefined
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

/**
 * Les trois surfaces qui occupent le cadre, l'une après l'autre — jamais deux ensemble.
 *
 * `preferences` est une **vue** et non une modale : consulter 216 réglages répartis sur
 * 23 lignes de menu est une lecture longue, avec un filtre et des replis, et la page que
 * `preferencesPage.ts` construit se dessine sur 66 rem. Une boîte modale la contraindrait
 * pour rien — et il n'y a, dans cette vue, aucun rendu d'écran d'instrument à qui elle
 * prendrait de la largeur.
 *
 * Les quatre autres nouveautés sont des **modales** (partage, version, bibliothèque) parce
 * qu'elles se posent PAR-DESSUS ce qu'on regardait et qu'on y revient : c'est le principe
 * du projet — rien ne partage la largeur avec le rendu d'une page.
 */
type View =
  | { kind: 'overview' }
  | { kind: 'detail'; orientation: Orientation; index: number }
  | { kind: 'preferences' }

/**
 * Le traducteur de **notre prose**, dans la langue que le pilote a choisie — jamais celle
 * des libellés de XCTrack, qui suit le fichier ouvert (`session.language`). Voir
 * `src/i18n/axes.ts` : confondre les deux axes casserait la promesse de l'outil.
 *
 * `undefined` avant le premier rendu, et à ce moment-là seulement : le catalogue de la
 * langue est un morceau téléchargé à part, et l'amorçage en bas de ce fichier n'appelle
 * `render()` qu'une fois qu'il est arrivé. Les rendus suivants viennent tous d'un geste
 * du pilote, donc bien après.
 */
/** « 12 réglages » — la barre de tête le dit, et le bandeau le redit. */
const SETTING_COUNT: PluralForms = { one: '{count} réglage', other: '{count} réglages' }

let tr: Translator | undefined

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
 * Ce que la consultation tient de la vue courante : l'objet que `views.ts` relit pour
 * savoir quel widget est choisi, et de quoi remettre le relevé sous la page d'accord avec
 * lui. Les deux sont renouvelés à chaque `render()`, comme le calque en édition.
 */
let inspecting: DetailInspecting | undefined
let refreshReadout: (() => void) | undefined

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
 *
 * **Il s'ouvre replié**, et ne se déploie qu'à la première sélection — c'est-à-dire quand
 * il a quelque chose à montrer. Déployé d'emblée, il prenait 348 px à la page pour y
 * écrire « Aucun gadget sélectionné » : mesuré en fenêtre de 1500 × 950, cela laissait
 * 156 px de page visible sur 331 à 100 % de zoom, et 41 px sur une fenêtre de 1100 px.
 * Replié il n'en prend que 49, et la page entière tient à l'écran.
 *
 * Ce n'est **pas** la hauteur du bandeau qui change ici : celle-là est réglée à la
 * poignée, retenue d'une session à l'autre (`dockHeight`), et se retrouve intacte au
 * dépliage.
 */
let dockCollapsed = true

/**
 * La liste des widgets, montrée ou masquée. Même durée de vie que `dockCollapsed`, et pour
 * la même raison : le pilote qui l'a masquée pour donner toute la largeur aux réglages ne
 * doit pas la voir revenir au widget suivant.
 *
 * Elle est montrée par défaut. C'est elle, et elle seule, qui donne accès aux widgets
 * qu'aucun clic sur la page ne peut atteindre — six sur les 105 de la configuration de
 * référence : la masquer d'office reviendrait à les cacher.
 */
let listHidden = false

/**
 * La hauteur du corps du bandeau, en pixels, telle que le pilote l'a réglée à la poignée
 * — `undefined` tant qu'il n'y a pas touché, et c'est alors le défaut qui s'applique.
 * Relue au démarrage, réécrite à chaque geste : voir `views.ts` pour les bornes et pour
 * la validation de ce que `localStorage` rend.
 *
 * Les deux états ne sont pas la même chose et ne se confondent pas : intacte, la hauteur
 * n'est qu'un **plafond** que le corps n'atteint pas si les réglages sont courts ; réglée,
 * elle est une hauteur ferme, que le pilote a demandée et qui profite aussi à la liste
 * des widgets, laquelle a toujours de quoi la remplir.
 */
let dockHeight: number | undefined = readDockHeight(window.localStorage)

let dockElement: HTMLElement | undefined
let dockTitle: HTMLElement | undefined
let dockClass: HTMLElement | undefined
let dockCount: HTMLElement | undefined
let dockToggle: HTMLButtonElement | undefined
let dockBody: HTMLElement | undefined
let dockGrip: HTMLElement | undefined
let listToggle: HTMLButtonElement | undefined
let widgetList: WidgetList | undefined
let widgetListHost: HTMLElement | undefined

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

const exportButton = el('button', 'btn', 'Enregistrer une copie')
exportButton.type = 'button'
exportButton.hidden = true

/**
 * L'entrée en édition : un interrupteur, pas un autre écran. Le pilote garde sa page
 * sous les yeux, son zoom, son gabarit ; seules les zones de survol cèdent la place au
 * calque. Ressortir est aussi immédiat, et ne défait rien.
 *
 * Les deux intitulés ne sont volontairement pas symétriques. Hors édition, le bouton est
 * le seul endroit où un pilote apprend que l'outil modifie : il le dit en entier
 * — « Modifier les pages ». En édition, il n'a plus rien à apprendre à personne et la
 * barre est à son plus plein : « Consulter » suffit, et rend 90 px à la page.
 */
const editToggle = el('button', 'btn', 'Modifier les pages')
editToggle.type = 'button'
editToggle.hidden = true
editToggle.setAttribute('aria-pressed', 'false')

/**
 * Annuler et rétablir : deux flèches encadrées, et non deux mots gris.
 *
 * Ce sont les commandes les plus fréquentes de toute l'édition — celles vers lesquelles
 * la main part sans réfléchir dès qu'un geste rate. Elles restent donc dans la barre,
 * quel que soit l'encombrement. En texte grisé sans cadre, l'œil les prenait pour une
 * légende ; en flèches encadrées, elles se lisent comme des boutons et tiennent en
 * 30 px de côté, au-dessus des 24 px de cible minimale.
 *
 * Le dessin est un `<svg>` plutôt qu'un caractère : `↶` et `↷` manquent à certaines
 * polices Android, et un carré vide dans la barre de tête serait pire que le mot qu'il
 * remplace. Le nom accessible, lui, reste une phrase entière — « Annuler : Déplacer
 * Altitude GPS » —, posée par `syncEditControls`.
 */
function historyGlyph(direction: 'undo' | 'redo'): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('btn__glyph')
  const path = document.createElementNS(ns, 'path')
  // Une flèche qui revient en arrière (annuler) ou repart en avant (rétablir) : même
  // dessin, retourné. Deux formes en miroir ne se confondent pas, là où deux flèches
  // droites ne différant que par une barre se confondent (constat de l'audit sur la
  // barre flottante).
  path.setAttribute('d', direction === 'undo'
    ? 'M8 7H14a5 5 0 0 1 0 10H9M8 7l3.5-3.5M8 7l3.5 3.5'
    : 'M16 7H10a5 5 0 0 0 0 10h5M16 7l-3.5-3.5M16 7l-3.5 3.5')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  svg.append(path)
  return svg
}

const undoButton = el('button', 'btn btn--icon')
undoButton.type = 'button'
undoButton.hidden = true
undoButton.append(historyGlyph('undo'))

const redoButton = el('button', 'btn btn--icon')
redoButton.type = 'button'
redoButton.hidden = true
redoButton.append(historyGlyph('redo'))

const fileName = el('span', 'app-bar__file')

/**
 * Les réglages généraux, **en clair dans la barre** — et non dans le menu.
 *
 * Ils y ont été rangés un temps, au critère de la fréquence d'usage : un écran qu'on ne
 * consulte qu'une fois par session. Ce critère est tombé le jour où ces réglages sont
 * devenus **modifiables** — on n'ouvre pas une fois par session l'écran où l'on règle
 * ses unités, son vario sonore et ses touches. Deux gestes depuis n'importe où (le
 * bouton, puis la page), contre trois par le menu.
 *
 * **Un dessin et un mot.** Le mot seul (« Réglages ») coûtait 96 px à une barre qui
 * repliait déjà à 900 px ; le dessin seul est une roue dentée de plus dans un monde qui
 * en est plein, et rien ne dirait *quels* réglages. Le couple tient en 118 px et se lit
 * sans infobulle. Le dessin est `aria-hidden` : c'est le mot qui nomme le bouton, doublé
 * d'un `title` qui dit ce qu'on y trouve.
 */
function gearGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('btn__glyph')
  const gear = document.createElementNS(ns, 'path')
  // Une couronne à huit dents et son moyeu : la roue dentée reste lisible à 18 px, là où
  // un curseur à trois glissières se réduit à trois traits gris.
  gear.setAttribute('d',
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z' +
    'M19.4 13.9a7.6 7.6 0 0 0 0-3.8l2-1.2-2-3.4-2.2.9a7.6 7.6 0 0 0-3.3-1.9L13.5 2h-3l-.4 2.5' +
    'a7.6 7.6 0 0 0-3.3 1.9l-2.2-.9-2 3.4 2 1.2a7.6 7.6 0 0 0 0 3.8l-2 1.2 2 3.4 2.2-.9' +
    'a7.6 7.6 0 0 0 3.3 1.9l.4 2.5h3l.4-2.5a7.6 7.6 0 0 0 3.3-1.9l2.2.9 2-3.4-2-1.2Z')
  gear.setAttribute('fill', 'none')
  gear.setAttribute('stroke', 'currentColor')
  gear.setAttribute('stroke-width', '1.7')
  gear.setAttribute('stroke-linejoin', 'round')
  svg.append(gear)
  return svg
}

const preferencesButton = el('button', 'btn app-bar__prefs')
preferencesButton.type = 'button'
preferencesButton.hidden = true
preferencesButton.title =
  'Réglages généraux — tout ce qui se règle hors des pages de gadgets : unités, touches, ' +
  'capteurs, son, espaces aériens.'
preferencesButton.append(gearGlyph(), el('span', 'app-bar__prefs-name', 'Réglages'))
preferencesButton.addEventListener('click', () => { openPreferences() })

/* ------------------------------------------------- menu des commandes secondaires */

/**
 * Un menu déroulant, et le seul de l'application.
 *
 * **Ce qui reste dans la barre, et pourquoi.** Le critère est la fréquence d'usage,
 * doublée d'une exception pour ce qui dit l'état du document :
 *
 * - « Modifier les pages » / « Consulter » — le geste qui fait de l'outil un éditeur ;
 *   le cacher recréerait le défaut que l'accueil vient de corriger ;
 * - « Annuler » / « Rétablir » — plusieurs fois par minute en édition ;
 * - « Enregistrer une copie » / « Enregistrer les modifications » — l'action principale,
 *   et le **seul signal visible** qu'un travail est en cours : son intitulé change quand
 *   le document est modifié. Rien de tout cela ne peut vivre derrière un menu ;
 * - le nom du fichier, qui dit sur quoi l'on travaille ;
 * - « Réglages » — voir `preferencesButton` : il a été dans ce menu, il n'y est plus.
 *   Un écran qu'on **modifie** ne se range pas parmi ce qui sert une fois par session.
 *
 * **Ce qui se range.** Trois commandes qui servent au plus une fois par session : ouvrir
 * un fichier, la bibliothèque, le diagnostic de version. La dernière n'était jusqu'ici
 * atteignable que depuis la vue d'ensemble — il fallait quatre gestes pour aller la lire
 * depuis une page ouverte, et le retour ne ramenait pas d'où l'on venait. Dans le menu,
 * elle est à deux gestes depuis n'importe quel écran.
 *
 * **Clavier.** Le bouton ouvre et ferme ; les flèches parcourent les entrées avec un
 * `tabindex` glissant, `Début` et `Fin` vont aux extrémités, `Échap` referme et rend le
 * focus au bouton. Le focus n'est pas piégé : sortir du menu à la tabulation le referme
 * et laisse la tabulation continuer son chemin, comme si le menu n'existait pas.
 */
interface Menu {
  root: HTMLElement
  button: HTMLButtonElement
  /** Ajoute une entrée et rend son bouton — l'appelant en règle `hidden` et `disabled`. */
  add: (label: string, title: string, run: () => void) => HTMLButtonElement
  close: () => void
}

function buildMenu(label: string): Menu {
  const root = el('div', 'menu')
  const button = el('button', 'btn menu__button')
  button.type = 'button'
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  button.append(el('span', undefined, label), el('span', 'menu__chevron'))

  const list = el('div', 'menu__list')
  list.setAttribute('role', 'menu')
  list.setAttribute('aria-label', label)
  list.hidden = true
  root.append(button, list)

  /** Les entrées réellement utilisables : une entrée éteinte ne prend pas le focus. */
  const usable = (): HTMLButtonElement[] =>
    [...list.querySelectorAll('button')].filter((item) => !item.hidden && !item.disabled)

  const focusAt = (position: number): void => {
    const items = usable()
    if (items.length === 0) return
    const wrapped = ((position % items.length) + items.length) % items.length
    for (const [rank, item] of items.entries()) item.tabIndex = rank === wrapped ? 0 : -1
    items[wrapped]?.focus()
  }

  const close = (restoreFocus = false): void => {
    if (list.hidden) return
    list.hidden = true
    button.setAttribute('aria-expanded', 'false')
    if (restoreFocus) button.focus()
  }

  const open = (): void => {
    if (!list.hidden) return
    list.hidden = false
    button.setAttribute('aria-expanded', 'true')
    focusAt(0)
  }

  button.addEventListener('click', () => { if (list.hidden) open(); else close(true) })

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (list.hidden) return
      event.preventDefault()
      close(true)
      return
    }
    if (list.hidden) return
    const items = usable()
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown') { event.preventDefault(); focusAt(at + 1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusAt(at - 1) }
    else if (event.key === 'Home') { event.preventDefault(); focusAt(0) }
    else if (event.key === 'End') { event.preventDefault(); focusAt(items.length - 1) }
  })

  // Sortir du menu referme le menu — à la tabulation comme au clic ailleurs. Le focus
  // n'est jamais retenu : c'est la différence entre un menu et un piège.
  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (next instanceof Node && root.contains(next)) return
    close()
  })
  document.addEventListener('pointerdown', (event) => {
    const target = event.target
    if (target instanceof Node && root.contains(target)) return
    close()
  })

  return {
    root,
    button,
    close: () => close(),
    add: (itemLabel, itemTitle, run) => {
      const item = el('button', 'menu__item', itemLabel)
      item.type = 'button'
      item.setAttribute('role', 'menuitem')
      item.title = itemTitle
      item.tabIndex = -1
      item.addEventListener('click', () => { close(true); run() })
      list.append(item)
      return item
    }
  }
}

const menu = buildMenu('Fichier')

/**
 * Ouvrir un fichier : un bouton du menu, et non plus l'étiquette du champ de fichier.
 * Le champ, lui, reste dans la barre en `sr-only` — c'est la seule façon d'ouvrir un
 * fichier à la tabulation sans passer par le menu, et l'étiquette de la zone de dépôt de
 * l'accueil continue de le désigner.
 */
const openItem = menu.add(
  'Ouvrir un fichier…',
  'Choisir un .xcfg ou un .xczfg exporté depuis l’instrument. Le fichier reste sur ' +
  'cette machine.',
  () => fileInput.click()
)

/**
 * La bibliothèque, **jamais éteinte** : c'est la seule commande qui a un sens sans
 * fichier ouvert — on y vient précisément pour reprendre une configuration rangée. La
 * mettre derrière l'ouverture d'un fichier en ferait un trésor enfermé dans son propre
 * coffre.
 */
const libraryButton = menu.add(
  'Bibliothèque…',
  'Ranger la configuration ouverte sous un nom, et retrouver celles déjà rangées. ' +
  'Tout reste dans ce navigateur : aucun serveur, aucun compte.',
  () => { void openLibrary() }
)

const versionItem = menu.add(
  'Version et compatibilité…',
  'Choisir la version de XCTrack visée, et voir ce que ce fichier porte qu’elle ne ' +
  'connaît pas — ou l’inverse.',
  () => openVersionDialog()
)

/*
 * Le manuel. Volontairement **jamais désactivé** — comme la bibliothèque, c'est une
 * commande qui garde son sens sans fichier ouvert, et c'est même là qu'elle sert le
 * plus : un pilote qui découvre l'outil n'a rien à ouvrir, il a besoin qu'on lui dise
 * quoi faire. Il ne figure donc pas dans `syncEditControls`.
 */
menu.add(
  'Manuel d’utilisation…',
  'Comment sortir le fichier de l’instrument, préparer ses pages, et ce qu’il ne faut ' +
  'jamais partager.',
  () => openManual()
)

const bar = el('header', 'app-bar')
const brand = el('div', 'brand')
/**
 * Le badge de mode. Il ne dit qu'**une** chose, et seulement quand elle est vraie :
 * « édition ». Un badge présent en permanence devient du décor, et celui qui annonçait
 * « visionneuse » au repos décrivait l'outil au lieu de décrire l'état — un pilote venu
 * préparer ses écrans y lisait que l'outil ne les modifiait pas.
 */
const brandRole = el('span', 'brand__role', 'édition')
brandRole.hidden = true
brand.append(el('span', 'brand__name', 'Configuration XCTrack'), brandRole)
const actions = el('div', 'app-bar__actions')
actions.append(
  fileName, undoButton, redoButton, preferencesButton, editToggle, menu.root, fileInput,
  exportButton
)
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
    el('h1', 'landing__title', 'Préparez vos pages XCTrack avant de voler'),
    el(
      'p', 'landing__lead',
      'Ouvrez un fichier .xcfg ou .xczfg exporté depuis l’instrument : ses pages ' +
      's’affichent telles que l’appareil les dessine, à leur taille réelle. Déplacez un ' +
      'gadget, redimensionnez-le, ajoutez-en, puis récupérez une copie neuve à remettre ' +
      'sur la carte SD.'
    ),
    // Les deux garanties qui décident un pilote à confier sa configuration de vol à un
    // site web. Elles étaient jusqu'ici portées par le mot « visionneuse », qui les liait
    // à une promesse fausse : elles valent aussi quand on modifie, puisqu'on ne réécrit
    // que ce qu'on a changé.
    el(
      'p', 'landing__lead',
      'Votre fichier ne quitte pas cette machine : tout se passe dans ce navigateur, ' +
      'sans serveur et sans compte. Et ce que vous n’avez pas touché ressort exactement ' +
      'comme il est entré, sans une virgule réécrite — vos réglages resteront les vôtres.'
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
    ['Modifier', 'Déplacez un gadget au doigt ou à la souris, changez sa taille, ajoutez-en d’autres : la page se redessine à sa taille réelle sous vos yeux.'],
    ['À savoir', 'XCTrack masque certaines pages hors contexte de vol : le fichier en décrit plus que l’appareil n’en montre.']
  ]
  for (const [title, detail] of items) {
    const step = el('li', 'landing__step')
    step.append(el('span', 'landing__step-title', title), el('span', 'landing__step-text', detail))
    steps.append(step)
  }
  panel.append(steps)

  // Sans cette phrase, un pilote revenu le lendemain ne voit qu'une invitation à ouvrir un
  // fichier et ne devine pas que ses configurations rangées l'attendent dans la barre.
  panel.append(el(
    'p', 'landing__note',
    'Déjà venu ? Les configurations que vous avez rangées sont dans le menu « Fichier », ' +
    'en haut à droite, sous « Bibliothèque » : elles ne sont jamais parties de ce ' +
    'navigateur.'
  ))
  // Un second chemin vers le manuel, ici et pas seulement dans le menu : celui qui
  // découvre l'outil n'a rien à ouvrir, et il ne pense pas à chercher de l'aide dans un
  // menu appelé « Fichier ».
  const help = el('button', 'btn btn--ghost', 'Lire le manuel d’utilisation')
  help.type = 'button'
  help.addEventListener('click', () => openManual())
  panel.append(help)
  return panel
}

function problem(
  title: string, message: string, hint?: string, detail?: string
): HTMLElement {
  const panel = el('section', 'problem')
  panel.append(el('h2', 'problem__title', title), el('p', 'problem__message', message))
  if (hint !== undefined) panel.append(el('p', 'problem__hint', hint))
  if (detail !== undefined) panel.append(technicalDetail(detail))
  return panel
}

/**
 * Le détail technique d'une panne, **replié**.
 *
 * Le pilote lisait « Ce fichier n'a pas pu être analysé : Error: données résiduelles à
 * 6 ». Le mot `Error:` vient du moteur JavaScript ; il n'est ni traduit ni traduisible,
 * et il arrive au moment précis où le pilote vient de confier son fichier à cet outil.
 *
 * Le détail ne disparaît pas pour autant : c'est ce qu'on recopie pour signaler un
 * problème, et sans lui le rapport de panne ne vaut rien. Il passe en second rang,
 * derrière un triangle qu'on ouvre — l'explication d'abord, la mécanique ensuite.
 */
function technicalDetail(detail: string): HTMLElement {
  const box = el('details', 'problem__detail')
  box.append(el('summary', 'problem__detailSummary', 'Détail technique'))
  box.append(el('p', 'problem__detailText', detail))
  return box
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

  /*
   * Les deux lectures qui prolongeaient ce bandeau — réglages généraux, diagnostic de
   * version — sont passées dans le menu « Fichier » de la barre de tête. Elles n'étaient
   * ici atteignables que depuis la vue d'ensemble : depuis une page ouverte, il fallait
   * revenir en arrière, lire, fermer, puis rouvrir sa page. Une commande qui ne sert
   * qu'une fois par session mérite un menu ; elle ne mérite pas d'être introuvable la
   * moitié du temps.
   */
  return strip
}

/** Familles qui décrivent un défaut, et non un simple fait sur le fichier. */
const ATTENTION_KINDS = ['structure', 'geometry', 'personal-data']

/**
 * Un avertissement : ce qu'il dit, pourquoi, et le détail énumérable replié au-delà de
 * quatre éléments — une liste de trente widgets noierait les six autres avertissements.
 */
function warningCard(warning: Warning, level: 'h3' | 'h4' = 'h3'): HTMLElement {
  const card = el('article', 'warning')
  if (ATTENTION_KINDS.includes(warning.kind)) card.classList.add('warning--attention')
  card.append(
    el(level, 'warning__title', warning.title),
    el('p', 'warning__detail', warning.detail)
  )

  if (warning.items.length > 0) {
    const list = el('ul', 'warning__items')
    for (const item of warning.items) list.append(el('li', 'warning__item', item))

    if (warning.items.length > 4) {
      const box = el('details', 'warning__more')
      // « éléments » ne nommait rien : selon l'avertissement, ce sont des pages, des
      // gadgets, des fichiers ou des lignes du fichier. Le titre de la carte, juste
      // au-dessus, dit déjà de quoi il s'agit ; il ne manquait que le nombre.
      box.append(el('summary', 'warning__summary', `Voir le détail (${warning.items.length})`), list)
      card.append(box)
    } else {
      card.append(list)
    }
  }
  return card
}

/**
 * Ce qui décrit un **défaut**, déplié au-dessus des pages : un widget dégénéré, une clé
 * dupliquée, une géométrie hors bornes. Ces familles-là méritent le premier écran, et
 * elles sont rares — aucun des fichiers du corpus n'en porte.
 */
function attentionPanel(warnings: Warning[]): HTMLElement | undefined {
  if (warnings.length === 0) return undefined
  const panel = el('section', 'warnings')
  panel.append(el('h2', 'warnings__title', 'À vérifier dans ce fichier'))
  for (const warning of warnings) panel.append(warningCard(warning))
  return panel
}

/**
 * Ce qui **renseigne** sans rien réclamer — type d'export, valeurs de rendu supposées,
 * langue des libellés, boutons recouverts volontairement —, replié en une ligne.
 *
 * Pourquoi replier plutôt que supprimer : chacune de ces phrases est vraie et rien
 * d'autre ne la dit. Pourquoi replier plutôt que laisser ouvert : dépliés, ces quatre
 * encadrés d'égal poids visuel repoussaient la première vignette à 1 064 px du haut sur
 * un écran de 1 500 × 950, et à 1 153 px sur une tablette — un écran et demi de prose
 * avant la moindre page. Le pilote a ouvert son fichier pour voir ses pages.
 *
 * Les intitulés restent lisibles sur la ligne repliée, tronqués par la feuille de style :
 * on sait de quoi il retourne sans ouvrir, et la ligne se souvient d'être ouverte tant
 * que la vue n'est pas reconstruite.
 */
function remarksPanel(warnings: Warning[]): HTMLElement | undefined {
  if (warnings.length === 0) return undefined
  const panel = el('section', 'warnings warnings--remarks')
  const box = el('details', 'remarks')
  const summary = el('summary', 'remarks__summary')
  // Un `<summary>` n'admet qu'un seul élément de titre, ou du contenu de phrasé : le
  // titre porte donc les deux fragments, et non le résumé lui-même. Le titre est ce qui
  // rend la ligne atteignable par la navigation par titres d'un lecteur d'écran.
  const head = el('h2', 'remarks__head')
  head.append(
    el('span', 'remarks__count', remarksSummary(warnings.length)),
    el('span', 'remarks__titles', warnings.map((warning) => warning.title).join(' · '))
  )
  summary.append(head)
  box.append(summary)
  for (const warning of warnings) box.append(warningCard(warning))
  panel.append(box)
  return panel
}

/**
 * Les mêmes avertissements, préparés pour la boîte d'export partageable — c'est son
 * paramètre `notice`, un emplacement que `sharingDialog.ts` réserve exprès et ne remplit
 * jamais lui-même : « les avertissements ont leur propre chaîne, et la dupliquer les
 * ferait diverger ». On ne refabrique donc rien, on donne ce que `warnings.ts` calcule.
 *
 * Seuls les niveaux de titre changent : la boîte porte déjà un `h2`, les avertissements
 * y descendent d'un cran pour que la structure du document reste juste.
 */
function warningNotice(warnings: Warning[]): HTMLElement | undefined {
  if (warnings.length === 0) return undefined
  const notice = el('section', 'warnings warnings--notice')
  notice.append(el('h3', 'warnings__title', 'Ce que ce fichier révèle de vous'))
  for (const warning of warnings) notice.append(warningCard(warning, 'h4'))
  return notice
}

/* ------------------------------------------------------------------- mode édition */

/** La page affichée, relue dans la mise en page courante — jamais mémorisée. */
function currentPage(): Page | undefined {
  if (!session || view.kind !== 'detail') return undefined
  return session.layout[view.orientation][view.index]
}

/**
 * Une vue mémorisée désigne-t-elle encore quelque chose ? Un rang de page retenu avant
 * un détour peut être devenu hors bornes — page supprimée, fichier rouvert.
 */
function viewExists(candidate: View): boolean {
  if (candidate.kind !== 'detail') return true
  return session?.layout[candidate.orientation][candidate.index] !== undefined
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
  // Un seul mode pour deux surfaces. Les réglages généraux ont longtemps été une
  // consultation et rien d'autre ; depuis qu'ils se modifient, ils obéissent au même
  // interrupteur que les pages — sans quoi la consultation cesserait d'être une
  // consultation quelque part, ce que ce projet promet le contraire. Seul l'intitulé du
  // bouton suit l'écran : « Modifier les pages » ne désignerait rien ici.
  const editable = session !== undefined && session.container.parseError === undefined
  const onPreferences = view.kind === 'preferences'
  const history = session?.history

  brandRole.hidden = !editMode || !editable
  editToggle.hidden = !editable
  editToggle.textContent = editMode
    ? 'Consulter'
    : (onPreferences ? 'Modifier les réglages' : 'Modifier les pages')
  editToggle.title = editMode
    ? 'Consulter — quitter le mode édition. Rien n’est défait.'
    : (onPreferences
      ? 'Modifier les réglages — changer les valeurs des réglages généraux.'
      : 'Modifier les pages — déplacer, redimensionner et ajouter des gadgets.')
  editToggle.setAttribute('aria-pressed', String(editMode))

  undoButton.hidden = !editMode || !editable
  redoButton.hidden = !editMode || !editable
  undoButton.disabled = history?.canUndo() !== true
  redoButton.disabled = history?.canRedo() !== true
  const undoLabel = history?.undoDescription()
  const redoLabel = history?.redoDescription()
  // Le bouton ne porte qu'une flèche : la phrase entière est son nom accessible, et non
  // une simple infobulle — un lecteur d'écran annoncerait sinon « bouton », rien de plus.
  const undoName = undoLabel === undefined ? 'Rien à annuler' : `Annuler : ${undoLabel}`
  const redoName = redoLabel === undefined ? 'Rien à rétablir' : `Rétablir : ${redoLabel}`
  undoButton.title = undoName
  redoButton.title = redoName
  undoButton.setAttribute('aria-label', undoName)
  redoButton.setAttribute('aria-label', redoName)

  // Les deux lectures du menu ne parlent que d'un fichier ouvert. Éteintes sans fichier,
  // elles disent qu'elles existent sans mentir sur ce qu'elles feraient — les cacher
  // ferait croire que le menu change de contenu d'un écran à l'autre.
  const readable = session !== undefined && session.container.parseError === undefined
  versionItem.disabled = !readable

  // Les réglages généraux ont leur bouton dans la barre. Il ne se cache pas quand il n'y
  // a rien à lire — un bouton qui apparaît et disparaît fait douter du chemin — mais il
  // s'éteint, et il s'éteint aussi quand on y est déjà : appuyer sur le bouton de l'écran
  // où l'on se trouve ne mène nulle part.
  preferencesButton.hidden = session === undefined
  preferencesButton.disabled = !readable || onPreferences
  preferencesButton.setAttribute('aria-current', onPreferences ? 'page' : 'false')

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
    count.textContent = plural({ one: '{count} gadget', other: '{count} gadgets' }, total)
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
 *
 * **Au clavier seulement, le gadget est ramené sous les yeux du pilote.** Une flèche
 * déplace d'une cellule sans changer la sélection : après quelques appuis vers le bas, le
 * gadget passe sous le bandeau de réglages et le pilote ne voit plus ce qu'il fait — ce
 * qui est pourtant tout l'objet du geste. Un glissé n'a pas ce défaut : le doigt est
 * posé sur le gadget, donc dans la bande visible par construction, et faire bouger la
 * page sous un pointeur qui vient de lâcher serait une agression. `revealWidget` ne
 * défile d'ailleurs que si le gadget est réellement sorti de la bande.
 */
function onWidgetEdit(edit: WidgetEdit): void {
  if (!session) return
  session.container.modified = true
  if (keyboardGesture) {
    recordSoon(`geste:${edit.widgetIndex}:${edit.description}`, edit.description)
    revealWidget(edit.widgetIndex)
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
  // Les rangs ont bougé : numéros, vignettes et calcul des inatteignables sont tous à
  // refaire — un changement d'empilement peut à lui seul dégager un widget muré.
  refreshWidgetList()
  refreshPanel()
  syncEditControls()
}

/** Une option modifiée dans le panneau. `properties.ts` a déjà écrit la valeur. */
/**
 * Le compte affiché dans la barre de tête du bandeau.
 *
 * Extrait parce qu'il est calculé à deux moments : à la construction du panneau, et après
 * une écriture qui fait apparaître une ligne. Le laisser en place aurait suffi tant que le
 * nombre de réglages ne bougeait pas ; il bouge depuis que le panneau sait écrire une
 * valeur d'usine jusque-là absente.
 */
function updateDockCount(form: PropertyForm, editMode: boolean): void {
  if (!dockCount) return
  const total = form.fields.length
  dockCount.textContent = editMode || !form.defaultsKnown
    ? plural(SETTING_COUNT, total)
    // En consultation, le compte qui compte n'est pas le nombre de lignes : c'est ce que
    // le pilote a effectivement changé. Il est dit dès la barre de tête, qui survit au
    // repli du bandeau.
    : `${plural(SETTING_COUNT, total)} · ` +
      `${plural({
        one: '{count} personnalisé',
        other: '{count} personnalisés'
      }, form.customizedCount)}`
}

function onPropertyChange(field: PropertyField, widget: Widget, fresh?: PropertyForm): void {
  if (!session) return
  session.container.modified = true
  if (fresh) updateDockCount(fresh, true)
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
  // La page des réglages est reconstruite en entier — elle lit un arbre qui vient d'être
  // remplacé. On note où le pilote regardait pour l'y ramener.
  if (view.kind === 'preferences') preferencesScroll = window.scrollY
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
 * Le catalogue des familles, chargé à la demande comme la palette elle-même : c'est lui
 * qui donne les dix familles, l'ordre de l'écran de XCTrack et le badge Pro. Un morceau
 * par langue (`catalog/widgetCatalog.ts`), et un seul est téléchargé.
 *
 * On mémorise ici **par langue demandée**, et non par langue résolue : c'est cette
 * langue-là que `fillPaletteDialog` a sous la main pour savoir si le catalogue qu'il
 * faut est déjà arrivé. `loadWidgetCatalog` mémorise de son côté, un deuxième appel ne
 * retéléchargera rien.
 */
const paletteCatalogs = new Map<string, WidgetCatalog>()

function loadPaletteCatalog(language: string): Promise<WidgetCatalog> {
  return loadWidgetCatalog(language).then((catalog) => {
    paletteCatalogs.set(language, catalog)
    return catalog
  })
}

/**
 * Les widgets que la palette dépouille, séparés selon ce qu'elle en tire : ceux de la
 * page affichée — qui allument l'indicateur « déjà ici » et servent de modèles
 * préférés —, puis ceux du reste du fichier.
 *
 * Dupliquer une boussole, c'est donc dupliquer celle qu'on a sous les yeux plutôt qu'une
 * homonyme réglée autrement à l'autre bout du fichier ; et si le type n'est nulle part
 * sur cette page, la ligne dit « ailleurs » au lieu de laisser croire à une copie locale.
 */
function paletteSources(current: Session, page: Page | undefined): PaletteSources {
  const onPage: JsonNode[] = []
  const elsewhere: JsonNode[] = []
  if (page) for (const widget of page.widgets) onPage.push(widget.node)
  for (const orientation of ['landscape', 'portrait'] as const) {
    for (const other of current.layout[orientation]) {
      if (other === page) continue
      for (const widget of other.widgets) elsewhere.push(widget.node)
    }
  }
  return { onPage, elsewhere }
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
  // Un rang de plus, posé au premier plan : il recouvre peut-être quelqu'un.
  refreshWidgetList()
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
      'Cette page n’a pas d’emplacement pour des gadgets. Cet outil ne peut pas en ' +
      'créer un : il n’invente rien que le fichier ne porte déjà.'
    ))
    dialog.append(box)
    return
  }

  const module = paletteModule
  const catalog = paletteCatalogs.get(session.language)
  if (module === undefined || catalog === undefined) {
    // « palette » ne nomme rien que le pilote ait vu : le bouton qui ouvre cette boîte
    // s'appelle « Ajouter un gadget ».
    box.append(el('p', 'hint-note', 'Chargement…'))
    dialog.append(box)
    // La boîte a pu être fermée ou refaite entre-temps : ce résultat-ci serait périmé.
    void Promise.all([loadPalette(), loadPaletteCatalog(session.language)])
      .then(() => { if (paletteDialog === dialog) fillPaletteDialog(dialog) })
    return
  }

  const palette = module.renderWidgetPalette({
    sources: paletteSources(session, page),
    catalog,
    device: session.device,
    orientation: view.orientation,
    settings: session.settings,
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

/* --------------------------------------------------- hauteur du bandeau */

/** Un cran de flèche, et le cran large de `Page↑`/`Page↓` — trois lignes de réglage. */
const DOCK_STEP_PX = 16
const DOCK_PAGE_STEP_PX = 128

/**
 * La hauteur qu'a le corps **à l'écran**, et non celle qui est demandée : les deux
 * diffèrent tant que le pilote n'a pas touché la poignée, la hauteur n'étant alors qu'un
 * plafond que des réglages courts n'atteignent pas. C'est de cette hauteur-là que part
 * tout geste — sans quoi la poignée sauterait au premier pixel, d'un corps de 150 px au
 * plafond de 288.
 */
function measuredDockHeight(): number {
  const measured = dockBody?.getBoundingClientRect().height
  if (measured === undefined || measured <= 0) return DOCK_HEIGHT_DEFAULT
  return Math.round(measured)
}

/**
 * Pose la hauteur sur le bandeau et remet la poignée d'accord avec elle. Le plafond se
 * recalcule ici, à chaque application : il dépend de la fenêtre, qui change de taille
 * sans prévenir. La valeur demandée par le pilote, elle, n'est jamais rabotée dans
 * `dockHeight` — resserrée pour l'affichage sur une fenêtre basse, elle se retrouve
 * entière quand la fenêtre grandit à nouveau.
 */
function applyDockHeight(): void {
  if (!dockElement) return
  const ceiling = dockHeightCeiling(window.innerHeight)
  const height = dockHeight === undefined
    ? Math.min(DOCK_HEIGHT_DEFAULT, ceiling)
    : clampDockHeight(dockHeight, window.innerHeight)
  dockElement.style.setProperty('--dock-body-height', `${height}px`)
  dockElement.classList.toggle('dock--sized', dockHeight !== undefined)
  if (dockGrip) {
    dockGrip.setAttribute('aria-valuemin', String(DOCK_HEIGHT_MIN))
    dockGrip.setAttribute('aria-valuemax', String(ceiling))
    dockGrip.setAttribute('aria-valuenow', String(height))
    dockGrip.setAttribute('aria-valuetext', `${height} pixels`)
  }
}

function setDockHeight(height: number): void {
  dockHeight = clampDockHeight(height, window.innerHeight)
  applyDockHeight()
}

/** Écrit en fin de geste, jamais à chaque pixel : `localStorage` est un accès disque. */
function saveDockHeight(): void {
  if (dockHeight !== undefined) writeDockHeight(window.localStorage, dockHeight)
}

/**
 * La poignée de redimensionnement, sur le bord supérieur du bandeau. Glisser vers le haut
 * agrandit — le bandeau pousse vers le haut, il est collé en bas.
 *
 * `role="separator"` avec un `tabindex` : c'est la séparation déplaçable entre la page et
 * les réglages, et ARIA la veut alors dans l'ordre de tabulation, munie de ses trois
 * valeurs. Le maximum annoncé est celui de la fenêtre courante, pas la borne absolue :
 * annoncer un maximum qu'on refuserait serait mentir au lecteur d'écran.
 */
function buildDockGrip(): HTMLElement {
  const grip = el('div', 'dock__grip')
  grip.tabIndex = 0
  grip.setAttribute('role', 'separator')
  grip.setAttribute('aria-orientation', 'horizontal')
  grip.setAttribute('aria-label', 'Hauteur du bandeau de réglages')
  grip.title =
    'Glissez pour changer la hauteur du bandeau — au clavier, flèches haut et bas, ' +
    'Page↑ et Page↓ par crans larges, Origine et Fin aux extrêmes.'

  grip.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const startHeight = measuredDockHeight()
    const startY = event.clientY
    // La capture fait suivre le pointeur hors de la poignée : un geste ample ne se perd
    // pas dès que le curseur passe sur la page, qui est juste au-dessus.
    grip.setPointerCapture(event.pointerId)
    dockElement?.classList.add('dock--resizing')
    const move = (moved: PointerEvent): void => {
      setDockHeight(startHeight + (startY - moved.clientY))
    }
    const stop = (): void => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', stop)
      grip.removeEventListener('pointercancel', stop)
      dockElement?.classList.remove('dock--resizing')
      saveDockHeight()
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', stop)
    grip.addEventListener('pointercancel', stop)
    // Sans quoi le glissé sélectionne le texte des réglages au passage.
    event.preventDefault()
  })

  grip.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const from = measuredDockHeight()
    let target: number
    switch (event.key) {
      case 'ArrowUp': target = from + DOCK_STEP_PX; break
      case 'ArrowDown': target = from - DOCK_STEP_PX; break
      case 'PageUp': target = from + DOCK_PAGE_STEP_PX; break
      case 'PageDown': target = from - DOCK_PAGE_STEP_PX; break
      case 'Home': target = DOCK_HEIGHT_MIN; break
      case 'End': target = dockHeightCeiling(window.innerHeight); break
      default: return
    }
    // Les flèches feraient défiler la fenêtre par-dessus le marché.
    event.preventDefault()
    setDockHeight(target)
    saveDockHeight()
  })

  return grip
}

// La fenêtre change de taille : le plafond change avec elle, et une hauteur qui tenait
// sur un grand écran doit se resserrer plutôt que d'avaler la page.
window.addEventListener('resize', () => applyDockHeight())

/**
 * Le bandeau, replié ou déployé. Replié, il ne laisse que sa barre de tête : le nom du
 * widget sélectionné et le bouton pour la rouvrir — de quoi savoir sur quoi on agit sans
 * rien prendre à la page.
 */
function syncDock(): void {
  if (!dockElement || !dockToggle || !panelHost) return
  dockElement.classList.toggle('dock--collapsed', dockCollapsed)
  // Replié, le bandeau emporte la liste des widgets avec ses réglages — et la liste est
  // le seul chemin vers les widgets qu'aucun clic n'atteint. Sans sélection, le bouton
  // nomme donc ce que le dépliage donne à cet instant : la liste, pas des réglages qui
  // n'existent pas encore.
  dockToggle.textContent = dockCollapsed
    ? (selection === undefined ? 'Liste des gadgets' : 'Déplier les réglages')
    : 'Replier'
  dockToggle.setAttribute('aria-expanded', String(!dockCollapsed))
  // Replié, c'est le corps entier qui disparaît : ses deux zones, et la place qu'il prend.
  if (dockBody) dockBody.hidden = dockCollapsed
  // Replié, il n'y a plus de hauteur à régler : la poignée sort aussi de la tabulation.
  // La hauteur choisie, elle, est intacte et revient telle quelle au dépliage.
  if (dockGrip) dockGrip.hidden = dockCollapsed
  if (widgetListHost) widgetListHost.hidden = listHidden
  if (listToggle) {
    listToggle.hidden = dockCollapsed
    listToggle.textContent = listHidden ? 'Afficher la liste' : 'Masquer la liste'
    listToggle.setAttribute('aria-pressed', String(!listHidden))
  }
}

/**
 * Le bandeau s'ouvre parce qu'il a enfin quelque chose à montrer. Appelé sur les gestes
 * de sélection du pilote — clic sur la page, ligne de la liste — et sur eux seuls : un
 * bandeau replié à la main ne doit pas se rouvrir au prochain `render()`.
 */
function openDockForSelection(): void {
  if (!dockCollapsed) return
  dockCollapsed = false
  syncDock()
}

/**
 * Vrai le temps que `buildEditing` repose sur le calque neuf la sélection d'avant la
 * reconstruction. Ce n'est pas un geste du pilote : ni le dépliage du bandeau ni le
 * défilement vers la sélection ne doivent s'y déclencher, sans quoi une annulation
 * rouvrirait un bandeau qu'il venait de replier et lui reprendrait sa position de
 * lecture.
 */
let restoringSelection = false

/** Coordonnées des widgets, normalisées sur 10000 quelle que soit la dalle. */
const WIDGET_SCALE = 10000

/**
 * Ce qui reste de fenêtre à la page : sous les bandeaux collants du haut, au-dessus du
 * bandeau de réglages. Mesuré à chaque appel — la barre de tête passe sur deux lignes
 * en dessous de 1100 px, et le bandeau vient peut-être de changer de hauteur.
 */
function visibleBand(): VisibleBand {
  const top = Math.max(
    bar.getBoundingClientRect().bottom,
    tools.hidden ? 0 : tools.getBoundingClientRect().bottom
  )
  const bottom = dockElement === undefined || dockElement.hidden
    ? window.innerHeight
    : dockElement.getBoundingClientRect().top
  return { top, bottom }
}

/** Un défilement animé, sauf pour qui a demandé qu'on lui épargne les animations. */
function revealBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    ? 'auto'
    : 'smooth'
}

/**
 * Amène un gadget dans la bande visible, désigné par son rang.
 *
 * C'est la boucle d'édition elle-même : *j'agis → je vois*. Sans ce défilement, un
 * gadget de la moitié basse de la page est sous le bandeau de réglages au moment précis
 * où l'on ouvre ses réglages — et comme il est aussi hors d'atteinte du clic pour la
 * même raison, la liste du bandeau est son unique voie d'accès, laquelle ne montrait
 * rien.
 *
 * On défile **la fenêtre**, jamais la plaque : le zoom que le pilote a calé à la règle
 * graduée n'est pas touché, et la page reste dessinée à sa taille physique. La bande
 * visible, elle, est mesurée à chaque appel — le bandeau vient peut-être de changer de
 * hauteur.
 *
 * Les coordonnées viennent de `currentBounds`, qui les **relit dans le document**.
 * `Page.widgets` est une photographie prise au dernier `render()` : la lire ferait
 * défiler vers l'endroit où le gadget se trouvait avant les flèches, ce qui est
 * exactement l'endroit où il n'est plus.
 *
 * Le calcul part du rectangle de la plaque plutôt que des marques du calque : la
 * consultation n'en a pas, et le même code vaut alors pour les deux modes.
 */
function revealWidget(index: number): void {
  if (view.kind !== 'detail') return
  const page = currentPage()
  const plate = content.querySelector('.plate')
  if (page === undefined || page.widgets[index] === undefined) return
  if (!(plate instanceof HTMLElement)) return
  const box = plate.getBoundingClientRect()
  if (box.height <= 0) return
  const bounds = currentBounds(page, index)
  const offset = revealOffset({
    top: box.top + (bounds.y1 / WIDGET_SCALE) * box.height,
    bottom: box.top + (bounds.y2 / WIDGET_SCALE) * box.height
  }, visibleBand())
  // `revealOffset` rend zéro quand le gadget tient déjà dans la bande : la page ne bouge
  // donc pas sous les doigts du pilote tant qu'il n'y a rien à montrer.
  if (offset === 0) return
  window.scrollBy({ top: offset, behavior: revealBehavior() })
}

/** Le gadget sélectionné, amené dans la bande visible. */
function revealSelection(): void {
  if (selection === undefined) return
  revealWidget(selection)
}

/**
 * Remet la page d'accord avec la sélection, **en consultation**.
 *
 * En édition, c'est le calque qui pose ses marques et qui sait le faire sans redessiner.
 * En consultation il n'y a pas de calque : les zones de survol sont les cibles, et c'est
 * leur classe qu'on retourne. On ne reconstruit rien — un `render()` complet reprendrait
 * au bandeau son défilement et son filtre, à chaque clic.
 */
function syncSelectionMarks(): void {
  if (inspecting !== undefined) inspecting.selection = selection
  for (const zone of content.querySelectorAll('.hotspot')) {
    if (!(zone instanceof HTMLElement)) continue
    const chosen = zone.dataset.position !== undefined && Number(zone.dataset.position) === selection
    zone.classList.toggle('hotspot--selected', chosen)
    zone.setAttribute('aria-pressed', String(chosen))
  }
  refreshReadout?.()
}

/** Reconstruit le bandeau depuis le rang sélectionné — jamais depuis un nœud retenu. */
function refreshPanel(): void {
  if (!panelHost || !session) return
  // L'intitulé du bouton de repli dépend de la sélection, qui vient peut-être de changer.
  syncDock()
  const page = currentPage()
  const widget = selection === undefined ? undefined : page?.widgets[selection]
  const name = widget === undefined ? undefined : readableName(widget.shortName, session.language)

  if (selectionLabel) {
    selectionLabel.textContent = widget === undefined
      ? 'Aucun gadget sélectionné'
      : `${name} — rang ${(selection ?? 0) + 1} sur ${page?.widgets.length ?? 0}`
  }

  // La liste met en évidence le rang courant, quelle que soit son origine — un clic sur la
  // page passe par `onSelectionChange`, qui aboutit ici. `select` ne rappelle jamais
  // `onSelect` : les deux sens de la synchronisation ne peuvent donc pas se relancer.
  widgetList?.select(selection)

  // La barre de tête du bandeau redit ces trois faits : elle reste visible une fois le
  // bandeau replié, où le panneau lui-même a disparu.
  // Sans sélection, la barre de tête n'annonce pas un manque : elle dit le geste à faire.
  // C'est le seul texte que le bandeau replié — son état d'arrivée — laisse voir.
  if (dockTitle) dockTitle.textContent = name ?? 'Choisissez un gadget pour voir ses réglages'
  if (dockClass) dockClass.textContent = widget?.shortName ?? ''
  if (dockCount) dockCount.textContent = ''

  panelHost.textContent = ''
  if (widget === undefined) {
    panelHost.append(el(
      'p', 'hint-note',
      editMode
        ? 'Cliquez un gadget sur la page : ses réglages apparaissent ici, dans l’ordre où ' +
          'l’instrument les présente.'
        : 'Cliquez un gadget sur la page — ou choisissez-le dans la liste — pour lire ses ' +
          'réglages. Rien n’est modifiable ici : c’est la consultation.'
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
  updateDockCount(form, editMode)

  // Deux panneaux, deux contrats. En édition, `onChange` est branché et le panneau écrit.
  // En consultation, `readOnly` : le module ne construit aucun contrôle, `onChange` n'est
  // pas fourni, et rien ne peut donc atteindre le document.
  //
  // La version du fichier est passée dans les deux cas. En édition aussi, parce que le
  // panneau y propose d'écrire des valeurs relevées sur **une** version de XCTrack : sans
  // elle, il ne peut que dire « version inconnue ici » au moment précis où il demande au
  // pilote de faire confiance à ce relevé.
  const fileVersion = {
    ...(session.versionCode === undefined ? {} : { fileVersionCode: session.versionCode }),
    ...(session.versionName === undefined ? {} : { fileVersionName: session.versionName })
  }
  const panel = editMode
    ? module.renderProperties({
      form,
      ...fileVersion,
      // Le second paramètre est le formulaire **refait** : écrire une valeur jusqu'ici
      // absente ajoute une ligne, et le compte de la barre de tête mentirait sans lui.
      onChange: (field, fresh) => onPropertyChange(field, widget, fresh)
    })
    : module.renderProperties({ form, readOnly: true, ...fileVersion })
  panelHost.append(panel.element)
}

/**
 * La liste des widgets de la page, reconstruite depuis la mise en page vivante.
 *
 * Elle se refait entièrement — jamais mise à jour ligne par ligne — parce que tout ce
 * qu'elle affiche dépend de **l'ensemble** des rangs : supprimer un widget change les
 * numéros de tous les suivants, et changer un rang d'empilement peut rendre atteignable
 * un widget qui ne l'était pas. Une reconstruction coûte une page de DOM ; un calcul
 * incrémental coûterait la justesse.
 *
 * Elle ne survit pas à une annulation : `render()` refait le bandeau entier, et cette
 * fonction repart du rang mémorisé dans `selection` — le seul repère qui traverse un
 * arbre JSON renouvelé.
 */
function refreshWidgetList(): void {
  if (!widgetListHost || !session || view.kind !== 'detail') return
  const page = currentPage()
  widgetListHost.textContent = ''
  widgetList = undefined
  if (page === undefined) return

  const list = renderWidgetList({
    page,
    device: session.device,
    orientation: view.orientation,
    language: session.language,
    selection,
    onSelect: (index) => {
      // Choisir une ligne, c'est ouvrir les réglages du widget : replié, le bandeau se
      // déplie — sans quoi le pilote choisirait dans le vide.
      openDockForSelection()
      selection = index
      // Le calque est la référence de la sélection : il pose ses marques sur la page et
      // rappelle `onSelectionChange`, qui met le panneau à jour. En consultation il n'y a
      // pas de calque : on met à jour le panneau et les marques nous-mêmes.
      if (editor) editor.select(index)
      else { refreshPanel(); syncSelectionMarks() }
      // Après le dépliage, jamais avant : le bandeau vient de reprendre sa hauteur, et
      // c'est elle qui décide de la bande où le gadget doit entrer.
      revealSelection()
    }
  })
  widgetList = list
  widgetListHost.append(list.element)
}

/**
 * Le bandeau de réglages, sous la page et collant en bas de fenêtre. La barre de tête dit
 * ce qui est réglé ; le corps porte deux choses côte à côte — la liste des widgets de la
 * page, puis le panneau de `properties.ts` tel quel, c'est le CSS de l'enveloppe qui étale
 * sa liste verticale en colonnes, le module n'en sait rien.
 *
 * Les deux partagent la **hauteur** du corps (`.dock__body`), jamais la largeur de la
 * page : le troisième principe du projet — rien ne partage la largeur avec le rendu —
 * n'est pas entamé. Cette hauteur n'est plus fixée par la feuille de style seule : une
 * poignée coiffe le bandeau, et c'est le pilote qui arbitre entre voir sa page et voir
 * ses réglages.
 */
function buildDock(): HTMLElement {
  const dock = el('section', 'dock')
  dock.dataset.mode = editMode ? 'edition' : 'consultation'
  dock.setAttribute(
    'aria-label',
    editMode
      ? 'Gadgets de la page et réglages du gadget sélectionné'
      : 'Gadgets de la page et réglages du gadget sélectionné, en lecture seule'
  )
  // Fin de glissé d'un curseur, sortie d'un champ : le pas en attente est clos ici
  // plutôt qu'au bout du délai. En consultation rien n'écrit, donc rien n'est en attente ;
  // l'écoute ne se pose pas, pour qu'aucun chemin du bandeau ne touche à l'historique.
  if (editMode) dock.addEventListener('change', () => flushRecord())

  dockGrip = buildDockGrip()

  const head = el('div', 'dock__head')
  dockTitle = el('h2', 'dock__title', 'Aucun gadget sélectionné')
  dockClass = el('span', 'dock__class')
  dockCount = el('span', 'dock__count')
  listToggle = el('button', 'btn btn--ghost dock__list-toggle', 'Masquer la liste')
  listToggle.type = 'button'
  listToggle.addEventListener('click', () => {
    listHidden = !listHidden
    syncDock()
  })
  dockToggle = el('button', 'btn dock__toggle', 'Replier')
  dockToggle.type = 'button'
  dockToggle.addEventListener('click', () => {
    dockCollapsed = !dockCollapsed
    syncDock()
  })
  head.append(dockTitle, dockClass, dockCount, listToggle, dockToggle)

  const body = el('div', 'dock__body')
  body.id = 'dock-body'
  dockBody = body
  dockToggle.setAttribute('aria-controls', body.id)

  widgetListHost = el('div', 'dock__list')
  widgetListHost.id = 'dock-list'
  listToggle.setAttribute('aria-controls', widgetListHost.id)

  panelHost = el('div', 'dock__panel')
  body.append(widgetListHost, panelHost)

  dockGrip.setAttribute('aria-controls', body.id)

  dock.append(dockGrip, head, body)
  dockElement = dock
  // Le bandeau est neuf à chaque `render()` : la hauteur réglée se repose dessus ici.
  applyDockHeight()
  return dock
}

/**
 * Le bandeau de **consultation** : la même liste de widgets qu'en édition, et le panneau
 * de réglages en lecture seule.
 *
 * Ce que cela ajoute au jalon 1 tient en une phrase : comprendre une configuration — la
 * sienne après six mois, celle qu'un pilote a partagée — sans jamais risquer de la
 * modifier. Jusqu'ici, tous les réglages étaient derrière le mode édition, c'est-à-dire
 * derrière le risque.
 *
 * Trois choix, et ils se tiennent :
 *
 * 1. **Le même meuble qu'en édition.** Bandeau collant, repliable, redimensionné par le
 *    pilote, hauteur mémorisée — tout cela existe et vaut pour les deux modes. La page,
 *    elle, garde toute la largeur : c'est le principe qu'on ne touche pas.
 * 2. **La liste des widgets, en consultation aussi.** Six widgets sur les 105 de la
 *    configuration de référence sont entièrement recouverts : aucun clic ne les atteint,
 *    et la liste est le seul chemin qui y mène. S'en passer ici les rendrait
 *    inconsultables, ce qui viderait la fonction d'une partie de son sens.
 * 3. **Aucun contrôle de formulaire.** Voir `readOnly`, dans `properties.ts` : ce n'est
 *    pas un grisage, c'est une absence.
 */
function buildInspecting(page: Page): DetailInspecting {
  const dock = buildDock()

  // Comme en édition : un rang hors bornes vaut « rien de sélectionné » plutôt qu'un
  // widget au hasard. Le cas se produit en revenant de l'édition après une suppression.
  if (selection !== undefined && selection >= page.widgets.length) selection = undefined

  const state: DetailInspecting = {
    dock,
    selection,
    onSelect: (index) => {
      // Choisir un widget, c'est vouloir lire ses réglages : replié, le bandeau se déplie.
      if (index !== undefined) openDockForSelection()
      selection = index
      refreshPanel()
      syncSelectionMarks()
      revealSelection()
    },
    bindRefresh: (refresh) => { refreshReadout = refresh }
  }
  inspecting = state

  // La liste avant le panneau : `refreshPanel` met la ligne courante en évidence, encore
  // faut-il que la liste existe.
  refreshWidgetList()
  refreshPanel()
  syncDock()
  return state
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
      // Un clic sur la page, une flèche, une action de la barre d'outils : c'est un geste
      // du pilote, et il a droit au bandeau ouvert et au gadget sous les yeux. La
      // sélection reposée par `buildEditing` après une reconstruction, elle, n'en est pas
      // un — voir `restoringSelection`.
      if (index !== undefined && !restoringSelection) {
        openDockForSelection()
        revealSelection()
      }
    }
  })

  editor.element.addEventListener('keydown', () => {
    keyboardGesture = true
    queueMicrotask(() => { keyboardGesture = false })
  }, true)

  // La sélection se retrouve par son rang dans la page neuve. Un rang devenu hors bornes
  // — page changée sous elle — vaut « rien de sélectionné » plutôt qu'un widget au hasard.
  if (selection !== undefined && selection >= page.widgets.length) selection = undefined
  // La liste avant le calque : `editor.select` aboutit à `refreshPanel`, qui met la ligne
  // en évidence — encore faut-il que la liste existe.
  refreshWidgetList()
  if (selection !== undefined) {
    restoringSelection = true
    editor.select(selection)
    restoringSelection = false
  }
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
    // Le pilote lisait ici « Opération impossible : Error: duplicatePage : index 7 hors
    // de [0, 4] ». Ce que ça lui apprend d'utile tient en une phrase ; le reste vient
    // après, nommé pour ce qu'il est.
    pagesMessage = {
      orientation,
      text: 'Cette modification n’a pas pu être faite : vos pages n’ont pas bougé. ' +
        `Détail technique : ${formatTechnicalDetail(error)}`
    }
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

/* ============================================ les quatre modules branchés à la demande */

/**
 * Une modale est ouverte par-dessus la vue.
 *
 * Six boîtes cohabitent désormais (palette, pages, préférences non — c'est une vue —,
 * version, bibliothèque, partage) : les énumérer une à une dans chaque garde de clavier
 * était le moyen sûr d'en oublier une à la septième. La question posée au document est
 * la seule qui ne se périme pas.
 */
function modalOpen(): boolean {
  return document.querySelector('dialog[open]') !== null
}

/**
 * Dire un échec sans effacer ce que le pilote regardait.
 *
 * `failure` — la variable d'état de l'ouverture — remplace la vue entière : s'en servir
 * pour un module qui n'a pas su se charger effacerait la session, c'est-à-dire punirait
 * le pilote d'une panne de réseau. Une boîte qui se ferme laisse tout en place.
 */
function tellProblem(title: string, message: string, detail?: string): void {
  const dialog = el('dialog', 'modal')
  const box = el('div', 'modal__box')
  box.append(el('h2', 'modal__title', title), el('p', 'problem__message', message))
  if (detail !== undefined) box.append(technicalDetail(detail))
  const actions = el('div', 'modal__actions')
  const dismiss = el('button', 'btn btn--primary', 'Fermer')
  dismiss.type = 'button'
  dismiss.addEventListener('click', () => {
    dialog.close()
    dialog.remove()
  })
  actions.append(dismiss)
  box.append(actions)
  dialog.append(box)
  dialog.addEventListener('cancel', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  dismiss.focus()
}

/* ------------------------------------------- 1. les préférences générales, en vue pleine */

/**
 * Le jeton du chargement en cours. La page arrive après un `import()` et un catalogue :
 * entre-temps le pilote a pu revenir en arrière, ouvrir un autre fichier, ou changer de
 * langue. Un jeton dit si le résultat qui arrive est encore celui qu'on attendait — même
 * garde que `panelHost` pour le panneau de réglages, à ceci près qu'ici il n'y a pas
 * d'élément stable à comparer : la vue entière est remplacée.
 */
let preferencesToken = 0

/**
 * La vue d'où l'on est parti lire les réglages généraux.
 *
 * « Fermer » ramenait toujours à la vue d'ensemble : un pilote parti d'une page ouverte
 * la retrouvait fermée, et devait la rouvrir. Le menu rend les réglages atteignables
 * depuis n'importe quel écran — il faut donc que le retour en fasse autant, sans quoi
 * on gagne un aller et on perd le retour.
 */
let viewBeforePreferences: View | undefined

/**
 * Ce que la vue des réglages doit retrouver quand elle est reconstruite sous elle-même :
 * une annulation rend un **arbre neuf** (voir `stepHistory`), la page entière est donc
 * rebâtie. Sans ces deux repères, annuler une modification renverrait le pilote en haut
 * d'une page de quatre-vingt-dix lignes, filtre vidé — le geste coûterait plus cher que
 * la modification qu'il défait.
 */
let preferencesFilter = ''
let preferencesScroll: number | undefined

/** Une modification faite dans la page des réglages. La page a déjà écrit dans le document. */
function onPreferenceEdit(edit: PreferenceEdit): void {
  if (!session) return
  session.container.modified = true
  // Un curseur émet à chaque cran : les pas se regroupent, exactement comme ceux du
  // panneau des gadgets. Le reste — case, liste, champ quitté — est un pas net.
  if (edit.continuous) recordSoon(`pref:${edit.key}`, edit.description)
  else {
    flushRecord()
    session.history.record(edit.description)
  }
  syncEditControls()
}

/** Aller lire les réglages généraux, en retenant d'où l'on vient. */
function openPreferences(): void {
  if (!session || view.kind === 'preferences') return
  viewBeforePreferences = view
  // On y entre à neuf : le filtre d'une visite précédente cacherait des lignes sans que
  // rien à l'écran dise pourquoi.
  preferencesFilter = ''
  preferencesScroll = undefined
  view = { kind: 'preferences' }
  render()
  window.scrollTo({ top: 0 })
}

/**
 * La vue des préférences : un hôte posé tout de suite, la page dedans quand elle arrive.
 *
 * `openPreferencesPage` est l'entrée que le module désigne — c'est elle qui charge le
 * catalogue dans la bonne langue. Elle est atteinte par `import()` : les 147 Ko émis
 * (environ 32 Ko transférés) ne partent que si le pilote clique.
 */
function buildPreferencesView(current: Session): HTMLElement {
  const host = el('section', 'prefs-host')
  host.append(el('p', 'hint-note', 'Chargement des réglages généraux…'))

  const token = ++preferencesToken
  const back = (): void => {
    // La page d'où l'on venait peut avoir disparu entre-temps — fichier rouvert, page
    // supprimée : `render()` retomberait sur un rang hors bornes. La vue d'ensemble
    // reste le refuge, mais elle n'est plus le seul retour possible.
    const previous = viewBeforePreferences
    viewBeforePreferences = undefined
    view = previous !== undefined && viewExists(previous) ? previous : { kind: 'overview' }
    render()
    window.scrollTo({ top: 0 })
  }

  // `onEdit` n'est branché qu'en mode édition : sans lui, la page ne construit aucun
  // contrôle — c'est sa promesse, et c'est ce qui fait de la consultation une vraie
  // consultation ici comme sur les pages.
  const writable = editMode && current.container.parseError === undefined

  void import('./preferencesPage')
    .then((module) => module.openPreferencesPage({
      document: current.container.document,
      language: current.language,
      fileName: current.container.fileName,
      ...(current.versionName === undefined ? {} : { fileVersionName: current.versionName }),
      ...(current.versionCode === undefined ? {} : { fileVersionCode: current.versionCode }),
      ...(writable ? { onEdit: onPreferenceEdit } : {}),
      // Sans `onClose`, le module ne construit aucun bouton « Fermer » : la vue serait
      // sans issue visible. C'est l'assembleur qui décide où l'on retombe — ici la vue
      // d'ensemble, d'où l'on est venu.
      onClose: back
    }))
    .then((page) => {
      if (token !== preferencesToken || !host.isConnected) return
      host.textContent = ''
      host.append(page.element)
      // Le filtre et le défilement traversent une reconstruction — annulation,
      // changement de mode : le pilote reprend là où il en était.
      const search = page.element.querySelector<HTMLInputElement>('.prefs__filter')
      if (search) {
        if (preferencesFilter !== '') {
          search.value = preferencesFilter
          page.filter(preferencesFilter)
        }
        search.addEventListener('input', () => { preferencesFilter = search.value })
      }
      const top = preferencesScroll
      preferencesScroll = undefined
      if (top !== undefined) window.scrollTo({ top })
    })
    .catch((error: unknown) => {
      if (token !== preferencesToken || !host.isConnected) return
      host.textContent = ''
      host.append(problem(
        'Les réglages généraux n’ont pas pu s’ouvrir',
        'La liste des réglages que XCTrack propose n’a pas pu être chargée.',
        'Le fichier, lui, n’est pas en cause : il reste ouvert et intact.',
        formatTechnicalDetail(error)
      ))
      const again = el('button', 'btn', 'Revenir aux pages')
      again.type = 'button'
      again.addEventListener('click', back)
      host.append(again)
    })

  return host
}

/* ---------------------------------------------- 2. version visée et compatibilité, en modale */

let versionDialog: HTMLDialogElement | undefined
let versionPanel: VersionPanel | undefined
let versionToken = 0

/**
 * Le diagnostic de version, par-dessus la vue.
 *
 * Une modale et non une section de la vue d'ensemble, pour une raison qui tient au module
 * lui-même : `buildVersionPanel` est asynchrone **à dessein** — c'est l'appel qui
 * déclenche le téléchargement de la base des versions. Posée en permanence sous le
 * bandeau du fichier, elle la ferait charger à chaque ouverture de fichier, pour un
 * renseignement que la plupart des pilotes ne demandent jamais.
 */
/**
 * Le manuel, chargé à la demande.
 *
 * Même forme que les cinq autres morceaux paresseux : le fragment et sa feuille pèsent
 * 16 ko compressés, qu'un pilote qui n'ouvre jamais l'aide n'a aucune raison de
 * télécharger. Le verrou `manualPending` évite qu'un double clic n'ouvre deux boîtes.
 */
let manualPending = false
function openManual(): void {
  if (manualPending) return
  manualPending = true
  void import('./manualDialog')
    .then((module) => { module.openManualDialog() })
    .catch((error: unknown) => {
      tellProblem('Le manuel n’a pas pu s’ouvrir',
        'Votre fichier n’a pas bougé. Réessayez.', formatTechnicalDetail(error))
    })
    .finally(() => { manualPending = false })
}

function openVersionDialog(): void {
  if (!session || versionDialog !== undefined) return
  flushRecord()
  const current = session

  const dialog = el('dialog', 'modal modal--version')
  dialog.setAttribute('aria-label', 'Version visée et compatibilité')
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Version visée et compatibilité'))
  const close = el('button', 'btn', 'Fermer')
  close.type = 'button'
  close.addEventListener('click', () => closeVersionDialog())
  head.append(close)
  box.append(head)

  // Le constat vient d'abord, l'action ensuite et seulement en édition. La phrase disait
  // « rien n'est supprimé ni modifié » : c'était vrai tant que la boîte ne savait que
  // constater. Elle sait maintenant retirer, et promettre le contraire de ce qu'un bouton
  // fait quelques centimètres plus bas serait le pire des deux textes.
  box.append(el(
    'p', 'modal__lead',
    'Le format de XCTrack change à chaque version. Choisissez la version visée : ' +
    'l’éditeur dit alors ce que ce fichier porte qu’elle ne connaît pas, et ce qu’elle ' +
    'attend qu’il n’a pas. C’est un constat : rien ne bouge tant que vous ne le ' +
    'demandez pas.'
  ))

  const host = el('div', 'modal__slot')
  host.append(el('p', 'hint-note', 'Chargement de la base des versions…'))
  box.append(host)
  dialog.append(box)

  versionDialog = dialog
  const token = ++versionToken
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeVersionDialog()
  })
  document.body.append(dialog)
  dialog.showModal()
  close.focus()

  void import('./versionDiagnostic')
    .then((module) => module.buildVersionPanel({
      document: current.container.document,
      language: current.language,
      // Le geste n'est offert qu'en édition : hors de ce mode, l'outil promet de ne rien
      // écrire, et un bouton qui retire des réglages y serait un reniement.
      //
      // Volontairement branché sur `repaint()` et non sur le rendu complet : celui-ci
      // passe par `syncVersionDialog()`, qui remet le panneau à zéro et effacerait
      // l'offre de remise en place à l'instant précis où elle sert. Le nettoyage retire
      // des réglages que la version visée ne lit pas — le dessin ne change donc pas, et
      // l'identité des nœuds est préservée, si bien que `session.layout` reste valide.
      ...(editMode ? { onCleanup: (event: CleanupEvent) => {
        current.container.modified = true
        current.history.record(event.description)
        repaint()
        refreshWidgetList()
        syncEditControls()
      } } : {})
    }))
    .then((panel) => {
      if (token !== versionToken) return
      versionPanel = panel
      host.textContent = ''
      host.append(panel.element)
    })
    .catch((error: unknown) => {
      if (token !== versionToken) return
      host.textContent = ''
      host.append(problem(
        'Le diagnostic de version n’a pas pu s’ouvrir',
        'La liste des versions de XCTrack n’a pas pu être chargée.',
        'Le fichier, lui, n’est pas en cause : il reste ouvert et intact.',
        formatTechnicalDetail(error)
      ))
    })
}

function closeVersionDialog(): void {
  const dialog = versionDialog
  versionDialog = undefined
  versionPanel = undefined
  // Un chargement encore en vol ne doit pas remplir une boîte disparue.
  versionToken += 1
  if (!dialog) return
  if (dialog.open) dialog.close()
  dialog.remove()
}

/**
 * Le document a changé sous la boîte — édition, annulation, opération sur les pages. Le
 * panneau sait se rebrancher, présélection comprise : un diagnostic qui décrirait l'arbre
 * d'avant serait faux sans le dire.
 */
function syncVersionDialog(): void {
  if (!versionDialog) return
  if (!session || session.container.parseError !== undefined) {
    closeVersionDialog()
    return
  }
  versionPanel?.setDocument(session.container.document)
}

/* ------------------------------------------------ 3. la bibliothèque, en modale */

interface LibraryKit {
  panel: typeof import('./libraryPanel')
  core: typeof import('../library')
  library: Library
}

let libraryKit: Promise<LibraryKit> | undefined
let libraryDialog: LibraryDialogHandle | undefined
let libraryOpening = false

/**
 * La bibliothèque et son magasin, montés une seule fois, au premier clic.
 *
 * Trois `import()` : le panneau, le socle `src/library/`, et le catalogue des familles —
 * ce dernier parce que `describe` en a besoin. Sans lui, chaque carte afficherait
 * « Pro : inconnu » : honnête, mais c'est un renseignement qu'on a sous la main.
 * `isProWidget` ne dépend pas de la langue (c'est un drapeau du type, pas un libellé) :
 * le catalogue chargé au premier clic vaut donc pour toute la session.
 *
 * Le magasin durable d'abord, le repli en mémoire ensuite et **seulement s'il le faut** :
 * le panneau annonce lui-même, en tête, qu'un rangement non durable est un brouillon.
 */
function loadLibraryKit(): Promise<LibraryKit> {
  libraryKit ??= (async (): Promise<LibraryKit> => {
    const [panel, core, catalog] = await Promise.all([
      import('./libraryPanel'),
      import('../library'),
      loadWidgetCatalog(session?.language ?? 'fr')
    ])
    let store
    try {
      store = await core.openIndexedDbStore()
    } catch {
      store = core.createMemoryStore()
    }
    const library = core.createLibrary({
      store,
      describe: {
        isProWidget: catalog.isProWidget,
        referenceVersionCode: REFERENCE_VERSION_CODE
      }
    })
    return { panel, core, library }
  })()
  return libraryKit
}

/**
 * Ce que la bibliothèque sait du document ouvert — **relu à chaque geste**, jamais figé.
 *
 * C'est un getter parce que `modified` change sous le panneau : c'est lui, et lui seul,
 * qui fait que charger une autre configuration s'arrête et demande au lieu d'écraser un
 * travail en cours. Les octets, eux, sont produits au clic par `exportContainer` — donc
 * à l'octet près quand rien n'a bougé.
 */
function currentForLibrary(): CurrentDocument | undefined {
  const current = session
  if (!current) return undefined
  return {
    fileName: current.container.fileName,
    modified: current.container.modified,
    bytes: () => exportContainer(current.container)
  }
}

function closeLibraryDialog(): void {
  const handle = libraryDialog
  libraryDialog = undefined
  handle?.close()
}

function openLibrary(): void {
  if (libraryDialog !== undefined || libraryOpening) return
  flushRecord()
  libraryOpening = true
  libraryButton.disabled = true

  void loadLibraryKit()
    .then((kit) => {
      const handle = kit.panel.openLibraryDialog({
        library: kit.library,
        current: currentForLibrary,
        language: session?.language ?? 'fr',
        estimateStorage: kit.core.estimateStorage,
        requestPersistence: kit.core.requestPersistence,
        onLoad: (entry, bytes) => {
          // Le nom du fichier d'origine est conservé dans l'entrée ; à défaut, le nom
          // donné à l'entrée fait l'affaire — il faut bien une extension pour que
          // `openContainer` sache quoi en dire.
          const name = entry.fileName === '' ? `${entry.name}.xcfg` : entry.fileName
          closeLibraryDialog()
          // Copie : les octets viennent du magasin, et `openContainer` les garde comme
          // source de réémission. Rien ne doit pouvoir les modifier derrière son dos.
          void loadBytes(bytes.slice(), name)
        },
        onClose: () => { libraryDialog = undefined }
      })
      libraryDialog = handle
      handle.open()
    })
    .catch((error: unknown) => {
      tellProblem(
        'La bibliothèque n’a pas pu s’ouvrir',
        'Votre navigateur n’a pas donné accès au rangement de cet outil. Le fichier ' +
        'ouvert, lui, n’a pas bougé.',
        formatTechnicalDetail(error)
      )
    })
    .finally(() => {
      libraryOpening = false
      libraryButton.disabled = false
    })
}


/* --------------------------------------------------- 4. l'export partageable, en modale */

/**
 * Ce que la boîte de partage a besoin de savoir du fichier ouvert, et rien de plus.
 *
 * Les annexes d'une archive ne sont décrites que par leur nom et leur taille : la boîte
 * les **liste** pour dire ce qu'une version partageable laisse derrière elle — cet
 * éditeur n'inspecte ni leur contenu ni les métadonnées d'une image, et un `.xczfg`
 * anonymisé serait donc une promesse fausse.
 */
function sharingSource(current: Session): SharingSource {
  return {
    document: current.container.document,
    fileName: current.container.fileName,
    kind: current.container.kind,
    // Ce qui décide de ce que la boîte a le droit de promettre : un document intact
    // ressort à l'octet près, un document modifié est sérialisé. Voir `SharingSource`.
    modified: current.container.modified,
    extras: current.container.extras.map((entry) => ({
      name: entry.name,
      byteLength: entry.data.byteLength
    }))
  }
}

/**
 * L'écriture du fichier. `produced` vaut `undefined` sur le chemin ordinaire : on réémet
 * alors ce que `exportContainer` rend — les octets d'origine quand rien n'a bougé. C'est
 * exactement là que se tient la fidélité à l'octet près, et c'est pourquoi ce
 * `?? await exportContainer(...)` ne doit jamais être remplacé par une sérialisation.
 */
async function deliver(
  current: Session, produced: Uint8Array | undefined, fileName: string
): Promise<void> {
  const bytes = produced ?? await exportContainer(current.container)
  // Copie dans un ArrayBuffer simple : `Blob` n'accepte pas une vue dont le tampon
  // pourrait être partagé, et le conteneur ne garantit rien de son origine.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
  const link = el('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Le fichier illisible n'a qu'une issue, et elle est la bonne : ses octets tels qu'ils
 * sont entrés. La boîte de partage n'est pas ouverte pour lui — elle proposerait une
 * « version partageable » dérivée d'un document vide, c'est-à-dire un fichier sans
 * contenu présenté comme une configuration. Le nom, lui, vient de la même fonction que
 * partout ailleurs.
 */
async function downloadIntact(current: Session): Promise<void> {
  const { buildExportFileName } = await import('../model/sharing')
  await deliver(current, undefined, buildExportFileName({
    originalFileName: current.container.fileName,
    when: new Date()
  }))
}

let exportPending = false

/**
 * Enregistrer, c'est choisir ce qu'on donne.
 *
 * La boîte de `sharingDialog.ts` remplace la confirmation d'export d'avant : celle-ci ne
 * faisait qu'avertir, et le nom qu'elle produisait **reprenait le nom d'origine** — or ce
 * nom porte souvent un prénom (`2022-02-08_marie_ok.xcfg` existe dans le corpus). Un outil
 * qui promet d'anonymiser un fichier et en recopie le nom n'a rien anonymisé.
 *
 * Deux points du contrat sont tenus ici et se voient mal :
 *
 * 1. **La boîte est rendue juste avant d'être ouverte.** L'horodatage du nom est celui du
 *    rendu : rendre puis attendre ferait montrer un nom qui n'est plus celui produit.
 * 2. **Les avertissements ne sont pas refabriqués.** Ils passent par `notice`, avec le
 *    recalcul que méritait déjà un document modifié.
 */
function askBeforeExport(current: Session): void {
  if (exportPending) return

  if (current.container.parseError !== undefined) {
    exportPending = true
    void downloadIntact(current).finally(() => { exportPending = false })
    return
  }

  // Les avertissements sont calculés à l'import ; un document modifié en mérite un
  // recalcul, car ce qu'il contient a changé depuis. Ce qui ne change pas : ils sont dits
  // AVANT le téléchargement, modifié ou non.
  const notice = warningNotice(warningsAt(
    current.container.modified
      ? computeWarnings({
        document: current.container.document,
        layout: current.layout,
        settings: current.settings,
        language: current.language
      })
      : current.warnings,
    'export'
  ))

  exportPending = true
  exportButton.disabled = true
  void import('./sharingDialog')
    .then((module) => {
      const handle = module.renderSharingDialog({
        source: sharingSource(current),
        language: current.language,
        ...(notice === undefined ? {} : { notice }),
        onConfirm: (result: SharingResult) => {
          // `sharingBytes` rend `undefined` pour un export ordinaire : c'est le signal de
          // réémettre le conteneur, jamais de sérialiser.
          void deliver(current, module.sharingBytes(result), result.fileName)
        }
      })
      handle.open()
    })
    .catch((error: unknown) => {
      tellProblem(
        'La boîte d’enregistrement n’a pas pu s’ouvrir',
        'Rien n’a été enregistré et votre fichier n’a pas bougé. Réessayez.',
        formatTechnicalDetail(error)
      )
    })
    .finally(() => {
      exportPending = false
      exportButton.disabled = false
    })
}

function render(): void {
  // Le calque appartient à la vue qu'on efface : on le démonte explicitement, pour que
  // ses écoutes de fenêtre (`pointermove`, `pointerup`) partent avec lui.
  editor?.destroy()
  editor = undefined
  inspecting = undefined
  refreshReadout = undefined
  panelHost = undefined
  selectionLabel = undefined
  dockElement = undefined
  dockTitle = undefined
  dockClass = undefined
  dockCount = undefined
  dockToggle = undefined
  dockBody = undefined
  dockGrip = undefined
  listToggle = undefined
  widgetList = undefined
  widgetListHost = undefined

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
  syncVersionDialog()

  content.textContent = ''
  // La page est le seul objet dessiné à sa taille réelle : en édition, le cadre s'élargit
  // pour elle. Remis à faux ici, il n'est rétabli que par la branche qui construit
  // effectivement une page en édition.
  content.classList.remove('content--wide')
  exportButton.hidden = session === undefined
  // Le gabarit d'écran ne règle que le dessin d'une page : la vue des préférences n'en
  // montre aucune, et le sélecteur y serait une commande sans effet.
  tools.hidden = session === undefined
    || session.container.parseError !== undefined
    || view.kind === 'preferences'
  fileName.textContent = session?.container.fileName ?? ''
  syncEditControls()

  if (failure !== undefined) {
    content.append(problem(
      'Ce fichier n’a pas pu être ouvert',
      'Cet outil n’a rien su en tirer. Le fichier, lui, n’a pas été modifié.',
      // L'écran d'erreur ne montre plus la zone de dépôt, et « Ouvrir un fichier » a
      // rejoint le menu : sans cette phrase, il n'y aurait plus rien à quoi se raccrocher
      // — le dépôt continue pourtant de fonctionner sur toute la page.
      'Vérifiez qu’il s’agit bien d’un export XCTrack (.xcfg ou .xczfg). Vous pouvez ' +
      'déposer un autre fichier n’importe où sur cette page, ou le choisir dans le menu ' +
      '« Fichier », en haut à droite.',
      failure
    ))
    return
  }

  if (!session) {
    content.append(landing())
    return
  }

  if (session.container.parseError !== undefined) {
    content.append(problem(
      'Ce fichier n’a pas pu être lu',
      'Vérifiez que c’est bien le fichier .xcfg ou .xczfg produit par ' +
      '« Réglages → Exporter la configuration » sur l’instrument, et qu’il est entier.',
      'Ses octets sont conservés intacts : « Enregistrer une copie » vous le rend tel qu’il est entré, ' +
      'sans la moindre réécriture.',
      session.container.parseError
    ))
    return
  }

  if (view.kind === 'preferences') {
    content.append(buildPreferencesView(session))
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
      // Le calque n'est construit qu'en édition. En consultation, la page reste celle du
      // jalon 1 — zones de survol comprises —, et le bandeau vient DESSOUS : la sélection
      // n'y ouvre que la lecture des réglages.
      const editing = editMode ? buildEditing(session, page, orientation) : undefined
      // Une page sans widget n'a rien à consulter : le bandeau serait un meuble vide.
      const inspection = editMode || page.widgets.length === 0
        ? undefined
        : buildInspecting(page)
      if (editing || inspection) content.classList.add('content--wide')
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
        // Le zoom redimensionne la plaque sous le calque, qui n'en est pas averti : c'est
        // ici qu'on le lui dit. Le placement de la barre d'outils se juge en pixels — sa
        // hauteur à l'écran contre la place restante —, et ces pixels viennent de changer.
        onZoom: (factor) => { zoom = factor; editor?.refresh() },
        ...(editing === undefined ? {} : { editing }),
        ...(inspection === undefined ? {} : { inspecting: inspection })
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
      'Mode édition : ouvrez une page pour y ajouter des gadgets, les déplacer et ' +
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
  //
  // Deux poids, deux places : ce qui décrit un défaut reste déplié, ce qui renseigne se
  // replie en une ligne. Les deux passent avant les pages, mais la ligne repliée ne coûte
  // qu'elle-même — c'est ce qui ramène la première vignette dans le premier écran.
  const { attention, remarks } = splitWarnings(warningsAt(session.warnings, 'import'))
  const alert = attentionPanel(attention)
  if (alert) content.append(alert)
  const folded = remarksPanel(remarks)
  if (folded) content.append(folded)

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

/**
 * Ouvrir des octets, d'où qu'ils viennent : le sélecteur de fichiers, un dépôt à la
 * souris, ou une entrée de la bibliothèque — dont les octets ont déjà été vérifiés contre
 * leur empreinte avant d'arriver ici.
 */
async function loadBytes(bytes: Uint8Array, name: string): Promise<void> {
  // Ferme le pas en attente et son minuteur avant que la session ne disparaisse.
  flushRecord()
  failure = undefined
  session = undefined
  // Un nouveau fichier s'ouvre en consultation : on le regarde avant de le modifier, et
  // l'historique de l'ancien n'a plus aucun sens ici.
  editMode = false
  selection = undefined
  // Toutes les boîtes ouvertes parlaient du fichier précédent. Le diagnostic de version
  // saurait se rebrancher, mais sa présélection et son palier retenu appartenaient à
  // l'autre fichier : on repart de zéro plutôt que de laisser un choix orphelin.
  closePagesDialog()
  closePaletteDialog()
  closeVersionDialog()
  // Un fichier déposé sur la page n'est pas un clic : rien ne refermerait le menu resté
  // ouvert, qui se retrouverait posé au-dessus d'une vue qu'il n'a pas ouverte.
  menu.close()
  paletteQuery = ''
  // Les réglages généraux affichés étaient ceux de l'autre fichier, et la vue retenue
  // pour le retour désignait une page de l'autre fichier.
  if (view.kind === 'preferences') view = { kind: 'overview' }
  viewBeforePreferences = undefined
  try {
    const container = await openContainer(bytes, name)
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
      versionCode: info ? readNumber(info, 'versionCode') : undefined,
      versionName: info ? readString(info, 'versionName') : undefined,
      warnings: computeWarnings({ document: container.document, layout, settings, language })
    }
    installDeviceSelector(device)
  } catch (error) {
    failure = formatTechnicalDetail(error)
  }
  view = { kind: 'overview' }
  render()
}

async function load(file: File): Promise<void> {
  await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name)
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

exportButton.addEventListener('click', () => {
  // Un pas de curseur encore en attente est clos avant de sortir le fichier : il est
  // déjà écrit dans le document, il doit être annulable après coup.
  flushRecord()
  if (session) askBeforeExport(session)
})

/* ------------------------------------------------------- commandes d'édition */

editToggle.addEventListener('click', () => {
  editMode = !editMode
  // Passer d'un mode à l'autre rebâtit la page des réglages, contrôles compris : on y
  // revient à la même hauteur, sinon le simple fait de vouloir modifier fait perdre sa
  // place dans une page de quatre-vingt-dix lignes.
  if (view.kind === 'preferences') preferencesScroll = window.scrollY
  // Les deux modules lourds de l'édition sont amorcés dès l'entrée : ils partagent le
  // catalogue d'options, et le premier clic ne doit pas attendre son téléchargement.
  if (editMode) {
    void loadProperties()
    void loadPalette()
    // Le catalogue des familles est un morceau de plus, propre à la langue : amorcé ici
    // aussi, il évite que la première ouverture de la palette attende deux téléchargements.
    if (session) void loadPaletteCatalog(session.language)
  }
  // La sélection traverse le passage d'un mode à l'autre : le widget qu'on vient de lire
  // est celui qu'on veut régler, et l'inverse est tout aussi vrai. `buildEditing` et
  // `buildInspecting` la ramènent l'une comme l'autre dans les bornes de la page.
  if (!editMode) flushRecord()
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
  // Une boîte est ouverte par-dessus : le pilote y travaille, et défaire une modification
  // qu'il ne voit pas serait une surprise. La bibliothèque et le partage s'ouvrent
  // désormais depuis la barre de tête, donc aussi depuis une page en édition.
  if (modalOpen()) return
  event.preventDefault()
  stepHistory(event.shiftKey ? 'redo' : 'undo')
})

window.addEventListener('keydown', (event) => {
  const current = view
  if (current.kind !== 'detail') return
  // Une boîte modale est ouverte par-dessus : Échap la ferme, les flèches appartiennent à
  // ses commandes. Rien de tout cela ne doit changer la page qui se trouve derrière.
  if (modalOpen()) return
  // Les flèches appartiennent au curseur de zoom quand il a le focus.
  if (event.target instanceof HTMLInputElement) return
  // En édition, flèches et Échap appartiennent au calque et au panneau : déplacer un
  // widget d'une cellule ne doit pas changer de page par la même occasion. En
  // consultation, rien du bandeau ne consomme Échap : elle doit pouvoir désélectionner
  // depuis la liste, où le pilote a justement le focus quand il vient d'y choisir un rang.
  const escapeFromDock = !editMode && event.key === 'Escape'
  if (insideEditor(event.target) && !escapeFromDock) return
  const pages = session?.layout[current.orientation] ?? []
  const go = (index: number): void => {
    view = { kind: 'detail', orientation: current.orientation, index }
    render()
  }
  if (event.key === 'Escape') {
    // Un cran à la fois : Échap lâche d'abord le widget, et seulement ensuite la page.
    // Quitter la page d'un seul coup ferait perdre le zoom réglé à la règle.
    if (!editMode && selection !== undefined) {
      selection = undefined
      refreshPanel()
      syncSelectionMarks()
      return
    }
    view = { kind: 'overview' }
    render()
  }
  if (event.key === 'ArrowRight' && current.index < pages.length - 1) go(current.index + 1)
  if (event.key === 'ArrowLeft' && current.index > 0) go(current.index - 1)
})

/* ------------------------------------------------------------------------- amorçage */

/**
 * Le premier rendu attend le catalogue de la langue.
 *
 * L'application n'affichait rien avant que ce fichier soit lu ; elle n'affiche désormais
 * rien avant qu'un morceau de plus soit arrivé — un seul, celui d'une seule langue
 * (`src/i18n/catalog.ts`). C'est le prix du chargement à la demande, et il se paie ici
 * plutôt qu'en montrant d'abord un écran français à qui a demandé autre chose.
 *
 * `void` parce que rien n'attend cette promesse : ce module est le point d'entrée, il n'a
 * personne à qui rendre l'échec. Un catalogue qui n'arrive pas laisse l'écran vide, et
 * `loadMessages` oublie l'échec pour qu'un rechargement retente.
 */
const uiLanguage = initialUiLanguage(window.localStorage, [...navigator.languages])
void loadTranslator(uiLanguage).then((loaded) => {
  tr = loaded
  render()
})
