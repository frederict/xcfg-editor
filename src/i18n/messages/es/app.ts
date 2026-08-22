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

  'view.pointHint': 'Señala un widget, con el dedo o el ratón, para ver su nombre y sus dimensiones.',
  'view.pointHintSelectable': 'Señala un widget, con el dedo o el ratón, para ver su nombre ' +
    'y sus dimensiones; elígelo para ver sus ajustes.',

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

  'editor.nothingToChange': '{rank}, nada que cambiar.',

  'app.name': 'Configuración XCTrack',

  'app.editingRole': 'edición',
  'app.editingBadge': 'Edición',

  'app.dropVeil': 'Suelta el archivo para abrirlo',

  'app.settings': 'Ajustes',
  'app.settingsHint': 'Ajustes generales — todo lo que se configura fuera de las páginas de ' +
    'widgets: unidades, botones, sensores, sonido, espacios aéreos.',

  'menu.file': 'Archivo',
  'menu.openFile': 'Abrir un archivo…',
  'menu.openFileHint': 'Elige un .xcfg o un .xczfg exportado desde el instrumento. El archivo ' +
    'se queda en esta máquina.',
  'menu.library': 'Biblioteca…',
  'menu.libraryHint': 'Guarda la configuración abierta con un nombre y recupera las que ya ' +
    'has guardado. Todo se queda en este navegador: sin servidor y sin cuenta.',
  'menu.version': 'Versión y compatibilidad…',
  'menu.versionHint': 'Elige la versión de XCTrack a la que apuntas y descubre qué lleva este ' +
    'archivo que ella no conoce — o al revés.',
  'menu.manual': 'Manual de uso…',
  'menu.manualHint': 'Cómo sacar el archivo del instrumento, cómo preparar tus páginas y qué ' +
    'no debes compartir nunca.',

  'app.saveCopy': 'Guardar una copia',
  'app.saveChanges': 'Guardar los cambios',

  'app.editPages': 'Editar las páginas',
  'app.editPagesHint': 'Editar las páginas — mover, redimensionar y añadir widgets.',
  'app.editSettings': 'Editar los ajustes',
  'app.editSettingsHint': 'Editar los ajustes — cambiar los valores de los ajustes generales.',
  'app.inspect': 'Solo consultar',
  'app.inspectHint': 'Solo consultar — salir del modo edición. No se deshace nada.',

  'action.undoNothing': 'Nada que deshacer',
  'action.undoNamed': 'Deshacer: {what}',

  'landing.title': 'Prepara tus páginas de XCTrack antes de volar',
  'landing.lead': 'Abre un archivo .xcfg o .xczfg exportado desde el instrumento: sus páginas ' +
    'aparecen tal como el aparato las dibuja, a tamaño real. Mueve un widget, cambia su ' +
    'tamaño, añade más, y llévate luego una copia nueva para la tarjeta SD.',

  'landing.privacy': 'Tu archivo no sale de esta máquina: todo ocurre en este navegador, sin ' +
    'servidor y sin cuenta. Y lo que no has tocado sale exactamente como entró, sin una sola ' +
    'coma reescrita — tus ajustes seguirán siendo tuyos.',

  'landing.dropHere': 'Suelta aquí tu archivo',
  'landing.dropOrPick': 'o haz clic para elegirlo — .xcfg o .xczfg',

  'landing.stepDeviceTitle': 'En el instrumento',
  'landing.stepDeviceText': '«Ajustes», y luego «Exportar la configuración». El archivo cae ' +
    'en la tarjeta SD.',
  'landing.stepHereTitle': 'Aquí',
  'landing.stepHereText': 'Las páginas aparecen numeradas en el orden en que « página ' +
    'siguiente » las recorre en vuelo.',
  'landing.stepEditTitle': 'Editar',
  'landing.stepEditText': 'Mueve un widget con el dedo o con el ratón, cambia su tamaño, añade ' +
    'otros: la página se redibuja a tamaño real ante tus ojos.',
  'landing.stepKnowTitle': 'Conviene saberlo',
  'landing.stepKnowText': 'Es el ajuste « navigations » de una página, y no su tipo, lo que ' +
    'decide cuándo el aparato la muestra.',

  'landing.returning': '¿Ya has estado aquí? Las configuraciones que guardaste están en el ' +
    'menú « Archivo », arriba a la derecha, en « Biblioteca »: nunca han salido de este navegador.',
  'landing.readManual': 'Leer el manual de uso',

  'app.uiLanguage': 'Idioma de la interfaz',
  'app.uiLanguageNamed': 'Idioma de la interfaz: {name}',
  'app.uiLanguageHint': 'Elegir el idioma de esta interfaz. Las etiquetas de XCTrack no cambian.',
  'app.uiLanguageLead': 'Las palabras de esta interfaz: títulos, explicaciones, avisos. Este navegador recuerda la elección.',
  'app.labelsAxisLead': 'Los nombres de widgets, opciones y ajustes, tal como los muestra su instrumento. Vienen del archivo abierto, y esta elección no los cambia.',
  'app.languageDialogTitle': 'Idiomas',
  'app.languageFailedTitle': 'No se ha podido cargar el idioma',

  'app.metaFormat': 'Formato',
  'app.containerArchive': 'archivo comprimido .xczfg',
  'app.containerPlain': 'archivo .xcfg',
  'app.metaDevice': 'Aparato según el archivo',
  'app.notDeclared': 'no indicado',
  'app.metaLabels': 'Etiquetas de XCTrack',
  'app.labelsFromBrowser': '{language} (idioma del navegador)',
  'app.labelsFromFile': '{language} (indicado por el archivo)',
  'app.metaRenderSettings': 'Ajustes de dibujo',
  'app.renderSettingsAssumed': 'valores supuestos, ausentes del archivo',

  'app.overviewTitle': 'Páginas de la configuración',

  'app.seeDetail': {
    one: 'Ver el detalle ({count})',
    other: 'Ver los detalles ({count})'
  },
  'app.attentionTitle': 'Conviene revisar en este archivo',
  'app.revealsTitle': 'Lo que este archivo revela de ti',

  'app.editModeNote': 'Modo edición: abre una página para añadirle widgets, moverlos y ' +
    'ajustar sus opciones. Las páginas mismas — insertar, duplicar, eliminar, reordenar — se ' +
    'gestionan aquí.',

  'dock.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} cambiado por ti',
    other: '{count} cambiados por ti'
  },

  'dock.label': 'Widgets de la página y ajustes del widget seleccionado',
  'dock.labelReadOnly': 'Widgets de la página y ajustes del widget seleccionado, solo lectura',

  'dock.gripLabel': 'Altura del panel de ajustes',
  'dock.gripHint': 'Arrastra para cambiar la altura del panel — con el teclado, flechas ' +
    'arriba y abajo, Re Pág y Av Pág a pasos grandes, Inicio y Fin a los extremos.',
  'dock.heightPixels': {
    one: '{count} píxel',
    other: '{count} píxeles'
  },

  'dock.widgetList': 'Lista de widgets',
  'dock.expandSettings': 'Desplegar los ajustes',
  'dock.collapse': 'Plegar',
  'dock.showList': 'Mostrar la lista',
  'dock.hideList': 'Ocultar la lista',

  'dock.noSelection': 'Ningún widget seleccionado',
  'dock.selectionRank': '{name} — capa {index} de {total}',
  'dock.chooseWidget': 'Elige un widget para ver sus ajustes',
  'dock.hintEditing': 'Haz clic en un widget de la página: sus ajustes aparecen aquí, en el ' +
    'orden en que el instrumento los presenta.',
  'dock.hintInspecting': 'Haz clic en un widget de la página — o elígelo en la lista — para ' +
    'leer sus ajustes. Aquí no se puede cambiar nada: esto es la consulta.',
  'dock.loadingSettings': 'Cargando los ajustes…',

  'app.addWidget': 'Añadir un widget',
  'app.managePages': 'Gestionar las páginas',
  'app.gridSize': 'Rejilla {cols} × {rows}',
  'app.editKeysHint': 'Arrastrar: mover · esquinas y lados: redimensionar · flechas: una ' +
    'celda · Mayús + flechas: redimensionar · Ctrl + flechas: cambiar de capa · Ctrl + D: ' +
    'duplicar · Supr: eliminar · Esc: quitar la selección',

  'app.setSettingNamed': 'Ajustar {label} — {name}',

  'app.pageHasNoWidgetSlot': 'Esta página no tiene sitio para widgets. Esta herramienta no ' +
    'puede crearlo: no inventa nada que el archivo no lleve ya.',

  'app.managePagesLead': 'Insertar, duplicar, eliminar, reordenar. Cada operación queda ' +
    'registrada: « Deshacer » la revierte como todo lo demás. La clase de una página, en ' +
    'cambio, no se ofrece para cambiarla — XCTrack la fija al crearla, y el efecto de ' +
    'cambiarla después no se ha comprobado en el aparato.',

  'app.pageOperationFailed': 'Este cambio no se ha podido hacer: tus páginas no se han ' +
    'movido. Detalle técnico: {detail}',

  'app.repository': 'El proyecto en GitHub — informar de un problema, proponer una mejora',
  'app.manualTitle': 'Manual de uso',
  'app.close': 'Cerrar',
  'app.loading': 'Cargando…',

  'app.technicalDetail': 'Detalle técnico',

  'app.loadingSettingsPage': 'Cargando los ajustes generales…',
  'app.settingsFailedTitle': 'Los ajustes generales no se han podido abrir',
  'app.settingsFailedMessage': 'No se ha podido cargar la lista de ajustes que ofrece XCTrack.',
  'app.fileNotAtFault': 'El archivo no tiene la culpa: sigue abierto e intacto.',
  'app.backToPages': 'Volver a las páginas',

  'app.manualBack': 'Cerrar el manual',
  'app.manualToc': 'Índice',
  'app.loadingManual': 'Cargando el manual…',
  'app.manualFailedMessage': 'Nada ha cambiado en su archivo. Inténtelo de nuevo.',
  'app.manualFailedTitle': 'El manual no se ha podido abrir',
  'app.fileUntouchedRetry': 'Tu archivo no se ha movido. Inténtalo de nuevo.',

  'app.versionDialogTitle': 'Versión objetivo y compatibilidad',
  'app.versionLead': 'El formato de XCTrack cambia en cada versión. Elige la versión a la que ' +
    'apuntas: el editor dirá entonces qué lleva este archivo que esa versión no conoce, y qué ' +
    'espera ella que él no tiene. Es una constatación: nada se mueve mientras no lo pidas.',
  'app.loadingVersions': 'Cargando la base de versiones…',
  'app.versionFailedTitle': 'El diagnóstico de versión no se ha podido abrir',
  'app.versionFailedMessage': 'No se ha podido cargar la lista de versiones de XCTrack.',

  'app.libraryFailedTitle': 'La biblioteca no se ha podido abrir',
  'app.libraryFailedMessage': 'Tu navegador no ha dado acceso al almacenamiento de esta ' +
    'herramienta. El archivo abierto no se ha movido.',

  'app.exportDialogFailedTitle': 'La ventana de guardado no se ha podido abrir',
  'app.exportDialogFailedMessage': 'No se ha guardado nada y tu archivo no se ha movido. ' +
    'Inténtalo de nuevo.',

  'app.openFailedTitle': 'Este archivo no se ha podido abrir',
  'app.openFailedMessage': 'Esta herramienta no ha sabido sacar nada de él. El archivo no se ' +
    'ha modificado.',
  'app.openFailedHint': 'Comprueba que sea realmente una exportación de XCTrack (.xcfg o ' +
    '.xczfg). Puedes soltar otro archivo en cualquier punto de esta página, o elegirlo en el ' +
    'menú « Archivo », arriba a la derecha.',

  'app.unreadableTitle': 'Este archivo no se ha podido leer',
  'app.unreadableMessage': 'Comprueba que sea el archivo .xcfg o .xczfg que produce en el ' +
    'instrumento «Ajustes», y luego «Exportar la configuración», y que esté completo.',
  'app.unreadableHint': 'Sus bytes se conservan intactos: « Guardar una copia » te lo devuelve ' +
    'tal como entró, sin la menor reescritura.',
  'app.unreadableIncoming': '« {incoming} » no ha dado nada aprovechable. « {kept} » sigue ' +
    'abierto, y todo lo que has cambiado en él sigue ahí.',

  'app.unsavedTitle': 'Tus cambios no están guardados',
  'app.replaceMessage': 'Abrir « {incoming} » cierra « {kept} » y todo lo que acabas de ' +
    'cambiar en él. Esta herramienta no guarda nada por su cuenta: lo que no se guarda se pierde.',
  'app.lastChange': 'Último cambio: « {change} ».',
  'app.replaceHint': 'Para no perder nada: conserva tus cambios y luego usa « Guardar los ' +
    'cambios » en lo alto de la página — o guarda esta configuración en la biblioteca.',
  'app.replaceAndLose': 'Abrir « {incoming} » y perderlos',
  'app.keepChanges': 'Conservar mis cambios'
}

export default app
