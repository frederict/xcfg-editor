import type { JsonNode } from './jsonDocument'

/** Décode une clé ou une chaîne stockée avec ses guillemets. */
export function decode(raw: string): string {
  return JSON.parse(raw) as string
}

/**
 * Inverse de `decode` : rend le texte source d'une chaîne, guillemets et échappements
 * compris, prêt à être posé par `setString`. Existe pour que chaque appelant ne
 * réinvente pas l'échappement — et ne se trompe pas.
 */
export function encode(value: string): string {
  return JSON.stringify(value)
}

export function getMember(node: JsonNode, key: string): JsonNode | undefined {
  if (node.kind !== 'object') return undefined
  // Sur clé dupliquée, la dernière l'emporte — c'est ce que fait XCTrack en lecture.
  let found: JsonNode | undefined
  for (const [rawKey, value] of node.entries) {
    if (decode(rawKey) === key) found = value
  }
  return found
}

export function getIndex(node: JsonNode, index: number): JsonNode | undefined {
  if (node.kind !== 'array') return undefined
  return node.items[index]
}

export function readString(node: JsonNode, key: string): string | undefined {
  const member = getMember(node, key)
  return member?.kind === 'string' ? decode(member.raw) : undefined
}

export function readNumber(node: JsonNode, key: string): number | undefined {
  const member = getMember(node, key)
  if (member?.kind !== 'literal') return undefined
  const value = Number(member.raw)
  return Number.isNaN(value) ? undefined : value
}

export function readBoolean(node: JsonNode, key: string): boolean | undefined {
  const member = getMember(node, key)
  if (member?.kind !== 'literal') return undefined
  if (member.raw === 'true') return true
  if (member.raw === 'false') return false
  return undefined
}

/**
 * Remplace le texte source d'une valeur existante. On n'écrit jamais de valeur
 * JavaScript : l'appelant fournit le texte exact, ce qui interdit à `JSON.stringify`
 * de transformer 3.0 en 3 dans notre dos.
 */
function setRaw(node: JsonNode, key: string, value: JsonNode): void {
  if (node.kind !== 'object') throw new Error('objet attendu')
  // On écrit sur la DERNIÈRE occurrence, celle que `getMember` retient. Écrire sur la
  // première laisserait la lecture inchangée : un widget dont une coordonnée est
  // dupliquée ne bougerait pas, sans erreur ni signal.
  let cible: [string, JsonNode] | undefined
  for (const entry of node.entries) {
    if (decode(entry[0]) === key) cible = entry
  }
  if (cible === undefined) throw new Error(`clé absente : ${key}`)
  cible[1] = value
}

/** Pose un nombre, un booléen ou `null`, sous sa forme source exacte. */
export function setLiteral(node: JsonNode, key: string, raw: string): void {
  setRaw(node, key, { kind: 'literal', raw })
}

/**
 * Pose une chaîne, guillemets compris. Distinct de `setLiteral` : le type du nœud doit
 * refléter ce qu'il contient, sans quoi `readString` ne retrouvera pas la valeur — le
 * texte produit serait correct, mais le document mentirait sur son propre type.
 */
export function setString(node: JsonNode, key: string, raw: string): void {
  setRaw(node, key, { kind: 'string', raw })
}

/** Vrai si la clé existe dans l'objet. Sert à choisir entre `set…` et `insert…`. */
export function hasMember(node: JsonNode, key: string): boolean {
  return getMember(node, key) !== undefined
}

/**
 * Position d'insertion d'une clé nouvelle — **mesurée, pas choisie par goût.**
 *
 * XCTrack range les clés d'un widget dans l'ordre où son code les déclare. Cet ordre
 * n'est pas déductible du document, et il n'est pas stable d'une version à l'autre.
 * Relevé sur 22 fichiers réels (corpus historique 2022→2026, 8 versions de XCTrack,
 * 2313 objets porteurs de `CLASS`) :
 *
 * - sur 41 ajouts de clé observés entre deux versions d'un même type de widget,
 *   **40 se font au milieu de l'objet** et un seul en queue (`_units` sur `WAltitude`).
 *   Exemples : `soundMode` s'intercale avant `showSensors` (`WStatusLine`, 2026),
 *   `_rotation` avant `postponedFloorLimit` (`WAirspaceProximity`, 2026),
 *   `mapWidget_emergencyZoom` avant `live_ShowNearby` (`WCompMap`, 2024) ;
 * - pire, XCTrack **déplace** des clés existantes : `showTime` passe de la 1re à la
 *   dernière option de `WStatusLine`, et le bloc `mapWidget_showRainRadar` … `KK7*`
 *   quitte le milieu de `WCompMap` pour sa fin en 2026. Sur 80 paires de séquences
 *   comparées, 14 divergent sur l'ordre relatif de leurs clés communes.
 *
 * Deux conséquences, opposées et toutes deux utiles :
 *
 * 1. **On ne peut pas deviner « la bonne » place.** Elle vit dans le code de XCTrack,
 *    change à chaque version, et le fichier n'en porte aucune trace. Toute règle
 *    déduite du document serait une invention.
 * 2. **La place ne veut rien dire pour XCTrack.** `mapWidget_showRainRadar` occupe le
 *    rang 14, 15, 16 ou 43 du même widget selon la version, et l'application lit les
 *    quatre : elle relit ses réglages par nom, jamais par position.
 *
 * D'où la règle retenue, la plus conservatrice : **on insère en fin d'objet.** C'est la
 * seule position qui ne déplace, ne réécrit et ne réindente aucune clé existante — la
 * différence textuelle se réduit alors aux caractères ajoutés. L'appelant qui saurait
 * mieux (un ordre de référence tiré du catalogue de l'APK, par exemple) passe `at`.
 *
 * `at` est un rang dans `entries` : 0 insère en tête, `entries.length` en queue. Une
 * valeur hors bornes est ramenée dans les bornes plutôt que rejetée — un rang calculé
 * par l'appelant ne doit pas pouvoir faire échouer une édition du pilote.
 */
function insertRaw(node: JsonNode, key: string, value: JsonNode, at?: number): void {
  if (node.kind !== 'object') throw new Error('objet attendu')
  // Refus d'insérer une clé déjà là : on créerait une clé dupliquée, c'est-à-dire
  // exactement le défaut que `findDuplicateKeys` signale au pilote. L'appelant tranche
  // avec `hasMember` entre poser (`set…`) et insérer (`insert…`).
  if (hasMember(node, key)) throw new Error(`clé déjà présente : ${key}`)
  const last = node.entries.length
  const rank = at === undefined ? last : Math.min(Math.max(Math.trunc(at), 0), last)
  node.entries.splice(rank, 0, [encode(key), value])
}

/** Insère une clé absente portant un nombre, un booléen ou `null`, sous sa forme source. */
export function insertLiteral(node: JsonNode, key: string, raw: string, at?: number): void {
  insertRaw(node, key, { kind: 'literal', raw }, at)
}

/** Insère une clé absente portant une chaîne. `raw` inclut les guillemets — voir `encode`. */
export function insertString(node: JsonNode, key: string, raw: string, at?: number): void {
  insertRaw(node, key, { kind: 'string', raw }, at)
}

/**
 * Retire **toutes** les occurrences d'une clé et rend combien ont été retirées.
 *
 * Toutes, et pas seulement la dernière que `getMember` retiendrait : après un geste de
 * suppression, la seule postcondition prévisible est que la clé n'est plus là. N'en
 * retirer qu'une laisserait le réglage en place avec l'ancienne valeur du doublon, sans
 * erreur ni signal — le mode de défaillance le plus coûteux du projet.
 *
 * Rendre 0 sur une clé absente, sans lever : supprimer ce qui n'existe pas est déjà le
 * résultat demandé. La valeur de retour existe pour que l'appelant puisse avertir quand
 * il en a retiré plus d'une.
 *
 * **Cette primitive sert un geste explicite du pilote, jamais un ménage automatique.**
 * `edition-native-exploration.md` §4.4 le montre : un fichier contient légitimement des
 * clés que l'interface native n'affiche pas dans l'état courant (`thermals_labels` est
 * absente du panneau tant que `thermals = 0`). On ne supprime jamais une clé au prétexte
 * qu'on ne l'affiche pas.
 */
export function removeMember(node: JsonNode, key: string): number {
  return extractMember(node, key).length
}

/**
 * Une occurrence de clé retirée d'un objet : le rang qu'elle occupait, et l'entrée
 * elle-même.
 *
 * L'entrée est conservée **telle quelle**, texte source de la clé compris. Une clé
 * écrite `"a"` par Gson (2022, voir `tests/fixtures/formes/gson-2022.xcfg`) doit se
 * reposer sous cette forme-là : la réencoder rendrait `"a"`, ce qui est le même nom et un
 * autre fichier.
 */
export interface MemberOccurrence {
  /** Rang qu'occupait la clé dans `entries`, avant le retrait. */
  rank: number
  /** L'entrée d'origine — ni recopiée, ni réécrite. */
  entry: [key: string, value: JsonNode]
}

/**
 * Retire **toutes** les occurrences d'une clé et rend de quoi les remettre exactement où
 * elles étaient. Même postcondition que `removeMember`, qui n'est plus que le comptage
 * de ce qu'elle rend.
 *
 * Elle existe pour une raison précise : un geste de suppression que le pilote peut
 * **défaire après coup** ne peut pas se contenter de « la clé n'est plus là ». Il faut
 * savoir reposer la valeur, à son rang, sous son texte source — sans quoi l'annulation
 * rendrait un fichier différent de celui d'avant, et la fidélité à l'octet près
 * s'arrêterait au premier repentir.
 */
export function extractMember(node: JsonNode, key: string): MemberOccurrence[] {
  if (node.kind !== 'object') throw new Error('objet attendu')
  const taken: MemberOccurrence[] = []
  const kept: Array<[string, JsonNode]> = []
  node.entries.forEach((entry, rank) => {
    if (decode(entry[0]) === key) taken.push({ rank, entry })
    else kept.push(entry)
  })
  node.entries = kept
  return taken
}

/**
 * Repose des occurrences rendues par `extractMember`, chacune à son rang d'origine.
 *
 * Les rangs sont repris dans l'ordre croissant : celui d'une clé doublée reste alors
 * exact, parce que chaque insertion précédente a déjà décalé ce qui la suit. Un rang
 * au-delà de la fin de l'objet — l'objet a été modifié entre-temps — met l'entrée en
 * queue plutôt que de lever : reposer un réglage au mauvais rang est sans effet pour
 * XCTrack, qui relit ses réglages par nom (voir la note d'insertion plus haut) ; le
 * perdre, non.
 *
 * ⚠️ **À n'appeler qu'une fois par extraction.** Les entrées ne sont pas recopiées : les
 * reposer deux fois poserait deux fois le même objet, c'est-à-dire une clé doublée.
 */
export function restoreMember(
  node: JsonNode, occurrences: readonly MemberOccurrence[]
): void {
  if (node.kind !== 'object') throw new Error('objet attendu')
  for (const { rank, entry } of [...occurrences].sort((a, b) => a.rank - b.rank)) {
    node.entries.splice(Math.min(Math.max(rank, 0), node.entries.length), 0, entry)
  }
}
