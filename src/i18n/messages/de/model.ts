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

  /* ---- warum eine **Einstellung** persönlich genannt wird — siehe `fr/model.ts` */

  'personalReason.pilotName': 'der Name des Piloten, genau wie eingegeben',
  'personalReason.gliderName': 'der Schirm des Piloten — Modell und Größe erkennen einen Piloten im Verein',
  'personalReason.gliderProducer': 'Hersteller des Schirms',
  'personalReason.gliderModel': 'Modell des Schirms',
  'personalReason.gliderCategory': 'Klasse des Schirms',
  'personalReason.hangGliderCategory': 'Klasse des Drachens',
  'personalReason.xcontestAccount': 'Kennung des XContest-Kontos',
  'personalReason.skysightAccount': 'Kennung des SkySight-Kontos',
  'personalReason.safeSkyAddress': 'Adresse des SafeSky-Kontos',
  'personalReason.registration': 'Kennzeichen des Luftfahrzeugs',
  'personalReason.derivedRegistration': 'abgeleitetes Kennzeichen',
  'personalReason.stableDeviceId': 'Gerätekennung, über die Flüge hinweg gleichbleibend',
  'personalReason.trackingDeviceId': 'Gerätekennung des Verfolgungsdienstes',
  'personalReason.quickMessages': 'von Ihnen geschriebene Nachrichten',
  'personalReason.sensors': 'die gekoppelten Sensoren, samt Bluetooth-Adressen',
  'personalReason.glasses': 'die gekoppelte Brille',
  'personalReason.glassesName': 'der Name der gekoppelten Brille',
  'personalReason.everysightKey': 'Zugangsschlüssel zum Everysight-SDK',
  'personalReason.waypointFiles': 'Wegpunktdateien — der Name benennt oft den Wettbewerb',
  'personalReason.navigationState': 'die laufende Aufgabe, samt Wendepunkten und Koordinaten',
  'personalReason.airspaceFiles': 'Luftraumdateien, die Sie geladen haben',
  'personalReason.offlineMaps': 'heruntergeladene Offline-Karten',
  'personalReason.mapTheme': 'Kartenthema, das Sie installiert haben',
  'personalReason.guessedPosition': 'die vermutete Position des Geräts — in der Praxis das Zuhause',
  'personalReason.lastNetLocation': 'die letzte Position, mit der das QNH abgefragt wurde',
  'personalReason.replayFile': 'eine der Track-Dateien des Piloten',
  'personalReason.speechText': 'Text, den Sie eingegeben haben',
  'personalReason.secureScope': 'Bereich SECURE: XCTrack legt sie zu den verschlüsselten Einstellungen',
  'personalReason.maskedField': 'verdecktes Eingabefeld (`textPassword`)',
  'personalReason.broadcastChoice': 'eine Übertragungsentscheidung von Ihnen, keine Angabe an sich',
  'personalReason.legacyRecord': 'von einer früheren Fassung dieses Editors erkannt, ' +
    'die ihre Art nicht angab. Laden Sie diesen Eintrag neu, um die vollständige ' +
    'Bestandsaufnahme zu erhalten.',

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
    'nicht wie ein Wert, den man aus einer Liste wählt.',

  /* ------------- die Vorflugkontrolle — siehe `fr/model.ts` zu den drei Annahmen */

  'inspection.landscape': 'Querformat',
  'inspection.portrait': 'Hochformat',
  'inspection.wherePage': '{orientation}, Seite {page}',
  'inspection.whereWidget': '{orientation}, Seite {page}, Widget {rank}',

  'ruleTitle.unreachableWidget': 'Widget nicht antippbar',
  'ruleTitle.pageNeverShown': 'Seite, die nie angezeigt wird',
  'ruleTitle.thermalPages': 'Mehrere Seiten mit Thermikassistent',
  'ruleTitle.widgetTooSmall': 'Widget vielleicht zu klein zum Ablesen',
  'ruleTitle.proWidget': 'Pro-Widget ohne angegebene Lizenz',
  'ruleTitle.roadMaps': 'Zwei Straßenkarten auf derselben Seite',
  'ruleTitle.obsoleteKey': 'Einstellung einer früheren Version',

  'ruleSummary.unreachableWidget': 'Kein Punkt dieser Widgets entgeht denen, die nach ihnen ' +
    'gezeichnet werden, und den Fingerdruck erhält das vorderste Widget. Sie können ' +
    'durchaus sichtbar bleiben: ein Widget ohne eigenen Hintergrund nimmt den Druck ' +
    'genauso auf wie ein deckendes.',
  'ruleSummary.pageNeverShown': 'XCTrack sagt es im eigenen Einstellungsdialog: eine Seite, ' +
    'bei der kein Navigationstyp angehakt ist, wird in keinem Flugkontext angezeigt.',
  'ruleSummary.thermalPages': 'Die Erhebung am Gerät sagt, dass die Klasse ' +
    '„Thermikassistent“ das Ziel des automatischen Umschaltens ist. Sie sagt nicht, welche ' +
    'gemeint ist, wenn eine Ausrichtung mehrere davon trägt: dieser Editor nimmt die letzte ' +
    'an, und diese Annahme wurde nie überprüft.',
  'ruleSummary.widgetTooSmall': 'Der Schwellenwert stammt aus der ISO 9241-303 und gilt für ' +
    'die tatsächliche physische Größe des gewählten Bildschirmmusters, nicht für Pixel: ein ' +
    'anderes Muster ändert diese Millimeter.',
  'ruleSummary.proWidget': 'Diese Datei gibt „proUpTo: 0“ an und trägt Widgets, die der ' +
    'Pro-Lizenz vorbehalten sind.',
  'ruleSummary.roadMaps': 'XCTrack warnt in den eigenen Einstellungen, dass wegen einer ' +
    'Beschränkung seiner Kartenbibliothek nur eine Straßenkarte pro Seite möglich ist.',
  'ruleSummary.obsoleteKey': 'Diese Widgets tragen Einstellungen, die eine frühere Version ' +
    'von XCTrack geschrieben hat. Vor dem Fliegen ist daran nichts zu tun; um zu erfahren, ' +
    'was eine bestimmte Version damit macht, und sie gegebenenfalls zu entfernen, siehe ' +
    '„Version und Kompatibilität“ im Menü „Datei“.',

  'inspection.unreachable': '„{name}“ ist vollständig von Widgets verdeckt, die nach ihm gesetzt wurden. Kein Klick erreicht es daher, weder hier noch im Bearbeitungsbildschirm von XCTrack, der ebenfalls dem vordersten Widget den Vorrang gibt. Es kann durchaus sichtbar bleiben — ein Widget, das nichts zeichnet, stiehlt den Fingerdruck genauso wie ein deckendes. Zum Einstellen gehen Sie über die Widget-Liste der Seite.',
  'inspection.unreachableToVerify': 'Was mit diesem Widget im Flug geschieht, wurde nicht ' +
    'beobachtet: XCTrack leitet den Fingerdruck möglicherweise anders weiter als beim ' +
    'Bearbeiten. Die Frage zählt vor allem für Aktionstasten, die nur dafür da sind, im ' +
    'Flug berührt zu werden.',

  'inspection.pageNeverShown': {
    one: 'Diese Seite ist für keinen Navigationstyp aktiviert: XCTrack wird sie in keinem Flugkontext anzeigen, und ihr {count} Widget wird nie dienen. Das ist die Einstellung „Deaktiviert“ am Gerät — gewollt oder vergessen. Nicht zu verwechseln mit einer Seite, die nur auf bestimmte Navigationen beschränkt ist, was eine normale Einstellung ist.',
    other: 'Diese Seite ist für keinen Navigationstyp aktiviert: XCTrack wird sie in keinem Flugkontext anzeigen, und ihre {count} Widgets werden nie dienen. Das ist die Einstellung „Deaktiviert“ am Gerät — gewollt oder vergessen. Nicht zu verwechseln mit einer Seite, die nur auf bestimmte Navigationen beschränkt ist, was eine normale Einstellung ist.'
  },

  'inspection.thermalPages': 'Diese Ausrichtung trägt mehrere Seiten mit Thermikassistent, und XCTrack zielt beim selbsttätigen Umschalten im Kreisflug nur auf eine davon. Auf welche? Dieser Editor nimmt die letzte an, hier Seite {target} — ohne es überprüft zu haben. Diese hier bleibt jedenfalls über „nächste Seite“ erreichbar.',
  'inspection.thermalPagesToVerify': 'Es wurde nichts darüber beobachtet, was XCTrack tut, ' +
    'wenn mehrere Seiten mit Thermikassistent nebeneinander bestehen: keine Datei der ' +
    'Erhebung trägt zwei davon. Eine am Gerät zu verdoppeln, in den Kreisflug zu gehen und ' +
    'zu schauen, welche Seite erscheint, würde die Frage in einem Flug klären.',

  'inspection.tooSmall': '„{name}“ ist auf diesem Gerät nur {height} hoch. Wenn der angezeigte Text die Hälfte davon einnimmt, misst er etwa {value} — unter den {minimum}, die die ISO 9241-303 als absolutes Mindestmaß auf {distance} cm angibt. Wird er auf Armeslänge, in praller Sonne, mit Handschuhen noch lesbar sein? Am Gerät zu prüfen.',
  'inspection.tooSmallToVerify': 'Der Anteil der Widget-Höhe, den das Zeichen des Werts tatsächlich einnimmt (hier mit {ratio} angenommen), wurde nur an einem einzigen Widget und einer einzigen Bildschirmaufnahme gemessen. Die Aufnahmen der Tafel mit den 75 Widgets würden genügen, ihn Typ für Typ zu messen, ohne das Gerät anzufassen.',

  'inspection.proWidget': '„{name}“ ist ein Pro-Widget, und diese Datei gibt „proUpTo: 0“ an. Was macht XCTrack mit diesem Widget auf einem Gerät ohne Pro-Lizenz: es durch einen Rahmen „Pro-Widget“ ersetzen, es normal anzeigen oder nichts daran ändern? Wir wissen es nicht.',
  'inspection.proWidgetToVerify': 'Die Bedeutung von `info.proUpTo` steht nicht fest: 0 ' +
    'heißt vielleicht „keine Lizenz“, vielleicht ein Ablaufdatum in Sekunden. Alle ' +
    '21 Dateien der Erhebung tragen 0, über zwei Installationen hinweg — kein anderer Wert ' +
    'wurde je beobachtet. Ein Versuch am AIR³ mit einem Pro-Widget würde es klären.',

  'inspection.roadMaps': '„{name}“ verlangt ebenfalls eine Straßenkarte, und Widget {first} dieser Seite verlangt bereits eine. XCTrack warnt in den eigenen Einstellungen, dass wegen einer Beschränkung seiner Kartenbibliothek nur eine Straßenkarte pro Seite möglich ist. Was stattdessen erscheint, ist nicht vorhersehbar.',

  'inspection.obsoleteKey': {
    one: '„{name}“ trägt eine Einstellung, die eine frühere Version von XCTrack geschrieben hat ({detail}). Nichts geht verloren: XCTrack 1.0.3 wandelt sie beim Lesen um — das ist am Gerät überprüft — und schreibt sie unter ihrem neuen Namen zurück, sobald dieses Widget das nächste Mal eingestellt wird.',
    other: '„{name}“ trägt Einstellungen, die eine frühere Version von XCTrack geschrieben hat ({detail}). Nichts geht verloren: XCTrack 1.0.3 wandelt sie beim Lesen um — das ist am Gerät überprüft — und schreibt sie unter ihren neuen Namen zurück, sobald dieses Widget das nächste Mal eingestellt wird.'
  },

  /* ------------- Störungen der Bibliothek und die technische Angabe — siehe `fr/model.ts` */

  'model.noErrorMessage': 'die Störung hat keine Meldung hinterlassen',

  'libraryError.duringOpen': 'Öffnen der Bibliothek',
  'libraryError.duringReadAll': 'Lesen der Bibliothek',
  'libraryError.duringReadEntry': 'Lesen eines Eintrags',
  'libraryError.duringReadBytes': 'Lesen einer Konfiguration',
  'libraryError.duringWrite': 'Schreiben eines Eintrags',
  'libraryError.duringDelete': 'Löschen eines Eintrags',
  'libraryError.duringClear': 'Leeren der Bibliothek',

  'libraryError.quota': '{operation}: Der Browser hat das Schreiben verweigert, der dieser Website zugestandene Platz ist voll. Exportieren Sie Ihre Bibliothek und löschen Sie dann Einträge, um Platz zu schaffen.',
  'libraryError.storageFailed': '{operation}: Der Browser konnte nicht antworten. {detail}',
  'libraryError.noIndexedDb': 'Dieser Browser bietet kein IndexedDB: die Bibliothek kann ' +
    'nichts aufbewahren.',
  'libraryError.blockedByTab': 'Ein anderer Tab verhindert die Aktualisierung der ' +
    'Bibliothek. Schließen Sie ihn und laden Sie neu.',

  'libraryError.notFound': 'Kein Eintrag {id} in der Bibliothek.',
  'libraryError.corrupt': 'Eintrag {id} ist nicht lesbar: {reason}.',
  'libraryError.duplicateId': 'Ein Eintrag trägt die Kennung {id} bereits.',
  'libraryError.changedElsewhere': 'Eintrag {id} hat sich seit dem Lesen geändert — ein anderer Tab hat ihn geändert oder gelöscht. Laden Sie die Bibliothek neu, bevor Sie es erneut versuchen.',
  'libraryError.notReadable': '„{name}“ konnte nicht geöffnet werden: es ist keine lesbare XCTrack-Konfiguration. {detail}',
  'libraryError.bytesMissing': 'Die Bytes von „{name}“ sind nicht auffindbar: der Eintrag ist unvollständig.',
  'libraryError.digestChanged': '„{name}“ gibt seine ursprüngliche Prüfsumme nicht mehr zurück: die abgelegten Bytes wurden verändert. Der Eintrag wird nicht herausgegeben.',

  'libraryError.recordNotObject': 'der Datensatz ist kein Objekt',
  'libraryError.recordNoId': 'Kennung fehlt oder ist leer',
  'libraryError.recordBadFields': {
    one: 'unlesbares Feld: {fields}',
    other: 'unlesbare Felder: {fields}'
  },

  'libraryError.manifestUnreadable': 'Das Verzeichnis des Archivs ist nicht lesbar.',
  'libraryError.manifestEmpty': 'Das Verzeichnis des Archivs ist leer.',
  'libraryError.notALibrary': 'Diese Datei ist keine von diesem Editor ausgegebene Bibliothek.',
  'libraryError.futureFormat': 'Diese Bibliothek wurde von einer neueren Fassung des Editors geschrieben (Format {version}). Aktualisieren Sie den Editor, bevor Sie sie einlesen.',
  'libraryError.manifestNoItems': 'Das Verzeichnis des Archivs führt keine Konfiguration auf.',
  'libraryError.notAnArchive': 'Diese Datei ist kein Bibliotheksarchiv, oder sie ist beschädigt. {detail}',
  'libraryError.manifestMissing': 'Das Archiv enthält kein {file}: es ist keine ausgegebene Bibliothek.',

  'libraryError.itemManifestUnreadable': 'unlesbares Verzeichnis im Archiv',
  'libraryError.itemMemberMissing': 'Element {file} fehlt im Archiv',
  'libraryError.itemDigestMismatch': 'die Bytes des Archivs ergeben nicht die angekündigte Prüfsumme',
  'libraryError.importedSuffix': ' (eingelesen)'
}

export default model
