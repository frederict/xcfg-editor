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

  it("reconstruit l'archive à l'octet près", async () => {
    const original = new Uint8Array(readFileSync(ARCHIVE))
    const entries = await readZip(original)
    const rebuilt = await writeZip(entries)
    expect(rebuilt.byteLength).toBe(original.byteLength)
    expect(Buffer.from(rebuilt).equals(Buffer.from(original))).toBe(true)
  })
})
