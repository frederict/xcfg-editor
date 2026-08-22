import type { DomainCatalog } from '../../domains'

const pages: DomainCatalog<'pages'> = {
  'pages.hiddenOffFlight': {
    one: '{count} page is hidden outside flight context: on the ground, the device shows only {shown} of {total}.',
    other: '{count} pages are hidden outside flight context: on the ground, the device shows only {shown} of {total}.'
  },

  'device.screenSize': '{width} × {height}'
}

export default pages
