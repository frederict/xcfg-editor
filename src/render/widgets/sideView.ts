import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WSideView` — coupe verticale du terrain (rendu-observe.md, « Vue de profil »).
 *
 * **Capture fiable, mais mal étiquetée sur le disque** : le fichier `widget-WCompass.png`
 * de la planche de diagnostic montre en réalité `WSideView` — son propre bandeau
 * l'indique sans ambiguïté (« PAGE 4 — WSideView »). C'est la seule capture plein écran
 * de ce widget disponible ; `widget-WSideView.png`, lui, re-montre `WVerticalGraph`
 * (bandeau « PAGE 5 — WVerticalGraph ») — voir compass.ts pour le même constat sur la
 * paire WCompass/WVarioColumn. Les couleurs et éléments ci-dessous sont mesurés dessus,
 * pixel par pixel.
 *
 * Relevé : profil du terrain en aplat beige (`#e2cfaa` mesuré), un volume d'espace aérien
 * « normal » en beige plus clair (`#f9f0d7`, étiquette « NAMUR AREA »), un volume plus
 * étroit en rose très clair (`#f6d7d7`, étiquette « TSA36 FLAWIN ») — deux teintes
 * différentes pour deux volumes différents, cohérent avec la distinction « zone
 * réglementée » observée ailleurs sur les cartes (bordures rouge/orange, rendu-observe.md
 * « Cartes »), mais aucune clé du corpus (`distance`, `finalGlideAvg`, `type`, valeur
 * unique `'SIDE_BEARING'` sur les 5 occurrences) ne dit laquelle des deux couleurs
 * s'applique à quel volume réel : les deux exemples ci-dessous sont donc fixes et
 * illustratifs, comme la trace de map.ts — pas calculés depuis le fichier.
 * Échelle horizontal graduée en kilomètres, également fixe (mêmes réserves que
 * `SCALE_LABEL` dans map.ts : aucune formule de conversion `distance` → distance
 * affichée n'est sourcée).
 *
 * **Vu sur la capture, non repris ici, faute de certitude sur sa fonction** : un petit
 * repère « 500m » en haut à droite, et un pictogramme en forme d'œil en bas à droite.
 * Ni l'un ni l'autre n'a de contrepartie documentée ailleurs dans le projet — les
 * inventer serait deviner leur rôle plutôt que le relever.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW_W = 300
const VIEW_H = 180

/** Silhouette fixe, déterministe — comme la trace d'exemple de map.ts, elle juge la
 * mise en page et ne code aucun relief réel. */
const TERRAIN_POINTS: Array<[number, number]> = [
  [0, 150], [15, 145], [30, 120], [45, 112], [60, 120], [75, 140], [90, 155],
  [105, 150], [120, 135], [135, 128], [150, 132], [165, 128], [180, 130],
  [195, 122], [210, 118], [225, 122], [240, 118], [255, 122], [270, 120],
  [285, 124], [300, 122]
]

function buildTerrain(): SVGPolygonElement {
  const points = [`0,${VIEW_H}`, ...TERRAIN_POINTS.map(([x, y]) => `${x},${y}`), `${VIEW_W},${VIEW_H}`].join(' ')
  return svgEl('polygon', { class: 'xc-sideview__terrain', points })
}

interface AirspaceBlock { x: number; width: number; top: number; bottom: number; name: string; restricted: boolean }

/** Deux volumes d'exemple fixes — voir le commentaire de tête : aucune clé du corpus ne
 * fournit leur position, seule leur existence et leurs deux couleurs sont observées. */
const AIRSPACE_BLOCKS: AirspaceBlock[] = [
  { x: 170, width: 130, top: 15, bottom: 126, name: 'NAMUR AREA', restricted: false },
  { x: 110, width: 18, top: 95, bottom: 126, name: 'TSA36 FLAWIN', restricted: true }
]

function buildAirspace(block: AirspaceBlock): SVGGElement {
  const g = svgEl('g', {
    class: block.restricted ? 'xc-sideview__airspace xc-sideview__airspace--restricted' : 'xc-sideview__airspace'
  })
  g.append(svgEl('rect', {
    x: String(block.x), y: String(block.top), width: String(block.width), height: String(block.bottom - block.top)
  }))
  const label = Object.assign(svgEl('text', {
    class: 'xc-sideview__airspace-label', x: String(block.x + 4), y: String(block.top + 14)
  }), { textContent: block.name })
  g.append(label)
  return g
}

interface ScaleTick { x: number; label: string }

/** Deux graduations d'exemple fixes (« 5km », « 10km ») — mêmes réserves que
 * `SCALE_LABEL` dans map.ts : `distance` (15000 sur le corpus) n'a pas de formule de
 * conversion sourcée vers une distance affichée. */
const SCALE_TICKS: ScaleTick[] = [
  { x: 100, label: '5km' },
  { x: 200, label: '10km' }
]

function buildScale(): SVGGElement {
  const g = svgEl('g', { class: 'xc-sideview__scale' })
  for (const tick of SCALE_TICKS) {
    g.append(svgEl('line', { class: 'xc-sideview__scale-tick', x1: String(tick.x), y1: String(VIEW_H - 24), x2: String(tick.x), y2: String(VIEW_H - 6) }))
    const label = Object.assign(svgEl('text', {
      class: 'xc-sideview__scale-label', x: String(tick.x + 3), y: String(VIEW_H - 8)
    }), { textContent: tick.label })
    g.append(label)
  }
  return g
}

export function drawSideView(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-sideview'

  const svg = svgEl('svg', { class: 'xc-sideview__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'none' })

  for (const block of AIRSPACE_BLOCKS) svg.append(buildAirspace(block))
  svg.append(buildTerrain())
  svg.append(buildScale())

  element.append(svg)
  return element
}
