import './sharingDialog.css'
import { readableName } from '../catalog/widgetNames'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import {
  anonymizeDocument,
  buildExportFileName,
  documentExportType,
  type FreeTextReplacement
} from '../model/sharing'

/**
 * L'interface d'**export partageable** : choisir ce qu'on donne, voir ce qui est remplacé,
 * obtenir un nom qui ne dit rien du pilote.
 *
 * ## Le principe, et il n'y en a qu'un : montrer avant de faire
 *
 * C'est la règle du projet, celle qui commande déjà `warnings.ts` (« on signale, on ne
 * corrige jamais ») et la dérivation `backup` → `pages` de `scope.ts`. Un pilote qui
 * partage sa configuration doit voir **ce qui part** et **ce qui est remplacé**, avec
 * l'emplacement de chaque texte, pour pouvoir vérifier lui-même. La liste des onze clés
 * de texte libre est statique et se périmera ; l'inventaire montré, lui, est calculé sur
 * le fichier qu'on a sous la main. **C'est l'inventaire la parade, pas le code.**
 *
 * ## L'export ordinaire ne passe pas par ici, et c'est la raison de la forme retenue
 *
 * La fidélité à l'octet près est la promesse du projet. Ce module ne fabrique donc
 * **aucun octet** sur le chemin ordinaire : quand le pilote choisit « fichier complet »,
 * `SharingResult.document` vaut `undefined` et l'appelant réémet ce que
 * `exportContainer` lui rend — les octets d'origine, inchangés. Ouvrir cette boîte,
 * la refermer et exporter rend la même empreinte SHA-256 qu'un export direct, parce que
 * rien ici n'a touché au conteneur : `planSharing` travaille sur une copie
 * (`anonymizeDocument` clone), et cette copie est jetée avec la boîte si le pilote
 * renonce.
 *
 * L'anonymisation, elle, est une **modification demandée** : elle a le droit de changer
 * les octets, et elle seule.
 *
 * ## Ce module ne connaît ni l'état de l'application, ni le moment
 *
 * `renderSharingDialog` reçoit tout ce dont elle a besoin et rend une poignée. C'est
 * l'assembleur qui décide quand ouvrir, où poser l'élément, et ce qu'il fait du résultat.
 * Aucun accès à `localStorage`, aucune variable de module, aucun `new Date()` caché —
 * l'horloge est injectable, sans quoi les tests de nom de fichier seraient à la merci de
 * la seconde qui passe.
 */

/* ========================================================================= le plan */

/** Une annexe d'archive `.xczfg` : ce que le conteneur transporte en plus du `.xcfg`. */
export interface SharingExtra {
  name: string
  byteLength: number
}

/** Ce que l'appelant sait du fichier ouvert. Rien de plus n'est nécessaire. */
export interface SharingSource {
  /**
   * Le document **tel qu'il sera exporté**, modifications d'édition comprises. Il n'est
   * jamais modifié : l'anonymisation travaille sur une copie.
   */
  document: JsonNode
  /** Le nom du fichier ouvert. Sert à retrouver l'extension, jamais à composer le nom. */
  fileName: string
  /** Le conteneur ouvert. Une archive porte des annexes ; un `.xcfg` nu, non. */
  kind: 'xcfg' | 'xczfg'
  /** Les annexes de l'archive, hors le `.xcfg` principal. Vide ou absent pour un `.xcfg`. */
  extras?: readonly SharingExtra[]
}

/** Ce que produirait l'anonymisation, calculé mais pas encore livré. */
export interface AnonymousPlan {
  /** La copie anonymisée. La source n'a pas bougé. */
  document: JsonNode
  /** Le nom du fichier produit — toujours une extension `.xcfg`, voir plus bas. */
  fileName: string
  /** Ce qui sera remplacé, dans l'ordre du fichier. */
  replacements: FreeTextReplacement[]
  /** Les sections de premier niveau écartées par la dérivation `backup` → `pages`. */
  droppedRootKeys: string[]
  /** Vrai si le format change, c'est-à-dire si la source n'était pas déjà un `pages`. */
  derived: boolean
  /** Les annexes de l'archive qui ne partiront pas — voir `ANNEXES_NOTE`. */
  droppedExtras: readonly SharingExtra[]
}

export interface SharingPlan {
  /** Le nom que porterait un export ordinaire. Aucun octet n'est calculé pour celui-là. */
  plainFileName: string
  /** Le format déclaré par la source : `backup`, `pages`, ou `undefined` s'il est muet. */
  exportType: string | undefined
  anonymous: AnonymousPlan
}

/**
 * Calcule les deux issues possibles **sans rien livrer**. Fonction pure, hors DOM : c'est
 * elle que les tests exercent sur les fichiers réels.
 *
 * `when` est l'instant qui datera le nom. Le nom est unique **à la seconde** : deux appels
 * programmatiques dans la même seconde rendraient le même nom. À travers une boîte de
 * dialogue le cas n'est pas atteignable — il faudrait deux confirmations à moins d'une
 * seconde d'intervalle — et le navigateur suffixe de lui-même une collision dans le
 * dossier de téléchargements. C'est dit ici parce qu'un appelant programmatique, lui,
 * pourrait y tomber.
 */
export function planSharing(source: SharingSource, when: Date): SharingPlan {
  const exportType = documentExportType(source.document)
  const anonymized = anonymizeDocument(source.document)

  return {
    plainFileName: buildExportFileName({
      originalFileName: source.fileName,
      when,
      exportType
    }),
    exportType,
    anonymous: {
      document: anonymized.document,
      // `originalFileName` est volontairement omis : l'export anonymisé est **toujours**
      // un `.xcfg` nu, y compris quand la source est une archive. `fileExtension` rend
      // alors `DEFAULT_EXTENSION`, c'est-à-dire `.xcfg`. Voir `ANNEXES_NOTE`.
      fileName: buildExportFileName({
        when,
        exportType: documentExportType(anonymized.document),
        anonymized: true
      }),
      replacements: anonymized.replacements,
      droppedRootKeys: anonymized.droppedRootKeys,
      derived: anonymized.previousExportType !== 'pages',
      droppedExtras: source.kind === 'xczfg' ? (source.extras ?? []) : []
    }
  }
}

/** Ce que le pilote a choisi, rendu à l'appelant au moment où il confirme. */
export interface SharingResult {
  anonymized: boolean
  /** Le nom à donner au fichier téléchargé. */
  fileName: string
  /**
   * Le document à écrire, **uniquement** pour un export anonymisé. `undefined` veut dire
   * « réémettre les octets du conteneur » : c'est ce qui tient la fidélité à l'octet près.
   */
  document?: JsonNode
  /** Le conteneur à produire. Un export anonymisé est toujours un `.xcfg` nu. */
  kind: 'xcfg' | 'xczfg'
  /** Les annexes laissées de côté. Vide pour un export ordinaire. */
  droppedExtras: readonly SharingExtra[]
}

/**
 * Les octets d'un export **anonymisé**, ou `undefined` pour un export ordinaire.
 *
 * Ce `undefined` n'est pas une commodité : c'est le contrat. L'appelant qui le reçoit
 * doit rendre ce que `exportContainer` lui donne, sans passer par le sérialiseur. Un
 * module d'interface qui réécrirait les octets d'un fichier non modifié casserait la
 * seule promesse que ce projet fait à un pilote.
 */
export function sharingBytes(result: SharingResult): Uint8Array | undefined {
  if (!result.anonymized || result.document === undefined) return undefined
  return new TextEncoder().encode(serializeJson(result.document))
}

/* ================================================================ ce qu'on dit, en mots */

/**
 * Ce que chaque section écartée emportait avec elle. Deux clés suffisent : ce sont les
 * deux seules qu'un `backup` porte en plus d'un `pages` sur les 21 fichiers du corpus
 * (`scope.ts`). Une troisième, apparue dans une version à venir, tomberait sur le repli —
 * qui la nomme sans prétendre savoir ce qu'elle contient.
 */
const DROPPED_ROOT_KEY_LABELS: Record<string, string> = {
  preferences: 'Toutes vos préférences : nom du pilote, voile, unités, thème, réglages du '
    + 'vario et de ses sons, seuils d’espaces aériens, Livetracking, capteurs Bluetooth '
    + 'appairés, fichiers de waypoints.',
  airspaceSelectedChannels: 'Les canaux d’espaces aériens que vous avez sélectionnés.'
}

export function droppedRootKeyLabel(key: string): string {
  return DROPPED_ROOT_KEY_LABELS[key]
    ?? `La section « ${key} », qu’un export « pages » ne transporte pas.`
}

/**
 * Ce que l'anonymisation coûte **au destinataire**. C'est la partie qu'on serait tenté de
 * taire, donc celle qui est écrite en toutes lettres et montrée avant le geste.
 *
 * Ce n'est pas un défaut de l'outil : c'est la conséquence directe du format. Anonymiser
 * dérive un export `pages`, et un `pages` ne porte que `info` et `layout`. Le destinataire
 * reçoit **la disposition, pas les préférences**.
 */
export const ANONYMOUS_COSTS: readonly string[] = [
  'les unités — altitudes, distances, vitesses : il gardera les siennes ;',
  'le thème d’affichage, la taille et la couleur des titres de gadgets ;',
  'les réglages du vario et de ses sons ;',
  'les seuils et les canaux d’espaces aériens ;',
  'le Livetracking et ses identifiants ;',
  'les capteurs Bluetooth appairés.'
]

/**
 * Pourquoi un export anonymisé sort en `.xcfg` nu, même depuis une archive.
 *
 * ## Le piège
 *
 * Un `.xczfg` est une archive ZIP : un `.xcfg` plus des fichiers annexes ajoutés par le
 * pilote. **Rien, dans cet éditeur, n'inspecte ces annexes** — ni leur contenu, ni les
 * métadonnées d'une image, où une photo prise au décollage porte couramment les
 * coordonnées du lieu de prise de vue. Réécrire le JSON et recopier les annexes telles
 * quelles produirait un fichier dont la partie propre est propre et l'autre non : une
 * promesse d'anonymat fausse, ce qui est pire qu'une absence de promesse.
 *
 * ## Ce qui a été tranché, et pourquoi
 *
 * L'anonymisé sort en **`.xcfg` nu**, sans les annexes, plutôt que d'en proposer le
 * retrait une à une. Trois raisons, dans l'ordre où elles pèsent :
 *
 * 1. **Rien de ce qui survit ne les désigne.** Le relevé des 21 fichiers du corpus
 *    (§ « ressources extérieures » de `scope.ts`) est net : le `layout` ne référence
 *    aucun fichier ni chemin. Toutes les ressources extérieures d'une configuration sont
 *    désignées depuis les `preferences` — c'est-à-dire depuis la section que la
 *    dérivation `pages` ne transporte pas. Une annexe conservée dans l'anonymisé serait
 *    donc un fichier que plus rien n'ouvre.
 * 2. **Un choix à la carte demanderait au pilote une décision qu'il ne peut pas
 *    prendre.** « Garder cette image ? » suppose de savoir ce qu'elle porte comme
 *    métadonnées ; nous ne le lui disons pas, et lui donner la case à cocher sans le
 *    renseignement serait lui faire endosser notre ignorance.
 * 3. **Le format reste valide.** Un export `pages` écrit par XCTrack lui-même est un
 *    `.xcfg` nu : on ne fabrique donc pas une forme que l'appareil n'écrit jamais.
 *
 * Les annexes ne sont pas passées sous silence pour autant : elles sont **listées**, avec
 * leur taille, sous l'option d'anonymisation. Le pilote qui en a besoin exporte le fichier
 * complet, ou les envoie séparément en connaissance de cause.
 */
export const ANNEXES_NOTE =
  'Une archive .xczfg transporte des fichiers annexes que cet éditeur n’inspecte pas — '
  + 'ni leur contenu, ni les métadonnées d’une image, où une photo porte souvent les '
  + 'coordonnées du lieu de prise de vue. La version partageable est donc écrite en .xcfg '
  + 'nu, sans eux. Rien d’utile n’y est perdu : les ressources extérieures d’une '
  + 'configuration sont désignées depuis les préférences, qui ne partent pas non plus.'

/**
 * Ce qui reste malgré tout. Dit **à côté de l'inventaire**, jamais replié dans un volet
 * qu'on n'ouvre pas : c'est la limite exacte de ce que l'outil garantit.
 */
export const RESIDUAL_NOTE =
  'La liste des onze clés de texte traitées est fixe, et le format de XCTrack change à '
  + 'chaque version : un champ de texte apparu depuis partirait en clair. Relisez '
  + 'l’inventaire ci-dessus avant d’envoyer le fichier — c’est lui la vérification, pas '
  + 'la promesse de cet outil.'

const ORIENTATION_LABELS: Record<string, string> = {
  landscape: 'Paysage',
  portrait: 'Portrait'
}

/**
 * L'emplacement d'un texte remplacé, dans les mots du pilote : l'orientation, le rang de
 * la page, le rang du gadget et son nom lisible.
 *
 * Le mot affiché est **gadget** — c'est celui de l'interface francophone de XCTrack, et
 * c'est celui que le reste de cette application emploie.
 */
export function describeLocation(entry: FreeTextReplacement, language: string): string {
  const orientation = ORIENTATION_LABELS[entry.orientation] ?? entry.orientation
  return `${orientation} · page ${entry.pageRank} · gadget ${entry.widgetRank}`
    + ` · ${readableName(entry.shortName, language)}`
}

/**
 * Une taille de fichier lisible, virgule française. Sert aux annexes d'archive : « 1,4 Mo »
 * dit au pilote s'il s'agit d'une icône ou d'une photo, ce qu'un nombre d'octets ne dit pas.
 */
export function formatByteSize(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} o`
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1).replace('.', ',')} ko`
  return `${(byteLength / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** La valeur posée, telle qu'on l'écrit quand c'est la chaîne vide. */
export function displayedReplacement(replacement: string): string {
  return replacement === '' ? '(vide)' : replacement
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/* ============================================================================ la boîte */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export interface SharingDialogOptions {
  source: SharingSource
  /** Langue déjà résolue par l'appelant, pour nommer les gadgets. Défaut : `'fr'`. */
  language?: string
  /**
   * L'horloge. Injectable, et appelée **une seule fois**, au rendu : le nom montré est
   * exactement le nom produit. Défaut : `() => new Date()`.
   */
  now?: () => Date
  /**
   * Un bloc à insérer sous l'introduction — les avertissements d'export que `main.ts`
   * calcule déjà (`warningsAt(…, 'export')`). Ce module n'en fabrique aucun : les
   * avertissements ont leur propre chaîne, et la dupliquer les ferait diverger.
   */
  notice?: HTMLElement
  /** Appelé après la fermeture, avec ce que le pilote a choisi. */
  onConfirm: (result: SharingResult) => void
  /** Appelé après la fermeture, quand le pilote renonce — bouton, « Échap » ou « Fermer ». */
  onCancel?: () => void
}

/**
 * Ce que l'assembleur reçoit. `element` pour le poser où il veut, `open` et `close` pour
 * ne pas avoir à connaître les usages de `<dialog>`.
 */
export interface SharingDialogHandle {
  element: HTMLDialogElement
  /** Pose l'élément dans le document s'il n'y est pas, puis l'ouvre en modale. */
  open: () => void
  /** Ferme et retire l'élément. N'appelle **aucun** rappel : c'est l'appelant qui agit. */
  close: () => void
}

function replacementItem(entry: FreeTextReplacement, language: string): HTMLElement {
  const item = el('li', 'sharing__item')
  item.append(el('p', 'sharing__where', describeLocation(entry, language)))

  const swap = el('p', 'sharing__swap')
  swap.append(
    el('code', 'sharing__key', entry.keyPath),
    el('span', 'sharing__from', entry.text),
    el('span', 'sharing__arrow', '→'),
    el('span', 'sharing__to', displayedReplacement(entry.replacement))
  )
  item.append(swap, el('p', 'sharing__why', entry.reason))
  return item
}

function replacementsSection(plan: AnonymousPlan, language: string): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Ce qui sera remplacé'))

  if (plan.replacements.length === 0) {
    section.append(el(
      'p', 'sharing__note',
      'Aucun texte personnalisé dans les gadgets de ce fichier : rien à remplacer.'
    ))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    `${plural(plan.replacements.length, 'texte écrit par vous est remplacé',
      'textes écrits par vous sont remplacés')}. Voici lesquels, et où ils se trouvent.`
  ))

  const list = el('ol', 'sharing__list')
  for (const entry of plan.replacements) list.append(replacementItem(entry, language))
  section.append(list)
  section.append(el('p', 'sharing__caveat', RESIDUAL_NOTE))
  return section
}

function droppedSection(plan: AnonymousPlan): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Ce qui ne partira pas'))

  if (plan.droppedRootKeys.length === 0) {
    section.append(el(
      'p', 'sharing__note',
      'Ce fichier est déjà un export « pages » : il ne porte aucune préférence, il n’y a '
      + 'donc rien à en retirer.'
    ))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    'Le fichier partagé est un export « pages » : il ne porte que vos pages. '
    + `${plan.droppedRootKeys.length > 1 ? 'Ces sections entières restent'
      : 'Cette section entière reste'} chez vous.`
  ))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const key of plan.droppedRootKeys) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', key),
      el('span', 'sharing__why', droppedRootKeyLabel(key))
    )
    list.append(item)
  }
  section.append(list)

  const cost = el('div', 'sharing__cost')
  cost.append(el(
    'p', 'sharing__note',
    'Ce que le destinataire n’aura donc pas, et qu’il devra régler lui-même :'
  ))
  const costs = el('ul', 'sharing__list sharing__list--plain')
  for (const line of ANONYMOUS_COSTS) costs.append(el('li', 'sharing__why', line))
  cost.append(costs)
  cost.append(el(
    'p', 'sharing__note',
    'Il reçoit la disposition de vos pages, pas vos préférences. C’est le plus souvent ce '
    + 'qu’on veut — ses unités ne sont pas forcément les vôtres — mais il faut le savoir '
    + 'avant d’envoyer.'
  ))
  section.append(cost)
  return section
}

function annexesSection(plan: AnonymousPlan): HTMLElement | undefined {
  if (plan.droppedExtras.length === 0) return undefined

  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Les annexes de l’archive'))
  section.append(el('p', 'sharing__note', ANNEXES_NOTE))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const extra of plan.droppedExtras) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', extra.name),
      el('span', 'sharing__why', formatByteSize(extra.byteLength))
    )
    list.append(item)
  }
  section.append(list)
  return section
}

/**
 * La boîte d'export partageable, prête à être ouverte.
 *
 * Elle reprend le meuble déjà posé : `<dialog class="modal">`, tête collante
 * (`.modal__head`) dont le bouton de fermeture reste atteignable quand la boîte défile —
 * un acquis récent, et un inventaire de remplacements peut être long. La seule feuille
 * ajoutée est `sharingDialog.css`, importée par ce module.
 *
 * **Rendre la boîte juste avant de l'ouvrir** : l'horodatage du nom est celui du rendu,
 * pas celui du clic. C'est ce qui fait que le nom montré est exactement le nom produit.
 */
export function renderSharingDialog(options: SharingDialogOptions): SharingDialogHandle {
  const language = options.language ?? 'fr'
  const when = (options.now ?? (() => new Date()))()
  const plan = planSharing(options.source, when)

  const dialog = el('dialog', 'modal modal--sharing')
  dialog.setAttribute('aria-label', 'Enregistrer cette configuration')

  const box = el('div', 'modal__box')

  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Enregistrer cette configuration'))
  const dismiss = el('button', 'btn btn--ghost', 'Fermer')
  dismiss.type = 'button'
  head.append(dismiss)
  box.append(head)

  box.append(el(
    'p', 'modal__lead',
    'Le fichier produit porte un nom horodaté qui ne reprend rien du nom d’origine — '
    + 'celui-ci contient souvent un prénom. Reste à choisir ce qu’il contient, lui.'
  ))
  if (options.notice) box.append(options.notice)

  /* --- les deux issues --- */

  const choices = el('fieldset', 'sharing__choices')
  const legend = el('legend', 'sr-only')
  legend.textContent = 'Que faut-il enregistrer ?'
  choices.append(legend)

  const name = `sharing-choice-${Math.random().toString(36).slice(2, 8)}`

  const buildChoice = (
    value: 'plain' | 'anonymous', title: string, note: string, checked: boolean
  ): HTMLInputElement => {
    const label = el('label', 'sharing__choice')
    const input = el('input', 'sharing__radio')
    input.type = 'radio'
    input.name = name
    input.value = value
    input.checked = checked
    const body = el('span', 'sharing__choiceBody')
    body.append(
      el('span', 'sharing__choiceTitle', title),
      el('span', 'sharing__choiceNote', note)
    )
    label.append(input, body)
    choices.append(label)
    return input
  }

  const freeTextCount = plan.anonymous.replacements.length
  const plainNote = plan.exportType === 'pages'
    ? 'Le fichier part tel quel, à l’octet près. Un export « pages » ne porte pas de '
      + 'préférences, mais les textes que vous avez écrits dans les gadgets, si.'
    : 'Le fichier part tel quel, à l’octet près — préférences comprises : nom du pilote, '
      + 'voile, capteurs appairés, fichiers de waypoints.'

  const plainInput = buildChoice(
    'plain',
    'Fichier complet',
    freeTextCount === 0
      ? plainNote
      : `${plainNote} Il porte ${plural(freeTextCount, 'texte personnalisé',
        'textes personnalisés')} dans les gadgets, qui partiront en clair.`,
    true
  )

  const anonymousInput = buildChoice(
    'anonymous',
    'Version partageable, sans données personnelles',
    'Un export « pages » dont les textes que vous avez écrits sont remplacés par des '
    + 'textes neutres. La disposition est conservée ; les préférences ne partent pas.',
    false
  )

  box.append(choices)

  /* --- ce que l'anonymisation fait, montré avant de le faire --- */

  const detail = el('div', 'sharing__detail')
  detail.append(droppedSection(plan.anonymous))
  const annexes = annexesSection(plan.anonymous)
  if (annexes) detail.append(annexes)
  detail.append(replacementsSection(plan.anonymous, language))
  box.append(detail)

  /* --- le nom produit --- */

  const fileNameLine = el('p', 'modal__name')
  box.append(fileNameLine)

  const refresh = (): void => {
    const anonymous = anonymousInput.checked
    detail.hidden = !anonymous
    fileNameLine.textContent = `Nom du fichier produit : ${
      anonymous ? plan.anonymous.fileName : plan.plainFileName}`
  }
  plainInput.addEventListener('change', refresh)
  anonymousInput.addEventListener('change', refresh)
  refresh()

  /* --- confirmer ou renoncer --- */

  const actions = el('div', 'modal__actions')
  const cancel = el('button', 'btn', 'Annuler')
  cancel.type = 'button'
  const confirm = el('button', 'btn btn--primary', 'Enregistrer')
  confirm.type = 'button'
  actions.append(cancel, confirm)
  box.append(actions)

  dialog.append(box)

  const handle: SharingDialogHandle = {
    element: dialog,
    open: () => {
      if (!dialog.isConnected) document.body.append(dialog)
      dialog.showModal()
      confirm.focus()
    },
    close: () => {
      if (dialog.open) dialog.close()
      dialog.remove()
    }
  }

  const giveUp = (): void => {
    handle.close()
    options.onCancel?.()
  }
  cancel.addEventListener('click', giveUp)
  dismiss.addEventListener('click', giveUp)
  // « Échap » ferme la boîte native : rien n'est enregistré, comme « Annuler ».
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    giveUp()
  })

  confirm.addEventListener('click', () => {
    const anonymous = anonymousInput.checked
    handle.close()
    options.onConfirm(anonymous
      ? {
        anonymized: true,
        fileName: plan.anonymous.fileName,
        document: plan.anonymous.document,
        // Toujours un `.xcfg` nu, archive ou non — voir `ANNEXES_NOTE`.
        kind: 'xcfg',
        droppedExtras: plan.anonymous.droppedExtras
      }
      : {
        anonymized: false,
        fileName: plan.plainFileName,
        // Pas de document : l'appelant réémet les octets du conteneur, inchangés.
        kind: options.source.kind,
        droppedExtras: []
      })
  })

  return handle
}
