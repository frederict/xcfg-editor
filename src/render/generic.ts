import type { Widget } from '../model/widget'
import type { RenderSettings } from '../model/preferences'
import { readableName } from '../catalog/widgetNames'

/**
 * Rendu de repli : titre lisible et valeur d'exemple. 47 des 84 types de widgets de
 * XCTrack n'apparaissent dans aucun fichier connu, et le format gagne des types à
 * chaque version — ce repli est le chemin normal, pas un cas d'erreur.
 */
export function drawGeneric(widget: Widget, settings: RenderSettings): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-generic'

  const title = document.createElement('span')
  title.className = 'xc-generic__title'
  title.style.color = settings.titleColor
  title.style.fontSize = `${settings.titleSizePercent}%`
  title.textContent = readableName(widget.shortName, settings.language)

  const value = document.createElement('span')
  value.className = 'xc-generic__value'
  value.textContent = '--'

  element.append(title, value)
  return element
}
