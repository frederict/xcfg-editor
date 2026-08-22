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
    'valor que se elige en una lista.'
}

export default model
