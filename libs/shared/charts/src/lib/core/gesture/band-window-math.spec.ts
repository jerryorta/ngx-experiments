import {
  applyBandWindowOp,
  brushBandWindow,
  clampBandWindow,
  orderedBandCategories,
  panBandWindow,
  zoomBandWindow,
} from './band-window-math';

describe('band-window-math', () => {
  describe('clampBandWindow', () => {
    it('leaves an in-bounds window untouched', () => {
      expect(clampBandWindow([2, 5], 10)).toEqual([2, 5]);
    });

    it('slides a left-overflow window back in, preserving span', () => {
      expect(clampBandWindow([-3, 1], 10)).toEqual([0, 4]);
    });

    it('slides a right-overflow window back in, preserving span', () => {
      expect(clampBandWindow([8, 12], 10)).toEqual([5, 9]);
    });

    it('collapses a span ≥ count to the full range', () => {
      expect(clampBandWindow([-2, 20], 10)).toEqual([0, 9]);
    });
  });

  describe('zoomBandWindow', () => {
    it('zooms in around the first index (factor 2)', () => {
      expect(zoomBandWindow([0, 9], 10, 2, 0)).toEqual([0, 4]);
    });

    it('zooms in around the last index', () => {
      expect(zoomBandWindow([0, 9], 10, 2, 9)).toEqual([5, 9]);
    });

    it('zooms in around a middle anchor, keeping it roughly centered', () => {
      expect(zoomBandWindow([0, 9], 10, 2, 5)).toEqual([3, 7]);
    });

    it('zooms out (factor < 1) back toward the full range', () => {
      expect(zoomBandWindow([3, 7], 10, 0.5, 5)).toEqual([0, 9]);
    });

    it('never goes below a single visible category', () => {
      const [start, end] = zoomBandWindow([4, 5], 10, 100, 4);
      expect(end - start).toBe(0);
    });
  });

  describe('panBandWindow', () => {
    it('shifts the window by whole categories', () => {
      expect(panBandWindow([2, 5], 10, 2)).toEqual([4, 7]);
    });

    it('stops at the right edge, preserving span', () => {
      expect(panBandWindow([6, 9], 10, 5)).toEqual([6, 9]);
    });

    it('stops at the left edge, preserving span', () => {
      expect(panBandWindow([1, 4], 10, -5)).toEqual([0, 3]);
    });
  });

  describe('brushBandWindow', () => {
    it('normalizes a reversed selection', () => {
      expect(brushBandWindow([7, 3], 10)).toEqual([3, 7]);
    });

    it('clamps out-of-range endpoints', () => {
      expect(brushBandWindow([-2, 4], 10)).toEqual([0, 4]);
    });

    it('supports a single-category selection', () => {
      expect(brushBandWindow([5, 5], 10)).toEqual([5, 5]);
    });
  });

  describe('applyBandWindowOp', () => {
    it('maps a zoom op (fraction → anchor index) onto the window', () => {
      expect(applyBandWindowOp({ anchorFraction: 0, factor: 2, type: 'zoom' }, [0, 9], 10)).toEqual(
        [0, 4]
      );
    });

    it('maps a pan op straight through', () => {
      expect(applyBandWindowOp({ deltaCategories: 2, type: 'pan' }, [2, 5], 10)).toEqual([4, 7]);
    });

    it('maps a brush op (fractions → indices relative to the current window)', () => {
      // window [0,9], fromFraction 0 → 0, toFraction 0.5 → round(4.5)=5
      expect(
        applyBandWindowOp({ fromFraction: 0, toFraction: 0.5, type: 'brush' }, [0, 9], 10)
      ).toEqual([0, 5]);
    });

    it('brushes relative to an already-zoomed window', () => {
      // window [2,7] (6 visible): from 0 → 2, to 1 → 2 + round(1*5) = 7
      expect(
        applyBandWindowOp({ fromFraction: 0, toFraction: 1, type: 'brush' }, [2, 7], 10)
      ).toEqual([2, 7]);
    });
  });

  describe('orderedBandCategories', () => {
    it('returns unique keys in first-occurrence order', () => {
      const data = [{ k: 'b' }, { k: 'a' }, { k: 'b' }, { k: 'c' }, { k: 'a' }];
      expect(orderedBandCategories(data, d => d.k)).toEqual(['b', 'a', 'c']);
    });

    it('is empty for empty input', () => {
      expect(orderedBandCategories([], (d: { k: string }) => d.k)).toEqual([]);
    });
  });
});
