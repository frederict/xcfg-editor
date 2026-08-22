import { navigationLabel } from '../catalog/navigationLabels'
import { pageClassLabel } from '../catalog/widgetNames'
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
  setPageNavigations,
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
 * - **la suppression dit ce qu'elle emporte, et par où revenir**. L'appareil supprime au
 *   premier appui, sans rien dire, et **sans retour**. Ici le geste part au premier clic
 *   lui aussi, mais l'outil énonce aussitôt ce qui vient de partir — le rang, le nombre
 *   de gadgets, le décalage des pages suivantes, la navigation qu'il ne reste plus — et
 *   il nomme le remède : « Annuler » revient sur ce geste (`model/history.ts`).
 *
 *   ⚠️ **Ce paragraphe disait le contraire jusqu'au 2026-08-22, et la mesure l'a démenti.**
 *   Le bouton passait d'abord à « Confirmer la suppression » ; la feuille de style
 *   affirmait qu'ainsi armé, « un second clic distrait est impossible ». Le second clic
 *   tombe pourtant sur le **même bouton, aux mêmes pixels** : rien n'arrête une main qui
 *   clique deux fois. Un pilote-testeur a supprimé une page de vingt gadgets et l'a
 *   rapporté comme « un clic, sans aucune confirmation » — la confirmation existait, il
 *   ne l'a jamais vue. Elle coûtait donc l'attention d'un panneau sans en rendre la
 *   protection, sur un geste que « Annuler » reprend.
 *
 *   La règle de l'outil, désormais, ne suit plus le dégât apparent mais **le retour** :
 *   ce qu'« Annuler » reprend se fait d'un clic et **se dit** à l'instant ; ce que rien
 *   ne reprend — vider la bibliothèque, en retirer une configuration, déposer un fichier
 *   par-dessus un travail non enregistré — demande **avant**, dans un panneau qui chiffre
 *   ce qu'il coûte. Une confirmation de plus sur un geste réversible use l'attention
 *   qu'il faut garder pour ceux qui ne le sont pas.
 *
 *   Corollaire assumé : « Dupliquer » et « Supprimer » portent la **même** pastille, et
 *   c'est juste — le même clic sur « Annuler » les reprend tous les deux. Ce qui les
 *   distingue est écrit, pas peint ;
 * - **la classe reste modifiable après création**. XCTrack ne le propose sur aucun de
 *   ses écrans (§ 5.2) ; ce n'est pourtant qu'une clé du fichier, et le refuser serait
 *   contraindre l'éditeur à une limite de l'appareil. C'est donc offert, mais **dit** :
 *   la conséquence côté XCTrack n'a pas été vérifiée sur l'appareil, et l'avertissement
 *   correspondant s'affiche en permanence dès que la commande est active. L'appelant
 *   peut s'en tenir au comportement de l'appareil avec `allowClassChange: false` ;
 * - **les commandes de rang doublent le glisser-déposer**. « ◀ » et « ▶ » font le même
 *   travail au clavier, ce qu'un glisser-déposer ne fait pas.
 *
 * **Un seul geste écrit `navigations`, et un seul :** rouvrir une page que rien n'appelle,
 * en l'activant pour **toutes** les navigations. C'est la valeur `"all"`, celle que XCTrack
 * écrit lui-même quand les cinq icônes de sa boîte sont actives (§ 5.4) et celle qu'il pose
 * sur une page neuve (§ 5.2) : on n'invente donc rien. Ce qui n'est **pas** offert, et ne
 * doit pas l'être tant que la boîte des cinq icônes n'est pas reproduite : choisir
 * *lesquelles*, et désactiver une page — l'outil répare, il ne casse pas.
 *
 * Le carrousel n'est pas le bon endroit pour l'apprendre, seulement pour le faire : c'est
 * la page **ouverte en édition** qui dit pourquoi elle ne s'affichera pas
 * (`model/reachability.ts`, `views.ts`). Un pilote d'essai a posé un gadget sur une page
 * morte sans être prévenu, le 22 août 2026, parce que le constat ne vivait que dans une
 * liste repliée de la vue d'ensemble et dans cette fenêtre-ci.
 */

/* ======================================================== le modèle des opérations */

/**
 * Une page neuve est activée pour toutes les navigations, comme sur l'appareil (§ 5.2) —
 * et c'est la même valeur que le geste de réouverture écrit sur une page existante.
 */
const ALL_NAVIGATIONS = { kind: 'all' } as const

/**
 * La classe dont XCTrack fait la cible de son basculement automatique en spirale —
 * relevé sur l'instrument (`edition-native-exploration.md` § 5.4). Ce qui est documenté
 * s'arrête là : la classe est la cible. Le départage entre plusieurs pages de cette
 * classe, lui, n'est qu'une supposition — voir `autoSwitchTargetRank`.
 */
export const THERMAL_ASSISTANT_CLASS = 'WPThermalAssistant'

/**
 * Les quatre entrées de « Choisissez une nouvelle page », **dans l'ordre de l'appareil**
 * (§ 5.2) — un pilote qui a vu cet écran doit retrouver la même liste.
 *
 * Ne restent ici que les quatre noms de classe. Ce que la liste affiche se compose de
 * deux textes qui ne suivent **pas le même axe de langue** (`src/i18n/axes.ts`) :
 *
 * | À l'écran | Axe | D'où il vient |
 * |---|---|---|
 * | le **titre** — *Aide thermique*, *Thermal Assistant*, … | `labels` | `pageClassLabel`, c'est-à-dire `src/catalog/widgetLabels.json`, relevé sous `wpThermalAssistantTitle` et ses trois voisines |
 * | la **note** en dessous | `ui` | `pageKind(…, tr).note` — notre prose, dans la langue du pilote |
 *
 * ⚠️ **Le titre ne se traduit pas dans nos catalogues.** Jusqu'au 2026-08-22, ces quatre
 * mots étaient écrits en dur, en français, dans ce fichier : un pilote belge dont l'AIR³
 * est en anglais lisait « Aide thermique » là où son instrument dit *Thermal Assistant*.
 * Ils suivent maintenant la langue du fichier ouvert, comme les noms de gadgets que
 * `renderPage` dessine depuis toujours.
 *
 * La note, elle, est bien la nôtre, et le reste : elle dit ce que la classe **fait** — le
 * jeu de gadgets posé à la création, et pour l'assistant de thermique le fait d'être la
 * cible du basculement automatique. Elle ne dit rien du moment où l'appareil montre la
 * page : c'est la clé `navigations` qui en décide, mesuré le 22 août 2026.
 */
export const PAGE_CHOICES: readonly string[] = [
  'WPThermalAssistant',
  'WPXCAssistant',
  'WPCompetition',
  'WPEmpty'
]

export type PageOperation =
  | { kind: 'insert'; index: number; className: string }
  | { kind: 'duplicate'; index: number }
  | { kind: 'remove'; index: number }
  | { kind: 'reorder'; from: number; to: number }
  | { kind: 'setClass'; index: number; className: string }
  /**
   * Rouvrir une page que rien n'appelle : `navigations` passe à `"all"`. La seule
   * opération de ce module qui ne touche ni au rang, ni au nombre de pages — elle ne
   * décale donc rien, et `operationAdvice` n'a rien à en dire de plus que ce que la page
   * ouverte dit déjà.
   */
  | { kind: 'enableAllNavigations'; index: number }

/** Le nom court d'une classe de page : `…wp.WPEmpty` → `WPEmpty`. */
export function shortClassName(className: string): string {
  return className.split('.').pop() ?? ''
}

/**
 * Le libellé de création d'une classe de page — celui de l'appareil, dans la langue du
 * **fichier ouvert**, sinon le nom court tel qu'il y est écrit.
 *
 * `labels` est la langue de l'axe des libellés (`ViewContext.language`, `session.language`,
 * à défaut celle du navigateur). Le passer est obligatoire : c'est ce qui empêche qu'un
 * appelant retombe sans le vouloir sur la langue de notre interface.
 */
export function creationLabel(className: string, labels: string): string {
  return pageClassLabel(shortClassName(className), labels)
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
 *
 * ⚠️ **Deux langues entrent ici, et elles sont indépendantes.** La phrase est de notre
 * prose (`tr`, langue du pilote) ; le **type de page** qu'elle cite entre guillemets est
 * un mot de XCTrack (`labels`, langue du fichier ouvert). « Insérer une page “Thermal
 * Assistant” au rang 3 (paysage) » est la forme juste pour un pilote francophone dont
 * l'appareil est en anglais : il retrouve dans l'historique le mot qu'il a lu sur son
 * instrument. Voir `src/i18n/axes.ts`.
 */
export function describeOperation(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation, tr: Translator,
  labels: string
): string {
  const where = orientationInline(tr, orientation)
  switch (operation.kind) {
    case 'insert':
      return tr.t('pages.describeInsert', {
        type: creationLabel(operation.className, labels),
        rank: operation.index + 1,
        orientation: where
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
    case 'enableAllNavigations':
      return tr.t('pages.describeEnableNavigations', {
        rank: operation.index + 1, orientation: where
      })
    case 'setClass':
      return tr.t('pages.describeSetClass', {
        rank: operation.index + 1,
        before: creationLabel(pages[operation.index]?.className ?? '', labels),
        after: creationLabel(operation.className, labels),
        orientation: where
      })
  }
}

/**
 * Ce que l'interface annonce une fois l'opération faite, `pages` étant l'état d'AVANT.
 *
 * ⚠️ **C'est ici que se paie le clic unique.** Aucune de ces opérations ne demande de
 * confirmation, parce que « Annuler » les reprend toutes ; en échange, l'annonce doit
 * porter tout ce que le pilote aurait lu dans un panneau : ce qui vient d'être fait, ce
 * qu'il en coûte, et **par où revenir**. La dernière phrase est donc la même pour les six
 * opérations — un remède qu'on ne nomme qu'une fois sur deux n'est pas un remède.
 *
 * Une suppression y ajoute deux choses que le pilote ne peut plus lire une fois la
 * vignette disparue : **combien de gadgets sont partis avec la page**, et les
 * conséquences complètes du retrait (décalage des rangs, plus aucune page navigable,
 * basculement de thermique). Elles vivaient jusqu'au 2026-08-22 sous le bouton armé,
 * c'est-à-dire dans un état qu'un pilote-testeur n'a jamais vu passer.
 */
export function operationAnnouncement(
  pages: readonly Page[], operation: PageOperation, orientation: Orientation, tr: Translator,
  labels: string
): string {
  const done = describeOperation(pages, operation, orientation, tr, labels)

  // Des phrases entières mises bout à bout, jamais des fragments : chacune est traduite
  // telle quelle, et l'ordre des mots à l'intérieur appartient à sa langue.
  const said: string[] = []
  if (operation.kind === 'remove') {
    const page = pages[operation.index]
    if (page !== undefined) {
      said.push(tr.t('pages.removalTally', { count: page.widgets.length }))
    }
    said.push(...operationAdvice(pages, operation, tr).map((item) => item.text))
  } else {
    const shift = shiftAdvice(pages, operation, tr)
    if (shift !== undefined) said.push(shift.text)
  }
  said.push(tr.t('pages.undoRestores'))

  return tr.t('pages.announcementWithAdvice', { done, advice: said.join(' ') })
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
        document, orientation, createPage(operation.className, ALL_NAVIGATIONS), operation.index
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
    case 'enableAllNavigations': {
      const page = items[operation.index]
      if (page === undefined) {
        throw new Error(
          `setPageNavigations : index ${operation.index} hors de [0, ${items.length - 1}]`
        )
      }
      setPageNavigations(page, ALL_NAVIGATIONS)
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
 *
 * ⚠️ **La phrase est de nous, les cinq noms de navigation sont de XCTrack.** Ils suivent
 * donc `labels`, la langue du fichier ouvert, et se lisent dans `navigationLabels.json`.
 * Ils furent, jusqu'au 2026-08-22, de notre prose traduite en cinq langues — et quatre des
 * cinq ne disaient pas ce que l'appareil dit : *Fermeture de triangle* pour « Triangle
 * achevant », *Vers une balise* pour « Balises/Navigation XC », *Compétition* pour
 * « Manche de compétition », *Vers un pilote en direct* pour « Pilote Live ». Le pilote
 * cherchait dans cet outil un réglage qu'il ne pouvait pas reconnaître.
 *
 * Une navigation qu'aucune version relevée ne documente reste affichée sous son nom court,
 * plutôt que de disparaître de la liste.
 */
export function navigationsLabel(page: Page, tr: Translator, labels: string): string {
  const navigations = page.navigations
  if (navigations.kind === 'all') return tr.t('pages.shownForAllNavigations')
  if (navigations.kind === 'none') return tr.t('pages.shownForNoNavigation')
  if (navigations.classNames.length === 0) return tr.t('pages.shownForNoNavigation')
  return tr.t('pages.shownForNavigations', {
    // Une colonne de libellés, jointe par `', '` : `format.list` en ferait une phrase
    // — « … et Balises/Navigation XC » — là où l'appareil énumère un réglage.
    list: navigations.classNames
      .map((name) => navigationLabel(shortClassName(name), labels))
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
   * document (`applyPageOperation`), enregistre le pas et reconstruit : ce module ne garde
   * aucun état entre deux rendus, hormis `REPEAT_GUARD_MS`.
   */
  onOperation: (operation: PageOperation, description: string) => void
  /** Clic sur une vignette : ouvrir la page, comme l'appui simple de l'appareil. */
  onOpen?: (index: number) => void
  /**
   * Le remède, **là où se lit la phrase qui le nomme**.
   *
   * ⚠️ **Sans lui, `pages.undoRestores` désignait un bouton hors de portée**, et c'est
   * mesuré : cette boîte s'ouvre par `dialog.showModal()`, qui rend inerte tout ce qui est
   * hors d'elle — la barre de tête et son « Annuler » compris — et `main.ts` coupe
   * explicitement Ctrl+Z dès qu'une modale est ouverte. Le seul chemin vers le remède
   * était donc de refermer la boîte, c'est-à-dire de quitter l'écran où on venait de lire
   * qu'il existait. Le pilote d'essai nº 5 a supprimé une page de vingt gadgets sans
   * savoir qu'elle revenait ; lui dire où aller ne suffisait pas, il fallait le mettre à
   * portée de main.
   *
   * L'appelant annule un pas d'historique et **réannonce** ce qu'il vient de défaire :
   * voir `announce`, dont le second argument décide si ce bouton reparaît. Il ne reparaît
   * pas après une annulation — le pas précédent appartient à un geste que cette boîte n'a
   * pas annoncé, et un « Annuler » qui remonterait un cran de plus sans le dire serait la
   * surprise même contre laquelle Ctrl+Z est coupé sous modale.
   */
  onUndo?: () => void
  /** Changer la classe après création — offert par défaut, voir `classChangeAdvice`. */
  allowClassChange?: boolean
  /**
   * L'horloge du garde-fou du coup double (`REPEAT_GUARD_MS`). Injectable pour les tests
   * seulement : l'application ne la passe pas et lit `Date.now`.
   */
  now?: () => number
}

/**
 * Le seul état que ce module garde entre deux rendus, et il faut dire pourquoi.
 *
 * Depuis que la suppression part au premier clic, l'appelant reconstruit le carrousel
 * **dans la foulée du clic** : la carte suivante vient alors occuper les pixels de celle
 * qui part, son bouton « Supprimer » compris. Le second coup d'un double-clic tombe donc
 * sur un bouton neuf, à la même place, et emporterait une **deuxième** page — dont une
 * seule serait annoncée, et qui demanderait deux annulations. Le second coup est avalé.
 *
 * ⚠️ 500 ms est un **choix, pas une mesure** : aucun double-clic n'a été chronométré ici.
 * Le seuil est plus long que le réglage d'usine des systèmes visés pour couvrir aussi le
 * clic répété d'impatience — celui qui a fait croire à un pilote-testeur que la page était
 * partie sans confirmation, alors qu'il venait d'armer puis de confirmer sans le voir. Une
 * suppression volontairement répétée coûte une demi-seconde d'attente, ce qui est le bon
 * sens du marché.
 *
 * Seule la suppression est gardée : deux duplications ou deux déplacements se voient et se
 * défont ; deux pages disparues, non.
 */
export const REPEAT_GUARD_MS = 500

let lastRemovalAt: number | undefined

/** Remet le garde-fou à zéro — pour les tests, qui enchaînent des carrousels neufs. */
export function resetRemovalGuard(): void {
  lastRemovalAt = undefined
}

export interface PageManager {
  root: HTMLElement
  /**
   * Pousse un message dans la zone d'annonce — pour l'appelant qui vient de reconstruire.
   *
   * `undoable` pose **avec** le message le bouton du remède (`onUndo`). Il vaut vrai pour
   * les six opérations du carrousel, qu'« Annuler » reprend toutes, et faux pour ce que
   * l'appelant dit d'autre — au premier chef l'annulation elle-même.
   */
  announce(message: string, undoable?: boolean): void
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
 * opération, et aucun bouton ne garde d'état entre deux clics — il n'y a plus rien à
 * armer depuis que le retrait se fait d'un clic et se dit dans l'annonce. La seule
 * exception, et elle est là pour cette raison même, est le garde-fou du coup double
 * (`REPEAT_GUARD_MS`), qui doit justement survivre à la reconstruction.
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

  // Le texte est un nœud à part, et le bouton vit DANS le paragraphe vivant : la synthèse
  // vocale annonce alors la phrase et le remède d'un seul tenant, ce qui est exactement ce
  // qu'un pilote qui ne voit pas l'écran a besoin d'entendre. Un `textContent =` sur le
  // paragraphe emporterait le bouton à chaque annonce ; d'où le nœud de texte.
  const said = document.createTextNode('')
  const undo = el('button', 'btn pages__undo', tr.t('pages.undoNow'))
  undo.type = 'button'
  undo.hidden = true
  undo.addEventListener('click', () => { options.onUndo?.() })
  live.append(said, undo)

  const announce = (message: string, undoable = false): void => {
    said.data = message
    undo.hidden = !undoable || options.onUndo === undefined
  }

  const request = (operation: PageOperation): void => {
    const description = describeOperation(pages, operation, orientation, tr, ctx.language)
    announce(operationAnnouncement(pages, operation, orientation, tr, ctx.language), true)
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

  /*
   * ⚠️ **L'annonce vient AVANT le rail, et c'est une mesure qui l'y a mise.** Elle fermait
   * la section jusqu'au 2026-08-22 ; relevé en 1024 × 640 sur `2025-07-07_backup-00.xcfg`,
   * après la suppression de la page 5 en paysage : le rail fait 750,0 px de haut, la zone
   * d'annonce tombait à 1017,6 px du haut de la fenêtre et son bouton de remède à 1035,6 —
   * `elementFromPoint` rendait `null`, c'est-à-dire hors de la fenêtre. Et l'appelant
   * reconstruit la boîte entière après chaque opération (`fillPagesDialog`), ce qui remet
   * le défilement à zéro : le pilote qui avait descendu jusqu'à la page 5 était ramené en
   * haut, loin de la phrase qui venait de dire ce qu'il avait perdu.
   *
   * Ici, elle est à 254,8 px — sous les yeux, avec son remède, à l'endroit exact où la
   * reconstruction vient de reposer le regard.
   */
  root.append(live)

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
    for (const className of PAGE_CHOICES) {
      const item = el('li')
      const pick = button('pages__choice-item', '')
      pick.append(
        // Le titre est celui de l'appareil (axe `labels`), la note est la nôtre (axe
        // `ui`) : les deux se lisent l'une sous l'autre sans jamais se mélanger.
        el('span', 'pages__choice-label', pageClassLabel(className, ctx.language)),
        el('span', 'pages__choice-note', pageKind(className, tr).note)
      )
      pick.addEventListener('click', () => {
        request({ kind: 'insert', index: at, className })
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
    screen.append(renderPage(page, aspectRatioOf(ctx.device, orientation), ctx.settings, ctx.language, tr))
    if (options.onOpen) screen.addEventListener('click', () => options.onOpen?.(index))
    else screen.disabled = true
    card.append(screen)

    // ⚠️ Le nom de classe du fichier (`WPEmpty`…) n'est plus ici depuis le 2026-08-22 :
    // répété sous chacune des neuf vignettes, il doublait « {kind.label} » sans rien
    // ajouter, et un pilote-testeur l'a cité en tête des mots qui ne sont pas les siens.
    // Il reste là où il sert — la vue de détail d'une page ouverte — et le sélecteur de
    // type, plus bas sur cette carte, parle déjà les mots de XCTrack (`pageClassLabel`).
    const meta = el('div', 'pagecard__meta')
    meta.append(
      el('span', 'pagecard__widgets', tr.t('common.widgetCount', { count: page.widgets.length }))
    )
    card.append(meta)
    card.append(el('p', 'pagecard__nav', navigationsLabel(page, tr, ctx.language)))

    /*
     * Le geste qui rouvre la page, juste sous la ligne qui dit qu'elle est fermée. Il
     * n'apparaît que là où il sert, et il n'a pas de contraire : cet éditeur ne propose
     * nulle part de désactiver une page. Le pilote qui le veut a la boîte des cinq icônes
     * sur son instrument, avec le choix fin que nous n'avons pas.
     */
    if (isShownForNoNavigation(page)) {
      const enable = button(
        'btn pagecard__enable', tr.t('pages.enableAllNavigations'),
        tr.t('pages.enableAllNavigationsFor', { rank: index + 1 })
      )
      enable.addEventListener('click', () => request({ kind: 'enableAllNavigations', index }))
      card.append(enable)
    }

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

    /*
     * La suppression : un clic, comme « Dupliquer » à sa gauche, et pour la même raison —
     * « Annuler » reprend l'une comme l'autre. Ce qui part, ce qui se décale et par où
     * revenir s'écrit dans l'annonce, en toutes lettres (`operationAnnouncement`).
     *
     * Le bouton garde sa ligne à lui : la carte est étroite, et « Supprimer » posé au bout
     * de la rangée des flèches se retrouverait sous le pouce qui vise « ▶ ».
     */
    const removal = el('div', 'pagecard__removal')
    const remove = button(
      'btn pagecard__remove', tr.t('pages.remove'),
      tr.t('pages.removePage', { rank: index + 1 })
    )
    remove.addEventListener('click', () => {
      const now = (options.now ?? Date.now)()
      if (lastRemovalAt !== undefined && now - lastRemovalAt < REPEAT_GUARD_MS) return
      lastRemovalAt = now
      request({ kind: 'remove', index })
    })
    removal.append(remove)
    ops.append(removal)
    card.append(ops)

    /* --- la classe, que l'appareil ne sait pas changer --- */
    if (allowClassChange) {
      const field = el('div', 'pagecard__class-field')
      const select = el('select', 'pagecard__class-select')
      select.id = `page-class-${orientation}-${index}`
      const label = el('label', 'pagecard__class-label', tr.t('pages.pageTypeLabel'))
      label.htmlFor = select.id

      const known = PAGE_CHOICES.includes(kind.shortName)
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
      for (const className of PAGE_CHOICES) {
        const option = el('option', undefined, pageClassLabel(className, ctx.language))
        option.value = className
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

  return { root, announce }
}
