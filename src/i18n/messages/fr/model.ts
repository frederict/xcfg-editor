/**
 * La prose des couches **sous** l'interface : `src/model/`, `src/library/`,
 * `src/catalog/`.
 *
 * Ces couches ne dépendent pas de `src/i18n/` : elles **reçoivent un traducteur en
 * argument** et n'importent de lui que son type, effacé à la compilation. C'est le motif
 * arrêté pour tout le dépôt — voir `src/i18n/CLAUDE.md` § « La prose hors interface » — et
 * `src/model/personalData.ts` en est l'exemple appliqué.
 *
 * ## Les familles d'énumération portent leur préfixe
 *
 * `personalKind.*`, `personalBasis.*`, `personalHome.*`, `personalReason.*`,
 * `sharingReason.*`, `suspectClue.*` : le préfixe nomme la famille, comme `factoryValue.*`
 * et `provenance.*` dans `common.ts`. C'est la convention du dépôt pour un jeu de valeurs
 * fermé, et elle rend le `grep` immédiat.
 *
 * ## La prose qui vivait dans un fichier de données
 *
 * Les **44 raisons des clés de préférences** vivaient dans `src/model/personalKeys.json`
 * et `src/catalog/preferenceCatalog/base.json`, tous deux **extraits de l'APK** par
 * `tools/extract-preferences.py` : le champ `reason` y portait du français, et un pilote
 * néerlandais lisait « le nom du pilote, saisi tel quel » dans le tableau des données
 * personnelles. Les deux fichiers portent maintenant une clé `reasonKey`, et le texte est
 * ici, dans `personalReason.*`.
 *
 * L'alternative — une colonne par langue dans l'extraction — est écartée, et le pourquoi
 * est écrit au-dessus de `DECLARED_PERSONAL`, dans le script : traduire dans un script
 * Python que personne ne relit pour sa prose, puis relire cinq langues dans un fichier de
 * données de 96 Ko, coûte plus cher que les deux gestes qu'une clé demande — la ligne
 * dans le script, la phrase dans les cinq catalogues. Le compilateur rappelle le second.
 */
const model = {
  /* --------------------------------------------- la nature d'une donnée personnelle */

  'personalKind.identity': 'identité',
  'personalKind.credential': 'identifiant',
  'personalKind.contact': 'contact',
  'personalKind.device': 'appareil',
  'personalKind.location': 'position',
  'personalKind.file': 'fichier',
  'personalKind.freeText': 'texte libre',
  'personalKind.equipment': 'matériel',
  'personalKind.sharing': 'partage',

  /* ------------------------------------- sur quoi l'affirmation repose : lu, ou jugé */

  'personalBasis.scope': 'XCTrack le déclare lui-même',
  'personalBasis.inputType': 'XCTrack le saisit en points, comme un mot de passe',
  'personalBasis.declared': 'c’est notre jugement, pas celui de XCTrack',

  /* ------------------- où la donnée vit, donc si elle part avec un export « pages » */

  'personalHome.layout': 'Disposition — part avec les pages',
  'personalHome.preferences': 'Préférences — reste chez vous dans un export « pages »',

  /* ---------------------- pourquoi une clé du layout est dite personnelle */

  'personalReason.titletext': 'titre personnalisé d’un gadget, écrit par vous',
  'personalReason.text': 'contenu entier d’un gadget de texte libre, écrit par vous',
  'personalReason.fullName': 'nom d’une personne enregistrée sur un bouton d’appel',
  'personalReason.phoneNumber': 'numéro de téléphone enregistré sur un bouton d’appel',
  'personalReason.url': 'adresse web saisie, qui peut porter un jeton ou un identifiant',
  'personalReason.title': 'libellé d’un bouton de lancement, écrit par vous',
  'personalReason.name': 'nom de l’application visée par un bouton de lancement',
  'personalReason.action': 'action Android d’un bouton de lancement, qui peut être un URI complet',
  'personalReason.filter': 'filtre de journal que vous avez saisi',
  'personalReason.suffix': 'texte placé après la valeur affichée, écrit par vous',
  'personalReason.event': 'nom d’événement que vous avez saisi',
  'personalReason.unknown': 'texte libre sans règle propre : traité comme personnel, par précaution',

  /* ---- pourquoi un **réglage** est dit personnel : la prose des 44 clés du catalogue ==
   *
   * ⚠️ **Elle vivait dans un fichier de données**, `src/model/personalKeys.json` et
   * `src/catalog/preferenceCatalog/base.json`, tous deux extraits de l'APK par
   * `tools/extract-preferences.py`. Le champ `reason` y portait du français ; il porte
   * maintenant une **clé**, et le texte est ici. Voir la remarque au-dessus de
   * `DECLARED_PERSONAL`, dans le script, pour l'alternative écartée — une colonne par
   * langue dans l'extraction.
   *
   * Ces raisons-là ne se confondent pas avec `sharingReason.*` : celles-ci disent
   * **pourquoi c'est personnel**, celles-là **ce qu'on en fait** au moment du partage.
   * =============================================================================== */

  'personalReason.pilotName': 'votre nom, saisi tel quel',
  'personalReason.gliderName': 'votre voile — modèle et taille identifient un pilote dans un club',
  'personalReason.gliderProducer': 'constructeur de la voile',
  'personalReason.gliderModel': 'modèle de la voile',
  'personalReason.gliderCategory': 'catégorie de la voile',
  'personalReason.hangGliderCategory': 'catégorie de l’aile delta',
  'personalReason.xcontestAccount': 'identifiant du compte XContest',
  'personalReason.skysightAccount': 'identifiant du compte SkySight',
  'personalReason.safeSkyAddress': 'adresse du compte SafeSky',
  'personalReason.registration': 'immatriculation de l’aéronef',
  'personalReason.derivedRegistration': 'immatriculation déduite',
  'personalReason.stableDeviceId': 'identifiant d’appareil, stable entre les vols',
  'personalReason.trackingDeviceId': 'identifiant d’appareil du service de suivi',
  'personalReason.quickMessages': 'messages écrits par vous',
  'personalReason.sensors': 'les capteurs appairés, adresses Bluetooth comprises',
  'personalReason.glasses': 'les lunettes appairées',
  'personalReason.glassesName': 'le nom des lunettes appairées',
  'personalReason.everysightKey': 'clé d’accès au SDK Everysight',
  'personalReason.waypointFiles': 'fichiers de waypoints — le nom désigne souvent la compétition',
  'personalReason.navigationState': 'la tâche en cours, points de virage et coordonnées compris',
  'personalReason.airspaceFiles': 'fichiers d’espaces aériens que vous avez chargés',
  'personalReason.offlineMaps': 'cartes hors-ligne téléchargées',
  'personalReason.mapTheme': 'thème de carte que vous avez installé',
  'personalReason.guessedPosition': 'la position présumée de l’appareil — le domicile, en pratique',
  'personalReason.lastNetLocation': 'la dernière position ayant servi à interroger le QNH',
  'personalReason.replayFile': 'un de vos fichiers de trace',
  'personalReason.speechText': 'texte que vous avez saisi',
  'personalReason.secureScope': 'portée SECURE : XCTrack la range dans ses préférences chiffrées',
  'personalReason.maskedField': 'champ de saisie masqué (textPassword)',
  'personalReason.broadcastChoice': 'un choix de diffusion que vous avez fait, pas une donnée en soi',
  'personalReason.legacyRecord': 'repéré par une version antérieure de cet éditeur, ' +
    'qui n’en disait pas la nature. Rechargez cette entrée pour obtenir l’inventaire complet.',

  /* -------------------------------------------------- ce que la donnée porte */

  'personal.emptySlot': 'emplacement présent, mais vide',

  'personal.hiddenStructure': {
    one: 'structure de {count} entrée, non montrée',
    other: 'structure de {count} entrées, non montrée'
  },

  'personal.caveat': {
    one: 'Cet inventaire porte sur les réglages connus de XCTrack {version} : {count} réglage et onze champs de texte libre des gadgets. Le format change à chaque version — un inventaire vide ne prouve donc pas une absence.',
    other: 'Cet inventaire porte sur les réglages connus de XCTrack {version} : {count} réglages et onze champs de texte libre des gadgets. Le format change à chaque version — un inventaire vide ne prouve donc pas une absence.'
  },

  /* =========================== l'anonymisation : ce qui remplace quoi, et pourquoi ===
   *
   * `src/model/sharing.ts` — les raisons montrées **avant le téléchargement**, à
   * l'instant où le pilote décide ce qu'il envoie à quelqu'un d'autre. C'est la liste
   * que le manuel demande de relire ; elle ne peut pas rester dans une langue.
   *
   * ⚠️ **Une raison partagée est une seule clé.** `sharingReason.credential` couvre à
   * elle seule 17 réglages, `sharingReason.livetrackChoice` quatre, et
   * `sharingReason.guessedPosition` les deux coordonnées du domicile présumé. La boîte
   * de partage groupe par traitement et **dit une fois** la raison commune à tout un
   * groupe : elle compare les clés, ce qui ne marche que si une raison partagée n'est
   * écrite qu'une fois ici. La dupliquer ferait réapparaître la même phrase dix-sept
   * fois de suite.
   * =============================================================================== */

  /* ---------------------------- les onze textes libres de la disposition, plus le repli */

  'sharingReason.titletext': 'Titre personnalisé du gadget : remplacé par un titre neutre, ' +
    'numéroté, pour que la mise en page et la distinction entre gadgets soient conservées.',
  'sharingReason.text': 'Contenu entier d’un gadget de texte libre : remplacé par un texte ' +
    'court, pour que le cadre reste rempli sans déborder.',
  'sharingReason.fullName': 'Nom d’une personne enregistrée sur un bouton d’appel : ' +
    'remplacé par un libellé neutre.',
  'sharingReason.phoneNumber': 'Numéro de téléphone : remplacé par un numéro au même ' +
    'gabarit mais non composable — « 00 » n’est pas un indicatif de pays.',
  'sharingReason.url': 'Adresse web saisie, qui peut porter un jeton ou un identifiant : ' +
    'remplacée par une adresse du domaine réservé « .invalid », qui ne résout jamais.',
  'sharingReason.title': 'Libellé d’un bouton de lancement : remplacé par un libellé ' +
    'neutre, numéroté.',
  'sharingReason.name': 'Nom de l’application visée par un bouton de lancement : remplacé ' +
    'par un libellé neutre, numéroté.',
  'sharingReason.action': 'Action Android d’un bouton de lancement, qui peut être un URI ' +
    'complet : remplacée par l’action de test interne que XCTrack pose sur un bouton neuf.',
  'sharingReason.filter': 'Filtre de journal saisi : remis à vide, c’est-à-dire « pas de ' +
    'filtre », la valeur neutre du réglage.',
  'sharingReason.suffix': 'Texte placé après la valeur affichée : remis à vide, ' +
    'c’est-à-dire « pas de suffixe », la valeur neutre du réglage.',
  'sharingReason.event': 'Nom d’événement saisi : remplacé par l’événement de test que ' +
    'XCTrack pose sur un gadget neuf.',
  'sharingReason.unknownFreeText': 'Texte libre sans règle propre : remplacé par un texte ' +
    'neutre, par précaution.',

  /* ------------------------------------ les 44 réglages personnels des préférences */

  'sharingReason.credential': 'Identifiant ou mot de passe. La ligne entière est retirée : ' +
    'un identifiant n’a pas de valeur neutre, et en fabriquer une ferait échouer la ' +
    'connexion du destinataire au lieu de la laisser simplement vide.',
  'sharingReason.activeLookDevice': 'Les lunettes ActiveLook appairées à votre appareil. ' +
    'Remises à la valeur d’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire ' +
    '« aucunes lunettes ».',
  'sharingReason.activeLookName': 'Le nom de vos lunettes ActiveLook. Remis à la valeur ' +
    'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucunes lunettes ».',
  'sharingReason.airspaceFiles': 'Les fichiers d’espaces aériens que vous avez chargés. La ' +
    'ligne entière est retirée : ce sont des fichiers de votre appareil, que le ' +
    'destinataire n’a pas.',
  'sharingReason.guessedPosition': 'La position présumée de votre appareil — votre ' +
    'domicile, en pratique. La ligne entière est retirée : aucune coordonnée de ' +
    'remplacement ne serait honnête.',
  'sharingReason.speechText': 'Un texte que vous avez saisi pour la synthèse vocale. ' +
    'Remplacé par un texte court et neutre, pour que le réglage reste renseigné.',
  'sharingReason.gliderCategory': 'La catégorie de votre voile. Conservée : c’est un ' +
    'réglage de vol, elle ne porte ni nom, ni numéro, ni adresse, et c’est souvent elle ' +
    'qu’on veut partager.',
  'sharingReason.hangGliderCategory': 'La catégorie de votre aile delta. Conservée : c’est ' +
    'un réglage de vol, elle ne porte ni nom, ni numéro, ni adresse, et c’est souvent elle ' +
    'qu’on veut partager.',
  'sharingReason.gliderName': 'Le nom de votre voile — modèle et taille suffisent à vous ' +
    'reconnaître dans un club. Remplacé par un mot neutre, pour que le réglage reste ' +
    'renseigné.',
  'sharingReason.gliderModel': 'Le modèle de votre voile. Remis à la valeur d’usine relevée ' +
    'dans XCTrack — la chaîne vide, c’est-à-dire « aucun modèle choisi ».',
  'sharingReason.gliderProducer': 'Le constructeur de votre voile. Remis à la valeur ' +
    'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucun constructeur ' +
    'choisi ».',
  'sharingReason.livetrackChoice': 'Un choix de diffusion Livetrack que vous avez fait. ' +
    'Conservé : c’est un réglage, pas une donnée — il ne porte ni nom, ni identifiant de ' +
    'compte.',
  'sharingReason.quickMessages': 'Les messages rapides que vous avez écrits pour le ' +
    'Livetracking. La ligne entière est retirée : c’est une liste de vos phrases, et le ' +
    'destinataire écrira les siennes.',
  'sharingReason.offlineMaps': 'Les cartes hors-ligne installées sur votre appareil. La ' +
    'ligne entière est retirée : ce sont des fichiers de votre appareil, que le ' +
    'destinataire n’a pas.',
  'sharingReason.mapTheme': 'Le thème de carte que vous avez installé, désigné par son ' +
    'chemin. Remis à la valeur d’usine relevée dans XCTrack, « DEFAULT » : la carte du ' +
    'destinataire s’affiche, au lieu de chercher un fichier qu’il n’a pas.',
  'sharingReason.navigationState': 'Votre tâche en cours, points de virage et coordonnées ' +
    'compris. La ligne entière est retirée : son schéma change à chaque version de ' +
    'XCTrack, et une structure de remplacement serait une forme que l’application n’écrit ' +
    'jamais.',
  'sharingReason.waypointFiles': 'Vos fichiers de waypoints — leur nom désigne souvent la ' +
    'compétition à laquelle vous participez. La ligne entière est retirée : ce sont des ' +
    'fichiers de votre appareil, que le destinataire n’a pas.',
  'sharingReason.pilotName': 'Votre nom, saisi tel quel. Remplacé par un mot neutre plutôt ' +
    'que vidé : XCTrack l’affiche et l’envoie avec le Livetracking, et un nom vide n’est ' +
    'pas une situation qu’on lui connaît.',
  'sharingReason.derivedRegistration': 'L’immatriculation déduite de votre aéronef. La ' +
    'ligne entière est retirée : une immatriculation désigne un appareil et son ' +
    'propriétaire, et en inventer une reviendrait à en désigner un autre.',
  'sharingReason.registration': 'L’immatriculation de votre aéronef. La ligne entière est ' +
    'retirée : une immatriculation désigne un appareil et son propriétaire, et en inventer ' +
    'une reviendrait à en désigner un autre.',
  'sharingReason.sensors': 'Vos capteurs appairés, adresses Bluetooth comprises. La ligne ' +
    'entière est retirée : le destinataire appaire les siens, qui sont de toute façon les ' +
    'seuls qu’il puisse utiliser.',
  'sharingReason.lastNetLocation': 'La dernière position ayant servi à interroger le QNH. ' +
    'Remise à la valeur d’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire ' +
    '« aucune position ».',
  'sharingReason.replayFile': 'Un de vos fichiers de trace. Remis à la valeur d’usine ' +
    'relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucune trace à rejouer ».',
  'sharingReason.unknownPreference': 'Réglage personnel sans règle propre : la ligne ' +
    'entière est retirée, par précaution.',
  'sharingReason.shapeMismatch': 'Ce réglage ne porte pas le texte que sa règle attendait ' +
    '— sa forme a changé depuis le relevé. La ligne entière est retirée : écrire un mot à ' +
    'la place d’une structure produirait un fichier que XCTrack refuserait.',
  'sharingReason.emptySlot': 'L’emplacement est présent dans le fichier, mais il ne porte ' +
    'rien : il n’y a rien à remplacer, et la ligne reste telle quelle.',

  /* ------------- ce qui ressemble à une donnée personnelle sans être déclaré : l'indice */

  'suspectClue.url': 'Ce texte a la forme d’une adresse web, qui peut porter un jeton ou ' +
    'un identifiant.',
  'suspectClue.mail': 'Ce texte a la forme d’une adresse électronique.',
  'suspectClue.path': 'Ce texte a la forme d’un chemin de fichier sur votre appareil.',
  'suspectClue.hardware': 'Ce texte a la forme d’une adresse d’appareil Bluetooth ou réseau.',
  'suspectClue.phone': 'Ce texte a la forme d’un numéro de téléphone.',
  'suspectClue.letters': 'Ce texte porte des lettres accentuées ou des signes hors de ' +
    'l’alphabet latin simple : il a été écrit, pas choisi dans une liste.',
  'suspectClue.sentence': 'Ce texte porte une espace : il se lit comme une phrase, pas ' +
    'comme une valeur à choisir dans une liste.',

  /* ================================= le contrôle avant vol : `src/model/inspection.ts` ===
   *
   * Sept règles, leur titre, ce qu'elles valent en général, et ce qu'elles disent d'un
   * gadget donné.
   *
   * ⚠️ **Quatre des sept sont des suppositions déclarées** (`certainty: 'hypothesis'`) :
   * `unreachableWidget`, `thermalPages`, `widgetTooSmall` et `proWidget` sortent en doute,
   * et leur `…ToVerify` dit **ce qui lèverait le doute sur l'instrument**. C'est la
   * distinction mesuré / supposé qui fait la valeur de ce projet : une traduction qui
   * transformerait une question en verdict la ferait perdre. Chaque `…ToVerify` doit donc
   * rester au conditionnel, et nommer l'essai qui trancherait.
   * =============================================================================== */

  /* ------------------------------------------------------ où porte le constat */

  'inspection.landscape': 'Paysage',
  'inspection.portrait': 'Portrait',
  'inspection.wherePage': '{orientation}, page {page}',
  'inspection.whereWidget': '{orientation}, page {page}, gadget {rank}',

  /* ---------------------------------------- le titre de chacune des sept règles */

  'ruleTitle.unreachableWidget': 'Gadget impossible à toucher',
  'ruleTitle.pageNeverShown': 'Page qui ne s’affichera jamais',
  'ruleTitle.thermalPages': 'Plusieurs pages d’assistant de thermique',
  'ruleTitle.widgetTooSmall': 'Gadget peut-être trop petit pour être lu',
  'ruleTitle.proWidget': 'Gadget Pro sans licence déclarée',
  'ruleTitle.roadMaps': 'Deux cartes routières sur la même page',
  'ruleTitle.obsoleteKey': 'Réglage d’une version antérieure',

  /* ------------- ce que la règle regarde, et d'où vient ce qu'elle affirme */

  'ruleSummary.unreachableWidget': 'Aucun point de ces gadgets n’échappe à ceux qui sont ' +
    'dessinés après eux, et c’est le gadget le plus en avant qui reçoit l’appui. Ils ' +
    'peuvent rester parfaitement visibles : un gadget qui ne peint aucun fond prend les ' +
    'appuis tout autant qu’un gadget opaque.',
  'ruleSummary.pageNeverShown': 'XCTrack le dit dans sa propre boîte de réglage : une page ' +
    'dont aucun type de navigation n’est coché n’est affichée dans aucun contexte de vol.',
  'ruleSummary.thermalPages': 'Le relevé de l’instrument dit que la classe « assistant de ' +
    'thermique » est celle que vise le basculement automatique. Il ne dit pas laquelle est ' +
    'visée quand une orientation en porte plusieurs : cet éditeur suppose la dernière, et ' +
    'cette supposition n’a jamais été vérifiée.',
  'ruleSummary.widgetTooSmall': 'Le seuil vient de l’ISO 9241-303 et s’applique à la taille ' +
    'physique réelle de la dalle du gabarit d’écran choisi, pas à des pixels : changer de ' +
    'gabarit change ces millimètres.',
  'ruleSummary.proWidget': 'Ce fichier déclare « proUpTo: 0 » et porte des gadgets réservés ' +
    'à la licence Pro.',
  'ruleSummary.roadMaps': 'XCTrack prévient dans ses propres réglages qu’une seule carte ' +
    'routière est possible par page, à cause d’une limitation de sa bibliothèque de cartes.',
  'ruleSummary.obsoleteKey': 'Ces gadgets portent des réglages qu’une version antérieure de ' +
    'XCTrack a écrits. Il n’y a rien à y faire avant de voler ; pour savoir ce qu’une ' +
    'version donnée en fait, et éventuellement les enlever, voir « Version et ' +
    'compatibilité » dans le menu « Fichier ».',

  /* ------------------------------ ce que chaque constat dit du gadget concerné */

  'inspection.unreachable': '« {name} » est entièrement recouvert par des gadgets placés après lui. Aucun clic ne peut donc l’atteindre, ni ici ni dans l’écran d’édition de XCTrack, qui donne lui aussi la main au gadget le plus en avant. Il peut rester parfaitement visible — un gadget qui ne peint rien vole les appuis tout autant qu’un gadget opaque. Pour le régler, passez par la liste des gadgets de la page.',
  'inspection.unreachableToVerify': 'Ce qu’il advient de ce gadget en vol n’a pas été ' +
    'observé : XCTrack route peut-être l’appui autrement qu’en édition. La question compte ' +
    'surtout pour les boutons d’action, qui n’existent que pour être touchés en vol.',

  'inspection.pageNeverShown': {
    one: 'Cette page n’est activée pour aucun type de navigation : XCTrack ne l’affichera dans aucun contexte de vol, et son {count} gadget ne servira jamais. C’est le réglage « Désactivé » de l’instrument — volontaire, ou oublié. À distinguer d’une page seulement restreinte à certaines navigations, qui est un réglage normal.',
    other: 'Cette page n’est activée pour aucun type de navigation : XCTrack ne l’affichera dans aucun contexte de vol, et ses {count} gadgets ne serviront jamais. C’est le réglage « Désactivé » de l’instrument — volontaire, ou oublié. À distinguer d’une page seulement restreinte à certaines navigations, qui est un réglage normal.'
  },

  'inspection.thermalPages': 'Cette orientation porte plusieurs pages d’assistant de thermique, et XCTrack n’en vise qu’une lorsqu’il bascule tout seul en spirale. Laquelle ? Cet éditeur suppose la dernière, ici la page {target} — sans l’avoir vérifié. Celle-ci reste en tout cas atteignable par « page suivante ».',
  'inspection.thermalPagesToVerify': 'Rien n’a été observé de ce que fait XCTrack quand ' +
    'plusieurs pages d’assistant de thermique coexistent : aucun fichier du corpus n’en ' +
    'porte deux. En dupliquer une sur l’instrument, entrer en spirale et regarder quelle ' +
    'page arrive trancherait la question en un vol.',

  'inspection.tooSmall': '« {name} » ne fait que {height} de haut sur cet appareil. Si le texte qu’il affiche en occupe la moitié, il mesurera environ {value} — sous les {minimum} que l’ISO 9241-303 donne pour minimum absolu à {distance} cm. Sera-t-il encore lisible à bout de bras, en plein soleil, avec des gants ? À vérifier sur l’instrument.',
  'inspection.tooSmallToVerify': 'La part de la hauteur du gadget qu’occupe réellement le glyphe de la valeur (ici supposée {ratio}) n’a été mesurée que sur un seul gadget, une seule capture. Les captures de la planche des 75 gadgets suffiraient à la mesurer type par type, sans toucher à l’appareil.',

  'inspection.proWidget': '« {name} » est un gadget Pro. Que fera XCTrack de ce gadget sur un appareil sans licence Pro : le remplacer par un cadre « gadget Pro », l’afficher normalement, ou ne rien y changer ? Nous ne le savons pas. Ce que le fichier déclare, tel quel : « proUpTo: 0 ».',
  'inspection.proWidgetToVerify': 'Le sens de info.proUpTo n’est pas établi : 0 vaut ' +
    'peut-être « pas de licence », peut-être une date de fin en secondes. Les 21 fichiers ' +
    'du corpus portent tous 0, sur deux installations — aucune autre valeur n’a jamais été ' +
    'observée. Un essai sur l’AIR³ avec un gadget Pro trancherait.',

  'inspection.roadMaps': '« {name} » demande lui aussi une carte routière, et le gadget {first} de cette page en demande déjà une. XCTrack prévient dans ses propres réglages qu’une seule carte routière est possible par page, à cause d’une limitation de sa bibliothèque de cartes. Ce qui s’affichera à la place n’est pas prévisible.',

  'inspection.obsoleteKey': {
    one: '« {name} » porte un réglage écrit par une version antérieure de XCTrack. Rien n’est perdu : XCTrack 1.0.3 le convertit à la lecture — c’est vérifié sur l’instrument — et le réécrira sous son nouveau nom la première fois que ce gadget sera réglé. Tel qu’il s’écrit dans le fichier : {detail}.',
    other: '« {name} » porte des réglages écrits par une version antérieure de XCTrack. Rien n’est perdu : XCTrack 1.0.3 les convertit à la lecture — c’est vérifié sur l’instrument — et les réécrira sous leur nouveau nom la première fois que ce gadget sera réglé. Tels qu’ils s’écrivent dans le fichier : {detail}.'
  },

  /* ============================ les pannes de la bibliothèque et du détail technique ===
   *
   * `src/library/` et `src/core/technicalDetail.ts`. Peu vues, et vues au pire moment :
   * le pilote vient de confier une configuration à cet outil, ou d'essayer de la
   * reprendre. `LibraryError` porte une **clé** et ses valeurs ; `libraryErrorText(error,
   * tr)` en fait la phrase, et le `message` de l'erreur reste une ligne technique pour le
   * rapport de bogue.
   * =============================================================================== */

  /** Ce qu'on écrit quand la panne n'a rien dit — voir `formatTechnicalDetail`. */
  'model.noErrorMessage': 'la panne n’a laissé aucun message',

  /* ------------- l'opération en cours, dite dans la phrase de la panne */

  'libraryError.duringOpen': 'Ouverture de la bibliothèque',
  'libraryError.duringReadAll': 'Lecture de la bibliothèque',
  'libraryError.duringReadEntry': 'Lecture d’une entrée',
  'libraryError.duringReadBytes': 'Lecture d’une configuration',
  'libraryError.duringWrite': 'Écriture d’une entrée',
  'libraryError.duringDelete': 'Suppression d’une entrée',
  'libraryError.duringClear': 'Vidage de la bibliothèque',

  /* ------------------------------------------------ le stockage lui-même */

  'libraryError.quota': '{operation} : le navigateur a refusé d’écrire, l’espace accordé à ce site est plein. Exportez votre bibliothèque, puis supprimez des entrées pour faire de la place.',
  'libraryError.storageFailed': '{operation} : le navigateur n’a pas pu répondre. {detail}',
  'libraryError.noIndexedDb': 'Ce navigateur ne propose pas IndexedDB : la bibliothèque ne ' +
    'peut rien conserver.',
  'libraryError.blockedByTab': 'Un autre onglet empêche la mise à jour de la bibliothèque. ' +
    'Fermez-le, puis rechargez.',

  /* --------------------------------------------------- une entrée en particulier */

  'libraryError.notFound': 'Aucune entrée {id} dans la bibliothèque.',
  'libraryError.corrupt': 'L’entrée {id} est illisible : {reason}.',
  'libraryError.duplicateId': 'Une entrée porte déjà l’identifiant {id}.',
  'libraryError.changedElsewhere': 'L’entrée {id} a changé depuis sa lecture — un autre onglet l’a modifiée ou supprimée. Rechargez la bibliothèque avant de réessayer.',
  'libraryError.notReadable': '« {name} » n’a pas pu être ouvert : ce n’est pas une configuration XCTrack lisible. {detail}',
  'libraryError.bytesMissing': 'Les octets de « {name} » sont introuvables : l’entrée est incomplète.',
  'libraryError.digestChanged': '« {name} » ne rend plus son empreinte d’origine : les octets rangés ont été altérés. L’entrée n’est pas restituée.',

  /* ------------------ un enregistrement que la bibliothèque ne sait pas relire */

  'libraryError.recordNotObject': 'l’enregistrement n’est pas un objet',
  'libraryError.recordNoId': 'identifiant absent ou vide',
  'libraryError.recordBadFields': {
    one: 'champ illisible : {fields}',
    other: 'champs illisibles : {fields}'
  },

  /* --------------------------------------------- l'archive proposée à l'import */

  'libraryError.manifestUnreadable': 'La fiche de l’archive est illisible.',
  'libraryError.manifestEmpty': 'La fiche de l’archive est vide.',
  'libraryError.notALibrary': 'Ce fichier n’est pas une bibliothèque exportée par cet éditeur.',
  'libraryError.futureFormat': 'Cette bibliothèque a été écrite par une version postérieure de l’éditeur (format {version}). Mettez l’éditeur à jour avant de l’importer.',
  'libraryError.manifestNoItems': 'La fiche de l’archive ne liste aucune configuration.',
  'libraryError.notAnArchive': 'Ce fichier n’est pas une archive de bibliothèque, ou il est abîmé. {detail}',
  'libraryError.manifestMissing': 'L’archive ne contient pas de {file} : ce n’est pas une bibliothèque exportée.',

  /* ------------------------- une entrée refusée pendant un import, sans arrêter le reste */

  'libraryError.itemManifestUnreadable': 'fiche illisible dans l’archive',
  'libraryError.itemMemberMissing': 'membre {file} absent de l’archive',
  'libraryError.itemDigestMismatch': 'les octets de l’archive ne rendent pas l’empreinte annoncée',
  'libraryError.importedSuffix': ' (importé)',

  /* ============ pourquoi cette page-ci ne s'affichera jamais, et ce qui la rouvre ==== */

  'reachability.noNavigation': 'Cette page n’est activée pour aucune navigation : sur l’instrument, le défilement la saute, et rien de ce que vous y posez ne s’affichera jamais. C’est le réglage « Désactivé » de XCTrack — volontaire, ou oublié. Constaté au sol sur un AIR³ 7.2.',
  'reachability.emptyNavigationList': 'Cette page porte une liste de navigations vide : aucune ne l’appelle, et rien de ce que vous y posez ne s’affichera jamais. Le fichier écrit une liste vide plutôt que le réglage « Désactivé » ; l’instrument n’a jamais été observé dans cet état.',
  'reachability.heldInLandscape': 'Les réglages généraux de ce fichier tiennent l’écran en paysage : vos pages portrait n’y apparaîtront pas, quelles que soient leurs navigations. Tel qu’il s’écrit dans le fichier : « Display.Orientation: {value} ».',
  'reachability.heldInPortrait': 'Les réglages généraux de ce fichier tiennent l’écran en portrait : vos pages paysage n’y apparaîtront pas, quelles que soient leurs navigations. Tel qu’il s’écrit dans le fichier : « Display.Orientation: {value} ».',
  'reachability.enableAllRemedy': 'Cet éditeur sait la rouvrir : « Activer pour toutes les navigations » écrit la valeur que XCTrack écrit lui-même quand les cinq navigations sont actives. Le bouton est sur cette page et dans « Gérer les pages », dès que « Modifier les pages » est actif. Pour n’en choisir que certaines, il faut passer par l’instrument.',
  'reachability.heldRemedy': 'Cela ne se répare pas sur la page : c’est un réglage de tout l’instrument, et il se trouve dans « Réglages », à la ligne qui fixe l’orientation de l’écran. Cet éditeur n’y touche pas de lui-même. Constaté une fois : des pages portrait importées sur un AIR³ 7.2 ne s’y sont jamais affichées tant que ce réglage tenait l’écran en paysage.'

} as const

export default model

export type FrenchModel = typeof model
