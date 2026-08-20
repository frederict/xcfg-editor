import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { DEVICES } from '../../src/catalog/devices'
import {
  approximateGrid,
  gridFor,
  NORMALIZED_MAX,
  snapRect,
  snapValue,
  type Grid,
  type Orientation,
  type Rect
} from '../../src/model/grid'

const DIR = '/Users/fred/DEV/XCTrack/Exemples/'

const AIR3_7_2 = DEVICES.find((d) => d.id === 'air3-7.2')!

/**
 * Relevé refait indépendamment sur le corpus (`Exemples/*.xcfg`), séparé par orientation :
 * les rectangles distincts (X1, Y1, X2, Y2) de tous les widgets de toutes les pages, toutes
 * les cinq fichiers confondus.
 *
 * 74 rectangles distincts en paysage, 28 en portrait — soit 102 au total. C'est moins que les
 * « 207 widgets distincts » mentionnés dans la consigne (peut-être un décompte incluant la
 * classe du widget, ou un corpus plus large que celui présent ici) : ce test s'appuie sur ce
 * qui a été effectivement mesuré dans ce dépôt, pas sur ce chiffre.
 *
 * Les 24 valeurs X et 21 valeurs Y distinctes en paysage, et les 10 valeurs X et 11 valeurs Y
 * distinctes en portrait, correspondent exactement à celles citées par
 * `docs/reference/edition-native-exploration.md` §2.2.
 */
function readCorpusRects(): Record<Orientation, Rect[]> {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.xcfg'))
  const seen: Record<Orientation, Map<string, Rect>> = {
    landscape: new Map(),
    portrait: new Map()
  }
  for (const file of files) {
    const doc = JSON.parse(readFileSync(DIR + file, 'utf8'))
    const layout = doc.layout ?? {}
    for (const orientation of ['landscape', 'portrait'] as const) {
      const pages = layout[orientation] ?? []
      for (const page of pages) {
        for (const widget of page.widgets ?? []) {
          const rect: Rect = { x1: widget.X1, y1: widget.Y1, x2: widget.X2, y2: widget.Y2 }
          seen[orientation].set(JSON.stringify(rect), rect)
        }
      }
    }
  }
  return {
    landscape: [...seen.landscape.values()],
    portrait: [...seen.portrait.values()]
  }
}

const corpus = readCorpusRects()

describe('vérité terrain du corpus', () => {
  it('a bien retrouvé un corpus non trivial dans les deux orientations', () => {
    // Garde-fou : si ce nombre tombe à 0, le test « ne bouge pas » ci-dessous serait
    // vide de sens (il passerait trivialement sur un tableau vide).
    expect(corpus.landscape.length).toBeGreaterThan(50)
    expect(corpus.portrait.length).toBeGreaterThan(15)
  })

  it('toutes les coordonnées paysage sont des multiples de 1/48 (X) et 1/29 (Y)', () => {
    for (const rect of corpus.landscape) {
      for (const x of [rect.x1, rect.x2]) {
        expect((x * 48) / NORMALIZED_MAX).toBeCloseTo(Math.round((x * 48) / NORMALIZED_MAX), 2)
      }
      for (const y of [rect.y1, rect.y2]) {
        expect((y * 29) / NORMALIZED_MAX).toBeCloseTo(Math.round((y * 29) / NORMALIZED_MAX), 2)
      }
    }
  })

  it('toutes les coordonnées portrait sont des multiples de 1/19 (X) et 1/31 (Y)', () => {
    for (const rect of corpus.portrait) {
      for (const x of [rect.x1, rect.x2]) {
        expect((x * 19) / NORMALIZED_MAX).toBeCloseTo(Math.round((x * 19) / NORMALIZED_MAX), 2)
      }
      for (const y of [rect.y1, rect.y2]) {
        expect((y * 31) / NORMALIZED_MAX).toBeCloseTo(Math.round((y * 31) / NORMALIZED_MAX), 2)
      }
    }
  })

  it('aimanter un rectangle déjà sur la grille (48×29) le laisse rigoureusement inchangé — paysage', () => {
    const grid = gridFor(AIR3_7_2, 'landscape')
    expect(grid).toEqual<Grid>({ cols: 48, rows: 29 })
    for (const rect of corpus.landscape) {
      expect(snapRect(rect, grid)).toEqual(rect)
    }
  })

  it('aimanter un rectangle déjà sur la grille (19×31) le laisse rigoureusement inchangé — portrait', () => {
    const grid = gridFor(AIR3_7_2, 'portrait')
    expect(grid).toEqual<Grid>({ cols: 19, rows: 31 })
    for (const rect of corpus.portrait) {
      expect(snapRect(rect, grid)).toEqual(rect)
    }
  })
})

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
    const grid = { cols: 48, rows: 29 }
    for (let k = 0; k <= grid.cols; k++) {
      const v = snapValue(Math.round((k * NORMALIZED_MAX) / grid.cols), grid.cols)
      expect(snapValue(v, grid.cols)).toBe(v)
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

  it("un rectangle collé au bord droit (x proche de 10000) pousse vers la gauche, jamais hors grille", () => {
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

describe('gridFor et approximateGrid', () => {
  it('renvoie la grille mesurée pour l’AIR³ 7.2, dans les deux orientations', () => {
    expect(gridFor(AIR3_7_2, 'landscape')).toEqual<Grid>({ cols: 48, rows: 29 })
    expect(gridFor(AIR3_7_2, 'portrait')).toEqual<Grid>({ cols: 19, rows: 31 })
  })

  it(
    "l'approximation générale ne reproduit PAS exactement 48×29 même pour l'appareil de " +
      "calibration : elle sert de repli honnête pour un appareil sans mesure, pas d'une " +
      'dérivation exacte — voir la documentation de `REFERENCE_CELL_MM` dans grid.ts',
    () => {
      const approx = approximateGrid(AIR3_7_2, 'landscape')
      expect(approx).not.toEqual<Grid>({ cols: 48, rows: 29 })
      // Elle reste dans le même ordre de grandeur (à quelques cellules près), cohérente avec
      // l'hypothèse de cellule à peu près carrée.
      expect(approx.cols).toBeGreaterThan(30)
      expect(approx.cols).toBeLessThan(70)
      expect(approx.rows).toBeGreaterThan(15)
      expect(approx.rows).toBeLessThan(45)
    }
  )

  it("produit un maillage cohérent (cols/rows positifs) pour tous les gabarits du catalogue, dans les deux orientations", () => {
    for (const device of DEVICES) {
      for (const orientation of ['landscape', 'portrait'] as const) {
        const grid = gridFor(device, orientation)
        expect(grid.cols).toBeGreaterThan(0)
        expect(grid.rows).toBeGreaterThan(0)
      }
    }
  })

  it('portrait et paysage du même appareil échangent grossièrement largeur et hauteur perçues', () => {
    // Pas une égalité stricte (l'arrondi diffère), mais l'ordre de grandeur doit se retourner :
    // le grand côté en paysage devient le grand nombre de lignes en portrait.
    const landscape = approximateGrid(AIR3_7_2, 'landscape')
    const portrait = approximateGrid(AIR3_7_2, 'portrait')
    expect(landscape.cols).toBe(portrait.rows)
    expect(landscape.rows).toBe(portrait.cols)
  })
})
