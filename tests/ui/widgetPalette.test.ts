import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { decode, getMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { DEVICES } from '../../src/catalog/devices'
import { readLayout } from '../../src/model/layout'
import { gridFor, NORMALIZED_MAX } from '../../src/model/grid'
import { insertWidget, pageWidgets, readWidgetBounds } from '../../src/model/mutations'
import { readWidget } from '../../src/model/widget'
import {
  buildPaletteEntries,
  buildWidget,
  centeredBounds,
  createWidgetNode,
  newWidgetBounds,
  renderWidgetPalette,
  NEW_WIDGET_CELLS,
  NOT_OFFERED_BY_DEVICE,
  WIDGET_CLASS_PREFIX,
  type PaletteEntry
} from '../../src/ui/widgetPalette'

/**
 * La palette se juge sur un fichier réel : ce qu'on veut vérifier, c'est qu'un widget
 * dupliqué depuis les octets écrits par l'appareil en ressort intact, et qu'un widget neuf
 * tombe exactement là où l'appareil l'a posé.
 */
const FILE = '/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg'
const source = readFileSync(FILE, 'utf8')

const AIR3 = DEVICES[0]!

function document(): JsonNode {
  return parseJson(source)
}

/** Tous les widgets de la configuration, dans l'ordre du fichier. */
function allWidgets(doc: JsonNode): JsonNode[] {
  const layout = readLayout(doc)
  return [...layout.landscape, ...layout.portrait].flatMap((page) => page.widgets.map((w) => w.node))
}

function entryFor(entries: PaletteEntry[], shortName: string): PaletteEntry {
  const entry = entries.find((candidate) => candidate.shortName === shortName)
  if (entry === undefined) throw new Error(`pas d'entrée ${shortName}`)
  return entry
}

function texts(root: HTMLElement, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((node) => node.textContent ?? '')
}

/** Les lignes visibles de la palette, par nom court. */
function visibleEntries(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>('.palette__entry')]
    .filter((row) => !row.hidden)
    .map((row) => row.dataset.widget ?? '')
}

describe('la liste des types', () => {
  it('donne les libellés français officiels, et le nom court de chaque type', () => {
    const entries = buildPaletteEntries(allWidgets(document()))

    expect(entryFor(entries, 'WCompass').label).toBe('Boussole et vent')
    expect(entryFor(entries, 'WCompassDigital').label).toBe('Boussole électronique')
    expect(entryFor(entries, 'WStatusLine').label).toBe("Barre d'état")
    expect(entryFor(entries, 'WThermalAssistant').label).toBe('Assistant thermique')
    expect(entryFor(entries, 'WLogPeek').label).toBe('Queue du journal')
  })

  it('suit la langue demandée', () => {
    const entries = buildPaletteEntries([], 'en')
    expect(entryFor(entries, 'WCompass').label).toBe('Compass and wind')
    expect(entryFor(entries, 'WStatusLine').label).toBe('Status Line')
  })

  it('propose les 75 types de la liste native, et écarte les 9 que l’appareil ne montre pas', () => {
    const entries = buildPaletteEntries([])

    // 84 types au catalogue, moins les 9 relevés comme absents de l'écran d'ajout (§ 3.2/3.3).
    expect(entries).toHaveLength(75)
    for (const excluded of NOT_OFFERED_BY_DEVICE) {
      expect(entries.some((entry) => entry.shortName === excluded)).toBe(false)
    }
  })

  it('n’écarte pas un type non proposé par l’appareil s’il est déjà dans la configuration', () => {
    const debug = parseJson('{"CLASS": "org.xcontest.XCTrack.widget.w.WDebugFPS", ' +
      '"X1": 0, "Y1": 0, "X2": 1000, "Y2": 1000, "_border": false, "_bg": 100, "_theme": ""}')
    const entries = buildPaletteEntries([debug])

    const entry = entryFor(entries, 'WDebugFPS')
    expect(entry.origin).toBe('duplicate')
    expect(entries).toHaveLength(76)
  })

  it('range les types duplicables en tête, puis les types à créer', () => {
    const entries = buildPaletteEntries(allWidgets(document()))
    const firstCreate = entries.findIndex((entry) => entry.origin === 'create')

    expect(firstCreate).toBeGreaterThan(0)
    expect(entries.slice(0, firstCreate).every((entry) => entry.origin === 'duplicate')).toBe(true)
    expect(entries.slice(firstCreate).every((entry) => entry.origin === 'create')).toBe(true)
  })

  it('compte les exemplaires et retient le premier comme modèle', () => {
    const widgets = allWidgets(document())
    const entries = buildPaletteEntries(widgets)
    const compass = entryFor(entries, 'WCompass')

    expect(compass.count).toBe(widgets.filter((w) => readWidget(w).shortName === 'WCompass').length)
    expect(compass.count).toBeGreaterThan(1)
    expect(compass.model).toBe(widgets.find((w) => readWidget(w).shortName === 'WCompass'))
  })

  it('marque comme « à créer » un type absent de la configuration', () => {
    const entries = buildPaletteEntries(allWidgets(document()))
    const entry = entryFor(entries, 'WAirHumidity')

    expect(entry.origin).toBe('create')
    expect(entry.count).toBe(0)
    expect(entry.model).toBeUndefined()
    expect(entry.className).toBe(`${WIDGET_CLASS_PREFIX}WAirHumidity`)
  })
})

describe('deux types, un seul libellé', () => {
  /**
   * « Luminosité de l'écran » désigne deux widgets distincts sur l'appareil (§ 3.2) :
   * `WBrightnessInfo` sous *Système* et `WButtonBrightness` sous *Boutons d'actions*. Une
   * palette indexée par libellé les confondrait.
   */
  it('les garde distincts, et le signale', () => {
    const entries = buildPaletteEntries([])
    const info = entryFor(entries, 'WBrightnessInfo')
    const button = entryFor(entries, 'WButtonBrightness')

    expect(info.label).toBe(button.label)
    expect(info.label).toBe("Luminosité de l'écran")
    expect(info.shortName).not.toBe(button.shortName)
    expect(info.className).not.toBe(button.className)
    expect(info.ambiguousLabel).toBe(true)
    expect(button.ambiguousLabel).toBe(true)
    expect(entryFor(entries, 'WCompass').ambiguousLabel).toBe(false)
  })

  it('les rend en deux lignes distinctes, chacune portant son nom court', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })
    const rows = [...palette.element.querySelectorAll<HTMLElement>('.palette__entry')]
      .filter((row) => row.querySelector('.palette__name')?.textContent === "Luminosité de l'écran")

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.dataset.widget)).toEqual(['WBrightnessInfo', 'WButtonBrightness'])
    expect(rows.map((row) => row.querySelector('.palette__short')?.textContent))
      .toEqual(['WBrightnessInfo', 'WButtonBrightness'])
    expect(rows.every((row) => row.dataset.ambiguous === 'true')).toBe(true)
  })
})

describe('la recherche', () => {
  it('trouve « boussole » en tapant « bous », sans accent ni casse', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })

    palette.filter('bous')
    expect(visibleEntries(palette.element)).toEqual(['WCompassDigital', 'WCompass'])

    palette.filter('BOUS')
    expect(visibleEntries(palette.element)).toEqual(['WCompassDigital', 'WCompass'])
  })

  it('ignore les accents dans les deux sens', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })

    // « Boussole électronique » se trouve sans l'accent…
    palette.filter('electronique')
    expect(visibleEntries(palette.element)).toEqual(['WCompassDigital'])

    // …et « Barre d'état » se trouve avec.
    palette.filter('état')
    expect(visibleEntries(palette.element)).toContain('WStatusLine')
  })

  it('trouve aussi par nom de classe', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })

    palette.filter('WCompass')
    expect(visibleEntries(palette.element)).toEqual(['WCompassDigital', 'WCompass'])

    palette.filter('WOptiUnfinishedTriangle')
    expect(visibleEntries(palette.element)).toEqual(['WOptiUnfinishedTriangle'])

    palette.filter('org.xcontest.XCTrack.widget.w.WQNH')
    expect(visibleEntries(palette.element)).toEqual(['WQNH'])
  })

  it('masque les en-têtes de groupe devenus vides, et le dit quand rien ne reste', () => {
    const palette = renderWidgetPalette({
      existing: allWidgets(document()), device: AIR3, orientation: 'landscape'
    })
    const heads = (): string[] => [...palette.element.querySelectorAll<HTMLElement>('.palette__group')]
      .filter((head) => !head.hidden)
      .map((head) => head.dataset.origin ?? '')
    const empty = palette.element.querySelector<HTMLElement>('.palette__empty')!

    expect(heads()).toEqual(['duplicate', 'create'])
    expect(empty.hidden).toBe(true)

    // « humidité » n'existe que parmi les types absents de cette configuration.
    palette.filter('humidite')
    expect(heads()).toEqual(['create'])
    expect(empty.hidden).toBe(true)

    palette.filter('zzz')
    expect(visibleEntries(palette.element)).toEqual([])
    expect(heads()).toEqual([])
    expect(empty.hidden).toBe(false)

    palette.filter('')
    expect(heads()).toEqual(['duplicate', 'create'])
    expect(empty.hidden).toBe(true)
  })

  it('se pilote aussi depuis le champ de recherche', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })
    const search = palette.element.querySelector<HTMLInputElement>('.palette__search')!

    search.value = 'bous'
    search.dispatchEvent(new Event('input'))
    expect(visibleEntries(palette.element)).toEqual(['WCompassDigital', 'WCompass'])
  })
})

describe('la géométrie d’un widget neuf', () => {
  /**
   * La mesure de référence : une **Boussole et vent** créée sur l'AIR³ 7.2 en paysage est
   * arrivée en `4375, 3793, 5625, 5862` (§ 3.4 du relevé).
   */
  it('retrouve à l’unité près les coordonnées relevées sur l’appareil', () => {
    expect(newWidgetBounds(AIR3, 'landscape')).toEqual({
      x1: 4375, y1: 3793, x2: 5625, y2: 5862
    })
  })

  it('fait 6 × 6 cellules, centrées', () => {
    const grid = gridFor(AIR3, 'landscape')
    const bounds = newWidgetBounds(AIR3, 'landscape')
    const cell = { x: NORMALIZED_MAX / grid.cols, y: NORMALIZED_MAX / grid.rows }

    expect(Math.round((bounds.x2 - bounds.x1) / cell.x)).toBe(NEW_WIDGET_CELLS)
    expect(Math.round((bounds.y2 - bounds.y1) / cell.y)).toBe(NEW_WIDGET_CELLS)
    // Centré : autant de cellules à gauche qu'à droite, à une demi-cellule près.
    expect(Math.abs(bounds.x1 - (NORMALIZED_MAX - bounds.x2))).toBeLessThanOrEqual(cell.x + 1)
    expect(Math.abs(bounds.y1 - (NORMALIZED_MAX - bounds.y2))).toBeLessThanOrEqual(cell.y + 1)
  })

  it('pose des coordonnées aimantées sur tous les gabarits et les deux orientations', () => {
    for (const device of DEVICES) {
      for (const orientation of ['landscape', 'portrait'] as const) {
        const grid = gridFor(device, orientation)
        const bounds = newWidgetBounds(device, orientation)

        for (const [value, cells] of [
          [bounds.x1, grid.cols], [bounds.x2, grid.cols],
          [bounds.y1, grid.rows], [bounds.y2, grid.rows]
        ] as const) {
          const index = Math.round((value * cells) / NORMALIZED_MAX)
          expect(value, `${device.id}/${orientation}`).toBe(Math.round((index * NORMALIZED_MAX) / cells))
        }

        expect(bounds.x2).toBeGreaterThan(bounds.x1)
        expect(bounds.y2).toBeGreaterThan(bounds.y1)
        expect(bounds.x1).toBeGreaterThanOrEqual(0)
        expect(bounds.y2).toBeLessThanOrEqual(NORMALIZED_MAX)
      }
    }
  })

  it('ne déborde pas d’une grille plus petite que six cellules', () => {
    expect(centeredBounds({ cols: 4, rows: 3 })).toEqual({ x1: 0, y1: 0, x2: 10000, y2: 10000 })
    expect(centeredBounds({ cols: 1, rows: 1 })).toEqual({ x1: 0, y1: 0, x2: 10000, y2: 10000 })
  })
})

describe('la création d’un type absent', () => {
  it('écrit les huit clés universelles, dans l’ordre de XCTrack, et rien d’autre', () => {
    const node = createWidgetNode('WAirHumidity', { x1: 4375, y1: 3793, x2: 5625, y2: 5862 })

    expect(node.kind).toBe('object')
    expect(serializeJson(node)).toBe([
      '{',
      '  "CLASS": "org.xcontest.XCTrack.widget.w.WAirHumidity",',
      '  "X1": 4375,',
      '  "Y1": 3793,',
      '  "X2": 5625,',
      '  "Y2": 5862,',
      '  "_border": false,',
      '  "_bg": 100,',
      '  "_theme": ""',
      '}'
    ].join('\n'))
  })

  it('pose les valeurs universelles relevées sur une boussole neuve', () => {
    const widget = readWidget(createWidgetNode('WQNH', newWidgetBounds(AIR3, 'landscape')))

    expect(widget.border).toBe(false)
    expect(widget.background).toBe(100)
    expect(widget.theme).toBe('')
  })

  it('accepte une classe complète telle quelle — un type inconnu n’est pas refusé', () => {
    const node = createWidgetNode('org.xcontest.XCTrack.widget.w.WVersionFuture',
      { x1: 0, y1: 0, x2: 100, y2: 100 })
    expect(readWidget(node).className).toBe('org.xcontest.XCTrack.widget.w.WVersionFuture')
  })

  it('produit un nœud que le modèle relit et que les mutations acceptent', () => {
    const doc = document()
    const page = readLayout(doc).landscape[0]!.node
    const before = pageWidgets(page).items.length

    const entry = entryFor(buildPaletteEntries(allWidgets(doc)), 'WAirHumidity')
    const choice = buildWidget(entry, newWidgetBounds(AIR3, 'landscape'))
    const at = insertWidget(page, choice.node)

    expect(at).toBe(before)
    expect(pageWidgets(page).items).toHaveLength(before + 1)
    expect(readWidgetBounds(choice.node)).toEqual({ x1: 4375, y1: 3793, x2: 5625, y2: 5862 })
  })
})

describe('la duplication d’un widget réel', () => {
  /**
   * **La garantie centrale du projet.** Le widget dupliqué doit être l'exact jumeau de son
   * modèle — clés inconnues comprises, texte source des littéraux compris — à ses seules
   * quatre coordonnées près.
   */
  it('conserve tous les paramètres, y compris ceux que l’outil ne comprend pas', () => {
    const doc = document()
    const widgets = allWidgets(doc)

    // La boussole portrait porte encore `showWind` et `newWindArrow`, deux vestiges qu'aucune
    // version actuelle n'expose : si un jour la copie les perd, c'est ici qu'on le verra.
    const model = widgets.find((node) => {
      const widget = readWidget(node)
      return widget.shortName === 'WCompass' && getMember(node, 'showWind') !== undefined
    })
    expect(model).toBeDefined()

    const entry: PaletteEntry = {
      shortName: 'WCompass',
      className: readWidget(model!).className,
      label: 'Boussole et vent',
      count: 1,
      origin: 'duplicate',
      model: model!,
      ambiguousLabel: false
    }
    const copy = buildWidget(entry, newWidgetBounds(AIR3, 'landscape')).node

    const keysOf = (node: JsonNode): string[] =>
      node.kind === 'object' ? node.entries.map(([raw]) => decode(raw)) : []
    expect(keysOf(copy)).toEqual(keysOf(model!))
    expect(keysOf(copy)).toContain('showWind')
    expect(keysOf(copy)).toContain('newWindArrow')

    // Tout ce qui n'est pas une coordonnée est identique, au texte source près.
    const coordinates = new Set(['X1', 'Y1', 'X2', 'Y2'])
    for (const key of keysOf(model!)) {
      if (coordinates.has(key)) continue
      expect(serializeJson(getMember(copy, key)!), key)
        .toBe(serializeJson(getMember(model!, key)!))
    }
    expect(readWidgetBounds(copy)).toEqual({ x1: 4375, y1: 3793, x2: 5625, y2: 5862 })
  })

  it('vaut aussi pour un widget à clés composites, recopiées en profondeur', () => {
    const doc = document()
    const model = allWidgets(doc).find((node) => readWidget(node).shortName === 'WThermalAssistant')!
    const entries = buildPaletteEntries(allWidgets(doc))
    const copy = buildWidget(entryFor(entries, 'WThermalAssistant'),
      newWidgetBounds(AIR3, 'landscape')).node

    const rotation = getMember(copy, 'rotation')!
    expect(rotation.kind).toBe('object')
    expect(serializeJson(rotation)).toBe(serializeJson(getMember(entries
      .find((e) => e.shortName === 'WThermalAssistant')!.model!, 'rotation')!))
    // Copie profonde : le sous-objet n'est pas partagé avec le modèle.
    expect(rotation).not.toBe(getMember(model, 'rotation'))
  })

  it('ne touche pas au modèle, et rend un nœud neuf à chaque appel', () => {
    const doc = document()
    const widgets = allWidgets(doc)
    const entry = entryFor(buildPaletteEntries(widgets), 'WCompass')
    const modelBefore = serializeJson(entry.model!)

    const first = buildWidget(entry, { x1: 0, y1: 0, x2: 1000, y2: 1000 }).node
    const second = buildWidget(entry, { x1: 2000, y1: 2000, x2: 3000, y2: 3000 }).node

    expect(serializeJson(entry.model!)).toBe(modelBefore)
    expect(first).not.toBe(second)
    expect(readWidgetBounds(first)).toEqual({ x1: 0, y1: 0, x2: 1000, y2: 1000 })
    expect(readWidgetBounds(second)).toEqual({ x1: 2000, y1: 2000, x2: 3000, y2: 3000 })
  })

  it('laisse le document d’origine intact une fois la copie insérée ailleurs', () => {
    const doc = document()
    const entry = entryFor(buildPaletteEntries(allWidgets(doc)), 'WCompass')
    const copy = buildWidget(entry, newWidgetBounds(AIR3, 'landscape')).node

    const other = readLayout(doc).landscape[1]!.node
    insertWidget(other, copy)

    // Le modèle, lui, n'a pas bougé d'un octet dans le document.
    expect(serializeJson(entry.model!)).not.toContain('"X1": 4375,\n  "Y1": 3793')
  })
})

describe('les deux chemins sont distingués', () => {
  it('décrit la duplication et la création par deux phrases différentes', () => {
    const entries = buildPaletteEntries(allWidgets(document()))
    const bounds = newWidgetBounds(AIR3, 'landscape')

    const duplicated = buildWidget(entryFor(entries, 'WCompass'), bounds)
    const created = buildWidget(entryFor(entries, 'WAirHumidity'), bounds)

    expect(duplicated.description).toBe('Ajouter « Boussole et vent » — copie d’un widget de la configuration')
    expect(created.description).toBe("Ajouter « Humidité de l'air » — widget neuf, réglages laissés à XCTrack")
    expect(duplicated.description).not.toBe(created.description)
  })

  it('sépare visuellement les deux groupes, chacun avec sa mise en garde', () => {
    const palette = renderWidgetPalette({
      existing: allWidgets(document()), device: AIR3, orientation: 'landscape'
    })

    const heads = texts(palette.element, '.palette__group')
    expect(heads[0]).toMatch(/^Déjà dans la configuration \(\d+\)$/)
    expect(heads[1]).toMatch(/^Absents de la configuration \(\d+\)$/)

    const notes = texts(palette.element, '.palette__note')
    expect(notes[0]).toContain('tous ses réglages sont conservés')
    expect(notes[1]).toContain('XCTrack complète les autres réglages à la lecture')

    const rows = [...palette.element.querySelectorAll<HTMLElement>('.palette__entry')]
    const origins = new Set(rows.map((row) => row.dataset.origin))
    expect(origins).toEqual(new Set(['duplicate', 'create']))
  })

  it('affiche le nombre d’exemplaires des types duplicables, et rien pour les autres', () => {
    const doc = document()
    const palette = renderWidgetPalette({
      existing: allWidgets(doc), device: AIR3, orientation: 'landscape'
    })
    const row = (shortName: string): HTMLElement =>
      palette.element.querySelector<HTMLElement>(`.palette__entry[data-widget="${shortName}"]`)!

    const compass = entryFor(buildPaletteEntries(allWidgets(doc)), 'WCompass')
    expect(row('WCompass').querySelector('.palette__badge')?.textContent).toBe(`× ${compass.count}`)
    expect(row('WAirHumidity').querySelector('.palette__badge')).toBeNull()
  })
})

describe('le rappel onChoose', () => {
  it('rend un nœud prêt pour insertWidget, et sa description', () => {
    const doc = document()
    const received: Array<{ node: JsonNode; description: string }> = []
    const palette = renderWidgetPalette({
      existing: allWidgets(doc),
      device: AIR3,
      orientation: 'landscape',
      onChoose: (node, description) => { received.push({ node, description }) }
    })

    palette.element.querySelector<HTMLElement>('.palette__entry[data-widget="WCompass"]')!.click()

    expect(received).toHaveLength(1)
    expect(received[0]!.description).toContain('Boussole et vent')
    expect(readWidget(received[0]!.node).shortName).toBe('WCompass')
    expect(readWidgetBounds(received[0]!.node)).toEqual({ x1: 4375, y1: 3793, x2: 5625, y2: 5862 })

    const page = readLayout(doc).landscape[0]!.node
    const before = pageWidgets(page).items.length
    insertWidget(page, received[0]!.node)
    expect(pageWidgets(page).items).toHaveLength(before + 1)
  })

  it('suit l’orientation demandée pour poser le widget', () => {
    const received: JsonNode[] = []
    const palette = renderWidgetPalette({
      existing: [],
      device: AIR3,
      orientation: 'portrait',
      onChoose: (node) => { received.push(node) }
    })

    palette.element.querySelector<HTMLElement>('.palette__entry[data-widget="WQNH"]')!.click()

    // Grille portrait de l'AIR³ 7.2 : 19 × 31 cellules, donc un tout autre rectangle.
    expect(readWidgetBounds(received[0]!)).toEqual(centeredBounds(gridFor(AIR3, 'portrait')))
    expect(readWidgetBounds(received[0]!)).not.toEqual(newWidgetBounds(AIR3, 'landscape'))
  })

  it('ne casse pas sans rappel', () => {
    const palette = renderWidgetPalette({ existing: [], device: AIR3, orientation: 'landscape' })
    expect(() => {
      palette.element.querySelector<HTMLElement>('.palette__entry')!.click()
    }).not.toThrow()
  })
})
