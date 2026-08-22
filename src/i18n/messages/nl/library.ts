import type { DomainCatalog } from '../../domains'

const library: DomainCatalog<'library'> = {
  'library.entryRestored': '‘{name}’ is teruggeplaatst.',
  'library.entryRestoredBeside': '‘{name}’ is ernaast teruggeplaatst: de identificatie was al bezet.',

  'library.entryCount': {
    one: '{count} opgeborgen configuratie',
    other: '{count} opgeborgen configuraties'
  },

  'library.storedLine': '‘{name}’ is opgeborgen — {size}, {when}.'
}

export default library
