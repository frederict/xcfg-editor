import { encode } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { WidgetCatalog } from '../catalog/widgetCatalog'
import { defaultsFor, type DefaultObject, type DefaultValue } from '../catalog/widgetDefaults'
import {
  gridFor, snapRect, snapValue, NORMALIZED_MAX, type Grid, type Orientation
} from '../model/grid'
import { duplicateWidget, type Bounds } from '../model/mutations'
import type { Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import { readWidget } from '../model/widget'
import { renderPage, widgetHeightPx, widgetWidthPx } from '../render/canvas'
import { isBlankAtRest, isRegistered } from '../render/registry'
import {
  makeTranslator, UI_FALLBACK_LANGUAGE, type MessageCatalog, type Translator
} from '../i18n'
import frenchWidgets from '../i18n/messages/fr/widgets'
import frenchModel from '../i18n/messages/fr/model'
import { duplicateRect } from './editor'
import { aspectRatioOf } from './views'

/**
 * La palette d'ajout d'un gadget — l'équivalent de l'écran « Ajouter Gadget » de XCTrack
 * (`docs/reference/edition-native-exploration.md` § 3).
 *
 * ## Ce que la liste montre, et pourquoi dans cet ordre
 *
 * **Une seule colonne, groupée par famille, dans l'ordre de l'écran de l'appareil.** Les dix
 * familles et le rang de chaque type viennent du registre extrait de l'APK
 * (`catalog/widgetCatalog.ts`) : un pilote qui a mémorisé « la boussole est en tête de
 * *Navigation* » la retrouve au même endroit ici. Deux colonnes rompaient cet ordre — l'œil
 * descend une colonne puis remonte —, et une vignette ne tient pas dans une demi-largeur.
 *
 * **Chaque ligne porte une vignette, et cette vignette est le rendu du nœud que le clic
 * posera.** Ce n'est pas une illustration choisie à part : `previewNode` et `buildWidget`
 * partent du même modèle, avec le même rectangle. Pour un type déjà présent dans le fichier,
 * la vignette montre donc **le widget du pilote, avec ses réglages à lui** ; pour un type
 * absent, elle montre ce que XCTrack dessinera une fois qu'il aura complété les clés
 * manquantes. Voir `previewNode` pour la seule différence entre les deux nœuds, et pourquoi
 * elle existe.
 *
 * ## Deux chemins, et ils ne valent pas la même chose
 *
 * **Dupliquer.** Si la configuration ouverte contient déjà un widget du type demandé, le
 * nouveau widget en est une **copie profonde** (`duplicateWidget`), **à la taille du modèle**
 * (`copiedBounds`), posée au centre de la page d'arrivée. Tous
 * ses réglages viennent alors d'un widget que XCTrack a lui-même écrit — y compris les clés
 * qu'aucune version connue ne documente et celles que cet éditeur ne sait pas présenter. Rien
 * n'est deviné, rien n'est perdu. C'est le chemin principal, et la spécification l'a tranché
 * ainsi (§ « Jalon 2 » de `docs/specs/2026-08-20-xcfg-editor-design.md`).
 *
 * **Créer.** Pour un type absent de la configuration, il faut bien poser quelque chose. Ce
 * module pose **les huit clés universelles, et rien d'autre** :
 *
 * | Clé | Valeur | D'où elle vient |
 * |---|---|---|
 * | `CLASS` | `org.xcontest.XCTrack.widget.w.<Type>` | les 105 widgets du corpus portent tous ce préfixe |
 * | `X1` `Y1` `X2` `Y2` | 6 × 6 cellules, centré, aimanté | mesuré sur une boussole neuve (§ 3.4) |
 * | `_border` | `false` | idem |
 * | `_bg` | `100` | idem |
 * | `_theme` | `""` | idem |
 *
 * **Aucune clé propre au type n'est écrite.** Ce n'est pas une lacune, c'est la seule position
 * défendable, et elle s'appuie sur une observation, pas sur une espérance : § 6 du relevé
 * constate qu'à la relecture d'une sauvegarde, XCTrack 1.0.3-beta a **complété les clés
 * absentes avec leurs valeurs par défaut** (`showGps`, `soundMode`, `_rotation`,
 * `thermals_labels`, épaisseurs FAI…). L'application migre en lisant : un widget minimal est
 * donc complété par elle, avec ses vraies valeurs par défaut, celles de la version installée.
 *
 * Nous **aurions pu** en écrire davantage. C'est refusé pour deux raisons :
 *
 * 1. **L'omission est strictement plus sûre que l'erreur.** Une clé absente est remplacée par
 *    XCTrack par la valeur juste ; une clé présente et fausse est conservée telle quelle et
 *    devient un réglage erroné que rien ne signale.
 * 2. **Trois défauts vérifiés sur un seul type ne font pas une preuve** pour 83 types.
 *
 * **Ce qui reste ouvert, et que ce module ne tranche pas** : nul n'a vérifié sur l'appareil
 * qu'un widget réduit à ses huit clés universelles est relu sans broncher. L'observation du § 6
 * porte sur des widgets *anciens auxquels des clés manquaient*, pas sur un widget minimal. Le
 * mécanisme est le même — un désérialiseur qui lit clé par clé avec un défaut de repli — mais
 * c'est une déduction, pas une mesure. L'interface le dit au pilote plutôt que de le taire.
 *
 * ## Ce que le groupement par famille a coûté, et ce qui le rembourse
 *
 * L'ancienne palette groupait par **« déjà dans la configuration » / « absents »**. Ce
 * groupement-là mettait le chemin sûr — la duplication — en tête de liste, ce qu'un
 * classement par famille ne fait plus : la boussole du pilote est désormais noyée au rang 0
 * de *Navigation*, entre soixante-quatorze types qu'il faudra créer. Trois marques le
 * rendent : le **liseré plein** à gauche des types duplicables (pointillé pour les autres),
 * la **vignette**, qui dessine les réglages réels du modèle et non un widget vierge, et la
 * case **« Déjà dans le fichier »**, qui rend en un clic la liste courte que le groupement
 * donnait gratuitement.
 */

/* ========================================================== le traducteur, en attendant */

/**
 * Le traducteur de **notre prose**, avec son repli français — provisoire.
 *
 * La palette reçoit son traducteur dans ses options (`WidgetPaletteOptions.tr`), comme
 * `src/i18n/CLAUDE.md` § 5 le prescrit. `main.ts` — qui le détient déjà, et qui appartient
 * à un autre lot d'extraction — ne le lui passe pas encore : d'ici là, le repli monte le
 * **catalogue français du domaine `widgets`**, c'est-à-dire exactement les phrases que ce
 * module portait en clair jusqu'ici, et rien de plus. Le comportement est donc celui
 * d'aujourd'hui, au caractère près, et `tests/ui/widgetPalette.test.ts` l'épingle.
 *
 * `tr` devient obligatoire — et ces dix lignes disparaissent — le jour où `main.ts` ajoute
 * `tr` à son appel de `renderWidgetPalette`.
 */
let inheritedProse: Translator | undefined

function prose(tr: Translator | undefined): Translator {
  if (tr !== undefined) return tr
  // Deux domaines, et le second n'est pas une commodité : la vignette d'une entrée passe
  // par `renderPage`, et le rendu lit `render.*` (domaine `model`) pour les deux
  // étiquettes de survol qu'il ajoute au dessin. Un repli au seul domaine `widgets`
  // lèverait sur la première entrée `WLiveMessage` de la palette.
  inheritedProse ??= makeTranslator(
    UI_FALLBACK_LANGUAGE, { ...frenchWidgets, ...frenchModel } as unknown as MessageCatalog
  )
  return inheritedProse
}

/** Le préfixe des classes de widgets : les 105 widgets du corpus le portent tous. */
export const WIDGET_CLASS_PREFIX = 'org.xcontest.XCTrack.widget.w.'

/**
 * Côté d'un widget neuf, en cellules de la grille d'aimantation.
 *
 * Une **Boussole et vent** créée sur l'appareil est arrivée en `4375, 3793, 5625, 5862` sur une
 * grille 48 × 29, soit exactement 6 × 6 cellules centrées (§ 3.4 du relevé). Un assistant
 * thermique et une carte de manche sont arrivés en 10 × 10 : la taille dépend donc du type,
 * mais ces deux relevés-là sont explicitement donnés comme **à confirmer** (des gestes
 * parasites ont eu lieu avant leur export). On retient la seule mesure propre, pour tous les
 * types, plutôt qu'une règle inventée à partir d'une mesure douteuse.
 */
export const NEW_WIDGET_CELLS = 6

/**
 * Les trois clés universelles réglables d'un widget neuf, relevées sur la boussole (§ 3.4) :
 * pas de cadre, fond opaque, thème du système. Ce sont les seules valeurs par défaut mesurées
 * sur l'appareil, et elles ne sont pas propres à la boussole — les 105 widgets du corpus
 * portent ces trois clés.
 */
const NEW_WIDGET_UNIVERSALS: Array<[key: string, raw: string, kind: JsonNode['kind']]> = [
  ['_border', 'false', 'literal'],
  ['_bg', '100', 'literal'],
  ['_theme', '""', 'string']
]

/**
 * Le groupe de queue : les types **présents dans le fichier** que l'écran d'ajout de XCTrack
 * ne propose pas.
 *
 * Deux populations s'y retrouvent, et elles ont la même conséquence pour le pilote — il ne
 * peut que les dupliquer, jamais les créer :
 *
 * - les 8 types de la famille masquée `debug_wgDebug` (`WDebug*`, `WVTM`), que XCTrack ne
 *   montre qu'en mode développeur — le catalogue les porte avec `hidden: true` ;
 * - `WProFallback` et `WPMissing`, absents du registre parce que l'application les fabrique
 *   elle-même à la lecture d'un fichier (§ 3.3), et tout type d'une version future que ce
 *   catalogue-ci ne connaît pas encore.
 *
 * Ils ne sont **jamais** proposés à la création : la palette ne dresse sa liste que sur
 * `catalog.visibleFamilies()`. Ils apparaissent uniquement s'ils sont déjà dans la
 * configuration ouverte — dupliquer un widget que le fichier contient déjà ne fabrique rien
 * de nouveau, et le refuser serait un jugement que nous n'avons pas à porter.
 */
export const NOT_OFFERED_FAMILY = 'xcNotOffered'

/**
 * Le libellé de ce groupe : il dit le fait, pas le jugement.
 *
 * C'est **notre** phrase et non celle de XCTrack — l'écran d'ajout n'a pas de groupe à
 * nommer, puisqu'il ne propose pas ces types. Elle suit donc l'axe `ui`, comme le reste de
 * notre prose, là où les dix autres en-têtes viennent de `catalog.familyLabel` et suivent
 * l'axe `labels`. Les deux se côtoient dans la même colonne, et c'est le seul endroit de
 * la palette où cela arrive.
 */
export function notOfferedLabel(tr: Translator): string {
  return tr.t('palette.notOffered')
}

/* --------------------------------------------------------------------- la géométrie */

/**
 * Le rectangle d'un widget neuf : `cells` × `cells` cellules, centré, aimanté sur la grille.
 *
 * Le centrage retient la **division entière** quand le reste est impair — c'est ce que
 * l'appareil a fait : 29 lignes moins 6 laissent 23, et la boussole est arrivée en ligne 11,
 * pas 12. Sur une grille plus petite que `cells`, le widget est réduit à la grille plutôt que
 * de déborder de la page.
 *
 * `snapRect` conclut : il ne change rien à des coordonnées déjà posées sur des multiples de
 * cellule (il est idempotent), mais il garantit l'invariant `x2 > x1`, `y2 > y1` quelle que
 * soit la grille — y compris une grille d'une seule cellule.
 */
export function centeredBounds(grid: Grid, cells: number = NEW_WIDGET_CELLS): Bounds {
  const spanX = Math.max(1, Math.min(cells, grid.cols))
  const spanY = Math.max(1, Math.min(cells, grid.rows))
  const col = Math.floor((grid.cols - spanX) / 2)
  const row = Math.floor((grid.rows - spanY) / 2)

  return snapRect({
    x1: Math.round((col * NORMALIZED_MAX) / grid.cols),
    y1: Math.round((row * NORMALIZED_MAX) / grid.rows),
    x2: Math.round(((col + spanX) * NORMALIZED_MAX) / grid.cols),
    y2: Math.round(((row + spanY) * NORMALIZED_MAX) / grid.rows)
  }, grid)
}

/** Le rectangle d'un widget neuf sur cet appareil et dans cette orientation. */
export function newWidgetBounds(
  device: Device, orientation: Orientation, cells: number = NEW_WIDGET_CELLS
): Bounds {
  return centeredBounds(gridFor(device, orientation), cells)
}

/** Deux rectangles qui se recouvrent exactement — donc que rien à l'écran ne distingue. */
function sameRect(a: Bounds, b: Bounds): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
}

/**
 * Le rectangle d'une **copie** : la taille du modèle, au centre de la page d'arrivée.
 *
 * ## Pourquoi la taille du modèle et non celle d'un widget neuf
 *
 * Une copie arrivait jusqu'ici au rectangle d'usine — 6 × 6 cellules, soit 19,4 × 18,0 mm sur
 * un AIR³ 7.2 en paysage. Le pilote d'essai du 22 août l'a dit ainsi : « les réglages ont bien
 * suivi, mais pas la taille ; elle arrive en carré de 2 cm par-dessus tout ». Mesuré sur
 * `2026-08-20_backup-00.xcfg` : la carte de manche copiée depuis la page paysage 2 fait
 * 113,0 × 87,2 mm chez elle et arrivait à 19,4 × 18,0 mm sur la page 1. « Une carte de 2 cm
 * n'a aucun usage. »
 *
 * `editor.ts` avait déjà tranché la question pour la duplication sur place, et dans les mêmes
 * termes : « la **taille** n'est jamais touchée : une copie est le widget, ailleurs »
 * (`duplicateRect`). La palette dit maintenant la même chose d'une page à l'autre.
 *
 * ## Position aimantée, taille intacte
 *
 * C'est la règle de `movedRect` : le coin haut-gauche tombe sur la grille de la page
 * d'arrivée, la taille reste au normalisé près, et le rectangle est ramené dans la page si le
 * centrage l'en faisait sortir. Aimanter les deux bords indépendamment aurait rogné jusqu'à
 * une cellule sur un modèle qui n'est pas posé sur la grille — un widget d'une version
 * antérieure, ou d'un appareil au maillage différent.
 *
 * ## La place peut être occupée
 *
 * Le centre l'est presque toujours : c'est le prix d'un ajout, et l'appareil fait pareil. Une
 * seule collision est corrigée, celle que rien à l'écran ne rattraperait — la copie qui
 * recouvre **exactement** un widget déjà là. Elle se décale alors d'une cellule, comme le fait
 * `duplicateRect`. Pour tout le reste, la copie est au premier plan, la barre d'outils annonce
 * son rang, et c'est au pilote de la poser où il veut.
 *
 * ## Ce que cette fonction ne sait pas
 *
 * Les coordonnées d'un widget sont **relatives à sa page** : le modèle qui occupait la moitié
 * de la largeur d'une page paysage occupera la moitié de la largeur d'une page portrait, donc
 * 87,2 mm au lieu de 155,0. Rendre les millimètres demanderait de savoir de **quelle page** le
 * modèle vient, et `PaletteSources.elsewhere` ne le porte pas — c'est la même information qui
 * manque au pilote quand il demande « d'où vient la copie ? ». En attendant, la copie garde sa
 * part de page : jamais la bonne largeur au millimètre entre deux orientations, jamais un
 * carré de 2 cm non plus.
 */
export function copiedBounds(
  model: Bounds, grid: Grid, taken: readonly Bounds[] = []
): Bounds {
  const spanX = Math.max(1, Math.min(model.x2 - model.x1, NORMALIZED_MAX))
  const spanY = Math.max(1, Math.min(model.y2 - model.y1, NORMALIZED_MAX))
  const place = (span: number, cells: number): number => {
    const centred = snapValue(Math.round((NORMALIZED_MAX - span) / 2), cells)
    return Math.min(Math.max(centred, 0), NORMALIZED_MAX - span)
  }

  const x1 = place(spanX, grid.cols)
  const y1 = place(spanY, grid.rows)
  const rect = { x1, y1, x2: x1 + spanX, y2: y1 + spanY }
  return taken.some((other) => sameRect(other, rect)) ? duplicateRect(rect, grid) : rect
}

/**
 * Le rectangle que le clic posera : celui du modèle pour une copie, le rectangle d'usine
 * pour une création. C'est aussi celui que la vignette dessine — les deux ne se séparent
 * jamais, sinon la vignette promettrait une taille que le fichier ne recevrait pas.
 */
export function entryBounds(
  entry: PaletteEntry, grid: Grid, taken: readonly Bounds[] = []
): Bounds {
  if (entry.model === undefined) return centeredBounds(grid)
  const model = readWidget(entry.model)
  return copiedBounds(model, grid, taken)
}

/* ------------------------------------------------------------------ le nœud du widget */

/**
 * Un widget neuf, réduit à ses huit clés universelles, dans l'ordre où XCTrack les écrit
 * (`CLASS`, les quatre coordonnées, puis `_border`, `_bg`, `_theme` — vérifiable sur n'importe
 * quel widget du corpus).
 *
 * `className` est pris tel quel s'il est complet ; un nom court reçoit le préfixe des widgets.
 * Un type inconnu n'est pas refusé : le format gagne des widgets à chaque version, et ce n'est
 * pas à cet éditeur de décider qu'une classe n'existe pas.
 */
export function createWidgetNode(className: string, bounds: Bounds): JsonNode {
  const full = className.includes('.') ? className : WIDGET_CLASS_PREFIX + className
  const entries: Array<[string, JsonNode]> = [
    [encode('CLASS'), { kind: 'string', raw: encode(full) }],
    [encode('X1'), { kind: 'literal', raw: String(bounds.x1) }],
    [encode('Y1'), { kind: 'literal', raw: String(bounds.y1) }],
    [encode('X2'), { kind: 'literal', raw: String(bounds.x2) }],
    [encode('Y2'), { kind: 'literal', raw: String(bounds.y2) }]
  ]
  for (const [key, raw, kind] of NEW_WIDGET_UNIVERSALS) {
    entries.push([encode(key), kind === 'string' ? { kind: 'string', raw } : { kind: 'literal', raw }])
  }
  return { kind: 'object', entries }
}

/* --------------------------------------------------------------------- les entrées */

/** Ce qui distingue les deux chemins, et ce que l'interface doit rendre visible. */
export type PaletteOrigin = 'duplicate' | 'create'

/**
 * Une page, telle que le pilote la désigne : son orientation et son rang **à partir de 1**,
 * c'est-à-dire le numéro qu'il lit sur la vue d'ensemble et sur son appareil.
 */
export interface PageRef {
  orientation: Orientation
  rank: number
}

/** Un modèle pris sur une autre page, et la page d'où il vient. */
export interface ForeignWidget {
  node: JsonNode
  page: PageRef
}

/** Le nœud d'un modèle, qu'il vienne avec sa page ou tout nu. */
function modelNode(source: JsonNode | ForeignWidget): JsonNode {
  return 'kind' in source ? source : source.node
}

/** La page d'un modèle, quand l'appelant l'a donnée. */
function modelPageOf(source: JsonNode | ForeignWidget): PageRef | undefined {
  return 'kind' in source ? undefined : source.page
}

/** Les widgets de la configuration ouverte, séparés selon ce que la palette en tire. */
export interface PaletteSources {
  /**
   * Les widgets de la **page affichée**. Ce sont eux, et eux seuls, qui allument
   * l'indicateur de présence — c'est la question que le pilote se pose en ajoutant : « en
   * ai-je déjà un **ici** ? ». Ils sont aussi les modèles préférés : dupliquer une boussole,
   * c'est dupliquer celle qu'on a sous les yeux.
   */
  onPage: readonly JsonNode[]
  /**
   * Les widgets des **autres pages**, modèles de repli. Un type qui n'existe que là reste
   * duplicable ; la ligne le dit (« ailleurs dans le fichier ») pour que le pilote sache
   * d'où viendront les réglages.
   *
   * Un nœud nu ne dit pas de quelle page il vient, et la ligne ne peut alors que dire
   * « ailleurs ». Passez un `ForeignWidget` et elle **nomme la page** — c'est ce que le
   * pilote d'essai réclamait : « "un gadget d'une autre page", laquelle ? ». Les deux
   * formes se mélangent dans le même tableau.
   */
  elsewhere: readonly (JsonNode | ForeignWidget)[]
}

/** Un type de widget proposé par la palette. */
export interface PaletteEntry {
  /** Le nom court (`WCompass`) : la clé du catalogue, et l'identité de l'entrée. */
  shortName: string
  /** La classe complète telle qu'elle sera écrite dans le fichier. */
  className: string
  /** Le libellé officiel dans la langue courante. */
  label: string
  /**
   * La famille du catalogue, qui donne l'en-tête sous lequel la ligne se range. Vaut
   * `NOT_OFFERED_FAMILY` pour tout type que l'écran d'ajout ne propose pas — famille masquée
   * comprise : voir le commentaire de cette constante.
   */
  family: string
  /** Rang du type dans sa famille, à partir de 0 : l'ordre de l'écran de XCTrack. */
  order: number
  /** Vrai si XCTrack badge le type « Pro ». */
  pro: boolean
  /** La description du catalogue, ou `undefined` : jamais un texte inventé. */
  description?: string
  /** Exemplaires **sur la page affichée** — l'indicateur de présence. */
  onPageCount: number
  /** Exemplaires dans toute la configuration ouverte, page affichée comprise. */
  count: number
  origin: PaletteOrigin
  /** Le widget dont on partira, pour une entrée `duplicate`. */
  model?: JsonNode
  /**
   * Vrai si le modèle vient de la page affichée. Faux avec un modèle : il vient d'une autre
   * page, et le pilote a le droit de savoir que les réglages copiés ne sont pas ceux qu'il a
   * sous les yeux.
   */
  modelFromPage: boolean
  /**
   * **Laquelle** de ces autres pages, quand `PaletteSources` l'a dit. Absent tant que
   * l'appelant ne passe que des nœuds nus : la ligne se contente alors d'« ailleurs ».
   */
  modelPage?: PageRef
  /**
   * Vrai si un autre type porte exactement le même libellé. Le cas est attesté :
   * « Luminosité de l'écran » désigne `WBrightnessInfo` (Système) **et** `WButtonBrightness`
   * (Boutons d'actions), deux widgets distincts (§ 3.2). Une palette indexée par libellé se
   * casserait dessus ; celle-ci est indexée par nom court, et c'est ce drapeau qui décide
   * d'**afficher** ce nom court — sur ces deux lignes-là et sur elles seules, où il est le
   * seul moyen de choisir la bonne. Voir `buildRow`.
   */
  ambiguousLabel: boolean
}

/** Un modèle utilisable : un widget dont les quatre coordonnées sont lisibles. */
function usableModel(node: JsonNode): boolean {
  if (node.kind !== 'object') return false
  const widget = readWidget(node)
  // `readWidget` retombe sur 0 quand la clé manque ; un rectangle vide trahit ce cas, et
  // `setWidgetBounds` refuserait de replacer un tel nœud. Il devient alors un type « à créer ».
  return widget.x2 > widget.x1 && widget.y2 > widget.y1
}

interface Seen {
  className: string
  count: number
  onPageCount: number
  model?: JsonNode
  modelFromPage: boolean
  modelPage?: PageRef
}

/** Dépouille les widgets d'une provenance, en tenant les deux compteurs à jour. */
function collect(
  seen: Map<string, Seen>, sources: readonly (JsonNode | ForeignWidget)[], fromPage: boolean
): void {
  for (const source of sources) {
    const node = modelNode(source)
    const widget = readWidget(node)
    if (widget.shortName === '') continue
    let entry = seen.get(widget.shortName)
    if (entry === undefined) {
      entry = { className: widget.className, count: 0, onPageCount: 0, modelFromPage: false }
      seen.set(widget.shortName, entry)
    }
    entry.count++
    if (fromPage) entry.onPageCount++
    // Le premier modèle utilisable rencontré gagne, et la page passe en premier : c'est ce
    // qui fait que dupliquer une boussole duplique celle qu'on a sous les yeux.
    if (entry.model === undefined && usableModel(node)) {
      entry.model = node
      entry.modelFromPage = fromPage
      const page = modelPageOf(source)
      if (page !== undefined) entry.modelPage = page
    }
  }
}

/**
 * La liste des types proposés, dans l'ordre de l'écran de XCTrack : famille par famille, et
 * dans chaque famille le rang du registre.
 *
 * La liste offerte est celle des **familles visibles** du catalogue — 75 types dans la
 * 1.0.3-beta5. S'y ajoutent, et seulement s'ils sont dans la configuration ouverte, les types
 * que l'écran d'ajout ne propose pas : ils forment le groupe de queue `NOT_OFFERED_FAMILY`.
 */
export function buildPaletteEntries(
  sources: PaletteSources, catalog: WidgetCatalog, language = 'fr'
): PaletteEntry[] {
  const seen = new Map<string, Seen>()
  collect(seen, sources.onPage, true)
  collect(seen, sources.elsewhere, false)

  const families = catalog.visibleFamilies()
  const familyRank = new Map<string, number>()
  families.forEach((family, rank) => familyRank.set(family.id, rank))

  /** Les types offerts, plus ceux que le fichier impose — sans doublon, sans ordre encore. */
  const shortNames = new Set<string>()
  for (const family of families) for (const shortName of family.widgets) shortNames.add(shortName)
  for (const shortName of seen.keys()) shortNames.add(shortName)

  const entries: PaletteEntry[] = []
  for (const shortName of shortNames) {
    const found = seen.get(shortName)
    const catalogued = catalog.catalogEntry(shortName)
    const offered = catalogued !== undefined && familyRank.has(catalogued.family)
    const description = catalog.widgetDescription(shortName)
    entries.push({
      shortName,
      className: found?.className ?? WIDGET_CLASS_PREFIX + shortName,
      label: readableName(shortName, language),
      family: offered ? catalogued.family : NOT_OFFERED_FAMILY,
      order: offered ? catalogued.order : 0,
      pro: catalog.isProWidget(shortName),
      ...(description === undefined ? {} : { description }),
      onPageCount: found?.onPageCount ?? 0,
      count: found?.count ?? 0,
      origin: found?.model === undefined ? 'create' : 'duplicate',
      ...(found?.model === undefined ? {} : { model: found.model }),
      modelFromPage: found?.modelFromPage ?? false,
      ...(found?.modelPage === undefined ? {} : { modelPage: found.modelPage }),
      ambiguousLabel: false
    })
  }

  const byLabel = new Map<string, number>()
  for (const entry of entries) byLabel.set(entry.label, (byLabel.get(entry.label) ?? 0) + 1)
  for (const entry of entries) entry.ambiguousLabel = (byLabel.get(entry.label) ?? 0) > 1

  // Le groupe de queue passe après les dix familles ; à l'intérieur, faute de rang au
  // registre, l'ordre alphabétique du libellé — le seul qui ne dépende pas du fichier lu.
  const rank = (entry: PaletteEntry): number => familyRank.get(entry.family) ?? families.length
  entries.sort((a, b) => (
    rank(a) - rank(b) ||
    a.order - b.order ||
    a.label.localeCompare(b.label, 'fr') ||
    a.shortName.localeCompare(b.shortName)
  ))
  return entries
}

/* ------------------------------------------------------------------- la fabrication */

/** Le widget produit par un choix, et la phrase qui décrit ce qui a été fait. */
export interface PaletteChoice {
  node: JsonNode
  /** Prête pour l'historique d'annulation (« Annuler : Ajouter… »). */
  description: string
  entry: PaletteEntry
}

/**
 * Fabrique le widget d'une entrée. Deux chemins, deux phrases : l'interface ne doit jamais
 * laisser croire qu'un widget créé de toutes pièces vaut une copie.
 *
 * Chaque appel rend un nœud **indépendant** — cliquer deux fois pose deux widgets, et le modèle
 * dupliqué n'est jamais partagé avec sa copie.
 */
/**
 * La phrase d'historique d'une copie. Trois cas, du plus précis au plus vague : le gadget de
 * cette page, celui d'une page **nommée**, celui d'« une autre page » quand l'appelant n'a
 * pas dit laquelle.
 *
 * Chaque cas est une phrase entière : un nom d'orientation glissé dans un trou ne s'accorde
 * pas dans les cinq langues.
 */
function copyDescription(entry: PaletteEntry, tr: Translator): string {
  if (entry.modelFromPage) return tr.t('palette.addCopyFromPage', { name: entry.label })
  const page = entry.modelPage
  if (page === undefined) return tr.t('palette.addCopyFromElsewhere', { name: entry.label })
  return page.orientation === 'landscape'
    ? tr.t('palette.addCopyFromLandscape', { name: entry.label, rank: page.rank })
    : tr.t('palette.addCopyFromPortrait', { name: entry.label, rank: page.rank })
}

export function buildWidget(
  entry: PaletteEntry, bounds: Bounds, tr?: Translator
): PaletteChoice {
  const say = prose(tr)
  // `entry.label` est le libellé de XCTrack : il traverse la phrase par un repère nommé,
  // dans la langue du fichier ouvert, jamais dans celle de l'interface.
  if (entry.model !== undefined) {
    return {
      node: duplicateWidget(entry.model, bounds),
      description: copyDescription(entry, say),
      entry
    }
  }
  return {
    node: createWidgetNode(entry.className, bounds),
    description: say.t('palette.addNew', { name: entry.label }),
    entry
  }
}

/* ---------------------------------------------------------------------- la vignette */

/** Un relevé de `widgetDefaults.json` traduit en nœud JSON, pour le seul besoin du dessin. */
function jsonFromDefault(value: DefaultValue): JsonNode {
  if (typeof value === 'string') return { kind: 'string', raw: encode(value) }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'literal', raw: String(value) }
  }
  if (Array.isArray(value)) return { kind: 'array', items: value.map(jsonFromDefault) }
  return {
    kind: 'object',
    entries: Object.entries(value as DefaultObject)
      .map(([key, item]): [string, JsonNode] => [encode(key), jsonFromDefault(item)])
  }
}

/**
 * Le nœud que la vignette dessine.
 *
 * **Duplication : exactement le nœud que le clic posera.** La vignette est alors une promesse
 * tenue au pixel — le pilote voit sa carte, avec son échelle, sa trace et son thème, avant de
 * l'ajouter.
 *
 * **Création : le nœud posé, plus les défauts relevés sur l'appareil.** C'est la seule
 * différence entre les deux fonctions, et elle est délibérée. Ce que le fichier reçoit reste
 * minimal — huit clés, voir `createWidgetNode` — parce qu'une clé omise est corrigée par
 * XCTrack alors qu'une clé fausse ne l'est pas. Mais une vignette dessinée sur ces huit clés
 * seules mentirait dans l'autre sens : elle montrerait un `WTime` sans secondes et un
 * `WSpeed` sans unité, là où l'appareil complétera `showSec: true` et `_unit: true` dès la
 * première lecture. `widgetDefaults.json` est précisément le relevé de cette complétion, fait
 * sur les 75 types de l'écran d'ajout. La vignette montre donc l'écran que le pilote aura, et
 * le fichier garde les octets les plus sûrs.
 */
export function previewNode(entry: PaletteEntry, bounds: Bounds): JsonNode {
  if (entry.model !== undefined) return duplicateWidget(entry.model, bounds)

  const node = createWidgetNode(entry.className, bounds)
  const defaults = defaultsFor(entry.shortName)
  if (defaults !== undefined && node.kind === 'object') {
    for (const [key, value] of Object.entries(defaults)) {
      node.entries.push([encode(key), jsonFromDefault(value)])
    }
  }
  return node
}

/** Ce que la vignette peut montrer, et ce qu'il faut en dire au pilote. */
export type PreviewKind =
  /** L'éditeur a un dessin dédié pour ce type : la vignette approche l'appareil. */
  | 'drawn'
  /** Repli générique : le titre et un tiret, faute de dessin dédié. */
  | 'generic'
  /** L'appareil lui-même ne peint rien au repos — la case vide est le vrai rendu. */
  | 'blank'

export function previewKind(shortName: string): PreviewKind {
  if (isBlankAtRest(shortName)) return 'blank'
  return isRegistered(shortName) ? 'drawn' : 'generic'
}

/** La clé de la phrase qui accompagne chaque sorte de vignette. */
const PREVIEW_NOTE_KEYS = {
  drawn: 'palette.previewDrawn',
  generic: 'palette.previewGeneric',
  blank: 'palette.previewBlank'
} as const

/** La phrase qui accompagne chaque sorte de vignette. Aucune case vide sans explication. */
export function previewNote(kind: PreviewKind, tr: Translator): string {
  return tr.t(PREVIEW_NOTE_KEYS[kind])
}

/**
 * La vignette d'une entrée : la page dessinée par notre moteur, puis **recadrée sur le seul
 * rectangle du widget** en resserrant le `viewBox` du `<svg>` que `renderPage` rend.
 *
 * ## Pourquoi un rendu, et non une capture de l'appareil
 *
 * Découper 75 vignettes dans les planches de l'AIR³ donnerait l'image vraie. Le prix en est
 * triple, et chacun des trois est rédhibitoire ici : 75 images à porter dans un dépôt public
 * alors que les planches vivent dans le dépôt **privé** — une cellule `WLocation` y affiche
 * des coordonnées GPS réelles, et il a déjà fallu faire purger des images de ce dépôt-ci ;
 * des images **figées**, qui ne suivraient aucune correction de rendu et mentiraient dès la
 * version suivante de XCTrack ; et surtout une vignette qui ne pourrait montrer que le widget
 * *par défaut*, jamais **celui du pilote** — or c'est justement ce que la duplication conserve
 * et que la palette doit rendre visible.
 *
 * Le moteur, lui, ne coûte aucun octet de plus : `render/canvas.ts` et les treize dessins de
 * `render/widgets/` sont déjà dans le morceau principal, chargés par la vue de la page.
 *
 * ## Le recadrage
 *
 * `renderPage` rend un `<svg viewBox="0 0 1280 720">` qui contient la page entière. Poser sur
 * ce `viewBox` le rectangle du widget donne un zoom exact, sans toucher au moteur : la taille
 * du titre, l'épaisseur des traits et les proportions restent celles qu'aura la page. Les
 * quatre nombres sortent de `widgetWidthPx` / `widgetHeightPx`, les deux seules fonctions qui
 * savent convertir des coordonnées normalisées dans le repère de rendu.
 */
export function renderThumbnail(
  entry: PaletteEntry, bounds: Bounds, aspectRatio: number,
  settings: RenderSettings, language: string, tr: Translator
): SVGSVGElement {
  const node = previewNode(entry, bounds)
  const page: Page = {
    node: { kind: 'object', entries: [] },
    className: '',
    widgets: [readWidget(node)],
    navigations: { kind: 'none' }
  }
  const scene = renderPage(page, aspectRatio, settings, language, tr)

  const at = (x1: number, y1: number, x2: number, y2: number): { w: number; h: number } => ({
    w: widgetWidthPx({ x1, y1, x2, y2, background: 0 }, aspectRatio),
    h: widgetHeightPx({ x1, y1, x2, y2, background: 0 }, aspectRatio)
  })
  const offset = at(0, 0, bounds.x1, bounds.y1)
  const size = at(bounds.x1, bounds.y1, bounds.x2, bounds.y2)
  scene.setAttribute('viewBox', `${offset.w} ${offset.h} ${size.w} ${size.h}`)
  // Purement décorative : tout ce qu'elle montre, l'intitulé de la ligne le dit en toutes
  // lettres — nom, famille, présence, badge Pro, et la nature de l'aperçu.
  scene.setAttribute('aria-hidden', 'true')
  scene.setAttribute('focusable', 'false')
  return scene
}

/* -------------------------------------------------------------------------- le rendu */

export interface WidgetPaletteOptions {
  /** Les widgets de la configuration ouverte, séparés page / reste — voir `PaletteSources`. */
  sources: PaletteSources
  /** Le catalogue **déjà chargé**, dans la langue de la session : familles, ordre, Pro. */
  catalog: WidgetCatalog
  device: Device
  orientation: Orientation
  /** Les préférences du fichier ouvert : les vignettes se dessinent avec, comme la page. */
  settings: RenderSettings
  /**
   * La langue des **libellés de XCTrack** — celle du fichier ouvert. Elle nomme les types
   * de gadgets et les familles, jamais notre prose : voir `tr`, et `src/i18n/axes.ts`.
   */
  language?: string
  /**
   * Le traducteur de **notre prose**, dans la langue que le pilote a choisie. Indépendant
   * de `language` : la légende se lit en français pendant que « Compass and wind » reste
   * en anglais, parce que c'est ce que l'appareil affiche.
   *
   * Optionnel le temps que `main.ts` le passe — voir `prose` en tête de ce module.
   */
  tr?: Translator
  /** Appelé au choix d'un type, avec un nœud neuf prêt pour `insertWidget`. */
  onChoose?: (node: JsonNode, description: string) => void
}

export interface WidgetPalette {
  element: HTMLElement
  entries: PaletteEntry[]
  /** Filtre la liste. Chaîne vide : tout est visible. */
  filter: (query: string) => void
  /** Restreint aux types déjà présents dans le fichier, cumulable avec la recherche. */
  showOnlyPresent: (only: boolean) => void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Minuscules sans accents : « boussole » doit se trouver en tapant « bous », « ELEC » aussi. */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

interface Row {
  element: HTMLElement
  haystack: string
  present: boolean
}

interface Group {
  family: string
  head: HTMLElement
  count: HTMLElement
  rows: Row[]
}

let paletteCount = 0

/**
 * Rend la palette. Aucun lien avec le reste de l'interface : elle produit un élément et
 * rappelle `onChoose` avec un nœud prêt à être passé à `insertWidget`. C'est l'appelant qui
 * décide de la page, du rang d'empilement et de l'enregistrement dans l'historique.
 */
export function renderWidgetPalette(options: WidgetPaletteOptions): WidgetPalette {
  const language = options.language ?? 'fr'
  const tr = prose(options.tr)
  const entries = buildPaletteEntries(options.sources, options.catalog, language)
  const id = `palette-${++paletteCount}`
  const present = entries.filter((entry) => entry.origin === 'duplicate').length

  const root = el('section', 'palette')
  const head = el('header', 'palette__head')
  head.append(
    el('h2', 'palette__title', tr.t('palette.title')),
    el('p', 'palette__count', tr.t('palette.typeCount', { count: entries.length }))
  )
  root.append(head)

  const tools = el('div', 'palette__tools')
  const search = el('input', 'palette__search')
  search.type = 'search'
  search.id = `${id}-search`
  search.placeholder = tr.t('palette.search')
  // La recherche porte sur le nom lisible ET sur le nom technique (`WCompMap`,
  // `org.xcontest…`) : le dire ainsi, parce que « classe » est notre mot.
  search.setAttribute('aria-label', tr.t('palette.searchAria'))
  tools.append(search)

  // La case rend en un clic la liste courte que l'ancien groupement par présence donnait
  // gratuitement — voir l'en-tête du module. Elle est absente quand il n'y a rien à filtrer.
  let onlyBox: HTMLInputElement | undefined
  if (present > 0) {
    const label = el('label', 'palette__only')
    onlyBox = el('input', 'palette__only-input')
    onlyBox.type = 'checkbox'
    onlyBox.id = `${id}-only`
    label.htmlFor = onlyBox.id
    label.append(
      onlyBox, el('span', undefined, tr.t('palette.onlyPresent', { count: present }))
    )
    label.title = tr.t('palette.onlyPresentHelp')
    tools.append(label)
  }
  root.append(tools)

  root.append(el('p', 'palette__legend', tr.t('palette.legend')))

  const empty = el('p', 'palette__empty', tr.t('palette.noMatch'))
  empty.hidden = true
  empty.setAttribute('role', 'status')
  root.append(empty)

  const list = el('div', 'palette__list')
  const groups: Group[] = []
  const grid = gridFor(options.device, options.orientation)
  // Ce que la page d'arrivée porte déjà : la seule chose dont `copiedBounds` a besoin pour
  // ne pas poser une copie exactement sur son jumeau.
  const taken = options.sources.onPage.map((node) => readWidget(node))
  const aspectRatio = aspectRatioOf(options.device, options.orientation)

  const familyIds = [
    ...options.catalog.visibleFamilies().map((family) => family.id),
    NOT_OFFERED_FAMILY
  ]
  for (const family of familyIds) {
    const own = entries.filter((entry) => entry.family === family)
    if (own.length === 0) continue

    const groupHead = el('h3', 'palette__group')
    groupHead.dataset.family = family
    groupHead.append(el(
      'span', 'palette__group-name',
      family === NOT_OFFERED_FAMILY
        ? notOfferedLabel(tr)
        : options.catalog.familyLabel(family)
    ))
    const count = el('span', 'palette__group-count', String(own.length))
    groupHead.append(count)
    list.append(groupHead)

    const group: Group = { family, head: groupHead, count, rows: [] }
    for (const entry of own) {
      // Un rectangle par ligne, et non plus un pour toutes : une copie garde la taille de
      // son modèle, une création prend celle d'usine.
      const element = buildRow(
        entry, options, entryBounds(entry, grid, taken), aspectRatio, language, tr
      )
      group.rows.push({
        element,
        haystack: normalize(`${entry.label} ${entry.shortName} ${entry.className}`),
        present: entry.origin === 'duplicate'
      })
      list.append(element)
    }
    groups.push(group)
  }

  let query = ''
  let onlyPresent = false

  /**
   * Le filtre masque aussi les **en-têtes de famille devenus vides**, et met à jour le compte
   * de ceux qui restent. L'écran natif, lui, laisse tous ses en-têtes en place — le relevé
   * (§ 3.1) qualifie lui-même la liste ainsi filtrée de « trompeuse » : dix titres de famille
   * suivis de deux lignes font croire que la recherche n'a rien vu. On ne copie pas ce
   * défaut-là. Un en-tête visible a donc toujours au moins une ligne sous lui, et son compte
   * dit combien.
   */
  function apply(): void {
    const needle = normalize(query.trim())
    let visible = 0
    for (const group of groups) {
      let shown = 0
      for (const row of group.rows) {
        const hidden = (needle !== '' && !row.haystack.includes(needle)) ||
          (onlyPresent && !row.present)
        row.element.hidden = hidden
        if (!hidden) shown++
      }
      group.head.hidden = shown === 0
      group.count.textContent = String(shown)
      visible += shown
    }
    empty.hidden = visible > 0
  }

  function filter(value: string): void {
    query = value
    apply()
  }

  function showOnlyPresent(only: boolean): void {
    onlyPresent = only
    if (onlyBox !== undefined && onlyBox.checked !== only) onlyBox.checked = only
    apply()
  }

  search.addEventListener('input', () => { filter(search.value) })
  onlyBox?.addEventListener('change', () => { showOnlyPresent(onlyBox.checked) })

  root.append(list)
  return { element: root, entries, filter, showOnlyPresent }
}

/**
 * L'intitulé lu par l'assistance vocale : tout ce que la ligne montre, en toutes lettres.
 *
 * Les trois premiers morceaux viennent de XCTrack — libellé, nom court, famille — et les
 * suivants sont de nous : c'est la ligne où les deux axes se touchent le plus, et ils s'y
 * juxtaposent sans jamais se mélanger. Le `', '` est celui d'une **fiche**, pas d'une
 * énumération de prose : `format.list` y ferait lire « … et sera créé ».
 */
function spokenCopy(entry: PaletteEntry, tr: Translator): string {
  if (entry.modelFromPage) return tr.t('palette.spokenCopyFromPage')
  const page = entry.modelPage
  if (page === undefined) return tr.t('palette.spokenCopyFromElsewhere')
  return page.orientation === 'landscape'
    ? tr.t('palette.spokenCopyFromLandscape', { rank: page.rank })
    : tr.t('palette.spokenCopyFromPortrait', { rank: page.rank })
}

function spokenLabel(entry: PaletteEntry, familyLabel: string, tr: Translator): string {
  // Le nom court suit ce que la ligne montre : sur les homonymes seulement. L'assistance
  // vocale ne doit ni en dire moins — les deux « Luminosité de l'écran » seraient alors
  // indiscernables à l'oreille —, ni en dire plus que l'œil ne voit.
  const parts = entry.ambiguousLabel
    ? [entry.label, entry.shortName, familyLabel]
    : [entry.label, familyLabel]
  if (entry.pro) parts.push(tr.t('palette.spokenPro'))
  if (entry.onPageCount > 0) {
    parts.push(entry.onPageCount > 1
      ? tr.t('palette.spokenHereCount', { count: entry.onPageCount })
      : tr.t('palette.spokenHereOnce'))
  }
  parts.push(entry.origin === 'duplicate' ? spokenCopy(entry, tr) : tr.t('palette.spokenCreate'))
  return parts.join(', ')
}

/** La marque de provenance : la page nommée si on la connaît, « ailleurs » sinon. */
function elsewhereMark(entry: PaletteEntry, tr: Translator): string {
  const page = entry.modelPage
  if (page === undefined) return tr.t('palette.elsewhere')
  return page.orientation === 'landscape'
    ? tr.t('palette.elsewhereOnLandscape', { rank: page.rank })
    : tr.t('palette.elsewhereOnPortrait', { rank: page.rank })
}

/**
 * Les gadgets dont le **libellé de XCTrack** emploie un mot qu'un pilote ne peut pas
 * connaître, et que nous éclairons à côté sans jamais le remplacer.
 *
 * La table reste minuscule à dessein : un mot n'y entre que si un pilote a buté dessus.
 * Le seul jusqu'ici est *intention*, calque littéral d'*intent* — le mécanisme par lequel
 * une application Android en fait réagir une autre.
 */
const GLOSSED_WIDGETS: Readonly<Record<string, 'palette.intentGloss' | undefined>> = {
  WButtonIntentLauncher: 'palette.intentGloss'
}

/**
 * Une ligne : la vignette, le libellé officiel, le nom court qui lève toute ambiguïté, la
 * description du catalogue, et les marques — Pro, présence, nombre d'exemplaires.
 */
function buildRow(
  entry: PaletteEntry, options: WidgetPaletteOptions,
  bounds: Bounds, aspectRatio: number, language: string, tr: Translator
): HTMLElement {
  const row = el('button', 'palette__entry')
  row.type = 'button'
  row.dataset.widget = entry.shortName
  row.dataset.origin = entry.origin
  row.dataset.family = entry.family
  // Les deux faits, lisibles depuis un test ou un harnais sans dépendre du style.
  row.dataset.onPage = entry.onPageCount > 0 ? 'oui' : 'non'
  const kind = previewKind(entry.shortName)
  row.dataset.preview = kind
  if (entry.ambiguousLabel) row.dataset.ambiguous = 'true'
  const familyLabel = entry.family === NOT_OFFERED_FAMILY
    ? notOfferedLabel(tr)
    : options.catalog.familyLabel(entry.family)
  row.setAttribute('aria-label', spokenLabel(entry, familyLabel, tr))

  const thumb = el('span', 'palette__thumb')
  thumb.dataset.preview = kind
  thumb.title = previewNote(kind, tr)
  thumb.append(renderThumbnail(entry, bounds, aspectRatio, options.settings, language, tr))
  // « rien à voir » écrit noir sur blanc plutôt qu'un cadre vide sans explication : le titre
  // au survol dit pourquoi, le texte dit qu'il n'y a pas d'erreur.
  // Deux cases quasi vides, deux causes opposées, et un pilote ne peut pas les deviner :
  // « rien au repos » est un fait de l'appareil — rassurant —, « aperçu non dessiné » est
  // notre limite. Les confondre est exactement ce que ce projet existe pour éviter.
  if (kind === 'blank') {
    thumb.append(el('span', 'palette__thumb-note', tr.t('palette.nothingAtRest')))
  }
  if (kind === 'generic') {
    thumb.append(el('span', 'palette__thumb-note', tr.t('palette.notDrawn')))
  }
  row.append(thumb)

  const text = el('span', 'palette__text')
  text.append(el('span', 'palette__name', entry.label))
  // Le nom court ne s'écrit que sur les **homonymes**, et c'est un revirement mesuré.
  // Il s'écrivait sur chaque ligne — 75 fois, sous le nom officiel et au-dessus de la
  // description, coupant la ligne en deux —, au motif que le pilote qui compare deux
  // sauvegardes le cherche. Un pilote-testeur a compté le 2026-08-22 : « soixante-quinze
  // fois ». Sur 75 lignes, 2 en ont besoin — « Luminosité de l'écran » désigne à la fois
  // `WBrightnessInfo` et `WButtonBrightness` —, et sur ces deux-là il est le SEUL moyen de
  // choisir la bonne. Les 73 autres le donnaient à un lecteur qui avait déjà la réponse.
  // Ce qui n'est pas perdu : `haystack` cherche toujours sur le nom court, et la palette
  // le dit — « Rechercher un gadget par son nom, ou par le nom qu'il porte dans le fichier ».
  if (entry.ambiguousLabel) text.append(el('span', 'palette__short', entry.shortName))
  if (entry.description !== undefined) {
    text.append(el('span', 'palette__desc', entry.description))
  }
  // Notre glose, **après** la description de XCTrack et jamais à sa place : le nom du
  // gadget reste ce que l'appareil affiche — « Lanceur d'intention » —, et la phrase qui
  // éclaire le mot se voit être de nous. Un pilote-testeur l'a demandée le 2026-08-22 :
  // « "Intention" est la traduction littérale d'intent. En français ça ne veut rien dire
  // du tout. » Le libellé ne se réécrit pas pour autant : c'est celui qu'il lira sur son
  // appareil, et lui en donner un autre le rendrait introuvable là-bas.
  const gloss = GLOSSED_WIDGETS[entry.shortName]
  if (gloss !== undefined) text.append(el('span', 'palette__gloss', tr.t(gloss)))
  row.append(text)

  const marks = el('span', 'palette__marks')
  if (entry.pro) {
    const pro = el('span', 'palette__pro', tr.t('palette.pro'))
    pro.title = tr.t('palette.proHelp')
    marks.append(pro)
  }
  if (entry.onPageCount > 0) {
    const here = el('span', 'palette__here')
    here.append(
      el('span', 'palette__dot'),
      el('span', undefined, entry.onPageCount > 1
        ? tr.t('palette.hereCount', { count: entry.onPageCount })
        : tr.t('palette.hereOnce'))
    )
    here.title = entry.onPageCount > 1
      ? tr.t('palette.hereCountHelp', { count: entry.onPageCount })
      : tr.t('palette.hereOnceHelp')
    marks.append(here)
  } else if (entry.count > 0) {
    // « ailleurs » ne suffit pas quand le pilote a deux cartes réglées différemment : la
    // marque nomme la page dès que `PaletteSources` la donne.
    const elsewhere = el('span', 'palette__elsewhere', elsewhereMark(entry, tr))
    elsewhere.title = tr.t('palette.elsewhereHelp', { count: entry.count })
    marks.append(elsewhere)
  }
  if (marks.childElementCount > 0) row.append(marks)

  row.addEventListener('click', () => {
    const choice = buildWidget(entry, bounds, tr)
    options.onChoose?.(choice.node, choice.description)
  })
  return row
}
