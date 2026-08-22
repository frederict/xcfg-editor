import type { DomainCatalog } from '../../domains'

/**
 * `libraryPanel.ts` — die Bibliothek der benannten Konfigurationen.
 *
 * *zurücklegen*, nie *wiederherstellen*: Das französische « rétablir » deckt drei Gesten
 * ab, und diese hier gehört der Bibliothek. *Wiederholen* lebt in `app`, das Zurücksetzen
 * beim Zoom.
 */
const library: DomainCatalog<'library'> = {
  /* ------------------------------------------------------------------ Kopf und Fuß */

  'library.panelLabel': 'Konfigurationsbibliothek',
  'library.title': 'Meine Konfigurationen',
  'library.lead':
    'Bewahren Sie mehrere Konfigurationen unter einem Namen in diesem Browser auf und kehren Sie jederzeit zu einer davon zurück. Nichts wird irgendwohin gesendet: Alles bleibt auf diesem Gerät. Abgelegt werden die Bytes Ihrer Datei, nie eine neu geschriebene Kopie.',
  'library.storeCurrent': 'Geöffnete Konfiguration ablegen',
  'library.addFile': 'Eine Datei ablegen…',
  'library.exportAll': 'Bibliothek exportieren',
  'library.importAll': 'Eine Bibliothek importieren…',
  'library.close': 'Schließen',

  'library.empty':
    'Noch nichts abgelegt. Legen Sie die geöffnete Konfiguration ab, oder ziehen Sie eine bereits exportierte .xcfg-Datei hierher: Sie behält ihren Namen, ihr Datum und ihre Bytes.',

  'library.footCount': {
    one: '{count} abgelegte Konfiguration{size}{broken}.',
    other: '{count} abgelegte Konfigurationen{size}{broken}.'
  },
  'library.footTotalSize': ' — {size} insgesamt',
  'library.footBroken': {
    one: ', {count} unlesbarer Eintrag',
    other: ', {count} unlesbare Einträge'
  },

  /* ---------------------------------------------------------- die Ablage des Browsers */

  'library.notDurableTitle': 'Ablage ist nicht dauerhaft',
  'library.notDurableText':
    'Dieser Browser gewährt dieser Seite keine dauerhafte Ablage: Was Sie hier ablegen, lebt so lange wie der Tab und verschwindet dann. Die Bibliothek bleibt nutzbar — aber sie ist keine Sicherung. Exportieren Sie sie, bevor Sie schließen.',

  'library.preventErase': 'Den Browser daran hindern, meine Bibliothek zu löschen',
  'library.persistenceGranted':
    'Der Browser hat zugestimmt. Eine Garantie ist das nie: Manche löschen die Daten einer sieben Tage lang nicht besuchten Seite trotzdem. Die einzige Sicherung, die hält, ist das Archiv, das Sie exportieren.',
  'library.persistenceDenied':
    'Der Browser hat abgelehnt. Die Bibliothek funktioniert weiter, aber er kann sie löschen: Exportieren Sie sie regelmäßig.',
  'library.persistenceUnsupported':
    'Dieser Browser bietet diese Einstellung nicht an. Exportieren Sie Ihre Bibliothek regelmäßig.',

  'library.storageUnknown': 'Dieser Browser sagt nichts über den verfügbaren Platz.',
  'library.storageEstimate':
    'Von dieser Seite belegter Platz: {usage} von {quota} gewährten — der Browser nennt nur eine Größenordnung.',

  /* ----------------------------------------------------------- die Ebenen des Felds */

  'library.backToList': '← Zurück zur Liste',
  'library.back': '← Zurück',
  'library.returnToList': 'Zurück zur Liste',
  'library.cancel': 'Abbrechen',
  'library.announceBackToList': 'Zurück zur Liste der Konfigurationen.',
  'library.announceBackTo': 'Zurück: {title}.',

  /* -------------------------------------------------- die Schaltflächen eines Eintrags */

  'library.load': 'Laden',
  'library.extract': 'Die Datei wieder herausgeben',
  'library.identity': 'Steckbrief',
  'library.verify': 'Prüfsumme prüfen',
  'library.rename': 'Umbenennen',
  'library.remove': 'Löschen',
  'library.store': 'Ablegen',
  'library.save': 'Speichern',

  /* ------------------------------------------------------ ein Eintrag in der Liste */

  'library.entryStamp': 'Abgelegt am {when} · {file}',
  'library.unknownFileName': 'unbekannte Datei',
  'library.previewStored': 'Vorschau abgelegt',
  'library.chipArchive': '.xczfg-Archiv',
  'library.personalCount': {
    one: '{count} persönliche Angabe',
    other: '{count} persönliche Angaben'
  },
  'library.personalTravellingCount': {
    one: '{count} geht mit den Seiten mit',
    other: '{count} gehen mit den Seiten mit'
  },

  /* ------------------------------------------------------------------- das Exportformat */

  'library.exportTypeBackup': 'Vollständige Sicherung (Seiten und Einstellungen)',
  'library.exportTypePages': 'Nur Seiten (keine Einstellung)',
  'library.exportTypeUndeclared': 'Von der Datei nicht angegeben',
  'library.chipBackup': 'Sicherung',
  'library.chipPages': 'Nur Seiten',
  'library.chipUndeclared': 'Art nicht angegeben',

  /* ------------------------------------------ Steckbrief: was die Datei angibt */

  'library.identityTitle': 'Steckbrief — {name}',
  'library.identityLead':
    'Zwei Hälften, nie vermischt: was die Datei angibt, und was dieser Editor darüber annimmt. Alles Angenommene kann falsch sein, ohne dass die Datei schuld wäre.',
  'library.readNote':
    'So gelesen, wie es in den abgelegten Bytes steht. Ein fehlendes Feld wird als fehlend genannt, nie durch einen Vorgabewert ersetzt.',
  'library.assumedNote':
    'Nichts davon steht in der Datei. Das Gerät und seine Auflösung stammen aus unserer Tabelle; dass ein Widget der Pro-Version vorbehalten ist, stammt aus einem aus dem APK gewonnenen Katalog.',

  'library.factExportType': 'Exportformat',
  'library.factExportTypeNote': 'Schlüssel info.exportType.',

  'library.factContainer': 'Container',
  'library.containerArchive': {
    one: '.xczfg-Archiv — {count} zusätzliche Datei',
    other: '.xczfg-Archiv — {count} zusätzliche Dateien'
  },
  'library.containerPlain': '.xcfg-Datei',
  'library.containerExtrasNote': 'Zusätzlich: {names}. Dieser Editor sieht sich deren Inhalt nicht an.',

  'library.factSize': 'Größe',

  'library.factVersion': 'Angegebene XCTrack-Version',
  'library.versionAbsent': 'Die Datei nennt sie nicht',
  'library.versionValue': '{name} — Code {code}',
  'library.versionNameAbsent': '(Name fehlt)',
  'library.versionCodeAbsent': '(fehlt)',
  'library.factVersionNote': 'Schlüssel info.versionName und info.versionCode.',

  'library.factDevice': 'Angegebenes Gerät',
  'library.deviceAbsent': 'Die Datei nennt es nicht',
  'library.factDeviceNote': 'Roher Text aus info.device. Er enthält keine Auflösung.',

  'library.factPages': 'Seiten',
  'library.noPage': 'keine Seite',
  'library.landscapePageCount': {
    one: '{count} Querformatseite',
    other: '{count} Querformatseiten'
  },
  'library.portraitPageCount': {
    one: '{count} Hochformatseite',
    other: '{count} Hochformatseiten'
  },

  'library.factWidgets': 'Widgets',
  'library.widgetsOfTypes': {
    one: '{count} Widget aus {types}',
    other: '{count} Widgets aus {types}'
  },
  'library.typeCount': { one: '{count} Typ', other: '{count} Typen' },
  'library.topTypesNote': 'Am häufigsten: {types}.',

  'library.factRootSections': 'Abschnitte der obersten Ebene',
  'library.noRootSection': 'keine',

  'library.factSettings': 'Abgelegte Einstellungen',
  'library.settingsNone': 'keine — diese Datei trägt Ihre Einstellungen nicht mit',
  'library.settingLineCount': { one: '{count} Zeile', other: '{count} Zeilen' },
  'library.settingsNote':
    'Dieser Editor kann nur einige Familien davon benennen: Die Zahl steht hier, damit der Rest sichtbar bleibt.',

  'library.factDuplicates': 'Doppelte Zeilen',
  'library.duplicateLineCount': {
    one: '{count} doppelte Zeile',
    other: '{count} doppelte Zeilen'
  },
  'library.duplicatesNote': 'XCTrack liest nur eine davon: {keys}.',

  'library.factExternal': 'Erwartete äußere Ressourcen',
  'library.externalNote':
    'Diese Dateien müssen auf dem Zielgerät vorhanden sein; in der Konfiguration stehen sie nicht.',

  'library.factParse': 'Auswertung',
  'library.parseFailed': 'Der Inhalt konnte nicht ausgewertet werden',
  'library.parseNote':
    'Die Bytes sind abgelegt und kommen unverändert wieder heraus; es fehlt ihre Beschreibung. Technische Einzelheit: {detail}.',

  /* ------------------------------------ Steckbrief: was der Editor annimmt */

  'library.factScreen': 'Gewähltes Bildschirmmuster',
  'library.screenFallback': '{device} — Ausweichmuster, kein Gerät erkannt',
  'library.factScreenNote':
    'Die Auflösung stammt aus der Gerätetabelle dieses Editors, nicht aus der Datei.',

  'library.factPro': '„Pro“-Widgets',
  'library.proUnknown': 'Unbekannt — es wurde kein Widget-Katalog geliefert',
  'library.proNone': 'Keine',
  'library.proUnknownNote':
    'Ob ein Widget der Pro-Version vorbehalten ist, raten wir nicht: ohne Katalog sagen wir nichts.',
  'library.proNote': 'Nach dem aus dem APK 1.0.3-beta5 gewonnenen Katalog, nicht nach der Datei.',

  'library.factVersionGap': 'Stand der Version',
  'library.versionGapOlder': 'Älter als die, für die dieser Editor zeichnet',
  'library.versionGapSame': 'Die, für die dieser Editor zeichnet',
  'library.versionGapNewer': 'Neuer als die, für die dieser Editor zeichnet',
  'library.versionGapUnknown': 'Die Datei sagt nicht, aus welcher Version sie stammt',
  'library.factVersionGapNote':
    'Dieser Editor richtet seine Zeichnung nach einer bestimmten Version von XCTrack; mit ihr wird diese Datei verglichen, nicht mit der auf Ihrem Gerät.',

  'library.factPersonalTravels': 'Persönliche Angaben, die mit den Seiten mitgehen',
  'library.personalTravelsYes': 'Ja — die Anordnung trägt mindestens einen von Ihnen geschriebenen Text',
  'library.personalTravelsNo': 'Nein — kein freier Text in der Anordnung gefunden',
  'library.personalTravelsYesNote':
    'Ein Export „Seiten“ ist damit von Haus aus nicht anonym: Name und Nummer einer Anruftaste stehen in der Anordnung, nicht in den Einstellungen.',
  'library.personalTravelsNoNote':
    'Die Liste der Freitextfelder ist fest und wird veralten: Sie beweist kein Fehlen.',

  /* --------------------------------------------------------- der Eintrag selbst */

  'library.entryItself': 'Der Eintrag selbst',
  'library.fieldName': 'Name',
  'library.factOriginalFile': 'Ursprüngliche Datei',
  'library.unknownOriginalFile': '(unbekannt)',
  'library.factStoredOn': 'Abgelegt am',
  'library.factLastWrite': 'Letzte Schreibung',
  'library.factDigest': 'SHA-256-Prüfsumme',
  'library.yourNote': 'Ihre Notiz: {note}',

  'library.timesStored': {
    one: 'nur einmal gespeichert',
    other: '{count}-mal gespeichert'
  },

  /* ------------------------------------- was der Eintrag an Persönlichem trägt */

  'library.personalHeading': 'Was dieser Eintrag an Persönlichem trägt',
  'library.noPersonalData': 'Keine persönlichen Angaben entdeckt. {caveat}',
  'library.personalSummary':
    '{total} in diesem Eintrag: {layout} in der Anordnung, die mit den Seiten mitgeht, und {preferences} in den Einstellungen, die bei einem Export „Seiten“ bei Ihnen bleiben. {filled}, {empty}. Sie werden gezeigt, nie entfernt: Sie entscheiden.',
  'library.personalTotal': {
    one: '{count} persönliche Angabe ist vorhanden',
    other: '{count} persönliche Angaben sind vorhanden'
  },
  'library.personalFilled': {
    one: '{count} ist ausgefüllt',
    other: '{count} sind ausgefüllt'
  },
  'library.personalEmpty': {
    one: '{count} ist ein leerer Platz',
    other: '{count} sind leere Plätze'
  },
  'library.basisReadInApp': 'in der Anwendung gelesen',
  'library.basisJudgedHere': 'von diesem Editor beurteilt',
  'library.travelsCaveat':
    'Die mit „geht mit den Seiten mit“ gekennzeichneten Zeilen stehen in der Anordnung: Sie gehen auch bei einem Export „Seiten“ mit. Ein „Seiten“ abzuleiten ist eine grobe Sortierung, keine Säuberung.',

  /* ------------------------------------------------------------------- die Vorschau */

  'library.previewHeading': 'Vorschau',
  'library.previewNote':
    'Der Platz ist in der Bibliothek vorgesehen, aber dieses Feld erzeugt kein Bild: Das Zeichnen einer Seite gehört der Zeichenmaschine. An dem Tag, an dem sie es liefert, muss sich weder die Ablage noch die Form des Eintrags ändern.',

  /* ---------------------------------------------------------------------- ablegen */

  'library.storeLead':
    'Geben Sie ihr einen Namen, den Sie in sechs Monaten wiedererkennen — „Comp Annecy“, „Vol-biv Alpes“, „École“. Abgelegt wird Ihre Datei selbst, ohne ein einziges neu geschriebenes Komma.',
  'library.fieldNoteOptional': 'Notiz (freiwillig)',
  'library.noteHint':
    'Was Sie wollen: das Fluggebiet, der Schirm, die Vario-Einstellung. Wird nie ausgewertet.',
  'library.stored': '„{name}“ ist abgelegt — {size}, Prüfsumme {digest}…',
  'library.noOpenFile':
    'Keine Datei ist geöffnet: Öffnen Sie eine Konfiguration, oder legen Sie eine Datei von der Festplatte ab.',

  'library.storedLine': '„{name}“ ist abgelegt — {size}, {when}.',

  /* ----------------------------------------------------------------------- laden */

  'library.loaded': '„{name}“ ist geladen — {size}, Bytes gegen ihre Prüfsumme geprüft.',
  'library.unsavedTitle': 'Änderungen sind nicht gespeichert',
  'library.unsavedBody':
    'Das geöffnete Dokument — „{file}“ — trägt Änderungen, die Sie nicht gespeichert haben. „{name}“ zu laden ersetzt sie im Editor.',
  'library.storeFirstCaveat':
    'Erst abzulegen kostet nichts: Die geöffnete Konfiguration bekommt einen Namen in der Bibliothek, und Sie kehren mit einem Klick zu ihr zurück.',
  'library.storeThenLoad': 'Erst ablegen, dann laden',
  'library.loadWithoutStoring': 'Ohne Ablegen laden',

  /* -------------------------------------------------------- die Datei herausgeben */

  'library.extracted': {
    one: '„{name}“ kommt so heraus, wie sie hineinkam: {count} Byte, Prüfsumme geprüft.',
    other: '„{name}“ kommt so heraus, wie sie hineinkam: {count} Bytes, Prüfsumme geprüft.'
  },

  /* ------------------------------------------------------------------ die Prüfsumme */

  'library.digestTitle': 'Prüfsumme — {name}',
  'library.verifyNote':
    'Die Prüfsumme wurde beim Ablegen auf die abgelegten Bytes gesetzt. Diese hier wurde soeben auf dem berechnet, was die Bibliothek jetzt herausgibt.',
  'library.digestStored': 'Gespeichert',
  'library.digestFresh': 'Soeben neu berechnet',
  'library.digestMissing': 'keine — die Bytes wurden nicht herausgegeben',
  'library.sizeUnreadable': 'unlesbar — {expected} erwartet',
  'library.sizeCompared': {
    one: '{count} Byte — {expected} erwartet',
    other: '{count} Bytes — {expected} erwartet'
  },
  'library.digestSame':
    'Gleich: Die abgelegten Bytes sind genau die der ursprünglichen Datei.',
  'library.digestDiffers': 'Verschieden — dieser Eintrag wird nicht zurückgegeben.',

  /* ----------------------------------------------------------------------- löschen */

  'library.removeTitle': '„{name}“ löschen?',
  'library.removeBody':
    '„{name}“ und ihre {size} an Bytes werden aus diesem Browser entfernt. Diese Bibliothek hat keinen Papierkorb.',
  'library.removeCaveat':
    'Wenn Sie unsicher sind: Geben Sie zuerst die Datei heraus, oder exportieren Sie die ganze Bibliothek.',
  'library.removed': '„{name}“ wurde gelöscht.',

  /* --------------------------------------------------------- der unlesbare Eintrag */

  'library.brokenName': 'Unlesbarer Eintrag',
  'library.brokenNote':
    'Er hindert die anderen nicht daran, sich zu zeigen, und bleibt löschbar. Seine Bytes werden nicht exportiert: Man schreibt nicht in eine Sicherung, was man nicht zurückgeben könnte.',
  'library.brokenBody':
    'Dieser Eintrag lässt sich nicht mehr lesen: Wir wissen nicht, was er enthielt. Ihn zu löschen gibt seinen Platz frei und verliert nichts Lesbares.',
  'library.brokenTechnical': 'Interne Kennung {id}. Technische Einzelheit: {reason}.',
  'library.removeBrokenTitle': 'Diesen unlesbaren Eintrag löschen?',
  'library.brokenRemoved': 'Der unlesbare Eintrag wurde gelöscht.',
  'library.brokenHeading': {
    one: '{count} Eintrag, der sich nicht mehr lesen lässt',
    other: '{count} Einträge, die sich nicht mehr lesen lassen'
  },

  /* -------------------------------------------------- exportieren und importieren */

  'library.exported': {
    one: '{count} Konfiguration in ein ZIP-Archiv exportiert. Jede .xcfg lässt sich mit jedem Entpacker daraus holen.{tail}',
    other: '{count} Konfigurationen in ein ZIP-Archiv exportiert. Jede .xcfg lässt sich mit jedem Entpacker daraus holen.{tail}'
  },
  'library.exportSkipped': {
    one: ' {count} unlesbarer Eintrag ist nicht darin: Die Sicherung ist unvollständig, und sagt es.',
    other: ' {count} unlesbare Einträge sind nicht darin: Die Sicherung ist unvollständig, und sagt es.'
  },

  'library.importTitle': 'Bibliothek importiert',
  'library.importLead':
    'Archiv exportiert am {when}. Kein bestehender Eintrag wurde überschrieben: Ein bereits unter anderen Bytes vorhandener Eintrag wird mit einem Zusatz daneben zurückgelegt.',
  'library.outcomeImported': 'zurückgelegt',
  'library.outcomeAlreadyPresent': 'schon vorhanden, nichts zu tun',
  'library.outcomeDuplicated': 'daneben zurückgelegt: die Kennung war bereits vergeben',
  'library.outcomeRejected': 'abgelehnt',
  'library.imported': {
    one: '{count} Eintrag im Archiv gelesen.',
    other: '{count} Einträge im Archiv gelesen.'
  },
  'library.importedWithRejected': {
    one: '{count} Eintrag im Archiv gelesen — {rejected}.',
    other: '{count} Einträge im Archiv gelesen — {rejected}.'
  },
  'library.rejectedCount': { one: '{count} abgelehnt', other: '{count} abgelehnt' },

  /* --------------------------------------------- was scheitert, und sein Ausweg */

  'library.exportNow': 'Bibliothek jetzt exportieren',
  'library.reloadLibrary': 'Bibliothek neu laden',
  'library.conflict':
    '{message} Nichts wurde geschrieben: Ihre Änderung hat die andere nicht überschrieben.',
  'library.operationFailed':
    '{context}: Der Vorgang ist nicht durchgegangen. Technische Einzelheit: {detail}',

  'library.contextStoring': 'Ablegen',
  'library.contextLoading': 'Laden',
  'library.contextRemoving': 'Löschen',
  'library.contextExtracting': 'Herausgabe',
  'library.contextVerifying': 'Prüfung',
  'library.contextRenaming': 'Umbenennen',
  'library.contextExporting': 'Export der Bibliothek',
  'library.contextImporting': 'Import der Bibliothek',
  'library.contextReading': 'Lesen der Bibliothek',

  /* -------------------------------------------------------------------- umbenennen */

  'library.renameTitle': '„{name}“ umbenennen',
  'library.renameLead': 'Der Name gehört Ihnen; die abgelegten Bytes bewegen sich nicht.',
  'library.fieldNote': 'Notiz',
  'library.renamed': '„{name}“ ist aktuell — {times}.',

  /* ------------------------------------- „zurückgelegt“, der dritte « rétablir » */

  'library.entryRestored': '„{name}“ wurde zurückgelegt.',
  'library.entryRestoredBeside': '„{name}“ wurde daneben zurückgelegt: die Kennung war bereits vergeben.',

  'library.entryCount': {
    one: '{count} abgelegte Konfiguration',
    other: '{count} abgelegte Konfigurationen'
  }
}

export default library
