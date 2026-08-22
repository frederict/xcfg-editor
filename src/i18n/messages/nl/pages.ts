import type { DomainCatalog } from '../../domains'

const pages: DomainCatalog<'pages'> = {
  'pages.hiddenOffFlight': {
    one: '{count} pagina is buiten vluchtcontext verborgen: aan de grond toont het toestel er maar {shown} van {total}.',
    other: '{count} pagina’s zijn buiten vluchtcontext verborgen: aan de grond toont het toestel er maar {shown} van {total}.'
  },

  'device.screenSize': '{width} × {height}'
}

export default pages
