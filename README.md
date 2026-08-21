# Éditeur de configuration XCTrack

Un éditeur web pour les fichiers `.xcfg` de **XCTrack**, l'application de vol des
parapentistes. On ouvre un export de son instrument, on voit ses pages telles que
l'appareil les dessine, on les modifie, on réexporte.

Tout se passe **dans le navigateur**. Aucun serveur, aucun compte, aucun envoi : le
fichier ne quitte pas la machine.

## 👉 [Ouvrir l'éditeur](https://frederict.github.io/xcfg-editor/)

**<https://frederict.github.io/xcfg-editor/>** — rien à installer, rien à inscrire.
Glissez-y un `.xcfg` ou un `.xczfg` exporté depuis votre instrument.

Le fichier est lu par votre navigateur et n'est envoyé nulle part : la page est servie
en fichiers statiques, elle n'a pas de serveur à qui parler.

---

## Le problème

Configurer ses pages au doigt, sur un écran de sept pouces posé sur les genoux, prend des
heures. XCTrack ne sait ni copier une page, ni la dupliquer pour en changer 10 % — c'est
la demande la plus votée de son tracker depuis 2018. Et rien ne permet de voir à quoi
ressemblera une page avant d'être en l'air.

Des éditeurs externes existent. La première objection qu'un pilote leur oppose, en toutes
lettres sur le forum en juillet 2026, est celle-ci :

> « will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting. »

C'est la bonne question. Ce projet est construit autour de sa réponse.

## La fidélité à l'octet près, et ce qu'elle garantit exactement

**Un fichier ouvert puis réexporté sans modification ressort avec la même empreinte
SHA-256.** Pas « équivalent », pas « fonctionnellement identique » : le même fichier,
octet pour octet.

Et quand vous modifiez quelque chose, **seul ce que vous avez modifié change**. Déplacer
un gadget ne réécrit que ses quatre coordonnées ; le reste du fichier — les 78 000 autres
octets — sort intact.

Ce n'est pas une élégance d'ingénieur, c'est ce qui rend l'outil utilisable :

- **Vos réglages spécifiques survivent, y compris ceux que l'éditeur ne comprend pas.**
  Le format `.xcfg` n'est pas documenté et gagne des clés à chaque version de XCTrack.
  Un éditeur qui reconstruit le fichier à partir de ce qu'il a su lire **perd
  silencieusement le reste**. Celui-ci transporte les clés inconnues telles quelles.
- **Les nombres gardent leur écriture.** `3.0` ne devient pas `3`, `1.0E7` ne devient pas
  `10000000`, `-0.0` ne devient pas `0`, un entier au-delà de 2^53 n'est pas arrondi, et
  une couleur Android négative reste négative. Un simple `JSON.parse` + `JSON.stringify`
  détruit ces cinq cas — c'est le piège central de ce format.
- **L'ordre des clés, les clés dupliquées et l'UTF-8 brut sont préservés**, parce que
  XCTrack les écrit ainsi et qu'un fichier réordonné n'est plus le même fichier.

Cette garantie n'est pas une promesse : elle est **prouvée par les tests**, sur un corpus
de fichiers versionné que n'importe qui peut exécuter (`npm test`). C'est délibéré — une
promesse de fidélité que seul l'auteur peut vérifier ne vaut rien.

## Ce que l'outil sait faire

- **Ouvrir** un `.xcfg` ou un `.xczfg` (l'archive ZIP que XCTrack écrit quand la
  configuration embarque des ressources).
- **Dessiner les pages** à la géométrie de l'instrument, sur huit gabarits d'écran
  (AIR³ 7.2, 7.3, 7.35, et cinq ratios courants), en paysage et en portrait.
- **Signaler ce qui cloche** avant que vous ne le découvriez en vol : un gadget
  entièrement recouvert par un autre et donc inatteignable au clic, une page qui ne
  s'affichera jamais, un gadget trop petit pour être lu à bout de bras, un réglage écrit
  par une version antérieure de XCTrack. L'outil **signale, il ne corrige jamais tout
  seul**.
- **Éditer** : déplacer, redimensionner, ajouter, supprimer et réordonner des gadgets ;
  régler leurs options ; gérer les pages (insérer, dupliquer, supprimer, réordonner).
  Annuler / rétablir.
- **Régler les réglages généraux** — les 216 préférences qui vivent hors des pages :
  unités, touches, capteurs, son, espaces aériens. Dans l'arborescence des 23 lignes du
  menu de l'instrument. En consultation, **aucun contrôle de formulaire n'est
  construit** ; en édition, 77 des 93 lignes présentées se règlent — case, liste,
  curseur, nombre, texte, couleur —, avec annulation et rétablissement comme le reste.
  Les seize autres, la valeur JSON imbriquée et tout ce que la page ne sait pas nommer
  restent affichés **sans contrôle**, chacun disant pourquoi.
- **Rendre explicite un réglage qui ne l'est pas** — et l'inverse. Une clé absente du
  fichier vaut son défaut de façon implicite : les réglages généraux **comme le panneau
  d'un gadget** montrent cette valeur et proposent de l'écrire d'un clic. Cela ne change
  rien à ce que fait l'appareil aujourd'hui ; ce que ça change est pour plus tard — tant
  que la clé est absente, une mise à jour de XCTrack qui change ce défaut change votre
  réglage sans prévenir, alors qu'une valeur écrite est figée. Le geste inverse existe
  dans les réglages généraux : une valeur écrite qui vaut déjà le défaut peut être
  retirée du fichier. Aucun bouton là où le défaut n'est pas relevé, ni là où le relevé
  n'en donne qu'une valeur composée (`{"theme": …, "terrain": …}`) — écrire une valeur
  devinée serait pire que ne rien proposer.
- **Diagnostiquer l'écart de version** : choisir la version de XCTrack visée, et voir ce
  que le fichier porte qu'elle ne lit plus, ou ce qu'elle attend et qu'il n'a pas. Le
  diagnostic **constate, il ne supprime rien** — l'outil de nettoyage n'existe pas encore.
- **Dire ce que votre fichier révèle de vous** avant que vous ne le partagiez. Un export
  `backup` porte votre nom, votre voile, vos capteurs appairés, vos fichiers de waypoints
  — jusqu'au nom de la compétition à laquelle vous participez. Au moment d'enregistrer,
  l'outil propose donc deux issues : le **fichier complet**, à l'octet près, ou une
  **version partageable** — un export `pages` dont les textes que vous avez écrits sont
  remplacés, avec l'inventaire de chaque remplacement, son emplacement et sa raison,
  montré *avant* le téléchargement. Le nom du fichier produit est horodaté et **ne
  reprend rien du nom d'origine**, qui contient souvent un prénom.
- **Ranger plusieurs configurations sous un nom**, dans votre navigateur, et revenir à
  l'une d'elles : une pour la compétition, une pour le vol-bivouac, une pour l'école. Les
  octets rangés sont ceux de votre fichier, vérifiés par empreinte à la relecture. Rien
  n'est envoyé nulle part.
- **Parler votre langue** : les noms et descriptions des gadgets sont ceux de XCTrack
  lui-même, extraits de l'application, en 33 langues.

## Ce qu'il ne sait pas faire, et ce qui reste incertain

Autant le dire tout de suite.

- **Le format `.xcfg` n'est pas documenté.** Tout ce que l'outil en sait vient de
  l'observation d'un corpus de fichiers réels (2022 → 2026) et de la lecture de
  l'application. Le schéma change à chaque version de XCTrack : ce qui est vrai
  aujourd'hui peut cesser de l'être demain. C'est précisément pourquoi l'outil est bâti
  pour **transporter ce qu'il ne comprend pas** plutôt que pour modéliser le format.
- **Le rendu est une imitation, pas l'appareil.** Les dessins de gadgets sont reconstruits
  à partir de ce qui a été observé sur un **AIR³ 7.2** — un seul appareil, une seule
  version de XCTrack. Les valeurs affichées sont des exemples fixes : rien n'est simulé.
  Un gadget dont le dessin n'a pas été reproduit s'affiche sous une forme générique
  honnête plutôt que sous une approximation trompeuse.
- **Aucune synchronisation avec l'instrument.** L'aller-retour se fait par carte SD ou par
  câble, à la main.
- **Ni suggestion, ni correction automatique.** L'outil ne réarrange pas vos pages et ne
  décide pas à votre place.
- **Pas de bibliothèque communautaire, pas de compte, pas de serveur.** C'est un choix :
  ce qui n'existe pas ne fuite pas. La bibliothèque de configurations vit **dans votre
  navigateur** (IndexedDB) et n'en sort que si vous l'exportez vous-même ; vider les
  données du site l'efface, et un autre appareil ne la voit pas.
- **Tout ne se règle pas dans les préférences générales.** Le JSON imbriqué de la section
  `preferences` (`Sounds`, `Navigation.State`, `Sensors.Configuration`,
  `Sound.AcousticVario.CustomProfile`) ressort intact, jamais réécrit ; les seize lignes
  qui ouvrent une boîte sur l'appareil — les quinze touches, la table du vario sonore —
  ne se règlent pas ici, faute d'en connaître le domaine ; et les huit `Unit.*`, dont
  XCTrack remplit la liste en code, n'ont qu'un champ texte plutôt qu'une liste inventée.
- **Aucun aperçu d'image dans la bibliothèque.** La place est réservée dans les données,
  la vignette est un cadre vide qui le dit.

## Installer et lancer

Il faut Node.js 22 ou plus récent.

```bash
git clone <l'URL du dépôt>
cd xcfg-editor
npm ci
npm run dev          # http://localhost:5173
```

Pour construire la version statique :

```bash
npm run build        # produit dist/
npm run preview      # sert dist/ localement
```

`dist/` est un site entièrement statique, sans dépendance à l'exécution : il se dépose sur
n'importe quel hébergement de fichiers, y compris dans un sous-répertoire.

## Contribuer

```bash
npm run typecheck    # tsc --noEmit : zéro erreur attendue
npm test             # la suite complète
npm run test:watch   # en continu pendant le développement
```

**La suite doit rester intégralement verte, et `tsc` muet.** Les fichiers de test lisent
un corpus versionné, dans `tests/fixtures/` : rien à installer, rien à configurer, la
suite s'exécute à l'identique sur n'importe quelle machine.

Quelques conventions, qui expliquent la forme du code :

- **Le code est commenté en français**, y compris les titres de tests. Les identifiants,
  eux, sont en anglais.
- **Un commentaire dit *pourquoi*, pas *quoi*.** Les modules portent en tête l'argument
  qui a décidé de leur conception, et les mesures sur lesquelles il repose. C'est ce qui
  permet de contester une décision plutôt que de la deviner.
- **Ce qui est mesuré est distingué de ce qui est supposé.** Les constats de l'outil
  portent leur degré de certitude, et un constat incertain dit ce qui le lèverait.
- **Les tests éprouvent des propriétés, pas des captures d'écran de sortie.** Un test qui
  compare un objet à lui-même est vert quoi qu'il arrive et n'apprend rien : plusieurs
  tests posent explicitement des garde-fous contre ce piège.

Ces choix reposent sur des relevés faits sur un AIR³ 7.2 réel : corpus de fichiers
observés sur quatre ans et huit versions de XCTrack, rendu constaté en vol, planche des
75 widgets capturée page par page. **Ces relevés ne sont pas publiés** — ils contiennent
des configurations de vol et des positions personnelles. Ce qu'ils ont établi est en
revanche présent ici, dans les commentaires du code et dans les données extraites de
l'APK, et les tests le vérifient.

### À propos du corpus de tests

Les fichiers de `tests/fixtures/exports/` sont **dérivés de configurations de vol
réelles**, puis anonymisés : nom du pilote, voile, coordonnées GPS, points de virage et
noms de fichiers de waypoints ont été remplacés par des valeurs d'exemple. Le `layout` est
conservé à l'octet près — c'est ce qui donne au corpus ses 105 widgets, ses 41 classes et
sa géométrie réelle, qu'aucun fichier écrit à la main n'égalerait.

`tests/fixtures/deriver-exemples.py` dit ligne par ligne ce qui a été remplacé et ce qui
ne l'a pas été. `tests/fixtures/anonymat.test.ts` le contrôle à chaque exécution de la
suite.

⚠️ **Si vous contribuez, ne versionnez jamais un `.xcfg` exporté de votre propre
instrument.** Même un export `pages` peut porter du texte que vous avez écrit : le titre
personnalisé d'un widget, le contenu d'un `WFreeText`, et jusqu'au nom et au numéro de
téléphone rangés dans un bouton d'appel. Le format d'export ne garantit rien à lui seul.

### Régénérer la base des versions de XCTrack

`src/catalog/widgetVersions/` répond à une question : *pour un couple (widget, clé
d'option), dans quelles versions de XCTrack existe-t-il ?* C'est elle qui alimente le
diagnostic « Version et compatibilité », lequel distingue un réglage devenu caduc d'un
réglage parfaitement valide. Le **nettoyage**, lui, n'est pas écrit : le diagnostic dit
ce qu'il sait et ce qu'il ignore, et rien ne supprime encore quoi que ce soit.

Elle est reproductible, une version à la fois, à partir d'un APK **que l'on possède**.
Deux outils, sans réseau ni dépendance :

```bash
# 1. Dépaqueter l'APK : trois sortes de fichiers suffisent
unzip -o mon-xctrack.apk AndroidManifest.xml resources.arsc 'classes*.dex' -d /tmp/xct

# 2. Relever sa structure — le versionCode est lu dans le manifeste, il fait autorité
python3 tools/extract-version-schema.py /tmp/xct -o relevés/ma-version.json

# 3. Assembler les relevés en base, et les confronter à des fichiers .xcfg réels
python3 tools/build-version-database.py --surveys relevés/ --corpus mes-exports/
```

Le second affiche, pour chaque version dont on possède des fichiers `.xcfg`, combien de
couples *(widget, clé)* la confrontation retrouve. **Ce contrôle vaut preuve** : un
fichier a été écrit par la version qu'il déclare, toute clé qu'il porte existe donc dans
cette version-là. Quand la base dit le contraire, c'est la base qui a tort — et elle le
consigne au lieu de le corriger en douce.

Ce n'est pas une précaution théorique, et l'inverse ne l'est pas non plus : **XCTrack
conserve les clés qu'il ne connaît plus**. Dans une même sauvegarde de 1.0.3, sur cinq
widgets cartographiques, deux portent `mapWidget_showTerrain` et trois portent
`mapWidget_panningTimeout` — jamais les deux. Les seconds ont été refaits depuis le
remplacement, les premiers traînent un reliquat vieux de deux ans.

Une base qui prendrait toute clé observée pour une clé existante protégerait donc
exactement les reliquats qu'un nettoyage doit ôter ; une base qui prendrait toute clé
non extraite pour une clé retirée supprimerait des réglages valides. D'où des tables
distinctes — ce qui a été *lu*, ce qu'un fichier réel *porte*, et **pourquoi** les deux
diffèrent. Voir l'en-tête de `src/catalog/widgetVersions.ts`.

Ce dépôt ne fournit pas d'outil pour rassembler les APK : chacun apporte les siens.

### Régénérer le catalogue des préférences générales

`src/catalog/preferenceCatalog/` décrit les réglages qui vivent **hors des pages** : les
unités, les touches, le son, les capteurs, les espaces aériens — la section `preferences`
d'un export `backup`. Il alimente la page « Réglages généraux », qui les montre **et les
règle** : c'est lui qui décide de la forme du contrôle, du domaine de valeurs offert et
de ce qui ne s'offre pas. Ce qu'il ne relève pas ne se propose pas.

```bash
unzip -o mon-xctrack.apk AndroidManifest.xml resources.arsc 'classes*.dex' \
      'res/*' -d /tmp/xct
python3 tools/extract-preferences.py /tmp/xct
```

Deux exécutions produisent des fichiers identiques à l'octet près ; aucun JSON n'est
jamais édité à la main.

Deux sources sont lues séparément, puis croisées :

- **les écrans de réglages** (`res/xml/preferences_*.xml`), où la clé et son libellé sont
  deux attributs du *même* élément — l'appariement le plus sûr du projet ;
- **la classe de configuration** dans le bytecode, qui donne le type de la valeur, son
  défaut, et la **portée** : `PUBLIC` (écrite dans un export), `INTERNAL` (locale à
  l'appareil), `SECURE` (chiffrée).

Le croisement se vérifie : sur XCTrack 1.0.3-beta5, les 136 clés `PUBLIC` du bytecode sont
**exactement** les 136 clés d'une sauvegarde réelle. Ni une de plus, ni une de moins.

L'extraction **refuse de rendre un relevé vide**. La reconnaissance de la classe de
configuration repose sur l'énumération de portée, qui a varié — quatre constantes en
2022, aucune de la 0.9.9.1 à la 0.9.10.3 — et une reconnaissance ratée produisait un
catalogue plausible mais amputé du tiers de ses clés, sans un mot. Un relevé sans aucune
préférence déclarée est désormais une erreur bruyante : rien n'est écrit, et le
catalogue précédent reste en place. `python3 tools/extract-preferences.py --self-test`
éprouve ce garde-fou sans APK.

Vingt-quatre clés supplémentaires sont publiées **à côté** des préférences, sous
`directReads` : la classe de configuration les lit à même les préférences partagées
d'Android, sans objet de préférence. On y publie ce qui est lu — l'accesseur, donc le
type, et le fait qu'aucune n'est réécrite — et rien de plus : leur portée n'est écrite
nulle part, et les ranger avec les autres les dirait exportables sans mesure.

**Ce que le catalogue ne sait pas, il le dit.** 86 clés sur 217 n'ont pas de libellé,
dont 49 des 136 qu'un fichier réel porte : XCTrack les règle dans des écrans construits en
code (espaces aériens, cartes, actions automatiques, sons), où la clé n'est plus argument
du même appel que son libellé, ou bien ce ne sont pas des réglages mais de l'état
sérialisé. Elles restent au catalogue avec `label: null` — un éditeur doit savoir qu'il
les rencontrera. La liste est publiée, pas laissée à recalculer.

Le catalogue marque aussi **les clés qui portent une donnée personnelle**, en distinguant
ce qui est lu dans l'APK (une portée `SECURE`, un champ de saisie masqué) de ce qui est
affirmé sur le contenu d'une clé, qui ne se lit nulle part. Voir l'en-tête de
`src/catalog/preferenceCatalog.ts`.

### Une seule source pour « qu'y a-t-il de personnel dans ce fichier ? »

Quatre écrans posent cette question — les réglages généraux, la bibliothèque, la boîte
d'enregistrement, l'avertissement d'export. Ils y répondaient chacun avec sa propre liste
de clés, donc avec quatre chiffres qu'aucun d'eux ne rapprochait. L'inventaire vit
désormais dans **`src/model/personalData.ts`**, et les quatre écrans en sont des vues.

Il distingue quatre choses, parce que ce sont de vraies différences :

- **où ça vit** — dans le `layout`, la donnée **part avec un export « pages »** ; dans les
  `preferences`, elle reste sur l'appareil. ⚠️ Un export « pages » **peut** porter des
  données personnelles : le nom et le numéro de téléphone d'un `WButtonPhone` sont dans le
  `layout` ;
- **ce que c'est** — les neuf natures du catalogue (`credential`, `location`, `device`,
  `identity`, `file`, `equipment`, `freeText`, `sharing`, `contact`) ;
- **d'où on le sait** — lu dans l'APK, ou jugé par nous avec sa raison. Résultat mesuré :
  tout ce qu'un fichier **réel** porte de personnel relève d'un jugement, car les seules
  clés dont XCTrack déclare lui-même la sensibilité sont celles qu'il chiffre — et
  celles-là ne sont jamais exportées ;
- **ce qui est renseigné** — une fiche `contact` présente mais vide n'est pas un numéro de
  téléphone. Les 15 `WButtonPhone` du corpus portent tous une structure vide.

Aucun chiffre commun n'est inventé : chaque écran **nomme** ce qu'il compte. Sur
`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, les réglages généraux annoncent
16 clés de préférences (11 renseignées, 5 vides) et disent qu'ils ne comptent pas les
textes des gadgets ; la bibliothèque annonce « 16 données personnelles · 0 part avec les
pages » ; la boîte d'enregistrement dit n'avoir aucun texte à remplacer **et** rappelle les
16 clés de préférences qu'elle écarte en bloc.

Les 44 clés surveillées sont extraites du catalogue vers `src/model/personalKeys.json`
(7,3 Ko) par le même script, et non recopiées : `tests/model/personalData.test.ts` vérifie
à chaque exécution que le relevé est la copie exacte du catalogue. C'est ce qui permet aux
trois écrans qui n'ont pas le catalogue sous la main de répondre sans charger ses 96 Ko.

⚠️ **La dimension « version » n'est pas construite** : `src/catalog/widgetVersions/` ne
couvre que les widgets. Le catalogue des préférences dit de quelle version il parle
(`meta.versionCode`) et rien de plus. Sur un `backup` écrit par 0.9.12.3, 27 des 148 clés
sont inconnues de la 1.0.3-beta5 — c'est la mesure de ce que cette absence coûte.

## Licence

MIT — voir [LICENSE](LICENSE).

XCTrack est une application de [XContest](https://xcontest.org/). Ce projet n'est ni
affilié à XContest, ni à Air3, ni approuvé par eux.
