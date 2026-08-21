# Conventions du projet

## La documentation fait partie du changement

**Toute modification du code déclenche une vérification du `README.md` et de `docs-app/`.**
Pas « quand on y pense » : dans le même travail, avant de considérer le changement fini.

La question à se poser n'est pas « faut-il documenter ceci ? » mais **« ce que la
documentation affirme est-il encore vrai ? »**. Une documentation fausse est pire qu'une
documentation absente : elle fait perdre du temps avec autorité.

Concrètement, à chaque ajout ou modification :

1. **Relire ce que le `README.md` promet** sur la partie touchée. Une fonctionnalité
   décrite qui a changé de nom, de place ou de comportement rend le texte faux.
2. **Mettre à jour `docs-app/`** — la documentation d'usage, celle qui explique ce que
   l'outil fait et comment s'en servir.
3. **Refaire les captures d'écran** que le changement périme. Une capture qui montre une
   interface disparue est un mensonge illustré, et il se croit plus qu'un texte.

Un changement purement interne (refactorisation, test, outillage) peut ne rien périmer :
**le dire dans le message de commit** vaut mieux que le passer sous silence, parce que le
relecteur suivant se posera la question.

## Les captures d'écran

Le `README.md` **doit** en porter — c'est un attendu, pas un agrément : un éditeur visuel
qui ne montre rien demande un acte de foi. Il en porte six, dans `captures/`, chacune
suivie de sa recette en commentaire HTML : l'écran, la fixture, l'état exact, le cadrage,
et ce qu'il faut vérifier avant de commiter l'image.

Deux règles absolues :

- **Jamais de données personnelles.** Les captures se font sur les fixtures anonymisées de
  `tests/fixtures/`, jamais sur une configuration réelle. Une capture d'un instrument
  affichant une carte peut révéler un domicile au bâtiment près : c'est arrivé, il a fallu
  purger l'historique.
- **Reproductibles.** Le moyen de refaire une capture doit être écrit à côté d'elle, sans
  quoi personne n'osera la remplacer et elle vieillira en place.

## Ce que la documentation ne doit jamais affirmer

Ce projet imite une application dont le format n'est pas documenté et change à chaque
version. Sa valeur tient à la **distinction entre ce qui est mesuré et ce qui est supposé**.

- Ce qui a été **observé sur l'appareil** se dit comme tel.
- Ce qui est **déduit** ou **extrait de l'APK** se dit comme tel.
- Ce qui n'a **pas été vérifié** se dit aussi — et c'est souvent le renseignement le plus
  utile pour la personne suivante.

Une phrase qui gomme cette distinction fait perdre au projet ce qui le distingue.

## Le reste

- **Fidélité à l'octet près** : un fichier ouvert puis réexporté sans modification ressort
  avec la même empreinte SHA-256. Toute fonctionnalité qui touche au document doit préserver
  cette propriété, et le prouver par un test.
- **Rien ne partage la largeur avec le rendu de la page** : la page est dessinée à sa taille
  physique réelle et le pilote travaille au-delà de 100 % de zoom. Ce qui n'est pas la page
  passe au-dessus (modale) ou en dessous (bandeau).
- **Le rendu d'une page reste toujours clair**, même en thème sombre : c'est l'écran d'un
  instrument.
- Interface et prose en **français**, identifiants en **anglais**.
- `git add` nominatif, jamais `-A`. `dist/` n'est jamais commité.
