import type { DomainCatalog } from '../../domains'

const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} published release',
    other: '{count} published releases'
  }
}

export default versions
