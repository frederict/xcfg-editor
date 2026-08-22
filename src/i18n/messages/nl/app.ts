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
    'tot een echte liniaal op het scherm samenvalt met de schaalverdeling.',

  'editor.moveNamed': '{name} verplaatsen',
  'editor.resizeNamed': 'Formaat van {name} wijzigen',
  'editor.deleteNamed': '{name} verwijderen',
  'editor.duplicateNamed': '{name} dupliceren',
  'editor.raiseNamed': '{name} een laag naar voren halen',
  'editor.lowerNamed': '{name} een laag naar achteren zetten',
  'editor.frontNamed': '{name} helemaal vooraan zetten',
  'editor.backNamed': '{name} helemaal achteraan zetten',

  'editor.onlyWidget': 'Enige widget op de pagina',
  'editor.rank': 'Laag {index} van {total}',
  'editor.rankFront': 'Laag {index} van {total}, vooraan',
  'editor.rankBack': 'Laag {index} van {total}, achteraan',

  'editor.layerLabel': 'Pagina bewerken: pijltoetsen om te verplaatsen, Shift + pijltoetsen ' +
    'om het formaat te wijzigen, Ctrl + pijl omhoog/omlaag om van laag te wisselen, ' +
    'Ctrl + D om te dupliceren, Delete om te verwijderen',
  'editor.toolbarLabel': 'Acties op de geselecteerde widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Helemaal naar achteren',
  'editor.sendToBackKeys': 'Ctrl + Shift + Pijl omlaag',
  'editor.lowerOne': 'Eén laag naar achteren',
  'editor.lowerOneKeys': 'Ctrl + Pijl omlaag',
  'editor.raiseOne': 'Eén laag naar voren',
  'editor.raiseOneKeys': 'Ctrl + Pijl omhoog',
  'editor.bringToFront': 'Helemaal naar voren',
  'editor.bringToFrontKeys': 'Ctrl + Shift + Pijl omhoog',
  'editor.duplicate': 'Dupliceren',
  'editor.duplicateWidget': 'De widget dupliceren',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Verwijderen',
  'editor.deleteWidget': 'De widget verwijderen',
  'editor.deleteKeys': 'Delete',

  'editor.noSelection': 'Geen widget geselecteerd.',
  'editor.selected': '{name} geselecteerd, {size}.',

  'editor.emptyPage': 'Lege pagina',
  'editor.pageTally': {
    one: '{count} widget op de pagina',
    other: '{count} widgets op de pagina'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, niets te veranderen.'
}

export default app
