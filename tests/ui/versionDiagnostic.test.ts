import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  VersionDatabase,
  loadVersionDatabase,
  type VersionIndex,
  type VersionSchema
} from '../../src/catalog/widgetVersions'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { readLayout } from '../../src/model/layout'
import {
  CATEGORIES,
  buildVersionPanel,
  categoryOf,
  diagnose,
  divergenceSentence,
  placeLabel,
  readDocumentVersion,
  previousPublishedTier,
  splitVersionName,
  suggestTier,
  tierDelta,
  versionLabel,
  versionOptions,
  type Diagnosis,
  type FindingCategory
} from '../../src/ui/versionDiagnostic'
import { BACKUP_2025, BACKUP_2026, GSON_2022 } from '../fixtures/paths'

const db = await loadVersionDatabase()

function documentOf(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

function diagnosisOf(path: string, tier: number, candidates?: number[]): Diagnosis {
  const document = documentOf(path)
  return diagnose(db, readLayout(document), { tier, candidateTiers: candidates })
}

/** Les couples que la base déclare `gap` : un trou de notre relevé, jamais un reliquat. */
const KNOWN_GAPS: Array<[widget: string, key: string, tiers: number[]]> = [
  ['WCompMap', 'fontSize', [0, 1, 5, 6]],
  ['WCompMap', 'line_thickness', [0, 1]],
  ['WThermalAssistant', 'fontSize', [0, 1, 5, 6]],
  ['WXCAssistant', 'fontSize', [0, 1, 5, 6]],
  ['WXCAssistant', 'line_thickness', [0, 1]]
]

/* --------------------------------------------------------------------- le sélecteur */

describe('le menu de versions', () => {
  const options = versionOptions(db)

  it('propose une entrée par version relevée, pas une par inventaire de réglages', () => {
    // 47 relevés, dont deux archives de 0.9.8.4 que rien ne distingue : 46 entrées.
    // Le menu par inventaire n'en proposait que 11, et la version de l'AIR³ n'y était pas.
    expect(options).toHaveLength(46)
    expect(db.index.tiers).toHaveLength(21)
  })

  it('porte la version que l’AIR³ affiche, sous le nom que l’AIR³ affiche', () => {
    // Le défaut mesuré : l'appareil dit « 1.0.3-beta », le relevé enregistre
    // « 1.0.3-beta-5-gc036d8f2c », et le menu ne nommait que « 1.0.0-RC2 ».
    const mine = options.find((option) => option.label === '1.0.3-beta')
    expect(mine).toBeDefined()
    expect(mine?.code).toBe(100030)
    expect(mine?.tier).toBe(20)
    expect(options.map((option) => option.label)).toContain('1.0.1-beta')
    expect(options.map((option) => option.label)).toContain('1.0.2-beta')
  })

  it('va de la plus récente à la plus ancienne', () => {
    expect(options[0]?.label).toBe('1.0.3-beta')
    expect(options[options.length - 1]?.label).toContain('0.9.6.2-beta')
  })

  it('ôte le suffixe de construction, et ne le remet que s’il départage', () => {
    expect(splitVersionName('1.0.3-beta-5-gc036d8f2c'))
      .toEqual({ release: '1.0.3-beta', build: '5-gc036d8f2c' })
    expect(splitVersionName('1.0.0-RC2')).toEqual({ release: '1.0.0-RC2', build: null })

    // Trois constructions de 0.9.12.3 : sans le suffixe, trois lignes identiques.
    const builds = options.filter((option) => option.release === '0.9.12.3')
    expect(builds).toHaveLength(3)
    for (const option of builds) expect(option.label).toContain('construction')
    // Une seule construction de 1.0.3-beta : le suffixe n'y départage rien.
    expect(options.filter((option) => option.release === '1.0.3-beta')).toHaveLength(1)
  })

  it('distingue les versions publiées des constructions intermédiaires', () => {
    const published = options.filter((option) => option.published)
    const builds = options.filter((option) => !option.published)
    expect(published.length).toBeGreaterThan(0)
    expect(builds.length).toBeGreaterThan(0)
    expect(published.map((option) => option.label)).toContain('1.0.0-RC2')
    expect(builds.map((option) => option.label)).toContain('1.0.0-RC1 (construction 31-g598cd4ebb)')
  })

  it('donne une valeur distincte à chaque entrée', () => {
    expect(new Set(options.map((option) => option.value)).size).toBe(options.length)
  })

  it('ne fait qu’une entrée de deux archives que rien ne distingue', () => {
    // 0.9.8.4 est relevé sous 90840 et 90841, même nom, même inventaire : en proposer
    // deux laisserait croire à un choix qui n'en est pas un.
    const same = options.filter((option) => option.release === '0.9.8.4')
    expect(same).toHaveLength(1)
    expect(same[0]?.codes).toEqual([90840, 90841])
  })

  it('ne nomme jamais une version par un numéro interne', () => {
    for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
      expect(versionLabel(db, tier)).not.toContain('palier')
    }
    expect(versionLabel(db, 20)).toBe('1.0.0-RC2')
    expect(versionLabel(db, 19)).toBe('1.0.0-RC1 (construction 31-g598cd4ebb)')
    // Avec un numéro, c'est la version qui le porte qui est nommée, construction
    // comprise : ces messages-là servent précisément à départager des voisines.
    expect(versionLabel(db, 20, 100030)).toBe('1.0.3-beta (construction 5-gc036d8f2c)')
  })
})

describe('l’écart affiché', () => {
  it('se compte depuis la version PUBLIÉE précédente, pas depuis le relevé n-1', () => {
    // Le relevé 20 déclare `keysAdded` par rapport au 19, une construction intermédiaire
    // de 1.0.0-RC1 : deux réglages. Depuis 0.9.12.6, la dernière version publiée avant
    // elle, l'écart réel est d'un tout autre ordre — l'afficher tel quel mentirait.
    const declared = db.tier(20)
    expect(Object.values(declared?.keysAdded ?? {}).flat()).toHaveLength(2)
    expect(previousPublishedTier(db, 20)).toBe(17)

    const delta = tierDelta(db, 17, 20)
    expect(delta.fromTier).toBe(17)
    expect(delta.keysAddedCount).toBeGreaterThan(50)
    expect(delta.widgetsAdded.length).toBeGreaterThan(0)
    expect(delta.summary).toContain('Depuis 0.9.12.6')
  })

  it('ne compte pas deux fois les réglages qu’un gadget entièrement neuf apporte', () => {
    const delta = tierDelta(db, 17, 20)
    for (const entry of delta.keysAdded) {
      // Un gadget cité dans `keysAdded` existait déjà au départ de la comparaison.
      expect(db.widgetStatus(entry.widget, 17)).toBe('present')
    }
  })

  it('dit qu’il n’y a rien à comparer quand rien n’est publié avant', () => {
    expect(previousPublishedTier(db, 0)).toBeNull()
    const delta = tierDelta(db, previousPublishedTier(db, 0), 0)
    expect(delta.fromTier).toBeNull()
    expect(delta.summary).toContain('rien à comparer')
  })
})

/* ------------------------------------------------------------------ la présélection */

describe('présélection d’après le versionCode du fichier', () => {
  it('retient la version que le fichier déclare, et la nomme comme l’appareil', () => {
    const suggestion = suggestTier(db, documentOf(BACKUP_2026))
    expect(suggestion.version).toEqual({ code: 100030, name: '1.0.3-beta' })
    expect(suggestion.basis).toBe('exact')
    expect(suggestion.candidateTiers).toEqual([20])
    expect(suggestion.selected).toBe(20)
    expect(suggestion.selectedCode).toBe(100030)
    // Le nom de l'appareil, pas celui de la première version du même inventaire.
    expect(suggestion.message).toContain('XCTrack 1.0.3-beta')
    expect(suggestion.message).not.toContain('1.0.0-RC2')
  })

  it('laisse le NOM déclaré trancher ce que le numéro laisse ambigu', () => {
    // 90615 est déclaré par deux APK aux inventaires différents : le versionCode ne dit
    // pas lequel a écrit le fichier — mais le versionName, lui, le dit.
    const suggestion = suggestTier(db, documentOf(GSON_2022))
    expect(suggestion.version.name).toBe('0.9.6.2-beta-48-gcb6ffef8')
    expect(suggestion.basis).toBe('exact')
    expect(suggestion.candidateTiers).toEqual([0])
    expect(suggestion.selected).toBe(0)
    expect(suggestion.message).toContain('le nom que le fichier déclare n’en désigne qu’une')
  })

  it('retient la plus récente, et le dit, quand ni le numéro ni le nom ne tranchent', () => {
    // Le même fichier privé de son nom : il ne reste que le numéro, qui ne suffit pas.
    const suggestion = suggestTier(db, parseJson('{"info":{"versionCode":90615}}'))
    expect(suggestion.basis).toBe('ambiguous')
    expect(suggestion.candidateTiers).toEqual([0, 1])
    expect(suggestion.selected).toBe(1)
    expect(suggestion.message).toContain('sans accepter les mêmes réglages')
    expect(suggestion.message).toContain('arbitraire')
  })

  it('dit le repli quand aucune archive ne porte le numéro du fichier', () => {
    // 91230 (0.9.12.3) n'est dans aucune archive : la base se replie sur 91231, et ce
    // repli doit être dit au pilote, pas masqué.
    const suggestion = suggestTier(db, documentOf(BACKUP_2025))
    expect(suggestion.version).toEqual({ code: 91230, name: '0.9.12.3' })
    expect(suggestion.basis).toBe('approximated')
    expect(suggestion.approximatedFrom).toBe(91231)
    expect(suggestion.candidateTiers).toEqual([15, 16, 17])
    expect(suggestion.selected).toBe(17)
    expect(suggestion.message).toContain('91231')
    expect(suggestion.message).toContain('ce n’est pas la même version')
  })

  it('ne présélectionne rien quand le fichier ne déclare pas sa version', () => {
    const suggestion = suggestTier(db, parseJson('{"layout":{}}'))
    expect(suggestion.basis).toBe('undeclared')
    expect(suggestion.selected).toBeNull()
    expect(suggestion.candidateTiers).toEqual([])
    expect(suggestion.message).toContain('ne dit pas de quelle version')
  })

  it('ne devine pas une version pour un numéro inconnu de la base', () => {
    const suggestion = suggestTier(db, parseJson('{"info":{"versionCode":100400}}'))
    expect(suggestion.basis).toBe('unrecognized')
    expect(suggestion.selected).toBeNull()
    expect(suggestion.message).toContain('postérieur')
    expect(suggestion.message).toContain('inventer')
  })

  it('lit la version du document sans exiger d’exportType', () => {
    // L'`info` de 2022 ne porte pas d'`exportType` : ce n'est pas une raison de ne pas
    // lire son `versionCode`.
    expect(readDocumentVersion(documentOf(GSON_2022)).code).toBe(90615)
  })
})

/* ------------------------------------------- les trois natures d'écart, distinguées */

/**
 * Une base minuscule fabriquée à la main : la vraie ne porte aujourd'hui aucune clé
 * `blind`, et le cas doit tout de même être éprouvé — le jour où elle en portera une,
 * elle ne devra pas être présentée comme supprimable.
 */
function fakeDatabase(): VersionDatabase {
  const schema: VersionSchema = {
    tierCount: 3,
    widgets: {
      WFake: { '0-2': ['kept'], '0-1': ['old'], '2': ['fresh', 'hole'], '0': ['hole'] },
      WGone: { '0-1': ['kept'] }
    },
    widgetTiers: { WFake: '0-2', WGone: '0-1' },
    attested: {
      WFake: {
        gapKey: { gap: '0' },
        legacyKey: { legacy: '2' },
        blindKey: { blind: '0-2' }
      }
    },
    blind: { WFake: ['blindKey'] },
    controls: {}
  }
  const index: VersionIndex = {
    meta: {
      generatedBy: 'test', versionCount: 3, tierCount: 3, failureCount: 0,
      oldest: null, newest: null
    },
    versions: [
      { code: 1, name: 'a', names: ['a'], sources: [], tier: 0, release: true },
      { code: 2, name: 'b', names: ['b'], sources: [], tier: 1, release: false },
      { code: 3, name: 'c', names: ['c'], sources: [], tier: 2, release: true }
    ],
    tiers: [0, 1, 2].map((tier) => ({
      tier,
      firstCode: tier + 1,
      firstName: `v${tier}`,
      lastCode: tier + 1,
      lastName: `v${tier}`,
      versionCodes: [tier + 1],
      releaseNames: tier === 1 ? [] : [`v${tier}`],
      widgetCount: 1,
      pairCount: 1,
      widgetsAdded: [],
      widgetsRemoved: [],
      keysAdded: {},
      keysRemoved: {}
    })),
    failures: [],
    versionCodeConflicts: [],
    corpus: []
  }
  return new VersionDatabase(index, schema)
}

describe('les trois natures d’écart ne se confondent pas', () => {
  const fake = fakeDatabase()

  function category(key: string, tier: number): FindingCategory | null {
    return categoryOf(fake, 'WFake', key, tier, fake.keyStatus('WFake', key, tier))
  }

  it('« gap » est un trou de notre relevé : jamais supprimable', () => {
    expect(fake.keyStatus('WFake', 'gapKey', 0)).toBe('attested')
    expect(category('gapKey', 0)).toBe('gap')
    expect(CATEGORIES.gap.removal).toBe('never')
    expect(CATEGORIES.gap.badge).toBe('trou de relevé')
    expect(CATEGORIES.gap.verdict).toContain('Ne jamais supprimer')
  })

  it('« legacy » est un reliquat conservé par XCTrack : une suppression s’y défend', () => {
    expect(fake.keyStatus('WFake', 'legacyKey', 2)).toBe('legacy')
    expect(category('legacyKey', 2)).toBe('legacy')
    expect(CATEGORIES.legacy.removal).toBe('defensible')
    expect(CATEGORIES.legacy.badge).toBe('reliquat')
  })

  it('« blind » ne conclut rien : notre relevé est aveugle de bout en bout', () => {
    for (const tier of [0, 1, 2]) {
      expect(fake.keyStatus('WFake', 'blindKey', tier)).toBe('blind')
      expect(category('blindKey', tier)).toBe('blind')
    }
    expect(CATEGORIES.blind.removal).toBe('undecided')
    expect(CATEGORIES.blind.badge).toBe('aveugle')
    expect(CATEGORIES.blind.verdict).toContain('Rien à conclure')
  })

  it('éclate « absent » selon l’endroit où le relevé lit la clé', () => {
    expect(category('old', 2)).toBe('past-only') // lue avant seulement
    expect(category('fresh', 0)).toBe('future-only') // lue après seulement
    expect(category('hole', 1)).toBe('straddled') // lue avant ET après
    expect(category('jamaisVue', 2)).toBe('never-read') // lue nulle part
  })

  it('n’autorise une suppression que sur ce qui est lu avant le palier visé', () => {
    const defensible = Object.values(CATEGORIES)
      .filter((description) => description.removal === 'defensible')
      .map((description) => description.category)
    expect(defensible.sort()).toEqual(['legacy', 'past-only'])
    // Ce qui vient d'APRÈS le palier visé n'est pas un déchet : c'est un réglage d'une
    // version plus récente, que la version visée ignore et qu'une autre retrouvera.
    expect(CATEGORIES['future-only'].removal).toBe('never')
    expect(CATEGORIES['future-only'].verdict).toContain('Ne pas supprimer')
  })

  it('ne conclut rien des clés d’un gadget que le palier ne connaît pas', () => {
    expect(fake.keyStatus('WGone', 'kept', 2)).toBe('unknown')
    expect(categoryOf(fake, 'WGone', 'kept', 2, 'unknown')).toBe('unknown-widget')
    expect(CATEGORIES['unknown-widget'].removal).toBe('undecided')
  })
})

describe('les cinq couples « gap » connus de la vraie base', () => {
  it('sont attestés comme trous du relevé, jamais comme reliquats', () => {
    for (const [widget, key, tiers] of KNOWN_GAPS) {
      for (const tier of tiers) {
        const status = db.keyStatus(widget, key, tier)
        expect(status, `${widget}.${key} au palier ${tier}`).toBe('attested')
        const category = categoryOf(db, widget, key, tier, status)
        expect(category).toBe('gap')
        expect(CATEGORIES[category ?? 'legacy'].removal).toBe('never')
      }
    }
  })

  it('ne sont jamais présentés comme supprimables, quel que soit le palier visé', () => {
    for (const [widget, key] of KNOWN_GAPS) {
      for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
        const status = db.keyStatus(widget, key, tier)
        const category = categoryOf(db, widget, key, tier, status)
        if (category === null) continue // le palier la lit : rien à dire
        expect(
          CATEGORIES[category].removal,
          `${widget}.${key} au palier ${tier} → ${category}`
        ).not.toBe('defensible')
      }
    }
  })
})

/* ------------------------------------------------------- le diagnostic sur le corpus */

describe('diagnostic des fichiers réels', () => {
  it('trouve neuf reliquats dans la sauvegarde 1.0.3 visée sur son propre palier', () => {
    const report = diagnosisOf(BACKUP_2026, 20)
    expect(report.widgetCount).toBe(105)
    expect(report.keyCount).toBe(1059)
    expect(report.recognizedCount).toBe(1050)
    expect(report.counts.legacy).toBe(9)
    expect(report.counts.gap).toBe(0)
    expect(report.counts['past-only']).toBe(0)
    expect(report.counts['future-only']).toBe(0)
    expect(report.widgetFindings).toEqual([])
  })

  it('raisonne par instance : la même clé peut être un reliquat ici et courante ailleurs', () => {
    const report = diagnosisOf(BACKUP_2026, 20)
    const terrain = report.keyFindings.filter((f) => f.key === 'mapWidget_showTerrain')
    expect(terrain.length).toBeGreaterThan(0)
    const carriers = new Set(terrain.map((f) => `${f.place.orientation}/${f.place.page}`))
    // Deux cartes le portent, trois ne le portent pas : le constat est attaché à
    // l'instance, jamais au type.
    const allMaps = report.keyFindings.filter((f) => f.place.shortName === 'WCompMap')
    expect(carriers.size).toBeLessThanOrEqual(allMaps.length)
    expect(terrain.every((f) => f.category === 'legacy')).toBe(true)
  })

  it('distingue gap et legacy sur les MÊMES données, selon le palier visé', () => {
    // Même fichier, deux paliers : au palier 5 les `fontSize` des cartes sont un trou de
    // notre relevé (jamais supprimables), au palier 20 d'autres clés sont des reliquats.
    const old = diagnosisOf(BACKUP_2026, 5)
    expect(old.counts.gap).toBe(9)
    expect(old.counts.legacy).toBe(0)
    const gapKeys = new Set(old.keyFindings.filter((f) => f.category === 'gap').map((f) => f.key))
    expect([...gapKeys]).toEqual(['fontSize'])

    const now = diagnosisOf(BACKUP_2026, 20)
    expect(now.counts.legacy).toBe(9)
    expect(now.counts.gap).toBe(0)
  })

  it('compte comme « postérieurs » les réglages que le palier ancien ne connaît pas encore', () => {
    const report = diagnosisOf(BACKUP_2026, 5)
    expect(report.counts['future-only']).toBe(109)
    expect(report.counts['past-only']).toBe(0)
    expect(report.counts['never-read']).toBe(0)
    // Ils ne sont pas supprimables : le fichier vient d'une version plus récente.
    expect(CATEGORIES['future-only'].removal).toBe('never')
  })

  it('donne le même résultat sous les trois paliers que 0.9.12.3 peut désigner', () => {
    for (const tier of [15, 16, 17]) {
      const report = diagnosisOf(BACKUP_2025, tier, [15, 16, 17])
      expect(report.widgetCount).toBe(102)
      expect(report.keyCount).toBe(1012)
      expect(report.counts.legacy).toBe(4)
      expect(report.unstableCount, `palier ${tier}`).toBe(0)
    }
  })

  it('situe chaque constat : orientation, page, rang, gadget, clé', () => {
    const report = diagnosisOf(BACKUP_2026, 20)
    const finding = report.keyFindings[0]
    expect(finding).toBeDefined()
    expect(placeLabel(finding!.place)).toMatch(/^(Portrait|Paysage) · page \d+ · rang \d+ · /)
    expect(finding!.key.length).toBeGreaterThan(0)
  })

  it('n’examine ni les clés de position ni le type de gadget', () => {
    const report = diagnosisOf(BACKUP_2026, 2)
    for (const finding of report.keyFindings) {
      expect(['CLASS', 'X1', 'Y1', 'X2', 'Y2']).not.toContain(finding.key)
    }
    // 105 gadgets × 5 clés de structure : les compter produirait 525 constats faux.
    expect(report.keyCount).toBe(1059)
  })

  it('ne trouve rien à redire au fichier de 2022 sur les deux paliers qu’il désigne', () => {
    for (const tier of [0, 1]) {
      const report = diagnosisOf(GSON_2022, tier, [0, 1])
      expect(report.widgetCount).toBe(1)
      expect(report.keyCount).toBe(4)
      expect(report.keyFindings).toEqual([])
      expect(report.widgetFindings).toEqual([])
    }
  })

  it('signale un constat qui changerait sous un autre palier candidat', () => {
    // Visé au palier 20 mais confronté aussi au palier 5, où `fontSize` est un trou de
    // relevé : le constat ne tient pas d'un palier à l'autre, et cela se dit.
    const report = diagnosisOf(BACKUP_2026, 5, [5, 20])
    expect(report.unstableCount).toBeGreaterThan(0)
    const unstable = report.keyFindings.find((finding) => !finding.stable)
    expect(unstable).toBeDefined()
    expect(divergenceSentence(db, unstable!)).toContain('Constat instable')
  })
})

/* ------------------------------------------------------------------------ le panneau */

/** La valeur d'`<option>` d'une version, telle que le menu la fabrique. */
function valueOf(release: string): string {
  const option = versionOptions(db).find((entry) => entry.release === release)
  expect(option, release).toBeDefined()
  return option?.value ?? ''
}

describe('le panneau', () => {
  it('présélectionne la version du fichier et affiche son diagnostic', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    expect(panel.tier()).toBe(20)
    expect(panel.version()?.label).toBe('1.0.3-beta')
    expect(panel.select.value).toBe(valueOf('1.0.3-beta'))
    expect(panel.diagnosis()?.counts.legacy).toBe(9)

    const text = panel.element.textContent ?? ''
    expect(text).toContain('Reliquats')
    expect(text).toContain('mapWidget_showTerrain')
    expect(text).toContain('Une suppression se défend')
    // Le mot du pilote est « gadget », jamais « widget ».
    expect(text).toContain('gadget')
    expect(text).not.toContain('widget ')
  })

  it('ouvre le menu sur la version du fichier, avant toutes les autres', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    const groups = [...panel.select.querySelectorAll('optgroup')]
    expect(groups[0]?.label).toBe('La version qui a écrit ce fichier')
    expect(groups[0]?.textContent).toBe('1.0.3-beta')
    expect(groups.map((group) => group.label)).toEqual([
      'La version qui a écrit ce fichier',
      'Versions publiées, de la plus récente à la plus ancienne',
      'Versions de développement, jamais publiées'
    ])
    // La version de l'appareil ne figure qu'une fois : elle a quitté son groupe d'origine.
    const lines = [...panel.select.querySelectorAll('option')].map((node) => node.textContent)
    expect(lines.filter((line) => line === '1.0.3-beta')).toHaveLength(1)
  })

  it('nomme les versions que le diagnostic ne distingue pas de celle choisie', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    const text = panel.element.textContent ?? ''
    // C'est la contrepartie du menu par version : le pilote reconnaît la sienne, et
    // apprend du même coup que trois autres donneraient exactement le même constat.
    expect(text).toContain('1.0.2-beta, 1.0.1-beta et 1.0.0-RC2')
    expect(text).toContain('exactement les mêmes réglages que 1.0.3-beta')
    expect(text).toContain('vaut pour 4 versions')
  })

  it('ne dit jamais « palier », « schéma » ni « clé » au pilote', async () => {
    for (const path of [BACKUP_2026, BACKUP_2025, GSON_2022]) {
      const panel = await buildVersionPanel({
        document: documentOf(path), database: db, onCleanup: () => undefined
      })
      const text = panel.element.textContent ?? ''
      for (const word of ['palier', 'schéma', 'Schéma', 'clé', 'clés']) {
        expect(text, `${path} — ${word}`).not.toContain(word)
      }
    }
  })

  it('recalcule le diagnostic quand le pilote change de version', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    panel.select.value = valueOf('0.9.8.7') // même inventaire de réglages que 0.9.8.3
    panel.select.dispatchEvent(new Event('change'))
    expect(panel.tier()).toBe(5)
    expect(panel.diagnosis()?.counts.gap).toBe(9)
    const text = panel.element.textContent ?? ''
    expect(text).toContain('trou de relevé')
    expect(text).toContain('Ne jamais supprimer')
    // Le pilote a délibérément visé autre chose que la version du fichier : on le lui
    // rappelle, et on ne confronte plus le constat à la version d'origine — chaque
    // différence attendue deviendrait sinon un « constat instable », c'est-à-dire du bruit.
    expect(text).toContain('Vous visez une autre version que celle-là')
    expect(text).toContain('confronte ce fichier à 0.9.8.7')
    expect(panel.diagnosis()?.unstableCount).toBe(0)
    expect(text).not.toContain('Constat instable')
  })

  it('ne rappelle rien quand la version choisie accepte les mêmes réglages', async () => {
    // 1.0.1-beta n'est pas 1.0.3-beta, mais notre relevé ne les distingue pas : annoncer
    // un changement de cible démentirait la phrase qui vient de dire le contraire.
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    panel.select.value = valueOf('1.0.1-beta')
    panel.select.dispatchEvent(new Event('change'))
    expect(panel.tier()).toBe(20)
    expect(panel.version()?.label).toBe('1.0.1-beta')
    expect(panel.element.textContent).not.toContain('Vous visez une autre version')
    expect(panel.diagnosis()?.counts.legacy).toBe(9)
  })

  it('n’affiche aucun diagnostic tant qu’aucune version n’est choisie', async () => {
    const panel = await buildVersionPanel({
      document: parseJson('{"info":{"versionCode":100400},"layout":{}}'),
      database: db
    })
    expect(panel.tier()).toBeNull()
    expect(panel.version()).toBeNull()
    expect(panel.diagnosis()).toBeNull()
    expect(panel.element.textContent).toContain('Choisissez une version')
  })

  it('présélectionne la construction que le fichier de 2022 déclare', async () => {
    const panel = await buildVersionPanel({ document: documentOf(GSON_2022), database: db })
    // Le nom déclaré désigne la première des deux constructions, pas la plus récente.
    expect(panel.tier()).toBe(0)
    expect(panel.version()?.build).toBe('48-gcb6ffef8')
    const groups = [...panel.select.querySelectorAll('optgroup')].map((g) => g.label)
    expect(groups[0]).toBe('La version qui a écrit ce fichier')
    expect(panel.element.textContent).toContain('le nom que le fichier déclare')
  })

  it('suit un changement de document', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    panel.setDocument(documentOf(BACKUP_2025))
    expect(panel.tier()).toBe(17)
    expect(panel.diagnosis()?.counts.legacy).toBe(4)
    expect(panel.element.textContent).toContain('91231')
    // Le repli porte sur trois constructions de 0.9.12.3 : elles ouvrent le menu.
    const groups = [...panel.select.querySelectorAll('optgroup')].map((g) => g.label)
    expect(groups[0]).toBe('Les versions les plus proches de celle de ce fichier')
    expect(panel.version()?.release).toBe('0.9.12.3')
  })

  it('ne touche jamais au document : il ressort à l’octet près', async () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    const panel = await buildVersionPanel({ document, database: db })
    panel.select.value = valueOf('0.9.7.4-beta')
    panel.select.dispatchEvent(new Event('change'))
    expect(serializeJson(document)).toBe(source)
  })

  it('avertit qu’il ne diagnostique que les gadgets des pages', async () => {
    const panel = await buildVersionPanel({ document: documentOf(BACKUP_2026), database: db })
    const text = panel.element.textContent ?? ''
    expect(text).toContain('la base des versions ne décrit qu’eux')
    expect(text).toContain('vario, unités, capteurs, espaces aériens')
  })
})
