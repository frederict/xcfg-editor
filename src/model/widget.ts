import type { JsonNode } from '../core/jsonDocument'
import { decode, readBoolean, readNumber, readString } from '../core/access'

/**
 * Les cinq clés qui disent **où** est le gadget et **ce qu'il est** — jamais comment il
 * est réglé. Elles ne figurent dans aucun relevé d'APK, et pour cause : elles
 * appartiennent au format du fichier, pas au catalogue d'options d'un gadget.
 *
 * Les confondre avec des réglages coûterait cinq constats faux par gadget à qui
 * confronte un fichier à une version de XCTrack, et cinq propositions de suppression
 * catastrophiques à qui le nettoie.
 */
export const STRUCTURAL_KEYS: ReadonlySet<string> =
  new Set(['CLASS', 'X1', 'Y1', 'X2', 'Y2'])

/**
 * Les clés de **réglage** que porte ce nœud de gadget, dans l'ordre du fichier, sans les
 * cinq clés de structure.
 *
 * Une clé doublée n'est rendue qu'une fois : c'est un défaut du fichier, signalé
 * ailleurs, et le rendre deux fois ferait compter deux réglages là où le gadget n'en
 * porte qu'un aux yeux de XCTrack, qui ne retient que la dernière occurrence.
 */
export function widgetOptionKeys(node: JsonNode): string[] {
  if (node.kind !== 'object') return []
  const seen = new Set<string>()
  const keys: string[] = []
  for (const [rawKey] of node.entries) {
    const key = decode(rawKey)
    if (STRUCTURAL_KEYS.has(key) || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

/**
 * Vue sur un widget limitée aux huit clés universelles — les seules présentes sur tous
 * les widgets observés. Le nœud d'origine reste accessible par `node` : tous les autres
 * paramètres y demeurent intacts, y compris ceux qu'aucune version connue ne documente.
 */
export interface Widget {
  node: JsonNode
  className: string
  shortName: string
  x1: number; y1: number; x2: number; y2: number
  border: boolean
  /**
   * La clé `_bg` : une **transparence**, de 0 (fond opaque) à 100 (aucun fond peint).
   * XCTrack l'intitule « Transparence d'arrière-plan : n % » — voir
   * `backgroundOpacity` dans `src/render/canvas.ts` pour la mesure et sa preuve.
   */
  background: number
  theme: string
}

export function readWidget(node: JsonNode): Widget {
  const className = readString(node, 'CLASS') ?? ''
  return {
    node,
    className,
    shortName: className.split('.').pop() ?? className,
    x1: readNumber(node, 'X1') ?? 0,
    y1: readNumber(node, 'Y1') ?? 0,
    x2: readNumber(node, 'X2') ?? 0,
    y2: readNumber(node, 'Y2') ?? 0,
    border: readBoolean(node, '_border') ?? false,
    background: readNumber(node, '_bg') ?? 100,
    theme: readString(node, '_theme') ?? ''
  }
}
