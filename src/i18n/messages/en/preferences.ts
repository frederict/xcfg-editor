import type { DomainCatalog } from '../../domains'

/**
 * `preferencesPage.ts` in English.
 *
 * ## « valeur d'usine » : the collision the French had, English does not
 *
 * French had to give up *défaut* — it reads *fault* — and settled on **valeur d'usine**.
 * English keeps both words and must therefore choose, employ by employ:
 *
 * - **factory value** wherever the sentence names *the value XCTrack ships with*, as a
 *   thing the pilot can adopt, drop or restore. That is every state, every tooltip and
 *   the three gestures;
 * - **default** never appears alone: *the default* would read as « what happens when you
 *   do nothing », which is exactly the fact `preferences.absentKeyOnImport` refutes.
 *
 * ## The wording that must not drift
 *
 * *widget* (never « gadget » — French alone says that), *setting* for a XCTrack
 * preference, *line* for an entry of the file. The interface speaks **to** the pilot.
 */
const preferences: DomainCatalog<'preferences'> = {
  'preferences.absentKeyOnImport':
    'When importing (“Replace everything”), your device keeps the setting it already ' +
    'has: what the file does not state is left untouched. Measured on the AIR³. On a ' +
    'device that has never touched it, XCTrack’s factory value applies.',

  'preferences.settingCount': {
    one: '{count} setting',
    other: '{count} settings'
  },
  /** Voir `fr/preferences.ts` : message de démonstration du socle, pas de l'écran. */
  'preferences.absentFromFile': {
    one: '{count} line is missing from the file',
    other: '{count} lines are missing from the file'
  },

  'preferences.lineCount': {
    one: '{count} line',
    other: '{count} lines'
  },
  'preferences.characterCount': {
    one: '{count} character',
    other: '{count} characters'
  },

  'preferences.structuredValue': 'structured value, {size}',
  'preferences.emptyList': 'empty list',
  'preferences.listValue': {
    one: 'list of {count} item, {size}',
    other: 'list of {count} items, {size}'
  },
  'preferences.yes': 'Yes',
  'preferences.no': 'No',
  'preferences.noKeyAssigned': 'no key',
  'preferences.emptyValue': '(empty)',
  'preferences.offCatalogue': '{value} (not in the catalogue)',
  'preferences.truncatedValue': '{start}… ({size})',
  'preferences.someStructure': 'a structure',

  'preferences.longPress': 'long press',
  'preferences.shortPress': 'single press',
  /** « key code » plutôt que « code » seul : c'est le terme d'Android, et il lève l'ambiguïté. */
  'preferences.rawCode': 'key code {code}',
  'preferences.codeAndName': 'key code {code}, {name}',

  'preferences.physicalKeyCount': {
    one: '{count} physical key',
    other: '{count} physical keys'
  },
  'preferences.hardwareUnsurveyedUnknownDevice':
    'We have only measured the physical keys on {models}, and this file does not say ' +
    'which device it comes from: this unit is a blind spot. Every binding’s code is read ' +
    'and named above, but we do not know which key emits it.',
  'preferences.hardwareUnsurveyedOtherDevice':
    'We have only measured the physical keys on {models}, and this file comes from ' +
    'another device ({device}): this unit is a blind spot. Every binding’s code is read ' +
    'and named above, but we do not know which key emits it.',
  'preferences.hardwareSurveyed':
    'On {model} — the model this file declares — we have only pressed {keys}: {listed}. ' +
    '{missing} The measurement was made on a single unit, and more recent models carry ' +
    'more keys.',
  'preferences.hardwareDeclaredOne':
    'Code {codes} is none of them; the unit’s kernel declares it all the same, which ' +
    'makes it possible on this hardware without a key press having proved it.',
  'preferences.hardwareDeclaredMany':
    'Codes {codes} are none of them; the unit’s kernel declares them all the same, which ' +
    'makes them possible on this hardware without a key press having proved it.',
  'preferences.hardwareStrangerOne':
    'Code {codes} is none of them, and the unit’s kernel declares it on none of its ' +
    'input devices: we do not know which key emits it.',
  'preferences.hardwareStrangerMany':
    'Codes {codes} are none of them, and the unit’s kernel declares them on none of its ' +
    'input devices: we do not know which keys emit them.',
  'preferences.keyNoteBelow':
    'The note below this block says what these surveys are worth.',
  'preferences.keyFromSurvey':
    '“{label}” is what this key is called on the case, measured by hand on {model}. {name} is the name Android gives code {code}.',
  'preferences.keyFromKernel':
    '{name} is the name Android’s key table gives code {code}. We have not pressed any ' +
    'key emitting it on {model}, but the unit’s kernel declares it on {devices}. The ' +
    'code is therefore possible on this hardware, which does not prove that a button is ' +
    'wired to it.',
  'preferences.keyFromNeither':
    '{name} is the name Android’s key table gives code {code}. We have not pressed any ' +
    'key emitting it on {model}, and the unit’s kernel declares it on none of its input ' +
    'devices: we do not know where it comes from.',
  'preferences.keyFromAndroid':
    '{name} is the name Android’s key table gives code {code}. That table names a code, not a button: it does not say which of your keys emits it, and we have not measured this one by hand.',
  'preferences.keyFromNowhere':
    'Code {code} appears in no key table we have read. No name is given to it here: inventing one would be the worst of services.',
  'preferences.keyInjectionHypothesis':
    'A hypothesis, unverified: an app installed on the device can inject a code without ' +
    'any key emitting it, and the package {addon} is present on this unit. Nothing ' +
    'proves it — only a key press, or reading that app, would settle it.',
  'preferences.intentGloss':
    'An “intent” is the message by which one Android application makes another react. This key therefore does not drive XCTrack: it sends a signal, and it is another application, set up on the device, that answers it.',

  'preferences.keyNamingOrigin':
    'A name in plain words is what the key is called on the case, recorded by pressing it by hand: there are such names only for the models we have had in our hands. A name in KEYCODE_ comes from Android’s key table, which names the code and not the button. A third rung sits between the two: the unit’s kernel declares codes we have never pressed, and a declared code is possible on this hardware without a button necessarily emitting it. A missing name is therefore a missing measurement, never a key that would not exist.',

  'preferences.runtimeDefaultReason':
    'XCTrack fills this list in code and its factory value depends on the language and ' +
    'country of the device: there is nothing to compare.',
  'preferences.unknownSettingReason':
    'This editor does not know this setting: neither its purpose nor its factory value.',
  'preferences.noFactoryValueInCatalogue':
    'The catalogue records no factory value for this setting.',
  'preferences.structuredVsScalar':
    'The value in the file is a structure; the one in the catalogue of factory values is ' +
    'a simple value.',

  'preferences.refusalUnknown':
    'This editor does not know what this line of the file sets: it does not offer to ' +
    'change it. It is kept exactly as it is.',
  'preferences.refusalState':
    'This line records the state of the application, not a setting: it comes back out ' +
    'intact, never rewritten.',
  'preferences.refusalUnlabelled':
    'XCTrack names this setting nowhere we can read: without its label, this editor does ' +
    'not offer to change it.',
  'preferences.refusalStructured':
    'Compound value: this page shows it as it is, without opening it, and never rewrites it.',
  'preferences.refusalAction':
    'On the device, this is done through a dialog — a key to press on the instrument, a ' +
    'table to build — that this page cannot stand in for. The value is still read, and ' +
    'the document comes back out intact.',
  'preferences.refusalNoValue':
    'This is not typed in: the line commands, it does not carry a value.',
  'preferences.refusalNote': {
    one: '{count} setting in this block cannot be set here. {reason}',
    other: '{count} settings in this block cannot be set here. {reason}'
  },

  'preferences.stateCustom': 'set by you',
  'preferences.stateDefault': 'factory value',
  'preferences.stateConflict': 'factory value uncertain',
  'preferences.stateAbsent': 'missing from the file',
  'preferences.stateUnwritten': 'never set',
  'preferences.stateUndecidable': 'nothing to compare',

  'preferences.stateTitleCustomUnknown': 'This value differs from XCTrack’s factory value.',
  'preferences.stateTitleCustom': 'XCTrack’s factory value is “{factory}”.',
  'preferences.stateTitleDefault': 'Value unchanged: this is XCTrack’s factory value.',
  'preferences.stateTitleConflict':
    'XCTrack announces two different factory values for this setting: “{code}” in its ' +
    'code and “{screen}” in its settings screen. This editor does not choose in its ' +
    'stead. Your value, for its part, is the one in the file.',
  'preferences.stateTitleAbsent':
    'This setting is not in the file: the file says nothing about it. {absent}',
  'preferences.stateTitleAbsentWithValue':
    'This setting is not in the file: the file says nothing about it. {absent} It is ' +
    '“{factory}”.',
  'preferences.stateTitleUnwritten':
    'This setting is not in the file, and XCTrack only writes it there once it has been ' +
    'set at least once on the device: its absence says nothing — neither what your device ' +
    'applies, nor what it would apply brand new.',
  'preferences.stateTitleNoFactoryValue': 'No factory value known for this setting.',

  'preferences.editInsertDescription': 'Write {label} into the file',
  'preferences.editSetDescription': 'Set {label}',
  'preferences.removeFromFile': 'Remove {label} from the file',
  'preferences.restoreToFactoryValue': 'Restore {label} to its factory value',

  'preferences.factoryValueUnknown': 'factory value unknown',
  'preferences.factoryValueUnknownTitle':
    'The catalogue records no writable factory value for this setting: this editor has ' +
    'nothing to create it with, and it does not invent one.',
  'preferences.implicitTitle':
    '“{factory}” is XCTrack’s factory value, not a value that has been set: this setting ' +
    'is not in the file. {absent}',
  'preferences.adoptLabel': 'Write this value',
  'preferences.adoptTitle':
    'Writes “{key}”: {factory} into the file.\n\n' +
    'On a device that has never set this, it is already what it applies: writing it ' +
    'changes nothing immediate, and puts the setting beyond the reach of an XCTrack ' +
    'update that would change its factory value.\n\n' +
    'On a device that has already set it, the import will write this value in place of ' +
    'its own: as long as the file says nothing, it keeps its own (measured on the AIR³, ' +
    '“Replace everything” import).',

  'preferences.dropLabel': 'Remove from the file',
  'preferences.dropTitle':
    'Removes “{key}” from the file: it will no longer say anything about this setting.\n\n' +
    '{absent}\n\n' +
    'What it changes for a device that has never touched it: the value stops being ' +
    'pinned and will follow XCTrack updates. It is the exact opposite of “Write this ' +
    'value”.',

  'preferences.restoreLabel': 'Restore the factory value',
  'preferences.restoreTitle':
    'Writes “{key}”: {factory} into the file, in place of {current}.\n\n' +
    'This gesture is not like the other two on this page: they only touch a setting you ' +
    'never chose, this one replaces yours with the one XCTrack puts on a fresh ' +
    'install.{caveat}',
  'preferences.restoreNote':
    '“{factory}” from the factory, “{current}” in this file. Restoring changes what the ' +
    'device does in flight.{caveat}',
  'preferences.restoreCaveatIndicative':
    ' This factory value comes from the catalogue of XCTrack {version}, which is not the ' +
    'version this file comes from: check that it really is the one to restore.',
  'preferences.restoreCaveatUnstated':
    ' This factory value comes from the catalogue of XCTrack {version} and the version of ' +
    'this file is not known here: check that it really is the one to restore.',

  'preferences.unitListNote':
    'This list was measured on {device}, XCTrack {version}: {method}. Be aware: {caveats}.',
  'preferences.freeListTitle':
    'XCTrack fills this list in code: our survey of the releases does not give its values ' +
    'and they have not been measured on the device. This editor therefore offers no ' +
    'choice, and the value is written exactly as you type it.',

  'preferences.summaryCount': 'You have set {custom} of the {settings} XCTrack offers.',

  'preferences.detailDefault': {
    one: '{count} at the factory value',
    other: '{count} at the factory value'
  },
  'preferences.detailAbsent': {
    one: '{count} missing from the file',
    other: '{count} missing from the file'
  },
  'preferences.detailUnwritten': {
    one: '{count} never set',
    other: '{count} never set'
  },
  'preferences.detailUndecidable': {
    one: '{count} with no known factory value',
    other: '{count} with no known factory value'
  },
  'preferences.detailConflict': {
    one: '{count} with an uncertain factory value',
    other: '{count} with an uncertain factory value'
  },
  'preferences.restUnlabelled': {
    one: '{count} unlabelled in the application',
    other: '{count} unlabelled in the application'
  },
  'preferences.restState': {
    one: '{count} remembered by the application',
    other: '{count} remembered by the application'
  },
  'preferences.restUnknown': {
    one: '{count} unknown to this catalogue',
    other: '{count} unknown to this catalogue'
  },

  'preferences.fileCarries': 'This file contains {lines} in all.',
  'preferences.fileCarriesWithRest': {
    one: 'This file contains {lines} in all: {count} matches no setting of any screen on ' +
      'the device — {rest}. It is listed at the end of the page.',
    other: 'This file contains {lines} in all: {count} match no setting of any screen on ' +
      'the device — {rest}. They are listed at the end of the page.'
  },

  'preferences.catalogReference':
    'Labels and factory values extracted from XCTrack {version}',
  'preferences.catalogNoteExact': '{reference} — the very version of this file.{fallback}',
  'preferences.catalogNoteUnstated':
    '{reference}. This file does not say which version it comes from: labels and factory ' +
    'values change from one version to the next, so this reading is indicative.{fallback}',
  'preferences.catalogNoteIndicative':
    '{reference}. This file comes from {file}: labels and factory values change from one ' +
    'version to the next, so this reading is indicative.{fallback}',
  'preferences.catalogFallback': {
    one: ' {count} text is missing in this language and is shown in English.',
    other: ' {count} texts are missing in this language and are shown in English.'
  },
  'preferences.fileVersionNumber': 'version {code}',
  'preferences.fileVersionNamed': 'version {name}',

  'preferences.personalMarkTitle': 'Personal data — {reason} ({basis}).',
  'preferences.privacyNone':
    'No personal data spotted in the preferences of this file',
  'preferences.privacyHead': {
    one: '{count} setting carries personal data · {filled} filled in, {empty} empty',
    other: '{count} settings carry personal data · {filled} filled in, {empty} empty'
  },
  'preferences.privacyLayoutNone':
    'This page only counts the preferences. The layout of this file carries no text ' +
    'written by you — it is the “Save” box that inventories them, and they are the only ' +
    'ones that would leave with a “pages” export.',
  'preferences.privacyLayoutSome': {
    one: 'This page only counts the preferences. The layout carries {count} more — texts ' +
      'written by you in the widgets — and they are the only ones that leave with a ' +
      '“pages” export. The “Save” box shows them one by one.',
    other: 'This page only counts the preferences. The layout carries {count} more — ' +
      'texts written by you in the widgets — and they are the only ones that leave with a ' +
      '“pages” export. The “Save” box shows them one by one.'
  },
  'preferences.privacyItemWhy': '{kind} — {reason}',
  'preferences.privacyNavigationState':
    '“Navigation.State” is a public XCTrack preference: it travels with the file. It ' +
    'carries the task in progress — turnpoints and coordinates — that is {value} here. ' +
    'This page never shows its contents; a file handed on, however, takes it along.',
  'preferences.privacyGuessPosition':
    'XCTrack also keeps a presumed position of the device (“App.GuessLatitude”, ' +
    '“App.GuessLongitude”) — in practice, home. They are internal to the device: no ' +
    'export carries them, and this file does not carry them.',
  'preferences.privacySecureKeys': {
    one: 'XCTrack encrypts account credentials (XContest, SkySight, SafeSky…): the ' +
      '{count} setting concerned never leaves the device, and no export carries it.',
    other: 'XCTrack encrypts account credentials (XContest, SkySight, SafeSky…): the ' +
      '{count} settings concerned never leave the device, and no export carries them.'
  },
  'preferences.privacyJudged': {
    one: 'The {count} line of this file is not flagged by XCTrack itself: the only ' +
      'settings whose sensitivity it declares are the ones it encrypts, and those are not ' +
      'exported. This inventory is therefore a judgement made by this editor, and every ' +
      'line states its own.',
    other: 'None of the {count} lines of this file is flagged by XCTrack itself: the only ' +
      'settings whose sensitivity it declares are the ones it encrypts, and those are not ' +
      'exported. This inventory is therefore a judgement made by this editor, and every ' +
      'line states its own.'
  },
  'preferences.filledPersonal': {
    one: 'You have just filled in {count} piece of personal data — {keys}. It will travel ' +
      'with this file: the “Save” box lets you choose what leaves.',
    other: 'You have just filled in {count} pieces of personal data — {keys}. They will ' +
      'travel with this file: the “Save” box lets you choose what leaves.'
  },

  'preferences.leftoverTitleUnlabelled': 'Settings with no label',
  'preferences.leftoverTitleState': 'What the application has remembered (not settings)',
  'preferences.leftoverTitleUnknown': 'Lines this catalogue does not know',
  'preferences.leftoverLeadUnlabelled':
    'These really are settings, but XCTrack configures them in screens built in code, ' +
    'where the line of the file is no longer attached to its label: the application names ' +
    'them nowhere we can read. The value and the comparison with the factory value remain ' +
    'correct — it is the name that is missing, not the meaning.',
  'preferences.leftoverLeadState':
    'These lines set nothing: they record the state of the application. This page gives ' +
    'their nature and their size, never their contents.',
  'preferences.leftoverLeadUnknown':
    'This editor does not know what these lines set: they were written by a version of ' +
    'XCTrack other than the one the catalogue speaks of. They are neither removable nor ' +
    'negligible — simply unknown, and kept exactly as they are.',
  'preferences.noFamily': '(no family)',

  'preferences.emptyTitle': 'This file carries no general preferences.',
  'preferences.emptyText':
    'Only “backup” exports carry the settings of the application. A “pages” export only ' +
    'describes the pages and their widgets: opening a full backup of the device is the ' +
    'only way to see those settings.',
  'preferences.emptyIntact':
    'Nothing is lost for all that: what this page does not show, this file does not ' +
    'contain, and a re-export will leave it exactly as it is.',
  'preferences.emptyPersonalWarning': {
    one: 'Careful: “no preferences” does not mean “nothing personal”. The layout of this ' +
      'file carries {count} text written by you in its widgets — a title, a name, a phone ' +
      'number —, and a “pages” export takes them along. The “Save” box shows them one by one.',
    other: 'Careful: “no preferences” does not mean “nothing personal”. The layout of this ' +
      'file carries {count} texts written by you in its widgets — a title, a name, a phone ' +
      'number —, and a “pages” export takes them along. The “Save” box shows them one by one.'
  },

  'preferences.pageTitle': 'General settings',
  'preferences.pageSubtitle': 'What XCTrack sets outside the widget pages',
  'preferences.pageSubtitleNamed': '{file} — what XCTrack sets outside the widget pages',
  'preferences.menuLead':
    'The screens are those of the device, in the order of its settings menu.',
  'preferences.menuLeadEditable':
    'The screens are those of the device, in the order of its settings menu. A changed ' +
    'setting is written into the document at once; “Undo” takes it back, and nothing goes ' +
    'to disk before “Save”.',
  'preferences.entryNothing': 'Nothing from this screen appears in this file.',
  'preferences.neverExported': {
    one: '{count} setting on this screen never leaves the device: XCTrack does not export it.',
    other: '{count} settings on this screen never leave the device: XCTrack does not ' +
      'export them.'
  },

  'preferences.tallyNone':
    'This file carries {lines} of them: none has a label, all are listed at the end of ' +
    'the page under their raw name.',
  'preferences.tallySome':
    'This file carries {lines} of them, of which {named}; {listed} at the end of the page ' +
    'under their raw name.',
  'preferences.tallyNamed': {
    one: 'a single one has a label and is shown on another screen',
    other: '{count} have a label and are shown on another screen'
  },
  'preferences.tallyListed': {
    one: '{count} is listed',
    other: '{count} are listed'
  },

  'preferences.menuNoteAirspaces':
    'XCTrack builds this screen in code: the setting is laid out far from its label, and ' +
    'the application therefore names it nowhere we can read. The settings it writes really ' +
    'are in the file — they are gathered further down, under “Settings with no label” and ' +
    '“What the application has remembered”.',
  'preferences.menuNoteMaps':
    'A screen built in code as well, likewise without a usable label. The “Mapsforge” ' +
    'lines of the file are gathered further down.',
  'preferences.menuNoteEditPageSet':
    'This line opens the editor for pages and widgets — it is the rest of this editor ' +
    'that shows them, not this page.',
  'preferences.menuNoteEventMapping':
    'Automatic actions are recorded as a block in “EventMappingJs”: a small program ' +
    'written in one go, not a list of settings.',
  'preferences.menuNotePro':
    'The subscription is managed on the XContest account, not in the configuration file.',
  'preferences.menuNoteSensors':
    'This screen is used to pair the sensors. What it records fits on a single line, ' +
    '“Sensors.Configuration”, gathered further down with the rest of what the application ' +
    'has remembered.',
  'preferences.menuNoteShareConfig':
    'This screen only carries two commands — export, import a configuration. It has no ' +
    'setting to remember.',
  'preferences.menuNoteAbout':
    'This screen only displays information about the application: version, changelog, ' +
    'credits. Nothing that can be set.',
  'preferences.menuNoteInfoOnly': 'An information line, with no setting.',

  'preferences.filterPlaceholder': 'Filter the settings',
  'preferences.onlyMine': 'Only what I have set',
  'preferences.showAll': 'Show everything',
  'preferences.maskPersonal': 'Hide personal values',
  'preferences.showPersonal': 'Show personal values',
  'preferences.close': 'Close'
}

export default preferences
