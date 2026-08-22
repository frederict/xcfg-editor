import { physicalSize, type Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import { getMember, readBoolean, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import type { Layout, Page } from './layout'
import { navigationsBlock } from './reachability'
import type { Orientation } from './grid'
import type { Widget } from './widget'
// `import type` : effacé à la compilation. Ce module **ne dépend pas** de `src/i18n/` à
// l'exécution — il reçoit un traducteur dans son entrée. Voir « La prose de ce module ».
import type { MessageKey, Translator } from '../i18n'

/**
 * Le contrôle avant vol : ce qui, dans **cette** configuration, ne se comportera pas
 * comme le pilote le croit.
 *
 * Module **pur** — pas de DOM, pas d'interface, aucune écriture. Il prend un document,
 * son layout et l'appareil visé, et rend une liste de constats localisés.
 *
 * ## L'éthique, reprise mot pour mot de `src/ui/warnings.ts`
 *
 * 1. **On signale, on ne corrige jamais, on ne bloque jamais.** Aucune fonction d'ici
 *    ne touche au document ; le fichier ressort à l'octet près.
 * 2. **On ne signale pas les chevauchements.** Le corpus en compte 34, tous
 *    délibérés — le manuel documente l'idiome (*« the top one with at least some data
 *    wins »*) et la recherche a exhumé une technique de compétition qui empile
 *    **exprès** deux jeux de widgets aux mêmes coordonnées. Ce serait 100 % de bruit,
 *    et pire : on découragerait une bonne pratique.
 * 3. **Une règle qui crie au loup sur une configuration saine détruit la confiance dans
 *    toutes les autres.** Chaque règle d'ici a donc été passée sur les 21 fichiers du
 *    corpus (les cinq exports réels, plus les 16 configurations tirées de l'appareil)
 *    avant d'être retenue ; le compte de déclenchements est écrit au-dessus de chacune.
 *
 * ## Ce que ce module ne fait PAS, parce que `src/ui/warnings.ts` le fait déjà
 *
 * Type d'export, données personnelles, ressources externes, écart de version, structure
 * inattendue, clés dupliquées, géométrie dégénérée (`X2 ≤ X1`, hors bornes 0–10000) et
 * recouvrement total par un widget **opaque**. `warnings.ts` parle du **fichier** ;
 * ce module parle du **comportement des pages en vol**.
 *
 * Un seul recoupement, assumé : la règle 1 (« inatteignable au clic ») et
 * l'avertissement `geometry` de `warnings.ts` regardent tous deux le recouvrement, mais
 * pas la même chose. `warnings.ts` demande « ce widget sera-t-il **visible** ? » et ne
 * retient donc comme masquants que les fonds opaques (`_bg: 0`) ; la règle 1 demande
 * « ce widget sera-t-il **atteignable au doigt** ? », et un widget sans aucun fond vole
 * les clics tout autant qu'un opaque — c'est même exactement ce qui se passe chez le propriétaire,
 * où deux `WLiveMessage` invisibles (`_bg: 100`) volent les clics de quatre widgets dont
 * deux `WButtonNavig` que l'instrument dessine visiblement.
 *
 * **Ce recoupement est levé à l'affichage, pas ici.** Là où les deux modules disent le
 * même gadget — recouvert par **un** widget au fond plein —, c'est `warnings.ts` qui
 * parle, parce qu'il a mieux à dire : il distingue le bouton d'action, dont le montage
 * sous une carte est voulu et fonctionne, du widget d'affichage qui ne montrera jamais
 * sa valeur. Le tri est dans `preflightWarnings` (`src/ui/warnings.ts`), avec son
 * pourquoi. Ce module, lui, rend tous ses constats : il ne sait pas dans quelle
 * interface ils seront lus.
 *
 * ## La prose de ce module : elle est reçue, jamais lue
 *
 * `InspectionInput.tr` porte la langue du pilote. Les titres (`ruleTitle`), les résumés
 * (`ruleSummary`), le `message` et le `toVerify` de chaque constat, jusqu'au repérage
 * « Paysage, page 5, gadget 9 », en sortent — de `src/i18n/` ce fichier ne prend que des
 * **types**, effacés à la compilation, et il reste le module pur qu'il était.
 *
 * ⚠️ **Ce que la traduction ne doit pas perdre.** Quatre des sept règles sortent en
 * `certainty: 'hypothesis'` et se formulent **en question**, jamais en verdict ; leur
 * `toVerify` nomme l'essai qui trancherait sur l'instrument. C'est la distinction mesuré /
 * supposé, et c'est elle qui fait la valeur du projet : une traduction qui affirmerait ce
 * que le français demande la ferait perdre sans que rien ne casse.
 */

/* ============================================================== la forme d'un constat */

export type InspectionRuleId =
  | 'unreachable-widget'
  | 'page-never-shown'
  | 'thermal-page-not-auto-target'
  | 'widget-too-small'
  | 'pro-widget-without-licence'
  | 'road-maps-on-same-page'
  | 'obsolete-key'

/**
 * Deux niveaux, pas plus. Trois inviteraient à ranger au milieu tout ce dont on n'est
 * pas sûr — or le doute a sa propre dimension, `InspectionCertainty`, et les mélanger
 * ferait passer une hypothèse solide pour un demi-problème.
 *
 * - `to-know` — c'est peut-être voulu, et le pilote doit le savoir avant de décoller.
 * - `likely-error` — personne ne fait cela exprès : le widget ne pourra pas être touché,
 *   ou XCTrack annonce que ça ne marchera pas.
 */
export type InspectionSeverity = 'to-know' | 'likely-error'

/**
 * Sur quoi le constat repose. **Quatre des sept règles reposent sur une hypothèse non
 * vérifiée sur l'instrument** : l'interface doit les présenter en question, pas en
 * verdict, et c'est ce champ qui le lui dit.
 *
 * - `measured` — calculé exactement sur le fichier, ou observé sur l'AIR³.
 * - `documented` — écrit par XCTrack lui-même (ressources de l'APK, manuel officiel),
 *   mais pas revérifié par nous sur l'appareil.
 * - `hypothesis` — une supposition. `toVerify` dit alors ce qui la lèverait.
 */
export type InspectionCertainty = 'measured' | 'documented' | 'hypothesis'

/**
 * Où le constat porte. Une page n'a pas de nom : **son rang EST son identité**, et
 * c'est ce rang que le pilote parcourt en vol (même raisonnement que
 * `src/ui/pageManager.ts`). Les rangs partent donc de 1, comme ceux que l'interface
 * affiche, et non de 0 comme les index du fichier.
 */
export interface InspectionLocation {
  orientation: Orientation
  /** Rang de la page, à partir de 1. */
  pageRank: number
  /** Rang du widget dans l'ordre du fichier, à partir de 1. Absent : constat de page. */
  widgetRank?: number
}

export interface Finding {
  ruleId: InspectionRuleId
  severity: InspectionSeverity
  certainty: InspectionCertainty
  location: InspectionLocation
  /** Une phrase pour le pilote, dans sa langue, qui se lit sans connaître le format. */
  message: string
  /**
   * Ce qui reste à vérifier sur l'AIR³ pour lever le doute. Présent sur tout constat
   * `hypothesis`, et sur lui seul.
   */
  toVerify?: string
}

/**
 * Les clés de titre et de résumé de ce module, et elles seules. `MessageKey` tout entier
 * serait trop large : `t()` exigerait alors les repères de la plus exigeante des phrases du
 * catalogue. Même motif que `LayoutReasonKey` dans `personalData.ts`.
 */
type RuleTitleKey = Extract<MessageKey, `ruleTitle.${string}`>
type RuleSummaryKey = Extract<MessageKey, `ruleSummary.${string}`>

/**
 * La clé de catalogue de chaque règle, titre et résumé. Une seule source pour les mots du
 * produit, dans les cinq langues.
 *
 * ⚠️ L'identifiant `thermal-page-not-auto-target` date du temps où la règle affirmait
 * laquelle des pages était éclipsée. Ce qu'elle sait vraiment, c'est qu'il y en a
 * plusieurs — le titre le dit, l'identifiant reste, parce qu'il ne se lit nulle part.
 */
const RULE_MESSAGE_KEYS: Readonly<Record<InspectionRuleId, RuleTitleKey>> = {
  'unreachable-widget': 'ruleTitle.unreachableWidget',
  'page-never-shown': 'ruleTitle.pageNeverShown',
  'thermal-page-not-auto-target': 'ruleTitle.thermalPages',
  'widget-too-small': 'ruleTitle.widgetTooSmall',
  'pro-widget-without-licence': 'ruleTitle.proWidget',
  'road-maps-on-same-page': 'ruleTitle.roadMaps',
  'obsolete-key': 'ruleTitle.obsoleteKey'
}

const RULE_SUMMARY_KEYS: Readonly<Record<InspectionRuleId, RuleSummaryKey>> = {
  'unreachable-widget': 'ruleSummary.unreachableWidget',
  'page-never-shown': 'ruleSummary.pageNeverShown',
  'thermal-page-not-auto-target': 'ruleSummary.thermalPages',
  'widget-too-small': 'ruleSummary.widgetTooSmall',
  'pro-widget-without-licence': 'ruleSummary.proWidget',
  'road-maps-on-same-page': 'ruleSummary.roadMaps',
  'obsolete-key': 'ruleSummary.obsoleteKey'
}

/**
 * Le titre de chaque règle, pour que l'interface groupe sans réinventer les mots, dans la
 * langue du pilote.
 */
export function ruleTitle(ruleId: InspectionRuleId, tr: Translator): string {
  return tr.t(RULE_MESSAGE_KEYS[ruleId])
}

/**
 * Ce que la règle regarde, et **d'où vient ce qu'elle affirme** — une ou deux phrases,
 * sans un seul chiffre propre à un gadget.
 *
 * Le partage du travail avec `Finding.message` est net, et il faut le tenir : le message
 * dit ce qui se passe **sur ce gadget-là**, ce résumé dit ce que vaut la règle **en
 * général**. Une interface qui groupe les constats par règle — c'est ce que fait
 * `src/ui/warnings.ts` — pose ce résumé une fois en tête et les messages en dessous ;
 * recopier l'un dans l'autre ferait relire au pilote la même phrase à chaque ligne.
 *
 * Même raison d'être que `ruleTitle` juste au-dessus : une seule source pour les mots du
 * produit, plutôt qu'une reformulation par écran.
 */
export function ruleSummary(ruleId: InspectionRuleId, tr: Translator): string {
  return tr.t(RULE_SUMMARY_KEYS[ruleId])
}

export interface InspectionInput {
  document: JsonNode
  layout: Layout
  /** L'appareil visé : c'est lui qui donne les millimètres de la règle 4. */
  device: Device
  /** Langue des libellés de widgets — déjà résolue par l'appelant, comme dans `warnings.ts`. */
  language: string
  /**
   * **Notre prose**, dans la langue du pilote — l'autre axe que `language`, qui suit le
   * fichier ouvert. Passé, jamais lu : ce module ne connaît pas la langue courante.
   */
  tr: Translator
  /**
   * `catalog.isProWidget` d'un `WidgetCatalog` déjà chargé. Absent : la règle Pro n'est
   * pas évaluée du tout, plutôt que de deviner. Injecté plutôt qu'importé : le
   * catalogue se charge de façon asynchrone (`loadWidgetCatalog`), et ce module reste
   * synchrone et pur.
   */
  isProWidget?: (shortName: string) => boolean
  /** Distance œil–instrument, en millimètres. Défaut : `DEFAULT_READING_DISTANCE_MM`. */
  readingDistanceMm?: number
}

const SCALE = 10000

function where(location: InspectionLocation, tr: Translator): string {
  const orientation = tr.t(
    location.orientation === 'landscape' ? 'inspection.landscape' : 'inspection.portrait'
  )
  if (location.widgetRank === undefined) {
    return tr.t('inspection.wherePage', { orientation, page: location.pageRank })
  }
  return tr.t('inspection.whereWidget', {
    orientation, page: location.pageRank, rank: location.widgetRank
  })
}

/* ==================================================== 1. widget inatteignable au clic */

export interface Rectangle { x1: number; y1: number; x2: number; y2: number }

/** Surface strictement positive. Un rectangle plat ou inversé n'a aucun point. */
function hasArea(rectangle: Rectangle): boolean {
  return rectangle.x2 > rectangle.x1 && rectangle.y2 > rectangle.y1
}

/**
 * `rectangle` privé de `cutter` : de zéro à quatre morceaux disjoints.
 *
 * **C'est une vraie soustraction, pas un test d'inclusion et pas un échantillonnage.**
 * Les deux raccourcis se trompent, et pas au même endroit :
 *
 * - un test d'inclusion (« un seul autre widget englobe-t-il celui-ci ? ») rate le cas
 *   où **deux** widgets couvrent ensemble ce qu'aucun ne couvre seul — le cas est
 *   explicitement dans les tests ;
 * - un échantillonnage (tester quelques points) est une approximation qui se trompe aux
 *   bords : un liseré large d'un dix-millième de page reste cliquable et ne tombe sous
 *   aucune grille de points.
 *
 * Le découpage est : la bande au-dessus du cutter, la bande en dessous, puis à gauche et
 * à droite **dans la seule bande de recouvrement vertical** — sans quoi les morceaux se
 * chevaucheraient et la région ne serait plus une partition.
 */
export function subtractRectangle(rectangle: Rectangle, cutter: Rectangle): Rectangle[] {
  if (!hasArea(rectangle)) return []
  if (!hasArea(cutter)) return [rectangle]
  const disjoint =
    cutter.x2 <= rectangle.x1 || cutter.x1 >= rectangle.x2 ||
    cutter.y2 <= rectangle.y1 || cutter.y1 >= rectangle.y2
  if (disjoint) return [rectangle]

  const pieces: Rectangle[] = []
  if (cutter.y1 > rectangle.y1) {
    pieces.push({ x1: rectangle.x1, y1: rectangle.y1, x2: rectangle.x2, y2: cutter.y1 })
  }
  if (cutter.y2 < rectangle.y2) {
    pieces.push({ x1: rectangle.x1, y1: cutter.y2, x2: rectangle.x2, y2: rectangle.y2 })
  }
  const bandTop = Math.max(rectangle.y1, cutter.y1)
  const bandBottom = Math.min(rectangle.y2, cutter.y2)
  if (bandBottom > bandTop) {
    if (cutter.x1 > rectangle.x1) {
      pieces.push({ x1: rectangle.x1, y1: bandTop, x2: cutter.x1, y2: bandBottom })
    }
    if (cutter.x2 < rectangle.x2) {
      pieces.push({ x1: cutter.x2, y1: bandTop, x2: rectangle.x2, y2: bandBottom })
    }
  }
  return pieces.filter(hasArea)
}

/**
 * Ce qui reste de `rectangle` une fois tous les `cutters` retirés. Région vide = aucun
 * point de la surface n'est libre.
 */
export function remainingArea(
  rectangle: Rectangle, cutters: readonly Rectangle[]
): Rectangle[] {
  let region: Rectangle[] = hasArea(rectangle) ? [rectangle] : []
  for (const cutter of cutters) {
    if (region.length === 0) break
    const next: Rectangle[] = []
    for (const piece of region) next.push(...subtractRectangle(piece, cutter))
    region = next
  }
  return region
}

const boxOf = (widget: Widget): Rectangle =>
  ({ x1: widget.x1, y1: widget.y1, x2: widget.x2, y2: widget.y2 })

/**
 * Les rangs (à partir de 1) des widgets d'une page dont **aucun point** n'échappe aux
 * widgets d'index supérieur.
 *
 * Le sens du parcours de la pile est le cœur de la règle : `src/ui/editor.ts`
 * (`widgetAtPoint`) résout un clic **du dernier vers le premier**, donc seuls les
 * widgets **plus loin dans le tableau** volent les clics. Un widget opaque placé avant
 * ne vole rien du tout — inverser ce sens rend la règle exactement fausse, et c'est
 * l'un des sabotages que les tests détectent.
 *
 * `_bg` n'entre pas ici : la question est le doigt, pas l'œil. Voir l'en-tête du module.
 *
 * Un widget de surface nulle est ignoré : il n'a aucun point à recouvrir, et
 * `warnings.ts` le signale déjà comme géométrie dégénérée.
 */
export function unreachableWidgetRanks(page: Page): number[] {
  const boxes = page.widgets.map(boxOf)
  const ranks: number[] = []
  boxes.forEach((box, index) => {
    if (!hasArea(box)) return
    if (remainingArea(box, boxes.slice(index + 1)).length === 0) ranks.push(index + 1)
  })
  return ranks
}

/* ================================================ 2. page qui ne s'affichera jamais */

/**
 * Vrai si la page porte **explicitement** « aucun type de navigation ».
 *
 * La lecture vit dans `model/reachability.ts` (`navigationsBlock`), qui distingue en plus
 * **laquelle** des deux écritures l'interdit — le réglage « Désactivé » ou la liste vide —
 * parce que la page ouverte en édition a besoin de le dire au pilote. Ici, seule la
 * conséquence compte : la règle 2 la rend d'un seul tenant.
 *
 * **Exportée** parce que c'est le seul prédicat de visibilité de page que l'appareil ait
 * confirmé : `src/ui/pageManager.ts` s'en sert pour ses avertissements de suppression,
 * qui reposaient jusqu'au 22 août 2026 sur la classe de la page — un critère mesuré faux
 * (voir `PAGE_KINDS` dans `src/ui/views.ts`). Le doublon aurait été pire : deux lectures
 * de `navigations`, dont une seule avec le garde-fou ci-dessus.
 */
export function isShownForNoNavigation(page: Page): boolean {
  return navigationsBlock(page) !== undefined
}

/* ======================================== 3. page d'assistant de thermique éclipsée */

/**
 * La classe de page dont XCTrack fait la cible de son basculement automatique en
 * spirale. **Même valeur que `THERMAL_ASSISTANT_CLASS` de `src/ui/pageManager.ts`**, et
 * même règle « c'est la dernière qui sert » que son `autoSwitchTargetRank`.
 *
 * Le doublon est délibéré et il est un défaut connu : `src/model/` ne doit rien importer
 * de `src/ui/` (`pageManager.ts` tire `render/canvas.ts`, donc le DOM, dans le graphe
 * d'import — or ce module est pur). Le bon correctif n'est pas d'importer vers le haut,
 * c'est de **descendre `shortClassName`, `thermalAssistantRanks` et
 * `autoSwitchTargetRank` de `src/ui/pageManager.ts` vers `src/model/`**, où ils sont à
 * leur place ; les deux modules s'en serviraient alors. Signalé au product owner.
 */
export const THERMAL_ASSISTANT_PAGE_CLASS = 'WPThermalAssistant'

const shortClassName = (className: string): string => className.split('.').pop() ?? ''

/* ============================================ 4. widget trop petit pour être lu */

/**
 * Distance œil–instrument par défaut, en millimètres.
 *
 * **Pourquoi 50 cm** : c'est la distance de référence des normes d'ergonomie visuelle
 * (ISO 9241-303 et la série 9241 en général la prennent pour base), et elle correspond
 * à un instrument posé sur le cockpit de sellette ou sanglé à la cuisse, bras au repos.
 * Elle n'a **pas** été mesurée sur le propriétaire en vol : c'est pour cela que
 * `InspectionInput.readingDistanceMm` existe. Un pilote qui porte son AIR³ plus près ou
 * plus loin doit pouvoir le dire, pas subir notre chiffre.
 */
export const DEFAULT_READING_DISTANCE_MM = 500

/**
 * Hauteur de caractère **minimale absolue** recommandée par l'ISO 9241-303, en minutes
 * d'arc. En dessous, la norme considère la lecture comme non fiable. À 50 cm : ≈ 2,3 mm.
 */
export const MINIMUM_CHARACTER_ANGLE_ARCMIN = 16

/**
 * Hauteur de caractère **recommandée** par l'ISO 9241-303 (la norme donne 20 à 22′ ; on
 * retient la borne haute). À 50 cm : ≈ 3,2 mm.
 *
 * **Exportée mais volontairement pas employée comme seuil de déclenchement** — voir
 * `minimumWidgetHeightMm`.
 */
export const RECOMMENDED_CHARACTER_ANGLE_ARCMIN = 22

/**
 * ⚠️ **CONSTANTE NON VÉRIFIÉE — la plus fragile de ce module.**
 *
 * Fraction de la hauteur du widget qu'occupe la hauteur du glyphe de la valeur
 * affichée. Tout le seuil de la règle 4 en dépend linéairement : la doubler diviserait
 * le seuil par deux.
 *
 * **D'où vient 0,48** : d'**une seule** mesure, déjà faite pour le rendu et écrite dans
 * `src/ui/style.css` (bloc `.xc-num__value`) — le glyphe « 99 » d'un `WAltitude` de
 * `landscape[3]`, mesuré à ~48 % de la hauteur du widget sur
 * `docs/reference/captures-air3/ecran-landscape3-17widgets.png`. Un widget, un glyphe,
 * une capture.
 *
 * **Ce qu'on ne sait donc pas** : si la fraction tient pour les autres types. Elle ne
 * tient sûrement pas pour un widget **sans titre** (`.xc-num--no-title` dessine la
 * valeur nettement plus grande), ni pour une barre d'état, une carte ou une boussole,
 * qui n'affichent pas « une valeur » du tout.
 *
 * **La campagne qui la fixerait** : les cinquante captures de
 * `docs/reference/captures-air3/` suffisent — mesurer, pour chaque type de widget
 * numérique lisible sur une capture, la hauteur du glyphe rapportée à la hauteur du
 * widget, et remplacer cette constante par une table par type. **Aucun accès à
 * l'appareil n'est nécessaire.** Tant que ce n'est pas fait, tous les constats de la
 * règle 4 sortent en `hypothesis` et se formulent en doute.
 */
export const ASSUMED_VALUE_HEIGHT_RATIO = 0.48

/** Hauteur, en millimètres, d'un objet vu sous `arcMinutes` à `distanceMm`. */
export function characterHeightMm(arcMinutes: number, distanceMm: number): number {
  const halfAngleRadians = ((arcMinutes / 60) * Math.PI) / 360
  return 2 * distanceMm * Math.tan(halfAngleRadians)
}

/**
 * Hauteur de widget en dessous de laquelle sa valeur passe sous le **minimum absolu**
 * de l'ISO 9241-303. À 50 cm et avec `ASSUMED_VALUE_HEIGHT_RATIO` : ≈ 4,85 mm.
 *
 * **Pourquoi le minimum absolu et non la valeur recommandée.** Mesuré sur la
 * configuration du propriétaire (AIR³ 7.2, dalle 155,0 × 87,2 mm) :
 *
 * - au seuil « minimum » (4,85 mm), la règle sort **3 widgets sur 105**, tous à 3,0 mm
 *   de haut — une seule ligne de la grille de 29 —, tous sur une page de compétition
 *   qu'il a composée lui-même ;
 * - au seuil « recommandé » (6,67 mm), elle en sort **7**, dont les trois `WStatusLine`
 *   des pages portrait, hautes de 5,0 mm. Or ces trois pages sont **celles d'usine de
 *   XCTrack**, identiques de février 2022 à août 2026 et identiques sur une seconde
 *   installation (`docs/reference/corpus-air3.md` § 3).
 *
 * Une règle qui reproche au pilote la mise en page livrée par XCTrack crie au loup, et
 * apprend à ignorer les six autres. Le seuil recommandé reste exporté
 * (`RECOMMENDED_CHARACTER_ANGLE_ARCMIN`) pour le jour où la campagne de mesure aura
 * remplacé `ASSUMED_VALUE_HEIGHT_RATIO` par une table par type de widget : la barre
 * d'état ne sera alors plus jugée à l'aune d'un afficheur numérique.
 */
export function minimumWidgetHeightMm(distanceMm = DEFAULT_READING_DISTANCE_MM): number {
  return characterHeightMm(MINIMUM_CHARACTER_ANGLE_ARCMIN, distanceMm) / ASSUMED_VALUE_HEIGHT_RATIO
}

/** Hauteur réelle d'un widget sur la dalle visée, en millimètres. */
export function widgetHeightMm(
  widget: Widget, device: Device, orientation: Orientation
): number {
  return ((widget.y2 - widget.y1) / SCALE) * physicalSize(device, orientation).heightMm
}

/**
 * Des millimètres, à un dixième, dans la langue du pilote — jamais un `.replace('.', ',')`
 * écrit à la main : la virgule décimale, l'espace avant l'unité et le mot « mm » lui-même
 * viennent d'`Intl`.
 */
function mm(value: number, tr: Translator): string {
  return tr.format.millimeters(value, 1)
}

/* ================================================= 6. les cartes routières */

/**
 * Valeur de `mapWidget_mapAppearance.theme` qui éteint la carte routière. Relevée dans
 * les valeurs par défaut d'une « Carte de la manche » neuve
 * (`docs/reference/edition-native-exploration.md` § 3.4 :
 * `mapWidget_mapAppearance={"theme":"None","terrain":"None"}`) et confirmée par le
 * corpus, où les thèmes actifs valent `ClearpilotForest` ou `ClearpilotForestDark`.
 */
const ROAD_MAP_THEME_OFF = 'None'

/**
 * Vrai si ce widget dessine une carte routière (le fond vectoriel OpenStreetMap).
 *
 * **La clé a été établie, pas devinée** — c'était le point ouvert de cette tâche :
 *
 * 1. le catalogue d'options extrait de l'APK (`src/catalog/widgetOptions*`) associe à
 *    `mapWidget_mapAppearance` deux champs `theme` et `terrain`, et la ressource de
 *    libellé `widgetSettingsShowOpenStreetNotice` ;
 * 2. les chaînes de `classes3.dex` de l'APK 1.0.3-beta5 portent `MapAppearance(theme=`,
 *    `Failed upgrading mapWidget from mapWidget_showTerrain, mapWidget_showOpenStreet`
 *    et `Failed upgrading mapWidget from mapWidget_openStreetTheme` : `theme` est bien
 *    l'héritier de `mapWidget_showOpenStreet`, c'est-à-dire la carte routière ;
 * 3. le journal de version de l'APK parle de « new: lightpilot theme **for road maps** »
 *    et « new default theme for road maps: hyperpilot », et `assets/vtm_themes/` porte
 *    ces thèmes ;
 * 4. les seules valeurs du corpus sont `None`, `ClearpilotForest`,
 *    `ClearpilotForestDark`.
 *
 * L'ancienne forme booléenne `mapWidget_showOpenStreet` est acceptée en repli : elle est
 * encore vivante dans 82 widgets du corpus, dont les pages portrait d'usine du propriétaire.
 * `mapWidget_openStreetTheme`, troisième forme trouvée dans le `.dex`, n'apparaît nulle
 * part dans le corpus et son domaine de valeurs est inconnu : elle est **volontairement
 * ignorée ici** (elle reste signalée par la règle 7) plutôt que testée au jugé.
 */
function drawsRoadMap(widget: Widget): boolean {
  const appearance = getMember(widget.node, 'mapWidget_mapAppearance')
  if (appearance !== undefined) {
    const theme = readString(appearance, 'theme')
    return theme !== undefined && theme !== ROAD_MAP_THEME_OFF
  }
  return readBoolean(widget.node, 'mapWidget_showOpenStreet') === true
}

/* ================================================= 7. clés d'un schéma périmé */

/**
 * Les clés qu'une version antérieure de XCTrack écrivait, et ce que 1.0.3 met à leur
 * place. **Rien n'est perdu** : la migration a été observée sur l'appareil — réimporter
 * la sauvegarde du propriétaire a laissé les cinq pages paysage identiques octet pour octet et
 * **réécrit** les trois pages portrait, qui portaient encore l'ancien schéma
 * (`docs/reference/edition-native-exploration.md` § 6).
 *
 * `mapWidget_openStreetTheme` ne figure ni dans le corpus ni dans l'inventaire des
 * 18 options non appariées ; elle est ajoutée ici sur la foi de la chaîne
 * `Failed upgrading mapWidget from mapWidget_openStreetTheme` trouvée dans
 * `classes3.dex` de l'APK 1.0.3-beta5, qui prouve que la migration existe dans le code.
 */
export const OBSOLETE_WIDGET_KEYS: Readonly<Record<string, string>> = {
  mapWidget_showOpenStreet: 'mapWidget_mapAppearance',
  mapWidget_showTerrain: 'mapWidget_mapAppearance',
  mapWidget_openStreetTheme: 'mapWidget_mapAppearance',
  nav_use_brackets: 'nav_label',
  newWindArrow: 'windStyle',
  showWind: 'windStyle'
}

/** Les clés obsolètes portées par ce widget, dans l'ordre du fichier. */
function obsoleteKeysOf(widget: Widget): string[] {
  const node = widget.node
  if (node.kind !== 'object') return []
  const found: string[] = []
  for (const key of Object.keys(OBSOLETE_WIDGET_KEYS)) {
    if (getMember(node, key) !== undefined) found.push(key)
  }
  return found
}

/* ================================================================= l'inspection */

interface PageContext {
  page: Page
  orientation: Orientation
  pageRank: number
}

function eachPage(layout: Layout): PageContext[] {
  const contexts: PageContext[] = []
  for (const orientation of ['landscape', 'portrait'] as const) {
    layout[orientation].forEach((page, index) => {
      contexts.push({ page, orientation, pageRank: index + 1 })
    })
  }
  return contexts
}

/**
 * Règle 1 — 6 constats sur les 105 widgets de la configuration réelle du propriétaire. Sur le
 * corpus historique, 15 fichiers sur 16 en rendent exactement 4, toujours le même motif ;
 * seul `2022-02-08.xcfg` (227 widgets, 11 pages) en rend 49, dont 32 `WButtonNavig`
 * délibérément posés sous des cartes. Le taux global — 109 sur 1631 widgets — est donc
 * porté par un seul fichier atypique, pas par un bruit de fond.
 *
 * **Ce qui est mesuré, et ce qui ne l'est pas.** Le recouvrement, lui, est un fait
 * géométrique : aucun point de la surface n'échappe aux widgets placés après. Que cela
 * rende le widget **insélectionnable en mode édition** est solide, dans notre éditeur
 * comme sur l'appareil : `edition-native-exploration.md` § 2.3 relève que XCTrack résout
 * un appui par « le widget le plus en avant l'emporte », règle que `widgetAtPoint`
 * reproduit.
 *
 * **Ce qu'on ne sait pas, et qu'il ne faut donc pas dire** : comment XCTrack route un
 * appui **en vol**. Une version antérieure de ce message affirmait « sur l'instrument,
 * aucun point de sa surface ne répond au doigt » — c'est une affirmation sur le
 * comportement en vol, et elle n'a jamais été observée. L'enjeu n'est pas théorique :
 * `WButtonNavig` et `WButtonBrightness`, les deux types les plus souvent concernés,
 * n'existent que pour être touchés en vol. Ou bien ils fonctionnent, et l'ancien message
 * inquiétait pour rien ; ou bien ils ne fonctionnent pas, et c'est un vrai défaut de la
 * configuration. **Le constat porte donc sur l'édition, et pose la question du vol** —
 * d'où `certainty: 'hypothesis'` et un `toVerify`, le deuxième principe du projet
 * interdisant d'affirmer un comportement de l'appareil qu'on n'a pas vu.
 */
function unreachableWidgetFindings(input: InspectionInput): Finding[] {
  const findings: Finding[] = []
  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    for (const rank of unreachableWidgetRanks(page)) {
      const widget = page.widgets[rank - 1]!
      const name = readableName(widget.shortName, input.language)
      findings.push({
        ruleId: 'unreachable-widget',
        severity: 'likely-error',
        certainty: 'hypothesis',
        location: { orientation, pageRank, widgetRank: rank },
        message: input.tr.t('inspection.unreachable', { name }),
        // Les astérisques d'emphase n'ont rien à faire dans ces messages : le texte est
        // posé tel quel dans la page, jamais interprété comme du Markdown, et le pilote
        // lirait « **en vol** ».
        toVerify: input.tr.t('inspection.unreachableToVerify')
      })
    }
  }
  return findings
}

/**
 * Règle 2 — **mesurée**, comme la règle 7 et comme elle seule : deux des sept.
 *
 * Elle sortait en `documented`, sur la seule foi de la boîte de XCTrack — « Activer /
 * Désactiver — Choisir les types de navigations pour lesquelles la page sera affichée »
 * (`edition-native-exploration.md` § 5.4). Aucun type coché = affichée pour aucun : le
 * texte dit l'intention, pas le fait.
 *
 * L'essai du 22 août 2026 a établi le fait (`docs/reference/2026-08-22-essai-pilote.md`
 * § 2) : six pages importées sur un AIR³ 7.2, huit appuis de défilement au sol, cinq
 * pages différentes revenant en boucle — et **la seule réellement sautée était celle dont
 * `navigations` vaut `"none"`**. C'est le même essai qui a démenti « masquée hors vol »
 * (voir l'en-tête de `src/ui/views.ts`) : il n'a pas seulement retiré une affirmation, il
 * en a confirmé une autre. Les cinq README le racontent déjà ainsi.
 *
 * ⚠️ Ce que l'essai ne dit pas, et qu'aucune phrase ne doit ajouter : il a eu lieu **au
 * sol**, sur un appareil et une version. C'est la boîte de XCTrack, et elle seule, qui
 * couvre le comportement en vol selon la navigation choisie.
 *
 * L'étiquette ne change rien à l'affichage — `isAttentionFinding` ne regarde que
 * `hypothesis`, et cette règle est `to-know`. Elle change ce que le dépôt affirme, ce qui
 * est précisément l'enjeu.
 *
 * 1 à 3 constats par fichier dans le corpus, dont la page de compétition de 15 widgets
 * du propriétaire.
 */
function pageNeverShownFindings(input: InspectionInput): Finding[] {
  const findings: Finding[] = []
  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    if (!isShownForNoNavigation(page)) continue
    const count = page.widgets.length
    findings.push({
      ruleId: 'page-never-shown',
      severity: 'to-know',
      certainty: 'measured',
      location: { orientation, pageRank },
      message: input.tr.t('inspection.pageNeverShown', { count })
    })
  }
  return findings
}

/**
 * Règle 3 — **hypothèse**, et il a fallu la relecture du 22 août 2026 pour s'en rendre
 * compte : elle sortait en `documented`, avec pour source « le manuel de XCTrack ».
 *
 * **Ce qui est réellement documenté** (`edition-native-exploration.md` § 5.4, relevé sur
 * l'instrument) : la classe de page décide du jeu de gadgets à la création « et, pour
 * `WPThermalAssistant`, la page cible du basculement automatique en thermique ». Une
 * cible, donc — mais pas un mot sur le départage quand une orientation en porte
 * plusieurs. **« C'est la dernière qui sert » n'est écrit nulle part dans ce dépôt**, et
 * rien ne l'a observé : aucun des 21 fichiers du corpus ne porte deux pages de cette
 * classe dans la même orientation, la règle n'a donc jamais rendu un seul constat.
 *
 * Le rapprochement avec la règle qui a été retirée le même jour est direct : là aussi une
 * affirmation sur le comportement de l'instrument avait pris le ton d'un relevé. Celle-ci
 * n'est pas mesurée fausse, seulement invérifiée — elle survit donc sous la forme que le
 * projet réserve au doute : `certainty: 'hypothesis'`, un `toVerify` qui dit ce qui la
 * trancherait, un titre qui ne promet plus rien, et jamais le bloc d'alerte.
 *
 * ⚠️ `src/ui/pageManager.ts` suppose la même chose, au même endroit
 * (`autoSwitchTargetRank`) : les deux se corrigeront ensemble le jour où quelqu'un
 * dupliquera une page d'assistant de thermique sur un AIR³ et regardera.
 */
function thermalPageFindings(input: InspectionInput): Finding[] {
  const findings: Finding[] = []
  for (const orientation of ['landscape', 'portrait'] as const) {
    const pages = input.layout[orientation]
    const ranks = pages
      .map((page, index) => ({ page, rank: index + 1 }))
      .filter(({ page }) => shortClassName(page.className) === THERMAL_ASSISTANT_PAGE_CLASS)
      .map(({ rank }) => rank)
    if (ranks.length < 2) continue
    const target = ranks[ranks.length - 1]!
    for (const rank of ranks.slice(0, -1)) {
      findings.push({
        ruleId: 'thermal-page-not-auto-target',
        severity: 'to-know',
        certainty: 'hypothesis',
        location: { orientation, pageRank: rank },
        message: input.tr.t('inspection.thermalPages', { target }),
        toVerify: input.tr.t('inspection.thermalPagesToVerify')
      })
    }
  }
  return findings
}

/**
 * Règle 4 — **hypothèse**, la seule dont le seuil dépende d'un chiffre non vérifié
 * (`ASSUMED_VALUE_HEIGHT_RATIO`). 3 constats sur les 105 widgets du propriétaire.
 */
function tooSmallFindings(input: InspectionInput): Finding[] {
  const distanceMm = input.readingDistanceMm ?? DEFAULT_READING_DISTANCE_MM
  const threshold = minimumWidgetHeightMm(distanceMm)
  const minimumCharacterMm = characterHeightMm(MINIMUM_CHARACTER_ANGLE_ARCMIN, distanceMm)
  const findings: Finding[] = []

  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    page.widgets.forEach((widget, index) => {
      const heightMm = widgetHeightMm(widget, input.device, orientation)
      if (heightMm <= 0 || heightMm >= threshold) return
      const name = readableName(widget.shortName, input.language)
      findings.push({
        ruleId: 'widget-too-small',
        severity: 'to-know',
        certainty: 'hypothesis',
        location: { orientation, pageRank, widgetRank: index + 1 },
        // Les trois hauteurs partent en `string` déjà mises en forme — virgule décimale
        // et unité viennent d'`Intl` —, la distance en `number`, parce qu'elle se compte.
        message: input.tr.t('inspection.tooSmall', {
          name,
          height: mm(heightMm, input.tr),
          value: mm(heightMm * ASSUMED_VALUE_HEIGHT_RATIO, input.tr),
          minimum: mm(minimumCharacterMm, input.tr),
          distance: Math.round(distanceMm / 10)
        }),
        // La fraction se dit en pour-cent et non en `0.48` : le point décimal anglais
        // n'a pas sa place dans une phrase française, et `format.percent` s'en charge.
        toVerify: input.tr.t('inspection.tooSmallToVerify', {
          ratio: input.tr.format.percent(ASSUMED_VALUE_HEIGHT_RATIO)
        })
      })
    })
  }
  return findings
}

/**
 * Règle 5 — **hypothèse**, et formulée en question. 2 constats chez le propriétaire (deux
 * `WButtonBrightness`), 0 dans quinze des vingt et un fichiers du corpus.
 *
 * ⚠️ **On ne sait pas ce que XCTrack fait dans ce cas.** `info.proUpTo` vaut 0 dans les
 * 21 fichiers du corpus, y compris ceux d'une seconde installation : on n'a jamais vu
 * une autre valeur, et le nom suggère autant un horodatage de fin de licence qu'un
 * booléen. Ce qu'on sait par ailleurs, c'est que XCTrack fabrique un `WProFallback` à
 * la lecture d'un widget Pro sans licence
 * (`edition-native-exploration.md` § 3.3) — mais rien ne dit que `proUpTo: 0` soit ce
 * qui le déclenche. **À vérifier sur l'appareil**, et d'ici là ce constat est une
 * question, jamais une affirmation.
 */
function proWidgetFindings(input: InspectionInput): Finding[] {
  const isProWidget = input.isProWidget
  if (isProWidget === undefined) return []
  const info = getMember(input.document, 'info')
  if (info === undefined || readNumber(info, 'proUpTo') !== 0) return []

  const findings: Finding[] = []
  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    page.widgets.forEach((widget, index) => {
      if (!isProWidget(widget.shortName)) return
      const name = readableName(widget.shortName, input.language)
      findings.push({
        ruleId: 'pro-widget-without-licence',
        severity: 'to-know',
        certainty: 'hypothesis',
        location: { orientation, pageRank, widgetRank: index + 1 },
        message: input.tr.t('inspection.proWidget', { name }),
        toVerify: input.tr.t('inspection.proWidgetToVerify')
      })
    })
  }
  return findings
}

/**
 * Règle 6 — **documentée par XCTrack lui-même**, et la question ouverte de la tâche est
 * levée : la contrainte est **par page**, pas par configuration.
 *
 * La notice affichée sous le réglage `mapWidget_mapAppearance` (ressource
 * `widgetSettingsShowOpenStreetNotice` du catalogue d'options) dit, en
 * français dans l'APK : « Il est possible de n'avoir qu'un widjet avec une carte
 * routière active **sur la page** (en raison de la limitation de la bibliothèque de
 * cartes) » — et en allemand « **pro Seite** ». Le manuel officiel, lui, écrit
 * seulement « at most 1 widget with road maps enabled », sans dire par rapport à quoi.
 *
 * **La mesure tranche dans le même sens** : les 21 fichiers du corpus portent
 * **exactement 2** widgets à carte routière chacun — jamais plus, jamais deux sur la
 * même page — sur quatre ans et demi, huit versions et deux installations. Lire la
 * contrainte « par configuration » aurait signalé 21 fichiers sur 21, dont celui avec
 * lequel le propriétaire vole : 100 % de bruit. Lue par page, la règle ne se déclenche sur aucun
 * fichier connu, et reste vraie le jour où quelqu'un pose deux cartes côte à côte.
 */
function roadMapFindings(input: InspectionInput): Finding[] {
  const findings: Finding[] = []
  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    const ranks = page.widgets
      .map((widget, index) => ({ widget, rank: index + 1 }))
      .filter(({ widget }) => drawsRoadMap(widget))
      .map(({ rank }) => rank)
    if (ranks.length < 2) continue

    const first = ranks[0]!
    for (const rank of ranks.slice(1)) {
      const name = readableName(page.widgets[rank - 1]!.shortName, input.language)
      findings.push({
        ruleId: 'road-maps-on-same-page',
        severity: 'likely-error',
        certainty: 'documented',
        location: { orientation, pageRank, widgetRank: rank },
        message: input.tr.t('inspection.roadMaps', { name, first })
      })
    }
  }
  return findings
}

/**
 * Règle 7 — **mesurée** : la migration a été observée sur l'AIR³. Elle se déclenche sur
 * les 21 fichiers du corpus, y compris le dernier, parce que les trois pages portrait
 * du propriétaire n'ont pas été rééditées depuis février 2022. Ce n'est pas du bruit : c'est le
 * message rassurant qui manquait aux « 18 options non appariées » du backlog — le
 * pilote voyait `mapWidget_showOpenStreet` en clé brute sans savoir quoi en penser.
 *
 * Un constat par widget, avec les clés dans son message : une ligne par clé ferait
 * neuf entrées pour la configuration du propriétaire, là où il n'y a que quatre widgets
 * concernés.
 */
function obsoleteKeyFindings(input: InspectionInput): Finding[] {
  const findings: Finding[] = []
  for (const { page, orientation, pageRank } of eachPage(input.layout)) {
    page.widgets.forEach((widget, index) => {
      const keys = obsoleteKeysOf(widget)
      if (keys.length === 0) return
      const name = readableName(widget.shortName, input.language)
      const detail = keys
        .map((key) => `${key} → ${OBSOLETE_WIDGET_KEYS[key]}`)
        .join(', ')
      findings.push({
        ruleId: 'obsolete-key',
        severity: 'to-know',
        certainty: 'measured',
        location: { orientation, pageRank, widgetRank: index + 1 },
        // Le pluriel accorde cinq mots de la phrase sans jamais écrire le nombre :
        // `inspection.obsoleteKey` figure à ce titre dans `PLURAL_WITHOUT_VISIBLE_COUNT`.
        message: input.tr.t('inspection.obsoleteKey', { count: keys.length, name, detail })
      })
    })
  }
  return findings
}

/**
 * Le contrôle complet, dans l'ordre des règles. L'interface groupe par `ruleId` ou trie
 * par `location` comme elle l'entend ; ce module ne décide pas de l'affichage.
 */
export function inspectLayout(input: InspectionInput): Finding[] {
  return [
    ...unreachableWidgetFindings(input),
    ...pageNeverShownFindings(input),
    ...thermalPageFindings(input),
    ...tooSmallFindings(input),
    ...proWidgetFindings(input),
    ...roadMapFindings(input),
    ...obsoleteKeyFindings(input)
  ]
}

/** Les constats d'une règle donnée — pendant de `warningsAt` dans `warnings.ts`. */
export function findingsOfRule(
  findings: readonly Finding[], ruleId: InspectionRuleId
): Finding[] {
  return findings.filter((finding) => finding.ruleId === ruleId)
}

/** « Paysage, page 5, gadget 9 » — la localisation, écrite pour être lue. */
export function describeLocation(location: InspectionLocation, tr: Translator): string {
  return where(location, tr)
}
