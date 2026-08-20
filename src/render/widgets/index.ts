import { register, registerTransparent } from '../registry'
import { drawNumeric } from './numeric'
import { drawStatusLine } from './statusLine'
import { drawTouchZone } from './touchZone'
import { drawCompMap, drawThermalAssistant, drawXCAssistant } from './map'

/**
 * Les 23 types « titre + valeur + unité » du corpus (voir `numeric.ts`). Une boucle
 * suffit : le contrôle de couverture de la tâche 18 interroge l'annuaire à l'exécution,
 * pas le texte de ce fichier.
 */
const NUMERIC_TYPES = [
  'WAltitude',
  'WAltitudeAboveGround',
  'WFL',
  'WSpeed',
  'WVerticalSpeed',
  'WGlide',
  'WAirTime',
  'WTime',
  'WWindSpeed',
  'WThermalAltGain',
  'WNextTurnpoint',
  'WNextTurnpointAlt',
  'WNextTurnpointDistance',
  'WNextTurnpointGlideTo',
  'WNextTurnpointTimeOfArrival',
  'WCompDistanceToGoal',
  'WCompAltitudeOverGoal',
  'WCompGlideToGoal',
  'WCompTimeToStart',
  'WCompTimeAtStart',
  'WCompSpeedToStart',
  'WOptiResult',
  'WOptiUnfinishedTriangle'
]

for (const shortName of NUMERIC_TYPES) {
  register(shortName, drawNumeric)
}

register('WStatusLine', drawStatusLine)

// Les trois cartes (map.ts) : charpente partagée, un module paramétré — voir le
// commentaire de tête de map.ts pour le choix de mécanisme.
register('WCompMap', drawCompMap)
register('WXCAssistant', drawXCAssistant)
register('WThermalAssistant', drawThermalAssistant)

// Zones tactiles sans rendu visible (rendu-observe.md, « Widgets sans rendu visible ») :
// dessin dédié ET transparence forcée, quelles que soient _bg/_border dans le fichier.
for (const shortName of ['WButtonBrightness', 'WButtonNavig']) {
  register(shortName, drawTouchZone)
  registerTransparent(shortName)
}
