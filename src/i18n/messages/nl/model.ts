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
    'waarde die je uit een lijst kiest.'
}

export default model
