import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Rehacer',
  'action.redoNothing': 'Nada que rehacer',
  'action.redoNamed': 'Rehacer: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Página en blanco',
  'pageKind.freeNote': 'Creada vacía en el instrumento, lista para tus propios widgets.',
  'pageKind.competition': 'Página de competición',
  'pageKind.competitionNote': 'Creada con el juego de widgets de competición del instrumento.',
  'pageKind.thermalAssistant': 'Página de asistente de térmica',
  'pageKind.thermalAssistantNote': 'Creada con el juego de widgets del asistente de térmica. ' +
    'Es la clase de página a la que salta el cambio automático al empezar a girar.',
  'pageKind.xcAssistant': 'Página de asistente XC',
  'pageKind.xcAssistantNote': 'Creada con el juego de widgets de ayuda FAI y rutas.',
  'pageKind.unknown': 'Tipo de página no reconocido',
  'pageKind.unknownNote': 'Este editor no describe este tipo de página; su contenido se ' +
    'muestra igualmente tal cual.',

  'pageKind.missing': '(sin tipo)',

  'view.landscape': 'Horizontal',
  'view.portrait': 'Vertical',

  'view.pageCard': 'Página {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} página',
    other: '{count} páginas'
  },

  'view.noPage': 'ninguna página',
  'view.emptyOrientation': 'Este archivo no describe ninguna página en esta orientación.',

  'view.remarkCount': {
    one: '{count} observación sobre este archivo',
    other: '{count} observaciones sobre este archivo'
  },

  'view.backToOverview': '← Todas las páginas',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Página anterior',
  'view.nextPage': 'Página siguiente',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Pasa el cursor por un widget para ver su nombre y sus dimensiones.',
  'view.hoverHintSelectable': 'Pasa el cursor por un widget para ver su nombre y sus ' +
    'dimensiones; haz clic para ver sus ajustes.',

  'view.selectedPin': 'seleccionado',

  'view.widgetSpoken': '{name}, {width} por {height} milímetros',

  'view.scaleAdvice': 'La página se dibuja al tamaño real que tiene en el instrumento. Puede ' +
    'que tu pantalla no tenga la densidad que el navegador supone: ajusta el zoom hasta que ' +
    'una regla apoyada en la pantalla coincida con las marcas.',

  'editor.moveNamed': 'Mover {name}',
  'editor.resizeNamed': 'Redimensionar {name}',
  'editor.deleteNamed': 'Eliminar {name}',
  'editor.duplicateNamed': 'Duplicar {name}',
  'editor.raiseNamed': 'Adelantar {name} una capa',
  'editor.lowerNamed': 'Retrasar {name} una capa',
  'editor.frontNamed': 'Traer {name} al frente',
  'editor.backNamed': 'Enviar {name} al fondo',

  'editor.onlyWidget': 'Único widget de la página',
  'editor.rank': 'Capa {index} de {total}',
  'editor.rankFront': 'Capa {index} de {total}, al frente',
  'editor.rankBack': 'Capa {index} de {total}, al fondo',

  'editor.layerLabel': 'Edición de la página: flechas para mover, Mayús + flechas para ' +
    'redimensionar, Ctrl + flechas arriba/abajo para cambiar de capa, Ctrl + D para ' +
    'duplicar, Supr para eliminar',
  'editor.toolbarLabel': 'Acciones sobre el widget seleccionado',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Enviar al fondo',
  'editor.sendToBackKeys': 'Ctrl + Mayús + Flecha abajo',
  'editor.lowerOne': 'Retrasar una capa',
  'editor.lowerOneKeys': 'Ctrl + Flecha abajo',
  'editor.raiseOne': 'Adelantar una capa',
  'editor.raiseOneKeys': 'Ctrl + Flecha arriba',
  'editor.bringToFront': 'Traer al frente',
  'editor.bringToFrontKeys': 'Ctrl + Mayús + Flecha arriba',
  'editor.duplicate': 'Duplicar',
  'editor.duplicateWidget': 'Duplicar el widget',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Eliminar',
  'editor.deleteWidget': 'Eliminar el widget',
  'editor.deleteKeys': 'Supr',

  'editor.noSelection': 'Ningún widget seleccionado.',
  'editor.selected': '{name} seleccionado, {size}.',

  'editor.emptyPage': 'Página vacía',
  'editor.pageTally': {
    one: '{count} widget en la página',
    other: '{count} widgets en la página'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, nada que cambiar.'
}

export default app
