import type { MessageCatalog } from '../catalog'

/**
 * Le néerlandais. Comme l'allemand, il renvoie le verbe en fin de subordonnée — même
 * démonstration, même exigence de repères nommés déplaçables.
 *
 * Il sépare naturellement deux mots que le français confond : *opnieuw doen* (refaire)
 * et *terugplaatsen* / *herstellen* (replacer). Il sépare aussi *opslaan* (enregistrer
 * dans un fichier) de *downloaden* (télécharger), là où le français dit « enregistrer »
 * pour les deux — c'est la troisième collision relevée, et elle n'apparaît pas encore
 * dans ce socle.
 *
 * ⚠️ Ce catalogue **n'emploie pas** le mot *gadget* ni *widget* : la chrome néerlandaise
 * de XCTrack n'a pas été mesurée. Voir l'en-tête de `messages/de.ts`.
 *
 * À zéro, le néerlandais met le pluriel : « 0 instellingen ».
 */
const nl: MessageCatalog = {
  'action.redo': 'Opnieuw',
  'action.redoNothing': 'Niets om opnieuw te doen',
  'action.redoNamed': 'Opnieuw: {what}',

  'zoom.resetTo': 'Zoom {level}',

  'library.entryRestored': '‘{name}’ is teruggeplaatst.',
  'library.entryRestoredBeside': '‘{name}’ is ernaast teruggeplaatst: de identificatie was al bezet.',

  'provenance.apkSurvey': 'onze inventarisatie van de XCTrack-versies',
  'provenance.factoryValueCatalogue': 'de catalogus van de fabriekswaarden',
  'provenance.measuredOnDevice': 'gemeten op het toestel',
  'provenance.declaredByFile': 'Wat het bestand aangeeft',
  'provenance.assumedByEditor': 'Wat deze editor veronderstelt',

  'preferences.settingCount': {
    one: '{count} instelling',
    other: '{count} instellingen'
  },

  'preferences.absentFromFile': {
    one: '{count} regel ontbreekt in het bestand',
    other: '{count} regels ontbreken in het bestand'
  },

  'pages.hiddenOffFlight': {
    one: '{count} pagina is buiten vluchtcontext verborgen: aan de grond toont het toestel er maar {shown} van {total}.',
    other: '{count} pagina’s zijn buiten vluchtcontext verborgen: aan de grond toont het toestel er maar {shown} van {total}.'
  },

  'library.entryCount': {
    one: '{count} opgeborgen configuratie',
    other: '{count} opgeborgen configuraties'
  },

  'versions.publishedCount': {
    one: '{count} uitgebrachte versie',
    other: '{count} uitgebrachte versies'
  },

  'library.storedLine': '‘{name}’ is opgeborgen — {size}, {when}.',

  'common.unknownDate': 'datum onbekend',

  'preferences.setRatio': 'U hebt {set} van de {offered} instellingen die XCTrack aanbiedt ingesteld, oftewel {share}.',

  'device.screenSize': '{width} × {height}',

  'factoryValue.same': 'FABRIEKSWAARDE',
  'factoryValue.setByYou': 'DOOR U INGESTELD',
  'factoryValue.uncertain': 'FABRIEKSWAARDE ONZEKER',
  'factoryValue.neverSet': 'NOOIT INGESTELD'
}

export default nl
