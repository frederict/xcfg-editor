import { decode, getMember, readNumber, readString } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { findDuplicateKeys } from '../core/parseJson'
import type { Container } from '../core/container'
import { readLayout } from '../model/layout'
import { findFreeTexts, type FreeText } from '../model/scope'
import {
  collectPersonalData,
  type PersonalCounts,
  type PersonalFinding
} from '../model/personalData'
import { deviceFor, type Device } from '../catalog/devices'
import type { Orientation } from '../model/grid'

/**
 * La carte d'identité d'une entrée : **ce que le fichier dit de lui-même**, séparé de
 * **ce que cet outil en suppose**.
 *
 * ## Pourquoi deux moitiés, et pas une liste de champs
 *
 * `.xcfg` change à chaque version de XCTrack — c'est le fait fondateur du projet. Une
 * carte d'identité qui mélangerait « ce fichier déclare `versionCode: 100030` » (lu) et
 * « cette configuration est faite pour un écran 1280 × 720 » (déduit d'une table écrite
 * par nous, à partir d'une chaîne d'appareil que le fichier ne relie à aucune résolution)
 * affirmerait les deux avec la même autorité. Le pilote ne pourrait plus distinguer ce
 * qu'il peut croire de ce qu'il doit vérifier.
 *
 * D'où la forme : `read` et `assumed`, deux objets, jamais mélangés. Tout champ de
 * `assumed` peut être faux sans que le fichier soit en cause.
 *
 * ## Ce que la carte ne porte pas
 *
 * - **Aucun libellé traduit de widget.** `readableName` existe et l'interface s'en sert
 *   déjà ; l'appeler ici tirerait `widgetLabels.json` — **72 541 octets** — dans le
 *   morceau de la bibliothèque, pour une information que l'appelant sait produire. La
 *   carte porte les noms de classe lus dans le fichier ; l'habillage est à l'interface.
 * - **Aucun aperçu.** `src/render/` n'est pas de ce périmètre. La place est réservée dans
 *   l'enregistrement (`LibraryEntry.preview`), l'image n'est pas produite.
 * - **Aucun jugement.** Ni « configuration de compétition », ni « prête à partager ».
 *   `src/model/inspection.ts` fait le contrôle avant vol, `src/ui/warnings.ts` les
 *   avertissements ; ici on décrit, on ne conclut pas.
 */

/* =========================================================== ce que le fichier déclare */

/** Une ressource que le fichier attend de trouver sur l'appareil d'arrivée. */
export interface ExternalResource {
  kind: 'waypoints' | 'airspace' | 'map-theme'
  /** Le nom tel qu'il est écrit dans le fichier, sans interprétation. */
  name: string
  /** La clé de préférence qui le porte — pour que le pilote puisse aller vérifier. */
  key: string
}

/**
 * Une donnée qui nomme le pilote ou son matériel, avec l'endroit exact où elle est.
 *
 * **C'est `model/personalData.ts` qui l'établit**, pour les quatre écrans à la fois : la
 * carte d'identité n'a plus sa liste de clés à elle. Le type est réexporté ici parce que
 * `LibraryEntry.identity` est sérialisé dans la bibliothèque et que les appelants le
 * nomment ; la forme, elle, est celle du modèle.
 */
export type PersonalDatum = PersonalFinding

export interface WidgetTypeCount {
  /** Nom court de la classe, tel qu'il est dans le fichier : `WCompMap`, `WStatusLine`. */
  shortName: string
  count: number
}

/**
 * Tout ce qui est **lu**. Un champ `undefined` veut dire « le fichier ne le dit pas »,
 * jamais « la valeur par défaut » : c'est la distinction que `readRenderSettings` doit
 * signaler par `fromDefaults`, et qu'on ne refait pas ici.
 */
export interface IdentityRead {
  byteLength: number
  containerKind: 'xcfg' | 'xczfg'
  /** Fichiers annexes d'une archive `.xczfg`, dans l'ordre de l'archive. */
  extraFileNames: string[]
  /** Clés de premier niveau, dans l'ordre du fichier : `info`, `layout`, `preferences`… */
  rootKeys: string[]
  /** `info.exportType` : `'pages'`, `'backup'`, ou absent (fichiers de 2022). */
  exportType: string | undefined
  /** `info.device`, brut — « AIR3 AIR3-7.2 8.1.0 ». Aucune résolution là-dedans. */
  deviceString: string | undefined
  versionCode: number | undefined
  versionName: string | undefined
  /** `info.proUpTo` : attribut de licence. Vaut `0` partout dans le corpus. */
  proUpTo: number | undefined
  /** Les orientations qui portent au moins une page. */
  orientations: Orientation[]
  pageCount: Record<Orientation, number>
  widgetCount: number
  /** Par type, du plus employé au moins employé, puis par nom. */
  widgetTypes: WidgetTypeCount[]
  /** Nombre de clés de `preferences` — 0 sur un « pages ». Voir `personalData`. */
  preferenceKeyCount: number
  /** Textes écrits par le pilote dans le `layout` — ils partent avec les pages. */
  freeTexts: FreeText[]
  personalData: PersonalDatum[]
  /**
   * Les chiffres de l'inventaire, **nommés** : ce qui vit dans la disposition et part avec
   * les pages, ce qui vit dans les préférences et reste, ce qui est renseigné, ce qui est
   * lu dans l'APK. Aucun n'est « le » chiffre — c'est justement pour ça qu'ils sont
   * portés séparément, et que la carte les affiche nommés.
   */
  personalCounts: PersonalCounts
  externalResources: ExternalResource[]
  /** Chemins des clés dupliquées : XCTrack n'en lira qu'une (voir `findDuplicateKeys`). */
  duplicateKeys: string[]
  /** Renseigné si le fichier n'a pas pu être analysé ; le reste est alors vide. */
  parseError: string | undefined
}

/* ======================================================== ce que cet outil y ajoute */

export interface IdentityAssumed {
  /**
   * Le gabarit d'écran déduit de `read.deviceString` par `deviceFor`. **Sa résolution ne
   * vient pas du fichier** : elle est lue dans `src/catalog/devices.ts`, une table écrite
   * par nous à partir des fiches AIR³.
   */
  device: Device
  /**
   * Faux quand `deviceFor` n'a rien reconnu et a rendu son gabarit par défaut. C'est la
   * différence entre « ce fichier vient d'un AIR³ 7.2 » et « nous n'en savons rien ».
   */
  deviceRecognised: boolean
  /**
   * Les types de widgets que XCTrack badge « Pro », d'après le catalogue extrait de
   * l'APK 1.0.3-beta5. Vide **et** `proKnowledge: 'absent'` quand aucun catalogue n'a
   * été fourni : on ne devine pas un drapeau de licence.
   */
  proWidgets: string[]
  proKnowledge: 'catalogue' | 'absent'
  /**
   * Comparaison de `read.versionCode` à la version de référence de l'outil, quand
   * l'appelant la fournit (`REFERENCE_VERSION_CODE`, dans `src/ui/warnings.ts`).
   * Injectée plutôt qu'importée : cette constante vit dans un module qui tire tout
   * `src/render/` derrière lui, et la bibliothèque doit rester légère.
   */
  versionGap: 'older' | 'same' | 'newer' | 'unknown'
  /**
   * ⚠️ **Vrai dès qu'une donnée personnelle *renseignée* voyage avec les pages** —
   * c'est-à-dire dès que la disposition porte un `fullName` ou un `phoneNumber` de
   * `WButtonPhone`, un `url` de `WWebView`, ou un texte libre quelconque.
   *
   * **Un export « pages » n'est pas sûr par construction.** Le `layout` porte onze clés de
   * texte libre, dont le nom et le numéro de téléphone d'un bouton d'appel — dans le
   * `layout`, pas dans les `preferences` (voir `FREE_TEXT_KEYS` dans `scope.ts`). Dériver
   * un `pages` est le bon tri de gros grain ; ce n'est pas un nettoyage.
   */
  personalDataTravelsWithPages: boolean
}

export interface EntryIdentity {
  read: IdentityRead
  assumed: IdentityAssumed
}

/* ------------------------------------- relire une entrée rangée par une version antérieure */

/**
 * La forme que `personalData` avait **avant** l'inventaire unifié : un emplacement, une
 * clé, une valeur. Rien d'autre. Une bibliothèque rangée par la version déployée en porte,
 * et elle doit continuer de s'ouvrir.
 */
interface LegacyPersonalDatum {
  where?: 'preferences' | 'layout'
  key?: string
  value?: string
}

/**
 * Ce qu'un enregistrement porte réellement : un `PersonalFinding` dont la raison peut
 * encore être la **phrase française** d'avant la bascule au catalogue, ou manquer.
 */
type StoredPersonalDatum = Omit<PersonalFinding, 'reasonKey'> & {
  reasonKey?: PersonalFinding['reasonKey']
  reason?: string
}

/** Le nom rendu pour une ligne ancienne qui n'en portait pas — un repli, pas une clé réelle. */
const UNKNOWN_PERSONAL_KEY = '?'

/**
 * L'inventaire d'une entrée, **y compris quand elle a été rangée par une version
 * antérieure de l'éditeur**.
 *
 * `identity` est recopiée telle quelle depuis l'enregistrement (voir `validateRecord` :
 * « une description, pas une donnée dont dépend l'intégrité »). Un enregistrement écrit
 * avant l'inventaire unifié porte donc des lignes sans nature, sans base et sans
 * `personalCounts` — et un panneau qui lirait `counts.total` sans précaution ferait
 * échouer la bibliothèque **entière** à cause d'entrées parfaitement saines.
 *
 * On ne devine pas ce qu'on n'a pas : une ligne d'origine ancienne est rendue avec la
 * base `declared` et une raison qui dit d'où elle vient. Le vrai relevé revient dès que
 * l'entrée est rechargée, puisqu'il est recalculé depuis les octets.
 */
export function personalInventoryOf(identity: EntryIdentity): {
  findings: PersonalFinding[]
  counts: PersonalCounts
} {
  const raw = identity.read.personalData as Array<StoredPersonalDatum | LegacyPersonalDatum>
  const findings: PersonalFinding[] = raw.map((datum) => {
    if ('home' in datum && datum.home !== undefined) {
      const stored = datum
      if (stored.reasonKey !== undefined) return stored as PersonalFinding
      // Rangée par la version qui portait encore la raison en français : on la garde
      // telle quelle plutôt que d'en inventer une, et elle disparaît au rechargement.
      return {
        ...stored,
        reasonKey: 'personalReason.legacyRecord',
        ...(stored.reason === undefined ? {} : { legacyReason: stored.reason })
      } as PersonalFinding
    }
    const legacy = datum as LegacyPersonalDatum
    const value = legacy.value ?? ''
    return {
      home: legacy.where ?? 'preferences',
      key: legacy.key ?? UNKNOWN_PERSONAL_KEY,
      kind: 'freeText',
      basis: 'declared',
      reasonKey: 'personalReason.legacyRecord',
      filled: value.trim() !== '',
      ...(value === '' ? {} : { value })
    }
  })

  const counts = identity.read.personalCounts as PersonalCounts | undefined
  if (counts !== undefined) return { findings, counts }

  // Recompté sur place plutôt que réclamé à l'enregistrement : le compte est une somme,
  // pas une donnée, et le refuser à une entrée ancienne la rendrait illisible pour rien.
  const layout = findings.filter((finding) => finding.home === 'layout').length
  const filled = findings.filter((finding) => finding.filled).length
  return {
    findings,
    counts: {
      total: findings.length,
      layout,
      preferences: findings.length - layout,
      filled,
      empty: findings.length - filled,
      read: 0,
      judged: findings.length
    }
  }
}

/* ============================================================================ lecture */

/**
 * ⚠️ **L'inventaire ne prétend pas être complet, et ne peut pas l'être.** Un `backup`
 * réel porte **136 clés de préférence** (mesuré sur `2026-08-20_backup-00.xcfg`) ; le
 * relevé en surveille 44, celles que le catalogue extrait de l'APK marque comme
 * personnelles. `read.preferenceKeyCount` est là pour que l'écart reste visible : un
 * `backup` porte toute la configuration, y compris ce qu'on ne sait pas nommer. La seule
 * affirmation solide reste structurelle — un `pages` n'a pas de `preferences` du tout.
 */

function nonEmpty(node: JsonNode | undefined, key: string): string | undefined {
  if (node === undefined) return undefined
  const value = readString(node, key)
  return value !== undefined && value.trim() !== '' ? value : undefined
}

function stringsOf(node: JsonNode | undefined): string[] {
  if (node?.kind !== 'array') return []
  return node.items.filter((item) => item.kind === 'string').map((item) => decode(item.raw))
}

function keysOf(node: JsonNode | undefined): string[] {
  if (node?.kind !== 'object') return []
  return node.entries.map(([rawKey]) => decode(rawKey))
}

/** Les fichiers de waypoints, sous `Navigation.WaypointFiles.files`. */
function waypointFiles(preferences: JsonNode | undefined): string[] {
  if (preferences === undefined) return []
  const node = getMember(preferences, 'Navigation.WaypointFiles')
  return node === undefined ? [] : stringsOf(getMember(node, 'files'))
}

function readExternalResources(preferences: JsonNode | undefined): ExternalResource[] {
  if (preferences === undefined) return []
  const found: ExternalResource[] = []

  const theme = nonEmpty(preferences, 'Mapsforge.ThemeFile')
  if (theme !== undefined) found.push({ kind: 'map-theme', name: theme, key: 'Mapsforge.ThemeFile' })

  for (const file of waypointFiles(preferences)) {
    found.push({ kind: 'waypoints', name: file, key: 'Navigation.WaypointFiles' })
  }
  for (const file of stringsOf(getMember(preferences, 'Airspace.Files'))) {
    found.push({ kind: 'airspace', name: file, key: 'Airspace.Files' })
  }

  return found
}

/**
 * Vrai si `deviceFor` a **reconnu** la chaîne, et n'a pas simplement rendu son gabarit par
 * défaut.
 *
 * ⚠️ **Ce prédicat redit l'expression régulière de `deviceFor`, et c'est un défaut.**
 * `deviceFor` confond deux cas dans une seule valeur de retour : « c'est un AIR³ 7.2 » et
 * « je n'ai rien reconnu, voici le gabarit par défaut, qui se trouve être l'AIR³ 7.2 ».
 * La primitive qui manque dans `src/catalog/devices.ts` est une variante rendant
 * `undefined` sur non-reconnaissance ; elle est signalée, pas ajoutée — `src/catalog/`
 * appartient à un autre agent sur cette itération.
 */
function isDeviceRecognised(deviceString: string | undefined): boolean {
  return /AIR3-(\d+\.\d+)/i.test(deviceString ?? '')
}

export interface DescribeOptions {
  /**
   * `catalog.isProWidget` d'un `WidgetCatalog` déjà chargé. Absent : `proWidgets` est vide
   * et `proKnowledge` vaut `'absent'`. Injecté, jamais importé — le catalogue se charge de
   * façon asynchrone, et ce module reste synchrone et pur (même choix que
   * `src/model/inspection.ts`).
   */
  isProWidget?: (shortName: string) => boolean
  /** `REFERENCE_VERSION_CODE` de `src/ui/warnings.ts`, quand l'appelant l'a sous la main. */
  referenceVersionCode?: number
}

/**
 * Dresse la carte d'identité d'un conteneur ouvert. **Ne modifie rien** : aucune écriture
 * dans le document, aucune copie de nœud gardée. Le conteneur ressort tel quel.
 */
export function describeContainer(container: Container, options: DescribeOptions = {}): EntryIdentity {
  const document = container.document
  const info = getMember(document, 'info')
  const preferences = getMember(document, 'preferences')
  const layout = readLayout(document)

  const counts = new Map<string, number>()
  let widgetCount = 0
  for (const orientation of ['landscape', 'portrait'] as const) {
    for (const page of layout[orientation]) {
      for (const widget of page.widgets) {
        widgetCount++
        counts.set(widget.shortName, (counts.get(widget.shortName) ?? 0) + 1)
      }
    }
  }
  const widgetTypes = [...counts.entries()]
    .map(([shortName, count]) => ({ shortName, count }))
    .sort((a, b) => b.count - a.count || a.shortName.localeCompare(b.shortName))

  const freeTexts = findFreeTexts(layout)
  const personal = collectPersonalData(document, layout)
  const versionCode = info === undefined ? undefined : readNumber(info, 'versionCode')

  const orientations: Orientation[] = (['landscape', 'portrait'] as const)
    .filter((o) => layout[o].length > 0)

  const read: IdentityRead = {
    byteLength: container.source.byteLength,
    containerKind: container.kind,
    extraFileNames: container.extras.map((entry) => entry.name),
    rootKeys: keysOf(document),
    exportType: info === undefined ? undefined : readString(info, 'exportType'),
    deviceString: info === undefined ? undefined : readString(info, 'device'),
    versionCode,
    versionName: info === undefined ? undefined : readString(info, 'versionName'),
    proUpTo: info === undefined ? undefined : readNumber(info, 'proUpTo'),
    orientations,
    pageCount: { landscape: layout.landscape.length, portrait: layout.portrait.length },
    widgetCount,
    widgetTypes,
    preferenceKeyCount: keysOf(preferences).length,
    freeTexts,
    personalData: personal.findings,
    personalCounts: personal.counts,
    externalResources: readExternalResources(preferences),
    duplicateKeys: findDuplicateKeys(document),
    parseError: container.parseError
  }

  const isPro = options.isProWidget
  const proWidgets = isPro === undefined
    ? []
    : widgetTypes.map((type) => type.shortName).filter((shortName) => isPro(shortName))

  const reference = options.referenceVersionCode
  const versionGap: IdentityAssumed['versionGap'] =
    reference === undefined || versionCode === undefined ? 'unknown'
      : versionCode === reference ? 'same'
        : versionCode < reference ? 'older' : 'newer'

  const assumed: IdentityAssumed = {
    device: deviceFor(read.deviceString),
    deviceRecognised: isDeviceRecognised(read.deviceString),
    proWidgets,
    proKnowledge: isPro === undefined ? 'absent' : 'catalogue',
    versionGap,
    // Un emplacement **vide** ne voyage pas : une fiche `contact` de `WButtonPhone`
    // présente et sans rien dedans n'est pas un numéro de téléphone. L'inventaire la
    // porte quand même — c'est un renseignement — mais elle ne fait pas dire « oui » ici.
    personalDataTravelsWithPages:
      personal.findings.some((finding) => finding.home === 'layout' && finding.filled)
  }

  return { read, assumed }
}
