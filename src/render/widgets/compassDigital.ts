import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { titleWidthEm } from '../textMetrics'
import { widgetTitle } from '../title'

/**
 * `WCompassDigital` — « Boussole Point optimisé ». Écart 2.9 de la revue des 75 visuels :
 * l'appareil dessine une **flèche directionnelle**, la valeur sur une **pastille de
 * couleur** et un petit **`°` détaché** à droite ; nous le rendions générique.
 *
 * ## Ce qui est mesuré
 *
 * `captures-air3/2026-08-21_planche-sol-3-air-b-xcontest-navigation-a.png`, cellule de
 * 301 × 199 px : une flèche épaisse pointant en bas à gauche, « 140 » en gros chiffres,
 * flèche et chiffres **de la même teinte rose cernée de noir** que les valeurs négatives
 * du vario, et un anneau gris à ~16 px du bord droit, à mi-hauteur de la valeur.
 *
 * Les deux autres états capturés donnent la même mise en page avec une autre teinte et un
 * autre angle : `planche-vol-3` « ↗ 52 » en vert, `planche-competition-3` « ↗ 35 » en
 * vert.
 *
 * ## La règle de couleur — tranchée le 2026-08-22 : c'est le CÔTÉ, jamais la valeur
 *
 * Ce commentaire supposait « un seuil autour du quart de tour » et le disait non établi.
 * Le rejeu de `2026-07-09-XCT-FTE-01.igc` a produit **onze observations**, dont trois
 * paires quasi appariées en valeur et **opposées en couleur** :
 *
 * | valeur | flèche | teinte |
 * |---|---|---|
 * | 3 | avant-**gauche** | **rose** `#ffa0a0` |
 * | 9, 17, 35, 37, 38 | avant-**droite** | **vert** `#a0ffa0` |
 * | **49** | avant-gauche | rose |
 * | **52** | avant-droite | vert |
 * | **55** | avant-gauche | rose |
 * | **140** | arrière-gauche | rose |
 * | **146** | arrière-droite | vert |
 *
 * 49 rose contre 52 vert, 55 rose contre 52 vert, 140 rose contre 146 vert : **aucun
 * seuil sur le nombre affiché ne produit ça.**
 *
 * > **La flèche pointe à droite → pastille verte. À gauche → pastille rose.**
 *
 * C'est la **pastille signée ordinaire** de XCTrack — `#a0ffa0` positif, `#ffa0a0`
 * négatif, la même encre que le vario — appliquée à un gisement signé, positif à droite,
 * négatif à gauche, dont le gadget n'imprime que la **valeur absolue**. La couleur est le
 * signe que le nombre a perdu. C'est pourquoi la teinte se déduit ici de l'angle de la
 * flèche (`sideOf`) et non de la valeur : elles ne peuvent pas se contredire.
 *
 * ## Ce qui n'est PAS établi, et donc pas modélisé
 *
 * - **L'angle** de la flèche : 140° est la valeur affichée, pas une donnée de navigation
 *   calculée ici. Comme partout dans ce moteur, rien n'est simulé.
 * - **La géométrie fine de la flèche.** Elle est quantifiée en quadrants — avant-gauche,
 *   avant-droite, arrière-gauche, arrière-droite — et bascule vers l'arrière au-delà de
 *   90° (52 devant, 140 derrière) sans distinguer 9 de 52 : elle est dessinée à ~45° pour
 *   toutes les valeurs avant. L'angle exact DANS le quadrant reste ouvert.
 * - **Le titre** : l'appareil écrit « Boussole Point optimisé », nous écrivons le nom du
 *   catalogue. Le libellé dépend du réglage `target` et vit dans le catalogue d'options,
 *   chargé par `import()` — un dessin est synchrone et ne peut pas l'attendre. Voir le
 *   commentaire de tête de `title.ts`, qui porte déjà cette réserve.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Valeur d'exemple et angle, relevés ensemble sur `planche-sol-3`. */
const EXAMPLE_DEGREES = '140'

/**
 * Direction de la flèche, en degrés depuis le haut, sens horaire — l'angle que montre la
 * capture, et rien de plus : il ne se calcule pas.
 */
const EXAMPLE_ARROW_ANGLE = 235

/**
 * Côté vers lequel pointe la flèche, d'où la teinte de la pastille : 0–180° est la moitié
 * DROITE du cadran, 180–360° la gauche. Les deux axes (0° et 180°) ne sont pas observés —
 * un gisement nul n'a pas de signe, et aucune des onze captures ne le montre.
 */
function sideOf(angle: number): 'right' | 'left' {
  return ((angle % 360) + 360) % 360 < 180 ? 'right' : 'left'
}

export function drawCompassDigital(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-compdig'

  const title = document.createElement('span')
  title.className = 'xc-num__title'
  title.style.color = settings.titleColor
  const text = widgetTitle(widget, language)
  title.style.setProperty('--xc-title-em', String(titleWidthEm(text)))
  title.textContent = text
  element.append(title)

  const row = document.createElement('div')
  // La même encre que les valeurs signées du vario, pas une couleur propre à ce widget :
  // la flèche à droite prend le vert des positifs, à gauche le rose des négatifs. La
  // flèche d'exemple pointe en bas à gauche, donc rose — comme la capture au sol.
  const sign = sideOf(EXAMPLE_ARROW_ANGLE) === 'right' ? 'positive' : 'negative'
  row.className = `xc-compdig__row xc-num__row--${sign}`

  const arrow = document.createElementNS(SVG_NS, 'svg')
  arrow.setAttribute('class', 'xc-compdig__arrow')
  arrow.setAttribute('viewBox', '0 0 24 24')
  // La flèche prend la MÊME encre que la valeur : sur les onze captures, les deux sont
  // toujours de la même teinte. `.xc-compdig__arrow` (style.css) la fixe au rose des
  // négatifs, ce qui ne vaut que pour une flèche à gauche — cette ligne la fait suivre le
  // côté, comme la pastille de la valeur.
  arrow.style.fill = `var(--xc-value-${sign})`
  // Une seule silhouette pleine — hampe et pointe d'un seul tenant : sur la capture, la
  // flèche est un aplat rose cerné de noir, pas un trait surmonté d'un chevron.
  const shape = document.createElementNS(SVG_NS, 'polygon')
  shape.setAttribute('points', '12,2.5 21,12 15.5,12 15.5,21.5 8.5,21.5 8.5,12 3,12')
  shape.setAttribute('transform', `rotate(${EXAMPLE_ARROW_ANGLE} 12 12)`)
  arrow.append(shape)

  const value = document.createElement('span')
  value.className = 'xc-compdig__value xc-num__value'
  value.textContent = EXAMPLE_DEGREES

  // Le degré est détaché à droite, gris : il occupe la place d'une unité et se dessine
  // comme telle. `language` ne l'atteint pas — « ° » s'écrit pareil partout.
  const degree = document.createElement('span')
  degree.className = 'xc-compdig__degree'
  degree.textContent = '°'

  // La flèche et la valeur forment un couple qui se centre dans la place laissée par le
  // degré — voir `.xc-compdig__pair` (style.css) pour les quatre marges qui l'imposent.
  const pair = document.createElement('div')
  pair.className = 'xc-compdig__pair'
  pair.append(arrow, value)

  row.append(pair, degree)
  element.append(row)
  return element
}
