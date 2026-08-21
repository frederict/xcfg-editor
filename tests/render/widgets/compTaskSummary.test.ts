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

/**
 * Écart 2.6 de la revue des 75 visuels. Le gadget est désormais OBSERVÉ : il fallait une
 * manche chargée et le mode « Manche de compétition » actif pour le voir, et la seule
 * capture qui le montre est
 * `docs/reference/captures-air3/2026-08-21_planche-competition-7-carte-manche-et-resume.png`.
 * Le CONTENU d'une manche, lui, ne vit pas dans le fichier de pages : les noms de balises
 * de l'exemple sont neutres, seule la forme est reprise.
 */
describe('WCompTaskSummary', () => {
  it('dessine dix lignes, dont une vide, sans titre', () => {
    const el = drawCompTaskSummary(widget(), settings, language)
    const lignes = [...el.querySelectorAll('.xc-tasksum__line')]
    expect(lignes).toHaveLength(10)
    expect(lignes[0]?.textContent).toBe('COURSE')
    // La ligne vide sépare l'en-tête des balises et garde sa hauteur.
    expect(lignes[3]?.textContent?.trim()).toBe('')
    expect(el.querySelector('.xc-num__title')).toBeNull()
  })

  /**
   * Toutes les lignes se centrent sur le milieu de la PLUS LONGUE, elle-même collée à
   * gauche : la moitié droite de la cellule reste vide sur l'appareil. Un centrage dans
   * la cellule décalerait tout le bloc.
   */
  it('centre les lignes entre elles, dans un bloc collé à gauche', () => {
    const el = drawCompTaskSummary(widget(), settings, language)
    expect(el.querySelector('.xc-tasksum__block')).not.toBeNull()
    expect(el.querySelectorAll('.xc-tasksum__block > .xc-tasksum__line')).toHaveLength(10)
  })

  it('marque la balise courante entre chevrons, comme la capture', () => {
    const el = drawCompTaskSummary(widget(), settings, language)
    const textes = [...el.querySelectorAll('.xc-tasksum__line')].map(n => n.textContent)
    expect(textes.filter(t => t?.startsWith('> ') && t.endsWith(' <'))).toHaveLength(1)
  })

  it('ne reprend AUCUN nom de balise de la manche du propriétaire', () => {
    const texte = drawCompTaskSummary(widget(), settings, language).textContent ?? ''
    for (const balise of ['D01125', 'B19051', 'B41123', 'A47075']) {
      expect(texte).not.toContain(balise)
    }
  })
})
