import type { JsonNode } from '../core/jsonDocument'
import { getMember, readNumber, readString } from '../core/access'

export interface RenderSettings {
  /** Vrai si le fichier ne contenait aucune préférence — la moitié du corpus. */
  fromDefaults: boolean
  theme: string
  titleColor: string
  titleSizePercent: number
  titleFont: string
  altitudeUnit: string
  speedUnit: string
  verticalSpeedUnit: string
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
  altitudeUnit: 'm',
  speedUnit: 'km/h',
  verticalSpeedUnit: 'm/s'
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
    altitudeUnit: readString(preferences, 'Unit.Altitude') ?? DEFAULTS.altitudeUnit,
    speedUnit: readString(preferences, 'Unit.Speed') ?? DEFAULTS.speedUnit,
    verticalSpeedUnit: readString(preferences, 'Unit.VerticalSpeed') ?? DEFAULTS.verticalSpeedUnit
  }
}
