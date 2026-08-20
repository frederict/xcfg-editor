import type { Device } from '../catalog/devices'
import { DEVICES, physicalSize } from '../catalog/devices'

/**
 * XCTrack n'autorise pas des coordonnées de widget libres : en mode édition, un déplacement ou
 * un redimensionnement s'aimante sur une grille tracée à l'écran — voir
 * `docs/reference/edition-native-exploration.md`, §2.2. La grille n'est donc PAS une constante du
 * format : c'est une propriété de la **dalle**, que l'orientation d'affichage se contente de faire
 * pivoter. Toute la mesure est reprise dans `docs/reference/grille-aimantation.md`.
 */
export type Orientation = 'portrait' | 'landscape'

/** Un maillage : nombre de colonnes (axe X) et de lignes (axe Y). */
export interface Grid {
  cols: number
  rows: number
}

/**
 * Le maillage d'une **dalle**, indépendant de l'orientation d'affichage : le nombre de cellules le
 * long de son grand axe physique et le long de son petit axe.
 *
 * C'est la forme sous laquelle la grille se mesure et se stocke. `Grid` s'en déduit en désignant
 * lequel des deux axes est X — c'est tout ce que change une rotation de l'écran.
 */
export interface PanelGrid {
  longAxisCells: number
  shortAxisCells: number
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
 * Grilles de dalle effectivement mesurées, par identifiant d'appareil (`Device.id`).
 *
 * `air3-7.2` : **48 cellules le long de l'axe de 1280 px, 29 le long de l'axe de 720 px.**
 *
 * En paysage, c'est une mesure directe et redondante : lignes de grille chronométrées à l'écran,
 * déplacement contrôlé donnant `X1 = 2500 = 12/48` et `Y1 = 2759 = 8/29`, et 98 pages paysage d'un
 * corpus de 21 fichiers couvrant 8 versions de XCTrack (`versionCode` 90615 → 100030) et deux
 * installations distinctes, dont **aucune valeur** n'échappe aux multiples de 1/48 en X et de 1/29
 * en Y.
 *
 * En portrait, c'est une **déduction**, appuyée sur le seul échantillon portrait du corpus qui soit
 * assez varié pour discriminer un maillage (5 pages, 105 widgets, 22 valeurs X et 33 valeurs Y
 * distinctes) : ses cinq pages, prises une par une, tombent exactement sur **29 en X et 48 en Y**
 * — la transposée du paysage, cellule pour cellule. Voir `docs/reference/grille-aimantation.md`
 * pour les chiffres et pour ce qui reste à vérifier sur l'appareil.
 *
 * ⚠️ Les 60 autres pages portrait du corpus tombent sur **19 × 31**, incompatible avec 29 × 48
 * (les deux maillages n'ont que 0 et 10000 en commun). Ce ne sont pas 60 mesures mais **trois
 * pages recopiées 20 fois** : leur géométrie est strictement identique de février 2022 à
 * août 2026, à travers huit versions de XCTrack — et identique sur un second appareil, y compris
 * dans son volet paysage. Elles n'ont donc jamais été posées sur cet appareil ; ce sont des pages
 * d'origine, jamais rééditées, et 19 × 31 est le maillage de qui les a dessinées, pas celui de la
 * dalle. C'est la valeur que ce fichier portait à tort jusqu'ici.
 */
const MEASURED_PANEL_GRIDS: Partial<Record<string, PanelGrid>> = {
  'air3-7.2': { longAxisCells: 48, shortAxisCells: 29 }
}

/** Le grand et le petit côté physique de la dalle, en mm, sans considération d'orientation. */
function panelSizeMm(device: Device): { longMm: number; shortMm: number } {
  const { widthMm, heightMm } = physicalSize(device, 'landscape')
  return { longMm: widthMm, shortMm: heightMm }
}

/**
 * Une grille de dalle vue dans une orientation donnée : la rotation de l'écran ne fait qu'échanger
 * les deux axes. C'est l'unique endroit où l'orientation intervient — une seule mesure par
 * appareil suffit désormais pour les deux orientations.
 */
function orient(panel: PanelGrid, orientation: Orientation): Grid {
  return orientation === 'landscape'
    ? { cols: panel.longAxisCells, rows: panel.shortAxisCells }
    : { cols: panel.shortAxisCells, rows: panel.longAxisCells }
}

const REFERENCE_DEVICE_ID = 'air3-7.2'

/**
 * Densité de cellules (cellules par mm), calibrée sur l'unique dalle mesurée : AIR³ 7.2,
 * 48 × 29 cellules sur 154,97 × 87,17 mm.
 *
 * **Une densité par axe, et non une taille de cellule unique.** Une grille à cellules
 * physiquement carrées est écartée par la mesure : elle donnerait 48 × 27, pas 48 × 29. Les
 * cellules mesurées font 3,23 mm le long du grand axe contre 3,01 mm le long du petit — 7 %
 * d'écart, et les plages d'arrondi ne se recouvrent pas ([3,195 ; 3,263[ mm contre
 * [2,955 ; 3,058[ mm). Aucune taille de cellule unique ne fait donc tomber l'arrondi sur 48 **et**
 * sur 29 ; il faut deux densités.
 *
 * Ce que ce modèle apporte : il est **exact sur son point de calibration**, dans les deux
 * orientations (48 × 29 et 29 × 48), là où la version précédente — moyenne géométrique des deux
 * axes — se trompait sur l'appareil même qui lui servait de référence.
 *
 * Ce qu'il ne prouve pas : qu'une densité en mm soit la bonne loi. Un seul appareil est mesuré ;
 * une loi en pixels, ou des constantes 48/29 codées en dur dans XCTrack, expliqueraient tout aussi
 * bien cette unique observation et divergeraient sur un autre écran. La densité en mm est retenue
 * parce qu'une cellule d'aimantation sert un doigt et devrait donc garder une taille physique à
 * peu près constante — c'est une motivation, pas une vérification.
 */
const REFERENCE_CELL_DENSITY = ((): { perMmLongAxis: number; perMmShortAxis: number } => {
  const device = DEVICES.find((d) => d.id === REFERENCE_DEVICE_ID)
  const measured = MEASURED_PANEL_GRIDS[REFERENCE_DEVICE_ID]
  if (!device || !measured) {
    // Repli inatteignable tant que l'AIR³ 7.2 reste au catalogue : densités de l'AIR³ 7.2.
    return { perMmLongAxis: 48 / 154.97, perMmShortAxis: 29 / 87.17 }
  }
  const { longMm, shortMm } = panelSizeMm(device)
  return {
    perMmLongAxis: measured.longAxisCells / longMm,
    perMmShortAxis: measured.shortAxisCells / shortMm
  }
})()

/**
 * Le maillage extrapolé d'une dalle sans mesure : la densité de cellules de l'appareil de
 * référence, appliquée axe par axe à ses dimensions physiques.
 *
 * **Extrapolation explicitement non vérifiée** — un seul appareil mesuré, un seul point de
 * calibration (voir `REFERENCE_CELL_DENSITY`). Elle redonne exactement la mesure sur l'AIR³ 7.2 ;
 * sur tout autre écran, elle donne un ordre de grandeur plausible et rien de plus.
 */
export function approximatePanelGrid(device: Device): PanelGrid {
  const { longMm, shortMm } = panelSizeMm(device)
  return {
    longAxisCells: Math.max(1, Math.round(longMm * REFERENCE_CELL_DENSITY.perMmLongAxis)),
    shortAxisCells: Math.max(1, Math.round(shortMm * REFERENCE_CELL_DENSITY.perMmShortAxis))
  }
}

/** `approximatePanelGrid`, vue dans une orientation. Mêmes réserves. */
export function approximateGrid(device: Device, orientation: Orientation): Grid {
  return orient(approximatePanelGrid(device), orientation)
}

/** La grille de dalle à retenir : la mesure si elle existe, sinon l'extrapolation. */
export function panelGridFor(device: Device): PanelGrid {
  return MEASURED_PANEL_GRIDS[device.id] ?? approximatePanelGrid(device)
}

/**
 * Le maillage à utiliser pour aimanter un widget sur cet appareil et dans cette orientation.
 * L'orientation n'ajoute aucune mesure : elle échange les axes de la grille de la dalle.
 */
export function gridFor(device: Device, orientation: Orientation): Grid {
  return orient(panelGridFor(device), orientation)
}

function clamp(value: number): number {
  return Math.min(NORMALIZED_MAX, Math.max(0, value))
}

/**
 * Aimante une coordonnée normalisée (0 à 10000) sur le multiple de cellule le plus proche, pour
 * un axe divisé en `cellCount` cellules. Une valeur déjà sur la grille reste inchangée
 * (idempotent) — c'est l'assertion principale vérifiée par les relevés dans `grid.test.ts`.
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
