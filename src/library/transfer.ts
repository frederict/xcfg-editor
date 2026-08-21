import { readZip, writeZip, type ZipEntry } from '../core/zip'
import { formatTechnicalDetail } from '../core/technicalDetail'
import { sameDigest, sha256Hex } from './digest'
import { LibraryError } from './errors'
import type { Library, LibraryEntry } from './library'

/**
 * Sortir la bibliothèque du navigateur, et l'y remettre.
 *
 * ## Pourquoi ce module existe, et pourquoi il n'est pas optionnel
 *
 * IndexedDB n'est **pas** une sauvegarde. Un navigateur purge le stockage d'un site peu
 * visité (Safari : sept jours sans visite, quel que soit le réglage de persistance), un
 * pilote change de machine, un « effacer les données de navigation » emporte tout. Sans
 * un export complet, ranger « Comp Annecy » dans la bibliothèque promettrait au pilote une
 * sécurité qu'on ne tient pas — c'est-à-dire exactement la peur qu'on prétend soigner.
 *
 * ## Une archive ZIP, pas un gros JSON
 *
 * Le format d'export est une archive ZIP écrite par `src/core/zip.ts` — aucune dépendance
 * ajoutée, et surtout : **les octets de chaque configuration y voyagent comme un membre à
 * part, tels quels.** Un export JSON obligerait à encoder ces octets (base64, ou pire, à
 * réécrire le document), et rouvrirait la porte que tout le projet tient fermée.
 *
 * Le manifeste, lui, est du JSON produit par `JSON.stringify`. C'est **notre** métadonnée
 * — noms, dates, empreintes — jamais le fichier du pilote. Aucune fidélité d'octet n'est
 * en jeu, et l'analyseur du noyau n'a rien à faire là.
 *
 * ```
 * bibliotheque.json      le manifeste : format, date, une fiche par entrée
 * entrees/<id>.xcfg      les octets d'origine, intacts
 * apercus/<id>.png       l'aperçu, quand il existe
 * ```
 *
 * L'archive s'ouvre avec n'importe quel outil de décompression : un pilote qui perd
 * l'éditeur récupère ses `.xcfg` à la main. C'est délibéré — une sauvegarde qu'on ne peut
 * lire qu'avec l'outil qui l'a écrite n'est pas une sauvegarde.
 */

export const LIBRARY_FORMAT = 'xcfg-editor.library'
export const LIBRARY_FORMAT_VERSION = 1

const MANIFEST_NAME = 'bibliotheque.json'

/** Une fiche du manifeste : l'entrée, plus l'endroit où ses octets sont dans l'archive. */
interface ManifestItem {
  entry: LibraryEntry
  file: string
  previewFile?: string
}

interface Manifest {
  format: string
  formatVersion: number
  exportedAt: string
  items: ManifestItem[]
}

/**
 * Horodatage DOS, en UTC. Un ZIP ne sait pas dire « fuseau » : écrire l'heure locale
 * rendrait l'archive différente selon la machine qui l'exporte, pour les mêmes entrées.
 * Le plancher à 1980 est celui du format lui-même.
 */
function dosStamp(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(1980, date.getUTCFullYear())
  return {
    dosDate: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
    dosTime: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) |
      Math.floor(date.getUTCSeconds() / 2)
  }
}

function parsedDate(iso: string, fallback: Date): Date {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? fallback : date
}

const extensionOf = (entry: LibraryEntry): string =>
  entry.identity.read.containerKind === 'xczfg' ? 'xczfg' : 'xcfg'

/**
 * Écrit toute la bibliothèque dans une archive.
 *
 * Les entrées illisibles ne sont **pas** exportées — on ne sait pas ce qu'elles
 * contiennent — mais leur nombre est rendu à l'appelant, qui doit le dire : une sauvegarde
 * silencieusement incomplète est un piège.
 */
export async function exportLibrary(
  library: Library, at: Date = new Date()
): Promise<{ archive: Uint8Array; exported: number; skipped: string[] }> {
  const snapshot = await library.read()
  const items: ManifestItem[] = []
  const members: ZipEntry[] = []
  const skipped = snapshot.broken.map((broken) => broken.id)

  for (const entry of snapshot.entries) {
    let bytes: Uint8Array
    try {
      bytes = await library.bytesOf(entry.id)
    } catch {
      // Octets absents ou empreinte fausse : on n'écrit pas dans la sauvegarde ce qu'on
      // refuserait de rendre au pilote.
      skipped.push(entry.id)
      continue
    }

    const stamp = dosStamp(parsedDate(entry.addedAt, at))
    const file = `entrees/${entry.id}.${extensionOf(entry)}`
    members.push({
      name: file,
      data: bytes,
      // Une archive `.xczfg` est déjà compressée : la recompresser gonfle l'export sans
      // rien gagner. Même raisonnement que `readZip` sur les images déjà compressées.
      stored: entry.identity.read.containerKind === 'xczfg',
      ...stamp
    })

    const item: ManifestItem = { entry, file }

    const preview = await library.previewOf(entry.id)
    if (preview !== undefined && entry.preview !== undefined) {
      const previewFile = `apercus/${entry.id}`
      members.push({ name: previewFile, data: preview, stored: true, ...stamp })
      item.previewFile = previewFile
    }

    items.push(item)
  }

  const manifest: Manifest = {
    format: LIBRARY_FORMAT,
    formatVersion: LIBRARY_FORMAT_VERSION,
    exportedAt: at.toISOString(),
    items
  }

  const archive = await writeZip([
    {
      name: MANIFEST_NAME,
      data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      stored: false,
      ...dosStamp(at)
    },
    ...members
  ])

  return { archive, exported: items.length, skipped }
}

/* --------------------------------------------------------------------------- import */

export type ImportOutcome =
  /** Entrée rétablie. */
  | 'imported'
  /** Déjà présente, aux mêmes octets : rien à faire. */
  | 'already-present'
  /** Identifiant déjà pris par une entrée différente : rétablie sous un nouveau nom. */
  | 'duplicated'
  /** Octets absents de l'archive, ou empreinte fausse : rien n'est écrit. */
  | 'rejected'

export interface ImportResult {
  /** L'identifiant tel qu'il est dans l'archive. */
  sourceId: string
  name: string
  outcome: ImportOutcome
  /** L'identifiant réellement écrit, quand il diffère (`duplicated`). */
  id?: string
  /** La raison, sur `rejected`. */
  reason?: string
}

export interface ImportReport {
  exportedAt: string | undefined
  results: ImportResult[]
}

export interface ImportOptions {
  /** Générateur d'identifiants pour les entrées rétablies en double. */
  newId?: () => string
  /** Suffixe ajouté au nom d'une entrée rétablie en double. */
  duplicateSuffix?: string
}

function readManifest(text: string): Manifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new LibraryError('unreadable', 'Le manifeste de l’archive n’est pas du JSON.', { cause: error })
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new LibraryError('unreadable', 'Le manifeste de l’archive est vide.')
  }
  const manifest = parsed as Partial<Manifest>
  if (manifest.format !== LIBRARY_FORMAT) {
    throw new LibraryError(
      'unreadable',
      'Ce fichier n’est pas une bibliothèque exportée par cet éditeur.'
    )
  }
  if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion > LIBRARY_FORMAT_VERSION) {
    throw new LibraryError(
      'unreadable',
      `Cette bibliothèque a été écrite par une version postérieure de l’éditeur ` +
      `(format ${String(manifest.formatVersion)}). Mettez l’éditeur à jour avant de l’importer.`
    )
  }
  if (!Array.isArray(manifest.items)) {
    throw new LibraryError('unreadable', 'Le manifeste ne liste aucune entrée.')
  }
  return manifest as Manifest
}

/**
 * Rétablit une bibliothèque exportée, entrée par entrée.
 *
 * **Aucune entrée n'écrase une entrée existante.** Une bibliothèque importée par-dessus
 * une autre est le cas normal — un pilote qui restaure sur une machine déjà utilisée — et
 * perdre en silence ce qui était là serait la pire réponse possible. Trois cas :
 *
 * - même identifiant, mêmes octets : on ne fait rien, l'entrée est déjà là ;
 * - même identifiant, octets différents : on rétablit sous un identifiant neuf, avec un
 *   nom suffixé, et les deux coexistent — au pilote de trancher ;
 * - empreinte fausse ou octets absents : **rien n'est écrit**, et le rapport le dit.
 *
 * L'import ne s'arrête jamais à la première entrée fautive : une archive dont un membre
 * est abîmé doit rendre tout le reste.
 */
export async function importLibrary(
  library: Library, archive: Uint8Array, options: ImportOptions = {}
): Promise<ImportReport> {
  let members: ZipEntry[]
  try {
    members = await readZip(archive)
  } catch (error) {
    throw new LibraryError(
      'unreadable',
      'Ce fichier n’est pas une archive de bibliothèque, ou il est abîmé. ' +
      `${formatTechnicalDetail(error)}`,
      { cause: error }
    )
  }

  const byName = new Map(members.map((member) => [member.name, member]))
  const manifestMember = byName.get(MANIFEST_NAME)
  if (manifestMember === undefined) {
    throw new LibraryError(
      'unreadable',
      `L’archive ne contient pas de ${MANIFEST_NAME} : ce n’est pas une bibliothèque exportée.`
    )
  }

  const manifest = readManifest(new TextDecoder().decode(manifestMember.data))
  const existing = new Map((await library.read()).entries.map((entry) => [entry.id, entry]))
  const suffix = options.duplicateSuffix ?? ' (importé)'
  const results: ImportResult[] = []

  for (const item of manifest.items) {
    const entry = item.entry
    if (typeof entry?.id !== 'string' || typeof item.file !== 'string') {
      results.push({ sourceId: '(inconnu)', name: '', outcome: 'rejected', reason: 'fiche illisible dans le manifeste' })
      continue
    }

    const member = byName.get(item.file)
    if (member === undefined) {
      results.push({ sourceId: entry.id, name: entry.name, outcome: 'rejected', reason: `membre ${item.file} absent de l’archive` })
      continue
    }

    const digest = await sha256Hex(member.data)
    if (!sameDigest(digest, entry.sha256)) {
      results.push({
        sourceId: entry.id, name: entry.name, outcome: 'rejected',
        reason: 'les octets de l’archive ne rendent pas l’empreinte annoncée'
      })
      continue
    }

    const clash = existing.get(entry.id)
    if (clash !== undefined && sameDigest(clash.sha256, entry.sha256)) {
      results.push({ sourceId: entry.id, name: entry.name, outcome: 'already-present' })
      continue
    }

    const preview = item.previewFile === undefined ? undefined : byName.get(item.previewFile)?.data
    if (clash === undefined) {
      await library.restore(entry, member.data, preview)
      results.push({ sourceId: entry.id, name: entry.name, outcome: 'imported', id: entry.id })
      existing.set(entry.id, entry)
      continue
    }

    const id = (options.newId ?? (() => `${entry.id}-2`))()
    const renamed: LibraryEntry = { ...entry, id, name: `${entry.name}${suffix}` }
    await library.restore(renamed, member.data, preview)
    results.push({ sourceId: entry.id, name: renamed.name, outcome: 'duplicated', id })
    existing.set(id, renamed)
  }

  return { exportedAt: manifest.exportedAt, results }
}
