import { assignLanes } from './lane-layout';

/** Build a `{ start, end }` item from two ISO-ish local time strings. */
function item(start: string, end: string): { end: Date; start: Date } {
  return { end: new Date(end), start: new Date(start) };
}

describe('assignLanes', () => {
  it('returns an empty array for no items', () => {
    expect(assignLanes([])).toEqual([]);
  });

  it('places a single item in lane 0 with laneCount 1', () => {
    const result = assignLanes([item('2026-06-06T09:00:00', '2026-06-06T10:00:00')]);
    expect(result).toEqual([{ laneCount: 1, laneIndex: 0 }]);
  });

  it('puts two fully overlapping items in lanes 0 and 1 (laneCount 2)', () => {
    const result = assignLanes([
      item('2026-06-06T09:00:00', '2026-06-06T11:00:00'),
      item('2026-06-06T09:00:00', '2026-06-06T11:00:00'),
    ]);
    expect(result).toEqual([
      { laneCount: 2, laneIndex: 0 },
      { laneCount: 2, laneIndex: 1 },
    ]);
  });

  it('places three concurrent items in lanes 0/1/2 with laneCount 3', () => {
    const result = assignLanes([
      item('2026-06-06T09:00:00', '2026-06-06T12:00:00'),
      item('2026-06-06T09:00:00', '2026-06-06T12:00:00'),
      item('2026-06-06T09:00:00', '2026-06-06T12:00:00'),
    ]);
    expect(result).toEqual([
      { laneCount: 3, laneIndex: 0 },
      { laneCount: 3, laneIndex: 1 },
      { laneCount: 3, laneIndex: 2 },
    ]);
  });

  it('chains partial overlaps (A-B and B-C but not A-C) into one cluster of width 2', () => {
    // A: 09-10, B: 09:30-10:30, C: 10:15-11. A∩B, B∩C, but A∩C = ∅.
    // All three are transitively connected through B → single cluster.
    const a = item('2026-06-06T09:00:00', '2026-06-06T10:00:00');
    const b = item('2026-06-06T09:30:00', '2026-06-06T10:30:00');
    const c = item('2026-06-06T10:15:00', '2026-06-06T11:00:00');

    const result = assignLanes([a, b, c]);

    // A → lane 0; B overlaps A → lane 1; C does not overlap A (ended 10:00) so it
    // reuses lane 0. Densest point of the cluster is 2 → laneCount 2 everywhere.
    expect(result).toEqual([
      { laneCount: 2, laneIndex: 0 },
      { laneCount: 2, laneIndex: 1 },
      { laneCount: 2, laneIndex: 0 },
    ]);
  });

  it('treats back-to-back items (end === next start) as separate clusters, each laneCount 1', () => {
    const result = assignLanes([
      item('2026-06-06T09:00:00', '2026-06-06T10:00:00'),
      item('2026-06-06T10:00:00', '2026-06-06T11:00:00'),
    ]);
    expect(result).toEqual([
      { laneCount: 1, laneIndex: 0 },
      { laneCount: 1, laneIndex: 0 },
    ]);
  });

  it('nests a short item inside a long one (laneCount 2, lanes 0 and 1)', () => {
    const long = item('2026-06-06T09:00:00', '2026-06-06T17:00:00');
    const short = item('2026-06-06T12:00:00', '2026-06-06T13:00:00');
    const result = assignLanes([long, short]);
    expect(result).toEqual([
      { laneCount: 2, laneIndex: 0 },
      { laneCount: 2, laneIndex: 1 },
    ]);
  });

  it('packs N concurrent items into N lanes with laneCount N', () => {
    const n = 6;
    const items = Array.from({ length: n }, () =>
      item('2026-06-06T09:00:00', '2026-06-06T10:00:00')
    );
    const result = assignLanes(items);
    expect(result).toHaveLength(n);
    expect(result.every(position => position.laneCount === n)).toBe(true);
    expect(result.map(position => position.laneIndex).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it('returns results aligned to the (unsorted) input order', () => {
    // Provided out of chronological order: late, early, middle.
    const late = item('2026-06-06T11:00:00', '2026-06-06T12:00:00');
    const early = item('2026-06-06T09:00:00', '2026-06-06T11:30:00');
    const middle = item('2026-06-06T10:00:00', '2026-06-06T10:30:00');

    const result = assignLanes([late, early, middle]);

    // `early` spans the whole window → it is the cluster spine in lane 0.
    // `middle` overlaps early → lane 1. `late` overlaps early (early ends 11:30,
    // late starts 11:00) but not middle (ended 10:30) → reuses lane 1.
    // laneCount is 2 for the whole cluster. Crucially the array order matches the
    // INPUT order [late, early, middle], not the sorted order.
    expect(result).toEqual([
      { laneCount: 2, laneIndex: 1 },
      { laneCount: 2, laneIndex: 0 },
      { laneCount: 2, laneIndex: 1 },
    ]);
  });

  it('reuses a freed column within a cluster held open by a long spanning item', () => {
    // A spans the whole window and keeps the cluster open; B then C are back-to-back.
    // All three are one cluster (A overlaps both) → laneCount 2.
    const a = item('2026-06-06T09:00:00', '2026-06-06T12:00:00');
    const b = item('2026-06-06T09:00:00', '2026-06-06T10:00:00');
    const c = item('2026-06-06T10:00:00', '2026-06-06T11:00:00');

    // Sort is by start asc then END asc, so B (ends 10:00) is packed before A
    // (ends 12:00): B → lane 0, A → lane 1, then C reuses the freed lane 0.
    // Mapped back to input order [A, B, C] → [1, 0, 0].
    const result = assignLanes([a, b, c]);
    expect(result).toEqual([
      { laneCount: 2, laneIndex: 1 },
      { laneCount: 2, laneIndex: 0 },
      { laneCount: 2, laneIndex: 0 },
    ]);
  });

  it('does not throw for zero/negative-duration items and clusters coincident points', () => {
    // Two coincident zero-duration points + an overlapping span.
    const point1 = item('2026-06-06T09:00:00', '2026-06-06T09:00:00');
    const point2 = item('2026-06-06T09:00:00', '2026-06-06T09:00:00');
    const span = item('2026-06-06T09:00:00', '2026-06-06T10:00:00');

    let result: ReturnType<typeof assignLanes> = [];
    expect(() => {
      result = assignLanes([point1, point2, span]);
    }).not.toThrow();

    expect(result).toHaveLength(3);
    // All start at 09:00 so they cluster together; widest point is 3.
    expect(result.every(position => position.laneCount === 3)).toBe(true);
    expect(result.map(position => position.laneIndex).sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
});
