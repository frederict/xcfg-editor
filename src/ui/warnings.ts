import { families as CATALOG_FAMILIES } from '../catalog/widgetCatalog/en.json'
import { readableName } from '../catalog/widgetNames'
import { decode, getMember, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { findDuplicateKeys } from '../core/parseJson'
import type { Layout, Page } from '../model/layout'
import {
  collectPersonalData,
  personalValueText,
  PERSONAL_KIND_LABELS,
  type PersonalInventory
} from '../model/personalData'
import type { RenderSettings } from '../model/preferences'
import type { Widget } from '../model/widget'

/**
 * Ce que l'interface doit dire au pilote, et rien de plus. Neuf familles, calculées ici
 * plutôt que dans `main.ts` : c'est la seule logique non triviale de la couche
 * d'interface, elle a donc ses propres tests.
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

/** Le compte suivi de son mot, accordé. Même forme que dans les autres modules d'interface. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

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

function exportTypeWarning(info: JsonNode | undefined): Warning {
  const type = info ? readString(info, 'exportType') : undefined

  if (type === 'pages') {
    return {
      kind: 'export-type',
      moment: 'import',
      title: 'Export « pages » : seuls les écrans',
      detail:
        'Ce fichier ne porte que les pages de gadgets. Réimporté dans XCTrack, il remplace ' +
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
        'titres employés pour dessiner ces pages sont des valeurs d’usine relevées ' +
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
function personalDataWarning(inventory: PersonalInventory): Warning | undefined {
  const filled = inventory.findings.filter((finding) => finding.filled)
  if (filled.length === 0) return undefined

  const inLayout = filled.filter((finding) => finding.home === 'layout').length
  const inPreferences = filled.length - inLayout

  const items = filled.map((finding) =>
    `${finding.key} — ${PERSONAL_KIND_LABELS[finding.kind]} : ${personalValueText(finding)}`)

  // Le fait le plus contre-intuitif du format, et celui qu'il ne faut jamais réénoncer à
  // l'envers : le `layout` voyage avec un export « pages ». Un nom et un numéro de
  // téléphone y vivent (`WButtonPhone`), et la dérivation ne les retire pas.
  const travels = inLayout === 0
    ? ''
    : ` ${plural(inLayout, 'texte écrit dans un gadget part', 'textes écrits dans les gadgets partent')} ` +
      'même avec un export « pages » : ce format est un tri de gros grain, pas un nettoyage.'

  const empty = inventory.counts.empty === 0
    ? ''
    : ` ${plural(inventory.counts.empty, 'emplacement personnel est présent mais vide',
      'emplacements personnels sont présents mais vides')} — ils ne sont pas listés ici.`

  return {
    kind: 'personal-data',
    moment: 'export',
    title: inLayout > 0 && inPreferences === 0
      ? 'Vos pages portent des textes de vous'
      : 'Ce fichier vous nomme',
    detail:
      `Ce fichier porte ${plural(inPreferences, 'réglage personnel renseigné',
        'réglages personnels renseignés')} et ` +
      `${plural(inLayout, 'texte écrit dans un gadget', 'textes écrits dans les gadgets')} ` +
      'qui vous désignent : votre nom, votre matériel, vos choix de diffusion, votre tâche ' +
      'en cours avec ses coordonnées, et jusqu’à la compétition à laquelle vous participez ' +
      `— les noms des fichiers de waypoints la désignent.${travels}${empty} Cet outil ne ` +
      'dépouille rien en silence : le fichier sort tel qu’il est entré. À vous de voir.',
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
      `cet éditeur se règle sur la version ${REFERENCE_VERSION_CODE} pour le dessiner. Le ` +
      'format change à chaque version : des réglages peuvent être dessinés autrement ' +
      'qu’ils ne le seront sur l’appareil. Le fichier n’est pas modifié pour autant — il ' +
      'ressort à l’octet près.',
    items: []
  }
}

/* ------------------------------------------------------------ 6. structure inattendue */

function structureWarning(input: WarningInput): Warning | undefined {
  const items: string[] = []

  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      const where = `${ORIENTATION_LABELS[orientation]}, page ${index + 1}`

      if (page.className === '') items.push(`${where} : cette page ne dit pas son type`)

      const navigations = getMember(page.node, 'navigations')
      const unknownNavigations =
        navigations !== undefined &&
        navigations.kind !== 'array' &&
        !(navigations.kind === 'string' && ['all', 'none'].includes(decode(navigations.raw)))
      if (unknownNavigations) {
        // Le type JavaScript de la valeur ne disait rien à personne. Ce qui compte est
        // la conséquence : cet outil ne sait pas dire quand cette page s'affiche.
        items.push(
          `${where} : cet outil ne sait pas dire quand cette page s’affiche — la valeur ` +
          `« navigations » n’est ni « all », ni « none », ni une liste`
        )
      }

      page.widgets.forEach((widget, position) => {
        const missing = UNIVERSAL_KEYS.filter((key) => getMember(widget.node, key) === undefined)
        if (missing.length > 0) {
          items.push(`${where}, gadget ${position + 1} : clé ${missing.join(', ')} absente`)
        }
      })
    })
  }

  // `JSON.parse` écraserait une clé dupliquée en silence ; le document les garde toutes,
  // mais le pilote doit savoir que son fichier en contient — XCTrack en lira une seule.
  for (const path of findDuplicateKeys(input.document)) {
    items.push(`Ligne en double : ${path}`)
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

/* ------------------------------------ 7. géométrie : défauts, et montages volontaires */

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

/** Ce que la lecture des rectangles a trouvé, rangé selon ce que le pilote doit en faire. */
interface GeometryFindings {
  /** De vrais défauts : le widget ne rendra pas le service attendu. */
  defects: string[]
  /** Des boutons d'action glissés sous un autre widget — un montage, pas un défaut. */
  coveredButtons: string[]
}

function scanPage(page: Page, where: string, language: string, found: GeometryFindings): void {
  page.widgets.forEach((widget, position) => {
    const name = readableName(widget.shortName, language)
    const who = `${where}, gadget ${position + 1} (${name})`

    // La conséquence, en français, puis les coordonnées entre parenthèses. « X2 n'est
    // pas au-delà de X1 — X1 3000, Y1 0, X2 3000, Y2 5000 » ne disait rien à un pilote,
    // alors que l'intitulé du bloc, trois lignes plus haut, le dit déjà très bien :
    // « boîte de largeur ou de hauteur nulle, coordonnées hors des bornes ».
    if (widget.x2 <= widget.x1) {
      found.defects.push(`${who} : largeur nulle, il n’a aucune surface — ${box(widget)}`)
    }
    if (widget.y2 <= widget.y1) {
      found.defects.push(`${who} : hauteur nulle, il n’a aucune surface — ${box(widget)}`)
    }

    const outside = ([
      ['son bord gauche', widget.x1], ['son bord haut', widget.y1],
      ['son bord droit', widget.x2], ['son bord bas', widget.y2]
    ] as const).filter(([, value]) => value < 0 || value > SCALE)
    for (const [edge, value] of outside) {
      found.defects.push(`${who} : sort de la page, ${edge} est à ${value} — ${box(widget)}`)
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
    const hider = page.widgets.findIndex(
      (other, index) => index > position && other.background <= 0 && covers(other, widget)
    )
    if (hider === -1) return

    const cover = `gadget ${hider + 1} (${readableName(page.widgets[hider]!.shortName, language)})`

    // Le même fait géométrique, deux conséquences opposées pour le pilote. Un bouton
    // caché garde son utilité — c'est même la raison d'être du montage ; une altitude
    // cachée est une valeur que personne ne lira jamais.
    if (isActionButton(widget.shortName)) {
      found.coveredButtons.push(`${who} : caché par le ${cover}, mais toujours actif au doigt`)
    } else {
      found.defects.push(`${who} : caché par le ${cover}, et n’affichera donc rien`)
    }
  })
}

function scanGeometry(input: WarningInput): GeometryFindings {
  const found: GeometryFindings = { defects: [], coveredButtons: [] }
  for (const orientation of ['landscape', 'portrait'] as const) {
    input.layout[orientation].forEach((page, index) => {
      scanPage(page, `${ORIENTATION_LABELS[orientation]}, page ${index + 1}`, input.language, found)
    })
  }
  return found
}

function geometryWarning(items: string[]): Warning | undefined {
  if (items.length === 0) return undefined

  return {
    kind: 'geometry',
    moment: 'import',
    title: 'Défauts de géométrie',
    detail:
      'Ces gadgets ne peuvent pas s’afficher comme leur auteur l’espérait : boîte de ' +
      'largeur ou de hauteur nulle, coordonnées hors des bornes, ou gadget entièrement ' +
      'caché sous un autre, dont il ne montrera jamais la valeur. Les simples ' +
      'chevauchements ne sont pas signalés : ils sont normaux sur une carte ou un ' +
      'assistant de thermique.',
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
function coveredButtonWarning(items: string[]): Warning | undefined {
  if (items.length === 0) return undefined

  return {
    kind: 'covered-buttons',
    moment: 'import',
    title: 'Boutons d’action cachés, et c’est sans doute voulu',
    detail:
      'Un autre gadget est posé par-dessus ces boutons et les recouvre entièrement : sur ' +
      'l’instrument, vous ne les verrez pas. Ils répondent pourtant toujours au doigt — ' +
      'appuyer à cet endroit déclenche leur action, même si c’est la carte ou l’assistant ' +
      'de thermique que vous y voyez. C’est un montage courant et non un défaut : il ' +
      'donne une commande là où l’écran est déjà occupé. Rien à corriger, sauf si la ' +
      'superposition vous surprend.',
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
    items.push(`${count} gadget${count > 1 ? 's' : ''} en ${theme}`)
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

  // Un seul balayage des rectangles : les deux avertissements qui en sortent disent le
  // même fait géométrique, et rien ne justifierait de le calculer deux fois.
  const geometry = scanGeometry(input)

  const optional = [
    personalDataWarning(collectPersonalData(input.document, input.layout)),
    externalResourceWarning(preferences),
    versionWarning(info),
    structureWarning(input),
    geometryWarning(geometry.defects),
    coveredButtonWarning(geometry.coveredButtons),
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
