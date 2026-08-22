import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Redo',
  'action.redoNothing': 'Nothing to redo',
  'action.redoNamed': 'Redo: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Blank page',
  'pageKind.freeNote': 'Created empty on the instrument, ready for your own widgets.',
  'pageKind.competition': 'Competition page',
  'pageKind.competitionNote': 'Created with the instrument’s competition widget set.',
  'pageKind.thermalAssistant': 'Thermal assistant page',
  'pageKind.thermalAssistantNote': 'Created with the thermal assistant widget set. This is ' +
    'the page class the automatic switch to thermalling aims at.',
  'pageKind.xcAssistant': 'XC assistant page',
  'pageKind.xcAssistantNote': 'Created with the widget set for FAI triangles and routes.',
  'pageKind.unknown': 'Unrecognised page type',
  'pageKind.unknownNote': 'This editor has no description for this page type; its contents ' +
    'are still shown as they are.',

  'pageKind.missing': '(no type)',

  'view.landscape': 'Landscape',
  'view.portrait': 'Portrait',

  'view.pageCard': 'Page {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} page',
    other: '{count} pages'
  },

  'view.noPage': 'no page',
  'view.emptyOrientation': 'This file describes no page in this orientation.',

  'view.remarkCount': {
    one: '{count} remark about this file',
    other: '{count} remarks about this file'
  },

  'view.backToOverview': '← All pages',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Previous page',
  'view.nextPage': 'Next page',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Hover a widget for its name and size.',
  'view.hoverHintSelectable': 'Hover a widget for its name and size; click it to see its ' +
    'settings.',

  'view.selectedPin': 'selected',

  'view.widgetSpoken': '{name}, {width} by {height} millimetres',

  'view.scaleAdvice': 'The page is drawn at the size it has on the instrument. Your screen ' +
    'may not have the pixel density the browser assumes: adjust the zoom until a real ruler ' +
    'held against the screen matches the scale.',

  'editor.moveNamed': 'Move {name}',
  'editor.resizeNamed': 'Resize {name}',
  'editor.deleteNamed': 'Delete {name}',
  'editor.duplicateNamed': 'Duplicate {name}',
  'editor.raiseNamed': 'Bring {name} forward',
  'editor.lowerNamed': 'Send {name} backward',
  'editor.frontNamed': 'Bring {name} to the front',
  'editor.backNamed': 'Send {name} to the back',

  'editor.onlyWidget': 'Only widget on the page',
  'editor.rank': 'Layer {index} of {total}',
  'editor.rankFront': 'Layer {index} of {total}, frontmost',
  'editor.rankBack': 'Layer {index} of {total}, backmost',

  'editor.layerLabel': 'Page editing: arrow keys to move, Shift + arrows to resize, ' +
    'Ctrl + up/down arrows to change layer, Ctrl + D to duplicate, Delete to remove',
  'editor.toolbarLabel': 'Actions on the selected widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Send to the back',
  'editor.sendToBackKeys': 'Ctrl + Shift + Down arrow',
  'editor.lowerOne': 'Send back one layer',
  'editor.lowerOneKeys': 'Ctrl + Down arrow',
  'editor.raiseOne': 'Bring forward one layer',
  'editor.raiseOneKeys': 'Ctrl + Up arrow',
  'editor.bringToFront': 'Bring to the front',
  'editor.bringToFrontKeys': 'Ctrl + Shift + Up arrow',
  'editor.duplicate': 'Duplicate',
  'editor.duplicateWidget': 'Duplicate the widget',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Delete',
  'editor.deleteWidget': 'Delete the widget',
  'editor.deleteKeys': 'Delete',

  'editor.noSelection': 'No widget selected.',
  'editor.selected': '{name} selected, {size}.',

  'editor.emptyPage': 'Empty page',
  'editor.pageTally': {
    one: '{count} widget on the page',
    other: '{count} widgets on the page'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, nothing to change.'
}

export default app
