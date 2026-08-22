import type { DomainCatalog } from '../../domains'

const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} versión publicada',
    other: '{count} versiones publicadas'
  }
}

export default versions
