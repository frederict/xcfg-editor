import { LibraryError, toLibraryError, type LibraryOperation } from './errors'
import {
  conflictError,
  type BlobWrite, type ExpectedRevision, type LibraryStore, type StoredRecord
} from './store'

/**
 * Le rangement réel : IndexedDB. Le raisonnement du choix est dans `store.ts`.
 *
 * ⚠️ **Aucun test de ce dépôt n'exécute ce fichier.** `happy-dom` ne fournit pas
 * d'IndexedDB, et la consigne interdit d'ajouter `fake-indexeddb`. Ce module est donc
 * couvert par le typage et par la relecture, pas par une exécution — c'est dit ici plutôt
 * que découvert plus tard. Il est écrit en conséquence : le moins de logique possible,
 * toute la logique de bibliothèque vivant dans `library.ts`, qui est éprouvée sur le
 * magasin en mémoire à travers **la même interface**.
 *
 * Ce qui reste donc à vérifier à la main, dans un vrai navigateur, avant de s'y fier :
 * l'ouverture et la migration de schéma, le rejet de quota, et l'atomicité d'une
 * transaction interrompue.
 */

const DATABASE_NAME = 'xcfg-editor'

/**
 * Version 1 : deux magasins, `entries` (métadonnées, clé `id`) et `blobs` (octets, clé
 * explicite). Toute évolution passe par un incrément **et** une branche dans
 * `onupgradeneeded` : une base d'hier doit continuer à s'ouvrir, sinon la promesse de
 * persistance est fausse dès la première mise à jour de l'éditeur.
 */
const DATABASE_VERSION = 1

const RECORD_STORE = 'entries'
const BLOB_STORE = 'blobs'

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Attend la **transaction**, pas la requête. Une requête réussie dans une transaction qui
 * avorte ensuite n'a rien écrit : c'est la différence entre « le navigateur a accepté » et
 * « les octets sont là », et c'est exactement là que se loge le refus de quota, qui
 * arrive au moment de valider, pas au moment de demander.
 */
function settled(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('transaction avortée'))
  })
}

export interface IndexedDbStoreOptions {
  /** Injectable pour les tests d'un moteur tiers ; `globalThis.indexedDB` par défaut. */
  factory?: IDBFactory
  databaseName?: string
}

/**
 * Ouvre — ou crée — la base de la bibliothèque.
 *
 * Rejette avec `LibraryError('unavailable')` quand IndexedDB n'existe pas ou que le
 * navigateur refuse de l'ouvrir. L'appelant peut alors se rabattre sur
 * `createMemoryStore()`, **à condition de dire au pilote que rien ne sera conservé** :
 * un repli silencieux vers un stockage volatil promettrait une sauvegarde inexistante.
 */
export async function openIndexedDbStore(
  options: IndexedDbStoreOptions = {}
): Promise<LibraryStore> {
  const factory = options.factory ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB
  if (factory === undefined) {
    throw new LibraryError('unavailable', { key: 'libraryError.noIndexedDb' })
  }

  const name = options.databaseName ?? DATABASE_NAME

  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RECORD_STORE)) db.createObjectStore(RECORD_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(toLibraryError(request.error, 'open'))
    // Un autre onglet tient une version antérieure ouverte et empêche la migration. On
    // ne bloque pas indéfiniment : on le dit.
    request.onblocked = () => reject(
      new LibraryError('unavailable', { key: 'libraryError.blockedByTab' })
    )
  })

  const run = async <T>(
    stores: string[], mode: IDBTransactionMode, body: (tx: IDBTransaction) => Promise<T>,
    operation: LibraryOperation
  ): Promise<T> => {
    try {
      const transaction = database.transaction(stores, mode)
      const done = settled(transaction)
      const result = await body(transaction)
      await done
      return result
    } catch (error) {
      throw toLibraryError(error, operation)
    }
  }

  return {
    durable: true,

    readAll() {
      return run([RECORD_STORE], 'readonly',
        (tx) => promisify(tx.objectStore(RECORD_STORE).getAll() as IDBRequest<unknown[]>),
        'readAll')
    },

    read(id) {
      return run([RECORD_STORE], 'readonly',
        (tx) => promisify(tx.objectStore(RECORD_STORE).get(id) as IDBRequest<unknown>),
        'readEntry')
    },

    async readBlob(key) {
      const value = await run([BLOB_STORE], 'readonly',
        (tx) => promisify(tx.objectStore(BLOB_STORE).get(key) as IDBRequest<unknown>),
        'readBytes')
      // On range des `Uint8Array` ; on relit ce qu'on trouve. Un `ArrayBuffer` — rangé
      // par une version antérieure, ou par une autre implémentation — est accepté plutôt
      // que perdu : c'est le même contenu, dans une autre enveloppe.
      if (value instanceof Uint8Array) return value
      if (value instanceof ArrayBuffer) return new Uint8Array(value)
      return undefined
    },

    put(record: StoredRecord, writes: BlobWrite[], expected: ExpectedRevision) {
      return run([RECORD_STORE, BLOB_STORE], 'readwrite', async (tx) => {
        const recordStore = tx.objectStore(RECORD_STORE)

        // Le contrôle de révision se fait **dans** la transaction. Le faire avant, dans
        // une lecture séparée, laisserait la fenêtre exacte qu'on cherche à fermer :
        // deux onglets qui lisent, puis écrivent tous les deux.
        const existing = await promisify(recordStore.get(record.id) as IDBRequest<StoredRecord | undefined>)
        if (expected.kind === 'absent' && existing !== undefined) {
          tx.abort()
          throw conflictError(record.id, expected)
        }
        if (expected.kind === 'revision' &&
            (existing === undefined || existing.revision !== expected.value)) {
          tx.abort()
          throw conflictError(record.id, expected)
        }

        const blobStore = tx.objectStore(BLOB_STORE)
        for (const write of writes) blobStore.put(write.bytes, write.key)
        recordStore.put(record)
      }, 'write')
    },

    delete(id) {
      return run([RECORD_STORE, BLOB_STORE], 'readwrite', async (tx) => {
        tx.objectStore(RECORD_STORE).delete(id)
        // Les octets de l'entrée et toutes ses annexes (`id#preview`, et ce qui viendra)
        // en un seul intervalle de clés : voir `belongsTo` dans `store.ts`. `￿` est
        // le plus grand point de code d'un plan de base — aucune clé `id#…` ne le dépasse.
        tx.objectStore(BLOB_STORE).delete(IDBKeyRange.bound(id, `${id}#￿`))
      }, 'delete')
    },

    clear() {
      return run([RECORD_STORE, BLOB_STORE], 'readwrite', async (tx) => {
        tx.objectStore(RECORD_STORE).clear()
        tx.objectStore(BLOB_STORE).clear()
      }, 'clear')
    },

    close() { database.close() }
  }
}

/**
 * Ce que le navigateur veut bien dire de l'espace — **quand il veut bien le dire**.
 *
 * `navigator.storage.estimate()` n'existe pas partout (absent de `happy-dom`, absent des
 * Safari anciens) et ne rend, là où il existe, qu'une estimation volontairement floutée
 * pour ne pas servir d'empreinte de traçage. On rend donc `undefined` plutôt qu'un
 * chiffre inventé : une jauge fausse est pire que pas de jauge.
 */
export async function estimateStorage(): Promise<{ usage: number; quota: number } | undefined> {
  const manager = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage
  if (manager?.estimate === undefined) return undefined
  try {
    const { usage, quota } = await manager.estimate()
    if (typeof usage !== 'number' || typeof quota !== 'number') return undefined
    return { usage, quota }
  } catch {
    return undefined
  }
}

/**
 * Demande au navigateur de ne pas purger ce site — la seule protection possible contre
 * l'éviction automatique du stockage d'un site peu visité.
 *
 * Rend `'unsupported'` là où l'API n'existe pas, `'granted'` / `'denied'` sinon. Aucun
 * navigateur ne garantit `granted` : Chrome l'accorde à un site installé ou souvent
 * visité, Firefox le demande à l'utilisateur, Safari applique de toute façon sa purge
 * après sept jours sans visite. **La persistance ne se promet donc jamais** : la seule
 * sauvegarde qui tienne est celle que le pilote exporte lui-même (`transfer.ts`).
 */
export async function requestPersistence(): Promise<'granted' | 'denied' | 'unsupported'> {
  const manager = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage
  if (manager?.persist === undefined) return 'unsupported'
  try {
    return (await manager.persist()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}
