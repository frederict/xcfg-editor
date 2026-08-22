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
 * ## La coupe
 *
 * Au **dernier** `_`, et c'est mesuré sur les deux façons de nommer que ce projet
 * rencontre :
 *
 * | nom | tête (peut s'effacer) | queue (reste) |
 * |---|---|---|
 * | `2026-08-20_backup-00.xcfg` | `2026-08-20` | `_backup-00.xcfg` |
 * | `2026-08-20_backupwithmedia-00.xczfg` | `2026-08-20` | `_backupwithmedia-00.xczfg` |
 * | `xctrack_2026-08-22-130205_backup.xcfg` | `xctrack_2026-08-22-130205` | `_backup.xcfg` |
 *
 * Le premier `_` donnerait `xctrack` en tête et garderait l'horodatage entier en queue —
 * l'inverse de ce qu'on veut. À défaut de `_`, on se rabat sur le dernier `-`, puis sur le
 * point de l'extension : un nom sans aucun séparateur n'a pas de milieu à sacrifier et
 * ressort entier en queue.
 *
 * ⚠️ **Ce module ne tronque rien.** Il rend deux morceaux ; c'est la feuille de style qui
 * décide lequel cède — `.app-bar__fileHead` porte un `flex-shrink` très supérieur à celui
 * de la queue. Une troncature calculée ici serait fausse dès le premier changement de
 * police ou de langue.
 */

/** Un nom de fichier en deux morceaux. Les recoller rend le nom d'origine, à l'octet près. */
export interface FileNameParts {
  /** Le début, commun à tous les exports d'une même journée : il cède en premier. */
  head: string
  /** La fin, qui porte le format, le rang et l'extension : elle ne cède qu'en dernier. */
  tail: string
}

/**
 * Coupe le nom au dernier séparateur, de sorte que `head + tail` rende exactement le nom
 * reçu — vide compris.
 */
export function fileNameParts(name: string): FileNameParts {
  const underscore = name.lastIndexOf('_')
  const dash = name.lastIndexOf('-')
  const dot = name.lastIndexOf('.')
  // Dans cet ordre, et pas dans celui des positions : un `-` plus tardif qu'un `_` est un
  // séparateur de rang (`-00`), et couper là ne laisserait que « -00.xcfg » en queue.
  const cut = underscore > 0 ? underscore : (dash > 0 ? dash : (dot > 0 ? dot : 0))
  return { head: name.slice(0, cut), tail: name.slice(cut) }
}
