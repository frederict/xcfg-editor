import rawHardwareKeyLabels from './hardwareKeyLabels.json'

/**
 * # Les touches physiques, avec les mots de XCTrack
 *
 * Une liaison de touche d'un `.xcfg` porte un **code Android** — 24, 25, 26. Ce module dit
 * comment XCTrack, lui, **nomme ces touches à l'écran** : « Augmenter le volume »,
 * « Diminuer le volume », « Mise en route ».
 *
 * Ce sont donc des libellés de XCTrack : ils suivent l'axe `labels` — la langue du fichier
 * ouvert — et jamais celle de notre interface. Voir `src/i18n/axes.ts`.
 *
 * ## Ce qui a été corrigé le 2026-08-22
 *
 * Ces trois noms étaient **notre prose**, écrite en français dans le relevé matériel de
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
 * ## Ce qui est mesuré, et ce qui est déduit
 *
 * **Mesuré — les textes.** Les trois ressources de XCTrack 1.0.3-beta5 (`versionCode`
 * 100 030), dans les 32 locales qui les portent, la locale par défaut de l'APK étant
 * rendue sous le code `en` comme dans `widgetLabels.json` et `navigationLabels.json`. Les
 * 55 relevés les portent tous les trois, dans les 32 mêmes locales, et **un seul texte a
 * bougé** en 55 versions : le basque de `keyVolumeDown`, « Bollumena jaitsi » devenu
 * « Bolumena jaitsi ». C'est la version la plus récente qui est retenue.
 *
 * **Mesuré — l'appariement du code 24.** L'écran natif de XCTrack, mis en regard d'une
 * configuration portant `Keys.PreviousPage = 16777240` (= 24 | 0x1000000), affiche
 * « Appui long : Augmenter le volume » — et « Augmenter le volume » est exactement
 * `keyVolumeUp` en français. C'est la même observation qui fonde
 * `LONG_PRESS_BIT_BASIS`.
 *
 * **Déduit — l'appariement de 25 et de 26.** `KEYCODE_VOLUME_DOWN` avec `keyVolumeDown`,
 * `KEYCODE_POWER` avec `keyPower` : la correspondance des noms, et rien de plus. C'est
 * solide, ce n'est pas un relevé, et cela se dit.
 *
 * ## ⚠️ Ce que cette table ne contient pas, et pourquoi
 *
 * XCTrack nomme d'autres touches — `keyBack`, `keyCamera`, `keyUp`, `keyMenu`, une
 * trentaine en tout — et porte même de quoi nommer celles qu'il ne connaît pas
 * (`keyExtShort` = « Touche externe »). **Aucune mesure ne dit lequel de ces mots son
 * écran choisit pour un code donné**, et le `.dex` est obfusqué. Trois codes sont donc
 * appariés ici, et trois seulement : ce sont ceux dont une touche a été pressée à la main,
 * et pour lesquels l'appariement se justifie.
 *
 * Un code absent de cette table garde son nom Android (`KEYCODE_STEM_2`) — voir
 * `bindingParts` dans `src/ui/preferencesPage.ts`. Un nom manquant est une mesure qui
 * manque, jamais une touche qui n'existerait pas.
 *
 * ## ⚠️ Aucun script public ne régénère ce fichier
 *
 * `src/catalog/hardwareKeyLabels.json` a été extrait du relevé complet de la version
 * 1.0.3-beta5, comme `navigationLabels.json` et pour la même raison : les `tools/extract-*`
 * du dépôt partent d'un APK décompressé, et ces trois clés-ci n'ont pas encore leur script.
 * Qui en écrira un trouvera tout ce qu'il faut ci-dessus.
 */
const HARDWARE_KEY_LABELS = rawHardwareKeyLabels as Record<string, Record<string, string>>

/**
 * Le code Android d'une touche, et la ressource de XCTrack qui la nomme.
 *
 * ⚠️ **Trois entrées, et pas une de plus sans justification.** Ajouter un code ici, c'est
 * affirmer que l'écran de XCTrack emploie ce mot-là pour ce code-là. Pour 24, c'est
 * mesuré ; pour 25 et 26, c'est déduit de la correspondance des noms ; au-delà, ce serait
 * deviné.
 */
export const HARDWARE_KEY_RESOURCES: Readonly<Record<number, string>> = {
  24: 'keyVolumeUp',
  25: 'keyVolumeDown',
  26: 'keyPower'
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
