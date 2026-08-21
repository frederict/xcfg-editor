# `docs-app/` — le manuel d'utilisation, celui que le pilote ouvre depuis l'application

Ce répertoire ne contient **que de la prose et sa mise en page**. Aucune ligne de code, aucune
chaîne de ce manuel ne vit ailleurs. C'est délibéré, et c'est ce qui rend la traduction et la
relecture possibles sans toucher à `src/`.

| Fichier | Ce que c'est |
|---|---|
| `manuel.fr.html` | Le manuel, en français. Un **fragment** : ni `<html>`, ni `<head>`, ni `<body>`. |
| `manuel.css` | Sa mise en page. Toutes les règles sont portées sous `.manual`, sans exception. |

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
- **Un fragment HTML injecté dans une modale** — retenu. Pas d'analyseur, pas d'entrée de
  construction supplémentaire, et le pilote garde son fichier ouvert derrière la boîte.

**Le poids.** Le fragment est du texte : il se compresse comme du texte. Importé en `?raw`
depuis un module chargé par `import()`, il part dans un morceau à part que Vite n'émet qu'au
moment où le pilote ouvre le manuel — **zéro octet sur le premier écran**, exactement comme
les catalogues de langue et les cinq modules déjà branchés à la demande dans `src/ui/main.ts`.

## Le manuel commence à `<h2>`

La boîte modale porte le `<h1>`. Un second premier niveau dans le fragment casserait la
navigation par titres d'un lecteur d'écran, qui est le sommaire réel de ce document.

## Les classes du fragment

Elles sont toutes définies dans `manuel.css`, et il n'y en a pas d'autres à inventer sans
raison :

| Classe | Usage |
|---|---|
| `.manual` | La racine du fragment. **Toute** règle de style descend d'elle. |
| `.manual__toc` | Le sommaire, en tête. Des liens d'ancre, pas un accordéon : `Ctrl+F` doit trouver le manuel entier. |
| `.manual__rank` | Le numéro d'un chapitre, devant son titre. |
| `.manual__ui` | Un intitulé **recopié de l'écran**. Pas du gras, pas du code : un fond discret qui dit « cherchez ce mot-là à l'écran ». |
| `.manual__file` | Un nom de fichier ou une extension, en chasse fixe — le pilote va le comparer caractère par caractère. |
| `.manual__note` | Une précision utile, sans conséquence si on la saute. |
| `.manual__measured` | **Ce qui a été mesuré sur l'appareil.** Ne sert à rien d'autre : c'est la marque distinctive du projet. |
| `.manual__warning` | Le seul encadré coloré, réservé aux données personnelles. |
| `.manual__boxTitle` | Le titre d'un encadré. Volontairement pas un élément de titre : il ne doit pas entrer dans le sommaire. |
| `.manual__steps` | Une suite de gestes numérotés, quand l'ordre compte. |

## Traduire

Recopier `manuel.fr.html` sous `manuel.<langue>.html` et traduire. Rien d'autre.

Le texte est écrit pour cela : sections courtes, aucun jeu de mots, aucun renvoi implicite
(les renvois nomment le chapitre par son numéro). Les cinq langues du socle `src/i18n/` sont
`fr`, `en`, `nl`, `de`, `es`.

⚠ Ce qui est entre `<span class="manual__ui">` est **l'intitulé exact de l'écran**. Il ne se
traduit qu'avec l'interface, et jamais avant elle : un manuel qui nomme un bouton autrement
que l'écran est pire qu'un manuel absent.

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

1. **Ne décrire que ce qui est branché.** `src/model/inspection.ts` (les sept contrôles avant
   vol) est écrit et testé, mais **aucun écran ne l'appelle** : le manuel n'en parle donc pas.
   Vérifier `grep -rn "model/inspection" src/` avant d'ajouter un paragraphe dessus.
2. **Ne pas recopier un chiffre calculé à l'exécution.** Le nombre de versions relevées, le
   nombre de réglages d'un fichier, le nombre de gadgets d'une page sont affichés par l'écran
   lui-même : les figer ici les périme au premier relevé ajouté.
3. **Ne pas gommer la distinction mesuré / déduit.** C'est ce qui distingue ce projet ; une
   phrase qui l'efface lui fait perdre sa valeur.
