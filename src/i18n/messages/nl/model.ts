import type { DomainCatalog } from '../../domains'

/** La prose hors interface — voir `fr/model.ts`. */
const model: DomainCatalog<'model'> = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identiteit',
  'personalKind.credential': 'inloggegevens',
  'personalKind.contact': 'contact',
  'personalKind.device': 'toestel',
  'personalKind.location': 'positie',
  'personalKind.file': 'bestand',
  'personalKind.freeText': 'vrije tekst',
  'personalKind.equipment': 'uitrusting',
  'personalKind.sharing': 'delen',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack geeft het zelf aan',
  'personalBasis.inputType': 'XCTrack voert het in als puntjes, zoals een wachtwoord',
  'personalBasis.declared': 'dat is ons oordeel, niet dat van XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Indeling — gaat met de pagina’s mee',
  'personalHome.preferences': 'Voorkeuren — blijven bij u in een ‘pages’-export',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'eigen titel van een widget, door u geschreven',
  'personalReason.text': 'volledige inhoud van een vrijetekstwidget, door u geschreven',
  'personalReason.fullName': 'naam van een persoon die op een belknop is opgeslagen',
  'personalReason.phoneNumber': 'telefoonnummer dat op een belknop is opgeslagen',
  'personalReason.url': 'ingevoerd webadres, dat een token of een identificatie kan bevatten',
  'personalReason.title': 'opschrift van een startknop, door u geschreven',
  'personalReason.name': 'naam van de toepassing die een startknop aanroept',
  'personalReason.action': 'Android-actie van een startknop, die een volledige URI kan zijn',
  'personalReason.filter': 'logfilter dat u hebt ingevoerd',
  'personalReason.suffix': 'tekst achter de weergegeven waarde, door u geschreven',
  'personalReason.event': 'gebeurtenisnaam die u hebt ingevoerd',
  'personalReason.unknown': 'vrije tekst zonder eigen regel: uit voorzorg als persoonlijk behandeld',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'plek aanwezig, maar leeg',

  'personal.hiddenStructure': {
    one: 'structuur met {count} vermelding, niet getoond',
    other: 'structuur met {count} vermeldingen, niet getoond'
  },

  'personal.caveat': {
    one: 'Deze inventaris betreft de instellingen die XCTrack {version} kent: {count} instelling en elf vrijetekstvelden van de widgets. Het formaat verandert bij elke versie — een lege inventaris bewijst dus geen afwezigheid.',
    other: 'Deze inventaris betreft de instellingen die XCTrack {version} kent: {count} instellingen en elf vrijetekstvelden van de widgets. Het formaat verandert bij elke versie — een lege inventaris bewijst dus geen afwezigheid.'
  }
}

export default model
