import type { JsonNode } from './jsonDocument'

/** Décode une clé ou une chaîne stockée avec ses guillemets. */
export function decode(raw: string): string {
  return JSON.parse(raw) as string
}

export function getMember(node: JsonNode, key: string): JsonNode | undefined {
  if (node.kind !== 'object') return undefined
  // Sur clé dupliquée, la dernière l'emporte — c'est ce que fait XCTrack en lecture.
  let found: JsonNode | undefined
  for (const [rawKey, value] of node.entries) {
    if (decode(rawKey) === key) found = value
  }
  return found
}

export function getIndex(node: JsonNode, index: number): JsonNode | undefined {
  if (node.kind !== 'array') return undefined
  return node.items[index]
}

export function readString(node: JsonNode, key: string): string | undefined {
  const member = getMember(node, key)
  return member?.kind === 'string' ? decode(member.raw) : undefined
}

export function readNumber(node: JsonNode, key: string): number | undefined {
  const member = getMember(node, key)
  if (member?.kind !== 'literal') return undefined
  const value = Number(member.raw)
  return Number.isNaN(value) ? undefined : value
}

export function readBoolean(node: JsonNode, key: string): boolean | undefined {
  const member = getMember(node, key)
  if (member?.kind !== 'literal') return undefined
  if (member.raw === 'true') return true
  if (member.raw === 'false') return false
  return undefined
}

/**
 * Remplace le texte source d'une valeur existante. On n'écrit jamais de valeur
 * JavaScript : l'appelant fournit le texte exact, ce qui interdit à `JSON.stringify`
 * de transformer 3.0 en 3 dans notre dos.
 */
function setRaw(node: JsonNode, key: string, value: JsonNode): void {
  if (node.kind !== 'object') throw new Error('objet attendu')
  for (const entry of node.entries) {
    if (decode(entry[0]) === key) {
      entry[1] = value
      return
    }
  }
  throw new Error(`clé absente : ${key}`)
}

/** Pose un nombre, un booléen ou `null`, sous sa forme source exacte. */
export function setLiteral(node: JsonNode, key: string, raw: string): void {
  setRaw(node, key, { kind: 'literal', raw })
}

/**
 * Pose une chaîne, guillemets compris. Distinct de `setLiteral` : le type du nœud doit
 * refléter ce qu'il contient, sans quoi `readString` ne retrouvera pas la valeur — le
 * texte produit serait correct, mais le document mentirait sur son propre type.
 */
export function setString(node: JsonNode, key: string, raw: string): void {
  setRaw(node, key, { kind: 'string', raw })
}
