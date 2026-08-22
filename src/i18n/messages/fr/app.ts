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
    'qu’une règle posée sur l’écran coïncide avec les graduations.',

  /* ================================ `editor.ts` — les gestes, nommés pour l'annulation */

  /**
   * Le nom d'un geste, tel qu'il s'écrit dans « Annuler … ». Chaque forme est une **phrase
   * entière** : l'allemand renvoie son verbe à la fin — « Höhe GPS verschieben » — et un
   * verbe collé devant un nom ne s'y transpose pas.
   */
  'editor.moveNamed': 'Déplacer {name}',
  'editor.resizeNamed': 'Redimensionner {name}',
  'editor.deleteNamed': 'Supprimer {name}',
  'editor.duplicateNamed': 'Dupliquer {name}',
  'editor.raiseNamed': 'Avancer {name}',
  'editor.lowerNamed': 'Reculer {name}',
  'editor.frontNamed': 'Mettre {name} au premier plan',
  'editor.backNamed': 'Envoyer {name} à l’arrière-plan',

  /* ------------------------------------------------- le rang dans la pile, dit en clair */

  /**
   * L'appareil ne donne **aucun** retour sur l'empilement : un gadget envoyé sous une carte
   * disparaît de l'écran sans que rien n'indique où il est passé. Une pile qu'on ne voit pas
   * se lit au moins en toutes lettres.
   */
  'editor.onlyWidget': 'Seul gadget de la page',
  'editor.rank': 'Rang {index} sur {total}',
  'editor.rankFront': 'Rang {index} sur {total}, premier plan',
  'editor.rankBack': 'Rang {index} sur {total}, arrière-plan',

  /* -------------------------------------------------- le calque et sa barre d'outils */

  'editor.layerLabel': 'Édition de la page : flèches pour déplacer, Maj + flèches pour ' +
    'redimensionner, Ctrl + flèches haut/bas pour changer de rang, Ctrl + D pour dupliquer, ' +
    'Suppr pour supprimer',
  'editor.toolbarLabel': 'Actions sur le gadget sélectionné',

  /** L'infobulle d'un bouton : ce qu'il fait, puis le raccourci qui fait la même chose. */
  'editor.toolTitle': '{label} ({keys})',

  /**
   * Les noms de touches suivent le **clavier du pilote**, pas le nôtre : l'allemand écrit
   * *Strg* et *Entf*, l'espagnol *Mayús* et *Supr*.
   */
  'editor.sendToBack': 'Envoyer à l’arrière-plan',
  'editor.sendToBackKeys': 'Ctrl + Maj + Flèche bas',
  'editor.lowerOne': 'Reculer d’un rang',
  'editor.lowerOneKeys': 'Ctrl + Flèche bas',
  'editor.raiseOne': 'Avancer d’un rang',
  'editor.raiseOneKeys': 'Ctrl + Flèche haut',
  'editor.bringToFront': 'Mettre au premier plan',
  'editor.bringToFrontKeys': 'Ctrl + Maj + Flèche haut',
  'editor.duplicate': 'Dupliquer',
  'editor.duplicateWidget': 'Dupliquer le gadget',
  'editor.duplicateKeys': 'Ctrl + D',
  'editor.delete': 'Supprimer',
  'editor.deleteWidget': 'Supprimer le gadget',
  'editor.deleteKeys': 'Suppr',

  /* ------------------------------------------------ ce que le calque annonce à voix haute */

  'editor.noSelection': 'Aucun gadget sélectionné.',
  'editor.selected': '{name} sélectionné, {size}.',

  'editor.emptyPage': 'Page vide',
  'editor.pageTally': {
    one: '{count} gadget sur la page',
    other: '{count} gadgets sur la page'
  },

  /**
   * Les trois annonces d'après-action. `{what}` reçoit le nom du geste (`editor.deleteNamed`
   * et ses voisins) et `{tally}` / `{rank}` une phrase déjà accordée : un message n'en
   * imbrique pas un autre, l'appelant les assemble.
   */
  'editor.doneWithTally': '{what}. {tally}.',
  'editor.doneWithRank': '{what}. {rank}.',
  'editor.doneWithSize': '{what} : {size}.',

  /** Le rang est déjà atteint : rien n'a été écrit, mais le silence ferait douter du bouton. */
  'editor.nothingToChange': '{rank}, rien à changer.',

  /* =============================== `main.ts` — le cadre : barre de tête, menu, accueil */

  /** Le nom que cette application se donne. Ce n'est pas celui de XCTrack. */
  'app.name': 'Configuration XCTrack',

  /**
   * Le badge de mode ne dit qu'**une** chose, et seulement quand elle est vraie. Deux
   * écritures parce que ce sont deux emplois : une incise à côté du nom de l'outil, et un
   * badge en tête de la barre d'édition. Le français les distingue par la capitale ;
   * l'allemand ne le peut pas, d'où deux clés et non une capitalisation calculée.
   */
  'app.editingRole': 'édition',
  'app.editingBadge': 'Édition',

  'app.dropVeil': 'Déposez le fichier pour l’ouvrir',

  'app.settings': 'Réglages',
  'app.settingsHint': 'Réglages généraux — tout ce qui se règle hors des pages de gadgets : ' +
    'unités, touches, capteurs, son, espaces aériens.',

  /* -------------------------------------------------------------- le menu « Fichier » */

  'menu.file': 'Fichier',
  'menu.openFile': 'Ouvrir un fichier…',
  'menu.openFileHint': 'Choisir un .xcfg ou un .xczfg exporté depuis l’instrument. Le ' +
    'fichier reste sur cette machine.',
  'menu.library': 'Bibliothèque…',
  'menu.libraryHint': 'Ranger la configuration ouverte sous un nom, et retrouver celles ' +
    'déjà rangées. Tout reste dans ce navigateur : aucun serveur, aucun compte.',
  'menu.version': 'Version et compatibilité…',
  'menu.versionHint': 'Choisir la version de XCTrack visée, et voir ce que ce fichier porte ' +
    'qu’elle ne connaît pas — ou l’inverse.',
  'menu.manual': 'Manuel d’utilisation…',
  'menu.manualHint': 'Comment sortir le fichier de l’instrument, préparer ses pages, et ce ' +
    'qu’il ne faut jamais partager.',

  /* ------------------------------------------------------- les commandes de la barre */

  /**
   * Le bouton d'enregistrement dit **lequel des deux cas** va se produire : un document
   * intact ressort octet pour octet, un document modifié se réécrit. C'est aussi le seul
   * signal visible qu'un travail est en cours.
   */
  'app.saveCopy': 'Enregistrer une copie',
  'app.saveChanges': 'Enregistrer les modifications',

  /**
   * Les deux intitulés ne sont volontairement pas symétriques. Hors édition, le bouton est
   * le seul endroit où un pilote apprend que l'outil modifie : il le dit en entier. En
   * édition, il n'a plus rien à apprendre à personne et la barre est à son plus plein.
   */
  'app.editPages': 'Modifier les pages',
  'app.editPagesHint': 'Modifier les pages — déplacer, redimensionner et ajouter des gadgets.',
  'app.editSettings': 'Modifier les réglages',
  'app.editSettingsHint': 'Modifier les réglages — changer les valeurs des réglages généraux.',
  'app.inspect': 'Consulter',
  'app.inspectHint': 'Consulter — quitter le mode édition. Rien n’est défait.',

  /**
   * Le bouton ne porte qu'une flèche : la phrase entière est son **nom accessible**, et non
   * une simple infobulle — un lecteur d'écran annoncerait sinon « bouton », rien de plus.
   * Voir `action.redoNothing` et `action.redoNamed`, leurs symétriques.
   */
  'action.undoNothing': 'Rien à annuler',
  'action.undoNamed': 'Annuler : {what}',

  /* ------------------------------------------------------------------------ l'accueil */

  'landing.title': 'Préparez vos pages XCTrack avant de voler',
  'landing.lead': 'Ouvrez un fichier .xcfg ou .xczfg exporté depuis l’instrument : ses pages ' +
    's’affichent telles que l’appareil les dessine, à leur taille réelle. Déplacez un ' +
    'gadget, redimensionnez-le, ajoutez-en, puis récupérez une copie neuve à remettre sur ' +
    'la carte SD.',

  /**
   * Les deux garanties qui décident un pilote à confier sa configuration de vol à un site
   * web. Elles valent aussi quand on modifie, puisqu'on ne réécrit que ce qu'on a changé.
   */
  'landing.privacy': 'Votre fichier ne quitte pas cette machine : tout se passe dans ce ' +
    'navigateur, sans serveur et sans compte. Et ce que vous n’avez pas touché ressort ' +
    'exactement comme il est entré, sans une virgule réécrite — vos réglages resteront les ' +
    'vôtres.',

  'landing.dropHere': 'Déposez votre fichier ici',
  'landing.dropOrPick': 'ou cliquez pour le choisir — .xcfg ou .xczfg',

  'landing.stepDeviceTitle': 'Sur l’instrument',
  'landing.stepDeviceText': 'Réglages, puis « Exporter la configuration ». Le fichier ' +
    'atterrit sur la carte SD.',
  'landing.stepHereTitle': 'Ici',
  'landing.stepHereText': 'Les pages apparaissent numérotées dans l’ordre où « page ' +
    'suivante » les fait défiler en vol.',
  'landing.stepEditTitle': 'Modifier',
  'landing.stepEditText': 'Déplacez un gadget au doigt ou à la souris, changez sa taille, ' +
    'ajoutez-en d’autres : la page se redessine à sa taille réelle sous vos yeux.',
  'landing.stepKnowTitle': 'À savoir',
  'landing.stepKnowText': 'C’est le réglage « navigations » d’une page, et non son type, qui ' +
    'décide des moments où l’appareil la montre.',

  'landing.returning': 'Déjà venu ? Les configurations que vous avez rangées sont dans le ' +
    'menu « Fichier », en haut à droite, sous « Bibliothèque » : elles ne sont jamais ' +
    'parties de ce navigateur.',
  'landing.readManual': 'Lire le manuel d’utilisation',

  /* --------------------------------------- le sélecteur de langue de l’interface */

  /**
   * Deux réglages de langue cohabitent dans cet outil et un seul agit sur les mots qu’on
   * lit ici. Chacune des deux mentions dit donc **de quel axe elle parle** : celle-ci
   * nomme l’interface, `app.metaLabels` nomme XCTrack. Voir `src/i18n/axes.ts`.
   */
  'app.uiLanguage': 'Langue de l’interface',
  'app.uiLanguageNamed': 'Langue de l’interface : {name}',
  'app.uiLanguageHint': 'Choisir la langue de cette interface. Les libellés de XCTrack, eux, ne changent pas.',
  'app.uiLanguageLead': 'Les mots de cette interface : intitulés, explications, avertissements. Le choix est retenu par ce navigateur.',
  'app.labelsAxisLead': 'Les noms de gadgets, d’options et de réglages, tels que votre instrument les affiche. Ils viennent du fichier ouvert, et ce choix-ci ne les change pas.',
  'app.languageDialogTitle': 'Langues',
  'app.languageFailedTitle': 'La langue n’a pas pu être chargée',

  /* ============================================ `main.ts` — ce que le fichier déclare */

  'app.metaFormat': 'Format',
  'app.containerArchive': 'archive .xczfg',
  'app.containerPlain': 'fichier .xcfg',
  'app.metaDevice': 'Appareil du fichier',
  'app.notDeclared': 'non déclaré',
  'app.metaLabels': 'Libellés de XCTrack',
  'app.labelsFromBrowser': '{language} (langue du navigateur)',
  'app.labelsFromFile': '{language} (déclaré par le fichier)',
  'app.metaRenderSettings': 'Réglages de rendu',
  'app.renderSettingsAssumed': 'valeurs supposées, absentes du fichier',

  'app.overviewTitle': 'Pages de la configuration',

  /**
   * « éléments » ne nommait rien : selon l'avertissement, ce sont des pages, des gadgets,
   * des fichiers ou des lignes du fichier. Le titre de la carte, juste au-dessus, dit déjà
   * de quoi il s'agit ; il ne manque que le nombre.
   */
  'app.seeDetail': 'Voir le détail ({count})',
  'app.attentionTitle': 'À vérifier dans ce fichier',
  'app.revealsTitle': 'Ce que ce fichier révèle de vous',

  'app.editModeNote': 'Mode édition : ouvrez une page pour y ajouter des gadgets, les ' +
    'déplacer et régler leurs options. Les pages elles-mêmes — en insérer, en dupliquer, ' +
    'en supprimer, changer leur ordre — se gèrent ici.',

  /* ================================================ `main.ts` — le bandeau de réglages */

  /** Le compte des lignes du panneau. Voisin de `preferences.settingCount`, jamais le même. */
  'dock.settingCount': {
    one: '{count} réglage',
    other: '{count} réglages'
  },
  /** Ce que le pilote a effectivement changé, dit dès la barre de tête du bandeau. */
  /**
   * En consultation, la barre de tête du bandeau dit les deux comptes. Le point médian et
   * les espaces qui l'entourent appartiennent au message : c'est de la ponctuation, et une
   * langue peut en changer.
   */
  'dock.countPair': '{settings} · {customized}',
  'dock.customizedCount': {
    one: '{count} personnalisé',
    other: '{count} personnalisés'
  },

  'dock.label': 'Gadgets de la page et réglages du gadget sélectionné',
  'dock.labelReadOnly': 'Gadgets de la page et réglages du gadget sélectionné, en lecture seule',

  'dock.gripLabel': 'Hauteur du bandeau de réglages',
  'dock.gripHint': 'Glissez pour changer la hauteur du bandeau — au clavier, flèches haut et ' +
    'bas, Page↑ et Page↓ par crans larges, Origine et Fin aux extrêmes.',
  /** Ce que le lecteur d'écran dit de la hauteur courante. */
  'dock.heightPixels': {
    one: '{count} pixel',
    other: '{count} pixels'
  },

  /**
   * Replié, le bandeau emporte la liste des gadgets avec ses réglages — et la liste est le
   * seul chemin vers les gadgets qu'aucun clic n'atteint. Sans sélection, le bouton nomme
   * donc ce que le dépliage donne à cet instant.
   */
  'dock.widgetList': 'Liste des gadgets',
  'dock.expandSettings': 'Déplier les réglages',
  'dock.collapse': 'Replier',
  'dock.showList': 'Afficher la liste',
  'dock.hideList': 'Masquer la liste',

  'dock.noSelection': 'Aucun gadget sélectionné',
  'dock.selectionRank': '{name} — rang {index} sur {total}',
  /** Sans sélection, la barre de tête n'annonce pas un manque : elle dit le geste à faire. */
  'dock.chooseWidget': 'Choisissez un gadget pour voir ses réglages',
  'dock.hintEditing': 'Cliquez un gadget sur la page : ses réglages apparaissent ici, dans ' +
    'l’ordre où l’instrument les présente.',
  'dock.hintInspecting': 'Cliquez un gadget sur la page — ou choisissez-le dans la liste — ' +
    'pour lire ses réglages. Rien n’est modifiable ici : c’est la consultation.',
  'dock.loadingSettings': 'Chargement des réglages…',

  /* ============================================== `main.ts` — la barre d'édition */

  'app.addWidget': 'Ajouter un gadget',
  'app.managePages': 'Gérer les pages',
  /** La grille de l'appareil : c'est elle qui explique qu'un gadget ne se pose pas où on l'a lâché. */
  'app.gridSize': 'Grille {cols} × {rows}',
  'app.editKeysHint': 'Glisser : déplacer · équerres et segments : redimensionner · ' +
    'flèches : une cellule · Maj + flèches : redimensionner · Ctrl + flèches : changer de ' +
    'rang · Ctrl + D : dupliquer · Suppr : supprimer · Échap : désélectionner',

  /** Le pas d'historique d'une valeur écrite dans le panneau. */
  'app.setSettingNamed': 'Régler {label} — {name}',

  'app.pageHasNoWidgetSlot': 'Cette page n’a pas d’emplacement pour des gadgets. Cet outil ne ' +
    'peut pas en créer un : il n’invente rien que le fichier ne porte déjà.',

  'app.managePagesLead': 'Insérer, dupliquer, supprimer, réordonner. Chaque opération est ' +
    'enregistrée : « Annuler » la défait comme le reste. La classe d’une page, elle, n’est ' +
    'pas proposée à la modification — XCTrack la fixe à la création, et l’effet d’un ' +
    'changement après coup n’a pas été vérifié sur l’appareil.',

  // ⚠️ Sur une seule ligne, et il le faut : une concaténation par `+` perd le type
  // littéral, donc le repère `{detail}` que `t()` extrait du texte. Toute phrase à repère
  // s'écrit d'un trait.
  'app.pageOperationFailed': 'Cette modification n’a pas pu être faite : vos pages n’ont pas bougé. Détail technique : {detail}',

  /* ================================= `main.ts` — les boîtes, et ce qu'elles chargent */

  'app.manualTitle': 'Manuel d’utilisation',
  'app.close': 'Fermer',
  'app.loading': 'Chargement…',

  /**
   * Le mot `Error:` vient du moteur JavaScript ; il n'est ni traduit ni traduisible, et il
   * arrive au moment précis où le pilote vient de confier son fichier à cet outil. Il passe
   * derrière ce triangle — l'explication d'abord, la mécanique ensuite.
   */
  'app.technicalDetail': 'Détail technique',

  'app.loadingSettingsPage': 'Chargement des réglages généraux…',
  'app.settingsFailedTitle': 'Les réglages généraux n’ont pas pu s’ouvrir',
  'app.settingsFailedMessage': 'La liste des réglages que XCTrack propose n’a pas pu être chargée.',
  /** Dit par les deux échecs de module : ce n'est jamais le fichier du pilote qui est en cause. */
  'app.fileNotAtFault': 'Le fichier, lui, n’est pas en cause : il reste ouvert et intact.',
  'app.backToPages': 'Revenir aux pages',

  'app.manualFailedTitle': 'Le manuel n’a pas pu s’ouvrir',
  'app.fileUntouchedRetry': 'Votre fichier n’a pas bougé. Réessayez.',

  'app.versionDialogTitle': 'Version visée et compatibilité',
  'app.versionLead': 'Le format de XCTrack change à chaque version. Choisissez la version ' +
    'visée : l’éditeur dit alors ce que ce fichier porte qu’elle ne connaît pas, et ce ' +
    'qu’elle attend qu’il n’a pas. C’est un constat : rien ne bouge tant que vous ne le ' +
    'demandez pas.',
  'app.loadingVersions': 'Chargement de la base des versions…',
  'app.versionFailedTitle': 'Le diagnostic de version n’a pas pu s’ouvrir',
  'app.versionFailedMessage': 'La liste des versions de XCTrack n’a pas pu être chargée.',

  'app.libraryFailedTitle': 'La bibliothèque n’a pas pu s’ouvrir',
  'app.libraryFailedMessage': 'Votre navigateur n’a pas donné accès au rangement de cet ' +
    'outil. Le fichier ouvert, lui, n’a pas bougé.',

  'app.exportDialogFailedTitle': 'La boîte d’enregistrement n’a pas pu s’ouvrir',
  'app.exportDialogFailedMessage': 'Rien n’a été enregistré et votre fichier n’a pas bougé. ' +
    'Réessayez.',

  /* ======================================= `main.ts` — ce qui va de travers à l'ouverture */

  'app.openFailedTitle': 'Ce fichier n’a pas pu être ouvert',
  'app.openFailedMessage': 'Cet outil n’a rien su en tirer. Le fichier, lui, n’a pas été modifié.',
  'app.openFailedHint': 'Vérifiez qu’il s’agit bien d’un export XCTrack (.xcfg ou .xczfg). ' +
    'Vous pouvez déposer un autre fichier n’importe où sur cette page, ou le choisir dans le ' +
    'menu « Fichier », en haut à droite.',

  'app.unreadableTitle': 'Ce fichier n’a pas pu être lu',
  'app.unreadableMessage': 'Vérifiez que c’est bien le fichier .xcfg ou .xczfg produit par ' +
    '« Réglages → Exporter la configuration » sur l’instrument, et qu’il est entier.',
  'app.unreadableHint': 'Ses octets sont conservés intacts : « Enregistrer une copie » vous ' +
    'le rend tel qu’il est entré, sans la moindre réécriture.',
  'app.unreadableIncoming': '« {incoming} » n’a rien donné d’exploitable. « {kept} » reste ouvert, et tout ce que vous y avez changé est toujours là.',

  /* ------------------------------------------ remplacer un document non enregistré */

  /**
   * La boîte dit **ce qui est perdu**, pas « êtes-vous sûr ». L'historique nomme ses pas —
   * « Régler Volume — Vario » —, c'est ce nom-là que le pilote reconnaît, et c'est lui qu'on
   * cite. Les guillemets appartiennent au message : « … » en français, “ … ” en anglais,
   * „ … “ en allemand, ‘ … ’ en néerlandais, « … » en espagnol.
   */
  'app.unsavedTitle': 'Vos modifications ne sont pas enregistrées',
  'app.replaceMessage': 'Ouvrir « {incoming} » referme « {kept} » et tout ce que vous venez d’y changer. Cet outil ne garde rien de lui-même : ce qui n’est pas enregistré est perdu.',
  'app.lastChange': 'Dernier changement en date : « {change} ».',
  'app.replaceHint': 'Pour ne rien perdre : gardez vos modifications, puis « Enregistrer les ' +
    'modifications » en haut de la page — ou rangez cette configuration dans la bibliothèque.',
  /** Nommé pour ce qu'il fait : « Ouvrir quand même » cacherait la perte derrière une concession. */
  'app.replaceAndLose': 'Ouvrir « {incoming} » et les perdre',
  'app.keepChanges': 'Garder mes modifications'
} as const

export default app

export type FrenchApp = typeof app
