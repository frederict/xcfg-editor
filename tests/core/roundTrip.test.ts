import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson, findDuplicateKeys } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember, getIndex, insertLiteral, insertString, removeMember, encode } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { EXPORTS, FORMES_PRESERVEES, GSON_2022 } from '../fixtures/paths'

describe('fidélité du round-trip', () => {
  const files = readdirSync(EXPORTS).filter((f) => f.endsWith('.xcfg'))

  it('le corpus contient bien les fichiers attendus', () => {
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  for (const file of files) {
    it(`${file} ressort identique à l'octet près`, () => {
      const source = readFileSync(EXPORTS + file)
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
      '{\n  "a": "Amélie Exemple 🤘"\n}',    // UTF-8 brut, non échappé
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
      const output = serializeJson(parseJson(readFileSync(EXPORTS + file, 'utf8')))
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
  const REELS = ['2026-08-20_pages-00.xcfg', '2026-08-20_backup-00.xcfg', '2025-07-07_backup-00.xcfg', '2025-07-07_pages-00.xcfg']

  for (const file of REELS) {
    it(`${file} : insérer puis supprimer la même clé rend les octets d’origine`, () => {
      const source = readFileSync(EXPORTS + file)
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
      const texte = readFileSync(EXPORTS + file, 'utf8')
      const doc = parseJson(texte)
      insertString(premierWidget(doc), 'titletext', encode('Amélie 🤘'))

      const ajout = ajoutSeul(texte, serializeJson(doc))
      expect(ajout).toBe(',\n            "titletext": "Amélie 🤘"')
      // La marge est celle du niveau du widget, pas celle de la racine.
      expect(ajout.split('\n')[1]!.match(/^ +/)![0].length).toBe(12)
    })
  }

  it('l’insertion ne réécrit aucune autre valeur du document', () => {
    // Toutes les valeurs restent à l'octet près celles de la source : c'est le point
    // qu'un sérialiseur reconstruisant les nombres casserait en silence.
    const texte = readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')
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

/* ================================================================= fichiers-pièges */

/**
 * Les cinq exports dérivés du corpus réel ne portent, comme pièges, que la décimale
 * nulle, la couleur Android signée, les clés entières non triées et l'UTF-8 brut. Aucun
 * fichier réel du corpus — 21 fichiers, 2022 → 2026 — ne porte `1.0E7`, `-0.0`, un entier
 * au-delà de 2^53 ni deux clés de même nom. Les cas ci-dessus les couvrent, mais sur des
 * objets d'une ligne : rien ne dit qu'ils tiennent dans un fichier complet, au milieu de
 * quatre niveaux d'imbrication.
 *
 * D'où ces deux fixtures écrites à la main, dont c'est le seul rôle.
 */
describe('fidélité du round-trip — fichiers-pièges', () => {
  for (const [nom, chemin] of [
    ['formes-preservees.xcfg', FORMES_PRESERVEES],
    ['gson-2022.xcfg', GSON_2022]
  ] as const) {
    it(`${nom} ressort identique à l'octet près`, () => {
      const source = readFileSync(chemin)
      const output = Buffer.from(serializeJson(parseJson(source.toString('utf8'))), 'utf8')
      expect(output.length).toBe(source.length)
      expect(output.equals(source)).toBe(true)
      expect(output.subarray(-1).toString()).toBe('}')
    })
  }

  it('formes-preservees.xcfg porte bien les huit formes qu’il prétend porter', () => {
    // Un fichier-piège qu'on ne relit pas cesse silencieusement d'être un piège : il
    // suffit d'une correction distraite pour que le test ci-dessus reste vert sur un
    // fichier devenu banal. On vérifie donc que chaque forme est là.
    const texte = readFileSync(FORMES_PRESERVEES, 'utf8')
    for (const forme of [
      '"_decimale_nulle": 3.0',
      '"_exposant_kotlin": 1.0E7',
      '"_zero_negatif": -0.0',
      '"_entier_au_dela_de_2_53": 9007199254740993',
      '"color_text": -27091',
      '"8496360": 20250612',
      '"_conteneur_objet_vide": {}',
      '"_conteneur_tableau_vide": []'
    ]) {
      expect(texte, forme).toContain(forme)
    }
    // Deux clés de même nom dans le même widget, que `JSON.parse` fusionnerait.
    expect(findDuplicateKeys(parseJson(texte))).toEqual([
      'layout/landscape[0]/widgets[0]/_clef_doublee'
    ])
    // De l'UTF-8 brut, jamais échappé — l'émoji du corpus fait quatre octets.
    expect(Buffer.from(texte, 'utf8').includes(Buffer.from([0xf0, 0x9f, 0xa4, 0x98]))).toBe(true)
    expect(texte).not.toContain('\\u00')
  })

  it('gson-2022.xcfg porte l’échappement que seul Gson produisait', () => {
    // Fait mesuré sur le corpus historique : le fichier de février 2022 (XCTrack 0.9.6,
    // écrit par Gson) échappe l'apostrophe en `\u0027`, ce qu'aucun fichier plus récent
    // ne fait — kotlinx la laisse telle quelle. Un sérialiseur qui « normalise »
    // l'échappement rendrait un fichier différent tout en restant du JSON valide.
    const texte = readFileSync(GSON_2022, 'utf8')
    expect(texte).toContain('I\\u0027m coming')
    expect(serializeJson(parseJson(texte))).toContain('I\\u0027m coming')
    // Et il n'a pas d'`exportType` : XCTrack ne l'écrivait pas encore.
    expect(getMember(getMember(parseJson(texte), 'info')!, 'exportType')).toBeUndefined()
  })
})
