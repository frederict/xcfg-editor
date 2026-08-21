import type { VersionDatabase } from '../catalog/widgetVersions'
import { decode, extractMember, restoreMember, type MemberOccurrence } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import type { Layout } from './layout'
import type { Orientation } from './mutations'
import { widgetOptionKeys } from './widget'

/**
 * Le **nettoyage** des réglages qu'une ancienne version de XCTrack a laissés dans un
 * fichier : dresser la liste exacte de ce qui partirait, la retirer, et savoir la
 * remettre.
 *
 * Ce module ne dessine rien et ne demande rien. Il produit un **plan** — une liste de
 * couples *(gadget, réglage)* désignés un à un — puis l'applique sur le document vivant.
 * L'interface est ailleurs (`src/ui/cleanupPanel.ts`), et c'est elle qui fait décider.
 *
 * ## La règle, et pourquoi elle est aussi étroite
 *
 * Les deux risques ne sont pas de même poids, et tout ce qui suit en découle :
 *
 * - **ne rien supprimer ne casse rien.** XCTrack conserve les clés qu'il ne connaît
 *   plus ; un réglage périmé laissé en place est un octet inutile, pas une panne ;
 * - **supprimer à tort casse une configuration de vol.** Un réglage valide effacé, c'est
 *   un gadget qui ne s'affiche plus comme le pilote l'avait réglé, et il le découvre en
 *   l'air.
 *
 * Le plan ne retient donc qu'un seul cas, le seul que la base **atteste par un fichier
 * réel** : `keyStatus() === 'legacy'`. Le relevé lit ce réglage à des paliers antérieurs
 * au palier visé, plus à celui-ci, et des fichiers écrits par cette version-là le
 * portent quand même. C'est un reliquat mesuré, pas déduit.
 *
 * Tout le reste est écarté, y compris ce que le diagnostic qualifie pourtant de
 * « suppression défendable » :
 *
 * - `gap` — le réglage existait, c'est notre extraction qui l'a manqué. **Jamais.**
 * - `blind` — aucun relevé ne le lit nulle part : notre silence ne conclut rien. **Jamais.**
 * - `absent` sous toutes ses formes (`past-only`, `future-only`, `straddled`,
 *   `never-read`) — aucun fichier réel ne vient l'attester. `past-only` se défendrait
 *   *sur la foi du relevé seul* ; le relevé seul ne suffit pas à effacer le réglage d'un
 *   pilote, et la base compte cinq trous connus qui, sans les fichiers du corpus,
 *   auraient exactement cette allure.
 *
 * Double serrure, enfin : même sur un `legacy`, le plan exige de retrouver dans le relevé
 * **le dernier palier qui lisait encore le réglage**. Sans cette trace, on ne saurait pas
 * dire au pilote depuis quand il ne sert plus, et on ne propose pas de supprimer ce qu'on
 * ne sait pas expliquer. Ces refus sont comptés (`withheldCount`), jamais tus.
 *
 * ## Fidélité
 *
 * Rien ne passe par `JSON.parse`/`JSON.stringify`. Le retrait se fait par
 * `extractMember`, qui rend l'entrée d'origine — texte source de la clé compris — et
 * `revertCleanup` la repose à son rang. Un fichier nettoyé puis remis en l'état ressort
 * **à l'octet près**, et un fichier nettoyé ne diffère que des réglages retirés :
 * `3.0` reste `3.0`, `1.0E7` reste `1.0E7`, partout ailleurs.
 */

/** Les deux orientations, dans l'ordre où le diagnostic les parcourt. */
const ORIENTATIONS: Orientation[] = ['landscape', 'portrait']

/** Un réglage périmé, désigné sans ambiguïté dans le document. */
export interface CleanupEntry {
  /**
   * Le chemin de la clé dans le document, index à partir de 0 :
   * `layout/landscape/1/widgets/3/mapWidget_showTerrain`. C'est l'identité de l'entrée
   * dans le plan — deux gadgets peuvent porter le même réglage périmé, jamais au même
   * chemin.
   */
  path: string
  /**
   * Le nœud du gadget porteur. **Valable pour l'arbre qui a servi au plan, et pour lui
   * seul** : après une annulation d'historique, `current()` rend un arbre neuf et le plan
   * doit être refait. `applyCleanup` s'en garde et ne touche à rien qui aurait bougé.
   */
  node: JsonNode
  orientation: Orientation
  /** Rang de la page dans son orientation, à partir de 1 — celui que voit le pilote. */
  pageRank: number
  /** Rang du gadget dans la page, à partir de 1, dans l'ordre de dessin. */
  widgetRank: number
  className: string
  shortName: string
  key: string
  /** Dernier palier où le relevé lit encore ce réglage. */
  lastReadTier: number
  /** Premier palier qui ne le lit plus — `lastReadTier + 1`, et c'est la date du décès. */
  droppedAtTier: number
  /** Occurrences de la clé sur ce gadget. Plus d'une : le fichier la porte en double. */
  occurrences: number
}

export interface CleanupPlan {
  /** Le palier visé. Un plan ne vaut que contre celui-là. */
  tier: number
  /** Ce qui partirait, dans l'ordre du fichier. Vide : il n'y a rien à faire. */
  entries: CleanupEntry[]
  /** Gadgets distincts concernés — « 9 réglages sur 5 gadgets ». */
  widgetCount: number
  /** Réglages de gadgets examinés, clés de structure exclues. */
  examinedCount: number
  /**
   * Reliquats reconnus mais **retenus** : la base les dit périmés sans qu'aucun relevé ne
   * dise depuis quand. On ne propose pas de supprimer ce qu'on ne sait pas expliquer.
   * Zéro sur la base actuelle ; le jour où ce ne sera plus le cas, il faudra le voir.
   */
  withheldCount: number
}

/**
 * Ce qui partirait de ce document, visé sur ce palier. **Ne modifie rien.**
 *
 * Le parcours est celui du diagnostic — paysage puis portrait, pages puis gadgets dans
 * l'ordre de dessin — pour que les deux listes se lisent dans le même ordre.
 */
export function planCleanup(
  db: VersionDatabase, layout: Layout, tier: number
): CleanupPlan {
  const entries: CleanupEntry[] = []
  const widgets = new Set<string>()
  let examinedCount = 0
  let withheldCount = 0

  for (const orientation of ORIENTATIONS) {
    layout[orientation].forEach((page, pageIndex) => {
      page.widgets.forEach((widget, widgetIndex) => {
        const base = `layout/${orientation}/${pageIndex}/widgets/${widgetIndex}`
        for (const key of widgetOptionKeys(widget.node)) {
          examinedCount += 1
          // Première serrure : le seul statut que la base atteste par un fichier réel.
          if (db.keyStatus(widget.shortName, key, tier) !== 'legacy') continue
          // Seconde serrure : savoir DEPUIS QUAND. Un reliquat dont le relevé ne porte
          // aucune lecture antérieure n'est pas explicable au pilote — on le garde.
          const bounds = db.keyReadBounds(widget.shortName, key)
          if (bounds === null || bounds.max >= tier) {
            withheldCount += 1
            continue
          }
          widgets.add(base)
          entries.push({
            path: `${base}/${key}`,
            node: widget.node,
            orientation,
            pageRank: pageIndex + 1,
            widgetRank: widgetIndex + 1,
            className: widget.className,
            shortName: widget.shortName,
            key,
            lastReadTier: bounds.max,
            droppedAtTier: bounds.max + 1,
            occurrences: countOccurrences(widget.node, key)
          })
        }
      })
    })
  }

  return {
    tier,
    entries,
    widgetCount: widgets.size,
    examinedCount,
    withheldCount
  }
}

/**
 * Combien de fois cette clé figure dans l'objet — une, sauf fichier fautif. Le compter
 * plutôt que le supposer : `formes-preservees.xcfg` porte `_clef_doublee` deux fois, et
 * un pilote qui voit disparaître « un » réglage doit savoir que deux lignes sont parties.
 */
function countOccurrences(node: JsonNode, key: string): number {
  if (node.kind !== 'object') return 0
  return node.entries.filter(([rawKey]) => decode(rawKey) === key).length
}

/** Ce qui a été retiré pour une entrée, et de quoi le remettre exactement. */
export interface CleanupRemoval {
  entry: CleanupEntry
  /** Les occurrences retirées, rang d'origine et texte source compris. */
  occurrences: MemberOccurrence[]
}

export interface CleanupOutcome {
  tier: number
  removals: CleanupRemoval[]
  /**
   * Entrées que le document ne portait plus au moment d'agir : rien n'a été retiré pour
   * elles, et rien n'a été inventé. Un plan bâti sur un arbre remplacé depuis (annulation,
   * ouverture d'un autre fichier) tombe entièrement ici.
   */
  stale: CleanupEntry[]
  /** Réglages effectivement retirés. */
  keyCount: number
  /** Occurrences retirées : supérieur à `keyCount` si une clé était doublée. */
  occurrenceCount: number
  /** Gadgets touchés. */
  widgetCount: number
}

/**
 * Retire du document les réglages retenus. **Modifie l'arbre en place**, comme le reste
 * de `src/model/`, et rend de quoi tout remettre.
 *
 * `selected` désigne les entrées à retirer par leur `path` ; l'omettre retire tout le
 * plan. Une entrée absente du document — le plan a vieilli — est reportée dans `stale`
 * plutôt que d'échouer : la seule chose qu'un nettoyage ne doit jamais faire, c'est
 * toucher à ce qu'il n'a pas montré.
 */
export function applyCleanup(
  plan: CleanupPlan, selected?: ReadonlySet<string>
): CleanupOutcome {
  const removals: CleanupRemoval[] = []
  const stale: CleanupEntry[] = []
  const widgets = new Set<JsonNode>()
  let occurrenceCount = 0

  for (const entry of plan.entries) {
    if (selected !== undefined && !selected.has(entry.path)) continue
    // Le gadget porte-t-il toujours ce qu'on a montré ? Un arbre remplacé depuis le plan
    // rend `node` orphelin : il n'est plus dans le document, et le retirer serait sans
    // effet — mais surtout, un gadget déplacé ou remplacé n'est plus celui du plan.
    const occurrences = extractMember(entry.node, entry.key)
    if (occurrences.length === 0) {
      stale.push(entry)
      continue
    }
    removals.push({ entry, occurrences })
    occurrenceCount += occurrences.length
    widgets.add(entry.node)
  }

  return {
    tier: plan.tier,
    removals,
    stale,
    keyCount: removals.length,
    occurrenceCount,
    widgetCount: widgets.size
  }
}

/**
 * Remet tout ce qu'`applyCleanup` a retiré, à son rang et sous son texte source. Rend le
 * nombre de réglages remis.
 *
 * C'est l'annulation « après coup » que l'interface propose : le pilote enlève, regarde,
 * et revient s'il préfère. Le document ressort alors **identique à l'octet près** à ce
 * qu'il était avant le nettoyage — c'est la promesse que le projet fait partout ailleurs,
 * et elle ne s'arrête pas au premier repentir.
 *
 * **En sens inverse du retrait**, et ce n'est pas un détail : les rangs relevés par
 * `extractMember` valent pour l'état de l'objet **à cet instant-là**. Deux réglages
 * retirés du même gadget se remettent donc dans l'ordre inverse, faute de quoi le second
 * reviendrait au rang qu'occupait le premier. Mesuré sur `formes-preservees.xcfg`, dont
 * un gadget porte deux réglages périmés, l'un doublé.
 *
 * ⚠️ À n'appeler qu'une fois par résultat : les entrées ne sont pas recopiées.
 */
export function revertCleanup(outcome: CleanupOutcome): number {
  for (let index = outcome.removals.length - 1; index >= 0; index -= 1) {
    const removal = outcome.removals[index]
    if (removal === undefined) continue
    restoreMember(removal.entry.node, removal.occurrences)
  }
  return outcome.removals.length
}
