/**
 * # Le catalogue de référence
 *
 * Le français n'est pas « une langue parmi cinq » : c'est **la langue d'écriture**. Ce
 * fichier est la source de vérité du jeu de clés, et le type de tous les autres
 * catalogues en est dérivé (`src/i18n/catalog.ts`). Une clé ajoutée ici et oubliée
 * ailleurs est une **erreur de compilation**, pas une découverte d'utilisateur.
 *
 * ## Les clés sont en anglais, la prose en français
 *
 * Règle du projet. La clé est un identifiant, elle est lue par du code ; le texte est de
 * la prose, elle est lue par un pilote.
 *
 * ## Les deux collisions du français, tranchées ici
 *
 * Le français porte deux ambiguïtés que les quatre autres langues n'ont pas. Le nommage
 * des clés est ce qui les rend impossibles à confondre — un `grep` sur la clé donne un
 * sens et un seul.
 *
 * **« rétablir » recouvre trois gestes** (relevé de langue § A.3), dont deux sont visibles
 * en même temps en mode édition :
 *
 * | Clé | Geste | Anglais |
 * |---|---|---|
 * | `action.redo` `action.redoNothing` `action.redoNamed` | refaire ce qu'on a annulé | *redo* |
 * | `zoom.resetTo` | remettre le zoom à sa valeur | *reset* |
 * | `library.entryRestored` `library.entryRestoredBeside` | replacer une entrée de bibliothèque | *restore* |
 *
 * Aucune de ces clés n'est réutilisée pour un autre sens, et aucune ne s'appelle
 * `restore` tout court. À l'écran, le français distingue aussi les trois : « Rétablir »
 * pour le premier — c'est le mot standard du geste, et l'icône l'accompagne —, « Zoom
 * 100 % » pour le zoom, qui dit sa destination et non son geste, et « replacée » pour la
 * bibliothèque.
 *
 * **« relevé » recouvre trois choses** (§ B.3), et cette distinction **est** la valeur du
 * projet : ce qui est extrait de l'APK n'est pas ce qui est mesuré sur l'appareil.
 *
 * | Clé | Ce que c'est | Anglais |
 * |---|---|---|
 * | `provenance.apkSurvey` | notre extraction des 47 APK | *survey* |
 * | `provenance.factoryValueCatalogue` | le catalogue des valeurs d'usine | *catalogue* |
 * | `provenance.measuredOnDevice` | ce qui a été observé sur l'AIR³ | *measured* |
 *
 * Les deux dernières lignes de la famille — `declaredByFile` et `assumedByEditor` — sont
 * la formulation modèle de la bibliothèque, celle que le relevé désigne comme « la
 * meilleure phrase de l'application » : elle porte la distinction mesuré / supposé sans
 * un mot de spécialiste.
 *
 * ## Ce catalogue est un socle, pas la traduction
 *
 * Il porte les 21 messages qui **arbitrent du vocabulaire** ou qui **démontrent une
 * construction** (pluriel, phrase à repères nommés, formateur). Les 627 unités de message
 * du dépôt seront versées ici au lot 2, quand l'interface aura cessé de bouger — extraire
 * maintenant figerait des formulations qui vont encore changer.
 *
 * Un mot n'y est **pas** employé, volontairement : *gadget* / *widget*. La chrome
 * française de XCTrack dit « Gadget » (mesuré sur l'AIR³, `docs/reference/`
 * `edition-native-exploration.md`) ; ce que dit la chrome **allemande, néerlandaise ou
 * espagnole**, personne ne l'a mesuré. Les catalogues de l'APK ne répondent pas : ils
 * disent « widget » dans les cinq langues, y compris en français où l'appareil dit
 * « Gadget ». Règle du rôle : on n'invente pas un terme technique dans une langue qu'on
 * ne mesure pas. Les messages qui portent ce mot attendront la mesure.
 */
const fr = {
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

  /* ------------------------------------- « rétablir », sens 3 : restaurer une archive */

  'library.entryRestored': '« {name} » est replacée.',
  'library.entryRestoredBeside': '« {name} » est replacée à côté : son identifiant était déjà pris.',

  /* ----------------------------------------------------- « relevé », les trois sens */

  'provenance.apkSurvey': 'notre relevé des versions de XCTrack',
  'provenance.factoryValueCatalogue': 'le catalogue des valeurs d’usine',
  'provenance.measuredOnDevice': 'mesuré sur l’appareil',
  'provenance.declaredByFile': 'Ce que le fichier déclare',
  'provenance.assumedByEditor': 'Ce que cet éditeur suppose',

  /* ------------------------------------------------------------------------ pluriels */

  /**
   * Le cas d'école : à zéro, le français dit « 0 réglage » et les quatre autres langues
   * disent leur pluriel. Les huit copies de `plural()` du dépôt écrivaient `count > 1`,
   * la règle française — et donc « 0 setting » en anglais.
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
   * Trois repères nommés dans une phrase : c'est ce qui permet au traducteur de déplacer
   * les mots. L'allemand renvoie son verbe à la fin, le néerlandais aussi.
   */
  'pages.hiddenOffFlight': {
    one: '{count} page est masquée hors contexte de vol : au sol, l’appareil n’en montre que {shown} sur {total}.',
    other: '{count} pages sont masquées hors contexte de vol : au sol, l’appareil n’en montre que {shown} sur {total}.'
  },

  'library.entryCount': {
    one: '{count} configuration rangée',
    other: '{count} configurations rangées'
  },

  'versions.publishedCount': {
    one: '{count} version publiée',
    other: '{count} versions publiées'
  },

  /* ---------------------------------------------------------------------- formateurs */

  /**
   * Les guillemets ne sont pas les mêmes d'une langue à l'autre — chevrons en français,
   * guillemets courbes en anglais, guillemets bas-haut en allemand. Ils appartiennent
   * donc au message, jamais au code qui l'assemble.
   *
   * `{size}` reçoit `format.byteSize`, `{when}` reçoit `format.dateTime`.
   */
  'library.storedLine': '« {name} » est rangée — {size}, {when}.',

  /** Ce que `format.dateTime` ne dit pas : il rend `undefined`, la prose est ici. */
  'common.unknownDate': 'date inconnue',

  /**
   * `{set}` et `{offered}` sont des comptes, `{share}` une part. Trois nombres justes et
   * différents dans une seule phrase — c'est tout l'intérêt de l'écran des réglages
   * généraux, et c'est exactement le genre de phrase qu'une concaténation casse.
   */
  'preferences.setRatio': 'Vous avez réglé {set} des {offered} réglages que XCTrack propose, soit {share}.',

  /** Les chiffres changent de langue, le reste non : « 48,3 × 27,2 mm » ou « 48.3 × 27.2 mm ». */
  'device.screenSize': '{width} × {height}',

  /* ------------------------------------------------------- vocabulaire de la valeur d'usine */

  /**
   * « défaut » se lit *anomalie* en français, et le dépôt l'emploie encore 19 fois nu,
   * dont quatre fois en capitales collées au nom du pilote. « valeur d'usine » est court,
   * n'a pas de second sens, et porte exactement l'idée : *ce que le fabricant a posé
   * avant vous*. Le français est la seule des cinq langues où la collision existe.
   */
  'factoryValue.same': 'VALEUR D’USINE',
  'factoryValue.setByYou': 'RÉGLÉ PAR VOUS',
  'factoryValue.uncertain': 'VALEUR D’USINE INCERTAINE',
  'factoryValue.neverSet': 'JAMAIS RÉGLÉ'
} as const

export default fr

/**
 * Le type du catalogue de référence. `catalog.ts` l'importe en `import type` — donc
 * effacé à la compilation — pour que les quatre autres catalogues soient typés sans
 * qu'aucun d'eux n'embarque le français à l'exécution.
 */
export type FrenchMessages = typeof fr
