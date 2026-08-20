import { describe, expect, it } from 'vitest'
import { drawLiveMessage } from '../../../src/render/widgets/liveMessage'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

function widget(params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WLiveMessage',
    shortName: 'WLiveMessage', x1: 833, y1: 7586, x2: 10000, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

// Non observé par une capture — voir le commentaire de tête de liveMessage.ts. Ces
// tests verrouillent le comportement voulu, pas un relevé visuel.
describe('WLiveMessage (non confirmé par une capture)', () => {
  it('affiche `line_count` lignes de message d’exemple', () => {
    const el = drawLiveMessage(widget({ line_count: '2' }), settings, language)
    expect(el.querySelectorAll('.xc-livemsg__line').length).toBe(2)
  })

  it('affiche une seule ligne quand `line_count` est absent', () => {
    const el = drawLiveMessage(widget({}), settings, language)
    expect(el.querySelectorAll('.xc-livemsg__line').length).toBe(1)
  })

  it('borne le nombre de lignes à la liste d’exemples disponible', () => {
    const el = drawLiveMessage(widget({ line_count: '99' }), settings, language)
    expect(el.querySelectorAll('.xc-livemsg__line').length).toBeGreaterThan(0)
    expect(el.querySelectorAll('.xc-livemsg__line').length).toBeLessThanOrEqual(4)
  })

  it('n’affiche aucune heure quand `show_time` est absent', () => {
    const el = drawLiveMessage(widget({}), settings, language)
    expect(el.querySelector('.xc-livemsg__time')).toBeNull()
  })

  it('affiche une heure d’exemple quand `show_time` est un nombre positif — seule forme connue du corpus (300)', () => {
    const el = drawLiveMessage(widget({ show_time: '300' }), settings, language)
    expect(el.querySelector('.xc-livemsg__time')?.textContent).toBe('14:32')
  })
})
