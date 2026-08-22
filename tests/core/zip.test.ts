import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readZip, writeZip, ZIP_LIMITS, type ZipEntry, type ZipLimits } from '../../src/core/zip'
import { relireSansNous, unzipTest, UNZIP_PRESENT } from './zipIndependant'
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
 * # Ce qu'un outil extérieur lit dans l'archive qu'on produit
 *
 * Tout ce qui précède rouvre l'archive avec `readZip`, donc avec nous. Cela ne mesure que
 * notre cohérence avec nous-mêmes, et c'est aveugle à tout ce que `readZip` n'écrit ni ne
 * lit — au premier rang de quoi le **CRC32**. Mesuré : `writeZip` passé à `crc = 0`, la
 * suite entière reste verte (2 144 tests, aucun tué) et `unzip -t` refuse le fichier que
 * le pilote vient de télécharger.
 *
 * Les témoins d'ici sont donc extérieurs à `src/` : la zlib de Node décompresse et
 * recalcule le CRC, `unzip` du système juge l'archive entière. `tests/core/zipIndependant.ts`
 * dit pourquoi et comment.
 */
describe('writeZip — ce qu’un outil extérieur lit dans l’archive produite', () => {
  // Un horodatage DOS quelconque mais **non nul** : c'est la seule façon de voir tomber
  // une mutation qui écrirait 0 dans l'en-tête local.
  const HEURE = 0x4d20
  const DATE = 0x5915

  function membres(): ZipEntry[] {
    const encoder = new TextEncoder()
    return [
      // Comprimé, et assez répétitif pour que `deflate` fasse vraiment quelque chose.
      { name: 'backup.xcfg', data: encoder.encode(`{\n  "a": 1\n}\n${'x'.repeat(4000)}`), stored: false, dosTime: HEURE, dosDate: DATE },
      // Stocké : la branche qui ne passe pas par le déflateur, celle des `.xczfg` rangés
      // tels quels dans l'archive de bibliothèque.
      { name: 'entrees/déjà.xczfg', data: new Uint8Array([0x50, 0x4b, 5, 6, 0, 0]), stored: true, dosTime: HEURE, dosDate: DATE },
      // Un membre vide : le CRC32 de rien vaut 0, et c'est justement la valeur qu'une
      // mutation `crc = 0` produirait partout. Il est ici pour qu'on sache qu'il passe.
      { name: 'vide.txt', data: new Uint8Array(0), stored: false, dosTime: HEURE, dosDate: DATE }
    ]
  }

  it('le CRC32 de chaque membre est celui de ses octets, recalculé par la zlib de Node', async () => {
    const source = membres()
    const relus = relireSansNous(await writeZip(source))
    expect(relus).toHaveLength(source.length)

    for (const [rang, membre] of relus.entries()) {
      const attendu = source[rang]!
      expect(membre.name).toBe(attendu.name)
      // Les octets d'abord : un CRC juste sur le mauvais contenu ne vaut rien.
      expect(Buffer.from(membre.data).equals(Buffer.from(attendu.data)), membre.name).toBe(true)
      // Puis le CRC, des deux côtés de l'entrée. `readZip` ne lit que le central ; un
      // extracteur en mode flux lit le descripteur, derrière les octets comprimés.
      expect(membre.crcCentral, `${membre.name} — répertoire central`).toBe(membre.crcReel)
      expect(membre.crcLocal, `${membre.name} — descripteur de données`).toBe(membre.crcReel)
    }
  })

  it('le côté local répète l’horodatage DOS du répertoire central', async () => {
    // `readZip` ne relit que le répertoire central : `expect(await readZip(rebuilt))
    // .toEqual(entries)` est aveugle à l'en-tête local, que les extracteurs lisent.
    for (const membre of relireSansNous(await writeZip(membres()))) {
      expect(membre.dosTimeCentral, membre.name).toBe(HEURE)
      expect(membre.dosDateCentral, membre.name).toBe(DATE)
      expect(membre.dosTimeLocal, `${membre.name} — en-tête local`).toBe(HEURE)
      expect(membre.dosDateLocal, `${membre.name} — en-tête local`).toBe(DATE)
    }
  })

  it('l’archive du corpus, réécrite, porte les mêmes CRC que ses octets', async () => {
    // Le cas réel : ce que le pilote télécharge après avoir touché un `.xczfg`.
    const rebuilt = await writeZip(await readZip(new Uint8Array(readFileSync(ARCHIVE))))
    const relus = relireSansNous(rebuilt)
    expect(relus.length).toBeGreaterThan(0)
    for (const membre of relus) {
      expect(membre.crcCentral, membre.name).toBe(membre.crcReel)
      expect(membre.crcLocal, membre.name).toBe(membre.crcReel)
    }
    const backup = relus.find((m) => m.name === 'backup.xcfg')!
    expect(Buffer.from(backup.data).equals(readFileSync(BACKUP_ARCHIVE))).toBe(true)
  })

  it.skipIf(!UNZIP_PRESENT)('unzip -t du système accepte l’archive', async () => {
    // Le juge que le pilote a sous la main. Sur `crc = 0` il répond « bad CRC », code de
    // retour 2, et `unzipTest` lève avec cette ligne-là.
    expect(unzipTest(await writeZip(membres()), 'bibliotheque.zip')).toContain('No errors detected')
    expect(unzipTest(await writeZip(await readZip(new Uint8Array(readFileSync(ARCHIVE)))), 'archive.xczfg'))
      .toContain('No errors detected')
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
