import './libraryPanel.css'
import { readableName } from '../catalog/widgetNames'
import { formatTechnicalDetail } from '../core/technicalDetail'
import { sha256Hex } from '../library/digest'
import { LibraryError } from '../library/errors'
import { personalInventoryOf, type EntryIdentity, type PersonalDatum } from '../library/identity'
import type { BrokenEntry, Library, LibraryEntry, LibrarySnapshot } from '../library/library'
import { exportLibrary, importLibrary, type ImportReport } from '../library/transfer'
import {
  isReadFromApk,
  personalHomeLabel,
  personalValueText,
  PERSONAL_CAVEAT,
  PERSONAL_KIND_LABELS
} from '../model/personalData'

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
 *   pages**, un export « pages » n'est donc pas sûr par construction.
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

/* ==================================================================== mise en français */

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
] as const

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * Une taille lisible, virgule française. « 78,6 ko » dit au pilote s'il range une
 * configuration ou une archive avec des photos ; un nombre d'octets ne le dit pas.
 *
 * Duplique volontairement `formatByteSize` de `ui/sharingDialog.ts` : quatre lignes,
 * contre une dépendance croisée entre deux modules d'interface qui se chargent chacun à
 * la demande et n'ont rien d'autre à partager.
 */
export function formatByteSize(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} o`
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1).replace('.', ',')} ko`
  if (byteLength < 1024 * 1024 * 1024) {
    return `${(byteLength / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
  }
  // Le palier des gigaoctets ne sert pas aux configurations — 79 ko la plus grosse du
  // corpus — mais au quota que le navigateur annonce : Chrome en accorde une dizaine de
  // gigaoctets, et « 10240,0 Mo » se lit mal (constaté sur la page d'essai).
  return `${(byteLength / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')} Go`
}

/**
 * Une date ISO en français, à la minute. Une date absente ou illisible — un enregistrement
 * ancien, dont `addedAt` est vide — se dit, elle ne se devine pas.
 */
export function formatStamp(iso: string): string {
  if (iso === '') return 'date inconnue'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'date inconnue'
  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? '?'} ${date.getFullYear()}` +
    ` à ${pad(date.getHours())} h ${pad(date.getMinutes())}`
}

/** Horodatage compact pour un nom de fichier : `2026-08-21-1532`. */
function fileStamp(when: Date): string {
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-` +
    `${pad(when.getHours())}${pad(when.getMinutes())}`
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/**
 * Le format d'export, dit en toutes lettres. `undefined` n'est pas « inconnu » par
 * paresse : les fichiers de 2022 n'ont pas d'`exportType` du tout, et c'est un
 * renseignement.
 */
export function exportTypeLabel(exportType: string | undefined): string {
  if (exportType === 'backup') return 'Sauvegarde complète (pages et préférences)'
  if (exportType === 'pages') return 'Pages seules (aucune préférence)'
  if (exportType === undefined) return 'Non déclaré par le fichier'
  return exportType
}

/** Le même, en deux mots, pour la pastille de la liste. */
export function exportTypeChip(exportType: string | undefined): string {
  if (exportType === 'backup') return 'Sauvegarde'
  if (exportType === 'pages') return 'Pages seules'
  if (exportType === undefined) return 'Type non déclaré'
  return exportType
}

const VERSION_GAP_LABELS: Record<string, string> = {
  older: 'Antérieure à la version de référence de cet éditeur',
  same: 'La version de référence de cet éditeur',
  newer: 'Postérieure à la version de référence de cet éditeur',
  unknown: 'Impossible à situer'
}

/**
 * L'emplacement d'une donnée personnelle, dans les mots du pilote.
 *
 * Les mots viennent de `model/personalData.ts`, comme les natures et les bases : c'est
 * ce qui fait que la bibliothèque, la page des réglages, la boîte de partage et
 * l'avertissement d'export disent la même chose avec les mêmes termes.
 */
export function personalDatumWhere(datum: PersonalDatum): string {
  return personalHomeLabel(datum.home)
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

export function identityCard(identity: EntryIdentity, language = 'fr'): IdentityCard {
  const { read, assumed } = identity

  const pages = read.orientations.length === 0
    ? 'aucune page'
    : [
      read.pageCount.landscape > 0 ? plural(read.pageCount.landscape, 'page paysage', 'pages paysage') : '',
      read.pageCount.portrait > 0 ? plural(read.pageCount.portrait, 'page portrait', 'pages portrait') : ''
    ].filter((part) => part !== '').join(' · ')

  const topTypes = read.widgetTypes.slice(0, 5)
    .map((type) => `${readableName(type.shortName, language)} × ${type.count}`)
    .join(', ')

  const readFacts: IdentityFact[] = [
    { label: 'Format d’export', value: exportTypeLabel(read.exportType), note: 'Clé info.exportType.' },
    {
      label: 'Conteneur',
      value: read.containerKind === 'xczfg'
        ? `Archive .xczfg — ${plural(read.extraFileNames.length, 'fichier annexe', 'fichiers annexes')}`
        : 'Fichier .xcfg',
      note: read.extraFileNames.length === 0
        ? undefined
        : `Annexes : ${read.extraFileNames.join(', ')}. Cet éditeur n’en inspecte pas le contenu.`
    },
    { label: 'Taille', value: formatByteSize(read.byteLength) },
    {
      label: 'Version de XCTrack déclarée',
      value: read.versionName === undefined && read.versionCode === undefined
        ? 'Le fichier ne la dit pas'
        : `${read.versionName ?? '(nom absent)'} — code ${read.versionCode ?? '(absent)'}`,
      note: 'Clés info.versionName et info.versionCode.'
    },
    {
      label: 'Appareil déclaré',
      value: read.deviceString ?? 'Le fichier ne le dit pas',
      note: 'Chaîne brute de info.device. Elle ne porte aucune résolution.'
    },
    { label: 'Pages', value: pages },
    {
      label: 'Gadgets',
      value: `${plural(read.widgetCount, 'gadget', 'gadgets')} de ` +
        `${plural(read.widgetTypes.length, 'type', 'types')}`,
      note: topTypes === '' ? undefined : `Les plus employés : ${topTypes}.`
    },
    {
      label: 'Sections de premier niveau',
      value: read.rootKeys.length === 0 ? 'aucune' : read.rootKeys.join(', ')
    },
    {
      label: 'Clés de préférences',
      value: read.preferenceKeyCount === 0
        ? 'aucune — ce fichier ne transporte pas vos préférences'
        : plural(read.preferenceKeyCount, 'clé', 'clés'),
      note: read.preferenceKeyCount === 0
        ? undefined
        : 'Cet éditeur ne sait en nommer que quelques familles : le compte est là pour que ' +
          'le reste reste visible.'
    }
  ]

  if (read.duplicateKeys.length > 0) {
    readFacts.push({
      label: 'Clés dupliquées',
      value: plural(read.duplicateKeys.length, 'clé en double', 'clés en double'),
      note: `XCTrack n’en lira qu’une : ${read.duplicateKeys.join(', ')}.`
    })
  }
  if (read.externalResources.length > 0) {
    readFacts.push({
      label: 'Ressources extérieures attendues',
      value: read.externalResources.map((resource) => resource.name).join(', '),
      note: 'Ces fichiers doivent exister sur l’appareil d’arrivée ; ils ne sont pas dans ' +
        'la configuration.'
    })
  }
  if (read.parseError !== undefined) {
    readFacts.push({
      label: 'Analyse',
      value: 'Le contenu n’a pas pu être analysé',
      note: 'Les octets sont rangés et ressortiront tels quels ; c’est leur description ' +
        `qui manque. Détail technique : ${read.parseError}.`
    })
  }

  const assumedFacts: IdentityFact[] = [
    {
      label: 'Gabarit d’écran retenu',
      value: assumed.deviceRecognised
        ? `${assumed.device.label} — ${assumed.device.widthPx} × ${assumed.device.heightPx} px`
        : `${assumed.device.label} — gabarit par défaut, aucun appareil reconnu`,
      note: 'La résolution vient de la table d’appareils de cet éditeur, pas du fichier.'
    },
    {
      label: 'Gadgets « Pro »',
      value: assumed.proKnowledge === 'absent'
        ? 'Inconnu — aucun catalogue de widgets n’a été fourni'
        : assumed.proWidgets.length === 0
          ? 'Aucun'
          : assumed.proWidgets.map((shortName) => readableName(shortName, language)).join(', '),
      note: assumed.proKnowledge === 'absent'
        ? 'On ne devine pas un drapeau de licence : sans catalogue, on ne dit rien.'
        : 'D’après le catalogue extrait de l’APK 1.0.3-beta5, pas d’après le fichier.'
    },
    {
      label: 'Situation de la version',
      value: VERSION_GAP_LABELS[assumed.versionGap] ?? assumed.versionGap,
      note: 'Comparaison au versionCode de référence de cet éditeur.'
    },
    {
      label: 'Données personnelles voyageant avec les pages',
      value: assumed.personalDataTravelsWithPages
        ? 'Oui — la disposition porte au moins un texte écrit par vous'
        : 'Non — aucun texte libre trouvé dans la disposition',
      note: assumed.personalDataTravelsWithPages
        ? 'Un export « pages » n’est donc pas anonyme par construction : le nom et le ' +
          'numéro d’un bouton d’appel sont dans la disposition, pas dans les préférences.'
        : 'La liste des clés de texte libre est fixe et se périmera : elle ne prouve pas ' +
          'une absence.'
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
  root: HTMLElement, main: HTMLElement, announce: (text: string) => void
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
      ? 'Retour à la liste des configurations.'
      : `Retour : ${below.title}.`)
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
      frames.length === 0 ? '← Retour à la liste' : '← Retour', 'btn library__back'
    )
    const heading = el('h3', 'library__viewTitle', spec.title)
    heading.id = titleId
    head.append(backButton, heading)

    const bodyWrap = el('div', 'library__viewBody')
    bodyWrap.append(spec.body)

    const actions = el('div', 'library__viewActions')
    const cancel = button(spec.cancelLabel ?? 'Annuler')
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
  const language = options.language ?? 'fr'
  const now = options.now ?? (() => new Date())
  const download = options.download ?? defaultDownload

  const root = el('section', 'library')
  root.setAttribute('aria-label', 'Bibliothèque de configurations')

  /*
   * Tout ce qui se laisse remplacer par un niveau vit dans `main` : la tête, les bandeaux,
   * la liste, le pied. Quand un niveau s'ouvre, `main` passe en `hidden` — le pilote ne
   * voit plus qu'une chose à la fois, et un lecteur d'écran non plus.
   */
  const main = el('div', 'library__main')
  root.append(main)

  /* --- tête : ce qu'on peut faire --- */

  const head = el('header', 'library__head')
  const title = el('h2', 'library__title', 'Mes configurations')
  const actions = el('div', 'library__actions')
  head.append(title, actions)

  const storeCurrent = button('Ranger la configuration ouverte', 'btn btn--primary')
  const addFile = button('Ranger un fichier…')
  const exportAll = button('Exporter la bibliothèque')
  const importAll = button('Importer une bibliothèque…')
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

  main.append(el(
    'p', 'library__lead',
    'Gardez plusieurs configurations sous un nom, dans ce navigateur, et revenez à ' +
    'l’une d’elles quand vous voulez. Rien n’est envoyé nulle part : tout reste sur cet ' +
    'appareil. Les octets rangés sont ceux de votre fichier, jamais une copie réécrite.'
  ))

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

  const views = createViewStack(root, main, (text) => { announcer.textContent = text })

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
        const action = button('Exporter la bibliothèque maintenant')
        action.addEventListener('click', () => { void doExport() })
        say(error.message, 'trouble', action)
        return
      }
      if (error.failure === 'conflict') {
        const action = button('Recharger la bibliothèque')
        action.addEventListener('click', () => { void refresh() })
        say(
          `${error.message} Rien n’a été écrit : votre modification n’a pas écrasé la sienne.`,
          'trouble', action
        )
        return
      }
      say(error.message, 'trouble')
      return
    }
    // Le contexte est une phrase du pilote (« Suppression », « Rangement ») ; le détail
    // vient après, nommé, et sans le « Error: » du moteur JavaScript.
    say(
      `${context} : l’opération n’a pas abouti. Détail technique : ` +
      `${formatTechnicalDetail(error)}`,
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
    section.append(el('h3', 'library__heading', 'Ce que cette entrée porte de personnel'))

    const { findings: data, counts } = personalInventoryOf(entry.identity)
    if (data.length === 0) {
      section.append(el(
        'p', 'library__note',
        `Aucune donnée personnelle repérée. ${PERSONAL_CAVEAT}`
      ))
      return section
    }

    section.append(el(
      'p', 'library__note',
      `${plural(counts.total, 'donnée personnelle est présente', 'données personnelles sont présentes')} ` +
      `dans cette entrée : ${String(counts.layout)} dans la disposition, qui part avec les ` +
      `pages, et ${String(counts.preferences)} dans les préférences, qui restent chez vous ` +
      `dans un export « pages ». ` +
      `${plural(counts.filled, 'est renseignée', 'sont renseignées')}, ` +
      `${plural(counts.empty, 'est un emplacement vide', 'sont des emplacements vides')}. ` +
      'Elles sont montrées, jamais retirées : c’est vous qui décidez.'
    ))

    const list = el('ul', 'library__personal')
    for (const datum of data) {
      const item = el('li', datum.home === 'layout'
        ? 'library__datum library__datum--travels'
        : 'library__datum')
      if (!datum.filled) item.classList.add('library__datum--empty')
      item.append(
        el('span', 'library__datumWhere', personalDatumWhere(datum)),
        el('code', 'library__datumKey', datum.key),
        el('span', 'library__datumValue', personalValueText(datum)),
        // La nature et la base, côte à côte : ce que c'est, et si on l'a lu dans
        // l'application ou jugé nous-mêmes. La seconde est la valeur du relevé.
        el('span', 'library__datumKind', PERSONAL_KIND_LABELS[datum.kind]),
        el('span', 'library__datumBasis',
          isReadFromApk(datum.basis) ? 'lu dans l’application' : 'jugé par cet éditeur')
      )
      item.title = datum.reason
      list.append(item)
    }
    section.append(list)

    if (entry.identity.assumed.personalDataTravelsWithPages) {
      section.append(el(
        'p', 'library__caveat',
        'Les lignes marquées « part avec les pages » sont dans la disposition : elles ' +
        'voyagent même dans un export « pages ». Dériver un « pages » est un tri de gros ' +
        'grain, ce n’est pas un nettoyage.'
      ))
    }
    return section
  }

  const previewSection = (entry: LibraryEntry): HTMLElement => {
    const section = el('section', 'library__section')
    section.append(el('h3', 'library__heading', 'Aperçu'))
    section.append(previewSlot(entry))
    section.append(el(
      'p', 'library__note',
      'La place est réservée dans la bibliothèque, mais aucune image n’est produite par ' +
      'ce panneau : le dessin d’une page appartient au moteur de rendu. Le jour où il la ' +
      'fournira, ni le rangement ni la forme de l’enregistrement n’auront à changer.'
    ))
    return section
  }

  const openIdentity = (entry: LibraryEntry): void => {
    const card = identityCard(entry.identity, language)
    const body = el('div', 'library__card')

    body.append(el(
      'p', 'library__lead',
      'Deux moitiés, jamais mélangées : ce que le fichier déclare, et ce que cet éditeur ' +
      'en suppose. Tout ce qui est supposé peut être faux sans que le fichier soit en cause.'
    ))

    const readSection = el('section', 'library__section')
    readSection.append(el('h3', 'library__heading library__heading--read',
      'Ce que le fichier déclare'))
    readSection.append(el('p', 'library__note',
      'Lu tel quel dans les octets rangés. Un champ absent est dit absent, jamais remplacé ' +
      'par une valeur par défaut.'))
    readSection.append(factList(card.read))

    const assumedSection = el('section', 'library__section')
    assumedSection.append(el('h3', 'library__heading library__heading--assumed',
      'Ce que cet éditeur suppose'))
    assumedSection.append(el('p', 'library__note',
      'Rien de ceci n’est dans le fichier. L’appareil et sa résolution viennent de notre ' +
      'table, le drapeau « Pro » d’un catalogue extrait de l’APK.'))
    assumedSection.append(factList(card.assumed))

    const identitySection = el('section', 'library__section')
    identitySection.append(el('h3', 'library__heading', 'L’entrée elle-même'))
    const own = el('dl', 'library__facts')
    own.append(el('dt', 'library__factLabel', 'Nom'), el('dd', 'library__factValue', entry.name))
    own.append(el('dt', 'library__factLabel', 'Fichier d’origine'),
      el('dd', 'library__factValue', entry.fileName === '' ? '(inconnu)' : entry.fileName))
    own.append(el('dt', 'library__factLabel', 'Rangée le'),
      el('dd', 'library__factValue', formatStamp(entry.addedAt)))
    own.append(el('dt', 'library__factLabel', 'Dernière écriture'),
      el('dd', 'library__factValue', `${formatStamp(entry.updatedAt)} — révision ${entry.revision}`))
    const digest = el('dd', 'library__factValue')
    digest.append(el('code', 'library__digest', entry.sha256))
    own.append(el('dt', 'library__factLabel', 'Empreinte SHA-256'), digest)
    identitySection.append(own)
    if (entry.note !== '') {
      identitySection.append(el('p', 'library__note', `Votre note : ${entry.note}`))
    }

    body.append(identitySection, readSection, assumedSection,
      personalSection(entry), previewSection(entry))

    views.open({
      title: `Carte d’identité — ${entry.name}`,
      body,
      cancelLabel: 'Retour à la liste',
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
    say(`« ${entry.name} » est rangée — ${formatByteSize(entry.byteLength)}, ` +
      `empreinte ${entry.sha256.slice(0, 12)}…`)
  }

  const askStore = (source: CurrentDocument, then?: () => void | Promise<void>): void => {
    openFormView(views, {
      title: 'Ranger la configuration ouverte',
      lead: 'Donnez-lui un nom que vous reconnaîtrez dans six mois — « Comp Annecy », ' +
        '« Vol-biv Alpes », « École ». Les octets rangés sont ceux de votre fichier, ' +
        'à l’octet près.',
      fields: [
        { key: 'name', label: 'Nom', value: source.suggestedName ?? stemOf(source.fileName) },
        {
          key: 'note', label: 'Note (facultative)', value: '', multiline: true,
          hint: 'Ce que vous voudrez : le site, la voile, le réglage du vario. Jamais interprétée.'
        }
      ],
      confirmLabel: 'Ranger',
      onConfirm: (values) => guard('Rangement', async () => {
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
    say(`« ${entry.name} » est chargée — ${formatByteSize(bytes.byteLength)}, ` +
      'octets vérifiés contre leur empreinte.')
  }

  const askLoad = (entry: LibraryEntry): void => {
    const source = options.current?.()
    if (source === undefined || !source.modified) {
      void guard('Chargement', () => doLoad(entry))
      return
    }

    const body = el('div', 'library__confirm')
    body.append(el(
      'p', 'library__note',
      `Le document ouvert — « ${source.fileName} » — porte des modifications que vous ` +
      'n’avez pas enregistrées. Charger « ' + entry.name + ' » les remplace dans l’éditeur.'
    ))
    body.append(el(
      'p', 'library__caveat',
      'Ranger d’abord ne coûte rien : la configuration ouverte prend un nom dans la ' +
      'bibliothèque, et vous y reviendrez d’un clic.'
    ))

    views.open({
      title: 'Des modifications ne sont pas enregistrées',
      body,
      choices: [
        {
          label: 'Ranger d’abord, puis charger',
          primary: true,
          run: () => { askStore(source, () => guard('Chargement', () => doLoad(entry))) }
        },
        {
          label: 'Charger sans ranger',
          run: () => guard('Chargement', () => doLoad(entry))
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
    say(`« ${entry.name} » ressort telle qu’elle est entrée : ${bytes.byteLength} octets, ` +
      `empreinte vérifiée.`)
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
      failure = error.message
    }
    const digest = bytes === undefined ? undefined : await sha256Hex(bytes)
    const same = digest === entry.sha256 && bytes?.byteLength === entry.byteLength

    const body = el('div', 'library__verify')
    body.append(el(
      'p', 'library__note',
      'L’empreinte a été posée au moment du rangement, sur les octets rangés. Celle-ci ' +
      'vient d’être recalculée sur ce que le magasin rend maintenant.'
    ))
    const facts = el('dl', 'library__facts')
    facts.append(el('dt', 'library__factLabel', 'Enregistrée'))
    const stored = el('dd', 'library__factValue')
    stored.append(el('code', 'library__digest', entry.sha256))
    facts.append(stored)
    facts.append(el('dt', 'library__factLabel', 'Recalculée à l’instant'))
    const fresh = el('dd', 'library__factValue')
    if (digest === undefined) fresh.append(el('span', 'library__factText', 'aucune — les octets n’ont pas été rendus'))
    else fresh.append(el('code', 'library__digest', digest))
    facts.append(fresh)
    facts.append(el('dt', 'library__factLabel', 'Taille'))
    facts.append(el('dd', 'library__factValue',
      `${bytes === undefined ? 'illisible' : `${bytes.byteLength} octets`} — ` +
      `${entry.byteLength} attendus`))
    body.append(facts)
    body.append(el(
      'p', same
        ? 'library__verdict library__verdict--same'
        : 'library__verdict library__verdict--differs',
      same
        ? 'Identiques : les octets rangés sont exactement ceux du fichier d’origine.'
        : 'Différentes — cette entrée ne sera pas restituée.'
    ))
    if (failure !== undefined) body.append(el('p', 'library__caveat', failure))
    views.open({
      title: `Empreinte — ${entry.name}`,
      body,
      cancelLabel: 'Retour à la liste',
      choices: []
    })
  }

  const askRemove = (entry: LibraryEntry): void => {
    const body = el('div', 'library__confirm')
    body.append(el('p', 'library__note',
      `« ${entry.name} » et ses ${formatByteSize(entry.byteLength)} d’octets seront ` +
      'retirés de ce navigateur. Cette bibliothèque n’a pas de corbeille.'))
    body.append(el('p', 'library__caveat',
      'Si vous n’en êtes pas sûr : ressortez d’abord le fichier, ou exportez la ' +
      'bibliothèque entière.'))
    views.open({
      title: `Supprimer « ${entry.name} » ?`,
      body,
      tone: 'grave',
      choices: [{
        label: 'Supprimer',
        primary: true,
        run: () => guard('Suppression', async () => {
          await library.remove(entry.id)
          say(`« ${entry.name} » a été supprimée.`)
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
    body.append(el('p', 'library__note',
      'Cette entrée ne se relit pas : on ne sait pas ce qu’elle contenait. La supprimer ' +
      'libère sa place et ne perd rien de lisible.'))
    body.append(el('p', 'library__note library__note--technical',
      `Identifiant interne ${broken.id}. Détail technique : ${broken.reason}.`))
    return body
  }

  const askRemoveBroken = (broken: BrokenEntry): void => {
    views.open({
      title: 'Supprimer cette entrée illisible ?',
      tone: 'grave',
      body: brokenBody(broken),
      choices: [{
        label: 'Supprimer',
        primary: true,
        run: () => guard('Suppression', async () => {
          await library.remove(broken.id)
          say('L’entrée illisible a été supprimée.')
        })
      }]
    })
  }

  const doExport = async (): Promise<void> => {
    await guard('Export de la bibliothèque', async () => {
      const when = now()
      const { archive, exported, skipped } = await exportLibrary(library, when)
      download(archive, `xctrack-bibliotheque-${fileStamp(when)}.zip`)
      const tail = skipped.length === 0
        ? ''
        : ` ${plural(skipped.length, 'entrée illisible n’y est pas',
          'entrées illisibles n’y sont pas')} : la sauvegarde est incomplète, et le dit.`
      say(`${plural(exported, 'configuration exportée', 'configurations exportées')} dans ` +
        `une archive ZIP. Chaque .xcfg s’en extrait avec n’importe quel décompresseur.${tail}`)
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
      `Archive exportée le ${formatStamp(report.exportedAt ?? '')}. Aucune entrée ` +
      'existante n’a été écrasée : une entrée déjà présente sous d’autres octets est ' +
      'replacée à côté, suffixée.'
    ))
    const list = el('ul', 'library__results')
    const labels: Record<string, string> = {
      // « replacée », et non « rétablie » : le troisième sens du mot (`i18n`,
      // `library.entryRestored`). Les deux autres vivent ailleurs dans l'application.
      imported: 'replacée',
      'already-present': 'déjà présente, rien à faire',
      duplicated: 'replacée à côté : son identifiant était déjà pris',
      rejected: 'refusée'
    }
    for (const result of report.results) {
      const item = el('li', result.outcome === 'rejected'
        ? 'library__result library__result--rejected'
        : 'library__result')
      item.append(el('span', 'library__resultName', result.name === '' ? result.sourceId : result.name))
      item.append(el('span', 'library__resultOutcome', labels[result.outcome] ?? result.outcome))
      if (result.reason !== undefined) item.append(el('span', 'library__resultReason', result.reason))
      list.append(item)
    }
    body.append(list)
    views.open({
      title: 'Bibliothèque importée',
      body,
      cancelLabel: 'Retour à la liste',
      choices: []
    })
    const rejected = counts.get('rejected') ?? 0
    say(`${plural(report.results.length, 'entrée lue', 'entrées lues')} dans l’archive` +
      (rejected === 0 ? '.' : ` — ${plural(rejected, 'refusée', 'refusées')}.`))
  }

  /* ------------------------------------------------------------------------ le dessin */

  function previewSlot(entry: LibraryEntry): HTMLElement {
    const slot = el('div', 'library__preview')
    slot.setAttribute('aria-hidden', 'true')
    slot.append(el('span', 'library__previewText',
      entry.preview === undefined ? 'Aperçu à venir' : 'Aperçu rangé'))
    return slot
  }

  const entryItem = (entry: LibraryEntry): HTMLElement => {
    const item = el('li', 'library__entry')

    item.append(previewSlot(entry))

    const main = el('div', 'library__entryMain')
    main.append(el('h3', 'library__entryName', entry.name))

    const meta = el('p', 'library__meta')
    meta.append(
      el('span', 'chip', exportTypeChip(entry.identity.read.exportType)),
      el('span', 'chip chip--quiet', formatByteSize(entry.byteLength)),
      el('span', 'chip chip--quiet',
        plural(entry.identity.read.widgetCount, 'gadget', 'gadgets'))
    )
    if (entry.identity.read.containerKind === 'xczfg') {
      meta.append(el('span', 'chip chip--quiet', 'archive .xczfg'))
    }
    const personal = personalDataCount(entry.identity)
    if (personal.total > 0) {
      // Les deux chiffres sont **toujours** dits, y compris le zéro : « 16 données
      // personnelles » seul laisserait croire que les 16 voyagent. Ce qui décide de ce
      // qu'on peut envoyer, c'est le second.
      const flag = el('span', 'flag',
        `${plural(personal.total, 'donnée personnelle', 'données personnelles')} · ` +
        `${String(personal.inLayout)} ${personal.inLayout > 1 ? 'partent' : 'part'} avec les pages`)
      meta.append(flag)
    }
    main.append(meta)

    main.append(el('p', 'library__stamp',
      `Rangée le ${formatStamp(entry.addedAt)} · ${entry.fileName === '' ? 'fichier inconnu' : entry.fileName}`))
    if (entry.note !== '') main.append(el('p', 'library__entryNote', entry.note))

    const row = el('div', 'library__entryActions')
    if (options.onLoad !== undefined) {
      const load = button('Charger', 'btn btn--primary')
      load.addEventListener('click', () => { askLoad(entry) })
      row.append(load)
    }
    const extract = button('Ressortir le fichier')
    extract.addEventListener('click', () => { void guard('Restitution', () => doExtract(entry)) })
    const card = button('Carte d’identité')
    card.addEventListener('click', () => { openIdentity(entry) })
    const verify = button('Vérifier l’empreinte', 'btn btn--ghost')
    verify.addEventListener('click', () => { void guard('Vérification', () => doVerify(entry)) })
    const rename = button('Renommer', 'btn btn--ghost')
    rename.addEventListener('click', () => {
      openFormView(views, {
        title: `Renommer « ${entry.name} »`,
        lead: 'Le nom est à vous ; les octets rangés ne bougent pas.',
        fields: [
          { key: 'name', label: 'Nom', value: entry.name },
          { key: 'note', label: 'Note', value: entry.note, multiline: true }
        ],
        confirmLabel: 'Enregistrer',
        onConfirm: (values) => guard('Renommage', async () => {
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
          say(`« ${latest.name} » est à jour — révision ${latest.revision}.`)
        })
      })
    })
    const remove = button('Supprimer', 'btn btn--ghost')
    remove.addEventListener('click', () => { askRemove(entry) })
    row.append(extract, card, verify, rename, remove)
    main.append(row)

    item.append(main)
    return item
  }

  const brokenItem = (broken: BrokenEntry): HTMLElement => {
    const item = el('li', 'library__entry library__entry--broken')
    const main = el('div', 'library__entryMain')
    main.append(el('h3', 'library__entryName', 'Entrée illisible'))
    main.append(el('p', 'library__meta'))
    main.append(el('p', 'library__stamp', `${broken.id} — ${broken.reason}`))
    main.append(el(
      'p', 'library__note',
      'Elle n’empêche pas les autres de s’afficher, et elle reste supprimable. Ses octets ' +
      'ne seront pas exportés : on n’écrit pas dans une sauvegarde ce qu’on ne saurait pas ' +
      'restituer.'
    ))
    const row = el('div', 'library__entryActions')
    const remove = button('Supprimer', 'btn')
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
    storageNote.append(el('strong', 'library__bannerTitle', 'Rangement non durable'))
    storageNote.append(el(
      'span', 'library__bannerText',
      'Ce navigateur n’accorde pas de rangement persistant à cette page : ce que vous ' +
      'rangez ici vivra le temps de l’onglet, puis disparaîtra. La bibliothèque reste ' +
      'utilisable — mais ce n’est pas une sauvegarde. Exportez-la avant de fermer.'
    ))
    const action = button('Exporter la bibliothèque maintenant')
    action.addEventListener('click', () => { void doExport() })
    storageNote.append(action)
  }

  const drawFoot = async (snapshot: LibrarySnapshot): Promise<void> => {
    const total = snapshot.entries.reduce((sum, entry) => sum + entry.byteLength, 0)
    foot.textContent = ''
    foot.append(el('span', 'library__footText',
      `${plural(snapshot.entries.length, 'configuration rangée', 'configurations rangées')}` +
      `${snapshot.entries.length === 0 ? '' : ` — ${formatByteSize(total)} au total`}` +
      `${snapshot.broken.length === 0 ? '' : `, ${plural(snapshot.broken.length,
        'entrée illisible', 'entrées illisibles')}`}.`))

    if (options.requestPersistence !== undefined && snapshot.durable) {
      const ask = button('Demander à ne pas être purgé', 'btn btn--ghost')
      ask.addEventListener('click', () => {
        void (async () => {
          const verdict = await options.requestPersistence?.()
          say(verdict === 'granted'
            ? 'Le navigateur a accordé la persistance. Elle n’est jamais une garantie : ' +
              'certains navigateurs purgent un site non visité depuis sept jours. La seule ' +
              'sauvegarde qui tienne est l’archive que vous exportez.'
            : verdict === 'denied'
              ? 'Le navigateur a refusé. Le rangement fonctionne toujours, mais il peut ' +
                'être purgé : exportez votre bibliothèque régulièrement.'
              : 'Ce navigateur ne propose pas ce réglage. Exportez votre bibliothèque ' +
                'régulièrement.')
        })()
      })
      foot.append(ask)
    }

    if (options.estimateStorage !== undefined) {
      const estimate = await options.estimateStorage()
      foot.append(el('span', 'library__footText', estimate === undefined
        ? 'Ce navigateur ne dit rien de l’espace disponible.'
        : `Espace employé par ce site : ${formatByteSize(estimate.usage)} sur ` +
          `${formatByteSize(estimate.quota)} accordés (estimation floutée par le navigateur).`))
    }
  }

  const draw = (snapshot: LibrarySnapshot): void => {
    listWrap.textContent = ''
    drawStorage(snapshot)

    if (snapshot.entries.length === 0 && snapshot.broken.length === 0) {
      listWrap.append(el(
        'p', 'library__empty',
        'Rien de rangé pour l’instant. Rangez la configuration ouverte, ou glissez-y un ' +
        'fichier .xcfg déjà exporté : il gardera son nom, sa date et ses octets.'
      ))
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
        plural(snapshot.broken.length, 'Entrée qui ne se relit pas', 'Entrées qui ne se relisent pas')))
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
      showFailure('Lecture de la bibliothèque', error)
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
      say('Aucun fichier n’est ouvert : ouvrez une configuration, ou rangez un fichier ' +
        'depuis le disque.', 'trouble')
      return
    }
    askStore(source)
  })

  addFile.addEventListener('click', () => { filePicker.click() })
  filePicker.addEventListener('change', () => {
    const file = filePicker.files?.[0]
    if (file === undefined) return
    void guard('Rangement', async () => {
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
    void guard('Import de la bibliothèque', async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      showImportReport(await importLibrary(library, bytes))
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
  dialog.setAttribute('aria-label', 'Bibliothèque de configurations')
  const box = el('div', 'modal__box')
  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Bibliothèque de configurations'))
  const dismiss = button('Fermer', 'btn btn--ghost')
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
