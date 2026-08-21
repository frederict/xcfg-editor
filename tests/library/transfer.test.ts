import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createLibrary, type Library } from '../../src/library/library'
import { createMemoryStore } from '../../src/library/memoryStore'
import { exportLibrary, importLibrary, LIBRARY_FORMAT } from '../../src/library/transfer'
import { readZip, writeZip } from '../../src/core/zip'
import { blobKey } from '../../src/library/store'
import { ARCHIVE, EXPORTS, FORMES_PRESERVEES } from '../fixtures/paths'

/**
 * Exporter puis réimporter toute la bibliothèque — la seule protection réelle contre la
 * purge du stockage par le navigateur.
 *
 * La propriété centrale est la même que partout ailleurs : **les octets ressortent
 * identiques**, y compris après un aller-retour par une archive ZIP.
 */

const FICHIERS: Array<[string, string, Uint8Array]> = [
  ['Comp Annecy', '2026-08-20_backup-00.xcfg', new Uint8Array(readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg'))],
  ['Vol-biv Alpes', '2026-08-20_pages-00.xcfg', new Uint8Array(readFileSync(EXPORTS + '2026-08-20_pages-00.xcfg'))],
  ['Avec médias', 'archive.xczfg', new Uint8Array(readFileSync(ARCHIVE))],
  ['Pièges', 'formes-preservees.xcfg', new Uint8Array(readFileSync(FORMES_PRESERVEES))]
]

function nouvelle(): Library {
  let count = 0
  let tick = 0
  return createLibrary({
    store: createMemoryStore(),
    channel: null,
    newId: () => `id-${++count}`,
    now: () => new Date(Date.UTC(2026, 7, 20, 10, 0, tick++))
  })
}

async function remplie(): Promise<Library> {
  const library = nouvelle()
  for (const [name, fileName, bytes] of FICHIERS) {
    await library.add({ name, bytes, fileName })
  }
  return library
}

describe('export et import de la bibliothèque entière', () => {
  it('un aller-retour rend chaque configuration à l’octet près', async () => {
    const source = await remplie()
    const { archive, exported, skipped } = await exportLibrary(source, new Date(Date.UTC(2026, 7, 21, 9, 30)))
    expect(exported).toBe(4)
    expect(skipped).toEqual([])

    const cible = nouvelle()
    const report = await importLibrary(cible, archive)
    expect(report.exportedAt).toBe('2026-08-21T09:30:00.000Z')
    expect(report.results.map((r) => r.outcome)).toEqual(['imported', 'imported', 'imported', 'imported'])

    const entries = (await cible.read()).entries
    expect(entries).toHaveLength(4)

    for (const [name, , bytes] of FICHIERS) {
      const entry = entries.find((e) => e.name === name)!
      const sorti = Buffer.from(await cible.bytesOf(entry.id))
      expect(sorti.length, name).toBe(bytes.byteLength)
      expect(sorti.equals(Buffer.from(bytes)), name).toBe(true)
      // Et l'empreinte est bien celle du fichier d'origine, calculée indépendamment.
      expect(entry.sha256, name).toBe(createHash('sha256').update(bytes).digest('hex'))
    }
  })

  it('les métadonnées survivent au voyage : nom, note, dates, révision, carte d’identité', async () => {
    const source = nouvelle()
    const entry = await source.add({ name: 'École', bytes: FICHIERS[1]![2], fileName: 'e.xcfg' })
    await source.annotate(entry.id, 'Pour les biplaces', entry.revision)

    const { archive } = await exportLibrary(source)
    const cible = nouvelle()
    await importLibrary(cible, archive)

    const restauree = (await cible.read()).entries[0]!
    expect(restauree).toMatchObject({
      id: entry.id, name: 'École', note: 'Pour les biplaces',
      addedAt: entry.addedAt, revision: 2
    })
    expect(restauree.identity.read.exportType).toBe('pages')
    expect(restauree.identity.read.widgetCount).toBe(105)
  })

  it('l’archive s’ouvre avec n’importe quel outil : un manifeste et un fichier par entrée', async () => {
    // Une sauvegarde qu'on ne peut lire qu'avec l'outil qui l'a écrite n'est pas une
    // sauvegarde. On vérifie que les `.xcfg` sont là, nommés, et intacts.
    const source = await remplie()
    const { archive } = await exportLibrary(source)
    const membres = await readZip(archive)

    // L'ordre est celui de l'affichage — la plus récemment ajoutée d'abord — et il est
    // donc déterministe : deux exports d'une même bibliothèque rangent les mêmes membres
    // dans le même ordre.
    expect(membres.map((m) => m.name)).toEqual([
      'bibliotheque.json',
      'entrees/id-4.xcfg',
      'entrees/id-3.xczfg',
      'entrees/id-2.xcfg',
      'entrees/id-1.xcfg'
    ])

    const manifeste = JSON.parse(new TextDecoder().decode(membres[0]!.data)) as { format: string; items: unknown[] }
    expect(manifeste.format).toBe(LIBRARY_FORMAT)
    expect(manifeste.items).toHaveLength(4)

    // Le membre extrait à la main est le fichier d'origine, sans passer par l'éditeur.
    const backup = membres.find((m) => m.name === 'entrees/id-1.xcfg')!
    expect(Buffer.from(backup.data).equals(Buffer.from(FICHIERS[0]![2]))).toBe(true)

    // Une archive `.xczfg` est rangée sans être recompressée : elle l'est déjà.
    expect(membres.find((m) => m.name === 'entrees/id-3.xczfg')!.stored).toBe(true)
  })

  it('l’aperçu voyage avec son entrée', async () => {
    const source = nouvelle()
    const entry = await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
    await source.setPreview(entry.id, image,
      { mediaType: 'image/png', widthPx: 320, heightPx: 180, orientation: 'landscape', pageRank: 2 },
      entry.revision)

    const { archive } = await exportLibrary(source)
    const cible = nouvelle()
    await importLibrary(cible, archive)

    const restauree = (await cible.read()).entries[0]!
    expect(restauree.preview).toMatchObject({ widthPx: 320, pageRank: 2, byteLength: 5 })
    expect(Buffer.from((await cible.previewOf(restauree.id))!).equals(Buffer.from(image))).toBe(true)
  })
})

describe('import par-dessus une bibliothèque existante', () => {
  it('une entrée déjà présente, aux mêmes octets, n’est pas dupliquée', async () => {
    const source = await remplie()
    const { archive } = await exportLibrary(source)
    await importLibrary(source, archive)

    const report = await importLibrary(source, archive)
    expect(report.results.map((r) => r.outcome)).toEqual(Array(4).fill('already-present'))
    expect((await source.read()).entries).toHaveLength(4)
  })

  it('un même identifiant portant d’autres octets ne remplace rien : les deux coexistent', async () => {
    const source = nouvelle()
    await source.add({ name: 'Comp Annecy', bytes: FICHIERS[0]![2], fileName: 'a.xcfg' })
    const { archive } = await exportLibrary(source)

    // Une autre machine a rangé une configuration différente sous le même identifiant.
    const cible = nouvelle()
    await cible.add({ name: 'Autre chose', bytes: FICHIERS[1]![2], fileName: 'b.xcfg' })

    const report = await importLibrary(cible, archive, { newId: () => 'id-importe' })
    expect(report.results[0]).toMatchObject({
      sourceId: 'id-1', outcome: 'duplicated', id: 'id-importe', name: 'Comp Annecy (importé)'
    })

    const entries = (await cible.read()).entries
    expect(entries.map((e) => e.name).sort()).toEqual(['Autre chose', 'Comp Annecy (importé)'])
    // L'entrée qui était là garde ses octets : rien n'a été écrasé.
    const restee = entries.find((e) => e.name === 'Autre chose')!
    expect(Buffer.from(await cible.bytesOf(restee.id)).equals(Buffer.from(FICHIERS[1]![2]))).toBe(true)
  })
})

describe('import d’une archive abîmée', () => {
  it('des octets qui ne rendent pas leur empreinte sont refusés, et rien n’est écrit', async () => {
    const source = nouvelle()
    await source.add({ name: 'Comp Annecy', bytes: FICHIERS[0]![2], fileName: 'a.xcfg' })
    const { archive } = await exportLibrary(source)

    // On réécrit l'archive avec un octet changé au milieu du `.xcfg`, sans toucher au
    // manifeste : exactement ce qu'un transfert abîmé produirait.
    const membres = await readZip(archive)
    const cible = membres.find((m) => m.name === 'entrees/id-1.xcfg')!
    cible.data[500] = cible.data[500]! ^ 0xff
    const abimee = await writeZip(membres)

    const destination = nouvelle()
    const report = await importLibrary(destination, abimee)
    expect(report.results[0]).toMatchObject({ outcome: 'rejected' })
    expect(report.results[0]!.reason).toContain('empreinte')
    expect((await destination.read()).entries).toEqual([])
  })

  it('une entrée refusée n’arrête pas l’import des autres', async () => {
    const source = await remplie()
    const { archive } = await exportLibrary(source)

    // On retire un membre de l'archive sans toucher au manifeste.
    const membres = (await readZip(archive)).filter((m) => m.name !== 'entrees/id-2.xcfg')
    const trouee = await writeZip(membres)

    const cible = nouvelle()
    const report = await importLibrary(cible, trouee)
    // Le manifeste est rangé de la plus récente à la plus ancienne : `id-2` est en 3e.
    expect(report.results.map((r) => r.outcome)).toEqual(['imported', 'imported', 'rejected', 'imported'])
    expect(report.results[2]!.reason).toContain('absent')
    expect((await cible.read()).entries).toHaveLength(3)
  })

  it('un fichier qui n’est pas une archive est refusé avec un message clair', async () => {
    const cible = nouvelle()
    await expect(importLibrary(cible, FICHIERS[0]![2])).rejects.toMatchObject({ failure: 'unreadable' })
  })

  it('une archive sans manifeste n’est pas prise pour une bibliothèque', async () => {
    const cible = nouvelle()
    const quelconque = await writeZip([
      { name: 'photo.png', data: new Uint8Array([1, 2, 3]), stored: true, dosTime: 0, dosDate: 0 }
    ])
    await expect(importLibrary(cible, quelconque)).rejects.toThrow(/bibliotheque\.json/)
  })

  it('une bibliothèque écrite par une version postérieure est refusée, pas devinée', async () => {
    const source = nouvelle()
    await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const { archive } = await exportLibrary(source)

    const membres = await readZip(archive)
    const manifeste = JSON.parse(new TextDecoder().decode(membres[0]!.data)) as Record<string, unknown>
    manifeste.formatVersion = 99
    membres[0]!.data = new TextEncoder().encode(JSON.stringify(manifeste))

    await expect(importLibrary(nouvelle(), await writeZip(membres))).rejects.toThrow(/postérieure/)
  })

  it('les entrées dont les octets manquent en base ne sont pas exportées en silence', async () => {
    const source = nouvelle()
    const entry = await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const store = createMemoryStore()
    // On refait une bibliothèque dont les octets ont disparu sous les métadonnées.
    store.injectRaw(entry.id, entry)
    const amputee = createLibrary({ store, channel: null })

    const { exported, skipped } = await exportLibrary(amputee)
    expect(exported).toBe(0)
    expect(skipped).toEqual([entry.id])
    // Le blob n'a jamais existé : la vérification l'a détecté, pas un hasard.
    expect(await store.readBlob(blobKey(entry.id))).toBeUndefined()
  })
})
