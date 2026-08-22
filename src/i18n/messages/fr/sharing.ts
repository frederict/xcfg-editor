/**
 * `sharingDialog.ts`, `warnings.ts` — **donner son fichier à quelqu'un**, et ce qu'il faut
 * en savoir avant.
 *
 * ## Pourquoi ce domaine est le plus dangereux à traduire
 *
 * C'est ici que le pilote décide **ce qu'il envoie à quelqu'un d'autre**. Une sauvegarde
 * XCTrack porte son nom, sa voile, ses capteurs appairés, ses fichiers de waypoints,
 * jusqu'au nom de la compétition à laquelle il participe. Ailleurs, une traduction
 * approximative gêne ; ici, elle fait fuiter.
 *
 * ## Les trois issues, et l'ordre est celui de ce qui part
 *
 * | Clé du titre | Ce qui part |
 * |---|---|
 * | `sharing.plainTitle` | tout — le fichier tel qu'il est |
 * | `sharing.backupTitle` | tous les réglages, sans ce qui vous désigne |
 * | `sharing.pagesTitle` | les pages seules, sans le moindre réglage |
 *
 * **Descendre d'un cran veut toujours dire « donner moins »**, et c'est la seule chose que
 * le pilote ait à retenir pour choisir. Les quatre traductions doivent donc garder la
 * **gradation** : chaque titre dit ce qui part, aucun ne dit ce qui est retiré, et les
 * trois se lisent d'affilée comme une échelle. Un titre qui se vanterait — *safe*,
 * *sicher*, *seguro* — casserait l'échelle en promettant une sûreté au deuxième cran, là
 * où le troisième en donne davantage.
 *
 * ## Ce qui ne se rejuge pas
 *
 * - **valeur d'usine**, jamais « défaut » : en français, « défaut » se lit *anomalie*. La
 *   collision n'existe dans aucune des quatre autres langues, et c'est justement pour cela
 *   que traduire force à trancher chaque emploi.
 * - **réglage** (une préférence), **ligne du fichier** (une entrée), jamais « clé ».
 * - **gadget** en français ; *widget* en `en`, `nl`, `es` ; *Widget* en allemand. Mesuré
 *   sur 55 versions de XCTrack — voir `common.ts`.
 * - L'interface parle **au** pilote : « écrit par vous », jamais « écrit par le pilote ».
 *
 * ## Les avertissements ne crient pas au loup
 *
 * `warnings.*` porte les neuf familles d'avertissements sur le fichier. Le principe tenu
 * d'un bout à l'autre de `warnings.ts` — on signale, on ne corrige jamais — a un
 * corollaire de traduction : **un avertissement qui alarme sur un montage voulu apprend à
 * ignorer les avertissements**. Le propriétaire de l'AIR³ l'a déjà signalé sur une
 * configuration parfaitement voulue, et `warnings.coveredButtonsDetail` est la réponse :
 * il dit « c'est un montage courant et non un défaut », et il doit le dire aussi
 * clairement dans les cinq langues.
 *
 * ## Ce qui n'est PAS ici, et pourquoi
 *
 * Les **raisons de `PREFERENCE_RULES`** et les **7 indices de `SUSPECT_SHAPES`** sont
 * versées au domaine `model` (`messages/<langue>/model.ts`, préfixes `sharingReason.*` et
 * `suspectClue.*`) : c'est de la prose **sous** l'interface, exactement comme les onze
 * raisons du `layout` de `personalData.ts`. `src/model/sharing.ts` n'en porte que les
 * **clés** (`PreferenceOutcome.reasonKey`, `PersonalSuspect.clueKey`) ; les écrans de ce
 * domaine-ci les affichent par `sharingProse(tr)`, sans jamais les écrire.
 */
const sharing = {
  /* ==================================================================================
   * sharingDialog.ts — choisir ce qu'on donne
   * ================================================================================== */

  /* ------------------------------------------------------------- le meuble de la boîte */

  'sharing.dialogTitle': 'Enregistrer cette configuration',
  'sharing.close': 'Fermer',
  'sharing.cancel': 'Annuler',
  'sharing.confirm': 'Enregistrer',
  'sharing.lead': 'Le fichier produit porte un nom horodaté qui ne reprend rien du nom ' +
    'd’origine — celui-ci contient souvent un prénom. Le nom est donc réglé ; reste à ' +
    'choisir ce que le fichier contient.',
  'sharing.legend': 'Que faut-il enregistrer ?',
  'sharing.curiousHead': 'Pour les curieux',
  'sharing.producedFileName': 'Nom du fichier produit : {name}',

  /**
   * Le nom accessible d'une carte de choix : son titre, puis sa note. Écrit ici plutôt que
   * collé dans le code, parce que le point et l'espace sont de la ponctuation, et que la
   * ponctuation appartient au message.
   */
  'sharing.choiceLabel': '{title}. {note}',

  /* --------------------------------------------------- les trois issues, dans l'ordre */

  /**
   * **L'échelle, et il n'y a qu'elle à retenir.** Trois titres qui disent chacun ce qui
   * part, jamais ce qui reste : tout, puis tout sauf vous, puis vos pages seules.
   *
   * « Fichier complet » a été essayé et retiré : pour un export « pages », le fichier n'a
   * rien de complet — il ne porte pas les préférences. Ce que le mot opposait en réalité,
   * c'est « tel qu'il est » à « expurgé ».
   */
  'sharing.plainTitle': 'Votre configuration, telle qu’elle est',
  'sharing.backupTitle': 'Tous vos réglages, sans ce qui vous désigne',
  'sharing.pagesTitle': 'Version partageable, sans données personnelles',

  'sharing.plainContentPages': 'Un export « pages » ne porte pas de préférences, mais les ' +
    'textes que vous avez écrits dans les gadgets, si.',
  'sharing.plainContentBackup': 'Il porte vos préférences : nom du pilote, voile, capteurs ' +
    'appairés, fichiers de waypoints.',

  /**
   * Les deux chiffres, nommés, et **jamais additionnés** : ils ne répondent pas à la même
   * question. Celui de la disposition est le seul qui survive à un export « pages ».
   */
  'sharing.plainTally': 'Il porte {layout} et {preferences} ; toutes partiraient en clair.',
  'sharing.personalInLayout': {
    one: '{count} donnée personnelle dans la disposition',
    other: '{count} données personnelles dans la disposition'
  },
  'sharing.personalInPreferences': {
    one: '{count} dans les préférences',
    other: '{count} dans les préférences'
  },

  'sharing.backupNoteUnchanged': 'Le fichier reste une sauvegarde entière — vario et ses ' +
    'sons, unités, thème, seuils d’espaces aériens, touches. Ce fichier-ci ne porte rien ' +
    'qui vous désigne : il n’y a donc rien à y remplacer.',
  'sharing.backupNoteChanged': {
    one: 'Le fichier reste une sauvegarde entière — vario et ses sons, unités, thème, seuils d’espaces aériens, touches. {count} ligne qui vous désigne est remplacée par une valeur neutre ou retirée.',
    other: 'Le fichier reste une sauvegarde entière — vario et ses sons, unités, thème, seuils d’espaces aériens, touches. {count} lignes qui vous désignent sont remplacées par des valeurs neutres ou retirées.'
  },
  'sharing.pagesNote': 'Un export « pages » dont les textes que vous avez écrits sont ' +
    'remplacés par des textes neutres. La disposition est conservée ; les préférences ne ' +
    'partent pas.',

  /* ------------------------------- ce que la boîte a le droit de promettre sur les octets */

  /**
   * ⚠️ **Les quatre phrases les plus dangereuses de l'interface.** Elles portent sur
   * l'argument central du projet — la fidélité à l'octet près — et s'affichent à l'instant
   * où le pilote décide s'il ose cliquer.
   *
   * « Le fichier part tel quel » est vrai d'un document intact et **faux** d'un document
   * modifié : celui-là est sérialisé, ses octets changent, son empreinte aussi. La garantie
   * n'est donc pas nuancée, elle est **dite juste dans chacun des deux cas** ; et
   * l'empreinte SHA-256, qui est une garantie et non un aveu, se replie derrière un
   * triangle. Traduire en mélangeant les deux cas remettrait le mensonge.
   */
  'sharing.fidelityUnchanged': 'Vous n’avez rien modifié : le fichier ressort exactement ' +
    'tel qu’il est entré, sans une virgule réécrite.',
  'sharing.fidelityUnchangedDetail': 'Les octets que vous avez ouverts sont réémis sans ' +
    'être réécrits : l’empreinte SHA-256 du fichier produit est celle du fichier ' +
    'd’origine — vous pouvez le vérifier.',
  'sharing.fidelityModified': 'Tout ce que vous n’avez pas touché est recopié à ' +
    'l’identique — jusqu’aux nombres et à l’espacement d’origine. Seul ce que vous avez ' +
    'changé change.',
  'sharing.fidelityModifiedDetail': 'Le fichier étant réécrit, son empreinte SHA-256 ' +
    'diffère de celle du fichier d’origine ; sur un document non modifié, elle est identique.',

  /* ------------------------------------------------- vos textes dans les gadgets */

  'sharing.freeTextHeading': 'Vos textes dans les gadgets',
  'sharing.freeTextNone': 'Aucun texte personnalisé dans les gadgets de ce fichier : rien ' +
    'à remplacer ici.',
  'sharing.freeTextCount': {
    one: '{count} texte écrit par vous est remplacé. Voici lequel, et où il se trouve. Il vit dans la disposition des pages, et non dans les préférences : il part donc quel que soit le format du fichier.',
    other: '{count} textes écrits par vous sont remplacés. Voici lesquels, et où ils se trouvent. Ils vivent dans la disposition des pages, et non dans les préférences : ils partent donc quel que soit le format du fichier.'
  },

  /**
   * L'emplacement d'un texte remplacé, dans les mots du pilote. Les repères sont nommés
   * `{page}` et `{rank}` — jamais `{widgetRank}` : le mot *widget* n'a pas sa place dans
   * un message français, marqueur compris, et un test le vérifie sur le texte entier.
   */
  'sharing.location': '{orientation} · page {page} · gadget {rank} · {name}',
  'sharing.orientationLandscape': 'Paysage',
  'sharing.orientationPortrait': 'Portrait',

  /** La valeur posée, telle qu'on l'écrit quand c'est la chaîne vide. */
  'sharing.emptyValue': '(vide)',

  /**
   * Ce que cette boîte **ne** compte **pas**, dit à l'endroit exact où on pourrait le
   * croire compté. « Aucun texte personnalisé à remplacer » se lisait « rien de personnel
   * dans ce fichier », ce qui est faux d'un `backup`.
   */
  'sharing.otherPersonalInPreferences': {
    one: 'Ce fichier porte par ailleurs {count} donnée personnelle dans ses préférences — nom, matériel, capteurs appairés, tâche en cours. Elle n’est pas remplacée : la version partageable ci-dessus n’emporte que les pages, et laisse en bloc toute la section « preferences ».',
    other: 'Ce fichier porte par ailleurs {count} données personnelles dans ses préférences — nom, matériel, capteurs appairés, tâche en cours. Elles ne sont pas remplacées : la version partageable ci-dessus n’emporte que les pages, et laisse en bloc toute la section « preferences ».'
  },

  /* --------------------------------- les réglages personnels, traités ligne par ligne */

  'sharing.preferencesHeading': 'Vos réglages personnels, ligne par ligne',
  'sharing.preferencesNone': 'Ce fichier ne porte aucun des 44 réglages que XCTrack range ' +
    'parmi les données personnelles : il n’y a rien à y traiter.',

  /**
   * Le décompte des quatre traitements. `{tally}` reçoit les quatre nombres joints par
   * `', '` — une **colonne de données**, pas une énumération dans une phrase : « 3
   * remplacés, 4 retirés et 4 conservés » ferait lire une prose là où il y a un tableau.
   */
  'sharing.preferencesFound': {
    one: '{count} réglage personnel a été trouvé dans ce fichier : {tally}. Chaque ligne dit ce qui lui arrive et pourquoi.',
    other: '{count} réglages personnels ont été trouvés dans ce fichier : {tally}. Chaque ligne dit ce qui lui arrive et pourquoi.'
  },
  'sharing.preferencesReplaced': { one: '{count} remplacé', other: '{count} remplacés' },
  'sharing.preferencesDropped': { one: '{count} retiré', other: '{count} retirés' },
  'sharing.preferencesKept': { one: '{count} conservé', other: '{count} conservés' },
  'sharing.preferencesEmpty': { one: '{count} vide', other: '{count} vides' },

  /**
   * L'intitulé de chacun des quatre traitements, dans les mots du pilote.
   *
   * **`sharing.treatmentKeep` est le refus assumé**, et il s'affiche aussi visiblement que
   * le reste : les booléens de diffusion et les catégories de voile sont des **réglages**,
   * pas des données, et c'est souvent d'eux qu'on vient parler sur un forum. Un intitulé
   * traduit en « non traités » ou « oubliés » transformerait une décision en négligence.
   */
  'sharing.treatmentReplace': 'Remplacés par une valeur neutre',
  'sharing.treatmentDrop': 'Retirés du fichier',
  'sharing.treatmentKeep': 'Conservés tels quels, et voici pourquoi',
  'sharing.treatmentEmpty': 'Présents dans le fichier, mais vides',

  /** Ce qu'on écrit à la place de la valeur posée, quand la ligne entière est retirée. */
  'sharing.droppedLine': 'la ligne entière est retirée',

  /**
   * Ce que la sauvegarde entière **ne** protège **pas**, dit à l'endroit où l'on pourrait
   * le croire protégé : une liste noire est fausse le jour où XCTrack ajoute un réglage.
   */
  'sharing.backupResidualNote': 'Cette issue traite les 44 réglages personnels connus de ' +
    'XCTrack et les onze champs de texte des gadgets. Le format change à chaque version : ' +
    'un réglage personnel apparu depuis ne serait pas dans la liste, et partirait en ' +
    'clair. La version partageable, plus bas, ne dépend d’aucune liste — elle ne ' +
    'transporte aucun réglage du tout.',

  /* ----------------------- ce qui a l'air personnel sans être déclaré : on avertit */

  'sharing.suspectsHeading': 'Ce qui a l’air d’un texte que vous auriez écrit',
  'sharing.suspectsCount': {
    one: '{count} texte n’est pas dans nos listes et en a pourtant l’air.',
    other: '{count} textes ne sont pas dans nos listes et en ont pourtant l’air.'
  },
  'sharing.suspectsNote': 'Ces textes ne figurent dans aucune de nos listes, et ils ' +
    'ressemblent pourtant à quelque chose que vous auriez écrit. Ils partent tels quels : ' +
    'nous ne remplaçons pas ce dont nous ne sommes pas sûrs, parce que nous abîmerions des ' +
    'réglages. Vous seul savez si vous les avez écrits.',
  'sharing.suspectsNoneNote': 'Aucun texte inattendu dans ce qui part : tout ce qui n’est ' +
    'pas traité ci-dessus a la forme d’un réglage — un mot choisi dans une liste, un ' +
    'nombre — et non celle d’un texte écrit.',
  'sharing.suspectsMore': {
    one: '{count} autre texte du même genre n’est pas montré ici, faute de place. Relisez le fichier produit avant de l’envoyer.',
    other: '{count} autres textes du même genre ne sont pas montrés ici, faute de place. Relisez le fichier produit avant de l’envoyer.'
  },

  /* --------------------------------------------- ce que le destinataire n'aura pas */

  'sharing.backupCostHeading': 'Ce que le destinataire n’aura pas',
  'sharing.backupCostIntro': 'Vos réglages traversent tous — vario et ses sons, unités, ' +
    'thème, seuils d’espaces aériens, touches. Ce qu’il n’aura pas, ce sont vos ressources ' +
    'à vous :',
  'sharing.backupCostOutro': 'Aucune de ces lignes n’est un réglage : ce sont des fichiers ' +
    'et des appareils qui vivent chez vous, et dont il n’aurait rien pu faire.',

  /**
   * Les cinq lignes, et aucune n'est un réglage : ce sont des ressources de votre
   * appareil, que le destinataire n'a pas et ne pourrait pas utiliser. C'est ce qui
   * distingue cette issue de la suivante, et ce qui la justifie.
   */
  'sharing.backupCostSensors': 'vos capteurs appairés : il appaire les siens, qui sont les ' +
    'seuls qu’il puisse utiliser ;',
  'sharing.backupCostTask': 'votre tâche en cours, ses points de virage et leurs coordonnées ;',
  'sharing.backupCostFiles': 'vos fichiers de waypoints et d’espaces aériens, et le thème ' +
    'de carte que vous avez installé — des fichiers de votre appareil ;',
  'sharing.backupCostOfflineMaps': 'vos cartes hors-ligne, pour la même raison ;',
  'sharing.backupCostQuickMessages': 'vos messages rapides de Livetracking, qui sont vos phrases.',

  'sharing.anonymousCostIntro': 'Ce que le destinataire n’aura donc pas, et qu’il devra ' +
    'régler lui-même :',
  'sharing.anonymousCostOutro': 'Il reçoit la disposition de vos pages, pas vos ' +
    'préférences. C’est le plus souvent ce qu’on veut — ses unités ne sont pas forcément ' +
    'les vôtres — mais il faut le savoir avant d’envoyer.',

  /**
   * Ce que l'anonymisation coûte **au destinataire**. C'est la partie qu'on serait tenté
   * de taire, donc celle qui est écrite en toutes lettres et montrée avant le geste.
   */
  'sharing.anonymousCostUnits': 'les unités — altitudes, distances, vitesses : il gardera ' +
    'les siennes ;',
  'sharing.anonymousCostTheme': 'le thème d’affichage, la taille et la couleur des titres ' +
    'de gadgets ;',
  'sharing.anonymousCostVario': 'les réglages du vario et de ses sons ;',
  'sharing.anonymousCostAirspace': 'les seuils et les canaux d’espaces aériens ;',
  'sharing.anonymousCostLivetracking': 'le Livetracking et ses identifiants ;',
  'sharing.anonymousCostSensors': 'les capteurs Bluetooth appairés.',

  /* -------------------------------------------------------- ce qui ne partira pas */

  'sharing.droppedHeading': 'Ce qui ne partira pas',
  'sharing.droppedNothing': 'Ce fichier est déjà un export « pages » : il ne porte aucune ' +
    'préférence, il n’y a donc rien à en retirer.',
  'sharing.droppedIntro': {
    one: 'Le fichier partagé est un export « pages » : il ne porte que vos pages. Cette ' +
      'section entière reste chez vous.',
    other: 'Le fichier partagé est un export « pages » : il ne porte que vos pages. Ces ' +
      'sections entières restent chez vous.'
  },

  /**
   * Ce que chaque section écartée emportait avec elle. Deux clés suffisent : ce sont les
   * deux seules qu'un `backup` porte en plus d'un `pages` sur les 21 fichiers du corpus.
   * Une troisième, apparue dans une version à venir, tomberait sur le repli — qui la nomme
   * sans prétendre savoir ce qu'elle contient.
   */
  'sharing.droppedPreferences': 'Toutes vos préférences : nom du pilote, voile, unités, ' +
    'thème, réglages du vario et de ses sons, seuils d’espaces aériens, Livetracking, ' +
    'capteurs Bluetooth appairés, fichiers de waypoints.',
  'sharing.droppedAirspaceChannels': 'Les canaux d’espaces aériens que vous avez sélectionnés.',
  'sharing.droppedUnknownSection': 'La section « {key} », qu’un export « pages » ne transporte pas.',

  /* --------------------------------------------------- les annexes d'une archive */

  'sharing.annexesHeading': 'Les annexes de l’archive',
  'sharing.annexesNote': 'Une archive .xczfg transporte des fichiers annexes que cet ' +
    'éditeur n’inspecte pas — ni leur contenu, ni les métadonnées d’une image, où une ' +
    'photo porte souvent les coordonnées du lieu de prise de vue. La version partageable ' +
    'est donc écrite en .xcfg nu, sans eux. Rien d’utile n’y est perdu : les ressources ' +
    'extérieures d’une configuration sont désignées depuis les préférences, qui ne partent ' +
    'pas non plus.',

  /**
   * La limite de la garantie, dite au lieu d'être tue : la liste des onze champs est fixe,
   * et le format de XCTrack change à chaque version.
   */
  'sharing.residualNote': 'La liste des onze champs de texte traités est fixe, et le ' +
    'format de XCTrack change à chaque version : un champ de texte apparu depuis partirait ' +
    'en clair. Relisez l’inventaire ci-dessus avant d’envoyer le fichier — c’est lui la ' +
    'vérification, pas la promesse de cet outil.',

  /* ------------------------------------------- l'inventaire complet, replié */

  'sharing.personalHeading': 'Tout ce que ce fichier porte de personnel : {total} — {layout} dans la disposition, {preferences} dans les préférences',
  'sharing.personalFilled': {
    one: '{count} est renseignée',
    other: '{count} sont renseignées'
  },
  'sharing.personalEmpty': {
    one: '{count} est un emplacement présent mais vide',
    other: '{count} sont des emplacements présents mais vides'
  },
  'sharing.personalTravelsNote': 'Seules celles de la disposition partent avec un export ' +
    '« pages ».',

  /* ==================================================================================
   * warnings.ts — ce qu'il faut savoir de ce fichier
   * ================================================================================== */

  /* -------------------------------------------------------------- 1. type d'export */

  'warnings.exportPagesTitle': 'Export « pages » : seuls les écrans',
  'warnings.exportPagesDetail': 'Ce fichier ne porte que les pages de gadgets. Réimporté ' +
    'dans XCTrack, il remplace les écrans et ne touche à rien d’autre : réglages du vario, ' +
    'unités, fichiers d’espace aérien et configuration des capteurs restent ceux de ' +
    'l’appareil.',
  'warnings.exportBackupTitle': 'Export « backup » : la configuration entière',
  /**
   * ⚠️ Cette phrase disait « il écrase … la configuration des capteurs de l'appareil »,
   * sans réserve. Mesuré le 22 août 2026 sur un AIR³ : un import « Remplacer tout » n'a
   * touché que **3 préférences sur 136** — celles que le fichier portait. Les quatre que
   * l'anonymisation retire, dont `Sensors.Configuration`, sont ressorties de l'appareil
   * avec leur valeur d'avant. Une ligne absente n'efface rien, et le dire faux dissuadait
   * de partager une sauvegarde anonymisée.
   */
  'warnings.exportBackupDetail': 'Ce fichier porte toute la configuration. Réimporté dans ' +
    'XCTrack, il remplace non seulement les écrans, mais aussi les réglages du vario, les ' +
    'unités, les fichiers d’espace aérien et la configuration des capteurs — ceux qu’il ' +
    'porte. Mesuré sur un AIR³ : un réglage absent du fichier garde sa valeur sur ' +
    'l’appareil, il n’est pas effacé.',
  'warnings.exportUnknownTitle': 'Type d’export indéterminé',
  'warnings.exportUnknownDetail': 'Ce fichier ne dit pas s’il ne contient que des pages ou ' +
    'toute la configuration (info.exportType absent ou inconnu). Ce qu’il écrasera à la ' +
    'réimportation ne peut donc pas être annoncé ici.',
  'warnings.exportUnknownItem': 'info.exportType : « {type} »',

  /* ----------------------------------------------------------- 2. valeurs supposées */

  'warnings.assumedValuesTitle': 'Thème, unités et typographie supposés',
  'warnings.assumedValuesDetail': 'Ce fichier ne porte aucune préférence : le thème, les ' +
    'unités et la taille des titres employés pour dessiner ces pages sont des valeurs ' +
    'd’usine relevées ailleurs, pas celles de votre appareil. La géométrie, elle, vient ' +
    'bien du fichier.',
  'warnings.assumedTheme': 'Thème : {theme}',
  'warnings.assumedUnits': 'Altitude : {altitude} · Vitesse : {speed} · Vario : {vario}',
  'warnings.assumedTitles': 'Titres : {percent} %, {font}',
  'warnings.assumedLanguageTitle': 'Langue des libellés indéterminée',
  'warnings.assumedLanguageDetail': 'Ce fichier ne déclare aucune langue d’affichage : sur l’appareil, XCTrack suit alors la langue du système Android — jamais l’anglais par défaut. Faute de mieux, les libellés sont affichés ici en {language} — la langue que vous avez choisie pour cette interface, ou à défaut celle de votre navigateur. La ligne qui la porterait, Display.Language, est vide ou absente du fichier.',

  /* -------------------------------------------------------- 3. données personnelles */

  /**
   * ⚠️ **La phrase la plus longue du projet sur les données personnelles**, et la seule
   * qui dise au pilote ce que son fichier révèle de lui. Elle nomme les deux chiffres au
   * lieu d'en additionner un seul — « 11 réglages » et « 2 textes dans les gadgets » ne se
   * contredisent plus dès qu'ils portent leur nom, et le second est le seul qui parte avec
   * un export « pages ».
   */
  'warnings.personalLayoutTitle': 'Vos pages portent des textes de vous',
  'warnings.personalTitle': 'Ce fichier vous nomme',
  'warnings.personalPreferenceCount': {
    one: '{count} réglage personnel renseigné',
    other: '{count} réglages personnels renseignés'
  },
  'warnings.personalLayoutCount': {
    one: '{count} texte écrit dans un gadget',
    other: '{count} textes écrits dans les gadgets'
  },
  'warnings.personalDetailLead': 'Ce fichier porte {preferences} et {layout} qui vous désignent : votre nom, votre matériel, vos choix de diffusion, votre tâche en cours avec ses coordonnées, et jusqu’à la compétition à laquelle vous participez — les noms des fichiers de waypoints la désignent.',
  /**
   * Le fait le plus contre-intuitif du format, et celui qu'il ne faut jamais réénoncer à
   * l'envers : le `layout` voyage avec un export « pages ».
   */
  'warnings.personalTravels': {
    one: '{count} texte écrit dans un gadget part même avec un export « pages » : ce format est un tri de gros grain, pas un nettoyage.',
    other: '{count} textes écrits dans les gadgets partent même avec un export « pages » : ce format est un tri de gros grain, pas un nettoyage.'
  },
  'warnings.personalEmptySlots': {
    one: '{count} emplacement personnel est présent mais vide — il n’est pas listé ici.',
    other: '{count} emplacements personnels sont présents mais vides — ils ne sont pas listés ici.'
  },
  'warnings.personalDetailTail': 'Cet outil ne dépouille rien en silence : le fichier sort ' +
    'tel qu’il est entré. À vous de voir.',
  'warnings.personalItem': '{key} — {kind} : {value}',

  /* --------------------------------------------------------- 4. ressources externes */

  'warnings.externalTitle': 'Fichiers extérieurs référencés',
  'warnings.externalDetail': 'Ces noms désignent des fichiers présents sur l’appareil ' +
    'd’origine, pas dans cette configuration. Une configuration reçue d’un autre pilote ' +
    'pointe des fichiers qu’il est seul à avoir : XCTrack les cherchera sur votre carte SD ' +
    'et ne les trouvera pas. Cet outil les liste, il ne les corrige pas. Les trois lignes du ' +
    'fichier qui peuvent en porter : Mapsforge.ThemeFile, Navigation.WaypointFiles et ' +
    'Airspace.Files.',
  'warnings.externalMapTheme': 'Thème de carte : {file}',
  'warnings.externalWaypoints': 'Waypoints : {file}',
  'warnings.externalAirspace': 'Espace aérien : {file}',

  /* ------------------------------------------------------------ 5. écart de version */

  'warnings.versionUnknownTitle': 'Version de XCTrack inconnue',
  'warnings.versionUnknownDetail': 'Ce fichier ne dit pas de quelle version de XCTrack il vient. L’écart avec la version de référence de cet outil ({reference}) ne peut donc pas être mesuré ; ce qui est affiché peut avoir changé de sens depuis. La ligne qui le dirait, info.versionCode, est absente.',
  'warnings.versionOlderTitle': 'Fichier plus ancien que l’outil',
  'warnings.versionNewerTitle': 'Fichier plus récent que l’outil',
  'warnings.versionGapDetail': 'Ce fichier vient de la version {name}, alors que cet éditeur se règle sur la version {reference} pour le dessiner. Le format change à chaque version : des réglages peuvent être dessinés autrement qu’ils ne le seront sur l’appareil. Le fichier n’est pas modifié pour autant — il ressort tel qu’il est entré, sans une virgule réécrite. Ce que le fichier écrit de sa version : versionCode {code}.',
  'warnings.versionNameUnknown': 'inconnue',

  /* ------------------------------------------------------- 6. structure inattendue */

  'warnings.structureTitle': 'Structure inattendue',
  'warnings.structureDetail': 'Cet éditeur n’a pas reconnu une partie de ce fichier. Le ' +
    'rendu est dégradé là où l’information manque, mais rien n’est perdu : le document est ' +
    'conservé intact et ressort tel quel.',
  'warnings.where': '{orientation}, page {page}',
  'warnings.structureNoClass': '{where} : cette page ne dit pas son type',
  'warnings.structureNavigations': '{where} : cet outil ne sait pas dire quand cette page s’affiche — la valeur « navigations » n’est ni « all », ni « none », ni une liste',
  /**
   * Le pluriel réel — « CLASS, X1 » — accordait au singulier, et « clé » est le mot du
   * format, pas celui du pilote : ce que le fichier porte, ce sont des lignes. Le nombre
   * ne s'écrit pas, les lignes manquantes étant nommées juste après.
   */
  'warnings.structureMissingKeys': {
    one: '{where}, gadget {rank} : la ligne {keys} manque',
    other: '{where}, gadget {rank} : les lignes {keys} manquent'
  },
  'warnings.structureDuplicate': 'Ligne en double : {path}',

  /* ---------------------------------- 7. géométrie : défauts, et montages volontaires */

  'warnings.geometryTitle': 'Défauts de géométrie',
  'warnings.geometryDetail': 'Ces gadgets ne peuvent pas s’afficher comme leur auteur ' +
    'l’espérait : boîte de largeur ou de hauteur nulle, coordonnées hors des bornes, ou ' +
    'gadget entièrement caché sous un autre, dont il ne montrera jamais la valeur. Les ' +
    'simples chevauchements ne sont pas signalés : ils sont normaux sur une carte ou un ' +
    'assistant de thermique.',
  'warnings.who': '{where}, gadget {rank} ({name})',
  'warnings.cover': 'gadget {rank} ({name})',
  /** Les quatre coordonnées passent en `string` : « 10 000 » n'est dans aucun fichier. */
  'warnings.box': 'X1 {x1}, Y1 {y1}, X2 {x2}, Y2 {y2}',
  'warnings.geometryZeroWidth': '{who} : largeur nulle, il n’a aucune surface — {box}',
  'warnings.geometryZeroHeight': '{who} : hauteur nulle, il n’a aucune surface — {box}',
  'warnings.geometryOutside': '{who} : sort de la page, {edge} est à {value} — {box}',
  'warnings.edgeLeft': 'son bord gauche',
  'warnings.edgeTop': 'son bord haut',
  'warnings.edgeRight': 'son bord droit',
  'warnings.edgeBottom': 'son bord bas',
  'warnings.geometryCovered': '{who} : caché par le {cover}, et n’affichera donc rien',
  'warnings.geometryCoveredButton': '{who} : caché par le {cover}, mais toujours actif au doigt',

  /**
   * **Ce n'est pas un défaut, et l'avertissement doit le dire.** Le propriétaire de l'AIR³
   * range deux « Luminosité de l'écran » sous l'assistant de thermique : le bouton n'est
   * pas dessiné, il reçoit pourtant le toucher, et l'usage quotidien le confirme.
   *
   * ⚠️ **Traduire ceci en alarme apprendrait au pilote à ignorer les avertissements** —
   * c'est exactement le reproche que cet outil s'est déjà vu adresser. Le texte rassure,
   * il n'alerte pas, et il doit rassurer dans les cinq langues.
   */
  'warnings.coveredButtonsTitle': 'Boutons d’action cachés, et c’est sans doute voulu',
  'warnings.coveredButtonsDetail': 'Un autre gadget est posé par-dessus ces boutons et les ' +
    'recouvre entièrement : sur l’instrument, vous ne les verrez pas. Ils répondent ' +
    'pourtant toujours au doigt — appuyer à cet endroit déclenche leur action, même si ' +
    'c’est la carte ou l’assistant de thermique que vous y voyez. C’est un montage courant ' +
    'et non un défaut : il donne une commande là où l’écran est déjà occupé. Rien à ' +
    'corriger, sauf si la superposition vous surprend.',

  /* ------------------------------------- 8. le thème déclaré n'est pas dessiné */

  'warnings.themeTitle': 'Thème dessiné différent du thème déclaré',
  'warnings.themeDetail': 'Ces pages sont dessinées ici avec le thème {theme}, le seul qui ait été observé sur l’instrument. Le fichier en demande un autre : les couleurs et les contrastes que vous voyez ne sont donc pas ceux de votre appareil. La géométrie, elle, est juste — et le fichier n’est pas modifié pour autant.',
  'warnings.themeFileKnown': 'Thème du fichier : {theme}',
  'warnings.themeFileUnknown': 'Thème du fichier : {theme} (thème inconnu de cet outil)',
  'warnings.themePerWidget': {
    one: '{count} gadget en {theme}',
    other: '{count} gadgets en {theme}'
  },

  /* --------------------------------------------------- 10. le contrôle avant vol */

  /**
   * Ce qu'un constat gagne quand la règle repose sur une hypothèse. Le titre se lit aussi
   * sur la ligne repliée des remarques, qui n'affiche que les titres : sans cette marque,
   * une supposition et une mesure y seraient indiscernables.
   *
   * « à confirmer sur l'instrument » et non « à vérifier » : le panneau déplié s'intitule
   * déjà « À vérifier dans ce fichier », et ces deux-là ne veulent pas dire la même chose.
   */
  'warnings.hypothesisTitle': '{title} — à confirmer sur l’instrument',
  'warnings.hypothesisLead': 'Ce n’est pas un constat mesuré mais une question, et voici ' +
    'ce qui la trancherait.',
  'warnings.preflightItem': '{where} : {message}'
} as const

export default sharing

export type FrenchSharing = typeof sharing
