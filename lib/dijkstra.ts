export type WeightedEdge<NodeId extends string = string> = {
  to: NodeId;
  weight: number;
};

export type WeightedGraph<NodeId extends string = string> = ReadonlyMap<
  NodeId,
  readonly WeightedEdge<NodeId>[]
>;

export type ShortestPathResult<NodeId extends string = string> = {
  path: NodeId[];
  distance: number;
};

type QueueEntry<NodeId extends string> = {
  node: NodeId;
  distance: number;
};

class MinPriorityQueue<NodeId extends string> {
  private heap: QueueEntry<NodeId>[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(entry: QueueEntry<NodeId>): void {
    this.heap.push(entry);
    let index = this.heap.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent]!.distance <= entry.distance) break;
      this.heap[index] = this.heap[parent]!;
      index = parent;
    }

    this.heap[index] = entry;
  }

  pop(): QueueEntry<NodeId> | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();
    if (!first || !last || this.heap.length === 0) return first;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.heap.length) break;

      const smaller = right < this.heap.length
        && this.heap[right]!.distance < this.heap[left]!.distance
        ? right
        : left;
      if (this.heap[smaller]!.distance >= last.distance) break;

      this.heap[index] = this.heap[smaller]!;
      index = smaller;
    }

    this.heap[index] = last;
    return first;
  }
}

export function dijkstraShortestPath<NodeId extends string>(
  graph: WeightedGraph<NodeId>,
  start: NodeId,
  destination: NodeId,
): ShortestPathResult<NodeId> | null {
  if (start === destination) return { path: [start], distance: 0 };

  const distances = new Map<NodeId, number>([[start, 0]]);
  const previous = new Map<NodeId, NodeId>();
  const queue = new MinPriorityQueue<NodeId>();
  queue.push({ node: start, distance: 0 });

  while (queue.size > 0) {
    const current = queue.pop()!;
    if (current.distance !== distances.get(current.node)) continue;
    if (current.node === destination) {
      return {
        path: reconstructPath(previous, start, destination),
        distance: current.distance,
      };
    }

    for (const edge of graph.get(current.node) ?? []) {
      if (!Number.isFinite(edge.weight) || edge.weight < 0) {
        throw new RangeError("Dijkstra edge weights must be finite and non-negative.");
      }

      const candidateDistance = current.distance + edge.weight;
      if (candidateDistance >= (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;

      distances.set(edge.to, candidateDistance);
      previous.set(edge.to, current.node);
      queue.push({ node: edge.to, distance: candidateDistance });
    }
  }

  return null;
}

function reconstructPath<NodeId extends string>(
  previous: ReadonlyMap<NodeId, NodeId>,
  start: NodeId,
  destination: NodeId,
): NodeId[] {
  const path = [destination];
  let current = destination;

  while (current !== start) {
    const parent = previous.get(current);
    if (!parent) return [];
    path.push(parent);
    current = parent;
  }

  return path.reverse();
}
