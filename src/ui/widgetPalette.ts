import { encode } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import { WIDGET_OPTIONS } from '../catalog/widgetOptions'
import { gridFor, snapRect, NORMALIZED_MAX, type Grid, type Orientation } from '../model/grid'
import { duplicateWidget, type Bounds } from '../model/mutations'
import { readWidget } from '../model/widget'

/**
 * La palette d'ajout d'un gadget — l'équivalent de l'écran « Ajouter Gadget » de XCTrack
 * (`docs/reference/edition-native-exploration.md` § 3).
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
 * Nous **aurions pu** en écrire davantage : le catalogue extrait du bytecode donne une valeur
 * par défaut pour 40 de ses 225 options (`WidgetOption.default`), et les trois que l'on peut
 * confronter au relevé sur l'appareil tombent juste — `WCompass` : `rotation = HEADING` (« Cap
 * vers le haut »), `navigation_target = OPTIMIZED`, `windStyle = NONE`. La tentation est réelle.
 * Elle est refusée pour deux raisons :
 *
 * 1. **L'omission est strictement plus sûre que l'erreur.** Une clé absente est remplacée par
 *    XCTrack par la valeur juste ; une clé présente et fausse est conservée telle quelle et
 *    devient un réglage erroné que rien ne signale. Le catalogue ne couvre que les énumérations,
 *    et 40 options sur 225 : écrire ce sous-ensemble ne dispenserait de toute façon pas de la
 *    complétion par l'application.
 * 2. **Trois défauts vérifiés sur un seul type ne font pas une preuve** pour 84 types. Le relevé
 *    dit d'ailleurs lui-même que la taille par défaut, elle, varie selon le type (10 × 10 pour
 *    un assistant thermique contre 6 × 6 pour une boussole) : ce qui vaut pour la boussole ne
 *    vaut pas mécaniquement pour les autres.
 *
 * **Ce qui reste ouvert, et que ce module ne tranche pas** : nul n'a vérifié sur l'appareil
 * qu'un widget réduit à ses huit clés universelles est relu sans broncher. L'observation du § 6
 * porte sur des widgets *anciens auxquels des clés manquaient*, pas sur un widget minimal. Le
 * mécanisme est le même — un désérialiseur qui lit clé par clé avec un défaut de repli — mais
 * c'est une déduction, pas une mesure. L'interface le dit au pilote plutôt que de le taire, et
 * la palette pousse toujours la duplication en tête de liste.
 *
 * ## Ce que ce module n'a pas, faute de données
 *
 * La liste native porte pour chaque entrée une **description**, une **catégorie** (10 en tout)
 * et parfois un **badge Pro**. Rien de tout cela ne figure dans les catalogues extraits
 * (`widgetLabels.json` n'a que des libellés, `widgetOptions.json` que des options : ni
 * description, ni catégorie, ni marqueur Pro dans ses 248 chaînes). Les recopier depuis le § 3.2
 * du relevé reviendrait à figer à la main 75 textes français dans du code — un catalogue de
 * plus, non traduit, invérifiable et voué à diverger. La palette groupe donc par la seule
 * distinction qu'elle sait justifier, et c'est aussi la seule qui engage la fidélité du
 * fichier : **duplicable** ou **à créer**.
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
 * Les neuf types du catalogue que l'appareil **ne propose pas** à l'ajout.
 *
 * Le relevé exhaustif de la liste native (§ 3.2) compte 75 entrées, le catalogue 84. Les neuf
 * de l'écart sont la famille `WDebug*`, `WVTM` — dont les libellés n'existent d'ailleurs qu'en
 * anglais, signe qu'ils ne sont pas destinés au pilote — et `WProFallback`, dont le § 3.3
 * établit qu'il n'est proposé ni à l'ajout d'un widget ni à la création d'une page : tout
 * indique qu'il est fabriqué par l'application à la lecture, en substitut d'un widget Pro sans
 * licence.
 *
 * Ils sont écartés de la **création**. Ils restent proposés s'ils sont présents dans la
 * configuration ouverte : dupliquer un widget que le fichier contient déjà ne fabrique rien de
 * nouveau, et le refuser serait un jugement que nous n'avons pas à porter.
 */
export const NOT_OFFERED_BY_DEVICE: readonly string[] = [
  'WDebug', 'WDebugActivelook', 'WDebugDetectedActivity', 'WDebugFPS', 'WDebugFont',
  'WDebugHwAccTestMap', 'WDebugSystemInfo', 'WProFallback', 'WVTM'
]

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

/** Un type de widget proposé par la palette. */
export interface PaletteEntry {
  /** Le nom court (`WCompass`) : la clé du catalogue, et l'identité de l'entrée. */
  shortName: string
  /** La classe complète telle qu'elle sera écrite dans le fichier. */
  className: string
  /** Le libellé officiel dans la langue courante. */
  label: string
  /** Nombre d'exemplaires dans la configuration ouverte. */
  count: number
  origin: PaletteOrigin
  /** Le widget dont on partira, pour une entrée `duplicate`. */
  model?: JsonNode
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

/**
 * La liste des types proposés.
 *
 * `existing` est l'ensemble des widgets de la configuration ouverte, **dans l'ordre de
 * préférence** : le premier exemplaire rencontré d'un type est celui qui servira de modèle.
 * L'appelant choisit donc ce qu'il privilégie (les widgets de la page courante d'abord, par
 * exemple) ; la palette n'invente pas de règle à sa place.
 *
 * L'ordre du résultat : les types duplicables d'abord, les types à créer ensuite, chaque
 * groupe par ordre alphabétique de libellé — la liste native est groupée par catégorie, mais
 * les catégories ne figurent dans aucune donnée extraite (voir l'en-tête de ce module).
 */
export function buildPaletteEntries(existing: JsonNode[], language = 'fr'): PaletteEntry[] {
  const models = new Map<string, { className: string; count: number; model?: JsonNode }>()
  for (const node of existing) {
    const widget = readWidget(node)
    if (widget.shortName === '') continue
    const seen = models.get(widget.shortName)
    if (seen === undefined) {
      models.set(widget.shortName, {
        className: widget.className,
        count: 1,
        ...(usableModel(node) ? { model: node } : {})
      })
    } else {
      seen.count++
      if (seen.model === undefined && usableModel(node)) seen.model = node
    }
  }

  const shortNames = new Set<string>(models.keys())
  for (const shortName of Object.keys(WIDGET_OPTIONS.widgets)) {
    if (!NOT_OFFERED_BY_DEVICE.includes(shortName)) shortNames.add(shortName)
  }

  const entries: PaletteEntry[] = []
  for (const shortName of shortNames) {
    const seen = models.get(shortName)
    entries.push({
      shortName,
      className: seen?.className ?? WIDGET_CLASS_PREFIX + shortName,
      label: readableName(shortName, language),
      count: seen?.count ?? 0,
      origin: seen?.model === undefined ? 'create' : 'duplicate',
      ...(seen?.model === undefined ? {} : { model: seen.model }),
      ambiguousLabel: false
    })
  }

  const byLabel = new Map<string, number>()
  for (const entry of entries) byLabel.set(entry.label, (byLabel.get(entry.label) ?? 0) + 1)
  for (const entry of entries) entry.ambiguousLabel = (byLabel.get(entry.label) ?? 0) > 1

  const rank = (entry: PaletteEntry): number => (entry.origin === 'duplicate' ? 0 : 1)
  entries.sort((a, b) => (
    rank(a) - rank(b) ||
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
    return {
      node: duplicateWidget(entry.model, bounds),
      description: `Ajouter « ${entry.label} » — copie d’un widget de la configuration`,
      entry
    }
  }
  return {
    node: createWidgetNode(entry.className, bounds),
    description: `Ajouter « ${entry.label} » — widget neuf, réglages laissés à XCTrack`,
    entry
  }
}

/* -------------------------------------------------------------------------- le rendu */

export interface WidgetPaletteOptions {
  /**
   * Les widgets de la configuration ouverte, dans l'ordre de préférence (voir
   * `buildPaletteEntries`). Une liste vide donne une palette où tout est à créer.
   */
  existing: JsonNode[]
  device: Device
  orientation: Orientation
  language?: string
  /** Appelé au choix d'un type, avec un nœud neuf prêt pour `insertWidget`. */
  onChoose?: (node: JsonNode, description: string) => void
}

export interface WidgetPalette {
  element: HTMLElement
  entries: PaletteEntry[]
  /** Filtre la liste. Chaîne vide : tout est visible. */
  filter: (query: string) => void
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

interface Group {
  origin: PaletteOrigin
  head: HTMLElement
  note: HTMLElement
  rows: Array<{ element: HTMLElement; haystack: string }>
}

const GROUP_TITLES: Record<PaletteOrigin, string> = {
  duplicate: 'Déjà dans la configuration',
  create: 'Absents de la configuration'
}

const GROUP_NOTES: Record<PaletteOrigin, string> = {
  duplicate:
    'Le gadget est copié d’un widget que XCTrack a lui-même écrit : tous ses réglages sont ' +
    'conservés, y compris ceux que cet éditeur ne sait pas présenter.',
  create:
    'Le gadget est créé avec ses seules clés universelles — cadre, fond, thème et position. ' +
    'XCTrack complète les autres réglages à la lecture ; aucune valeur par défaut n’est inventée ici.'
}

let paletteCount = 0

/**
 * Rend la palette. Aucun lien avec le reste de l'interface : elle produit un élément et
 * rappelle `onChoose` avec un nœud prêt à être passé à `insertWidget`. C'est l'appelant qui
 * décide de la page, du rang d'empilement et de l'enregistrement dans l'historique.
 */
export function renderWidgetPalette(options: WidgetPaletteOptions): WidgetPalette {
  const language = options.language ?? 'fr'
  const entries = buildPaletteEntries(options.existing, language)
  const id = `palette-${++paletteCount}`

  const root = el('section', 'palette')
  const head = el('header', 'palette__head')
  head.append(
    el('h2', 'palette__title', 'Ajouter un gadget'),
    el('p', 'palette__count', `${entries.length} types`)
  )
  root.append(head)

  const search = el('input', 'palette__search')
  search.type = 'search'
  search.id = `${id}-search`
  search.placeholder = 'Rechercher un gadget'
  search.setAttribute('aria-label', 'Rechercher un gadget par nom ou par classe')
  root.append(search)

  const empty = el('p', 'palette__empty', 'Aucun gadget ne porte ce nom.')
  empty.hidden = true
  empty.setAttribute('role', 'status')
  root.append(empty)

  const list = el('div', 'palette__list')
  const groups: Group[] = []

  for (const origin of ['duplicate', 'create'] as const) {
    const own = entries.filter((entry) => entry.origin === origin)
    if (own.length === 0) continue

    const groupHead = el('h3', 'palette__group', `${GROUP_TITLES[origin]} (${own.length})`)
    groupHead.dataset.origin = origin
    const note = el('p', 'palette__note', GROUP_NOTES[origin])
    note.dataset.origin = origin
    list.append(groupHead, note)

    const group: Group = { origin, head: groupHead, note, rows: [] }
    for (const entry of own) {
      const row = buildRow(entry, options)
      group.rows.push({
        element: row,
        haystack: normalize(`${entry.label} ${entry.shortName} ${entry.className}`)
      })
      list.append(row)
    }
    groups.push(group)
  }

  /**
   * Le filtre masque aussi les en-têtes vides. L'écran natif, lui, les laisse tous en place —
   * le relevé (§ 3.1) qualifie lui-même la liste ainsi filtrée de « trompeuse ». On ne copie
   * pas ce défaut-là.
   */
  function filter(query: string): void {
    const needle = normalize(query.trim())
    let visible = 0
    for (const group of groups) {
      let shown = 0
      for (const row of group.rows) {
        const hidden = needle !== '' && !row.haystack.includes(needle)
        row.element.hidden = hidden
        if (!hidden) shown++
      }
      group.head.hidden = shown === 0
      group.note.hidden = shown === 0
      visible += shown
    }
    empty.hidden = visible > 0
  }

  search.addEventListener('input', () => { filter(search.value) })

  root.append(list)
  return { element: root, entries, filter }
}

/** Une ligne : le libellé officiel, le nom court qui lève toute ambiguïté, le nombre d'exemplaires. */
function buildRow(entry: PaletteEntry, options: WidgetPaletteOptions): HTMLElement {
  const row = el('button', 'palette__entry')
  row.type = 'button'
  row.dataset.widget = entry.shortName
  row.dataset.origin = entry.origin
  if (entry.ambiguousLabel) row.dataset.ambiguous = 'true'
  row.title = entry.className

  row.append(el('span', 'palette__name', entry.label))
  // Le nom court est affiché sur CHAQUE ligne, pas seulement sur les homonymes : c'est lui
  // qu'on retrouve dans le fichier, et le pilote qui compare deux sauvegardes le cherche.
  row.append(el('span', 'palette__short', entry.shortName))
  if (entry.count > 0) {
    const badge = el('span', 'palette__badge', `× ${entry.count}`)
    badge.title = `${entry.count} exemplaire${entry.count > 1 ? 's' : ''} dans la configuration`
    row.append(badge)
  }

  row.addEventListener('click', () => {
    const bounds = newWidgetBounds(options.device, options.orientation)
    const choice = buildWidget(entry, bounds)
    options.onChoose?.(choice.node, choice.description)
  })
  return row
}
