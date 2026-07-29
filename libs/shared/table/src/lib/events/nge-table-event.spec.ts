import type { NgeTableEventKind } from './nge-table-event';

import { NGE_TABLE_EVENT_KINDS } from './nge-table-event';

/**
 * A kind on the union with no entry in {@link NGE_TABLE_EVENT_KINDS} resolves
 * this to that kind rather than to `never` — which is what makes the assertion
 * below stop compiling.
 *
 * The other direction is already covered in the source: `NGE_TABLE_EVENT_KINDS`
 * carries `satisfies readonly NgeTableEventKind[]`, so an entry that is *not* a
 * kind fails there. Together the pair means the list and the union cannot drift.
 */
type MissingKind = Exclude<NgeTableEventKind, (typeof NGE_TABLE_EVENT_KINDS)[number]>;

describe('NGE_TABLE_EVENT_KINDS', () => {
  // The half of "adding a kind is a union member plus an emit site" that a test
  // can hold: the member cannot be added and then quietly go missing from every
  // consumer's log, filter, or debug panel.
  it('lists every kind on the union — one added without an entry fails to compile', () => {
    const missing: never[] = [] as MissingKind[];

    expect(missing).toEqual([]);
  });

  it('is unique and sorted, so a consumer can render it as-is', () => {
    expect(new Set(NGE_TABLE_EVENT_KINDS).size).toBe(NGE_TABLE_EVENT_KINDS.length);
    expect([...NGE_TABLE_EVENT_KINDS]).toEqual([...NGE_TABLE_EVENT_KINDS].sort());
  });
});
