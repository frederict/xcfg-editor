# Éditeur de configuration XCTrack

Un éditeur web pour les fichiers `.xcfg` de **XCTrack**, l'application de vol des
parapentistes. On ouvre un export de son instrument, on voit ses pages telles que
l'appareil les dessine, on les modifie, on réexporte.

Tout se passe **dans le navigateur**. Aucun serveur, aucun compte, aucun envoi : le
fichier ne quitte pas la machine.

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
un widget ne réécrit que ses quatre coordonnées ; le reste du fichier — les 78 000 autres
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
- **Signaler ce qui cloche** avant que vous ne le découvriez en vol : un widget
  entièrement recouvert par un autre et donc inatteignable au clic, une page qui ne
  s'affichera jamais, un widget trop petit pour être lu à bout de bras, un réglage écrit
  par une version antérieure de XCTrack. L'outil **signale, il ne corrige jamais tout
  seul**.
- **Éditer** : déplacer, redimensionner, ajouter, supprimer et réordonner des widgets ;
  régler leurs options ; gérer les pages (insérer, dupliquer, supprimer, réordonner).
  Annuler / rétablir.
- **Dire ce que votre fichier révèle de vous** avant que vous ne le partagiez. Un export
  `backup` porte votre nom, votre voile, vos capteurs appairés, vos fichiers de waypoints
  — jusqu'au nom de la compétition à laquelle vous participez. L'outil sait en **dériver
  un export `pages`**, qui ne transporte que les écrans, et vous montre ce qu'il écarte.
- **Parler votre langue** : les noms et descriptions des widgets sont ceux de XCTrack
  lui-même, extraits de l'application, en 33 langues.

## Ce qu'il ne sait pas faire, et ce qui reste incertain

Autant le dire tout de suite.

- **Le format `.xcfg` n'est pas documenté.** Tout ce que l'outil en sait vient de
  l'observation d'un corpus de fichiers réels (2022 → 2026) et de la lecture de
  l'application. Le schéma change à chaque version de XCTrack : ce qui est vrai
  aujourd'hui peut cesser de l'être demain. C'est précisément pourquoi l'outil est bâti
  pour **transporter ce qu'il ne comprend pas** plutôt que pour modéliser le format.
- **Le rendu est une imitation, pas l'appareil.** Les dessins de widgets sont reconstruits
  à partir de ce qui a été observé sur un **AIR³ 7.2** — un seul appareil, une seule
  version de XCTrack. Les valeurs affichées sont des exemples fixes : rien n'est simulé.
  Un widget dont le dessin n'a pas été reproduit s'affiche sous une forme générique
  honnête plutôt que sous une approximation trompeuse.
- **Aucune synchronisation avec l'instrument.** L'aller-retour se fait par carte SD ou par
  câble, à la main.
- **Ni suggestion, ni correction automatique.** L'outil ne réarrange pas vos pages et ne
  décide pas à votre place.
- **Pas de bibliothèque communautaire, pas de compte, pas de serveur.** C'est un choix :
  ce qui n'existe pas ne fuite pas.

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
d'option), dans quelles versions de XCTrack existe-t-il ?* C'est ce qui permettra de
distinguer un réglage devenu caduc d'un réglage parfaitement valide — donc de nettoyer
une configuration sans rien casser.

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

## Licence

MIT — voir [LICENSE](LICENSE).

XCTrack est une application de [XContest](https://xcontest.org/). Ce projet n'est ni
affilié à XContest, ni à Air3, ni approuvé par eux.
