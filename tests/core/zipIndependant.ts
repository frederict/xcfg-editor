import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32, inflateRawSync } from 'node:zlib'

/**
 * # Relire une archive **sans notre lecteur**
 *
 * ## Pourquoi ce fichier existe
 *
 * `tests/library/transfer.test.ts` portait un test intitulé « l'archive s'ouvre avec
 * n'importe quel outil ». Il la rouvrait avec `readZip`, c'est-à-dire avec nous. Un
 * lecteur qui relit ce qu'il vient d'écrire ne mesure que sa cohérence avec lui-même, et
 * il est aveugle à tout ce qu'il n'écrit ni ne lit. Mesuré : `writeZip` passé à
 * `crc = 0`, la suite entière reste verte — **2 144 tests, aucun tué** — et `unzip -t`
 * refuse le fichier que le pilote vient de télécharger (« bad CRC », code de retour 2).
 * `readZip` ne lit jamais le CRC ; il n'avait donc rien à dire.
 *
 * Les deux fichiers concernés sont ceux que le pilote **emporte** : le `.xczfg` réexporté
 * et l'archive de bibliothèque, qui est sa seule sauvegarde. Une archive que 7-Zip,
 * l'Explorateur Windows ou le Finder refusent est un fichier perdu.
 *
 * ## Ce que ce module apporte, et ce qu'il n'apporte pas
 *
 * Deux témoins **extérieurs à `src/`**, dans cet ordre de force :
 *
 * 1. `unzip` du système — le vrai juge, mais il n'est pas partout (Windows nu, image CI
 *    minimale). `UNZIP_PRESENT` le dit, et le test qui s'en sert se saute plutôt que de
 *    se dégrader en silence.
 * 2. `relireSansNous()` — un lecteur de répertoire central écrit ici, qui décompresse
 *    avec la **zlib de Node** (`inflateRawSync`) et recalcule le CRC avec la **zlib de
 *    Node** (`zlib.crc32`). Aucune ligne de `src/` n'y participe : si notre table CRC ou
 *    notre déflateur se trompent, la comparaison casse. Celui-là tourne partout.
 *
 * Ce qu'il ne prouve pas : la conformité aux **octets** d'une archive écrite par XCTrack.
 * Ce flux-là dépend de la zlib du moteur, et le test qui le prouve est plus bas dans
 * `zip.test.ts`, sauté faute de fixture non anonymisée.
 */

/** Ce qu'un tiers lit d'un membre, tel qu'il est écrit dans l'archive. */
export interface MembreRelu {
  name: string
  /** Les octets décompressés par la zlib de Node, jamais par `readZip`. */
  data: Uint8Array
  /** Le CRC32 écrit au décalage 16 de l'en-tête de répertoire central. */
  crcCentral: number
  /**
   * Le CRC32 du côté **local** : celui du descripteur de données quand le drapeau 3 est
   * levé (notre mode flux), celui de l'en-tête local sinon. `readZip` ne lit que le
   * répertoire central ; la moitié que les extracteurs lisent n'était couverte par rien.
   */
  crcLocal: number
  /** Le CRC32 recalculé sur `data` par `zlib.crc32`. La référence. */
  crcReel: number
  methodCentral: number
  dosTimeCentral: number
  dosDateCentral: number
  dosTimeLocal: number
  dosDateLocal: number
}

const SIGNATURE_EOCD = 0x06054b50
const SIGNATURE_CENTRAL = 0x02014b50
const SIGNATURE_DESCRIPTEUR = 0x08074b50

/**
 * Parcourt le répertoire central et rend, membre par membre, ce qu'un outil extérieur y
 * trouve. Volontairement naïf et sans plafond : ce n'est pas du code de production, il ne
 * lit que des archives que la suite vient de fabriquer.
 */
export function relireSansNous(archive: Uint8Array): MembreRelu[] {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)

  let eocd = -1
  for (let i = archive.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === SIGNATURE_EOCD) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('archive sans répertoire central')

  const count = view.getUint16(eocd + 10, true)
  let i = view.getUint32(eocd + 16, true)
  const membres: MembreRelu[] = []

  for (let read = 0; read < count; read++) {
    if (view.getUint32(i, true) !== SIGNATURE_CENTRAL) {
      throw new Error(`en-tête central attendu à ${i}`)
    }
    const methodCentral = view.getUint16(i + 10, true)
    const compressedSize = view.getUint32(i + 20, true)
    const nameLength = view.getUint16(i + 28, true)
    const extraLength = view.getUint16(i + 30, true)
    const commentLength = view.getUint16(i + 32, true)
    const localOffset = view.getUint32(i + 42, true)
    const name = new TextDecoder().decode(archive.subarray(i + 46, i + 46 + nameLength))

    const localFlags = view.getUint16(localOffset + 6, true)
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = archive.subarray(dataStart, dataStart + compressedSize)
    const data = methodCentral === 0
      ? compressed.slice()
      : new Uint8Array(inflateRawSync(compressed))

    let crcLocal = view.getUint32(localOffset + 14, true)
    if ((localFlags & 0x08) !== 0) {
      // Le descripteur suit les octets comprimés. Sa signature est facultative : PKWARE
      // ne l'exige pas, et les extracteurs acceptent les deux formes.
      const at = dataStart + compressedSize
      crcLocal = view.getUint32(at, true) === SIGNATURE_DESCRIPTEUR
        ? view.getUint32(at + 4, true)
        : view.getUint32(at, true)
    }

    membres.push({
      name,
      data,
      crcCentral: view.getUint32(i + 16, true),
      crcLocal,
      crcReel: crc32(data) >>> 0,
      methodCentral,
      dosTimeCentral: view.getUint16(i + 12, true),
      dosDateCentral: view.getUint16(i + 14, true),
      dosTimeLocal: view.getUint16(localOffset + 10, true),
      dosDateLocal: view.getUint16(localOffset + 12, true)
    })

    i += 46 + nameLength + extraLength + commentLength
  }

  return membres
}

/**
 * `unzip` est-il installé ? Un test qui l'appelle sans l'avoir demandé rougirait sur un
 * poste qui n'en a pas, pour une raison qui n'a rien à voir avec ce dépôt.
 */
export const UNZIP_PRESENT = (() => {
  try {
    execFileSync('unzip', ['-v'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

/**
 * Soumet l'archive à `unzip -t` et rend sa sortie. Lève dès que le code de retour n'est
 * pas nul — c'est exactement le geste du pilote qui double-clique sur son fichier.
 */
export function unzipTest(archive: Uint8Array, nom = 'essai.zip'): string {
  const dossier = mkdtempSync(join(tmpdir(), 'xcfg-zip-'))
  const chemin = join(dossier, nom)
  try {
    writeFileSync(chemin, archive)
    return execFileSync('unzip', ['-t', chemin], { encoding: 'utf8' })
  } catch (error) {
    // Sans cela, l'échec se lit « Command failed: unzip -t /tmp/… », et la ligne utile —
    // « bad CRC e8a831e1 (should be 00000000) » — reste dans `stdout`, invisible.
    const sortie = (error as { stdout?: string }).stdout ?? ''
    throw new Error(`unzip -t a refusé l'archive :\n${sortie}`)
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
}
