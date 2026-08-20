import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'
import { readableName } from '../../catalog/widgetNames'

/**
 * `WButtonBrightness` et `WButtonNavig` — les zones tactiles (rendu-observe.md,
 * « Widgets sans rendu visible »). Le fichier leur donne de vastes zones (sur
 * `landscape[3]` de `2026-08-20_backup-00.xcfg`, deux `WButtonBrightness` couvrent la
 * moitié centrale de l'écran), mais **XCTrack n'y dessine rien** : ce sont des zones
 * tactiles transparentes posées par-dessus la carte, qui règlent la luminosité ou
 * changent de page au toucher.
 *
 * Notre rendu générique (`generic.ts`) les affiche avec un cadre et un titre, ce qui
 * masque la carte et donne une image fausse de la page — d'où ce dessin dédié : rien de
 * visible en rendu normal, seulement un contour discret et une étiquette au survol de la
 * souris, pour que le pilote sache qu'une zone tactile se trouve là.
 *
 * La neutralisation du fond (`_bg` vaut 100 sur `WButtonBrightness` dans le corpus, ce
 * qui rendrait le calque `.xc-widget__bg` partagé opaque) n'est PAS traitée ici : c'est
 * `registry.ts` (`registerTransparent`) et `canvas.ts` qui s'en chargent, en amont de ce
 * dessin — voir le commentaire de tête de `registry.ts` pour le choix de mécanisme.
 */

/**
 * Traduction maison des codes d'action lus dans `type` — ce ne sont pas des libellés
 * XCTrack (l'appareil ne dessine rien à cet endroit, il n'y a donc rien à reproduire) :
 * uniquement le texte de notre propre étiquette de survol. Limité aux 4 valeurs
 * observées sur le corpus (voir le relevé dans le rapport de tâche) ; un code inconnu
 * retombe sur `readableName(widget.shortName, language)`.
 */
const ACTION_LABELS: Record<string, Record<string, string>> = {
  ACTION_PLUS: { fr: 'luminosité +', en: 'brightness +' },
  ACTION_MINUS: { fr: 'luminosité −', en: 'brightness −' },
  ACTION_NEXT_WAYPOINT: { fr: 'balise suivante', en: 'next waypoint' },
  ACTION_PREV_WAYPOINT: { fr: 'balise précédente', en: 'previous waypoint' }
}

const PREFIX: Record<string, string> = { fr: 'Zone tactile', en: 'Touch zone' }
const LONG_CLICK_SUFFIX: Record<string, string> = { fr: 'appui long', en: 'long press' }

/** Repli anglais si la langue demandée n'a pas de traduction maison, puis `fallback` si
 * même l'anglais manquait (n'arrive jamais pour PREFIX/LONG_CLICK_SUFFIX, qui couvrent
 * toujours les deux) — même chaîne de repli que `readableName` (catalog/widgetNames.ts). */
function localize(map: Record<string, string>, language: string, fallback: string): string {
  return map[language] ?? map.en ?? fallback
}

function touchLabel(widget: Widget, language: string): string {
  const type = readString(widget.node, 'type')
  const action = type !== undefined ? (ACTION_LABELS[type]?.[language] ?? ACTION_LABELS[type]?.en) : undefined

  const prefix = localize(PREFIX, language, 'Zone tactile')

  if (action === undefined) {
    // `type` absent ou hors des 4 valeurs connues : pas de texte inventé, on retombe sur
    // le nom de widget lisible du catalogue officiel.
    return `${prefix} — ${readableName(widget.shortName, language)}`
  }

  const longClick = readBoolean(widget.node, 'longClick') === true
  const suffix = longClick ? ` (${localize(LONG_CLICK_SUFFIX, language, 'appui long')})` : ''
  return `${prefix} — ${action}${suffix}`
}

export function drawTouchZone(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'xc-touch'
  zone.style.width = '100%'
  zone.style.height = '100%'

  // Étiquette : présente dans le DOM (sélectionnable, testable) mais masquée par CSS
  // sauf au survol — voir `.xc-touch__label` dans style.css. Rien dans ce module ne pose
  // de fond ni de bordure : le rendu normal ne doit littéralement rien afficher.
  const label = document.createElement('span')
  label.className = 'xc-touch__label'
  label.textContent = touchLabel(widget, language)
  zone.append(label)

  return zone
}
