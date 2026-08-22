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

  DETTE PAYÉE le 2026-08-22, en fin de journée. L'image portait deux péremptions, toutes
  deux visibles maintenant :
  1. la plaque de faits sous le titre s'ouvrait sur le nom de classe du fichier
     (« WPEmpty », première pastille). Elle s'ouvre désormais sur « 14 gadgets », et le
     nom de classe la FERME, à la voix basse du gabarit d'écran ;
  2. « ← Vue d'ensemble », « Zoom 100 % » et « Masquer la liste » étaient trois mots sans
     contour ; les commandes discrètes ont repris le filet plein de `.btn`.
  Le cadrage n'a pas bougé, et l'air entre la plaque et le bandeau a été REMESURÉ sur
  l'image reprise : plaque jusqu'à 1 039,4 px, bandeau à partir de 1 069,9 — 30 px, comme
  la dernière ligne de cette recette l'annonce.

  DETTE PAYÉE, tard le 2026-08-22, dans la reprise en bloc. Ce qui avait bougé : la
  pastille du nom de classe (« WPEmpty », qui ferme la plaque de faits) porte un FILET
  POINTILLÉ sous le mot, et le curseur d'aide. C'est le troisième filet de la famille —
  plein pour ce qui se clique, tireté pour les pastilles inertes, pointillé pour ce qui
  cache une bulle. Voir `.glossed` dans `src/ui/app.css`. Vérifié sur l'image reprise :
  `text-decoration: underline 1px dotted`, `cursor: help`, pastille à 199 px du haut.

  ET UNE SECONDE PÉREMPTION, QU'AUCUNE LIGNE N'AVAIT SIGNALÉE, trouvée en comparant la
  reprise à l'ancienne image : le NOM DE FICHIER de la barre de tête se coupe désormais en
  TROIS et non en deux. Sur cette fixture, « 2026-08-…_backup-00.xcfg » est devenu
  « 2026-08… _backup-00.xcfg ». Le rang et l'extension ne cèdent plus jamais — voir
  `src/ui/fileNameParts.ts`. La barre de tête entre dans SIX des sept cadres : toute
  capture qui la montre était périmée par ce seul changement, et deux recettes ne le
  disaient que pour elles-mêmes. Diff mesuré entre l'ancienne et la neuve : 202 pixels
  seulement, dans deux zones — l'en-tête (y 20-35) et la pastille (y 210-218).

  VÉRIFIÉE ET GARDÉE le 2026-08-22, au soir, sur un point précis. La phrase du cadrage —
  celle qui dit que la page entière ne tient pas ici — porte désormais un bouton qui pose
  le cran de zoom qu'elle annonce (« Zoom 100 % » quand ce cran vaut 100 %), et sa
  formulation change dans ce cas-là. Elle n'entre pas dans cette image : elle ne se remesure
  qu'à la sélection d'un gadget, et l'état de cette recette n'en sélectionne aucun. Vérifié
  sur le fichier lui-même — le corps du bandeau s'ouvre directement sur
  « Gadgets de la page ».

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

- **Ouvrir** un `.xcfg` ou un `.xczfg` (l'archive ZIP que XCTrack écrit quand on exporte
  « avec les médias »). L'archive ne contient pas toujours de fichier annexe : le bandeau
  dit ce que la vôtre contient, et combien elle en porte.
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

  Ce qui a été **ajouté** le 22 août 2026, pour la même raison : le constat descend sur la
  **page ouverte**. Un pilote d'essai avait posé un gadget sur une page morte sans que
  rien ne l'en prévienne — le diagnostic vivait dans une liste repliée de la vue
  d'ensemble et dans une fenêtre annexe, jamais sur l'écran où l'on travaille. Un bandeau
  discret y dit maintenant **pourquoi cette page-ci** ne s'affichera pas, et il en
  distingue trois raisons, parce qu'elles ne se réparent pas de la même façon :

  - la page porte le réglage **« Désactivé »** de XCTrack — c'est le cas mesuré, celui que le
    défilement saute ;
  - sa **liste de navigations est vide** — même conséquence, autre écriture, jamais
    observée sur l'appareil, et l'outil le dit ;
  - les **réglages généraux tiennent l'écran** dans l'autre orientation
    (`Display.Orientation`) : toutes les pages de cette orientation sont hors d'atteinte,
    quelles que soient leurs navigations.

  Les deux premières se réparent ici : « Activer pour toutes les navigations » écrit la
  valeur que XCTrack écrit lui-même quand les cinq navigations sont actives, sur la page
  ouverte comme dans « Gérer les pages », avec annulation. **Choisir lesquelles** reste
  l'affaire de l'instrument : sa boîte à cinq icônes n'est pas reproduite, et écrire une
  liste qu'on ne saurait pas composer serait pire que de ne rien offrir. La troisième ne
  se répare pas sur la page — c'est un réglage de tout l'instrument —, et l'éditeur se
  contente d'indiquer où il vit.
- **Éditer** : déplacer, redimensionner, ajouter, supprimer et réordonner des gadgets ;
  régler leurs options ; gérer les pages (insérer, dupliquer, supprimer, réordonner,
  rouvrir une page qu'aucune navigation n'active). Annuler / rétablir. **Aucun de ces
  gestes ne demande de confirmation** : ce qu'« Annuler » reprend part au premier clic, et
  l'outil écrit aussitôt ce qu'il a fait et par où revenir — y compris le nombre de gadgets
  qu'une page supprimée emporte. Ce qui demande **avant**, dans un panneau qui chiffre, ce
  sont les trois gestes que rien ne reprend : retirer une configuration rangée, vider la
  bibliothèque, ouvrir un fichier par-dessus un travail non enregistré. Une confirmation de
  plus sur ce qui se défait userait l'attention qu'il faut garder pour ce qui ne se défait
  pas.
  Le remède est **atteignable depuis là où on lit qu'il existe** : « Gérer les pages »
  s'ouvre en modale, où la barre du haut est inerte et Ctrl+Z coupé — la coupure protège la
  boîte de partage, bâtie une fois sur un instantané que rien ne resynchronise —, l'annonce
  y porte donc son propre « Annuler ce geste », au-dessus du carrousel. Et cette mémoire
  **meurt avec l'onglet** : le navigateur vous retient au départ tant que le travail n'est
  pas enregistré, avec son propre texte, et cesse de le faire dès que le fichier entier
  l'est.
- **Relire ce que vous avez changé**, à tout moment et une dernière fois avant
  d'enregistrer. « Annuler » nomme le **dernier** geste, un par un ; une demi-heure de
  travail ne se relit pas comme ça. « Ce que vous avez changé », dans le menu Fichier,
  nomme **l'écart** : les pages ajoutées, retirées, déplacées ou modifiées, les gadgets qui
  ont bougé, changé de taille ou de réglage, et les lignes de réglages généraux qui ne
  disent plus la même chose. La **même** liste, repliée, ouvre la boîte d'enregistrement —
  un seul calcul pour les deux écrans, parce que deux comptes qui se contrediraient
  vaudraient moins que pas de compte du tout.

  ⚠️ **Ce n'est pas la liste de vos gestes, et c'est voulu.** Un gadget déplacé dix fois
  qui revient à sa place n'y figure pas ; un rang qui a seulement glissé parce qu'on a
  retiré la page du dessus n'est pas compté comme un déplacement ; les gadgets d'une page
  ajoutée ou retirée ne sont pas comptés en plus de leur page. Le relevé compare **deux
  états** — le document que le fichier a livré, et celui que vous avez sous les yeux —, et
  quand ils sont les mêmes il le dit. C'est aussi la réponse à la question qu'un pilote
  d'essai a posée en toutes lettres : « l'outil a-t-il modifié quelque chose que je ne lui
  ai pas demandé ? ».

  Un réglage général y est nommé par sa **ligne du fichier**, `Pilot.Name`, jamais par sa
  valeur : ce relevé s'affiche sur votre écran et peut nommer ce que vous avez écrit, il
  n'a aucune raison d'en montrer le contenu. Le titre en clair est dans « Réglages ».
  Et il dit ce que **votre document** a changé, pas ce que le fichier produit emportera :
  ça, c'est l'affaire des trois issues d'enregistrement, et chacune le dit sous son
  intitulé.
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
  ne relit une page que lorsqu'il l'affiche : une sauvegarde de 2026 traîne encore des
  interrupteurs de 2023, sur des pages jamais montrées. C'est le seul endroit où l'outil propose **de lui-même** de
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
  **4 réglages proposés et 5 laissés en place, sur 4 gadgets, pour 1 059 réglages de
  gadgets examinés.** Vous voyez la liste — chaque réglage avec la dernière version de
  XCTrack qui l'écrivait encore, et ce que l'appareil en a relu avec lui et sans lui —, vous décochez ce que vous préférez garder, vous agissez d'un geste explicite, et vous
  pouvez revenir en arrière juste après : remis, le fichier ressort **à l'octet près**. Le
  nettoyage se trouve sous le diagnostic de version, et seulement en mode édition.

  ⚠️ **Une troisième serrure, et c'est la plus récente.** *Périmé* veut dire *remplacé
  depuis*, jamais *sans effet* : XCTrack ne relit une page que lorsqu'il l'affiche, et
  quand il la lit enfin, il ne jette pas ces réglages — il en tire d'abord ses réglages
  d'aujourd'hui (`showWind` devient `windStyle`, `mapWidget_showTerrain` devient l'ombrage
  du relief) puis les efface. Un fichier qui les porte encore est donc, par construction,
  un fichier que l'instrument **n'a pas encore lu** : c'est exactement là que le nettoyage
  mord. Mesuré sur un AIR³ 7.2 le 22 août 2026 — trois compas ne différant que par
  `showWind` : enlever ce réglage à *oui* fait passer le gadget de la flèche de vent à
  rien du tout. Un retrait n'est donc proposé que lorsqu'un aller-retour sur l'appareil a
  montré que l'instrument en tire **la même chose** avec et sans
  (`src/catalog/legacyMigrations.json`, un relevé daté et borné). Les autres sont nommés et laissés
  en place, chacun avec sa raison **écrite en français dans le panneau où l'on décide** —
  « la flèche de vent disparaîtrait de ce compas » — et la mesure juste dessous, dans les
  mots que l'appareil a écrits. Le pilote n'a rien à en faire : ils partiront d'eux-mêmes.

  ⚠️ **Et « sans le réglage » n'est pas « sans rien » : le voisinage compte.** Le même
  22 août au soir, une planche de dix cartes portée sur l'appareil a montré que
  `mapWidget_showOpenStreet` et `mapWidget_showTerrain` **ne sont lus qu'ensemble** — posé
  seul, ni l'un ni l'autre ne fait quoi que ce soit. Retirer le premier d'une carte qui
  porte les deux rompt le couple et **éteint l'ombrage du relief** que le second allume.
  L'outil le proposait ; il ne le propose plus. Chaque mesure du relevé porte donc
  désormais le voisinage dans lequel elle a été prise, réglage par réglage, y compris
  l'exigence qu'un voisin soit **absent** — hors de ce voisinage, il n'y a pas de verdict.
  C'est aussi ce qui permet de dire que `nav_use_brackets` réglé sur *non* est sans effet
  sur un assistant de thermique, qui ne le lit pas, et vivant sur une carte, qui en tire
  l'affichage de la distance.
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

     **Les deux versions partageables remettent aussi à zéro l'heure de l'export.**
     XCTrack inscrit dans chaque fichier le moment exact où vous l'avez créé, *avec votre
     fuseau horaire* — « 2026-08-20 08:16:35+0100 » : le fuseau dit grossièrement où vous
     étiez, et l'heure à la seconde près se recoupe avec une trace de vol publiée le même
     jour. Votre fichier à vous, celui de l'issue 1, garde la sienne intacte ;
  3. **« Version partageable, sans données personnelles »** — un export `pages`, sans
     aucune préférence. C'est aussi celle qui permet de **n'envoyer qu'une page** : sous
     « Quelles pages partent », chaque page porte une case, toutes cochées au départ.
     Décochez celles qui restent chez vous. Le fichier reste un export `pages` expurgé de
     la même façon — un seul chemin, donc une seule garantie à tenir, et pas une quatrième
     issue à lire dans le menu.

     ⚠ **Dites à votre destinataire quelle option choisir à l'import.** Mesuré sur un
     AIR³ 7.2 les 21 et 22 août 2026 : « Ajouter des pages uniquement » pose vos pages
     à la suite des siennes sans en toucher aucune, tandis que
     « Remplacer les pages uniquement » remplace **toutes** les siennes, dans les deux
     orientations. Ses réglages, eux, sont hors d'atteinte : devant un export `pages`
     l'instrument grise « Remplacer tout ». *Non mesuré :* aucun fichier réduit à une
     partie de ses pages n'a jamais été importé sur un instrument.

  Chaque issue porte son inventaire : chaque ligne touchée, son emplacement et sa raison,
  montrés *avant* le téléchargement. Le nom du fichier produit est horodaté et **ne
  reprend rien du nom d'origine**, qui contient souvent un prénom.

  Là où le navigateur le permet — Chrome, Edge, Opera —, c'est vous qui désignez où le
  fichier se pose, et l'outil dit ensuite que l'écriture a été **confirmée**. Partout
  ailleurs — Firefox, Safari, tous les navigateurs de téléphone —, il retombe sur un
  téléchargement ordinaire, dont cette page ne voit rien : elle dit alors ce qu'elle a
  *demandé* au navigateur, et où aller le vérifier. Et si vous refermez la boîte du système
  sans rien enregistrer, elle dit *annulé*, jamais *échoué*.
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
  que l'APK porte. Le dessin d'une page suit le même partage : tout ce que l'instrument y
  peint garde la langue du fichier, et les deux seules étiquettes que l'éditeur ajoute —
  l'action d'un bouton, la bande réservée aux messages, visibles au survol — suivent la
  vôtre.
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
                          1400 × 1730 pour l'allemand)
  VÉRIFIÉE À L'ÉCRAN le 2026-08-22, sur DEUX points que le cinquième essai en vol classait
  « mineurs, non revérifiés », et dont AUCUN n'est un défaut de l'image :
  1. « Rotate direction arrow by » reste EN ANGLAIS dans la version néerlandaise. Ce n'est
     ni un trou de notre catalogue ni un défaut de l'éditeur : la ressource
     `widgetSettingsGlassAirspaceArrow` n'est traduite que dans 17 des 34 locales de l'APK,
     et le néerlandais n'en fait pas partie (mesuré sur les 55 relevés). XCTrack sert alors
     sa locale par défaut, et cet outil fait pareil — le pilote néerlandais lit le même mot
     anglais sur son instrument. Ne PAS « corriger » l'image.
  2. UNE CASE À COCHER CHANGE DE COLONNE d'une langue à l'autre — « Montrer les limites
     verticales recalculées avec l'altitude GPS » est en tête de la colonne DROITE en
     français, en pied de la colonne GAUCHE en néerlandais. C'est le flux d'une mise en
     colonnes CSS : `.dock .props__list` est un bloc `column-width: 22rem` (mesuré au
     navigateur : 352 px, gouttière 32 px, deux colonnes à 971 px), et le point de coupure
     suit la HAUTEUR du contenu. L'ordre des réglages ne bouge pas, la coupure oui. Voir le
     commentaire de `.dock .props__list` dans `src/ui/app.css`.
  ⚠ PÉREMPTION SIGNALÉE À TORT le 2026-08-22 au soir, ET DÉMENTIE À LA REPRISE. Elle
  disait : « le NOM DE CLASSE en tête du panneau (« WSpeed ») porte désormais un filet
  pointillé ». Ce filet existe bien — `.props__class` est `.glossed` — mais
  `.props__class` N'EST PAS RENDU DANS CE CADRE : `app.css` porte
  `.dock .props__head { display: none }`, et le bandeau affiche à la place `.dock__class`,
  qui n'a ni gloss ni curseur d'aide. Mesuré sur la page : `.props__class` rend un
  rectangle de 0 × 0, `.dock__class` rend « WAirspaceProximity » avec
  `text-decoration: none`. Le diff des cinq images le confirme : rien ne bouge à la hauteur
  du bandeau. Cette bulle ne s'annonce donc QUE HORS DU BANDEAU — c'est un vrai écart
  d'interface, mais il ne se voit sur aucune des sept captures, et aucune reprise d'image
  ne le répare.

  DETTE PAYÉE, tard le 2026-08-22, POUR TROIS AUTRES RAISONS :
  1. la pastille « Édition » en tête de la barre d'édition portait un FILET PLEIN et porte
     un filet TIRETÉ — c'est un état, pas un interrupteur. L'ambre avait été jugée
     suffisante pour la distinguer des deux boutons de la même barre ; la mesure l'a
     démentie, le même aplat `rgb(247, 234, 205)` habille la ligne de gadget sélectionnée
     de la liste — visible dans cette image même, au rang 12 — et celle-là répond au clic.
     Vérifié sur les reprises : `1px dashed rgb(207, 156, 44)`. Voir `.editbar__badge` ;
  2. la pastille du NOM DE CLASSE DE LA PAGE (« WPThermalAssistant », qui ferme la plaque
     de faits) a pris le filet pointillé et le curseur d'aide — c'est CELLE-LÀ que la
     péremption démentie ci-dessus visait sans la nommer ;
  3. le nom de fichier de la barre de tête se coupe en trois (voir la recette
     d'`editeur-paysage`).
  Le cadrage ne bouge pas : aucune des trois n'a de largeur. Diff mesuré, les cinq
  langues : 375 à 458 pixels, dans trois bandes seulement — y 20-35, y 210-245, y 310-325.

  VÉRIFIÉE ET GARDÉE le 2026-08-22, au soir, pour la même raison, et celle-ci demandait
  d'aller regarder : un gadget EST sélectionné ici, la phrase du cadrage pourrait donc
  paraître. Elle ne paraît pas — vérifié sur `captures/panneau-gadget.fr.png` lui-même, où
  le corps du bandeau s'ouvre directement sur « Gadgets de la page ». Le cadre de
  1 650 points laisse la plaque tenir dans la bande, et cette phrase suit la géométrie, pas
  les clics.

  Écran ...... l'éditeur en mode édition, panneau de réglages d'un gadget déplié.

  DETTE PAYÉE le 2026-08-22, en fin de journée. Les cinq images portaient quatre
  péremptions, toutes visibles maintenant :
  1. les marques d'origine du panneau (`.props__origin`) portaient le filet PLEIN des
     boutons voisins sans se cliquer, et portent un filet TIRETÉ ;
  2. la plaque de faits de la page commençait par le nom de classe
     (« WPThermalAssistant »), qui la ferme maintenant, en sourdine, après le gabarit ;
  3. le bloc « 1 réglage que ce gadget n'écrit pas » disait « … XCTrack 1.0.3-beta
     (versionCode 100030) » ; la parenthèse est partie, la phrase s'arrête au nom ;
  4. « Masquer la liste » n'avait aucun filet ; les commandes discrètes ont repris celui
     de `.btn`.
  ET UN CINQUIÈME CHANGEMENT, qu'aucune de ces quatre lignes n'annonçait : la 3e page
  PORTRAIT est INATTEIGNABLE sur cette fixture (`Display.Orientation: LANDSCAPE`), et
  elle porte depuis le 2026-08-22 un bandeau d'ambre de deux paragraphes qui le dit, sous
  la plaque de faits. Il entre dans le cadre et pousse la page dessinée vers le bas ; le
  bandeau de réglages, lui, est collé au bas de la fenêtre et ne bouge pas d'un pixel —
  c'est pourquoi le cadre des quatre autres langues n'a pas eu à changer.

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
               et le panneau y demande 642 px de bandeau (`dock-height = '580'`). Mesuré
               le 2026-08-22 à 1 650 avec un bandeau de 592 px : le panneau réclame
               553 px pour 508 disponibles, et « Diesen Wert festlegen » — le bouton que
               la légende promet — tombe à 1 667,9, hors champ. Avec 642 px de bandeau
               il tient tout juste : 558 px pour 558.

               CADRAGE ALLEMAND CORRIGÉ le 2026-08-22 : 1 750 → 1 730 points. Le
               bandeau d'ambre de la page inatteignable (voir plus haut) a poussé la barre
               d'actions du gadget sélectionné vers le bas. À 1 750, le haut du bandeau
               de réglages tombe à 1 107,9 alors que cette barre commence à 1 095,5 :
               huit pixels de boutons coupés en travers, un artefact que les quatre autres
               langues n'ont pas. À 1 730, le bandeau commence à 1 087,9 et la couvre
               entière, comme ailleurs ; le panneau tient toujours (558 pour 558,
               « Diesen Wert festlegen » à 1 668,8 sur 1 730).

  ⚠ NE PAS RACCOURCIR LE CADRE (2026-08-22). Le bandeau porte désormais, en tête de son
  corps, une phrase qui paraît quand la page entière ne tient plus entre la barre de tête
  et lui — elle dit ce que coûtent le repli et le zoom. À 1 650 points de viewport et
  590 px de bandeau, la bande laissée à la plaque vaut environ 1 000 px pour une plaque
  portrait de 617,7 : la phrase reste cachée et cette capture est intacte. Elle
  apparaîtrait sous ~1 090 points de viewport, et changerait alors la hauteur du panneau
  visible. Vérifié : les sept écrans du dépôt sont tous cadrés bien au-dessus de ce seuil,
  AUCUNE capture n'est périmée par ce changement. RE-VÉRIFIÉ sur les cinq reprises du
  2026-08-22 : `.dock__cramped` est resté `display: none` dans les cinq langues,
  l'allemand à 1 730 compris.

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
  REFAIRE CETTE CAPTURE — captures/reglages-generaux.<langue>.png
  (1400 × 1120 — NÉERLANDAIS : 1400 × 1175, exception mesurée, voir « Cadrage »)

  DETTE PAYÉE le 2026-08-22 : les cinq images montraient des boutons « Retirer », qui
  disent maintenant « Retirer du fichier » — « Remove from the file », « Aus der Datei
  entfernen », « Quitar del archivo », « Uit het bestand verwijderen ». Elles n'avaient pas
  été refaites le jour du renommage, et c'était volontaire : deux autres chantiers avaient
  la feuille de style ouverte, et une capture prise à ce moment-là aurait figé un travail
  à mi-course. Ces chantiers sont clos ; les cinq images ont été reprises sur un arbre
  propre, servi depuis un export figé de HEAD (`git archive`).

  VÉRIFIÉE ET GARDÉE le 2026-08-22, au soir : l'écran des touches a gagné deux phrases —
  d'où vient le nom d'une touche pressée et où elle se trouve sur le boîtier, et le bouton
  qui ne produit rien. Elles ne peuvent PAS entrer dans ce cadre : il montre l'écran
  « Intégration Android », et ces phrases-là ne s'écrivent que sous un bloc portant des
  liaisons de touche. Aucun intitulé, aucune hauteur, aucune couleur ne bouge ici.

  DETTE PAYÉE le 2026-08-22, en fin de journée, POUR TROIS AUTRES RAISONS ENCORE. Les
  images reprises à midi montraient un écran que le code ne produit plus :

  1. « Retirer du fichier » n'avait aucun filet — ni au repos ni au survol — pendant que la
     marque inerte « valeur d'usine », juste à côté, en portait un tireté et visible. Deux
     pilotes d'essai ont lu la marque comme la commande, et le second l'a mesuré : bouton
     `rgba(0, 0, 0, 0)` à 11,5 px, marque `rgb(207, 156, 44)` à 12 px. Le bouton a repris
     le filet plein de `.btn`.

  2. LES MARQUES ONT CHANGÉ DE TRAIT. « valeur d'usine », « absente du fichier »,
     « réglé par vous » et la marque de donnée personnelle portaient le filet PLEIN des
     deux boutons voisins sans se cliquer, et un pilote d'essai a cliqué dessus pour rien.
     Elles portent un filet TIRETÉ ; les boutons gardent le plein. La pastille reste la
     même forme : c'est le trait qui distingue, pas l'arrondi. VÉRIFIÉ sur les reprises,
     ligne par ligne : `dashed 1px rgb(221, 214, 200)` pour « valeur d'usine » et
     « absente du fichier », `dashed 1px rgb(207, 156, 44)` pour « réglé par vous ».

  3. Le bouton de retrait passait SOUS la marque d'état. Ce n'était pas l'émulation :
     `.prefs__aside` réservait une largeur écrite de 4,6 rem (73,6 px), taillée pour
     « Retirer », et le renommage ne l'avait pas élargie. Relevé à 1400, 1600 et 1920
     points de large, à l'identique — le débordement ne dépendait pas de la fenêtre ;
     reproduit au navigateur à 1400 points avant correction :
         fr  « Retirer du fichier »          bouton 109,3 px — 24,5 px de recouvrement
         es  « Quitar del archivo »          bouton 114,0 px — 29,2 px
         en  « Remove from the file »        bouton 130,7 px — 45,9 px
         de  « Aus der Datei entfernen »     bouton 146,0 px — 61,3 px
         nl  « Uit het bestand verwijderen » bouton 166,6 px — 81,8 px (« verwijderen »
                                                              barré par la marque)
     L'emplacement est désormais une COLONNE DE LA GRILLE, large de l'intitulé lui-même —
     un fantôme invisible le mesure, dans la langue affichée (`.prefs__aside[data-label]`).
     APRÈS correction, remesuré à 1400 points sur les cinq reprises : 11,2 px de blanc
     entre le bouton et la marque dans les CINQ langues — c'est l'écart de colonnes de la
     grille, il ne dépend donc pas de la fenêtre —, et un seul bord droit pour toutes les
     lignes.

  DETTE PAYÉE, tard le 2026-08-22, POUR UNE SEULE RAISON, et elle n'était écrite nulle
  part : le nom de fichier de la barre de tête se coupe en TROIS (voir la recette
  d'`editeur-paysage`). Sur cette fixture, « 2025-07-…_backup-00.xcfg » est devenu
  « 2025-07… _backup-00.xcfg ». Rien d'autre n'a bougé dans ce cadre — toutes les mesures
  de la recette se sont reproduites au dixième : bloc 957,1 (fr/es), 994,1 (en/de), 1 010,0
  (nl) ; bouton de retrait 109,3 / 114,0 / 130,7 / 146,0 / 166,6 ; titre suivant et ligne
  « journalisation » aux hauteurs annoncées plus bas.

  ⚠ LE CALAGE À 72 px NE TOMBE PAS SUR 72, ET C'EST NORMAL. Le défilement de cette page
  avance par crans d'un demi-pixel : le cran le plus proche pose le haut du bloc à
  71,8, jamais à 72,0 — mesuré, `scrollY` vaut 7 979,5 et un `scrollBy` de 0,22 ne bouge
  plus. Les cinq reprises sont donc calées à 71,8, soit un pixel plus haut que les images
  de midi ; c'est toute la différence des diffs, qui touchent l'image entière sans qu'un
  seul élément ait changé. Viser 71,8 et s'y arrêter : 72,0 n'existe pas.

  VÉRIFIÉE UNE SECONDE FOIS, tard le 2026-08-22, sur le point que la journée avait laissé
  ouvert : « l'écran des réglages dit d'où viennent ses noms quand les libellés suivent le
  fichier ». Il le dit — mais PAS ICI. Les deux phrases qui nomment la source d'un libellé
  vivent sous `[data-screen="preferences_keybindings"]`, mesuré à 328 px AU-DESSUS du haut
  de ce cadre, et la mention des libellés extraits de XCTrack 1.0.3-beta est dans le chapeau
  de la page, à 7 613 px au-dessus. Le cadre est intact, et le paragraphe
  « AUCUNE LIGNE DE CET ÉCRAN N'EXPLIQUE… » plus bas reste vrai.

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
  Pièges ..... 1. ÔTER LE FOCUS AVANT DE DÉCLENCHER. La reprise néerlandaise du
                  2026-08-22 a d'abord donné une image qui ne différait de la
                  précédente QUE par un halo bleu autour du globe : fermer la boîte des
                  langues rend le focus au bouton qui l'a ouverte. `blur()` sur
                  l'élément actif, puis vérifier `document.activeElement`.
               2. SERVIR UN EXPORT FIGÉ DE HEAD (`git archive HEAD | tar -x -C …`, puis
                  un lien vers `node_modules`) plutôt que l'arbre de travail : d'autres
                  chantiers ouvrent la feuille de style et les catalogues, et une
                  capture prise sur l'arbre vivant fige un travail à mi-course.
               3. Le navigateur n'isole pas les onglets entre agents : vérifier
                  `location.href` EN TÊTE DE CHAQUE SCRIPT et refuser d'agir s'il ne
                  porte pas le port qu'on a soi-même lancé. Le 2026-08-22, un autre
                  onglet a pris la main deux fois en cours de mesure.
  Cadrage .... viewport de 1400 × 1120 points CSS, émulation comme ci-dessus.
               NÉERLANDAIS : 1400 × 1175. Exception mesurée, comme l'allemand de
               `panneau-gadget` — voir « CADRAGE NÉERLANDAIS » plus bas.

               CADRAGE CORRIGÉ le 2026-08-22 : 1400 × 1060 → 1400 × 1120, et la phrase
               qui suivait est devenue fausse le même jour. Elle disait « le bloc fait
               949 px dans les CINQ langues ». Ce n'est plus vrai depuis que l'emplacement
               du bouton de retrait est une colonne de la grille : la colonne prend la
               largeur de l'intitulé traduit, la colonne des noms rétrécit d'autant, et
               des lignes passent sur deux rangs. Remesuré, bloc `preferences_tweaks`,
               largeur 1400, mode édition :
                   fr  957,1 px   (bouton 109,3)
                   es  957,1 px   (bouton 114,0)
                   en  994,1 px   (bouton 130,7)
                   de  994,1 px   (bouton 146,0)
                   nl  1 010,0 px  (bouton 166,6)
               À 1060 points, le néerlandais dépassait de 22 px et l'anglais comme
               l'allemand de 6 : la dernière description était tranchée en pleine ligne.
               1120 points suffisent aux cinq (72 + 1 010 = 1 082) et laissent paraître
               le titre du bloc suivant, « Test et déboguage », ce qui dit au lecteur que
               la liste continue.

               CADRAGE NÉERLANDAIS, le 2026-08-22 en fin de journée : 1120 → 1175 pour
               CETTE LANGUE SEULE. Le calcul ci-dessus est incomplet, et un pilote
               d'essai l'a vu avant nous : « Test et déboguage · 4 instellingen » est
               tranché à mi-glyphe par le bord bas de l'image néerlandaise.

               ⚠ LE CADRE NE DOIT PAS DÉGAGER LE BLOC, IL DOIT DÉGAGER LE TITRE SUIVANT.
               `72 + hauteur du bloc` ne mesure que ce qu'on quitte. Ce que la recette
               promet — « laisser paraître le titre du bloc suivant » — vit 55,4 px plus
               bas : 25,6 px de blanc entre les deux blocs, puis un titre de 29,8 px
               (24 px de glyphes, 4,8 px de talon, 1 px de filet). Le bon calcul est donc
               `72 + (bas du titre suivant − haut du bloc)`. Remesuré, haut du bloc calé
               à 72, largeur 1400, mode édition :

                                        bas du bloc   titre suivant   « journalisation »
                   fr / es                 1 029,1    1 055,0–1 084,8   1 099,1–1 117,1
                   en                      1 066,1    1 091,9–1 121,7   1 136,1–1 154,1
                   de                      1 066,1    1 091,6–1 121,4   1 135,8–1 153,8
                   nl                      1 082,0    1 107,5–1 137,3   1 151,7–1 169,7

               À 1120, le bord bas néerlandais tombe DANS les glyphes du titre, qui
               descendent jusqu'à 1 131,5. L'anglais et l'allemand, eux, PASSENT : leurs
               glyphes s'arrêtent à 1 115,9 et 1 115,6 ; seul le filet de 1 px sous le
               titre est rasé (1,7 et 1,4 px manquants). Le titre y reste entièrement
               lisible, c'est le critère de la recette — CES DEUX IMAGES N'ONT PAS ÉTÉ
               REFAITES, et le contrôle systématique des 24 captures traduites ne les
               avait pas relevées non plus.

               1175 pose le bord bas 5,3 px sous la ligne de catégorie « journalisation »
               (1 169,7) : le même bord bas qu'en français, qui s'arrête 2,9 px sous la
               même ligne. Vérifié sur l'image reprise : au-dessus de 1120, elle est
               IDENTIQUE À L'OCTET PRÈS à la précédente, hors les 612 pixels de
               l'ascenseur, qui se raccourcit quand la fenêtre grandit. Ce n'est donc
               bien qu'une question de cadre : rien du rendu n'a changé.

               ⚠ AUCUNE LIGNE DE CET ÉCRAN N'EXPLIQUE POURQUOI LES NOMS RESTENT FRANÇAIS
               — ne pas chercher à la ramener dans le cadre, elle n'existe pas ici. Le
               même pilote d'essai a cru que le cadrage était « descendu au-delà » de la
               mention « Libellés de XCTrack : fr (déclaré par le fichier) ». Vérifié :
               cette mention est celle du bandeau de faits de la VUE D'ENSEMBLE
               (`metaStrip`, `src/ui/main.ts`) et de la boîte des langues ; sur les
               8 800 px de la page « Réglages généraux », le mot « langue » n'apparaît
               pas une seule fois. Aucun cadrage ne peut donc la montrer. C'est la
               LÉGENDE qui porte l'explication — elle la porte trois fois, dans les cinq
               README : le chapeau de « En images », la légende sous l'image, et le
               paragraphe des deux axes de langue. Si l'on veut mieux, c'est une ligne à
               AJOUTER à l'écran, pas un cadre à remonter.

               ⚠ L'ALLEMAND NE DÉBORDE TOUJOURS PAS PLUS QUE LES AUTRES sur cet écran,
               contrairement à deux des sept : il tient dans le cadre commun. C'est le
               NÉERLANDAIS qui commande ici, et ce n'est pas la longueur des phrases mais
               celle d'un seul intitulé de bouton. Les noms et les descriptions, eux,
               viennent du fichier, qui déclare le français, et ne changent pas de langue.
               Ne pas généraliser : c'est cet écran-ci qui a été mesuré, pas l'application.

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
et la section « Enlever ce qu'une ancienne version a laissé » dépliée sur ses quatre cases
à cocher, suivie des cinq réglages laissés en
place.](captures/version-et-nettoyage.fr.png)

*Le choix de version, le diagnostic, et le nettoyage qu'il ouvre — quatre réglages proposés
et cinq laissés en place, sur quatre gadgets.*

<!--
  REFAIRE CETTE CAPTURE — captures/version-et-nettoyage.<langue>.png (1200 × 2340)

  DETTE PAYÉE, tard le 2026-08-22, et c'est la reprise la plus lourde des sept : les cinq
  images ont changé de contenu ET de cadre. Les trois dettes ouvertes plus bas sont toutes
  soldées d'un coup. Ce que montrent les images neuves :
    · la pastille « périmé » porte un filet TIRETÉ et non plein — vérifié sur les reprises,
      `1px dashed rgb(122, 84, 16)`. Elle ne se clique pas, et elle écrivait la même
      déclaration que le bouton d'à côté ;
    · la section s'ouvre sur QUATRE cases, et le bloc du dessous nomme CINQ réglages
      laissés en place — les deux `mapWidget_showOpenStreet` sont passés de proposés à
      laissés ;
    · chaque réglage porte deux lignes : la raison en français, puis la mesure dessous ;
    · le bouton dit « Enlever ces 4 réglages », et le compte à côté « 4 réglages cochés ».
  Écran ...... la modale « Version visée et compatibilité », nettoyage déplié.
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es.
  Fichier .... tests/fixtures/exports/2026-08-20_backup-00.xcfg
  État ....... version présélectionnée d'après le fichier (1.0.3-beta), la phrase des
               versions indistinguables visible, et la section « Enlever ce qu'une
               ancienne version a laissé » ouverte sur ses 4 réglages / 4 gadgets, plus
               le bloc des 5 réglages laissés en place qui la suit.
  Refaire .... npm run dev -- --port 5179, déposer le fichier, « Modifier les pages »
               (le nettoyage ne s'offre qu'en édition), menu « Fichier » puis
               « Version et compatibilité… », enfin déplier « Voir ces 4 réglages, et
               décocher ce que vous préférez garder ».
  Cadrage .... viewport de 1200 × 2340 points CSS, émulation comme ci-dessus. La boîte
               ne défile alors dans aucune des cinq langues.

               CADRAGE CORRIGÉ, tard le 2026-08-22 : 1 960 → 2 340 points. Les deux
               lignes par réglage et le bloc des cinq laissés en place ont rallongé la
               boîte de trois cents pixels. Même calcul qu'avant — hauteur du contenu
               ÷ 0,88, jamais hauteur + une marge. Contenus REMESURÉS, largeur 1200,
               nettoyage déplié, sur un viewport de 3 000 points où rien ne défile :
                   fr / nl / es  1 976,6 px
                   en            1 996,9 px
                   de            2 037,9 px  ← c'est encore lui qui commande
               2 037,9 ÷ 0,88 = 2 315,8 : 2 340 passe (plafond de 88 vh à 2 059,2, soit
               21,3 px de marge sur l'allemand) et laisse 151 px de fond de part et
               d'autre en allemand, 182 en français. Vérifié langue par langue sur les
               cinq reprises : `scrollHeight === clientHeight`, la boîte ne défile pas.

               CADRAGE PRÉCÉDENT, gardé pour la méthode : 1 720 → 1 960 points. Le bloc des
               réglages laissés en place a rallongé la boîte de deux cents pixels. Et le
               calcul est moins direct qu'il n'y paraît : `.modal__box` est plafonnée à
               **88 vh** — mesuré, `max-height` rend 1 513,6 px à 1 720 de viewport et
               1 724,8 px à 1 960. Il faut donc `hauteur du contenu ÷ 0,88`, jamais
               `hauteur + une marge`. Contenus remesurés, largeur 1200, nettoyage déplié :
                   fr / nl / es  1 656 px
                   en            1 676 px
                   de            1 717 px  ← c'est lui qui commande
               1 717 ÷ 0,88 = 1 951 : 1 960 passe, et laisse 121 px de fond de part
               et d'autre en allemand, 152 en français. Piège vérifié en chemin : à
               1 930 la boîte allemande était encore rognée de 19 px alors que le
               contenu semblait tenir — c'est le plafond en `vh` qui mordait, pas le
               viewport.
  Variante ... le banc d'essai dédié montre le même module hors de l'éditeur :
                   npm run dev -- --port 5178
                   http://localhost:5178/src/ui/versionDiagnostic.demo.html

  DETTE PAYÉE le 2026-08-22, en fin de journée : les cinq exemplaires montraient NEUF
  cases à cocher. Le nettoyage n'en propose plus que QUATRE sur cette fixture, et nomme en
  dessous les CINQ laissés en place. Les cinq images ont été reprises ; le cadrage, lui, a
  dû changer deux fois — voir « Cadrage » ci-dessus.

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

  DETTE SOLDÉE — ce qui suit a été écrit après l'essai pilote nº 5 et décrivait des images
  périmées ; les cinq ont été reprises tard le 2026-08-22. Le relevé reste ici parce qu'il
  dit ce qu'il fallait retrouver à l'image :
    · chaque réglage porte maintenant DEUX lignes au lieu d'une. Sous le nom vient la
      raison en français (« la flèche de vent disparaîtrait de ce compas ») et, sous elle,
      la mesure qui la prouve (« sans lui, windStyle passe de ARROW à NONE »). Les six
      réglages proposés portent la mesure symétrique (« avec ou sans lui, windStyle vaut
      ARROW ») ;
    · une phrase de plus sous l'annonce : « 3 autres réglages ont été trouvés et ne sont
      pas proposés : ils sont nommés plus bas, avec la raison. » ;
    · « 6 réglages retenus » se lit maintenant « 6 réglages cochés : ils seront enlevés »,
      et le bouton inerte dit « Aucun réglage coché » ;
    · dans le diagnostic au-dessus, le verdict du bloc ambre a changé de phrase entière.
  ⚠ LE CADRAGE EST À REMESURER, pas à deviner : une dizaine de lignes de texte s'ajoutent
  à la boîte et 1 960 points ne suffiront pas. Reprendre la méthode ci-dessus — mesurer le
  contenu dans les cinq langues, diviser par 0,88, l'allemand commande.

  DERNIER ÉTAT DE LA DETTE avant qu'elle soit soldée, et le compte avait encore changé : la table des
  réglages périmés porte maintenant le VOISINAGE de chaque mesure, et les deux
  `mapWidget_showOpenStreet` de cette fixture sont passés de PROPOSÉS à LAISSÉS EN PLACE —
  mesuré sur l'appareil, les retirer éteint l'ombrage du relief. La section s'ouvre donc
  sur QUATRE cases et non six, et le bloc du dessous en nomme CINQ et non trois. Deux
  lignes de plus dans la boîte, deux de moins dans la liste. C'est bien l'état qu'on lit
  sur les cinq images neuves, et le cadrage a été remesuré comme dit plus haut.
-->


![La boîte « Enregistrer cette configuration » : les trois issues, puis l'inventaire des
cinq textes remplacés — chacun avec sa page, son gadget, l'ancienne valeur barrée, la
nouvelle, et la raison du remplacement.](captures/enregistrer-et-partager.fr.png)

*Au moment d'enregistrer, ce que le fichier révèle et ce qui peut être remplacé —
montré avant le téléchargement, pas après.*

<!--
  REFAIRE CETTE CAPTURE — captures/enregistrer-et-partager.<langue>.png (920 × 3260)

  DETTE PAYÉE, tard le 2026-08-22 : les trois péremptions signalées plus bas sont soldées
  d'un coup, et le cadre a changé. Ce que montrent les images neuves : le choix des pages
  en tête du volet de la troisième issue (« Quelles pages partent », une case par page,
  « Tout cocher » / « Tout décocher », le compte de ce qui part), la section
  « Ce que le destinataire en fera » et ses quatre paragraphes, la phrase de plus sur
  l'heure de l'export remise à zéro, et le nom de fichier de la barre de tête coupé en
  trois — l'extension entière, cette fois.

  CADRAGE CORRIGÉ, tard le 2026-08-22 : 2 480 → 3 260 points. Contenus REMESURÉS,
  largeur 920, troisième issue cochée, sur un viewport de 3 600 points où rien ne défile :
      en  2 675,0 px
      fr  2 732,0 px
      es  2 751,5 px
      de  2 844,5 px
      nl  2 846,0 px  ← c'est le NÉERLANDAIS qui commande, et de 1,5 px sur l'allemand
  2 846,0 ÷ 0,88 = 3 234,1 : 3 260 passe, plafond de 88 vh à 2 868,8, soit 22,8 px de
  marge. ⚠ Le néerlandais avait déjà pris la tête à la mesure précédente ; il la garde, et
  l'écart avec l'allemand est trop mince pour qu'on suppose l'un ou l'autre. Mesurer.
  Vérifié langue par langue sur les cinq reprises : la boîte ne défile pas.

  VÉRIFIÉE ET GARDÉE le 2026-08-22, au soir : le chantier du reçu d'enregistrement — la
               boîte du système qui laisse le pilote poser lui-même son fichier — ne touche
               PAS ce cadre. Ce qu'il change vit après la fermeture de cette boîte-ci : le
               reçu de la barre de tête, et lui seul. Aucune ligne de `sharingDialog.ts`,
               aucun intitulé, aucune hauteur. Les trois péremptions signalées plus bas
               restent, elles, entières.

  DETTE PAYÉE le 2026-08-22, en fin de journée : le « Fermer » en haut à droite de la
               boîte n'avait aucun filet — il se lisait comme un mot posé là. Toutes les
               commandes discrètes de l'outil ont repris le filet plein de `.btn` ; c'est
               le seul objet de ce cadre qui a changé, et le cadrage n'a pas bougé.
               Hauteurs de boîte remesurées à cette occasion, largeur 920, troisième issue
               cochée : fr 2 080, en 2 060, es 2 099, de 2 174, nl 2 176 —
               contre un plafond de 2 182,4 px (88 vh de 2 480). Le NÉERLANDAIS est
               passé devant l'allemand depuis la mesure d'origine, et il ne reste que
               6 px sous le plafond : ne pas raccourcir ce cadre sans remesurer.

  PÉREMPTION SOLDÉE — elle PÉRIMAIT LE CADRAGE, pas seulement un détail. La troisième issue porte maintenant, EN TÊTE de son volet, le choix
  des pages : le titre « Quelles pages partent », une phrase, UNE CASE PAR PAGE de la
  fixture, deux boutons (« Tout cocher », « Tout décocher »), le compte de ce qui part, puis
  une section « Ce que le destinataire en fera » de quatre paragraphes. Sur
  formes-preservees.xcfg cela fait 2 pages cochées + ~8 lignes de texte AVANT tout ce que
  la capture montrait déjà.
  Les cinq images ont été reprises et la hauteur remesurée dans les cinq langues — voir
  « CADRAGE CORRIGÉ » en tête de cette recette.

  PÉREMPTION SOLDÉE. Les deux paragraphes « Ce que le
  destinataire n'aura pas » — celui de la deuxième issue et celui de la troisième —
  portent maintenant UNE PHRASE DE PLUS, dans les cinq langues : l'heure de l'export est
  remise à zéro parce qu'elle emportait le fuseau horaire du pilote. Trois lignes de plus
  environ sur l'issue 2, une sur l'issue 3, à 920 px de large. Cela s'ajoutait à la reprise demandée ci-dessus, et la hauteur a été remesurée une seule
  fois, à la fin — c'est ce que dit « CADRAGE CORRIGÉ ».

  PÉREMPTION SOLDÉE. Le NOM DE FICHIER de la barre de
  tête se coupe maintenant en TROIS et non en deux : le rang et l'extension ne cèdent plus
  jamais. Mesuré à 920 px sur cette fixture — « f…-preservees.xcfg » devient
  « …-preservees.xcfg » : un caractère de tête en moins, et c'est tout ce qui change ici.
  ⚠ Sur la machine du pilote-testeur, la MÊME barre affichait « f…-preservees.xc… » —
  l'extension coupée. C'est ce que le nouveau découpage rend impossible, et c'est la seule
  raison qui vaille de reprendre ces cinq images. Voir `src/ui/fileNameParts.ts`.

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
  Cadrage .... viewport de 920 × 3260 points CSS, émulation comme ci-dessus. La boîte
               est large de 830 px quoi qu'on fasse : 920 points de large lui laissent
               45 px de marge de chaque côté au lieu de 185, et l'image pèse d'autant
               moins. 3 260 de haut : c'est le NÉERLANDAIS qui commande, et non
               l'allemand — voir « CADRAGE CORRIGÉ » en tête de recette pour les cinq
               mesures.
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
  VÉRIFIÉE À L'ÉCRAN le 2026-08-22 : la BARRE DE BOUTONS de « Mes configurations » tient
  sur UNE ligne en français, en anglais, en allemand et en espagnol, et passe à DEUX en
  NÉERLANDAIS. Ce n'est pas un défaut de l'image ni un cadrage à reprendre : `.library__head`
  est `flex-wrap: wrap` et c'est exactement ce cas qu'il prévoit. Mesuré au navigateur, sur
  la plaque de 977 px : quatre boutons néerlandais demandent 840 px contre 776 à l'allemand,
  et le titre en prend 144 — 1 000 px pour 977. Même famille que « l'allemand déborde » :
  une langue plus longue, une image qui le montre. Ne PAS retoucher.
  DETTE PAYÉE, tard le 2026-08-22. Même cause que pour
  « enregistrer-et-partager » : le nom de fichier de la barre de tête se coupe en trois, et
  le rang et l'extension ne cèdent plus. ⚠ Le pilote-testeur du 2026-08-22 avait relevé que
  CETTE image montrait elle-même le défaut — « on y lit f…-preservees.xc… » : l'extension
  coupée sur la capture qui sert d'exemple. Les cinq reprises lisent
  « f…-preservees.xcfg », extension entière. Voir `src/ui/fileNameParts.ts`.

  SECONDE DETTE PAYÉE au même moment. Les trois gestes que rien
  ne rattrape portent désormais une marque que les autres n'ont pas — filet ambre, bord
  gauche à 3 px : sur cette image, « Supprimer » de chaque entrée et
  « Effacer toute la bibliothèque » au pied. C'est exactement ce que la recette
  cadre, et c'est la réponse au relevé du pilote-testeur : « les deux commencent par la même idée ; l'une protège, l'autre détruit ; rien ne les distingue à l'œil ».
  « Empêcher le navigateur d'effacer ma bibliothèque », juste à côté, ne prend
  RIEN — c'est la moitié qui porte le contraste. Ni le cadrage, ni les fixtures, ni l'état
  n'ont bougé : seule la couleur de deux filets change. Voir `.library__final` dans
  `src/ui/libraryPanel.css`. Boîte remesurée sur les cinq reprises : 1 022 × 572,2 px, et
  607,3 en néerlandais — les mêmes qu'avant.

  ⚠ UN PIÈGE DE FABRICATION, MESURÉ À LA REPRISE : après « Ranger », la boîte porte en tête
  un bandeau de confirmation (`.library__flash`) qui la rallonge de 39 px et n'était sur
  AUCUNE des images précédentes. Il ne s'efface pas tout seul dans le temps d'une capture :
  il faut FERMER la boîte et la ROUVRIR. Sans cela la boîte fait 611,3 px au lieu de 572,2,
  et rien ne le signale.

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
               « Ranger ». Fermer, déposer la 2e fixture, recommencer. Fermer et ROUVRIR
               la bibliothèque — voir le piège du bandeau de confirmation ci-dessus :
               c'est l'état de la capture.
               Pour les quatre autres langues, la bibliothèque SURVIT au changement de
               langue — elle vit dans l'IndexedDB de l'origine. Recharger dans la langue
               voulue, PUIS REDÉPOSER formes-preservees.xcfg, puis rouvrir la boîte : la
               barre de tête porte le nom du fichier ouvert, et sans lui les cinq images
               ne diffèrent plus seulement par la langue. Le globe seul ne suffit pas
               ici — mesuré : une boîte DÉJÀ OUVERTE ne se retraduit pas au changement de
               langue, il faut la fermer et la rouvrir.
               Pour repartir de zéro : effacer la base `xcfg-editor` de l'IndexedDB.
  Cadrage .... viewport de 1100 × 700 points CSS, émulation comme ci-dessus. La boîte
               fait 1 022 × 572 px (607 en néerlandais) et se centre : 700 points de
               haut la serrent sans la couper dans aucune des cinq langues.
  À vérifier . la vignette de « Comp Annecy » DOIT montrer deux barres grises au-dessus
               du « 1234 m ». Si elle montre un texte lisible, le masquage ne s'est pas
               fait et la capture révélerait ce que la page porte : ne pas la garder.
               Les deux noms d'entrée — « Comp Annecy », « Vol-biv Alpes » — sont écrits
               à la main pour la capture ; aucun nom réel ne doit figurer ici.

  DETTE PAYÉE le 2026-08-22, en fin de journée. Le pied de la boîte est précisément ce que
  cette recette cadre — « Empêcher le navigateur d'effacer ma bibliothèque » et « Effacer
  toute la bibliothèque » —, et ces deux boutons-là n'avaient aucun filet : ils se lisaient
  comme des bouts de phrase. Ils portent maintenant celui de toute commande. « Supprimer »,
  « Renommer » et « Vérifier l'empreinte », sur les entrées, ont changé de la même façon.
  Ni le cadrage, ni les fixtures, ni l'état n'ont bougé : la boîte fait toujours
  1 022 × 572 px (607 en néerlandais), remesuré sur les cinq reprises.

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

  VÉRIFIÉE ET GARDÉE POUR LE CHAPITRE 8 le 2026-08-22, au soir : il a gagné deux
  paragraphes — le bouton sous l'appareil qui émet le code 27, et le second qui n'émet
  rien — et deux phrases y ont changé (« trois touches » devenu « quatre »). AUCUN titre :
  `<h2>` et `<h3>` comptés dans les cinq manuels, 15 et 55 partout, les mêmes qu'avant.
  Aucun `<span class="manual__ui">` ajouté ni retiré. Et surtout : tout cela est au
  chapitre 8, quand le cadre s'arrête au milieu du chapitre 1. Le sommaire, lui, ne liste
  que les `<h2>` : il ne bouge pas.

  VÉRIFIÉE ET GARDÉE UNE QUATRIÈME FOIS le 2026-08-22, au soir : le chapitre 10 a gagné
  trois paragraphes — le reçu ne dit plus la même chose selon que le navigateur écrit le
  fichier lui-même ou le remet à un téléchargement ordinaire — et l'encadré mesuré de fin
  de chapitre a changé de titre et gagné un paragraphe. AUCUN titre de chapitre ni de
  section : `<h2>` et `<h3>` comptés dans les cinq manuels, la liste des titres est
  identique à celle d'avant, caractère pour caractère. Aucun `<span class="manual__ui">`
  ajouté ni retiré non plus — 149 en français, 152 en anglais, 155 en allemand, 153 en
  espagnol, 152 en néerlandais, les mêmes qu'avant. Le sommaire ne bouge pas, et le cadre
  s'arrête toujours au milieu du chapitre 1.

  VÉRIFIÉE ET GARDÉE UNE TROISIÈME FOIS le 2026-08-22, au soir : le chapitre 5 a gagné un
  paragraphe — « Gérer les pages » renvoie désormais vers l'issue qui n'envoie qu'une
  page. AUCUN titre : ni `<h2>` ni `<h3>` ajouté dans les cinq manuels, compté à zéro dans
  chacun. Le sommaire ne bouge pas, et le cadre s'arrête toujours au milieu du chapitre 1.

  VÉRIFIÉE ET GARDÉE UNE SECONDE FOIS le 2026-08-22, au soir : le manuel a gagné cinq
  paragraphes de plus, aux chapitres 5, 6 et 10 — le remède porté dans
  « Gérer les pages », la mémoire qui meurt avec l'onglet, le bouton du cran de zoom, et
  le reçu que le changement d'écran referme. AUCUN n'est un titre : le diff n'ajoute ni
  `<h2>` ni `<h3>` dans les cinq manuels, compté à zéro dans chacun. Le sommaire ne bouge
  donc pas, et le cadre s'arrête toujours au milieu du chapitre 1.

  VÉRIFIÉE ET GARDÉE le 2026-08-22, en fin de journée — la seule des sept dans ce cas.
  Le manuel a gagné ce jour-là deux sections (« Les touches physiques… » au chapitre 8,
  « Une fois enregistré : le reçu » au chapitre 10) et deux figures (chapitres 10 et 11) :
  aucune n'entre dans ce cadre, qui s'arrête au milieu du chapitre 1. Le SOMMAIRE, lui,
  ne liste que les chapitres — des `<h2>` —, et aucun chapitre n'a été ajouté : ses treize
  entrées sont mot pour mot celles d'avant, vérifié par comparaison du bloc
  `<nav class="manual__toc">` dans les CINQ manuels. Le bouton « Fermer le manuel » est un
  `.btn` plein, pas une commande discrète : le filet rendu à `.btn--ghost` ne le touche
  pas. Contrôle final, à l'image : rendu neuf comparé pixel à pixel à celui du dépôt —
  seuls les bords des glyphes diffèrent (écart maximal de 59 sur un canal, sur les deux
  intitulés surlignés de l'encadré), rien qui ne soit de l'anticrénelage. NE PAS refaire
  ces cinq images « par précaution » : ce serait 470 ko de diff pour un rendu identique.

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

<!--
  RECETTE À PRODUIRE — captures/ce-que-vous-avez-change.<langue>.png (1100 × 760)
  ⚠ L'IMAGE N'EXISTE PAS ENCORE, et aucun README ne la montre : cette recette est écrite
  d'avance, pendant que l'écran est frais, plutôt que six mois plus tard par quelqu'un qui
  devra le redécouvrir. Le jour où elle est prise, ajouter l'appel d'image dans les cinq
  README et la ligne correspondante dans `LOCALISED_SHOTS` (`tests/docs/manuels.test.ts`),
  qui compte les captures et refuse qu'une langue montre celle d'une autre.

  Écran ...... la boîte « Ce que vous avez changé », ouverte par le menu « Fichier ».
  Langues .... CINQ exemplaires : .fr, .en, .nl, .de, .es. Le texte EST le sujet — ce qui
               est compté, et la phrase qui dit que rien n'est compté deux fois.
  Fichier .... tests/fixtures/exports/2026-08-20_backup-00.xcfg.
               ⚠ Il porte `Display.Language` VIDE, donc il ne déclare AUCUNE langue : les
               noms de gadgets suivent alors le pilote, et non le fichier. Mesuré au
               navigateur le 2026-08-22 : la même ligne lit « Barre d'état » quand le
               globe est sur le français et « Statuszeile » quand il est sur l'allemand.
               C'est correct — c'est le repli documenté (`labelFallbackLanguage`) — mais
               ce n'est PAS le cas qui montre la séparation des deux axes. Ne pas écrire
               en légende que le nom reste français : il ne reste pas. Si l'on veut un
               jour l'illustrer ici, il faut une fixture qui déclare vraiment sa langue.
               Corollaire pour la fabrication : tant qu'aucune langue n'a été choisie au
               globe, ces noms suivent le NAVIGATEUR, pas l'interface.
  ⚠ Vie privée. Cette boîte peut nommer des lignes que le pilote a écrites — un titre de
               gadget, un texte libre, `Pilot.Name`. Elle ne montre JAMAIS leur valeur,
               mais la fixture reste obligatoire : une configuration réelle y ferait
               apparaître les noms de ses propres réglages, et une image ne s'anonymise
               pas après coup.
  État ....... trois écarts, un par famille, pour que les trois sections soient à l'image
               sans que la liste dépasse le cadre :
                 1. un gadget modifié — page 1 PAYSAGE, sélectionner « Barre d'état »
                    (rang 1 sur 14) et cocher la première case de son panneau ;
                 2. une page ajoutée — « Modifier les pages », insérer une page libre
                    au dernier rang du paysage ;
                 3. un réglage général modifié — « Réglages », chercher `Pilot.Name`,
                    écrire n'importe quoi qui ne soit pas un vrai nom.
               Le chapeau doit alors lire « 1 page ajoutée, 1 page modifiée, 1 gadget
               modifié et 1 réglage général ».
  Refaire .... npm run dev -- --port <un port libre, JAMAIS 5175>, déposer la fixture,
               faire les trois gestes ci-dessus, puis menu « Fichier » →
               « Ce que vous avez changé ».
               Pour les quatre autres langues : changer la langue au globe et rouvrir la
               boîte. Le document reste ouvert, les trois écarts avec lui.
  Cadrage .... viewport de 1100 × 760 points CSS. La boîte fait 832 px de large
               (`.modal--changes`, min(52rem, 94vw)) et se centre. ⚠ L'ALLEMAND DÉBORDE,
               comme partout ailleurs : mesurer avant de supposer, et lui donner un cadre
               plus haut s'il le demande, plutôt que de rogner sa dernière phrase.
  À vérifier . la phrase du bas — « Ce relevé compare deux états ; il ne compte pas vos
               gestes… » — DOIT être dans le cadre. C'est elle qui dit pourquoi le compte
               ne ressemble pas à l'historique, et une capture qui la coupe montre un
               relevé qu'on croira être un journal.
               Vérifier aussi qu'AUCUNE valeur de réglage n'est lisible : on doit lire
               `Pilot.Name`, jamais ce qui est écrit dedans.
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
transporte les clés qu'il n'a pas encore relues**. Dans une même sauvegarde de 1.0.3, sur
cinq gadgets cartographiques, deux portent `mapWidget_showTerrain` et trois portent
`mapWidget_panningTimeout` — jamais les deux. Les seconds ont été refaits depuis le
remplacement, les premiers traînent un reliquat vieux de deux ans, sur des pages que
l'appareil n'a jamais affichées. Mesuré le 22 août 2026 : dès qu'il les affiche, il
**consomme** ces clés — il en dérive celles d'aujourd'hui, puis les efface. Un reliquat
n'est donc pas une clé morte, c'est une clé qui n'a pas encore servi.

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

⚠️ **Sur les touches physiques, il y a trois crans de connaissance et non deux**, et
l'écran dit lequel s'applique à chaque code :

1. **une touche pressée à la main**, son code lu à l'arrivée — `keyCodes.hardwareKeys[].keys`,
   `basis: "measured"`. Le seul cran qui prouve qu'un bouton existe. **Quatre** touches sur
   l'AIR³ 7.2 depuis le 2026-08-22 au soir : les codes 24, 25, 26 — et **27**, le premier
   des deux boutons **sous l'appareil**, que le propriétaire a pressé pendant que
   `getevent` écoutait les quatre périphériques d'entrée. La **place** du bouton voyage
   avec la mesure (`where`), parce que seul un doigt pouvait l'établir et que c'est elle
   qui permet à un pilote de retrouver sa touche. ⚠️ Ce relevé ne porte **aucun nom** : ce
   qui a été mesuré, c'est qu'une touche pressée émet le code 24, pas la façon de
   l'appeler — le nom vient de XCTrack, voir plus bas ;
2. **un code déclaré par le noyau du boîtier** — `keyCodes.hardwareKeys[].kernelDeclaration`,
   relevé le 2026-08-22 par `getevent -pl`, `dumpsys input` pour savoir quel fichier de
   disposition Android applique réellement à chaque périphérique, puis lecture de ce
   fichier. Quatre périphériques d'entrée sur ce boîtier : le clavier (`mtk-kpd`, sur sa
   propre disposition, 24/25/26), le contrôleur de clavier (`sn7326-key`, dont le fichier
   de disposition propre **n'existe pas** — c'est `Generic.kl` qui s'applique, et qui
   traduit `CAMERA` 212 en **27** plus quatre codes de croix directionnelle), la dalle
   tactile (`mtk-tpd`, 3/4/82/84) et la prise casque (`ACCDET`). Un code déclaré est
   **possible** sur ce matériel ; il n'est pas prouvé, une puce de clavier déclarant
   souvent plus de codes que le boîtier n'a de boutons. ⚠️ Le 27 a quitté ce cran le soir
   même, sous un doigt ; les quatre codes de croix directionnelle y restent ;
3. **rien** — le code n'est déclaré nulle part sur ce modèle. C'est une ignorance, pas une
   absence.

Ce troisième cran a un habitant notable : **266 (`KEYCODE_STEM_2`)**, que le corpus porte
sur `Keys.PrevWaypoint` et `Keys.NextWaypoint`, et qu'aucun des quatre périphériques ne
peut produire — le seul fichier de disposition du boîtier qui porte des entrées `STEM`
n'est appliqué à aucun d'eux. L'explication la plus simple, **et c'est une hypothèse que
rien n'a vérifiée**, est qu'une application installée l'injecte ; l'add-on
`air3.air3xctaddon` est présent sur l'appareil, et un événement injecté ne passe par
aucune disposition. `keyCodes.unexplainedCodes` range l'hypothèse, ce qui la rend
plausible, et ce qui manquerait pour trancher — un appui, ou la lecture de l'add-on.

Jusqu'au 2026-08-22, l'écran écrasait les crans 2 et 3 dans la même phrase, qui déclarait
qu'aucune touche mesurée sur l'AIR³ 7.2 n'émettait le code 27 — d'un code que le noyau du
même boîtier déclare. Le soir du même jour, un appui a tranché : le 27 est passé au
premier cran, et le bouton « qui ne semblait servir à rien » sert.

**Un bouton pressé dont rien n'est sorti est une mesure, pas un trou.** Le *second* des
deux boutons sous l'appareil a été pressé dans la même capture et n'a produit **aucun
événement**, les quatre périphériques d'entrée étant à l'écoute. `hardwareKeys[].silentKeys`
le range, avec sa date et ce qui écoutait — sans quoi « rien » ne serait pas un résultat.
⚠️ Ce n'est pas « cette touche n'existe pas » : le bouton existe et s'enfonce, il ne
produit rien **sur ce boîtier-là**. La page des réglages le dit au pilote, parce que celui
qui l'appuie sans rien voir bouger se demandera si son instrument est cassé.

Le diagnostic « Version et compatibilité », lui, ne consulte toujours ni l'une ni l'autre
de ces deux bases.

### Les libellés transcrits à la main — navigations et touches physiques

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

**`src/catalog/hardwareKeyLabels.json` est le second de ces catalogues transcrits**, et il
existe pour la même raison, découverte le même jour. L'écran des touches nommait les
touches physiques de l'AIR³ 7.2 « volume haut », « volume bas » et
« marche/arrêt » : des mots **de nous**, écrits en français dans le relevé matériel,
servis tels quels aux cinq interfaces — et introuvables sur l'appareil du pilote, dont
l'écran natif de réglage des touches affiche « Augmenter le volume ».

La confusion tenait en un mot. Ce qui avait été **mesuré**, c'est qu'une touche pressée à
la main émet le code 24 ; « volume haut » n'était pas cette mesure, c'était notre façon
de la dire. Rien n'a jamais été relevé en français. Le remède n'était donc pas de traduire
ces trois mots en cinq langues — ce qui aurait **inventé** un nom là où XCTrack en porte
déjà un — mais d'aller chercher le sien : `keyVolumeUp`, `keyVolumeDown` et `keyPower`, en
32 langues, que les 55 relevés d'APK portent tous. Ils suivent l'axe des libellés, donc la
langue du fichier ouvert.

⚠️ **Ce catalogue a longtemps porté trois codes, et il en porte vingt et un depuis le
2026-08-22 au soir.** Sa réserve disait : « aucune mesure ne dit lequel de ces mots l'écran
de XCTrack choisit pour un code donné, et le bytecode est obfusqué ». La seconde moitié
était fausse, et c'est ce qui bloquait la première : **l'obfuscation renomme les classes et
les méthodes, elle ne cache pas les entiers.** Le code d'une touche et l'identifiant de la
ressource qui la nomme sont deux entiers littéraux posés côte à côte, et un `dexdump` les
rend lisibles.

Dans l'APK installé sur l'AIR³ 7.2 — `1.0.3-beta`, `versionCode` 100 030, celui-là même
dont le relevé de textes était déjà au catalogue — la classe `th4` construit une table de
**24 paires** `(code, ressource)`, et sa méthode `a(Integer)` est ce qui nomme une touche à
l'écran : elle ôte d'abord le bit `0x01000000` et préfixera le texte `keyLongPress` ; elle
consulte une première table qui rend un **caractère** pour les touches de clavier ; puis
celle-ci ; et **à défaut de tout, elle affiche le nombre nu** — c'est ce que le pilote voit
pour 266. Les 21 codes Android de cette table sont donc **lus**, et non plus devinés.

Deux contrôles, et trois réserves :

- **les 21 paires tombent une à une sur la constante `KEYCODE_*` que leur nom annonce** —
  3 sur `keyHome`, 19 sur `keyUp`, 64 (`KEYCODE_EXPLORER`) sur `keyBrowser`. Une lecture
  fautive du bytecode n'aurait pas produit vingt et une coïncidences ;
- **le 24 est mesuré deux fois** : l'écran natif affiche « Appui long : Augmenter le
  volume » sur la ligne portant `16777240` (= 24 | 0x1000000) — l'observation qui fonde
  déjà `longPressBitBasis` — et le bytecode dit la même chose. Deux mesures indépendantes
  qui concordent ;
- **trois entrées de la table restent dehors** : `-2`, `-3` et `-4` ne sont pas des codes
  Android mais des valeurs propres à XCTrack (`keyProximity`, `keyExtShort`, `keyExtLong`),
  et aucun fichier du corpus n'en porte. Deux plages de codes négatifs, lues dans la même
  méthode, nomment de la même façon les télécommandes AeroRemote et MipFly ;
- **les touches de clavier gardent leur nom Android.** Pour le code 51, XCTrack affiche
  « W » — le caractère de sa première table, consultée avant celle-ci. Aucun boîtier relevé
  n'en porte ; le jour où l'un en portera, il faudra lire cette table-là aussi ;
- **un seul APK, une seule version.** Cette table est celle de `1.0.3-beta` ; une autre
  version peut la changer, comme le reste du format.

⚠️ **Le mot de XCTrack n'est pas ce que le boîtier porte.** « Caméra » nomme le code 27, et
sur l'AIR³ 7.2 ce code sort du premier des deux boutons sous l'appareil — qui n'est pas un
déclencheur photo. C'est pourquoi la page dit aussi *où* la touche se trouve : le nom seul
n'apprend pas au pilote laquelle presser. Un code non apparié garde, lui, son nom Android :
`KEYCODE_STEM_2`.

Ce que le **noyau** déclare a fait le chemin inverse. « la prise casque »,
« la dalle tactile » étaient également écrits en français dans le relevé — mais ceux-là
sont bien notre glose, et non un mot de XCTrack : le noyau, lui, déclare `ACCDET` et des
codes. Ils sont passés au catalogue de notre prose (préfixe `inputDevice`) et suivent
désormais la langue de l'interface.

## Licence

MIT — voir [LICENSE](LICENSE).

XCTrack est une application de [XContest](https://xcontest.org/). Ce projet n'est ni
affilié à XContest, ni à Air3, ni approuvé par eux.
