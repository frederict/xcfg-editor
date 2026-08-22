import type { Device } from '../catalog/devices'
import { families as CATALOG_FAMILIES } from '../catalog/widgetCatalog/en.json'
import { readableName } from '../catalog/widgetNames'
import { decode, getMember, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { findDuplicateKeys } from '../core/parseJson'
import type { Orientation } from '../model/grid'
import {
  describeLocation,
  ruleSummary,
  ruleTitle,
  inspectLayout,
  type Finding,
  type InspectionRuleId
} from '../model/inspection'
import type { Layout, Page } from '../model/layout'
import {
  collectPersonalData,
  personalProse,
  type PersonalInventory
} from '../model/personalData'
import type { RenderSettings } from '../model/preferences'
import type { Widget } from '../model/widget'
import type { Translator } from '../i18n'

/**
 * Ce que l'interface doit dire au pilote, et rien de plus. Neuf familles sur le
 * **fichier**, calculées ici plutôt que dans `main.ts` : c'est la seule logique non
 * triviale de la couche d'interface, elle a donc ses propres tests.
 *
 * Les sept règles du **contrôle avant vol** — ce que les pages feront une fois en l'air —
 * ne sont pas écrites ici : elles vivent dans `src/model/inspection.ts`, qui est un
 * module pur. Ce fichier ne fait que les habiller de la même forme et les ranger aux
 * mêmes endroits, et c'est là que le seul recoupement des deux lectures est tranché.
 * Voir `preflightWarnings`, tout en bas.
 *
 * Trois principes tenus d'un bout à l'autre :
 *
 * 1. **On signale, on ne corrige jamais.** Une ressource externe manquante, une clé
 *    dupliquée, un widget dégénéré : le document sort à l'octet près tel qu'il est
 *    entré. Le pilote décide.
 * 2. **On ne signale pas les chevauchements.** Le corpus en compte 34, tous légitimes —
 *    des widgets flottant sur la carte et sur l'assistant de thermique, ce qui est le
 *    fonctionnement normal de XCTrack. Ce serait 100 % de bruit, et un avertissement de
 *    bruit apprend au pilote à ignorer les autres. Seuls les vrais défauts sont dits :
 *    `X2 ≤ X1`, la sortie des bornes 0–10000, et le recouvrement TOTAL par un widget
 *    qui peint un fond plein — voir `scanGeometry`.
 * 3. **Un montage volontaire n'est pas un défaut.** Glisser un bouton d'action sous une
 *    carte est une manière connue de se donner une commande là où l'écran est occupé :
 *    le bouton ne se voit plus, mais il répond toujours au doigt. Le même recouvrement
 *    se dit donc de deux façons selon ce qui est dessous — voir `coveredButtonWarning`
 *    et `isActionButton`.
 */

/**
 * Version de XCTrack sur laquelle cet outil a été relevé — celle des fichiers du corpus,
 * dont `info.versionName` vaut « 1.0.3-beta ». **À mettre à jour par la routine du
 * jalon 3** : le format change à chaque version de XCTrack, et cette constante est le
 * seul endroit qui en date la connaissance.
 */
export const REFERENCE_VERSION_CODE = 100030

/**
 * Les neuf familles qui parlent du **fichier**, plus les sept règles du contrôle avant
 * vol, qui parlent du **comportement des pages en vol** et gardent l'identifiant que
 * `src/model/inspection.ts` leur donne — voir `preflightWarnings`, tout en bas.
 */
export type WarningKind =
  | 'export-type'
  | 'theme-not-drawn'
  | 'assumed-values'
  | 'assumed-language'
  | 'personal-data'
  | 'external-resources'
  | 'version-gap'
  | 'structure'
  | 'geometry'
  | 'covered-buttons'
  | InspectionRuleId

/**
 * Quand l'avertissement se montre. Les données personnelles ne concernent le pilote
 * qu'au moment où il s'apprête à donner son fichier à quelqu'un : les afficher à
 * l'import, c'est les afficher au moment où elles ne servent à rien.
 */
export type WarningMoment = 'import' | 'export'

export interface Warning {
  kind: WarningKind
  moment: WarningMoment
  title: string
  detail: string
  /** Détail énumérable : ressources, défauts, clés — vide quand l'avertissement se suffit. */
  items: string[]
}

export interface WarningInput {
  document: JsonNode
  layout: Layout
  settings: RenderSettings
  /** Langue effectivement employée pour les libellés — voir `resolveLanguage`. */
  language: string
  /**
   * Notre prose, dans la langue du pilote. **Passé, jamais lu** : ce module ne va pas
   * chercher la langue courante — voir `src/i18n/CLAUDE.md` § 5.
   *
   * ⚠️ C'est l'**autre** axe que `language` ci-dessus, qui suit le fichier ouvert et nomme
   * les gadgets. Les confondre casserait la promesse de l'outil (`src/i18n/axes.ts`).
   */
  tr: Translator
}

/**
 * L'orientation dans les mots du pilote. Les deux mots vivent dans le domaine `sharing`
 * plutôt que dans `common.ts` : ils ne servent qu'ici et dans `sharingDialog.ts`, et un
 * mot n'entre dans le vocabulaire partagé que lorsque **deux domaines** l'emploient.
 */
function orientationLabel(orientation: Orientation, tr: Translator): string {
  return orientation === 'landscape'
    ? tr.t('sharing.orientationLandscape')
    : tr.t('sharing.orientationPortrait')
}

/** Les huit clés présentes sur tous les widgets observés — voir `readWidget`. */
const UNIVERSAL_KEYS = ['CLASS', 'X1', 'Y1', 'X2', 'Y2', '_border', '_bg', '_theme']

const SCALE = 10000

/* ------------------------------------------------------------------ lecture du JSON */

/** Chaînes d'un tableau JSON, les autres types étant ignorés. */
function stringsOf(node: JsonNode | undefined): string[] {
  if (node?.kind !== 'array') return []
  return node.items.filter((item) => item.kind === 'string').map((item) => decode(item.raw))
}

function nonEmptyString(node: JsonNode | undefined, key: string): string | undefined {
  if (!node) return undefined
  const value = readString(node, key)
  return value !== undefined && value.trim().length > 0 ? value : undefined
}

/** Noms de fichiers portés par `Navigation.WaypointFiles`, un objet dont le tableau
 * `files` liste les waypoints chargés. */
function waypointFiles(preferences: JsonNode | undefined): string[] {
  if (!preferences) return []
  const node = getMember(preferences, 'Navigation.WaypointFiles')
  if (!node) return []
  return stringsOf(getMember(node, 'files'))
}

/* --------------------------------------------------------------- 1. type d'export */

function exportTypeWarning(info: JsonNode | undefined, tr: Translator): Warning {
  const type = info ? readString(info, 'exportType') : undefined

  if (type === 'pages') {
    return {
      kind: 'export-type',
      moment: 'import',
      title: tr.t('warnings.exportPagesTitle'),
      detail: tr.t('warnings.exportPagesDetail'),
      items: []
    }
  }

  if (type === 'backup') {
    return {
      kind: 'export-type',
      moment: 'import',
      title: tr.t('warnings.exportBackupTitle'),
      detail: tr.t('warnings.exportBackupDetail'),
      items: []
    }
  }

  return {
    kind: 'export-type',
    moment: 'import',
    title: tr.t('warnings.exportUnknownTitle'),
    detail: tr.t('warnings.exportUnknownDetail'),
    // Le type lu dans le fichier est recopié tel quel : c'est un identifiant, pas un
    // nombre ni un mot à mettre en forme.
    items: type === undefined ? [] : [tr.t('warnings.exportUnknownItem', { type })]
  }
}

/* ------------------------------------------------------------- 2. valeurs supposées */

function assumedValueWarnings(
  settings: RenderSettings, language: string, tr: Translator
): Warning[] {
  const warnings: Warning[] = []

  if (settings.fromDefaults) {
    warnings.push({
      kind: 'assumed-values',
      moment: 'import',
      title: tr.t('warnings.assumedValuesTitle'),
      detail: tr.t('warnings.assumedValuesDetail'),
      items: [
        tr.t('warnings.assumedTheme', { theme: settings.theme }),
        tr.t('warnings.assumedUnits', {
          altitude: settings.altitudeUnit,
          speed: settings.speedUnit,
          vario: settings.verticalSpeedUnit
        }),
        tr.t('warnings.assumedTitles', {
          percent: settings.titleSizePercent,
          font: settings.titleFont
        })
      ]
    })
  }

  if (settings.language.kind === 'system') {
    warnings.push({
      kind: 'assumed-language',
      moment: 'import',
      title: tr.t('warnings.assumedLanguageTitle'),
      // Le code de langue est un identifiant : il se recopie, il ne se met pas en forme.
      detail: tr.t('warnings.assumedLanguageDetail', { language }),
      items: []
    })
  }

  return warnings
}

/* ------------------------------------------------------------ 3. données personnelles */

/**
 * ## L'inventaire n'est plus calculé ici
 *
 * Il l'était, dans une fonction privée qui connaissait quatre familles de clés — et la
 * bibliothèque la recopiait, faute de pouvoir importer ce module sans tirer tout
 * `src/render/` avec lui. C'est `model/personalData.ts` qui l'établit désormais, pour les
 * quatre écrans à la fois. Ce qui reste ici est le seul travail propre à un
 * avertissement : **choisir ce qui mérite d'être dit maintenant**.
 *
 * Deux choix, et ils sont assumés :
 *
 * - **on n'énumère que ce qui est renseigné.** Un `ActiveLook.Name` vide n'est pas le nom
 *   de vos lunettes ; l'aligner avec les autres apprendrait au pilote à survoler la liste.
 *   Le compte des emplacements vides est dit dans le détail, pas dans la liste ;
 * - **on nomme ce qu'on compte.** « 11 clés de préférences » et « 2 textes dans les
 *   gadgets » ne se contredisent plus dès qu'ils portent leur nom — et le second est le
 *   seul qui parte avec un export « pages ».
 */
function personalDataWarning(
  inventory: PersonalInventory, tr: Translator
): Warning | undefined {
  const filled = inventory.findings.filter((finding) => finding.filled)
  if (filled.length === 0) return undefined

  const prose = personalProse(tr)
  const inLayout = filled.filter((finding) => finding.home === 'layout').length
  const inPreferences = filled.length - inLayout

  const items = filled.map((finding) => tr.t('warnings.personalItem', {
    key: finding.key,
    kind: prose.kind(finding.kind),
    value: prose.value(finding)
  }))

  // Le détail est assemblé de phrases entières, jamais de fragments : deux d'entre elles
  // n'apparaissent que si elles ont quelque chose à dire, et une phrase absente ne laisse
  // pas d'espace derrière elle.
  //
  // Le fait le plus contre-intuitif du format, et celui qu'il ne faut jamais réénoncer à
  // l'envers : le `layout` voyage avec un export « pages ». Un nom et un numéro de
  // téléphone y vivent (`WButtonPhone`), et la dérivation ne les retire pas.
  const sentences = [
    tr.t('warnings.personalDetailLead', {
      preferences: tr.t('warnings.personalPreferenceCount', { count: inPreferences }),
      layout: tr.t('warnings.personalLayoutCount', { count: inLayout })
    })
  ]
  if (inLayout > 0) {
    sentences.push(tr.t('warnings.personalTravels', { count: inLayout }))
  }
  if (inventory.counts.empty > 0) {
    sentences.push(tr.t('warnings.personalEmptySlots', { count: inventory.counts.empty }))
  }
  sentences.push(tr.t('warnings.personalDetailTail'))

  return {
    kind: 'personal-data',
    moment: 'export',
    title: inLayout > 0 && inPreferences === 0
      ? tr.t('warnings.personalLayoutTitle')
      : tr.t('warnings.personalTitle'),
    detail: sentences.join(' '),
    items
  }
}

/* -------------------------------------------------------------- 4. ressources externes */

function externalResourceWarning(
  preferences: JsonNode | undefined, tr: Translator
): Warning | undefined {
  if (!preferences) return undefined
  const items: string[] = []

  const theme = nonEmptyString(preferences, 'Mapsforge.ThemeFile')
  if (theme !== undefined) items.push(tr.t('warnings.externalMapTheme', { file: theme }))

  for (const file of waypointFiles(preferences)) {
    items.push(tr.t('warnings.externalWaypoints', { file }))
  }

  // `Airspace.Files` est vide dans presque tout le corpus : pas d'avertissement creux.
  for (const file of stringsOf(getMember(preferences, 'Airspace.Files'))) {
    items.push(tr.t('warnings.externalAirspace', { file }))
  }

  if (items.length === 0) return undefined

  return {
    kind: 'external-resources',
    moment: 'import',
    title: tr.t('warnings.externalTitle'),
    detail: tr.t('warnings.externalDetail'),
    items
  }
}

/* -------------------------------------------------------------- 5. écart de version */

function versionWarning(info: JsonNode | undefined, tr: Translator): Warning | undefined {
  const code = info ? readNumber(info, 'versionCode') : undefined
  const name = info ? readString(info, 'versionName') : undefined

  // ⚠️ `versionCode` et `versionName` passent en **`string`**, jamais en `number` : ce
  // sont des identifiants. « 100 030 » ne se retrouve dans aucun fichier XCTrack, et le
  // pilote doit pouvoir chercher le nombre qu'il a sous les yeux.
  const reference = String(REFERENCE_VERSION_CODE)

  if (code === undefined) {
    return {
      kind: 'version-gap',
      moment: 'import',
      title: tr.t('warnings.versionUnknownTitle'),
      detail: tr.t('warnings.versionUnknownDetail', { reference }),
      items: []
    }
  }

  if (code === REFERENCE_VERSION_CODE) return undefined

  const older = code < REFERENCE_VERSION_CODE
  return {
    kind: 'version-gap',
    moment: 'import',
    title: older
      ? tr.t('warnings.versionOlderTitle')
      : tr.t('warnings.versionNewerTitle'),
    detail: tr.t('warnings.versionGapDetail', {
      name: name ?? tr.t('warnings.versionNameUnknown'),
      code: String(code),
      reference
    }),
    items: []
  }
}

/* ------------------------------------------------------------ 6. structure inattendue */

function structureWarning(input: WarningInput): Warning | undefined {
  const tr = input.tr
  const items: string[] = []

  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      const where = tr.t('warnings.where', {
        orientation: orientationLabel(orientation, tr),
        page: index + 1
      })

      if (page.className === '') items.push(tr.t('warnings.structureNoClass', { where }))

      const navigations = getMember(page.node, 'navigations')
      const unknownNavigations =
        navigations !== undefined &&
        navigations.kind !== 'array' &&
        !(navigations.kind === 'string' && ['all', 'none'].includes(decode(navigations.raw)))
      if (unknownNavigations) {
        // Le type JavaScript de la valeur ne disait rien à personne. Ce qui compte est
        // la conséquence : cet outil ne sait pas dire quand cette page s'affiche.
        items.push(tr.t('warnings.structureNavigations', { where }))
      }

      page.widgets.forEach((widget, position) => {
        const missing = UNIVERSAL_KEYS.filter((key) => getMember(widget.node, key) === undefined)
        if (missing.length > 0) {
          // `join(', ')` et non `format.list` : ce sont des **noms de clés alignés**, pas
          // une énumération dans une phrase — « CLASS et X1 » ferait lire une prose.
          items.push(tr.t('warnings.structureMissingKeys', {
            where, rank: position + 1, count: missing.length, keys: missing.join(', ')
          }))
        }
      })
    })
  }

  // `JSON.parse` écraserait une clé dupliquée en silence ; le document les garde toutes,
  // mais le pilote doit savoir que son fichier en contient — XCTrack en lira une seule.
  for (const path of findDuplicateKeys(input.document)) {
    items.push(tr.t('warnings.structureDuplicate', { path }))
  }

  if (items.length === 0) return undefined

  return {
    kind: 'structure',
    moment: 'import',
    title: tr.t('warnings.structureTitle'),
    detail: tr.t('warnings.structureDetail'),
    items
  }
}

/* ------------------------------------ 7. géométrie : défauts, et montages volontaires */

/**
 * Les quatre coordonnées, telles qu'elles sont écrites dans le fichier. Elles passent en
 * **`string`** : ce sont des valeurs qu'on retrouve au `grep` dans le `.xcfg`, et
 * « 10 000 » ne s'y trouve nulle part.
 */
function box(widget: Widget, tr: Translator): string {
  return tr.t('warnings.box', {
    x1: String(widget.x1),
    y1: String(widget.y1),
    x2: String(widget.x2),
    y2: String(widget.y2)
  })
}

/**
 * Vrai si `cover` recouvre entièrement `widget`. On n'exige pas l'égalité des bornes :
 * un widget est masqué dès que sa boîte est incluse dans celle d'un opaque.
 */
function covers(cover: Widget, widget: Widget): boolean {
  return cover.x1 <= widget.x1 && cover.y1 <= widget.y1 &&
    cover.x2 >= widget.x2 && cover.y2 >= widget.y2
}

/** La famille « Boutons d'actions » de l'écran d'ajout de XCTrack. */
const ACTION_BUTTON_FAMILY = 'wgButtons'

/**
 * Les types de la famille « Boutons d'actions », lus dans le catalogue extrait de l'APK
 * plutôt qu'énumérés ici.
 *
 * **Pourquoi le catalogue et non une liste écrite à la main.** La famille en compte neuf
 * dans la 1.0.3-beta5 ; une version suivante peut en ajouter un dixième, et une liste
 * recopiée l'oublierait en silence — le nouveau bouton redeviendrait un « défaut ».
 * `families` est la seule partie du catalogue dont on ait besoin ici, et elle est
 * identique dans les 33 fichiers de langue : on lit donc l'anglais, qui sert déjà de
 * repli au reste du module (`catalog/widgetCatalog.ts`). L'assembleur ne retient que
 * cette clé — environ deux kilo-octets — et non le fichier entier, que la palette
 * continue de charger à la demande.
 *
 * L'import est **statique** parce que `computeWarnings` l'est : les avertissements sont
 * calculés à l'instant de l'import du fichier, bien avant que le pilote n'ouvre la
 * palette et ne déclenche le chargement du catalogue dans sa langue.
 */
const ACTION_BUTTONS: ReadonlySet<string> = new Set(
  CATALOG_FAMILIES.find((family) => family.id === ACTION_BUTTON_FAMILY)?.widgets ?? []
)

/**
 * Vrai si ce type de widget **agit** au lieu d'afficher : régler la luminosité, couper le
 * son, lancer une application. Ce qu'il peint n'est qu'une étiquette de sa commande, et
 * le perdre de vue ne fait rien perdre au pilote — la zone tactile, elle, reste.
 */
export function isActionButton(shortName: string): boolean {
  return ACTION_BUTTONS.has(shortName)
}

/**
 * L'index du widget qui recouvre entièrement celui de rang `position` **en peignant un
 * fond plein**, ou `-1`. Le prédicat de la règle « caché sous un autre », isolé pour
 * qu'il n'ait qu'une définition : `scanPage` en tire ses deux avertissements, et
 * `coveredByOpaqueWidget` la liste que le contrôle avant vol consulte pour ne pas redire
 * ce qui est déjà dit. Deux lectures divergentes du même fait géométrique donneraient au
 * pilote deux réponses différentes sur le même gadget.
 */
function opaqueCoverIndex(page: Page, position: number): number {
  const widget = page.widgets[position]
  if (widget === undefined) return -1
  return page.widgets.findIndex(
    (other, index) => index > position && other.background <= 0 && covers(other, widget)
  )
}

/**
 * L'emplacement d'un gadget, écrit pour servir de clé — même découpage que
 * `InspectionLocation` de `src/model/inspection.ts`, rangs à partir de 1 compris.
 */
function locationKey(orientation: Orientation, pageRank: number, widgetRank: number): string {
  return `${orientation}:${pageRank}:${widgetRank}`
}

/**
 * Les gadgets dont ce module dit déjà qu'ils sont cachés sous un fond plein — qu'il en
 * ait fait un défaut (`geometry`) ou un montage volontaire (`covered-buttons`).
 *
 * C'est la clé du raccord avec `src/model/inspection.ts` : voir `preflightWarnings`.
 */
export function coveredByOpaqueWidget(layout: Layout): ReadonlySet<string> {
  const keys = new Set<string>()
  for (const orientation of ['landscape', 'portrait'] as const) {
    layout[orientation].forEach((page, index) => {
      page.widgets.forEach((_, position) => {
        if (opaqueCoverIndex(page, position) === -1) return
        keys.add(locationKey(orientation, index + 1, position + 1))
      })
    })
  }
  return keys
}

/** Ce que la lecture des rectangles a trouvé, rangé selon ce que le pilote doit en faire. */
interface GeometryFindings {
  /** De vrais défauts : le widget ne rendra pas le service attendu. */
  defects: string[]
  /** Des boutons d'action glissés sous un autre widget — un montage, pas un défaut. */
  coveredButtons: string[]
}

function scanPage(
  page: Page, where: string, language: string, found: GeometryFindings, tr: Translator
): void {
  page.widgets.forEach((widget, position) => {
    const name = readableName(widget.shortName, language)
    const who = tr.t('warnings.who', { where, rank: position + 1, name })

    // La conséquence, en français, puis les coordonnées entre parenthèses. « X2 n'est
    // pas au-delà de X1 — X1 3000, Y1 0, X2 3000, Y2 5000 » ne disait rien à un pilote,
    // alors que l'intitulé du bloc, trois lignes plus haut, le dit déjà très bien :
    // « boîte de largeur ou de hauteur nulle, coordonnées hors des bornes ».
    if (widget.x2 <= widget.x1) {
      found.defects.push(tr.t('warnings.geometryZeroWidth', { who, box: box(widget, tr) }))
    }
    if (widget.y2 <= widget.y1) {
      found.defects.push(tr.t('warnings.geometryZeroHeight', { who, box: box(widget, tr) }))
    }

    const outside = ([
      ['warnings.edgeLeft', widget.x1], ['warnings.edgeTop', widget.y1],
      ['warnings.edgeRight', widget.x2], ['warnings.edgeBottom', widget.y2]
    ] as const).filter(([, value]) => value < 0 || value > SCALE)
    for (const [edge, value] of outside) {
      found.defects.push(tr.t('warnings.geometryOutside', {
        who, edge: tr.t(edge), value: String(value), box: box(widget, tr)
      }))
    }

    // Plus haut dans la pile = plus loin dans le tableau : c'est l'ordre de dessin, et
    // c'est lui seul qui distingue « masqué » de « masquant ». Un widget opaque placé
    // AVANT ne masque rien du tout.
    //
    // « Opaque » se lit `_bg: 0`, PAS `_bg: 100`. `_bg` est une **transparence** (voir
    // `backgroundOpacity`, render/canvas.ts) : seule la valeur 0 peint un fond plein,
    // et c'est la seule qui garantisse que rien du dessous ne transparaît. Une valeur
    // intermédiaire laisse voir au travers — `_bg: 40` sur
    // vol-thermalassistant-boutonsnavig.png laisse la carte apparaître — et ne masque
    // donc personne au sens de cette règle.
    //
    // Aucun type n'est traité à part : `_bg` suffit. L'exclusion qui visait
    // `WLiveMessage` (registerTransparent) était un pansement sur l'inversion — les
    // 10 occurrences du corpus portent `_bg: 100` et le critère les écarte tout seul.
    const hider = opaqueCoverIndex(page, position)
    if (hider === -1) return

    const cover = tr.t('warnings.cover', {
      rank: hider + 1,
      name: readableName(page.widgets[hider]!.shortName, language)
    })

    // Le même fait géométrique, deux conséquences opposées pour le pilote. Un bouton
    // caché garde son utilité — c'est même la raison d'être du montage ; une altitude
    // cachée est une valeur que personne ne lira jamais.
    if (isActionButton(widget.shortName)) {
      found.coveredButtons.push(tr.t('warnings.geometryCoveredButton', { who, cover }))
    } else {
      found.defects.push(tr.t('warnings.geometryCovered', { who, cover }))
    }
  })
}

function scanGeometry(input: WarningInput): GeometryFindings {
  const found: GeometryFindings = { defects: [], coveredButtons: [] }
  const tr = input.tr
  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      const where = tr.t('warnings.where', {
        orientation: orientationLabel(orientation, tr),
        page: index + 1
      })
      scanPage(page, where, input.language, found, tr)
    })
  }
  return found
}

function geometryWarning(items: string[], tr: Translator): Warning | undefined {
  if (items.length === 0) return undefined

  return {
    kind: 'geometry',
    moment: 'import',
    title: tr.t('warnings.geometryTitle'),
    detail: tr.t('warnings.geometryDetail'),
    items
  }
}

/**
 * **Ce n'est pas un défaut, et l'avertissement doit le dire.** Le propriétaire de
 * l'AIR³ a deux « Luminosité de l'écran » rangés sous l'assistant de thermique de
 * `landscape[3]`, exactement à ses bornes : il règle la luminosité en touchant la
 * carte. Le bouton n'est pas dessiné, il reçoit pourtant le toucher — l'usage
 * quotidien le confirme, et c'est la meilleure source dont nous disposions.
 *
 * L'avertissement reste : le pilote qui découvre un fichier reçu doit savoir qu'un
 * bouton se cache là, faute de quoi il l'écraserait sans le voir. Mais il est classé à
 * part de `geometry` — il n'est pas dans les `ATTENTION_KINDS` de `main.ts`, donc pas
 * de liséré d'alerte — et rédigé pour rassurer plutôt que pour alerter.
 */
function coveredButtonWarning(items: string[], tr: Translator): Warning | undefined {
  if (items.length === 0) return undefined

  return {
    kind: 'covered-buttons',
    moment: 'import',
    title: tr.t('warnings.coveredButtonsTitle'),
    detail: tr.t('warnings.coveredButtonsDetail'),
    items
  }
}

/* ------------------------------------------------------------------------- assemblage */

/* -------------------------------------------- 8. le thème déclaré n'est pas dessiné */

/**
 * Les cinq thèmes de XCTrack, relevés dans les tables de chaînes des dex de l'APK
 * 1.0.3-beta5 (`docs/reference/corpus-air3.md` §6). Le catalogue de `Display.Theme`
 * était un point ouvert de la spec ; il ne l'est plus.
 */
const KNOWN_THEMES = ['WhiteTheme', 'WhiteHCTheme', 'WhiteEInkTheme', 'BlackTheme', 'BlackHCTheme']

/** Le seul thème que le rendu sache dessiner, faute d'avoir observé les autres. */
const DRAWN_THEME = 'WhiteHCTheme'

/**
 * La visionneuse dessine toujours `WhiteHCTheme`, quel que soit le thème déclaré : aucun
 * rendu ne consulte `RenderSettings.theme`, et aucun ne consulte le `_theme` propre à un
 * widget — que le corpus élargi montre pourtant employé (46 widgets, `WhiteEInkTheme`
 * pour l'essentiel) et que le manuel décrit comme une fonctionnalité.
 *
 * Pour une visionneuse dont la promesse tient en « telles qu'elles apparaîtront sur
 * l'instrument », c'est un écart qu'il faut dire. Le taire serait pire que l'avoir : un
 * pilote qui vole en thème sombre ou sur un instrument e-ink croirait voir son écran.
 *
 * **On se contente de le dire.** Deviner l'apparence des quatre autres thèmes
 * contredirait le deuxième principe du projet — 28 libellés sur 37 étaient faux quand ils
 * venaient d'une traduction plausible. Il faut d'abord les observer sur l'appareil ; le
 * protocole est au point 11 de `docs/plans/2026-08-20-feuille-de-route.md`.
 */
function themeWarning(input: WarningInput): Warning | undefined {
  const tr = input.tr
  const declared = input.settings.theme
  const items: string[] = []

  // Le thème du document, quand il diffère de celui qu'on sait dessiner.
  //
  // Pas de garde-fou sur `fromDefaults` : il serait mort. Un fichier sans `preferences`
  // reçoit `DEFAULTS.theme`, qui vaut précisément `WhiteHCTheme` (`model/preferences.ts`),
  // donc un export « pages » ne peut pas différer. Le lien est ténu — il tient à ce que
  // deux constantes de deux modules coïncident — et c'est `warnings.test.ts` qui le tient,
  // pas ce commentaire : si `DEFAULTS.theme` changeait, tout export « pages » se mettrait
  // à porter cet avertissement en plus de « valeurs supposées », et le test tomberait.
  const documentDiffers = declared !== DRAWN_THEME

  // Les thèmes posés widget par widget, qui l'emportent sur celui du document.
  const perWidget = new Map<string, number>()
  for (const orientation of ['landscape', 'portrait'] as const) {
    for (const page of input.layout[orientation]) {
      for (const widget of page.widgets) {
        const theme = widget.theme.trim()
        if (theme.length === 0 || theme === DRAWN_THEME) continue
        perWidget.set(theme, (perWidget.get(theme) ?? 0) + 1)
      }
    }
  }

  if (!documentDiffers && perWidget.size === 0) return undefined

  if (documentDiffers) {
    // Le nom du thème est un identifiant lu dans le fichier : il se recopie tel quel.
    items.push(KNOWN_THEMES.includes(declared)
      ? tr.t('warnings.themeFileKnown', { theme: declared })
      : tr.t('warnings.themeFileUnknown', { theme: declared }))
  }
  for (const [theme, count] of perWidget) {
    items.push(tr.t('warnings.themePerWidget', { count, theme }))
  }

  return {
    kind: 'theme-not-drawn',
    moment: 'import',
    title: tr.t('warnings.themeTitle'),
    detail: tr.t('warnings.themeDetail', { theme: DRAWN_THEME }),
    items
  }
}

export function computeWarnings(input: WarningInput): Warning[] {
  const tr = input.tr
  const info = getMember(input.document, 'info')
  const preferences = getMember(input.document, 'preferences')

  const warnings: Warning[] = [exportTypeWarning(info, tr)]
  warnings.push(...assumedValueWarnings(input.settings, input.language, tr))

  // Un seul balayage des rectangles : les deux avertissements qui en sortent disent le
  // même fait géométrique, et rien ne justifierait de le calculer deux fois.
  const geometry = scanGeometry(input)

  const optional = [
    personalDataWarning(collectPersonalData(input.document, input.layout), tr),
    externalResourceWarning(preferences, tr),
    versionWarning(info, tr),
    structureWarning(input),
    geometryWarning(geometry.defects, tr),
    coveredButtonWarning(geometry.coveredButtons, tr),
    themeWarning(input)
  ]
  for (const warning of optional) {
    if (warning) warnings.push(warning)
  }
  return warnings
}

/** Les avertissements d'un moment donné — à l'import, ou juste avant l'export. */
export function warningsAt(warnings: Warning[], moment: WarningMoment): Warning[] {
  return warnings.filter((warning) => warning.moment === moment)
}

/* ------------------------------------------------------- 10. le contrôle avant vol */

/**
 * # Le raccord avec `src/model/inspection.ts`
 *
 * Les neuf familles au-dessus parlent du **fichier** : d'où il vient, ce qu'il révèle,
 * ce que cet éditeur n'a pas su en lire. Le contrôle avant vol, lui, parle du
 * **comportement des pages en vol** — sept règles, écrites et éprouvées dans
 * `src/model/inspection.ts`, qui est un module pur et le reste.
 *
 * Il n'a pas d'écran à lui, et il n'en aura pas : ce que le pilote doit vérifier avant
 * de décoller n'est pas une rubrique de plus à aller chercher. Ses constats prennent
 * donc la forme des autres — un `Warning` par règle, le détail replié au-delà de quatre
 * lignes — et se rangent dans les deux emplacements que la vue d'ensemble a déjà : le
 * panneau déplié « À vérifier dans ce fichier », et la ligne repliée des remarques.
 *
 * ## Un constat par règle, jamais un par gadget
 *
 * Une configuration réelle en rend seize. Seize encadrés d'égal poids visuel avant la
 * première vignette, c'est exactement ce que le repli des remarques a déjà corrigé une
 * fois. Groupés par règle, ils font au plus sept cartes, dont le titre dit la règle et
 * dont la liste dit les gadgets — la grammaire de `warningCard`, sans rien y changer.
 *
 * ## Ce qui monte dans le panneau d'alerte, et ce qui n'y monte pas
 *
 * `severity` seule ne suffit pas à en décider. Le panneau déplié porte un liséré
 * d'alerte au-dessus des pages : y mettre une supposition, c'est alerter sur ce qu'on
 * n'a pas vérifié — précisément le reproche qu'a valu à cet outil un avertissement
 * criant au loup sur un montage voulu. Une règle n'y monte donc que si elle est **à la
 * fois** grave (`likely-error`) **et** établie (`measured` ou `documented`). Le doute
 * n'est pas tu pour autant : il se range dans les remarques, son titre dit qu'il reste
 * à confirmer, et son explication porte ce qui le trancherait.
 *
 * `views.ts` tient la liste des familles qui alertent ; `warnings.test.ts` vérifie
 * qu'elle est bien ce que cette règle donne, règle par règle.
 *
 * ## Le seul recoupement des deux modules, et comment il est levé
 *
 * La règle 1 (« gadget impossible à toucher ») et la lecture géométrique de ce
 * module-ci regardent tous deux le recouvrement, mais ne posent pas la même question :
 * `scanPage` demande « ce gadget sera-t-il **visible** ? » et ne retient donc comme
 * masquants que les fonds pleins ; la règle 1 demande « un appui l'atteindra-t-il ? »,
 * et un gadget qui ne peint rien prend les appuis tout autant qu'un opaque.
 *
 * Là où les deux se rejoignent — un gadget entièrement couvert par **un** gadget au
 * fond plein —, ce module a déjà parlé, et il a mieux à dire : il distingue le bouton
 * d'action, dont le montage sous une carte est voulu et fonctionne, du gadget d'affichage
 * qui ne montrera jamais sa valeur. Deux avertissements pour une seule cause valent
 * moins qu'un, et ces deux-là se contrediraient : sur la configuration du propriétaire,
 * ses deux « Luminosité de l'écran » rangés sous l'assistant de thermique reçoivent de
 * `covered-buttons` un « toujours actif au doigt, rien à corriger », là où la règle 1
 * annoncerait qu'aucun appui ne les atteint. C'est le même faux avertissement qu'il
 * avait signalé, sous un autre nom.
 *
 * Ces constats-là sont donc retirés, et **eux seuls**. Ce que la règle 1 apporte et que
 * ce module ne sait pas voir reste : le recouvrement par un gadget **transparent** — sur
 * la même configuration, deux `WLiveMessage` invisibles posés sur deux boutons de
 * navigation et deux afficheurs de compétition — et le recouvrement par **plusieurs**
 * gadgets dont aucun ne couvre seul.
 */
export interface PreflightInput {
  document: JsonNode
  layout: Layout
  /** Langue des libellés de gadgets, déjà résolue — comme pour `computeWarnings`. */
  language: string
  /**
   * Le gabarit d'écran choisi dans la barre d'outils : c'est lui qui donne les
   * millimètres de la règle de lisibilité. Il change sans que le fichier bouge, ce qui
   * est la raison pour laquelle ces constats se calculent au rendu et non à l'import.
   */
  device: Device
  /**
   * `catalog.isProWidget` d'un catalogue déjà chargé. Absent : la règle Pro n'est pas
   * évaluée du tout, plutôt que devinée — c'est le contrat d'`inspectLayout`.
   */
  isProWidget?: (shortName: string) => boolean
  /** Distance œil–instrument, en millimètres, quand le pilote l'a dite. */
  readingDistanceMm?: number
  /**
   * Notre prose, dans la langue du pilote — le même axe que celui de `WarningInput.tr`,
   * et jamais celui de `language`, qui suit le fichier ouvert.
   *
   * ⚠️ Les titres et les résumés des sept règles (`ruleTitle`, `ruleSummary`) et le
   * `message` de chaque constat viennent de `src/model/inspection.ts` : ce sont la prose
   * du domaine `model`, que ce module lui demande **dans cette langue-ci** et se contente
   * d'habiller.
   */
  tr: Translator
}

/** Vrai si la règle mérite le panneau déplié : grave, et établie. Voir l'en-tête. */
export function isAttentionFinding(finding: Finding): boolean {
  return finding.severity === 'likely-error' && finding.certainty !== 'hypothesis'
}

export function preflightWarnings(input: PreflightInput): Warning[] {
  const alreadySaid = coveredByOpaqueWidget(input.layout)
  const findings = inspectLayout(input).filter((finding) => {
    if (finding.ruleId !== 'unreachable-widget') return true
    const { orientation, pageRank, widgetRank } = finding.location
    return !alreadySaid.has(locationKey(orientation, pageRank, widgetRank ?? 0))
  })

  // Un groupe par règle, dans l'ordre où `inspectLayout` les rend — celui des règles.
  const groups = new Map<InspectionRuleId, Finding[]>()
  for (const finding of findings) {
    const group = groups.get(finding.ruleId)
    if (group) group.push(finding)
    else groups.set(finding.ruleId, [finding])
  }

  const tr = input.tr
  const warnings: Warning[] = []
  for (const [ruleId, group] of groups) {
    // La certitude et la gravité sont des propriétés de la règle, pas du gadget : tous
    // les constats d'un groupe portent les mêmes. Le premier parle donc pour tous.
    const first = group[0]!
    const doubt = first.certainty === 'hypothesis'
    warnings.push({
      kind: ruleId,
      // Le contrôle porte sur la configuration ouverte, pas sur ce qu'on s'apprête à
      // donner à quelqu'un : il se lit à l'import, avec le reste.
      moment: 'import',
      title: doubt
        ? tr.t('warnings.hypothesisTitle', { title: ruleTitle(ruleId, tr) })
        : ruleTitle(ruleId, tr),
      detail: doubt
        ? `${ruleSummary(ruleId, tr)} ${tr.t('warnings.hypothesisLead')} ${first.toVerify ?? ''}`.trim()
        : ruleSummary(ruleId, tr),
      items: group.map((finding) => tr.t('warnings.preflightItem', {
        where: describeLocation(finding.location, tr),
        message: finding.message
      }))
    })
  }
  return warnings
}
