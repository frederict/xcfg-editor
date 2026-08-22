import type { DomainCatalog } from '../../domains'

/**
 * The five `pages.describe*` sentences are read twice: once in the page carousel, once —
 * out of context — as the label of the undo button. They are written as bare imperatives
 * so that “Undo: ” reads straight into them, and they always name the rank and the
 * orientation, because a page has no other identity and the two carousels share one
 * history.
 */
const pages: DomainCatalog<'pages'> = {
  /* ==================================================== `deviceSelector.ts` */

  'device.screenSize': '{width} × {height}',

  'device.templateLabel': 'Screen template',

  'device.commonRatiosGroup': 'Common ratios',
  'device.customGroup': 'My devices',

  'device.addDevice': 'Add a device…',

  'device.widthPx': 'Width (px)',
  'device.heightPx': 'Height (px)',
  'device.diagonalInches': 'Diagonal (inches)',

  'device.note': '{diagonal} · {width} × {height} px — geometry depends on the ratio alone, perceived size on the diagonal alone. This choice is never written to the file.',

  'device.namePlaceholder': 'Device name',
  'device.widthPlaceholder': 'Width px',
  'device.widthLabel': 'Width in pixels',
  'device.heightPlaceholder': 'Height px',
  'device.heightLabel': 'Height in pixels',
  'device.diagonalPlaceholder': 'Diagonal ″',
  'device.diagonalLabel': 'Diagonal in inches',
  'device.add': 'Add',
  'device.cancel': 'Cancel',

  'device.nameRequired': 'Give this device a name.',
  'device.sizeMustBePositive': 'Width and height must be positive pixel counts.',
  'device.diagonalMustBePositive': 'The diagonal must be a positive number of inches.',

  /* ==================================================== orientations */

  'pages.landscape': 'Landscape',
  'pages.portrait': 'Portrait',
  'pages.landscapeInline': 'landscape',
  'pages.portraitInline': 'portrait',

  /* ==================================================== history steps */

  'pages.describeInsert': 'Insert a “{type}” page at position {rank} ({orientation})',
  'pages.describeDuplicate': 'Duplicate page {rank} to position {target} ({orientation})',
  'pages.describeRemove': 'Delete page {rank} ({orientation})',
  'pages.describeReorder': 'Move page {rank} to position {target} ({orientation})',
  'pages.describeSetClass': 'Change the type of page {rank}: “{before}” → “{after}” ({orientation})',

  'pages.announcement': '{done}.',
  'pages.announcementWithAdvice': '{done}. {advice}',

  'pages.rankRange': '{first} to {last}',

  /* ==================================================== consequences */

  'pages.rankIsIdentity': 'A page has no name but its position: it is the position you ' +
    'page through in flight.',

  'pages.rankShift': {
    one: 'Page {from} becomes page {to}. {identity}',
    other: 'Pages {from} become pages {to}. {identity}'
  },

  'pages.rankShiftReorder': 'Pages {range} change position. {identity}',

  'pages.thermalAlreadyPresent': {
    one: 'This file already describes a thermal assistant page (page {ranks}). XCTrack targets only one of them when it switches to spiral on its own; this editor assumes the LAST one, without having checked it on the device. If that is indeed the one, creating another after it takes that switch away from page {last}, without changing anything in its contents.',
    other: 'This file already describes thermal assistant pages (pages {ranks}). XCTrack targets only one of them when it switches to spiral on its own; this editor assumes the LAST one, without having checked it on the device. If that is indeed the one, creating another after it takes that switch away from page {last}, without changing anything in its contents.'
  },

  'pages.lastPageOfOrientation': 'This is the last page of this orientation: the file ' +
    'would describe none at all.',

  'pages.noNavigablePageLeft': 'Only pages enabled for no navigation would be left: ' +
    'whichever navigation is chosen, the device would have no page left to show in this ' +
    'orientation.',

  'pages.onlyThermalPage': 'This is the only thermal assistant page: the automatic switch ' +
    'to spiral would have no target left.',

  'pages.autoSwitchWouldTarget': 'The automatic switch to spiral would then target page {rank}, if the last one is indeed the one it targets — this editor assumes so without having checked.',

  'pages.classChangeUnverified': 'XCTrack does not allow the type of a page to be changed ' +
    'after it is created: it is fixed at the moment of the choice. It is nothing but a ' +
    'line in the file, though, and this editor writes it willingly — but how the device ' +
    'behaves with a page changed this way has NOT been checked, and the widgets on the ' +
    'page are not replaced by those of the new type.',

  'pages.thermalMultiple': {
    one: '{total} thermal assistant pages (pages {ranks}). XCTrack targets only one of them when it switches to spiral on its own; this editor assumes the last one, page {target}, without having checked it on the device. Page {others} remains reachable through “next page” in any case.',
    other: '{total} thermal assistant pages (pages {ranks}). XCTrack targets only one of them when it switches to spiral on its own; this editor assumes the last one, page {target}, without having checked it on the device. Pages {others} remain reachable through “next page” in any case.'
  },

  'pages.allPagesWithoutNavigation': 'Every page of this orientation is enabled for no ' +
    'navigation: whichever navigation is chosen, the device has no page to show here.',

  /* ==================================================== the carousel */

  'pages.regionLabel': '{orientation} pages',
  'pages.noPage': 'no page',
  'pages.pageCount': { one: '{count} page', other: '{count} pages' },

  'pages.emptyOrientation': 'This orientation describes no page. A new page comes up ' +
    'empty: its widgets are then dropped in from the palette, or by duplicating an ' +
    'existing page.',

  'pages.insertAtRank': 'Insert a page at position {rank}',
  'pages.insertAtEnd': 'Insert a page at the last position ({rank})',
  'pages.newPageAtRank': 'New page at position {rank}',

  'pages.openPage': 'Open page {rank}, {kind}, {tally}',

  'pages.autoSwitchTargetHere': 'Assumed target of the automatic switch to spiral — not ' +
    'checked on the device.',
  'pages.autoSwitchTargetElsewhere': 'This editor assumes the automatic switch targets page {rank}, the last thermal assistant page — not checked on the device.',

  'pages.moveBack': 'Move page {rank} back one position',
  'pages.moveForward': 'Move page {rank} forward one position',
  'pages.duplicate': 'Duplicate',
  'pages.duplicatePage': 'Duplicate page {rank}',
  'pages.remove': 'Delete',
  'pages.removePage': 'Delete page {rank}',
  'pages.confirmRemoval': 'Confirm deletion',

  'pages.pageTypeLabel': 'Page type',

  'pages.typeFromFile': '{type} (type written in the file)',

  /* ==================================================== `navigations` */

  'pages.shownForAllNavigations': 'Shown for every navigation',
  'pages.shownForNoNavigation': 'Shown for no navigation',
  'pages.shownForNavigations': 'Shown for: {list}',

  'navigation.backToTakeoff': 'Back to take-off',
  'navigation.triangleClosing': 'Triangle closing',
  'navigation.toWaypoint': 'To a waypoint',
  'navigation.competition': 'Competition',
  'navigation.toLivePilot': 'To a live pilot'
}

export default pages
