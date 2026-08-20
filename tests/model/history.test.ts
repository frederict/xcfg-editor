import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getIndex } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import {
  bringWidgetToFront,
  insertWidget,
  moveWidgetBy,
  moveWidgetToPage,
  pageWidgets,
  pagesNode,
  reorderWidget,
  removeWidget,
  setPageClass,
  setWidgetBounds,
  type Orientation
} from '../../src/model/mutations'
import { createHistory, HISTORY_LIMIT } from '../../src/model/history'

const FILE = '/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg'
const source = readFileSync(FILE, 'utf8')

const page = (document: JsonNode, orientation: Orientation, index: number): JsonNode =>
  getIndex(pagesNode(document, orientation), index)!
const widgetAt = (pageNode: JsonNode, index: number): JsonNode =>
  getIndex(pageWidgets(pageNode), index)!

describe('empiler, annuler, rétablir', () => {
  it('empile une modification, annule, rétablit', () => {
    const history = createHistory(parseJson(source))

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 50, 50)
    history.record('Déplacer un widget')

    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
    const afterMutation = serializeJson(history.current())
    expect(afterMutation).not.toBe(source)

    const restored = history.undo()
    expect(serializeJson(restored)).toBe(source)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(true)

    const redone = history.redo()
    expect(serializeJson(redone)).toBe(afterMutation)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
  })

  it('une modification après une annulation coupe la branche de rétablissement', () => {
    const history = createHistory(parseJson(source))

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 10, 0)
    history.record('Premier déplacement')
    history.undo()

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 0, 20)
    history.record('Second déplacement')

    expect(history.canRedo()).toBe(false)
    expect(history.redoDescription()).toBeUndefined()
    expect(() => history.redo()).toThrow()
  })

  it('décrit ce qui serait annulé ou rétabli', () => {
    const history = createHistory(parseJson(source))
    expect(history.undoDescription()).toBeUndefined()
    expect(history.redoDescription()).toBeUndefined()

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 5, 0)
    history.record('Déplacer Altitude GPS')
    expect(history.undoDescription()).toBe('Déplacer Altitude GPS')
    expect(history.redoDescription()).toBeUndefined()

    history.undo()
    expect(history.undoDescription()).toBeUndefined()
    expect(history.redoDescription()).toBe('Déplacer Altitude GPS')
  })

  it('refuse d’annuler ou de rétablir hors bornes', () => {
    const history = createHistory(parseJson(source))
    expect(() => history.undo()).toThrow()
    expect(() => history.redo()).toThrow()
  })

  it('refuse un libellé vide', () => {
    const history = createHistory(parseJson(source))
    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 1, 0)
    expect(() => history.record('  ')).toThrow()
  })
})

describe('document modifié ou non', () => {
  it('isDirty distingue un document intact d’un document modifié', () => {
    const history = createHistory(parseJson(source))
    expect(history.isDirty()).toBe(false)

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 4), 1, 0)
    history.record('Déplacer')
    expect(history.isDirty()).toBe(true)

    history.undo()
    expect(history.isDirty()).toBe(false)

    history.redo()
    expect(history.isDirty()).toBe(true)
  })
})

describe('borne de profondeur', () => {
  it('purge les pas les plus anciens au-delà de la limite, sans affecter le document courant', () => {
    const history = createHistory(parseJson(source), 3)
    const widget = (): JsonNode => widgetAt(page(history.current(), 'landscape', 0), 4)

    for (let i = 0; i < 5; i++) {
      moveWidgetBy(widget(), 1, 0)
      history.record(`pas ${i}`)
    }

    // 5 pas empilés, limite à 3 : au plus 3 annulations possibles.
    let steps = 0
    while (history.canUndo()) { history.undo(); steps++ }
    expect(steps).toBe(3)
    // La purge interdit de revenir à l'origine : le document reste marqué modifié.
    expect(history.isDirty()).toBe(true)

    // Le document courant, lui, n'a pas été affecté par la purge de l'historique : le
    // widget déplacé cinq fois reste lisible normalement.
    expect(() => widget()).not.toThrow()
  })

  it('la limite par défaut couvre largement une session de quelques dizaines de modifications', () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(50)
  })
})

describe('fidélité à l’octet près', () => {
  it('annuler une suite variée de mutations rend le document identique à l’octet près', () => {
    const history = createHistory(parseJson(source))

    moveWidgetBy(widgetAt(page(history.current(), 'portrait', 0), 1), 100, -100)
    history.record('Déplacer un widget portrait')

    bringWidgetToFront(page(history.current(), 'landscape', 0), 0)
    history.record('Amener au premier plan')

    setWidgetBounds(widgetAt(page(history.current(), 'landscape', 4), 0), { x2: 5000 })
    history.record('Redimensionner')

    reorderWidget(page(history.current(), 'landscape', 4), 1, 3)
    history.record('Réordonner')

    const removed = removeWidget(page(history.current(), 'portrait', 1), 0)
    history.record('Retirer un widget')
    insertWidget(page(history.current(), 'portrait', 1), removed, 0)
    history.record('Réinsérer le widget')

    moveWidgetToPage(page(history.current(), 'landscape', 4), 2, page(history.current(), 'landscape', 0), 0)
    history.record('Déplacer vers une autre page')

    setPageClass(page(history.current(), 'portrait', 0), 'WPEmpty')
    history.record('Changer la classe de la page')

    expect(serializeJson(history.current())).not.toBe(source)
    expect(history.isDirty()).toBe(true)

    // C'est le test central du projet : tout défaire doit rendre le texte source
    // rigoureusement identique, comparaison de texte et non de structure.
    while (history.canUndo()) history.undo()

    expect(serializeJson(history.current())).toBe(source)
    expect(history.isDirty()).toBe(false)
  })

  it('annuler puis rétablir redonne l’état modifié, à l’octet près', () => {
    const history = createHistory(parseJson(source))

    moveWidgetBy(widgetAt(page(history.current(), 'portrait', 0), 1), 30, -30)
    history.record('Déplacer')
    bringWidgetToFront(page(history.current(), 'landscape', 4), 0)
    history.record('Premier plan')

    const modified = serializeJson(history.current())

    history.undo()
    history.undo()
    history.redo()
    history.redo()

    expect(serializeJson(history.current())).toBe(modified)
  })

  it('chaque état intermédiaire, pas seulement les deux extrémités, se retrouve à l’octet près', () => {
    // Une seule annulation doit rendre l'état d'APRÈS la première mutation SEULE, pas
    // un état qui porterait encore la seconde : un instantané partagé par référence
    // entre deux pas laisserait passer ce défaut sans que le cycle complet le révèle.
    const history = createHistory(parseJson(source))

    moveWidgetBy(widgetAt(page(history.current(), 'portrait', 0), 1), 30, -30)
    history.record('Déplacer')
    const afterFirst = serializeJson(history.current())

    bringWidgetToFront(page(history.current(), 'landscape', 4), 0)
    history.record('Premier plan')
    const afterSecond = serializeJson(history.current())

    expect(serializeJson(history.undo())).toBe(afterFirst)
    expect(serializeJson(history.undo())).toBe(source)
    expect(serializeJson(history.redo())).toBe(afterFirst)
    expect(serializeJson(history.redo())).toBe(afterSecond)
  })
})

describe('clés inconnues', () => {
  it('un widget aux clés inconnues survit à un cycle annulation/rétablissement complet', () => {
    const history = createHistory(parseJson(source))
    const exotic = parseJson('{\n  "CLASS": "org.xcontest.XCTrack.widget.w.WFutur",'
      + '\n  "X1": 0,\n  "Y1": 0,\n  "X2": 1250,\n  "Y2": 1379,'
      + '\n  "inventeEn2027": {\n    "seuil": 3.0,\n    "couleur": -27091\n  }\n}')
    const exoticText = serializeJson(exotic)

    insertWidget(page(history.current(), 'landscape', 0), exotic, 0)
    history.record('Insérer un widget exotique')

    moveWidgetBy(widgetAt(page(history.current(), 'landscape', 0), 0), 500, 500)
    history.record('Déplacer le widget exotique')

    while (history.canUndo()) history.undo()
    while (history.canRedo()) history.redo()

    const survivor = widgetAt(page(history.current(), 'landscape', 0), 0)
    // Seules les coordonnées ont bougé : le reste, y compris les clés que l'outil ne
    // comprend pas, doit être reproduit caractère pour caractère.
    expect(serializeJson(survivor)).not.toBe(exoticText)
    expect(serializeJson(survivor)).toContain(
      '"inventeEn2027": {\n    "seuil": 3.0,\n    "couleur": -27091\n  }'
    )
  })
})
