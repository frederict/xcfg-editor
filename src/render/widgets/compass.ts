import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readRotation } from './rotation'

/**
 * `WCompass` — boussole en plein écran (rendu-observe.md, « Boussole »). Disque à
 * couronne épaisse noire, douze graduations dont les cardinales sont plus longues,
 * lettre **N** en haut, aiguille à facettes donnant du relief sans ombre portée.
 *
 * **Correction par mesure de pixels, sur le modèle de la correction WStatusLine
 * (rendu-observe.md)** : le relevé de tâche annonçait trois facettes de gris sur
 * l'aiguille. Un échantillonnage pixel par pixel de la seule capture fiable en plein
 * écran — `widget-WCompass-en-vol.png`, bandeau diagnostic confirmé « PAGE 3 — WCompass »
 * — ne trouve que DEUX gris distincts sur l'aiguille elle-même : `#808080` (facette
 * contenant la pointe) et `#606060` (facette opposée), séparés par une ligne à peu près
 * verticale passant par le pivot. `#404040` n'apparaît que sur la couronne, les
 * graduations et le N — jamais sur l'aiguille. Rendu ici avec deux facettes, pas trois.
 *
 * (Deux fichiers de la planche de diagnostic portent un nom trompeur : `widget-
 * WCompass.png` montre en réalité `WSideView` — bandeau « PAGE 4 — WSideView » — et
 * `widget-WVarioColumn.png` re-montre `WCompass` — bandeau « PAGE 3 — WCompass »,
 * needle sous un angle légèrement différent. Seule `widget-WCompass-en-vol.png` est une
 * capture WCompass fiable ; voir le rapport de tâche.)
 *
 * **Couleur selon la taille** : sur `ecran-landscape3-17widgets.png`, la même boussole
 * en petit format (coin d'une page à 17 widgets) a une aiguille ROUGE à deux tons
 * (`#e04040` / `#c02020`, mesurés) là où le plein écran est GRISE à deux tons. Deux
 * mesures indépendantes, un seul palier observé — rien dans le corpus ne fixe un seuil
 * de bascule précis entre les deux ; celui retenu ci-dessous est une estimation qui
 * sépare largement les deux points connus (~15 %/~28 % de large/haut contre ~100 %).
 *
 * **Hors périmètre, faute de capture qui les confirme** : `showWind`, `windStyle`,
 * `newWindArrow`, `showBearing`, `navigation_target` existent dans le corpus (jusqu'à
 * 11/20 occurrences pour `showWind`), mais aucune capture disponible ne montre une
 * flèche de vent ou une ligne de cap superposée au disque — contrairement à
 * `WThermalAssistant`, où le vent est confirmé (map.ts). Ces clés sont donc lues nulle
 * part ici : les implémenter serait inventer un rendu.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW = 200
const CENTER = VIEW / 2
const RING_R = 88

/** Douze positions de 30° en 30°, la position nord (0°) exclue : sur la capture, aucun
 * trait ne perce la couronne sous le N — la lettre en tient lieu. Onze traits restent
 * visibles, dont les trois cardinaux E/S/O, plus longs et plus épais. */
const TICK_ANGLES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
const CARDINAL_ANGLES = new Set([90, 180, 270])

function buildDial(): SVGGElement {
  const dial = svgEl('g', { class: 'xc-compass__dial' })

  dial.append(svgEl('circle', { class: 'xc-compass__ring', cx: String(CENTER), cy: String(CENTER), r: String(RING_R), fill: 'none' }))

  for (const angle of TICK_ANGLES) {
    const cardinal = CARDINAL_ANGLES.has(angle)
    const outer = RING_R - 6
    const inner = outer - (cardinal ? 16 : 10)
    const rad = (angle - 90) * (Math.PI / 180)
    const x1 = CENTER + outer * Math.cos(rad)
    const y1 = CENTER + outer * Math.sin(rad)
    const x2 = CENTER + inner * Math.cos(rad)
    const y2 = CENTER + inner * Math.sin(rad)
    const tick = svgEl('line', {
      class: cardinal ? 'xc-compass__tick xc-compass__tick--cardinal' : 'xc-compass__tick',
      x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1)
    })
    dial.append(tick)
  }

  const n = svgEl('text', {
    class: 'xc-compass__n', x: String(CENTER), y: String(CENTER - RING_R + 30),
    'text-anchor': 'middle'
  })
  n.textContent = 'N'
  dial.append(n)

  return dial
}

/**
 * Aiguille à deux facettes (voir le commentaire de tête) : une pointe et une queue
 * partagent l'axe vertical local, séparées en deux triangles par les points est/ouest du
 * pivot — le triangle contenant la pointe reçoit la facette claire, l'autre la facette
 * sombre. Le groupe entier tourne ensuite selon `angle`, en degrés, autour du pivot.
 */
function buildNeedle(small: boolean, angle: number): SVGGElement {
  const needle = svgEl('g', {
    class: small ? 'xc-compass__needle xc-compass__needle--small' : 'xc-compass__needle',
    transform: `rotate(${angle} ${CENTER} ${CENTER})`
  })

  const tip = `${CENTER},${CENTER - 78}`
  const east = `${CENTER + 26},${CENTER}`
  const west = `${CENTER - 26},${CENTER}`
  const tail = `${CENTER},${CENTER + 46}`

  needle.append(svgEl('polygon', {
    class: 'xc-compass__needle-facet xc-compass__needle-facet--a',
    points: `${tip} ${east} ${tail}`
  }))
  needle.append(svgEl('polygon', {
    class: 'xc-compass__needle-facet xc-compass__needle-facet--b',
    points: `${tip} ${west} ${tail}`
  }))

  return needle
}

/**
 * Illustrative : aucune donnée de cap réelle n'est modélisée ici (comme la trace fixe de
 * map.ts). L'angle sert seulement à démontrer le mécanisme de rotation ci-dessous.
 */
const ILLUSTRATIVE_BEARING = -35

/**
 * En-deçà de ce seuil (sur la plus petite des deux dimensions normalisées, 0 à 1), la
 * boussole est en « petit format » et l'aiguille passe au rouge à deux tons — voir le
 * commentaire de tête pour les deux mesures qui fondent ce seuil.
 */
const SMALL_THRESHOLD = 0.35

/**
 * `rotation` (chaîne nue ici, voir rotation.ts) : `'HEADING'` fait tourner le cadran
 * (graduations + N) pour aligner le cap en haut, l'aiguille restant fixe, pointe en
 * haut ; toute autre valeur (dont `'NORTH'`, la valeur par défaut de `readRotation`)
 * garde le nord en haut et fait tourner l'aiguille. Aucune capture ne montre les deux
 * modes côte à côte : seul le mécanisme — pas l'angle exact — est démontré ici.
 */
export function drawCompass(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-compass'

  const svg = svgEl('svg', { class: 'xc-compass__scene', viewBox: `0 0 ${VIEW} ${VIEW}` })

  const dial = buildDial()
  const rotation = readRotation(widget.node)
  const headingUp = rotation.value === 'HEADING'
  if (headingUp) dial.setAttribute('transform', `rotate(${ILLUSTRATIVE_BEARING} ${CENTER} ${CENTER})`)
  svg.append(dial)

  const width = widget.x2 - widget.x1
  const height = widget.y2 - widget.y1
  const small = Math.min(width, height) / 10000 < SMALL_THRESHOLD
  const needleAngle = headingUp ? 0 : ILLUSTRATIVE_BEARING
  svg.append(buildNeedle(small, needleAngle))

  element.append(svg)
  return element
}
