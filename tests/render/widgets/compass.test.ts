import { describe, expect, it } from 'vitest'
import { drawCompass } from '../../../src/render/widgets/compass'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

/** Même convention que numeric.test.ts : les valeurs sont fournies sous leur forme
 * source exacte — une chaîne entre guillemets pour `rotation`/`windStyle`, qui sont des
 * chaînes nues sur WCompass, pas l'objet `{value, showCompass}` des trois cartes
 * (rotation.ts). */
function widget(params: Record<string, string>, bounds: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 10000, y2: 10000 }): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WCompass',
    shortName: 'WCompass', ...bounds,
    border: false, background: 100, theme: ''
  }
}

// Correction en vol (rendu-en-vol.md § 6bis et § 6) : « Boussole et vent » a deux
// visages (aiguille de cap OU étoile de vent multicolore, selon windStyle), et
// l'aiguille de cap peut être accompagnée d'une troisième zone noire indépendante
// (showBearing). Le corpus (Exemples/*.xcfg) montre que showHeading/showBearing/
// showBackground/windStyle sont TOUJOURS présents, avec une valeur explicite — d'où des
// tests qui les passent explicitement plutôt que de compter sur un défaut, sauf pour
// vérifier ce défaut lui-même.
describe('WCompass', () => {
  describe('cadran d’arrière-plan (showBackground)', () => {
    it('dessine la couronne, onze graduations et le N par défaut (absent équivaut à true)', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelector('.xc-compass__ring')).not.toBeNull()
      expect(el.querySelectorAll('.xc-compass__tick').length).toBe(11)
      expect(el.querySelector('.xc-compass__n')?.textContent).toBe('N')
    })

    it('trois graduations cardinales, plus longues que les huit autres', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelectorAll('.xc-compass__tick--cardinal').length).toBe(3)
    })

    it('n’affiche rien du cadran quand showBackground vaut false', () => {
      const el = drawCompass(widget({ showBackground: 'false' }), settings, language)
      expect(el.querySelector('.xc-compass__ring')).toBeNull()
      expect(el.querySelector('.xc-compass__n')).toBeNull()
    })
  })

  describe('aiguille de cap (showHeading)', () => {
    it('absent défaille à false — jamais true sur les 15 occurrences du corpus : pas d’aiguille par défaut', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelector('.xc-compass__needle')).toBeNull()
    })

    it('dessine l’aiguille en deux facettes, pas trois, quand showHeading vaut true', () => {
      const el = drawCompass(widget({ showHeading: 'true' }), settings, language)
      const needle = el.querySelector('.xc-compass__needle')
      expect(needle).not.toBeNull()
      expect(needle?.querySelectorAll('.xc-compass__needle-facet').length).toBe(2)
    })

    it('grand format : aiguille grise (pas de modificateur --small)', () => {
      const el = drawCompass(widget({ showHeading: 'true' }, { x1: 0, y1: 0, x2: 10000, y2: 10000 }), settings, language)
      expect(el.querySelector('.xc-compass__needle--small')).toBeNull()
    })

    it('petit format (coin de page chargée) : aiguille rouge, modificateur --small', () => {
      // Dimensions mesurées sur ecran-landscape3-17widgets.png (X1:8542,Y1:2414,X2:10000,Y2:5172).
      const el = drawCompass(widget({ showHeading: 'true' }, { x1: 8542, y1: 2414, x2: 10000, y2: 5172 }), settings, language)
      expect(el.querySelector('.xc-compass__needle--small')).not.toBeNull()
    })

    it('rotation à "HEADING" (chaîne nue) fait tourner le cadran, pas l’aiguille', () => {
      const el = drawCompass(widget({ showHeading: 'true', rotation: '"HEADING"' }), settings, language)
      const dial = el.querySelector('.xc-compass__dial') as SVGGElement
      const needle = el.querySelector('.xc-compass__needle') as SVGGElement
      expect(dial.getAttribute('transform')).toBeTruthy()
      expect(needle.getAttribute('transform')).toBe('rotate(0 100 100)')
    })

    it('rotation à "NORTH" (ou absente) fait tourner l’aiguille, pas le cadran', () => {
      const el = drawCompass(widget({ showHeading: 'true', rotation: '"NORTH"' }), settings, language)
      const dial = el.querySelector('.xc-compass__dial') as SVGGElement
      const needle = el.querySelector('.xc-compass__needle') as SVGGElement
      expect(dial.hasAttribute('transform')).toBe(false)
      expect(needle.getAttribute('transform')).not.toBe('rotate(0 100 100)')
    })
  })

  describe('aiguille de trajectoire/vent (showBearing) — troisième zone, noire', () => {
    it('absente par défaut', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelector('.xc-compass__bearing')).toBeNull()
    })

    it('dessine une zone noire distincte, indépendante de l’aiguille de cap', () => {
      const el = drawCompass(widget({ showHeading: 'true', showBearing: 'true' }), settings, language)
      const heading = el.querySelector('.xc-compass__needle') as SVGGElement
      const bearing = el.querySelector('.xc-compass__bearing') as SVGGElement
      expect(bearing).not.toBeNull()
      // « elles ne bougent pas ensemble » (rendu-en-vol.md § 6) : deux angles distincts.
      expect(bearing.getAttribute('transform')).not.toBe(heading.getAttribute('transform'))
    })

    it('peut s’afficher seule, sans aiguille de cap (landscape[0] du corpus : showHeading false, showBearing true)', () => {
      const el = drawCompass(widget({ showHeading: 'false', showBearing: 'true' }), settings, language)
      expect(el.querySelector('.xc-compass__needle')).toBeNull()
      expect(el.querySelector('.xc-compass__bearing')).not.toBeNull()
    })
  })

  describe('étoile de vent multicolore (windStyle)', () => {
    it('absent de windStyle (ou "NONE") : pas d’étoile', () => {
      expect(drawCompass(widget({}), settings, language).querySelector('.xc-compass__wind-star')).toBeNull()
      expect(drawCompass(widget({ windStyle: '"NONE"' }), settings, language).querySelector('.xc-compass__wind-star')).toBeNull()
    })

    it('windStyle "ARROW" (landscape[3] de 2026-08-20_backup-00.xcfg) dessine l’étoile, deux branches bicolores', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      const star = el.querySelector('.xc-compass__wind-star')
      expect(star).not.toBeNull()
      expect(star?.querySelectorAll('.xc-compass__wind-branch').length).toBe(2)
      expect(star?.querySelectorAll('.xc-compass__wind-facet').length).toBe(4)
    })

    it('l’étoile remplace les aiguilles de cap/trajectoire, même si showHeading/showBearing valent true', () => {
      // vol-landscape3-en-vol.png : la boussole en windStyle ARROW ne montre QUE
      // l'étoile, aucune aiguille — cohérent avec landscape[3] du corpus
      // (showHeading:false, showBearing:false), mais vérifié aussi si les deux étaient
      // vraies, pour prouver que windStyle est prioritaire.
      const el = drawCompass(widget({ windStyle: '"ARROW"', showHeading: 'true', showBearing: 'true' }), settings, language)
      expect(el.querySelector('.xc-compass__wind-star')).not.toBeNull()
      expect(el.querySelector('.xc-compass__needle')).toBeNull()
      expect(el.querySelector('.xc-compass__bearing')).toBeNull()
    })

    it('ARC et SOCK rendent la même étoile qu’ARROW — non tranché faute de capture propre à chacun', () => {
      const arrow = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      const arc = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const sock = drawCompass(widget({ windStyle: '"SOCK"' }), settings, language)
      expect(arc.innerHTML).toBe(arrow.innerHTML)
      expect(sock.innerHTML).toBe(arrow.innerHTML)
    })

    it('le cadran reste indépendant de windStyle (showBackground gouverne seul)', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"', showBackground: 'false' }), settings, language)
      expect(el.querySelector('.xc-compass__wind-star')).not.toBeNull()
      expect(el.querySelector('.xc-compass__ring')).toBeNull()
    })
  })

  it('ne porte jamais de titre — aucune occurrence du corpus ne pose `_title` sur ce type', () => {
    const el = drawCompass(widget({ _title: 'true', titletext: '"Boussole et vent"' }), settings, language)
    expect(el.textContent).not.toContain('Boussole et vent')
  })
})
