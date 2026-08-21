import { describe, expect, it } from 'vitest'
import { createMemoryStore } from '../../src/library/memoryStore'
import { LibraryError, isQuotaError, toLibraryError } from '../../src/library/errors'
import { belongsTo, blobKey, previewKey, type StoredRecord } from '../../src/library/store'
import { estimateStorage, openIndexedDbStore, requestPersistence } from '../../src/library/indexedDbStore'

/**
 * ⚠️ **Ce que ces tests ne prouvent pas.**
 *
 * `happy-dom` ne fournit pas d'IndexedDB (mesuré : `typeof indexedDB === 'undefined'`) et
 * la consigne interdit d'ajouter `fake-indexeddb`. Le magasin réel
 * (`src/library/indexedDbStore.ts`) n'est donc **jamais exécuté ici** : seuls ses gardes
 * d'absence le sont.
 *
 * Ce qui est éprouvé sur le magasin en mémoire — le contrôle de révision, la suppression
 * des annexes, la traduction d'un refus de quota — est éprouvé **à travers l'interface que
 * les deux implémentations partagent**. C'est une preuve sur la logique appelante, pas sur
 * le moteur. Restent hors de portée d'un test automatique de ce dépôt :
 *
 * - le **vrai quota** : il n'y a pas de disque derrière un `Map` ;
 * - la **persistance** : rien ici ne survit au processus ;
 * - l'**atomicité** d'une transaction IndexedDB interrompue ;
 * - la **concurrence réelle** entre deux onglets, qui sont deux processus.
 *
 * Ces quatre points se vérifient à la main dans un navigateur, et cette liste est là pour
 * qu'on sache lesquels.
 */

const record = (id: string, revision: number): StoredRecord => ({ id, revision, name: id })
const bytes = (n: number): Uint8Array => new Uint8Array(n).fill(7)

describe('magasin en mémoire — révisions et concurrence', () => {
  it('refuse de créer deux fois le même identifiant', async () => {
    const store = createMemoryStore()
    await store.put(record('a', 1), [], { kind: 'absent' })
    await expect(store.put(record('a', 1), [], { kind: 'absent' }))
      .rejects.toMatchObject({ failure: 'conflict' })
  })

  it('refuse une écriture fondée sur une révision périmée', async () => {
    // Le scénario des deux onglets : tous deux lisent la révision 1, le premier écrit et
    // passe à 2, le second croit encore être à 1.
    const store = createMemoryStore()
    await store.put(record('a', 1), [], { kind: 'absent' })
    await store.put(record('a', 2), [], { kind: 'revision', value: 1 })

    await expect(store.put(record('a', 3), [], { kind: 'revision', value: 1 }))
      .rejects.toMatchObject({ failure: 'conflict' })
    expect((await store.read('a') as StoredRecord).revision).toBe(2)
  })

  it('refuse une mise à jour sur une entrée qu’un autre onglet a supprimée', async () => {
    const store = createMemoryStore()
    await store.put(record('a', 1), [], { kind: 'absent' })
    await store.delete('a')
    await expect(store.put(record('a', 2), [], { kind: 'revision', value: 1 }))
      .rejects.toMatchObject({ failure: 'conflict' })
  })

  it('« any » écrase sans condition — le chemin de l’import', async () => {
    const store = createMemoryStore()
    await store.put(record('a', 9), [], { kind: 'any' })
    expect((await store.read('a') as StoredRecord).revision).toBe(9)
  })
})

describe('magasin en mémoire — octets et annexes', () => {
  it('supprime les octets ET l’aperçu d’une entrée, sans toucher aux voisines', async () => {
    const store = createMemoryStore()
    await store.put(record('a', 1), [
      { key: blobKey('a'), bytes: bytes(10) },
      { key: previewKey('a'), bytes: bytes(4) }
    ], { kind: 'absent' })
    await store.put(record('ab', 1), [{ key: blobKey('ab'), bytes: bytes(6) }], { kind: 'absent' })

    await store.delete('a')

    expect(await store.readBlob(blobKey('a'))).toBeUndefined()
    expect(await store.readBlob(previewKey('a'))).toBeUndefined()
    // « ab » commence par « a » : un magasin qui supprimerait par préfixe nu l'emporterait
    // avec. C'est exactement ce que `belongsTo` interdit.
    expect((await store.readBlob(blobKey('ab')))?.byteLength).toBe(6)
  })

  it('belongsTo distingue une annexe d’une entrée au nom voisin', () => {
    expect(belongsTo('a', 'a')).toBe(true)
    expect(belongsTo('a#preview', 'a')).toBe(true)
    expect(belongsTo('ab', 'a')).toBe(false)
    expect(belongsTo('ab#preview', 'a')).toBe(false)
  })

  it('rend une copie des octets, pas la vue rangée', async () => {
    const store = createMemoryStore()
    await store.put(record('a', 1), [{ key: blobKey('a'), bytes: bytes(4) }], { kind: 'absent' })
    const lu = await store.readBlob(blobKey('a'))
    lu!.fill(0)
    expect((await store.readBlob(blobKey('a')))![0]).toBe(7)
  })
})

describe('quota', () => {
  it('reconnaît les trois formes de refus que lèvent les navigateurs', () => {
    // Les navigateurs ne s'accordent pas : nom normalisé, nom Firefox, code hérité.
    const normalise = new DOMException('plein', 'QuotaExceededError')
    const firefox = new DOMException('plein', 'NS_ERROR_DOM_QUOTA_REACHED')
    expect(isQuotaError(normalise)).toBe(true)
    expect(isQuotaError(firefox)).toBe(true)
    expect(isQuotaError(new DOMException('autre chose', 'AbortError'))).toBe(false)
    expect(isQuotaError(new Error('quota dépassé'))).toBe(false) // le message ne suffit pas
  })

  it('traduit un refus de quota en LibraryError « quota », jamais en échec muet', async () => {
    const store = createMemoryStore({ capacityBytes: 100 })
    await store.put(record('a', 1), [{ key: blobKey('a'), bytes: bytes(60) }], { kind: 'absent' })

    const trop = store.put(record('b', 1), [{ key: blobKey('b'), bytes: bytes(60) }], { kind: 'absent' })
    await expect(trop).rejects.toBeInstanceOf(LibraryError)
    await expect(trop).rejects.toMatchObject({ failure: 'quota' })

    // Le refus ne laisse rien derrière lui : ni métadonnées, ni octets à demi écrits.
    expect(await store.read('b')).toBeUndefined()
    expect(await store.readBlob(blobKey('b'))).toBeUndefined()
    expect(store.usedBytes()).toBe(60)
  })

  it('remplacer des octets ne compte pas deux fois la place', async () => {
    const store = createMemoryStore({ capacityBytes: 100 })
    await store.put(record('a', 1), [{ key: blobKey('a'), bytes: bytes(90) }], { kind: 'absent' })
    await store.put(record('a', 2), [{ key: blobKey('a'), bytes: bytes(90) }], { kind: 'revision', value: 1 })
    expect(store.usedBytes()).toBe(90)
  })

  it('toute autre erreur devient « unavailable », et garde sa cause', () => {
    const cause = new Error('base fermée')
    const traduite = toLibraryError(cause, 'Écriture')
    expect(traduite.failure).toBe('unavailable')
    expect(traduite.message).toContain('Écriture')
    expect(traduite.cause).toBe(cause)
  })

  it('une LibraryError traverse la traduction sans être réemballée', () => {
    const originale = new LibraryError('not-found', 'absente')
    expect(toLibraryError(originale, 'Lecture')).toBe(originale)
  })
})

describe('absence d’IndexedDB', () => {
  it('l’ouverture échoue proprement, avec un message pour le pilote', async () => {
    // C'est le cas d'un Safari en navigation privée — et, ici, celui de happy-dom.
    await expect(openIndexedDbStore({ factory: undefined })).rejects.toMatchObject({
      failure: 'unavailable'
    })
    expect((globalThis as { indexedDB?: unknown }).indexedDB).toBeUndefined()
  })

  it('l’estimation d’espace rend « undefined » plutôt qu’un chiffre inventé', async () => {
    expect(await estimateStorage()).toBeUndefined()
  })

  it('la demande de persistance rend « unsupported » là où l’API n’existe pas', async () => {
    expect(await requestPersistence()).toBe('unsupported')
  })
})
