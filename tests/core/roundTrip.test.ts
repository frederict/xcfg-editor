import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson, findDuplicateKeys } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember, getIndex, insertLiteral, insertString, removeMember, encode } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'

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

describe('fidélité de l’insertion et de la suppression', () => {
  /** Le premier widget de la première page paysage : un nœud à quatre niveaux de marge. */
  const premierWidget = (doc: JsonNode): JsonNode =>
    getIndex(getMember(getIndex(getMember(getMember(doc, 'layout')!, 'landscape')!, 0)!, 'widgets')!, 0)!

  /**
   * Rend la portion de `apres` qui n'est pas dans `avant`, et vérifie qu'`avant` n'a rien
   * perdu : préfixe commun, suffixe commun, et entre les deux, plus rien côté source.
   * C'est la formulation exacte de « la différence se réduit aux caractères ajoutés ».
   */
  const ajoutSeul = (avant: string, apres: string): string => {
    let p = 0
    while (p < avant.length && avant[p] === apres[p]) p++
    let s = 0
    while (s < avant.length - p && avant[avant.length - 1 - s] === apres[apres.length - 1 - s]) s++
    expect(avant.length - p - s).toBe(0) // rien de retiré ni de réécrit côté source
    return apres.slice(p, apres.length - s)
  }

  // Trois fichiers réels distincts, deux formats d'export (pages et backup) et deux
  // millésimes de XCTrack. Les fixtures minuscules ne prouvent rien sur 57 à 79 ko.
  const REELS = ['2026-08-20_pages-00.xcfg', '2026-08-20_backup-00.xcfg', 'complète.xcfg', 'pages.xcfg']

  for (const file of REELS) {
    it(`${file} : insérer puis supprimer la même clé rend les octets d’origine`, () => {
      const source = readFileSync(EXAMPLES + file)
      const texte = source.toString('utf8')

      for (const at of [undefined, 0, 3]) {
        const doc = parseJson(texte)
        insertLiteral(premierWidget(doc), 'inventeEn2027', '3.0', at)
        expect(serializeJson(doc)).not.toBe(texte)
        expect(removeMember(premierWidget(doc), 'inventeEn2027')).toBe(1)
        const sortie = Buffer.from(serializeJson(doc), 'utf8')
        expect(sortie.length).toBe(source.length)
        expect(sortie.equals(source)).toBe(true)
      }
    })

    it(`${file} : après l’insertion seule, la seule différence est la clé ajoutée`, () => {
      // État INTERMÉDIAIRE. Le cycle complet ci-dessus reste vert même si l'insertion
      // pose une mauvaise marge ou oublie la virgule : la suppression efface la faute
      // en même temps que la clé. Seule cette inspection-là la voit.
      const texte = readFileSync(EXAMPLES + file, 'utf8')
      const doc = parseJson(texte)
      insertString(premierWidget(doc), 'titletext', encode('Frédéric 🤘'))

      const ajout = ajoutSeul(texte, serializeJson(doc))
      expect(ajout).toBe(',\n            "titletext": "Frédéric 🤘"')
      // La marge est celle du niveau du widget, pas celle de la racine.
      expect(ajout.split('\n')[1]!.match(/^ +/)![0].length).toBe(12)
    })
  }

  it('l’insertion ne réécrit aucune autre valeur du document', () => {
    // Toutes les valeurs restent à l'octet près celles de la source : c'est le point
    // qu'un sérialiseur reconstruisant les nombres casserait en silence.
    const texte = readFileSync(EXAMPLES + '2026-08-20_backup-00.xcfg', 'utf8')
    const doc = parseJson(texte)
    insertLiteral(premierWidget(doc), 'zz_ajout', '1.0E7')
    const sortie = serializeJson(doc)
    for (const morceau of ['"_bg": 100', '"proUpTo": 0', '"navigations": "all"']) {
      expect(sortie.split(morceau).length).toBe(texte.split(morceau).length)
    }
    expect(ajoutSeul(texte, sortie)).toContain('"zz_ajout": 1.0E7')
  })

  it('les clés dupliquées restent toutes présentes après une insertion voisine', () => {
    const source = '{\n  "a": 1,\n  "a": 2\n}'
    const doc = parseJson(source)
    insertLiteral(doc, 'b', '3')
    expect(findDuplicateKeys(doc)).toEqual(['a'])
    expect(serializeJson(doc)).toBe('{\n  "a": 1,\n  "a": 2,\n  "b": 3\n}')
    removeMember(doc, 'b')
    expect(serializeJson(doc)).toBe(source)
  })
})
