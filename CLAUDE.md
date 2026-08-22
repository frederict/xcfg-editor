# Conventions du projet

## À l'ouverture d'une session : regarder les issues

Le `README` et les cinq manuels invitent le pilote à signaler ce qui cloche sur GitHub :
c'est le **seul chemin de retour** du projet. Une issue qui attend trois semaines dit à
celui qui l'a écrite que l'invitation était une politesse.

Donc, avant toute chose, sur les deux dépôts :

```sh
gh issue list --repo frederict/xcfg-editor  --state open   # le dépôt public
gh issue list --repo frederict/xcfg-matiere --state open   # le dépôt privé
```

**Toutes n'appellent pas une action**, et ouvrir un chantier pour chacune serait une
autre façon de mal répondre. Une issue peut être une question — à laquelle on répond —, un
doublon — qu'on rattache —, un rapport qui manque de quoi être reproduit — dont on demande
le fichier ou la version —, ou une demande hors du périmètre de l'outil — qu'on décline en
disant pourquoi. **Dire laquelle c'est** fait partie du traitement.

### ⚠ Un `.xcfg` joint à une issue

Le `README` et les cinq manuels avertissent de ne **jamais** joindre son propre `.xcfg`
sans l'avoir expurgé, et l'outil produit deux versions faites pour ça. Quelqu'un le fera
quand même, et **une issue GitHub est publique**.

1. **Ne pas l'ouvrir sans nécessité.** S'il faut le lire pour comprendre le problème, le
   lire — et rien de plus. On ne s'y promène pas.
2. **Ne jamais le verser au corpus** ni à `tests/fixtures/`. Le corpus est fait de fichiers
   anonymisés dont on connaît la provenance ; un fichier arrivé par une issue n'est ni l'un
   ni l'autre.
3. **Prévenir l'auteur** que son fichier est public, et lui indiquer laquelle des deux
   versions expurgées lui aurait suffi : « Version partageable, sans données
   personnelles » pour une question sur ses pages, « Tous vos réglages, sans ce qui vous
   désigne » pour un réglage général.

Ce n'est pas de la prudence de principe. Une capture d'un instrument affichant une carte a
déjà révélé un domicile au bâtiment près, et il a fallu purger l'historique du dépôt. Le
fichier d'un tiers mérite la **même** prudence — davantage, même : nous n'avons pas son
consentement.

## La documentation fait partie du changement

**Toute modification du code déclenche une vérification des cinq `README` et des cinq
manuels de `docs-app/`.** Pas « quand on y pense » : dans le même travail, avant de
considérer le changement fini.

La question à se poser n'est pas « faut-il documenter ceci ? » mais **« ce que la
documentation affirme est-il encore vrai ? »**. Une documentation fausse est pire qu'une
documentation absente : elle fait perdre du temps avec autorité.

### Dix fichiers, pas deux

Il n'y a plus un `README.md` et un manuel, mais **cinq de chacun** — `README.md`,
`README.en.md`, `.de.md`, `.es.md`, `.nl.md`, et `docs-app/manuel.<langue>.html`. Une
correction française qui ne passe pas dans les quatre traductions **est** une dérive :
elle laisse quatre textes affirmer ce qui vient d'être reconnu faux, et le lecteur
néerlandophone n'a aucun moyen de le savoir.

Concrètement, à chaque ajout ou modification :

1. **Relire ce que le `README.md` promet** sur la partie touchée. Une fonctionnalité
   décrite qui a changé de nom, de place ou de comportement rend le texte faux.
2. **Mettre à jour `docs-app/`** — la documentation d'usage, celle qui explique ce que
   l'outil fait et comment s'en servir.
3. **Porter la correction dans les quatre autres langues**, dans le même travail.
4. **Refaire les captures d'écran** que le changement périme. Une capture qui montre une
   interface disparue est un mensonge illustré, et il se croit plus qu'un texte.

Un changement purement interne (refactorisation, test, outillage) peut ne rien périmer :
**le dire dans le message de commit** vaut mieux que le passer sous silence, parce que le
relecteur suivant se posera la question.

### Ce que les tests de `tests/docs/` attrapent à votre place

Cette règle a existé, bien écrite, et n'a pas tenu : en une nuit, la documentation a cité
« Ce qui sera remplacé » comme intitulé d'écran alors qu'aucun catalogue ne l'a jamais
porté, « Masquée hors vol » retiré le jour même, « Libellés » renommé pendant la rédaction
du chapitre qui le citait. Aucune n'est une faute d'attention : **la phrase était vraie
quand elle a été écrite, et le monde a bougé autour d'elle.** Une consigne de relecture ne
peut rien contre ça — personne ne relit dix fichiers à chaque commit. Trois fichiers de
test le font :

- `manuels.test.ts` — les cinq manuels existent, portent les **mêmes ancres** (ce sont des
  identifiants, pas de la prose), le même nombre de chapitres, aucun lien de sommaire dans
  le vide, l'avertissement sur les données personnelles **avant** le sommaire.
- `intitules.test.ts` — **tout intitulé d'écran cité existe**. Le manuel le déclare par
  `<span class="manual__ui">`, le README par les guillemets de sa langue et une majuscule
  initiale ; la vérité est dans `src/i18n/messages/`, dans les catalogues d'APK de
  `src/catalog/`, et dans le code de `src/ui/` pour les quelques mots qui sont des noms
  (« Responsive »). Les **commentaires n'en font pas partie** : un intitulé retiré survit
  souvent dans le commentaire qui raconte son retrait.
- `coherence.test.ts` — les cinq README portent le **même plan** ; **aucun chemin cité** ne
  manque au dépôt ; **aucun module** de `src/model/` ou `src/ui/` n'est inatteignable
  depuis un écran. Ce dernier point est le cas d'un modèle écrit, testé, documenté — et
  branché à rien : le README annonçait ce que l'outil ne faisait pas.

### Ce qu'aucun test ne verra jamais

**Ne croyez pas la documentation gardée par une machine.** Ces contrôles savent qu'un mot
existe ; ils ne savent rien de ce qu'on en dit. Restent entièrement à votre charge :

- **la phrase autour d'un intitulé juste.** « Le bouton *Retirer* efface la ligne du
  fichier » passe au vert même s'il ne l'efface plus.
- **la place d'un écran.** Un intitulé réel décrit dans le mauvais chapitre passe.
- **les captures.** Aucun test ne regarde une image ; c'est le mensonge le plus cru et le
  seul qu'on ne détectera pas.
- **la justesse d'une traduction**, et la distinction mesuré/supposé de la section
  suivante — qui est ce que ce projet a de plus précieux.
- **ce qui n'est cité nulle part.** Un chapitre entier qui décrit une fonctionnalité
  disparue, sans en nommer un seul bouton, ne déclenche rien.

Le test dit « ce mot existe encore ». **Vous seul pouvez dire « cette phrase est encore
vraie ».**

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

## L'extraction de la prose vers `src/i18n/`

Le socle multilingue existe et les cinq langues sont en place ; ce sont les **phrases** des
écrans qui restent à verser, et ce travail avance par lots parallèles.

**`src/i18n/CLAUDE.md` est la marche à suivre** : dans quel fichier écrire, comment nommer
une clé, comment le traducteur arrive dans un module, ce qui est déjà tranché (vocabulaire,
pluriel, formateurs) et ce qu'il ne faut jamais faire. À lire **avant** de toucher un
littéral de `src/ui/` ou d'ajouter de la prose sous l'interface.

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
