import type { DomainCatalog } from '../../domains'

const preferences: DomainCatalog<'preferences'> = {
  'preferences.settingCount': {
    one: '{count} instelling',
    other: '{count} instellingen'
  },

  'preferences.absentFromFile': {
    one: '{count} regel ontbreekt in het bestand',
    other: '{count} regels ontbreken in het bestand'
  },

  'preferences.setRatio': 'U hebt {set} van de {offered} instellingen die XCTrack aanbiedt ingesteld, oftewel {share}.'
}

export default preferences
