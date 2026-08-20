import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { DEVICES } from '../../src/catalog/devices'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { gridFor } from '../../src/model/grid'
import { readLayout, type Page } from '../../src/model/layout'
import { readWidgetBounds, type Bounds } from '../../src/model/mutations'
import {
  applyWidgetEdit,
  commitGesture,
  createEditor,
  currentBoxes,
  fingerRect,
  gestureDescription,
  gestureRect,
  handleAtPoint,
  handleCenter,
  handleEdges,
  handleTolerance,
  isInMoveGrip,
  movedRect,
  pixelToPage,
  pixelToPageDelta,
  resizedRect,
  revertWidgetEdit,
  sameRect,
  sizeLabel,
  widgetAtPoint,
  type Handle,
  type Viewport
} from '../../src/ui/editor'

const FILE = '/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg'
const source = readFileSync(FILE, 'utf8')

const air3 = DEVICES.find((d) => d.id === 'air3-7.2')!
/** 48 × 29 : la seule grille mesurée sur l'appareil réel, en paysage. */
const grid = gridFor(air3, 'landscape')

/** Une page fraîche du corpus, avec son document — chaque test part d'un état intact. */
function loadPage(index: number): { page: Page; document: ReturnType<typeof parseJson> } {
  const document = parseJson(source)
  const page = readLayout(document).landscape[index]!
  return { page, document }
}

const rect = (x1: number, y1: number, x2: number, y2: number): Bounds => ({ x1, y1, x2, y2 })
const NO_DELTA = { x: 0, y: 0 }

describe('la grille de référence', () => {
  it('est bien le maillage 48 × 29 mesuré sur l’AIR³ 7.2 en paysage', () => {
    expect(grid).toEqual({ cols: 48, rows: 29 })
  })
})

/* ------------------------------------------------------------------------ sélection */

describe('sélection', () => {
  it('choisit le dernier du tableau quand deux widgets se superposent', () => {
    // Page 4 du fichier (index 3), « Assistant de thermique ». Le point choisi tombe à la
    // fois dans WButtonBrightness (rang 0) et dans WThermalAssistant (rang 2) — un
    // chevauchement réel du corpus, pas un cas fabriqué.
    const { page } = loadPage(3)
    const boxes = currentBoxes(page)
    const point = { x: 5000, y: 2000 }

    const covering = boxes
      .map((box, index) => ({ box, index }))
      .filter(({ box }) => point.x >= box.x1 && point.x <= box.x2 && point.y >= box.y1 && point.y <= box.y2)
      .map(({ index }) => index)
    expect(covering).toContain(0)
    expect(covering).toContain(2)

    // L'ordre du tableau est l'ordre de dessin : le dernier est au-dessus, il gagne.
    expect(widgetAtPoint(boxes, point)).toBe(Math.max(...covering))
    expect(page.widgets[widgetAtPoint(boxes, point)!]!.shortName).toBe('WThermalAssistant')
  })

  it('choisit le calque du dessus sur une page couverte par une carte', () => {
    // Page 5 (index 4) : WCompMap au fond (rang 0), WLiveMessage par-dessus (rang 18).
    const { page } = loadPage(4)
    const boxes = currentBoxes(page)
    expect(widgetAtPoint(boxes, { x: 5000, y: 9000 })).toBe(18)
  })

  it('ne rend rien hors de tout widget', () => {
    const boxes = [rect(2000, 2000, 3000, 3000)]
    expect(widgetAtPoint(boxes, { x: 100, y: 100 })).toBeUndefined()
    expect(widgetAtPoint([], { x: 100, y: 100 })).toBeUndefined()
  })

  it('ignore un rectangle vide ou inversé, qui piégerait le clic', () => {
    const boxes = [rect(1000, 1000, 3000, 3000), rect(2000, 2000, 2000, 2500), rect(2600, 2600, 2200, 2200)]
    expect(widgetAtPoint(boxes, { x: 2000, y: 2200 })).toBe(0)
  })

  it('compte les bords comme appartenant au widget', () => {
    const boxes = [rect(0, 0, 1000, 1000), rect(1000, 0, 2000, 1000)]
    // Frontière commune : le plus en avant l'emporte, jamais « aucun ».
    expect(widgetAtPoint(boxes, { x: 1000, y: 500 })).toBe(1)
  })
})

/* -------------------------------------------------------------------------- poignées */

describe('poignées', () => {
  const box = rect(2000, 2000, 6000, 5000)
  const tolerance = { x: 200, y: 200 }

  it('place les quatre équerres aux coins et les segments aux milieux', () => {
    expect(handleCenter(box, 'nw')).toEqual({ x: 2000, y: 2000 })
    expect(handleCenter(box, 'ne')).toEqual({ x: 6000, y: 2000 })
    expect(handleCenter(box, 'sw')).toEqual({ x: 2000, y: 5000 })
    expect(handleCenter(box, 'se')).toEqual({ x: 6000, y: 5000 })
    expect(handleCenter(box, 'n')).toEqual({ x: 4000, y: 2000 })
    expect(handleCenter(box, 's')).toEqual({ x: 4000, y: 5000 })
    expect(handleCenter(box, 'w')).toEqual({ x: 2000, y: 3500 })
    expect(handleCenter(box, 'e')).toEqual({ x: 6000, y: 3500 })
    expect(handleCenter(box, 'move')).toEqual({ x: 4000, y: 3500 })
  })

  it('reconnaît la poignée sous le curseur', () => {
    expect(handleAtPoint(box, { x: 2050, y: 2050 }, tolerance)).toBe('nw')
    expect(handleAtPoint(box, { x: 5950, y: 4950 }, tolerance)).toBe('se')
    expect(handleAtPoint(box, { x: 4000, y: 2050 }, tolerance)).toBe('n')
    expect(handleAtPoint(box, { x: 6000, y: 3500 }, tolerance)).toBe('e')
  })

  it('ne rend aucune poignée au centre — c’est l’ellipse qui y prend la main', () => {
    expect(handleAtPoint(box, { x: 4000, y: 3500 }, tolerance)).toBeUndefined()
    expect(isInMoveGrip(box, { x: 4000, y: 3500 })).toBe(true)
    expect(isInMoveGrip(box, { x: 2100, y: 2100 })).toBe(false)
  })

  it('rétrécit la tolérance sur un widget étroit, sinon rien n’y serait déplaçable', () => {
    // 400 unités de large : une tolérance de 200 recouvrirait les deux bords à la fois.
    const narrow = rect(1000, 1000, 1400, 5000)
    expect(handleAtPoint(narrow, { x: 1200, y: 3000 }, tolerance)).toBeUndefined()
    expect(isInMoveGrip(narrow, { x: 1200, y: 3000 })).toBe(true)
  })
})

/* ---------------------------------------------------------------------- déplacement */

describe('déplacement', () => {
  it('aimante la position sur la grille 48 × 29', () => {
    const start = rect(625, 2414, 3125, 4828)
    const moved = movedRect(start, { x: 300, y: 200 }, grid)

    // Une coordonnée valide est round(k × 10000 / 48) en X, round(k × 10000 / 29) en Y.
    expect(moved.x1).toBe(Math.round(4 * (10000 / 48)))
    expect(moved.y1).toBe(Math.round(8 * (10000 / 29)))
    expect(moved.x1 % 1).toBe(0)
    expect(moved.y1 % 1).toBe(0)
  })

  it('conserve exactement la taille du widget', () => {
    const start = rect(625, 2414, 3125, 4828)
    const moved = movedRect(start, { x: 900, y: -700 }, grid)
    expect(moved.x2 - moved.x1).toBe(start.x2 - start.x1)
    expect(moved.y2 - moved.y1).toBe(start.y2 - start.y1)
  })

  it('borne un geste qui sortirait de la page au lieu de le refuser', () => {
    const start = rect(8000, 8000, 9000, 9000)
    const moved = movedRect(start, { x: 9000, y: 9000 }, grid)

    expect(moved.x2).toBe(10000)
    expect(moved.y2).toBe(10000)
    expect(moved.x2 - moved.x1).toBe(1000)
    expect(moved.y2 - moved.y1).toBe(1000)
    expect(moved.x1).toBeGreaterThanOrEqual(0)
    expect(moved.y1).toBeGreaterThanOrEqual(0)
  })

  it('borne aussi vers le haut et la gauche', () => {
    const start = rect(600, 400, 2000, 1400)
    const moved = movedRect(start, { x: -9000, y: -9000 }, grid)
    expect(moved.x1).toBe(0)
    expect(moved.y1).toBe(0)
    expect(moved.x2).toBe(1400)
    expect(moved.y2).toBe(1000)
  })

  it('reste dans la page pour tous les widgets du corpus, quel que soit le geste', () => {
    const { page } = loadPage(0)
    for (const box of currentBoxes(page)) {
      for (const delta of [{ x: 9999, y: 9999 }, { x: -9999, y: -9999 }, { x: 4000, y: -4000 }]) {
        const moved = movedRect(box, delta, grid)
        expect(moved.x1).toBeGreaterThanOrEqual(0)
        expect(moved.y1).toBeGreaterThanOrEqual(0)
        expect(moved.x2).toBeLessThanOrEqual(10000)
        expect(moved.y2).toBeLessThanOrEqual(10000)
        expect(moved.x2 - moved.x1).toBe(box.x2 - box.x1)
        expect(moved.y2 - moved.y1).toBe(box.y2 - box.y1)
      }
    }
  })
})

/* ------------------------------------------------------------- redimensionnement */

describe('redimensionnement', () => {
  const box = rect(2500, 2069, 6250, 6207)

  it('l’équerre haut-gauche ne bouge que x1 et y1', () => {
    const resized = resizedRect(box, 'nw', { x: -400, y: -400 }, grid)
    expect(resized.x2).toBe(box.x2)
    expect(resized.y2).toBe(box.y2)
    expect(resized.x1).toBeLessThan(box.x1)
    expect(resized.y1).toBeLessThan(box.y1)
    expect(handleEdges('nw')).toEqual(['x1', 'y1'])
  })

  it('chaque poignée agit sur les bonnes coordonnées, et sur elles seules', () => {
    const cases: Array<[Handle, ReadonlyArray<keyof Bounds>]> = [
      ['nw', ['x1', 'y1']], ['ne', ['x2', 'y1']], ['sw', ['x1', 'y2']], ['se', ['x2', 'y2']],
      ['n', ['y1']], ['s', ['y2']], ['w', ['x1']], ['e', ['x2']]
    ]
    for (const [handle, moving] of cases) {
      const resized = resizedRect(box, handle, { x: 500, y: 500 }, grid)
      for (const field of ['x1', 'y1', 'x2', 'y2'] as const) {
        if (moving.includes(field)) expect(resized[field]).not.toBe(box[field])
        else expect(resized[field]).toBe(box[field])
      }
    }
  })

  it('aimante le bord tiré sur la grille', () => {
    const resized = resizedRect(box, 'se', { x: 700, y: 700 }, grid)
    expect(resized.x2).toBe(Math.round(Math.round(6950 / (10000 / 48)) * (10000 / 48)))
    expect(resized.y2).toBe(Math.round(Math.round(6907 / (10000 / 29)) * (10000 / 29)))
  })

  it('n’inverse jamais le widget, si loin qu’on tire', () => {
    for (const handle of ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'] as const) {
      for (const delta of [{ x: 20000, y: 20000 }, { x: -20000, y: -20000 }]) {
        const resized = resizedRect(box, handle, delta, grid)
        expect(resized.x2).toBeGreaterThan(resized.x1)
        expect(resized.y2).toBeGreaterThan(resized.y1)
        expect(resized.x1).toBeGreaterThanOrEqual(0)
        expect(resized.y1).toBeGreaterThanOrEqual(0)
        expect(resized.x2).toBeLessThanOrEqual(10000)
        expect(resized.y2).toBeLessThanOrEqual(10000)
      }
    }
  })

  it('ne réduit pas un widget à néant : une cellule au minimum', () => {
    const shrunk = resizedRect(box, 'nw', { x: 20000, y: 20000 }, grid)
    expect(shrunk.x2 - shrunk.x1).toBeGreaterThanOrEqual(Math.round(10000 / grid.cols) - 1)
    expect(shrunk.y2 - shrunk.y1).toBeGreaterThanOrEqual(Math.round(10000 / grid.rows) - 1)
  })

  it('reste valide sur tous les widgets du corpus, quel que soit le geste', () => {
    const { page } = loadPage(1)
    for (const widget of currentBoxes(page)) {
      for (const handle of ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'] as const) {
        for (const delta of [{ x: 15000, y: 15000 }, { x: -15000, y: -15000 }, { x: 300, y: -300 }]) {
          const resized = resizedRect(widget, handle, delta, grid)
          expect(resized.x1).toBeLessThan(resized.x2)
          expect(resized.y1).toBeLessThan(resized.y2)
          expect(resized.x1).toBeGreaterThanOrEqual(0)
          expect(resized.x2).toBeLessThanOrEqual(10000)
        }
      }
    }
  })
})

/* ---------------------------------------------------------------------- geste nul */

describe('geste nul', () => {
  it('rend le rectangle d’origine, poignée par poignée', () => {
    // Volontairement hors grille : même dans ce cas, un geste nul ne doit rien aimanter.
    const offGrid = rect(1234, 2345, 5678, 6789)
    for (const handle of ['move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'] as const) {
      expect(gestureRect(offGrid, handle, NO_DELTA, grid)).toEqual(offGrid)
    }
  })

  it('ne modifie pas un octet du document', () => {
    const { page, document } = loadPage(0)
    const before = serializeJson(document)

    const box = currentBoxes(page)[6]!
    const edit = commitGesture(page, 6, 'move', gestureRect(box, 'move', NO_DELTA, grid), 'fr')

    expect(edit).toBeUndefined()
    expect(serializeJson(document)).toBe(before)
  })

  it('ne modifie rien non plus quand l’aimantation ramène le widget où il était', () => {
    const { page, document } = loadPage(0)
    const before = serializeJson(document)

    // Deux unités : bien en deçà d'une demi-cellule (104 en X), l'aimantation les efface.
    const box = currentBoxes(page)[6]!
    const edit = commitGesture(page, 6, 'move', gestureRect(box, 'move', { x: 2, y: 2 }, grid), 'fr')

    expect(edit).toBeUndefined()
    expect(serializeJson(document)).toBe(before)
  })
})

/* --------------------------------------------------- modification et historique */

describe('modification', () => {
  it('décrit le geste en clair', () => {
    expect(gestureDescription('move', 'WAltitude', 'fr')).toBe('Déplacer Altitude GPS')
    expect(gestureDescription('se', 'WAltitude', 'fr')).toBe('Redimensionner Altitude GPS')
  })

  it('écrit les nouvelles coordonnées et rend de quoi les annuler', () => {
    const { page } = loadPage(0)
    const box = currentBoxes(page)[6]!
    const target = gestureRect(box, 'move', { x: 1000, y: 0 }, grid)

    const edit = commitGesture(page, 6, 'move', target, 'fr')
    expect(edit).toBeDefined()
    expect(edit!.widgetIndex).toBe(6)
    expect(edit!.before).toEqual(box)
    expect(edit!.after).toEqual(target)
    expect(edit!.description).toBe('Déplacer Vitesse verticale')
    expect(readWidgetBounds(page.widgets[6]!.node)).toEqual(target)
  })

  it('se rejoue et se défait — le point d’accroche de l’historique', () => {
    const { page, document } = loadPage(0)
    const before = serializeJson(document)

    const box = currentBoxes(page)[6]!
    const edit = commitGesture(page, 6, 'se', resizedRect(box, 'se', { x: 600, y: 600 }, grid), 'fr')!
    const after = serializeJson(document)
    expect(after).not.toBe(before)

    revertWidgetEdit(page, edit)
    expect(serializeJson(document)).toBe(before)

    applyWidgetEdit(page, edit)
    expect(serializeJson(document)).toBe(after)
  })

  it('ne réécrit que les coordonnées, jamais le reste du widget', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)

    const box = currentBoxes(page)[3]!
    commitGesture(page, 3, 'move', gestureRect(box, 'move', { x: -1500, y: 0 }, grid), 'fr')

    // Le nombre de lignes et de clés est intact : seule une valeur numérique a changé.
    expect(serializeJson(document).split('\n').length).toBe(before.split('\n').length)
    expect(serializeJson(document).match(/"CLASS"/g)!.length).toBe(before.match(/"CLASS"/g)!.length)
  })
})

/* ------------------------------------------------------------------- pixels et cotes */

describe('conversion des pixels', () => {
  const viewport: Viewport = { left: 100, top: 50, width: 1000, height: 500 }

  it('ramène un point de la fenêtre dans le repère de la page', () => {
    expect(pixelToPage(100, 50, viewport)).toEqual({ x: 0, y: 0 })
    expect(pixelToPage(1100, 550, viewport)).toEqual({ x: 10000, y: 10000 })
    expect(pixelToPage(600, 300, viewport)).toEqual({ x: 5000, y: 5000 })
  })

  it('survit à un rendu de taille nulle — c’est ce que rend happy-dom', () => {
    const nothing: Viewport = { left: 0, top: 0, width: 0, height: 0 }
    expect(pixelToPage(42, 42, nothing)).toEqual({ x: 0, y: 0 })
    expect(pixelToPageDelta(42, 42, nothing)).toEqual({ x: 0, y: 0 })
    expect(handleTolerance(nothing)).toEqual({ x: 0, y: 0 })
  })

  it('exprime la taille en millimètres, pas en coordonnées', () => {
    // Un widget qui couvre toute la dalle mesure la dalle : 155,0 × 87,2 mm.
    expect(sizeLabel(rect(0, 0, 10000, 10000), air3, 'landscape')).toBe('155,0 × 87,2 mm')
  })
})

describe('rectangle du doigt', () => {
  it('suit le pointeur sans aimantation — c’est lui qui montre l’écart', () => {
    const box = rect(2000, 2000, 6000, 5000)
    const finger = fingerRect(box, 'se', { x: 137, y: 91 })
    expect(finger.x2).toBe(6137)
    expect(finger.y2).toBe(5091)
    expect(sameRect(finger, gestureRect(box, 'se', { x: 137, y: 91 }, grid))).toBe(false)
  })

  it('reste borné à la page lui aussi', () => {
    const box = rect(2000, 2000, 6000, 5000)
    expect(fingerRect(box, 'move', { x: 99999, y: 99999 })).toEqual(rect(6000, 7000, 10000, 10000))
    expect(fingerRect(box, 'se', { x: -99999, y: -99999 }).x2).toBeGreaterThan(box.x1)
  })
})

/* ------------------------------------------------------------------ calque d'édition */

/** Un geste complet au pointeur, sur un calque dont on fournit les dimensions. */
function drag(element: HTMLElement, from: [number, number], to: [number, number]): void {
  element.dispatchEvent(new MouseEvent('pointerdown', {
    clientX: from[0], clientY: from[1], bubbles: true, cancelable: true
  }))
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: to[0], clientY: to[1], bubbles: true }))
  window.dispatchEvent(new MouseEvent('pointerup', { clientX: to[0], clientY: to[1], bubbles: true }))
}

describe('calque d’édition', () => {
  // 1000 × 500 px : happy-dom ne met rien en page, ces dimensions sont FOURNIES.
  const viewport: Viewport = { left: 0, top: 0, width: 1000, height: 500 }

  function editor(pageIndex = 0) {
    const { page, document: json } = loadPage(pageIndex)
    const edits: Array<{ description: string; widgetIndex: number }> = []
    const instance = createEditor({
      page,
      device: air3,
      orientation: 'landscape',
      language: 'fr',
      viewport: () => viewport,
      onEdit: (edit) => { edits.push(edit) }
    })
    return { page, json, edits, instance }
  }

  it('sélectionne le widget cliqué et affiche ses marques', () => {
    const { page, instance } = editor(0)
    // (500, 250) px → (5000, 5000) en coordonnées de page.
    instance.element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, clientY: 250, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 500, clientY: 250, bubbles: true }))

    const expected = widgetAtPoint(currentBoxes(page), { x: 5000, y: 5000 })
    expect(instance.selection()).toBe(expected)

    const marks = instance.element.querySelector('.editor__marks') as HTMLElement
    expect(marks.hidden).toBe(false)
    expect(marks.querySelectorAll('.editor__corner')).toHaveLength(4)
    expect(marks.querySelectorAll('.editor__side')).toHaveLength(4)
    expect(marks.querySelectorAll('.editor__grip')).toHaveLength(1)
  })

  it('déplace le widget saisi et signale la modification', () => {
    const { page, edits, instance } = editor(0)
    const before = currentBoxes(page)

    // WVarioColumn (rang 7) occupe la colonne de gauche : (30, 250) px tombe dedans.
    drag(instance.element, [30, 250], [230, 250])

    expect(edits).toHaveLength(1)
    expect(edits[0]!.description).toMatch(/^Déplacer /)
    const index = edits[0]!.widgetIndex
    const after = readWidgetBounds(page.widgets[index]!.node)
    expect(after.x1).toBeGreaterThan(before[index]!.x1)
    expect(after.x2 - after.x1).toBe(before[index]!.x2 - before[index]!.x1)
    // Aimanté : la nouvelle abscisse est un multiple de la cellule.
    expect(after.x1).toBe(Math.round(Math.round(after.x1 / (10000 / 48)) * (10000 / 48)))
  })

  it('redimensionne depuis une équerre et affiche la cote en millimètres', () => {
    const { page, edits, instance } = editor(0)
    const index = 13   // WThermalAssistant, 6042 4828 → 10000 10000
    instance.select(index)
    const start = readWidgetBounds(page.widgets[index]!.node)

    // Équerre haut-gauche : (604,2 ; 241,4) px.
    instance.element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 604, clientY: 241, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 550, clientY: 200, bubbles: true }))

    const badge = instance.element.querySelector('.editor__badge') as HTMLElement
    expect(badge.hidden).toBe(false)
    expect(badge.textContent).toMatch(/^\d+,\d × \d+,\d mm$/)
    const preview = instance.element.querySelector('.editor__preview') as HTMLElement
    expect(preview.hidden).toBe(false)

    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 550, clientY: 200, bubbles: true }))

    expect(edits).toHaveLength(1)
    expect(edits[0]!.description).toMatch(/^Redimensionner /)
    const after = readWidgetBounds(page.widgets[index]!.node)
    expect(after.x1).toBeLessThan(start.x1)
    expect(after.y1).toBeLessThan(start.y1)
    expect(after.x2).toBe(start.x2)
    expect(after.y2).toBe(start.y2)
    expect(badge.hidden).toBe(true)
  })

  it('ne modifie rien quand le pointeur ne bouge pas', () => {
    const { json, edits, instance } = editor(0)
    const before = serializeJson(json)
    drag(instance.element, [500, 250], [500, 250])
    expect(edits).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })

  it('ne modifie rien quand le clic tombe hors de tout widget', () => {
    const { json, edits, instance } = editor(2)
    const before = serializeJson(json)
    // Les huit widgets de cette page se partagent toute la surface : le seul point qui
    // ne touche aucun widget est hors de la plaque — un clic parti de la marge.
    drag(instance.element, [-40, -40], [-10, -10])
    expect(instance.selection()).toBeUndefined()
    expect(edits).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })

  it('abandonne le geste sur Échap sans rien écrire', () => {
    const { json, edits, instance } = editor(0)
    const before = serializeJson(json)

    instance.element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, clientY: 250, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 250, bubbles: true }))
    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(edits).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })

  it('déplace d’une cellule à la flèche du clavier', () => {
    const { page, edits, instance } = editor(0)
    const index = 6
    instance.select(index)
    const before = readWidgetBounds(page.widgets[index]!.node)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

    const after = readWidgetBounds(page.widgets[index]!.node)
    expect(after.x1).toBe(Math.round((Math.round(before.x1 / (10000 / 48)) + 1) * (10000 / 48)))
    expect(after.x2 - after.x1).toBe(before.x2 - before.x1)
    expect(edits).toHaveLength(1)
  })

  it('redimensionne d’une cellule à Maj + flèche', () => {
    const { page, edits, instance } = editor(0)
    const index = 6
    instance.select(index)
    const before = readWidgetBounds(page.widgets[index]!.node)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))

    const after = readWidgetBounds(page.widgets[index]!.node)
    expect(after.x1).toBe(before.x1)
    expect(after.x2).toBeGreaterThan(before.x2)
    expect(edits[0]!.description).toMatch(/^Redimensionner /)
  })

  it('se démonte proprement', () => {
    const { json, edits, instance } = editor(0)
    const before = serializeJson(json)
    instance.destroy()
    drag(instance.element, [30, 250], [230, 250])
    expect(edits).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })
})
