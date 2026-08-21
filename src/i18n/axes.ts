import { UI_FALLBACK_LANGUAGE, type UiLanguage } from './languages'

/**
 * # Les deux axes de langue
 *
 * Cette application a **deux** langues, et elles sont indépendantes. C'est le piège de
 * conception le plus coûteux du projet, et il ne se rattrape pas après coup : brancher
 * les deux sur un même sélecteur casserait la promesse centrale de l'outil.
 *
 * | Axe | Ce qu'il gouverne | D'où il vient |
 * |---|---|---|
 * | `ui` | **notre prose** : intitulés, remarques, explications, avertissements | le choix du pilote, mémorisé (`src/i18n/preference.ts`) ; à défaut le navigateur ; à défaut le français |
 * | `labels` | **les mots de XCTrack** : noms de gadgets, options, préférences | `Display.Language` du fichier ouvert, à défaut `navigator.language` (`resolveLanguage`, `src/model/preferences.ts`) |
 *
 * ## Le cas qui décide
 *
 * Un pilote belge dont l'AIR³ est réglé en anglais doit lire l'interface **en français**
 * et les libellés **en anglais**. Pas parce que c'est élégant : parce qu'il tient son
 * instrument dans une main et cet écran devant lui, et que le seul travail que l'outil
 * doit lui épargner est de traduire mentalement entre les deux. Un libellé « traduit »
 * dans sa langue d'interface serait un mot qu'il ne trouvera **nulle part** sur son
 * appareil.
 *
 * C'est aussi pourquoi les libellés extraits de l'APK ne se traduisent jamais — y compris
 * leur « widget » incohérent avec le « Gadget » de la chrome de XCTrack. Ce n'est pas
 * notre parole, c'est la sienne.
 *
 * ## Ce que ce module garantit, structurellement
 *
 * Les deux axes vivent dans **un seul objet**, avec deux champs nommés, et les seules
 * façons de le faire évoluer sont `withUiLanguage` et `withLabelLanguage` : chacune ne
 * touche **qu'un** champ. Aucun appel ne peut donc changer les deux à la fois par
 * inadvertance, et un test le vérifie (`tests/i18n/axes.test.ts`).
 *
 * Les types y aident aussi : `ui` est une union fermée de cinq codes, `labels` est une
 * `string` quelconque — les 35 langues du catalogue de préférences, et demain celles
 * qu'une version de XCTrack ajoutera. Passer une langue de libellés là où une langue
 * d'interface est attendue est une erreur de compilation dès que la valeur n'est pas un
 * littéral de nos cinq codes.
 *
 * ## Le seul endroit où les deux se rencontrent
 *
 * Les **chemins du menu de l'appareil** — « *Réglages → Exporter la configuration* ». Ce
 * sont des mots de notre prose (« ouvrez… ») autour de mots de XCTrack. Ils doivent
 * suivre l'axe `labels`, sans quoi on renvoie le pilote vers un menu qui n'existe pas sur
 * son écran. Ce cas se traite message par message, jamais par une règle générale : la
 * prose passe par le catalogue, le nom du menu se lit dans le catalogue de préférences,
 * à la langue `labels`.
 */
export interface LanguageAxes {
  /** Notre prose. Choix du pilote, mémorisé. Ne dépend jamais du fichier ouvert. */
  readonly ui: UiLanguage
  /**
   * Les mots de XCTrack, tels que l'appareil du pilote les affiche. Vient du fichier
   * (`Display.Language`), à défaut du navigateur. Ne dépend jamais du choix d'interface.
   *
   * Volontairement une `string` brute et non une union : le catalogue en porte 33 à 35
   * selon la ressource, et c'est `catalogLanguage()` — chacun le sien — qui décide du
   * repli. Restreindre ici obligerait à maintenir trois listes en miroir.
   */
  readonly labels: string
}

export function languageAxes(ui: UiLanguage, labels: string): LanguageAxes {
  return { ui, labels }
}

/**
 * Change la langue de **notre prose** et rien d'autre. Le pilote a cliqué dans le
 * sélecteur d'interface : ce qu'il lit sur son instrument, lui, n'a pas bougé.
 */
export function withUiLanguage(axes: LanguageAxes, ui: UiLanguage): LanguageAxes {
  return { ui, labels: axes.labels }
}

/**
 * Change la langue des **libellés de XCTrack** et rien d'autre. Un autre fichier vient
 * d'être ouvert, qui déclare une autre `Display.Language` : l'interface, elle, reste dans
 * la langue que le pilote a choisie.
 */
export function withLabelLanguage(axes: LanguageAxes, labels: string): LanguageAxes {
  return { ui: axes.ui, labels }
}

/**
 * Les axes au tout premier écran, avant qu'un fichier soit ouvert : notre prose dans la
 * langue mémorisée ou détectée, les libellés dans celle du navigateur — c'est ce que
 * l'écran annonce déjà par « LIBELLÉS — fr (langue du navigateur) ».
 *
 * `labels` est ici la langue **brute** du navigateur : c'est à chaque catalogue de la
 * replier sur ce qu'il porte, et le repli n'est pas le même d'un catalogue à l'autre.
 */
export function initialAxes(ui: UiLanguage | undefined, navigatorLanguage: string): LanguageAxes {
  return { ui: ui ?? UI_FALLBACK_LANGUAGE, labels: navigatorLanguage }
}
