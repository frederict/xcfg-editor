import './libraryPanel.css'
import { readableName } from '../catalog/widgetNames'
import { formatTechnicalDetail } from '../core/technicalDetail'
import { sha256Hex } from '../library/digest'
import { LibraryError, libraryErrorText, libraryProseText } from '../library/errors'
import { personalInventoryOf, type EntryIdentity, type PersonalDatum } from '../library/identity'
import type { BrokenEntry, Library, LibraryEntry, LibrarySnapshot } from '../library/library'
import { exportLibrary, importLibrary, type ImportReport } from '../library/transfer'
import { isReadFromApk, personalProse, type PersonalProse } from '../model/personalData'
import type { Translator } from '../i18n'

/**
 * La **bibliothèque de configurations nommées**, côté pilote : ranger, retrouver, revenir
 * en arrière.
 *
 * ## Le geste que cette interface rend possible
 *
 * XCTrack ne connaît que « la » configuration courante. Un pilote qui veut une disposition
 * pour la compétition, une pour le vol-bivouac et une pour l'école exporte des fichiers et
 * s'en souvient ; sur AIR³, changer de profil ou réinitialiser **écrase tout**. Ici, trois
 * gestes suffisent :
 *
 * 1. **Ranger** la configuration ouverte sous un nom — « Comp Annecy » ;
 * 2. **Retrouver** l'entrée dans la liste, avec sa carte d'identité et sa date ;
 * 3. **Revenir en arrière** : recharger l'entrée précédente, qui n'a pas bougé.
 *
 * Le troisième est le seul qui compte vraiment, et c'est celui que l'interface protège :
 * charger une autre configuration alors que le document ouvert porte des modifications non
 * enregistrées **s'arrête et demande**, avec « ranger d'abord » comme issue proposée.
 *
 * ## Ce que ce module ne fait pas
 *
 * - **Aucun aperçu rendu.** `src/render/` est hors périmètre : la place est réservée dans
 *   les données (`PreviewRef`, `setPreview`, `previewOf`), la vignette est ici un cadre
 *   vide qui dit ce qui viendra. Aucun pixel n'est produit.
 * - **Rien vers l'extérieur.** Pas de serveur, pas de réseau. L'export de la bibliothèque
 *   est un téléchargement local, l'import une lecture de fichier.
 * - **Aucun état global.** Tout arrive par `LibraryPanelOptions` : la bibliothèque, le
 *   document ouvert, l'horloge, le téléchargement. C'est l'assembleur qui décide où et
 *   quand poser l'élément — ce module ne sait ni ouvrir un fichier, ni recharger la page.
 *
 * ## Les deux moitiés de la carte d'identité, jamais mélangées
 *
 * `identityCard` rend deux listes séparées et l'interface les affiche sous deux titres
 * distincts : **ce que le fichier déclare** et **ce que cet éditeur suppose**. Le gabarit
 * d'écran, la résolution et le drapeau « Pro » ne sont pas dans le fichier — ils viennent
 * de notre table et d'un catalogue extrait de l'APK. Les afficher côte à côte avec le
 * `versionCode` lu leur donnerait la même autorité, et le pilote ne saurait plus ce qu'il
 * peut croire.
 *
 * ## Une seule couche à l'écran, toujours
 *
 * Ranger, renommer, lire une carte d'identité, vérifier une empreinte, confirmer une
 * suppression : **aucun de ces gestes n'ouvre de boîte par-dessus une autre**. Chacun
 * ouvre un *niveau* qui remplace la liste dans le panneau, avec son titre et son
 * « ← Retour à la liste ». C'était le seul endroit de l'application où des modales
 * s'empilaient, et le dommage n'était pas l'empilement : c'était que les deux boutons
 * « Fermer » se retrouvaient à la même hauteur, 128 px l'un de l'autre. Voir
 * `createViewStack` pour ce que la `<dialog>` native donnait et par quoi c'est remplacé.
 *
 * ## Ce que l'interface refuse de taire
 *
 * - un rangement **non durable** (`snapshot.durable === false`) est annoncé en tête, avant
 *   toute autre chose : une bibliothèque qui disparaît à la fermeture de l'onglet est un
 *   brouillon, pas une sauvegarde ;
 * - une entrée **illisible** garde sa place, avec sa raison et son bouton de suppression ;
 * - un **quota** atteint est dit, avec l'export de la bibliothèque comme issue ;
 * - un **conflit** entre onglets propose un rechargement, jamais un écrasement ;
 * - les **données personnelles** d'une entrée sont comptées sur la carte et signalées dans
 *   la liste, avec la distinction qui compte : celles du `layout` **voyagent avec les
 *   pages**, un export « pages » n'est donc pas sûr par construction ;
 * - **l'effacement complet** existe — le pilote qui prête son ordinateur ne doit pas avoir
 *   à supprimer ses entrées une à une — et il est nommé par son **étendue**, chiffré, et
 *   précédé de l'archive : voir `askClearAll`, qui dit aussi ce qui reste dans ce
 *   navigateur après lui.
 */

/* ============================================================ ce que l'assembleur donne */

/**
 * Le document actuellement ouvert dans l'éditeur, tel que l'assembleur le connaît.
 *
 * `bytes()` est une fonction et non des octets : l'assembleur les produit avec
 * `exportContainer(container)` au moment où on les range, pas avant. Un document modifié
 * entre l'ouverture du panneau et le clic doit être rangé **tel qu'il est au clic**.
 */
export interface CurrentDocument {
  /** Le nom du fichier ouvert, pour le conserver dans l'entrée. */
  fileName: string
  /**
   * Vrai si le document porte des modifications non enregistrées — `container.modified`
   * côté assembleur. C'est **la seule information** qui déclenche la demande avant de
   * charger une autre configuration.
   */
  modified: boolean
  /** Les octets à ranger, produits à la demande. */
  bytes: () => Promise<Uint8Array>
  /** Nom proposé dans le champ. À défaut, le radical du nom de fichier. */
  suggestedName?: string
}

export interface LibraryPanelOptions {
  /**
   * Le traducteur de **notre prose**, dans la langue du pilote. Passé, jamais lu : ce
   * module ne va pas chercher la langue courante. À ne pas confondre avec `language`
   * ci-dessous, qui suit le **fichier ouvert** et nomme les gadgets — voir
   * `src/i18n/axes.ts`.
   */
  readonly tr: Translator
  /** La bibliothèque ouverte par l'assembleur — magasin durable ou repli en mémoire. */
  library: Library
  /**
   * Le document ouvert, relu **à chaque geste** : un getter, jamais une valeur figée.
   * Absent (ou rendant `undefined`) quand aucun fichier n'est ouvert : le rangement de la
   * configuration courante est alors désactivé, et rien d'autre ne change.
   */
  current?: () => CurrentDocument | undefined
  /**
   * Charger une entrée dans l'éditeur. Reçoit l'entrée **et ses octets déjà vérifiés**
   * contre l'empreinte enregistrée avec eux : si l'empreinte est fausse, ce rappel n'est
   * jamais appelé et le pilote voit l'échec.
   *
   * Absent, le bouton « Charger » n'est pas construit — le panneau reste utile en
   * consultation, en export et en import.
   */
  onLoad?: (entry: LibraryEntry, bytes: Uint8Array) => void | Promise<void>
  /** Langue des noms de gadgets. Défaut : `'fr'`. */
  language?: string
  /** L'horloge, injectable : les noms de fichiers exportés en dépendent. */
  now?: () => Date
  /**
   * Livrer des octets au pilote. Injectable parce qu'aucun test ne peut cliquer un
   * téléchargement : le défaut fabrique un lien objet et le clique.
   */
  download?: (bytes: Uint8Array, fileName: string) => void
  /**
   * `estimateStorage` de `src/library/indexedDbStore.ts`, quand l'assembleur l'a sous la
   * main. Injecté plutôt qu'importé : ce panneau ne doit pas décider du magasin.
   * Rend `undefined` là où le navigateur ne dit rien — et alors on n'affiche pas de jauge
   * plutôt que d'en inventer une.
   */
  estimateStorage?: () => Promise<{ usage: number; quota: number } | undefined>
  /** `requestPersistence` du même module. Absent : le bouton n'est pas construit. */
  requestPersistence?: () => Promise<'granted' | 'denied' | 'unsupported'>
}

export interface LibraryPanelHandle {
  /** L'élément à poser où l'assembleur veut. Rien n'est ajouté au document par ce module. */
  element: HTMLElement
  /** Relit la bibliothèque et redessine. Rendu pour que l'assembleur puisse forcer. */
  refresh: () => Promise<void>
  /**
   * Referme le niveau ouvert dans le panneau — nommer, carte d'identité, empreinte,
   * confirmation — et rend `true` s'il y en avait un.
   *
   * **C'est ce qui remplace l'`Échap` d'une modale imbriquée.** Celui qui héberge le
   * panneau dans une `<dialog>` l'appelle sur l'événement `cancel` et ne referme la boîte
   * que si le panneau rend `false` : `Échap` recule alors d'un niveau, et ne ferme la
   * bibliothèque que depuis la liste.
   */
  back: () => boolean
  /** Le titre du niveau ouvert, `undefined` quand la liste est à l'écran. */
  viewTitle: () => string | undefined
  /**
   * Se désabonne des changements et referme les niveaux ouverts. **Ne ferme pas la
   * bibliothèque** : elle appartient à l'assembleur, qui peut la rouvrir ailleurs.
   */
  close: () => void
}

/* ================================================================ mise dans la langue */

/**
 * Une date ISO à la minute, dans la langue du pilote. Une date absente ou illisible —
 * un enregistrement ancien, dont `addedAt` est vide — se dit, elle ne se devine pas : le
 * formateur du socle rend `undefined`, et le mot à écrire alors est de la prose.
 *
 * Les douze noms de mois écrits en dur ont disparu avec les quatre lignes qui les
 * assemblaient. C'était la partie du dépôt qui cassait le plus franchement hors du
 * français : « 3 August 2026 » n'est ni anglais ni allemand.
 */
export function formatStamp(tr: Translator, iso: string): string {
  return tr.format.dateTime(iso) ?? tr.t('common.unknownDate')
}

/**
 * Deux chiffres, pour `fileStamp` et pour lui seul.
 *
 * **Ne passe pas par `Intl`, et ne doit pas y passer** : ce qu'il compose est un nom de
 * fichier, pas une phrase. L'ISO y est la seule forme qui se trie toute seule dans un
 * dossier et qui ne dépende d'aucune langue — le pilote allemand et le pilote espagnol
 * doivent retrouver la même archive au même endroit.
 */
const pad = (value: number): string => String(value).padStart(2, '0')

/** Horodatage compact pour un nom de fichier : `2026-08-21-1532`. */
function fileStamp(when: Date): string {
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-` +
    `${pad(when.getHours())}${pad(when.getMinutes())}`
}

/**
 * « enregistrée 3 fois ». `revision` vaut 1 au rangement et grandit d'une écriture à
 * l'autre : c'est un compte, et le pilote le lit comme tel — « révision 3 » lui demandait
 * de deviner à la fois le mot et son point de départ.
 *
 * La forme `one` du message est « enregistrée une seule fois » et ne porte donc pas de
 * nombre : c'est la phrase que le français dit à 1, et le socle la choisit tout seul.
 */
function timesStored(tr: Translator, revision: number): string {
  return tr.t('library.timesStored', { count: revision })
}

/**
 * Le format d'export, dit en toutes lettres. `undefined` n'est pas « inconnu » par
 * paresse : les fichiers de 2022 n'ont pas d'`exportType` du tout, et c'est un
 * renseignement.
 */
export function exportTypeLabel(tr: Translator, exportType: string | undefined): string {
  if (exportType === 'backup') return tr.t('library.exportTypeBackup')
  if (exportType === 'pages') return tr.t('library.exportTypePages')
  if (exportType === undefined) return tr.t('library.exportTypeUndeclared')
  return exportType
}

/** Le même, en deux mots, pour la pastille de la liste. */
export function exportTypeChip(tr: Translator, exportType: string | undefined): string {
  if (exportType === 'backup') return tr.t('library.chipBackup')
  if (exportType === 'pages') return tr.t('library.chipPages')
  if (exportType === undefined) return tr.t('library.chipUndeclared')
  return exportType
}

/**
 * Quatre états nommés **par rapport à un repère que la phrase dit** : « la version de
 * référence de cet éditeur » ne désignait rien pour un pilote, et « impossible à situer »
 * lui faisait croire à une défaillance de l'outil là où c'est le fichier qui se tait.
 *
 * Un cinquième état venu d'une version future de `describeContainer` ressortirait tel
 * quel, sans phrase inventée : c'est ce que le `?? gap` du bas dit.
 */
function versionGapText(tr: Translator, gap: string): string {
  if (gap === 'older') return tr.t('library.versionGapOlder')
  if (gap === 'same') return tr.t('library.versionGapSame')
  if (gap === 'newer') return tr.t('library.versionGapNewer')
  if (gap === 'unknown') return tr.t('library.versionGapUnknown')
  return gap
}

/**
 * L'emplacement d'une donnée personnelle, dans les mots du pilote.
 *
 * Les mots viennent de `model/personalData.ts`, comme les natures et les bases : c'est
 * ce qui fait que la bibliothèque, la page des réglages, la boîte de partage et
 * l'avertissement d'export disent la même chose avec les mêmes termes.
 */
export function personalDatumWhere(tr: Translator, datum: PersonalDatum): string {
  return personalProse(tr).home(datum.home)
}

/* =========================================================== la carte d'identité, pure */

export interface IdentityFact {
  label: string
  value: string
  /** D'où sort la valeur, quand la question se pose. Absent : rien à ajouter. */
  note?: string
}

/**
 * Les deux moitiés de la carte, **séparées à la source** et non à l'affichage.
 *
 * `read` ne contient que ce que le fichier déclare : un champ absent y est dit absent,
 * jamais remplacé par un défaut. `assumed` ne contient que ce que cet outil ajoute, et
 * chaque ligne porte la provenance de ce qu'elle affirme — notre table d'appareils, le
 * catalogue extrait de l'APK, la version de référence de l'éditeur. Toute ligne de
 * `assumed` peut être fausse **sans que le fichier soit en cause** : c'est exactement la
 * distinction que le projet existe pour tenir.
 */
export interface IdentityCard {
  read: IdentityFact[]
  assumed: IdentityFact[]
}

export function identityCard(
  tr: Translator, identity: EntryIdentity, language = 'fr'
): IdentityCard {
  const { read, assumed } = identity

  const pages = read.orientations.length === 0
    ? tr.t('library.noPage')
    : [
      read.pageCount.landscape > 0
        ? tr.t('library.landscapePageCount', { count: read.pageCount.landscape })
        : '',
      read.pageCount.portrait > 0
        ? tr.t('library.portraitPageCount', { count: read.pageCount.portrait })
        : ''
    ].filter((part) => part !== '').join(' · ')

  // Un décompte par type, aligné comme une donnée : le nom du gadget vient du catalogue de
  // XCTrack (axe `labels`), le nombre est mis en forme par la langue du pilote.
  const topTypes = read.widgetTypes.slice(0, 5)
    .map((type) => `${readableName(type.shortName, language)} × ${tr.format.number(type.count)}`)
    .join(', ')

  const readFacts: IdentityFact[] = [
    {
      label: tr.t('library.factExportType'),
      value: exportTypeLabel(tr, read.exportType),
      note: tr.t('library.factExportTypeNote')
    },
    {
      label: tr.t('library.factContainer'),
      value: read.containerKind === 'xczfg'
        ? tr.t('library.containerArchive', { count: read.extraFileNames.length })
        : tr.t('library.containerPlain'),
      note: read.extraFileNames.length === 0
        ? undefined
        : tr.t('library.containerExtrasNote', { names: read.extraFileNames.join(', ') })
    },
    { label: tr.t('library.factSize'), value: tr.format.byteSize(read.byteLength) },
    {
      label: tr.t('library.factVersion'),
      value: read.versionName === undefined && read.versionCode === undefined
        ? tr.t('library.versionAbsent')
        // Le nom et le code partent en `string` : ce sont des identifiants lus dans le
        // fichier, et « 100 030 » ne se retrouve dans aucun fichier XCTrack.
        : tr.t('library.versionValue', {
          name: read.versionName ?? tr.t('library.versionNameAbsent'),
          code: read.versionCode === undefined
            ? tr.t('library.versionCodeAbsent')
            : String(read.versionCode)
        }),
      note: tr.t('library.factVersionNote')
    },
    {
      label: tr.t('library.factDevice'),
      value: read.deviceString ?? tr.t('library.deviceAbsent'),
      note: tr.t('library.factDeviceNote')
    },
    { label: tr.t('library.factPages'), value: pages },
    {
      label: tr.t('library.factWidgets'),
      value: tr.t('library.widgetsOfTypes', {
        count: read.widgetCount,
        types: tr.t('library.typeCount', { count: read.widgetTypes.length })
      }),
      note: topTypes === '' ? undefined : tr.t('library.topTypesNote', { types: topTypes })
    },
    {
      label: tr.t('library.factRootSections'),
      value: read.rootKeys.length === 0 ? tr.t('library.noRootSection') : read.rootKeys.join(', ')
    },
    {
      label: tr.t('library.factSettings'),
      value: read.preferenceKeyCount === 0
        ? tr.t('library.settingsNone')
        : tr.t('library.settingLineCount', { count: read.preferenceKeyCount }),
      note: read.preferenceKeyCount === 0 ? undefined : tr.t('library.settingsNote')
    }
  ]

  if (read.duplicateKeys.length > 0) {
    readFacts.push({
      label: tr.t('library.factDuplicates'),
      value: tr.t('library.duplicateLineCount', { count: read.duplicateKeys.length }),
      note: tr.t('library.duplicatesNote', { keys: read.duplicateKeys.join(', ') })
    })
  }
  if (read.externalResources.length > 0) {
    readFacts.push({
      label: tr.t('library.factExternal'),
      value: read.externalResources.map((resource) => resource.name).join(', '),
      note: tr.t('library.externalNote')
    })
  }
  if (read.parseError !== undefined) {
    readFacts.push({
      label: tr.t('library.factParse'),
      value: tr.t('library.parseFailed'),
      note: tr.t('library.parseNote', { detail: read.parseError })
    })
  }

  const assumedFacts: IdentityFact[] = [
    {
      label: tr.t('library.factScreen'),
      // Le nom du gabarit et sa résolution : une ligne de données, sans un mot à traduire.
      // Le nombre n'y passe pas par le formateur — « 1 280 × 720 px » ne se lit nulle part.
      value: assumed.deviceRecognised
        ? `${assumed.device.label} — ${assumed.device.widthPx} × ${assumed.device.heightPx} px`
        : tr.t('library.screenFallback', { device: assumed.device.label }),
      note: tr.t('library.factScreenNote')
    },
    {
      label: tr.t('library.factPro'),
      value: assumed.proKnowledge === 'absent'
        ? tr.t('library.proUnknown')
        : assumed.proWidgets.length === 0
          ? tr.t('library.proNone')
          : assumed.proWidgets.map((shortName) => readableName(shortName, language)).join(', '),
      note: assumed.proKnowledge === 'absent'
        ? tr.t('library.proUnknownNote')
        : tr.t('library.proNote')
    },
    {
      label: tr.t('library.factVersionGap'),
      value: versionGapText(tr, assumed.versionGap),
      note: tr.t('library.factVersionGapNote')
    },
    {
      label: tr.t('library.factPersonalTravels'),
      value: assumed.personalDataTravelsWithPages
        ? tr.t('library.personalTravelsYes')
        : tr.t('library.personalTravelsNo'),
      note: assumed.personalDataTravelsWithPages
        ? tr.t('library.personalTravelsYesNote')
        : tr.t('library.personalTravelsNoNote')
    }
  ]

  return { read: readFacts, assumed: assumedFacts }
}

/**
 * Ce qu'une entrée porte de personnel, compté. Sert à la pastille de la liste : le détail,
 * lui, est sur la carte.
 */
export function personalDataCount(identity: EntryIdentity): { total: number; inLayout: number } {
  const { counts } = personalInventoryOf(identity)
  return { total: counts.total, inLayout: counts.layout }
}

/* ============================================================================== le DOM */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(label: string, className = 'btn'): HTMLButtonElement {
  const node = el('button', className, label)
  node.type = 'button'
  return node
}

/** Le radical d'un nom de fichier : « comp-annecy.xcfg » → « comp-annecy ». */
export function stemOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const stem = dot <= 0 ? fileName : fileName.slice(0, dot)
  return stem === '' ? 'Configuration' : stem
}

function defaultDownload(bytes: Uint8Array, fileName: string): void {
  // Copie dans un `ArrayBuffer` simple, comme `main.ts` : `Blob` n'accepte pas une vue
  // dont le tampon pourrait être partagé.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
  const link = el('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/* ============================================== les niveaux, à l’intérieur du panneau */

/**
 * Ce panneau n'ouvre **aucune boîte de dialogue par-dessus une autre**. Nommer, renommer,
 * lire une carte d'identité, vérifier une empreinte, confirmer une suppression : chacun de
 * ces gestes ouvre un **niveau** qui *remplace* la liste à l'intérieur du panneau, avec son
 * titre et son « ← Retour à la liste ».
 *
 * ## Pourquoi pas une seconde `<dialog>`
 *
 * Mesuré au `getBoundingClientRect()` sur la version précédente : « Ranger la configuration
 * ouverte » ouvrait une modale par-dessus celle de la bibliothèque, et les deux boutons
 * « Fermer » se retrouvaient **à la même hauteur, 128 px l'un de l'autre**. Rien ne disait
 * lequel fermait quoi, et « Supprimer » ajoutait une troisième couche. Un pilote qui n'est
 * pas informaticien n'a aucune raison de savoir qu'il existe des couches : il faut donc
 * qu'il n'y en ait qu'une, toujours, et qu'elle porte le nom de ce qu'on est en train de
 * faire.
 *
 * ## Ce que la `<dialog>` native donnait gratuitement, et comment on le rend
 *
 * | Ce qui disparaît avec l'empilement | Ce qui le remplace, explicitement |
 * |---|---|
 * | le piège de focus | la couche qui reste — celle de la bibliothèque — le tient toujours ; et le contenu remplacé passe en `hidden`, donc hors de l'ordre de tabulation **et** hors de l'arbre d'accessibilité |
 * | `Échap` | `back()` est rendu à l'appelant : `openLibraryDialog` l'appelle sur l'événement `cancel` et ne referme la boîte que s'il ne restait aucun niveau. Hors modale, le panneau écoute `Échap` lui-même |
 * | l'inertie du fond | il n'y a plus de fond : un seul contenu est présent à la fois |
 * | le retour du focus à l'ouvrant | mémorisé à l'ouverture du niveau, rendu à sa fermeture |
 * | l'annonce du titre à l'ouverture | un `role="status"` hors du contenu masqué dit le niveau ouvert, puis le retour |
 */

interface ViewChoice {
  label: string
  primary?: boolean
  run: () => void | Promise<void>
}

interface ViewSpec {
  title: string
  /** Le corps, déjà construit par l'appelant : du texte, une liste, un formulaire. */
  body: HTMLElement
  choices: ViewChoice[]
  /** Appelé sur « ← Retour », sur le bouton de fin, ou sur « Échap ». */
  onCancel?: () => void
  /** L'intitulé du bouton de fin. Défaut : « Annuler ». */
  cancelLabel?: string
  /** Élément à mettre au focus. Défaut : le premier bouton principal, sinon le retour. */
  focus?: HTMLElement
  /**
   * `grave` cadre le niveau d'un filet ambre. Réservé à ce qui ne se rattrape pas : une
   * suppression sans corbeille. En perdant la modale, la confirmation a perdu son
   * interruption — le filet et le titre la rendent, le texte n'a pas changé d'un mot.
   */
  tone?: 'grave'
}

interface ViewFrame {
  title: string
  node: HTMLElement
  returnFocus: HTMLElement | undefined
}

interface ViewStack {
  /** Ouvre un niveau par-dessus le précédent — sans jamais ajouter de couche à l'écran. */
  open: (spec: ViewSpec) => void
  /** Referme le niveau du dessus. Rend `false` s'il n'y en avait aucun. */
  back: () => boolean
  /** Referme tous les niveaux d'un coup, sans appeler leurs annulations. */
  reset: () => void
  /** Combien de niveaux sont empilés — `0` quand la liste est à l'écran. */
  depth: () => number
  /** Le titre du niveau ouvert, `undefined` sur la liste. */
  title: () => string | undefined
}

/** Les `id` des titres de niveau, pour `aria-labelledby`. */
let viewSequence = 0

/**
 * La pile de niveaux d'un panneau. `main` est tout ce qui se laisse remplacer : la tête,
 * les bandeaux, la liste, le pied. Ce qui doit rester audible — l'annonceur — vit dehors,
 * sans quoi il serait masqué avec le reste et n'annoncerait plus rien.
 */
function createViewStack(
  tr: Translator, root: HTMLElement, main: HTMLElement, announce: (text: string) => void
): ViewStack {
  const host = el('div', 'library__view')
  host.hidden = true
  root.append(host)

  const frames: ViewFrame[] = []

  const show = (): void => {
    const top = frames[frames.length - 1]
    host.textContent = ''
    if (top === undefined) {
      host.hidden = true
      main.hidden = false
      return
    }
    // `hidden` plutôt qu'un `display: none` de feuille de style : c'est la seule forme qui
    // sorte AUSSI le contenu de l'arbre d'accessibilité et de l'ordre de tabulation, ce
    // que faisait l'inertie du fond d'une modale.
    main.hidden = true
    host.hidden = false
    host.append(top.node)
  }

  const back = (): boolean => {
    const top = frames.pop()
    if (top === undefined) return false
    show()
    const below = frames[frames.length - 1]
    announce(below === undefined
      ? tr.t('library.announceBackToList')
      : tr.t('library.announceBackTo', { title: below.title }))
    // L'ouvrant a pu disparaître entre-temps — la liste se redessine sur un changement
    // venu d'un autre onglet. Le focus reste alors dans le panneau plutôt que de retomber
    // sur le document.
    const target = top.returnFocus?.isConnected === true
      ? top.returnFocus
      : main.querySelector('button')
    if (target instanceof HTMLElement) target.focus()
    return true
  }

  const open = (spec: ViewSpec): void => {
    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined

    const node = el('section', 'library__viewFrame')
    if (spec.tone === 'grave') node.classList.add('library__viewFrame--grave')
    const titleId = `library-view-${++viewSequence}`
    node.setAttribute('role', 'group')
    node.setAttribute('aria-labelledby', titleId)

    const head = el('div', 'library__viewHead')
    // Le retour est en HAUT À GAUCHE, le « Fermer » de la bibliothèque en haut à droite :
    // c'est ce qui remplace les deux « Fermer » qui se touchaient.
    const backButton = button(
      tr.t(frames.length === 0 ? 'library.backToList' : 'library.back'), 'btn library__back'
    )
    const heading = el('h3', 'library__viewTitle', spec.title)
    heading.id = titleId
    head.append(backButton, heading)

    const bodyWrap = el('div', 'library__viewBody')
    bodyWrap.append(spec.body)

    const actions = el('div', 'library__viewActions')
    const cancel = button(spec.cancelLabel ?? tr.t('library.cancel'))
    actions.append(cancel)

    let primaryButton: HTMLButtonElement | undefined
    for (const choice of spec.choices) {
      const control = button(choice.label, choice.primary === true ? 'btn btn--primary' : 'btn')
      control.addEventListener('click', () => {
        // On referme AVANT d'agir : le message de l'action s'affiche alors sur la liste,
        // là où le pilote revient, et un geste qui enchaîne sur un autre niveau le
        // remplace au lieu de s'ajouter.
        back()
        void choice.run()
      })
      if (choice.primary === true && primaryButton === undefined) primaryButton = control
      actions.append(control)
    }

    const giveUp = (): void => {
      if (back()) spec.onCancel?.()
    }
    backButton.addEventListener('click', giveUp)
    cancel.addEventListener('click', giveUp)

    node.append(head, bodyWrap, actions)
    frames.push({ title: spec.title, node, returnFocus })
    show()
    announce(spec.title)

    /*
     * Un niveau s'ouvre sur son DÉBUT. La boîte de la bibliothèque défile (`.modal__box`),
     * et la carte d'identité d'une sauvegarde complète tient sur plusieurs écrans : sans
     * cette remise à zéro, on entrerait dans la carte à la hauteur où l'on avait laissé la
     * liste. Même raison qu'au focus, mesurée au pilote CDP sur la version en modales.
     */
    const scroller = root.closest('.modal__box')
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0
    else if (typeof root.scrollIntoView === 'function') root.scrollIntoView({ block: 'nearest' })

    /*
     * Le focus va au bouton principal — sauf sur un niveau `grave`, où il va au RETOUR.
     * Sur « Supprimer », le bouton principal est la suppression : l'ouvrir avec elle sous
     * la barre d'espace ferait du geste le plus destructeur celui qui demande le moins
     * d'intention. On ouvre donc sur la sortie, et supprimer se vise.
     */
    const landing = spec.focus
      ?? (spec.tone === 'grave' ? backButton : primaryButton)
      ?? backButton
    landing.focus()
  }

  return {
    open,
    back,
    reset: () => { frames.length = 0; show() },
    depth: () => frames.length,
    title: () => frames[frames.length - 1]?.title
  }
}

interface FieldSpec {
  key: string
  label: string
  value: string
  multiline?: boolean
  hint?: string
}

/** Un niveau à champs : nommer, renommer, annoter. Rend les valeurs saisies. */
function openFormView(views: ViewStack, spec: {
  title: string
  lead: string
  fields: FieldSpec[]
  confirmLabel: string
  onConfirm: (values: Record<string, string>) => void | Promise<void>
}): void {
  const body = el('div', 'library__form')
  body.append(el('p', 'library__lead', spec.lead))

  const inputs = new Map<string, HTMLInputElement | HTMLTextAreaElement>()
  for (const field of spec.fields) {
    const wrap = el('label', 'library__field')
    wrap.append(el('span', 'library__fieldLabel', field.label))
    const input = field.multiline === true
      ? el('textarea', 'library__input library__input--note')
      : el('input', 'library__input')
    if (input instanceof HTMLInputElement) input.type = 'text'
    input.value = field.value
    wrap.append(input)
    if (field.hint !== undefined) wrap.append(el('span', 'library__hint', field.hint))
    inputs.set(field.key, input)
    body.append(wrap)
  }

  const first = [...inputs.values()][0]
  views.open({
    title: spec.title,
    body,
    focus: first,
    choices: [{
      label: spec.confirmLabel,
      primary: true,
      run: () => {
        const values: Record<string, string> = {}
        for (const [key, input] of inputs) values[key] = input.value
        return spec.onConfirm(values)
      }
    }]
  })
}

/* ============================================================================ le panneau */

/** Le ton d'un message : il change la couleur du filet, jamais le texte. */
type FlashTone = 'info' | 'trouble'

export function renderLibraryPanel(options: LibraryPanelOptions): LibraryPanelHandle {
  const library = options.library
  const tr = options.tr
  const language = options.language ?? 'fr'
  const now = options.now ?? (() => new Date())
  const download = options.download ?? defaultDownload
  // Construit une fois pour tout le panneau : une entrée en porte jusqu'à seize lignes, et
  // chacune demande quatre de ces six mots.
  const personal: PersonalProse = personalProse(tr)

  const root = el('section', 'library')
  root.setAttribute('aria-label', tr.t('library.panelLabel'))

  /*
   * Tout ce qui se laisse remplacer par un niveau vit dans `main` : la tête, les bandeaux,
   * la liste, le pied. Quand un niveau s'ouvre, `main` passe en `hidden` — le pilote ne
   * voit plus qu'une chose à la fois, et un lecteur d'écran non plus.
   */
  const main = el('div', 'library__main')
  root.append(main)

  /* --- tête : ce qu'on peut faire --- */

  const head = el('header', 'library__head')
  const title = el('h2', 'library__title', tr.t('library.title'))
  const actions = el('div', 'library__actions')
  head.append(title, actions)

  const storeCurrent = button(tr.t('library.storeCurrent'), 'btn btn--primary')
  const addFile = button(tr.t('library.addFile'))
  const exportAll = button(tr.t('library.exportAll'))
  const importAll = button(tr.t('library.importAll'))
  actions.append(storeCurrent, addFile, exportAll, importAll)

  // Deux sélecteurs de fichiers, invisibles : le bouton visible est le nôtre, celui du
  // navigateur n'est jamais habillable et son libellé anglais dépend de la locale du système.
  const hiddenPicker = (accept: string): HTMLInputElement => {
    const picker = el('input', 'sr-only')
    picker.type = 'file'
    picker.accept = accept
    // Hors de l'ordre de tabulation ET hors de l'arbre d'accessibilité : sans cela, un
    // lecteur d'écran annonce deux « Choisir un fichier » sans intitulé juste après nos
    // boutons, qui font déjà le travail (relevé sur l'arbre a11y de la page d'essai).
    picker.tabIndex = -1
    picker.setAttribute('aria-hidden', 'true')
    return picker
  }
  const filePicker = hiddenPicker('.xcfg,.xczfg')
  const archivePicker = hiddenPicker('.zip')
  head.append(filePicker, archivePicker)

  main.append(head)

  main.append(el('p', 'library__lead', tr.t('library.lead')))

  /* --- les bandeaux : durabilité, puis message courant --- */

  const storageNote = el('div', 'library__banner library__banner--storage')
  storageNote.hidden = true
  main.append(storageNote)

  const flash = el('div', 'library__flash')
  flash.setAttribute('role', 'status')
  flash.hidden = true
  main.append(flash)

  const listWrap = el('div', 'library__body')
  main.append(listWrap)

  const foot = el('p', 'library__foot')
  main.append(foot)

  /*
   * L'annonceur vit HORS de `main` : masqué avec lui, il n'annoncerait plus rien. C'est
   * ce qui remplace, pour un lecteur d'écran, l'annonce qu'une `<dialog>` fait d'elle-même
   * en s'ouvrant.
   */
  const announcer = el('p', 'sr-only')
  announcer.setAttribute('role', 'status')
  root.append(announcer)

  const views = createViewStack(tr, root, main, (text) => { announcer.textContent = text })

  /* ------------------------------------------------------------------ dire ce qui arrive */

  const say = (text: string, tone: FlashTone = 'info', extra?: HTMLElement): void => {
    flash.textContent = ''
    flash.className = `library__flash library__flash--${tone}`
    flash.hidden = false
    flash.append(el('span', 'library__flashText', text))
    if (extra !== undefined) flash.append(extra)
  }

  const clearFlash = (): void => {
    flash.hidden = true
    flash.textContent = ''
  }

  /**
   * Traduit un échec en message, **et en issue**.
   *
   * Le quota et le conflit sont les deux seules défaillances auxquelles le pilote peut
   * répondre : la première en exportant puis en faisant de la place, la seconde en
   * rechargeant. Chacune arrive donc avec le bouton qui va avec, plutôt qu'avec une
   * consigne à exécuter de tête.
   */
  const showFailure = (context: string, error: unknown): void => {
    if (error instanceof LibraryError) {
      if (error.failure === 'quota') {
        const action = button(tr.t('library.exportNow'))
        action.addEventListener('click', () => { void doExport() })
        say(libraryErrorText(error, tr), 'trouble', action)
        return
      }
      if (error.failure === 'conflict') {
        const action = button(tr.t('library.reloadLibrary'))
        action.addEventListener('click', () => { void refresh() })
        say(tr.t('library.conflict', { message: libraryErrorText(error, tr) }), 'trouble', action)
        return
      }
      say(libraryErrorText(error, tr), 'trouble')
      return
    }
    // Le contexte est une phrase du pilote (« Suppression », « Rangement ») ; le détail
    // vient après, nommé, et sans le « Error: » du moteur JavaScript.
    say(
      tr.t('library.operationFailed', {
        context,
        detail: formatTechnicalDetail(error, tr)
      }),
      'trouble'
    )
  }

  const guard = async (context: string, body: () => Promise<void>): Promise<void> => {
    try {
      await body()
    } catch (error) {
      showFailure(context, error)
    }
  }

  /* --------------------------------------------------------------------- la carte d'identité */

  const factList = (facts: IdentityFact[]): HTMLElement => {
    const list = el('dl', 'library__facts')
    for (const fact of facts) {
      list.append(el('dt', 'library__factLabel', fact.label))
      const value = el('dd', 'library__factValue')
      value.append(el('span', 'library__factText', fact.value))
      if (fact.note !== undefined) value.append(el('span', 'library__factNote', fact.note))
      list.append(value)
    }
    return list
  }

  const personalSection = (entry: LibraryEntry): HTMLElement => {
    const section = el('section', 'library__section')
    section.append(el('h3', 'library__heading', tr.t('library.personalHeading')))

    const { findings: data, counts } = personalInventoryOf(entry.identity)
    if (data.length === 0) {
      section.append(el(
        'p', 'library__note',
        tr.t('library.noPersonalData', { caveat: personal.caveat() })
      ))
      return section
    }

    /*
     * Trois accords dans une seule phrase — le total, ce qui est renseigné, ce qui est
     * vide. Chacun arrive déjà accordé dans son repère : la phrase reste entière, et
     * l'allemand peut la réécrire d'un bout à l'autre sans qu'on ait à découper.
     */
    section.append(el(
      'p', 'library__note',
      tr.t('library.personalSummary', {
        total: tr.t('library.personalTotal', { count: counts.total }),
        layout: counts.layout,
        preferences: counts.preferences,
        filled: tr.t('library.personalFilled', { count: counts.filled }),
        empty: tr.t('library.personalEmpty', { count: counts.empty })
      })
    ))

    const list = el('ul', 'library__personal')
    for (const datum of data) {
      const item = el('li', datum.home === 'layout'
        ? 'library__datum library__datum--travels'
        : 'library__datum')
      if (!datum.filled) item.classList.add('library__datum--empty')
      item.append(
        el('span', 'library__datumWhere', personal.home(datum.home)),
        el('code', 'library__datumKey', datum.key),
        el('span', 'library__datumValue', personal.value(datum)),
        // La nature et la base, côte à côte : ce que c'est, et si on l'a lu dans
        // l'application ou jugé nous-mêmes. La seconde est la valeur du relevé.
        el('span', 'library__datumKind', personal.kind(datum.kind)),
        el('span', 'library__datumBasis', isReadFromApk(datum.basis)
          ? tr.t('library.basisReadInApp')
          : tr.t('library.basisJudgedHere'))
      )
      item.title = personal.reason(datum)
      list.append(item)
    }
    section.append(list)

    if (entry.identity.assumed.personalDataTravelsWithPages) {
      section.append(el('p', 'library__caveat', tr.t('library.travelsCaveat')))
    }
    return section
  }

  const previewSection = (entry: LibraryEntry): HTMLElement => {
    const section = el('section', 'library__section')
    section.append(el('h3', 'library__heading', tr.t('library.previewHeading')))
    section.append(previewSlot(entry))
    section.append(el('p', 'library__note', tr.t('library.previewNote')))
    return section
  }

  const openIdentity = (entry: LibraryEntry): void => {
    const card = identityCard(tr, entry.identity, language)
    const body = el('div', 'library__card')

    body.append(el('p', 'library__lead', tr.t('library.identityLead')))

    const readSection = el('section', 'library__section')
    // Les deux titres viennent du vocabulaire partagé : la boîte de partage et la page des
    // réglages disent la même distinction avec les mêmes mots.
    readSection.append(el('h3', 'library__heading library__heading--read',
      tr.t('provenance.declaredByFile')))
    readSection.append(el('p', 'library__note', tr.t('library.readNote')))
    readSection.append(factList(card.read))

    const assumedSection = el('section', 'library__section')
    assumedSection.append(el('h3', 'library__heading library__heading--assumed',
      tr.t('provenance.assumedByEditor')))
    assumedSection.append(el('p', 'library__note', tr.t('library.assumedNote')))
    assumedSection.append(factList(card.assumed))

    const identitySection = el('section', 'library__section')
    identitySection.append(el('h3', 'library__heading', tr.t('library.entryItself')))
    const own = el('dl', 'library__facts')
    own.append(el('dt', 'library__factLabel', tr.t('library.fieldName')),
      el('dd', 'library__factValue', entry.name))
    own.append(el('dt', 'library__factLabel', tr.t('library.factOriginalFile')),
      el('dd', 'library__factValue',
        entry.fileName === '' ? tr.t('library.unknownOriginalFile') : entry.fileName))
    own.append(el('dt', 'library__factLabel', tr.t('library.factStoredOn')),
      el('dd', 'library__factValue', formatStamp(tr, entry.addedAt)))
    own.append(el('dt', 'library__factLabel', tr.t('library.factLastWrite')),
      el('dd', 'library__factValue',
        `${formatStamp(tr, entry.updatedAt)} — ${timesStored(tr, entry.revision)}`))
    const digest = el('dd', 'library__factValue')
    digest.append(el('code', 'library__digest', entry.sha256))
    own.append(el('dt', 'library__factLabel', tr.t('library.factDigest')), digest)
    identitySection.append(own)
    if (entry.note !== '') {
      identitySection.append(el('p', 'library__note',
        tr.t('library.yourNote', { note: entry.note })))
    }

    body.append(identitySection, readSection, assumedSection,
      personalSection(entry), previewSection(entry))

    views.open({
      title: tr.t('library.identityTitle', { name: entry.name }),
      body,
      cancelLabel: tr.t('library.returnToList'),
      choices: []
    })
  }

  /* ------------------------------------------------------------------------ les gestes */

  const doStore = async (source: CurrentDocument, name: string, note: string): Promise<void> => {
    const bytes = await source.bytes()
    const entry = await library.add({
      name: name.trim() === '' ? stemOf(source.fileName) : name.trim(),
      bytes,
      fileName: source.fileName,
      note
    })
    say(tr.t('library.stored', {
      name: entry.name,
      size: tr.format.byteSize(entry.byteLength),
      // Une empreinte tronquée est un identifiant : elle passe en `string`, jamais en
      // `number`, et ne se met donc pas en forme.
      digest: entry.sha256.slice(0, 12)
    }))
  }

  const askStore = (source: CurrentDocument, then?: () => void | Promise<void>): void => {
    openFormView(views, {
      title: tr.t('library.storeCurrent'),
      lead: tr.t('library.storeLead'),
      fields: [
        {
          key: 'name',
          label: tr.t('library.fieldName'),
          value: source.suggestedName ?? stemOf(source.fileName)
        },
        {
          key: 'note', label: tr.t('library.fieldNoteOptional'), value: '', multiline: true,
          hint: tr.t('library.noteHint')
        }
      ],
      confirmLabel: tr.t('library.store'),
      onConfirm: (values) => guard(tr.t('library.contextStoring'), async () => {
        await doStore(source, values.name ?? '', values.note ?? '')
        await then?.()
      })
    })
  }

  /**
   * Charger une entrée — le geste du « revenir en arrière », et le seul qui puisse coûter
   * quelque chose.
   *
   * Si le document ouvert porte des modifications non enregistrées, on **s'arrête et on
   * demande**, avec « ranger d'abord » comme première issue : c'est celle qui ne perd
   * rien, et la bibliothèque est précisément l'endroit où la ranger. « Charger sans
   * ranger » reste offert, nommé pour ce qu'il fait.
   */
  const doLoad = async (entry: LibraryEntry): Promise<void> => {
    const bytes = await library.bytesOf(entry.id)
    await options.onLoad?.(entry, bytes)
    say(tr.t('library.loaded', {
      name: entry.name,
      size: tr.format.byteSize(bytes.byteLength)
    }))
  }

  const askLoad = (entry: LibraryEntry): void => {
    const source = options.current?.()
    if (source === undefined || !source.modified) {
      void guard(tr.t('library.contextLoading'), () => doLoad(entry))
      return
    }

    const body = el('div', 'library__confirm')
    body.append(el(
      'p', 'library__note',
      tr.t('library.unsavedBody', { file: source.fileName, name: entry.name })
    ))
    body.append(el('p', 'library__caveat', tr.t('library.storeFirstCaveat')))

    views.open({
      title: tr.t('library.unsavedTitle'),
      body,
      choices: [
        {
          label: tr.t('library.storeThenLoad'),
          primary: true,
          run: () => {
            askStore(source, () => guard(tr.t('library.contextLoading'), () => doLoad(entry)))
          }
        },
        {
          label: tr.t('library.loadWithoutStoring'),
          run: () => guard(tr.t('library.contextLoading'), () => doLoad(entry))
        }
      ]
    })
  }

  const doExtract = async (entry: LibraryEntry): Promise<void> => {
    // `bytesOf` recalcule l'empreinte : des octets altérés ne ressortent jamais.
    const bytes = await library.bytesOf(entry.id)
    const extension = entry.identity.read.containerKind === 'xczfg' ? '.xczfg' : '.xcfg'
    const stem = entry.fileName === '' ? stemOf(entry.name) : stemOf(entry.fileName)
    download(bytes, `${stem}-${fileStamp(now())}${extension}`)
    say(tr.t('library.extracted', { name: entry.name, count: bytes.byteLength }))
  }

  /**
   * Montrer l'empreinte, et surtout la montrer **quand elle est fausse**.
   *
   * `bytesOf` refuse de rendre des octets qui ne portent plus leur empreinte — c'est la
   * propriété centrale du socle, et on ne la contourne pas. Mais un pilote à qui l'on dit
   * « altérés » veut voir de quoi on parle : le niveau s'ouvre alors quand même, avec
   * l'empreinte enregistrée, l'aveu qu'aucune n'a pu être recalculée, et la raison exacte.
   * Une vérification qui ne s'affiche que lorsqu'elle réussit ne vérifie rien.
   */
  const doVerify = async (entry: LibraryEntry): Promise<void> => {
    let bytes: Uint8Array | undefined
    let failure: string | undefined
    try {
      bytes = await library.bytesOf(entry.id)
    } catch (error) {
      if (!(error instanceof LibraryError)) throw error
      failure = libraryErrorText(error, tr)
    }
    const digest = bytes === undefined ? undefined : await sha256Hex(bytes)
    const same = digest === entry.sha256 && bytes?.byteLength === entry.byteLength

    const body = el('div', 'library__verify')
    body.append(el('p', 'library__note', tr.t('library.verifyNote')))
    const facts = el('dl', 'library__facts')
    facts.append(el('dt', 'library__factLabel', tr.t('library.digestStored')))
    const stored = el('dd', 'library__factValue')
    stored.append(el('code', 'library__digest', entry.sha256))
    facts.append(stored)
    facts.append(el('dt', 'library__factLabel', tr.t('library.digestFresh')))
    const fresh = el('dd', 'library__factValue')
    if (digest === undefined) {
      fresh.append(el('span', 'library__factText', tr.t('library.digestMissing')))
    } else fresh.append(el('code', 'library__digest', digest))
    facts.append(fresh)
    facts.append(el('dt', 'library__factLabel', tr.t('library.factSize')))
    facts.append(el('dd', 'library__factValue', bytes === undefined
      ? tr.t('library.sizeUnreadable', { expected: entry.byteLength })
      : tr.t('library.sizeCompared', {
        count: bytes.byteLength,
        expected: entry.byteLength
      })))
    body.append(facts)
    body.append(el(
      'p', same
        ? 'library__verdict library__verdict--same'
        : 'library__verdict library__verdict--differs',
      same ? tr.t('library.digestSame') : tr.t('library.digestDiffers')
    ))
    if (failure !== undefined) body.append(el('p', 'library__caveat', failure))
    views.open({
      title: tr.t('library.digestTitle', { name: entry.name }),
      body,
      cancelLabel: tr.t('library.returnToList'),
      choices: []
    })
  }

  const askRemove = (entry: LibraryEntry): void => {
    const body = el('div', 'library__confirm')
    body.append(el('p', 'library__note', tr.t('library.removeBody', {
      name: entry.name,
      size: tr.format.byteSize(entry.byteLength)
    })))
    body.append(el('p', 'library__caveat', tr.t('library.removeCaveat')))
    views.open({
      title: tr.t('library.removeTitle', { name: entry.name }),
      body,
      tone: 'grave',
      choices: [{
        label: tr.t('library.remove'),
        primary: true,
        run: () => guard(tr.t('library.contextRemoving'), async () => {
          await library.remove(entry.id)
          say(tr.t('library.removed', { name: entry.name }))
        })
      }]
    })
  }

  /**
   * Ce qu'on dit d'une entrée qu'on ne sait plus relire : la conséquence d'abord,
   * l'identifiant interne et la cause ensuite. Le pilote décide sur la première phrase ;
   * la seconde est ce qu'il recopiera s'il signale le problème.
   */
  const brokenBody = (broken: BrokenEntry): HTMLElement => {
    const body = el('div')
    body.append(el('p', 'library__note', tr.t('library.brokenBody')))
    body.append(el('p', 'library__note library__note--technical',
      tr.t('library.brokenTechnical', {
        id: broken.id, reason: libraryProseText(broken.reason, tr)
      })))
    return body
  }

  const askRemoveBroken = (broken: BrokenEntry): void => {
    views.open({
      title: tr.t('library.removeBrokenTitle'),
      tone: 'grave',
      body: brokenBody(broken),
      choices: [{
        label: tr.t('library.remove'),
        primary: true,
        run: () => guard(tr.t('library.contextRemoving'), async () => {
          await library.remove(broken.id)
          say(tr.t('library.brokenRemoved'))
        })
      }]
    })
  }

  /**
   * Rend **`true` seulement si l'archive a été livrée**. Ce n'est pas une coquetterie de
   * signature : « Exporter d'abord, puis tout effacer » enchaîne les deux gestes, et
   * `guard` avale l'échec pour l'afficher. Sans ce verdict, un export refusé — quota,
   * octets altérés, magasin illisible — serait suivi de l'effacement quand même, et le
   * pilote perdrait tout en croyant avoir sauvegardé. Les trois autres appelants
   * l'ignorent, et c'est très bien.
   */
  const doExport = async (): Promise<boolean> => {
    let delivered = false
    await guard(tr.t('library.contextExporting'), async () => {
      const when = now()
      const { archive, exported, skipped } = await exportLibrary(library, when)
      download(archive, `xctrack-bibliotheque-${fileStamp(when)}.zip`)
      delivered = true
      // La phrase de fin est une phrase entière, ou rien : elle ne s'ajoute pas au message
      // par une concaténation, elle y entre par son repère.
      const tail = skipped.length === 0
        ? ''
        : tr.t('library.exportSkipped', { count: skipped.length })
      say(tr.t('library.exported', { count: exported, tail }))
    })
    return delivered
  }

  const doClearAll = async (afterExport: boolean): Promise<void> => {
    /*
     * Relu à l'instant de l'effacement, non au moment où la boîte s'est ouverte : un autre
     * onglet a pu ranger ou supprimer entre les deux, et le compte annoncé APRÈS coup doit
     * être celui de ce qui est réellement parti. Ce que le pilote a lu AVANT reste, lui,
     * l'état qu'il avait sous les yeux quand il a décidé — les deux sont justes, chacun à
     * son moment.
     */
    const snapshot = await library.read()
    const total = snapshot.entries.reduce((sum, entry) => sum + entry.byteLength, 0)
    await library.clear()
    const count = snapshot.entries.length
    const size = count === 0
      ? ''
      : tr.t('library.clearedBytes', { size: tr.format.byteSize(total) })
    say(afterExport
      ? tr.t('library.clearedAfterExport', { count, size })
      : tr.t('library.cleared', { count, size }))
  }

  /**
   * Effacer toute la bibliothèque — le geste qu'un pilote fait avant de rendre un
   * ordinateur prêté, ou de changer de machine.
   *
   * ## Ce que « tout » recouvre, et pourquoi il s'arrête là
   *
   * **Ce bouton efface la bibliothèque, et elle seule** : les fiches et les octets, dans
   * IndexedDB. Il ne touche pas aux trois réglages que cet éditeur garde dans
   * `localStorage` — `xcfg-editor.ui-language`, `xcfg-editor.dock-height`,
   * `xcfg-editor.devices`. (Il n'y a pas de quatrième clé : `xcfg-editor.library` est le
   * nom du canal `BroadcastChannel` entre onglets et l'identifiant du format d'archive,
   * pas un enregistrement — rien n'en survit à la fermeture de l'onglet.)
   *
   * Trois raisons, dans cet ordre :
   *
   * 1. **Une commande destructrice ne doit pas dépasser la portée de l'issue qu'elle
   *    offre.** L'issue est ici l'archive, et `exportLibrary` sauvegarde exactement la
   *    bibliothèque. Emporter aussi les appareils ajoutés par le pilote détruirait des
   *    données que la sortie proposée juste au-dessus ne sait pas rendre : le geste aurait
   *    l'air réversible et ne le serait qu'à moitié.
   * 2. **Les trois clés restantes ne sont pas des données de vol.** Un choix de langue,
   *    une hauteur en pixels, et des mesures d'écran avec le nom que le pilote leur a
   *    donné. Aucune ne porte de configuration, de page, de waypoint ni de nom de
   *    compétition — c'est ce que la bibliothèque, elle, porte entièrement.
   * 3. **L'étendue doit être lisible dans l'intitulé.** « Tout effacer » seul aurait laissé
   *    deviner ; « Effacer toute la bibliothèque » se lit sans ouvrir la boîte, et la boîte
   *    nomme ensuite ce qui reste **et** le geste qui l'emporte — vider les données du site
   *    depuis le navigateur. C'est la seule voie honnête vers « toute trace de moi » : elle
   *    existe, elle est hors de cette application, et on la dit plutôt que de la mimer.
   *
   * ## Ce que la boîte doit contenir
   *
   * Des chiffres, pas un « êtes-vous sûr » : combien de configurations, quelle place,
   * combien d'entrées illisibles. Puis le fait que **les octets partent avec** — rien n'a
   * jamais été envoyé ailleurs, il n'existe donc aucune copie à récupérer. Puis l'étendue.
   * Et l'export en **premier choix**, avant la porte.
   *
   * Le niveau est `grave` : `createViewStack` y met alors le focus sur le RETOUR, jamais
   * sur l'action. Le geste le plus destructeur de l'application ne doit pas être celui qui
   * demande le moins d'intention — et ici même le premier bouton est celui qui sauvegarde
   * avant d'effacer.
   */
  const askClearAll = (snapshot: LibrarySnapshot): void => {
    const total = snapshot.entries.reduce((sum, entry) => sum + entry.byteLength, 0)

    const body = el('div', 'library__confirm')
    /*
     * Deux queues de phrase, ou rien — même mécanique qu'au pied : une bibliothèque qui ne
     * porte que des entrées illisibles ne dit pas « 0 o d'octets partent avec ».
     */
    body.append(el('p', 'library__note', tr.t('library.clearAllBody', {
      count: snapshot.entries.length,
      size: snapshot.entries.length === 0
        ? ''
        : tr.t('library.clearAllBytes', { size: tr.format.byteSize(total) }),
      broken: snapshot.broken.length === 0
        ? ''
        : tr.t('library.clearAllBroken', { count: snapshot.broken.length })
    })))
    body.append(el('p', 'library__caveat', tr.t('library.clearAllCaveat')))
    body.append(el('p', 'library__caveat', tr.t('library.clearAllScope')))

    views.open({
      title: tr.t('library.clearAllTitle'),
      body,
      tone: 'grave',
      choices: [
        {
          label: tr.t('library.exportThenClear'),
          primary: true,
          run: async () => {
            // L'export d'abord, et l'effacement SEULEMENT s'il a abouti : un échec est déjà
            // dit par `guard`, et rien ne doit partir derrière lui.
            if (!await doExport()) return
            await guard(tr.t('library.contextClearing'), () => doClearAll(true))
          }
        },
        {
          label: tr.t('library.clearWithoutExport'),
          run: () => guard(tr.t('library.contextClearing'), () => doClearAll(false))
        }
      ]
    })
  }

  const showImportReport = (report: ImportReport): void => {
    const counts = new Map<string, number>()
    for (const result of report.results) {
      counts.set(result.outcome, (counts.get(result.outcome) ?? 0) + 1)
    }
    const body = el('div', 'library__confirm')
    body.append(el(
      'p', 'library__note',
      tr.t('library.importLead', { when: formatStamp(tr, report.exportedAt ?? '') })
    ))
    const list = el('ul', 'library__results')
    const labels: Record<string, string> = {
      // « replacée », et non « rétablie » : le troisième sens du mot (`i18n`,
      // `library.entryRestored`). Les deux autres vivent ailleurs dans l'application.
      imported: tr.t('library.outcomeImported'),
      'already-present': tr.t('library.outcomeAlreadyPresent'),
      duplicated: tr.t('library.outcomeDuplicated'),
      rejected: tr.t('library.outcomeRejected')
    }
    for (const result of report.results) {
      const item = el('li', result.outcome === 'rejected'
        ? 'library__result library__result--rejected'
        : 'library__result')
      item.append(el('span', 'library__resultName', result.name === '' ? result.sourceId : result.name))
      item.append(el('span', 'library__resultOutcome', labels[result.outcome] ?? result.outcome))
      if (result.reason !== undefined) {
        item.append(el('span', 'library__resultReason', libraryProseText(result.reason, tr)))
      }
      list.append(item)
    }
    body.append(list)
    views.open({
      title: tr.t('library.importTitle'),
      body,
      cancelLabel: tr.t('library.returnToList'),
      choices: []
    })
    const rejected = counts.get('rejected') ?? 0
    // Deux nombres, deux accords : le compte des refusées arrive déjà accordé dans son
    // repère, et la phrase reste entière.
    say(rejected === 0
      ? tr.t('library.imported', { count: report.results.length })
      : tr.t('library.importedWithRejected', {
        count: report.results.length,
        rejected: tr.t('library.rejectedCount', { count: rejected })
      }))
  }

  /* ------------------------------------------------------------------------ le dessin */

  function previewSlot(entry: LibraryEntry): HTMLElement {
    const slot = el('div', 'library__preview')
    slot.setAttribute('aria-hidden', 'true')
    // Rien quand il n'y a rien : « Aperçu à venir » était une promesse affichée en
    // permanence, et une promesse non tenue vaut moins qu'un cadre vide.
    if (entry.preview !== undefined) {
      slot.append(el('span', 'library__previewText', tr.t('library.previewStored')))
    }
    return slot
  }

  const entryItem = (entry: LibraryEntry): HTMLElement => {
    const item = el('li', 'library__entry')

    item.append(previewSlot(entry))

    const main = el('div', 'library__entryMain')
    main.append(el('h3', 'library__entryName', entry.name))

    const meta = el('p', 'library__meta')
    meta.append(
      el('span', 'chip', exportTypeChip(tr, entry.identity.read.exportType)),
      el('span', 'chip chip--quiet', tr.format.byteSize(entry.byteLength)),
      el('span', 'chip chip--quiet',
        tr.t('common.widgetCount', { count: entry.identity.read.widgetCount }))
    )
    if (entry.identity.read.containerKind === 'xczfg') {
      meta.append(el('span', 'chip chip--quiet', tr.t('library.chipArchive')))
    }
    const counted = personalDataCount(entry.identity)
    if (counted.total > 0) {
      // Les deux chiffres sont **toujours** dits, y compris le zéro : « 16 données
      // personnelles » seul laisserait croire que les 16 voyagent. Ce qui décide de ce
      // qu'on peut envoyer, c'est le second.
      //
      // Le point médian sépare deux pastilles de données alignées, pas deux morceaux d'une
      // même phrase : chacune est une phrase entière, accordée par le socle.
      const flag = el('span', 'flag', [
        tr.t('library.personalCount', { count: counted.total }),
        tr.t('library.personalTravellingCount', { count: counted.inLayout })
      ].join(' · '))
      meta.append(flag)
    }
    main.append(meta)

    main.append(el('p', 'library__stamp', tr.t('library.entryStamp', {
      when: formatStamp(tr, entry.addedAt),
      file: entry.fileName === '' ? tr.t('library.unknownFileName') : entry.fileName
    })))
    if (entry.note !== '') main.append(el('p', 'library__entryNote', entry.note))

    const row = el('div', 'library__entryActions')
    if (options.onLoad !== undefined) {
      const load = button(tr.t('library.load'), 'btn btn--primary')
      load.addEventListener('click', () => { askLoad(entry) })
      row.append(load)
    }
    const extract = button(tr.t('library.extract'))
    extract.addEventListener('click', () => {
      void guard(tr.t('library.contextExtracting'), () => doExtract(entry))
    })
    const card = button(tr.t('library.identity'))
    card.addEventListener('click', () => { openIdentity(entry) })
    const verify = button(tr.t('library.verify'), 'btn btn--ghost')
    verify.addEventListener('click', () => {
      void guard(tr.t('library.contextVerifying'), () => doVerify(entry))
    })
    const rename = button(tr.t('library.rename'), 'btn btn--ghost')
    rename.addEventListener('click', () => {
      openFormView(views, {
        title: tr.t('library.renameTitle', { name: entry.name }),
        lead: tr.t('library.renameLead'),
        fields: [
          { key: 'name', label: tr.t('library.fieldName'), value: entry.name },
          { key: 'note', label: tr.t('library.fieldNote'), value: entry.note, multiline: true }
        ],
        confirmLabel: tr.t('library.save'),
        onConfirm: (values) => guard(tr.t('library.contextRenaming'), async () => {
          // Deux écritures, deux révisions : la seconde attend la première, sinon elle
          // partirait avec une révision périmée et se verrait refuser — par notre propre
          // contrôle de concurrence.
          let latest = entry
          const name = (values.name ?? '').trim()
          if (name !== '' && name !== entry.name) {
            latest = await library.rename(entry.id, name, latest.revision)
          }
          const note = values.note ?? ''
          if (note !== entry.note) {
            latest = await library.annotate(entry.id, note, latest.revision)
          }
          say(tr.t('library.renamed', {
            name: latest.name,
            times: timesStored(tr, latest.revision)
          }))
        })
      })
    })
    const remove = button(tr.t('library.remove'), 'btn btn--ghost')
    remove.addEventListener('click', () => { askRemove(entry) })
    row.append(extract, card, verify, rename, remove)
    main.append(row)

    item.append(main)
    return item
  }

  const brokenItem = (broken: BrokenEntry): HTMLElement => {
    const item = el('li', 'library__entry library__entry--broken')
    const main = el('div', 'library__entryMain')
    main.append(el('h3', 'library__entryName', tr.t('library.brokenName')))
    main.append(el('p', 'library__meta'))
    // Un identifiant interne et la raison technique, alignés comme des données : rien à
    // traduire ici, tout est déjà dit par la phrase du dessous.
    main.append(el('p', 'library__stamp', `${broken.id} — ${libraryProseText(broken.reason, tr)}`))
    main.append(el('p', 'library__note', tr.t('library.brokenNote')))
    const row = el('div', 'library__entryActions')
    const remove = button(tr.t('library.remove'), 'btn')
    remove.addEventListener('click', () => { askRemoveBroken(broken) })
    row.append(remove)
    main.append(row)
    item.append(main)
    return item
  }

  const drawStorage = (snapshot: LibrarySnapshot): void => {
    storageNote.textContent = ''
    if (snapshot.durable) {
      storageNote.hidden = true
      return
    }
    storageNote.hidden = false
    storageNote.append(el('strong', 'library__bannerTitle', tr.t('library.notDurableTitle')))
    storageNote.append(el('span', 'library__bannerText', tr.t('library.notDurableText')))
    const action = button(tr.t('library.exportNow'))
    action.addEventListener('click', () => { void doExport() })
    storageNote.append(action)
  }

  const drawFoot = async (snapshot: LibrarySnapshot): Promise<void> => {
    const total = snapshot.entries.reduce((sum, entry) => sum + entry.byteLength, 0)
    foot.textContent = ''
    /*
     * Deux queues de phrase, ou rien : une bibliothèque vide ne dit pas « 0 o au total »,
     * et une bibliothèque saine ne parle pas d'entrées illisibles. Chacune entre par son
     * repère, déjà accordée — pas par une concaténation.
     */
    foot.append(el('span', 'library__footText', tr.t('library.footCount', {
      count: snapshot.entries.length,
      size: snapshot.entries.length === 0
        ? ''
        : tr.t('library.footTotalSize', { size: tr.format.byteSize(total) }),
      broken: snapshot.broken.length === 0
        ? ''
        : tr.t('library.footBroken', { count: snapshot.broken.length })
    })))

    if (options.requestPersistence !== undefined && snapshot.durable) {
      const ask = button(tr.t('library.preventErase'), 'btn btn--ghost')
      ask.addEventListener('click', () => {
        void (async () => {
          const verdict = await options.requestPersistence?.()
          say(verdict === 'granted'
            ? tr.t('library.persistenceGranted')
            : verdict === 'denied'
              ? tr.t('library.persistenceDenied')
              : tr.t('library.persistenceUnsupported'))
        })()
      })
      foot.append(ask)
    }

    if (options.estimateStorage !== undefined) {
      const estimate = await options.estimateStorage()
      foot.append(el('span', 'library__footText', estimate === undefined
        ? tr.t('library.storageUnknown')
        : tr.t('library.storageEstimate', {
          usage: tr.format.byteSize(estimate.usage),
          quota: tr.format.byteSize(estimate.quota)
        })))
    }

    /*
     * L'effacement complet vit au PIED, en bout de ligne, et non dans la tête avec les
     * quatre gestes courants : il n'a rien à faire à côté de « Ranger la configuration
     * ouverte », que le pilote clique sans réfléchir. Et il n'existe **que s'il y a
     * quelque chose à effacer** — une bibliothèque vide n'a pas besoin qu'on lui propose
     * de se vider.
     */
    if (snapshot.entries.length > 0 || snapshot.broken.length > 0) {
      const wipe = button(tr.t('library.clearAll'), 'btn btn--ghost library__clearAll')
      wipe.addEventListener('click', () => {
        clearFlash()
        askClearAll(snapshot)
      })
      foot.append(wipe)
    }
  }

  const draw = (snapshot: LibrarySnapshot): void => {
    listWrap.textContent = ''
    drawStorage(snapshot)

    if (snapshot.entries.length === 0 && snapshot.broken.length === 0) {
      listWrap.append(el('p', 'library__empty', tr.t('library.empty')))
      return
    }

    if (snapshot.entries.length > 0) {
      const list = el('ul', 'library__list')
      for (const entry of snapshot.entries) list.append(entryItem(entry))
      listWrap.append(list)
    }

    if (snapshot.broken.length > 0) {
      const section = el('section', 'library__section library__section--broken')
      section.append(el('h3', 'library__heading',
        tr.t('library.brokenHeading', { count: snapshot.broken.length })))
      const list = el('ul', 'library__list')
      for (const broken of snapshot.broken) list.append(brokenItem(broken))
      section.append(list)
      listWrap.append(section)
    }
  }

  /* ----------------------------------------------------------------------- le va-et-vient */

  let drawing = false
  const refresh = async (): Promise<void> => {
    if (drawing) return
    drawing = true
    try {
      const snapshot = await library.read()
      draw(snapshot)
      await drawFoot(snapshot)
    } catch (error) {
      showFailure(tr.t('library.contextReading'), error)
    } finally {
      drawing = false
    }
  }

  /*
   * Un changement venu d'un autre onglet redessine la liste : c'est ce que
   * `library.subscribe` diffuse par `BroadcastChannel`. Les écritures locales passent par
   * le même chemin — l'appelant n'a donc rien à rafraîchir lui-même, et n'oubliera pas de
   * le faire une fois.
   */
  const unsubscribe = library.subscribe(() => { void refresh() })

  storeCurrent.addEventListener('click', () => {
    clearFlash()
    const source = options.current?.()
    if (source === undefined) {
      say(tr.t('library.noOpenFile'), 'trouble')
      return
    }
    askStore(source)
  })

  addFile.addEventListener('click', () => { filePicker.click() })
  filePicker.addEventListener('change', () => {
    const file = filePicker.files?.[0]
    if (file === undefined) return
    void guard(tr.t('library.contextStoring'), async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      askStore({ fileName: file.name, modified: false, bytes: async () => bytes })
    })
    filePicker.value = ''
  })

  exportAll.addEventListener('click', () => { void doExport() })

  importAll.addEventListener('click', () => { archivePicker.click() })
  archivePicker.addEventListener('change', () => {
    const file = archivePicker.files?.[0]
    if (file === undefined) return
    void guard(tr.t('library.contextImporting'), async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      showImportReport(await importLibrary(library, bytes, {
        duplicateSuffix: tr.t('libraryError.importedSuffix')
      }))
    })
    archivePicker.value = ''
  })

  /*
   * `Échap` hors modale. Dans une `<dialog>`, la touche lève `cancel` sur la boîte et
   * c'est `openLibraryDialog` qui décide — l'écouter ici aussi reculerait de deux niveaux
   * d'un seul coup. Le test `root.closest('dialog')` départage les deux cas sans que
   * l'appelant ait à dire lequel il est.
   */
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (root.closest('dialog') !== null) return
    if (!views.back()) return
    event.preventDefault()
  })

  void refresh()

  return {
    element: root,
    refresh,
    back: () => views.back(),
    viewTitle: () => views.title(),
    close: () => {
      unsubscribe()
      views.reset()
    }
  }
}

/* ============================================================== la même chose, en modale */

export interface LibraryDialogHandle {
  element: HTMLDialogElement
  panel: LibraryPanelHandle
  open: () => void
  close: () => void
}

/**
 * Le panneau dans une boîte de dialogue, pour l'assembleur qui n'a pas de place pour lui
 * dans la page. Même meuble que les autres modales du cadre : tête collante, bouton
 * « Fermer » toujours atteignable quand la liste défile.
 */
export function openLibraryDialog(
  options: LibraryPanelOptions & { onClose?: () => void }
): LibraryDialogHandle {
  const panel = renderLibraryPanel(options)

  const dialog = el('dialog', 'modal modal--library modal--libraryPanel')
  dialog.setAttribute('aria-label', options.tr.t('library.panelLabel'))
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', options.tr.t('library.panelLabel')))
  const dismiss = button(options.tr.t('library.close'), 'btn btn--ghost')
  head.append(dismiss)
  box.append(head, panel.element)
  dialog.append(box)

  const handle: LibraryDialogHandle = {
    element: dialog,
    panel,
    open: () => {
      if (!dialog.isConnected) document.body.append(dialog)
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      dismiss.focus()
    },
    close: () => {
      if (dialog.open) dialog.close()
      dialog.remove()
      panel.close()
    }
  }

  const giveUp = (): void => {
    handle.close()
    options.onClose?.()
  }
  dismiss.addEventListener('click', giveUp)
  /*
   * `Échap` fait ce qu'on attend, et une seule chose à la fois : depuis un niveau — la
   * saisie d'un nom, une carte d'identité, une confirmation — il **recule** vers la liste ;
   * depuis la liste, il ferme la bibliothèque. C'est la contrepartie explicite de ce que
   * l'empilement de `<dialog>` donnait tout seul, en fermant chaque fois la couche du
   * dessus — sauf qu'ici il n'y a plus de couche du dessus à confondre avec celle du
   * dessous.
   */
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    if (handle.panel.back()) return
    giveUp()
  })

  return handle
}
