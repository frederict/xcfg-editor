import type { Widget } from '../model/widget'
import type { RenderSettings } from '../model/preferences'
import { drawGeneric } from './generic'

/**
 * Les paramètres de rendu sont passés à chaque dessin : les unités et la typographie
 * des titres viennent des préférences du fichier ouvert, et un même widget se dessine
 * différemment selon la configuration qui l'accompagne.
 *
 * `language` est un paramètre distinct de `settings`, déjà résolu en code concret
 * (`settings.language` est une `LanguagePreference`, potentiellement « langue système » :
 * c'est à l'appelant — à terme `src/ui/`, via `resolveLanguage` — de trancher avec
 * `navigator.language`, jamais ici).
 */
export type WidgetDrawer = (widget: Widget, settings: RenderSettings, language: string) => HTMLElement

const drawers = new Map<string, WidgetDrawer>()

export function register(shortName: string, drawer: WidgetDrawer): void {
  drawers.set(shortName, drawer)
}

export function drawWidget(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  return (drawers.get(widget.shortName) ?? drawGeneric)(widget, settings, language)
}
