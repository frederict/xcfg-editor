import { describe, expect, it } from 'vitest'
import { drawAirspaceProximity } from '../../../src/render/widgets/airspaceProximity'
import { valueWidthEm } from '../../../src/render/textMetrics'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

function widget(params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WAirspaceProximity',
    shortName: 'WAirspaceProximity', x1: 0, y1: 1379, x2: 1250, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

// Relevé du corpus et capture de référence : voir le commentaire de tête de
// airspaceProximity.ts. Seule la première zone (BEAUVECHAIN) est confirmée pixel par
// pixel par ecran-non-identifie-4.png ; la seconde reprend le même gabarit, comme
// documenté.
describe('WAirspaceProximity', () => {
  it('dessine deux zones empilées, nommées BEAUVECHAIN et Charleroi', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__zone').length).toBe(2)
    expect(el.textContent).toContain('BEAUVECHAIN')
    expect(el.textContent).toContain('Charleroi')
  })

  it('affiche le plancher-plafond seulement si `_showoriginalheightline` vaut true', () => {
    const shown = drawAirspaceProximity(widget({ _showoriginalheightline: 'true' }), settings, language)
    const hidden = drawAirspaceProximity(widget({ _showoriginalheightline: 'false' }), settings, language)
    const absent = drawAirspaceProximity(widget({}), settings, language)
    expect(shown.textContent).toContain('760 m - 1370 m')
    expect(shown.textContent).toContain('760 m - FL55')
    expect(hidden.querySelectorAll('.xc-airprox__range').length).toBe(0)
    // Clé absente : le relevé des 75 widgets la donne à `true`, et c'est la ligne
    // « plancher – plafond » que la revue des visuels signale manquante au § 1.5.
    expect(absent.textContent).toContain('760 m - 1370 m')
  })

  it('sépare les deux zones par un unique filet rouge', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__divider').length).toBe(1)
  })

  it('affiche une distance verticale (flèche) et une distance horizontale (flèche oblique) par zone', () => {
    const el = drawAirspaceProximity(widget(), settings, language)
    expect(el.querySelectorAll('.xc-airprox__dist--vertical').length).toBe(2)
    expect(el.querySelectorAll('.xc-airprox__dist--horizontal').length).toBe(2)
  })

  it('empile les zones en colonne par défaut (`_splitdirection` absent ou `AUTO`)', () => {
    const absent = drawAirspaceProximity(widget({}), settings, language)
    const auto = drawAirspaceProximity(widget({ _splitdirection: '"AUTO"' }), settings, language)
    expect(absent.classList.contains('xc-airprox--row')).toBe(false)
    expect(auto.classList.contains('xc-airprox--row')).toBe(false)
  })

  it('empile les zones en ligne quand `_splitdirection` vaut `HORIZONTAL`', () => {
    const el = drawAirspaceProximity(widget({ _splitdirection: '"HORIZONTAL"' }), settings, language)
    expect(el.classList.contains('xc-airprox--row')).toBe(true)
  })
  // Écart 1.5 de la revue des 75 widgets — le widget était rempli à 22 %, l'appareil le
  // sature. Ce qu'il dessine : des BANDES de hauteur égale, une par ligne, sur toute la
  // largeur. Mesuré page 8 de la planche, widget 320 × 646 : huit lignes centrées à
  // y = 39, 119, 198, 279, 361, 442, 521, 599 — huit bandes de 80,75 px.
  describe('bandes de hauteur égale (écart 1.5)', () => {
    it('chaque ligne est une bande, et le compte est publié pour style.css', () => {
      const el = drawAirspaceProximity(widget(), settings, language)
      expect(el.querySelectorAll('.xc-airprox__line').length).toBe(8)
      expect(el.style.getPropertyValue('--xc-airprox-rows')).toBe('8')
      expect(el.style.getPropertyValue('--xc-airprox-cols')).toBe('1')
    })

    it('sans la ligne plancher-plafond, il ne reste que trois bandes par zone', () => {
      const el = drawAirspaceProximity(widget({ _showoriginalheightline: 'false' }), settings, language)
      expect(el.querySelectorAll('.xc-airprox__line').length).toBe(6)
      expect(el.style.getPropertyValue('--xc-airprox-rows')).toBe('6')
    })

    it('en HORIZONTAL, les zones se partagent la largeur : autant de colonnes, moitié moins de bandes', () => {
      const el = drawAirspaceProximity(widget({ _splitdirection: '"HORIZONTAL"' }), settings, language)
      expect(el.style.getPropertyValue('--xc-airprox-rows')).toBe('4')
      expect(el.style.getPropertyValue('--xc-airprox-cols')).toBe('2')
    })

    /**
     * **La règle est le PICTOGRAMME, pas le rang de la ligne.**
     * `captures-air3/2026-08-21_espace-aerien-teinture.png` porte quatre widgets de
     * hauteurs différentes et de motif rigoureusement identique : les deux lignes
     * d'identité sont toujours teintées, et une ligne de distance l'est quand sa flèche
     * TRAVERSE la hachure. Les deux lectures envisagées auparavant — « l'identité est
     * teintée, les distances non » et son inverse — sont toutes les deux fausses ; elles
     * tombaient juste 7 fois sur 8, une seule ligne les départageant.
     */
    it('teinte les deux lignes d’identité, et la distance dont la flèche traverse la hachure', () => {
      const el = drawAirspaceProximity(widget(), settings, language)
      const teintees = [...el.querySelectorAll('.xc-airprox__line--tinted')]
      // 2 identités × 2 zones, plus la seule distance traversante du relevé.
      expect(teintees.length).toBe(5)
      expect(teintees.filter(l => l.classList.contains('xc-airprox__dist'))).toHaveLength(1)
      const traversante = teintees.find(l => l.classList.contains('xc-airprox__dist'))!
      expect(traversante.classList.contains('xc-airprox__dist--horizontal')).toBe(true)
    })

    it('les distances qui s’arrêtent avant la hachure restent sur blanc', () => {
      const el = drawAirspaceProximity(widget(), settings, language)
      const distances = [...el.querySelectorAll('.xc-airprox__dist')]
      expect(distances).toHaveLength(4)
      expect(distances.filter(l => !l.classList.contains('xc-airprox__line--tinted'))).toHaveLength(3)
    })

    it('le pictogramme porte la hachure que la flèche franchit ou non', () => {
      const el = drawAirspaceProximity(widget(), settings, language)
      for (const icone of el.querySelectorAll('.xc-airprox__icon')) {
        expect(icone.querySelector('.xc-airprox__hatch')).not.toBeNull()
        expect(icone.querySelectorAll('.xc-airprox__hatch-tooth').length).toBeGreaterThan(3)
      }
    })

    it('chaque bande publie la largeur de son texte, pour n’être réduite que si elle déborde', () => {
      // C'est ce que fait l'appareil : « Charleroi » y tient à pleine taille (casse
      // 49 px) et « BEAUVECHAIN », plus long dans la même largeur, tombe à 33 px.
      const el = drawAirspaceProximity(widget(), settings, language)
      const em = (selecteur: string): number =>
        Number((el.querySelector(selecteur) as HTMLElement).style.getPropertyValue('--xc-line-em'))
      expect(em('.xc-airprox__name')).toBeGreaterThan(0)
      const noms = [...el.querySelectorAll('.xc-airprox__name')] as HTMLElement[]
      // BEAUVECHAIN (11 caractères) contre Charleroi (9) : la première déborde la première.
      expect(Number(noms[0]!.style.getPropertyValue('--xc-line-em')))
        .toBeGreaterThan(Number(noms[1]!.style.getPropertyValue('--xc-line-em')))
      // Une ligne de distance provisionne en plus la place de son pictogramme.
      const dist = el.querySelector('.xc-airprox__dist--vertical') as HTMLElement
      expect(Number(dist.style.getPropertyValue('--xc-line-em'))).toBeGreaterThan(valueWidthEm('667 m'))
    })
  })
})
