import type { JsonNode } from './jsonDocument'
import { parseJson } from './parseJson'
import { formatTechnicalDetail } from './technicalDetail'
import { serializeJson } from './serializeJson'
import { readZip, writeZip, type ZipEntry } from './zip'

export interface Container {
  kind: 'xcfg' | 'xczfg'
  fileName: string
  /** Octets d'origine, conservés pour pouvoir réémettre un document non modifié. */
  source: Uint8Array
  document: JsonNode
  /** Défini si le contenu n'a pas pu être analysé ; le document est alors vide. */
  parseError?: string
  /** Fichiers annexes d'une archive, à réémettre tels quels. */
  extras: ZipEntry[]
  innerName: string
  dosTime: number
  dosDate: number
  modified: boolean
}

/**
 * Fonction et non constante : un objet partagé serait muté par le premier appelant et
 * réapparaîtrait modifié dans le conteneur suivant.
 */
const emptyDocument = (): JsonNode => ({ kind: 'object', entries: [] })

export async function openContainer(bytes: Uint8Array, fileName: string): Promise<Container> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b

  let json = bytes
  let extras: ZipEntry[] = []
  let innerName = 'backup.xcfg'
  let dosTime = 0
  let dosDate = 0

  if (isZip) {
    const entries = await readZip(bytes)
    const main = entries.find((e) => e.name.endsWith('.xcfg'))
    if (!main) throw new Error("archive sans fichier .xcfg")
    json = main.data
    innerName = main.name
    dosTime = main.dosTime
    dosDate = main.dosDate
    extras = entries.filter((e) => e !== main)
  }

  const base = {
    kind: isZip ? ('xczfg' as const) : ('xcfg' as const),
    fileName, source: bytes, extras, innerName, dosTime, dosDate, modified: false
  }

  try {
    return { ...base, document: parseJson(new TextDecoder().decode(json)) }
  } catch (error) {
    // Le message seul, sans le « Error: » du moteur JavaScript : cette chaîne finit
    // sous les yeux du pilote, repliée derrière « Détail technique ».
    return { ...base, document: emptyDocument(), parseError: formatTechnicalDetail(error) }
  }
}

export async function exportContainer(container: Container): Promise<Uint8Array> {
  // Non modifié — ou illisible : on rend les octets d'origine, sans les réécrire.
  if (!container.modified || container.parseError) return container.source

  const json = new TextEncoder().encode(serializeJson(container.document))
  if (container.kind === 'xcfg') return json

  return writeZip([
    {
      name: container.innerName,
      data: json,
      stored: false,
      dosTime: container.dosTime,
      dosDate: container.dosDate
    },
    ...container.extras
  ])
}
