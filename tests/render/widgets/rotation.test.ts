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

  // Une chaîne nue là où le corpus donne un objet : aucune carte connue n'en porte. La
  // valeur d'exemple est prise dans le vocabulaire des CARTES, le seul que cette lecture
  // sert — `WCompass` a le sien (`NORTH`/`HEADING`/`BEARING`/`TRAVEL_DIRECTION`) et ne
  // passe plus par ici, voir `compass.ts`.
  it('lit une chaîne nue là où le corpus donne un objet', () => {
    const node = objectNode([['"rotation"', { kind: 'string', raw: '"TRAVEL_DIRECTION_AT_TOP"' }]])
    expect(readRotation(node)).toEqual({ value: 'TRAVEL_DIRECTION_AT_TOP', showCompass: false })
  })

  it('retombe sur NORTH_AT_TOP / showCompass false quand la clé est absente', () => {
    expect(readRotation(objectNode([]))).toEqual({ value: 'NORTH_AT_TOP', showCompass: false })
  })
})
