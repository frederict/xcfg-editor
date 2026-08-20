import { describe, expect, it } from 'vitest'
import { drawLiveMessage } from '../../../src/render/widgets/liveMessage'
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
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: 'org.xcontest.XCTrack.widget.w.WLiveMessage',
    shortName: 'WLiveMessage', x1: 833, y1: 7586, x2: 10000, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

// Recouvrement en vol (comparaison au sol, vol-thermalassistant-boutonsnavig.png) :
// WLiveMessage ne doit plus jamais dessiner de fond, cadre ou contenu permanent — voir
// le commentaire de tête de liveMessage.ts. Ces tests verrouillent le rendu-au-repos
// (rien) et l'étiquette de survol (marque discrète, avec line_count).
describe('WLiveMessage — afficheur transparent au repos', () => {
  it('ne dessine ni fond, ni cadre, ni texte visible en rendu normal', () => {
    const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr')
    expect(el.className).toBe('xc-livemsg')
    expect(el.querySelectorAll('.xc-livemsg__label')).toHaveLength(1)
    expect(el.style.background).toBe('')
    expect(el.style.border).toBe('')
  })

  it('ne simule plus aucun message d’exemple (contrairement à l’ancien rendu permanent)', () => {
    const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr')
    expect(el.querySelectorAll('.xc-livemsg__line')).toHaveLength(0)
    expect(el.querySelector('.xc-livemsg__time')).toBeNull()
  })

  describe('étiquette de survol', () => {
    it('annonce le nombre de lignes réservées (line_count)', () => {
      const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr')
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages — 2 lignes réservées')
    })

    it('accorde le singulier à une seule ligne', () => {
      const el = drawLiveMessage(widget({ line_count: '1' }), settings, 'fr')
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages — 1 ligne réservée')
    })

    it('bascule en anglais avec la langue reçue en paramètre', () => {
      const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'en')
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Message panel — 2 lines reserved')
    })

    it('retombe sur le seul préfixe quand `line_count` est absent', () => {
      const el = drawLiveMessage(widget({}), settings, 'fr')
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages')
    })
  })
})
