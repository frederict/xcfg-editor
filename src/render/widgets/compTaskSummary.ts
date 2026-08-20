import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WCompTaskSummary` — « Résumé de la manche » (libellé officiel `fr` du catalogue,
 * `src/catalog/widgetLabels.json`). **NON OBSERVÉ** : aucune capture de la planche de
 * diagnostic ne le montre. C'est aussi le seul des 37 types du corpus à ne porter aucune
 * clé propre — seulement les huit universelles (`CLASS`, `X1`, `Y1`, `X2`, `Y2`,
 * `_border`, `_bg`, `_theme`), vérifié sur les 5 occurrences du corpus (une par fichier,
 * `landscape[1]`). Il n'y a donc rien à conditionner : le rendu ci-dessous est fixe,
 * un résumé de manche sobre — quelques lignes de balises avec distances d'exemple — pas
 * une reconstitution non vérifiable de l'apparence réelle sur l'appareil.
 *
 * Aucune clé `_title`/`titletext` non plus (universelle ou non) : pas de titre dessiné,
 * comme `airspaceProximity.ts` et `liveMessage.ts`.
 */

interface ExampleLeg { label: string; distance: string }

/** Manche d'exemple fixe et illustrative — aucune tâche réelle n'est modélisée, comme
 * la trace d'exemple de map.ts ou le terrain de sideView.ts. */
const EXAMPLE_LEGS: ExampleLeg[] = [
  { label: 'Départ', distance: '0.0 km' },
  { label: 'Balise 1', distance: '12.4 km' },
  { label: 'Balise 2', distance: '28.7 km' },
  { label: 'But', distance: '45.2 km' }
]

export function drawCompTaskSummary(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-tasksum'

  for (const leg of EXAMPLE_LEGS) {
    const row = document.createElement('div')
    row.className = 'xc-tasksum__leg'

    const label = document.createElement('span')
    label.className = 'xc-tasksum__label'
    label.textContent = leg.label

    const distance = document.createElement('span')
    distance.className = 'xc-tasksum__distance'
    distance.textContent = leg.distance

    row.append(label, distance)
    element.append(row)
  }

  return element
}
