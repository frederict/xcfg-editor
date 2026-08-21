import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { createLibrary } from '../../src/library/library'
import { createMemoryStore } from '../../src/library/memoryStore'
import { sha256Hex } from '../../src/library/digest'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { ARCHIVE, EXPORTS, FORMES_PRESERVEES, GSON_2022 } from '../fixtures/paths'

/**
 * **La preuve centrale de ce jalon.**
 *
 * Une configuration rangée dans la bibliothèque puis ressortie doit rendre exactement les
 * mêmes octets — même empreinte SHA-256, même longueur, même dernier octet. C'est la
 * propriété qui fait qu'un pilote peut confier « Comp Annecy » à cet outil.
 *
 * Le corpus balayé ici couvre les trois variantes du format et les formes délicates :
 * `pages`, `backup`, archive `.xczfg`, plus les deux fichiers-pièges (`3.0`, `1.0E7`,
 * `-0.0`, entier au-delà de 2^53, clés dupliquées, UTF-8 brut, échappement Gson de 2022).
 */

const FIXTURES: Array<[string, string]> = [
  ...readdirSync(EXPORTS).filter((f) => f.endsWith('.xcfg')).map((f) => [f, EXPORTS + f] as [string, string]),
  ['2026-08-20_backupwithmedia-00.xczfg', ARCHIVE],
  ['formes-preservees.xcfg', FORMES_PRESERVEES],
  ['gson-2022.xcfg', GSON_2022]
]

describe('bibliothèque — fidélité à l’octet près', () => {
  it('le corpus balayé couvre bien les trois variantes du format', () => {
    // Un test qui balaie un répertoire cesse silencieusement de prouver quoi que ce soit
    // le jour où le répertoire se vide. On compte.
    expect(FIXTURES.length).toBeGreaterThanOrEqual(8)
    expect(FIXTURES.some(([nom]) => nom.endsWith('.xczfg'))).toBe(true)
    expect(FIXTURES.some(([nom]) => nom.includes('pages'))).toBe(true)
    expect(FIXTURES.some(([nom]) => nom.includes('backup'))).toBe(true)
  })

  for (const [nom, chemin] of FIXTURES) {
    it(`${nom} : rangé puis ressorti, mêmes octets`, async () => {
      const source = readFileSync(chemin)
      const library = createLibrary({ store: createMemoryStore() })

      const entry = await library.add({
        name: `Essai ${nom}`, bytes: new Uint8Array(source), fileName: nom
      })
      const sorti = Buffer.from(await library.bytesOf(entry.id))

      expect(sorti.length).toBe(source.length)
      expect(sorti.equals(source)).toBe(true)

      // L'empreinte enregistrée est bien celle du fichier — vérifiée contre une
      // implémentation indépendante (`node:crypto`), et non contre elle-même.
      const attendue = createHash('sha256').update(source).digest('hex')
      expect(entry.sha256).toBe(attendue)
      expect(await sha256Hex(new Uint8Array(sorti))).toBe(attendue)
    })
  }

  it('les octets rangés ne passent jamais par JSON.stringify', async () => {
    // Le contrôle qui distingue « on range des octets » de « on range un objet ». Le
    // fichier-piège porte huit formes que `JSON.parse` + `JSON.stringify` dégraderait :
    // on vérifie qu'elles sont TOUTES intactes en sortie de bibliothèque, et qu'elles ne
    // survivraient PAS au chemin naïf.
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const library = createLibrary({ store: createMemoryStore() })
    const entry = await library.add({
      name: 'pièges', bytes: new Uint8Array(Buffer.from(source, 'utf8')), fileName: 'formes.xcfg'
    })
    const sorti = new TextDecoder().decode(await library.bytesOf(entry.id))

    const naif = JSON.stringify(JSON.parse(source), null, 2)
    for (const forme of [
      '"_decimale_nulle": 3.0',
      '"_exposant_kotlin": 1.0E7',
      '"_zero_negatif": -0.0',
      '"_entier_au_dela_de_2_53": 9007199254740993'
    ]) {
      expect(sorti, forme).toContain(forme)
      expect(naif, `${forme} devrait être perdue par le chemin naïf`).not.toContain(forme)
    }
  })

  it('un aller-retour par la bibliothèque n’altère pas le document relu', async () => {
    // Complément du test d'octets : le fichier ressorti se relit par l'analyseur du noyau
    // et rend le même texte. Un fichier identique qu'on ne saurait plus relire serait un
    // succès sans valeur.
    const source = readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')
    const library = createLibrary({ store: createMemoryStore() })
    const entry = await library.add({
      name: 'backup', bytes: new Uint8Array(Buffer.from(source, 'utf8')), fileName: 'b.xcfg'
    })
    const sorti = new TextDecoder().decode(await library.bytesOf(entry.id))
    expect(serializeJson(parseJson(sorti))).toBe(source)
  })

  it('ranger ne modifie pas le tampon que l’appelant a fourni', async () => {
    // `FileReader` rend souvent une vue sur un tampon réutilisé. Si la bibliothèque
    // gardait la vue au lieu d'une copie, l'entrée changerait sous les pieds du pilote.
    const source = new Uint8Array(readFileSync(GSON_2022))
    const library = createLibrary({ store: createMemoryStore() })
    const entry = await library.add({ name: 'gson', bytes: source, fileName: 'g.xcfg' })

    source.fill(0)
    const sorti = Buffer.from(await library.bytesOf(entry.id))
    expect(sorti.equals(readFileSync(GSON_2022))).toBe(true)
  })
})
