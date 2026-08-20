import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findDuplicateKeys, parseJson } from '../../src/core/parseJson'

describe('parseJson', () => {
  it('conserve le texte source des littéraux numériques', () => {
    const node = parseJson('{"a": 3.0, "b": 1.0E7, "c": -0.0}')
    expect(node.kind).toBe('object')
    if (node.kind !== 'object') return
    expect(node.entries.map(([, v]) => (v.kind === 'literal' ? v.raw : null)))
      .toEqual(['3.0', '1.0E7', '-0.0'])
  })

  it('conserve les clés dupliquées et leur ordre', () => {
    const node = parseJson('{"a": 1, "a": 2}')
    if (node.kind !== 'object') throw new Error('objet attendu')
    expect(node.entries).toHaveLength(2)
  })

  it("conserve l'ordre des clés entières", () => {
    const node = parseJson('{"8496360": 1, "8492352": 2, "b": 3}')
    if (node.kind !== 'object') throw new Error('objet attendu')
    expect(node.entries.map(([k]) => k)).toEqual(['"8496360"', '"8492352"', '"b"'])
  })

  it('refuse les données résiduelles', () => {
    expect(() => parseJson('{} bruit')).toThrow(/résiduelles/)
  })

  it('signale les clés dupliquées et leur chemin', () => {
    const node = parseJson('{"a": 1, "a": 2, "b": {"c": 1, "c": 2}}')
    expect(findDuplicateKeys(node)).toEqual(['a', 'b/c'])
  })

  it('ne signale rien sur un fichier sain', () => {
    const doc = parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8'))
    expect(findDuplicateKeys(doc)).toEqual([])
  })
})
