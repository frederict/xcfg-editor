import type { DomainCatalog } from '../../domains'

const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} veröffentlichte Version',
    other: '{count} veröffentlichte Versionen'
  }
}

export default versions
