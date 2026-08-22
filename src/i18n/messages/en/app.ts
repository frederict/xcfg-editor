import type { DomainCatalog } from '../../domains'

const app: DomainCatalog<'app'> = {
  'action.redo': 'Redo',
  'action.redoNothing': 'Nothing to redo',
  'action.redoNamed': 'Redo: {what}',

  'zoom.resetTo': 'Zoom {level}',
  'zoom.label': 'Zoom',

  'pageKind.free': 'Blank page',
  'pageKind.freeNote': 'Created empty on the instrument, ready for your own widgets.',
  'pageKind.competition': 'Competition page',
  'pageKind.competitionNote': 'Created with the instrument’s competition widget set.',
  'pageKind.thermalAssistant': 'Thermal assistant page',
  'pageKind.thermalAssistantNote': 'Created with the thermal assistant widget set. This is ' +
    'the page class the automatic switch to thermalling aims at.',
  'pageKind.xcAssistant': 'XC assistant page',
  'pageKind.xcAssistantNote': 'Created with the widget set for FAI triangles and routes.',
  'pageKind.unknown': 'Unrecognised page type',
  'pageKind.unknownNote': 'This editor has no description for this page type; its contents ' +
    'are still shown as they are.',

  'pageKind.missing': '(no type)',

  'view.landscape': 'Landscape',
  'view.portrait': 'Portrait',

  'view.pageCard': 'Page {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} page',
    other: '{count} pages'
  },

  'view.noPage': 'no page',
  'view.emptyOrientation': 'This file describes no page in this orientation.',

  'view.remarkCount': {
    one: '{count} remark about this file',
    other: '{count} remarks about this file'
  },

  'view.backToOverview': '← All pages',

  'view.enableAllNavigations': 'Enable for all navigations',

  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Previous page',
  'view.nextPage': 'Next page',

  'view.position': '{index} / {total}',

  'view.rulerCentimeters': '{value} cm',

  'view.pointHint': 'Point at a widget, with a finger or the mouse, for its name and size.',
  'view.pointHintSelectable': 'Point at a widget, with a finger or the mouse, for its name ' +
    'and size; pick it to see its settings.',

  'view.selectedPin': 'selected',

  'view.widgetSpoken': '{name}, {width} by {height} millimetres',

  'view.scaleAdvice': 'The page is drawn at the size it has on the instrument. Your screen ' +
    'may not have the pixel density the browser assumes: adjust the zoom until a real ruler ' +
    'held against the screen matches the scale.',

  'editor.moveNamed': 'Move {name}',
  'editor.resizeNamed': 'Resize {name}',
  'editor.deleteNamed': 'Delete {name}',
  'editor.duplicateNamed': 'Duplicate {name}',
  'editor.raiseNamed': 'Bring {name} forward',
  'editor.lowerNamed': 'Send {name} backward',
  'editor.frontNamed': 'Bring {name} to the front',
  'editor.backNamed': 'Send {name} to the back',

  'editor.onlyWidget': 'Only widget on the page',
  'editor.rank': 'Layer {index} of {total}',
  'editor.rankFront': 'Layer {index} of {total}, frontmost',
  'editor.rankBack': 'Layer {index} of {total}, backmost',

  'editor.layerLabel': 'Page editing: arrow keys to move, Shift + arrows to resize, ' +
    'Ctrl + up/down arrows to change layer, Ctrl + D to duplicate, Delete to remove',
  'editor.toolbarLabel': 'Actions on the selected widget',

  'editor.toolTitle': '{label} ({keys})',

  'editor.sendToBack': 'Send to the back',
  'editor.sendToBackKeys': 'Ctrl + Shift + Down arrow',
  'editor.lowerOne': 'Send back one layer',
  'editor.lowerOneKeys': 'Ctrl + Down arrow',
  'editor.raiseOne': 'Bring forward one layer',
  'editor.raiseOneKeys': 'Ctrl + Up arrow',
  'editor.bringToFront': 'Bring to the front',
  'editor.bringToFrontKeys': 'Ctrl + Shift + Up arrow',
  'editor.duplicate': 'Duplicate',
  'editor.duplicateWidget': 'Duplicate the widget',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Delete',
  'editor.deleteWidget': 'Delete the widget',
  'editor.deleteKeys': 'Delete',

  'editor.noSelection': 'No widget selected.',
  'editor.selected': '{name} selected, {size}.',

  'editor.emptyPage': 'Empty page',
  'editor.pageTally': {
    one: '{count} widget on the page',
    other: '{count} widgets on the page'
  },

  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what}: {size}.',

  'editor.nothingToChange': '{rank}, nothing to change.',

  'app.name': 'XCTrack Configuration',

  'app.editingRole': 'editing',
  'app.editingBadge': 'Editing',

  'app.dropVeil': 'Drop the file to open it',

  'app.settings': 'Settings',
  'app.settingsHint': 'General settings — everything set outside the widget pages: units, ' +
    'buttons, sensors, sound, airspaces.',

  'menu.file': 'File',
  'menu.openFile': 'Open a file…',
  'menu.openFileHint': 'Pick an .xcfg or .xczfg exported from the instrument. The file stays ' +
    'on this machine.',
  'menu.library': 'Library…',
  'menu.libraryHint': 'Keep the open configuration under a name, and find the ones already ' +
    'kept. Everything stays in this browser: no server, no account.',
  'menu.version': 'Version and compatibility…',
  'menu.versionHint': 'Pick the XCTrack version you are aiming at, and see what this file ' +
    'carries that it does not know — or the other way round.',
  'menu.manual': 'User manual…',
  'menu.manualHint': 'How to get the file off the instrument, how to prepare your pages, and ' +
    'what you must never share.',

  'app.saveCopy': 'Save a copy',
  'app.saveChanges': 'Save the changes',

  'app.editPages': 'Edit the pages',
  'app.editPagesHint': 'Edit the pages — move, resize and add widgets.',
  'app.editSettings': 'Edit the settings',
  'app.editSettingsHint': 'Edit the settings — change the values of the general settings.',
  'app.inspect': 'View only',
  'app.inspectHint': 'View only — leave editing mode. Nothing is undone.',

  'action.undoNothing': 'Nothing to undo',
  'action.undoNamed': 'Undo: {what}',

  'landing.title': 'Set up your XCTrack pages before you fly',
  'landing.lead': 'Open an .xcfg or .xczfg file exported from the instrument: its pages ' +
    'appear just as the device draws them, at their real size. Move a widget, resize it, add ' +
    'more, then take away a fresh copy to put back on the SD card.',

  'landing.privacy': 'Your file never leaves this machine: everything happens in this ' +
    'browser, with no server and no account. And whatever you have not touched comes back ' +
    'exactly as it went in, without a single comma rewritten — your settings stay yours.',

  'landing.dropHere': 'Drop your file here',
  'landing.dropOrPick': 'or click to pick it — .xcfg or .xczfg',

  'landing.stepDeviceTitle': 'On the instrument',
  'landing.stepDeviceText': '“Preferences”, “Export & import config”, then “Export ' +
    'configuration”. The file lands on the SD card.',
  'landing.stepHereTitle': 'Here',
  'landing.stepHereText': 'The pages appear numbered in the order “next page” scrolls through ' +
    'them in flight.',
  'landing.stepEditTitle': 'Editing',
  'landing.stepEditText': 'Move a widget with your finger or the mouse, change its size, add ' +
    'others: the page is redrawn at its real size in front of you.',
  'landing.stepKnowTitle': 'Worth knowing',
  'landing.stepKnowText': 'A page’s type is not what decides when the device shows it in ' +
    'flight — a separate setting does, and this editor spells that out for you, page by page.',

  'landing.returning': 'Been here before? The configurations you kept are in the “File” menu, ' +
    'top right, under “Library”: they have never left this browser.',
  'landing.manualLead': 'First time here? The manual says what this tool does, what has been measured on the device, and what a configuration file reveals about you.',
  'landing.readManual': 'Read the user manual',

  'app.uiLanguage': 'Interface language',
  'app.uiLanguageNamed': 'Interface language: {name}',
  'app.uiLanguageHint': 'Choose the language of this interface. XCTrack labels follow the open file.',
  'app.uiLanguageLead': 'The words of this interface: headings, explanations, warnings. The choice is remembered by this browser.',
  'app.labelsAxisLead': 'The names of widgets, options and settings, as your instrument shows them. They come from the open file; when it declares none, they follow the language chosen above.',
  'app.languageDialogTitle': 'Languages',
  'app.languageFailedTitle': 'The language could not be loaded',

  'app.metaFormat': 'Format',
  'app.containerArchive': '.xczfg archive',
  'app.containerPlain': '.xcfg file',
  'app.metaDevice': 'Device named by the file',
  'app.notDeclared': 'not declared',
  'app.metaLabels': 'XCTrack labels',
  'app.labelsFromBrowser': '{language} (browser language)',
  'app.labelsFromUi': '{language} (interface language)',
  'app.labelsFromFile': '{language} (declared by the file)',
  'app.metaRenderSettings': 'Drawing settings',
  'app.renderSettingsAssumed': 'assumed values, absent from the file',

  'app.overviewTitle': 'Pages of the configuration',

  'app.seeDetail': {
    one: 'See the detail ({count})',
    other: 'See the details ({count})'
  },
  'app.attentionTitle': 'Worth checking in this file',
  'app.revealsTitle': 'What this file reveals about you',

  'app.editModeNote': 'Editing mode: open a page to add widgets to it, move them and set ' +
    'their options. The pages themselves — adding, duplicating, deleting, reordering — are ' +
    'managed here.',

  'dock.settingCount': {
    one: '{count} setting',
    other: '{count} settings'
  },
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} changed by you',
    other: '{count} changed by you'
  },

  'dock.label': 'Widgets on the page, and settings of the selected widget',
  'dock.labelReadOnly': 'Widgets on the page, and settings of the selected widget, read-only',

  'dock.gripLabel': 'Height of the settings panel',
  'dock.gripHint': 'Drag to change the height of the panel — on the keyboard, up and down ' +
    'arrows, Page Up and Page Down for wide steps, Home and End for the extremes.',
  'dock.heightPixels': {
    one: '{count} pixel',
    other: '{count} pixels'
  },

  'dock.widgetList': 'Widget list',
  'dock.expandSettings': 'Unfold the settings',
  'dock.collapse': 'Fold away',
  'dock.showList': 'Show the list',
  'dock.hideList': 'Hide the list',

  'dock.noSelection': 'No widget selected',
  'dock.selectionRank': '{name} — layer {index} of {total}',
  'dock.chooseWidget': 'Pick a widget to see its settings',
  'dock.hintEditing': 'Click a widget on the page: its settings appear here, in the order the ' +
    'instrument presents them.',
  'dock.hintInspecting': 'Click a widget on the page — or pick it from the list — to read its ' +
    'settings. Nothing can be changed here: this is the viewing mode.',
  'dock.loadingSettings': 'Loading the settings…',

  'app.addWidget': 'Add a widget',
  'app.managePages': 'Manage the pages',
  'app.gridSize': 'Grid {cols} × {rows}',
  'app.editKeysHint': 'Drag: move · corners and edges: resize · arrows: one cell · ' +
    'Shift + arrows: resize · Ctrl + arrows: change layer · Ctrl + D: duplicate · ' +
    'Delete: remove · Escape: deselect',

  'app.setSettingNamed': 'Set {label} — {name}',

  'app.pageHasNoWidgetSlot': 'This page has no place to put widgets. This tool cannot create ' +
    'one: it never invents anything the file does not already carry.',

  'app.managePagesLead': 'Add, duplicate, delete, reorder. Every operation is recorded: ' +
    '“Undo” takes it back like the rest. A page’s class, on the other hand, is not offered ' +
    'for change — XCTrack fixes it at creation, and the effect of changing it afterwards has ' +
    'not been checked on the device.',

  'app.pageOperationFailed': 'This change could not be made: your pages have not moved. ' +
    'Technical detail: {detail}',

  'app.repository': 'The project on GitHub — report a problem, suggest an improvement',
  'app.manualTitle': 'User manual',
  'app.close': 'Close',
  'app.loading': 'Loading…',

  'app.technicalDetail': 'Technical detail',

  'app.loadingSettingsPage': 'Loading the general settings…',
  'app.settingsFailedTitle': 'The general settings could not be opened',
  'app.settingsFailedMessage': 'The list of settings XCTrack offers could not be loaded.',
  'app.fileNotAtFault': 'The file itself is not at fault: it stays open and intact.',
  'app.backToPages': 'Back to the pages',

  'app.manualBack': 'Close the manual',
  'app.manualToc': 'Contents',
  'app.loadingManual': 'Loading the manual…',
  'app.manualFailedMessage': 'Nothing in your file has changed. Try again.',
  'app.manualFailedTitle': 'The manual could not be opened',
  'app.fileUntouchedRetry': 'Your file has not moved. Try again.',

  'app.versionDialogTitle': 'Target version and compatibility',
  'app.versionLead': 'The XCTrack format changes with every version. Pick the version you ' +
    'are aiming at: the editor then says what this file carries that the version does not ' +
    'know, and what it expects that the file does not have. This is an observation: nothing ' +
    'moves until you ask for it.',
  'app.loadingVersions': 'Loading the version database…',
  'app.versionFailedTitle': 'The version report could not be opened',
  'app.versionFailedMessage': 'The list of XCTrack versions could not be loaded.',

  'app.libraryFailedTitle': 'The library could not be opened',
  'app.libraryFailedMessage': 'Your browser did not give this tool access to its storage. The ' +
    'open file has not moved.',

  'app.exportDialogFailedTitle': 'The save dialog could not be opened',
  'app.exportDialogFailedMessage': 'Nothing has been saved and your file has not moved. Try again.',

  'app.exportHandedOver': '“{name}” ({size}) — this tool has asked your browser to save it.',
  'app.exportWhereToLook': 'Look for it among your downloads — this page cannot see what ' +
    'happens there. If it is not there, allow downloads for this site, then start again.',
  'app.exportReceiptDismiss': 'Dismiss this save receipt',

  'app.exportFailedTitle': 'The file could not be produced',
  'app.exportFailedMessage': 'Nothing came out of this tool, and your configuration has not ' +
    'moved. Try again.',

  'app.openFailedTitle': 'This file could not be opened',
  'app.openFailedMessage': 'This tool could make nothing of it. The file itself has not been ' +
    'changed.',
  'app.openFailedHint': 'Check that it really is an XCTrack export (.xcfg or .xczfg). You can ' +
    'drop another file anywhere on this page, or pick one from the “File” menu, top right.',

  'app.unreadableTitle': 'This file could not be read',
  'app.unreadableMessage': 'Check that this is the .xcfg or .xczfg file produced on the ' +
    'instrument by “Preferences”, “Export & import config”, then “Export configuration”, and ' +
    'that it is complete.',
  'app.unreadableHint': 'Its bytes are kept intact: “Save a copy” gives it back exactly as it ' +
    'went in, without the slightest rewrite.',
  'app.unreadableIncoming': '“{incoming}” gave nothing usable. “{kept}” stays open, and ' +
    'everything you changed in it is still there.',

  'app.unsavedTitle': 'Your changes are not saved',
  'app.replaceMessage': 'Opening “{incoming}” closes “{kept}” and everything you have just ' +
    'changed in it. This tool keeps nothing of its own: whatever is not saved is lost.',
  'app.lastChange': 'Most recent change: “{change}”.',
  'app.replaceHint': 'To lose nothing: keep your changes, then “Save the changes” at the top ' +
    'of the page — or put this configuration away in the library.',
  'app.replaceAndLose': 'Open “{incoming}” and lose them',
  'app.keepChanges': 'Keep my changes'
}

export default app
