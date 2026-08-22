# `docs-app/` — le manuel d'utilisation, celui que le pilote ouvre depuis l'application

Ce répertoire ne contient **que de la prose et sa mise en page**. Aucune ligne de code, aucune
chaîne de ce manuel ne vit ailleurs. C'est délibéré, et c'est ce qui rend la traduction et la
relecture possibles sans toucher à `src/`.

| Fichier | Ce que c'est |
|---|---|
| `manuel.fr.html` | Le manuel, en français. Un **fragment** : ni `<html>`, ni `<head>`, ni `<body>`. C'est la **source de vérité** : les quatre autres en sont des traductions. |
| `manuel.en.html`, `manuel.nl.html`, `manuel.de.html`, `manuel.es.html` | Le même manuel dans les quatre autres langues du socle `src/i18n/`. Même structure, mêmes ancres, mêmes classes. |
| `manuel.css` | Sa mise en page, **partagée par les cinq**. Toutes les règles sont portées sous `.manual`, sans exception. |

## Pourquoi du HTML nu

Le manuel s'ouvre **depuis l'application**, qui est servie par GitHub Pages et qu'un pilote
charge parfois en 3G au décollage. Trois formats étaient possibles :

- **Markdown chargé à la demande** — il faudrait embarquer un analyseur Markdown dans la page
  (une dépendance de plusieurs dizaines de kilo-octets, ou un analyseur maison à écrire et à
  tester) pour produire des balises que le navigateur sait déjà lire. Le gain de lisibilité en
  source ne paie pas ce prix.
- **Une page HTML autonome ouverte dans un autre onglet** — il faudrait l'ajouter aux entrées
  de `vite.config.ts` ou passer par un répertoire `public/`, et le pilote quitterait
  l'application au moment précis où il a besoin d'aide.
- **Un fragment HTML injecté dans une vue de l'application** — retenu. Pas d'analyseur, pas
  d'entrée de construction supplémentaire, et le pilote garde son fichier ouvert derrière.
  Ce fut d'abord une modale ; treize chapitres ne se lisent pas dans une boîte, et c'est
  aujourd'hui une **page** : le défilement revient au navigateur, donc la position se garde,
  la recherche du navigateur fonctionne, et l'impression aussi.

**Le poids.** Le fragment est du texte : il se compresse comme du texte. Importé en `?raw`
depuis un module chargé par `import()`, il part dans un morceau à part que Vite n'émet qu'au
moment où le pilote ouvre le manuel — **zéro octet sur le premier écran**, exactement comme
les catalogues de langue et les cinq modules déjà branchés à la demande dans `src/ui/main.ts`.

## Le manuel commence à `<h2>`

La page porte le `<h1>`. Un second premier niveau dans le fragment casserait la navigation
par titres d'un lecteur d'écran, qui est le sommaire réel de ce document.

## Le fil du fragment, les deux colonnes de l'écran

Le fragment est **un seul fil** : l'avertissement, le sommaire, puis les treize chapitres.
C'est ce qui fait que `Ctrl+F` trouve le manuel entier et que l'impression sort d'un bloc.

À l'ouverture, `src/ui/manualPage.ts` range ce fil en trois boîtes — `.manual__lead`
(l'avertissement), `.manual__side` (le sommaire) et `.manual__text` (les chapitres) — que
`manuel.css` met en deux colonnes au-dessus de 64 rem : le sommaire à gauche, collant, avec
le chapitre courant marqué ; le texte à droite, borné à 640 px. En dessous, tout retombe
dans le fil, dans l'ordre du document, et une pastille fixe ramène au sommaire.

**Ces trois classes ne s'écrivent jamais dans le HTML** : elles n'existent qu'à l'écran. Un
fragment qui les porterait figerait la mise en page dans cinq fichiers de mille lignes.

## Les classes du fragment

Elles sont toutes définies dans `manuel.css`, et il n'y en a pas d'autres à inventer sans
raison :

| Classe | Usage |
|---|---|
| `.manual` | La racine du fragment. **Toute** règle de style descend d'elle. |
| `.manual__toc` | Le sommaire, en tête du fragment — l'écran le déplace ensuite dans sa colonne. Des liens d'ancre, pas un accordéon : `Ctrl+F` doit trouver le manuel entier. |
| `.manual__rank` | Le numéro d'un chapitre, devant son titre. |
| `.manual__ui` | Un intitulé **recopié de l'écran**. Pas du gras, pas du code : un fond discret qui dit « cherchez ce mot-là à l'écran ». |
| `.manual__file` | Un nom de fichier ou une extension, en chasse fixe — le pilote va le comparer caractère par caractère. |
| `.manual__note` | Une précision utile, sans conséquence si on la saute. |
| `.manual__measured` | **Ce qui a été mesuré sur l'appareil.** Ne sert à rien d'autre : c'est la marque distinctive du projet. |
| `.manual__warning` | Le seul encadré coloré, réservé aux données personnelles. |
| `.manual__boxTitle` | Le titre d'un encadré. Volontairement pas un élément de titre : il ne doit pas entrer dans le sommaire. |
| `.manual__steps` | Une suite de gestes numérotés, quand l'ordre compte. |

## Les cinq langues

Les cinq langues du socle `src/i18n/` sont `fr`, `en`, `nl`, `de`, `es`, et le manuel existe
dans les cinq. Le texte est écrit pour cela : sections courtes, aucun jeu de mots, aucun
renvoi implicite (les renvois nomment le chapitre par son numéro).

### Ce qui doit être identique d'une langue à l'autre

- **Les `id` d'ancre des treize chapitres** — `m-outil`, `m-ouvrir`, `m-voir`, `m-gabarit`,
  `m-modifier`, `m-gadget`, `m-usine`, `m-generaux`, `m-version`, `m-enregistrer`,
  `m-bibliotheque`, `m-mesure`, `m-avis`. Ce sont des **identifiants**, pas de la prose :
  ils restent en français dans les cinq fichiers, et un lien profond marche partout. Le
  sommaire y pointe par `href="#m-…"`.
- **Le nombre et l'ordre des `<h2>`** : celui du sommaire, puis les treize chapitres.
- **Les classes**, sans exception ni ajout.
- **L'encadré des données personnelles avant le sommaire.** Il ne descend jamais.

`tests/docs/manuels.test.ts` vérifie ces quatre points à chaque exécution de la suite, plus
la présence de l'adresse des issues GitHub dans le chapitre 13 de chaque langue.

### ⚠ Les intitulés d'écran ne se traduisent pas : ils se recopient

Ce qui est entre `<span class="manual__ui">` est **l'intitulé exact de l'écran**. Il se
recopie **caractère pour caractère** du catalogue `src/i18n/messages/<langue>/`, il ne se
retraduit jamais à la main : un manuel qui nomme un bouton autrement que l'écran est pire
qu'un manuel absent.

Deux pièges relevés en versant les quatre traductions :

1. **Un même libellé français peut être deux libellés ailleurs.** « Définir cette valeur »
   est `properties.setValue` dans le panneau d'un gadget et `preferences.adoptLabel` dans
   les réglages généraux : identiques en français, distincts dans les quatre autres langues
   (*Set this value* / *Write this value*). Le chapitre 7 doit donc **nommer les deux**
   hors du français.
2. **Un libellé peut ne pas dire la même chose.** « Rang 4 sur 6 » (`editor.rank`) devient
   *Layer 4 of 6*, « ← Vue d'ensemble » (`view.backToOverview`) devient *← All pages*.
   Traduire le français aurait donné un mot que le pilote ne trouve nulle part.

Les intitulés qui viennent de **XCTrack** et non de cet éditeur — « Exporter la
configuration », « Remplacer tout », les types de page — ne sont dans aucun catalogue. Ils
suivent l'axe `labels` (la langue du fichier), pas l'axe de notre prose : les écrire, c'est
faire un pari, et le pari se dit dans le message de commit plutôt que de passer pour une
mesure.

## Comment l'application sert la bonne langue

Le fragment est importé en `?raw` et le module `src/ui/manualDialog.ts` n'est atteint que
par `import()` : ses 16 ko compressés ne pèsent rien sur le premier écran.

**Cinq langues ne font pas 80 ko.** Les cinq fragments ne doivent jamais être importés
ensemble : ce serait faire payer 64 ko de manuels illisibles à un pilote qui charge la page
en 3G au décollage. Chacun part dans **son propre morceau**, et seul celui de la langue
affichée est téléchargé — un `import.meta.glob` **paresseux** (sans `eager`) sur
`./manuel.*.html` rend un objet de chargeurs, un par fichier, que Vite émet en morceaux
séparés. Le poids sur le premier écran reste **zéro**, et le poids à l'ouverture du manuel
reste **un seul** fragment.

Le repli est le français, comme partout dans `src/i18n/` : c'est la langue d'écriture, pas
une traduction. Un repli anglais serait un repli sur une traduction.

## Le vocabulaire, arrêté

À ne pas rejuger sans une raison neuve — une relecture complète est passée dessus :

- **« gadget »** — le mot de XCTrack en français, mesuré sur l'appareil. Jamais « widget ».
- **« valeur d'usine »** — jamais « défaut », qui se lit « anomalie ».
- **« réglage »** ou **« ligne du fichier »** — jamais « clé », qui est notre mot, pas celui
  du pilote.
- Les trois mots du diagnostic : **« périmé »**, **« angle mort »**, **« inconnu »**.
- L'application parle **au** pilote, jamais **de** lui.
- **« palier »** n'existe pas à l'écran : c'est un terme interne, il n'a rien à faire ici.
- « rang » (diagnostic, nettoyage) et « gadget N » (boîte d'enregistrement) désignent la même
  chose à deux endroits : citer la forme de l'écran dont on parle.

## Tenir le manuel à jour

`CLAUDE.md` l'exige dans le **même travail** que le changement de code, pas « quand on y
pense ». La question n'est pas « faut-il documenter ceci ? » mais **« ce que le manuel affirme
est-il encore vrai ? »**.

Trois pièges relevés en écrivant la première version :

1. **Ne décrire que ce qui est branché.** Le manuel ne parle que de ce qu'un écran appelle
   vraiment. Vérifier avant d'ajouter un paragraphe : `grep -rn "model/inspection" src/ui/`.
   *(Mis à jour le 22 août 2026 : `src/model/inspection.ts` n'était appelé par aucun écran
   quand cette règle a été écrite, et le manuel se taisait donc sur les sept contrôles avant
   vol. `src/ui/main.ts` appelle désormais `preflightWarnings`, et le chapitre 3 les décrit.
   La règle reste bonne ; c'était son exemple qui avait vieilli.)*
2. **Ne pas recopier un chiffre calculé à l'exécution.** Le nombre de versions relevées, le
   nombre de réglages d'un fichier, le nombre de gadgets d'une page sont affichés par l'écran
   lui-même : les figer ici les périme au premier relevé ajouté.
3. **Ne pas gommer la distinction mesuré / déduit.** C'est ce qui distingue ce projet ; une
   phrase qui l'efface lui fait perdre sa valeur.
