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
  }
}

export default model
