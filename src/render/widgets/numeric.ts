import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readNumber, readString } from '../../core/access'
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
 * affiche un nom de balise, pas une valeur numérique à unité. Le champ `unit` des
 * grandeurs `altitude`/`speed`/`verticalSpeed`/`windSpeed`/`distance` n'est qu'indicatif :
 * `resolveUnit` retient la préférence correspondante et ignore ce champ pour elles.
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
 * Largeur normalisée (sur 10000, voir `src/render/canvas.ts`) en-deçà de laquelle le
 * titre doit rétrécir pour tenir dans le widget — observé sur « Altitude GPS » et
 * « Vitesse du vent », tronqués ou renvoyés à la ligne par `Display.WidgetTitleSize`
 * seul (rendu-observe.md). Valeurs relevées sur le corpus : les widgets numériques
 * étroits d'une page à 6 colonnes (« landscape[3] ») font 1458-1459 sur 10000.
 */
const NARROW_WIDTH_THRESHOLD = 2000
const MIN_TITLE_SCALE = 0.5

/**
 * Grandeurs pour lesquelles XCTrack colore le fond de la zone de valeur selon le signe
 * de la mesure — observé sur `WVerticalSpeed` (vario) et `WThermalAltGain` (gain dans
 * le thermique) uniquement. Une altitude ou une heure ordinaires ne se colorent pas
 * (rendu-observe.md).
 */
const SIGN_COLORED_TYPES = new Set(['WVerticalSpeed', 'WThermalAltGain'])

/**
 * Compose une unité simple (`m`, `FL`) sur une ligne ; une unité composée (contenant
 * `/`) en fraction empilée — numérateur, filet, dénominateur — comme XCTrack le fait
 * pour `km/h` et `m/s` (rendu-observe.md).
 */
function buildUnit(unitText: string): HTMLElement {
  const unit = document.createElement('span')
  unit.className = 'xc-num__unit'

  const slash = unitText.indexOf('/')
  if (slash === -1) {
    unit.textContent = unitText
    return unit
  }

  unit.classList.add('xc-num__unit--fraction')
  const numerator = document.createElement('span')
  numerator.className = 'xc-num__unit-num'
  numerator.textContent = unitText.slice(0, slash)
  const denominator = document.createElement('span')
  denominator.className = 'xc-num__unit-den'
  denominator.textContent = unitText.slice(slash + 1)
  unit.append(numerator, denominator)
  return unit
}

/**
 * Le titre porte la période de moyennage (clé `avg`, en millisecondes) quand elle est
 * présente et non nulle : « Finesse / 2s », « Vitesse verticale / 2s » (rendu-observe.md).
 * Un titre personnalisé (`titletext` renseigné) n'en hérite pas. Aucun widget du corpus
 * ne combine `avg` et un `titletext` non vide — l'hypothèse n'est donc pas vérifiable
 * sur les données disponibles — mais c'est la seule lecture cohérente avec la consigne
 * qui la formule explicitement.
 */
function titleText(widget: Widget, language: string): string {
  const custom = readString(widget.node, 'titletext')
  if (custom !== undefined && custom.length > 0) return custom

  const base = readableName(widget.shortName, language)
  const avg = readNumber(widget.node, 'avg')
  if (avg === undefined || avg === 0) return base
  return `${base} / ${avg / 1000}s`
}

/**
 * `Display.WidgetTitleSize` seul fait déborder un libellé long sur un widget étroit
 * (« Altitude GPS » sur deux lignes, « Vitesse du vent » tronquée — rendu-observe.md).
 * En-deçà du seuil, la taille décroît linéairement avec la largeur normalisée du
 * widget, avec un plancher pour rester lisible.
 */
function titleSizePercent(settings: RenderSettings, widget: Widget): number {
  const width = widget.x2 - widget.x1
  if (width >= NARROW_WIDTH_THRESHOLD) return settings.titleSizePercent
  const scale = Math.max(MIN_TITLE_SCALE, width / NARROW_WIDTH_THRESHOLD)
  return settings.titleSizePercent * scale
}

/**
 * Classe de couleur de fond pour la zone de valeur, selon le signe de l'exemple
 * statique — nos valeurs ne simulent rien, donc c'est le seul signe disponible.
 * Restreinte à `SIGN_COLORED_TYPES` : une distance ou une heure ne se colorent jamais,
 * même si leur exemple s'écrivait avec un signe.
 */
function rowSignClass(shortName: string, example: string): string | undefined {
  if (!SIGN_COLORED_TYPES.has(shortName)) return undefined
  const value = Number(example)
  if (!Number.isFinite(value) || value === 0) return undefined
  return value > 0 ? 'xc-num__row--positive' : 'xc-num__row--negative'
}

/**
 * Dessin partagé par les 23 types « titre + valeur + unité » du corpus. `_unit` est un
 * booléen d'affichage (toujours `true` quand présent dans le corpus) et non une unité —
 * le confondre afficherait le mot « true » à côté de la valeur.
 */
export function drawNumeric(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const spec = SPECS[widget.shortName] ?? FALLBACK_SPEC

  const element = document.createElement('div')
  element.className = 'xc-num'

  if (readBoolean(widget.node, '_title') === true) {
    const title = document.createElement('span')
    title.className = 'xc-num__title'
    title.style.color = settings.titleColor
    title.style.fontSize = `${titleSizePercent(settings, widget)}%`
    title.textContent = titleText(widget, language)
    element.append(title)
  } else {
    // Sans titre à loger au-dessus, la valeur reçoit toute la hauteur du widget —
    // voir `.xc-num--no-title` dans style.css.
    element.classList.add('xc-num--no-title')
  }

  // La valeur et l'unité partagent une même zone : c'est elle, et non tout le widget,
  // que XCTrack colore selon le signe (rendu-observe.md).
  const row = document.createElement('div')
  row.className = 'xc-num__row'
  const colorClass = rowSignClass(widget.shortName, spec.example)
  if (colorClass !== undefined) row.classList.add(colorClass)

  const value = document.createElement('span')
  value.className = 'xc-num__value'
  value.textContent = spec.example
  row.append(value)

  if (readBoolean(widget.node, '_unit') === true) {
    row.append(buildUnit(resolveUnit(widget, settings, spec)))
  }

  element.append(row)
  return element
}
