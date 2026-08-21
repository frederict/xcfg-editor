import type { Widget } from '../model/widget'
import type { RenderSettings } from '../model/preferences'
import { readableName } from '../catalog/widgetNames'
import { titleWidthEm } from './textMetrics'

/**
 * Rendu de repli : titre lisible et valeur d'exemple. 47 des 84 types de widgets de
 * XCTrack n'apparaissent dans aucun fichier connu, et le format gagne des types à
 * chaque version — ce repli est le chemin normal, pas un cas d'erreur.
 */
export function drawGeneric(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-generic'

  const title = document.createElement('span')
  title.className = 'xc-generic__title'
  title.style.color = settings.titleColor
  const text = readableName(widget.shortName, language)
  // Même taille que les titres des widgets dessinés (`--xc-title`, posée par
  // `canvas.ts`) : sur l'appareil, elle ne dépend pas du widget. `--xc-title-em` est le
  // garde-fou de largeur, voir `.xc-generic__title` dans style.css.
  title.style.setProperty('--xc-title-em', String(titleWidthEm(text)))
  title.textContent = text

  const value = document.createElement('span')
  value.className = 'xc-generic__value'
  value.textContent = '--'

  element.append(title, value)
  return element
}
