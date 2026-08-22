/**
 * # Les deux axes de langue
 *
 * Cette application a **deux** langues, et elles sont indépendantes. C'est le piège de
 * conception le plus coûteux du projet, et il ne se rattrape pas après coup : brancher
 * les deux sur un même sélecteur casserait la promesse centrale de l'outil.
 *
 * | Axe | Ce qu'il gouverne | D'où il vient |
 * |---|---|---|
 * | `ui` | **notre prose** : intitulés, remarques, explications, avertissements | le choix du pilote, mémorisé (`src/i18n/preference.ts`) ; à défaut le navigateur ; à défaut le français |
 * | `labels` | **les mots de XCTrack** : noms de gadgets, options, préférences | `Display.Language` du fichier ouvert ; à défaut la langue choisie au globe, sinon `navigator.language` |
 *
 * ⚠️ **Ce fichier est un document, pas une couche.** Il n'expose aucune fonction : la
 * doctrine s'applique dans les modules nommés plus bas, et un test la tient contre eux.
 * Voir « Ce que ce fichier a été, et pourquoi il ne l'est plus ».
 *
 * ## Ce que le fichier déclare ne se discute pas
 *
 * Un pilote belge dont l'AIR³ est réglé en anglais doit lire l'interface **en français**
 * et les libellés **en anglais**. Pas parce que c'est élégant : parce qu'il tient son
 * instrument dans une main et cet écran devant lui, et que le seul travail que l'outil
 * doit lui épargner est de traduire mentalement entre les deux. Un libellé « traduit »
 * dans sa langue d'interface serait un mot qu'il ne trouvera **nulle part** sur son
 * appareil.
 *
 * C'est aussi pourquoi les libellés extraits de l'APK ne se traduisent jamais — y compris
 * leur « widget » incohérent avec le « Gadget » de la chrome de XCTrack. Ce n'est pas
 * notre parole, c'est la sienne.
 *
 * ## Le repli, quand le fichier ne déclare rien
 *
 * Beaucoup d'exports ne portent pas de `Display.Language` : sur l'appareil, XCTrack y suit
 * la langue du système Android, qu'un fichier ne consigne pas. Il faut alors supposer, et
 * **la supposition suit le choix du pilote au globe** — à défaut seulement
 * `navigator.language`.
 *
 * L'axe `labels` a donc **trois** sources, et non deux ; l'interface les nomme une à une,
 * parce que le pilote qui se demande « pourquoi ces mots-là ? » a besoin de la réponse et
 * pas d'un code de langue seul. Le type qui les porte est `LabelSource`
 * (`src/ui/main.ts`), dont le docblock détaille l'ordre de priorité :
 *
 * - `file` — le fichier déclare sa `Display.Language`. Rien ne passe devant.
 * - `ui` — le fichier se tait, et le pilote a choisi une langue d'interface au globe.
 * - `browser` — le fichier se tait et le pilote n'a rien choisi : reste `navigator.language`.
 *
 * Ce n'est pas une confusion des deux axes, c'est ce qu'ils font quand l'un des deux n'a
 * rien à dire. Le repli précédent était le navigateur seul, et le défaut se voyait au
 * premier essai du sélecteur : le pilote passait à l'anglais, les noms de réglages
 * restaient dans la langue de son navigateur — l'essentiel de l'écran —, et la page
 * paraissait n'avoir pas changé de langue. Entre deux suppositions, celle qu'il a posée
 * lui-même dans cet outil vaut mieux qu'un réglage de système qu'il n'a pas réglé pour
 * cet usage.
 *
 * ⚠️ « Choisi » veut dire **explicitement**, jamais la langue d'interface courante : notre
 * prose n'existe qu'en cinq langues et retombe sur le français, quand les catalogues de
 * XCTrack en portent 33 à 36. Un pilote tchèque qui n'a rien choisi garde ses libellés
 * tchèques (voir `labelFallbackLanguage`).
 *
 * ## Où la doctrine s'applique, dans le code vivant
 *
 * Elle ne s'applique nulle part ici. Chaque ligne du tableau est tenue par un module réel,
 * et c'est là qu'il faut aller lire — ou corriger :
 *
 * | Ce qui est en jeu | Le module qui le tient |
 * |---|---|
 * | le fichier l'emporte sur toute supposition | `resolveLanguage` (`src/model/preferences.ts`) |
 * | le repli quand le fichier se tait | `labelFallbackLanguage` (`src/model/preferences.ts`) |
 * | les trois sources, et leur mention à l'écran | `LabelSource`, `labelFallback()` (`src/ui/main.ts`) |
 * | la langue de notre prose, mémorisée | `src/i18n/preference.ts`, `src/i18n/languages.ts` |
 * | le repli d'un catalogue de l'APK sur ce qu'il porte | `catalogLanguage` (`src/catalog/widgetCatalog.ts`) |
 * | notre prose passée à une couche, jamais lue par elle | `Translator` (`src/i18n/translate.ts`) |
 *
 * Les deux axes ne se rencontrent **jamais dans une variable** : un écran reçoit `tr`
 * (notre prose) et `language` (les libellés de XCTrack) côte à côte, sous deux noms, et
 * aucun chemin de code ne peut faire bouger l'un en touchant l'autre.
 *
 * ## Les deux endroits où les deux se rencontrent quand même
 *
 * 1. **Les chemins du menu de l'appareil** — « *Réglages → Exporter la configuration* ».
 *    Ce sont des mots de notre prose (« ouvrez… ») autour de mots de XCTrack. Ils doivent
 *    suivre l'axe `labels`, sans quoi on renvoie le pilote vers un menu qui n'existe pas
 *    sur son écran. Ce cas se traite message par message, jamais par une règle générale :
 *    la prose passe par le catalogue, le nom du menu se lit dans le catalogue de
 *    préférences, à la langue `labels`.
 * 2. **Le rendu d'une page** (`src/render/`). Le dessin imite l'écran de l'instrument :
 *    tout ce qu'il peint suit l'axe `labels`, y compris les textes que XCTrack écrit lui-même
 *    dans une langue et qu'il ne nous appartient pas de traduire. Mais le rendu **ajoute**
 *    deux étiquettes de survol qui ne sont pas sur l'appareil — l'action d'un bouton, la
 *    bande réservée aux messages — et celles-là sont notre prose : elles suivent l'axe
 *    `ui`. C'est pourquoi `renderPage` reçoit `language` **et** `tr`. La règle de partage
 *    est écrite en tête de `src/render/canvas.ts`.
 *
 * ## Ce que ce fichier a été, et pourquoi il ne l'est plus
 *
 * Il a porté un type `LanguageAxes` et cinq fonctions (`languageAxes`, `withUiLanguage`,
 * `withLabelLanguage`, `initialAxes`) qui tenaient les deux axes dans un seul objet. La
 * revue du 22 août 2026 a établi deux faits : **aucun module ne les appelait** — le seul
 * importeur de valeur était le baril `index.ts`, que personne ne consommait pour ces
 * liaisons —, et le modèle qu'elles portaient avait **divergé** du modèle vivant, qui
 * connaît trois sources de libellés là où `LanguageAxes` n'en modélisait aucune.
 *
 * Un fichier mort qui décrit faussement un principe vivant est pire qu'un fichier absent :
 * `src/i18n/CLAUDE.md` le désignait comme la référence « à ne pas rejuger », et le lecteur
 * suivant aurait écrit `withLabelLanguage(axes, …)` pour découvrir qu'aucun `LanguageAxes`
 * ne circule — ou pire, en aurait mis un en circulation à côté de `currentUiLanguage`,
 * créant une seconde source de vérité pour la langue des libellés.
 *
 * L'API est donc supprimée. **Le document reste** : quinze modules le citent en docblock,
 * c'est le texte le plus lu du dépôt, et le déplacer aurait laissé vingt-six renvois dans
 * le vide. Ce qu'il affirme est désormais **tenu par un test** — `tests/i18n/axes.test.ts`
 * vérifie que chaque module et chaque symbole nommés ci-dessus existent, et que les deux
 * axes ne se touchent pas dans le code vivant. La prochaine dérive sera rouge.
 */

// Aucune surface d'exécution : ce module est un document. `export {}` le garde module
// plutôt que script global, pour que rien ne puisse y déclarer un symbole par mégarde.
export {}
