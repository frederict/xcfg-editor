import type { Widget } from '../model/widget'
import type { RenderSettings } from '../model/preferences'
import type { Translator } from '../i18n/translate'
import { drawGeneric } from './generic'

/**
 * Les paramètres de rendu sont passés à chaque dessin : les unités et la typographie
 * des titres viennent des préférences du fichier ouvert, et un même widget se dessine
 * différemment selon la configuration qui l'accompagne.
 *
 * ## Deux langues, et elles ne se confondent pas
 *
 * `language` est un paramètre distinct de `settings`, déjà résolu en code concret
 * (`settings.language` est une `LanguagePreference`, potentiellement « langue système » :
 * c'est à l'appelant — `src/ui/`, via `resolveLanguage` — de trancher avec
 * `navigator.language`, jamais ici). C'est l'axe **`labels`** : la langue de l'appareil du
 * pilote, celle dans laquelle son instrument écrit ce qu'il peint.
 *
 * `tr` est l'axe **`ui`** : notre prose, dans la langue que le pilote a choisie. Un dessin
 * ne s'en sert **que** pour ce qu'il ajoute au dessin de l'appareil — aujourd'hui les deux
 * étiquettes de survol, et rien d'autre. Le partage exact est écrit en tête de
 * `canvas.ts` ; la doctrine des deux axes, dans `src/i18n/axes.ts`.
 *
 * ⚠️ `tr` arrive **en argument**, comme partout sous l'interface : ce module n'importe de
 * `src/i18n/` que le **type** `Translator`, effacé à la compilation
 * (`tests/i18n/domains.test.ts` le vérifie).
 */
export type WidgetDrawer = (
  widget: Widget, settings: RenderSettings, language: string, tr: Translator
) => HTMLElement

const drawers = new Map<string, WidgetDrawer>()

export function register(shortName: string, drawer: WidgetDrawer): void {
  drawers.set(shortName, drawer)
}

export function drawWidget(
  widget: Widget, settings: RenderSettings, language: string, tr: Translator
): HTMLElement {
  return (drawers.get(widget.shortName) ?? drawGeneric)(widget, settings, language, tr)
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
 * Types dont l'appareil ne peint **aucun contenu** au repos.
 *
 * Un seul type y figure : `WLiveMessage`. Sur
 * `docs/reference/captures-air3/vol-thermalassistant-boutonsnavig.png`, sa bande occupe
 * tout le bas de l'écran, au premier plan, par-dessus une carte — et rien ne s'y voit :
 * ni cadre, ni texte, ni gabarit de panneau. XCTrack n'y dessine rien tant qu'aucun
 * message n'est arrivé. `widgets/liveMessage.ts` en tire son dessin (une marque
 * discrète au survol, rien de plus).
 *
 * **Ce que ce registre ne fait PAS, et ne doit plus jamais faire.** Il a porté, jusqu'au
 * 2026-08-21, un cas particulier qui neutralisait le fond et le cadre de ces types et
 * les excluait du calcul de recouvrement de `src/ui/warnings.ts`. C'était un pansement
 * sur l'inversion de `_bg` : le `WLiveMessage` du corpus ne masque pas les
 * `WButtonNavig` qu'il recouvre parce qu'il porte `_bg: 100` — **aucun fond** — et non
 * parce que son type serait à part. `_bg` étant désormais lu à l'endroit
 * (`backgroundOpacity`, `canvas.ts`), le fond suit `_bg` et le cadre suit `_border`,
 * pour ce type comme pour tous les autres. Voir `rendu-observe.md`.
 *
 * Ne reste donc qu'un **fait de rendu**, et un seul usage : la marque « sans dessin » de
 * la liste des widgets (`src/ui/widgetList.ts`), qui dit au pilote pourquoi un rectangle
 * de sa page reste vide. À ne pas confondre avec « recouvert » (géométrie, `warnings.ts`)
 * ni avec « inatteignable au clic » (géométrie encore, `widgetList.ts`).
 *
 * Distinct de `register` : un type peut ne rien peindre au repos sans dessin particulier
 * (repli générique) et inversement.
 */
const blankAtRestTypes = new Set<string>()

export function registerBlankAtRest(shortName: string): void {
  blankAtRestTypes.add(shortName)
}

export function isBlankAtRest(shortName: string): boolean {
  return blankAtRestTypes.has(shortName)
}
