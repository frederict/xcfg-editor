import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Opnieuw',
  'action.redoNothing': 'Niets om opnieuw te doen',
  'action.redoNamed': 'Opnieuw: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Lege pagina',
  'pageKind.freeNote': 'Leeg aangemaakt op het instrument, klaar voor je eigen widgets.',
  'pageKind.competition': 'Wedstrijdpagina',
  'pageKind.competitionNote': 'Aangemaakt met de wedstrijdwidgets van het instrument.',
  'pageKind.thermalAssistant': 'Pagina thermiekassistent',
  'pageKind.thermalAssistantNote': 'Aangemaakt met de widgets van de thermiekassistent. Naar ' +
    'dit paginatype schakelt het toestel vanzelf over zodra je gaat kringen.',
  'pageKind.xcAssistant': 'Pagina XC-assistent',
  'pageKind.xcAssistantNote': 'Aangemaakt met de widgets voor FAI-driehoek en routes.',
  'pageKind.unknown': 'Onbekend paginatype',
  'pageKind.unknownNote': 'Deze editor kent dit paginatype niet; de inhoud wordt gewoon ' +
    'getoond zoals ze is.',

  'pageKind.missing': '(geen type)',

  'view.landscape': 'Liggend',
  'view.portrait': 'Staand',

  'view.pageCard': 'Pagina {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} pagina',
    other: '{count} pagina’s'
  },

  'view.noPage': 'geen pagina',
  'view.emptyOrientation': 'Dit bestand beschrijft geen enkele pagina in deze richting.',

  'view.remarkCount': {
    one: '{count} opmerking over dit bestand',
    other: '{count} opmerkingen over dit bestand'
  },

  'view.backToOverview': '← Alle pagina’s',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Vorige pagina',
  'view.nextPage': 'Volgende pagina',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Ga met de muis over een widget voor de naam en de afmetingen.',
  'view.hoverHintSelectable': 'Ga met de muis over een widget voor de naam en de afmetingen; ' +
    'klik erop om de instellingen te zien.',

  'view.selectedPin': 'geselecteerd',

  'view.widgetSpoken': '{name}, {width} bij {height} millimeter',

  'view.scaleAdvice': 'De pagina wordt getekend op ware grootte, zoals op het toestel. Je ' +
    'scherm heeft niet per se de pixeldichtheid die de browser aanneemt: stel de zoom bij ' +
    'tot een echte liniaal op het scherm samenvalt met de schaalverdeling.',

  'editor.moveNamed': '{name} verplaatsen',
  'editor.resizeNamed': 'Formaat van {name} wijzigen',
  'editor.deleteNamed': '{name} verwijderen',
  'editor.duplicateNamed': '{name} dupliceren',
  'editor.raiseNamed': '{name} een laag naar voren halen',
  'editor.lowerNamed': '{name} een laag naar achteren zetten',
  'editor.frontNamed': '{name} helemaal vooraan zetten',
  'editor.backNamed': '{name} helemaal achteraan zetten',

  'editor.onlyWidget': 'Enige widget op de pagina',
  'editor.rank': 'Laag {index} van {total}',
  'editor.rankFront': 'Laag {index} van {total}, vooraan',
  'editor.rankBack': 'Laag {index} van {total}, achteraan',

  'editor.layerLabel': 'Pagina bewerken: pijltoetsen om te verplaatsen, Shift + pijltoetsen ' +
    'om het formaat te wijzigen, Ctrl + pijl omhoog/omlaag om van laag te wisselen, ' +
    'Ctrl + D om te dupliceren, Delete om te verwijderen',
  'editor.toolbarLabel': 'Acties op de geselecteerde widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Helemaal naar achteren',
  'editor.sendToBackKeys': 'Ctrl + Shift + Pijl omlaag',
  'editor.lowerOne': 'Eén laag naar achteren',
  'editor.lowerOneKeys': 'Ctrl + Pijl omlaag',
  'editor.raiseOne': 'Eén laag naar voren',
  'editor.raiseOneKeys': 'Ctrl + Pijl omhoog',
  'editor.bringToFront': 'Helemaal naar voren',
  'editor.bringToFrontKeys': 'Ctrl + Shift + Pijl omhoog',
  'editor.duplicate': 'Dupliceren',
  'editor.duplicateWidget': 'De widget dupliceren',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Verwijderen',
  'editor.deleteWidget': 'De widget verwijderen',
  'editor.deleteKeys': 'Delete',

  'editor.noSelection': 'Geen widget geselecteerd.',
  'editor.selected': '{name} geselecteerd, {size}.',

  'editor.emptyPage': 'Lege pagina',
  'editor.pageTally': {
    one: '{count} widget op de pagina',
    other: '{count} widgets op de pagina'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, niets te veranderen.',

  'app.name': 'XCTrack-configuratie',

  'app.editingRole': 'bewerken',
  'app.editingBadge': 'Bewerken',

  'app.dropVeil': 'Laat het bestand los om het te openen',

  'app.settings': 'Instellingen',
  'app.settingsHint': 'Algemene instellingen — alles wat je buiten de widgetpagina’s ' +
    'instelt: eenheden, knoppen, sensoren, geluid, luchtruimen.',

  'menu.file': 'Bestand',
  'menu.openFile': 'Een bestand openen…',
  'menu.openFileHint': 'Kies een .xcfg of .xczfg die je uit het instrument hebt geëxporteerd. ' +
    'Het bestand blijft op deze machine.',
  'menu.library': 'Bibliotheek…',
  'menu.libraryHint': 'Bewaar de geopende configuratie onder een naam en vind terug wat je ' +
    'al bewaard hebt. Alles blijft in deze browser: geen server, geen account.',
  'menu.version': 'Versie en compatibiliteit…',
  'menu.versionHint': 'Kies de XCTrack-versie die je voor ogen hebt en zie wat dit bestand ' +
    'bevat dat die versie niet kent — of omgekeerd.',
  'menu.manual': 'Handleiding…',
  'menu.manualHint': 'Hoe je het bestand uit het instrument haalt, je pagina’s voorbereidt, ' +
    'en wat je nooit mag delen.',

  'app.saveCopy': 'Een kopie opslaan',
  'app.saveChanges': 'De wijzigingen opslaan',

  'app.editPages': 'De pagina’s bewerken',
  'app.editPagesHint': 'De pagina’s bewerken — widgets verplaatsen, vergroten en toevoegen.',
  'app.editSettings': 'De instellingen bewerken',
  'app.editSettingsHint': 'De instellingen bewerken — de waarden van de algemene ' +
    'instellingen veranderen.',
  'app.inspect': 'Alleen bekijken',
  'app.inspectHint': 'Alleen bekijken — de bewerkmodus verlaten. Er wordt niets ongedaan gemaakt.',

  'action.undoNothing': 'Niets ongedaan te maken',
  'action.undoNamed': 'Ongedaan maken: {what}',

  'landing.title': 'Zet je XCTrack-pagina’s klaar voordat je vliegt',
  'landing.lead': 'Open een .xcfg- of .xczfg-bestand dat je uit het instrument hebt ' +
    'geëxporteerd: de pagina’s verschijnen precies zoals het toestel ze tekent, op ware ' +
    'grootte. Verplaats een widget, wijzig het formaat, voeg er meer toe, en neem daarna een ' +
    'verse kopie mee terug naar de SD-kaart.',

  'landing.privacy': 'Je bestand verlaat deze machine niet: alles gebeurt in deze browser, ' +
    'zonder server en zonder account. En wat je niet hebt aangeraakt, komt er precies zo uit ' +
    'als het erin ging, zonder één herschreven komma — je instellingen blijven van jou.',

  'landing.dropHere': 'Laat je bestand hier los',
  'landing.dropOrPick': 'of klik om het te kiezen — .xcfg of .xczfg',

  'landing.stepDeviceTitle': 'Op het instrument',
  'landing.stepDeviceText': 'Instellingen, dan ‘Configuratie exporteren’. Het bestand belandt ' +
    'op de SD-kaart.',
  'landing.stepHereTitle': 'Hier',
  'landing.stepHereText': 'De pagina’s verschijnen genummerd, in de volgorde waarin ‘volgende ' +
    'pagina’ ze tijdens de vlucht doorloopt.',
  'landing.stepEditTitle': 'Bewerken',
  'landing.stepEditText': 'Verplaats een widget met je vinger of de muis, verander het ' +
    'formaat, voeg er andere toe: de pagina wordt voor je ogen op ware grootte hertekend.',
  'landing.stepKnowTitle': 'Goed om te weten',
  'landing.stepKnowText': 'Het is de instelling ‘navigations’ van een pagina, en niet het ' +
    'paginatype, die bepaalt wanneer het toestel ze toont.',

  'landing.returning': 'Al eens langs geweest? De configuraties die je bewaard hebt, staan in ' +
    'het menu ‘Bestand’ rechtsboven, onder ‘Bibliotheek’: ze zijn deze browser nooit uit geweest.',
  'landing.readManual': 'De handleiding lezen',

  'app.uiLanguage': 'Taal van de interface',
  'app.uiLanguageNamed': 'Taal van de interface: {name}',
  'app.uiLanguageHint': 'De taal van deze interface kiezen. De labels van XCTrack veranderen niet.',
  'app.uiLanguageLead': 'De woorden van deze interface: titels, uitleg, waarschuwingen. Deze browser onthoudt de keuze.',
  'app.labelsAxisLead': 'De namen van widgets, opties en instellingen, zoals uw instrument ze toont. Ze komen uit het geopende bestand, en deze keuze verandert ze niet.',
  'app.languageDialogTitle': 'Talen',
  'app.languageFailedTitle': 'De taal kon niet worden geladen',

  'app.metaFormat': 'Formaat',
  'app.containerArchive': '.xczfg-archief',
  'app.containerPlain': '.xcfg-bestand',
  'app.metaDevice': 'Toestel volgens het bestand',
  'app.notDeclared': 'niet vermeld',
  'app.metaLabels': 'XCTrack-labels',
  'app.labelsFromBrowser': '{language} (taal van de browser)',
  'app.labelsFromFile': '{language} (door het bestand vermeld)',
  'app.metaRenderSettings': 'Tekeninstellingen',
  'app.renderSettingsAssumed': 'aangenomen waarden, niet in het bestand',

  'app.overviewTitle': 'Pagina’s van de configuratie',

  'app.seeDetail': 'Details bekijken ({count})',
  'app.attentionTitle': 'Na te kijken in dit bestand',
  'app.revealsTitle': 'Wat dit bestand over jou prijsgeeft',

  'app.editModeNote': 'Bewerkmodus: open een pagina om er widgets aan toe te voegen, ze te ' +
    'verplaatsen en hun opties in te stellen. De pagina’s zelf — toevoegen, dupliceren, ' +
    'verwijderen, van volgorde wisselen — beheer je hier.',

  'dock.settingCount': {
    one: '{count} instelling',
    other: '{count} instellingen'
  },
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} zelf gewijzigd',
    other: '{count} zelf gewijzigd'
  },

  'dock.label': 'Widgets van de pagina en instellingen van de geselecteerde widget',
  'dock.labelReadOnly': 'Widgets van de pagina en instellingen van de geselecteerde widget, ' +
    'alleen-lezen',

  'dock.gripLabel': 'Hoogte van de instellingenbalk',
  'dock.gripHint': 'Sleep om de hoogte van de balk te veranderen — met het toetsenbord: ' +
    'pijl omhoog en omlaag, Page Up en Page Down voor grote stappen, Home en End voor de uitersten.',
  'dock.heightPixels': {
    one: '{count} pixel',
    other: '{count} pixels'
  },

  'dock.widgetList': 'Lijst met widgets',
  'dock.expandSettings': 'Instellingen uitklappen',
  'dock.collapse': 'Inklappen',
  'dock.showList': 'Lijst tonen',
  'dock.hideList': 'Lijst verbergen',

  'dock.noSelection': 'Geen widget geselecteerd',
  'dock.selectionRank': '{name} — laag {index} van {total}',
  'dock.chooseWidget': 'Kies een widget om de instellingen te zien',
  'dock.hintEditing': 'Klik een widget op de pagina: de instellingen verschijnen hier, in de ' +
    'volgorde waarin het instrument ze toont.',
  'dock.hintInspecting': 'Klik een widget op de pagina — of kies er een uit de lijst — om de ' +
    'instellingen te lezen. Hier valt niets te wijzigen: dit is de kijkmodus.',
  'dock.loadingSettings': 'Instellingen laden…',

  'app.addWidget': 'Een widget toevoegen',
  'app.managePages': 'Pagina’s beheren',
  'app.gridSize': 'Raster {cols} × {rows}',
  'app.editKeysHint': 'Slepen: verplaatsen · hoeken en zijkanten: formaat wijzigen · ' +
    'pijltoetsen: één cel · Shift + pijltoetsen: formaat wijzigen · Ctrl + pijltoetsen: ' +
    'van laag wisselen · Ctrl + D: dupliceren · Delete: verwijderen · Escape: deselecteren',

  'app.setSettingNamed': '{label} instellen — {name}',

  'app.pageHasNoWidgetSlot': 'Deze pagina heeft geen plek voor widgets. Dit gereedschap kan er ' +
    'geen aanmaken: het verzint niets wat het bestand niet al bevat.',

  'app.managePagesLead': 'Invoegen, dupliceren, verwijderen, van volgorde wisselen. Elke ' +
    'bewerking wordt vastgelegd: ‘Ongedaan maken’ draait ze terug zoals de rest. Het type ' +
    'van een pagina kun je hier niet wijzigen — XCTrack legt het bij het aanmaken vast, en ' +
    'wat een wijziging achteraf doet, is niet op het toestel nagegaan.',

  'app.pageOperationFailed': 'Deze wijziging kon niet worden doorgevoerd: je pagina’s zijn ' +
    'niet verschoven. Technisch detail: {detail}',

  'app.manualTitle': 'Handleiding',
  'app.close': 'Sluiten',
  'app.loading': 'Laden…',

  'app.technicalDetail': 'Technisch detail',

  'app.loadingSettingsPage': 'Algemene instellingen laden…',
  'app.settingsFailedTitle': 'De algemene instellingen konden niet worden geopend',
  'app.settingsFailedMessage': 'De lijst met instellingen die XCTrack aanbiedt, kon niet ' +
    'worden geladen.',
  'app.fileNotAtFault': 'Aan het bestand ligt het niet: het blijft geopend en ongewijzigd.',
  'app.backToPages': 'Terug naar de pagina’s',

  'app.manualFailedTitle': 'De handleiding kon niet worden geopend',
  'app.fileUntouchedRetry': 'Je bestand is niet gewijzigd. Probeer het opnieuw.',

  'app.versionDialogTitle': 'Beoogde versie en compatibiliteit',
  'app.versionLead': 'Het formaat van XCTrack verandert bij elke versie. Kies de versie die ' +
    'je voor ogen hebt: de editor zegt dan wat dit bestand bevat dat die versie niet kent, en ' +
    'wat ze verwacht en er niet in staat. Het is een vaststelling: er verandert niets zolang ' +
    'je er niet om vraagt.',
  'app.loadingVersions': 'Versiegegevens laden…',
  'app.versionFailedTitle': 'Het versieoverzicht kon niet worden geopend',
  'app.versionFailedMessage': 'De lijst met XCTrack-versies kon niet worden geladen.',

  'app.libraryFailedTitle': 'De bibliotheek kon niet worden geopend',
  'app.libraryFailedMessage': 'Je browser gaf dit gereedschap geen toegang tot zijn opslag. ' +
    'Het geopende bestand is niet gewijzigd.',

  'app.exportDialogFailedTitle': 'Het opslagvenster kon niet worden geopend',
  'app.exportDialogFailedMessage': 'Er is niets opgeslagen en je bestand is niet gewijzigd. ' +
    'Probeer het opnieuw.',

  'app.openFailedTitle': 'Dit bestand kon niet worden geopend',
  'app.openFailedMessage': 'Dit gereedschap wist er niets mee aan te vangen. Het bestand zelf ' +
    'is niet gewijzigd.',
  'app.openFailedHint': 'Ga na of het echt een XCTrack-export is (.xcfg of .xczfg). Je kunt ' +
    'ergens op deze pagina een ander bestand loslaten, of er een kiezen in het menu ' +
    '‘Bestand’ rechtsboven.',

  'app.unreadableTitle': 'Dit bestand kon niet worden gelezen',
  'app.unreadableMessage': 'Ga na of dit het .xcfg- of .xczfg-bestand is dat ‘Instellingen → ' +
    'Configuratie exporteren’ op het instrument maakt, en of het volledig is.',
  'app.unreadableHint': 'De bytes blijven ongeschonden bewaard: ‘Een kopie opslaan’ geeft het ' +
    'bestand terug zoals het erin ging, zonder ook maar iets te herschrijven.',
  'app.unreadableIncoming': '‘{incoming}’ leverde niets bruikbaars op. ‘{kept}’ blijft open, ' +
    'en alles wat je daarin veranderd hebt, staat er nog.',

  'app.unsavedTitle': 'Je wijzigingen zijn niet opgeslagen',
  'app.replaceMessage': '‘{incoming}’ openen sluit ‘{kept}’ en alles wat je daar net ' +
    'veranderd hebt. Dit gereedschap bewaart uit zichzelf niets: wat niet opgeslagen is, is weg.',
  'app.lastChange': 'Laatste wijziging: ‘{change}’.',
  'app.replaceHint': 'Om niets te verliezen: houd je wijzigingen, en gebruik dan ‘De ' +
    'wijzigingen opslaan’ boven aan de pagina — of berg deze configuratie op in de bibliotheek.',
  'app.replaceAndLose': '‘{incoming}’ openen en ze kwijtraken',
  'app.keepChanges': 'Mijn wijzigingen houden'
}

export default app
