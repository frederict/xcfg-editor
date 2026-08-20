import { register, registerTransparent } from '../registry'
import { drawNumeric } from './numeric'
import { drawStatusLine } from './statusLine'
import { drawTouchZone } from './touchZone'
import { drawButtonNavig } from './buttonNavig'
import { drawCompMap, drawThermalAssistant, drawXCAssistant } from './map'
import { drawCompass } from './compass'
import { drawVarioColumn } from './varioColumn'
import { drawVerticalGraph } from './verticalGraph'
import { drawSideView } from './sideView'
import { drawWindDirection } from './windDirection'
import { drawAirspaceProximity } from './airspaceProximity'
import { drawLiveMessage } from './liveMessage'
import { drawCompTaskSummary } from './compTaskSummary'

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

// Zone tactile sans rendu visible (rendu-observe.md, « Widgets sans rendu visible ») :
// dessin dédié ET transparence forcée, quelles que soient _bg/_border dans le fichier.
// WButtonNavig en est sorti — correction en vol, rendu-en-vol.md § 4 : voir
// buttonNavig.ts, il dessine un pictogramme visible et reçoit le cadre générique.
register('WButtonBrightness', drawTouchZone)
registerTransparent('WButtonBrightness')

register('WButtonNavig', drawButtonNavig)

// Tâche 18, les trois derniers types du corpus. WAirspaceProximity est bien documenté
// (capture réelle, voir airspaceProximity.ts) ; WLiveMessage et WCompTaskSummary ne le
// sont pas — voir leurs commentaires de tête respectifs pour le détail des réserves.
// Avec ces trois dessins, les 37 types du corpus ont un dessin enregistré :
// `coverage.test.ts` passe désormais entièrement au vert sans avoir été modifié.
register('WAirspaceProximity', drawAirspaceProximity)
register('WLiveMessage', drawLiveMessage)
register('WCompTaskSummary', drawCompTaskSummary)
