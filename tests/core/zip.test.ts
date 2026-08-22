import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readZip, writeZip, ZIP_LIMITS, type ZipEntry, type ZipLimits } from '../../src/core/zip'
import { ARCHIVE, BACKUP_ARCHIVE } from '../fixtures/paths'

describe('readZip', () => {
  it('extrait backup.xcfg', async () => {
    const entries = await readZip(new Uint8Array(readFileSync(ARCHIVE)))
    expect(entries.map((e) => e.name)).toContain('backup.xcfg')
    const backup = entries.find((e) => e.name === 'backup.xcfg')!
    // La taille attendue est relue sur la fixture, jamais codée en dur : une constante
    // écrite à la main devient fausse le jour où le corpus change, et le test se met
    // alors à mesurer la constante plutôt que l'archive.
    const seul = new Uint8Array(readFileSync(BACKUP_ARCHIVE))
    expect(backup.data.byteLength).toBe(seul.byteLength)
    expect(Buffer.from(backup.data).equals(Buffer.from(seul))).toBe(true)
    expect(new TextDecoder().decode(backup.data).startsWith('{')).toBe(true)
  })

  it('réécrit une archive sans rien perdre, et toujours les mêmes octets', async () => {
    const original = new Uint8Array(readFileSync(ARCHIVE))
    const entries = await readZip(original)
    const rebuilt = await writeZip(entries)

    // Rien ne se perd au passage : nom, contenu, mode de stockage et horodatage DOS.
    // C'est l'horodatage qui compte le plus — il n'est nulle part ailleurs, et XCTrack
    // l'affiche.
    expect(await readZip(rebuilt)).toEqual(entries)

    // `writeZip` est un point fixe : réécrire ce qu'il a écrit rend les mêmes octets.
    // Sans cette propriété, deux exports successifs d'un fichier inchangé produiraient
    // deux fichiers différents, et l'empreinte SHA-256 ne voudrait plus rien dire.
    expect(Buffer.from(await writeZip(await readZip(rebuilt))).equals(Buffer.from(rebuilt)))
      .toBe(true)
  })
})

/**
 * ⚠️ **Ce que la suite versionnée ne peut pas prouver, et qui reste vérifiable ici.**
 *
 * Le test d'origine comparait l'archive réécrite aux octets de l'archive **écrite par
 * XCTrack** : il prouvait la conformité au producteur, pas seulement la cohérence avec
 * nous-mêmes. Cette preuve-là ne peut pas être versionnée, pour deux raisons :
 *
 * 1. L'archive réelle porte les données personnelles du propriétaire ; la fixture est
 *    anonymisée, donc réécrite par `writeZip` — comparer sa sortie à elle-même serait
 *    circulaire.
 * 2. **Le flux compressé dépend de la zlib du moteur, pas de ce dépôt.** Mesuré : le même
 *    `backup.xcfg` donne 7 658 octets sous Node 22.23 (zlib 1.2.12) et 7 646 sous
 *    Node 22.21 (zlib 1.3.1). Une comparaison d'octets sur un flux `deflate` est donc
 *    rouge ou verte selon la machine, quoi que fasse ce code.
 *
 * Le test ci-dessous garde la preuve forte pour qui détient une archive écrite par
 * XCTrack. Il est ignoré partout ailleurs — un test dépendant du poste, dit comme tel,
 * plutôt qu'une preuve affaiblie en silence :
 *
 * ```sh
 * XCFG_ARCHIVE_REELLE=/chemin/vers/backupwithmedia.xczfg npx vitest run tests/core/zip
 * ```
 */
const ARCHIVE_REELLE = process.env.XCFG_ARCHIVE_REELLE

describe.skipIf(ARCHIVE_REELLE === undefined)('conformité aux octets de XCTrack', () => {
  it("réécrit à l'octet près une archive écrite par XCTrack", async () => {
    const original = new Uint8Array(readFileSync(ARCHIVE_REELLE!))
    const rebuilt = await writeZip(await readZip(original))
    expect(rebuilt.byteLength).toBe(original.byteLength)
    expect(Buffer.from(rebuilt).equals(Buffer.from(original))).toBe(true)
  })
})

/**
 * # La bombe de décompression
 *
 * `readZip` lit ce qu'un tiers a écrit : un `.xczfg` reçu d'un autre pilote, une archive
 * de bibliothèque jointe à une issue. `deflate` sur des octets répétés dépasse un facteur
 * mille — quelques dizaines de kilo-octets réclament des gigaoctets, et l'onglet meurt
 * sans un mot. Trois plafonds l'en empêchent, et les trois se prouvent ici.
 *
 * Les essais passent leurs **propres** limites, minuscules : éprouver les valeurs de
 * `ZIP_LIMITS` demanderait d'allouer 32 Mo pour vérifier une comparaison. Ce que
 * `ZIP_LIMITS` doit valoir est un choix, dit dans `zip.ts` ; ce que le code en fait est
 * ce qui se teste.
 */
describe('readZip — une archive ne se décompresse pas sans limite', () => {
  const PETITES: ZipLimits = { entryBytes: 4096, totalBytes: 8192, entryCount: 3 }

  /** Un membre de `taille` octets nuls : le pire cas de `deflate`, et le plus réaliste. */
  function creux(name: string, taille: number): ZipEntry {
    return { name, data: new Uint8Array(taille), stored: false, dosTime: 0, dosDate: 0 }
  }

  it('un membre qui dépasse le plafond est refusé, et le taux le montre', async () => {
    const bombe = await writeZip([creux('bombe.bin', 200_000)])
    // Le rapport de compression : c'est lui qui rend l'attaque gratuite.
    expect(bombe.byteLength).toBeLessThan(2000)
    await expect(readZip(bombe, PETITES)).rejects.toThrow(/au-delà de 4096/)
  })

  it('plusieurs membres sous le plafond individuel ne franchissent pas celui de l’archive', async () => {
    const trois = await writeZip([creux('a', 3000), creux('b', 3000), creux('c', 3000)])
    // Chacun passerait seul (3000 < 4096) ; les trois font 9000, au-delà de 8192.
    await expect(readZip(trois, PETITES)).rejects.toThrow(/au-delà de 8192/)
  })

  it('un nombre de membres au-delà du plafond est refusé avant toute décompression', async () => {
    const quatre = await writeZip([creux('a', 8), creux('b', 8), creux('c', 8), creux('d', 8)])
    await expect(readZip(quatre, PETITES)).rejects.toThrow(/4 membres/)
  })

  it('une archive qui MENT sur la taille annoncée est arrêtée quand même', async () => {
    // La taille de l'offset 24 du répertoire central est une déclaration de celui qui a
    // écrit l'archive. On la remet à zéro : le contrôle bon marché passe, et c'est alors
    // la décompression elle-même qui doit s'arrêter.
    const bombe = await writeZip([creux('bombe.bin', 200_000)])
    const eocd = bombe.byteLength - 22
    const view = new DataView(bombe.buffer, bombe.byteOffset, bombe.byteLength)
    const central = view.getUint32(eocd + 16, true)
    view.setUint32(central + 24, 0, true)
    await expect(readZip(bombe, PETITES)).rejects.toThrow(/décompressé au-delà de 4096/)
  })

  it('le corpus passe sous les plafonds réels — sinon ce garde-fou serait un mur', async () => {
    // La borne qui empêche les quatre essais ci-dessus d'être verts sur un `readZip` qui
    // refuserait tout : l'archive du corpus s'ouvre avec les valeurs de production.
    const entries = await readZip(new Uint8Array(readFileSync(ARCHIVE)), ZIP_LIMITS)
    expect(entries.length).toBeGreaterThan(0)
    const total = entries.reduce((n, e) => n + e.data.byteLength, 0)
    expect(total).toBeLessThan(ZIP_LIMITS.totalBytes / 100)
  })
})
