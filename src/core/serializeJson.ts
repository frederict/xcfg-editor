import type { JsonNode } from './jsonDocument'

/**
 * Réécrit le document au format de kotlinx.serialization tel qu'employé par XCTrack :
 * indentation de 2 espaces, LF, pas de saut de ligne final, UTF-8 brut sans
 * échappement non-ASCII, conteneurs vides sur une seule ligne.
 */
export function serializeJson(node: JsonNode, indent = ''): string {
  const inner = indent + '  '

  if (node.kind === 'object') {
    if (node.entries.length === 0) return '{}'
    const body = node.entries
      .map(([key, value]) => `${inner}${key}: ${serializeJson(value, inner)}`)
      .join(',\n')
    return `{\n${body}\n${indent}}`
  }

  if (node.kind === 'array') {
    if (node.items.length === 0) return '[]'
    const body = node.items.map((item) => inner + serializeJson(item, inner)).join(',\n')
    return `[\n${body}\n${indent}]`
  }

  return node.raw
}
