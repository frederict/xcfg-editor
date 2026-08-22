import type { DomainCatalog } from '../../domains'

const preferences: DomainCatalog<'preferences'> = {
  'preferences.settingCount': {
    one: '{count} setting',
    other: '{count} settings'
  },

  'preferences.absentFromFile': {
    one: '{count} line is missing from the file',
    other: '{count} lines are missing from the file'
  },

  'preferences.setRatio': 'You have set {set} of the {offered} settings XCTrack offers, that is {share}.'
}

export default preferences
