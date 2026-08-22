# Éditeur de configuration XCTrack

**Français** · [English](README.en.md) · [Nederlands](README.nl.md) ·
[Deutsch](README.de.md) · [Español](README.es.md)

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

## À quoi ça ressemble

![L'éditeur ouvert sur la première page paysage de la sauvegarde de test : la page
dessinée à sa taille réelle, la règle graduée au-dessus, le panneau des gadgets déplié
en bas.](captures/editeur-paysage.png)

*Une page de la sauvegarde de test, dessinée à la géométrie d'un AIR³ 7.2. Rien ne
partage la largeur avec elle : le panneau des gadgets passe en dessous. **Une seule
capture pour les cinq langues** : ce qu'elle montre — la page dessinée, la règle graduée,
la plaque qui la porte — est identique dans toutes.*

<!--
  REFAIRE CETTE CAPTURE — captures/editeur-paysage.png (1500 × 1420)
  Écran ...... l'éditeur entier, mode consultation, panneau des gadgets ouvert.
  Langues .... UN SEUL exemplaire, en français, employé par les cinq README. Le sujet
               est une géométrie, pas un texte : la page, la règle, la plaque. Les
               légendes des cinq README le disent au lecteur, pour qu'il ne bute pas
               dessus.
  Fichier .... tests/fixtures/exports/2026-08-20_backup-00.xcfg
               (fixture anonymisée — JAMAIS une configuration réelle, voir CLAUDE.md).
  État ....... gabarit « AIR³ 7.2 », paysage, première page, aucun gadget sélectionné
               ni survolé, aucun bouton au focus, zoom 200 %, bandeau à sa hauteur
               d'usine.
  Refaire .... npm run dev -- --port 5179, déposer le fichier, ouvrir
               « Page 1 » du bloc PAYSAGE, déplier « Liste des gadgets », pousser le
               curseur de zoom à 200 %, éloigner la souris de la page.
  Cadrage .... viewport de 1500 × 1420 points CSS. L'écran physique ne monte pas si
               haut : passer par l'émulation de viewport des outils de développement
               (Chrome DevTools, Emulation.setDeviceMetricsOverride), pas par un
               redimensionnement de fenêtre, qui plafonne à la hauteur de l'écran.
  Pièges ..... 1. le curseur de zoom porte un FACTEUR (0,4 à 2,5), pas des pourcents :
                  y écrire 200 donne 250 %.
               2. la hauteur du bandeau est mémorisée dans `localStorage` sous
                  `xcfg-editor.dock-height` ; l'effacer puis RECHARGER avant de
                  commencer, sinon on hérite de la hauteur d'une capture précédente.
               3. les libellés de la liste des gadgets manquent parfois sur la première
                  capture prise après un changement de zoom : reprendre la capture,
                  la seconde est bonne. Toujours la relire avant de la garder.
                  (Le défaut ne s'est pas reproduit le 22 août 2026, sur les sept
                  écrans repris ce jour-là ; la consigne reste, il ne coûte rien de
                  relire.)

  RECETTE CORRIGÉE — le cadrage était de 1500 × 1380, et la recette affirmait qu'à cette
  hauteur « le bandeau collé en bas ne recouvre pas la page ». Ce n'est plus vrai depuis
  que la page repose sur la PLAQUE (`.bed` d'`app.css`) : mesuré, la plaque descend
  jusqu'à 1 040 px quand le bandeau commence à 1 030. Dix pixels du bord inférieur de la
  plaque passaient sous le bandeau. 1 420 points laissent 30 px d'air entre les deux.
-->


## Le problème

Configurer ses pages au doigt, sur un écran de sept pouces posé sur les genoux, prend des
heures. XCTrack ne sait ni copier une page, ni la dupliquer pour en changer 10 % — c'est
la demande la plus votée de son tracker depuis 2018. Et rien ne permet de voir à quoi
ressemblera une page avant d'être en l'air.

Des éditeurs externes existent. La première objection qu'un pilote leur oppose, en toutes
lettres sur le forum en juillet 2026, est celle-ci :

> « will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting. »

C'est la bonne question. Ce projet est construit autour de sa réponse.

## La fidélité à l'octet près, et ce qu'elle garantit exactement

**Un fichier ouvert puis réexporté sans modification ressort avec la même empreinte
SHA-256.** Pas « équivalent », pas « fonctionnellement identique » : le même fichier,
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
- **Signaler ce qui cloche** avant que vous ne le découvriez en vol. Sept règles, rangées
  dans les deux blocs de la vue d'ensemble — une seule, les deux cartes routières, monte
  dans le bloc déplié, parce qu'une règle n'y a sa place que si elle est **à la fois grave
  et établie**. Chacune dit ce qu'elle vaut :

  - un gadget qu'aucun appui ne peut atteindre, **recouvert par les gadgets dessinés après
    lui** — l'union de plusieurs, dont aucun ne le couvre seul, compte aussi, et un
    masquant transparent également. **C'est une hypothèse** : ce qui est mesuré, c'est
    qu'aucun clic ne l'atteint en édition ; le routage d'un appui *en vol* n'a jamais été
    observé, et c'est justement ce qui compte pour un bouton. La règle **se tait** quand
    l'avertissement de géométrie a déjà signalé le même montage : un même problème dit
    deux fois vaut moins qu'une ;
  - une page qui ne s'affichera jamais — celle qu'aucun type de navigation n'active,
    la seule dont un essai sur l'AIR³ ait confirmé qu'elle est sautée au défilement ;
  - plusieurs pages d'assistant de thermique dans la même orientation, dont une seule
    reçoit le basculement automatique en spirale. **Laquelle est une supposition** :
    aucun relevé de ce dépôt ne donne le départage, et aucun fichier du corpus n'en
    porte deux, donc rien ne l'a jamais montré ;
  - un gadget **peut-être** trop petit pour être lu à bout de bras — le seuil vient d'une
    norme et s'applique à la taille physique du **gabarit d'écran choisi**, mais le rapport
    entre hauteur du gadget et hauteur du texte reste **une hypothèse assumée**, faute
    d'une campagne de mesure sur l'appareil ;
  - deux cartes routières sur la même page ;
  - un gadget Pro dans un fichier qui ne déclare pas de licence — celui-là est **une
    question, pas un constat** : ce que XCTrack en fait n'a jamais été vérifié sur
    l'appareil, et la règle l'écrit ;
  - et un réglage écrit par une version antérieure de XCTrack.

  **Quatre de ces sept sont des suppositions**, et se présentent comme telles : jamais dans
  le bloc d'alerte, intitulé suffixé « à confirmer sur l'instrument », explication ouverte
  par « ce n'est pas un constat mesuré mais une question ». L'outil **signale, il ne
  corrige jamais tout seul**.

  Ce qui a été **retiré** le 22 août 2026, et pourquoi c'est dit ici : l'outil marquait
  certaines pages « masquée hors vol » d'après leur **classe** (`WPCompetition`,
  `WPThermalAssistant`) et annonçait « au sol, l'appareil n'en montre que 3 sur 5 ».
  Un essai sur un AIR³ 7.2 a montré le contraire — la page d'assistant de thermique
  revient bel et bien dans le défilement au sol, et la seule page sautée est celle
  qu'aucune navigation n'active. La marque et le compte sont partis ; ce qui décide
  vraiment, la clé `navigations`, se lit page par page dans « Gérer les pages ».
- **Éditer** : déplacer, redimensionner, ajouter, supprimer et réordonner des gadgets ;
  régler leurs options ; gérer les pages (insérer, dupliquer, supprimer, réordonner).
  Annuler / rétablir.
- **Régler les réglages généraux** — les 217 préférences qui vivent hors des pages :
  unités, touches, capteurs, son, espaces aériens. Dans l'arborescence des 23 lignes du
  menu de l'instrument. En consultation, **aucun contrôle de formulaire n'est
  construit** ; en édition, 77 des 93 lignes présentées se règlent — case, liste,
  curseur, nombre, texte, couleur —, avec annulation et rétablissement comme le reste.
  Les seize autres, la valeur JSON imbriquée et tout ce que la page ne sait pas nommer
  restent affichés **sans contrôle**, chacun disant pourquoi.
- **Écrire, retirer, rétablir : trois gestes autour de la valeur d'usine**, et ils ne se
  valent pas — ni entre eux, ni selon l'écran où on les fait.

  Ce qu'une clé **absente** signifie n'est pas la même chose des deux côtés, et c'est
  mesuré des deux côtés. Sur un **gadget**, XCTrack complète à la relecture les options
  qu'un fichier ne porte pas : la valeur d'usine s'applique implicitement (constaté sur la
  planche des 75 gadgets). Dans les **réglages généraux**, non : à l'import
  « Remplacer tout », l'appareil garde le réglage qu'il a déjà, et une clé absente du
  fichier n'est pas touchée — mesuré sur l'AIR³, `Display.Theme` retirée d'une sauvegarde
  puis réimportée, avec un témoin de contrôle dans la même manche. Sur un appareil qui n'y
  a jamais touché, la valeur d'usine s'applique nécessairement : c'est une déduction, pas
  une mesure, et les deux autres modes d'import n'ont pas été éprouvés.

  - **« Définir cette valeur »** écrit dans le fichier une valeur d'usine qui n'y est pas.
    Sur les deux écrans : le panneau d'un gadget **comme** les réglages généraux. Sur un
    gadget, cela ne change rien à ce que l'appareil fait aujourd'hui, et met le réglage à
    l'abri d'une mise à jour de XCTrack qui changerait cette valeur d'usine. Sur une
    préférence générale, c'est vrai d'un appareil qui n'a jamais réglé cela — et faux d'un
    appareil déjà réglé, dont l'import remplacera la valeur.
  - **« Retirer du fichier »** fait taire le fichier sur un réglage : une valeur écrite qui vaut
    **déjà** la valeur d'usine disparaît. Réglages généraux seulement, et sur ce seul
    état — faire taire le fichier sur une valeur que vous avez choisie priverait la
    sauvegarde d'un réglage délibéré, ce qu'un bouton discret ne doit pas faire d'un clic.
    Ce n'est **pas** un retour à la valeur d'usine : l'appareil gardera le sien.
  - **« Rétablir la valeur d'usine »** remplace une valeur que vous avez choisie par celle
    qu'un XCTrack neuf applique. Sur les deux écrans également. **C'est le seul des trois
    qui efface un réglage délibéré** — les deux autres ne touchent qu'à des valeurs qui
    valaient déjà l'usine, ou qui n'étaient pas écrites du tout. Il ne se révèle donc pas
    au survol : il prend sa propre ligne sous le réglage, montre les deux valeurs en
    présence *avant* le clic, et dit sur quelle version de XCTrack la valeur d'usine a été
    relevée dès que ce n'est pas celle du fichier. Il **écrit** la valeur d'usine plutôt
    que d'effacer la clé : la ligne passe alors à l'état d'usine, d'où « Retirer du fichier »
    devient offert. Deux clics délibérés, deux effets séparés.

  Aucun bouton là où la valeur d'usine n'est pas relevée, là où XCTrack la calcule au
  démarrage, là où il en publie deux qui se contredisent (`Sensors.ManualQnh` : 1013 et
  1013.25), ni là où le relevé n'en donne qu'une valeur composée
  (`{"theme": …, "terrain": …}`) — écrire une valeur devinée serait pire que ne rien
  proposer.
- **Diagnostiquer l'écart de version** : vous choisissez votre version de XCTrack **par
  son nom** — celui qu'affiche votre appareil, « 1.0.3-beta » — parmi les 46 entrées que
  notre relevé distingue, et l'outil part de celle que le fichier déclare lui-même, déjà
  présélectionnée. Il montre alors ce que le fichier porte que cette version ne lit plus,
  et ce qu'elle attend et qu'il n'a pas. Comme plusieurs versions acceptent souvent
  exactement les mêmes réglages, l'outil **nomme celles que son relevé ne sait pas
  distinguer de la vôtre** : le choix entre deux voisines est sans effet, et il vaut mieux
  le dire que le laisser deviner. Le diagnostic **constate** — huit familles d'écart,
  chacune avec sa conduite à tenir — et distingue soigneusement ce qui est mesuré de ce
  qui ne l'est pas : un réglage retiré par XCTrack, un trou de notre propre relevé, et un
  réglage sur lequel nous sommes aveugles n'appellent pas la même conduite.
- **Enlever les réglages qu'une ancienne version a laissés** — et rien d'autre. XCTrack
  conserve les réglages qu'il ne connaît plus : une sauvegarde de 2026 traîne encore des
  interrupteurs de 2023. C'est le seul endroit où l'outil propose **de lui-même** de
  retirer quelque chose du document, et le tri est volontairement étroit : un réglage
  n'est proposé que lorsqu'un fichier réel l'atteste — l'écran le dit **périmé**. Un trou
  de notre lecture des versions — le réglage existait, c'est notre extraction qui l'a
  manqué — ou un réglage qu'elle n'a jamais vu sont dits **angle mort** et **inconnu**, et
  ne sont **jamais** proposés ; même un réglage périmé dont nous ne savons pas dire depuis
  quand il ne sert plus reste en place, car
  on ne propose pas de supprimer ce qu'on ne saurait pas expliquer. Ne rien enlever ne
  casse rien, enlever à tort casse une configuration de vol : tout le tri est bâti sur ce
  déséquilibre.

  Mesuré sur la sauvegarde de référence du corpus
  (`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, écrite par XCTrack 1.0.3-beta) :
  **9 réglages proposés, sur 4 gadgets, pour 1 059 réglages de gadgets examinés.** Vous
  voyez la liste — chaque réglage avec la dernière version de XCTrack qui le lisait encore
  —, vous décochez ce que vous préférez garder, vous agissez d'un geste explicite, et vous
  pouvez revenir en arrière juste après : remis, le fichier ressort **à l'octet près**. Le
  nettoyage se trouve sous le diagnostic de version, et seulement en mode édition.
- **Dire ce que votre fichier révèle de vous** avant que vous ne le partagiez. Un export
  `backup` porte votre nom, votre voile, vos capteurs appairés, vos fichiers de waypoints
  — jusqu'au nom de la compétition à laquelle vous participez. Au moment d'enregistrer,
  l'outil propose donc **trois issues**, rangées dans l'ordre de ce qui part — descendre
  d'un cran veut toujours dire « donner moins » :

  1. **« Votre configuration, telle qu'elle est »**, restituée à l'octet près ;
  2. **« Tous vos réglages, sans ce qui vous désigne »** — une sauvegarde entière, dont
     les lignes qui vous identifient sont remplacées, retirées, ou conservées et dites
     comme telles. C'est celle qui permet de demander de l'aide sur ses réglages de vario
     sans publier son nom ;
  3. **« Version partageable, sans données personnelles »** — un export `pages`, sans
     aucune préférence.

  Chaque issue porte son inventaire : chaque ligne touchée, son emplacement et sa raison,
  montrés *avant* le téléchargement. Le nom du fichier produit est horodaté et **ne
  reprend rien du nom d'origine**, qui contient souvent un prénom.
- **Ranger plusieurs configurations sous un nom**, dans votre navigateur, et revenir à
  l'une d'elles : une pour la compétition, une pour le vol-bivouac, une pour l'école. Les
  octets rangés sont ceux de votre fichier, vérifiés par empreinte à la relecture. Rien
  n'est envoyé nulle part. Chaque entrée porte une **vignette** — la première page paysage
  que votre appareil affiche vraiment, celle qu'aucune navigation n'active étant sautée
  puisque vous ne la voyez jamais ; à défaut de paysage, le portrait. La « Carte
  d'identité » la reprend en grand sous le titre « Aperçu ». Deux choses en découlent,
  qu'il vaut mieux savoir avant de ranger une configuration réelle : **vos textes y sont
  masqués** — titres personnalisés, texte libre, fiche d'appel deviennent des barres
  grises, le cadre et la place du gadget restant intacts, parce qu'une image échappe à
  l'anonymisation, qui ne travaille que sur le fichier ; et **l'archive de bibliothèque
  n'emporte aucune vignette**, ni l'image ni la ligne qui l'annonce, un import n'en croit
  aucune, l'éditeur les refait ici. Une entrée qui n'en a pas — rangée avant la
  fonctionnalité, revenue d'une archive, illisible — montre une surface calme, sans un mot.
- **Parler votre langue, sur deux axes qui ne se confondent pas.** *Notre* prose —
  l'interface, le manuel, ce README — existe en cinq langues : français, anglais,
  néerlandais, allemand, espagnol. Les noms et descriptions *de XCTrack* sont ceux de
  l'application elle-même, extraits de l'APK — 33 langues pour les gadgets, 34 pour leurs
  options, 35 pour les libellés des réglages généraux —, et ils suivent la langue du
  fichier ouvert ; ce n'est que pour un fichier qui n'en déclare aucune qu'ils prennent
  celle de l'interface. Ces trois chiffres ne sont pas un choix de notre part : c'est ce
  que l'APK porte.
- **S'expliquer sur place** : un manuel d'utilisation en treize chapitres s'ouvre depuis
  l'écran d'accueil et depuis le menu « Fichier », sans quitter la page — **dans les cinq
  langues**, et seule celle qui est affichée est téléchargée. Il est écrit pour un
  pilote, pas pour un informaticien, et s'ouvre sur ce qu'il ne faut surtout pas faire —
  envoyer sa sauvegarde telle quelle.

### En images

*Toutes les captures sont prises sur les fixtures anonymisées de `tests/fixtures/`,
jamais sur une configuration réelle — une carte affichée peut révéler un domicile au
bâtiment près. La recette de chacune est écrite en commentaire juste en dessous, pour
qu'on ose la refaire quand l'écran change.*

*Les six captures qui suivent existent **en cinq exemplaires**, un par langue, parce que
le texte y est le sujet : ce README montre les siennes. Les noms de gadgets et de
réglages qu'on y lit, eux, suivent **la langue du fichier ouvert** quand il en déclare
une — c'est la séparation des deux axes, et elle se voit à l'œil nu sur l'écran des
réglages généraux, dont la fixture déclare le français.*

![Le panneau de réglages du gadget « Espace aérien à proximité », en mode édition :
trois lignes « Rétablir la valeur d'usine » qui montrent les deux valeurs en présence,
et en bas le bloc du réglage que ce gadget n'écrit pas, avec son bouton « Définir cette
valeur ».](captures/panneau-gadget.fr.png)

*Le panneau d'un gadget, et les deux gestes de valeur d'usine qu'il offre : rétablir ce
qu'on a réglé, ou figer ce que le fichier ne dit pas.*

<!--
  REFAIRE CETTE CAPTURE — captures/panneau-gadget.<langue>.png (1400 × 1650 ;
                          1400 × 1750 pour l'allemand)
  Écran ...... l'éditeur en mode édition, panneau de réglages d'un gadget déplié.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es. Le texte est le sujet.
               Ce fichier-ci ne déclare AUCUNE langue (`Display.Language` vide) : les
               noms de XCTrack suivent donc, à défaut, celle de l'interface — le globe
               suffit. Le gadget s'appelle « Espace aérien à proximité », “Airspace
               proximity”, ‘Luchtruim afstand’, „Luftraum-Annäherung“, «Proximidad de
               espacios aéreos», et chaque capture porte le nom de sa langue.
  Fichier .... tests/fixtures/exports/2026-08-20_backup-00.xcfg
  État ....... « Espace aérien à proximité », rang 12 de la 3e page PORTRAIT. Il faut
               tenir dans le même cadre les deux gestes du panneau : trois lignes
               « Rétablir la valeur d'usine » (les deux valeurs en présence lisibles,
               dont « 5000 » d'usine contre « 2500 » dans le fichier) ET le bloc
               « 1 réglage que ce gadget n'écrit pas » avec « Définir cette valeur ».
  Refaire .... npm run dev -- --port 5179, déposer le fichier, ouvrir « Page 3 » du bloc
               PORTRAIT, « Modifier les pages », déplier « Liste des gadgets », choisir
               « Espace aérien à proximité », remonter la page en haut.
  Cadrage .... viewport de 1400 × 1650 points CSS, émulation comme ci-dessus. Le bandeau
               doit faire 590 px de haut pour que le panneau tienne sans défiler : poser
               `localStorage['xcfg-editor.dock-height'] = '530'` puis recharger, ou
               tirer la poignée du bandeau vers le haut.
               ⚠ L'ALLEMAND ne tient pas dans ce cadre : ses phrases sont plus longues,
               le panneau y demande 642 px de bandeau (`dock-height = '580'`) et
               1 750 points de viewport. Sous 1 650, le bouton « Diesen Wert festlegen »
               — celui que la légende promet — reste hors champ. À 1 750, le bandeau
               recouvre juste la phrase de la règle graduée, ce qui évite de la couper
               en deux.

  RECETTE CORRIGÉE — la précédente demandait la boussole de la 1re page PAYSAGE, « la
  seule du corpus qui porte windStyle », ET le bloc des réglages non écrits dans le même
  cadre. C'est impossible : cette boussole-là écrit ses neuf réglages, elle n'a donc
  aucun bloc « ce gadget n'écrit pas » — vérifié gadget par gadget, aucun des 75 gadgets
  des cinq pages PAYSAGE n'en porte. Les deux gestes ne coexistent que sur les pages
  PORTRAIT. « Espace aérien à proximité » est le meilleur compromis : trois lignes
  « Rétablir » et un « Définir », le tout en 487 px de panneau. Si l'on tient à
  `windStyle`, c'est la boussole de cette même page 3 portrait qui le porte — mais dans
  son bloc des réglages non écrits, et avec une seule ligne « Rétablir ».
-->


![L'écran « Intégration Android » des réglages généraux, en mode édition : des lignes
« Retirer du fichier » marquées d'une pastille « valeur d'usine », des lignes « Rétablir la valeur
d'usine » marquées d'une pastille d'ambre « réglé par vous », et deux lignes « Définir
cette valeur » marquées « absente du fichier ».](captures/reglages-generaux.fr.png)

*Les réglages généraux, dans l'arborescence du menu de l'instrument — et les trois
gestes de valeur d'usine réunis sur un même écran. C'est aussi l'écran où les deux axes
de langue se voient le mieux : ce fichier-ci déclare le français, donc les noms de
réglages restent français dans les cinq captures — seule notre prose change.*

<!--
  REFAIRE CETTE CAPTURE — captures/reglages-generaux.<langue>.png (1400 × 1060)

  DETTE PAYÉE le 2026-08-22 : les cinq images montraient des boutons « Retirer », qui
  disent maintenant « Retirer du fichier » — « Remove from the file », « Aus der Datei
  entfernen », « Quitar del archivo », « Uit het bestand verwijderen ». Elles n'avaient pas
  été refaites le jour du renommage, et c'était volontaire : deux autres chantiers avaient
  la feuille de style ouverte, et une capture prise à ce moment-là aurait figé un travail
  à mi-course. Ces chantiers sont clos ; les cinq images ont été reprises sur un arbre
  propre, servi depuis un export figé de HEAD (`git archive`).

  ⚠ LES CINQ IMAGES SONT PÉRIMÉES DEPUIS LE 2026-08-22 : elles montrent le recouvrement
  ci-dessous, que le code ne produit plus. La recette, elle, reste bonne — il n'y a que
  les photographies à reprendre.

  Sur les images, le bouton de retrait passe SOUS la marque d'état. Ce n'était pas
  l'émulation : `.prefs__aside` réservait une largeur écrite de 4,6 rem (73,6 px), taillée
  pour « Retirer », et le renommage ne l'avait pas élargie. Relevé par l'agent qui a pris ces
  images, à 1400, 1600 et 1920 points de large, à l'identique — le débordement ne dépendait
  pas de la fenêtre ; reproduit au navigateur à 1400 points avant correction :
      fr  « Retirer du fichier »          bouton 109,3 px — 24,5 px de recouvrement
      es  « Quitar del archivo »          bouton 114,0 px — 29,2 px
      en  « Remove from the file »        bouton 130,7 px — 45,9 px
      de  « Aus der Datei entfernen »     bouton 146,0 px — 61,3 px
      nl  « Uit het bestand verwijderen » bouton 166,6 px — 81,8 px (« verwijderen » barré
                                                                     par la marque)
  L'emplacement est désormais une colonne de la grille, large de l'intitulé lui-même — un
  fantôme invisible le mesure, dans la langue affichée. APRÈS correction, mesuré de la même
  façon (1400 points, et 700 pour l'autre bout) : 11,2 px de blanc entre le bouton et la
  marque dans les cinq langues — c'est l'écart de colonnes de la grille, il ne dépend donc
  pas de la fenêtre —, un seul bord droit pour les 157 lignes, et la liste garde ses 240 px
  dans les cinq langues.

  Écran ...... la page « Réglages généraux », mode édition.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es.
               ⚠ Cette fixture DÉCLARE le français (`Display.Language: "fr"`). Les noms
               de XCTrack la suivent, quelle que soit la langue de l'interface : le titre
               d'écran reste « Intégration Android » dans les cinq captures, et les
               lignes gardent leurs noms français. Ce n'est pas un défaut, c'est la
               séparation des deux axes — et les quatre README traduits le disent au
               lecteur au lieu de promettre un titre traduit qui n'existe pas.
  Fichier .... tests/fixtures/exports/2025-07-07_backup-00.xcfg
  État ....... écran « Intégration Android » : quatre lignes « Retirer du fichier » (pastille
               « valeur d'usine »), trois lignes « Rétablir la valeur d'usine » (pastille
               d'ambre « réglé par vous », les deux valeurs en présence lisibles, et
               l'avertissement de version puisque ce fichier ne vient pas de la version du
               relevé) et deux lignes « Définir cette valeur » (pastille « absente du
               fichier »). Les trois gestes dans le même cadre.
  Refaire .... npm run dev -- --port 5179, déposer le fichier, bouton « Réglages », puis
               « Modifier les réglages », enfin faire défiler jusqu'à « Intégration
               Android » et caler le haut du bloc à 72 px du haut de la fenêtre — soit
               16 px sous la barre de tête collante, qui mesure 56 px.
  Cadrage .... viewport de 1400 × 1060 points CSS, émulation comme ci-dessus.
               ⚠ L'ALLEMAND NE DÉBORDE PAS SUR CET ÉCRAN, contrairement à deux des sept
               autres : mesuré, le bloc fait 949 px dans les CINQ langues. C'est attendu
               — les noms et les descriptions viennent du fichier, qui déclare le
               français, et seuls les boutons et les marques changent de langue ; aucun
               d'eux ne pousse une ligne sur un rang de plus. Un seul cadre suffit donc
               aux cinq. Ne pas généraliser dans l'autre sens pour autant : c'est cet
               écran-ci qui a été mesuré, pas l'application.

  RECETTE CORRIGÉE — trois points, mesurés sur les fixtures :
  1. Le bouton ne s'appelle plus « Modifier les réglages » depuis la barre du haut : on
     ouvre l'écran par « Réglages », et on bascule ensuite en édition.
  2. Sur 2026-08-20_backup-00.xcfg, aucune ligne des réglages généraux n'offre
     « Définir cette valeur » : les six réglages jamais réglés qu'il porte n'ont pas de
     valeur d'usine inscriptible (les huit Unit.* sont calculés au démarrage, les autres
     ne sont documentés nulle part), et la ligne le dit — « valeur d'usine inconnue ».
     Les trois gestes ne se rencontrent donc sur aucun de ses quatorze écrans. Sur
     2025-07-07_backup-00.xcfg, « Intégration Android » les réunit tous les trois : c'est
     le seul écran de tout le corpus qui le fasse, d'où le changement de fixture.
     L'écran « Affichage » de la recette d'origine reste un bon choix pour montrer
     « Retirer du fichier » et « Rétablir » côte à côte (4 et 5 lignes sur le fichier de 2026).
  3. L'écran se retrouve par son identifiant, pas par son titre — qui ne se traduit pas.
     `[data-screen="preferences_tweaks"]` : c'est lui, « Intégration Android ».
-->


![La modale « Version visée et compatibilité » : la version 1.0.3-beta présélectionnée,
la phrase des versions indistinguables, le bloc « Réglages périmés » et ses neuf lignes,
et la section « Enlever ce qu'une ancienne version a laissé » dépliée sur ses neuf cases
à cocher.](captures/version-et-nettoyage.fr.png)

*Le choix de version, le diagnostic, et le nettoyage qu'il ouvre — neuf réglages, sur
quatre gadgets, chacun avec la dernière version de XCTrack qui le lisait encore.*

<!--
  REFAIRE CETTE CAPTURE — captures/version-et-nettoyage.<langue>.png (1200 × 1720)
  Écran ...... la modale « Version visée et compatibilité », nettoyage déplié.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es.
  Fichier .... tests/fixtures/exports/2026-08-20_backup-00.xcfg
  État ....... version présélectionnée d'après le fichier (1.0.3-beta), la phrase des
               versions indistinguables visible, et la section « Enlever ce qu'une
               ancienne version a laissé » ouverte sur ses 9 réglages / 4 gadgets.
  Refaire .... npm run dev -- --port 5179, déposer le fichier, « Modifier les pages »
               (le nettoyage ne s'offre qu'en édition), menu « Fichier » puis
               « Version et compatibilité… », enfin déplier « Voir ces 9 réglages, et
               décocher ce que vous préférez garder ».
  Cadrage .... viewport de 1200 × 1720 points CSS, émulation comme ci-dessus. La boîte
               ne défile alors dans aucune des cinq langues.
  Variante ... le banc d'essai dédié montre le même module hors de l'éditeur :
                   npm run dev -- --port 5178
                   http://localhost:5178/src/ui/versionDiagnostic.demo.html

  RECETTE CORRIGÉE — trois points :
  1. La recette d'origine passait par le banc d'essai en expliquant que « le nettoyage
     n'y apparaît que parce que la page joue l'hôte ». Ce n'est plus vrai : la modale de
     l'éditeur porte le nettoyage dès qu'on est en mode édition, et c'est elle qu'il vaut
     mieux montrer — le banc finit sur des phrases qui ne parlent qu'à lui (« Ce qu'un
     hôte recevrait »), déroutantes dans un README.
  2. Le cadrage passe de 1 650 à 1 720 points. En français la boîte fait bien 1 452 px et
     tenait ; en ALLEMAND elle en demande 1 497 et défilait, la fin du nettoyage restant
     hors champ. 1 720 points suffisent aux cinq langues (mesuré : fr/en/nl/es 1 456,
     de 1 497).
  3. La marque d'état ne s'écrit plus en capitales : c'est une pastille arrondie qui dit
     « périmé » en bas de casse, sous le titre « Réglages périmés ». Les légendes citaient
     « PÉRIMÉ » ; elles citent maintenant le titre, qui est ce que le lecteur cherchera.
-->


![La boîte « Enregistrer cette configuration » : les trois issues, puis l'inventaire des
cinq textes remplacés — chacun avec sa page, son gadget, l'ancienne valeur barrée, la
nouvelle, et la raison du remplacement.](captures/enregistrer-et-partager.fr.png)

*Au moment d'enregistrer, ce que le fichier révèle et ce qui peut être remplacé —
montré avant le téléchargement, pas après.*

<!--
  REFAIRE CETTE CAPTURE — captures/enregistrer-et-partager.<langue>.png (920 × 2480)
  Écran ...... la boîte d'enregistrement, ses trois issues : « Votre configuration,
               telle qu'elle est », « Tous vos réglages, sans ce qui vous désigne » et
               « Version partageable, sans données personnelles ».
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es.
  Fichier .... tests/fixtures/formes/formes-preservees.xcfg — c'est la fixture qui
               porte un téléphone et une fiche de contact, donc la seule où
               l'inventaire des remplacements a quelque chose à montrer. (Sur
               2026-08-20_backup-00.xcfg, la boîte dit à juste titre n'avoir aucun
               texte à remplacer : c'est un autre état, tout aussi vrai, mais il
               n'illustre pas l'inventaire.)
  État ....... troisième issue cochée, inventaire déplié : chaque remplacement avec son
               emplacement et sa raison, AVANT le téléchargement. Le niveau « Tout ce
               que ce fichier porte de personnel » reste REPLIÉ — déplié, la boîte
               double de hauteur pour dire ce que l'encadré du haut a déjà dit.
  Refaire .... dans l'éditeur lui-même : npm run dev -- --port 5179, déposer le fichier,
               « Enregistrer une copie », puis cocher la troisième issue.
               Le banc d'essai dédié rend la même boîte, mais son habillage de page
               d'essai entre dans le cadre :
                   npm run dev -- --port 5176
                   http://localhost:5176/src/ui/sharingDialog.demo.html
               bouton « formes préservées (téléphone + contact) ».
  Cadrage .... viewport de 920 × 2480 points CSS, émulation comme ci-dessus. La boîte
               est large de 830 px quoi qu'on fasse : 920 points de large lui laissent
               45 px de marge de chaque côté au lieu de 185, et l'image pèse d'autant
               moins. 2 480 de haut : c'est l'allemand qui commande (2 174 px de contenu
               contre 2 080 en français).
  À vérifier . les seuls noms et numéros qui figurent sur cette capture — « Jean
               Exemple », « +32 470 00 00 00 » — sont les valeurs anonymisées écrites
               dans la fixture, et l'écran les montre barrées, remplacées. Aucune donnée
               réelle ne doit apparaître ici : le vérifier à chaque reprise.

  RECETTE CORRIGÉE — deux points :
  1. « Sur cette fixture, la deuxième issue n'est pas proposée » : c'est faux
     aujourd'hui. Les TROIS cartes sont là, sur cette fixture comme sur les deux
     sauvegardes du corpus — vérifié sur les trois. La légende peut donc promettre
     trois issues sans mentir.
  2. Le cadrage de 1 100 × 1 880 datait de la boîte à deux cartes ; il est remesuré
     ci-dessus.
-->

![La boîte « Bibliothèque de configurations » : deux configurations rangées, chacune avec
sa vignette, sa taille, son compte de données personnelles ; sur la première, les textes
du pilote sont remplacés par des barres grises. Au pied, « Effacer toute la
bibliothèque ».](captures/bibliotheque.fr.png)

*La bibliothèque vit dans votre navigateur, et rien n'en sort. Chaque entrée dit ce
qu'elle porte de personnel et ce qui partirait avec les pages ; sa vignette masque vos
textes par des barres grises, parce qu'une image échappe à l'anonymisation. Et
« Effacer toute la bibliothèque » est au pied de la liste, pas caché dans un réglage.*

<!--
  RECETTE — captures/bibliotheque.<langue>.png (1100 × 700)
  Écran ...... la boîte « Bibliothèque de configurations », sur sa liste, deux entrées.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es. Le texte est le sujet — les
               comptes de données personnelles et le geste d'effacement.
  Fichiers ... DEUX fixtures, rangées dans cet ordre pour que la vignette masquée soit
               en tête (la liste montre la dernière rangée en premier) :
                 1. tests/fixtures/exports/2026-08-20_backup-00.xcfg → « Vol-biv Alpes »
                 2. tests/fixtures/formes/formes-preservees.xcfg     → « Comp Annecy »
               La seconde est celle qui porte des textes écrits par le pilote : c'est la
               SEULE dont la vignette montre les barres grises. Sans elle, la capture
               perd son sujet.
  État ....... la liste, pas la carte d'identité. Deux entrées, chacune avec sa vignette,
               ses pastilles (« Sauvegarde », taille, nombre de gadgets) et son compte
               d'ambre — « 8 données personnelles · 5 partent avec les pages » pour la
               première, « 16 données personnelles · 0 part avec les pages » pour la
               seconde. Aucune note : elles seraient du texte français dans les cinq
               captures, et une note fausse dans une image est un mensonge illustré.
               Au pied : le compte, « Empêcher le navigateur d'effacer ma bibliothèque »,
               l'estimation d'espace, et « Effacer toute la bibliothèque ».
  Refaire .... npm run dev -- --port 5179, déposer la 1re fixture, menu « Fichier » puis
               « Bibliothèque… », « Ranger la configuration ouverte », donner le nom,
               « Ranger ». Fermer, déposer la 2e fixture, recommencer. Rouvrir la
               bibliothèque : c'est l'état de la capture.
               Pour les quatre autres langues, la bibliothèque SURVIT au changement de
               langue — elle vit dans l'IndexedDB de l'origine. Il suffit de recharger
               dans la langue voulue et de rouvrir la boîte.
               Pour repartir de zéro : effacer la base `xcfg-editor` de l'IndexedDB.
  Cadrage .... viewport de 1100 × 700 points CSS, émulation comme ci-dessus. La boîte
               fait 1 022 × 572 px (607 en néerlandais) et se centre : 700 points de
               haut la serrent sans la couper dans aucune des cinq langues.
  À vérifier . la vignette de « Comp Annecy » DOIT montrer deux barres grises au-dessus
               du « 1234 m ». Si elle montre un texte lisible, le masquage ne s'est pas
               fait et la capture révélerait ce que la page porte : ne pas la garder.
               Les deux noms d'entrée — « Comp Annecy », « Vol-biv Alpes » — sont écrits
               à la main pour la capture ; aucun nom réel ne doit figurer ici.

  CAPTURE AJOUTÉE — la bibliothèque n'avait jamais eu de capture, alors qu'elle porte
  l'argument de vie privée le plus concret du projet : la seule image du dépôt où l'on
  voie le masquage des textes à l'œuvre, et le seul écran où l'effacement complet soit
  offert d'un bouton.
-->

![Le manuel d'utilisation en pleine page : à gauche le sommaire de ses treize chapitres,
à droite l'avertissement encadré « À lire avant de donner votre fichier à qui que ce
soit », puis le début du chapitre 1.](captures/manuel.fr.png)

*Le manuel occupe une page de la largeur de l'éditeur. Il commence par l'avertissement
plutôt que par la visite guidée, et son sommaire reste à gauche pendant toute la lecture
— avec le chapitre où l'on se trouve marqué d'un filet.*

<!--
  REFAIRE CETTE CAPTURE — captures/manuel.<langue>.png (1200 × 1110)
  Écran ...... la page « Manuel d'utilisation », en haut de son contenu.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es. C'est la capture où le texte
               est le plus manifestement le sujet — c'est un mur de prose. Seule la
               langue affichée est téléchargée : la capture d'une langue exige donc que
               le globe soit sur elle avant d'ouvrir le manuel.
  Fichier .... aucun — c'est l'écran d'accueil, avant tout dépôt de fichier. Rien à
               anonymiser, donc, et rien à révéler.
  État ....... le sommaire des treize chapitres entier dans sa colonne de gauche, avec le
               filet ambre sur le chapitre 1 ; à droite l'encadré « À lire avant de donner
               votre fichier à qui que ce soit » et le début du chapitre 1 ; aucun bouton
               au focus (le contour bleu de « Fermer le manuel » se voit sinon).
               ⚠ 1 200 points de large : sous 1 024, la colonne se replie dans le fil et
               la capture ne montrerait plus le sommaire latéral.
  Refaire .... npm run dev -- --port 5179, puis « Lire le manuel d'utilisation », dans
               l'encadré d'ambre sous les quatre étapes de l'accueil — ou, un fichier
               ouvert, menu « Fichier » puis « Manuel d'utilisation… ».
  Cadrage .... viewport de 1200 × 1110 points CSS : la page coupe alors au milieu du
               chapitre 1, ce qui se lit comme une page qui continue et non comme une
               phrase tranchée.

  CAPTURE AJOUTÉE — le manuel est arrivé après l'écriture des cinq recettes d'origine et
  n'en avait aucune. C'est le premier écran qu'un lecteur du README voudra reconnaître :
  il porte l'avertissement sur le partage, qui est l'argument central du projet.
-->

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
  décide pas à votre place. Le nettoyage des réglages périmés ne fait pas exception :
  rien ne part sans que vous ayez vu la liste et cliqué.
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
- **Une des sept captures n'existe qu'en français.** L'interface, le manuel et ce README
  sont traduits en français, anglais, néerlandais, allemand et espagnol (`src/i18n/`), et
  six des sept captures suivent — chaque README montre les siennes. La septième,
  l'éditeur entier, n'a qu'un exemplaire : son sujet est une page dessinée, une règle
  graduée et la plaque qui la porte, identiques dans les cinq langues. Sa légende le dit.
  Les libellés de XCTrack — noms de gadgets, d'options, de préférences — ne suivent pas le
  choix de langue de l'interface mais **celui du fichier** ; ce n'est qu'à défaut, quand
  le fichier n'en déclare aucune, qu'ils prennent la langue de l'interface. Ce sont deux
  axes distincts, et les confondre ferait lire à un pilote tchèque des noms de gadgets en
  anglais alors que son instrument les lui montre en tchèque. La capture des réglages
  généraux le montre : sa fixture déclare le français, donc ses noms de réglages restent
  français dans les cinq langues.

## Donner votre avis, signaler ce qui cloche

L'outil est écrit pour des pilotes, et il ne s'améliore que par ce qu'ils en disent.
**Les retours passent par les issues GitHub :**

**<https://github.com/frederict/xcfg-editor/issues>**

Tout est utile : un gadget mal dessiné, un réglage que l'éditeur ne montre pas, un mot
obscur, une version de XCTrack absente de la liste, un fichier qui refuse de s'ouvrir —
et, depuis que l'interface existe en cinq langues, **une traduction qui sonne faux ou qui
nomme un bouton autrement que l'écran**. Dire quel appareil, quelle version de XCTrack et
ce que vous attendiez fait gagner beaucoup de temps.

**Écrivez dans votre langue** — français, anglais, néerlandais, allemand ou espagnol.
Inutile de passer à l'anglais pour signaler quelque chose.

⚠️ **N'attachez jamais votre propre `.xcfg`.** Il porte votre nom, vos capteurs, vos
fichiers de waypoints, parfois vos coordonnées — et une issue GitHub est publique. Si un
fichier est indispensable pour comprendre le problème, produisez-en d'abord une version
expurgée avec l'outil lui-même (bouton d'enregistrement), et relisez l'inventaire qu'il
vous montre avant d'envoyer quoi que ce soit. Laquelle choisir dépend de votre question :
**« Version partageable, sans données personnelles »** si elle porte sur vos pages,
**« Tous vos réglages, sans ce qui vous désigne »** si elle porte sur un réglage général
— vario, capteurs, unités.

## Installer et lancer

Il faut Node.js 22 ou plus récent.

```bash
git clone https://github.com/frederict/xcfg-editor.git
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
- **Trois bancs d'essai** montent un écran hors de l'éditeur, sur les fixtures, et c'est
  là que se refont les captures : `src/ui/versionDiagnostic.demo.html` (choix de version,
  diagnostic, nettoyage), `src/ui/sharingDialog.demo.html` (l'enregistrement et sa version
  partageable) et `src/ui/libraryPanel.demo.html` (la bibliothèque). `npm run dev` les
  sert ; `vite build` ne les emporte pas dans `dist/`.
- **Les captures se refont depuis une recette écrite.** Chaque emplacement de capture de
  ce fichier porte, en commentaire HTML juste au-dessus, le fichier de `tests/fixtures/` à
  ouvrir et l'état exact à obtenir. Une capture qu'on ne sait pas refaire vieillit en
  place — et une capture prise sur une configuration réelle peut révéler un domicile au
  bâtiment près.

Ces choix reposent sur des relevés faits sur un AIR³ 7.2 réel : corpus de fichiers
observés sur quatre ans et huit versions de XCTrack, rendu constaté en vol, planche des
75 gadgets capturée page par page. **Ces relevés ne sont pas publiés** — ils contiennent
des configurations de vol et des positions personnelles. Ce qu'ils ont établi est en
revanche présent ici, dans les commentaires du code et dans les données extraites de
l'APK, et les tests le vérifient.

### À propos du corpus de tests

Les fichiers de `tests/fixtures/exports/` sont **dérivés de configurations de vol
réelles**, puis anonymisés : nom du pilote, voile, coordonnées GPS, points de virage et
noms de fichiers de waypoints ont été remplacés par des valeurs d'exemple. Le `layout` est
conservé à l'octet près — c'est ce qui donne au corpus ses 105 gadgets, ses 41 classes et
sa géométrie réelle, qu'aucun fichier écrit à la main n'égalerait.

`tests/fixtures/deriver-exemples.py` dit ligne par ligne ce qui a été remplacé et ce qui
ne l'a pas été. `tests/fixtures/anonymat.test.ts` le contrôle à chaque exécution de la
suite.

⚠️ **Si vous contribuez, ne versionnez jamais un `.xcfg` exporté de votre propre
instrument.** Même un export `pages` peut porter du texte que vous avez écrit : le titre
personnalisé d'un gadget, le contenu d'un `WFreeText`, et jusqu'au nom et au numéro de
téléphone rangés dans un bouton d'appel. Le format d'export ne garantit rien à lui seul.

### Régénérer la base des versions de XCTrack

`src/catalog/widgetVersions/` répond à une question : *pour un couple (widget, clé
d'option), dans quelles versions de XCTrack existe-t-il ?* C'est elle qui alimente le
diagnostic « Version et compatibilité », lequel distingue un réglage devenu caduc d'un
réglage parfaitement valide — et, de là, le **nettoyage** (`src/model/cleanup.ts`), qui
ne retire que ce que la base atteste par un fichier réel.

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
gadgets cartographiques, deux portent `mapWidget_showTerrain` et trois portent
`mapWidget_panningTimeout` — jamais les deux. Les seconds ont été refaits depuis le
remplacement, les premiers traînent un reliquat vieux de deux ans.

Une base qui prendrait toute clé observée pour une clé existante protégerait donc
exactement les reliquats qu'un nettoyage doit ôter ; une base qui prendrait toute clé
non extraite pour une clé retirée supprimerait des réglages valides. D'où des tables
distinctes — ce qui a été *lu*, ce qu'un fichier réel *porte*, et **pourquoi** les deux
diffèrent. Voir l'en-tête de `src/catalog/widgetVersions.ts`.

C'est cette distinction que le nettoyage exploite, et il n'en exploite qu'une part : sur
les huit familles d'écart que le diagnostic sait nommer, **une seule** est proposée à la
suppression — celle qu'un fichier réel atteste. Les sept autres, y compris celles qui
« se défendraient » sur la foi du relevé seul, restent en place. Un test balaie tout le
corpus et tous les paliers pour vérifier qu'aucun trou de relevé ni aucune clé aveugle
n'entre dans un plan de nettoyage, fussent-ils majoritaires.

Ce dépôt ne fournit pas d'outil pour rassembler les APK : chacun apporte les siens.

### Régénérer le catalogue des préférences générales

`src/catalog/preferenceCatalog/` décrit les réglages qui vivent **hors des pages** : les
unités, les touches, le son, les capteurs, les espaces aériens — la section `preferences`
d'un export `backup`. Il alimente la page « Réglages généraux », qui les montre **et les
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
- **la classe de configuration** dans le bytecode, qui donne le type de la valeur, sa
  valeur d'usine, et la **portée** : `PUBLIC` (écrite dans un export), `INTERNAL` (locale à
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

### Une seule source pour « qu'y a-t-il de personnel dans ce fichier ? »

Quatre écrans posent cette question — les réglages généraux, la bibliothèque, la boîte
d'enregistrement, l'avertissement d'export. Ils y répondaient chacun avec sa propre liste
de clés, donc avec quatre chiffres qu'aucun d'eux ne rapprochait. L'inventaire vit
désormais dans **`src/model/personalData.ts`**, et les quatre écrans en sont des vues.

Il distingue quatre choses, parce que ce sont de vraies différences :

- **où ça vit** — dans le `layout`, la donnée **part avec un export « pages »** ; dans les
  `preferences`, elle reste sur l'appareil. ⚠️ Un export « pages » **peut** porter des
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
16 réglages (11 renseignés, 5 vides) et disent qu'ils ne comptent pas les
textes des gadgets ; la bibliothèque annonce « 16 données personnelles · 0 part avec les
pages » ; la boîte d'enregistrement dit n'avoir aucun texte à remplacer **et** rappelle les
16 réglages de préférences en jeu — écartés en bloc par la troisième issue, traités ligne
par ligne par la deuxième.

Les 44 clés surveillées sont extraites du catalogue vers `src/model/personalKeys.json`
(7,3 Ko) par le même script, et non recopiées : `tests/model/personalData.test.ts` vérifie
à chaque exécution que le relevé est la copie exacte du catalogue. C'est ce qui permet aux
trois écrans qui n'ont pas le catalogue sous la main de répondre sans charger ses 96 Ko.

### La dimension « version » des préférences

`src/catalog/preferenceVersions/` est le pendant de `widgetVersions/` : *pour une clé de
préférence, dans quelles versions de XCTrack existe-t-elle ?* Elle se régénère avec les
mêmes relevés, par un troisième outil sans réseau :

```bash
python3 tools/build-preference-database.py --surveys relevés/ --corpus mes-exports/
```

Cinquante-cinq relevés, quarante-sept versions distinctes, **vingt-deux inventaires** —
les paliers —, 278 clés sur toute l'histoire pour 216 au dernier palier. Mêmes trois
tables que du côté des gadgets, et le corpus les remplit dans les deux sens : `Sensors.ExtTypes`, lue jusqu'à
0.9.8.7 et jamais après, traîne encore dans un fichier de 0.9.9.1 — c'est un **reliquat**,
nettoyable ; `Sound.AcousticVario.CustomProfile`, qu'aucun relevé ne voit avant 1.0.0,
figure dans des fichiers de 2023 à 2025 — c'est un **trou du relevé**, à ne jamais
supprimer.

⚠️ **La portée ne définit pas un palier, et c'est mesuré, pas décrété.** Huit versions
(0.9.9.1-beta à 0.9.10.3) n'ont pas su livrer leur énumération de portée et rendent alors
*tout* en `PUBLIC` — 212 clés sur 212 pour 0.9.10-beta, contre 142 à 158 chez leurs
voisines. En faire une signature de palier aurait fabriqué deux ruptures massives qui
n'ont jamais eu lieu. Ces versions portent `scopeRead: false`, et rien en aval n'a le
droit de croire leur portée.

### Les domaines que les écrans ne portent pas

Deux familles de réglages n'ont **aucune** liste de valeurs dans les écrans XML, et
laissent donc l'éditeur en saisie libre. `tools/build-preference-domains.py` relève ce
qui est lisible, et **seulement** ce qui l'est :

```bash
python3 tools/build-preference-domains.py --surveys relevés/ \
    --android-jar ~/Library/Android/sdk/platforms/android-36/android.jar
```

- **Les huit `Unit.*`** : XCTrack remplit ces listes en code, et les 55 relevés le
  confirment — aucune version, dans aucune langue, ne les déclare en ressources. Sont
  publiés le **vocabulaire** des dix-huit codes d'unité (`m`, `km/h`, `FL`, `100ft/min`…),
  lu dans l'énumération d'unités du bytecode, les valeurs vues dans des fichiers réels, et
  — depuis qu'il existe — le **domaine de chaque clé, relevé à la main sur l'appareil** :
  l'écran natif des unités a été déplié liste par liste, chaque choix vérifié par un
  export. `Unit.Distance` en propose quatre (`m,km`, `mi`, `yd,mi`, `nm`), `Unit.Altitude`
  deux (`m`, `ft`). Deux réserves voyagent avec ce relevé et aucun écran n'a le droit de
  les gommer : il ne vient que d'**un modèle et d'une version** (AIR³ 7.2, 1.0.3-beta), ce
  que `units.domainSource` dit et que la page répète au pilote ; et **ce que le fichier
  porte n'est pas ce que l'écran affiche** — l'appareil montre « m, km » et écrit `m,km`.
  Fermer la liste reste donc légitime, à condition de laisser la porte ouverte à une
  valeur du fichier qui n'y serait pas.
- **Les quinze `Keys.*`** portent un code de touche Android nu. La table `KEYCODE_*` est
  lue dans l'`android.jar` du SDK installé — 338 constantes, sans JDK ni réseau, en
  analysant le fichier de classe — et le niveau d'API est consigné : un code plus récent
  que la table rend `null`, jamais un nom inventé. « 266 » devient donc
  `KEYCODE_STEM_2`.

⚠️ Le bit `0x01000000` que portent quatre valeurs du corpus vaut **appui long**. Ce fut
longtemps une déduction, et le README l'a écrit comme telle ; l'écran natif de réglage des
touches la confirme désormais en toutes lettres — la ligne portant `16777240`
(= 24 | 0x1000000) y affiche l'appui long suivi du nom de la touche. Le fichier déclare
donc `longPressBitBasis: "measured"`, et range à côté ce qui l'établit : cette ligne
relevée à l'écran, les quatre valeurs du corpus qui rendent un code Android valide une
fois le bit ôté, le fait que ces quatre codes soient exactement ceux que d'autres liaisons
du même fichier portent sans le bit, et les textes de XCTrack qui disent « Long press: ».
La dernière pièce consignée est celle qui **manque** : le relevé ne vient que d'un
appareil et d'une version, et ce que le bit vaudrait sur une touche que cet appareil ne
porte pas n'est pas vérifié.

**L'écran des réglages s'en sert.** Les huit `Unit.*` y reçoivent leur liste relevée à la
place du champ libre où le pilote pouvait écrire une valeur que son instrument refuserait,
avec la mention de l'appareil, de la version et de la méthode d'où elle vient ; les quinze
`Keys.*` cessent d'afficher l'entier du fichier et le séparent en deux — la touche d'un
côté, avec son nom Android quand la table le donne, l'appui long de l'autre. Quand le
`.xcfg` déclare un appareil qu'un relevé couvre, la page dit aussi quelles touches
physiques ce modèle-là porte — trois sur l'AIR³ 7.2 — sans jamais écrire qu'une touche
n'existe pas : le parc n'est pas homogène et le relevé ne couvre qu'un boîtier.

Le diagnostic « Version et compatibilité », lui, ne consulte toujours ni l'une ni l'autre
de ces deux bases.

### Les cinq noms de navigation — le seul catalogue sans script

`src/catalog/navigationLabels.json` porte les noms que XCTrack donne aux cinq navigations
d'une page (`TaskBackToTakeoff`, `TaskTriangleClosing`, `TaskToWaypoint`,
`TaskCompetition`, `TaskToLivePilot`), dans les 34 locales de l'APK. C'est ce que la ligne
« Affichée pour : … » de chaque vignette du carrousel affiche.

Deux réserves, qui se disent plutôt que de se deviner :

- **l'appariement classe ↔ clé de ressource est déduit, pas relevé.** Les textes viennent
  des clés `navTakeoff`, `navTriangleClosing`, `navWaypoint2`, `navCompetition` et
  `navLivePilot` ; le lien avec le nom de classe écrit dans le fichier ne se lit nulle
  part, le bytecode étant obfusqué. Il repose sur la correspondance des noms et sur le
  fait que la boîte de visibilité n'en propose que cinq ;
- **aucun script ne régénère ce fichier.** Les autres catalogues du dossier se refont
  depuis un APK décompressé (`tools/extract-*.py`) ; celui-ci a été transcrit à la main
  depuis le relevé complet de la version 1.0.3-beta5, avec la même règle que
  `extract-widget-labels.py` — la locale par défaut de l'APK devient `en`. C'est une dette,
  et elle est écrite ici pour qu'elle se voie.

`navLivePilot` n'est traduit que dans **17 des 34 locales** — le néerlandais n'en fait pas
partie. XCTrack sert alors sa locale par défaut, et cet outil fait pareil : un pilote
néerlandais lit « Live pilot » des deux côtés. Rien n'est traduit maison pour combler le
trou ; `hasNavigationLabel()` permet de savoir que le repli a joué.

## Licence

MIT — voir [LICENSE](LICENSE).

XCTrack est une application de [XContest](https://xcontest.org/). Ce projet n'est ni
affilié à XContest, ni à Air3, ni approuvé par eux.
