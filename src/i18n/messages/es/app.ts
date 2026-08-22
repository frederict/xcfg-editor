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
    'una regla apoyada en la pantalla coincida con las marcas.'
}

export default app
