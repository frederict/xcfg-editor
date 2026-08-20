import type { JsonNode } from '../core/jsonDocument'
import { readBoolean, readNumber, readString } from '../core/access'

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
  /** Opacité du fond, de 0 à 100. */
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
