export interface ZipEntry {
  name: string
  data: Uint8Array
  /** Vrai si l'entrée était stockée sans compression (méthode 0). */
  stored: boolean
  /** Horodatage DOS d'origine, à restituer tel quel à l'écriture. */
  dosTime: number
  dosDate: number
}

const SIGNATURE_CENTRAL = 0x02014b50

/**
 * Ce qu'une archive n'a pas le droit de dépasser une fois décompressée.
 *
 * ## Pourquoi un plafond, et pourquoi ces valeurs-là
 *
 * Un `.xczfg` ou une archive de bibliothèque arrive **d'ailleurs** : le produit invite le
 * pilote à échanger ses configurations, et une issue GitHub en apporte. Le taux de
 * compression de `deflate` sur des octets répétés dépasse 1000 : quelques dizaines de
 * kilo-octets suffisent à réclamer plusieurs gigaoctets, et l'onglet meurt sans un mot —
 * le pilote n'apprend rien, sinon que l'outil est fragile.
 *
 * ⚠️ **Ces trois nombres sont choisis, pas mesurés**, et le commentaire doit le dire. Ce
 * qui est mesuré, c'est ce qu'ils doivent laisser passer : le plus gros membre du corpus
 * fait 78 Ko, l'archive de bibliothèque la plus lourde 7,8 Ko. Le plafond par membre est
 * quatre cents fois au-dessus, celui de l'archive entière mille six cents fois. Un
 * fichier réel ne les rencontrera pas ; une archive qui les rencontre n'est pas un
 * fichier réel.
 *
 * Le nombre de membres est plafonné aussi : le répertoire central en annonce jusqu'à
 * 65 535, et chacun coûte une décompression.
 */
export interface ZipLimits {
  /** Octets décompressés d'un seul membre. */
  entryBytes: number
  /** Octets décompressés de toute l'archive. */
  totalBytes: number
  /** Nombre de membres. */
  entryCount: number
}

export const ZIP_LIMITS: ZipLimits = {
  entryBytes: 32 * 1024 * 1024,
  totalBytes: 128 * 1024 * 1024,
  entryCount: 4096
}

/** Le dépassement d'un plafond, à distinguer d'une panne de décompression. */
class ZipOverflow extends Error {}

/**
 * Décompresse, en s'arrêtant net au-delà de `limit`.
 *
 * Le contrôle est **ici** et pas seulement sur la taille annoncée par le répertoire
 * central : cette taille est une déclaration de l'archive, donc de celui qui l'a écrite.
 * Une archive hostile annonce 12 octets et en rend quatre milliards.
 */
async function inflateRaw(data: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  // `as BufferSource` est nécessaire : depuis que Uint8Array est générique dans lib.dom,
  // un Uint8Array nu n'est plus assignable à BufferSource. Le code s'exécute sans, mais
  // TypeScript le refuse.
  //
  // ⚠️ Les deux promesses de l'écrivain sont **attrapées**, et pas seulement ignorées par
  // `void` : quand on annule le lecteur au-dessus du plafond, elles échouent en
  // `ABORT_ERR` et le rejet, n'ayant personne, tue le processus de test. Rien n'est perdu
  // à les taire — un flux qui refuse l'écriture fait échouer `reader.read()`, juste
  // dessous, et c'est cette panne-là qu'on veut voir.
  void writer.write(data as BufferSource).catch(() => {})
  void writer.close().catch(() => {})
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      // `cancel` libère le flux : sans lui, le reste de la bombe continue de se
      // décompresser derrière l'exception qu'on est en train de lever.
      void reader.cancel()
      // Le plafond franchi n'est pas nommé ici : `limit` est le budget restant, qui vaut
      // tantôt celui d'un membre, tantôt ce qui reste à l'archive. Seul l'appelant sait
      // lequel des deux dire.
      throw new ZipOverflow()
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
  return out
}

/**
 * Lit une archive par son répertoire central, localisé depuis la fin par l'EOCD. On ne
 * balaie pas le tampon à la recherche de la signature : elle peut apparaître par hasard
 * dans des données compressées. On ne parcourt pas non plus les en-têtes locaux : en
 * mode flux, ils portent des tailles nulles et ne renseignent rien.
 */
export async function readZip(
  buffer: Uint8Array, limits: ZipLimits = ZIP_LIMITS
): Promise<ZipEntry[]> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const entries: ZipEntry[] = []

  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('archive sans répertoire central')

  const count = view.getUint16(eocd + 10, true)
  if (count > limits.entryCount) {
    throw new Error(`archive de ${count} membres, au-delà de ${limits.entryCount}`)
  }
  let i = view.getUint32(eocd + 16, true)
  let inflated = 0

  for (let read = 0; read < count; read++) {
    if (view.getUint32(i, true) !== SIGNATURE_CENTRAL) {
      throw new Error(`en-tête central attendu à ${i}`)
    }
    const compressedSize = view.getUint32(i + 20, true)
    // Offset 24 du répertoire central : la taille annoncée une fois décompressée. La
    // lire coûte quatre octets et refuse la bombe avant d'avoir alloué quoi que ce soit ;
    // `inflateRaw` reprend le contrôle pour l'archive qui aurait menti.
    const announced = view.getUint32(i + 24, true)
    if (announced > limits.entryBytes) {
      throw new Error(`membre annoncé à ${announced} octets, au-delà de ${limits.entryBytes}`)
    }
    const nameLength = view.getUint16(i + 28, true)
    const extraLength = view.getUint16(i + 30, true)
    const commentLength = view.getUint16(i + 32, true)
    const localOffset = view.getUint32(i + 42, true)
    const name = new TextDecoder().decode(buffer.subarray(i + 46, i + 46 + nameLength))

    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    const method = view.getUint16(i + 10, true)

    // Le budget du membre est le plus petit des deux plafonds : celui d'un membre, et ce
    // qui reste à l'archive. Sans le second, mille membres de 32 Mo passeraient un par un.
    const room = Math.min(limits.entryBytes, limits.totalBytes - inflated)
    const tooBig = room < limits.entryBytes
      ? `archive décompressée au-delà de ${limits.totalBytes} octets`
      : `membre décompressé au-delà de ${limits.entryBytes} octets`
    let data: Uint8Array
    try {
      data = method === 0 ? compressed.slice() : await inflateRaw(compressed, room)
    } catch (error) {
      if (!(error instanceof ZipOverflow)) throw error
      throw new Error(tooBig)
    }
    inflated += data.byteLength
    // Un membre `stored` n'est pas passé par `inflateRaw` : c'est ici, et ici seulement,
    // que son poids rencontre le plafond de l'archive.
    if (inflated > limits.totalBytes) {
      throw new Error(`archive décompressée au-delà de ${limits.totalBytes} octets`)
    }

    entries.push({
      name,
      data,
      // La méthode est conservée : une archive contenant une image déjà compressée la
      // stocke telle quelle, et la réécrire en deflate casserait l'identité d'octet.
      stored: method === 0,
      dosTime: view.getUint16(i + 12, true),
      dosDate: view.getUint16(i + 14, true)
    })

    i += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  void writer.write(data as BufferSource)
  void writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
  return out
}

/** Réécrit une archive en mode flux, comme le fait XCTrack. */
export async function writeZip(entries: ZipEntry[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name)
    // Une entrée stockée le reste : la recompresser changerait ses octets.
    const compressed = entry.stored ? entry.data : await deflateRaw(entry.data)
    const method = entry.stored ? 0 : 8
    const crc = crc32(entry.data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0808, true) // descripteur de données + nom en UTF-8
    local.setUint16(8, method, true)
    local.setUint16(10, entry.dosTime, true)
    local.setUint16(12, entry.dosDate, true)
    // CRC et tailles restent à zéro : c'est la définition du mode flux.
    local.setUint16(26, name.byteLength, true)

    const descriptor = new DataView(new ArrayBuffer(16))
    descriptor.setUint32(0, 0x08074b50, true)
    descriptor.setUint32(4, crc, true)
    descriptor.setUint32(8, compressed.byteLength, true)
    descriptor.setUint32(12, entry.data.byteLength, true)

    const header = new DataView(new ArrayBuffer(46))
    header.setUint32(0, 0x02014b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 20, true)
    header.setUint16(8, 0x0808, true)
    header.setUint16(10, method, true)
    header.setUint16(12, entry.dosTime, true)
    header.setUint16(14, entry.dosDate, true)
    header.setUint32(16, crc, true)
    header.setUint32(20, compressed.byteLength, true)
    header.setUint32(24, entry.data.byteLength, true)
    header.setUint16(28, name.byteLength, true)
    header.setUint32(42, offset, true)

    parts.push(new Uint8Array(local.buffer), name, compressed, new Uint8Array(descriptor.buffer))
    central.push(new Uint8Array(header.buffer), name)
    offset += 30 + name.byteLength + compressed.byteLength + 16
  }

  const centralSize = central.reduce((n, c) => n + c.byteLength, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const total = all.reduce((n, c) => n + c.byteLength, 0)
  const result = new Uint8Array(total)
  let cursor = 0
  for (const part of all) { result.set(part, cursor); cursor += part.byteLength }
  return result
}
