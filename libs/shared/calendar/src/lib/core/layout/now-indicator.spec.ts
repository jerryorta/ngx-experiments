import { nowLineOffsetPct } from './now-indicator';

/** A local-time Date at `h:m` on a fixed day (the helper only reads h/m). */
function at(hour: number, minute = 0): Date {
  return new Date(2026, 5, 15, hour, minute);
}

describe('nowLineOffsetPct', () => {
  it('returns 0 at the exact window start', () => {
    expect(nowLineOffsetPct(at(8), 8, 20)).toBe(0);
  });

  it('returns 100 at the exact window end', () => {
    expect(nowLineOffsetPct(at(20), 8, 20)).toBe(100);
  });

  it('returns the linear percentage at the window midpoint', () => {
    // 14:00 is halfway through an 08:00–20:00 (12h) window.
    expect(nowLineOffsetPct(at(14), 8, 20)).toBe(50);
  });

  it('accounts for minutes, not just whole hours', () => {
    // 09:30 within a 09:00–11:00 (120m) window → 30/120 = 25%.
    expect(nowLineOffsetPct(at(9, 30), 9, 11)).toBe(25);
  });

  it('returns null before the window start', () => {
    expect(nowLineOffsetPct(at(7, 59), 8, 20)).toBeNull();
  });

  it('returns null after the window end', () => {
    expect(nowLineOffsetPct(at(20, 1), 8, 20)).toBeNull();
  });

  it('returns null for a zero-height window', () => {
    expect(nowLineOffsetPct(at(8), 8, 8)).toBeNull();
  });

  it('spans the full day for an 0–24 window', () => {
    expect(nowLineOffsetPct(at(0), 0, 24)).toBe(0);
    expect(nowLineOffsetPct(at(12), 0, 24)).toBe(50);
  });
});
