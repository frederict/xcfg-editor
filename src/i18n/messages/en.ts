import type { MessageCatalog } from '../catalog'

/**
 * L'anglais. C'est **la langue détectrice** : elle est la première à traduire, parce
 * qu'elle force à trancher les collisions du français — *default* ou *fault*, *redo* ou
 * *reset* ou *restore*, *survey* ou *catalogue* ou *measured*. Les trois autres langues se
 * traduisent ensuite sur un vocabulaire déjà arrêté.
 *
 * Deux pièges relevés et évités ici :
 *
 * - **« réglages réglés »** devient *settings set* si on traduit mot à mot. La phrase est
 *   donc reconstruite : *You have set 30 of the 93 settings XCTrack offers*.
 * - **« rang »** ne se dit pas *rank*, qui ferait croire à un classement par mérite ;
 *   c'est *layer* ou *stacking order*. Aucun message de ce socle ne le porte encore, mais
 *   la décision est prise.
 *
 * À zéro, l'anglais met le pluriel : « 0 settings ». C'est ce que les huit copies de
 * `plural()` du dépôt, écrites en `count > 1`, auraient rendu faux.
 */
const en: MessageCatalog = {
  'action.redo': 'Redo',
  'action.redoNothing': 'Nothing to redo',
  'action.redoNamed': 'Redo: {what}',

  'zoom.resetTo': 'Zoom {level}',

  'library.entryRestored': '“{name}” has been put back.',
  'library.entryRestoredBeside': '“{name}” has been put back alongside: its identifier was already taken.',

  'provenance.apkSurvey': 'our survey of XCTrack releases',
  'provenance.factoryValueCatalogue': 'the catalogue of factory values',
  'provenance.measuredOnDevice': 'measured on the device',
  'provenance.declaredByFile': 'What the file declares',
  'provenance.assumedByEditor': 'What this editor assumes',

  'preferences.settingCount': {
    one: '{count} setting',
    other: '{count} settings'
  },

  'preferences.absentFromFile': {
    one: '{count} line is missing from the file',
    other: '{count} lines are missing from the file'
  },

  'pages.hiddenOffFlight': {
    one: '{count} page is hidden outside flight context: on the ground, the device shows only {shown} of {total}.',
    other: '{count} pages are hidden outside flight context: on the ground, the device shows only {shown} of {total}.'
  },

  'library.entryCount': {
    one: '{count} stored configuration',
    other: '{count} stored configurations'
  },

  'versions.publishedCount': {
    one: '{count} published release',
    other: '{count} published releases'
  },

  'library.storedLine': '“{name}” is stored — {size}, {when}.',

  'common.unknownDate': 'date unknown',

  'preferences.setRatio': 'You have set {set} of the {offered} settings XCTrack offers, that is {share}.',

  'device.screenSize': '{width} × {height}',

  'factoryValue.same': 'FACTORY VALUE',
  'factoryValue.setByYou': 'SET BY YOU',
  'factoryValue.uncertain': 'FACTORY VALUE UNCERTAIN',
  'factoryValue.neverSet': 'NEVER SET'
}

export default en
