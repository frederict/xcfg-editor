import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'
import { readRotation } from './rotation'

/**
 * `WCompass` — « Boussole et vent » (libellé officiel `fr`, `docs/reference/edition-
 * native.md`). Le libellé décrit exactement le widget : un cadran, UNE aiguille, et un
 * indicateur de vent qui se superpose aux deux.
 *
 * **Correction (planche des 75 widgets, écart 1.5)** — le rendu précédent laissait le
 * disque ENTIÈREMENT VIDE avec les valeurs par défaut : 7020 pixels rouges comptés sur
 * l'appareil, 0 dans l'éditeur. La cause : l'aiguille n'était dessinée que si
 * `showHeading` ou `showBearing` valaient `true`, or ils valent `false` par défaut
 * (§ 3 de la planche, ré-export de XCTrack) — et l'appareil dessine quand même son
 * aiguille. Un cadran sans aiguille n'est pas une boussole.
 *
 * ## Ce que sept captures, recoupées avec leur configuration, établissent
 *
 * | capture | `showBearing` | `windStyle` | vent | ce que l'appareil dessine |
 * |---|---|---|---|---|
 * | `2026-08-21_planche-sol-8-*` (défauts) | `false` | `NONE` | 0 | aiguille ROUGE seule |
 * | `2026-08-21_polices-reference` (`pages[0]`) | `true` | `ARC` | 0 | aiguille GRISE seule |
 * | `vol-numeriques-boussole-variocolumn` (`pages[0]`) | `true` | `ARC` | 22 km/h | aiguille GRISE **+ zone NOIRE** |
 * | `ecran-landscape3-17widgets` (`backup[3]`) | `false` | `ARROW` | 0 | aiguille ROUGE seule |
 * | `vol-landscape3-en-vol` (`backup[3]`) | `false` | `ARROW` | 22 km/h | aiguille ROUGE **+ branche JAUNE-OLIVE** |
 * | `widget-WCompass-pleinecran` / `-en-vol` | — | — | — | aiguille GRISE |
 *
 * Trois règles s'en déduisent, et aucune capture ne les contredit :
 *
 * 1. **L'aiguille est toujours là.** Sa teinte dépend de `showBearing` : gris
 *    `#808080`/`#606060` quand il vaut `true`, rouge `#e04040`/`#c02020` sinon. Ce sont
 *    les deux seules configurations mesurées ; rien n'indique une troisième teinte.
 * 2. **L'indicateur de vent est un élément SÉPARÉ**, superposé à l'aiguille, et il ne
 *    paraît qu'avec du vent : les deux captures au sol (vent 0 km/h) n'en montrent
 *    aucun malgré `windStyle: ARC` et `windStyle: ARROW` dans leur fichier. Il ne
 *    REMPLACE pas l'aiguille — c'est l'erreur de la version précédente, qui prenait le
 *    couple « aiguille rouge + branche jaune » de `vol-landscape3-en-vol` pour une
 *    « étoile de vent » à deux branches. Ce sont deux objets distincts : l'aiguille, et
 *    le vent.
 * 3. **`ARC` et `ARROW` ne se dessinent pas pareil** — ce point était marqué NON
 *    TRANCHÉ : `ARC` donne une zone NOIRE unie (11 971 px de `#000000` mesurés sur
 *    `vol-numeriques-boussole-variocolumn`, absents de la même page au sol), `ARROW`
 *    une branche bicolore jaune-olive `#c0c040`/`#a0a020` (559 / 689 px sur
 *    `vol-landscape3-en-vol`, absents de la même page au sol). `SOCK` reste **NON
 *    TRANCHÉ** : aucune capture, aucun fichier du corpus ne le porte — il est rendu
 *    comme `ARROW`, faute de mieux.
 *
 * `showHeading` vaut `false` sur les 15 occurrences du corpus ET sur la planche : aucune
 * capture ne montre ce qu'il ajoute. **NON TRANCHÉ** — il ne pilote plus rien ici, au
 * lieu de piloter la présence de l'aiguille, ce que les mesures démentent.
 *
 * ## Géométrie, mesurée au pixel sur `2026-08-21_planche-sol-8-*`
 *
 * Boîte du widget 427 × 646 px, cadran centré, couronne de diamètre extérieur 426 px —
 * le cadran occupe donc toute la largeur disponible, à 1 px près.
 *
 * | grandeur | mesure | valeur retenue (repère de 200) |
 * |---|---|---|
 * | rayon médian de la couronne | 208,5 px = 0,977 demi-largeur | `RING_R` = 98 |
 * | épaisseur de la couronne | 9 px = 0,042 demi-largeur | `stroke-width: 4.2` |
 * | graduations ordinaires | de 0,80 R à 1,00 R | 78 → 98 |
 * | graduations cardinales | de 0,69 R à 1,00 R | 68 → 98 |
 * | N — centre | 0,78 R du centre | 76 |
 * | N — hauteur de casse | 0,18 R | ≈ 18 |
 * | aiguille — pointe | 0,92 R | 90 |
 * | aiguille — barbes | 0,82 R, à ±40° de l'axe arrière | 80 |
 * | aiguille — creux arrière | 0,24 R | 23 |
 *
 * L'ancien rendu posait la couronne à 0,871 demi-largeur (mesuré) et le N à 0,54 R : le
 * cadran était trop petit et la lettre trop près du centre. Le document de la planche
 * annonce 0,82 R pour le N ; la mesure refaite ici donne **0,78 R au centre optique de
 * la lettre** (0,88 R à son sommet, 0,67 R à sa base) — c'est cette valeur qui est
 * codée, et le document est corrigé en conséquence.
 *
 * **Le N appartient à la couronne et tourne avec elle** : sous `rotation: "HEADING"`
 * (la valeur par défaut), les captures du rejeu montrent le N descendre en bas à gauche
 * pendant que l'aiguille garde son propre cap. Les deux ne bougent donc pas ensemble —
 * le cadran suit le cap, l'aiguille pointe ailleurs. Aucune donnée réelle n'étant
 * modélisée ici, les deux angles sont illustratifs, comme la trace fixe de `map.ts`.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW = 200
const CENTER = VIEW / 2
/** Rayon médian de la couronne — 0,977 demi-largeur mesuré, voir le commentaire de tête. */
const RING_R = 98

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

function buildDial(): SVGGElement {
  const dial = svgEl('g', { class: 'xc-compass__dial' })

  dial.append(svgEl('circle', { class: 'xc-compass__ring', cx: String(CENTER), cy: String(CENTER), r: String(RING_R), fill: 'none' }))

  for (const angle of TICK_ANGLES) {
    const cardinal = CARDINAL_ANGLES.has(angle)
    const outer = RING_R * TICK_OUTER
    const inner = RING_R * (cardinal ? TICK_INNER_CARDINAL : TICK_INNER)
    const rad = (angle - 90) * (Math.PI / 180)
    const x1 = CENTER + outer * Math.cos(rad)
    const y1 = CENTER + outer * Math.sin(rad)
    const x2 = CENTER + inner * Math.cos(rad)
    const y2 = CENTER + inner * Math.sin(rad)
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

/**
 * Aiguille de la boussole, à deux facettes séparées par son axe — géométrie relevée sur
 * `2026-08-21_planche-sol-8-*` (voir le tableau du commentaire de tête) : une pointe
 * longue, deux barbes à ±40° de l'axe arrière, un creux entre elles. Les deux facettes
 * ont exactement la même aire sur la capture (13 687 et 13 675 px), ce qui confirme le
 * partage par l'axe.
 *
 * `variant` porte la teinte : `'track'` (gris) quand `showBearing` vaut `true`,
 * `'nav'` (rouge) sinon — voir la règle 1 du commentaire de tête.
 */
function buildNeedle(variant: 'nav' | 'track', angle: number): SVGGElement {
  const needle = svgEl('g', {
    class: `xc-compass__needle xc-compass__needle--${variant}`,
    transform: `rotate(${angle} ${CENTER} ${CENTER})`
  })

  const tipR = RING_R * 0.92
  const barbR = RING_R * 0.82
  const notchR = RING_R * 0.24
  const barbAngle = (180 - 40) * (Math.PI / 180)
  const barbX = barbR * Math.sin(barbAngle)
  const barbY = -barbR * Math.cos(barbAngle)

  const tip = `${CENTER},${(CENTER - tipR).toFixed(1)}`
  const notch = `${CENTER},${(CENTER + notchR).toFixed(1)}`
  const right = `${(CENTER + barbX).toFixed(1)},${(CENTER + barbY).toFixed(1)}`
  const left = `${(CENTER - barbX).toFixed(1)},${(CENTER + barbY).toFixed(1)}`

  // La facette SOMBRE est celle qui porte la barbe droite (dans le repère local, pointe
  // en haut) : vérifié en échantillonnant les deux barbes de la capture — celle à 349°
  // vaut #c02020, celle à 70° vaut #e04040, l'axe étant à 213°.
  needle.append(svgEl('polygon', {
    class: 'xc-compass__needle-facet xc-compass__needle-facet--dark',
    points: `${tip} ${right} ${notch}`
  }))
  needle.append(svgEl('polygon', {
    class: 'xc-compass__needle-facet xc-compass__needle-facet--light',
    points: `${tip} ${left} ${notch}`
  }))

  return needle
}

/**
 * Indicateur de vent — élément séparé, superposé à l'aiguille (règle 2 du commentaire de
 * tête). Deux dessins mesurés :
 *
 * - `ARROW` : une branche bicolore jaune-olive, même géométrie que l'aiguille (les
 *   teintes de blend relevées sur `vol-landscape3-en-vol` — `#b15920`, `#d17940` — sont
 *   le mélange alpha des deux aplats là où ils se recouvrent, pas un dégradé : d'où
 *   `fill-opacity` et non `<linearGradient>`).
 * - `ARC` : une zone noire unie, plus large et plus courte, sans facettes — 11 971 px de
 *   `#000000` sur `vol-numeriques-boussole-variocolumn`.
 *
 * `SOCK` n'est porté par aucun fichier ni aucune capture : rendu comme `ARROW`.
 */
function buildWind(style: 'ARC' | 'ARROW', angle: number): SVGGElement {
  const wind = svgEl('g', {
    class: `xc-compass__wind xc-compass__wind--${style === 'ARC' ? 'arc' : 'arrow'}`,
    transform: `rotate(${angle} ${CENTER} ${CENTER})`
  })

  if (style === 'ARC') {
    const tip = `${CENTER},${CENTER - 14}`
    const baseLeft = `${CENTER - 46},${CENTER + 74}`
    const baseRight = `${CENTER + 46},${CENTER + 74}`
    wind.append(svgEl('polygon', { class: 'xc-compass__wind-shape', points: `${tip} ${baseRight} ${baseLeft}` }))
    return wind
  }

  const tip = `${CENTER},${CENTER - 80}`
  const east = `${CENTER + 24},${CENTER}`
  const west = `${CENTER - 24},${CENTER}`
  const tail = `${CENTER},${CENTER + 80}`
  wind.append(svgEl('polygon', { class: 'xc-compass__wind-facet xc-compass__wind-facet--dark', points: `${tip} ${east} ${tail}` }))
  wind.append(svgEl('polygon', { class: 'xc-compass__wind-facet xc-compass__wind-facet--light', points: `${tip} ${west} ${tail}` }))
  return wind
}

/**
 * Angles illustratifs : aucune donnée de cap, de trajectoire ou de vent réelle n'est
 * modélisée ici. `NEEDLE_ANGLE` reprend l'angle effectivement mesuré sur
 * `2026-08-21_planche-sol-8-*` (213°), pour que la comparaison côte à côte avec la
 * capture porte sur la forme et non sur l'orientation. Les deux autres démontrent que
 * cadran et vent tournent chacun pour leur compte.
 */
const NEEDLE_ANGLE = 213
const DIAL_HEADING_ANGLE = -35
const WIND_ANGLE = 145

function shown(widget: Widget, key: string, fallback: boolean): boolean {
  return readBoolean(widget.node, key) ?? fallback
}

/**
 * `windStyle` est une chaîne nue sur `WCompass` (voir rotation.ts pour le contraste avec
 * les trois cartes). Absent équivaut à `"NONE"`.
 */
function windStyleOf(widget: Widget): 'ARC' | 'ARROW' | undefined {
  const raw = readString(widget.node, 'windStyle')
  if (raw === undefined || raw === 'NONE') return undefined
  return raw === 'ARC' ? 'ARC' : 'ARROW'
}

export function drawCompass(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-compass'

  const svg = svgEl('svg', { class: 'xc-compass__scene', viewBox: `0 0 ${VIEW} ${VIEW}` })

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

  // L'aiguille est toujours dessinée — c'est la correction de l'écart 1.5.
  svg.append(buildNeedle(shown(widget, 'showBearing', false) ? 'track' : 'nav', NEEDLE_ANGLE))

  const wind = windStyleOf(widget)
  if (wind !== undefined) svg.append(buildWind(wind, WIND_ANGLE))

  element.append(svg)
  return element
}
