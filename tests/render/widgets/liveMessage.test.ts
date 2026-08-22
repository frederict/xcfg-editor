import { describe, expect, it } from 'vitest'
import { drawLiveMessage } from '../../../src/render/widgets/liveMessage'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { makeTranslator } from '../../../src/i18n/translate'
import frenchMessages from '../../../src/i18n/messages/fr'
import germanMessages from '../../../src/i18n/messages/de'
import englishMessages from '../../../src/i18n/messages/en'
import spanishMessages from '../../../src/i18n/messages/es'
import dutchMessages from '../../../src/i18n/messages/nl'
import type { UiLanguage } from '../../../src/i18n/languages'

/** Les cinq catalogues : l'étiquette doit exister dans les cinq, sans repli anglais. */
const CATALOGUES = {
  fr: frenchMessages, en: englishMessages, de: germanMessages,
  es: spanishMessages, nl: dutchMessages
}

/** Notre prose, axe `ui` — jamais la langue des libellés passée à côté. */
const tr = makeTranslator('fr', frenchMessages)

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
    const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr', tr)
    expect(el.className).toBe('xc-livemsg')
    expect(el.querySelectorAll('.xc-livemsg__label')).toHaveLength(1)
    expect(el.style.background).toBe('')
    expect(el.style.border).toBe('')
  })

  it('ne simule plus aucun message d’exemple (contrairement à l’ancien rendu permanent)', () => {
    const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr', tr)
    expect(el.querySelectorAll('.xc-livemsg__line')).toHaveLength(0)
    expect(el.querySelector('.xc-livemsg__time')).toBeNull()
  })

  describe('étiquette de survol', () => {
    it('annonce le nombre de lignes réservées (line_count)', () => {
      const el = drawLiveMessage(widget({ line_count: '2' }), settings, 'fr', tr)
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages — 2 lignes réservées')
    })

    it('accorde le singulier à une seule ligne', () => {
      const el = drawLiveMessage(widget({ line_count: '1' }), settings, 'fr', tr)
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages — 1 ligne réservée')
    })

    /**
     * **L'étiquette suit le pilote, pas le fichier.** C'est notre prose — l'appareil ne
     * peint rien ici au repos, c'est tout l'objet de ce module. Jusqu'au 2026-08-22 elle
     * suivait la langue du fichier, dans une table figée à `fr`/`en` avec sa propre copie
     * de `plural()` : trois pilotes sur cinq lisaient l'anglais.
     */
    it('suit la langue du pilote, quelle que soit celle du fichier', () => {
      const anglais = makeTranslator('en', englishMessages)
      const nœud = widget({ line_count: '2' })
      // Fichier en anglais, pilote en français : l'étiquette reste française.
      expect(drawLiveMessage(nœud, settings, 'en', tr).querySelector('.xc-livemsg__label')?.textContent)
        .toBe('Panneau de messages — 2 lignes réservées')
      // Fichier en français, pilote en anglais : elle passe à l'anglais.
      expect(drawLiveMessage(nœud, settings, 'fr', anglais).querySelector('.xc-livemsg__label')?.textContent)
        .toBe('Message panel — 2 lines reserved')
    })

    /**
     * ⚠️ **Le pluriel de zéro n'est pas le même partout.** Le français met le singulier,
     * les quatre autres langues le pluriel : c'est exactement ce qu'un `count > 1` écrit à
     * la main aurait raté, et c'est pourquoi le message passe par `Intl.PluralRules`.
     */
    it('accorde zéro ligne selon la langue, pas selon la règle française', () => {
      const nœud = widget({ line_count: '0' })
      expect(drawLiveMessage(nœud, settings, 'fr', tr).querySelector('.xc-livemsg__label')?.textContent)
        .toBe('Panneau de messages — 0 ligne réservée')
      expect(drawLiveMessage(nœud, settings, 'fr', makeTranslator('en', englishMessages))
        .querySelector('.xc-livemsg__label')?.textContent).toBe('Message panel — 0 lines reserved')
    })

    it('porte l’étiquette dans les cinq langues, jamais un repli anglais', () => {
      const nœud = widget({ line_count: '2' })
      const attendu: Record<string, string> = {
        fr: 'Panneau de messages — 2 lignes réservées',
        en: 'Message panel — 2 lines reserved',
        de: 'Nachrichtenbereich — 2 Zeilen reserviert',
        es: 'Panel de mensajes — 2 líneas reservadas',
        nl: 'Berichtenpaneel — 2 regels gereserveerd'
      }
      for (const [langue, textes] of Object.entries(CATALOGUES)) {
        expect(drawLiveMessage(nœud, settings, 'fr', makeTranslator(langue as UiLanguage, textes))
          .querySelector('.xc-livemsg__label')?.textContent).toBe(attendu[langue])
      }
    })

    it('retombe sur le seul préfixe quand `line_count` est absent', () => {
      const el = drawLiveMessage(widget({}), settings, 'fr', tr)
      expect(el.querySelector('.xc-livemsg__label')?.textContent).toBe('Panneau de messages')
    })
  })
})
