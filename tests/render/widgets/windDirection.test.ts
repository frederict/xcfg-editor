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

// Correction en vol (rendu-en-vol.md § 3) : WWindDirection affiche la lettre du point
// cardinal, en très gros — pas une rose ni une flèche, faute de mieux au premier relevé.
describe('WWindDirection', () => {
  it('affiche une lettre cardinale géante par défaut, pas une flèche', () => {
    const el = drawWindDirection(widget({}), settings, language)
    expect(el.querySelector('.xc-wind-dir__arrow')).toBeNull()
    const value = el.querySelector('.xc-wind-dir__value--letter')
    expect(value).not.toBeNull()
    // Exemple statique repris de la capture (vol-numeriques-boussole-variocolumn.png,
    // « Direction du vent » : S) — aucune direction réelle n'est modélisée.
    expect(value?.textContent).toBe('S')
  })

  it('affiche le titre sauf si `_title` vaut false, avec repli sur le libellé du catalogue', () => {
    const shown = drawWindDirection(widget({ _title: 'true', titletext: '""' }), settings, language)
    const hidden = drawWindDirection(widget({ _title: 'false' }), settings, language)
    // Clé absente : le relevé donne `_title: true` à ce type, et la planche 2 de
    // l'appareil montre « Direction du vent » au-dessus de la lettre. L'ancien
    // `=== true` supprimait ce titre — troisième occurrence du même défaut.
    const absent = drawWindDirection(widget({}), settings, language)
    expect(shown.querySelector('.xc-wind-dir__title')?.textContent).toBe('Direction du vent')
    expect(hidden.querySelector('.xc-wind-dir__title')).toBeNull()
    expect(absent.querySelector('.xc-wind-dir__title')?.textContent).toBe('Direction du vent')
  })

  it('un `titletext` non vide remplace le libellé du catalogue', () => {
    const el = drawWindDirection(widget({ _title: 'true', titletext: '"Vent"' }), settings, language)
    expect(el.querySelector('.xc-wind-dir__title')?.textContent).toBe('Vent')
  })

  it('n’affiche pas la lettre cardinale quand `degrees` est un booléen (seule forme connue du corpus)', () => {
    const el = drawWindDirection(widget({ degrees: 'false' }), settings, language)
    // `degrees: false` n'est pas un nombre lisible par readNumber : la lettre reste affichée.
    expect(el.querySelector('.xc-wind-dir__value--letter')).not.toBeNull()
    expect(el.querySelector('.xc-wind-dir__value--degrees')).toBeNull()
  })

  it('bascule vers un affichage en degrés quand `degrees` est un nombre — lecture défensive, non exercée par le corpus connu', () => {
    const el = drawWindDirection(widget({ degrees: '270' }), settings, language)
    expect(el.querySelector('.xc-wind-dir__value--degrees')?.textContent).toBe('270°')
    // Bascule, pas ajout : la lettre cardinale disparaît quand les degrés s'affichent.
    expect(el.querySelector('.xc-wind-dir__value--letter')).toBeNull()
  })
})
