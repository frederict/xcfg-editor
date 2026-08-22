import type { DomainCatalog } from '../../domains'

/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — see `fr/widgets.ts` for the two
 * language axes: our prose is translated here, the XCTrack labels that arrive through
 * `{name}`, `{label}` and `{value}` never are.
 *
 * *widget* and never *gadget*: that is the word XCTrack's own English chrome uses, on all
 * 55 surveyed versions. French is the only one of the five that says « gadget ».
 *
 * English also has to split what French writes with a single word: « valeur d'usine »
 * becomes *factory value* — never *default*, which would read as *the value that applies
 * when nothing else does*, a different statement from *what the manufacturer set*.
 */
const widgets: DomainCatalog<'widgets'> = {
  /* ==================================================== properties.ts — the header */

  'properties.widgetTitle': 'Widget: {name}',

  'properties.settingCount': {
    one: '{count} setting',
    other: '{count} settings'
  },

  'properties.filterSettings': 'Filter the settings',

  /* --------------------------------------------- comparison against the factory survey */

  'properties.noSurveyForType':
    'The factory value catalogue does not describe this type of widget: nothing to compare.',

  'properties.nothingCustomized':
    'No setting differs from what XCTrack puts on a new widget ({compared} compared).',

  'properties.customizedRatio': {
    one: '{count} customized setting out of {compared}.',
    other: '{count} customized settings out of {compared}.'
  },
  'properties.comparedCount': {
    one: '{count} compared',
    other: '{count} compared'
  },

  'properties.onlyDifferent': 'Only what differs',
  'properties.showEverything': 'Show everything',

  /* ------------------------------------------ where the survey comes from, and its worth */

  'properties.surveyReference':
    'Factory values surveyed on XCTrack {version} (versionCode {code})',
  'properties.fileVersionNamed': 'version {name} (versionCode {code})',
  'properties.fileVersionCoded': 'version {code}',

  'properties.surveyExact': '{survey} — the very version this file comes from.',
  'properties.surveyUnstated':
    '{survey}. This file does not say which version it comes from: factory values change from one version to the next, so the comparison is indicative only.',
  'properties.surveyOther':
    '{survey}. This file comes from {which}: factory values change from one version to the next, so the comparison is indicative only.',

  'properties.surveyKeysAbsent': {
    one: '{count} setting from the survey is not written in this widget ({keys}): XCTrack applies its own value to it, stated at the end of the panel.',
    other: '{count} settings from the survey are not written in this widget ({keys}): XCTrack applies its own value to them, stated at the end of the panel.'
  },

  /* ---------------------------------- the closing block: keys the file does not write */

  'properties.absentTitle': {
    one: '{count} setting this widget does not write',
    other: '{count} settings this widget does not write'
  },

  'properties.absentApplied':
    'These settings are not written in the file: XCTrack applies the value from its own ' +
    'code, the one stated alongside. That is not the same thing as a setting deliberately ' +
    'put at that value.',
  'properties.absentUnstated':
    '{survey}; the version of this file is not known here. Factory values change from one version to the next: what your device applies may therefore differ from what is written here.',
  'properties.absentOther':
    '{survey}, and this file comes from {which}: a factory value may have changed between the two, and what your device applies may differ from what is written here.',
  'properties.absentGesture':
    'Setting them changes nothing about what the device does today — it freezes the value, ' +
    'which will no longer move the day a XCTrack update changes that factory value.',

  'properties.appliedValue':
    'This setting is not in the file: XCTrack will apply “{value}”, its factory value. That is not the same thing as a value deliberately put at that value.',

  'properties.compositeFactoryValue': 'compound factory value',
  'properties.compositeFactoryValueHelp':
    'The catalogue describes this setting with a compound value: this editor only writes ' +
    'simple values, and it does not invent one to stand in. The setting stays editable once ' +
    'XCTrack has written it itself.',

  /* ------------------------------------------------ the first gesture: set the value */

  'properties.setValue': 'Set this value',
  'properties.setValueAria': 'Set {label} in the file',
  'properties.setValueHelp':
    'Writes “{key}”: {value} in the file.\n\nYour device already behaves this way today — writing the value therefore changes nothing about what it does now. What it changes is for later: as long as the line is absent, the device follows the factory value of the installed version of XCTrack, and an update that changes it will change your setting without asking you. Once written, the value is frozen: it will stay that one.',
  'properties.setCaveatOtherVersion':
    'This factory value was surveyed on XCTrack {version}, which is not the version this file comes from: check that it really is the value to freeze.',
  'properties.setCaveatUnknownVersion':
    'This factory value was surveyed on XCTrack {version} and the version of this file is not known here: check that it really is the value to freeze.',

  /* ------------------------------------------------------ saying a value in plain words */

  'properties.yes': 'Yes',
  'properties.no': 'No',
  'properties.emptyValue': '(empty)',
  'properties.outOfCatalogValue': '{value} (outside the catalogue)',

  /* -------------------------------------------------------- the origin mark of a row */

  'properties.setByYou': 'set by you',
  'properties.setByYouFactory': 'set by you · factory: {value}',
  'properties.setByYouHelp':
    'This value differs from what XCTrack writes on a new widget of this type.',
  'properties.setByYouHelpValue':
    'On a new widget of this type, XCTrack writes “{value}”.',

  'properties.factoryValue': 'factory value',
  'properties.factoryValueHelp':
    'Value unchanged: this is what XCTrack writes on a new widget of this type.',
  'properties.factoryValueUnknown': 'factory value unknown',
  'properties.factoryValueUnknownHelp':
    'The factory value catalogue does not describe this setting — a universal setting ' +
    'written by hand during the survey, a setting that has appeared since, or a value that ' +
    'cannot be compared. Nothing is claimed about this row.',

  /* ------------------------------------- the third gesture: restore the factory value */

  'properties.restoreFactoryValue': 'Restore the factory value',
  'properties.restoreAria': 'Restore {label} to its factory value',
  'properties.restoreHelp':
    'Writes “{path}”: {factory} in the file, in place of {current}.\n\nThis gesture is not like “Set this value” at the end of the panel: that one leaves the device behaving exactly as it does today, this one does not. It replaces a setting you chose with the one XCTrack puts on a new widget of this type.',
  'properties.restoreNote':
    '“{factory}” from the factory, “{current}” in this file. Restoring changes what the device does in flight.',
  'properties.restoreCaveatOtherVersion':
    'This factory value was surveyed on XCTrack {version}, which is not the version this file comes from: check that it really is the one to restore.',
  'properties.restoreCaveatUnknownVersion':
    'This factory value was surveyed on XCTrack {version} and the version of this file is not known here: check that it really is the one to restore.',

  /* ------------------------------------------------------------------ a row of the panel */

  'properties.outOfCatalogSetting': 'setting outside the catalogue',
  'properties.outOfCatalogSettingHelp':
    '“{path}” is not described by the catalogue: this tool guesses the control from the type of the value.',
  'properties.helpAria': 'Help about this setting',
  'properties.readOnlyValue': 'Value not editable here; it is kept exactly as it is.',

  /* --------------------------------------------- the units the catalogue leaves bare */

  'properties.unitSystem': 'same as the general settings',
  'properties.unitMeter': 'meters (m)',
  'properties.unitFoot': 'feet (ft)',
  'properties.unitYard': 'yards (yd)',
  'properties.unitKmPerHour': 'kilometers per hour (km/h)',
  'properties.unitMetersPerSecond': 'meters per second (m/s)',
  'properties.unitMilesPerHour': 'miles per hour (mph)',
  'properties.unitKnot': 'knots (kt)',
  'properties.unitCelsius': 'degrees Celsius (°C)',
  'properties.unitFahrenheit': 'degrees Fahrenheit (°F)',
  'properties.coordDegrees': 'decimal degrees',
  'properties.coordDegreesMinutes': 'degrees and minutes',
  'properties.coordDegreesMinutesSeconds': 'degrees, minutes and seconds',
  'properties.coordUtm': 'UTM',

  /* ================================================ widgetPalette.ts — the add palette */

  'palette.title': 'Add a widget',
  'palette.typeCount': {
    one: '{count} type',
    other: '{count} types'
  },
  'palette.notOffered': 'Present in the file, not offered by XCTrack',

  'palette.search': 'Search for a widget',
  'palette.searchAria': 'Search for a widget by its name, or by the name it carries in the file',

  'palette.onlyPresent': 'Already in the file ({count})',
  'palette.onlyPresentHelp':
    'These types will be copied from a widget XCTrack wrote itself: all their settings are ' +
    'kept, including the ones this editor cannot present.',
  'palette.legend':
    'Solid edge: the widget will be copied from a copy already present in the file, with all ' +
    'its settings. Dotted edge: it will be created with its basic settings only, XCTrack ' +
    'adding the others when it reads the file. In both cases the thumbnail shows what the ' +
    'click will put down.',
  'palette.noMatch': 'No widget carries that name.',

  /* ------------------------------------------------ what the thumbnail can show */

  'palette.previewDrawn':
    'Preview drawn by the editor from the settings of the widget. The values shown are ' +
    'fixed examples: nothing is computed from a flight.',
  'palette.previewGeneric':
    'This editor has no dedicated drawing for this type: the thumbnail shows its title and ' +
    'a dash in place of the value. On the device, it will show its flight data.',
  'palette.previewBlank':
    'This type paints nothing at rest on the device: the thumbnail is empty because the ' +
    'screen is empty too, as long as no message has arrived.',

  'palette.nothingAtRest': 'nothing at rest',
  'palette.notDrawn': 'preview not drawn',

  /* ------------------------------------------------------------- the marks of a row */

  'palette.pro': 'Pro',
  'palette.proHelp': 'XCTrack reserves this widget for the Pro licence.',
  'palette.hereOnce': 'already here',
  'palette.hereCount': 'already here × {count}',
  'palette.hereOnceHelp': 'This type is already on the page shown.',
  'palette.hereCountHelp': {
    one: '{count} copy of this type is already on the page shown.',
    other: '{count} copies of this type are already on the page shown.'
  },
  'palette.elsewhere': 'elsewhere',
  'palette.elsewhereHelp': {
    one: 'Absent from this page, but present {count} time elsewhere in the file: the copy will start from that widget, with its settings.',
    other: 'Absent from this page, but present {count} times elsewhere in the file: the copy will start from that widget, with its settings.'
  },

  /* --------------------------------------------- the label read by assistive technology */

  'palette.spokenPro': 'Pro licence',
  'palette.spokenHereOnce': 'already on this page',
  'palette.spokenHereCount': {
    one: 'already {count} time on this page',
    other: 'already {count} times on this page'
  },
  'palette.spokenCopyFromPage': 'will be copied with the settings of the widget on this page',
  'palette.spokenCopyFromElsewhere':
    'will be copied with the settings of a widget on another page',
  'palette.spokenCreate': 'will be created with its basic settings only',

  /* ---------------------------------------------------- the sentence of the undo history */

  'palette.addCopyFromPage': 'Add “{name}” — copy of a widget on this page',
  'palette.addCopyFromElsewhere': 'Add “{name}” — copy of a widget on another page',
  'palette.addNew': 'Add “{name}” — new widget, settings left to XCTrack',

  /* ============================================= widgetList.ts — the widgets of the page */

  'widgets.listTitle': 'Widgets on the page',
  'widgets.listAria': 'Widgets on the page, from the back to the front',
  'widgets.emptyPage': 'This page carries no widget.',
  'widgets.rankBack': 'Rank 1 · at the back',
  'widgets.rankFront': 'Rank {rank} · at the front',

  'widgets.unreachableHere': 'unreachable here',
  'widgets.unreachableHereHelp':
    'In this editor, no click on the page can reach this widget: the ranks above cover it ' +
    'entirely, and this list is the only path to it. On the instrument it stays in place — ' +
    'an action button covered this way still answers to the finger.',
  'widgets.nothingAtRestHelp':
    'On the device, this type paints nothing at rest. It still takes up its place and ' +
    'intercepts clicks like any other widget.',

  'widgets.unreachableCount': {
    one: '{count} unreachable in the editor',
    other: '{count} unreachable in the editor'
  },
  'widgets.unreachableCountHelp':
    'These widgets are entirely covered by ranks above them: here, no click on the page ' +
    'reaches them, and this list is the only path to them. On the instrument they stay in ' +
    'place — an action button covered this way still answers to the finger.',

  'widgets.spokenRank': 'Rank {rank} of {total}',
  'widgets.spokenSize': '{width} by {height} millimeters',
  'widgets.spokenUnreachable': 'unreachable by click in this editor',
  'widgets.spokenNothingAtRest': 'draws nothing on the device'
}

export default widgets
