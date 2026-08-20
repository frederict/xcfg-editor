import { describe, expect, it } from 'vitest'
import { drawVarioColumn } from '../../../src/render/widgets/varioColumn'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

function widget(params: Record<string, string>): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WVarioColumn',
    shortName: 'WVarioColumn', x1: 0, y1: 0, x2: 833, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

describe('WVarioColumn', () => {
  it('dessine la flèche à double pointe sur toute la hauteur', () => {
    const el = drawVarioColumn(widget({}), settings, language)
    expect(el.querySelector('.xc-vscale__arrow')).not.toBeNull()
    expect(el.querySelectorAll('.xc-vscale__arrowhead').length).toBe(2)
  })

  it('porte une valeur d’échelle fixe — aucune clé du corpus ne la fournit pour ce type', () => {
    const el = drawVarioColumn(widget({ avg: '2000' }), settings, language)
    expect(el.querySelector('.xc-vscale__label')?.textContent).toBeTruthy()
  })

  it('ne dessine jamais la trace pointillée — c’est le propre de WVerticalGraph', () => {
    const el = drawVarioColumn(widget({}), settings, language)
    expect(el.querySelector('.xc-vscale__trace')).toBeNull()
  })
})
