import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { widgetBoolean } from '../defaults'
import { formatDecimal } from '../locale'
import { titleWidthEm } from '../textMetrics'
import { widgetTitle } from '../title'

/**
 * `WOptiUnfinishedFAIPotential` — « Potentiel FAI ». Écart 2.9 de la revue des 75
 * visuels : l'appareil y dessine **trois lignes**, nous le rendions générique.
 *
 * ## Ce qui est mesuré
 *
 * `captures-air3/2026-08-21_planche-vol-3-air-b-xcontest-navigation-a.png`, cellule de
 * 326 × 199 px, et `planche-competition-3-xcontest-et-navigation.png`, même cellule :
 *
 * ```
 * ▲   0,7  km
 * ↑   2,2  km
 * ↓   1,4  km
 * ```
 *
 * | | relevé |
 * |---|---|
 * | flèches | collées au bord GAUCHE (x = 11 sur 326), noires |
 * | valeurs | alignées à DROITE, hauteur de chiffre 31 à 35 px sur 199 |
 * | unité | `km` en gris `#505050`, à droite de chaque valeur |
 * | au sol | **la cellule est vide** — les trois lignes n'apparaissent qu'en vol |
 *
 * Les trois lignes sont commandées par les clés `max`, `real` et `min`, toutes à `true`
 * dans le relevé des défauts (`widgetDefaults.json`). L'appariement flèche ↔ clé suit
 * l'ordre d'écriture du relevé et l'ordre à l'écran, les deux concordants : `max` en
 * haut, `real` au milieu, `min` en bas. **Ce que la capture ne dit pas**, c'est laquelle
 * des trois porte laquelle des trois valeurs : sur `planche-vol-3` la première ligne
 * (0,7) est plus petite que la deuxième (2,2), ce qu'un « maximum » ne laisserait pas
 * attendre. On reprend donc l'ordre observé sans lui prêter de sens.
 *
 * Les valeurs sont celles de `planche-vol-3`, exemples fixes comme partout ailleurs.
 */

/** Une ligne : la clé qui l'affiche, son glyphe, et la valeur d'exemple relevée. */
const LINES: Array<{ key: string; glyph: string; example: string }> = [
  { key: 'max', glyph: '▲', example: '0.7' },
  { key: 'real', glyph: '↑', example: '2.2' },
  { key: 'min', glyph: '↓', example: '1.4' }
]

export function drawOptiPotential(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-opti'

  const title = document.createElement('span')
  title.className = 'xc-num__title'
  title.style.color = settings.titleColor
  const text = widgetTitle(widget, language)
  title.style.setProperty('--xc-title-em', String(titleWidthEm(text)))
  title.textContent = text
  element.append(title)

  const body = document.createElement('div')
  body.className = 'xc-opti__lines'

  for (const line of LINES) {
    // Les trois clés valent `true` par défaut : une clé absente affiche la ligne, elle ne
    // la masque pas. C'est le même piège que les six `=== true` déjà corrigés dans ce
    // moteur — `widgetBoolean` va chercher le défaut du relevé.
    if ((widgetBoolean(widget, line.key) ?? true) === false) continue

    const row = document.createElement('div')
    row.className = 'xc-opti__line'

    const glyph = document.createElement('span')
    glyph.className = 'xc-opti__glyph'
    glyph.textContent = line.glyph

    const value = document.createElement('span')
    value.className = 'xc-opti__value'
    value.textContent = formatDecimal(line.example, language)

    const unit = document.createElement('span')
    unit.className = 'xc-opti__unit'
    unit.textContent = settings.distanceUnit

    row.append(glyph, value, unit)
    body.append(row)
  }

  element.append(body)
  return element
}
