import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readNumber, readString } from '../../core/access'
import { readableName } from '../../catalog/widgetNames'

/**
 * `WWindDirection` — correction en vol (rendu-en-vol.md § 3). Le premier relevé, fait
 * au sol sans une seule capture de ce type isolément, avait retenu une rose ou une
 * flèche par défaut de mieux. En vol, « Direction du vent » affiche la **lettre du
 * point cardinal**, en très gros caractères noirs — `S` pour un vent de sud sur
 * `vol-numeriques-boussole-variocolumn.png` — comme un widget numérique dont la valeur
 * serait une lettre. Rien de graphique : ni rose, ni flèche.
 *
 * Aucune donnée de vent réelle n'est modélisée ici (comme le cap de compass.ts ou la
 * trace de map.ts) : `S` est une valeur d'exemple statique, reprise de la capture — le
 * même principe que les valeurs d'exemple de `numeric.ts` (`SPECS[...].example`).
 *
 * `degrees` (booléen sur les 10 occurrences connues du corpus, jamais un angle
 * numérique) bascule vraisemblablement vers un affichage en degrés à la place de la
 * lettre — non observé sur aucune capture. **NON TRANCHÉ** : la lecture numérique
 * (`readNumber`) reste défensive pour le jour où un fichier porterait un angle réel,
 * mais reproduit une bascule (l'un OU l'autre), pas un ajout, par cohérence avec la
 * formulation du relevé de tâche (« bascule vers »).
 */

const EXAMPLE_CARDINAL = 'S'

export function drawWindDirection(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-wind-dir'

  if (readBoolean(widget.node, '_title') === true) {
    const title = document.createElement('span')
    title.className = 'xc-wind-dir__title'
    title.style.color = settings.titleColor
    const custom = readString(widget.node, 'titletext')
    title.textContent = custom !== undefined && custom.length > 0 ? custom : readableName(widget.shortName, language)
    element.append(title)
  }

  const degrees = readNumber(widget.node, 'degrees')
  const value = document.createElement('span')
  if (degrees !== undefined) {
    value.className = 'xc-wind-dir__value xc-wind-dir__value--degrees'
    value.textContent = `${degrees}°`
  } else {
    value.className = 'xc-wind-dir__value xc-wind-dir__value--letter'
    value.textContent = EXAMPLE_CARDINAL
  }
  element.append(value)

  return element
}
