import type { AlertType } from '@/types/spatial'

export interface TopoNode {
  id: string
  label: string
  type: 'manhole' | 'junction' | 'entry'
}

export interface TopoSegment {
  id: string
  fromNode: string
  toNode: string
  length: number
  slopeDirection?: 'down' | 'up' | 'flat'
}

export const TOPO_NODES: TopoNode[] = [
  { id: 'E-A', label: 'A区入口', type: 'entry' },
  { id: 'E-A2', label: 'A2出口', type: 'entry' },
  { id: 'E-B', label: 'B区入口', type: 'entry' },
  { id: 'E-B3', label: 'B3出口', type: 'entry' },
  { id: 'E-C', label: 'C区入口', type: 'entry' },
  { id: 'E-C3', label: 'C3出口', type: 'entry' },
  { id: 'J-AB1', label: '检查井 AB-1', type: 'manhole' },
  { id: 'J-B12', label: '检查井 B-12', type: 'junction' },
  { id: 'J-B23', label: '检查井 B-23', type: 'junction' },
  { id: 'J-C12', label: '检查井 C-12', type: 'junction' },
  { id: 'J-C23', label: '检查井 C-23', type: 'junction' },
]

export const TOPO_SEGMENTS: TopoSegment[] = [
  { id: 'A1', fromNode: 'E-A', toNode: 'J-AB1', length: 310 },
  { id: 'A2', fromNode: 'J-AB1', toNode: 'E-A2', length: 310 },
  { id: 'B1', fromNode: 'E-B', toNode: 'J-B12', length: 310 },
  { id: 'B2', fromNode: 'J-B12', toNode: 'J-B23', length: 250 },
  { id: 'B3', fromNode: 'J-B23', toNode: 'E-B3', length: 280 },
  { id: 'C1', fromNode: 'E-C', toNode: 'J-C12', length: 310 },
  { id: 'C2', fromNode: 'J-C12', toNode: 'J-C23', length: 250 },
  { id: 'C3', fromNode: 'J-C23', toNode: 'E-C3', length: 280 },
]

interface Adjacency {
  nodeToSegmentIds: Map<string, string[]>
  segmentById: Map<string, TopoSegment>
}

let adjacencyCache: Adjacency | null = null

function getAdjacency(): Adjacency {
  if (adjacencyCache) return adjacencyCache

  const nodeToSegmentIds = new Map<string, string[]>()
  const segmentById = new Map<string, TopoSegment>()

  for (const segment of TOPO_SEGMENTS) {
    segmentById.set(segment.id, segment)
    if (!nodeToSegmentIds.has(segment.fromNode)) nodeToSegmentIds.set(segment.fromNode, [])
    if (!nodeToSegmentIds.has(segment.toNode)) nodeToSegmentIds.set(segment.toNode, [])
    nodeToSegmentIds.get(segment.fromNode)!.push(segment.id)
    nodeToSegmentIds.get(segment.toNode)!.push(segment.id)
  }

  adjacencyCache = { nodeToSegmentIds, segmentById }
  return adjacencyCache
}

export interface NeighborSet {
  upstream: string[]
  downstream: string[]
}

export function getNeighbors(segmentId: string): NeighborSet {
  const adjacency = getAdjacency()
  const segment = adjacency.segmentById.get(segmentId)
  if (!segment) return { upstream: [], downstream: [] }

  const fromShared = (adjacency.nodeToSegmentIds.get(segment.fromNode) ?? []).filter((id) => id !== segmentId)
  const toShared = (adjacency.nodeToSegmentIds.get(segment.toNode) ?? []).filter((id) => id !== segmentId)

  const upstream: string[] = []
  for (const id of fromShared) {
    const other = adjacency.segmentById.get(id)
    if (!other) continue
    if (other.toNode === segment.fromNode || other.fromNode === segment.fromNode) upstream.push(id)
  }

  const downstream: string[] = []
  for (const id of toShared) {
    const other = adjacency.segmentById.get(id)
    if (!other) continue
    if (other.fromNode === segment.toNode || other.toNode === segment.toNode) downstream.push(id)
  }

  return { upstream, downstream }
}

export type PropagationDirection = 'both' | 'upstream' | 'downstream' | 'none'

export function getPropagationDirection(type: AlertType): PropagationDirection {
  switch (type) {
    case 'thermal':
    case 'gas':
      return 'both'
    case 'water':
    case 'moisture':
      return 'downstream'
    default:
      return 'none'
  }
}

export function hasConsecutiveNeighborsWithAlert(
  originSegmentId: string,
  direction: PropagationDirection,
  segmentHasAlert: (segmentId: string) => boolean,
  maxDepth = 2,
): boolean {
  if (direction === 'none') return false

  const visit = (segmentId: string, dir: 'upstream' | 'downstream', depth: number): boolean => {
    if (depth >= maxDepth) return true

    const neighbors = getNeighbors(segmentId)
    const candidates = dir === 'upstream' ? neighbors.upstream : neighbors.downstream
    return candidates.some((next) => segmentHasAlert(next) && visit(next, dir, depth + 1))
  }

  if ((direction === 'both' || direction === 'upstream') && visit(originSegmentId, 'upstream', 0)) {
    return true
  }
  if ((direction === 'both' || direction === 'downstream') && visit(originSegmentId, 'downstream', 0)) {
    return true
  }

  return false
}

export function getSegmentLength(segmentId: string): number {
  return getAdjacency().segmentById.get(segmentId)?.length ?? 300
}
