import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean } from '../../core/access'

/**
 * Rendu de `WStatusLine` — le bandeau d'indicateurs en haut d'écran (rendu-observe.md,
 * confirmé pixel par pixel sur `ecran-landscape3-17widgets.png` : réception GPS, `LIVE`,
 * état des capteurs, batterie, de gauche à droite, fond gris clair `#e8e8e8`).
 *
 * Relevé sur les 35 occurrences du corpus (5 fichiers) : chaque indicateur n'apparaît
 * dans le fichier — et donc à l'écran — que si sa clé est présente et vaut `true` ; son
 * absence équivaut à `false`, comme `_title`/`_unit` sur les widgets numériques
 * (numeric.ts). Deux profils bien distincts :
 * - `landscape[0..4]` (20 occurrences identiques) : showGps, showSensors, showLive,
 *   showLiveLabel, showBatteryIcon, showBatteryPercent tous à `true`, showTime à `false`.
 * - `portrait[0..2]` (15 occurrences) : SEULES showTime et showLiveLabel sont écrites.
 *   showLive en est absent — le groupe LIVE ne s'affiche donc pas du tout sur ces pages
 *   malgré showLiveLabel à `true`, à la lecture la plus littérale des clés. Aucune
 *   capture ne couvre ce cas portrait : signalé comme non tranché dans le rapport.
 *
 * `soundMode` (`'WARN_MUTED'` sur 12 occurrences) n'a aucune contrepartie visuelle
 * décrite dans rendu-observe.md ni observée sur les captures : volontairement ignoré ici.
 */

/** Rouge du trait qui barre un indicateur absent — mesuré sur la capture (255,1,1), pas
 * le rouge des titres (`#f44336`) : deux rouges distincts sur l'appareil. */
const ALERT_RED = '#ff0000'

/** Vert du remplissage de la batterie — mesuré sur la capture (rgb 141,198,63). */
const BATTERY_GREEN = '#8dc63f'

/**
 * Pourcentage de batterie statique — valeur d'exemple, comme les valeurs des widgets
 * numériques (numeric.ts) : le niveau réel est un état d'exécution que le fichier ne
 * contient pas.
 */
const EXAMPLE_BATTERY_PERCENT = '82%'

/** Heure statique — même exemple que WTime dans numeric.ts, pour rester cohérent. */
const EXAMPLE_TIME = '14:32'

/**
 * Icônes SVG en ligne — consigne explicite : pas d'emoji, pas de police d'icônes. Simples
 * et lisibles à petite taille, le bandeau faisant environ 3 % de la hauteur d'écran.
 *
 * GPS : point plus deux arcs concentriques (rendu-observe.md). L'orientation exacte du
 * pictogramme XCTrack (arcs partant du coin bas-gauche) n'est pas reproduite au trait
 * près — seule la structure « point + arcs concentriques » est reprise du relevé.
 */
const ICON_GPS = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <circle cx="4" cy="20" r="1.6" fill="currentColor" stroke="none"/>
  <path d="M4 15 A5 5 0 0 1 9 20"/>
  <path d="M4 8 A12 12 0 0 1 16 20"/>
</svg>`.trim()

/**
 * Capteurs : pictogramme générique (silhouette d'aile), barré en rouge. Seul l'état
 * « absent » est confirmé par la capture (icône barrée) — l'état « présent », non barré,
 * n'a jamais été observé et n'est donc pas implémenté (non tranché, voir le rapport).
 */
const ICON_SENSORS_OFF = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 15c1.5-6 5-10 8-10s6.5 4 8 10"/>
  <path d="M8 15h2M14 15h2"/>
  <line x1="3" y1="21" x2="21" y2="4" stroke="${ALERT_RED}" stroke-width="2.4" stroke-linecap="round"/>
</svg>`.trim()

/**
 * Batterie : pictogramme + remplissage vert. L'éclair de charge visible sur la capture
 * est un état d'exécution (en charge ou non) qu'aucune clé du fichier ne porte : non
 * reproduit, pour ne pas prétendre à une information que le fichier n'a pas.
 */
const ICON_BATTERY = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="1" y="6" width="19" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="21" y="9" width="2" height="6" rx="1" fill="currentColor"/>
  <rect x="3" y="8" width="12" height="8" fill="${BATTERY_GREEN}"/>
</svg>`.trim()

function iconElement(className: string, svgMarkup: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.innerHTML = svgMarkup
  return span
}

function shown(widget: Widget, key: string): boolean {
  return readBoolean(widget.node, key) === true
}

export function drawStatusLine(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'xc-status'

  if (shown(widget, 'showGps')) {
    bar.append(iconElement('xc-status__icon xc-status__gps', ICON_GPS))
  }

  if (shown(widget, 'showLive')) {
    const live = document.createElement('span')
    live.className = 'xc-status__live'

    const dot = document.createElement('span')
    dot.className = 'xc-status__dot'
    live.append(dot)

    if (shown(widget, 'showLiveLabel')) {
      const label = document.createElement('span')
      label.className = 'xc-status__live-text'
      label.textContent = 'LIVE'
      live.append(label)
    }

    bar.append(live)
  }

  if (shown(widget, 'showSensors')) {
    bar.append(iconElement('xc-status__icon xc-status__sensors', ICON_SENSORS_OFF))
  }

  const showBatteryIcon = shown(widget, 'showBatteryIcon')
  const showBatteryPercent = shown(widget, 'showBatteryPercent')
  if (showBatteryIcon || showBatteryPercent) {
    const battery = document.createElement('span')
    battery.className = 'xc-status__battery'

    if (showBatteryIcon) battery.append(iconElement('xc-status__icon', ICON_BATTERY))

    if (showBatteryPercent) {
      const percent = document.createElement('span')
      percent.className = 'xc-status__percent'
      percent.textContent = EXAMPLE_BATTERY_PERCENT
      battery.append(percent)
    }

    bar.append(battery)
  }

  // Position non confirmée par une capture (aucune ne porte showTime: true dans le
  // bandeau lui-même — voir le commentaire de tête) : placée en dernier, à l'extrémité
  // droite, par cohérence avec l'alignement à droite de tout le bandeau.
  if (shown(widget, 'showTime')) {
    const time = document.createElement('span')
    time.className = 'xc-status__time'
    time.textContent = EXAMPLE_TIME
    bar.append(time)
  }

  return bar
}
