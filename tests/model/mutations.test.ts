import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { decode, getIndex, getMember, readNumber, readString } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import {
  bringWidgetToFront,
  cloneNode,
  createPage,
  duplicatePage,
  duplicateWidget,
  insertPage,
  insertWidget,
  lowerWidget,
  moveWidgetBy,
  moveWidgetToPage,
  pageWidgets,
  pagesNode,
  raiseWidget,
  readWidgetBounds,
  removePage,
  removeWidget,
  reorderPage,
  reorderWidget,
  sendWidgetToBack,
  setPageClass,
  setWidgetBounds,
  type Orientation
} from '../../src/model/mutations'
import { BACKUP_2026 } from '../fixtures/paths'

const source = readFileSync(BACKUP_2026, 'utf8')
const load = (): JsonNode => parseJson(source)

const page = (document: JsonNode, orientation: Orientation, index: number): JsonNode =>
  getIndex(pagesNode(document, orientation), index)!
const widgetAt = (pageNode: JsonNode, index: number): JsonNode =>
  getIndex(pageWidgets(pageNode), index)!
const classNames = (pageNode: JsonNode): string[] =>
  pageWidgets(pageNode).items.map((w) => readString(w, 'CLASS') ?? '')

/**
 * Toutes les feuilles d'un sous-arbre, sous la forme `clé=texte source`, sans leur chemin :
 * un réordonnancement ne doit pas faire varier ce relevé, une clé perdue si.
 */
function leaves(node: JsonNode, key = ''): string[] {
  if (node.kind === 'object') return node.entries.flatMap(([k, v]) => leaves(v, decode(k)))
  if (node.kind === 'array') return node.items.flatMap((item) => leaves(item, key))
  return [`${key}=${node.raw}`]
}

/** Le même relevé, privé des quatre coordonnées — les seules valeurs qu'on modifie ici. */
const withoutBounds = (list: string[]): string[] =>
  list.filter((entry) => !/^[XY][12]=/.test(entry)).sort()

/** L'unique plage divergente entre deux textes, vue par préfixe et suffixe communs. */
function singleDifference(a: string, b: string): { before: string; after: string } {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start
    && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  return { before: a.slice(start, a.length - end), after: b.slice(start, b.length - end) }
}

describe('coordonnées d’un widget', () => {
  it('déplace les quatre coordonnées en une seule opération', () => {
    const document = load()
    // WFL, 6042 3103 8125 4828 : un widget qui a de la marge sur ses quatre côtés.
    const widget = widgetAt(page(document, 'landscape', 0), 4)
    const before = readWidgetBounds(widget)

    moveWidgetBy(widget, 100, -200)

    expect(readWidgetBounds(widget)).toEqual({
      x1: before.x1 + 100, y1: before.y1 - 200, x2: before.x2 + 100, y2: before.y2 - 200
    })
  })

  it('redimensionne en ne touchant que les coordonnées fournies', () => {
    const document = load()
    const widget = widgetAt(page(document, 'landscape', 4), 0)
    const before = readWidgetBounds(widget)

    setWidgetBounds(widget, { x2: 9000 })

    expect(readWidgetBounds(widget)).toEqual({ ...before, x2: 9000 })
  })

  it('refuse une coordonnée non entière ou hors du repère 0–10000', () => {
    const document = load()
    const widget = widgetAt(page(document, 'landscape', 4), 0)
    const untouched = serializeJson(widget)

    expect(() => setWidgetBounds(widget, { x1: 2500.5 })).toThrow()
    expect(() => setWidgetBounds(widget, { x1: 10001 })).toThrow()
    expect(() => setWidgetBounds(widget, { y1: -1 })).toThrow()
    expect(() => setWidgetBounds(widget, { x1: Number.NaN })).toThrow()
    // Le refus est atomique : une coordonnée valide accompagnée d'une invalide n'écrit rien.
    expect(() => setWidgetBounds(widget, { x1: 1250, y1: 99999 })).toThrow()
    expect(serializeJson(widget)).toBe(untouched)
  })

  it('refuse de pousser un widget hors de la page ou de le retourner', () => {
    const document = load()
    // WFL, 6042 3103 8125 4828 : l'aimantation et le bornage se font en amont, ici on refuse.
    const widget = widgetAt(page(document, 'landscape', 0), 4)
    const untouched = serializeJson(widget)

    expect(() => moveWidgetBy(widget, 2000, 0)).toThrow()
    expect(() => moveWidgetBy(widget, 0, -4000)).toThrow()
    expect(() => setWidgetBounds(widget, { x2: 6042 })).toThrow()
    expect(() => setWidgetBounds(widget, { y2: 1000 })).toThrow()
    expect(serializeJson(widget)).toBe(untouched)
  })

  it('un déplacement nul ne change pas un octet', () => {
    const document = load()
    moveWidgetBy(widgetAt(page(document, 'landscape', 4), 0), 0, 0)
    expect(serializeJson(document)).toBe(source)
  })
})

describe('fidélité à l’octet près', () => {
  it('déplacer un widget ne change QUE ses quatre coordonnées', () => {
    const document = load()
    const widget = widgetAt(page(document, 'portrait', 0), 1)
    const before = readWidgetBounds(widget)

    moveWidgetBy(widget, 11, 11)

    let output = serializeJson(document)
    expect(output).not.toBe(source)

    // On annule les quatre modifications par voie textuelle : ce qui reste doit être
    // rigoureusement la source. C'est le test central du projet, transposé aux mutations.
    for (const [field, key] of [['x1', 'X1'], ['y1', 'Y1'], ['x2', 'X2'], ['y2', 'Y2']] as const) {
      const old = before[field]
      output = output.replace(`"${key}": ${old + 11}`, `"${key}": ${old}`)
    }
    expect(output).toBe(source)
  })

  it('changer une seule coordonnée ne touche qu’une poignée de caractères', () => {
    const document = load()
    const widget = widgetAt(page(document, 'portrait', 0), 0)
    const before = readWidgetBounds(widget)

    setWidgetBounds(widget, { x1: before.x1 === 0 ? 1250 : 0 })

    const output = serializeJson(document)
    /*
     * ⚠️ **L'assertion sans laquelle tout ce qui suit est vrai d'un document intact.**
     *
     * `singleDifference` rend `{ before: '', after: '' }` quand les deux textes sont
     * identiques, et `/^\d*$/` accepte la chaîne vide : les quatre contrôles du dessous
     * étaient donc verts quand **rien n'avait bougé**. Mesuré en neutralisant l'écriture
     * de `mutations.ts` (`if (false && next[field] !== current[field])`) :
     * `setWidgetBounds` n'écrivait plus un octet, et ce test-ci — qui porte son nom —
     * restait vert. (La propriété, elle, est tenue ailleurs : la même mutation tue
     * vingt-deux tests de la suite. C'est l'intitulé qui promettait ce qu'il ne mesurait
     * pas.)
     *
     * **Le correctif n'est pas de passer les motifs en `\d+`**, contrairement à ce qu'on
     * pourrait croire, et c'est mesuré aussi : `singleDifference` compare un préfixe et un
     * suffixe communs, et le suffixe **absorbe** un chiffre partagé. Ici `"X1": 0` devient
     * `"X1": 1250` ; le `0` final de `1250` coïncide avec le `0` d'origine, si bien que la
     * plage divergente vaut légitimement `'' → '125'`. `\d+` rendrait ce test rouge sur du
     * code juste, ce qui est pire que le trou qu'il boucherait.
     *
     * Ce qui manquait n'est donc pas un `+`, c'est de dire que le texte a bougé.
     */
    expect(output).not.toBe(source)

    const difference = singleDifference(source, output)
    // Une seule plage diverge, et elle tient dans les chiffres du nombre remplacé.
    expect(difference.before).toMatch(/^\d*$/)
    expect(difference.after).toMatch(/^\d*$/)
    expect(difference.before.length).toBeLessThanOrEqual(5)
    expect(difference.after.length).toBeLessThanOrEqual(5)
  })

  it('supprimer puis réinsérer au même index restitue le document d’origine', () => {
    const document = load()
    const target = page(document, 'landscape', 4)

    const removed = removeWidget(target, 3)
    expect(serializeJson(document)).not.toBe(source)

    insertWidget(target, removed, 3)
    expect(serializeJson(document)).toBe(source)
  })

  it('supprimer puis réinsérer une page au même index restitue le document d’origine', () => {
    const document = load()

    const removed = removePage(document, 'portrait', 1)
    expect(serializeJson(document)).not.toBe(source)

    insertPage(document, 'portrait', removed, 1)
    expect(serializeJson(document)).toBe(source)
  })

  it('changer la classe d’une page ne change que sa classe', () => {
    const document = load()
    const target = page(document, 'portrait', 0)
    const before = readString(target, 'CLASS')!

    setPageClass(target, 'WPEmpty')

    expect(before).toBe('org.xcontest.XCTrack.widget.wp.WPXCAssistant')
    expect(readString(target, 'CLASS')).toBe('org.xcontest.XCTrack.widget.wp.WPEmpty')
    // Une seule plage diverge dans tout le fichier, et c'est la fin du nom de classe.
    expect(singleDifference(source, serializeJson(document)))
      .toEqual({ before: 'XCAssistant', after: 'Empty' })
  })
})

describe('ordre d’empilement', () => {
  const stack = (): { document: JsonNode; target: JsonNode } => {
    const document = load()
    return { document, target: page(document, 'landscape', 4) }
  }

  it('insère à la position demandée du tableau', () => {
    const { target } = stack()
    const before = classNames(target)
    const copy = duplicateWidget(widgetAt(target, 0), { x1: 0, y1: 0, x2: 1000, y2: 1000 })

    expect(insertWidget(target, copy, 2)).toBe(2)

    const after = classNames(target)
    expect(after).toHaveLength(before.length + 1)
    expect(after[2]).toBe(before[0])
    expect(after.slice(3)).toEqual(before.slice(2))
  })

  it('insère au premier plan par défaut', () => {
    const { target } = stack()
    const before = classNames(target)
    const copy = duplicateWidget(widgetAt(target, 0))

    expect(insertWidget(target, copy)).toBe(before.length)
    expect(classNames(target).slice(0, before.length)).toEqual(before)
  })

  it('avance et recule d’un rang', () => {
    const { target } = stack()
    const before = classNames(target)

    expect(raiseWidget(target, 0)).toBe(1)
    expect(classNames(target).slice(0, 3)).toEqual([before[1], before[0], before[2]])

    expect(lowerWidget(target, 1)).toBe(0)
    expect(classNames(target)).toEqual(before)
  })

  it('ne déborde pas aux extrémités', () => {
    const { target } = stack()
    const before = classNames(target)
    const last = before.length - 1

    expect(raiseWidget(target, last)).toBe(last)
    expect(lowerWidget(target, 0)).toBe(0)
    expect(classNames(target)).toEqual(before)
  })

  it('amène au premier plan et envoie en arrière-plan', () => {
    const { target } = stack()
    const before = classNames(target)
    const last = before.length - 1

    expect(bringWidgetToFront(target, 0)).toBe(last)
    expect(classNames(target)).toEqual([...before.slice(1), before[0]!])

    expect(sendWidgetToBack(target, last)).toBe(0)
    expect(classNames(target)).toEqual(before)
  })

  it('réordonne à un index arbitraire et refuse un index hors bornes', () => {
    const { target } = stack()
    const before = classNames(target)

    expect(reorderWidget(target, 0, 5)).toBe(5)
    expect(classNames(target)[5]).toBe(before[0])

    expect(() => reorderWidget(target, 0, before.length)).toThrow()
    expect(() => reorderWidget(target, -1, 0)).toThrow()
    expect(() => removeWidget(target, before.length)).toThrow()
    expect(() => insertWidget(target, cloneNode(widgetAt(target, 0)), before.length + 2)).toThrow()
  })
})

describe('déplacement d’une page à l’autre', () => {
  it('retire de la page source et insère à l’index demandé de la cible', () => {
    const document = load()
    const from = page(document, 'landscape', 4)
    const to = page(document, 'landscape', 0)
    const moved = widgetAt(from, 2)
    const fromBefore = classNames(from)
    const toBefore = classNames(to)

    expect(moveWidgetToPage(from, 2, to, 1)).toBe(1)

    expect(pageWidgets(from).items).not.toContain(moved)
    expect(pageWidgets(to).items[1]).toBe(moved)
    expect(classNames(from)).toEqual(fromBefore.filter((_, i) => i !== 2))
    expect(classNames(to)).toHaveLength(toBefore.length + 1)
  })

  it('sur la même page, se comporte comme un réordonnancement', () => {
    const document = load()
    const target = page(document, 'landscape', 4)
    const before = classNames(target)

    expect(moveWidgetToPage(target, 0, target, 3)).toBe(3)

    expect(classNames(target)).toHaveLength(before.length)
    expect(classNames(target)[3]).toBe(before[0])
  })
})

describe('duplication', () => {
  const EXOTIC = [
    '{',
    '  "CLASS": "org.xcontest.XCTrack.widget.w.WFutur",',
    '  "X1": 0,',
    '  "Y1": 0,',
    '  "X2": 1250,',
    '  "Y2": 1379,',
    '  "_border": false,',
    '  "_bg": 100,',
    '  "_theme": "",',
    '  "inventeEn2027": {',
    '    "seuil": 3.0,',
    '    "profil": [',
    '      1.0E7,',
    '      -0.0',
    '    ]',
    '  }',
    '}'
  ].join('\n')

  it('produit un objet indépendant : modifier la copie ne touche pas l’original', () => {
    const original = parseJson(EXOTIC)
    const copy = duplicateWidget(original, { x1: 2500, y1: 2759, x2: 3750, y2: 4138 })

    // Modification en profondeur de la copie, sur une clé que l'outil ne comprend pas.
    const nested = getMember(copy, 'inventeEn2027')!
    ;(nested as { kind: 'object'; entries: Array<[string, JsonNode]> }).entries[0]![1] =
      { kind: 'literal', raw: '42' }

    expect(serializeJson(original)).toBe(EXOTIC)
    expect(readWidgetBounds(copy)).toEqual({ x1: 2500, y1: 2759, x2: 3750, y2: 4138 })
    expect(readWidgetBounds(original)).toEqual({ x1: 0, y1: 0, x2: 1250, y2: 1379 })
  })

  it('recopie à l’identique tout ce qu’elle ne comprend pas', () => {
    const original = parseJson(EXOTIC)
    const copy = duplicateWidget(original)
    expect(serializeJson(copy)).toBe(EXOTIC)
  })

  it('duplique une page avec tous ses widgets', () => {
    const document = load()
    const target = page(document, 'portrait', 2)
    const copy = duplicatePage(target)

    expect(serializeJson(copy)).toBe(serializeJson(target))
    removeWidget(copy, 0)
    expect(pageWidgets(copy).items).toHaveLength(pageWidgets(target).items.length - 1)
  })
})

describe('pages', () => {
  it('insère, réordonne et supprime dans une orientation', () => {
    const document = load()
    const before = pagesNode(document, 'portrait').items.length

    const created = createPage('WPEmpty')
    expect(insertPage(document, 'portrait', created, 1)).toBe(1)
    expect(pagesNode(document, 'portrait').items).toHaveLength(before + 1)
    expect(getIndex(pagesNode(document, 'portrait'), 1)).toBe(created)

    expect(reorderPage(document, 'portrait', 1, 0)).toBe(0)
    expect(getIndex(pagesNode(document, 'portrait'), 0)).toBe(created)

    expect(removePage(document, 'portrait', 0)).toBe(created)
    expect(pagesNode(document, 'portrait').items).toHaveLength(before)
  })

  it('crée une page vide au format de XCTrack', () => {
    expect(serializeJson(createPage('WPEmpty'))).toBe(
      '{\n  "CLASS": "org.xcontest.XCTrack.widget.wp.WPEmpty",'
      + '\n  "navigations": "all",\n  "widgets": []\n}'
    )
    expect(serializeJson(createPage('WPCompetition', { kind: 'none' }))).toContain('"navigations": "none"')
    const listed = createPage('WPXCAssistant', {
      kind: 'list',
      classNames: ['org.xcontest.XCTrack.navig.TaskCompetition']
    })
    expect(serializeJson(listed)).toContain(
      '"navigations": [\n    "org.xcontest.XCTrack.navig.TaskCompetition"\n  ]'
    )
  })

  it('accepte les quatre classes de page, en nom court comme en nom complet', () => {
    for (const name of ['WPEmpty', 'WPCompetition', 'WPThermalAssistant', 'WPXCAssistant']) {
      expect(readString(createPage(name), 'CLASS')).toBe(`org.xcontest.XCTrack.widget.wp.${name}`)
    }
    // Un nom complet inconnu est transmis tel quel : un fichier peut porter une classe
    // qu'aucune version connue ne documente, et ce n'est pas à nous de la refuser.
    const document = load()
    const target = page(document, 'portrait', 0)
    setPageClass(target, 'org.xcontest.XCTrack.widget.wp.WPMissing')
    expect(readString(target, 'CLASS')).toBe('org.xcontest.XCTrack.widget.wp.WPMissing')
    expect(() => setPageClass(target, 'WPInventee')).toThrow()
    expect(() => createPage('WPInventee')).toThrow()
  })

  it('refuse une orientation ou un index inconnus', () => {
    const document = load()
    expect(() => pagesNode(document, 'diagonale' as Orientation)).toThrow()
    expect(() => removePage(document, 'portrait', 99)).toThrow()
    expect(() => insertPage(document, 'portrait', createPage('WPEmpty'), 99)).toThrow()
  })
})

describe('les clés inconnues survivent', () => {
  it('une suite de mutations variées ne perd ni n’invente aucune valeur', () => {
    const document = load()
    const pristine = withoutBounds(leaves(load()))
    expect(pristine.length).toBeGreaterThan(1000) // garde-fou : le relevé n'est pas vide

    const first = page(document, 'portrait', 0)
    const second = page(document, 'portrait', 1)
    const third = page(document, 'portrait', 2)
    const thirdClass = readString(third, 'CLASS')!

    // Un widget suivi par identité de bout en bout : c'est le même nœud qui voyage.
    const traveller = widgetAt(second, 2)
    const travellerBefore = withoutBounds(leaves(traveller))

    moveWidgetBy(widgetAt(first, 1), 100, -100)
    bringWidgetToFront(first, 0)
    moveWidgetToPage(second, 2, third, 0)
    sendWidgetToBack(third, 3)
    setWidgetBounds(widgetAt(third, 0), { x2: 5000 })
    reorderWidget(first, 1, 0)
    insertWidget(second, removeWidget(first, 0), 1)
    setPageClass(third, 'WPEmpty')

    // Le relevé attendu de la copie est pris sur l'ORIGINAL : comparer la copie à
    // elle-même laisserait passer une duplication qui perd des clés en chemin.
    const copySource = widgetAt(second, 1)
    const copyLeaves = withoutBounds(leaves(copySource))
    insertWidget(first, duplicateWidget(copySource, { x1: 0, y1: 0, x2: 1250, y2: 1379 }), 0)

    // Le voyageur a changé de page, d'index et de coordonnées ; tout le reste est intact.
    expect(withoutBounds(leaves(traveller))).toEqual(travellerBefore)
    expect(pageWidgets(third).items).toContain(traveller)

    // La classe de page est le seul écart hors coordonnées : on la remet pour que la
    // comparaison qui suit porte sur tout le reste, y compris les clés inconnues.
    expect(readString(third, 'CLASS')).toBe('org.xcontest.XCTrack.widget.wp.WPEmpty')
    setPageClass(third, thirdClass)

    // Au niveau du document : rien n'a disparu, rien n'est apparu hors la copie.
    expect(withoutBounds(leaves(document))).toEqual([...pristine, ...copyLeaves].sort())
  })

  it('un widget porteur de clés inconnues traverse toutes les primitives intact', () => {
    const document = load()
    const exotic = parseJson('{\n  "CLASS": "org.xcontest.XCTrack.widget.w.WFutur",'
      + '\n  "X1": 0,\n  "Y1": 0,\n  "X2": 1250,\n  "Y2": 1379,'
      + '\n  "inventeEn2027": {\n    "seuil": 3.0,\n    "couleur": -27091\n  }\n}')
    const first = page(document, 'landscape', 0)
    const second = page(document, 'landscape', 1)

    insertWidget(first, exotic, 0)
    moveWidgetBy(exotic, 2500, 2759)
    raiseWidget(first, 0)
    moveWidgetToPage(first, 1, second, 0)
    bringWidgetToFront(second, 0)
    setWidgetBounds(exotic, { x2: 8750 })

    // Le texte source des valeurs non comprises est reproduit caractère pour caractère :
    // ni 3.0 aplati en 3, ni la couleur Android signée réinterprétée.
    // Profondeur du nœud : layout > landscape > page > widgets > widget > clé.
    expect(serializeJson(document)).toContain(
      `"inventeEn2027": {\n${' '.repeat(14)}"seuil": 3.0,`
      + `\n${' '.repeat(14)}"couleur": -27091\n${' '.repeat(12)}}`
    )
    expect(readWidgetBounds(exotic)).toEqual({ x1: 2500, y1: 2759, x2: 8750, y2: 4138 })
    expect(readNumber(exotic, 'X1')).toBe(2500)
  })
})
