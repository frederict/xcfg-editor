import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WVarioColumn` — une JAUGE partant du milieu, pas une échelle décorative (écart 1.7 de
 * `docs/reference/planche-widgets-air3.md` § 5).
 *
 * Le rendu précédent remplissait toute la colonne d'une pile fixe de vingt barres roses,
 * quelle que soit la situation. L'appareil dessine une pile de barres qui **part de la
 * mi-hauteur exacte**, dont la longueur suit la valeur, et **ne dessine rien du tout
 * quand le vario est nul** — au sol, la colonne est entièrement blanche (vérifié :
 * `2026-08-21_planche-sol-8-*` ne contient, dans la boîte du widget, que les deux pixels
 * de son cadre).
 *
 * ## L'échelle, mesurée
 *
 * Deux captures où la valeur du vario est lisible sur le MÊME écran que la colonne :
 *
 * | capture | « Vitesse verticale / 2s » | barres | sens |
 * |---|---|---|---|
 * | `vol-numeriques-boussole-variocolumn.png` | **+3,5 m/s** | 17 | vers le HAUT |
 * | `vol-page3.png` | **−1,0 m/s** | 5 | vers le BAS |
 *
 * 3,5 / 17 et 1,0 / 5 donnent la même graduation : **une barre vaut 0,2 m/s**. Le pas
 * mesuré vaut 18 px sur une colonne de 720 px et 16 px sur une colonne de 646 px, soit
 * 2,5 % de la hauteur dans les deux cas — **20 barres par demi-colonne, donc une échelle
 * de ±4 m/s**. Une barre sur cinq est plus saturée : une graduation majeure tous les
 * 1,0 m/s (barres 5, 10, 15 sur la capture à +3,5 ; barre 5 sur celle à −1,0).
 *
 * ## La convention de signe : **haut = montée**, tranchée
 *
 * Le relevé de la planche donnait 3 mesures sur 4 en ce sens et laissait la question
 * ouverte. Quatre observations la ferment, sans contre-exemple :
 *
 * 1. `vol-numeriques-boussole-variocolumn.png` : **+3,5 m/s** affiché et 17 barres
 *    au-dessus du milieu, sur la même image, au même instant. 17 × 0,2 = 3,4.
 * 2. `vol-page3.png` : **−1,0 m/s** affiché et 5 barres au-dessous. 5 × 0,2 = 1,0.
 * 3. `2026-08-21_planche-vol-8-*`, horodatée 13:52:48. Le réglage de rejeu de XCTrack
 *    affiche « Position dans le tracé (UTC) » avec deux heures de moins que l'écran :
 *    l'instant est donc 11:52:48 UTC dans la trace rejouée (`.igc` non versionné, voir
 *    `docs/reference/planche-widgets-air3.md`), où le vario sur 2 s vaut **−1,0 m/s**.
 *    La colonne y montre 5 barres au-dessous. (Le point d'ancrage a été vérifié : la
 *    position lue dans la cellule `WLocation` de `planche-vol-etat-montee-vario-positif`
 *    correspond à la seconde 11:51:39 de la trace, où le vario calculé vaut +1,0 —
 *    exactement la valeur affichée.)
 * 4. Rejeu de la même trace sur l'appareil, 40 captures de la page 8 : la corrélation
 *    entre le nombre de barres SIGNÉ (compté au pixel, 0,2 m/s la barre) et le vario
 *    calculé depuis l'IGC vaut **r = +0,44**, maximale à Δt = 4,1 s — l'écart de timing
 *    entre deux captures. Toutes les vues « vers le bas » tombent sur un vario négatif.
 *    Une convention inverse donnerait −0,44.
 *
 * ## Les couleurs, mesurées
 *
 * Quatre familles d'aplats, jamais autre chose. Descente : une seule famille, bleue.
 * Montée : trois, du plus faible au plus fort.
 *
 * | famille | remplissage | accent (1 barre / 5) | filet |
 * |---|---|---|---|
 * | descente | `#dfefff` | `#a0b0ff` | `#001060` |
 * | montée faible | `#dfffdf` | `#a0ffa0` | `#005f00` |
 * | montée moyenne | `#ffffdf` | `#ffd0a0` | `#5f3000` |
 * | montée forte | `#ffdfdf` | `#ffa0a0` | `#5f0000` |
 *
 * Le document de la planche annonçait « vert, bleu et orange » et donnait `#ffe26a` /
 * `#ffc46c` pour la famille orange. Ces deux teintes-là n'appartiennent PAS à ce widget :
 * on ne les trouve, dans tout le dossier de captures, que sur `vol-page3.png`,
 * `widget-WVerticalGraph.png` et `widget-non-identifie-planche.png`, où elles sont le
 * tracé de `WVerticalGraph` et les marqueurs de thermique de la carte. Le document est
 * corrigé.
 *
 * **Le seuil de bascule n'est PAS déterminé, et ce module n'en porte plus.** Il a codé
 * deux seuils (2,0 et 3,0 m/s) présentés comme les milieux de recouvrements observés. Le
 * rejeu du 2026-08-22 les réfute : deux captures de la même séance montrent **exactement
 * la même hauteur de barre — 181 px, soit 15 bandes — avec deux familles différentes**,
 * verte sur l'une, jaune sur l'autre. Aucune fonction de la valeur instantanée ne produit
 * ça. Deviner un seuil affirmerait une règle que la mesure contredit.
 *
 * ## Ce que l'éditeur affiche : une paire mesurée, et rien d'autre
 *
 * Deux captures seulement montrent la valeur du vario et la famille de teinte **dans la
 * même image** :
 *
 * | capture | vario affiché | colonne |
 * |---|---|---|
 * | `vol-numeriques-boussole-variocolumn.png` | **+3,5 m/s** | 17 barres, famille **rose** (`#ffdfdf`, accent `#ffa0a0`, filets `#5f0000`, relevés au pixel) |
 * | `vol-page3.png` | **−1,0 m/s** | 5 barres, famille **bleue** |
 *
 * `EXAMPLE_CLIMB` et `EXAMPLE_TONE` sont la première de ces deux lignes, prises ensemble :
 * la teinte n'est pas déduite de la valeur, elle est **lue à côté d'elle**. La valeur
 * d'exemple de `WVerticalSpeed` (`numeric.ts`) vient de la même image, au même instant,
 * pour qu'une page portant les deux gadgets se lise sans contradiction.
 *
 * Les familles verte et jaune existent — elles sont mesurées §  « Les couleurs » — mais
 * **aucune capture ne les montre à côté d'une valeur** : l'éditeur ne peut donc pas les
 * afficher sans affirmer un seuil. Ce qu'il faudrait : une série de captures avec le vario
 * numérique lisible dans la même image que la colonne, sur une montée continue.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

const VIEW_W = 100
const VIEW_H = 400
const MIDDLE = VIEW_H / 2

/** Une barre vaut 0,2 m/s — voir le tableau des deux mesures appariées. */
export const STEP_MS = 0.2

/** Vingt barres par demi-colonne : le pas mesuré vaut 2,5 % de la hauteur du widget sur
 * les deux captures, à des tailles différentes. L'échelle couvre donc ±4 m/s. */
export const BARS_PER_HALF = 20

/** Une barre sur cinq est accentuée : une graduation majeure tous les 1,0 m/s. */
const ACCENT_PERIOD = 5

/**
 * Les quatre familles de teinte, telles que style.css les nomme. Aucune fonction ne les
 * choisit : rien de mesuré ne relie une valeur de vario à une famille, sauf pour les deux
 * couples du commentaire de tête, qui sont des LECTURES et non une règle.
 */
export type VarioTone = 'sink' | 'climb-weak' | 'climb-medium' | 'climb-strong'

/**
 * L'état d'exemple, lu d'un bloc sur `vol-numeriques-boussole-variocolumn.png` : la
 * valeur et la famille viennent de la même image, au même instant. Les changer séparément
 * ferait de la teinte une déduction, ce qu'elle n'est pas.
 *
 * **3,4 et non 3,5** : l'appareil affiche « +3,5 m/s » et dessine **17** barres ; avec
 * l'arrondi de `barCount`, 3,5 en donnerait 18 et 3,4 en donne 17. La colonne dessinée est
 * donc celle de la capture, à la barre près. Ce que l'appareil fait exactement de la
 * dernière fraction de barre — troncature ou arrondi — n'est **pas tranché** : son
 * affichage est lui-même arrondi au dixième, et 3,45 comme 3,5 donneraient ce qu'on voit.
 */
const EXAMPLE_CLIMB = 3.4
const EXAMPLE_TONE: VarioTone = 'climb-strong'

/** Nombre de barres pour une valeur de vario, borné par l'échelle de ±4 m/s. */
export function barCount(value: number): number {
  return Math.min(BARS_PER_HALF, Math.round(Math.abs(value) / STEP_MS))
}

export function drawVarioColumn(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-variocol'

  const svg = svgEl('svg', {
    class: 'xc-variocol__scene', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'none'
  })

  const value = EXAMPLE_CLIMB
  const bars = barCount(value)

  // Vario nul : la colonne reste entièrement blanche, comme au sol sur l'appareil. On ne
  // dessine même pas le filet de mi-hauteur — la capture n'en montre aucun.
  if (bars > 0) {
    const tone = EXAMPLE_TONE
    const climbing = value > 0
    const barHeight = MIDDLE / BARS_PER_HALF
    const group = svgEl('g', { class: `xc-variocol__gauge xc-variocol__gauge--${tone}` })

    for (let i = 0; i < bars; i++) {
      // La pile part de la mi-hauteur EXACTE et s'en éloigne barre après barre, vers le
      // haut en montée, vers le bas en descente.
      const y = climbing ? MIDDLE - (i + 1) * barHeight : MIDDLE + i * barHeight
      const accent = (i + 1) % ACCENT_PERIOD === 0
      group.append(svgEl('rect', {
        class: accent ? 'xc-variocol__bar xc-variocol__bar--accent' : 'xc-variocol__bar',
        x: '0', y: y.toFixed(2), width: String(VIEW_W), height: barHeight.toFixed(2)
      }))
    }

    svg.append(group)
  }

  element.append(svg)
  return element
}
