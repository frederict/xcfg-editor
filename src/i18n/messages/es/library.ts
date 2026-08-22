import type { DomainCatalog } from '../../domains'

const library: DomainCatalog<'library'> = {
  'library.entryRestored': '«{name}» se ha vuelto a colocar.',
  'library.entryRestoredBeside': '«{name}» se ha vuelto a colocar al lado: su identificador ya estaba ocupado.',

  'library.entryCount': {
    one: '{count} configuración guardada',
    other: '{count} configuraciones guardadas'
  },

  'library.storedLine': '«{name}» está guardada: {size}, {when}.'
}

export default library
