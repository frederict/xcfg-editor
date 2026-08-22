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
import { computeChanges, type DocumentChanges } from '../model/changes'
import { gridFor } from '../model/grid'
import { createHistory, type EditHistory } from '../model/history'
import { readLayout, type Layout, type Page } from '../model/layout'
import { cloneNode, insertWidget } from '../model/mutations'
import { pageReachability } from '../model/reachability'
import {
  labelFallbackLanguage, readRenderSettings, resolveLanguage, type RenderSettings
} from '../model/preferences'
import { readWidget, type Widget } from '../model/widget'
import { renderPage } from '../render/canvas'
import { buildDeviceSelector } from './deviceSelector'
import { fileNameParts } from './fileNameParts'
import {
  createEditor, currentBounds,
  type Editor, type Viewport, type WidgetEdit, type WidgetStructureEdit
} from './editor'
import {
  applyPageOperation, describeOperation, operationAnnouncement, renderPageManager,
  type PageOperation
} from './pageManager'
import type { PropertyField, PropertyForm } from './properties'
import {
  aspectRatioOf, ATTENTION_WARNING_KINDS, buildChangeSummary, buildDetail, buildOverview,
  clampDockHeight,
  dockHeightCeiling, DOCK_HEIGHT_DEFAULT, DOCK_HEIGHT_MIN, readDockHeight, remarksSummary,
  revealOffset, splitWarnings, writeDockHeight, ZOOM_MIN, ZOOM_STEP,
  type DetailEditing, type DetailInspecting, type Orientation, type ViewContext,
  type VisibleBand
} from './views'
import {
  computeWarnings, preflightWarnings, REFERENCE_VERSION_CODE, warningsAt, type Warning
} from './warnings'
import { renderWidgetList, type WidgetList } from './widgetList'
// Type seul : effacé à la compilation, il ne ramène pas la palette dans le morceau
// principal — même parti que `PropertyField` juste au-dessus.
import type { ForeignWidget, PaletteSources } from './widgetPalette'
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
import {
  initialUiLanguage, loadTranslator, readUiLanguage, writeUiLanguage,
  UI_LANGUAGES, UI_LANGUAGE_ENDONYMS,
  type Translator, type UiLanguage
} from '../i18n'

/**
 * D'où vient la langue des **libellés de XCTrack** — les trois sources, dans l'ordre où
 * elles l'emportent (`labelFallbackLanguage`, `src/model/preferences.ts`) :
 *
 * - `file` — le fichier déclare sa `Display.Language`. **Rien ne passe devant** : c'est la
 *   promesse centrale de l'outil, le pilote lit les libellés comme son instrument les
 *   affiche.
 * - `ui` — le fichier se tait, et le pilote a choisi une langue d'interface au globe.
 * - `browser` — le fichier se tait et le pilote n'a rien choisi : reste `navigator.language`.
 *
 * Chacune a sa mention, parce que le pilote qui se demande « pourquoi ces mots-là ? » a
 * besoin de la réponse et non d'un code de langue seul.
 */
type LabelSource = 'file' | 'ui' | 'browser'

interface Session {
  container: Container
  /**
   * **Le document tel que le fichier l'a livré**, figé à l'ouverture et jamais muté.
   *
   * C'est l'autre terme de la comparaison que `computeChanges` (`src/model/changes.ts`)
   * met sous les yeux du pilote : « voilà ce que vous avez changé ». Il est pris ici, et
   * pas ailleurs, pour trois raisons mesurées :
   *
   * - **`container.source`**, les octets d'origine, existent bien toute la session — c'est
   *   ce qui fait la fidélité à l'octet près — mais les relire demande un décodage, une
   *   analyse, et pour une archive `.xczfg` une décompression **asynchrone**. Un écran
   *   consultable à tout moment ne peut pas dépendre d'une promesse.
   * - **Le premier instantané de l'historique** est privé, et surtout il n'est **pas
   *   éternel** : passé `HISTORY_LIMIT` pas, les plus anciens sont purgés et l'origine part
   *   avec eux (`prunedOrigin`). Le pilote qui travaille une demi-heure — celui à qui ce
   *   relevé s'adresse — est précisément celui qui la perdrait.
   * - **Une copie structurelle** coûte ce que coûte un pas d'historique, sur cent que le
   *   dépôt s'autorise déjà : rien.
   */
  original: JsonNode
  layout: Layout
  settings: RenderSettings
  /** Gabarit d'affichage courant : choisi par le pilote, jamais écrit dans le fichier. */
  device: Device
  /** Nom de l'appareil que le fichier déclare, s'il en désigne un — `deviceIsDeclared`. */
  declaredDevice: string | undefined
  language: string
  /** D'où `language` a été tirée — c'est ce que le bandeau et la boîte des langues disent. */
  labelSource: LabelSource
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
 * `preferences` est une **vue** et non une modale : consulter 217 réglages répartis sur
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
  | { kind: 'manual' }

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
let uiTranslator: Translator | undefined

/**
 * La langue de **notre prose**, celle que le sélecteur règle et que `localStorage` retient.
 *
 * Elle est tenue à côté du traducteur parce qu'un traducteur ne dit pas quelle langue il
 * porte : le sélecteur doit pouvoir marquer l'entrée courante, et `<html lang>` doit dire
 * la vérité à un lecteur d'écran — c'est elle qui décide de la voix qui lira l'interface.
 *
 * ⚠️ À ne pas confondre avec `session.language`, qui est la langue des **libellés de
 * XCTrack** et suit le fichier ouvert. Voir `src/i18n/axes.ts`.
 */
let currentUiLanguage: UiLanguage = initialUiLanguage(
  window.localStorage, [...navigator.languages]
)

/**
 * Ce que le pilote a **explicitement** choisi au globe, ou `undefined` s'il n'a jamais
 * choisi. À ne pas confondre avec `currentUiLanguage`, qui vaut toujours quelque chose :
 * quand rien n'a été choisi, celle-ci est détectée au navigateur, et retombe sur le
 * français si aucune des cinq ne convient.
 *
 * La distinction n'est pas de la coquetterie : c'est elle qui décide de la langue des
 * **libellés** pour un fichier qui n'en déclare aucune — voir `labelFallbackLanguage`
 * (`src/model/preferences.ts`), qui dit pourquoi la langue courante n'y conviendrait pas.
 */
let chosenUiLanguage: UiLanguage | undefined = readUiLanguage(window.localStorage)

/**
 * # Le traducteur, et comment un écran le reçoit
 *
 * **C'est ici qu'il entre dans l'application, et nulle part ailleurs.** Aucun module ne va
 * chercher la langue courante : `main.ts` charge le catalogue au démarrage (voir
 * l'amorçage, tout en bas) et le passe à chaque constructeur, dans son objet d'options,
 * sous le nom `tr` :
 *
 * ```ts
 * renderWidgetList({ page, device, orientation, language, tr: translator(), … })
 * ```
 *
 * Côté module, une ligne dans l'interface d'options :
 *
 * ```ts
 * export interface WidgetListOptions {
 *   readonly tr: Translator
 *   …
 * }
 * ```
 *
 * `language` reste à côté et **ne se confond jamais avec lui** : c'est la langue des
 * libellés de XCTrack, celle du fichier ouvert, quand `tr` porte celle de notre prose,
 * choisie par le pilote. Voir `src/i18n/axes.ts`.
 *
 * ## Pourquoi une fonction et non la variable
 *
 * Le catalogue d'une langue est un morceau téléchargé à part : le traducteur n'existe donc
 * pas pendant que ce fichier s'exécute de haut en bas. Il est en place avant le **premier
 * rendu** — l'amorçage n'appelle `render()` qu'une fois qu'il est arrivé — et tout ce qui
 * suit vient d'un geste du pilote, donc bien après. Cette fonction rend le fait
 * vérifiable : un appel trop tôt lève au lieu d'écrire une interface muette.
 */
function translator(): Translator {
  if (uiTranslator === undefined) {
    throw new Error('traducteur demandé avant la fin de l’amorçage')
  }
  return uiTranslator
}

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
 * Vrai dès que le pilote a touché au bouton de repli, dans un sens ou dans l'autre.
 *
 * Le dépliage automatique de la première sélection est une **amorce**, pas une règle :
 * elle sert tant que le pilote n'a rien dit du bandeau. Sans ce drapeau, elle se
 * rejouait à chaque sélection — un bandeau replié à la main se rouvrait au clic suivant,
 * reprenait les deux tiers bas de la page, et le pilote d'essai l'a décrit comme « un
 * combat contre l'interface ». Le repli doit tenir jusqu'à ce qu'il en décide autrement,
 * et c'est le bouton, et lui seul, qui porte cette décision.
 *
 * Replié, le bandeau ne disparaît pas pour autant : sa barre de tête nomme le gadget
 * sélectionné et son bouton dit ce que le dépliage donnerait. Le pilote garde donc, sans
 * rien reprendre à la page, de quoi savoir sur quoi il agit et comment y revenir.
 */
let dockSetByPilot = false

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
/**
 * La phrase qui dit au pilote que la page entière ne tient pas ici, et ce que coûte chacune
 * des deux issues. Créée une fois avec le bandeau, montrée ou cachée par `syncPlateFit` :
 * elle ne se reconstruit pas à chaque sélection, et le panneau qui se vide en dessous ne
 * l'emporte pas.
 */
let plateFitNote: HTMLElement | undefined
/**
 * Le texte de cette phrase, à part de l'élément qui le porte : le bouton du remède vit
 * dans le **même** paragraphe, et un `textContent =` l'emporterait à chaque mesure.
 */
let plateFitSaid: Text | undefined
/**
 * Le remède, à portée de la phrase qui le nomme.
 *
 * ⚠️ **Mesuré le 2026-08-22, et c'est la raison d'être de ce bouton.** Fenêtre 1024 × 640,
 * `2025-07-07_backup-00.xcfg`, page 3 en consultation, un gadget choisi : la phrase
 * conseillait « le zoom à 100 % », et le bouton « Zoom 100 % » de la barre de zoom se
 * trouvait alors à **24,3 px** du haut de la fenêtre, sous une barre de tête COLLANTE dont
 * le bas est à 56,1 px. `elementFromPoint` en son centre rendait `.app-bar__actions` : le
 * bouton n'était pas seulement haut, il était **inatteignable**. Le pilote d'essai nº 5 l'a
 * relevé au même endroit, à −8 px chez lui.
 *
 * Il ne rétablit pas le zoom : il pose le cran que la phrase vient d'annoncer, en passant
 * par la glissière elle-même — un seul chemin, donc un seul comportement.
 */
let plateFitZoom: HTMLButtonElement | undefined
let listToggle: HTMLButtonElement | undefined
let widgetList: WidgetList | undefined
let widgetListHost: HTMLElement | undefined

/**
 * La dernière annonce du carrousel. Le module la pose dans sa propre zone, que la
 * reconstruction qui suit l'opération emporte : on la garde ici pour la lui rendre.
 *
 * `undoable` voyage avec elle parce que le **bouton du remède** voyage avec elle : il
 * paraît sous les six opérations, qu'« Annuler » reprend toutes, et pas sous ce qui les
 * suit — au premier chef l'annulation elle-même. Voir `PageManagerOptions.onUndo`.
 */
let pagesMessage: { orientation: Orientation; text: string; undoable: boolean } | undefined

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
 * La langue des libellés quand le fichier n'en déclare aucune, et la source qu'il faudra
 * nommer à l'écran. Une seule fonction pour les deux, parce qu'elles répondent à la même
 * question et divergeraient à la première retouche.
 *
 * C'est ici que l'interface fournit au modèle ce qu'il ne peut pas connaître : le choix
 * mémorisé du pilote et la langue du navigateur.
 */
function labelFallback(): { language: string; source: LabelSource } {
  return {
    language: catalogLanguage(labelFallbackLanguage(chosenUiLanguage, navigator.language)),
    source: chosenUiLanguage === undefined ? 'browser' : 'ui'
  }
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

const appRoot = document.querySelector('#app')
if (!(appRoot instanceof HTMLElement)) throw new Error('#app introuvable')
const app: HTMLElement = appRoot

const fileInput = el('input', 'sr-only')
fileInput.type = 'file'
fileInput.accept = '.xcfg,.xczfg'
fileInput.id = 'file-input'

// Les intitulés de la barre de tête sont posés par `installChromeProse`, une fois le
// catalogue de la langue arrivé — voir l'amorçage. Ils changent ensuite avec l'état du
// document (`syncEditControls`).
const exportButton = el('button', 'btn')
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
const editToggle = el('button', 'btn')
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
const preferencesName = el('span', 'app-bar__prefs-name')
preferencesButton.append(gearGlyph(), preferencesName)
preferencesButton.addEventListener('click', () => { openPreferences() })

/**
 * Le globe du sélecteur de langue — **le seul bouton de la barre qui ne porte aucun mot,
 * et le seul qui ne doive pas en porter**.
 *
 * Un pilote qui arrive sur une interface dans une langue qu'il ne lit pas doit pouvoir en
 * sortir sans lire ce qui l'entoure : « Sprache » ne l'aiderait pas plus que « Langue ».
 * Le dessin est donc la commande, et les mots — nom accessible, infobulle, contenu de la
 * boîte — n'arrivent qu'ensuite, pour qui peut les lire. C'est aussi ce qui le rend
 * gratuit en largeur là où la barre est le plus pleine : 30 px de côté, comme « Annuler »
 * et « Rétablir », et non les 118 px du couple dessin + mot des réglages.
 *
 * Il n'est **jamais éteint ni caché** — comme la bibliothèque et le manuel : c'est sans
 * fichier ouvert, sur l'écran d'accueil, qu'il sert le plus.
 */
/** L'adresse du dépôt public, citée aussi par les cinq README et les cinq manuels. */
const REPOSITORY_URL = 'https://github.com/frederict/xcfg-editor'

/**
 * Le chat de GitHub, tracé plein — c'est la marque, elle ne se redessine pas au trait
 * comme les autres pictogrammes de la barre. Chemin officiel, simplifié à 24 unités.
 */
function githubGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('btn__glyph', 'btn__glyph--solid')
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d',
    'M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 ' +
    '0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5' +
    '-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85' +
    '.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75' +
    '-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 ' +
    '2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94' +
    '-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49' +
    'A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2z')
  path.setAttribute('fill', 'currentColor')
  svg.append(path)
  return svg
}

function globeGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('btn__glyph')
  const path = document.createElementNS(ns, 'path')
  // Un cercle, son équateur et un méridien. Les parallèles d'un globe plus détaillé se
  // referment en trois traits gris à 18 px ; ces trois courbes-là restent lisibles, et
  // c'est le dessin que le reste du web emploie pour la langue.
  path.setAttribute('d',
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z' +
    'M3.6 9h16.8M3.6 15h16.8' +
    'M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18Z')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.7')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  svg.append(path)
  return svg
}

const languageButton = el('button', 'btn btn--icon app-bar__lang')
languageButton.type = 'button'
languageButton.append(globeGlyph())
languageButton.addEventListener('click', () => { openLanguageDialog() })

/**
 * Le lien vers le dépôt, dans la barre.
 *
 * **Un `<a>`, pas un bouton** : c'est un lien vers ailleurs, et il doit se comporter comme
 * tel — clic milieu, « ouvrir dans un nouvel onglet », copier l'adresse. Un bouton qui
 * appelle `window.open` prive le pilote de ces trois gestes sans rien lui apporter.
 *
 * `rel="noreferrer"` autant que `noopener` : le second protège l'onglet ouvert, le premier
 * évite d'annoncer à GitHub d'où vient la visite.
 *
 * Le nom accessible dit **où l'on va**, pas ce qu'on voit : « GitHub » seul laisserait un
 * lecteur d'écran annoncer un mot sans destination.
 */
const repositoryLink = el('a', 'btn btn--icon app-bar__repo')
repositoryLink.href = REPOSITORY_URL
repositoryLink.target = '_blank'
repositoryLink.rel = 'noopener noreferrer'
repositoryLink.append(githubGlyph())

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
  /** Pose l'intitulé du bouton et le nom accessible de la liste, une fois la prose là. */
  setLabel: (label: string) => void
  /**
   * Ajoute une entrée et rend son bouton — l'appelant en règle `hidden`, `disabled`, son
   * intitulé et son infobulle. Le menu est bâti avant que le catalogue de la langue soit
   * arrivé : il ne peut donc pas porter ses mots lui-même.
   */
  add: (run: () => void) => HTMLButtonElement
  close: () => void
}

function buildMenu(): Menu {
  const root = el('div', 'menu')
  const button = el('button', 'btn menu__button')
  button.type = 'button'
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  const buttonLabel = el('span')
  button.append(buttonLabel, el('span', 'menu__chevron'))

  const list = el('div', 'menu__list')
  list.setAttribute('role', 'menu')
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
    setLabel: (label) => {
      buttonLabel.textContent = label
      list.setAttribute('aria-label', label)
    },
    close: () => close(),
    add: (run) => {
      const item = el('button', 'menu__item')
      item.type = 'button'
      item.setAttribute('role', 'menuitem')
      item.tabIndex = -1
      item.addEventListener('click', () => { close(true); run() })
      list.append(item)
      return item
    }
  }
}

const menu = buildMenu()

/**
 * Ouvrir un fichier : un bouton du menu, et non plus l'étiquette du champ de fichier.
 * Le champ, lui, reste dans la barre en `sr-only` — c'est la seule façon d'ouvrir un
 * fichier à la tabulation sans passer par le menu, et l'étiquette de la zone de dépôt de
 * l'accueil continue de le désigner.
 */
const openItem = menu.add(() => fileInput.click())

/**
 * La bibliothèque, **jamais éteinte** : c'est la seule commande qui a un sens sans
 * fichier ouvert — on y vient précisément pour reprendre une configuration rangée. La
 * mettre derrière l'ouverture d'un fichier en ferait un trésor enfermé dans son propre
 * coffre.
 */
const libraryButton = menu.add(() => { void openLibrary() })

const versionItem = menu.add(() => openVersionDialog())

/**
 * Le relevé des changements, atteignable **à tout moment** — c'est là toute sa raison
 * d'être. Le pilote d'essai l'a demandé aux deux premières batteries : « avant
 * d'enregistrer une configuration avec laquelle je vais voler, je voudrais la liste ».
 * L'annulation ne nomme que le dernier geste ; une demi-heure de travail ne se relit pas
 * un pas à la fois.
 *
 * Il est dans le menu et non dans la barre parce qu'on ne le consulte pas en continu ;
 * il est dans le **menu** et non dans la seule boîte d'enregistrement parce qu'attendre
 * d'avoir la main sur le bouton d'export pour découvrir ce qu'on a fait est trop tard.
 */
const changesItem = menu.add(() => openChangesDialog())

/*
 * Le manuel. Volontairement **jamais désactivé** — comme la bibliothèque, c'est une
 * commande qui garde son sens sans fichier ouvert, et c'est même là qu'elle sert le
 * plus : un pilote qui découvre l'outil n'a rien à ouvrir, il a besoin qu'on lui dise
 * quoi faire. Il ne figure donc pas dans `syncEditControls`.
 */
const manualItem = menu.add(() => openManual())

const bar = el('header', 'app-bar')
const brand = el('div', 'brand')
/**
 * Le badge de mode. Il ne dit qu'**une** chose, et seulement quand elle est vraie :
 * « édition ». Un badge présent en permanence devient du décor, et celui qui annonçait
 * « visionneuse » au repos décrivait l'outil au lieu de décrire l'état — un pilote venu
 * préparer ses écrans y lisait que l'outil ne les modifiait pas.
 */
const brandRole = el('span', 'brand__role')
brandRole.hidden = true
const brandName = el('span', 'brand__name')
brand.append(brandName, brandRole)
const actions = el('div', 'app-bar__actions')
actions.append(
  fileName, undoButton, redoButton, languageButton, repositoryLink, preferencesButton,
  editToggle, menu.root, fileInput, exportButton
)
/**
 * Le reçu d'enregistrement — la seule trace visible du geste par lequel tout le travail
 * sort de cet outil.
 *
 * **Le défaut qu'il répare, mesuré le 22 août.** « Enregistrer », la boîte se ferme, et
 * plus un mot : le pilote d'essai a dû aller fouiller son dossier de téléchargements pour
 * savoir s'il avait son fichier. Pire, l'échec ressemblait trait pour trait au succès —
 * relevé sur Chrome, trois enregistrements de suite depuis la même page : **le premier
 * arrive, les suivants sont refusés sans un mot**, ni exception, ni événement, ni entrée
 * dans le gestionnaire de téléchargements. Rien, côté page, ne distingue les deux.
 *
 * **Pourquoi c'est un reçu et non une confirmation.** Cet outil ne peut pas savoir que le
 * fichier est arrivé ; il sait ce qu'il a fabriqué et ce qu'il a demandé au navigateur.
 * C'est donc cela qu'il dit — le nom, la taille, la demande —, et rien de plus. Une phrase
 * qui affirmerait « c'est enregistré » serait fausse une fois sur deux ; « est parti », que
 * ce reçu a portée deux heures, l'était de la même façon — plus discrètement, ce qui est
 * pire. Contre-essai du 22 août à midi : **zéro fichier sur trois** dans un onglet où le
 * reçu avait dit trois fois que le fichier partait.
 *
 * **Pourquoi il vit DANS la barre de tête.** La barre est collante ; une bande posée sous
 * elle serait hors champ dès que le pilote a fait défiler sa page — c'est-à-dire presque
 * toujours après vingt minutes de travail. Une ligne entière de la barre (`flex-basis:
 * 100%` dans une barre déjà `flex-wrap: wrap`) voyage avec elle. Et ce n'est pas une
 * modale : le pilote n'a rien à fermer pour continuer.
 */
const receipt = el('div', 'app-bar__receipt')
receipt.hidden = true
// `status` et non `alert` : un enregistrement qui réussit est la situation normale, et une
// alerte sur une situation normale apprend à ignorer les alertes.
receipt.setAttribute('role', 'status')

bar.append(brand, actions, receipt)

const content = el('main', 'content')

/**
 * Barre d'outils d'affichage, hors de `content` : `render()` vide `content` à chaque
 * dessin, et le sélecteur de gabarit doit survivre — il porte un état (appareil
 * personnalisé en cours de saisie, champs « Responsive ») que le vider effacerait.
 */
const tools = el('div', 'tools')
tools.hidden = true

const veil = el('div', 'veil')
const veilText = el('span', 'veil__text')
veil.append(veilText)

/**
 * Les mots du cadre — barre de tête, menu, voile de dépôt —, posés quand le catalogue de
 * la langue est arrivé, **et reposés à chaque changement de langue**.
 *
 * Ces éléments sont bâtis pendant que ce fichier s'exécute de haut en bas, donc avant le
 * traducteur : ils naissent muets. Ce qui change ensuite avec l'état du document est
 * repris par `syncEditControls`, et non ici.
 *
 * C'est aussi ici que `<html lang>` est réglé : l'attribut vaut « fr » dans `index.html`
 * et mentirait dès le premier pilote néerlandophone — un lecteur d'écran prononcerait le
 * néerlandais à la française. Il suit donc la langue de **notre prose**, jamais celle des
 * libellés de XCTrack : c'est bien cette page-ci qui est lue à voix haute.
 */
function installChromeProse(tr: Translator): void {
  document.documentElement.lang = currentUiLanguage
  brandName.textContent = tr.t('app.name')
  brandRole.textContent = tr.t('app.editingRole')
  veilText.textContent = tr.t('app.dropVeil')

  preferencesName.textContent = tr.t('app.settings')
  preferencesButton.title = tr.t('app.settingsHint')

  // Le bouton ne porte qu'un globe : la phrase entière est son nom accessible, comme pour
  // « Annuler » et « Rétablir ». Elle nomme l'axe — « Langue de l'interface » — et non la
  // seule idée de langue, sans quoi elle laisserait croire qu'elle règle aussi les
  // libellés de XCTrack, que le bandeau du fichier annonce quelques centimètres plus bas.
  const named = tr.t('app.uiLanguageNamed', { name: UI_LANGUAGE_ENDONYMS[currentUiLanguage] })
  languageButton.setAttribute('aria-label', named)
  languageButton.title = `${named}\n${tr.t('app.uiLanguageHint')}`
  // Le lien du dépôt ne porte qu'un dessin : sans nom accessible, un lecteur d'écran
  // n'annoncerait que « lien ». Il suit la langue comme le reste de la barre.
  repositoryLink.setAttribute('aria-label', tr.t('app.repository'))
  repositoryLink.title = tr.t('app.repository')

  menu.setLabel(tr.t('menu.file'))
  openItem.textContent = tr.t('menu.openFile')
  openItem.title = tr.t('menu.openFileHint')
  libraryButton.textContent = tr.t('menu.library')
  libraryButton.title = tr.t('menu.libraryHint')
  versionItem.textContent = tr.t('menu.version')
  versionItem.title = tr.t('menu.versionHint')
  changesItem.textContent = tr.t('menu.changes')
  changesItem.title = tr.t('menu.changesHint')
  manualItem.textContent = tr.t('menu.manual')
  manualItem.title = tr.t('menu.manualHint')
  // Le reçu est de la prose lui aussi : sans cette ligne, un pilote qui change de langue
  // juste après avoir enregistré garderait la phrase de l'ancienne sous les yeux.
  renderReceipt()
}

/* ------------------------------------------------- le reçu : ce qui vient d'être remis */

/** Ce que le dernier enregistrement a produit, gardé pour pouvoir le redire tel quel. */
interface DeliveryReceipt {
  readonly fileName: string
  readonly byteLength: number
}

let lastReceipt: DeliveryReceipt | undefined

/**
 * L'URL du dernier fichier remis, gardée en vie.
 *
 * L'ancien code révoquait l'URL **dans la milliseconde** qui suivait `link.click()` —
 * relevé à l'horloge : même valeur de `performance.now()` pour le clic et la révocation.
 * Le navigateur n'a alors aucune garantie d'avoir fini de lire le `Blob`. La révocation
 * attend donc l'enregistrement suivant : un seul objet vit à la fois, et plus rien ne
 * court après le clic.
 */
let deliveredUrl: string | undefined

function renderReceipt(): void {
  receipt.textContent = ''
  if (lastReceipt === undefined) {
    receipt.hidden = true
    return
  }
  const tr = translator()
  receipt.hidden = false
  const said = el('div', 'app-bar__receiptSaid')
  said.append(el('p', 'app-bar__receiptText', tr.t('app.exportHandedOver', {
    name: lastReceipt.fileName,
    size: tr.format.byteSize(lastReceipt.byteLength)
  })))
  // ⚠ Elle paraît à CHAQUE enregistrement, le premier compris. Elle était réservée au
  // deuxième, sur la foi d'un « le premier passe toujours » que le contre-essai a démenti :
  // trois enregistrements, zéro fichier, et le pilote qui n'en fait qu'un n'aurait rien lu.
  // Ce n'est pas pour autant un avertissement — voir `app.exportWhereToLook` : elle dit où
  // regarder, pas qu'il y a un problème.
  said.append(el('p', 'app-bar__receiptHint', tr.t('app.exportWhereToLook')))
  receipt.append(said)
  const dismiss = el('button', 'btn btn--ghost app-bar__receiptClose', tr.t('app.close'))
  dismiss.type = 'button'
  dismiss.setAttribute('aria-label', tr.t('app.exportReceiptDismiss'))
  dismiss.addEventListener('click', () => { clearReceipt() })
  receipt.append(dismiss)
}

/**
 * Le reçu s'efface. L'URL du fichier, elle, **survit** : le navigateur peut encore être
 * en train de la lire, et le pilote qui referme le reçu ne demande pas d'annuler son
 * téléchargement.
 */
function clearReceipt(): void {
  lastReceipt = undefined
  receiptShownAt = undefined
  receiptView = undefined
  renderReceipt()
}

/**
 * L'instant où le reçu courant est apparu — `performance.now()`, jamais l'horloge murale :
 * il ne s'agit que de mesurer une durée écoulée, et l'heure système peut reculer.
 */
let receiptShownAt: number | undefined

/**
 * L'écran sur lequel le reçu est né, et la seule chose qui puisse le périmer d'un coup.
 *
 * `viewSignature()` rend une chaîne : `overview`, `detail:landscape:2`, `preferences`.
 * Deux vues différentes ne peuvent pas rendre la même, et rien d'autre qu'un changement
 * de vue ne la fait bouger — ni le gabarit d'écran, ni le zoom, ni une modification du
 * document. Voir `RECEIPT_READ_MS` pour ce que ce repère sert à trancher.
 */
let receiptView: string | undefined

function viewSignature(): string {
  switch (view.kind) {
    case 'detail': return `detail:${view.orientation}:${String(view.index)}`
    default: return view.kind
  }
}

/**
 * Le temps qu'il faut pour LIRE le reçu, avant que le geste suivant ait le droit de
 * l'effacer.
 *
 * ⚠ Ce nombre est un compte **mesuré** multiplié par une vitesse **supposée**, et les deux
 * se disent séparément.
 *
 * Mesuré : le reçu complet — les deux phrases, nom de fichier et taille compris — vaut
 * 42 mots en français, 41 en allemand et en néerlandais, 40 en anglais, 39 en espagnol.
 * Le français est le plus long des cinq ; c'est lui qui décide.
 *
 * Supposé : 130 mots par minute. C'est une vitesse de lecture lente, choisie exprès —
 * l'usage courant place la lecture silencieuse d'un texte suivi entre 200 et 260 mots par
 * minute, mais ce reçu-ci n'est pas un texte suivi : il contient un nom de fichier
 * horodaté et une taille, qui se lisent signe à signe et non d'un coup d'œil. 42 mots à
 * 130 mots/minute font 19,4 secondes, arrondies à 20.
 *
 * ⚠ Ce délai n'efface JAMAIS le reçu tout seul. Il ne fait qu'autoriser le geste suivant
 * du pilote à l'effacer : rien ne disparaît pendant qu'on lit, rien ne disparaît pendant
 * qu'on est parti regarder dans ses téléchargements, et qui revient à l'écran le retrouve.
 * C'est aussi ce qui met ce comportement hors du champ du critère « délai ajustable » :
 * il n'y a pas de délai au bout duquel quelque chose se produit.
 *
 * ⚠ **Il ne vaut que pour l'écran où le reçu est né** — voir `receiptView`. Relevé le
 * 2026-08-22, 1024 × 640, `2025-07-07_backup-00.xcfg`, page 2 en consultation : un
 * enregistrement, puis un clic réel sur « Page suivante » avant les 20 secondes. La page
 * passait bien de 2 à 3, et le reçu restait — « un reçu qui nomme un fichier enregistré
 * depuis la page précédente flotte toujours en tête d'écran », essai pilote nº 5. Le temps
 * de lecture protège la lecture de l'écran qu'on a sous les yeux ; il n'a rien à protéger
 * sur un écran qu'on vient de quitter.
 */
const RECEIPT_READ_MS = 20_000

/**
 * Le reçu s'efface au geste suivant du pilote — et pas avant de l'avoir lu.
 *
 * Le pilote d'essai du 22 août : « il était encore là six minutes plus tard », après être
 * allé ouvrir le manuel. Le reçu vit dans la barre de tête, qui est COLLANTE : en
 * 1024 × 640 il la porte de 56,1 px à 139,9 et ne laisse plus que 326,1 px à une plaque
 * paysage qui en demande 361,5. Tant qu'il est là, la page ne rentre pas — c'est
 * démontré au pied de `.app-bar__receipt`, dans `app.css` : aucune mise en forme ne suffit.
 *
 * Le geste suivant est donc ce qui l'efface, et non une horloge. Un pilote qui a cliqué
 * ailleurs a fini d'en avoir besoin ; un pilote qui n'a rien fait ne s'est peut-être pas
 * encore retourné vers son écran. Le défilement n'en est pas un : la molette ne dit pas
 * qu'on a lu, et c'est justement en défilant que le pilote cherche sa page.
 */
function dismissReceiptOnNextMove(): void {
  if (lastReceipt === undefined || receiptShownAt === undefined) return
  if (performance.now() - receiptShownAt < RECEIPT_READ_MS) return
  clearReceipt()
}

/**
 * L'autre moitié du recensement : **le reçu ne survit pas à l'écran qu'il nommait**.
 *
 * Appelée par `render()`, c'est-à-dire par le seul passage obligé de tout changement de
 * vue — page suivante, page précédente, retour à la vue d'ensemble, ouverture d'une page
 * depuis le carrousel, réglages généraux, manuel. Il n'y a donc rien à recenser geste par
 * geste, et rien à oublier : la question est posée à la vue, pas aux boutons qui la
 * changent. Le reste des gestes — choisir un gadget, déplier le bandeau, changer de
 * gabarit — laisse la vue en place et retombe sur `dismissReceiptOnNextMove`.
 *
 * Le temps de lecture ne s'applique pas ici, et c'est le fond de l'affaire : il protège la
 * lecture d'un reçu sur l'écran où il est apparu. Quitter cet écran est déjà la réponse.
 */
function dismissReceiptOnViewChange(): void {
  if (lastReceipt === undefined || receiptView === undefined) return
  if (receiptView === viewSignature()) return
  clearReceipt()
}

/*
 * En capture, sur le document entier : un seul point d'accroche vaut mieux que le geste
 * par geste, qui en oublie toujours un. Ce qui part du reçu lui-même ne compte pas —
 * cliquer « Fermer » passe déjà par `clearReceipt`, et viser le texte pour le sélectionner
 * n'est pas passer à autre chose.
 *
 * ⚠ **`pointerdown` en a été retiré le 2026-08-22, et il ne doit pas y revenir : il
 * mangeait le geste qu'il recensait.** Le reçu vit dans la barre COLLANTE ; le retirer
 * remonte tout ce qui suit. Relevé en 1024 × 640 sur `2025-07-07_backup-00.xcfg`,
 * page 3 : « Page suivante » à 234,5 px du haut avec le reçu, à 144,3 sans lui — 90,2 px
 * d'écart, posés entre le `pointerdown` et le `mouseup`. Le navigateur recalcule alors la
 * cible du relâchement, n'émet plus aucun `click` sur le bouton, et **la page ne tourne
 * pas** : le premier clic effaçait le reçu, le second seulement changeait de page. Vérifié
 * deux fois, aux pages 1 et 3.
 *
 * `click` et `keydown` n'ont pas ce défaut : leur cible est arrêtée avant qu'aucune
 * écoute ne s'exécute. Et ils ne laissent rien dehors — un glissement de gadget émet un
 * `click` en fin de course malgré le `preventDefault()` du `pointerdown` (`editor.ts`),
 * et une activation au clavier passe par les deux. Le défilement, lui, reste hors du
 * recensement : la molette ne dit pas qu'on a lu.
 */
for (const kind of ['keydown', 'click'] as const) {
  document.addEventListener(kind, (event) => {
    if (event.target instanceof Node && receipt.contains(event.target)) return
    dismissReceiptOnNextMove()
  }, true)
}

/**
 * Le cadre entre dans le document **une seule fois**, quand sa prose vient d'être posée :
 * un pilote ne doit pas voir une seconde de boutons vides avant sa langue.
 *
 * Séparé de `installChromeProse` parce que celui-ci se rejoue à chaque changement de
 * langue : réaccrocher les quatre mêmes éléments les déplacerait en fin de `#app`, et
 * l'ordre ne tiendrait plus le jour où un cinquième s'y ajouterait ailleurs.
 */
function attachChrome(): void {
  app.append(bar, tools, content, veil)
}

/* --------------------------------------------------------------------------- vues */

function landing(): HTMLElement {
  const tr = translator()
  const panel = el('section', 'landing')
  panel.append(
    el('h1', 'landing__title', tr.t('landing.title')),
    el('p', 'landing__lead', tr.t('landing.lead')),
    // Les deux garanties qui décident un pilote à confier sa configuration de vol à un
    // site web. Elles étaient jusqu'ici portées par le mot « visionneuse », qui les liait
    // à une promesse fausse : elles valent aussi quand on modifie, puisqu'on ne réécrit
    // que ce qu'on a changé.
    el('p', 'landing__lead', tr.t('landing.privacy'))
  )

  const dropzone = el('label', 'dropzone')
  dropzone.htmlFor = fileInput.id
  dropzone.append(
    el('span', 'dropzone__strong', tr.t('landing.dropHere')),
    el('span', undefined, tr.t('landing.dropOrPick'))
  )
  panel.append(dropzone)

  const steps = el('ul', 'landing__steps')
  const items: [string, string][] = [
    [tr.t('landing.stepDeviceTitle'), tr.t('landing.stepDeviceText')],
    [tr.t('landing.stepHereTitle'), tr.t('landing.stepHereText')],
    [tr.t('landing.stepEditTitle'), tr.t('landing.stepEditText')],
    [tr.t('landing.stepKnowTitle'), tr.t('landing.stepKnowText')]
  ]
  for (const [title, detail] of items) {
    const step = el('li', 'landing__step')
    step.append(el('span', 'landing__step-title', title), el('span', 'landing__step-text', detail))
    steps.append(step)
  }
  panel.append(steps)

  /*
   * Le manuel, et pourquoi il n'est plus un bouton fantôme en bas de page.
   *
   * L'accueil est l'écran de quelqu'un qui **n'a rien ouvert** : ou bien il sait quoi
   * faire et dépose son fichier, ou bien il ne sait pas — et le manuel est alors la seule
   * chose dont il ait besoin. Il portait jusqu'ici le style le plus effacé du projet
   * (`.btn--ghost`, fait pour une commande secondaire dans un bandeau), sous une note qui
   * parle de la bibliothèque : le dernier élément d'un écran, pour ce qui répond à la
   * seule question que ce visiteur-là se pose.
   *
   * Il remonte donc AVANT cette note, et devient un encadré du carnet — filet d'ambre à
   * gauche, une phrase qui dit ce qu'on y trouve, un vrai bouton bordé.
   *
   * ⚠ Il reste **secondaire devant le dépôt d'un fichier**, qui est ce que cette page
   * existe pour provoquer : pas d'aplat encré, pas de bouton principal. Deux appels de
   * même poids sur un écran vide, c'est aucun appel.
   */
  const manual = el('aside', 'landing__manual')
  const help = el('button', 'btn landing__manual-btn', tr.t('landing.readManual'))
  help.type = 'button'
  help.addEventListener('click', () => openManual())
  manual.append(el('p', 'landing__manual-text', tr.t('landing.manualLead')), help)
  panel.append(manual)

  // Sans cette phrase, un pilote revenu le lendemain ne voit qu'une invitation à ouvrir un
  // fichier et ne devine pas que ses configurations rangées l'attendent dans la barre.
  panel.append(el('p', 'landing__note', tr.t('landing.returning')))
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
  box.append(el('summary', 'problem__detailSummary', translator().t('app.technicalDetail')))
  box.append(el('p', 'problem__detailText', detail))
  return box
}

function metaStrip(current: Session): HTMLElement {
  const tr = translator()
  const strip = el('div', 'meta')
  const add = (label: string, value: string): void => {
    const item = el('div', 'meta__item')
    item.append(el('span', 'meta__label', label), el('span', 'meta__value', value))
    strip.append(item)
  }
  // Le nom du fichier est déjà dans la barre de tête : ne pas le répéter ici.
  // ⚠️ Une archive **dit ce qu'elle transporte**. Elle ne le disait pas, et un
  // pilote-testeur a dû l'ouvrir lui-même le 2026-08-22 pour trancher : à côté de quatre
  // fichiers extérieurs annoncés « pas dans cette configuration », un `.xczfg` muet laisse
  // croire à une contradiction. Celui-là ne portait que son `.xcfg` — mais rien dans
  // l'outil ne permettait de le savoir, et celui qui exporte « avec les médias » repart
  // convaincu que son thème de carte a voyagé. Le compte est LU dans le conteneur.
  // La fiche de bibliothèque le disait déjà (`library.containerArchive`) ; l'écran qu'on a
  // sous les yeux en ouvrant le fichier, non.
  const annexes = current.container.extras.length
  add(tr.t('app.metaFormat'), current.container.kind !== 'xczfg'
    ? tr.t('app.containerPlain')
    : annexes === 0
      ? tr.t('app.containerArchiveAlone', { inner: current.container.innerName })
      : tr.t('app.containerArchiveWith', {
        inner: current.container.innerName,
        annexes: tr.t('app.annexCount', { count: annexes })
      }))
  // Ce que le fichier dit de l'appareil, distinct du gabarit d'affichage choisi
  // au-dessus : l'un est une donnée, l'autre un réglage de la visionneuse.
  add(tr.t('app.metaDevice'), current.declaredDevice ?? tr.t('app.notDeclared'))
  // L'intitulé nomme son axe — « Libellés de XCTrack » et non « Libellés » : depuis qu'un
  // sélecteur règle la langue de l'interface, un pilote qui vient d'en changer lirait ici
  // une langue inchangée et croirait le sélecteur en panne. La mention et la boîte des
  // langues disent la même chose, par la même fonction (`labelLanguageMention`).
  add(tr.t('app.metaLabels'), labelLanguageMention(tr, current))
  if (current.settings.fromDefaults) {
    add(tr.t('app.metaRenderSettings'), tr.t('app.renderSettingsAssumed'))
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

/**
 * Familles qui décrivent un défaut, et non un simple fait sur le fichier.
 *
 * La même liste que celle dont `splitWarnings` se sert pour choisir le panneau : elle
 * était recopiée ici, et deux copies auraient fini par désigner un encadré rangé dans la
 * ligne repliée mais peint comme une alerte. Le liséré suit le panneau, toujours.
 */
const ATTENTION_KINDS = ATTENTION_WARNING_KINDS

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
      box.append(el('summary', 'warning__summary', translator().t('app.seeDetail', {
        count: warning.items.length
      })), list)
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
  panel.append(el('h2', 'warnings__title', translator().t('app.attentionTitle')))
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
    el('span', 'remarks__count', remarksSummary(warnings.length, translator())),
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
  notice.append(el('h3', 'warnings__title', translator().t('app.revealsTitle')))
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
  const tr = translator()
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
    ? tr.t('app.inspect')
    : (onPreferences ? tr.t('app.editSettings') : tr.t('app.editPages'))
  editToggle.title = editMode
    ? tr.t('app.inspectHint')
    : (onPreferences ? tr.t('app.editSettingsHint') : tr.t('app.editPagesHint'))
  editToggle.setAttribute('aria-pressed', String(editMode))

  undoButton.hidden = !editMode || !editable
  redoButton.hidden = !editMode || !editable
  undoButton.disabled = history?.canUndo() !== true
  redoButton.disabled = history?.canRedo() !== true
  const undoLabel = history?.undoDescription()
  const redoLabel = history?.redoDescription()
  // Le bouton ne porte qu'une flèche : la phrase entière est son nom accessible, et non
  // une simple infobulle — un lecteur d'écran annoncerait sinon « bouton », rien de plus.
  const undoName = undoLabel === undefined
    ? tr.t('action.undoNothing')
    : tr.t('action.undoNamed', { what: undoLabel })
  const redoName = redoLabel === undefined
    ? tr.t('action.redoNothing')
    : tr.t('action.redoNamed', { what: redoLabel })
  undoButton.title = undoName
  redoButton.title = redoName
  undoButton.setAttribute('aria-label', undoName)
  redoButton.setAttribute('aria-label', redoName)

  // Les deux lectures du menu ne parlent que d'un fichier ouvert. Éteintes sans fichier,
  // elles disent qu'elles existent sans mentir sur ce qu'elles feraient — les cacher
  // ferait croire que le menu change de contenu d'un écran à l'autre.
  const readable = session !== undefined && session.container.parseError === undefined
  versionItem.disabled = !readable
  // Le relevé n'est pas éteint quand il est vide : c'est précisément le cas qui rassure —
  // « rien n'a changé » est une réponse, et un bouton éteint ne la donnerait pas.
  changesItem.disabled = !readable

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
  exportButton.textContent = modified ? tr.t('app.saveChanges') : tr.t('app.saveCopy')
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
  if (!page) return

  // La liste dit la taille de chaque gadget en millimètres, et sa place dans la vignette :
  // un redimensionnement les périme toutes deux à l'instant même. Elle annonçait jusqu'ici
  // l'ancienne taille jusqu'au prochain `render()` complet — c'est-à-dire, le plus
  // souvent, jusqu'au changement de page. Remise à jour ici, elle suit le geste sans que
  // le pilote perde le focus de sa ligne : voir `WidgetList.refresh`.
  widgetList?.refresh(page)

  const plate = content.querySelector('.plate')
  const drawing = plate?.firstElementChild
  if (!plate || !drawing) return
  plate.replaceChild(
    renderPage(page, aspectRatioOf(session.device, orientation), session.settings, session.language, translator()),
    drawing
  )
  // Le nombre de widgets est un fait de la vue, et une action de structure vient peut-être
  // de le changer : il se remet à jour ici, faute de quoi la page dirait « 14 widgets »
  // alors qu'on vient d'en poser un quinzième.
  const count = content.querySelector('.chip--count')
  if (count) {
    count.textContent = translator().t('common.widgetCount', { count: page.widgets.length })
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
  const tr = translator()
  const settings = tr.t('dock.settingCount', { count: form.fields.length })
  dockCount.textContent = editMode || !form.defaultsKnown
    ? settings
    // En consultation, le compte qui compte n'est pas le nombre de lignes : c'est ce que
    // le pilote a effectivement changé. Il est dit dès la barre de tête, qui survit au
    // repli du bandeau.
    : tr.t('dock.countPair', {
      settings,
      customized: tr.t('dock.customizedCount', { count: form.customizedCount })
    })
}

function onPropertyChange(field: PropertyField, widget: Widget, fresh?: PropertyForm): void {
  if (!session) return
  session.container.modified = true
  if (fresh) updateDockCount(fresh, true)
  const label = field.label === '' ? field.path : field.label
  const description = translator().t('app.setSettingNamed', {
    label,
    name: readableName(widget.shortName, session.language)
  })
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
 * Le drapeau « Pro » d'un type de gadget, pour la règle du contrôle avant vol qui
 * demande ce que XCTrack fera d'un gadget Pro dans un fichier sans licence déclarée.
 *
 * Il vit dans le même catalogue que la palette, et il ne dépend pas de la langue — c'est
 * un drapeau du type, pas un libellé, comme le dit déjà `loadLibraryKit`. **Un seul
 * chargement suffit donc pour toute la session**, quelle que soit la langue du fichier
 * ouvert ensuite.
 *
 * Tant qu'il n'est pas arrivé, `inspectLayout` **n'évalue pas la règle du tout** plutôt
 * que de deviner : c'est son contrat, et c'est pourquoi le premier rendu peut se faire
 * sans elle. Le rendu que déclenche `loadBytes` quand le morceau arrive la porte.
 */
let isProWidget: ((shortName: string) => boolean) | undefined
let proWidgetLoading: Promise<void> | undefined

function loadProWidgets(language: string): Promise<void> {
  proWidgetLoading ??= loadWidgetCatalog(language)
    .then((catalog) => { isProWidget = catalog.isProWidget })
    // Un catalogue qui n'arrive pas ne doit pas priver le pilote des six autres règles.
    // La règle Pro reste alors muette, ce qui est exactement ce qu'elle promet.
    .catch(() => undefined)
  return proWidgetLoading
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
  // Chaque modèle voyage avec sa page. Sans elle, la palette dit « ailleurs » — un pilote
  // qui a neuf pages ne sait alors pas ce qu'il prend, et c'est ce qu'il a signalé.
  const elsewhere: ForeignWidget[] = []
  if (page) for (const widget of page.widgets) onPage.push(widget.node)
  for (const orientation of ['landscape', 'portrait'] as const) {
    current.layout[orientation].forEach((other, index) => {
      if (other === page) return
      for (const widget of other.widgets) {
        elsewhere.push({ node: widget.node, page: { orientation, rank: index + 1 } })
      }
    })
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

  const tr = translator()
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('app.addWidget')))
  const close = el('button', 'btn', tr.t('app.close'))
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
    box.append(el('p', 'hint-note', tr.t('app.pageHasNoWidgetSlot')))
    dialog.append(box)
    return
  }

  const module = paletteModule
  const catalog = paletteCatalogs.get(session.language)
  if (module === undefined || catalog === undefined) {
    // « palette » ne nomme rien que le pilote ait vu : le bouton qui ouvre cette boîte
    // s'appelle « Ajouter un gadget ».
    box.append(el('p', 'hint-note', tr.t('app.loading')))
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
    tr: translator(),
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
  dialog.setAttribute('aria-label', translator().t('app.addWidget'))
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
    // `ceiling` et non le plafond de fenêtre de `app.css` : celui-ci ne borne que la
    // hauteur **par défaut**, jamais une hauteur réglée à la poignée (`.dock--sized`) —
    // c'est le pilote qui arbitre entre voir sa page et voir ses réglages. Annoncer le
    // plafond du défaut ferait donc mentir la poignée sur ce qu'elle peut atteindre.
    dockGrip.setAttribute('aria-valuemax', String(ceiling))
    dockGrip.setAttribute('aria-valuenow', String(height))
    dockGrip.setAttribute('aria-valuetext', translator().t('dock.heightPixels', { count: height }))
  }
}

function setDockHeight(height: number): void {
  dockHeight = clampDockHeight(height, window.innerHeight)
  applyDockHeight()
}

/**
 * Ce que la barre de tête collante et l'enveloppe du bandeau prennent à la page, **mesuré**
 * et reposé en pixels dans `--dock-chrome-room`. `app.css` s'en sert pour borner le corps du
 * bandeau sur ce qu'il LAISSE à la page (`--dock-page-room`, voir `.dock__body`).
 *
 * **Pourquoi une mesure et non deux constantes.** Les deux hauteurs ont d'abord été écrites
 * en dur dans la feuille — 56 px de barre de tête, 62 px d'enveloppe, relevés en fenêtre de
 * 1024 px de large — et aucune des deux n'est constante :
 *
 * - à la **première modification**, le bouton d'enregistrement passe de « Enregistrer une
 *   copie » à « Enregistrer les modifications » ; la ligne d'actions gagne 45 px, ne tient
 *   plus à côté de la marque dans les 976 px utiles de la barre, et le `flex-wrap: wrap`
 *   d'`.app-bar` la renvoie à la ligne : **56 px deviennent 100,6** ;
 * - le **reçu d'enregistrement** vit dans cette même barre collante et y prend une ligne
 *   entière à lui ;
 * - la **tête du bandeau** se replie à son tour sous 700 px de large : 62 px deviennent 106.
 *
 * Mesuré le 22 août, fenêtre 1024 × 640, mode édition : le premier de ces trois faits
 * suffisait à ramener la bande dégagée de 369,9 px à 325,4 pour une plaque de 361,5 —
 * « au mieux 330 px sur 361 », a dit le pilote d'essai. La feuille ne peut pas lire ces
 * hauteurs elle-même ; ce chemin-ci les lui donne.
 */
function publishDockChrome(): void {
  if (dockElement === undefined || dockBody === undefined) return
  const body = dockBody.getBoundingClientRect().height
  // Bandeau replié : le corps est escamoté et l'enveloppe mesurée serait le bandeau entier.
  // Il n'y a alors plus de corps à borner, et la dernière mesure valable reste la bonne.
  if (body === 0) return
  const envelope = dockElement.getBoundingClientRect().height - body
  const room = Math.ceil(bar.getBoundingClientRect().height + envelope)
  document.documentElement.style.setProperty('--dock-chrome-room', `${room}px`)
}

/**
 * Les trois boîtes dont la hauteur décide de cette place : la barre de tête (son reçu, le
 * repli de sa ligne d'actions), la tête du bandeau (son repli à elle) et le corps du bandeau
 * (que le repli escamote, et que la mesure fait varier en retour).
 *
 * Ce dernier ferme une boucle, et elle converge : l'enveloppe vaut `bandeau − corps`, quantité
 * que la hauteur du corps ne change pas. La deuxième passe repose donc la même valeur, aucun
 * style ne bouge, et l'observateur se tait.
 */
const dockChromeWatch = new ResizeObserver(() => {
  publishDockChrome()
  // La phrase du bandeau suit la géométrie, et c'est ici que la géométrie change : le
  // bouton d'enregistrement qui renvoie la barre de tête à la ligne, le reçu qui s'ouvre,
  // la poignée qu'on tire. Elle paraît et s'efface avec la cause, sans attendre le
  // prochain clic sur un gadget.
  syncPlateFit()
})

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
  const tr = translator()
  const grip = el('div', 'dock__grip')
  grip.tabIndex = 0
  grip.setAttribute('role', 'separator')
  grip.setAttribute('aria-orientation', 'horizontal')
  grip.setAttribute('aria-label', tr.t('dock.gripLabel'))
  grip.title = tr.t('dock.gripHint')

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
window.addEventListener('resize', () => { applyDockHeight(); syncPlateFit() })

/**
 * Le bandeau, replié ou déployé. Replié, il ne laisse que sa barre de tête : le nom du
 * widget sélectionné et le bouton pour la rouvrir — de quoi savoir sur quoi on agit sans
 * rien prendre à la page.
 */
function syncDock(): void {
  if (!dockElement || !dockToggle || !panelHost) return
  const tr = translator()
  dockElement.classList.toggle('dock--collapsed', dockCollapsed)
  // Replié, le bandeau emporte la liste des widgets avec ses réglages — et la liste est
  // le seul chemin vers les widgets qu'aucun clic n'atteint. Sans sélection, le bouton
  // nomme donc ce que le dépliage donne à cet instant : la liste, pas des réglages qui
  // n'existent pas encore.
  dockToggle.textContent = dockCollapsed
    ? (selection === undefined ? tr.t('dock.widgetList') : tr.t('dock.expandSettings'))
    : tr.t('dock.collapse')
  dockToggle.setAttribute('aria-expanded', String(!dockCollapsed))
  // Replié, c'est le corps entier qui disparaît : ses deux zones, et la place qu'il prend.
  if (dockBody) dockBody.hidden = dockCollapsed
  // Replié, il n'y a plus de hauteur à régler : la poignée sort aussi de la tabulation.
  // La hauteur choisie, elle, est intacte et revient telle quelle au dépliage.
  if (dockGrip) dockGrip.hidden = dockCollapsed
  if (widgetListHost) widgetListHost.hidden = listHidden
  if (listToggle) {
    listToggle.hidden = dockCollapsed
    listToggle.textContent = listHidden ? tr.t('dock.showList') : tr.t('dock.hideList')
    listToggle.setAttribute('aria-pressed', String(!listHidden))
  }
}

/**
 * Le bandeau s'ouvre parce qu'il a enfin quelque chose à montrer. Appelé sur les gestes
 * de sélection du pilote — clic sur la page, ligne de la liste — et sur eux seuls : un
 * bandeau replié à la main ne doit pas se rouvrir au prochain `render()`.
 *
 * Ni au prochain clic, d'ailleurs : `dockSetByPilot` arrête ce dépliage dès que le pilote
 * s'est prononcé. Une préférence de l'outil ne discute pas avec un geste de l'utilisateur.
 */
function openDockForSelection(): void {
  if (dockSetByPilot || !dockCollapsed) return
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

/**
 * La bande que le défilement ne peut PAS dégager : ce qui reste collé quoi qu'on fasse.
 *
 * Différence avec `visibleBand`, et elle compte : celle-ci retient aussi le bandeau des
 * gabarits d'écran (`.tools`) quand il est encore à l'image. Or `.tools` n'est pas
 * collant — il est dans le flux, au-dessus de la page, et le défilement l'emporte. Le
 * compter revient à refuser un défilement au motif qu'il n'a pas encore eu lieu.
 *
 * Mesuré, fenêtre 1024 × 640, un premier gadget choisi depuis le haut de la page :
 * `visibleBand` rend 306,7 px — 56,1 de barre de tête, plus les 56 px de `.tools` — pour
 * une plaque de 361,5, donc « elle ne tient pas ». La bande collante, elle, en rend 362,8,
 * et la plaque tient. Sans cette distinction, le cadrage de la page ne se déclenchait qu'au
 * DEUXIÈME gadget choisi, une fois `.tools` défilé hors de vue : plaque vue à 34,4 % au
 * premier clic, 100 % au second.
 *
 * ⚠ Réservée au cadrage de la plaque. `revealWidget` continue de passer par `visibleBand` :
 * amener un gadget sous des yeux qui regardent le haut de la page, c'est autre chose que
 * décider si la page entière peut tenir après défilement.
 */
function stickyBand(): VisibleBand {
  return {
    top: bar.getBoundingClientRect().bottom,
    bottom: dockElement === undefined || dockElement.hidden
      ? window.innerHeight
      : dockElement.getBoundingClientRect().top
  }
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

/**
 * La PLAQUE entière amenée dans la bande visible, quand elle y tient.
 *
 * ## Pourquoi la place réservée ne suffisait pas
 *
 * `--dock-page-room` réserve à la page exactement la hauteur d'une plaque paysage.
 * « Exactement » est le mot : relevé au navigateur en 1024 × 640, un gadget choisi, après
 * une modification — la bande dégagée vaut 362,3 px pour une plaque de 361,5. **0,8 px de
 * marge.** Sur les 601 positions de défilement de ce document, **deux** montrent la plaque
 * entière. Le pilote d'essai, qui a échantillonné de 25 en 25 px, a donc trouvé 97,2 % de
 * la plaque au mieux, et 88,1 % de la scène — le chiffre qu'il rapporte. Les deux mesures
 * étaient justes ; c'est la marge qui n'existait pas.
 *
 * Et elle ne peut pas beaucoup grandir : à 640 px de fenêtre, barre de tête repliée sur
 * deux lignes, le bandeau à son plancher (`DOCK_HEIGHT_MIN`) et son enveloppe, il reste
 * 640 − 100,6 − 62 − 112 = 365,4 px. Quatre pixels de marge au lieu d'un : toujours pas
 * une position qu'on trouve à la molette. Écraser le bandeau davantage ferait perdre les
 * deux, ce que `.dock__body` explique.
 *
 * ## Ce que l'outil fait donc à la place
 *
 * Il y va lui-même. La position qui dégage la plaque existe — c'est la promesse du
 * `sticky` —, elle est simplement introuvable à la main : autant l'y poser. Le calcul est
 * celui de `revealWidget`, avec la plaque pour cible au lieu du gadget.
 *
 * Rend `true` quand elle a fait son office, `false` quand la plaque ne tient pas dans la
 * bande — fenêtre trop courte, reçu d'enregistrement ouvert, bandeau tiré haut à la
 * poignée. Dans ce cas-là on ne triche pas : l'appelant retombe sur le gadget seul.
 */
interface PlateRoom {
  /** La plaque : la page et le rembourrage qui la cerne. */
  readonly box: DOMRect
  /** Ce que le défilement ne peut pas dégager. */
  readonly band: VisibleBand
}

/**
 * La plaque et la bande incompressible, mesurées **d'un seul coup**.
 *
 * Deux choses lisent cette mesure : le cadrage (`revealWholePlate`), qui y va, et l'avis
 * donné au pilote (`syncPlateFit`), qui dit ce qu'il en coûte quand on n'y va pas. Deux
 * relevés séparés finiraient par dire deux choses différentes du même écran — l'un cadrant
 * une page que l'autre déclarerait trop haute.
 *
 * `undefined` quand il n'y a rien à mesurer : vue d'ensemble, plaque pas encore dessinée.
 */
function plateRoom(): PlateRoom | undefined {
  if (view.kind !== 'detail') return undefined
  const bed = content.querySelector('.bed')
  if (!(bed instanceof HTMLElement)) return undefined
  const box = bed.getBoundingClientRect()
  if (box.height <= 0) return undefined
  // Le bandeau vient d'être déplié par `openDockForSelection`, mais la place qu'il se
  // laisse (`--dock-chrome-room`) est reposée par un `ResizeObserver`, c'est-à-dire APRÈS
  // la frappe. On la repose donc à la main, avant de mesurer quoi que ce soit.
  publishDockChrome()
  const band = stickyBand()
  return { box, band }
}

function revealWholePlate(): boolean {
  const room = plateRoom()
  if (room === undefined) return false
  const { box, band } = room
  if (box.height > band.bottom - band.top) return false
  const offset = revealOffset(box, band)
  if (offset !== 0) window.scrollBy({ top: offset, behavior: revealBehavior() })
  return true
}

/**
 * Le zoom le plus haut auquel la page entière tiendrait encore dans la bande, ramené à un
 * cran de la glissière. `undefined` quand aucun cran n'y suffit.
 *
 * Le rembourrage de la plaque ne suit pas le zoom — ce sont des pixels de carnet autour
 * d'une page en millimètres —, il se retire donc des deux côtés du calcul. Et le résultat
 * est **arrondi vers le bas** au pas de la glissière : un cran au-dessus ne tiendrait pas,
 * et un pilote qui pose la valeur annoncée doit voir sa page entière du premier coup.
 */
function zoomThatFits(room: PlateRoom): number | undefined {
  const plate = content.querySelector('.plate')
  if (!(plate instanceof HTMLElement)) return undefined
  const drawn = plate.getBoundingClientRect().height
  if (drawn <= 0) return undefined
  const frame = room.box.height - drawn
  const band = room.band.bottom - room.band.top
  const wanted = zoom * (band - frame) / drawn
  const notch = Math.floor(wanted / ZOOM_STEP) * ZOOM_STEP
  return notch < ZOOM_MIN ? undefined : notch
}

/**
 * **Ce que l'outil dit quand il n'a pas pu cadrer la page entière.**
 *
 * Le pilote d'essai du 22 août a trouvé les deux issues tout seul, et a constaté tout seul
 * que chacune coûte ce qu'il était venu chercher : replier le bandeau lui rend la page mais
 * lui prend les réglages, descendre le zoom la fait entrer mais lui prend la taille réelle.
 * Ce qui lui manquait n'était pas le diagnostic — « votre fenêtre est petite », il le
 * voyait — mais **le prix de chaque issue**, et le zoom exact auquel sa page entrerait.
 *
 * ## Ce n'est pas une alarme, et rien dans sa forme ne doit le laisser croire
 *
 * La situation est normale sur une fenêtre courte, et elle l'est toujours sur une page en
 * portrait : elle ne dit rien du fichier, rien d'une erreur. Pas d'icône, pas de couleur
 * d'avertissement, pas de région vivante qui l'annoncerait à la synthèse vocale à chaque
 * clic — une phrase du bandeau, dans l'encre douce des remarques.
 *
 * ## Quand elle paraît
 *
 * **Elle ne suit pas la sélection, elle suit la géométrie.** Elle paraît dès que la plaque
 * ne tient plus dans la bande incompressible et disparaît dès qu'elle y tient à nouveau :
 * poignée du bandeau tirée haut, reçu d'enregistrement ouvert, fenêtre rétrécie, page en
 * portrait. Entre deux sélections sur la même page elle ne clignote donc pas — c'est un
 * état, pas un événement, et c'est ce qui la garde lisible.
 *
 * Corollaire mesuré : sur une fenêtre de portable ordinaire (790 px utiles, bande de
 * 383,8 px) une page paysage de 361,5 px tient, et la phrase ne paraît jamais.
 *
 * ## Ce qu'elle coûte en hauteur : rien
 *
 * Elle vit **dans le corps du bandeau**, dont la hauteur est déjà bornée par
 * `--dock-page-room` et qui défile pour son compte. Mesuré, fenêtre 1024 × 640
 * (`innerHeight` 560), un gadget choisi : la bande laissée à la page vaut 329,8 px avec la
 * phrase comme sans elle. La même phrase posée dans la **tête** du bandeau la ramenait à
 * 284,9 px — 44,9 px pris à la page, dans l'écran même où la hauteur manque, parce que le
 * corps est alors à son plancher (`DOCK_HEIGHT_MIN`) et ne peut plus rendre ce que
 * l'enveloppe prend.
 */
function syncPlateFit(): void {
  if (plateFitNote === undefined || plateFitSaid === undefined) return
  const note = plateFitZoom
  const room = plateRoom()
  const tight = room !== undefined && room.box.height > room.band.bottom - room.band.top
  plateFitNote.hidden = !tight
  if (room === undefined || !tight) return
  const tr = translator()
  const notch = zoomThatFits(room)
  // ⚠️ **Le cas où le cran vaut 100 % a sa propre phrase, et ce n'est pas un détail de
  // style.** « … mais plus à sa taille réelle » suppose que le pilote est au zoom qu'il a
  // calibré à la règle, et que descendre le lui prend. À 100 % la supposition tombe : la
  // légende de la règle, trois centimètres plus bas, dit que la page est dessinée à sa
  // taille réelle et qu'on règle le zoom jusqu'à ce qu'une règle posée sur l'écran
  // coïncide. Un pilote qui n'a pas calibré son écran lisait donc deux phrases
  // contradictoires — relevé par l'essai pilote nº 5, et reproduit le 2026-08-22 en
  // 1024 × 640 sur la page 3 de `2025-07-07_backup-00.xcfg`. La seconde phrase ne dit plus
  // ce que 100 % n'est pas, elle dit ce qu'il est : le cran d'origine.
  plateFitSaid.data = notch === undefined
    ? tr.t('dock.cramped')
    : notch === 1
      ? tr.t('dock.crampedZoomFull', { level: tr.format.percent(notch) })
      : tr.t('dock.crampedZoom', { level: tr.format.percent(notch) })
  if (note === undefined) return
  note.hidden = notch === undefined
  if (notch === undefined) return
  note.textContent = tr.t('zoom.resetTo', { level: tr.format.percent(notch) })
  // Affectation et non `addEventListener` : la phrase se remesure à chaque sélection et à
  // chaque coup de glissière, et le cran annoncé change avec elle. Un abonnement de plus
  // à chaque passage poserait le cran d'il y a trois mesures.
  note.onclick = () => { applyZoom(notch) }
}

/**
 * Poser un cran de zoom **par la glissière**, jamais à côté d'elle.
 *
 * La glissière est le seul endroit qui sache tout ce qu'un changement de zoom entraîne :
 * la variable `--zoom` de la scène, le pour-cent affiché, le calque d'édition à rafraîchir
 * et cette phrase-ci à remesurer (`onZoom`, `views.ts`). Le bouton « Zoom 100 % » de la
 * barre de zoom fait déjà exactement cela ; celui de la phrase passe par le même chemin.
 */
function applyZoom(factor: number): void {
  const slider = content.querySelector('.zoom__slider')
  if (!(slider instanceof HTMLInputElement)) return
  slider.value = String(factor)
  slider.dispatchEvent(new Event('input'))
}

/**
 * Ce que la sélection amène sous les yeux : **la page entière** quand elle tient entre la
 * barre de tête et le bandeau, le gadget seul quand elle n'y tient pas.
 *
 * L'ordre compte. Montrer le gadget est le strict minimum — c'est la boucle *j'agis → je
 * vois* —, mais un pilote qui redimensionne un widget a besoin de voir ce qu'il écrase :
 * « sur mon 13 pouces je ne peux toujours pas redimensionner un gadget en voyant ce qu'il
 * recouvre ». Quand la page tient, la lui donner entière répond aux deux à la fois.
 */
function revealSelection(): void {
  if (selection === undefined) return
  const chosen = selection
  // ⚠ À la frame suivante, jamais tout de suite. Le calque d'édition finit de poser ses
  // marques et sa barre d'outils APRÈS avoir rappelé `onSelectionChange` : le document
  // n'a pas encore sa hauteur. Mesuré au premier gadget choisi — le défilement demandé
  // valait 413 px, la course disponible n'était encore que de 176,5, et le navigateur
  // ramenait le tout au bout du document. La page s'arrêtait à 34,4 % au lieu de 100 %.
  requestAnimationFrame(() => {
    // La sélection a changé entre-temps : c'est la nouvelle qui commande, pas celle-ci.
    if (selection !== chosen) return
    const framed = revealWholePlate()
    // Le cadrage vient de reposer `--dock-chrome-room` et de mesurer : c'est le moment où
    // la réponse est la plus fraîche, et le seul où l'on sait qu'un geste du pilote vient
    // d'avoir lieu.
    syncPlateFit()
    if (framed) return
    revealWidget(chosen)
  })
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
  const tr = translator()
  // L'intitulé du bouton de repli dépend de la sélection, qui vient peut-être de changer.
  syncDock()
  const page = currentPage()
  const widget = selection === undefined ? undefined : page?.widgets[selection]
  const name = widget === undefined ? undefined : readableName(widget.shortName, session.language)

  if (selectionLabel) {
    selectionLabel.textContent = widget === undefined || name === undefined
      ? tr.t('dock.noSelection')
      : tr.t('dock.selectionRank', {
        name,
        index: (selection ?? 0) + 1,
        total: page?.widgets.length ?? 0
      })
  }

  // La liste met en évidence le rang courant, quelle que soit son origine — un clic sur la
  // page passe par `onSelectionChange`, qui aboutit ici. `select` ne rappelle jamais
  // `onSelect` : les deux sens de la synchronisation ne peuvent donc pas se relancer.
  widgetList?.select(selection)

  // La barre de tête du bandeau redit ces trois faits : elle reste visible une fois le
  // bandeau replié, où le panneau lui-même a disparu.
  // Sans sélection, la barre de tête n'annonce pas un manque : elle dit le geste à faire.
  // C'est le seul texte que le bandeau replié — son état d'arrivée — laisse voir.
  if (dockTitle) dockTitle.textContent = name ?? tr.t('dock.chooseWidget')
  if (dockClass) dockClass.textContent = widget?.shortName ?? ''
  if (dockCount) dockCount.textContent = ''

  panelHost.textContent = ''
  if (widget === undefined) {
    panelHost.append(el(
      'p', 'hint-note',
      editMode ? tr.t('dock.hintEditing') : tr.t('dock.hintInspecting')
    ))
    return
  }

  const module = propertiesModule
  if (module === undefined) {
    const host = panelHost
    host.append(el('p', 'hint-note', tr.t('dock.loadingSettings')))
    // `panelHost` a changé : la vue a été reconstruite entre-temps, et elle a rappelé
    // `refreshPanel` de son côté. Ce résultat-ci est périmé.
    void loadProperties().then(() => { if (panelHost === host) refreshPanel() })
    return
  }

  const form = module.buildPropertyForm(widget, session.language, translator())
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
      tr: translator(),
      ...fileVersion,
      // Le second paramètre est le formulaire **refait** : écrire une valeur jusqu'ici
      // absente ajoute une ligne, et le compte de la barre de tête mentirait sans lui.
      onChange: (field, fresh) => onPropertyChange(field, widget, fresh)
    })
    : module.renderProperties({ form, tr: translator(), readOnly: true, ...fileVersion })
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
    tr: translator(),
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
  const tr = translator()
  const dock = el('section', 'dock')
  dock.dataset.mode = editMode ? 'edition' : 'consultation'
  dock.setAttribute('aria-label', editMode ? tr.t('dock.label') : tr.t('dock.labelReadOnly'))
  // Fin de glissé d'un curseur, sortie d'un champ : le pas en attente est clos ici
  // plutôt qu'au bout du délai. En consultation rien n'écrit, donc rien n'est en attente ;
  // l'écoute ne se pose pas, pour qu'aucun chemin du bandeau ne touche à l'historique.
  if (editMode) dock.addEventListener('change', () => flushRecord())

  dockGrip = buildDockGrip()

  const head = el('div', 'dock__head')
  dockTitle = el('h2', 'dock__title', tr.t('dock.noSelection'))
  dockClass = el('span', 'dock__class')
  dockCount = el('span', 'dock__count')
  listToggle = el('button', 'btn btn--ghost dock__list-toggle', tr.t('dock.hideList'))
  listToggle.type = 'button'
  listToggle.addEventListener('click', () => {
    listHidden = !listHidden
    syncDock()
  })
  dockToggle = el('button', 'btn dock__toggle', tr.t('dock.collapse'))
  dockToggle.type = 'button'
  dockToggle.addEventListener('click', () => {
    // Le pilote vient de se prononcer : le dépliage automatique de la sélection s'arrête
    // ici, définitivement, dans un sens comme dans l'autre.
    dockSetByPilot = true
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
  // La liste et les réglages côte à côte forment désormais une rangée à eux, sous une
  // phrase qui les traverse tous les deux : ce qu'elle dit — la page entière ne tient pas
  // ici — ne concerne ni la liste ni un gadget, mais l'écran entier. Elle prend toute la
  // largeur du bandeau, et deux lignes lui suffisent alors là où trois lui étaient
  // nécessaires dans la seule colonne des réglages (35 px contre 61,5, mesurés en
  // fenêtre 1024 × 640).
  const split = el('div', 'dock__split')
  split.append(widgetListHost, panelHost)

  plateFitNote = el('p', 'dock__cramped')
  plateFitNote.hidden = true
  // Le bouton vit DANS le paragraphe, et non à côté : la phrase est annoncée d'un bloc à
  // la synthèse vocale, et le remède qu'elle nomme doit être annoncé avec elle. Un
  // `<button>` est du contenu de phrase, un `<p>` a le droit d'en porter un.
  plateFitSaid = document.createTextNode('')
  plateFitZoom = el('button', 'btn btn--ghost dock__crampedZoom')
  plateFitZoom.type = 'button'
  plateFitZoom.hidden = true
  plateFitNote.append(plateFitSaid, plateFitZoom)

  body.append(plateFitNote, split)

  dockGrip.setAttribute('aria-controls', body.id)

  dock.append(dockGrip, head, body)
  dockElement = dock
  // Le bandeau est neuf à chaque `render()` : la hauteur réglée se repose dessus ici, et
  // les mesures de `publishDockChrome` se raccrochent aux boîtes neuves.
  dockChromeWatch.disconnect()
  dockChromeWatch.observe(bar)
  dockChromeWatch.observe(head)
  dockChromeWatch.observe(body)
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
  const tr = translator()
  const grid = gridFor(current.device, orientation)

  const editBar = el('div', 'editbar')
  selectionLabel = el('span', 'editbar__selection')

  // Les deux commandes qui ne portent pas sur le widget sélectionné : ce qu'on ajoute à
  // la page, et les pages elles-mêmes. Elles sont à part du reste de la barre, qui décrit.
  const barActions = el('div', 'editbar__actions')
  const paletteButton = el('button', 'btn', tr.t('app.addWidget'))
  paletteButton.type = 'button'
  // La boîte charge le module au besoin et se remplit elle-même quand il arrive.
  paletteButton.addEventListener('click', () => openPaletteDialog())
  const pagesButton = el('button', 'btn', tr.t('app.managePages'))
  pagesButton.type = 'button'
  pagesButton.addEventListener('click', () => openPagesDialog())
  barActions.append(paletteButton, pagesButton)

  editBar.append(
    el('span', 'editbar__badge', tr.t('app.editingBadge')),
    selectionLabel,
    // La grille de l'appareil, dite explicitement : c'est elle qui explique pourquoi un
    // widget ne se pose pas exactement là où on l'a lâché.
    el('span', 'editbar__grid', tr.t('app.gridSize', { cols: grid.cols, rows: grid.rows })),
    barActions,
    el('span', 'editbar__hint', tr.t('app.editKeysHint'))
  )

  const dock = buildDock()

  editor = createEditor({
    page,
    device: current.device,
    orientation,
    language: current.language,
    tr: translator(),
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
    // Rouvrir une page ne touche ni son rang ni le nombre de pages : rien ne glisse.
    case 'enableAllNavigations':
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
  // Deux langues : notre prose suit le pilote, le type de page cité suit le fichier
  // ouvert (`session.language`). Voir `src/i18n/axes.ts`.
  const text = operationAnnouncement(
    session.layout[orientation], operation, orientation, translator(), session.language
  )

  try {
    applyPageOperation(session.container.document, orientation, operation)
  } catch (error) {
    // Le pilote lisait ici « Opération impossible : Error: duplicatePage : index 7 hors
    // de [0, 4] ». Ce que ça lui apprend d'utile tient en une phrase ; le reste vient
    // après, nommé pour ce qu'il est.
    pagesMessage = {
      orientation,
      text: translator().t('app.pageOperationFailed', {
        detail: formatTechnicalDetail(error, translator())
      }),
      // Rien n'a bougé dans le document : il n'y a rien à annuler, et un bouton qui le
      // proposerait déferait le geste d'AVANT.
      undoable: false
    }
    syncPagesDialog()
    return
  }
  pagesMessage = { orientation, text, undoable: true }

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

  const tr = translator()
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('app.managePages')))
  const close = el('button', 'btn', tr.t('app.close'))
  close.type = 'button'
  close.addEventListener('click', () => closePagesDialog())
  head.append(close)
  box.append(head)

  box.append(el('p', 'modal__lead', tr.t('app.managePagesLead')))

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
      tr,
      // Voir le texte ci-dessus : on s'en tient à ce que l'appareil sait faire.
      allowClassChange: false,
      onOperation: (operation, description) => {
        runPageOperation(orientation, operation, description)
      },
      /**
       * Le remède, dans la boîte qui vient d'en parler.
       *
       * On lit le nom du pas AVANT de l'annuler : `stepHistory` remplace le document par
       * un arbre neuf et remet `pagesMessage` à `undefined` — l'annonce précédente décrit
       * un geste qui n'a plus lieu. On repose donc la nôtre après coup, sans bouton :
       * remonter d'un cran de plus emporterait un geste que cette boîte n'a pas annoncé.
       */
      onUndo: () => {
        if (session?.history.canUndo() !== true) return
        const what = session.history.undoDescription()
        stepHistory('undo')
        if (what === undefined) return
        pagesMessage = {
          orientation,
          text: translator().t('pages.undone', { what }),
          undoable: false
        }
        syncPagesDialog()
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
    if (pagesMessage?.orientation === orientation) {
      manager.announce(pagesMessage.text, pagesMessage.undoable)
    }
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
  dialog.setAttribute('aria-label', translator().t('app.managePages'))
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

/* ------------------------------------------- ce que vous avez changé, à tout moment */

let changesDialog: HTMLDialogElement | undefined

/**
 * **L'unique calcul de l'écart, pour les deux affichages.**
 *
 * L'écran consultable et la boîte d'enregistrement montrent la même liste. Ils
 * l'obtiennent par cette fonction et par elle seule : deux comptes qui divergeraient d'un
 * écran à l'autre seraient pires que pas de compte du tout — le pilote n'aurait plus
 * aucune raison de croire ni l'un ni l'autre. Un seul calcul, un seul dessin
 * (`buildChangeSummary`), et la divergence devient impossible plutôt qu'improbable.
 *
 * Rend `undefined` quand il n'y a rien à comparer : pas de document, ou un document que
 * l'analyse n'a pas pu lire — un fichier illisible n'a pas d'état d'origine à opposer.
 */
function documentChanges(): DocumentChanges | undefined {
  if (!session || session.container.parseError !== undefined) return undefined
  return computeChanges(session.original, session.container.document)
}

/**
 * Le même relevé, replié, pour la boîte d'enregistrement.
 *
 * Il passe par `documentChanges()` et `buildChangeSummary` — le calcul et le dessin de
 * l'écran consultable, sans une ligne de rechange : c'est ce qui rend la divergence des
 * deux comptes impossible plutôt qu'improbable.
 *
 * ⚠️ La phrase ajoutée dessous n'appartient pas au relevé et ne le contredit pas : elle
 * dit la **frontière**. Le relevé parle du document ; ce que le fichier produit emportera
 * en plus ou en moins dépend de l'issue choisie, et chacune des trois le dit déjà sous son
 * intitulé.
 */
function changeSummaryForSaving(): HTMLElement | undefined {
  const changes = documentChanges()
  if (changes === undefined || session === undefined) return undefined
  const tr = translator()
  const block = el('div', 'changes__beforeSaving')
  block.append(buildChangeSummary({
    changes,
    fileName: session.container.fileName,
    language: session.language,
    tr,
    folded: true
  }))
  block.append(el('p', 'changes__note', tr.t('changes.beforeSaving')))
  return block
}

function fillChangesDialog(dialog: HTMLDialogElement): void {
  if (!session) return
  const current = session
  const changes = documentChanges()
  if (changes === undefined) return
  dialog.textContent = ''

  const tr = translator()
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('changes.title')))
  const close = el('button', 'btn', tr.t('app.close'))
  close.type = 'button'
  close.addEventListener('click', () => closeChangesDialog())
  head.append(close)
  box.append(head)

  box.append(buildChangeSummary({
    changes,
    fileName: current.container.fileName,
    // Les noms de gadgets suivent le fichier ouvert, jamais la langue de l'interface :
    // c'est la promesse centrale de l'outil. Voir `src/i18n/axes.ts`.
    language: current.language,
    tr
  }))

  dialog.append(box)
}

/**
 * Le relevé se refait à chaque rendu : un gadget déplacé pendant que la boîte est ouverte
 * doit s'y voir, et un geste annulé doit en disparaître. C'est ce qui en fait un constat
 * et non une photographie prise à l'ouverture de la boîte.
 */
function syncChangesDialog(): void {
  if (!changesDialog) return
  if (!session || session.container.parseError !== undefined) {
    closeChangesDialog()
    return
  }
  fillChangesDialog(changesDialog)
}

function closeChangesDialog(): void {
  const dialog = changesDialog
  changesDialog = undefined
  if (!dialog) return
  dialog.close()
  dialog.remove()
}

function openChangesDialog(): void {
  if (!session || changesDialog !== undefined) return
  // Le pas en cours d'écriture doit être au document avant qu'on le compare : sans cela,
  // un déplacement encore « en vol » manquerait au relevé. Le document, lui, est déjà muté
  // — c'est l'historique que `flushRecord` met à jour —, mais l'appel garde les deux
  // lectures alignées, comme le fait le carrousel des pages.
  flushRecord()
  const dialog = el('dialog', 'modal modal--changes')
  dialog.setAttribute('aria-label', translator().t('changes.title'))
  dialog.addEventListener('cancel', () => {
    changesDialog = undefined
    dialog.remove()
  })
  changesDialog = dialog
  fillChangesDialog(dialog)
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
  const dismiss = el('button', 'btn btn--primary', translator().t('app.close'))
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

/* --------------------------------------------------- le sélecteur de langue, en modale */

/**
 * La mention de l'axe des **libellés de XCTrack** — « fr (langue du navigateur) ».
 *
 * Une seule fonction pour ses deux emplois : le bandeau du fichier et la boîte des
 * langues. Deux formulations pour un même fait seraient l'ambiguïté même qu'on cherche à
 * lever ici, et elles divergeraient à la première retouche.
 *
 * Trois formulations parce qu'il y a **trois sources** (`LabelSource`), et que dire
 * « langue du navigateur » d'une langue venue du sélecteur laisserait le pilote croire que
 * son choix n'a rien fait — c'est précisément le doute que cette mention existe pour
 * lever.
 *
 * Sans fichier ouvert, l'axe existe déjà — comme `initialAxes` l'annonce : la boîte
 * s'ouvre dès l'écran d'accueil.
 */
function labelLanguageMention(tr: Translator, current: Session | undefined): string {
  const fallback = labelFallback()
  const language = current?.language ?? fallback.language
  const source = current?.labelSource ?? fallback.source
  // `language` est un code de langue, donc un identifiant : il se passe en `string`.
  if (source === 'file') return tr.t('app.labelsFromFile', { language })
  return source === 'ui'
    ? tr.t('app.labelsFromUi', { language })
    : tr.t('app.labelsFromBrowser', { language })
}

let languageDialog: HTMLDialogElement | undefined

/**
 * Referme, et **rend le focus au globe**. Sans cette dernière ligne il retomberait sur
 * `<body>` : la tabulation repartirait du haut de la page, et un pilote au clavier
 * perdrait sa place chaque fois qu'il ouvre cette boîte pour n'y rien changer.
 */
function closeLanguageDialog(): void {
  if (languageDialog === undefined) return
  languageDialog.close()
  languageDialog.remove()
  languageDialog = undefined
  languageButton.focus()
}

/** La coche de la langue courante — le second marqueur, celui qui n'est pas une couleur. */
function checkGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('lang-choice__check')
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d', 'M5 12.5 10 17.5 19 6.5')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '2.4')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  svg.append(path)
  return svg
}

/**
 * # Les deux langues, côte à côte, une seule fois
 *
 * Cette boîte existe pour **une** raison, et le sélecteur en est presque un prétexte :
 * deux réglages de langue cohabitent dans cet outil, et un seul agit sur les mots qu'on
 * lit ici (`src/i18n/axes.ts`).
 *
 * Le défaut à éviter est précis, et il ne se voit qu'une fois l'outil traduit : le pilote
 * change la langue de l'interface, lit « LIBELLÉS — fr » inchangé dans le bandeau du
 * fichier, et conclut que le sélecteur ne marche pas. Il a raison de le croire — rien ne
 * lui a dit que ces deux mentions parlaient de deux choses différentes.
 *
 * D'où la forme : **deux sections nommées**, dans une seule boîte. Celle du haut se règle
 * et dit qu'elle gouverne cette interface ; celle du bas ne se règle pas, dit son état, et
 * dit pourquoi il ne bouge pas. Le pilote qui vient chercher « pourquoi ça n'a pas
 * changé » trouve la réponse à l'endroit exact où il pose la question.
 *
 * **Les cinq entrées sont des endonymes** — « Nederlands », jamais « Néerlandais » :
 * demander de reconnaître un mot français pour sortir du français rate exactement la
 * personne qu'il faut aider. Chaque bouton porte son `lang` : un lecteur d'écran prononce
 * alors « Deutsch » en allemand, et non à la française.
 */
function openLanguageDialog(): void {
  if (languageDialog !== undefined) return
  const tr = translator()
  const dialog = el('dialog', 'modal modal--language')
  dialog.setAttribute('aria-label', tr.t('app.languageDialogTitle'))
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('app.languageDialogTitle')))
  const close = el('button', 'btn', tr.t('app.close'))
  close.type = 'button'
  close.addEventListener('click', () => closeLanguageDialog())
  head.append(close)
  box.append(head)

  const ours = el('section', 'lang-axis')
  ours.append(
    el('h3', 'lang-axis__title', tr.t('app.uiLanguage')),
    el('p', 'modal__lead', tr.t('app.uiLanguageLead'))
  )
  const list = el('div', 'lang-list')
  list.setAttribute('role', 'group')
  list.setAttribute('aria-label', tr.t('app.uiLanguage'))
  let currentChoice: HTMLButtonElement | undefined
  for (const code of UI_LANGUAGES) {
    const choice = el('button', 'btn lang-choice')
    choice.type = 'button'
    // L'entrée est écrite dans SA langue : sans cet attribut, un lecteur d'écran
    // francophone prononcerait « Nederlands » à la française — c'est-à-dire le rendrait
    // méconnaissable à celui-là même qu'il faut aider.
    choice.lang = code
    const chosen = code === currentUiLanguage
    // Un interrupteur et non une sélection : `aria-pressed` dit lequel est enfoncé, ce que
    // ni l'aplat ni la coche ne disent à un lecteur d'écran.
    choice.setAttribute('aria-pressed', String(chosen))
    choice.classList.toggle('lang-choice--current', chosen)
    if (chosen) {
      choice.append(checkGlyph())
      currentChoice = choice
    }
    choice.append(el('span', undefined, UI_LANGUAGE_ENDONYMS[code]))
    choice.addEventListener('click', () => chooseUiLanguage(code))
    list.append(choice)
  }
  ours.append(list)
  box.append(ours)

  const theirs = el('section', 'lang-axis lang-axis--labels')
  theirs.append(
    el('h3', 'lang-axis__title', tr.t('app.metaLabels')),
    el('p', 'lang-axis__value', labelLanguageMention(tr, session)),
    el('p', 'modal__lead', tr.t('app.labelsAxisLead'))
  )
  box.append(theirs)

  dialog.append(box)
  languageDialog = dialog
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeLanguageDialog()
  })
  document.body.append(dialog)
  dialog.showModal()
  // Le focus va sur la langue courante et non sur « Fermer » : c'est le point de départ
  // de la seule décision que la boîte demande, et la tabulation part de là vers les
  // autres langues.
  ;(currentChoice ?? close).focus()
}

/** Un chargement de catalogue est en cours : un double clic n'en lance pas deux. */
let languagePending = false

/**
 * Changer la langue de **notre prose** — et, pour un fichier muet, celle des libellés.
 *
 * **Le fichier garde la main.** S'il déclare une `Display.Language`, `session.language` ne
 * bouge pas d'un iota : un pilote belge dont l'AIR³ est en anglais lit cette interface en
 * français **et** ses libellés en anglais, ce qui est tout l'objet de la séparation des
 * axes (`src/i18n/axes.ts`).
 *
 * **Un fichier qui ne déclare rien, en revanche, suit ce choix-ci.** Le repli était
 * `navigator.language`, que le pilote n'a pas réglé pour cet usage : il choisissait
 * l'anglais et voyait les 217 noms de réglages rester en français, soit l'essentiel de
 * l'écran. Voir `labelFallbackLanguage` (`src/model/preferences.ts`).
 *
 * **Le choix n'est mémorisé qu'une fois le catalogue arrivé.** L'écrire avant exposerait
 * au pire : l'amorçage attend le catalogue de la langue mémorisée et n'affiche rien tant
 * qu'il n'est pas là — une langue enregistrée dont le morceau ne se télécharge pas
 * laisserait un écran vide à chaque rechargement, sans moyen d'en sortir.
 *
 * **Trois choses survivent au rendu et sont donc refaites à la main** : les mots du cadre,
 * le sélecteur de gabarit — qui vit hors de `content` — et les avertissements du fichier,
 * calculés une seule fois à l'ouverture avec le traducteur d'alors.
 */
function chooseUiLanguage(language: UiLanguage): void {
  if (language === currentUiLanguage) {
    closeLanguageDialog()
    return
  }
  if (languagePending) return
  languagePending = true
  void loadTranslator(language)
    .then((loaded) => {
      currentUiLanguage = language
      chosenUiLanguage = language
      uiTranslator = loaded
      writeUiLanguage(window.localStorage, language)
      closeLanguageDialog()
      installChromeProse(loaded)
      if (session !== undefined) {
        // Le fichier reste maître de l'axe des libellés : `resolveLanguage` ne prend le
        // repli que pour un fichier qui ne déclare rien. Un AIR³ réglé en anglais garde
        // donc ses libellés anglais quelle que soit la langue lue ici.
        const fallback = labelFallback()
        session.language = resolveLanguage(session.settings.language, fallback.language)
        session.labelSource =
          session.settings.language.kind === 'explicit' ? 'file' : fallback.source
        installDeviceSelector(session.device)
        session.warnings = computeWarnings({
          tr: loaded,
          document: session.container.document,
          layout: session.layout,
          settings: session.settings,
          language: session.language
        })
      }
      // L'annonce du carrousel a été écrite dans la langue précédente : elle ne se
      // retraduit pas, elle se tait. Le geste qu'elle décrivait est passé.
      pagesMessage = undefined
      render()
    })
    .catch((error: unknown) => {
      tellProblem(
        translator().t('app.languageFailedTitle'),
        translator().t('app.fileUntouchedRetry'),
        formatTechnicalDetail(error, translator())
      )
    })
    .finally(() => { languagePending = false })
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
  const tr = translator()
  const host = el('section', 'prefs-host')
  host.append(el('p', 'hint-note', tr.t('app.loadingSettingsPage')))

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
      tr: translator(),
      language: current.language,
      // ⚠️ **L'axe des libellés, dit à l'écran qui les affiche.** Un pilote-testeur a lu
      // les captures allemande, néerlandaise et espagnole des réglages généraux comme
      // « un écran presque entièrement en français » et en a conclu à un bug : notre prose
      // suivait pourtant bien le globe, et les libellés suivaient le fichier, qui déclare
      // `Display.Language: fr`. La mention de l'axe vit ici (`metaStrip`) et dans la boîte
      // des langues — jamais sur les 8 800 px de la page des réglages, où le doute naît.
      labelsFromFile: current.labelSource === 'file',
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
        tr.t('app.settingsFailedTitle'),
        tr.t('app.settingsFailedMessage'),
        tr.t('app.fileNotAtFault'),
        formatTechnicalDetail(error, tr)
      ))
      const again = el('button', 'btn', tr.t('app.backToPages'))
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
let viewBeforeManual: View | undefined

/**
 * Aller lire le manuel, en retenant d'où l'on vient.
 *
 * Contrairement aux réglages, il **ne demande aucun fichier ouvert** : c'est même là qu'il
 * sert le plus, à qui découvre l'outil et n'a rien à ouvrir encore.
 */
function openManual(): void {
  if (view.kind === 'manual') return
  viewBeforeManual = view
  view = { kind: 'manual' }
  render()
  window.scrollTo({ top: 0 })
}

/**
 * La vue du manuel : un hôte posé tout de suite, la page dedans quand elle arrive.
 *
 * Le fragment et sa feuille sont un morceau chargé à la demande — un par langue, et seul
 * celui du pilote part sur le réseau.
 */
function buildManualView(): HTMLElement {
  const tr = translator()
  const host = el('section', 'manual-host')
  host.append(el('p', 'hint-note', tr.t('app.loadingManual')))

  const token = ++manualToken
  const back = (): void => {
    // La vue d'où l'on venait peut avoir disparu entre-temps — fichier refermé, page
    // supprimée. La vue d'ensemble reste le refuge.
    const previous = viewBeforeManual
    viewBeforeManual = undefined
    view = previous !== undefined && viewExists(previous) ? previous : { kind: 'overview' }
    render()
    window.scrollTo({ top: 0 })
  }

  void import('./manualPage')
    .then(async (module) => await module.buildManualPage(translator(), back))
    .then((page) => {
      if (token !== manualToken) return
      host.textContent = ''
      host.append(page)
    })
    .catch((error: unknown) => {
      if (token !== manualToken) return
      host.textContent = ''
      host.append(problem(
        tr.t('app.manualFailedTitle'), tr.t('app.manualFailedMessage'),
        undefined, formatTechnicalDetail(error, tr)
      ))
    })
  return host
}

let manualToken = 0

function openVersionDialog(): void {
  if (!session || versionDialog !== undefined) return
  flushRecord()
  const current = session

  const tr = translator()
  const dialog = el('dialog', 'modal modal--version')
  dialog.setAttribute('aria-label', tr.t('app.versionDialogTitle'))
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('app.versionDialogTitle')))
  const close = el('button', 'btn', tr.t('app.close'))
  close.type = 'button'
  close.addEventListener('click', () => closeVersionDialog())
  head.append(close)
  box.append(head)

  // Le constat vient d'abord, l'action ensuite et seulement en édition. La phrase disait
  // « rien n'est supprimé ni modifié » : c'était vrai tant que la boîte ne savait que
  // constater. Elle sait maintenant retirer, et promettre le contraire de ce qu'un bouton
  // fait quelques centimètres plus bas serait le pire des deux textes.
  box.append(el('p', 'modal__lead', tr.t('app.versionLead')))

  const host = el('div', 'modal__slot')
  host.append(el('p', 'hint-note', tr.t('app.loadingVersions')))
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
      tr: translator(),
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
        tr.t('app.versionFailedTitle'),
        tr.t('app.versionFailedMessage'),
        tr.t('app.fileNotAtFault'),
        formatTechnicalDetail(error, tr)
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
        tr: translator(),
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
          //
          // `confirmed` : la bibliothèque a déjà posé la question, et mieux que nous —
          // elle offre « ranger d'abord, puis charger », l'issue qui ne perd rien. Voir
          // `askLoad` dans `libraryPanel.ts`.
          void loadBytes(bytes.slice(), name, { confirmed: true })
        },
        onClose: () => { libraryDialog = undefined }
      })
      libraryDialog = handle
      handle.open()
    })
    .catch((error: unknown) => {
      tellProblem(
        translator().t('app.libraryFailedTitle'),
        translator().t('app.libraryFailedMessage'),
        formatTechnicalDetail(error, translator())
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
 *
 * Ce qui a changé le 22 août : la fonction **rend compte**. Ce qu'elle a fabriqué et remis
 * au navigateur passe dans le reçu de la barre de tête ; ce qui échoue chez elle — une
 * sérialisation, une archive, un `Blob` trop gros — remonte à l'appelant, qui le dit.
 * Auparavant l'appel était un `void` sans `catch` : un échec de fabrication ne produisait
 * qu'un rejet non traité dans la console, et le pilote voyait la même chose qu'un succès.
 */
async function deliver(
  current: Session, produced: Uint8Array | undefined, fileName: string
): Promise<void> {
  // Le pas en cours de regroupement part avec le fichier : il doit être dans l'historique
  // avant qu'on note où en était le document au moment de l'écriture.
  flushRecord()
  const bytes = produced ?? await exportContainer(current.container)
  // Copie dans un ArrayBuffer simple : `Blob` n'accepte pas une vue dont le tampon
  // pourrait être partagé, et le conteneur ne garantit rien de son origine.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
  // La précédente, et elle seule : celle-ci vient d'être remise au navigateur — voir
  // `deliveredUrl`.
  if (deliveredUrl !== undefined) URL.revokeObjectURL(deliveredUrl)
  deliveredUrl = url
  const link = el('a')
  link.href = url
  link.download = fileName
  link.click()
  // Voir `savedRevision` : le fichier entier, et lui seul, met le travail à l'abri.
  if (produced === undefined) savedRevision = current.history.revision()
  lastReceipt = { fileName, byteLength: bytes.byteLength }
  receiptShownAt = performance.now()
  receiptView = viewSignature()
  renderReceipt()
}

/**
 * L'échec de fabrication, dit en toutes lettres.
 *
 * C'est le seul des deux échecs que cet outil puisse **constater**. L'autre — le
 * navigateur qui refuse le téléchargement — ne lui est jamais rapporté ; le reçu s'en
 * charge à sa façon, en disant à chaque fois où le pilote peut le constater lui-même.
 */
function tellDeliveryFailed(error: unknown): void {
  const tr = translator()
  tellProblem(
    tr.t('app.exportFailedTitle'),
    tr.t('app.exportFailedMessage'),
    formatTechnicalDetail(error, tr)
  )
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
    void downloadIntact(current)
      .catch(tellDeliveryFailed)
      .finally(() => { exportPending = false })
    return
  }

  // Les avertissements sont calculés à l'import ; un document modifié en mérite un
  // recalcul, car ce qu'il contient a changé depuis. Ce qui ne change pas : ils sont dits
  // AVANT le téléchargement, modifié ou non.
  const notice = warningNotice(warningsAt(
    current.container.modified
      ? computeWarnings({
        tr: translator(),
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
      // Fabriqué ici, comme l'avertissement : la boîte de partage ne calcule rien et ne
      // connaît pas le relevé — les deux écrans montrent donc la même liste.
      const changesBlock = changeSummaryForSaving()
      const handle = module.renderSharingDialog({
        tr: translator(),
        source: sharingSource(current),
        language: current.language,
        ...(notice === undefined ? {} : { notice }),
        ...(changesBlock === undefined ? {} : { changes: changesBlock }),
        onConfirm: (result: SharingResult) => {
          // `sharingBytes` rend `undefined` pour un export ordinaire : c'est le signal de
          // réémettre le conteneur, jamais de sérialiser.
          void deliver(current, module.sharingBytes(result), result.fileName)
            .catch(tellDeliveryFailed)
        }
      })
      handle.open()
    })
    .catch((error: unknown) => {
      tellProblem(
        translator().t('app.exportDialogFailedTitle'),
        translator().t('app.exportDialogFailedMessage'),
        formatTechnicalDetail(error, translator())
      )
    })
    .finally(() => {
      exportPending = false
      exportButton.disabled = false
    })
}

function render(): void {
  const tr = translator()
  // AVANT tout le reste : le reçu occupe la barre collante, et la place qu'il prend est
  // celle que le cadrage mesure quelques lignes plus bas. L'effacer après aurait laissé
  // cadrer sur une hauteur périmée.
  dismissReceiptOnViewChange()
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
  plateFitNote = undefined
  plateFitSaid = undefined
  plateFitZoom = undefined
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
  syncChangesDialog()

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
    || view.kind === 'manual'
  // ⚠️ **Trois morceaux, et non un texte.** La troncature doit manger le DÉBUT : la date
  // ouvre tous les exports d'une même journée, la fin porte le format et l'extension.
  // L'ellipse ordinaire mangeait exactement la fin, et `2026-08-20_backup-00.xcfg` comme
  // `2026-08-20_backupwithmedia-00.xczfg` s'affichaient « 2026-08-20_backu… » — mesuré
  // par un pilote-testeur le 2026-08-22.
  //
  // ⚠️ **Trois et non deux depuis le second relevé du même jour** : la tête s'effaçait
  // bien entièrement, et c'est la QUEUE qui manquait de place — 181 px demandés pour
  // 173,4 accordés. L'extension tombait, c'est-à-dire la seule chose qui distingue une
  // configuration d'une archive. Le rang et l'extension forment donc un troisième
  // morceau, qui ne cède jamais. Voir `fileNameParts`, et les trois `flex` d'`app.css`.
  fileName.textContent = ''
  const shown = fileNameParts(session?.container.fileName ?? '')
  fileName.append(
    el('span', 'app-bar__fileHead', shown.head),
    el('span', 'app-bar__fileBody', shown.body),
    el('span', 'app-bar__fileTail', shown.tail)
  )
  // L'infobulle que la feuille de style promet depuis toujours, et qui manquait : le nom
  // reste tronqué — par la tête désormais — et plus court encore sous 1 120 px. Sans elle, un pilote
  // qui travaille sur deux exports du même jour ne peut plus les distinguer.
  fileName.title = session?.container.fileName ?? ''
  syncEditControls()

  if (failure !== undefined) {
    content.append(problem(
      tr.t('app.openFailedTitle'),
      tr.t('app.openFailedMessage'),
      // L'écran d'erreur ne montre plus la zone de dépôt, et « Ouvrir un fichier » a
      // rejoint le menu : sans cette phrase, il n'y aurait plus rien à quoi se raccrocher
      // — le dépôt continue pourtant de fonctionner sur toute la page.
      tr.t('app.openFailedHint'),
      failure
    ))
    return
  }

  // Le manuel se lit sans fichier ouvert : son branchement précède donc celui de
  // l'accueil, contrairement aux réglages qui n'ont de sens qu'avec un document.
  if (view.kind === 'manual') {
    content.append(buildManualView())
    return
  }

  if (!session) {
    content.append(landing())
    return
  }

  if (session.container.parseError !== undefined) {
    content.append(problem(
      tr.t('app.unreadableTitle'),
      tr.t('app.unreadableMessage'),
      tr.t('app.unreadableHint'),
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
      const current = session
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
        tr,
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
        // Le zoom change la hauteur de la plaque sans toucher au bandeau : aucun
        // observateur de taille ne s'en aperçoit, et la phrase resterait à réclamer un
        // zoom que le pilote vient de poser.
        onZoom: (factor) => { zoom = factor; editor?.refresh(); syncPlateFit() },
        // Pourquoi cette page ne s'affichera pas, dit là où le pilote pose ses gadgets.
        // Le document entier, et pas seulement la mise en page : une des trois raisons
        // se lit dans les réglages généraux (`Display.Orientation`).
        reachability: pageReachability({
          page, orientation, document: current.container.document
        }),
        // Le geste n'est offert qu'en édition : hors édition, rien n'écrit dans le
        // document, et un bouton qui modifierait le fichier en consultation trahirait la
        // promesse « vous pouvez tout ouvrir, tout lire, rien n'est écrit ».
        ...(editMode
          ? {
            onEnableAllNavigations: () => {
              const operation: PageOperation = {
                kind: 'enableAllNavigations', index: view.kind === 'detail' ? view.index : 0
              }
              runPageOperation(
                orientation, operation,
                describeOperation(
                  current.layout[orientation], operation, orientation, tr, current.language
                )
              )
            }
          }
          : {}),
        ...(editing === undefined ? {} : { editing }),
        ...(inspection === undefined ? {} : { inspecting: inspection })
      }))
      syncEditControls()
      return
    }
    view = { kind: 'overview' }
  }

  const title = el('h1', 'sr-only', tr.t('app.overviewTitle'))
  content.append(title, metaStrip(session))
  if (editMode) {
    const note = el('div', 'editnote')
    note.append(el('p', 'editnote__text', tr.t('app.editModeNote')))
    const pagesButton = el('button', 'btn btn--primary', tr.t('app.managePages'))
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
  //
  // Le contrôle avant vol vient s'y joindre plutôt que de s'ouvrir un troisième
  // emplacement : ses sept règles se rangent dans les deux mêmes poids, selon ce que
  // chacune vaut (`preflightWarnings`).
  //
  // Il se calcule **ici, à chaque rendu**, là où `session.warnings` se calcule à
  // l'ouverture. Ce n'est pas une inconséquence : deux de ses règles dépendent de choses
  // qui bougent sans que le fichier soit rouvert — le gabarit d'écran, que la barre
  // d'outils change et qui donne les millimètres de la lisibilité, et la géométrie des
  // pages, que le mode édition déplace. Un constat figé à l'import mentirait dès le
  // premier geste.
  const { attention, remarks } = splitWarnings(warningsAt(session.warnings, 'import').concat(
    preflightWarnings({
      tr: translator(),
      document: session.container.document,
      layout: session.layout,
      language: session.language,
      device: session.device,
      ...(isProWidget === undefined ? {} : { isProWidget })
    })
  ))
  const alert = attentionPanel(attention)
  if (alert) content.append(alert)
  const folded = remarksPanel(remarks)
  if (folded) content.append(folded)

  content.append(
    buildOverview(session.layout, ctx, tr, (orientation, index) => {
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
    tr: translator(),
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
 * # Du travail en cours, et ce qu'il faut en dire
 *
 * C'est la question que `beforeunload` pose déjà au navigateur — « y a-t-il quelque chose
 * à perdre ? » —, sortie de son écoute et rendue disponible à l'intérieur de la page.
 * L'avertissement de fermeture d'onglet et la confirmation de remplacement répondent
 * désormais tous deux à celle-ci, et à elle seule : ils ne peuvent plus diverger, ce qui
 * était précisément le défaut signalé — le navigateur retenait le pilote, l'outil
 * écrasait quand même.
 *
 * Rien n'est modifié ici, pas même le pas d'historique en attente : la lecture doit
 * pouvoir se faire sans conséquence, puisqu'elle sert justement à décider si l'on touche
 * à quoi que ce soit.
 */
interface UnsavedWork {
  /** Le fichier qui porte ce travail — c'est lui qu'on refermerait. */
  fileName: string
  /**
   * Ce que le pilote vient de changer, nommé comme l'annulation le nomme (« Régler
   * Volume — Vario »). `undefined` seulement si l'historique n'a rien à en dire.
   */
  lastChange: string | undefined
}

/**
 * Le pas d'historique auquel le document ouvert a été **écrit dans un fichier entier**,
 * et rien d'autre.
 *
 * ⚠️ `container.modified` ne répond pas à cette question : il dit « le document a bougé
 * depuis l'ouverture », il reste vrai après l'enregistrement, et il commande la fidélité à
 * l'octet près (`exportContainer` réémet la source tant qu'il est faux). Le remettre à
 * faux après un enregistrement ferait ressortir les octets d'ORIGINE au suivant. C'est
 * donc un repère séparé, et il ne touche à rien.
 *
 * ⚠️ **Seul un fichier entier compte.** `deliver` sert aussi les deux versions dépouillées
 * de la boîte de partage, qui laissent des réglages derrière elles — un « pages » n'emporte
 * pas les préférences. Marquer le travail enregistré sur celles-là laisserait le pilote
 * fermer l'onglet sur un travail que le fichier produit ne porte pas. Le repère n'est donc
 * posé que sur le chemin `produced === undefined`, celui de la réémission du conteneur.
 *
 * Non posé par le rangement en bibliothèque : le sens prudent est de continuer à retenir.
 */
let savedRevision: number | undefined

function unsavedWork(): UnsavedWork | undefined {
  const current = session
  if (current?.container.modified !== true) return undefined
  // Enregistré, et rien changé depuis : il n'y a rien à perdre, et un avertissement qui
  // paraît quand il n'y a rien à perdre est un avertissement qu'on cesse de lire.
  if (pendingStep === undefined && savedRevision === current.history.revision()) return undefined
  return {
    fileName: current.container.fileName,
    // Le pas en cours de regroupement n'est pas encore enregistré, et c'est pourtant le
    // plus récent — celui que le pilote a sous les yeux. On le lit sans le clore :
    // fermer la boîte doit laisser l'historique exactement où il était.
    lastChange: pendingStep?.description ?? current.history.undoDescription()
  }
}

/**
 * Demander avant de remplacer un document modifié.
 *
 * Trois choses tiennent ce texte, et aucune n'est cosmétique :
 *
 * 1. **La boîte dit ce qui est perdu, pas « êtes-vous sûr ».** L'historique nomme ses pas
 *    (`Régler Volume — Vario`) : c'est ce nom-là que le pilote reconnaît, et c'est lui
 *    qu'on cite. « Vos modifications » ne lui apprendrait rien qu'il ne sache déjà.
 * 2. **La sortie de secours ne coûte rien et ne change rien.** Refuser ne fait
 *    strictement rien : le document, la page ouverte, le gadget sélectionné et
 *    l'historique n'ont pas été touchés, parce qu'on demande *avant* de démonter quoi que
 *    ce soit. C'est aussi l'action par défaut — celle du focus, celle d'Échap.
 * 3. **Elle ne paraît que s'il y a quelque chose à perdre.** L'appelant ne l'atteint
 *    qu'avec un `UnsavedWork` en main ; un document intact se remplace sans un mot, sans
 *    quoi la boîte deviendrait un réflexe et cesserait d'être lue.
 */
function askBeforeReplace(incoming: string, work: UnsavedWork, proceed: () => void): void {
  const tr = translator()
  const dialog = el('dialog', 'modal modal--replace')
  const box = el('div', 'modal__box')
  box.append(
    el('h2', 'modal__title', tr.t('app.unsavedTitle')),
    el('p', 'problem__message', tr.t('app.replaceMessage', {
      incoming,
      kept: work.fileName
    }))
  )
  if (work.lastChange !== undefined) {
    box.append(el('p', 'replace__last', tr.t('app.lastChange', { change: work.lastChange })))
  }
  box.append(el('p', 'replace__hint', tr.t('app.replaceHint')))

  const actions = el('div', 'modal__actions')
  const dismiss = (): void => {
    dialog.close()
    dialog.remove()
  }
  // Nommé pour ce qu'il fait, comme l'autre : « Ouvrir quand même » cacherait la perte
  // derrière une concession.
  const replace = el('button', 'btn', tr.t('app.replaceAndLose', { incoming }))
  replace.type = 'button'
  replace.addEventListener('click', () => {
    dismiss()
    proceed()
  })
  const keep = el('button', 'btn btn--primary', tr.t('app.keepChanges'))
  keep.type = 'button'
  keep.addEventListener('click', dismiss)
  // Le geste destructeur à gauche, celui qui ne perd rien sous le focus : Échap et Entrée
  // mènent l'un comme l'autre à garder le travail.
  actions.append(replace, keep)
  box.append(actions)
  dialog.append(box)
  dialog.addEventListener('cancel', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  keep.focus()
}

/** Un fichier illisible, dit sans effacer ce que le pilote regardait. */
function tellUnreadable(incoming: string, kept: string, detail: string): void {
  const tr = translator()
  tellProblem(
    tr.t('app.unreadableTitle'),
    tr.t('app.unreadableIncoming', { incoming, kept }),
    detail
  )
}

/**
 * Tout ce qui parlait du fichier précédent s'en va. Appelé au dernier moment, quand le
 * remplacement est acquis : c'est la ligne au-delà de laquelle il n'y a plus de retour.
 */
function closeDocument(): void {
  // Ferme le pas en attente et son minuteur avant que la session ne disparaisse : le
  // minuteur, sinon, s'exécuterait contre l'historique du fichier suivant.
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
  // Le reçu nommait un fichier tiré du document qu'on referme : il n'a plus rien à dire du
  // document qui s'ouvre.
  clearReceipt()
  // ⚠️ Sans cette ligne, le repère du travail enregistré traverserait les documents : une
  // histoire neuve repart de zéro, et le premier pas d'un fichier tout juste ouvert
  // porterait le numéro auquel le PRÉCÉDENT avait été enregistré. Le pilote fermerait alors
  // l'onglet sur une modification jamais écrite, sans un mot.
  savedRevision = undefined
  // Les réglages généraux affichés étaient ceux de l'autre fichier, et la vue retenue
  // pour le retour désignait une page de l'autre fichier.
  if (view.kind === 'preferences') view = { kind: 'overview' }
  viewBeforePreferences = undefined
}

/**
 * La session que ce conteneur donne — **fabriquée avant tout démontage**. Elle ne touche à
 * rien : si l'une des lectures échoue, l'appelant n'a qu'à ne pas s'en servir, et le
 * document ouvert n'a pas bougé d'un octet.
 */
function buildSession(container: Container): Session {
  const settings = readRenderSettings(container.document)
  const info = getMember(container.document, 'info')
  const declaredDevice = info ? readString(info, 'device') : undefined
  const device = deviceFor(declaredDevice)
  // C'est l'interface qui connaît le navigateur ET le choix du pilote : `resolveLanguage`
  // reçoit le repli en paramètre, le modèle ne va jamais le chercher lui-même.
  const fallback = labelFallback()
  // L'historique prend le document en charge dès l'ouverture, et le conteneur adopte
  // SON document : les deux ne peuvent alors plus diverger, et `container.modified`
  // reste faux tant que rien n'a été enregistré — un fichier seulement consulté ressort
  // donc toujours octet pour octet.
  // Pris AVANT l'historique, sur l'arbre que `openContainer` vient d'analyser et que rien
  // n'a encore touché. `cloneNode` recopie chaque littéral avec son texte source : la
  // copie est indistinguable de l'original, `3.0` compris.
  const original = cloneNode(container.document)
  const history = createHistory(container.document)
  container.document = history.current()
  const layout = readLayout(container.document)
  const language = resolveLanguage(settings.language, fallback.language)
  return {
    container,
    original,
    layout,
    settings,
    history,
    device,
    declaredDevice: deviceIsDeclared(declaredDevice, device) ? device.label : undefined,
    language,
    labelSource: settings.language.kind === 'explicit' ? 'file' : fallback.source,
    versionCode: info ? readNumber(info, 'versionCode') : undefined,
    versionName: info ? readString(info, 'versionName') : undefined,
    warnings: computeWarnings({
      document: container.document, layout, settings, language, tr: translator()
    })
  }
}

/** L'échec d'ouverture en pleine page — le seul écran qui porte la marche à suivre. */
function failToOpen(detail: string): void {
  closeDocument()
  failure = detail
  view = { kind: 'overview' }
  render()
}

/** Le remplacement lui-même, une fois qu'il est acquis et qu'il ne peut plus échouer. */
function adopt(container: Container): void {
  let built: Session
  try {
    built = buildSession(container)
  } catch (error) {
    // Rien n'a encore été démonté : le document ouvert survit à cet échec-là aussi.
    const work = unsavedWork()
    const detail = formatTechnicalDetail(error, translator())
    if (work) tellUnreadable(container.fileName, work.fileName, detail)
    else failToOpen(detail)
    return
  }

  closeDocument()
  session = built
  installDeviceSelector(built.device)
  // La règle « gadget Pro sans licence » du contrôle avant vol attend un morceau
  // téléchargé à part. Le rendu d'en bas se fait sans elle ; celui-ci la porte, et
  // seulement si le pilote regarde toujours le même fichier — sinon il repeindrait la
  // vue d'ensemble d'un fichier qu'il vient de refermer.
  void loadProWidgets(built.language).then(() => { if (session === built) render() })
  view = { kind: 'overview' }
  render()
}

interface LoadOptions {
  /**
   * Le pilote a déjà été prévenu ailleurs, et a déjà dit oui. La bibliothèque pose sa
   * propre question — « ranger d'abord, puis charger » —, mieux placée que celle-ci
   * puisqu'elle offre l'issue qui ne perd rien : la reposer serait la faire cliquer deux
   * fois pour un seul geste.
   */
  confirmed?: boolean
}

/**
 * Ouvrir des octets, d'où qu'ils viennent : le sélecteur de fichiers, un dépôt à la
 * souris, ou une entrée de la bibliothèque — dont les octets ont déjà été vérifiés contre
 * leur empreinte avant d'arriver ici.
 *
 * **L'ordre a changé, et c'est tout le correctif.** Les octets sont lus d'abord ; le
 * document ouvert n'est démonté qu'une fois qu'on tient de quoi le remplacer *et* que le
 * pilote l'a accepté. Trois conséquences, dans cet ordre :
 *
 * 1. Un fichier illisible ne détruit plus un travail non enregistré : il n'y a rien à
 *    mettre à la place, on ne démonte donc rien et on le dit dans une boîte.
 * 2. Un document modifié ne se fait pas écraser sans un mot.
 * 3. Refuser ne demande aucune restauration : rien n'a été défait, il n'y a rien à
 *    refaire.
 */
async function loadBytes(
  bytes: Uint8Array, name: string, options: LoadOptions = {}
): Promise<void> {
  const work = unsavedWork()

  let container: Container | undefined
  let unreadable: string | undefined
  try {
    container = await openContainer(bytes, name)
    // Un contenu qui n'a pas pu être analysé n'est pas une exception : le conteneur
    // existe, il porte ses octets intacts et son échec. Il n'en reste pas moins un
    // cul-de-sac — la vue qu'il donne ne sait rien montrer.
    unreadable = container.parseError
  } catch (error) {
    unreadable = formatTechnicalDetail(error, translator())
  }

  // Un fichier illisible ne prend jamais la place d'un travail non enregistré : ce serait
  // échanger un document valide contre une impasse, et sur un geste — un dépôt à la
  // souris — que le pilote n'a même pas eu à confirmer.
  if (unreadable !== undefined && work !== undefined) {
    tellUnreadable(name, work.fileName, unreadable)
    return
  }

  // Sans rien à perdre, l'échec reprend la pleine page, comme avant : c'est là que se
  // trouve la marche à suivre, et il n'y a aucune session à préserver derrière.
  if (container === undefined) {
    failToOpen(unreadable ?? '')
    return
  }

  if (work === undefined || options.confirmed === true) {
    adopt(container)
    return
  }
  askBeforeReplace(name, work, () => adopt(container))
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
 *
 * La question passe par `unsavedWork()`, la même que celle du remplacement de document.
 * Un pilote qui voyait le navigateur le retenir à la fermeture et l'outil écraser sans un
 * mot au dépôt d'un fichier avait sous les yeux deux réponses contradictoires à une
 * question unique : il n'y en a plus qu'une.
 *
 * ⚠️ **Un avertissement qui paraît quand il n'y a rien à perdre est un avertissement qu'on
 * cesse de lire.** `container.modified` ne suffit donc pas à le déclencher : il reste vrai
 * après l'enregistrement, et le pilote qui venait d'écrire son fichier était retenu quand
 * même. `savedRevision` répond à la vraie question — le document a-t-il bougé depuis qu'il
 * a été écrit en entier ? Les deux autres portes restent fermées comme avant : un document
 * intact ne demande rien, un document ramené à son état d'origine par annulation non plus
 * (`history.isDirty()`).
 *
 * Relevé le 2026-08-22 sous Chrome : le navigateur montre **son** texte, que la page ne
 * choisit pas et ne peut pas allonger ; refuser la sortie annule bien le rechargement.
 */
window.addEventListener('beforeunload', (event) => {
  if (unsavedWork() === undefined) return
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
  //
  // ⚠️ **Ce que cette coupure protège, nommément, et pourquoi elle reste.** `render()`
  // remet trois boîtes d'accord avec le document — `syncPagesDialog`, `syncPaletteDialog`,
  // `syncVersionDialog` —, et la bibliothèque lit le document par un **getter**
  // (`currentForLibrary`), donc au geste et jamais figé. La boîte de partage, elle, est
  // bâtie **une fois** sur un instantané : `sharingSource(current)` retient le nœud
  // `container.document` et le `modified` de l'instant, `warningNotice` est calculé au
  // même moment, et rien ne la resynchronise. Or `history.undo()` rend un **arbre neuf**.
  // Un Ctrl+Z sous cette boîte-là lui laisserait donc annoncer le compte de données
  // personnelles, le nom de fichier et la promesse « telle qu'elle est » d'un document qui
  // n'existe plus, avant d'écrire des octets qui ne sont pas ceux qu'elle décrit. C'est le
  // seul défaut que la coupure évite, et il suffit à la garder.
  //
  // Elle a un prix, et il se paie ailleurs : depuis « Gérer les pages », le remède nommé
  // par l'annonce devenait inatteignable — `showModal()` rend inerte tout ce qui entoure
  // la boîte, barre de tête comprise. La réponse n'est pas de rouvrir Ctrl+Z pour tout le
  // monde, c'est de porter le remède dans la boîte : voir `PageManagerOptions.onUndo`, qui
  // ne passe que par des boîtes que `render()` resynchronise.
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
void loadTranslator(currentUiLanguage).then((loaded) => {
  uiTranslator = loaded
  // Les mots du cadre d'abord, son accrochage ensuite, la vue enfin : le premier
  // affichage porte donc déjà toute sa prose, et le pilote ne voit à aucun moment une
  // barre de boutons vides.
  installChromeProse(loaded)
  attachChrome()
  render()
})
