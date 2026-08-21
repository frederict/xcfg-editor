import type { MessageCatalog } from '../catalog'

/**
 * L'allemand. Deux traits le distinguent des quatre autres, et tous deux se voient dans
 * ce catalogue :
 *
 * - **Le verbe part à la fin** de la subordonnée : « … die das Gerät am Boden nicht
 *   anzeigt ». C'est la démonstration qu'une phrase composée ne peut pas être une
 *   concaténation de fragments — seuls des repères nommés déplaçables tiennent.
 * - **« rétablir » se sépare nettement** : *wiederholen* pour refaire ce qu'on a annulé,
 *   *zurücklegen* / *wiederherstellen* pour replacer une entrée. On emploie ici
 *   *Wiederholen* pour le premier, alors que Word dit *Wiederherstellen* : ce serait
 *   reproduire en allemand la collision exacte que l'on corrige en français.
 *
 * ⚠️ Ce catalogue **n'emploie pas** le mot *Gadget* ni *Widget*. La chrome française de
 * XCTrack dit « Gadget », mesuré sur l'AIR³ ; ce que dit sa chrome allemande, personne ne
 * l'a mesuré, et le catalogue de l'APK ne répond pas — il dit « widget » dans les cinq
 * langues, y compris en français où l'appareil dit « Gadget ». On n'invente pas un terme
 * technique dans une langue qu'on ne mesure pas.
 *
 * Point de gabarit, pas de traduction : « masquée hors vol » est compact en français et
 * demande une subordonnée en allemand. Ce badge, très présent à l'écran, y sera **deux
 * fois plus long**.
 */
const de: MessageCatalog = {
  'action.redo': 'Wiederholen',
  'action.redoNothing': 'Nichts zu wiederholen',
  'action.redoNamed': 'Wiederholen: {what}',

  'zoom.resetTo': 'Zoom {level}',

  'library.entryRestored': '„{name}“ wurde zurückgelegt.',
  'library.entryRestoredBeside': '„{name}“ wurde daneben zurückgelegt: die Kennung war bereits vergeben.',

  'provenance.apkSurvey': 'unsere Erhebung der XCTrack-Versionen',
  'provenance.factoryValueCatalogue': 'der Katalog der Werkswerte',
  'provenance.measuredOnDevice': 'am Gerät gemessen',
  'provenance.declaredByFile': 'Was die Datei angibt',
  'provenance.assumedByEditor': 'Was dieser Editor annimmt',

  'preferences.settingCount': {
    one: '{count} Einstellung',
    other: '{count} Einstellungen'
  },

  'preferences.absentFromFile': {
    one: '{count} Zeile fehlt in der Datei',
    other: '{count} Zeilen fehlen in der Datei'
  },

  'pages.hiddenOffFlight': {
    one: '{count} Seite wird außerhalb des Flugkontexts ausgeblendet: am Boden zeigt das Gerät nur {shown} von {total} an.',
    other: '{count} Seiten werden außerhalb des Flugkontexts ausgeblendet: am Boden zeigt das Gerät nur {shown} von {total} an.'
  },

  'library.entryCount': {
    one: '{count} abgelegte Konfiguration',
    other: '{count} abgelegte Konfigurationen'
  },

  'versions.publishedCount': {
    one: '{count} veröffentlichte Version',
    other: '{count} veröffentlichte Versionen'
  },

  'library.storedLine': '„{name}“ ist abgelegt — {size}, {when}.',

  'common.unknownDate': 'Datum unbekannt',

  'preferences.setRatio': 'Sie haben {set} der {offered} Einstellungen gesetzt, die XCTrack anbietet, also {share}.',

  'device.screenSize': '{width} × {height}',

  'factoryValue.same': 'WERKSWERT',
  'factoryValue.setByYou': 'VON IHNEN GESETZT',
  'factoryValue.uncertain': 'WERKSWERT UNSICHER',
  'factoryValue.neverSet': 'NIE GESETZT'
}

export default de
