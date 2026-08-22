import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  VersionDatabase,
  loadVersionDatabase,
  type VersionIndex,
  type VersionSchema
} from '../../src/catalog/widgetVersions'
import {
  MigrationTable, type MigrationsFile
} from '../../src/catalog/legacyMigrations'
import { getMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import {
  applyCleanup,
  CLEANABLE_STATUSES,
  planCleanup,
  revertCleanup,
  type CleanupEntry,
  type CleanupPlan
} from '../../src/model/cleanup'
import { readLayout } from '../../src/model/layout'
import { categoryOf, diagnose } from '../../src/ui/versionDiagnostic'
import { makeTranslator } from '../../src/i18n'
import fr from '../../src/i18n/messages/fr'
import {
  BACKUP_2025,
  BACKUP_2026,
  FORMES_PRESERVEES,
  GSON_2022,
  PAGES_2025,
  PAGES_2026
} from '../fixtures/paths'

/**
 * Le nettoyage : ce qui part, ce qui ne part **jamais**, et ce que le fichier devient.
 *
 * Trois familles, dans cet ordre :
 *
 * 1. le plan sur les fichiers réels — statuts, chemins, comptes ;
 * 2. la garantie qui gouverne tout le chantier : un `gap` ou un `blind` n'entre jamais
 *    dans un plan, fût-il majoritaire ;
 * 3. la fidélité — un réglage retiré, et rien d'autre ; remis, le fichier ressort à
 *    l'octet près.
 */
const db = await loadVersionDatabase()

/** `diagnose` nomme la version visée : il lui faut un traducteur, comme à tout écran. */
const tr = makeTranslator('fr', fr)

function documentOf(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

function planOf(path: string, tier: number): CleanupPlan {
  return planCleanup(db, readLayout(documentOf(path)), tier)
}

/** L'identité d'un constat, commune au diagnostic et au plan. */
function markOf(entry: CleanupEntry): string {
  return `${entry.orientation}/${entry.pageRank}/${entry.widgetRank}/${entry.key}`
}

/* ------------------------------------------------------------- le plan, sur le corpus */

describe('le plan sur les fichiers réels', () => {
  it('trouve les neuf reliquats de la sauvegarde 1.0.3, et n’en propose que six', () => {
    const plan = planOf(BACKUP_2026, 20)
    expect(plan.entries.length + plan.held.length).toBe(9)
    expect(plan.entries).toHaveLength(6)
    expect(plan.widgetCount).toBe(4)
    expect(plan.examinedCount).toBe(1059)
    // Rien de reconnu comme reliquat n'a dû être retenu faute d'explication.
    expect(plan.withheldCount).toBe(0)
  })

  it('laisse en place les trois dont le retrait changerait l’instrument', () => {
    const plan = planOf(BACKUP_2026, 20)
    expect(plan.held.map((entry) => `${entry.key}=${entry.removal.verdict}`)).toEqual([
      'mapWidget_showTerrain=live',
      'mapWidget_showTerrain=live',
      'showWind=live'
    ])
    // Et l'écran a de quoi le dire : le réglage d'aujourd'hui, avec et sans.
    const wind = plan.held[2]
    expect(wind?.removal.successor).toBe('windStyle')
    expect(wind?.removal.present).toBe('ARROW')
    expect(wind?.removal.absent).toBe('NONE')
    const terrain = plan.held[0]
    expect(terrain?.removal.successor).toBe('mapWidget_mapAppearance.terrain')
    expect(terrain?.removal.present).toBe('Light')
    expect(terrain?.removal.absent).toBe('None')
  })

  it('ne propose que des retraits mesurés sans effet, jamais un « on suppose »', () => {
    for (const path of [BACKUP_2026, BACKUP_2025, PAGES_2026, PAGES_2025, GSON_2022]) {
      const layout = readLayout(documentOf(path))
      for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
        const plan = planCleanup(db, layout, tier)
        for (const entry of plan.entries) {
          expect(entry.removal.verdict, `${path} palier ${tier} — ${entry.path}`)
            .toBe('inert')
          // Sans effet veut dire : l'appareil écrit la même chose avec et sans.
          expect(entry.removal.present, entry.path).toBe(entry.removal.absent)
        }
        for (const entry of plan.held) {
          expect(entry.removal.verdict, entry.path).not.toBe('inert')
        }
      }
    }
  })

  it('désigne chaque réglage par son chemin dans le document', () => {
    const plan = planOf(BACKUP_2026, 20)
    expect(plan.entries.map((entry) => entry.path)).toEqual([
      'layout/portrait/0/widgets/0/mapWidget_showOpenStreet',
      'layout/portrait/0/widgets/0/nav_use_brackets',
      'layout/portrait/1/widgets/0/mapWidget_showOpenStreet',
      'layout/portrait/1/widgets/0/nav_use_brackets',
      'layout/portrait/2/widgets/0/nav_use_brackets',
      'layout/portrait/2/widgets/6/newWindArrow'
    ])
    expect(plan.held.map((entry) => entry.path)).toEqual([
      'layout/portrait/0/widgets/0/mapWidget_showTerrain',
      'layout/portrait/1/widgets/0/mapWidget_showTerrain',
      'layout/portrait/2/widgets/6/showWind'
    ])
  })

  it('le chemin mène au gadget porteur, et le gadget porte bien la clé', () => {
    const document = documentOf(BACKUP_2026)
    const plan = planCleanup(db, readLayout(document), 20)
    for (const entry of plan.entries) {
      const steps = entry.path.split('/')
      let node: JsonNode | undefined = document
      // Le dernier pas est la clé elle-même ; les précédents mènent au gadget.
      for (const step of steps.slice(0, -1)) {
        node = /^\d+$/.test(step)
          ? (node?.kind === 'array' ? node.items[Number(step)] : undefined)
          : (node === undefined ? undefined : getMember(node, step))
      }
      expect(node, entry.path).toBe(entry.node)
      expect(getMember(entry.node, entry.key), entry.path).toBeDefined()
    }
  })

  it('dit depuis quelle version chaque réglage n’est plus lu', () => {
    const plan = planOf(BACKUP_2026, 20)
    for (const entry of plan.entries) {
      expect(entry.lastReadTier, entry.path).toBeLessThan(plan.tier)
      expect(entry.droppedAtTier).toBe(entry.lastReadTier + 1)
    }
    const terrain = plan.held.filter((entry) => entry.key === 'mapWidget_showTerrain')
    // Lu jusqu'au palier 12, plus après : le reliquat traîne depuis huit paliers.
    expect(terrain.map((entry) => entry.lastReadTier)).toEqual([12, 12])
    expect(terrain.map((entry) => entry.shortName)).toEqual(['WXCAssistant', 'WCompMap'])
  })

  it('raisonne par instance : deux gadgets du même type n’ont pas le même sort', () => {
    const document = documentOf(BACKUP_2026)
    const layout = readLayout(document)
    const touched = new Set(planCleanup(db, layout, 20).entries.map((entry) => entry.node))
    const compasses = [...layout.landscape, ...layout.portrait]
      .flatMap((page) => page.widgets)
      .filter((widget) => widget.shortName === 'WCompass')
    // Plusieurs boussoles, une seule porte le reliquat : les autres ont été refaites
    // depuis que `showWind` a cédé la place. Le constat tient à l'instance, pas au type.
    expect(compasses.length).toBeGreaterThan(1)
    const concerned = compasses.filter((widget) => touched.has(widget.node))
    expect(concerned).toHaveLength(1)
  })

  it('trouve les quatre reliquats de la sauvegarde 0.9.12.3, et n’en propose aucun', () => {
    // Les mesures d'aller-retour ont été prises sur 1.0.3-beta, palier 20, et sur elle
    // seule. Visés sur 15, 16 ou 17, les quatre reliquats sont reconnus, nommés, et
    // laissés en place : deux parce que leur retrait éteint l'ombrage du relief, deux
    // parce que personne n'a mesuré ce qu'il ferait à ces paliers-là.
    for (const tier of [15, 16, 17]) {
      const plan = planOf(BACKUP_2025, tier)
      expect(plan.entries, `palier ${tier}`).toEqual([])
      expect(plan.held.map((entry) => entry.removal.verdict), `palier ${tier}`)
        .toEqual(['unmeasured', 'live', 'unmeasured', 'live'])
    }
  })

  it('ne trouve rien à enlever à un fichier visé sur une version antérieure à lui', () => {
    // Au palier 5, les écarts de la sauvegarde 1.0.3 sont des réglages APPARUS depuis :
    // rien à enlever, et surtout pas ce qu'une version plus récente retrouvera.
    const plan = planOf(BACKUP_2026, 5)
    expect(plan.entries).toEqual([])
  })

  it('ne trouve rien à enlever au fichier de 2022, qu’aucun reliquat n’encombre', () => {
    for (const tier of [0, 1]) {
      expect(planOf(GSON_2022, tier).entries).toEqual([])
    }
  })

  it('ne propose rien sur un palier inconnu de la base', () => {
    expect(planOf(BACKUP_2026, 99).entries).toEqual([])
    expect(planOf(BACKUP_2026, -1).entries).toEqual([])
  })

  it('ne touche pas au document : établir un plan est une lecture', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    planCleanup(db, readLayout(document), 20)
    expect(serializeJson(document)).toBe(source)
  })
})

/* ------------------------------------------ la garantie : ni « gap » ni « blind », jamais */

/**
 * Une base fabriquée où **le supprimable est ultra-minoritaire** : un seul reliquat pour
 * neuf trous de relevé et neuf clés aveugles. C'est le cas qui compte — un plan qui
 * dériverait vers « tout ce qui n'est pas reconnu » emporterait ici dix-neuf réglages au
 * lieu d'un, et le pilote ne verrait la différence qu'en vol.
 */
function crowdedDatabase(): VersionDatabase {
  const gapKeys = Array.from({ length: 9 }, (_, i) => `gap${i}`)
  const blindKeys = Array.from({ length: 9 }, (_, i) => `blind${i}`)
  const attested: Record<string, Record<string, Record<string, string>>> = { WFake: {} }
  for (const key of gapKeys) attested.WFake![key] = { gap: '1' }
  for (const key of blindKeys) attested.WFake![key] = { blind: '0-2' }
  attested.WFake!.legacyKey = { legacy: '1-2' }

  const schema: VersionSchema = {
    tierCount: 3,
    widgets: {
      // `legacyKey` n'est lue qu'au palier 0 : au palier 2 elle traîne depuis deux paliers.
      // Les `gap*` ne sont lues qu'au palier 2 — postérieur, donc un trou de notre relevé.
      WFake: { '0': ['legacyKey', 'kept'], '0-2': ['kept'], '2': gapKeys },
      WOrphan: { '0-2': ['kept'] }
    },
    widgetTiers: { WFake: '0-2', WOrphan: '0-2' },
    attested: attested as VersionSchema['attested'],
    blind: { WFake: blindKeys },
    controls: {}
  }
  const index: VersionIndex = {
    meta: {
      generatedBy: 'test', versionCount: 3, tierCount: 3, failureCount: 0,
      oldest: null, newest: null
    },
    versions: [0, 1, 2].map((tier) => ({
      code: tier + 1, name: `v${tier}`, names: [`v${tier}`], sources: [], tier, release: true
    })),
    tiers: [0, 1, 2].map((tier) => ({
      tier,
      firstCode: tier + 1,
      firstName: `v${tier}`,
      lastCode: tier + 1,
      lastName: `v${tier}`,
      versionCodes: [tier + 1],
      releaseNames: [`v${tier}`],
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

/** Un gadget portant les dix-neuf réglages, plus les cinq clés de structure. */
function crowdedDocument(): JsonNode {
  const keys = [
    ...Array.from({ length: 9 }, (_, i) => `"gap${i}": ${i}`),
    ...Array.from({ length: 9 }, (_, i) => `"blind${i}": ${i}`),
    '"legacyKey": true',
    '"kept": 1'
  ]
  return parseJson(`{
  "layout": {
    "landscape": [
      {
        "CLASS": "org.xcontest.XCTrack.widget.wp.WPEmpty",
        "widgets": [
          {
            "CLASS": "org.xcontest.XCTrack.widget.w.WFake",
            "X1": 0,
            "Y1": 0,
            "X2": 10000,
            "Y2": 10000,
            ${keys.join(',\n            ')}
          }
        ]
      }
    ],
    "portrait": []
  }
}`)
}

/**
 * Un relevé d'aller-retour **de laboratoire**, pour les tests qui n'éprouvent pas le
 * relevé mais la fidélité du retrait : sur des clés inventées, l'appareil n'a évidemment
 * rien mesuré, et sans cela `planCleanup` ne proposerait plus rien. Chaque entrée déclare
 * la même valeur avec et sans — c'est la définition même de « sans effet ».
 */
function laboratory(cases: Record<string, { widgets: string[]; values: string[] }>): MigrationTable {
  const migrations: MigrationsFile['migrations'] = {}
  for (const [key, { widgets, values }] of Object.entries(cases)) {
    const measured: Record<string, { present: string; absent: string; verdict: 'inert' }> = {}
    for (const value of values) measured[value] = { present: 'x', absent: 'x', verdict: 'inert' }
    migrations[key] = {
      successor: `${key}_moderne`, widgets, measure: 'laboratoire', values: measured
    }
  }
  return new MigrationTable({
    _source: 'laboratoire',
    _methode: 'laboratoire',
    _limite: 'laboratoire',
    _measuredTiers: '0-9',
    _measuredVersionCode: 0,
    _measuredVersionName: 'laboratoire',
    migrations
  })
}

/** Les deux reliquats de `formes-preservees.xcfg`, déclarés sans effet. */
const SHAPES_LAB = laboratory({
  _decimale_nulle: { widgets: ['WFreeText'], values: ['3.0'] },
  _clef_doublee: { widgets: ['WFreeText'], values: ['2'] }
})

/** Le seul reliquat de la base encombrée, déclaré sans effet. */
const CROWDED_LAB = laboratory({ legacyKey: { widgets: ['WFake'], values: ['true'] } })

describe('un « gap » ou un « blind » n’entre jamais dans un plan', () => {
  const crowded = crowdedDatabase()

  it('n’emporte qu’un réglage là où dix-neuf ne sont pas reconnus', () => {
    const document = crowdedDocument()
    const plan = planCleanup(crowded, readLayout(document), 2, CROWDED_LAB)
    expect(plan.examinedCount).toBe(20)
    expect(plan.entries.map((entry) => entry.key)).toEqual(['legacyKey'])
  })

  it('ne retient rien du tout quand le seul reliquat n’est pas du palier visé', () => {
    // Au palier 0, `legacyKey` est encore lue : elle n'est pas un reliquat, elle sert.
    const document = crowdedDocument()
    const plan = planCleanup(crowded, readLayout(document), 0, CROWDED_LAB)
    expect(plan.entries).toEqual([])
  })

  it('retient un reliquat que le relevé ne sait pas dater, et le compte', () => {
    // Même base, mais le relevé ne lit `legacyKey` nulle part : elle est déclarée
    // reliquat sans qu'on puisse dire depuis quand. On ne supprime pas ce qu'on ne sait
    // pas expliquer — et le refus se compte au lieu de disparaître.
    const schema = crowded.schema
    const undatable: VersionSchema = {
      ...schema,
      widgets: { ...schema.widgets, WFake: { '0-2': ['kept'], '2': [] } }
    }
    const blinded = new VersionDatabase(crowded.index, undatable)
    const document = crowdedDocument()
    const plan = planCleanup(blinded, readLayout(document), 2, CROWDED_LAB)
    expect(plan.entries).toEqual([])
    expect(plan.withheldCount).toBe(1)
  })

  it('sur tout le corpus et tous les paliers, le plan est inclus dans les reliquats', () => {
    const files = [BACKUP_2026, BACKUP_2025, PAGES_2026, PAGES_2025, GSON_2022]
    let planned = 0
    let gaps = 0
    for (const path of files) {
      const document = documentOf(path)
      const layout = readLayout(document)
      for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
        const report = diagnose(db, layout, { tier, tr })
        const legacy = new Set(
          report.keyFindings
            .filter((finding) => finding.category === 'legacy')
            .map((finding) =>
              `${finding.place.orientation}/${finding.place.page}/${finding.place.rank}/${finding.key}`)
        )
        gaps += report.counts.gap + report.counts.blind
        for (const entry of planCleanup(db, layout, tier).entries) {
          planned += 1
          expect(legacy.has(markOf(entry)), `${path} palier ${tier} — ${entry.path}`).toBe(true)
        }
      }
    }
    // Le balayage a bien rencontré les deux : sans cela il ne prouverait rien.
    expect(planned).toBeGreaterThan(0)
    expect(gaps).toBeGreaterThan(0)
  })

  it('ne propose jamais une clé que le diagnostic dit interdite de suppression', () => {
    const document = documentOf(BACKUP_2026)
    const layout = readLayout(document)
    for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
      for (const entry of planCleanup(db, layout, tier).entries) {
        const status = db.keyStatus(entry.shortName, entry.key, tier)
        expect(status).toBe('legacy')
        expect(categoryOf(db, entry.shortName, entry.key, tier, status)).toBe('legacy')
      }
    }
  })
})

/* -------------------------------------------------------------- retirer, et remettre */

/**
 * Une base fabriquée pour `formes-preservees.xcfg` — le fichier qui porte `3.0`, `1.0E7`,
 * `-0.0`, un entier au-delà de 2^53 et **deux clés de même nom**. Deux de ses réglages y
 * sont déclarés reliquats ; tout le reste doit ressortir intact.
 */
function shapesDatabase(): VersionDatabase {
  const schema: VersionSchema = {
    tierCount: 2,
    widgets: {
      WFreeText: { '0': ['_decimale_nulle', '_clef_doublee'], '0-1': ['text', 'titletext'] },
      WButtonPhone: { '0-1': ['contact', 'callType'] },
      WAltitude: { '0-1': ['titletext'] },
      WSpeed: { '0-1': ['titletext'] }
    },
    widgetTiers: {
      WFreeText: '0-1', WButtonPhone: '0-1', WAltitude: '0-1', WSpeed: '0-1'
    },
    attested: {
      WFreeText: { _decimale_nulle: { legacy: '1' }, _clef_doublee: { legacy: '1' } }
    },
    blind: {},
    controls: {}
  }
  const index: VersionIndex = {
    meta: {
      generatedBy: 'test', versionCount: 2, tierCount: 2, failureCount: 0,
      oldest: null, newest: null
    },
    versions: [0, 1].map((tier) => ({
      code: tier + 1, name: `v${tier}`, names: [`v${tier}`], sources: [], tier, release: true
    })),
    tiers: [0, 1].map((tier) => ({
      tier,
      firstCode: tier + 1,
      firstName: `v${tier}`,
      lastCode: tier + 1,
      lastName: `v${tier}`,
      versionCodes: [tier + 1],
      releaseNames: [`v${tier}`],
      widgetCount: 4,
      pairCount: 4,
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

/**
 * Les lignes du texte nettoyé sont-elles, dans l'ordre, celles du texte d'origine — les
 * lignes des réglages retirés exceptées ?
 *
 * La virgule de fin est ôtée de part et d'autre avant la comparaison : retirer la
 * dernière clé d'un objet ôte la virgule de la ligne précédente, et c'est une
 * conséquence de la grammaire JSON, pas une réécriture de la valeur.
 */
function removedLines(before: string, after: string, keys: string[]): string[] {
  const strip = (line: string): string => line.replace(/,$/, '')
  const originals = before.split('\n')
  const cleaned = after.split('\n')
  const dropped: string[] = []
  let index = 0
  for (const line of cleaned) {
    while (index < originals.length && strip(originals[index] ?? '') !== strip(line)) {
      dropped.push(originals[index] ?? '')
      index += 1
    }
    expect(index, `ligne introuvable dans l’original : ${line}`).toBeLessThan(originals.length)
    index += 1
  }
  dropped.push(...originals.slice(index))
  for (const line of dropped) {
    expect(keys.some((key) => line.includes(`"${key}":`)), `ligne perdue : ${line}`).toBe(true)
  }
  return dropped
}

describe('appliquer un plan', () => {
  it('retire les six réglages proposés et rien d’autre, à la ligne près', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    const plan = planCleanup(db, readLayout(document), 20)
    const outcome = applyCleanup(plan)

    expect(outcome.keyCount).toBe(6)
    expect(outcome.occurrenceCount).toBe(6)
    expect(outcome.widgetCount).toBe(4)
    expect(outcome.stale).toEqual([])

    const keys = [...new Set(plan.entries.map((entry) => entry.key))]
    expect(removedLines(source, serializeJson(document), keys)).toHaveLength(6)
    // Les trois laissés en place n'ont pas bougé d'une ligne.
    const after = serializeJson(document)
    expect(after).toContain('"showWind": true')
    expect(after.match(/"mapWidget_showTerrain": true/g)).toHaveLength(2)
  })

  it('remet tout : le fichier ressort à l’octet près', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    const outcome = applyCleanup(planCleanup(db, readLayout(document), 20))
    expect(serializeJson(document)).not.toBe(source)
    expect(revertCleanup(outcome)).toBe(6)
    expect(serializeJson(document)).toBe(source)
  })

  it('laisse intacts 3.0, 1.0E7, -0.0 et l’entier au-delà de 2^53', () => {
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    const plan = planCleanup(shapesDatabase(), readLayout(document), 1, SHAPES_LAB)
    expect(plan.entries.map((entry) => entry.key)).toEqual(['_decimale_nulle', '_clef_doublee'])

    const outcome = applyCleanup(plan)
    const after = serializeJson(document)
    expect(after).toContain('"_exposant_kotlin": 1.0E7')
    expect(after).toContain('"_zero_negatif": -0.0')
    expect(after).toContain('"_entier_au_dela_de_2_53": 9007199254740993')
    expect(after).toContain('"Sensors.AcousticVario.BueeLimit": 3.0')
    expect(after).not.toContain('"_decimale_nulle"')
    expect(removedLines(source, after, ['_decimale_nulle', '_clef_doublee'])).toHaveLength(3)

    revertCleanup(outcome)
    expect(serializeJson(document)).toBe(source)
  })

  it('emporte les DEUX occurrences d’une clé doublée, et les remet à leur rang', () => {
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    const plan = planCleanup(shapesDatabase(), readLayout(document), 1, SHAPES_LAB)
    const doubled = plan.entries.find((entry) => entry.key === '_clef_doublee')
    expect(doubled?.occurrences).toBe(2)

    const outcome = applyCleanup(plan)
    expect(outcome.keyCount).toBe(2)
    // Deux réglages retirés, trois lignes : la clé doublée en occupait deux.
    expect(outcome.occurrenceCount).toBe(3)
    expect(serializeJson(document)).not.toContain('_clef_doublee')

    revertCleanup(outcome)
    // Remises à leur rang, dans leur ordre, avec leurs valeurs distinctes.
    expect(serializeJson(document)).toBe(source)
  })

  it('n’enlève que ce qui est retenu', () => {
    const document = documentOf(BACKUP_2026)
    const plan = planCleanup(db, readLayout(document), 20)
    const kept = plan.entries.filter((entry) => entry.key === 'nav_use_brackets')
    const selected = new Set(
      plan.entries.filter((entry) => entry.key !== 'nav_use_brackets').map((entry) => entry.path)
    )
    const outcome = applyCleanup(plan, selected)
    expect(outcome.keyCount).toBe(3)
    for (const entry of kept) {
      expect(getMember(entry.node, entry.key), entry.path).toBeDefined()
    }
  })

  it('ne retire rien deux fois : un plan rejoué tombe entièrement en « périmé »', () => {
    const document = documentOf(BACKUP_2026)
    const plan = planCleanup(db, readLayout(document), 20)
    applyCleanup(plan)
    const again = applyCleanup(plan)
    expect(again.keyCount).toBe(0)
    expect(again.stale).toHaveLength(6)
  })

  it('n’agit pas sur un document que le plan ne décrit plus', () => {
    // Le plan est bâti sur un arbre, appliqué sur un autre : ses nœuds sont orphelins.
    const planned = documentOf(BACKUP_2026)
    const plan = planCleanup(db, readLayout(planned), 20)
    const source = readFileSync(BACKUP_2026, 'utf8')
    const other = parseJson(source)
    applyCleanup(plan)
    expect(serializeJson(other)).toBe(source)
  })

  it('un plan vide ne fait rien, et le dit sans rien affirmer d’autre', () => {
    const source = readFileSync(GSON_2022, 'utf8')
    const document = parseJson(source)
    const outcome = applyCleanup(planCleanup(db, readLayout(document), 1))
    expect(outcome.keyCount).toBe(0)
    expect(outcome.widgetCount).toBe(0)
    expect(serializeJson(document)).toBe(source)
  })
})

/* ------------------------------------------- la consigne écrite dit-elle ce que le code fait ? */

/**
 * # La règle de sûreté, comparée à ce que trois fichiers en disent
 *
 * **Constat reproduit** : le 22 août, trois modules donnaient trois règles différentes sur
 * ce qu'un nettoyage a le droit d'effacer, et la plus ancienne était l'**inverse exact**
 * de ce que le code fait.
 *
 * | | ce qui était écrit |
 * |---|---|
 * | `widgetVersions.ts:37` | « …que sur `'absent'` » |
 * | `widgetVersions.ts:322` | « seul `'absent'` autorise… » |
 * | `preferenceVersions.ts:61` | « …que sur `'legacy'` et `'absent'` » |
 * | `cleanup.ts:129` | `keyStatus() !== 'legacy'` → on passe |
 *
 * Le seul outil de nettoyage du dépôt ne supprime que `'legacy'` et **refuse explicitement
 * `'absent'`** (`cleanup.ts:37`). Suivie à la lettre, la consigne du catalogue ferait
 * effacer des réglages valides — le risque que `cleanup.ts` classe lui-même comme le plus
 * lourd des deux, parce qu'un pilote le découvre en l'air.
 *
 * **Aucun test ne pouvait le voir** : les autres tests de ce fichier prouvent
 * remarquablement ce que le code *fait*, et une phrase fausse à côté n'en dérange aucun.
 * C'est le même angle mort que `tests/docs/` ferme pour les cinq README : une affirmation
 * de prose vieillit exactement comme une autre. Celui-ci le ferme pour la seule consigne
 * du dépôt dont l'inversion coûte un réglage de vol.
 */
describe('la consigne de sûreté écrite dans le code', () => {
  const RACINE = `${dirname(fileURLToPath(import.meta.url))}/../../src/`

  /** Les trois fichiers qui énoncent la règle. Aucun n'a le droit d'en dire une autre. */
  const PORTEURS = [
    'model/cleanup.ts',
    'catalog/widgetVersions.ts',
    'catalog/preferenceVersions.ts'
  ]

  /**
   * La phrase est cherchée sur le texte **déplié** : les docblocks la coupent en deux
   * lignes au gré de la largeur, et un test qui ne lirait qu'une ligne à la fois raterait
   * exactement les occurrences que celui-ci existe pour attraper.
   */
  function deplie(chemin: string): string {
    return readFileSync(RACINE + chemin, 'utf8')
      .replace(/^\s*\*\s?/gm, ' ')
      .replace(/\s+/g, ' ')
  }

  const FORMULE = /proposer une suppression que sur ((?:`'[a-z]+'`(?:\s*(?:et|,)\s*)?)+)/g

  it('est la même dans les trois fichiers, et c’est celle que `planCleanup` applique', () => {
    const attendu = [...CLEANABLE_STATUSES].sort().join(', ')
    let trouvees = 0

    for (const chemin of PORTEURS) {
      const texte = deplie(chemin)
      const occurrences = [...texte.matchAll(FORMULE)]
      // Un fichier qui cesse de porter la formule sort du contrôle sans que rien ne le
      // dise : c'est le défaut des boucles à vide, et il se ferme ici.
      expect(occurrences.length, `${chemin} — la formule a disparu`).toBeGreaterThan(0)

      for (const occurrence of occurrences) {
        const cites = [...occurrence[1]!.matchAll(/`'([a-z]+)'`/g)].map((m) => m[1]!)
        expect(cites.sort().join(', '), `${chemin} — « ${occurrence[0]} »`).toBe(attendu)
        trouvees += 1
      }
    }
    expect(trouvees).toBeGreaterThanOrEqual(PORTEURS.length)
  })

  it('et `planCleanup` ne retient bien que ces statuts-là, sur tout le corpus', () => {
    // La contrepartie : la formule pourrait être juste et le code avoir dérivé. Les deux
    // sens sont tenus, et c'est le seul moyen que la comparaison ci-dessus veuille dire
    // quelque chose.
    expect([...CLEANABLE_STATUSES]).toEqual(['legacy'])
    let planifies = 0
    for (const chemin of [BACKUP_2026, BACKUP_2025, PAGES_2026, PAGES_2025, GSON_2022]) {
      const layout = readLayout(documentOf(chemin))
      for (let tier = 0; tier < db.schema.tierCount; tier += 1) {
        for (const entry of planCleanup(db, layout, tier).entries) {
          expect(CLEANABLE_STATUSES as readonly string[], `${chemin} — ${entry.path}`)
            .toContain(db.keyStatus(entry.shortName, entry.key, tier))
          planifies += 1
        }
      }
    }
    expect(planifies).toBeGreaterThan(0)
  })
})
