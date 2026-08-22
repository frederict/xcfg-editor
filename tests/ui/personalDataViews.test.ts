import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { openContainer } from '../../src/core/container'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import { collectPersonalData } from '../../src/model/personalData'
import { describeContainer } from '../../src/library/identity'
import { loadPreferenceCatalog } from '../../src/catalog/preferenceCatalog'
import { buildPreferenceInventory } from '../../src/ui/preferencesPage'
import { personalDataCount } from '../../src/ui/libraryPanel'
import { planSharing } from '../../src/ui/sharingDialog'
import { computeWarnings, warningsAt, REFERENCE_VERSION_CODE } from '../../src/ui/warnings'
import { BACKUP_2026, FORMES_PRESERVEES, PAGES_2026 } from '../fixtures/paths'
import { loadTranslator } from '../../src/i18n'

/**
 * **Les quatre écrans, sur le même fichier.**
 *
 * Avant `model/personalData.ts`, chacun répondait à « qu'y a-t-il de personnel dans ce
 * fichier ? » avec sa propre liste de clés : la page des réglages en croisait 44 avec le
 * fichier, la bibliothèque en connaissait quatre familles, la boîte de partage comptait
 * les textes des gadgets, l'avertissement d'export suivait une heuristique à lui. Chacun
 * était juste dans son périmètre, et aucun ne disait qu'il ne comptait pas la même chose
 * que le voisin.
 *
 * Ce fichier de tests est la preuve que ce n'est plus le cas. Il ne réclame **pas** un
 * chiffre unique — ce serait faux, les écrans comptent légitimement des choses
 * différentes. Il exige que chaque chiffre affiché soit une **projection nommée** du même
 * inventaire : la page des réglages montre `counts.preferences`, la boîte de partage les
 * textes renseignés de `counts.layout`, la bibliothèque les deux, l'avertissement ce qui
 * est renseigné.
 */

async function containerOf(path: string) {
  return openContainer(new Uint8Array(readFileSync(path)), path.split('/').pop() ?? 'x.xcfg')
}

function warningsOf(path: string) {
  const document = parseJson(readFileSync(path, 'utf-8'))
  const layout = readLayout(document)
  return computeWarnings({
    document,
    layout,
    settings: readRenderSettings(document),
    language: 'fr'
  })
}

const AT = new Date('2026-08-21T15:32:07')

describe('les quatre vues d’un seul inventaire — le backup de référence', () => {
  it('les chiffres se recoupent : 16 = 16 dans les préférences, 0 dans la disposition', async () => {
    const container = await containerOf(BACKUP_2026)
    const inventory = collectPersonalData(container.document)
    const catalog = await loadPreferenceCatalog('fr')

    // Le modèle, seul juge.
    expect(inventory.counts).toMatchObject({ total: 16, preferences: 16, layout: 0, filled: 11 })

    // 1. Réglages généraux — compte les clés de préférences. Il les recompte par le
    // catalogue chargé, le modèle par le relevé embarqué : les deux chemins doivent
    // rendre le même nombre, sans quoi l'unification serait un vœu.
    const preferences = buildPreferenceInventory(container.document, catalog, await loadTranslator('fr'))
    expect(preferences.summary.personalCount).toBe(16)
    expect(preferences.summary.personalCounts.preferences).toBe(preferences.summary.personalCount)

    // 2. Bibliothèque — montre les deux moitiés, et le zéro de la disposition aussi.
    const identity = describeContainer(container)
    expect(personalDataCount(identity)).toEqual({ total: 16, inLayout: 0 })
    expect(identity.read.personalCounts).toEqual(inventory.counts)
    expect(identity.assumed.personalDataTravelsWithPages).toBe(false)

    // 3. Boîte de partage — remplace les textes des gadgets : ici aucun. Elle porte
    // désormais l'inventaire complet, de sorte que « rien à remplacer » ne se lise plus
    // « rien de personnel ».
    const plan = planSharing(
      { document: container.document, fileName: 'b.xcfg', kind: 'xcfg' }, AT
    )
    expect(plan.pages.replacements).toHaveLength(0)
    expect(plan.personal.counts).toEqual(inventory.counts)

    // 4. Avertissement d'export — n'énumère que ce qui est renseigné.
    const warning = warningsAt(warningsOf(BACKUP_2026), 'export')
      .find((w) => w.kind === 'personal-data')
    expect(warning?.items).toHaveLength(11)
    expect(warning?.detail).toContain('11 réglages personnels renseignés')
    expect(warning?.detail).toContain('0 texte écrit dans un gadget')
    expect(warning?.detail).toContain('5 emplacements personnels sont présents mais vides')
  })
})

describe('les quatre vues d’un seul inventaire — le fichier au bouton d’appel', () => {
  it('5 textes partent avec les pages, 3 clés restent dans les préférences', async () => {
    const container = await containerOf(FORMES_PRESERVEES)
    const inventory = collectPersonalData(container.document)
    const catalog = await loadPreferenceCatalog('fr')

    expect(inventory.counts).toMatchObject({ total: 8, layout: 5, preferences: 3, filled: 7 })

    const preferences = buildPreferenceInventory(container.document, catalog, await loadTranslator('fr'))
    expect(preferences.summary.personalCount).toBe(3)
    expect(preferences.summary.personalCounts.layout).toBe(5)

    const identity = describeContainer(container)
    expect(personalDataCount(identity)).toEqual({ total: 8, inLayout: 5 })
    expect(identity.assumed.personalDataTravelsWithPages).toBe(true)

    // Ce que la boîte remplace est **exactement** ce qui vit dans la disposition et porte
    // quelque chose : les deux inventaires viennent de la même traversée.
    const plan = planSharing(
      { document: container.document, fileName: 'f.xcfg', kind: 'xcfg' }, AT
    )
    const travelling = inventory.findings.filter((f) => f.home === 'layout' && f.filled)
    expect(plan.pages.replacements).toHaveLength(travelling.length)
    expect(plan.pages.replacements.map((r) => `${r.shortName}/${r.keyPath}`))
      .toEqual(travelling.map((f) => f.key))

    const warning = warningsAt(warningsOf(FORMES_PRESERVEES), 'export')
      .find((w) => w.kind === 'personal-data')
    expect(warning?.items).toHaveLength(7)
    expect(warning?.detail).toContain('5 textes écrits dans les gadgets')
    expect(warning?.detail).toContain('partent')
  })
})

describe('les quatre vues d’un seul inventaire — un « pages » qui ne porte rien', () => {
  it('aucun écran n’invente une donnée, et aucun ne conclut à une absence', async () => {
    const container = await containerOf(PAGES_2026)
    const inventory = collectPersonalData(container.document)
    expect(inventory.counts.total).toBe(0)

    const identity = describeContainer(container)
    expect(personalDataCount(identity)).toEqual({ total: 0, inLayout: 0 })

    const plan = planSharing(
      { document: container.document, fileName: 'p.xcfg', kind: 'xcfg' }, AT
    )
    expect(plan.personal.counts.total).toBe(0)

    // ⚠️ Un fichier muet n'est pas un fichier propre : aucun avertissement, mais la mise
    // en garde du modèle reste affichée par les écrans (voir `PERSONAL_CAVEAT`).
    expect(warningsAt(warningsOf(PAGES_2026), 'export')).toEqual([])
  })
})

describe('la version de référence n’a pas bougé', () => {
  it('reste celle du corpus — le relevé des clés personnelles en vient aussi', () => {
    expect(REFERENCE_VERSION_CODE).toBe(100030)
  })
})
