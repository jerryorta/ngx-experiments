import { clampDomain, isDegenerateSpan, panDomain, zoomDomain } from './gesture-domain-math';

describe('gesture-domain-math', () => {
  describe('zoomDomain', () => {
    it('halves the span around a centered focus (factor 2)', () => {
      expect(zoomDomain([0, 100], 50, 2)).toEqual([25, 75]);
    });

    it('keeps an off-center focus anchored', () => {
      // [f - (f - d0)/k, f + (d1 - f)/k]
      expect(zoomDomain([0, 100], 20, 2)).toEqual([10, 60]);
    });

    it('zooms out (factor < 1) by widening the span', () => {
      expect(zoomDomain([25, 75], 50, 0.5)).toEqual([0, 100]);
    });

    it('round-trips under reciprocal factors about the same focus', () => {
      const zoomed = zoomDomain([0, 100], 30, 4);
      expect(zoomDomain(zoomed, 30, 0.25)).toEqual([0, 100]);
    });
  });

  describe('panDomain', () => {
    it('shifts the domain against the drag delta (content follows cursor)', () => {
      expect(panDomain([0, 100], 10)).toEqual([-10, 90]);
    });

    it('pans the other way for a negative delta', () => {
      expect(panDomain([0, 100], -5)).toEqual([5, 105]);
    });

    it('preserves the span width', () => {
      const [a, b] = panDomain([12, 20], 3);
      expect(b - a).toBe(8);
    });
  });

  describe('isDegenerateSpan', () => {
    it('flags a span collapsed below 1e-6 of the reference', () => {
      const collapsed = zoomDomain([0, 100], 50, 1e12);
      expect(isDegenerateSpan(collapsed, [0, 100])).toBe(true);
    });

    it('accepts an ordinary zoom-in', () => {
      expect(isDegenerateSpan([25, 75], [0, 100])).toBe(false);
    });

    it('treats exactly-at-epsilon as non-degenerate (strict <)', () => {
      // reference span 100 → minSpan 1e-4; a span of exactly 1e-4 is NOT < minSpan
      expect(isDegenerateSpan([0, 1e-4], [0, 100])).toBe(false);
    });
  });

  describe('clampDomain', () => {
    it('leaves a window already inside the full domain untouched', () => {
      expect(clampDomain([20, 40], [0, 100])).toEqual([20, 40]);
    });

    it('snaps a span wider than the full domain to the full domain (zoom-out floor)', () => {
      expect(clampDomain([-10, 110], [0, 100])).toEqual([0, 100]);
    });

    it('treats an exactly-full span as the floor', () => {
      expect(clampDomain([0, 100], [0, 100])).toEqual([0, 100]);
    });

    it('caps a widening zoom-out at 100% (composed with zoomDomain)', () => {
      // zoomDomain widens [0,100] to [-50,150]; the clamp floors it back to full
      expect(clampDomain(zoomDomain([0, 100], 50, 0.5), [0, 100])).toEqual([0, 100]);
    });

    it('slides a window shoved past the low edge back in, preserving span', () => {
      expect(clampDomain([-30, -10], [0, 100])).toEqual([0, 20]);
    });

    it('slides a window shoved past the high edge back in, preserving span', () => {
      expect(clampDomain([90, 130], [0, 100])).toEqual([60, 100]);
    });

    it('stops a pan at the edge with span preserved (composed with panDomain)', () => {
      // panning [60,80] right (negative delta) lands at [100,120]; clamp pins it to [80,100]
      const clamped = clampDomain(panDomain([60, 80], -40), [0, 100]);
      expect(clamped).toEqual([80, 100]);
      expect(clamped[1] - clamped[0]).toBe(20);
    });

    it('normalizes a full domain passed high-to-low', () => {
      expect(clampDomain([20, 40], [100, 0])).toEqual([20, 40]);
    });

    it('clamps within a negative / time-like domain', () => {
      expect(clampDomain([-150, -50], [-100, 100])).toEqual([-100, 0]);
    });
  });
});
