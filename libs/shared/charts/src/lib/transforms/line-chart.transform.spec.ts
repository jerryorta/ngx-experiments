import type { ScaleLinear, ScaleTime } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeLineDataPoint, NgeLineLayerConfig } from '../core/config';

import { NgeLineChartTransform } from './line-chart.transform';

const dimensions: NgeChartDimensions = {
  boundedHeight: 100,
  boundedWidth: 200,
  height: 130,
  margin: { bottom: 20, left: 30, right: 10, top: 10 },
  width: 240,
};

/** Narrow the first layer to a line layer config for assertions. */
function lineLayer(config: NgeChartConfig): NgeLineLayerConfig {
  return config.layers[0] as NgeLineLayerConfig;
}

function xDomainOf(config: NgeChartConfig): number[] {
  return (config.scaleFactory!(config, dimensions).x as ScaleLinear<number, number>).domain();
}

describe('NgeLineChartTransform', () => {
  // Numeric x → linear scale; the line helper does NOT pad numeric x, so the
  // data-driven domain is exactly [minX, maxX].
  const data: NgeLineDataPoint[] = [
    { x: 1, y: 10 },
    { x: 2, y: 12 },
    { x: 3, y: 20 },
    { x: 4, y: 30 },
  ];

  it('passes data through with the data-driven domain by default', () => {
    const transform = new NgeLineChartTransform({ data });
    expect(xDomainOf(transform.config())).toEqual([1, 4]);
  });

  describe('onChartGesture (continuous)', () => {
    // Gesture MATH is exercised against an explicit full domain so the clamp bound
    // is a clean [0, 100] (an explicit xDomain/yDomain wins over the data extent
    // in the transform's clamp). Events stay inside it, so these assertions read
    // the raw gesture math; the clamp itself gets its own tests below.
    const bounded = (): NgeLineChartTransform =>
      new NgeLineChartTransform({ data, xDomain: [0, 100], yDomain: [0, 100] });

    it('zoom halves the span around the focus (factor 2) and suppresses animation', () => {
      const transform = bounded();

      transform.onChartGesture({
        factor: 2,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      expect(xDomainOf(transform.config())).toEqual([25, 75]);
      expect(lineLayer(transform.config()).animationMs).toBe(0);
    });

    it('pan shifts the domain against the drag delta (content follows cursor)', () => {
      const transform = bounded();

      // A zoomed-in window so the pan moves within bounds — panning at 100% is a
      // no-op (the clamp keeps the window on the data).
      transform.onChartGesture({
        kind: 'pan',
        xDelta: 10,
        xDomain: [20, 60],
        yDelta: -5,
        yDomain: [20, 60],
      });

      expect(xDomainOf(transform.config())).toEqual([10, 50]);
      expect(lineLayer(transform.config()).animationMs).toBe(0);
    });

    it('zoom-rect sets the domain to the brushed extent and ANIMATES (discrete)', () => {
      const transform = bounded();
      // Prior continuous gesture left animation suppressed
      transform.onChartGesture({
        kind: 'pan',
        xDelta: 1,
        xDomain: [0, 100],
        yDelta: 0,
        yDomain: [0, 100],
      });
      expect(lineLayer(transform.config()).animationMs).toBe(0);

      transform.onChartGesture({ kind: 'zoom-rect', xExtent: [20, 60], yExtent: [30, 70] });

      expect(xDomainOf(transform.config())).toEqual([20, 60]);
      expect(lineLayer(transform.config()).animationMs).toBeUndefined();
    });

    it('reset restores the data-driven domain and re-enables animation', () => {
      const transform = new NgeLineChartTransform({ data });
      transform.onChartGesture({
        factor: 2,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      transform.onChartGesture({ kind: 'reset' });

      expect(xDomainOf(transform.config())).toEqual([1, 4]);
      expect(lineLayer(transform.config()).animationMs).toBeUndefined();
    });

    it('ignores zoom events that would collapse the domain to a degenerate span', () => {
      const transform = new NgeLineChartTransform({ data });
      transform.setXDomain([0, 100]);
      transform.setYDomain([0, 100]);

      transform.onChartGesture({
        factor: 1e12,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      expect(xDomainOf(transform.config())).toEqual([0, 100]);
    });

    it('caps wheel-zoom-out at the full data domain (100% floor)', () => {
      const transform = bounded();

      // factor < 1 would widen past the full [0, 100] domain — clamp floors it
      transform.onChartGesture({
        factor: 0.5,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      expect(xDomainOf(transform.config())).toEqual([0, 100]);
    });

    it('stops a pan at the data edge with the zoom span preserved', () => {
      const transform = bounded();

      // A zoomed window dragged past the right edge: panDomain → [100, 120]
      transform.onChartGesture({
        kind: 'pan',
        xDelta: -30,
        xDomain: [70, 90],
        yDelta: 0,
        yDomain: [70, 90],
      });

      // clamped to the edge, span (20) preserved
      expect(xDomainOf(transform.config())).toEqual([80, 100]);
    });
  });

  describe('time-x continuous zoom (epoch-ms domains)', () => {
    const t0 = new Date('2026-01-01T00:00:00Z').getTime();
    const day = 86_400_000;
    const timeData: NgeLineDataPoint[] = [0, 1, 2, 3].map(i => ({
      x: new Date(t0 + i * day),
      y: i * 10,
    }));

    it('zoom on a time axis yields a numeric epoch-ms domain mapped back to Dates', () => {
      const transform = new NgeLineChartTransform({ data: timeData });

      // A wheel-zoom whose renderer-supplied domain/focus are epoch ms
      transform.onChartGesture({
        factor: 2,
        focus: { x: t0 + 1.5 * day, y: 15 },
        kind: 'zoom',
        xDomain: [t0, t0 + 3 * day],
        yDomain: [0, 30],
      });

      const xScale = transform.config().scaleFactory!(transform.config(), dimensions)
        .x as ScaleTime<number, number>;
      const domain = xScale.domain();

      // No NaN, no string concatenation (the Date + number hazard) — real Dates
      expect(domain[0] instanceof Date).toBe(true);
      // zoomDomain([t0, t0+3d], t0+1.5d, 2) = [t0 + 0.75d, t0 + 2.25d]
      expect(domain.map(d => +d)).toEqual([t0 + 0.75 * day, t0 + 2.25 * day]);
    });
  });

  describe('categorical-x band-window gestures', () => {
    const catData: NgeLineDataPoint[] = ['a', 'b', 'c', 'd', 'e'].map((x, i) => ({
      x,
      y: (i + 1) * 10,
    }));

    function visibleX(config: NgeChartConfig): string[] {
      return (lineLayer(config).data as NgeLineDataPoint[]).map(d => String(d.x));
    }

    it('wheel-zoom windows the category axis and suppresses animation', () => {
      const transform = new NgeLineChartTransform({ data: catData });

      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      expect(visibleX(transform.config())).toEqual(['a', 'b', 'c']);
      expect(lineLayer(transform.config()).animationMs).toBe(0);
    });

    it('pan shifts the window by whole categories once zoomed in', () => {
      const transform = new NgeLineChartTransform({ data: catData });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { deltaCategories: 1, type: 'pan' },
      });

      expect(visibleX(transform.config())).toEqual(['b', 'c', 'd']);
    });

    it('reset restores all categories', () => {
      const transform = new NgeLineChartTransform({ data: catData });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      transform.onChartGesture({ kind: 'reset' });

      expect(visibleX(transform.config())).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
  });
});
