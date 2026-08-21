import { encode } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { WidgetCatalog } from '../catalog/widgetCatalog'
import { defaultsFor, type DefaultObject, type DefaultValue } from '../catalog/widgetDefaults'
import { gridFor, snapRect, NORMALIZED_MAX, type Grid, type Orientation } from '../model/grid'
import { duplicateWidget, type Bounds } from '../model/mutations'
import type { Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import { readWidget } from '../model/widget'
import { renderPage, widgetHeightPx, widgetWidthPx } from '../render/canvas'
import { isBlankAtRest, isRegistered } from '../render/registry'
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
 * nouveau widget en est une **copie profonde** (`duplicateWidget`), replacée au centre. Tous
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

/** Le libellé de ce groupe : il dit le fait, pas le jugement. */
export const NOT_OFFERED_LABEL = 'Présents dans le fichier, non proposés par XCTrack'

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
   */
  elsewhere: readonly JsonNode[]
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
   * Vrai si un autre type porte exactement le même libellé. Le cas est attesté :
   * « Luminosité de l'écran » désigne `WBrightnessInfo` (Système) **et** `WButtonBrightness`
   * (Boutons d'actions), deux widgets distincts (§ 3.2). Une palette indexée par libellé se
   * casserait dessus ; celle-ci est indexée par nom court, et affiche ce nom court sur chaque
   * ligne — ce qui suffit à les distinguer à l'œil comme au test.
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
}

/** Dépouille les widgets d'une provenance, en tenant les deux compteurs à jour. */
function collect(seen: Map<string, Seen>, nodes: readonly JsonNode[], fromPage: boolean): void {
  for (const node of nodes) {
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
export function buildWidget(entry: PaletteEntry, bounds: Bounds): PaletteChoice {
  if (entry.model !== undefined) {
    const origin = entry.modelFromPage ? 'de cette page' : 'd’une autre page'
    return {
      node: duplicateWidget(entry.model, bounds),
      description: `Ajouter « ${entry.label} » — copie d’un gadget ${origin}`,
      entry
    }
  }
  return {
    node: createWidgetNode(entry.className, bounds),
    description: `Ajouter « ${entry.label} » — gadget neuf, réglages laissés à XCTrack`,
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

/** La phrase qui accompagne chaque sorte de vignette. Aucune case vide sans explication. */
export const PREVIEW_NOTES: Record<PreviewKind, string> = {
  drawn:
    'Aperçu dessiné par l’éditeur d’après les réglages du gadget. Les valeurs affichées ' +
    'sont des exemples fixes : rien n’est calculé depuis un vol.',
  generic:
    'Cet éditeur n’a pas de dessin dédié pour ce type : la vignette montre son titre et un ' +
    'tiret à la place de la valeur. Sur l’appareil, il affichera ses données de vol.',
  blank:
    'Ce type ne peint rien au repos sur l’appareil : la vignette est vide parce que l’écran ' +
    'l’est aussi tant qu’aucun message n’est arrivé.'
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
  settings: RenderSettings, language: string
): SVGSVGElement {
  const node = previewNode(entry, bounds)
  const page: Page = {
    node: { kind: 'object', entries: [] },
    className: '',
    widgets: [readWidget(node)],
    navigations: { kind: 'none' }
  }
  const scene = renderPage(page, aspectRatio, settings, language)

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
  language?: string
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
  const entries = buildPaletteEntries(options.sources, options.catalog, language)
  const id = `palette-${++paletteCount}`
  const present = entries.filter((entry) => entry.origin === 'duplicate').length

  const root = el('section', 'palette')
  const head = el('header', 'palette__head')
  head.append(
    el('h2', 'palette__title', 'Ajouter un gadget'),
    el('p', 'palette__count', `${entries.length} types`)
  )
  root.append(head)

  const tools = el('div', 'palette__tools')
  const search = el('input', 'palette__search')
  search.type = 'search'
  search.id = `${id}-search`
  search.placeholder = 'Rechercher un gadget'
  search.setAttribute('aria-label', 'Rechercher un gadget par nom ou par classe')
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
    label.append(onlyBox, el('span', undefined, `Déjà dans le fichier (${present})`))
    label.title =
      'Ces types-là seront copiés d’un gadget que XCTrack a lui-même écrit : tous leurs ' +
      'réglages sont conservés, y compris ceux que cet éditeur ne sait pas présenter.'
    tools.append(label)
  }
  root.append(tools)

  root.append(el(
    'p', 'palette__legend',
    'Liseré plein : le gadget sera copié d’un exemplaire déjà présent dans le fichier, ' +
    'avec tous ses réglages. ' +
    'Liseré pointillé : il sera créé avec ses seules clés universelles, XCTrack complétant ' +
    'le reste à la lecture. La vignette montre, dans les deux cas, ce que le clic posera.'
  ))

  const empty = el('p', 'palette__empty', 'Aucun gadget ne porte ce nom.')
  empty.hidden = true
  empty.setAttribute('role', 'status')
  root.append(empty)

  const list = el('div', 'palette__list')
  const groups: Group[] = []
  const bounds = newWidgetBounds(options.device, options.orientation)
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
      family === NOT_OFFERED_FAMILY ? NOT_OFFERED_LABEL : options.catalog.familyLabel(family)
    ))
    const count = el('span', 'palette__group-count', String(own.length))
    groupHead.append(count)
    list.append(groupHead)

    const group: Group = { family, head: groupHead, count, rows: [] }
    for (const entry of own) {
      const element = buildRow(entry, options, bounds, aspectRatio, language)
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

/** L'intitulé lu par l'assistance vocale : tout ce que la ligne montre, en toutes lettres. */
function spokenLabel(entry: PaletteEntry, familyLabel: string): string {
  const parts = [entry.label, entry.shortName, familyLabel]
  if (entry.pro) parts.push('licence Pro')
  if (entry.onPageCount > 0) {
    parts.push(entry.onPageCount > 1
      ? `déjà ${entry.onPageCount} fois sur cette page`
      : 'déjà sur cette page')
  }
  parts.push(entry.origin === 'duplicate'
    ? (entry.modelFromPage
        ? 'sera copié avec les réglages du gadget de cette page'
        : 'sera copié avec les réglages d’un gadget d’une autre page')
    : 'sera créé avec ses seules clés universelles')
  return parts.join(', ')
}

/**
 * Une ligne : la vignette, le libellé officiel, le nom court qui lève toute ambiguïté, la
 * description du catalogue, et les marques — Pro, présence, nombre d'exemplaires.
 */
function buildRow(
  entry: PaletteEntry, options: WidgetPaletteOptions,
  bounds: Bounds, aspectRatio: number, language: string
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
    ? NOT_OFFERED_LABEL
    : options.catalog.familyLabel(entry.family)
  row.setAttribute('aria-label', spokenLabel(entry, familyLabel))

  const thumb = el('span', 'palette__thumb')
  thumb.dataset.preview = kind
  thumb.title = PREVIEW_NOTES[kind]
  thumb.append(renderThumbnail(entry, bounds, aspectRatio, options.settings, language))
  // « rien à voir » écrit noir sur blanc plutôt qu'un cadre vide sans explication : le titre
  // au survol dit pourquoi, le texte dit qu'il n'y a pas d'erreur.
  if (kind === 'blank') thumb.append(el('span', 'palette__thumb-note', 'rien au repos'))
  row.append(thumb)

  const text = el('span', 'palette__text')
  text.append(el('span', 'palette__name', entry.label))
  // Le nom court est affiché sur CHAQUE ligne, pas seulement sur les homonymes : c'est lui
  // qu'on retrouve dans le fichier, et le pilote qui compare deux sauvegardes le cherche.
  text.append(el('span', 'palette__short', entry.shortName))
  if (entry.description !== undefined) {
    text.append(el('span', 'palette__desc', entry.description))
  }
  row.append(text)

  const marks = el('span', 'palette__marks')
  if (entry.pro) {
    const pro = el('span', 'palette__pro', 'Pro')
    pro.title = 'XCTrack réserve ce gadget à la licence Pro.'
    marks.append(pro)
  }
  if (entry.onPageCount > 0) {
    const here = el('span', 'palette__here')
    here.append(
      el('span', 'palette__dot'),
      el('span', undefined, entry.onPageCount > 1
        ? `déjà ici × ${entry.onPageCount}`
        : 'déjà ici')
    )
    here.title = entry.onPageCount > 1
      ? `${entry.onPageCount} exemplaires de ce type sont déjà sur la page affichée.`
      : 'Ce type est déjà sur la page affichée.'
    marks.append(here)
  } else if (entry.count > 0) {
    const elsewhere = el('span', 'palette__elsewhere', 'ailleurs')
    elsewhere.title =
      `Absent de cette page, mais présent ${entry.count} fois ailleurs dans le fichier : ` +
      'la copie partira de ce gadget-là, avec ses réglages.'
    marks.append(elsewhere)
  }
  if (marks.childElementCount > 0) row.append(marks)

  row.addEventListener('click', () => {
    const choice = buildWidget(entry, bounds)
    options.onChoose?.(choice.node, choice.description)
  })
  return row
}
