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
  }
}

export default model
