import { describe, expect, it } from 'vitest'
import { WIDGET_NAMES, readableName } from '../../src/catalog/widgetNames'

describe('noms lisibles', () => {
  it('traduit les types courants', () => {
    expect(readableName('WAltitude')).toBe('Altitude')
    expect(readableName('WFL')).toBe('Niveau de vol')
  })

  it('retombe sur le nom de classe pour un type inconnu', () => {
    expect(readableName('WQuelqueChoseDeNouveau')).toBe('WQuelqueChoseDeNouveau')
  })

  it('couvre les 37 types du corpus', () => {
    expect(Object.keys(WIDGET_NAMES).length).toBeGreaterThanOrEqual(37)
  })
})
