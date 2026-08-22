import type { DomainCatalog } from '../../domains'

/**
 * `sharingDialog.ts`, `warnings.ts` — voir `fr/sharing.ts` pour ce qui est tranché.
 *
 * **La gradation des trois issues** est portée par « alles / alles außer Ihnen / nur die
 * Seiten » : *Ihre Konfiguration, genau so wie sie ist* → *Alle Ihre Einstellungen, ohne
 * das, was Sie erkennbar macht* → *Teilbare Fassung, ohne persönliche Daten*. Aucun titre
 * ne promet *sicher*, qui ferait croire le deuxième cran plus protecteur que le troisième.
 *
 * *Widget*, substantif, donc capitale même au milieu d'une phrase — mesuré sur les 55
 * relevés, voir `fr/common.ts`. Vouvoiement (*Sie*) partout, comme `common.ts`.
 */
const sharing: DomainCatalog<'sharing'> = {
  /* ================== sharingDialog.ts — auswählen, was Sie aus der Hand geben */

  'sharing.dialogTitle': 'Diese Konfiguration speichern',
  'sharing.close': 'Schließen',
  'sharing.cancel': 'Abbrechen',
  'sharing.confirm': 'Speichern',
  'sharing.lead': 'Die erzeugte Datei trägt einen Namen mit Zeitstempel, der nichts vom ' +
    'ursprünglichen Namen übernimmt — dieser enthält oft einen Vornamen. Der Name ist also ' +
    'geregelt; zu wählen bleibt, was die Datei enthält.',
  'sharing.legend': 'Was soll gespeichert werden?',
  'sharing.curiousHead': 'Für Neugierige',
  'sharing.producedFileName': 'Name der erzeugten Datei: {name}',

  'sharing.choiceLabel': '{title}. {note}',

  'sharing.plainTitle': 'Ihre Konfiguration, genau so wie sie ist',
  'sharing.backupTitle': 'Alle Ihre Einstellungen, ohne das, was Sie erkennbar macht',
  'sharing.pagesTitle': 'Teilbare Fassung, ohne persönliche Daten',

  'sharing.plainContentPages': 'Ein „pages“-Export enthält keine Einstellungen, wohl aber ' +
    'die Texte, die Sie in den Widgets geschrieben haben.',
  'sharing.plainContentBackup': 'Sie enthält Ihre Einstellungen: Pilotenname, Schirm, ' +
    'gekoppelte Sensoren, Wegpunktdateien.',

  'sharing.plainTally': 'Sie enthält {layout} und {preferences}; alle davon gingen im Klartext hinaus.',
  'sharing.personalInLayout': {
    one: '{count} persönliche Angabe im Seitenaufbau',
    other: '{count} persönliche Angaben im Seitenaufbau'
  },
  'sharing.personalInPreferences': {
    one: '{count} in den Einstellungen',
    other: '{count} in den Einstellungen'
  },

  'sharing.backupNoteUnchanged': 'Die Datei bleibt eine vollständige Sicherung — Vario und ' +
    'seine Töne, Einheiten, Design, Luftraumschwellen, Tasten. Gerade diese Datei enthält ' +
    'nichts, was Sie erkennbar macht: es gibt darin also nichts zu ersetzen.',
  'sharing.backupNoteChanged': {
    one: 'Die Datei bleibt eine vollständige Sicherung — Vario und seine Töne, Einheiten, Design, Luftraumschwellen, Tasten. {count} Zeile, die Sie erkennbar macht, wird durch einen neutralen Wert ersetzt oder entfernt.',
    other: 'Die Datei bleibt eine vollständige Sicherung — Vario und seine Töne, Einheiten, Design, Luftraumschwellen, Tasten. {count} Zeilen, die Sie erkennbar machen, werden durch neutrale Werte ersetzt oder entfernt.'
  },
  'sharing.pagesNote': 'Ein „pages“-Export, dessen von Ihnen geschriebene Texte durch ' +
    'neutrale ersetzt werden. Der Seitenaufbau bleibt erhalten; die Einstellungen gehen ' +
    'nicht mit.',

  'sharing.fidelityUnchanged': 'Sie haben nichts geändert: die Datei kommt genau so wieder ' +
    'heraus, wie sie hineingegangen ist, ohne ein einziges neu geschriebenes Komma.',
  'sharing.fidelityUnchangedDetail': 'Die Bytes, die Sie geöffnet haben, werden erneut ' +
    'ausgegeben, ohne neu geschrieben zu werden: die SHA-256-Prüfsumme der erzeugten Datei ' +
    'ist die der ursprünglichen Datei — Sie können das nachprüfen.',
  'sharing.fidelityModified': 'Alles, was Sie nicht angefasst haben, wird unverändert ' +
    'übernommen — bis hin zu den Zahlen und den ursprünglichen Abständen. Nur das, was Sie ' +
    'geändert haben, ändert sich.',
  'sharing.fidelityModifiedDetail': 'Da die Datei neu geschrieben wird, unterscheidet sich ' +
    'ihre SHA-256-Prüfsumme von der der ursprünglichen Datei; bei einem unveränderten ' +
    'Dokument ist sie identisch.',

  'sharing.freeTextHeading': 'Ihre Texte in den Widgets',
  'sharing.freeTextNone': 'Kein eigener Text in den Widgets dieser Datei: hier gibt es ' +
    'nichts zu ersetzen.',
  'sharing.freeTextCount': {
    one: '{count} von Ihnen geschriebener Text wird ersetzt. Hier steht welcher und wo er sitzt. Er lebt im Seitenaufbau und nicht in den Einstellungen: er geht also mit, gleich welches Format die Datei hat.',
    other: '{count} von Ihnen geschriebene Texte werden ersetzt. Hier stehen welche und wo sie sitzen. Sie leben im Seitenaufbau und nicht in den Einstellungen: sie gehen also mit, gleich welches Format die Datei hat.'
  },

  'sharing.location': '{orientation} · Seite {page} · Widget {rank} · {name}',
  'sharing.orientationLandscape': 'Querformat',
  'sharing.orientationPortrait': 'Hochformat',

  'sharing.emptyValue': '(leer)',

  'sharing.otherPersonalInPreferences': {
    one: 'Diese Datei enthält außerdem {count} persönliche Angabe in ihren Einstellungen — Name, Ausrüstung, gekoppelte Sensoren, aktuelle Aufgabe. Sie wird nicht ersetzt: die teilbare Fassung oben nimmt nur die Seiten mit und lässt den ganzen Abschnitt „preferences“ zurück.',
    other: 'Diese Datei enthält außerdem {count} persönliche Angaben in ihren Einstellungen — Name, Ausrüstung, gekoppelte Sensoren, aktuelle Aufgabe. Sie werden nicht ersetzt: die teilbare Fassung oben nimmt nur die Seiten mit und lässt den ganzen Abschnitt „preferences“ zurück.'
  },

  'sharing.preferencesHeading': 'Ihre persönlichen Einstellungen, Zeile für Zeile',
  'sharing.preferencesNone': 'Diese Datei enthält keine der 44 Einstellungen, die XCTrack ' +
    'zu den persönlichen Daten zählt: hier gibt es nichts zu behandeln.',

  'sharing.preferencesFound': {
    one: '{count} persönliche Einstellung wurde in dieser Datei gefunden: {tally}. Jede Zeile sagt, was mit ihr geschieht und warum.',
    other: '{count} persönliche Einstellungen wurden in dieser Datei gefunden: {tally}. Jede Zeile sagt, was mit ihr geschieht und warum.'
  },
  'sharing.preferencesReplaced': { one: '{count} ersetzt', other: '{count} ersetzt' },
  'sharing.preferencesDropped': { one: '{count} entfernt', other: '{count} entfernt' },
  'sharing.preferencesKept': { one: '{count} behalten', other: '{count} behalten' },
  'sharing.preferencesEmpty': { one: '{count} leer', other: '{count} leer' },

  'sharing.treatmentReplace': 'Durch einen neutralen Wert ersetzt',
  'sharing.treatmentDrop': 'Aus der Datei entfernt',
  'sharing.treatmentKeep': 'Unverändert behalten, und hier steht warum',
  'sharing.treatmentEmpty': 'In der Datei vorhanden, aber leer',

  'sharing.droppedLine': 'die ganze Zeile wird entfernt',

  'sharing.backupResidualNote': 'Dieser Weg behandelt die 44 bekannten persönlichen ' +
    'Einstellungen von XCTrack und die elf Textfelder der Widgets. Das Format ändert sich ' +
    'mit jeder Version: eine seither hinzugekommene persönliche Einstellung stünde nicht ' +
    'auf der Liste und ginge im Klartext hinaus. Die teilbare Fassung weiter unten hängt ' +
    'von gar keiner Liste ab — sie überträgt überhaupt keine Einstellung.',

  'sharing.suspectsHeading': 'Was wie ein von Ihnen geschriebener Text aussieht',
  'sharing.suspectsCount': {
    one: '{count} Text steht auf keiner unserer Listen und sieht doch danach aus.',
    other: '{count} Texte stehen auf keiner unserer Listen und sehen doch danach aus.'
  },
  'sharing.suspectsNote': 'Diese Texte stehen auf keiner unserer Listen, und doch sehen ' +
    'sie nach etwas aus, das Sie geschrieben hätten. Sie gehen unverändert mit: wir ' +
    'ersetzen nicht, was wir nicht sicher wissen, weil wir sonst Einstellungen beschädigen ' +
    'würden. Nur Sie wissen, ob Sie sie geschrieben haben.',
  'sharing.suspectsNoneNote': 'Kein unerwarteter Text in dem, was mitgeht: alles, was oben ' +
    'nicht behandelt wird, hat die Gestalt einer Einstellung — ein aus einer Liste ' +
    'gewähltes Wort, eine Zahl — und nicht die eines geschriebenen Textes.',
  'sharing.suspectsMore': {
    one: '{count} weiterer Text derselben Art wird hier aus Platzgründen nicht gezeigt. Lesen Sie die erzeugte Datei durch, bevor Sie sie versenden.',
    other: '{count} weitere Texte derselben Art werden hier aus Platzgründen nicht gezeigt. Lesen Sie die erzeugte Datei durch, bevor Sie sie versenden.'
  },

  'sharing.backupCostHeading': 'Was die Empfängerin oder der Empfänger nicht bekommt',
  'sharing.backupCostIntro': 'Alle Ihre Einstellungen gehen mit — Vario und seine Töne, ' +
    'Einheiten, Design, Luftraumschwellen, Tasten. Nicht mitgehen werden Ihre eigenen ' +
    'Betriebsmittel:',
  'sharing.backupCostOutro': 'Keine dieser Zeilen ist eine Einstellung: es sind Dateien ' +
    'und Geräte, die bei Ihnen zu Hause sind und mit denen die Gegenseite nichts hätte ' +
    'anfangen können.',

  'sharing.backupCostSensors': 'Ihre gekoppelten Sensoren: die Gegenseite koppelt ihre ' +
    'eigenen, die einzigen, die sie benutzen kann;',
  'sharing.backupCostTask': 'Ihre aktuelle Aufgabe, ihre Wendepunkte und deren Koordinaten;',
  'sharing.backupCostFiles': 'Ihre Wegpunkt- und Luftraumdateien sowie das Kartendesign, ' +
    'das Sie installiert haben — Dateien Ihres Geräts;',
  'sharing.backupCostOfflineMaps': 'Ihre Offline-Karten, aus demselben Grund;',
  'sharing.backupCostQuickMessages': 'Ihre Livetracking-Kurznachrichten, die Ihre eigenen ' +
    'Sätze sind.',

  'sharing.anonymousCostIntro': 'Was die Gegenseite also nicht bekommt und selbst ' +
    'einstellen muss:',
  'sharing.anonymousCostOutro': 'Sie bekommt den Aufbau Ihrer Seiten, nicht Ihre ' +
    'Einstellungen. Das ist meist genau das, was man will — ihre Einheiten sind nicht ' +
    'unbedingt Ihre —, aber man muss es vor dem Versenden wissen.',

  'sharing.anonymousCostUnits': 'die Einheiten — Höhen, Entfernungen, Geschwindigkeiten: ' +
    'sie behält ihre eigenen;',
  'sharing.anonymousCostTheme': 'das Anzeigedesign sowie Größe und Farbe der Widget-Titel;',
  'sharing.anonymousCostVario': 'die Einstellungen des Varios und seiner Töne;',
  'sharing.anonymousCostAirspace': 'die Luftraumschwellen und -kanäle;',
  'sharing.anonymousCostLivetracking': 'das Livetracking und seine Zugangsdaten;',
  'sharing.anonymousCostSensors': 'die gekoppelten Bluetooth-Sensoren.',

  'sharing.droppedHeading': 'Was nicht mitgeht',
  'sharing.droppedNothing': 'Diese Datei ist bereits ein „pages“-Export: sie enthält keine ' +
    'Einstellung, es gibt also nichts daraus zu entfernen.',
  'sharing.droppedIntro': {
    one: 'Die geteilte Datei ist ein „pages“-Export: sie enthält nur Ihre Seiten. Dieser ' +
      'ganze Abschnitt bleibt bei Ihnen.',
    other: 'Die geteilte Datei ist ein „pages“-Export: sie enthält nur Ihre Seiten. Diese ' +
      'ganzen Abschnitte bleiben bei Ihnen.'
  },

  'sharing.droppedPreferences': 'Alle Ihre Einstellungen: Pilotenname, Schirm, Einheiten, ' +
    'Design, Einstellungen des Varios und seiner Töne, Luftraumschwellen, Livetracking, ' +
    'gekoppelte Bluetooth-Sensoren, Wegpunktdateien.',
  'sharing.droppedAirspaceChannels': 'Die Luftraumkanäle, die Sie ausgewählt haben.',
  'sharing.droppedUnknownSection': 'Der Abschnitt „{key}“, den ein „pages“-Export nicht überträgt.',

  'sharing.annexesHeading': 'Die Anhänge des Archivs',
  'sharing.annexesNote': 'Ein .xczfg-Archiv überträgt beigelegte Dateien, die dieser ' +
    'Editor nicht untersucht — weder ihren Inhalt noch die Metadaten eines Bildes, in ' +
    'denen ein Foto häufig die Koordinaten des Aufnahmeorts trägt. Die teilbare Fassung ' +
    'wird deshalb als nacktes .xcfg geschrieben, ohne sie. Nichts Brauchbares geht dabei ' +
    'verloren: die äußeren Betriebsmittel einer Konfiguration werden aus den Einstellungen ' +
    'heraus benannt, und die gehen ebenfalls nicht mit.',

  'sharing.residualNote': 'Die Liste der elf behandelten Textfelder ist fest, und das ' +
    'XCTrack-Format ändert sich mit jeder Version: ein seither hinzugekommenes Textfeld ' +
    'ginge im Klartext hinaus. Lesen Sie das Verzeichnis oben durch, bevor Sie die Datei ' +
    'versenden — es ist die Prüfung, nicht das Versprechen dieses Werkzeugs.',

  'sharing.personalHeading': 'Alles Persönliche, das diese Datei enthält: {total} — {layout} im Seitenaufbau, {preferences} in den Einstellungen',
  'sharing.personalFilled': {
    one: '{count} ist ausgefüllt',
    other: '{count} sind ausgefüllt'
  },
  'sharing.personalEmpty': {
    one: '{count} ist ein vorhandener, aber leerer Platz',
    other: '{count} sind vorhandene, aber leere Plätze'
  },
  'sharing.personalTravelsNote': 'Nur die im Seitenaufbau gehen mit einem „pages“-Export mit.',

  /* ================== warnings.ts — was Sie über diese Datei wissen müssen */

  'warnings.exportPagesTitle': '„pages“-Export: nur die Bildschirme',
  'warnings.exportPagesDetail': 'Diese Datei enthält nur die Widget-Seiten. Wieder in ' +
    'XCTrack eingelesen, ersetzt sie die Bildschirme und rührt sonst nichts an: ' +
    'Vario-Einstellungen, Einheiten, Luftraumdateien und Sensorkonfiguration bleiben die ' +
    'des Geräts.',
  'warnings.exportBackupTitle': '„backup“-Export: die ganze Konfiguration',
  'warnings.exportBackupDetail': 'Diese Datei enthält die ganze Konfiguration. Wieder in ' +
    'XCTrack eingelesen, überschreibt sie nicht nur die Bildschirme, sondern auch die ' +
    'Vario-Einstellungen, die Einheiten, die Luftraumdateien und die Sensorkonfiguration ' +
    'des Geräts.',
  'warnings.exportUnknownTitle': 'Exportart unbestimmt',
  'warnings.exportUnknownDetail': 'Diese Datei sagt nicht, ob sie nur Seiten oder die ' +
    'ganze Konfiguration enthält (info.exportType fehlt oder ist unbekannt). Was sie ' +
    'beim Wiedereinlesen überschreiben wird, lässt sich hier also nicht ankündigen.',
  'warnings.exportUnknownItem': 'info.exportType: „{type}“',

  'warnings.assumedValuesTitle': 'Design, Einheiten und Schrift angenommen',
  'warnings.assumedValuesDetail': 'Diese Datei enthält keine Einstellung: das Design, die ' +
    'Einheiten und die Titelgröße, mit denen diese Seiten gezeichnet werden, sind ' +
    'anderswo erhobene Werkswerte, nicht die Ihres Geräts. Die Geometrie dagegen stammt ' +
    'sehr wohl aus der Datei.',
  'warnings.assumedTheme': 'Design: {theme}',
  'warnings.assumedUnits': 'Höhe: {altitude} · Geschwindigkeit: {speed} · Vario: {vario}',
  'warnings.assumedTitles': 'Titel: {percent} %, {font}',
  'warnings.assumedLanguageTitle': 'Sprache der Beschriftungen unbestimmt',
  'warnings.assumedLanguageDetail': 'Diese Datei gibt keine Anzeigesprache an: auf dem Gerät folgt XCTrack dann der Sprache des Android-Systems — niemals ersatzweise dem Englischen. In Ermangelung von Besserem werden die Beschriftungen hier in {language} angezeigt — der Sprache, die Sie für diese Oberfläche gewählt haben, sonst der Ihres Browsers. Die Zeile, die sie tragen würde, Display.Language, ist leer oder fehlt in der Datei.',

  'warnings.personalLayoutTitle': 'Ihre Seiten enthalten Texte von Ihnen',
  'warnings.personalTitle': 'Diese Datei nennt Sie beim Namen',
  'warnings.personalPreferenceCount': {
    one: '{count} ausgefüllte persönliche Einstellung',
    other: '{count} ausgefüllte persönliche Einstellungen'
  },
  'warnings.personalLayoutCount': {
    one: '{count} in einem Widget geschriebenen Text',
    other: '{count} in den Widgets geschriebene Texte'
  },
  'warnings.personalDetailLead': 'Diese Datei enthält {preferences} und {layout}, die Sie erkennbar machen: Ihren Namen, Ihre Ausrüstung, Ihre Übertragungsentscheidungen, Ihre aktuelle Aufgabe samt Koordinaten, und bis hin zu dem Wettbewerb, an dem Sie teilnehmen — die Namen der Wegpunktdateien benennen ihn.',
  'warnings.personalTravels': {
    one: '{count} in einem Widget geschriebener Text geht selbst mit einem „pages“-Export mit: dieses Format ist eine grobe Sortierung, keine Reinigung.',
    other: '{count} in den Widgets geschriebene Texte gehen selbst mit einem „pages“-Export mit: dieses Format ist eine grobe Sortierung, keine Reinigung.'
  },
  'warnings.personalEmptySlots': {
    one: '{count} persönlicher Platz ist vorhanden, aber leer — er wird hier nicht aufgeführt.',
    other: '{count} persönliche Plätze sind vorhanden, aber leer — sie werden hier nicht aufgeführt.'
  },
  'warnings.personalDetailTail': 'Dieses Werkzeug entfernt nichts im Stillen: die Datei ' +
    'kommt so heraus, wie sie hineingegangen ist. Sie entscheiden.',
  'warnings.personalItem': '{key} — {kind}: {value}',

  'warnings.externalTitle': 'Äußere Dateien angesprochen',
  'warnings.externalDetail': 'Diese Namen bezeichnen Dateien, die auf dem ursprünglichen ' +
    'Gerät vorhanden sind, nicht in dieser Konfiguration. Eine von einem anderen Piloten ' +
    'erhaltene Konfiguration verweist auf Dateien, die nur er besitzt: XCTrack wird sie auf ' +
    'Ihrer SD-Karte suchen und nicht finden. Dieses Werkzeug listet sie auf, es berichtigt ' +
    'sie nicht. Die drei Zeilen der Datei, die solche Namen tragen können: ' +
    'Mapsforge.ThemeFile, Navigation.WaypointFiles und Airspace.Files.',
  'warnings.externalMapTheme': 'Kartendesign: {file}',
  'warnings.externalWaypoints': 'Wegpunkte: {file}',
  'warnings.externalAirspace': 'Luftraum: {file}',

  'warnings.versionUnknownTitle': 'XCTrack-Version unbekannt',
  'warnings.versionUnknownDetail': 'Diese Datei sagt nicht, aus welcher Version von XCTrack sie stammt. Der Abstand zur Bezugsversion dieses Werkzeugs ({reference}) lässt sich also nicht messen; was angezeigt wird, kann seither seine Bedeutung geändert haben. Die Zeile, die es sagen würde, info.versionCode, fehlt.',
  'warnings.versionOlderTitle': 'Datei älter als das Werkzeug',
  'warnings.versionNewerTitle': 'Datei neuer als das Werkzeug',
  'warnings.versionGapDetail': 'Diese Datei stammt aus Version {name}, während sich dieser Editor zum Zeichnen auf Version {reference} einstellt. Das Format ändert sich mit jeder Version: Einstellungen können anders gezeichnet werden, als sie es auf dem Gerät sein werden. Die Datei wird deswegen nicht verändert — sie kommt so heraus, wie sie hineingegangen ist, ohne ein einziges neu geschriebenes Komma. Was die Datei zu ihrer Version schreibt: versionCode {code}.',
  'warnings.versionNameUnknown': 'unbekannt',

  'warnings.structureTitle': 'Unerwarteter Aufbau',
  'warnings.structureDetail': 'Dieser Editor hat einen Teil dieser Datei nicht erkannt. Die ' +
    'Darstellung ist dort eingeschränkt, wo die Auskunft fehlt, aber nichts geht verloren: ' +
    'das Dokument bleibt unversehrt und kommt unverändert heraus.',
  'warnings.where': '{orientation}, Seite {page}',
  'warnings.structureNoClass': '{where}: diese Seite gibt ihre Art nicht an',
  'warnings.structureNavigations': '{where}: dieses Werkzeug kann nicht sagen, wann diese Seite erscheint — der Wert „navigations“ ist weder „all“ noch „none“ noch eine Liste',
  'warnings.structureMissingKeys': {
    one: '{where}, Widget {rank}: Zeile {keys} fehlt',
    other: '{where}, Widget {rank}: Zeilen {keys} fehlen'
  },
  'warnings.structureDuplicate': 'Doppelte Zeile: {path}',

  'warnings.geometryTitle': 'Geometriefehler',
  'warnings.geometryDetail': 'Diese Widgets können sich nicht so zeigen, wie ihr Urheber ' +
    'es sich erhofft hat: Kasten ohne Breite oder Höhe, Koordinaten außerhalb der Grenzen ' +
    'oder Widget vollständig unter einem anderen verborgen, dessen Wert es nie zeigen ' +
    'wird. Bloße Überlappungen werden nicht gemeldet: sie sind auf einer Karte oder einem ' +
    'Thermikassistenten normal.',
  'warnings.who': '{where}, Widget {rank} ({name})',
  'warnings.cover': 'Widget {rank} ({name})',
  'warnings.box': 'X1 {x1}, Y1 {y1}, X2 {x2}, Y2 {y2}',
  'warnings.geometryZeroWidth': '{who}: Breite null, es hat keinerlei Fläche — {box}',
  'warnings.geometryZeroHeight': '{who}: Höhe null, es hat keinerlei Fläche — {box}',
  'warnings.geometryOutside': '{who}: ragt aus der Seite, {edge} liegt bei {value} — {box}',
  'warnings.edgeLeft': 'sein linker Rand',
  'warnings.edgeTop': 'sein oberer Rand',
  'warnings.edgeRight': 'sein rechter Rand',
  'warnings.edgeBottom': 'sein unterer Rand',
  'warnings.geometryCovered': '{who}: von {cover} verdeckt, wird also nichts anzeigen',
  'warnings.geometryCoveredButton': '{who}: von {cover} verdeckt, reagiert aber weiterhin auf den Finger',

  'warnings.coveredButtonsTitle': 'Aktionstasten verdeckt, und das ist wohl so gewollt',
  'warnings.coveredButtonsDetail': 'Ein anderes Widget liegt über diesen Tasten und ' +
    'verdeckt sie vollständig: auf dem Gerät werden Sie sie nicht sehen. Sie reagieren ' +
    'aber weiterhin auf den Finger — ein Druck an dieser Stelle löst ihre Aktion aus, auch ' +
    'wenn Sie dort die Karte oder den Thermikassistenten sehen. Das ist ein verbreiteter ' +
    'Aufbau und kein Fehler: er gibt einen Befehl dort, wo der Bildschirm schon belegt ' +
    'ist. Nichts zu berichtigen, außer die Überlagerung überrascht Sie.',

  'warnings.themeTitle': 'Gezeichnetes Design weicht vom angegebenen ab',
  'warnings.themeDetail': 'Diese Seiten werden hier mit dem Design {theme} gezeichnet, dem einzigen, das am Gerät beobachtet wurde. Die Datei verlangt ein anderes: die Farben und Kontraste, die Sie sehen, sind also nicht die Ihres Geräts. Die Geometrie dagegen stimmt — und die Datei wird deswegen nicht verändert.',
  'warnings.themeFileKnown': 'Design der Datei: {theme}',
  'warnings.themeFileUnknown': 'Design der Datei: {theme} (diesem Werkzeug unbekanntes Design)',
  'warnings.themePerWidget': {
    one: '{count} Widget in {theme}',
    other: '{count} Widgets in {theme}'
  },

  'warnings.hypothesisTitle': '{title} — am Gerät zu bestätigen',
  'warnings.hypothesisLead': 'Das ist kein gemessener Befund, sondern eine Frage, und hier ' +
    'steht, was sie entscheiden würde.',
  'warnings.preflightItem': '{where}: {message}'
}

export default sharing
