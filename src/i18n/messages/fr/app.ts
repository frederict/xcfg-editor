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
  'zoom.resetTo': 'Zoom {level}',

  /** L'intitulé du curseur lui-même. Le pourcentage à côté vient de `format.percent`. */
  'zoom.label': 'Zoom',

  /* ========================================= `views.ts` — les classes de page */

  /**
   * Ce que la classe d'une page implique, et **rien de plus** : le jeu de gadgets posé à
   * la création, et pour l'assistant de thermique le fait d'être la classe visée par le
   * basculement automatique. Ce qu'elle n'implique pas — le moment où l'appareil montre
   * la page — est le réglage `navigations`, mesuré le 22 août 2026. Voir `PAGE_KINDS`
   * dans `src/ui/views.ts`.
   *
   * Famille de valeurs fermée : son propre préfixe, comme `factoryValue` et `provenance`.
   */
  'pageKind.free': 'Page libre',
  'pageKind.freeNote': 'Créée vide sur l’instrument, prête pour vos propres gadgets.',
  'pageKind.competition': 'Page de compétition',
  'pageKind.competitionNote': 'Créée avec le jeu de gadgets de compétition de l’instrument.',
  'pageKind.thermalAssistant': 'Page d’assistant de thermique',
  'pageKind.thermalAssistantNote': 'Créée avec le jeu de gadgets d’assistant de thermique. ' +
    'C’est la classe que vise le basculement automatique en thermique.',
  'pageKind.xcAssistant': 'Page d’assistant XC',
  'pageKind.xcAssistantNote': 'Créée avec le jeu de gadgets d’aide FAI et routes.',
  'pageKind.unknown': 'Type de page non reconnu',
  'pageKind.unknownNote': 'Ce type de page n’est pas décrit par cet éditeur ; son contenu ' +
    'reste affiché tel quel.',

  /** Le fichier ne déclare aucune classe : ce qui s'affiche à la place du nom de classe. */
  'pageKind.missing': '(type absent)',

  /* ================================== `views.ts` — orientations et vue d'ensemble */

  'view.landscape': 'Paysage',
  'view.portrait': 'Portrait',

  /**
   * L'intitulé parlé d'une vignette. `{tally}` reçoit `common.widgetCount` **déjà rendu**,
   * donc une `string` : un message n'en imbrique pas un autre, l'appelant les assemble.
   */
  'view.pageCard': 'Page {rank}, {kind}, {tally}',

  'view.pageCount': {
    one: '{count} page',
    other: '{count} pages'
  },

  /** Zéro page dans une orientation : le compte cède la place au mot. */
  'view.noPage': 'aucune page',
  'view.emptyOrientation': 'Ce fichier ne décrit aucune page dans cette orientation.',

  /**
   * « remarque » et non « avertissement » : rien de ce qui se range derrière cette ligne
   * n'appelle de correction, et un pilote qui lit « avertissement » ouvre en s'attendant
   * à un problème.
   */
  'view.remarkCount': {
    one: '{count} remarque sur ce fichier',
    other: '{count} remarques sur ce fichier'
  },

  /* ========================================== `views.ts` — la vue d'une page */

  'view.backToOverview': '← Vue d’ensemble',

  /** « Paysage · Page libre » : l'orientation et la classe, dans le titre de la vue. */
  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Page précédente',
  'view.nextPage': 'Page suivante',

  /** Le rang de la page dans son orientation : « 3 / 5 ». */
  'view.position': '{index} / {total}',

  /** Graduation de la règle posée le long de la page, tous les cinq centimètres. */
  'view.rulerCentimeters': '{value} cm',

  'view.hoverHint': 'Survolez un gadget pour son nom et ses dimensions.',
  'view.hoverHintSelectable': 'Survolez un gadget pour son nom et ses dimensions ; ' +
    'cliquez-le pour voir ses réglages.',

  /** Le relevé décrit le gadget choisi et non celui qui est sous le curseur. */
  'view.selectedPin': 'sélectionné',

  /**
   * L'intitulé parlé d'une zone de survol. « millimètres » en toutes lettres : l'assistance
   * vocale épelle « mm » lettre à lettre, et les deux nombres se lisent alors mal.
   */
  'view.widgetSpoken': '{name}, {width} sur {height} millimètres',

  'view.scaleAdvice': 'La page est dessinée à sa taille réelle sur l’appareil. Votre écran ' +
    'n’a pas forcément la densité que le navigateur suppose : réglez le zoom jusqu’à ce ' +
    'qu’une règle posée sur l’écran coïncide avec les graduations.'
} as const

export default app

export type FrenchApp = typeof app
