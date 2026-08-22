/**
 * Couper un nom de fichier en **ce qui peut s'effacer** et **ce qui ne doit jamais
 * s'effacer**.
 *
 * ## Le défaut que ce module corrige
 *
 * La barre de tête affichait le nom du fichier tronqué par la fin, à l'ellipse ordinaire
 * de `text-overflow`. Sur les exports de XCTrack, c'est exactement le mauvais bout :
 *
 * ```
 * 2026-08-20_backup-00.xcfg            → « 2026-08-20_backu… »
 * 2026-08-20_backupwithmedia-00.xczfg  → « 2026-08-20_backu… »
 * ```
 *
 * Un pilote-testeur l'a mesuré le 2026-08-22 : deux fichiers différents, deux affichages
 * identiques, et « il faut survoler pour savoir sur lequel je travaille ». Le début d'un
 * export est une date, commune à tout ce qui a été exporté le même jour ; **la fin porte
 * le format, le rang et l'extension**, c'est-à-dire tout ce qui distingue.
 *
 * ## La coupe, en TROIS et non en deux
 *
 * La coupe en deux ne suffisait pas, et le pilote-testeur l'a mesuré le lendemain :
 *
 * ```
 * 1 024 px, édition       : 2026-08-20_backup-00.xcfg           → « 20…_backup-00.xc… »
 * 1 280 px, consultation  : 2026-08-20_backupwithmedia-00.xczfg → « _backupwithmedia-00.xc… »
 * ```
 *
 * **C'est l'extension qui tombe** — précisément ce qui distingue une configuration d'une
 * archive, la distinction que la coupe cherchait à sauver. Et ce n'est **pas** un défaut
 * de la coupe : mesuré au navigateur le 2026-08-22, la tête s'efface bien entièrement
 * (0 px de large), et c'est la **queue seule** qui manque de place — 181 px demandés pour
 * 173,4 px accordés à 1 280 px de fenêtre, 130 px à 1 024 px en édition. Il n'y a plus
 * rien à prendre à la tête : c'est la queue qui est trop longue pour la barre.
 *
 * La queue se coupe donc à son tour, au **dernier tiret avant le point**, et ce qui suit
 * ne cède jamais :
 *
 * | nom | tête (cède la 1re) | corps (cède ensuite) | queue (ne cède pas) |
 * |---|---|---|---|
 * | `2026-08-20_backup-00.xcfg` | `2026-08-20` | `_backup` | `-00.xcfg` |
 * | `2026-08-20_backupwithmedia-00.xczfg` | `2026-08-20` | `_backupwithmedia` | `-00.xczfg` |
 * | `xctrack_2026-08-22-130205_backup.xcfg` | `xctrack_2026-08-22-130205` | `_backup` | `.xcfg` |
 *
 * **Pourquoi le rang part avec l'extension.** Deux exports du même jour, du même genre,
 * ne diffèrent que par lui : `_backup-00.xcfg` et `_backup-01.xcfg`. Le sacrifier
 * ramènerait exactement le défaut que ce module existe pour corriger — deux fichiers
 * différents, un seul affichage.
 *
 * **Pourquoi le corps cède avant.** `withmedia` est la seule chose du nom qui soit
 * redondante : `.xczfg` le dit déjà, et le dit mieux, puisque c'est le format qui fait foi.
 *
 * Le premier `_` donnerait `xctrack` en tête et garderait l'horodatage entier en queue —
 * l'inverse de ce qu'on veut. À défaut de `_`, on se rabat sur le dernier `-`, puis sur le
 * point de l'extension : un nom sans aucun séparateur n'a pas de milieu à sacrifier et
 * ressort entier en queue.
 *
 * ⚠️ **Ce module ne tronque rien.** Il rend trois morceaux ; c'est la feuille de style qui
 * décide lequel cède — voir les trois `flex` d'`app.css`. Une troncature calculée ici
 * serait fausse dès le premier changement de police ou de langue.
 */

/**
 * Un nom de fichier en trois morceaux. Les recoller rend le nom d'origine, à l'octet près.
 */
export interface FileNameParts {
  /** Le début, commun à tous les exports d'une même journée : il cède en premier. */
  head: string
  /**
   * Le genre de l'export — `_backup`, `_backupwithmedia`, `_pages`. Il cède en second :
   * c'est la seule part du nom dont la queue redise déjà quelque chose.
   */
  body: string
  /**
   * Le rang et l'extension : **ce qui ne cède jamais**. Deux exports du même jour et du
   * même genre ne diffèrent que par le rang, et `.xcfg` contre `.xczfg` est toute la
   * différence entre une configuration et une archive qui emporte les médias.
   */
  tail: string
}

/**
 * Coupe le nom en trois, de sorte que `head + body + tail` rende exactement le nom reçu —
 * vide compris.
 */
export function fileNameParts(name: string): FileNameParts {
  const underscore = name.lastIndexOf('_')
  const dash = name.lastIndexOf('-')
  const dot = name.lastIndexOf('.')
  // Dans cet ordre, et pas dans celui des positions : un `-` plus tardif qu'un `_` est un
  // séparateur de rang (`-00`), et couper là ne laisserait que « -00.xcfg » en queue.
  const cut = underscore > 0 ? underscore : (dash > 0 ? dash : (dot > 0 ? dot : 0))
  const rest = name.slice(cut)
  const kept = keptIndex(rest)
  return { head: name.slice(0, cut), body: rest.slice(0, kept), tail: rest.slice(kept) }
}

/**
 * Où commence, dans ce qui reste, **ce qui ne cède jamais** : le dernier tiret avant le
 * point, à défaut le point lui-même.
 *
 * « Avant le point », et non « le dernier tiret » : sur `backup.xcfg-copie`, le dernier
 * tiret est après l'extension, et couper là laisserait `.xcfg` du côté qui s'efface.
 *
 * Sans point, il n'y a pas d'extension à protéger et rien à retrancher : tout le morceau
 * est la queue, comme avant ce module.
 */
function keptIndex(rest: string): number {
  const dot = rest.lastIndexOf('.')
  if (dot < 0) return 0
  const dash = rest.lastIndexOf('-', dot)
  return dash < 0 ? dot : dash
}
