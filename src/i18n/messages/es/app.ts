import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Rehacer',
  'action.redoNothing': 'Nada que rehacer',
  'action.redoNamed': 'Rehacer: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.shortNameTitle':
    'El nombre que el archivo da a este tipo de página. No cambia de una lengua a otra: es lo que leería al abrir el archivo.',

  'pageKind.free': 'Página en blanco',
  'pageKind.freeNote': 'Creada vacía en el instrumento, lista para sus propios widgets.',
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

  'view.enableAllNavigations': 'Activar para todas las navegaciones',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Página anterior',
  'view.nextPage': 'Página siguiente',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.pointHint': 'Señale un widget, con el dedo o el ratón, para ver su nombre y sus dimensiones.',
  'view.pointHintSelectable': 'Señale un widget, con el dedo o el ratón, para ver su nombre ' +
    'y sus dimensiones; elíjalo para ver sus ajustes.',

  'view.selectedPin': 'seleccionado',

  'view.widgetSpoken': '{name}, {width} por {height} milímetros',

  'view.scaleAdvice': 'La página se dibuja al tamaño real que tiene en el instrumento. Puede ' +
    'que su pantalla no tenga la densidad que el navegador supone: ajuste el zoom hasta que ' +
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

  'app.dropVeil': 'Suelte el archivo para abrirlo',

  'app.settings': 'Ajustes',
  'app.settingsHint': 'Ajustes generales — todo lo que se configura fuera de las páginas de ' +
    'widgets: unidades, botones, sensores, sonido, espacios aéreos.',

  'menu.file': 'Archivo',
  'menu.openFile': 'Abrir un archivo…',
  'menu.openFileHint': 'Elija un .xcfg o un .xczfg exportado desde el instrumento. El archivo ' +
    'se queda en esta máquina.',
  'menu.library': 'Biblioteca…',
  'menu.libraryHint': 'Guarde la configuración abierta con un nombre y recupere las que ya ' +
    'ha guardado. Todo se queda en este navegador: sin servidor y sin cuenta.',
  'menu.version': 'Versión y compatibilidad…',
  'menu.versionHint': 'Elija la versión de XCTrack a la que apunta y descubra qué lleva este ' +
    'archivo que ella no conoce — o al revés.',
  'menu.manual': 'Manual de uso…',
  'menu.manualHint': 'Cómo sacar el archivo del instrumento, cómo preparar sus páginas y qué ' +
    'no debe compartir nunca.',

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

  'landing.title': 'Prepare sus páginas de XCTrack antes de volar',
  'landing.lead': 'Abra un archivo .xcfg o .xczfg exportado desde el instrumento: sus páginas ' +
    'aparecen tal como el aparato las dibuja, a tamaño real. Mueva un widget, cambie su ' +
    'tamaño, añada más, y llévese luego una copia nueva para la tarjeta SD.',

  'landing.privacy': 'Su archivo no sale de esta máquina: todo ocurre en este navegador, sin ' +
    'servidor y sin cuenta. Y lo que no ha tocado sale exactamente como entró, sin una sola ' +
    'coma reescrita — sus ajustes seguirán siendo suyos.',

  'landing.dropHere': 'Suelte aquí su archivo',
  'landing.dropOrPick': 'o haga clic para elegirlo — .xcfg o .xczfg',

  'landing.stepDeviceTitle': 'En el instrumento',
  'landing.stepDeviceText': '«Preferencias», «Configuración exportación e importación», y ' +
    'luego «Exportar la configuración». El archivo cae en la tarjeta SD.',
  'landing.stepHereTitle': 'Aquí',
  'landing.stepHereText': 'Las páginas aparecen numeradas en el orden en que «página ' +
    'siguiente» las recorre en vuelo.',
  'landing.stepEditTitle': 'Editar',
  'landing.stepEditText': 'Mueva un widget con el dedo o con el ratón, cambie su tamaño, añada ' +
    'otros: la página se redibuja a tamaño real ante sus ojos.',
  'landing.stepKnowTitle': 'Conviene saberlo',
  'landing.stepKnowText': 'No es el tipo de una página lo que decide cuándo el aparato la ' +
    'muestra en vuelo, sino un ajuste aparte, y este editor se lo dice página por página, ' +
    'con todas sus letras.',

  'landing.returning': '¿Ya ha estado aquí? Las configuraciones que guardó están en el ' +
    'menú «Archivo», arriba a la derecha, en «Biblioteca»: nunca han salido de este navegador.',
  'landing.manualLead': '¿Es su primera vez aquí? El manual dice qué hace esta herramienta, qué se ha medido en el aparato y qué revela de usted un archivo de configuración.',
  'landing.readManual': 'Leer el manual de uso',

  'app.uiLanguage': 'Idioma de la interfaz',
  'app.uiLanguageNamed': 'Idioma de la interfaz: {name}',
  'app.uiLanguageHint': 'Elegir el idioma de esta interfaz. Las etiquetas de XCTrack siguen el archivo abierto.',
  'app.uiLanguageLead': 'Las palabras de esta interfaz: títulos, explicaciones, avisos. Este navegador recuerda la elección.',
  'app.labelsAxisLead': 'Los nombres de widgets, opciones y ajustes, tal como los muestra su instrumento. Vienen del archivo abierto; cuando este no indica ninguno, siguen el idioma elegido arriba.',
  'app.languageDialogTitle': 'Idiomas',
  'app.languageFailedTitle': 'No se ha podido cargar el idioma',

  'app.metaFormat': 'Formato',
  'app.containerArchiveAlone': 'archivo comprimido .xczfg — solo contiene {inner}, ningún archivo anexo',
  'app.containerArchiveWith': 'archivo comprimido .xczfg — contiene {inner} y {annexes}',
  'app.annexCount': {
    one: '{count} archivo anexo',
    other: '{count} archivos anexos'
  },
  'app.containerPlain': 'archivo .xcfg',
  'app.metaDevice': 'Aparato según el archivo',
  'app.notDeclared': 'no indicado',
  'app.metaLabels': 'Etiquetas de XCTrack',
  'app.labelsFromBrowser': '{language} (idioma del navegador)',
  'app.labelsFromUi': '{language} (idioma de la interfaz)',
  'app.labelsFromFile': '{language} (indicado por el archivo)',
  'app.metaRenderSettings': 'Ajustes de dibujo',
  'app.renderSettingsAssumed': 'valores supuestos, ausentes del archivo',

  'app.overviewTitle': 'Páginas de la configuración',

  'app.seeDetail': {
    one: 'Ver el detalle ({count})',
    other: 'Ver los detalles ({count})'
  },
  'app.attentionTitle': 'Conviene revisar en este archivo',
  'app.revealsTitle': 'Lo que este archivo revela de usted',

  'app.editModeNote': 'Modo edición: abra una página para añadirle widgets, moverlos y ' +
    'ajustar sus opciones. Las páginas mismas — insertar, duplicar, eliminar, reordenar — se ' +
    'gestionan aquí.',

  'dock.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} cambiado por usted',
    other: '{count} cambiados por usted'
  },

  'dock.label': 'Widgets de la página y ajustes del widget seleccionado',
  'dock.labelReadOnly': 'Widgets de la página y ajustes del widget seleccionado, solo lectura',

  'dock.gripLabel': 'Altura del panel de ajustes',
  'dock.gripHint': 'Arrastre para cambiar la altura del panel — con el teclado, flechas ' +
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
  'dock.chooseWidget': 'Elija un widget para ver sus ajustes',
  'dock.hintEditing': 'Haga clic en un widget de la página: sus ajustes aparecen aquí, en el ' +
    'orden en que el instrumento los presenta.',
  'dock.hintInspecting': 'Haga clic en un widget de la página — o elíjalo en la lista — para ' +
    'leer sus ajustes. Aquí no se puede cambiar nada: esto es la consulta.',
  'dock.cramped': 'Esta ventana es demasiado corta para mostrar la página entera y sus ' +
    'ajustes a la vez. «Plegar» devuelve a la página el espacio del panel, pero le quita ' +
    'los ajustes; y aquí ningún paso del zoom la muestra entera.',
  'dock.crampedZoom': 'Esta ventana es demasiado corta para mostrar la página entera y sus ajustes a la vez. «Plegar» devuelve a la página el espacio del panel, pero le quita los ajustes; con un zoom del {level} se ve entera, pero ya no a su tamaño real.',
  /**
   * ⚠ **Le cas où le calcul tombe sur 100 % a sa propre phrase.** Voir `syncPlateFit` :
   * « … mais plus à sa taille réelle » suppose le pilote au zoom qu’il a calibré à la
   * règle. À 100 % la supposition tombe, et la phrase contredit alors
   * `view.scaleAdvice`, à trois centimètres de là. Elle dit donc ce que 100 % EST — le
   * cran d’origine — au lieu de dire ce qu’il n’est pas.
   */
  'dock.crampedZoomFull': 'Esta ventana es demasiado corta para mostrar la página entera y sus ajustes a la vez. «Plegar» devuelve a la página el espacio del panel, pero le quita los ajustes; con un zoom del {level} se ve entera: es el paso de partida, aquel desde el que se ajusta con una regla real.',

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
    'registrada: «Deshacer» la revierte como todo lo demás. La clase de una página, en ' +
    'cambio, no se ofrece para cambiarla — XCTrack la fija al crearla, y el efecto de ' +
    'cambiarla después no se ha comprobado en el aparato.',

  'app.pageOperationFailed': 'Este cambio no se ha podido hacer: sus páginas no se han ' +
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
  'app.fileUntouchedRetry': 'Su archivo no se ha movido. Inténtelo de nuevo.',

  'app.versionDialogTitle': 'Versión objetivo y compatibilidad',
  'app.versionLead': 'El formato de XCTrack cambia en cada versión. Elija la versión a la que ' +
    'apunta: el editor dirá entonces qué lleva este archivo que esa versión no conoce, y qué ' +
    'espera ella que él no tiene. Es una constatación: nada se mueve mientras no lo pida.',
  'app.loadingVersions': 'Cargando la base de versiones…',
  'app.versionFailedTitle': 'El diagnóstico de versión no se ha podido abrir',
  'app.versionFailedMessage': 'No se ha podido cargar la lista de versiones de XCTrack.',

  'app.libraryFailedTitle': 'La biblioteca no se ha podido abrir',
  'app.libraryFailedMessage': 'Su navegador no ha dado acceso al almacenamiento de esta ' +
    'herramienta. El archivo abierto no se ha movido.',

  'app.exportDialogFailedTitle': 'La ventana de guardado no se ha podido abrir',
  'app.exportDialogFailedMessage': 'No se ha guardado nada y su archivo no se ha movido. ' +
    'Inténtelo de nuevo.',

  'app.exportHandedOver': '«{name}» ({size}) — esta herramienta ha pedido a su navegador que lo guarde.',
  'app.exportWhereToLook': 'Búsquelo entre sus descargas: esta página no ve lo que ocurre ' +
    'allí. Si no está, autorice las descargas para este sitio y vuelva a empezar.',
  'app.exportReceiptDismiss': 'Cerrar este recibo de guardado',

  'app.exportFailedTitle': 'El archivo no se ha podido fabricar',
  'app.exportFailedMessage': 'De esta herramienta no ha salido nada, y su configuración no se ' +
    'ha movido. Inténtelo de nuevo.',

  'app.openFailedTitle': 'Este archivo no se ha podido abrir',
  'app.openFailedMessage': 'Esta herramienta no ha sabido sacar nada de él. El archivo no se ' +
    'ha modificado.',
  'app.openFailedHint': 'Compruebe que sea realmente una exportación de XCTrack (.xcfg o ' +
    '.xczfg). Puede soltar otro archivo en cualquier punto de esta página, o elegirlo en el ' +
    'menú «Archivo», arriba a la derecha.',

  'app.unreadableTitle': 'Este archivo no se ha podido leer',
  'app.unreadableMessage': 'Compruebe que sea el archivo .xcfg o .xczfg que produce en el ' +
    'instrumento «Preferencias», «Configuración exportación e importación», y luego «Exportar ' +
    'la configuración», y que esté completo.',
  'app.unreadableHint': 'Sus bytes se conservan intactos: «Guardar una copia» se lo devuelve ' +
    'tal como entró, sin la menor reescritura.',
  'app.unreadableIncoming': '«{incoming}» no ha dado nada aprovechable. «{kept}» sigue ' +
    'abierto, y todo lo que ha cambiado en él sigue ahí.',

  'app.unsavedTitle': 'Sus cambios no están guardados',
  'app.replaceMessage': 'Abrir «{incoming}» cierra «{kept}» y todo lo que acaba de ' +
    'cambiar en él. Esta herramienta no guarda nada por su cuenta: lo que no se guarda se pierde.',
  'app.lastChange': 'Último cambio: «{change}».',
  'app.replaceHint': 'Para no perder nada: conserve sus cambios y luego use «Guardar los ' +
    'cambios» en lo alto de la página — o guarde esta configuración en la biblioteca.',
  'app.replaceAndLose': 'Abrir «{incoming}» y perderlos',
  'app.keepChanges': 'Conservar mis cambios',
  /* ------------------------------------ lo que ha cambiado: una lista, dos pantallas */

  'menu.changes': 'Lo que ha cambiado',
  'menu.changesHint': 'La lista de lo que separa el archivo abierto del documento que tiene delante.',
  'changes.title': 'Lo que ha cambiado',
  'changes.none': 'Nada ha cambiado desde que abrió «{name}».',
  'changes.noneWhy': 'El documento es, carácter por carácter, el que entregó el archivo: guardado ahora, saldrá con la misma huella SHA-256.',
  'changes.lead': 'Entre «{name}», el archivo que abrió, y el documento que tiene delante: {what}.',
  'changes.caveat': 'Este recuento compara dos estados; no cuenta sus gestos. Lo que hizo y luego deshizo no figura aquí, y un rango que solo se ha desplazado no es un movimiento.',

  'changes.pagesAdded': { one: '{count} página añadida', other: '{count} páginas añadidas' },
  'changes.pagesRemoved': { one: '{count} página retirada', other: '{count} páginas retiradas' },
  'changes.pagesChanged': { one: '{count} página modificada', other: '{count} páginas modificadas' },
  'changes.widgetsAdded': { one: '{count} widget añadido', other: '{count} widgets añadidos' },
  'changes.widgetsRemoved': { one: '{count} widget retirado', other: '{count} widgets retirados' },
  'changes.widgetsChanged': { one: '{count} widget modificado', other: '{count} widgets modificados' },
  'changes.settingsTouched': { one: '{count} ajuste general', other: '{count} ajustes generales' },
  'changes.otherTouched': { one: '{count} otra línea del archivo', other: '{count} otras líneas del archivo' },

  'changes.pagesHeading': 'Las páginas',
  'changes.settingsHeading': 'Los ajustes generales',
  'changes.settingsNote': 'Cada ajuste se nombra por su línea del archivo, tal como XCTrack la escribe. «Ajustes», en la barra superior, le da el título en claro.',
  'changes.otherHeading': 'Las demás líneas del archivo',
  'changes.otherNote': 'Lo que el archivo lleva fuera de sus páginas y de sus ajustes: su carné de identidad y lo demás que su versión de XCTrack escribe ahí.',

  'changes.pageAt': 'Página {rank} — {orientation}',
  'changes.pageAdded': 'añadida',
  'changes.pageRemoved': 'retirada',
  'changes.pageCarries': { one: 'lleva {count} widget', other: 'lleva {count} widgets' },
  'changes.pageCarried': { one: 'llevaba {count} widget', other: 'llevaba {count} widgets' },
  'changes.pageMoved': 'pasada del rango {from} al rango {to}',
  'changes.pageTypeChanged': 'tipo de página: {from} pasa a ser {to}',
  'changes.pageNavigations': 'navegaciones modificadas',

  'changes.widgetAdded': 'añadido',
  'changes.widgetRemoved': 'retirado',
  'changes.widgetReshaped': 'movido o redimensionado',
  'changes.widgetRestacked': 'puesto delante o detrás de sus vecinos',
  'changes.widgetSettings': { one: '{count} ajuste modificado', other: '{count} ajustes modificados' },

  'changes.settingAdded': 'añadido',
  'changes.settingChanged': 'modificado',
  'changes.settingRemoved': 'retirado',

  'changes.reorderedWhat': 'El orden de las líneas del archivo',
  'changes.reordered': 'las mismas líneas, ordenadas de otro modo',
  'changes.unexplainedWhat': 'Una diferencia sin nombre',
  'changes.unexplained': 'el documento ha cambiado en algún punto que este recuento no sabe nombrar',
  'changes.otherwise': 'aquí ha cambiado algo más'
}

export default app
