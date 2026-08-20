import { describe, expect, it } from 'vitest'
import { drawVarioColumn } from '../../../src/render/widgets/varioColumn'
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
    className: 'org.xcontest.XCTrack.widget.w.WVarioColumn',
    shortName: 'WVarioColumn', x1: 0, y1: 0, x2: 833, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

// Correction en vol (rendu-en-vol.md § 2) : WVarioColumn est un bargraphe — une colonne
// de barres horizontales empilées — pas la flèche à double pointe qu'on lui avait
// donnée. Cette flèche appartient à WVerticalGraph (verticalGraph.test.ts la garde).
describe('WVarioColumn', () => {
  it('dessine une colonne de barres empilées, pas une flèche', () => {
    const el = drawVarioColumn(widget({}), settings, language)
    expect(el.className).toBe('xc-variocol')
    expect(el.querySelector('.xc-vscale__arrow')).toBeNull()
    expect(el.querySelectorAll('.xc-variocol__bar').length).toBeGreaterThan(1)
  })

  it('les barres occupent toute la hauteur du widget (empilées sans recouvrement)', () => {
    const el = drawVarioColumn(widget({}), settings, language)
    const bars = [...el.querySelectorAll('.xc-variocol__bar')] as SVGRectElement[]
    const svg = el.querySelector('.xc-variocol__scene') as SVGSVGElement
    const viewBoxHeight = Number(svg.getAttribute('viewBox')?.split(' ')[3])

    // Empilées bord à bord, dans l'ordre : la première commence à 0, chacune reprend
    // exactement où la précédente s'arrête, la dernière finit à la hauteur totale.
    let expectedY = 0
    for (const bar of bars) {
      expect(Number(bar.getAttribute('y'))).toBeCloseTo(expectedY, 5)
      expectedY += Number(bar.getAttribute('height'))
    }
    expect(expectedY).toBeCloseTo(viewBoxHeight, 5)
  })

  it('une barre sur cinq porte la classe d’accentuation, à intervalle régulier', () => {
    // Motif mesuré sur vol-landscape3-en-vol.png et vol-numeriques-boussole-
    // variocolumn.png (barres 3, 8, 13 sur les 17 visibles — intervalle constant de 5) ;
    // non tranché quant à sa signification exacte, voir le commentaire de tête du module.
    const el = drawVarioColumn(widget({}), settings, language)
    const bars = [...el.querySelectorAll('.xc-variocol__bar')]
    const accentIndices = bars
      .map((bar, i) => (bar.classList.contains('xc-variocol__bar--accent') ? i : -1))
      .filter(i => i !== -1)

    expect(accentIndices.length).toBeGreaterThan(1)
    for (let i = 1; i < accentIndices.length; i++) {
      expect(accentIndices[i]! - accentIndices[i - 1]!).toBe(5)
    }
  })

  it('ne dépend d’aucune clé du fichier — aucune clé d’échelle connue pour ce type', () => {
    // avg (2000 sur le corpus) n'a aucun effet visuel confirmé pour ce type : le rendu
    // ne varie pas avec les clés du widget, contrairement à WVerticalGraph.
    const withoutKeys = drawVarioColumn(widget({}), settings, language)
    const withAvg = drawVarioColumn(widget({ avg: '2000' }), settings, language)
    expect(withAvg.innerHTML).toBe(withoutKeys.innerHTML)
  })

  it('ne dessine jamais la trace pointillée — c’est le propre de WVerticalGraph', () => {
    const el = drawVarioColumn(widget({}), settings, language)
    expect(el.querySelector('.xc-vscale__trace')).toBeNull()
  })
})
