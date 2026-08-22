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
  },

  /* ------------ sharing.ts — was was ersetzt, und warum. Siehe `fr/model.ts`. */

  'sharingReason.titletext': 'Eigener Titel des Widgets: ersetzt durch einen neutralen, ' +
    'nummerierten Titel, damit das Seitenlayout und die Unterscheidung zwischen den ' +
    'Widgets erhalten bleiben.',
  'sharingReason.text': 'Vollständiger Inhalt eines Freitext-Widgets: ersetzt durch einen ' +
    'kurzen Text, damit der Rahmen gefüllt bleibt, ohne überzulaufen.',
  'sharingReason.fullName': 'Name einer Person, die auf einer Anruftaste hinterlegt ist: ' +
    'ersetzt durch eine neutrale Beschriftung.',
  'sharingReason.phoneNumber': 'Telefonnummer: ersetzt durch eine Nummer im selben Format, ' +
    'die sich aber nicht wählen lässt — „00“ ist keine Ländervorwahl.',
  'sharingReason.url': 'Eingegebene Webadresse, die ein Token oder eine Kennung enthalten ' +
    'kann: ersetzt durch eine Adresse der reservierten Domäne „.invalid“, die nie ' +
    'aufgelöst wird.',
  'sharingReason.title': 'Beschriftung einer Starttaste: ersetzt durch eine neutrale, ' +
    'nummerierte Beschriftung.',
  'sharingReason.name': 'Name der Anwendung, die eine Starttaste öffnet: ersetzt durch eine ' +
    'neutrale, nummerierte Beschriftung.',
  'sharingReason.action': 'Android-Aktion einer Starttaste, die ein vollständiger URI sein ' +
    'kann: ersetzt durch die interne Testaktion, die XCTrack auf eine neue Taste setzt.',
  'sharingReason.filter': 'Eingegebener Protokollfilter: geleert, also „kein Filter“, der ' +
    'neutrale Wert der Einstellung.',
  'sharingReason.suffix': 'Text hinter dem angezeigten Wert: geleert, also „kein Suffix“, ' +
    'der neutrale Wert der Einstellung.',
  'sharingReason.event': 'Eingegebener Ereignisname: ersetzt durch das Testereignis, das ' +
    'XCTrack auf ein neues Widget setzt.',
  'sharingReason.unknownFreeText': 'Freitext ohne eigene Regel: vorsichtshalber durch einen ' +
    'neutralen Text ersetzt.',

  'sharingReason.credential': 'Kennung oder Passwort. Die ganze Zeile wird entfernt: eine ' +
    'Kennung hat keinen neutralen Wert, und eine erfundene ließe die Anmeldung der ' +
    'empfangenden Person scheitern, statt sie einfach leer zu lassen.',
  'sharingReason.activeLookDevice': 'Die mit Ihrem Gerät gekoppelte ActiveLook-Brille. Auf ' +
    'den in XCTrack erhobenen Werkswert zurückgesetzt — die leere Zeichenkette, also „keine ' +
    'Brille“.',
  'sharingReason.activeLookName': 'Der Name Ihrer ActiveLook-Brille. Auf den in XCTrack ' +
    'erhobenen Werkswert zurückgesetzt — die leere Zeichenkette, also „keine Brille“.',
  'sharingReason.airspaceFiles': 'Die Luftraumdateien, die Sie geladen haben. Die ganze ' +
    'Zeile wird entfernt: das sind Dateien Ihres Geräts, die die empfangende Person nicht hat.',
  'sharingReason.guessedPosition': 'Die vermutete Position Ihres Geräts — in der Praxis Ihr ' +
    'Zuhause. Die ganze Zeile wird entfernt: keine Ersatzkoordinate wäre ehrlich.',
  'sharingReason.speechText': 'Ein Text, den Sie für die Sprachausgabe eingegeben haben. ' +
    'Ersetzt durch einen kurzen, neutralen Text, damit die Einstellung gefüllt bleibt.',
  'sharingReason.gliderCategory': 'Die Klasse Ihres Schirms. Bleibt erhalten: das ist eine ' +
    'Flugeinstellung, sie trägt weder Namen noch Nummer noch Adresse, und oft ist gerade ' +
    'sie das, was man teilen möchte.',
  'sharingReason.hangGliderCategory': 'Die Klasse Ihres Drachens. Bleibt erhalten: das ist ' +
    'eine Flugeinstellung, sie trägt weder Namen noch Nummer noch Adresse, und oft ist ' +
    'gerade sie das, was man teilen möchte.',
  'sharingReason.gliderName': 'Der Name Ihres Schirms — Modell und Größe genügen, um Sie in ' +
    'einem Verein zu erkennen. Ersetzt durch ein neutrales Wort, damit die Einstellung ' +
    'gefüllt bleibt.',
  'sharingReason.gliderModel': 'Das Modell Ihres Schirms. Auf den in XCTrack erhobenen ' +
    'Werkswert zurückgesetzt — die leere Zeichenkette, also „kein Modell gewählt“.',
  'sharingReason.gliderProducer': 'Der Hersteller Ihres Schirms. Auf den in XCTrack ' +
    'erhobenen Werkswert zurückgesetzt — die leere Zeichenkette, also „kein Hersteller ' +
    'gewählt“.',
  'sharingReason.livetrackChoice': 'Eine Livetrack-Übertragungsentscheidung, die Sie ' +
    'getroffen haben. Bleibt erhalten: das ist eine Einstellung, keine Angabe — sie trägt ' +
    'weder Namen noch Kontokennung.',
  'sharingReason.quickMessages': 'Die Kurznachrichten, die Sie für das Livetracking ' +
    'geschrieben haben. Die ganze Zeile wird entfernt: das ist eine Liste Ihrer eigenen ' +
    'Sätze, und die empfangende Person schreibt ihre eigenen.',
  'sharingReason.offlineMaps': 'Die auf Ihrem Gerät installierten Offline-Karten. Die ganze ' +
    'Zeile wird entfernt: das sind Dateien Ihres Geräts, die die empfangende Person nicht hat.',
  'sharingReason.mapTheme': 'Das Kartenthema, das Sie installiert haben, bezeichnet durch ' +
    'seinen Pfad. Auf den in XCTrack erhobenen Werkswert zurückgesetzt, „DEFAULT“: die ' +
    'Karte der empfangenden Person wird gezeichnet, statt eine Datei zu suchen, die sie ' +
    'nicht hat.',
  'sharingReason.navigationState': 'Ihre laufende Aufgabe, samt Wendepunkten und ' +
    'Koordinaten. Die ganze Zeile wird entfernt: ihr Schema ändert sich mit jeder ' +
    'XCTrack-Version, und eine Ersatzstruktur wäre eine Form, die die Anwendung nie schreibt.',
  'sharingReason.waypointFiles': 'Ihre Wegpunktdateien — ihr Name benennt oft den ' +
    'Wettbewerb, an dem Sie teilnehmen. Die ganze Zeile wird entfernt: das sind Dateien ' +
    'Ihres Geräts, die die empfangende Person nicht hat.',
  'sharingReason.pilotName': 'Ihr Name, genau wie eingegeben. Ersetzt durch ein neutrales ' +
    'Wort statt geleert: XCTrack zeigt ihn an und sendet ihn mit dem Livetracking, und ein ' +
    'leerer Name ist keine Lage, die man von ihm kennt.',
  'sharingReason.derivedRegistration': 'Das abgeleitete Kennzeichen Ihres Luftfahrzeugs. ' +
    'Die ganze Zeile wird entfernt: ein Kennzeichen benennt ein Luftfahrzeug und seinen ' +
    'Halter, und ein erfundenes würde ein anderes benennen.',
  'sharingReason.registration': 'Das Kennzeichen Ihres Luftfahrzeugs. Die ganze Zeile wird ' +
    'entfernt: ein Kennzeichen benennt ein Luftfahrzeug und seinen Halter, und ein ' +
    'erfundenes würde ein anderes benennen.',
  'sharingReason.sensors': 'Ihre gekoppelten Sensoren, samt Bluetooth-Adressen. Die ganze ' +
    'Zeile wird entfernt: die empfangende Person koppelt ihre eigenen, die ohnehin die ' +
    'einzigen sind, die sie nutzen kann.',
  'sharingReason.lastNetLocation': 'Die letzte Position, mit der das QNH abgefragt wurde. ' +
    'Auf den in XCTrack erhobenen Werkswert zurückgesetzt — die leere Zeichenkette, also ' +
    '„keine Position“.',
  'sharingReason.replayFile': 'Eine Ihrer Track-Dateien. Auf den in XCTrack erhobenen ' +
    'Werkswert zurückgesetzt — die leere Zeichenkette, also „kein Track zum Abspielen“.',
  'sharingReason.unknownPreference': 'Persönliche Einstellung ohne eigene Regel: die ganze ' +
    'Zeile wird vorsichtshalber entfernt.',
  'sharingReason.shapeMismatch': 'Diese Einstellung trägt nicht den Text, den ihre Regel ' +
    'erwartet hat — ihre Form hat sich seit der Erhebung geändert. Die ganze Zeile wird ' +
    'entfernt: ein Wort anstelle einer Struktur zu schreiben ergäbe eine Datei, die XCTrack ' +
    'ablehnen würde.',
  'sharingReason.emptySlot': 'Der Platz ist in der Datei vorhanden, trägt aber nichts: es ' +
    'gibt nichts zu ersetzen, und die Zeile bleibt, wie sie ist.',

  /* --------- was persönlich aussieht, ohne angegeben zu sein: der Hinweis */

  'suspectClue.url': 'Dieser Text hat die Form einer Webadresse, die ein Token oder eine ' +
    'Kennung enthalten kann.',
  'suspectClue.mail': 'Dieser Text hat die Form einer E-Mail-Adresse.',
  'suspectClue.path': 'Dieser Text hat die Form eines Dateipfads auf Ihrem Gerät.',
  'suspectClue.hardware': 'Dieser Text hat die Form einer Bluetooth- oder Netzwerkadresse ' +
    'eines Geräts.',
  'suspectClue.phone': 'Dieser Text hat die Form einer Telefonnummer.',
  'suspectClue.letters': 'Dieser Text enthält Buchstaben mit Akzenten oder Zeichen ' +
    'außerhalb des einfachen lateinischen Alphabets: er wurde geschrieben, nicht aus einer ' +
    'Liste gewählt.',
  'suspectClue.sentence': 'Dieser Text enthält ein Leerzeichen: er liest sich wie ein Satz, ' +
    'nicht wie ein Wert, den man aus einer Liste wählt.'
}

export default model
