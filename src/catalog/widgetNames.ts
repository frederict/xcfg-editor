import rawWidgetLabels from './widgetLabels.json'

/**
 * Libellés officiels par langue, extraits de resources.arsc (voir
 * tools/extract-widget-labels.py). Cast explicite plutôt que de laisser TypeScript
 * inférer un type littéral exact depuis le JSON — on veut pouvoir indexer par un
 * `shortName` quelconque, y compris un type de widget inconnu.
 */
const WIDGET_LABELS = rawWidgetLabels as Record<string, Record<string, string>>

/**
 * Repli pour les widgets absents du catalogue officiel — `readableName` n'y descend que
 * si `WIDGET_LABELS` n'a pas d'entrée pour le type demandé. **87 des 89** types connus
 * y figurent désormais, depuis que la clé de titre est aussi lue dans le registre de
 * l'écran d'ajout (voir KNOWN_UNRESOLVED dans tools/extract-widget-labels.py pour les
 * 2 restants, `WProFallback` et `WPMissing`).
 *
 * Conséquence : les 37 entrées ci-dessous sont **toutes** masquées en pratique, et
 * aucune n'est plus atteignable pour un type de widget réel. On les garde plutôt que
 * de les purger — les retirer n'apporterait rien, et le fichier documente encore, pour
 * mémoire, la traduction maison d'origine. Le repli qui sert vraiment est celui d'en
 * dessous : le nom de classe brut, pour les deux types que XCTrack fabrique lui-même.
 */
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

/**
 * Libellé lisible d'un type de widget, dans la langue demandée (typiquement
 * `settings.language`, lue depuis `Display.Language`).
 *
 * Ordre de résolution :
 * 1. le libellé officiel dans la langue demandée (`WIDGET_LABELS`) ;
 * 2. à défaut, le libellé officiel en anglais — la langue source du catalogue ;
 * 3. à défaut (widget absent du catalogue officiel), la table de repli manuelle ;
 * 4. à défaut, le nom de classe brut.
 *
 * Anomalie connue et volontairement conservée : dans les ressources XCTrack, les
 * libellés français de WCompTimeToStart et WCompTimeAtStart semblent inversés par
 * rapport à leur sémantique anglaise (voir le commentaire dédié dans
 * tools/extract-widget-labels.py). Ce n'est pas une erreur d'extraction — l'objectif
 * est de reproduire XCTrack tel qu'il est, pas de corriger sa traduction.
 */
export function readableName(shortName: string, language: string): string {
  const labels = WIDGET_LABELS[shortName]
  if (labels !== undefined) {
    return labels[language] ?? labels.en ?? shortName
  }
  return WIDGET_NAMES[shortName] ?? shortName
}

/**
 * Le libellé d'une **classe de page** — `WPThermalAssistant`, `WPXCAssistant`,
 * `WPCompetition`, `WPEmpty` — dans la langue demandée.
 *
 * XCTrack range ses classes de page dans le même paquet de ressources que ses gadgets
 * (`org/xcontest/XCTrack/widget/wp/…`, clés `wp<Nom>Title`), et
 * `tools/extract-widget-labels.py` les relève avec eux : `WIDGET_LABELS` les porte donc
 * déjà, en 32 langues. Cet accesseur existe pour le **dire** — un appelant qui écrirait
 * `readableName('WPEmpty', …)` laisserait croire qu'une page est un gadget — et pour
 * couper le repli qui n'a pas de sens ici : `WIDGET_NAMES` est une table de noms de
 * gadgets, aucune classe de page n'y figure.
 *
 * Repli : la langue demandée, puis l'anglais (la locale par défaut de l'APK, celle
 * qu'Android sert quand la traduction manque), puis le nom court tel quel — une classe
 * qu'aucune version relevée ne documente reste nommée.
 *
 * ⚠️ Axe `labels` : la langue du **fichier ouvert**, jamais celle de notre interface.
 * Voir `src/i18n/axes.ts`.
 */
export function pageClassLabel(shortName: string, language: string): string {
  const labels = WIDGET_LABELS[shortName]
  if (labels === undefined) return shortName
  return labels[language] ?? labels.en ?? shortName
}
