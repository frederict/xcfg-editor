import { describe, expect, it } from 'vitest'
import { drawSideView } from '../../../src/render/widgets/sideView'
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
    className: 'org.xcontest.XCTrack.widget.w.WSideView',
    shortName: 'WSideView', x1: 0, y1: 0, x2: 10000, y2: 3000,
    border: false, background: 100, theme: ''
  }
}

describe('WSideView', () => {
  it('dessine le profil du terrain en aplat', () => {
    const el = drawSideView(widget(), settings, language)
    expect(el.querySelector('.xc-sideview__terrain')).not.toBeNull()
  })

  it('dessine deux volumes d’espace aérien nommés, dont un réglementé (teinte distincte)', () => {
    const el = drawSideView(widget(), settings, language)
    const blocks = el.querySelectorAll('.xc-sideview__airspace')
    expect(blocks.length).toBe(2)
    expect(el.textContent).toContain('NAMUR AREA')
    expect(el.textContent).toContain('CHARLEROI')
    expect(el.querySelectorAll('.xc-sideview__airspace--restricted').length).toBe(1)
  })

  it('dessine l’échelle horizontale graduée en kilomètres', () => {
    const el = drawSideView(widget(), settings, language)
    expect(el.querySelectorAll('.xc-sideview__scale-tick').length).toBeGreaterThanOrEqual(2)
    expect(el.textContent).toContain('5km')
    expect(el.textContent).toContain('10km')
  })

  it('le terrain se dessine après les espaces aériens, pour les recouvrir en partie basse', () => {
    const el = drawSideView(widget(), settings, language)
    const scene = el.querySelector('.xc-sideview__scene')
    const children = Array.from(scene?.children ?? [])
    const terrainIndex = children.findIndex((c) => c.classList.contains('xc-sideview__terrain'))
    const lastAirspaceIndex = children.reduce((acc, c, i) => c.classList.contains('xc-sideview__airspace') ? i : acc, -1)
    expect(terrainIndex).toBeGreaterThan(lastAirspaceIndex)
  })
})

/**
 * Écart 2.7 de la revue des 75 visuels — « le décor est juste, les instruments manquent ».
 * Relevé sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-7-carte-manche-vue-de-cote-resume.png`.
 */
describe('WSideView — les instruments manquants (écart 2.7)', () => {
  it('fait monter les colonnes d’espace aérien jusqu’au haut de la cellule', () => {
    const el = drawSideView(widget(), settings, language)
    for (const rect of el.querySelectorAll('.xc-sideview__airspace rect')) {
      expect(rect.getAttribute('y')).toBe('0')
    }
  })

  it('centre l’étiquette de chaque colonne en haut, et non dedans à gauche', () => {
    const el = drawSideView(widget(), settings, language)
    for (const label of el.querySelectorAll('.xc-sideview__airspace-label')) {
      expect(label.getAttribute('text-anchor')).toBe('middle')
      // La colonne la plus à droite passe en seconde ligne, sous le repère « 500m » qui
      // occupe la première ligne de ce coin sur la capture.
      expect(Number(label.getAttribute('y'))).toBeLessThan(30)
    }
  })

  it('dessine le repère « 500m » et le pictogramme en forme d’œil', () => {
    const el = drawSideView(widget(), settings, language)
    expect(el.querySelector('.xc-sideview__altitude-mark')?.textContent).toBe('500m')
    expect(el.querySelector('.xc-sideview__eye')).not.toBeNull()
    expect(el.querySelector('.xc-sideview__eye-pupil')).not.toBeNull()
  })
})
