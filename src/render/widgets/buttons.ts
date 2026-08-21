import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'

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
 * **Conséquence non traitée ici** : `canvas.ts` calcule `background / 100` comme une
 * opacité, c'est-à-dire l'inverse. La corriger demanderait de reprendre en même temps
 * `src/ui/warnings.ts` (dont l'avertissement de recouvrement teste `background >= 100`
 * pour « opaque ») et `src/ui/widgetList.ts` — hors du périmètre de cette tâche. Le
 * `registerTransparent` de `WLiveMessage` est donc conservé tel quel : il produit le bon
 * résultat sur les 10 occurrences du corpus, qui portent toutes `_bg: 100`. Seul
 * `WButtonBrightness` en sort, parce qu'il dessine — et son recouvrement par la carte
 * se reproduit tout seul, `canvas.ts` empilant déjà les widgets dans l'ordre du fichier.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

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

/** Drapeau de balise, au trait — mât, fanion, base. */
function flagGlyph(): SVGSVGElement {
  return glyph('flag', (svg) => {
    svg.append(svgEl('line', { x1: '7', y1: '3', x2: '7', y2: '21' }))
    svg.append(svgEl('polygon', { points: '7,3 19,7.5 7,12' }))
    svg.append(svgEl('line', { x1: '3', y1: '21', x2: '11', y2: '21' }))
  }, true)
}

/** Le `Ø` de `WButtonNavig` : un cercle barré, dessiné et non composé en texte — la
 * capture montre un trait d'épaisseur constante avec le drapeau, pas un glyphe de
 * police. */
function slashedCircleGlyph(): SVGSVGElement {
  return glyph('slashed', (svg) => {
    svg.append(svgEl('circle', { cx: '12', cy: '12', r: '8' }))
    svg.append(svgEl('line', { x1: '5.5', y1: '18.5', x2: '18.5', y2: '5.5' }))
  }, true)
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
 * Traductions maison, pas des libellés XCTrack.
 */
const ACTION_LABELS: Record<string, Record<string, string>> = {
  ACTION_NEXT_WAYPOINT: { fr: 'balise suivante', en: 'next waypoint' },
  ACTION_PREV_WAYPOINT: { fr: 'balise précédente', en: 'previous waypoint' },
  ACTION_PLUS: { fr: 'augmenter', en: 'increase' },
  ACTION_MINUS: { fr: 'diminuer', en: 'decrease' },
  ACTION_ZOOM_IN: { fr: 'zoom avant', en: 'zoom in' },
  ACTION_ZOOM_OUT: { fr: 'zoom arrière', en: 'zoom out' }
}

const LONG_CLICK: Record<string, string> = { fr: 'appui long', en: 'long press' }

function hoverLabel(widget: Widget, language: string): string | undefined {
  const type = readString(widget.node, 'type')
  const map = type !== undefined ? ACTION_LABELS[type] : undefined
  const action = map?.[language] ?? map?.en
  if (action === undefined) return undefined
  const longClick = readBoolean(widget.node, 'longClick') === true
  const suffix = longClick ? ` (${LONG_CLICK[language] ?? LONG_CLICK.en!})` : ''
  return `${action}${suffix}`
}

/** Coquille commune : une colonne centrée, dont le CSS règle la taille des glyphes en
 * fraction de la hauteur du widget. */
function shell(modifier: string): HTMLElement {
  const element = document.createElement('div')
  element.className = `xc-button xc-button--${modifier}`
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

export function drawButtonNavig(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell('navig')
  const label = hoverLabel(widget, language)
  if (label !== undefined) element.title = label
  element.append(row(flagGlyph(), slashedCircleGlyph()))
  return element
}

export function drawButtonPhone(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = shell('phone')
  // `showContactName` vaut true par défaut mais `contact.fullName` est vide tant que le
  // pilote n'a choisi personne : la capture ne montre donc que le combiné. On ne compose
  // pas de nom d'exemple — ce serait inventer une donnée personnelle.
  const name = readString(widget.node, 'fullName')
  element.append(row(phoneGlyph()))
  if (name !== undefined && name.length > 0 && readBoolean(widget.node, 'showContactName') !== false) {
    element.append(caption(name))
  }
  return element
}

export function drawButtonCamera(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = shell('camera')
  element.append(row(cameraGlyph()))
  return element
}

export function drawButtonZoom(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell('zoom')
  const label = hoverLabel(widget, language)
  if (label !== undefined) element.title = label
  element.append(row(signSpan(actionSign(widget))))
  return element
}

/** Le seul bouton titré, et c'est `showTitle` qui le commande — pas `_title`. Le titre
 * porte la couleur de titre du fichier, comme les widgets numériques. */
export function drawButtonVario(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = shell('vario')
  if (readBoolean(widget.node, 'showTitle') ?? true) {
    const title = document.createElement('span')
    title.className = 'xc-button__title'
    title.style.color = settings.titleColor
    title.textContent = language === 'fr' ? 'Vario' : 'Vario'
    element.append(title)
  }
  element.append(row(varioBarsGlyph(), speakerGlyph()))
  return element
}

export function drawButtonBrightness(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell('brightness')
  const label = hoverLabel(widget, language)
  if (label !== undefined) element.title = label
  element.append(row(sunGlyph(actionSign(widget))))
  return element
}

export function drawButtonVolume(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell('volume')
  const label = hoverLabel(widget, language)
  if (label !== undefined) element.title = label
  element.append(row(speakerGlyph(), signSpan(actionSign(widget))))
  return element
}

/** Le libellé est une phrase, pas un identifiant : il suit la langue du pilote, comme
 * sur l'appareil, qui écrit « Monter le son » en français. */
const VOLUME_REMINDER: Record<string, string> = { fr: 'Monter le son', en: 'Turn the volume up' }

export function drawButtonVolumeReminder(_widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = shell('volumereminder')
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
  const element = shell('intent')
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
