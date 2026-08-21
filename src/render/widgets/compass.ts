import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'
import { readRotation } from './rotation'

/**
 * `WCompass` — « Boussole et vent » (libellé officiel `fr`, `docs/reference/edition-
 * native.md`). Le libellé décrit exactement le widget : un cadran, des flèches, et un
 * indicateur de vent.
 *
 * ## Ce que le rejeu du 2026-08-21 corrige — et pourquoi la lecture précédente trompait
 *
 * Le relevé précédent partait de sept captures dans lesquelles la boussole ne portait
 * JAMAIS qu'une flèche à la fois. Il en avait déduit qu'il n'y a **qu'une aiguille**,
 * dont `showBearing` choisirait la teinte : rouge quand il vaut `false`, gris quand il
 * vaut `true`. **C'est faux, et le tableau des cinq états ci-dessous reste pourtant
 * exact** — les deux affirmations sont compatibles, et c'est là que l'erreur se logeait.
 *
 * Une page de diagnostic (huit boussoles côte à côte, `windStyle` et `showBearing`
 * croisés, puis une seconde planche avec `navigation_target: "NONE"`) importée sur
 * l'AIR³ 7.2 pendant le rejeu de `2026-07-09-XCT-FTE-01.igc` montre **trois flèches
 * indépendantes**, qui peuvent coexister sur le même cadran :
 *
 * | flèche | dessinée quand | teintes mesurées |
 * |---|---|---|
 * | navigation | `navigation_target` ≠ `"NONE"` (défaut `"OPTIMIZED"`) | `#e04040` / `#c02020` |
 * | trajectoire (« Montrer la flèche de trajectoire ») | `showBearing` | `#808080` / `#606060` |
 * | cap (« Montrer la flèche de cap ») | `showHeading` | `#808080` / `#606060` |
 *
 * Les sept captures d'origine portaient toutes `navigation_target: "NONE"` **ou**
 * `showBearing: false` : jamais les deux à la fois. D'où la corrélation trompeuse entre
 * `showBearing` et la teinte. Le tableau des cinq états relevés reste vrai ligne à
 * ligne, il était seulement **incomplet** :
 *
 * | `showBearing` | `windStyle` | vent | ce que l'appareil dessine | cause réelle |
 * |---|---|---|---|---|
 * | `false` | `NONE` | 0 | flèche ROUGE seule | `navigation_target: "OPTIMIZED"` |
 * | `true` | `ARC` | 0 | flèche GRISE seule | `navigation_target: "NONE"` |
 * | `true` | `ARC` | 22 km/h | flèche GRISE + zone NOIRE | idem + secteur de vent |
 * | `false` | `ARROW` | 0 | flèche ROUGE seule | `navigation_target: "OPTIMIZED"` |
 * | `false` | `ARROW` | 22 km/h | flèche ROUGE + branche JAUNE-OLIVE | idem + flèche de vent |
 *
 * Vérification directe (`page2-navNONE`, rangée haute) : `navigation_target: "NONE"`,
 * `showBearing: false`, `showHeading: false` → **cadran entièrement vide**, l'indicateur
 * de vent seul. Aucune flèche n'est inconditionnelle.
 *
 * ## Les trois flèches ont la MÊME forme
 *
 * Mesurée sur trois captures plein écran séparées (rayon du cadran 355 px), la flèche
 * de navigation, celle de trajectoire et la flèche de vent `ARROW` sont le même polygone
 * à quatre sommets, au pixel près — aires respectives 85 486, 85 776 et 85 576 px :
 *
 * | sommet | rayon mesuré | angle |
 * |---|---|---|
 * | pointe | 0,945 R | l'axe |
 * | barbes | 0,852 R | ±40,0° de l'axe arrière |
 * | creux | 0,291 R | sur l'axe arrière |
 *
 * La facette CLAIRE est celle de gauche quand la pointe est en haut (barycentre relevé
 * à −89,5° de la pointe sur les trois captures). Les valeurs précédentes (0,92 / 0,82 /
 * 0,24), relevées sur un cadran de 208 px, sont corrigées par ce relevé trois fois plus
 * fin.
 *
 * ## L'indicateur de vent — l'aide contextuelle de l'appareil le décrit mot pour mot
 *
 * `reglages-aide-contextuelle-style-vent.png` (écran de réglage du widget, langue `fr`) :
 *
 * > **Aucun** – l'indicateur de vent est masqué.
 * > **Flèche** – flèche triangulaire classique bicolore pointant vers où souffle le vent.
 * > **Arc** – segment d'arc rempli indiquant le secteur au vent avec une ligne centrale.
 * > **Manche à air** – cône effilé ressemblant à une véritable manche à air d'aéroport.
 * > L'extrémité large fait face au vent, la pointe étroite est orientée vers où souffle
 * > le vent. La vitesse du vent est indiquée par le nombre de bandes colorées (1 à 5).
 *
 * Ce texte tranche deux points que le rendu précédent avait faux :
 *
 * 1. **`ARC` et `ARROW` pointent en sens INVERSE.** `ARC` montre le secteur *au vent*
 *    (d'où il vient), `ARROW` montre *où il souffle*. Vérifié : vent de 274°, secteur
 *    noir centré sur 274,1°, flèche olive pointée sur 94,2°.
 * 2. **`ARC` n'est pas un triangle** posé à côté de l'aiguille — c'était le défaut
 *    signalé, deux triangles opposés qui se contredisent au lieu d'une boussole.
 *
 * ### `ARC` — secteur plein, sommet AU CENTRE (mesuré, plein écran, R = 355 px)
 *
 * | grandeur | mesure |
 * |---|---|
 * | sommet | 3,8 px du centre, soit 0,011 R — le centre |
 * | rayon extérieur | 0,984 R, c'est-à-dire le bord INTÉRIEUR de la couronne |
 * | ouverture | 239,26° → 308,92°, soit **69,7°**, centrée sur la direction du vent |
 * | ligne centrale | filet blanc de 2 px, du sommet à la couronne, sur l'axe du secteur |
 *
 * Le rayon intérieur non nul lu sur les captures précédentes (0,24 R … 0,31 R selon la
 * capture) était une **occultation par la flèche**, pas une forme : le quadrilatère de
 * la flèche couvre toujours un voisinage du centre. Sur la planche sans flèche, le
 * secteur descend jusqu'au centre.
 *
 * ### `WINDSOCK` — et non `SOCK`
 *
 * `SOCK` n'a jamais existé : le catalogue extrait de l'APK (`src/catalog/widgetOptions/
 * base.json`) donne `NONE`, `ARROW`, `ARC`, **`WINDSOCK`**. Écrire `"SOCK"` dans un
 * fichier et l'importer ne dessine RIEN sur l'appareil — vérifié, c'est ainsi que la
 * valeur a été trouvée. Une valeur inconnue est donc traitée comme `NONE`, ici comme
 * là-bas.
 *
 * Manche à air relevée (première observation du corpus, plein écran) : un trapèze dont
 * les **quatre sommets sont sur un cercle de 0,72 R**, bouche à ±33,2° de la direction
 * d'où vient le vent, pointe à ±11,5° de la direction opposée ; cerne noir ; cinq
 * tranches égales le long de l'axe dont **la première et la troisième sont olive**
 * `#c0c040`, les autres blanches ; lèvre `#a0a020` à la bouche.
 *
 * **NON TRANCHÉ** : l'aide annonce 1 à 5 bandes selon la vitesse (2 bandes pour
 * 1,5–3,5 m/s, 3 bandes pour 3,5–6 m/s). Les trois observations disponibles — 21, 22 et
 * 23 km/h, soit 5,8 à 6,4 m/s — montrent toutes **2 bandes**, pas 3. Le rendu fixe deux
 * bandes, faute de savoir ce que compte réellement l'appareil.
 *
 * ## Ordre de superposition (mesuré)
 *
 * Vent AU-DESSOUS du cadran, flèches AU-DESSUS. Les deux sens ont été vérifiés au pixel
 * sur un profil radial : la graduation cardinale `#404040` recouvre le secteur noir à
 * partir de 0,70 R (`page3-arc-plein`), et la flèche de navigation recouvre la
 * graduation ordinaire jusqu'à 0,89 R (`v3-p4-rouge`).
 *
 * **NON REPRODUIT** : là où deux flèches se croisent, l'appareil les mélange —
 * `#e04040` sur `#808080` donne `#b45c5c`, soit 55 % de la flèche du dessus. Ce n'est
 * pas de l'alpha simple : la même flèche est un aplat franc sur le blanc. Nos flèches se
 * recouvrent en aplat.
 *
 * ## Géométrie du cadran, mesurée au pixel
 *
 * | grandeur | mesure | valeur retenue (repère de 200) |
 * |---|---|---|
 * | bord extérieur de la couronne | 0,998 demi-côté (deux tailles de widget) | 100 |
 * | épaisseur de la couronne | 9 px, constants quelle que soit la taille | `stroke-width: 4.2` |
 * | rayon médian | bord extérieur − épaisseur / 2 | `RING_R` = 98 |
 * | graduations ordinaires | de 0,803 R à 1,011 R | 78 → 98 |
 * | graduations cardinales | de 0,704 R à 1,011 R | 68 → 98 |
 * | N — centre optique | 0,78 R (planche) / 0,81 R (plein écran) | 76 |
 *
 * **NON REPRODUIT** : les épaisseurs de trait de l'appareil sont constantes en pixels
 * (couronne 9 px, graduation 7 px) quelle que soit la taille du cadran ; les nôtres
 * suivent l'échelle du `viewBox`. Elles sont calées sur le cadran de 208 px de la
 * planche : plus grand, notre trait épaissit là où celui de l'appareil ne bouge pas.
 * De même la lettre N, dont la hauteur de casse passe de 0,18 R à 0,24 R entre les deux
 * tailles sur l'appareil — sa BASE, elle, reste à 0,68 R.
 *
 * **Le N appartient à la couronne et tourne avec elle** sous `rotation: "HEADING"`.
 * Aucune donnée réelle n'étant modélisée ici, tous les angles sont illustratifs.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW = 200
const CENTER = VIEW / 2
/** Rayon médian de la couronne — bord extérieur au demi-côté, moins la demi-épaisseur. */
const RING_R = 98
/**
 * Bord INTÉRIEUR de la couronne, en fraction de `RING_R` : c'est là que s'arrête le
 * secteur de vent (0,984 R mesuré, 0,979 ici pour une couronne de 4,2 d'épaisseur).
 */
const RING_INNER = (RING_R - 4.2 / 2) / RING_R

/** Douze positions de 30° en 30°, la position nord (0°) exclue : sur la capture, le seul
 * trait sous le N est masqué par la lettre. Onze traits restent visibles, dont les trois
 * cardinaux E/S/O, plus longs et plus épais. */
const TICK_ANGLES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
const CARDINAL_ANGLES = new Set([90, 180, 270])

/** Bornes radiales des graduations, en fraction de `RING_R` (mesurées, voir le tableau
 * du commentaire de tête). Elles montent jusqu'à la couronne, dont elles touchent le
 * bord intérieur. */
const TICK_OUTER = 1.0
const TICK_INNER = 0.8
const TICK_INNER_CARDINAL = 0.69

/** Distance du centre optique du N au centre du cadran, en fraction de `RING_R`. */
const N_DISTANCE = 0.78

/** Coordonnée polaire → cartésienne, 0° au nord et sens horaire comme sur un cadran. */
function polar(radius: number, degrees: number): [number, number] {
  const rad = (degrees - 90) * (Math.PI / 180)
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

function point(radius: number, degrees: number): string {
  const [x, y] = polar(radius, degrees)
  return `${x.toFixed(1)},${y.toFixed(1)}`
}

function buildDial(): SVGGElement {
  const dial = svgEl('g', { class: 'xc-compass__dial' })

  dial.append(svgEl('circle', { class: 'xc-compass__ring', cx: String(CENTER), cy: String(CENTER), r: String(RING_R), fill: 'none' }))

  for (const angle of TICK_ANGLES) {
    const cardinal = CARDINAL_ANGLES.has(angle)
    const [x1, y1] = polar(RING_R * TICK_OUTER, angle)
    const [x2, y2] = polar(RING_R * (cardinal ? TICK_INNER_CARDINAL : TICK_INNER), angle)
    dial.append(svgEl('line', {
      class: cardinal ? 'xc-compass__tick xc-compass__tick--cardinal' : 'xc-compass__tick',
      x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1)
    }))
  }

  // `dominant-baseline: middle` (style.css) : `y` est le centre optique de la lettre, ce
  // que la mesure donne directement — une base ou un `hanging` obligerait à réintroduire
  // la hauteur de casse dans le calcul, et c'est justement elle qui varie avec la police
  // du navigateur.
  const n = svgEl('text', {
    class: 'xc-compass__n', x: String(CENTER), y: (CENTER - RING_R * N_DISTANCE).toFixed(1),
    'text-anchor': 'middle'
  })
  n.textContent = 'N'
  dial.append(n)

  return dial
}

/** Sommets de la flèche, en fraction de `RING_R` — voir le tableau du commentaire de tête. */
const ARROW_TIP = 0.945
const ARROW_BARB = 0.852
const ARROW_NOTCH = 0.291
/** Écart des barbes à l'axe arrière, mesuré à ±40,0° sur les trois flèches. */
const ARROW_BARB_ANGLE = 40

/** Les quatre teintes de flèche, dans l'ordre où l'appareil les empile. */
type ArrowKind = 'wind' | 'heading' | 'track' | 'navigation'

/**
 * Flèche à deux facettes séparées par son axe — une seule forme pour les quatre usages,
 * parce que l'appareil n'en dessine qu'une (aires mesurées identiques à 0,4 % près sur
 * trois captures plein écran). `kind` ne porte que la teinte.
 */
function buildArrow(kind: ArrowKind, angle: number): SVGGElement {
  const arrow = svgEl('g', {
    class: `xc-compass__arrow xc-compass__arrow--${kind}`,
    transform: `rotate(${angle} ${CENTER} ${CENTER})`
  })

  const tip = point(RING_R * ARROW_TIP, 0)
  const notch = point(RING_R * ARROW_NOTCH, 180)
  const right = point(RING_R * ARROW_BARB, 180 - ARROW_BARB_ANGLE)
  const left = point(RING_R * ARROW_BARB, 180 + ARROW_BARB_ANGLE)

  // La facette SOMBRE porte la barbe droite (repère local, pointe en haut) : le
  // barycentre de la facette claire tombe à −89,5° de la pointe sur les trois captures.
  arrow.append(svgEl('polygon', {
    class: 'xc-compass__arrow-facet xc-compass__arrow-facet--dark',
    points: `${tip} ${right} ${notch}`
  }))
  arrow.append(svgEl('polygon', {
    class: 'xc-compass__arrow-facet xc-compass__arrow-facet--light',
    points: `${tip} ${left} ${notch}`
  }))

  return arrow
}

/** Ouverture totale du secteur `ARC`, mesurée à 69,7° sur un cadran de 355 px. */
const ARC_SPREAD = 70

/**
 * `ARC` — secteur plein du centre à la couronne, centré sur la direction D'OÙ vient le
 * vent, avec sa ligne centrale blanche. Le `path` décrit un vrai secteur circulaire :
 * sommet au centre, deux rayons, un arc.
 */
function buildWindArc(windFrom: number): SVGGElement {
  const wind = svgEl('g', { class: 'xc-compass__wind xc-compass__wind--arc' })
  const radius = RING_R * RING_INNER
  const [x1, y1] = polar(radius, windFrom - ARC_SPREAD / 2)
  const [x2, y2] = polar(radius, windFrom + ARC_SPREAD / 2)
  wind.append(svgEl('path', {
    class: 'xc-compass__wind-sector',
    d: `M ${CENTER} ${CENTER} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
  }))
  const [lx, ly] = polar(radius, windFrom)
  wind.append(svgEl('line', {
    class: 'xc-compass__wind-axis',
    x1: String(CENTER), y1: String(CENTER), x2: lx.toFixed(1), y2: ly.toFixed(1)
  }))
  return wind
}

/** Manche à air : quatre sommets sur ce cercle, bouche à ±33,2°, pointe à ±11,5°. */
const SOCK_RADIUS = 0.72
const SOCK_MOUTH_HALF = 33.2
const SOCK_TIP_HALF = 11.5
/** Cinq tranches égales le long de l'axe ; la première et la troisième sont colorées. */
const SOCK_BANDS = [0, 2]
const SOCK_SLICES = 5

/**
 * `WINDSOCK` — trapèze effilé dont la bouche fait face au vent. Les tranches sont
 * découpées le long de l'axe par interpolation linéaire des deux bords, ce qui suit
 * l'effilement sans avoir à modéliser un cône.
 */
function buildWindSock(windFrom: number): SVGGElement {
  const wind = svgEl('g', { class: 'xc-compass__wind xc-compass__wind--sock' })
  const radius = RING_R * SOCK_RADIUS
  const mouthLeft = polar(radius, windFrom - SOCK_MOUTH_HALF)
  const mouthRight = polar(radius, windFrom + SOCK_MOUTH_HALF)
  const tipLeft = polar(radius, windFrom + 180 + SOCK_TIP_HALF)
  const tipRight = polar(radius, windFrom + 180 - SOCK_TIP_HALF)

  const along = (from: [number, number], to: [number, number], t: number): string =>
    `${(from[0] + t * (to[0] - from[0])).toFixed(1)},${(from[1] + t * (to[1] - from[1])).toFixed(1)}`

  wind.append(svgEl('polygon', {
    class: 'xc-compass__wind-sock-body',
    points: `${along(mouthLeft, tipLeft, 0)} ${along(mouthLeft, tipLeft, 1)} ${along(mouthRight, tipRight, 1)} ${along(mouthRight, tipRight, 0)}`
  }))

  for (const band of SOCK_BANDS) {
    const a = band / SOCK_SLICES
    const b = (band + 1) / SOCK_SLICES
    wind.append(svgEl('polygon', {
      class: 'xc-compass__wind-sock-band',
      points: `${along(mouthLeft, tipLeft, a)} ${along(mouthLeft, tipLeft, b)} ${along(mouthRight, tipRight, b)} ${along(mouthRight, tipRight, a)}`
    }))
  }

  // La lèvre : la bouche est vue de trois quarts sur l'appareil, un croissant sombre
  // déborde au-delà du bord droit. Une quadratique le rend sans modéliser l'ellipse.
  const [cx, cy] = polar(radius * Math.cos((SOCK_MOUTH_HALF * Math.PI) / 180) * 1.1, windFrom)
  wind.append(svgEl('path', {
    class: 'xc-compass__wind-sock-lip',
    d: `M ${along(mouthLeft, tipLeft, 0)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${along(mouthRight, tipRight, 0)} Z`
  }))

  return wind
}

/**
 * Angles illustratifs : aucune donnée de cap, de trajectoire ou de vent réelle n'est
 * modélisée ici. `NAVIGATION_ANGLE` reprend l'angle effectivement mesuré sur
 * `2026-08-21_planche-sol-8-*` (213°), pour que la comparaison côte à côte avec la
 * capture porte sur la forme et non sur l'orientation. Les autres démontrent que cadran,
 * flèches et vent tournent chacun pour leur compte.
 */
const NAVIGATION_ANGLE = 213
const TRACK_ANGLE = 168
const HEADING_ANGLE = 190
const DIAL_HEADING_ANGLE = -35
/** Direction D'OÙ vient le vent : `ARC` s'ouvre dessus, `ARROW` et la manche pointent à l'opposé. */
const WIND_FROM_ANGLE = 145

function shown(widget: Widget, key: string, fallback: boolean): boolean {
  return readBoolean(widget.node, key) ?? fallback
}

/**
 * `windStyle` est une chaîne nue sur `WCompass` (voir rotation.ts pour le contraste avec
 * les trois cartes). Absent équivaut à `"NONE"`, et **toute valeur hors catalogue aussi**
 * : c'est ce que fait l'appareil, vérifié en lui soumettant `"SOCK"`, qui n'existe pas.
 */
function windStyleOf(widget: Widget): 'ARC' | 'ARROW' | 'WINDSOCK' | undefined {
  const raw = readString(widget.node, 'windStyle')
  if (raw === 'ARC' || raw === 'ARROW' || raw === 'WINDSOCK') return raw
  return undefined
}

/**
 * La flèche de navigation n'est dessinée que si le widget vise quelque chose. Absent
 * équivaut à `"OPTIMIZED"` — la valeur par défaut du catalogue, celle de la planche.
 */
function navigates(widget: Widget): boolean {
  return (readString(widget.node, 'navigation_target') ?? 'OPTIMIZED') !== 'NONE'
}

export function drawCompass(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-compass'

  const svg = svgEl('svg', { class: 'xc-compass__scene', viewBox: `0 0 ${VIEW} ${VIEW}` })

  // Le vent passe SOUS le cadran : la graduation cardinale recouvre le secteur noir à
  // partir de 0,70 R sur la capture.
  const wind = windStyleOf(widget)
  if (wind === 'ARC') svg.append(buildWindArc(WIND_FROM_ANGLE))
  else if (wind === 'WINDSOCK') svg.append(buildWindSock(WIND_FROM_ANGLE))
  else if (wind === 'ARROW') svg.append(buildArrow('wind', WIND_FROM_ANGLE + 180))

  // `showBackground` défaille à `true` : c'est sa valeur par défaut dans le ré-export de
  // XCTrack (§ 3 de la planche), et la majorité du corpus.
  if (shown(widget, 'showBackground', true)) {
    const dial = buildDial()
    // Le cadran — graduations ET lettre N — tourne d'un bloc avec le cap.
    if (readRotation(widget.node).value === 'HEADING') {
      dial.setAttribute('transform', `rotate(${DIAL_HEADING_ANGLE} ${CENTER} ${CENTER})`)
    }
    svg.append(dial)
  }

  // Les flèches passent AU-DESSUS du cadran, et aucune n'est inconditionnelle.
  if (shown(widget, 'showHeading', false)) svg.append(buildArrow('heading', HEADING_ANGLE))
  if (shown(widget, 'showBearing', false)) svg.append(buildArrow('track', TRACK_ANGLE))
  if (navigates(widget)) svg.append(buildArrow('navigation', NAVIGATION_ANGLE))

  element.append(svg)
  return element
}
