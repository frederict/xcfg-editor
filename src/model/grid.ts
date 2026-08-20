import type { Device } from '../catalog/devices'
import { physicalSize } from '../catalog/devices'

/**
 * XCTrack n'autorise pas des coordonnées de widget libres : en mode édition, un déplacement ou
 * un redimensionnement s'aimante sur une grille invisible à l'écran mais bien réelle — voir
 * `docs/reference/edition-native-exploration.md`, §2.2. La grille dépend de la résolution : elle
 * n'est donc PAS une constante du format, mais une propriété de l'appareil et de l'orientation.
 */
export type Orientation = 'portrait' | 'landscape'

/** Un maillage : nombre de colonnes (axe X) et de lignes (axe Y). */
export interface Grid {
  cols: number
  rows: number
}

/** Une géométrie de widget, dans les mêmes unités que `Widget.x1`/`y1`/`x2`/`y2` (0 à 10000). */
export interface Rect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export const NORMALIZED_MAX = 10000

/**
 * Grilles effectivement mesurées, par identifiant d'appareil (`Device.id`) et orientation.
 *
 * - `air3-7.2` / `landscape` : **mesure solide**, appuyée sur trois preuves concordantes (lignes
 *   de grille chronométrées à l'écran, un déplacement contrôlé donnant X1=2500=12/48 et
 *   Y1=2759=8/29, et les 24+21 valeurs distinctes du corpus utilisateur, toutes multiples de
 *   1/48 et 1/29 — voir la relevé refait dans `tests/model/grid.test.ts`).
 * - `air3-7.2` / `portrait` : **inférence plus faible**. Le corpus portrait ne compte que 10
 *   valeurs X et 11 valeurs Y distinctes. Le document de référence (§6, « Une migration de
 *   schéma se produit à l'import ») constate que les trois pages portrait du corpus ont été
 *   **réécrites par XCTrack 1.0.3-beta à la lecture**, depuis un schéma antérieur — alors que les
 *   cinq pages paysage sont revenues strictement identiques, octet pour octet. Ces pages
 *   portrait viennent donc d'une version plus ancienne de XCTrack, dont la grille d'aimantation
 *   pouvait très bien différer : c'est la raison la plus probable pour laquelle 19 × 31 ne
 *   s'accorde pas avec le 48 × 29 mesuré en paysage sur le même appareil (une cellule physique
 *   constante donnerait ≈4,6 × 5,0 mm en portrait contre ≈3,2 × 3,0 mm en paysage — un facteur
 *   1,5, pas un écart d'arrondi). 19 × 31 reste la meilleure lecture disponible de ce corpus,
 *   mais ce n'est pas une mesure directe au même titre que le paysage, ni forcément la grille du
 *   XCTrack actuel.
 *
 * Aucune règle générale dérivée de `Device.widthPx`/`heightPx`/`diagonalInches` ne redonne ces
 * deux couples exactement (voir `approximateGrid` ci-dessous, et le rapport de tâche) : ils sont
 * donc conservés ici comme cas particuliers mesurés, pas comme un exemple de calcul.
 */
const MEASURED_GRIDS: Partial<Record<string, Partial<Record<Orientation, Grid>>>> = {
  'air3-7.2': {
    landscape: { cols: 48, rows: 29 },
    portrait: { cols: 19, rows: 31 }
  }
}

/**
 * Taille de cellule physique de référence (mm), calibrée sur l'unique mesure solide dont on
 * dispose : AIR³ 7.2 en paysage, 48 × 29 cellules sur une dalle de 154,97 × 87,17 mm. Retenue via
 * la moyenne géométrique des deux axes (3,228 mm × 3,006 mm) pour ne favoriser ni la largeur ni
 * la hauteur.
 *
 * ⚠️ **Cette hypothèse est vérifiée fausse en toute rigueur, et documentée comme telle.** Une
 * grille à cellules physiquement carrées et à ratio exactement proportionnel à l'écran (16:9 pour
 * l'AIR³ 7.2) donnerait 48 × 27, pas 48 × 29 : l'écart mesuré entre largeur et hauteur de cellule
 * est d'environ 7 % (26,7 px contre 24,8 px), et aucune taille de cellule unique, appliquée
 * indépendamment en X et en Y, ne fait tomber l'arrondi sur 48 **et** 29 à la fois (les deux
 * plages de tolérance ne se recouvrent pas : [3,195 ; 3,263[ mm en X contre [2,955 ; 3,058[ mm en
 * Y). Le paysage et le portrait du même appareil ne sont d'ailleurs pas cohérents entre eux non
 * plus avec une cellule physique constante : 19 × 31 correspondrait à des cellules d'environ
 * 4,59 × 4,99 mm, très différentes des 3,23 × 3,01 mm du paysage.
 *
 * Faute de mieux, `approximateGrid` reste la meilleure approximation disponible pour un appareil
 * sans mesure connue : elle produit un maillage à peu près carré et de densité raisonnable, mais
 * elle ne reproduit PAS exactement 48 × 29 ni 19 × 31, y compris pour l'AIR³ 7.2 lui-même (raison
 * pour laquelle `gridFor` consulte `MEASURED_GRIDS` en priorité). Voir le rapport de tâche pour le
 * détail des pistes explorées et écartées (multiples exacts du ratio d'écran, cellule en dp,
 * recherche du maillage « le plus carré » sous contrainte de densité).
 */
const REFERENCE_CELL_MM = Math.sqrt(3.228461052098851 * 3.005808565747206)

/**
 * Meilleure approximation disponible pour un appareil sans grille mesurée : un maillage à
 * cellules à peu près carrées, de taille physique constante calibrée sur l'AIR³ 7.2 (voir
 * `REFERENCE_CELL_MM`). **À prendre comme une extrapolation non vérifiée** — un seul appareil de
 * référence, un seul point de calibration.
 */
export function approximateGrid(device: Device, orientation: Orientation): Grid {
  const { widthMm, heightMm } = physicalSize(device, orientation)
  return {
    cols: Math.max(1, Math.round(widthMm / REFERENCE_CELL_MM)),
    rows: Math.max(1, Math.round(heightMm / REFERENCE_CELL_MM))
  }
}

/**
 * Le maillage à utiliser pour aimanter un widget sur cet appareil et cette orientation : la
 * mesure connue si elle existe (`MEASURED_GRIDS`), sinon l'approximation générale
 * (`approximateGrid`), marquée comme telle dans sa documentation.
 */
export function gridFor(device: Device, orientation: Orientation): Grid {
  return MEASURED_GRIDS[device.id]?.[orientation] ?? approximateGrid(device, orientation)
}

function clamp(value: number): number {
  return Math.min(NORMALIZED_MAX, Math.max(0, value))
}

/**
 * Aimante une coordonnée normalisée (0 à 10000) sur le multiple de cellule le plus proche, pour
 * un axe divisé en `cellCount` cellules. Une valeur déjà sur la grille reste inchangée
 * (idempotent) — c'est l'assertion principale vérifiée par le corpus dans `grid.test.ts`.
 */
export function snapValue(value: number, cellCount: number): number {
  if (cellCount <= 0) return clamp(value)
  const cellSize = NORMALIZED_MAX / cellCount
  const cellIndex = Math.round(value / cellSize)
  return clamp(Math.round(cellIndex * cellSize))
}

/**
 * Aimante les quatre coordonnées d'un widget sur la grille, en préservant l'invariant
 * `x2 > x1` et `y2 > y1` : un widget aimanté ne devient jamais vide ni inversé. Si l'aimantation
 * indépendante des deux bords d'un axe les fait coïncider ou les inverse, ce bord est repoussé
 * d'une cellule pleine — vers la droite/le bas s'il reste de la place, sinon vers la
 * gauche/le haut. Une largeur ou une hauteur minimale d'une cellule est donc le pire cas.
 */
export function snapRect(rect: Rect, grid: Grid): Rect {
  const cellX = NORMALIZED_MAX / grid.cols
  const cellY = NORMALIZED_MAX / grid.rows

  let x1 = snapValue(rect.x1, grid.cols)
  let x2 = snapValue(rect.x2, grid.cols)
  if (x2 <= x1) {
    if (x1 + cellX <= NORMALIZED_MAX) {
      x2 = clamp(Math.round(x1 + cellX))
    } else {
      x1 = clamp(Math.round(x2 - cellX))
    }
  }

  let y1 = snapValue(rect.y1, grid.rows)
  let y2 = snapValue(rect.y2, grid.rows)
  if (y2 <= y1) {
    if (y1 + cellY <= NORMALIZED_MAX) {
      y2 = clamp(Math.round(y1 + cellY))
    } else {
      y1 = clamp(Math.round(y2 - cellY))
    }
  }

  return { x1, y1, x2, y2 }
}
