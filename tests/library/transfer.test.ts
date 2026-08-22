import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createLibrary, type Library } from '../../src/library/library'
import { createMemoryStore } from '../../src/library/memoryStore'
import { exportLibrary, importLibrary, LIBRARY_FORMAT } from '../../src/library/transfer'
import { readZip, writeZip } from '../../src/core/zip'
import { relireSansNous, unzipTest, UNZIP_PRESENT } from '../core/zipIndependant'
import { blobKey } from '../../src/library/store'
import { libraryProseText } from '../../src/library/errors'
import { makeTranslator } from '../../src/i18n/translate'
import frenchMessages from '../../src/i18n/messages/fr'

const FRENCH = makeTranslator('fr', frenchMessages)
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

  /**
   * ⚠️ Ce test s'intitulait déjà « s'ouvre avec n'importe quel outil » — et il la rouvrait
   * avec `readZip`, c'est-à-dire avec nous. Il promettait une conformité au monde et
   * mesurait notre cohérence avec nous-mêmes. Mesuré : `writeZip` passé à `crc = 0`, les
   * 2 144 tests restaient verts et `unzip -t` refusait l'archive. Le contrôle extérieur
   * est maintenant dans le test suivant ; celui-ci garde ce qu'il savait déjà dire, la
   * composition de l'archive.
   */
  it('porte un manifeste et un fichier par entrée, nommés et intacts', async () => {
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

  /**
   * **La sauvegarde du pilote s'ouvre-t-elle ailleurs ?** C'est la seule protection qu'il
   * ait contre la purge de son navigateur, et le manuel la lui promet extractible « avec
   * n'importe quel décompresseur ». La preuve ne peut donc pas passer par `readZip` :
   * elle passe par la zlib de Node et par `unzip` du système, tous deux extérieurs à
   * `src/`. Voir `tests/core/zipIndependant.ts`.
   */
  it('s’ouvre pour de bon ailleurs : CRC32 juste, et unzip -t l’accepte', async () => {
    const { archive } = await exportLibrary(await remplie())

    const relus = relireSansNous(archive)
    expect(relus.map((m) => m.name)).toContain('bibliotheque.json')
    for (const membre of relus) {
      // Recalculé par `zlib.crc32` sur les octets décompressés par `inflateRawSync`.
      expect(membre.crcCentral, `${membre.name} — répertoire central`).toBe(membre.crcReel)
      expect(membre.crcLocal, `${membre.name} — descripteur de données`).toBe(membre.crcReel)
    }

    // Et le manifeste relu sans nous est bien le nôtre : sinon le contrôle ci-dessus
    // serait vrai de n'importe quelle archive cohérente, y compris vide.
    const manifeste = JSON.parse(new TextDecoder().decode(relus[0]!.data)) as { items: unknown[] }
    expect(manifeste.items).toHaveLength(4)
  })

  it.skipIf(!UNZIP_PRESENT)('unzip -t du système accepte l’archive de bibliothèque', async () => {
    const { archive } = await exportLibrary(await remplie())
    expect(unzipTest(archive, 'bibliotheque.zip')).toContain('No errors detected')
  })

  /**
   * **La décision de vie privée de ce module**, gardée par un test parce qu'elle est
   * invisible à la relecture : une vignette est une IMAGE des pages du pilote, elle
   * échappe donc à l'anonymisation, qui ne travaille que sur le document JSON. L'archive
   * est ce qui sort du navigateur ; elle n'emporte ni l'image, ni la fiche qui l'annonce.
   */
  it('n’emporte aucune vignette — ni l’image, ni la ligne qui l’annonce', async () => {
    const source = nouvelle()
    const entry = await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
    await source.setPreview(entry.id, image,
      { mediaType: 'image/png', widthPx: 320, heightPx: 180, orientation: 'landscape', pageRank: 2 },
      entry.revision)

    const { archive } = await exportLibrary(source)
    const membres = await readZip(archive)
    // Aucun membre d'image, et l'entrée du manifeste ne parle pas de vignette.
    expect(membres.map((m) => m.name)).toEqual(['bibliotheque.json', 'entrees/id-1.xcfg'])
    const manifeste = new TextDecoder().decode(
      membres.find((m) => m.name === 'bibliotheque.json')!.data)
    expect(manifeste).not.toContain('preview')

    const cible = nouvelle()
    await importLibrary(cible, archive)
    const restauree = (await cible.read()).entries[0]!
    expect(restauree.preview).toBeUndefined()
    expect(await cible.previewOf(restauree.id)).toBeUndefined()
  })

  /**
   * Une archive écrite à la main peut annoncer une vignette qu'elle ne porte pas. On ne
   * la croit pas : l'entrée rétablie afficherait sinon un cadre vide pour toujours, sans
   * que rien ne l'explique — et le rattrapage de l'interface ne repasserait pas dessus.
   */
  it('ne croit pas une fiche importée qui annonce une vignette', async () => {
    const source = nouvelle()
    await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const { archive } = await exportLibrary(source)

    const membres = await readZip(archive)
    const manifeste = JSON.parse(new TextDecoder().decode(
      membres.find((m) => m.name === 'bibliotheque.json')!.data)) as {
      items: Array<{ entry: Record<string, unknown> }>
    }
    manifeste.items[0]!.entry.preview = {
      mediaType: 'image/png', widthPx: 320, heightPx: 180, byteLength: 5,
      orientation: 'landscape', pageRank: 2
    }
    const truquee = await writeZip(membres.map((m) => m.name === 'bibliotheque.json'
      ? { ...m, data: new TextEncoder().encode(JSON.stringify(manifeste)) }
      : m))

    const cible = nouvelle()
    await importLibrary(cible, truquee)
    expect((await cible.read()).entries[0]!.preview).toBeUndefined()
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

  /*
   * Les deux essais suivants sont ceux qui manquaient : tous les autres injectent un
   * `newId`, donc aucun n'éprouvait le générateur par défaut. Il rendait
   * `` `${entry.id}-2` ``, et la deuxième collision sur le même identifiant tombait sur
   * un `uuid-2` déjà pris — `restore` exige `absent`, elle levait, et l'archive entière
   * s'arrêtait là.
   */
  it('deux imports conflictuels de suite passent, sans identifiant injecté', async () => {
    const source = nouvelle()
    await source.add({ name: 'Comp Annecy', bytes: FICHIERS[0]![2], fileName: 'a.xcfg' })
    const { archive } = await exportLibrary(source)

    // La cible a déjà `id-1`, portant d'autres octets : chaque import est un conflit.
    const cible = nouvelle()
    await cible.add({ name: 'Autre chose', bytes: FICHIERS[1]![2], fileName: 'b.xcfg' })

    const premier = await importLibrary(cible, archive)
    const second = await importLibrary(cible, archive)
    expect(premier.results.map((r) => r.outcome)).toEqual(['duplicated'])
    expect(second.results.map((r) => r.outcome)).toEqual(['duplicated'])

    // Trois entrées, trois identifiants distincts, et les octets d'origine des deux copies.
    const entries = (await cible.read()).entries
    expect(entries).toHaveLength(3)
    expect(new Set(entries.map((e) => e.id)).size).toBe(3)
    for (const copie of entries.filter((e) => e.name !== 'Autre chose')) {
      expect(Buffer.from(await cible.bytesOf(copie.id)).equals(Buffer.from(FICHIERS[0]![2]))).toBe(true)
    }
  })

  it('un identifiant déjà pris refuse SON entrée, pas le reste de l’archive', async () => {
    const source = await remplie()
    const { archive } = await exportLibrary(source)

    // La cible porte déjà les quatre identifiants, avec d'autres octets : quatre conflits.
    // Les octets sont décalés d'un cran pour qu'aucune paire ne coïncide — deux entrées
    // aux mêmes octets sortiraient en `already-present` et cet essai ne prouverait rien.
    const cible = nouvelle()
    for (let rang = 0; rang < 4; rang++) {
      await cible.add({ name: `Local ${rang}`, bytes: FICHIERS[(rang + 1) % 4]![2], fileName: 'x.xcfg' })
    }

    // Un générateur fautif : il rend deux fois le même identifiant neuf. La deuxième
    // entrée qui l'emploie ne peut pas s'écrire.
    let servi = 0
    const report = await importLibrary(cible, archive, {
      newId: () => (++servi <= 2 ? 'collision' : `neuf-${servi}`)
    })

    const outcomes = report.results.map((r) => r.outcome)
    expect(outcomes.filter((o) => o === 'rejected')).toHaveLength(1)
    expect(outcomes.filter((o) => o === 'duplicated')).toHaveLength(3)
    // Le rapport nomme l'identifiant de l'ARCHIVE, le seul que le pilote y retrouvera.
    const refus = report.results.find((r) => r.outcome === 'rejected')!
    expect(refus.sourceId).toMatch(/^id-\d$/)
    expect(libraryProseText(refus.reason!, FRENCH)).toContain('identifiant')
    // Quatre entrées locales, trois copies écrites : la quatrième n'a rien laissé.
    expect((await cible.read()).entries).toHaveLength(7)
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
    expect(libraryProseText(report.results[0]!.reason!, FRENCH)).toContain('empreinte')
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
    expect(libraryProseText(report.results[2]!.reason!, FRENCH)).toContain('absent')
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
    await expect(importLibrary(cible, quelconque)).rejects.toMatchObject({
      prose: { key: 'libraryError.manifestMissing', values: { file: 'bibliotheque.json' } }
    })
  })

  it('une bibliothèque écrite par une version postérieure est refusée, pas devinée', async () => {
    const source = nouvelle()
    await source.add({ name: 'X', bytes: FICHIERS[1]![2], fileName: 'p.xcfg' })
    const { archive } = await exportLibrary(source)

    const membres = await readZip(archive)
    const manifeste = JSON.parse(new TextDecoder().decode(membres[0]!.data)) as Record<string, unknown>
    manifeste.formatVersion = 99
    membres[0]!.data = new TextEncoder().encode(JSON.stringify(manifeste))

    // Le `message` porte la ligne technique ; la phrase du pilote vient de la prose, et
    // le numéro de format y passe en `string` — c'est un schéma, pas une quantité.
    const refus = importLibrary(nouvelle(), await writeZip(membres))
    await expect(refus).rejects.toMatchObject({
      prose: { key: 'libraryError.futureFormat', values: { version: '99' } }
    })
    await expect(refus).rejects.toThrow(/libraryError\.futureFormat/)
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
