import type { DomainCatalog } from '../../domains'

const preferences: DomainCatalog<'preferences'> = {
  'preferences.settingCount': {
    one: '{count} Einstellung',
    other: '{count} Einstellungen'
  },

  'preferences.absentFromFile': {
    one: '{count} Zeile fehlt in der Datei',
    other: '{count} Zeilen fehlen in der Datei'
  },

  'preferences.setRatio': 'Sie haben {set} der {offered} Einstellungen gesetzt, die XCTrack anbietet, also {share}.'
}

export default preferences
