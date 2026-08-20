import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import {
  getMember, getIndex, readString, readNumber, setLiteral, setString, decode, encode,
  hasMember, insertLiteral, insertString, removeMember
} from '../../src/core/access'

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

describe('insertion d’une clé', () => {
  it('insère en fin d’objet par défaut, sans toucher aux clés existantes', () => {
    // État INTERMÉDIAIRE : on inspecte le texte après l'insertion seule. Un test qui
    // n'observe que le cycle complet insertion → suppression reste vert sur un
    // mécanisme cassé (mauvaise marge, virgule oubliée), parce que la suppression
    // efface la faute avec la clé.
    const source = '{\n  "CLASS": "WCompass",\n  "X1": 0\n}'
    const doc = parseJson(source)
    insertLiteral(doc, 'showBackground', 'true')
    expect(serializeJson(doc)).toBe('{\n  "CLASS": "WCompass",\n  "X1": 0,\n  "showBackground": true\n}')
  })

  it('insère à un rang choisi', () => {
    const doc = parseJson('{\n  "a": 1,\n  "c": 3\n}')
    insertLiteral(doc, 'b', '2', 1)
    expect(serializeJson(doc)).toBe('{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}')
  })

  it('insère en tête au rang 0', () => {
    const doc = parseJson('{\n  "b": 2\n}')
    insertLiteral(doc, 'a', '1', 0)
    expect(serializeJson(doc)).toBe('{\n  "a": 1,\n  "b": 2\n}')
  })

  it('ramène dans les bornes un rang aberrant plutôt que d’échouer', () => {
    // Un rang calculé par l'appelant ne doit pas pouvoir faire échouer l'édition.
    const haut = parseJson('{\n  "a": 1\n}')
    insertLiteral(haut, 'b', '2', 99)
    expect(serializeJson(haut)).toBe('{\n  "a": 1,\n  "b": 2\n}')
    const bas = parseJson('{\n  "a": 1\n}')
    insertLiteral(bas, 'b', '2', -99)
    expect(serializeJson(bas)).toBe('{\n  "b": 2,\n  "a": 1\n}')
  })

  it('produit la marge de kotlinx à quatre niveaux d’imbrication', () => {
    // Un widget vit à « layout / portrait / [page] / widgets / [widget] » : la clé
    // insérée doit sortir avec la marge de son niveau, pas celle de la racine.
    const source = '{\n  "layout": {\n    "portrait": [\n      {\n        "widgets": [\n          {\n            "CLASS": "WCompass"\n          }\n        ]\n      }\n    ]\n  }\n}'
    const doc = parseJson(source)
    const widget = getIndex(getMember(getIndex(getMember(getMember(doc, 'layout')!, 'portrait')!, 0)!, 'widgets')!, 0)!
    insertLiteral(widget, 'showBearing', 'false')
    expect(serializeJson(doc)).toBe(
      source.replace('"CLASS": "WCompass"', '"CLASS": "WCompass",\n            "showBearing": false')
    )
  })

  it('insère dans un objet vide, qui cesse d’être sur une seule ligne', () => {
    const doc = parseJson('{\n  "opts": {}\n}')
    insertLiteral(getMember(doc, 'opts')!, 'a', '1')
    expect(serializeJson(doc)).toBe('{\n  "opts": {\n    "a": 1\n  }\n}')
  })

  it('échappe la clé qu’on lui donne en clair', () => {
    const doc = parseJson('{}')
    insertString(doc, 'titre "spécial"', encode('Frédéric'))
    expect(serializeJson(doc)).toBe('{\n  "titre \\"spécial\\"": "Frédéric"\n}')
    expect(readString(doc, 'titre "spécial"')).toBe('Frédéric')
  })

  it('refuse d’insérer une clé déjà présente, y compris dupliquée', () => {
    const doc = parseJson('{\n  "a": 1\n}')
    expect(() => insertLiteral(doc, 'a', '2')).toThrow('clé déjà présente : a')
    expect(serializeJson(doc)).toBe('{\n  "a": 1\n}')
    const double = parseJson('{\n  "a": 1,\n  "a": 2\n}')
    expect(() => insertLiteral(double, 'a', '3')).toThrow('clé déjà présente : a')
    expect(serializeJson(double)).toBe('{\n  "a": 1,\n  "a": 2\n}')
  })

  it('refuse un nœud qui n’est pas un objet', () => {
    expect(() => insertLiteral(parseJson('[1]'), 'a', '1')).toThrow('objet attendu')
    expect(() => removeMember(parseJson('"x"'), 'a')).toThrow('objet attendu')
  })

  it('la valeur insérée garde son texte source exact', () => {
    // Les pièges du projet : JSON.stringify rendrait 3, 10000000 et 9007199254740992.
    const doc = parseJson('{}')
    insertLiteral(doc, 'a', '3.0')
    insertLiteral(doc, 'b', '1.0E7')
    insertLiteral(doc, 'c', '9007199254740993')
    insertLiteral(doc, 'd', '-27091')
    expect(serializeJson(doc)).toBe('{\n  "a": 3.0,\n  "b": 1.0E7,\n  "c": 9007199254740993,\n  "d": -27091\n}')
  })

  it('insérer à côté d’un texte UTF-8 brut n’y touche pas', () => {
    // Fait mesuré : le corpus contient un WFreeText dont le texte porte un emoji écrit
    // en UTF-8 brut (f0 9f a4 98), sans séquence \uXXXX. Le sérialiseur ne doit pas
    // l'échapper au passage — JSON.stringify le laisserait brut, mais un
    // « durcissement » ASCII bien intentionné le casserait.
    const source = '{\n  "CLASS": "WFreeText",\n  "text": "Visualise le thermique 🤘"\n}'
    const doc = parseJson(source)
    insertLiteral(doc, 'text_bold', 'false')
    const sortie = serializeJson(doc)
    expect(sortie).toBe(source.replace('🤘"', '🤘",\n  "text_bold": false'))
    expect(Buffer.from(sortie, 'utf8').includes(Buffer.from([0xf0, 0x9f, 0xa4, 0x98]))).toBe(true)
    expect(sortie).not.toContain('\\u')
  })

  it('n’a pas d’avis sur les clés entières non triées voisines', () => {
    const doc = parseJson('{\n  "8496360": 1,\n  "8492352": 2\n}')
    insertLiteral(doc, '8000000', '3')
    expect(serializeJson(doc)).toBe('{\n  "8496360": 1,\n  "8492352": 2,\n  "8000000": 3\n}')
  })
})

describe('suppression d’une clé', () => {
  it('retire la clé et rend le nombre d’occurrences retirées', () => {
    const doc = parseJson('{\n  "a": 1,\n  "b": 2\n}')
    expect(removeMember(doc, 'a')).toBe(1)
    expect(hasMember(doc, 'a')).toBe(false)
    expect(serializeJson(doc)).toBe('{\n  "b": 2\n}')
  })

  it('rend 0 et ne touche à rien sur une clé absente', () => {
    const source = '{\n  "a": 1\n}'
    const doc = parseJson(source)
    expect(removeMember(doc, 'zzz')).toBe(0)
    expect(serializeJson(doc)).toBe(source)
  })

  it('retire TOUTES les occurrences d’une clé dupliquée', () => {
    // N'en retirer qu'une laisserait le réglage en place avec la valeur de l'autre
    // doublon : la clé paraîtrait supprimée et ne le serait pas.
    const doc = parseJson('{\n  "a": 1,\n  "b": 2,\n  "a": 3\n}')
    expect(removeMember(doc, 'a')).toBe(2)
    expect(hasMember(doc, 'a')).toBe(false)
    expect(serializeJson(doc)).toBe('{\n  "b": 2\n}')
  })

  it('vider un objet le ramène à sa forme d’une seule ligne', () => {
    const doc = parseJson('{\n  "opts": {\n    "a": 1\n  }\n}')
    removeMember(getMember(doc, 'opts')!, 'a')
    expect(serializeJson(doc)).toBe('{\n  "opts": {}\n}')
  })

  it('hasMember distingue une clé absente d’une clé de valeur nulle', () => {
    const doc = parseJson('{\n  "a": null\n}')
    expect(hasMember(doc, 'a')).toBe(true)
    expect(hasMember(doc, 'b')).toBe(false)
  })
})
