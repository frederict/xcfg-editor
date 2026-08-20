import { describe, expect, it } from 'vitest'
import { drawCompass } from '../../../src/render/widgets/compass'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

/** Même convention que numeric.test.ts : les valeurs sont fournies sous leur forme
 * source exacte — une chaîne entre guillemets pour `rotation`, qui est une chaîne nue
 * sur WCompass, pas l'objet `{value, showCompass}` des trois cartes (rotation.ts). */
function widget(params: Record<string, string>, bounds: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 10000, y2: 10000 }): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WCompass',
    shortName: 'WCompass', ...bounds,
    border: false, background: 100, theme: ''
  }
}

describe('WCompass', () => {
  it('dessine la couronne, onze graduations et le N', () => {
    const el = drawCompass(widget({}), settings, language)
    expect(el.querySelector('.xc-compass__ring')).not.toBeNull()
    expect(el.querySelectorAll('.xc-compass__tick').length).toBe(11)
    expect(el.querySelector('.xc-compass__n')?.textContent).toBe('N')
  })

  it('trois graduations cardinales, plus longues que les huit autres', () => {
    const el = drawCompass(widget({}), settings, language)
    expect(el.querySelectorAll('.xc-compass__tick--cardinal').length).toBe(3)
  })

  it('dessine l’aiguille en deux facettes, pas trois — voir le rapport de tâche', () => {
    const el = drawCompass(widget({}), settings, language)
    const needle = el.querySelector('.xc-compass__needle')
    expect(needle?.querySelectorAll('.xc-compass__needle-facet').length).toBe(2)
  })

  it('grand format : aiguille grise (pas de modificateur --small)', () => {
    const el = drawCompass(widget({}, { x1: 0, y1: 0, x2: 10000, y2: 10000 }), settings, language)
    expect(el.querySelector('.xc-compass__needle--small')).toBeNull()
  })

  it('petit format (coin de page chargée) : aiguille rouge, modificateur --small', () => {
    // Dimensions mesurées sur ecran-landscape3-17widgets.png (X1:8542,Y1:2414,X2:10000,Y2:5172).
    const el = drawCompass(widget({}, { x1: 8542, y1: 2414, x2: 10000, y2: 5172 }), settings, language)
    expect(el.querySelector('.xc-compass__needle--small')).not.toBeNull()
  })

  it('rotation à "HEADING" (chaîne nue) fait tourner le cadran, pas l’aiguille', () => {
    const el = drawCompass(widget({ rotation: '"HEADING"' }), settings, language)
    const dial = el.querySelector('.xc-compass__dial') as SVGGElement
    const needle = el.querySelector('.xc-compass__needle') as SVGGElement
    expect(dial.getAttribute('transform')).toBeTruthy()
    expect(needle.getAttribute('transform')).toBe('rotate(0 100 100)')
  })

  it('rotation à "NORTH" (ou absente) fait tourner l’aiguille, pas le cadran', () => {
    const el = drawCompass(widget({ rotation: '"NORTH"' }), settings, language)
    const dial = el.querySelector('.xc-compass__dial') as SVGGElement
    const needle = el.querySelector('.xc-compass__needle') as SVGGElement
    expect(dial.hasAttribute('transform')).toBe(false)
    expect(needle.getAttribute('transform')).not.toBe('rotate(0 100 100)')

    const absent = drawCompass(widget({}), settings, language)
    const absentDial = absent.querySelector('.xc-compass__dial') as SVGGElement
    expect(absentDial.hasAttribute('transform')).toBe(false)
  })

  it('ne porte jamais de titre — aucune occurrence du corpus ne pose `_title` sur ce type', () => {
    const el = drawCompass(widget({ _title: 'true', titletext: '"Boussole et vent"' }), settings, language)
    expect(el.textContent).not.toContain('Boussole et vent')
  })
})
