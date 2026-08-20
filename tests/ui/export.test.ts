import { describe, expect, it } from 'vitest'
import { exportFileName } from '../../src/ui/export'

describe('nom du fichier exporté', () => {
  const when = new Date('2026-08-20T14:32:00')

  it('horodate le nom en conservant l’extension', () => {
    expect(exportFileName('2026-08-20_backup-00.xcfg', when))
      .toBe('2026-08-20_backup-00-modifie-2026-08-20-1432.xcfg')
  })

  it('conserve aussi l’extension d’une archive', () => {
    expect(exportFileName('2026-08-20_backupwithmedia-00.xczfg', when))
      .toBe('2026-08-20_backupwithmedia-00-modifie-2026-08-20-1432.xczfg')
  })

  it('complète les nombres à deux chiffres', () => {
    expect(exportFileName('pages.xcfg', new Date('2026-01-05T09:07:00')))
      .toBe('pages-modifie-2026-01-05-0907.xcfg')
  })

  it('accepte un nom sans extension', () => {
    expect(exportFileName('backup', when)).toBe('backup-modifie-2026-08-20-1432')
  })

  it('ne prend pas un fichier caché pour une extension', () => {
    expect(exportFileName('.xcfg', when)).toBe('.xcfg-modifie-2026-08-20-1432')
  })

  it('diffère toujours de l’original, même réappliqué à la même minute', () => {
    // La veille d'une manche, deux fichiers homonymes sur la carte SD sont une erreur
    // d'import qui ne se découvre qu'en vol.
    const once = exportFileName('backup.xcfg', when)
    const twice = exportFileName(once, when)
    expect(once).not.toBe('backup.xcfg')
    expect(twice).not.toBe(once)
  })

  it('garde les accents et les espaces du nom d’origine', () => {
    expect(exportFileName('complète.xcfg', when)).toBe('complète-modifie-2026-08-20-1432.xcfg')
  })
})
