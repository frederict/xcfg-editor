import { describe, expect, it } from 'vitest'
import { drawAirspaceProximity } from '../../../src/render/widgets/airspaceProximity'
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
    className: 'org.xcontest.XCTrack.widget.w.WAirspaceProximity',
    shortName: 'WAirspaceProximity', x1: 0, y1: 1379, x2: 1250, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

// Relevé du corpus et capture de référence : voir le commentaire de tête de
// airspaceProximity.ts. Seule la première zone (BEAUVECHAIN) est confirmée pixel par
// pixel par ecran-non-identifie-4.png ; la seconde reprend le même gabarit, comme
// documenté.
describe('WAirspaceProximity', () => {
  it('dessine deux zones empilées, nommées BEAUVECHAIN et Charleroi', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__zone').length).toBe(2)
    expect(el.textContent).toContain('BEAUVECHAIN')
    expect(el.textContent).toContain('Charleroi')
  })

  it('affiche le plancher-plafond seulement si `_showoriginalheightline` vaut true', () => {
    const shown = drawAirspaceProximity(widget({ _showoriginalheightline: 'true' }), settings, language)
    const hidden = drawAirspaceProximity(widget({ _showoriginalheightline: 'false' }), settings, language)
    const absent = drawAirspaceProximity(widget({}), settings, language)
    expect(shown.textContent).toContain('760 m - 1370 m')
    expect(shown.textContent).toContain('760 m - FL55')
    expect(hidden.querySelectorAll('.xc-airprox__range').length).toBe(0)
    expect(absent.querySelectorAll('.xc-airprox__range').length).toBe(0)
  })

  it('sépare les deux zones par un unique filet rouge', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__divider').length).toBe(1)
  })

  it('affiche une distance verticale (flèche) et une distance horizontale (flèche oblique) par zone', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__dist--vertical').length).toBe(2)
    expect(el.querySelectorAll('.xc-airprox__dist--horizontal').length).toBe(2)
  })

  it('empile les zones en colonne par défaut (`_splitdirection` absent ou `AUTO`)', () => {
    const absent = drawAirspaceProximity(widget({}), settings, language)
    const auto = drawAirspaceProximity(widget({ _splitdirection: '"AUTO"' }), settings, language)
    expect(absent.classList.contains('xc-airprox--row')).toBe(false)
    expect(auto.classList.contains('xc-airprox--row')).toBe(false)
  })

  it('empile les zones en ligne quand `_splitdirection` vaut `HORIZONTAL`', () => {
    const el = drawAirspaceProximity(widget({ _splitdirection: '"HORIZONTAL"' }), settings, language)
    expect(el.classList.contains('xc-airprox--row')).toBe(true)
  })
})
