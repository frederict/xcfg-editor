import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { androidColorToHex } from '../../model/preferences'
import { widgetBoolean, widgetNumber, widgetString } from '../defaults'

/**
 * `WFreeText` (« Texte libre ») et `WEmitTestEvent` (« Émettre un événement test ») —
 * écart 2.10 de la revue des 75 visuels : deux gadgets que l'appareil dessine et que
 * nous rendions « titre + `--` ».
 *
 * Les deux ont ceci de commun qu'ils **n'affichent aucun titre** et que tout leur
 * contenu vient d'une clé du fichier : `text` pour l'un, `event` pour l'autre. Ce sont
 * donc les seuls gadgets de ce moteur dont le dessin porte du texte que le PILOTE a
 * écrit, et pas un exemple figé.
 *
 * ## Ce qui est mesuré
 *
 * `captures-air3/2026-08-21_planche-sol-5-boutons-autres-test.png` :
 *
 * | | `WFreeText` (cellule 326 × 174) | `WEmitTestEvent` (cellule 326 × 149) |
 * |---|---|---|
 * | titre | **aucun** | **aucun** |
 * | contenu | « Modifie moi dans les paramètres du gadget » | « Battery50 » |
 * | place | haut-gauche, replié sur deux lignes | centré |
 * | hauteur de casse | 13 px | 57 px |
 * | marges | 7 px à gauche, 12 px en haut | — |
 * | cadre | aucun | **gris `#808080`, 5 px d'épaisseur**, sur tout le pourtour |
 *
 * ## Le facteur 0,75 entre `text_size` et les pixels
 *
 * `WFreeText` porte `text_size: 25` et `text_padding: 10` dans le relevé des défauts. La
 * capture donne une police d'environ **18,7 px** (casse de 13 px, Roboto ayant une
 * hauteur de casse de 0,71 cadratin) et une marge gauche de **7 px**. Les deux rapports
 * valent **0,75** à moins d'un pixel près : `25 × 0,75 = 18,75` et `10 × 0,75 = 7,5`.
 *
 * Deux clés indépendantes qui donnent le même facteur, ce n'est plus une coïncidence —
 * mais ce n'est pas non plus une loi : le mécanisme sous-jacent (des unités `sp`/`dp`
 * converties par la densité de la dalle) n'a pas été vérifié, et il ne l'est **pas** pour
 * une autre dalle que celle de l'AIR³. C'est écrit comme un rapport mesuré, valable dans
 * le repère de référence de 1280 × 720 où tout ce moteur dessine (`canvas.ts`).
 */

/** Rapport mesuré entre les clés de taille de XCTrack et les pixels du repère de rendu. */
const TEXT_SIZE_TO_PX = 0.75

/** Défauts du relevé, en dernier recours si la clé manque des deux côtés. */
const FREE_TEXT_SIZE = 25
const FREE_TEXT_PADDING = 10

/** Couleur d'une clé ARGB, ou `undefined` si la clé n'est ni écrite ni relevée. */
function colorOf(widget: Widget, key: string): string | undefined {
  const value = widgetNumber(widget, key)
  return value === undefined ? undefined : androidColorToHex(value)
}

export function drawFreeText(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-freetext'

  const size = widgetNumber(widget, 'text_size') ?? FREE_TEXT_SIZE
  const padding = widgetNumber(widget, 'text_padding') ?? FREE_TEXT_PADDING
  element.style.fontSize = `${size * TEXT_SIZE_TO_PX}px`
  element.style.padding = `${padding * TEXT_SIZE_TO_PX}px`

  const ink = colorOf(widget, 'color_text')
  if (ink !== undefined) element.style.color = ink
  // `color_bg` vaut `16777215` — du blanc SANS canal alpha. Le fond du gadget est déjà
  // peint par `canvas.ts` selon `_bg` ; ce calque-ci ne s'ajoute que si la clé demande
  // autre chose que le blanc, faute de quoi il masquerait la transparence voulue.
  const paper = colorOf(widget, 'color_bg')
  if (paper !== undefined && paper !== '#ffffff') element.style.background = paper

  if ((widgetBoolean(widget, 'text_bold') ?? false)) element.style.fontWeight = '700'
  if ((widgetBoolean(widget, 'text_italic') ?? false)) element.style.fontStyle = 'italic'

  // Le texte du PILOTE, pas un exemple : il vient de la clé `text`, dont le relevé donne
  // la phrase que XCTrack écrit sur un gadget neuf.
  element.textContent = widgetString(widget, 'text') ?? ''
  return element
}

export function drawEmitTestEvent(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-testevent'
  const label = document.createElement('span')
  label.className = 'xc-testevent__label'
  label.textContent = widgetString(widget, 'event') ?? ''
  element.append(label)
  return element
}
