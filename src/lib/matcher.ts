/** A listing moves from its owner (giver) to the student who wants it. */
export type Edge = {
  from: string;
  to: string;
  listingId: string;
  cashCents: number;
};

export type Loop = Edge[];

const edgeKey = (edge: Edge): string =>
  JSON.stringify([edge.from, edge.to, edge.listingId, edge.cashCents]);

// Sorting the legs makes this identity independent of where a cycle starts.
const loopKey = (loop: Loop): string =>
  JSON.stringify(loop.map(edgeKey).sort());

/**
 * Find simple directed cycles containing startUserId, shortest first.
 * Callers supply edges from active, concrete wants and active listings.
 * A plain sale or self-trade is not a loop. Distinct listings between the
 * same people remain distinct alternatives. Input arrays are never modified.
 */
export function findLoops(
  edges: Edge[],
  startUserId: string,
  maxLen = 4,
): Loop[] {
  if (!Number.isInteger(maxLen) || maxLen < 2) return [];

  const outgoing = new Map<string, Edge[]>();
  const seenEdges = new Set<string>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const key = edgeKey(edge);
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    const group = outgoing.get(edge.from) ?? [];
    group.push(edge);
    outgoing.set(edge.from, group);
  }

  const found = new Map<string, Loop>();
  const visited = new Set([startUserId]);
  const path: Edge[] = [];

  function visit(userId: string): void {
    for (const edge of outgoing.get(userId) ?? []) {
      const length = path.length + 1;
      if (edge.to === startUserId) {
        if (length >= 2) {
          const loop = [...path, edge];
          found.set(loopKey(loop), loop);
        }
      } else if (length < maxLen && !visited.has(edge.to)) {
        visited.add(edge.to);
        path.push(edge);
        visit(edge.to);
        path.pop();
        visited.delete(edge.to);
      }
    }
  }

  visit(startUserId);

  const totalCash = (loop: Loop): number =>
    loop.reduce((total, edge) => total + edge.cashCents, 0);

  return [...found.values()].sort((a, b) => {
    const priority = a.length - b.length || totalCash(a) - totalCash(b);
    if (priority) return priority;
    const aKey = loopKey(a);
    const bKey = loopKey(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}
