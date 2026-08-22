import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { decode, encode, getMember, setLiteral, setString } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { readLayout } from '../../src/model/layout'
import {
  allPageRefs,
  derivePagesDocument,
  findFreeTexts,
  keepPages,
  FREE_TEXT_KEYS,
  PAGES_ROOT_KEYS
} from '../../src/model/scope'
import { EXPORTS } from '../fixtures/paths'

const BACKUP = EXPORTS + '2026-08-20_backup-00.xcfg'
const PAGES = EXPORTS + '2026-08-20_pages-00.xcfg'

const exampleFiles = readdirSync(EXPORTS).filter((f) => f.endsWith('.xcfg'))

const read = (path: string): string => readFileSync(path, 'utf8')
const rootKeys = (node: JsonNode): string[] =>
  node.kind === 'object' ? node.entries.map(([raw]) => decode(raw)) : []
const layoutText = (node: JsonNode): string => {
  const layout = getMember(node, 'layout')
  if (layout === undefined) throw new Error('layout absent')
  return serializeJson(layout)
}

/**
 * Un document synthétique qui porte, **dans son `layout`**, les quatre pièges que
 * `JSON.parse` + `JSON.stringify` détruisent : la décimale nulle `3.0`, l'entier au-delà
 * de 2^53, la couleur Android signée, et deux clés de même nom.
 *
 * ⚠️ **Ce fixture n'est pas un luxe, il est la seule chose qui donne du mordant à la
 * propriété « le layout sort identique ».** Mesuré sur les 21 fichiers du corpus
 * (`Exemples/` + corpus historique) : le `layout` de **chacun** survit intact à un
 * aller-retour `JSON.parse`/`JSON.stringify(…, null, 2)`. Les pièges destructeurs vivent
 * tous dans `preferences`, c'est-à-dire dans la partie que la dérivation ne transporte
 * pas. Une dérivation qui reconstruirait le layout par `JSON.stringify` passerait donc
 * les cinq fichiers réels au vert — et n'aurait rien préservé du tout.
 */
const TRAP_SOURCE = [
  '{',
  '  "airspaceSelectedChannels": [',
  '    1',
  '  ],',
  '  "info": {',
  '    "device": "AIR3 AIR3-7.2 8.1.0",',
  '    "exportType": "backup",',
  '    "proUpTo": 0,',
  '    "versionCode": 100030,',
  '    "versionName": "1.0.3-beta"',
  '  },',
  '  "layout": {',
  '    "landscape": [',
  '      {',
  '        "CLASS": "org.xcontest.XCTrack.widget.wp.WPEmpty",',
  '        "navigations": "all",',
  '        "widgets": [',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WFreeText",',
  '            "X1": 0,',
  '            "Y1": 0,',
  '            "X2": 5000,',
  '            "Y2": 5000,',
  '            "_scale": 3.0,',
  '            "_serial": 9007199254740993,',
  '            "color_text": -27091,',
  '            "_dup": 1,',
  '            "_dup": 2,',
  '            "text": "Visualise le thermique 🤘",',
  '            "titletext": "",',
  '            "_units": "SYS_UNIT"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WButtonPhone",',
  '            "X1": 0,',
  '            "Y1": 5000,',
  '            "X2": 5000,',
  '            "Y2": 10000,',
  '            "contact": {',
  '              "fullName": "Jean Dupont",',
  '              "phoneNumber": "+32 470 00 00 00"',
  '            },',
  '            "callType": "C_CALL_LOUD"',
  '          }',
  '        ]',
  '      }',
  '    ],',
  '    "portrait": [',
  '      {',
  '        "CLASS": "org.xcontest.XCTrack.widget.wp.WPEmpty",',
  '        "navigations": "none",',
  '        "widgets": [',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WAltitude",',
  '            "X1": 0,',
  '            "Y1": 0,',
  '            "X2": 10000,',
  '            "Y2": 2000,',
  '            "titletext": "Sol"',
  '          }',
  '        ]',
  '      }',
  '    ]',
  '  },',
  '  "preferences": {',
  '    "Pilot.Name": "Amélie Exemple"',
  '  }',
  '}'
].join('\n')

describe('derivePagesDocument — la forme du document dérivé', () => {
  it('ne garde que `info` et `layout`, dans cet ordre', () => {
    const derived = derivePagesDocument(parseJson(read(BACKUP)))
    expect(rootKeys(derived.document)).toEqual(['info', 'layout'])
    // Le même ordre que celui d'un `pages` écrit par XCTrack : la liste blanche filtre,
    // elle ne réordonne pas.
    expect(rootKeys(parseJson(read(PAGES)))).toEqual(['info', 'layout'])
  })

  it('dit ce qu’il a écarté, et d’où il vient', () => {
    const derived = derivePagesDocument(parseJson(read(BACKUP)))
    expect(derived.droppedRootKeys).toEqual(['airspaceSelectedChannels', 'preferences'])
    expect(derived.previousExportType).toBe('backup')
  })

  it('pose `exportType` à « pages », comme une chaîne et non un littéral', () => {
    const derived = derivePagesDocument(parseJson(read(BACKUP)))
    const info = getMember(derived.document, 'info')!
    const exportType = getMember(info, 'exportType')!
    // Le type du nœud compte autant que le texte : un `literal` porteur de `"pages"`
    // produirait le même fichier mais mentirait à `readString`.
    expect(exportType.kind).toBe('string')
    expect(exportType.kind === 'string' ? exportType.raw : '').toBe('"pages"')
  })

  it('écarte une clé de premier niveau qu’aucune version connue ne documente', () => {
    // La liste blanche est ce qui fait tenir la confidentialité à travers les versions :
    // une clé inconnue est écartée sans qu’on ait à savoir ce qu’elle contient.
    const source = parseJson('{\n  "futureSecrets": {\n    "a": 1\n  },\n  "info": {\n    "exportType": "backup"\n  },\n  "layout": {}\n}')
    const derived = derivePagesDocument(source)
    expect(derived.droppedRootKeys).toEqual(['futureSecrets'])
    expect(rootKeys(derived.document)).toEqual(['info', 'layout'])
    expect(PAGES_ROOT_KEYS).toEqual(['info', 'layout'])
  })

  it('insère `exportType` quand `info` n’en porte pas', () => {
    const source = parseJson('{\n  "info": {\n    "device": "AIR3"\n  },\n  "layout": {}\n}')
    const derived = derivePagesDocument(source)
    expect(derived.previousExportType).toBeUndefined()
    // Insertion en queue : aucune clé existante déplacée.
    expect(rootKeys(getMember(derived.document, 'info')!)).toEqual(['device', 'exportType'])
  })

  it('crée un `info` minimal quand il manque entièrement', () => {
    const derived = derivePagesDocument(parseJson('{\n  "layout": {}\n}'))
    expect(rootKeys(derived.document)).toEqual(['info', 'layout'])
    // On n’invente ni `device` ni `versionCode` : une version fausse serait pire
    // qu’une version absente.
    expect(rootKeys(getMember(derived.document, 'info')!)).toEqual(['exportType'])
  })

  it('refuse un document qui n’est pas un objet', () => {
    expect(() => derivePagesDocument(parseJson('[]'))).toThrow('objet attendu')
  })
})

describe('derivePagesDocument — propriété 1 : le layout sort identique à l’octet près', () => {
  it('le corpus d’exemple contient bien les cinq fichiers', () => {
    expect(exampleFiles).toHaveLength(5)
  })

  for (const file of exampleFiles) {
    it(`${file} : le layout dérivé est le même texte`, () => {
      const source = parseJson(read(EXPORTS + file))
      const before = layoutText(source)
      const after = layoutText(derivePagesDocument(source).document)
      // Garde-fou : comparer deux textes vides serait vert et ne prouverait rien.
      expect(before.length).toBeGreaterThan(10000)
      expect(after).toBe(before)
    })
  }

  it('transporte les pièges que `JSON.parse` détruit, au lieu de réécrire le layout', () => {
    const source = parseJson(TRAP_SOURCE)
    const derived = derivePagesDocument(source)
    const text = layoutText(derived.document)
    // Chacun de ces quatre motifs disparaît d’un aller-retour par `JSON.parse`.
    expect(text).toContain('"_scale": 3.0')
    expect(text).toContain('"_serial": 9007199254740993')
    expect(text).toContain('"color_text": -27091')
    expect(text).toContain('"_dup": 1')
    expect(text).toContain('"_dup": 2')
    expect(text).toBe(layoutText(source))
  })
})

describe('derivePagesDocument — propriété 2 : la source n’est pas modifiée', () => {
  for (const file of exampleFiles) {
    it(`${file} : le document d’origine ressort inchangé`, () => {
      const text = read(EXPORTS + file)
      const source = parseJson(text)
      expect(serializeJson(source)).toBe(text)
      derivePagesDocument(source)
      expect(serializeJson(source)).toBe(text)
    })
  }

  it('le layout dérivé est un arbre distinct : le modifier ne remonte pas dans la source', () => {
    // Test d’état intermédiaire. Partager le nœud `layout` entre les deux documents
    // rendrait la propriété 1 vraie par tautologie — et aliaserait les deux documents.
    const source = parseJson(read(BACKUP))
    const derived = derivePagesDocument(source).document
    expect(getMember(derived, 'layout')).not.toBe(getMember(source, 'layout'))

    const before = layoutText(source)
    const widget = readLayout(derived).landscape[0]!.widgets[0]!
    setLiteral(widget.node, 'X1', '1234')
    expect(layoutText(derived)).not.toBe(before)
    expect(layoutText(source)).toBe(before)
  })
})

describe('derivePagesDocument — propriété 3 : la sortie est un `pages` relisible', () => {
  for (const file of exampleFiles) {
    it(`${file} : la sortie se reparse à l’identique`, () => {
      const derived = derivePagesDocument(parseJson(read(EXPORTS + file))).document
      const text = serializeJson(derived)
      expect(serializeJson(parseJson(text))).toBe(text)
      const layout = readLayout(parseJson(text))
      const original = readLayout(parseJson(read(EXPORTS + file)))
      expect(layout.landscape).toHaveLength(original.landscape.length)
      expect(layout.portrait).toHaveLength(original.portrait.length)
    })
  }
})

describe('derivePagesDocument — propriété 4 : dériver un `pages` est sans effet', () => {
  it('rend le fichier `pages` réel à l’octet près', () => {
    const text = read(PAGES)
    const derived = derivePagesDocument(parseJson(text))
    expect(derived.droppedRootKeys).toEqual([])
    expect(derived.previousExportType).toBe('pages')
    expect(serializeJson(derived.document)).toBe(text)
  })

  it('rend une copie, jamais la source elle-même', () => {
    // Le contrat ne doit pas dépendre du format d’entrée : l’appelant ne devrait pas
    // avoir à savoir si le document rendu lui appartient.
    const source = parseJson(read(PAGES))
    const derived = derivePagesDocument(source).document
    expect(derived).not.toBe(source)
    expect(getMember(derived, 'layout')).not.toBe(getMember(source, 'layout'))
  })

  it('dériver deux fois donne le même résultat que dériver une fois', () => {
    const once = derivePagesDocument(parseJson(read(BACKUP))).document
    const twice = derivePagesDocument(once)
    expect(twice.droppedRootKeys).toEqual([])
    expect(serializeJson(twice.document)).toBe(serializeJson(once))
  })
})

describe('derivePagesDocument — propriété 5 : rien de sensible ne survit', () => {
  /**
   * Recherche de chaîne dans **tout** le texte sérialisé, pas seulement dans les clés de
   * premier niveau : c’est le seul contrôle qu’une réécriture partielle ne peut pas
   * berner. Chaque motif est d’abord cherché dans la source — un test qui vérifie
   * l’absence d’une chaîne jamais présente est vert pour rien.
   */
  const markers = [
    'Pilot.Name',
    'Glider.Name',
    'Livetrack.',
    'Sensors.Configuration',
    'Navigation.WaypointFiles',
    // Le nom du pilote, cherché comme valeur et non comme clé. C'est une identité
    // d'exemple : un test qui dépendrait du nom réel du propriétaire ne pourrait plus
    // s'exécuter ailleurs que sur son poste.
    'Amélie Exemple'
  ]

  const sourceText = read(BACKUP)
  const derivedText = serializeJson(derivePagesDocument(parseJson(sourceText)).document)

  for (const marker of markers) {
    it(`« ${marker} » est dans la sauvegarde et n’est plus dans le gabarit`, () => {
      expect(sourceText).toContain(marker)
      expect(derivedText).not.toContain(marker)
    })
  }

  it('le gabarit reste substantiel : ce n’est pas un document vidé', () => {
    // Sans cette borne, tout ce qui précède serait vert sur une fonction qui rend `{}`.
    expect(derivedText.length).toBeGreaterThan(50000)
    expect(readLayout(parseJson(derivedText)).landscape).toHaveLength(5)
  })
})

describe('derivePagesDocument — propriété 6 : `info` est conservé', () => {
  it('garde `device`, `versionCode`, `versionName`, `timeCreated` et `proUpTo` tels quels', () => {
    const source = parseJson(read(BACKUP))
    const sourceInfo = getMember(source, 'info')!
    const derivedInfo = getMember(derivePagesDocument(source).document, 'info')!

    expect(rootKeys(derivedInfo)).toEqual(rootKeys(sourceInfo))
    for (const key of rootKeys(sourceInfo)) {
      if (key === 'exportType') continue
      expect(serializeJson(getMember(derivedInfo, key)!)).toBe(
        serializeJson(getMember(sourceInfo, key)!)
      )
    }
    // `proUpTo` reste parce que le `pages` écrit par XCTrack lui-même le porte :
    // le retirer produirait un fichier que XCTrack n’écrit jamais.
    expect(getMember(derivedInfo, 'proUpTo')).toBeDefined()
    expect(getMember(parseJson(read(PAGES)), 'info')!).toBeDefined()
    expect(rootKeys(getMember(parseJson(read(PAGES)), 'info')!)).toContain('proUpTo')
  })
})

describe('findFreeTexts', () => {
  it('les cinq fichiers d’exemple n’en portent aucun', () => {
    // Relevé, pas supposé : aucun `WFreeText` dans ces fichiers, et les 1 401 `titletext`
    // du corpus sont vides. Un inventaire vide est le cas courant.
    for (const file of exampleFiles) {
      expect(findFreeTexts(readLayout(parseJson(read(EXPORTS + file))))).toEqual([])
    }
  })

  it('trouve le texte libre, le numéro de téléphone et le titre, avec leur emplacement', () => {
    const found = findFreeTexts(readLayout(parseJson(TRAP_SOURCE)))
    expect(found).toEqual([
      {
        orientation: 'landscape',
        pageRank: 1,
        widgetRank: 1,
        className: 'org.xcontest.XCTrack.widget.w.WFreeText',
        shortName: 'WFreeText',
        keyPath: 'text',
        text: 'Visualise le thermique 🤘'
      },
      {
        orientation: 'landscape',
        pageRank: 1,
        widgetRank: 2,
        className: 'org.xcontest.XCTrack.widget.w.WButtonPhone',
        shortName: 'WButtonPhone',
        keyPath: 'contact/fullName',
        text: 'Jean Dupont'
      },
      {
        orientation: 'landscape',
        pageRank: 1,
        widgetRank: 2,
        className: 'org.xcontest.XCTrack.widget.w.WButtonPhone',
        shortName: 'WButtonPhone',
        keyPath: 'contact/phoneNumber',
        text: '+32 470 00 00 00'
      },
      {
        orientation: 'portrait',
        pageRank: 1,
        widgetRank: 1,
        className: 'org.xcontest.XCTrack.widget.w.WAltitude',
        shortName: 'WAltitude',
        keyPath: 'titletext',
        text: 'Sol'
      }
    ])
  })

  it('descend dans les objets imbriqués : le numéro vit dans `contact`, pas à la racine du widget', () => {
    const found = findFreeTexts(readLayout(parseJson(TRAP_SOURCE)))
    expect(found.map((f) => f.keyPath)).toContain('contact/phoneNumber')
    expect(FREE_TEXT_KEYS).toContain('phoneNumber')
  })

  it('ignore les chaînes vides et les énumérations', () => {
    const texts = findFreeTexts(readLayout(parseJson(TRAP_SOURCE))).map((f) => f.text)
    expect(texts).not.toContain('')
    expect(texts).not.toContain('SYS_UNIT')
    expect(texts).not.toContain('C_CALL_LOUD')
    expect(texts).not.toContain('all')
  })

  it('situe exactement un titre personnalisé posé sur un widget réel', () => {
    // Emplacement relevé dans le fichier : paysage, page 1, rang 3 = WSpeed, qui porte
    // un `titletext` vide. On l’écrit, on vérifie que l’inventaire le retrouve là.
    const document = parseJson(read(BACKUP))
    const layout = readLayout(document)
    const widget = layout.landscape[0]!.widgets[2]!
    expect(widget.shortName).toBe('WSpeed')
    setString(widget.node, 'titletext', encode('Vitesse sol'))

    expect(findFreeTexts(readLayout(document))).toEqual([
      {
        orientation: 'landscape',
        pageRank: 1,
        widgetRank: 3,
        className: 'org.xcontest.XCTrack.widget.w.WSpeed',
        shortName: 'WSpeed',
        keyPath: 'titletext',
        text: 'Vitesse sol'
      }
    ])
  })

  it('les textes libres voyagent avec la dérivation — c’est pourquoi il faut les montrer', () => {
    const source = parseJson(TRAP_SOURCE)
    const derived = derivePagesDocument(source).document
    expect(findFreeTexts(readLayout(derived))).toEqual(findFreeTexts(readLayout(source)))
    expect(findFreeTexts(readLayout(derived))).toHaveLength(4)
  })
})

/* ==================================================================================
 * n'emporter que certaines pages
 * ================================================================================== */

describe('allPageRefs — désigner une page comme le pilote la voit', () => {
  it('rend chaque page dans l’ordre du fichier, portrait puis paysage, rangs à partir de 1', () => {
    const layout = readLayout(parseJson(read(PAGES)))
    expect(allPageRefs(layout)).toEqual([
      { orientation: 'portrait', rank: 1 },
      { orientation: 'portrait', rank: 2 },
      { orientation: 'portrait', rank: 3 },
      { orientation: 'landscape', rank: 1 },
      { orientation: 'landscape', rank: 2 },
      { orientation: 'landscape', rank: 3 },
      { orientation: 'landscape', rank: 4 },
      { orientation: 'landscape', rank: 5 }
    ])
  })
})

describe('keepPages — le fichier ne porte que les pages désignées', () => {
  it('ne garde qu’une page, et dit lesquelles sont restées', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    const dropped = keepPages(derived, [{ orientation: 'landscape', rank: 2 }])

    const layout = readLayout(derived)
    expect(layout.landscape).toHaveLength(1)
    expect(layout.portrait).toHaveLength(0)
    expect(dropped).toHaveLength(7)
    expect(dropped).toContainEqual({ orientation: 'portrait', rank: 1 })
    expect(dropped).toContainEqual({ orientation: 'landscape', rank: 5 })
    expect(dropped).not.toContainEqual({ orientation: 'landscape', rank: 2 })
  })

  it('la page gardée est celle qu’on a désignée, à l’octet près', () => {
    const full = derivePagesDocument(parseJson(read(PAGES))).document
    const expected = serializeJson(readLayout(full).landscape[2]!.node)

    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    keepPages(derived, [{ orientation: 'landscape', rank: 3 }])
    expect(serializeJson(readLayout(derived).landscape[0]!.node)).toBe(expected)
  })

  it('garde plusieurs pages dans l’ordre du fichier, quel que soit l’ordre de la sélection', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    keepPages(derived, [
      { orientation: 'landscape', rank: 4 },
      { orientation: 'landscape', rank: 1 },
      { orientation: 'portrait', rank: 2 }
    ])
    const layout = readLayout(derived)
    expect(layout.portrait).toHaveLength(1)
    expect(layout.landscape).toHaveLength(2)

    const full = readLayout(derivePagesDocument(parseJson(read(PAGES))).document)
    expect(serializeJson(layout.landscape[0]!.node))
      .toBe(serializeJson(full.landscape[0]!.node))
    expect(serializeJson(layout.landscape[1]!.node))
      .toBe(serializeJson(full.landscape[3]!.node))
  })

  it('les deux orientations restent écrites, même quand l’une est vide', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    keepPages(derived, [{ orientation: 'landscape', rank: 1 }])
    const layout = getMember(derived, 'layout')
    expect(layout).toBeDefined()
    expect(rootKeys(layout!)).toEqual(['landscape', 'portrait'])
    expect(getMember(layout!, 'portrait')).toEqual({ kind: 'array', items: [] })
  })

  it('tout garder ne change rien au fichier, octet pour octet', () => {
    const reference = derivePagesDocument(parseJson(read(PAGES))).document
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    const dropped = keepPages(derived, allPageRefs(readLayout(derived)))
    expect(dropped).toEqual([])
    expect(serializeJson(derived)).toBe(serializeJson(reference))
  })

  it('une sélection vide vide le layout sans détruire sa forme', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    expect(keepPages(derived, [])).toHaveLength(8)
    const layout = readLayout(derived)
    expect(layout.landscape).toEqual([])
    expect(layout.portrait).toEqual([])
  })

  it('un rang qui n’existe pas ne fabrique aucune page', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    keepPages(derived, [{ orientation: 'landscape', rank: 99 }])
    expect(readLayout(derived).landscape).toEqual([])
  })

  it('`info` traverse en entier — le destinataire doit savoir quelle version a écrit ceci', () => {
    const derived = derivePagesDocument(parseJson(read(PAGES))).document
    keepPages(derived, [{ orientation: 'landscape', rank: 1 }])
    const info = getMember(derived, 'info')
    expect(info).toBeDefined()
    expect(rootKeys(info!)).toEqual([
      'device', 'exportType', 'proUpTo', 'timeCreated', 'versionCode', 'versionName'
    ])
  })

  it('les pièges du layout survivent à la sélection — aucun passage par JSON.stringify', () => {
    const source = parseJson(TRAP_SOURCE)
    const derived = derivePagesDocument(source).document
    keepPages(derived, [{ orientation: 'landscape', rank: 1 }])
    const kept = serializeJson(readLayout(derived).landscape[0]!.node)
    expect(kept).toBe(serializeJson(readLayout(source).landscape[0]!.node))
  })
})
