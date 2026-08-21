import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { widgetBoolean, widgetString } from '../defaults'
import { formatDecimal } from '../locale'
import { widgetTitle } from '../title'
import { titleWidthEm, valueWidthEm } from '../textMetrics'

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
  WGlide: { quantity: 'glide', unit: ':1', example: '8.3' },
  WAirTime: { quantity: 'duration', unit: '', example: '2:47' },
  WTime: { quantity: 'time', unit: '', example: '14:32' },
  WWindSpeed: { quantity: 'windSpeed', unit: 'km/h', example: '18' },
  WThermalAltGain: { quantity: 'altitude', unit: 'm', example: '320' },
  WNextTurnpoint: { quantity: 'none', unit: '', example: 'P3' },
  WNextTurnpointAlt: { quantity: 'altitude', unit: 'm', example: '1800' },
  WNextTurnpointDistance: { quantity: 'distance', unit: 'km', example: '12.4' },
  WNextTurnpointGlideTo: { quantity: 'glide', unit: ':1', example: '6.2' },
  WNextTurnpointTimeOfArrival: { quantity: 'time', unit: '', example: '15:47' },
  WCompDistanceToGoal: { quantity: 'distance', unit: 'km', example: '24.8' },
  WCompAltitudeOverGoal: { quantity: 'altitude', unit: 'm', example: '450' },
  WCompGlideToGoal: { quantity: 'glide', unit: ':1', example: '5.1' },
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
 * effectivement chargée par le navigateur cible, invérifiable sans lui. On estime donc
 * un « budget de largeur », en cadratins de la police de la valeur :
 *
 * - la « forme » du widget (`shape`) est le rapport largeur/hauteur en coordonnées
 *   normalisées (`x2-x1` sur `y2-y1`) — pas un rapport en pixels réels, qui dépendrait
 *   de `aspectRatio` (`canvas.ts`), une donnée que `drawNumeric` ne reçoit pas et qu'il
 *   serait disproportionné de lui faire recevoir pour ce seul besoin. L'approximation
 *   suppose une page de proportions « paysage » comme celle du corpus calibré : à
 *   vérifier si un jour un widget numérique doit se dimensionner sur une page portrait ;
 *   non couvert par les captures disponibles.
 * - `WIDTH_BUDGET` est cette largeur tenable à `shape === 1`, recalibrée sur quatre cas
 *   de l'appareil dont on connaît à la fois le contenu et la réduction appliquée :
 *   `WAltitude` « 99 m » (réduit à 0,88), `WVerticalSpeed` « -0,0 m/s » (0,89),
 *   `WSpeed` « 0 km/h » et `WAirTime` « 0:00 » (pleine taille). Le compromis retenu
 *   réduit un peu moins que l'appareil sur le premier, un peu plus sur le deuxième, et
 *   laisse les deux derniers intacts.
 *
 * **Correction (planche des 75 widgets, écart 1.1)** : 2,4 laissait encore déborder.
 * Le budget se dérive : la largeur réelle disponible vaut `shape × aspectRatio` fois la
 * hauteur du widget, et la police de la valeur vaut environ 0,85 fois cette même hauteur
 * (`--xc-value-size`, style.css). Le budget exact est donc `shape × (16/9) / 0,85`, soit
 * **2,09 × shape** sur une page paysage — pas 2,4. Mesuré sur la page 1 de la planche
 * (cellules 320 × 224 px, `2026-08-21_planche-sol-1-systeme-et-vol-a.png`) : à 2,4,
 * « 14:32 » et « 045 FL » sortaient de leur cellule et mordaient sur la voisine, comme
 * l'écart 1.1 le décrivait ; à 2,1 les douze cellules tiennent, et le fichier du
 * propriétaire (`pages-00.xcfg`, page 1) n'est pas réduit davantage qu'avant sur les
 * quatre cas de calibrage ci-dessus.
 * - une unité simple compte pour sa largeur entière à `UNIT_TO_VALUE` près ; une unité
 *   composée (`km/h`) beaucoup moins, puisqu'elle s'empile en fraction
 *   (numérateur/dénominateur) au lieu de s'étaler horizontalement — seul le plus long
 *   des deux segments compte, à `FRACTION_TO_VALUE` près.
 */
const WIDTH_BUDGET = 2.1
const UNIT_GAP_EM = 0.15 // le gap de `.xc-num__row` (style.css)

/**
 * Plancher de la réduction : une soupape, pas un réglage. Elle empêche un contenu
 * pathologique de réduire la valeur jusqu'à l'illisible ; elle n'a pas à contredire le
 * budget lui-même.
 *
 * **Abaissé de 0,50 à 0,45** en branchant les valeurs par défaut : les crochets de
 * `use_brackets` allongent la valeur de deux caractères, et sur la cellule 320 × 223 de
 * la planche, « [1800] m » demandait 0,4645 — le budget avait raison, le plancher
 * l'écrasait à 0,50 et le « m » sortait de la cellule (19 px d'encre sur le bord droit,
 * mesuré). À 0,45, le budget s'applique et l'encre revient à 300 px dans 320.
 *
 * Ce n'est **pas** la correction de l'écart 1.1 de la revue (le budget de largeur des
 * 40 widgets numériques, qui mérite sa propre passe avec mesure avant/après) : c'est le
 * strict nécessaire pour que le branchement des défauts ne fasse pas déborder une
 * cellule qui ne débordait pas.
 */
const MIN_VALUE_SCALE = 0.45

/**
 * Rapports « taille de l'unité / taille de la valeur » observés sur la page 1 de
 * référence. Ils ne sont pas constants — l'unité suit la hauteur du widget alors que la
 * valeur suit la place restante sous le titre (style.css) — mais ils suffisent à estimer
 * la largeur que l'unité prendra. Mesurés : 0,55 à 0,62 pour une unité simple
 * (`m`, `FL`), 0,30 à 0,33 pour une fraction (`km/h`).
 */
const UNIT_TO_VALUE = 0.55
const FRACTION_TO_VALUE = 0.34

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

/** Largeur, en cadratins de la police de la VALEUR, d'une unité affichée. */
function unitWidthEm(unitText: string): number {
  const slash = unitText.indexOf('/')
  if (slash === -1) return valueWidthEm(unitText) * UNIT_TO_VALUE
  const numerator = valueWidthEm(unitText.slice(0, slash))
  const denominator = valueWidthEm(unitText.slice(slash + 1))
  return Math.max(numerator, denominator) * FRACTION_TO_VALUE
}

/** Contenu total à loger dans la largeur du widget, en cadratins de la valeur. */
function contentWidthEm(valueText: string, unitText: string | undefined): number {
  if (unitText === undefined || unitText.length === 0) return valueWidthEm(valueText)
  return valueWidthEm(valueText) + UNIT_GAP_EM + unitWidthEm(unitText)
}

/**
 * Facteur de réduction appliqué à la valeur ET à son unité quand le contenu ne tiendrait
 * pas dans la largeur du widget — voir le commentaire de `WIDTH_BUDGET` ci-dessus. Vaut
 * 1 quand tout tient, ce qui est le cas courant.
 */
function widthFit(widget: Widget, valueText: string, unitText: string | undefined): number {
  const heightUnits = widget.y2 - widget.y1
  const content = contentWidthEm(valueText, unitText)
  if (heightUnits <= 0 || content <= 0) return 1

  const shape = (widget.x2 - widget.x1) / heightUnits
  const scale = Math.min(1, (WIDTH_BUDGET * shape) / content)
  return Math.max(MIN_VALUE_SCALE, scale)
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
 * budget de largeur (`widthFit`) répercute aussitôt en réduction — c'est précisément
 * l'effet que le pilote doit voir avant d'emporter sa page en vol.
 */
function bracketed(widget: Widget, valueText: string): string {
  return widgetBoolean(widget, 'use_brackets') === true ? `[${valueText}]` : valueText
}

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
  const valueText = bracketed(widget, formatDecimal(spec.example, language))

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
  // restante sous le titre) ; ce facteur la borne par la largeur du widget, comme le
  // fait l'appareil : voir le commentaire de `WIDTH_BUDGET` plus haut.
  element.style.setProperty('--xc-value-fit', String(widthFit(widget, valueText, unitText)))

  const value = document.createElement('span')
  value.className = 'xc-num__value'
  value.textContent = valueText
  row.append(value)

  if (unitText !== undefined) {
    // L'unité suit la même réduction de largeur que la valeur (`--xc-value-fit`, posée
    // sur l'élément parent) : sans cela, une unité restée à sa taille pleine déborderait
    // à son tour dès que la valeur elle-même a dû rétrécir.
    row.append(buildUnit(unitText))
  }

  element.append(row)
  return element
}
