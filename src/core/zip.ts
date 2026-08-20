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

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  // `as BufferSource` est nécessaire : depuis que Uint8Array est générique dans lib.dom,
  // un Uint8Array nu n'est plus assignable à BufferSource. Le code s'exécute sans, mais
  // TypeScript le refuse.
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

/**
 * Lit une archive par son répertoire central, localisé depuis la fin par l'EOCD. On ne
 * balaie pas le tampon à la recherche de la signature : elle peut apparaître par hasard
 * dans des données compressées. On ne parcourt pas non plus les en-têtes locaux : en
 * mode flux, ils portent des tailles nulles et ne renseignent rien.
 */
export async function readZip(buffer: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const entries: ZipEntry[] = []

  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('archive sans répertoire central')

  const count = view.getUint16(eocd + 10, true)
  let i = view.getUint32(eocd + 16, true)

  for (let read = 0; read < count; read++) {
    if (view.getUint32(i, true) !== SIGNATURE_CENTRAL) {
      throw new Error(`en-tête central attendu à ${i}`)
    }
    const compressedSize = view.getUint32(i + 20, true)
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

    entries.push({
      name,
      data: method === 0 ? compressed.slice() : await inflateRaw(compressed),
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
