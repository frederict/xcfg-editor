import type { DomainCatalog } from '../../domains'

/**
 * Las cinco `pages.describe*` se leen dos veces: en el carrusel de páginas y, fuera de
 * contexto, como etiqueta del botón «Deshacer». Van por eso en infinitivo, como un gesto
 * con nombre: «Deshacer: Duplicar la página 3 en la posición 4 (horizontal)».
 */
const pages: DomainCatalog<'pages'> = {
  /* ==================================================== `deviceSelector.ts` */

  'device.screenSize': '{width} × {height}',

  'device.templateLabel': 'Plantilla de pantalla',

  'device.commonRatiosGroup': 'Relaciones habituales',
  'device.customGroup': 'Mis dispositivos',

  'device.addDevice': 'Añadir un dispositivo…',

  'device.widthPx': 'Anchura (px)',
  'device.heightPx': 'Altura (px)',
  'device.diagonalInches': 'Diagonal (pulgadas)',

  'device.note': '{diagonal} · {width} × {height} px — la geometría solo depende de la relación de aspecto, el tamaño percibido solo de la diagonal. Esta elección nunca se escribe en el archivo.',

  'device.namePlaceholder': 'Nombre del dispositivo',
  'device.widthPlaceholder': 'Anchura px',
  'device.widthLabel': 'Anchura en píxeles',
  'device.heightPlaceholder': 'Altura px',
  'device.heightLabel': 'Altura en píxeles',
  'device.diagonalPlaceholder': 'Diagonal ″',
  'device.diagonalLabel': 'Diagonal en pulgadas',
  'device.add': 'Añadir',
  'device.cancel': 'Cancelar',

  'device.nameRequired': 'Dé un nombre a este dispositivo.',
  'device.sizeMustBePositive': 'La anchura y la altura deben ser números de píxeles positivos.',
  'device.diagonalMustBePositive': 'La diagonal debe ser un número de pulgadas positivo.',

  /* ==================================================== orientaciones */

  'pages.landscape': 'Horizontal',
  'pages.portrait': 'Vertical',
  'pages.landscapeInline': 'horizontal',
  'pages.portraitInline': 'vertical',

  /* ==================================================== pasos del historial */

  'pages.describeInsert': 'Insertar una página «{type}» en la posición {rank} ({orientation})',
  'pages.describeDuplicate': 'Duplicar la página {rank} en la posición {target} ({orientation})',
  'pages.describeRemove': 'Eliminar la página {rank} ({orientation})',
  'pages.describeReorder': 'Mover la página {rank} a la posición {target} ({orientation})',
  'pages.describeSetClass': 'Cambiar el tipo de la página {rank}: «{before}» → «{after}» ({orientation})',
  'pages.describeEnableNavigations': 'Activar la página {rank} para todas las navegaciones ({orientation})',

  'pages.enableAllNavigations': 'Activar para todas las navegaciones',
  'pages.enableAllNavigationsFor': 'Activar la página {rank} para todas las navegaciones',

  'pages.announcementWithAdvice': '{done}. {advice}',

  'pages.undoRestores': '«Deshacer» revierte este gesto mientras esta pestaña siga abierta: aquí mismo, o en la barra superior una vez cerrado este cuadro.',

  'pages.undoNow': 'Deshacer este gesto',

  'pages.undone': 'Deshecho: {what}. El carrusel ha vuelto a lo que mostraba antes de ese gesto.',

  'pages.removalTally': {
    one: '{count} widget se va con ella.',
    other: '{count} widgets se van con ella.'
  },

  'pages.rankRange': '{first} a {last}',

  /* ==================================================== consecuencias de un gesto */

  'pages.rankIsIdentity': 'La posición es la única identidad de una página: es ella la que ' +
    'usted recorre en vuelo.',

  'pages.rankShift': {
    one: 'La página {from} pasa a ser la {to}. {identity}',
    other: 'Las páginas {from} pasan a ser las {to}. {identity}'
  },

  'pages.rankShiftReorder': 'Las páginas {range} cambian de posición. {identity}',

  'pages.thermalAlreadyPresent': {
    one: 'Este archivo ya describe una página de asistente en térmicas (página {ranks}). XCTrack solo apunta a una de ellas cuando cambia solo a espiral; este editor supone la ÚLTIMA, sin haberlo comprobado en el dispositivo. Si es esa, crear otra después de ella priva a la página {last} de ese cambio automático, sin alterar en nada su contenido.',
    other: 'Este archivo ya describe páginas de asistente en térmicas (páginas {ranks}). XCTrack solo apunta a una de ellas cuando cambia solo a espiral; este editor supone la ÚLTIMA, sin haberlo comprobado en el dispositivo. Si es esa, crear otra después de ella priva a la página {last} de ese cambio automático, sin alterar en nada su contenido.'
  },

  'pages.lastPageOfOrientation': 'Es la última página de esta orientación: el archivo ya ' +
    'no describiría ninguna.',

  'pages.noNavigablePageLeft': 'Solo quedarían páginas activadas para ninguna navegación: ' +
    'sea cual sea la navegación elegida, el dispositivo ya no tendría ninguna página que ' +
    'mostrar en esta orientación.',

  'pages.onlyThermalPage': 'Es la única página de asistente en térmicas: el cambio ' +
    'automático a espiral ya no tendría destino.',

  'pages.autoSwitchWouldTarget': 'El cambio automático a espiral apuntaría entonces a la página {rank}, si es cierto que apunta a la última — este editor lo supone sin haberlo comprobado.',

  'pages.classChangeUnverified': 'XCTrack no permite cambiar el tipo de una página después ' +
    'de crearla: queda fijado en el momento de la elección. Sin embargo, no es más que una ' +
    'línea del archivo, y este editor la escribe de buen grado — pero el comportamiento ' +
    'del dispositivo ante una página así modificada NO se ha comprobado, y los widgets de ' +
    'la página no se sustituyen por los del nuevo tipo.',

  'pages.thermalMultiple': {
    one: '{total} páginas de asistente en térmicas (páginas {ranks}). XCTrack solo apunta a una de ellas cuando cambia solo a espiral; este editor supone la última, la página {target}, sin haberlo comprobado en el dispositivo. La página {others} sigue siendo accesible de todos modos mediante «página siguiente».',
    other: '{total} páginas de asistente en térmicas (páginas {ranks}). XCTrack solo apunta a una de ellas cuando cambia solo a espiral; este editor supone la última, la página {target}, sin haberlo comprobado en el dispositivo. Las páginas {others} siguen siendo accesibles de todos modos mediante «página siguiente».'
  },

  'pages.allPagesWithoutNavigation': 'Todas las páginas de esta orientación están ' +
    'activadas para ninguna navegación: sea cual sea la navegación elegida, el dispositivo ' +
    'no tiene ninguna página que mostrar aquí.',

  /* ==================================================== el carrusel */

  'pages.regionLabel': 'Páginas en {orientation}',
  'pages.noPage': 'ninguna página',
  'pages.pageCount': { one: '{count} página', other: '{count} páginas' },

  'pages.emptyOrientation': 'Esta orientación no describe ninguna página. Una página nueva ' +
    'llega vacía: sus widgets se colocan después desde la paleta, o duplicando una página ' +
    'existente.',

  /** Voir le français : un renvoi à voix basse, jamais une promesse sur l'instrument. */
  'pages.shareSubset': 'Para enviar solo una, o algunas: «Guardar una copia» y luego ' +
    '«Versión compartible, sin datos personales» — una casilla por página decide lo que ' +
    'lleva el archivo.',

  'pages.insertAtRank': 'Insertar una página en la posición {rank}',
  'pages.insertAtEnd': 'Insertar una página en la última posición ({rank})',
  'pages.newPageAtRank': 'Nueva página en la posición {rank}',

  'pages.openPage': 'Abrir la página {rank}, {kind}, {tally}',

  'pages.autoSwitchTargetHere': 'Destino supuesto del cambio automático a espiral — no ' +
    'comprobado en el dispositivo.',
  'pages.autoSwitchTargetElsewhere': 'Este editor supone que el cambio automático apunta a la página {rank}, la última página de asistente en térmicas — no comprobado en el dispositivo.',

  'pages.moveBack': 'Retroceder la página {rank} una posición',
  'pages.moveForward': 'Avanzar la página {rank} una posición',
  'pages.duplicate': 'Duplicar',
  'pages.duplicatePage': 'Duplicar la página {rank}',
  'pages.remove': 'Eliminar',
  'pages.removePage': 'Eliminar la página {rank}',

  'pages.pageTypeLabel': 'Tipo de página',

  'pages.typeFromFile': '{type} (tipo inscrito en el archivo)',

  /* ==================================================== `navigations` */

  'pages.shownForAllNavigations': 'Mostrada para todas las navegaciones',
  'pages.shownForNoNavigation': 'Mostrada para ninguna navegación',
  'pages.shownForNavigations': 'Mostrada para: {list}'

  /*
   * Las cinco navegaciones salieron de aquí el 22-08-2026: son las palabras de XCTrack, no
   * las nuestras, y siguen el eje `labels`. Véase `src/catalog/navigationLabels.json`.
   */
}

export default pages
