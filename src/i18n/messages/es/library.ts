import type { DomainCatalog } from '../../domains'

/**
 * `libraryPanel.ts` — la biblioteca de configuraciones guardadas.
 *
 * *volver a colocar*, nunca *restablecer*: el francés « rétablir » cubre tres gestos, y
 * este pertenece a la biblioteca. *Rehacer* vive en `app`, la vuelta al 100 % en el zoom.
 */
const library: DomainCatalog<'library'> = {
  /* ------------------------------------------------------------- cabecera y pie */

  'library.panelLabel': 'Biblioteca de configuraciones',
  'library.title': 'Mis configuraciones',
  'library.lead':
    'Guarde varias configuraciones con un nombre, en este navegador, y vuelva a cualquiera de ellas cuando quiera. No se envía nada a ninguna parte: todo se queda en este aparato. Los bytes guardados son los de su archivo, nunca una copia reescrita.',
  'library.storeCurrent': 'Guardar la configuración abierta',
  'library.addFile': 'Guardar un archivo…',
  'library.exportAll': 'Exportar la biblioteca',
  'library.importAll': 'Importar una biblioteca…',
  'library.close': 'Cerrar',

  'library.empty':
    'Todavía no hay nada guardado. Guarde la configuración abierta, o arrastre aquí un archivo .xcfg ya exportado: conservará su nombre, su fecha y sus bytes.',

  'library.footCount': {
    one: '{count} configuración guardada{size}{broken}.',
    other: '{count} configuraciones guardadas{size}{broken}.'
  },
  'library.footTotalSize': ' — {size} en total',
  'library.footBroken': {
    one: ', {count} entrada ilegible',
    other: ', {count} entradas ilegibles'
  },

  /* ------------------------------------------------- el guardado del navegador */

  'library.notDurableTitle': 'El guardado no es duradero',
  'library.notDurableText':
    'Este navegador no concede almacenamiento persistente a esta página: lo que guarde aquí vivirá lo que dure la pestaña y luego desaparecerá. La biblioteca sigue siendo utilizable, pero no es una copia de seguridad. Expórtela antes de cerrar.',

  'library.preventErase': 'Impedir que el navegador borre mi biblioteca',
  'library.persistenceGranted':
    'El navegador ha aceptado. Eso nunca es una garantía: algunos borran de todos modos los datos de un sitio no visitado desde hace siete días. La única copia de seguridad que aguanta es el archivo que usted exporta.',
  'library.persistenceDenied':
    'El navegador ha rechazado. La biblioteca sigue funcionando, pero puede borrarla: expórtela con regularidad.',
  'library.persistenceUnsupported':
    'Este navegador no ofrece ese ajuste. Exporte su biblioteca con regularidad.',

  'library.storageUnknown': 'Este navegador no dice nada del espacio disponible.',
  'library.storageEstimate':
    'Espacio empleado por este sitio: {usage} de {quota} concedidos — el navegador solo da un orden de magnitud.',

  /* ------------------------------------------------------- los niveles del panel */

  'library.backToList': '← Volver a la lista',
  'library.back': '← Volver',
  'library.returnToList': 'Volver a la lista',
  'library.cancel': 'Cancelar',
  'library.announceBackToList': 'Vuelta a la lista de configuraciones.',
  'library.announceBackTo': 'Vuelta: {title}.',

  /* -------------------------------------------------- los botones de una entrada */

  'library.load': 'Cargar',
  'library.extract': 'Sacar el archivo',
  'library.identity': 'Ficha de identidad',
  'library.verify': 'Comprobar la huella',
  'library.rename': 'Renombrar',
  'library.remove': 'Eliminar',
  'library.store': 'Guardar',
  'library.save': 'Guardar los cambios',

  /* ----------------------------------------------------- una entrada en la lista */

  'library.entryStamp': 'Guardada el {when} · {file}',
  'library.unknownFileName': 'archivo desconocido',
  'library.previewStored': 'Vista previa guardada',
  'library.chipArchive': 'archivo .xczfg',
  'library.personalCount': {
    one: '{count} dato personal',
    other: '{count} datos personales'
  },
  'library.personalTravellingCount': {
    one: '{count} se va con las páginas',
    other: '{count} se van con las páginas'
  },

  /* ------------------------------------------------------ el formato de exportación */

  'library.exportTypeBackup': 'Copia de seguridad completa (páginas y preferencias)',
  'library.exportTypePages': 'Solo páginas (ninguna preferencia)',
  'library.exportTypeUndeclared': 'No declarado por el archivo',
  'library.chipBackup': 'Copia de seguridad',
  'library.chipPages': 'Solo páginas',
  'library.chipUndeclared': 'Tipo no declarado',

  /* ------------------------------ ficha de identidad: lo que el archivo declara */

  'library.identityTitle': 'Ficha de identidad — {name}',
  'library.identityLead':
    'Dos mitades, nunca mezcladas: lo que el archivo declara, y lo que este editor supone. Todo lo supuesto puede ser falso sin que el archivo tenga la culpa.',
  'library.readNote':
    'Leído tal cual en los bytes guardados. Un campo ausente se dice ausente, nunca se sustituye por un valor predeterminado.',
  'library.assumedNote':
    'Nada de esto está en el archivo. El aparato y su resolución vienen de nuestra tabla; saber que un widget está reservado a la versión Pro viene de un catálogo extraído del APK.',

  'library.factExportType': 'Formato de exportación',
  'library.factExportTypeNote': 'Clave info.exportType.',

  'library.factContainer': 'Contenedor',
  'library.containerArchive': {
    one: 'Archivo .xczfg — {count} archivo anexo',
    other: 'Archivo .xczfg — {count} archivos anexos'
  },
  'library.containerPlain': 'Archivo .xcfg',
  'library.containerExtrasNote': 'Anexos: {names}. Este editor no inspecciona su contenido.',

  'library.factSize': 'Tamaño',

  'library.factVersion': 'Versión de XCTrack declarada',
  'library.versionAbsent': 'El archivo no la dice',
  'library.versionValue': '{name} — código {code}',
  'library.versionNameAbsent': '(nombre ausente)',
  'library.versionCodeAbsent': '(ausente)',
  'library.factVersionNote': 'Claves info.versionName e info.versionCode.',

  'library.factDevice': 'Aparato declarado',
  'library.deviceAbsent': 'El archivo no lo dice',
  'library.factDeviceNote': 'Cadena en bruto de info.device. No lleva ninguna resolución.',

  'library.factPages': 'Páginas',
  'library.noPage': 'ninguna página',
  'library.landscapePageCount': {
    one: '{count} página apaisada',
    other: '{count} páginas apaisadas'
  },
  'library.portraitPageCount': {
    one: '{count} página vertical',
    other: '{count} páginas verticales'
  },

  'library.factWidgets': 'Widgets',
  'library.widgetsOfTypes': {
    one: '{count} widget de {types}',
    other: '{count} widgets de {types}'
  },
  'library.typeCount': { one: '{count} tipo', other: '{count} tipos' },
  'library.topTypesNote': 'Los más empleados: {types}.',

  'library.factRootSections': 'Secciones de primer nivel',
  'library.noRootSection': 'ninguna',

  'library.factSettings': 'Ajustes guardados',
  'library.settingsNone': 'ninguno — este archivo no transporta sus preferencias',
  'library.settingLineCount': { one: '{count} línea', other: '{count} líneas' },
  'library.settingsNote':
    'Este editor solo sabe nombrar unas pocas familias: la cuenta está aquí para que el resto siga a la vista.',

  'library.factDuplicates': 'Líneas duplicadas',
  'library.duplicateLineCount': {
    one: '{count} línea duplicada',
    other: '{count} líneas duplicadas'
  },
  'library.duplicatesNote': 'XCTrack solo leerá una de ellas: {keys}.',

  'library.factExternal': 'Recursos externos esperados',
  'library.externalNote':
    'Estos archivos deben existir en el aparato de destino; no están en la configuración.',

  'library.factParse': 'Análisis',
  'library.parseFailed': 'No se ha podido analizar el contenido',
  'library.parseNote':
    'Los bytes están guardados y saldrán tal cual; lo que falta es su descripción. Detalle técnico: {detail}.',

  /* ------------------------------- ficha de identidad: lo que el editor supone */

  'library.factScreen': 'Plantilla de pantalla elegida',
  'library.screenFallback': '{device} — plantilla de reserva, ningún aparato reconocido',
  'library.factScreenNote':
    'La resolución viene de la tabla de aparatos de este editor, no del archivo.',

  'library.factPro': 'Widgets «Pro»',
  'library.proUnknown': 'Desconocido — no se ha facilitado ningún catálogo de widgets',
  'library.proNone': 'Ninguno',
  'library.proUnknownNote':
    'No adivinamos si un widget está reservado a la versión Pro: sin catálogo, no decimos nada.',
  'library.proNote': 'Según el catálogo extraído del APK 1.0.3-beta5, no según el archivo.',

  'library.factVersionGap': 'Situación de la versión',
  'library.versionGapOlder': 'Más antigua que aquella para la que dibuja este editor',
  'library.versionGapSame': 'Aquella para la que dibuja este editor',
  'library.versionGapNewer': 'Más reciente que aquella para la que dibuja este editor',
  'library.versionGapUnknown': 'El archivo no dice de qué versión viene',
  'library.factVersionGapNote':
    'Este editor ajusta su dibujo a una versión precisa de XCTrack; es con ella con la que se compara este archivo, no con la de su aparato.',

  'library.factPersonalTravels': 'Datos personales que viajan con las páginas',
  'library.personalTravelsYes': 'Sí — la disposición lleva al menos un texto escrito por usted',
  'library.personalTravelsNo': 'No — no se ha encontrado texto libre en la disposición',
  'library.personalTravelsYesNote':
    'Una exportación «páginas» no es, pues, anónima por construcción: el nombre y el número de un botón de llamada están en la disposición, no en las preferencias.',
  'library.personalTravelsNoNote':
    'La lista de campos de texto libre es fija y quedará obsoleta: no prueba una ausencia.',

  /* ---------------------------------------------------------- la entrada misma */

  'library.entryItself': 'La entrada misma',
  'library.fieldName': 'Nombre',
  'library.factOriginalFile': 'Archivo de origen',
  'library.unknownOriginalFile': '(desconocido)',
  'library.factStoredOn': 'Guardada el',
  'library.factLastWrite': 'Última escritura',
  'library.factDigest': 'Huella SHA-256',
  'library.yourNote': 'Su nota: {note}',

  'library.timesStored': {
    one: 'guardada una sola vez',
    other: 'guardada {count} veces'
  },

  /* ------------------------------------- lo que la entrada lleva de personal */

  'library.personalHeading': 'Lo que esta entrada lleva de personal',
  'library.noPersonalData': 'No se ha detectado ningún dato personal. {caveat}',
  'library.personalSummary':
    '{total} en esta entrada: {layout} en la disposición, que se va con las páginas, y {preferences} en las preferencias, que se quedan con usted en una exportación «páginas». {filled}, {empty}. Se muestran, nunca se retiran: usted decide.',
  'library.personalTotal': {
    one: '{count} dato personal está presente',
    other: '{count} datos personales están presentes'
  },
  'library.personalFilled': {
    one: '{count} está relleno',
    other: '{count} están rellenos'
  },
  'library.personalEmpty': {
    one: '{count} es un sitio vacío',
    other: '{count} son sitios vacíos'
  },
  'library.basisReadInApp': 'leído en la aplicación',
  'library.basisJudgedHere': 'juzgado por este editor',
  'library.travelsCaveat':
    'Las líneas marcadas «se va con las páginas» están en la disposición: viajan incluso en una exportación «páginas». Derivar unas «páginas» es una criba de grano grueso, no es una limpieza.',

  /* ------------------------------------------------------------- la vista previa */

  'library.previewHeading': 'Vista previa',
  'library.previewNote':
    'El sitio está reservado en la biblioteca, pero este panel no produce ninguna imagen: el dibujo de una página pertenece al motor de dibujo. El día en que lo facilite, ni el guardado ni la forma del registro tendrán que cambiar.',

  /* ---------------------------------------------------------------------- guardar */

  'library.storeLead':
    'Póngale un nombre que reconozca dentro de seis meses — «Comp Annecy», «Vol-biv Alpes», «École». Lo que se guarda es su archivo mismo, sin una coma reescrita.',
  'library.fieldNoteOptional': 'Nota (facultativa)',
  'library.noteHint':
    'Lo que usted quiera: el sitio de vuelo, la vela, el ajuste del vario. Nunca se interpreta.',
  'library.stored': '«{name}» está guardada — {size}, huella {digest}…',
  'library.noOpenFile':
    'No hay ningún archivo abierto: abra una configuración, o guarde un archivo desde el disco.',

  'library.storedLine': '«{name}» está guardada: {size}, {when}.',

  /* ----------------------------------------------------------------------- cargar */

  'library.loaded': '«{name}» está cargada — {size}, bytes comprobados con su huella.',
  'library.unsavedTitle': 'Hay cambios sin registrar',
  'library.unsavedBody':
    'El documento abierto — «{file}» — lleva cambios que usted no ha registrado. Cargar «{name}» los sustituye en el editor.',
  'library.storeFirstCaveat':
    'Guardar primero no cuesta nada: la configuración abierta toma un nombre en la biblioteca, y volverá a ella con un clic.',
  'library.storeThenLoad': 'Guardar primero y luego cargar',
  'library.loadWithoutStoring': 'Cargar sin guardar',

  /* ------------------------------------------------------------ sacar el archivo */

  'library.extracted': {
    one: '«{name}» sale tal como entró: {count} byte, huella comprobada.',
    other: '«{name}» sale tal como entró: {count} bytes, huella comprobada.'
  },

  /* ------------------------------------------------------------------- la huella */

  'library.digestTitle': 'Huella — {name}',
  'library.verifyNote':
    'La huella se puso en el momento de guardar, sobre los bytes guardados. Esta acaba de recalcularse sobre lo que la biblioteca devuelve ahora.',
  'library.digestStored': 'Registrada',
  'library.digestFresh': 'Recalculada ahora mismo',
  'library.digestMissing': 'ninguna — los bytes no se han devuelto',
  'library.sizeUnreadable': 'ilegible — {expected} esperados',
  'library.sizeCompared': {
    one: '{count} byte — {expected} esperados',
    other: '{count} bytes — {expected} esperados'
  },
  'library.digestSame':
    'Idénticas: los bytes guardados son exactamente los del archivo de origen.',
  'library.digestDiffers': 'Distintas — esta entrada no se devolverá.',

  /* --------------------------------------------------------------------- eliminar */

  'library.removeTitle': '¿Eliminar «{name}»?',
  'library.removeBody':
    '«{name}» y sus {size} de bytes se retirarán de este navegador. Esta biblioteca no tiene papelera.',
  'library.removeCaveat':
    'Si no está seguro: saque primero el archivo, o exporte la biblioteca entera.',
  'library.removed': '«{name}» ha sido eliminada.',

  /* --------------------------------------------- borrar toda la biblioteca */

  'library.clearAll': 'Borrar toda la biblioteca',
  'library.clearAllTitle': '¿Borrar toda la biblioteca?',
  'library.clearAllConfirm': 'Borrarlo todo',

  'library.clearAllBody': {
    one: '{count} configuración guardada sale de este navegador{size}{broken}.',
    other: '{count} configuraciones guardadas salen de este navegador{size}{broken}.'
  },
  'library.clearAllBytes': ' — {size} de bytes se van con ellas',
  'library.clearAllBroken': {
    one: ', además de {count} entrada ilegible',
    other: ', además de {count} entradas ilegibles'
  },
  'library.clearAllCaveat':
    'Los bytes se van con ellas: se borra su propio archivo, y esta biblioteca no tiene papelera. Nunca se ha enviado nada a ninguna parte, así que no hay copia que recuperar, ni aquí ni en casa de nadie.',
  'library.clearAllScope':
    'Este gesto borra la biblioteca, y solo la biblioteca. Tres ajustes de este editor permanecen en este navegador: el idioma de la interfaz, la altura de la barra de ajustes y los dispositivos que usted mismo ha añadido. Ninguno de los tres lleva una configuración, una página ni un archivo de waypoints: son una elección de idioma y unas medidas de pantalla. Para no dejar absolutamente nada, borre los datos de este sitio desde su navegador: es el único gesto que se los lleva también.',

  'library.exportThenClear': 'Exportar primero el archivo comprimido y luego borrarlo todo',
  'library.clearWithoutExport': 'Borrarlo todo sin exportar',

  'library.cleared': {
    one: 'La biblioteca está vacía: {count} configuración borrada{size}.',
    other: 'La biblioteca está vacía: {count} configuraciones borradas{size}.'
  },
  'library.clearedAfterExport': {
    one: 'El archivo comprimido se ha descargado y luego la biblioteca se ha vaciado: {count} configuración borrada{size}.',
    other: 'El archivo comprimido se ha descargado y luego la biblioteca se ha vaciado: {count} configuraciones borradas{size}.'
  },
  'library.clearedBytes': ', {size} de bytes liberados',

  /* --------------------------------------------------------- la entrada ilegible */

  'library.brokenName': 'Entrada ilegible',
  'library.brokenNote':
    'No impide que las demás se muestren, y sigue siendo eliminable. Sus bytes no se exportarán: no se escribe en una copia de seguridad lo que no se sabría devolver.',
  'library.brokenBody':
    'Esta entrada no se deja releer: no sabemos qué contenía. Eliminarla libera su sitio y no pierde nada legible.',
  'library.brokenTechnical': 'Identificador interno {id}. Detalle técnico: {reason}.',
  'library.removeBrokenTitle': '¿Eliminar esta entrada ilegible?',
  'library.brokenRemoved': 'La entrada ilegible ha sido eliminada.',
  'library.brokenHeading': {
    one: '{count} Entrada que no se deja releer',
    other: '{count} Entradas que no se dejan releer'
  },

  /* --------------------------------------------------- exportar e importar */

  'library.exported': {
    one: '{count} configuración exportada en un archivo ZIP. Cada .xcfg se extrae de él con cualquier descompresor.{tail}',
    other: '{count} configuraciones exportadas en un archivo ZIP. Cada .xcfg se extrae de él con cualquier descompresor.{tail}'
  },
  'library.exportSkipped': {
    one: ' {count} entrada ilegible no está: la copia de seguridad es incompleta, y lo dice.',
    other: ' {count} entradas ilegibles no están: la copia de seguridad es incompleta, y lo dice.'
  },

  'library.importTitle': 'Biblioteca importada',
  'library.importLead':
    'Archivo exportado el {when}. No se ha sobrescrito ninguna entrada existente: una entrada ya presente con otros bytes se vuelve a colocar al lado, con un sufijo.',
  'library.outcomeImported': 'vuelta a colocar',
  'library.outcomeAlreadyPresent': 'ya presente, nada que hacer',
  'library.outcomeDuplicated': 'vuelta a colocar al lado: su identificador ya estaba ocupado',
  'library.outcomeRejected': 'rechazada',
  'library.imported': {
    one: '{count} entrada leída en el archivo.',
    other: '{count} entradas leídas en el archivo.'
  },
  'library.importedWithRejected': {
    one: '{count} entrada leída en el archivo — {rejected}.',
    other: '{count} entradas leídas en el archivo — {rejected}.'
  },
  'library.rejectedCount': { one: '{count} rechazada', other: '{count} rechazadas' },

  /* ------------------------------------------------ lo que falla, y su salida */

  'library.exportNow': 'Exportar la biblioteca ahora',
  'library.reloadLibrary': 'Volver a cargar la biblioteca',
  'library.conflict':
    '{message} No se ha escrito nada: su modificación no ha sobrescrito la de la otra pestaña.',
  'library.operationFailed':
    '{context}: la operación no ha llegado a término. Detalle técnico: {detail}',

  'library.contextStoring': 'Guardado',
  'library.contextLoading': 'Carga',
  'library.contextRemoving': 'Eliminación',
  'library.contextExtracting': 'Restitución',
  'library.contextVerifying': 'Comprobación',
  'library.contextRenaming': 'Cambio de nombre',
  'library.contextExporting': 'Exportación de la biblioteca',
  'library.contextClearing': 'Borrado de la biblioteca',
  'library.contextImporting': 'Importación de la biblioteca',
  'library.contextReading': 'Lectura de la biblioteca',

  /* -------------------------------------------------------------------- renombrar */

  'library.renameTitle': 'Renombrar «{name}»',
  'library.renameLead': 'El nombre es suyo; los bytes guardados no se mueven.',
  'library.fieldNote': 'Nota',
  'library.renamed': '«{name}» está al día — {times}.',

  /* ------------------------- «vuelta a colocar», el tercer « rétablir » */

  'library.entryRestored': '«{name}» se ha vuelto a colocar.',
  'library.entryRestoredBeside': '«{name}» se ha vuelto a colocar al lado: su identificador ya estaba ocupado.',

  'library.entryCount': {
    one: '{count} configuración guardada',
    other: '{count} configuraciones guardadas'
  }
}

export default library
