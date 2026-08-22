import { readZip, writeZip, type ZipEntry } from '../core/zip'
import { technicalDetail } from '../core/technicalDetail'
import { sameDigest, sha256Hex } from './digest'
import { LibraryError, type LibraryProse } from './errors'
import { UNKNOWN_RECORD_ID, type Library, type LibraryEntry } from './library'

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
 * ```
 *
 * L'archive s'ouvre avec n'importe quel outil de décompression : un pilote qui perd
 * l'éditeur récupère ses `.xcfg` à la main. C'est délibéré — une sauvegarde qu'on ne peut
 * lire qu'avec l'outil qui l'a écrite n'est pas une sauvegarde.
 *
 * ## L'archive n'emporte AUCUNE vignette, et c'est une décision de vie privée
 *
 * Depuis que l'éditeur produit des vignettes (`src/ui/libraryPreview.ts`), chaque entrée
 * peut porter l'**image** d'une de ses pages. Une image échappe à tout ce que le projet
 * sait faire pour protéger le pilote : l'anonymisation opère sur le document JSON, et
 * aucune inspection du JSON d'une archive ne verrait le nom d'un proche resté en pixels.
 * Une archive est précisément ce qui **sort** du navigateur — on l'envoie, on la dépose
 * sur un disque partagé, on la joint à un message.
 *
 * Deux raisons se rejoignent, et aucune ne suffit seule :
 *
 * 1. **La vie privée.** Même masquée, une vignette reste une image de la page du pilote.
 *    Ce qu'on ne met pas dans l'archive ne peut pas fuir avec elle.
 * 2. **Elle ne montrerait rien.** Le SVG rangé tire son habillage de `src/ui/style.css` :
 *    hors de l'éditeur, il ne se dessine pas.
 *
 * La vignette n'est donc **ni écrite à l'export, ni annoncée dans le manifeste, ni crue à
 * l'import** — une fiche qui en annoncerait une mentirait, et l'entrée rétablie afficherait
 * un cadre vide pour toujours. L'éditeur la refabrique tout seul, en local, à partir des
 * octets rétablis : ce qui est perdu se retrouve en une seconde, et sans voyager.
 */

export const LIBRARY_FORMAT = 'xcfg-editor.library'
export const LIBRARY_FORMAT_VERSION = 1

const MANIFEST_NAME = 'bibliotheque.json'

/**
 * Une fiche du manifeste : l'entrée, plus l'endroit où ses octets sont dans l'archive.
 *
 * `entry` est écrite **sans son `preview`** : l'archive ne transporte aucune image, voir
 * le commentaire de tête. Aucun autre champ n'est retiré.
 */
interface ManifestItem {
  entry: LibraryEntry
  file: string
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

    // La fiche part sans la vignette : ni les octets de l'image, ni la ligne qui
    // l'annonce. Voir le § « L'archive n'emporte AUCUNE vignette ».
    const { preview: _preview, ...withoutPreview } = entry
    items.push({ entry: withoutPreview, file })
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
  /**
   * La raison, sur `rejected` — une **clé de message** et ses valeurs, comme celle d'une
   * `LibraryError`. `libraryProseText(reason, tr)` en fait la phrase.
   */
  reason?: LibraryProse
}

export interface ImportReport {
  exportedAt: string | undefined
  results: ImportResult[]
}

export interface ImportOptions {
  /** Générateur d'identifiants pour les entrées rétablies en double. */
  newId?: () => string
  /**
   * Suffixe ajouté au nom d'une entrée rétablie en double. Il est **passé** par l'écran,
   * qui seul connaît la langue du pilote : `tr.t('libraryError.importedSuffix')`. Le repli
   * français ne sert qu'aux appels sans interface — les tests, et eux seuls.
   */
  duplicateSuffix?: string
}

function readManifest(text: string): Manifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new LibraryError(
      'unreadable', { key: 'libraryError.manifestUnreadable' }, { cause: error }
    )
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new LibraryError('unreadable', { key: 'libraryError.manifestEmpty' })
  }
  const manifest = parsed as Partial<Manifest>
  if (manifest.format !== LIBRARY_FORMAT) {
    throw new LibraryError('unreadable', { key: 'libraryError.notALibrary' })
  }
  if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion > LIBRARY_FORMAT_VERSION) {
    throw new LibraryError('unreadable', {
      key: 'libraryError.futureFormat',
      // Le numéro de format part en `string` : c'est un identifiant de schéma, pas une
      // quantité. « 1 000 » ne se lit dans aucune archive.
      values: { version: String(manifest.formatVersion) }
    })
  }
  if (!Array.isArray(manifest.items)) {
    throw new LibraryError('unreadable', { key: 'libraryError.manifestNoItems' })
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
      { key: 'libraryError.notAnArchive', values: { detail: technicalDetail(error) } },
      { cause: error }
    )
  }

  const byName = new Map(members.map((member) => [member.name, member]))
  const manifestMember = byName.get(MANIFEST_NAME)
  if (manifestMember === undefined) {
    throw new LibraryError('unreadable', {
      key: 'libraryError.manifestMissing', values: { file: MANIFEST_NAME }
    })
  }

  const manifest = readManifest(new TextDecoder().decode(manifestMember.data))
  const existing = new Map((await library.read()).entries.map((entry) => [entry.id, entry]))
  const suffix = options.duplicateSuffix ?? ' (importé)'
  const results: ImportResult[] = []

  for (const item of manifest.items) {
    const entry = item.entry
    if (typeof entry?.id !== 'string' || typeof item.file !== 'string') {
      results.push({
        sourceId: UNKNOWN_RECORD_ID, name: '', outcome: 'rejected',
        reason: { key: 'libraryError.itemManifestUnreadable' }
      })
      continue
    }

    const member = byName.get(item.file)
    if (member === undefined) {
      results.push({
        sourceId: entry.id, name: entry.name, outcome: 'rejected',
        reason: { key: 'libraryError.itemMemberMissing', values: { file: item.file } }
      })
      continue
    }

    const digest = await sha256Hex(member.data)
    if (!sameDigest(digest, entry.sha256)) {
      results.push({
        sourceId: entry.id, name: entry.name, outcome: 'rejected',
        reason: { key: 'libraryError.itemDigestMismatch' }
      })
      continue
    }

    const clash = existing.get(entry.id)
    if (clash !== undefined && sameDigest(clash.sha256, entry.sha256)) {
      results.push({ sourceId: entry.id, name: entry.name, outcome: 'already-present' })
      continue
    }

    /*
     * Une fiche venue d'ailleurs peut annoncer une vignette — une archive écrite à la
     * main, ou par une version de cet éditeur qui en écrivait encore. On ne la croit
     * pas : l'image n'est pas dans l'archive, et une entrée qui en annoncerait une sans
     * l'avoir montrerait un cadre vide sans que rien ne l'explique.
     */
    const restored: LibraryEntry = { ...entry }
    delete restored.preview

    if (clash === undefined) {
      await library.restore(restored, member.data)
      results.push({ sourceId: entry.id, name: entry.name, outcome: 'imported', id: entry.id })
      existing.set(entry.id, restored)
      continue
    }

    const id = (options.newId ?? (() => `${entry.id}-2`))()
    const renamed: LibraryEntry = { ...restored, id, name: `${entry.name}${suffix}` }
    await library.restore(renamed, member.data)
    results.push({ sourceId: entry.id, name: renamed.name, outcome: 'duplicated', id })
    existing.set(id, renamed)
  }

  return { exportedAt: manifest.exportedAt, results }
}
