import type { DomainCatalog } from '../../domains'

/** La prose hors interface — voir `fr/model.ts`. */
const model: DomainCatalog<'model'> = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identidad',
  'personalKind.credential': 'credencial',
  'personalKind.contact': 'contacto',
  'personalKind.device': 'dispositivo',
  'personalKind.location': 'posición',
  'personalKind.file': 'archivo',
  'personalKind.freeText': 'texto libre',
  'personalKind.equipment': 'equipo',
  'personalKind.sharing': 'compartición',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack lo declara él mismo',
  'personalBasis.inputType': 'XCTrack lo escribe con puntos, como una contraseña',
  'personalBasis.declared': 'es nuestro juicio, no el de XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Disposición — viaja con las páginas',
  'personalHome.preferences': 'Preferencias — se quedan con usted en una exportación «pages»',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'título personalizado de un widget, escrito por usted',
  'personalReason.text': 'contenido completo de un widget de texto libre, escrito por usted',
  'personalReason.fullName': 'nombre de una persona guardada en un botón de llamada',
  'personalReason.phoneNumber': 'número de teléfono guardado en un botón de llamada',
  'personalReason.url': 'dirección web introducida, que puede llevar un token o un identificador',
  'personalReason.title': 'etiqueta de un botón de lanzamiento, escrita por usted',
  'personalReason.name': 'nombre de la aplicación a la que apunta un botón de lanzamiento',
  'personalReason.action': 'acción de Android de un botón de lanzamiento, que puede ser un URI completo',
  'personalReason.filter': 'filtro de registro que usted ha introducido',
  'personalReason.suffix': 'texto colocado después del valor mostrado, escrito por usted',
  'personalReason.event': 'nombre de evento que usted ha introducido',
  'personalReason.unknown': 'texto libre sin regla propia: tratado como personal, por precaución',

  /* ---- por qué un **ajuste** se considera personal — véase `fr/model.ts` */

  'personalReason.pilotName': 'el nombre del piloto, tal cual lo escribió',
  'personalReason.gliderName': 'la vela del piloto — modelo y talla identifican a un piloto en un club',
  'personalReason.gliderProducer': 'fabricante de la vela',
  'personalReason.gliderModel': 'modelo de la vela',
  'personalReason.gliderCategory': 'categoría de la vela',
  'personalReason.hangGliderCategory': 'categoría del ala delta',
  'personalReason.xcontestAccount': 'identificador de la cuenta XContest',
  'personalReason.skysightAccount': 'identificador de la cuenta SkySight',
  'personalReason.safeSkyAddress': 'dirección de la cuenta SafeSky',
  'personalReason.registration': 'matrícula de la aeronave',
  'personalReason.derivedRegistration': 'matrícula deducida',
  'personalReason.stableDeviceId': 'identificador de dispositivo, estable entre vuelos',
  'personalReason.trackingDeviceId': 'identificador de dispositivo del servicio de seguimiento',
  'personalReason.quickMessages': 'mensajes escritos por usted',
  'personalReason.sensors': 'los sensores emparejados, con las direcciones Bluetooth incluidas',
  'personalReason.glasses': 'las gafas emparejadas',
  'personalReason.glassesName': 'el nombre de las gafas emparejadas',
  'personalReason.everysightKey': 'clave de acceso al SDK de Everysight',
  'personalReason.waypointFiles': 'archivos de balizas — el nombre designa a menudo la competición',
  'personalReason.navigationState': 'la tarea en curso, con balizas y coordenadas incluidas',
  'personalReason.airspaceFiles': 'archivos de espacios aéreos que usted ha cargado',
  'personalReason.offlineMaps': 'mapas sin conexión descargados',
  'personalReason.mapTheme': 'tema de mapa que usted instaló',
  'personalReason.guessedPosition': 'la posición supuesta del dispositivo — en la práctica, el domicilio',
  'personalReason.lastNetLocation': 'la última posición usada para consultar el QNH',
  'personalReason.replayFile': 'uno de los archivos de traza del piloto',
  'personalReason.speechText': 'texto que usted escribió',
  'personalReason.secureScope': 'ámbito SECURE: XCTrack lo guarda entre sus preferencias cifradas',
  'personalReason.maskedField': 'campo de entrada oculto (`textPassword`)',
  'personalReason.broadcastChoice': 'una decisión de difusión que usted tomó, no un dato en sí',
  'personalReason.legacyRecord': 'detectado por una versión anterior de este editor, ' +
    'que no decía de qué naturaleza era. Vuelva a cargar esta entrada para obtener el ' +
    'inventario completo.',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'espacio presente, pero vacío',

  'personal.hiddenStructure': {
    one: 'estructura con {count} entrada, no mostrada',
    other: 'estructura con {count} entradas, no mostrada'
  },

  'personal.caveat': {
    one: 'Este inventario abarca los ajustes que conoce XCTrack {version}: {count} ajuste y once campos de texto libre de los widgets. El formato cambia en cada versión — un inventario vacío no demuestra, por tanto, una ausencia.',
    other: 'Este inventario abarca los ajustes que conoce XCTrack {version}: {count} ajustes y once campos de texto libre de los widgets. El formato cambia en cada versión — un inventario vacío no demuestra, por tanto, una ausencia.'
  },

  /* --------- sharing.ts — qué sustituye a qué, y por qué. Véase `fr/model.ts`. */

  'sharingReason.titletext': 'Título personalizado del widget: sustituido por un título ' +
    'neutro y numerado, para que se conserven la maquetación y la distinción entre widgets.',
  'sharingReason.text': 'Contenido entero de un widget de texto libre: sustituido por un ' +
    'texto corto, para que el marco siga lleno sin desbordarse.',
  'sharingReason.fullName': 'Nombre de una persona guardada en un botón de llamada: ' +
    'sustituido por una etiqueta neutra.',
  'sharingReason.phoneNumber': 'Número de teléfono: sustituido por un número con el mismo ' +
    'formato pero imposible de marcar: «00» no es un prefijo de país.',
  'sharingReason.url': 'Dirección web que usted escribió, que puede llevar un testigo o un ' +
    'identificador: sustituida por una dirección del dominio reservado «.invalid», que ' +
    'nunca se resuelve.',
  'sharingReason.title': 'Etiqueta de un botón de lanzamiento: sustituida por una etiqueta ' +
    'neutra y numerada.',
  'sharingReason.name': 'Nombre de la aplicación que abre un botón de lanzamiento: ' +
    'sustituido por una etiqueta neutra y numerada.',
  'sharingReason.action': 'Acción Android de un botón de lanzamiento, que puede ser un URI ' +
    'completo: sustituida por la acción de prueba interna que XCTrack pone en un botón nuevo.',
  'sharingReason.filter': 'Filtro de registro que usted escribió: vaciado, es decir «sin ' +
    'filtro», el valor neutro del ajuste.',
  'sharingReason.suffix': 'Texto colocado tras el valor mostrado: vaciado, es decir «sin ' +
    'sufijo», el valor neutro del ajuste.',
  'sharingReason.event': 'Nombre de evento que usted escribió: sustituido por el evento de ' +
    'prueba que XCTrack pone en un widget nuevo.',
  'sharingReason.unknownFreeText': 'Texto libre sin regla propia: sustituido por un texto ' +
    'neutro, por precaución.',

  'sharingReason.credential': 'Identificador o contraseña. Se retira la línea entera: un ' +
    'identificador no tiene valor neutro, y fabricar uno haría fracasar la conexión de ' +
    'quien lo reciba en lugar de dejarla simplemente vacía.',
  'sharingReason.activeLookDevice': 'Las gafas ActiveLook emparejadas con su dispositivo. ' +
    'Devueltas al valor de fábrica muestreado en XCTrack: la cadena vacía, es decir ' +
    '«ningunas gafas».',
  'sharingReason.activeLookName': 'El nombre de sus gafas ActiveLook. Devuelto al valor de ' +
    'fábrica muestreado en XCTrack: la cadena vacía, es decir «ningunas gafas».',
  'sharingReason.airspaceFiles': 'Los archivos de espacios aéreos que usted ha cargado. Se ' +
    'retira la línea entera: son archivos de su dispositivo, que quien lo reciba no tiene.',
  'sharingReason.guessedPosition': 'La posición supuesta de su dispositivo: en la práctica, ' +
    'su domicilio. Se retira la línea entera: ninguna coordenada de sustitución sería honesta.',
  'sharingReason.speechText': 'Un texto que usted escribió para la síntesis de voz. ' +
    'Sustituido por un texto corto y neutro, para que el ajuste siga relleno.',
  'sharingReason.gliderCategory': 'La categoría de su vela. Conservada: es un ajuste de ' +
    'vuelo, no lleva nombre, ni número, ni dirección, y a menudo es justamente lo que se ' +
    'quiere compartir.',
  'sharingReason.hangGliderCategory': 'La categoría de su ala delta. Conservada: es un ' +
    'ajuste de vuelo, no lleva nombre, ni número, ni dirección, y a menudo es justamente lo ' +
    'que se quiere compartir.',
  'sharingReason.gliderName': 'El nombre de su vela: modelo y talla bastan para reconocerle ' +
    'en un club. Sustituido por una palabra neutra, para que el ajuste siga relleno.',
  'sharingReason.gliderModel': 'El modelo de su vela. Devuelto al valor de fábrica ' +
    'muestreado en XCTrack: la cadena vacía, es decir «ningún modelo elegido».',
  'sharingReason.gliderProducer': 'El fabricante de su vela. Devuelto al valor de fábrica ' +
    'muestreado en XCTrack: la cadena vacía, es decir «ningún fabricante elegido».',
  'sharingReason.livetrackChoice': 'Una decisión de difusión Livetrack que usted tomó. ' +
    'Conservada: es un ajuste, no un dato; no lleva nombre ni identificador de cuenta.',
  'sharingReason.quickMessages': 'Los mensajes rápidos que usted escribió para el ' +
    'Livetracking. Se retira la línea entera: es una lista de sus propias frases, y quien ' +
    'lo reciba escribirá las suyas.',
  'sharingReason.offlineMaps': 'Los mapas sin conexión instalados en su dispositivo. Se ' +
    'retira la línea entera: son archivos de su dispositivo, que quien lo reciba no tiene.',
  'sharingReason.mapTheme': 'El tema de mapa que usted instaló, designado por su ruta. ' +
    'Devuelto al valor de fábrica muestreado en XCTrack, «DEFAULT»: se dibuja el mapa de ' +
    'quien lo reciba, en vez de buscar un archivo que no tiene.',
  'sharingReason.navigationState': 'Su tarea en curso, con balizas y coordenadas incluidas. ' +
    'Se retira la línea entera: su esquema cambia en cada versión de XCTrack, y una ' +
    'estructura de sustitución sería una forma que la aplicación nunca escribe.',
  'sharingReason.waypointFiles': 'Sus archivos de balizas: su nombre designa a menudo la ' +
    'competición en la que participa. Se retira la línea entera: son archivos de su ' +
    'dispositivo, que quien lo reciba no tiene.',
  'sharingReason.pilotName': 'Su nombre, tal cual lo escribió. Sustituido por una palabra ' +
    'neutra en vez de vaciado: XCTrack lo muestra y lo envía con el Livetracking, y un ' +
    'nombre vacío no es una situación que se le conozca.',
  'sharingReason.derivedRegistration': 'La matrícula deducida de su aeronave. Se retira la ' +
    'línea entera: una matrícula designa una aeronave y a su propietario, e inventar una ' +
    'equivaldría a designar otra.',
  'sharingReason.registration': 'La matrícula de su aeronave. Se retira la línea entera: ' +
    'una matrícula designa una aeronave y a su propietario, e inventar una equivaldría a ' +
    'designar otra.',
  'sharingReason.sensors': 'Sus sensores emparejados, con las direcciones Bluetooth ' +
    'incluidas. Se retira la línea entera: quien lo reciba empareja los suyos, que de todos ' +
    'modos son los únicos que puede usar.',
  'sharingReason.lastNetLocation': 'La última posición usada para consultar el QNH. Devuelta ' +
    'al valor de fábrica muestreado en XCTrack: la cadena vacía, es decir «ninguna posición».',
  'sharingReason.replayFile': 'Uno de sus archivos de traza. Devuelto al valor de fábrica ' +
    'muestreado en XCTrack: la cadena vacía, es decir «ninguna traza que reproducir».',
  'sharingReason.unknownPreference': 'Ajuste personal sin regla propia: se retira la línea ' +
    'entera, por precaución.',
  'sharingReason.shapeMismatch': 'Este ajuste no lleva el texto que su regla esperaba: su ' +
    'forma ha cambiado desde el muestreo. Se retira la línea entera: escribir una palabra ' +
    'en lugar de una estructura produciría un archivo que XCTrack rechazaría.',
  'sharingReason.emptySlot': 'El hueco está presente en el archivo, pero no lleva nada: no ' +
    'hay nada que sustituir, y la línea se queda tal cual.',

  /* ------------ lo que parece un dato personal sin estar declarado: el indicio */

  'suspectClue.url': 'Este texto tiene la forma de una dirección web, que puede llevar un ' +
    'testigo o un identificador.',
  'suspectClue.mail': 'Este texto tiene la forma de una dirección de correo electrónico.',
  'suspectClue.path': 'Este texto tiene la forma de una ruta de archivo de su dispositivo.',
  'suspectClue.hardware': 'Este texto tiene la forma de una dirección de dispositivo ' +
    'Bluetooth o de red.',
  'suspectClue.phone': 'Este texto tiene la forma de un número de teléfono.',
  'suspectClue.letters': 'Este texto lleva letras acentuadas o signos fuera del alfabeto ' +
    'latino simple: fue escrito, no elegido en una lista.',
  'suspectClue.sentence': 'Este texto lleva un espacio: se lee como una frase, no como un ' +
    'valor que se elige en una lista.',

  /* ---------- el control antes de volar — véase `fr/model.ts` sobre las tres suposiciones */

  'inspection.landscape': 'Horizontal',
  'inspection.portrait': 'Vertical',
  'inspection.wherePage': '{orientation}, página {page}',
  'inspection.whereWidget': '{orientation}, página {page}, widget {rank}',

  'ruleTitle.unreachableWidget': 'Widget imposible de tocar',
  'ruleTitle.pageNeverShown': 'Página que nunca se mostrará',
  'ruleTitle.thermalPages': 'Varias páginas de asistente de térmica',
  'ruleTitle.widgetTooSmall': 'Widget quizá demasiado pequeño para leerlo',
  'ruleTitle.proWidget': 'Widget Pro sin licencia declarada',
  'ruleTitle.roadMaps': 'Dos mapas de carreteras en la misma página',
  'ruleTitle.obsoleteKey': 'Ajuste de una versión anterior',

  'ruleSummary.unreachableWidget': 'Ningún punto de estos widgets escapa a los que se ' +
    'dibujan después de ellos, y es el widget más adelantado el que recibe la pulsación. ' +
    'Pueden seguir siendo perfectamente visibles: un widget que no pinta ningún fondo roba ' +
    'las pulsaciones igual que uno opaco.',
  'ruleSummary.pageNeverShown': 'XCTrack lo dice en su propio cuadro de ajustes: una página ' +
    'sin ningún tipo de navegación marcado no se muestra en ningún contexto de vuelo.',
  'ruleSummary.thermalPages': 'El muestreo del dispositivo dice que la clase «asistente de ' +
    'térmica» es la que apunta el cambio automático. No dice cuál se apunta cuando una ' +
    'orientación lleva varias: este editor supone la última, y esa suposición nunca se ha ' +
    'verificado.',
  'ruleSummary.widgetTooSmall': 'El umbral procede de la norma ISO 9241-303 y se aplica al ' +
    'tamaño físico real de la pantalla del modelo elegido, no a píxeles: cambiar de modelo ' +
    'cambia esos milímetros.',
  'ruleSummary.proWidget': 'Este archivo declara «proUpTo: 0» y lleva widgets reservados a ' +
    'la licencia Pro.',
  'ruleSummary.roadMaps': 'XCTrack avisa en sus propios ajustes de que solo es posible un ' +
    'mapa de carreteras por página, por una limitación de su biblioteca de mapas.',
  'ruleSummary.obsoleteKey': 'Estos widgets llevan ajustes escritos por una versión ' +
    'anterior de XCTrack. No hay nada que hacer al respecto antes de volar; para saber qué ' +
    'hace con ellos una versión dada, y llegado el caso quitarlos, véase «Versión y ' +
    'compatibilidad» en el menú «Archivo».',

  'inspection.unreachable': '«{name}» está enteramente cubierto por widgets colocados después de él. Ningún clic puede alcanzarlo, ni aquí ni en la pantalla de edición de XCTrack, que también da el mando al widget más adelantado. Puede seguir siendo perfectamente visible: un widget que no pinta nada roba las pulsaciones igual que uno opaco. Para ajustarlo, pase por la lista de widgets de la página.',
  'inspection.unreachableToVerify': 'No se ha observado qué le ocurre a este widget en ' +
    'vuelo: puede que XCTrack encamine la pulsación de otro modo que en edición. La ' +
    'pregunta importa sobre todo para los botones de acción, que solo existen para ser ' +
    'tocados en vuelo.',

  'inspection.pageNeverShown': {
    one: 'Esta página no está activada para ningún tipo de navegación: XCTrack no la mostrará en ningún contexto de vuelo, y su {count} widget no servirá nunca. Es el ajuste «Desactivado» del dispositivo: voluntario, u olvidado. No confundir con una página solo restringida a ciertas navegaciones, que es un ajuste normal.',
    other: 'Esta página no está activada para ningún tipo de navegación: XCTrack no la mostrará en ningún contexto de vuelo, y sus {count} widgets no servirán nunca. Es el ajuste «Desactivado» del dispositivo: voluntario, u olvidado. No confundir con una página solo restringida a ciertas navegaciones, que es un ajuste normal.'
  },

  'inspection.thermalPages': 'Esta orientación lleva varias páginas de asistente de térmica, y XCTrack solo apunta a una cuando cambia por sí mismo en espiral. ¿A cuál? Este editor supone la última, aquí la página {target}, sin haberlo verificado. Esta, en todo caso, sigue siendo accesible con «página siguiente».',
  'inspection.thermalPagesToVerify': 'No se ha observado nada de lo que hace XCTrack cuando ' +
    'coexisten varias páginas de asistente de térmica: ningún archivo del muestreo lleva ' +
    'dos. Duplicar una en el dispositivo, entrar en espiral y mirar qué página aparece ' +
    'zanjaría la cuestión en un solo vuelo.',

  'inspection.tooSmall': '«{name}» solo mide {height} de alto en este dispositivo. Si el texto que muestra ocupa la mitad, medirá unos {value}, por debajo de los {minimum} que la norma ISO 9241-303 da como mínimo absoluto a {distance} cm. ¿Seguirá siendo legible con el brazo extendido, a pleno sol, con guantes? Por comprobar en el dispositivo.',
  'inspection.tooSmallToVerify': 'La parte de la altura del widget que ocupa realmente el glifo del valor (supuesta aquí en {ratio}) solo se ha medido en un widget y en una sola captura. Las capturas del muestrario de los 75 widgets bastarían para medirla tipo por tipo, sin tocar el dispositivo.',

  'inspection.proWidget': '«{name}» es un widget Pro, y este archivo declara «proUpTo: 0». ¿Qué hará XCTrack con este widget en un dispositivo sin licencia Pro: sustituirlo por un marco «widget Pro», mostrarlo normalmente, o no cambiar nada? No lo sabemos.',
  'inspection.proWidgetToVerify': 'El sentido de `info.proUpTo` no está establecido: 0 ' +
    'quizá signifique «sin licencia», quizá una fecha de fin en segundos. Los 21 archivos ' +
    'del muestreo llevan todos 0, en dos instalaciones; nunca se ha observado otro valor. ' +
    'Una prueba en el AIR³ con un widget Pro lo zanjaría.',

  'inspection.roadMaps': '«{name}» pide también un mapa de carreteras, y el widget {first} de esta página ya pide uno. XCTrack avisa en sus propios ajustes de que solo es posible un mapa de carreteras por página, por una limitación de su biblioteca de mapas. Lo que se mostrará en su lugar no es previsible.',

  'inspection.obsoleteKey': {
    one: '«{name}» lleva un ajuste escrito por una versión anterior de XCTrack ({detail}). No se pierde nada: XCTrack 1.0.3 lo convierte al leerlo —está verificado en el dispositivo— y lo reescribirá con su nuevo nombre la primera vez que se ajuste este widget.',
    other: '«{name}» lleva ajustes escritos por una versión anterior de XCTrack ({detail}). No se pierde nada: XCTrack 1.0.3 los convierte al leerlos —está verificado en el dispositivo— y los reescribirá con sus nuevos nombres la primera vez que se ajuste este widget.'
  },

  /* -------- fallos de la biblioteca y el detalle técnico — véase `fr/model.ts` */

  'model.noErrorMessage': 'el fallo no dejó ningún mensaje',

  'libraryError.duringOpen': 'Apertura de la biblioteca',
  'libraryError.duringReadAll': 'Lectura de la biblioteca',
  'libraryError.duringReadEntry': 'Lectura de una entrada',
  'libraryError.duringReadBytes': 'Lectura de una configuración',
  'libraryError.duringWrite': 'Escritura de una entrada',
  'libraryError.duringDelete': 'Borrado de una entrada',
  'libraryError.duringClear': 'Vaciado de la biblioteca',

  'libraryError.quota': '{operation}: el navegador se ha negado a escribir, el espacio concedido a este sitio está lleno. Exporte su biblioteca y luego borre entradas para hacer sitio.',
  'libraryError.storageFailed': '{operation}: el navegador no ha podido responder. {detail}',
  'libraryError.noIndexedDb': 'Este navegador no ofrece IndexedDB: la biblioteca no puede ' +
    'conservar nada.',
  'libraryError.blockedByTab': 'Otra pestaña impide la actualización de la biblioteca. ' +
    'Ciérrela y vuelva a cargar.',

  'libraryError.notFound': 'Ninguna entrada {id} en la biblioteca.',
  'libraryError.corrupt': 'La entrada {id} es ilegible: {reason}.',
  'libraryError.duplicateId': 'Una entrada ya lleva el identificador {id}.',
  'libraryError.changedElsewhere': 'La entrada {id} ha cambiado desde su lectura: otra pestaña la ha modificado o borrado. Vuelva a cargar la biblioteca antes de reintentarlo.',
  'libraryError.notReadable': '«{name}» no ha podido abrirse: no es una configuración XCTrack legible. {detail}',
  'libraryError.bytesMissing': 'Los bytes de «{name}» no se encuentran: la entrada está incompleta.',
  'libraryError.digestChanged': '«{name}» ya no devuelve su huella de origen: los bytes guardados han sido alterados. La entrada no se restituye.',

  'libraryError.recordNotObject': 'el registro no es un objeto',
  'libraryError.recordNoId': 'identificador ausente o vacío',
  'libraryError.recordBadFields': {
    one: 'campo ilegible: {fields}',
    other: 'campos ilegibles: {fields}'
  },

  'libraryError.manifestUnreadable': 'La ficha del archivo comprimido es ilegible.',
  'libraryError.manifestEmpty': 'La ficha del archivo comprimido está vacía.',
  'libraryError.notALibrary': 'Este archivo no es una biblioteca exportada por este editor.',
  'libraryError.futureFormat': 'Esta biblioteca ha sido escrita por una versión posterior del editor (formato {version}). Actualice el editor antes de importarla.',
  'libraryError.manifestNoItems': 'La ficha del archivo comprimido no lista ninguna configuración.',
  'libraryError.notAnArchive': 'Este archivo no es un archivo comprimido de biblioteca, o está dañado. {detail}',
  'libraryError.manifestMissing': 'El archivo comprimido no contiene ningún {file}: no es una biblioteca exportada.',

  'libraryError.itemManifestUnreadable': 'ficha ilegible en el archivo comprimido',
  'libraryError.itemMemberMissing': 'miembro {file} ausente del archivo comprimido',
  'libraryError.itemDigestMismatch': 'los bytes del archivo comprimido no devuelven la huella anunciada',
  'libraryError.importedSuffix': ' (importado)'
}

export default model
