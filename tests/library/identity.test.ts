import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { openContainer } from '../../src/core/container'
import { serializeJson } from '../../src/core/serializeJson'
import { derivePagesDocument } from '../../src/model/scope'
import {
  describeContainer,
  personalInventoryOf,
  type EntryIdentity
} from '../../src/library/identity'
import { REFERENCE_VERSION_CODE } from '../../src/ui/warnings'
import { ARCHIVE, EXPORTS, FORMES_PRESERVEES, GSON_2022 } from '../fixtures/paths'

/**
 * La carte d'identité, éprouvée sur des fichiers réels.
 *
 * Toutes les valeurs attendues ici ont d'abord été **mesurées** sur les fixtures, jamais
 * devinées : 105 widgets, 5 pages paysage, 3 portrait, 136 clés de préférence,
 * `versionCode` 100030. Un chiffre écrit de mémoire ferait de ce fichier un test de la
 * mémoire, pas du code.
 *
 * `REFERENCE_VERSION_CODE` est importé **depuis le test**, et injecté : c'est exactement
 * la façon dont l'interface s'en servira. `src/library/` ne l'importe pas — le module qui
 * la porte tire tout `src/render/` derrière lui.
 */

const ouvrir = async (chemin: string, nom: string) =>
  openContainer(new Uint8Array(readFileSync(chemin)), nom)

describe('carte d’identité — ce qui est LU', () => {
  it('un backup 2026 : format, version, appareil, pages, widgets', async () => {
    const identity = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg'))
    const read = identity.read

    expect(read.containerKind).toBe('xcfg')
    expect(read.byteLength).toBe(78642)
    expect(read.exportType).toBe('backup')
    expect(read.rootKeys).toEqual(['airspaceSelectedChannels', 'info', 'layout', 'preferences'])
    expect(read.deviceString).toBe('AIR3 AIR3-7.2 8.1.0')
    expect(read.versionCode).toBe(100030)
    expect(read.versionName).toBe('1.0.3-beta')
    expect(read.proUpTo).toBe(0)
    expect(read.orientations).toEqual(['landscape', 'portrait'])
    expect(read.pageCount).toEqual({ landscape: 5, portrait: 3 })
    expect(read.widgetCount).toBe(105)
    expect(read.widgetTypes[0]).toEqual({ shortName: 'WAltitude', count: 8 })
    // La somme des types doit rendre le compte total : un inventaire qui perd un widget
    // en route ne se voit pas autrement.
    expect(read.widgetTypes.reduce((n, type) => n + type.count, 0)).toBe(105)
    expect(read.duplicateKeys).toEqual([])
    expect(read.parseError).toBeUndefined()
  })

  it('un backup nomme le pilote, un export « pages » n’a pas de préférences du tout', async () => {
    const backup = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg')).read
    const pages = describeContainer(await ouvrir(EXPORTS + '2026-08-20_pages-00.xcfg', 'p.xcfg')).read

    expect(backup.preferenceKeyCount).toBe(136)
    expect(backup.personalData).toContainEqual(expect.objectContaining({
      home: 'preferences', key: 'Pilot.Name', value: 'Amélie Exemple', filled: true
    }))
    // Les clés Livetrack sont désormais nommées une à une plutôt que regroupées : c'est
    // l'inventaire du modèle, celui-là même que la page des réglages affiche.
    expect(backup.personalData.map((datum) => datum.key))
      .toContain('Livetrack.ClaimContest')

    // La propriété est **structurelle**, pas le résultat d'un filtrage : un `pages` n'a
    // pas de section `preferences`, donc rien à en retirer.
    expect(pages.preferenceKeyCount).toBe(0)
    expect(pages.rootKeys).toEqual(['info', 'layout'])
    expect(pages.personalData).toEqual([])
  })

  it('les ressources extérieures d’un backup sont nommées avec leur clé', async () => {
    const read = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg')).read
    expect(read.externalResources).toContainEqual({
      kind: 'map-theme', name: 'hyperpilot/hyperpilot.xml', key: 'Mapsforge.ThemeFile'
    })
    expect(read.externalResources.filter((r) => r.kind === 'waypoints').map((r) => r.name))
      .toEqual(['coupe-exemple-2026.CompeGPS.wpt', 'cities5000-Exemple.wpt', 'xctrack-internal.wpt'])
    // `Airspace.Files` est vide dans le corpus : on n'invente pas une ligne creuse.
    expect(read.externalResources.some((r) => r.kind === 'airspace')).toBe(false)
  })

  it('une archive .xczfg est décrite comme telle, avec ses fichiers annexes', async () => {
    const read = describeContainer(await ouvrir(ARCHIVE, 'a.xczfg')).read
    expect(read.containerKind).toBe('xczfg')
    expect(read.byteLength).toBe(7794)
    expect(read.extraFileNames).toEqual([])
    // Le contenu, lui, est bien le backup complet : l'enveloppe ne change pas la lecture.
    expect(read.widgetCount).toBe(105)
    expect(read.exportType).toBe('backup')
  })

  it('un fichier de 2022 : ni exportType, ni les clés que XCTrack n’écrivait pas encore', async () => {
    const read = describeContainer(await ouvrir(GSON_2022, 'g.xcfg')).read
    expect(read.exportType).toBeUndefined()
    expect(read.versionCode).toBe(90615)
    expect(read.versionName).toBe('0.9.6.2-beta-48-gcb6ffef8')
    expect(read.pageCount).toEqual({ landscape: 1, portrait: 0 })
    expect(read.orientations).toEqual(['landscape'])
  })

  it('les clés dupliquées sont signalées, avec leur chemin', async () => {
    const read = describeContainer(await ouvrir(FORMES_PRESERVEES, 'f.xcfg')).read
    expect(read.duplicateKeys).toEqual(['layout/landscape[0]/widgets[0]/_clef_doublee'])
  })
})

describe('carte d’identité — ⚠️ un export « pages » PEUT porter des données personnelles', () => {
  /**
   * Le fait le plus contre-intuitif du jalon, et celui qu'il ne faut jamais réénoncer à
   * l'envers. Le `layout` porte six clés de texte libre, dont `contact.fullName` et
   * `contact.phoneNumber` d'un `WButtonPhone` — un nom et un numéro de téléphone, dans le
   * `layout`, pas dans les `preferences`. Ils **survivent** à la dérivation en `pages`.
   */
  it('le nom et le numéro d’un WButtonPhone survivent à la dérivation en « pages »', async () => {
    const source = await ouvrir(FORMES_PRESERVEES, 'f.xcfg')
    expect(describeContainer(source).read.exportType).toBe('backup')

    const derivation = derivePagesDocument(source.document)
    expect(derivation.droppedRootKeys).toEqual(['airspaceSelectedChannels', 'preferences'])

    const pages = await openContainer(
      new TextEncoder().encode(serializeJson(derivation.document)), 'derive.xcfg'
    )
    const identity = describeContainer(pages)

    // Les préférences sont bel et bien parties…
    expect(identity.read.preferenceKeyCount).toBe(0)
    expect(identity.read.personalData.every((datum) => datum.home === 'layout')).toBe(true)

    // … et pourtant le numéro de téléphone est toujours là.
    expect(identity.read.personalData).toContainEqual(expect.objectContaining({
      home: 'layout', key: 'WButtonPhone/contact/fullName', value: 'Jean Exemple',
      kind: 'contact', filled: true
    }))
    expect(identity.read.personalData).toContainEqual(expect.objectContaining({
      home: 'layout', key: 'WButtonPhone/contact/phoneNumber', value: '+32 470 00 00 00',
      kind: 'contact', filled: true
    }))
    expect(identity.assumed.personalDataTravelsWithPages).toBe(true)
  })

  it('les cinq textes libres du fichier-piège sont tous inventoriés, avec leur emplacement', async () => {
    const read = describeContainer(await ouvrir(FORMES_PRESERVEES, 'f.xcfg')).read
    expect(read.freeTexts.map((text) => `${text.shortName}/${text.keyPath}`)).toEqual([
      'WFreeText/text',
      'WFreeText/titletext',
      'WButtonPhone/contact/fullName',
      'WButtonPhone/contact/phoneNumber',
      'WSpeed/titletext'
    ])
    // Un texte libre porte l'orientation et les rangs que le pilote voit, à partir de 1.
    expect(read.freeTexts[4]).toMatchObject({ orientation: 'portrait', pageRank: 1, widgetRank: 1 })
  })

  it('un fichier sans texte libre ne prétend pas en avoir', async () => {
    const identity = describeContainer(await ouvrir(EXPORTS + '2026-08-20_pages-00.xcfg', 'p.xcfg'))
    expect(identity.read.freeTexts).toEqual([])
    expect(identity.assumed.personalDataTravelsWithPages).toBe(false)
  })
})

/**
 * ⚠️ **Une bibliothèque déjà rangée doit continuer de s'ouvrir.**
 *
 * `identity` est recopiée telle quelle depuis l'enregistrement : une entrée rangée par la
 * version déployée porte des lignes `{ where, key, value }` et **aucun** `personalCounts`.
 * Un panneau qui lirait `counts.total` sans précaution ferait échouer la bibliothèque
 * entière — toutes les entrées, à cause d'une forme d'hier.
 */
describe('carte d’identité — relire une entrée rangée par une version antérieure', () => {
  it('recompte les chiffres absents et ne perd aucune ligne', () => {
    const legacy = {
      read: {
        personalData: [
          { where: 'layout', key: 'WFreeText/text', value: 'Coucou' },
          { where: 'preferences', key: 'Pilot.Name', value: 'Amélie Exemple' },
          { where: 'preferences', key: 'Livetrack.*', value: '' }
        ]
      },
      assumed: {}
    } as unknown as EntryIdentity

    const { findings, counts } = personalInventoryOf(legacy)
    expect(counts).toEqual({
      total: 3, layout: 1, preferences: 2, filled: 2, empty: 1, read: 0, judged: 3
    })
    // On ne devine pas la nature d'une ligne dont l'ancienne forme ne disait rien : elle
    // porte une raison qui dit d'où elle vient.
    expect(findings[0]).toMatchObject({ home: 'layout', basis: 'declared', filled: true })
    expect(findings[0]?.reason).toContain('version antérieure')
    expect(findings[2]?.filled).toBe(false)
  })

  it('laisse intacte une entrée rangée par la version courante', async () => {
    const identity = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg'))
    expect(personalInventoryOf(identity).counts).toEqual(identity.read.personalCounts)
    expect(personalInventoryOf(identity).findings).toEqual(identity.read.personalData)
  })
})

describe('carte d’identité — ce qui est SUPPOSÉ', () => {
  it('la résolution ne vient pas du fichier : elle est déduite d’une table à nous', async () => {
    const identity = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg'))
    // Le fichier ne dit que « AIR3 AIR3-7.2 8.1.0 » — aucun pixel là-dedans.
    expect(identity.read.deviceString).toBe('AIR3 AIR3-7.2 8.1.0')
    expect(identity.read.deviceString).not.toMatch(/\d{3,4}\s*[x×]\s*\d{3,4}/)
    expect(identity.assumed.device.widthPx).toBe(1280)
    expect(identity.assumed.deviceRecognised).toBe(true)
  })

  it('un appareil non reconnu est dit non reconnu, et non rangé sous le gabarit par défaut', async () => {
    // `deviceFor` rend l'AIR³ 7.2 quand il ne reconnaît rien. Sans ce drapeau, « ce fichier
    // vient d'un AIR³ 7.2 » et « nous n'en savons rien » seraient indiscernables.
    const source = readFileSync(GSON_2022, 'utf8').replace('AIR3 AIR3-7.2 8.1.0', 'Un téléphone quelconque')
    const identity = describeContainer(
      await openContainer(new TextEncoder().encode(source), 'x.xcfg')
    )
    expect(identity.read.deviceString).toBe('Un téléphone quelconque')
    expect(identity.assumed.device.id).toBe('air3-7.2')
    expect(identity.assumed.deviceRecognised).toBe(false)
  })

  it('sans catalogue, aucun drapeau Pro n’est deviné', async () => {
    const identity = describeContainer(await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg'))
    expect(identity.assumed.proKnowledge).toBe('absent')
    expect(identity.assumed.proWidgets).toEqual([])
  })

  it('avec un catalogue, les widgets Pro employés sont nommés', async () => {
    const identity = describeContainer(
      await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg'),
      { isProWidget: (shortName) => shortName === 'WCompMap' }
    )
    expect(identity.assumed.proKnowledge).toBe('catalogue')
    expect(identity.assumed.proWidgets).toEqual(['WCompMap'])
  })

  it('l’écart de version n’est calculé que si l’appelant fournit la référence', async () => {
    const container = await ouvrir(GSON_2022, 'g.xcfg')
    expect(describeContainer(container).assumed.versionGap).toBe('unknown')
    expect(describeContainer(container, { referenceVersionCode: REFERENCE_VERSION_CODE }).assumed.versionGap)
      .toBe('older')

    const recent = await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg')
    expect(describeContainer(recent, { referenceVersionCode: REFERENCE_VERSION_CODE }).assumed.versionGap)
      .toBe('same')
    expect(describeContainer(recent, { referenceVersionCode: 1 }).assumed.versionGap).toBe('newer')
  })
})

describe('carte d’identité — un fichier illisible reste descriptible', () => {
  it('un document non analysable porte son erreur, et rien d’inventé', async () => {
    const container = await openContainer(new TextEncoder().encode('{ ceci n’est pas du JSON'), 'casse.xcfg')
    const identity = describeContainer(container)
    expect(identity.read.parseError).toBeDefined()
    expect(identity.read.widgetCount).toBe(0)
    expect(identity.read.rootKeys).toEqual([])
    expect(identity.read.versionCode).toBeUndefined()
    // Les octets, eux, sont toujours là : c'est ce que la bibliothèque range.
    expect(identity.read.byteLength).toBe(container.source.byteLength)
  })

  it('décrire ne modifie jamais le document', async () => {
    const container = await ouvrir(EXPORTS + '2026-08-20_backup-00.xcfg', 'b.xcfg')
    const avant = serializeJson(container.document)
    describeContainer(container, { isProWidget: () => true, referenceVersionCode: 1 })
    expect(serializeJson(container.document)).toBe(avant)
  })
})
