import type { JsonNode } from '../core/jsonDocument'
import { isShownForNoNavigation } from '../model/inspection'
import type { Page } from '../model/layout'
import {
  createPage,
  duplicatePage,
  insertPage,
  pagesNode,
  removePage,
  reorderPage,
  setPageClass,
  type Orientation
} from '../model/mutations'
import { renderPage } from '../render/canvas'
import type { Translator } from '../i18n'
import { aspectRatioOf, pageKind, type ViewContext } from './views'

/**
 * La gestion des pages : en insérer, en supprimer, en dupliquer, les réordonner.
 *
 * Le module est coupé en deux, comme `editor.ts` :
 *
 * 1. **le modèle des opérations**, en haut — des fonctions pures qui décrivent une
 *    opération, en calculent les conséquences et l'appliquent au document par les
 *    primitives de `model/mutations.ts`. Aucune ne touche au DOM ; ce sont elles que
 *    les tests exercent sur les fichiers réels du corpus ;
 * 2. **le carrousel**, en bas — les vignettes, les points d'insertion, les commandes.
 *    Il ne décide de rien : il construit une opération, en demande la description et
 *    l'annonce, puis appelle `onOperation`. Le document, l'historique et le
 *    rafraîchissement appartiennent à l'appelant.
 *
 * Ce qui est repris de l'édition native (relevé § 5 de
 * `docs/reference/edition-native-exploration.md`) : le carrousel horizontal de vignettes
 * rendues en direct, la classe au-dessus, les icônes d'insertion **entre** les pages
 * plutôt qu'un bouton unique en fin de liste, les quatre classes proposées à la création,
 * le glisser-déposer pour réordonner, la duplication et la corbeille.
 *
 * Ce qui s'en écarte, volontairement :
 *
 * - **la suppression demande confirmation**. L'appareil supprime au premier appui, sans
 *   rien dire ; ici le bouton passe d'abord à « Confirmer », et la conséquence — le
 *   décalage de toutes les pages suivantes — s'écrit à ce moment-là, avant le geste et
 *   non après. L'annulation reste possible ensuite (`model/history.ts`), mais un pilote
 *   qui a fermé l'onglet n'annule plus rien ;
 * - **la classe reste modifiable après création**. XCTrack ne le propose sur aucun de
 *   ses écrans (§ 5.2) ; ce n'est pourtant qu'une clé du fichier, et le refuser serait
 *   contraindre l'éditeur à une limite de l'appareil. C'est donc offert, mais **dit** :
 *   la conséquence côté XCTrack n'a pas été vérifiée sur l'appareil, et l'avertissement
 *   correspondant s'affiche en permanence dès que la commande est active. L'appelant
 *   peut s'en tenir au comportement de l'appareil avec `allowClassChange: false` ;
 * - **les commandes de rang doublent le glisser-déposer**. « ◀ » et « ▶ » font le même
 *   travail au clavier, ce qu'un glisser-déposer ne fait pas.
 *
 * Ce qui n'est **pas** offert : la modification de `navigations`. La boîte des cinq
 * icônes de l'appareil (§ 5.4) demanderait une primitive d'écriture que
 * `model/mutations.ts` n'a pas — `createPage` sait poser des navigations, rien ne sait
 * les changer ensuite. Elles sont donc affichées, jamais éditées.
 */

/* ======================================================== le modèle des opérations */

/** Une page neuve est activée pour toutes les navigations, comme sur l'appareil (§ 5.2). */
const NEW_PAGE_NAVIGATIONS = { kind: 'all' } as const

/**
 * La classe dont XCTrack fait la cible de son basculement automatique en spirale —
 * relevé sur l'instrument (`edition-native-exploration.md` § 5.4). Ce qui est documenté
 * s'arrête là : la classe est la cible. Le départage entre plusieurs pages de cette
 * classe, lui, n'est qu'une supposition — voir `autoSwitchTargetRank`.
 */
export const THERMAL_ASSISTANT_CLASS = 'WPThermalAssistant'

export interface PageChoice {
  className: string
  label: string
  description: string
}

/**
 * Les quatre entrées de « Choisissez une nouvelle page », dans l'ordre et avec les mots
 * de l'appareil (§ 5.2) — un pilote qui a vu cet écran doit retrouver la même liste.
 *
 * Les descriptions sont celles de l'instrument, et rien de plus. Deux d'entre elles
 * ajoutaient « Masquée hors contexte de vol », ce qui était faux : la classe d'une page
 * ne décide pas du moment où l'appareil la montre, c'est sa clé `navigations` qui le
 * fait — mesuré le 22 août 2026, voir `PAGE_KINDS` dans `src/ui/views.ts`.
 *
 * ⚠️ **Ces huit chaînes ne sont pas versées au catalogue de `src/i18n/`, et c'est
 * délibéré.** Ce sont des **libellés de XCTrack**, relevés dans ses ressources sous
 * `wpThermalAssistantTitle`, `wpXCAssistantTitle`, `wpCompetitionTitle`, `wpEmptyTitle`
 * et leurs `…Description`. Ils suivent donc l'axe `labels` — la langue du fichier
 * ouvert — et non l'axe de notre prose (`src/i18n/axes.ts`). Les traduire ici les ferait
 * suivre le mauvais axe, et un libellé « traduit » est un mot que le pilote ne trouve
 * nulle part sur son appareil (`src/i18n/CLAUDE.md` § 7.1).
 *
 * La mesure existe pourtant dans les cinq langues : `src/catalog/widgetLabels.json`
 * porte `WPThermalAssistant`, `WPXCAssistant`, `WPCompetition` et `WPEmpty` en 31
 * langues. Les brancher sur `ctx.language`, comme `renderPage` le fait déjà pour les
 * noms de gadgets, est le geste juste — mais c'est un changement de comportement, pas
 * une extraction, et `describeOperation` ne reçoit aujourd'hui aucun axe de libellés.
 */
export const PAGE_CHOICES: readonly PageChoice[] = [
  {
    className: 'WPThermalAssistant',
    label: 'Aide thermique',
    description: 'Aide thermique. C’est la classe que vise le basculement automatique.'
  },
  {
    className: 'WPXCAssistant',
    label: 'Aide XC',
    description: 'Aide FAI et routes.'
  },
  {
    className: 'WPCompetition',
    label: 'Compétition',
    description: 'Navigation en compétition.'
  },
  {
    className: 'WPEmpty',
    label: 'Vide',
    description: 'Page vide, prête pour vos propres gadgets.'
  }
]

/**
 * Les cinq navigations de la boîte de visibilité (§ 5.4), pour l'affichage seul.
 *
 * La table ne porte plus le texte mais la **clé** : ce sont nos mots, traduits dans les
 * cinq langues, et non ceux de l'appareil — sa chrome française dit « Triangle
 * achevant », « Balises/Navigation XC », « Manche de compétition » et « Pilote Live ».
 * Voir `navigation.*` dans `src/i18n/messages/fr/pages.ts`.
 *
 * Une navigation qu'aucune version connue ne documente reste affichée sous son nom court,
 * plutôt que de disparaître de la liste.
 */
const NAVIGATION_KEYS = {
  TaskBackToTakeoff: 'navigation.backToTakeoff',
  TaskTriangleClosing: 'navigation.triangleClosing',
  TaskToWaypoint: 'navigation.toWaypoint',
  TaskCompetition: 'navigation.competition',
  TaskToLivePilot: 'navigation.toLivePilot'
} as const

export type PageOperation =
  | { kind: 'insert'; index: number; className: string }
  | { kind: 'duplicate'; index: number }
  | { kind: 'remove'; index: number }
  | { kind: 'reorder'; from: number; to: number }
  | { kind: 'setClass'; index: number; className: string }

/** Le nom court d'une classe de page : `…wp.WPEmpty` → `WPEmpty`. */
export function shortClassName(className: string): string {
  return className.split('.').pop() ?? ''
}

/** Le libellé de création d'une classe — celui de l'appareil, sinon le nom court. */
export function creationLabel(className: string): string {
  const short = shortClassName(className)
  return PAGE_CHOICES.find((choice) => choice.className === short)?.label ?? short
}

/**
 * L'orientation telle qu'elle s'écrit **dans une phrase** — « (paysage) ». Le titre du
 * carrousel emploie l'autre forme : le français la distingue par la capitale, l'allemand
 * ne le peut pas, d'où deux clés et non une capitalisation calculée.
 */
function orientationInline(tr: Translator, orientation: Orientation): string {
  return orientation === 'landscape'
    ? tr.t('pages.landscapeInline')
    : tr.t('pages.portraitInline')
}

/** « 3 » ou « 3 à 5 », en rangs affichés (à partir de 1). */
function rangeLabel(tr: Translator, firstRank: number, lastRank: number): string {
  return firstRank === lastRank
    ? tr.format.number(firstRank)
    : tr.t('pages.rankRange', { first: firstRank, last: lastRank })
}

/**
 * La description qui part à l'historique. Elle nomme le **rang**, parce que c'est la
 * seule identité d'une page — « Supprimer la page 3 (paysage) » se relit sans ambiguïté
 * dans un menu « Annuler », ce qu'un identifiant interne ne permettrait pas.
 *
 * ⚠️ **Ces cinq phrases sont lues deux fois.** L'appelant les enregistre telles quelles
 * comme pas d'historique, et elles reviennent derrière « Annuler : » — donc hors de
 * l'écran qui les a produites. Elles nomment pour cette raison le rang en toutes lettres
 * et rappellent l'orientation : les deux carrousels partagent un seul historique. La
 * contrainte vaut dans les cinq langues, et `src/i18n/messages/fr/pages.ts` la redit au
 * traducteur.
 */
export function describeOperation(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation, tr: Translator
): string {
  const where = orientationInline(tr, orientation)
  switch (operation.kind) {
    case 'insert':
      return tr.t('pages.describeInsert', {
        type: creationLabel(operation.className), rank: operation.index + 1, orientation: where
      })
    case 'duplicate':
      return tr.t('pages.describeDuplicate', {
        rank: operation.index + 1, target: operation.index + 2, orientation: where
      })
    case 'remove':
      return tr.t('pages.describeRemove', { rank: operation.index + 1, orientation: where })
    case 'reorder':
      return tr.t('pages.describeReorder', {
        rank: operation.from + 1, target: operation.to + 1, orientation: where
      })
    case 'setClass':
      return tr.t('pages.describeSetClass', {
        rank: operation.index + 1,
        before: creationLabel(pages[operation.index]?.className ?? ''),
        after: creationLabel(operation.className),
        orientation: where
      })
  }
}

/** Ce que l'interface annonce une fois l'opération faite, `pages` étant l'état d'AVANT. */
export function operationAnnouncement(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation, tr: Translator
): string {
  const done = describeOperation(pages, operation, orientation, tr)
  const shift = shiftAdvice(pages, operation, tr)
  return shift === undefined
    ? tr.t('pages.announcement', { done })
    : tr.t('pages.announcementWithAdvice', { done, advice: shift.text })
}

/* ------------------------------------------------------------------ les conséquences */

export type AdviceKind = 'shift' | 'thermal' | 'visibility' | 'class'

export interface Advice {
  kind: AdviceKind
  text: string
}

/** Les rangs affichés (à partir de 1) des pages d'assistant de thermique. */
export function thermalAssistantRanks(pages: readonly Page[]): number[] {
  const ranks: number[] = []
  pages.forEach((page, index) => {
    if (shortClassName(page.className) === THERMAL_ASSISTANT_CLASS) ranks.push(index + 1)
  })
  return ranks
}

/**
 * La page vers laquelle cet éditeur **suppose** que XCTrack bascule en spirale, ou
 * `undefined` s'il n'y a aucune page de cette classe.
 *
 * ⚠️ **La dernière : c'est une supposition, pas un relevé.** Le commentaire d'origine
 * disait « le manuel est formel » et renvoyait au « § 5 du relevé » ; relecture faite le
 * 22 août 2026, le § 5.4 de `docs/reference/edition-native-exploration.md` dit seulement
 * que la classe `WPThermalAssistant` est la cible du basculement, et rien du départage
 * quand une orientation en porte plusieurs. Aucun autre document du dépôt ne le dit, et
 * aucun des 21 fichiers du corpus n'en porte deux : cela n'a donc jamais pu être observé
 * non plus.
 *
 * `src/model/inspection.ts` sort la même supposition en `certainty: 'hypothesis'`, avec
 * ce qui la trancherait. Les textes d'ici disent « suppose » pour la même raison : rien
 * n'interdit de proposer un repère au pilote, tout interdit de le lui donner pour un
 * fait. Ce que l'on sait en revanche : les pages non visées restent atteignables par
 * « page suivante ».
 */
export function autoSwitchTargetRank(pages: readonly Page[]): number | undefined {
  const ranks = thermalAssistantRanks(pages)
  return ranks.length === 0 ? undefined : ranks[ranks.length - 1]
}

/**
 * Nombre de pages qu'au moins une navigation affiche.
 *
 * Ce compte s'appelait `visibleOnGroundCount` et se calculait sur la **classe** de la
 * page (`WPCompetition` et `WPThermalAssistant` étant réputées masquées hors vol). Le
 * critère était faux : au sol, sur un AIR³ 7.2, la page d'assistant de thermique revient
 * dans le défilement, et la seule page sautée est celle dont `navigations` vaut `"none"`
 * (`docs/reference/2026-08-22-essai-pilote.md` § 2). Le prédicat vient donc maintenant de
 * `src/model/inspection.ts`, qui lit la clé — avec son garde-fou sur la clé absente.
 *
 * Le compte ne dit plus « au sol » : ce qui est établi, c'est qu'une page activée pour
 * aucune navigation n'est affichée pour aucune navigation. Que XCTrack la saute au sol
 * est mesuré ; ce qu'il fait en vol reste ce que sa propre boîte de réglage annonce.
 */
export function navigablePageCount(pages: readonly Page[]): number {
  return pages.filter((page) => !isShownForNoNavigation(page)).length
}

/** La classe qu'aurait la page de rang `index` après l'opération, s'il y en a une. */
function resultingClassName(operation: PageOperation, pages: readonly Page[]): string | undefined {
  if (operation.kind === 'insert') return shortClassName(operation.className)
  if (operation.kind === 'setClass') return shortClassName(operation.className)
  if (operation.kind === 'duplicate') return shortClassName(pages[operation.index]?.className ?? '')
  return undefined
}

/**
 * Le décalage des rangs. C'est l'avertissement le plus important de ce module : une page
 * n'a pas de nom, son rang EST son identité, et c'est ce rang que le pilote parcourt en
 * vol par appuis longs. Insérer en 3 ne fait pas qu'ajouter une page : cela change ce que
 * montrent tous les appuis suivants.
 */
function shiftAdvice(
  pages: readonly Page[], operation: PageOperation, tr: Translator
): Advice | undefined {
  const count = pages.length
  const identity = tr.t('pages.rankIsIdentity')

  if (operation.kind === 'insert' || operation.kind === 'duplicate') {
    const first = operation.kind === 'insert' ? operation.index : operation.index + 1
    if (first >= count) return undefined
    return {
      kind: 'shift',
      text: tr.t('pages.rankShift', {
        count: count - first,
        from: rangeLabel(tr, first + 1, count),
        to: rangeLabel(tr, first + 2, count + 1),
        identity
      })
    }
  }

  if (operation.kind === 'remove') {
    const moved = count - operation.index - 1
    if (moved <= 0) return undefined
    return {
      kind: 'shift',
      text: tr.t('pages.rankShift', {
        count: moved,
        from: rangeLabel(tr, operation.index + 2, count),
        to: rangeLabel(tr, operation.index + 1, count - 1),
        identity
      })
    }
  }

  if (operation.kind === 'reorder' && operation.from !== operation.to) {
    const low = Math.min(operation.from, operation.to)
    const high = Math.max(operation.from, operation.to)
    return {
      kind: 'shift',
      text: tr.t('pages.rankShiftReorder', {
        range: rangeLabel(tr, low + 1, high + 1), identity
      })
    }
  }

  return undefined
}

/**
 * Ce qu'il faut dire AVANT d'appliquer une opération, `pages` étant l'état courant.
 * Rien n'est corrigé, rien n'est refusé : on énonce la conséquence, le pilote décide.
 */
export function operationAdvice(
  pages: readonly Page[], operation: PageOperation, tr: Translator
): Advice[] {
  const advice: Advice[] = []

  const shift = shiftAdvice(pages, operation, tr)
  if (shift) advice.push(shift)

  /* Une seconde page d'assistant de thermique prive la première du basculement. */
  const created = resultingClassName(operation, pages)
  if (created === THERMAL_ASSISTANT_CLASS) {
    const existing = thermalAssistantRanks(pages)
      .filter((rank) => !(operation.kind === 'setClass' && rank === operation.index + 1))
    if (existing.length > 0) {
      advice.push({
        kind: 'thermal',
        text: tr.t('pages.thermalAlreadyPresent', {
          count: existing.length,
          // Une colonne de rangs entre parenthèses, pas une énumération en prose :
          // `format.list` y écrirait « 3 et 5 » et ferait lire une phrase.
          ranks: existing.join(', '),
          last: existing[existing.length - 1]!
        })
      })
    }
  }

  /*
   * Supprimer la dernière page qu'une navigation affiche laisse un appareil qui ne montre
   * plus rien. Ce commentaire disait « visible au sol » ; c'est le critère faux, celui de
   * la CLASSE, que `navigablePageCount` a cessé d'appliquer le 22 août 2026.
   */
  if (operation.kind === 'remove') {
    const remaining = pages.filter((_, index) => index !== operation.index)
    if (remaining.length === 0) {
      advice.push({ kind: 'visibility', text: tr.t('pages.lastPageOfOrientation') })
    } else if (navigablePageCount(pages) > 0 && navigablePageCount(remaining) === 0) {
      advice.push({ kind: 'visibility', text: tr.t('pages.noNavigablePageLeft') })
    }
    if (shortClassName(pages[operation.index]?.className ?? '') === THERMAL_ASSISTANT_CLASS) {
      const others = thermalAssistantRanks(pages).filter((rank) => rank !== operation.index + 1)
      advice.push({
        kind: 'thermal',
        text: others.length === 0
          ? tr.t('pages.onlyThermalPage')
          : tr.t('pages.autoSwitchWouldTarget', { rank: others[others.length - 1]! })
      })
    }
  }

  if (operation.kind === 'setClass') advice.push(classChangeAdvice(tr))

  return advice
}

/**
 * Le seul avertissement de ce module qui porte sur l'outil et non sur le fichier : nous
 * offrons une commande que XCTrack n'a pas, et nous n'avons pas pu en vérifier l'effet.
 */
export function classChangeAdvice(tr: Translator): Advice {
  return { kind: 'class', text: tr.t('pages.classChangeUnverified') }
}

/** Ce qu'il faut dire de l'état courant d'une orientation, indépendamment de tout geste. */
export function layoutAdvice(pages: readonly Page[], tr: Translator): Advice[] {
  const advice: Advice[] = []

  const thermal = thermalAssistantRanks(pages)
  if (thermal.length > 1) {
    const others = thermal.slice(0, -1)
    advice.push({
      kind: 'thermal',
      // Deux nombres, un seul écrit : `count` accorde la dernière phrase sur les pages
      // AUTRES que la cible supposée, `total` est celui qui s'affiche.
      text: tr.t('pages.thermalMultiple', {
        count: others.length,
        total: thermal.length,
        ranks: thermal.join(', '),
        target: thermal[thermal.length - 1]!,
        others: others.join(', ')
      })
    })
  }

  if (pages.length > 0 && navigablePageCount(pages) === 0) {
    advice.push({ kind: 'visibility', text: tr.t('pages.allPagesWithoutNavigation') })
  }

  return advice
}

/* ---------------------------------------------------------------- l'application */

export interface PageOperationResult {
  /** Rang (0-based) à mettre en avant après l'opération, `undefined` si la liste est vide. */
  index: number | undefined
  /** La page retirée, pour une suppression : la réinsérer au même rang restitue le document. */
  removed?: JsonNode
}

/**
 * Applique l'opération au document vivant, par les seules primitives de
 * `model/mutations.ts` — donc sans jamais reconstruire un nœud : les clés que cet outil
 * ne comprend pas voyagent avec leur page, texte source compris.
 *
 * L'appelant enregistre ensuite le pas d'historique sous `describeOperation`.
 */
export function applyPageOperation(
  document: JsonNode, orientation: Orientation, operation: PageOperation
): PageOperationResult {
  const items = pagesNode(document, orientation).items

  switch (operation.kind) {
    case 'insert': {
      const at = insertPage(
        document, orientation, createPage(operation.className, NEW_PAGE_NAVIGATIONS), operation.index
      )
      return { index: at }
    }
    case 'duplicate': {
      const source = items[operation.index]
      if (source === undefined) {
        throw new Error(`duplicatePage : index ${operation.index} hors de [0, ${items.length - 1}]`)
      }
      // Juste après l'original, comme l'appareil dépose la copie à côté de la page tirée.
      const at = insertPage(document, orientation, duplicatePage(source), operation.index + 1)
      return { index: at }
    }
    case 'remove': {
      const removed = removePage(document, orientation, operation.index)
      const left = items.length
      // Le rang mis en avant reste le même : c'est la page suivante qui l'occupe désormais.
      return { index: left === 0 ? undefined : Math.min(operation.index, left - 1), removed }
    }
    case 'reorder': {
      const at = reorderPage(document, orientation, operation.from, operation.to)
      return { index: at }
    }
    case 'setClass': {
      const page = items[operation.index]
      if (page === undefined) {
        throw new Error(`setPageClass : index ${operation.index} hors de [0, ${items.length - 1}]`)
      }
      setPageClass(page, operation.className)
      return { index: operation.index }
    }
  }
}

/* ============================================================ le carrousel */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(className: string, text: string, label?: string): HTMLButtonElement {
  const node = el('button', className, text)
  node.type = 'button'
  if (label !== undefined) node.setAttribute('aria-label', label)
  return node
}

/**
 * Ce que la clé `navigations` dit de la page, en clair.
 *
 * Les trois formes disent maintenant la **même** chose — quand la page s'affiche — au
 * lieu de nommer un réglage : « Toutes les navigations » et « Aucune navigation » se
 * lisaient comme un compte de navigations, pas comme le sort de la page.
 *
 * La phrase est celle de l'appareil, mesurée sur l'AIR³ : sa boîte s'intitule « Choisir
 * les types de navigations pour lesquelles la page sera affichée »
 * (`docs/reference/edition-native-exploration.md` § 5.4). On ne va pas jusqu'à « jamais
 * affichée » pour `none` : ce que fait l'appareil hors navigation n'a pas été mesuré, et
 * l'affirmer ferait dire à l'outil plus qu'il ne sait.
 *
 * Ce qui a été mesuré depuis, et qui va dans le même sens : **au sol**, une page
 * `navigations: "none"` est la seule que le défilement saute, et il ne saute qu'elle
 * (`docs/reference/2026-08-22-essai-pilote.md` § 2). C'est cette phrase-ci que le pilote
 * d'essai a retrouvée juste, quand le badge « Masquée hors vol » posé à côté d'elle
 * disait le contraire — le badge est parti, elle est restée.
 */
export function navigationsLabel(page: Page, tr: Translator): string {
  const navigations = page.navigations
  if (navigations.kind === 'all') return tr.t('pages.shownForAllNavigations')
  if (navigations.kind === 'none') return tr.t('pages.shownForNoNavigation')
  if (navigations.classNames.length === 0) return tr.t('pages.shownForNoNavigation')
  return tr.t('pages.shownForNavigations', {
    // Une colonne de libellés, jointe par `', '` : `format.list` en ferait une phrase
    // — « … et Vers une balise » — là où l'appareil énumère un réglage.
    list: navigations.classNames
      .map((name) => {
        const short = shortClassName(name)
        const key = NAVIGATION_KEYS[short as keyof typeof NAVIGATION_KEYS]
        return key === undefined ? short : tr.t(key)
      })
      .join(', ')
  })
}

export interface PageManagerOptions {
  pages: readonly Page[]
  orientation: Orientation
  ctx: ViewContext
  /** Notre prose, dans la langue du pilote — voir `src/i18n/CLAUDE.md` § 5. */
  readonly tr: Translator
  /**
   * L'opération demandée, avec sa description prête pour l'historique. L'appelant mute le
   * document (`applyPageOperation`), enregistre le pas et reconstruit : ce module ne
   * garde aucun état entre deux rendus.
   */
  onOperation: (operation: PageOperation, description: string) => void
  /** Clic sur une vignette : ouvrir la page, comme l'appui simple de l'appareil. */
  onOpen?: (index: number) => void
  /** Changer la classe après création — offert par défaut, voir `classChangeAdvice`. */
  allowClassChange?: boolean
}

export interface PageManager {
  root: HTMLElement
  /** Pousse un message dans la zone d'annonce — pour l'appelant qui vient de reconstruire. */
  announce(message: string): void
}

function adviceList(advice: readonly Advice[], className = 'pages__advice'): HTMLElement {
  const list = el('ul', className)
  for (const item of advice) {
    const entry = el('li', `pages__advice-item pages__advice-item--${item.kind}`, item.text)
    list.append(entry)
  }
  return list
}

/**
 * Le carrousel des pages d'une orientation : une colonne par page, un point d'insertion
 * entre chacune et aux deux extrémités.
 *
 * Rien n'est mémorisé d'un rendu à l'autre : l'appelant reconstruit après chaque
 * opération. La confirmation de suppression, elle, ne vit que le temps d'un rendu — un
 * bouton laissé en attente de confirmation redevient inoffensif dès que la liste change.
 */
export function renderPageManager(options: PageManagerOptions): PageManager {
  const { pages, orientation, ctx, tr } = options
  const allowClassChange = options.allowClassChange !== false

  const root = el('section', `pages pages--${orientation}`)
  root.setAttribute('aria-label', tr.t('pages.regionLabel', {
    orientation: orientationInline(tr, orientation)
  }))

  const live = el('p', 'pages__live')
  live.setAttribute('aria-live', 'polite')

  const announce = (message: string): void => { live.textContent = message }

  const request = (operation: PageOperation): void => {
    const description = describeOperation(pages, operation, orientation, tr)
    announce(operationAnnouncement(pages, operation, orientation, tr))
    options.onOperation(operation, description)
  }

  /* --- en-tête : ce que l'orientation compte, et ce qu'elle implique --- */
  const heading = el('h2', 'pages__title')
  heading.append(
    el('span', 'pages__name', orientation === 'landscape'
      ? tr.t('pages.landscape')
      : tr.t('pages.portrait')),
    el('span', 'pages__count', pages.length === 0
      ? tr.t('pages.noPage')
      : tr.t('pages.pageCount', { count: pages.length }))
  )
  root.append(heading)

  const standing = layoutAdvice(pages, tr)
  if (allowClassChange) standing.push(classChangeAdvice(tr))
  if (standing.length > 0) root.append(adviceList(standing))

  /* --- le rail : points d'insertion et vignettes en alternance --- */
  const rail = el('ol', 'pages__rail')

  const insertionPoint = (at: number): HTMLElement => {
    const slot = el('li', 'pages__gap')
    slot.dataset.at = String(at)

    const opener = button(
      'pages__insert', '+',
      at === pages.length
        ? tr.t('pages.insertAtEnd', { rank: at + 1 })
        : tr.t('pages.insertAtRank', { rank: at + 1 })
    )
    const choice = el('div', 'pages__choice')
    choice.hidden = true

    opener.setAttribute('aria-expanded', 'false')
    opener.addEventListener('click', () => {
      const open = choice.hidden
      choice.hidden = !open
      opener.setAttribute('aria-expanded', String(open))
    })

    choice.append(el('p', 'pages__choice-title', tr.t('pages.newPageAtRank', { rank: at + 1 })))
    const list = el('ul', 'pages__choice-list')
    for (const entry of PAGE_CHOICES) {
      const item = el('li')
      const pick = button('pages__choice-item', '')
      pick.append(
        el('span', 'pages__choice-label', entry.label),
        el('span', 'pages__choice-note', entry.description)
      )
      pick.addEventListener('click', () => {
        request({ kind: 'insert', index: at, className: entry.className })
      })
      item.append(pick)
      list.append(item)
    }
    choice.append(list)

    // Ce que l'insertion à CE rang entraîne, quelle que soit la classe choisie : le
    // décalage se lit avant le clic, pas après.
    const shift = operationAdvice(pages, {
      kind: 'insert', index: at, className: 'WPEmpty'
    }, tr).filter((item) => item.kind === 'shift')
    if (shift.length > 0) choice.append(adviceList(shift, 'pages__choice-advice'))

    const thermal = operationAdvice(pages, {
      kind: 'insert', index: at, className: THERMAL_ASSISTANT_CLASS
    }, tr).filter((item) => item.kind === 'thermal')
    if (thermal.length > 0) choice.append(adviceList(thermal, 'pages__choice-advice'))

    slot.append(opener, choice)
    return slot
  }

  const pageSlot = (page: Page, index: number): HTMLElement => {
    const kind = pageKind(page.className, tr)
    const slot = el('li', 'pages__slot')
    slot.dataset.index = String(index)
    slot.draggable = true

    const card = el('article', 'pagecard')
    // Le filet ambre marque la seule page dont on sache l'appareil qu'il la saute : celle
    // qu'aucune navigation n'affiche. Il accompagne donc `pagecard__nav`, quelques lignes
    // plus bas, et ne peut plus le contredire.
    if (isShownForNoNavigation(page)) card.classList.add('pagecard--conditional')

    const head = el('div', 'pagecard__head')
    head.append(
      el('span', 'pagecard__rank', String(index + 1)),
      el('span', 'pagecard__label', kind.label)
    )
    card.append(head)

    const screen = button(
      'pagecard__screen', '',
      tr.t('pages.openPage', {
        rank: index + 1,
        kind: kind.label,
        tally: tr.t('common.widgetCount', { count: page.widgets.length })
      })
    )
    screen.append(renderPage(page, aspectRatioOf(ctx.device, orientation), ctx.settings, ctx.language))
    if (options.onOpen) screen.addEventListener('click', () => options.onOpen?.(index))
    else screen.disabled = true
    card.append(screen)

    const meta = el('div', 'pagecard__meta')
    meta.append(
      el('span', 'pagecard__class', kind.shortName),
      el('span', 'pagecard__widgets', tr.t('common.widgetCount', { count: page.widgets.length }))
    )
    card.append(meta)
    card.append(el('p', 'pagecard__nav', navigationsLabel(page, tr)))

    // La cible du basculement automatique se dit sur la page concernée, là où le pilote
    // la cherche — et non seulement dans le bandeau du haut.
    if (shortClassName(page.className) === THERMAL_ASSISTANT_CLASS) {
      const target = autoSwitchTargetRank(pages)
      card.append(el(
        'p', 'pagecard__thermal',
        target === index + 1
          ? tr.t('pages.autoSwitchTargetHere')
          : tr.t('pages.autoSwitchTargetElsewhere', { rank: target ?? index + 1 })
      ))
    }

    /* --- les commandes de rang --- */
    const ops = el('div', 'pagecard__ops')

    const left = button(
      'btn btn--ghost pagecard__move', '◀', tr.t('pages.moveBack', { rank: index + 1 })
    )
    left.disabled = index === 0
    left.addEventListener('click', () => request({ kind: 'reorder', from: index, to: index - 1 }))

    const right = button(
      'btn btn--ghost pagecard__move', '▶', tr.t('pages.moveForward', { rank: index + 1 })
    )
    right.disabled = index >= pages.length - 1
    right.addEventListener('click', () => request({ kind: 'reorder', from: index, to: index + 1 }))

    const copy = button(
      'btn pagecard__duplicate', tr.t('pages.duplicate'),
      tr.t('pages.duplicatePage', { rank: index + 1 })
    )
    copy.addEventListener('click', () => request({ kind: 'duplicate', index }))

    ops.append(left, right, copy)

    /* --- la suppression, en deux temps : la conséquence d'abord --- */
    const removal = el('div', 'pagecard__removal')
    const remove = button(
      'btn pagecard__remove', tr.t('pages.remove'),
      tr.t('pages.removePage', { rank: index + 1 })
    )
    const consequences = adviceList(
      operationAdvice(pages, { kind: 'remove', index }, tr), 'pagecard__consequences'
    )
    consequences.hidden = true

    let armed = false
    const disarm = (): void => {
      armed = false
      remove.textContent = tr.t('pages.remove')
      remove.classList.remove('pagecard__remove--armed')
      consequences.hidden = true
    }
    remove.addEventListener('click', () => {
      if (!armed) {
        armed = true
        remove.textContent = tr.t('pages.confirmRemoval')
        remove.classList.add('pagecard__remove--armed')
        consequences.hidden = false
        return
      }
      disarm()
      request({ kind: 'remove', index })
    })
    remove.addEventListener('blur', disarm)
    remove.addEventListener('keydown', (event) => { if (event.key === 'Escape') disarm() })
    removal.append(remove, consequences)
    ops.append(removal)
    card.append(ops)

    /* --- la classe, que l'appareil ne sait pas changer --- */
    if (allowClassChange) {
      const field = el('div', 'pagecard__class-field')
      const select = el('select', 'pagecard__class-select')
      select.id = `page-class-${orientation}-${index}`
      const label = el('label', 'pagecard__class-label', tr.t('pages.pageTypeLabel'))
      label.htmlFor = select.id

      const known = PAGE_CHOICES.some((choice) => choice.className === kind.shortName)
      if (!known) {
        // Une classe qu'aucune version connue ne documente reste proposée telle quelle :
        // la choisir de nouveau ne change rien, mais la faire disparaître de la liste
        // ferait croire à une page d'un des quatre types.
        const current = el(
          'option', undefined, tr.t('pages.typeFromFile', { type: kind.shortName })
        )
        current.value = kind.shortName
        select.append(current)
      }
      for (const choice of PAGE_CHOICES) {
        const option = el('option', undefined, choice.label)
        option.value = choice.className
        select.append(option)
      }
      select.value = kind.shortName
      select.addEventListener('change', () => {
        if (select.value === kind.shortName) return
        request({ kind: 'setClass', index, className: select.value })
      })
      field.append(label, select)
      card.append(field)
    }

    slot.append(card)

    /* --- glisser-déposer, comme l'appui maintenu de l'appareil (§ 5.3) --- */
    slot.addEventListener('dragstart', (event) => {
      slot.classList.add('pages__slot--dragged')
      const transfer = (event as DragEvent).dataTransfer
      transfer?.setData('text/plain', String(index))
      if (transfer) transfer.effectAllowed = 'move'
    })
    slot.addEventListener('dragend', () => slot.classList.remove('pages__slot--dragged'))
    slot.addEventListener('dragover', (event) => {
      event.preventDefault()
      slot.classList.add('pages__slot--over')
    })
    slot.addEventListener('dragleave', () => slot.classList.remove('pages__slot--over'))
    slot.addEventListener('drop', (event) => {
      event.preventDefault()
      slot.classList.remove('pages__slot--over')
      const raw = (event as DragEvent).dataTransfer?.getData('text/plain')
      const from = Number(raw)
      if (raw === undefined || raw === '' || !Number.isInteger(from) || from === index) return
      request({ kind: 'reorder', from, to: index })
    })

    return slot
  }

  rail.append(insertionPoint(0))
  pages.forEach((page, index) => {
    rail.append(pageSlot(page, index))
    rail.append(insertionPoint(index + 1))
  })
  root.append(rail)

  if (pages.length === 0) {
    root.append(el('p', 'pages__empty', tr.t('pages.emptyOrientation')))
  }

  root.append(live)
  return { root, announce }
}
