import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { openContainer, exportContainer } from '../../src/core/container'
import { EXPORTS } from '../fixtures/paths'

describe('conteneur', () => {
  it('ouvre un .xcfg simple', async () => {
    const bytes = new Uint8Array(readFileSync(EXPORTS + '2026-08-20_pages-00.xcfg'))
    const container = await openContainer(bytes, '2026-08-20_pages-00.xcfg')
    expect(container.kind).toBe('xcfg')
    expect(container.document.kind).toBe('object')
  })

  it('ouvre un .xczfg et retrouve son document', async () => {
    const bytes = new Uint8Array(readFileSync(EXPORTS + '2026-08-20_backupwithmedia-00.xczfg'))
    const container = await openContainer(bytes, '2026-08-20_backupwithmedia-00.xczfg')
    expect(container.kind).toBe('xczfg')
    expect(container.extras).toHaveLength(0)
  })

  it('un export sans modification recopie les octets sources', async () => {
    const bytes = new Uint8Array(readFileSync(EXPORTS + '2025-07-07_backup-00.xcfg'))
    const container = await openContainer(bytes, '2025-07-07_backup-00.xcfg')
    const exported = await exportContainer(container)
    expect(Buffer.from(exported).equals(Buffer.from(bytes))).toBe(true)
  })

  it("un .xczfg modifié se réécrit en archive valide", async () => {
    // Seul test qui exerce la branche writeZip d'exportContainer : celle qui restitue la
    // date DOS et réinsère les fichiers annexes.
    const bytes = new Uint8Array(readFileSync(EXPORTS + '2026-08-20_backupwithmedia-00.xczfg'))
    const container = await openContainer(bytes, 'archive.xczfg')
    container.modified = true
    const exported = await exportContainer(container)

    const reopened = await openContainer(exported, 'archive.xczfg')
    expect(reopened.parseError).toBeUndefined()
    expect(reopened.dosTime).toBe(container.dosTime)
    expect(reopened.dosDate).toBe(container.dosDate)
    // Le document n'ayant pas changé, l'archive réécrite est celle d'origine.
    expect(Buffer.from(exported).equals(Buffer.from(bytes))).toBe(true)
  })

  it('un JSON invalide reste exportable', async () => {
    const bytes = new TextEncoder().encode('{ ceci n est pas du JSON')
    const container = await openContainer(bytes, 'casse.xcfg')
    expect(container.parseError).toBeDefined()
    const exported = await exportContainer(container)
    expect(Buffer.from(exported).equals(Buffer.from(bytes))).toBe(true)
  })
})
