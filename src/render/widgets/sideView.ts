import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WSideView` — coupe verticale du terrain (rendu-observe.md, « Vue de profil »).
 *
 * **Capture de référence** : `captures-air3/widget-WSideView-pleinecran.png`, dont le
 * bandeau porte « PAGE 4 — WSideView ». Les couleurs et les éléments ci-dessous y sont
 * mesurés pixel par pixel.
 *
 * ⚠ **Ce commentaire a porté jusqu'au 2026-08-22 une histoire d'étiquetage qui n'est plus
 * vraie** : il disait mesurer sur `widget-WCompass.png`, « mal étiquetée », et renvoyait à
 * un `widget-WSideView.png` qui aurait montré `WVerticalGraph`. Ni l'un ni l'autre de ces
 * deux fichiers n'existe dans le dépôt de relevés ; les deux captures plein écran qui s'y
 * trouvent — `widget-WCompass-pleinecran.png` et `widget-WSideView-pleinecran.png` — portent
 * chacune le bandeau de son propre widget. Les mesures, elles, sont bonnes : elles ont été
 * revérifiées sur la capture nommée ci-dessus (terrain beige, « NAMUR AREA » en beige
 * clair, « TSA36 FLAWIN » en rose, repère « 500m », pictogramme en forme d'œil).
 *
 * Relevé : profil du terrain en aplat beige (`#e2cfaa` mesuré), un volume d'espace aérien
 * « normal » en beige plus clair (`#f9f0d7`, étiquette « NAMUR AREA »), un volume plus
 * étroit en rose très clair (`#f6d7d7`, étiquette « Charleroi » sur la planche du
 * 2026-08-21, « TSA36 FLAWIN » sur la capture d'origine) — deux teintes
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
 * ## Écart 2.7 de la revue des 75 visuels — « le décor est juste, les instruments manquent »
 *
 * Trois corrections, toutes mesurées sur
 * `captures-air3/2026-08-21_planche-sol-7-carte-manche-vue-de-cote-resume.png`, cellule
 * de 627 × 323 px :
 *
 * - **les colonnes d'espace aérien montent jusqu'au HAUT de la cellule**, du bord
 *   supérieur jusqu'au terrain qui les recouvre — nous en faisions de petits rectangles
 *   flottants à mi-hauteur ;
 * - **leur étiquette est posée en haut, centrée sur la colonne**, et non à l'intérieur
 *   contre son bord gauche ;
 * - le repère **« 500m »** en haut à droite et le **pictogramme en forme d'œil** en bas à
 *   droite sont dessinés. Ils l'étaient déjà sur la capture, et le commentaire disait les
 *   laisser « faute de certitude sur leur fonction » — mais reproduire un dessin ne
 *   demande pas d'en connaître la fonction, et le pilote qui compose sa page a besoin de
 *   savoir que ces deux marques occuperont ces deux coins. Leur RÔLE, lui, reste inconnu
 *   et c'est écrit ici plutôt que deviné.
 *
 * ## Ce qui n'est PAS dessiné — et ce que le rejeu du 2026-08-22 corrige dans ce constat
 *
 * Le paragraphe qui suivait rangeait les lignes d'altitude et la ligne de plané parmi ce
 * qui « vient de la manche et du vol en cours » : elles n'apparaissaient que sur
 * `planche-competition-7`, manche chargée et mode compétition actif. **C'est faux, et
 * c'est aussi la réserve n° 4 qui tombe** (`2026-08-21-reserves-de-rendu.md`).
 *
 * `captures-air3/2026-08-22_rejeu-vue-de-cote.png` — **aucune manche chargée**, `type:
 * SIDE_BEARING`, `distance: 15000` — montre le gadget plein :
 *
 * | élément | présent SANS manche |
 * |---|---|
 * | profil du terrain, brun plein sur toute la largeur | oui |
 * | **grille d'altitude en tirets, étiquetée à droite** (`1500m` … `3000m`) | **oui** |
 * | **ligne de plané en tirets, descendant depuis le pilote** | **oui** |
 * | échelle de distance (`5km`, `10km`) | oui |
 * | traits de balise et leur nom | non — c'est le seul élément qui demande une manche |
 *
 * La densité visuelle de l'appareil est donc très supérieure à la nôtre, et **une part est
 * atteignable sans rien simuler d'un vol** : la grille d'altitude et le profil ne
 * dépendent que de la position. Ce qui manque ici, ce sont la grille et la ligne de plané ;
 * elles demandent deux familles de traits que `style.css` ne porte pas encore. Le trait de
 * balise, lui, reste hors de portée pour la raison d'origine : il vient de la manche.
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

interface AirspaceBlock {
  x: number; width: number; top: number; bottom: number; name: string; restricted: boolean
  /** Ordonnée de l'étiquette — voir `AIRSPACE_BLOCKS` pour la seconde ligne. */
  labelY: number
}

/**
 * Deux volumes d'exemple fixes — voir le commentaire de tête : aucune clé du corpus ne
 * fournit leur position, seules leur existence et leurs deux couleurs sont observées.
 *
 * Ils partent du HAUT de la cellule : sur la capture, les deux colonnes touchent le bord
 * supérieur et descendent jusqu'au terrain, qui les recouvre puisqu'il est dessiné après.
 * C'est pourquoi `bottom` vaut la hauteur entière plutôt qu'une altitude d'exemple.
 */
const AIRSPACE_BLOCKS: AirspaceBlock[] = [
  { x: 152, width: 84, top: 0, bottom: VIEW_H, name: 'NAMUR AREA', restricted: false, labelY: 13 },
  // Deuxième ligne : sur la capture, l'étiquette de la colonne la plus à droite se pose
  // SOUS le repère « 500m », qui occupe la première ligne de ce coin.
  { x: 262, width: 38, top: 0, bottom: VIEW_H, name: 'CHARLEROI', restricted: true, labelY: 27 }
]

function buildAirspace(block: AirspaceBlock): SVGGElement {
  const g = svgEl('g', {
    class: block.restricted ? 'xc-sideview__airspace xc-sideview__airspace--restricted' : 'xc-sideview__airspace'
  })
  g.append(svgEl('rect', {
    x: String(block.x), y: String(block.top), width: String(block.width), height: String(block.bottom - block.top)
  }))
  // Étiquette en haut, CENTRÉE sur la colonne — c'est la place qu'elle occupe sur la
  // capture, et elle déborde volontiers de la colonne quand celle-ci est étroite.
  const label = Object.assign(svgEl('text', {
    class: 'xc-sideview__airspace-label',
    x: String(block.x + block.width / 2), y: String(block.labelY), 'text-anchor': 'middle'
  }), { textContent: block.name })
  g.append(label)
  return g
}

/**
 * Repère d'altitude en haut à droite (« 500m ») et pictogramme en forme d'œil en bas à
 * droite. Tous deux relevés sur la capture, dans les deux états ; leur fonction n'est pas
 * établie et rien ici ne prétend le contraire.
 */
const ALTITUDE_MARK = '500m'

function buildMarks(): SVGGElement {
  const g = svgEl('g', { class: 'xc-sideview__marks' })
  g.append(Object.assign(svgEl('text', {
    class: 'xc-sideview__altitude-mark', x: String(VIEW_W - 4), y: '13', 'text-anchor': 'end'
  }), { textContent: ALTITUDE_MARK }))

  const eye = svgEl('g', { class: 'xc-sideview__eye', transform: `translate(${VIEW_W - 28} ${VIEW_H - 42})` })
  eye.append(svgEl('path', { d: 'M -13 0 Q 0 -9 13 0 Q 0 9 -13 0 Z', fill: 'none' }))
  eye.append(svgEl('circle', { cx: '0', cy: '0', r: '4.5', fill: 'none' }))
  eye.append(svgEl('circle', { class: 'xc-sideview__eye-pupil', cx: '-1.5', cy: '-1.5', r: '1.8' }))
  g.append(eye)
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
  svg.append(buildMarks())

  element.append(svg)
  return element
}
