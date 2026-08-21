/**
 * Le socle des configurations nommées : garder plusieurs `.xcfg` sous un nom, dans le
 * navigateur, les retrouver et les comparer. **Aucune interface ici** — la couche métier.
 *
 * ## Par où entrer
 *
 * ```ts
 * // Dans le navigateur : le rangement durable, avec repli explicite.
 * let store: LibraryStore
 * try {
 *   store = await openIndexedDbStore()
 * } catch {
 *   store = createMemoryStore()   // durable: false — À DIRE AU PILOTE
 * }
 *
 * const library = createLibrary({
 *   store,
 *   describe: { isProWidget: catalog.isProWidget, referenceVersionCode: REFERENCE_VERSION_CODE }
 * })
 *
 * await library.add({ name: 'Comp Annecy', bytes, fileName: 'backup.xcfg' })
 * const { entries, broken, durable } = await library.read()
 * const octets = await library.bytesOf(entries[0].id)   // les octets d'origine, vérifiés
 * ```
 *
 * ## Ce que ce dossier ne fait pas
 *
 * - **Rien vers l'extérieur** : pas de serveur, pas de réseau, pas de publication.
 * - **Aucun aperçu produit** : la place est réservée (`PreviewRef`, `setPreview`), l'image
 *   viendra de `src/render/`.
 * - **Aucun nettoyage silencieux** : les données personnelles sont *montrées*
 *   (`identity.read.personalData`), jamais retirées. Le pilote décide — même éthique que
 *   `src/model/scope.ts` et `src/ui/warnings.ts`.
 *
 * ## Le poids
 *
 * `src/library/` ne dépend que de `src/core/` (analyseur, ZIP), de `src/model/`
 * (`layout`, `scope`) et de `src/catalog/devices.ts` — 60 lignes. Ni `src/render/`, ni
 * `src/ui/`, ni `widgetLabels.json` (72 ko), ni le catalogue des widgets : les deux
 * dépendances qui coûteraient — le drapeau Pro et la version de référence — sont
 * **injectées** par l'appelant (`DescribeOptions`), sur le modèle de
 * `src/model/inspection.ts`.
 */

export { LibraryError, isQuotaError, toLibraryError, type LibraryFailure } from './errors'
export { sha256Hex, sameDigest } from './digest'

export {
  blobKey, previewKey, belongsTo,
  type LibraryStore, type StoredRecord, type BlobWrite, type ExpectedRevision
} from './store'
export { createMemoryStore, type MemoryStore, type MemoryStoreOptions } from './memoryStore'
export { openIndexedDbStore, estimateStorage, requestPersistence, type IndexedDbStoreOptions } from './indexedDbStore'

export {
  describeContainer,
  type DescribeOptions, type EntryIdentity, type IdentityRead, type IdentityAssumed,
  type ExternalResource, type PersonalDatum, type WidgetTypeCount
} from './identity'

export {
  createLibrary, validateRecord,
  type Library, type LibraryOptions, type LibraryEntry, type BrokenEntry,
  type LibrarySnapshot, type LibraryChange, type AddInput, type PreviewRef
} from './library'

export {
  exportLibrary, importLibrary, LIBRARY_FORMAT, LIBRARY_FORMAT_VERSION,
  type ImportReport, type ImportResult, type ImportOutcome, type ImportOptions
} from './transfer'
