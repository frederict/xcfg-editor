/** Libellés d'après le manuel des widgets AIR³. Types absents : nom de classe brut. */
export const WIDGET_NAMES: Record<string, string> = {
  WAltitude: 'Altitude',
  WAltitudeAboveGround: 'Hauteur sol',
  WFL: 'Niveau de vol',
  WSpeed: 'Vitesse sol',
  WVerticalSpeed: 'Vario',
  WVarioColumn: 'Vario colonne',
  WGlide: 'Finesse',
  WAirTime: 'Temps de vol',
  WTime: 'Heure',
  WCompass: 'Boussole',
  WWindSpeed: 'Vitesse du vent',
  WWindDirection: 'Direction du vent',
  WStatusLine: 'Barre d’état',
  WThermalAssistant: 'Assistant de thermique',
  WThermalAltGain: 'Gain dans le thermique',
  WXCAssistant: 'Assistant XC',
  WCompMap: 'Carte de compétition',
  WSideView: 'Vue de profil',
  WVerticalGraph: 'Graphe vertical',
  WAirspaceProximity: 'Proximité d’espace aérien',
  WLiveMessage: 'Message Livetrack',
  WButtonNavig: 'Bouton de navigation',
  WButtonBrightness: 'Bouton de luminosité',
  WNextTurnpoint: 'Balise suivante',
  WNextTurnpointAlt: 'Altitude à la balise suivante',
  WNextTurnpointDistance: 'Distance à la balise suivante',
  WNextTurnpointGlideTo: 'Finesse vers la balise suivante',
  WNextTurnpointTimeOfArrival: 'Heure d’arrivée à la balise',
  WOptiResult: 'Résultat d’optimisation',
  WOptiUnfinishedTriangle: 'Triangle inachevé',
  WCompDistanceToGoal: 'Distance au but',
  WCompAltitudeOverGoal: 'Altitude au-dessus du but',
  WCompGlideToGoal: 'Finesse vers le but',
  WCompTimeToStart: 'Temps avant le départ',
  WCompTimeAtStart: 'Heure de départ',
  WCompSpeedToStart: 'Vitesse vers le départ',
  WCompTaskSummary: 'Résumé de la manche'
}

export function readableName(shortName: string): string {
  return WIDGET_NAMES[shortName] ?? shortName
}
