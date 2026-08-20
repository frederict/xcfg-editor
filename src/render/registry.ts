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
 * Vrai si `shortName` a un dessin dédié — distinct du repli générique de `drawWidget`.
 * Sert le contrôle de couverture (`tests/render/widgets/coverage.test.ts`) : interroger
 * l'annuaire à l'exécution plutôt que grep-er le texte de `widgets/index.ts`, qui ne
 * prouve rien sur ce qui est réellement enregistré une fois les imports exécutés.
 */
export function isRegistered(shortName: string): boolean {
  return drawers.has(shortName)
}

/**
 * Types dont le dessin ne doit jamais recevoir le fond ni le cadre génériques que
 * `_bg`/`_border` demanderaient dans le fichier (`src/render/canvas.ts`) — le cas du
 * widget purement tactile `WButtonBrightness` (voir `widgets/touchZone.ts`) : il
 * occupe de vastes zones qui, sur l'appareil, ne dessinent rien du tout, quelles que
 * soient ses valeurs `_bg`/`_border` dans le fichier (rendu-observe.md, « Widgets sans
 * rendu visible »).
 *
 * **Correction en vol (rendu-en-vol.md § 4)** : `WButtonNavig` en est sorti.
 * Contrairement à ce que montrait le premier relevé au sol, seul `WButtonBrightness`
 * est réellement invisible sur l'appareil — `WButtonNavig` dessine un pictogramme
 * visible (voir `widgets/buttonNavig.ts`) et reçoit donc normalement le fond/cadre
 * génériques comme n'importe quel autre type dessiné.
 *
 * **`WLiveMessage` rejoint ce mécanisme (comparaison au sol, corpus des 5 fichiers)** :
 * ce n'est PAS une zone tactile — c'est un afficheur qui A du contenu, seulement pas en
 * permanence. Mais sur l'appareil, il ne peint rien tant qu'aucun message n'est arrivé,
 * malgré une zone souvent large et `_bg: 100` dans le fichier — même symptôme que
 * `WButtonBrightness`, et même correctif : fond/cadre neutralisés par ce registre.
 * Voir `widgets/liveMessage.ts` pour la marque discrète au survol qui remplace
 * l'ancien contenu simulé en permanence, et `src/ui/warnings.ts` pour l'exclusion de
 * ces types du calcul de recouvrement (un widget transparent au repos ne masque
 * personne).
 *
 * Distinct de `register` : un type peut être transparent sans dessin particulier
 * (repli générique) et inversement.
 */
const transparentTypes = new Set<string>()

export function registerTransparent(shortName: string): void {
  transparentTypes.add(shortName)
}

export function isTransparent(shortName: string): boolean {
  return transparentTypes.has(shortName)
}
