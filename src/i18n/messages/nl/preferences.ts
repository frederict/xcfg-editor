import type { DomainCatalog } from '../../domains'

/**
 * `preferencesPage.ts` en néerlandais.
 *
 * **fabriekswaarde** partout où le français dit « valeur d'usine » — le néerlandais n'a
 * pas la collision de *défaut*, et *standaardwaarde* dirait « ce qui s'applique par
 * défaut », précisément ce que `preferences.absentKeyOnImport` réfute.
 *
 * **instelling** pour un réglage, **regel** pour une ligne du fichier, **widget** (mesuré :
 * la chrome néerlandaise ne dit jamais *onderdeel*), **toestel** pour l'appareil. Les
 * guillemets sont ‘ … ’.
 */
const preferences: DomainCatalog<'preferences'> = {
  'preferences.absentKeyOnImport':
    'Bij het importeren (‘Alles vervangen’) houdt uw toestel de instelling die het al ' +
    'heeft: wat het bestand niet vermeldt, wordt niet aangeraakt. Gemeten op de AIR³. Op ' +
    'een toestel dat er nooit aan gekomen is, geldt de fabriekswaarde van XCTrack.',

  'preferences.settingCount': {
    one: '{count} instelling',
    other: '{count} instellingen'
  },
  /** Voir `fr/preferences.ts` : message de démonstration du socle, pas de l'écran. */
  'preferences.absentFromFile': {
    one: '{count} regel ontbreekt in het bestand',
    other: '{count} regels ontbreken in het bestand'
  },

  'preferences.lineCount': {
    one: '{count} regel',
    other: '{count} regels'
  },
  'preferences.characterCount': {
    one: '{count} teken',
    other: '{count} tekens'
  },

  'preferences.structuredValue': 'gestructureerde waarde, {size}',
  'preferences.emptyList': 'lege lijst',
  'preferences.listValue': {
    one: 'lijst van {count} element, {size}',
    other: 'lijst van {count} elementen, {size}'
  },
  'preferences.yes': 'Ja',
  'preferences.no': 'Nee',
  'preferences.noKeyAssigned': 'geen toets',
  'preferences.emptyValue': '(leeg)',
  'preferences.offCatalogue': '{value} (buiten de catalogus)',
  'preferences.truncatedValue': '{start}… ({size})',
  'preferences.someStructure': 'een structuur',

  'preferences.longPress': 'lang indrukken',
  'preferences.shortPress': 'kort indrukken',
  'preferences.rawCode': 'toetscode {code}',
  'preferences.codeAndName': 'toetscode {code}, {name}',

  'preferences.physicalKeyCount': {
    one: '{count} fysieke toets',
    other: '{count} fysieke toetsen'
  },
  'preferences.hardwareUnsurveyedUnknownDevice':
    'Wij hebben de fysieke toetsen alleen op {models} gemeten, en dit bestand zegt niet ' +
    'van welk toestel het komt: dit kastje is een blinde vlek. De code van elke koppeling ' +
    'wordt hierboven gelezen en benoemd, maar wij weten niet welke toets hem uitzendt.',
  'preferences.hardwareUnsurveyedOtherDevice':
    'Wij hebben de fysieke toetsen alleen op {models} gemeten, en dit bestand komt van een ' +
    'ander toestel ({device}): dit kastje is een blinde vlek. De code van elke koppeling ' +
    'wordt hierboven gelezen en benoemd, maar wij weten niet welke toets hem uitzendt.',
  'preferences.hardwareSurveyed':
    'Op {model} — het model dat dit bestand aangeeft — hebben wij maar {keys} gemeten: ' +
    '{listed}. {missing} De meting is op één enkel kastje gedaan, en recentere modellen ' +
    'dragen er meer.',
  'preferences.hardwareStrangerOne': 'Code {codes} is geen van deze.',
  'preferences.hardwareStrangerMany': 'De codes {codes} zijn geen van deze.',
  'preferences.unmatchedKeyTitle':
    'Geen van de op {model} gemeten toetsen zendt code {code} uit. De opmerking onder dit ' +
    'blok zegt wat die meting waard is.',

  'preferences.runtimeDefaultReason':
    'XCTrack vult deze lijst in code en de fabriekswaarde ervan hangt af van de taal en ' +
    'het land van het toestel: er valt niets te vergelijken.',
  'preferences.unknownSettingReason':
    'Deze editor kent deze instelling niet: hij weet noch de rol noch de fabriekswaarde ervan.',
  'preferences.noFactoryValueInCatalogue':
    'De catalogus vermeldt geen fabriekswaarde voor deze instelling.',
  'preferences.structuredVsScalar':
    'De waarde in het bestand is een structuur; die in de catalogus van fabriekswaarden ' +
    'is een eenvoudige waarde.',

  'preferences.refusalUnknown':
    'Deze editor weet niet wat deze regel van het bestand instelt: hij biedt niet aan hem ' +
    'te wijzigen. Hij blijft ongewijzigd bewaard.',
  'preferences.refusalState':
    'Deze regel legt de toestand van de toepassing vast, geen instelling: hij komt er ' +
    'ongeschonden weer uit, nooit herschreven.',
  'preferences.refusalUnlabelled':
    'XCTrack benoemt deze instelling nergens waar wij het kunnen lezen: zonder het opschrift ' +
    'biedt deze editor niet aan hem te wijzigen.',
  'preferences.refusalStructured':
    'Samengestelde waarde: deze pagina toont hem zoals hij is, zonder hem te openen, en ' +
    'herschrijft hem nooit.',
  'preferences.refusalAction':
    'Op het toestel gebeurt dit via een dialoogvenster — een toets die op het instrument ' +
    'ingedrukt moet worden, een tabel die gebouwd moet worden — dat deze pagina niet kan ' +
    'vervangen. De waarde wordt nog steeds gelezen, en het document komt ongeschonden ' +
    'weer naar buiten.',
  'preferences.refusalNoValue':
    'Dit wordt niet ingevoerd: de regel geeft een opdracht, hij draagt geen waarde.',
  'preferences.refusalNote': {
    one: '{count} instelling in dit blok kan hier niet ingesteld worden. {reason}',
    other: '{count} instellingen in dit blok kunnen hier niet ingesteld worden. {reason}'
  },

  'preferences.stateCustom': 'door u ingesteld',
  'preferences.stateDefault': 'fabriekswaarde',
  'preferences.stateConflict': 'fabriekswaarde onzeker',
  'preferences.stateAbsent': 'ontbreekt in het bestand',
  'preferences.stateUnwritten': 'nooit ingesteld',
  'preferences.stateUndecidable': 'niets te vergelijken',

  'preferences.stateTitleCustomUnknown':
    'Deze waarde wijkt af van de fabriekswaarde van XCTrack.',
  'preferences.stateTitleCustom': 'De fabriekswaarde van XCTrack is ‘{factory}’.',
  'preferences.stateTitleDefault':
    'Waarde ongewijzigd: dit is de fabriekswaarde van XCTrack.',
  'preferences.stateTitleConflict':
    'XCTrack geeft twee verschillende fabriekswaarden op voor deze instelling: ‘{code}’ in ' +
    'zijn code en ‘{screen}’ in zijn instellingenscherm. Deze editor kiest niet in zijn ' +
    'plaats. Uw waarde is die van het bestand.',
  'preferences.stateTitleAbsent':
    'Deze instelling staat niet in het bestand: het zegt er niets over. {absent}',
  'preferences.stateTitleAbsentWithValue':
    'Deze instelling staat niet in het bestand: het zegt er niets over. {absent} Zij is ' +
    '‘{factory}’.',
  'preferences.stateTitleUnwritten':
    'Deze instelling staat niet in het bestand, en XCTrack schrijft haar er pas in zodra ' +
    'zij minstens één keer op het toestel is ingesteld: haar afwezigheid zegt niets — noch ' +
    'wat uw toestel toepast, noch wat het splinternieuw zou toepassen.',
  'preferences.stateTitleNoFactoryValue':
    'Geen fabriekswaarde bekend voor deze instelling.',

  'preferences.editInsertDescription': '{label} in het bestand schrijven',
  'preferences.editSetDescription': '{label} instellen',
  'preferences.removeFromFile': '{label} uit het bestand verwijderen',
  'preferences.restoreToFactoryValue': '{label} op de fabriekswaarde terugzetten',

  'preferences.factoryValueUnknown': 'fabriekswaarde onbekend',
  'preferences.factoryValueUnknownTitle':
    'De catalogus vermeldt geen schrijfbare fabriekswaarde voor deze instelling: deze ' +
    'editor heeft niets om haar mee aan te maken, en hij verzint er geen.',
  'preferences.implicitTitle':
    '‘{factory}’ is de fabriekswaarde van XCTrack, geen ingestelde waarde: deze instelling ' +
    'staat niet in het bestand. {absent}',
  'preferences.adoptLabel': 'Deze waarde schrijven',
  'preferences.adoptTitle':
    'Schrijft ‘{key}’: {factory} in het bestand.\n\n' +
    'Op een toestel dat dit nooit heeft ingesteld, is het al wat het toepast: het ' +
    'schrijven verandert dan niets onmiddellijks, en zet de instelling buiten bereik van ' +
    'een XCTrack-update die de fabriekswaarde ervan zou wijzigen.\n\n' +
    'Op een toestel dat het al heeft ingesteld, zal het importeren deze waarde in plaats ' +
    'van de zijne schrijven: zolang het bestand er niets over zegt, houdt het de zijne ' +
    '(gemeten op de AIR³, import ‘Alles vervangen’).',

  'preferences.dropLabel': 'Verwijderen',
  'preferences.dropTitle':
    'Verwijdert ‘{key}’ uit het bestand: het zal niets meer over deze instelling zeggen.\n\n' +
    '{absent}\n\n' +
    'Wat dit verandert voor een toestel dat er nooit aan gekomen is: de waarde ligt niet ' +
    'langer vast en zal de updates van XCTrack volgen. Het is precies het omgekeerde van ' +
    '‘Deze waarde schrijven’.',

  'preferences.restoreLabel': 'De fabriekswaarde terugzetten',
  'preferences.restoreTitle':
    'Schrijft ‘{key}’: {factory} in het bestand, in plaats van {current}.\n\n' +
    'Dit gebaar is niet als de twee andere op deze pagina: die raken alleen een instelling ' +
    'die u nooit hebt gekozen, dit vervangt de uwe door die welke XCTrack op een verse ' +
    'installatie zet.{caveat}',
  'preferences.restoreNote':
    '‘{factory}’ af fabriek, ‘{current}’ in dit bestand. Terugzetten verandert wat het ' +
    'toestel tijdens de vlucht doet.{caveat}',
  'preferences.restoreCaveatIndicative':
    ' Deze fabriekswaarde komt uit de catalogus van XCTrack {version}, en dat is niet de ' +
    'versie waar dit bestand vandaan komt: ga na of het wel degelijk de juiste is.',
  'preferences.restoreCaveatUnstated':
    ' Deze fabriekswaarde komt uit de catalogus van XCTrack {version} en de versie van dit ' +
    'bestand is hier niet bekend: ga na of het wel degelijk de juiste is.',

  'preferences.unitListNote':
    'Deze lijst is gemeten op {device}, XCTrack {version}: {method}. Ter info: {caveats}.',
  'preferences.freeListTitle':
    'XCTrack vult deze lijst in code: onze inventarisatie van de versies geeft de waarden ' +
    'ervan niet en zij zijn niet op het toestel gemeten. Deze editor biedt dus geen keuze ' +
    'aan, en de waarde wordt geschreven zoals u haar intikt.',

  'preferences.summaryCount':
    'U hebt {custom} van de {settings} die XCTrack aanbiedt ingesteld.',

  'preferences.detailDefault': {
    one: '{count} op de fabriekswaarde',
    other: '{count} op de fabriekswaarde'
  },
  'preferences.detailAbsent': {
    one: '{count} ontbreekt in het bestand',
    other: '{count} ontbreken in het bestand'
  },
  'preferences.detailUnwritten': {
    one: '{count} nooit ingesteld',
    other: '{count} nooit ingesteld'
  },
  'preferences.detailUndecidable': {
    one: '{count} zonder bekende fabriekswaarde',
    other: '{count} zonder bekende fabriekswaarde'
  },
  'preferences.detailConflict': {
    one: '{count} met onzekere fabriekswaarde',
    other: '{count} met onzekere fabriekswaarde'
  },
  'preferences.restUnlabelled': {
    one: '{count} zonder opschrift in de toepassing',
    other: '{count} zonder opschrift in de toepassing'
  },
  'preferences.restState': {
    one: '{count} onthouden door de toepassing',
    other: '{count} onthouden door de toepassing'
  },
  'preferences.restUnknown': {
    one: '{count} onbekend voor deze catalogus',
    other: '{count} onbekend voor deze catalogus'
  },

  'preferences.fileCarries': 'Dit bestand bevat in totaal {lines}.',
  'preferences.fileCarriesWithRest': {
    one: 'Dit bestand bevat in totaal {lines}: {count} komt met geen enkele instelling van ' +
      'een scherm van het toestel overeen — {rest}. Hij staat achteraan de pagina.',
    other: 'Dit bestand bevat in totaal {lines}: {count} komen met geen enkele instelling ' +
      'van een scherm van het toestel overeen — {rest}. Zij staan achteraan de pagina.'
  },

  'preferences.catalogReference':
    'Opschriften en fabriekswaarden gehaald uit XCTrack {version} (versionCode {code})',
  'preferences.catalogNoteExact': '{reference} — precies de versie van dit bestand.{fallback}',
  'preferences.catalogNoteUnstated':
    '{reference}. Dit bestand zegt niet van welke versie het komt: opschriften en ' +
    'fabriekswaarden veranderen van versie tot versie, de lezing is dus indicatief.{fallback}',
  'preferences.catalogNoteIndicative':
    '{reference}. Dit bestand komt van {file}: opschriften en fabriekswaarden veranderen ' +
    'van versie tot versie, de lezing is dus indicatief.{fallback}',
  'preferences.catalogFallback': {
    one: ' {count} tekst ontbreekt in deze taal en wordt in het Engels getoond.',
    other: ' {count} teksten ontbreken in deze taal en worden in het Engels getoond.'
  },
  'preferences.fileVersionNumber': 'versie {code}',
  'preferences.fileVersionNamed': 'versie {name} (versionCode {code})',

  'preferences.personalMarkTitle': 'Persoonsgegeven — {reason} ({basis}).',
  'preferences.privacyNone':
    'Geen persoonsgegevens aangetroffen in de voorkeuren van dit bestand',
  'preferences.privacyHead': {
    one: '{count} instelling draagt een persoonsgegeven · {filled} ingevuld, {empty} leeg',
    other: '{count} instellingen dragen een persoonsgegeven · {filled} ingevuld, {empty} leeg'
  },
  'preferences.privacyLayoutNone':
    'Deze pagina telt alleen de voorkeuren. De indeling van dit bestand draagt geen enkele ' +
    'door u geschreven tekst — het is het venster ‘Opslaan’ dat ze inventariseert, en het ' +
    'zijn de enige die met een ‘pages’-export zouden meegaan.',
  'preferences.privacyLayoutSome': {
    one: 'Deze pagina telt alleen de voorkeuren. De indeling draagt er {count} meer — door ' +
      'u geschreven teksten in de widgets — en het zijn de enige die met een ' +
      '‘pages’-export meegaan. Het venster ‘Opslaan’ toont ze één voor één.',
    other: 'Deze pagina telt alleen de voorkeuren. De indeling draagt er {count} meer — ' +
      'door u geschreven teksten in de widgets — en het zijn de enige die met een ' +
      '‘pages’-export meegaan. Het venster ‘Opslaan’ toont ze één voor één.'
  },
  'preferences.privacyItemWhy': '{kind} — {reason}',
  'preferences.privacyNavigationState':
    '‘Navigation.State’ is een openbare voorkeur van XCTrack: zij reist met het bestand ' +
    'mee. Zij draagt de lopende opdracht — keerpunten en coördinaten — hier {value}. Deze ' +
    'pagina toont de inhoud ervan nooit; een doorgegeven bestand neemt hem wel mee.',
  'preferences.privacyGuessPosition':
    'XCTrack bewaart ook een vermoedelijke positie van het toestel (‘App.GuessLatitude’, ' +
    '‘App.GuessLongitude’) — in de praktijk het thuisadres. Zij zijn intern aan het ' +
    'toestel: geen enkele export draagt ze, en dit bestand draagt ze niet.',
  'preferences.privacySecureKeys': {
    one: 'XCTrack versleutelt de accountgegevens (XContest, SkySight, SafeSky…): de ' +
      '{count} betrokken instelling verlaat het toestel nooit, en geen enkele export draagt ' +
      'haar.',
    other: 'XCTrack versleutelt de accountgegevens (XContest, SkySight, SafeSky…): de ' +
      '{count} betrokken instellingen verlaten het toestel nooit, en geen enkele export ' +
      'draagt ze.'
  },
  'preferences.privacyJudged': {
    one: 'De {count} regel van dit bestand wordt niet door XCTrack zelf gemeld: de enige ' +
      'instellingen waarvan het de gevoeligheid aangeeft, zijn die welke het versleutelt, ' +
      'en die worden niet geëxporteerd. Deze inventaris is dus een oordeel van deze editor, ' +
      'en elke regel geeft het zijne.',
    other: 'Geen van de {count} regels van dit bestand wordt door XCTrack zelf gemeld: de ' +
      'enige instellingen waarvan het de gevoeligheid aangeeft, zijn die welke het ' +
      'versleutelt, en die worden niet geëxporteerd. Deze inventaris is dus een oordeel van ' +
      'deze editor, en elke regel geeft het zijne.'
  },
  'preferences.filledPersonal': {
    one: 'U hebt zojuist {count} persoonsgegeven ingevuld — {keys}. Het zal met dit bestand ' +
      'meereizen: in het venster ‘Opslaan’ kiest u wat er vertrekt.',
    other: 'U hebt zojuist {count} persoonsgegevens ingevuld — {keys}. Zij zullen met dit ' +
      'bestand meereizen: in het venster ‘Opslaan’ kiest u wat er vertrekt.'
  },

  'preferences.leftoverTitleUnlabelled': 'Instellingen zonder opschrift',
  'preferences.leftoverTitleState': 'Wat de toepassing heeft onthouden (geen instellingen)',
  'preferences.leftoverTitleUnknown': 'Regels die deze catalogus niet kent',
  'preferences.leftoverLeadUnlabelled':
    'Dit zijn wel degelijk instellingen, maar XCTrack configureert ze in schermen die in ' +
    'code gebouwd zijn, waar de regel van het bestand niet meer aan zijn opschrift hangt: ' +
    'de toepassing benoemt ze nergens waar wij het kunnen lezen. De waarde en de ' +
    'vergelijking met de fabriekswaarde blijven juist — het is de naam die ontbreekt, niet ' +
    'de betekenis.',
  'preferences.leftoverLeadState':
    'Deze regels stellen niets in: zij leggen de toestand van de toepassing vast. Deze ' +
    'pagina geeft de aard en de omvang ervan, nooit de inhoud.',
  'preferences.leftoverLeadUnknown':
    'Deze editor weet niet wat deze regels instellen: zij zijn geschreven door een andere ' +
    'versie van XCTrack dan die waarover de catalogus spreekt. Zij zijn noch verwijderbaar ' +
    'noch verwaarloosbaar — eenvoudigweg onbekend, en ongewijzigd bewaard.',
  'preferences.noFamily': '(zonder familie)',

  'preferences.emptyTitle': 'Dit bestand draagt geen enkele algemene voorkeur.',
  'preferences.emptyText':
    'Alleen ‘backup’-exports nemen de instellingen van de toepassing mee. Een ' +
    '‘pages’-export beschrijft alleen de pagina’s en hun widgets: een volledige back-up van ' +
    'het toestel openen is de enige manier om die instellingen te zien.',
  'preferences.emptyIntact':
    'Daarom is er niets verloren: wat deze pagina niet toont, bevat dit bestand niet, en ' +
    'een nieuwe export laat het precies zoals het is.',
  'preferences.emptyPersonalWarning': {
    one: 'Let op: ‘geen voorkeuren’ betekent niet ‘niets persoonlijks’. De indeling van dit ' +
      'bestand draagt {count} door u geschreven tekst in zijn widgets — een titel, een ' +
      'naam, een telefoonnummer —, en een ‘pages’-export neemt ze mee. Het venster ' +
      '‘Opslaan’ toont ze één voor één.',
    other: 'Let op: ‘geen voorkeuren’ betekent niet ‘niets persoonlijks’. De indeling van ' +
      'dit bestand draagt {count} door u geschreven teksten in zijn widgets — een titel, ' +
      'een naam, een telefoonnummer —, en een ‘pages’-export neemt ze mee. Het venster ' +
      '‘Opslaan’ toont ze één voor één.'
  },

  'preferences.pageTitle': 'Algemene instellingen',
  'preferences.pageSubtitle': 'Wat XCTrack buiten de widgetpagina’s instelt',
  'preferences.pageSubtitleNamed': '{file} — wat XCTrack buiten de widgetpagina’s instelt',
  'preferences.menuLead':
    'De schermen zijn die van het toestel, in de volgorde van zijn instellingenmenu.',
  'preferences.menuLeadEditable':
    'De schermen zijn die van het toestel, in de volgorde van zijn instellingenmenu. Een ' +
    'gewijzigde instelling wordt meteen in het document geschreven; ‘Ongedaan maken’ draait ' +
    'het terug, en er gaat niets naar de schijf vóór ‘Opslaan’.',
  'preferences.entryNothing': 'Niets van dit scherm komt in dit bestand voor.',
  'preferences.neverExported': {
    one: '{count} instelling van dit scherm verlaat het toestel nooit: XCTrack exporteert ' +
      'haar niet.',
    other: '{count} instellingen van dit scherm verlaten het toestel nooit: XCTrack ' +
      'exporteert ze niet.'
  },

  'preferences.tallyNone':
    'Dit bestand draagt er {lines} van: geen enkele heeft een opschrift, alle staan ' +
    'achteraan de pagina onder hun ruwe naam.',
  'preferences.tallySome':
    'Dit bestand draagt er {lines} van, waarvan {named}; {listed} achteraan de pagina ' +
    'onder hun ruwe naam.',
  'preferences.tallyNamed': {
    one: 'één enkele heeft een opschrift en wordt op een ander scherm getoond',
    other: '{count} hebben een opschrift en worden op een ander scherm getoond'
  },
  'preferences.tallyListed': {
    one: '{count} staat',
    other: '{count} staan'
  },

  'preferences.menuNoteAirspaces':
    'XCTrack bouwt dit scherm in code: de instelling ligt er ver van haar opschrift, en de ' +
    'toepassing benoemt haar dus nergens waar wij het kunnen lezen. De instellingen die zij ' +
    'schrijft, staan wel degelijk in het bestand — zij zijn verderop verzameld, onder ' +
    '‘Instellingen zonder opschrift’ en ‘Wat de toepassing heeft onthouden’.',
  'preferences.menuNoteMaps':
    'Ook een in code gebouwd scherm, eveneens zonder bruikbaar opschrift. De ' +
    '‘Mapsforge’-regels van het bestand zijn verderop verzameld.',
  'preferences.menuNoteEditPageSet':
    'Deze regel opent de editor voor pagina’s en widgets — het is de rest van deze editor ' +
    'die ze toont, niet deze pagina.',
  'preferences.menuNoteEventMapping':
    'De automatische acties worden in blok vastgelegd in ‘EventMappingJs’: een klein ' +
    'programma in één keer geschreven, en geen lijst van instellingen.',
  'preferences.menuNotePro':
    'Het abonnement wordt op het XContest-account beheerd, niet in het configuratiebestand.',
  'preferences.menuNoteSensors':
    'Dit scherm dient om de sensoren te koppelen. Wat het vastlegt, past op één enkele ' +
    'regel, ‘Sensors.Configuration’, verderop verzameld met de rest van wat de toepassing ' +
    'heeft onthouden.',
  'preferences.menuNoteShareConfig':
    'Dit scherm draagt slechts twee opdrachten — een configuratie exporteren, importeren. ' +
    'Het heeft geen instelling te onthouden.',
  'preferences.menuNoteAbout':
    'Dit scherm toont alleen informatie over de toepassing: versie, wijzigingslogboek, ' +
    'vermeldingen. Niets wat ingesteld wordt.',
  'preferences.menuNoteInfoOnly': 'Informatieregel zonder instelling.',

  'preferences.filterPlaceholder': 'Instellingen filteren',
  'preferences.onlyMine': 'Alleen wat ik heb ingesteld',
  'preferences.showAll': 'Alles tonen',
  'preferences.maskPersonal': 'Persoonlijke waarden verbergen',
  'preferences.showPersonal': 'Persoonlijke waarden tonen',
  'preferences.close': 'Sluiten'
}

export default preferences
