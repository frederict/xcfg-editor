import { describe, expect, it } from 'vitest'
import { DEVICES } from '../../src/catalog/devices'
import { widgetSizeMm } from '../../src/ui/views'

describe('taille physique d’un widget', () => {
  const air3 = DEVICES.find((d) => d.id === 'air3-7.2')!

  it('rend les dimensions en millimètres sur l’AIR³ 7.2', () => {
    // Un widget occupant toute la dalle mesure la dalle entière.
    const full = widgetSizeMm({ x1: 0, y1: 0, x2: 10000, y2: 10000 }, air3, 'landscape')
    expect(Math.round(full.widthMm)).toBe(155)
    expect(Math.round(full.heightMm)).toBe(87)
  })

  it('rend un petit widget à l’échelle', () => {
    // Un dixième de large, un huitième de haut. On compare avec une tolérance plutôt
    // qu'en arrondissant : 15,497 mm est à trois millièmes de basculer vers 16, et une
    // diagonale un jour affinée à 7,002 pouces ferait échouer un test pourtant juste.
    const small = widgetSizeMm({ x1: 0, y1: 0, x2: 1000, y2: 1250 }, air3, 'landscape')
    expect(small.widthMm).toBeCloseTo(15.5, 1)
    expect(small.heightMm).toBeCloseTo(10.9, 1)
  })
})
