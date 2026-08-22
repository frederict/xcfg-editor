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
  /**
   * Ce que dit la pastille du nom de classe — « WPEmpty », « WPCompetition » —, qui
   * paraissait nue à côté d'un titre déjà traduit.
   */
  'pageKind.shortNameTitle':
    'Le nom que le fichier donne à ce type de page. Il ne change pas d’une langue à l’autre : c’est ce que vous liriez en ouvrant le fichier.',

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

  /**
   * Le geste qui rouvre une page que rien n'appelle, sur la page ouverte elle-même.
   *
   * ⚠️ Le même libellé existe sous « pages.enableAllNavigations », pour le carrousel : deux
   * clés voisines dans deux domaines plutôt qu'un mot versé au vocabulaire partagé, et un
   * test vérifie qu'elles disent la même chose dans les cinq langues.
   */
  'view.enableAllNavigations': 'Activer pour toutes les navigations',

  /** « Paysage · Page libre » : l'orientation et la classe, dans le titre de la vue. */
  'view.detailLabel': '{orientation} · {kind}',

  'view.previousPage': 'Page précédente',
  'view.nextPage': 'Page suivante',

  /** Le rang de la page dans son orientation : « 3 / 5 ». */
  'view.position': '{index} / {total}',

  /** Graduation de la règle posée le long de la page, tous les cinq centimètres. */
  'view.rulerCentimeters': '{value} cm',

  /**
   * **Ni « survolez », ni « cliquez ».** Cet outil sert aussi sur la tablette qu'on emporte
   * — le survol n'y existe pas, et la phrase n'y disait rien de faisable. « Au doigt ou à
   * la souris » est déjà le tour employé par l'accueil pour le déplacement d'un gadget.
   */
  'view.pointHint': 'Désignez un gadget, au doigt ou à la souris, pour son nom et ses dimensions.',
  'view.pointHintSelectable': 'Désignez un gadget, au doigt ou à la souris, pour son nom et ' +
    'ses dimensions ; choisissez-le pour voir ses réglages.',

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

  /**
   * Le même texte que `dock.noSelection`, au point final près, et le doublon est **voulu** :
   * celui-ci est une **annonce vocale** — la zone d'annonce du calque d'édition —, l'autre
   * est le **titre** du bandeau. Le point donne sa pause au lecteur d'écran ; un titre n'en
   * porte pas. Les fondre en une clé obligerait l'un des deux à porter la ponctuation de
   * l'autre, et les deux textes ne suivront pas forcément le même chemin ensuite.
   */
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
  /**
   * Le chemin sur l'instrument s'écrit **d'une seule façon** dans toute l'application —
   * ici et dans `app.unreadableMessage`. La flèche « Réglages → … » qu'employait l'écran
   * d'erreur ne se dit pas à voix haute et ne se cherche pas ; les noms de menu, eux, se
   * lisent sur l'appareil.
   *
   * ⚠️ **Les trois noms sont mesurés, et le premier était faux.** L'accueil disait
   * « Réglages » : ce mot n'existe nulle part dans XCTrack, et le pilote d'essai du
   * 22 août l'a cherché un moment sur son AIR³ avant de comprendre. Le vrai chemin fait
   * **trois écrans**, relevés sur les 55 versions d'APK du dépôt privé (`menu_preferences`,
   * `prefShareConfig`, `prefExportConfig`) — et stables sur toutes :
   *
   * | | fr | en | de | es | nl |
   * |---|---|---|---|---|---|
   * | `menu_preferences` | Préférences | Preferences | Einstellungen | Preferencias | Voorkeuren |
   * | `prefShareConfig` | Export et import de la config | Export & import config | Export & Import Konfiguration | Configuración exportación e importación | Ex- & importeer configuratie |
   * | `prefExportConfig` | Exporter la configuration | Export configuration | Exportiere Konfiguration | Exportar la configuración | Configuratie exporteren |
   *
   * Les deux derniers sont dans `src/catalog/preferenceCatalog/<langue>.json`, et
   * `tests/ui/enregistrement.test.ts` vérifie que ces deux messages-ci les citent
   * exactement. Le premier ne l'est pas — les ressources de chrome ne sont pas versées au
   * dépôt public — et ne peut donc être gardé que par la relecture.
   */
  'landing.stepDeviceText': '« Préférences », « Export et import de la config », puis ' +
    '« Exporter la configuration ». Le fichier atterrit sur la carte SD.',
  'landing.stepHereTitle': 'Ici',
  'landing.stepHereText': 'Les pages apparaissent numérotées dans l’ordre où « page ' +
    'suivante » les fait défiler en vol.',
  'landing.stepEditTitle': 'Modifier',
  'landing.stepEditText': 'Déplacez un gadget au doigt ou à la souris, changez sa taille, ' +
    'ajoutez-en d’autres : la page se redessine à sa taille réelle sous vos yeux.',
  'landing.stepKnowTitle': 'À savoir',
  /**
   * ⚠️ **Le nom du réglage tel qu'il s'écrit dans le fichier n'est pas ici.** La phrase
   * a dit « le réglage « navigations » d'une page » jusqu'au 2026-08-22, et un
   * pilote-testeur l'a arrêtée net : « avant d'avoir ouvert quoi que ce soit, cette
   * phrase ne me dit rien — « navigations » n'est pas un mot que j'ai déjà vu dans
   * XCTrack. » Il avait raison sur les deux bords : le mot ne se lit nulle part sur
   * l'appareil, et l'accueil est l'écran de quelqu'un qui n'a encore rien vu.
   *
   * Le fait, lui, reste — c'est celui qui a démenti le badge « Masquée hors vol », et un
   * pilote qui l'ignore croit lire dans le type d'une page ce qu'il n'y a pas. Il se dit
   * donc sans son nom de fichier ; le mot exact, le pilote le rencontrera dans
   * « Gérer les pages », où « Affichée pour toutes les navigations » le porte dans une
   * phrase entière — que le même pilote a trouvée « parfaitement claire ».
   */
  'landing.stepKnowText': 'Ce n’est pas le type d’une page qui décide quand l’appareil ' +
    'l’affiche en vol, mais un réglage à part — et cet éditeur vous le dit page par page, ' +
    'en toutes lettres.',

  'landing.returning': 'Déjà venu ? Les configurations que vous avez rangées sont dans le ' +
    'menu « Fichier », en haut à droite, sous « Bibliothèque » : elles ne sont jamais ' +
    'parties de ce navigateur.',
  /**
   * L'accueil est l'écran de quelqu'un qui n'a rien ouvert : soit il sait quoi faire et
   * dépose son fichier, soit il ne sait pas — et le manuel est alors la seule chose dont
   * il ait besoin. Une phrase dit ce qu'on y trouve ; l'intitulé seul ne le disait pas,
   * et un pilote-testeur a découvert par le manuel qu'un export « pages » n'était pas
   * anonyme, ce qu'il croyait exactement l'inverse.
   */
  'landing.manualLead': 'Première fois ici ? Le manuel dit ce que fait cet outil, ce qui a été mesuré sur l’appareil, et ce qu’un fichier de configuration révèle de vous.',
  'landing.readManual': 'Lire le manuel d’utilisation',

  /* --------------------------------------- le sélecteur de langue de l’interface */

  /**
   * Deux réglages de langue cohabitent dans cet outil et un seul agit sur les mots qu’on
   * lit ici. Chacune des deux mentions dit donc **de quel axe elle parle** : celle-ci
   * nomme l’interface, `app.metaLabels` nomme XCTrack. Voir `src/i18n/axes.ts`.
   */
  'app.uiLanguage': 'Langue de l’interface',
  'app.uiLanguageNamed': 'Langue de l’interface : {name}',
  'app.uiLanguageHint': 'Choisir la langue de cette interface. Les libellés de XCTrack, eux, suivent le fichier ouvert.',
  'app.uiLanguageLead': 'Les mots de cette interface : intitulés, explications, avertissements. Le choix est retenu par ce navigateur.',
  'app.labelsAxisLead': 'Les noms de gadgets, d’options et de réglages, tels que votre instrument les affiche. Ils viennent du fichier ouvert ; quand il n’en déclare aucune, ils suivent la langue choisie ci-dessus.',
  'app.languageDialogTitle': 'Langues',
  'app.languageFailedTitle': 'La langue n’a pas pu être chargée',

  /* ============================================ `main.ts` — ce que le fichier déclare */

  'app.metaFormat': 'Format',
  /**
   * ⚠️ Une archive **dit ce qu'elle transporte**. `app.containerArchive` ne le disait pas,
   * et il a fallu qu'un pilote-testeur ouvre l'archive lui-même le 2026-08-22 pour savoir
   * qu'elle ne portait que son `.xcfg` — pendant que la page listait, juste à côté, quatre
   * fichiers extérieurs « pas dans cette configuration ».
   */
  'app.containerArchiveAlone': 'archive .xczfg — elle ne contient que {inner}, aucun fichier annexe',
  'app.containerArchiveWith': 'archive .xczfg — elle contient {inner} et {annexes}',
  'app.annexCount': {
    one: '{count} fichier annexe',
    other: '{count} fichiers annexes'
  },
  'app.containerPlain': 'fichier .xcfg',
  'app.metaDevice': 'Appareil du fichier',
  'app.notDeclared': 'non déclaré',
  'app.metaLabels': 'Libellés de XCTrack',
  'app.labelsFromBrowser': '{language} (langue du navigateur)',
  'app.labelsFromUi': '{language} (langue de l’interface)',
  'app.labelsFromFile': '{language} (déclaré par le fichier)',
  'app.metaRenderSettings': 'Réglages de rendu',
  'app.renderSettingsAssumed': 'valeurs supposées, absentes du fichier',

  'app.overviewTitle': 'Pages de la configuration',

  /**
   * « éléments » ne nommait rien : selon l'avertissement, ce sont des pages, des gadgets,
   * des fichiers ou des lignes du fichier. Le titre de la carte, juste au-dessus, dit déjà
   * de quoi il s'agit ; il ne manque que le nombre.
   */
  'app.seeDetail': {
    one: 'Voir le détail ({count})',
    other: 'Voir les détails ({count})'
  },
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
    'bas, Page↑ et Page↓ par crans larges, Début et Fin aux extrêmes.',
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

  /** Titre du bandeau, sans point final ; l'annonce vocale est `editor.noSelection`. */
  'dock.noSelection': 'Aucun gadget sélectionné',
  'dock.selectionRank': '{name} — rang {index} sur {total}',
  /** Sans sélection, la barre de tête n'annonce pas un manque : elle dit le geste à faire. */
  'dock.chooseWidget': 'Choisissez un gadget pour voir ses réglages',
  'dock.hintEditing': 'Cliquez un gadget sur la page : ses réglages apparaissent ici, dans ' +
    'l’ordre où l’instrument les présente.',
  'dock.hintInspecting': 'Cliquez un gadget sur la page — ou choisissez-le dans la liste — ' +
    'pour lire ses réglages. Rien n’est modifiable ici : c’est la consultation.',
  /**
   * ⚠ **Un renseignement, pas une alarme.** La page qui ne tient pas entière entre la barre
   * de tête et le bandeau est la situation NORMALE d'une fenêtre courte, et celle de toute
   * page en portrait : rien n'y est cassé, ni le fichier, ni un geste du pilote. Le ton le
   * dit — pas de « attention », pas d'impératif, pas de coupable.
   *
   * Ce que le pilote d'essai du 22 août n'avait pas, ce n'est pas le diagnostic : il avait
   * trouvé les deux issues tout seul. C'est **le prix de chacune**, qu'il n'a découvert
   * qu'en le payant. Les deux phrases le nomment donc avant lui, et la seconde dit en plus
   * le cran de zoom exact — celui qu'il avait dû chercher à la glissière.
   */
  'dock.cramped': 'Cette fenêtre est trop courte pour montrer la page entière et ses ' +
    'réglages à la fois. « Replier » rend à la page la place du bandeau, mais vous prend ' +
    'les réglages ; et ici, aucun cran de zoom ne la montre entière.',
  /** ⚠ Un seul littéral : un `+` rendrait `{level}` invisible au compilateur (§ 3 bis). */
  'dock.crampedZoom': 'Cette fenêtre est trop courte pour montrer la page entière et ses réglages à la fois. « Replier » rend à la page la place du bandeau, mais vous prend les réglages ; le zoom à {level} la montre entière, mais plus à sa taille réelle.',

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
    'enregistrée : « Annuler » la défait comme le reste. La classe d’une page, elle, n’est ' +
    'pas proposée à la modification — XCTrack la fixe à la création, et l’effet d’un ' +
    'changement après coup n’a pas été vérifié sur l’appareil.',

  // ⚠️ Sur une seule ligne, et il le faut : une concaténation par `+` perd le type
  // littéral, donc le repère `{detail}` que `t()` extrait du texte. Toute phrase à repère
  // s'écrit d'un trait.
  'app.pageOperationFailed': 'Cette modification n’a pas pu être faite : vos pages n’ont pas bougé. Détail technique : {detail}',

  /* ================================= `main.ts` — les boîtes, et ce qu'elles chargent */

  'app.repository': 'Le projet sur GitHub — signaler un problème, proposer une amélioration',
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

  'app.manualBack': 'Fermer le manuel',
  /**
   * La pastille qui ramène au sommaire, en fenêtre étroite seulement.
   *
   * Un seul mot : elle flotte au-dessus du texte, et le sommaire qu'elle vise porte
   * déjà son intitulé entier — « Ce que contient ce manuel », écrit dans le fragment.
   * En fenêtre large, la colonne est là en permanence et la pastille ne paraît pas.
   */
  'app.manualToc': 'Sommaire',
  'app.loadingManual': 'Chargement du manuel…',
  'app.manualFailedMessage': 'Rien n’a bougé dans votre fichier. Réessayez.',
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

  /* ------------------------------------------- le reçu : ce qui vient d'être remis */

  /**
   * ⚠️ Ce que cette phrase dit, et ce qu'elle se garde de dire.
   *
   * Elle ne dit **pas** « c'est enregistré », et depuis le contre-essai du 22 août elle ne
   * dit plus non plus « est parti » : partir est un fait que cette page ne constate pas.
   * Ce qu'elle constate, c'est ce qu'elle a fait — un fichier, ce nom-là, cette taille-là,
   * et une demande adressée au navigateur. Le reste appartient au navigateur, qui ne rend
   * de compte à personne.
   *
   * **Mesuré deux fois.** Le 22 août au matin, Chrome, trois enregistrements de suite
   * depuis le même onglet : le premier arrive, les deux suivants sont refusés sans une
   * exception, sans un événement, sans rien. Le 22 août à midi, même geste dans deux
   * onglets : trois sur trois arrivés dans l'un, **zéro sur trois** dans l'autre — le
   * premier compris. Le refus ne dépend donc ni du rang de l'enregistrement, ni de quoi
   * que ce soit que cette page puisse lire.
   *
   * Un seul littéral : deux repères nommés y vivent (`src/i18n/CLAUDE.md`, § 3).
   */
  'app.exportHandedOver': '« {name} » ({size}) — cet outil a demandé à votre navigateur de l’enregistrer.',
  /**
   * Servie **à chaque enregistrement**, le premier compris.
   *
   * Elle l'était à partir du deuxième, sur la foi d'une mesure — « le premier passe
   * toujours » — que le contre-essai a démentie : zéro fichier sur trois, dans un onglet
   * où le reçu avait pourtant dit trois fois que le fichier partait. Un pilote qui
   * n'enregistre qu'une fois n'aurait jamais rien lu.
   *
   * ⚠ Ce n'est **pas** un avertissement, et elle ne doit jamais en prendre le ton : elle
   * paraît sur la situation normale, et un avertissement qui alarme sur la situation
   * normale apprend à sauter les avertissements. Elle dit **où regarder** — les
   * téléchargements —, pourquoi c'est au pilote de le faire — cette page n'y voit rien —,
   * et ce qu'il reste à faire dans le cas contraire. Rien d'autre.
   */
  'app.exportWhereToLook': 'À retrouver dans vos téléchargements — cette page ne voit pas ' +
    'ce qui s’y passe. S’il n’y est pas, autorisez les téléchargements pour ce site, ' +
    'puis recommencez.',
  'app.exportReceiptDismiss': 'Fermer ce reçu d’enregistrement',

  /**
   * Le seul échec que cet outil puisse **constater** : la fabrication du fichier. Il
   * n'était dit nulle part — l'appel n'avait pas de `catch`, et un rejet non traité dans
   * la console ressemblait, pour le pilote, à un enregistrement réussi.
   */
  'app.exportFailedTitle': 'Le fichier n’a pas pu être fabriqué',
  'app.exportFailedMessage': 'Rien n’est sorti de cet outil, et votre configuration n’a pas ' +
    'bougé. Réessayez.',

  /* ======================================= `main.ts` — ce qui va de travers à l'ouverture */

  'app.openFailedTitle': 'Ce fichier n’a pas pu être ouvert',
  'app.openFailedMessage': 'Cet outil n’a rien su en tirer. Le fichier, lui, n’a pas été modifié.',
  'app.openFailedHint': 'Vérifiez qu’il s’agit bien d’un export XCTrack (.xcfg ou .xczfg). ' +
    'Vous pouvez déposer un autre fichier n’importe où sur cette page, ou le choisir dans le ' +
    'menu « Fichier », en haut à droite.',

  'app.unreadableTitle': 'Ce fichier n’a pas pu être lu',
  'app.unreadableMessage': 'Vérifiez que c’est bien le fichier .xcfg ou .xczfg produit sur ' +
    'l’instrument par « Préférences », « Export et import de la config », puis ' +
    '« Exporter la configuration », et qu’il est entier.',
  'app.unreadableHint': 'Ses octets sont conservés intacts : « Enregistrer une copie » vous ' +
    'le rend tel qu’il est entré, sans la moindre réécriture.',
  'app.unreadableIncoming': '« {incoming} » n’a rien donné d’exploitable. « {kept} » reste ouvert, et tout ce que vous y avez changé est toujours là.',

  /* ------------------------------------------ remplacer un document non enregistré */

  /**
   * La boîte dit **ce qui est perdu**, pas « êtes-vous sûr ». L'historique nomme ses pas —
   * « Régler Volume — Vario » —, c'est ce nom-là que le pilote reconnaît, et c'est lui qu'on
   * cite. Les guillemets appartiennent au message : « … » en français, “ … ” en anglais,
   * „ … “ en allemand, ‘ … ’ en néerlandais, « … » en espagnol.
   */
  'app.unsavedTitle': 'Vos modifications ne sont pas enregistrées',
  'app.replaceMessage': 'Ouvrir « {incoming} » referme « {kept} » et tout ce que vous venez d’y changer. Cet outil ne garde rien de lui-même : ce qui n’est pas enregistré est perdu.',
  'app.lastChange': 'Dernier changement en date : « {change} ».',
  'app.replaceHint': 'Pour ne rien perdre : gardez vos modifications, puis « Enregistrer les ' +
    'modifications » en haut de la page — ou rangez cette configuration dans la bibliothèque.',
  /** Nommé pour ce qu'il fait : « Ouvrir quand même » cacherait la perte derrière une concession. */
  'app.replaceAndLose': 'Ouvrir « {incoming} » et les perdre',
  'app.keepChanges': 'Garder mes modifications'
} as const

export default app

export type FrenchApp = typeof app
