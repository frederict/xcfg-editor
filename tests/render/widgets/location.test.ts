import { describe, expect, it } from 'vitest'
import { drawLocation } from '../../../src/render/widgets/location'
import { drawWidget } from '../../../src/render/registry'
import '../../../src/render/widgets'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

function widget(shortName = 'WLocation'): Widget {
  return {
    node: { kind: 'object', entries: [] },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 5000, y2: 5000,
    border: true, background: 100, theme: ''
  }
}

function lines(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.xc-loc__line')).map((line) => line.textContent ?? '')
}

/**
 * Réserve n° 1 (`2026-08-21-reserves-de-rendu.md`), levée par le rejeu du 2026-08-22 :
 * format relevé sur `captures-air3/2026-08-22_rejeu-localisation.png`, position de
 * croisière au-dessus de la Sierra de Gredos — donc sans exposer de domicile.
 */
describe('WLocation — deux lignes de coordonnées, calées à droite', () => {
  it('ne retombe plus sur le repli générique', () => {
    expect(drawWidget(widget(), settings, 'fr').className).not.toContain('xc-generic')
  })

  it('écrit DEUX lignes, degrés décimaux à quatre décimales, lettre d’hémisphère détachée', () => {
    expect(lines(drawLocation(widget(), settings, 'fr'))).toEqual(['12,3456 N', '12,3456 E'])
  })

  it('la virgule décimale suit la langue, comme partout ailleurs', () => {
    expect(lines(drawLocation(widget(), settings, 'en'))).toEqual(['12.3456 N', '12.3456 E'])
  })

  // La capture porte des coordonnées réelles : l'éditeur, lui, doit montrer un exemple qui
  // ne peut désigner personne. Ce test est là pour qu'un « exemple plus réaliste » ne
  // remette pas une position vraie dans un dessin public.
  it('l’exemple est fictif — ni la position relevée, ni un lieu vraisemblable', () => {
    const texte = lines(drawLocation(widget(), settings, 'fr')).join(' ')
    expect(texte).not.toContain('40,2593')
    expect(texte).not.toContain('4,9070')
    expect(texte).toContain('12,3456')
  })

  it('pas de signe degré, pas d’unité, pas de zéro de tête', () => {
    const el = drawLocation(widget(), settings, 'fr')
    expect(el.textContent).not.toContain('°')
    expect(el.querySelector('.xc-num__unit')).toBeNull()
    for (const line of lines(el)) expect(line).not.toMatch(/^0\d/)
  })

  it('le titre reste celui du catalogue, et prend la couleur des titres du fichier', () => {
    const title = drawLocation(widget(), settings, 'fr').querySelector('.xc-num__title') as HTMLElement
    expect(title.textContent).toBe('Localisation')
    expect(title.style.color).toBe('#f44336')
  })

  it('les deux lignes finissent au même bord droit, celui de la scène', () => {
    const el = drawLocation(widget(), settings, 'fr')
    const abscisses = Array.from(el.querySelectorAll('.xc-loc__line')).map((line) => ({
      x: line.getAttribute('x'), anchor: line.getAttribute('text-anchor')
    }))
    expect(abscisses).toEqual([{ x: '592', anchor: 'end' }, { x: '592', anchor: 'end' }])
  })

  // 140 px de base à base pour 144 px de police, mesurés sur la capture : l'interligne est
  // plus serré que la police, et c'est ce qui fait tenir deux lignes dans la place d'une.
  it('l’interligne est celui de la capture — 140 px entre les deux bases', () => {
    const el = drawLocation(widget(), settings, 'fr')
    const bases = Array.from(el.querySelectorAll('.xc-loc__line')).map((line) => Number(line.getAttribute('y')))
    expect(bases[1]! - bases[0]!).toBe(140)
    for (const line of Array.from(el.querySelectorAll('.xc-loc__line'))) {
      expect(line.getAttribute('font-size')).toBe('144')
    }
  })

  // Les chiffres de l'appareil ne sont pas étirés, et le bord auquel ils s'alignent est le
  // DROIT : une cellule d'un autre rapport doit les laisser à droite, pas au milieu.
  it('la scène garde ses proportions et se cale à droite', () => {
    const scene = drawLocation(widget(), settings, 'fr').querySelector('.xc-loc__scene') as SVGSVGElement
    expect(scene.getAttribute('preserveAspectRatio')).toBe('xMaxYMid meet')
    expect(scene.getAttribute('viewBox')).toBe('0 0 596 401')
    expect(scene.style.flexGrow).toBe('1')
    expect(scene.style.alignSelf).toBe('stretch')
  })
})
