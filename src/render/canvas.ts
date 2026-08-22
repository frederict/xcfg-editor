import type { Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import type { Translator } from '../i18n/translate'
import { drawWidget } from './registry'
import { TITLE_SIZE_RATIO } from './textMetrics'

export interface Box {
  x1: number; y1: number; x2: number; y2: number
  /** La clé `_bg` du fichier : une **transparence** de 0 à 100 — voir `backgroundOpacity`. */
  background: number
}

export interface WidgetStyle {
  left: string; top: string; width: string; height: string
  /**
   * L'opacité CSS du calque de fond, de 0 (aucun fond peint) à 1 (fond plein).
   * C'est l'**inverse** de `Box.background` — voir `backgroundOpacity`.
   */
  backgroundOpacity: number
}

const SCALE = 10000
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * ## La grille de rendu — 51 × 29, et ce n'est PAS la grille d'aimantation
 *
 * XCTrack ne dessine pas un widget à sa coordonnée normalisée : il **aimante chaque bord
 * sur une grille avant de tracer**. Il faut donc distinguer deux grilles, que ce projet
 * confondait :
 *
 * - la **grille d'édition**, **48 × 29** (`src/model/grid.ts`), sur laquelle XCTrack
 *   aimante quand le pilote fait glisser un widget au doigt. Le relevé est juste — les
 *   98 pages paysage du corpus n'ont aucune valeur X hors des multiples de 1/48 — et
 *   l'aimantation de notre éditeur reste dessus : elle écrit les valeurs que XCTrack
 *   écrirait ;
 * - la **grille de rendu**, **51 × 29**, appliquée **au moment de dessiner**, quelle que
 *   soit la valeur du fichier. C'est elle, et elle seule, qui est reprise ici.
 *
 * ## La loi, et sa mesure
 *
 * ```
 * px = arrondi( arrondi(norme × N / 10000) × côté / N )
 * ```
 *
 * `N = 51` sur le grand côté de la dalle (1280 px), `29` sur le petit (720 px). Vérifiée
 * sur 9 valeurs X et 16 valeurs Y distinctes, par relevé `uiautomator` **et** par
 * détection des filets sur les captures
 * (`docs/reference/2026-08-21-validation-bout-en-bout.md` § 4.1) :
 *
 * | norme | sans grille (ce que nous dessinions) | appareil | écart |
 * |---|---|---|---|
 * | 833 | 106,6 | **100** | −6,6 |
 * | 2292 | 293,4 | **301** | +7,6 |
 * | 2500 | 320,0 | **326** | +6,3 |
 * | 5000 | 640,0 | **653** | +13,0 |
 * | 7500 | 960,0 | **954** | −6,3 |
 * | 8125 | 1040,0 | **1029** | −11,0 |
 *
 * Sur la configuration réelle du propriétaire, l'écart maximal atteint **12,5 px, soit
 * 3,0 mm** sur la dalle — visible à l'œil et faussant tout jugement de composition.
 * Recompté sur la planche des 75 widgets : les filets de la page 1 tombent à 324/326 et
 * 651/653 sur l'appareil, là où le rendu non aimanté les posait à 319/320 et 639/640.
 *
 * **Pourquoi l'écart ne se voyait qu'en X** : les coordonnées du corpus sont des
 * multiples de 1/48 en X et de 1/29 en Y. En Y, 1/29 EST la grille de rendu et
 * l'aimantation ne déplace rien (écart mesuré : 0,03 px). En X, 1/48 ne tombe jamais sur
 * 1/51.
 *
 * ## ⚠️ Trois relevés du dépôt que cette loi contredit — NON TRANCHÉ
 *
 * Le docblock a dit « vérifiée **sans exception** » jusqu'au 22 août 2026. C'est faux, et
 * la contradiction est interne au dépôt : trois autres modules citent comme relevés
 * d'appareil des largeurs qui sont exactement le calcul **sans** grille.
 *
 * | ce qu'affirme le module | la loi 1/51 donne |
 * |---|---|
 * | `widgets/numeric.ts` — deux widgets « de taille identique (187 × 148 px) », X 833→2292 | **201** |
 * | `widgets/statusLine.ts` — « 507 × 99 px sur un écran 1280 × 720 », X 6042→10000 | **502** |
 * | `textMetrics.ts` — filets aux « colonnes 150-152 et 526 », X 3125 et 6042, décalage 248 | **154** et **530** |
 *
 * Les trois concordent au pixel près avec le calcul non aimanté (186,8 · 506,6 · 152,0 et
 * 525,4) et divergent de cette loi de 4 à 14 px. Deux lectures restent ouvertes : ou la
 * loi 1/51 est fausse en X, ou ces trois relevés sont antérieurs à sa découverte et ont
 * été pris sur un rendu, pas sur l'appareil. **Nous ne savons pas laquelle**, et le
 * trancher demande de rouvrir les captures, ce qui n'a pas été fait. En attendant :
 * l'éditeur dessine 201 px là où `numeric.ts` affirme que l'instrument en montre 187, et
 * les trois modules portent chacun un renvoi vers ce paragraphe.
 *
 * En Y il n'y a aucune contradiction : 4828 → 348 et 7586 → 546 avec ou sans grille.
 * L'écart n'existe qu'en X, ce qui est cohérent avec l'explication ci-dessus.
 *
 * ## Ce qui est mesuré, et ce qui est déduit
 *
 * **Mesuré** : une dalle 1280 × 720 en paysage donne 51 divisions en X et 29 en Y.
 *
 * **Déduit, non vérifié** : en portrait, c'est la même dalle tournée d'un quart de tour —
 * le grand côté (1280 px) passe en Y et le petit (720 px) en X, d'où 29 × 51. Aucune
 * capture portrait n'existe pour le confirmer, et l'hypothèse concurrente (une cellule
 * constante en dp, qui donnerait 51 ou 52 selon l'arrondi) n'est pas départageable avec
 * ce qui est disponible. C'est la raison pour laquelle la grille se lit sur le RAPPORT
 * de la page et non sur sa taille de rendu : un même fichier doit se dessiner pareil en
 * vignette et en plein écran, et la grille est une propriété de la DALLE, pas de la
 * taille à laquelle nous en montrons l'image.
 */
const RENDER_GRID_LONG_SIDE = 51
const RENDER_GRID_SHORT_SIDE = 29

/** Nombre de divisions de la grille de rendu, sur chacun des deux axes de la page. */
export interface RenderGrid { x: number; y: number }

export function renderGrid(aspectRatio: number): RenderGrid {
  return aspectRatio >= 1
    ? { x: RENDER_GRID_LONG_SIDE, y: RENDER_GRID_SHORT_SIDE }
    : { x: RENDER_GRID_SHORT_SIDE, y: RENDER_GRID_LONG_SIDE }
}

/**
 * Aimante une coordonnée normalisée (0 à 10000) sur la grille de rendu, et la rend dans
 * le même repère normalisé — c'est l'arrondi INTÉRIEUR de la loi ci-dessus. L'arrondi
 * extérieur, celui qui tombe sur un pixel entier, appartient au dispositif d'affichage :
 * l'appareil arrondit à SES pixels, le navigateur aux siens, et les intercaler ici
 * ferait dépendre le dessin de la taille à laquelle on le regarde.
 */
export function snapToRenderGrid(value: number, divisions: number): number {
  if (!Number.isFinite(value) || divisions <= 0) return value
  return (Math.round((value * divisions) / SCALE) * SCALE) / divisions
}

/** Les quatre bords d'un widget, aimantés sur la grille de rendu de la page. */
export function snapBox<T extends { x1: number; y1: number; x2: number; y2: number }>(box: T, aspectRatio: number): T {
  const grid = renderGrid(aspectRatio)
  return {
    ...box,
    x1: snapToRenderGrid(box.x1, grid.x),
    x2: snapToRenderGrid(box.x2, grid.x),
    y1: snapToRenderGrid(box.y1, grid.y),
    y2: snapToRenderGrid(box.y2, grid.y)
  }
}

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

/**
 * Opacité du calque de fond, déduite de `_bg`.
 *
 * **`_bg` est une TRANSPARENCE, pas une opacité** — le réglage s'appelle « Transparence
 * d'arrière-plan : n % » dans XCTrack (`docs/reference/edition-native.md`, table des huit
 * clés universelles), et `captures-air3/vol-thermalassistant-boutonsnavig.png` le montre
 * sur une page posée sur une carte : `_bg: 100` ne peint **aucun** fond (le « 0:00 » de
 * `WAirTime` y flotte à même la carte), `_bg: 40` laisse la carte transparaître, `_bg: 0`
 * donne des **cases blanches opaques** (les deux `WButtonNavig` du bas). L'opacité est
 * donc `1 - _bg / 100`, et non `_bg / 100` comme ce module l'a longtemps calculé.
 *
 * Les valeurs hors 0–100 sont ramenées dans l'intervalle : aucun fichier du corpus n'en
 * porte, mais un fichier étranger n'a pas à produire une opacité que le CSS écrêterait
 * en silence.
 */
export function backgroundOpacity(transparency: number): number {
  if (!Number.isFinite(transparency)) return 1
  return Math.min(1, Math.max(0, 1 - transparency / 100))
}

/**
 * Les coordonnées sont normalisées : un centième de leur valeur donne un pourcentage.
 *
 * Les quatre bords passent d'abord par la **grille de rendu** (`snapBox`) — c'est ce que
 * fait XCTrack avant de tracer, et l'ignorer décalait le dessin de 12,5 px sur la
 * configuration du propriétaire. D'où le paramètre `aspectRatio` : la grille n'est pas la
 * même selon que la page est en paysage ou en portrait.
 */
export function widgetStyle(box: Box, aspectRatio: number): WidgetStyle {
  const snapped = snapBox(box, aspectRatio)
  const pct = (v: number): string => `${v / (SCALE / 100)}%`
  return {
    left: pct(snapped.x1),
    top: pct(snapped.y1),
    width: pct(snapped.x2 - snapped.x1),
    height: pct(snapped.y2 - snapped.y1),
    backgroundOpacity: backgroundOpacity(box.background)
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
  const snapped = snapBox(box, aspectRatio)
  const height = snapped.y2 - snapped.y1
  return (height / SCALE) * (REFERENCE_WIDTH / aspectRatio)
}

/**
 * Largeur du widget dans le même repère que `widgetHeightPx` — voir son commentaire.
 *
 * Aimantée sur la grille de rendu comme la hauteur : ces deux nombres servent à borner
 * le texte par la place réellement disponible (`--xc-value-fit`, `--xc-title-em`,
 * style.css), et la place réellement disponible est celle du widget DESSINÉ, pas celle
 * de ses coordonnées brutes. Une cellule de 2500 unités fait 320 px en brut et 326 en
 * dessiné : juger le texte sur 320 le réduirait sans nécessité.
 */
export function widgetWidthPx(box: Box, aspectRatio: number): number {
  const snapped = snapBox(box, aspectRatio)
  return ((snapped.x2 - snapped.x1) / SCALE) * REFERENCE_WIDTH
}

/** Petit côté de la page dans le repère de référence — voir `TITLE_SIZE_RATIO`. */
export function pageShortSidePx(aspectRatio: number): number {
  if (aspectRatio <= 0) return 0
  return Math.min(REFERENCE_WIDTH, REFERENCE_WIDTH / aspectRatio)
}

/**
 * Taille de police des titres de widget, en pixels du repère de référence.
 *
 * **Correction (comparaison à `2026-08-21_polices-reference.png`)** : elle ne dépend PAS
 * de la hauteur du widget. Le rendu précédent la dérivait de `--xc-h`, ce qui donnait un
 * titre correct sur les widgets plats (124 px de haut) mais 40 à 60 % trop gros sur les
 * autres — d'où « Vitesse verticale / 2s » tronqué en « Vitesse vertic… » alors que
 * l'appareil le fait tenir en entier. Sur l'appareil, dix-sept titres mesurés sur deux
 * captures et des widgets hauts de 75 à 199 px partagent tous la même hauteur de casse.
 *
 * Elle dépend en revanche de la taille de la page (un même fichier se dessine en
 * vignette comme en plein écran) et du réglage `Display.WidgetTitleSize` du fichier —
 * les deux facteurs de `TITLE_SIZE_RATIO`.
 */
export function titleFontPx(aspectRatio: number, titleSizePercent: number): number {
  return pageShortSidePx(aspectRatio) * TITLE_SIZE_RATIO * (titleSizePercent / 100)
}

/**
 * Émet les widgets dans l'ordre du tableau : c'est l'ordre de dessin de XCTrack. Le
 * premier est au fond, le dernier au-dessus. L'empilement naturel du DOM suffit — aucun
 * z-index n'est nécessaire.
 *
 * ## Les deux langues du rendu — ce qui suit le fichier, ce qui suit le pilote
 *
 * Le dessin **imite l'écran d'un instrument**. Tout ce qu'il peint suit donc l'axe
 * `labels`, c'est-à-dire `language` : déjà résolue en code concret par l'appelant
 * (`resolveLanguage` dans `src/model/preferences.ts`, avec `navigator.language` côté
 * `src/ui/` quand le fichier ne précise rien), ce module ne fait que la relayer jusqu'aux
 * dessins de widgets. Trois familles de textes en relèvent, et **aucune ne se traduit par
 * le catalogue** :
 *
 * 1. **ce qui vient du fichier** — un `titletext` écrit par le pilote, le `text` d'un
 *    `WFreeText`, l'adresse d'un `WWebView`, le `title`/`name` d'un lanceur ;
 * 2. **ce que XCTrack écrit lui-même** — les noms de gadgets du catalogue de l'APK
 *    (`readableName`), les suffixes de titre (« / 2s », `TAS`, `GS`, `AGL`), « Monter le
 *    son », « DÉCOLLAGE », les libellés de la fiche de manche, la virgule décimale
 *    (`locale.ts`). Les traduire donnerait au pilote un mot qu'il ne trouvera **nulle
 *    part** sur son appareil ;
 * 3. **les valeurs d'exemple** — l'heure, le pourcentage de batterie, l'échelle de la
 *    carte, les noms de zones : ce sont des données fictives, pas de la prose.
 *
 * `tr` est l'autre axe, `ui` : **notre** prose, dans la langue que le pilote a choisie. Le
 * rendu n'ajoute au dessin de l'appareil que deux étiquettes de survol, et ce sont les
 * seules choses que `tr` traduit ici :
 *
 * - l'action d'un bouton (`widgets/buttons.ts`) — elle existe parce que deux boutons
 *   d'actions opposées portent parfois le même pictogramme ;
 * - la bande réservée aux messages (`widgets/liveMessage.ts`).
 *
 * Jusqu'au 2026-08-22, ces deux-là vivaient dans deux tables figées à `fr`/`en` et
 * suivaient l'axe `labels` : un pilote allemand, néerlandais ou espagnol lisait l'anglais,
 * et le seul secours prévu pour distinguer deux boutons identiques ne lui parlait pas.
 *
 * ⚠️ **Distinguer avant de corriger.** Un texte anglais dans `src/render/` n'est pas
 * forcément un oubli : si l'appareil l'écrit en anglais, le laisser tel quel est la
 * consigne. Voir `src/i18n/axes.ts`.
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
export function renderPage(
  page: Page, aspectRatio: number, settings: RenderSettings, language: string, tr: Translator
): SVGSVGElement {
  const canvas = document.createElement('div')
  canvas.className = 'xc-page'
  // Deux mesures valables pour toute la page, héritées par tous les widgets : la taille
  // de police des titres (`titleFontPx`, constante sur l'appareil) et le petit côté de
  // la page, dont la barre d'état tire sa propre taille de texte (statusLine.ts).
  canvas.style.setProperty('--xc-title', String(titleFontPx(aspectRatio, settings.titleSizePercent)))
  canvas.style.setProperty('--xc-page-min', String(pageShortSidePx(aspectRatio)))

  for (const widget of page.widgets) {
    const style = widgetStyle(widget, aspectRatio)
    // Aucun type n'est traité à part ici : le fond suit `_bg`, le cadre suit `_border`,
    // pour tous. Le cas particulier qui neutralisait les deux sur `WLiveMessage` et
    // `WButtonBrightness` était un pansement sur l'inversion de `_bg` — voir le
    // commentaire de `registerBlankAtRest` dans registry.ts.
    const element = document.createElement('div')
    element.className = 'xc-widget'
    element.style.left = style.left
    element.style.top = style.top
    element.style.width = style.width
    element.style.height = style.height
    element.style.setProperty('--xc-bg-opacity', String(style.backgroundOpacity))
    // Voir `widgetHeightPx` : donne au CSS la hauteur de CE widget, dans le même
    // repère que le `viewBox` du wrapper — hérité jusqu'à `.xc-num` (numeric.ts).
    element.style.setProperty('--xc-h', String(widgetHeightPx(widget, aspectRatio)))
    // La largeur sert le garde-fou du titre (`.xc-num__title`, style.css) : réduire le
    // titre uniquement s'il ne tenait pas, au lieu de le tronquer.
    element.style.setProperty('--xc-w', String(widgetWidthPx(widget, aspectRatio)))
    if (widget.border) element.classList.add('xc-widget--border')

    // Le fond est un calque séparé : appliquer l'opacité au widget entier effacerait
    // aussi son texte, alors que _bg ne concerne que le fond — sur l'appareil, le
    // « 0:00 » d'un WAirTime à _bg: 100 reste parfaitement noir sur la carte.
    const background = document.createElement('div')
    background.className = 'xc-widget__bg'

    const content = document.createElement('div')
    content.className = 'xc-widget__content'
    content.append(drawWidget(widget, settings, language, tr))

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
