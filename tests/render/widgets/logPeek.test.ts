import { describe, expect, it } from 'vitest'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { drawLogPeek, drawWebView } from '../../../src/render/widgets/logPeek'
import { drawWidget } from '../../../src/render/registry'
import '../../../src/render/widgets'

/**
 * Écart 2.11 de la revue des 75 visuels — « rien contre un contenu plein ». Relevé sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-9-barre-etat-live-journal-web.png`.
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
    shortName, x1: 0, y1: 0, x2: 10000, y2: 10000,
    border: false, background: 100, theme: ''
  }
}

describe('« Queue du journal » (WLogPeek)', () => {
  it('remplit le gadget d’autant de lignes que `lines_count` en demande', () => {
    // 25 dans le relevé des défauts : une clé absente vaut son défaut.
    expect(drawLogPeek(widget('WLogPeek'), settings, 'fr').querySelectorAll('.xc-logpeek__line')).toHaveLength(25)
    expect(drawLogPeek(widget('WLogPeek', { lines_count: '8' }), settings, 'fr')
      .querySelectorAll('.xc-logpeek__line')).toHaveLength(8)
  })

  /**
   * `text_size: 15` donne 11,25 px — le même facteur 0,75 que `WFreeText`, retrouvé ici
   * sur une troisième clé. L'interligne est jointif : 13 px de pas pour 11,25 de police,
   * aucune rangée blanche entre deux lignes sur la capture.
   */
  it('applique le rapport 0,75 de `text_size` et l’interligne jointif', () => {
    const el = drawLogPeek(widget('WLogPeek'), settings, 'fr')
    expect(el.style.fontSize).toBe('11.25px')
    expect(Number(el.style.lineHeight)).toBeCloseTo(13 / 11.25, 6)
  })

  it('`reverse` retourne l’ordre des lignes, et vaut `false` par défaut', () => {
    const normal = drawLogPeek(widget('WLogPeek'), settings, 'fr')
    const inverse = drawLogPeek(widget('WLogPeek', { reverse: 'true' }), settings, 'fr')
    const premier = (el: HTMLElement): string | null | undefined =>
      el.querySelector('.xc-logpeek__line')?.textContent
    expect(premier(normal)).not.toBe(premier(inverse))
    expect(premier(inverse)).toBe(normal.querySelectorAll('.xc-logpeek__line')[24]?.textContent)
  })

  /**
   * Un journal réel n'existe pas dans un fichier de pages, et recopier celui de la
   * capture mettrait les traces d'exécution de l'appareil du propriétaire dans un dépôt
   * public. Chaque ligne le dit.
   */
  it('chaque ligne se donne pour un exemple, et ne recopie rien de la capture', () => {
    const el = drawLogPeek(widget('WLogPeek'), settings, 'fr')
    for (const line of el.querySelectorAll('.xc-logpeek__line')) {
      expect(line.textContent).toContain('exemple')
    }
    expect(el.textContent).not.toContain('KeyAttestationHelper')
  })

  it('borne le nombre de lignes plutôt que de suivre une clé absurde', () => {
    expect(drawLogPeek(widget('WLogPeek', { lines_count: '100000' }), settings, 'fr')
      .querySelectorAll('.xc-logpeek__line').length).toBeLessThanOrEqual(200)
    expect(drawLogPeek(widget('WLogPeek', { lines_count: '0' }), settings, 'fr')
      .querySelectorAll('.xc-logpeek__line').length).toBe(1)
  })
})

describe('« Page web » (WWebView)', () => {
  it('affiche l’adresse qui sera chargée, du relevé ou du fichier', () => {
    expect(drawWebView(widget('WWebView'), settings, 'fr')
      .querySelector('.xc-webview__bar')?.textContent).toBe('https://www.google.com/')
    expect(drawWebView(widget('WWebView', { url: '"https://exemple.test/meteo"' }), settings, 'fr')
      .querySelector('.xc-webview__bar')?.textContent).toBe('https://exemple.test/meteo')
  })

  /**
   * Le dessin ne doit RIEN aller chercher : une page d'éditeur qui chargerait une adresse
   * écrite dans le fichier du pilote ferait fuiter cette adresse.
   */
  it('ne pose ni iframe, ni image, ni requête', () => {
    const el = drawWebView(widget('WWebView'), settings, 'fr')
    expect(el.querySelector('iframe')).toBeNull()
    expect(el.querySelector('img')).toBeNull()
    expect(el.innerHTML).not.toContain('src=')
  })
})

describe('l’annuaire sert les deux dessins', () => {
  it('WLogPeek et WWebView ne retombent plus sur le repli générique', () => {
    for (const type of ['WLogPeek', 'WWebView']) {
      expect(drawWidget(widget(type), settings, 'fr').className).not.toContain('xc-generic')
    }
  })
})
