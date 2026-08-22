import type { DomainCatalog } from '../../domains'

const pages: DomainCatalog<'pages'> = {
  'pages.hiddenOffFlight': {
    one: '{count} página está oculta fuera del contexto de vuelo: en tierra, el dispositivo solo muestra {shown} de {total}.',
    other: '{count} páginas están ocultas fuera del contexto de vuelo: en tierra, el dispositivo solo muestra {shown} de {total}.'
  },

  'device.screenSize': '{width} × {height}'
}

export default pages
