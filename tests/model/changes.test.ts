import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getMember, insertLiteral, removeMember, setLiteral, setString
} from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { computeChanges, sameJson, type DocumentChanges } from '../../src/model/changes'
import {
  cloneNode, createPage, duplicateWidget, insertPage, insertWidget, moveWidgetBy,
  moveWidgetToPage, pageWidgets, pagesNode, readWidgetBounds, removePage, removeWidget,
  reorderPage, reorderWidget, setPageClass, setPageNavigations, setWidgetBounds
} from '../../src/model/mutations'
import { BACKUP_2026, FORMES_PRESERVEES, GSON_2022, PAGES_2026 } from '../fixtures/paths'

function open(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

/** Le document d'origine et sa copie vivante — la paire que l'application tient. */
function couple(path: string): [JsonNode, JsonNode] {
  const original = open(path)
  return [original, cloneNode(original)]
}

function widgetsOf(document: JsonNode, orientation: 'portrait' | 'landscape', rank: number) {
  return pageWidgets(pagesNode(document, orientation).items[rank - 1]!)
}

/**
 * L'invariant du module, vérifié sur **chaque** scénario : le relevé et l'égalité des
 * deux documents ne peuvent pas se contredire. C'est ce qui prouve qu'il compare deux
 * états et ne compte pas des gestes — un journal, lui, n'aurait aucune raison de
 * retomber à zéro après un aller-retour.
 */
function checked(before: JsonNode, after: JsonNode): DocumentChanges {
  const changes = computeChanges(before, after)
  expect(changes.identical).toBe(serializeJson(before) === serializeJson(after))
  expect(changes.counts.total === 0).toBe(changes.identical)
  // La soupape ne doit jamais s'ouvrir sur un geste que l'outil sait faire.
  expect(changes.unexplained).toBe(false)
  return changes
}

describe('sameJson', () => {
  it('équivaut exactement à l’égalité du texte réécrit', () => {
    const paths = [BACKUP_2026, PAGES_2026, FORMES_PRESERVEES, GSON_2022]
    for (const path of paths) {
      const [before, after] = couple(path)
      expect(sameJson(before, after)).toBe(true)
      expect(serializeJson(before)).toBe(serializeJson(after))
    }
  })

  it('distingue `3.0` de `3`, que la valeur soit la même ou non', () => {
    expect(sameJson(parseJson('{"a": 3.0}'), parseJson('{"a": 3}'))).toBe(false)
    expect(sameJson(parseJson('{"a": 3.0}'), parseJson('{"a": 3.0}'))).toBe(true)
  })

  it('distingue deux objets qui ne rangent pas leurs lignes dans le même ordre', () => {
    expect(sameJson(parseJson('{"a": 1, "b": 2}'), parseJson('{"b": 2, "a": 1}'))).toBe(false)
  })
})

describe('un document qu’on n’a pas touché', () => {
  it('ne rend aucun écart, et le dit', () => {
    for (const path of [BACKUP_2026, PAGES_2026, FORMES_PRESERVEES, GSON_2022]) {
      const changes = checked(...couple(path))
      expect(changes.identical).toBe(true)
      expect(changes.counts.total).toBe(0)
      expect(changes.pages).toEqual([])
      expect(changes.preferences).toEqual([])
      expect(changes.other).toEqual([])
      expect(changes.reordered).toBe(false)
    }
  })

  it('ne rend rien non plus après un aller-retour — c’est tout le sujet', () => {
    const [before, after] = couple(BACKUP_2026)
    const widget = widgetsOf(after, 'landscape', 1).items.find((node) => {
      const bounds = readWidgetBounds(node)
      return bounds.x1 >= 1000 && bounds.y1 >= 1000 && bounds.x2 <= 9000 && bounds.y2 <= 9000
    })!
    // Dix déplacements qui reviennent à leur point de départ : un journal en compterait
    // dix, un constat n'en voit aucun.
    for (let step = 0; step < 10; step++) moveWidgetBy(widget, 100, 100)
    for (let step = 0; step < 10; step++) moveWidgetBy(widget, -100, -100)
    const changes = checked(before, after)
    expect(changes.counts.total).toBe(0)
    expect(changes.identical).toBe(true)
  })

  it('ne rend rien après un ajout de page suivi de son retrait', () => {
    const [before, after] = couple(BACKUP_2026)
    insertPage(after, 'landscape', createPage('WPEmpty'), 2)
    expect(checked(before, after).counts.pagesAdded).toBe(1)
    removePage(after, 'landscape', 2)
    expect(checked(before, after).counts.total).toBe(0)
  })
})

describe('les gadgets', () => {
  it('voit un gadget redimensionné, et lui seul', () => {
    const [before, after] = couple(BACKUP_2026)
    setWidgetBounds(widgetsOf(after, 'landscape', 1).items[0]!, { y2: 5000 })
    const changes = checked(before, after)

    expect(changes.counts.widgetsChanged).toBe(1)
    expect(changes.counts.widgetsAdded).toBe(0)
    expect(changes.counts.pagesChanged).toBe(1)
    const page = changes.pages[0]!
    expect(page.kind).toBe('kept')
    expect(page.orientation).toBe('landscape')
    expect(page.toRank).toBe(1)
    const widget = page.widgets[0]!
    expect(widget.kind).toBe('kept')
    expect(widget.reshaped).toBe(true)
    expect(widget.restacked).toBe(false)
    expect(widget.settings).toEqual([])
  })

  it('voit un réglage de gadget, nommé par sa ligne du fichier', () => {
    const [before, after] = couple(BACKUP_2026)
    const widget = widgetsOf(after, 'landscape', 1).items[0]!
    setLiteral(widget, '_bg', '50')
    const changes = checked(before, after)

    const touched = changes.pages[0]!.widgets[0]!
    expect(touched.reshaped).toBe(false)
    expect(touched.settings).toEqual([{ key: '_bg', kind: 'changed' }])
  })

  it('distingue un réglage ajouté, un réglage changé et un réglage retiré', () => {
    const [before, after] = couple(BACKUP_2026)
    const widget = widgetsOf(after, 'landscape', 1).items[0]!
    setLiteral(widget, '_bg', '50')
    insertLiteral(widget, '_inventedByTheTest', 'true')
    removeMember(widget, '_border')
    const kinds = checked(before, after).pages[0]!.widgets[0]!.settings
      .map((setting) => `${setting.key}:${setting.kind}`)
      .sort()
    expect(kinds).toEqual(['_bg:changed', '_border:removed', '_inventedByTheTest:added'])
  })

  it('compte un gadget ajouté sans compter ses réglages', () => {
    const [before, after] = couple(BACKUP_2026)
    const widgets = widgetsOf(after, 'landscape', 1)
    insertWidget(
      pagesNode(after, 'landscape').items[0]!,
      duplicateWidget(widgets.items[0]!, { x1: 0, y1: 0, x2: 1000, y2: 1000 })
    )
    const changes = checked(before, after)

    expect(changes.counts.widgetsAdded).toBe(1)
    expect(changes.counts.widgetsChanged).toBe(0)
    expect(changes.counts.widgetsRemoved).toBe(0)
    const added = changes.pages[0]!.widgets.find((widget) => widget.kind === 'added')!
    expect(added.settings).toEqual([])
    expect(added.shortName).toBe('WStatusLine')
  })

  it('ne dit « déplacé » que du gadget qui a vraiment changé de rang', () => {
    const [before, after] = couple(BACKUP_2026)
    const page = pagesNode(after, 'landscape').items[1]!
    const count = pageWidgets(page).items.length
    expect(count).toBeGreaterThan(3)
    // Le premier passe au-dessus de tous les autres : lui seul a bougé, les autres ont
    // glissé d'un cran. Un relevé qui compterait les glissements en annoncerait `count`.
    reorderWidget(page, 0, count - 1)
    const changes = checked(before, after)

    expect(changes.counts.widgetsChanged).toBe(1)
    const moved = changes.pages[0]!.widgets[0]!
    expect(moved.restacked).toBe(true)
    expect(moved.fromRank).toBe(1)
    expect(moved.toRank).toBe(count)
  })

  it('ne dit « déplacé » d’aucun gadget quand on en retire un devant', () => {
    const [before, after] = couple(BACKUP_2026)
    const page = pagesNode(after, 'landscape').items[1]!
    removeWidget(page, 0)
    const changes = checked(before, after)

    expect(changes.counts.widgetsRemoved).toBe(1)
    expect(changes.counts.widgetsChanged).toBe(0)
    expect(changes.pages[0]!.widgets.every((widget) => !widget.restacked)).toBe(true)
  })

  it('lit un gadget changé de page comme un retrait et un ajout, sur les deux pages', () => {
    const [before, after] = couple(BACKUP_2026)
    const source = pagesNode(after, 'landscape').items[0]!
    const target = pagesNode(after, 'landscape').items[1]!
    moveWidgetToPage(source, 0, target)
    const changes = checked(before, after)

    expect(changes.counts.widgetsRemoved).toBe(1)
    expect(changes.counts.widgetsAdded).toBe(1)
    expect(changes.counts.pagesChanged).toBe(2)
  })
})

describe('les pages', () => {
  it('voit une page ajoutée sans compter les gadgets qu’elle porte', () => {
    const [before, after] = couple(BACKUP_2026)
    const page = createPage('WPEmpty')
    insertWidget(page, cloneNode(widgetsOf(after, 'landscape', 1).items[0]!))
    insertPage(after, 'landscape', page, 1)
    const changes = checked(before, after)

    expect(changes.counts.pagesAdded).toBe(1)
    expect(changes.counts.widgetsAdded).toBe(0)
    const added = changes.pages.find((entry) => entry.kind === 'added')!
    expect(added.toRank).toBe(2)
    expect(added.widgetCount).toBe(1)
    expect(added.widgets).toEqual([])
  })

  it('voit une page retirée et dit combien de gadgets partent avec elle', () => {
    const [before, after] = couple(BACKUP_2026)
    const carried = pageWidgets(pagesNode(after, 'landscape').items[1]!).items.length
    removePage(after, 'landscape', 1)
    const changes = checked(before, after)

    expect(changes.counts.pagesRemoved).toBe(1)
    expect(changes.counts.widgetsRemoved).toBe(0)
    expect(changes.counts.pagesChanged).toBe(0)
    const removed = changes.pages.find((entry) => entry.kind === 'removed')!
    expect(removed.fromRank).toBe(2)
    expect(removed.widgetCount).toBeGreaterThan(0)
    expect(carried).toBeGreaterThan(0)
  })

  it('ne dit « déplacée » que de la page qu’on a vraiment déplacée', () => {
    const [before, after] = couple(BACKUP_2026)
    const count = pagesNode(after, 'landscape').items.length
    expect(count).toBe(5)
    reorderPage(after, 'landscape', 0, 4)
    const changes = checked(before, after)

    expect(changes.counts.pagesChanged).toBe(1)
    const moved = changes.pages[0]!
    expect(moved.moved).toBe(true)
    expect(moved.fromRank).toBe(1)
    expect(moved.toRank).toBe(5)
    expect(moved.widgets).toEqual([])
  })

  it('voit le type d’une page vide changer, sans la déclarer retirée puis ajoutée', () => {
    const [before, after] = couple(BACKUP_2026)
    insertPage(after, 'portrait', createPage('WPEmpty'), 0)
    const reference = checked(before, after)
    expect(reference.counts.pagesAdded).toBe(1)

    const [origin, current] = couple(BACKUP_2026)
    insertPage(origin, 'portrait', createPage('WPEmpty'), 0)
    insertPage(current, 'portrait', createPage('WPEmpty'), 0)
    setPageClass(pagesNode(current, 'portrait').items[0]!, 'WPCompetition')
    const changes = checked(origin, current)

    expect(changes.counts.pagesAdded).toBe(0)
    expect(changes.counts.pagesRemoved).toBe(0)
    expect(changes.counts.pagesChanged).toBe(1)
    expect(changes.pages[0]!.classChange).toEqual({ from: 'WPEmpty', to: 'WPCompetition' })
  })

  it('voit les navigations d’une page changer', () => {
    const [before, after] = couple(BACKUP_2026)
    setPageNavigations(pagesNode(after, 'landscape').items[0]!, { kind: 'none' })
    const changes = checked(before, after)

    expect(changes.counts.pagesChanged).toBe(1)
    expect(changes.pages[0]!.navigationsChanged).toBe(true)
    expect(changes.pages[0]!.widgets).toEqual([])
  })
})

describe('les réglages généraux', () => {
  it('voit un réglage modifié, nommé par sa ligne du fichier', () => {
    const [before, after] = couple(BACKUP_2026)
    setString(getMember(after, 'preferences')!, 'Pilot.Name', '"Autre"')
    const changes = checked(before, after)

    expect(changes.preferences).toEqual([{ key: 'Pilot.Name', kind: 'changed' }])
    expect(changes.counts.preferences).toBe(1)
    expect(changes.counts.pagesChanged).toBe(0)
  })

  it('voit un réglage retiré — ce que fait le nettoyage des lignes périmées', () => {
    const [before, after] = couple(BACKUP_2026)
    removeMember(getMember(after, 'preferences')!, 'Pilot.Name')
    expect(checked(before, after).preferences).toEqual([{ key: 'Pilot.Name', kind: 'removed' }])
  })

  it('compte sept réglages comme sept, jamais comme les gestes qui les ont posés', () => {
    const [before, after] = couple(BACKUP_2026)
    const preferences = getMember(after, 'preferences')!
    const keys = ['Pilot.Name', 'Glider.Name', 'SafeSky.Enabled']
    for (let pass = 0; pass < 4; pass++) {
      for (const key of keys) setString(preferences, key, `"valeur ${pass}"`)
    }
    const changes = checked(before, after)
    expect(changes.counts.preferences).toBe(3)
  })

  it('voit les autres lignes de premier niveau', () => {
    const [before, after] = couple(BACKUP_2026)
    setLiteral(getMember(after, 'info')!, 'proUpTo', '1')
    const changes = checked(before, after)

    expect(changes.other).toEqual([{ key: 'info', kind: 'changed' }])
    expect(changes.counts.other).toBe(1)
  })
})

describe('l’écart, tel que les deux écrans l’annoncent', () => {
  it('additionne les trois familles en un seul total', () => {
    const [before, after] = couple(BACKUP_2026)
    setString(getMember(after, 'preferences')!, 'Pilot.Name', '"Autre"')
    setWidgetBounds(widgetsOf(after, 'landscape', 1).items[0]!, { y2: 4000 })
    insertPage(after, 'landscape', createPage('WPEmpty'), 5)
    const changes = checked(before, after)

    expect(changes.counts.pagesAdded).toBe(1)
    expect(changes.counts.pagesChanged).toBe(1)
    expect(changes.counts.widgetsChanged).toBe(1)
    expect(changes.counts.preferences).toBe(1)
    expect(changes.counts.total).toBe(4)
  })

  it('rend les pages courantes dans l’ordre du fichier, les retirées ensuite', () => {
    const [before, after] = couple(BACKUP_2026)
    removePage(after, 'landscape', 0)
    setPageNavigations(pagesNode(after, 'landscape').items[2]!, { kind: 'none' })
    const kinds = checked(before, after).pages.map((page) => page.kind)
    expect(kinds).toEqual(['kept', 'removed'])
  })

  it('ne se laisse pas berner par un fichier aux formes rares', () => {
    const [before, after] = couple(FORMES_PRESERVEES)
    const changes = checked(before, after)
    expect(changes.identical).toBe(true)
    expect(changes.counts.total).toBe(0)
  })
})

describe('la soupape d’honnêteté', () => {
  it('refuse d’annoncer un document intact quand il ne l’est pas', () => {
    // Une forme qu'aucun geste de l'outil ne produit : le `layout` prend une clé de plus.
    const before = parseJson('{"layout": {"portrait": [], "landscape": []}}')
    const after = parseJson('{"layout": {"portrait": [], "landscape": [], "extra": 1}}')
    const changes = computeChanges(before, after)
    expect(changes.identical).toBe(false)
    expect(changes.unexplained).toBe(true)
    expect(changes.counts.total).toBeGreaterThan(0)
  })

  it('voit les mêmes lignes rangées dans un autre ordre', () => {
    const before = parseJson('{"preferences": {"a": 1, "b": 2}}')
    const after = parseJson('{"preferences": {"b": 2, "a": 1}}')
    const changes = computeChanges(before, after)
    expect(changes.identical).toBe(false)
    expect(changes.reordered).toBe(true)
    expect(changes.preferences).toEqual([])
    expect(changes.counts.total).toBe(1)
  })

  it('compare les lignes doublées une à une, sans se contenter de la dernière', () => {
    const before = parseJson('{"preferences": {"a": 1, "a": 2}}')
    const after = parseJson('{"preferences": {"a": 9, "a": 2}}')
    const changes = computeChanges(before, after)
    expect(changes.preferences).toEqual([{ key: 'a', kind: 'changed' }])
    expect(changes.counts.total).toBe(1)
  })
})
