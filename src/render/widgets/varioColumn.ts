import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WVarioColumn` — bargraphe, pas une flèche (correction en vol, rendu-en-vol.md § 2).
 * Le premier relevé, fait au sol sur une charpente vide, avait pris ce type pour une
 * flèche verticale à double pointe portant une valeur ; c'est en réalité une colonne
 * étroite de BARRES HORIZONTALES EMPILÉES, occupant toute la hauteur du widget — une
 * échelle de vario façon bargraphe. La flèche à double pointe appartient en fait à
 * `WVerticalGraph` (verticalGraph.ts), qui la garde : les deux widgets partageaient un
 * dessin avant cette correction, ils n'en partagent plus aucun.
 *
 * Mesuré au pixel sur `vol-landscape3-en-vol.png` ET `vol-numeriques-boussole-
 * variocolumn.png` (colonne de gauche des deux captures, mêmes teintes à chaque fois) :
 * remplissage rose pâle `#ffdfdf`, séparateurs et cadre marron foncé `#5f0000` (2 px à
 * l'échelle de la capture), et une barre plus saturée `#ffa0a0` toutes les 5 barres —
 * « roses et rouges dans la zone positive » du relevé de tâche. Aucune clé du corpus
 * ne porte d'échelle pour ce type (seule `avg`, 2000 sur les 15 occurrences, sans effet
 * visuel confirmé — ce type n'a pas de titre) : la valeur exacte représentée par chaque
 * barre, et la signification précise de la barre accentuée toutes les 5, ne sont pas
 * déterminables depuis le corpus seul. **NON TRANCHÉ** : rendu ici comme un motif
 * périodique fixe et illustratif (une graduation majeure vraisemblable), pas une
 * lecture de donnée réelle — comme la valeur d'exemple fixe de `WVerticalGraph`.
 *
 * Sur les deux captures, la colonne ne remplit qu'une fraction de la hauteur totale de
 * l'écran (~43 %, le reste blanc) alors que `landscape[3]` de
 * `2026-08-20_backup-00.xcfg` donne à ce widget `Y1:0,Y2:10000` (toute la hauteur de la
 * page) — les deux captures viennent d'une mise en page différente de celle du corpus
 * de référence (l'écran réel du pilote, pas notre fichier d'exemple). Le relevé de
 * tâche est explicite (« occupant toute la hauteur du widget ») : on suit cette
 * consigne — remplir toute la boîte du widget, quelle que soit sa hauteur réelle —
 * plutôt que la fraction observée sur ces deux captures précises.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW_W = 100
const VIEW_H = 400

/** Nombre de barres empilées — illustratif (voir le commentaire de tête, aucune clé
 * d'échelle dans le corpus) : ni trop peu (perdrait l'effet de bargraphe étroit vu sur
 * les captures), ni calé sur les 17 barres visibles d'une capture qui ne montre qu'une
 * fraction de la hauteur totale du widget (voir ci-dessus). */
const BAR_COUNT = 20

/** Une barre sur cinq reçoit la teinte accentuée — motif périodique mesuré sur les deux
 * captures (barres 3, 8, 13 sur les 17 visibles, à intervalle constant de 5). */
const ACCENT_PERIOD = 5
const ACCENT_OFFSET = 2

export function drawVarioColumn(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-variocol'

  const svg = svgEl('svg', { class: 'xc-variocol__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'none' })

  const barHeight = VIEW_H / BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    const accent = i % ACCENT_PERIOD === ACCENT_OFFSET
    const y = i * barHeight
    svg.append(svgEl('rect', {
      class: accent ? 'xc-variocol__bar xc-variocol__bar--accent' : 'xc-variocol__bar',
      x: '0', y: y.toFixed(2), width: String(VIEW_W), height: barHeight.toFixed(2)
    }))
  }

  element.append(svg)
  return element
}
