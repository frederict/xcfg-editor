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
  anonymizeBackup,
  anonymizeDocument,
  buildExportFileName,
  changedPreferenceCount,
  DEFAULT_EXTENSION,
  documentExportType,
  EXPORT_NAME_PREFIX,
  fileExtension,
  findPersonalSuspects,
  NEUTRAL_INTENT_ACTION,
  NEUTRAL_PHONE_NUMBER,
  NEUTRAL_TEST_EVENT,
  NEUTRAL_URL,
  replaceFreeTexts,
  RULED_PREFERENCE_KEYS,
  SUSPECT_VALUE_LIMIT,
  tallyPreferences,
  UNKNOWN_FORMAT
} from '../../src/model/sharing'
import PERSONAL_KEYS from '../../src/model/personalKeys.json'
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

/* ============ la sauvegarde entière, données personnelles remplacées ligne par ligne */

/**
 * La troisième issue, et le manque qu'elle comble.
 *
 * Un pilote qui veut de l'aide sur ses réglages de vario n'avait le choix qu'entre tout
 * envoyer avec son nom (`plain`) ou n'envoyer que ses pages (`anonymizeDocument`), donc
 * aucun réglage — donc aucune question à poser. `anonymizeBackup` garde la sauvegarde
 * entière et remplace ce qui désigne le pilote.
 *
 * Ce qui est éprouvé ici, dans cet ordre :
 *
 * 1. **le fichier reste un `backup`** et ses réglages traversent — sans quoi l'issue
 *    n'aurait aucune raison d'exister ;
 * 2. **rien de ce qui désigne le pilote ne survit**, cherché dans le texte sérialisé
 *    complet et non dans l'inventaire ;
 * 3. **l'inventaire dit exactement ce qui a été fait**, y compris ce qu'on a refusé de
 *    faire ;
 * 4. **un fichier sans rien à remplacer ressort à l'octet près.**
 */
describe('anonymizeBackup — les réglages traversent, le pilote non', () => {
  const result = anonymizeBackup(parseJson(SOURCE))
  const text = serializeJson(result.document)

  it('reste un « backup » : le format, les préférences et les canaux sont là', () => {
    // Toute la valeur de cette issue est là : un « pages » ne porte aucun réglage, donc
    // aucune question à poser sur un réglage.
    expect(documentExportType(result.document)).toBe('backup')
    expect(getMember(result.document, 'preferences')).toBeDefined()
    expect(getMember(result.document, 'airspaceSelectedChannels')).toBeDefined()
  })

  it('ne laisse survivre aucun des quatorze textes de gadget', () => {
    for (const original of ORIGINALS) {
      expect(SOURCE).toContain(original)
      expect(text).not.toContain(original)
    }
  })

  it('remplace le nom du pilote et celui de la voile par des mots neutres', () => {
    for (const marker of ['Amélie Exemple', 'Voile d’Amélie']) {
      expect(SOURCE).toContain(marker)
      expect(text).not.toContain(marker)
    }
    expect(text).toContain('"Pilot.Name": "Pilote"')
    expect(text).toContain('"Glider.Name": "Voile"')
  })

  it('retire la ligne entière quand la valeur est un fichier du pilote', () => {
    expect(SOURCE).toContain('Navigation.WaypointFiles')
    expect(text).not.toContain('Navigation.WaypointFiles')
    expect(text).not.toContain('Comp2026.wpt')
  })

  it('ce qui n’est pas du texte libre traverse intact, pièges du sérialiseur compris', () => {
    for (const survivor of SURVIVORS) expect(text).toContain(survivor)
  })

  it('l’inventaire porte une entrée par réglage personnel, avec sa raison', () => {
    expect(result.preferences.map((one) => one.key))
      .toEqual(['Pilot.Name', 'Glider.Name', 'Navigation.WaypointFiles'])
    for (const outcome of result.preferences) {
      expect(outcome.reason.length).toBeGreaterThan(30)
      // Aucun réglage ne tombe sur la règle de repli : chacun a la sienne.
      expect(outcome.reason).not.toContain('par précaution')
    }
    expect(result.preferences[0]).toMatchObject({
      key: 'Pilot.Name', treatment: 'replace', before: 'Amélie Exemple', after: 'Pilote'
    })
    expect(result.preferences[2]).toMatchObject({
      key: 'Navigation.WaypointFiles', treatment: 'drop'
    })
  })

  it('anonymiser deux fois donne le même fichier', () => {
    expect(serializeJson(anonymizeBackup(result.document).document)).toBe(text)
  })

  it('la source n’a pas bougé d’un octet', async () => {
    const source = parseJson(SOURCE)
    const before = await sha256Hex(new TextEncoder().encode(serializeJson(source)))
    anonymizeBackup(source)
    expect(await sha256Hex(new TextEncoder().encode(serializeJson(source)))).toBe(before)
    expect(serializeJson(source)).toBe(SOURCE)
  })
})

describe('anonymizeBackup — le fichier de référence, en chiffres', () => {
  const text = readFileSync(BACKUP_2026, 'utf8')
  const result = anonymizeBackup(parseJson(text))
  const produced = serializeJson(result.document)

  it('traite les seize réglages personnels du fichier, en quatre issues nommées', () => {
    // Mesuré sur `2026-08-20_backup-00.xcfg` : 16 réglages personnels sur 136 préférences.
    // Les quatre chiffres ne s'additionnent pas en un total qui voudrait dire quelque
    // chose — c'est pourquoi ils sont nommés.
    expect(result.preferences).toHaveLength(16)
    expect(tallyPreferences(result.preferences))
      .toEqual({ replaced: 3, dropped: 4, kept: 4, empty: 5 })
    // Le fichier ne porte aucun texte de gadget : tout ce qui le désigne est en préférences.
    expect(result.replacements).toHaveLength(0)
    expect(changedPreferenceCount(result.preferences)).toBe(7)
  })

  it('rien de ce qui désignait le pilote ne survit', () => {
    for (const marker of [
      'Amélie', 'EXEMPLE Aile Légère 2', 'coupe-exemple-2026', 'hyperpilot',
      'Navigation.State', 'Sensors.Configuration'
    ]) {
      expect(text).toContain(marker)
      expect(produced).not.toContain(marker)
    }
  })

  it('les réglages qu’on vient partager, eux, traversent tous', () => {
    // La raison d'être de l'issue : le vario, ses sons, les unités et le thème restent
    // lisibles pour celui à qui on pose la question.
    for (const kept of [
      'Sound.AcousticVario.CustomProfile', 'Unit.VerticalSpeed', 'Display.Theme',
      'Airspace.Filling', 'Sounds'
    ]) {
      expect(text).toContain(kept)
      expect(produced).toContain(kept)
    }
    // 136 préférences moins les quatre lignes retirées.
    const preferences = getMember(result.document, 'preferences')!
    expect(preferences.kind).toBe('object')
    if (preferences.kind === 'object') expect(preferences.entries).toHaveLength(132)
  })

  it('les choix de diffusion Livetrack sont conservés, et l’inventaire le dit', () => {
    // Ce qu'on a **refusé** de remplacer se dit aussi fort que ce qu'on a remplacé : un
    // booléen de diffusion est un réglage, il ne porte ni nom, ni numéro, ni adresse.
    const kept = result.preferences.filter((one) => one.treatment === 'keep')
    expect(kept.map((one) => one.key)).toEqual([
      'Livetrack.Enabled', 'Livetrack.ClaimContest', 'Livetrack.ShowPublic',
      'Livetrack.FlightPublic'
    ])
    expect(produced).toContain('"Livetrack.Enabled": true')
  })

  it('le contenu d’une structure n’est jamais montré, seulement sa taille', () => {
    // `Navigation.State` porte la tâche en cours et ses coordonnées, sur 1 332 caractères.
    // L'inventaire en dit la taille et le danger, jamais le contenu.
    const state = result.preferences.find((one) => one.key === 'Navigation.State')!
    expect(state.treatment).toBe('drop')
    expect(state.before).toContain('non montrée')
    expect(state.before).not.toContain('lat')
  })
})

describe('anonymizeBackup — sans rien à remplacer, le fichier ressort à l’octet près', () => {
  for (const path of [PAGES_2026, PAGES_2025]) {
    it(`${shortName(path)} : même empreinte SHA-256 qu’à l’entrée`, async () => {
      // La preuve demandée : le traitement n'écrit rien quand il n'y a rien à écrire.
      // Sans elle, « la fidélité tient » ne serait qu'une intention.
      const text = readFileSync(path, 'utf8')
      const result = anonymizeBackup(parseJson(text))
      expect(result.preferences).toEqual([])
      expect(result.replacements).toEqual([])
      const produced = serializeJson(result.document)
      expect(produced).toBe(text)
      expect(await sha256Hex(new TextEncoder().encode(produced)))
        .toBe(await sha256Hex(new TextEncoder().encode(text)))
    })
  }

  for (const path of [BACKUP_2026, FORMES_PRESERVEES, GSON_2022]) {
    it(`${shortName(path)} : le document ouvert n’est pas touché`, async () => {
      const text = readFileSync(path, 'utf8')
      const document = parseJson(text)
      const before = await sha256Hex(new TextEncoder().encode(serializeJson(document)))
      anonymizeBackup(document)
      expect(await sha256Hex(new TextEncoder().encode(serializeJson(document)))).toBe(before)
      expect(serializeJson(document)).toBe(text)
    })
  }
})

describe('la table des règles couvre exactement les réglages déclarés personnels', () => {
  it('chacune des 44 clés a sa règle, et aucune règle n’est orpheline', () => {
    // Le garde-fou qui fait tenir le reste : une clé déclarée personnelle sans règle
    // tomberait sur le repli, et une règle sans clé serait du code mort qui ment.
    const declared = Object.keys(PERSONAL_KEYS.keys).sort()
    expect([...RULED_PREFERENCE_KEYS].sort()).toEqual(declared)
    expect(declared).toHaveLength(PERSONAL_KEYS.meta.keyCount)
  })
})

/* ================== ce qui a l'air d'une donnée personnelle sans être déclaré */

/**
 * La parade au mode de défaillance que `scope.ts` nomme sans le corriger : les 44 réglages
 * et les onze champs de texte sont des **listes noires**, et le format de XCTrack change à
 * chaque version. Un 45ᵉ réglage personnel partirait en clair, sans erreur ni signal.
 *
 * Ce qui est éprouvé : la règle est **muette sur les fichiers réels** — sans quoi elle
 * serait une alarme de plus qu'on apprend à ignorer — et elle **parle** dès qu'un texte a
 * été écrit plutôt que choisi.
 */
describe('findPersonalSuspects — muet sur le corpus, parlant sur ce qui a été écrit', () => {
  for (const path of [BACKUP_2026, PAGES_2026, BACKUP_2025, PAGES_2025, BACKUP_ARCHIVE,
    FORMES_PRESERVEES, GSON_2022]) {
    it(`${shortName(path)} : aucune fausse alerte`, () => {
      // Mesuré : ce que XCTrack écrit hors des champs de saisie du pilote est fait de
      // jetons — `LANDSCAPE`, `WhiteHCTheme`, `m,km`, `METAR`. Jamais d'accent, jamais
      // d'espace. Une règle qui crierait sur ces sept fichiers ne serait jamais lue.
      expect(findPersonalSuspects(parseJson(readFileSync(path, 'utf8')))).toEqual([])
    })
  }

  const PLANTED = [
    '{',
    '  "info": {',
    '    "device": "AIR3 AIR3-7.2 8.1.0",',
    '    "exportType": "backup"',
    '  },',
    '  "layout": {',
    '    "landscape": [',
    '      {',
    '        "CLASS": "org.xcontest.XCTrack.widget.wp.WPEmpty",',
    '        "widgets": [',
    '          {',
    '            "CLASS": "org.xcontest.XCTrack.widget.w.WFutur",',
    '            "reglageFutur": "Ma page à moi",',
    '            "_theme": "ClearpilotForest",',
    '            "titletext": "Déjà traité par les règles"',
    '          }',
    '        ]',
    '      }',
    '    ],',
    '    "portrait": []',
    '  },',
    '  "preferences": {',
    '    "Pilot.Name": "Amélie Exemple",',
    '    "Navigation.State": {',
    '      "name": "Balise du Grand Pré"',
    '    },',
    '    "Futur.Contact": "amelie@exemple.test",',
    '    "Futur.Serveur": "https://exemple.test/?jeton=SECRET",',
    '    "Futur.Fichier": "/sdcard/mes-traces/vol.igc",',
    '    "Futur.Capteur": "A1:B2:C3:D4:E5:F6",',
    '    "Futur.Appel": "+32 470 12 34 56",',
    '    "Futur.Enum": "LANDING_AUTOMATIC",',
    '    "Futur.Nombre": "500"',
    '  }',
    '}'
  ].join('\n')

  const suspects = findPersonalSuspects(parseJson(PLANTED))
  const at = (path: string): string | undefined =>
    suspects.find((one) => one.path === path)?.clue

  it('le document d’essai fait l’aller-retour à l’octet près', () => {
    expect(serializeJson(parseJson(PLANTED))).toBe(PLANTED)
  })

  it('nomme la forme qui a mis la puce à l’oreille, la plus précise d’abord', () => {
    expect(at('Futur.Contact')).toContain('adresse électronique')
    expect(at('Futur.Serveur')).toContain('adresse web')
    expect(at('Futur.Fichier')).toContain('chemin de fichier')
    expect(at('Futur.Capteur')).toContain('Bluetooth')
    expect(at('Futur.Appel')).toContain('numéro de téléphone')
  })

  it('trouve un réglage de gadget qu’aucune liste ne connaît', () => {
    const found = suspects.find((one) => one.path.endsWith('reglageFutur'))!
    expect(found.value).toBe('Ma page à moi')
    expect(found.home).toBe('layout')
    expect(found.clue).toMatch(/espace|accentuées/)
  })

  it('ne crie ni sur une énumération, ni sur un nombre, ni sur la carte d’identité', () => {
    for (const quiet of ['Futur.Enum', 'Futur.Nombre']) expect(at(quiet)).toBeUndefined()
    // `info.device` vaut « AIR3 AIR3-7.2 8.1.0 » : trois champs collés par des espaces.
    // Le parcourir ferait une fausse alerte à chaque fichier ouvert.
    expect(suspects.some((one) => one.path.includes('device'))).toBe(false)
    // `_theme` est un thème livré dans l'APK, pas un texte écrit.
    expect(suspects.some((one) => one.path.endsWith('_theme'))).toBe(false)
  })

  it('ne déballe jamais une structure déjà déclarée personnelle', () => {
    // `Navigation.State` porte la tâche et ses coordonnées. Le parcourir pour en extraire
    // les chaînes est précisément ce que `personalData.ts` interdit.
    expect(suspects.some((one) => one.path.startsWith('Navigation.State'))).toBe(false)
    expect(suspects.some((one) => one.value.includes('Grand Pré'))).toBe(false)
    // Ni un réglage qui a déjà sa règle, ni un champ de texte déjà remplacé.
    expect(at('Pilot.Name')).toBeUndefined()
    expect(suspects.some((one) => one.path.endsWith('titletext'))).toBe(false)
  })

  it('avertit sans jamais remplacer : le document rendu porte encore les textes', () => {
    // Toute l'éthique du module tient là. Remplacer sur un soupçon abîmerait des réglages
    // légitimes ; le pilote, lui, reconnaît un texte qu'il a écrit.
    const produced = serializeJson(anonymizeBackup(parseJson(PLANTED)).document)
    expect(produced).toContain('Ma page à moi')
    expect(produced).toContain('amelie@exemple.test')
    // …et il les signale, à côté du document qu'il rend.
    expect(anonymizeBackup(parseJson(PLANTED)).suspects.length).toBe(suspects.length)
  })

  it('montre une valeur longue tronquée, pour qu’elle soit reconnue et non lue', () => {
    const long = 'Ceci est une phrase '.repeat(20)
    const document = parseJson(`{\n  "preferences": {\n    "Futur.Long": ${JSON.stringify(long)}\n  }\n}`)
    const found = findPersonalSuspects(document)[0]!
    expect(found.value).toHaveLength(SUSPECT_VALUE_LIMIT + 1)
    expect(found.value.endsWith('…')).toBe(true)
  })
})
