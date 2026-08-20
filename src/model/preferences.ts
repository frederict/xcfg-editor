import type { JsonNode } from '../core/jsonDocument'
import { getMember, readNumber, readString } from '../core/access'

/**
 * Ce que le fichier dit de la langue d'affichage. Volontairement PAS une simple
 * `string` avec repli sur `'en'` : `Display.Language` vide, comme l'absence totale de
 * section `preferences`, signifie « langue système » et non « anglais » — mesuré sur
 * l'appareil de l'utilisateur (`persist.sys.locale = fr-FR`, XCTrack y affiche du
 * français) alors que 2 fichiers du corpus sur 5 portent `Display.Language: ""`. Ce
 * module ne connaît que le fichier, jamais le système d'exploitation qui l'ouvre : la
 * résolution en langue concrète (via `navigator.language`) est un repli d'affichage,
 * propre à `src/ui/` — voir `resolveLanguage` ci-dessous, qui reçoit cette langue
 * système en paramètre plutôt que de la lire elle-même.
 */
export type LanguagePreference = { kind: 'explicit'; code: string } | { kind: 'system' }

export interface RenderSettings {
  /** Vrai si le fichier ne contenait aucune préférence — la moitié du corpus. */
  fromDefaults: boolean
  theme: string
  titleColor: string
  titleSizePercent: number
  titleFont: string
  /** Langue d'affichage telle que déclarée par le fichier — voir `LanguagePreference`. */
  language: LanguagePreference
  altitudeUnit: string
  speedUnit: string
  verticalSpeedUnit: string
  windSpeedUnit: string
  /** Unité pour les grandes distances — voir `longDistanceUnit`. */
  distanceUnit: string
  relativeDistanceUnit: string
  airspaceAltitudeUnit: string
}

/**
 * Valeurs de repli pour les exports « pages », qui ne portent aucune préférence. Elles
 * sont relevées sur le seul backup du corpus et ne sont donc pas sourcées : c'est
 * précisément pour cela que `fromDefaults` existe et que l'interface doit le signaler.
 */
const DEFAULTS: Omit<RenderSettings, 'fromDefaults'> = {
  theme: 'WhiteHCTheme',
  titleColor: '#f44336',
  titleSizePercent: 100,
  titleFont: 'normal',
  language: { kind: 'system' },
  altitudeUnit: 'm',
  speedUnit: 'km/h',
  verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h',
  distanceUnit: 'km',
  relativeDistanceUnit: 'km',
  airspaceAltitudeUnit: 'm'
}

/**
 * `Unit.Distance` et `Unit.CompetitionDistance` ne valent jamais une unité seule : c'est
 * une paire séparée par une virgule, « unité pour les petites distances, unité pour les
 * grandes » (`"m,km"` sur le seul backup du corpus). XCTrack choisit laquelle afficher
 * selon la magnitude de la valeur ; nos widgets numériques n'affichent que des exemples
 * en dizaines de kilomètres, donc on ne retient que le second terme.
 */
export function longDistanceUnit(raw: string): string {
  const parts = raw.split(',')
  return parts[1] ?? parts[0] ?? raw
}

/**
 * Les couleurs Android sont des entiers signés 32 bits au format ARGB. La conversion est
 * à sens unique et ne sert qu'à l'affichage : une couleur n'est jamais réécrite dans le
 * document depuis sa forme hexadécimale.
 */
export function androidColorToHex(value: number): string {
  return `#${((value >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`
}

/**
 * Plusieurs préférences numériques sont stockées en chaîne — `Display.WidgetTitleSize`
 * vaut `"140"`. On coerce explicitement plutôt que de supposer un type.
 */
function readNumeric(node: JsonNode, key: string): number | undefined {
  const asNumber = readNumber(node, key)
  if (asNumber !== undefined) return asNumber
  const asString = readString(node, key)
  if (asString === undefined) return undefined
  const parsed = Number(asString)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function readRenderSettings(document: JsonNode): RenderSettings {
  const preferences = getMember(document, 'preferences')
  if (!preferences || preferences.kind !== 'object') {
    return { fromDefaults: true, ...DEFAULTS }
  }

  const color = readNumber(preferences, 'Display.WidgetTitleColor')
  return {
    fromDefaults: false,
    theme: readString(preferences, 'Display.Theme') ?? DEFAULTS.theme,
    titleColor: color === undefined ? DEFAULTS.titleColor : androidColorToHex(color),
    titleSizePercent: readNumeric(preferences, 'Display.WidgetTitleSize') ?? DEFAULTS.titleSizePercent,
    titleFont: readString(preferences, 'Display.WidgetTitleFont') ?? DEFAULTS.titleFont,
    language: languageOf(preferences),
    altitudeUnit: readString(preferences, 'Unit.Altitude') ?? DEFAULTS.altitudeUnit,
    speedUnit: readString(preferences, 'Unit.Speed') ?? DEFAULTS.speedUnit,
    verticalSpeedUnit: readString(preferences, 'Unit.VerticalSpeed') ?? DEFAULTS.verticalSpeedUnit,
    windSpeedUnit: readString(preferences, 'Unit.WindSpeed') ?? DEFAULTS.windSpeedUnit,
    distanceUnit: distanceUnitOf(preferences, 'Unit.Distance') ?? DEFAULTS.distanceUnit,
    relativeDistanceUnit: readString(preferences, 'Unit.RelativeDistance') ?? DEFAULTS.relativeDistanceUnit,
    airspaceAltitudeUnit: readString(preferences, 'Unit.AirspaceAltitude') ?? DEFAULTS.airspaceAltitudeUnit
  }
}

function distanceUnitOf(preferences: JsonNode, key: string): string | undefined {
  const raw = readString(preferences, key)
  return raw === undefined ? undefined : longDistanceUnit(raw)
}

/**
 * `Display.Language` peut être absente ou valoir la chaîne vide : dans les deux cas,
 * le pilote n'a rien choisi explicitement dans XCTrack, et l'application y suit la
 * langue du système Android — jamais l'anglais par défaut. On ne normalise donc pas
 * le vide en une langue : on le nomme `{ kind: 'system' }`, une information vraie sur
 * le fichier plutôt qu'une supposition.
 */
function languageOf(preferences: JsonNode): LanguagePreference {
  const raw = readString(preferences, 'Display.Language')
  return raw !== undefined && raw.length > 0 ? { kind: 'explicit', code: raw } : { kind: 'system' }
}

/**
 * Résout une préférence de langue en code concret pour l'affichage. `systemLanguage`
 * est fourni par l'appelant — typiquement `navigator.language`, côté `src/ui/` — plutôt
 * que lu ici : ce module décrit des fichiers XCTrack, il ne connaît pas le DOM et ne
 * doit jamais appeler `navigator` lui-même.
 */
export function resolveLanguage(preference: LanguagePreference, systemLanguage: string): string {
  return preference.kind === 'explicit' ? preference.code : systemLanguage
}
