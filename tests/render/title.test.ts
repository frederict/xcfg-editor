import { describe, expect, it } from 'vitest'
import type { Widget } from '../../src/model/widget'
import { widgetTitle } from '../../src/render/title'

/**
 * Les suffixes de titre, tels que la planche des 75 widgets les montre à l'écran —
 * chaque cas cité renvoie à une capture, aucun n'est déduit.
 */

function widget(shortName: string, params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([key, value]) => [
        `"${key}"`,
        value.startsWith('"') ? { kind: 'string' as const, raw: value } : { kind: 'literal' as const, raw: value }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 2500, y2: 3000,
    border: false, background: 100, theme: ''
  }
}

describe('titre de widget', () => {
  describe('période de moyennage', () => {
    it('écrit « / 2s » sur un WVerticalSpeed nu (planche 2)', () => {
      expect(widgetTitle(widget('WVerticalSpeed'), 'fr')).toBe('Vitesse verticale / 2s')
    })

    it('écrit « / 2s » sur un WGlide nu (planche 2)', () => {
      expect(widgetTitle(widget('WGlide'), 'fr')).toBe('Finesse / 2s')
    })

    it('écrit « / 0,1s » pour `netto_avg: 0` (planche 2, WNettoVario)', () => {
      expect(widgetTitle(widget('WNettoVario'), 'fr')).toBe('Vario netto / 0,1s')
    })

    it('écrit « / 0.1s » hors français : seul le séparateur change', () => {
      expect(widgetTitle(widget('WNettoVario'), 'en')).toContain('/ 0.1s')
    })

    it('suit la valeur du fichier quand elle diffère du relevé', () => {
      expect(widgetTitle(widget('WGlide', { avg: '8000' }), 'fr')).toBe('Finesse / 8s')
    })

    it('n’écrit rien pour `avg: 0`', () => {
      expect(widgetTitle(widget('WGlide', { avg: '0' }), 'fr')).toBe('Finesse')
    })
  })

  describe('mode', () => {
    it('écrit « TAS » sur un WAirSpeed nu (planche 1)', () => {
      expect(widgetTitle(widget('WAirSpeed'), 'fr')).toBe('Vitesse Air TAS')
    })

    it('écrit « GS » pour `speed_type: GROUND` (planches 3 et 4)', () => {
      expect(widgetTitle(widget('WNextTurnpointTimeOfArrival'), 'fr')).toBe('Tps Pt suivant GS')
      expect(widgetTitle(widget('WCompTimeAtStart'), 'fr')).toBe('Temps au départ GS')
    })

    it('écrit « AGL » pour `altitude: AGL` (planche 3)', () => {
      expect(widgetTitle(widget('WNextTurnpointAlt'), 'fr')).toBe('Hauteur Pt suivant AGL')
    })

    it('n’invente pas de suffixe pour un code non relevé', () => {
      expect(widgetTitle(widget('WAirSpeed', { speed_type: '"IAS"' }), 'fr')).toBe('Vitesse Air')
    })

    it('n’écrit RIEN pour `navigation_target: OPTIMIZED` — mesuré, planches 3 et 4', () => {
      expect(widgetTitle(widget('WNextTurnpointDistance'), 'fr')).toBe('Prochaine distance')
      expect(widgetTitle(widget('WCompSpeedToStart'), 'fr')).toBe('Vitesse au départ')
    })
  })

  it('laisse un titre personnalisé intact', () => {
    expect(widgetTitle(widget('WGlide', { titletext: '"Ma finesse"' }), 'fr')).toBe('Ma finesse')
  })

  it('n’ajoute rien à un type que le relevé ignore', () => {
    expect(widgetTitle(widget('WInventeEn2027'), 'fr')).toBe('WInventeEn2027')
  })
})
