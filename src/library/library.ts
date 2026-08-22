import { openContainer, type Container } from '../core/container'
import { technicalDetail } from '../core/technicalDetail'
import { sameDigest, sha256Hex } from './digest'
import { LibraryError, type LibraryProse } from './errors'
import { describeContainer, type DescribeOptions, type EntryIdentity } from './identity'
import {
  blobKey, previewKey,
  type BlobWrite, type ExpectedRevision, type LibraryStore, type StoredRecord
} from './store'

/**
 * Les configurations nommées — ce que XCTrack n'a pas.
 *
 * XCTrack ne connaît que « la » configuration courante. Un pilote qui veut une disposition
 * pour la compétition, une pour le vol-bivouac et une pour l'école exporte des fichiers et
 * s'en souvient ; sur AIR³, changer de profil ou réinitialiser **écrase tout**. Ce module
 * garde plusieurs configurations sous un nom, dans le navigateur, sans aucun serveur.
 *
 * ## La règle qui commande tout : on range des octets, jamais un objet
 *
 * Une entrée porte `bytes` — **les octets d'origine, tels quels**. Pas un document
 * reparsé, pas un `JSON.stringify`, pas un texte réindenté. `JSON.parse` est destructeur
 * (`3.0` → `3`, `1.0E7` → `10000000`, `-0.0` → `0`, entiers au-delà de 2^53, clés
 * dupliquées écrasées, clés entières réordonnées) et le noyau a son propre analyseur
 * précisément pour cela. Ranger le résultat d'un analyseur, même fidèle, ajouterait un
 * aller-retour de plus à prouver ; ranger les octets n'en ajoute aucun.
 *
 * Conséquence pratique : **`bytesOf()` rend exactement ce que `add()` a reçu**, et
 * l'empreinte SHA-256 le vérifie à chaque lecture. La carte d'identité, elle, est dérivée
 * du document analysé — elle décrit les octets, elle ne les remplace pas.
 *
 * ## Trois variantes du format, un seul traitement
 *
 * `pages`, `backup` et l'archive `.xczfg` sont rangés de la même façon : leurs octets. Le
 * type de conteneur est *décrit* (`identity.read.containerKind`), il ne change rien au
 * rangement. C'est ce qui fait que l'archive ZIP — flux compressé, horodatage DOS,
 * fichiers annexes — ressort intacte : on ne la reconstruit jamais.
 */

/**
 * La place réservée à l'aperçu. **Aucun aperçu n'est produit ici** : le rendu appartient à
 * `src/render/`, hors périmètre. Ce type existe pour que le jour où l'aperçu arrive, ni
 * le schéma du magasin ni la forme de l'enregistrement n'aient à changer — une migration
 * de base de données sur des configurations de pilotes est un risque qu'on peut s'épargner
 * en réservant la place aujourd'hui.
 */
export interface PreviewRef {
  /** `'image/png'`, `'image/svg+xml'`… déclaré par le producteur, jamais deviné. */
  mediaType: string
  widthPx: number
  heightPx: number
  byteLength: number
  /** L'orientation et le rang de la page représentée : un aperçu est celui d'une page. */
  orientation: 'portrait' | 'landscape'
  pageRank: number
}

/** Une entrée de la bibliothèque, telle qu'elle est rangée et telle qu'elle est rendue. */
export interface LibraryEntry {
  id: string
  /** Le nom que le pilote lui donne : « Comp Annecy », « Vol-biv Alpes », « École ». */
  name: string
  /** Note libre du pilote. Vide par défaut ; jamais interprétée. */
  note: string
  /** Nom du fichier d'origine, conservé pour le proposer à la réexportation. */
  fileName: string
  /** ISO 8601. Date d'ajout à la bibliothèque — pas la date du fichier. */
  addedAt: string
  updatedAt: string
  /** Incrémentée à chaque écriture. C'est le jeton anti-concurrence — voir `store.ts`. */
  revision: number
  byteLength: number
  /** Empreinte des octets rangés. Vérifiée à chaque relecture. */
  sha256: string
  identity: EntryIdentity
  preview?: PreviewRef
}

/**
 * L'identifiant rendu pour un enregistrement dont on n'a même pas pu lire le sien. Ce
 * n'est pas de la prose mais un **identifiant de repli** : il apparaît dans la ligne
 * technique que le pilote recopie s'il signale le problème, et il ne désigne aucune entrée
 * — la suppression qu'il proposerait ne trouverait rien, ce qui est le comportement voulu.
 */
export const UNKNOWN_RECORD_ID = '(inconnu)'

/** Ce qu'on sait d'un enregistrement qu'on n'a pas su relire. */
export interface BrokenEntry {
  id: string
  /**
   * Pourquoi il n'est pas relisible — une **clé de message** et ses valeurs, comme celle
   * d'une `LibraryError`. `libraryProseText(reason, tr)` en fait la phrase.
   */
  reason: LibraryProse
}

/**
 * L'état de la bibliothèque. **Deux listes, toujours** : une entrée illisible n'empêche
 * pas les autres d'être rendues, et n'est pas passée sous silence non plus.
 */
export interface LibrarySnapshot {
  entries: LibraryEntry[]
  broken: BrokenEntry[]
  /** Faux quand le rangement ne survivra pas à l'onglet — à dire au pilote. */
  durable: boolean
}

export interface LibraryChange {
  kind: 'added' | 'updated' | 'removed' | 'cleared' | 'imported'
  id?: string
}

export interface LibraryOptions {
  store: LibraryStore
  /** Options de la carte d'identité — catalogue Pro, version de référence. */
  describe?: DescribeOptions
  /** Injectables pour rendre les tests déterministes. */
  now?: () => Date
  newId?: () => string
  /**
   * Le canal de diffusion entre onglets. `BroadcastChannel` par défaut là où il existe ;
   * `null` pour s'en passer. Voir `subscribe`.
   */
  channel?: BroadcastChannel | null
  channelName?: string
}

export interface AddInput {
  name: string
  bytes: Uint8Array
  fileName: string
  note?: string
}

export interface Library {
  /** Lit l'état complet. Ne charge aucun octet de configuration. */
  read(): Promise<LibrarySnapshot>
  add(input: AddInput): Promise<LibraryEntry>
  /** Les octets d'origine, vérifiés contre l'empreinte enregistrée avec eux. */
  bytesOf(id: string): Promise<Uint8Array>
  rename(id: string, name: string, expectedRevision: number): Promise<LibraryEntry>
  annotate(id: string, note: string, expectedRevision: number): Promise<LibraryEntry>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  /** Pose l'aperçu d'une entrée — les octets viennent d'ailleurs, pas d'ici. */
  setPreview(id: string, bytes: Uint8Array, ref: Omit<PreviewRef, 'byteLength'>, expectedRevision: number): Promise<LibraryEntry>
  previewOf(id: string): Promise<Uint8Array | undefined>
  /**
   * Réinstalle une entrée **telle quelle** — identifiant, dates et empreinte d'origine
   * comprises. Réservé à l'import d'une bibliothèque exportée (`transfer.ts`) : c'est la
   * seule opération qui doit pouvoir rétablir un passé, et non créer un présent.
   * Refuse d'écraser un identifiant déjà présent.
   */
  restore(entry: LibraryEntry, bytes: Uint8Array, preview?: Uint8Array): Promise<void>
  /**
   * Prévient à chaque changement, **y compris ceux d'un autre onglet**. Rend la fonction
   * de désabonnement.
   */
  subscribe(listener: (change: LibraryChange) => void): () => void
  close(): void
}

/* ------------------------------------------------------------------------ validation */

const isString = (value: unknown): value is string => typeof value === 'string'
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * Relit **un** enregistrement, sans faire confiance à rien.
 *
 * Un enregistrement peut venir d'une version antérieure de l'éditeur, d'un import abîmé,
 * ou d'une écriture interrompue. La règle est que l'échec reste **local à l'entrée** :
 * on rend une `BrokenEntry` nommée, la bibliothèque continue de s'afficher, et le pilote
 * peut supprimer la fautive. Une exception ici rendrait toute la bibliothèque inutilisable
 * à cause d'une seule entrée — exactement ce que la consigne écarte.
 *
 * `identity` n'est **pas** validée champ par champ : c'est une description, pas une donnée
 * dont dépend l'intégrité. Elle est recalculable à tout moment depuis les octets. Ce qui
 * est validé, c'est ce sans quoi l'entrée ne peut ni être nommée, ni être relue, ni être
 * vérifiée : identifiant, nom, révision, taille et empreinte.
 */
export function validateRecord(raw: unknown): LibraryEntry | BrokenEntry {
  if (typeof raw !== 'object' || raw === null) {
    return { id: UNKNOWN_RECORD_ID, reason: { key: 'libraryError.recordNotObject' } }
  }
  const record = raw as Record<string, unknown>
  const id = isString(record.id) && record.id !== '' ? record.id : undefined
  if (id === undefined) {
    return { id: UNKNOWN_RECORD_ID, reason: { key: 'libraryError.recordNoId' } }
  }

  const missing: string[] = []
  if (!isString(record.name)) missing.push('name')
  if (!isFiniteNumber(record.revision)) missing.push('revision')
  if (!isFiniteNumber(record.byteLength)) missing.push('byteLength')
  if (!isString(record.sha256) || record.sha256 === '') missing.push('sha256')
  if (typeof record.identity !== 'object' || record.identity === null) missing.push('identity')
  if (missing.length > 0) {
    // Les noms de champs sont ceux du fichier — `name`, `sha256` : des identifiants, joints
    // par `', '` et non par `format.list`, qui en ferait une énumération de prose.
    return {
      id,
      reason: {
        key: 'libraryError.recordBadFields',
        values: { count: missing.length, fields: missing.join(', ') }
      }
    }
  }

  return {
    id,
    name: record.name as string,
    note: isString(record.note) ? record.note : '',
    fileName: isString(record.fileName) ? record.fileName : '',
    addedAt: isString(record.addedAt) ? record.addedAt : '',
    updatedAt: isString(record.updatedAt) ? record.updatedAt : '',
    revision: record.revision as number,
    byteLength: record.byteLength as number,
    sha256: record.sha256 as string,
    identity: record.identity as EntryIdentity,
    ...(typeof record.preview === 'object' && record.preview !== null
      ? { preview: record.preview as PreviewRef }
      : {})
  }
}

const isBroken = (value: LibraryEntry | BrokenEntry): value is BrokenEntry =>
  (value as BrokenEntry).reason !== undefined

/* ------------------------------------------------------------------------- fabrique */

function defaultChannel(name: string): BroadcastChannel | null {
  const constructor = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel
  if (constructor === undefined) return null
  try {
    return new constructor(name)
  } catch {
    // Un navigateur qui refuse le canal ne doit pas empêcher la bibliothèque de marcher :
    // on perd la synchronisation entre onglets, pas le rangement.
    return null
  }
}

function defaultId(): string {
  const uuid = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID
  if (uuid !== undefined) return uuid.call(globalThis.crypto)
  // Repli sans `randomUUID` (contextes non sécurisés) : l'identifiant n'a pas à être
  // imprévisible, seulement unique dans une bibliothèque locale.
  return `xcfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createLibrary(options: LibraryOptions): Library {
  const store = options.store
  const now = options.now ?? (() => new Date())
  const newId = options.newId ?? defaultId
  const channelName = options.channelName ?? 'xcfg-editor.library'
  const channel = options.channel === undefined ? defaultChannel(channelName) : options.channel

  const listeners = new Set<(change: LibraryChange) => void>()

  const receive = (event: MessageEvent): void => {
    const data = event.data as LibraryChange | undefined
    if (data === undefined || typeof data.kind !== 'string') return
    for (const listener of listeners) listener(data)
  }
  channel?.addEventListener('message', receive)

  /**
   * Prévient l'onglet courant **et** les autres. L'onglet qui écrit est prévenu aussi :
   * sans cela, l'appelant devrait rafraîchir lui-même après chaque écriture et se souvenir
   * de le faire — et il oubliera une fois.
   */
  const announce = (change: LibraryChange): void => {
    for (const listener of listeners) listener(change)
    channel?.postMessage(change)
  }

  const readRecord = async (id: string): Promise<LibraryEntry> => {
    const raw = await store.read(id)
    if (raw === undefined) {
      throw new LibraryError('not-found', { key: 'libraryError.notFound', values: { id } })
    }
    const entry = validateRecord(raw)
    if (isBroken(entry)) {
      throw new LibraryError('corrupt', {
        key: 'libraryError.corrupt',
        // La raison est elle-même une clé, traduite au moment de l'affichage : voir
        // `brokenEntryText`. On la passe telle quelle ; l'écran l'assemble.
        values: { id, reason: entry.reason.key }
      })
    }
    return entry
  }

  const write = async (
    entry: LibraryEntry, blobs: BlobWrite[], expected: ExpectedRevision
  ): Promise<void> => {
    // `LibraryEntry` est un objet plat de valeurs clonables : c'est ce que le clonage
    // structuré d'IndexedDB sait ranger. Le cast dit à TypeScript ce que la forme garantit
    // déjà — un enregistrement porte `id` et `revision`.
    await store.put(entry as unknown as StoredRecord, blobs, expected)
  }

  const openOrFail = async (bytes: Uint8Array, fileName: string): Promise<Container> => {
    try {
      return await openContainer(bytes, fileName)
    } catch (error) {
      throw new LibraryError(
        'unreadable',
        {
          key: 'libraryError.notReadable',
          values: { name: fileName, detail: technicalDetail(error) }
        },
        { cause: error }
      )
    }
  }

  const bumped = (entry: LibraryEntry): LibraryEntry =>
    ({ ...entry, revision: entry.revision + 1, updatedAt: now().toISOString() })

  return {
    async read() {
      const raws = await store.readAll()
      const entries: LibraryEntry[] = []
      const broken: BrokenEntry[] = []
      for (const raw of raws) {
        const result = validateRecord(raw)
        if (isBroken(result)) broken.push(result)
        else entries.push(result)
      }
      // Les plus récemment ajoutées d'abord : c'est l'ordre où le pilote cherche ce qu'il
      // vient de ranger. `addedAt` peut être vide sur un enregistrement ancien — le tri
      // le renvoie alors en queue plutôt que d'échouer.
      entries.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      return { entries, broken, durable: store.durable }
    },

    async add(input) {
      // Copie défensive : l'appelant garde souvent une vue sur le `ArrayBuffer` d'un
      // `FileReader` et peut le réutiliser. Ranger la vue, c'est ranger ce qu'elle
      // deviendra, pas ce qu'elle était.
      const bytes = input.bytes.slice()
      const container = await openOrFail(bytes, input.fileName)
      const timestamp = now().toISOString()

      const entry: LibraryEntry = {
        id: newId(),
        name: input.name,
        note: input.note ?? '',
        fileName: input.fileName,
        addedAt: timestamp,
        updatedAt: timestamp,
        revision: 1,
        byteLength: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        identity: describeContainer(container, options.describe ?? {})
      }

      await write(entry, [{ key: blobKey(entry.id), bytes }], { kind: 'absent' })
      announce({ kind: 'added', id: entry.id })
      return entry
    },

    async bytesOf(id) {
      const entry = await readRecord(id)
      const bytes = await store.readBlob(blobKey(id))
      if (bytes === undefined) {
        throw new LibraryError('integrity', {
          key: 'libraryError.bytesMissing', values: { name: entry.name }
        })
      }
      if (bytes.byteLength !== entry.byteLength || !sameDigest(await sha256Hex(bytes), entry.sha256)) {
        // On refuse de rendre des octets dont on ne peut pas garantir qu'ils sont ceux
        // rangés. Rendre « à peu près » la configuration d'un pilote est pire que ne rien
        // rendre : il volerait avec, sans savoir ce qui a changé.
        throw new LibraryError('integrity', {
          key: 'libraryError.digestChanged', values: { name: entry.name }
        })
      }
      return bytes
    },

    async rename(id, name, expectedRevision) {
      const entry = await readRecord(id)
      const updated = bumped({ ...entry, name })
      await write(updated, [], { kind: 'revision', value: expectedRevision })
      announce({ kind: 'updated', id })
      return updated
    },

    async annotate(id, note, expectedRevision) {
      const entry = await readRecord(id)
      const updated = bumped({ ...entry, note })
      await write(updated, [], { kind: 'revision', value: expectedRevision })
      announce({ kind: 'updated', id })
      return updated
    },

    async remove(id) {
      await store.delete(id)
      announce({ kind: 'removed', id })
    },

    async clear() {
      await store.clear()
      announce({ kind: 'cleared' })
    },

    async setPreview(id, bytes, ref, expectedRevision) {
      const entry = await readRecord(id)
      const preview: PreviewRef = { ...ref, byteLength: bytes.byteLength }
      const updated = bumped({ ...entry, preview })
      await write(updated, [{ key: previewKey(id), bytes: bytes.slice() }],
        { kind: 'revision', value: expectedRevision })
      announce({ kind: 'updated', id })
      return updated
    },

    previewOf(id) {
      return store.readBlob(previewKey(id))
    },

    async restore(entry, bytes, preview) {
      const blobs: BlobWrite[] = [{ key: blobKey(entry.id), bytes: bytes.slice() }]
      if (preview !== undefined) blobs.push({ key: previewKey(entry.id), bytes: preview.slice() })
      await write(entry, blobs, { kind: 'absent' })
      announce({ kind: 'imported', id: entry.id })
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    close() {
      listeners.clear()
      channel?.removeEventListener('message', receive)
      channel?.close()
      store.close()
    }
  }
}
