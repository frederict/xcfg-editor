import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
// Effet de bord : enregistre les types dont l'appareil ne peint aucun contenu au repos
// (`registerBlankAtRest`, `render/registry.ts`). Sans cet import, `isBlankAtRest` rend
// faux partout et la marque « sans dessin » ne serait jamais posée.
import '../../src/render/widgets'
import { DEVICES, deviceFor } from '../../src/catalog/devices'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { createHistory } from '../../src/model/history'
import { readLayout, type Page } from '../../src/model/layout'
import { removeWidget, reorderWidget, setWidgetBounds } from '../../src/model/mutations'
import { widgetAtPoint } from '../../src/ui/editor'
import {
  coversEntirely, renderWidgetList, unreachableWidgets, widgetListEntries
} from '../../src/ui/widgetList'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'
import { PAGES_2026 } from '../fixtures/paths'

/**
 * Les deux axes : `FRENCH` / `GERMAN` portent **notre prose**, le paramètre `language` de
 * la liste porte les **libellés de XCTrack**. Ils divergent exprès plus bas.
 */
const FRENCH = makeTranslator('fr', frenchMessages)
const GERMAN = makeTranslator('de', germanMessages)

const DEVICE = deviceFor('AIR3 AIR3-7.2')

/* ------------------------------------------------------------------ fixtures fabriquées */

/**
 * Une page fabriquée, coordonnées brutes : `[X1, Y1, X2, Y2]` par widget, dans l'ordre du
 * fichier — du fond vers l'avant. Rien n'est emprunté au corpus ici : le calcul des
 * inatteignables doit se démontrer sur des cas choisis, où l'on sait à l'avance ce que la
 * géométrie impose.
 */
function buildDocument(widgets: [string, number, number, number, number][]): JsonNode {
  const items = widgets.map(([shortName, x1, y1, x2, y2]) =>
    `{"CLASS":"org.xcontest.XCTrack.widget.${shortName}","X1":${x1},"Y1":${y1},"X2":${x2},"Y2":${y2}}`
  )
  return parseJson(
    '{"layout":{"landscape":[{"CLASS":"org.xcontest.XCTrack.page.WPEmpty","widgets":[' +
    items.join(',') + ']}],"portrait":[]}}'
  )
}

/** La page unique de ce document, relue par le chemin normal — `readLayout`. */
function buildPage(widgets: [string, number, number, number, number][]): Page {
  return readLayout(buildDocument(widgets)).landscape[0]!
}

function boxesOf(page: Page): { x1: number; y1: number; x2: number; y2: number }[] {
  return page.widgets.map((w) => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))
}

/* ========================================================== recouvrement géométrique */

describe('coversEntirely — l’union des rangs supérieurs', () => {
  const target = { x1: 1000, y1: 1000, x2: 3000, y2: 3000 }

  it('rend faux quand rien ne recouvre', () => {
    expect(coversEntirely(target, [])).toBe(false)
    expect(coversEntirely(target, [{ x1: 5000, y1: 5000, x2: 6000, y2: 6000 }])).toBe(false)
  })

  it('rend vrai pour un recouvrant strictement plus grand, et pour l’égalité exacte', () => {
    expect(coversEntirely(target, [{ x1: 0, y1: 0, x2: 10000, y2: 10000 }])).toBe(true)
    expect(coversEntirely(target, [{ ...target }])).toBe(true)
  })

  it('rend faux dès qu’il manque un coin', () => {
    // Trois quarts couverts, le quart bas-droit libre.
    expect(coversEntirely(target, [
      { x1: 1000, y1: 1000, x2: 3000, y2: 2000 },
      { x1: 1000, y1: 2000, x2: 2000, y2: 3000 }
    ])).toBe(false)
  })

  it('rend vrai quand deux recouvrants jointifs se partagent la cible', () => {
    // C'est le cas des deux `WButtonBrightness` du corpus : chacun ne couvre qu'une
    // moitié, et c'est leur union qui mure.
    expect(coversEntirely(target, [
      { x1: 1000, y1: 1000, x2: 3000, y2: 2000 },
      { x1: 1000, y1: 2000, x2: 3000, y2: 3000 }
    ])).toBe(true)
  })

  it('rend faux quand les deux recouvrants laissent une bande entre eux', () => {
    expect(coversEntirely(target, [
      { x1: 1000, y1: 1000, x2: 3000, y2: 1900 },
      { x1: 1000, y1: 2100, x2: 3000, y2: 3000 }
    ])).toBe(false)
  })
})

/* ================================================================== inatteignables */

describe('unreachableWidgets — ce qu’aucun clic ne peut atteindre', () => {
  it('ne mure personne quand les widgets ne se touchent pas', () => {
    const page = buildPage([
      ['WAltitude', 0, 0, 5000, 5000],
      ['WSpeed', 5000, 5000, 10000, 10000]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([false, false])
  })

  it('mure un widget entièrement recouvert par un rang supérieur', () => {
    const page = buildPage([
      ['WButtonBrightness', 2000, 2000, 4000, 4000],
      ['WThermalAssistant', 1000, 1000, 5000, 5000]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([true, false])
  })

  it('ne mure pas le même widget quand il est au-DESSUS : seul le rang compte', () => {
    const page = buildPage([
      ['WThermalAssistant', 1000, 1000, 5000, 5000],
      ['WButtonBrightness', 2000, 2000, 4000, 4000]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([false, false])
  })

  it('mure par l’UNION de plusieurs rangs supérieurs, qu’aucun ne suffit à murer seul', () => {
    const page = buildPage([
      ['WCompDistanceToGoal', 0, 0, 4000, 4000],
      ['WGlide', 0, 0, 2000, 4000],
      ['WSpeed', 2000, 0, 4000, 4000]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([true, false, false])
  })

  it('mure un widget de surface nulle ou inversée — `widgetAtPoint` le saute', () => {
    const page = buildPage([
      ['WAltitude', 3000, 3000, 3000, 6000],
      ['WSpeed', 6000, 6000, 4000, 8000]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([true, true])
  })

  it('ignore les recouvrants dégénérés : un rectangle plat ne mure rien', () => {
    const page = buildPage([
      ['WAltitude', 1000, 1000, 3000, 3000],
      ['WSpeed', 0, 0, 10000, 0]
    ])
    expect(unreachableWidgets(boxesOf(page))).toEqual([false, true])
  })

  /**
   * Le contrôle qui compte : la promesse de la liste n'est pas « le calcul est cohérent
   * avec lui-même », c'est « aucun clic ne l'atteint ». On l'éprouve donc contre
   * `widgetAtPoint`, la fonction que l'éditeur emploie réellement, sur un maillage serré.
   */
  it('s’accorde avec `widgetAtPoint` sur toute la surface des widgets murés', () => {
    const page = buildPage([
      ['WButtonNavig', 8000, 8000, 10000, 10000],
      ['WAltitude', 0, 0, 2000, 2000],
      ['WLiveMessage', 0, 7500, 10000, 10000],
      ['WSpeed', 4000, 4000, 6000, 6000]
    ])
    const boxes = boxesOf(page)
    const murés = unreachableWidgets(boxes)
    expect(murés).toEqual([true, false, false, false])

    boxes.forEach((box, index) => {
      let atteint = false
      for (let i = 0; i <= 20; i += 1) {
        for (let j = 0; j <= 20; j += 1) {
          const point = {
            x: box.x1 + ((box.x2 - box.x1) * i) / 20,
            y: box.y1 + ((box.y2 - box.y1) * j) / 20
          }
          if (widgetAtPoint(boxes, point) === index) atteint = true
        }
      }
      expect(atteint, `rang ${index + 1}`).toBe(!murés[index])
    })
  })
})

/* ============================================ le corpus réel : exactement six, mesurés */

describe('la configuration de référence', () => {
  it('compte exactement six widgets inatteignables, et ce sont ceux-là', () => {
    const layout = readLayout(parseJson(readFileSync(PAGES_2026, 'utf8')))
    const murés: string[] = []
    let total = 0
    for (const orientation of ['landscape', 'portrait'] as const) {
      layout[orientation].forEach((page, rank) => {
        total += page.widgets.length
        unreachableWidgets(boxesOf(page)).forEach((mure, index) => {
          if (mure) murés.push(`${orientation}[${rank}] #${index} ${page.widgets[index]!.shortName}`)
        })
      })
    }
    expect(total).toBe(105)
    expect(murés).toEqual([
      'landscape[3] #0 WButtonBrightness',
      'landscape[3] #1 WButtonBrightness',
      'landscape[4] #8 WButtonNavig',
      'landscape[4] #9 WButtonNavig',
      'landscape[4] #16 WCompDistanceToGoal',
      'landscape[4] #17 WCompAltitudeOverGoal'
    ])
  })

  /**
   * Ce qui contredit l'énoncé du backlog : les deux `WLiveMessage` ne sont PAS
   * inatteignables. Ils sont au premier plan, et ce sont eux qui volent les clics des
   * quatre widgets murés de `landscape[4]`. Deux de ces quatre, `WButtonNavig`, dessinent
   * un pictogramme que le pilote voit sur son appareil (`rendu-en-vol.md` § 4) : la liste
   * est le seul chemin qui y mène.
   */
  it('ne mure aucun WLiveMessage — c’est lui qui mure les autres', () => {
    const layout = readLayout(parseJson(readFileSync(PAGES_2026, 'utf8')))
    for (const page of layout.landscape) {
      const murés = unreachableWidgets(boxesOf(page))
      page.widgets.forEach((widget, index) => {
        if (widget.shortName === 'WLiveMessage') expect(murés[index]).toBe(false)
      })
    }
  })
})

/* =========================================================== ordre et contenu des lignes */

const SAMPLE: [string, number, number, number, number][] = [
  ['WButtonNavig', 8000, 8000, 10000, 10000],
  ['WAltitude', 0, 0, 2000, 2000],
  ['WAltitude', 2000, 0, 4000, 2000],
  ['WLiveMessage', 0, 7500, 10000, 10000]
]

function build(page: Page, selection?: number, onSelect: (index: number) => void = () => {}) {
  return renderWidgetList({
    page, device: DEVICE, orientation: 'landscape', language: 'fr', selection, onSelect
  })
}

function rowsOf(list: { element: HTMLElement }): HTMLElement[] {
  return [...list.element.querySelectorAll('.wlist__row')] as HTMLElement[]
}

describe('l’ordre de la liste', () => {
  it('suit l’ordre du fichier, rang 1 en haut', () => {
    const list = build(buildPage(SAMPLE))
    expect(rowsOf(list).map((row) => row.dataset.index)).toEqual(['0', '1', '2', '3'])
    expect(rowsOf(list).map((row) => row.querySelector('.wlist__rank')?.textContent))
      .toEqual(['1', '2', '3', '4'])
    expect(rowsOf(list).map((row) => row.dataset.shortName))
      .toEqual(['WButtonNavig', 'WAltitude', 'WAltitude', 'WLiveMessage'])
  })

  it('marque les deux extrémités : le fond en haut, le premier plan en bas', () => {
    const list = build(buildPage(SAMPLE))
    const edges = [...list.element.querySelectorAll('.wlist__edge')].map((e) => e.textContent)
    expect(edges).toEqual(['Rang 1 · au fond', 'Rang 4 · au premier plan'])
    // L'ordre dans le DOM compte autant que le texte : l'étiquette « fond » doit précéder
    // la liste, sinon elle désigne l'autre bout.
    const children = [...list.element.children].map((c) => c.className)
    expect(children.indexOf('wlist__edge')).toBeLessThan(children.indexOf('wlist__rows'))
    expect(children.lastIndexOf('wlist__edge')).toBeGreaterThan(children.indexOf('wlist__rows'))
  })

  it('distingue les homonymes par leur taille et leur vignette de repérage', () => {
    const list = build(buildPage(SAMPLE))
    const rows = rowsOf(list)
    // Deux `WAltitude` de même taille, à des places différentes : c'est la vignette qui
    // les sépare, et elle est posée aux coordonnées du fichier.
    expect(rows[1]?.querySelector('.wlist__name')?.textContent)
      .toBe(rows[2]?.querySelector('.wlist__name')?.textContent)
    const mark = (row: HTMLElement): string[] => {
      const el = row.querySelector('.wlist__mark') as HTMLElement
      return [el.style.left, el.style.top, el.style.width, el.style.height]
    }
    expect(mark(rows[1]!)).toEqual(['0%', '0%', '20%', '20%'])
    expect(mark(rows[2]!)).toEqual(['20%', '0%', '20%', '20%'])
    // La taille en millimètres accompagne le nom : c'est elle que l'assistance vocale lit.
    expect(rows[1]?.getAttribute('aria-label')).toContain('millimètres')
    // `\u202f` : l'espace fine insécable qu'`Intl` pose devant l'unité en français. Elle
    // est écrite en échappement plutôt qu'au clavier, sans quoi personne ne verrait qu'il
    // ne s'agit pas d'une espace ordinaire — et c'est elle qui empêche le navigateur de
    // couper la ligne entre « 17,4 » et « mm ».
    expect(rows[1]?.querySelector('.wlist__size')?.textContent).toMatch(/^\d+,\d+ × \d+,\d+\u202fmm$/)
  })
})

describe('les deux marques', () => {
  it('signale l’inatteignable, et ne le confond pas avec l’absence de dessin', () => {
    const list = build(buildPage(SAMPLE))
    const rows = rowsOf(list)
    // Rang 1 : muré par le `WLiveMessage` du dernier rang.
    expect(rows[0]?.dataset.unreachable).toBe('oui')
    expect(rows[0]?.querySelector('.wlist__flag--blocked')).not.toBeNull()
    expect(rows[0]?.dataset.blank).toBe('non')
    // Rang 4 : ne dessine rien, mais il est au premier plan — parfaitement atteignable.
    expect(rows[3]?.dataset.blank).toBe('oui')
    expect(rows[3]?.dataset.unreachable).toBe('non')
    expect(rows[3]?.querySelector('.wlist__flag--blocked')).toBeNull()
    expect(rows[3]?.querySelector('.wlist__flag--blank')).not.toBeNull()
    // Le compte annoncé en tête est celui des murés, pas celui des sans-dessin.
    expect(list.element.querySelector('.wlist__alert')?.textContent)
      .toBe('1 inatteignable dans l’éditeur')
  })

  it('n’annonce rien quand aucun widget n’est muré', () => {
    const list = build(buildPage([['WAltitude', 0, 0, 2000, 2000]]))
    expect(list.element.querySelector('.wlist__alert')).toBeNull()
  })

  it('dit ce qu’il en est dans l’intitulé lu par l’assistance vocale', () => {
    const rows = rowsOf(build(buildPage(SAMPLE)))
    expect(rows[0]?.getAttribute('aria-label')).toContain('Rang 1 sur 4')
    expect(rows[0]?.getAttribute('aria-label')).toContain('inatteignable au clic dans cet éditeur')
    expect(rows[3]?.getAttribute('aria-label')).toContain('ne dessine rien sur l’appareil')
  })
})

/* ================================================ synchronisation dans les deux sens */

describe('la sélection, dans les deux sens', () => {
  it('de la liste vers la page : un clic sur une ligne annonce son rang', () => {
    const choisis: number[] = []
    const list = build(buildPage(SAMPLE), undefined, (index) => choisis.push(index))
    rowsOf(list)[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(choisis).toEqual([2])
    // Et la ligne se met en évidence sans qu'on ait à le lui redemander.
    expect(rowsOf(list)[2]?.getAttribute('aria-selected')).toBe('true')
  })

  it('de la page vers la liste : `select` met en évidence sans rappeler `onSelect`', () => {
    const choisis: number[] = []
    const list = build(buildPage(SAMPLE), undefined, (index) => choisis.push(index))
    list.select(3)
    expect(rowsOf(list).map((r) => r.getAttribute('aria-selected')))
      .toEqual(['false', 'false', 'false', 'true'])
    // Le point qui empêche la boucle : les deux sens ne peuvent pas se relancer l'un l'autre.
    expect(choisis).toEqual([])
  })

  it('honore la sélection initiale, et sait revenir à « rien »', () => {
    const list = build(buildPage(SAMPLE), 1)
    expect(rowsOf(list)[1]?.getAttribute('aria-selected')).toBe('true')
    list.select(undefined)
    expect(rowsOf(list).every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true)
  })

  it('reste navigable au clavier et n’offre qu’un seul arrêt de tabulation', () => {
    const choisis: number[] = []
    const list = build(buildPage(SAMPLE), 0, (index) => choisis.push(index))
    const rows = rowsOf(list)
    const box = list.element.querySelector('.wlist__rows')!
    expect(box.getAttribute('role')).toBe('listbox')
    expect(rows.every((r) => r.getAttribute('role') === 'option')).toBe(true)
    expect(rows.filter((r) => (r as HTMLElement).tabIndex === 0).map((r) => r.dataset.index))
      .toEqual(['0'])

    const press = (key: string): void => {
      box.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
    press('ArrowDown')
    press('ArrowDown')
    press('End')
    press('Home')
    expect(choisis).toEqual([1, 2, 3, 0])
    expect(rows.filter((r) => (r as HTMLElement).tabIndex === 0).map((r) => r.dataset.index))
      .toEqual(['0'])
  })

  it('ne dépasse pas les extrémités', () => {
    const choisis: number[] = []
    const list = build(buildPage(SAMPLE), 0, (index) => choisis.push(index))
    const box = list.element.querySelector('.wlist__rows')!
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(choisis).toEqual([0, 3, 3])
  })
})

/* ============================================================ survie à une annulation */

describe('après une annulation', () => {
  /**
   * L'annulation rend un **arbre neuf** : plus rien de ce que la liste tenait n'y pointe.
   * C'est le mécanisme de `main.ts` qui est éprouvé ici — relire la mise en page depuis le
   * document rendu par `undo()`, reconstruire la liste, et retrouver la sélection **par son
   * rang**, jamais par référence.
   */
  it('la liste reconstruite depuis l’arbre neuf retrouve rangs, marques et sélection', () => {
    const history = createHistory(buildDocument(SAMPLE))
    const pageOfDocument = (document: JsonNode): Page => readLayout(document).landscape[0]!

    const avant = build(pageOfDocument(history.current()), 0)
    expect(rowsOf(avant).length).toBe(4)
    expect(rowsOf(avant)[0]?.dataset.unreachable).toBe('oui')

    // On supprime le `WLiveMessage` du premier plan : c'est lui qui murait le rang 1.
    const page = readLayout(history.current()).landscape[0]!
    removeWidget(page.node, 3)
    history.record('Supprimer Message Livetrack')
    const pendant = build(pageOfDocument(history.current()), 0)
    expect(rowsOf(pendant).length).toBe(3)
    expect(rowsOf(pendant)[0]?.dataset.unreachable).toBe('non')

    // Annulation : l'arbre est neuf, et tout doit revenir tel quel.
    const revenu = history.undo()
    // L'arbre est bien neuf : aucun nœud de l'ancien n'y survit.
    expect(revenu).not.toBe(page.node)
    const apres = build(pageOfDocument(revenu), 0)
    expect(rowsOf(apres).map((r) => r.dataset.shortName))
      .toEqual(['WButtonNavig', 'WAltitude', 'WAltitude', 'WLiveMessage'])
    expect(rowsOf(apres)[0]?.dataset.unreachable).toBe('oui')
    expect(rowsOf(apres)[0]?.getAttribute('aria-selected')).toBe('true')
  })

  it('un rang devenu hors bornes ne désigne plus personne', () => {
    const history = createHistory(buildDocument(SAMPLE))
    const page = readLayout(history.current()).landscape[0]!
    removeWidget(page.node, 3)
    history.record('Supprimer Message Livetrack')
    // `main.ts` remet la sélection à `undefined` au-delà des bornes ; la liste, elle, ne
    // doit rien mettre en évidence si on lui passe malgré tout un rang qui n'existe plus.
    const list = build(readLayout(history.current()).landscape[0]!, 3)
    expect(rowsOf(list).every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true)
  })

  it('un changement d’empilement libère les murés, et la liste le dit', () => {
    const document = buildDocument(SAMPLE)
    const page = readLayout(document).landscape[0]!
    expect(rowsOf(build(page)).map((r) => r.dataset.unreachable)).toEqual(['oui', 'non', 'non', 'non'])
    // Le rang 1 passe au premier plan : plus rien ne le recouvre.
    reorderWidget(page.node, 0, 3)
    const apres = readLayout(document).landscape[0]!
    expect(rowsOf(build(apres)).map((r) => r.dataset.shortName))
      .toEqual(['WAltitude', 'WAltitude', 'WLiveMessage', 'WButtonNavig'])
    expect(rowsOf(build(apres)).map((r) => r.dataset.unreachable))
      .toEqual(['non', 'non', 'non', 'non'])
  })
})

/* ============================================ le geste qui vient de finir sur la page */

/**
 * Un redimensionnement laissait la liste sur l'ancienne taille jusqu'au prochain rendu
 * complet — soit, le plus souvent, jusqu'au changement de page. Le pilote d'essai l'a
 * relevé : « elle affiche encore l'ancienne taille ».
 *
 * `refresh` remet à jour ce que le geste périme **sans refaire les lignes** : le focus, la
 * tabulation mobile et la position de défilement de la liste sont ce que le pilote perdrait
 * autrement à chaque cran d'un glissé.
 */
describe('refresh — la liste suit le geste', () => {
  /** Le geste lui-même : le document est muté, la mise en page relue, comme dans `repaint`. */
  function resize(
    document: JsonNode, index: number, bounds: { x1?: number; y1?: number; x2?: number; y2?: number }
  ): Page {
    const page = readLayout(document).landscape[0]!
    setWidgetBounds(page.widgets[index]!.node, bounds)
    return readLayout(document).landscape[0]!
  }

  it('la taille en millimètres et la vignette suivent le rectangle', () => {
    const document = buildDocument(SAMPLE)
    const list = build(readLayout(document).landscape[0]!)
    const rows = rowsOf(list)
    const sizeOf = (row: HTMLElement): string =>
      row.querySelector('.wlist__size')?.textContent ?? ''
    const markOf = (row: HTMLElement): string[] => {
      const mark = row.querySelector('.wlist__mark') as HTMLElement
      return [mark.style.left, mark.style.top, mark.style.width, mark.style.height]
    }
    const before = sizeOf(rows[1]!)
    expect(markOf(rows[1]!)).toEqual(['0%', '0%', '20%', '20%'])

    list.refresh(resize(document, 1, { x2: 5000, y2: 4000 }))

    expect(sizeOf(rows[1]!)).not.toBe(before)
    expect(markOf(rows[1]!)).toEqual(['0%', '0%', '50%', '40%'])
    // L'intitulé lu par l'assistance vocale porte la taille : il se périme avec elle.
    expect(rows[1]?.getAttribute('aria-label')).toContain(sizeOf(rows[1]!).split(' × ')[0])
    // Et le tableau rendu à l'appelant n'est pas resté sur la photographie d'avant.
    expect(list.entries[1]?.widthMm).toBeGreaterThan(list.entries[2]!.widthMm)
  })

  it('les lignes ne sont pas refaites : le focus du pilote reste où il était', () => {
    const document = buildDocument(SAMPLE)
    const list = build(readLayout(document).landscape[0]!, 2)
    globalThis.document.body.append(list.element)
    const rows = rowsOf(list)
    rows[2]!.focus()
    expect(globalThis.document.activeElement).toBe(rows[2])

    list.refresh(resize(document, 2, { x2: 6000 }))

    // Le même objet, toujours dans le document, toujours sous le focus. Une
    // reconstruction aurait rendu trois lignes neuves et renvoyé le focus au corps.
    expect(rowsOf(list)[2]).toBe(rows[2])
    expect(globalThis.document.activeElement).toBe(rows[2])
    // La sélection n'est pas du ressort de `refresh` : elle n'y est ni reposée ni perdue.
    expect(rows[2]?.getAttribute('aria-selected')).toBe('true')
    expect(rows[2]?.tabIndex).toBe(0)
    list.element.remove()
  })

  it('un gadget qui se dégage perd sa marque, et le compte de tête suit', () => {
    const document = buildDocument(SAMPLE)
    const list = build(readLayout(document).landscape[0]!)
    const rows = rowsOf(list)
    expect(rows[0]?.dataset.unreachable).toBe('oui')
    expect(list.element.querySelector('.wlist__alert')?.textContent)
      .toBe('1 inatteignable dans l’éditeur')

    // Le `WLiveMessage` du premier plan se rétracte : le `WButtonNavig` du fond, qu'il
    // recouvrait entièrement, redevient atteignable au clic.
    list.refresh(resize(document, 3, { y1: 9500, x2: 5000 }))

    expect(rows[0]?.dataset.unreachable).toBe('non')
    expect(rows[0]?.classList.contains('wlist__row--blocked')).toBe(false)
    expect(rows[0]?.querySelector('.wlist__flag--blocked')).toBeNull()
    expect(rows[0]?.getAttribute('aria-label'))
      .not.toContain('inatteignable au clic dans cet éditeur')
    expect(list.element.querySelector('.wlist__alert')).toBeNull()
  })

  it('et réciproquement : un gadget muré gagne sa marque et le compte reparaît', () => {
    const document = buildDocument([
      ['WButtonNavig', 0, 0, 2000, 2000],
      ['WAltitude', 5000, 5000, 6000, 6000]
    ])
    const list = build(readLayout(document).landscape[0]!)
    const rows = rowsOf(list)
    expect(rows[0]?.dataset.unreachable).toBe('non')
    expect(list.element.querySelector('.wlist__alert')).toBeNull()

    // Le rang supérieur s'étale sur toute la page : plus aucun point du rang 1 n'échappe.
    list.refresh(resize(document, 1, { x1: 0, y1: 0, x2: 10000, y2: 10000 }))

    expect(rows[0]?.dataset.unreachable).toBe('oui')
    expect(rows[0]?.querySelector('.wlist__flag--blocked')).not.toBeNull()
    expect(list.element.querySelector('.wlist__alert')?.textContent)
      .toBe('1 inatteignable dans l’éditeur')
    // La marque « rien au repos » tient au type, pas à la géométrie : elle ne bouge pas.
    expect(rows[0]?.dataset.blank).toBe('non')
  })

  it('la marque du fond ne se dédouble pas à force de rafraîchir', () => {
    const document = buildDocument(SAMPLE)
    const list = build(readLayout(document).landscape[0]!)
    const rows = rowsOf(list)
    for (let step = 0; step < 5; step += 1) {
      list.refresh(resize(document, 1, { x2: 2100 + step * 100 }))
    }
    expect(rows[0]?.querySelectorAll('.wlist__flag--blocked').length).toBe(1)
    expect(rows[0]?.querySelectorAll('.wlist__flags').length).toBe(1)
    expect(rows[3]?.querySelectorAll('.wlist__flag--blank').length).toBe(1)
    expect(list.element.querySelectorAll('.wlist__alert').length).toBe(1)
  })

  it('ne touche à rien si la page n’a plus le même nombre de rangs', () => {
    // Ajout, retrait, réordonnancement : `main.ts` reconstruit la liste entière. Un
    // rafraîchissement appliqué là ferait correspondre des rangs à d'autres gadgets.
    const document = buildDocument(SAMPLE)
    const list = build(readLayout(document).landscape[0]!)
    const before = rowsOf(list).map((row) => row.querySelector('.wlist__size')?.textContent)
    const page = readLayout(document).landscape[0]!
    removeWidget(page.node, 3)
    list.refresh(readLayout(document).landscape[0]!)
    expect(rowsOf(list).map((row) => row.querySelector('.wlist__size')?.textContent))
      .toEqual(before)
  })

  it('reste appelable sur une page sans gadget', () => {
    const list = build(buildPage([]))
    expect(() => list.refresh(buildPage([]))).not.toThrow()
  })
})

/* ================================================================= cas limites de la vue */

describe('cas limites', () => {
  it('une page sans widget ne dresse aucune liste, et le dit', () => {
    const list = build(buildPage([]))
    expect(list.entries).toEqual([])
    expect(list.element.querySelector('.wlist__rows')).toBeNull()
    expect(list.element.querySelector('.wlist__empty')?.textContent)
      .toBe('Cette page ne porte aucun gadget.')
    // `select` reste appelable : `main.ts` ne se demande pas si la page est vide.
    expect(() => list.select(0)).not.toThrow()
  })

  it('les millimètres suivent le gabarit choisi, jamais le fichier', () => {
    const page = buildPage([['WAltitude', 0, 0, 5000, 5000]])
    const petit = widgetListEntries(page.widgets, DEVICES[0]!, 'landscape', 'fr')[0]!
    const grand = widgetListEntries(page.widgets, DEVICES[3]!, 'landscape', 'fr')[0]!
    expect(petit.widthMm).toBeGreaterThan(0)
    expect(grand.widthMm).not.toBe(petit.widthMm)
  })

  it('rend le nom lisible dans la langue demandée, et le nom de classe à défaut', () => {
    const page = buildPage([['WAltitude', 0, 0, 1000, 1000], ['WInconnu', 2000, 0, 3000, 1000]])
    const entries = widgetListEntries(page.widgets, DEVICE, 'landscape', 'fr')
    expect(entries[0]?.name).toBe('Altitude GPS')
    expect(entries[1]?.name).toBe('WInconnu')
    expect(widgetListEntries(page.widgets, DEVICE, 'landscape', 'en')[0]?.name).toBe('GPS Alt')
  })
})

/* ================================================== les deux axes de langue */

describe('les deux axes de langue', () => {
  it('traduit notre prose sans toucher aux noms de gadgets', () => {
    const page = buildPage([['WAltitude', 0, 0, 2000, 2000]])
    const list = renderWidgetList({
      page, device: DEVICE, orientation: 'landscape', language: 'fr',
      selection: undefined, onSelect: () => {}, tr: GERMAN
    })

    expect(list.element.querySelector('.wlist__title')?.textContent)
      .toBe('Widgets der Seite')
    // Le libellé, lui, reste celui que l'appareil du pilote affiche.
    expect(list.element.querySelector('.wlist__name')?.textContent).toBe('Altitude GPS')
  })

  it('l’intitulé vocal mêle les deux axes sans les confondre', () => {
    const page = buildPage([['WAltitude', 0, 0, 2000, 2000]])
    const list = renderWidgetList({
      page, device: DEVICE, orientation: 'landscape', language: 'en',
      selection: undefined, onSelect: () => {}, tr: FRENCH
    })
    const spoken = rowsOf(list)[0]?.getAttribute('aria-label') ?? ''
    // « Rang 1 sur 1 » est de nous, « GPS Alt » est de XCTrack.
    expect(spoken).toContain('Rang 1 sur 1')
    expect(spoken).toContain('GPS Alt')
    expect(spoken).toContain('millimètres')
  })

  it('sans traducteur, dit mot pour mot ce que le catalogue français dit', () => {
    const page = buildPage(SAMPLE)
    const inherited = build(page)
    const french = renderWidgetList({
      page, device: DEVICE, orientation: 'landscape', language: 'fr',
      selection: undefined, onSelect: () => {}, tr: FRENCH
    })
    expect(inherited.element.textContent).toBe(french.element.textContent)
    expect(inherited.element.innerHTML).toBe(french.element.innerHTML)
  })
})
