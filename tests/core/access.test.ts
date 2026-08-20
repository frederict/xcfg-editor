import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember, getIndex, readString, readNumber, setLiteral, setString, decode, encode } from '../../src/core/access'

const FILE = '/Users/fred/DEV/XCTrack/Exemples/2026-08-20_pages-00.xcfg'

describe('accesseurs', () => {
  it('lit une chaîne en décodant ses guillemets', () => {
    const doc = parseJson(readFileSync(FILE, 'utf8'))
    expect(readString(getMember(doc, 'info')!, 'exportType')).toBe('pages')
  })

  it('lit un nombre', () => {
    const doc = parseJson(readFileSync(FILE, 'utf8'))
    expect(readNumber(getMember(doc, 'info')!, 'versionCode')).toBe(100030)
  })

  it("déplacer un widget ne change QUE ses quatre coordonnées", () => {
    const source = readFileSync(FILE, 'utf8')
    const doc = parseJson(source)
    const page = getIndex(getMember(getMember(doc, 'layout')!, 'portrait')!, 0)!
    const widget = getIndex(getMember(page, 'widgets')!, 0)!

    // On relit les valeurs d'origine au lieu de les coder en dur : le fichier peut
    // être remplacé par un autre export sans invalider le test.
    const before = { X1: 0, Y1: 0, X2: 0, Y2: 0 }
    for (const key of ['X1', 'Y1', 'X2', 'Y2'] as const) {
      before[key] = readNumber(widget, key)!
      setLiteral(widget, key, String(before[key] + 11))
    }

    let output = serializeJson(doc)
    expect(output).not.toBe(source)

    // On annule les quatre modifications par voie textuelle : ce qui reste doit être
    // rigoureusement la source. C'est le test central du projet.
    for (const key of ['X1', 'Y1', 'X2', 'Y2'] as const) {
      output = output.replace(`"${key}": ${before[key] + 11}`, `"${key}": ${before[key]}`)
    }
    expect(output).toBe(source)
  })

  it("une clé inconnue injectée dans un widget survit au cycle", () => {
    // Preuve de la thèse centrale : le format gagne des clés à chaque version de
    // XCTrack, et l'outil doit transporter celles qu'il ne comprend pas.
    const source = '{\n  "CLASS": "WFutur",\n  "inventeEn2027": {\n    "a": 1.0\n  }\n}'
    const doc = parseJson(source)
    setString(doc, 'CLASS', '"WFutur2"')
    expect(serializeJson(doc)).toBe(source.replace('"WFutur"', '"WFutur2"'))
  })
})

describe('clés dupliquées', () => {
  // getMember retient la dernière occurrence. setLiteral doit écrire sur la même,
  // sinon la lecture resterait inchangée après écriture — un widget ne bougerait pas.
  it('écrit sur la même occurrence que celle qui est lue', () => {
    const doc = parseJson('{\n  "X1": 100,\n  "X1": 200\n}')
    expect(readNumber(doc, 'X1')).toBe(200)
    setLiteral(doc, 'X1', '300')
    expect(readNumber(doc, 'X1')).toBe(300)
    expect(serializeJson(doc)).toBe('{\n  "X1": 100,\n  "X1": 300\n}')
  })

  it('encode est l’inverse de decode', () => {
    for (const brut of ['"simple"', '"avec \\"guillemets\\""', '"Frédéric"', '"a\\nb"']) {
      expect(encode(decode(brut))).toBe(brut)
    }
  })
})
