import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import { renderPage, widgetStyle } from '../../src/render/canvas'
import { registerTransparent } from '../../src/render/registry'
// Effet de bord : enregistre les dessins réels (numériques, barre d'état, zones
// tactiles) et marque WButtonBrightness/WButtonNavig comme transparents — nécessaire
// pour les tests d'intégration ci-dessous, qui vérifient le comportement sur les
// widgets tactiles réels du corpus, pas seulement sur un type de test synthétique.
import '../../src/render/widgets'

describe('positionnement', () => {
  it('convertit les coordonnées 0-10000 en pourcentages', () => {
    const style = widgetStyle({ x1: 0, y1: 3226, x2: 10000, y2: 10000, background: 100 })
    expect(style.left).toBe('0%')
    expect(style.top).toBe('32.26%')
    expect(style.width).toBe('100%')
    expect(style.height).toBe('67.74%')
  })

  it('traduit _bg en opacité de fond', () => {
    expect(widgetStyle({ x1: 0, y1: 0, x2: 1, y2: 1, background: 40 }).backgroundOpacity).toBe(0.4)
    expect(widgetStyle({ x1: 0, y1: 0, x2: 1, y2: 1, background: 0 }).backgroundOpacity).toBe(0)
  })
})

describe('empilement', () => {
  const doc = parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8'))
  const settings = readRenderSettings(doc)
  const page = readLayout(doc).landscape[4]!

  it('émet les widgets dans l’ordre du tableau', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const children = [...element.querySelectorAll('.xc-widget')]
    expect(children).toHaveLength(21)
    // Le grand widget cartographique est au fond : il est émis en premier.
    expect((children[0] as HTMLElement).style.width).toBe('75%')
    // Le dernier émis est au-dessus de tous les autres.
    expect(children[children.length - 1]).toBe(element.lastElementChild)
  })

  it('reporte l’opacité de _bg sur chaque widget', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const third = element.querySelectorAll('.xc-widget')[2] as HTMLElement
    expect(third.style.getPropertyValue('--xc-bg-opacity')).toBe('0.2')
  })
})

describe('widgets transparents (mécanisme)', () => {
  const settings = readRenderSettings(parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8')))

  it('force l’opacité de fond à 0 pour un type enregistré transparent, quelle que soit _bg', () => {
    registerTransparent('WEssaiTactileCanvas')
    const page = {
      node: { kind: 'object' as const, entries: [] }, className: 'page', navigations: { kind: 'none' as const },
      widgets: [{
        node: { kind: 'object' as const, entries: [] }, className: 'x.WEssaiTactileCanvas',
        shortName: 'WEssaiTactileCanvas', x1: 0, y1: 0, x2: 10000, y2: 10000,
        border: true, background: 100, theme: ''
      }]
    }
    const element = renderPage(page, 1, settings, 'fr')
    const el = element.querySelector('.xc-widget') as HTMLElement
    expect(el.style.getPropertyValue('--xc-bg-opacity')).toBe('0')
    expect(el.classList.contains('xc-widget--border')).toBe(false)
  })
})

describe('widgets tactiles réels du corpus (intégration)', () => {
  // landscape[3] : deux WButtonBrightness (_bg: 100, _border: false) couvrant la
  // moitié centrale de l'écran — le cas cité par rendu-observe.md, « Widgets sans
  // rendu visible ». _bg: 100 est le piège explicite de la tâche : sans neutralisation,
  // l'opacité de fond resterait à 1 et masquerait la carte.
  const doc = parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8'))
  const settings = readRenderSettings(doc)
  const brightnessPage = readLayout(doc).landscape[3]!
  // landscape[4] : deux WButtonNavig avec _border: true dans le fichier — jamais rendu
  // comme tel sur l'appareil (rendu-observe.md).
  const navigPage = readLayout(doc).landscape[4]!

  it('neutralise le fond opaque de WButtonBrightness (_bg: 100 dans le fichier)', () => {
    const element = renderPage(brightnessPage, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')]
    const brightnessWidgets = widgets.filter(w => w.querySelector('.xc-touch') !== null)
    expect(brightnessWidgets).toHaveLength(2)
    for (const w of brightnessWidgets) {
      expect((w as HTMLElement).style.getPropertyValue('--xc-bg-opacity')).toBe('0')
    }
  })

  it('ignore _border: true du fichier pour WButtonNavig', () => {
    const element = renderPage(navigPage, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')]
    const navigWidgets = widgets.filter(w => w.querySelector('.xc-touch') !== null)
    expect(navigWidgets).toHaveLength(2)
    for (const w of navigWidgets) {
      expect(w.classList.contains('xc-widget--border')).toBe(false)
    }
  })
})
