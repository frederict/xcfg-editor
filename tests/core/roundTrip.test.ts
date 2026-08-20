import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'

const EXAMPLES = '/Users/fred/DEV/XCTrack/Exemples/'

describe('fidélité du round-trip', () => {
  const files = readdirSync(EXAMPLES).filter((f) => f.endsWith('.xcfg'))

  it('le corpus contient bien les fichiers attendus', () => {
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  for (const file of files) {
    it(`${file} ressort identique à l'octet près`, () => {
      const source = readFileSync(EXAMPLES + file)
      const output = Buffer.from(serializeJson(parseJson(source.toString('utf8'))), 'utf8')
      expect(output.length).toBe(source.length)
      expect(output.equals(source)).toBe(true)
    })
  }

  it('préserve les pièges connus', () => {
    // Chaque cas a cassé, ou casserait, JSON.parse + JSON.stringify.
    const cases = [
      '{\n  "a": 3.0\n}',                    // décimale nulle
      '{\n  "a": 1.0E7\n}',                  // notation exponentielle Kotlin
      '{\n  "a": -0.0\n}',                   // zéro négatif
      '{\n  "a": 9007199254740993\n}',       // entier au-delà de 2^53
      '{\n  "a": -27091\n}',                 // couleur Android signée
      '{\n  "8496360": 1,\n  "8492352": 2\n}', // clés entières non triées
      '{\n  "a": 1,\n  "a": 2\n}',           // clés dupliquées
      '{\n  "a": "Frédéric Tétart"\n}',      // UTF-8 brut, non échappé
      '{\n  "a": {},\n  "b": []\n}'          // conteneurs vides
    ]
    for (const source of cases) {
      expect(serializeJson(parseJson(source))).toBe(source)
    }
  })

  it('ne termine jamais par un saut de ligne', () => {
    // XCTrack finit ses fichiers sur « } ». Un sérialiseur qui ajoute « \n » par
    // réflexe d'éditeur casse l'identité d'octet sur le dernier octet.
    for (const file of files) {
      const output = serializeJson(parseJson(readFileSync(EXAMPLES + file, 'utf8')))
      expect(output.endsWith('}')).toBe(true)
    }
  })
})
