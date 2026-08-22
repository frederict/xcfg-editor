import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Wiederholen',
  'action.redoNothing': 'Nichts zu wiederholen',
  'action.redoNamed': 'Wiederholen: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.shortNameTitle':
    'Der Name, den die Datei dieser Seitenart gibt. Er ändert sich nicht von einer Sprache zur anderen: er ist das, was Sie beim Öffnen der Datei lesen würden.',

  'pageKind.free': 'Leere Seite',
  'pageKind.freeNote': 'Auf dem Gerät leer angelegt, bereit für Ihre eigenen Widgets.',
  'pageKind.competition': 'Wettkampfseite',
  'pageKind.competitionNote': 'Mit dem Wettkampf-Widgetsatz des Geräts angelegt.',
  'pageKind.thermalAssistant': 'Seite mit Thermikassistent',
  'pageKind.thermalAssistantNote': 'Mit dem Widgetsatz des Thermikassistenten angelegt. Auf ' +
    'diese Seitenklasse schaltet das Gerät beim Kurbeln von selbst um.',
  'pageKind.xcAssistant': 'Seite mit XC-Assistent',
  'pageKind.xcAssistantNote': 'Mit dem Widgetsatz für FAI-Dreieck und Routen angelegt.',
  'pageKind.unknown': 'Unbekannter Seitentyp',
  'pageKind.unknownNote': 'Dieser Editor kennt diesen Seitentyp nicht; sein Inhalt wird ' +
    'trotzdem unverändert angezeigt.',

  'pageKind.missing': '(kein Typ)',

  'view.landscape': 'Querformat',
  'view.portrait': 'Hochformat',

  'view.pageCard': 'Seite {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} Seite',
    other: '{count} Seiten'
  },

  'view.noPage': 'keine Seite',
  'view.emptyOrientation': 'Diese Datei beschreibt in dieser Ausrichtung keine Seite.',

  'view.remarkCount': {
    one: '{count} Anmerkung zu dieser Datei',
    other: '{count} Anmerkungen zu dieser Datei'
  },

  'view.backToOverview': '← Alle Seiten',

  'view.enableAllNavigations': 'Für alle Navigationen aktivieren',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Vorige Seite',
  'view.nextPage': 'Nächste Seite',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.pointHint': 'Mit dem Finger oder der Maus auf ein Widget zeigen, um Name und Maße zu sehen.',
  'view.pointHintSelectable': 'Mit dem Finger oder der Maus auf ein Widget zeigen, um Name ' +
    'und Maße zu sehen; es auswählen, um seine Einstellungen zu lesen.',

  'view.selectedPin': 'ausgewählt',

  'view.widgetSpoken': '{name}, {width} auf {height} Millimeter',

  'view.scaleAdvice': 'Die Seite wird in der Größe gezeichnet, die sie auf dem Gerät hat. Ihr ' +
    'Bildschirm hat nicht zwangsläufig die Pixeldichte, die der Browser annimmt: Stellen Sie ' +
    'den Zoom so ein, dass ein echtes Lineal auf dem Bildschirm mit der Skala übereinstimmt.',

  'editor.moveNamed': '{name} verschieben',
  'editor.resizeNamed': 'Größe von {name} ändern',
  'editor.deleteNamed': '{name} löschen',
  'editor.duplicateNamed': '{name} duplizieren',
  'editor.raiseNamed': '{name} eine Ebene nach vorn holen',
  'editor.lowerNamed': '{name} eine Ebene nach hinten schieben',
  'editor.frontNamed': '{name} ganz nach vorn holen',
  'editor.backNamed': '{name} ganz nach hinten schieben',

  'editor.onlyWidget': 'Einziges Widget der Seite',
  'editor.rank': 'Ebene {index} von {total}',
  'editor.rankFront': 'Ebene {index} von {total}, vorderste',
  'editor.rankBack': 'Ebene {index} von {total}, hinterste',

  'editor.layerLabel': 'Seite bearbeiten: Pfeiltasten zum Verschieben, Umschalt + ' +
    'Pfeiltasten zum Ändern der Größe, Strg + Pfeil auf/ab zum Wechseln der Ebene, ' +
    'Strg + D zum Duplizieren, Entf zum Löschen',
  'editor.toolbarLabel': 'Aktionen für das ausgewählte Widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Ganz nach hinten schieben',
  'editor.sendToBackKeys': 'Strg + Umschalt + Pfeil ab',
  'editor.lowerOne': 'Eine Ebene nach hinten',
  'editor.lowerOneKeys': 'Strg + Pfeil ab',
  'editor.raiseOne': 'Eine Ebene nach vorn',
  'editor.raiseOneKeys': 'Strg + Pfeil auf',
  'editor.bringToFront': 'Ganz nach vorn holen',
  'editor.bringToFrontKeys': 'Strg + Umschalt + Pfeil auf',
  'editor.duplicate': 'Duplizieren',
  'editor.duplicateWidget': 'Widget duplizieren',
  'editor.duplicateKeys': 'Strg + D',
  'editor.delete': 'Löschen',
  'editor.deleteWidget': 'Widget löschen',
  'editor.deleteKeys': 'Entf',

  'editor.noSelection': 'Kein Widget ausgewählt.',
  'editor.selected': '{name} ausgewählt, {size}.',

  'editor.emptyPage': 'Leere Seite',
  'editor.pageTally': {
    one: '{count} Widget auf der Seite',
    other: '{count} Widgets auf der Seite'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, nichts zu ändern.',

  'app.name': 'XCTrack-Konfiguration',

  'app.editingRole': 'Bearbeiten',
  'app.editingBadge': 'Bearbeitung',

  'app.dropVeil': 'Datei loslassen, um sie zu öffnen',

  'app.settings': 'Einstellungen',
  'app.settingsHint': 'Allgemeine Einstellungen — alles, was außerhalb der Widget-Seiten ' +
    'eingestellt wird: Einheiten, Tasten, Sensoren, Ton, Lufträume.',

  'menu.file': 'Datei',
  'menu.openFile': 'Datei öffnen…',
  'menu.openFileHint': 'Eine .xcfg oder .xczfg wählen, die aus dem Gerät exportiert wurde. ' +
    'Die Datei bleibt auf diesem Rechner.',
  'menu.library': 'Bibliothek…',
  'menu.libraryHint': 'Die geöffnete Konfiguration unter einem Namen ablegen und die bereits ' +
    'abgelegten wiederfinden. Alles bleibt in diesem Browser: kein Server, kein Konto.',
  'menu.version': 'Version und Kompatibilität…',
  'menu.versionHint': 'Die angepeilte XCTrack-Version wählen und sehen, was diese Datei ' +
    'enthält, das jene nicht kennt — oder umgekehrt.',
  'menu.manual': 'Handbuch…',
  'menu.manualHint': 'Wie Sie die Datei aus dem Gerät holen, Ihre Seiten vorbereiten, und was ' +
    'Sie niemals weitergeben dürfen.',

  'app.saveCopy': 'Kopie speichern',
  'app.saveChanges': 'Änderungen speichern',

  'app.editPages': 'Seiten bearbeiten',
  'app.editPagesHint': 'Seiten bearbeiten — Widgets verschieben, in der Größe ändern und ' +
    'hinzufügen.',
  'app.editSettings': 'Einstellungen bearbeiten',
  'app.editSettingsHint': 'Einstellungen bearbeiten — die Werte der allgemeinen ' +
    'Einstellungen ändern.',
  'app.inspect': 'Nur ansehen',
  'app.inspectHint': 'Nur ansehen — den Bearbeitungsmodus verlassen. Nichts wird rückgängig ' +
    'gemacht.',

  'action.undoNothing': 'Nichts rückgängig zu machen',
  'action.undoNamed': 'Rückgängig: {what}',

  'landing.title': 'Bereiten Sie Ihre XCTrack-Seiten vor dem Fliegen vor',
  'landing.lead': 'Öffnen Sie eine .xcfg- oder .xczfg-Datei, die aus dem Gerät exportiert ' +
    'wurde: ihre Seiten erscheinen genau so, wie das Gerät sie zeichnet, in Originalgröße. ' +
    'Verschieben Sie ein Widget, ändern Sie seine Größe, fügen Sie weitere hinzu, und nehmen ' +
    'Sie anschließend eine frische Kopie für die SD-Karte mit.',

  'landing.privacy': 'Ihre Datei verlässt diesen Rechner nicht: alles geschieht in diesem ' +
    'Browser, ohne Server und ohne Konto. Und was Sie nicht angefasst haben, kommt genau so ' +
    'heraus, wie es hineingegangen ist, ohne ein einziges neu geschriebenes Komma — Ihre ' +
    'Einstellungen bleiben Ihre.',

  'landing.dropHere': 'Datei hier loslassen',
  'landing.dropOrPick': 'oder klicken, um sie zu wählen — .xcfg oder .xczfg',

  'landing.stepDeviceTitle': 'Auf dem Gerät',
  'landing.stepDeviceText': '„Einstellungen“, „Export & Import Konfiguration“, dann ' +
    '„Exportiere Konfiguration“. Die Datei landet auf der SD-Karte.',
  'landing.stepHereTitle': 'Hier',
  'landing.stepHereText': 'Die Seiten erscheinen nummeriert, in der Reihenfolge, in der ' +
    '„nächste Seite“ sie im Flug durchblättert.',
  'landing.stepEditTitle': 'Bearbeiten',
  'landing.stepEditText': 'Verschieben Sie ein Widget mit dem Finger oder der Maus, ändern Sie ' +
    'seine Größe, fügen Sie weitere hinzu: die Seite wird vor Ihren Augen in Originalgröße neu ' +
    'gezeichnet.',
  'landing.stepKnowTitle': 'Gut zu wissen',
  'landing.stepKnowText': 'Nicht der Typ einer Seite entscheidet, wann das Gerät sie im Flug ' +
    'zeigt, sondern eine eigene Einstellung — und dieser Editor schreibt sie Ihnen Seite ' +
    'für Seite aus.',

  'landing.returning': 'Schon einmal hier gewesen? Die Konfigurationen, die Sie abgelegt ' +
    'haben, stehen im Menü „Datei“ oben rechts unter „Bibliothek“: sie haben diesen Browser ' +
    'nie verlassen.',
  'landing.manualLead': 'Zum ersten Mal hier? Das Handbuch sagt, was dieses Werkzeug tut, was am Gerät gemessen wurde und was eine Konfigurationsdatei über Sie verrät.',
  'landing.readManual': 'Das Handbuch lesen',

  'app.uiLanguage': 'Sprache der Oberfläche',
  'app.uiLanguageNamed': 'Sprache der Oberfläche: {name}',
  'app.uiLanguageHint': 'Die Sprache dieser Oberfläche wählen. Die Beschriftungen von XCTrack folgen der geöffneten Datei.',
  'app.uiLanguageLead': 'Die Wörter dieser Oberfläche: Überschriften, Erklärungen, Warnungen. Diese Wahl merkt sich der Browser.',
  'app.labelsAxisLead': 'Die Namen von Widgets, Optionen und Einstellungen, so wie Ihr Gerät sie anzeigt. Sie stammen aus der geöffneten Datei; gibt diese keine an, folgen sie der oben gewählten Sprache.',
  'app.languageDialogTitle': 'Sprachen',
  'app.languageFailedTitle': 'Die Sprache konnte nicht geladen werden',

  'app.metaFormat': 'Format',
  'app.containerArchiveAlone': '.xczfg-Archiv — es enthält nur {inner}, keine zusätzliche Datei',
  'app.containerArchiveWith': '.xczfg-Archiv — es enthält {inner} und {annexes}',
  'app.annexCount': {
    one: '{count} zusätzliche Datei',
    other: '{count} zusätzliche Dateien'
  },
  'app.containerPlain': '.xcfg-Datei',
  'app.metaDevice': 'Gerät laut Datei',
  'app.notDeclared': 'nicht angegeben',
  'app.metaLabels': 'XCTrack-Beschriftungen',
  'app.labelsFromBrowser': '{language} (Sprache des Browsers)',
  'app.labelsFromUi': '{language} (Sprache der Oberfläche)',
  'app.labelsFromFile': '{language} (von der Datei angegeben)',
  'app.metaRenderSettings': 'Zeicheneinstellungen',
  'app.renderSettingsAssumed': 'angenommene Werte, in der Datei nicht vorhanden',

  'app.overviewTitle': 'Seiten der Konfiguration',

  'app.seeDetail': {
    one: 'Einzelheit ansehen ({count})',
    other: 'Einzelheiten ansehen ({count})'
  },
  'app.attentionTitle': 'In dieser Datei zu prüfen',
  'app.revealsTitle': 'Was diese Datei über Sie verrät',

  'app.editModeNote': 'Bearbeitungsmodus: öffnen Sie eine Seite, um Widgets hinzuzufügen, sie ' +
    'zu verschieben und ihre Optionen einzustellen. Die Seiten selbst — einfügen, ' +
    'duplizieren, löschen, umsortieren — verwalten Sie hier.',

  'dock.settingCount': {
    one: '{count} Einstellung',
    other: '{count} Einstellungen'
  },
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} von Ihnen geändert',
    other: '{count} von Ihnen geändert'
  },

  'dock.label': 'Widgets der Seite und Einstellungen des ausgewählten Widgets',
  'dock.labelReadOnly': 'Widgets der Seite und Einstellungen des ausgewählten Widgets, nur lesbar',

  'dock.gripLabel': 'Höhe der Einstellungsleiste',
  'dock.gripHint': 'Ziehen, um die Höhe der Leiste zu ändern — auf der Tastatur Pfeil auf und ' +
    'ab, Bild auf und Bild ab für große Schritte, Pos1 und Ende für die Extreme.',
  'dock.heightPixels': {
    one: '{count} Pixel',
    other: '{count} Pixel'
  },

  'dock.widgetList': 'Widget-Liste',
  'dock.expandSettings': 'Einstellungen aufklappen',
  'dock.collapse': 'Zuklappen',
  'dock.showList': 'Liste anzeigen',
  'dock.hideList': 'Liste ausblenden',

  'dock.noSelection': 'Kein Widget ausgewählt',
  'dock.selectionRank': '{name} — Ebene {index} von {total}',
  'dock.chooseWidget': 'Wählen Sie ein Widget, um seine Einstellungen zu sehen',
  'dock.hintEditing': 'Klicken Sie ein Widget auf der Seite an: seine Einstellungen erscheinen ' +
    'hier, in der Reihenfolge, in der das Gerät sie zeigt.',
  'dock.hintInspecting': 'Klicken Sie ein Widget auf der Seite an — oder wählen Sie es in der ' +
    'Liste —, um seine Einstellungen zu lesen. Hier lässt sich nichts ändern: das ist der ' +
    'Ansichtsmodus.',
  'dock.cramped': 'Dieses Fenster ist zu niedrig, um die ganze Seite und ihre ' +
    'Einstellungen gleichzeitig zu zeigen. „Zuklappen“ gibt der Seite den Platz der Leiste ' +
    'zurück, nimmt Ihnen aber die Einstellungen; und keine Zoomstufe zeigt sie hier ganz.',
  'dock.crampedZoom': 'Dieses Fenster ist zu niedrig, um die ganze Seite und ihre Einstellungen gleichzeitig zu zeigen. „Zuklappen“ gibt der Seite den Platz der Leiste zurück, nimmt Ihnen aber die Einstellungen; bei einem Zoom von {level} ist sie ganz zu sehen, dann aber nicht mehr in Originalgröße.',

  'dock.loadingSettings': 'Einstellungen werden geladen…',

  'app.addWidget': 'Widget hinzufügen',
  'app.managePages': 'Seiten verwalten',
  'app.gridSize': 'Raster {cols} × {rows}',
  'app.editKeysHint': 'Ziehen: verschieben · Ecken und Kanten: Größe ändern · Pfeiltasten: ' +
    'eine Zelle · Umschalt + Pfeiltasten: Größe ändern · Strg + Pfeiltasten: Ebene wechseln · ' +
    'Strg + D: duplizieren · Entf: löschen · Esc: Auswahl aufheben',

  'app.setSettingNamed': '{label} einstellen — {name}',

  'app.pageHasNoWidgetSlot': 'Diese Seite hat keinen Platz für Widgets. Dieser Editor kann ' +
    'keinen anlegen: er erfindet nichts, was die Datei nicht schon enthält.',

  'app.managePagesLead': 'Einfügen, duplizieren, löschen, umsortieren. Jeder Vorgang wird ' +
    'aufgezeichnet: „Rückgängig“ macht ihn wie alles andere zunichte. Die Klasse einer Seite ' +
    'wird dagegen nicht zur Änderung angeboten — XCTrack legt sie beim Anlegen fest, und was ' +
    'eine nachträgliche Änderung bewirkt, wurde auf dem Gerät nicht geprüft.',

  'app.pageOperationFailed': 'Diese Änderung war nicht möglich: Ihre Seiten sind unverändert. ' +
    'Technische Einzelheit: {detail}',

  'app.repository': 'Das Projekt auf GitHub — ein Problem melden, eine Verbesserung vorschlagen',
  'app.manualTitle': 'Handbuch',
  'app.close': 'Schließen',
  'app.loading': 'Wird geladen…',

  'app.technicalDetail': 'Technische Einzelheit',

  'app.loadingSettingsPage': 'Allgemeine Einstellungen werden geladen…',
  'app.settingsFailedTitle': 'Die allgemeinen Einstellungen ließen sich nicht öffnen',
  'app.settingsFailedMessage': 'Die Liste der Einstellungen, die XCTrack anbietet, ließ sich ' +
    'nicht laden.',
  'app.fileNotAtFault': 'An der Datei liegt es nicht: sie bleibt geöffnet und unversehrt.',
  'app.backToPages': 'Zurück zu den Seiten',

  'app.manualBack': 'Handbuch schließen',
  'app.manualToc': 'Inhalt',
  'app.loadingManual': 'Handbuch wird geladen…',
  'app.manualFailedMessage': 'An Ihrer Datei hat sich nichts geändert. Versuchen Sie es erneut.',
  'app.manualFailedTitle': 'Das Handbuch ließ sich nicht öffnen',
  'app.fileUntouchedRetry': 'Ihre Datei ist unverändert. Versuchen Sie es erneut.',

  'app.versionDialogTitle': 'Angepeilte Version und Kompatibilität',
  'app.versionLead': 'Das Format von XCTrack ändert sich mit jeder Version. Wählen Sie die ' +
    'angepeilte Version: der Editor sagt dann, was diese Datei enthält, das jene Version nicht ' +
    'kennt, und was sie erwartet, das die Datei nicht hat. Das ist eine Feststellung: es ' +
    'ändert sich nichts, solange Sie es nicht verlangen.',
  'app.loadingVersions': 'Versionsdatenbank wird geladen…',
  'app.versionFailedTitle': 'Der Versionsbefund ließ sich nicht öffnen',
  'app.versionFailedMessage': 'Die Liste der XCTrack-Versionen ließ sich nicht laden.',

  'app.libraryFailedTitle': 'Die Bibliothek ließ sich nicht öffnen',
  'app.libraryFailedMessage': 'Ihr Browser hat diesem Editor keinen Zugriff auf seinen ' +
    'Speicher gegeben. Die geöffnete Datei ist unverändert.',

  'app.exportDialogFailedTitle': 'Das Speicherfenster ließ sich nicht öffnen',
  'app.exportDialogFailedMessage': 'Es wurde nichts gespeichert und Ihre Datei ist ' +
    'unverändert. Versuchen Sie es erneut.',

  'app.exportHandedOver': '„{name}“ ({size}) — dieses Werkzeug hat Ihren Browser gebeten, sie zu speichern.',
  'app.exportWhereToLook': 'Zu finden bei Ihren Downloads — diese Seite sieht nicht, was ' +
    'dort geschieht. Liegt sie nicht dort, erlauben Sie Downloads für diese Website und ' +
    'beginnen Sie von vorn.',
  'app.exportReceiptDismiss': 'Diese Speicherbestätigung schließen',

  'app.exportFailedTitle': 'Die Datei konnte nicht erzeugt werden',
  'app.exportFailedMessage': 'Aus diesem Werkzeug ist nichts herausgekommen, und Ihre ' +
    'Konfiguration ist unverändert. Versuchen Sie es erneut.',

  'app.openFailedTitle': 'Diese Datei ließ sich nicht öffnen',
  'app.openFailedMessage': 'Dieser Editor konnte nichts damit anfangen. Die Datei selbst wurde ' +
    'nicht verändert.',
  'app.openFailedHint': 'Prüfen Sie, ob es wirklich ein XCTrack-Export ist (.xcfg oder ' +
    '.xczfg). Sie können irgendwo auf dieser Seite eine andere Datei loslassen oder eine im ' +
    'Menü „Datei“ oben rechts wählen.',

  'app.unreadableTitle': 'Diese Datei ließ sich nicht lesen',
  'app.unreadableMessage': 'Prüfen Sie, ob es die .xcfg- oder .xczfg-Datei ist, die auf dem ' +
    'Gerät „Einstellungen“, „Export & Import Konfiguration“, dann „Exportiere Konfiguration“ ' +
    'erzeugt, und ob sie vollständig ist.',
  'app.unreadableHint': 'Ihre Bytes bleiben unversehrt: „Kopie speichern“ gibt sie Ihnen genau ' +
    'so zurück, wie sie hereinkam, ohne die geringste Neuschreibung.',
  'app.unreadableIncoming': '„{incoming}“ ergab nichts Brauchbares. „{kept}“ bleibt geöffnet, ' +
    'und alles, was Sie darin geändert haben, ist noch da.',

  'app.unsavedTitle': 'Ihre Änderungen sind nicht gespeichert',
  'app.replaceMessage': '„{incoming}“ zu öffnen schließt „{kept}“ und alles, was Sie eben ' +
    'darin geändert haben. Dieser Editor behält von sich aus nichts: was nicht gespeichert ' +
    'ist, ist verloren.',
  'app.lastChange': 'Letzte Änderung: „{change}“.',
  'app.replaceHint': 'Um nichts zu verlieren: behalten Sie Ihre Änderungen und wählen Sie dann ' +
    'oben auf der Seite „Änderungen speichern“ — oder legen Sie diese Konfiguration in der ' +
    'Bibliothek ab.',
  'app.replaceAndLose': '„{incoming}“ öffnen und sie verlieren',
  'app.keepChanges': 'Meine Änderungen behalten'
}

export default app
