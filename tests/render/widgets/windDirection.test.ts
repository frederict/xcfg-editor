import { describe, expect, it } from 'vitest'
import { drawWindDirection } from '../../../src/render/widgets/windDirection'
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
    className: 'org.xcontest.XCTrack.widget.w.WWindDirection',
    shortName: 'WWindDirection', x1: 0, y1: 0, x2: 2000, y2: 2000,
    border: false, background: 100, theme: ''
  }
}

// Non observé isolément dans les captures disponibles — voir le commentaire de tête de
// windDirection.ts. Ces tests verrouillent le comportement voulu, pas un relevé visuel.
describe('WWindDirection (non confirmé par une capture)', () => {
  it('dessine une flèche de direction sobre', () => {
    const el = drawWindDirection(widget({}), settings, language)
    expect(el.querySelector('.xc-wind-dir__arrow')).not.toBeNull()
  })

  it('affiche le titre seulement si `_title` vaut true, avec repli sur le libellé du catalogue', () => {
    const shown = drawWindDirection(widget({ _title: 'true', titletext: '""' }), settings, language)
    const hidden = drawWindDirection(widget({ _title: 'false' }), settings, language)
    const absent = drawWindDirection(widget({}), settings, language)
    expect(shown.querySelector('.xc-wind-dir__title')?.textContent).toBe('Direction du vent')
    expect(hidden.querySelector('.xc-wind-dir__title')).toBeNull()
    expect(absent.querySelector('.xc-wind-dir__title')).toBeNull()
  })

  it('un `titletext` non vide remplace le libellé du catalogue', () => {
    const el = drawWindDirection(widget({ _title: 'true', titletext: '"Vent"' }), settings, language)
    expect(el.querySelector('.xc-wind-dir__title')?.textContent).toBe('Vent')
  })

  it('n’affiche aucune valeur en degrés quand `degrees` est un booléen (seule forme connue du corpus)', () => {
    const el = drawWindDirection(widget({ degrees: 'false' }), settings, language)
    expect(el.querySelector('.xc-wind-dir__degrees')).toBeNull()
  })

  it('affiche la valeur en degrés si `degrees` est un nombre — lecture défensive, non exercée par le corpus connu', () => {
    const el = drawWindDirection(widget({ degrees: '270' }), settings, language)
    expect(el.querySelector('.xc-wind-dir__degrees')?.textContent).toBe('270°')
  })
})
