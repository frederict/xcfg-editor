import { toLibraryError } from './errors'
import {
  belongsTo, conflictError,
  type BlobWrite, type ExpectedRevision, type LibraryStore, type StoredRecord
} from './store'

/**
 * Un rangement en mémoire — **et ce qu'il ne prouve pas.**
 *
 * Il existe pour deux raisons, et une seule est bonne :
 *
 * 1. **Les tests.** `happy-dom` ne fournit **pas** d'IndexedDB (mesuré :
 *    `typeof indexedDB === 'undefined'` sous Vitest 4.1.11 / happy-dom 20.11.6), et la
 *    consigne interdit d'ajouter une dépendance — donc pas de `fake-indexeddb`. Toute la
 *    logique de bibliothèque — validation, empreintes, révisions, corruption, import et
 *    export — s'éprouve donc ici.
 * 2. **Un repli honnête** quand le navigateur refuse IndexedDB (mode privé de certains
 *    Safari, stockage désactivé). `durable` vaut alors `false`, et l'interface doit le
 *    dire : la bibliothèque marchera le temps de l'onglet, puis disparaîtra.
 *
 * ⚠️ **Ce que ce magasin ne démontre en rien** — à lire avant de croire les tests verts :
 *
 * - **Rien sur le quota.** Il n'y a pas de disque derrière. `capacityBytes` simule un
 *   plafond pour éprouver *le chemin de code* qui traduit le refus en `LibraryError`
 *   `quota` ; il n'éprouve pas le comportement d'un vrai navigateur plein, ni le moment
 *   où celui-ci refuse, ni son message.
 * - **Rien sur la persistance.** Tout disparaît avec le processus. La seule preuve de
 *   persistance qui vaille est celle du pilote : exporter la bibliothèque
 *   (`transfer.ts`) et la réimporter.
 * - **Rien sur la concurrence réelle.** Deux onglets, ce sont deux processus JavaScript
 *   distincts partageant une base ; ici, un seul fil et un seul objet. Le contrôle de
 *   révision (`ExpectedRevision`) est exercé — deux appelants qui se marchent dessus sont
 *   simulables — mais **l'atomicité de la transaction IndexedDB, elle, ne l'est pas**.
 *   Elle repose sur le moteur, pas sur ce code.
 * - **Rien sur le clonage structuré.** IndexedDB copie les objets à l'écriture, avec ses
 *   propres règles (les fonctions, les `Symbol`, les classes n'y survivent pas). Ce
 *   magasin s'en approche avec `structuredClone`, qui est **la même** opération — c'est
 *   le point le plus solide de la substitution, et le seul.
 */

/** Ce qu'un magasin en mémoire accepte de plus qu'un vrai : un plafond, pour les tests. */
export interface MemoryStoreOptions {
  /**
   * Plafond simulé, en octets, sur la somme des octets rangés. Dépassé, `put` lève une
   * `DOMException` `QuotaExceededError` — la forme exacte que produit un navigateur —
   * pour que le chemin de traduction soit celui de la production, pas un raccourci.
   */
  capacityBytes?: number
  /** Vaut `false` par défaut : ce rangement ne survit pas à l'onglet, et le dit. */
  durable?: boolean
}

export interface MemoryStore extends LibraryStore {
  /**
   * Écrit un enregistrement **sans le valider** — le seul moyen d'éprouver la lecture
   * d'une bibliothèque abîmée. Réservé aux tests : rien dans `src/` ne l'appelle.
   */
  injectRaw(id: string, record: unknown): void
  /** Remplace les octets d'une clé sans toucher aux métadonnées : simule la corruption. */
  injectBlob(key: string, bytes: Uint8Array): void
  /** Somme des octets rangés, aperçus compris. */
  usedBytes(): number
}

export function createMemoryStore(options: MemoryStoreOptions = {}): MemoryStore {
  const records = new Map<string, unknown>()
  const blobs = new Map<string, Uint8Array>()

  const usedBytes = (): number => {
    let total = 0
    for (const bytes of blobs.values()) total += bytes.byteLength
    return total
  }

  const quotaException = (): unknown => {
    // La forme normalisée, celle que Chrome et Safari lèvent. On la construit plutôt que
    // d'inventer une erreur maison : le test ne vaut que s'il traverse `isQuotaError`.
    if (typeof DOMException !== 'undefined') {
      return new DOMException('quota simulé', 'QuotaExceededError')
    }
    const error = new Error('quota simulé')
    error.name = 'QuotaExceededError'
    return error
  }

  return {
    durable: options.durable ?? false,

    async readAll() {
      // Copie, comme le ferait une lecture IndexedDB : l'appelant qui mute ce qu'il a lu
      // ne doit pas modifier la base. C'est aussi ce qui rend les tests de corruption
      // honnêtes — sans copie, `injectRaw` et la lecture partageraient le même objet.
      return [...records.values()].map((record) => structuredClone(record))
    },

    async read(id) {
      const record = records.get(id)
      return record === undefined ? undefined : structuredClone(record)
    },

    async readBlob(key) {
      const bytes = blobs.get(key)
      return bytes === undefined ? undefined : bytes.slice()
    },

    async put(record: StoredRecord, writes: BlobWrite[], expected: ExpectedRevision) {
      const existing = records.get(record.id) as StoredRecord | undefined

      if (expected.kind === 'absent' && existing !== undefined) throw conflictError(record.id, expected)
      if (expected.kind === 'revision') {
        if (existing === undefined || existing.revision !== expected.value) {
          throw conflictError(record.id, expected)
        }
      }

      if (options.capacityBytes !== undefined) {
        const replaced = writes.reduce((n, w) => n + (blobs.get(w.key)?.byteLength ?? 0), 0)
        const added = writes.reduce((n, w) => n + w.bytes.byteLength, 0)
        if (usedBytes() - replaced + added > options.capacityBytes) {
          // On n'écrit rien du tout : une transaction qui échoue ne laisse pas la moitié
          // de l'entrée derrière elle. Même postcondition qu'IndexedDB.
          throw toLibraryError(quotaException(), 'write')
        }
      }

      records.set(record.id, structuredClone(record))
      for (const write of writes) blobs.set(write.key, write.bytes.slice())
    },

    async delete(id) {
      records.delete(id)
      for (const key of [...blobs.keys()]) {
        if (belongsTo(key, id)) blobs.delete(key)
      }
    },

    async clear() {
      records.clear()
      blobs.clear()
    },

    close() { /* rien à fermer : c'est précisément ce que ce magasin ne garantit pas */ },

    injectRaw(id, record) { records.set(id, record) },
    injectBlob(key, bytes) { blobs.set(key, bytes.slice()) },
    usedBytes
  }
}
