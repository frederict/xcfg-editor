import { describe, expect, it } from 'vitest'
import { drawCompTaskSummary } from '../../../src/render/widgets/compTaskSummary'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

function widget(): Widget {
  return {
    node: { kind: 'object', entries: [] },
    className: 'org.xcontest.XCTrack.widget.w.WCompTaskSummary',
    shortName: 'WCompTaskSummary', x1: 0, y1: 6207, x2: 1667, y2: 10000,
    border: false, background: 0, theme: ''
  }
}

// Non observé par une capture, et sans aucune clé propre dans le corpus — voir le
// commentaire de tête de compTaskSummary.ts. Ce test verrouille un comportement voulu,
// pas un relevé visuel.
describe('WCompTaskSummary (non confirmé par une capture)', () => {
  it('dessine quelques lignes de balises avec des distances d’exemple', () => {
    const el = drawCompTaskSummary(widget(), settings, language)
    const legs = el.querySelectorAll('.xc-tasksum__leg')
    expect(legs.length).toBeGreaterThanOrEqual(3)
    for (const leg of Array.from(legs)) {
      expect(leg.querySelector('.xc-tasksum__label')?.textContent).not.toBe('')
      expect(leg.querySelector('.xc-tasksum__distance')?.textContent).toMatch(/km$/)
    }
  })
})
