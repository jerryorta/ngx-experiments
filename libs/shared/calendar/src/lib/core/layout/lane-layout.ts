/**
 * The lane (column) assignment for a single item within its overlap cluster.
 *
 * - `laneIndex` is the 0-based column the item is packed into.
 * - `laneCount` is the total number of columns the item must share its width
 *   with — i.e. the width of the densest point of the cluster the item belongs
 *   to. Every item in the same cluster reports the same `laneCount`, so a view
 *   can render each as `laneIndex / laneCount` … `(laneIndex + 1) / laneCount`.
 */
export interface LanePosition {
  laneCount: number;
  laneIndex: number;
}

interface TaggedItem {
  end: number;
  index: number;
  start: number;
}

/**
 * Greedy interval-graph column packing for time-overlapping items.
 *
 * Assigns each item a `laneIndex` (column) and a `laneCount` (how many columns
 * its overlap cluster needs at its densest point), returning an array **aligned
 * to the input order**.
 *
 * Rules of overlap (both deliberately use a half-open comparison so that
 * back-to-back items where `previous.end === next.start` are treated as **not
 * overlapping** — they reuse a column and start a fresh cluster):
 *
 * - **Columns:** keep the running `end` of each open column. An item takes the
 *   first column whose `end <= item.start`; otherwise a new column is opened.
 * - **Clusters:** walking by start time, an item whose `start >= clusterMaxEnd`
 *   begins a new cluster; otherwise it extends the current one. Every item in a
 *   cluster gets `laneCount = (max laneIndex in that cluster) + 1`.
 *
 * Zero/negative-duration items (`end <= start`) are treated as a tiny positive
 * span for ordering only (an epsilon added to `start`): they never collapse the
 * sort and never throw, but two coincident points still cluster together.
 */
export function assignLanes(items: ReadonlyArray<{ end: Date; start: Date }>): LanePosition[] {
  // A tiny positive epsilon used to give zero/negative-duration items a stable,
  // strictly-positive span so ordering and cluster maths stay well-defined.
  const EPSILON = 1;

  const tagged: TaggedItem[] = items.map((item, index) => {
    const start = item.start.getTime();
    const rawEnd = item.end.getTime();
    return {
      end: rawEnd > start ? rawEnd : start + EPSILON,
      index,
      start,
    };
  });

  // Sort copies by start asc, tie-break end asc; the original position is kept
  // on `index` so results can be mapped back to input order at the end.
  const sorted = [...tagged].sort(
    (left, right) => left.start - right.start || left.end - right.end
  );

  const result: LanePosition[] = new Array<LanePosition>(items.length);

  // Running end of every open column.
  const columnEnds: number[] = [];

  // Cluster tracking. A cluster is a maximal run (by start order) of items that
  // transitively overlap; `clusterMembers` holds the indices into `result` so we
  // can back-fill `laneCount` once the cluster's max column is known.
  let clusterMaxEnd = Number.NEGATIVE_INFINITY;
  let clusterMaxLane = -1;
  let clusterMembers: number[] = [];

  const flushCluster = (): void => {
    const laneCount = clusterMaxLane + 1;
    for (const memberIndex of clusterMembers) {
      result[memberIndex].laneCount = laneCount;
    }
    clusterMembers = [];
    clusterMaxLane = -1;
  };

  for (const item of sorted) {
    // Start a new cluster when this item does not overlap the current one. `>=`
    // means a back-to-back item (start === previous max end) opens a new cluster.
    if (item.start >= clusterMaxEnd) {
      flushCluster();
      clusterMaxEnd = item.end;
    } else {
      clusterMaxEnd = Math.max(clusterMaxEnd, item.end);
    }

    // Find the first column whose end is at or before this start (`<=` so a
    // back-to-back item reuses the freed column), else open a new one.
    let laneIndex = columnEnds.findIndex(columnEnd => columnEnd <= item.start);
    if (laneIndex === -1) {
      laneIndex = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[laneIndex] = item.end;
    }

    result[item.index] = { laneCount: 1, laneIndex };
    clusterMembers.push(item.index);
    clusterMaxLane = Math.max(clusterMaxLane, laneIndex);
  }

  flushCluster();

  return result;
}
