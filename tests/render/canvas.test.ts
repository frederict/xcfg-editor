import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import { renderPage, widgetHeightPx, widgetStyle } from '../../src/render/canvas'
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

// Défaut 1 (rapport de tâche) — le rendu se désorganisait en dessous de la taille
// d'un écran d'AIR³ : tout `em`/`%` du texte HTML partait de la taille de police du
// DOCUMENT (16px, jamais redimensionnée), pas de la taille réelle de la page. Constaté
// en capturant ce rendu à 1280/640/400/240px avec Chrome headless (voir le rapport de
// tâche) : un `<svg viewBox>` + `<foreignObject>`, sur le modèle des dessins SVG des
// widgets (compass.ts, map.ts…), met désormais toute la page à l'échelle du
// conteneur réel — `container-type`/`cqh` a été essayé et abandonné, cassé dans ce
// Chrome dès qu'il y a plusieurs conteneurs de ce type sur une même page.
describe('repère de référence (défaut 1 — lisibilité à toute taille)', () => {
  const doc = parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8'))
  const settings = readRenderSettings(doc)
  const page = readLayout(doc).landscape[3]!

  it('enveloppe la page dans un <svg viewBox> + <foreignObject>', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    expect(element.tagName.toLowerCase()).toBe('svg')
    expect(element.classList.contains('xc-page-scene')).toBe(true)
    // Le viewBox fixe le repère à REFERENCE_WIDTH (1280, la largeur de la capture de
    // référence) de large, 720 de haut pour une page 16/9 — voir widgetHeightPx.
    expect(element.getAttribute('viewBox')).toBe('0 0 1280 720')

    const foreignObject = element.querySelector('foreignObject')!
    expect(foreignObject).not.toBeNull()
    expect(foreignObject.getAttribute('width')).toBe('1280')
    expect(foreignObject.getAttribute('height')).toBe('720')
    expect(foreignObject.querySelector('.xc-page')).not.toBeNull()
  })

  it('calcule un viewBox aux proportions du portrait (9/16) sans déformer le repère', () => {
    const element = renderPage(page, 9 / 16, settings, 'fr')
    // 1280 de large / (9/16) = 2275.55...
    expect(element.getAttribute('viewBox')).toBe('0 0 1280 2275.5555555555557')
  })

  it('pose --xc-h sur chaque widget, proportionnel à sa hauteur normalisée', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')] as HTMLElement[]
    // WStatusLine (landscape[3]) : Y1:0, Y2:1034 sur 10000 — le widget le plus plat de
    // la page. WThermalAssistant : Y1:1034, Y2:7586 — le plus haut.
    const flat = widgets.find(w => w.querySelector('.xc-status') !== null)!
    const tall = widgets.find(w => w.querySelector('.xc-map') !== null)!
    const flatH = Number(flat.style.getPropertyValue('--xc-h'))
    const tallH = Number(tall.style.getPropertyValue('--xc-h'))
    expect(flatH).toBeGreaterThan(0)
    expect(tallH).toBeGreaterThan(flatH)
  })
})

describe('widgetHeightPx (défaut 2 — la valeur numérique suit la hauteur de son widget)', () => {
  it('vaut une fraction de REFERENCE_WIDTH/aspectRatio proportionnelle à la hauteur normalisée', () => {
    // Page 16/9 (donc 1280×720 dans le repère de référence) : un widget qui occupe
    // 20 % de la hauteur (2000/10000, la largeur du widget n'intervient pas) vaut
    // 20 % de 720.
    const height = widgetHeightPx({ x1: 0, y1: 0, x2: 2000, y2: 2000, background: 100 }, 16 / 9)
    expect(height).toBeCloseTo(144, 5)
  })

  it('un widget deux fois plus haut reçoit une hauteur de référence deux fois plus grande', () => {
    const short = widgetHeightPx({ x1: 0, y1: 0, x2: 5000, y2: 1000, background: 100 }, 16 / 9)
    const tall = widgetHeightPx({ x1: 0, y1: 0, x2: 5000, y2: 2000, background: 100 }, 16 / 9)
    expect(tall).toBeCloseTo(short * 2, 5)
  })

  it('ne dépend pas de la largeur du widget, seulement de sa hauteur normalisée', () => {
    const narrow = widgetHeightPx({ x1: 0, y1: 0, x2: 1000, y2: 2000, background: 100 }, 16 / 9)
    const wide = widgetHeightPx({ x1: 0, y1: 0, x2: 9000, y2: 2000, background: 100 }, 16 / 9)
    expect(narrow).toBeCloseTo(wide, 5)
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
    // Le dernier émis est au-dessus de tous les autres — direct enfant de `.xc-page`,
    // pas de `element` lui-même : `renderPage` enveloppe désormais la page dans un
    // `<svg viewBox>` + `<foreignObject>` (voir « repère de référence » ci-dessous),
    // `.xc-page` est donc à un niveau d'imbrication de plus qu'avant ce correctif.
    const xcPage = element.querySelector('.xc-page')!
    expect(children[children.length - 1]).toBe(xcPage.lastElementChild)
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
