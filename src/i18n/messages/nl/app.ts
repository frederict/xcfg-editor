import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Opnieuw',
  'action.redoNothing': 'Niets om opnieuw te doen',
  'action.redoNamed': 'Opnieuw: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Lege pagina',
  'pageKind.freeNote': 'Leeg aangemaakt op het instrument, klaar voor je eigen widgets.',
  'pageKind.competition': 'Wedstrijdpagina',
  'pageKind.competitionNote': 'Aangemaakt met de wedstrijdwidgets van het instrument.',
  'pageKind.thermalAssistant': 'Pagina thermiekassistent',
  'pageKind.thermalAssistantNote': 'Aangemaakt met de widgets van de thermiekassistent. Naar ' +
    'dit paginatype schakelt het toestel vanzelf over zodra je gaat kringen.',
  'pageKind.xcAssistant': 'Pagina XC-assistent',
  'pageKind.xcAssistantNote': 'Aangemaakt met de widgets voor FAI-driehoek en routes.',
  'pageKind.unknown': 'Onbekend paginatype',
  'pageKind.unknownNote': 'Deze editor kent dit paginatype niet; de inhoud wordt gewoon ' +
    'getoond zoals ze is.',

  'pageKind.missing': '(geen type)',

  'view.landscape': 'Liggend',
  'view.portrait': 'Staand',

  'view.pageCard': 'Pagina {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} pagina',
    other: '{count} pagina’s'
  },

  'view.noPage': 'geen pagina',
  'view.emptyOrientation': 'Dit bestand beschrijft geen enkele pagina in deze richting.',

  'view.remarkCount': {
    one: '{count} opmerking over dit bestand',
    other: '{count} opmerkingen over dit bestand'
  },

  'view.backToOverview': '← Alle pagina’s',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Vorige pagina',
  'view.nextPage': 'Volgende pagina',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Ga met de muis over een widget voor de naam en de afmetingen.',
  'view.hoverHintSelectable': 'Ga met de muis over een widget voor de naam en de afmetingen; ' +
    'klik erop om de instellingen te zien.',

  'view.selectedPin': 'geselecteerd',

  'view.widgetSpoken': '{name}, {width} bij {height} millimeter',

  'view.scaleAdvice': 'De pagina wordt getekend op ware grootte, zoals op het toestel. Je ' +
    'scherm heeft niet per se de pixeldichtheid die de browser aanneemt: stel de zoom bij ' +
    'tot een echte liniaal op het scherm samenvalt met de schaalverdeling.'
}

export default app
