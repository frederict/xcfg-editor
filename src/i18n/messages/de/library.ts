import type { DomainCatalog } from '../../domains'

const library: DomainCatalog<'library'> = {
  'library.entryRestored': '„{name}“ wurde zurückgelegt.',
  'library.entryRestoredBeside': '„{name}“ wurde daneben zurückgelegt: die Kennung war bereits vergeben.',

  'library.entryCount': {
    one: '{count} abgelegte Konfiguration',
    other: '{count} abgelegte Konfigurationen'
  },

  'library.storedLine': '„{name}“ ist abgelegt — {size}, {when}.'
}

export default library
