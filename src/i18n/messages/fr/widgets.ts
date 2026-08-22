/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — le panneau de propriétés, la
 * palette d'ajout, la liste des gadgets d'une page.
 *
 * ## Les deux axes de langue se croisent ici, ligne à ligne
 *
 * C'est le seul domaine où **notre prose** et **les libellés de XCTrack** se rencontrent
 * dans la même phrase, et ils ne se confondent jamais (`src/i18n/axes.ts`) :
 *
 * | Ce que le pilote lit | D'où ça vient | Quel axe |
 * |---|---|---|
 * | « Gadget : » | nous | `ui` — le choix du pilote |
 * | « Boussole et vent » | `readableName`, extrait de l'APK | `labels` — le fichier ouvert |
 * | « Rotation du compas » | `WidgetOptionTexts`, extrait de l'APK | `labels` |
 * | « ce réglage n'a pas de valeur d'usine connue » | nous | `ui` |
 *
 * D'où la forme de chaque message qui mêle les deux : le libellé de XCTrack **arrive par
 * un repère nommé** — `{name}`, `{label}`, `{value}` —, il n'est jamais concaténé et il
 * n'est jamais traduit. Un pilote belge dont l'AIR³ est en anglais lit donc « Gadget : »
 * en français et « Compass and wind » en anglais, exactement comme son appareil l'affiche.
 *
 * Les **clés du fichier** (`windStyle`, `mapWidget_scale`) suivent la même règle pour une
 * autre raison : ce ne sont ni notre prose ni un libellé, ce sont les octets du document.
 * Elles se passent en `string`, jamais en `number` — voir `translate.ts`.
 *
 * ## Le vocabulaire, déjà tranché
 *
 * « valeur d'usine » et jamais « défaut », qui se lit *anomalie* en français. « réglage »
 * et jamais « clé ». « gadget » en français, *widget* dans les quatre autres langues —
 * mesuré sur 55 versions, voir `common.ts`. L'interface parle **au** pilote.
 *
 * `properties.settingCount` répète `preferences.settingCount` mot pour mot, et c'est
 * voulu : `common.ts` est le seul fichier que deux lots d'extraction peuvent vouloir
 * toucher, et deux clés voisines dans deux domaines coûtent moins cher qu'un conflit
 * là-bas (`src/i18n/CLAUDE.md` § 6).
 */
const widgets = {
  /* ==================================================== properties.ts — l'en-tête */

  /**
   * « Gadget : Boussole et vent », comme l'intitulé de l'activité native. `{name}` est le
   * libellé de XCTrack : il suit l'axe `labels`, il n'est jamais traduit ici.
   */
  'properties.widgetTitle': 'Gadget : {name}',

  /**
   * Ce que dit la pastille du nom de classe — « WSpeed », « WQNH » —, qui paraissait nue.
   * Elle ne se traduit pas : c'est ce que le fichier écrit, à l'octet près.
   */
  'properties.classTitle':
    'Le nom que le fichier donne à ce gadget. Il ne change pas d’une langue à l’autre : c’est ce que vous liriez en ouvrant le fichier, et c’est le mot à citer pour signaler un problème.',

  /** Voir l'en-tête : jumelle de `preferences.settingCount`, délibérément. */
  'properties.settingCount': {
    one: '{count} réglage',
    other: '{count} réglages'
  },

  /** Placeholder et intitulé vocal du champ de filtrage : un seul texte, une seule clé. */
  'properties.filterSettings': 'Filtrer les réglages',

  /* ------------------------------------------- la comparaison au relevé des défauts */

  'properties.noSurveyForType':
    'Le catalogue des valeurs d’usine ne décrit pas ce type de gadget : rien à comparer.',

  /** `{compared}` est un compte : il se met en forme dans la langue. */
  'properties.nothingCustomized':
    'Aucun réglage ne s’écarte de ce que XCTrack pose sur un gadget neuf ({compared} comparés).',

  /**
   * Deux nombres, deux accords, une seule phrase. Le pluriel ne porte que sur un `count` :
   * le second compte arrive **déjà accordé** par `properties.comparedCount`, en `string`.
   * C'est la seule construction qui garde les deux accords justes dans les cinq langues,
   * et elle laisse chacune poser les deux morceaux dans son propre ordre.
   */
  'properties.customizedRatio': {
    one: '{count} réglage personnalisé sur {compared}.',
    other: '{count} réglages personnalisés sur {compared}.'
  },
  'properties.comparedCount': {
    one: '{count} comparé',
    other: '{count} comparés'
  },

  'properties.onlyDifferent': 'Seulement ce qui diffère',
  'properties.showEverything': 'Tout afficher',

  /* ------------------------------------------------ d'où vient le relevé, et ce qu'il vaut */

  /** `{version}` et `{code}` sont des identifiants : ils se passent en `string`. */
  'properties.surveyReference':
    'Valeurs d’usine relevées sur XCTrack {version}',
  'properties.fileVersionNamed': 'la version {name}',
  'properties.fileVersionCoded': 'la version {code}',

  'properties.surveyExact': '{survey} — la version même de ce fichier.',
  'properties.surveyUnstated':
    '{survey}. Ce fichier ne dit pas de quelle version il vient : les valeurs d’usine changent d’une version à l’autre, la comparaison est donc indicative.',
  'properties.surveyOther':
    '{survey}. Ce fichier vient de {which} : les valeurs d’usine changent d’une version à l’autre, la comparaison est donc indicative.',

  /**
   * `{keys}` est une **colonne de données** — quatre noms de clés du fichier joints par
   * `', '` — et non une énumération de prose : `format.list` y ferait lire « windStyle et
   * nav_label » là où il n'y a qu'une liste.
   */
  'properties.surveyKeysAbsent': {
    one: '{count} réglage du relevé ne figure pas dans ce gadget ({keys}) : XCTrack lui applique sa propre valeur, dite en fin de panneau.',
    other: '{count} réglages du relevé ne figurent pas dans ce gadget ({keys}) : XCTrack leur applique sa propre valeur, dite en fin de panneau.'
  },

  /* ------------------------------------ le bloc de fin : les clés que le fichier n'écrit pas */

  /** Le verbe s'accorde avec « ce gadget », pas avec le compte. */
  'properties.absentTitle': {
    one: '{count} réglage que ce gadget n’écrit pas',
    other: '{count} réglages que ce gadget n’écrit pas'
  },

  'properties.absentApplied':
    'Ces réglages ne sont pas écrits dans le fichier : XCTrack leur applique la valeur de ' +
    'son propre code, celle qui est dite en regard. Ce n’est pas la même chose qu’un ' +
    'réglage posé à cette valeur.',
  'properties.absentUnstated':
    '{survey} ; la version de ce fichier n’est pas connue ici. Les valeurs d’usine changent d’une version à l’autre : ce que votre appareil applique peut donc différer de ce qui est écrit ici.',
  'properties.absentOther':
    '{survey}, et ce fichier vient de {which} : une valeur d’usine a pu changer entre les deux, et ce que votre appareil applique peut différer de ce qui est écrit ici.',
  'properties.absentGesture':
    'Les définir ne change rien à ce que fait l’appareil aujourd’hui — cela fige la valeur, ' +
    'qui ne bougera plus le jour où une mise à jour de XCTrack changera cette valeur d’usine.',

  'properties.appliedValue':
    'Ce réglage n’est pas dans le fichier : XCTrack appliquera « {value} », sa valeur d’usine. Ce n’est pas la même chose qu’une valeur réglée à cette valeur.',

  'properties.compositeFactoryValue': 'valeur d’usine composée',
  'properties.compositeFactoryValueHelp':
    'Le catalogue décrit ce réglage par une valeur composée : cet éditeur n’écrit que des ' +
    'valeurs simples, et il n’en invente pas une pour la remplacer. Le réglage reste ' +
    'modifiable une fois que XCTrack l’aura écrit lui-même.',

  /* ------------------------------------------------- le premier geste : définir la valeur */

  'properties.setValue': 'Définir cette valeur',
  /** `{label}` est le libellé de XCTrack, jamais traduit. */
  'properties.setValueAria': 'Définir {label} dans le fichier',
  'properties.setValueHelp':
    'Écrit « {key} » : {value} dans le fichier.\n\nVotre appareil se comporte déjà ainsi aujourd’hui — écrire la valeur ne change donc rien à ce qu’il fait maintenant. Ce que ça change est pour plus tard : tant que la ligne est absente, l’appareil suit la valeur d’usine de la version de XCTrack installée, et une mise à jour qui la change changera votre réglage sans rien vous demander. Une fois écrite, la valeur est figée : elle restera celle-là.',
  'properties.setCaveatOtherVersion':
    'Cette valeur d’usine a été relevée sur XCTrack {version}, qui n’est pas la version d’où vient ce fichier : vérifiez que c’est bien la valeur à figer.',
  'properties.setCaveatUnknownVersion':
    'Cette valeur d’usine a été relevée sur XCTrack {version} et la version de ce fichier n’est pas connue ici : vérifiez que c’est bien la valeur à figer.',

  /* --------------------------------------------------------- dire une valeur en toutes lettres */

  'properties.yes': 'Oui',
  'properties.no': 'Non',
  /** Une case laissée blanche se lirait « on ne sait pas » : c'est une valeur. */
  'properties.emptyValue': '(vide)',
  /** `{value}` est la constante du fichier, recopiée telle quelle. */
  'properties.outOfCatalogValue': '{value} (hors catalogue)',

  /* ----------------------------------------------------- la marque d'origine d'une ligne */

  'properties.setByYou': 'réglé par vous',
  'properties.setByYouFactory': 'réglé par vous · d’usine : {value}',
  'properties.setByYouHelp':
    'Cette valeur diffère de ce que XCTrack écrit sur un gadget neuf de ce type.',
  /** `{value}` est ici la valeur **telle qu'elle s'écrit dans le fichier**. */
  'properties.setByYouHelpValue':
    'Sur un gadget neuf de ce type, XCTrack écrit « {value} ».',

  'properties.factoryValue': 'valeur d’usine',
  'properties.factoryValueHelp':
    'Valeur inchangée : c’est ce que XCTrack écrit sur un gadget neuf de ce type.',
  'properties.factoryValueUnknown': 'valeur d’usine inconnue',
  'properties.factoryValueUnknownHelp':
    'Le catalogue des valeurs d’usine ne décrit pas ce réglage — réglage universel écrit à ' +
    'la main lors du relevé, réglage apparu depuis, ou valeur non comparable. Rien n’est ' +
    'affirmé de cette ligne.',

  /* ------------------------------------------ le troisième geste : rétablir l'usine */

  /**
   * **Le même mot à mot que l'écran des réglages généraux** (`ui/preferencesPage.ts`,
   * `RESTORE_LABEL`) : deux formulations pour un même geste, sur deux écrans du même
   * outil, seraient un défaut à elles seules. Un test épingle l'égalité de chaque côté.
   */
  'properties.restoreFactoryValue': 'Rétablir la valeur d’usine',
  'properties.restoreAria': 'Rétablir {label} à sa valeur d’usine',
  'properties.restoreHelp':
    'Écrit « {path} » : {factory} dans le fichier, à la place de {current}.\n\nCe geste-ci n’est pas comme « Définir cette valeur » en fin de panneau : celui-là laisse l’appareil se comporter exactement comme aujourd’hui, celui-ci non. Il remplace un réglage que vous avez choisi par celui que XCTrack pose sur un gadget neuf de ce type.',
  'properties.restoreNote':
    '« {factory} » d’usine, « {current} » dans ce fichier. Rétablir change ce que fait l’appareil en vol.',
  'properties.restoreCaveatOtherVersion':
    'Cette valeur d’usine a été relevée sur XCTrack {version}, qui n’est pas la version d’où vient ce fichier : vérifiez que c’est bien celle à rétablir.',
  'properties.restoreCaveatUnknownVersion':
    'Cette valeur d’usine a été relevée sur XCTrack {version} et la version de ce fichier n’est pas connue ici : vérifiez que c’est bien celle à rétablir.',

  /* --------------------------------------------------------------- une ligne du panneau */

  'properties.outOfCatalogSetting': 'réglage hors catalogue',
  /**
   * « contrôle » traduisait *control* mot à mot : un pilote y lisait qu'une vérification
   * avait été faite. C'est la **commande** — case, menu, champ — qui a été devinée.
   */
  'properties.outOfCatalogSettingHelp':
    '« {path} » n’est pas décrit par le catalogue : cet outil devine la commande d’après le type de la valeur.',
  'properties.helpAria': 'Aide sur ce réglage',
  'properties.readOnlyValue': 'Valeur non modifiable ici ; elle est conservée telle quelle.',

  /* ------------------------------------------- les unités que le catalogue laisse nues */

  /**
   * Ce que `optionValues` rend **nu** quand l'extraction n'a pas retrouvé la ressource du
   * libellé : le menu « Unités » du gadget « Altitude GPS » proposait `SYS_UNIT`, `METER`,
   * `FOOT`, `YARD`.
   *
   * Ce ne sont donc **pas** les mots de XCTrack — personne ne les a mesurés pour ce
   * menu-là — mais les nôtres, et ils suivent l'axe `ui` comme le reste de notre prose.
   * D'où la frontière : seulement les unités et les formats de coordonnées, où la
   * constante ne laisse aucun doute. Un thème de carte (`BIKER`, `MAPZEN`) est un nom
   * propre ; `HORIZONTAL` ou `GRAPH_THERMAL` demanderait une interprétation, et une
   * interprétation se mesure avant de s'écrire.
   */
  'properties.unitSystem': 'comme les réglages généraux',
  'properties.unitMeter': 'mètres (m)',
  'properties.unitFoot': 'pieds (ft)',
  'properties.unitYard': 'yards (yd)',
  'properties.unitKmPerHour': 'kilomètres par heure (km/h)',
  'properties.unitMetersPerSecond': 'mètres par seconde (m/s)',
  'properties.unitMilesPerHour': 'miles par heure (mph)',
  'properties.unitKnot': 'nœuds (kt)',
  'properties.unitCelsius': 'degrés Celsius (°C)',
  'properties.unitFahrenheit': 'degrés Fahrenheit (°F)',
  'properties.coordDegrees': 'degrés décimaux',
  'properties.coordDegreesMinutes': 'degrés et minutes',
  'properties.coordDegreesMinutesSeconds': 'degrés, minutes et secondes',
  'properties.coordUtm': 'UTM',

  /* ================================================ widgetPalette.ts — la palette d'ajout */

  'palette.title': 'Ajouter un gadget',
  'palette.typeCount': {
    one: '{count} type',
    other: '{count} types'
  },
  /** Le groupe de queue : il dit le fait, pas le jugement. */
  'palette.notOffered': 'Présents dans le fichier, non proposés par XCTrack',

  'palette.search': 'Rechercher un gadget',
  /**
   * La recherche porte sur le nom lisible **et** sur le nom technique (`WCompMap`,
   * `org.xcontest…`) : le dire ainsi, parce que « classe » est notre mot, pas le sien.
   */
  'palette.searchAria': 'Rechercher un gadget par son nom, ou par le nom qu’il porte dans le fichier',

  'palette.onlyPresent': 'Déjà dans le fichier ({count})',
  'palette.onlyPresentHelp':
    'Ces types-là seront copiés d’un gadget que XCTrack a lui-même écrit : tous leurs ' +
    'réglages sont conservés, y compris ceux que cet éditeur ne sait pas présenter.',
  /**
   * ⚠️ **Notre glose, jamais un libellé réécrit.** « Lanceur d'intention » est ce que
   * XCTrack affiche en français : c'est le nom que le pilote retrouvera sur son appareil.
   * Un pilote-testeur a dit le 2026-08-22 : « en français ça ne veut rien dire du tout ».
   * La phrase l'explique à côté ; elle ne le remplace pas.
   */
  'palette.intentGloss':
    'Une « intention » (intent, en anglais) est le message par lequel une application Android en fait réagir une autre : ce gadget ne fait rien de lui-même, il envoie un signal qu’une autre application, réglée sur l’appareil, reçoit.',

  'palette.legend':
    'Liseré plein : le gadget sera copié d’un exemplaire déjà présent dans le fichier, avec ' +
    'tous ses réglages. Liseré pointillé : il sera créé avec ses seuls réglages de base, ' +
    'XCTrack ajoutant les autres à la lecture. La vignette montre, dans les deux cas, ce ' +
    'que le clic posera.',
  'palette.noMatch': 'Aucun gadget ne porte ce nom.',

  /* --------------------------------------------------- ce que la vignette peut montrer */

  'palette.previewDrawn':
    'Aperçu dessiné par l’éditeur d’après les réglages du gadget. Les valeurs affichées ' +
    'sont des exemples fixes : rien n’est calculé depuis un vol.',
  'palette.previewGeneric':
    'Cet éditeur n’a pas de dessin dédié pour ce type : la vignette montre son titre et un ' +
    'tiret à la place de la valeur. Sur l’appareil, il affichera ses données de vol.',
  'palette.previewBlank':
    'Ce type ne peint rien au repos sur l’appareil : la vignette est vide parce que l’écran ' +
    'l’est aussi tant qu’aucun message n’est arrivé.',

  /**
   * Deux cases quasi vides, deux causes opposées, et un pilote ne peut pas les deviner :
   * « rien au repos » est un fait de l'appareil — rassurant —, « aperçu non dessiné » est
   * notre limite. La liste des gadgets emploie le **même** mot que la palette : deux
   * écrans, un mot.
   */
  'palette.nothingAtRest': 'rien au repos',
  'palette.notDrawn': 'aperçu non dessiné',

  /* ----------------------------------------------------------- les marques d'une ligne */

  'palette.pro': 'Pro',
  'palette.proHelp': 'XCTrack réserve ce gadget à la licence Pro.',
  'palette.hereOnce': 'déjà ici',
  'palette.hereCount': 'déjà ici × {count}',
  'palette.hereOnceHelp': 'Ce type est déjà sur la page affichée.',
  'palette.hereCountHelp': {
    one: '{count} exemplaire de ce type est déjà sur la page affichée.',
    other: '{count} exemplaires de ce type sont déjà sur la page affichée.'
  },
  'palette.elsewhere': 'ailleurs',
  /**
   * Le singulier écrit « une fois » en toutes lettres — « présent 1 fois » ne s'écrit pas
   * en français. `{count}` reste dans la forme plurielle, la seule qui l'affiche.
   */
  'palette.elsewhereHelp': {
    one: 'Absent de cette page, mais présent une fois ailleurs dans le fichier : la copie partira de ce gadget-là, avec ses réglages.',
    other: 'Absent de cette page, mais présent {count} fois ailleurs dans le fichier : la copie partira de ce gadget-là, avec ses réglages.'
  },

  /* ------------------------------------------------- l'intitulé lu par l'assistance vocale */

  'palette.spokenPro': 'licence Pro',
  'palette.spokenHereOnce': 'déjà sur cette page',
  'palette.spokenHereCount': {
    one: 'déjà {count} fois sur cette page',
    other: 'déjà {count} fois sur cette page'
  },
  'palette.spokenCopyFromPage': 'sera copié avec les réglages du gadget de cette page',
  'palette.spokenCopyFromElsewhere':
    'sera copié avec les réglages d’un gadget d’une autre page',
  'palette.spokenCreate': 'sera créé avec ses seuls réglages de base',

  /* ------------------------------------------ la phrase de l'historique d'annulation */

  /** `{name}` est le libellé de XCTrack : il suit l'axe `labels`. */
  'palette.addCopyFromPage': 'Ajouter « {name} » — copie d’un gadget de cette page',
  'palette.addCopyFromElsewhere': 'Ajouter « {name} » — copie d’un gadget d’une autre page',
  'palette.addNew': 'Ajouter « {name} » — gadget neuf, réglages laissés à XCTrack',

  /**
   * D'où vient la copie — la page, nommée.
   *
   * Le pilote d'essai du 22 août : « on ne me dit pas de quelle page vient la copie —
   * "un gadget d'une autre page", laquelle ? J'ai deux cartes dans mon fichier, réglées
   * différemment. Je ne sais pas laquelle je vais recevoir. J'ai cliqué en croisant les
   * doigts. »
   *
   * Une phrase entière par orientation, et non un nom d'orientation glissé dans un trou :
   * c'est l'idiome de `library.previewOfLandscapePage`, et il évite d'assembler des
   * fragments qui ne s'assemblent pas dans les cinq langues. `{rank}` est un rang de page,
   * un nombre que le pilote lit et compare — il se met donc en forme comme un nombre.
   *
   * Les trois messages « d'une autre page » restent : la palette ne connaît la page que si
   * `PaletteSources.elsewhere` la lui donne, et elle fonctionne sans.
   */
  'palette.elsewhereOnLandscape': 'ailleurs — page {rank} en paysage',
  'palette.elsewhereOnPortrait': 'ailleurs — page {rank} en portrait',
  'palette.spokenCopyFromLandscape':
    'sera copié avec les réglages du gadget de la page {rank} en paysage',
  'palette.spokenCopyFromPortrait':
    'sera copié avec les réglages du gadget de la page {rank} en portrait',
  'palette.addCopyFromLandscape':
    'Ajouter « {name} » — copie du gadget de la page {rank} en paysage',
  'palette.addCopyFromPortrait':
    'Ajouter « {name} » — copie du gadget de la page {rank} en portrait',


  /* ============================================ widgetList.ts — les gadgets de la page */

  'widgets.listTitle': 'Gadgets de la page',
  'widgets.listAria': 'Gadgets de la page, du fond vers le premier plan',
  'widgets.emptyPage': 'Cette page ne porte aucun gadget.',
  /** Les deux extrémités portent leur sens : le fichier va du fond vers l'avant. */
  'widgets.rankBack': 'Rang 1 · au fond',
  'widgets.rankFront': 'Rang {rank} · au premier plan',

  'widgets.unreachableHere': 'inatteignable ici',
  'widgets.unreachableHereHelp':
    'Dans cet éditeur, aucun clic sur la page ne peut atteindre ce gadget : les rangs ' +
    'supérieurs le recouvrent entièrement, et cette liste est le seul chemin qui y mène. ' +
    'Sur l’instrument, il reste à sa place — un bouton d’action ainsi recouvert continue ' +
    'de répondre au doigt.',
  /**
   * « sans dessin » se lisait comme une limite de cet éditeur, alors que c'est un fait de
   * l'appareil. Le mot affiché est celui de la palette (`palette.nothingAtRest`).
   */
  'widgets.nothingAtRestHelp':
    'Sur l’appareil, ce type ne peint rien au repos. Il occupe pourtant sa place et ' +
    'intercepte les clics comme n’importe quel autre gadget.',

  'widgets.unreachableCount': {
    one: '{count} inatteignable dans l’éditeur',
    other: '{count} inatteignables dans l’éditeur'
  },
  'widgets.unreachableCountHelp':
    'Ces gadgets sont entièrement recouverts par des rangs supérieurs : ici, aucun clic sur ' +
    'la page ne les atteint, et cette liste est le seul chemin qui y mène. Sur l’instrument, ' +
    'ils restent à leur place — un bouton d’action ainsi recouvert continue de répondre au ' +
    'doigt.',

  /** `{rank}` et `{total}` sont des comptes : ils se mettent en forme dans la langue. */
  'widgets.spokenRank': 'Rang {rank} sur {total}',
  /** `{width}` et `{height}` arrivent déjà mis en forme par `format.decimal`. */
  'widgets.spokenSize': '{width} sur {height} millimètres',
  'widgets.spokenUnreachable': 'inatteignable au clic dans cet éditeur',
  'widgets.spokenNothingAtRest': 'ne dessine rien sur l’appareil'
} as const

export default widgets

export type FrenchWidgets = typeof widgets
