import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { androidColorToHex } from '../../model/preferences'
import { widgetNumber } from '../defaults'

/**
 * `WVerticalGraph` — une flèche d'échelle verticale sur le bord gauche avec sa valeur, et
 * la trace d'altitude en chapelet de points traversant la largeur.
 *
 * ## Écart 2.3 de la revue des 75 visuels, et ce qu'il a coûté
 *
 * Mesuré sur `captures-air3/2026-08-21_planche-sol-8-boussole-barres-graphiques-espace-aerien.png`,
 * cellule de **427 × 323 px** :
 *
 * | | appareil | ce que nous dessinions |
 * |---|---|---|
 * | tracé | `#8080ff`, 4 605 px d'encre | `#ff9800`, 1 855 px |
 * | épaisseur du tracé | **17 px** (y 152 à 168) | ≈ 5 px |
 * | hampe de la flèche | **2 px** (x 14–15) | ≈ 4,3 px |
 * | flèche, place | x 9 à 20, y 6 à 316 | x ≈ 43, hauteur réduite |
 * | libellé | `#9e9e9e`, x 30 à 77, casse de 40 px | `#606060`, plus petit |
 *
 * **L'orange était la valeur du fichier du PROPRIÉTAIRE, prise pour un défaut.** Le vrai
 * défaut de `dot_color` est `-8355585`, soit `#8080ff` — c'est ce que dit le relevé des
 * 75 gadgets (`widgetDefaults.json`), et c'est ce que la capture montre. Ce module lisait
 * `readNumber(widget.node, 'dot_color')` avec un repli en dur, sans passer par
 * `widgetNumber` : **la septième occurrence** du défaut « une clé absente vaut son défaut,
 * pas ma constante » — les six premières étaient des `readBoolean(...) === true`,
 * celle-ci un `readNumber(...) ?? CONSTANTE`, mais c'est le même oubli et il produit le
 * même genre d'erreur.
 *
 * ## Ce qui n'est PAS reproduit, et pourquoi
 *
 * **La valeur du libellé est recalculée par l'appareil** : 50 au sol, **100** en vol
 * (`planche-vol-8`), sur un gadget dont `vertical_step` vaut 50 dans les deux cas.
 * XCTrack choisit donc un pas d'échelle selon l'amplitude réellement enregistrée. Rien
 * dans le fichier ne permet de le deviner, et ce moteur ne simule aucun vol : on écrit
 * `vertical_step` tel quel, ce qui coïncide avec l'état au sol.
 *
 * **Le nombre de points** de la trace reste illustratif : `interval` est une fenêtre
 * temporelle en millisecondes, et aucune formule de conversion en nombre de points n'est
 * sourcée — même réserve que `mapWidget_scale` dans map.ts.
 *
 * ## Pourquoi des traits « non mis à l'échelle »
 *
 * La scène est étirée (`preserveAspectRatio="none"`) pour couvrir un gadget de rapport
 * quelconque. Une épaisseur exprimée en unités du `viewBox` s'étire donc avec elle, et
 * c'est ce qui rendait la hampe de la flèche trois fois trop lourde. `non-scaling-stroke`
 * exprime l'épaisseur dans le repère de rendu de la page — le même que celui où les 2 px
 * et les 17 px ont été mesurés (`REFERENCE_WIDTH`, canvas.ts) — et la rend donc juste
 * quelle que soit la taille du gadget.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW_W = 300
const VIEW_H = 200

/** Abscisse de la flèche : 14,5 px sur 427, soit 3,4 % de la largeur. */
const ARROW_X = VIEW_W * 0.034

/**
 * Défaut du relevé des 75 gadgets, en dernier recours si `widgetDefaults.json` venait à
 * ne plus porter le type. `-8355585` en entier ARGB signé, `#8080ff` en clair.
 */
const DEFAULT_DOT_COLOR = '#8080ff'
const DEFAULT_VERTICAL_STEP = 50
const DEFAULT_DOT_SIZE = 15

/**
 * Épaisseur du tracé, en pixels du repère de rendu, rapportée à `dot_size` : 17 px
 * mesurés pour `dot_size: 15`, soit 1,13 px par unité. Le rapport est une règle de
 * trois sur un seul point de mesure — aucun fichier connu ne porte une autre valeur.
 */
const TRACE_PX_PER_DOT_SIZE = 17 / 15

/** Épaisseur de la hampe et des filets de la flèche, en pixels du repère de rendu. */
const ARROW_STROKE_PX = 2

/** Nombre de points de la trace — illustratif, voir le commentaire de tête. */
const DOT_COUNT = 46

/**
 * Trace légèrement ondulée, déterministe (une formule fixe, jamais `Math.random`) — comme
 * la trace d'exemple de map.ts : elle juge la mise en page, ne simule aucun vol.
 *
 * Un `path` en pointillés à bout rond plutôt que des `<circle>` : dans une scène étirée,
 * un cercle devient une ellipse, et c'est ce qui aplatissait la trace. Les points, eux,
 * sont ronds sur l'appareil.
 */
function buildDotTrace(color: string, dotSize: number): SVGPathElement {
  const baseY = VIEW_H * 0.5
  const startX = 1
  const spacing = (VIEW_W - startX - 2) / (DOT_COUNT - 1)
  const points: string[] = []
  for (let i = 0; i < DOT_COUNT; i++) {
    const x = startX + i * spacing
    const y = baseY + 4 * Math.sin(i * 0.35)
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  const path = svgEl('path', { class: 'xc-vscale__trace', d: points.join(' '), fill: 'none', stroke: color })
  path.style.strokeWidth = `${(dotSize * TRACE_PX_PER_DOT_SIZE).toFixed(2)}px`
  // Un tiret de longueur nulle à bout rond EST un point : la trace reste un chapelet, et
  // l'espacement suit la scène — seule l'épaisseur doit être fidèle au pixel.
  path.style.strokeDasharray = `0.01 ${(spacing * 0.62).toFixed(2)}`
  return path
}

export function drawVerticalGraph(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-vscale xc-vscale--graph'

  const step = widgetNumber(widget, 'vertical_step') ?? DEFAULT_VERTICAL_STEP
  const dotSize = widgetNumber(widget, 'dot_size') ?? DEFAULT_DOT_SIZE
  const rawColor = widgetNumber(widget, 'dot_color')
  const color = rawColor !== undefined ? androidColorToHex(rawColor) : DEFAULT_DOT_COLOR

  const svg = svgEl('svg', { class: 'xc-vscale__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'none' })
  svg.append(buildDotTrace(color, dotSize))

  // La flèche court d'un bord à l'autre : y 6 à 316 sur 323, soit 2 % de marge.
  const arrow = svgEl('g', { class: 'xc-vscale__arrow' })
  const shaft = svgEl('line', {
    x1: ARROW_X.toFixed(1), y1: String(VIEW_H * 0.02), x2: ARROW_X.toFixed(1), y2: String(VIEW_H * 0.98)
  })
  shaft.style.strokeWidth = `${ARROW_STROKE_PX}px`
  arrow.append(shaft)
  // Pointes : 12 px de large sur 427, soit 2,8 % de la largeur, et deux fois plus hautes.
  const half = VIEW_W * 0.014
  const height = VIEW_H * 0.055
  arrow.append(svgEl('polygon', {
    class: 'xc-vscale__arrowhead',
    points: `${ARROW_X - half},${VIEW_H * 0.02 + height} ${ARROW_X + half},${VIEW_H * 0.02 + height} ${ARROW_X},${VIEW_H * 0.02}`
  }))
  arrow.append(svgEl('polygon', {
    class: 'xc-vscale__arrowhead',
    points: `${ARROW_X - half},${VIEW_H * 0.98 - height} ${ARROW_X + half},${VIEW_H * 0.98 - height} ${ARROW_X},${VIEW_H * 0.98}`
  }))
  svg.append(arrow)

  // Le libellé est posé juste AU-DESSUS de la trace et à droite de la flèche : x 30 à 77
  // sur 427, base à 161 sur 323 — c'est-à-dire la mi-hauteur.
  svg.append(Object.assign(svgEl('text', {
    class: 'xc-vscale__label', x: String(VIEW_W * 0.07), y: String(VIEW_H * 0.5), 'text-anchor': 'start'
  }), { textContent: String(step) }))

  element.append(svg)
  return element
}
