import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { decode, getMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { DEVICES } from '../../src/catalog/devices'
import { loadWidgetCatalog, type WidgetCatalog } from '../../src/catalog/widgetCatalog'
import { defaultsFor } from '../../src/catalog/widgetDefaults'
import { readLayout } from '../../src/model/layout'
import { gridFor, NORMALIZED_MAX } from '../../src/model/grid'
import { insertWidget, pageWidgets, readWidgetBounds } from '../../src/model/mutations'
import { readRenderSettings, type RenderSettings } from '../../src/model/preferences'
import { readWidget } from '../../src/model/widget'
// Effet de bord : enregistre les dessins de widgets, dont les vignettes se servent.
import '../../src/render/widgets'
import {
  buildPaletteEntries,
  buildWidget,
  centeredBounds,
  createWidgetNode,
  newWidgetBounds,
  previewKind,
  previewNode,
  renderThumbnail,
  renderWidgetPalette,
  NEW_WIDGET_CELLS,
  NOT_OFFERED_FAMILY,
  notOfferedLabel,
  WIDGET_CLASS_PREFIX,
  type PaletteEntry,
  type PaletteSources
} from '../../src/ui/widgetPalette'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'
import { BACKUP_2026 } from '../fixtures/paths'

/**
 * Les deux axes de langue, chacun avec son propre porteur : `FRENCH` / `GERMAN` sont
 * **notre prose**, le paramètre `language` de la palette est celui des **libellés de
 * XCTrack**. Les tests qui suivent les font diverger exprès.
 */
const FRENCH = makeTranslator('fr', frenchMessages)
const GERMAN = makeTranslator('de', germanMessages)

/**
 * La palette se juge sur un fichier réel : ce qu'on veut vérifier, c'est qu'un widget
 * dupliqué depuis les octets écrits par l'appareil en ressort intact, qu'un widget neuf
 * tombe exactement là où l'appareil l'a posé, et que la liste se range comme l'écran
 * d'ajout de XCTrack — dix familles, dans leur ordre.
 */
const source = readFileSync(BACKUP_2026, 'utf8')

const AIR3 = DEVICES[0]!

/** Les préférences d'un export « pages » : aucune, donc les valeurs de repli. */
const SETTINGS: RenderSettings = readRenderSettings(parseJson('{}'))

let CATALOG: WidgetCatalog

beforeAll(async () => {
  CATALOG = await loadWidgetCatalog('fr')
})

function document(): JsonNode {
  return parseJson(source)
}

/** Tous les widgets de la configuration, dans l'ordre du fichier, comme une seule page. */
function allWidgets(doc: JsonNode): PaletteSources {
  const layout = readLayout(doc)
  return {
    onPage: [...layout.landscape, ...layout.portrait].flatMap((page) => page.widgets.map((w) => w.node)),
    elsewhere: []
  }
}

/** Les widgets de la configuration vus depuis une page précise. */
function fromPage(doc: JsonNode, orientation: 'landscape' | 'portrait', index: number): PaletteSources {
  const layout = readLayout(doc)
  const page = layout[orientation][index]!
  const onPage = page.widgets.map((w) => w.node)
  const elsewhere: JsonNode[] = []
  for (const other of [...layout.landscape, ...layout.portrait]) {
    if (other === page) continue
    for (const widget of other.widgets) elsewhere.push(widget.node)
  }
  return { onPage, elsewhere }
}

const EMPTY: PaletteSources = { onPage: [], elsewhere: [] }

function entries(sources: PaletteSources, language = 'fr'): PaletteEntry[] {
  return buildPaletteEntries(sources, CATALOG, language)
}

function entryFor(list: PaletteEntry[], shortName: string): PaletteEntry {
  const entry = list.find((candidate) => candidate.shortName === shortName)
  if (entry === undefined) throw new Error(`pas d'entrée ${shortName}`)
  return entry
}

function palette(sources: PaletteSources, onChoose?: (node: JsonNode, description: string) => void) {
  return renderWidgetPalette({
    sources,
    catalog: CATALOG,
    device: AIR3,
    orientation: 'landscape',
    settings: SETTINGS,
    ...(onChoose === undefined ? {} : { onChoose })
  })
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

/** Les en-têtes de famille visibles, par identifiant. */
function visibleGroups(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>('.palette__group')]
    .filter((head) => !head.hidden)
    .map((head) => head.dataset.family ?? '')
}

describe('la liste des types', () => {
  it('donne les libellés français officiels, et le nom court de chaque type', () => {
    const list = entries(allWidgets(document()))

    expect(entryFor(list, 'WCompass').label).toBe('Boussole et vent')
    expect(entryFor(list, 'WCompassDigital').label).toBe('Boussole électronique')
    expect(entryFor(list, 'WStatusLine').label).toBe("Barre d'état")
    expect(entryFor(list, 'WThermalAssistant').label).toBe('Assistant thermique')
    expect(entryFor(list, 'WLogPeek').label).toBe('Queue du journal')
  })

  it('suit la langue demandée', () => {
    const list = entries(EMPTY, 'en')
    expect(entryFor(list, 'WCompass').label).toBe('Compass and wind')
    expect(entryFor(list, 'WStatusLine').label).toBe('Status Line')
  })

  it('propose les 75 types des familles visibles, et aucun des 8 du mode développeur', () => {
    const list = entries(EMPTY)

    expect(list).toHaveLength(75)
    // Les 8 types de la famille masquée `debug_wgDebug` du catalogue.
    for (const hidden of CATALOG.families.filter((family) => family.hidden)) {
      for (const shortName of hidden.widgets) {
        expect(list.some((entry) => entry.shortName === shortName), shortName).toBe(false)
      }
    }
    // `WProFallback` n'est dans aucune famille : XCTrack le fabrique lui-même (§ 3.3).
    expect(list.some((entry) => entry.shortName === 'WProFallback')).toBe(false)
  })

  it('n’écarte pas un type du mode développeur s’il est déjà dans la configuration', () => {
    const debug = parseJson('{"CLASS": "org.xcontest.XCTrack.widget.w.WDebugFPS", ' +
      '"X1": 0, "Y1": 0, "X2": 1000, "Y2": 1000, "_border": false, "_bg": 100, "_theme": ""}')
    const list = entries({ onPage: [debug], elsewhere: [] })

    const entry = entryFor(list, 'WDebugFPS')
    expect(entry.origin).toBe('duplicate')
    // Rangé dans le groupe de queue, pas dans sa famille masquée.
    expect(entry.family).toBe(NOT_OFFERED_FAMILY)
    expect(list).toHaveLength(76)
    // Et il est bien en queue de liste : les 75 types offerts passent devant.
    expect(list[list.length - 1]!.shortName).toBe('WDebugFPS')
  })

  it('marque comme « à créer » un type absent de la configuration', () => {
    const list = entries(allWidgets(document()))
    const entry = entryFor(list, 'WAirHumidity')

    expect(entry.origin).toBe('create')
    expect(entry.count).toBe(0)
    expect(entry.onPageCount).toBe(0)
    expect(entry.model).toBeUndefined()
    expect(entry.className).toBe(`${WIDGET_CLASS_PREFIX}WAirHumidity`)
  })
})

describe('le groupement par famille', () => {
  /**
   * La référence est l'écran d'ajout relevé sur l'AIR³ 7.2
   * (`docs/reference/edition-native-exploration.md` § 3.2) : dix familles, dans cet ordre.
   */
  const SCREEN_ORDER = [
    'wgSystem', 'wgFlying', 'wgAir', 'wgXContest', 'wgNavigation',
    'wgCompetition', 'wgLivetracking', 'wgButtons', 'wgOthers', 'wgTesting'
  ]

  it('range les types dans les dix familles de l’écran, dans leur ordre', () => {
    const list = entries(allWidgets(document()))
    const seen: string[] = []
    for (const entry of list) {
      if (seen[seen.length - 1] !== entry.family) seen.push(entry.family)
    }
    expect(seen).toEqual(SCREEN_ORDER)
  })

  it('respecte le rang du registre à l’intérieur d’une famille', () => {
    const list = entries(EMPTY)
    const navigation = list.filter((entry) => entry.family === 'wgNavigation')

    // § 3.2 : la boussole ouvre Navigation, la boussole électronique la suit.
    expect(navigation.slice(0, 3).map((entry) => entry.shortName))
      .toEqual(['WCompass', 'WCompassDigital', 'WSideView'])
    expect(navigation.map((entry) => entry.order)).toEqual([...navigation.keys()])
  })

  it('rend un en-tête par famille, avec son libellé et son effectif', () => {
    const view = palette(allWidgets(document()))

    expect(visibleGroups(view.element)).toEqual(SCREEN_ORDER)
    expect(texts(view.element, '.palette__group-name')[0]).toBe('Système')
    expect(texts(view.element, '.palette__group-name')[1]).toBe('En vol')
    // § 3.2 : 3 types sous Système, 20 sous « En vol ».
    expect(texts(view.element, '.palette__group-count').slice(0, 2)).toEqual(['3', '20'])
  })

  it('n’a pas d’en-tête de queue tant que le fichier ne porte que des types proposés', () => {
    const view = palette(allWidgets(document()))
    expect(visibleGroups(view.element)).not.toContain(NOT_OFFERED_FAMILY)
  })

  it('ouvre un en-tête de queue pour un type que XCTrack ne propose pas', () => {
    const debug = parseJson('{"CLASS": "org.xcontest.XCTrack.widget.w.WDebugFPS", ' +
      '"X1": 0, "Y1": 0, "X2": 1000, "Y2": 1000, "_border": false, "_bg": 100, "_theme": ""}')
    const view = palette({ onPage: [debug], elsewhere: [] })

    const groups = visibleGroups(view.element)
    expect(groups[groups.length - 1]).toBe(NOT_OFFERED_FAMILY)
    expect(texts(view.element, '.palette__group-name'))
      .toContain(notOfferedLabel(FRENCH))
  })

  it('rend les lignes en UNE seule colonne, dans l’ordre des entrées', () => {
    const view = palette(allWidgets(document()))
    const rows = [...view.element.querySelectorAll<HTMLElement>('.palette__entry')]

    expect(rows.map((row) => row.dataset.widget))
      .toEqual(view.entries.map((entry) => entry.shortName))
    // Chaque ligne porte sa famille : la liste est un seul flux, jamais deux colonnes.
    expect(rows.map((row) => row.dataset.family))
      .toEqual(view.entries.map((entry) => entry.family))
  })
})

describe('l’indicateur de présence sur la page affichée', () => {
  it('compte les exemplaires de la page, et ceux du reste du fichier à part', () => {
    const doc = document()
    const sources = fromPage(doc, 'landscape', 0)
    const list = entries(sources)
    const onPage = (shortName: string): number =>
      sources.onPage.filter((node) => readWidget(node).shortName === shortName).length
    const total = (shortName: string): number => onPage(shortName) +
      sources.elsewhere.filter((node) => readWidget(node).shortName === shortName).length

    for (const entry of list) {
      expect(entry.onPageCount, entry.shortName).toBe(onPage(entry.shortName))
      expect(entry.count, entry.shortName).toBe(total(entry.shortName))
    }
    // La page de référence en porte au moins un, et le fichier en porte ailleurs.
    expect(list.some((entry) => entry.onPageCount > 0)).toBe(true)
    expect(list.some((entry) => entry.onPageCount === 0 && entry.count > 0)).toBe(true)
  })

  it('allume la marque « déjà ici » sur un type de la page, et pas sur un autre', () => {
    const doc = document()
    const sources = fromPage(doc, 'landscape', 0)
    const view = palette(sources)
    const row = (shortName: string): HTMLElement =>
      view.element.querySelector<HTMLElement>(`.palette__entry[data-widget="${shortName}"]`)!

    const here = view.entries.find((entry) => entry.onPageCount > 0)!
    const away = view.entries.find((entry) => entry.count === 0)!

    expect(row(here.shortName).dataset.onPage).toBe('oui')
    expect(row(here.shortName).querySelector('.palette__here')).not.toBeNull()
    expect(row(here.shortName).querySelector('.palette__dot')).not.toBeNull()

    expect(row(away.shortName).dataset.onPage).toBe('non')
    expect(row(away.shortName).querySelector('.palette__here')).toBeNull()
    expect(row(away.shortName).querySelector('.palette__elsewhere')).toBeNull()
  })

  it('dit « ailleurs » pour un type absent de la page mais présent dans le fichier', () => {
    const doc = document()
    const sources = fromPage(doc, 'landscape', 0)
    const view = palette(sources)
    const away = view.entries.find((entry) => entry.onPageCount === 0 && entry.count > 0)!
    const row = view.element
      .querySelector<HTMLElement>(`.palette__entry[data-widget="${away.shortName}"]`)!

    expect(row.dataset.onPage).toBe('non')
    // Duplicable quand même : le modèle vient d'une autre page, et la ligne le dit.
    expect(row.dataset.origin).toBe('duplicate')
    expect(away.modelFromPage).toBe(false)
    expect(row.querySelector('.palette__elsewhere')?.textContent).toBe('ailleurs')
    expect(row.querySelector('.palette__here')).toBeNull()
  })

  it('compte les exemplaires multiples de la page dans la marque', () => {
    const doc = document()
    // `landscape[3]` porte deux `WButtonBrightness` — le seul cas de doublon sur une page
    // de la configuration de référence, avec les deux `WButtonNavig` de `landscape[4]`.
    const sources = fromPage(doc, 'landscape', 3)
    const view = palette(sources)
    const many = view.entries.find((entry) => entry.onPageCount > 1)

    expect(many?.shortName).toBe('WButtonBrightness')
    expect(many?.onPageCount).toBe(2)
    const row = view.element
      .querySelector<HTMLElement>(`.palette__entry[data-widget="${many!.shortName}"]`)!
    expect(row.querySelector('.palette__here')?.textContent)
      .toBe(`déjà ici × ${many!.onPageCount}`)
  })

  it('n’allume rien quand aucune page n’est ouverte', () => {
    const view = palette(EMPTY)
    const marks = view.element.querySelectorAll('.palette__here, .palette__elsewhere')
    expect(marks).toHaveLength(0)
  })
})

describe('le badge Pro et la description', () => {
  it('badge les 14 types que XCTrack réserve à la licence Pro', () => {
    const list = entries(EMPTY)
    const pro = list.filter((entry) => entry.pro).map((entry) => entry.shortName)

    // § 3.2 : le relevé de l'écran d'ajout en compte 14 sur les 75 proposés.
    expect(pro).toHaveLength(14)
    expect(pro).toContain('WSunset')
    expect(pro).toContain('WCompPercentage')
    expect(entryFor(list, 'WCompass').pro).toBe(false)
  })

  it('affiche le badge sur la ligne, et rien sur les autres', () => {
    const view = palette(EMPTY)
    const row = (shortName: string): HTMLElement =>
      view.element.querySelector<HTMLElement>(`.palette__entry[data-widget="${shortName}"]`)!

    expect(row('WSunset').querySelector('.palette__pro')?.textContent).toBe('Pro')
    expect(row('WCompass').querySelector('.palette__pro')).toBeNull()
  })

  it('reprend la description du catalogue, jamais un texte inventé', () => {
    const view = palette(EMPTY)
    const row = view.element
      .querySelector<HTMLElement>('.palette__entry[data-widget="WCompass"]')!

    expect(row.querySelector('.palette__desc')?.textContent)
      .toBe(CATALOG.widgetDescription('WCompass'))
    expect(entryFor(view.entries, 'WCompass').description)
      .toBe(CATALOG.widgetDescription('WCompass'))
  })
})

describe('deux types, un seul libellé', () => {
  /**
   * « Luminosité de l'écran » désigne deux widgets distincts sur l'appareil (§ 3.2) :
   * `WBrightnessInfo` sous *Système* et `WButtonBrightness` sous *Boutons d'actions*. Une
   * palette indexée par libellé les confondrait.
   */
  it('les garde distincts, et le signale', () => {
    const list = entries(EMPTY)
    const info = entryFor(list, 'WBrightnessInfo')
    const button = entryFor(list, 'WButtonBrightness')

    expect(info.label).toBe(button.label)
    expect(info.label).toBe("Luminosité de l'écran")
    expect(info.shortName).not.toBe(button.shortName)
    expect(info.className).not.toBe(button.className)
    expect(info.ambiguousLabel).toBe(true)
    expect(button.ambiguousLabel).toBe(true)
    expect(entryFor(list, 'WCompass').ambiguousLabel).toBe(false)
    // Et les familles les séparent, comme sur l'appareil.
    expect(info.family).toBe('wgSystem')
    expect(button.family).toBe('wgButtons')
  })

  it('les rend en deux lignes distinctes, chacune portant son nom court', () => {
    const view = palette(EMPTY)
    const rows = [...view.element.querySelectorAll<HTMLElement>('.palette__entry')]
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
    const view = palette(EMPTY)

    view.filter('bous')
    expect(visibleEntries(view.element)).toEqual(['WCompass', 'WCompassDigital'])

    view.filter('BOUS')
    expect(visibleEntries(view.element)).toEqual(['WCompass', 'WCompassDigital'])
  })

  it('ignore les accents dans les deux sens', () => {
    const view = palette(EMPTY)

    // « Boussole électronique » se trouve sans l'accent…
    view.filter('electronique')
    expect(visibleEntries(view.element)).toEqual(['WCompassDigital'])

    // …et « Barre d'état » se trouve avec.
    view.filter('état')
    expect(visibleEntries(view.element)).toContain('WStatusLine')
  })

  it('trouve aussi par nom de classe', () => {
    const view = palette(EMPTY)

    view.filter('WCompass')
    expect(visibleEntries(view.element)).toEqual(['WCompass', 'WCompassDigital'])

    view.filter('WOptiUnfinishedTriangle')
    expect(visibleEntries(view.element)).toEqual(['WOptiUnfinishedTriangle'])

    view.filter('org.xcontest.XCTrack.widget.w.WQNH')
    expect(visibleEntries(view.element)).toEqual(['WQNH'])
  })

  it('masque les en-têtes de famille devenus vides, et le dit quand rien ne reste', () => {
    const view = palette(allWidgets(document()))
    const empty = view.element.querySelector<HTMLElement>('.palette__empty')!

    expect(visibleGroups(view.element)).toHaveLength(10)
    expect(empty.hidden).toBe(true)

    // « boussole » n'existe que sous Navigation : les neuf autres en-têtes disparaissent.
    view.filter('boussole')
    expect(visibleGroups(view.element)).toEqual(['wgNavigation'])
    expect(empty.hidden).toBe(true)

    view.filter('zzz')
    expect(visibleEntries(view.element)).toEqual([])
    expect(visibleGroups(view.element)).toEqual([])
    expect(empty.hidden).toBe(false)

    view.filter('')
    expect(visibleGroups(view.element)).toHaveLength(10)
    expect(empty.hidden).toBe(true)
  })

  it('met le compte de chaque en-tête d’accord avec ce qui reste sous lui', () => {
    const view = palette(EMPTY)

    view.filter('vent')
    const heads = [...view.element.querySelectorAll<HTMLElement>('.palette__group')]
      .filter((head) => !head.hidden)
    expect(heads.length).toBeGreaterThan(0)
    for (const head of heads) {
      const family = head.dataset.family
      const shown = [...view.element.querySelectorAll<HTMLElement>('.palette__entry')]
        .filter((row) => !row.hidden && row.dataset.family === family)
      expect(head.querySelector('.palette__group-count')?.textContent)
        .toBe(String(shown.length))
      expect(shown.length).toBeGreaterThan(0)
    }
  })

  it('se pilote aussi depuis le champ de recherche', () => {
    const view = palette(EMPTY)
    const search = view.element.querySelector<HTMLInputElement>('.palette__search')!

    search.value = 'bous'
    search.dispatchEvent(new Event('input'))
    expect(visibleEntries(view.element)).toEqual(['WCompass', 'WCompassDigital'])
  })
})

describe('la case « déjà dans le fichier »', () => {
  /**
   * L'ancienne palette groupait par présence, ce qui mettait le chemin sûr en tête. Le
   * groupement par famille l'a dispersé ; cette case le rend en un clic.
   */
  it('ne garde que les types duplicables, et rétablit tout ensuite', () => {
    const doc = document()
    const view = palette(allWidgets(doc))
    const duplicable = view.entries.filter((entry) => entry.origin === 'duplicate')

    expect(duplicable.length).toBeGreaterThan(0)
    view.showOnlyPresent(true)
    expect(visibleEntries(view.element).sort())
      .toEqual(duplicable.map((entry) => entry.shortName).sort())

    view.showOnlyPresent(false)
    expect(visibleEntries(view.element)).toHaveLength(view.entries.length)
  })

  it('se cumule avec la recherche', () => {
    const doc = document()
    const view = palette(allWidgets(doc))

    view.showOnlyPresent(true)
    view.filter('bous')
    // Le fichier de référence porte des boussoles, pas de boussole électronique.
    expect(visibleEntries(view.element)).toEqual(['WCompass'])
  })

  it('n’apparaît pas quand rien n’est duplicable', () => {
    expect(palette(EMPTY).element.querySelector('.palette__only')).toBeNull()
    expect(palette(allWidgets(document())).element.querySelector('.palette__only')).not.toBeNull()
  })

  it('se pilote depuis la case elle-même', () => {
    const view = palette(allWidgets(document()))
    const box = view.element.querySelector<HTMLInputElement>('.palette__only-input')!

    box.checked = true
    box.dispatchEvent(new Event('change'))
    expect(visibleEntries(view.element).length).toBeLessThan(view.entries.length)
    expect(visibleEntries(view.element).length).toBeGreaterThan(0)
  })
})

describe('la vignette', () => {
  it('dessine le nœud que le clic posera, pour un type duplicable', () => {
    const doc = document()
    const entry = entryFor(entries(allWidgets(doc)), 'WCompass')
    const bounds = newWidgetBounds(AIR3, 'landscape')

    // Aux octets près : la vignette part du modèle du pilote, pas d'un widget vierge.
    expect(serializeJson(previewNode(entry, bounds)))
      .toBe(serializeJson(buildWidget(entry, bounds).node))
  })

  it('complète un type à créer avec les défauts relevés sur l’appareil', () => {
    const entry = entryFor(entries(EMPTY), 'WTime')
    const bounds = newWidgetBounds(AIR3, 'landscape')
    const preview = previewNode(entry, bounds)

    // Le relevé de l'appareil : `WTime` reçoit `_title` et `showSec`.
    expect(defaultsFor('WTime')).toEqual({ _title: true, showSec: true })
    expect(getMember(preview, 'showSec')).toEqual({ kind: 'literal', raw: 'true' })

    // Mais le FICHIER, lui, ne reçoit que les huit clés universelles.
    const posed = buildWidget(entry, bounds).node
    expect(getMember(posed, 'showSec')).toBeUndefined()
    expect(posed.kind === 'object' && posed.entries).toHaveLength(8)
  })

  it('recadre le rendu de la page sur le seul rectangle du widget', () => {
    const entry = entryFor(entries(EMPTY), 'WCompass')
    const bounds = newWidgetBounds(AIR3, 'landscape')
    const scene = renderThumbnail(entry, bounds, 16 / 9, SETTINGS, 'fr')

    // Repère de rendu : 1280 de large, 720 de haut (canvas.ts). Le rectangle relevé sur
    // l'appareil, 4375..5625 × 3793..5862, passe d'abord par la grille de rendu 51 × 29
    // — c'est ce que XCTrack fait avant de tracer — et tombe sur 22/51..29/51 en X,
    // 11/29..17/29 en Y. Le recadrage doit suivre le dessin, pas les bornes brutes.
    const box = (scene.getAttribute('viewBox') ?? '').split(' ').map(Number)
    expect(box[0]).toBeCloseTo((22 / 51) * 1280, 6)
    expect(box[1]).toBeCloseTo((11 / 29) * 720, 6)
    expect(box[2]).toBeCloseTo((7 / 51) * 1280, 6)
    expect(box[3]).toBeCloseTo((6 / 29) * 720, 6)
    // Décorative pour l'assistance vocale : l'intitulé de la ligne dit tout en clair.
    expect(scene.getAttribute('aria-hidden')).toBe('true')
  })

  it('pose une vignette sur chacune des 75 lignes', () => {
    const view = palette(EMPTY)
    const thumbs = view.element.querySelectorAll('.palette__thumb > svg')
    expect(thumbs).toHaveLength(75)
  })

  it('classe les aperçus, et n’en laisse aucun sans explication', () => {
    // Trois sortes, trois phrases — voir `previewNote`.
    expect(previewKind('WCompass')).toBe('drawn')
    expect(previewKind('WLiveMessage')).toBe('blank')
    // Cinq types seulement retombent encore sur le repli générique, et ce sont ceux que
    // l'appareil laisse vides lui aussi (plus `WLocation`, dont la seule capture est
    // caviardée) — voir la revue des 75 visuels, § 2.12.
    expect(previewKind('WLocation')).toBe('generic')

    const view = palette(EMPTY)
    for (const row of view.element.querySelectorAll<HTMLElement>('.palette__entry')) {
      const thumb = row.querySelector<HTMLElement>('.palette__thumb')!
      expect(['drawn', 'generic', 'blank']).toContain(row.dataset.preview)
      expect(thumb.title.length, row.dataset.widget).toBeGreaterThan(20)
    }
  })

  it('dit en toutes lettres qu’un type ne peint rien au repos', () => {
    const view = palette(EMPTY)
    const row = view.element
      .querySelector<HTMLElement>('.palette__entry[data-widget="WLiveMessage"]')!

    expect(row.dataset.preview).toBe('blank')
    expect(row.querySelector('.palette__thumb-note')?.textContent).toBe('rien au repos')
    expect(row.querySelector<HTMLElement>('.palette__thumb')!.title)
      .toContain('ne peint rien au repos')
  })

  it('sépare le fait de l’appareil de notre propre limite', () => {
    // Deux vignettes quasi vides, deux causes opposées : « rien au repos » est ce que
    // l'appareil fait — rassurant —, « aperçu non dessiné » est ce que cet éditeur ne
    // sait pas faire. Un seul mot pour les deux, et le pilote ne peut plus savoir si son
    // gadget sera vide sur l'instrument ou si c'est seulement notre aperçu qui manque.
    const view = palette(EMPTY)
    const noteOf = (widget: string): string | null | undefined => view.element
      .querySelector<HTMLElement>(`.palette__entry[data-widget="${widget}"] .palette__thumb-note`)
      ?.textContent
    const generic = [...view.element.querySelectorAll<HTMLElement>('.palette__entry')]
      .find((row) => row.dataset.preview === 'generic')
    expect(generic).toBeDefined()
    expect(generic!.querySelector('.palette__thumb-note')?.textContent)
      .toBe('aperçu non dessiné')
    expect(noteOf('WLiveMessage')).toBe('rien au repos')
    // Une vignette réellement dessinée n'en porte aucune : il n'y a rien à excuser.
    const drawn = [...view.element.querySelectorAll<HTMLElement>('.palette__entry')]
      .find((row) => row.dataset.preview === 'drawn')
    expect(drawn!.querySelector('.palette__thumb-note')).toBeNull()
  })

  it('dessine les cartes et l’assistant de thermique, plutôt que de les laisser vides', () => {
    for (const shortName of ['WCompMap', 'WXCAssistant', 'WThermalAssistant']) {
      expect(previewKind(shortName), shortName).toBe('drawn')
    }
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

    const entry = entryFor(entries(allWidgets(doc)), 'WAirHumidity')
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
   * quatre coordonnées près. Le classement par famille n'y change rien : c'est ce que ce
   * test vérifie, en partant de la liste groupée et non d'un modèle choisi à la main.
   */
  it('conserve tous les paramètres, y compris ceux que l’outil ne comprend pas', () => {
    const doc = document()
    const sources = allWidgets(doc)

    // La boussole portrait porte encore `showWind` et `newWindArrow`, deux vestiges qu'aucune
    // version actuelle n'expose : si un jour la copie les perd, c'est ici qu'on le verra.
    const model = sources.onPage.find((node) => {
      const widget = readWidget(node)
      return widget.shortName === 'WCompass' && getMember(node, 'showWind') !== undefined
    })
    expect(model).toBeDefined()

    const entry: PaletteEntry = {
      shortName: 'WCompass',
      className: readWidget(model!).className,
      label: 'Boussole et vent',
      family: 'wgNavigation',
      order: 0,
      pro: false,
      onPageCount: 1,
      count: 1,
      origin: 'duplicate',
      model: model!,
      modelFromPage: true,
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

  it('préserve les réglages de CHAQUE type duplicable de la configuration', () => {
    const doc = document()
    const sources = allWidgets(doc)
    const list = entries(sources)
    const duplicable = list.filter((entry) => entry.origin === 'duplicate')
    expect(duplicable.length).toBeGreaterThan(10)

    const coordinates = new Set(['X1', 'Y1', 'X2', 'Y2'])
    for (const entry of duplicable) {
      const copy = buildWidget(entry, newWidgetBounds(AIR3, 'landscape')).node
      const model = entry.model!
      expect(copy.kind, entry.shortName).toBe('object')
      const keys = model.kind === 'object' ? model.entries.map(([raw]) => decode(raw)) : []
      expect(copy.kind === 'object' && copy.entries.map(([raw]) => decode(raw)), entry.shortName)
        .toEqual(keys)
      for (const key of keys) {
        if (coordinates.has(key)) continue
        expect(serializeJson(getMember(copy, key)!), `${entry.shortName}.${key}`)
          .toBe(serializeJson(getMember(model, key)!))
      }
    }
  })

  it('préfère le modèle de la page affichée à celui d’une autre page', () => {
    const doc = document()
    const sources = fromPage(doc, 'landscape', 0)
    const list = entries(sources)
    const local = list.find((entry) => entry.onPageCount > 0 && entry.model !== undefined)!

    expect(local.modelFromPage).toBe(true)
    // Le modèle est bien un widget de CETTE page, et le premier rencontré.
    expect(local.model).toBe(sources.onPage.find(
      (node) => readWidget(node).shortName === local.shortName
    ))
    expect(buildWidget(local, newWidgetBounds(AIR3, 'landscape')).description)
      .toContain('de cette page')
  })

  it('retombe sur une autre page quand la page affichée n’a pas le type', () => {
    const doc = document()
    const sources = fromPage(doc, 'landscape', 0)
    const list = entries(sources)
    const away = list.find((entry) => entry.onPageCount === 0 && entry.model !== undefined)!

    expect(away.modelFromPage).toBe(false)
    expect(away.model).toBe(sources.elsewhere.find(
      (node) => readWidget(node).shortName === away.shortName
    ))
    expect(buildWidget(away, newWidgetBounds(AIR3, 'landscape')).description)
      .toContain('d’une autre page')
  })

  it('vaut aussi pour un widget à clés composites, recopiées en profondeur', () => {
    const doc = document()
    const sources = allWidgets(doc)
    const model = sources.onPage.find((node) => readWidget(node).shortName === 'WThermalAssistant')!
    const list = entries(sources)
    const copy = buildWidget(entryFor(list, 'WThermalAssistant'),
      newWidgetBounds(AIR3, 'landscape')).node

    const rotation = getMember(copy, 'rotation')!
    expect(rotation.kind).toBe('object')
    expect(serializeJson(rotation))
      .toBe(serializeJson(getMember(entryFor(list, 'WThermalAssistant').model!, 'rotation')!))
    // Copie profonde : le sous-objet n'est pas partagé avec le modèle.
    expect(rotation).not.toBe(getMember(model, 'rotation'))
  })

  it('ne touche pas au modèle, et rend un nœud neuf à chaque appel', () => {
    const doc = document()
    const entry = entryFor(entries(allWidgets(doc)), 'WCompass')
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
    const entry = entryFor(entries(allWidgets(doc)), 'WCompass')
    const copy = buildWidget(entry, newWidgetBounds(AIR3, 'landscape')).node

    const other = readLayout(doc).landscape[1]!.node
    insertWidget(other, copy)

    // Le modèle, lui, n'a pas bougé d'un octet dans le document.
    expect(serializeJson(entry.model!)).not.toContain('"X1": 4375,\n  "Y1": 3793')
  })
})

describe('les deux chemins sont distingués', () => {
  it('décrit la duplication et la création par deux phrases différentes', () => {
    const list = entries(allWidgets(document()))
    const bounds = newWidgetBounds(AIR3, 'landscape')

    const duplicated = buildWidget(entryFor(list, 'WCompass'), bounds)
    const created = buildWidget(entryFor(list, 'WAirHumidity'), bounds)

    expect(duplicated.description).toBe('Ajouter « Boussole et vent » — copie d’un gadget de cette page')
    expect(created.description).toBe("Ajouter « Humidité de l'air » — gadget neuf, réglages laissés à XCTrack")
    expect(duplicated.description).not.toBe(created.description)
  })

  it('porte la distinction sur la ligne, et l’explique une fois pour toutes', () => {
    const view = palette(allWidgets(document()))

    const origins = new Set([...view.element.querySelectorAll<HTMLElement>('.palette__entry')]
      .map((row) => row.dataset.origin))
    expect(origins).toEqual(new Set(['duplicate', 'create']))

    const legend = view.element.querySelector('.palette__legend')?.textContent ?? ''
    expect(legend).toContain('avec tous ses réglages')
    expect(legend).toContain('réglages de base')
  })
})

describe('le rappel onChoose', () => {
  it('rend un nœud prêt pour insertWidget, et sa description', () => {
    const doc = document()
    const received: Array<{ node: JsonNode; description: string }> = []
    const view = palette(allWidgets(doc), (node, description) => {
      received.push({ node, description })
    })

    view.element.querySelector<HTMLElement>('.palette__entry[data-widget="WCompass"]')!.click()

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
    const view = renderWidgetPalette({
      sources: EMPTY,
      catalog: CATALOG,
      device: AIR3,
      orientation: 'portrait',
      settings: SETTINGS,
      onChoose: (node) => { received.push(node) }
    })

    view.element.querySelector<HTMLElement>('.palette__entry[data-widget="WQNH"]')!.click()

    // Grille portrait de l'AIR³ 7.2 : 29 × 48 cellules — la transposée du paysage, donc un
    // tout autre rectangle. Voir `docs/reference/grille-aimantation.md`.
    expect(readWidgetBounds(received[0]!)).toEqual(centeredBounds(gridFor(AIR3, 'portrait')))
    expect(readWidgetBounds(received[0]!)).not.toEqual(newWidgetBounds(AIR3, 'landscape'))
  })

  it('ne casse pas sans rappel', () => {
    const view = palette(EMPTY)
    expect(() => {
      view.element.querySelector<HTMLElement>('.palette__entry')!.click()
    }).not.toThrow()
  })
})

/* ================================================== les deux axes de langue */

describe('les deux axes de langue', () => {
  it('traduit notre prose sans toucher aux libellés de XCTrack', () => {
    // Le cas qui décide : un pilote dont l'AIR³ est en français lit l'interface en
    // allemand. Les libellés doivent rester **exactement** ceux de son appareil.
    const view = renderWidgetPalette({
      sources: EMPTY,
      catalog: CATALOG,
      device: AIR3,
      orientation: 'landscape',
      settings: SETTINGS,
      language: 'fr',
      tr: GERMAN
    })

    // Notre prose suit le pilote.
    expect(texts(view.element, '.palette__title')).toEqual(['Widget hinzufügen'])
    expect(view.element.querySelector<HTMLInputElement>('.palette__search')?.placeholder)
      .toBe('Widget suchen')

    // Les libellés suivent le fichier : le catalogue chargé est le français, et les noms
    // de gadgets restent français, dans une palette dont tout le reste est allemand.
    const names = texts(view.element, '.palette__name')
    expect(names).toContain('Boussole et vent')
    expect(names.join(' ')).not.toContain('Kompass')
  })

  it('la phrase d’annulation porte le libellé de XCTrack, pas sa traduction', () => {
    const list = entries(allWidgets(document()), 'en')
    const entry = entryFor(list, 'WCompass')
    const bounds = newWidgetBounds(AIR3, 'landscape')
    // Libellés en anglais, prose en allemand : chacun le sien, dans la même phrase.
    expect(buildWidget(entry, bounds, GERMAN).description)
      .toBe('„Compass and wind“ hinzufügen — Kopie eines Widgets dieser Seite')
  })

  it('sans traducteur, dit mot pour mot ce que le catalogue français dit', () => {
    // Le repli hérité est là tant que `main.ts` ne passe pas `tr` : il doit être
    // rigoureusement le catalogue français, sans quoi la bascule changerait des phrases.
    const sources = fromPage(document(), 'landscape', 0)
    const withoutTr = palette(sources)
    const withFrench = renderWidgetPalette({
      sources,
      catalog: CATALOG,
      device: AIR3,
      orientation: 'landscape',
      settings: SETTINGS,
      tr: FRENCH
    })
    // Le texte, et non le HTML : les identifiants portent un compteur de palette, qui
    // diffère forcément entre deux rendus.
    expect(withoutTr.element.textContent).toBe(withFrench.element.textContent)
  })
})
