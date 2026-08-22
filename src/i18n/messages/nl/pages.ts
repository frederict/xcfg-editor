import type { DomainCatalog } from '../../domains'

/**
 * De vijf `pages.describe*` worden twee keer gelezen: in de paginacarrousel en, buiten
 * context, als opschrift van de knop ‘Ongedaan maken’. Ze staan daarom in de infinitief,
 * als een benoemd gebaar: ‘Ongedaan maken: Pagina 3 dupliceren naar positie 4 (liggend)’.
 */
const pages: DomainCatalog<'pages'> = {
  /* ==================================================== `deviceSelector.ts` */

  'device.screenSize': '{width} × {height}',

  'device.templateLabel': 'Schermsjabloon',

  'device.commonRatiosGroup': 'Gangbare beeldverhoudingen',
  'device.customGroup': 'Mijn apparaten',

  'device.addDevice': 'Een apparaat toevoegen…',

  'device.widthPx': 'Breedte (px)',
  'device.heightPx': 'Hoogte (px)',
  'device.diagonalInches': 'Diagonaal (inch)',

  'device.note': '{diagonal} · {width} × {height} px — de geometrie hangt alleen van de beeldverhouding af, de waargenomen grootte alleen van de diagonaal. Deze keuze wordt nooit in het bestand geschreven.',

  'device.namePlaceholder': 'Naam van het apparaat',
  'device.widthPlaceholder': 'Breedte px',
  'device.widthLabel': 'Breedte in pixels',
  'device.heightPlaceholder': 'Hoogte px',
  'device.heightLabel': 'Hoogte in pixels',
  'device.diagonalPlaceholder': 'Diagonaal ″',
  'device.diagonalLabel': 'Diagonaal in inch',
  'device.add': 'Toevoegen',
  'device.cancel': 'Annuleren',

  'device.nameRequired': 'Geef dit apparaat een naam.',
  'device.sizeMustBePositive': 'De breedte en de hoogte moeten positieve aantallen pixels zijn.',
  'device.diagonalMustBePositive': 'De diagonaal moet een positief aantal inch zijn.',

  /* ==================================================== oriëntaties */

  'pages.landscape': 'Liggend',
  'pages.portrait': 'Staand',
  'pages.landscapeInline': 'liggend',
  'pages.portraitInline': 'staand',

  /* ==================================================== stappen in de geschiedenis */

  'pages.describeInsert': 'Pagina ‘{type}’ invoegen op positie {rank} ({orientation})',
  'pages.describeDuplicate': 'Pagina {rank} dupliceren naar positie {target} ({orientation})',
  'pages.describeRemove': 'Pagina {rank} verwijderen ({orientation})',
  'pages.describeReorder': 'Pagina {rank} verplaatsen naar positie {target} ({orientation})',
  'pages.describeSetClass': 'Type van pagina {rank} wijzigen: ‘{before}’ → ‘{after}’ ({orientation})',
  'pages.describeEnableNavigations': 'Pagina {rank} voor alle navigaties inschakelen ({orientation})',

  'pages.enableAllNavigations': 'Voor alle navigaties inschakelen',
  'pages.enableAllNavigationsFor': 'Pagina {rank} voor alle navigaties inschakelen',

  'pages.announcementWithAdvice': '{done}. {advice}',

  'pages.undoRestores': '‘Ongedaan maken’ in de bovenste balk draait deze stap terug zolang dit tabblad open blijft.',

  'pages.removalTally': {
    one: '{count} widget verdwijnt ermee.',
    other: '{count} widgets verdwijnen ermee.'
  },

  'pages.rankRange': '{first} tot {last}',

  /* ==================================================== gevolgen van een gebaar */

  'pages.rankIsIdentity': 'De positie is de enige identiteit van een pagina: het is de ' +
    'positie die u in de vlucht doorbladert.',

  'pages.rankShift': {
    one: 'Pagina {from} wordt pagina {to}. {identity}',
    other: 'Pagina’s {from} worden pagina’s {to}. {identity}'
  },

  'pages.rankShiftReorder': 'Pagina’s {range} wisselen van positie. {identity}',

  'pages.thermalAlreadyPresent': {
    one: 'Dit bestand beschrijft al een pagina met thermiekassistent (pagina {ranks}). XCTrack richt zich maar op één ervan wanneer het vanzelf naar spiraal omschakelt; deze editor veronderstelt de LAATSTE, zonder dit op het toestel te hebben gecontroleerd. Als zij het inderdaad is, ontneemt een nieuwe pagina erna aan pagina {last} die omschakeling, zonder iets aan de inhoud te veranderen.',
    other: 'Dit bestand beschrijft al pagina’s met thermiekassistent (pagina’s {ranks}). XCTrack richt zich maar op één ervan wanneer het vanzelf naar spiraal omschakelt; deze editor veronderstelt de LAATSTE, zonder dit op het toestel te hebben gecontroleerd. Als zij het inderdaad is, ontneemt een nieuwe pagina erna aan pagina {last} die omschakeling, zonder iets aan de inhoud te veranderen.'
  },

  'pages.lastPageOfOrientation': 'Dit is de laatste pagina van deze oriëntatie: het ' +
    'bestand zou er geen enkele meer beschrijven.',

  'pages.noNavigablePageLeft': 'Er zouden alleen pagina’s overblijven die voor geen enkele ' +
    'navigatie zijn ingeschakeld: welke navigatie ook wordt gekozen, het toestel zou in ' +
    'deze oriëntatie geen pagina meer hebben om te tonen.',

  'pages.onlyThermalPage': 'Dit is de enige pagina met thermiekassistent: het automatisch ' +
    'omschakelen naar spiraal zou geen doel meer hebben.',

  'pages.autoSwitchWouldTarget': 'Het automatisch omschakelen naar spiraal zou dan op pagina {rank} richten, als het inderdaad op de laatste richt — deze editor veronderstelt het zonder het te hebben gecontroleerd.',

  'pages.classChangeUnverified': 'XCTrack staat niet toe het type van een pagina na het ' +
    'aanmaken te wijzigen: het ligt vast op het moment van de keuze. Het is nochtans niet ' +
    'meer dan één regel van het bestand, en deze editor schrijft die graag — maar hoe het ' +
    'toestel zich gedraagt bij een zo gewijzigde pagina is NIET gecontroleerd, en de ' +
    'widgets van de pagina worden niet vervangen door die van het nieuwe type.',

  'pages.thermalMultiple': {
    one: '{total} pagina’s met thermiekassistent (pagina’s {ranks}). XCTrack richt zich maar op één ervan wanneer het vanzelf naar spiraal omschakelt; deze editor veronderstelt de laatste, pagina {target}, zonder dit op het toestel te hebben gecontroleerd. Pagina {others} blijft hoe dan ook bereikbaar via ‘volgende pagina’.',
    other: '{total} pagina’s met thermiekassistent (pagina’s {ranks}). XCTrack richt zich maar op één ervan wanneer het vanzelf naar spiraal omschakelt; deze editor veronderstelt de laatste, pagina {target}, zonder dit op het toestel te hebben gecontroleerd. Pagina’s {others} blijven hoe dan ook bereikbaar via ‘volgende pagina’.'
  },

  'pages.allPagesWithoutNavigation': 'Alle pagina’s van deze oriëntatie zijn voor geen ' +
    'enkele navigatie ingeschakeld: welke navigatie ook wordt gekozen, het toestel heeft ' +
    'hier geen pagina om te tonen.',

  /* ==================================================== de carrousel */

  'pages.regionLabel': 'Pagina’s ({orientation})',
  'pages.noPage': 'geen enkele pagina',
  'pages.pageCount': { one: '{count} pagina', other: '{count} pagina’s' },

  'pages.emptyOrientation': 'Deze oriëntatie beschrijft geen enkele pagina. Een nieuwe ' +
    'pagina komt leeg: haar widgets worden daarna vanuit het palet geplaatst, of door een ' +
    'bestaande pagina te dupliceren.',

  'pages.insertAtRank': 'Een pagina invoegen op positie {rank}',
  'pages.insertAtEnd': 'Een pagina invoegen op de laatste positie ({rank})',
  'pages.newPageAtRank': 'Nieuwe pagina op positie {rank}',

  'pages.openPage': 'Pagina {rank} openen, {kind}, {tally}',

  'pages.autoSwitchTargetHere': 'Veronderstelde bestemming van het automatisch omschakelen ' +
    'naar spiraal — niet gecontroleerd op het toestel.',
  'pages.autoSwitchTargetElsewhere': 'Deze editor veronderstelt dat het automatisch omschakelen op pagina {rank} richt, de laatste pagina met thermiekassistent — niet gecontroleerd op het toestel.',

  'pages.moveBack': 'Pagina {rank} één positie terug',
  'pages.moveForward': 'Pagina {rank} één positie vooruit',
  'pages.duplicate': 'Dupliceren',
  'pages.duplicatePage': 'Pagina {rank} dupliceren',
  'pages.remove': 'Verwijderen',
  'pages.removePage': 'Pagina {rank} verwijderen',

  'pages.pageTypeLabel': 'Paginatype',

  'pages.typeFromFile': '{type} (type vermeld in het bestand)',

  /* ==================================================== `navigations` */

  'pages.shownForAllNavigations': 'Getoond voor alle navigaties',
  'pages.shownForNoNavigation': 'Voor geen enkele navigatie getoond',
  'pages.shownForNavigations': 'Getoond voor: {list}'

  /*
   * De vijf navigaties zijn hier op 22-08-2026 vertrokken — het zijn XCTracks eigen
   * woorden, niet de onze, en ze volgen de as `labels`. Zie
   * `src/catalog/navigationLabels.json`.
   */
}

export default pages
