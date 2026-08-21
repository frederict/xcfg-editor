import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readNumber, readString } from '../../core/access'
import { widgetBoolean } from '../defaults'
import { readRotation } from './rotation'

/**
 * `WCompMap`, `WXCAssistant`, `WThermalAssistant` — les trois cartes (rendu-observe.md,
 * « Cartes » et « Assistant de thermique », captures `widget-WThermalAssistant-*.png` et
 * `ecran-non-identifie-4.png`). Un seul module paramétré plutôt que trois fichiers : la
 * charpente (vue centrée sur le pilote, trace, échelle, étiquette, boussole de coin) est
 * réellement partagée entre les trois types — seule `WThermalAssistant` ajoute la trace
 * colorée selon le taux de montée, le cercle de thermique et le vent. Dupliquer cette
 * charpente dans trois fichiers aurait fait diverger silencieusement le style à la
 * première modification de l'un des trois.
 *
 * **Ce que ce module dessine, sciemment sobre** (consigne explicite de la tâche : ces
 * widgets sont ceux au-dessus desquels tous les autres se posent, souvent en
 * semi-transparence — un fond chargé rendrait la page illisible) : un fond neutre très
 * clair, une trace d'exemple fixe, le symbole du pilote, l'échelle si sa clé le demande,
 * une étiquette de balise. Pas de fond OpenStreetMap, pas d'espaces aériens, pas de
 * relief, pas de bibliothèque de cartographie — ce n'est pas dans la consigne et ce
 * serait tout sauf sobre.
 *
 * **Rien n'est calculé depuis les données réelles du fichier** (position GPS, zoom,
 * trace de vol) : comme les valeurs d'exemple des widgets numériques (numeric.ts), tout
 * ce qui est dessiné ici est une valeur statique fixe qui juge la mise en page, pas une
 * simulation de navigation.
 */

export type MapKind = 'WCompMap' | 'WXCAssistant' | 'WThermalAssistant'

/**
 * `fontSize` (`SMALL`/`MEDIUM`/`LARGE`) n'existe que sur ces trois types dans le corpus
 * (jamais sur les 23 widgets numériques). Aucune valeur en pixels ou en pourcentage
 * n'est documentée : le rapport observé (rendu-observe.md) ne couvre pas ce détail au
 * pixel près. On retient un facteur multiplicatif raisonnable sur la taille de base des
 * étiquettes et du vent, sur le même principe que `titleSizePercent` pour les widgets
 * numériques (numeric.ts) — non tranché au pixel près, mais nécessaire pour qu'une
 * différence soit au moins visible et testable.
 */
const FONT_SCALE: Record<string, number> = { SMALL: 0.8, MEDIUM: 1, LARGE: 1.25 }
const DEFAULT_FONT_SCALE = 1

function fontScale(widget: Widget): number {
  const size = readString(widget.node, 'fontSize')
  const scale = size !== undefined ? FONT_SCALE[size] : undefined
  return scale ?? DEFAULT_FONT_SCALE
}

/**
 * `line_thickness` (10 ou 20 sur le corpus) module l'épaisseur du trait récent. Valeur
 * de base à `line_thickness === 10`, doublée à 20 — proportion directe, la seule lecture
 * qui ne suppose rien de plus que ce que la clé porte déjà.
 */
const BASE_RECENT_WIDTH = 3
const BASE_LINE_THICKNESS = 10

function recentTraceWidth(widget: Widget): number {
  const thickness = readNumber(widget.node, 'line_thickness') ?? BASE_LINE_THICKNESS
  return BASE_RECENT_WIDTH * (thickness / BASE_LINE_THICKNESS)
}

/** Espace de coordonnées SVG interne, indépendant du rapport largeur/hauteur réel du
 * widget — la scène est ensuite mise à l'échelle en `slice` (voir `buildScene`). */
const VIEW_W = 300
const VIEW_H = 200
const CENTER_X = VIEW_W / 2
const CENTER_Y = VIEW_H / 2

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/**
 * Fond + trace d'exemple, communs aux trois types. Le fond déborde largement du
 * viewBox : `preserveAspectRatio="xMidYMid slice"` recadre la scène pour couvrir tout
 * widget quel que soit son rapport largeur/hauteur, et le fond doit couvrir la zone
 * recadrée en plus.
 */
function buildScene(widget: Widget, kind: MapKind): SVGSVGElement {
  const svg = svgEl('svg', {
    class: 'xc-map__scene',
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: 'xMidYMid slice'
  })

  svg.append(svgEl('rect', { class: 'xc-map__bg', x: '-50', y: '-50', width: `${VIEW_W + 100}`, height: `${VIEW_H + 100}` }))

  // Trace d'exemple fixe : longue diagonale lointaine (fine, noire) qui se resserre en
  // approche du pilote (récente, épaisse grise) — même silhouette générale que les
  // captures (widget-WThermalAssistant-*.png, ecran-non-identifie-4.png).
  const far = svgEl('path', {
    class: 'xc-map__trace-far',
    d: `M ${VIEW_W - 10} 10 C ${VIEW_W - 60} 50, ${CENTER_X + 40} ${CENTER_Y - 55}, ${CENTER_X + 18} ${CENTER_Y - 20}`,
    fill: 'none'
  })
  svg.append(far)

  const recent = svgEl('path', {
    class: 'xc-map__trace-recent',
    d: `M ${CENTER_X + 18} ${CENTER_Y - 20} C ${CENTER_X + 5} ${CENTER_Y - 5}, ${CENTER_X - 8} ${CENTER_Y + 6}, ${CENTER_X - 2} ${CENTER_Y + 2}`,
    fill: 'none',
    'stroke-width': String(recentTraceWidth(widget)),
    'stroke-linecap': 'round'
  })
  svg.append(recent)

  if (kind === 'WThermalAssistant') {
    // Trace colorée selon le taux de montée — l'information centrale du widget
    // (rendu-observe.md, « Assistant de thermique ») : deux tours de spirale fixes,
    // vert vif (forte montée) puis jaune (montée moyenne), non gatés par une clé — comme
    // la trace fine/grise, c'est un élément de la charpente illustrative, pas une
    // donnée basculée par une préférence du fichier.
    const strong = svgEl('path', {
      class: 'xc-map__trace-climb xc-map__trace-climb--strong',
      d: `M ${CENTER_X - 2} ${CENTER_Y + 2} a 14 14 0 1 1 0.1 0`,
      fill: 'none',
      'stroke-linecap': 'round'
    })
    const medium = svgEl('path', {
      class: 'xc-map__trace-climb xc-map__trace-climb--medium',
      d: `M ${CENTER_X - 2} ${CENTER_Y + 2} a 9 9 0 1 0 -0.1 0`,
      fill: 'none',
      'stroke-linecap': 'round'
    })
    svg.append(strong, medium)
  }

  if (kind === 'WThermalAssistant' && (widgetBoolean(widget, 'drawCircle') ?? false)) {
    // Cercle bleu épais marquant le centre estimé du thermique, avec un point coloré au
    // milieu (rendu-observe.md) — WThermalAssistant seulement, consigne explicite.
    svg.append(svgEl('circle', {
      class: 'xc-map__thermal-circle', cx: String(CENTER_X - 2), cy: String(CENTER_Y + 2), r: '16', fill: 'none'
    }))
    svg.append(svgEl('circle', {
      class: 'xc-map__thermal-dot', cx: String(CENTER_X - 2), cy: String(CENTER_Y + 2), r: '2.4'
    }))
  }

  // Symbole du pilote : petit triangle blanc cerné de noir, pointant dans la direction
  // du vol (rendu-observe.md). Direction fixe et illustrative, comme le reste de la
  // trace — aucune donnée de cap n'est modélisée ici.
  const pilot = svgEl('g', {
    class: 'xc-map__pilot',
    transform: `translate(${CENTER_X - 2} ${CENTER_Y + 2}) rotate(-25)`
  })
  pilot.append(svgEl('polygon', { points: '0,-9 6,7 0,3 -6,7' }))
  svg.append(pilot)

  const rotation = readRotation(widget.node)
  if (rotation.showCompass) {
    // Boussole de coin : petit disque en bas à droite avec une aiguille
    // (rendu-observe.md, « Cartes »).
    const compass = svgEl('g', { class: 'xc-map__compass', transform: `translate(${VIEW_W - 18} ${VIEW_H - 18})` })
    compass.append(svgEl('circle', { r: '11' }))
    compass.append(svgEl('line', { x1: '0', y1: '0', x2: '0', y2: '-8' }))
    svg.append(compass)
  }

  return svg
}

/** Segment d'échelle avec sa longueur, en bas à gauche (rendu-observe.md). Longueur
 * fixe d'exemple — comme la valeur des widgets numériques, elle ne dérive d'aucun
 * zoom réel : `mapWidget_scale`/`mapScale` ne portent qu'un niveau de zoom de tuiles,
 * pas une distance, et aucune formule de conversion n'est sourcée dans ce projet. */
const SCALE_LABEL = '150m'

function buildScale(): HTMLElement {
  const scale = document.createElement('div')
  scale.className = 'xc-map__scale'
  const bar = document.createElement('span')
  bar.className = 'xc-map__scale-bar'
  const label = document.createElement('span')
  label.className = 'xc-map__scale-label'
  label.textContent = SCALE_LABEL
  scale.append(bar, label)
  return scale
}

/** `WThermalAssistant` gate l'échelle avec la clé `drawScale` (sans préfixe) ; les deux
 * autres types utilisent `mapWidget_drawScale` — deux clés distinctes pour la même
 * fonction, relevé sur le corpus (`Exemples/*.xcfg`), pas une supposition. */
function drawScaleEnabled(widget: Widget, kind: MapKind): boolean {
  const key = kind === 'WThermalAssistant' ? 'drawScale' : 'mapWidget_drawScale'
  // Les deux clés valent `true` par défaut sur les trois types (relevé des 75 widgets) :
  // l'ancien `=== true` supprimait la barre d'échelle de tout fichier qui ne les écrit
  // pas, ce que la revue des visuels constate au § 2.5 (« barre d'échelle absente »).
  return widgetBoolean(widget, key) ?? false
}

/** Étiquette de balise : texte rouge cerné de blanc, sur deux lignes — nom puis valeur
 * entre crochets pour signaler une estimation (rendu-observe.md, `nav_use_brackets`).
 * Toujours dessinée, comme le fond et la trace : c'est un élément de la charpente
 * illustrative listée explicitement dans la consigne de la tâche, pas un élément gaté
 * par une clé du fichier — aucune clé de ce type n'a été trouvée sur le corpus pour
 * WThermalAssistant (contrairement à WCompMap/WXCAssistant, qui ont `wpt_showTakeoffs`
 * etc., mais toujours à `false` ou absents sur les occurrences observées). Le texte
 * reprend l'exemple donné dans la consigne de la tâche.
 */
const LABEL_NAME = 'Décollage'
const LABEL_ALT = '[23 m]'

function buildLabel(scale: number): HTMLElement {
  const label = document.createElement('div')
  label.className = 'xc-map__label'
  label.style.fontSize = `${scale}em`
  const name = document.createElement('span')
  name.className = 'xc-map__label-name'
  name.textContent = LABEL_NAME
  const alt = document.createElement('span')
  alt.className = 'xc-map__label-alt'
  alt.textContent = LABEL_ALT
  label.append(name, alt)
  return label
}

/** Vent : vitesse en gros caractères gris au-dessus d'une flèche de direction, en bas au
 * centre (rendu-observe.md, « Assistant de thermique »). `nav_showWind` existe aussi
 * sur `WCompMap`/`WXCAssistant` dans le corpus, mais aucune capture ne confirme son
 * apparition sur ces deux types — restreint à `WThermalAssistant`, seul type observé
 * (voir le rapport de tâche). */
const WIND_EXAMPLE_SPEED = '11 km/h'

function buildWind(scale: number): HTMLElement {
  const wind = document.createElement('div')
  wind.className = 'xc-map__wind'
  const speed = document.createElement('span')
  speed.className = 'xc-map__wind-speed'
  speed.style.fontSize = `${scale}em`
  speed.textContent = WIND_EXAMPLE_SPEED
  const arrow = document.createElementNS(SVG_NS, 'svg')
  arrow.setAttribute('class', 'xc-map__wind-arrow')
  arrow.setAttribute('viewBox', '0 0 24 24')
  arrow.innerHTML = '<line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M6 10 L12 4 L18 10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
  wind.append(speed, arrow)
  return wind
}

function drawMap(widget: Widget, _settings: RenderSettings, _language: string, kind: MapKind): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-map'

  element.append(buildScene(widget, kind))

  if (drawScaleEnabled(widget, kind)) element.append(buildScale())

  const scale = fontScale(widget)
  element.append(buildLabel(scale))

  // `nav_showWind` vaut `true` par défaut : l'indicateur de vent que la revue signale
  // absent au § 2.5 l'était pour la même raison que la barre d'échelle ci-dessus.
  if (kind === 'WThermalAssistant' && (widgetBoolean(widget, 'nav_showWind') ?? false)) {
    element.append(buildWind(scale))
  }

  return element
}

export function drawCompMap(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  return drawMap(widget, settings, language, 'WCompMap')
}

export function drawXCAssistant(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  return drawMap(widget, settings, language, 'WXCAssistant')
}

export function drawThermalAssistant(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  return drawMap(widget, settings, language, 'WThermalAssistant')
}
