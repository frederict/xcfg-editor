import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readNumber, setLiteral } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { DEVICES } from '../../src/catalog/devices'
import { readableName } from '../../src/catalog/widgetNames'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { gridFor } from '../../src/model/grid'
import { readLayout, type Page } from '../../src/model/layout'
import { pageWidgets, readWidgetBounds, setWidgetBounds, type Bounds } from '../../src/model/mutations'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import {
  applyStructureEdit,
  applyWidgetEdit,
  commitGesture,
  createEditor,
  currentBounds,
  currentBoxes,
  duplicateRect,
  duplicateWidgetAt,
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
  removeWidgetAt,
  resizedRect,
  restackWidget,
  revertStructureEdit,
  revertWidgetEdit,
  sameRect,
  selectionAfterRemoval,
  sizeLabel,
  stackLabel,
  stackTarget,
  structureDescription,
  toolbarLeftPercent,
  toolbarPlacement,
  widgetAtPoint,
  type Editor,
  type Handle,
  type Viewport,
  type WidgetEdit,
  type WidgetStructureEdit
} from '../../src/ui/editor'

/** Le traducteur de **notre prose**, en français : la langue d'écriture du dépôt. */
const tr = makeTranslator('fr', frenchMessages)
import { BACKUP_2026 } from '../fixtures/paths'

const source = readFileSync(BACKUP_2026, 'utf8')

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
    const edit = commitGesture(page, 6, 'move', gestureRect(box, 'move', NO_DELTA, grid), 'fr', tr)

    expect(edit).toBeUndefined()
    expect(serializeJson(document)).toBe(before)
  })

  it('ne modifie rien non plus quand l’aimantation ramène le widget où il était', () => {
    const { page, document } = loadPage(0)
    const before = serializeJson(document)

    // Deux unités : bien en deçà d'une demi-cellule (104 en X), l'aimantation les efface.
    const box = currentBoxes(page)[6]!
    const edit = commitGesture(page, 6, 'move', gestureRect(box, 'move', { x: 2, y: 2 }, grid), 'fr', tr)

    expect(edit).toBeUndefined()
    expect(serializeJson(document)).toBe(before)
  })
})

/* --------------------------------------------------- modification et historique */

describe('modification', () => {
  it('décrit le geste en clair', () => {
    expect(gestureDescription('move', 'WAltitude', 'fr', tr)).toBe('Déplacer Altitude GPS')
    expect(gestureDescription('se', 'WAltitude', 'fr', tr)).toBe('Redimensionner Altitude GPS')
  })

  it('écrit les nouvelles coordonnées et rend de quoi les annuler', () => {
    const { page } = loadPage(0)
    const box = currentBoxes(page)[6]!
    const target = gestureRect(box, 'move', { x: 1000, y: 0 }, grid)

    const edit = commitGesture(page, 6, 'move', target, 'fr', tr)
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
    const edit = commitGesture(page, 6, 'se', resizedRect(box, 'se', { x: 600, y: 600 }, grid), 'fr', tr)!
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
    commitGesture(page, 3, 'move', gestureRect(box, 'move', { x: -1500, y: 0 }, grid), 'fr', tr)

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
    //
    // `\u202f` : l'espace fine insécable qu'`Intl` pose devant l'unité en français, écrite
    // en échappement pour qu'on la voie. C'est elle qui empêche le navigateur de couper la
    // ligne entre le nombre et son unité.
    expect(sizeLabel(rect(0, 0, 10000, 10000), air3, 'landscape', tr)).toBe('155,0 × 87,2\u202fmm')
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
      tr,
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

  /**
   * Le calque se pose sur le gadget **dessiné**, pas sur ses coordonnées brutes : le
   * moteur aimante les bords sur la grille de rendu de XCTrack (51 × 29,
   * `render/canvas.ts`) avant de tracer. Sans cette correction, le cadre de sélection
   * flotterait jusqu'à 12,5 px à côté du gadget qu'il désigne.
   *
   * Ce qui est ÉCRIT ne change pas : c'est la grille d'édition (48 × 29) qui l'aimante.
   */
  it('pose les marques sur les bords dessinés, aimantés sur la grille de rendu', () => {
    const { page, instance } = editor(0)
    instance.element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, clientY: 250, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 500, clientY: 250, bubbles: true }))

    const index = instance.selection()!
    const rect = currentBoxes(page)[index]!
    const marks = instance.element.querySelector('.editor__marks') as HTMLElement
    // Chaque bord tombe sur un multiple exact de 1/51 en X et de 1/29 en Y.
    const gauche = Number.parseFloat(marks.style.left)
    const haut = Number.parseFloat(marks.style.top)
    expect((gauche * 51) / 100).toBeCloseTo(Math.round((gauche * 51) / 100), 6)
    expect((haut * 29) / 100).toBeCloseTo(Math.round((haut * 29) / 100), 6)
    // Et il ne s'en éloigne jamais de plus d'une demi-cellule du rectangle écrit.
    expect(Math.abs(gauche * 100 - rect.x1)).toBeLessThanOrEqual(10000 / 51 / 2 + 1e-6)
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
    expect(badge.textContent).toMatch(/^\d+,\d × \d+,\d\u202fmm$/)
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

/* ==================================================== actions sur la sélection */

function entryCount(node: JsonNode): number {
  return node.kind === 'object' ? node.entries.length : 0
}

/**
 * `Page.widgets` est une photographie parallèle au tableau `widgets` du document. Toute
 * action de structure doit bouger les deux ensemble ; un décalage entre les deux ferait
 * désigner par l'interface un widget qui n'est pas celui qu'elle croit.
 */
function expectInSync(page: Page): void {
  const items = pageWidgets(page.node).items
  expect(page.widgets).toHaveLength(items.length)
  page.widgets.forEach((widget, index) => { expect(widget.node).toBe(items[index]) })
}

describe('rang d’empilement', () => {
  it('avance vers la fin du tableau, recule vers son début', () => {
    expect(stackTarget('raise', 3, 8)).toBe(4)
    expect(stackTarget('lower', 3, 8)).toBe(2)
    expect(stackTarget('front', 3, 8)).toBe(7)
    expect(stackTarget('back', 3, 8)).toBe(0)
  })

  it('rend le rang lui-même quand la course est déjà au bout', () => {
    expect(stackTarget('raise', 7, 8)).toBe(7)
    expect(stackTarget('front', 7, 8)).toBe(7)
    expect(stackTarget('lower', 0, 8)).toBe(0)
    expect(stackTarget('back', 0, 8)).toBe(0)
  })

  it('refuse un rang hors bornes plutôt que de le corriger en silence', () => {
    expect(() => stackTarget('raise', 8, 8)).toThrow()
    expect(() => stackTarget('raise', -1, 8)).toThrow()
  })

  it('dit le rang en clair, les deux extrémités nommées', () => {
    expect(stackLabel(0, 8, tr)).toBe('Rang 1 sur 8, arrière-plan')
    expect(stackLabel(7, 8, tr)).toBe('Rang 8 sur 8, premier plan')
    expect(stackLabel(3, 8, tr)).toBe('Rang 4 sur 8')
    expect(stackLabel(0, 1, tr)).toBe('Seul gadget de la page')
  })

  it('libelle chaque action pour le menu « Annuler … »', () => {
    const name = readableName('WAltitude', 'fr')
    expect(structureDescription('delete', 'WAltitude', 'fr', tr)).toBe(`Supprimer ${name}`)
    expect(structureDescription('duplicate', 'WAltitude', 'fr', tr)).toBe(`Dupliquer ${name}`)
    expect(structureDescription('raise', 'WAltitude', 'fr', tr)).toBe(`Avancer ${name}`)
    expect(structureDescription('lower', 'WAltitude', 'fr', tr)).toBe(`Reculer ${name}`)
    expect(structureDescription('front', 'WAltitude', 'fr', tr)).toBe(`Mettre ${name} au premier plan`)
    expect(structureDescription('back', 'WAltitude', 'fr', tr)).toBe(`Envoyer ${name} à l’arrière-plan`)
  })
})

describe('sélection après suppression', () => {
  it('ne laisse rien de sélectionné quand c’est le widget sélectionné qui part', () => {
    expect(selectionAfterRemoval(8, 3, 3)).toBeUndefined()
  })

  it('suit son widget quand un rang inférieur disparaît', () => {
    expect(selectionAfterRemoval(8, 3, 5)).toBe(4)
  })

  it('ne bouge pas quand c’est un rang supérieur qui disparaît', () => {
    expect(selectionAfterRemoval(8, 5, 3)).toBe(3)
  })

  it('rend toujours un rang valide après coup, jamais hors bornes', () => {
    for (let removed = 0; removed < 8; removed += 1) {
      for (let selected = 0; selected < 8; selected += 1) {
        const after = selectionAfterRemoval(8, removed, selected)
        if (after === undefined) continue
        expect(after).toBeGreaterThanOrEqual(0)
        expect(after).toBeLessThan(7)   // 8 − 1 widgets après suppression
      }
    }
  })
})

describe('emplacement d’une copie', () => {
  it('décale d’une cellule vers le bas-droite, sans toucher à la taille', () => {
    const box = rect(625, 0, 3125, 2414)
    const copy = duplicateRect(box, grid)
    expect(copy.x1).toBe(625 + Math.round(10000 / 48))
    expect(copy.y1).toBe(Math.round(10000 / 29))
    expect(copy.x2 - copy.x1).toBe(box.x2 - box.x1)
    expect(copy.y2 - copy.y1).toBe(box.y2 - box.y1)
  })

  it('se replie vers le haut-gauche quand le coin bas-droit est déjà atteint', () => {
    // WXCAssistant de la page 3 du fichier : collé aux bords droit et bas.
    const box = rect(1250, 0, 10000, 10000)
    const copy = duplicateRect(box, grid)
    expect(copy.x1).toBe(1250 - Math.round(10000 / 48))
    expect(copy.x2).toBe(10000 - Math.round(10000 / 48))
    expect(copy.y1).toBe(0)
  })

  it('laisse la copie sur place quand le widget couvre toute la page', () => {
    expect(duplicateRect(rect(0, 0, 10000, 10000), grid)).toEqual(rect(0, 0, 10000, 10000))
  })

  it('ne produit que des entiers — le format n’accepte rien d’autre', () => {
    const copy = duplicateRect(rect(625, 345, 3125, 2414), grid)
    for (const value of [copy.x1, copy.y1, copy.x2, copy.y2]) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })
})

describe('suppression d’un widget', () => {
  it('rend le document à l’octet près après annulation, paramètres inconnus compris', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)

    // WXCAssistant : 62 clés, dont `faiSectorOutsideStrokeThickness`, `mapWidget_KK7timed`
    // et une vingtaine d'autres que l'outil ne lit jamais. C'est le pire cas du corpus.
    expect(page.widgets[0]!.shortName).toBe('WXCAssistant')
    expect(entryCount(page.widgets[0]!.node)).toBe(62)

    const edit = removeWidgetAt(page, 0, 'fr', tr)
    expect(page.widgets).toHaveLength(7)
    expect(serializeJson(document)).not.toBe(before)

    revertStructureEdit(page, edit)
    expect(serializeJson(document)).toBe(before)
    expect(page.widgets).toHaveLength(8)
    expect(entryCount(page.widgets[0]!.node)).toBe(62)
    expectInSync(page)
  })

  it('se refait à l’identique', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)
    const edit = removeWidgetAt(page, 0, 'fr', tr)
    const after = serializeJson(document)

    revertStructureEdit(page, edit)
    expect(serializeJson(document)).toBe(before)
    applyStructureEdit(page, edit)
    expect(serializeJson(document)).toBe(after)
  })

  it('remet le widget à son rang d’origine, pas à la fin de la pile', () => {
    const { page } = loadPage(0)
    const order = page.widgets.map((widget) => widget.shortName)
    const edit = removeWidgetAt(page, 5, 'fr', tr)
    expect(page.widgets.map((widget) => widget.shortName)).not.toEqual(order)
    revertStructureEdit(page, edit)
    expect(page.widgets.map((widget) => widget.shortName)).toEqual(order)
  })

  it('dit où va la sélection : nulle part si c’était elle, un cran plus bas sinon', () => {
    const { page } = loadPage(2)
    expect(removeWidgetAt(page, 3, 'fr', tr).selection).toBeUndefined()

    const { page: other } = loadPage(2)
    const edit = removeWidgetAt(other, 2, 'fr', tr, 5)
    expect(edit.selection).toBe(4)
    expect(edit.selectionBefore).toBe(5)
  })

  it('garde la photographie de la page et le document en phase', () => {
    const { page } = loadPage(0)
    removeWidgetAt(page, 5, 'fr', tr)
    expectInSync(page)
  })
})

describe('duplication d’un widget', () => {
  it('pose la copie juste devant l’original, décalée', () => {
    const { page } = loadPage(0)
    const before = currentBounds(page, 3)
    const edit = duplicateWidgetAt(page, 3, grid, 'fr', tr)

    expect(edit.index).toBe(4)
    expect(edit.selection).toBe(4)
    expect(page.widgets).toHaveLength(15)
    expect(page.widgets[4]!.shortName).toBe(page.widgets[3]!.shortName)

    const copy = currentBounds(page, 4)
    expect(copy.x1).toBeGreaterThan(before.x1)
    expect(copy.x2 - copy.x1).toBe(before.x2 - before.x1)
    expect(copy.y2 - copy.y1).toBe(before.y2 - before.y1)
    expectInSync(page)
  })

  it('copie toutes les clés, y compris celles que l’outil ne lit jamais', () => {
    const { page } = loadPage(2)
    const edit = duplicateWidgetAt(page, 0, grid, 'fr', tr)
    expect(entryCount(edit.node)).toBe(entryCount(page.widgets[0]!.node))
    expect(entryCount(edit.node)).toBe(62)
  })

  it('produit un widget indépendant : modifier la copie ne touche pas l’original', () => {
    const { page } = loadPage(2)
    const original = page.widgets[0]!.node
    const edit = duplicateWidgetAt(page, 0, grid, 'fr', tr)
    expect(edit.node).not.toBe(original)

    // Une clé qu'aucune partie de l'outil ne connaît : si la copie partageait un nœud
    // avec son modèle, c'est exactement ici que ça se verrait.
    const key = 'faiSectorOutsideStrokeThickness'
    const kept = readNumber(original, key)
    expect(kept).toBeDefined()
    setLiteral(edit.node, key, '42')
    expect(readNumber(edit.node, key)).toBe(42)
    expect(readNumber(original, key)).toBe(kept)

    const bounds = readWidgetBounds(original)
    setWidgetBounds(edit.node, { x1: 100, y1: 100, x2: 900, y2: 900 })
    expect(readWidgetBounds(original)).toEqual(bounds)
  })

  it('s’annule en retirant exactement la copie', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)
    const edit = duplicateWidgetAt(page, 0, grid, 'fr', tr)
    expect(serializeJson(document)).not.toBe(before)
    revertStructureEdit(page, edit)
    expect(serializeJson(document)).toBe(before)
    expectInSync(page)
  })
})

describe('empilement d’un widget', () => {
  it('avancer puis reculer redonne l’ordre initial, à l’octet près', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)

    const up = restackWidget(page, 3, 'raise', 'fr', tr)!
    expect(up.to).toBe(4)
    expect(up.selection).toBe(4)
    expect(serializeJson(document)).not.toBe(before)

    const down = restackWidget(page, 4, 'lower', 'fr', tr)!
    expect(down.to).toBe(3)
    expect(serializeJson(document)).toBe(before)
    expectInSync(page)
  })

  it('ne produit aucune modification enregistrable quand le rang est déjà atteint', () => {
    const { page, document } = loadPage(2)
    const before = serializeJson(document)

    expect(restackWidget(page, 7, 'front', 'fr', tr)).toBeUndefined()
    expect(restackWidget(page, 7, 'raise', 'fr', tr)).toBeUndefined()
    expect(restackWidget(page, 0, 'back', 'fr', tr)).toBeUndefined()
    expect(restackWidget(page, 0, 'lower', 'fr', tr)).toBeUndefined()

    // Pas un octet réécrit : un historique qui enregistrerait ces quatre appels ferait
    // de « Annuler » quatre pressions sans effet visible.
    expect(serializeJson(document)).toBe(before)
  })

  it('s’annule exactement, premier plan et arrière-plan compris', () => {
    for (const action of ['front', 'back'] as const) {
      const { page, document } = loadPage(2)
      const before = serializeJson(document)
      const edit = restackWidget(page, 1, action, 'fr', tr)!
      expect(edit.to).toBe(action === 'front' ? 7 : 0)
      expect(serializeJson(document)).not.toBe(before)
      revertStructureEdit(page, edit)
      expect(serializeJson(document)).toBe(before)
      expectInSync(page)
    }
  })

  it('change bien le rang de dessin, donc ce que le clic attrape', () => {
    const { page } = loadPage(3)
    // Page 4 du fichier : WThermalAssistant (rang 2) recouvre WButtonBrightness (rang 0).
    const point = { x: 5000, y: 2000 }
    expect(page.widgets[widgetAtPoint(currentBoxes(page), point)!]!.shortName)
      .toBe('WThermalAssistant')

    restackWidget(page, 2, 'back', 'fr', tr)
    expect(page.widgets[0]!.shortName).toBe('WThermalAssistant')
    expect(page.widgets[widgetAtPoint(currentBoxes(page), point)!]!.shortName)
      .not.toBe('WThermalAssistant')
  })
})

/* --------------------------------------------- barre d'outils de la sélection */

describe('barre d’outils de la sélection', () => {
  const viewport: Viewport = { left: 0, top: 0, width: 1000, height: 500 }

  /** Page 3 du fichier (index 2) : huit widgets, dont WXCAssistant et ses 62 clés. */
  function editor(pageIndex = 2) {
    const { page, document: json } = loadPage(pageIndex)
    const edits: WidgetEdit[] = []
    const structure: WidgetStructureEdit[] = []
    const selections: Array<number | undefined> = []
    const instance = createEditor({
      page,
      device: air3,
      orientation: 'landscape',
      language: 'fr',
      tr,
      viewport: () => viewport,
      onEdit: (edit) => { edits.push(edit) },
      onStructureEdit: (edit) => { structure.push(edit) },
      onSelectionChange: (index) => { selections.push(index) }
    })
    return { page, json, edits, structure, selections, instance }
  }

  const bar = (instance: Editor): HTMLElement =>
    instance.element.querySelector('.editor__toolbar') as HTMLElement
  const tool = (instance: Editor, name: string): HTMLButtonElement =>
    instance.element.querySelector(`.editor__tool--${name}`) as HTMLButtonElement
  const rankText = (instance: Editor): string =>
    (instance.element.querySelector('.editor__rank') as HTMLElement).textContent ?? ''

  it('n’apparaît qu’avec une sélection', () => {
    const { instance } = editor()
    expect(bar(instance).hidden).toBe(true)
    instance.select(3)
    expect(bar(instance).hidden).toBe(false)
    instance.select(undefined)
    expect(bar(instance).hidden).toBe(true)
  })

  it('affiche le rang courant — la seule chose que l’appareil ne dit nulle part', () => {
    const { instance } = editor()
    instance.select(0)
    expect(rankText(instance)).toBe('Rang 1 sur 8, arrière-plan')
    instance.select(7)
    expect(rankText(instance)).toBe('Rang 8 sur 8, premier plan')
    instance.select(3)
    expect(rankText(instance)).toBe('Rang 4 sur 8')
  })

  it('désactive les mouvements sans effet plutôt que de les laisser muets', () => {
    const { instance } = editor()
    instance.select(7)
    expect(tool(instance, 'raise').disabled).toBe(true)
    expect(tool(instance, 'front').disabled).toBe(true)
    expect(tool(instance, 'lower').disabled).toBe(false)
    expect(tool(instance, 'back').disabled).toBe(false)

    instance.select(0)
    expect(tool(instance, 'lower').disabled).toBe(true)
    expect(tool(instance, 'back').disabled).toBe(true)
    expect(tool(instance, 'raise').disabled).toBe(false)
  })

  it('se nomme en français, au clavier comme à la souris', () => {
    const { instance } = editor()
    instance.select(3)
    expect(bar(instance).getAttribute('aria-label')).toBe('Actions sur le gadget sélectionné')
    expect(tool(instance, 'delete').textContent).toBe('Supprimer')
    expect(tool(instance, 'duplicate').textContent).toBe('Dupliquer')
    expect(tool(instance, 'back').getAttribute('aria-label')).toBe('Envoyer à l’arrière-plan')
    expect(tool(instance, 'front').title).toContain('Ctrl + Maj + Flèche haut')
  })

  /**
   * Les quatre flèches sont le seul endroit de l'outil où un geste tient dans un
   * pictogramme. Un pilote-testeur l'a dit le 2026-08-22 : « les quatre petites flèches —
   * j'ai deviné, je n'ai pas su. » Elles restent des symboles pour une raison de place —
   * la barre est posée SUR le gadget qu'elle sert —, mais alors chacune doit se nommer
   * pour qui ne devine pas : à la synthèse vocale, et au survol.
   *
   * ⚠️ Le test voisin n'en couvrait qu'une sur quatre. Trois pouvaient perdre leur nom
   * sans que rien ne le dise, et un pictogramme muet n'est pas seulement obscur : c'est un
   * bouton qui n'existe pas pour un lecteur d'écran.
   */
  it('nomme les quatre flèches d’empilement, et donne le raccourci de chacune', () => {
    const { instance } = editor()
    instance.select(3)
    const named: ReadonlyArray<readonly [string, string, string]> = [
      ['back', 'Envoyer à l’arrière-plan', 'Ctrl + Maj + Flèche bas'],
      ['lower', 'Reculer d’un rang', 'Ctrl + Flèche bas'],
      ['raise', 'Avancer d’un rang', 'Ctrl + Flèche haut'],
      ['front', 'Mettre au premier plan', 'Ctrl + Maj + Flèche haut']
    ]
    for (const [name, label, keys] of named) {
      const button = tool(instance, name)
      // Le glyphe seul dans le texte : c'est bien un pictogramme qu'on épingle.
      expect(button.textContent?.length, name).toBe(1)
      expect(button.getAttribute('aria-label'), name).toBe(label)
      expect(button.title, name).toBe(`${label} (${keys})`)
    }
  })

  it('supprime au bouton, et ne laisse rien de sélectionné', () => {
    const { page, instance, structure, selections } = editor()
    instance.select(3)
    const doomed = page.widgets[3]!.shortName

    tool(instance, 'delete').click()

    expect(page.widgets).toHaveLength(7)
    expect(page.widgets.map((widget) => widget.shortName)).not.toContain(doomed)
    expect(structure).toHaveLength(1)
    expect(structure[0]!.kind).toBe('remove')
    expect(structure[0]!.description).toMatch(/^Supprimer /)
    expect(instance.selection()).toBeUndefined()
    expect(selections.at(-1)).toBeUndefined()
    expect(bar(instance).hidden).toBe(true)
    expectInSync(page)
  })

  it('la suppression au bouton s’annule à l’octet près', () => {
    const { page, json, instance, structure } = editor()
    const before = serializeJson(json)
    instance.select(0)   // WXCAssistant, 62 clés

    tool(instance, 'delete').click()
    expect(serializeJson(json)).not.toBe(before)

    revertStructureEdit(page, structure[0]!)
    expect(serializeJson(json)).toBe(before)
  })

  it('duplique au bouton et sélectionne aussitôt la copie', () => {
    const { page, instance, structure } = editor()
    instance.select(3)
    const name = page.widgets[3]!.shortName
    const before = currentBounds(page, 3)

    tool(instance, 'duplicate').click()

    expect(page.widgets).toHaveLength(9)
    expect(instance.selection()).toBe(4)
    expect(page.widgets[4]!.shortName).toBe(name)
    expect(currentBounds(page, 4)).not.toEqual(before)
    expect(structure[0]!.kind).toBe('insert')
    expect(rankText(instance)).toBe('Rang 5 sur 9')
    expectInSync(page)
  })

  it('met le rang à jour après un mouvement d’empilement', () => {
    const { instance, structure } = editor()
    instance.select(2)
    expect(rankText(instance)).toBe('Rang 3 sur 8')

    tool(instance, 'front').click()

    expect(instance.selection()).toBe(7)
    expect(rankText(instance)).toBe('Rang 8 sur 8, premier plan')
    expect(structure).toHaveLength(1)
    expect(structure[0]!.kind).toBe('reorder')
  })

  it('n’enregistre rien quand la course est déjà au bout', () => {
    const { json, instance, structure } = editor()
    instance.select(7)
    const before = serializeJson(json)

    expect(instance.restack('front')).toBeUndefined()
    expect(instance.restack('raise')).toBeUndefined()

    expect(structure).toHaveLength(0)
    expect(instance.selection()).toBe(7)
    expect(serializeJson(json)).toBe(before)
  })

  it('un clic sur un bouton ne démarre pas de geste sur le widget du dessous', () => {
    const { json, instance, edits } = editor()
    instance.select(3)
    const before = serializeJson(json)

    const button = tool(instance, 'duplicate')
    button.dispatchEvent(new MouseEvent('pointerdown', {
      clientX: 400, clientY: 200, bubbles: true, cancelable: true
    }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 600, clientY: 300, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 600, clientY: 300, bubbles: true }))

    expect(edits).toHaveLength(0)
    expect((instance.element.querySelector('.editor__preview') as HTMLElement).hidden).toBe(true)
    expect(serializeJson(json)).toBe(before)
  })

  it('supprime à Suppr et duplique à Ctrl + D', () => {
    const { page, instance, structure } = editor()
    instance.select(2)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }))
    expect(page.widgets).toHaveLength(9)
    expect(instance.selection()).toBe(3)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(page.widgets).toHaveLength(8)
    expect(instance.selection()).toBeUndefined()
    expect(structure.map((edit) => edit.kind)).toEqual(['insert', 'remove'])
  })

  it('accepte Cmd aussi bien que Ctrl, et Retour arrière aussi bien que Suppr', () => {
    const { page, instance } = editor()
    instance.select(2)
    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', metaKey: true, bubbles: true }))
    expect(page.widgets).toHaveLength(9)
    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    expect(page.widgets).toHaveLength(8)
  })

  it('change de rang à Ctrl + flèche, jusqu’au bout avec Maj', () => {
    const { page, instance } = editor()
    const name = page.widgets[2]!.shortName
    instance.select(2)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, bubbles: true }))
    expect(instance.selection()).toBe(3)
    expect(page.widgets[3]!.shortName).toBe(name)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp', ctrlKey: true, shiftKey: true, bubbles: true
    }))
    expect(instance.selection()).toBe(7)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', ctrlKey: true, shiftKey: true, bubbles: true
    }))
    expect(instance.selection()).toBe(0)
    expect(page.widgets[0]!.shortName).toBe(name)
  })

  it('ne déplace plus le widget à Ctrl + flèche : la combinaison est à l’empilement', () => {
    const { page, instance, edits } = editor()
    instance.select(2)
    const before = currentBounds(page, 2)

    instance.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, bubbles: true }))

    expect(edits).toHaveLength(0)
    expect(currentBounds(page, 3)).toEqual(before)
  })

  it('ne laisse jamais la sélection hors bornes, jusqu’à vider la page', () => {
    const { page, instance } = editor()

    for (let remaining = page.widgets.length; remaining > 0; remaining -= 1) {
      instance.select(remaining - 1)
      expect(instance.selection()).toBe(remaining - 1)
      instance.remove()
      const after = instance.selection()
      expect(after === undefined || (after >= 0 && after < page.widgets.length)).toBe(true)
    }

    expect(page.widgets).toHaveLength(0)
    expect(instance.selection()).toBeUndefined()
    expect(bar(instance).hidden).toBe(true)
    // Une page vide ne casse rien : ni action, ni redessin.
    expect(instance.remove()).toBeUndefined()
    expect(instance.duplicate()).toBeUndefined()
    expect(instance.restack('front')).toBeUndefined()
    expect(() => instance.refresh()).not.toThrow()
  })

  it('ne fait rien sans sélection', () => {
    const { json, instance, structure } = editor()
    const before = serializeJson(json)
    expect(instance.remove()).toBeUndefined()
    expect(instance.duplicate()).toBeUndefined()
    expect(instance.restack('back')).toBeUndefined()
    expect(structure).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })

  it('ne fait plus rien une fois le calque démonté', () => {
    // Les écoutes du calque partent avec lui ; celles des boutons vivent sur les boutons.
    // Une référence gardée après `destroy()` ne doit pas écrire dans une page que le
    // dessin suivant a déjà remplacée.
    const { json, instance, structure } = editor()
    instance.select(3)
    const before = serializeJson(json)
    const button = tool(instance, 'delete')

    instance.destroy()
    button.click()

    expect(structure).toHaveLength(0)
    expect(serializeJson(json)).toBe(before)
  })
})

/**
 * Placement de la barre d'outils de la sélection. Les chiffres viennent de l'écran : page
 * 1 paysage de la configuration de référence, plaque de 1173 × 661 px (AIR³ 7.2 à 200 %),
 * barre mesurée à 432 × 30 px. La règle tient en une phrase — la barre ne masque jamais le
 * widget qu'elle sert — et se vérifie ici sans mise en page.
 */
describe('placement de la barre d’outils', () => {
  /** La plaque à 200 % ; à 100 % elle vaut la moitié, et c'est le second cas de chaque test. */
  const plate: Viewport = { left: 0, top: 0, width: 1173, height: 661 }
  const halfPlate: Viewport = { left: 0, top: 0, width: 586, height: 330 }
  const BAR_H = 30
  const BAR_W = 432

  /** `WStatusLine`, rang 1 : collée en haut à droite, 12 mm de haut — le cas signalé. */
  const statusLine = { x1: 6042, y1: 0, x2: 10000, y2: 1379 }

  it('passe SOUS la barre d’état plutôt que dedans', () => {
    // Rien au-dessus : elle touche le haut de la plaque. Le seuil d'avant l'envoyait à
    // l'intérieur, où ses 30 px recouvraient les 91 px du widget en entier.
    expect(toolbarPlacement(statusLine, plate, BAR_H)).toBe('below')
    expect(toolbarPlacement(statusLine, halfPlate, BAR_H)).toBe('below')
  })

  it('reste au-dessus d’un widget qui a la place au-dessus de lui', () => {
    // Un widget du bas de page : 330 px de plaque au-dessus de son bord haut.
    expect(toolbarPlacement({ x1: 0, y1: 5000, x2: 3000, y2: 7000 }, plate, BAR_H)).toBe('above')
  })

  it('ne se glisse dedans qu’en dernier recours', () => {
    // Un widget qui prend presque toute la hauteur : 13 px au-dessus, 7 px en dessous.
    expect(toolbarPlacement({ x1: 0, y1: 200, x2: 10000, y2: 9900 }, plate, BAR_H)).toBe('inside')
  })

  it('bascule exactement là où la barre cesse de tenir', () => {
    // 36 px nécessaires (30 de barre, 6 d'écart) sur 661 px de plaque : 544,6 unités.
    expect(toolbarPlacement({ x1: 0, y1: 545, x2: 100, y2: 9000 }, plate, BAR_H)).toBe('above')
    expect(toolbarPlacement({ x1: 0, y1: 544, x2: 100, y2: 9000 }, plate, BAR_H)).toBe('below')
  })

  it('suit le zoom : le même widget change de position d’une échelle à l’autre', () => {
    // 700 unités valent 46 px à 200 % — la barre tient —, 23 px à 100 % — elle ne tient plus.
    const widget = { x1: 0, y1: 700, x2: 3000, y2: 4000 }
    expect(toolbarPlacement(widget, plate, BAR_H)).toBe('above')
    expect(toolbarPlacement(widget, halfPlate, BAR_H)).toBe('below')
  })

  it('retombe au-dessus quand la plaque n’a pas encore de hauteur', () => {
    const nowhere: Viewport = { left: 0, top: 0, width: 0, height: 0 }
    expect(toolbarPlacement(statusLine, nowhere, BAR_H)).toBe('above')
  })

  it('laisse la barre à l’abscisse du widget tant qu’elle rentre', () => {
    expect(toolbarLeftPercent(statusLine, plate, BAR_W)).toBeCloseTo(60.42, 2)
  })

  it('rentre la barre dans la plaque plutôt que de la laisser déborder à droite', () => {
    // À 100 %, la plaque ne fait plus que 586 px : la barre commencerait à 354 et
    // finirait 200 px dehors. Elle glisse à 148 px — son bord droit à six pixels de celui
    // de la plaque, le même écart qu'elle garde des bords du widget.
    const left = toolbarLeftPercent(statusLine, halfPlate, BAR_W)
    expect((left / 100) * halfPlate.width).toBeCloseTo(148, 0)
    expect((left / 100) * halfPlate.width + BAR_W).toBeLessThanOrEqual(halfPlate.width)
  })

  it('colle la barre à gauche quand elle est plus large que la plaque entière', () => {
    expect(toolbarLeftPercent(statusLine, { left: 0, top: 0, width: 300, height: 200 }, BAR_W)).toBe(0)
  })

  it('s’en tient à l’abscisse du widget quand la plaque n’a pas de largeur', () => {
    expect(toolbarLeftPercent(statusLine, { left: 0, top: 0, width: 0, height: 0 }, BAR_W)).toBe(60.42)
  })
})
