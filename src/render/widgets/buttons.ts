import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import type { Translator } from '../../i18n/translate'
import { readString } from '../../core/access'
import { widgetBoolean } from '../defaults'

/**
 * Les neuf widgets « bouton » de XCTrack — écart 1.6 de
 * `docs/reference/planche-widgets-air3.md` § 5.
 *
 * ## Ce que l'appareil dessine, mesuré
 *
 * `2026-08-21_planche-sol-5-boutons-autres-test.png` montre les neuf types posés côte à
 * côte avec leurs seules clés universelles, sur fond blanc. Chacun porte un **grand
 * pictogramme noir** qui remplit sa case ; l'éditeur les rendait tous en « titre + `--` »,
 * comme des numériques vides, et `WButtonBrightness` en case entièrement blanche.
 *
 * | type | pictogramme | bbox noire mesurée (cellule 312 × 141/166) |
 * |---|---|---|
 * | `WButtonNavig` | drapeau au trait + `Ø` | 0,53 W × 0,54 H |
 * | `WButtonPhone` | combiné téléphone plein | 0,41 W × 0,77 H |
 * | `WButtonCamera` | appareil photo plein | 0,37 W × 0,57 H |
 * | `WButtonZoom` | `+` très gras | 0,21 W × 0,39 H |
 * | `WButtonVario` | titre « Vario » rouge, puis barres de vario + haut-parleur | 0,59 W × 0,57 H |
 * | `WButtonBrightness` | soleil portant un `+` | 0,27 W × 0,60 H |
 * | `WButtonVolume` | haut-parleur + `+` | 0,54 W × 0,62 H |
 * | `WButtonVolumeReminder` | petit haut-parleur au-dessus de « Monter le son » | 0,83 W × 0,54 H |
 * | `WButtonIntentLauncher` | la clé `title` (🚀) au-dessus de la clé `name` (« test ») | 0,55 W × 0,38 H |
 *
 * Le pictogramme est **centré** (centre mesuré entre 0,44 et 0,53 de la hauteur pour
 * ceux qui n'ont ni titre ni libellé) et haut d'environ **0,6 fois la cellule** : c'est
 * la proportion retenue ici, `--xc-button-glyph`.
 *
 * `WButtonVario` est le seul à porter un titre, et c'est sa clé `showTitle` (par défaut
 * `true`, § 3 de la planche) qui le commande — pas `_title`, que ce type n'a pas.
 *
 * ## Pourquoi `WButtonBrightness` paraissait ne rien dessiner — la règle, mesurée
 *
 * `rendu-observe.md` affirmait que `WButtonBrightness` et `WButtonNavig` « ne dessinent
 * rien sur l'appareil » et qu'il fallait les traiter en zones transparentes. C'était
 * lu sur `landscape[3]` de `2026-08-20_backup-00.xcfg`, où deux `WButtonBrightness`
 * couvrent `X 2292..8542, Y 1034..7586` et n'apparaissent pas sur
 * `ecran-landscape3-17widgets.png`.
 *
 * La cause n'est ni le type ni `_bg` : c'est **l'ordre de dessin**. Dans ce fichier, le
 * widget suivant est un `WThermalAssistant` de bornes `X 2292..8542, Y 1034..7586` —
 * exactement l'union des deux zones — et il est dessiné APRÈS. Les boutons sont bien
 * peints, puis recouverts par la carte. Le pilote a posé ses zones tactiles SOUS la
 * carte, pour régler la luminosité en touchant la carte.
 *
 * Cette lecture se vérifie sur une seconde observation, elle aussi mal interprétée :
 * `_bg` n'est pas une opacité mais une **transparence** — le libellé du réglage XCTrack
 * est « Transparence d'arrière-plan : 100 % » (`edition-native.md`). Sur
 * `vol-thermalassistant-boutonsnavig.png` (`landscape[4]`), les widgets à `_bg: 100`
 * posés sur la carte (`WAirTime` « 0:00 », `WCompSpeedToStart`, `WLiveMessage`) laissent
 * voir la carte au travers, ceux à `_bg: 40` la laissent transparaître à peine, et les
 * deux `WButtonNavig` à `_bg: 0` sont des cases blanches OPAQUES. Le `WLiveMessage` qui
 * recouvre ces boutons dans le fichier ne les masque donc pas parce qu'il est
 * transparent (`_bg: 100`), pas parce qu'il « ne peint rien ».
 *
 * **Conséquence, traitée depuis** : `canvas.ts` calculait `background / 100` comme une
 * opacité, c'est-à-dire l'inverse ; il calcule désormais `1 - background / 100`
 * (`backgroundOpacity`), et `src/ui/warnings.ts` lit « opaque » comme `_bg: 0` et non
 * plus `_bg >= 100`. `WButtonBrightness` reçoit donc le fond et le cadre de son fichier
 * comme tout widget dessiné, et son recouvrement par la carte se reproduit tout seul,
 * `canvas.ts` empilant déjà les widgets dans l'ordre du fichier.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * ## Le cadrage des pictogrammes — ce que l'appareil fait des DEUX dimensions
 *
 * `.xc-button__glyph` (style.css) cale le pictogramme sur la **seule hauteur** du widget.
 * Les trois types qui posent deux pictogrammes côte à côte occupent donc une rangée de
 * largeur fixe en fraction de la hauteur, quelle que soit la largeur de la case, et
 * `overflow: hidden` tranche ce qui dépasse. Mesuré à géométrie identique, cases
 * 123 × 146 px du fichier du propriétaire (`captures-air3/vol-thermalassistant-boutonsnavig.png`) :
 *
 * | | encre du drapeau + Ø | rapport à la case | marges G / D |
 * |---|---|---|---|
 * | appareil | 82 × 45 px | 0,667 L × 0,308 H | 31 / 11 — entièrement dedans |
 * | avant | 119 × 68 (borné par la case) | 0,967 L × 0,466 H | 2 / 2 — **coupé** |
 *
 * Sans la coupe, la rangée mesurait 178 px dans une case de 123 : **45 % de débordement**.
 *
 * **La règle de l'appareil se déduit de deux mesures du même dessin** : en case large
 * (320 × 174) l'encre fait 166 × 91, en case étroite (123 × 146) elle fait 82 × 45 — même
 * rapport (1,82), et dans les deux cas elle s'inscrit dans une boîte de
 * **0,667 L × 0,52 H**. C'est un ajustement aux deux dimensions, pas à la seule hauteur.
 *
 * `MAX_GLYPH_WIDTH` est ce 0,667. Il n'a été mesuré **que sur `WButtonNavig`**, seul type
 * dont on ait une capture en case étroite ; il est appliqué aux neuf, parce qu'aucun
 * mécanisme ne rendrait ce plafond propre à un type. Les six pictogrammes simples ne
 * l'atteignent d'ailleurs jamais aux géométries observées — vérifié par balayage.
 */
const MAX_GLYPH_WIDTH = 0.667

/**
 * Rapport largeur/hauteur d'une page paysage, pour convertir la « forme » d'un widget
 * (ses coordonnées normalisées) en rapport de pixels réels. Même approximation, et même
 * réserve, que `numeric.ts` : le dessin ne reçoit pas l'`aspectRatio` de la page, et le
 * lui faire traverser toute la chaîne pour ce seul besoin serait disproportionné. À
 * revoir le jour où un bouton devra se cadrer sur une page portrait ; aucune capture ne
 * couvre ce cas.
 */
const LANDSCAPE_ASPECT = 16 / 9

/**
 * Largeur de l'encre de la rangée de pictogrammes, en fractions de la hauteur du widget,
 * **avant** cadrage — mesurée sur notre propre rendu de la page 5 de la planche
 * (1280 × 720), colonne par colonne, pictogrammes seuls : les libellés (« Monter le son »,
 * « test », nom de contact) sont exclus, ils sont déjà bornés par `max-width` et ne
 * doivent pas commander la réduction du dessin.
 *
 * `navig` porte la valeur du dessin REFAIT ci-dessous (0,350 + 0,218 d'écart + 0,378),
 * pas celle de l'ancien (1,092).
 */
const GLYPH_ROW_WIDTH: Record<string, number> = {
  navig: 0.946,
  phone: 0.672,
  camera: 0.678,
  zoom: 0.391,
  vario: 1.289,
  brightness: 0.564,
  volume: 1.315,
  volumereminder: 0.201,
  intent: 0.224
}

/**
 * Plancher du cadrage — une soupape, comme celle de `numeric.ts` : une case extrêmement
 * plate ne doit pas réduire le pictogramme jusqu'à l'invisible. À 0,3, la rangée du
 * drapeau reste haute de 0,16 fois la case, encore lisible ; en deçà, mieux vaut un
 * dessin trop grand qu'un dessin qu'on ne reconnaît plus.
 */
const MIN_GLYPH_FIT = 0.3

/** Encre du drapeau : 62 × 91 px sur l'appareil, soit 0,523 fois la hauteur du widget. */
const FLAG_HEIGHT = 0.523
const FLAG_WIDTH = 0.356

/** Encre du `Ø` : 66 × 65 px, soit 0,379 × 0,374 — la boîte déborde de 1,7 % de l'encre. */
const SLASH_WIDTH = 0.385
const SLASH_HEIGHT = 0.385

/**
 * Écart entre les deux encres, relevé à 0,218 fois la hauteur du widget. La rangée
 * (`.xc-button__row`) n'en pose que 0,06 : le complément est écrit en ligne, et tient
 * compte du peu de blanc que les deux boîtes laissent autour de leur encre.
 */
const NAVIG_ROW_GAP = 0.209

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/**
 * Un pictogramme : un `<svg>` carré de 24 unités, dimensionné par le CSS
 * (`.xc-button__glyph`, en fraction de la hauteur du widget). `outline` distingue les
 * dessins au trait (drapeau, soleil, haut-parleur, barres) des silhouettes pleines
 * (téléphone, appareil photo) — les deux familles sont visibles sur la capture.
 */
function glyph(name: string, build: (svg: SVGSVGElement) => void, outline: boolean): SVGSVGElement {
  const svg = svgEl('svg', {
    class: `xc-button__glyph xc-button__glyph--${name}`,
    viewBox: '0 0 24 24',
    fill: outline ? 'none' : 'currentColor',
    stroke: outline ? 'currentColor' : 'none',
    'stroke-width': outline ? '1.8' : '0',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round'
  })
  build(svg)
  return svg
}

/**
 * Un pictogramme dont la BOÎTE épouse l'encre, et dont la taille est donnée en cadratins
 * plutôt que par `--xc-button-glyph`.
 *
 * `.xc-button__glyph` (style.css) pose une boîte CARRÉE, dimensionnée sur la seule
 * hauteur du widget. C'est le bon compromis pour sept pictogrammes sur neuf ; ce ne l'est
 * pas pour le drapeau de `WButtonNavig`, dont l'appareil fait un dessin nettement plus
 * haut que large (62 × 91 px mesurés) et dont l'encre doit être calée au pixel près pour
 * que la rangée entière tienne dans la case. Les deux dimensions sont donc écrites en
 * ligne, ce qui l'emporte sur la règle de classe.
 *
 * `widthEm` et `heightEm` sont en **fractions de la hauteur du widget** : `.xc-button`
 * pose `font-size: calc(var(--xc-h) * 1px)`, un cadratin vaut donc exactement cette
 * hauteur. Le facteur de cadrage (`glyphFit`) passe par cette même police, si bien qu'il
 * s'applique à ces tailles-ci comme aux autres sans être répété.
 */
function sizedGlyph(
  name: string, viewBox: string, widthEm: number, heightEm: number,
  strokeWidth: number, build: (svg: SVGSVGElement) => void
): SVGSVGElement {
  const svg = svgEl('svg', {
    class: `xc-button__glyph xc-button__glyph--${name}`,
    viewBox,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': String(strokeWidth),
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round'
  })
  svg.style.width = `${widthEm}em`
  svg.style.height = `${heightEm}em`
  build(svg)
  return svg
}

/**
 * Drapeau de balise — **redessiné sur la mesure de l'appareil**, écart 3.3 de la revue
 * des visuels (« rapport 2,29 contre 1,82, traits environ deux fois trop épais »).
 *
 * Profil relevé colonne par colonne sur `2026-08-21_planche-sol-5-boutons-autres-test.png`,
 * case 320 × 174, encre du drapeau **62 × 91 px** — d'où le `viewBox` : ses unités SONT
 * les pixels de la capture, chaque coordonnée ci-dessous est donc une transcription et
 * non un choix de dessin.
 *
 * | | appareil | ancien dessin |
 * |---|---|---|
 * | encre du drapeau | 0,356 L × 0,523 H, rapport 0,68 | 0,425 × 0,477, rapport 0,89 |
 * | épaisseur du mât | 3 px, soit 0,017 fois la hauteur du widget | 0,044 — **2,5 fois trop** |
 * | base | arc fin, remontant au milieu, large de 0,52 boîte | barre pleine arrondie |
 * | fanion | pointe à 0,98 de la boîte, entre y 0,02 et 0,29 | triangle deux fois plus gros |
 */
function flagGlyph(): SVGSVGElement {
  return sizedGlyph('flag', '0 0 62 91', FLAG_WIDTH, FLAG_HEIGHT, 3, (svg) => {
    // Mât : x 16,5 (relevé 0,242..0,290 de la boîte), du haut jusqu'à la base.
    svg.append(svgEl('line', { x1: '16.5', y1: '1.5', x2: '16.5', y2: '88' }))
    // Fanion : pointe à droite, à hauteur y 15 — le sommet du relevé.
    svg.append(svgEl('polygon', { points: '16.5,3 59.5,15 16.5,26' }))
    // Base : un arc, et non une barre. Sur la capture, ses deux extrémités descendent
    // plus bas que son milieu.
    svg.append(svgEl('path', { d: 'M 1.5 89.5 Q 16.5 84 31.5 89.5' }))
  })
}

/**
 * Le `Ø` de `WButtonNavig` : un cercle barré, dessiné et non composé en texte.
 *
 * Relevé sur la même capture : encre **66 × 65 px**, anneau de 9 px — soit 0,136 fois la
 * boîte, presque le double du rapport de l'ancien dessin (0,075). Le trait oblique
 * **dépasse** l'anneau des deux côtés, ce que l'ancien dessin ne faisait pas. Le cercle
 * est donc à la fois plus petit que l'ancien (0,379 L contre 0,431) et plus épais : les
 * deux se compensent, et c'est le drapeau, pas lui, qui portait les traits trop gras.
 */
function slashedCircleGlyph(): SVGSVGElement {
  return sizedGlyph('slashed', '0 0 24 24', SLASH_WIDTH, SLASH_HEIGHT, 3.2, (svg) => {
    svg.append(svgEl('circle', { cx: '12', cy: '12', r: '10.2' }))
    svg.append(svgEl('line', { x1: '2.6', y1: '21.4', x2: '21.4', y2: '2.6' }))
  })
}

/** Combiné téléphone, silhouette pleine. */
function phoneGlyph(): SVGSVGElement {
  return glyph('phone', (svg) => {
    svg.append(svgEl('path', {
      d: 'M6.6 2.5c1 0 1.6.5 2 1.5l1.2 3c.3.9.1 1.6-.6 2.1l-1.3 1c.9 2 2.5 3.6 4.5 4.5l1-1.3c.5-.7 1.2-.9 2.1-.6l3 1.2c1 .4 1.5 1 1.5 2v2.2c0 1.4-1 2.4-2.4 2.4C9.9 20.5 3.5 14.1 3.5 5.4c0-1.4 1-2.4 2.4-2.4z'
    }))
  }, false)
}

/** Appareil photo, silhouette pleine avec objectif évidé. */
function cameraGlyph(): SVGSVGElement {
  return glyph('camera', (svg) => {
    svg.append(svgEl('path', {
      d: 'M9 4h6l1.4 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.6zM12 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z',
      'fill-rule': 'evenodd'
    }))
  }, false)
}

/** Soleil de la luminosité : disque plein, huit rayons, et le signe de l'action au
 * centre — sur la capture, le `+` est DANS le disque, pas à côté. */
function sunGlyph(sign: string): SVGSVGElement {
  const svg = glyph('sun', (target) => {
    target.append(svgEl('circle', { cx: '12', cy: '12', r: '6.4' }))
    for (let i = 0; i < 8; i++) {
      const rad = (i * 45) * (Math.PI / 180)
      const x1 = 12 + 8.6 * Math.cos(rad)
      const y1 = 12 + 8.6 * Math.sin(rad)
      const x2 = 12 + 11 * Math.cos(rad)
      const y2 = 12 + 11 * Math.sin(rad)
      target.append(svgEl('line', { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2) }))
    }
  }, true)
  const text = svgEl('text', { class: 'xc-button__glyph-sign', x: '12', y: '12', 'text-anchor': 'middle', 'dominant-baseline': 'central' })
  text.textContent = sign
  svg.append(text)
  return svg
}

/** Haut-parleur au trait, avec ses deux ondes. */
function speakerGlyph(): SVGSVGElement {
  return glyph('speaker', (svg) => {
    svg.append(svgEl('polygon', { points: '3,9 7,9 12,4.5 12,19.5 7,15 3,15' }))
    svg.append(svgEl('path', { d: 'M15.5 9.2a4 4 0 0 1 0 5.6' }))
    svg.append(svgEl('path', { d: 'M18 6.7a7.5 7.5 0 0 1 0 10.6' }))
  }, true)
}

/** Barres de vario — trois traits de longueurs décroissantes plus un carré, le
 * pictogramme que `WButtonVario` porte à gauche de son haut-parleur. */
function varioBarsGlyph(): SVGSVGElement {
  return glyph('variobars', (svg) => {
    svg.append(svgEl('rect', { x: '3', y: '3.5', width: '15', height: '4' }))
    svg.append(svgEl('rect', { x: '3', y: '10', width: '9', height: '4' }))
    svg.append(svgEl('rect', { x: '3', y: '16.5', width: '4', height: '4' }))
  }, true)
}

/**
 * Signe de l'action, en gros caractère : `+` ou `−`. `WButtonZoom` n'affiche que lui
 * (mesuré à 0,21 W × 0,39 H, c'est-à-dire un glyphe seul, sans pictogramme).
 */
function signSpan(sign: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'xc-button__sign'
  span.textContent = sign
  return span
}

/** Les codes `type` observés portent tous un sens « plus » ou « moins » ; un code
 * inconnu retombe sur `+`, la valeur par défaut des trois types concernés (§ 3). */
const MINUS_ACTIONS = new Set(['ACTION_MINUS', 'ACTION_ZOOM_OUT'])

function actionSign(widget: Widget): string {
  const type = readString(widget.node, 'type')
  return type !== undefined && MINUS_ACTIONS.has(type) ? '−' : '+'
}

/**
 * Étiquette de survol — la seule chose que ce module ajoute au-delà du dessin de
 * l'appareil : elle nomme l'action pour le pilote qui compose sa page, puisque deux
 * boutons d'actions opposées portent parfois le même pictogramme (les deux
 * `WButtonNavig` du corpus, par exemple, sont indiscernables à l'écran).
 *
 * ⚠️ **C'est notre prose, pas un libellé de XCTrack** : rien de ceci n'est écrit sur
 * l'appareil. Elle suit donc l'axe `ui` — la langue que le pilote a choisie — et passe par
 * le catalogue, comme toute phrase que nous écrivons. Ce qui reste ici est la seule chose
 * qui appartienne à ce module : **la table qui va d'un code d'action de XCTrack à la clé
 * du message**.
 *
 * Jusqu'au 2026-08-22 elle vivait dans une table figée à `fr`/`en`, indexée par la langue
 * du **fichier** : un pilote allemand, néerlandais ou espagnol lisait l'anglais sur le
 * seul secours prévu pour distinguer deux boutons identiques.
 */
const ACTION_MESSAGES: Record<string, (tr: Translator) => string> = {
  ACTION_NEXT_WAYPOINT: (tr) => tr.t('render.actionNextWaypoint'),
  ACTION_PREV_WAYPOINT: (tr) => tr.t('render.actionPrevWaypoint'),
  ACTION_PLUS: (tr) => tr.t('render.actionPlus'),
  ACTION_MINUS: (tr) => tr.t('render.actionMinus'),
  ACTION_ZOOM_IN: (tr) => tr.t('render.actionZoomIn'),
  ACTION_ZOOM_OUT: (tr) => tr.t('render.actionZoomOut')
}

function hoverLabel(widget: Widget, tr: Translator): string | undefined {
  const type = readString(widget.node, 'type')
  const say = type !== undefined ? ACTION_MESSAGES[type] : undefined
  if (say === undefined) return undefined
  const action = say(tr)
  // `longClick` vaut `true` par défaut sur cinq des neuf boutons : l'étiquette de survol
  // omettait donc « appui long » sur un fichier qui n'écrit pas la clé.
  const longClick = widgetBoolean(widget, 'longClick') ?? false
  return longClick ? tr.t('render.actionLongPress', { action }) : action
}

/**
 * Facteur de cadrage : 1 quand la rangée tient dans `MAX_GLYPH_WIDTH` fois la largeur de
 * la case — le cas courant —, sinon la réduction qu'il faut pour l'y faire tenir.
 *
 * Il s'applique par la **taille de police du bouton**, dont tout le contenu dérive
 * (`--xc-button-glyph`, `.xc-button__sign`, `.xc-button__mark`, les tailles en cadratins
 * posées en ligne) : une seule écriture réduit la rangée entière sans avoir à recopier
 * ici les neuf valeurs de `--xc-button-glyph` que porte style.css. Le titre de
 * `WButtonVario`, lui, est en pixels de `--xc-title` et ne bouge pas — c'est bien ce que
 * fait l'appareil, dont les titres gardent la même taille partout.
 */
function glyphFit(widget: Widget, modifier: string): number {
  const height = widget.y2 - widget.y1
  const rowWidth = GLYPH_ROW_WIDTH[modifier]
  if (height <= 0 || rowWidth === undefined || rowWidth <= 0) return 1
  const widthOverHeight = ((widget.x2 - widget.x1) / height) * LANDSCAPE_ASPECT
  const fit = (MAX_GLYPH_WIDTH * widthOverHeight) / rowWidth
  return Math.max(MIN_GLYPH_FIT, Math.min(1, fit))
}

/** Coquille commune : une colonne centrée, dont le CSS règle la taille des glyphes en
 * fraction de la hauteur du widget, et dont `glyphFit` borne la largeur. */
function shell(widget: Widget, modifier: string): HTMLElement {
  const element = document.createElement('div')
  element.className = `xc-button xc-button--${modifier}`
  const fit = glyphFit(widget, modifier)
  element.style.setProperty('--xc-button-fit', fit.toFixed(4))
  // La taille de police n'est réécrite que lorsqu'il y a quelque chose à réduire : dans
  // le cas courant, la règle de style.css reste seule en jeu. Elle est recopiée ici
  // parce que style.css ne connaît pas encore `--xc-button-fit` ; le jour où il le
  // multipliera lui-même, cette ligne disparaîtra et la variable suffira.
  if (fit < 1) element.style.fontSize = `calc(var(--xc-h, 100) * var(--xc-button-fit) * 1px)`
  return element
}

function row(...parts: (Element | null)[]): HTMLElement {
  const line = document.createElement('div')
  line.className = 'xc-button__row'
  for (const part of parts) if (part !== null) line.append(part)
  return line
}

function caption(text: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'xc-button__caption'
  span.textContent = text
  return span
}

export function drawButtonNavig(
  widget: Widget, _settings: RenderSettings, _language: string, tr: Translator
): HTMLElement {
  const element = shell(widget, 'navig')
  const label = hoverLabel(widget, tr)
  if (label !== undefined) element.title = label
  const line = row(flagGlyph(), slashedCircleGlyph())
  line.style.gap = `${NAVIG_ROW_GAP}em`
  element.append(line)
  return element
}

export function drawButtonPhone(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = shell(widget, 'phone')
  // `showContactName` vaut true par défaut mais `contact.fullName` est vide tant que le
  // pilote n'a choisi personne : la capture ne montre donc que le combiné. On ne compose
  // pas de nom d'exemple — ce serait inventer une donnée personnelle.
  const name = readString(widget.node, 'fullName')
  element.append(row(phoneGlyph()))
  if (name !== undefined && name.length > 0 && (widgetBoolean(widget, 'showContactName') ?? true)) {
    element.append(caption(name))
  }
  return element
}

export function drawButtonCamera(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = shell(widget, 'camera')
  element.append(row(cameraGlyph()))
  return element
}

export function drawButtonZoom(
  widget: Widget, _settings: RenderSettings, _language: string, tr: Translator
): HTMLElement {
  const element = shell(widget, 'zoom')
  const label = hoverLabel(widget, tr)
  if (label !== undefined) element.title = label
  element.append(row(signSpan(actionSign(widget))))
  return element
}

/** Le seul bouton titré, et c'est `showTitle` qui le commande — pas `_title`. Le titre
 * porte la couleur de titre du fichier, comme les widgets numériques. */
export function drawButtonVario(widget: Widget, settings: RenderSettings): HTMLElement {
  const element = shell(widget, 'vario')
  if (widgetBoolean(widget, 'showTitle') ?? true) {
    const title = document.createElement('span')
    title.className = 'xc-button__title'
    title.style.color = settings.titleColor
    // « Vario » est le titre que l'appareil écrit, et il l'écrit ainsi dans les cinq
    // langues du dépôt — c'est un mot international, pas notre prose. Il ne suit donc
    // aucun des deux axes et ne passe pas par le catalogue. La ligne portait jusqu'au
    // 2026-08-22 un ternaire `language === 'fr' ? 'Vario' : 'Vario'` dont les deux
    // branches disaient la même chose : il annonçait une variation qui n'existe pas.
    title.textContent = 'Vario'
    element.append(title)
  }
  element.append(row(varioBarsGlyph(), speakerGlyph()))
  return element
}

export function drawButtonBrightness(
  widget: Widget, _settings: RenderSettings, _language: string, tr: Translator
): HTMLElement {
  const element = shell(widget, 'brightness')
  const label = hoverLabel(widget, tr)
  if (label !== undefined) element.title = label
  element.append(row(sunGlyph(actionSign(widget))))
  return element
}

export function drawButtonVolume(
  widget: Widget, _settings: RenderSettings, _language: string, tr: Translator
): HTMLElement {
  const element = shell(widget, 'volume')
  const label = hoverLabel(widget, tr)
  if (label !== undefined) element.title = label
  element.append(row(speakerGlyph(), signSpan(actionSign(widget))))
  return element
}

/**
 * ⚠️ **Ceci n'est pas notre prose** : c'est XCTrack qui peint cette phrase sur le bouton,
 * et elle suit donc l'axe `labels` — la langue du fichier ouvert, jamais celle de
 * l'interface. La verser au catalogue donnerait au pilote un mot qu'il ne trouverait
 * **nulle part** sur son appareil.
 *
 * **Mesuré en français seulement** (`2026-08-21_planche-sol-5-boutons-autres-test.png`,
 * appareil réglé en français) ; l'anglais est repris de la ressource anglaise de l'APK.
 * Les trois autres langues **ne sont pas mesurées** : plutôt qu'inventer un mot qu'aucun
 * relevé n'atteste, un fichier `de`, `nl` ou `es` retombe sur l'anglais. C'est la règle du
 * dépôt (`src/i18n/CLAUDE.md` § 7.5) et non un oubli — la corriger demande une capture,
 * pas une traduction.
 */
const VOLUME_REMINDER: Record<string, string> = { fr: 'Monter le son', en: 'Turn the volume up' }

export function drawButtonVolumeReminder(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell(widget, 'volumereminder')
  element.append(row(speakerGlyph()))
  element.append(caption(VOLUME_REMINDER[language] ?? VOLUME_REMINDER.en!))
  return element
}

/**
 * Les deux textes viennent du fichier : `title` (🚀 par défaut) au-dessus, `name`
 * (« test » par défaut) en dessous — c'est exactement ce que montre la capture, et les
 * deux valeurs par défaut du ré-export (§ 3). Rien n'est inventé : un fichier qui les
 * renseigne autrement affiche ses propres textes.
 */
export function drawButtonIntentLauncher(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = shell(widget, 'intent')
  const mark = readString(widget.node, 'title') ?? '🚀'
  const name = readString(widget.node, 'name') ?? 'test'
  if (mark.length > 0) {
    const span = document.createElement('span')
    span.className = 'xc-button__mark'
    span.textContent = mark
    element.append(span)
  }
  if (name.length > 0) element.append(caption(name))
  return element
}
