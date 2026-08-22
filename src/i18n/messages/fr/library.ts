/**
 * `libraryPanel.ts` — la bibliothèque de configurations rangées.
 *
 * ## Le vocabulaire de cet écran, et ce qu'il refuse de dire
 *
 * « replacée » et non « rétablie » : c'est le troisième sens de « rétablir », et les deux
 * autres sont dans le domaine `app`. Voir l'en-tête de `app.ts`.
 *
 * Les mots que cet écran a perdus en août 2026 et qui ne doivent pas revenir : « magasin »
 * (c'est **la bibliothèque**), « révision 3 » (« **enregistrée 3 fois** »), « purgé »
 * (« **empêcher le navigateur d'effacer ma bibliothèque** »), « quota » et « estimation
 * floutée » (« **la place employée**, dont le navigateur ne donne qu'un ordre de
 * grandeur »).
 *
 * ## Les guillemets appartiennent au message
 *
 * Un nom d'entrée, un nom de fichier, un format d'export cité : le code ne pose jamais les
 * guillemets, le message les porte. Ils ne s'écrivent pas pareil dans les cinq langues —
 * « … » en français, “ … ” en anglais, „ … “ en allemand, ‘ … ’ en néerlandais, « … » en
 * espagnol, sans espace intérieur.
 *
 * ## Les phrases à trou
 *
 * Quatre messages reçoivent une **sous-phrase déjà accordée** plutôt qu'un nombre :
 * `library.personalSummary` (trois), `library.widgetsOfTypes`, `library.exported` et
 * `library.importedWithRejected`. C'est la seule façon de faire porter deux accords à une
 * même phrase sans la découper — et un fragment découpé n'a pas d'équivalent en allemand.
 */
const library = {
  /* ------------------------------------------------------------------ la tête et le pied */

  'library.panelLabel': 'Bibliothèque de configurations',
  'library.title': 'Mes configurations',
  'library.lead':
    'Gardez plusieurs configurations sous un nom, dans ce navigateur, et revenez à l’une d’elles quand vous voulez. Rien n’est envoyé nulle part : tout reste sur cet appareil. Les octets rangés sont ceux de votre fichier, jamais une copie réécrite.',
  'library.storeCurrent': 'Ranger la configuration ouverte',
  'library.addFile': 'Ranger un fichier…',
  'library.exportAll': 'Exporter la bibliothèque',
  'library.importAll': 'Importer une bibliothèque…',
  'library.close': 'Fermer',

  'library.empty':
    'Rien de rangé pour l’instant. Rangez la configuration ouverte, ou glissez-y un fichier .xcfg déjà exporté : il gardera son nom, sa date et ses octets.',

  /**
   * Le pied. `{size}` et `{broken}` sont des sous-phrases **ou rien** : une bibliothèque
   * vide ne dit pas « 0 o au total », et une bibliothèque saine ne parle pas d'entrées
   * illisibles.
   */
  'library.footCount': {
    one: '{count} configuration rangée{size}{broken}.',
    other: '{count} configurations rangées{size}{broken}.'
  },
  'library.footTotalSize': ' — {size} au total',
  'library.footBroken': {
    one: ', {count} entrée illisible',
    other: ', {count} entrées illisibles'
  },

  /* ------------------------------------------------------------ le rangement du navigateur */

  'library.notDurableTitle': 'Rangement non durable',
  'library.notDurableText':
    'Ce navigateur n’accorde pas de rangement persistant à cette page : ce que vous rangez ici vivra le temps de l’onglet, puis disparaîtra. La bibliothèque reste utilisable — mais ce n’est pas une sauvegarde. Exportez-la avant de fermer.',

  'library.preventErase': 'Empêcher le navigateur d’effacer ma bibliothèque',
  'library.persistenceGranted':
    'Le navigateur a accepté. Ce n’est jamais une garantie : certains effacent tout de même les données d’un site non visité depuis sept jours. La seule sauvegarde qui tienne est l’archive que vous exportez.',
  'library.persistenceDenied':
    'Le navigateur a refusé. La bibliothèque fonctionne toujours, mais il peut l’effacer : exportez-la régulièrement.',
  'library.persistenceUnsupported':
    'Ce navigateur ne propose pas ce réglage. Exportez votre bibliothèque régulièrement.',

  'library.storageUnknown': 'Ce navigateur ne dit rien de l’espace disponible.',
  'library.storageEstimate':
    'Place employée par ce site : {usage} sur {quota} accordés — le navigateur n’en donne qu’un ordre de grandeur.',

  /* --------------------------------------------------------------- les niveaux du panneau */

  'library.backToList': '← Retour à la liste',
  'library.back': '← Retour',
  'library.returnToList': 'Retour à la liste',
  'library.cancel': 'Annuler',
  /** Dit par le `role="status"` : ce que la `<dialog>` annonçait toute seule en s'ouvrant. */
  'library.announceBackToList': 'Retour à la liste des configurations.',
  'library.announceBackTo': 'Retour : {title}.',

  /* --------------------------------------------------------- les boutons d'une entrée */

  'library.load': 'Charger',
  'library.extract': 'Ressortir le fichier',
  'library.identity': 'Carte d’identité',
  'library.verify': 'Vérifier l’empreinte',
  'library.rename': 'Renommer',
  'library.remove': 'Supprimer',
  'library.store': 'Ranger',
  'library.save': 'Enregistrer',

  /* --------------------------------------------------------------- une entrée dans la liste */

  'library.entryStamp': 'Rangée le {when} · {file}',
  'library.unknownFileName': 'fichier inconnu',
  'library.chipArchive': 'archive .xczfg',
  'library.personalCount': {
    one: '{count} donnée personnelle',
    other: '{count} données personnelles'
  },
  'library.personalTravellingCount': {
    one: '{count} part avec les pages',
    other: '{count} partent avec les pages'
  },

  /* ------------------------------------------------------------------- le format d'export */

  'library.exportTypeBackup': 'Sauvegarde complète (pages et préférences)',
  'library.exportTypePages': 'Pages seules (aucune préférence)',
  'library.exportTypeUndeclared': 'Non déclaré par le fichier',
  'library.chipBackup': 'Sauvegarde',
  'library.chipPages': 'Pages seules',
  'library.chipUndeclared': 'Type non déclaré',

  /* ------------------------------------------- la carte d'identité : ce que le fichier dit */

  'library.identityTitle': 'Carte d’identité — {name}',
  'library.identityLead':
    'Deux moitiés, jamais mélangées : ce que le fichier déclare, et ce que cet éditeur en suppose. Tout ce qui est supposé peut être faux sans que le fichier soit en cause.',
  'library.readNote':
    'Lu tel quel dans les octets rangés. Un champ absent est dit absent, jamais remplacé par une valeur par défaut.',
  'library.assumedNote':
    'Rien de ceci n’est dans le fichier. L’appareil et sa résolution viennent de notre table ; savoir qu’un gadget est réservé à la version Pro vient d’un catalogue extrait de l’APK.',

  'library.factExportType': 'Format d’export',
  'library.factExportTypeNote': 'Clé info.exportType.',

  'library.factContainer': 'Conteneur',
  'library.containerArchive': {
    one: 'Archive .xczfg — {count} fichier annexe',
    other: 'Archive .xczfg — {count} fichiers annexes'
  },
  'library.containerPlain': 'Fichier .xcfg',
  'library.containerExtrasNote': 'Annexes : {names}. Cet éditeur n’en inspecte pas le contenu.',

  'library.factSize': 'Taille',

  'library.factVersion': 'Version de XCTrack déclarée',
  'library.versionAbsent': 'Le fichier ne la dit pas',
  'library.versionValue': '{name} — code {code}',
  'library.versionNameAbsent': '(nom absent)',
  'library.versionCodeAbsent': '(absent)',
  'library.factVersionNote': 'Clés info.versionName et info.versionCode.',

  'library.factDevice': 'Appareil déclaré',
  'library.deviceAbsent': 'Le fichier ne le dit pas',
  'library.factDeviceNote': 'Chaîne brute de info.device. Elle ne porte aucune résolution.',

  'library.factPages': 'Pages',
  'library.noPage': 'aucune page',
  'library.landscapePageCount': {
    one: '{count} page paysage',
    other: '{count} pages paysage'
  },
  'library.portraitPageCount': {
    one: '{count} page portrait',
    other: '{count} pages portrait'
  },

  'library.factWidgets': 'Gadgets',
  /** `{types}` reçoit `library.typeCount`, déjà accordé : deux nombres, une seule phrase. */
  'library.widgetsOfTypes': {
    one: '{count} gadget de {types}',
    other: '{count} gadgets de {types}'
  },
  'library.typeCount': { one: '{count} type', other: '{count} types' },
  'library.topTypesNote': 'Les plus employés : {types}.',

  'library.factRootSections': 'Sections de premier niveau',
  'library.noRootSection': 'aucune',

  'library.factSettings': 'Réglages enregistrés',
  'library.settingsNone': 'aucune — ce fichier ne transporte pas vos préférences',
  'library.settingLineCount': { one: '{count} ligne', other: '{count} lignes' },
  'library.settingsNote':
    'Cet éditeur ne sait en nommer que quelques familles : le compte est là pour que le reste reste visible.',

  'library.factDuplicates': 'Lignes en double',
  'library.duplicateLineCount': {
    one: '{count} ligne en double',
    other: '{count} lignes en double'
  },
  'library.duplicatesNote': 'XCTrack n’en lira qu’une : {keys}.',

  'library.factExternal': 'Ressources extérieures attendues',
  'library.externalNote':
    'Ces fichiers doivent exister sur l’appareil d’arrivée ; ils ne sont pas dans la configuration.',

  'library.factParse': 'Analyse',
  'library.parseFailed': 'Le contenu n’a pas pu être analysé',
  'library.parseNote':
    'Les octets sont rangés et ressortiront tels quels ; c’est leur description qui manque. Détail technique : {detail}.',

  /* ------------------------------------------ la carte d'identité : ce que l'éditeur suppose */

  /**
   * Le gabarit reconnu s'écrit dans le code — « AIR³ 7.2 — 1280 × 720 px » n'a pas un mot
   * à traduire, et sa résolution ne se met pas en forme.
   */
  'library.factScreen': 'Gabarit d’écran retenu',
  'library.screenFallback': '{device} — gabarit de repli, aucun appareil reconnu',
  'library.factScreenNote':
    'La résolution vient de la table d’appareils de cet éditeur, pas du fichier.',

  'library.factPro': 'Gadgets « Pro »',
  'library.proUnknown': 'Inconnu — aucun catalogue de gadgets n’a été fourni',
  'library.proNone': 'Aucun',
  'library.proUnknownNote':
    'On ne devine pas si un gadget est réservé à la version Pro : sans catalogue, on ne dit rien.',
  'library.proNote': 'D’après le catalogue extrait de l’APK 1.0.3-beta5, pas d’après le fichier.',

  'library.factVersionGap': 'Situation de la version',
  'library.versionGapOlder': 'Plus ancienne que celle sur laquelle cet éditeur dessine',
  'library.versionGapSame': 'Celle sur laquelle cet éditeur dessine',
  'library.versionGapNewer': 'Plus récente que celle sur laquelle cet éditeur dessine',
  'library.versionGapUnknown': 'Le fichier ne dit pas de quelle version il vient',
  'library.factVersionGapNote':
    'Cet éditeur règle son dessin sur une version précise de XCTrack ; c’est à celle-là que ce fichier est comparé, pas à celle de votre appareil.',

  'library.factPersonalTravels': 'Données personnelles voyageant avec les pages',
  'library.personalTravelsYes': 'Oui — la disposition porte au moins un texte écrit par vous',
  'library.personalTravelsNo': 'Non — aucun texte libre trouvé dans la disposition',
  'library.personalTravelsYesNote':
    'Un export « pages » n’est donc pas anonyme par construction : le nom et le numéro d’un bouton d’appel sont dans la disposition, pas dans les préférences.',
  'library.personalTravelsNoNote':
    'La liste des champs de texte libre est fixe et se périmera : elle ne prouve pas une absence.',

  /* --------------------------------------------------------------- l'entrée elle-même */

  'library.entryItself': 'L’entrée elle-même',
  'library.fieldName': 'Nom',
  'library.factOriginalFile': 'Fichier d’origine',
  'library.unknownOriginalFile': '(inconnu)',
  'library.factStoredOn': 'Rangée le',
  'library.factLastWrite': 'Dernière écriture',
  'library.factDigest': 'Empreinte SHA-256',
  'library.yourNote': 'Votre note : {note}',

  /**
   * « enregistrée 3 fois » : `revision` est un compte, et le pilote le lit comme tel —
   * « révision 3 » lui demandait de deviner à la fois le mot et son point de départ.
   */
  'library.timesStored': {
    one: 'enregistrée une seule fois',
    other: 'enregistrée {count} fois'
  },

  /* ------------------------------------------------------- ce que l'entrée porte de personnel */

  'library.personalHeading': 'Ce que cette entrée porte de personnel',
  'library.noPersonalData': 'Aucune donnée personnelle repérée. {caveat}',
  /**
   * `{total}`, `{filled}` et `{empty}` reçoivent des sous-phrases déjà accordées ;
   * `{layout}` et `{preferences}` sont des nombres. Trois accords dans une seule phrase :
   * la découper en fragments n'aurait pas d'équivalent en allemand.
   */
  'library.personalSummary':
    '{total} dans cette entrée : {layout} dans la disposition, qui part avec les pages, et {preferences} dans les préférences, qui restent chez vous dans un export « pages ». {filled}, {empty}. Elles sont montrées, jamais retirées : c’est vous qui décidez.',
  'library.personalTotal': {
    one: '{count} donnée personnelle est présente',
    other: '{count} données personnelles sont présentes'
  },
  'library.personalFilled': {
    one: '{count} est renseignée',
    other: '{count} sont renseignées'
  },
  'library.personalEmpty': {
    one: '{count} est un emplacement vide',
    other: '{count} sont des emplacements vides'
  },
  'library.basisReadInApp': 'lu dans l’application',
  'library.basisJudgedHere': 'jugé par cet éditeur',
  'library.travelsCaveat':
    'Les lignes marquées « part avec les pages » sont dans la disposition : elles voyagent même dans un export « pages ». Dériver un « pages » est un tri de gros grain, ce n’est pas un nettoyage.',

  /* -------------------------------------------------------------------------- l'aperçu */

  'library.previewHeading': 'Aperçu',
  /**
   * `{rank}` est un rang de page — un nombre que le pilote lit et compare, il se met donc
   * en forme comme un nombre. Les deux orientations ont chacune leur phrase : l'accord et
   * la place du mot changent d'une langue à l'autre.
   */
  'library.previewOfLandscapePage': 'Page {rank} en paysage, telle que cet éditeur la dessine.',
  'library.previewOfPortraitPage': 'Page {rank} en portrait, telle que cet éditeur la dessine.',
  'library.previewMasked':
    'Les textes que vous avez écrits — titres personnalisés, texte libre, fiche d’appel — sont remplacés par des barres grises : une image échappe à l’anonymisation, qui ne travaille que sur le fichier.',
  'library.previewAbsent': 'Pas d’aperçu pour cette configuration.',
  'library.previewNotInArchive':
    'L’archive de bibliothèque n’emporte aucun aperçu : une image sortirait du navigateur avec vos pages dessinées dessus. Elle est refaite ici, en local, après un import.',

  /* --------------------------------------------------------------------------- ranger */

  'library.storeLead':
    'Donnez-lui un nom que vous reconnaîtrez dans six mois — « Comp Annecy », « Vol-biv Alpes », « École ». Ce qui est rangé, c’est votre fichier lui-même, sans une virgule réécrite.',
  'library.fieldNoteOptional': 'Note (facultative)',
  'library.noteHint':
    'Ce que vous voudrez : le site, la voile, le réglage du vario. Jamais interprétée.',
  /** `{digest}` part en `string` : c'est une empreinte, elle ne se met pas en forme. */
  'library.stored': '« {name} » est rangée — {size}, empreinte {digest}…',
  'library.noOpenFile':
    'Aucun fichier n’est ouvert : ouvrez une configuration, ou rangez un fichier depuis le disque.',

  /**
   * Le message modèle du socle — les guillemets et le formateur de dates dans une même
   * phrase. Voir `src/i18n/CLAUDE.md`.
   */
  'library.storedLine': '« {name} » est rangée — {size}, {when}.',

  /* -------------------------------------------------------------------------- charger */

  'library.loaded': '« {name} » est chargée — {size}, octets vérifiés contre leur empreinte.',
  'library.unsavedTitle': 'Des modifications ne sont pas enregistrées',
  'library.unsavedBody':
    'Le document ouvert — « {file} » — porte des modifications que vous n’avez pas enregistrées. Charger « {name} » les remplace dans l’éditeur.',
  'library.storeFirstCaveat':
    'Ranger d’abord ne coûte rien : la configuration ouverte prend un nom dans la bibliothèque, et vous y reviendrez d’un clic.',
  'library.storeThenLoad': 'Ranger d’abord, puis charger',
  'library.loadWithoutStoring': 'Charger sans ranger',

  /* ------------------------------------------------------------------------ ressortir */

  'library.extracted': {
    one: '« {name} » ressort telle qu’elle est entrée : {count} octet, empreinte vérifiée.',
    other: '« {name} » ressort telle qu’elle est entrée : {count} octets, empreinte vérifiée.'
  },

  /* ------------------------------------------------------------------------ l'empreinte */

  'library.digestTitle': 'Empreinte — {name}',
  'library.verifyNote':
    'L’empreinte a été posée au moment du rangement, sur les octets rangés. Celle-ci vient d’être recalculée sur ce que la bibliothèque rend maintenant.',
  'library.digestStored': 'Enregistrée',
  'library.digestFresh': 'Recalculée à l’instant',
  'library.digestMissing': 'aucune — les octets n’ont pas été rendus',
  'library.sizeUnreadable': 'illisible — {expected} attendus',
  'library.sizeCompared': {
    one: '{count} octet — {expected} attendus',
    other: '{count} octets — {expected} attendus'
  },
  'library.digestSame':
    'Identiques : les octets rangés sont exactement ceux du fichier d’origine.',
  'library.digestDiffers': 'Différentes — cette entrée ne sera pas restituée.',

  /* ------------------------------------------------------------------------- supprimer */

  'library.removeTitle': 'Supprimer « {name} » ?',
  'library.removeBody':
    '« {name} » et ses {size} d’octets seront retirés de ce navigateur. Cette bibliothèque n’a pas de corbeille.',
  'library.removeCaveat':
    'Si vous n’en êtes pas sûr : ressortez d’abord le fichier, ou exportez la bibliothèque entière.',
  'library.removed': '« {name} » a été supprimée.',

  /* -------------------------------------------------- effacer toute la bibliothèque */

  /**
   * Le geste porte son étendue dans son intitulé. « Tout effacer » seul aurait laissé au
   * pilote le soin de deviner ce que « tout » recouvre — la bibliothèque, ou toute trace
   * de lui dans ce navigateur. `library.clearAllScope` dit ce qui reste, et par quel
   * geste l'emporter.
   */
  'library.clearAll': 'Effacer toute la bibliothèque',
  'library.clearAllTitle': 'Effacer toute la bibliothèque ?',
  'library.clearAllConfirm': 'Tout effacer',

  /**
   * `{size}` et `{broken}` sont des sous-phrases **ou rien**, comme au pied : une
   * bibliothèque qui ne porte que des entrées illisibles ne dit pas « 0 o d'octets ».
   */
  'library.clearAllBody': {
    one: '{count} configuration rangée quitte ce navigateur{size}{broken}.',
    other: '{count} configurations rangées quittent ce navigateur{size}{broken}.'
  },
  'library.clearAllBytes': ' — {size} d’octets partent avec',
  'library.clearAllBroken': {
    one: ', ainsi que {count} entrée illisible',
    other: ', ainsi que {count} entrées illisibles'
  },
  'library.clearAllCaveat':
    'Les octets partent avec : c’est votre fichier lui-même qui est effacé, et cette bibliothèque n’a pas de corbeille. Rien n’a jamais été envoyé ailleurs — il n’existe donc aucune copie à récupérer, ni ici ni chez personne.',
  'library.clearAllScope':
    'Ce geste efface la bibliothèque, et elle seule. Trois réglages de cet éditeur restent dans ce navigateur : la langue de l’interface, la hauteur du bandeau de réglages, et les appareils que vous avez ajoutés vous-même. Aucun des trois ne porte de configuration, de page ni de fichier de waypoints — ce sont un choix de langue et des mesures d’écran. Pour ne plus rien laisser du tout, videz les données de ce site depuis votre navigateur : c’est le seul geste qui les emporte aussi.',

  'library.exportThenClear': 'Exporter l’archive d’abord, puis tout effacer',
  'library.clearWithoutExport': 'Tout effacer sans exporter',

  'library.cleared': {
    one: 'La bibliothèque est vide : {count} configuration effacée{size}.',
    other: 'La bibliothèque est vide : {count} configurations effacées{size}.'
  },
  'library.clearedAfterExport': {
    one: 'L’archive est téléchargée, puis la bibliothèque a été vidée : {count} configuration effacée{size}.',
    other: 'L’archive est téléchargée, puis la bibliothèque a été vidée : {count} configurations effacées{size}.'
  },
  'library.clearedBytes': ', {size} d’octets libérés',

  /* ------------------------------------------------------------------ l'entrée illisible */

  'library.brokenName': 'Entrée illisible',
  'library.brokenNote':
    'Elle n’empêche pas les autres de s’afficher, et elle reste supprimable. Ses octets ne seront pas exportés : on n’écrit pas dans une sauvegarde ce qu’on ne saurait pas restituer.',
  'library.brokenBody':
    'Cette entrée ne se relit pas : on ne sait pas ce qu’elle contenait. La supprimer libère sa place et ne perd rien de lisible.',
  'library.brokenTechnical': 'Identifiant interne {id}. Détail technique : {reason}.',
  'library.removeBrokenTitle': 'Supprimer cette entrée illisible ?',
  'library.brokenRemoved': 'L’entrée illisible a été supprimée.',
  'library.brokenHeading': {
    one: '{count} Entrée qui ne se relit pas',
    other: '{count} Entrées qui ne se relisent pas'
  },

  /* ------------------------------------------------------------------ exporter, importer */

  /** `{tail}` est `library.exportSkipped`, ou rien du tout quand tout est ressorti. */
  'library.exported': {
    one:
      '{count} configuration exportée dans une archive ZIP. Chaque .xcfg s’en extrait avec n’importe quel décompresseur.{tail}',
    other:
      '{count} configurations exportées dans une archive ZIP. Chaque .xcfg s’en extrait avec n’importe quel décompresseur.{tail}'
  },
  'library.exportSkipped': {
    one: ' {count} entrée illisible n’y est pas : la sauvegarde est incomplète, et le dit.',
    other: ' {count} entrées illisibles n’y sont pas : la sauvegarde est incomplète, et le dit.'
  },

  'library.importTitle': 'Bibliothèque importée',
  'library.importLead':
    'Archive exportée le {when}. Aucune entrée existante n’a été écrasée : une entrée déjà présente sous d’autres octets est replacée à côté, suffixée.',
  'library.outcomeImported': 'replacée',
  'library.outcomeAlreadyPresent': 'déjà présente, rien à faire',
  'library.outcomeDuplicated': 'replacée à côté : son identifiant était déjà pris',
  'library.outcomeRejected': 'refusée',
  'library.imported': {
    one: '{count} entrée lue dans l’archive.',
    other: '{count} entrées lues dans l’archive.'
  },
  /** `{rejected}` reçoit `library.rejectedCount` : deux nombres, une seule phrase. */
  'library.importedWithRejected': {
    one: '{count} entrée lue dans l’archive — {rejected}.',
    other: '{count} entrées lues dans l’archive — {rejected}.'
  },
  'library.rejectedCount': { one: '{count} refusée', other: '{count} refusées' },

  /* -------------------------------------------------- ce qui échoue, et son issue */

  'library.exportNow': 'Exporter la bibliothèque maintenant',
  'library.reloadLibrary': 'Recharger la bibliothèque',
  'library.conflict':
    '{message} Rien n’a été écrit : votre modification n’a pas écrasé la sienne.',
  'library.operationFailed':
    '{context} : l’opération n’a pas abouti. Détail technique : {detail}',

  /**
   * Le geste en cours, nommé pour être mis en tête du message d'échec. Ce sont des mots du
   * pilote, pas des noms de fonctions : « Restitution » et non « extract ».
   */
  'library.contextStoring': 'Rangement',
  'library.contextLoading': 'Chargement',
  'library.contextRemoving': 'Suppression',
  'library.contextExtracting': 'Restitution',
  'library.contextVerifying': 'Vérification',
  'library.contextRenaming': 'Renommage',
  'library.contextExporting': 'Export de la bibliothèque',
  'library.contextClearing': 'Effacement de la bibliothèque',
  'library.contextImporting': 'Import de la bibliothèque',
  'library.contextReading': 'Lecture de la bibliothèque',

  /* -------------------------------------------------------------------------- renommer */

  'library.renameTitle': 'Renommer « {name} »',
  'library.renameLead': 'Le nom est à vous ; les octets rangés ne bougent pas.',
  'library.fieldNote': 'Note',
  'library.renamed': '« {name} » est à jour — {times}.',

  /* --------------------------------------------- « replacée », le troisième « rétablir » */

  'library.entryRestored': '« {name} » est replacée.',
  'library.entryRestoredBeside': '« {name} » est replacée à côté : son identifiant était déjà pris.',

  'library.entryCount': {
    one: '{count} configuration rangée',
    other: '{count} configurations rangées'
  }
} as const

export default library

export type FrenchLibrary = typeof library
