import type { Widget } from '../model/widget'
import { readString } from '../core/access'
import { readableName } from '../catalog/widgetNames'
import { widgetNumber, widgetString } from './defaults'
import { formatDecimal } from './locale'

/**
 * Le titre d'un widget, tel que l'appareil l'écrit — nom lisible **plus les suffixes que
 * XCTrack y ajoute**.
 *
 * Partagé par `numeric.ts` et `generic.ts` : le titre ne dépend pas du dessin, et les
 * widgets qui portent un suffixe ne sont pas tous dessinés (`WNettoVario` et `WAirSpeed`
 * retombent sur le rendu générique). Le suffixe change la largeur occupée — 143 px
 * contre 97 pour « Vitesse Air TAS » — donc la lisibilité de la page ; le laisser au
 * seul `numeric.ts` aurait raté la moitié des cas.
 *
 * ## Les suffixes, et d'où vient chacun
 *
 * **La période de moyennage** (`avg`, `netto_avg`), en millisecondes, s'écrit « / 2s ».
 * Mesurée sur `captures-air3/2026-08-21_planche-sol-2-vol-b-et-air-a.png` :
 * « Vitesse verticale / 2s » (`avg: 2000`), « Finesse / 2s » (`avg: 2000`),
 * « Vario netto / 0,1s » (`netto_avg: 0`).
 *
 * **`netto_avg: 0` affiche « / 0,1s » et non « / 0s »** — c'est l'écran de l'appareil qui
 * le dit, sur un widget dont le fichier ne portait que ses huit clés universelles. Le
 * mécanisme, lui, n'est **pas établi** : période minimale du vario, ou index dans une
 * liste de choix commençant à 0,1 s. On reproduit donc l'observation pour la valeur 0,
 * et on traite les autres valeurs en millisecondes par analogie avec `avg` — **NON
 * TRANCHÉ**, aucune capture ne montre un `netto_avg` non nul.
 *
 * `avg: 0`, lui, n'a jamais été observé ; comme `speed_avg: 0` n'ajoute rien au titre de
 * « Vitesse Air », on garde la lecture d'origine : zéro ⇒ pas de suffixe.
 *
 * **Le mode** (`speed_type`, `altitude`) s'écrit en abréviation aéronautique, la même
 * dans toutes les langues. Trois cas mesurés, et trois seulement :
 * « Vitesse Air **TAS** » (`speed_type: TAS`, planche 1),
 * « Tps Pt suivant **GS** » et « Temps au départ **GS** » (`speed_type: GROUND`,
 * planches 3 et 4), « Hauteur Pt suivant **AGL** » (`altitude: AGL`, planche 3).
 * Une valeur que ces relevés ne couvrent pas n'ajoute rien : mieux vaut un titre court
 * qu'un suffixe inventé.
 *
 * ## Ce qui n'est PAS reproduit, et pourquoi
 *
 * - **« Boussole Point optimisé »** (`WCompassDigital`). Le libellé est **traduit**
 *   (`widgetSettingsNavigationTargetOptimized`), et il vit dans le catalogue d'options,
 *   partitionné en 34 morceaux chargés par `import()` : un dessin est synchrone et ne
 *   peut pas l'attendre. De plus le relevé donne `target: "N_NAVIGATION"` à ce widget et
 *   pas `navigation_target: "OPTIMIZED"` : le chemin exact entre la clé et le libellé
 *   affiché n'est pas établi. Laissé de côté plutôt que deviné.
 * - **`navigation_target: "OPTIMIZED"` n'ajoute RIEN** aux six widgets de navigation qui
 *   le portent : les planches 3 et 4 montrent « Prochaine distance », « Distance au
 *   but », « Vitesse au départ » sans suffixe. C'est une observation qui vaut la peine
 *   d'être écrite : la clé existe, elle ne se voit pas.
 * - **L'espace double** que l'appareil insère avant `TAS` et `AGL` (« Vitesse Air  TAS »),
 *   mais pas avant `GS`. Constaté sur les captures, non expliqué ; nous écrivons une
 *   espace simple, soit 4 px de moins sur un titre de 143.
 */

/** Les clés qui portent une période de moyennage, en millisecondes. */
const PERIOD_KEYS = ['avg', 'netto_avg'] as const

/**
 * La période affichée quand `netto_avg` vaut 0 — relevé sur l'appareil, voir le
 * commentaire de tête.
 */
const NETTO_ZERO_SECONDS = '0.1'

/**
 * Abréviations de mode observées dans les titres. La clé est le nom de la clé du
 * fichier, la valeur associe le code de XCTrack à ce qui s'affiche.
 */
const MODE_SUFFIXES: Record<string, Record<string, string>> = {
  speed_type: { TAS: 'TAS', GROUND: 'GS' },
  altitude: { AGL: 'AGL' }
}

function periodSuffix(widget: Widget, language: string): string | undefined {
  for (const key of PERIOD_KEYS) {
    const milliseconds = widgetNumber(widget, key)
    if (milliseconds === undefined) continue
    if (milliseconds === 0) {
      if (key !== 'netto_avg') continue
      return `/ ${formatDecimal(NETTO_ZERO_SECONDS, language)}s`
    }
    return `/ ${formatDecimal(String(milliseconds / 1000), language)}s`
  }
  return undefined
}

function modeSuffix(widget: Widget): string | undefined {
  for (const [key, codes] of Object.entries(MODE_SUFFIXES)) {
    const code = widgetString(widget, key)
    if (code === undefined) continue
    const suffix = codes[code]
    if (suffix !== undefined) return suffix
  }
  return undefined
}

/**
 * Le titre à dessiner. Un titre personnalisé (`titletext` renseigné) est pris tel quel :
 * le pilote a écrit ce qu'il voulait lire, et l'appareil n'y ajoute rien — aucun widget
 * du corpus ne combine `titletext` et une clé à suffixe, l'hypothèse n'est donc pas
 * vérifiable, mais c'est la seule lecture cohérente avec un titre choisi à la main.
 */
export function widgetTitle(widget: Widget, language: string): string {
  const custom = readString(widget.node, 'titletext')
  if (custom !== undefined && custom.length > 0) return custom

  const parts = [readableName(widget.shortName, language)]
  const period = periodSuffix(widget, language)
  if (period !== undefined) parts.push(period)
  const mode = modeSuffix(widget)
  if (mode !== undefined) parts.push(mode)
  return parts.join(' ')
}
