import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Opnieuw',
  'action.redoNothing': 'Niets om opnieuw te doen',
  'action.redoNamed': 'Opnieuw: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.shortNameTitle':
    'De naam die het bestand aan dit paginatype geeft. Hij verandert niet van taal tot taal: het is wat u zou lezen bij het openen van het bestand.',

  'pageKind.free': 'Lege pagina',
  'pageKind.freeNote': 'Leeg aangemaakt op het instrument, klaar voor uw eigen widgets.',
  'pageKind.competition': 'Wedstrijdpagina',
  'pageKind.competitionNote': 'Aangemaakt met de wedstrijdwidgets van het instrument.',
  'pageKind.thermalAssistant': 'Pagina thermiekassistent',
  'pageKind.thermalAssistantNote': 'Aangemaakt met de widgets van de thermiekassistent. Naar ' +
    'dit paginatype schakelt het toestel vanzelf over zodra u gaat kringen.',
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

  'view.enableAllNavigations': 'Voor alle navigaties inschakelen',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Vorige pagina',
  'view.nextPage': 'Volgende pagina',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.pointHint': 'Wijs een widget aan, met de vinger of de muis, voor de naam en de afmetingen.',
  'view.pointHintSelectable': 'Wijs een widget aan, met de vinger of de muis, voor de naam en ' +
    'de afmetingen; kies hem om de instellingen te zien.',

  'view.selectedPin': 'geselecteerd',

  'view.widgetSpoken': '{name}, {width} bij {height} millimeter',

  'view.scaleAdvice': 'De pagina wordt getekend op ware grootte, zoals op het toestel. Uw ' +
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
  'app.settingsHint': 'Algemene instellingen — alles wat u buiten de widgetpagina’s ' +
    'instelt: eenheden, knoppen, sensoren, geluid, luchtruimen.',

  'menu.file': 'Bestand',
  'menu.openFile': 'Een bestand openen…',
  'menu.openFileHint': 'Kies een .xcfg of .xczfg die u uit het instrument hebt geëxporteerd. ' +
    'Het bestand blijft op deze machine.',
  'menu.library': 'Bibliotheek…',
  'menu.libraryHint': 'Bewaar de geopende configuratie onder een naam en vind terug wat u ' +
    'al bewaard hebt. Alles blijft in deze browser: geen server, geen account.',
  'menu.version': 'Versie en compatibiliteit…',
  'menu.versionHint': 'Kies de XCTrack-versie die u voor ogen hebt en zie wat dit bestand ' +
    'bevat dat die versie niet kent — of omgekeerd.',
  'menu.manual': 'Handleiding…',
  'menu.manualHint': 'Hoe u het bestand uit het instrument haalt, uw pagina’s voorbereidt, ' +
    'en wat u nooit mag delen.',

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

  'landing.title': 'Zet uw XCTrack-pagina’s klaar voordat u vliegt',
  'landing.lead': 'Open een .xcfg- of .xczfg-bestand dat u uit het instrument hebt ' +
    'geëxporteerd: de pagina’s verschijnen precies zoals het toestel ze tekent, op ware ' +
    'grootte. Verplaats een widget, wijzig het formaat, voeg er meer toe, en neem daarna een ' +
    'verse kopie mee terug naar de SD-kaart.',

  'landing.privacy': 'Uw bestand verlaat deze machine niet: alles gebeurt in deze browser, ' +
    'zonder server en zonder account. En wat u niet hebt aangeraakt, komt er precies zo uit ' +
    'als het erin ging, zonder één herschreven komma — uw instellingen blijven van u.',

  'landing.dropHere': 'Laat uw bestand hier los',
  'landing.dropOrPick': 'of klik om het te kiezen — .xcfg of .xczfg',

  'landing.stepDeviceTitle': 'Op het instrument',
  'landing.stepDeviceText': '‘Voorkeuren’, ‘Ex- & importeer configuratie’, dan ‘Configuratie ' +
    'exporteren’. Het bestand belandt op de SD-kaart.',
  'landing.stepHereTitle': 'Hier',
  'landing.stepHereText': 'De pagina’s verschijnen genummerd, in de volgorde waarin ‘volgende ' +
    'pagina’ ze tijdens de vlucht doorloopt.',
  'landing.stepEditTitle': 'Bewerken',
  'landing.stepEditText': 'Verplaats een widget met uw vinger of de muis, verander het ' +
    'formaat, voeg er andere toe: de pagina wordt voor uw ogen op ware grootte hertekend.',
  'landing.stepKnowTitle': 'Goed om te weten',
  'landing.stepKnowText': 'Niet het paginatype bepaalt wanneer het toestel een pagina in ' +
    'de vlucht toont, maar een aparte instelling — en deze editor schrijft die voluit uit, ' +
    'pagina voor pagina.',

  'landing.returning': 'Al eens langs geweest? De configuraties die u bewaard hebt, staan in ' +
    'het menu ‘Bestand’ rechtsboven, onder ‘Bibliotheek’: ze zijn deze browser nooit uit geweest.',
  'landing.manualLead': 'Voor het eerst hier? De handleiding zegt wat dit gereedschap doet, wat op het toestel gemeten is, en wat een configuratiebestand over u prijsgeeft.',
  'landing.readManual': 'De handleiding lezen',

  'app.uiLanguage': 'Taal van de interface',
  'app.uiLanguageNamed': 'Taal van de interface: {name}',
  'app.uiLanguageHint': 'De taal van deze interface kiezen. De labels van XCTrack volgen het geopende bestand.',
  'app.uiLanguageLead': 'De woorden van deze interface: titels, uitleg, waarschuwingen. Deze browser onthoudt de keuze.',
  'app.labelsAxisLead': 'De namen van widgets, opties en instellingen, zoals uw instrument ze toont. Ze komen uit het geopende bestand; vermeldt het er geen, dan volgen ze de hierboven gekozen taal.',
  'app.languageDialogTitle': 'Talen',
  'app.languageFailedTitle': 'De taal kon niet worden geladen',

  'app.metaFormat': 'Formaat',
  'app.containerArchiveAlone': '.xczfg-archief — het bevat alleen {inner}, geen enkel bijkomend bestand',
  'app.containerArchiveWith': '.xczfg-archief — het bevat {inner} en {annexes}',
  'app.annexCount': {
    one: '{count} bijkomend bestand',
    other: '{count} bijkomende bestanden'
  },
  'app.containerPlain': '.xcfg-bestand',
  'app.metaDevice': 'Toestel volgens het bestand',
  'app.notDeclared': 'niet vermeld',
  'app.metaLabels': 'XCTrack-labels',
  'app.labelsFromBrowser': '{language} (taal van de browser)',
  'app.labelsFromUi': '{language} (taal van de interface)',
  'app.labelsFromFile': '{language} (door het bestand vermeld)',
  'app.metaRenderSettings': 'Tekeninstellingen',
  'app.renderSettingsAssumed': 'aangenomen waarden, niet in het bestand',

  'app.overviewTitle': 'Pagina’s van de configuratie',

  'app.seeDetail': {
    one: 'Detail bekijken ({count})',
    other: 'Details bekijken ({count})'
  },
  'app.attentionTitle': 'Na te kijken in dit bestand',
  'app.revealsTitle': 'Wat dit bestand over u prijsgeeft',

  'app.editModeNote': 'Bewerkmodus: open een pagina om er widgets aan toe te voegen, ze te ' +
    'verplaatsen en hun opties in te stellen. De pagina’s zelf — toevoegen, dupliceren, ' +
    'verwijderen, van volgorde wisselen — beheert u hier.',

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
  'dock.cramped': 'Dit venster is te laag om de hele pagina en haar instellingen tegelijk ' +
    'te tonen. ‘Inklappen’ geeft de pagina de ruimte van de balk terug, maar neemt u de ' +
    'instellingen af; en geen enkele zoomstap toont haar hier helemaal.',
  'dock.crampedZoom': 'Dit venster is te laag om de hele pagina en haar instellingen tegelijk te tonen. ‘Inklappen’ geeft de pagina de ruimte van de balk terug, maar neemt u de instellingen af; bij een zoom van {level} is ze helemaal te zien, maar niet meer op ware grootte.',
  /**
   * ⚠ **Le cas où le calcul tombe sur 100 % a sa propre phrase.** Voir `syncPlateFit` :
   * « … mais plus à sa taille réelle » suppose le pilote au zoom qu’il a calibré à la
   * règle. À 100 % la supposition tombe, et la phrase contredit alors
   * `view.scaleAdvice`, à trois centimètres de là. Elle dit donc ce que 100 % EST — le
   * cran d’origine — au lieu de dire ce qu’il n’est pas.
   */
  'dock.crampedZoomFull': 'Dit venster is te laag om de hele pagina en haar instellingen tegelijk te tonen. ‘Inklappen’ geeft de pagina de ruimte van de balk terug, maar neemt u de instellingen af; bij een zoom van {level} is ze helemaal te zien — dat is de uitgangsstand, vanwaar u met een echte liniaal bijstelt.',

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
    'van een pagina kunt u hier niet wijzigen — XCTrack legt het bij het aanmaken vast, en ' +
    'wat een wijziging achteraf doet, is niet op het toestel nagegaan.',

  'app.pageOperationFailed': 'Deze wijziging kon niet worden doorgevoerd: uw pagina’s zijn ' +
    'niet verschoven. Technisch detail: {detail}',

  'app.repository': 'Het project op GitHub — een probleem melden, een verbetering voorstellen',
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

  'app.manualBack': 'Handleiding sluiten',
  'app.manualToc': 'Inhoud',
  'app.loadingManual': 'Handleiding laden…',
  'app.manualFailedMessage': 'Er is niets veranderd in uw bestand. Probeer opnieuw.',
  'app.manualFailedTitle': 'De handleiding kon niet worden geopend',
  'app.fileUntouchedRetry': 'Uw bestand is niet gewijzigd. Probeer het opnieuw.',

  'app.versionDialogTitle': 'Beoogde versie en compatibiliteit',
  'app.versionLead': 'Het formaat van XCTrack verandert bij elke versie. Kies de versie die ' +
    'u voor ogen hebt: de editor zegt dan wat dit bestand bevat dat die versie niet kent, en ' +
    'wat ze verwacht en er niet in staat. Het is een vaststelling: er verandert niets zolang ' +
    'u er niet om vraagt.',
  'app.loadingVersions': 'Versiegegevens laden…',
  'app.versionFailedTitle': 'Het versieoverzicht kon niet worden geopend',
  'app.versionFailedMessage': 'De lijst met XCTrack-versies kon niet worden geladen.',

  'app.libraryFailedTitle': 'De bibliotheek kon niet worden geopend',
  'app.libraryFailedMessage': 'Uw browser gaf dit gereedschap geen toegang tot zijn opslag. ' +
    'Het geopende bestand is niet gewijzigd.',

  'app.exportDialogFailedTitle': 'Het opslagvenster kon niet worden geopend',
  'app.exportDialogFailedMessage': 'Er is niets opgeslagen en uw bestand is niet gewijzigd. ' +
    'Probeer het opnieuw.',

  // Het Nederlands scheidt *opslaan* van *downloaden* — zie `index.ts`. Deze drie zinnen
  // gaan over de download zelf, en zeggen dat ook zo.
  'app.exportHandedOver': '‘{name}’ ({size}) — dit gereedschap heeft uw browser gevraagd het op te slaan.',
  'app.exportWhereToLook': 'Te vinden bij uw downloads — deze pagina ziet niet wat daar ' +
    'gebeurt. Staat het er niet bij, sta downloads toe voor deze site en begin opnieuw.',
  'app.exportReceiptDismiss': 'Deze downloadbevestiging sluiten',
  'app.exportWritten': '‘{name}’ ({size}) — uw browser heeft het wegschrijven bevestigd, op de plek die u hebt gekozen.',
  'app.exportCancelled': 'Opslaan geannuleerd: het venster is gesloten zonder iets weg te schrijven, en uw configuratie is niet gewijzigd.',

  'app.exportFailedTitle': 'Het bestand kon niet worden gemaakt',
  'app.exportFailedMessage': 'Er is niets uit dit gereedschap gekomen, en uw configuratie is ' +
    'niet gewijzigd. Probeer het opnieuw.',

  'app.openFailedTitle': 'Dit bestand kon niet worden geopend',
  'app.openFailedMessage': 'Dit gereedschap wist er niets mee aan te vangen. Het bestand zelf ' +
    'is niet gewijzigd.',
  'app.openFailedHint': 'Ga na of het echt een XCTrack-export is (.xcfg of .xczfg). U kunt ' +
    'ergens op deze pagina een ander bestand loslaten, of er een kiezen in het menu ' +
    '‘Bestand’ rechtsboven.',

  'app.unreadableTitle': 'Dit bestand kon niet worden gelezen',
  'app.unreadableMessage': 'Ga na of dit het .xcfg- of .xczfg-bestand is dat op het instrument ' +
    'wordt gemaakt door ‘Voorkeuren’, ‘Ex- & importeer configuratie’, dan ‘Configuratie ' +
    'exporteren’, en of het volledig is.',
  'app.unreadableHint': 'De bytes blijven ongeschonden bewaard: ‘Een kopie opslaan’ geeft het ' +
    'bestand terug zoals het erin ging, zonder ook maar iets te herschrijven.',
  'app.unreadableIncoming': '‘{incoming}’ leverde niets bruikbaars op. ‘{kept}’ blijft open, ' +
    'en alles wat u daarin veranderd hebt, staat er nog.',

  'app.unsavedTitle': 'Uw wijzigingen zijn niet opgeslagen',
  'app.replaceMessage': '‘{incoming}’ openen sluit ‘{kept}’ en alles wat u daar net ' +
    'veranderd hebt. Dit gereedschap bewaart uit zichzelf niets: wat niet opgeslagen is, is weg.',
  'app.lastChange': 'Laatste wijziging: ‘{change}’.',
  'app.replaceHint': 'Om niets te verliezen: houd uw wijzigingen, en gebruik dan ‘De ' +
    'wijzigingen opslaan’ boven aan de pagina — of berg deze configuratie op in de bibliotheek.',
  'app.replaceAndLose': '‘{incoming}’ openen en ze kwijtraken',
  'app.keepChanges': 'Mijn wijzigingen houden',
  /* --------------------------------- wat u hebt gewijzigd: één lijst, twee schermen */

  'menu.changes': 'Wat u hebt gewijzigd',
  'menu.changesHint': 'De lijst van alles wat het geopende bestand scheidt van het document dat u voor u hebt.',
  'changes.title': 'Wat u hebt gewijzigd',
  'changes.none': 'Er is niets gewijzigd sinds ‘{name}’ werd geopend.',
  'changes.noneWhy': 'Het document is, teken voor teken, wat het bestand heeft geleverd: nu opgeslagen komt het er met dezelfde SHA-256-vingerafdruk weer uit.',
  'changes.lead': 'Tussen ‘{name}’, het bestand dat u hebt geopend, en het document dat u voor u hebt: {what}.',
  'changes.caveat': 'Deze opgave vergelijkt twee toestanden; ze telt uw handelingen niet. Wat u hebt gedaan en weer ongedaan gemaakt, staat er niet in, en een rang die alleen is opgeschoven is geen verplaatsing.',
  'changes.beforeSaving': 'Deze opgave zegt wat er aan uw document is gewijzigd. Wat het gemaakte bestand meer of minder meeneemt, hangt af van de uitkomst die u hieronder kiest, en elk daarvan zegt het onder zijn eigen kop.',

  'changes.pagesAdded': { one: '{count} pagina toegevoegd', other: '{count} pagina’s toegevoegd' },
  'changes.pagesRemoved': { one: '{count} pagina verwijderd', other: '{count} pagina’s verwijderd' },
  'changes.pagesChanged': { one: '{count} pagina gewijzigd', other: '{count} pagina’s gewijzigd' },
  'changes.widgetsAdded': { one: '{count} widget toegevoegd', other: '{count} widgets toegevoegd' },
  'changes.widgetsRemoved': { one: '{count} widget verwijderd', other: '{count} widgets verwijderd' },
  'changes.widgetsChanged': { one: '{count} widget gewijzigd', other: '{count} widgets gewijzigd' },
  'changes.settingsTouched': { one: '{count} algemene instelling', other: '{count} algemene instellingen' },
  'changes.otherTouched': { one: '{count} andere bestandsregel', other: '{count} andere bestandsregels' },

  'changes.pagesHeading': 'De pagina’s',
  'changes.settingsHeading': 'De algemene instellingen',
  'changes.settingsNote': 'Elke instelling wordt genoemd naar haar bestandsregel, zoals XCTrack die schrijft. ‘Instellingen’, in de bovenste balk, geeft u de titel in gewone woorden.',
  'changes.otherHeading': 'De overige bestandsregels',
  'changes.otherNote': 'Wat het bestand draagt buiten uw pagina’s en uw instellingen om: zijn identiteitskaart en wat uw versie van XCTrack daar verder schrijft.',

  'changes.pageAt': 'Pagina {rank} — {orientation}',
  'changes.pageAdded': 'toegevoegd',
  'changes.pageRemoved': 'verwijderd',
  'changes.pageCarries': { one: 'ze draagt {count} widget', other: 'ze draagt {count} widgets' },
  'changes.pageCarried': { one: 'ze droeg {count} widget', other: 'ze droeg {count} widgets' },
  'changes.pageMoved': 'van rang {from} naar rang {to} verplaatst',
  'changes.pageTypeChanged': 'paginatype: {from} wordt {to}',
  'changes.pageNavigations': 'navigaties gewijzigd',

  'changes.widgetAdded': 'toegevoegd',
  'changes.widgetRemoved': 'verwijderd',
  'changes.widgetReshaped': 'verplaatst of van grootte veranderd',
  'changes.widgetRestacked': 'voor of achter zijn buren gezet',
  'changes.widgetSettings': { one: '{count} instelling gewijzigd', other: '{count} instellingen gewijzigd' },

  'changes.settingAdded': 'toegevoegd',
  'changes.settingChanged': 'gewijzigd',
  'changes.settingRemoved': 'verwijderd',

  'changes.reorderedWhat': 'De volgorde van de bestandsregels',
  'changes.reordered': 'dezelfde regels, anders gerangschikt',
  'changes.unexplainedWhat': 'Een verschil zonder naam',
  'changes.unexplained': 'het document is ergens gewijzigd wat deze opgave niet kan benoemen',
  'changes.otherwise': 'hier is nog iets anders gewijzigd'
}

export default app
