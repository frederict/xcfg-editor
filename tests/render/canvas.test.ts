import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import { readLayout, type Page } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import {
  backgroundOpacity, renderPage, titleFontPx, widgetHeightPx, widgetWidthPx, widgetStyle
} from '../../src/render/canvas'
import { registerBlankAtRest } from '../../src/render/registry'
// Effet de bord : enregistre les dessins réels (numériques, barre d'état, boutons,
// cartes…) — nécessaire pour les tests d'intégration ci-dessous, qui vérifient le
// comportement sur les widgets réels du corpus, pas seulement sur un type synthétique.
import '../../src/render/widgets'
import { BACKUP_2026 } from '../fixtures/paths'

describe('positionnement', () => {
  it('convertit les coordonnées 0-10000 en pourcentages', () => {
    const style = widgetStyle({ x1: 0, y1: 3226, x2: 10000, y2: 10000, background: 100 })
    expect(style.left).toBe('0%')
    expect(style.top).toBe('32.26%')
    expect(style.width).toBe('100%')
    expect(style.height).toBe('67.74%')
  })

  /**
   * **`_bg` est une transparence, pas une opacité.** Ce test affirmait l'inverse
   * (`background: 40` → `0.4`) : il ne décrivait que notre propre calcul, jamais
   * l'appareil. Les trois valeurs ci-dessous sont, elles, lues sur
   * `docs/reference/captures-air3/vol-thermalassistant-boutonsnavig.png`, une page
   * posée sur une carte — le seul cas où l'erreur se voyait :
   *
   * | `_bg` | ce que montre la capture |
   * |---|---|
   * | `100` | aucun fond peint — le « 0:00 » de `WAirTime` flotte à même la carte |
   * | `40`  | case blanchâtre, la carte transparaît (`WWindSpeed`, `WWindDirection`) |
   * | `0`   | case blanche **opaque** (les deux `WButtonNavig` du bas) |
   */
  it('traduit _bg, qui est une TRANSPARENCE, en opacité de fond', () => {
    const opacity = (background: number): number =>
      widgetStyle({ x1: 0, y1: 0, x2: 1, y2: 1, background }).backgroundOpacity
    expect(opacity(100)).toBe(0)
    expect(opacity(40)).toBeCloseTo(0.6, 10)
    expect(opacity(0)).toBe(1)
  })

  it('range une transparence hors bornes dans 0–1 plutôt que de la laisser filer au CSS', () => {
    expect(backgroundOpacity(-50)).toBe(1)
    expect(backgroundOpacity(300)).toBe(0)
    expect(backgroundOpacity(Number.NaN)).toBe(1)
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
  const doc = parseJson(readFileSync(BACKUP_2026, 'utf8'))
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

  it('pose --xc-title et --xc-page-min sur la page entière, pas sur chaque widget', () => {
    // Correction mesurée sur 2026-08-21_polices-reference.png : la taille des titres ne
    // dépend PAS du widget — voir src/render/textMetrics.ts. Elle est donc posée une
    // seule fois, sur `.xc-page`, et héritée.
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const canvas = element.querySelector('.xc-page') as HTMLElement
    expect(Number(canvas.style.getPropertyValue('--xc-page-min'))).toBe(720)
    expect(Number(canvas.style.getPropertyValue('--xc-title'))).toBeCloseTo(titleFontPx(16 / 9, settings.titleSizePercent), 6)
    for (const widget of element.querySelectorAll('.xc-widget')) {
      expect((widget as HTMLElement).style.getPropertyValue('--xc-title')).toBe('')
    }
  })

  it('pose --xc-w sur chaque widget, pour le garde-fou de largeur des titres', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')] as HTMLElement[]
    // WVarioColumn (landscape[3]) : X1:0, X2:833 — le widget le plus étroit de la page.
    const largeurs = widgets.map(w => Number(w.style.getPropertyValue('--xc-w')))
    expect(Math.min(...largeurs)).toBeCloseTo(widgetWidthPx({ x1: 0, y1: 0, x2: 833, y2: 10000, background: 100 }), 6)
    expect(Math.max(...largeurs)).toBeGreaterThan(Math.min(...largeurs))
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

describe('widgetWidthPx', () => {
  it('vaut une fraction de REFERENCE_WIDTH proportionnelle à la largeur normalisée', () => {
    expect(widgetWidthPx({ x1: 625, y1: 0, x2: 3125, y2: 2414, background: 100 })).toBeCloseTo(320, 5)
  })

  it('ne dépend pas des proportions de la page : la largeur du repère est fixe', () => {
    const box = { x1: 0, y1: 0, x2: 5000, y2: 1000, background: 100 }
    expect(widgetWidthPx(box)).toBeCloseTo(640, 5)
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
  const doc = parseJson(readFileSync(BACKUP_2026, 'utf8'))
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

  it('reporte l’opacité déduite de _bg sur chaque widget', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')] as HTMLElement[]
    const opacity = (rank: number): string =>
      widgets[rank - 1]!.style.getPropertyValue('--xc-bg-opacity')
    // Les rangs de landscape[4], et les trois valeurs de la capture (voir
    // « traduit _bg… » plus haut) : rang 3 `WTime` _bg 20, rang 4 `WSpeed` _bg 40,
    // rang 6 `WAirTime` _bg 100, rang 9 `WButtonNavig` _bg 0.
    expect(opacity(3)).toBe('0.8')
    expect(opacity(4)).toBe('0.6')
    expect(opacity(6)).toBe('0')
    expect(opacity(9)).toBe('1')
  })

  /**
   * Le cas qui prouve tout : un widget posé sur une carte. Sur `landscape[4]`, le
   * `WCompMap` du rang 1 occupe les trois quarts droits de la page et vingt widgets se
   * posent dessus. Avant la correction, les 12 widgets à `_bg: 100` de cette page
   * peignaient un fond blanc PLEIN et effaçaient la carte ; l'appareil, lui, ne peint
   * aucun fond pour eux (capture `vol-thermalassistant-boutonsnavig.png`).
   */
  it('n’efface pas la carte : les widgets à _bg 100 posés dessus ne peignent aucun fond', () => {
    const element = renderPage(page, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')] as HTMLElement[]
    const sansFond = widgets.filter(w => w.style.getPropertyValue('--xc-bg-opacity') === '0')
    expect(sansFond).toHaveLength(12)
    // Et les deux boutons de navigation restent, eux, des cases blanches opaques.
    const opaques = widgets.filter(w => w.style.getPropertyValue('--xc-bg-opacity') === '1')
    expect(opaques).toHaveLength(2)
    for (const opaque of opaques) expect(opaque.querySelector('.xc-button--navig')).not.toBeNull()
  })
})

describe('aucun type n’échappe à son _bg', () => {
  const settings = readRenderSettings(parseJson(readFileSync(BACKUP_2026, 'utf8')))

  function pageWith(shortName: string, background: number, border: boolean): Page {
    return {
      node: { kind: 'object' as const, entries: [] }, className: 'page',
      navigations: { kind: 'none' as const },
      widgets: [{
        node: { kind: 'object' as const, entries: [] }, className: `x.${shortName}`,
        shortName, x1: 0, y1: 0, x2: 10000, y2: 10000, border, background, theme: ''
      }]
    }
  }

  /**
   * Le pansement retiré : `registerTransparent` forçait l'opacité de fond à 0 et
   * supprimait le cadre, quelles que soient les valeurs du fichier. Il ne visait que
   * `WLiveMessage`, dont les 10 occurrences du corpus portent `_bg: 100` — donc aucun
   * fond de toute façon. Il traitait un symptôme de l'inversion de `_bg`.
   */
  it('un type qui ne peint aucun contenu au repos reçoit quand même son fond et son cadre', () => {
    registerBlankAtRest('WEssaiSansDessinCanvas')
    const element = renderPage(pageWith('WEssaiSansDessinCanvas', 0, true), 1, settings, 'fr')
    const el = element.querySelector('.xc-widget') as HTMLElement
    expect(el.style.getPropertyValue('--xc-bg-opacity')).toBe('1')
    expect(el.classList.contains('xc-widget--border')).toBe(true)
  })

  it('et son _bg 100 lui donne un fond nul, comme à tout le monde', () => {
    registerBlankAtRest('WEssaiSansDessinCanvas')
    const element = renderPage(pageWith('WEssaiSansDessinCanvas', 100, false), 1, settings, 'fr')
    const el = element.querySelector('.xc-widget') as HTMLElement
    expect(el.style.getPropertyValue('--xc-bg-opacity')).toBe('0')
    expect(el.classList.contains('xc-widget--border')).toBe(false)
  })

  /** Le `WLiveMessage` réel du corpus : `_bg: 100`, `_border: false` — rien ne change. */
  it('le WLiveMessage du corpus ne peint toujours aucun fond, mais par son _bg', () => {
    const doc = parseJson(readFileSync(BACKUP_2026, 'utf8'))
    const page = readLayout(doc).landscape[4]!
    const element = renderPage(page, 16 / 9, readRenderSettings(doc), 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')] as HTMLElement[]
    const live = widgets.find(w => w.querySelector('.xc-livemsg') !== null)!
    expect(live.style.getPropertyValue('--xc-bg-opacity')).toBe('0')
    expect(live.classList.contains('xc-widget--border')).toBe(false)
  })
})

describe('boutons réels du corpus (intégration)', () => {
  // landscape[3] : deux WButtonBrightness (_bg: 100, _border: false) couvrant la moitié
  // centrale de l'écran — le cas que rendu-observe.md lisait comme « ne dessine rien ».
  // La planche des 75 widgets a tranché autrement (écart 1.6, buttons.ts) : ils
  // dessinent, et s'ils n'apparaissent pas ici c'est qu'un WThermalAssistant de bornes
  // identiques à l'union des deux est dessiné APRÈS eux. On vérifie donc le
  // recouvrement, pas une transparence.
  const doc = parseJson(readFileSync(BACKUP_2026, 'utf8'))
  const settings = readRenderSettings(doc)
  const brightnessPage = readLayout(doc).landscape[3]!
  const navigPage = readLayout(doc).landscape[4]!

  it('WButtonBrightness dessine son pictogramme et n’est plus une case vide', () => {
    const element = renderPage(brightnessPage, 16 / 9, settings, 'fr')
    const boutons = [...element.querySelectorAll('.xc-button--brightness')]
    expect(boutons).toHaveLength(2)
    for (const bouton of boutons) {
      expect(bouton.querySelector('.xc-button__glyph--sun')).not.toBeNull()
    }
  })

  it('la carte qui les recouvre est bien dessinée APRÈS eux — c’est l’ordre, pas le type', () => {
    const element = renderPage(brightnessPage, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')]
    const rangs = widgets
      .map((w, index) => (w.querySelector('.xc-button--brightness') !== null ? index : -1))
      .filter((index) => index >= 0)
    const dernierBouton = rangs[rangs.length - 1] ?? -1
    const carte = widgets.findIndex(w => w.querySelector('.xc-map') !== null)
    expect(dernierBouton).toBeGreaterThanOrEqual(0)
    expect(carte).toBeGreaterThan(dernierBouton)
  })

  it('respecte _border: true du fichier pour WButtonNavig', () => {
    const element = renderPage(navigPage, 16 / 9, settings, 'fr')
    const widgets = [...element.querySelectorAll('.xc-widget')]
    const navigWidgets = widgets.filter(w => w.querySelector('.xc-button--navig') !== null)
    expect(navigWidgets).toHaveLength(2)
    for (const w of navigWidgets) {
      expect(w.classList.contains('xc-widget--border')).toBe(true)
    }
  })
})
