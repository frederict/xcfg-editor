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

/** Rayon médian de la couronne dans le repère du `viewBox` (compass.ts, `RING_R`). */
const RING_R = 98
const CENTER = 100

/** Distance au centre des sommets d'un polygone SVG, en fraction de `RING_R`. */
function radii(polygon: Element): number[] {
  return (polygon.getAttribute('points') ?? '').trim().split(/\s+/).map((point) => {
    const [x, y] = point.split(',').map(Number)
    return Math.hypot((x ?? 0) - CENTER, (y ?? 0) - CENTER) / RING_R
  })
}

// Correction de l'écart 1.5 (planche-widgets-air3.md § 5), établie sur sept captures
// recoupées avec la configuration de leur widget — voir le tableau du commentaire de
// tête de compass.ts. Trois faits mesurés gouvernent ces tests :
//   1. l'aiguille est TOUJOURS dessinée, rouge par défaut, grise sous showBearing ;
//   2. l'indicateur de vent est un élément séparé, superposé, jamais un remplacement ;
//   3. windStyle ARC et ARROW ne se dessinent pas pareil.
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

    it('la couronne occupe la largeur du widget : rayon médian à 0,98 du demi-côté', () => {
      // Mesuré sur 2026-08-21_planche-sol-8-* : cadran de 426 px de diamètre extérieur
      // dans une boîte de 427 px de large, couronne épaisse de 9 px, soit un rayon médian
      // de 208,5 px pour un demi-côté de 213,5. L'ancien rendu la posait à 0,871.
      const r = Number(drawCompass(widget({}), settings, language).querySelector('.xc-compass__ring')?.getAttribute('r'))
      expect(r / CENTER).toBeCloseTo(0.98, 2)
    })

    it('le N est posé à 0,78 R du centre, pas à 0,54 R', () => {
      // 163 px du centre pour un rayon médian de 208,5 sur la capture — l'ancien rendu
      // le posait à 0,54 R (mesuré sur le rendu d'alors), soit bien trop près du centre.
      const n = drawCompass(widget({}), settings, language).querySelector('.xc-compass__n')
      const distance = (CENTER - Number(n?.getAttribute('y'))) / RING_R
      expect(distance).toBeCloseTo(0.78, 2)
    })
  })

  describe('l’aiguille est toujours là (écart 1.5)', () => {
    it('la configuration par défaut de la planche porte une aiguille, pas un disque vide', () => {
      // Le cœur de l'écart : 7020 pixels rouges sur l'appareil, 0 dans l'éditeur, parce
      // que l'aiguille était conditionnée à showHeading/showBearing — faux tous les deux
      // par défaut (§ 3 de la planche).
      const el = drawCompass(widget({}), settings, language)
      const needle = el.querySelector('.xc-compass__needle')
      expect(needle).not.toBeNull()
      expect(needle?.querySelectorAll('.xc-compass__needle-facet').length).toBe(2)
    })

    it('même sans cadran, l’aiguille reste dessinée', () => {
      const el = drawCompass(widget({ showBackground: 'false' }), settings, language)
      expect(el.querySelector('.xc-compass__needle')).not.toBeNull()
    })

    it('rouge par défaut (planche-sol-8, ecran-landscape3), grise sous showBearing (polices-reference)', () => {
      const parDefaut = drawCompass(widget({}), settings, language)
      const bearing = drawCompass(widget({ showBearing: 'true' }), settings, language)
      expect(parDefaut.querySelector('.xc-compass__needle--nav')).not.toBeNull()
      expect(parDefaut.querySelector('.xc-compass__needle--track')).toBeNull()
      expect(bearing.querySelector('.xc-compass__needle--track')).not.toBeNull()
      expect(bearing.querySelector('.xc-compass__needle--nav')).toBeNull()
    })

    it('la teinte ne dépend PLUS de la taille du widget', () => {
      // L'ancienne lecture faisait passer l'aiguille au rouge en dessous de 0,35 de côté
      // normalisé. Les deux captures qui la fondaient ont la MÊME configuration
      // (showBearing false) à deux tailles : c'est showBearing qui tranche, pas la taille.
      const petit = drawCompass(widget({}), { ...settings }, language)
      const grand = drawCompass(widget({}, { x1: 8542, y1: 2414, x2: 10000, y2: 5172 }), settings, language)
      expect(petit.querySelector('.xc-compass__needle')?.className).toBe(grand.querySelector('.xc-compass__needle')?.className)
      expect(petit.querySelector('.xc-compass__needle--small')).toBeNull()
    })

    it('géométrie relevée : pointe à 0,92 R, barbes à 0,82 R, creux à 0,24 R', () => {
      const el = drawCompass(widget({}), settings, language)
      const facets = el.querySelectorAll('.xc-compass__needle-facet')
      // Chaque facette est le triangle pointe / barbe / creux : trois rayons, dont les
      // deux extrêmes sont la pointe et le creux.
      for (const facet of Array.from(facets)) {
        const r = radii(facet).sort((a, b) => a - b)
        expect(r[0]).toBeCloseTo(0.24, 2)
        expect(r[1]).toBeCloseTo(0.82, 2)
        expect(r[2]).toBeCloseTo(0.92, 2)
      }
    })

    it('les deux facettes se partagent l’axe : une claire, une sombre, jamais deux fois la même', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelectorAll('.xc-compass__needle-facet--dark').length).toBe(1)
      expect(el.querySelectorAll('.xc-compass__needle-facet--light').length).toBe(1)
    })
  })

  describe('rotation : le cadran suit le cap, l’aiguille garde le sien', () => {
    it('rotation "HEADING" (la valeur par défaut) fait tourner le cadran — N compris', () => {
      const el = drawCompass(widget({ rotation: '"HEADING"' }), settings, language)
      const dial = el.querySelector('.xc-compass__dial') as SVGGElement
      expect(dial.getAttribute('transform')).toBe('rotate(-35 100 100)')
      // Le N est DANS le groupe qui tourne : c'est le second point de l'écart 1.5.
      expect(dial.querySelector('.xc-compass__n')).not.toBeNull()
    })

    it('rotation "NORTH" laisse le cadran fixe', () => {
      const el = drawCompass(widget({ rotation: '"NORTH"' }), settings, language)
      expect((el.querySelector('.xc-compass__dial') as SVGGElement).hasAttribute('transform')).toBe(false)
    })

    it('l’aiguille ne suit pas la rotation du cadran — les captures du rejeu les montrent indépendants', () => {
      const heading = drawCompass(widget({ rotation: '"HEADING"' }), settings, language)
      const north = drawCompass(widget({ rotation: '"NORTH"' }), settings, language)
      const angle = (el: HTMLElement): string | null =>
        (el.querySelector('.xc-compass__needle') as SVGGElement).getAttribute('transform')
      expect(angle(heading)).toBe(angle(north))
      expect(angle(heading)).toBe('rotate(213 100 100)')
    })
  })

  describe('indicateur de vent (windStyle) — superposé, pas substitué', () => {
    it('absent de windStyle (ou "NONE") : aucun indicateur', () => {
      expect(drawCompass(widget({}), settings, language).querySelector('.xc-compass__wind')).toBeNull()
      expect(drawCompass(widget({ windStyle: '"NONE"' }), settings, language).querySelector('.xc-compass__wind')).toBeNull()
    })

    it('l’indicateur s’AJOUTE à l’aiguille, il ne la remplace pas', () => {
      // vol-landscape3-en-vol.png : aiguille rouge ET branche jaune-olive sur le même
      // disque, la même page au sol ne montrant que le rouge. L'ancienne lecture y
      // voyait une « étoile de vent » à deux branches qui effaçait l'aiguille.
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      expect(el.querySelector('.xc-compass__needle')).not.toBeNull()
      expect(el.querySelector('.xc-compass__wind')).not.toBeNull()
    })

    it('"ARROW" : une branche bicolore jaune-olive', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      expect(el.querySelector('.xc-compass__wind--arrow')).not.toBeNull()
      expect(el.querySelectorAll('.xc-compass__wind-facet').length).toBe(2)
    })

    it('"ARC" : une zone noire unie, sans facettes — ARC et ARROW ne se dessinent PAS pareil', () => {
      // Ce point était marqué NON TRANCHÉ. vol-numeriques-boussole-variocolumn.png
      // (windStyle ARC, vent 22 km/h) porte 11 971 px de #000000 que la même page au sol
      // n'a pas ; vol-landscape3-en-vol.png (ARROW) porte du jaune-olive et pas de noir.
      const arc = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const arrow = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      expect(arc.querySelector('.xc-compass__wind--arc')).not.toBeNull()
      expect(arc.querySelectorAll('.xc-compass__wind-facet').length).toBe(0)
      expect(arc.querySelector('.xc-compass__wind-shape')).not.toBeNull()
      expect(arc.innerHTML).not.toBe(arrow.innerHTML)
    })

    it('"SOCK" reste NON TRANCHÉ : rendu comme ARROW, faute de capture et de fichier', () => {
      const sock = drawCompass(widget({ windStyle: '"SOCK"' }), settings, language)
      const arrow = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      expect(sock.innerHTML).toBe(arrow.innerHTML)
    })

    it('le vent tourne pour son propre compte, à un angle distinct de l’aiguille', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      const needle = (el.querySelector('.xc-compass__needle') as SVGGElement).getAttribute('transform')
      const wind = (el.querySelector('.xc-compass__wind') as SVGGElement).getAttribute('transform')
      expect(wind).not.toBe(needle)
    })

    it('le cadran reste indépendant de windStyle (showBackground gouverne seul)', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"', showBackground: 'false' }), settings, language)
      expect(el.querySelector('.xc-compass__wind')).not.toBeNull()
      expect(el.querySelector('.xc-compass__ring')).toBeNull()
    })
  })

  it('showHeading ne pilote plus rien — NON TRANCHÉ, faux sur les 15 occurrences du corpus', () => {
    const sans = drawCompass(widget({ showHeading: 'false' }), settings, language)
    const avec = drawCompass(widget({ showHeading: 'true' }), settings, language)
    expect(avec.innerHTML).toBe(sans.innerHTML)
  })

  it('ne porte jamais de titre — aucune occurrence du corpus ne pose `_title` sur ce type', () => {
    const el = drawCompass(widget({ _title: 'true', titletext: '"Boussole et vent"' }), settings, language)
    expect(el.textContent).not.toContain('Boussole et vent')
  })
})
