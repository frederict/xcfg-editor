import { readableName } from '../catalog/widgetNames'
import { decode, getMember, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { findDuplicateKeys } from '../core/parseJson'
import type { Layout, Page } from '../model/layout'
import type { RenderSettings } from '../model/preferences'
import type { Widget } from '../model/widget'
import { isTransparent } from '../render/registry'

/**
 * Ce que l'interface doit dire au pilote, et rien de plus. Huit familles, calculées ici
 * plutôt que dans `main.ts` : c'est la seule logique non triviale de la couche
 * d'interface, elle a donc ses propres tests.
 *
 * Deux principes tenus d'un bout à l'autre :
 *
 * 1. **On signale, on ne corrige jamais.** Une ressource externe manquante, une clé
 *    dupliquée, un widget dégénéré : le document sort à l'octet près tel qu'il est
 *    entré. Le pilote décide.
 * 2. **On ne signale pas les chevauchements.** Le corpus en compte 34, tous légitimes —
 *    des widgets flottant sur la carte et sur l'assistant de thermique, ce qui est le
 *    fonctionnement normal de XCTrack. Ce serait 100 % de bruit, et un avertissement de
 *    bruit apprend au pilote à ignorer les autres. Seuls les vrais défauts sont dits :
 *    `X2 ≤ X1`, la sortie des bornes 0–10000, et le recouvrement TOTAL par un widget
 *    opaque dessiné APRÈS — voir `geometryWarning`.
 */

/**
 * Version de XCTrack sur laquelle cet outil a été relevé — celle des fichiers du corpus,
 * dont `info.versionName` vaut « 1.0.3-beta ». **À mettre à jour par la routine du
 * jalon 3** : le format change à chaque version de XCTrack, et cette constante est le
 * seul endroit qui en date la connaissance.
 */
export const REFERENCE_VERSION_CODE = 100030

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
}

const ORIENTATION_LABELS = { landscape: 'Paysage', portrait: 'Portrait' } as const

/** Les huit clés présentes sur tous les widgets observés — voir `readWidget`. */
const UNIVERSAL_KEYS = ['CLASS', 'X1', 'Y1', 'X2', 'Y2', '_border', '_bg', '_theme']

const SCALE = 10000

/* ------------------------------------------------------------------ lecture du JSON */

function keysOf(node: JsonNode | undefined): string[] {
  if (node?.kind !== 'object') return []
  return node.entries.map(([rawKey]) => decode(rawKey))
}

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

function exportTypeWarning(info: JsonNode | undefined): Warning {
  const type = info ? readString(info, 'exportType') : undefined

  if (type === 'pages') {
    return {
      kind: 'export-type',
      moment: 'import',
      title: 'Export « pages » : seuls les écrans',
      detail:
        'Ce fichier ne porte que les pages de widgets. Réimporté dans XCTrack, il remplace ' +
        'les écrans et ne touche à rien d’autre : réglages du vario, unités, fichiers ' +
        'd’espace aérien et configuration des capteurs restent ceux de l’appareil.',
      items: []
    }
  }

  if (type === 'backup') {
    return {
      kind: 'export-type',
      moment: 'import',
      title: 'Export « backup » : la configuration entière',
      detail:
        'Ce fichier porte toute la configuration. Réimporté dans XCTrack, il écrase non ' +
        'seulement les écrans, mais aussi les réglages du vario, les unités, les fichiers ' +
        'd’espace aérien et la configuration des capteurs de l’appareil.',
      items: []
    }
  }

  return {
    kind: 'export-type',
    moment: 'import',
    title: 'Type d’export indéterminé',
    detail:
      'Ce fichier ne dit pas s’il ne contient que des pages ou toute la configuration ' +
      '(`info.exportType` absent ou inconnu). Ce qu’il écrasera à la réimportation ne peut ' +
      'donc pas être annoncé ici.',
    items: type === undefined ? [] : [`info.exportType : « ${type} »`]
  }
}

/* ------------------------------------------------------------- 2. valeurs supposées */

function assumedValueWarnings(settings: RenderSettings, language: string): Warning[] {
  const warnings: Warning[] = []

  if (settings.fromDefaults) {
    warnings.push({
      kind: 'assumed-values',
      moment: 'import',
      title: 'Thème, unités et typographie supposés',
      detail:
        'Ce fichier ne porte aucune préférence : le thème, les unités et la taille des ' +
        'titres employés pour dessiner ces pages sont des valeurs par défaut relevées ' +
        'ailleurs, pas celles de votre appareil. La géométrie, elle, vient bien du fichier.',
      items: [
        `Thème : ${settings.theme}`,
        `Altitude : ${settings.altitudeUnit} · Vitesse : ${settings.speedUnit} · ` +
        `Vario : ${settings.verticalSpeedUnit}`,
        `Titres : ${settings.titleSizePercent} %, ${settings.titleFont}`
      ]
    })
  }

  if (settings.language.kind === 'system') {
    warnings.push({
      kind: 'assumed-language',
      moment: 'import',
      title: 'Langue des libellés indéterminée',
      detail:
        'Ce fichier ne déclare aucune langue d’affichage (`Display.Language` vide ou ' +
        'section `preferences` absente) : sur l’appareil, XCTrack suit alors la langue du ' +
        'système Android — jamais l’anglais par défaut. Faute de mieux, les libellés sont ' +
        `affichés ici dans la langue de votre navigateur (${language}).`,
      items: []
    })
  }

  return warnings
}

/* ------------------------------------------------------------ 3. données personnelles */

function personalDataWarning(preferences: JsonNode | undefined): Warning | undefined {
  if (!preferences) return undefined
  const items: string[] = []

  const pilot = nonEmptyString(preferences, 'Pilot.Name')
  if (pilot !== undefined) items.push(`Pilot.Name : « ${pilot} »`)

  const glider = nonEmptyString(preferences, 'Glider.Name')
  if (glider !== undefined) items.push(`Glider.Name : « ${glider} »`)

  const livetrack = keysOf(preferences).filter((key) => key.startsWith('Livetrack.'))
  if (livetrack.length > 0) items.push(`Livetrack : ${livetrack.join(', ')}`)

  const waypoints = waypointFiles(preferences)
  if (waypoints.length > 0) items.push(`Navigation.WaypointFiles : ${waypoints.join(', ')}`)

  if (items.length === 0) return undefined

  return {
    kind: 'personal-data',
    moment: 'export',
    title: 'Ce fichier vous nomme',
    detail:
      'Donné à un autre pilote, il révèle votre nom, votre matériel, vos choix de ' +
      'diffusion Livetrack, et jusqu’à la compétition à laquelle vous participez — les ' +
      'noms des fichiers de waypoints la désignent. Cet outil ne dépouille rien en ' +
      'silence : le fichier sort tel qu’il est entré. À vous de voir.',
    items
  }
}

/* -------------------------------------------------------------- 4. ressources externes */

function externalResourceWarning(preferences: JsonNode | undefined): Warning | undefined {
  if (!preferences) return undefined
  const items: string[] = []

  const theme = nonEmptyString(preferences, 'Mapsforge.ThemeFile')
  if (theme !== undefined) items.push(`Thème de carte : ${theme} (Mapsforge.ThemeFile)`)

  for (const file of waypointFiles(preferences)) {
    items.push(`Waypoints : ${file} (Navigation.WaypointFiles)`)
  }

  // `Airspace.Files` est vide dans presque tout le corpus : pas d'avertissement creux.
  for (const file of stringsOf(getMember(preferences, 'Airspace.Files'))) {
    items.push(`Espace aérien : ${file} (Airspace.Files)`)
  }

  if (items.length === 0) return undefined

  return {
    kind: 'external-resources',
    moment: 'import',
    title: 'Fichiers extérieurs référencés',
    detail:
      'Ces noms désignent des fichiers présents sur l’appareil d’origine, pas dans cette ' +
      'configuration. Une configuration reçue d’un autre pilote pointe des fichiers qu’il ' +
      'est seul à avoir : XCTrack les cherchera sur votre carte SD et ne les trouvera pas. ' +
      'Cet outil les liste, il ne les corrige pas.',
    items
  }
}

/* -------------------------------------------------------------- 5. écart de version */

function versionWarning(info: JsonNode | undefined): Warning | undefined {
  const code = info ? readNumber(info, 'versionCode') : undefined
  const name = info ? readString(info, 'versionName') : undefined

  if (code === undefined) {
    return {
      kind: 'version-gap',
      moment: 'import',
      title: 'Version de XCTrack inconnue',
      detail:
        'Ce fichier ne dit pas de quelle version de XCTrack il vient (`info.versionCode` ' +
        `absent). L’écart avec la version de référence de cet outil (${REFERENCE_VERSION_CODE}) ` +
        'ne peut donc pas être mesuré ; ce qui est affiché peut avoir changé de sens depuis.',
      items: []
    }
  }

  if (code === REFERENCE_VERSION_CODE) return undefined

  const older = code < REFERENCE_VERSION_CODE
  return {
    kind: 'version-gap',
    moment: 'import',
    title: older ? 'Fichier plus ancien que l’outil' : 'Fichier plus récent que l’outil',
    detail:
      `Ce fichier vient de la version ${name ?? 'inconnue'} (versionCode ${code}), alors que ` +
      `cet éditeur a été relevé sur la version ${REFERENCE_VERSION_CODE}. Le format change à ` +
      'chaque version : des réglages peuvent être dessinés autrement qu’ils ne le seront sur ' +
      'l’appareil. Le fichier n’est pas modifié pour autant — il ressort à l’octet près.',
    items: []
  }
}

/* ------------------------------------------------------------ 6. structure inattendue */

function structureWarning(input: WarningInput): Warning | undefined {
  const items: string[] = []

  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      const where = `${ORIENTATION_LABELS[orientation]}, page ${index + 1}`

      if (page.className === '') items.push(`${where} : classe de page absente (clé CLASS)`)

      const navigations = getMember(page.node, 'navigations')
      const unknownNavigations =
        navigations !== undefined &&
        navigations.kind !== 'array' &&
        !(navigations.kind === 'string' && ['all', 'none'].includes(decode(navigations.raw)))
      if (unknownNavigations) {
        items.push(`${where} : « navigations » d’un type non reconnu (${navigations.kind})`)
      }

      page.widgets.forEach((widget, position) => {
        const missing = UNIVERSAL_KEYS.filter((key) => getMember(widget.node, key) === undefined)
        if (missing.length > 0) {
          items.push(`${where}, widget ${position + 1} : clé ${missing.join(', ')} absente`)
        }
      })
    })
  }

  // `JSON.parse` écraserait une clé dupliquée en silence ; le document les garde toutes,
  // mais le pilote doit savoir que son fichier en contient — XCTrack en lira une seule.
  for (const path of findDuplicateKeys(input.document)) {
    items.push(`Clé dupliquée : ${path}`)
  }

  if (items.length === 0) return undefined

  return {
    kind: 'structure',
    moment: 'import',
    title: 'Structure inattendue',
    detail:
      'Cet éditeur n’a pas reconnu une partie de ce fichier. Le rendu est dégradé là où ' +
      'l’information manque, mais rien n’est perdu : le document est conservé intact et ' +
      'ressort tel quel.',
    items
  }
}

/* --------------------------------------------------------------- 7. défauts géométriques */

function box(widget: Widget): string {
  return `X1 ${widget.x1}, Y1 ${widget.y1}, X2 ${widget.x2}, Y2 ${widget.y2}`
}

/**
 * Vrai si `cover` recouvre entièrement `widget`. On n'exige pas l'égalité des bornes :
 * un widget est masqué dès que sa boîte est incluse dans celle d'un opaque.
 */
function covers(cover: Widget, widget: Widget): boolean {
  return cover.x1 <= widget.x1 && cover.y1 <= widget.y1 &&
    cover.x2 >= widget.x2 && cover.y2 >= widget.y2
}

function pageGeometryItems(page: Page, where: string, language: string): string[] {
  const items: string[] = []

  page.widgets.forEach((widget, position) => {
    const name = readableName(widget.shortName, language)
    const who = `${where}, widget ${position + 1} (${name})`

    if (widget.x2 <= widget.x1) items.push(`${who} : X2 n’est pas au-delà de X1 — ${box(widget)}`)
    if (widget.y2 <= widget.y1) items.push(`${who} : Y2 n’est pas au-delà de Y1 — ${box(widget)}`)

    const outside = ([['X1', widget.x1], ['Y1', widget.y1], ['X2', widget.x2], ['Y2', widget.y2]] as const)
      .filter(([, value]) => value < 0 || value > SCALE)
    for (const [key, value] of outside) {
      items.push(`${who} : ${key} = ${value}, hors des bornes 0–10000`)
    }

    // Plus haut dans la pile = plus loin dans le tableau : c'est l'ordre de dessin, et
    // c'est lui seul qui distingue « masqué » de « masquant ». Un widget opaque placé
    // AVANT ne masque rien du tout. Un type transparent au repos (registerTransparent,
    // registry.ts — WButtonBrightness, WLiveMessage) est exclu même quand `_bg` vaut
    // 100 dans le fichier : sur l'appareil, il ne peint rien tant que son contenu n'est
    // pas là, donc il ne masque personne — comparaison au sol,
    // vol-thermalassistant-boutonsnavig.png, qui montre les WButtonNavig recouverts
    // dans le fichier bel et bien visibles.
    const hider = page.widgets.findIndex(
      (other, index) =>
        index > position && other.background >= 100 && !isTransparent(other.shortName) && covers(other, widget)
    )
    if (hider !== -1) {
      const cover = page.widgets[hider]!
      items.push(
        `${who} : entièrement recouvert par le widget ${hider + 1} ` +
        `(${readableName(cover.shortName, language)}), opaque et dessiné après lui`
      )
    }
  })

  return items
}

function geometryWarning(input: WarningInput): Warning | undefined {
  const items: string[] = []
  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      items.push(...pageGeometryItems(
        page, `${ORIENTATION_LABELS[orientation]}, page ${index + 1}`, input.language
      ))
    })
  }

  if (items.length === 0) return undefined

  return {
    kind: 'geometry',
    moment: 'import',
    title: 'Défauts de géométrie',
    detail:
      'Ces widgets ne peuvent pas s’afficher comme leur auteur l’espérait : boîte de ' +
      'largeur ou de hauteur nulle, coordonnées hors des bornes, ou recouvrement complet ' +
      'par un widget opaque dessiné après. Les simples chevauchements ne sont pas ' +
      'signalés : ils sont normaux sur une carte ou un assistant de thermique.',
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
    const known = KNOWN_THEMES.includes(declared) ? '' : ' (thème inconnu de cet outil)'
    items.push(`Thème du fichier : ${declared}${known}`)
  }
  for (const [theme, count] of perWidget) {
    items.push(`${count} widget${count > 1 ? 's' : ''} en ${theme}`)
  }

  return {
    kind: 'theme-not-drawn',
    moment: 'import',
    title: 'Thème dessiné différent du thème déclaré',
    detail:
      `Ces pages sont dessinées ici avec le thème ${DRAWN_THEME}, le seul qui ait été ` +
      'observé sur l’instrument. Le fichier en demande un autre : les couleurs et les ' +
      'contrastes que vous voyez ne sont donc pas ceux de votre appareil. La géométrie, ' +
      'elle, est juste — et le fichier n’est pas modifié pour autant.',
    items
  }
}

export function computeWarnings(input: WarningInput): Warning[] {
  const info = getMember(input.document, 'info')
  const preferences = getMember(input.document, 'preferences')

  const warnings: Warning[] = [exportTypeWarning(info)]
  warnings.push(...assumedValueWarnings(input.settings, input.language))

  const optional = [
    personalDataWarning(preferences),
    externalResourceWarning(preferences),
    versionWarning(info),
    structureWarning(input),
    geometryWarning(input),
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
