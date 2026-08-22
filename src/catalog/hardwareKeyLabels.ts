import rawHardwareKeyLabels from './hardwareKeyLabels.json'

/**
 * # Les touches physiques, avec les mots de XCTrack
 *
 * Une liaison de touche d'un `.xcfg` porte un **code Android** — 24, 25, 26, 27. Ce
 * module dit comment XCTrack, lui, **nomme ces touches à l'écran** : « Augmenter le
 * volume », « Diminuer le volume », « Mise en route », « Caméra ».
 *
 * Ce sont donc des libellés de XCTrack : ils suivent l'axe `labels` — la langue du fichier
 * ouvert — et jamais celle de notre interface. Voir `src/i18n/axes.ts`.
 *
 * ## Ce qui a été corrigé le 2026-08-22, au matin
 *
 * Trois de ces noms étaient **notre prose**, écrite en français dans le relevé matériel de
 * `preferenceDomains.json` sous `keyCodes.hardwareKeys[].label` : « volume haut »,
 * « volume bas », « marche/arrêt ». Ils y étaient tenus pour une **donnée de mesure**, et
 * restaient donc en français dans les cinq langues d'interface.
 *
 * Deux choses avaient été confondues, et la seconde n'était pas une mesure :
 *
 * - **ce qui a été mesuré** : une touche du boîtier, pressée à la main, émet le code 24 sur
 *   l'AIR³ 7.2. Cela ne se traduit pas, et c'est resté où c'était — `hardwareKeys[].keys`,
 *   sans un mot de prose ;
 * - **le mot pour la nommer** : rien n'a été relevé en français. « volume haut » était
 *   notre façon de dire la mesure, et un anglophone lisait du français.
 *
 * La correction n'est pas de traduire ces trois mots en cinq langues : ce serait
 * **inventer** un nom là où XCTrack en porte déjà un. `keyVolumeUp`, `keyVolumeDown` et
 * `keyPower` sont des ressources de l'APK, en 32 langues, et ce sont elles que le pilote
 * lit sur l'écran natif de réglage des touches. Un mot de nous, même bien traduit, serait
 * un mot qu'il ne trouverait **nulle part** sur son appareil.
 *
 * C'est exactement la correction du même jour sur les cinq noms de navigation — voir
 * `navigationLabels.ts`, et `src/i18n/CLAUDE.md` § 7.1.
 *
 * ## Ce qui a changé le 2026-08-22, au soir : la table est **lue**, plus déduite
 *
 * Ce fichier n'a longtemps apparié que trois codes, et disait pourquoi : « aucune mesure
 * ne dit lequel de ces mots l'écran de XCTrack choisit pour un code donné, et le `.dex`
 * est obfusqué ». **La seconde moitié de cette phrase était fausse.** L'obfuscation
 * renomme les classes et les méthodes ; elle ne cache pas les entiers. Le code d'une
 * touche et l'identifiant de la ressource qui la nomme sont deux entiers littéraux, posés
 * côte à côte dans le bytecode, et un `dexdump` les rend lisibles.
 *
 * Ils l'ont été. Dans l'APK installé sur l'AIR³ 7.2 — `org.xcontest.XCTrack`, `1.0.3-beta`,
 * `versionCode` 100 030, celui-là même dont le relevé de textes est déjà au catalogue —
 * la classe `th4` construit dans son `<clinit>` une table statique de **24 paires**
 * `(code, identifiant de ressource)`, et sa méthode `a(Integer)` est ce qui nomme une
 * touche à l'écran :
 *
 * 1. code absent (`null`) → `keyNone` ;
 * 2. le bit `0x01000000` est ôté du code **avant** la recherche, et le texte `keyLongPress`
 *    est mis devant à la fin — c'est la même observation que `LONG_PRESS_BIT_BASIS`, lue
 *    cette fois dans le bytecode ;
 * 3. une première table rend un **caractère** pour les touches de clavier (les chiffres,
 *    les 26 lettres, `@`) ;
 * 4. à défaut, la table des 24 paires rend une ressource de texte — c'est celle qui est
 *    reprise ici ;
 * 5. à défaut de tout, XCTrack affiche **le nombre nu**. C'est ce que le pilote voit sur
 *    son écran natif pour 266.
 *
 * Les 21 codes Android de cette table sont donc **lus**, et non plus devinés. Ils tombent
 * un à un sur la constante `KEYCODE_*` que leur nom annonce — 3 sur `keyHome`, 19 sur
 * `keyUp`, 64 (`KEYCODE_EXPLORER`) sur `keyBrowser` —, ce qui vaut contrôle : une
 * simulation fautive n'aurait pas produit vingt et une coïncidences.
 *
 * ⚠️ **Trois entrées de la table ne sont pas ici, et c'est délibéré** : `-2` (`keyProximity`),
 * `-3` (`keyExtShort`) et `-4` (`keyExtLong`) ne sont pas des codes Android mais des
 * valeurs propres à XCTrack, et aucun fichier du corpus n'en porte. Deux plages de codes
 * négatifs, lues dans la même méthode, nomment de la même façon les télécommandes
 * AeroRemote et MipFly ; elles ne sont pas modélisées non plus.
 *
 * ⚠️ **Les touches de clavier gardent leur nom Android.** Pour le code 51, XCTrack affiche
 * « W » — le caractère de sa première table, qui passe avant celle-ci. Notre écran
 * affichera `KEYCODE_W`. Ce n'est pas faux, c'est moins précis ; aucun boîtier relevé ne
 * porte de telle touche, et le jour où l'un en portera, c'est cette table-là qu'il faudra
 * lire aussi.
 *
 * ## Ce qui est mesuré, et ce qui l'est de deux façons
 *
 * **Mesuré — les textes.** Les 21 ressources de XCTrack 1.0.3-beta5 (`versionCode`
 * 100 030), dans les locales qui les portent : 32 pour dix-huit d'entre elles, 30 pour
 * `keyMediaNext` et `keyMediaPrev`, 28 pour `keyMediaPlayPause`. La locale par défaut de
 * l'APK est rendue sous le code `en`, comme dans `widgetLabels.json` et
 * `navigationLabels.json`. Vingt de ces ressources figurent dans les 55 relevés,
 * `keyMediaPlayPause` dans 50 ; le jeu de locales s'est étoffé au fil des versions — le
 * bosniaque manque aux treize plus anciennes — et **deux textes ont bougé** : l'espagnol de
 * `keyHome` (« Home » devenu « Inicio ») et le basque de `keyVolumeDown` (« Bollumena
 * jaitsi » devenu « Bolumena jaitsi »). C'est la version la plus récente qui est retenue.
 *
 * **Mesuré deux fois — l'appariement du code 24.** L'écran natif de XCTrack, mis en regard
 * d'une configuration portant `Keys.PreviousPage = 16777240` (= 24 | 0x1000000), affiche
 * « Appui long : Augmenter le volume » — et « Augmenter le volume » est exactement
 * `keyVolumeUp` en français. C'est la même observation qui fonde `LONG_PRESS_BIT_BASIS`,
 * et le bytecode dit maintenant la même chose. Deux mesures indépendantes qui concordent :
 * c'est ce qui donne confiance dans les vingt autres.
 *
 * ## ⚠️ Ce que cette table ne dit toujours pas
 *
 * Elle dit quel **mot** XCTrack emploie pour un code. Elle ne dit rien de ce que le
 * boîtier du pilote **porte** : « Caméra » nomme le code 27, et sur l'AIR³ 7.2 ce code
 * sort du premier des deux boutons sous l'appareil — qui n'est pas un déclencheur photo.
 * Le nom vient de XCTrack, la touche vient du relevé matériel, et les deux ne se
 * confondent pas. Voir `keyCodeEvidence()` dans `preferenceDomains.ts`.
 *
 * ## ⚠️ Aucun script public ne régénère ce fichier
 *
 * `src/catalog/hardwareKeyLabels.json` a été extrait du relevé complet de la version
 * 1.0.3-beta5, comme `navigationLabels.json` et pour la même raison : les `tools/extract-*`
 * du dépôt partent d'un APK décompressé, et ces clés-ci n'ont pas encore leur script.
 * C'est une dette. La recette, elle, ne se devine plus :
 *
 * ```sh
 * adb shell pm path org.xcontest.XCTrack        # puis adb pull du base.apk
 * unzip -o base.apk 'classes*.dex'
 * $ANDROID_SDK/build-tools/36.0.0/dexdump -d classes3.dex > classes3.txt
 * $ANDROID_SDK/build-tools/36.0.0/aapt dump --values resources base.apk \
 *   | grep 'string/key'                         # les identifiants 0x7f1302xx
 * grep -n '7f130233' classes3.txt               # keyCamera : le code est juste au-dessus
 * ```
 */
const HARDWARE_KEY_LABELS = rawHardwareKeyLabels as Record<string, Record<string, string>>

/**
 * Le code Android d'une touche, et la ressource de XCTrack qui la nomme.
 *
 * **Les 21 codes Android de la table de XCTrack**, lue dans le bytecode de 1.0.3-beta —
 * classe `th4`, `<clinit>`, la table statique de 24 paires que `th4.a(Integer)` consulte.
 * Ce n'est plus une correspondance de noms : c'est la table que l'application emploie.
 *
 * ⚠️ **Un code absent d'ici n'est pas une touche qui n'existerait pas.** C'est un code que
 * XCTrack ne nomme pas — il en affiche alors le nombre nu, et nous son nom Android.
 */
export const HARDWARE_KEY_RESOURCES: Readonly<Record<number, string>> = {
  3: 'keyHome',
  4: 'keyBack',
  5: 'keyCall',
  6: 'keyEndCall',
  19: 'keyUp',
  20: 'keyDown',
  21: 'keyLeft',
  22: 'keyRight',
  23: 'keyCenter',
  24: 'keyVolumeUp',
  25: 'keyVolumeDown',
  26: 'keyPower',
  27: 'keyCamera',
  61: 'keyTab',
  62: 'keySpace',
  64: 'keyBrowser',
  66: 'keyEnter',
  82: 'keyMenu',
  85: 'keyMediaPlayPause',
  87: 'keyMediaNext',
  88: 'keyMediaPrev'
}

/**
 * Le nom que XCTrack donne à cette touche, dans la langue demandée — celle du fichier
 * ouvert, jamais celle de notre interface. `null` quand nous ne savons pas nommer ce
 * code : **il n'y a alors rien à afficher**, et surtout pas un mot de nous.
 *
 * Ordre de résolution, le même que `navigationLabel` et que `readableName` :
 *
 * 1. le libellé dans la langue demandée ;
 * 2. à défaut, **l'anglais** — la locale par défaut de l'APK, celle qu'Android sert
 *    lui-même quand la traduction manque, et donc celle que le pilote voit ;
 * 3. à défaut, `null`.
 *
 * Comparaison **exacte** de la langue, comme partout ailleurs dans `src/catalog/` : `fr-FR`
 * ne retombe pas sur `fr` mais sur l'anglais. Cette limite est connue et volontairement
 * identique dans les cinq modules, plutôt que corrigée ici seul.
 */
export function hardwareKeyLabel(code: number, language: string): string | null {
  const resource = HARDWARE_KEY_RESOURCES[code]
  if (resource === undefined) return null
  const labels = HARDWARE_KEY_LABELS[resource]
  if (labels === undefined) return null
  return labels[language] ?? labels.en ?? null
}

/**
 * Vrai si la langue demandée porte ce libellé en propre — faux quand `hardwareKeyLabel`
 * rend l'anglais par repli, ou rien du tout.
 *
 * Sert aux tests et à qui voudra dire au pilote que le mot affiché n'est pas dans sa
 * langue. Ce qui n'est pas mesuré ne s'invente pas : il vaut mieux pouvoir le constater
 * que le supposer.
 */
export function hasHardwareKeyLabel(code: number, language: string): boolean {
  const resource = HARDWARE_KEY_RESOURCES[code]
  return resource !== undefined && HARDWARE_KEY_LABELS[resource]?.[language] !== undefined
}
