import type { DomainCatalog } from '../../domains'

/** La prose hors interface — voir `fr/model.ts`. */
const model: DomainCatalog<'model'> = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'Identität',
  'personalKind.credential': 'Zugangsdaten',
  'personalKind.contact': 'Kontakt',
  'personalKind.device': 'Gerät',
  'personalKind.location': 'Position',
  'personalKind.file': 'Datei',
  'personalKind.freeText': 'freier Text',
  'personalKind.equipment': 'Ausrüstung',
  'personalKind.sharing': 'Weitergabe',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack gibt es selbst an',
  'personalBasis.inputType': 'XCTrack gibt es als Punkte ein, wie ein Passwort',
  'personalBasis.declared': 'das ist unsere Einschätzung, nicht die von XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Anordnung — geht mit den Seiten mit',
  'personalHome.preferences': 'Einstellungen — bleiben bei Ihnen in einem „pages“-Export',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'eigener Titel eines Widgets, von Ihnen geschrieben',
  'personalReason.text': 'gesamter Inhalt eines Freitext-Widgets, von Ihnen geschrieben',
  'personalReason.fullName': 'Name einer Person, die auf einer Anruftaste gespeichert ist',
  'personalReason.phoneNumber': 'Telefonnummer, die auf einer Anruftaste gespeichert ist',
  'personalReason.url': 'eingegebene Webadresse, die ein Token oder eine Kennung enthalten kann',
  'personalReason.title': 'Beschriftung einer Starttaste, von Ihnen geschrieben',
  'personalReason.name': 'Name der Anwendung, die eine Starttaste aufruft',
  'personalReason.action': 'Android-Aktion einer Starttaste, die ein vollständiger URI sein kann',
  'personalReason.filter': 'Protokollfilter, den Sie eingegeben haben',
  'personalReason.suffix': 'Text hinter dem angezeigten Wert, von Ihnen geschrieben',
  'personalReason.event': 'Ereignisname, den Sie eingegeben haben',
  'personalReason.unknown': 'freier Text ohne eigene Regel: vorsorglich als persönlich behandelt',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'Feld vorhanden, aber leer',

  'personal.hiddenStructure': {
    one: 'Struktur mit {count} Eintrag, nicht angezeigt',
    other: 'Struktur mit {count} Einträgen, nicht angezeigt'
  },

  'personal.caveat': {
    one: 'Diese Bestandsaufnahme umfasst die XCTrack {version} bekannten Einstellungen: {count} Einstellung und elf Freitextfelder der Widgets. Das Format ändert sich mit jeder Version — eine leere Bestandsaufnahme beweist daher keine Abwesenheit.',
    other: 'Diese Bestandsaufnahme umfasst die XCTrack {version} bekannten Einstellungen: {count} Einstellungen und elf Freitextfelder der Widgets. Das Format ändert sich mit jeder Version — eine leere Bestandsaufnahme beweist daher keine Abwesenheit.'
  }
}

export default model
