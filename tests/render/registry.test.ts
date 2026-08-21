import { describe, expect, it } from 'vitest'
import { drawWidget, isBlankAtRest, register, registerBlankAtRest } from '../../src/render/registry'
import type { RenderSettings } from '../../src/model/preferences'
import type { Widget } from '../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: true, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 100, titleFont: 'normal', language: { kind: 'system' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

// Langue déjà résolue en chaîne, distincte de `settings` — voir numeric.test.ts.
const language = 'en'

const widget = (shortName: string): Widget => ({
  node: { kind: 'object', entries: [] },
  className: `org.xcontest.XCTrack.widget.w.${shortName}`,
  shortName, x1: 0, y1: 0, x2: 100, y2: 100,
  border: false, background: 100, theme: ''
})

describe('annuaire', () => {
  it('utilise le rendu générique pour un type inconnu', () => {
    const element = drawWidget(widget('WInventeEn2027'), settings, language)
    expect(element.textContent).toContain('WInventeEn2027')
  })

  it('affiche le nom lisible quand il existe', () => {
    // language vaut 'en' ici : libellé officiel anglais, pas la traduction maison
    // française.
    expect(drawWidget(widget('WAltitude'), settings, language).textContent).toContain('GPS Alt')
  })

  it('utilise le dessin enregistré quand il existe', () => {
    register('WEssai', () => {
      const el = document.createElement('div')
      el.textContent = 'dessin sur mesure'
      return el
    })
    expect(drawWidget(widget('WEssai'), settings, language).textContent).toBe('dessin sur mesure')
  })
})

describe('types qui ne peignent aucun contenu au repos', () => {
  it('un type non enregistré peint quelque chose', () => {
    expect(isBlankAtRest('WQuelqueChoseDeNouveau')).toBe(false)
  })

  it('un type enregistré via registerBlankAtRest est reconnu comme tel', () => {
    registerBlankAtRest('WEssaiSansDessin')
    expect(isBlankAtRest('WEssaiSansDessin')).toBe(true)
    // Les autres types ne sont pas affectés.
    expect(isBlankAtRest('WAltitude')).toBe(false)
  })
})
