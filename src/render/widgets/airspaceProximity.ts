import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readString } from '../../core/access'
import { widgetBoolean } from '../defaults'
import { measuredWidthEm, valueWidthEm } from '../textMetrics'

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
  /** Vrai quand la flèche du pictogramme TRAVERSE la hachure — voir `buildHorizontalIcon`.
   * C'est cette clé, et elle seule, qui décide de la teinture de la ligne. */
  verticalCrosses: boolean
  horizontalCrosses: boolean
}

/** Première zone : valeurs recopiées telles quelles depuis ecran-non-identifie-4.png.
 * Seconde zone : nom et plancher-plafond recopiés (« Charleroi / 760 m - FL55 » — les
 * plafonds se notent indifféremment en mètres ou en niveau de vol, rendu-observe.md) ;
 * distances inventées pour illustrer le même gabarit, faute de capture les montrant. */
const EXAMPLE_ZONES: ExampleZone[] = [
  // La zone A de `2026-08-21_espace-aerien-teinture.png` est la seule dont une distance
  // traverse la hachure : c'est elle qui a permis de trancher la règle de teinture.
  { name: 'BEAUVECHAIN', range: '760 m - 1370 m', vertical: '667 m', horizontal: '576 m', verticalCrosses: false, horizontalCrosses: true },
  { name: 'Charleroi', range: '760 m - FL55', vertical: '1120 m', horizontal: '830 m', verticalCrosses: false, horizontalCrosses: false }
]

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/**
 * ## Le pictogramme, et la règle de teinture qu'il porte — § 6.1, TRANCHÉ
 *
 * `captures-air3/2026-08-21_espace-aerien-teinture.png` porte quatre `WAirspaceProximity`
 * de même largeur (2500) et de hauteurs 2500 / 5000 / 7500 / 10000, sur deux zones
 * réelles. **Le motif de fond est rigoureusement le même dans les quatre** : la teinture
 * est donc une propriété de la DONNÉE, pas de la mise en page.
 *
 * | ligne | zone A | zone B |
 * |---|---|---|
 * | nom de la zone | teintée | teintée |
 * | plancher – plafond | teintée | teintée |
 * | distance verticale, flèche s'arrêtant SOUS la hachure | blanche | blanche |
 * | distance horizontale | flèche TRAVERSANT la hachure → **teintée** | flèche s'arrêtant avant → blanche |
 *
 * > Les deux lignes d'identité sont toujours teintées. Une ligne de **distance** est
 * > teintée **quand sa flèche traverse la hachure**, et blanche quand elle s'arrête avant.
 *
 * Les deux lectures envisagées auparavant — « l'identité est teintée, les distances non »
 * et son inverse — sont **toutes les deux fausses** : elles tombaient juste 7 fois sur 8,
 * une seule ligne les départageant. C'est exactement pourquoi la réserve était écrite ici
 * plutôt que tranchée au jugé.
 *
 * Le pictogramme n'est donc pas une simple flèche : c'est une flèche ET une **hachure**,
 * la barrière que la trajectoire franchit ou non.
 *
 * **Ce qui reste ouvert** : le comportement à trois zones ou plus, et le cas d'une zone
 * réellement pénétrée — le rejeu de trace ne traverse aucun espace aérien chargé sur
 * l'appareil.
 */

/**
 * La hachure : un filet épais bordé de petites dents, la barrière du volume. `side` dit de
 * quel côté du filet les dents se posent — sur la capture, elles regardent toujours vers
 * l'INTÉRIEUR du volume, donc à l'opposé de la flèche.
 */
function appendBarrier(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, side = 1): void {
  svg.append(svgEl('line', { class: 'xc-airprox__hatch', x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) }))
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  // Dents perpendiculaires, du côté « intérieur » du volume.
  const nx = (-dy / len) * 3.2 * side
  const ny = (dx / len) * 3.2 * side
  for (let i = 1; i <= 5; i++) {
    const t = i / 6
    const px = x1 + dx * t
    const py = y1 + dy * t
    svg.append(svgEl('line', {
      class: 'xc-airprox__hatch-tooth',
      x1: px.toFixed(1), y1: py.toFixed(1), x2: (px + nx).toFixed(1), y2: (py + ny).toFixed(1)
    }))
  }
}

/**
 * Flèche verticale, pour la distance au plancher/plafond le plus proche. Sur les deux
 * zones de la capture, elle s'arrête SOUS la hachure : jamais teintée dans ce relevé.
 */
function buildVerticalIcon(): SVGSVGElement {
  const svg = svgEl('svg', { class: 'xc-airprox__icon', viewBox: '0 0 24 24' })
  appendBarrier(svg, 3, 4.5, 21, 4.5, -1)
  svg.append(svgEl('line', { x1: '12', y1: '22', x2: '12', y2: '12', 'stroke-linecap': 'round' }))
  svg.append(svgEl('polygon', { points: '12,7.5 19,15 5,15' }))
  return svg
}

/**
 * Flèche oblique, pour la distance horizontale. Deux formes, et c'est LA différence que
 * la teinture suit : `crossing` traverse la hachure, sinon elle s'arrête avant.
 */
function buildHorizontalIcon(crossing: boolean): SVGSVGElement {
  const svg = svgEl('svg', { class: 'xc-airprox__icon', viewBox: '0 0 24 24' })
  if (crossing) {
    appendBarrier(svg, 4, 16, 18, 5, -1)
    svg.append(svgEl('line', { x1: '4', y1: '5', x2: '17', y2: '18', 'stroke-linecap': 'round' }))
    svg.append(svgEl('polygon', { points: '21,22 12.5,20 20,12.5' }))
  } else {
    svg.append(svgEl('line', { x1: '3', y1: '4', x2: '12', y2: '13', 'stroke-linecap': 'round' }))
    svg.append(svgEl('polygon', { points: '16,17 7.5,15 15,7.5' }))
    appendBarrier(svg, 17, 9, 21, 22)
  }
  return svg
}

/**
 * Graisse du widget : tout y est en gras sur la capture, y compris la ligne
 * plancher-plafond. Sert à mesurer les textes dans la police qui les dessinera.
 */
const LINE_FONT_WEIGHT = 700

/**
 * Place prise par le pictogramme d'une ligne de distance, en cadratins : la flèche fait
 * 0,8 em (`.xc-airprox__icon`, style.css) et l'écart 0,3 em (`.xc-airprox__line`).
 */
const ICON_WIDTH_EM = 1.1

/**
 * Publie sur la ligne la largeur de son texte, en cadratins — mesurée dans la police du
 * navigateur quand c'est possible. `style.css` s'en sert pour ne réduire une ligne QUE
 * si elle ne tiendrait pas dans la largeur de la zone : c'est ce que fait l'appareil,
 * où « Charleroi » se dessine à pleine taille (casse 49 px) et « BEAUVECHAIN », plus
 * long dans la même largeur, à 33 px.
 */
function publishWidth(line: HTMLElement, text: string, extraEm = 0): void {
  const em = (measuredWidthEm(text, LINE_FONT_WEIGHT) ?? valueWidthEm(text)) + extraEm
  line.style.setProperty('--xc-line-em', String(Math.max(1, em)))
}

function buildDistance(className: string, icon: SVGSVGElement, text: string, crossing: boolean): HTMLElement {
  const row = document.createElement('span')
  // La teinture suit le PICTOGRAMME, pas le rang de la ligne — voir `buildHorizontalIcon`.
  const tint = crossing ? ' xc-airprox__line--tinted' : ''
  row.className = `xc-airprox__line ${className}${tint}`
  row.append(icon)
  const value = document.createElement('span')
  value.textContent = text
  row.append(value)
  publishWidth(row, text, ICON_WIDTH_EM)
  return row
}

function buildZone(widget: Widget, zone: ExampleZone): HTMLElement {
  const el = document.createElement('div')
  el.className = 'xc-airprox__zone'

  const name = document.createElement('span')
  name.className = 'xc-airprox__line xc-airprox__line--tinted xc-airprox__name'
  name.textContent = zone.name
  publishWidth(name, zone.name)
  el.append(name)

  // Absente du fichier, la clé prend son défaut — `true` d'après le relevé des 75
  // widgets. C'est la ligne « plancher – plafond » (« 760 m - 1370 m ») que la revue des
  // visuels signale manquante au § 1.5 : le corpus porte toujours cette clé (15/15),
  // mais un fichier écrit avec les seules clés universelles, non — et l'ancien
  // `=== true` la faisait alors disparaître.
  if (widgetBoolean(widget, '_showoriginalheightline') ?? false) {
    const range = document.createElement('span')
    range.className = 'xc-airprox__line xc-airprox__line--tinted xc-airprox__range'
    range.textContent = zone.range
    publishWidth(range, zone.range)
    el.append(range)
  }

  el.append(buildDistance(
    'xc-airprox__dist xc-airprox__dist--vertical', buildVerticalIcon(), zone.vertical, zone.verticalCrosses
  ))
  el.append(buildDistance(
    'xc-airprox__dist xc-airprox__dist--horizontal',
    buildHorizontalIcon(zone.horizontalCrosses), zone.horizontal, zone.horizontalCrosses
  ))

  return el
}

export function drawAirspaceProximity(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-airprox'

  const horizontal = readString(widget.node, '_splitdirection') === 'HORIZONTAL'
  if (horizontal) element.classList.add('xc-airprox--row')

  EXAMPLE_ZONES.forEach((zone, index) => {
    if (index > 0) {
      const divider = document.createElement('hr')
      divider.className = 'xc-airprox__divider'
      element.append(divider)
    }
    element.append(buildZone(widget, zone))
  })

  // Combien de lignes se superposent en hauteur, et combien de zones se partagent la
  // largeur : `style.css` en tire la hauteur d'une bande, donc la taille du texte. Rien
  // en CSS ne donne ce compte — `--xc-h` est la hauteur du widget entier.
  const linesPerZone = element.querySelectorAll('.xc-airprox__zone')[0]?.childElementCount ?? 0
  element.style.setProperty('--xc-airprox-rows', String(horizontal ? linesPerZone : linesPerZone * EXAMPLE_ZONES.length))
  element.style.setProperty('--xc-airprox-cols', String(horizontal ? EXAMPLE_ZONES.length : 1))

  return element
}
