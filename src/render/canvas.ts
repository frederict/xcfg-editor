import type { Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import { drawWidget } from './registry'

export interface Box { x1: number; y1: number; x2: number; y2: number; background: number }

export interface WidgetStyle {
  left: string; top: string; width: string; height: string
  backgroundOpacity: number
}

const SCALE = 10000

/** Les coordonnées sont normalisées : un centième de leur valeur donne un pourcentage. */
export function widgetStyle(box: Box): WidgetStyle {
  const pct = (v: number): string => `${v / (SCALE / 100)}%`
  return {
    left: pct(box.x1),
    top: pct(box.y1),
    width: pct(box.x2 - box.x1),
    height: pct(box.y2 - box.y1),
    backgroundOpacity: box.background / 100
  }
}

/**
 * Émet les widgets dans l'ordre du tableau : c'est l'ordre de dessin de XCTrack. Le
 * premier est au fond, le dernier au-dessus. L'empilement naturel du DOM suffit — aucun
 * z-index n'est nécessaire.
 *
 * `language` est déjà résolue en code concret par l'appelant (`resolveLanguage` dans
 * `src/model/preferences.ts`, avec `navigator.language` côté `src/ui/` quand le fichier
 * ne précise rien) : ce module ne fait que la relayer jusqu'aux dessins de widgets.
 */
export function renderPage(page: Page, aspectRatio: number, settings: RenderSettings, language: string): HTMLElement {
  const canvas = document.createElement('div')
  canvas.className = 'xc-page'
  canvas.style.aspectRatio = String(aspectRatio)

  for (const widget of page.widgets) {
    const style = widgetStyle(widget)

    const element = document.createElement('div')
    element.className = 'xc-widget'
    element.style.left = style.left
    element.style.top = style.top
    element.style.width = style.width
    element.style.height = style.height
    element.style.setProperty('--xc-bg-opacity', String(style.backgroundOpacity))
    if (widget.border) element.classList.add('xc-widget--border')

    // Le fond est un calque séparé : appliquer l'opacité au widget entier effacerait
    // aussi son texte, alors que _bg ne concerne que le fond.
    const background = document.createElement('div')
    background.className = 'xc-widget__bg'

    const content = document.createElement('div')
    content.className = 'xc-widget__content'
    content.append(drawWidget(widget, settings, language))

    element.append(background, content)
    canvas.append(element)
  }

  return canvas
}
