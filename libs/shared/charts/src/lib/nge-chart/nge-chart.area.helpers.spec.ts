import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeAreaDataPoint, NgeAreaLayerConfig, NgeChartConfig } from '../core/config';

import { renderAreaLayer } from '../layers/area';
import { buildAreaSeries, createAreaChartScales } from './nge-chart.area.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Build a minimal single-area-layer chart config for the scale factory. */
function areaConfig(
  data: NgeAreaDataPoint[],
  stackOffset?: NgeAreaLayerConfig['stackOffset']
): NgeChartConfig {
  const layer: NgeAreaLayerConfig = {
    data,
    renderer: renderAreaLayer,
    stackOffset,
    type: 'area',
  };
  return { layers: [layer] };
}

describe('buildAreaSeries', () => {
  it('returns an empty result with a [0, 1] extent for no data', () => {
    expect(buildAreaSeries([])).toEqual({ extent: [0, 1], series: [] });
  });

  describe('overlaid (no stackOffset)', () => {
    it('rises a single series from a zero baseline', () => {
      const data: NgeAreaDataPoint[] = [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 },
      ];

      const result = buildAreaSeries(data);

      expect(result.series).toHaveLength(1);
      expect(result.series[0].id).toBe('__default__');
      expect(result.series[0].index).toBe(0);
      expect(result.series[0].bands).toEqual([
        { x: 0, y0: 0, y1: 10 },
        { x: 1, y0: 0, y1: 20 },
        { x: 2, y0: 0, y1: 15 },
      ]);
      expect(result.extent).toEqual([0, 20]);
    });

    it('overlays multi-series from a shared zero baseline (no summing)', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'A', x: 1, y: 10 },
        { seriesId: 'B', x: 0, y: 20 },
        { seriesId: 'B', x: 1, y: 5 },
      ];

      const result = buildAreaSeries(data);

      expect(result.series.map(s => s.id)).toEqual(['A', 'B']);
      expect(result.series[0].bands.every(b => b.y0 === 0)).toBe(true);
      expect(result.series[1].bands.every(b => b.y0 === 0)).toBe(true);
      // Overlaid extent is the tallest single band, NOT the stacked total.
      expect(result.extent).toEqual([0, 20]);
    });
  });

  describe('stacked', () => {
    const stackedData: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 10 },
      { seriesId: 'A', x: 1, y: 10 },
      { seriesId: 'B', x: 0, y: 20 },
      { seriesId: 'B', x: 1, y: 5 },
    ];

    it('stacks 2+ series with offset "none" from a zero baseline', () => {
      const result = buildAreaSeries(stackedData, 'none');

      expect(result.series[0].bands).toEqual([
        { x: 0, y0: 0, y1: 10 },
        { x: 1, y0: 0, y1: 10 },
      ]);
      expect(result.series[1].bands).toEqual([
        { x: 0, y0: 10, y1: 30 },
        { x: 1, y0: 10, y1: 15 },
      ]);
      // Extent covers the stacked total, not the tallest single band.
      expect(result.extent).toEqual([0, 30]);
    });

    it('normalises each column to [0, 1] with offset "expand" (100%)', () => {
      const result = buildAreaSeries(stackedData, 'expand');

      expect(result.extent).toEqual([0, 1]);
      // Column x=0 totals 30 → A occupies [0, 1/3].
      expect(result.series[0].bands[0].y0).toBe(0);
      expect(result.series[0].bands[0].y1).toBeCloseTo(1 / 3, 10);
    });

    it('shifts the baseline off zero with offset "wiggle" (streamgraph)', () => {
      const result = buildAreaSeries(stackedData, 'wiggle');

      // Wiggle centres the stack: the first series' second column baseline is
      // lifted off zero (2.5 for this data), unlike offset "none".
      expect(result.series[0].bands[1].y0).toBeCloseTo(2.5, 10);
      expect(result.extent).toEqual([0, 30]);
    });

    it('splits positives above / negatives below zero with offset "diverging"', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'B', x: 0, y: -5 },
      ];

      const result = buildAreaSeries(data, 'diverging');

      expect(result.series[0].bands[0]).toEqual({ x: 0, y0: 0, y1: 10 });
      expect(result.series[1].bands[0]).toEqual({ x: 0, y0: -5, y1: 0 });
      expect(result.extent).toEqual([-5, 10]);
    });

    it('does not stack a single series even with a stackOffset', () => {
      const data: NgeAreaDataPoint[] = [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ];

      const result = buildAreaSeries(data, 'none');

      expect(result.series).toHaveLength(1);
      expect(result.series[0].bands.every(b => b.y0 === 0)).toBe(true);
      expect(result.extent).toEqual([0, 20]);
    });

    it('fills a missing (series, x) cell with 0 as a zero-height segment', () => {
      // A has points at x=0,1,2; B only at x=0,2. The long→wide pivot fills the
      // missing (B, x=1) cell with 0, so B's band at x=1 is a zero-height segment
      // (y0 === y1) sitting on A's cumulative top (12).
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'A', x: 1, y: 12 },
        { seriesId: 'A', x: 2, y: 8 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'B', x: 2, y: 7 },
      ];

      const result = buildAreaSeries(data, 'none');

      expect(result.series[1].id).toBe('B');
      expect(result.series[1].bands).toEqual([
        { x: 0, y0: 10, y1: 15 },
        { x: 1, y0: 12, y1: 12 },
        { x: 2, y0: 8, y1: 15 },
      ]);
    });
  });

  describe('range (y0)', () => {
    it('bands each point between its y0 and y', () => {
      const data: NgeAreaDataPoint[] = [
        { x: 0, y: 14, y0: 8 },
        { x: 1, y: 16, y0: 9 },
      ];

      const result = buildAreaSeries(data);

      expect(result.series[0].bands).toEqual([
        { x: 0, y0: 8, y1: 14 },
        { x: 1, y0: 9, y1: 16 },
      ]);
      expect(result.extent).toEqual([8, 16]);
    });

    it('wins over stacking — y0 points never stack', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 6, y0: 2 },
        { seriesId: 'B', x: 0, y: 9, y0: 4 },
      ];

      const result = buildAreaSeries(data, 'none');

      expect(result.series[0].bands[0]).toEqual({ x: 0, y0: 2, y1: 6 });
      expect(result.series[1].bands[0]).toEqual({ x: 0, y0: 4, y1: 9 });
      expect(result.extent).toEqual([2, 9]);
    });
  });
});

describe('createAreaChartScales', () => {
  it('returns default scales when there are no area layers', () => {
    const scales = createAreaChartScales({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('derives a linear x domain and zero-baseline y domain for overlaid numeric x', () => {
    const scales = createAreaChartScales(
      areaConfig([
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 },
      ]),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual([0, 2]);
    expect(scales.y.domain()).toEqual([0, 20]);
  });

  it('builds a point-scale x domain from unique string values', () => {
    const scales = createAreaChartScales(
      areaConfig([
        { x: 'Jan', y: 10 },
        { x: 'Feb', y: 20 },
        { x: 'Mar', y: 15 },
      ]),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('covers the stacked total in the y domain', () => {
    const scales = createAreaChartScales(
      areaConfig(
        [
          { seriesId: 'A', x: 0, y: 10 },
          { seriesId: 'A', x: 1, y: 10 },
          { seriesId: 'B', x: 0, y: 20 },
          { seriesId: 'B', x: 1, y: 5 },
        ],
        'none'
      ),
      DIMENSIONS
    );

    expect(scales.y.domain()).toEqual([0, 30]);
  });

  it('clamps the y domain to [0, 1] for expand (100%)', () => {
    const scales = createAreaChartScales(
      areaConfig(
        [
          { seriesId: 'A', x: 0, y: 10 },
          { seriesId: 'B', x: 0, y: 20 },
        ],
        'expand'
      ),
      DIMENSIONS
    );

    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('spans [minY0, maxY] for range bands', () => {
    const scales = createAreaChartScales(
      areaConfig([
        { x: 0, y: 14, y0: 8 },
        { x: 1, y: 16, y0: 9 },
      ]),
      DIMENSIONS
    );

    expect(scales.y.domain()).toEqual([8, 16]);
  });

  it('honours explicit xDomain / yDomain overrides', () => {
    const scales = createAreaChartScales(
      areaConfig([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
      ]),
      DIMENSIONS,
      { xDomain: [1, 4], yDomain: [0, 100] }
    );

    expect(scales.x.domain()).toEqual([1, 4]);
    expect(scales.y.domain()).toEqual([0, 100]);
  });

  it('runs the y domain below zero for wiggle (centered streamgraph baseline)', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 1 },
      { seriesId: 'B', x: 0, y: 1 },
      { seriesId: 'A', x: 1, y: 9 },
      { seriesId: 'B', x: 1, y: 1 },
      { seriesId: 'A', x: 2, y: 1 },
      { seriesId: 'B', x: 2, y: 1 },
    ];

    const scales = createAreaChartScales(areaConfig(data, 'wiggle'), DIMENSIONS);

    // Factory derives its y domain from the wiggle-aware extent — which dips below
    // zero, unlike offset "none" ([0, 10]) for the same data.
    expect(scales.y.domain()).toEqual(buildAreaSeries(data, 'wiggle').extent);
    expect(scales.y.domain()[0]).toBeLessThan(0);
  });

  it('spans negatives-below / positives-above zero for diverging', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 10 },
      { seriesId: 'B', x: 0, y: -5 },
    ];

    const scales = createAreaChartScales(areaConfig(data, 'diverging'), DIMENSIONS);

    expect(scales.y.domain()).toEqual([-5, 10]);
  });
});
