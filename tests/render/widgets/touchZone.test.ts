import { describe, expect, it } from 'vitest'
import { drawTouchZone } from '../../../src/render/widgets/touchZone'
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
    className: 'org.xcontest.XCTrack.widget.w.WButtonBrightness',
    shortName: 'WButtonBrightness', x1: 2292, y1: 1034, x2: 8542, y2: 4483,
    border: false, background: 100, theme: ''
  }
}

// Correction en vol (rendu-en-vol.md § 4) : WButtonNavig est sorti de ce mécanisme — il
// dessine un pictogramme visible (buttonNavig.ts, buttonNavig.test.ts). Seul
// WButtonBrightness reste une zone tactile invisible.
describe('zone tactile invisible — WButtonBrightness', () => {
  it('ne dessine ni fond, ni cadre, ni texte visible en rendu normal', () => {
    // « Ce qu'il faut : aucun fond, aucun cadre, aucun texte en rendu normal »
    // (rendu-observe.md, « Widgets sans rendu visible »).
    const el = drawTouchZone(widget({ type: '"ACTION_PLUS"', longClick: 'false' }), settings, 'fr')
    expect(el.className).toBe('xc-touch')
    // Aucun texte visible par défaut : le seul texte présent est l'étiquette de survol,
    // masquée par CSS (:hover) — voir style.css. On vérifie ici qu'aucun texte n'apparaît
    // hors de ce mécanisme dédié.
    expect(el.querySelectorAll('.xc-touch__label')).toHaveLength(1)
    expect(el.style.background).toBe('')
    expect(el.style.border).toBe('')
  })

  it('remplit toute la zone du widget', () => {
    const el = drawTouchZone(widget({}), settings, 'fr')
    expect(el.style.width).toBe('100%')
    expect(el.style.height).toBe('100%')
  })

  describe('étiquette de survol', () => {
    it('ACTION_PLUS sans longClick', () => {
      const el = drawTouchZone(widget({ type: '"ACTION_PLUS"', longClick: 'false' }), settings, 'fr')
      expect(el.querySelector('.xc-touch__label')?.textContent).toBe('Zone tactile — luminosité +')
    })

    it('ACTION_MINUS sans longClick', () => {
      const el = drawTouchZone(widget({ type: '"ACTION_MINUS"', longClick: 'false' }), settings, 'fr')
      expect(el.querySelector('.xc-touch__label')?.textContent).toBe('Zone tactile — luminosité −')
    })

    it('bascule en anglais avec la langue reçue en paramètre', () => {
      const el = drawTouchZone(widget({ type: '"ACTION_PLUS"', longClick: 'false' }), settings, 'en')
      expect(el.querySelector('.xc-touch__label')?.textContent).toBe('Touch zone — brightness +')
    })

    it('retombe sur le nom lisible du type quand `type` est absent ou inconnu', () => {
      const el = drawTouchZone(widget({}), settings, 'fr')
      // Nom du catalogue officiel (readableName), pas un texte inventé.
      expect(el.querySelector('.xc-touch__label')?.textContent).toBe("Zone tactile — Luminosité de l'écran")
    })
  })
})
