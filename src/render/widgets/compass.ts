import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'
import { readRotation } from './rotation'

/**
 * `WCompass` — « Boussole et vent » (libellé officiel `fr`, `docs/reference/edition-
 * native.md`) : le libellé n'était pas une formule, c'est la description exacte du
 * widget (rendu-en-vol.md § 6bis). **Correction en vol** : le premier relevé, fait au
 * sol, ne montrait qu'une aiguille grise à facettes ; en vol, le widget a DEUX visages
 * indépendants, empilés :
 *
 * 1. Le cadran d'arrière-plan (couronne, graduations, N) — `showBackground`.
 * 2. Soit une aiguille de cap classique (`showHeading`) accompagnée, indépendamment,
 *    d'une aiguille de trajectoire/vent (`showBearing`, troisième zone NOIRE — voir
 *    plus bas) ; soit, si `windStyle` est renseigné et différent de `"NONE"`, une
 *    étoile de vent multicolore qui remplace ces deux aiguilles.
 *
 * Correspondance clé ↔ contrôle établie par `docs/reference/edition-native.md`
 * (« Gadget: Boussole et vent ») : `showHeading` = « Montrer la flèche de cap »,
 * `showBearing` = « Montrer la flèche de trajectoire », `showBackground` = « Afficher
 * le cadran d'arrière-plan », `windStyle` = « Style d'indicateur de vent » (valeurs
 * `NONE`/`ARROW`/`ARC`/`SOCK`, relevées dans le menu XCTrack).
 *
 * **Défauts** : les quatre clés sont TOUJOURS présentes, avec une valeur explicite,
 * sur les 15 occurrences du corpus (`Exemples/*.xcfg`, toutes variantes confondues) —
 * l'absence n'est donc jamais exercée par un fichier réel. `showHeading` y vaut
 * `false` sur les 15 occurrences, sans une seule exception : rien ne confirme à quoi
 * ressemble l'aiguille de cap dans le corpus disponible, seulement dans la capture en
 * vol ci-dessous. Par cohérence avec le reste du projet (une clé absente vaut `false`
 * — `_title`/`_unit`, numeric.ts ; `showGps` etc., statusLine.ts), les trois booléens
 * défaillent à `false` et `windStyle` absent équivaut à `"NONE"` quand la clé manque.
 * `showBackground` seul défaille à `true` : c'est la seule des trois valeurs à valoir
 * `true` sur la majorité du corpus (3 occurrences sur 4 profils distincts), et un
 * cadran vide sans aucune aiguille ni étoile (le cas `widget({})` des tests) resterait
 * un rendu absurde sans lui.
 *
 * **L'étoile de vent, confirmée par les coordonnées** — `widget-WCompass-en-vol.png`
 * ne suffisait qu'à mesurer l'aiguille grise à deux facettes (voir plus bas) ; c'est le
 * recoupement avec le corpus qui tranche l'étoile. Sur `2026-08-20_backup-00.xcfg`,
 * `layout/landscape[3]/widgets[13]` est un `WCompass` `X1:8542,Y1:2414,X2:10000,
 * Y2:5172`, `rotation:"HEADING"`, `windStyle:"ARROW"` — EXACTEMENT les bornes et la
 * rotation (N à droite du disque, pas en haut) de la boussole visible en haut à droite
 * de `vol-landscape3-en-vol.png`, qui y montre l'étoile multicolore. C'est cette
 * capture, comptée pixel par pixel (voir `buildWindStar`), qui fixe les couleurs.
 *
 * **`windStyle` a trois valeurs non-`NONE`** (`ARROW`/`ARC`/`SOCK`), une seule est
 * confirmée visuellement (`ARROW` → étoile, ci-dessus). Aucune capture ne montre `ARC`
 * ou `SOCK` isolément — le corpus les porte (`landscape[0]` de plusieurs fichiers :
 * `windStyle:"ARC"`) mais sans capture correspondante. Les trois valeurs sont donc
 * rendues IDENTIQUEMENT ici (l'étoile), par défaut de mieux : **NON TRANCHÉ** pour la
 * distinction ARC/SOCK — voir le rapport de tâche.
 *
 * **La troisième zone, noire** — rendu-en-vol.md § 6 : l'aiguille de cap grise (deux
 * facettes, comme avant) est accompagnée, quand `showBearing` vaut `true`, d'une
 * aiguille NOIRE distincte, plus large, tournant indépendamment (angle illustratif
 * différent — aucune donnée de cap/vent réelle n'est modélisée, comme le reste de ce
 * fichier). Vue sur `vol-numeriques-boussole-variocolumn.png` : un large triangle noir
 * partage le disque avec l'aiguille grise, sans lui être lié.
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
 * Aiguille de cap, à deux facettes (mesure pixel par pixel, voir le commentaire de
 * tête) : une pointe et une queue partagent l'axe vertical local, séparées en deux
 * triangles par les points est/ouest du pivot — le triangle contenant la pointe reçoit
 * la facette claire, l'autre la facette sombre. Le groupe entier tourne ensuite selon
 * `angle`, en degrés, autour du pivot.
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
 * Aiguille de trajectoire/vent (`showBearing`) : une troisième zone, noire, plus large
 * que l'aiguille de cap — un triangle simple, une seule teinte, pas de facettes. Tourne
 * indépendamment de `buildNeedle` (rendu-en-vol.md § 6 : « elles ne bougent pas
 * ensemble »), à un angle illustratif distinct.
 */
function buildBearingNeedle(angle: number): SVGGElement {
  const bearing = svgEl('g', {
    class: 'xc-compass__bearing',
    transform: `rotate(${angle} ${CENTER} ${CENTER})`
  })

  const tip = `${CENTER},${CENTER - 14}`
  const baseLeft = `${CENTER - 46},${CENTER + 74}`
  const baseRight = `${CENTER + 46},${CENTER + 74}`

  bearing.append(svgEl('polygon', {
    class: 'xc-compass__bearing-shape',
    points: `${tip} ${baseRight} ${baseLeft}`
  }))

  return bearing
}

/**
 * Étoile de vent multicolore (`windStyle` différent de `"NONE"`) — voir le commentaire
 * de tête pour la confirmation par coordonnées. Comptage des pixels de
 * `vol-landscape3-en-vol.png` sur la zone de la boussole (`X1:8542,Y1:2414,X2:10000,
 * Y2:5172` de `landscape[3]`, `2026-08-20_backup-00.xcfg`) : deux couples de teintes
 * dominent, en dehors du gris de la couronne (#404040) et du blanc de fond —
 * `#e04040`/`#c02020` (rouge, 690/562 px) et `#c0c040`/`#a0a020` (jaune-olive, 559/689
 * px), plus deux teintes de blend (`#b15920`, `#d17940`, ~700 px chacune) qui
 * n'apparaissent qu'aux zones de recouvrement. Cela ne fait QUE deux branches, pas
 * trois malgré les trois noms de couleur du relevé de tâche (« rouge, jaune, olive ») —
 * chaque branche est elle-même bicolore (comme `buildNeedle`, dont elle réutilise la
 * géométrie), et « jaune »/« olive » décrivent les deux facettes d'une même branche,
 * pas deux branches distinctes. Le rouge réutilise exactement les teintes déjà
 * mesurées pour l'aiguille rouge du petit format (`--xc-compass-needle-small-a/b`) —
 * une coïncidence de mesure, pas une hypothèse.
 *
 * Aucune donnée de vent par tranche d'altitude n'existe dans le fichier : les deux
 * angles sont illustratifs (ils démontrent la superposition, pas une direction réelle),
 * comme le reste des angles de ce module. Le flou/dégradé qu'on pourrait percevoir sur
 * la capture aux zones de recouvrement est un mélange alpha de deux aplats, pas un
 * gradient — reproduit ici avec `fill-opacity`, pas `<linearGradient>`.
 */
const WIND_STAR_ANGLE_A = -20
const WIND_STAR_ANGLE_B = 145

function buildWindBranch(angle: number): SVGGElement {
  const branch = svgEl('g', { class: 'xc-compass__wind-branch', transform: `rotate(${angle} ${CENTER} ${CENTER})` })

  const tip = `${CENTER},${CENTER - 80}`
  const east = `${CENTER + 24},${CENTER}`
  const west = `${CENTER - 24},${CENTER}`
  const tail = `${CENTER},${CENTER + 80}`

  branch.append(svgEl('polygon', { class: 'xc-compass__wind-facet xc-compass__wind-facet--a', points: `${tip} ${east} ${tail}` }))
  branch.append(svgEl('polygon', { class: 'xc-compass__wind-facet xc-compass__wind-facet--b', points: `${tip} ${west} ${tail}` }))

  return branch
}

/** Pas de variante « petit format » : aucune capture ne montre l'étoile de vent à
 * petite taille — contrairement à l'aiguille de cap (mesurée aux deux tailles), elle
 * garde donc ses teintes rouge/jaune-olive quelle que soit la taille du widget. */
function buildWindStar(): SVGGElement {
  const star = svgEl('g', { class: 'xc-compass__wind-star' })
  star.append(buildWindBranch(WIND_STAR_ANGLE_A))
  star.append(buildWindBranch(WIND_STAR_ANGLE_B))
  return star
}

/**
 * Illustratives : aucune donnée de cap, de trajectoire ou de vent réelle n'est
 * modélisée ici (comme la trace fixe de map.ts). Les angles servent seulement à
 * démontrer que les éléments tournent, et tournent indépendamment les uns des autres.
 */
const ILLUSTRATIVE_HEADING = -35
const ILLUSTRATIVE_BEARING = 150

/**
 * En-deçà de ce seuil (sur la plus petite des deux dimensions normalisées, 0 à 1), la
 * boussole est en « petit format » et l'aiguille de cap passe au rouge à deux tons —
 * mesuré indépendamment sur l'aiguille grise plein écran et sur le coin de
 * `ecran-landscape3-17widgets.png` (voir l'historique de ce fichier).
 */
const SMALL_THRESHOLD = 0.35

function shown(widget: Widget, key: string, fallback: boolean): boolean {
  return readBoolean(widget.node, key) ?? fallback
}

/**
 * `rotation` (chaîne nue ici, voir rotation.ts) : `'HEADING'` fait tourner le cadran
 * (graduations + N) pour aligner le cap en haut, l'aiguille de cap restant fixe,
 * pointe en haut ; toute autre valeur (dont `'NORTH'`, la valeur par défaut de
 * `readRotation`) garde le nord en haut et fait tourner l'aiguille. L'étoile de vent et
 * l'aiguille de trajectoire suivent leurs propres angles illustratifs, indépendants de
 * `rotation` — aucune capture ne montre leur comportement sous rotation.
 */
export function drawCompass(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-compass'

  const svg = svgEl('svg', { class: 'xc-compass__scene', viewBox: `0 0 ${VIEW} ${VIEW}` })

  const showBackground = shown(widget, 'showBackground', true)
  if (showBackground) {
    const dial = buildDial()
    const rotation = readRotation(widget.node)
    const headingUp = rotation.value === 'HEADING'
    if (headingUp) dial.setAttribute('transform', `rotate(${ILLUSTRATIVE_HEADING} ${CENTER} ${CENTER})`)
    svg.append(dial)
  }

  const width = widget.x2 - widget.x1
  const height = widget.y2 - widget.y1
  const small = Math.min(width, height) / 10000 < SMALL_THRESHOLD

  const windStyle = readString(widget.node, 'windStyle')
  const showWindStar = windStyle !== undefined && windStyle !== 'NONE'

  if (showWindStar) {
    svg.append(buildWindStar())
  } else {
    const rotation = readRotation(widget.node)
    const headingUp = rotation.value === 'HEADING'

    if (shown(widget, 'showHeading', false)) {
      const needleAngle = headingUp ? 0 : ILLUSTRATIVE_HEADING
      svg.append(buildNeedle(small, needleAngle))
    }

    if (shown(widget, 'showBearing', false)) {
      svg.append(buildBearingNeedle(ILLUSTRATIVE_BEARING))
    }
  }

  element.append(svg)
  return element
}
