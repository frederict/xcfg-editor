import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { FREE_TEXT_KEYS } from '../../src/model/scope'
import {
  collectPersonalData,
  findingsIn,
  isReadFromApk,
  personalHomeLabel,
  personalValueText,
  NEVER_EXPORTED_PERSONAL_KEYS,
  PERSONAL_BASIS_LABELS,
  PERSONAL_CAVEAT,
  PERSONAL_KIND_LABELS,
  PERSONAL_KNOWLEDGE,
  SECURE_PERSONAL_KEYS
} from '../../src/model/personalData'
import PERSONAL_KEYS from '../../src/model/personalKeys.json'
import CATALOG_BASE from '../../src/catalog/preferenceCatalog/base.json'
import { BACKUP_2026, FORMES_PRESERVEES, PAGES_2026 } from '../fixtures/paths'

function documentOf(path: string) {
  return parseJson(readFileSync(path, 'utf-8'))
}

/* ================================================ le relevé embarqué ne peut pas dériver */

describe('données personnelles — le relevé des clés vient du catalogue, pas d’une liste', () => {
  /**
   * **Le test qui rend l'unification démontrable.**
   *
   * `src/model/personalKeys.json` existe pour une raison de poids : trois écrans sur
   * quatre n'ont pas le catalogue des préférences sous la main (96 Ko, chargé à la
   * demande) et ne doivent pas le charger pour répondre « qu'y a-t-il de personnel dans
   * ce fichier ? ». Le relevé est donc **extrait** du catalogue par
   * `tools/extract-preferences.py`, jamais recopié à la main.
   *
   * Une copie que rien ne vérifie dérive au premier APK, en silence — et c'est le pire
   * mode de défaillance pour de la confidentialité : la page des réglages signalerait une
   * clé que la bibliothèque ignorerait, sans que personne ne s'en aperçoive.
   */
  it('est exactement le sous-ensemble « personnel » de preferenceCatalog/base.json', () => {
    const expected: Record<string, unknown> = {}
    const preferences = CATALOG_BASE.preferences as unknown as
      Record<string, { scope: string | null; personal?: { kind: string; basis: string; reason: string } }>
    for (const key of Object.keys(preferences).sort()) {
      const entry = preferences[key]!
      if (entry.personal === undefined) continue
      expected[key] = {
        kind: entry.personal.kind,
        basis: entry.personal.basis,
        reason: entry.personal.reason,
        scope: entry.scope
      }
    }

    expect(PERSONAL_KEYS.keys).toEqual(expected)
    expect(Object.keys(expected)).toHaveLength(44)
    expect(PERSONAL_KNOWLEDGE.keyCount).toBe(44)
    expect(PERSONAL_KNOWLEDGE.versionCode).toBe(CATALOG_BASE.meta.versionCode)
  })

  it('chaque clé de texte libre du layout a sa nature et sa raison, aucune n’use du repli', () => {
    // Même garde-fou que `FREE_TEXT_RULES` dans `sharing.ts` : une clé sans règle propre
    // recevrait un texte de précaution, ce qui marche mais ne dit rien de juste.
    const document = parseJson(`{
      "info": { "exportType": "pages" },
      "layout": { "landscape": [ { "CLASS": "P", "widgets": [ {
        "CLASS": "org.xcontest.XCTrack.widget.w.WTest",
        ${FREE_TEXT_KEYS.map((key, index) => `"${key}": "valeur ${index}"`).join(',\n        ')}
      } ] } ], "portrait": [] }
    }`)

    const inventory = collectPersonalData(document)
    expect(inventory.counts.layout).toBe(FREE_TEXT_KEYS.length)
    for (const finding of inventory.findings) {
      expect(finding.reason).not.toContain('sans règle propre')
      expect(PERSONAL_KIND_LABELS[finding.kind]).toBeDefined()
    }
  })

  it('le vocabulaire couvre les neuf natures et les trois bases', () => {
    expect(Object.keys(PERSONAL_KIND_LABELS)).toHaveLength(9)
    expect(Object.keys(PERSONAL_BASIS_LABELS)).toHaveLength(3)
    expect(PERSONAL_CAVEAT).toContain('ne prouve donc pas une absence')
  })

  it('les trois bases disent d’où vient l’affirmation, sans calquer l’anglais', () => {
    // « portée » traduisait *scope* — un pilote y lit la portée d'un émetteur ; « champ
    // de saisie masqué » se lit « champ caché » alors qu'il se saisit en points ; et
    // « jugement de l'extraction » ne disait ni qui juge, ni quoi. Ce que les trois
    // portent, et qu'il ne faut pas perdre : lu dans XCTrack, ou jugé par nous.
    expect(PERSONAL_BASIS_LABELS.scope).toBe('XCTrack le déclare lui-même')
    expect(PERSONAL_BASIS_LABELS.inputType).toContain('comme un mot de passe')
    expect(PERSONAL_BASIS_LABELS.declared).toBe('c’est notre jugement, pas celui de XCTrack')
    for (const label of Object.values(PERSONAL_BASIS_LABELS)) {
      expect(label).not.toMatch(/portée|masqué|extraction/)
    }
    // La distinction reste calculable, et c'est elle que les écrans hiérarchisent.
    expect(isReadFromApk('scope')).toBe(true)
    expect(isReadFromApk('inputType')).toBe(true)
    expect(isReadFromApk('declared')).toBe(false)
  })
})

/* ====================================================== où ça vit : ce qui voyage ou non */

describe('données personnelles — où ça vit décide de ce qui voyage', () => {
  it('le backup de référence : 16 clés de préférences, aucune dans la disposition', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))

    expect(inventory.counts).toEqual({
      total: 16, layout: 0, preferences: 16, filled: 11, empty: 5, read: 0, judged: 16
    })
    expect(findingsIn(inventory, 'layout')).toEqual([])
    expect(findingsIn(inventory, 'preferences').map((finding) => finding.key))
      .toContain('Navigation.State')
  })

  it('un export « pages » sans texte libre ne porte rien — et c’est structurel', () => {
    const inventory = collectPersonalData(documentOf(PAGES_2026))
    expect(inventory.counts.total).toBe(0)
    expect(inventory.counts.preferences).toBe(0)
  })

  /**
   * ⚠️ Le fait le plus contre-intuitif du format, et celui qu'il ne faut jamais réénoncer
   * à l'envers : **un export « pages » PEUT porter des données personnelles**. Le nom et
   * le numéro de téléphone d'un `WButtonPhone` vivent dans le `layout`, donc ils partent
   * avec les pages.
   */
  it('le nom et le numéro d’un bouton d’appel sont dans la disposition, donc ils partent', () => {
    const inventory = collectPersonalData(documentOf(FORMES_PRESERVEES))

    expect(inventory.counts).toEqual({
      total: 8, layout: 5, preferences: 3, filled: 7, empty: 1, read: 0, judged: 8
    })
    const phone = inventory.findings.find((f) => f.key === 'WButtonPhone/contact/phoneNumber')
    expect(phone).toMatchObject({
      home: 'layout', kind: 'contact', basis: 'declared', filled: true,
      value: '+32 470 00 00 00'
    })
    expect(phone?.location).toMatchObject({ shortName: 'WButtonPhone', keyPath: 'contact/phoneNumber' })
    expect(personalHomeLabel('layout')).toContain('part avec les pages')
    expect(personalHomeLabel('preferences')).toContain('reste chez vous')
  })
})

/* ============================================== d'où on le sait : lu dans l'APK, ou jugé */

describe('données personnelles — « lu dans l’APK » n’est pas « jugé par nous »', () => {
  /**
   * Le résultat mesuré, et il vaut d'être dit plutôt que gommé : **tout ce qu'un fichier
   * réel porte de personnel relève d'un jugement de cet éditeur**. Les seules clés dont
   * XCTrack déclare lui-même la sensibilité sont celles qu'il chiffre (`SECURE`) ou garde
   * pour lui (`INTERNAL`) — et par construction, aucune n'est exportée.
   */
  it('aucune donnée d’un fichier réel n’est signalée par XCTrack lui-même', () => {
    for (const path of [BACKUP_2026, FORMES_PRESERVEES]) {
      const inventory = collectPersonalData(documentOf(path))
      expect(inventory.counts.read).toBe(0)
      expect(inventory.counts.judged).toBe(inventory.counts.total)
      for (const finding of inventory.findings) {
        expect(isReadFromApk(finding.basis)).toBe(false)
        expect(finding.reason).not.toBe('')
      }
    }
  })

  it('les clés que XCTrack déclare sensibles sont précisément celles qui ne sortent jamais', () => {
    expect(SECURE_PERSONAL_KEYS.length).toBeGreaterThan(0)
    expect(SECURE_PERSONAL_KEYS.every((key) => NEVER_EXPORTED_PERSONAL_KEYS.includes(key))).toBe(true)

    // La position présumée de l'appareil — le domicile, en pratique. `INTERNAL` : à
    // connaître, pas à craindre. Son absence de tout fichier est le renseignement.
    expect(NEVER_EXPORTED_PERSONAL_KEYS).toContain('App.GuessLatitude')
    expect(NEVER_EXPORTED_PERSONAL_KEYS).toContain('App.GuessLongitude')

    const backup = collectPersonalData(documentOf(BACKUP_2026))
    const keys = backup.findings.map((finding) => finding.key)
    for (const key of NEVER_EXPORTED_PERSONAL_KEYS) expect(keys).not.toContain(key)
  })

  it('`Navigation.State` est PUBLIC : elle voyage, et le relevé le dit', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const state = inventory.findings.find((finding) => finding.key === 'Navigation.State')
    expect(state).toMatchObject({ home: 'preferences', kind: 'location', scope: 'PUBLIC', filled: true })
  })
})

/* ================================================ ce qui est renseigné, et ce qui est vide */

describe('données personnelles — un emplacement vide n’est pas une donnée', () => {
  /**
   * Mesuré sur le corpus : **les 15 `WButtonPhone` portent tous une structure `contact`
   * vide**. Confondre « fiche présente » et « numéro enregistré » alarmerait sur des
   * fichiers qui ne portent rien, ou tairait un emplacement que le pilote remplira demain.
   */
  it('une fiche contact présente mais vide est dite — et n’est pas comptée comme renseignée', () => {
    const document = parseJson(`{
      "info": { "exportType": "pages" },
      "layout": { "landscape": [ { "CLASS": "P", "widgets": [ {
        "CLASS": "org.xcontest.XCTrack.widget.w.WButtonPhone",
        "titletext": "",
        "contact": { "fullName": "", "phoneNumber": "" }
      } ] } ], "portrait": [] }
    }`)

    const inventory = collectPersonalData(document)

    // Les deux clés de la fiche sont dites, vides ; le `titletext` vide ne l'est pas —
    // le corpus en compte 1 401, les montrer cacherait les vrais.
    expect(inventory.findings.map((finding) => finding.key)).toEqual([
      'WButtonPhone/contact/fullName',
      'WButtonPhone/contact/phoneNumber'
    ])
    expect(inventory.counts).toEqual({
      total: 2, layout: 2, preferences: 0, filled: 0, empty: 2, read: 0, judged: 2
    })
    expect(inventory.findings.every((finding) => finding.value === undefined)).toBe(true)
    expect(personalValueText(inventory.findings[0]!)).toBe('emplacement présent, mais vide')
  })

  it('la même fiche renseignée bascule tout entière du côté « renseigné »', () => {
    // Le contraste est le cas d'épreuve : même structure, valeurs non vides.
    const inventory = collectPersonalData(documentOf(FORMES_PRESERVEES))
    const contact = inventory.findings.filter((finding) => finding.kind === 'contact')
    expect(contact).toHaveLength(2)
    expect(contact.every((finding) => finding.filled)).toBe(true)
    expect(personalValueText(contact[0]!)).toBe('Jean Exemple')
  })

  it('une préférence à chaîne vide ou à liste vide est un emplacement, pas une donnée', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const empty = inventory.findings.filter((finding) => !finding.filled).map((f) => f.key)
    // Un `ActiveLook.Name` vide n'est pas le nom de vos lunettes ; `Airspace.Files: []`
    // n'est pas un fichier chargé.
    expect(empty).toEqual([
      'Glider.Ctg', 'Glider.CtgHG', 'ActiveLook.Name', 'ActiveLook.Device', 'Airspace.Files'
    ])
  })
})

/* ============================================== ce qu'on montre, et ce qu'on ne montre pas */

describe('données personnelles — on ne déballe jamais une structure', () => {
  it('`Navigation.State` se dit par sa taille, jamais par ses coordonnées', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const state = inventory.findings.find((finding) => finding.key === 'Navigation.State')!

    const shown = personalValueText(state)
    expect(shown).toContain('structure')
    expect(shown).not.toContain('lon')
    expect(state.value).toBeUndefined()
    expect(state.values).toBeUndefined()
  })

  it('`Sensors.Configuration` non plus — les adresses Bluetooth restent dedans', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const sensors = inventory.findings.find((f) => f.key === 'Sensors.Configuration')!
    expect(sensors.kind).toBe('device')
    expect(personalValueText(sensors)).toContain('structure')
  })

  /**
   * L'exception, et elle est nominative : le nom d'un fichier de waypoints **est** la
   * donnée personnelle — il désigne souvent la compétition à laquelle le pilote
   * participe. En dire la taille reviendrait à taire ce qui compte.
   */
  it('les fichiers de waypoints sont nommés un par un, parce que le nom est la donnée', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const waypoints = inventory.findings.find((f) => f.key === 'Navigation.WaypointFiles')!
    expect(waypoints.values).toEqual([
      'coupe-exemple-2026.CompeGPS.wpt', 'cities5000-Exemple.wpt', 'xctrack-internal.wpt'
    ])
    expect(personalValueText(waypoints)).toContain('coupe-exemple-2026')
  })
})

/* ===================================================== l'inventaire ne modifie rien */

describe('données personnelles — l’inventaire est une lecture', () => {
  it('dresser l’inventaire ne change pas un octet du document', () => {
    const source = readFileSync(BACKUP_2026, 'utf-8')
    const document = parseJson(source)
    collectPersonalData(document)
    // Le document analysé conserve le texte source de chaque littéral : le comparer à
    // lui-même après lecture est la preuve la plus directe qu'on n'a rien écrit.
    expect(JSON.stringify(document)).toBe(JSON.stringify(parseJson(source)))
  })
})

/* ============================================ l'inventaire parle AU pilote, pas DE lui */

describe('données personnelles — les raisons disent « vous »', () => {
  /**
   * Ces raisons s'affichent dans la boîte de partage et sur la carte d'identité de la
   * bibliothèque. « écrit par le pilote » y donnait au pilote l'impression de lire le
   * dossier de quelqu'un d'autre, au moment précis où on lui montre ce que son propre
   * fichier révèle de lui.
   */
  it('aucune raison ne parle du pilote à la troisième personne', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    for (const finding of inventory.findings) {
      expect(finding.reason, finding.key).not.toContain('le pilote')
    }
  })

  it('le titre d’un gadget et le texte libre sont dits « écrits par vous »', () => {
    const inventory = collectPersonalData(documentOf(BACKUP_2026))
    const written = inventory.findings.filter((f) => f.reason.includes('par vous'))
    expect(written.length).toBeGreaterThan(0)
  })
})
