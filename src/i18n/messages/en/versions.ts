import type { DomainCatalog } from '../../domains'

/**
 * Les versions relevées et le nettoyage — voir `fr/versions.ts`.
 *
 * Les trois statuts : *outdated*, *blind spot*, *unknown*. « angle mort » se dit en
 * anglais **blind spot**, au sens figuré comme au sens propre — ce qu'on ne voit pas, et
 * qu'on sait ne pas voir.
 *
 * Anglais britannique, comme le reste du catalogue : *recognised*, *catalogue*.
 */
const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} published release',
    other: '{count} published releases'
  },

  /* ------------------------------------------------- les statuts : le mot du bandeau */

  'versions.badgeOutdated': 'outdated',
  'versions.badgeReadBefore': 'read earlier only',
  'versions.badgeAppearedLater': 'appeared later',
  'versions.badgeBlindSpot': 'blind spot',
  'versions.badgeUnknown': 'unknown',
  'versions.badgeUnknownWidget': 'unknown widget',
  'versions.badgeRecognized': 'recognised',

  /* ----------------------------------------- les huit cas : titre, constat, et verdict */

  /** ⚠️ Voir le commentaire du français : « no longer reads them » était faux. */
  'versions.titleLegacy': 'Outdated settings: the release you are targeting no longer writes them',
  'versions.evidenceLegacy': 'We read these settings in older releases, no longer in this one — and real files written by that very release carry them anyway. XCTrack keeps the settings it no longer knows without reading them: here we have seen it happen, we are not assuming it.',
  'versions.verdictLegacy': 'Removing them is defensible here. This is the only case a real file comes to confirm.',

  'versions.titlePastOnly': 'Read by older releases only',
  'versions.evidencePastOnly': 'We read these settings in older releases, no longer in the one you are targeting. But no real file comes to confirm it: all we have here is our reading of the releases, without the example that checks it.',
  'versions.verdictPastOnly': 'Removing them is defensible, on our reading alone. Nothing says XCTrack dropped them: we simply no longer read them there.',

  'versions.titleFutureOnly': 'Appeared after the release you are targeting',
  'versions.evidenceFutureOnly': 'We only read these settings in releases newer than the one you are targeting. So this file comes from a release newer than the one chosen here.',
  'versions.verdictFutureOnly': 'Do not remove them. The release you are targeting ignores them; a newer one will find them untouched.',

  'versions.titleStraddled': 'Read before and after the release you are targeting, but not by it',
  'versions.evidenceStraddled': 'We read these settings in the releases before and in those after, and we miss them just here. A setting that would vanish only to come back unchanged would be an oddity; the simpler explanation is that our reading has a hole at that point.',
  'versions.verdictStraddled': 'Do not remove them. The hole is ours, not your file’s.',

  'versions.titleNeverRead': 'Unknown: no release we have read reads them',
  'versions.evidenceNeverRead': 'None of the XCTrack releases we have been able to read carries this setting on this widget, and no real file shows it there either. We do not know where it comes from.',
  'versions.verdictNeverRead': 'We do not know. This is no proof that the setting is outdated — only that we do not know it.',

  'versions.titleGap': 'Our reading has a hole: the setting did exist',
  'versions.evidenceGap': 'We have not seen these settings in that release, but we read them in newer ones, and a real file written by it carries them. The setting existed: we are the ones who missed it.',
  'versions.verdictGap': 'Never remove them. These are valid settings, and taking them for outdated ones would erase yours.',

  'versions.titleBlind': 'Settings we see nowhere',
  'versions.evidenceBlind': 'Real files carry them, and no release we have been able to read declares them. We see them nowhere, and our silence says nothing about them.',
  'versions.verdictBlind': 'Nothing to conclude. Do not remove them on that basis.',

  'versions.titleUnknownWidget': 'Widgets the release you are targeting does not know',
  'versions.evidenceUnknownWidget': 'This type of widget does not appear in what we have read of this release. So we know nothing about its settings: a widget we have never seen is not a widget that was withdrawn.',
  'versions.verdictUnknownWidget': 'Nothing to conclude about its settings.',

  /* ------------------------------------------------------ où le gadget se trouve */

  'versions.placePortrait': 'Portrait · page {page} · rank {rank} · {name}',
  'versions.placeLandscape': 'Landscape · page {page} · rank {rank} · {name}',

  /* -------------------------------------------------------------- le choix de version */

  'versions.panelLabel': 'Targeted release and compatibility',
  'versions.targetLabel': 'The XCTrack release you are targeting',
  'versions.noVersionOption': '— no release chosen —',
  'versions.groupWriter': 'The release that wrote this file',
  'versions.groupCandidates': 'The releases this file may point to',
  'versions.groupNearestOne': 'The release closest to this file’s own',
  'versions.groupNearestSeveral': 'The releases closest to this file’s own',
  'versions.groupPublished': 'Published releases, newest first',
  'versions.groupDevelopment': 'Development builds, never published',

  'versions.unknownVersion': 'release unknown',
  'versions.buildLabel': '{release} (build {build})',

  /* ------------------------------------------------- d'où vient la version proposée */

  'versions.declaredByCode': 'release {code}',
  'versions.declaredByName': 'XCTrack {release} (number {code})',

  'versions.messageUndeclared': 'This file does not say which XCTrack release it comes from: it does not carry its release number. Nothing lets us suggest one — choose the release of the device you will import this file back into.',

  'versions.messageExact': 'This file was written by {declared}. That is the release targeted below, and you may choose another.',

  'versions.messageExactPinned': {
    one: 'This file was written by {declared}. {count} release carries that number; the name the file declares points to one of them only. That is the release targeted below, and you may choose another.',
    other: 'This file was written by {declared}. {count} releases carry that number; the name the file declares points to one of them only. That is the release targeted below, and you may choose another.'
  },

  'versions.messageAmbiguous': {
    one: 'This file was written by {declared}. {count} release carries that number without accepting the same settings, and the file does not say which one wrote it. We are targeting the newest, {version} — an arbitrary choice, owned as such: every remark that would change under one of the others is flagged below.',
    other: 'This file was written by {declared}. {count} releases carry that number without accepting the same settings, and the file does not say which one wrote it. We are targeting the newest, {version} — an arbitrary choice, owned as such: every remark that would change under one of the others is flagged below.'
  },

  'versions.messageApproximated': 'This file was written by {declared}, which no surveyed release carries. We fall back on the closest number, {code} — it is not the same release, it is the closest one we have been able to read. We are targeting {version}.',

  'versions.messageApproximatedSeveral': {
    one: 'This file was written by {declared}, which no surveyed release carries. We fall back on the closest number, {code} — it is not the same release, it is the closest one we have been able to read. That number itself covers {count} release; we are targeting the newest, {version}, and we flag below every remark that would change under another.',
    other: 'This file was written by {declared}, which no surveyed release carries. We fall back on the closest number, {code} — it is not the same release, it is the closest one we have been able to read. That number itself covers {count} releases; we are targeting the newest, {version}, and we flag below every remark that would change under another.'
  },

  'versions.messageUnrecognized': {
    one: 'This file was written by {declared}, which we do not know: we have been able to read {count} XCTrack release, and this is not one of them. We suggest none — naming one by guesswork would be inventing. Choose the one on your device.',
    other: 'This file was written by {declared}, which we do not know: we have been able to read {count} XCTrack releases, and this is not one of them. We suggest none — naming one by guesswork would be inventing. Choose the one on your device.'
  },

  'versions.messageUnrecognizedSituated': {
    one: 'This file was written by {declared}, which we do not know: we have been able to read {count} XCTrack release, and this is not one of them. {situate} We suggest none — naming one by guesswork would be inventing. Choose the one on your device.',
    other: 'This file was written by {declared}, which we do not know: we have been able to read {count} XCTrack releases, and this is not one of them. {situate} We suggest none — naming one by guesswork would be inventing. Choose the one on your device.'
  },

  'versions.rangeAbove': 'The numbers we know run from {min} to {max}; this one is above them all.',
  'versions.rangeBelow': 'The numbers we know run from {min} to {max}; this one is below them all.',
  'versions.rangeBetween': 'The numbers we know run from {min} to {max}; this one falls between two of them.',

  'versions.aimingElsewhere': 'You are targeting a release other than that one: the diagnosis below checks this file against {version}.',

  /* --------------------------------- ce que le choix du pilote ne change pas */

  'versions.sameNone': 'No other surveyed release accepts exactly the same settings as {version}: what is said below holds for it alone.',

  'versions.sameOtherOne': '{list} accepts exactly the same settings as {version}: we do not tell them apart, and what is said below holds for {total} releases.',
  'versions.sameOtherSeveral': '{list} accept exactly the same settings as {version}: we do not tell them apart, and what is said below holds for {total} releases.',

  /* ------------------------------------------------- l'écart depuis la version d'avant */

  'versions.noPreviousRelease': {
    one: 'No published release comes before this one among those we have been able to read: nothing to compare. {count} known widget.',
    other: 'No published release comes before this one among those we have been able to read: nothing to compare. {count} known widgets.'
  },
  'versions.widgetsAdded': {
    one: '{count} widget added',
    other: '{count} widgets added'
  },
  'versions.widgetsRemoved': {
    one: '{count} widget removed',
    other: '{count} widgets removed'
  },
  'versions.settingsAdded': {
    one: '{count} setting added',
    other: '{count} settings added'
  },
  'versions.settingsRemoved': {
    one: '{count} setting removed',
    other: '{count} settings removed'
  },
  'versions.deltaNone': 'Nothing sets this release apart from {version}: we read the same settings in both.',
  'versions.deltaSince': 'Since {version}: {changes}.',
  'versions.noVersionChosen': 'No release chosen: nothing is compared, and nothing is diagnosed.',

  'versions.deltaDetails': 'The detail of these changes',
  'versions.deltaCaveat': 'What follows is what the targeted version reads more of, or less of, than the previous one. Widgets carry the name XCTrack gives them; settings do not — the application shows them nowhere, and these are the names it writes in the file.',
  'versions.detailWidgetsAdded': 'Widgets added',
  'versions.detailWidgetsRemoved': 'Widgets removed',
  'versions.detailSettingsAdded': 'Settings added on existing widgets',
  'versions.detailSettingsRemoved': 'Settings removed',
  'versions.detailLine': '{name}: {keys}',

  /* ------------------------------------------------------------------ le diagnostic */

  'versions.chooseVersion': 'Choose a release to get the diagnosis of this file.',

  'versions.tally': {
    one: '{count} setting recognised out of {examined} examined, spread over {instances}.',
    other: '{count} settings recognised out of {examined} examined, spread over {instances}.'
  },

  'versions.scope': {
    one: 'This diagnosis rests on our survey of {count} XCTrack release and on real files written by it: that is what “we” means below. Only the widgets on the pages are examined — the rest of a backup (vario, units, sensors, airspaces) is not diagnosed. A widget’s position and its type are not settings and are not counted.',
    other: 'This diagnosis rests on our survey of {count} XCTrack releases and on real files written by them: that is what “we” means below. Only the widgets on the pages are examined — the rest of a backup (vario, units, sensors, airspaces) is not diagnosed. A widget’s position and its type are not settings and are not counted.'
  },

  'versions.unstableNotice': {
    one: '{count} remark changes depending on which release is retained among those this file may point to. They are flagged one by one.',
    other: '{count} remarks change depending on which release is retained among those this file may point to. They are flagged one by one.'
  },

  'versions.noFindings': 'No discrepancy: every setting in this file is read by the release you are targeting, and all of its widgets exist there. Nothing to report — which does not mean the file is sound, only that we find nothing to object to in it.',

  'versions.widgetKnownElsewhere': 'a type we know, but not in this release',
  'versions.widgetNeverSeen': 'a type we have seen in no release',

  'versions.unstableFinding': 'Unstable remark — under {divergences}.',
  'versions.divergencePart': '{version}: {word}',
  'versions.divergenceJoin': '; ',

  'versions.readonlyNote': 'You are reading this file without changing it: nothing can be removed from it here. To act on what you are reading, close this window and switch to editing.',

  /* ================================================================= le nettoyage */

  'cleanup.title': 'Remove what an older release left behind',

  /** The heading when nothing is offered: all that is left is to say what was found. */
  'cleanup.foundTitle': 'What an older release left behind',

  'cleanup.lead': {
    one: '{count} setting in this file comes from an older release of XCTrack, across {instances}: {list}.',
    other: '{count} settings in this file come from an older release of XCTrack, across {instances}: {list}.'
  },

  /**
   * ⚠️ This sentence stated two false things until 22 August 2026 — “XCTrack carries them
   * along without reading them” and “removing them makes the file smaller, that is all”.
   * A round trip on an AIR³ 7.2 showed the opposite: the instrument reads them, derives
   * its present-day settings from them, then erases them. It now reassures only about
   * what was measured, setting by setting.
   */
  'cleanup.calm': 'XCTrack reads these settings one last time when it opens the file, derives its present-day settings from them, then erases them. These ones were measured on the device: it derives the same thing whether they are there or not. Removing them makes the file smaller and changes nothing on your pages.',

  'cleanup.seeList': {
    one: 'See this setting, and untick what you would rather keep',
    other: 'See these {count} settings, and untick what you would rather keep'
  },

  'cleanup.caveat': 'The names below are the ones XCTrack writes. The application no longer shows them in its menus: it replaces them, the first time it reads the file, with the settings that succeeded them.',

  /* ------------------------------------------- ce qui est trouvé et laissé en place */

  'cleanup.heldTitle': {
    one: '{count} setting found, and left in place',
    other: '{count} settings found, and left in place'
  },
  'cleanup.heldLead': 'These are not offered. XCTrack reads them one last time when it opens the file, to derive its present-day settings: removing them before it has done so would change what your instrument shows, or we cannot say that it would not. There is nothing for you to do: they will go on their own as soon as your device has read this file.',
  /** `{successor}`, `{present}` and `{absent}` are XCTrack names and values: copied as they stand. */
  'cleanup.heldLive': 'measured on the device: without it, {successor} goes from {present} to {absent}',
  'cleanup.heldUnmeasured': 'what it would become without it has never been measured on a device',

  /* ------------------------------------------- ce que porte chaque réglage périmé */

  'cleanup.usedUntil': 'written by XCTrack up to release {release}',
  'cleanup.noLongerRead': 'replaced since, without our being able to say when',
  'cleanup.noteWithValue': 'set to {value}, {since}',
  'cleanup.noteRepeated': {
    one: '{note}, written {count} time on this widget',
    other: '{note}, written {count} times on this widget'
  },
  'cleanup.valueYes': 'yes',
  'cleanup.valueNo': 'no',

  /* ------------------------------------------------------------- décocher, puis agir */

  'cleanup.allSelected': {
    one: '{count} setting kept in.',
    other: '{count} settings kept in.'
  },
  'cleanup.someSelected': {
    one: '{count} kept in out of {total} — {left}.',
    other: '{count} kept in out of {total} — {left}.'
  },
  'cleanup.remaining': {
    one: '{count} setting will stay in place',
    other: '{count} settings will stay in place'
  },
  'cleanup.noneSelected': 'No setting kept in',

  'cleanup.removeButton': {
    one: 'Remove this setting',
    other: 'Remove these {count} settings'
  },
  'cleanup.undoButton': {
    one: 'Put this setting back',
    other: 'Put these {count} settings back'
  },

  'cleanup.removedTally': {
    one: '{count} setting removed across {instances}. Your device knows nothing of it yet: the file only changes when you save it.',
    other: '{count} settings removed across {instances}. Your device knows nothing of it yet: the file only changes when you save it.'
  },

  /* --------------------------------------- le libellé du pas d'annulation de l'hôte */

  'cleanup.removeStep': {
    one: 'Remove {count} setting from an older release',
    other: 'Remove {count} settings from an older release'
  },
  'cleanup.restoreStep': {
    one: 'Put back {count} setting from an older release',
    other: 'Put back {count} settings from an older release'
  }
}

export default versions
