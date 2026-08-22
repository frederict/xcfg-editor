import { describe, expect, it } from 'vitest'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { drawAltitudeDataGraph } from '../../../src/render/widgets/altitudeDataGraph'
import { drawWidget } from '../../../src/render/registry'
import '../../../src/render/widgets'
import { makeTranslator } from '../../../src/i18n/translate'
import frenchMessages from '../../../src/i18n/messages/fr'

/** Notre prose, axe `ui` — jamais la langue des libellés passée à côté. */
const tr = makeTranslator('fr', frenchMessages)

/**
 * Écart 2.4 de la revue des 75 visuels — `WAltitudeDataGraph` ne dessinait rien du tout.
 * Tout est relevé sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-8-boussole-barres-graphiques-espace-aerien.png`.
 */

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const widget: Widget = {
  node: { kind: 'object', entries: [] },
  className: 'org.xcontest.XCTrack.widget.w.WAltitudeDataGraph',
  shortName: 'WAltitudeDataGraph', x1: 0, y1: 0, x2: 10000, y2: 10000,
  border: false, background: 100, theme: ''
}

describe('WAltitudeDataGraph', () => {
  it('dessine l’axe des zéros et ses quatre repères', () => {
    const el = drawAltitudeDataGraph(widget, settings, 'fr')
    expect(el.querySelector('.xc-altgraph__axis')).not.toBeNull()
    const repères = [...el.querySelectorAll('.xc-altgraph__label')].map(n => n.textContent)
    expect(repères).toEqual(['600 m', '+1,0', '+0,0', '-400 m'])
  })

  /** 148 px sur 323 : l'axe n'est pas à mi-hauteur, et le poser au milieu se verrait. */
  it('pose l’axe à 45,8 % de la hauteur, comme sur la capture', () => {
    const el = drawAltitudeDataGraph(widget, settings, 'fr')
    expect(Number(el.style.getPropertyValue('--xc-altgraph-zero'))).toBeCloseTo(148 / 323, 2)
  })

  it('ne retombe plus sur le repli générique', () => {
    expect(drawWidget(widget, settings, 'fr', tr).className).not.toContain('xc-generic')
  })
})
