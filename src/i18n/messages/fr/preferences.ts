/** `preferencesPage.ts` — les 216 réglages, leur filtre, leurs replis. */
const preferences = {
  /**
   * Le cas d'école du pluriel : à zéro, le français dit « 0 réglage » et les quatre autres
   * langues disent leur pluriel. Les huit copies de `plural()` du dépôt écrivaient
   * `count > 1`, la règle française — et donc « 0 setting » en anglais.
   */
  'preferences.settingCount': {
    one: '{count} réglage',
    other: '{count} réglages'
  },

  /**
   * Remplace `` `${n} absente${n > 1 ? 's' : ''} du fichier` ``. Chaque forme est une
   * **phrase entière** : l'allemand y change le verbe (*fehlt* / *fehlen*) et l'espagnol
   * met le verbe en tête (*falta* / *faltan*). Aucun `s` collé ne survivrait à ça.
   */
  'preferences.absentFromFile': {
    one: '{count} ligne est absente du fichier',
    other: '{count} lignes sont absentes du fichier'
  },

  /**
   * `{set}` et `{offered}` sont des comptes, `{share}` une part. Trois nombres justes et
   * différents dans une seule phrase — c'est tout l'intérêt de l'écran des réglages
   * généraux, et c'est exactement le genre de phrase qu'une concaténation casse.
   */
  'preferences.setRatio': 'Vous avez réglé {set} des {offered} réglages que XCTrack propose, soit {share}.'
} as const

export default preferences

export type FrenchPreferences = typeof preferences
