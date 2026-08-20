import type { Widget } from '../model/widget'
import type { RenderSettings } from '../model/preferences'
import { drawGeneric } from './generic'

/**
 * Les paramètres de rendu sont passés à chaque dessin : les unités et la typographie
 * des titres viennent des préférences du fichier ouvert, et un même widget se dessine
 * différemment selon la configuration qui l'accompagne.
 */
export type WidgetDrawer = (widget: Widget, settings: RenderSettings) => HTMLElement

const drawers = new Map<string, WidgetDrawer>()

export function register(shortName: string, drawer: WidgetDrawer): void {
  drawers.set(shortName, drawer)
}

export function drawWidget(widget: Widget, settings: RenderSettings): HTMLElement {
  return (drawers.get(widget.shortName) ?? drawGeneric)(widget, settings)
}
