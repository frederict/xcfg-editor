import { register, registerTransparent } from '../registry'
import { drawNumeric } from './numeric'
import { drawStatusLine } from './statusLine'
import {
  drawButtonBrightness,
  drawButtonCamera,
  drawButtonIntentLauncher,
  drawButtonNavig,
  drawButtonPhone,
  drawButtonVario,
  drawButtonVolume,
  drawButtonVolumeReminder,
  drawButtonZoom
} from './buttons'
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

// Les neuf boutons (buttons.ts) — écart 1.6 de la planche : l'appareil dessine pour
// chacun un grand pictogramme noir, y compris pour WButtonBrightness, que nous rendions
// en case vide. `registerTransparent('WButtonBrightness')` a donc disparu : il venait
// d'une page où deux zones de luminosité étaient RECOUVERTES par un WThermalAssistant
// dessiné après elles (landscape[3] de 2026-08-20_backup-00.xcfg, bornes identiques à
// l'union des deux). Ce recouvrement-là se reproduit tout seul, canvas.ts empilant les
// widgets dans l'ordre du fichier — voir le commentaire de tête de buttons.ts pour la
// règle complète, et rendu-observe.md pour ce qui était affirmé et pourquoi c'était faux.
register('WButtonNavig', drawButtonNavig)
register('WButtonPhone', drawButtonPhone)
register('WButtonCamera', drawButtonCamera)
register('WButtonZoom', drawButtonZoom)
register('WButtonVario', drawButtonVario)
register('WButtonBrightness', drawButtonBrightness)
register('WButtonVolume', drawButtonVolume)
register('WButtonVolumeReminder', drawButtonVolumeReminder)
register('WButtonIntentLauncher', drawButtonIntentLauncher)

// Tâche 18, les trois derniers types du corpus. WAirspaceProximity est bien documenté
// (capture réelle, voir airspaceProximity.ts) ; WLiveMessage et WCompTaskSummary ne le
// sont pas — voir leurs commentaires de tête respectifs pour le détail des réserves.
// Avec ces trois dessins, les 37 types du corpus ont un dessin enregistré :
// `coverage.test.ts` passe désormais entièrement au vert sans avoir été modifié.
register('WAirspaceProximity', drawAirspaceProximity)
register('WLiveMessage', drawLiveMessage)
// Comparaison au sol (vol-thermalassistant-boutonsnavig.png, landscape[4] du corpus) :
// WLiveMessage recouvre entièrement deux WButtonNavig dans le fichier (_bg: 100, dessiné
// après), mais les deux boutons sont bien visibles sur l'appareil — comme
// WButtonBrightness, il ne peint rien au repos. Voir registry.ts (commentaire de
// registerTransparent) et liveMessage.ts pour le détail.
registerTransparent('WLiveMessage')
register('WCompTaskSummary', drawCompTaskSummary)
