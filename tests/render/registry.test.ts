import { describe, expect, it } from 'vitest'
import { drawWidget, register } from '../../src/render/registry'
import type { RenderSettings } from '../../src/model/preferences'
import type { Widget } from '../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: true, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 100, titleFont: 'normal',
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const widget = (shortName: string): Widget => ({
  node: { kind: 'object', entries: [] },
  className: `org.xcontest.XCTrack.widget.w.${shortName}`,
  shortName, x1: 0, y1: 0, x2: 100, y2: 100,
  border: false, background: 100, theme: ''
})

describe('annuaire', () => {
  it('utilise le rendu générique pour un type inconnu', () => {
    const element = drawWidget(widget('WInventeEn2027'), settings)
    expect(element.textContent).toContain('WInventeEn2027')
  })

  it('affiche le nom lisible quand il existe', () => {
    expect(drawWidget(widget('WAltitude'), settings).textContent).toContain('Altitude')
  })

  it('utilise le dessin enregistré quand il existe', () => {
    register('WEssai', () => {
      const el = document.createElement('div')
      el.textContent = 'dessin sur mesure'
      return el
    })
    expect(drawWidget(widget('WEssai'), settings).textContent).toBe('dessin sur mesure')
  })
})
