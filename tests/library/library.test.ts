import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  createLibrary, UNKNOWN_RECORD_ID, validateRecord, type LibraryChange
} from '../../src/library/library'
import { createMemoryStore, type MemoryStore } from '../../src/library/memoryStore'
import { blobKey } from '../../src/library/store'
import { LibraryError, libraryProseText } from '../../src/library/errors'
import { makeTranslator } from '../../src/i18n/translate'
import frenchMessages from '../../src/i18n/messages/fr'
import dutchMessages from '../../src/i18n/messages/nl'

/** La bibliothèque range une clé, l'écran la traduit — voir `src/library/errors.ts`. */
const FRENCH = makeTranslator('fr', frenchMessages)
const DUTCH = makeTranslator('nl', dutchMessages)
import { EXPORTS, GSON_2022 } from '../fixtures/paths'

const PAGES = new Uint8Array(readFileSync(EXPORTS + '2026-08-20_pages-00.xcfg'))
const GSON = new Uint8Array(readFileSync(GSON_2022))

/** Une bibliothèque déterministe : dates et identifiants prévisibles, aucun canal. */
function bibliotheque(store: MemoryStore = createMemoryStore()) {
  let tick = 0
  let count = 0
  const library = createLibrary({
    store,
    channel: null,
    now: () => new Date(Date.UTC(2026, 7, 20, 10, 0, tick++)),
    newId: () => `id-${++count}`
  })
  return { library, store }
}

describe('bibliothèque — le geste de base', () => {
  it('ranger une configuration la rend retrouvable, nommée et datée', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })

    expect(entry).toMatchObject({
      id: 'id-1', name: 'Comp Annecy', note: '', fileName: 'comp.xcfg',
      revision: 1, byteLength: PAGES.byteLength
    })
    expect(entry.addedAt).toBe('2026-08-20T10:00:00.000Z')
    expect(entry.identity.read.exportType).toBe('pages')

    const snapshot = await library.read()
    expect(snapshot.entries.map((e) => e.name)).toEqual(['Comp Annecy'])
    expect(snapshot.broken).toEqual([])
  })

  it('trois configurations coexistent sous leur nom — ce que XCTrack ne sait pas faire', async () => {
    const { library } = bibliotheque()
    for (const name of ['Comp Annecy', 'Vol-biv Alpes', 'École']) {
      await library.add({ name, bytes: PAGES, fileName: `${name}.xcfg` })
    }
    const snapshot = await library.read()
    // Les plus récentes d'abord : l'ordre dans lequel le pilote cherche.
    expect(snapshot.entries.map((e) => e.name)).toEqual(['École', 'Vol-biv Alpes', 'Comp Annecy'])
    // Trois entrées distinctes, mêmes octets : la bibliothèque ne déduplique pas. Deux
    // noms sur la même configuration est un usage légitime (« avant » / « après »).
    expect(new Set(snapshot.entries.map((e) => e.sha256)).size).toBe(1)
  })

  it('renommer incrémente la révision et ne touche pas aux octets', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'Sans titre', bytes: GSON, fileName: 'g.xcfg' })
    const renamed = await library.rename(entry.id, 'École', entry.revision)

    expect(renamed.name).toBe('École')
    expect(renamed.revision).toBe(2)
    expect(renamed.sha256).toBe(entry.sha256)
    expect(Buffer.from(await library.bytesOf(entry.id)).equals(Buffer.from(GSON))).toBe(true)
  })

  it('annoter garde la note telle quelle, sans l’interpréter', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'X', bytes: GSON, fileName: 'g.xcfg' })
    const noted = await library.annotate(entry.id, 'Réglée pour la Coupe 2026 — vent d’est', entry.revision)
    expect(noted.note).toBe('Réglée pour la Coupe 2026 — vent d’est')
  })

  it('supprimer retire l’entrée et ses octets', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'X', bytes: PAGES, fileName: 'p.xcfg' })
    await library.remove(entry.id)

    expect((await library.read()).entries).toEqual([])
    expect(await store.readBlob(blobKey(entry.id))).toBeUndefined()
    await expect(library.bytesOf(entry.id)).rejects.toMatchObject({ failure: 'not-found' })
  })

  it('un fichier illisible est refusé à l’ajout, avec son nom dans le message', async () => {
    const { library } = bibliotheque()
    // Une archive ZIP sans `.xcfg` dedans : `openContainer` lève.
    const faux = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])
    const echec = library.add({ name: 'X', bytes: faux, fileName: 'faux.xczfg' })
    await expect(echec).rejects.toBeInstanceOf(LibraryError)
    await expect(echec).rejects.toMatchObject({ failure: 'unreadable' })
    expect((await library.read()).entries).toEqual([])
  })

  it('un JSON invalide est rangé quand même — les octets valent mieux que rien', async () => {
    // Différent du cas précédent : `openContainer` sait ouvrir un `.xcfg` qu'il ne sait
    // pas analyser, et garde ses octets. La bibliothèque doit pouvoir le garder aussi :
    // c'est peut-être un fichier d'une version future, et le perdre serait pire.
    const { library } = bibliotheque()
    const bizarre = new TextEncoder().encode('{ pas du JSON')
    const entry = await library.add({ name: 'Mystère', bytes: bizarre, fileName: 'm.xcfg' })
    expect(entry.identity.read.parseError).toBeDefined()
    expect(Buffer.from(await library.bytesOf(entry.id)).equals(Buffer.from(bizarre))).toBe(true)
  })
})

describe('bibliothèque — concurrence entre onglets', () => {
  it('renommer sur une révision périmée est refusé, et n’écrase rien', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'A', bytes: GSON, fileName: 'g.xcfg' })

    // Onglet 1 renomme.
    await library.rename(entry.id, 'Onglet 1', entry.revision)
    // Onglet 2 croit encore être à la révision 1.
    await expect(library.rename(entry.id, 'Onglet 2', entry.revision))
      .rejects.toMatchObject({ failure: 'conflict' })

    expect((await library.read()).entries[0]!.name).toBe('Onglet 1')
  })

  it('deux bibliothèques sur le même canal se préviennent l’une l’autre', async () => {
    // ⚠️ Deux instances dans le MÊME processus. Cela éprouve le câblage du canal, pas la
    // concurrence de deux onglets réels, qui sont deux processus partageant une base.
    const store = createMemoryStore()
    const nom = `test-${Math.random().toString(36).slice(2)}`
    const un = createLibrary({ store, channelName: nom })
    const deux = createLibrary({ store, channelName: nom })

    const vus: LibraryChange[] = []
    deux.subscribe((change) => vus.push(change))

    try {
      await un.add({ name: 'A', bytes: GSON, fileName: 'g.xcfg' })
      // `BroadcastChannel` livre de façon asynchrone : on laisse tourner la boucle.
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(vus.map((change) => change.kind)).toEqual(['added'])
    } finally {
      un.close()
      deux.close()
    }
  })

  it('l’onglet qui écrit est prévenu lui aussi', async () => {
    // Sinon l'appelant devrait se souvenir de rafraîchir après chaque écriture — et il
    // oubliera une fois.
    const { library } = bibliotheque()
    const vus: LibraryChange[] = []
    const desabonner = library.subscribe((change) => vus.push(change))

    const entry = await library.add({ name: 'A', bytes: GSON, fileName: 'g.xcfg' })
    await library.rename(entry.id, 'B', entry.revision)
    await library.remove(entry.id)
    desabonner()
    await library.clear()

    expect(vus.map((change) => change.kind)).toEqual(['added', 'updated', 'removed'])
  })
})

describe('bibliothèque — données abîmées', () => {
  it('une entrée illisible n’empêche pas les autres d’être rendues', async () => {
    const { library, store } = bibliotheque()
    await library.add({ name: 'Saine', bytes: PAGES, fileName: 'p.xcfg' })
    store.injectRaw('cassee', { id: 'cassee', name: 'Sans empreinte', revision: 1 })
    store.injectRaw('pire', 'ceci n’est même pas un objet')

    const snapshot = await library.read()
    expect(snapshot.entries.map((e) => e.name)).toEqual(['Saine'])
    // La raison est une **clé** et ses valeurs : la bibliothèque ne connaît pas la langue
    // du pilote, l'écran l'assemble par `libraryProseText`.
    expect(snapshot.broken).toEqual([
      {
        id: 'cassee',
        reason: {
          key: 'libraryError.recordBadFields',
          values: { count: 3, fields: 'byteLength, sha256, identity' }
        }
      },
      { id: UNKNOWN_RECORD_ID, reason: { key: 'libraryError.recordNotObject' } }
    ])
    expect(snapshot.broken.map((one) => libraryProseText(one.reason, FRENCH))).toEqual([
      'champs illisibles : byteLength, sha256, identity',
      'l’enregistrement n’est pas un objet'
    ])
    expect(libraryProseText(snapshot.broken[0]!.reason, DUTCH))
      .toBe('onleesbare velden: byteLength, sha256, identity')
  })

  it('une entrée illisible reste supprimable — sans quoi la bibliothèque serait bloquée', async () => {
    const { library, store } = bibliotheque()
    store.injectRaw('cassee', { id: 'cassee' })
    expect((await library.read()).broken).toHaveLength(1)
    await library.remove('cassee')
    expect((await library.read()).broken).toEqual([])
  })

  it('des octets altérés ne sont jamais rendus au pilote', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'p.xcfg' })

    // On abîme un seul octet, au milieu : la longueur ne change pas, seule l'empreinte le
    // dit. C'est le cas qu'une simple vérification de taille laisserait passer.
    const abime = PAGES.slice()
    abime[1000] = abime[1000]! ^ 0x01
    store.injectBlob(blobKey(entry.id), abime)

    const echec = library.bytesOf(entry.id)
    await expect(echec).rejects.toMatchObject({ failure: 'integrity' })
    // Le `message` est la ligne technique ; la phrase du pilote passe par la prose.
    await expect(echec).rejects.toThrow(/Comp Annecy/)
    await expect(echec).rejects.toMatchObject({
      prose: { key: 'libraryError.digestChanged', values: { name: 'Comp Annecy' } }
    })
  })

  it('des octets absents sont dits absents, et non rendus vides', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'X', bytes: PAGES, fileName: 'p.xcfg' })
    store.injectBlob(blobKey(entry.id), new Uint8Array(0))
    await expect(library.bytesOf(entry.id)).rejects.toMatchObject({ failure: 'integrity' })
  })

  it('validateRecord nomme précisément ce qui manque', () => {
    expect(validateRecord(null))
      .toEqual({ id: UNKNOWN_RECORD_ID, reason: { key: 'libraryError.recordNotObject' } })
    expect(validateRecord({ revision: 1 }))
      .toEqual({ id: UNKNOWN_RECORD_ID, reason: { key: 'libraryError.recordNoId' } })
    expect(validateRecord({ id: 'a', name: 'A', revision: 1, byteLength: 3, sha256: 'x', identity: {} }))
      .toMatchObject({ id: 'a', name: 'A', note: '', fileName: '' })
    expect(validateRecord({ id: 'a', name: 'A', revision: 1, byteLength: 3, sha256: '', identity: {} }))
      .toEqual({
        id: 'a',
        reason: {
          key: 'libraryError.recordBadFields', values: { count: 1, fields: 'sha256' }
        }
      })
  })
})

describe('bibliothèque — la place réservée à l’aperçu', () => {
  it('l’aperçu se pose et se relit, mais rien ici ne le produit', async () => {
    // `src/render/` est hors de ce périmètre. Ce test vérifie que la place existe et
    // qu'elle tient des octets — pas qu'une image est dessinée.
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'X', bytes: PAGES, fileName: 'p.xcfg' })
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

    const avec = await library.setPreview(entry.id, image,
      { mediaType: 'image/png', widthPx: 320, heightPx: 180, orientation: 'landscape', pageRank: 1 },
      entry.revision)

    expect(avec.preview).toEqual({
      mediaType: 'image/png', widthPx: 320, heightPx: 180,
      orientation: 'landscape', pageRank: 1, byteLength: 4
    })
    expect(Buffer.from((await library.previewOf(entry.id))!).equals(Buffer.from(image))).toBe(true)
    // Poser un aperçu ne touche pas aux octets de la configuration.
    expect(Buffer.from(await library.bytesOf(entry.id)).equals(Buffer.from(PAGES))).toBe(true)
  })

  it('supprimer une entrée emporte son aperçu', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'X', bytes: PAGES, fileName: 'p.xcfg' })
    await library.setPreview(entry.id, new Uint8Array([1]),
      { mediaType: 'image/png', widthPx: 1, heightPx: 1, orientation: 'portrait', pageRank: 1 },
      entry.revision)
    await library.remove(entry.id)
    expect(await library.previewOf(entry.id)).toBeUndefined()
  })
})

describe('bibliothèque — le rangement se déclare', () => {
  it('un rangement volatil le dit : le pilote doit savoir que rien ne sera conservé', async () => {
    const { library } = bibliotheque()
    expect((await library.read()).durable).toBe(false)

    const durable = createLibrary({ store: { ...createMemoryStore(), durable: true }, channel: null })
    expect((await durable.read()).durable).toBe(true)
  })
})
