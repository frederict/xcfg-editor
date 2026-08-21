/**
 * # Le socle multilingue
 *
 * Cinq langues pour **notre prose** : français, anglais, néerlandais, allemand, espagnol.
 *
 * ```ts
 * import { initialUiLanguage, loadTranslator, writeUiLanguage } from '../i18n'
 *
 * const ui = initialUiLanguage(window.localStorage, navigator.languages)
 * const tr = await loadTranslator(ui)
 * tr.t('preferences.settingCount', { count: 0 })   // « 0 réglage » — « 0 settings » en anglais
 * ```
 *
 * | Fichier | Ce qu'il porte |
 * |---|---|
 * | `axes.ts` | **les deux axes de langue** — le piège de conception central, à lire en premier |
 * | `languages.ts` | les cinq codes, leur détection, leurs noms dans leur propre langue |
 * | `plural.ts` | une seule règle de pluriel, `Intl.PluralRules`, pour remplacer les huit copies de `count > 1` |
 * | `format.ts` | nombres, parts, tailles, millimètres, pouces, dates — tous par `Intl` |
 * | `catalog.ts` | le type du catalogue, dérivé du français ; le chargement d'une langue et d'une seule |
 * | `messages/*.ts` | un catalogue par langue, un morceau téléchargeable par langue |
 * | `translate.ts` | `t()`, l'interpolation à repères nommés |
 * | `preference.ts` | détection au navigateur, mémorisation du choix, repli français |
 *
 * **Ce socle ne contient aucune interface** : pas de sélecteur, pas de DOM, pas de
 * `window`. Ce qui vient du navigateur — `localStorage`, `navigator.languages` — lui est
 * passé en argument, comme `src/model/preferences.ts` reçoit `navigator.language` au lieu
 * de le lire.
 */

export {
  UI_FALLBACK_LANGUAGE,
  UI_LANGUAGES,
  UI_LANGUAGE_ENDONYMS,
  isUiLanguage,
  uiLanguage,
  type UiLanguage
} from './languages'

export {
  initialAxes,
  languageAxes,
  withLabelLanguage,
  withUiLanguage,
  type LanguageAxes
} from './axes'

export { pluralCategory, pluralForm, type PluralForms } from './plural'

export { formatters, type Formatters } from './format'

export {
  loadMessages,
  type MessageArgs,
  type MessageCatalog,
  type MessageKey,
  type MessageValues,
  type Placeholders
} from './catalog'

export { loadTranslator, makeTranslator, type Translator } from './translate'

export {
  UI_LANGUAGE_KEY,
  detectUiLanguage,
  initialUiLanguage,
  readUiLanguage,
  writeUiLanguage
} from './preference'
