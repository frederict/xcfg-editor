import { describe, expect, it } from 'vitest'
import { BARS_PER_HALF, STEP_MS, barCount, drawVarioColumn, varioTone } from '../../../src/render/widgets/varioColumn'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

function widget(params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [`"${k}"`, { kind: 'literal' as const, raw: v }])
    },
    className: 'org.xcontest.XCTrack.widget.w.WVarioColumn',
    shortName: 'WVarioColumn', x1: 0, y1: 0, x2: 833, y2: 10000,
    border: true, background: 100, theme: ''
  }
}

/** Le `viewBox` du dessin (varioColumn.ts) : 100 × 400, mi-hauteur à 200. */
const VIEW_H = 400
const MIDDLE = VIEW_H / 2

function bars(el: HTMLElement): { y: number; height: number; accent: boolean }[] {
  return Array.from(el.querySelectorAll('.xc-variocol__bar')).map((bar) => ({
    y: Number(bar.getAttribute('y')),
    height: Number(bar.getAttribute('height')),
    accent: bar.classList.contains('xc-variocol__bar--accent')
  }))
}

/**
 * Écart 1.7 de `docs/reference/planche-widgets-air3.md` § 5 : le rendu précédent
 * remplissait toute la colonne d'une échelle de barres roses fixe. L'appareil dessine une
 * jauge partant de la mi-hauteur exacte, vide au repos.
 */
describe('WVarioColumn — une jauge, pas une échelle', () => {
  describe('échelle : 0,2 m/s la barre, 20 barres par demi-colonne', () => {
    it('les deux mesures appariées de l’appareil donnent la même graduation', () => {
      // vol-numeriques-boussole-variocolumn.png : « +3,5 m/s » affiché, 17 barres.
      // vol-page3.png : « -1,0 m/s » affiché, 5 barres. 3,5/17 ≈ 1,0/5 = 0,2.
      expect(STEP_MS).toBe(0.2)
      expect(barCount(3.5)).toBe(18)
      expect(barCount(3.4)).toBe(17)
      expect(barCount(-1)).toBe(5)
    })

    it('l’échelle sature à ±4 m/s — le pas mesuré vaut 2,5 % de la hauteur, aux deux tailles', () => {
      expect(BARS_PER_HALF).toBe(20)
      expect(barCount(4)).toBe(20)
      expect(barCount(9)).toBe(20)
    })
  })

  describe('convention de signe : haut = montée (tranchée)', () => {
    it('les barres d’une montée sont toutes AU-DESSUS de la mi-hauteur', () => {
      const el = drawVarioColumn(widget(), settings, 'fr')
      const dessinees = bars(el)
      expect(dessinees.length).toBeGreaterThan(0)
      for (const bar of dessinees) expect(bar.y + bar.height).toBeLessThanOrEqual(MIDDLE + 0.01)
    })

    it('la pile part de la mi-hauteur EXACTE, sans intervalle', () => {
      const dessinees = bars(drawVarioColumn(widget(), settings, 'fr'))
      const plusBasse = dessinees.reduce((a, b) => (a.y > b.y ? a : b))
      expect(plusBasse.y + plusBasse.height).toBeCloseTo(MIDDLE, 5)
    })

    it('les barres se touchent, sans trou ni recouvrement', () => {
      const dessinees = bars(drawVarioColumn(widget(), settings, 'fr')).sort((a, b) => a.y - b.y)
      for (let i = 1; i < dessinees.length; i++) {
        expect(dessinees[i]!.y).toBeCloseTo(dessinees[i - 1]!.y + dessinees[i - 1]!.height, 5)
      }
    })
  })

  describe('quatre familles de teintes, par amplitude — la descente n’en a qu’une', () => {
    it('toute descente est bleue', () => {
      expect(varioTone(-0.2)).toBe('sink')
      expect(varioTone(-3.9)).toBe('sink')
    })

    it('montée : vert en dessous de 2 m/s, jaune de 2 à 3, rose au-delà', () => {
      // Seuils = milieux des recouvrements observés sur les 40 captures du rejeu : vert
      // vu de 2 à 10 barres, jaune de 10 à 15, rose de 15 à 20.
      expect(varioTone(0.4)).toBe('climb-weak')
      expect(varioTone(1.9)).toBe('climb-weak')
      expect(varioTone(2.0)).toBe('climb-medium')
      expect(varioTone(2.9)).toBe('climb-medium')
      expect(varioTone(3.0)).toBe('climb-strong')
      expect(varioTone(4.0)).toBe('climb-strong')
    })

    it('la famille est portée par un groupe, pas par chaque barre', () => {
      const el = drawVarioColumn(widget(), settings, 'fr')
      const gauge = el.querySelector('.xc-variocol__gauge')
      expect(gauge).not.toBeNull()
      // La valeur d'exemple (+2,1 m/s, alignée sur WVerticalSpeed) tombe en jaune.
      expect(gauge?.classList.contains('xc-variocol__gauge--climb-medium')).toBe(true)
    })
  })

  it('une barre sur cinq est accentuée — une graduation majeure tous les 1,0 m/s', () => {
    const dessinees = bars(drawVarioColumn(widget(), settings, 'fr')).sort((a, b) => b.y - a.y)
    // `dessinees[0]` est la plus proche du milieu : c'est la barre n° 1.
    dessinees.forEach((bar, index) => {
      expect(bar.accent).toBe((index + 1) % 5 === 0)
    })
  })

  it('rien du tout quand le vario est nul — la colonne reste blanche, comme au sol', () => {
    // Vérifié sur 2026-08-21_planche-sol-8-* : dans la boîte du widget, seuls les deux
    // pixels du cadre. Ni barre, ni filet de mi-hauteur.
    expect(barCount(0)).toBe(0)
    expect(barCount(0.05)).toBe(0)
  })

  it('la clé `avg` n’a aucun effet visuel connu — elle vaut 2000 partout et le type n’a pas de titre', () => {
    const avec = drawVarioColumn(widget({ avg: '2000' }), settings, 'fr')
    const sans = drawVarioColumn(widget(), settings, 'fr')
    expect(avec.innerHTML).toBe(sans.innerHTML)
  })
})
