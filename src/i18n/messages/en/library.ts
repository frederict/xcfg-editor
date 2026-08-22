import type { DomainCatalog } from '../../domains'

const library: DomainCatalog<'library'> = {
  'library.entryRestored': '“{name}” has been put back.',
  'library.entryRestoredBeside': '“{name}” has been put back alongside: its identifier was already taken.',

  'library.entryCount': {
    one: '{count} stored configuration',
    other: '{count} stored configurations'
  },

  'library.storedLine': '“{name}” is stored — {size}, {when}.'
}

export default library
