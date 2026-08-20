import { register, registerTransparent } from '../registry'
import { drawNumeric } from './numeric'
import { drawStatusLine } from './statusLine'
import { drawTouchZone } from './touchZone'
import { drawCompMap, drawThermalAssistant, drawXCAssistant } from './map'
import { drawCompass } from './compass'
import { drawVarioColumn } from './varioColumn'
import { drawVerticalGraph } from './verticalGraph'
import { drawSideView } from './sideView'
import { drawWindDirection } from './windDirection'

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

// Tâche 17, les graphiques de vol : WThermalAssistant est déjà enregistré ci-dessus
// (map.ts) ; les cinq autres ont chacun leur fichier, sur consigne explicite du plan
// (« chacun en SVG, dans un fichier distinct ») — voir compass.ts, varioColumn.ts,
// verticalGraph.ts, sideView.ts, windDirection.ts pour le détail des relevés et des
// réserves propres à chacun.
register('WCompass', drawCompass)
register('WVarioColumn', drawVarioColumn)
register('WVerticalGraph', drawVerticalGraph)
register('WSideView', drawSideView)
register('WWindDirection', drawWindDirection)

// Zones tactiles sans rendu visible (rendu-observe.md, « Widgets sans rendu visible ») :
// dessin dédié ET transparence forcée, quelles que soient _bg/_border dans le fichier.
for (const shortName of ['WButtonBrightness', 'WButtonNavig']) {
  register(shortName, drawTouchZone)
  registerTransparent(shortName)
}

// Tâche 18 (restante, hors périmètre de la 17 ci-dessus) : WAirspaceProximity,
// WLiveMessage, WCompTaskSummary n'ont pas encore de dessin — voir le rapport de la
// tâche 17 pour le détail. `coverage.test.ts` le signale sciemment : c'est le but de ce
// test, pas un défaut des cinq types enregistrés au-dessus.
