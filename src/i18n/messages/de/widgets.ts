import type { DomainCatalog } from '../../domains'

/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — zu den zwei Sprachachsen siehe
 * `fr/widgets.ts`: unsere Prosa wird hier übersetzt, die XCTrack-Beschriftungen, die
 * über `{name}`, `{label}` und `{value}` ankommen, niemals.
 *
 * *Widget* und nie *Gadget*: das ist das Wort, das die deutsche Oberfläche von XCTrack
 * selbst verwendet, auf allen 55 erfassten Versionen. Weder *Instrument* noch *Element*
 * kommt dort vor — beide gesucht, beide nicht vorhanden.
 *
 * « valeur d'usine » wird *Werkswert* — nie *Standard*, was die Aussage von „was der
 * Hersteller gesetzt hat“ zu „was gilt, wenn nichts anderes gilt“ verschieben würde.
 */
const widgets: DomainCatalog<'widgets'> = {
  /* ==================================================== properties.ts — der Kopf */

  'properties.widgetTitle': 'Widget: {name}',

  'properties.settingCount': {
    one: '{count} Einstellung',
    other: '{count} Einstellungen'
  },

  'properties.filterSettings': 'Einstellungen filtern',

  /* ------------------------------------------------- Vergleich mit der Werkswert-Erfassung */

  'properties.noSurveyForType':
    'Der Katalog der Werkswerte beschreibt diesen Widget-Typ nicht: nichts zu vergleichen.',

  'properties.nothingCustomized':
    'Keine Einstellung weicht von dem ab, was XCTrack auf ein neues Widget setzt ({compared} verglichen).',

  'properties.customizedRatio': {
    one: '{count} angepasste Einstellung von {compared}.',
    other: '{count} angepasste Einstellungen von {compared}.'
  },
  'properties.comparedCount': {
    one: '{count} verglichen',
    other: '{count} verglichen'
  },

  'properties.onlyDifferent': 'Nur was abweicht',
  'properties.showEverything': 'Alles anzeigen',

  /* --------------------------------- woher die Erfassung stammt und was sie wert ist */

  'properties.surveyReference':
    'Werkswerte erfasst auf XCTrack {version}',
  'properties.fileVersionNamed': 'Version {name}',
  'properties.fileVersionCoded': 'Version {code}',

  'properties.surveyExact': '{survey} — genau die Version dieser Datei.',
  'properties.surveyUnstated':
    '{survey}. Diese Datei sagt nicht, aus welcher Version sie stammt: Werkswerte ändern sich von einer Version zur nächsten, der Vergleich ist daher nur ein Anhaltspunkt.',
  'properties.surveyOther':
    '{survey}. Diese Datei stammt aus {which}: Werkswerte ändern sich von einer Version zur nächsten, der Vergleich ist daher nur ein Anhaltspunkt.',

  'properties.surveyKeysAbsent': {
    one: '{count} Einstellung der Erfassung steht nicht in diesem Widget ({keys}): XCTrack wendet darauf seinen eigenen Wert an, der am Ende des Bereichs genannt wird.',
    other: '{count} Einstellungen der Erfassung stehen nicht in diesem Widget ({keys}): XCTrack wendet darauf seine eigenen Werte an, die am Ende des Bereichs genannt werden.'
  },

  /* ---------------------------- der Schlussblock: Zeilen, die die Datei nicht schreibt */

  'properties.absentTitle': {
    one: '{count} Einstellung, die dieses Widget nicht schreibt',
    other: '{count} Einstellungen, die dieses Widget nicht schreibt'
  },

  'properties.absentApplied':
    'Diese Einstellungen stehen nicht in der Datei: XCTrack wendet den Wert aus seinem ' +
    'eigenen Code an, den daneben genannten. Das ist nicht dasselbe wie eine Einstellung, ' +
    'die absichtlich auf diesen Wert gesetzt wurde.',
  'properties.absentUnstated':
    '{survey}; die Version dieser Datei ist hier nicht bekannt. Werkswerte ändern sich von einer Version zur nächsten: was Ihr Gerät anwendet, kann daher von dem abweichen, was hier steht.',
  'properties.absentOther':
    '{survey}, und diese Datei stammt aus {which}: ein Werkswert kann sich zwischen beiden geändert haben, und was Ihr Gerät anwendet, kann von dem abweichen, was hier steht.',
  'properties.absentGesture':
    'Sie zu setzen ändert nichts an dem, was das Gerät heute tut — es friert den Wert ein, ' +
    'der sich an dem Tag nicht mehr bewegt, an dem ein XCTrack-Update diesen Werkswert ändert.',

  'properties.appliedValue':
    'Diese Einstellung steht nicht in der Datei: XCTrack wendet „{value}“ an, seinen Werkswert. Das ist nicht dasselbe wie ein absichtlich auf diesen Wert gesetzter Wert.',

  'properties.compositeFactoryValue': 'zusammengesetzter Werkswert',
  'properties.compositeFactoryValueHelp':
    'Der Katalog beschreibt diese Einstellung mit einem zusammengesetzten Wert: dieser ' +
    'Editor schreibt nur einfache Werte und erfindet keinen als Ersatz. Die Einstellung ' +
    'bleibt änderbar, sobald XCTrack sie selbst geschrieben hat.',

  /* ------------------------------------------- die erste Geste: den Wert festlegen */

  'properties.setValue': 'Diesen Wert festlegen',
  'properties.setValueAria': '{label} in der Datei festlegen',
  'properties.setValueHelp':
    'Schreibt „{key}“: {value} in die Datei.\n\nIhr Gerät verhält sich heute bereits so — den Wert zu schreiben ändert also nichts an dem, was es jetzt tut. Was sich ändert, gilt für später: solange die Zeile fehlt, folgt das Gerät dem Werkswert der installierten XCTrack-Version, und ein Update, das ihn ändert, ändert Ihre Einstellung, ohne Sie zu fragen. Einmal geschrieben, ist der Wert eingefroren: er bleibt dieser.',
  'properties.setCaveatOtherVersion':
    'Dieser Werkswert wurde auf XCTrack {version} erfasst, das nicht die Version ist, aus der diese Datei stammt: prüfen Sie, ob es wirklich der einzufrierende Wert ist.',
  'properties.setCaveatUnknownVersion':
    'Dieser Werkswert wurde auf XCTrack {version} erfasst, und die Version dieser Datei ist hier nicht bekannt: prüfen Sie, ob es wirklich der einzufrierende Wert ist.',

  /* ------------------------------------------------- einen Wert in Worten sagen */

  'properties.yes': 'Ja',
  'properties.no': 'Nein',
  'properties.emptyValue': '(leer)',
  'properties.outOfCatalogValue': '{value} (nicht im Katalog)',

  /* ----------------------------------------------------- die Herkunftsmarke einer Zeile */

  'properties.setByYou': 'von Ihnen eingestellt',
  'properties.setByYouFactory': 'von Ihnen eingestellt · ab Werk: {value}',
  'properties.setByYouHelp':
    'Dieser Wert weicht von dem ab, was XCTrack auf ein neues Widget dieses Typs schreibt.',
  'properties.setByYouHelpValue':
    'Auf ein neues Widget dieses Typs schreibt XCTrack „{value}“.',

  'properties.factoryValue': 'Werkswert',
  'properties.factoryValueHelp':
    'Wert unverändert: das ist, was XCTrack auf ein neues Widget dieses Typs schreibt.',
  'properties.factoryValueUnknown': 'Werkswert unbekannt',
  'properties.factoryValueUnknownHelp':
    'Der Katalog der Werkswerte beschreibt diese Einstellung nicht — eine bei der Erfassung ' +
    'von Hand geschriebene allgemeine Einstellung, eine seither hinzugekommene Einstellung ' +
    'oder ein nicht vergleichbarer Wert. Über diese Zeile wird nichts behauptet.',

  /* --------------------------------- die dritte Geste: den Werkswert wiederherstellen */

  'properties.restoreFactoryValue': 'Werkswert wiederherstellen',
  'properties.restoreAria': '{label} auf den Werkswert zurücksetzen',
  'properties.restoreHelp':
    'Schreibt „{path}“: {factory} in die Datei, anstelle von {current}.\n\nDiese Geste ist nicht wie „Diesen Wert festlegen“ am Ende des Bereichs: jene lässt das Gerät sich genau wie heute verhalten, diese nicht. Sie ersetzt eine von Ihnen gewählte Einstellung durch die, die XCTrack auf ein neues Widget dieses Typs setzt.',
  'properties.restoreNote':
    '„{factory}“ ab Werk, „{current}“ in dieser Datei. Das Wiederherstellen ändert, was das Gerät im Flug tut.',
  'properties.restoreCaveatOtherVersion':
    'Dieser Werkswert wurde auf XCTrack {version} erfasst, das nicht die Version ist, aus der diese Datei stammt: prüfen Sie, ob es wirklich der wiederherzustellende ist.',
  'properties.restoreCaveatUnknownVersion':
    'Dieser Werkswert wurde auf XCTrack {version} erfasst, und die Version dieser Datei ist hier nicht bekannt: prüfen Sie, ob es wirklich der wiederherzustellende ist.',

  /* ------------------------------------------------------------ eine Zeile des Bereichs */

  'properties.outOfCatalogSetting': 'Einstellung nicht im Katalog',
  'properties.outOfCatalogSettingHelp':
    '„{path}“ wird vom Katalog nicht beschrieben: dieses Werkzeug errät das Bedienelement aus dem Typ des Werts.',
  'properties.helpAria': 'Hilfe zu dieser Einstellung',
  'properties.readOnlyValue': 'Wert hier nicht änderbar; er bleibt unverändert erhalten.',

  /* ----------------------------------------- die Einheiten, die der Katalog nackt lässt */

  'properties.unitSystem': 'wie die allgemeinen Einstellungen',
  'properties.unitMeter': 'Meter (m)',
  'properties.unitFoot': 'Fuß (ft)',
  'properties.unitYard': 'Yards (yd)',
  'properties.unitKmPerHour': 'Kilometer pro Stunde (km/h)',
  'properties.unitMetersPerSecond': 'Meter pro Sekunde (m/s)',
  'properties.unitMilesPerHour': 'Meilen pro Stunde (mph)',
  'properties.unitKnot': 'Knoten (kt)',
  'properties.unitCelsius': 'Grad Celsius (°C)',
  'properties.unitFahrenheit': 'Grad Fahrenheit (°F)',
  'properties.coordDegrees': 'Dezimalgrad',
  'properties.coordDegreesMinutes': 'Grad und Minuten',
  'properties.coordDegreesMinutesSeconds': 'Grad, Minuten und Sekunden',
  'properties.coordUtm': 'UTM',

  /* ============================================ widgetPalette.ts — die Hinzufügen-Palette */

  'palette.title': 'Widget hinzufügen',
  'palette.typeCount': {
    one: '{count} Typ',
    other: '{count} Typen'
  },
  'palette.notOffered': 'In der Datei vorhanden, von XCTrack nicht angeboten',

  'palette.search': 'Widget suchen',
  'palette.searchAria':
    'Ein Widget nach seinem Namen suchen oder nach dem Namen, den es in der Datei trägt',

  'palette.onlyPresent': 'Schon in der Datei ({count})',
  'palette.onlyPresentHelp':
    'Diese Typen werden von einem Widget kopiert, das XCTrack selbst geschrieben hat: alle ' +
    'ihre Einstellungen bleiben erhalten, auch die, die dieser Editor nicht darstellen kann.',
  'palette.legend':
    'Durchgezogener Rand: das Widget wird von einem bereits in der Datei vorhandenen ' +
    'Exemplar kopiert, mit allen seinen Einstellungen. Gepunkteter Rand: es wird nur mit ' +
    'seinen Grundeinstellungen angelegt, XCTrack ergänzt die übrigen beim Lesen. Die ' +
    'Miniatur zeigt in beiden Fällen, was der Klick setzen wird.',
  'palette.noMatch': 'Kein Widget trägt diesen Namen.',

  /* ------------------------------------------------- was die Miniatur zeigen kann */

  'palette.previewDrawn':
    'Vom Editor nach den Einstellungen des Widgets gezeichnete Vorschau. Die angezeigten ' +
    'Werte sind feste Beispiele: nichts wird aus einem Flug berechnet.',
  'palette.previewGeneric':
    'Dieser Editor hat für diesen Typ keine eigene Zeichnung: die Miniatur zeigt seinen ' +
    'Titel und einen Strich anstelle des Werts. Auf dem Gerät zeigt er seine Flugdaten.',
  'palette.previewBlank':
    'Dieser Typ zeichnet auf dem Gerät im Ruhezustand nichts: die Miniatur ist leer, weil ' +
    'der Bildschirm es auch ist, solange keine Nachricht eingetroffen ist.',

  'palette.nothingAtRest': 'nichts im Ruhezustand',
  'palette.notDrawn': 'Vorschau nicht gezeichnet',

  /* ------------------------------------------------------------ die Marken einer Zeile */

  'palette.pro': 'Pro',
  'palette.proHelp': 'XCTrack behält dieses Widget der Pro-Lizenz vor.',
  'palette.hereOnce': 'schon hier',
  'palette.hereCount': 'schon hier × {count}',
  'palette.hereOnceHelp': 'Dieser Typ ist bereits auf der angezeigten Seite.',
  'palette.hereCountHelp': {
    one: '{count} Exemplar dieses Typs ist bereits auf der angezeigten Seite.',
    other: '{count} Exemplare dieses Typs sind bereits auf der angezeigten Seite.'
  },
  'palette.elsewhere': 'anderswo',
  'palette.elsewhereHelp': {
    one: 'Auf dieser Seite nicht vorhanden, aber {count}-mal anderswo in der Datei: die Kopie geht von jenem Widget aus, mit seinen Einstellungen.',
    other: 'Auf dieser Seite nicht vorhanden, aber {count}-mal anderswo in der Datei: die Kopie geht von jenem Widget aus, mit seinen Einstellungen.'
  },

  /* ------------------------------------- die von der Sprachausgabe gelesene Beschriftung */

  'palette.spokenPro': 'Pro-Lizenz',
  'palette.spokenHereOnce': 'schon auf dieser Seite',
  'palette.spokenHereCount': {
    one: 'schon {count}-mal auf dieser Seite',
    other: 'schon {count}-mal auf dieser Seite'
  },
  'palette.spokenCopyFromPage':
    'wird mit den Einstellungen des Widgets dieser Seite kopiert',
  'palette.spokenCopyFromElsewhere':
    'wird mit den Einstellungen eines Widgets einer anderen Seite kopiert',
  'palette.spokenCreate': 'wird nur mit seinen Grundeinstellungen angelegt',

  /* -------------------------------------------- der Satz für die Rückgängig-Chronik */

  'palette.addCopyFromPage': '„{name}“ hinzufügen — Kopie eines Widgets dieser Seite',
  'palette.addCopyFromElsewhere':
    '„{name}“ hinzufügen — Kopie eines Widgets einer anderen Seite',
  'palette.addNew': '„{name}“ hinzufügen — neues Widget, Einstellungen XCTrack überlassen',

  /** Voir `messages/fr/widgets.ts` : d'où vient la copie, la page nommée. */
  'palette.elsewhereOnLandscape': 'anderswo — Seite {rank} im Querformat',
  'palette.elsewhereOnPortrait': 'anderswo — Seite {rank} im Hochformat',
  'palette.spokenCopyFromLandscape':
    'wird mit den Einstellungen des Widgets auf Seite {rank} im Querformat kopiert',
  'palette.spokenCopyFromPortrait':
    'wird mit den Einstellungen des Widgets auf Seite {rank} im Hochformat kopiert',
  'palette.addCopyFromLandscape':
    '„{name}“ hinzufügen — Kopie des Widgets auf Seite {rank} im Querformat',
  'palette.addCopyFromPortrait':
    '„{name}“ hinzufügen — Kopie des Widgets auf Seite {rank} im Hochformat',


  /* ========================================== widgetList.ts — die Widgets der Seite */

  'widgets.listTitle': 'Widgets der Seite',
  'widgets.listAria': 'Widgets der Seite, von hinten nach vorn',
  'widgets.emptyPage': 'Diese Seite trägt kein Widget.',
  'widgets.rankBack': 'Rang 1 · ganz hinten',
  'widgets.rankFront': 'Rang {rank} · ganz vorn',

  'widgets.unreachableHere': 'hier nicht erreichbar',
  'widgets.unreachableHereHelp':
    'In diesem Editor kann kein Klick auf die Seite dieses Widget erreichen: die höheren ' +
    'Ränge verdecken es vollständig, und diese Liste ist der einzige Weg dorthin. Auf dem ' +
    'Instrument bleibt es an seinem Platz — eine so verdeckte Aktionstaste antwortet ' +
    'weiterhin auf den Finger.',
  'widgets.nothingAtRestHelp':
    'Auf dem Gerät zeichnet dieser Typ im Ruhezustand nichts. Er nimmt dennoch seinen Platz ' +
    'ein und fängt Klicks ab wie jedes andere Widget.',

  'widgets.unreachableCount': {
    one: '{count} im Editor nicht erreichbar',
    other: '{count} im Editor nicht erreichbar'
  },
  'widgets.unreachableCountHelp':
    'Diese Widgets sind vollständig von höheren Rängen verdeckt: hier erreicht sie kein ' +
    'Klick auf die Seite, und diese Liste ist der einzige Weg dorthin. Auf dem Instrument ' +
    'bleiben sie an ihrem Platz — eine so verdeckte Aktionstaste antwortet weiterhin auf ' +
    'den Finger.',

  'widgets.spokenRank': 'Rang {rank} von {total}',
  'widgets.spokenSize': '{width} auf {height} Millimeter',
  'widgets.spokenUnreachable': 'in diesem Editor per Klick nicht erreichbar',
  'widgets.spokenNothingAtRest': 'zeichnet auf dem Gerät nichts'
}

export default widgets
