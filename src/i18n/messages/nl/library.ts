import type { DomainCatalog } from '../../domains'

/**
 * `libraryPanel.ts` — de bibliotheek van benoemde configuraties.
 *
 * *teruggeplaatst*, nooit *hersteld*: het Franse « rétablir » dekt drie gebaren, en dit
 * hier hoort bij de bibliotheek. *Opnieuw uitvoeren* leeft in `app`, het terugzetten bij
 * de zoom.
 */
const library: DomainCatalog<'library'> = {
  /* --------------------------------------------------------------- kop en voet */

  'library.panelLabel': 'Configuratiebibliotheek',
  'library.title': 'Mijn configuraties',
  'library.lead':
    'Bewaar meerdere configuraties onder een naam, in deze browser, en kom er wanneer u wilt op terug. Er wordt niets ergens naartoe gestuurd: alles blijft op dit toestel. De opgeborgen bytes zijn die van uw bestand, nooit een herschreven kopie.',
  'library.storeCurrent': 'De geopende configuratie opbergen',
  'library.addFile': 'Een bestand opbergen…',
  'library.exportAll': 'De bibliotheek exporteren',
  'library.importAll': 'Een bibliotheek importeren…',
  'library.close': 'Sluiten',

  'library.empty':
    'Nog niets opgeborgen. Berg de geopende configuratie op, of sleep er een al geëxporteerd .xcfg-bestand in: het behoudt zijn naam, zijn datum en zijn bytes.',

  'library.footCount': {
    one: '{count} opgeborgen configuratie{size}{broken}.',
    other: '{count} opgeborgen configuraties{size}{broken}.'
  },
  'library.footTotalSize': ' — {size} in totaal',
  'library.footBroken': {
    one: ', {count} onleesbaar item',
    other: ', {count} onleesbare items'
  },

  /* ------------------------------------------------------- de opslag van de browser */

  'library.notDurableTitle': 'Opslag is niet duurzaam',
  'library.notDurableText':
    'Deze browser verleent deze pagina geen blijvende opslag: wat u hier opbergt, leeft zolang het tabblad leeft en verdwijnt daarna. De bibliotheek blijft bruikbaar — maar het is geen back-up. Exporteer haar voordat u sluit.',

  'library.preventErase': 'De browser beletten mijn bibliotheek te wissen',
  'library.persistenceGranted':
    'De browser heeft toegestemd. Dat is nooit een garantie: sommige wissen de gegevens van een site die zeven dagen niet bezocht is toch. De enige back-up die standhoudt, is het archief dat u exporteert.',
  'library.persistenceDenied':
    'De browser heeft geweigerd. De bibliotheek werkt nog steeds, maar hij kan haar wissen: exporteer haar regelmatig.',
  'library.persistenceUnsupported':
    'Deze browser biedt die instelling niet aan. Exporteer uw bibliotheek regelmatig.',

  'library.storageUnknown': 'Deze browser zegt niets over de beschikbare ruimte.',
  'library.storageEstimate':
    'Door deze site gebruikte ruimte: {usage} van {quota} toegekend — de browser geeft er slechts een orde van grootte van.',

  /* ------------------------------------------------------- de niveaus van het paneel */

  'library.backToList': '← Terug naar de lijst',
  'library.back': '← Terug',
  'library.returnToList': 'Terug naar de lijst',
  'library.cancel': 'Annuleren',
  'library.announceBackToList': 'Terug naar de lijst met configuraties.',
  'library.announceBackTo': 'Terug: {title}.',

  /* ------------------------------------------------------- de knoppen van een item */

  'library.load': 'Laden',
  'library.extract': 'Het bestand er weer uit halen',
  'library.identity': 'Identiteitskaart',
  'library.verify': 'De vingerafdruk nakijken',
  'library.rename': 'Hernoemen',
  'library.remove': 'Verwijderen',
  'library.store': 'Opbergen',
  'library.save': 'Opslaan',

  /* --------------------------------------------------------- een item in de lijst */

  'library.entryStamp': 'Opgeborgen op {when} · {file}',
  'library.unknownFileName': 'onbekend bestand',
  'library.chipArchive': '.xczfg-archief',
  'library.personalCount': {
    one: '{count} persoonlijk gegeven',
    other: '{count} persoonlijke gegevens'
  },
  'library.personalTravellingCount': {
    one: '{count} gaat mee met de pagina’s',
    other: '{count} gaan mee met de pagina’s'
  },

  /* ------------------------------------------------------------- het exportformaat */

  'library.exportTypeBackup': 'Volledige back-up (pagina’s en voorkeuren)',
  'library.exportTypePages': 'Alleen pagina’s (geen enkele voorkeur)',
  'library.exportTypeUndeclared': 'Niet opgegeven door het bestand',
  'library.chipBackup': 'Back-up',
  'library.chipPages': 'Alleen pagina’s',
  'library.chipUndeclared': 'Soort niet opgegeven',

  /* ------------------------------- identiteitskaart: wat het bestand opgeeft */

  'library.identityTitle': 'Identiteitskaart — {name}',
  'library.identityLead':
    'Twee helften, nooit vermengd: wat het bestand opgeeft, en wat deze editor erover veronderstelt. Alles wat verondersteld is, kan verkeerd zijn zonder dat het bestand schuld heeft.',
  'library.readNote':
    'Gelezen zoals het in de opgeborgen bytes staat. Een ontbrekend veld wordt ontbrekend genoemd, nooit vervangen door een fabriekswaarde.',
  'library.assumedNote':
    'Niets hiervan staat in het bestand. Het toestel en zijn resolutie komen uit onze tabel; dat een widget voorbehouden is aan de Pro-versie komt uit een uit de APK gehaalde catalogus.',

  'library.factExportType': 'Exportformaat',
  'library.factExportTypeNote': 'Regel info.exportType van het bestand.',

  'library.factContainer': 'Container',
  'library.containerArchive': {
    one: '.xczfg-archief — {count} bijkomend bestand',
    other: '.xczfg-archief — {count} bijkomende bestanden'
  },
  'library.containerPlain': '.xcfg-bestand',
  'library.containerExtrasNote': 'Bijlagen: {names}. Deze editor bekijkt de inhoud ervan niet.',

  'library.factSize': 'Grootte',

  'library.factVersion': 'Opgegeven XCTrack-versie',
  'library.versionAbsent': 'Het bestand zegt ze niet',
  'library.versionValue': '{name} — versiecode {code}',
  'library.versionNameAbsent': '(naam ontbreekt)',
  'library.versionCodeAbsent': '(ontbreekt)',
  'library.factVersionNote': 'Regels info.versionName en info.versionCode van het bestand.',

  'library.factDevice': 'Opgegeven toestel',
  'library.deviceAbsent': 'Het bestand zegt het niet',
  'library.factDeviceNote': 'Ruwe tekst uit info.device. Ze draagt geen enkele resolutie.',

  'library.factPages': 'Pagina’s',
  'library.noPage': 'geen pagina',
  'library.landscapePageCount': {
    one: '{count} liggende pagina',
    other: '{count} liggende pagina’s'
  },
  'library.portraitPageCount': {
    one: '{count} staande pagina',
    other: '{count} staande pagina’s'
  },

  'library.factWidgets': 'Widgets',
  'library.widgetsOfTypes': {
    one: '{count} widget van {types}',
    other: '{count} widgets van {types}'
  },
  'library.typeCount': { one: '{count} soort', other: '{count} soorten' },
  'library.topTypesNote': 'Meest gebruikt: {types}.',

  'library.factRootSections': 'Secties van het hoogste niveau',
  'library.noRootSection': 'geen',

  'library.factSettings': 'Opgeborgen instellingen',
  'library.settingsNone': 'geen — dit bestand draagt uw voorkeuren niet mee',
  'library.settingLineCount': { one: '{count} regel', other: '{count} regels' },
  'library.settingsNote':
    'Deze editor kan er maar enkele families van benoemen: het aantal staat hier zodat de rest zichtbaar blijft.',

  'library.factDuplicates': 'Dubbele regels',
  'library.duplicateLineCount': {
    one: '{count} dubbele regel',
    other: '{count} dubbele regels'
  },
  'library.duplicatesNote': 'XCTrack leest er maar één van: {keys}.',

  'library.factExternal': 'Verwachte externe bronnen',
  'library.externalNote':
    'Deze bestanden moeten op het ontvangende toestel bestaan; ze zitten niet in de configuratie.',

  'library.factParse': 'Ontleding',
  'library.parseFailed': 'De inhoud kon niet ontleed worden',
  'library.parseNote':
    'De bytes zijn opgeborgen en komen er onveranderd weer uit; het is hun beschrijving die ontbreekt. Technische bijzonderheid: {detail}.',

  /* ------------------------------ identiteitskaart: wat de editor veronderstelt */

  'library.factScreen': 'Gekozen schermsjabloon',
  'library.screenFallback': '{device} — terugvalsjabloon, geen toestel herkend',
  'library.factScreenNote':
    'De resolutie komt uit de toesteltabel van deze editor, niet uit het bestand.',

  'library.factPro': '‘Pro’-widgets',
  'library.proUnknown': 'Onbekend — er is geen widgetcatalogus geleverd',
  'library.proNone': 'Geen',
  'library.proUnknownNote':
    'Of een widget voorbehouden is aan de Pro-versie, raden wij niet: zonder catalogus zeggen we niets.',
  'library.proNote': 'Volgens de uit de APK {version} gehaalde catalogus, niet volgens het bestand.',

  'library.factVersionGap': 'Stand van de versie',
  'library.versionGapOlder': 'Ouder dan die waarvoor deze editor tekent',
  'library.versionGapSame': 'Die waarvoor deze editor tekent',
  'library.versionGapNewer': 'Nieuwer dan die waarvoor deze editor tekent',
  'library.versionGapUnknown': 'Het bestand zegt niet uit welke versie het komt',
  'library.factVersionGapNote':
    'Deze editor stemt zijn tekening af op één bepaalde versie van XCTrack; daarmee wordt dit bestand vergeleken, niet met die op uw toestel.',

  'library.factPersonalTravels': 'Persoonlijke gegevens die met de pagina’s meereizen',
  'library.personalTravelsYes': 'Ja — de opmaak draagt minstens één door u geschreven tekst',
  'library.personalTravelsNo': 'Nee — geen vrije tekst in de opmaak gevonden',
  'library.personalTravelsYesNote':
    'Een export ‘pagina’s’ is dus van nature niet anoniem: de naam en het nummer van een oproepknop staan in de opmaak, niet in de voorkeuren.',
  'library.personalTravelsNoNote':
    'De lijst met vrijetekstvelden ligt vast en zal verouderen: ze bewijst geen afwezigheid.',

  /* ------------------------------------------------------------- het item zelf */

  'library.entryItself': 'Het item zelf',
  'library.fieldName': 'Naam',
  'library.factOriginalFile': 'Oorspronkelijk bestand',
  'library.unknownOriginalFile': '(onbekend)',
  'library.factStoredOn': 'Opgeborgen op',
  'library.factLastWrite': 'Laatste schrijfbeurt',
  'library.factDigest': 'SHA-256-vingerafdruk',
  'library.yourNote': 'Uw notitie: {note}',

  'library.timesStored': {
    one: 'slechts één keer opgeslagen',
    other: '{count} keer opgeslagen'
  },

  /* --------------------------------------- wat het item aan persoonlijks draagt */

  'library.personalHeading': 'Wat dit item aan persoonlijks draagt',
  'library.noPersonalData': 'Geen persoonlijke gegevens opgemerkt. {caveat}',
  'library.personalSummary':
    '{total} in dit item: {layout} in de opmaak, die met de pagina’s meegaat, en {preferences} in de voorkeuren, die bij een export ‘pagina’s’ bij u blijven. {filled}, {empty}. Ze worden getoond, nooit weggehaald: u beslist.',
  'library.personalTotal': {
    one: '{count} persoonlijk gegeven is aanwezig',
    other: '{count} persoonlijke gegevens zijn aanwezig'
  },
  'library.personalFilled': {
    one: '{count} is ingevuld',
    other: '{count} zijn ingevuld'
  },
  'library.personalEmpty': {
    one: '{count} is een lege plaats',
    other: '{count} zijn lege plaatsen'
  },
  'library.basisReadInApp': 'in de toepassing gelezen',
  'library.basisJudgedHere': 'door deze editor beoordeeld',
  'library.travelsCaveat':
    'De regels met ‘gaat mee met de pagina’s’ staan in de opmaak: ze reizen zelfs mee in een export ‘pagina’s’. Een ‘pagina’s’ afleiden is een grove sortering, geen schoonmaak.',

  /* ------------------------------------------------------------- het voorbeeld */

  'library.previewHeading': 'Voorbeeld',
  'library.previewOfLandscapePage': 'Pagina {rank} in liggend formaat, zoals deze editor haar tekent.',
  'library.previewOfPortraitPage': 'Pagina {rank} in staand formaat, zoals deze editor haar tekent.',
  'library.previewMasked':
    'Wat u zelf hebt geschreven — eigen titels, vrije tekst, belkaart — wordt vervangen door grijze balken: een beeld ontsnapt aan het anonimiseren, dat alleen op het bestand werkt.',
  'library.previewAbsent': 'Geen voorbeeld voor deze configuratie.',
  'library.previewNotInArchive':
    'Het bibliotheekarchief neemt geen enkel voorbeeld mee: een beeld zou de browser verlaten met uw getekende pagina’s erop. Het wordt hier, lokaal, opnieuw gemaakt na een invoer.',

  /* --------------------------------------------------------------------- opbergen */

  'library.storeLead':
    'Geef haar een naam die u over zes maanden herkent — ‘Comp Annecy’, ‘Vol-biv Alpes’, ‘École’. Wat opgeborgen wordt, is uw bestand zelf, zonder één herschreven komma.',
  'library.fieldNoteOptional': 'Notitie (facultatief)',
  'library.noteHint':
    'Wat u maar wilt: het vlieggebied, de vleugel, de instelling van de vario. Wordt nooit geïnterpreteerd.',
  'library.stored': '‘{name}’ is opgeborgen — {size}, vingerafdruk {digest}…',
  'library.noOpenFile':
    'Er is geen bestand geopend: open een configuratie, of berg een bestand van de schijf op.',

  'library.storedLine': '‘{name}’ is opgeborgen — {size}, {when}.',

  /* ------------------------------------------------------------------------ laden */

  'library.loaded': '‘{name}’ is geladen — {size}, bytes tegen hun vingerafdruk nagekeken.',
  'library.unsavedTitle': 'Wijzigingen zijn niet opgeslagen',
  'library.unsavedBody':
    'Het geopende document — ‘{file}’ — draagt wijzigingen die u niet hebt opgeslagen. ‘{name}’ laden vervangt ze in de editor.',
  'library.storeFirstCaveat':
    'Eerst opbergen kost niets: de geopende configuratie krijgt een naam in de bibliotheek, en u komt er met één klik op terug.',
  'library.storeThenLoad': 'Eerst opbergen, dan laden',
  'library.loadWithoutStoring': 'Laden zonder opbergen',

  /* ------------------------------------------------ het bestand er weer uit halen */

  'library.extracted': {
    one: '‘{name}’ komt er weer uit zoals ze erin ging: {count} byte, vingerafdruk nagekeken.',
    other: '‘{name}’ komt er weer uit zoals ze erin ging: {count} bytes, vingerafdruk nagekeken.'
  },

  /* ------------------------------------------------------------- de vingerafdruk */

  'library.digestTitle': 'Vingerafdruk — {name}',
  'library.verifyNote':
    'De vingerafdruk is bij het opbergen op de opgeborgen bytes gelegd. Deze is zopas herberekend op wat de bibliotheek nu teruggeeft.',
  'library.digestStored': 'Opgeslagen',
  'library.digestFresh': 'Zopas herberekend',
  'library.digestMissing': 'geen — de bytes zijn niet teruggegeven',
  'library.sizeUnreadable': 'onleesbaar — {expected} verwacht',
  'library.sizeCompared': {
    one: '{count} byte — {expected} verwacht',
    other: '{count} bytes — {expected} verwacht'
  },
  'library.digestSame':
    'Gelijk: de opgeborgen bytes zijn precies die van het oorspronkelijke bestand.',
  'library.digestDiffers': 'Verschillend — dit item wordt niet teruggegeven.',

  /* ------------------------------------------------------------------ verwijderen */

  'library.removeTitle': '‘{name}’ verwijderen?',
  'library.removeBody':
    '‘{name}’ en haar {size} worden uit deze browser gehaald. Deze bibliotheek heeft geen prullenbak.',
  'library.removeCaveat':
    'Als u niet zeker bent: haal eerst het bestand eruit, of exporteer de hele bibliotheek.',
  'library.removed': '‘{name}’ is verwijderd.',

  /* ------------------------------------------- de hele bibliotheek wissen */

  'library.clearAll': 'De hele bibliotheek wissen',
  'library.clearAllTitle': 'De hele bibliotheek wissen?',
  'library.clearAllConfirm': 'Alles wissen',

  'library.clearAllBody': {
    one: '{count} opgeborgen configuratie verlaat deze browser{size}{broken}.',
    other: '{count} opgeborgen configuraties verlaten deze browser{size}{broken}.'
  },
  'library.clearAllBytes': ' — {size} aan bytes gaan mee',
  'library.clearAllBroken': {
    one: ', evenals {count} onleesbaar item',
    other: ', evenals {count} onleesbare items'
  },
  'library.clearAllCaveat':
    'De bytes gaan mee: het is uw eigen bestand dat gewist wordt, en deze bibliotheek heeft geen prullenbak. Er is nooit iets ergens naartoe gestuurd — er valt dus geen kopie terug te halen, hier niet en bij niemand anders.',
  'library.clearAllScope':
    'Dit gebaar wist de bibliotheek, en niets anders. Drie instellingen van deze editor blijven in deze browser: de taal van de interface, de hoogte van de instellingenbalk, en de apparaten die u zelf hebt toegevoegd. Geen van de drie draagt een configuratie, een pagina of een waypointbestand — het zijn een taalkeuze en schermafmetingen. Om helemaal niets achter te laten, wist u de gegevens van deze site vanuit uw browser: dat is het enige gebaar dat ook die meeneemt.',

  'library.exportThenClear': 'Eerst het archief exporteren, dan alles wissen',
  'library.clearWithoutExport': 'Alles wissen zonder te exporteren',

  'library.cleared': {
    one: 'De bibliotheek is leeg: {count} configuratie gewist{size}.',
    other: 'De bibliotheek is leeg: {count} configuraties gewist{size}.'
  },
  'library.clearedAfterExport': {
    one: 'Het archief is gedownload, daarna is de bibliotheek geleegd: {count} configuratie gewist{size}.',
    other: 'Het archief is gedownload, daarna is de bibliotheek geleegd: {count} configuraties gewist{size}.'
  },
  'library.clearedBytes': ', {size} aan bytes vrijgemaakt',

  /* --------------------------------------------------------- het onleesbare item */

  'library.brokenName': 'Onleesbaar item',
  'library.brokenNote':
    'Het belet de andere niet zich te tonen, en het blijft verwijderbaar. Zijn bytes worden niet geëxporteerd: men schrijft niet in een back-up wat men niet zou kunnen teruggeven.',
  'library.brokenBody':
    'Dit item laat zich niet meer lezen: we weten niet wat het bevatte. Het verwijderen maakt zijn plaats vrij en verliest niets leesbaars.',
  'library.brokenTechnical': 'Interne identificatie {id}. Technische bijzonderheid: {reason}.',
  'library.removeBrokenTitle': 'Dit onleesbare item verwijderen?',
  'library.brokenRemoved': 'Het onleesbare item is verwijderd.',
  'library.brokenHeading': {
    one: '{count} item dat zich niet meer laat lezen',
    other: '{count} items die zich niet meer laten lezen'
  },

  /* -------------------------------------------------- exporteren en importeren */

  'library.exported': {
    one: '{count} configuratie naar een ZIP-archief geëxporteerd. Elke .xcfg komt er met om het even welke uitpakker uit.{tail}',
    other: '{count} configuraties naar een ZIP-archief geëxporteerd. Elke .xcfg komt er met om het even welke uitpakker uit.{tail}'
  },
  'library.exportSkipped': {
    one: ' {count} onleesbaar item zit er niet in: de back-up is onvolledig, en zegt het.',
    other: ' {count} onleesbare items zitten er niet in: de back-up is onvolledig, en zegt het.'
  },

  'library.importTitle': 'Bibliotheek geïmporteerd',
  'library.importLead':
    'Archief geëxporteerd op {when}. Geen enkel bestaand item is overschreven: een item dat al onder andere bytes aanwezig is, wordt ernaast teruggeplaatst, met een achtervoegsel.',
  'library.outcomeImported': 'teruggeplaatst',
  'library.outcomeAlreadyPresent': 'al aanwezig, niets te doen',
  'library.outcomeDuplicated': 'ernaast teruggeplaatst: de identificatie was al bezet',
  'library.outcomeRejected': 'geweigerd',
  'library.imported': {
    one: '{count} item in het archief gelezen.',
    other: '{count} items in het archief gelezen.'
  },
  'library.importedWithRejected': {
    one: '{count} item in het archief gelezen — {rejected}.',
    other: '{count} items in het archief gelezen — {rejected}.'
  },
  'library.rejectedCount': { one: '{count} geweigerd', other: '{count} geweigerd' },

  /* ----------------------------------------------- wat mislukt, en zijn uitweg */

  'library.exportNow': 'De bibliotheek nu exporteren',
  'library.reloadLibrary': 'De bibliotheek opnieuw laden',
  'library.conflict':
    '{message} Er is niets geschreven: uw wijziging heeft de zijne niet overschreven.',
  'library.operationFailed':
    '{context}: de bewerking is niet doorgegaan. Technische bijzonderheid: {detail}',

  'library.contextStoring': 'Opbergen',
  'library.contextLoading': 'Laden',
  'library.contextRemoving': 'Verwijdering',
  'library.contextExtracting': 'Teruggave',
  'library.contextVerifying': 'Nakijken',
  'library.contextRenaming': 'Hernoemen',
  'library.contextExporting': 'Export van de bibliotheek',
  'library.contextClearing': 'Wissen van de bibliotheek',
  'library.contextImporting': 'Import van de bibliotheek',
  'library.contextReading': 'Lezen van de bibliotheek',

  /* -------------------------------------------------------------------- hernoemen */

  'library.renameTitle': '‘{name}’ hernoemen',
  'library.renameLead': 'De naam is van u; de opgeborgen bytes bewegen niet.',
  'library.fieldNote': 'Notitie',
  'library.renamed': '‘{name}’ is bijgewerkt — {times}.',

  /* --------------------------------- ‘teruggeplaatst’, de derde « rétablir » */

  'library.entryRestored': '‘{name}’ is teruggeplaatst.',
  'library.entryRestoredBeside': '‘{name}’ is ernaast teruggeplaatst: de identificatie was al bezet.',

  'library.entryCount': {
    one: '{count} opgeborgen configuratie',
    other: '{count} opgeborgen configuraties'
  }
}

export default library
