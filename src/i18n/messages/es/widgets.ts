import type { DomainCatalog } from '../../domains'

/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — véase `fr/widgets.ts` para los dos
 * ejes de idioma: nuestra prosa se traduce aquí, las etiquetas de XCTrack que llegan por
 * `{name}`, `{label}` y `{value}` nunca.
 *
 * *widget* y nunca *gadget*: es la palabra que emplea la propia interfaz española de
 * XCTrack, en las 55 versiones relevadas. *Componente* no aparece en ninguna — buscada y
 * no encontrada.
 *
 * « valeur d'usine » se dice *valor de fábrica* — nunca *predeterminado*, que desplazaría
 * la afirmación de «lo que puso el fabricante» a «lo que rige cuando no rige otra cosa».
 */
const widgets: DomainCatalog<'widgets'> = {
  /* ==================================================== properties.ts — la cabecera */

  'properties.widgetTitle': 'Widget: {name}',

  'properties.classTitle':
    'El nombre que el archivo da a este widget. No cambia de una lengua a otra: es lo que leería al abrir el archivo, y es la palabra que hay que citar para señalar un problema.',

  'properties.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },

  'properties.filterSettings': 'Filtrar los ajustes',

  /* --------------------------------------- comparación con el relevo de valores de fábrica */

  'properties.noSurveyForType':
    'El catálogo de valores de fábrica no describe este tipo de widget: nada que comparar.',

  'properties.nothingCustomized':
    'Ningún ajuste se aparta de lo que XCTrack pone en un widget nuevo ({compared} comparados).',

  'properties.customizedRatio': {
    one: '{count} ajuste personalizado de {compared}.',
    other: '{count} ajustes personalizados de {compared}.'
  },
  'properties.comparedCount': {
    one: '{count} comparado',
    other: '{count} comparados'
  },

  'properties.onlyDifferent': 'Solo lo que difiere',
  'properties.showEverything': 'Mostrar todo',

  /* ------------------------------------- de dónde viene el relevo, y cuánto vale */

  'properties.surveyReference':
    'Valores de fábrica relevados en XCTrack {version}',
  'properties.fileVersionNamed': 'la versión {name}',
  'properties.fileVersionCoded': 'la versión {code}',

  'properties.surveyExact': '{survey} — la versión misma de este archivo.',
  'properties.surveyUnstated':
    '{survey}. Este archivo no dice de qué versión viene: los valores de fábrica cambian de una versión a otra, así que la comparación es solo indicativa.',
  'properties.surveyOther':
    '{survey}. Este archivo viene de {which}: los valores de fábrica cambian de una versión a otra, así que la comparación es solo indicativa.',

  'properties.surveyKeysAbsent': {
    one: '{count} ajuste del relevo no figura en este widget ({keys}): XCTrack le aplica su propio valor, indicado al final del panel.',
    other: '{count} ajustes del relevo no figuran en este widget ({keys}): XCTrack les aplica su propio valor, indicado al final del panel.'
  },

  /* --------------------------- el bloque final: líneas que el archivo no escribe */

  'properties.absentTitle': {
    one: '{count} ajuste que este widget no escribe',
    other: '{count} ajustes que este widget no escribe'
  },

  'properties.absentApplied':
    'Estos ajustes no están escritos en el archivo: XCTrack les aplica el valor de su propio ' +
    'código, el que se indica al lado. No es lo mismo que un ajuste puesto a propósito en ' +
    'ese valor.',
  'properties.absentUnstated':
    '{survey}; aquí no se conoce la versión de este archivo. Los valores de fábrica cambian de una versión a otra: lo que su aparato aplica puede por tanto diferir de lo que aquí se escribe.',
  'properties.absentOther':
    '{survey}, y este archivo viene de {which}: un valor de fábrica ha podido cambiar entre ambas, y lo que su aparato aplica puede diferir de lo que aquí se escribe.',
  'properties.absentGesture':
    'Definirlos no cambia nada de lo que el aparato hace hoy — congela el valor, que ya no ' +
    'se moverá el día en que una actualización de XCTrack cambie ese valor de fábrica.',

  'properties.appliedValue':
    'Este ajuste no está en el archivo: XCTrack aplicará «{value}», su valor de fábrica. No es lo mismo que un valor puesto a propósito en ese valor.',

  'properties.compositeFactoryValue': 'valor de fábrica compuesto',
  'properties.compositeFactoryValueHelp':
    'El catálogo describe este ajuste con un valor compuesto: este editor solo escribe ' +
    'valores simples, y no se inventa ninguno para sustituirlo. El ajuste queda modificable ' +
    'en cuanto XCTrack lo haya escrito él mismo.',

  /* ---------------------------------------------- el primer gesto: definir el valor */

  'properties.setValue': 'Definir este valor',
  'properties.setValueAria': 'Definir {label} en el archivo',
  'properties.setValueHelp':
    'Escribe «{key}»: {value} en el archivo.\n\nSu aparato ya se comporta así hoy — escribir el valor no cambia nada de lo que hace ahora. Lo que cambia es para más adelante: mientras la línea falte, el aparato sigue el valor de fábrica de la versión de XCTrack instalada, y una actualización que lo cambie cambiará su ajuste sin preguntarle nada. Una vez escrito, el valor queda congelado: seguirá siendo ese.',
  'properties.setCaveatOtherVersion':
    'Este valor de fábrica se relevó en XCTrack {version}, que no es la versión de la que viene este archivo: compruebe que es realmente el valor que hay que congelar.',
  'properties.setCaveatUnknownVersion':
    'Este valor de fábrica se relevó en XCTrack {version} y aquí no se conoce la versión de este archivo: compruebe que es realmente el valor que hay que congelar.',

  /* ------------------------------------------------- decir un valor con todas sus letras */

  'properties.yes': 'Sí',
  'properties.no': 'No',
  'properties.emptyValue': '(vacío)',
  'properties.outOfCatalogValue': '{value} (fuera del catálogo)',

  /* ----------------------------------------------------- la marca de origen de una línea */

  'properties.setByYou': 'ajustado por usted',
  'properties.setByYouFactory': 'ajustado por usted · de fábrica: {value}',
  'properties.setByYouHelp':
    'Este valor difiere de lo que XCTrack escribe en un widget nuevo de este tipo.',
  'properties.setByYouHelpValue':
    'En un widget nuevo de este tipo, XCTrack escribe «{value}».',

  'properties.factoryValue': 'valor de fábrica',
  'properties.factoryValueHelp':
    'Valor sin cambios: es lo que XCTrack escribe en un widget nuevo de este tipo.',
  'properties.factoryValueUnknown': 'valor de fábrica desconocido',
  'properties.factoryValueUnknownHelp':
    'El catálogo de valores de fábrica no describe este ajuste — ajuste universal escrito a ' +
    'mano durante el relevo, ajuste aparecido desde entonces, o valor no comparable. Nada se ' +
    'afirma de esta línea.',

  /* -------------------------- el tercer gesto: restablecer el valor de fábrica */

  'properties.restoreFactoryValue': 'Restablecer el valor de fábrica',
  'properties.restoreAria': 'Restablecer {label} a su valor de fábrica',
  'properties.restoreHelp':
    'Escribe «{path}»: {factory} en el archivo, en lugar de {current}.\n\nEste gesto no es como «Definir este valor» al final del panel: aquel deja que el aparato se comporte exactamente como hoy, este no. Sustituye un ajuste que usted eligió por el que XCTrack pone en un widget nuevo de este tipo.',
  'properties.restoreNote':
    '«{factory}» de fábrica, «{current}» en este archivo. Restablecer cambia lo que el aparato hace en vuelo.',
  'properties.restoreCaveatOtherVersion':
    'Este valor de fábrica se relevó en XCTrack {version}, que no es la versión de la que viene este archivo: compruebe que es realmente el que hay que restablecer.',
  'properties.restoreCaveatUnknownVersion':
    'Este valor de fábrica se relevó en XCTrack {version} y aquí no se conoce la versión de este archivo: compruebe que es realmente el que hay que restablecer.',

  /* ------------------------------------------------------------ una línea del panel */

  'properties.outOfCatalogSetting': 'ajuste fuera del catálogo',
  'properties.outOfCatalogSettingHelp':
    '«{path}» no está descrito por el catálogo: esta herramienta adivina el mando a partir del tipo del valor.',
  'properties.helpAria': 'Ayuda sobre este ajuste',
  'properties.readOnlyValue': 'Valor no modificable aquí; se conserva tal cual.',

  /* ----------------------------------- las unidades que el catálogo deja desnudas */

  'properties.unitSystem': 'como los ajustes generales',
  'properties.unitMeter': 'metros (m)',
  'properties.unitFoot': 'pies (ft)',
  'properties.unitYard': 'yardas (yd)',
  'properties.unitKmPerHour': 'kilómetros por hora (km/h)',
  'properties.unitMetersPerSecond': 'metros por segundo (m/s)',
  'properties.unitMilesPerHour': 'millas por hora (mph)',
  'properties.unitKnot': 'nudos (kt)',
  'properties.unitCelsius': 'grados Celsius (°C)',
  'properties.unitFahrenheit': 'grados Fahrenheit (°F)',
  'properties.coordDegrees': 'grados decimales',
  'properties.coordDegreesMinutes': 'grados y minutos',
  'properties.coordDegreesMinutesSeconds': 'grados, minutos y segundos',
  'properties.coordUtm': 'UTM',

  /* ============================================ widgetPalette.ts — la paleta de adición */

  'palette.title': 'Agregar un widget',
  'palette.typeCount': {
    one: '{count} tipo',
    other: '{count} tipos'
  },
  'palette.notOffered': 'Presentes en el archivo, no propuestos por XCTrack',

  'palette.search': 'Buscar un widget',
  'palette.searchAria':
    'Buscar un widget por su nombre, o por el nombre que lleva en el archivo',

  'palette.onlyPresent': 'Ya en el archivo ({count})',
  'palette.onlyPresentHelp':
    'Esos tipos se copiarán de un widget que XCTrack escribió él mismo: todos sus ajustes se ' +
    'conservan, incluidos los que este editor no sabe presentar.',
  'palette.intentGloss':
    'Una «intención» (intent, en inglés) es el mensaje con el que una aplicación de Android hace reaccionar a otra: este widget no hace nada por sí mismo, envía una señal que recibe otra aplicación configurada en el aparato.',

  'palette.legend':
    'Filete continuo: el widget se copiará de un ejemplar ya presente en el archivo, con ' +
    'todos sus ajustes. Filete punteado: se creará solo con sus ajustes básicos, y XCTrack ' +
    'añadirá los demás al leer. La miniatura muestra, en ambos casos, lo que el clic pondrá.',
  'palette.noMatch': 'Ningún widget lleva ese nombre.',

  /* ------------------------------------------------ lo que la miniatura puede mostrar */

  'palette.previewDrawn':
    'Vista previa dibujada por el editor según los ajustes del widget. Los valores mostrados ' +
    'son ejemplos fijos: nada se calcula a partir de un vuelo.',
  'palette.previewGeneric':
    'Este editor no tiene dibujo propio para este tipo: la miniatura muestra su título y un ' +
    'guion en lugar del valor. En el aparato mostrará sus datos de vuelo.',
  'palette.previewBlank':
    'Este tipo no pinta nada en reposo en el aparato: la miniatura está vacía porque la ' +
    'pantalla también lo está mientras no haya llegado ningún mensaje.',

  'palette.nothingAtRest': 'nada en reposo',
  'palette.notDrawn': 'vista previa no dibujada',

  /* ---------------------------------------------------------- las marcas de una línea */

  'palette.pro': 'Pro',
  'palette.proHelp': 'XCTrack reserva este widget a la licencia Pro.',
  'palette.hereOnce': 'ya aquí',
  'palette.hereCount': 'ya aquí × {count}',
  'palette.hereOnceHelp': 'Este tipo ya está en la página mostrada.',
  'palette.hereCountHelp': {
    one: '{count} ejemplar de este tipo ya está en la página mostrada.',
    other: '{count} ejemplares de este tipo ya están en la página mostrada.'
  },
  'palette.elsewhere': 'en otro sitio',
  'palette.elsewhereHelp': {
    one: 'Ausente de esta página, pero presente {count} vez en otro sitio del archivo: la copia partirá de ese widget, con sus ajustes.',
    other: 'Ausente de esta página, pero presente {count} veces en otro sitio del archivo: la copia partirá de ese widget, con sus ajustes.'
  },

  /* ------------------------------------- el rótulo que lee la asistencia por voz */

  'palette.spokenPro': 'licencia Pro',
  'palette.spokenHereOnce': 'ya en esta página',
  'palette.spokenHereCount': {
    one: 'ya {count} vez en esta página',
    other: 'ya {count} veces en esta página'
  },
  'palette.spokenCopyFromPage': 'se copiará con los ajustes del widget de esta página',
  'palette.spokenCopyFromElsewhere':
    'se copiará con los ajustes de un widget de otra página',
  'palette.spokenCreate': 'se creará solo con sus ajustes básicos',

  /* ------------------------------------------- la frase del historial de deshacer */

  'palette.addCopyFromPage': 'Agregar «{name}» — copia de un widget de esta página',
  'palette.addCopyFromElsewhere': 'Agregar «{name}» — copia de un widget de otra página',
  'palette.addNew': 'Agregar «{name}» — widget nuevo, ajustes dejados a XCTrack',

  /** Voir `messages/fr/widgets.ts` : d'où vient la copie, la page nommée. */
  'palette.elsewhereOnLandscape': 'en otro sitio — página {rank} en horizontal',
  'palette.elsewhereOnPortrait': 'en otro sitio — página {rank} en vertical',
  'palette.spokenCopyFromLandscape':
    'se copiará con los ajustes del widget de la página {rank} en horizontal',
  'palette.spokenCopyFromPortrait':
    'se copiará con los ajustes del widget de la página {rank} en vertical',
  'palette.addCopyFromLandscape':
    'Agregar «{name}» — copia del widget de la página {rank} en horizontal',
  'palette.addCopyFromPortrait':
    'Agregar «{name}» — copia del widget de la página {rank} en vertical',


  /* ========================================= widgetList.ts — los widgets de la página */

  'widgets.listTitle': 'Widgets de la página',
  'widgets.listAria': 'Widgets de la página, del fondo al primer plano',
  'widgets.emptyPage': 'Esta página no lleva ningún widget.',
  'widgets.rankBack': 'Rango 1 · al fondo',
  'widgets.rankFront': 'Rango {rank} · en primer plano',

  'widgets.unreachableHere': 'inalcanzable aquí',
  'widgets.unreachableHereHelp':
    'En este editor, ningún clic en la página puede alcanzar este widget: los rangos ' +
    'superiores lo cubren enteramente, y esta lista es el único camino hacia él. En el ' +
    'instrumento sigue en su sitio — un botón de acción así cubierto sigue respondiendo al ' +
    'dedo.',
  'widgets.nothingAtRestHelp':
    'En el aparato, este tipo no pinta nada en reposo. Ocupa sin embargo su sitio e ' +
    'intercepta los clics como cualquier otro widget.',

  'widgets.unreachableCount': {
    one: '{count} inalcanzable en el editor',
    other: '{count} inalcanzables en el editor'
  },
  'widgets.unreachableCountHelp':
    'Estos widgets están enteramente cubiertos por rangos superiores: aquí, ningún clic en ' +
    'la página los alcanza, y esta lista es el único camino hacia ellos. En el instrumento ' +
    'siguen en su sitio — un botón de acción así cubierto sigue respondiendo al dedo.',

  'widgets.spokenRank': 'Rango {rank} de {total}',
  'widgets.spokenSize': '{width} por {height} milímetros',
  'widgets.spokenUnreachable': 'inalcanzable con un clic en este editor',
  'widgets.spokenNothingAtRest': 'no dibuja nada en el aparato'
}

export default widgets
