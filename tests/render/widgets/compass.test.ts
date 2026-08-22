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

/** Les nombres d'un attribut `d`, dans l'ordre, sans trou : les index sont significatifs. */
function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** Angle d'un point du repère, 0° au nord et sens horaire — la convention du cadran. */
function bearing(x: number | undefined, y: number | undefined): number {
  const [px, py] = [x ?? 0, y ?? 0]
  return (Math.atan2(px - CENTER, CENTER - py) * (180 / Math.PI) + 360) % 360
}

// Relevé du 2026-08-21 sur AIR³ 7.2, page de diagnostic importée pendant le rejeu de
// 2026-07-09-XCT-FTE-01.igc — voir le commentaire de tête de compass.ts. Quatre faits
// mesurés gouvernent ces tests :
//   1. il y a TROIS flèches indépendantes, et aucune n'est inconditionnelle ;
//   2. elles ont toutes la même forme, seule la teinte change ;
//   3. ARC est un secteur plein du centre à la couronne, opposé en sens à ARROW ;
//   4. la quatrième valeur de windStyle est WINDSOCK, jamais SOCK.
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
      // Le bord EXTÉRIEUR de la couronne tombe à 0,998 du demi-côté sur les deux tailles
      // mesurées (cadran de 426 px sur la planche, de 720 px en plein écran) ; le rayon
      // médian s'en déduit en retirant la demi-épaisseur. L'ancien rendu la posait à 0,871.
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

  describe('trois flèches indépendantes, aucune inconditionnelle', () => {
    it('la configuration par défaut porte la flèche de navigation, pas un disque vide', () => {
      // `navigation_target` absent équivaut à "OPTIMIZED" : c'est ce qui met du rouge sur
      // la planche au sol (7020 px mesurés), et non une aiguille inconditionnelle.
      const el = drawCompass(widget({}), settings, language)
      const arrow = el.querySelector('.xc-compass__arrow--navigation')
      expect(arrow).not.toBeNull()
      expect(arrow?.querySelectorAll('.xc-compass__arrow-facet').length).toBe(2)
    })

    it('navigation_target "NONE" sans showBearing ni showHeading : cadran entièrement vide', () => {
      // Vérifié sur l'appareil (planche de diagnostic, rangée haute) : la couronne, les
      // graduations et le N, rien d'autre. C'est ce cas qui démonte la lecture
      // « l'aiguille est toujours là ».
      const el = drawCompass(widget({ navigation_target: '"NONE"' }), settings, language)
      expect(el.querySelector('.xc-compass__arrow')).toBeNull()
      expect(el.querySelector('.xc-compass__ring')).not.toBeNull()
    })

    it('showBearing AJOUTE la flèche de trajectoire, il ne recolore pas celle de navigation', () => {
      // Le point exact où la lecture précédente se trompait : elle voyait une seule
      // aiguille qui passait du rouge au gris. L'appareil en dessine DEUX.
      const el = drawCompass(widget({ showBearing: 'true' }), settings, language)
      expect(el.querySelector('.xc-compass__arrow--navigation')).not.toBeNull()
      expect(el.querySelector('.xc-compass__arrow--track')).not.toBeNull()
      expect(el.querySelectorAll('.xc-compass__arrow').length).toBe(2)
    })

    it('showHeading ajoute la flèche de cap — il pilote quelque chose, désormais mesuré', () => {
      const sans = drawCompass(widget({ navigation_target: '"NONE"' }), settings, language)
      const avec = drawCompass(widget({ navigation_target: '"NONE"', showHeading: 'true' }), settings, language)
      expect(sans.querySelector('.xc-compass__arrow--heading')).toBeNull()
      expect(avec.querySelector('.xc-compass__arrow--heading')).not.toBeNull()
    })

    it('les trois peuvent coexister sur le même cadran', () => {
      const el = drawCompass(widget({ showHeading: 'true', showBearing: 'true' }), settings, language)
      expect(el.querySelectorAll('.xc-compass__arrow').length).toBe(3)
    })

    it('la teinte ne dépend pas de la taille du widget', () => {
      const petit = drawCompass(widget({}), settings, language)
      const grand = drawCompass(widget({}, { x1: 8542, y1: 2414, x2: 10000, y2: 5172 }), settings, language)
      expect(petit.querySelector('.xc-compass__arrow')?.className).toBe(grand.querySelector('.xc-compass__arrow')?.className)
    })

    it('géométrie relevée : pointe à 0,945 R, barbes à 0,852 R, creux à 0,291 R', () => {
      const el = drawCompass(widget({}), settings, language)
      const facets = el.querySelectorAll('.xc-compass__arrow-facet')
      // Chaque facette est le triangle pointe / barbe / creux : trois rayons, dont les
      // deux extrêmes sont la pointe et le creux.
      for (const facet of Array.from(facets)) {
        const r = radii(facet).sort((a, b) => a - b)
        expect(r[0]).toBeCloseTo(0.291, 3)
        expect(r[1]).toBeCloseTo(0.852, 3)
        expect(r[2]).toBeCloseTo(0.945, 3)
      }
    })

    it('les barbes sont à ±40° de l’axe arrière', () => {
      const facets = drawCompass(widget({}), settings, language).querySelectorAll('.xc-compass__arrow-facet')
      const angles = Array.from(facets).map((facet) => {
        const points = (facet.getAttribute('points') ?? '').trim().split(/\s+/)
          .map((p) => p.split(',').map(Number) as [number, number])
        const barb = points[1] ?? [0, 0]
        return bearing(barb[0], barb[1])
      })
      // Repère local, pointe en haut : l'axe arrière est à 180°.
      expect(angles.map((a) => Math.round(a - 180)).sort((a, b) => a - b)).toEqual([-40, 40])
    })

    it('les quatre flèches sont exactement la même forme, à la teinte près', () => {
      const nav = drawCompass(widget({}), settings, language)
        .querySelector('.xc-compass__arrow--navigation')
      const vent = drawCompass(widget({ windStyle: '"ARROW"', navigation_target: '"NONE"' }), settings, language)
        .querySelector('.xc-compass__arrow--wind')
      const points = (el: Element | null): string[] =>
        Array.from(el?.querySelectorAll('polygon') ?? []).map((p) => p.getAttribute('points') ?? '')
      expect(points(vent)).toEqual(points(nav))
    })

    it('une facette claire et une sombre, jamais deux fois la même', () => {
      const el = drawCompass(widget({}), settings, language)
      expect(el.querySelectorAll('.xc-compass__arrow-facet--dark').length).toBe(1)
      expect(el.querySelectorAll('.xc-compass__arrow-facet--light').length).toBe(1)
    })
  })

  describe('rotation : le cadran suit le cap, les flèches gardent le leur', () => {
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

    // Rejeu du 2026-08-22 : le défaut d'usine de `rotation` sur WCompass est "HEADING"
    // (catalogue extrait de l'APK, `widgetDefaults.json`). La clé absente fait donc
    // TOURNER le cadran. Nous retombions sur "NORTH_AT_TOP", qui n'est pas une valeur de
    // ce gadget mais de la forme objet des cartes (rotation.ts) : le nord restait en haut.
    it('rotation absente : le cadran tourne, comme sous le défaut "HEADING"', () => {
      const el = drawCompass(widget({}), settings, language)
      expect((el.querySelector('.xc-compass__dial') as SVGGElement).getAttribute('transform'))
        .toBe('rotate(-35 100 100)')
    })

    // `BEARING` et `TRAVEL_DIRECTION` complètent l'énumération du catalogue et n'ont
    // JAMAIS été observés : leur libellé annonce autre chose que le nord en haut, donc un
    // cadran qui a tourné. C'est une déduction de l'APK, pas une mesure — l'angle, lui,
    // est illustratif comme partout dans ce dessin.
    it('rotation "BEARING" et "TRAVEL_DIRECTION" font tourner le cadran (déduit de l\'APK)', () => {
      for (const value of ['"BEARING"', '"TRAVEL_DIRECTION"']) {
        const el = drawCompass(widget({ rotation: value }), settings, language)
        expect((el.querySelector('.xc-compass__dial') as SVGGElement).getAttribute('transform'))
          .toBe('rotate(-35 100 100)')
      }
    })

    it('les flèches ne suivent pas la rotation du cadran — le rejeu les montre indépendants', () => {
      const heading = drawCompass(widget({ rotation: '"HEADING"' }), settings, language)
      const north = drawCompass(widget({ rotation: '"NORTH"' }), settings, language)
      const angle = (el: HTMLElement): string | null =>
        (el.querySelector('.xc-compass__arrow') as SVGGElement).getAttribute('transform')
      expect(angle(heading)).toBe(angle(north))
      expect(angle(heading)).toBe('rotate(213 100 100)')
    })
  })

  describe('indicateur de vent (windStyle)', () => {
    it('absent de windStyle (ou "NONE") : aucun indicateur', () => {
      expect(drawCompass(widget({}), settings, language).querySelector('.xc-compass__wind')).toBeNull()
      expect(drawCompass(widget({ windStyle: '"NONE"' }), settings, language).querySelector('.xc-compass__wind')).toBeNull()
    })

    it('l’indicateur s’AJOUTE aux flèches, il ne les remplace pas', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      expect(el.querySelector('.xc-compass__arrow--navigation')).not.toBeNull()
      expect(el.querySelector('.xc-compass__wind, .xc-compass__arrow--wind')).not.toBeNull()
    })

    it('le vent passe SOUS le cadran, les flèches AU-DESSUS', () => {
      // Mesuré au pixel sur deux profils radiaux : la graduation cardinale recouvre le
      // secteur noir dès 0,70 R, la flèche de navigation recouvre la graduation
      // ordinaire jusqu'à 0,89 R.
      const el = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const ordre = Array.from(el.querySelector('svg')?.children ?? []).map((c) => c.getAttribute('class'))
      expect(ordre).toEqual([
        'xc-compass__wind xc-compass__wind--arc',
        'xc-compass__dial',
        'xc-compass__arrow xc-compass__arrow--navigation'
      ])
    })

    it('"ARC" : un secteur plein dont le sommet est AU CENTRE, pas un triangle décalé', () => {
      // Le défaut signalé. Le rayon intérieur non nul lu auparavant (0,24 R … 0,31 R
      // selon la capture) était l'occultation par la flèche : sans flèche, le secteur
      // descend au centre (3,8 px sur 355 mesurés).
      const el = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const d = el.querySelector('.xc-compass__wind-sector')?.getAttribute('d') ?? ''
      expect(d.startsWith(`M ${CENTER} ${CENTER} L`)).toBe(true)
      expect(d).toContain(' A ')
      expect(el.querySelectorAll('.xc-compass__arrow-facet').length).toBe(2) // la navigation, pas le vent
    })

    it('"ARC" : ouverture de 70° et rayon extérieur au bord intérieur de la couronne', () => {
      const el = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      // `M cx cy L x1 y1 A r r 0 0 1 x2 y2 Z` : le rayon en 4, les trois drapeaux d'arc
      // en 6-8, le second sommet en 9-10.
      const n = nombres(el.querySelector('.xc-compass__wind-sector')?.getAttribute('d') ?? '')
      expect(Math.round(((bearing(n[9], n[10]) - bearing(n[2], n[3])) + 360) % 360)).toBe(70)
      expect((n[4] ?? 0) / RING_R).toBeCloseTo(0.979, 3)
    })

    it('"ARC" porte sa ligne centrale, du centre à la couronne, sur l’axe du secteur', () => {
      const el = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const axe = el.querySelector('.xc-compass__wind-axis')!
      expect(Number(axe.getAttribute('x1'))).toBe(CENTER)
      expect(Number(axe.getAttribute('y1'))).toBe(CENTER)
      const angle = bearing(Number(axe.getAttribute('x2')), Number(axe.getAttribute('y2')))
      const n = nombres(el.querySelector('.xc-compass__wind-sector')?.getAttribute('d') ?? '')
      const debut = bearing(n[2], n[3])
      expect(Math.round(angle - debut)).toBe(35)
    })

    it('"ARC" et "ARROW" pointent en sens INVERSE — l’aide de l’appareil le dit, la mesure le confirme', () => {
      // « Arc – segment d'arc rempli indiquant le secteur au vent » (d'où il vient) ;
      // « Flèche – … pointant vers où souffle le vent ». Vent de 274° : secteur centré
      // sur 274,1°, flèche pointée sur 94,2°.
      const arc = drawCompass(widget({ windStyle: '"ARC"' }), settings, language)
      const axe = arc.querySelector('.xc-compass__wind-axis')!
      const secteur = bearing(Number(axe.getAttribute('x2')), Number(axe.getAttribute('y2')))
      const fleche = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
        .querySelector('.xc-compass__arrow--wind')!
      const pointe = Number(/rotate\((-?\d+(?:\.\d+)?)/.exec(fleche.getAttribute('transform') ?? '')![1])
      expect(Math.round((pointe - secteur + 360) % 360)).toBe(180)
    })

    it('"ARROW" : la même flèche que les autres, en jaune-olive, pas une branche à part', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      const vent = el.querySelector('.xc-compass__arrow--wind')
      expect(vent).not.toBeNull()
      expect(vent?.querySelectorAll('.xc-compass__arrow-facet').length).toBe(2)
    })

    it('"WINDSOCK" : la quatrième valeur du catalogue, enfin observée', () => {
      // Manche à air relevée plein écran : quatre sommets sur un cercle de 0,72 R,
      // bouche à ±33,2° de la direction du vent, pointe à ±11,5° de l'opposée.
      const el = drawCompass(widget({ windStyle: '"WINDSOCK"' }), settings, language)
      const body = el.querySelector('.xc-compass__wind-sock-body')!
      const r = radii(body)
      for (const rayon of r) expect(rayon).toBeCloseTo(0.72, 2)
      expect(el.querySelectorAll('.xc-compass__wind-sock-band').length).toBe(2)
      expect(el.querySelector('.xc-compass__wind-sock-lip')).not.toBeNull()
    })

    it('"WINDSOCK" : bouche large face au vent, pointe étroite à l’opposé', () => {
      const el = drawCompass(widget({ windStyle: '"WINDSOCK"' }), settings, language)
      const points = (el.querySelector('.xc-compass__wind-sock-body')!.getAttribute('points') ?? '')
        .trim().split(/\s+/).map((p) => p.split(',').map(Number) as [number, number])
      const [boucheG, pointeG, pointeD, boucheD] = points.map(([x, y]) => bearing(x, y))
      const ecart = (a: number | undefined, b: number | undefined): number =>
        Math.abs((((a ?? 0) - (b ?? 0) + 540) % 360) - 180)
      expect(Math.round(ecart(boucheG, boucheD))).toBe(66) // 2 × 33,2°
      expect(Math.round(ecart(pointeG, pointeD))).toBe(23) // 2 × 11,5°
    })

    it('"SOCK" n’existe pas : une valeur hors catalogue ne dessine rien, comme sur l’appareil', () => {
      // C'est ainsi que WINDSOCK a été trouvé : "SOCK" importé sur l'AIR³ laisse le
      // cadran nu. Le catalogue extrait de l'APK (widgetOptions/base.json) le confirme.
      const sock = drawCompass(widget({ windStyle: '"SOCK"' }), settings, language)
      const aucun = drawCompass(widget({ windStyle: '"NONE"' }), settings, language)
      expect(sock.innerHTML).toBe(aucun.innerHTML)
    })

    it('le vent tourne pour son propre compte, à un angle distinct des flèches', () => {
      const el = drawCompass(widget({ windStyle: '"ARROW"' }), settings, language)
      const nav = (el.querySelector('.xc-compass__arrow--navigation') as SVGGElement).getAttribute('transform')
      const vent = (el.querySelector('.xc-compass__arrow--wind') as SVGGElement).getAttribute('transform')
      expect(vent).not.toBe(nav)
    })

    it('le cadran reste indépendant de windStyle (showBackground gouverne seul)', () => {
      const el = drawCompass(widget({ windStyle: '"ARC"', showBackground: 'false' }), settings, language)
      expect(el.querySelector('.xc-compass__wind')).not.toBeNull()
      expect(el.querySelector('.xc-compass__ring')).toBeNull()
    })
  })

  it('ne porte jamais de titre — aucune occurrence du corpus ne pose `_title` sur ce type', () => {
    const el = drawCompass(widget({ _title: 'true', titletext: '"Boussole et vent"' }), settings, language)
    expect(el.textContent).not.toContain('Boussole et vent')
  })
})
