import type { DomainCatalog } from '../../domains'

/**
 * `sharingDialog.ts`, `warnings.ts` — voir `fr/sharing.ts` pour ce qui est tranché.
 *
 * **La gradation des trois issues est tenue par les verbes, pas par des adjectifs.**
 * *Your configuration, exactly as it is* → *All your settings, minus what identifies you*
 * → *Shareable version, no personal data*. Aucun titre ne dit « safe » : le deuxième cran
 * en donnerait une fausse idée, puisque le troisième en donne moins.
 *
 * *widget* et non *gadget* — mesuré sur les 55 relevés, voir `fr/common.ts`.
 */
const sharing: DomainCatalog<'sharing'> = {
  /* ============================== sharingDialog.ts — choosing what you hand over */

  'sharing.dialogTitle': 'Save this configuration',
  'sharing.close': 'Close',
  'sharing.cancel': 'Cancel',
  'sharing.confirm': 'Save',
  'sharing.lead': 'The file produced carries a timestamped name that keeps nothing of the ' +
    'original one — that one often contains a first name. So the name is settled; what ' +
    'remains is to choose what the file contains.',
  'sharing.legend': 'What should be saved?',
  'sharing.curiousHead': 'For the curious',
  'sharing.producedFileName': 'Name of the file produced: {name}',

  'sharing.choiceLabel': '{title}. {note}',

  'sharing.plainTitle': 'Your configuration, exactly as it is',
  'sharing.backupTitle': 'All your settings, minus what identifies you',
  'sharing.pagesTitle': 'Shareable version, no personal data',

  'sharing.plainContentPages': 'A “pages” export carries no preferences, but it does carry ' +
    'the texts you wrote in the widgets.',
  'sharing.plainContentBackup': 'It carries your preferences: pilot name, glider, paired ' +
    'sensors, waypoint files.',

  'sharing.plainTally': 'It carries {layout} and {preferences}; every one of them would go out in the clear.',
  'sharing.personalInLayout': {
    one: '{count} piece of personal data in the layout',
    other: '{count} pieces of personal data in the layout'
  },
  'sharing.personalInPreferences': {
    one: '{count} in the preferences',
    other: '{count} in the preferences'
  },

  'sharing.backupNoteUnchanged': 'The file stays a whole backup — vario and its sounds, ' +
    'units, theme, airspace thresholds, buttons. This particular file carries nothing that ' +
    'identifies you: there is therefore nothing to replace in it.',
  'sharing.backupNoteChanged': {
    one: 'The file stays a whole backup — vario and its sounds, units, theme, airspace thresholds, buttons. {count} line that identifies you is replaced by a neutral value or removed.',
    other: 'The file stays a whole backup — vario and its sounds, units, theme, airspace thresholds, buttons. {count} lines that identify you are replaced by neutral values or removed.'
  },
  'sharing.pagesNote': 'A “pages” export whose texts written by you are replaced with ' +
    'neutral ones. The layout is kept; the preferences do not travel.',

  'sharing.fidelityUnchanged': 'You changed nothing: the file comes back out exactly as it ' +
    'went in, without a single comma rewritten.',
  'sharing.fidelityUnchangedDetail': 'The bytes you opened are re-emitted without being ' +
    'rewritten: the SHA-256 hash of the file produced is that of the original file — you ' +
    'can check for yourself.',
  'sharing.fidelityModified': 'Everything you did not touch is copied out identically — ' +
    'down to the numbers and the original spacing. Only what you changed changes.',
  'sharing.fidelityModifiedDetail': 'Since the file is rewritten, its SHA-256 hash differs ' +
    'from that of the original file; on an unmodified document it is identical.',

  'sharing.freeTextHeading': 'Your texts inside the widgets',
  'sharing.freeTextNone': 'No customised text in the widgets of this file: nothing to ' +
    'replace here.',
  'sharing.freeTextCount': {
    one: '{count} text written by you is replaced. Here is which one, and where it sits. It lives in the page layout, not in the preferences: it therefore travels whatever the format of the file.',
    other: '{count} texts written by you are replaced. Here is which ones, and where they sit. They live in the page layout, not in the preferences: they therefore travel whatever the format of the file.'
  },

  'sharing.location': '{orientation} · page {page} · widget {rank} · {name}',
  'sharing.orientationLandscape': 'Landscape',
  'sharing.orientationPortrait': 'Portrait',

  'sharing.emptyValue': '(empty)',

  'sharing.otherPersonalInPreferences': {
    one: 'This file also carries {count} piece of personal data in its preferences — name, equipment, paired sensors, current task. It is not replaced: the shareable version above carries the pages only, and leaves the whole “preferences” section behind.',
    other: 'This file also carries {count} pieces of personal data in its preferences — name, equipment, paired sensors, current task. They are not replaced: the shareable version above carries the pages only, and leaves the whole “preferences” section behind.'
  },

  'sharing.preferencesHeading': 'Your personal settings, line by line',
  'sharing.preferencesNone': 'This file carries none of the 44 settings that XCTrack files ' +
    'under personal data: there is nothing to deal with here.',

  'sharing.preferencesFound': {
    one: '{count} personal setting was found in this file: {tally}. Each line says what happens to it, and why.',
    other: '{count} personal settings were found in this file: {tally}. Each line says what happens to it, and why.'
  },
  'sharing.preferencesReplaced': { one: '{count} replaced', other: '{count} replaced' },
  'sharing.preferencesDropped': { one: '{count} removed', other: '{count} removed' },
  'sharing.preferencesKept': { one: '{count} kept', other: '{count} kept' },
  'sharing.preferencesEmpty': { one: '{count} empty', other: '{count} empty' },

  'sharing.treatmentReplace': 'Replaced with a neutral value',
  'sharing.treatmentDrop': 'Removed from the file',
  'sharing.treatmentKeep': 'Kept exactly as they are, and here is why',
  'sharing.treatmentEmpty': 'Present in the file, but empty',

  'sharing.droppedLine': 'the whole line is removed',

  'sharing.backupResidualNote': 'This option deals with the 44 known personal settings of ' +
    'XCTrack and the eleven text fields of the widgets. The format changes with every ' +
    'release: a personal setting that appeared since would not be on the list, and would ' +
    'go out in the clear. The shareable version, further down, depends on no list at all — ' +
    'it carries no setting whatsoever.',

  'sharing.suspectsHeading': 'What looks like a text you would have written',
  'sharing.suspectsCount': {
    one: '{count} text is on none of our lists and yet looks like one.',
    other: '{count} texts are on none of our lists and yet look like one.'
  },
  'sharing.suspectsNote': 'These texts appear on none of our lists, and yet they look like ' +
    'something you would have written. They travel exactly as they are: we do not replace ' +
    'what we are unsure about, because we would damage settings. Only you know whether you ' +
    'wrote them.',
  'sharing.suspectsNoneNote': 'No unexpected text in what travels: everything not dealt ' +
    'with above has the shape of a setting — a word picked from a list, a number — and not ' +
    'that of a written text.',
  'sharing.suspectsMore': {
    one: '{count} further text of the same kind is not shown here, for want of room. Read the file produced before you send it.',
    other: '{count} further texts of the same kind are not shown here, for want of room. Read the file produced before you send it.'
  },

  'sharing.backupCostHeading': 'What the recipient will not get',
  'sharing.backupCostIntro': 'All your settings go through — vario and its sounds, units, ' +
    'theme, airspace thresholds, buttons. What they will not get is what belongs to your ' +
    'own device:',
  'sharing.backupCostOutro': 'Not one of these lines is a setting: they are files and ' +
    'devices that live at your place, and that they could have done nothing with.',

  'sharing.backupCostSensors': 'your paired sensors: they pair their own, which are the ' +
    'only ones they can use;',
  'sharing.backupCostTask': 'your current task, its turnpoints and their coordinates;',
  'sharing.backupCostFiles': 'your waypoint and airspace files, and the map theme you ' +
    'installed — files from your own device;',
  'sharing.backupCostOfflineMaps': 'your offline maps, for the same reason;',
  'sharing.backupCostQuickMessages': 'your Livetracking quick messages, which are your own ' +
    'sentences.',

  'sharing.anonymousCostIntro': 'What the recipient will therefore not get, and will have ' +
    'to set up themselves:',
  'sharing.anonymousCostOutro': 'They get the layout of your pages, not your preferences. ' +
    'That is what one usually wants — their units are not necessarily yours — but it has ' +
    'to be known before sending.',

  'sharing.anonymousCostUnits': 'the units — altitudes, distances, speeds: they will keep ' +
    'their own;',
  'sharing.anonymousCostTheme': 'the display theme, and the size and colour of widget titles;',
  'sharing.anonymousCostVario': 'the vario settings and its sounds;',
  'sharing.anonymousCostAirspace': 'the airspace thresholds and channels;',
  'sharing.anonymousCostLivetracking': 'Livetracking and its credentials;',
  'sharing.anonymousCostSensors': 'the paired Bluetooth sensors.',

  'sharing.droppedHeading': 'What will not travel',
  'sharing.droppedNothing': 'This file is already a “pages” export: it carries no ' +
    'preference, so there is nothing to take out of it.',
  'sharing.droppedIntro': {
    one: 'The shared file is a “pages” export: it carries your pages only. This whole ' +
      'section stays with you.',
    other: 'The shared file is a “pages” export: it carries your pages only. These whole ' +
      'sections stay with you.'
  },

  'sharing.droppedPreferences': 'All your preferences: pilot name, glider, units, theme, ' +
    'vario and sound settings, airspace thresholds, Livetracking, paired Bluetooth ' +
    'sensors, waypoint files.',
  'sharing.droppedAirspaceChannels': 'The airspace channels you selected.',
  'sharing.droppedUnknownSection': 'The “{key}” section, which a “pages” export does not carry.',

  'sharing.annexesHeading': 'The archive attachments',
  'sharing.annexesNote': 'An .xczfg archive carries attached files that this editor does ' +
    'not inspect — neither their content nor the metadata of an image, where a photo often ' +
    'carries the coordinates of the place it was taken. The shareable version is therefore ' +
    'written as a bare .xcfg, without them. Nothing useful is lost: the external resources ' +
    'of a configuration are pointed at from the preferences, which do not travel either.',

  'sharing.residualNote': 'The list of the eleven text fields dealt with is fixed, and the ' +
    'XCTrack format changes with every release: a text field that appeared since would go ' +
    'out in the clear. Read the inventory above before you send the file — that is the ' +
    'check, not this tool’s promise.',

  'sharing.personalHeading': 'Everything personal this file carries: {total} — {layout} in the layout, {preferences} in the preferences',
  'sharing.personalFilled': {
    one: '{count} is filled in',
    other: '{count} are filled in'
  },
  'sharing.personalEmpty': {
    one: '{count} is a slot that is present but empty',
    other: '{count} are slots that are present but empty'
  },
  'sharing.personalTravelsNote': 'Only those in the layout travel with a “pages” export.',

  /* ================================ warnings.ts — what you need to know about this file */

  'warnings.exportPagesTitle': '“Pages” export: the screens only',
  'warnings.exportPagesDetail': 'This file carries the widget pages only. Re-imported into ' +
    'XCTrack, it replaces the screens and touches nothing else: vario settings, units, ' +
    'airspace files and sensor configuration remain those of the device.',
  'warnings.exportBackupTitle': '“Backup” export: the whole configuration',
  'warnings.exportBackupDetail': 'This file carries the whole configuration. Re-imported ' +
    'into XCTrack, it overwrites not only the screens, but also the vario settings, the ' +
    'units, the airspace files and the sensor configuration of the device.',
  'warnings.exportUnknownTitle': 'Export type undetermined',
  'warnings.exportUnknownDetail': 'This file does not say whether it contains pages only or ' +
    'the whole configuration (info.exportType absent or unknown). What it will overwrite ' +
    'on re-import can therefore not be announced here.',
  'warnings.exportUnknownItem': 'info.exportType: “{type}”',

  'warnings.assumedValuesTitle': 'Theme, units and typography assumed',
  'warnings.assumedValuesDetail': 'This file carries no preference: the theme, the units ' +
    'and the title size used to draw these pages are factory values surveyed elsewhere, ' +
    'not those of your device. The geometry, on the other hand, does come from the file.',
  'warnings.assumedTheme': 'Theme: {theme}',
  'warnings.assumedUnits': 'Altitude: {altitude} · Speed: {speed} · Vario: {vario}',
  'warnings.assumedTitles': 'Titles: {percent} %, {font}',
  'warnings.assumedLanguageTitle': 'Label language undetermined',
  'warnings.assumedLanguageDetail': 'This file declares no display language: on the device, XCTrack then follows the Android system language — never English as a fallback. For want of better, the labels are shown here in {language} — the language you chose for this interface, or failing that your browser’s. The line that would carry it, Display.Language, is empty or absent from the file.',

  'warnings.personalLayoutTitle': 'Your pages carry texts of yours',
  'warnings.personalTitle': 'This file names you',
  'warnings.personalPreferenceCount': {
    one: '{count} personal setting filled in',
    other: '{count} personal settings filled in'
  },
  'warnings.personalLayoutCount': {
    one: '{count} text written inside a widget',
    other: '{count} texts written inside the widgets'
  },
  'warnings.personalDetailLead': 'This file carries {preferences} and {layout} that identify you: your name, your equipment, your broadcasting choices, your current task with its coordinates, and even the competition you are taking part in — the names of the waypoint files point at it.',
  'warnings.personalTravels': {
    one: '{count} text written inside a widget travels even with a “pages” export: that format is a coarse sort, not a clean-up.',
    other: '{count} texts written inside the widgets travel even with a “pages” export: that format is a coarse sort, not a clean-up.'
  },
  'warnings.personalEmptySlots': {
    one: '{count} personal slot is present but empty — it is not listed here.',
    other: '{count} personal slots are present but empty — they are not listed here.'
  },
  'warnings.personalDetailTail': 'This tool strips nothing in silence: the file comes out ' +
    'as it went in. It is up to you.',
  'warnings.personalItem': '{key} — {kind}: {value}',

  'warnings.externalTitle': 'External files referenced',
  'warnings.externalDetail': 'These names point at files present on the original device, ' +
    'not inside this configuration. A configuration received from another pilot points at ' +
    'files only they have: XCTrack will look for them on your SD card and will not find ' +
    'them. This tool lists them, it does not fix them. The three lines of the file that can ' +
    'carry such names: Mapsforge.ThemeFile, Navigation.WaypointFiles and Airspace.Files.',
  'warnings.externalMapTheme': 'Map theme: {file}',
  'warnings.externalWaypoints': 'Waypoints: {file}',
  'warnings.externalAirspace': 'Airspace: {file}',

  'warnings.versionUnknownTitle': 'XCTrack release unknown',
  'warnings.versionUnknownDetail': 'This file does not say which release of XCTrack it comes from. The gap with this tool’s reference release ({reference}) can therefore not be measured; what is displayed may have changed meaning since. The line that would say it, info.versionCode, is absent.',
  'warnings.versionOlderTitle': 'File older than the tool',
  'warnings.versionNewerTitle': 'File newer than the tool',
  'warnings.versionGapDetail': 'This file comes from release {name}, whereas this editor sets itself on release {reference} to draw it. The format changes with every release: some settings may be drawn otherwise than they will be on the device. The file is not modified for all that — it comes out as it went in, without a single comma rewritten. What the file writes for its release: versionCode {code}.',
  'warnings.versionNameUnknown': 'unknown',

  'warnings.structureTitle': 'Unexpected structure',
  'warnings.structureDetail': 'This editor did not recognise part of this file. The ' +
    'rendering is degraded where the information is missing, but nothing is lost: the ' +
    'document is kept intact and comes out as it is.',
  'warnings.where': '{orientation}, page {page}',
  'warnings.structureNoClass': '{where}: this page does not say its type',
  'warnings.structureNavigations': '{where}: this tool cannot say when this page shows up — the “navigations” value is neither “all”, nor “none”, nor a list',
  'warnings.structureMissingKeys': {
    one: '{where}, widget {rank}: line {keys} is missing',
    other: '{where}, widget {rank}: lines {keys} are missing'
  },
  'warnings.structureDuplicate': 'Duplicate line: {path}',

  'warnings.geometryTitle': 'Geometry defects',
  'warnings.geometryDetail': 'These widgets cannot show up the way their author hoped: box ' +
    'of zero width or height, coordinates out of bounds, or widget entirely hidden under ' +
    'another one, whose value it will never show. Plain overlaps are not reported: they ' +
    'are normal on a map or a thermal assistant.',
  'warnings.who': '{where}, widget {rank} ({name})',
  'warnings.cover': 'widget {rank} ({name})',
  'warnings.box': 'X1 {x1}, Y1 {y1}, X2 {x2}, Y2 {y2}',
  'warnings.geometryZeroWidth': '{who}: zero width, it has no surface at all — {box}',
  'warnings.geometryZeroHeight': '{who}: zero height, it has no surface at all — {box}',
  'warnings.geometryOutside': '{who}: runs off the page, {edge} is at {value} — {box}',
  'warnings.edgeLeft': 'its left edge',
  'warnings.edgeTop': 'its top edge',
  'warnings.edgeRight': 'its right edge',
  'warnings.edgeBottom': 'its bottom edge',
  'warnings.geometryCovered': '{who}: hidden by {cover}, and will therefore show nothing',
  'warnings.geometryCoveredButton': '{who}: hidden by {cover}, but still live to the finger',

  'warnings.coveredButtonsTitle': 'Action buttons hidden, and most likely on purpose',
  'warnings.coveredButtonsDetail': 'Another widget is laid over these buttons and covers ' +
    'them entirely: on the instrument, you will not see them. They still answer to the ' +
    'finger, though — pressing at that spot triggers their action, even if what you see ' +
    'there is the map or the thermal assistant. This is a common arrangement and not a ' +
    'defect: it gives a command where the screen is already busy. Nothing to fix, unless ' +
    'the overlay takes you by surprise.',

  'warnings.themeTitle': 'Theme drawn differs from theme declared',
  'warnings.themeDetail': 'These pages are drawn here with the {theme} theme, the only one that has been observed on the instrument. The file asks for another one: the colours and contrasts you see are therefore not those of your device. The geometry, on the other hand, is right — and the file is not modified for all that.',
  'warnings.themeFileKnown': 'Theme of the file: {theme}',
  'warnings.themeFileUnknown': 'Theme of the file: {theme} (theme unknown to this tool)',
  'warnings.themePerWidget': {
    one: '{count} widget in {theme}',
    other: '{count} widgets in {theme}'
  },

  'warnings.hypothesisTitle': '{title} — to be confirmed on the instrument',
  'warnings.hypothesisLead': 'This is not a measured finding but a question, and here is ' +
    'what would settle it.',
  'warnings.preflightItem': '{where}: {message}'
}

export default sharing
