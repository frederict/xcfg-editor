/**
 * Les cinq langues dans lesquelles **notre prose** existe.
 *
 * ⚠️ Ce module ne gouverne **que** la langue de l'interface. La langue des **libellés
 * de XCTrack** — noms de gadgets, options, préférences — est un axe séparé, qui se
 * résout ailleurs (`catalogLanguage()` dans `src/catalog/widgetCatalog.ts`, alimenté par
 * `resolveLanguage()` de `src/model/preferences.ts`). Voir `src/i18n/axes.ts`, qui dit
 * pourquoi les confondre casserait l'outil.
 *
 * ## Pourquoi cinq, et pourquoi celles-là
 *
 * Ce sont les cinq demandées. Les catalogues extraits de l'APK en portent 33 à 35 : la
 * différence n'est pas une omission, c'est la distinction des deux axes. Un pilote
 * tchèque lira l'interface en anglais et ses libellés en tchèque, ce qui est exactement
 * ce qu'il faut — les libellés sont ce que son instrument lui montre en vol.
 *
 * ## Le repli est le français, pas l'anglais
 *
 * Contrairement aux catalogues de l'APK, dont le repli est l'anglais parce que c'est la
 * seule langue complète du binaire, notre prose est **écrite en français d'abord** :
 * `messages/fr.ts` est le catalogue de référence, celui dont le type de tous les autres
 * est dérivé. Un repli anglais serait un repli sur une traduction.
 */

/** Les langues de l'interface. Une union fermée : elle sert de type, pas de donnée. */
export type UiLanguage = 'fr' | 'en' | 'nl' | 'de' | 'es'

/**
 * Dans l'ordre où un sélecteur les proposerait : le français d'abord (langue de
 * référence), puis les quatre autres par ordre alphabétique de leur code.
 */
export const UI_LANGUAGES: readonly UiLanguage[] = ['fr', 'de', 'en', 'es', 'nl']

/** Voir l'en-tête : le repli est la langue d'écriture, pas une traduction. */
export const UI_FALLBACK_LANGUAGE: UiLanguage = 'fr'

/**
 * Le nom de chaque langue **dans cette langue**. Un sélecteur qui écrirait
 * « Néerlandais » à un pilote néerlandophone lui demanderait de reconnaître un mot
 * français pour sortir du français : c'est précisément la personne qu'il faut aider.
 *
 * Ces cinq chaînes ne sont donc **pas** des messages du catalogue — elles ne dépendent
 * pas de la langue courante, elles sont les mêmes dans les cinq catalogues.
 */
export const UI_LANGUAGE_ENDONYMS: Readonly<Record<UiLanguage, string>> = {
  fr: 'Français',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  nl: 'Nederlands'
}

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Ramène une étiquette BCP 47 (`fr-BE`, `de-AT`, `NL`, `es-419`) à l'une de nos cinq
 * langues, ou `undefined` si aucune ne convient.
 *
 * On découpe sur le tiret plutôt que de comparer un préfixe : `startsWith('es')`
 * accepterait `est` (estonien) et `startsWith('de')` accepterait `den`. `src/render/locale.ts`
 * emploie `startsWith('fr')` et c'est sans conséquence là-bas — il n'y décide qu'une
 * virgule décimale, et aucune étiquette réelle ne commence par `fr` sans être du français.
 * Ici, le mauvais appariement afficherait toute l'interface dans la mauvaise langue.
 */
export function uiLanguage(tag: string): UiLanguage | undefined {
  const primary = tag.split('-')[0]?.toLowerCase()
  return primary !== undefined && isUiLanguage(primary) ? primary : undefined
}
