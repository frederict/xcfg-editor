import type { DomainCatalog } from '../../domains'

const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} uitgebrachte versie',
    other: '{count} uitgebrachte versies'
  }
}

export default versions
