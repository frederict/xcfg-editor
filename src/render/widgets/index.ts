import { register } from '../registry'
import { drawNumeric } from './numeric'

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
