import type { JsonNode } from '../core/jsonDocument'
import { decode, getMember, readString } from '../core/access'
import type { Translator } from '../i18n'
import type { Page } from './layout'
import type { Orientation } from './mutations'

/**
 * Pourquoi une page ne s'affichera jamais sur l'instrument — et, quand il en existe un,
 * quel geste la rouvre.
 *
 * ## Ce module existe parce que « inatteignable » n'est pas une seule chose
 *
 * Le contrôle avant vol savait déjà dire qu'une page ne servirait à rien
 * (`inspection.ts`, règle 2), et le disait dans la vue d'ensemble. Un pilote d'essai a
 * posé un gadget sur une de ces pages **sans être prévenu**, le 22 août 2026 : l'écran où
 * il travaillait était le seul à se taire. Le constat devait donc descendre sur la page
 * ouverte — et, une fois là, il ne pouvait plus se contenter de dire « jamais » : sur
 * l'écran où l'on agit, la question suivante est « pourquoi celle-ci ? », et la réponse
 * commande le remède.
 *
 * Or les raisons relevées ne sont pas de même nature, et **deux d'entre elles ne se
 * réparent pas du même côté** :
 *
 * | Raison | Ce que le fichier écrit | Où se répare-t-elle |
 * |---|---|---|
 * | `noNavigation` | `navigations: "none"` sur la page | sur la page — cet éditeur sait le faire |
 * | `emptyNavigationList` | `navigations: []` sur la page | sur la page — même écriture |
 * | `screenHeldElsewhere` | `Display.Orientation` dans les réglages généraux | **ailleurs** : c'est un réglage de tout l'instrument |
 *
 * Écrire `navigations` pour réparer une orientation tenue serait un remède qui ne touche
 * pas la cause ; basculer `Display.Orientation` pour rouvrir une page ferait pivoter
 * l'écran entier de l'appareil. D'où deux traitements distincts, et un seul geste offert.
 *
 * ## Ce qui est mesuré, ce qui est déduit, ce qui n'a pas été vu
 *
 * - **Mesuré.** `navigations: "none"` est la seule page que le défilement saute, au sol,
 *   sur un AIR³ 7.2 — six pages importées, huit appuis, cinq pages revenant en boucle
 *   (`docs/reference/2026-08-22-essai-pilote.md` § 2). Et `"all"` est la valeur qu'écrit
 *   XCTrack quand les cinq navigations sont actives : désactiver une icône a transformé
 *   `"all"` en la liste des quatre autres (`edition-native-exploration.md` § 5.4).
 * - **Déduit.** Une liste vide n'appelle aucune navigation, donc personne n'appelle la
 *   page. C'est la lecture littérale du § 5.4 — « sinon la liste explicite des classes
 *   restantes » —, et aucun des 21 fichiers du corpus n'en porte : l'appareil n'a jamais
 *   été observé dans cet état.
 * - **Constaté une fois, jamais isolé.** Les trois pages portrait du propriétaire
 *   n'ont jamais été affichées, l'AIR³ étant resté sur `Display.Orientation = LANDSCAPE`
 *   (`docs/reference/2026-08-21-validation-bout-en-bout.md` § 8.9). Personne n'a basculé
 *   le réglage pour voir les pages revenir : c'est une observation, pas une expérience.
 *   L'éditeur le dit donc, et n'y touche pas.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne juge pas. Une page désactivée peut l'être **volontairement** — c'est le cas de la
 * page de compétition du propriétaire, gardée prête entre deux manches. Le texte le dit
 * en toutes lettres, et le geste est offert, jamais appliqué.
 */

/* ------------------------------------------------ la clé qui tient l'écran */

/**
 * Le réglage général qui fixe l'orientation de l'écran de l'appareil. Relevé dans l'APK
 * 1.0.3-beta5 : énumération de cinq valeurs, écran « Affichage », libellé
 * `prefDisplayOrientation`. Voir `src/catalog/preferenceCatalog/base.json`.
 */
export const SCREEN_ORIENTATION_KEY = 'Display.Orientation'

/**
 * Les valeurs de `Display.Orientation` qui **tiennent** l'écran dans une orientation, et
 * laquelle. `SENSOR` n'y figure pas, et c'est tout l'intérêt de la table : l'appareil y
 * suit sa rotation physique, les deux orientations restent donc atteignables. Une valeur
 * qu'aucune version relevée ne documente n'y figure pas non plus — on ne sait pas ce
 * qu'elle fait, on ne dira donc rien.
 */
export const HELD_SCREEN_ORIENTATIONS: Readonly<Record<string, Orientation>> = {
  LANDSCAPE: 'landscape',
  REVERSE_LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  REVERSE_PORTRAIT: 'portrait'
}

/* ------------------------------------------------------------ les raisons */

export type ReachabilityReason =
  /** La page porte `navigations: "none"` — le réglage « Désactivé » de l'appareil. */
  | { kind: 'noNavigation' }
  /** La page porte une liste de navigations vide. Même conséquence, autre écriture. */
  | { kind: 'emptyNavigationList' }
  /** Les réglages généraux tiennent l'écran dans l'AUTRE orientation. */
  | { kind: 'screenHeldElsewhere'; held: Orientation; value: string }

/** Les raisons que le geste « Activer pour toutes les navigations » répare. */
export type NavigationReasonKind = 'noNavigation' | 'emptyNavigationList'

/**
 * Ce que la clé `navigations` de cette page interdit, ou `undefined` si elle n'interdit
 * rien.
 *
 * On relit le nœud brut plutôt que `page.navigations` : `readLayout` replie sur
 * `{ kind: 'none' }` **aussi** quand la clé est absente ou d'un type non reconnu.
 *
 * Deux cas y échappent, et ils s'y refusent tous les deux pour la même raison — dire
 * « jamais affichée » demanderait de savoir, et on ne sait pas :
 *
 * - **la clé est absente.** Le fichier ne dit rien du sort de la page ; les 21 fichiers
 *   du corpus la portent tous, le cas n'a jamais été rencontré.
 * - **la clé porte autre chose** qu'`"all"`, `"none"` ou un tableau — une chaîne
 *   inconnue, un nombre, un objet. `src/ui/warnings.ts` le signale déjà pour ce que
 *   c'est : cet outil ne sait pas dire quand cette page s'affiche. ⚠️ Jusqu'au
 *   2026-08-22, une **chaîne** inconnue passait ici pour un « Désactivé » : le repli de
 *   `readLayout` la rendait indiscernable de `"none"`, et l'outil affirmait donc « ne
 *   s'affichera jamais » sur la page même où il avouait, deux écrans plus loin, ne pas
 *   savoir. Deux phrases contradictoires sur le même fichier, dont une inventée.
 */
export function navigationsBlock(page: Page): NavigationReasonKind | undefined {
  const node = getMember(page.node, 'navigations')
  if (node === undefined) return undefined
  if (node.kind === 'string') return decode(node.raw) === 'none' ? 'noNavigation' : undefined
  if (node.kind === 'array') return node.items.length === 0 ? 'emptyNavigationList' : undefined
  return undefined
}

/**
 * L'orientation dans laquelle les réglages généraux du fichier tiennent l'écran, avec la
 * valeur telle qu'elle y est écrite — ou `undefined` quand rien ne la tient : réglage sur
 * « Automatique », réglage absent, ou fichier sans réglages généraux du tout, ce qui est
 * le cas de **tous** les exports « pages ».
 */
export function heldScreenOrientation(
  document: JsonNode
): { held: Orientation; value: string } | undefined {
  const preferences = getMember(document, 'preferences')
  if (preferences === undefined) return undefined
  const value = readString(preferences, SCREEN_ORIENTATION_KEY)
  if (value === undefined) return undefined
  const held = HELD_SCREEN_ORIENTATIONS[value]
  return held === undefined ? undefined : { held, value }
}

export interface ReachabilityInput {
  page: Page
  orientation: Orientation
  /**
   * Le document entier, pour les réglages généraux. Facultatif : un appelant qui n'a que
   * la mise en page sous la main obtient les raisons de page, et rien de faux.
   */
  document?: JsonNode
}

/**
 * Toutes les raisons pour lesquelles cette page-ci ne s'affichera pas, dans l'ordre où
 * elles se lisent : ce que la page déclare d'abord, ce que l'appareil impose ensuite.
 *
 * Une liste vide ne veut pas dire « cette page s'affichera » : elle veut dire que rien de
 * ce que cet éditeur sait lire ne l'en empêche. La nuance est celle de tout le projet.
 */
export function pageReachability(input: ReachabilityInput): ReachabilityReason[] {
  const reasons: ReachabilityReason[] = []

  const blocked = navigationsBlock(input.page)
  if (blocked !== undefined) reasons.push({ kind: blocked })

  if (input.document !== undefined) {
    const screen = heldScreenOrientation(input.document)
    if (screen !== undefined && screen.held !== input.orientation) {
      reasons.push({ kind: 'screenHeldElsewhere', held: screen.held, value: screen.value })
    }
  }

  return reasons
}

/** Vrai si « Activer pour toutes les navigations » répare cette raison-là. */
export function isRepairableHere(reason: ReachabilityReason): boolean {
  return reason.kind === 'noNavigation' || reason.kind === 'emptyNavigationList'
}

/* ------------------------------------------------------------- la prose */

/**
 * Ce que la raison dit au pilote, dans sa langue. Le traducteur est **passé**, jamais lu :
 * `src/model/` n'importe de `src/i18n/` que des types. Même forme que `personalProse`.
 */
export function reachabilityMessage(reason: ReachabilityReason, tr: Translator): string {
  switch (reason.kind) {
    case 'noNavigation':
      return tr.t('reachability.noNavigation')
    case 'emptyNavigationList':
      return tr.t('reachability.emptyNavigationList')
    case 'screenHeldElsewhere':
      return reason.held === 'landscape'
        ? tr.t('reachability.heldInLandscape', { value: reason.value })
        : tr.t('reachability.heldInPortrait', { value: reason.value })
  }
}

/**
 * Ce qu'il y a à faire, dit avant le geste. Deux réponses seulement, et elles ne se
 * ressemblent pas : ici, l'éditeur écrit ; là, il indique et n'écrit rien.
 */
export function reachabilityRemedy(reason: ReachabilityReason, tr: Translator): string {
  return isRepairableHere(reason)
    ? tr.t('reachability.enableAllRemedy')
    : tr.t('reachability.heldRemedy')
}
