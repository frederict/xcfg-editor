/**
 * # Le nom d'une version de XCTrack, tel que le pilote le lit sur son appareil
 *
 * Les archives d'où viennent nos catalogues portent le nom qu'un `git describe` a produit
 * au moment de la construction : `1.0.3-beta-5-gc036d8f2c`, `1.0.0-RC1-31-g598cd4ebb`.
 * L'appareil, lui, affiche `1.0.3-beta`.
 *
 * Le suffixe est donc **notre** information, pas la sienne — et deux écrans qui ne le
 * traitaient pas pareil nommaient la même version de deux façons : le catalogue des
 * préférences annonçait « XCTrack 1.0.3-beta-5-gc036d8f2c », le relevé des gadgets
 * « XCTrack 1.0.3-beta ». Un pilote qui voit deux noms en conclut qu'il y a deux
 * versions, et cherche laquelle est la sienne.
 *
 * Ce module est le seul endroit qui tranche. `ui/versionDiagnostic.ts` s'en sert pour
 * bâtir son menu, `ui/preferencesPage.ts` pour dater son catalogue.
 */

/**
 * Le suffixe qu'un `git describe` colle au nom d'une version :
 * `-<nombre de commits>-g<empreinte>`.
 *
 * L'ôter rend au pilote un nom qu'il reconnaît. Le garder **à part** plutôt que le perdre
 * a sa raison : deux constructions du même nom se distinguent par lui, et par rien
 * d'autre — c'est ce qui permet au menu des versions de ne le remettre que là où il
 * lève une ambiguïté.
 */
export function splitVersionName(name: string): { release: string; build: string | null } {
  const match = /^(.+)-(\d+-g[0-9a-f]{6,})$/.exec(name)
  if (match === null) return { release: name, build: null }
  return { release: match[1] as string, build: match[2] as string }
}

/** Le nom seul, sans le suffixe de construction : celui que l'appareil affiche. */
export function releaseName(name: string): string {
  return splitVersionName(name).release
}
