/**
 * `versionDiagnostic.ts`, `cleanupPanel.ts` — les versions relevées et ce qu'elles
 * changent, puis le seul geste de l'application qui **retire** quelque chose du document
 * du pilote.
 *
 * ## Les trois statuts, et pourquoi ces mots-là
 *
 * Le pilote n'a pas à savoir ce qu'est une attestation, une extraction ou un reliquat. Il
 * a besoin de savoir **pourquoi l'outil refuse d'enlever deux cas sur trois** :
 *
 * | Le mot à l'écran | Ce que c'est | Ce que l'outil s'autorise |
 * |---|---|---|
 * | **périmé** | XCTrack ne lit plus ce réglage, et de vrais fichiers le portent quand même | l'enlever se défend |
 * | **angle mort** | notre lecture des versions a un trou ici | on n'y touche pas |
 * | **inconnu** | aucune version que nous ayons lue ne lit ce réglage | on ne conclut rien |
 *
 * **« angle mort » recouvre volontairement trois familles techniques** — `straddled`,
 * `gap` et `blind` — parce que ce que le pilote doit en retenir est identique : nous ne
 * voyons rien ici, donc nous ne touchons à rien. Ce sont les **titres** qui distinguent
 * les trois cas, jamais le badge. D'où `versions.badgeBlindSpot`, une seule clé lue par
 * trois catégories.
 *
 * Les mots d'archiviste ont tous été rendus, et `versionDiagnostic.test.ts` vérifie
 * qu'aucun ne reparaît : *reliquat* → « périmé », *trou de relevé* et *aveugle* → « angle
 * mort », *attesté* → « de vrais fichiers le portent », *antérieur* / *postérieur* → « lu
 * avant seulement » / « apparu après », *caduc* → « périmé », *constat* → « remarque ».
 * Les badges sont écrits en minuscules : la capitale vient de la CSS.
 *
 * ## Ce qui n'est PAS traduit ici
 *
 * Les **noms de réglages** (`mapWidget_showTerrain`) et les **noms de versions**
 * (« 1.0.3-beta ») sont ce que XCTrack écrit : ils se passent en `string` et ressortent
 * tels quels. Les noms de gadgets suivent l'axe `labels` — voir `src/i18n/axes.ts`.
 *
 * ## La ligne du gadget porte son orientation
 *
 * `versions.placePortrait` et `versions.placeLandscape` écrivent la ligne **entière**
 * (« Portrait · page 2 · rang 1 · Carte de la manche ») plutôt qu'un mot d'orientation
 * assemblé à un gabarit : l'anglais dit « Portrait » comme le français, et une clé qui ne
 * porterait que ce mot serait indiscernable d'une traduction oubliée. La ligne entière,
 * elle, diffère dans les cinq langues — et chacune place ses éléments où elle veut.
 */
const versions = {
  'versions.publishedCount': {
    one: '{count} version publiée',
    other: '{count} versions publiées'
  },

  /* ------------------------------------------------- les statuts : le mot du bandeau */

  'versions.badgeOutdated': 'périmé',
  'versions.badgeReadBefore': 'lu avant seulement',
  'versions.badgeAppearedLater': 'apparu après',
  /** Lu par trois catégories : `straddled`, `gap`, `blind`. Voir l'en-tête. */
  'versions.badgeBlindSpot': 'angle mort',
  'versions.badgeUnknown': 'inconnu',
  'versions.badgeUnknownWidget': 'gadget inconnu',
  /** Le mot d'une version candidate qui, elle, lit le réglage — voir `versions.unstableFinding`. */
  'versions.badgeRecognized': 'reconnu',

  /* ----------------------------------------- les huit cas : titre, constat, et verdict */

  'versions.titleLegacy': 'Réglages périmés : la version visée ne les lit plus',
  'versions.evidenceLegacy': 'Nous lisons ces réglages dans des versions plus anciennes, plus dans celle-ci — et de vrais fichiers écrits par cette version-là les portent quand même. XCTrack garde sans les lire les réglages qu’il ne connaît plus : ici, nous l’avons vu se produire, nous ne le supposons pas.',
  'versions.verdictLegacy': 'Une suppression se défend ici. C’est le seul cas qu’un vrai fichier vient confirmer.',

  'versions.titlePastOnly': 'Lus par des versions plus anciennes seulement',
  'versions.evidencePastOnly': 'Nous lisons ces réglages dans des versions plus anciennes, plus dans celle qui est visée. Mais aucun vrai fichier ne vient le confirmer : nous n’avons ici que notre lecture des versions, sans l’exemple qui la vérifie.',
  'versions.verdictPastOnly': 'Une suppression se défend, sur notre seule lecture. Rien ne dit que XCTrack les ait retirés : nous ne les y lisons plus, c’est tout.',

  'versions.titleFutureOnly': 'Apparus après la version visée',
  'versions.evidenceFutureOnly': 'Nous ne lisons ces réglages que dans des versions plus récentes que celle qui est visée. Ce fichier vient donc d’une version plus récente que celle choisie ici.',
  'versions.verdictFutureOnly': 'Ne pas supprimer. La version visée les ignore ; une version plus récente les retrouvera intacts.',

  'versions.titleStraddled': 'Lus avant et après la version visée, mais pas par elle',
  'versions.evidenceStraddled': 'Nous lisons ces réglages dans les versions d’avant et dans celles d’après, et nous les manquons juste ici. Un réglage qui disparaîtrait pour revenir à l’identique serait une bizarrerie ; le plus simple est que notre lecture ait un trou à cet endroit.',
  'versions.verdictStraddled': 'Ne pas supprimer. Le trou est chez nous, pas dans votre fichier.',

  'versions.titleNeverRead': 'Inconnus : aucune version que nous ayons lue ne les lit',
  'versions.evidenceNeverRead': 'Aucune des versions de XCTrack que nous avons pu lire ne porte ce réglage sur ce gadget, et aucun vrai fichier ne l’y montre non plus. Nous ne savons pas d’où il vient.',
  'versions.verdictNeverRead': 'Nous ne savons pas. Ce n’est pas la preuve que le réglage soit périmé — seulement que nous ne le connaissons pas.',

  'versions.titleGap': 'Notre lecture a un trou : le réglage existait bien',
  'versions.evidenceGap': 'Nous n’avons pas vu ces réglages dans cette version-là, mais nous les lisons dans des versions plus récentes, et un vrai fichier écrit par elle les porte. Le réglage existait : c’est nous qui l’avons manqué.',
  'versions.verdictGap': 'Ne jamais supprimer. Ce sont des réglages valides, et les prendre pour des réglages périmés effacerait les vôtres.',

  'versions.titleBlind': 'Réglages que nous ne voyons nulle part',
  'versions.evidenceBlind': 'De vrais fichiers les portent, et aucune version que nous avons pu lire ne les déclare. Nous ne les voyons nulle part, et notre silence ne dit rien d’eux.',
  'versions.verdictBlind': 'Rien à conclure. Ne pas supprimer sur cette base.',

  'versions.titleUnknownWidget': 'Gadgets que la version visée ne connaît pas',
  'versions.evidenceUnknownWidget': 'Ce type de gadget ne figure pas dans ce que nous avons lu de cette version. Nous ne savons donc rien de ses réglages : un gadget que nous n’avons jamais vu n’est pas un gadget retiré.',
  'versions.verdictUnknownWidget': 'Rien à conclure sur ses réglages.',

  /* ------------------------------------------------------ où le gadget se trouve */

  'versions.placePortrait': 'Portrait · page {page} · rang {rank} · {name}',
  'versions.placeLandscape': 'Paysage · page {page} · rang {rank} · {name}',

  /* -------------------------------------------------------------- le choix de version */

  'versions.panelLabel': 'Version visée et compatibilité',
  'versions.targetLabel': 'La version de XCTrack que vous visez',
  'versions.noVersionOption': '— aucune version choisie —',
  'versions.groupWriter': 'La version qui a écrit ce fichier',
  'versions.groupCandidates': 'Les versions que ce fichier peut désigner',
  'versions.groupNearestOne': 'La version la plus proche de celle de ce fichier',
  'versions.groupNearestSeveral': 'Les versions les plus proches de celle de ce fichier',
  'versions.groupPublished': 'Versions publiées, de la plus récente à la plus ancienne',
  'versions.groupDevelopment': 'Versions de développement, jamais publiées',

  /** Quand la base ne sait nommer aucune version derrière ce que le pilote a choisi. */
  'versions.unknownVersion': 'version inconnue',
  /** « 1.0.3-beta (construction 5-gc036d8f2c) » — le suffixe n'est remis que s'il départage. */
  'versions.buildLabel': '{release} (construction {build})',

  /* ------------------------------------------------- d'où vient la version proposée */

  'versions.declaredByCode': 'la version {code}',
  'versions.declaredByName': 'XCTrack {release} (numéro {code})',

  'versions.messageUndeclared': 'Ce fichier ne dit pas de quelle version de XCTrack il vient : il ne porte pas son numéro de version. Rien ne permet d’en proposer une — choisissez celle de l’appareil sur lequel vous réimporterez ce fichier.',

  'versions.messageExact': 'Ce fichier a été écrit par {declared}. C’est elle qui est visée ci-dessous, et vous pouvez en choisir une autre.',

  /** Le numéro ne suffisait pas, le nom a tranché : le dire rend la présélection sûre. */
  'versions.messageExactPinned': {
    one: 'Ce fichier a été écrit par {declared}. {count} version porte ce numéro ; le nom que le fichier déclare n’en désigne qu’une. C’est elle qui est visée ci-dessous, et vous pouvez en choisir une autre.',
    other: 'Ce fichier a été écrit par {declared}. {count} versions portent ce numéro ; le nom que le fichier déclare n’en désigne qu’une. C’est elle qui est visée ci-dessous, et vous pouvez en choisir une autre.'
  },

  'versions.messageAmbiguous': {
    one: 'Ce fichier a été écrit par {declared}. {count} version porte ce numéro sans accepter les mêmes réglages, et le fichier ne dit pas laquelle l’a écrit. Nous visons la plus récente, {version} — un choix arbitraire, assumé comme tel : chaque remarque qui changerait sous une des autres est signalée ci-dessous.',
    other: 'Ce fichier a été écrit par {declared}. {count} versions portent ce numéro sans accepter les mêmes réglages, et le fichier ne dit pas laquelle l’a écrit. Nous visons la plus récente, {version} — un choix arbitraire, assumé comme tel : chaque remarque qui changerait sous une des autres est signalée ci-dessous.'
  },

  'versions.messageApproximated': 'Ce fichier a été écrit par {declared}, qu’aucune version relevée ne porte. Nous nous replions sur le numéro le plus proche, {code} — ce n’est pas la même version, c’est la plus proche que nous ayons pu lire. Nous visons {version}.',

  'versions.messageApproximatedSeveral': {
    one: 'Ce fichier a été écrit par {declared}, qu’aucune version relevée ne porte. Nous nous replions sur le numéro le plus proche, {code} — ce n’est pas la même version, c’est la plus proche que nous ayons pu lire. Ce numéro-là couvre lui-même {count} version ; nous visons la plus récente, {version}, et signalons ci-dessous toute remarque qui changerait sous une autre.',
    other: 'Ce fichier a été écrit par {declared}, qu’aucune version relevée ne porte. Nous nous replions sur le numéro le plus proche, {code} — ce n’est pas la même version, c’est la plus proche que nous ayons pu lire. Ce numéro-là couvre lui-même {count} versions ; nous visons la plus récente, {version}, et signalons ci-dessous toute remarque qui changerait sous une autre.'
  },

  'versions.messageUnrecognized': {
    one: 'Ce fichier a été écrit par {declared}, que nous ne connaissons pas : nous avons pu lire {count} version de XCTrack, et celle-ci n’en fait pas partie. Nous n’en proposons aucune — en désigner une au jugé reviendrait à inventer. Choisissez celle de votre appareil.',
    other: 'Ce fichier a été écrit par {declared}, que nous ne connaissons pas : nous avons pu lire {count} versions de XCTrack, et celle-ci n’en fait pas partie. Nous n’en proposons aucune — en désigner une au jugé reviendrait à inventer. Choisissez celle de votre appareil.'
  },

  /** La même, avec la phrase qui situe le numéro parmi ceux que nous connaissons. */
  'versions.messageUnrecognizedSituated': {
    one: 'Ce fichier a été écrit par {declared}, que nous ne connaissons pas : nous avons pu lire {count} version de XCTrack, et celle-ci n’en fait pas partie. {situate} Nous n’en proposons aucune — en désigner une au jugé reviendrait à inventer. Choisissez celle de votre appareil.',
    other: 'Ce fichier a été écrit par {declared}, que nous ne connaissons pas : nous avons pu lire {count} versions de XCTrack, et celle-ci n’en fait pas partie. {situate} Nous n’en proposons aucune — en désigner une au jugé reviendrait à inventer. Choisissez celle de votre appareil.'
  },

  'versions.rangeAbove': 'Les numéros que nous connaissons vont de {min} à {max} ; celui-ci les dépasse tous.',
  'versions.rangeBelow': 'Les numéros que nous connaissons vont de {min} à {max} ; celui-ci est en deçà de tous.',
  'versions.rangeBetween': 'Les numéros que nous connaissons vont de {min} à {max} ; celui-ci tombe entre deux d’entre eux.',

  'versions.aimingElsewhere': 'Vous visez une autre version que celle-là : le diagnostic ci-dessous confronte ce fichier à {version}.',

  /* --------------------------------- ce que le choix du pilote ne change pas */

  'versions.sameNone': 'Aucune autre version relevée n’accepte exactement les mêmes réglages que {version} : ce qui est dit ci-dessous ne vaut que pour elle.',

  /**
   * Deux phrases entières, et **pas un pluriel** : ce qui change d'une à l'autre est
   * l'accord du verbe avec le sujet énuméré — une version, ou plusieurs — et non la forme
   * d'un nombre. `{total}`, lui, vaut toujours deux au moins (la version choisie plus
   * celles qui ne s'en distinguent pas), et les cinq langues mettent deux au pluriel : la
   * phrase porte donc « versions » sans imbriquer un second pluriel, ce qu'aucun
   * catalogue ne sait faire.
   */
  'versions.sameOtherOne': '{list} accepte exactement les mêmes réglages que {version} : nous ne les distinguons pas, et ce qui est dit ci-dessous vaut pour {total} versions.',
  'versions.sameOtherSeveral': '{list} acceptent exactement les mêmes réglages que {version} : nous ne les distinguons pas, et ce qui est dit ci-dessous vaut pour {total} versions.',

  /* ------------------------------------------------- l'écart depuis la version d'avant */

  'versions.noPreviousRelease': {
    one: 'Aucune version publiée ne précède celle-ci parmi celles que nous avons pu lire : rien à comparer. {count} gadget connu.',
    other: 'Aucune version publiée ne précède celle-ci parmi celles que nous avons pu lire : rien à comparer. {count} gadgets connus.'
  },
  'versions.widgetsAdded': {
    one: '{count} gadget ajouté',
    other: '{count} gadgets ajoutés'
  },
  'versions.widgetsRemoved': {
    one: '{count} gadget retiré',
    other: '{count} gadgets retirés'
  },
  'versions.settingsAdded': {
    one: '{count} réglage ajouté',
    other: '{count} réglages ajoutés'
  },
  'versions.settingsRemoved': {
    one: '{count} réglage retiré',
    other: '{count} réglages retirés'
  },
  'versions.deltaNone': 'Rien ne distingue cette version de {version} : nous y lisons les mêmes réglages.',
  'versions.deltaSince': 'Depuis {version} : {changes}.',
  'versions.noVersionChosen': 'Aucune version choisie : rien n’est comparé, et rien n’est diagnostiqué.',

  'versions.deltaDetails': 'Le détail de ces changements',
  'versions.detailWidgetsAdded': 'Gadgets ajoutés',
  'versions.detailWidgetsRemoved': 'Gadgets retirés',
  'versions.detailSettingsAdded': 'Réglages ajoutés sur des gadgets existants',
  'versions.detailSettingsRemoved': 'Réglages retirés',
  /**
   * « Carte de la manche : fontSize, line_thickness » — une colonne, pas une phrase.
   *
   * Le repère se nomme `{name}` et non `{widget}` : le catalogue français ne doit pas
   * porter la chaîne « widget », que `catalog.test.ts` traque pour attraper le mot
   * anglais glissé dans une phrase française. Un nom de repère est du texte comme un
   * autre pour ce test — et il a raison de ne pas faire la différence.
   */
  'versions.detailLine': '{name} : {keys}',

  /* ------------------------------------------------------------------ le diagnostic */

  'versions.chooseVersion': 'Choisissez une version pour obtenir le diagnostic de ce fichier.',

  'versions.tally': {
    one: '{count} réglage reconnu sur {examined} examinés, répartis sur {instances}.',
    other: '{count} réglages reconnus sur {examined} examinés, répartis sur {instances}.'
  },

  /** Le mot dit UNE fois : plus bas, « nous », c'est ce relevé-là. */
  'versions.scope': {
    one: 'Ce diagnostic repose sur notre relevé de {count} version de XCTrack et sur de vrais fichiers écrits par elle : c’est ce que « nous » désigne plus bas. Seuls les gadgets des pages y sont examinés — le reste d’une sauvegarde (vario, unités, capteurs, espaces aériens) n’est pas diagnostiqué. La position d’un gadget et son type ne sont pas des réglages et ne sont pas comptés.',
    other: 'Ce diagnostic repose sur notre relevé de {count} versions de XCTrack et sur de vrais fichiers écrits par elles : c’est ce que « nous » désigne plus bas. Seuls les gadgets des pages y sont examinés — le reste d’une sauvegarde (vario, unités, capteurs, espaces aériens) n’est pas diagnostiqué. La position d’un gadget et son type ne sont pas des réglages et ne sont pas comptés.'
  },

  'versions.unstableNotice': {
    one: '{count} remarque change selon la version retenue parmi celles que ce fichier peut désigner. Elles sont signalées une à une.',
    other: '{count} remarques changent selon la version retenue parmi celles que ce fichier peut désigner. Elles sont signalées une à une.'
  },

  'versions.noFindings': 'Aucun écart : tous les réglages de ce fichier sont lus par la version visée, et tous ses gadgets y existent. Rien à signaler — ce qui ne veut pas dire que le fichier soit conforme, seulement que nous n’y trouvons rien à redire.',

  'versions.widgetKnownElsewhere': 'type que nous connaissons, mais pas dans cette version',
  'versions.widgetNeverSeen': 'type que nous n’avons vu dans aucune version',

  'versions.unstableFinding': 'Remarque instable — sous {divergences}.',
  'versions.divergencePart': '{version} : {word}',
  /** Entre deux versions candidates. Le français pose une espace avant le point-virgule. */
  'versions.divergenceJoin': ' ; ',

  'versions.readonlyNote': 'Vous consultez ce fichier sans le modifier : rien ne peut en être retiré d’ici. Pour agir sur ce que vous lisez, fermez cette fenêtre et passez en modification.',

  /* ================================================================= le nettoyage */

  'cleanup.title': 'Enlever ce qu’une ancienne version a laissé',

  'cleanup.lead': {
    one: '{count} réglage de ce fichier n’est plus utilisé par la version visée, sur {instances} : {list}.',
    other: '{count} réglages de ce fichier ne sont plus utilisés par la version visée, sur {instances} : {list}.'
  },

  'cleanup.calm': 'Rien ne presse et rien n’est cassé : XCTrack les transporte sans les lire, et les laisser là ne change rien à vos pages. Les enlever allège le fichier, c’est tout.',

  'cleanup.seeList': {
    one: 'Voir ce réglage, et décocher ce que vous préférez garder',
    other: 'Voir ces {count} réglages, et décocher ce que vous préférez garder'
  },

  'cleanup.caveat': 'Les noms ci-dessous sont ceux qu’écrit XCTrack. L’application ne les montre plus dans ses menus : c’est justement ce qui indique qu’elle ne s’en sert plus.',

  /* ------------------------------------------- ce que porte chaque réglage périmé */

  'cleanup.usedUntil': 'utilisé jusqu’à XCTrack {release}',
  'cleanup.noLongerRead': 'plus lu par la version visée',
  'cleanup.noteWithValue': 'réglé sur {value}, {since}',
  /** `{note}` porte ce qui précède : la valeur et depuis quand le réglage ne sert plus. */
  'cleanup.noteRepeated': {
    one: '{note}, écrit {count} fois dans ce gadget',
    other: '{note}, écrit {count} fois dans ce gadget'
  },
  /** La valeur d'un interrupteur, la seule qu'on montre avec un nombre — voir l'en-tête du module. */
  'cleanup.valueYes': 'oui',
  'cleanup.valueNo': 'non',

  /* ------------------------------------------------------------- décocher, puis agir */

  'cleanup.allSelected': {
    one: '{count} réglage retenu.',
    other: '{count} réglages retenus.'
  },
  'cleanup.someSelected': {
    one: '{count} retenu sur {total} — {left}.',
    other: '{count} retenus sur {total} — {left}.'
  },
  'cleanup.remaining': {
    one: '{count} réglage restera en place',
    other: '{count} réglages resteront en place'
  },
  'cleanup.noneSelected': 'Aucun réglage retenu',

  /**
   * Le cas qu'aucun `s` collé n'aurait su rendre : le nombre se glisse **entre** le
   * déterminant et le nom, et il disparaît au singulier — le français ne dit ni « 9 ces
   * réglages » ni « ce 1 réglage ».
   */
  'cleanup.removeButton': {
    one: 'Enlever ce réglage',
    other: 'Enlever ces {count} réglages'
  },
  'cleanup.undoButton': {
    one: 'Remettre ce réglage',
    other: 'Remettre ces {count} réglages'
  },

  'cleanup.removedTally': {
    one: '{count} réglage enlevé sur {instances}. Votre appareil n’en sait encore rien : le fichier ne change que lorsque vous l’enregistrez.',
    other: '{count} réglages enlevés sur {instances}. Votre appareil n’en sait encore rien : le fichier ne change que lorsque vous l’enregistrez.'
  },

  /* --------------------------------------- le libellé du pas d'annulation de l'hôte */

  'cleanup.removeStep': {
    one: 'Enlever {count} réglage d’une ancienne version',
    other: 'Enlever {count} réglages d’une ancienne version'
  },
  'cleanup.restoreStep': {
    one: 'Remettre {count} réglage d’une ancienne version',
    other: 'Remettre {count} réglages d’une ancienne version'
  }
} as const

export default versions

export type FrenchVersions = typeof versions
