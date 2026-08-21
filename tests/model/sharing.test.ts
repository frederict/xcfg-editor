import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember } from '../../src/core/access'
import { openContainer, exportContainer } from '../../src/core/container'
import { readZip } from '../../src/core/zip'
import { sha256Hex } from '../../src/library/digest'
import { readLayout } from '../../src/model/layout'
import { derivePagesDocument, findFreeTexts, FREE_TEXT_KEYS } from '../../src/model/scope'
import {
  ANONYMOUS_MARK,
  anonymizeDocument,
  buildExportFileName,
  DEFAULT_EXTENSION,
  documentExportType,
  EXPORT_NAME_PREFIX,
  fileExtension,
  NEUTRAL_INTENT_ACTION,
  NEUTRAL_PHONE_NUMBER,
  NEUTRAL_TEST_EVENT,
  NEUTRAL_URL,
  replaceFreeTexts,
  UNKNOWN_FORMAT
} from '../../src/model/sharing'
import {
  ARCHIVE,
  BACKUP_2025,
  BACKUP_2026,
  BACKUP_ARCHIVE,
  FORMES_PRESERVEES,
  GSON_2022,
  PAGES_2025,
  PAGES_2026
} from '../fixtures/paths'

/**
 * Un document fabriqué qui porte **les onze clés de `FREE_TEXT_KEYS`**, chacune avec une
 * valeur d'origine unique et repérable, plus tout ce qui doit traverser intact :
 *
 * - les quatre pièges que `JSON.parse` + `JSON.stringify` détruisent (`3.0`, l'exposant
 *   Kotlin, `-0.0`, l'entier au-delà de 2^53, les clés dupliquées, la couleur signée) ;
 * - les faux amis du catalogue : `_theme`, `_decimals`, `index`, `mapWidget_osmLanguage`,
 *   `faiAreasDistanceFontSize`, `theme` et `terrain` sous `mapWidget_mapAppearance`,
 *   `text_size`, `lines_count`, `nemo` — des chaînes ou des nombres que l'anonymisation
 *   ne doit pas toucher, sous peine d'abîmer des réglages qui n'ont rien de personnel ;
 * - un `titletext` **dupliqué**, pour vérifier que les deux occurrences sont réécrites.
 *
 * ⚠️ Il est écrit au format exact du sérialiseur — un test vérifie qu'il fait
 * l'aller-retour à l'octet près. Sans quoi les preuves d'identité d'octet qui suivent
 * mesureraient le fixture plutôt que le code.
 */
const SOURCE = [
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
  '            "Y2": 2500,',
  '            "_scale": 3.0,',
  '            "_exposant": 1.0E7,',
  '            "_zero": -0.0,',
  '            "_serial": 9007199254740993,',
  '            "color_text": -27091,',
  '            "_dup": 1,',
  '            "_dup": 2,',
  '            "text_size": 25,',
  '            "text": "Vol du 8 février avec Amélie 🤘",',
  '            "titletext": "Élévation à l’œil",',
  '            "titletext": "Élévation à l’œil, bis",',
  '            "_units": "SYS_UNIT"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WButtonPhone",',
  '            "X1": 5000,',
  '            "Y1": 0,',
  '            "X2": 10000,',
  '            "Y2": 2500,',
  '            "contact": {',
  '              "fullName": "Amélie Exemple",',
  '              "phoneNumber": "+32 470 12 34 56"',
  '            },',
  '            "showContactName": true,',
  '            "callType": "C_CALL_LOUD"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WWebView",',
  '            "X1": 0,',
  '            "Y1": 2500,',
  '            "X2": 5000,',
  '            "Y2": 5000,',
  '            "url": "https://exemple.test/carte?jeton=SECRET42",',
  '            "initialScale": 0,',
  '            "nemo": true,',
  '            "saveButtonPos": "BOT_RIGHT"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WButtonIntentLauncher",',
  '            "X1": 5000,',
  '            "Y1": 2500,',
  '            "X2": 10000,',
  '            "Y2": 5000,',
  '            "longClick": true,',
  '            "title": "Lanceur d’Amélie",',
  '            "name": "com.exemple.MonAppli",',
  '            "action": "intent://exemple.test/#Intent;S.token=SECRET43;end"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WCompMap",',
  '            "X1": 0,',
  '            "Y1": 5000,',
  '            "X2": 10000,',
  '            "Y2": 10000,',
  '            "mapWidget_osmLanguage": "fr",',
  '            "mapWidget_skySightForecastLayer": "thermal",',
  '            "mapWidget_mapAppearance": {',
  '              "theme": "ClearpilotForest",',
  '              "terrain": "XContest"',
  '            }',
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
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WLogPeek",',
  '            "X1": 0,',
  '            "Y1": 0,',
  '            "X2": 10000,',
  '            "Y2": 3000,',
  '            "lines_count": 25,',
  '            "filter": "recherche-Amelie-1974",',
  '            "text_size": 15',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WExternalData",',
  '            "X1": 0,',
  '            "Y1": 3000,',
  '            "X2": 10000,',
  '            "Y2": 6000,',
  '            "titletext": "Capteur de Frédéric",',
  '            "index": "7",',
  '            "suffix": " (Amélie)"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WEmitTestEvent",',
  '            "X1": 0,',
  '            "Y1": 6000,',
  '            "X2": 10000,',
  '            "Y2": 8000,',
  '            "event": "MonEvenementPrive"',
  '          },',
  '          {',
  '            "CLASS": "org.xcontest.XCTrack.widget.w.WFL",',
  '            "X1": 0,',
  '            "Y1": 8000,',
  '            "X2": 10000,',
  '            "Y2": 10000,',
  '            "_theme": "ClearpilotForestDark",',
  '            "_decimals": "0",',
  '            "faiAreasDistanceFontSize": "100",',
  '            "titletext": "Niveau de Frédéric"',
  '          }',
  '        ]',
  '      }',
  '    ]',
  '  },',
  '  "preferences": {',
  '    "Pilot.Name": "Amélie Exemple",',
  '    "Glider.Name": "Voile d’Amélie",',
  '    "Navigation.WaypointFiles": "/sdcard/Comp2026.wpt"',
  '  }',
  '}'
].join('\n')

/**
 * Les quatorze valeurs d'origine que l'anonymisation doit faire disparaître, et les onze
 * clés qu'elles couvrent. Chacune est d'abord cherchée **dans la source** : un test qui
 * vérifie l'absence d'une chaîne jamais présente est vert pour rien.
 */
const ORIGINALS = [
  'Vol du 8 février avec Amélie 🤘',
  'Élévation à l’œil',
  'Élévation à l’œil, bis',
  'Amélie Exemple',
  '+32 470 12 34 56',
  'https://exemple.test/carte?jeton=SECRET42',
  'Lanceur d’Amélie',
  'com.exemple.MonAppli',
  'intent://exemple.test/#Intent;S.token=SECRET43;end',
  'recherche-Amelie-1974',
  'Capteur de Frédéric',
  ' (Amélie)',
  'MonEvenementPrive',
  'Niveau de Frédéric'
]

/** Ce qui doit traverser intact : réglages fermés, nombres, et pièges du sérialiseur. */
const SURVIVORS = [
  '"_scale": 3.0',
  '"_exposant": 1.0E7',
  '"_zero": -0.0',
  '"_serial": 9007199254740993',
  '"color_text": -27091',
  '"_dup": 1',
  '"_dup": 2',
  '"_units": "SYS_UNIT"',
  '"callType": "C_CALL_LOUD"',
  '"saveButtonPos": "BOT_RIGHT"',
  '"nemo": true',
  '"text_size": 25',
  '"lines_count": 25',
  '"mapWidget_osmLanguage": "fr"',
  '"mapWidget_skySightForecastLayer": "thermal"',
  '"theme": "ClearpilotForest"',
  '"terrain": "XContest"',
  '"_theme": "ClearpilotForestDark"',
  '"_decimals": "0"',
  '"faiAreasDistanceFontSize": "100"',
  '"index": "7"'
]

const FIXTURES = [
  BACKUP_2026, PAGES_2026, BACKUP_2025, PAGES_2025, BACKUP_ARCHIVE,
  FORMES_PRESERVEES, GSON_2022, ARCHIVE
]

const shortName = (path: string): string => path.split('/').pop() ?? path

/* ============================================================== nom du fichier exporté */

describe('buildExportFileName — la forme retenue', () => {
  const WHEN = new Date(2026, 7, 21, 15, 32, 7)

  it('produit un nom horodaté à la seconde, préfixé, portant le format', () => {
    expect(buildExportFileName({
      originalFileName: '2022-02-08_marie_ok.xcfg', when: WHEN, exportType: 'backup'
    })).toBe('xctrack_2026-08-21-153207_backup.xcfg')
  })

  it('marque l’anonymisation dans le nom', () => {
    expect(buildExportFileName({
      originalFileName: '2022-02-08_marie_ok.xcfg', when: WHEN, exportType: 'pages',
      anonymized: true
    })).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
    expect(ANONYMOUS_MARK).toBe('anon')
  })

  it('ne reprend jamais le radical d’origine, même quand il porte un prénom', () => {
    // C'est la règle qui fait tenir la promesse : un fichier anonymisé dont le nom dit
    // « marie » n'est pas anonymisé.
    for (const original of [
      '2022-02-08_marie_ok.xcfg',
      'Amélie – sauvegarde (finale).xcfg',
      'compétition-Annecy-2026.xczfg'
    ]) {
      const name = buildExportFileName({ originalFileName: original, when: WHEN })
      const stem = original.slice(0, original.lastIndexOf('.'))
      expect(name).not.toContain(stem)
      expect(name.startsWith(`${EXPORT_NAME_PREFIX}_`)).toBe(true)
    }
  })

  it('n’égale jamais le nom d’origine, même quand celui-ci sort de cet outil', () => {
    // Le garde-fou de dernier recours : la propriété ne doit dépendre d'aucun
    // raisonnement sur l'improbabilité du cas.
    const original = 'xctrack_2026-08-21-153207_backup.xcfg'
    const name = buildExportFileName({ originalFileName: original, when: WHEN, exportType: 'backup' })
    expect(name).not.toBe(original)
    expect(name).toBe('xctrack_2026-08-21-153207_backup-1.xcfg')
  })

  it('écrit « config » quand le format est absent, vide ou illisible', () => {
    for (const exportType of [undefined, '', '   ', '///']) {
      expect(buildExportFileName({ originalFileName: 'a.xcfg', when: WHEN, exportType }))
        .toBe(`xctrack_2026-08-21-153207_${UNKNOWN_FORMAT}.xcfg`)
    }
  })

  it('réduit un format inattendu plutôt que de le recopier dans le nom', () => {
    // `exportType` vient du fichier : c'est une chaîne que nous n'avons pas écrite.
    expect(buildExportFileName({
      originalFileName: 'a.xcfg', when: WHEN, exportType: '../Été/Backup:2'
    })).toBe('xctrack_2026-08-21-153207_ete-backup-2.xcfg')
  })
})

describe('buildExportFileName — unicité et ordre', () => {
  it('deux instants distincts donnent deux noms distincts, à la seconde près', () => {
    const a = buildExportFileName({ when: new Date(2026, 7, 21, 15, 32, 7), exportType: 'backup' })
    const b = buildExportFileName({ when: new Date(2026, 7, 21, 15, 32, 8), exportType: 'backup' })
    expect(a).not.toBe(b)
  })

  it('l’ordre alphabétique est l’ordre chronologique', () => {
    // La propriété qui rend une liste de fichiers lisible : le dernier export est en bas.
    const instants = [
      new Date(2025, 11, 31, 23, 59, 59),
      new Date(2026, 0, 1, 0, 0, 0),
      new Date(2026, 7, 21, 9, 5, 3),
      new Date(2026, 7, 21, 15, 32, 7),
      new Date(2026, 8, 1, 0, 0, 1)
    ]
    const names = instants.map((when) => buildExportFileName({ when, exportType: 'pages' }))
    expect(names).toEqual([...names].sort())
    expect(new Set(names).size).toBe(names.length)
  })

  it('les champs de mois, de jour et d’heure sont complétés à deux chiffres', () => {
    expect(buildExportFileName({ when: new Date(2026, 0, 2, 3, 4, 5), exportType: 'pages' }))
      .toBe('xctrack_2026-01-02-030405_pages.xcfg')
  })
})

describe('buildExportFileName — valide sur les trois systèmes', () => {
  const HOSTILE = [
    'con.xcfg',
    'fichier: avec / des \\ caractères < interdits >.xcfg',
    'sans-extension',
    '.xcfg',
    'archive.tar.gz',
    'a.xczfg'
  ]

  it('ne produit que des caractères sûrs sur Windows, macOS et Linux', () => {
    for (const original of HOSTILE) {
      for (const anonymized of [false, true]) {
        const name = buildExportFileName({
          originalFileName: original, when: new Date(2026, 7, 21, 15, 32, 7),
          exportType: 'backup', anonymized
        })
        // Ni séparateur de chemin, ni caractère refusé par Windows, ni espace, ni accent.
        expect(name).toMatch(/^[a-z0-9._-]+$/)
        expect(name).not.toMatch(/[<>:"/\\|?*]/)
        expect(name.endsWith('.')).toBe(false)
        // Aucun nom de périphérique Windows : le radical commence par « xctrack_ ».
        expect(name.split('.')[0]).toMatch(/^xctrack_/)
      }
    }
  })
})

describe('fileExtension — l’extension d’origine est conservée', () => {
  it('distingue les deux formats, qui ne sont pas interchangeables', () => {
    // `.xcfg` est un JSON nu, `.xczfg` une archive ZIP. Renommer l'un en l'autre produit
    // un fichier que XCTrack refuse.
    expect(fileExtension('a.xcfg')).toBe('.xcfg')
    expect(fileExtension('a.xczfg')).toBe('.xczfg')
    expect(buildExportFileName({ originalFileName: 'x.xczfg', when: new Date(2026, 7, 21, 15, 32, 7) }))
      .toMatch(/\.xczfg$/)
  })

  it('retombe sur .xcfg quand l’original n’en porte pas d’exploitable', () => {
    expect(fileExtension('sans-extension')).toBe(DEFAULT_EXTENSION)
    expect(fileExtension('.xcfg')).toBe(DEFAULT_EXTENSION)
    expect(fileExtension('')).toBe(DEFAULT_EXTENSION)
    // Une « extension » porteuse d'un séparateur sortirait un chemin, pas un fichier.
    expect(fileExtension('a.b/c')).toBe(DEFAULT_EXTENSION)
    expect(fileExtension('a.très-longue-extension')).toBe(DEFAULT_EXTENSION)
  })

  it('garde la dernière extension d’un nom qui en porte plusieurs', () => {
    expect(fileExtension('backup.2026.xcfg')).toBe('.xcfg')
  })
})

describe('documentExportType', () => {
  it('lit le format du document, et ne le devine pas', () => {
    expect(documentExportType(parseJson(SOURCE))).toBe('backup')
    expect(documentExportType(parseJson(readFileSync(PAGES_2026, 'utf8')))).toBe('pages')
    expect(documentExportType(parseJson('{}'))).toBeUndefined()
    expect(documentExportType(parseJson('{\n  "info": {}\n}'))).toBeUndefined()
  })

  it('le document anonymisé se déclare « pages », et le nom le suit', () => {
    const anonymous = anonymizeDocument(parseJson(SOURCE))
    expect(documentExportType(anonymous.document)).toBe('pages')
    expect(buildExportFileName({
      originalFileName: '2022-02-08_marie_ok.xcfg',
      when: new Date(2026, 7, 21, 15, 32, 7),
      exportType: documentExportType(anonymous.document),
      anonymized: true
    })).toBe('xctrack_2026-08-21-153207_pages-anon.xcfg')
  })
})

/* ================================================================ le fixture lui-même */

describe('le document d’essai', () => {
  it('fait l’aller-retour à l’octet près', () => {
    // Sans quoi tout ce qui suit mesurerait le fixture plutôt que le code.
    expect(serializeJson(parseJson(SOURCE))).toBe(SOURCE)
  })

  it('porte bien les onze clés de l’inventaire, et chaque valeur d’origine', () => {
    const found = findFreeTexts(readLayout(parseJson(SOURCE)))
    const keys = new Set(found.map((f) => f.keyPath.split('/').pop()))
    expect([...keys].sort()).toEqual([...FREE_TEXT_KEYS].sort())
    expect(FREE_TEXT_KEYS).toHaveLength(11)
    for (const original of ORIGINALS) expect(SOURCE).toContain(original)
    for (const survivor of SURVIVORS) expect(SOURCE).toContain(survivor)
  })
})

/* ==================================================================== l’anonymisation */

describe('anonymizeDocument — l’inventaire annonce ce qui va changer', () => {
  const { replacements } = anonymizeDocument(parseJson(SOURCE))

  it('rend une entrée par texte remplacé, avec son emplacement et sa valeur d’origine', () => {
    const first = replacements[0]!
    expect(first).toMatchObject({
      orientation: 'landscape',
      pageRank: 1,
      widgetRank: 1,
      className: 'org.xcontest.XCTrack.widget.w.WFreeText',
      shortName: 'WFreeText',
      keyPath: 'text',
      text: 'Vol du 8 février avec Amélie 🤘',
      replacement: 'Texte 1'
    })
    expect(first.reason.length).toBeGreaterThan(20)
  })

  it('couvre les quatorze textes du document, doublon compris', () => {
    expect(replacements).toHaveLength(ORIGINALS.length)
    expect(replacements.map((r) => r.text).sort()).toEqual([...ORIGINALS].sort())
  })

  it('situe le numéro de téléphone dans son objet imbriqué', () => {
    const phone = replacements.find((r) => r.keyPath === 'contact/phoneNumber')!
    expect(phone).toMatchObject({
      orientation: 'landscape', pageRank: 1, widgetRank: 2,
      shortName: 'WButtonPhone', text: '+32 470 12 34 56',
      replacement: NEUTRAL_PHONE_NUMBER
    })
  })

  it('réécrit les deux occurrences d’une clé dupliquée', () => {
    const titles = replacements.filter((r) => r.keyPath === 'titletext' && r.widgetRank === 1)
    expect(titles.map((t) => t.text)).toEqual(['Élévation à l’œil', 'Élévation à l’œil, bis'])
    // Numérotées, donc distinctes : deux titres différents le restent.
    expect(titles.map((t) => t.replacement)).toEqual(['Titre 1', 'Titre 2'])
  })

  it('applique la règle décidée pour chaque clé', () => {
    const by = (keyPath: string): string =>
      replacements.find((r) => r.keyPath === keyPath)!.replacement
    expect(by('text')).toBe('Texte 1')
    expect(by('contact/fullName')).toBe('Contact 1')
    expect(by('contact/phoneNumber')).toBe(NEUTRAL_PHONE_NUMBER)
    expect(by('url')).toBe(NEUTRAL_URL)
    expect(by('title')).toBe('Bouton 1')
    expect(by('name')).toBe('Application 1')
    expect(by('action')).toBe(NEUTRAL_INTENT_ACTION)
    expect(by('event')).toBe(NEUTRAL_TEST_EVENT)
    // Vide, parce que vide est la valeur *neutre* de ces deux réglages, pas un effacement.
    expect(by('filter')).toBe('')
    expect(by('suffix')).toBe('')
  })

  it('le numéro de remplacement ne peut aboutir nulle part', () => {
    // « 00 » n'est pas un indicatif de pays : c'est le préfixe international lui-même.
    expect(NEUTRAL_PHONE_NUMBER.startsWith('+00')).toBe(true)
    // Le gabarit est conservé — donc la largeur du bouton l'est aussi.
    expect(NEUTRAL_PHONE_NUMBER).toHaveLength('+32 470 12 34 56'.length)
  })

  it('l’URL de remplacement relève d’un domaine que la RFC 2606 réserve', () => {
    expect(NEUTRAL_URL).toContain('.invalid')
    expect(() => new URL(NEUTRAL_URL)).not.toThrow()
  })

  it('chaque remplacement porte sa raison, pour que rien ne soit décidé en silence', () => {
    for (const replacement of replacements) {
      expect(replacement.reason.length).toBeGreaterThan(20)
    }
    // Aucune clé ne tombe sur la règle de repli : chacune a la sienne.
    expect(replacements.some((r) => r.reason.includes('par précaution'))).toBe(false)
  })
})

describe('anonymizeDocument — aucune valeur d’origine ne survit', () => {
  const anonymous = anonymizeDocument(parseJson(SOURCE))
  const text = serializeJson(anonymous.document)

  /**
   * Le contrôle qui ne se laisse pas berner : chaque valeur d'origine est cherchée dans le
   * **texte sérialisé complet**, pas dans les clés de premier niveau ni dans l'inventaire.
   * Une réécriture partielle — un seul des deux `titletext` dupliqués, la clé de tête d'un
   * objet imbriqué — passerait un contrôle par clés et échouerait ici.
   */
  for (const original of ORIGINALS) {
    it(`« ${original.slice(0, 40)} » est dans la source et n’est plus dans le partage`, () => {
      expect(SOURCE).toContain(original)
      expect(text).not.toContain(original)
    })
  }

  for (const marker of ['Pilot.Name', 'Glider.Name', 'Navigation.WaypointFiles', 'Comp2026.wpt']) {
    it(`« ${marker} » part avec les préférences`, () => {
      expect(SOURCE).toContain(marker)
      expect(text).not.toContain(marker)
    })
  }

  it('dit ce qu’il a écarté et d’où il vient', () => {
    expect(anonymous.droppedRootKeys).toEqual(['airspaceSelectedChannels', 'preferences'])
    expect(anonymous.previousExportType).toBe('backup')
  })

  it('ne rend pas un document vidé', () => {
    // Sans cette borne, tout ce qui précède serait vert sur une fonction qui rend `{}`.
    const layout = readLayout(anonymous.document)
    expect(layout.landscape[0]!.widgets).toHaveLength(5)
    expect(layout.portrait[0]!.widgets).toHaveLength(4)
    // Douze et non quatorze : `filter` et `suffix` reçoivent la chaîne vide, qui est leur
    // valeur neutre, et une chaîne vide n'est pas un texte libre. Les douze autres clés
    // portent toujours un texte — remplacer n'est pas effacer.
    expect(findFreeTexts(layout)).toHaveLength(ORIGINALS.length - 2)
    expect(findFreeTexts(layout).map((f) => f.text)).toContain('Titre 1')
  })

  it('anonymiser deux fois donne le même fichier', () => {
    const twice = anonymizeDocument(anonymous.document)
    expect(serializeJson(twice.document)).toBe(text)
  })
})

describe('anonymizeDocument — ce qui n’est pas du texte libre traverse intact', () => {
  const text = serializeJson(anonymizeDocument(parseJson(SOURCE)).document)

  for (const survivor of SURVIVORS) {
    it(`${survivor} est conservé tel quel`, () => {
      expect(SOURCE).toContain(survivor)
      expect(text).toContain(survivor)
    })
  }

  it('garde `info` en entier, sauf le format', () => {
    const source = parseJson(SOURCE)
    const anonymous = anonymizeDocument(source)
    expect(serializeJson(getMember(anonymous.document, 'info')!))
      .toBe(serializeJson(getMember(source, 'info')!).replace('"backup"', '"pages"'))
  })

  it('le nombre de widgets et de pages ne change pas', () => {
    const before = readLayout(parseJson(SOURCE))
    const after = readLayout(anonymizeDocument(parseJson(SOURCE)).document)
    expect(after.landscape.map((p) => p.widgets.length))
      .toEqual(before.landscape.map((p) => p.widgets.length))
    expect(after.portrait.map((p) => p.widgets.length))
      .toEqual(before.portrait.map((p) => p.widgets.length))
  })
})

describe('anonymizeDocument — la source n’est pas modifiée', () => {
  it('l’empreinte du document d’origine est la même avant et après l’appel', async () => {
    const source = parseJson(SOURCE)
    const before = await sha256Hex(new TextEncoder().encode(serializeJson(source)))
    // Les deux gestes, parce que ce sont deux fonctions distinctes : chacune doit
    // travailler sur sa copie, et une seule des deux passe par la dérivation.
    anonymizeDocument(source)
    replaceFreeTexts(source)
    const after = await sha256Hex(new TextEncoder().encode(serializeJson(source)))
    expect(after).toBe(before)
    expect(serializeJson(source)).toBe(SOURCE)
  })

  for (const path of [BACKUP_2026, PAGES_2026, FORMES_PRESERVEES, GSON_2022]) {
    it(`${shortName(path)} : anonymiser ne touche pas le document ouvert`, async () => {
      const text = readFileSync(path, 'utf8')
      const document = parseJson(text)
      const before = await sha256Hex(new TextEncoder().encode(serializeJson(document)))
      anonymizeDocument(document)
      replaceFreeTexts(document)
      const after = await sha256Hex(new TextEncoder().encode(serializeJson(document)))
      expect(after).toBe(before)
      expect(serializeJson(document)).toBe(text)
    })
  }

  it('le document rendu est un arbre distinct de la source', () => {
    const source = parseJson(SOURCE)
    const anonymous = anonymizeDocument(source).document
    expect(anonymous).not.toBe(source)
    expect(getMember(anonymous, 'layout')).not.toBe(getMember(source, 'layout'))
  })
})

describe('replaceFreeTexts — le second étage seul', () => {
  it('remplace les textes du layout sans toucher aux préférences ni au format', () => {
    const { document, replacements } = replaceFreeTexts(parseJson(SOURCE))
    expect(replacements).toHaveLength(ORIGINALS.length)
    // On cherche dans le `layout` seul : ce geste-là ne prétend pas retirer les
    // préférences, et le nom du pilote y est encore — c'est le premier étage qui l'emporte.
    const layoutText = serializeJson(getMember(document, 'layout')!)
    for (const original of ORIGINALS) expect(layoutText).not.toContain(original)
    expect(serializeJson(document)).toContain('Pilot.Name')
    expect(documentExportType(document)).toBe('backup')
  })

  it('les textes libres survivent à la dérivation seule — c’est pourquoi ce second étage existe', () => {
    // La démonstration du besoin : dériver un `pages` retire les préférences et laisse le
    // numéro de téléphone, qui voyage avec la page.
    const derived = derivePagesDocument(parseJson(SOURCE))
    expect(serializeJson(derived.document)).not.toContain('Pilot.Name')
    expect(serializeJson(derived.document)).toContain('+32 470 12 34 56')

    expect(serializeJson(anonymizeDocument(parseJson(SOURCE)).document))
      .not.toContain('+32 470 12 34 56')
  })

  it('ne rend rien à remplacer sur les fichiers d’exemple, qui n’en portent pas', () => {
    for (const path of [BACKUP_2026, PAGES_2026, BACKUP_2025, PAGES_2025]) {
      const text = readFileSync(path, 'utf8')
      const { document, replacements } = replaceFreeTexts(parseJson(text))
      expect(replacements).toEqual([])
      // Rien à remplacer, donc rien de changé : le fichier ressort à l'octet près.
      expect(serializeJson(document)).toBe(text)
    }
  })
})

/* ================================================== l’export normal reste à l’octet près */

describe('l’export normal reste à l’octet près', () => {
  it('les huit fixtures sont bien là', () => {
    expect(FIXTURES).toHaveLength(8)
    for (const path of FIXTURES) expect(readFileSync(path).byteLength).toBeGreaterThan(0)
  })

  for (const path of FIXTURES) {
    it(`${shortName(path)} : ouvrir puis exporter sans modifier rend la même empreinte`, async () => {
      const bytes = new Uint8Array(readFileSync(path))
      const container = await openContainer(bytes, shortName(path))
      expect(container.parseError).toBeUndefined()

      // Le geste que l'anonymisation ne doit pas perturber : on la calcule, on la jette.
      const documentBefore = serializeJson(container.document)
      anonymizeDocument(container.document)
      replaceFreeTexts(container.document)
      expect(serializeJson(container.document)).toBe(documentBefore)

      const exported = await exportContainer(container)
      expect(await sha256Hex(exported)).toBe(await sha256Hex(bytes))
    })
  }

  for (const path of FIXTURES.filter((f) => f.endsWith('.xcfg'))) {
    it(`${shortName(path)} : même en passant par le sérialiseur, les octets sont les mêmes`, async () => {
      // Sans `modified`, `exportContainer` rend les octets d'origine : le test serait vrai
      // sans rien prouver du sérialiseur. On force donc le chemin d'écriture.
      const bytes = new Uint8Array(readFileSync(path))
      const container = await openContainer(bytes, shortName(path))
      container.modified = true
      const exported = await exportContainer(container)
      expect(await sha256Hex(exported)).toBe(await sha256Hex(bytes))
    })
  }

  it('archive : le .xcfg intérieur et l’horodatage DOS traversent le chemin d’écriture', async () => {
    /*
     * On ne compare pas les octets de l'archive réécrite : le flux `deflate` dépend de la
     * zlib du moteur, pas de ce dépôt (voir `tests/core/zip.test.ts`). Ce qui doit tenir
     * partout, et qui tient ici, c'est que le document et les métadonnées de l'archive
     * ressortent intacts — l'identité d'octet de l'archive elle-même est assurée par le
     * chemin « non modifié », testé plus haut.
     */
    const bytes = new Uint8Array(readFileSync(ARCHIVE))
    const container = await openContainer(bytes, 'archive.xczfg')
    container.modified = true

    const before = await readZip(bytes)
    const after = await readZip(await exportContainer(container))
    expect(after.map((e) => e.name)).toEqual(before.map((e) => e.name))
    expect(after.map((e) => [e.dosDate, e.dosTime])).toEqual(before.map((e) => [e.dosDate, e.dosTime]))

    const innerBefore = before.find((e) => e.name.endsWith('.xcfg'))!
    const innerAfter = after.find((e) => e.name.endsWith('.xcfg'))!
    expect(await sha256Hex(innerAfter.data)).toBe(await sha256Hex(innerBefore.data))
    expect(await sha256Hex(innerBefore.data))
      .toBe(await sha256Hex(new Uint8Array(readFileSync(BACKUP_ARCHIVE))))
  })
})
