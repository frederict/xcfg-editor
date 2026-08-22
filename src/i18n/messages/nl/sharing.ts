import type { DomainCatalog } from '../../domains'

/**
 * `sharingDialog.ts`, `warnings.ts` — voir `fr/sharing.ts` pour ce qui est tranché.
 *
 * **La gradation des trois issues** : *Uw configuratie, precies zoals ze is* → *Al uw
 * instellingen, zonder wat u herkenbaar maakt* → *Deelbare versie, zonder persoonlijke
 * gegevens*. Aucun titre ne dit *veilig* : le deuxième cran donne plus que le troisième,
 * et une promesse de sûreté y renverserait l'échelle.
 *
 * *widget* et non *gadget* — mesuré sur les 55 relevés, voir `fr/common.ts`. Vouvoiement
 * (*u*) partout, comme `common.ts`.
 */
const sharing: DomainCatalog<'sharing'> = {
  /* ================== sharingDialog.ts — kiezen wat u weggeeft */

  'sharing.dialogTitle': 'Deze configuratie opslaan',
  'sharing.close': 'Sluiten',
  'sharing.cancel': 'Annuleren',
  'sharing.confirm': 'Opslaan',
  'sharing.lead': 'Het gemaakte bestand draagt een naam met tijdstempel die niets van de ' +
    'oorspronkelijke naam overneemt — die bevat vaak een voornaam. De naam ligt dus vast; ' +
    'wat rest is kiezen wat het bestand bevat.',
  'sharing.legend': 'Wat moet er worden opgeslagen?',
  'sharing.curiousHead': 'Voor de nieuwsgierigen',
  'sharing.producedFileName': 'Naam van het gemaakte bestand: {name}',

  'sharing.choiceLabel': '{title}. {note}',

  'sharing.plainTitle': 'Uw configuratie, precies zoals ze is',
  'sharing.backupTitle': 'Al uw instellingen, zonder wat u herkenbaar maakt',
  'sharing.pagesTitle': 'Deelbare versie, zonder persoonlijke gegevens',

  'sharing.plainContentPages': 'Een ‘pages’-export draagt geen voorkeuren, maar wel de ' +
    'teksten die u in de widgets hebt geschreven.',
  'sharing.plainContentBackup': 'Het draagt uw voorkeuren: pilotennaam, scherm, gekoppelde ' +
    'sensoren, waypointbestanden.',

  'sharing.plainTally': 'Het draagt {layout} en {preferences}; ze zouden allemaal onversleuteld vertrekken.',
  'sharing.personalInLayout': {
    one: '{count} persoonlijk gegeven in de opmaak',
    other: '{count} persoonlijke gegevens in de opmaak'
  },
  'sharing.personalInPreferences': {
    one: '{count} in de voorkeuren',
    other: '{count} in de voorkeuren'
  },

  'sharing.backupNoteUnchanged': 'Het bestand blijft een volledige reservekopie — vario en ' +
    'zijn tonen, eenheden, thema, luchtruimdrempels, knoppen. Juist dit bestand draagt ' +
    'niets dat u herkenbaar maakt: er valt er dus niets in te vervangen.',
  'sharing.backupNoteChanged': {
    one: 'Het bestand blijft een volledige reservekopie — vario en zijn tonen, eenheden, thema, luchtruimdrempels, knoppen. {count} regel die u herkenbaar maakt wordt door een neutrale waarde vervangen of verwijderd.',
    other: 'Het bestand blijft een volledige reservekopie — vario en zijn tonen, eenheden, thema, luchtruimdrempels, knoppen. {count} regels die u herkenbaar maken worden door neutrale waarden vervangen of verwijderd.'
  },
  'sharing.pagesNote': 'Een ‘pages’-export waarvan de door u geschreven teksten door ' +
    'neutrale worden vervangen. De opmaak blijft behouden; de voorkeuren vertrekken niet.',

  'sharing.fidelityUnchanged': 'U hebt niets gewijzigd: het bestand komt er precies zo uit ' +
    'als het erin ging, zonder één herschreven komma.',
  'sharing.fidelityUnchangedDetail': 'De bytes die u hebt geopend worden opnieuw ' +
    'uitgegeven zonder te worden herschreven: de SHA-256-vingerafdruk van het gemaakte ' +
    'bestand is die van het oorspronkelijke bestand — u kunt het zelf nagaan.',
  'sharing.fidelityModified': 'Alles wat u niet hebt aangeraakt wordt onveranderd ' +
    'overgenomen — tot en met de getallen en de oorspronkelijke witruimte. Alleen wat u ' +
    'hebt gewijzigd verandert.',
  'sharing.fidelityModifiedDetail': 'Doordat het bestand wordt herschreven, verschilt zijn ' +
    'SHA-256-vingerafdruk van die van het oorspronkelijke bestand; bij een ongewijzigd ' +
    'document is ze gelijk.',

  'sharing.freeTextHeading': 'Uw teksten in de widgets',
  'sharing.freeTextNone': 'Geen eigen tekst in de widgets van dit bestand: hier valt niets ' +
    'te vervangen.',
  'sharing.freeTextCount': {
    one: '{count} door u geschreven tekst wordt vervangen. Hier staat welke, en waar hij zit. Hij leeft in de opmaak van de pagina’s en niet in de voorkeuren: hij vertrekt dus ongeacht het formaat van het bestand.',
    other: '{count} door u geschreven teksten worden vervangen. Hier staat welke, en waar ze zitten. Ze leven in de opmaak van de pagina’s en niet in de voorkeuren: ze vertrekken dus ongeacht het formaat van het bestand.'
  },

  'sharing.location': '{orientation} · pagina {page} · widget {rank} · {name}',
  'sharing.orientationLandscape': 'Liggend',
  'sharing.orientationPortrait': 'Staand',

  'sharing.emptyValue': '(leeg)',

  'sharing.otherPersonalInPreferences': {
    one: 'Dit bestand draagt daarnaast {count} persoonlijk gegeven in zijn voorkeuren — naam, uitrusting, gekoppelde sensoren, huidige taak. Het wordt niet vervangen: de deelbare versie hierboven neemt alleen de pagina’s mee, en laat de hele sectie ‘preferences’ achter.',
    other: 'Dit bestand draagt daarnaast {count} persoonlijke gegevens in zijn voorkeuren — naam, uitrusting, gekoppelde sensoren, huidige taak. Ze worden niet vervangen: de deelbare versie hierboven neemt alleen de pagina’s mee, en laat de hele sectie ‘preferences’ achter.'
  },

  'sharing.preferencesHeading': 'Uw persoonlijke instellingen, regel voor regel',
  'sharing.preferencesNone': 'Dit bestand draagt geen van de 44 instellingen die XCTrack ' +
    'onder de persoonlijke gegevens rangschikt: hier valt niets te behandelen.',

  'sharing.preferencesFound': {
    one: '{count} persoonlijke instelling is in dit bestand gevonden: {tally}. Elke regel zegt wat ermee gebeurt en waarom.',
    other: '{count} persoonlijke instellingen zijn in dit bestand gevonden: {tally}. Elke regel zegt wat ermee gebeurt en waarom.'
  },
  'sharing.preferencesReplaced': { one: '{count} vervangen', other: '{count} vervangen' },
  'sharing.preferencesDropped': { one: '{count} verwijderd', other: '{count} verwijderd' },
  'sharing.preferencesKept': { one: '{count} behouden', other: '{count} behouden' },
  'sharing.preferencesEmpty': { one: '{count} leeg', other: '{count} leeg' },

  'sharing.treatmentReplace': 'Vervangen door een neutrale waarde',
  'sharing.treatmentDrop': 'Uit het bestand verwijderd',
  'sharing.treatmentKeep': 'Onveranderd behouden, en hier staat waarom',
  'sharing.treatmentEmpty': 'Aanwezig in het bestand, maar leeg',

  'sharing.droppedLine': 'de hele regel wordt verwijderd',

  'sharing.backupResidualNote': 'Deze uitweg behandelt de 44 bekende persoonlijke ' +
    'instellingen van XCTrack en de elf tekstvelden van de widgets. Het formaat verandert ' +
    'bij elke versie: een sindsdien verschenen persoonlijke instelling zou niet op de ' +
    'lijst staan en zou onversleuteld vertrekken. De deelbare versie, verderop, hangt van ' +
    'geen enkele lijst af — ze draagt helemaal geen instelling over.',

  'sharing.suspectsHeading': 'Wat eruitziet als een tekst die u zou hebben geschreven',
  'sharing.suspectsCount': {
    one: '{count} tekst staat op geen van onze lijsten en ziet er toch zo uit.',
    other: '{count} teksten staan op geen van onze lijsten en zien er toch zo uit.'
  },
  'sharing.suspectsNote': 'Deze teksten staan op geen van onze lijsten, en toch lijken ze ' +
    'op iets dat u zou hebben geschreven. Ze vertrekken zoals ze zijn: wij vervangen niet ' +
    'waarvan wij niet zeker zijn, omdat wij dan instellingen zouden beschadigen. Alleen u ' +
    'weet of u ze hebt geschreven.',
  'sharing.suspectsNoneNote': 'Geen onverwachte tekst in wat vertrekt: alles wat hierboven ' +
    'niet is behandeld heeft de vorm van een instelling — een woord gekozen uit een lijst, ' +
    'een getal — en niet die van een geschreven tekst.',
  'sharing.suspectsMore': {
    one: '{count} andere tekst van dezelfde soort wordt hier niet getoond, bij gebrek aan ruimte. Lees het gemaakte bestand door voordat u het verstuurt.',
    other: '{count} andere teksten van dezelfde soort worden hier niet getoond, bij gebrek aan ruimte. Lees het gemaakte bestand door voordat u het verstuurt.'
  },

  'sharing.backupCostHeading': 'Wat de ontvanger niet krijgt',
  'sharing.backupCostIntro': 'Al uw instellingen gaan mee — vario en zijn tonen, eenheden, ' +
    'thema, luchtruimdrempels, knoppen. Wat hij niet krijgt, zijn uw eigen hulpbronnen:',
  'sharing.backupCostOutro': 'Geen van deze regels is een instelling: het zijn bestanden ' +
    'en toestellen die bij u thuis leven, en waarmee hij niets had kunnen aanvangen.',

  'sharing.backupCostSensors': 'uw gekoppelde sensoren: hij koppelt de zijne, de enige die ' +
    'hij kan gebruiken;',
  'sharing.backupCostTask': 'uw huidige taak, haar keerpunten en hun coördinaten;',
  'sharing.backupCostFiles': 'uw waypoint- en luchtruimbestanden, en het kaartthema dat u ' +
    'hebt geïnstalleerd — bestanden van uw toestel;',
  'sharing.backupCostOfflineMaps': 'uw offlinekaarten, om dezelfde reden;',
  'sharing.backupCostQuickMessages': 'uw snelberichten voor Livetracking, die uw eigen ' +
    'zinnen zijn.',

  'sharing.anonymousCostIntro': 'Wat de ontvanger dus niet krijgt, en zelf zal moeten ' +
    'instellen:',
  'sharing.anonymousCostOutro': 'Hij krijgt de opmaak van uw pagina’s, niet uw voorkeuren. ' +
    'Dat is meestal wat men wil — zijn eenheden zijn niet noodzakelijk de uwe — maar men ' +
    'moet het weten vóór het versturen.',

  'sharing.anonymousCostUnits': 'de eenheden — hoogtes, afstanden, snelheden: hij houdt de ' +
    'zijne;',
  'sharing.anonymousCostTheme': 'het weergavethema, en de grootte en kleur van de ' +
    'widgettitels;',
  'sharing.anonymousCostVario': 'de instellingen van de vario en zijn tonen;',
  'sharing.anonymousCostAirspace': 'de luchtruimdrempels en -kanalen;',
  'sharing.anonymousCostLivetracking': 'het Livetracking en zijn aanmeldgegevens;',
  'sharing.anonymousCostSensors': 'de gekoppelde bluetoothsensoren.',

  'sharing.droppedHeading': 'Wat niet vertrekt',
  'sharing.droppedNothing': 'Dit bestand is al een ‘pages’-export: het draagt geen enkele ' +
    'voorkeur, er valt er dus niets uit te halen.',
  'sharing.droppedIntro': {
    one: 'Het gedeelde bestand is een ‘pages’-export: het draagt alleen uw pagina’s. Deze ' +
      'hele sectie blijft bij u.',
    other: 'Het gedeelde bestand is een ‘pages’-export: het draagt alleen uw pagina’s. ' +
      'Deze hele secties blijven bij u.'
  },

  'sharing.droppedPreferences': 'Al uw voorkeuren: pilotennaam, scherm, eenheden, thema, ' +
    'instellingen van de vario en zijn tonen, luchtruimdrempels, Livetracking, gekoppelde ' +
    'bluetoothsensoren, waypointbestanden.',
  'sharing.droppedAirspaceChannels': 'De luchtruimkanalen die u hebt geselecteerd.',
  'sharing.droppedUnknownSection': 'De sectie ‘{key}’, die een ‘pages’-export niet meedraagt.',

  'sharing.annexesHeading': 'De bijlagen van het archief',
  'sharing.annexesNote': 'Een .xczfg-archief draagt bijgevoegde bestanden mee die deze ' +
    'editor niet onderzoekt — noch hun inhoud, noch de metagegevens van een afbeelding, ' +
    'waarin een foto vaak de coördinaten van de opnameplaats draagt. De deelbare versie ' +
    'wordt daarom als kaal .xcfg geschreven, zonder die bijlagen. Er gaat niets bruikbaars ' +
    'verloren: de externe hulpbronnen van een configuratie worden vanuit de voorkeuren ' +
    'aangewezen, en die vertrekken evenmin.',

  'sharing.residualNote': 'De lijst van de elf behandelde tekstvelden ligt vast, en het ' +
    'XCTrack-formaat verandert bij elke versie: een sindsdien verschenen tekstveld zou ' +
    'onversleuteld vertrekken. Lees de inventaris hierboven door voordat u het bestand ' +
    'verstuurt — dat is de controle, niet de belofte van dit gereedschap.',

  'sharing.personalHeading': 'Alles wat dit bestand aan persoonlijks draagt: {total} — {layout} in de opmaak, {preferences} in de voorkeuren',
  'sharing.personalFilled': {
    one: '{count} is ingevuld',
    other: '{count} zijn ingevuld'
  },
  'sharing.personalEmpty': {
    one: '{count} is een aanwezige maar lege plaats',
    other: '{count} zijn aanwezige maar lege plaatsen'
  },
  'sharing.personalTravelsNote': 'Alleen die in de opmaak vertrekken met een ‘pages’-export.',

  /* ================== warnings.ts — wat u van dit bestand moet weten */

  'warnings.exportPagesTitle': '‘pages’-export: alleen de schermen',
  'warnings.exportPagesDetail': 'Dit bestand draagt alleen de widgetpagina’s. Opnieuw in ' +
    'XCTrack ingelezen vervangt het de schermen en raakt het niets anders aan: ' +
    'vario-instellingen, eenheden, luchtruimbestanden en sensorconfiguratie blijven die ' +
    'van het toestel.',
  'warnings.exportBackupTitle': '‘backup’-export: de hele configuratie',
  'warnings.exportBackupDetail': 'Dit bestand draagt de hele configuratie. Opnieuw in ' +
    'XCTrack ingelezen overschrijft het niet alleen de schermen, maar ook de ' +
    'vario-instellingen, de eenheden, de luchtruimbestanden en de sensorconfiguratie van ' +
    'het toestel.',
  'warnings.exportUnknownTitle': 'Soort export onbepaald',
  'warnings.exportUnknownDetail': 'Dit bestand zegt niet of het alleen pagina’s dan wel de ' +
    'hele configuratie bevat (`info.exportType` afwezig of onbekend). Wat het bij het ' +
    'opnieuw inlezen zal overschrijven, kan hier dus niet worden aangekondigd.',
  'warnings.exportUnknownItem': 'info.exportType: ‘{type}’',

  'warnings.assumedValuesTitle': 'Thema, eenheden en typografie verondersteld',
  'warnings.assumedValuesDetail': 'Dit bestand draagt geen enkele voorkeur: het thema, de ' +
    'eenheden en de titelgrootte waarmee deze pagina’s worden getekend zijn elders ' +
    'opgemeten fabriekswaarden, niet die van uw toestel. De meetkunde komt wel degelijk ' +
    'uit het bestand.',
  'warnings.assumedTheme': 'Thema: {theme}',
  'warnings.assumedUnits': 'Hoogte: {altitude} · Snelheid: {speed} · Vario: {vario}',
  'warnings.assumedTitles': 'Titels: {percent} %, {font}',
  'warnings.assumedLanguageTitle': 'Taal van de opschriften onbepaald',
  'warnings.assumedLanguageDetail': 'Dit bestand geeft geen weergavetaal aan (`Display.Language` leeg of sectie `preferences` afwezig): op het toestel volgt XCTrack dan de taal van het Android-systeem — nooit het Engels als terugval. Bij gebrek aan beter worden de opschriften hier getoond in de taal van uw browser ({language}).',

  'warnings.personalLayoutTitle': 'Uw pagina’s dragen teksten van u',
  'warnings.personalTitle': 'Dit bestand noemt u bij naam',
  'warnings.personalPreferenceCount': {
    one: '{count} ingevulde persoonlijke instelling',
    other: '{count} ingevulde persoonlijke instellingen'
  },
  'warnings.personalLayoutCount': {
    one: '{count} in een widget geschreven tekst',
    other: '{count} in de widgets geschreven teksten'
  },
  'warnings.personalDetailLead': 'Dit bestand draagt {preferences} en {layout} die u aanwijzen: uw naam, uw uitrusting, uw uitzendkeuzes, uw huidige taak met haar coördinaten, en zelfs de wedstrijd waaraan u deelneemt — de namen van de waypointbestanden wijzen haar aan.',
  'warnings.personalTravels': {
    one: '{count} in een widget geschreven tekst vertrekt zelfs met een ‘pages’-export: dat formaat is een grove schifting, geen schoonmaak.',
    other: '{count} in de widgets geschreven teksten vertrekken zelfs met een ‘pages’-export: dat formaat is een grove schifting, geen schoonmaak.'
  },
  'warnings.personalEmptySlots': {
    one: '{count} persoonlijke plaats is aanwezig maar leeg — ze wordt hier niet vermeld.',
    other: '{count} persoonlijke plaatsen zijn aanwezig maar leeg — ze worden hier niet vermeld.'
  },
  'warnings.personalDetailTail': 'Dit gereedschap ontdoet niets in stilte: het bestand ' +
    'komt eruit zoals het erin ging. Aan u om te oordelen.',
  'warnings.personalItem': '{key} — {kind}: {value}',

  'warnings.externalTitle': 'Externe bestanden aangewezen',
  'warnings.externalDetail': 'Deze namen wijzen bestanden aan die op het oorspronkelijke ' +
    'toestel aanwezig zijn, niet in deze configuratie. Een configuratie die u van een ' +
    'andere piloot krijgt wijst bestanden aan die alleen hij heeft: XCTrack zal ze op uw ' +
    'SD-kaart zoeken en ze niet vinden. Dit gereedschap somt ze op, het verbetert ze niet.',
  'warnings.externalMapTheme': 'Kaartthema: {file} (Mapsforge.ThemeFile)',
  'warnings.externalWaypoints': 'Waypoints: {file} (Navigation.WaypointFiles)',
  'warnings.externalAirspace': 'Luchtruim: {file} (Airspace.Files)',

  'warnings.versionUnknownTitle': 'XCTrack-versie onbekend',
  'warnings.versionUnknownDetail': 'Dit bestand zegt niet uit welke versie van XCTrack het komt (`info.versionCode` afwezig). Het verschil met de referentieversie van dit gereedschap ({reference}) kan dus niet worden gemeten; wat wordt weergegeven kan sindsdien van betekenis zijn veranderd.',
  'warnings.versionOlderTitle': 'Bestand ouder dan het gereedschap',
  'warnings.versionNewerTitle': 'Bestand nieuwer dan het gereedschap',
  'warnings.versionGapDetail': 'Dit bestand komt uit versie {name} (versionCode {code}), terwijl deze editor zich op versie {reference} instelt om het te tekenen. Het formaat verandert bij elke versie: instellingen kunnen anders worden getekend dan ze op het toestel zullen zijn. Het bestand wordt daarom niet gewijzigd — het komt eruit zoals het erin ging, zonder één herschreven komma.',
  'warnings.versionNameUnknown': 'onbekend',

  'warnings.structureTitle': 'Onverwachte structuur',
  'warnings.structureDetail': 'Deze editor heeft een deel van dit bestand niet herkend. De ' +
    'weergave is beperkt waar de gegevens ontbreken, maar er gaat niets verloren: het ' +
    'document blijft ongeschonden en komt er onveranderd uit.',
  'warnings.where': '{orientation}, pagina {page}',
  'warnings.structureNoClass': '{where}: deze pagina zegt haar soort niet',
  'warnings.structureNavigations': '{where}: dit gereedschap kan niet zeggen wanneer deze pagina verschijnt — de waarde ‘navigations’ is noch ‘all’, noch ‘none’, noch een lijst',
  'warnings.structureMissingKeys': '{where}, widget {rank}: sleutel {keys} ontbreekt',
  'warnings.structureDuplicate': 'Dubbele regel: {path}',

  'warnings.geometryTitle': 'Meetkundige gebreken',
  'warnings.geometryDetail': 'Deze widgets kunnen zich niet tonen zoals hun maker het ' +
    'hoopte: kader zonder breedte of hoogte, coördinaten buiten de grenzen, of widget ' +
    'volledig verborgen onder een andere, waarvan het de waarde nooit zal tonen. Gewone ' +
    'overlappingen worden niet gemeld: die zijn normaal op een kaart of een ' +
    'thermiekassistent.',
  'warnings.who': '{where}, widget {rank} ({name})',
  'warnings.cover': 'widget {rank} ({name})',
  'warnings.box': 'X1 {x1}, Y1 {y1}, X2 {x2}, Y2 {y2}',
  'warnings.geometryZeroWidth': '{who}: breedte nul, het heeft geen enkel oppervlak — {box}',
  'warnings.geometryZeroHeight': '{who}: hoogte nul, het heeft geen enkel oppervlak — {box}',
  'warnings.geometryOutside': '{who}: steekt buiten de pagina, {edge} ligt op {value} — {box}',
  'warnings.edgeLeft': 'zijn linkerrand',
  'warnings.edgeTop': 'zijn bovenrand',
  'warnings.edgeRight': 'zijn rechterrand',
  'warnings.edgeBottom': 'zijn onderrand',
  'warnings.geometryCovered': '{who}: verborgen onder {cover}, en zal dus niets tonen',
  'warnings.geometryCoveredButton': '{who}: verborgen onder {cover}, maar nog altijd gevoelig voor de vinger',

  'warnings.coveredButtonsTitle': 'Actieknoppen verborgen, en dat is wellicht gewild',
  'warnings.coveredButtonsDetail': 'Een andere widget ligt over deze knoppen en bedekt ze ' +
    'volledig: op het instrument zult u ze niet zien. Toch reageren ze nog altijd op de ' +
    'vinger — daar drukken zet hun actie in gang, ook al ziet u er de kaart of de ' +
    'thermiekassistent. Dat is een gebruikelijke opzet en geen gebrek: het geeft een ' +
    'bediening waar het scherm al bezet is. Niets te verbeteren, tenzij de overlapping u ' +
    'verrast.',

  'warnings.themeTitle': 'Getekend thema wijkt af van het aangegeven thema',
  'warnings.themeDetail': 'Deze pagina’s worden hier getekend met het thema {theme}, het enige dat op het instrument is waargenomen. Het bestand vraagt om een ander: de kleuren en contrasten die u ziet zijn dus niet die van uw toestel. De meetkunde klopt wel — en het bestand wordt daarom niet gewijzigd.',
  'warnings.themeFileKnown': 'Thema van het bestand: {theme}',
  'warnings.themeFileUnknown': 'Thema van het bestand: {theme} (thema onbekend voor dit gereedschap)',
  'warnings.themePerWidget': {
    one: '{count} widget in {theme}',
    other: '{count} widgets in {theme}'
  },

  'warnings.hypothesisTitle': '{title} — te bevestigen op het instrument',
  'warnings.hypothesisLead': 'Dit is geen gemeten vaststelling maar een vraag, en hier ' +
    'staat wat ze zou beslechten.',
  'warnings.preflightItem': '{where}: {message}'
}

export default sharing
