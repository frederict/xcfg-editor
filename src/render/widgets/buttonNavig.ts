import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean, readString } from '../../core/access'

/**
 * `WButtonNavig` — correction en vol (rendu-en-vol.md § 4). Le premier relevé, fait au
 * sol, avait traité ce type comme `WButtonBrightness` : une zone tactile transparente
 * (`touchZone.ts`). En vol, seul `WButtonBrightness` est réellement invisible ;
 * `WButtonNavig` dessine un vrai pictogramme — un drapeau et un symbole `Ø` — sur fond
 * blanc opaque, avec un cadre fin. Vu sur
 * `docs/reference/captures-air3/vol-thermalassistant-boutonsnavig.png`, en bas à
 * droite : deux occurrences adjacentes (`ACTION_NEXT_WAYPOINT` et
 * `ACTION_PREV_WAYPOINT`, `2026-08-20_backup-00.xcfg`, `landscape[4]`), toutes deux
 * avec EXACTEMENT le même pictogramme — rien ne distingue les deux actions à l'écran.
 *
 * Fond : ce module peint son propre blanc opaque plutôt que de s'appuyer sur le calque
 * partagé `.xc-widget__bg` — `_bg` vaut `0` (transparent) sur les deux occurrences du
 * corpus, ce qui laisserait voir la carte au travers si on le respectait littéralement,
 * contredisant la capture. Même réserve déjà documentée pour `WButtonBrightness`
 * (touchZone.ts) : `_bg`/`_border` ne pilotent pas fidèlement ce que XCTrack dessine
 * pour ces deux types.
 *
 * Cadre : à la différence du fond, rien n'indique que `_border` soit ignoré ici — les
 * deux occurrences connues le portent à `true`, et la capture montre bien un filet. On
 * laisse donc le mécanisme générique s'en charger (`_border`, `canvas.ts`) : ce type
 * n'est plus dans `registerTransparent` (`registry.ts`/`widgets/index.ts`), seul
 * `WButtonBrightness` y reste.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/** Drapeau de balise — mât, fanion triangulaire, petite base. Pictogramme maison : la
 * capture ne porte aucune ressource vectorielle exploitable, seule sa silhouette. */
function buildFlag(): SVGSVGElement {
  const svg = svgEl('svg', {
    class: 'xc-navig__flag', viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
  })
  svg.append(svgEl('line', { x1: '6', y1: '3', x2: '6', y2: '20' }))
  svg.append(svgEl('polygon', { points: '6,3 18,7.5 6,12', fill: 'currentColor' }))
  svg.append(svgEl('line', { x1: '3', y1: '20', x2: '9', y2: '20' }))
  return svg
}

/** Traduction maison des deux actions connues, pour l'étiquette de survol —
 * reprend `ACTION_LABELS` de `touchZone.ts` (WButtonBrightness ne porte que
 * ACTION_PLUS/ACTION_MINUS, WButtonNavig que NEXT/PREV_WAYPOINT : les deux types ne se
 * recoupent jamais dans le corpus, d'où deux jeux distincts plutôt qu'un partagé). */
const ACTION_LABELS: Record<string, Record<string, string>> = {
  ACTION_NEXT_WAYPOINT: { fr: 'balise suivante', en: 'next waypoint' },
  ACTION_PREV_WAYPOINT: { fr: 'balise précédente', en: 'previous waypoint' }
}

function actionLabel(widget: Widget, language: string): string | undefined {
  const type = readString(widget.node, 'type')
  if (type === undefined) return undefined
  const map = ACTION_LABELS[type]
  if (map === undefined) return undefined
  const action = map[language] ?? map.en
  const longClick = readBoolean(widget.node, 'longClick') === true
  const suffix = longClick ? (language === 'fr' ? ' (appui long)' : ' (long press)') : ''
  return `${action}${suffix}`
}

export function drawButtonNavig(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-navig'

  const label = actionLabel(widget, language)
  if (label !== undefined) element.title = label

  element.append(buildFlag())

  const slash = document.createElement('span')
  slash.className = 'xc-navig__slash'
  slash.textContent = 'Ø'
  element.append(slash)

  return element
}
