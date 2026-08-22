import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { formatDecimal } from '../locale'
import { titleWidthEm } from '../textMetrics'
import { widgetTitle } from '../title'

/**
 * `WLocation` — « Localisation ». La position GPS, sur **deux lignes**, en gros noir,
 * calées à DROITE.
 *
 * ## La réserve n° 1 est levée — et sans exposer de domicile
 *
 * Ce type retombait sur le dessin générique (« titre + `--` ») faute de savoir ce que
 * l'appareil y écrit : la seule capture disponible était **caviardée**, parce qu'un
 * `WLocation` affiche les coordonnées réelles du pilote et qu'une capture prise chez lui
 * le trahit au bâtiment près (`2026-08-21-reserves-de-rendu.md`, réserve n° 1).
 *
 * Le rejeu du 2026-08-22 l'a résolue en passant : la position affichée y est un point de
 * croisière au-dessus de la Sierra de Gredos, à 1 300 km de chez le propriétaire. Mesuré
 * sur `captures-air3/2026-08-22_rejeu-localisation.png`, cellule de 596 × 443 px :
 *
 * ```
 * 40,2593 N
 * 4,9070 W
 * ```
 *
 * | | relevé |
 * |---|---|
 * | forme | **degrés décimaux, quatre décimales**, séparateur décimal de la langue |
 * | hémisphère | une lettre APRÈS un espace — `N`/`S` puis `E`/`W` |
 * | ce qu'il n'y a PAS | aucun signe degré, aucune unité, **aucun zéro de tête** (`4,9070`, pas `004,9070`) |
 * | alignement | les deux lignes finissent au bord DROIT de la cellule (611 et 621 px sur 623) |
 * | titre | rouge, centré, comme tout titre de gadget (221 → 432 px, centre de la cellule à 325) |
 * | casse des chiffres | 104 px sur les deux lignes |
 * | interligne | 140 px de base à base |
 *
 * ## La valeur d'exemple est FICTIVE, et doit le rester
 *
 * `12,3456 N` / `12,3456 E` : une suite de chiffres qui se lit comme un gabarit, pas comme
 * une position. Toute coordonnée vraisemblable désignerait un lieu réel, et ce dessin est
 * celui que l'éditeur montre à tout le monde — captures du `README` comprises. Elle porte
 * exactement la forme mesurée, qui est ce que le pilote doit pouvoir juger : la place que
 * ces deux lignes prendront dans sa page.
 *
 * ## Pourquoi une scène SVG plutôt que la mécanique de `.xc-num`
 *
 * Les widgets numériques tiennent leur taille de `--xc-value-size` (style.css), calculée
 * pour **une** ligne. Deux lignes demanderaient d'y réintroduire un facteur, c'est-à-dire
 * une seconde formule à tenir d'accord avec la première. La scène SVG porte directement
 * les proportions mesurées et les met à l'échelle de la cellule, comme le font déjà
 * `compass.ts`, `sideView.ts` et `verticalGraph.ts`.
 *
 * `preserveAspectRatio="xMaxYMid meet"` : la scène garde ses proportions (des chiffres
 * étirés ne seraient plus ceux de l'appareil) et se cale sur le bord DROIT, celui auquel
 * les deux lignes s'alignent. Sur une cellule d'un autre rapport que celle mesurée, elles
 * restent donc à droite au lieu de flotter au milieu. Ce que l'appareil fait, LUI, d'une
 * cellule plus large ou plus plate n'est pas mesuré — une seule forme a été capturée.
 *
 * ## Ce qui n'est PAS établi
 *
 * - **Les autres formats de coordonnées** (degrés-minutes, degrés-minutes-secondes, UTM…)
 *   existent dans les préférences de XCTrack, mais aucune capture ne montre `WLocation`
 *   sous un autre réglage que celui-ci, et le fichier de pages ne porte rien qui en
 *   décide.
 * - **La lettre d'hémisphère** est `N`/`S`/`E`/`W` sur un appareil en français : XCTrack
 *   n'y a pas traduit le `W` en `O`. Une seule langue a été observée.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Le repère de la scène, en pixels de la capture : la cellule mesure 596 × 443, dont les
 * 42 premiers pixels de hauteur reviennent au titre, qui est un élément HTML au-dessus.
 */
const VIEW_W = 596
const VIEW_H = 401

/** Fin de ligne : le texte s'arrête à 4 px du bord droit (611 et 621 px mesurés sur 623). */
const RIGHT_MARGIN = 4

/** Police et bases des deux lignes, dans le repère ci-dessus : 104 px de casse pour une
 * police de 144, bases à 185 et 325 — soit les 140 px d'interligne mesurés. */
const FONT_SIZE = 144
const BASELINES = [185, 325]

/** Exemple manifestement fictif, à la forme mesurée — voir le commentaire de tête. */
const EXAMPLE_LINES = ['12.3456 N', '12.3456 E']

export function drawLocation(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  // `.xc-num` pour la seule mise en page qu'il partage avec les widgets numériques : le
  // titre collé en haut, le reste de la cellule dessous.
  element.className = 'xc-num xc-loc'

  const title = document.createElement('span')
  title.className = 'xc-num__title'
  title.style.color = settings.titleColor
  const text = widgetTitle(widget, language)
  title.style.setProperty('--xc-title-em', String(titleWidthEm(text)))
  title.textContent = text
  element.append(title)

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'xc-loc__scene')
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`)
  svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet')
  // La scène prend toute la place laissée par le titre, sur toute la largeur : sans quoi
  // un `<svg>` retombe sur sa taille intrinsèque et le bord droit n'est plus celui de la
  // cellule.
  svg.style.flexGrow = '1'
  svg.style.alignSelf = 'stretch'
  svg.style.minHeight = '0'

  EXAMPLE_LINES.forEach((line, index) => {
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('class', 'xc-loc__line')
    text.setAttribute('x', String(VIEW_W - RIGHT_MARGIN))
    text.setAttribute('y', String(BASELINES[index]))
    text.setAttribute('text-anchor', 'end')
    text.setAttribute('font-size', String(FONT_SIZE))
    // La graisse des valeurs (`.xc-num__value`, style.css) : les chiffres de l'appareil
    // sont les mêmes que sur les autres gadgets, seule leur taille change.
    text.setAttribute('font-weight', '600')
    // L'encre de la page (`--xc-ink` via `color` sur `.xc-page`) plutôt qu'un noir écrit
    // ici : le rendu d'une page a une seule encre, et elle est déjà posée plus haut.
    text.setAttribute('fill', 'currentColor')
    text.textContent = formatDecimal(line, language)
    svg.append(text)
  })

  element.append(svg)
  return element
}
