import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { androidColorToHex } from '../../model/preferences'
import { readNumber } from '../../core/access'

/**
 * `WVerticalGraph` — flèche verticale d'échelle sur le bord gauche avec sa valeur, et
 * trace d'altitude en pointillés orange épais traversant la largeur (rendu-observe.md,
 * « Graphe vertical », capture `widget-WVerticalGraph.png` — bandeau confirmé « PAGE 5 —
 * WVerticalGraph », capture fiable, contrairement à `widget-WSideView.png` qui en est un
 * doublon mal étiqueté, voir compass.ts). Partage la flèche de `WVarioColumn`
 * (varioColumn.ts) : deux fichiers distincts malgré le code dupliqué, sur consigne
 * explicite du plan de tâche (« chacun en SVG, dans un fichier distinct »).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW_W = 300
const VIEW_H = 200
const ARROW_X = 30

/** Orange mesuré sur l'appareil (rendu-observe.md) — repli si `dot_color` est absent. */
const DEFAULT_DOT_COLOR = '#ff9800'
const DEFAULT_VERTICAL_STEP = 50
const DEFAULT_DOT_SIZE = 15
/** Nombre de points de la trace : purement illustratif, sans lien avec `interval`
 * (fenêtre temporelle en ms, aucune formule de conversion en nombre de points n'est
 * sourcée) — même réserve que `mapWidget_scale` dans map.ts. */
const DOT_COUNT = 46

/** Rayon des points, proportionnel à `dot_size` (15 dans le corpus) sans calibrage
 * pixel-exact — même réserve que `fontScale` dans map.ts. */
function dotRadius(dotSize: number): number {
  return Math.min(6, Math.max(1.5, dotSize * 0.18))
}

/** Trace légèrement ondulée, déterministe (une formule fixe, jamais `Math.random`) —
 * comme la trace d'exemple de map.ts : elle juge la mise en page, ne simule aucun vol. */
function buildDotTrace(color: string, dotSize: number): SVGGElement {
  const g = svgEl('g', { class: 'xc-vscale__trace', fill: color })
  const r = dotRadius(dotSize)
  const baseY = VIEW_H * 0.58
  const startX = ARROW_X + 30
  const spacing = (VIEW_W - startX - 10) / (DOT_COUNT - 1)
  for (let i = 0; i < DOT_COUNT; i++) {
    const x = startX + i * spacing
    const y = baseY + 5 * Math.sin(i * 0.35)
    g.append(svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1) }))
  }
  return g
}

export function drawVerticalGraph(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-vscale xc-vscale--graph'

  const step = readNumber(widget.node, 'vertical_step') ?? DEFAULT_VERTICAL_STEP
  const dotSize = readNumber(widget.node, 'dot_size') ?? DEFAULT_DOT_SIZE
  const rawColor = readNumber(widget.node, 'dot_color')
  const color = rawColor !== undefined ? androidColorToHex(rawColor) : DEFAULT_DOT_COLOR

  const svg = svgEl('svg', { class: 'xc-vscale__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'none' })
  svg.append(buildDotTrace(color, dotSize))

  const arrow = svgEl('g', { class: 'xc-vscale__arrow' })
  arrow.append(svgEl('line', { x1: String(ARROW_X), y1: '12', x2: String(ARROW_X), y2: String(VIEW_H - 12) }))
  arrow.append(svgEl('polygon', { class: 'xc-vscale__arrowhead', points: `${ARROW_X - 9},28 ${ARROW_X + 9},28 ${ARROW_X},10` }))
  arrow.append(svgEl('polygon', { class: 'xc-vscale__arrowhead', points: `${ARROW_X - 9},${VIEW_H - 28} ${ARROW_X + 9},${VIEW_H - 28} ${ARROW_X},${VIEW_H - 10}` }))
  svg.append(arrow)

  svg.append(Object.assign(svgEl('text', {
    class: 'xc-vscale__label', x: String(ARROW_X + 14), y: String(VIEW_H * 0.52), 'text-anchor': 'start'
  }), { textContent: String(step) }))

  element.append(svg)
  return element
}
