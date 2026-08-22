import type { DomainCatalog } from '../../domains'

/**
 * Les versions relevées et le nettoyage — voir `fr/versions.ts`.
 *
 * Les trois statuts : *verouderd*, *blinde vlek*, *onbekend*. « angle mort » se dit
 * **blinde vlek** en néerlandais, et l'expression s'emploie couramment au figuré — ce
 * qu'on ne voit pas et qu'on sait ne pas voir. C'est bien ce que le badge dit ici.
 */
const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} uitgebrachte versie',
    other: '{count} uitgebrachte versies'
  },

  /* ------------------------------------------------- les statuts : le mot du bandeau */

  'versions.badgeOutdated': 'verouderd',
  'versions.badgeReadBefore': 'alleen eerder gelezen',
  'versions.badgeAppearedLater': 'later verschenen',
  'versions.badgeBlindSpot': 'blinde vlek',
  'versions.badgeUnknown': 'onbekend',
  'versions.badgeUnknownWidget': 'onbekende widget',
  'versions.badgeRecognized': 'herkend',

  /* ----------------------------------------- les huit cas : titre, constat, et verdict */

  'versions.titleLegacy': 'Verouderde instellingen: de gekozen versie leest ze niet meer',
  'versions.evidenceLegacy': 'Wij lezen deze instellingen in oudere versies, niet meer in deze — en echte bestanden die door die versie zijn geschreven, dragen ze toch. XCTrack bewaart de instellingen die het niet meer kent zonder ze te lezen: hier hebben wij het zien gebeuren, wij veronderstellen het niet.',
  'versions.verdictLegacy': 'Ze verwijderen is hier te verdedigen. Dit is het enige geval dat een echt bestand komt bevestigen.',

  'versions.titlePastOnly': 'Alleen door oudere versies gelezen',
  'versions.evidencePastOnly': 'Wij lezen deze instellingen in oudere versies, niet meer in de gekozen versie. Maar geen enkel echt bestand komt dat bevestigen: wij hebben hier alleen onze lezing van de versies, zonder het voorbeeld dat ze toetst.',
  'versions.verdictPastOnly': 'Ze verwijderen is te verdedigen, op onze lezing alleen. Niets zegt dat XCTrack ze heeft geschrapt: wij lezen ze er alleen niet meer.',

  'versions.titleFutureOnly': 'Verschenen na de gekozen versie',
  'versions.evidenceFutureOnly': 'Wij lezen deze instellingen alleen in versies die nieuwer zijn dan de gekozen versie. Dit bestand komt dus uit een nieuwere versie dan de hier gekozen versie.',
  'versions.verdictFutureOnly': 'Niet verwijderen. De gekozen versie negeert ze; een nieuwere versie vindt ze ongeschonden terug.',

  'versions.titleStraddled': 'Ervoor en erna gelezen, maar niet door de gekozen versie',
  'versions.evidenceStraddled': 'Wij lezen deze instellingen in de versies ervoor en in die erna, en wij missen ze net hier. Een instelling die zou verdwijnen om ongewijzigd terug te komen, zou een rariteit zijn; het eenvoudigst is dat onze lezing hier een gat heeft.',
  'versions.verdictStraddled': 'Niet verwijderen. Het gat ligt bij ons, niet in uw bestand.',

  'versions.titleNeverRead': 'Onbekend: geen enkele versie die wij hebben gelezen, leest ze',
  'versions.evidenceNeverRead': 'Geen van de XCTrack-versies die wij hebben kunnen lezen, draagt deze instelling op deze widget, en geen enkel echt bestand toont ze daar evenmin. Wij weten niet waar ze vandaan komt.',
  'versions.verdictNeverRead': 'Wij weten het niet. Dat is geen bewijs dat de instelling verouderd is — alleen dat wij ze niet kennen.',

  'versions.titleGap': 'Onze lezing heeft een gat: de instelling bestond wel degelijk',
  'versions.evidenceGap': 'Wij hebben deze instellingen niet in die versie gezien, maar wij lezen ze in nieuwere versies, en een echt bestand dat door die versie is geschreven, draagt ze. De instelling bestond: wij zijn het die ze hebben gemist.',
  'versions.verdictGap': 'Nooit verwijderen. Dit zijn geldige instellingen, en ze voor verouderde instellingen aanzien zou de uwe wissen.',

  'versions.titleBlind': 'Instellingen die wij nergens zien',
  'versions.evidenceBlind': 'Echte bestanden dragen ze, en geen enkele versie die wij hebben kunnen lezen, geeft ze aan. Wij zien ze nergens, en ons zwijgen zegt niets over hen.',
  'versions.verdictBlind': 'Niets te besluiten. Niet verwijderen op die grond.',

  'versions.titleUnknownWidget': 'Widgets die de gekozen versie niet kent',
  'versions.evidenceUnknownWidget': 'Dit soort widget komt niet voor in wat wij van deze versie hebben gelezen. Wij weten dus niets over zijn instellingen: een widget die wij nooit hebben gezien, is geen widget die is geschrapt.',
  'versions.verdictUnknownWidget': 'Niets te besluiten over zijn instellingen.',

  /* ------------------------------------------------------ où le gadget se trouve */

  'versions.placePortrait': 'Staand · pagina {page} · positie {rank} · {name}',
  'versions.placeLandscape': 'Liggend · pagina {page} · positie {rank} · {name}',

  /* -------------------------------------------------------------- le choix de version */

  'versions.panelLabel': 'Gekozen versie en compatibiliteit',
  'versions.targetLabel': 'De XCTrack-versie waarop u mikt',
  'versions.noVersionOption': '— geen versie gekozen —',
  'versions.groupWriter': 'De versie die dit bestand heeft geschreven',
  'versions.groupCandidates': 'De versies waarnaar dit bestand kan verwijzen',
  'versions.groupNearestOne': 'De versie die het dichtst bij die van dit bestand ligt',
  'versions.groupNearestSeveral': 'De versies die het dichtst bij die van dit bestand liggen',
  'versions.groupPublished': 'Uitgebrachte versies, van de nieuwste naar de oudste',
  'versions.groupDevelopment': 'Ontwikkelversies, nooit uitgebracht',

  'versions.unknownVersion': 'onbekende versie',
  'versions.buildLabel': '{release} (build {build})',

  /* ------------------------------------------------- d'où vient la version proposée */

  'versions.declaredByCode': 'versie {code}',
  'versions.declaredByName': 'XCTrack {release} (nummer {code})',

  'versions.messageUndeclared': 'Dit bestand zegt niet uit welke XCTrack-versie het komt: het draagt zijn versienummer niet. Niets laat toe er een voor te stellen — kies de versie van het toestel waarop u dit bestand opnieuw zult inlezen.',

  'versions.messageExact': 'Dit bestand is geschreven door {declared}. Op die versie wordt hieronder gemikt, en u mag een andere kiezen.',

  'versions.messageExactPinned': {
    one: 'Dit bestand is geschreven door {declared}. {count} versie draagt dat nummer; de naam die het bestand aangeeft, wijst er maar één aan. Op die versie wordt hieronder gemikt, en u mag een andere kiezen.',
    other: 'Dit bestand is geschreven door {declared}. {count} versies dragen dat nummer; de naam die het bestand aangeeft, wijst er maar één aan. Op die versie wordt hieronder gemikt, en u mag een andere kiezen.'
  },

  'versions.messageAmbiguous': {
    one: 'Dit bestand is geschreven door {declared}. {count} versie draagt dat nummer zonder dezelfde instellingen te aanvaarden, en het bestand zegt niet welke het heeft geschreven. Wij mikken op de nieuwste, {version} — een willekeurige keuze, en wij staan ervoor in: elke opmerking die onder een van de andere zou veranderen, wordt hieronder gemeld.',
    other: 'Dit bestand is geschreven door {declared}. {count} versies dragen dat nummer zonder dezelfde instellingen te aanvaarden, en het bestand zegt niet welke het heeft geschreven. Wij mikken op de nieuwste, {version} — een willekeurige keuze, en wij staan ervoor in: elke opmerking die onder een van de andere zou veranderen, wordt hieronder gemeld.'
  },

  'versions.messageApproximated': 'Dit bestand is geschreven door {declared}, dat geen enkele opgenomen versie draagt. Wij vallen terug op het dichtstbijzijnde nummer, {code} — het is niet dezelfde versie, het is de dichtstbijzijnde die wij hebben kunnen lezen. Wij mikken op {version}.',

  'versions.messageApproximatedSeveral': {
    one: 'Dit bestand is geschreven door {declared}, dat geen enkele opgenomen versie draagt. Wij vallen terug op het dichtstbijzijnde nummer, {code} — het is niet dezelfde versie, het is de dichtstbijzijnde die wij hebben kunnen lezen. Dat nummer dekt zelf {count} versie; wij mikken op de nieuwste, {version}, en melden hieronder elke opmerking die onder een andere zou veranderen.',
    other: 'Dit bestand is geschreven door {declared}, dat geen enkele opgenomen versie draagt. Wij vallen terug op het dichtstbijzijnde nummer, {code} — het is niet dezelfde versie, het is de dichtstbijzijnde die wij hebben kunnen lezen. Dat nummer dekt zelf {count} versies; wij mikken op de nieuwste, {version}, en melden hieronder elke opmerking die onder een andere zou veranderen.'
  },

  'versions.messageUnrecognized': {
    one: 'Dit bestand is geschreven door {declared}, dat wij niet kennen: wij hebben {count} XCTrack-versie kunnen lezen, en deze hoort er niet bij. Wij stellen er geen voor — er een op goed geluk aanwijzen zou verzinnen zijn. Kies die van uw toestel.',
    other: 'Dit bestand is geschreven door {declared}, dat wij niet kennen: wij hebben {count} XCTrack-versies kunnen lezen, en deze hoort er niet bij. Wij stellen er geen voor — er een op goed geluk aanwijzen zou verzinnen zijn. Kies die van uw toestel.'
  },

  'versions.messageUnrecognizedSituated': {
    one: 'Dit bestand is geschreven door {declared}, dat wij niet kennen: wij hebben {count} XCTrack-versie kunnen lezen, en deze hoort er niet bij. {situate} Wij stellen er geen voor — er een op goed geluk aanwijzen zou verzinnen zijn. Kies die van uw toestel.',
    other: 'Dit bestand is geschreven door {declared}, dat wij niet kennen: wij hebben {count} XCTrack-versies kunnen lezen, en deze hoort er niet bij. {situate} Wij stellen er geen voor — er een op goed geluk aanwijzen zou verzinnen zijn. Kies die van uw toestel.'
  },

  'versions.rangeAbove': 'De nummers die wij kennen, lopen van {min} tot {max}; dit nummer ligt boven allemaal.',
  'versions.rangeBelow': 'De nummers die wij kennen, lopen van {min} tot {max}; dit nummer ligt onder allemaal.',
  'versions.rangeBetween': 'De nummers die wij kennen, lopen van {min} tot {max}; dit nummer valt tussen twee ervan.',

  'versions.aimingElsewhere': 'U mikt op een andere versie dan die: de diagnose hieronder legt dit bestand naast {version}.',

  /* --------------------------------- ce que le choix du pilote ne change pas */

  'versions.sameNone': 'Geen enkele andere opgenomen versie aanvaardt precies dezelfde instellingen als {version}: wat hieronder staat, geldt alleen voor haar.',

  'versions.sameOtherOne': '{list} aanvaardt precies dezelfde instellingen als {version}: wij houden ze niet uit elkaar, en wat hieronder staat, geldt voor {total} versies.',
  'versions.sameOtherSeveral': '{list} aanvaarden precies dezelfde instellingen als {version}: wij houden ze niet uit elkaar, en wat hieronder staat, geldt voor {total} versies.',

  /* ------------------------------------------------- l'écart depuis la version d'avant */

  'versions.noPreviousRelease': {
    one: 'Geen enkele uitgebrachte versie gaat aan deze vooraf onder de versies die wij hebben kunnen lezen: niets om te vergelijken. {count} bekende widget.',
    other: 'Geen enkele uitgebrachte versie gaat aan deze vooraf onder de versies die wij hebben kunnen lezen: niets om te vergelijken. {count} bekende widgets.'
  },
  'versions.widgetsAdded': {
    one: '{count} widget toegevoegd',
    other: '{count} widgets toegevoegd'
  },
  'versions.widgetsRemoved': {
    one: '{count} widget verwijderd',
    other: '{count} widgets verwijderd'
  },
  'versions.settingsAdded': {
    one: '{count} instelling toegevoegd',
    other: '{count} instellingen toegevoegd'
  },
  'versions.settingsRemoved': {
    one: '{count} instelling verwijderd',
    other: '{count} instellingen verwijderd'
  },
  'versions.deltaNone': 'Niets onderscheidt deze versie van {version}: wij lezen er dezelfde instellingen in.',
  'versions.deltaSince': 'Sinds {version}: {changes}.',
  'versions.noVersionChosen': 'Geen versie gekozen: er wordt niets vergeleken en niets gediagnosticeerd.',

  'versions.deltaDetails': 'De details van deze wijzigingen',
  'versions.deltaCaveat': 'Wat volgt is wat de beoogde versie meer, of minder, leest dan de vorige. De widgets dragen daarbij de naam die XCTrack hun geeft; de instellingen niet — de toepassing toont ze nergens, en dit zijn de namen die zij in het bestand schrijft.',
  'versions.detailWidgetsAdded': 'Toegevoegde widgets',
  'versions.detailWidgetsRemoved': 'Verwijderde widgets',
  'versions.detailSettingsAdded': 'Instellingen toegevoegd op bestaande widgets',
  'versions.detailSettingsRemoved': 'Verwijderde instellingen',
  'versions.detailLine': '{name}: {keys}',

  /* ------------------------------------------------------------------ le diagnostic */

  'versions.chooseVersion': 'Kies een versie om de diagnose van dit bestand te krijgen.',

  'versions.tally': {
    one: '{count} instelling herkend van de {examined} onderzochte, verdeeld over {instances}.',
    other: '{count} instellingen herkend van de {examined} onderzochte, verdeeld over {instances}.'
  },

  'versions.scope': {
    one: 'Deze diagnose steunt op onze opname van {count} XCTrack-versie en op echte bestanden die erdoor zijn geschreven: dat is wat ‘wij’ hieronder aanduidt. Alleen de widgets op de pagina’s worden onderzocht — de rest van een reservekopie (vario, eenheden, sensoren, luchtruimen) wordt niet gediagnosticeerd. De plaats van een widget en zijn soort zijn geen instellingen en worden niet meegeteld.',
    other: 'Deze diagnose steunt op onze opname van {count} XCTrack-versies en op echte bestanden die erdoor zijn geschreven: dat is wat ‘wij’ hieronder aanduidt. Alleen de widgets op de pagina’s worden onderzocht — de rest van een reservekopie (vario, eenheden, sensoren, luchtruimen) wordt niet gediagnosticeerd. De plaats van een widget en zijn soort zijn geen instellingen en worden niet meegeteld.'
  },

  'versions.unstableNotice': {
    one: '{count} opmerking verandert naargelang de versie die wordt aangehouden onder die waarnaar dit bestand kan verwijzen. Ze worden een voor een gemeld.',
    other: '{count} opmerkingen veranderen naargelang de versie die wordt aangehouden onder die waarnaar dit bestand kan verwijzen. Ze worden een voor een gemeld.'
  },

  'versions.noFindings': 'Geen enkel verschil: alle instellingen van dit bestand worden door de gekozen versie gelezen, en al zijn widgets bestaan daar. Niets te melden — wat niet wil zeggen dat het bestand in orde is, alleen dat wij er niets op aan te merken vinden.',

  'versions.widgetKnownElsewhere': 'soort die wij kennen, maar niet in deze versie',
  'versions.widgetNeverSeen': 'soort die wij in geen enkele versie hebben gezien',

  'versions.unstableFinding': 'Onvaste opmerking — onder {divergences}.',
  'versions.divergencePart': '{version}: {word}',
  'versions.divergenceJoin': '; ',

  'versions.readonlyNote': 'U bekijkt dit bestand zonder het te wijzigen: er kan hier niets uit worden weggehaald. Om te handelen op wat u leest, sluit u dit venster en schakelt u over naar bewerken.',

  /* ================================================================= le nettoyage */

  'cleanup.title': 'Weghalen wat een oudere versie heeft achtergelaten',

  'cleanup.lead': {
    one: '{count} instelling van dit bestand wordt niet meer gebruikt door de gekozen versie, verspreid over {instances}: {list}.',
    other: '{count} instellingen van dit bestand worden niet meer gebruikt door de gekozen versie, verspreid over {instances}: {list}.'
  },

  'cleanup.calm': 'Er is geen haast bij en er is niets stuk: XCTrack sleept ze mee zonder ze te lezen, en ze laten staan verandert niets aan uw pagina’s. Ze weghalen maakt het bestand lichter, meer niet.',

  'cleanup.seeList': {
    one: 'Deze instelling bekijken, en afvinken wat u liever houdt',
    other: 'Deze {count} instellingen bekijken, en afvinken wat u liever houdt'
  },

  'cleanup.caveat': 'De namen hieronder zijn die welke XCTrack schrijft. De toepassing toont ze niet meer in haar menu’s: dat is net wat aangeeft dat zij ze niet meer gebruikt.',

  /* ------------------------------------------- ce que porte chaque réglage périmé */

  'cleanup.usedUntil': 'gebruikt tot XCTrack {release}',
  'cleanup.noLongerRead': 'niet meer gelezen door de gekozen versie',
  'cleanup.noteWithValue': 'ingesteld op {value}, {since}',
  'cleanup.noteRepeated': {
    one: '{note}, {count} keer geschreven op deze widget',
    other: '{note}, {count} keer geschreven op deze widget'
  },
  'cleanup.valueYes': 'ja',
  'cleanup.valueNo': 'nee',

  /* ------------------------------------------------------------- décocher, puis agir */

  'cleanup.allSelected': {
    one: '{count} instelling aangevinkt.',
    other: '{count} instellingen aangevinkt.'
  },
  'cleanup.someSelected': {
    one: '{count} aangevinkt van de {total} — {left}.',
    other: '{count} aangevinkt van de {total} — {left}.'
  },
  'cleanup.remaining': {
    one: '{count} instelling blijft staan',
    other: '{count} instellingen blijven staan'
  },
  'cleanup.noneSelected': 'Geen enkele instelling aangevinkt',

  'cleanup.removeButton': {
    one: 'Deze instelling weghalen',
    other: 'Deze {count} instellingen weghalen'
  },
  'cleanup.undoButton': {
    one: 'Deze instelling terugzetten',
    other: 'Deze {count} instellingen terugzetten'
  },

  'cleanup.removedTally': {
    one: '{count} instelling weggehaald op {instances}. Uw toestel weet er nog niets van: het bestand verandert pas wanneer u het opslaat.',
    other: '{count} instellingen weggehaald op {instances}. Uw toestel weet er nog niets van: het bestand verandert pas wanneer u het opslaat.'
  },

  /* --------------------------------------- le libellé du pas d'annulation de l'hôte */

  'cleanup.removeStep': {
    one: '{count} instelling van een oudere versie weghalen',
    other: '{count} instellingen van een oudere versie weghalen'
  },
  'cleanup.restoreStep': {
    one: '{count} instelling van een oudere versie terugzetten',
    other: '{count} instellingen van een oudere versie terugzetten'
  }
}

export default versions
