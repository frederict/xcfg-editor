import { describe, expect, it } from 'vitest'
import { drawVerticalGraph } from '../../../src/render/widgets/verticalGraph'
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
    className: 'org.xcontest.XCTrack.widget.w.WVerticalGraph',
    shortName: 'WVerticalGraph', x1: 2292, y1: 7586, x2: 8125, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

describe('WVerticalGraph', () => {
  it('dessine la flèche à double pointe, sa valeur, et la trace pointillée', () => {
    const el = drawVerticalGraph(widget({}), settings, language)
    expect(el.querySelector('.xc-vscale__arrow')).not.toBeNull()
    expect(el.querySelector('.xc-vscale__trace')).not.toBeNull()
    expect(el.querySelectorAll('.xc-vscale__trace circle').length).toBeGreaterThan(10)
  })

  it('affiche `vertical_step` comme valeur d’échelle, "50" par défaut (mesuré sur la capture)', () => {
    const withDefault = drawVerticalGraph(widget({}), settings, language)
    const withStep = drawVerticalGraph(widget({ vertical_step: '25' }), settings, language)
    expect(withDefault.querySelector('.xc-vscale__label')?.textContent).toBe('50')
    expect(withStep.querySelector('.xc-vscale__label')?.textContent).toBe('25')
  })

  it('colore la trace avec `dot_color` (ARGB Android), orange par défaut', () => {
    const withDefault = drawVerticalGraph(widget({}), settings, language)
    // -26624 → #ff9800, mesuré sur le corpus (voir verticalGraph.ts).
    const withColor = drawVerticalGraph(widget({ dot_color: '-16776961' }), settings, language)
    const defaultFill = (withDefault.querySelector('.xc-vscale__trace') as SVGGElement).getAttribute('fill')
    const customFill = (withColor.querySelector('.xc-vscale__trace') as SVGGElement).getAttribute('fill')
    expect(defaultFill).toBe('#ff9800')
    expect(customFill).toBe('#0000ff')
  })

  it('`dot_size` module le rayon des points', () => {
    const small = drawVerticalGraph(widget({ dot_size: '5' }), settings, language)
    const large = drawVerticalGraph(widget({ dot_size: '30' }), settings, language)
    const smallR = parseFloat(small.querySelector('.xc-vscale__trace circle')?.getAttribute('r') ?? '0')
    const largeR = parseFloat(large.querySelector('.xc-vscale__trace circle')?.getAttribute('r') ?? '0')
    expect(largeR).toBeGreaterThan(smallR)
  })
})
