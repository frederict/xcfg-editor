import { describe, expect, it } from 'vitest'
import { drawButtonNavig } from '../../../src/render/widgets/buttonNavig'
import { isTransparent } from '../../../src/render/registry'
import '../../../src/render/widgets'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

function widget(params: Record<string, string>): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WButtonNavig',
    shortName: 'WButtonNavig', x1: 8958, y1: 7931, x2: 10000, y2: 10000,
    border: true, background: 0, theme: ''
  }
}

// Correction en vol (rendu-en-vol.md § 4) : WButtonNavig dessine un pictogramme visible
// — drapeau + « Ø » — contrairement à WButtonBrightness, qui reste une zone tactile
// invisible (touchZone.ts, touchZone.test.ts).
describe('bouton de navigation — WButtonNavig', () => {
  it('dessine un drapeau et un symbole « Ø »', () => {
    const el = drawButtonNavig(widget({ type: '"ACTION_NEXT_WAYPOINT"', longClick: 'true' }), settings, 'fr')
    expect(el.className).toBe('xc-navig')
    expect(el.querySelector('.xc-navig__flag')).not.toBeNull()
    expect(el.querySelector('.xc-navig__slash')?.textContent).toBe('Ø')
  })

  it('les deux actions connues dessinent EXACTEMENT le même pictogramme — vu sur la capture', () => {
    // vol-thermalassistant-boutonsnavig.png : ACTION_NEXT_WAYPOINT et
    // ACTION_PREV_WAYPOINT sont visuellement indiscernables, seule l'étiquette de
    // survol (title) distingue les deux occurrences adjacentes.
    const next = drawButtonNavig(widget({ type: '"ACTION_NEXT_WAYPOINT"', longClick: 'true' }), settings, 'fr')
    const prev = drawButtonNavig(widget({ type: '"ACTION_PREV_WAYPOINT"', longClick: 'true' }), settings, 'fr')
    expect(next.querySelector('.xc-navig__flag')?.outerHTML).toBe(prev.querySelector('.xc-navig__flag')?.outerHTML)
    expect(next.querySelector('.xc-navig__slash')?.textContent).toBe(prev.querySelector('.xc-navig__slash')?.textContent)
  })

  describe('étiquette de survol (title)', () => {
    it('ACTION_NEXT_WAYPOINT avec longClick', () => {
      const el = drawButtonNavig(widget({ type: '"ACTION_NEXT_WAYPOINT"', longClick: 'true' }), settings, 'fr')
      expect(el.title).toBe('balise suivante (appui long)')
    })

    it('ACTION_PREV_WAYPOINT sans longClick', () => {
      const el = drawButtonNavig(widget({ type: '"ACTION_PREV_WAYPOINT"', longClick: 'false' }), settings, 'fr')
      expect(el.title).toBe('balise précédente')
    })

    it('bascule en anglais avec la langue reçue en paramètre', () => {
      const el = drawButtonNavig(widget({ type: '"ACTION_NEXT_WAYPOINT"', longClick: 'true' }), settings, 'en')
      expect(el.title).toBe('next waypoint (long press)')
    })

    it('pas de title quand `type` est absent ou inconnu', () => {
      const el = drawButtonNavig(widget({}), settings, 'fr')
      expect(el.title).toBe('')
    })
  })

  it('n’est plus enregistré comme transparent — seul WButtonBrightness l’est', () => {
    expect(isTransparent('WButtonNavig')).toBe(false)
    expect(isTransparent('WButtonBrightness')).toBe(true)
  })
})
