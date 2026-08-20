import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readNumber, readString } from '../../core/access'
import { readableName } from '../../catalog/widgetNames'

/**
 * `WWindDirection` — **non observé isolément** : aucune capture de la planche de
 * diagnostic ne le montre (contrairement aux quatre autres types de cette tâche), et il
 * n'apparaît sur aucune des captures disponibles, mêlé à d'autres widgets ou non. Le
 * rendu ci-dessous est donc un rendu sobre et minimal, délibérément distinct de la
 * boussole détaillée de `WCompass` (compass.ts) — rien ne confirme qu'il en partage le
 * dessin — plutôt qu'une tentative de reconstitution non vérifiable. **Non confirmé.**
 *
 * Relevé du corpus (`Exemples/*.xcfg`) : `_title`/`titletext` (comme les 23 widgets
 * numériques, numeric.ts) et `degrees`. `degrees` ne vaut jamais qu'un booléen `false`
 * sur les 10 occurrences connues — jamais un angle numérique. Interprété ici comme un
 * drapeau « afficher la valeur en degrés », par cohérence avec les drapeaux `show*`
 * déjà rencontrés (`_unit` dans numeric.ts, `showGps` etc. dans statusLine.ts) : sa
 * lecture numérique (`readNumber`) reste défensive pour le jour où un fichier porterait
 * un angle réel, mais aucune occurrence connue ne l'exerce — non tranché.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/** Direction illustrative fixe (flèche vers le haut) — aucune donnée de vent réelle
 * n'est modélisée, comme le cap de compass.ts ou la trace de map.ts. */
function buildArrow(): SVGSVGElement {
  const svg = svgEl('svg', { class: 'xc-wind-dir__arrow', viewBox: '0 0 24 24' })
  svg.append(svgEl('line', { x1: '12', y1: '20', x2: '12', y2: '5', 'stroke-linecap': 'round' }))
  svg.append(svgEl('polygon', { points: '12,2 19,13 5,13' }))
  return svg
}

export function drawWindDirection(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-wind-dir'

  if (readBoolean(widget.node, '_title') === true) {
    const title = document.createElement('span')
    title.className = 'xc-wind-dir__title'
    title.style.color = settings.titleColor
    const custom = readString(widget.node, 'titletext')
    title.textContent = custom !== undefined && custom.length > 0 ? custom : readableName(widget.shortName, language)
    element.append(title)
  }

  element.append(buildArrow())

  const degrees = readNumber(widget.node, 'degrees')
  if (degrees !== undefined) {
    const value = document.createElement('span')
    value.className = 'xc-wind-dir__degrees'
    value.textContent = `${degrees}°`
    element.append(value)
  }

  return element
}
