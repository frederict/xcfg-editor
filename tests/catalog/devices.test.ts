import { describe, expect, it } from 'vitest'
import { DEVICES, deviceFor, physicalSize } from '../../src/catalog/devices'

describe('gabarits', () => {
  it("déduit l'appareil de info.device", () => {
    expect(deviceFor('AIR3 AIR3-7.2 8.1.0').id).toBe('air3-7.2')
  })

  it('retombe sur un gabarit par défaut si inconnu', () => {
    expect(deviceFor('Nokia 3310').id).toBe('air3-7.2')
  })

  it('calcule les dimensions physiques en millimètres', () => {
    const size = physicalSize(DEVICES.find((d) => d.id === 'air3-7.2')!, 'landscape')
    expect(Math.round(size.widthMm)).toBe(155)
    expect(Math.round(size.heightMm)).toBe(87)
  })
})
