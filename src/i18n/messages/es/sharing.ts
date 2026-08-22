import type { DomainCatalog } from '../../domains'

/**
 * `sharingDialog.ts`, `warnings.ts` — voir `fr/sharing.ts` pour ce qui est tranché.
 *
 * **La gradation des trois issues** : *Su configuración, tal como está* → *Todos sus
 * ajustes, sin lo que le identifica* → *Versión compartible, sin datos personales*. Aucun
 * titre ne promet *seguro* : le deuxième cran donne davantage que le troisième, et une
 * promesse de sûreté y renverserait l'échelle.
 *
 * *widget* et non *gadget* — mesuré sur les 55 relevés, voir `fr/common.ts`. Vouvoiement
 * (*usted*) partout, comme `common.ts`.
 */
const sharing: DomainCatalog<'sharing'> = {
  /* ================== sharingDialog.ts — elegir lo que se entrega */

  'sharing.dialogTitle': 'Guardar esta configuración',
  'sharing.close': 'Cerrar',
  'sharing.cancel': 'Cancelar',
  'sharing.confirm': 'Guardar',
  'sharing.lead': 'El archivo producido lleva un nombre con marca de tiempo que no retoma ' +
    'nada del nombre de origen — este contiene a menudo un nombre de pila. El nombre queda ' +
    'pues resuelto; falta elegir lo que el archivo contiene.',
  'sharing.legend': '¿Qué hay que guardar?',
  'sharing.curiousHead': 'Para los curiosos',
  'sharing.producedFileName': 'Nombre del archivo producido: {name}',

  'sharing.choiceLabel': '{title}. {note}',

  'sharing.plainTitle': 'Su configuración, tal como está',
  'sharing.backupTitle': 'Todos sus ajustes, sin lo que le identifica',
  'sharing.pagesTitle': 'Versión compartible, sin datos personales',

  'sharing.plainContentPages': 'Una exportación «pages» no lleva preferencias, pero sí los ' +
    'textos que usted ha escrito en los widgets.',
  'sharing.plainContentBackup': 'Lleva sus preferencias: nombre del piloto, vela, sensores ' +
    'emparejados, archivos de waypoints.',

  'sharing.plainTally': 'Lleva {layout} y {preferences}; todos saldrían en claro.',
  'sharing.personalInLayout': {
    one: '{count} dato personal en la disposición',
    other: '{count} datos personales en la disposición'
  },
  'sharing.personalInPreferences': {
    one: '{count} en las preferencias',
    other: '{count} en las preferencias'
  },

  'sharing.backupNoteUnchanged': 'El archivo sigue siendo una copia de seguridad entera — ' +
    'vario y sus sonidos, unidades, tema, umbrales de espacios aéreos, botones. Este ' +
    'archivo en concreto no lleva nada que le identifique: no hay pues nada que ' +
    'reemplazar en él.',
  'sharing.backupNoteChanged': {
    one: 'El archivo sigue siendo una copia de seguridad entera — vario y sus sonidos, unidades, tema, umbrales de espacios aéreos, botones. {count} línea que le identifica se reemplaza por un valor neutro o se retira.',
    other: 'El archivo sigue siendo una copia de seguridad entera — vario y sus sonidos, unidades, tema, umbrales de espacios aéreos, botones. {count} líneas que le identifican se reemplazan por valores neutros o se retiran.'
  },
  'sharing.pagesNote': 'Una exportación «pages» cuyos textos escritos por usted se ' +
    'reemplazan por textos neutros. La disposición se conserva; las preferencias no salen.',

  /* ------------------------------ enviar solo algunas páginas, y decirlo con exactitud */

  /**
   * ⚠️ La sección más delicada de este cuadro después de la fidelidad. Véase
   * `fr/sharing.ts`: las tres primeras frases están **medidas en un AIR³ 7.2, XCTrack
   * 1.0.3-beta, el 21 y el 22 de agosto de 2026**; la cuarta dice lo que **no** está
   * medido. Traducir borrando esa distinción le quitaría al proyecto lo que lo distingue.
   */
  'sharing.pagesImportHeading': 'Lo que obtendrá el destinatario',
  'sharing.pagesImportAdd': 'En su instrumento elige qué hace la importación con sus ' +
    'propias páginas. «Añadir solo páginas» pone las suyas de usted a continuación de las ' +
    'de él, sin tocar ninguna: es la opción que conviene indicarle. Medido en un AIR³ 7.2 ' +
    'el 22 de agosto de 2026: nueve páginas añadidas tras cinco, ningún archivo existente ' +
    'modificado.',
  'sharing.pagesImportReplace': '«Reemplazar solo las páginas» reemplaza todas sus páginas ' +
    'por las de este archivo, en ambas orientaciones. Medido en el mismo instrumento: cinco ' +
    'páginas pasaron a seis, tres a cuatro — el instrumento se queda con la cuenta del ' +
    'archivo.',
  'sharing.pagesImportLocked': 'Sus ajustes siguen siendo suyos elija lo que elija: ante ' +
    'una exportación «pages», el instrumento atenúa «Reemplazar todo». Medido al importar.',
  'sharing.pagesImportUnmeasured': 'Lo que no está medido: nunca se ha importado en un ' +
    'instrumento un archivo reducido a una parte de sus páginas, ni ninguno en el que una ' +
    'orientación ya no lleve nada. Lo que el aparato hace con él se deduce de las medidas ' +
    'anteriores, no se ha comprobado.',
  'sharing.pagesCarry': 'Una página no designa ningún archivo exterior — relevado en los ' +
    '21 archivos del corpus: ni tema de mapa, ni lista de puntos de viraje, ni archivos de ' +
    'espacios aéreos, que viven todos en las preferencias. Tampoco lleva un tamaño de ' +
    'pantalla: lo que se coloca en ella va en milésimas, y el instrumento de destino lo ' +
    'redibuja en su propia pantalla. Lo que toma prestado del aparato del destinatario ' +
    '— tema, unidades, tamaño de los títulos, mapas sin conexión — será el suyo, no el de ' +
    'usted.',

  'sharing.pagesChoiceHeading': 'Qué páginas salen',
  'sharing.pagesChoiceIntro': {
    one: 'Este archivo lleva {count} página. Desmarque las que se quedan con usted.',
    other: 'Este archivo lleva {count} páginas. Desmarque las que se quedan con usted.'
  },
  'sharing.pagesChoiceLine': 'Página {rank} en {orientation} · {kind} · {parts}',
  'sharing.pagesChoicePersonal': {
    one: '{count} texto escrito por usted',
    other: '{count} textos escritos por usted'
  },
  'sharing.pagesChoiceAll': 'Marcar todo',
  'sharing.pagesChoiceClear': 'Desmarcar todo',
  'sharing.pagesChoiceEmpty': 'Ninguna página marcada: no hay nada que enviar.',
  'sharing.pagesSelectedCount': {
    one: 'Sale {count} página de {total}.',
    other: 'Salen {count} páginas de {total}.'
  },

  'sharing.fidelityUnchanged': 'Usted no ha modificado nada: el archivo sale exactamente ' +
    'tal como entró, sin una sola coma reescrita.',
  'sharing.fidelityUnchangedDetail': 'Los bytes que usted abrió se reemiten sin ser ' +
    'reescritos: la huella SHA-256 del archivo producido es la del archivo de origen — ' +
    'puede comprobarlo usted mismo.',
  'sharing.fidelityModified': 'Todo lo que usted no ha tocado se copia igual — hasta los ' +
    'números y el espaciado de origen. Solo cambia lo que usted ha cambiado.',
  'sharing.fidelityModifiedDetail': 'Al reescribirse el archivo, su huella SHA-256 difiere ' +
    'de la del archivo de origen; en un documento no modificado es idéntica.',

  'sharing.freeTextHeading': 'Sus textos en los widgets',
  'sharing.freeTextNone': 'Ningún texto propio en los widgets de este archivo: aquí no hay ' +
    'nada que reemplazar.',
  'sharing.freeTextCount': {
    one: '{count} texto escrito por usted se reemplaza. Aquí está cuál, y dónde se encuentra. Vive en la disposición de las páginas y no en las preferencias: sale pues sea cual sea el formato del archivo.',
    other: '{count} textos escritos por usted se reemplazan. Aquí están cuáles, y dónde se encuentran. Viven en la disposición de las páginas y no en las preferencias: salen pues sea cual sea el formato del archivo.'
  },

  'sharing.location': '{orientation} · página {page} · widget {rank} · {name}',
  'sharing.orientationLandscape': 'Horizontal',
  'sharing.orientationPortrait': 'Vertical',

  'sharing.emptyValue': '(vacío)',

  'sharing.otherPersonalInPreferences': {
    one: 'Este archivo lleva además {count} dato personal en sus preferencias — nombre, equipo, sensores emparejados, tarea en curso. No se reemplaza: la versión compartible de arriba solo se lleva las páginas, y deja en bloque toda la sección «preferences».',
    other: 'Este archivo lleva además {count} datos personales en sus preferencias — nombre, equipo, sensores emparejados, tarea en curso. No se reemplazan: la versión compartible de arriba solo se lleva las páginas, y deja en bloque toda la sección «preferences».'
  },

  'sharing.preferencesHeading': 'Sus ajustes personales, línea por línea',
  'sharing.preferencesNone': 'Este archivo no lleva ninguno de los 44 ajustes que XCTrack ' +
    'clasifica entre los datos personales: aquí no hay nada que tratar.',

  'sharing.preferencesFound': {
    one: 'Se ha encontrado {count} ajuste personal en este archivo: {tally}. Cada línea dice lo que le ocurre y por qué.',
    other: 'Se han encontrado {count} ajustes personales en este archivo: {tally}. Cada línea dice lo que le ocurre y por qué.'
  },
  'sharing.preferencesReplaced': { one: '{count} reemplazado', other: '{count} reemplazados' },
  'sharing.preferencesDropped': { one: '{count} retirado', other: '{count} retirados' },
  'sharing.preferencesKept': { one: '{count} conservado', other: '{count} conservados' },
  'sharing.preferencesEmpty': { one: '{count} vacío', other: '{count} vacíos' },

  'sharing.treatmentReplace': 'Reemplazados por un valor neutro',
  'sharing.treatmentDrop': 'Retirados del archivo',
  'sharing.treatmentKeep': 'Conservados tal cual, y he aquí por qué',
  'sharing.treatmentEmpty': 'Presentes en el archivo, pero vacíos',

  'sharing.droppedLine': 'se retira la línea entera',

  'sharing.backupResidualNote': 'Esta salida trata los 44 ajustes personales conocidos de ' +
    'XCTrack y los once campos de texto de los widgets. El formato cambia con cada ' +
    'versión: un ajuste personal aparecido desde entonces no estaría en la lista, y ' +
    'saldría en claro. La versión compartible, más abajo, no depende de ninguna lista — no ' +
    'transporta ningún ajuste en absoluto.',

  'sharing.suspectsHeading': 'Lo que parece un texto que usted habría escrito',
  'sharing.suspectsCount': {
    one: '{count} texto no figura en ninguna de nuestras listas y sin embargo lo parece.',
    other: '{count} textos no figuran en ninguna de nuestras listas y sin embargo lo parecen.'
  },
  'sharing.suspectsNote': 'Estos textos no figuran en ninguna de nuestras listas, y sin ' +
    'embargo se parecen a algo que usted habría escrito. Salen tal cual: no reemplazamos ' +
    'aquello de lo que no estamos seguros, porque estropearíamos ajustes. Solo usted sabe ' +
    'si los ha escrito.',
  'sharing.suspectsNoneNote': 'Ningún texto inesperado en lo que sale: todo lo que no se ' +
    'trata más arriba tiene la forma de un ajuste — una palabra elegida de una lista, un ' +
    'número — y no la de un texto escrito.',
  'sharing.suspectsMore': {
    one: '{count} otro texto del mismo género no se muestra aquí, por falta de sitio. Relea el archivo producido antes de enviarlo.',
    other: '{count} otros textos del mismo género no se muestran aquí, por falta de sitio. Relea el archivo producido antes de enviarlo.'
  },

  'sharing.backupCostHeading': 'Lo que el destinatario no tendrá',
  'sharing.backupCostIntro': 'Todos sus ajustes pasan — vario y sus sonidos, unidades, ' +
    'tema, umbrales de espacios aéreos, botones. Lo que no tendrá son los recursos propios ' +
    'de su aparato:',
  'sharing.backupCostOutro': 'Ninguna de estas líneas es un ajuste: son archivos y ' +
    'aparatos que viven en su casa, y con los que él no habría podido hacer nada. ' +
    'La hora a la que hizo esta exportación también se pone a cero: llevaba su huso ' +
    'horario, y una hora con precisión de segundos se cruza con un vuelo publicado el ' +
    'mismo día.',

  'sharing.backupCostSensors': 'sus sensores emparejados: él empareja los suyos, que son ' +
    'los únicos que puede utilizar;',
  'sharing.backupCostTask': 'su tarea en curso, sus puntos de viraje y sus coordenadas;',
  'sharing.backupCostFiles': 'sus archivos de waypoints y de espacios aéreos, y el tema de ' +
    'mapa que usted ha instalado — archivos de su aparato;',
  'sharing.backupCostOfflineMaps': 'sus mapas sin conexión, por la misma razón;',
  'sharing.backupCostQuickMessages': 'sus mensajes rápidos de Livetracking, que son sus ' +
    'propias frases.',

  'sharing.anonymousCostIntro': 'Lo que el destinatario no tendrá, pues, y deberá ajustar ' +
    'él mismo:',
  'sharing.anonymousCostOutro': 'Recibe la disposición de sus páginas, no sus preferencias. ' +
    'Es lo que se quiere la mayoría de las veces — sus unidades no son forzosamente las de ' +
    'usted — pero hay que saberlo antes de enviar. La hora de la exportación también se ' +
    'pone a cero: llevaba su huso horario.',

  'sharing.anonymousCostUnits': 'las unidades — altitudes, distancias, velocidades: ' +
    'conservará las suyas;',
  'sharing.anonymousCostTheme': 'el tema de visualización, y el tamaño y el color de los ' +
    'títulos de los widgets;',
  'sharing.anonymousCostVario': 'los ajustes del vario y de sus sonidos;',
  'sharing.anonymousCostAirspace': 'los umbrales y los canales de espacios aéreos;',
  'sharing.anonymousCostLivetracking': 'el Livetracking y sus credenciales;',
  'sharing.anonymousCostSensors': 'los sensores Bluetooth emparejados.',

  'sharing.droppedHeading': 'Lo que no saldrá',
  'sharing.droppedNothing': 'Este archivo ya es una exportación «pages»: no lleva ninguna ' +
    'preferencia, no hay pues nada que retirarle.',
  'sharing.droppedIntro': {
    one: 'El archivo compartido es una exportación «pages»: solo lleva sus páginas. Esta ' +
      'sección entera se queda con usted.',
    other: 'El archivo compartido es una exportación «pages»: solo lleva sus páginas. ' +
      'Estas secciones enteras se quedan con usted.'
  },

  'sharing.droppedPreferences': 'Todas sus preferencias: nombre del piloto, vela, ' +
    'unidades, tema, ajustes del vario y de sus sonidos, umbrales de espacios aéreos, ' +
    'Livetracking, sensores Bluetooth emparejados, archivos de waypoints.',
  'sharing.droppedAirspaceChannels': 'Los canales de espacios aéreos que usted ha ' +
    'seleccionado.',
  'sharing.droppedUnknownSection': 'La sección «{key}», que una exportación «pages» no transporta.',

  'sharing.annexesHeading': 'Los anexos del archivo comprimido',
  'sharing.annexesNote': 'Un archivo comprimido .xczfg transporta archivos anexos que este ' +
    'editor no inspecciona — ni su contenido, ni los metadatos de una imagen, donde una ' +
    'foto lleva a menudo las coordenadas del lugar de la toma. La versión compartible se ' +
    'escribe por eso en .xcfg desnudo, sin ellos. No se pierde nada útil: los recursos ' +
    'externos de una configuración se designan desde las preferencias, que tampoco salen.',

  'sharing.residualNote': 'La lista de los once campos de texto tratados es fija, y el ' +
    'formato de XCTrack cambia con cada versión: un campo de texto aparecido desde ' +
    'entonces saldría en claro. Relea el inventario de arriba antes de enviar el archivo — ' +
    'esa es la comprobación, no la promesa de esta herramienta.',

  'sharing.personalHeading': 'Todo lo personal que lleva este archivo: {total} — {layout} en la disposición, {preferences} en las preferencias',
  'sharing.personalFilled': {
    one: '{count} está cumplimentado',
    other: '{count} están cumplimentados'
  },
  'sharing.personalEmpty': {
    one: '{count} es un espacio presente pero vacío',
    other: '{count} son espacios presentes pero vacíos'
  },
  'sharing.personalTravelsNote': 'Solo los de la disposición salen con una exportación ' +
    '«pages».',

  /* ================== warnings.ts — lo que hay que saber de este archivo */

  'warnings.exportPagesTitle': 'Exportación «pages»: solo las pantallas',
  'warnings.exportPagesDetail': 'Este archivo solo lleva las páginas de widgets. Reimportado ' +
    'en XCTrack, reemplaza las pantallas y no toca nada más: ajustes del vario, unidades, ' +
    'archivos de espacio aéreo y configuración de los sensores siguen siendo los del aparato.',
  'warnings.exportBackupTitle': 'Exportación «backup»: la configuración entera',
  /**
   * ⚠️ Voir le commentaire du français : « aplasta … la configuración de los sensores »
   * était trop noir. Mesuré sur un AIR³ le 22 août 2026, un réglage absent du fichier
   * garde sa valeur sur l'appareil.
   */
  'warnings.exportBackupDetail': 'Este archivo lleva toda la configuración. Reimportado en ' +
    'XCTrack, reemplaza no solo las pantallas, sino también los ajustes del vario, las ' +
    'unidades, los archivos de espacio aéreo y la configuración de los sensores — los que ' +
    'lleva. Medido en un AIR³: un ajuste que el archivo no lleva conserva su valor en el ' +
    'aparato, no se borra.',
  'warnings.exportUnknownTitle': 'Tipo de exportación indeterminado',
  'warnings.exportUnknownDetail': 'Este archivo no dice si contiene solo páginas o toda la ' +
    'configuración (info.exportType ausente o desconocido). Lo que aplastará al ' +
    'reimportarse no puede pues anunciarse aquí.',
  'warnings.exportUnknownItem': 'info.exportType: «{type}»',

  'warnings.assumedValuesTitle': 'Tema, unidades y tipografía supuestos',
  'warnings.assumedValuesDetail': 'Este archivo no lleva ninguna preferencia: el tema, las ' +
    'unidades y el tamaño de los títulos empleados para dibujar estas páginas son valores ' +
    'de fábrica medidos en otra parte, no los de su aparato. La geometría, en cambio, sí ' +
    'viene del archivo.',
  'warnings.assumedTheme': 'Tema: {theme}',
  'warnings.assumedUnits': 'Altitud: {altitude} · Velocidad: {speed} · Vario: {vario}',
  'warnings.assumedTitles': 'Títulos: {percent} %, {font}',
  'warnings.assumedLanguageTitle': 'Idioma de las etiquetas indeterminado',
  'warnings.assumedLanguageDetail': 'Este archivo no declara ningún idioma de visualización: en el aparato, XCTrack sigue entonces el idioma del sistema Android — nunca el inglés como reserva. A falta de algo mejor, las etiquetas se muestran aquí en {language} — el idioma que ha elegido para esta interfaz, o en su defecto el de su navegador. La línea que lo llevaría, Display.Language, está vacía o ausente del archivo.',

  'warnings.personalLayoutTitle': 'Sus páginas llevan textos suyos',
  'warnings.personalTitle': 'Este archivo le nombra',
  'warnings.personalPreferenceCount': {
    one: '{count} ajuste personal cumplimentado',
    other: '{count} ajustes personales cumplimentados'
  },
  'warnings.personalLayoutCount': {
    one: '{count} texto escrito en un widget',
    other: '{count} textos escritos en los widgets'
  },
  'warnings.personalDetailLead': 'Este archivo lleva {preferences} y {layout} que le identifican: su nombre, su equipo, sus opciones de difusión, su tarea en curso con sus coordenadas, y hasta la competición en la que usted participa — los nombres de los archivos de waypoints la designan.',
  'warnings.personalTravels': {
    one: '{count} texto escrito en un widget sale incluso con una exportación «pages»: ese formato es una criba de grano grueso, no una limpieza.',
    other: '{count} textos escritos en los widgets salen incluso con una exportación «pages»: ese formato es una criba de grano grueso, no una limpieza.'
  },
  'warnings.personalEmptySlots': {
    one: '{count} espacio personal está presente pero vacío — no se enumera aquí.',
    other: '{count} espacios personales están presentes pero vacíos — no se enumeran aquí.'
  },
  'warnings.personalDetailTail': 'Esta herramienta no despoja nada en silencio: el archivo ' +
    'sale tal como entró. Usted decide.',
  'warnings.personalItem': '{key} — {kind}: {value}',

  'warnings.externalTitle': 'Archivos exteriores referenciados',
  'warnings.externalDetail': 'Estos nombres designan archivos presentes en el aparato de ' +
    'origen, no en esta configuración. Una configuración recibida de otro piloto apunta a ' +
    'archivos que solo él tiene: XCTrack los buscará en su tarjeta SD y no los encontrará. ' +
    'Esta herramienta los enumera, no los corrige. Las tres líneas del archivo que pueden ' +
    'llevarlos: Mapsforge.ThemeFile, Navigation.WaypointFiles y Airspace.Files.',
  'warnings.externalMapTheme': 'Tema de mapa: {file}',
  'warnings.externalWaypoints': 'Waypoints: {file}',
  'warnings.externalAirspace': 'Espacio aéreo: {file}',

  'warnings.versionUnknownTitle': 'Versión de XCTrack desconocida',
  'warnings.versionUnknownDetail': 'Este archivo no dice de qué versión de XCTrack viene. La diferencia con la versión de referencia de esta herramienta ({reference}) no puede pues medirse; lo que se muestra puede haber cambiado de sentido desde entonces. La línea que lo diría, info.versionCode, está ausente.',
  'warnings.versionOlderTitle': 'Archivo más antiguo que la herramienta',
  'warnings.versionNewerTitle': 'Archivo más reciente que la herramienta',
  'warnings.versionGapDetail': 'Este archivo viene de la versión {name}, mientras que este editor se ajusta a la versión {reference} para dibujarlo. El formato cambia con cada versión: algunos ajustes pueden dibujarse de otro modo del que tendrán en el aparato. El archivo no se modifica por ello — sale tal como entró, sin una sola coma reescrita. Lo que el archivo escribe de su versión: versionCode {code}.',
  'warnings.versionNameUnknown': 'desconocida',

  'warnings.structureTitle': 'Estructura inesperada',
  'warnings.structureDetail': 'Este editor no ha reconocido una parte de este archivo. La ' +
    'representación queda degradada allí donde falta la información, pero nada se pierde: ' +
    'el documento se conserva intacto y sale tal cual.',
  'warnings.where': '{orientation}, página {page}',
  'warnings.structureNoClass': '{where}: esta página no dice su tipo',
  'warnings.structureNavigations': '{where}: esta herramienta no sabe decir cuándo se muestra esta página — el valor «navigations» no es ni «all», ni «none», ni una lista',
  'warnings.structureMissingKeys': {
    one: '{where}, widget {rank}: falta la línea {keys}',
    other: '{where}, widget {rank}: faltan las líneas {keys}'
  },
  'warnings.structureDuplicate': 'Línea duplicada: {path}',

  'warnings.geometryTitle': 'Defectos de geometría',
  'warnings.geometryDetail': 'Estos widgets no pueden mostrarse como su autor esperaba: ' +
    'caja de anchura o de altura nula, coordenadas fuera de los límites, o widget ' +
    'enteramente oculto bajo otro, del que nunca mostrará el valor. Los simples ' +
    'solapamientos no se señalan: son normales sobre un mapa o un asistente de térmicas.',
  'warnings.who': '{where}, widget {rank} ({name})',
  'warnings.cover': 'widget {rank} ({name})',
  'warnings.box': 'X1 {x1}, Y1 {y1}, X2 {x2}, Y2 {y2}',
  'warnings.geometryZeroWidth': '{who}: anchura nula, no tiene superficie alguna — {box}',
  'warnings.geometryZeroHeight': '{who}: altura nula, no tiene superficie alguna — {box}',
  'warnings.geometryOutside': '{who}: sale de la página, {edge} está en {value} — {box}',
  'warnings.edgeLeft': 'su borde izquierdo',
  'warnings.edgeTop': 'su borde superior',
  'warnings.edgeRight': 'su borde derecho',
  'warnings.edgeBottom': 'su borde inferior',
  'warnings.geometryCovered': '{who}: oculto por el {cover}, y no mostrará pues nada',
  'warnings.geometryCoveredButton': '{who}: oculto por el {cover}, pero sigue activo al dedo',

  'warnings.coveredButtonsTitle': 'Botones de acción ocultos, y sin duda a propósito',
  'warnings.coveredButtonsDetail': 'Otro widget está puesto encima de estos botones y los ' +
    'recubre enteramente: en el instrumento, usted no los verá. Sin embargo siguen ' +
    'respondiendo al dedo — pulsar en ese sitio dispara su acción, aunque lo que usted vea ' +
    'allí sea el mapa o el asistente de térmicas. Es un montaje corriente y no un defecto: ' +
    'da un mando allí donde la pantalla ya está ocupada. Nada que corregir, salvo que la ' +
    'superposición le sorprenda.',

  'warnings.themeTitle': 'Tema dibujado distinto del tema declarado',
  'warnings.themeDetail': 'Estas páginas se dibujan aquí con el tema {theme}, el único que ha sido observado en el instrumento. El archivo pide otro: los colores y los contrastes que usted ve no son pues los de su aparato. La geometría, en cambio, es exacta — y el archivo no se modifica por ello.',
  'warnings.themeFileKnown': 'Tema del archivo: {theme}',
  'warnings.themeFileUnknown': 'Tema del archivo: {theme} (tema desconocido para esta herramienta)',
  'warnings.themePerWidget': {
    one: '{count} widget en {theme}',
    other: '{count} widgets en {theme}'
  },

  'warnings.hypothesisTitle': '{title} — por confirmar en el instrumento',
  'warnings.hypothesisLead': 'No es una constatación medida sino una pregunta, y he aquí ' +
    'lo que la zanjaría.',
  'warnings.preflightItem': '{where}: {message}'
}

export default sharing
