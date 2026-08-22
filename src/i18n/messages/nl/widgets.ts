import type { DomainCatalog } from '../../domains'

/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — zie `fr/widgets.ts` voor de twee
 * taalassen: onze eigen tekst wordt hier vertaald, de XCTrack-opschriften die via
 * `{name}`, `{label}` en `{value}` binnenkomen nooit.
 *
 * *widget* en nooit *gadget*: dat is het woord dat de Nederlandse schil van XCTrack zelf
 * gebruikt, op alle 55 opgemeten versies. *Onderdeel* komt er niet in voor — gezocht en
 * niet gevonden.
 *
 * « valeur d'usine » wordt *fabriekswaarde* — nooit *standaard*, dat zou verschuiven van
 * „wat de fabrikant heeft gezet” naar „wat geldt als er niets anders geldt”.
 */
const widgets: DomainCatalog<'widgets'> = {
  /* ==================================================== properties.ts — de kop */

  'properties.widgetTitle': 'Widget: {name}',

  'properties.settingCount': {
    one: '{count} instelling',
    other: '{count} instellingen'
  },

  'properties.filterSettings': 'Instellingen filteren',

  /* ------------------------------------------ vergelijking met de fabrieksopmeting */

  'properties.noSurveyForType':
    'De catalogus van fabriekswaarden beschrijft dit type widget niet: niets te vergelijken.',

  'properties.nothingCustomized':
    'Geen enkele instelling wijkt af van wat XCTrack op een nieuwe widget zet ({compared} vergeleken).',

  'properties.customizedRatio': {
    one: '{count} aangepaste instelling van {compared}.',
    other: '{count} aangepaste instellingen van {compared}.'
  },
  'properties.comparedCount': {
    one: '{count} vergeleken',
    other: '{count} vergeleken'
  },

  'properties.onlyDifferent': 'Alleen wat afwijkt',
  'properties.showEverything': 'Alles tonen',

  /* ------------------------------- waar de opmeting vandaan komt, en wat ze waard is */

  'properties.surveyReference':
    'Fabriekswaarden opgemeten op XCTrack {version} (versionCode {code})',
  'properties.fileVersionNamed': 'versie {name} (versionCode {code})',
  'properties.fileVersionCoded': 'versie {code}',

  'properties.surveyExact': '{survey} — precies de versie van dit bestand.',
  'properties.surveyUnstated':
    '{survey}. Dit bestand zegt niet uit welke versie het komt: fabriekswaarden veranderen van de ene versie op de andere, de vergelijking is dus indicatief.',
  'properties.surveyOther':
    '{survey}. Dit bestand komt uit {which}: fabriekswaarden veranderen van de ene versie op de andere, de vergelijking is dus indicatief.',

  'properties.surveyKeysAbsent': {
    one: '{count} instelling uit de opmeting staat niet in deze widget ({keys}): XCTrack past er zijn eigen waarde op toe, die onderaan het paneel wordt genoemd.',
    other: '{count} instellingen uit de opmeting staan niet in deze widget ({keys}): XCTrack past er zijn eigen waarden op toe, die onderaan het paneel worden genoemd.'
  },

  /* ------------------------- het slotblok: regels die het bestand niet schrijft */

  'properties.absentTitle': {
    one: '{count} instelling die deze widget niet schrijft',
    other: '{count} instellingen die deze widget niet schrijft'
  },

  'properties.absentApplied':
    'Deze instellingen staan niet in het bestand: XCTrack past de waarde uit zijn eigen code ' +
    'toe, die ernaast wordt genoemd. Dat is niet hetzelfde als een instelling die bewust op ' +
    'die waarde is gezet.',
  'properties.absentUnstated':
    '{survey}; de versie van dit bestand is hier niet bekend. Fabriekswaarden veranderen van de ene versie op de andere: wat uw toestel toepast kan dus afwijken van wat hier staat.',
  'properties.absentOther':
    '{survey}, en dit bestand komt uit {which}: een fabriekswaarde kan tussen beide zijn veranderd, en wat uw toestel toepast kan afwijken van wat hier staat.',
  'properties.absentGesture':
    'Ze instellen verandert niets aan wat het toestel vandaag doet — het bevriest de waarde, ' +
    'die niet meer meebeweegt op de dag dat een update van XCTrack die fabriekswaarde wijzigt.',

  'properties.appliedValue':
    'Deze instelling staat niet in het bestand: XCTrack past ‘{value}’ toe, zijn fabriekswaarde. Dat is niet hetzelfde als een waarde die bewust zo is gezet.',

  'properties.compositeFactoryValue': 'samengestelde fabriekswaarde',
  'properties.compositeFactoryValueHelp':
    'De catalogus beschrijft deze instelling met een samengestelde waarde: deze editor ' +
    'schrijft alleen eenvoudige waarden en verzint er geen om ze te vervangen. De instelling ' +
    'blijft wijzigbaar zodra XCTrack ze zelf heeft geschreven.',

  /* ------------------------------------------ het eerste gebaar: de waarde vastleggen */

  'properties.setValue': 'Deze waarde vastleggen',
  'properties.setValueAria': '{label} in het bestand vastleggen',
  'properties.setValueHelp':
    'Schrijft ‘{key}’: {value} in het bestand.\n\nUw toestel gedraagt zich vandaag al zo — de waarde schrijven verandert dus niets aan wat het nu doet. Wat het wel verandert, is voor later: zolang de regel ontbreekt volgt het toestel de fabriekswaarde van de geïnstalleerde versie van XCTrack, en een update die ze wijzigt wijzigt uw instelling zonder iets te vragen. Eenmaal geschreven staat de waarde vast: ze blijft die.',
  'properties.setCaveatOtherVersion':
    'Deze fabriekswaarde is opgemeten op XCTrack {version}, niet de versie waaruit dit bestand komt: ga na of het wel degelijk de vast te leggen waarde is.',
  'properties.setCaveatUnknownVersion':
    'Deze fabriekswaarde is opgemeten op XCTrack {version} en de versie van dit bestand is hier niet bekend: ga na of het wel degelijk de vast te leggen waarde is.',

  /* ------------------------------------------------- een waarde voluit zeggen */

  'properties.yes': 'Ja',
  'properties.no': 'Nee',
  'properties.emptyValue': '(leeg)',
  'properties.outOfCatalogValue': '{value} (buiten de catalogus)',

  /* ------------------------------------------------- de herkomstmarkering van een regel */

  'properties.setByYou': 'door u ingesteld',
  'properties.setByYouFactory': 'door u ingesteld · fabriek: {value}',
  'properties.setByYouHelp':
    'Deze waarde wijkt af van wat XCTrack op een nieuwe widget van dit type schrijft.',
  'properties.setByYouHelpValue':
    'Op een nieuwe widget van dit type schrijft XCTrack ‘{value}’.',

  'properties.factoryValue': 'fabriekswaarde',
  'properties.factoryValueHelp':
    'Waarde ongewijzigd: dit is wat XCTrack op een nieuwe widget van dit type schrijft.',
  'properties.factoryValueUnknown': 'fabriekswaarde onbekend',
  'properties.factoryValueUnknownHelp':
    'De catalogus van fabriekswaarden beschrijft deze instelling niet — een algemene ' +
    'instelling die bij de opmeting met de hand is geschreven, een instelling die sindsdien ' +
    'is bijgekomen, of een waarde die niet te vergelijken valt. Over deze regel wordt niets ' +
    'beweerd.',

  /* --------------------------- het derde gebaar: de fabriekswaarde terugzetten */

  'properties.restoreFactoryValue': 'Fabriekswaarde terugzetten',
  'properties.restoreAria': '{label} op de fabriekswaarde terugzetten',
  'properties.restoreHelp':
    'Schrijft ‘{path}’: {factory} in het bestand, in plaats van {current}.\n\nDit gebaar is niet zoals ‘Deze waarde vastleggen’ onderaan het paneel: dat laat het toestel zich precies zo gedragen als vandaag, dit niet. Het vervangt een instelling die u hebt gekozen door die welke XCTrack op een nieuwe widget van dit type zet.',
  'properties.restoreNote':
    '‘{factory}’ uit de fabriek, ‘{current}’ in dit bestand. Terugzetten verandert wat het toestel tijdens de vlucht doet.',
  'properties.restoreCaveatOtherVersion':
    'Deze fabriekswaarde is opgemeten op XCTrack {version}, niet de versie waaruit dit bestand komt: ga na of het wel degelijk de terug te zetten waarde is.',
  'properties.restoreCaveatUnknownVersion':
    'Deze fabriekswaarde is opgemeten op XCTrack {version} en de versie van dit bestand is hier niet bekend: ga na of het wel degelijk de terug te zetten waarde is.',

  /* -------------------------------------------------------------- een regel van het paneel */

  'properties.outOfCatalogSetting': 'instelling buiten de catalogus',
  'properties.outOfCatalogSettingHelp':
    '‘{path}’ wordt niet door de catalogus beschreven: dit gereedschap raadt het bedieningselement uit het type van de waarde.',
  'properties.helpAria': 'Hulp bij deze instelling',
  'properties.readOnlyValue': 'Waarde hier niet wijzigbaar; ze blijft ongewijzigd bewaard.',

  /* ------------------------------------- de eenheden die de catalogus kaal laat */

  'properties.unitSystem': 'zoals de algemene instellingen',
  'properties.unitMeter': 'meter (m)',
  'properties.unitFoot': 'voet (ft)',
  'properties.unitYard': 'yard (yd)',
  'properties.unitKmPerHour': 'kilometer per uur (km/h)',
  'properties.unitMetersPerSecond': 'meter per seconde (m/s)',
  'properties.unitMilesPerHour': 'mijl per uur (mph)',
  'properties.unitKnot': 'knopen (kt)',
  'properties.unitCelsius': 'graden Celsius (°C)',
  'properties.unitFahrenheit': 'graden Fahrenheit (°F)',
  'properties.coordDegrees': 'decimale graden',
  'properties.coordDegreesMinutes': 'graden en minuten',
  'properties.coordDegreesMinutesSeconds': 'graden, minuten en seconden',
  'properties.coordUtm': 'UTM',

  /* ============================================ widgetPalette.ts — het toevoegpalet */

  'palette.title': 'Widget toevoegen',
  'palette.typeCount': {
    one: '{count} type',
    other: '{count} types'
  },
  'palette.notOffered': 'Aanwezig in het bestand, niet aangeboden door XCTrack',

  'palette.search': 'Widget zoeken',
  'palette.searchAria':
    'Een widget zoeken op zijn naam, of op de naam die hij in het bestand draagt',

  'palette.onlyPresent': 'Al in het bestand ({count})',
  'palette.onlyPresentHelp':
    'Deze types worden gekopieerd van een widget die XCTrack zelf heeft geschreven: al hun ' +
    'instellingen blijven behouden, ook die welke deze editor niet kan tonen.',
  'palette.legend':
    'Volle rand: de widget wordt gekopieerd van een exemplaar dat al in het bestand staat, ' +
    'met al zijn instellingen. Stippelrand: hij wordt aangemaakt met enkel zijn ' +
    'basisinstellingen, XCTrack vult de rest aan bij het lezen. De miniatuur toont in beide ' +
    'gevallen wat de klik zal neerzetten.',
  'palette.noMatch': 'Geen enkele widget draagt die naam.',

  /* ---------------------------------------------- wat de miniatuur kan tonen */

  'palette.previewDrawn':
    'Voorbeeld door de editor getekend op basis van de instellingen van de widget. De ' +
    'getoonde waarden zijn vaste voorbeelden: niets wordt uit een vlucht berekend.',
  'palette.previewGeneric':
    'Deze editor heeft geen eigen tekening voor dit type: de miniatuur toont zijn titel en ' +
    'een streepje in plaats van de waarde. Op het toestel toont hij zijn vluchtgegevens.',
  'palette.previewBlank':
    'Dit type tekent in rust niets op het toestel: de miniatuur is leeg omdat het scherm dat ' +
    'ook is zolang er geen bericht is aangekomen.',

  'palette.nothingAtRest': 'niets in rust',
  'palette.notDrawn': 'voorbeeld niet getekend',

  /* -------------------------------------------------------- de markeringen van een regel */

  'palette.pro': 'Pro',
  'palette.proHelp': 'XCTrack houdt deze widget voor de Pro-licentie.',
  'palette.hereOnce': 'al hier',
  'palette.hereCount': 'al hier × {count}',
  'palette.hereOnceHelp': 'Dit type staat al op de getoonde pagina.',
  'palette.hereCountHelp': {
    one: '{count} exemplaar van dit type staat al op de getoonde pagina.',
    other: '{count} exemplaren van dit type staan al op de getoonde pagina.'
  },
  'palette.elsewhere': 'elders',
  'palette.elsewhereHelp': {
    one: 'Afwezig op deze pagina, maar {count} keer elders in het bestand aanwezig: de kopie vertrekt van die widget, met zijn instellingen.',
    other: 'Afwezig op deze pagina, maar {count} keer elders in het bestand aanwezig: de kopie vertrekt van die widget, met zijn instellingen.'
  },

  /* ------------------------------------- het opschrift dat de schermlezer voorleest */

  'palette.spokenPro': 'Pro-licentie',
  'palette.spokenHereOnce': 'al op deze pagina',
  'palette.spokenHereCount': {
    one: 'al {count} keer op deze pagina',
    other: 'al {count} keer op deze pagina'
  },
  'palette.spokenCopyFromPage':
    'wordt gekopieerd met de instellingen van de widget op deze pagina',
  'palette.spokenCopyFromElsewhere':
    'wordt gekopieerd met de instellingen van een widget op een andere pagina',
  'palette.spokenCreate': 'wordt aangemaakt met enkel zijn basisinstellingen',

  /* ---------------------------------------- de zin voor de geschiedenis van ongedaan maken */

  'palette.addCopyFromPage': '‘{name}’ toevoegen — kopie van een widget op deze pagina',
  'palette.addCopyFromElsewhere':
    '‘{name}’ toevoegen — kopie van een widget op een andere pagina',
  'palette.addNew': '‘{name}’ toevoegen — nieuwe widget, instellingen aan XCTrack gelaten',

  /* ======================================== widgetList.ts — de widgets van de pagina */

  'widgets.listTitle': 'Widgets van de pagina',
  'widgets.listAria': 'Widgets van de pagina, van achter naar voren',
  'widgets.emptyPage': 'Deze pagina draagt geen enkele widget.',
  'widgets.rankBack': 'Rang 1 · achteraan',
  'widgets.rankFront': 'Rang {rank} · vooraan',

  'widgets.unreachableHere': 'hier onbereikbaar',
  'widgets.unreachableHereHelp':
    'In deze editor kan geen enkele klik op de pagina deze widget bereiken: de hogere rangen ' +
    'bedekken hem volledig, en deze lijst is de enige weg ernaartoe. Op het instrument blijft ' +
    'hij op zijn plaats — een zo bedekte actieknop blijft op de vinger reageren.',
  'widgets.nothingAtRestHelp':
    'Op het toestel tekent dit type in rust niets. Hij neemt toch zijn plaats in en vangt ' +
    'klikken op zoals elke andere widget.',

  'widgets.unreachableCount': {
    one: '{count} onbereikbaar in de editor',
    other: '{count} onbereikbaar in de editor'
  },
  'widgets.unreachableCountHelp':
    'Deze widgets zijn volledig bedekt door hogere rangen: hier bereikt geen enkele klik op ' +
    'de pagina ze, en deze lijst is de enige weg ernaartoe. Op het instrument blijven ze op ' +
    'hun plaats — een zo bedekte actieknop blijft op de vinger reageren.',

  'widgets.spokenRank': 'Rang {rank} van {total}',
  'widgets.spokenSize': '{width} op {height} millimeter',
  'widgets.spokenUnreachable': 'in deze editor niet met een klik te bereiken',
  'widgets.spokenNothingAtRest': 'tekent niets op het toestel'
}

export default widgets
