import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { readRenderSettings, longDistanceUnit } from '../../src/model/preferences'

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
    expect(settings.windSpeedUnit).toBe('km/h')
    expect(settings.distanceUnit).toBe('km')
    expect(settings.relativeDistanceUnit).toBe('km')
    expect(settings.airspaceAltitudeUnit).toBe('m')
  })

  it('décode une couleur Android signée', () => {
    const settings = readRenderSettings(parseJson(readFileSync(DIR + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(settings.titleColor).toBe('#f44336')
  })

  it('lit les unités de vent, de distance et d’espace aérien d’un backup', () => {
    const settings = readRenderSettings(parseJson(readFileSync(DIR + '2026-08-20_backup-00.xcfg', 'utf8')))
    // Unit.WindSpeed est une préférence distincte de Unit.Speed — elles coïncident chez
    // cet utilisateur (km/h des deux côtés) mais rien ne garantit qu'un autre pilote ne
    // règle pas sa vitesse sol en km/h et son vent en m/s.
    expect(settings.windSpeedUnit).toBe('km/h')
    // Unit.Distance vaut "m,km" (petites distances, grandes distances) : on ne retient
    // que le second terme, pertinent pour les exemples en dizaines de kilomètres.
    expect(settings.distanceUnit).toBe('km')
    expect(settings.relativeDistanceUnit).toBe('km')
    expect(settings.airspaceAltitudeUnit).toBe('m')
  })
})

describe('longDistanceUnit', () => {
  it('retient le second terme d’une paire « petites,grandes » distances', () => {
    // La virgule sépare deux unités : celle pour les petites distances et celle pour
    // les grandes. XCTrack choisit laquelle afficher selon la magnitude de la valeur ;
    // nos exemples de widgets sont toujours en dizaines de kilomètres, d'où le choix
    // fixe du second terme.
    expect(longDistanceUnit('m,km')).toBe('km')
  })

  it('accepte une valeur sans virgule telle quelle', () => {
    expect(longDistanceUnit('km')).toBe('km')
  })
})
