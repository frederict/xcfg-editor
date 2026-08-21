import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { androidColorToHex } from '../../model/preferences'
import { widgetBoolean, widgetNumber, widgetString } from '../defaults'

/**
 * `WLogPeek` (« Queue du journal ») et `WWebView` (« Page web ») — écart 2.11 de la revue
 * des 75 visuels : « rien contre un contenu plein ». Les deux rendaient « titre + `--` »
 * face à un gadget que l'appareil remplit entièrement, et « la moitié basse de la page 9
 * paraît vide chez nous et saturée sur l'appareil ».
 *
 * ## `WLogPeek` — ce qui est mesuré
 *
 * `captures-air3/2026-08-21_planche-sol-9-barre-etat-live-journal-web.png`, cellule de
 * **653 × 397 px** :
 *
 * | | relevé |
 * |---|---|
 * | texte | noir, aligné en haut à gauche, **sur toute la largeur** (x 3 à 651) |
 * | lignes | **jointives** — aucune rangée de pixels blancs entre deux lignes |
 * | pas | 13 px, soit une police d'environ 11 px |
 * | remplissage | de haut en bas, sans marge basse |
 *
 * `text_size` vaut 15 dans le relevé des défauts, et 15 × 0,75 = 11,25 px : **le même
 * facteur 0,75** que `WFreeText` (voir `TEXT_SIZE_TO_PX`, freeText.ts), établi là sur deux
 * clés indépendantes et retrouvé ici sur une troisième.
 *
 * **Le contenu est un exemple fixe et il le dit.** Un journal réel n'existe pas dans un
 * fichier de pages, et recopier celui de la capture mettrait les traces d'exécution de
 * l'appareil du propriétaire dans un dépôt public. Chaque ligne porte donc le mot
 * « exemple », et rien de ce qui s'y lit ne prétend venir d'un journal.
 *
 * ## `WWebView` — ce qui ne peut pas être dessiné
 *
 * L'appareil y affiche la vraie page (`url` vaut `https://www.google.com/` dans le
 * relevé). **Un rendu statique ne fait aucune requête réseau**, et c'est un choix du
 * projet, pas une limitation à contourner : une page d'éditeur qui irait chercher une
 * adresse écrite dans le fichier du pilote ferait fuiter cette adresse. On dessine donc
 * le cadre du gadget et **l'adresse qu'il chargera**, ce qui est l'information que le
 * pilote peut vérifier avant d'emporter sa page — et la cellule cesse de paraître vide.
 */

/** Rapport mesuré entre `text_size` et les pixels du repère de rendu — voir freeText.ts. */
const TEXT_SIZE_TO_PX = 0.75

const DEFAULT_TEXT_SIZE = 15
const DEFAULT_LINES_COUNT = 25

/** Lignes jointives : 13 px de pas pour 11,25 px de police. */
const LINE_HEIGHT = 13 / 11.25

/**
 * Une ligne d'exemple, numérotée pour que la colonne de gauche varie comme celle d'un
 * vrai journal — sans que le texte puisse être pris pour un vrai journal.
 */
function exampleLine(index: number): string {
  const seconds = String(index % 60).padStart(2, '0')
  const millis = String((index * 37) % 1000).padStart(3, '0')
  return `08:16:${seconds}.${millis}  XCTrack  ligne de journal (exemple ${index + 1})`
}

function colorOf(widget: Widget, key: string): string | undefined {
  const value = widgetNumber(widget, key)
  return value === undefined ? undefined : androidColorToHex(value)
}

export function drawLogPeek(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-logpeek'

  const size = widgetNumber(widget, 'text_size') ?? DEFAULT_TEXT_SIZE
  element.style.fontSize = `${size * TEXT_SIZE_TO_PX}px`
  element.style.lineHeight = String(LINE_HEIGHT)

  const ink = colorOf(widget, 'color_text')
  if (ink !== undefined) element.style.color = ink
  const paper = colorOf(widget, 'color_bg')
  if (paper !== undefined && paper !== '#ffffff') element.style.background = paper

  const count = Math.max(1, Math.min(200, widgetNumber(widget, 'lines_count') ?? DEFAULT_LINES_COUNT))
  const lines: string[] = []
  for (let i = 0; i < count; i++) lines.push(exampleLine(i))
  // `reverse` inverse l'ordre des lignes : le relevé le donne à `false`, et une clé
  // absente vaut son défaut, pas `false` par commodité.
  if ((widgetBoolean(widget, 'reverse') ?? false)) lines.reverse()

  for (const text of lines) {
    const line = document.createElement('div')
    line.className = 'xc-logpeek__line'
    line.textContent = text
    element.append(line)
  }
  return element
}

/** Adresse par défaut du relevé, si le fichier n'en porte pas. */
const DEFAULT_URL = 'https://www.google.com/'

export function drawWebView(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-webview'

  const bar = document.createElement('div')
  bar.className = 'xc-webview__bar'
  bar.textContent = widgetString(widget, 'url') ?? DEFAULT_URL
  element.append(bar)

  return element
}
