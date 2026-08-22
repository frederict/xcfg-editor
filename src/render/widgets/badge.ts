/**
 * Les **pastilles XContest** que l'appareil pose à gauche de la valeur de `WOptiResult`
 * (« Distance volée ») et de `WOptiUnfinishedTriangle` (« Triangle NON TERMINÉ ») —
 * écart 2.9 de la revue des 75 visuels, où elles manquaient entièrement.
 *
 * ## Ce qui est mesuré
 *
 * Sur `captures-air3/2026-08-21_planche-sol-3-air-b-xcontest-navigation-a.png`, cellule
 * de 301 × 224 px :
 *
 * | | relevé |
 * |---|---|
 * | forme | carré aux coins arrondis, **41 × 42 px** — 0,185 fois la hauteur de la cellule |
 * | place | collée au bord gauche de la cellule, centrée sur la ligne de la valeur |
 * | glyphe | trait **blanc** avec des **points noirs** aux extrémités |
 * | `WOptiResult` | ligne brisée (une trace libre) |
 * | `WOptiUnfinishedTriangle` | triangle ouvert, plus une **croix rouge** |
 *
 * ## La couleur nomme la FORME optimisée — tranché le 2026-08-22
 *
 * Ce commentaire lisait les trois états capturés comme trois contextes (« orange au sol,
 * vert en vol, bleu en compétition ») et supposait un barème de distance. **Le rejeu de
 * `2026-07-09-XCT-FTE-01.igc` réfute cette lecture** par un contre-exemple direct : en
 * plein vol, après **106,5 km parcourus**, le badge de `WOptiResult` est **orange** —
 * exactement comme au sol à 64 m.
 *
 * Ce qui change avec la couleur, c'est le **glyphe**, et le glyphe nomme la forme que
 * l'optimiseur XContest retient à cet instant :
 *
 * | couleur | glyphe | forme |
 * |---|---|---|
 * | **orange** `#c45300` | zigzag à points | distance libre |
 * | **vert** | triangle **ouvert** | triangle plat |
 * | **bleu** | triangle **fermé** | triangle FAI |
 *
 * Couleur et glyphe vont donc ensemble, et c'est ainsi qu'ils sont écrits ci-dessous : un
 * `BadgeKind` est un couple, pas une teinte posée sur un dessin quelconque.
 *
 * **Ce que cela impose à un rendu statique.** Le badge n'est pas une constante par type de
 * gadget : la forme retenue change en vol, et le fichier de pages ne la porte pas. Il faut
 * donc **choisir une forme et l'assumer** — c'est `track`, la distance libre, le cas le
 * plus fréquent et celui de nos autres valeurs d'exemple (`SPECS`, numeric.ts).
 *
 * **`WOptiUnfinishedTriangle` garde son glyphe** (triangle barré d'une croix rouge) et
 * change lui aussi de couleur — vert au sol et en vol, bleu sur la planche « compétition ».
 * Sa couleur suit la **discipline XContest en cours de calcul**, et rien du fichier ne la
 * donne : le vert des deux tiers des observations est retenu, et c'est une réserve, pas
 * une règle.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

export type BadgeKind = 'track' | 'triangle'

/**
 * Couleurs relevées au pixel sur `planche-sol-3`. `track` est l'orange de la **distance
 * libre**, confirmé en vol le 2026-08-22 à 106,5 km parcourus — il ne dit pas « au sol »,
 * il dit quelle forme l'optimiseur retient. `triangle` est le vert de
 * `WOptiUnfinishedTriangle`, dont la couleur reste non expliquée (voir le commentaire de
 * tête).
 */
const BADGE_COLORS: Record<BadgeKind, string> = {
  track: '#c45300',
  triangle: '#009b21'
}

/**
 * Côté de la pastille, en fraction de la hauteur du widget : 41 px sur une cellule de
 * 224. Repris tel quel dans `.xc-num__badge` (style.css) — les deux doivent rester
 * d'accord, comme `UNIT_SIZE_RATIO` et `.xc-num__unit`.
 */
export const BADGE_SIZE_H = 0.185

/**
 * Écart entre la pastille et la valeur, en fraction de la hauteur du widget. Relevé sur
 * `planche-sol-3` : la pastille finit à 41 px du bord gauche, le premier chiffre commence
 * à 53 — soit 12 px sur 224.
 */
export const BADGE_GAP_H = 0.054

/** Largeur occupée par la pastille, écart compris, dans l'unité de `--xc-badge-h`. */
export function badgeWidthH(badge: BadgeKind | undefined): number {
  return badge === undefined ? 0 : BADGE_SIZE_H + BADGE_GAP_H
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  return node
}

/**
 * La pastille, en SVG carré de 24 unités de côté — le glyphe est une reproduction sobre
 * de ce que montre la capture, pas un décalque : à 41 px de côté sur l'appareil, le
 * dessin ne porte que trois traits et deux points.
 */
export function buildBadge(badge: BadgeKind): SVGSVGElement {
  const svg = el('svg', { class: 'xc-num__badge', viewBox: '0 0 24 24' })
  svg.append(el('rect', { class: 'xc-num__badge-bg', x: '0', y: '0', width: '24', height: '24', rx: '5', fill: BADGE_COLORS[badge] }))

  if (badge === 'track') {
    // Trace libre : une ligne brisée entre deux points de virage.
    svg.append(el('path', {
      class: 'xc-num__badge-line', d: 'M 6.5 9.5 L 10 17.5 L 13.5 7 L 17.5 13.5', fill: 'none'
    }))
    svg.append(el('circle', { class: 'xc-num__badge-dot', cx: '6.5', cy: '9.5', r: '2' }))
    svg.append(el('circle', { class: 'xc-num__badge-dot', cx: '17.5', cy: '13.5', r: '2' }))
  } else {
    // Triangle non terminé : trois sommets, dont un seul relié aux deux autres, et la
    // croix rouge qui dit que le circuit n'est pas bouclé.
    svg.append(el('path', {
      class: 'xc-num__badge-line', d: 'M 16 8.5 L 6 13 L 16.5 17.5', fill: 'none'
    }))
    svg.append(el('circle', { class: 'xc-num__badge-dot', cx: '16', cy: '8.5', r: '1.9' }))
    svg.append(el('circle', { class: 'xc-num__badge-dot', cx: '16.5', cy: '17.5', r: '1.9' }))
    svg.append(el('circle', { class: 'xc-num__badge-vertex', cx: '6', cy: '13', r: '1.9' }))
    svg.append(el('path', { class: 'xc-num__badge-cross', d: 'M 14 11 L 19 15.5 M 19 11 L 14 15.5', fill: 'none' }))
  }
  return svg
}
