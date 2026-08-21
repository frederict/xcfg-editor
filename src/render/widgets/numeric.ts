import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { widgetBoolean, widgetString } from '../defaults'
import { formatDecimal } from '../locale'
import { widgetTitle } from '../title'
import { UNIT_FONT_WEIGHT, VALUE_FONT_WEIGHT, measuredWidthEm, titleWidthEm, valueWidthEm } from '../textMetrics'

/**
 * Grandeur mesurée par un widget numérique. Détermine quelle préférence d'unité du
 * fichier s'applique (`altitude`, `speed`, `verticalSpeed`, `windSpeed`, `distance`) ;
 * les autres grandeurs n'ont pas de préférence dédiée et gardent l'unité fixe du type.
 *
 * `windSpeed` est distincte de `speed` : XCTrack a une préférence `Unit.WindSpeed`
 * séparée de `Unit.Speed`, et rien ne garantit qu'un pilote règle les deux pareil.
 * `distance` n'a en pratique qu'une seule préférence identifiable dans le corpus
 * (`Unit.Distance` ; `Unit.CompetitionDistance` vaut la même valeur sur le seul fichier
 * disponible, la distinction n'est donc pas tranchable ici — voir `distanceUnit`).
 */
type Quantity = 'altitude' | 'speed' | 'verticalSpeed' | 'windSpeed' | 'duration' | 'time' | 'distance' | 'glide' | 'none'

interface NumericSpec {
  quantity: Quantity
  /** Unité fixe, utilisée quand la grandeur n'a pas de préférence associée. */
  unit: string
  /** Valeur d'exemple statique — juge la mise en page, ne simule rien. */
  example: string
}

/**
 * Relevé sur le corpus (`Exemples/2026-08-20_backup-00.xcfg` et `Exemples/pages.xcfg`) :
 * les 23 types partagent la structure titre/valeur/unité. `WFL`, `WGlide` et les
 * finesses n'ont pas d'unité de préférence — une unité fixe leur suffit. `WNextTurnpoint`
 * affiche un nom de balise, pas une valeur numérique à unité. Le champ `unit` des
 * grandeurs `altitude`/`speed`/`verticalSpeed`/`windSpeed`/`distance` n'est qu'indicatif :
 * `resolveUnit` retient la préférence correspondante et ignore ce champ pour elles.
 */
const SPECS: Record<string, NumericSpec> = {
  WAltitude: { quantity: 'altitude', unit: 'm', example: '1234' },
  WAltitudeAboveGround: { quantity: 'altitude', unit: 'm', example: '850' },
  WFL: { quantity: 'none', unit: 'FL', example: '045' },
  WSpeed: { quantity: 'speed', unit: 'km/h', example: '38' },
  WVerticalSpeed: { quantity: 'verticalSpeed', unit: 'm/s', example: '+2.1' },
  WGlide: { quantity: 'glide', unit: '', example: '8.3' },
  WAirTime: { quantity: 'duration', unit: '', example: '2:47' },
  WTime: { quantity: 'time', unit: '', example: '14:32' },
  WWindSpeed: { quantity: 'windSpeed', unit: 'km/h', example: '18' },
  WThermalAltGain: { quantity: 'altitude', unit: 'm', example: '320' },
  WNextTurnpoint: { quantity: 'none', unit: '', example: 'P3' },
  WNextTurnpointAlt: { quantity: 'altitude', unit: 'm', example: '1800' },
  WNextTurnpointDistance: { quantity: 'distance', unit: 'km', example: '12.4' },
  WNextTurnpointGlideTo: { quantity: 'glide', unit: '', example: '6.2' },
  WNextTurnpointTimeOfArrival: { quantity: 'time', unit: '', example: '15:47' },
  WCompDistanceToGoal: { quantity: 'distance', unit: 'km', example: '24.8' },
  WCompAltitudeOverGoal: { quantity: 'altitude', unit: 'm', example: '450' },
  WCompGlideToGoal: { quantity: 'glide', unit: '', example: '5.1' },
  WCompTimeToStart: { quantity: 'duration', unit: '', example: '0:32' },
  WCompTimeAtStart: { quantity: 'time', unit: '', example: '13:00' },
  WCompSpeedToStart: { quantity: 'speed', unit: 'km/h', example: '42' },
  WOptiResult: { quantity: 'distance', unit: 'km', example: '87.3' },
  WOptiUnfinishedTriangle: { quantity: 'distance', unit: 'km', example: '45.2' }
}

const FALLBACK_SPEC: NumericSpec = { quantity: 'none', unit: '', example: '--' }

/**
 * `_units` ne vaut jamais que `"SYS_UNIT"` sur les 278 occurrences du corpus — un jeton
 * signifiant « unité du système », pas une unité concrète à afficher telle quelle.
 * L'afficher littéralement produirait « SYS_UNIT » à côté de la quasi-totalité des
 * widgets d'altitude et de vitesse du corpus. On ne l'applique donc comme forçage que
 * s'il diffère de ce jeton — ce qu'aucun fichier connu ne fait à ce jour.
 */
function resolveUnit(widget: Widget, settings: RenderSettings, spec: NumericSpec): string {
  const forced = widgetString(widget, '_units')
  if (forced !== undefined && forced !== 'SYS_UNIT') return forced

  switch (spec.quantity) {
    case 'altitude': return settings.altitudeUnit
    case 'speed': return settings.speedUnit
    case 'verticalSpeed': return settings.verticalSpeedUnit
    case 'windSpeed': return settings.windSpeedUnit
    case 'distance': return settings.distanceUnit
    default: return spec.unit
  }
}

/**
 * Grandeurs pour lesquelles XCTrack colore la valeur selon le signe de la mesure —
 * observé sur `WVerticalSpeed` (vario) et `WThermalAltGain` (gain dans le thermique)
 * uniquement. Une altitude ou une heure ordinaires ne se colorent pas (rendu-observe.md,
 * confirmé en vol par rendu-en-vol.md § 1).
 */
const SIGN_COLORED_TYPES = new Set(['WVerticalSpeed', 'WThermalAltGain'])

/**
 * Défaut 1 (rapport de tâche) — le dimensionnement par hauteur seule (`--xc-h`,
 * style.css) ignore la largeur du widget : constaté en rendant `landscape[3]` de
 * `2026-08-20_backup-00.xcfg` à 640px, où « 1234 » s'affichait coupé en « 234 » (les
 * deux côtés débordent, `.xc-widget` centre et masque — `overflow: hidden`), le « m »
 * de « 320 » disparaissait (`WThermalAltGain`) alors que « 38 km/h » (`WSpeed`, même
 * largeur normalisée, moins de caractères) tenait très bien.
 *
 * **L'appareil fait la même chose, et c'est maintenant mesuré** (textMetrics.ts) : sur
 * `ecran-landscape3-17widgets.png`, `WAltitude` (« 99 m ») et `WSpeed` (« 0 km/h »)
 * occupent deux widgets de taille identique (187 × 148 et 187 × 149 px) — la vitesse
 * s'affiche en chiffres de 73 px de haut, l'altitude en chiffres de 66 px, soit 10 % de
 * moins pour un contenu plus large. XCTrack réduit donc bien la valeur au contenu, et
 * pas seulement à la place verticale. C'est aussi pourquoi la comparaison de notre rendu
 * à une capture n'a de sens qu'à contenu égal : notre « 1234 m » d'exemple ne se
 * dimensionne pas comme le « 19 m » affiché ce jour-là par l'appareil.
 *
 * Une police mesurée au pixel près (`canvas.measureText`) supposerait une police
 * effectivement chargée par le navigateur cible, invérifiable sans lui. Ce module
 * publie donc l'**encombrement estimé du contenu**, et laisse `style.css` le confronter
 * à la place réellement disponible.
 *
 * ## Ce qui a changé, et pourquoi (revue des 75 widgets, écart 1.1)
 *
 * L'ancienne règle comparait le contenu à un « budget de largeur »
 * `WIDTH_BUDGET × shape`, où `shape` était le rapport largeur/hauteur du widget **en
 * coordonnées normalisées** et `WIDTH_BUDGET = 2,1` la constante `(16/9) / 0,85` :
 * autrement dit elle **supposait une page 16/9 et une police de valeur à 0,85 × la
 * hauteur**. Les deux suppositions sont fausses hors du cas de calibrage :
 *
 * - une page qui n'a pas le rapport 16/9 (portrait, ou simplement rendue plus étroite
 *   que haute) garde le même `shape` alors que ses cellules rétrécissent réellement —
 *   le budget ne bougeait pas et la valeur était **tranchée** par `overflow: hidden` ;
 * - la police de la valeur ne vaut 0,85 × la hauteur que pour un titre à 100 %. À
 *   `Display.WidgetTitleSize = 140` — le réglage de l'appareil mesuré — le bandeau de
 *   titre prend plus de place, la valeur descend à 0,80 × la hauteur, et le budget
 *   devenait **trop sévère** : la valeur était réduite sans nécessité.
 *
 * Mesuré sur la page 1 de la planche, hauteur constante 720 px, en resserrant la page :
 * cellule 320 × 224 (rapport 1,43) 0 px d'encre sur les bords, 288 × 224 (1,29)
 * **137 px**, 262 × 224 (1,17) **246 px**, 180 × 224 (0,80) **487 px**. L'appareil, lui,
 * ne coupe jamais : sur `vol-thermalassistant-boutonsnavig.png`, cellule 172 × 148
 * (rapport 1,16), « Altitude GPS 1400 m » occupe 165 × 45 px, marges 3 et 4 px.
 *
 * ## La règle retenue : la géométrie exacte, en CSS
 *
 * `--xc-w` et `--xc-h` (posées par `canvas.ts`) donnent la largeur et la hauteur réelles
 * du widget dans le repère de rendu, et `--xc-value-size` la taille de police de la
 * valeur — les trois dans la même unité. La place occupée par le contenu est donc
 * calculable **sans supposer ni le rapport de la page ni la taille du titre** :
 *
 * > `largeur occupée = --xc-value-em × --xc-value-size + --xc-unit-h × --xc-h`
 *
 * et `--xc-value-fit` (style.css) n'est plus que le quotient de `--xc-w` par cette
 * somme, borné à 1. Ce module ne publie plus que les deux encombrements :
 *
 * - **`--xc-value-em`** : la largeur de la valeur en cadratins de sa PROPRE police
 *   (`valueWidthEm`, textMetrics.ts) ;
 * - **`--xc-unit-h`** : la largeur de l'unité, gap compris, en fraction de la HAUTEUR du
 *   widget — parce que l'unité se dimensionne sur la hauteur et non sur la valeur, ce
 *   qui est mesuré (voir `.xc-num__unit` dans style.css).
 *
 * Les deux constantes de conversion de l'ancienne règle (`UNIT_TO_VALUE = 0,55`,
 * `FRACTION_TO_VALUE = 0,34`) disparaissent : elles n'étaient que ce même rapport
 * hauteur/valeur figé à la géométrie de calibrage (0,41 / 0,85 ≈ 0,48 et
 * 0,254 / 0,85 ≈ 0,30, relevés à 0,55 et 0,34 avec la marge de sécurité). Le calcul les
 * retrouve désormais à chaque géométrie au lieu de les postuler.
 */

/**
 * Taille de police de l'unité simple, en fraction de la hauteur du widget — **doit
 * rester cohérente avec `.xc-num__unit` (style.css)**, d'où elle est reprise. Mesurée
 * sur `2026-08-21_polices-reference.png` : 0,412 / 0,407 / 0,425 sur les trois widgets à
 * unité simple.
 */
const UNIT_SIZE_RATIO = 0.41

/**
 * Écart entre la valeur et l'unité, en fraction de la hauteur du widget : `gap: 0.15em`
 * sur `.xc-num__row`, dont le `1em` vaut `0,17 × --xc-h` (`.xc-num`, style.css).
 * 0,15 × 0,17 = 0,0255.
 */
const UNIT_GAP_H = 0.0255

/**
 * Marge intérieure du numérateur et du dénominateur d'une fraction d'unité :
 * `padding: 0 0.15em` de chaque côté sur chacune des deux lignes (style.css), soit
 * 0,3 cadratin de la police de la fraction.
 */
const FRACTION_PADDING_EM = 0.3

/**
 * Facteur de taille de la fraction d'unité, en fraction de la hauteur du widget — doit
 * rester cohérent avec `.xc-num__unit--fraction` (style.css).
 *
 * **Deux valeurs, et c'est une observation, pas un raffinement gratuit** : sur des
 * widgets de hauteur identique (199 px), `km/h` se dessine à 51 px de police et `m/s` à
 * 75 px, soit 1,41 fois plus gros. Le rapport est exactement celui de la hampe à la
 * hauteur d'x de Roboto (0,747 / 0,528) : XCTrack ajuste la fraction sur l'encombrement
 * RÉEL des deux lignes, et `m`/`s`, sans hampe ni jambage, doivent grossir pour occuper
 * la même place que `km`/`h`. On reproduit ce choix plutôt que d'en faire une moyenne
 * qui serait fausse dans les deux cas.
 */
const FRACTION_SIZE_TALL = 0.254
const FRACTION_SIZE_SHORT = 0.36

/** Caractères qui montent (hampe, capitale, chiffre) ou descendent sous la ligne. */
const TALL_CHARACTERS = /[A-Z0-9bdfhijklt()/]/

function fractionSizeRatio(unitText: string): number {
  return TALL_CHARACTERS.test(unitText.replace('/', '')) ? FRACTION_SIZE_TALL : FRACTION_SIZE_SHORT
}

/**
 * Largeur d'une unité affichée, **gap compris**, en fraction de la hauteur du widget —
 * l'unité de `--xc-unit-h`. Zéro quand il n'y a pas d'unité : `gap` ne s'applique qu'entre
 * deux éléments, et une ligne qui n'en porte qu'un n'en réserve aucun.
 *
 * Une unité composée (`km/h`) prend beaucoup moins de place qu'une unité simple : elle
 * s'empile en fraction (numérateur, filet, dénominateur) au lieu de s'étaler, et seul le
 * plus long des deux segments compte.
 */
export function unitWidthH(unitText: string | undefined): number {
  if (unitText === undefined || unitText.length === 0) return 0

  const slash = unitText.indexOf('/')
  if (slash === -1) return UNIT_GAP_H + unitEm(unitText) * UNIT_SIZE_RATIO

  const numerator = unitEm(unitText.slice(0, slash))
  const denominator = unitEm(unitText.slice(slash + 1))
  const segment = Math.max(numerator, denominator) + FRACTION_PADDING_EM
  return UNIT_GAP_H + segment * fractionSizeRatio(unitText)
}

/**
 * Largeur d'un texte, en cadratins : **mesurée** dans la police du navigateur quand
 * c'est possible, estimée sinon (`measuredWidthEm`, textMetrics.ts). Deux graisses,
 * parce que la valeur est semi-grasse et l'unité ordinaire (`.xc-num__value` et
 * `.xc-num__unit`, style.css) — et une graisse change les avances.
 */
function valueEm(text: string): number {
  return measuredWidthEm(text, VALUE_FONT_WEIGHT) ?? valueWidthEm(text)
}

function unitEm(text: string): number {
  return measuredWidthEm(text, UNIT_FONT_WEIGHT) ?? valueWidthEm(text)
}

/**
 * Compose une unité simple (`m`, `FL`) sur une ligne ; une unité composée (contenant
 * `/`) en fraction empilée — numérateur, filet, dénominateur — comme XCTrack le fait
 * pour `km/h` et `m/s` (rendu-observe.md).
 */
function buildUnit(unitText: string): HTMLElement {
  const unit = document.createElement('span')
  unit.className = 'xc-num__unit'

  const slash = unitText.indexOf('/')
  if (slash === -1) {
    unit.textContent = unitText
    return unit
  }

  unit.classList.add('xc-num__unit--fraction')
  // Voir `fractionSizeRatio` : `km/h` et `m/s` ne se dessinent pas à la même taille sur
  // l'appareil, et l'écart n'est pas un hasard de rendu — il vaut exactement le rapport
  // hampe / hauteur d'x de la police.
  unit.style.setProperty('--xc-unit-fraction', String(fractionSizeRatio(unitText)))
  const numerator = document.createElement('span')
  numerator.className = 'xc-num__unit-num'
  numerator.textContent = unitText.slice(0, slash)
  const denominator = document.createElement('span')
  denominator.className = 'xc-num__unit-den'
  denominator.textContent = unitText.slice(slash + 1)
  unit.append(numerator, denominator)
  return unit
}

/**
 * Les valeurs estimées s'écrivent **entre crochets** — `[37] m`, `[∞]`, `[-27] m`,
 * `[11] km/h` — quand la clé `use_brackets` vaut `true`, ce qui est le **défaut** des six
 * widgets de navigation qui la portent (`docs/reference/planche-widgets-air3.md` § 4,
 * et la capture `2026-08-21_planche-sol-3-air-b-xcontest-navigation-a.png`).
 *
 * Deux détails mesurés sur cette capture, et reproduits ici :
 * - **l'unité reste dehors** : `[37]` puis `m` en gris, jamais `[37 m]` ;
 * - **le signe reste dedans** : `[-27]`, et la pastille de couleur couvre les crochets
 *   avec le nombre.
 *
 * Ce n'est pas un ornement : deux crochets ajoutent 0,67 cadratin à la valeur, que le
 * budget de largeur (`--xc-value-fit`, style.css) répercute aussitôt en réduction — c'est précisément
 * l'effet que le pilote doit voir avant d'emporter sa page en vol.
 */
function bracketed(widget: Widget, valueText: string): string {
  return widgetBoolean(widget, 'use_brackets') === true ? `[${valueText}]` : valueText
}

/**
 * **La finesse s'écrit en RAPPORT, et dans ce sens-là** : l'appareil écrit « `1:6,0` », et
 * « `1:` » tout court quand elle est infinie. Nous écrivions « `8,3` » avec « `:1` » en
 * unité grise à droite — le rapport à l'envers, c'est-à-dire une information **fausse**
 * et non un dessin approximatif : `1:8,3` et `8,3:1` ne désignent pas la même chose.
 *
 * Établi sur trois relevés indépendants, tous en lecture directe des captures :
 *
 * - `captures-air3/2026-08-21_planche-competition-4-widgets-de-manche.png` — les deux
 *   cellules « finesse au but » et « Finesse pour l'ESS » portent un « **1:** » en gros
 *   chiffres noirs, **sans unité à droite** ;
 * - `captures-air3/vol-thermalassistant-boutonsnavig.png` — « Finesse Pt suivant »,
 *   même « `1:` » ;
 * - `docs/reference/planche-widgets-air3.md` § 4 et § 6, qui relèvent « `1:6,0` » sur
 *   `WGlide` en vol.
 *
 * **Ce qui n'est PAS repris, et pourquoi.** Une quatrième mesure
 * (`2026-08-21-validation-bout-en-bout.md` § 4.4) note que l'appareil écrit « `1:1,5` »
 * quand la finesse est faible mais « **65** » tout court quand elle est forte, sur des
 * gadgets aux réglages identiques — le seuil de bascule n'a pas été établi. Le reproduire
 * demanderait de deviner ce seuil, donc de choisir une valeur d'exemple qui affirmerait
 * un comportement non mesuré. Nos exemples restent dans le domaine où le rapport est
 * écrit, le seul dont on connaisse la forme.
 *
 * L'unité disparaît avec l'inversion : le « `:1` » n'était que la moitié droite du
 * rapport, et le rapport est maintenant entier dans la valeur. Les quatre types
 * concernés — `WGlide`, `WNextTurnpointGlideTo`, `WCompGlideToGoal`,
 * `WCompGlideToESS` — portent pourtant `_unit: true` dans le relevé des défauts : sur
 * l'appareil comme ici, ce booléen n'invente pas une unité à un widget qui n'en a pas.
 */
function glideRatio(example: string, language: string): string {
  return `1:${formatDecimal(example, language)}`
}

/**
 * Débordement du cerne noir de la valeur colorée, en cadratins de sa police —
 * `-webkit-text-stroke: 0.07em` déborde de 0,035 em de chaque côté du glyphe, et le
 * `text-shadow` de repli de 0,05 em (`.xc-num__row--positive`, style.css). Il n'entre pas
 * dans la boîte du texte, donc pas dans `measuredWidthEm` : sans lui, le cerne d'un vario
 * positif mordait le filet de la cellule (mesuré : 14 px d'encre sur le bord gauche de
 * `WVerticalSpeed` et de `WThermalAltGain`, page 2 de la planche à 1280 × 720).
 */
const VALUE_STROKE_EM = 0.1

/**
 * Classe de couleur de fond pour la zone de valeur, selon le signe de l'exemple
 * statique — nos valeurs ne simulent rien, donc c'est le seul signe disponible.
 * Restreinte à `SIGN_COLORED_TYPES` : une distance ou une heure ne se colorent jamais,
 * même si leur exemple s'écrivait avec un signe.
 */
function rowSignClass(shortName: string, example: string): string | undefined {
  if (!SIGN_COLORED_TYPES.has(shortName)) return undefined
  const value = Number(example)
  if (!Number.isFinite(value) || value === 0) return undefined
  return value > 0 ? 'xc-num__row--positive' : 'xc-num__row--negative'
}

/**
 * `_title` et `_unit` ABSENTS valent `true`, pas `false` — et c'est mesuré, pas déduit.
 *
 * **Ces deux constantes ne sont plus le chemin normal** : `widgetBoolean` (`defaults.ts`)
 * va chercher la valeur dans le relevé des 75 widgets, type par type, ce qui vaut aussi
 * pour les clés que ce module ne connaît pas. Elles ne servent plus que de dernier
 * recours, pour un type absent du relevé — un type apparu après lui, donc, et dont on
 * n'a que la convention générale des widgets numériques.
 *
 * La planche des 75 widgets (`docs/reference/planche-widgets-air3.md` § 3) a été écrite
 * avec les 8 clés universelles SEULEMENT ; XCTrack l'a relue en complétant le reste, et
 * le ré-export donne `{"_title": true, "_unit": true, …}` sur les 23 types dessinés ici.
 * La capture correspondante le confirme à l'écran
 * (`captures-air3/2026-08-21_planche-sol-1-systeme-et-vol-a.png`) : les douze cellules
 * portent leur titre rouge ET leur unité grise, alors qu'aucune ne les déclare.
 *
 * Ce que corrigent ces deux défauts, mesuré sur cette page (cellules de 320 × 224 px) :
 * l'ancien `=== true` laissait 5 des 12 cellules sans titre ni unité, et la valeur, ne
 * trouvant plus de bandeau de titre à réserver (`.xc-num--no-title`, style.css), montait
 * de 55 % à 64 % de la hauteur de cellule et débordait sur ses voisines. C'est
 * exactement l'écart 1.1 du même document.
 */
const TITLE_BY_DEFAULT = true
const UNIT_BY_DEFAULT = true

/**
 * Dessin partagé par les 23 types « titre + valeur + unité » du corpus. `_unit` est un
 * booléen d'affichage (toujours `true` quand il est écrit dans le corpus) et non une
 * unité — le confondre afficherait le mot « true » à côté de la valeur.
 */
export function drawNumeric(widget: Widget, settings: RenderSettings, language: string): HTMLElement {
  const spec = SPECS[widget.shortName] ?? FALLBACK_SPEC
  const hasTitle = widgetBoolean(widget, '_title') ?? TITLE_BY_DEFAULT
  const hasUnit = widgetBoolean(widget, '_unit') ?? UNIT_BY_DEFAULT
  const unitText = hasUnit ? resolveUnit(widget, settings, spec) : undefined
  const valueText = bracketed(
    widget,
    spec.quantity === 'glide' ? glideRatio(spec.example, language) : formatDecimal(spec.example, language)
  )

  const element = document.createElement('div')
  element.className = 'xc-num'

  if (hasTitle) {
    const title = document.createElement('span')
    title.className = 'xc-num__title'
    title.style.color = settings.titleColor
    const text = widgetTitle(widget, language)
    // La taille elle-même vient de `--xc-title` (canvas.ts) : elle est la même pour tous
    // les widgets de la page, comme sur l'appareil. Ne reste ici qu'un garde-fou —
    // la largeur estimée du libellé, en cadratins, que `.xc-num__title` (style.css)
    // compare à la largeur du widget pour ne réduire QUE ce qui ne tiendrait pas.
    // L'ancienne règle réduisait tous les widgets étroits, y compris ceux où l'appareil
    // n'y touche pas (« Altitude GPS » tient sans réduction dans 187 px).
    title.style.setProperty('--xc-title-em', String(titleWidthEm(text)))
    title.textContent = text
    element.append(title)
  } else {
    // Sans titre à loger au-dessus, la valeur reçoit toute la hauteur du widget —
    // voir `.xc-num--no-title` dans style.css.
    element.classList.add('xc-num--no-title')
  }

  // La valeur et l'unité partagent une même zone : c'est elle, et non tout le widget,
  // que XCTrack colore selon le signe (rendu-observe.md, rendu-en-vol.md § 1).
  const row = document.createElement('div')
  row.className = 'xc-num__row'
  const colorClass = rowSignClass(widget.shortName, spec.example)
  if (colorClass !== undefined) row.classList.add(colorClass)

  // Défaut 1 (rapport de tâche) — la taille de la valeur vient de style.css (place
  // restante sous le titre) ; ces deux encombrements lui permettent de la borner par la
  // largeur RÉELLE du widget, comme le fait l'appareil. Voir le commentaire de tête de
  // `unitWidthH` plus haut pour pourquoi ils ne sont pas dans la même unité.
  // Le cerne de la valeur colorée déborde de sa boîte : il compte dans la place occupée
  // (voir `VALUE_STROKE_EM`).
  const strokeEm = colorClass === undefined ? 0 : VALUE_STROKE_EM
  element.style.setProperty('--xc-value-em', String(valueEm(valueText) + strokeEm))
  element.style.setProperty('--xc-unit-h', String(unitWidthH(unitText)))

  const value = document.createElement('span')
  value.className = 'xc-num__value'
  value.textContent = valueText
  row.append(value)

  // `length > 0` et non `!== undefined` : une heure, une durée ou un nom de balise
  // n'ont PAS d'unité (`unit: ''` dans SPECS). Poser quand même un `<span>` vide y
  // ajoutait le `gap` de `.xc-num__row` — 0,15 em de la police de `.xc-num`, soit 5,7 px
  // sur une cellule de 224 px — que rien ne comptait dans la largeur occupée, et qui
  // décalait la valeur de la moitié de cette valeur vers la gauche du centre. Mesuré sur
  // la planche : la ligne de `WTime` faisait 13,5 unités de plus que son propre texte.
  if (unitText !== undefined && unitText.length > 0) {
    // L'unité suit la même réduction de largeur que la valeur (`--xc-value-fit`, calculée
    // par `.xc-num` dans style.css) : sans cela, une unité restée à sa taille pleine
    // déborderait à son tour dès que la valeur elle-même a dû rétrécir.
    row.append(buildUnit(unitText))
  }

  element.append(row)
  return element
}
