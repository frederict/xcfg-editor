/**
 * `main.ts`, `views.ts`, `editor.ts` — le cadre, la vue d'ensemble, le calque d'édition.
 *
 * ## « rétablir » recouvre trois gestes, et deux sont à l'écran en même temps
 *
 * Relevé de langue § A.3. Le nommage des clés est ce qui les rend impossibles à
 * confondre — un `grep` sur la clé donne un sens et un seul.
 *
 * | Clé | Geste | Anglais |
 * |---|---|---|
 * | `action.redo` `action.redoNothing` `action.redoNamed` | refaire ce qu'on a annulé | *redo* |
 * | `zoom.resetTo` | remettre le zoom à sa valeur | *reset* |
 * | `library.entryRestored` (domaine `library`) | replacer une entrée de bibliothèque | *restore* |
 *
 * Aucune de ces clés n'est réutilisée pour un autre sens, et aucune ne s'appelle
 * `restore` tout court. À l'écran, le français distingue aussi les trois : « Rétablir »
 * pour le premier — c'est le mot standard du geste, et l'icône l'accompagne —, « Zoom
 * 100 % » pour le zoom, qui dit sa destination et non son geste, et « replacée » pour la
 * bibliothèque.
 */
const app = {
  /* ---------------------------------------------------- « rétablir », sens 1 : refaire */

  'action.redo': 'Rétablir',
  'action.redoNothing': 'Rien à rétablir',
  'action.redoNamed': 'Rétablir : {what}',

  /* --------------------------------------- « rétablir », sens 2 : remettre à la valeur */

  /**
   * Le bouton dit sa **destination**, pas son geste : le pilote qui vient d'annuler un
   * déplacement et cherche à le refaire ne doit pas trouver deux « Rétablir » sous les
   * yeux, dont l'un lui ferait perdre sa position de lecture.
   *
   * `{level}` reçoit `format.percent(1)` et non la chaîne « 100 % » : l'espace avant le
   * signe existe en français, en allemand et en espagnol, pas en anglais ni en
   * néerlandais.
   */
  'zoom.resetTo': 'Zoom {level}'
} as const

export default app

export type FrenchApp = typeof app
