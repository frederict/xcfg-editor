import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readZip, writeZip } from '../../src/core/zip'

const ARCHIVE = '/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backupwithmedia-00.xczfg'

describe('readZip', () => {
  it('extrait backup.xcfg', async () => {
    const entries = await readZip(new Uint8Array(readFileSync(ARCHIVE)))
    expect(entries.map((e) => e.name)).toContain('backup.xcfg')
    const backup = entries.find((e) => e.name === 'backup.xcfg')!
    expect(backup.data.byteLength).toBe(78982)
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
