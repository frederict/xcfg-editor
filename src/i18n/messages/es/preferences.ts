import type { DomainCatalog } from '../../domains'

/**
 * `preferencesPage.ts` en espagnol.
 *
 * **valor de fábrica** partout où le français dit « valeur d'usine » — comme
 * `factoryValue.same` dans `es/common.ts`. *Valor predeterminado* est écarté : il dirait
 * « ce qui s'applique quand on ne fait rien », ce que `preferences.absentKeyOnImport`
 * réfute précisément.
 *
 * **ajuste** pour un réglage, **línea** pour une ligne du fichier, **widget** (mesuré : la
 * chrome espagnole ne dit jamais *componente*), **dispositivo** pour l'appareil,
 * vouvoiement (*usted*) partout. Les guillemets sont « … », comme en français.
 */
const preferences: DomainCatalog<'preferences'> = {
  'preferences.absentKeyOnImport':
    'Al importar («Reemplazar todo»), su dispositivo conserva el ajuste que ya tiene: lo ' +
    'que el archivo no dice no se toca. Medido en el AIR³. En un dispositivo que nunca lo ' +
    'ha tocado, se aplica el valor de fábrica de XCTrack.',

  'preferences.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },
  /** Voir `fr/preferences.ts` : message de démonstration du socle, pas de l'écran. */
  'preferences.absentFromFile': {
    one: 'falta {count} línea en el archivo',
    other: 'faltan {count} líneas en el archivo'
  },

  'preferences.lineCount': {
    one: '{count} línea',
    other: '{count} líneas'
  },
  'preferences.characterCount': {
    one: '{count} carácter',
    other: '{count} caracteres'
  },

  'preferences.structuredValue': 'valor estructurado, {size}',
  'preferences.emptyList': 'lista vacía',
  'preferences.listValue': {
    one: 'lista de {count} elemento, {size}',
    other: 'lista de {count} elementos, {size}'
  },
  'preferences.yes': 'Sí',
  'preferences.no': 'No',
  'preferences.noKeyAssigned': 'ninguna tecla',
  'preferences.emptyValue': '(vacío)',
  'preferences.offCatalogue': '{value} (fuera del catálogo)',
  'preferences.truncatedValue': '{start}… ({size})',
  'preferences.someStructure': 'una estructura',

  'preferences.longPress': 'pulsación larga',
  'preferences.shortPress': 'pulsación simple',
  'preferences.rawCode': 'código de tecla {code}',
  'preferences.codeAndName': 'código de tecla {code}, {name}',

  'preferences.physicalKeyCount': {
    one: '{count} tecla física',
    other: '{count} teclas físicas'
  },
  'preferences.hardwareUnsurveyedUnknownDevice':
    'Solo hemos medido las teclas físicas en {models}, y este archivo no dice de qué ' +
    'dispositivo viene: esta caja es un punto ciego. El código de cada asignación se lee y ' +
    'se nombra más arriba, pero no sabemos qué tecla lo emite.',
  'preferences.hardwareUnsurveyedOtherDevice':
    'Solo hemos medido las teclas físicas en {models}, y este archivo viene de otro ' +
    'dispositivo ({device}): esta caja es un punto ciego. El código de cada asignación se ' +
    'lee y se nombra más arriba, pero no sabemos qué tecla lo emite.',
  'preferences.hardwareSurveyed':
    'En {model} — el modelo que declara este archivo — solo hemos pulsado {keys}: {listed}. ' +
    '{missing} La medición se hizo en una sola caja, y los modelos más recientes llevan más.',
  'preferences.hardwareDeclaredOne':
    'El código {codes} no es ninguna de ellas; el núcleo de la caja lo declara de todos ' +
    'modos, lo que lo hace posible en este material sin que una pulsación lo haya probado.',
  'preferences.hardwareDeclaredMany':
    'Los códigos {codes} no son ninguna de ellas; el núcleo de la caja los declara de ' +
    'todos modos, lo que los hace posibles en este material sin que una pulsación lo ' +
    'haya probado.',
  'preferences.hardwareStrangerOne':
    'El código {codes} no es ninguna de ellas, y el núcleo de la caja no lo declara en ' +
    'ninguno de sus dispositivos de entrada: no sabemos qué tecla lo emite.',
  'preferences.hardwareStrangerMany':
    'Los códigos {codes} no son ninguna de ellas, y el núcleo de la caja no los declara ' +
    'en ninguno de sus dispositivos de entrada: no sabemos qué teclas los emiten.',
  'preferences.keyNoteBelow':
    'La nota bajo este bloque dice lo que valen estas mediciones.',
  'preferences.keyFromSurvey':
    '«{label}» es el nombre de esta tecla en la carcasa, medido a mano en {model}. {name} es el nombre que Android da al código {code}.',
  'preferences.keyFromKernel':
    '{name} es el nombre que la tabla de teclas de Android da al código {code}. No hemos ' +
    'pulsado ninguna tecla que lo emita en {model}, pero el núcleo de la caja lo declara ' +
    'en {devices}. El código es pues posible en este material, lo que no prueba que haya ' +
    'un botón soldado para él.',
  'preferences.keyFromNeither':
    '{name} es el nombre que la tabla de teclas de Android da al código {code}. No hemos ' +
    'pulsado ninguna tecla que lo emita en {model}, y el núcleo de la caja no lo declara ' +
    'en ninguno de sus dispositivos de entrada: no sabemos de dónde viene.',
  'preferences.keyFromAndroid':
    '{name} es el nombre que la tabla de teclas de Android da al código {code}. Esa tabla nombra un código, no un botón: no dice cuál de sus teclas lo emite, y esta no la hemos medido a mano.',
  'preferences.keyFromNowhere':
    'El código {code} no figura en ninguna tabla de teclas que hayamos leído. Aquí no se le da ningún nombre: inventarlo sería el peor de los servicios.',
  'preferences.keyInjectionHypothesis':
    'Hipótesis, no verificada, sobre el código {code}: una aplicación instalada en el ' +
    'dispositivo puede inyectar un código sin que ninguna tecla lo emita, y el paquete ' +
    '{addon} está presente en esta caja. Nada lo prueba: solo una pulsación, o la ' +
    'lectura de esa aplicación, lo zanjaría.',
  'preferences.intentGloss':
    'Una «intención» (intent, en inglés) es el mensaje con el que una aplicación de Android hace reaccionar a otra. Esta tecla no gobierna pues XCTrack: envía una señal, y es otra aplicación, configurada en el aparato, la que responde.',

  'preferences.keyNamingOrigin':
    'Un nombre en palabras es el que lleva la tecla en la carcasa, recogido al pulsarla a mano: solo existe para los modelos que hemos tenido entre las manos. Un nombre en KEYCODE_ viene de la tabla de teclas de Android, que nombra el código y no el botón. Entre ambos se cuela un tercer nivel: el núcleo de la caja declara códigos que nunca hemos pulsado, y un código declarado es posible en este material sin que un botón lo emita por ello. Un nombre que falta es pues una medición que falta, nunca una tecla que no existiría.',

  'preferences.runtimeDefaultReason':
    'XCTrack rellena esta lista en el código y su valor de fábrica depende del idioma y ' +
    'del país del dispositivo: no hay nada que comparar.',
  'preferences.unknownSettingReason':
    'Este editor no conoce este ajuste: no sabe ni su función ni su valor de fábrica.',
  'preferences.noFactoryValueInCatalogue':
    'El catálogo no registra ningún valor de fábrica para este ajuste.',
  'preferences.structuredVsScalar':
    'El valor del archivo es una estructura; el del catálogo de los valores de fábrica es ' +
    'un valor simple.',

  'preferences.refusalUnknown':
    'Este editor no sabe qué ajusta esta línea del archivo: no propone cambiarla. Se ' +
    'conserva tal cual.',
  'preferences.refusalState':
    'Esta línea registra el estado de la aplicación, no un ajuste: sale intacta, nunca ' +
    'reescrita.',
  'preferences.refusalUnlabelled':
    'XCTrack no nombra este ajuste en ningún sitio que podamos leer: sin su etiqueta, este ' +
    'editor no propone cambiarlo.',
  'preferences.refusalStructured':
    'Valor compuesto: esta página lo muestra tal cual, sin abrirlo, y nunca lo reescribe.',
  'preferences.refusalAction':
    'En el dispositivo, esto se obtiene mediante un cuadro de diálogo — una tecla que hay ' +
    'que pulsar en el instrumento, una tabla que hay que construir — que esta página no ' +
    'puede sustituir. El valor se sigue leyendo, y el documento sale intacto.',
  'preferences.refusalNoValue':
    'Esto no se escribe: la línea da una orden, no lleva ningún valor.',
  'preferences.refusalNote': {
    one: '{count} ajuste de este bloque no se ajusta aquí. {reason}',
    other: '{count} ajustes de este bloque no se ajustan aquí. {reason}'
  },

  'preferences.stateCustom': 'ajustado por usted',
  'preferences.stateDefault': 'valor de fábrica',
  'preferences.stateConflict': 'valor de fábrica incierto',
  'preferences.stateAbsent': 'ausente del archivo',
  'preferences.stateUnwritten': 'nunca ajustado',
  'preferences.stateUndecidable': 'nada que comparar',

  'preferences.stateTitleCustomUnknown':
    'Este valor difiere del valor de fábrica de XCTrack.',
  'preferences.stateTitleCustom': 'El valor de fábrica de XCTrack es «{factory}».',
  'preferences.stateTitleDefault':
    'Valor sin cambios: es el valor de fábrica de XCTrack.',
  'preferences.stateTitleConflict':
    'XCTrack anuncia dos valores de fábrica distintos para este ajuste: «{code}» en su ' +
    'código y «{screen}» en su pantalla de ajustes. Este editor no elige en su lugar. Su ' +
    'valor, por su parte, es el del archivo.',
  'preferences.stateTitleAbsent':
    'Este ajuste no está en el archivo: no dice nada de él. {absent}',
  'preferences.stateTitleAbsentWithValue':
    'Este ajuste no está en el archivo: no dice nada de él. {absent} Es «{factory}».',
  'preferences.stateTitleUnwritten':
    'Este ajuste no está en el archivo, y XCTrack solo lo escribe en él una vez ajustado ' +
    'al menos una vez en el dispositivo: su ausencia no dice nada — ni lo que aplica su ' +
    'dispositivo, ni lo que aplicaría recién estrenado.',
  'preferences.stateTitleNoFactoryValue':
    'No se conoce ningún valor de fábrica para este ajuste.',

  'preferences.editInsertDescription': 'Escribir {label} en el archivo',
  'preferences.editSetDescription': 'Ajustar {label}',
  'preferences.removeFromFile': 'Quitar {label} del archivo',
  'preferences.restoreToFactoryValue': 'Restablecer {label} a su valor de fábrica',

  'preferences.factoryValueUnknown': 'valor de fábrica desconocido',
  'preferences.factoryValueUnknownTitle':
    'El catálogo no registra ningún valor de fábrica escribible para este ajuste: este ' +
    'editor no tiene con qué crearlo, y no se lo inventa.',
  'preferences.implicitTitle':
    '«{factory}» es el valor de fábrica de XCTrack, no un valor ajustado: este ajuste no ' +
    'está en el archivo. {absent}',
  'preferences.adoptLabel': 'Escribir este valor',
  'preferences.adoptTitle':
    'Escribe «{key}»: {factory} en el archivo.\n\n' +
    'En un dispositivo que nunca ha ajustado esto, ya es lo que aplica: escribirlo no ' +
    'cambia entonces nada inmediato, y pone el ajuste a salvo de una actualización de ' +
    'XCTrack que cambiara su valor de fábrica.\n\n' +
    'En un dispositivo que ya lo ha ajustado, la importación escribirá este valor en lugar ' +
    'del suyo: mientras el archivo no diga nada, conserva el suyo (medido en el AIR³, ' +
    'importación «Reemplazar todo»).',

  'preferences.dropLabel': 'Quitar del archivo',
  'preferences.dropTitle':
    'Quita «{key}» del archivo: ya no dirá nada de este ajuste.\n\n' +
    '{absent}\n\n' +
    'Lo que cambia para el dispositivo que nunca lo ha tocado: el valor deja de estar fijo ' +
    'y seguirá las actualizaciones de XCTrack. Es exactamente lo contrario de «Escribir ' +
    'este valor».',

  'preferences.restoreLabel': 'Restablecer el valor de fábrica',
  'preferences.restoreTitle':
    'Escribe «{key}»: {factory} en el archivo, en lugar de {current}.\n\n' +
    'Este gesto no es como los otros dos de esta página: aquellos solo tocan un ajuste que ' +
    'usted nunca ha elegido, este sustituye el suyo por el que XCTrack pone en una ' +
    'instalación nueva.{caveat}',
  'preferences.restoreNote':
    '«{factory}» de fábrica, «{current}» en este archivo. Restablecer cambia lo que hace ' +
    'el dispositivo en vuelo.{caveat}',
  'preferences.restoreCaveatIndicative':
    ' Este valor de fábrica viene del catálogo de XCTrack {version}, que no es la versión ' +
    'de la que viene este archivo: compruebe que es realmente el que hay que restablecer.',
  'preferences.restoreCaveatUnstated':
    ' Este valor de fábrica viene del catálogo de XCTrack {version} y aquí no se conoce la ' +
    'versión de este archivo: compruebe que es realmente el que hay que restablecer.',

  'preferences.unitListNote':
    'Esta lista se midió en {device}, XCTrack {version}: {method}. A tener en cuenta: {caveats}.',
  'preferences.freeListTitle':
    'XCTrack rellena esta lista en el código: nuestro muestreo de las versiones no da sus ' +
    'valores y no se han medido en el dispositivo. Este editor no propone, pues, ninguna ' +
    'opción, y el valor se escribe tal como usted lo teclea.',

  'preferences.summaryCount': 'Ha ajustado {custom} de los {settings} que ofrece XCTrack.',

  'preferences.detailDefault': {
    one: '{count} en el valor de fábrica',
    other: '{count} en el valor de fábrica'
  },
  'preferences.detailAbsent': {
    one: '{count} ausente del archivo',
    other: '{count} ausentes del archivo'
  },
  'preferences.detailUnwritten': {
    one: '{count} nunca ajustado',
    other: '{count} nunca ajustados'
  },
  'preferences.detailUndecidable': {
    one: '{count} sin valor de fábrica conocido',
    other: '{count} sin valor de fábrica conocido'
  },
  'preferences.detailConflict': {
    one: '{count} con valor de fábrica incierto',
    other: '{count} con valor de fábrica incierto'
  },
  'preferences.restUnlabelled': {
    one: '{count} sin etiqueta en la aplicación',
    other: '{count} sin etiqueta en la aplicación'
  },
  'preferences.restState': {
    one: '{count} memorizada por la aplicación',
    other: '{count} memorizadas por la aplicación'
  },
  'preferences.restUnknown': {
    one: '{count} desconocida para este catálogo',
    other: '{count} desconocidas para este catálogo'
  },

  'preferences.fileCarries': 'Este archivo contiene {lines} en total.',
  'preferences.fileCarriesWithRest': {
    one: 'Este archivo contiene {lines} en total: {count} no corresponde a ningún ajuste ' +
      'de una pantalla del dispositivo — {rest}. Está listada al final de la página.',
    other: 'Este archivo contiene {lines} en total: {count} no corresponden a ningún ' +
      'ajuste de una pantalla del dispositivo — {rest}. Están listadas al final de la página.'
  },

  'preferences.catalogReference':
    'Etiquetas y valores de fábrica extraídos de XCTrack {version}',
  'preferences.catalogNoteExact': '{reference} — la versión misma de este archivo.{fallback}',
  'preferences.catalogNoteUnstated':
    '{reference}. Este archivo no dice de qué versión viene: las etiquetas y los valores ' +
    'de fábrica cambian de una versión a otra, así que la lectura es orientativa.{fallback}',
  'preferences.catalogNoteIndicative':
    '{reference}. Este archivo viene de {file}: las etiquetas y los valores de fábrica ' +
    'cambian de una versión a otra, así que la lectura es orientativa.{fallback}',
  'preferences.catalogFallback': {
    one: ' Falta {count} texto en este idioma y se muestra en inglés.',
    other: ' Faltan {count} textos en este idioma y se muestran en inglés.'
  },
  'preferences.fileVersionNumber': 'la versión {code}',
  'preferences.fileVersionNamed': 'la versión {name}',

  'preferences.personalMarkTitle': 'Dato personal — {reason} ({basis}).',
  'preferences.privacyNone':
    'No se ha detectado ningún dato personal en las preferencias de este archivo',
  'preferences.privacyHead': {
    one: '{count} ajuste lleva un dato personal · {filled} rellenados, {empty} vacíos',
    other: '{count} ajustes llevan un dato personal · {filled} rellenados, {empty} vacíos'
  },
  'preferences.privacyLayoutNone':
    'Esta página solo cuenta las preferencias. La disposición de este archivo no lleva ' +
    'ningún texto escrito por usted — es el cuadro «Guardar» el que los inventaría, y son ' +
    'los únicos que se irían con una exportación «pages».',
  'preferences.privacyLayoutSome': {
    one: 'Esta página solo cuenta las preferencias. La disposición lleva {count} más — ' +
      'textos escritos por usted en los widgets — y son los únicos que se van con una ' +
      'exportación «pages». El cuadro «Guardar» los muestra uno por uno.',
    other: 'Esta página solo cuenta las preferencias. La disposición lleva {count} más — ' +
      'textos escritos por usted en los widgets — y son los únicos que se van con una ' +
      'exportación «pages». El cuadro «Guardar» los muestra uno por uno.'
  },
  'preferences.privacyItemWhy': '{kind} — {reason}',
  'preferences.privacyNavigationState':
    '«Navigation.State» es una preferencia pública de XCTrack: viaja con el archivo. Lleva ' +
    'la tarea en curso — puntos de viraje y coordenadas —, es decir {value} aquí. Esta ' +
    'página nunca muestra su contenido; un archivo transmitido, en cambio, se lo lleva.',
  'preferences.privacyGuessPosition':
    'XCTrack guarda también una posición supuesta del dispositivo («App.GuessLatitude», ' +
    '«App.GuessLongitude») — en la práctica, el domicilio. Son internas al dispositivo: ' +
    'ninguna exportación las lleva, y este archivo no las lleva.',
  'preferences.privacySecureKeys': {
    one: 'XCTrack cifra las credenciales de cuenta (XContest, SkySight, SafeSky…): el ' +
      '{count} ajuste afectado no sale nunca del dispositivo, y ninguna exportación lo lleva.',
    other: 'XCTrack cifra las credenciales de cuenta (XContest, SkySight, SafeSky…): los ' +
      '{count} ajustes afectados no salen nunca del dispositivo, y ninguna exportación los ' +
      'lleva.'
  },
  'preferences.privacyJudged': {
    one: 'La {count} línea de este archivo no está señalada por el propio XCTrack: los ' +
      'únicos ajustes cuya sensibilidad declara son los que cifra, y esos no se exportan. ' +
      'Este inventario es, pues, un juicio de este editor, y cada línea expone el suyo.',
    other: 'Ninguna de las {count} líneas de este archivo está señalada por el propio ' +
      'XCTrack: los únicos ajustes cuya sensibilidad declara son los que cifra, y esos no ' +
      'se exportan. Este inventario es, pues, un juicio de este editor, y cada línea expone ' +
      'el suyo.'
  },
  'preferences.filledPersonal': {
    one: 'Acaba de rellenar {count} dato personal — {keys}. Viajará con este archivo: el ' +
      'cuadro «Guardar» le deja elegir lo que se va.',
    other: 'Acaba de rellenar {count} datos personales — {keys}. Viajarán con este ' +
      'archivo: el cuadro «Guardar» le deja elegir lo que se va.'
  },

  'preferences.leftoverTitleUnlabelled': 'Ajustes sin etiqueta',
  'preferences.leftoverTitleState': 'Lo que la aplicación ha memorizado (no son ajustes)',
  'preferences.leftoverTitleUnknown': 'Líneas que este catálogo no conoce',
  'preferences.leftoverLeadUnlabelled':
    'Son ajustes de verdad, pero XCTrack los configura en pantallas construidas en el ' +
    'código, donde la línea del archivo ya no está unida a su etiqueta: la aplicación no ' +
    'los nombra en ningún sitio que podamos leer. El valor y la comparación con el valor ' +
    'de fábrica siguen siendo justos — lo que falta es el nombre, no el sentido.',
  'preferences.leftoverLeadState':
    'Estas líneas no ajustan nada: registran el estado de la aplicación. Esta página da su ' +
    'naturaleza y su tamaño, nunca su contenido.',
  'preferences.leftoverLeadUnknown':
    'Este editor no sabe qué ajustan estas líneas: las escribió una versión de XCTrack ' +
    'distinta de aquella de la que habla el catálogo. No son ni suprimibles ni ' +
    'despreciables — simplemente desconocidas, y conservadas tal cual.',
  'preferences.noFamily': '(sin familia)',

  'preferences.emptyTitle': 'Este archivo no lleva ninguna preferencia general.',
  'preferences.emptyText':
    'Solo las exportaciones «backup» se llevan los ajustes de la aplicación. Una ' +
    'exportación «pages» solo describe las páginas y sus widgets: abrir una copia de ' +
    'seguridad completa del dispositivo es la única forma de ver esos ajustes.',
  'preferences.emptyIntact':
    'Aun así no se pierde nada: lo que esta página no muestra, este archivo no lo ' +
    'contiene, y una nueva exportación lo dejará tal cual.',
  'preferences.emptyPersonalWarning': {
    one: 'Atención: «ninguna preferencia» no quiere decir «nada personal». La disposición ' +
      'de este archivo lleva {count} texto escrito por usted en sus widgets — un título, ' +
      'un nombre, un número de teléfono —, y una exportación «pages» se los lleva. El ' +
      'cuadro «Guardar» los muestra uno por uno.',
    other: 'Atención: «ninguna preferencia» no quiere decir «nada personal». La ' +
      'disposición de este archivo lleva {count} textos escritos por usted en sus widgets ' +
      '— un título, un nombre, un número de teléfono —, y una exportación «pages» se los ' +
      'lleva. El cuadro «Guardar» los muestra uno por uno.'
  },

  'preferences.pageTitle': 'Ajustes generales',
  'preferences.pageSubtitle': 'Lo que XCTrack ajusta fuera de las páginas de widgets',
  'preferences.pageSubtitleNamed':
    '{file} — lo que XCTrack ajusta fuera de las páginas de widgets',

  'preferences.labelsFromFile':
    'Los nombres de ajustes de abajo son los de XCTrack y aparecen en {language}: ' +
    'siguen el archivo abierto, nunca el idioma de esta interfaz. Es intencionado: ' +
    'son las palabras que volverá a encontrar en su instrumento.',

  'preferences.menuLead':
    'Las pantallas son las del dispositivo, en el orden de su menú de ajustes.',
  'preferences.menuLeadEditable':
    'Las pantallas son las del dispositivo, en el orden de su menú de ajustes. Un ajuste ' +
    'modificado se escribe en el documento de inmediato; «Deshacer» lo revierte, y nada ' +
    'sale al disco antes de «Guardar».',
  'preferences.entryNothing': 'Nada de esta pantalla aparece en este archivo.',
  'preferences.neverExported': {
    one: '{count} ajuste de esta pantalla no sale nunca del dispositivo: XCTrack no lo ' +
      'exporta.',
    other: '{count} ajustes de esta pantalla no salen nunca del dispositivo: XCTrack no ' +
      'los exporta.'
  },

  'preferences.tallyNone':
    'Este archivo lleva {lines}: ninguna tiene etiqueta, todas están listadas al final de ' +
    'la página bajo su nombre en bruto.',
  'preferences.tallySome':
    'Este archivo lleva {lines}, de las cuales {named}; {listed} al final de la página ' +
    'bajo su nombre en bruto.',
  'preferences.tallyNamed': {
    one: 'una sola tiene etiqueta y se muestra en otra pantalla',
    other: '{count} tienen etiqueta y se muestran en otra pantalla'
  },
  'preferences.tallyListed': {
    one: '{count} está listada',
    other: '{count} están listadas'
  },

  'preferences.menuNoteAirspaces':
    'XCTrack construye esta pantalla en el código: el ajuste queda ahí lejos de su ' +
    'etiqueta, y la aplicación no lo nombra, pues, en ningún sitio que podamos leer. Los ' +
    'ajustes que escribe sí están en el archivo — se reúnen más abajo, bajo «Ajustes sin ' +
    'etiqueta» y «Lo que la aplicación ha memorizado».',
  'preferences.menuNoteMaps':
    'Pantalla construida en el código, también sin etiqueta aprovechable. Las líneas ' +
    '«Mapsforge» del archivo se reúnen más abajo.',
  'preferences.menuNoteEditPageSet':
    'Esta línea abre el editor de páginas y de widgets — es el resto de este editor el que ' +
    'los muestra, no esta página.',
  'preferences.menuNoteEventMapping':
    'Las acciones automáticas se registran en bloque en «EventMappingJs»: un pequeño ' +
    'programa escrito de una sola vez, y no una lista de ajustes.',
  'preferences.menuNotePro':
    'La suscripción se gestiona en la cuenta XContest, no en el archivo de configuración.',
  'preferences.menuNoteSensors':
    'Esta pantalla sirve para emparejar los sensores. Lo que registra cabe en una sola ' +
    'línea, «Sensors.Configuration», reunida más abajo con el resto de lo que la ' +
    'aplicación ha memorizado.',
  'preferences.menuNoteShareConfig':
    'Esta pantalla solo lleva dos órdenes — exportar, importar una configuración. No tiene ' +
    'ningún ajuste que retener.',
  'preferences.menuNoteAbout':
    'Esta pantalla solo muestra información sobre la aplicación: versión, registro de ' +
    'cambios, menciones. Nada que se ajuste.',
  'preferences.menuNoteInfoOnly': 'Línea informativa sin ajuste.',

  'preferences.filterPlaceholder': 'Filtrar los ajustes',
  'preferences.onlyMine': 'Solo lo que he ajustado',
  'preferences.showAll': 'Mostrar todo',
  'preferences.maskPersonal': 'Ocultar los valores personales',
  'preferences.showPersonal': 'Mostrar los valores personales',
  'preferences.close': 'Cerrar'
}

export default preferences
