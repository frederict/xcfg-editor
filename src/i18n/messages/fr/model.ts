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
 * ## Ce qui n'est PAS ici, et pourquoi
 *
 * Les **44 raisons des clés de préférences** vivent dans `src/model/personalKeys.json`,
 * qui est **extrait de l'APK** par `tools/extract-preferences.py` et vérifié à chaque
 * exécution des tests. Ce sont des **données**, pas de la prose de code : les traduire
 * demande de faire porter au fichier extrait cinq colonnes, ou de leur donner à chacune
 * une clé — décision qui appartient au lot qui reprendra l'extraction, pas à celui-ci.
 * En attendant, `personalProse.reason()` rend la raison française telle que le fichier la
 * porte, et le dit.
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
  'personalHome.preferences': 'Préférences — reste chez vous dans un export « pages »',

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
    'gabarit mais non composable — « 00 » n’est pas un indicatif de pays.',
  'sharingReason.url': 'Adresse web saisie, qui peut porter un jeton ou un identifiant : ' +
    'remplacée par une adresse du domaine réservé « .invalid », qui ne résout jamais.',
  'sharingReason.title': 'Libellé d’un bouton de lancement : remplacé par un libellé ' +
    'neutre, numéroté.',
  'sharingReason.name': 'Nom de l’application visée par un bouton de lancement : remplacé ' +
    'par un libellé neutre, numéroté.',
  'sharingReason.action': 'Action Android d’un bouton de lancement, qui peut être un URI ' +
    'complet : remplacée par l’action de test interne que XCTrack pose sur un bouton neuf.',
  'sharingReason.filter': 'Filtre de journal saisi : remis à vide, c’est-à-dire « pas de ' +
    'filtre », la valeur neutre du réglage.',
  'sharingReason.suffix': 'Texte placé après la valeur affichée : remis à vide, ' +
    'c’est-à-dire « pas de suffixe », la valeur neutre du réglage.',
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
    '« aucunes lunettes ».',
  'sharingReason.activeLookName': 'Le nom de vos lunettes ActiveLook. Remis à la valeur ' +
    'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucunes lunettes ».',
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
    'dans XCTrack — la chaîne vide, c’est-à-dire « aucun modèle choisi ».',
  'sharingReason.gliderProducer': 'Le constructeur de votre voile. Remis à la valeur ' +
    'd’usine relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucun constructeur ' +
    'choisi ».',
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
    'chemin. Remis à la valeur d’usine relevée dans XCTrack, « DEFAULT » : la carte du ' +
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
    '« aucune position ».',
  'sharingReason.replayFile': 'Un de vos fichiers de trace. Remis à la valeur d’usine ' +
    'relevée dans XCTrack — la chaîne vide, c’est-à-dire « aucune trace à rejouer ».',
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
    'comme une valeur à choisir dans une liste.'
} as const

export default model

export type FrenchModel = typeof model
