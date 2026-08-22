import rawNavigationLabels from './navigationLabels.json'

/**
 * # Les cinq navigations, avec les mots de XCTrack
 *
 * Une page d'un fichier `.xcfg` déclare pour quelles **navigations** l'appareil l'affiche,
 * sous forme de noms de classes : `org.xcontest.XCTrack.navig.TaskBackToTakeoff`,
 * `…TaskTriangleClosing`, `…TaskToWaypoint`, `…TaskCompetition`, `…TaskToLivePilot`. Ce
 * module dit comment l'appareil, lui, les **nomme à l'écran**.
 *
 * Ce sont donc des libellés de XCTrack : ils suivent l'axe `labels` — la langue du fichier
 * ouvert — et jamais celle de notre interface. Voir `src/i18n/axes.ts`.
 *
 * ## Ce qui est mesuré, et ce qui est déduit
 *
 * **Mesuré** : les cinq textes, dans toutes les langues que porte l'APK. Ils viennent des
 * ressources de XCTrack 1.0.3-beta5 (`versionCode` 100 030), sous les clés `navTakeoff`,
 * `navTriangleClosing`, `navWaypoint2`, `navCompetition` et `navLivePilot` — la locale par
 * défaut de l'APK y est rendue sous le code `en`, comme dans `widgetLabels.json`.
 *
 * **Déduit** : l'appariement entre la classe écrite dans le fichier et la clé de ressource.
 * Il ne se lit nulle part — le `.dex` est obfusqué, et les noms `Task*` n'y survivent pas.
 * Il repose sur la correspondance des noms et sur le fait que la boîte « Choisissez les
 * types de navigations » n'en propose que cinq. C'est solide, ce n'est pas un relevé, et
 * cela se dit.
 *
 * ## Ce qui a été corrigé le 2026-08-22
 *
 * Ces cinq libellés étaient **notre prose**, versée au catalogue `pages` sous
 * `navigation.*` et traduite en cinq langues. Quatre des cinq ne disaient pas ce que
 * l'appareil dit :
 *
 * | Ce que nous écrivions | Ce que l'appareil affiche |
 * |---|---|
 * | Fermeture de triangle | **Triangle achevant** |
 * | Vers une balise | **Balises/Navigation XC** |
 * | Compétition | **Manche de compétition** |
 * | Vers un pilote en direct | **Pilote Live** |
 * | Retour au décollage | Retour au décollage — le seul qui coïncidait |
 *
 * ## ⚠️ Aucun script public ne régénère ce fichier
 *
 * `src/catalog/navigationLabels.json` a été transcrit à la main depuis le relevé complet
 * de la version 1.0.3-beta5. Les autres catalogues du dossier, eux, se régénèrent depuis
 * un APK décompressé (`tools/extract-*.py`) : ces cinq clés-ci n'ont pas encore leur
 * script. Qui en écrira un trouvera tout ce qu'il faut ci-dessus — cinq clés de ressource,
 * la même règle de repli pour la locale par défaut que `extract-widget-labels.py`.
 */
const NAVIGATION_LABELS = rawNavigationLabels as Record<string, Record<string, string>>

/** Les cinq classes de navigation connues, dans l'ordre où la boîte de l'appareil les range. */
export const NAVIGATION_CLASSES: readonly string[] = [
  'TaskBackToTakeoff',
  'TaskTriangleClosing',
  'TaskToWaypoint',
  'TaskCompetition',
  'TaskToLivePilot'
]

/**
 * Le nom qu'une navigation porte sur l'appareil, dans la langue demandée — celle du
 * fichier ouvert, jamais celle de notre interface.
 *
 * Ordre de résolution, le même que `readableName` pour les gadgets :
 *
 * 1. le libellé dans la langue demandée ;
 * 2. à défaut, **l'anglais** — et ce n'est pas un pis-aller : c'est la locale par défaut
 *    de l'APK, celle qu'Android sert lui-même quand la traduction manque. Un pilote
 *    néerlandais lit « Live pilot » dans la boîte de XCTrack, parce que `navLivePilot`
 *    n'existe pas en `nl` dans les ressources ; il le lit donc ici aussi. La règle de
 *    repli d'Android est documentée, elle n'a pas été mesurée sur l'appareil ;
 * 3. à défaut, le **nom court tel quel** — une navigation qu'aucune version relevée ne
 *    documente reste nommée plutôt que d'être escamotée.
 *
 * Comparaison **exacte** de la langue, comme partout ailleurs dans `src/catalog/` : `fr-FR`
 * ne retombe pas sur `fr` mais sur l'anglais. Cette limite est connue et volontairement
 * identique dans les quatre modules, plutôt que corrigée ici seul.
 */
export function navigationLabel(shortName: string, language: string): string {
  const labels = NAVIGATION_LABELS[shortName]
  if (labels === undefined) return shortName
  return labels[language] ?? labels.en ?? shortName
}

/**
 * Vrai si la langue demandée porte ce libellé en propre — faux quand `navigationLabel`
 * rend l'anglais par repli, ou le nom court.
 *
 * Sert aux tests et à qui voudra dire au pilote que le mot affiché n'est pas dans sa
 * langue. Ce qui n'est pas mesuré ne s'invente pas : il vaut mieux pouvoir le constater
 * que le supposer.
 */
export function hasNavigationLabel(shortName: string, language: string): boolean {
  return NAVIGATION_LABELS[shortName]?.[language] !== undefined
}
