import type { DomainCatalog } from '../../domains'

/**
 * `libraryPanel.ts` — the library of named configurations.
 *
 * *put back*, never *restore*: the French « rétablir » covers three gestures, and this one
 * is the library's. *Redo* lives in `app`, *reset* in the zoom.
 */
const library: DomainCatalog<'library'> = {
  /* ---------------------------------------------------------------- head and foot */

  'library.panelLabel': 'Configuration library',
  'library.title': 'My configurations',
  'library.lead':
    'Keep several configurations under a name, in this browser, and come back to any of them whenever you like. Nothing is sent anywhere: everything stays on this device. The bytes stored are your file’s own, never a rewritten copy.',
  'library.storeCurrent': 'Store the open configuration',
  'library.addFile': 'Store a file…',
  'library.exportAll': 'Export the library',
  'library.importAll': 'Import a library…',
  'library.close': 'Close',

  'library.empty':
    'Nothing stored yet. Store the open configuration, or drop in an .xcfg file you have already exported: it will keep its name, its date and its bytes.',

  'library.footCount': {
    one: '{count} stored configuration{size}{broken}.',
    other: '{count} stored configurations{size}{broken}.'
  },
  'library.footTotalSize': ' — {size} in total',
  'library.footBroken': {
    one: ', {count} unreadable entry',
    other: ', {count} unreadable entries'
  },

  /* ------------------------------------------------------------ browser storage */

  'library.notDurableTitle': 'Storage is not durable',
  'library.notDurableText':
    'This browser grants no persistent storage to this page: what you store here will live as long as the tab, then vanish. The library still works — but it is not a backup. Export it before you close.',

  'library.preventErase': 'Stop the browser from erasing my library',
  'library.persistenceGranted':
    'The browser agreed. That is never a guarantee: some erase the data of a site left unvisited for seven days anyway. The only backup that holds is the archive you export.',
  'library.persistenceDenied':
    'The browser refused. The library still works, but it may erase it: export it regularly.',
  'library.persistenceUnsupported':
    'This browser does not offer that setting. Export your library regularly.',

  'library.storageUnknown': 'This browser says nothing about the space available.',
  'library.storageEstimate':
    'Space used by this site: {usage} out of {quota} granted — the browser gives no more than an order of magnitude.',

  /* --------------------------------------------------------- the levels of the panel */

  'library.backToList': '← Back to the list',
  'library.back': '← Back',
  'library.returnToList': 'Back to the list',
  'library.cancel': 'Cancel',
  'library.announceBackToList': 'Back to the list of configurations.',
  'library.announceBackTo': 'Back: {title}.',

  /* ------------------------------------------------------- the buttons of one entry */

  'library.load': 'Load',
  'library.extract': 'Take the file back out',
  'library.identity': 'Identity card',
  'library.verify': 'Check the digest',
  'library.rename': 'Rename',
  'library.remove': 'Delete',
  'library.store': 'Store',
  'library.save': 'Save',

  /* ------------------------------------------------------- one entry in the list */

  'library.entryStamp': 'Stored on {when} · {file}',
  'library.unknownFileName': 'unknown file',
  'library.previewStored': 'Preview stored',
  'library.chipArchive': '.xczfg archive',
  'library.personalCount': {
    one: '{count} personal item',
    other: '{count} personal items'
  },
  'library.personalTravellingCount': {
    one: '{count} travels with the pages',
    other: '{count} travel with the pages'
  },

  /* ---------------------------------------------------------------- export format */

  'library.exportTypeBackup': 'Full backup (pages and preferences)',
  'library.exportTypePages': 'Pages only (no preference)',
  'library.exportTypeUndeclared': 'Not declared by the file',
  'library.chipBackup': 'Backup',
  'library.chipPages': 'Pages only',
  'library.chipUndeclared': 'Type not declared',

  /* --------------------------------------- identity card: what the file declares */

  'library.identityTitle': 'Identity card — {name}',
  'library.identityLead':
    'Two halves, never mixed: what the file declares, and what this editor assumes about it. Anything assumed can be wrong without the file being at fault.',
  'library.readNote':
    'Read as it stands in the stored bytes. A missing field is said to be missing, never replaced by a default value.',
  'library.assumedNote':
    'None of this is in the file. The device and its resolution come from our table; knowing that a widget is reserved for the Pro version comes from a catalogue extracted from the APK.',

  'library.factExportType': 'Export format',
  'library.factExportTypeNote': 'Key info.exportType.',

  'library.factContainer': 'Container',
  'library.containerArchive': {
    one: '.xczfg archive — {count} extra file',
    other: '.xczfg archive — {count} extra files'
  },
  'library.containerPlain': '.xcfg file',
  'library.containerExtrasNote': 'Extras: {names}. This editor does not inspect their contents.',

  'library.factSize': 'Size',

  'library.factVersion': 'XCTrack version declared',
  'library.versionAbsent': 'The file does not say which',
  'library.versionValue': '{name} — version code {code}',
  'library.versionNameAbsent': '(name missing)',
  'library.versionCodeAbsent': '(missing)',
  'library.factVersionNote': 'Keys info.versionName and info.versionCode.',

  'library.factDevice': 'Device declared',
  'library.deviceAbsent': 'The file does not say',
  'library.factDeviceNote': 'Raw string from info.device. It carries no resolution.',

  'library.factPages': 'Pages',
  'library.noPage': 'no page',
  'library.landscapePageCount': {
    one: '{count} landscape page',
    other: '{count} landscape pages'
  },
  'library.portraitPageCount': {
    one: '{count} portrait page',
    other: '{count} portrait pages'
  },

  'library.factWidgets': 'Widgets',
  'library.widgetsOfTypes': {
    one: '{count} widget of {types}',
    other: '{count} widgets of {types}'
  },
  'library.typeCount': { one: '{count} kind', other: '{count} kinds' },
  'library.topTypesNote': 'Most used: {types}.',

  'library.factRootSections': 'Top-level sections',
  'library.noRootSection': 'none',

  'library.factSettings': 'Settings stored',
  'library.settingsNone': 'none — this file does not carry your preferences',
  'library.settingLineCount': { one: '{count} line', other: '{count} lines' },
  'library.settingsNote':
    'This editor can name only a few families of them: the count is here so that the rest stays visible.',

  'library.factDuplicates': 'Duplicate lines',
  'library.duplicateLineCount': {
    one: '{count} duplicate line',
    other: '{count} duplicate lines'
  },
  'library.duplicatesNote': 'XCTrack will read only one of them: {keys}.',

  'library.factExternal': 'External resources expected',
  'library.externalNote':
    'These files must exist on the receiving device; they are not in the configuration.',

  'library.factParse': 'Parsing',
  'library.parseFailed': 'The contents could not be parsed',
  'library.parseNote':
    'The bytes are stored and will come back out unchanged; it is their description that is missing. Technical detail: {detail}.',

  /* ------------------------------------ identity card: what the editor assumes */

  'library.factScreen': 'Screen template used',
  'library.screenFallback': '{device} — fallback template, no device recognised',
  'library.factScreenNote':
    'The resolution comes from this editor’s device table, not from the file.',

  'library.factPro': '“Pro” widgets',
  'library.proUnknown': 'Unknown — no widget catalogue was supplied',
  'library.proNone': 'None',
  'library.proUnknownNote':
    'We do not guess whether a widget is reserved for the Pro version: without a catalogue, we say nothing.',
  'library.proNote': 'According to the catalogue extracted from APK 1.0.3-beta5, not according to the file.',

  'library.factVersionGap': 'Where the version stands',
  'library.versionGapOlder': 'Older than the one this editor draws for',
  'library.versionGapSame': 'The one this editor draws for',
  'library.versionGapNewer': 'Newer than the one this editor draws for',
  'library.versionGapUnknown': 'The file does not say which version it comes from',
  'library.factVersionGapNote':
    'This editor sets its drawing on one precise version of XCTrack; that is the version this file is compared with, not the one on your device.',

  'library.factPersonalTravels': 'Personal data travelling with the pages',
  'library.personalTravelsYes': 'Yes — the layout carries at least one text written by you',
  'library.personalTravelsNo': 'No — no free text found in the layout',
  'library.personalTravelsYesNote':
    'A “pages” export is therefore not anonymous by construction: the name and the number on a call button are in the layout, not in the preferences.',
  'library.personalTravelsNoNote':
    'The list of free-text fields is fixed and will go stale: it does not prove an absence.',

  /* --------------------------------------------------------------- the entry itself */

  'library.entryItself': 'The entry itself',
  'library.fieldName': 'Name',
  'library.factOriginalFile': 'Original file',
  'library.unknownOriginalFile': '(unknown)',
  'library.factStoredOn': 'Stored on',
  'library.factLastWrite': 'Last write',
  'library.factDigest': 'SHA-256 digest',
  'library.yourNote': 'Your note: {note}',

  'library.timesStored': {
    one: 'stored once only',
    other: 'stored {count} times'
  },

  /* ------------------------------------------- what the entry carries that is personal */

  'library.personalHeading': 'What this entry carries that is personal',
  'library.noPersonalData': 'No personal data spotted. {caveat}',
  'library.personalSummary':
    '{total} in this entry: {layout} in the layout, which goes with the pages, and {preferences} in the preferences, which stay with you in a “pages” export. {filled}, {empty}. They are shown, never removed: you are the one who decides.',
  'library.personalTotal': {
    one: '{count} personal item is present',
    other: '{count} personal items are present'
  },
  'library.personalFilled': {
    one: '{count} is filled in',
    other: '{count} are filled in'
  },
  'library.personalEmpty': {
    one: '{count} is an empty slot',
    other: '{count} are empty slots'
  },
  'library.basisReadInApp': 'read in the application',
  'library.basisJudgedHere': 'judged by this editor',
  'library.travelsCaveat':
    'The lines marked “travels with the pages” are in the layout: they travel even in a “pages” export. Deriving a “pages” file is a coarse sort, it is not a cleanup.',

  /* ------------------------------------------------------------------- the preview */

  'library.previewHeading': 'Preview',
  'library.previewNote':
    'The room is reserved in the library, but no image is produced by this panel: drawing a page belongs to the rendering engine. The day it provides one, neither the storing nor the shape of the record will have to change.',

  /* ---------------------------------------------------------------------- storing */

  'library.storeLead':
    'Give it a name you will recognise in six months — “Comp Annecy”, “Vol-biv Alpes”, “École”. What is stored is your file itself, without a comma rewritten.',
  'library.fieldNoteOptional': 'Note (optional)',
  'library.noteHint':
    'Whatever you like: the site, the wing, the vario setting. Never interpreted.',
  'library.stored': '“{name}” is stored — {size}, digest {digest}…',
  'library.noOpenFile':
    'No file is open: open a configuration, or store a file from the disk.',

  'library.storedLine': '“{name}” is stored — {size}, {when}.',

  /* ---------------------------------------------------------------------- loading */

  'library.loaded': '“{name}” is loaded — {size}, bytes checked against their digest.',
  'library.unsavedTitle': 'Changes have not been saved',
  'library.unsavedBody':
    'The open document — “{file}” — carries changes you have not saved. Loading “{name}” replaces them in the editor.',
  'library.storeFirstCaveat':
    'Storing first costs nothing: the open configuration takes a name in the library, and you will come back to it in one click.',
  'library.storeThenLoad': 'Store first, then load',
  'library.loadWithoutStoring': 'Load without storing',

  /* -------------------------------------------------------- taking the file back out */

  'library.extracted': {
    one: '“{name}” comes back out just as it went in: {count} byte, digest checked.',
    other: '“{name}” comes back out just as it went in: {count} bytes, digest checked.'
  },

  /* ---------------------------------------------------------------------- the digest */

  'library.digestTitle': 'Digest — {name}',
  'library.verifyNote':
    'The digest was laid down when the entry was stored, on the bytes stored. This one has just been recomputed on what the library returns now.',
  'library.digestStored': 'Recorded',
  'library.digestFresh': 'Recomputed just now',
  'library.digestMissing': 'none — the bytes were not returned',
  'library.sizeUnreadable': 'unreadable — {expected} expected',
  'library.sizeCompared': {
    one: '{count} byte — {expected} expected',
    other: '{count} bytes — {expected} expected'
  },
  'library.digestSame':
    'Identical: the bytes stored are exactly those of the original file.',
  'library.digestDiffers': 'Different — this entry will not be given back.',

  /* ---------------------------------------------------------------------- deleting */

  'library.removeTitle': 'Delete “{name}”?',
  'library.removeBody':
    '“{name}” and its {size} of bytes will be taken out of this browser. This library has no wastebasket.',
  'library.removeCaveat':
    'If you are not sure: take the file back out first, or export the whole library.',
  'library.removed': '“{name}” has been deleted.',

  /* --------------------------------------------------------------- unreadable entry */

  'library.brokenName': 'Unreadable entry',
  'library.brokenNote':
    'It does not stop the others from showing, and it can still be deleted. Its bytes will not be exported: one does not write into a backup what one could not give back.',
  'library.brokenBody':
    'This entry cannot be read back: we do not know what it held. Deleting it frees its room and loses nothing readable.',
  'library.brokenTechnical': 'Internal identifier {id}. Technical detail: {reason}.',
  'library.removeBrokenTitle': 'Delete this unreadable entry?',
  'library.brokenRemoved': 'The unreadable entry has been deleted.',
  'library.brokenHeading': {
    one: '{count} Entry that cannot be read back',
    other: '{count} Entries that cannot be read back'
  },

  /* ------------------------------------------------------- exporting and importing */

  'library.exported': {
    one: '{count} configuration exported into a ZIP archive. Each .xcfg comes out of it with any unzipper.{tail}',
    other: '{count} configurations exported into a ZIP archive. Each .xcfg comes out of it with any unzipper.{tail}'
  },
  'library.exportSkipped': {
    one: ' {count} unreadable entry is not in it: the backup is incomplete, and says so.',
    other: ' {count} unreadable entries are not in it: the backup is incomplete, and says so.'
  },

  'library.importTitle': 'Library imported',
  'library.importLead':
    'Archive exported on {when}. No existing entry was overwritten: an entry already present under other bytes is put back alongside, with a suffix.',
  'library.outcomeImported': 'put back',
  'library.outcomeAlreadyPresent': 'already present, nothing to do',
  'library.outcomeDuplicated': 'put back alongside: its identifier was already taken',
  'library.outcomeRejected': 'rejected',
  'library.imported': {
    one: '{count} entry read in the archive.',
    other: '{count} entries read in the archive.'
  },
  'library.importedWithRejected': {
    one: '{count} entry read in the archive — {rejected}.',
    other: '{count} entries read in the archive — {rejected}.'
  },
  'library.rejectedCount': { one: '{count} rejected', other: '{count} rejected' },

  /* ------------------------------------------------- what fails, and its way out */

  'library.exportNow': 'Export the library now',
  'library.reloadLibrary': 'Reload the library',
  'library.conflict':
    '{message} Nothing was written: your change did not overwrite theirs.',
  'library.operationFailed':
    '{context}: the operation did not go through. Technical detail: {detail}',

  'library.contextStoring': 'Storing',
  'library.contextLoading': 'Loading',
  'library.contextRemoving': 'Deletion',
  'library.contextExtracting': 'Giving the file back',
  'library.contextVerifying': 'Checking',
  'library.contextRenaming': 'Renaming',
  'library.contextExporting': 'Library export',
  'library.contextImporting': 'Library import',
  'library.contextReading': 'Library read',

  /* ---------------------------------------------------------------------- renaming */

  'library.renameTitle': 'Rename “{name}”',
  'library.renameLead': 'The name is yours; the bytes stored do not move.',
  'library.fieldNote': 'Note',
  'library.renamed': '“{name}” is up to date — {times}.',

  /* ------------------------------------------- “put back”, the third « rétablir » */

  'library.entryRestored': '“{name}” has been put back.',
  'library.entryRestoredBeside': '“{name}” has been put back alongside: its identifier was already taken.',

  'library.entryCount': {
    one: '{count} stored configuration',
    other: '{count} stored configurations'
  }
}

export default library
