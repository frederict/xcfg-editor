import type { JsonNode } from '../core/jsonDocument'
import { decode, getMember } from '../core/access'
import { readWidget, type Widget } from './widget'

export type Navigations =
  | { kind: 'all' }
  | { kind: 'none' }
  | { kind: 'list'; classNames: string[] }

export interface Page {
  node: JsonNode
  className: string
  /** Dans l'ordre de dessin : le premier est au fond, le dernier au-dessus. */
  widgets: Widget[]
  navigations: Navigations
}

export interface Layout {
  portrait: Page[]
  landscape: Page[]
}

function readNavigations(node: JsonNode | undefined): Navigations {
  if (node?.kind === 'string') {
    const value = decode(node.raw)
    if (value === 'all') return { kind: 'all' }
    if (value === 'none') return { kind: 'none' }
  }
  if (node?.kind === 'array') {
    return {
      kind: 'list',
      classNames: node.items.filter((i) => i.kind === 'string').map((i) => decode(i.raw))
    }
  }
  return { kind: 'none' }
}

function readPages(node: JsonNode | undefined): Page[] {
  if (node?.kind !== 'array') return []
  return node.items.map((pageNode) => {
    const widgetsNode = getMember(pageNode, 'widgets')
    return {
      node: pageNode,
      className: getMember(pageNode, 'CLASS')?.kind === 'string'
        ? decode((getMember(pageNode, 'CLASS') as { raw: string }).raw) : '',
      widgets: widgetsNode?.kind === 'array' ? widgetsNode.items.map(readWidget) : [],
      navigations: readNavigations(getMember(pageNode, 'navigations'))
    }
  })
}

export function readLayout(document: JsonNode): Layout {
  const layout = getMember(document, 'layout')
  return {
    portrait: readPages(layout ? getMember(layout, 'portrait') : undefined),
    landscape: readPages(layout ? getMember(layout, 'landscape') : undefined)
  }
}
