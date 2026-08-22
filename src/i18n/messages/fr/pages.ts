/**
 * `pageManager.ts`, `deviceSelector.ts` — les pages, et le gabarit qui les dessine.
 *
 * ## Ces phrases sont lues deux fois, et la seconde fois hors contexte
 *
 * Les cinq `pages.describe*` ne servent pas qu'à l'annonce du carrousel : l'appelant les
 * enregistre comme **pas d'historique** (`model/history.ts`), et elles reviennent telles
 * quelles dans le libellé du bouton — « Annuler : Dupliquer la page 3 au rang 4
 * (paysage) ». Un pilote d'essai a cité ces libellés comme un point fort de l'outil.
 *
 * Conséquence pour le traducteur : **chaque `describe*` doit se lire seule, dans un menu,
 * loin du bouton qui l'a produite.** D'où trois exigences que les cinq langues tiennent
 * ici :
 *
 * 1. **la forme est celle d'un geste nommé** — infinitif en français, en espagnol et en
 *    néerlandais, infinitif rejeté en fin de phrase en allemand, impératif nu en
 *    anglais : toutes se placent derrière « Annuler : » sans rien y changer ;
 * 2. **le rang est écrit en toutes lettres** (« la page 3 », pas « celle-ci ») : c'est la
 *    seule identité d'une page, et un démonstratif ne désignerait plus rien dans un menu ;
 * 3. **l'orientation est rappelée entre parenthèses**, parce que les deux carrousels
 *    partagent un seul historique et que « Supprimer la page 3 » y apparaîtrait deux fois.
 *
 * ## Ce que ces textes ne disent plus
 *
 * Aucun ne fait dépendre du **type** d'une page le moment où l'appareil la montre. C'est
 * le réglage `navigations` qui en décide, et lui seul — mesuré sur un AIR³ le 22 août 2026
 * (`docs/reference/2026-08-22-essai-pilote.md` § 2). La clé `pages.hiddenOffFlight`, qui
 * l'affirmait, a été retirée des cinq catalogues.
 *
 * ## Ce qu'ils disent comme une supposition, et doivent continuer de dire ainsi
 *
 * « C'est la dernière page d'assistant de thermique que vise le basculement automatique »
 * n'est **pas** un relevé : le § 5.4 du relevé d'édition native dit seulement que la
 * classe est la cible, jamais comment l'appareil départage plusieurs pages de cette
 * classe. Les quatre messages concernés — `thermalAlreadyPresent`, `thermalMultiple`,
 * `autoSwitchWouldTarget`, `autoSwitchTarget*` — écrivent donc « cet éditeur suppose »,
 * et non « l'appareil vise ». La nuance est le sujet même du projet : elle survit à la
 * traduction dans les cinq langues.
 *
 * ## Ce qui n'entre pas ici, et pourquoi
 *
 * **Aucun mot de XCTrack.** Deux familles sont dans ce cas, et aucune des deux ne se
 * traduit ici :
 *
 * - les quatre titres de « Choisissez une nouvelle page » — *Aide thermique*, *Aide XC*,
 *   *Compétition*, *Vide* — se lisent dans `src/catalog/widgetLabels.json`
 *   (`pageClassLabel`). Seule la **note** affichée sous chaque titre est de nous, et elle
 *   est déjà au catalogue, sous `pageKind.*Note` dans le domaine `app` ;
 * - les cinq noms de navigation se lisent dans `src/catalog/navigationLabels.json`
 *   (`navigationLabel`). Ils étaient ici jusqu'au 2026-08-22 ; voir la trace laissée en
 *   fin de fichier.
 *
 * Les deux suivent l'axe `labels`, celui du fichier ouvert, et non celui du pilote
 * (`src/i18n/axes.ts`). Les traduire ici les ferait suivre le mauvais axe, et un libellé
 * « traduit » est un mot que le pilote ne trouve nulle part sur son appareil.
 */
const pages = {
  /* ==================================================== `deviceSelector.ts` — le gabarit */

  /** Les chiffres changent de langue, le reste non : « 48,3 × 27,2 mm » ou « 48.3 × 27.2 mm ». */
  'device.screenSize': '{width} × {height}',

  'device.templateLabel': 'Gabarit d’écran',

  /**
   * L'intitulé **affiché** du groupe. La valeur qui sert de marqueur dans un `Device`
   * — `CUSTOM_GROUP`, `'Ratios courants'` — reste, elle, une constante du code : elle est
   * écrite dans `localStorage` et comparée, donc elle ne peut pas changer avec la langue.
   */
  'device.commonRatiosGroup': 'Ratios courants',
  'device.customGroup': 'Mes appareils',

  'device.addDevice': 'Ajouter un appareil…',

  'device.widthPx': 'Largeur (px)',
  'device.heightPx': 'Hauteur (px)',
  'device.diagonalInches': 'Diagonale (pouces)',

  /**
   * `{diagonal}` reçoit `format.inches`, qui écrit le signe et non l'abréviation « po ».
   * `{width}` et `{height}` sont des pixels : ils passent en `number` et suivent donc la
   * langue, séparateur de milliers compris — « 2 400 » en français, « 2,400 » en anglais.
   */
  'device.note': '{diagonal} · {width} × {height} px — la géométrie ne dépend que du ratio, la taille perçue que de la diagonale. Ce choix n’est jamais écrit dans le fichier.',

  'device.namePlaceholder': 'Nom de l’appareil',
  'device.widthPlaceholder': 'Largeur px',
  'device.widthLabel': 'Largeur en pixels',
  'device.heightPlaceholder': 'Hauteur px',
  'device.heightLabel': 'Hauteur en pixels',
  'device.diagonalPlaceholder': 'Diagonale ″',
  'device.diagonalLabel': 'Diagonale en pouces',
  'device.add': 'Ajouter',
  'device.cancel': 'Annuler',

  /**
   * Les trois refus du formulaire. Ils sont levés par `addCustomDevice`, une fonction
   * pure, et affichés tels quels : le formulaire ne devine pas ce qui manquait, il montre
   * la phrase.
   */
  'device.nameRequired': 'Donnez un nom à cet appareil.',
  'device.sizeMustBePositive': 'La largeur et la hauteur doivent être des nombres de pixels positifs.',
  'device.diagonalMustBePositive': 'La diagonale doit être un nombre de pouces positif.',

  /* ================================================ `pageManager.ts` — les orientations */

  /**
   * L'orientation s'écrit de deux façons : en tête de carrousel, où elle est un titre, et
   * entre parenthèses dans un pas d'historique, où elle est une incise. Le français
   * distingue les deux par la capitale, l'allemand ne le peut pas — *Querformat* est un
   * substantif dans les deux emplois. D'où deux clés et non une capitalisation calculée,
   * qu'aucune langue ne supporte de la même façon.
   */
  'pages.landscape': 'Paysage',
  'pages.portrait': 'Portrait',
  'pages.landscapeInline': 'paysage',
  'pages.portraitInline': 'portrait',

  /* ===================================================== ce qui part à l'historique */

  /**
   * `{type}` reçoit le libellé de création de XCTrack — *Aide thermique*, *Vide* — qui
   * suit l'axe `labels` et n'est donc pas traduit ici. Les guillemets, eux, sont de la
   * ponctuation : « … » en français, “ … ” en anglais, „ … “ en allemand, ‘ … ’ en
   * néerlandais, « … » en espagnol.
   */
  'pages.describeInsert': 'Insérer une page « {type} » au rang {rank} ({orientation})',
  'pages.describeDuplicate': 'Dupliquer la page {rank} au rang {target} ({orientation})',
  'pages.describeRemove': 'Supprimer la page {rank} ({orientation})',
  'pages.describeReorder': 'Déplacer la page {rank} au rang {target} ({orientation})',
  'pages.describeSetClass': 'Changer le type de la page {rank} : « {before} » → « {after} » ({orientation})',

  /**
   * Ce que la zone d'annonce dit une fois le geste fait : le pas d'historique, puis la
   * conséquence quand il y en a une. Deux clés plutôt qu'une concaténation, parce que le
   * point final et l'espace qui sépare deux phrases appartiennent à la langue.
   */
  'pages.announcement': '{done}.',
  'pages.announcementWithAdvice': '{done}. {advice}',

  /** « 3 à 5 ». Un rang isolé s'écrit seul, sans passer par un message. */
  'pages.rankRange': '{first} à {last}',

  /* ========================================================= les conséquences d'un geste */

  /**
   * L'avertissement le plus important du module, et la raison d'être des trois suivants :
   * une page n'a pas de nom. Passée en `{identity}` plutôt que recopiée dans chaque
   * message — c'est une phrase entière, toujours en dernier, jamais un fragment.
   */
  'pages.rankIsIdentity': 'Le rang est la seule identité d’une page : c’est lui que vous ' +
    'parcourez en vol.',

  /**
   * ⚠️ Pluriel **sans nombre affiché** : `{count}` choisit la forme, il ne s'écrit pas.
   * « Les pages 3 à 5 deviennent 4 à 6 » ne compte rien, elle nomme des rangs. C'est
   * l'une des trois exceptions déclarées dans `tests/i18n/catalog.test.ts`.
   */
  'pages.rankShift': {
    one: 'La page {from} devient {to}. {identity}',
    other: 'Les pages {from} deviennent {to}. {identity}'
  },

  /** Un déplacement ne décale rien : il échange des rangs entre deux bornes. */
  'pages.rankShiftReorder': 'Les pages {range} changent de rang. {identity}',

  /**
   * ⚠️ Pluriel sans nombre affiché, deuxième exception : « une page » / « des pages ».
   * `{ranks}` est une **liste de rangs**, jointe par `', '` et non par `format.list` :
   * c'est une colonne de données entre parenthèses, pas une énumération en prose.
   */
  'pages.thermalAlreadyPresent': {
    one: 'Ce fichier décrit déjà une page d’assistant de thermique (page {ranks}). XCTrack n’en vise qu’une quand il bascule tout seul en spirale ; cet éditeur suppose la DERNIÈRE, sans l’avoir vérifié sur l’appareil. Si c’est bien elle, en créer une autre après elle prive la page {last} de ce basculement, sans rien changer à son contenu.',
    other: 'Ce fichier décrit déjà des pages d’assistant de thermique (pages {ranks}). XCTrack n’en vise qu’une quand il bascule tout seul en spirale ; cet éditeur suppose la DERNIÈRE, sans l’avoir vérifié sur l’appareil. Si c’est bien elle, en créer une autre après elle prive la page {last} de ce basculement, sans rien changer à son contenu.'
  },

  'pages.lastPageOfOrientation': 'C’est la dernière page de cette orientation : le fichier ' +
    'n’en décrirait plus aucune.',

  'pages.noNavigablePageLeft': 'Il ne resterait que des pages activées pour aucune ' +
    'navigation : quelle que soit la navigation choisie, l’appareil n’aurait plus de page ' +
    'à montrer dans cette orientation.',

  'pages.onlyThermalPage': 'C’est la seule page d’assistant de thermique : le basculement ' +
    'automatique en spirale n’aurait plus de cible.',

  'pages.autoSwitchWouldTarget': 'Le basculement automatique en spirale viserait alors la page {rank}, si c’est bien la dernière qu’il vise — cet éditeur le suppose sans l’avoir vérifié.',

  /**
   * Le seul avertissement du module qui porte sur l'outil et non sur le fichier : nous
   * offrons une commande que XCTrack n'a pas, et nous n'avons pas pu en vérifier l'effet.
   */
  'pages.classChangeUnverified': 'XCTrack ne permet pas de changer le type d’une page ' +
    'après sa création : il s’y fixe au moment du choix. Ce n’est pourtant qu’une ligne ' +
    'du fichier, et cet éditeur l’écrit volontiers — mais le comportement de l’appareil ' +
    'face à une page ainsi modifiée n’a PAS été vérifié, et les gadgets de la page ne ' +
    'sont pas remplacés par ceux du nouveau type.',

  /**
   * ⚠️ Troisième et dernière exception au pluriel sans nombre : ici `{count}` compte les
   * pages **autres que la cible supposée** et n'apparaît pas, tandis que `{total}`, lui,
   * s'affiche. Deux nombres, un seul écrit : c'est pour cela que le pluriel ne peut pas
   * suivre celui qui s'écrit.
   */
  'pages.thermalMultiple': {
    one: '{total} pages d’assistant de thermique (pages {ranks}). XCTrack n’en vise qu’une quand il bascule tout seul en spirale ; cet éditeur suppose la dernière, la page {target}, sans l’avoir vérifié sur l’appareil. La page {others} reste de toute façon atteignable par « page suivante ».',
    other: '{total} pages d’assistant de thermique (pages {ranks}). XCTrack n’en vise qu’une quand il bascule tout seul en spirale ; cet éditeur suppose la dernière, la page {target}, sans l’avoir vérifié sur l’appareil. Les pages {others} restent de toute façon atteignables par « page suivante ».'
  },

  'pages.allPagesWithoutNavigation': 'Toutes les pages de cette orientation sont activées ' +
    'pour aucune navigation : quelle que soit la navigation choisie, l’appareil n’a pas de ' +
    'page à montrer ici.',

  /* ================================================================== le carrousel */

  'pages.regionLabel': 'Pages {orientation}',
  'pages.noPage': 'aucune page',
  'pages.pageCount': { one: '{count} page', other: '{count} pages' },

  'pages.emptyOrientation': 'Cette orientation ne décrit aucune page. Une page neuve ' +
    'arrive vide : ses gadgets se posent ensuite depuis la palette, ou en dupliquant une ' +
    'page existante.',

  'pages.insertAtRank': 'Insérer une page au rang {rank}',
  'pages.insertAtEnd': 'Insérer une page en dernier rang ({rank})',
  'pages.newPageAtRank': 'Nouvelle page au rang {rank}',

  /**
   * L'intitulé de la vignette. `{kind}` est la classe en clair — de `views.ts`, domaine
   * `app` — et `{tally}` le compte de gadgets, qui vient de `common.widgetCount` :
   * c'est un mot que trois écrans emploient, il est donc dans le vocabulaire partagé.
   *
   * Le repère s'appelle `tally` et non `widgets` : un nom de repère est un identifiant,
   * il est donc en anglais — et `tests/i18n/catalog.test.ts` refuse le mot *widget* dans
   * un message français, à juste titre, sans distinguer le texte du repère.
   */
  'pages.openPage': 'Ouvrir la page {rank}, {kind}, {tally}',

  'pages.autoSwitchTargetHere': 'Cible supposée du basculement automatique en spirale — ' +
    'non vérifié sur l’appareil.',
  'pages.autoSwitchTargetElsewhere': 'Cet éditeur suppose que le basculement automatique vise la page {rank}, la dernière page d’assistant de thermique — non vérifié sur l’appareil.',

  'pages.moveBack': 'Reculer la page {rank} d’un rang',
  'pages.moveForward': 'Avancer la page {rank} d’un rang',
  'pages.duplicate': 'Dupliquer',
  'pages.duplicatePage': 'Dupliquer la page {rank}',
  'pages.remove': 'Supprimer',
  'pages.removePage': 'Supprimer la page {rank}',
  'pages.confirmRemoval': 'Confirmer la suppression',

  'pages.pageTypeLabel': 'Type de page',

  /** Une classe qu'aucune version connue ne documente : on la propose telle qu'elle est écrite. */
  'pages.typeFromFile': '{type} (type inscrit dans le fichier)',

  /* ======================================================= ce que `navigations` dit */

  /**
   * Les trois formes disent **quand la page s'affiche**, jamais un compte de navigations.
   * La phrase est celle de l'appareil, mesurée sur l'AIR³ : sa boîte s'intitule « Choisir
   * les types de navigations pour lesquelles la page sera affichée » (relevé d'édition
   * native § 5.4). On ne va pas jusqu'à « jamais affichée » pour `none` : ce que fait
   * l'appareil hors navigation n'a pas été mesuré.
   */
  'pages.shownForAllNavigations': 'Affichée pour toutes les navigations',
  'pages.shownForNoNavigation': 'Affichée pour aucune navigation',
  'pages.shownForNavigations': 'Affichée pour : {list}'

  /*
   * Les cinq navigations de la boîte de visibilité **ne sont plus ici**, et ne doivent pas
   * y revenir. Elles y étaient sous `navigation.*`, écrites par nous puis traduites en
   * cinq langues — et quatre des cinq ne disaient pas ce que l'appareil dit : « Fermeture
   * de triangle » pour *Triangle achevant*, « Vers une balise » pour *Balises/Navigation
   * XC*, « Compétition » pour *Manche de compétition*, « Vers un pilote en direct » pour
   * *Pilote Live*. Seul « Retour au décollage » coïncidait.
   *
   * Ce sont des **libellés de XCTrack** : ils suivent l'axe `labels`, la langue du fichier
   * ouvert, et non celle du pilote (`src/i18n/axes.ts`). Ils vivent depuis le 2026-08-22
   * dans `src/catalog/navigationLabels.json`, relevés dans les ressources de l'APK sous
   * `navTakeoff`, `navTriangleClosing`, `navWaypoint2`, `navCompetition` et `navLivePilot`.
   * Le préfixe `navigation` a été retiré de `DOMAIN_PREFIXES` pour la même raison.
   */
} as const

export default pages

export type FrenchPages = typeof pages
