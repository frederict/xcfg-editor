import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readZip, writeZip } from '../../src/core/zip'
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
