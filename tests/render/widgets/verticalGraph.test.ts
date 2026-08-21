import { describe, expect, it } from 'vitest'
import { drawVerticalGraph } from '../../../src/render/widgets/verticalGraph'
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
    className: 'org.xcontest.XCTrack.widget.w.WVerticalGraph',
    shortName: 'WVerticalGraph', x1: 2292, y1: 7586, x2: 8125, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

describe('WVerticalGraph', () => {
  it('dessine la flèche à double pointe, sa valeur, et la trace pointillée', () => {
    const el = drawVerticalGraph(widget({}), settings, language)
    expect(el.querySelector('.xc-vscale__arrow')).not.toBeNull()
    expect(el.querySelectorAll('.xc-vscale__arrowhead')).toHaveLength(2)
    const trace = el.querySelector('.xc-vscale__trace')
    expect(trace).not.toBeNull()
    // Un chapelet de points, dessiné en tirets de longueur nulle à bout rond : dans une
    // scène étirée, un `<circle>` devient une ellipse — c'est ce qui aplatissait la
    // trace (voir le commentaire de tête de verticalGraph.ts).
    expect((trace as SVGPathElement).style.strokeDasharray).toMatch(/^0\.01 /)
    expect((trace as SVGPathElement).getAttribute('d')?.split(' L ').length).toBeGreaterThan(10)
  })

  it('affiche `vertical_step` comme valeur d’échelle, "50" par défaut (mesuré sur la capture)', () => {
    const withDefault = drawVerticalGraph(widget({}), settings, language)
    const withStep = drawVerticalGraph(widget({ vertical_step: '25' }), settings, language)
    expect(withDefault.querySelector('.xc-vscale__label')?.textContent).toBe('50')
    expect(withStep.querySelector('.xc-vscale__label')?.textContent).toBe('25')
  })

  /**
   * Écart 2.3 de la revue des 75 visuels : l'orange `#ff9800` était la valeur écrite dans
   * le fichier du PROPRIÉTAIRE, prise pour un défaut. Le défaut du relevé des 75 gadgets
   * est `-8355585`, soit `#8080ff`, et c'est ce que la capture montre (4 605 px).
   */
  it('prend la couleur du RELEVÉ quand la clé est absente, pas une constante en dur', () => {
    const withDefault = drawVerticalGraph(widget({}), settings, language)
    const withColor = drawVerticalGraph(widget({ dot_color: '-16776961' }), settings, language)
    expect(withDefault.querySelector('.xc-vscale__trace')?.getAttribute('stroke')).toBe('#8080ff')
    expect(withColor.querySelector('.xc-vscale__trace')?.getAttribute('stroke')).toBe('#0000ff')
  })

  /**
   * 17 px d'épaisseur mesurés pour `dot_size: 15`, dans le repère de rendu — d'où
   * `non-scaling-stroke` : une épaisseur en unités de `viewBox` s'étirerait avec la scène.
   */
  it('`dot_size` donne l’épaisseur de la trace, 17 px pour la valeur du relevé', () => {
    const parDefaut = drawVerticalGraph(widget({}), settings, language)
    expect((parDefaut.querySelector('.xc-vscale__trace') as SVGPathElement).style.strokeWidth).toBe('17.00px')
    const gros = drawVerticalGraph(widget({ dot_size: '30' }), settings, language)
    expect((gros.querySelector('.xc-vscale__trace') as SVGPathElement).style.strokeWidth).toBe('34.00px')
  })

  it('la hampe de la flèche fait 2 px du repère de rendu, comme sur l’appareil', () => {
    const el = drawVerticalGraph(widget({}), settings, language)
    expect((el.querySelector('.xc-vscale__arrow line') as SVGLineElement).style.strokeWidth).toBe('2px')
  })
})
