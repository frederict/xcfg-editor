import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readNumber } from '../../core/access'

/**
 * `WLiveMessage` — « Réception de messages » (libellé officiel `fr` du catalogue,
 * `src/catalog/widgetLabels.json`). **NON OBSERVÉ** : aucune capture de la planche de
 * diagnostic ne le montre, contrairement à `WAirspaceProximity` (airspaceProximity.ts).
 * Le rendu ci-dessous est un panneau de messages sobre, délibérément minimal — pas une
 * reconstitution non vérifiable de l'apparence réelle sur l'appareil.
 *
 * Clés propres relevées sur les 10 occurrences du corpus (5 fichiers × 2 emplacements,
 * `landscape[3]` et `landscape[4]`, valeurs identiques partout) :
 * - `line_count` : toujours `2`. Nombre de lignes de message affichées — piloté ici,
 *   borné à la liste d'exemples disponible.
 * - `show_time` : toujours `300`. **Piège de nommage** (rendu-observe.md, consigne de la
 *   tâche) : malgré son nom, ce n'est pas un booléen — `readBoolean` renverrait
 *   `undefined` pour la valeur `300`. Le sens quantitatif exact (millisecondes ? secondes ?
 *   un intervalle de rafraîchissement ?) n'est pas déterminable depuis le corpus seul, qui
 *   ne porte qu'une seule valeur. Interprété prudemment ici comme un drapeau de présence —
 *   « une valeur définie et positive affiche l'heure » — sans engager son sens numérique.
 *   NON TRANCHÉ.
 *
 * Aucune clé `_title`/`titletext` dans le corpus : pas de titre dessiné, comme
 * `airspaceProximity.ts`.
 */

/** Messages d'exemple sobres et génériques — aucune correspondance réelle simulée,
 * comme le nom de balise fixe de `WNextTurnpoint` (numeric.ts). */
const EXAMPLE_MESSAGES = [
  'Bien reçu, bon vol.',
  'RAS, tout va bien.',
  'On te suit, à plus tard.',
  'Vent qui forcit, prudence.'
]

const MIN_LINES = 1
const MAX_LINES = EXAMPLE_MESSAGES.length

/** Heure d'exemple statique — même valeur que `EXAMPLE_TIME` de statusLine.ts, pour
 * rester cohérent d'un widget à l'autre. */
const EXAMPLE_TIME = '14:32'

export function drawLiveMessage(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-livemsg'

  const rawCount = readNumber(widget.node, 'line_count')
  const count = rawCount === undefined
    ? MIN_LINES
    : Math.min(MAX_LINES, Math.max(MIN_LINES, Math.trunc(rawCount)))

  const lines = document.createElement('div')
  lines.className = 'xc-livemsg__lines'
  for (let i = 0; i < count; i++) {
    const line = document.createElement('div')
    line.className = 'xc-livemsg__line'
    line.textContent = EXAMPLE_MESSAGES[i % EXAMPLE_MESSAGES.length] ?? ''
    lines.append(line)
  }
  element.append(lines)

  const showTime = readNumber(widget.node, 'show_time')
  if (showTime !== undefined && showTime > 0) {
    const time = document.createElement('div')
    time.className = 'xc-livemsg__time'
    time.textContent = EXAMPLE_TIME
    element.append(time)
  }

  return element
}
