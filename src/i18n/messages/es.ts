import type { MessageCatalog } from '../catalog'

/**
 * L'espagnol. Il partage avec le français la catégorie de pluriel `many` au million, sans
 * qu'aucune forme change pour autant — d'où le repli sur `other` dans `pluralForm`.
 *
 * Il met souvent le verbe en tête là où le français le met après le nombre : « falta 1
 * línea » / « faltan 2 líneas ». C'est la démonstration la plus nette que les 23 accords
 * écrits en ternaire (`${n} absente${n > 1 ? 's' : ''}`) ne survivent pas à la traduction :
 * ce n'est pas un `s` qui change, c'est le premier mot de la phrase.
 *
 * Il ne sépare pas les milliers sous 10 000 : `Intl` écrit « 1059 » et non « 1 059 ».
 * C'est la règle de la langue, pas un défaut de formatage.
 *
 * ⚠️ Ce catalogue **n'emploie pas** le mot *gadget* ni *widget* : la chrome espagnole de
 * XCTrack n'a pas été mesurée. Voir l'en-tête de `messages/de.ts`.
 */
const es: MessageCatalog = {
  'action.redo': 'Rehacer',
  'action.redoNothing': 'Nada que rehacer',
  'action.redoNamed': 'Rehacer: {what}',

  'zoom.resetTo': 'Zoom {level}',

  'library.entryRestored': '«{name}» se ha vuelto a colocar.',
  'library.entryRestoredBeside': '«{name}» se ha vuelto a colocar al lado: su identificador ya estaba ocupado.',

  'provenance.apkSurvey': 'nuestro muestreo de las versiones de XCTrack',
  'provenance.factoryValueCatalogue': 'el catálogo de los valores de fábrica',
  'provenance.measuredOnDevice': 'medido en el dispositivo',
  'provenance.declaredByFile': 'Lo que declara el archivo',
  'provenance.assumedByEditor': 'Lo que supone este editor',

  'preferences.settingCount': {
    one: '{count} ajuste',
    other: '{count} ajustes'
  },

  'preferences.absentFromFile': {
    one: 'falta {count} línea en el archivo',
    other: 'faltan {count} líneas en el archivo'
  },

  'pages.hiddenOffFlight': {
    one: '{count} página está oculta fuera del contexto de vuelo: en tierra, el dispositivo solo muestra {shown} de {total}.',
    other: '{count} páginas están ocultas fuera del contexto de vuelo: en tierra, el dispositivo solo muestra {shown} de {total}.'
  },

  'library.entryCount': {
    one: '{count} configuración guardada',
    other: '{count} configuraciones guardadas'
  },

  'versions.publishedCount': {
    one: '{count} versión publicada',
    other: '{count} versiones publicadas'
  },

  'library.storedLine': '«{name}» está guardada: {size}, {when}.',

  'common.unknownDate': 'fecha desconocida',

  'preferences.setRatio': 'Ha ajustado {set} de los {offered} ajustes que ofrece XCTrack, es decir {share}.',

  'device.screenSize': '{width} × {height}',

  'factoryValue.same': 'VALOR DE FÁBRICA',
  'factoryValue.setByYou': 'AJUSTADO POR USTED',
  'factoryValue.uncertain': 'VALOR DE FÁBRICA INCIERTO',
  'factoryValue.neverSet': 'NUNCA AJUSTADO'
}

export default es
