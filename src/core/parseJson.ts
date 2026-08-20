import type { JsonNode } from './jsonDocument'

const WHITESPACE = new Set([' ', '\t', '\n', '\r'])
const LITERAL_END = new Set([',', '}', ']', ' ', '\t', '\n', '\r'])

export function parseJson(text: string): JsonNode {
  let i = 0

  const skipWhitespace = (): void => {
    while (i < text.length && WHITESPACE.has(text[i]!)) i++
  }

  /** Lit une chaîne entre guillemets et rend son texte source, guillemets compris. */
  const readString = (): string => {
    const start = i
    i++ // guillemet ouvrant
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\\') i++
      i++
    }
    if (i >= text.length) throw new Error(`chaîne non terminée à ${start}`)
    i++ // guillemet fermant
    return text.slice(start, i)
  }

  const readValue = (): JsonNode => {
    skipWhitespace()
    const c = text[i]
    if (c === undefined) throw new Error(`fin de données inattendue à ${i}`)

    if (c === '{') {
      i++
      const entries: Array<[string, JsonNode]> = []
      skipWhitespace()
      if (text[i] === '}') { i++; return { kind: 'object', entries } }
      for (;;) {
        skipWhitespace()
        const key = readString()
        skipWhitespace()
        if (text[i] !== ':') throw new Error(`« : » attendu à ${i}`)
        i++
        entries.push([key, readValue()])
        skipWhitespace()
        if (text[i] === ',') { i++; continue }
        if (text[i] !== '}') throw new Error(`« , » ou « } » attendu à ${i}`)
        i++
        return { kind: 'object', entries }
      }
    }

    if (c === '[') {
      i++
      const items: JsonNode[] = []
      skipWhitespace()
      if (text[i] === ']') { i++; return { kind: 'array', items } }
      for (;;) {
        items.push(readValue())
        skipWhitespace()
        if (text[i] === ',') { i++; continue }
        if (text[i] !== ']') throw new Error(`« , » ou « ] » attendu à ${i}`)
        i++
        return { kind: 'array', items }
      }
    }

    if (c === '"') return { kind: 'string', raw: readString() }

    const start = i
    while (i < text.length && !LITERAL_END.has(text[i]!)) i++
    if (i === start) throw new Error(`littéral vide à ${start}`)
    return { kind: 'literal', raw: text.slice(start, i) }
  }

  const root = readValue()
  skipWhitespace()
  if (i !== text.length) throw new Error(`données résiduelles à ${i}`)
  return root
}

/**
 * Chemins des clés apparaissant plus d'une fois dans un même objet. `JSON.parse` les
 * écrase en silence ; nous les gardons toutes, mais le pilote doit savoir que son
 * fichier en contient — c'est le mode de défaillance que la spec voulait écarter.
 */
export function findDuplicateKeys(node: JsonNode, path = ''): string[] {
  const found: string[] = []

  if (node.kind === 'object') {
    const seen = new Set<string>()
    for (const [rawKey, value] of node.entries) {
      const key = JSON.parse(rawKey) as string
      const here = path ? `${path}/${key}` : key
      if (seen.has(key)) found.push(here)
      seen.add(key)
      found.push(...findDuplicateKeys(value, here))
    }
  } else if (node.kind === 'array') {
    node.items.forEach((item, index) => {
      found.push(...findDuplicateKeys(item, `${path}[${index}]`))
    })
  }

  return found
}
