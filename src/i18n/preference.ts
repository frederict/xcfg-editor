import {
  isUiLanguage,
  uiLanguage,
  UI_FALLBACK_LANGUAGE,
  type UiLanguage
} from './languages'

/**
 * # Comment la langue de l'interface est choisie, et retenue
 *
 * Trois sources, dans cet ordre :
 *
 * 1. **ce que le pilote a choisi**, s'il a choisi — mémorisé dans `localStorage` ;
 * 2. **le navigateur**, au tout premier lancement — `navigator.languages`, dans l'ordre
 *    de préférence que le pilote a réglé dans son système ;
 * 3. **le français**, si aucune des deux ne mène à l'une de nos cinq langues.
 *
 * ## Ce module ne connaît **que** l'axe de l'interface
 *
 * Il n'écrit rien d'autre que la langue de notre prose, sous une clé qui le dit
 * (`xcfg-editor.ui-language`), et il n'a aucun accès à la langue des **libellés de
 * XCTrack** — qui vient du fichier ouvert (`Display.Language`) et ne se mémorise pas,
 * parce qu'elle change avec le fichier. La séparation n'est donc pas une convention à
 * respecter : elle est dans la forme du module. Voir `src/i18n/axes.ts`.
 *
 * ## `navigator.languages`, pas `navigator.language`
 *
 * Un pilote belge règle souvent son système en `nl-BE, fr-BE, en-US`. `navigator.language`
 * ne rend que le premier ; la liste complète permet de retomber sur le français quand la
 * première langue n'est pas des nôtres, plutôt que de sauter directement au repli. Un
 * appelant qui n'a que `navigator.language` passe un tableau d'un seul élément.
 */

/** Clé de `localStorage`. Un réglage d'affichage, jamais une donnée du fichier. */
export const UI_LANGUAGE_KEY = 'xcfg-editor.ui-language'

/**
 * Ce que le pilote a choisi, si c'est encore une de nos langues.
 *
 * Un enregistrement de `localStorage` n'est jamais une donnée de confiance : il peut
 * dater d'une version antérieure — une langue retirée depuis —, avoir été édité à la
 * main, ou l'accès lui-même peut lever (navigation privée verrouillée, stockage
 * désactivé). Tout ce qui ne tient pas est ignoré en silence, et l'appelant retombe sur
 * la détection.
 */
export function readUiLanguage(storage: Storage): UiLanguage | undefined {
  let raw: string | null = null
  try {
    raw = storage.getItem(UI_LANGUAGE_KEY)
  } catch {
    return undefined
  }
  return isUiLanguage(raw) ? raw : undefined
}

/**
 * Mémorise le choix. Un échec d'écriture — quota, stockage refusé — ne doit pas empêcher
 * le pilote de lire l'interface dans sa langue pour la session en cours : on l'avale, la
 * langue reste appliquée, elle ne survivra simplement pas au rechargement.
 */
export function writeUiLanguage(storage: Storage, language: UiLanguage): void {
  try {
    storage.setItem(UI_LANGUAGE_KEY, language)
  } catch {
    // sans effet : voir ci-dessus
  }
}

/**
 * La première des langues du navigateur qui soit une des nôtres. `fr-BE` donne `fr`,
 * `de-AT` donne `de`. Rend `undefined` si aucune ne convient — c'est une information, pas
 * un repli : l'appelant sait alors qu'il applique le français faute de mieux.
 */
export function detectUiLanguage(preferred: readonly string[]): UiLanguage | undefined {
  for (const tag of preferred) {
    const found = uiLanguage(tag)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * La langue à appliquer au premier écran : le choix mémorisé, sinon le navigateur, sinon
 * le français.
 *
 * `storage` et `preferred` sont **passés** et non lus ici, pour la même raison que
 * `resolveLanguage` reçoit `navigator.language` dans `src/model/preferences.ts` : cette
 * fonction est ainsi entièrement testable, y compris le cas du stockage qui lève.
 */
export function initialUiLanguage(storage: Storage, preferred: readonly string[]): UiLanguage {
  return readUiLanguage(storage) ?? detectUiLanguage(preferred) ?? UI_FALLBACK_LANGUAGE
}
