import type { DomainCatalog } from '../../domains'

const pages: DomainCatalog<'pages'> = {
  'pages.hiddenOffFlight': {
    one: '{count} Seite wird außerhalb des Flugkontexts ausgeblendet: am Boden zeigt das Gerät nur {shown} von {total} an.',
    other: '{count} Seiten werden außerhalb des Flugkontexts ausgeblendet: am Boden zeigt das Gerät nur {shown} von {total} an.'
  },

  'device.screenSize': '{width} × {height}'
}

export default pages
