import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { BACKUP_2026 } from '../fixtures/paths'

const doc = parseJson(readFileSync(BACKUP_2026, 'utf8'))

describe('readLayout', () => {
  const layout = readLayout(doc)

  it('lit les deux orientations', () => {
    expect(layout.landscape).toHaveLength(5)
    expect(layout.portrait).toHaveLength(3)
  })

  it('lit les huit clés universelles', () => {
    const widget = layout.landscape[4]!.widgets[0]!
    expect(widget.className).toBe('org.xcontest.XCTrack.widget.w.WCompMap')
    expect(widget.shortName).toBe('WCompMap')
    expect(widget.background).toBe(100)
    // Valeur relevée dans le fichier : la carte laisse une colonne à gauche.
    expect(widget.x1).toBe(2500)
  })

  it("conserve l'ordre de dessin du tableau", () => {
    // Le grand widget graphique vient en premier ; les autres se posent dessus.
    const page = layout.landscape[4]!
    const area = (w: typeof page.widgets[number]) =>
      ((w.x2 - w.x1) * (w.y2 - w.y1)) / 1e8
    expect(area(page.widgets[0]!)).toBeGreaterThan(0.5)
    expect(page.widgets).toHaveLength(21)
  })

  it('lit les trois formes de navigations', () => {
    const forms = new Set([...layout.landscape, ...layout.portrait].map((p) => p.navigations.kind))
    // Les trois formes coexistent dans ce fichier : 5 « all », 1 « none », 2 tableaux.
    // Un `has(...) || has(...)` passerait alors que « none » est la valeur de repli :
    // le test serait vert même si readNavigations ne reconnaissait rien.
    expect(forms).toEqual(new Set(['all', 'none', 'list']))
  })
})
