import type { Widget } from '../model/widget'
import { readBoolean, readNumber, readString } from '../core/access'
import { defaultValueAt } from '../catalog/widgetDefaults'

/**
 * Ce que XCTrack **complète** à la lecture, vu depuis le rendu.
 *
 * ## Le défaut que ce module supprime
 *
 * Un `.xcfg` ne porte pas toutes les options d'un widget : XCTrack complète les clés
 * absentes par ses valeurs par défaut au moment où il relit le fichier. Jusqu'ici,
 * `src/render/` ne consultait **jamais** le relevé de ces valeurs
 * (`src/catalog/widgetDefaults.json`) : il dessinait chaque widget comme si une clé
 * absente n'existait pas. Un fichier écrit par notre propre éditeur — qui n'écrit que
 * les huit clés universelles — se dessinait donc autrement que sur l'appareil.
 *
 * Les écarts que cela produisait, tous mesurés sur la planche des 75 widgets
 * (`docs/reference/2026-08-21-revue-visuels.md` § 1.4) :
 *
 * | l'appareil écrit | nous écrivions | clé |
 * |---|---|---|
 * | « Vitesse verticale / 2s », « Vario netto / 0,1s » | sans suffixe | `avg`, `netto_avg` |
 * | « Vitesse Air TAS », « Tps Pt suivant GS » | sans suffixe | `speed_type` |
 * | « Hauteur Pt suivant AGL » | sans suffixe | `altitude` |
 * | `[37] m`, `[∞]`, `[-27] m` | `12,4 km`, `15:47`, `1800 m` | `use_brackets` |
 * | la barre d'état entière | **rien** | `showGps`, `showSensors`, … |
 *
 * Ce n'est pas cosmétique : un suffixe de titre et une paire de crochets **changent la
 * largeur occupée**, et c'est précisément ce que le pilote juge en composant sa page.
 *
 * ## Pourquoi un module, et pas une constante par widget
 *
 * `numeric.ts` portait déjà deux constantes en dur (`TITLE_BY_DEFAULT`,
 * `UNIT_BY_DEFAULT`) issues du même relevé, et `statusLine.ts` avait raté la même
 * correction. Une valeur par défaut recopiée à la main dans un dessin est un doublon qui
 * se périme en silence — le relevé, lui, est daté et régénérable. Passer par ce module
 * fait que **le prochain widget dessiné hérite du bon comportement sans qu'on y pense**,
 * ce qui est la seule façon d'empêcher le défaut de se reproduire.
 *
 * ## Le poids que cela déplace, et où il tombe
 *
 * `widgetDefaults.json` fait 14 Kio bruts (9,9 Kio compactés, 3,1 Ko compressés). Il vivait
 * dans un morceau chargé à la demande, dépendance des seuls `ui/properties.ts` et
 * `ui/widgetPalette.ts`. Le moteur de rendu étant dans le morceau principal, ce module
 * fait entrer la table dans le chargement initial : voir le rapport de tâche pour les
 * tailles avant/après. C'est le prix d'un rendu fidèle dès le premier écran ; aucune
 * autre solution ne le paie moins cher, un rendu étant synchrone et ne pouvant donc pas
 * attendre un `import()`.
 *
 * ## Ce que ce module ne fait PAS
 *
 * Il ne complète **jamais** le document : le fichier reste octet pour octet ce qu'il
 * était. Il ne fait que répondre « ce que XCTrack lirait ici », à l'usage du dessin.
 */

/**
 * La valeur effective d'une clé booléenne : celle du fichier si elle y est, sinon celle
 * du relevé. `undefined` quand ni l'un ni l'autre ne la porte — un troisième état, pas
 * un `false` déguisé : c'est à l'appelant de dire ce qu'il fait d'une clé dont personne
 * ne sait rien (le relevé ignore les types apparus après lui).
 */
export function widgetBoolean(widget: Widget, key: string): boolean | undefined {
  const written = readBoolean(widget.node, key)
  if (written !== undefined) return written
  const fallback = defaultValueAt(widget.shortName, key)
  return typeof fallback === 'boolean' ? fallback : undefined
}

/** Même règle que `widgetBoolean`, pour une clé numérique. */
export function widgetNumber(widget: Widget, key: string): number | undefined {
  const written = readNumber(widget.node, key)
  if (written !== undefined) return written
  const fallback = defaultValueAt(widget.shortName, key)
  return typeof fallback === 'number' ? fallback : undefined
}

/** Même règle que `widgetBoolean`, pour une clé de type chaîne. */
export function widgetString(widget: Widget, key: string): string | undefined {
  const written = readString(widget.node, key)
  if (written !== undefined) return written
  const fallback = defaultValueAt(widget.shortName, key)
  return typeof fallback === 'string' ? fallback : undefined
}
