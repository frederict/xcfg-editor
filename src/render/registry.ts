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

/**
 * Types dont le dessin ne doit jamais recevoir le fond ni le cadre génériques que
 * `_bg`/`_border` demanderaient dans le fichier (`src/render/canvas.ts`) — le cas des
 * widgets purement tactiles (`WButtonBrightness`, `WButtonNavig`, voir
 * `widgets/touchZone.ts`) : ils occupent de vastes zones qui, sur l'appareil, ne
 * dessinent rien du tout, quelles que soient leurs valeurs `_bg`/`_border` dans le
 * fichier (constaté sur `WButtonNavig`, `_border: true` sur les 10 occurrences du
 * corpus, jamais rendu comme tel sur l'AIR³ — voir rendu-observe.md, « Widgets sans
 * rendu visible »). Distinct de `register` : un type peut être transparent sans dessin
 * particulier (repli générique) et inversement.
 */
const transparentTypes = new Set<string>()

export function registerTransparent(shortName: string): void {
  transparentTypes.add(shortName)
}

export function isTransparent(shortName: string): boolean {
  return transparentTypes.has(shortName)
}
