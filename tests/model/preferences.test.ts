import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { readRenderSettings, longDistanceUnit, resolveLanguage } from '../../src/model/preferences'
import { EXPORTS } from '../fixtures/paths'

describe('paramètres de rendu', () => {
  it('lit les préférences d’un backup', () => {
    const settings = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(settings.fromDefaults).toBe(false)
    expect(settings.theme).toBe('WhiteHCTheme')
    expect(settings.altitudeUnit).toBe('m')
    expect(settings.titleFont).toBe('normal')
    // Display.WidgetTitleSize vaut la CHAÎNE "140", pas le nombre 140.
    expect(settings.titleSizePercent).toBe(140)
  })

  it('retombe sur les valeurs par défaut pour un export pages', () => {
    const settings = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_pages-00.xcfg', 'utf8')))
    expect(settings.fromDefaults).toBe(true)
    expect(settings.theme).toBe('WhiteHCTheme')
    expect(settings.windSpeedUnit).toBe('km/h')
    expect(settings.distanceUnit).toBe('km')
    expect(settings.relativeDistanceUnit).toBe('km')
    expect(settings.airspaceAltitudeUnit).toBe('m')
  })

  it('décode une couleur Android signée', () => {
    const settings = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(settings.titleColor).toBe('#f44336')
  })

  it('lit les unités de vent, de distance et d’espace aérien d’un backup', () => {
    const settings = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')))
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

  it('lit une langue explicite depuis Display.Language', () => {
    const withLanguage = readRenderSettings(parseJson(readFileSync(EXPORTS + '2025-07-07_backup-00.xcfg', 'utf8')))
    expect(withLanguage.language).toEqual({ kind: 'explicit', code: 'fr' })
  })

  it('signale une langue système — jamais l’anglais — quand Display.Language est vide ou absente', () => {
    // Mesuré sur l'appareil de l'utilisateur : Display.Language: "" (2 fichiers du
    // corpus sur 5) ne veut PAS dire anglais — persist.sys.locale y vaut fr-FR et
    // XCTrack y affiche du français. Le vide et l'absence de section `preferences`
    // signifient tous deux « langue système, inconnue de ce fichier » : ce n'est
    // décidable qu'à l'affichage (src/ui/), jamais ici.
    const emptyLanguage = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_backup-00.xcfg', 'utf8')))
    expect(emptyLanguage.language).toEqual({ kind: 'system' })

    const noPreferencesAtAll = readRenderSettings(parseJson(readFileSync(EXPORTS + '2026-08-20_pages-00.xcfg', 'utf8')))
    expect(noPreferencesAtAll.language).toEqual({ kind: 'system' })
  })
})

describe('resolveLanguage', () => {
  it('privilégie la langue explicite du fichier sur celle du système', () => {
    expect(resolveLanguage({ kind: 'explicit', code: 'fr' }, 'de-DE')).toBe('fr')
  })

  it('retombe sur la langue système fournie par l’appelant quand le fichier ne dit rien', () => {
    // La fonction ne lit jamais navigator elle-même : la langue système lui est
    // fournie en paramètre par l'appelant (src/ui/, avec navigator.language).
    expect(resolveLanguage({ kind: 'system' }, 'de-DE')).toBe('de-DE')
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
