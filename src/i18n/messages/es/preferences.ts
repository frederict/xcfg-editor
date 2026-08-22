import type { DomainCatalog } from '../../domains'

const preferences: DomainCatalog<'preferences'> = {
  'preferences.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },

  'preferences.absentFromFile': {
    one: 'falta {count} línea en el archivo',
    other: 'faltan {count} líneas en el archivo'
  },

  'preferences.setRatio': 'Ha ajustado {set} de los {offered} ajustes que ofrece XCTrack, es decir {share}.'
}

export default preferences
