import type { DomainCatalog } from '../../domains'

/** La prose hors interface — voir `fr/model.ts`. */
const model: DomainCatalog<'model'> = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identiteit',
  'personalKind.credential': 'inloggegevens',
  'personalKind.contact': 'contact',
  'personalKind.device': 'toestel',
  'personalKind.location': 'positie',
  'personalKind.file': 'bestand',
  'personalKind.freeText': 'vrije tekst',
  'personalKind.equipment': 'uitrusting',
  'personalKind.sharing': 'delen',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack geeft het zelf aan',
  'personalBasis.inputType': 'XCTrack voert het in als puntjes, zoals een wachtwoord',
  'personalBasis.declared': 'dat is ons oordeel, niet dat van XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Indeling — gaat met de pagina’s mee',
  'personalHome.preferences': 'Voorkeuren — blijven bij u in een ‘pages’-export',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'eigen titel van een widget, door u geschreven',
  'personalReason.text': 'volledige inhoud van een vrijetekstwidget, door u geschreven',
  'personalReason.fullName': 'naam van een persoon die op een belknop is opgeslagen',
  'personalReason.phoneNumber': 'telefoonnummer dat op een belknop is opgeslagen',
  'personalReason.url': 'ingevoerd webadres, dat een token of een identificatie kan bevatten',
  'personalReason.title': 'opschrift van een startknop, door u geschreven',
  'personalReason.name': 'naam van de toepassing die een startknop aanroept',
  'personalReason.action': 'Android-actie van een startknop, die een volledige URI kan zijn',
  'personalReason.filter': 'logfilter dat u hebt ingevoerd',
  'personalReason.suffix': 'tekst achter de weergegeven waarde, door u geschreven',
  'personalReason.event': 'gebeurtenisnaam die u hebt ingevoerd',
  'personalReason.unknown': 'vrije tekst zonder eigen regel: uit voorzorg als persoonlijk behandeld',

  /* ---- waarom een **instelling** persoonlijk heet — zie `fr/model.ts` */

  'personalReason.pilotName': 'uw naam, precies zoals ingevoerd',
  'personalReason.gliderName': 'uw scherm — model en maat herkennen een piloot in een club',
  'personalReason.gliderProducer': 'fabrikant van het scherm',
  'personalReason.gliderModel': 'model van het scherm',
  'personalReason.gliderCategory': 'klasse van het scherm',
  'personalReason.hangGliderCategory': 'klasse van de deltavlieger',
  'personalReason.xcontestAccount': 'identificatie van het XContest-account',
  'personalReason.skysightAccount': 'identificatie van het SkySight-account',
  'personalReason.safeSkyAddress': 'adres van het SafeSky-account',
  'personalReason.registration': 'registratie van het luchtvaartuig',
  'personalReason.derivedRegistration': 'afgeleide registratie',
  'personalReason.stableDeviceId': 'toestelidentificatie, gelijkblijvend tussen vluchten',
  'personalReason.trackingDeviceId': 'toestelidentificatie van de volgdienst',
  'personalReason.quickMessages': 'door u geschreven berichten',
  'personalReason.sensors': 'de gekoppelde sensoren, met Bluetooth-adressen',
  'personalReason.glasses': 'de gekoppelde bril',
  'personalReason.glassesName': 'de naam van de gekoppelde bril',
  'personalReason.everysightKey': 'toegangssleutel voor de Everysight-SDK',
  'personalReason.waypointFiles': 'waypointbestanden — de naam duidt vaak de wedstrijd aan',
  'personalReason.navigationState': 'de lopende taak, met keerpunten en coördinaten',
  'personalReason.airspaceFiles': 'luchtruimbestanden die u hebt geladen',
  'personalReason.offlineMaps': 'gedownloade offlinekaarten',
  'personalReason.mapTheme': 'kaartthema dat u hebt geïnstalleerd',
  'personalReason.guessedPosition': 'de vermoede positie van het toestel — in de praktijk het thuisadres',
  'personalReason.lastNetLocation': 'de laatste positie waarmee het QNH is opgevraagd',
  'personalReason.replayFile': 'een van uw spoorbestanden',
  'personalReason.speechText': 'tekst die u hebt ingevoerd',
  'personalReason.secureScope': 'bereik SECURE: XCTrack bewaart ze bij zijn versleutelde voorkeuren',
  'personalReason.maskedField': 'verborgen invoerveld (`textPassword`)',
  'personalReason.broadcastChoice': 'een uitzendkeuze die u hebt gemaakt, geen gegeven op zich',
  'personalReason.legacyRecord': 'opgemerkt door een eerdere versie van deze editor, ' +
    'die de aard ervan niet vermeldde. Laad deze vermelding opnieuw voor de volledige ' +
    'inventaris.',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'plek aanwezig, maar leeg',

  'personal.hiddenStructure': {
    one: 'structuur met {count} vermelding, niet getoond',
    other: 'structuur met {count} vermeldingen, niet getoond'
  },

  'personal.caveat': {
    one: 'Deze inventaris betreft de instellingen die XCTrack {version} kent: {count} instelling en elf vrijetekstvelden van de widgets. Het formaat verandert bij elke versie — een lege inventaris bewijst dus geen afwezigheid.',
    other: 'Deze inventaris betreft de instellingen die XCTrack {version} kent: {count} instellingen en elf vrijetekstvelden van de widgets. Het formaat verandert bij elke versie — een lege inventaris bewijst dus geen afwezigheid.'
  },

  /* --------- sharing.ts — wat wat vervangt, en waarom. Zie `fr/model.ts`. */

  'sharingReason.titletext': 'Eigen titel van de widget: vervangen door een neutrale, ' +
    'genummerde titel, zodat de opmaak en het onderscheid tussen de widgets behouden blijven.',
  'sharingReason.text': 'Volledige inhoud van een vrijetekstwidget: vervangen door een ' +
    'korte tekst, zodat het kader gevuld blijft zonder over te lopen.',
  'sharingReason.fullName': 'Naam van een persoon die op een belknop is opgeslagen: ' +
    'vervangen door een neutraal opschrift.',
  'sharingReason.phoneNumber': 'Telefoonnummer: vervangen door een nummer met hetzelfde ' +
    'patroon maar dat niet te bellen is — ‘00’ is geen landnummer.',
  'sharingReason.url': 'Webadres dat u hebt ingevoerd, dat een token of een identificatie ' +
    'kan bevatten: vervangen door een adres in het gereserveerde domein ‘.invalid’, dat ' +
    'nooit wordt herleid.',
  'sharingReason.title': 'Opschrift van een startknop: vervangen door een neutraal, ' +
    'genummerd opschrift.',
  'sharingReason.name': 'Naam van de toepassing die een startknop opent: vervangen door een ' +
    'neutraal, genummerd opschrift.',
  'sharingReason.action': 'Android-actie van een startknop, die een volledige URI kan zijn: ' +
    'vervangen door de interne testactie die XCTrack op een nieuwe knop zet.',
  'sharingReason.filter': 'Logfilter dat u hebt ingevoerd: geleegd, dat wil zeggen ‘geen ' +
    'filter’, de neutrale waarde van de instelling.',
  'sharingReason.suffix': 'Tekst achter de weergegeven waarde: geleegd, dat wil zeggen ' +
    '‘geen achtervoegsel’, de neutrale waarde van de instelling.',
  'sharingReason.event': 'Gebeurtenisnaam die u hebt ingevoerd: vervangen door de ' +
    'testgebeurtenis die XCTrack op een nieuwe widget zet.',
  'sharingReason.unknownFreeText': 'Vrije tekst zonder eigen regel: uit voorzorg vervangen ' +
    'door een neutrale tekst.',

  'sharingReason.credential': 'Inloggegeven of wachtwoord. De hele regel wordt verwijderd: ' +
    'een inloggegeven heeft geen neutrale waarde, en er een verzinnen zou het aanmelden van ' +
    'de ontvanger laten mislukken in plaats van het gewoon leeg te laten.',
  'sharingReason.activeLookDevice': 'De ActiveLook-bril die met uw toestel is gekoppeld. ' +
    'Teruggezet op de in XCTrack geïnventariseerde fabriekswaarde — de lege tekenreeks, dat ' +
    'wil zeggen ‘geen bril’.',
  'sharingReason.activeLookName': 'De naam van uw ActiveLook-bril. Teruggezet op de in ' +
    'XCTrack geïnventariseerde fabriekswaarde — de lege tekenreeks, dat wil zeggen ‘geen bril’.',
  'sharingReason.airspaceFiles': 'De luchtruimbestanden die u hebt geladen. De hele regel ' +
    'wordt verwijderd: het zijn bestanden van uw eigen toestel, die de ontvanger niet heeft.',
  'sharingReason.guessedPosition': 'De vermoede positie van uw toestel — in de praktijk uw ' +
    'thuisadres. De hele regel wordt verwijderd: geen enkele vervangende coördinaat zou ' +
    'eerlijk zijn.',
  'sharingReason.speechText': 'Een tekst die u voor de spraakweergave hebt ingevoerd. ' +
    'Vervangen door een korte, neutrale tekst, zodat de instelling ingevuld blijft.',
  'sharingReason.gliderCategory': 'De klasse van uw scherm. Behouden: het is een ' +
    'vlieginstelling, ze draagt geen naam, geen nummer en geen adres, en vaak is juist zij ' +
    'wat men wil delen.',
  'sharingReason.hangGliderCategory': 'De klasse van uw deltavlieger. Behouden: het is een ' +
    'vlieginstelling, ze draagt geen naam, geen nummer en geen adres, en vaak is juist zij ' +
    'wat men wil delen.',
  'sharingReason.gliderName': 'De naam van uw scherm — model en maat volstaan om u in een ' +
    'club te herkennen. Vervangen door een neutraal woord, zodat de instelling ingevuld blijft.',
  'sharingReason.gliderModel': 'Het model van uw scherm. Teruggezet op de in XCTrack ' +
    'geïnventariseerde fabriekswaarde — de lege tekenreeks, dat wil zeggen ‘geen model gekozen’.',
  'sharingReason.gliderProducer': 'De fabrikant van uw scherm. Teruggezet op de in XCTrack ' +
    'geïnventariseerde fabriekswaarde — de lege tekenreeks, dat wil zeggen ‘geen fabrikant ' +
    'gekozen’.',
  'sharingReason.livetrackChoice': 'Een Livetrack-uitzendkeuze die u hebt gemaakt. ' +
    'Behouden: het is een instelling, geen gegeven — ze draagt geen naam en geen ' +
    'accountidentificatie.',
  'sharingReason.quickMessages': 'De snelberichten die u voor het Livetracking hebt ' +
    'geschreven. De hele regel wordt verwijderd: het is een lijst van uw eigen zinnen, en ' +
    'de ontvanger schrijft de zijne.',
  'sharingReason.offlineMaps': 'De offlinekaarten die op uw toestel zijn geïnstalleerd. De ' +
    'hele regel wordt verwijderd: het zijn bestanden van uw eigen toestel, die de ontvanger ' +
    'niet heeft.',
  'sharingReason.mapTheme': 'Het kaartthema dat u hebt geïnstalleerd, aangeduid met zijn ' +
    'pad. Teruggezet op de in XCTrack geïnventariseerde fabriekswaarde, ‘DEFAULT’: de kaart ' +
    'van de ontvanger wordt getekend, in plaats van een bestand te zoeken dat hij niet heeft.',
  'sharingReason.navigationState': 'Uw lopende taak, met keerpunten en coördinaten. De hele ' +
    'regel wordt verwijderd: het schema verandert bij elke versie van XCTrack, en een ' +
    'vervangende structuur zou een vorm zijn die de toepassing nooit schrijft.',
  'sharingReason.waypointFiles': 'Uw waypointbestanden — hun naam duidt vaak de wedstrijd ' +
    'aan waaraan u deelneemt. De hele regel wordt verwijderd: het zijn bestanden van uw ' +
    'eigen toestel, die de ontvanger niet heeft.',
  'sharingReason.pilotName': 'Uw naam, precies zoals ingevoerd. Vervangen door een neutraal ' +
    'woord in plaats van geleegd: XCTrack toont hem en stuurt hem mee met het Livetracking, ' +
    'en een lege naam is geen toestand die men ervan kent.',
  'sharingReason.derivedRegistration': 'De afgeleide registratie van uw luchtvaartuig. De ' +
    'hele regel wordt verwijderd: een registratie duidt een luchtvaartuig en zijn eigenaar ' +
    'aan, en er een verzinnen zou een ander aanduiden.',
  'sharingReason.registration': 'De registratie van uw luchtvaartuig. De hele regel wordt ' +
    'verwijderd: een registratie duidt een luchtvaartuig en zijn eigenaar aan, en er een ' +
    'verzinnen zou een ander aanduiden.',
  'sharingReason.sensors': 'Uw gekoppelde sensoren, met Bluetooth-adressen. De hele regel ' +
    'wordt verwijderd: de ontvanger koppelt de zijne, die toch de enige zijn die hij kan ' +
    'gebruiken.',
  'sharingReason.lastNetLocation': 'De laatste positie waarmee het QNH is opgevraagd. ' +
    'Teruggezet op de in XCTrack geïnventariseerde fabriekswaarde — de lege tekenreeks, dat ' +
    'wil zeggen ‘geen positie’.',
  'sharingReason.replayFile': 'Een van uw spoorbestanden. Teruggezet op de in XCTrack ' +
    'geïnventariseerde fabriekswaarde — de lege tekenreeks, dat wil zeggen ‘geen spoor om ' +
    'af te spelen’.',
  'sharingReason.unknownPreference': 'Persoonlijke instelling zonder eigen regel: de hele ' +
    'regel wordt uit voorzorg verwijderd.',
  'sharingReason.shapeMismatch': 'Deze instelling draagt niet de tekst die haar regel ' +
    'verwachtte — haar vorm is sinds de inventarisatie veranderd. De hele regel wordt ' +
    'verwijderd: een woord schrijven in plaats van een structuur zou een bestand opleveren ' +
    'dat XCTrack zou weigeren.',
  'sharingReason.emptySlot': 'De plek is in het bestand aanwezig, maar draagt niets: er is ' +
    'niets te vervangen, en de regel blijft zoals hij is.',

  /* ------------ wat op een persoonsgegeven lijkt zonder aangegeven te zijn: de aanwijzing */

  'suspectClue.url': 'Deze tekst heeft de vorm van een webadres, dat een token of een ' +
    'identificatie kan bevatten.',
  'suspectClue.mail': 'Deze tekst heeft de vorm van een e-mailadres.',
  'suspectClue.path': 'Deze tekst heeft de vorm van een bestandspad op uw toestel.',
  'suspectClue.hardware': 'Deze tekst heeft de vorm van een Bluetooth- of netwerkadres van ' +
    'een toestel.',
  'suspectClue.phone': 'Deze tekst heeft de vorm van een telefoonnummer.',
  'suspectClue.letters': 'Deze tekst bevat letters met accenten of tekens buiten het ' +
    'eenvoudige Latijnse alfabet: hij is geschreven, niet uit een lijst gekozen.',
  'suspectClue.sentence': 'Deze tekst bevat een spatie: hij leest als een zin, niet als een ' +
    'waarde die je uit een lijst kiest.',

  /* -------- de controle vóór het vliegen — zie `fr/model.ts` over de drie veronderstellingen */

  'inspection.landscape': 'Liggend',
  'inspection.portrait': 'Staand',
  'inspection.wherePage': '{orientation}, pagina {page}',
  'inspection.whereWidget': '{orientation}, pagina {page}, widget {rank}',

  'ruleTitle.unreachableWidget': 'Widget niet aan te raken',
  'ruleTitle.pageNeverShown': 'Pagina die nooit wordt getoond',
  'ruleTitle.thermalPages': 'Meerdere pagina’s met thermiekassistent',
  'ruleTitle.widgetTooSmall': 'Widget misschien te klein om te lezen',
  'ruleTitle.proWidget': 'Pro-widget zonder aangegeven licentie',
  'ruleTitle.roadMaps': 'Twee wegenkaarten op dezelfde pagina',
  'ruleTitle.obsoleteKey': 'Instelling van een eerdere versie',

  'ruleSummary.unreachableWidget': 'Geen enkel punt van deze widgets ontsnapt aan de ' +
    'widgets die erna worden getekend, en het is de voorste widget die de aanraking ' +
    'krijgt. Ze kunnen volkomen zichtbaar blijven: een widget die geen achtergrond tekent ' +
    'pikt de aanrakingen net zo goed in als een dekkende.',
  'ruleSummary.pageNeverShown': 'XCTrack zegt het in zijn eigen instellingenvenster: een ' +
    'pagina waarvoor geen enkel navigatietype is aangevinkt, wordt in geen enkele ' +
    'vliegcontext getoond.',
  'ruleSummary.thermalPages': 'De inventarisatie van het toestel zegt dat de klasse ' +
    '‘thermiekassistent’ het doel is van het automatisch omschakelen. Ze zegt niet welke ' +
    'wordt bedoeld wanneer een stand er meerdere draagt: deze editor veronderstelt de ' +
    'laatste, en die veronderstelling is nooit nagegaan.',
  'ruleSummary.widgetTooSmall': 'De drempel komt uit ISO 9241-303 en geldt voor het ' +
    'werkelijke fysieke formaat van het gekozen schermmodel, niet voor pixels: een ander ' +
    'model verandert die millimeters.',
  'ruleSummary.proWidget': 'Dit bestand geeft ‘proUpTo: 0’ aan en draagt widgets die voor ' +
    'de Pro-licentie zijn voorbehouden.',
  'ruleSummary.roadMaps': 'XCTrack waarschuwt in zijn eigen instellingen dat er door een ' +
    'beperking van zijn kaartbibliotheek maar één wegenkaart per pagina mogelijk is.',
  'ruleSummary.obsoleteKey': 'Deze widgets dragen instellingen die door een eerdere versie ' +
    'van XCTrack zijn geschreven. Er valt vóór het vliegen niets aan te doen; om te weten ' +
    'wat een bepaalde versie ermee doet, en ze eventueel te verwijderen, zie ‘Versie en ' +
    'compatibiliteit’ in het menu ‘Bestand’.',

  'inspection.unreachable': '‘{name}’ wordt volledig bedekt door widgets die erna zijn geplaatst. Geen enkele klik kan hem dus bereiken, niet hier en niet in het bewerkingsscherm van XCTrack, dat eveneens de voorste widget voorrang geeft. Hij kan volkomen zichtbaar blijven — een widget die niets tekent pikt de aanrakingen net zo goed in als een dekkende. Om hem in te stellen gaat u via de widgetlijst van de pagina.',
  'inspection.unreachableToVerify': 'Wat er met deze widget tijdens de vlucht gebeurt, is ' +
    'niet waargenomen: XCTrack leidt de aanraking misschien anders door dan bij het ' +
    'bewerken. De vraag telt vooral voor actieknoppen, die alleen bestaan om in de vlucht ' +
    'te worden aangeraakt.',

  'inspection.pageNeverShown': {
    one: 'Deze pagina is voor geen enkel navigatietype ingeschakeld: XCTrack zal haar in geen enkele vliegcontext tonen, en haar {count} widget zal nooit dienen. Dat is de instelling ‘Uitgeschakeld’ van het toestel — bewust, of vergeten. Niet te verwarren met een pagina die alleen tot bepaalde navigaties beperkt is, wat een normale instelling is.',
    other: 'Deze pagina is voor geen enkel navigatietype ingeschakeld: XCTrack zal haar in geen enkele vliegcontext tonen, en haar {count} widgets zullen nooit dienen. Dat is de instelling ‘Uitgeschakeld’ van het toestel — bewust, of vergeten. Niet te verwarren met een pagina die alleen tot bepaalde navigaties beperkt is, wat een normale instelling is.'
  },

  'inspection.thermalPages': 'Deze stand draagt meerdere pagina’s met thermiekassistent, en XCTrack richt zich maar op één daarvan wanneer het vanzelf omschakelt in een bocht. Welke? Deze editor veronderstelt de laatste, hier pagina {target} — zonder het te hebben nagegaan. Deze blijft hoe dan ook bereikbaar via ‘volgende pagina’.',
  'inspection.thermalPagesToVerify': 'Er is niets waargenomen van wat XCTrack doet wanneer ' +
    'meerdere pagina’s met thermiekassistent naast elkaar bestaan: geen enkel bestand van ' +
    'de inventarisatie draagt er twee. Er een verdubbelen op het toestel, een bocht ' +
    'indraaien en kijken welke pagina verschijnt, zou de vraag in één vlucht beslechten.',

  'inspection.tooSmall': '‘{name}’ is op dit toestel maar {height} hoog. Als de tekst die hij toont daar de helft van inneemt, meet die ongeveer {value} — onder de {minimum} die ISO 9241-303 als absoluut minimum geeft op {distance} cm. Zal die op armlengte, in de volle zon, met handschoenen nog leesbaar zijn? Na te gaan op het toestel.',
  'inspection.tooSmallToVerify': 'Het deel van de hoogte van de widget dat het teken van de waarde werkelijk inneemt (hier verondersteld op {ratio}) is maar op één widget en één schermafdruk gemeten. De afdrukken van het bord met de 75 widgets zouden volstaan om het type per type te meten, zonder het toestel aan te raken.',

  'inspection.proWidget': '‘{name}’ is een Pro-widget, en dit bestand geeft ‘proUpTo: 0’ aan. Wat zal XCTrack met deze widget doen op een toestel zonder Pro-licentie: hem vervangen door een kader ‘Pro-widget’, hem gewoon tonen, of er niets aan veranderen? Wij weten het niet.',
  'inspection.proWidgetToVerify': 'De betekenis van `info.proUpTo` staat niet vast: 0 ' +
    'betekent misschien ‘geen licentie’, misschien een einddatum in seconden. Alle ' +
    '21 bestanden van de inventarisatie dragen 0, over twee installaties heen — geen ' +
    'andere waarde is ooit waargenomen. Een proef op de AIR³ met een Pro-widget zou het ' +
    'beslechten.',

  'inspection.roadMaps': '‘{name}’ vraagt eveneens om een wegenkaart, en widget {first} van deze pagina vraagt er al om een. XCTrack waarschuwt in zijn eigen instellingen dat er door een beperking van zijn kaartbibliotheek maar één wegenkaart per pagina mogelijk is. Wat er in de plaats verschijnt, is niet te voorspellen.',

  'inspection.obsoleteKey': {
    one: '‘{name}’ draagt een instelling die door een eerdere versie van XCTrack is geschreven ({detail}). Er gaat niets verloren: XCTrack 1.0.3 zet ze bij het lezen om — dat is op het toestel nagegaan — en zal ze onder haar nieuwe naam terugschrijven zodra deze widget de volgende keer wordt ingesteld.',
    other: '‘{name}’ draagt instellingen die door een eerdere versie van XCTrack zijn geschreven ({detail}). Er gaat niets verloren: XCTrack 1.0.3 zet ze bij het lezen om — dat is op het toestel nagegaan — en zal ze onder hun nieuwe namen terugschrijven zodra deze widget de volgende keer wordt ingesteld.'
  },

  /* -------- storingen van de bibliotheek en de technische bijzonderheid — zie `fr/model.ts` */

  'model.noErrorMessage': 'de storing heeft geen bericht nagelaten',

  'libraryError.duringOpen': 'Openen van de bibliotheek',
  'libraryError.duringReadAll': 'Lezen van de bibliotheek',
  'libraryError.duringReadEntry': 'Lezen van een vermelding',
  'libraryError.duringReadBytes': 'Lezen van een configuratie',
  'libraryError.duringWrite': 'Schrijven van een vermelding',
  'libraryError.duringDelete': 'Verwijderen van een vermelding',
  'libraryError.duringClear': 'Legen van de bibliotheek',

  'libraryError.quota': '{operation}: de browser heeft geweigerd te schrijven, de ruimte die aan deze site is toegekend is vol. Voer uw bibliotheek uit en verwijder daarna vermeldingen om ruimte te maken.',
  'libraryError.storageFailed': '{operation}: de browser kon niet antwoorden. {detail}',
  'libraryError.noIndexedDb': 'Deze browser biedt geen IndexedDB: de bibliotheek kan niets ' +
    'bewaren.',
  'libraryError.blockedByTab': 'Een ander tabblad verhindert het bijwerken van de ' +
    'bibliotheek. Sluit het en laad opnieuw.',

  'libraryError.notFound': 'Geen vermelding {id} in de bibliotheek.',
  'libraryError.corrupt': 'Vermelding {id} is onleesbaar: {reason}.',
  'libraryError.duplicateId': 'Een vermelding draagt de identificatie {id} al.',
  'libraryError.changedElsewhere': 'Vermelding {id} is sinds het lezen veranderd — een ander tabblad heeft ze gewijzigd of verwijderd. Laad de bibliotheek opnieuw voordat u het nog eens probeert.',
  'libraryError.notReadable': '‘{name}’ kon niet worden geopend: het is geen leesbare XCTrack-configuratie. {detail}',
  'libraryError.bytesMissing': 'De bytes van ‘{name}’ zijn onvindbaar: de vermelding is onvolledig.',
  'libraryError.digestChanged': '‘{name}’ geeft haar oorspronkelijke vingerafdruk niet meer terug: de opgeslagen bytes zijn gewijzigd. De vermelding wordt niet teruggegeven.',

  'libraryError.recordNotObject': 'de opslag is geen object',
  'libraryError.recordNoId': 'identificatie ontbreekt of is leeg',
  'libraryError.recordBadFields': {
    one: 'onleesbaar veld: {fields}',
    other: 'onleesbare velden: {fields}'
  },

  'libraryError.manifestUnreadable': 'De inhoudsopgave van het archief is onleesbaar.',
  'libraryError.manifestEmpty': 'De inhoudsopgave van het archief is leeg.',
  'libraryError.notALibrary': 'Dit bestand is geen door deze editor uitgevoerde bibliotheek.',
  'libraryError.futureFormat': 'Deze bibliotheek is geschreven door een latere versie van de editor (formaat {version}). Werk de editor bij voordat u ze invoert.',
  'libraryError.manifestNoItems': 'De inhoudsopgave van het archief noemt geen enkele configuratie.',
  'libraryError.notAnArchive': 'Dit bestand is geen bibliotheekarchief, of het is beschadigd. {detail}',
  'libraryError.manifestMissing': 'Het archief bevat geen {file}: het is geen uitgevoerde bibliotheek.',

  'libraryError.itemManifestUnreadable': 'onleesbare inhoudsopgave in het archief',
  'libraryError.itemMemberMissing': 'onderdeel {file} ontbreekt in het archief',
  'libraryError.itemDigestMismatch': 'de bytes van het archief geven niet de aangekondigde vingerafdruk',
  'libraryError.importedSuffix': ' (ingevoerd)'
}

export default model
