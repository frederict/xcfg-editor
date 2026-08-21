import { describe, expect, it } from 'vitest'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { drawEmitTestEvent, drawFreeText } from '../../../src/render/widgets/freeText'
import { drawWidget } from '../../../src/render/registry'
import '../../../src/render/widgets'

/**
 * Écart 2.10 de la revue des 75 visuels — deux des quatre gadgets « autres » que
 * l'appareil dessine et que nous rendions « titre + `--` ». Les deux autres,
 * `WLastKey` et `WExternalData`, sont de simples valeurs et ont rejoint `SPECS`
 * (numeric.ts) avec l'écart 2.12.
 *
 * Tout est relevé sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-5-boutons-autres-test.png`.
 */

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

function widget(shortName: string, params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 10000, y2: 1000,
    border: false, background: 100, theme: ''
  }
}

describe('« Texte libre » (WFreeText)', () => {
  it('affiche le texte du relevé, sans aucun titre', () => {
    const el = drawFreeText(widget('WFreeText'), settings, 'fr')
    expect(el.textContent).toBe('Modifie moi dans les paramètres du gadget')
    expect(el.querySelector('.xc-num__title')).toBeNull()
    expect(el.querySelector('.xc-generic__title')).toBeNull()
  })

  it('affiche le texte du pilote quand le fichier en porte un', () => {
    const el = drawFreeText(widget('WFreeText', { text: '"Ma consigne"' }), settings, 'fr')
    expect(el.textContent).toBe('Ma consigne')
  })

  /**
   * `text_size: 25` donne 18,75 px et `text_padding: 10` donne 7,5 px — le même facteur
   * 0,75, mesuré sur deux clés indépendantes (voir `TEXT_SIZE_TO_PX`, freeText.ts).
   */
  it('convertit text_size et text_padding au rapport mesuré de 0,75', () => {
    const el = drawFreeText(widget('WFreeText'), settings, 'fr')
    expect(el.style.fontSize).toBe('18.75px')
    expect(el.style.padding).toBe('7.5px')

    const gros = drawFreeText(widget('WFreeText', { text_size: '40', text_padding: '0' }), settings, 'fr')
    expect(gros.style.fontSize).toBe('30px')
    expect(gros.style.padding).toBe('0px')
  })

  it('suit color_text, text_bold et text_italic', () => {
    const el = drawFreeText(
      widget('WFreeText', { color_text: '-65536', text_bold: 'true', text_italic: 'true' }), settings, 'fr'
    )
    expect(el.style.color).toBe('#ff0000')
    expect(el.style.fontWeight).toBe('700')
    expect(el.style.fontStyle).toBe('italic')
  })

  /**
   * `color_bg` vaut `16777215` — du blanc — dans le relevé. Le peindre masquerait la
   * transparence que `_bg` demande, et l'appareil ne peint rien de plus sous ce texte.
   */
  it('ne peint pas le fond quand color_bg vaut le blanc du relevé', () => {
    expect(drawFreeText(widget('WFreeText'), settings, 'fr').style.background).toBe('')
    expect(drawFreeText(widget('WFreeText', { color_bg: '-16777216' }), settings, 'fr').style.background)
      .toBe('#000000')
  })
})

describe('« Émettre un événement test » (WEmitTestEvent)', () => {
  it('affiche la clé event dans un cadre, sans titre', () => {
    const el = drawEmitTestEvent(widget('WEmitTestEvent'), settings, 'fr')
    expect(el.querySelector('.xc-testevent__label')?.textContent).toBe('Battery50')
    expect(el.className).toContain('xc-testevent')
    expect(el.querySelector('.xc-num__title')).toBeNull()
  })

  it('affiche l’événement choisi par le pilote', () => {
    const el = drawEmitTestEvent(widget('WEmitTestEvent', { event: '"TakeOff"' }), settings, 'fr')
    expect(el.querySelector('.xc-testevent__label')?.textContent).toBe('TakeOff')
  })
})

describe('l’annuaire sert les deux dessins', () => {
  it('WFreeText et WEmitTestEvent ne retombent plus sur le repli générique', () => {
    for (const type of ['WFreeText', 'WEmitTestEvent']) {
      expect(drawWidget(widget(type), settings, 'fr').className).not.toContain('xc-generic')
    }
  })
})
