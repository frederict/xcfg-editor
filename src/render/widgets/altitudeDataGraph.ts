import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WAltitudeDataGraph` — écart 2.4 de la revue des 75 visuels : « ne dessine rien ». Le
 * type retombait sur le repli générique (`generic.ts`) et n'affichait qu'un « -- ».
 *
 * ## Ce que l'appareil dessine, et dans quel état
 *
 * `captures-air3/2026-08-21_planche-sol-8-boussole-barres-graphiques-espace-aerien.png`,
 * cellule de **427 × 323 px**, gadget au repos — *l'état dans lequel un pilote compose sa
 * page* :
 *
 * | | relevé (coordonnées relatives à la cellule) |
 * |---|---|
 * | axe des zéros | trait noir de **3 px**, y 148 à 150, sur toute la largeur |
 * | `600 m` | x 370–422, y 2–21, aligné à droite, 5 px du bord |
 * | `+1,0` | x 388–423, y 22–38, sous le précédent |
 * | `+0,0` | à gauche, juste sous l'axe |
 * | `-400 m` | x 363–422, y 305–319, en bas à droite |
 * | casse | 15 px, soit une police d'environ 21 px — 0,065 fois la hauteur |
 *
 * **En vol** (`planche-vol-8`), le même gadget porte en plus des **barres horizontales
 * bleues** partant du bord gauche, étiquetées par le gain moyen de chaque tranche
 * (`+2,0`, `+1,9`, `+1,6`), et ses repères deviennent `1500 m`, `+3,0`, `100 m` : l'échelle
 * comme les barres sont **recalculées sur le vol en cours**.
 *
 * Ce moteur ne simule aucun vol, et mélanger les deux états — les barres du vol sur
 * l'échelle du sol — donnerait une image que l'appareil ne montre jamais. On dessine donc
 * l'état au repos, complet et fidèle, comme pour les valeurs d'exemple des gadgets
 * numériques (`SPECS`, numeric.ts), qui sont elles aussi relevées au sol.
 *
 * Les clés `type` (`GRAPH_THERMAL`), `text_size`, `line_thickness`, `color_thermal` et
 * `color_wind` du relevé ne sont pas lues : elles ne prennent effet que sur les barres,
 * qui ne sont pas dessinées. Les lire pour n'en rien faire tromperait le lecteur.
 */

/** Repères de l'axe, relevés au repos — des étiquettes d'échelle, pas des données. */
const TOP_ALTITUDE = '600 m'
const TOP_CLIMB = '+1,0'
const ZERO_CLIMB = '+0,0'
const BOTTOM_ALTITUDE = '-400 m'

/** Hauteur de l'axe des zéros dans la cellule : 148 px sur 323. */
const ZERO_AXIS_RATIO = 0.458

function span(className: string, text: string): HTMLElement {
  const node = document.createElement('span')
  node.className = className
  node.textContent = text
  return node
}

export function drawAltitudeDataGraph(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-altgraph'
  element.style.setProperty('--xc-altgraph-zero', String(ZERO_AXIS_RATIO))

  const axis = document.createElement('div')
  axis.className = 'xc-altgraph__axis'

  const corner = document.createElement('div')
  corner.className = 'xc-altgraph__top'
  corner.append(span('xc-altgraph__label', TOP_ALTITUDE), span('xc-altgraph__label', TOP_CLIMB))

  element.append(
    corner,
    axis,
    span('xc-altgraph__zero xc-altgraph__label', ZERO_CLIMB),
    span('xc-altgraph__bottom xc-altgraph__label', BOTTOM_ALTITUDE)
  )
  return element
}
