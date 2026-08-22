import {
  MEASURED_MIGRATIONS, type MigrationTable, type RemovalCase
} from '../catalog/legacyMigrations'
import type { VersionDatabase } from '../catalog/widgetVersions'
import {
  decode, extractMember, getMember, restoreMember, type MemberOccurrence
} from '../core/access'
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
 * - **ne rien supprimer ne casse rien.** Un réglage périmé laissé en place est quelques
 *   octets ; l'instrument le consommera de lui-même à la première lecture ;
 * - **supprimer à tort casse une configuration de vol.** Un réglage valide effacé, c'est
 *   un gadget qui ne s'affiche plus comme le pilote l'avait réglé, et il le découvre en
 *   l'air.
 *
 * Le plan ne retient donc qu'un seul cas, le seul que la base **atteste par un fichier
 * réel** : `keyStatus() === 'legacy'`. Le relevé lit ce réglage à des paliers antérieurs
 * au palier visé, plus à celui-ci, et des fichiers écrits par cette version-là le
 * portent quand même. C'est un reliquat mesuré, pas déduit. Autrement dit, et c'est la
 * formule que les trois modules concernés répètent mot pour mot : **un outil de nettoyage
 * n'a le droit de proposer une suppression que sur `'legacy'`**.
 *
 * ⚠️ **`'legacy'` ne suffit pourtant pas, et c'est le défaut le plus grave que ce module
 * ait porté.** Le 22 août 2026, sur un AIR³ 7.2, trois `WCompass` ne différant que par
 * `showWind` ont montré que XCTrack **lit** ces réglages : absent → `windStyle: NONE`,
 * `false` → `NONE`, **`true` → `ARROW`**. Il ne les transporte pas, il les consomme — il
 * en dérive le réglage d'aujourd'hui, puis les efface. D'où le fait qui gouverne tout ce
 * qui suit : **si le fichier porte encore le réglage, c'est que l'instrument ne l'a pas
 * encore lu**, donc que le nettoyage mord exactement dans l'état où le réglage sert
 * encore. « Périmé » veut dire « remplacé depuis », jamais « sans effet ».
 *
 * Troisième serrure, donc : `catalog/legacyMigrations.ts`, qui porte pour chaque cas
 * *(réglage, valeur, **voisinage**)* ce que l'appareil écrit **avec** et **sans**. Égaux,
 * le retrait est sans effet et se propose ; différents ou jamais mesurés, l'entrée passe
 * dans `held` et l'interface dit pourquoi. Sur la sauvegarde de référence, cela fait
 * **4 réglages proposés et 5 laissés en place** là où les neuf partaient auparavant.
 *
 * ⚠️ **Le voisinage est arrivé après coup, et il a retiré deux propositions.** La table
 * du 22 août à midi comparait le réglage à la valeur d'usine d'un gadget **nu**, ce qui
 * n'est pas « sans le réglage » : mesuré le soir même sur l'appareil,
 * `mapWidget_showOpenStreet` et `mapWidget_showTerrain` **ne sont lus qu'ensemble**, et
 * retirer le premier d'une carte qui porte les deux éteint l'ombrage du relief que le
 * second allume. Les deux `mapWidget_showOpenStreet: false` de la sauvegarde de référence
 * étaient proposés ; ils sont désormais retenus, aux côtés des deux
 * `mapWidget_showTerrain: true` et du `showWind: true`.
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
 * ⚠️ **Cette consigne a déjà dérivé, et dans le sens qui casse.** Le 21 août, trois
 * commits d'une même soirée ont laissé trois règles différentes en place : `4f2c336`
 * (15 h 58) posait « que sur `'absent'` » avant que l'outil n'existe ; `b7300f7` (21 h 28)
 * a écrit l'outil et retenu `'legacy'` **en rejetant `'absent'`**, pour la raison
 * ci-dessus ; `f8bf341` (21 h 35) en a écrit une troisième. La première n'a jamais été
 * corrigée, et elle est l'**inverse exact** de ce que le code fait : suivie à la lettre,
 * elle ferait effacer des réglages valides — précisément le risque que ce module classe
 * comme le plus lourd des deux.
 *
 * D'où `CLEANABLE_STATUSES` juste dessous : la règle cesse d'être une phrase que trois
 * fichiers recopient, et devient une valeur que `planCleanup` lit. La phrase reste — elle
 * porte le raisonnement, que la valeur ne peut pas porter — mais un test compare
 * maintenant l'une à l'autre dans les trois fichiers.
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

/**
 * **Les seuls statuts sur lesquels une suppression se propose.** La règle de sûreté du
 * module, sous la seule forme qu'une phrase ne peut pas avoir : une valeur, lue par
 * `planCleanup` et comparée par les tests à ce que les commentaires en disent.
 *
 * Un seul élément aujourd'hui, et le commentaire de tête dit pourquoi les cinq autres
 * `KeyStatus` sont écartés — `gap` et `blind` parce que notre silence ne conclut rien,
 * `absent` sous toutes ses formes parce qu'aucun fichier réel ne l'atteste, `present` et
 * `unknown` parce qu'il n'y a rien à conclure. Ce n'est pas une liste qu'on allonge en
 * passant : chaque ajout autorise l'outil à effacer le réglage d'un pilote.
 */
export const CLEANABLE_STATUSES = ['legacy'] as const

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
  /**
   * Ce que le retrait ferait, mesuré sur l'appareil (`catalog/legacyMigrations.ts`).
   * Seul `'inert'` entre dans `entries` ; `'live'` et `'unmeasured'` vont dans `held`.
   */
  removal: RemovalCase
}

export interface CleanupPlan {
  /** Le palier visé. Un plan ne vaut que contre celui-là. */
  tier: number
  /** Ce qui partirait, dans l'ordre du fichier. Vide : il n'y a rien à faire. */
  entries: CleanupEntry[]
  /**
   * Reliquats **reconnus et laissés en place** : leur retrait changerait ce que
   * l'instrument affiche (`removal.verdict === 'live'`), ou nul ne l'a mesuré
   * (`'unmeasured'`). Ils ne sont pas tus — l'interface les nomme et dit pourquoi, parce
   * qu'un réglage trouvé et passé sous silence est un renseignement volé au pilote.
   */
  held: CleanupEntry[]
  /** Gadgets distincts concernés — « 6 réglages sur 4 gadgets ». */
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
  db: VersionDatabase, layout: Layout, tier: number,
  migrations: MigrationTable = MEASURED_MIGRATIONS
): CleanupPlan {
  const entries: CleanupEntry[] = []
  const held: CleanupEntry[] = []
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
          const status = db.keyStatus(widget.shortName, key, tier)
          if (!(CLEANABLE_STATUSES as readonly string[]).includes(status)) continue
          // Seconde serrure : savoir DEPUIS QUAND. Un reliquat dont le relevé ne porte
          // aucune lecture antérieure n'est pas explicable au pilote — on le garde.
          const bounds = db.keyReadBounds(widget.shortName, key)
          if (bounds === null || bounds.max >= tier) {
            withheldCount += 1
            continue
          }
          // Troisième serrure, et la plus récente : que ferait le retrait ? L'instrument
          // lit ces réglages une dernière fois avant de les effacer, et le fichier ne
          // les porte encore que parce qu'il ne les a PAS lus. Voir l'en-tête.
          const removal = migrations.removalVerdict(
            widget.shortName, key, rawValue(widget.node, key), tier,
            (neighbour) => rawValue(widget.node, neighbour)
          )
          const entry: CleanupEntry = {
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
            occurrences: countOccurrences(widget.node, key),
            removal
          }
          if (removal.verdict !== 'inert') {
            held.push(entry)
            continue
          }
          widgets.add(base)
          entries.push(entry)
        }
      })
    })
  }

  return {
    tier,
    entries,
    held,
    widgetCount: widgets.size,
    examinedCount,
    withheldCount
  }
}

/**
 * Le texte source de la valeur d'un réglage — `true`, `false`, `1000`, ou le contenu
 * décodé d'une chaîne. `undefined` quand le gadget ne porte pas ce réglage, ou qu'il
 * porte une structure : un objet n'a pas de valeur à comparer au relevé.
 */
function rawValue(node: JsonNode, key: string): string | undefined {
  const member = getMember(node, key)
  if (member === undefined) return undefined
  if (member.kind === 'literal') return member.raw
  if (member.kind === 'string') return decode(member.raw)
  return undefined
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
