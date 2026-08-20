import { describe, expect, it } from 'vitest'
import { DEVICES } from '../../src/catalog/devices'
import {
  approximateGrid,
  approximatePanelGrid,
  gridFor,
  NORMALIZED_MAX,
  panelGridFor,
  snapRect,
  snapValue,
  type Grid,
  type Rect
} from '../../src/model/grid'

const AIR3_7_2 = DEVICES.find((d) => d.id === 'air3-7.2')!

/* ------------------------------------------------------------------ le relevé, en dur */

/**
 * Les relevés ci-dessous sont **recopiés en dur**, et non relus depuis un corpus.
 *
 * Le corpus d'origine (`adb pull /sdcard/XCTrack/Config/` sur l'AIR³ 7.2, 16 configurations de
 * 2022 à 2025, plus les exports de 2026) contient des données personnelles — nom du pilote, voile,
 * fichiers de waypoints — et n'a donc aucune raison d'entrer dans le dépôt. Il vivait dans un
 * répertoire temporaire, effacé depuis. Ce qui compte pour la grille ne porte, lui, aucune donnée
 * personnelle : ce sont des entiers de 0 à 10000. Voir `docs/reference/grille-aimantation.md` pour
 * la provenance, la méthode et le protocole permettant de refaire la mesure.
 */

/** Toutes les valeurs X1/X2 distinctes des 98 pages **paysage** du corpus (21 fichiers). */
const LANDSCAPE_X = [
  0, 208, 625, 833, 1042, 1250, 1458, 1667, 1875, 2083, 2292, 2500, 2708, 2917, 3125, 3333,
  3542, 3750, 3958, 4167, 4375, 4583, 4792, 5000, 5208, 5417, 5625, 5833, 6042, 6250, 6667,
  6875, 7083, 7292, 7708, 7917, 8125, 8333, 8542, 8750, 8958, 10000
]

/** Toutes les valeurs Y1/Y2 distinctes des mêmes 98 pages paysage. */
const LANDSCAPE_Y = [
  0, 345, 690, 1034, 1379, 1724, 2069, 2414, 2759, 3103, 3448, 3793, 4138, 4483, 4828, 5172,
  5517, 5862, 6207, 6552, 6897, 7241, 7586, 7931, 8276, 8621, 8966, 9310, 9655, 10000
]

/**
 * Le seul échantillon **portrait** du corpus assez varié pour discriminer un maillage : les
 * 5 pages portrait de `2022-02-08.xcfg`, 105 widgets, 22 valeurs X et 33 valeurs Y distinctes.
 * Ces pages partagent 78 UUID de widgets avec les pages paysage du même fichier : ce sont les
 * mêmes widgets, replacés pour l'autre orientation, et non une mise en page étrangère.
 */
const PORTRAIT_X = [
  0, 345, 1034, 1379, 2069, 2414, 2759, 3103, 3448, 3793, 4138, 4483, 4828, 5172, 6207, 6552,
  6897, 7586, 7931, 8276, 8621, 10000
]

const PORTRAIT_Y = [
  0, 417, 625, 1042, 1250, 1458, 1875, 2083, 2292, 2500, 2708, 2917, 3125, 3542, 3750, 3958,
  4167, 4375, 4583, 5208, 5417, 5625, 6250, 6667, 7083, 7917, 8125, 8542, 8750, 8958, 9167,
  9792, 10000
]

/**
 * Les trois pages portrait « d'origine » : 30 widgets, 10 valeurs X et 11 valeurs Y distinctes.
 * Géométrie strictement identique dans 20 des 21 fichiers du corpus, de février 2022 à août 2026,
 * à travers huit versions de XCTrack — et identique sur une seconde installation. Jamais
 * rééditées, donc jamais aimantées par cet appareil. C'est d'elles que venait le 19 × 31 corrigé
 * par cette mesure.
 */
const LEGACY_PORTRAIT_X = [0, 526, 2632, 3158, 3684, 5263, 6316, 6842, 7895, 10000]
const LEGACY_PORTRAIT_Y = [0, 323, 1290, 1935, 2258, 2581, 3226, 3548, 7742, 9032, 10000]

/** Quelques rectangles complets relevés dans ces mêmes 5 pages portrait. */
const PORTRAIT_RECTS: Rect[] = [
  { x1: 0, y1: 0, x2: 3103, y2: 2500 },
  { x1: 0, y1: 2083, x2: 10000, y2: 10000 },
  { x1: 1379, y1: 2292, x2: 4828, y2: 4375 },
  { x1: 3103, y1: 1458, x2: 6897, y2: 2500 },
  { x1: 6207, y1: 1042, x2: 8276, y2: 1875 },
  { x1: 7931, y1: 2708, x2: 10000, y2: 3542 },
  { x1: 8621, y1: 3125, x2: 10000, y2: 4167 }
]

/**
 * `n` explique `values` si chaque valeur est exactement `round(k × 10000 / n)` pour un entier `k`
 * — c'est-à-dire si elle survit intacte à un aller-retour par l'indice de cellule.
 */
function explains(values: readonly number[], n: number): boolean {
  return values.every((v) => Math.round((Math.round((v * n) / NORMALIZED_MAX) * NORMALIZED_MAX) / n) === v)
}

/** Tous les maillages de 2 à 200 cellules qui expliquent ces valeurs. */
function candidates(values: readonly number[]): number[] {
  const found: number[] = []
  for (let n = 2; n <= 200; n++) if (explains(values, n)) found.push(n)
  return found
}

/** Les coordonnées valides d'un axe divisé en `n` cellules. */
function gridValues(n: number): Set<number> {
  const values = new Set<number>()
  for (let k = 0; k <= n; k++) values.add(Math.round((k * NORMALIZED_MAX) / n))
  return values
}

/* ---------------------------------------------------------- ce que le relevé démontre */

describe('le relevé du corpus', () => {
  it('paysage : 48 en X et 29 en Y, et aucun maillage plus grossier', () => {
    // Les seuls candidats sont 48 et ses multiples : aucun `n` plus petit n'explique les
    // 42 valeurs, et tout `n` plus grand qui les explique en est un multiple exact — donc
    // 48 est bien le pas, pas une subdivision arbitraire.
    expect(candidates(LANDSCAPE_X)).toEqual([48, 96, 144, 192])
    expect(candidates(LANDSCAPE_Y)).toEqual([29, 58, 87, 116, 145, 174])
  })

  it('portrait : 29 en X et 48 en Y — exactement la transposée du paysage', () => {
    expect(candidates(PORTRAIT_X)).toEqual([29, 58, 87, 116, 145, 174])
    expect(candidates(PORTRAIT_Y)).toEqual([48, 96, 144, 192])
  })

  it('portrait : 19 et 31 sont réfutés par le relevé, valeur par valeur', () => {
    expect(explains(PORTRAIT_X, 19)).toBe(false)
    expect(explains(PORTRAIT_Y, 31)).toBe(false)
    // Ce n'est pas une affaire d'arrondi : 20 des 22 valeurs X et 31 des 33 valeurs Y sont
    // inexplicables par 19 et 31 — tout sauf les deux bornes 0 et 10000.
    expect(PORTRAIT_X.filter((v) => !explains([v], 19))).toHaveLength(20)
    expect(PORTRAIT_Y.filter((v) => !explains([v], 31))).toHaveLength(31)
  })

  it('les pages portrait « d’origine » relèvent d’un autre maillage, incompatible', () => {
    // Elles sont bien sur 19 × 31 — le relevé qui avait produit la valeur erronée.
    expect(candidates(LEGACY_PORTRAIT_X)[0]).toBe(19)
    expect(candidates(LEGACY_PORTRAIT_Y)[0]).toBe(31)
    // Et elles sont franchement incompatibles avec 29 × 48 : les deux lectures ne peuvent pas
    // être vraies à la fois, il fallait trancher.
    expect(explains(LEGACY_PORTRAIT_X, 29)).toBe(false)
    expect(explains(LEGACY_PORTRAIT_Y, 48)).toBe(false)
  })

  it('19 × 31 et 29 × 48 n’ont que 0 et 10000 en commun', () => {
    // Aucune valeur intermédiaire ne coïncide : aucun échantillon ne peut être « compatible avec
    // les deux ». C'est ce qui rend le relevé décisif plutôt qu'indicatif.
    for (const [a, b] of [[19, 29], [31, 48], [19, 48], [31, 29]] as const) {
      const shared = [...gridValues(a)].filter((v) => gridValues(b).has(v)).sort((x, y) => x - y)
      expect(shared).toEqual([0, NORMALIZED_MAX])
    }
  })
})

/* ------------------------------------------------------- ce que le code doit en faire */

describe('gridFor — la grille de l’AIR³ 7.2', () => {
  it('paysage : 48 × 29', () => {
    expect(gridFor(AIR3_7_2, 'landscape')).toEqual<Grid>({ cols: 48, rows: 29 })
  })

  it('portrait : 29 × 48, la transposée — et surtout pas 19 × 31', () => {
    const portrait = gridFor(AIR3_7_2, 'portrait')
    expect(portrait).toEqual<Grid>({ cols: 29, rows: 48 })
    // Garde-fou explicite : ce test échoue si quelqu'un remet la valeur réfutée.
    expect(portrait).not.toEqual<Grid>({ cols: 19, rows: 31 })
  })

  it('la grille configurée aimante le relevé portrait sans le déplacer d’une unité', () => {
    const grid = gridFor(AIR3_7_2, 'portrait')
    for (const x of PORTRAIT_X) expect(snapValue(x, grid.cols)).toBe(x)
    for (const y of PORTRAIT_Y) expect(snapValue(y, grid.rows)).toBe(y)
    for (const rect of PORTRAIT_RECTS) expect(snapRect(rect, grid)).toEqual(rect)
  })

  it('la grille configurée aimante le relevé paysage sans le déplacer d’une unité', () => {
    const grid = gridFor(AIR3_7_2, 'landscape')
    for (const x of LANDSCAPE_X) expect(snapValue(x, grid.cols)).toBe(x)
    for (const y of LANDSCAPE_Y) expect(snapValue(y, grid.rows)).toBe(y)
  })

  it('19 × 31 déplacerait presque tout le relevé portrait — la preuve par la faute', () => {
    // Si la grille fausse revenait, l'éditeur écrirait dans le fichier du pilote des
    // coordonnées qu'aucun réglage fait sur l'appareil ne produit. Contre-épreuve chiffrée.
    const wrong: Grid = { cols: 19, rows: 31 }
    expect(PORTRAIT_X.filter((x) => snapValue(x, wrong.cols) !== x)).toHaveLength(20)
    expect(PORTRAIT_Y.filter((y) => snapValue(y, wrong.rows) !== y)).toHaveLength(31)
  })
})

describe('la grille est une propriété de la dalle, pas de l’orientation', () => {
  it('portrait et paysage sont exactement transposés, sur tous les gabarits', () => {
    for (const device of DEVICES) {
      const landscape = gridFor(device, 'landscape')
      const portrait = gridFor(device, 'portrait')
      expect(portrait, device.id).toEqual<Grid>({ cols: landscape.rows, rows: landscape.cols })
    }
  })

  it('une seule mesure par appareil suffit pour les deux orientations', () => {
    const panel = panelGridFor(AIR3_7_2)
    expect(panel).toEqual({ longAxisCells: 48, shortAxisCells: 29 })
    expect(gridFor(AIR3_7_2, 'landscape')).toEqual<Grid>({
      cols: panel.longAxisCells, rows: panel.shortAxisCells
    })
    expect(gridFor(AIR3_7_2, 'portrait')).toEqual<Grid>({
      cols: panel.shortAxisCells, rows: panel.longAxisCells
    })
  })

  it('produit un maillage cohérent pour tous les gabarits du catalogue', () => {
    for (const device of DEVICES) {
      for (const orientation of ['landscape', 'portrait'] as const) {
        const grid = gridFor(device, orientation)
        expect(grid.cols, device.id).toBeGreaterThan(0)
        expect(grid.rows, device.id).toBeGreaterThan(0)
      }
    }
  })
})

describe('approximateGrid — l’extrapolation aux appareils non mesurés', () => {
  it('redonne exactement la mesure sur son appareil de calibration', () => {
    // La version précédente échouait ici, et le documentait comme une limite acceptée : une
    // extrapolation qui se trompe sur son propre point d'ancrage n'apprend rien sur les autres.
    expect(approximatePanelGrid(AIR3_7_2)).toEqual({ longAxisCells: 48, shortAxisCells: 29 })
    expect(approximateGrid(AIR3_7_2, 'landscape')).toEqual<Grid>({ cols: 48, rows: 29 })
    expect(approximateGrid(AIR3_7_2, 'portrait')).toEqual<Grid>({ cols: 29, rows: 48 })
  })

  it('reste transposée elle aussi, et dans un ordre de grandeur plausible ailleurs', () => {
    for (const device of DEVICES) {
      const landscape = approximateGrid(device, 'landscape')
      const portrait = approximateGrid(device, 'portrait')
      expect(portrait, device.id).toEqual<Grid>({ cols: landscape.rows, rows: landscape.cols })
      // Une cellule d'aimantation sert un doigt : quelques dizaines de cellules, pas des
      // centaines ni trois. Borne large, c'est un repli non vérifié.
      expect(landscape.cols, device.id).toBeGreaterThan(10)
      expect(landscape.cols, device.id).toBeLessThan(120)
      expect(landscape.rows, device.id).toBeGreaterThan(5)
      expect(landscape.rows, device.id).toBeLessThan(120)
    }
  })
})

/* ------------------------------------------------------------------- l'aimantation */

describe('snapValue', () => {
  it('aimante sur le multiple de cellule le plus proche', () => {
    // 10000/48 = 208,33… : 2650 tombe entre les cellules 12 (2500) et 13 (2708,33…), passé le
    // milieu (2604,17), donc plus proche de la 13e.
    expect(snapValue(2650, 48)).toBe(2708)
    expect(snapValue(2500, 48)).toBe(2500)
    expect(snapValue(0, 48)).toBe(0)
    expect(snapValue(10000, 48)).toBe(10000)
  })

  it('reste dans les bornes [0, 10000] même sur une valeur hors plage', () => {
    expect(snapValue(-50, 48)).toBe(0)
    expect(snapValue(10050, 48)).toBe(10000)
  })

  it('est idempotente : aimanter une valeur déjà aimantée ne la change pas', () => {
    for (const cells of [29, 48]) {
      for (let k = 0; k <= cells; k++) {
        const v = snapValue(Math.round((k * NORMALIZED_MAX) / cells), cells)
        expect(snapValue(v, cells)).toBe(v)
      }
    }
  })
})

describe('snapRect — préservation de x2 > x1 et y2 > y1', () => {
  const grid: Grid = { cols: 48, rows: 29 }

  it('un rectangle normal aimanté reste normal', () => {
    const snapped = snapRect({ x1: 4360, y1: 3800, x2: 5600, y2: 5850 }, grid)
    expect(snapped.x2).toBeGreaterThan(snapped.x1)
    expect(snapped.y2).toBeGreaterThan(snapped.y1)
  })

  it("un rectangle réduit à presque rien ne s'aimante pas sur un x2 <= x1", () => {
    // 4380 et 4390 sont à moins d'une cellule (208,3) l'un de l'autre : ils s'aimanteraient
    // tous les deux sur la cellule 21 (4375) sans le garde-fou.
    const snapped = snapRect({ x1: 4380, y1: 0, x2: 4390, y2: 500 }, grid)
    expect(snapped.x2).toBeGreaterThan(snapped.x1)
  })

  it('un rectangle inversé (x2 < x1) est corrigé, pas propagé', () => {
    const snapped = snapRect({ x1: 5000, y1: 0, x2: 4800, y2: 500 }, grid)
    expect(snapped.x2).toBeGreaterThan(snapped.x1)
  })

  it('un rectangle collé au bord droit pousse vers la gauche, jamais hors grille', () => {
    const snapped = snapRect({ x1: 9950, y1: 0, x2: 9960, y2: 500 }, grid)
    expect(snapped.x2).toBeGreaterThan(snapped.x1)
    expect(snapped.x2).toBeLessThanOrEqual(NORMALIZED_MAX)
    expect(snapped.x1).toBeGreaterThanOrEqual(0)
  })

  it('la largeur minimale résultante est exactement une cellule', () => {
    const cellX = NORMALIZED_MAX / grid.cols
    const snapped = snapRect({ x1: 4380, y1: 0, x2: 4390, y2: 500 }, grid)
    expect(snapped.x2 - snapped.x1).toBeCloseTo(cellX, 0)
  })
})
