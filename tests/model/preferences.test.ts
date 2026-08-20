import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { readRenderSettings } from '../../src/model/preferences'

const DIR = '/Users/fred/DEV/XCTrack/Exemples/'

describe('paramètres de rendu', () => {
  it('lit les préférences d’un backup', () => {
    const settings = readRenderSettings(parseJson(readFileSync(DIR + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(settings.fromDefaults).toBe(false)
    expect(settings.theme).toBe('WhiteHCTheme')
    expect(settings.altitudeUnit).toBe('m')
    expect(settings.titleFont).toBe('normal')
    // Display.WidgetTitleSize vaut la CHAÎNE "140", pas le nombre 140.
    expect(settings.titleSizePercent).toBe(140)
  })

  it('retombe sur les valeurs par défaut pour un export pages', () => {
    const settings = readRenderSettings(parseJson(readFileSync(DIR + '2026-08-20_pages-00.xcfg', 'utf8')))
    expect(settings.fromDefaults).toBe(true)
    expect(settings.theme).toBe('WhiteHCTheme')
  })

  it('décode une couleur Android signée', () => {
    const settings = readRenderSettings(parseJson(readFileSync(DIR + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(settings.titleColor).toBe('#f44336')
  })
})
