import { applyRadiusRatio } from './radial-radius.fns';

describe('applyRadiusRatio', () => {
  it('fills the plot when no ratio is configured', () => {
    // The historical behaviour of every radial layer, and what an existing chart that has
    // never heard of this option must keep doing.
    expect(applyRadiusRatio(200, undefined)).toBe(200);
  });

  it('scales the radius by the ratio', () => {
    expect(applyRadiusRatio(200, 0.75)).toBe(150);
    expect(applyRadiusRatio(200, 0.5)).toBe(100);
  });

  it('treats 1 as a no-op', () => {
    expect(applyRadiusRatio(200, 1)).toBe(200);
  });

  it('collapses the mark at 0 rather than throwing', () => {
    // A zero radius is degenerate but drawable — every layer already guards `max(0, …)`.
    expect(applyRadiusRatio(200, 0)).toBe(0);
  });

  it('clamps above 1, because a bigger mark would just be clipped', () => {
    // The layers group is clipped to the plot rect, so a ratio > 1 cannot grow the chart —
    // it would silently crop it. Clamping makes that impossible to ask for by accident.
    expect(applyRadiusRatio(200, 1.5)).toBe(200);
  });

  it('clamps below 0, which would otherwise invert the geometry', () => {
    expect(applyRadiusRatio(200, -0.5)).toBe(0);
  });

  it('ignores a non-finite ratio instead of poisoning the radius with NaN', () => {
    // A NaN radius propagates into every arc path and silently blanks the whole layer, so
    // this falls back to "fill the plot" rather than rendering nothing.
    expect(applyRadiusRatio(200, Number.NaN)).toBe(200);
    expect(applyRadiusRatio(200, Number.POSITIVE_INFINITY)).toBe(200);
  });
});
