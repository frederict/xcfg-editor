import type { DomainCatalog } from '../../domains'

/** La prose hors interface — voir `fr/model.ts`. */
const model: DomainCatalog<'model'> = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identity',
  'personalKind.credential': 'credential',
  'personalKind.contact': 'contact',
  'personalKind.device': 'device',
  'personalKind.location': 'position',
  'personalKind.file': 'file',
  'personalKind.freeText': 'free text',
  'personalKind.equipment': 'equipment',
  'personalKind.sharing': 'sharing',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack declares it itself',
  'personalBasis.inputType': 'XCTrack types it as dots, like a password',
  'personalBasis.declared': 'this is our judgement, not XCTrack’s',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Layout — travels with the pages',
  'personalHome.preferences': 'Preferences — stays with you in a “pages” export',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'custom title of a widget, written by you',
  'personalReason.text': 'whole content of a free-text widget, written by you',
  'personalReason.fullName': 'name of a person saved on a call button',
  'personalReason.phoneNumber': 'phone number saved on a call button',
  'personalReason.url': 'web address you typed, which may carry a token or an identifier',
  'personalReason.title': 'label of a launch button, written by you',
  'personalReason.name': 'name of the application a launch button targets',
  'personalReason.action': 'Android action of a launch button, which may be a full URI',
  'personalReason.filter': 'log filter you typed',
  'personalReason.suffix': 'text placed after the displayed value, written by you',
  'personalReason.event': 'event name you typed',
  'personalReason.unknown': 'free text with no rule of its own: treated as personal, as a precaution',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'slot present, but empty',

  'personal.hiddenStructure': {
    one: 'structure with {count} entry, not shown',
    other: 'structure with {count} entries, not shown'
  },

  'personal.caveat': {
    one: 'This inventory covers the settings known to XCTrack {version}: {count} setting and eleven free-text fields of the widgets. The format changes with every release — an empty inventory therefore does not prove an absence.',
    other: 'This inventory covers the settings known to XCTrack {version}: {count} settings and eleven free-text fields of the widgets. The format changes with every release — an empty inventory therefore does not prove an absence.'
  },

  /* ---------------------------- sharing.ts — what replaces what, and why. See `fr/model.ts`. */

  'sharingReason.titletext': 'Custom widget title: replaced by a neutral, numbered title, ' +
    'so that the layout and the distinction between widgets are preserved.',
  'sharingReason.text': 'Whole content of a free-text widget: replaced by a short text, so ' +
    'that the frame stays filled without overflowing.',
  'sharingReason.fullName': 'Name of a person saved on a call button: replaced by a ' +
    'neutral label.',
  'sharingReason.phoneNumber': 'Phone number: replaced by a number of the same shape but ' +
    'impossible to dial — “00” is not a country code.',
  'sharingReason.url': 'Web address you typed, which may carry a token or an identifier: ' +
    'replaced by an address in the reserved “.invalid” domain, which never resolves.',
  'sharingReason.title': 'Label of a launch button: replaced by a neutral, numbered label.',
  'sharingReason.name': 'Name of the application a launch button opens: replaced by a ' +
    'neutral, numbered label.',
  'sharingReason.action': 'Android action of a launch button, which may be a full URI: ' +
    'replaced by the internal test action XCTrack puts on a new button.',
  'sharingReason.filter': 'Log filter you typed: emptied, that is “no filter”, the neutral ' +
    'value of the setting.',
  'sharingReason.suffix': 'Text placed after the displayed value: emptied, that is “no ' +
    'suffix”, the neutral value of the setting.',
  'sharingReason.event': 'Event name you typed: replaced by the test event XCTrack puts on ' +
    'a new widget.',
  'sharingReason.unknownFreeText': 'Free text with no rule of its own: replaced by a ' +
    'neutral text, as a precaution.',

  'sharingReason.credential': 'Login or password. The whole line is removed: a credential ' +
    'has no neutral value, and making one up would break the recipient’s sign-in instead of ' +
    'simply leaving it empty.',
  'sharingReason.activeLookDevice': 'The ActiveLook glasses paired with your device. Reset ' +
    'to the factory value surveyed in XCTrack — the empty string, that is “no glasses”.',
  'sharingReason.activeLookName': 'The name of your ActiveLook glasses. Reset to the ' +
    'factory value surveyed in XCTrack — the empty string, that is “no glasses”.',
  'sharingReason.airspaceFiles': 'The airspace files you have loaded. The whole line is ' +
    'removed: these are files on your own device, which the recipient does not have.',
  'sharingReason.guessedPosition': 'Your device’s presumed position — your home, in ' +
    'practice. The whole line is removed: no replacement coordinates would be honest.',
  'sharingReason.speechText': 'A text you typed for speech synthesis. Replaced by a short, ' +
    'neutral text, so that the setting stays filled in.',
  'sharingReason.gliderCategory': 'Your glider’s category. Kept: it is a flying setting, it ' +
    'carries no name, no number, no address, and it is often the very thing you want to share.',
  'sharingReason.hangGliderCategory': 'Your hang glider’s category. Kept: it is a flying ' +
    'setting, it carries no name, no number, no address, and it is often the very thing you ' +
    'want to share.',
  'sharingReason.gliderName': 'Your glider’s name — model and size are enough to recognise ' +
    'you in a club. Replaced by a neutral word, so that the setting stays filled in.',
  'sharingReason.gliderModel': 'Your glider’s model. Reset to the factory value surveyed in ' +
    'XCTrack — the empty string, that is “no model chosen”.',
  'sharingReason.gliderProducer': 'Your glider’s manufacturer. Reset to the factory value ' +
    'surveyed in XCTrack — the empty string, that is “no manufacturer chosen”.',
  'sharingReason.livetrackChoice': 'A Livetrack broadcasting choice you made. Kept: it is a ' +
    'setting, not a piece of data — it carries neither a name nor an account identifier.',
  'sharingReason.quickMessages': 'The quick messages you wrote for Livetracking. The whole ' +
    'line is removed: it is a list of your own sentences, and the recipient will write theirs.',
  'sharingReason.offlineMaps': 'The offline maps installed on your device. The whole line ' +
    'is removed: these are files on your own device, which the recipient does not have.',
  'sharingReason.mapTheme': 'The map theme you installed, named by its path. Reset to the ' +
    'factory value surveyed in XCTrack, “DEFAULT”: the recipient’s own map is drawn, ' +
    'instead of looking for a file they do not have.',
  'sharingReason.navigationState': 'Your current task, turnpoints and coordinates included. ' +
    'The whole line is removed: its schema changes with every XCTrack release, and a ' +
    'replacement structure would be a shape the application never writes.',
  'sharingReason.waypointFiles': 'Your waypoint files — their name often names the ' +
    'competition you are flying. The whole line is removed: these are files on your own ' +
    'device, which the recipient does not have.',
  'sharingReason.pilotName': 'Your name, exactly as typed. Replaced by a neutral word ' +
    'rather than emptied: XCTrack displays it and sends it with Livetracking, and an empty ' +
    'name is not a situation it is known to handle.',
  'sharingReason.derivedRegistration': 'The registration inferred for your aircraft. The ' +
    'whole line is removed: a registration names an aircraft and its owner, and making one ' +
    'up would name somebody else.',
  'sharingReason.registration': 'Your aircraft’s registration. The whole line is removed: a ' +
    'registration names an aircraft and its owner, and making one up would name somebody else.',
  'sharingReason.sensors': 'Your paired sensors, Bluetooth addresses included. The whole ' +
    'line is removed: the recipient pairs their own, which are anyway the only ones they ' +
    'can use.',
  'sharingReason.lastNetLocation': 'The last position used to ask for the QNH. Reset to the ' +
    'factory value surveyed in XCTrack — the empty string, that is “no position”.',
  'sharingReason.replayFile': 'One of your track files. Reset to the factory value surveyed ' +
    'in XCTrack — the empty string, that is “no track to replay”.',
  'sharingReason.unknownPreference': 'Personal setting with no rule of its own: the whole ' +
    'line is removed, as a precaution.',
  'sharingReason.shapeMismatch': 'This setting does not carry the text its rule expected — ' +
    'its shape has changed since the survey. The whole line is removed: writing a word in ' +
    'place of a structure would produce a file XCTrack would refuse.',
  'sharingReason.emptySlot': 'The slot is present in the file, but it carries nothing: ' +
    'there is nothing to replace, and the line stays as it is.',

  /* ------------------------ what looks personal without being declared: the clue */

  'suspectClue.url': 'This text has the shape of a web address, which may carry a token or ' +
    'an identifier.',
  'suspectClue.mail': 'This text has the shape of an email address.',
  'suspectClue.path': 'This text has the shape of a file path on your device.',
  'suspectClue.hardware': 'This text has the shape of a Bluetooth or network device address.',
  'suspectClue.phone': 'This text has the shape of a phone number.',
  'suspectClue.letters': 'This text carries accented letters or signs outside the plain ' +
    'Latin alphabet: it was written, not picked from a list.',
  'suspectClue.sentence': 'This text carries a space: it reads like a sentence, not like a ' +
    'value to pick from a list.',

  /* ---------------- the pre-flight check — see `fr/model.ts` for the three assumptions */

  'inspection.landscape': 'Landscape',
  'inspection.portrait': 'Portrait',
  'inspection.wherePage': '{orientation}, page {page}',
  'inspection.whereWidget': '{orientation}, page {page}, widget {rank}',

  'ruleTitle.unreachableWidget': 'Widget impossible to touch',
  'ruleTitle.pageNeverShown': 'Page that will never be shown',
  'ruleTitle.thermalPages': 'Several thermal assistant pages',
  'ruleTitle.widgetTooSmall': 'Widget perhaps too small to read',
  'ruleTitle.proWidget': 'Pro widget with no declared licence',
  'ruleTitle.roadMaps': 'Two road maps on the same page',
  'ruleTitle.obsoleteKey': 'Setting from an earlier release',

  'ruleSummary.unreachableWidget': 'No point of these widgets escapes the ones drawn after ' +
    'them, and it is the frontmost widget that takes the tap. They may stay perfectly ' +
    'visible: a widget that paints no background steals taps just as much as an opaque one.',
  'ruleSummary.pageNeverShown': 'XCTrack says so in its own settings dialog: a page with no ' +
    'navigation type ticked is shown in no flight context at all.',
  'ruleSummary.thermalPages': 'The survey of the instrument says the “thermal assistant” ' +
    'class is the one automatic switching targets. It does not say which one is targeted ' +
    'when an orientation carries several: this editor assumes the last, and that ' +
    'assumption has never been verified.',
  'ruleSummary.widgetTooSmall': 'The threshold comes from ISO 9241-303 and applies to the ' +
    'real physical size of the chosen screen template, not to pixels: changing template ' +
    'changes those millimetres.',
  'ruleSummary.proWidget': 'This file declares “proUpTo: 0” and carries widgets reserved ' +
    'for the Pro licence.',
  'ruleSummary.roadMaps': 'XCTrack warns in its own settings that only one road map is ' +
    'possible per page, because of a limitation in its map library.',
  'ruleSummary.obsoleteKey': 'These widgets carry settings written by an earlier release of ' +
    'XCTrack. There is nothing to do about it before flying; to learn what a given release ' +
    'does with them, and possibly remove them, see “Version and compatibility” in the ' +
    '“File” menu.',

  'inspection.unreachable': '“{name}” is entirely covered by widgets placed after it. No click can therefore reach it, neither here nor in XCTrack’s own editing screen, which also hands control to the frontmost widget. It may stay perfectly visible — a widget that paints nothing steals taps just as much as an opaque one. To set it up, go through the page’s widget list.',
  'inspection.unreachableToVerify': 'What becomes of this widget in flight has not been ' +
    'observed: XCTrack may route the tap differently from the editor. The question matters ' +
    'above all for action buttons, which exist only to be touched in flight.',

  'inspection.pageNeverShown': {
    one: 'This page is enabled for no navigation type: XCTrack will show it in no flight context, and its {count} widget will never serve. That is the instrument’s “Disabled” setting — deliberate, or forgotten. Not to be confused with a page merely restricted to certain navigations, which is a normal setting.',
    other: 'This page is enabled for no navigation type: XCTrack will show it in no flight context, and its {count} widgets will never serve. That is the instrument’s “Disabled” setting — deliberate, or forgotten. Not to be confused with a page merely restricted to certain navigations, which is a normal setting.'
  },

  'inspection.thermalPages': 'This orientation carries several thermal assistant pages, and XCTrack targets only one when it switches over by itself in a turn. Which one? This editor assumes the last, here page {target} — without having verified it. This one stays reachable through “next page” in any case.',
  'inspection.thermalPagesToVerify': 'Nothing has been observed of what XCTrack does when ' +
    'several thermal assistant pages coexist: no file in the corpus carries two. ' +
    'Duplicating one on the instrument, entering a turn and watching which page comes up ' +
    'would settle the question in a single flight.',

  'inspection.tooSmall': '“{name}” is only {height} high on this device. If the text it displays takes up half of that, it will measure about {value} — below the {minimum} that ISO 9241-303 gives as an absolute minimum at {distance} cm. Will it still be readable at arm’s length, in full sun, with gloves on? To be checked on the instrument.',
  'inspection.tooSmallToVerify': 'The share of the widget’s height actually taken up by the glyph of the value (assumed here to be {ratio}) has been measured on a single widget, in a single screenshot. The screenshots of the 75-widget board would be enough to measure it type by type, without touching the device.',

  'inspection.proWidget': '“{name}” is a Pro widget, and this file declares “proUpTo: 0”. What will XCTrack do with this widget on a device without a Pro licence: replace it with a “Pro widget” frame, show it normally, or leave it alone? We do not know.',
  'inspection.proWidgetToVerify': 'The meaning of `info.proUpTo` is not established: 0 may ' +
    'mean “no licence”, or an expiry date in seconds. All 21 files in the corpus carry 0, ' +
    'across two installations — no other value has ever been observed. A trial on the AIR³ ' +
    'with a Pro widget would settle it.',

  'inspection.roadMaps': '“{name}” asks for a road map too, and widget {first} of this page already asks for one. XCTrack warns in its own settings that only one road map is possible per page, because of a limitation in its map library. What will be drawn instead is not predictable.',

  'inspection.obsoleteKey': {
    one: '“{name}” carries a setting written by an earlier release of XCTrack ({detail}). Nothing is lost: XCTrack 1.0.3 converts it on reading — that is verified on the instrument — and will rewrite it under its new name the first time this widget is configured.',
    other: '“{name}” carries settings written by an earlier release of XCTrack ({detail}). Nothing is lost: XCTrack 1.0.3 converts them on reading — that is verified on the instrument — and will rewrite them under their new names the first time this widget is configured.'
  },

  /* -------------------- library failures and the technical detail — see `fr/model.ts` */

  'model.noErrorMessage': 'the failure left no message',

  'libraryError.duringOpen': 'Opening the library',
  'libraryError.duringReadAll': 'Reading the library',
  'libraryError.duringReadEntry': 'Reading an entry',
  'libraryError.duringReadBytes': 'Reading a configuration',
  'libraryError.duringWrite': 'Writing an entry',
  'libraryError.duringDelete': 'Deleting an entry',
  'libraryError.duringClear': 'Emptying the library',

  'libraryError.quota': '{operation}: the browser refused to write, the space granted to this site is full. Export your library, then delete entries to make room.',
  'libraryError.storageFailed': '{operation}: the browser could not answer. {detail}',
  'libraryError.noIndexedDb': 'This browser offers no IndexedDB: the library can keep nothing.',
  'libraryError.blockedByTab': 'Another tab is preventing the library from being updated. ' +
    'Close it, then reload.',

  'libraryError.notFound': 'No entry {id} in the library.',
  'libraryError.corrupt': 'Entry {id} cannot be read: {reason}.',
  'libraryError.duplicateId': 'An entry already carries the identifier {id}.',
  'libraryError.changedElsewhere': 'Entry {id} has changed since it was read — another tab modified or deleted it. Reload the library before trying again.',
  'libraryError.notReadable': '“{name}” could not be opened: it is not a readable XCTrack configuration. {detail}',
  'libraryError.bytesMissing': 'The bytes of “{name}” cannot be found: the entry is incomplete.',
  'libraryError.digestChanged': '“{name}” no longer returns its original digest: the stored bytes have been altered. The entry is not given back.',

  'libraryError.recordNotObject': 'the record is not an object',
  'libraryError.recordNoId': 'identifier missing or empty',
  'libraryError.recordBadFields': {
    one: 'unreadable field: {fields}',
    other: 'unreadable fields: {fields}'
  },
  'libraryError.legacyPersonalDatum': 'spotted by an earlier version of this editor, which ' +
    'did not say what kind it was. Reload this entry for the full inventory.',

  'libraryError.manifestUnreadable': 'The archive’s index cannot be read.',
  'libraryError.manifestEmpty': 'The archive’s index is empty.',
  'libraryError.notALibrary': 'This file is not a library exported by this editor.',
  'libraryError.futureFormat': 'This library was written by a later version of the editor (format {version}). Update the editor before importing it.',
  'libraryError.manifestNoItems': 'The archive’s index lists no configuration.',
  'libraryError.notAnArchive': 'This file is not a library archive, or it is damaged. {detail}',
  'libraryError.manifestMissing': 'The archive contains no {file}: it is not an exported library.',

  'libraryError.itemManifestUnreadable': 'unreadable index in the archive',
  'libraryError.itemMemberMissing': 'member {file} missing from the archive',
  'libraryError.itemDigestMismatch': 'the archive’s bytes do not return the announced digest',
  'libraryError.importedSuffix': ' (imported)'
}

export default model
