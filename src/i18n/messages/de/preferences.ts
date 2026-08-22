import type { DomainCatalog } from '../../domains'

/**
 * `preferencesPage.ts` en allemand.
 *
 * **Werkswert** partout où le français dit « valeur d'usine » — comme
 * `factoryValue.same` dans `de/common.ts`. *Standardwert* est écarté pour la même raison
 * qu'en anglais : il dirait « ce qui s'applique quand on ne fait rien », ce que
 * `preferences.absentKeyOnImport` réfute précisément.
 *
 * **Einstellung** pour un réglage, **Zeile** pour une ligne du fichier, **Widget**
 * (substantif, donc capitale, y compris au milieu d'une phrase), **Gerät** pour
 * l'appareil, vouvoiement partout. Les guillemets sont „ … “.
 */
const preferences: DomainCatalog<'preferences'> = {
  'preferences.absentKeyOnImport':
    'Beim Import („Alles ersetzen“) behält Ihr Gerät die Einstellung, die es bereits hat: ' +
    'Was die Datei nicht angibt, wird nicht angerührt. Am AIR³ gemessen. Auf einem Gerät, ' +
    'das sie nie angerührt hat, gilt der Werkswert von XCTrack.',

  'preferences.settingCount': {
    one: '{count} Einstellung',
    other: '{count} Einstellungen'
  },
  /** Voir `fr/preferences.ts` : message de démonstration du socle, pas de l'écran. */
  'preferences.absentFromFile': {
    one: '{count} Zeile fehlt in der Datei',
    other: '{count} Zeilen fehlen in der Datei'
  },

  'preferences.lineCount': {
    one: '{count} Zeile',
    other: '{count} Zeilen'
  },
  'preferences.characterCount': {
    one: '{count} Zeichen',
    other: '{count} Zeichen'
  },

  'preferences.structuredValue': 'strukturierter Wert, {size}',
  'preferences.emptyList': 'leere Liste',
  'preferences.listValue': {
    one: 'Liste mit {count} Element, {size}',
    other: 'Liste mit {count} Elementen, {size}'
  },
  'preferences.yes': 'Ja',
  'preferences.no': 'Nein',
  'preferences.noKeyAssigned': 'keine Taste',
  'preferences.emptyValue': '(leer)',
  'preferences.offCatalogue': '{value} (außerhalb des Katalogs)',
  'preferences.truncatedValue': '{start}… ({size})',
  'preferences.someStructure': 'eine Struktur',

  'preferences.longPress': 'langer Druck',
  'preferences.shortPress': 'einfacher Druck',
  'preferences.rawCode': 'Tastencode {code}',
  'preferences.codeAndName': 'Tastencode {code}, {name}',

  'preferences.physicalKeyCount': {
    one: '{count} physische Taste',
    other: '{count} physische Tasten'
  },
  'preferences.hardwareUnsurveyedUnknownDevice':
    'Wir haben die physischen Tasten nur auf {models} gemessen, und diese Datei sagt ' +
    'nicht, von welchem Gerät sie stammt: dieses Gehäuse ist ein blinder Fleck. Der Code ' +
    'jeder Belegung wird oben gelesen und benannt, aber wir wissen nicht, welche Taste ihn ' +
    'aussendet.',
  'preferences.hardwareUnsurveyedOtherDevice':
    'Wir haben die physischen Tasten nur auf {models} gemessen, und diese Datei stammt von ' +
    'einem anderen Gerät ({device}): dieses Gehäuse ist ein blinder Fleck. Der Code jeder ' +
    'Belegung wird oben gelesen und benannt, aber wir wissen nicht, welche Taste ihn ' +
    'aussendet.',
  'preferences.hardwareSurveyed':
    'Auf {model} — dem Modell, das diese Datei angibt — haben wir nur {keys} gemessen: ' +
    '{listed}. {missing} Die Messung erfolgte an einem einzigen Gehäuse, und neuere ' +
    'Modelle tragen mehr davon.',
  'preferences.hardwareStrangerOne': 'Der Code {codes} ist keine von ihnen.',
  'preferences.hardwareStrangerMany': 'Die Codes {codes} sind keine von ihnen.',
  'preferences.unmatchedKeyTitle':
    'Keine der auf {model} gemessenen Tasten sendet den Code {code}. Die Anmerkung unter ' +
    'diesem Block sagt, was diese Messung wert ist.',
  'preferences.keyFromSurvey':
    '„{label}“ ist der Name dieser Taste am Gehäuse, von Hand auf {model} gemessen. {name} ist der Name, den Android dem Code {code} gibt.',
  'preferences.keyFromAndroid':
    '{name} ist der Name, den die Tastentabelle von Android dem Code {code} gibt. Diese Tabelle benennt einen Code, keine Taste: sie sagt nicht, welche Ihrer Tasten ihn sendet, und wir haben diese hier nicht von Hand gemessen.',
  'preferences.keyFromNowhere':
    'Der Code {code} steht in keiner Tastentabelle, die wir gelesen haben. Hier wird ihm kein Name gegeben: einen zu erfinden wäre der schlechteste Dienst.',
  'preferences.intentGloss':
    'Ein „Intent“ ist die Nachricht, mit der eine Android-Anwendung eine andere reagieren lässt. Diese Taste steuert also nicht XCTrack: sie sendet ein Signal, und es ist eine andere, auf dem Gerät eingerichtete Anwendung, die darauf antwortet.',

  'preferences.keyNamingOrigin':
    'Ein ausgeschriebener Name ist der, den die Taste am Gehäuse trägt, von Hand gemessen: solche Namen gibt es nur für die Modelle, die wir in der Hand hatten. Ein Name mit KEYCODE_ stammt aus der Tastentabelle von Android, die den Code benennt und nicht die Taste. Ein fehlender Name ist also eine fehlende Messung, nie eine Taste, die es nicht gäbe.',

  'preferences.runtimeDefaultReason':
    'XCTrack füllt diese Liste im Code, und ihr Werkswert hängt von Sprache und Land des ' +
    'Geräts ab: es gibt nichts zu vergleichen.',
  'preferences.unknownSettingReason':
    'Dieser Editor kennt diese Einstellung nicht: weder ihre Rolle noch ihren Werkswert.',
  'preferences.noFactoryValueInCatalogue':
    'Der Katalog verzeichnet keinen Werkswert für diese Einstellung.',
  'preferences.structuredVsScalar':
    'Der Wert der Datei ist eine Struktur; der des Katalogs der Werkswerte ist ein ' +
    'einfacher Wert.',

  'preferences.refusalUnknown':
    'Dieser Editor weiß nicht, was diese Zeile der Datei einstellt: er bietet nicht an, ' +
    'sie zu ändern. Sie wird unverändert bewahrt.',
  'preferences.refusalState':
    'Diese Zeile hält den Zustand der Anwendung fest, keine Einstellung: sie kommt ' +
    'unversehrt wieder heraus, nie neu geschrieben.',
  'preferences.refusalUnlabelled':
    'XCTrack benennt diese Einstellung nirgends lesbar: ohne ihre Beschriftung bietet ' +
    'dieser Editor nicht an, sie zu ändern.',
  'preferences.refusalStructured':
    'Zusammengesetzter Wert: diese Seite zeigt ihn, wie er ist, ohne ihn zu öffnen, und ' +
    'schreibt ihn nie neu.',
  'preferences.refusalAction':
    'Auf dem Gerät geschieht das über einen Dialog — eine Taste, die am Instrument ' +
    'gedrückt werden muss, eine Tabelle, die gebaut werden muss —, den diese Seite nicht ' +
    'ersetzen kann. Der Wert wird weiterhin gelesen, und das Dokument kommt unversehrt ' +
    'wieder heraus.',
  'preferences.refusalNoValue':
    'Das wird nicht eingegeben: die Zeile befiehlt, sie trägt keinen Wert.',
  'preferences.refusalNote': {
    one: '{count} Einstellung dieses Blocks lässt sich hier nicht einstellen. {reason}',
    other: '{count} Einstellungen dieses Blocks lassen sich hier nicht einstellen. {reason}'
  },

  'preferences.stateCustom': 'von Ihnen gesetzt',
  'preferences.stateDefault': 'Werkswert',
  'preferences.stateConflict': 'Werkswert unsicher',
  'preferences.stateAbsent': 'fehlt in der Datei',
  'preferences.stateUnwritten': 'nie gesetzt',
  'preferences.stateUndecidable': 'nichts zu vergleichen',

  'preferences.stateTitleCustomUnknown':
    'Dieser Wert weicht vom Werkswert von XCTrack ab.',
  'preferences.stateTitleCustom': 'Der Werkswert von XCTrack ist „{factory}“.',
  'preferences.stateTitleDefault':
    'Wert unverändert: das ist der Werkswert von XCTrack.',
  'preferences.stateTitleConflict':
    'XCTrack gibt zwei verschiedene Werkswerte für diese Einstellung an: „{code}“ in ' +
    'seinem Code und „{screen}“ in seinem Einstellungsbildschirm. Dieser Editor wählt ' +
    'nicht an seiner Stelle. Ihr Wert ist der der Datei.',
  'preferences.stateTitleAbsent':
    'Diese Einstellung steht nicht in der Datei: sie sagt nichts darüber. {absent}',
  'preferences.stateTitleAbsentWithValue':
    'Diese Einstellung steht nicht in der Datei: sie sagt nichts darüber. {absent} Er ' +
    'lautet „{factory}“.',
  'preferences.stateTitleUnwritten':
    'Diese Einstellung steht nicht in der Datei, und XCTrack schreibt sie erst hinein, ' +
    'sobald sie mindestens einmal am Gerät gesetzt wurde: ihr Fehlen sagt nichts — weder ' +
    'was Ihr Gerät anwendet, noch was es fabrikneu anwenden würde.',
  'preferences.stateTitleNoFactoryValue':
    'Kein Werkswert für diese Einstellung bekannt.',

  'preferences.editInsertDescription': '{label} in die Datei schreiben',
  'preferences.editSetDescription': '{label} einstellen',
  'preferences.removeFromFile': '{label} aus der Datei entfernen',
  'preferences.restoreToFactoryValue': '{label} auf den Werkswert zurücksetzen',

  'preferences.factoryValueUnknown': 'Werkswert unbekannt',
  'preferences.factoryValueUnknownTitle':
    'Der Katalog verzeichnet keinen schreibbaren Werkswert für diese Einstellung: dieser ' +
    'Editor hat nichts, womit er ihn erzeugen könnte, und er erfindet keinen.',
  'preferences.implicitTitle':
    '„{factory}“ ist der Werkswert von XCTrack, kein gesetzter Wert: diese Einstellung ' +
    'steht nicht in der Datei. {absent}',
  'preferences.adoptLabel': 'Diesen Wert schreiben',
  'preferences.adoptTitle':
    'Schreibt „{key}“: {factory} in die Datei.\n\n' +
    'Auf einem Gerät, das dies nie gesetzt hat, ist es bereits das, was es anwendet: das ' +
    'Schreiben ändert dann nichts Unmittelbares und stellt die Einstellung außer ' +
    'Reichweite eines XCTrack-Updates, das ihren Werkswert ändern würde.\n\n' +
    'Auf einem Gerät, das sie bereits gesetzt hat, schreibt der Import diesen Wert ' +
    'anstelle seines eigenen: solange die Datei nichts dazu sagt, behält es seinen ' +
    '(am AIR³ gemessen, Import „Alles ersetzen“).',

  'preferences.dropLabel': 'Aus der Datei entfernen',
  'preferences.dropTitle':
    'Entfernt „{key}“ aus der Datei: sie wird nichts mehr über diese Einstellung sagen.\n\n' +
    '{absent}\n\n' +
    'Was das für ein Gerät ändert, das sie nie angerührt hat: der Wert ist nicht mehr ' +
    'festgeschrieben und folgt den Updates von XCTrack. Es ist das genaue Gegenteil von ' +
    '„Diesen Wert schreiben“.',

  'preferences.restoreLabel': 'Den Werkswert wiederherstellen',
  'preferences.restoreTitle':
    'Schreibt „{key}“: {factory} in die Datei, anstelle von {current}.\n\n' +
    'Diese Handlung ist nicht wie die beiden anderen dieser Seite: jene rühren nur eine ' +
    'Einstellung an, die Sie nie gewählt haben, diese ersetzt Ihre durch die, die XCTrack ' +
    'bei einer frischen Installation setzt.{caveat}',
  'preferences.restoreNote':
    '„{factory}“ ab Werk, „{current}“ in dieser Datei. Das Zurücksetzen ändert, was das ' +
    'Gerät im Flug tut.{caveat}',
  'preferences.restoreCaveatIndicative':
    ' Dieser Werkswert stammt aus dem Katalog von XCTrack {version}, und das ist nicht die ' +
    'Version, aus der diese Datei stammt: prüfen Sie, ob es wirklich der richtige ist.',
  'preferences.restoreCaveatUnstated':
    ' Dieser Werkswert stammt aus dem Katalog von XCTrack {version}, und die Version dieser ' +
    'Datei ist hier nicht bekannt: prüfen Sie, ob es wirklich der richtige ist.',

  'preferences.unitListNote':
    'Diese Liste wurde auf {device}, XCTrack {version}, gemessen: {method}. Zu beachten: ' +
    '{caveats}.',
  'preferences.freeListTitle':
    'XCTrack füllt diese Liste im Code: unsere Erhebung der Versionen gibt ihre Werte ' +
    'nicht her, und sie wurden nicht am Gerät gemessen. Dieser Editor bietet daher keine ' +
    'Auswahl an, und der Wert wird genau so geschrieben, wie Sie ihn eingeben.',

  'preferences.summaryCount':
    'Sie haben {custom} der {settings} gesetzt, die XCTrack anbietet.',

  'preferences.detailDefault': {
    one: '{count} auf dem Werkswert',
    other: '{count} auf dem Werkswert'
  },
  'preferences.detailAbsent': {
    one: '{count} fehlt in der Datei',
    other: '{count} fehlen in der Datei'
  },
  'preferences.detailUnwritten': {
    one: '{count} nie gesetzt',
    other: '{count} nie gesetzt'
  },
  'preferences.detailUndecidable': {
    one: '{count} ohne bekannten Werkswert',
    other: '{count} ohne bekannten Werkswert'
  },
  'preferences.detailConflict': {
    one: '{count} mit unsicherem Werkswert',
    other: '{count} mit unsicherem Werkswert'
  },
  'preferences.restUnlabelled': {
    one: '{count} ohne Beschriftung in der Anwendung',
    other: '{count} ohne Beschriftung in der Anwendung'
  },
  'preferences.restState': {
    one: '{count} von der Anwendung gemerkt',
    other: '{count} von der Anwendung gemerkt'
  },
  'preferences.restUnknown': {
    one: '{count} diesem Katalog unbekannt',
    other: '{count} diesem Katalog unbekannt'
  },

  'preferences.fileCarries': 'Diese Datei enthält insgesamt {lines}.',
  'preferences.fileCarriesWithRest': {
    one: 'Diese Datei enthält insgesamt {lines}: {count} entspricht keiner Einstellung ' +
      'eines Bildschirms des Geräts — {rest}. Sie ist am Ende der Seite aufgeführt.',
    other: 'Diese Datei enthält insgesamt {lines}: {count} entsprechen keiner Einstellung ' +
      'eines Bildschirms des Geräts — {rest}. Sie sind am Ende der Seite aufgeführt.'
  },

  'preferences.catalogReference':
    'Beschriftungen und Werkswerte aus XCTrack {version} entnommen',
  'preferences.catalogNoteExact':
    '{reference} — genau die Version dieser Datei.{fallback}',
  'preferences.catalogNoteUnstated':
    '{reference}. Diese Datei sagt nicht, aus welcher Version sie stammt: Beschriftungen ' +
    'und Werkswerte ändern sich von Version zu Version, die Lesart ist daher nur ein ' +
    'Anhaltspunkt.{fallback}',
  'preferences.catalogNoteIndicative':
    '{reference}. Diese Datei stammt aus {file}: Beschriftungen und Werkswerte ändern sich ' +
    'von Version zu Version, die Lesart ist daher nur ein Anhaltspunkt.{fallback}',
  'preferences.catalogFallback': {
    one: ' {count} Text fehlt in dieser Sprache und wird auf Englisch angezeigt.',
    other: ' {count} Texte fehlen in dieser Sprache und werden auf Englisch angezeigt.'
  },
  'preferences.fileVersionNumber': 'Version {code}',
  'preferences.fileVersionNamed': 'Version {name}',

  'preferences.personalMarkTitle': 'Personenbezogene Angabe — {reason} ({basis}).',
  'preferences.privacyNone':
    'Keine personenbezogene Angabe in den Einstellungen dieser Datei entdeckt',
  'preferences.privacyHead': {
    one: '{count} Einstellung trägt eine personenbezogene Angabe · {filled} ausgefüllt, ' +
      '{empty} leer',
    other: '{count} Einstellungen tragen eine personenbezogene Angabe · {filled} ' +
      'ausgefüllt, {empty} leer'
  },
  'preferences.privacyLayoutNone':
    'Diese Seite zählt nur die Einstellungen. Das Layout dieser Datei trägt keinen von ' +
    'Ihnen geschriebenen Text — das Fenster „Speichern“ nimmt sie auf, und sie sind die ' +
    'einzigen, die mit einem „pages“-Export mitgingen.',
  'preferences.privacyLayoutSome': {
    one: 'Diese Seite zählt nur die Einstellungen. Das Layout trägt {count} weitere — von ' +
      'Ihnen in den Widgets geschriebene Texte — und sie sind die einzigen, die mit einem ' +
      '„pages“-Export mitgehen. Das Fenster „Speichern“ zeigt sie einzeln.',
    other: 'Diese Seite zählt nur die Einstellungen. Das Layout trägt {count} weitere — von ' +
      'Ihnen in den Widgets geschriebene Texte — und sie sind die einzigen, die mit einem ' +
      '„pages“-Export mitgehen. Das Fenster „Speichern“ zeigt sie einzeln.'
  },
  'preferences.privacyItemWhy': '{kind} — {reason}',
  'preferences.privacyNavigationState':
    '„Navigation.State“ ist eine öffentliche Einstellung von XCTrack: sie reist mit der ' +
    'Datei. Sie trägt die laufende Aufgabe — Wendepunkte und Koordinaten —, hier {value}. ' +
    'Diese Seite zeigt ihren Inhalt nie; eine weitergegebene Datei nimmt ihn jedoch mit.',
  'preferences.privacyGuessPosition':
    'XCTrack behält außerdem eine vermutete Position des Geräts („App.GuessLatitude“, ' +
    '„App.GuessLongitude“) — in der Praxis den Wohnort. Sie sind geräteintern: kein Export ' +
    'trägt sie, und diese Datei trägt sie nicht.',
  'preferences.privacySecureKeys': {
    one: 'XCTrack verschlüsselt die Kontodaten (XContest, SkySight, SafeSky…): die {count} ' +
      'betroffene Einstellung verlässt das Gerät nie, und kein Export trägt sie.',
    other: 'XCTrack verschlüsselt die Kontodaten (XContest, SkySight, SafeSky…): die ' +
      '{count} betroffenen Einstellungen verlassen das Gerät nie, und kein Export trägt sie.'
  },
  'preferences.privacyJudged': {
    one: 'Die {count} Zeile dieser Datei wird von XCTrack selbst nicht gemeldet: die ' +
      'einzigen Einstellungen, deren Schutzbedarf es angibt, sind die, die es ' +
      'verschlüsselt, und die werden nicht exportiert. Dieses Verzeichnis ist somit ein ' +
      'Urteil dieses Editors, und jede Zeile nennt das ihre.',
    other: 'Keine der {count} Zeilen dieser Datei wird von XCTrack selbst gemeldet: die ' +
      'einzigen Einstellungen, deren Schutzbedarf es angibt, sind die, die es ' +
      'verschlüsselt, und die werden nicht exportiert. Dieses Verzeichnis ist somit ein ' +
      'Urteil dieses Editors, und jede Zeile nennt das ihre.'
  },
  'preferences.filledPersonal': {
    one: 'Sie haben soeben {count} personenbezogene Angabe ausgefüllt — {keys}. Sie wird ' +
      'mit dieser Datei reisen: im Fenster „Speichern“ wählen Sie, was mitgeht.',
    other: 'Sie haben soeben {count} personenbezogene Angaben ausgefüllt — {keys}. Sie ' +
      'werden mit dieser Datei reisen: im Fenster „Speichern“ wählen Sie, was mitgeht.'
  },

  'preferences.leftoverTitleUnlabelled': 'Einstellungen ohne Beschriftung',
  'preferences.leftoverTitleState': 'Was die Anwendung sich gemerkt hat (keine Einstellungen)',
  'preferences.leftoverTitleUnknown': 'Zeilen, die dieser Katalog nicht kennt',
  'preferences.leftoverLeadUnlabelled':
    'Das sind sehr wohl Einstellungen, aber XCTrack richtet sie in Bildschirmen ein, die ' +
    'im Code gebaut sind, wo die Zeile der Datei nicht mehr an ihrer Beschriftung hängt: ' +
    'die Anwendung benennt sie nirgends lesbar. Der Wert und der Vergleich mit dem ' +
    'Werkswert bleiben richtig — es fehlt der Name, nicht der Sinn.',
  'preferences.leftoverLeadState':
    'Diese Zeilen stellen nichts ein: sie halten den Zustand der Anwendung fest. Diese ' +
    'Seite nennt ihre Art und ihre Größe, nie ihren Inhalt.',
  'preferences.leftoverLeadUnknown':
    'Dieser Editor weiß nicht, was diese Zeilen einstellen: sie wurden von einer anderen ' +
    'Version von XCTrack geschrieben als der, von der der Katalog spricht. Sie sind weder ' +
    'löschbar noch vernachlässigbar — schlicht unbekannt, und unverändert bewahrt.',
  'preferences.noFamily': '(ohne Familie)',

  'preferences.emptyTitle': 'Diese Datei trägt keine allgemeine Einstellung.',
  'preferences.emptyText':
    'Nur „backup“-Exporte nehmen die Einstellungen der Anwendung mit. Ein „pages“-Export ' +
    'beschreibt nur die Seiten und ihre Widgets: eine vollständige Sicherung des Geräts zu ' +
    'öffnen ist der einzige Weg, diese Einstellungen zu sehen.',
  'preferences.emptyIntact':
    'Deswegen geht nichts verloren: was diese Seite nicht zeigt, enthält diese Datei ' +
    'nicht, und ein erneuter Export lässt es genau so, wie es ist.',
  'preferences.emptyPersonalWarning': {
    one: 'Achtung: „keine Einstellungen“ heißt nicht „nichts Persönliches“. Das Layout ' +
      'dieser Datei trägt {count} von Ihnen geschriebenen Text in seinen Widgets — einen ' +
      'Titel, einen Namen, eine Telefonnummer —, und ein „pages“-Export nimmt sie mit. Das ' +
      'Fenster „Speichern“ zeigt sie einzeln.',
    other: 'Achtung: „keine Einstellungen“ heißt nicht „nichts Persönliches“. Das Layout ' +
      'dieser Datei trägt {count} von Ihnen geschriebene Texte in seinen Widgets — einen ' +
      'Titel, einen Namen, eine Telefonnummer —, und ein „pages“-Export nimmt sie mit. Das ' +
      'Fenster „Speichern“ zeigt sie einzeln.'
  },

  'preferences.pageTitle': 'Allgemeine Einstellungen',
  'preferences.pageSubtitle': 'Was XCTrack außerhalb der Widget-Seiten einstellt',
  'preferences.pageSubtitleNamed':
    '{file} — was XCTrack außerhalb der Widget-Seiten einstellt',
  'preferences.menuLead':
    'Die Bildschirme sind die des Geräts, in der Reihenfolge seines Einstellungsmenüs.',
  'preferences.menuLeadEditable':
    'Die Bildschirme sind die des Geräts, in der Reihenfolge seines Einstellungsmenüs. ' +
    'Eine geänderte Einstellung wird sofort in das Dokument geschrieben; „Rückgängig“ ' +
    'nimmt sie zurück, und nichts geht vor „Speichern“ auf die Platte.',
  'preferences.entryNothing': 'Nichts von diesem Bildschirm kommt in dieser Datei vor.',
  'preferences.neverExported': {
    one: '{count} Einstellung dieses Bildschirms verlässt das Gerät nie: XCTrack ' +
      'exportiert sie nicht.',
    other: '{count} Einstellungen dieses Bildschirms verlassen das Gerät nie: XCTrack ' +
      'exportiert sie nicht.'
  },

  'preferences.tallyNone':
    'Diese Datei trägt {lines} davon: keine trägt eine Beschriftung, alle sind am Ende der ' +
    'Seite unter ihrem rohen Namen aufgeführt.',
  'preferences.tallySome':
    'Diese Datei trägt {lines} davon, davon {named}; {listed} am Ende der Seite unter ' +
    'ihrem rohen Namen.',
  'preferences.tallyNamed': {
    one: 'eine einzige trägt eine Beschriftung und wird auf einem anderen Bildschirm gezeigt',
    other: '{count} tragen eine Beschriftung und werden auf einem anderen Bildschirm gezeigt'
  },
  'preferences.tallyListed': {
    one: '{count} ist aufgeführt',
    other: '{count} sind aufgeführt'
  },

  'preferences.menuNoteAirspaces':
    'XCTrack baut diesen Bildschirm im Code: die Einstellung liegt dort weit von ihrer ' +
    'Beschriftung entfernt, und die Anwendung benennt sie daher nirgends lesbar. Die ' +
    'Einstellungen, die sie schreibt, stehen sehr wohl in der Datei — sie sind weiter ' +
    'unten gesammelt, unter „Einstellungen ohne Beschriftung“ und „Was die Anwendung sich ' +
    'gemerkt hat“.',
  'preferences.menuNoteMaps':
    'Ebenfalls ein im Code gebauter Bildschirm, ebenfalls ohne brauchbare Beschriftung. ' +
    'Die „Mapsforge“-Zeilen der Datei sind weiter unten gesammelt.',
  'preferences.menuNoteEditPageSet':
    'Diese Zeile öffnet den Editor für Seiten und Widgets — der Rest dieses Editors zeigt ' +
    'sie, nicht diese Seite.',
  'preferences.menuNoteEventMapping':
    'Die automatischen Aktionen werden als Block in „EventMappingJs“ festgehalten: ein ' +
    'kleines, in einem Zug geschriebenes Programm, und keine Liste von Einstellungen.',
  'preferences.menuNotePro':
    'Das Abonnement wird über das XContest-Konto verwaltet, nicht in der ' +
    'Konfigurationsdatei.',
  'preferences.menuNoteSensors':
    'Dieser Bildschirm dient dem Koppeln der Sensoren. Was er festhält, passt in eine ' +
    'einzige Zeile, „Sensors.Configuration“, weiter unten gesammelt mit dem Rest dessen, ' +
    'was die Anwendung sich gemerkt hat.',
  'preferences.menuNoteShareConfig':
    'Dieser Bildschirm trägt nur zwei Befehle — eine Konfiguration exportieren, ' +
    'importieren. Er hat keine Einstellung zu behalten.',
  'preferences.menuNoteAbout':
    'Dieser Bildschirm zeigt nur Angaben zur Anwendung: Version, Änderungsprotokoll, ' +
    'Hinweise. Nichts, was sich einstellen ließe.',
  'preferences.menuNoteInfoOnly': 'Informationszeile ohne Einstellung.',

  'preferences.filterPlaceholder': 'Einstellungen filtern',
  'preferences.onlyMine': 'Nur was ich gesetzt habe',
  'preferences.showAll': 'Alles anzeigen',
  'preferences.maskPersonal': 'Persönliche Werte verbergen',
  'preferences.showPersonal': 'Persönliche Werte anzeigen',
  'preferences.close': 'Schließen'
}

export default preferences
