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
 * ## Ce qui n'est PAS établi, et donc pas modélisé
 *
 * - **La règle de couleur.** Vert à 52 et à 35, rose à 140. Un seuil autour du quart de
 *   tour expliquerait les trois relevés, mais trois points ne font pas une loi, et le
 *   fichier de pages ne porte rien qui permette de trancher. On reprend l'état AU SOL
 *   (rose, 140°), celui d'où viennent les autres valeurs d'exemple de ce moteur, et on
 *   écrit la réserve.
 * - **L'angle** de la flèche : 140° est la valeur affichée, pas une donnée de navigation
 *   calculée ici. Comme partout dans ce moteur, rien n'est simulé.
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
  // `xc-num__row--negative` : la même teinte cernée que les valeurs négatives du vario —
  // c'est bien la même encre sur la capture, pas une couleur propre à ce widget.
  row.className = 'xc-compdig__row xc-num__row--negative'

  const arrow = document.createElementNS(SVG_NS, 'svg')
  arrow.setAttribute('class', 'xc-compdig__arrow')
  arrow.setAttribute('viewBox', '0 0 24 24')
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
