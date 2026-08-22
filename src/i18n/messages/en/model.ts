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
    'value to pick from a list.'
}

export default model
