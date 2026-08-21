import { register, registerBlankAtRest } from '../registry'
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
import { drawOptiPotential } from './optiPotential'
import { drawCompassDigital } from './compassDigital'
import { drawEmitTestEvent, drawFreeText } from './freeText'

/**
 * Les types « titre + valeur + unité » : les 23 du corpus, puis les 19 que la revue des
 * 75 visuels a trouvés dessinés par l'appareil et génériques chez nous (écart 2.12). Une
 * boucle suffit : le contrôle de couverture de la tâche 18 interroge l'annuaire à
 * l'exécution, pas le texte de ce fichier.
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
  'WOptiUnfinishedTriangle',

  // Écart 2.12 de la revue des 75 visuels : dix-neuf types de plus, tous « titre +
  // valeur + unité » sur l'appareil, que nous rendions « titre + `--` » faute d'exemple.
  // Leurs valeurs d'exemple, toutes lues sur une capture, sont dans `SPECS`
  // (numeric.ts) avec le fichier et l'état où chacune a été relevée.
  'WBrightnessInfo',
  'WLastEvent',
  'WAirSpeed',
  'WBearing',
  'WBaroAltitude',
  'WAMSL',
  'WTakeoffHeightAbove',
  'WSunset',
  'WSunsetCivil',
  'WAltitudeMaximum',
  'WNettoVario',
  'WQNH',
  'WXCSpeed',
  'WTakeoffDistance',
  'WTakeoffCourse',
  'WCompDistanceToESS',
  'WCompGlideToESS',
  'WExternalData',
  'WLastKey'
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
// en case vide. Le cas particulier qui neutralisait WButtonBrightness a disparu : il
// venait d'une page où deux zones de luminosité étaient RECOUVERTES par un
// WThermalAssistant dessiné après elles (landscape[3] de 2026-08-20_backup-00.xcfg,
// bornes identiques à l'union des deux, et `_bg: 0` donc un fond opaque). Ce
// recouvrement-là se reproduit tout seul, canvas.ts empilant les widgets dans l'ordre du
// fichier — voir le commentaire de tête de buttons.ts pour la règle complète, et
// rendu-observe.md pour ce qui était affirmé et pourquoi c'était faux.
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
// la bande du WLiveMessage est au premier plan, par-dessus la carte, et rien ne s'y voit.
// C'est un fait de RENDU — l'appareil n'y peint aucun contenu tant qu'aucun message n'est
// arrivé — et il ne sert qu'à la marque « sans dessin » de la liste des widgets. Le fond
// et le cadre, eux, suivent `_bg`/`_border` comme pour tout autre type : s'il ne masque
// pas les WButtonNavig qu'il recouvre, c'est parce qu'il porte `_bg: 100`, pas parce que
// son type serait à part. Voir registry.ts (commentaire de registerBlankAtRest).
registerBlankAtRest('WLiveMessage')
register('WCompTaskSummary', drawCompTaskSummary)

// Écart 2.9 de la revue des 75 visuels — les deux gadgets dont l'appareil dessine autre
// chose qu'une ligne « valeur + unité », et que le repli générique réduisait à « -- ».
// Les pastilles XContest de WOptiResult et WOptiUnfinishedTriangle, elles, tiennent dans
// le dessin numérique commun (badge.ts).
register('WOptiUnfinishedFAIPotential', drawOptiPotential)
register('WCompassDigital', drawCompassDigital)

// Écart 2.10 — les deux gadgets « autres » dont tout le contenu vient d'une clé du
// fichier, et qui ne portent AUCUN titre sur l'appareil (freeText.ts).
register('WFreeText', drawFreeText)
register('WEmitTestEvent', drawEmitTestEvent)
