/**
 * `libraryPanel.ts` — la bibliothèque de configurations rangées.
 *
 * « replacée » et non « rétablie » : c'est le troisième sens de « rétablir », et les deux
 * autres sont dans le domaine `app`. Voir l'en-tête de `app.ts`.
 */
const library = {
  'library.entryRestored': '« {name} » est replacée.',
  'library.entryRestoredBeside': '« {name} » est replacée à côté : son identifiant était déjà pris.',

  'library.entryCount': {
    one: '{count} configuration rangée',
    other: '{count} configurations rangées'
  },

  /**
   * Les guillemets ne sont pas les mêmes d'une langue à l'autre — chevrons en français,
   * guillemets courbes en anglais, guillemets bas-haut en allemand. Ils appartiennent
   * donc au message, jamais au code qui l'assemble.
   *
   * `{size}` reçoit `format.byteSize`, `{when}` reçoit `format.dateTime`.
   */
  'library.storedLine': '« {name} » est rangée — {size}, {when}.'
} as const

export default library

export type FrenchLibrary = typeof library
