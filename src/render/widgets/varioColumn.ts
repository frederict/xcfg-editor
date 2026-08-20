import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WVarioColumn` — flèche verticale d'échelle sur toute la hauteur (rendu-observe.md,
 * « Barre vario » — libellé du catalogue, aucune section propre au relevé initial).
 *
 * **Aucune capture fiable** : `widget-WVarioColumn.png`, dans la planche de diagnostic,
 * re-montre en réalité `WCompass` (bandeau « PAGE 3 — WCompass ») — voir compass.ts pour
 * le même constat sur la paire WCompass/WSideView. Le relevé du corpus (`Exemples/*.xcfg`)
 * confirme sa géométrie (`X1:0,X2:833,Y1:0,Y2:10000` sur `landscape[3]` — une bande
 * étroite occupant toute la hauteur) mais ne porte AUCUNE clé d'échelle : seule `avg`
 * (2000 sur les 15 occurrences, sans effet visuel confirmé — ce type n'a pas de titre)
 * existe. La valeur « 50 » dessinée ici est donc un exemple fixe illustratif, comme les
 * valeurs de numeric.ts — jamais lue depuis le fichier pour ce type, faute de clé.
 * `WVerticalGraph` (verticalGraph.ts), qui partage la même flèche, la lit réellement via
 * `vertical_step`.
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

const DEFAULT_VARIO_SCALE = '50'

export function drawVarioColumn(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-vscale xc-vscale--vario'

  const svg = svgEl('svg', { class: 'xc-vscale__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'xMinYMid meet' })

  const arrow = svgEl('g', { class: 'xc-vscale__arrow' })
  arrow.append(svgEl('line', { x1: String(ARROW_X), y1: '12', x2: String(ARROW_X), y2: String(VIEW_H - 12) }))
  arrow.append(svgEl('polygon', { class: 'xc-vscale__arrowhead', points: `${ARROW_X - 9},28 ${ARROW_X + 9},28 ${ARROW_X},10` }))
  arrow.append(svgEl('polygon', { class: 'xc-vscale__arrowhead', points: `${ARROW_X - 9},${VIEW_H - 28} ${ARROW_X + 9},${VIEW_H - 28} ${ARROW_X},${VIEW_H - 10}` }))
  svg.append(arrow)

  svg.append(Object.assign(svgEl('text', {
    class: 'xc-vscale__label', x: String(ARROW_X + 14), y: String(VIEW_H * 0.52), 'text-anchor': 'start'
  }), { textContent: DEFAULT_VARIO_SCALE }))

  element.append(svg)
  return element
}
