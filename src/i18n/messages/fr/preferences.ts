/**
 * `preferencesPage.ts` — les 217 réglages généraux de XCTrack, en 20 sous-écrans.
 *
 * ## Le vocabulaire de cet écran, et pourquoi il ne se rejuge pas
 *
 * - **« valeur d'usine »**, jamais « défaut » : en français « défaut » se lit *anomalie*,
 *   et « 46 au défaut » annonçait 46 pannes. La collision n'existe **que** dans cette
 *   langue — l'anglais dit *factory value* ou *default* selon le contexte, et c'est
 *   justement pour ça que traduire force à trancher chaque emploi.
 * - **« réglage »** (une préférence de XCTrack), **« ligne du fichier »** (une entrée de
 *   la section `preferences`), jamais « clé ».
 * - **« gadget »** en français, *widget* dans les quatre autres langues : c'est ce que la
 *   chrome de XCTrack affiche, relevé sur 55 versions. Voir `fr/common.ts`.
 * - L'interface parle **au** pilote — « Vous avez réglé… », « Seulement ce que j'ai
 *   réglé » —, jamais **de** lui.
 *
 * ## Les trois gestes, et le seul qui change quelque chose
 *
 * | Clé | Le geste | Ce qu'il change pour l'appareil |
 * |---|---|---|
 * | `preferences.adoptLabel` | écrire une valeur que le fichier ne portait pas | rien sur un appareil neuf ; **remplace** sur un appareil déjà réglé |
 * | `preferences.dropLabel` | retirer une valeur égale à celle d'usine | rien : l'appareil garde la sienne |
 * | `preferences.restoreLabel` | remplacer une valeur personnalisée | **l'appareil ne se comporte plus pareil en vol** |
 *
 * Leurs infobulles portent un raisonnement mesuré sur l'appareil : ce sont les textes les
 * plus importants de cet écran, et ils se traduisent en entier, pas mot à mot.
 *
 * ## `preferences.absentKeyOnImport` — un fait mesuré, énoncé une fois
 *
 * À l'import « Remplacer tout », un réglage absent du fichier **n'est pas ramené à sa
 * valeur d'usine : l'instrument garde celui qu'il avait déjà.** Mesuré sur l'AIR³ ; voir
 * le protocole dans `src/ui/preferencesPage.ts`.
 *
 * Cette phrase est **un seul message**, repris par les quatre textes qui en ont besoin
 * (`preferences.stateTitleAbsent`, `…AbsentWithValue`, `…implicitTitle`, `…dropTitle`) au
 * moyen du repère `{absent}`. Un repère nommé qui reçoit une **phrase entière** n'est pas
 * une concaténation de fragments : c'est ce qui garantit que le fait et ses deux limites —
 * la mesure ne porte que sur « Remplacer tout », le cas de l'installation neuve est déduit
 * et non testé — restent identiques partout où ils se disent.
 */
const preferences = {
  /* ============================================================ le fait mesuré, une fois */

  /**
   * Trois phrases, et pas une de plus : ce que l'import fait, où ça a été mesuré, ce qui
   * se déduit pour un appareil neuf. Aucune traduction ne doit en perdre une.
   */
  'preferences.absentKeyOnImport':
    'À l’import (« Remplacer tout »), votre appareil garde le réglage qu’il a déjà : ce que le fichier ne dit pas n’est pas touché. Mesuré sur l’AIR³. Sur un appareil qui n’y a jamais touché, c’est la valeur d’usine de XCTrack qui s’applique.',

  /* ==================================================== les comptes, et donc les pluriels */

  /**
   * Le cas d'école du pluriel : à zéro, le français dit « 0 réglage » et les quatre autres
   * langues disent leur pluriel. Les huit copies de `plural()` du dépôt écrivaient
   * `count > 1`, la règle française — et donc « 0 setting » en anglais.
   */
  'preferences.settingCount': {
    one: '{count} réglage',
    other: '{count} réglages'
  },

  /** Une ligne de la section `preferences` du fichier — jamais « une clé ». */
  /**
   * ⚠️ **Message de démonstration du socle, pas de l'écran** : `preferencesPage.ts` ne
   * l'emploie pas — il dit « {count} absente du fichier » dans une énumération de comptes
   * (`preferences.detailAbsent`). Il reste ici parce que `tests/i18n/translate.test.ts`
   * s'en sert pour montrer ce qu'une **phrase entière** par forme permet : l'allemand y
   * change le verbe (*fehlt* / *fehlen*) et l'espagnol le met en tête (*falta* /
   * *faltan*). Aucun `s` collé ne survivrait à ça.
   */
  'preferences.absentFromFile': {
    one: '{count} ligne est absente du fichier',
    other: '{count} lignes sont absentes du fichier'
  },

  'preferences.lineCount': {
    one: '{count} ligne',
    other: '{count} lignes'
  },

  /** La taille d'une valeur qu'on ne déplie pas, dite en caractères du fichier. */
  'preferences.characterCount': {
    one: '{count} caractère',
    other: '{count} caractères'
  },

  /* ================================================ la valeur d'une ligne, en toutes lettres */

  /** « objet JSON » est le mot du format, pas celui du pilote : on dit la taille. */
  'preferences.structuredValue': 'valeur structurée, {size}',
  'preferences.emptyList': 'liste vide',
  'preferences.listValue': {
    one: 'liste de {count} élément, {size}',
    other: 'liste de {count} éléments, {size}'
  },
  'preferences.yes': 'Oui',
  'preferences.no': 'Non',
  /** Une touche non attribuée vaut -1 : « -1 » ne dit rien, « aucune touche » dit tout. */
  'preferences.noKeyAssigned': 'aucune touche',
  'preferences.emptyValue': '(vide)',
  /** Une valeur hors du domaine que l'écran propose : dite comme telle, jamais masquée. */
  'preferences.offCatalogue': '{value} (hors catalogue)',
  /** Une chaîne trop longue pour la colonne : le début, et la longueur entière. */
  'preferences.truncatedValue': '{start}… ({size})',
  'preferences.someStructure': 'une structure',

  /* ================================================= une liaison de touche, relue en trois */

  /**
   * Le bit `0x01000000` vaut appui long, et c'est **mesuré** — l'écran natif de XCTrack
   * l'affiche en toutes lettres. « appui simple » est son complément.
   */
  'preferences.longPress': 'appui long',
  'preferences.shortPress': 'appui simple',
  /**
   * Le code seul, quand ni le relevé matériel ni la table Android ne nomment la touche.
   * `{code}` passe en **`string`** : c'est un code Android, pas un compte — « 16 777 240 »
   * ne se trouve dans aucun fichier XCTrack.
   */
  'preferences.rawCode': 'code {code}',
  'preferences.codeAndName': 'code {code}, {name}',

  /* --------------------------------- ce que notre relevé de touches physiques peut dire */

  'preferences.physicalKeyCount': {
    one: '{count} touche physique',
    other: '{count} touches physiques'
  },

  /**
   * ⚠️ Les phrases les plus délicates de l'écran : elles parlent de **matériel**, et le
   * relevé ne couvre qu'un modèle quand le parc n'est pas homogène. Aucune traduction ne
   * doit leur faire dire qu'une touche n'existe pas ni qu'un réglage est sans effet.
   */
  'preferences.hardwareUnsurveyedUnknownDevice':
    'Nous n’avons mesuré les touches physiques que sur {models}, et ce fichier ne dit pas de quel appareil il vient : ce boîtier-ci est un angle mort. Le code de chaque liaison est lu et nommé ci-dessus, mais nous ne savons pas quelle touche l’émet.',
  'preferences.hardwareUnsurveyedOtherDevice':
    'Nous n’avons mesuré les touches physiques que sur {models}, et ce fichier vient d’un autre appareil ({device}) : ce boîtier-ci est un angle mort. Le code de chaque liaison est lu et nommé ci-dessus, mais nous ne savons pas quelle touche l’émet.',
  'preferences.hardwareSurveyed':
    'Sur {model} — le modèle que ce fichier déclare — nous n’avons pressé que {keys} : {listed}. {missing} La mesure a été faite sur un seul boîtier, et les modèles plus récents en portent davantage.',
  /**
   * ⚠️ **Deux crans, deux phrases**, et jamais une seule qui les mélangerait. Un code que
   * le noyau du boîtier déclare est possible sur ce matériel ; un code qu'il ne déclare
   * nulle part n'est attesté par rien. Le 2026-08-22, l'écran disait des deux la même
   * chose — et le disait du code 27, que le contrôleur de clavier déclare.
   *
   * Quatre phrases entières plutôt qu'un pluriel : le compte des codes n'apparaît nulle
   * part dans la phrase — c'est la liste des codes qui s'y écrit, pas leur nombre.
   */
  'preferences.hardwareDeclaredOne':
    'Le code {codes} n’est aucune d’elles ; le noyau du boîtier le déclare tout de même, ce qui le rend possible sur ce matériel sans qu’un appui l’ait prouvé.',
  'preferences.hardwareDeclaredMany':
    'Les codes {codes} n’en sont aucune ; le noyau du boîtier les déclare tout de même, ce qui les rend possibles sur ce matériel sans qu’un appui les ait prouvés.',
  'preferences.hardwareStrangerOne':
    'Le code {codes} n’est aucune d’elles, et le noyau du boîtier ne le déclare sur aucun de ses périphériques d’entrée : nous ne savons pas quelle touche l’émet.',
  'preferences.hardwareStrangerMany':
    'Les codes {codes} n’en sont aucune, et le noyau du boîtier ne les déclare sur aucun de ses périphériques d’entrée : nous ne savons pas quelles touches les émettent.',
  /** Le renvoi de l'infobulle vers la note du bloc, qui dit ce que chaque relevé vaut. */
  'preferences.keyNoteBelow': 'La note sous ce bloc dit ce que ces relevés valent.',

  /* ------------------------------------------- d'où vient le nom qu'on lit sur la ligne */

  /**
   * ⚠️ **Trois crans de connaissance, et ils ne se mélangent pas.** L'écran des touches
   * met côte à côte un nom relevé en pressant la touche (« volume haut ») et un nom lu
   * dans la table des touches d'Android (`KEYCODE_STEM_2`). Un pilote-testeur y a vu, le
   * 2026-08-22, une traduction oubliée. Ce n'en est pas une : c'est une mesure qui manque,
   * et ces phrases le disent plutôt que de laisser croire à une négligence.
   *
   * Le même jour, `getevent -pl` a fait apparaître le cran du milieu : le **noyau du
   * boîtier** déclare des codes que personne n'a pressés — `CAMERA` en 27, quatre codes
   * de croix directionnelle. Un code déclaré est possible sur ce matériel ; il n'est pas
   * prouvé. Le confondre avec un code inconnu du matériel, c'était contredire l'appareil.
   *
   * Aucune ne doit faire dire qu'une touche n'existe pas : le parc n'est pas homogène.
   */
  /* ---------------------------------- ce que le noyau du boîtier déclare, en quatre mots */

  /**
   * ⚠️ **Notre glose, et non le relevé.** Le noyau déclare « mtk-kpd », « ACCDET » et des
   * codes ; dire de l'un qu'il est la prise casque est notre lecture. Elle a vécu en
   * français dans `preferenceDomains.json` jusqu'au 2026-08-22 et s'affichait telle quelle
   * dans les cinq langues, au milieu d'une infobulle allemande.
   *
   * Ces quatre-là entrent dans « le noyau du boîtier le déclare sur … » : ils doivent donc
   * porter, dans chaque langue, la forme que cette phrase-là demande.
   *
   * ⚠️ `{name}` est le nom que le **noyau** donne à la puce — « sn7326-key ». C'est une
   * mesure : il se recopie tel quel, jamais traduit, et c'est lui qui permet de refaire le
   * relevé.
   */
  'inputDevice.keypad': 'le clavier du boîtier',
  'inputDevice.keyboardController': 'le contrôleur de clavier {name}',
  'inputDevice.touchPanel': 'la dalle tactile',
  'inputDevice.headsetJack': 'la prise casque',

  'preferences.keyFromSurvey':
    '« {label} » est le nom que XCTrack donne à cette touche, dans la langue du fichier ouvert. Sur {model}, une touche pressée à la main émet bien le code {code}, qu’Android nomme {name}.',
  'preferences.keyFromKernel':
    '{name} est le nom que la table des touches d’Android donne au code {code}. Nous n’avons pressé aucune touche qui l’émette sur {model}, mais le noyau du boîtier le déclare sur {devices}. Ce code est donc possible sur ce matériel, ce qui ne prouve pas qu’un bouton lui soit soudé.',
  'preferences.keyFromNeither':
    '{name} est le nom que la table des touches d’Android donne au code {code}. Nous n’avons pressé aucune touche qui l’émette sur {model}, et le noyau du boîtier ne le déclare sur aucun de ses périphériques d’entrée : nous ne savons pas d’où il vient.',
  'preferences.keyFromAndroid':
    '{name} est le nom que la table des touches d’Android donne au code {code}. Cette table nomme un code, pas un bouton : elle ne dit pas laquelle de vos touches l’émet, et nous n’avons pas relevé celle-ci à la main.',
  'preferences.keyFromNowhere':
    'Le code {code} ne figure dans aucune table de touches que nous ayons lue. Aucun nom ne lui est donné ici : en inventer un serait le pire des services.',
  /**
   * ⚠️ **Une hypothèse, et la phrase le dit avant toute chose.** Le code 266 est celui
   * que le pilote presse le plus en compétition, et aucun des quatre périphériques
   * d'entrée du boîtier ne peut le produire. Le laisser nu serait pire que de le dire
   * mal ; l'expliquer serait pire encore. Ce qui est écrit ici est ce qui est su : un
   * fait, une piste, et ce qui manquerait pour trancher.
   *
   * ⚠️ **Elle s'écrit en clair sous le bloc, jamais en infobulle.** Elle a vécu un jour
   * dans un `title` et le pilote-testeur du 2026-08-22 l'a jugée « inatteignable au
   * tactile » : sur une tablette, il n'y a pas de survol du tout, et l'écran perdait
   * alors la seule réserve qu'il porte. Elle nomme donc le code, puisqu'elle est écrite
   * une fois par bloc et non sur la ligne.
   */
  'preferences.keyInjectionHypothesis':
    'Hypothèse, non vérifiée, sur le code {code} : une application installée sur l’appareil peut injecter un code sans qu’aucune touche l’émette, et le paquet {addon} est présent sur ce boîtier. Rien ne le prouve — seul un appui, ou la lecture de cette application, trancherait.',
  /**
   * ⚠️ **Notre glose, jamais un libellé réécrit.** « Lance une intention Android » est ce
   * que XCTrack affiche en français, extrait de l'APK — c'est le mot que le pilote
   * retrouvera sur son appareil. Un pilote-testeur a dit le 2026-08-22 : « en français ça
   * ne veut rien dire du tout ». La phrase l'explique à côté ; elle ne le remplace pas.
   */
  'preferences.intentGloss':
    'Une « intention » (intent, en anglais) est le message par lequel une application Android en fait réagir une autre. Cette touche ne pilote donc pas XCTrack : elle envoie un signal, et c’est une autre application, réglée sur l’appareil, qui y répond.',

  'preferences.keyNamingOrigin':
    'Un nom en toutes lettres est celui que XCTrack donne à la touche, dans la langue du fichier ouvert ; il ne s’affiche que pour les touches que nous avons pressées à la main sur ce modèle. Un nom en KEYCODE_ vient de la table des touches d’Android, qui nomme le code et non le bouton. Entre les deux se glisse un troisième cran : le noyau du boîtier déclare des codes que nous n’avons jamais pressés, et un code déclaré est possible sur ce matériel sans qu’un bouton l’émette pour autant. Un nom qui manque est donc une mesure qui manque, jamais une touche qui n’existerait pas.',

  /* ================================================== pourquoi il n'y a rien à comparer */

  'preferences.runtimeDefaultReason':
    'XCTrack remplit cette liste en code et sa valeur d’usine dépend de la langue et du pays de l’appareil : il n’y a rien à comparer.',
  'preferences.unknownSettingReason':
    'Cet éditeur ne connaît pas ce réglage : il n’en sait ni le rôle ni la valeur d’usine.',
  'preferences.noFactoryValueInCatalogue':
    'Le catalogue ne relève aucune valeur d’usine pour ce réglage.',
  'preferences.structuredVsScalar':
    'La valeur du fichier est une structure ; celle du catalogue des valeurs d’usine est une valeur simple.',

  /* ============================================== pourquoi une ligne ne se règle pas ici */

  'preferences.refusalUnknown':
    'Cet éditeur ne sait pas ce que règle cette ligne du fichier : il ne propose pas de la changer. Elle est conservée telle quelle.',
  'preferences.refusalState':
    'Cette ligne enregistre l’état de l’application, pas un réglage : elle ressort intacte, jamais réécrite.',
  'preferences.refusalUnlabelled':
    'XCTrack ne nomme ce réglage nulle part qu’on puisse lire : sans son libellé, cet éditeur ne propose pas de le changer.',
  'preferences.refusalStructured':
    'Valeur composée : cette page la montre telle quelle, sans l’ouvrir, et ne la réécrit jamais.',
  /**
   * Formulée **sans nombre** : la même phrase sert d'infobulle sur une ligne et de note
   * sous un bloc de quinze.
   */
  'preferences.refusalAction':
    'Sur l’appareil, cela s’obtient par une boîte de dialogue — une touche à presser sur l’instrument, une table à bâtir — que cette page ne peut pas tenir à sa place. La valeur reste lue, et le document ressort intact.',
  'preferences.refusalNoValue':
    'Cela ne se saisit pas : la ligne commande, elle ne porte pas de valeur.',
  'preferences.refusalNote': {
    one: '{count} réglage de ce bloc ne se règle pas ici. {reason}',
    other: '{count} réglages de ce bloc ne se règlent pas ici. {reason}'
  },

  /* ======================================================= la marque d'état, en trois mots */

  /**
   * Ni le mot « défaut », ni les signes = et ≠ : le premier se lit *anomalie*, les seconds
   * sont des mathématiques posées sur le nom du pilote. L'infobulle, elle, a la place
   * d'une phrase.
   */
  'preferences.stateCustom': 'réglé par vous',
  'preferences.stateDefault': 'valeur d’usine',
  'preferences.stateConflict': 'valeur d’usine incertaine',
  'preferences.stateAbsent': 'absente du fichier',
  'preferences.stateUnwritten': 'jamais réglée',
  'preferences.stateUndecidable': 'rien à comparer',

  /* ------------------------------------------------ l'infobulle de la marque, en entier */

  'preferences.stateTitleCustomUnknown': 'Cette valeur diffère de la valeur d’usine de XCTrack.',
  'preferences.stateTitleCustom': 'La valeur d’usine de XCTrack est « {factory} ».',
  'preferences.stateTitleDefault': 'Valeur inchangée : c’est la valeur d’usine de XCTrack.',
  'preferences.stateTitleConflict':
    'XCTrack annonce deux valeurs d’usine différentes pour ce réglage : « {code} » dans son code et « {screen} » dans son écran de réglages. Cet éditeur ne choisit pas à sa place. Votre valeur, elle, est celle du fichier.',
  'preferences.stateTitleAbsent':
    'Ce réglage n’est pas dans le fichier : il n’en dit rien. {absent}',
  'preferences.stateTitleAbsentWithValue':
    'Ce réglage n’est pas dans le fichier : il n’en dit rien. {absent} Elle vaut « {factory} ».',
  'preferences.stateTitleUnwritten':
    'Ce réglage n’est pas dans le fichier, et XCTrack ne l’y écrit qu’une fois réglé au moins une fois sur l’appareil : son absence ne dit rien — ni ce que votre appareil applique, ni ce qu’il appliquerait neuf.',
  'preferences.stateTitleNoFactoryValue': 'Aucune valeur d’usine connue pour ce réglage.',

  /* ================================================================== les trois gestes */

  /** Ce qui s'écrit dans l'historique : « Annuler » doit se lire dans les mots du geste. */
  'preferences.editInsertDescription': 'Écrire {label} dans le fichier',
  'preferences.editSetDescription': 'Régler {label}',
  /** Le même texte sert de phrase d'historique et de nom accessible du bouton. */
  'preferences.removeFromFile': 'Retirer {label} du fichier',
  'preferences.restoreToFactoryValue': 'Rétablir {label} à sa valeur d’usine',

  /* --------------------------------------- 1. écrire une valeur que le fichier n'a pas */

  'preferences.factoryValueUnknown': 'valeur d’usine inconnue',
  'preferences.factoryValueUnknownTitle':
    'Le catalogue ne relève aucune valeur d’usine inscriptible pour ce réglage : cet éditeur n’a rien avec quoi la créer, et il n’en invente pas.',
  'preferences.implicitTitle':
    '« {factory} » est la valeur d’usine de XCTrack, pas une valeur réglée : ce réglage n’est pas dans le fichier. {absent}',
  'preferences.adoptLabel': 'Définir cette valeur',
  'preferences.adoptTitle':
    'Écrit « {key} » : {factory} dans le fichier.\n\nSur un appareil qui n’a jamais réglé cela, c’est déjà ce qu’il applique : l’écrire ne change alors rien d’immédiat, et met le réglage à l’abri d’une mise à jour de XCTrack qui changerait sa valeur d’usine.\n\nSur un appareil qui l’a déjà réglé, l’import écrira cette valeur à la place de la sienne : tant que le fichier n’en dit rien, il garde la sienne (mesuré sur l’AIR³, import « Remplacer tout »).',

  /* ------------------------------------------- 2. retirer une valeur égale à celle d'usine */

  /**
   * ⚠️ **L'intitulé nomme son objet, et c'est tout ce qui manquait.** Il a dit « Retirer »
   * seul jusqu'au 2026-08-22. Un pilote-testeur s'est arrêté devant : « je n'y ai pas
   * touché […] le manuel l'explique très bien, mais le bouton est sous mes yeux et le
   * manuel est ailleurs. » Il a failli abandonner l'essai là.
   *
   * Retirer **quoi** ? Un mot seul laissait croire au geste qu'un pilote redoute — perdre
   * son réglage. Le vrai geste ne touche qu'au fichier, et l'appareil garde ce qu'il a :
   * c'est exactement ce que trois mots disent, et qu'un seul ne pouvait pas dire.
   *
   * Ses deux voisins nommaient déjà le leur — « Définir cette valeur », « Rétablir la
   * valeur d'usine ». Celui-ci était le seul verbe nu des trois.
   *
   * Le nom accessible du bouton (`preferences.removeFromFile`) disait déjà « Retirer
   * {label} du fichier » : l'intitulé visible le rejoint, il ne le contredit plus.
   */
  'preferences.dropLabel': 'Retirer du fichier',
  'preferences.dropTitle':
    'Retire « {key} » du fichier : il ne dira plus rien de ce réglage.\n\n{absent}\n\nCe que ça change pour l’appareil qui n’y a jamais touché : la valeur cesse d’être figée et suivra les mises à jour de XCTrack. C’est l’inverse exact de « Définir cette valeur ».',

  /* ---------------------------------- 3. remplacer une valeur réglée — le seul qui agit */

  /**
   * ⚠️ **Le même mot à mot que dans le panneau des gadgets** (`ui/properties.ts`) : deux
   * formulations pour un même geste, sur deux écrans du même outil, seraient un défaut à
   * elles seules.
   */
  'preferences.restoreLabel': 'Rétablir la valeur d’usine',
  'preferences.restoreTitle':
    'Écrit « {key} » : {factory} dans le fichier, à la place de {current}.\n\nCe geste-ci n’est pas comme les deux autres de cette page : ils ne touchent qu’un réglage que vous n’avez jamais choisi, celui-ci remplace le vôtre par celui que XCTrack pose sur une installation neuve.{caveat}',
  'preferences.restoreNote':
    '« {factory} » d’usine, « {current} » dans ce fichier. Rétablir change ce que fait l’appareil en vol.{caveat}',
  /**
   * ⚠️ Ces deux-là commencent par une **espace** : elles s'ajoutent à la fin d'une phrase
   * qui se suffit sans elles, et rien à dire quand la version coïncide — une phrase de
   * prudence servie à tort apprend à ne plus lire les phrases de prudence.
   */
  'preferences.restoreCaveatIndicative':
    ' Cette valeur d’usine vient du catalogue de XCTrack {version}, qui n’est pas la version d’où vient ce fichier : vérifiez que c’est bien celle à rétablir.',
  'preferences.restoreCaveatUnstated':
    ' Cette valeur d’usine vient du catalogue de XCTrack {version} et la version de ce fichier n’est pas connue ici : vérifiez que c’est bien celle à rétablir.',

  /* ==================================================== les contrôles, et ce qu'ils valent */

  /**
   * D'où vient la liste d'unités qu'on vient de fermer. ⚠️ `{method}` et `{caveats}` sont
   * des **données** lues dans `preferenceDomains.json`, écrites en français à la source :
   * elles ne passent pas par ce catalogue.
   */
  'preferences.unitListNote':
    'Cette liste a été mesurée sur {device}, XCTrack {version} : {method}. À savoir : {caveats}.',
  'preferences.freeListTitle':
    'XCTrack remplit cette liste en code : notre relevé des versions n’en donne pas les valeurs et elles n’ont pas été mesurées sur l’appareil. Cet éditeur ne propose donc pas de choix, et la valeur est écrite telle que vous la saisissez.',

  /* ============================================================== le bandeau de tête */

  /**
   * Trois nombres justes et différents, et c'est tout l'intérêt de cet écran. « 30 réglages
   * réglés par le pilote » parlait du pilote à la troisième personne et répétait le même
   * mot deux fois.
   */
  'preferences.summaryCount': 'Vous avez réglé {custom} des {settings} que XCTrack propose.',

  'preferences.detailDefault': {
    one: '{count} à la valeur d’usine',
    other: '{count} à la valeur d’usine'
  },
  'preferences.detailAbsent': {
    one: '{count} absente du fichier',
    other: '{count} absentes du fichier'
  },
  'preferences.detailUnwritten': {
    one: '{count} jamais réglée',
    other: '{count} jamais réglées'
  },
  'preferences.detailUndecidable': {
    one: '{count} sans valeur d’usine connue',
    other: '{count} sans valeur d’usine connue'
  },
  'preferences.detailConflict': {
    one: '{count} à la valeur d’usine incertaine',
    other: '{count} à la valeur d’usine incertaine'
  },
  'preferences.restUnlabelled': {
    one: '{count} sans libellé dans l’application',
    other: '{count} sans libellé dans l’application'
  },
  /** Le même mot que le bloc de fin de page, faute de quoi l'écran se contredirait. */
  'preferences.restState': {
    one: '{count} mémorisée par l’application',
    other: '{count} mémorisées par l’application'
  },
  'preferences.restUnknown': {
    one: '{count} inconnue de ce catalogue',
    other: '{count} inconnues de ce catalogue'
  },

  'preferences.fileCarries': 'Ce fichier contient {lines} en tout.',
  'preferences.fileCarriesWithRest': {
    one: 'Ce fichier contient {lines} en tout : {count} ne correspond à aucun réglage d’un écran de l’appareil — {rest}. Elle est listée en fin de page.',
    other: 'Ce fichier contient {lines} en tout : {count} ne correspondent à aucun réglage d’un écran de l’appareil — {rest}. Elles sont listées en fin de page.'
  },

  /* -------------------------------------------- d'où vient ce que la page affirme */

  /**
   * ⚠️ Le `versionCode` du relevé n'est plus cité ici. Il ouvrait une parenthèse au milieu
   * de la phrase — « (versionCode 91230) » — sur un numéro que XCTrack ne montre nulle
   * part au pilote ; le NOM de version, lui, est celui qu'il lit sur son instrument.
   * Le numéro reste dans « Version et compatibilité », l'écran dont c'est le sujet.
   */
  'preferences.catalogReference':
    'Libellés et valeurs d’usine extraits de XCTrack {version}',
  'preferences.catalogNoteExact': '{reference} — la version même de ce fichier.{fallback}',
  'preferences.catalogNoteUnstated':
    '{reference}. Ce fichier ne dit pas de quelle version il vient : les libellés et les valeurs d’usine changent d’une version à l’autre, la lecture est donc indicative.{fallback}',
  'preferences.catalogNoteIndicative':
    '{reference}. Ce fichier vient de {file} : les libellés et les valeurs d’usine changent d’une version à l’autre, la lecture est donc indicative.{fallback}',
  /** ⚠️ Commence par une espace : elle s'ajoute à la fin de la note qui précède. */
  'preferences.catalogFallback': {
    one: ' {count} texte manque dans cette langue et est affiché en anglais.',
    other: ' {count} textes manquent dans cette langue et sont affichés en anglais.'
  },
  'preferences.fileVersionNumber': 'la version {code}',
  'preferences.fileVersionNamed': 'la version {name}',

  /* ======================================================== ce qui désigne quelqu'un */

  'preferences.personalMarkTitle': 'Donnée personnelle — {reason} ({basis}).',
  'preferences.privacyNone':
    'Aucune donnée personnelle repérée dans les préférences de ce fichier',
  'preferences.privacyHead': {
    one: '{count} réglage porte une donnée personnelle · {filled} renseignés, {empty} vides',
    other: '{count} réglages portent une donnée personnelle · {filled} renseignés, {empty} vides'
  },
  /**
   * **Ce que cette page ne compte pas, dit ici.** Taire l'existence de l'autre moitié fait
   * lire « 16 » comme « tout » : les textes des gadgets sont les seuls qui survivent à un
   * export « pages ».
   */
  'preferences.privacyLayoutNone':
    'Cette page ne compte que les préférences. La disposition de ce fichier ne porte aucun texte écrit par vous — c’est la boîte « Enregistrer » qui les inventorie, et ce sont les seuls qui partiraient avec un export « pages ».',
  'preferences.privacyLayoutSome': {
    one: 'Cette page ne compte que les préférences. La disposition en porte {count} de plus — des textes écrits par vous dans les gadgets — et ce sont les seuls qui partent avec un export « pages ». La boîte « Enregistrer » les montre un par un.',
    other: 'Cette page ne compte que les préférences. La disposition en porte {count} de plus — des textes écrits par vous dans les gadgets — et ce sont les seuls qui partent avec un export « pages ». La boîte « Enregistrer » les montre un par un.'
  },
  'preferences.privacyItemWhy': '{kind} — {reason}',
  'preferences.privacyNavigationState':
    '« Navigation.State » est une préférence publique de XCTrack : elle voyage avec le fichier. Elle porte la tâche en cours — points de virage et coordonnées — soit {value} ici. Cette page n’en montre jamais le contenu ; un fichier transmis, lui, l’emporte.',
  'preferences.privacyGuessPosition':
    'XCTrack garde aussi une position présumée de l’appareil (« App.GuessLatitude », « App.GuessLongitude ») — en pratique le domicile. Elles sont internes à l’appareil : aucun export ne les porte, et ce fichier ne les porte pas.',
  'preferences.privacySecureKeys': {
    one: 'XCTrack chiffre les identifiants de compte (XContest, SkySight, SafeSky…) : le {count} réglage concerné ne sort jamais de l’appareil, et aucun export n’en porte.',
    other: 'XCTrack chiffre les identifiants de compte (XContest, SkySight, SafeSky…) : les {count} réglages concernés ne sortent jamais de l’appareil, et aucun export n’en porte.'
  },
  /**
   * La conséquence, qui n'est pas une évidence : les seules clés dont XCTrack déclare
   * lui-même le caractère sensible sont celles qui ne sortent jamais.
   */
  'preferences.privacyJudged': {
    one: 'La {count} ligne de ce fichier n’est pas signalée par XCTrack lui-même : les seuls réglages dont il déclare la sensibilité sont ceux qu’il chiffre, et elles ne sont pas exportées. Cet inventaire est donc un jugement de cet éditeur, et chaque ligne dit le sien.',
    other: 'Aucune des {count} lignes de ce fichier n’est signalée par XCTrack lui-même : les seuls réglages dont il déclare la sensibilité sont ceux qu’il chiffre, et elles ne sont pas exportées. Cet inventaire est donc un jugement de cet éditeur, et chaque ligne dit le sien.'
  },
  'preferences.filledPersonal': {
    one: 'Vous venez de renseigner {count} donnée personnelle — {keys}. Elle voyagera avec ce fichier : la boîte « Enregistrer » vous laisse choisir ce qui part.',
    other: 'Vous venez de renseigner {count} données personnelles — {keys}. Elles voyageront avec ce fichier : la boîte « Enregistrer » vous laisse choisir ce qui part.'
  },

  /* ========================================== ce que le fichier porte et qu'aucun écran ne montre */

  'preferences.leftoverTitleUnlabelled': 'Réglages sans libellé',
  'preferences.leftoverTitleState': 'Ce que l’application a mémorisé (pas des réglages)',
  'preferences.leftoverTitleUnknown': 'Lignes que ce catalogue ne connaît pas',
  'preferences.leftoverLeadUnlabelled':
    'Ce sont bien des réglages, mais XCTrack les configure dans des écrans construits en code, où la ligne du fichier n’est plus rattachée à son libellé : l’application ne les nomme nulle part qu’on puisse lire. La valeur et la comparaison à la valeur d’usine restent justes — c’est le nom qui manque, pas le sens.',
  'preferences.leftoverLeadState':
    'Ces lignes ne règlent rien : elles enregistrent l’état de l’application. Cette page en donne la nature et la taille, jamais le contenu.',
  'preferences.leftoverLeadUnknown':
    'Cet éditeur ne sait pas ce que ces lignes règlent : elles ont été écrites par une autre version de XCTrack que celle dont le catalogue parle. Elles ne sont ni supprimables ni négligeables — simplement inconnues, et conservées telles quelles.',
  'preferences.noFamily': '(sans famille)',

  /* ================================================ un fichier qui ne porte aucune préférence */

  'preferences.emptyTitle': 'Ce fichier ne porte aucune préférence générale.',
  'preferences.emptyText':
    'Seuls les exports « backup » emportent les réglages de l’application. Un export « pages » ne décrit que les pages et leurs gadgets : ouvrir une sauvegarde complète de l’appareil est la seule façon de voir ces réglages-là.',
  'preferences.emptyIntact':
    'Rien n’est perdu pour autant : ce que cette page ne montre pas, ce fichier ne le contient pas, et un réexport le laissera tel quel.',
  /** ⚠️ « Pas de préférences » ne veut pas dire « rien de personnel ». */
  'preferences.emptyPersonalWarning': {
    one: 'Attention : « aucune préférence » ne veut pas dire « rien de personnel ». La disposition de ce fichier porte {count} texte écrit par vous dans ses gadgets — un titre, un nom, un numéro de téléphone —, et un export « pages » les emporte. La boîte « Enregistrer » les montre un par un.',
    other: 'Attention : « aucune préférence » ne veut pas dire « rien de personnel ». La disposition de ce fichier porte {count} textes écrits par vous dans ses gadgets — un titre, un nom, un numéro de téléphone —, et un export « pages » les emporte. La boîte « Enregistrer » les montre un par un.'
  },

  /* ================================================================= la page, et sa tête */

  /** Le menu « Fichier » nomme cette page de ce nom-là : les deux doivent coïncider. */
  'preferences.pageTitle': 'Réglages généraux',
  'preferences.pageSubtitle': 'Ce que XCTrack règle hors des pages de gadgets',
  'preferences.pageSubtitleNamed': '{file} — ce que XCTrack règle hors des pages de gadgets',

  /**
   * ⚠️ **Un renseignement, jamais un avertissement.** Rien n'est en défaut : le fichier
   * déclare une langue, l'outil la respecte, et c'est même l'une des choses que ce projet
   * tient à montrer.
   *
   * Elle existe parce qu'un pilote-testeur a lu les captures allemande, néerlandaise et
   * espagnole de cet écran comme « un écran presque entièrement en français », et en a
   * conclu à un bug. Il n'y en avait pas — mais sur les 8 800 px de l'écran, le mot
   * « langue » n'apparaissait pas une seule fois : l'explication vivait dans le bandeau de
   * la vue d'ensemble et dans la boîte des langues, jamais là où le doute naît.
   *
   * ⚠️ Elle nomme la langue **réellement affichée**, jamais celle que le fichier déclare :
   * XCTrack ne livre ses libellés que dans 35 langues, et une déclaration hors de cette
   * liste retombe sur l'anglais. « Ils suivent le fichier ouvert » reste vrai des deux
   * côtés de ce repli ; « la langue que le fichier déclare » ne le serait pas.
   */
  'preferences.labelsFromFile':
    'Les noms de réglages ci-dessous sont ceux de XCTrack et s’affichent en {language} : ils suivent le fichier ouvert, jamais la langue de cette interface. C’est voulu — ce sont les mots que vous retrouverez sur votre instrument.',

  'preferences.menuLead':
    'Les écrans sont ceux de l’appareil, dans l’ordre de son menu de réglages.',
  'preferences.menuLeadEditable':
    'Les écrans sont ceux de l’appareil, dans l’ordre de son menu de réglages. Un réglage modifié est écrit dans le document aussitôt ; « Annuler » le défait, et rien ne part sur le disque avant « Enregistrer ».',
  'preferences.entryNothing': 'Rien de cet écran n’apparaît dans ce fichier.',
  'preferences.neverExported': {
    one: '{count} réglage de cet écran ne quitte jamais l’appareil : XCTrack ne les exporte pas.',
    other: '{count} réglages de cet écran ne quittent jamais l’appareil : XCTrack ne les exporte pas.'
  },

  /* --------------------------------- le compte qui donne sa mesure à une entrée muette */

  'preferences.tallyNone':
    'Ce fichier en porte {lines} : aucune ne porte de libellé, toutes sont listées en fin de page sous leur nom brut.',
  'preferences.tallySome':
    'Ce fichier en porte {lines}, dont {named} ; {listed} en fin de page sous leur nom brut.',
  'preferences.tallyNamed': {
    one: 'une seule porte un libellé et est affichée dans un autre écran',
    other: '{count} portent un libellé et sont affichées dans un autre écran'
  },
  'preferences.tallyListed': {
    one: '{count} est listée',
    other: '{count} sont listées'
  },

  /* ============================================== les lignes du menu qu'on ne déplie pas */

  /**
   * ⚠️ Les deux premières citent les titres des blocs de fin de page
   * (`preferences.leftoverTitleUnlabelled`, `…State`) : une traduction doit y reprendre
   * **exactement** ces titres, sans quoi l'écran se contredirait d'un bloc à l'autre.
   */
  'preferences.menuNoteAirspaces':
    'XCTrack construit cet écran en code : le réglage y est posé loin de son libellé, et l’application ne le nomme donc nulle part qu’on puisse lire. Les réglages qu’elle écrit sont bien dans le fichier — ils sont rassemblés plus bas, sous « Réglages sans libellé » et « Ce que l’application a mémorisé ».',
  'preferences.menuNoteMaps':
    'Écran construit en code, lui aussi sans libellé exploitable. Les lignes « Mapsforge » du fichier sont rassemblées plus bas.',
  'preferences.menuNoteEditPageSet':
    'Cette ligne ouvre l’éditeur de pages et de gadgets — c’est le reste de cet éditeur qui les montre, pas cette page.',
  'preferences.menuNoteEventMapping':
    'Les actions automatiques sont enregistrées en bloc dans « EventMappingJs » : un petit programme écrit d’une traite, et non une liste de réglages.',
  'preferences.menuNotePro':
    'L’abonnement se gère sur le compte XContest, pas dans le fichier de configuration.',
  'preferences.menuNoteSensors':
    'Cet écran sert à apparier les capteurs. Ce qu’il enregistre tient en une seule ligne, « Sensors.Configuration », rassemblée plus bas avec le reste de ce que l’application a mémorisé.',
  'preferences.menuNoteShareConfig':
    'Cet écran ne porte que deux commandes — exporter, importer une configuration. Il n’a aucun réglage à retenir.',
  'preferences.menuNoteAbout':
    'Cet écran n’affiche que des informations sur l’application : version, journal des modifications, mentions. Rien qui se règle.',
  'preferences.menuNoteInfoOnly': 'Ligne d’information sans réglage.',

  /* ============================================================ les commandes de la page */

  /** Sert de texte indicatif du champ **et** de son nom accessible. */
  'preferences.filterPlaceholder': 'Filtrer les réglages',
  /**
   * Le pilote, c'est lui : un bouton « Seulement ce que le pilote a réglé » donnerait
   * l'impression de consulter le dossier de quelqu'un d'autre.
   */
  'preferences.onlyMine': 'Seulement ce que j’ai réglé',
  'preferences.showAll': 'Tout afficher',
  'preferences.maskPersonal': 'Masquer les valeurs personnelles',
  'preferences.showPersonal': 'Montrer les valeurs personnelles',
  'preferences.close': 'Fermer'
} as const

export default preferences

export type FrenchPreferences = typeof preferences
