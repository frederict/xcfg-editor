import type { Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import { drawWidget, isTransparent } from './registry'

export interface Box { x1: number; y1: number; x2: number; y2: number; background: number }

export interface WidgetStyle {
  left: string; top: string; width: string; height: string
  backgroundOpacity: number
}

const SCALE = 10000
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Largeur du repère de référence dans lequel toute la page se dessine (`renderPage`,
 * plus bas) — voir le commentaire de tête de `renderPage` pour pourquoi ce repère
 * existe. `1280` n'est pas arbitraire : c'est la largeur, en pixels, de la seule
 * capture plein écran fiable du corpus
 * (`docs/reference/captures-air3/ecran-landscape3-17widgets.png`) — les tailles de
 * texte calibrées dessus (`numeric.ts`, `widgetHeightPx` ci-dessous) restent donc
 * exactes dans ce repère, sans conversion.
 */
const REFERENCE_WIDTH = 1280

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
 * Hauteur du widget, en unités du repère de référence (voir `REFERENCE_WIDTH`) — un
 * nombre calculable sans connaître la taille de rendu effective : les coordonnées d'un
 * widget sont des fractions fixes de la page (normalisées sur 10000, voir `SCALE`), et
 * la page a un rapport largeur/hauteur fixe (`aspectRatio`, `16/9` en paysage).
 *
 * Sert de base à `--xc-h` (`style.css`, consommée par `.xc-num` dans `numeric.ts` —
 * seul endroit qui a besoin de la hauteur d'un widget spécifique, pas seulement de la
 * taille de la page entière). Une piste plus « moderne » a été essayée et abandonnée :
 * `container-type: size` + l'unité `cqh`, l'équivalent du `viewBox` des dessins SVG
 * mais pour du texte HTML. Testée isolément (Chrome 151, `--headless`), elle échoue
 * dès qu'il y a PLUSIEURS conteneurs de ce type sur la page — le cas normal ici (un
 * conteneur par widget) : seul le premier de la page se dimensionne correctement,
 * les suivants recopient sa taille en pixels au lieu de calculer la leur (constaté,
 * pas supposé — voir le rapport de tâche pour le détail des essais). D'où ce détour :
 * un nombre calculé ici, en JS, plutôt que constaté par un mécanisme CSS qui ne le
 * donne pas fiablement dans ce navigateur.
 */
export function widgetHeightPx(box: Box, aspectRatio: number): number {
  if (aspectRatio <= 0) return 0
  const height = box.y2 - box.y1
  return (height / SCALE) * (REFERENCE_WIDTH / aspectRatio)
}

/**
 * Petit côté de la page dans le repère de référence — 720 px en paysage, où il se
 * confond avec la hauteur ; en portrait, c'est la largeur qui représente le petit côté
 * physique de l'écran, le repère de rendu étant alors bien plus haut que large.
 *
 * La barre d'état y puise sa taille de texte : celle-ci ne suit PAS la hauteur du
 * bandeau (deux captures d'AIR³, bandeaux de 74 et 99 px de haut, mêmes capitales à
 * 36 et 37 px — voir le commentaire de tête de `widgets/statusLine.ts`), mais reste
 * constante à l'échelle de l'écran.
 */
export function pageShortSidePx(aspectRatio: number): number {
  if (aspectRatio <= 0) return 0
  return Math.min(REFERENCE_WIDTH, REFERENCE_WIDTH / aspectRatio)
}

/**
 * Émet les widgets dans l'ordre du tableau : c'est l'ordre de dessin de XCTrack. Le
 * premier est au fond, le dernier au-dessus. L'empilement naturel du DOM suffit — aucun
 * z-index n'est nécessaire.
 *
 * `language` est déjà résolue en code concret par l'appelant (`resolveLanguage` dans
 * `src/model/preferences.ts`, avec `navigator.language` côté `src/ui/` quand le fichier
 * ne précise rien) : ce module ne fait que la relayer jusqu'aux dessins de widgets.
 *
 * **La page entière est enveloppée dans un `<svg viewBox>` + `<foreignObject>`** :
 * c'est ce qui la rend lisible à toute taille (défaut du jalon, constaté en capturant
 * ce rendu à 1280/640/400/240px avec Chrome headless — voir le rapport de tâche). Les
 * dessins SVG des widgets (compass.ts, map.ts, sideView.ts, verticalGraph.ts,
 * varioColumn.ts, windDirection.ts, airspaceProximity.ts) ont toujours été
 * correctement à l'échelle grâce à leur propre `viewBox` ; le texte HTML (titres,
 * valeurs, barre d'état, etc.), lui, partait de la taille de police du DOCUMENT
 * (16px, jamais redimensionnée) et débordait dès que la page rétrécissait. Le
 * `viewBox` de CE wrapper — fixé une fois pour toutes à `REFERENCE_WIDTH` de large —
 * fait exactement pour ce texte ce que chaque widget SVG fait déjà pour son propre
 * dessin : tout ce qui est exprimé en pixels à l'intérieur (CSS `em`/`%`/`px`, déjà
 * calibrés sur `REFERENCE_WIDTH`, voir son commentaire) suit la mise à l'échelle du
 * conteneur réel, sans rien changer aux widgets eux-mêmes.
 */
export function renderPage(page: Page, aspectRatio: number, settings: RenderSettings, language: string): SVGSVGElement {
  const canvas = document.createElement('div')
  canvas.className = 'xc-page'
  // Mesure valable pour toute la page, héritée par tous les widgets : le petit côté de
  // la page, dont la barre d'état tire sa taille de texte (statusLine.ts).
  canvas.style.setProperty('--xc-page-min', String(pageShortSidePx(aspectRatio)))

  for (const widget of page.widgets) {
    const style = widgetStyle(widget)
    // Un widget sans rendu au repos (WButtonBrightness, zone tactile ; WLiveMessage,
    // afficheur conditionnel — voir registry.ts/registerTransparent ; WButtonNavig
    // n'en fait plus partie depuis la correction en vol, rendu-en-vol.md § 4) ne
    // reçoit jamais le fond ni le cadre que _bg/_border demanderaient dans le
    // fichier : sur l'appareil, il ne dessine rien du tout tant que son contenu n'est
    // pas là, quelles que soient ces valeurs (rendu-observe.md).
    const transparent = isTransparent(widget.shortName)

    const element = document.createElement('div')
    element.className = 'xc-widget'
    element.style.left = style.left
    element.style.top = style.top
    element.style.width = style.width
    element.style.height = style.height
    element.style.setProperty('--xc-bg-opacity', String(transparent ? 0 : style.backgroundOpacity))
    // Voir `widgetHeightPx` : donne au CSS la hauteur de CE widget, dans le même
    // repère que le `viewBox` du wrapper — hérité jusqu'à `.xc-num` (numeric.ts).
    element.style.setProperty('--xc-h', String(widgetHeightPx(widget, aspectRatio)))
    if (widget.border && !transparent) element.classList.add('xc-widget--border')

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

  const refWidth = REFERENCE_WIDTH
  const refHeight = refWidth / aspectRatio

  const scene = document.createElementNS(SVG_NS, 'svg')
  scene.setAttribute('class', 'xc-page-scene')
  scene.setAttribute('viewBox', `0 0 ${refWidth} ${refHeight}`)

  const foreignObject = document.createElementNS(SVG_NS, 'foreignObject')
  foreignObject.setAttribute('x', '0')
  foreignObject.setAttribute('y', '0')
  foreignObject.setAttribute('width', String(refWidth))
  foreignObject.setAttribute('height', String(refHeight))
  foreignObject.append(canvas)

  scene.append(foreignObject)
  return scene
}
