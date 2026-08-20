import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'

/**
 * `WAirspaceProximity` — proximité d'espace aérien (rendu-observe.md, « Proximité
 * d'espace aérien », et `docs/reference/captures-air3/ecran-non-identifie-4.png` :
 * colonne de gauche, deux zones empilées « BEAUVECHAIN » puis « Charleroi », fond bleu
 * très clair, filet rouge entre les deux). C'est le seul des trois types de la tâche 18
 * qui soit bien documenté par une capture réelle — voir liveMessage.ts et
 * compTaskSummary.ts pour les deux autres, non observés.
 *
 * Structure par zone, telle que décrite dans rendu-observe.md et confirmée pixel par
 * pixel sur la capture pour la première zone (« BEAUVECHAIN / 760 m - 1370 m / ↑ 667 m /
 * ↗ 576 m ») : nom en gras, plancher-plafond, distance verticale (flèche verticale),
 * distance horizontale (flèche oblique). La capture s'arrête après « Charleroi / 760 m -
 * FL55 » — coupée par le bord de l'écran capturé, pas par le widget lui-même (le filet
 * rouge la précède, signe qu'une troisième ligne était attendue) : on applique donc le
 * même gabarit à chaque zone (« Chaque bloc : », rendu-observe.md), plutôt que de
 * supposer que les zones suivantes perdent leurs distances. Les deux distances de la
 * seconde zone ci-dessous sont donc des valeurs d'exemple inventées, non sourcées par la
 * capture — comme les volumes d'exemple de `sideView.ts` — alors que celles de la
 * première zone sont recopiées telles quelles depuis la capture.
 *
 * Aucune clé `_title`/`titletext` dans le corpus (contrairement aux 23 widgets
 * numériques, `numeric.ts`) : pas de titre dessiné.
 *
 * Clés propres relevées sur les 15 occurrences du corpus (5 fichiers × 3 emplacements) :
 * - `maxDistance` : toujours `3000`. Un rayon de recherche en mètres, vraisemblablement —
 *   mais sans distance réelle au pilote à comparer (ce module ne modélise aucune
 *   position GPS), son effet ne peut pas être démontré ici. NON TRANCHÉ.
 * - `_rotation` : toujours `'BEARING'` quand présente (3/15 occurrences, seulement sur
 *   `landscape[2]` de 3 des 5 fichiers). Aucune autre valeur observée pour en déduire
 *   l'alternative ni l'effet visuel. NON TRANCHÉ.
 * - `_shownearinside` (10× `true`, 5× `false`) : vraisemblablement « inclure les zones
 *   dans lesquelles le pilote se trouve déjà ». Sans état de position réelle, aucune des
 *   deux zones d'exemple n'est démontrablement « à l'intérieur » : pas de conditionnement
 *   codé. NON TRANCHÉ.
 * - `_showoriginalheightline` (10× `true`, 5× `false`) : conditionne ici l'affichage de la
 *   ligne plancher-plafond — la seule lecture qui exploite une variation réellement
 *   observée dans le corpus (voir `buildZone` ci-dessous).
 * - `_showrecomputedheightline` : toujours `false` sur les 15 occurrences — aucun cas
 *   `true` à observer, donc aucun effet démontrable à coder. NON TRANCHÉ.
 * - `_splitdirection` (`'AUTO'` 10×, `'HORIZONTAL'` 5×) : corrèle avec la forme du widget
 *   dans le corpus — `'HORIZONTAL'` sur l'unique occurrence large et basse
 *   (`portrait[0]`, ratio ~2,2:1), `'AUTO'` sur les occurrences étroites et hautes
 *   (`landscape[2]`, `portrait[2]`). Conditionne ici l'orientation de l'empilement des
 *   zones (colonne par défaut, ligne si `'HORIZONTAL'`).
 * - `postponedFloorLimit` (`5000` ou `2500`) et `postponedDisplayDistance` (toujours
 *   `300`) : vraisemblablement des seuils d'affichage différé, mais sans mécanisme de
 *   délai à simuler dans un rendu statique, leur effet n'est pas démontrable. NON TRANCHÉ.
 */

interface ExampleZone {
  name: string
  range: string
  vertical: string
  horizontal: string
}

/** Première zone : valeurs recopiées telles quelles depuis ecran-non-identifie-4.png.
 * Seconde zone : nom et plancher-plafond recopiés (« Charleroi / 760 m - FL55 » — les
 * plafonds se notent indifféremment en mètres ou en niveau de vol, rendu-observe.md) ;
 * distances inventées pour illustrer le même gabarit, faute de capture les montrant. */
const EXAMPLE_ZONES: ExampleZone[] = [
  { name: 'BEAUVECHAIN', range: '760 m - 1370 m', vertical: '667 m', horizontal: '576 m' },
  { name: 'Charleroi', range: '760 m - FL55', vertical: '1120 m', horizontal: '830 m' }
]

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/** Flèche verticale, pour la distance au plancher/plafond le plus proche. */
function buildVerticalIcon(): SVGSVGElement {
  const svg = svgEl('svg', { class: 'xc-airprox__icon', viewBox: '0 0 24 24' })
  svg.append(svgEl('line', { x1: '12', y1: '21', x2: '12', y2: '5', 'stroke-linecap': 'round' }))
  svg.append(svgEl('polygon', { points: '12,2 19,11 5,11' }))
  return svg
}

/** Flèche oblique (vers le nord-est), pour la distance horizontale. */
function buildHorizontalIcon(): SVGSVGElement {
  const svg = svgEl('svg', { class: 'xc-airprox__icon', viewBox: '0 0 24 24' })
  svg.append(svgEl('line', { x1: '4', y1: '20', x2: '19', y2: '5', 'stroke-linecap': 'round' }))
  svg.append(svgEl('polygon', { points: '19,2 20,10 12,9' }))
  return svg
}

function buildDistance(className: string, icon: SVGSVGElement, text: string): HTMLElement {
  const row = document.createElement('span')
  row.className = className
  row.append(icon)
  const value = document.createElement('span')
  value.textContent = text
  row.append(value)
  return row
}

function buildZone(widget: Widget, zone: ExampleZone): HTMLElement {
  const el = document.createElement('div')
  el.className = 'xc-airprox__zone'

  const name = document.createElement('span')
  name.className = 'xc-airprox__name'
  name.textContent = zone.name
  el.append(name)

  // Absence équivaut à false, comme les drapeaux `show*` de statusLine.ts : le corpus
  // porte toujours cette clé (15/15), sa lecture par défaut reste donc non exercée.
  if (readBoolean(widget.node, '_showoriginalheightline') === true) {
    const range = document.createElement('span')
    range.className = 'xc-airprox__range'
    range.textContent = zone.range
    el.append(range)
  }

  el.append(buildDistance('xc-airprox__dist xc-airprox__dist--vertical', buildVerticalIcon(), zone.vertical))
  el.append(buildDistance('xc-airprox__dist xc-airprox__dist--horizontal', buildHorizontalIcon(), zone.horizontal))

  return el
}

export function drawAirspaceProximity(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-airprox'

  if (readString(widget.node, '_splitdirection') === 'HORIZONTAL') {
    element.classList.add('xc-airprox--row')
  }

  EXAMPLE_ZONES.forEach((zone, index) => {
    if (index > 0) {
      const divider = document.createElement('hr')
      divider.className = 'xc-airprox__divider'
      element.append(divider)
    }
    element.append(buildZone(widget, zone))
  })

  return element
}
