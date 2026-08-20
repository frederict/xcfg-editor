import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'
import { readableName } from '../../catalog/widgetNames'

/**
 * Grandeur mesurée par un widget numérique. Détermine quelle préférence d'unité du
 * fichier s'applique (`altitude`, `speed`, `verticalSpeed`, `windSpeed`, `distance`) ;
 * les autres grandeurs n'ont pas de préférence dédiée et gardent l'unité fixe du type.
 *
 * `windSpeed` est distincte de `speed` : XCTrack a une préférence `Unit.WindSpeed`
 * séparée de `Unit.Speed`, et rien ne garantit qu'un pilote règle les deux pareil.
 * `distance` n'a en pratique qu'une seule préférence identifiable dans le corpus
 * (`Unit.Distance` ; `Unit.CompetitionDistance` vaut la même valeur sur le seul fichier
 * disponible, la distinction n'est donc pas tranchable ici — voir `distanceUnit`).
 */
type Quantity = 'altitude' | 'speed' | 'verticalSpeed' | 'windSpeed' | 'duration' | 'time' | 'distance' | 'glide' | 'none'

interface NumericSpec {
  quantity: Quantity
  /** Unité fixe, utilisée quand la grandeur n'a pas de préférence associée. */
  unit: string
  /** Valeur d'exemple statique — juge la mise en page, ne simule rien. */
  example: string
}

/**
 * Relevé sur le corpus (`Exemples/2026-08-20_backup-00.xcfg` et `Exemples/pages.xcfg`) :
 * les 23 types partagent la structure titre/valeur/unité. `WFL`, `WGlide` et les
 * finesses n'ont pas d'unité de préférence — une unité fixe leur suffit. `WNextTurnpoint`
 * affiche un nom de balise, pas une valeur numérique à unité.
 */
const SPECS: Record<string, NumericSpec> = {
  WAltitude: { quantity: 'altitude', unit: 'm', example: '1234' },
  WAltitudeAboveGround: { quantity: 'altitude', unit: 'm', example: '850' },
  WFL: { quantity: 'none', unit: 'FL', example: '045' },
  WSpeed: { quantity: 'speed', unit: 'km/h', example: '38' },
  WVerticalSpeed: { quantity: 'verticalSpeed', unit: 'm/s', example: '+2.1' },
  WGlide: { quantity: 'glide', unit: ':1', example: '8.3' },
  WAirTime: { quantity: 'duration', unit: '', example: '2:47' },
  WTime: { quantity: 'time', unit: '', example: '14:32' },
  WWindSpeed: { quantity: 'windSpeed', unit: 'km/h', example: '18' },
  WThermalAltGain: { quantity: 'altitude', unit: 'm', example: '320' },
  WNextTurnpoint: { quantity: 'none', unit: '', example: 'P3' },
  WNextTurnpointAlt: { quantity: 'altitude', unit: 'm', example: '1800' },
  WNextTurnpointDistance: { quantity: 'distance', unit: 'km', example: '12.4' },
  WNextTurnpointGlideTo: { quantity: 'glide', unit: ':1', example: '6.2' },
  WNextTurnpointTimeOfArrival: { quantity: 'time', unit: '', example: '15:47' },
  WCompDistanceToGoal: { quantity: 'distance', unit: 'km', example: '24.8' },
  WCompAltitudeOverGoal: { quantity: 'altitude', unit: 'm', example: '450' },
  WCompGlideToGoal: { quantity: 'glide', unit: ':1', example: '5.1' },
  WCompTimeToStart: { quantity: 'duration', unit: '', example: '0:32' },
  WCompTimeAtStart: { quantity: 'time', unit: '', example: '13:00' },
  WCompSpeedToStart: { quantity: 'speed', unit: 'km/h', example: '42' },
  WOptiResult: { quantity: 'distance', unit: 'km', example: '87.3' },
  WOptiUnfinishedTriangle: { quantity: 'distance', unit: 'km', example: '45.2' }
}

const FALLBACK_SPEC: NumericSpec = { quantity: 'none', unit: '', example: '--' }

/**
 * `_units` ne vaut jamais que `"SYS_UNIT"` sur les 278 occurrences du corpus — un jeton
 * signifiant « unité du système », pas une unité concrète à afficher telle quelle.
 * L'afficher littéralement produirait « SYS_UNIT » à côté de la quasi-totalité des
 * widgets d'altitude et de vitesse du corpus. On ne l'applique donc comme forçage que
 * s'il diffère de ce jeton — ce qu'aucun fichier connu ne fait à ce jour.
 */
function resolveUnit(widget: Widget, settings: RenderSettings, spec: NumericSpec): string {
  const forced = readString(widget.node, '_units')
  if (forced !== undefined && forced !== 'SYS_UNIT') return forced

  switch (spec.quantity) {
    case 'altitude': return settings.altitudeUnit
    case 'speed': return settings.speedUnit
    case 'verticalSpeed': return settings.verticalSpeedUnit
    case 'windSpeed': return settings.windSpeedUnit
    case 'distance': return settings.distanceUnit
    default: return spec.unit
  }
}

/**
 * Dessin partagé par les 23 types « titre + valeur + unité » du corpus. `_unit` est un
 * booléen d'affichage (toujours `true` quand présent dans le corpus) et non une unité —
 * le confondre afficherait le mot « true » à côté de la valeur.
 */
export function drawNumeric(widget: Widget, settings: RenderSettings): HTMLElement {
  const spec = SPECS[widget.shortName] ?? FALLBACK_SPEC

  const element = document.createElement('div')
  element.className = 'xc-num'

  if (readBoolean(widget.node, '_title') === true) {
    const title = document.createElement('span')
    title.className = 'xc-num__title'
    title.style.color = settings.titleColor
    title.style.fontSize = `${settings.titleSizePercent}%`
    const custom = readString(widget.node, 'titletext')
    title.textContent = custom && custom.length > 0 ? custom : readableName(widget.shortName)
    element.append(title)
  }

  const value = document.createElement('span')
  value.className = 'xc-num__value'
  value.textContent = spec.example
  element.append(value)

  if (readBoolean(widget.node, '_unit') === true) {
    const unit = document.createElement('span')
    unit.className = 'xc-num__unit'
    unit.textContent = resolveUnit(widget, settings, spec)
    element.append(unit)
  }

  return element
}
