import { describe, expect, it } from 'vitest'
import { readRotation } from '../../../src/render/widgets/rotation'
import type { JsonNode } from '../../../src/core/jsonDocument'

function objectNode(entries: Array<[string, JsonNode]>): JsonNode {
  return { kind: 'object', entries }
}

describe('lecture normalisée de `rotation`', () => {
  it('lit la forme objet — WCompMap, WXCAssistant, WThermalAssistant du corpus', () => {
    const node = objectNode([
      ['"rotation"', objectNode([
        ['"value"', { kind: 'string', raw: '"NORTH_AT_TOP"' }],
        ['"showCompass"', { kind: 'literal', raw: 'true' }]
      ])]
    ])
    expect(readRotation(node)).toEqual({ value: 'NORTH_AT_TOP', showCompass: true })
  })

  it('lit `showCompass: false` dans la forme objet', () => {
    const node = objectNode([
      ['"rotation"', objectNode([
        ['"value"', { kind: 'string', raw: '"TRAVEL_DIRECTION_AT_TOP"' }],
        ['"showCompass"', { kind: 'literal', raw: 'false' }]
      ])]
    ])
    expect(readRotation(node)).toEqual({ value: 'TRAVEL_DIRECTION_AT_TOP', showCompass: false })
  })

  it('lit la forme chaîne nue — WCompass, hors périmètre mais déjà acceptée', () => {
    const node = objectNode([['"rotation"', { kind: 'string', raw: '"NORTH_AT_TOP"' }]])
    expect(readRotation(node)).toEqual({ value: 'NORTH_AT_TOP', showCompass: false })
  })

  it('retombe sur NORTH_AT_TOP / showCompass false quand la clé est absente', () => {
    expect(readRotation(objectNode([]))).toEqual({ value: 'NORTH_AT_TOP', showCompass: false })
  })
})
