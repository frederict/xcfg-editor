import { describe, expect, it } from 'vitest'
import { drawStatusLine } from '../../../src/render/widgets/statusLine'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

/**
 * Mêmes conventions que `numeric.test.ts` : les paramètres sont donnés sous leur forme
 * source, une valeur absente du corpus n'est simplement pas passée — c'est ainsi que le
 * fichier réel se présente (voir le relevé du corpus dans statusLine.ts).
 */
function widget(params: Record<string, string>): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WStatusLine',
    shortName: 'WStatusLine', x1: 6250, y1: 0, x2: 10000, y2: 1034,
    border: false, background: 100, theme: ''
  }
}

/**
 * Jeu de clés relevé sur `landscape[0..4]` du corpus (5 fichiers, 20 occurrences
 * identiques) : tous les indicateurs actifs sauf l'heure.
 */
const LANDSCAPE_KEYS = {
  showGps: 'true', showSensors: 'true', showLive: 'true', showLiveLabel: 'true',
  showBatteryIcon: 'true', showBatteryPercent: 'true', showTime: 'false'
}

/**
 * Jeu de clés relevé sur `portrait[0]` du corpus : seules `showTime` et `showLiveLabel`
 * sont présentes, `showLive` en est absent. Cas non confirmé par une capture (voir
 * rendu-observe.md) — le comportement testé ici est notre lecture la plus littérale des
 * clés, pas une vérité établie à l'écran.
 */
const PORTRAIT_KEYS = { showTime: 'true', showLiveLabel: 'true' }

describe('barre d’état — WStatusLine', () => {
  it('n’affiche aucun indicateur quand aucune clé show* n’est présente', () => {
    const el = drawStatusLine(widget({}), settings, language)
    expect(el.children).toHaveLength(0)
  })

  it('affiche la réception GPS seulement quand showGps vaut true', () => {
    expect(drawStatusLine(widget({ showGps: 'true' }), settings, language).querySelector('.xc-status__gps')).not.toBeNull()
    expect(drawStatusLine(widget({}), settings, language).querySelector('.xc-status__gps')).toBeNull()
    expect(drawStatusLine(widget({ showGps: 'false' }), settings, language).querySelector('.xc-status__gps')).toBeNull()
  })

  it('affiche l’état des capteurs seulement quand showSensors vaut true', () => {
    expect(drawStatusLine(widget({ showSensors: 'true' }), settings, language).querySelector('.xc-status__sensors')).not.toBeNull()
    expect(drawStatusLine(widget({}), settings, language).querySelector('.xc-status__sensors')).toBeNull()
  })

  describe('indicateur LIVE', () => {
    it('n’affiche rien quand showLive est absent, même si showLiveLabel vaut true', () => {
      // Cas réel du corpus : les pages portrait ne portent que showLiveLabel/showTime
      // (voir PORTRAIT_KEYS). showLive absent est traité comme false, à l'image de
      // _title/_unit sur les widgets numériques (numeric.ts).
      const el = drawStatusLine(widget(PORTRAIT_KEYS), settings, language)
      expect(el.querySelector('.xc-status__live')).toBeNull()
    })

    it('affiche le point et le texte LIVE quand showLive et showLiveLabel valent true', () => {
      const el = drawStatusLine(widget({ showLive: 'true', showLiveLabel: 'true' }), settings, language)
      const live = el.querySelector('.xc-status__live')
      expect(live).not.toBeNull()
      expect(live?.querySelector('.xc-status__dot')).not.toBeNull()
      expect(live?.querySelector('.xc-status__live-text')?.textContent).toBe('LIVE')
    })

    it('affiche le point seul quand showLiveLabel vaut false', () => {
      const el = drawStatusLine(widget({ showLive: 'true', showLiveLabel: 'false' }), settings, language)
      const live = el.querySelector('.xc-status__live')
      expect(live?.querySelector('.xc-status__dot')).not.toBeNull()
      expect(live?.querySelector('.xc-status__live-text')).toBeNull()
    })
  })

  describe('batterie', () => {
    it('affiche le pictogramme seulement quand showBatteryIcon vaut true', () => {
      const withIcon = drawStatusLine(widget({ showBatteryIcon: 'true' }), settings, language)
      expect(withIcon.querySelector('.xc-status__battery svg')).not.toBeNull()
      const without = drawStatusLine(widget({ showBatteryPercent: 'true' }), settings, language)
      expect(without.querySelector('.xc-status__battery svg')).toBeNull()
    })

    it('affiche le pourcentage seulement quand showBatteryPercent vaut true', () => {
      const withPercent = drawStatusLine(widget({ showBatteryPercent: 'true' }), settings, language)
      expect(withPercent.querySelector('.xc-status__percent')?.textContent).toContain('%')
      const without = drawStatusLine(widget({ showBatteryIcon: 'true' }), settings, language)
      expect(without.querySelector('.xc-status__percent')).toBeNull()
    })

    it('n’affiche pas le groupe batterie quand ni l’icône ni le pourcentage ne sont demandés', () => {
      const el = drawStatusLine(widget({}), settings, language)
      expect(el.querySelector('.xc-status__battery')).toBeNull()
    })
  })

  it('affiche l’heure seulement quand showTime vaut true', () => {
    expect(drawStatusLine(widget({ showTime: 'true' }), settings, language).querySelector('.xc-status__time')).not.toBeNull()
    expect(drawStatusLine(widget({ showTime: 'false' }), settings, language).querySelector('.xc-status__time')).toBeNull()
  })

  it('respecte l’ordre observé sur la capture : GPS, LIVE, capteurs, batterie', () => {
    // 2026-08-21_barre-etat-reelle.png, confirmé par ecran-landscape3-17widgets.png :
    // réception GPS, point + LIVE, parapente (capteurs), batterie + pourcentage, de
    // gauche à droite.
    const el = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
    const groups = [...el.children].map(child => child.className)
    expect(groups).toEqual([
      'xc-status__icon xc-status__gps',
      'xc-status__live',
      'xc-status__icon xc-status__sensors',
      'xc-status__battery'
    ])
  })

  it('reproduit le jeu de clés réel de landscape[0..4] sans lever d’erreur et sans afficher l’heure', () => {
    const el = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
    expect(el.querySelector('.xc-status__gps')).not.toBeNull()
    expect(el.querySelector('.xc-status__live')).not.toBeNull()
    expect(el.querySelector('.xc-status__sensors')).not.toBeNull()
    expect(el.querySelector('.xc-status__battery')).not.toBeNull()
    expect(el.querySelector('.xc-status__time')).toBeNull()
  })

  /**
   * Refonte sur `docs/reference/captures-air3/2026-08-21_barre-etat-reelle.png` — voir le
   * commentaire de tête de statusLine.ts. Ces tests portent sur ce que le DOM peut
   * montrer ; les tailles et le centrage, purement CSS, sont vérifiés dans
   * `tests/render/style.test.ts`.
   */
  describe('formes relevées sur la capture du 2026-08-21', () => {
    it('la batterie est un corps sombre à cellules vertes, pas un contour à demi rempli', () => {
      const svg = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
        .querySelector('.xc-status__battery-icon svg')!
      // Couleurs relevées au pixel sur la capture.
      expect(svg.innerHTML).toContain('#231f20')
      expect(svg.innerHTML).toContain('#8dc63f')
      // Cellules distinctes, et pas toutes allumées : le pourcentage est un exemple,
      // pas l'état de l'instant.
      const cells = svg.querySelectorAll('rect[fill="#8dc63f"]')
      expect(cells.length).toBeGreaterThan(1)
      expect(cells.length).toBeLessThan(5)
    })

    it('n’ajoute pas l’éclair de charge : c’est un état de l’appareil, pas du widget', () => {
      const svg = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
        .querySelector('.xc-status__battery-icon svg')!
      // L'éclair de la capture est blanc ; aucune clé du fichier ne le commanderait.
      expect(svg.innerHTML).not.toContain('#ffffff')
      expect(svg.innerHTML).not.toContain('#fff')
    })

    it('le pourcentage affiché est celui qui commande les cellules', () => {
      const el = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
      const texte = el.querySelector('.xc-status__percent')!.textContent!
      expect(texte).toMatch(/^\d{1,3}%$/)
      const cells = el.querySelectorAll('.xc-status__battery-icon rect[fill="#8dc63f"]').length
      expect(cells).toBe(Math.round((Number(texte.replace('%', '')) / 100) * 5))
    })

    it('le pictogramme des capteurs n’est plus barré de rouge', () => {
      // Le trait rouge de la capture du 2026-08-20 signale des capteurs indisponibles —
      // un état d'exécution, comme le trait qui barrait LIVE.
      const svg = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
        .querySelector('.xc-status__sensors svg')!
      expect(svg.innerHTML.toLowerCase()).not.toContain('#ff0000')
      expect(svg.querySelector('line')).toBeNull()
    })

    it('le pictogramme des capteurs est un parapente : voile en arc au-dessus du corps', () => {
      const svg = drawStatusLine(widget(LANDSCAPE_KEYS), settings, language)
        .querySelector('.xc-status__sensors svg')!
      // Un seul tracé courbe (la voile) parmi des segments droits (aile et suspentes) —
      // la structure relevée sur la capture, où la voile occupe la moitié haute.
      const paths = [...svg.querySelectorAll('path')].map(p => p.getAttribute('d') ?? '')
      expect(paths.filter(d => d.includes('C')).length).toBe(1)
      expect(paths.filter(d => d.includes('L')).length).toBeGreaterThan(4)
      // Nettement plus haut que large, contrairement aux autres pictogrammes.
      const [, , w, h] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
      expect(h).toBeGreaterThan(w!)
    })
  })
})
