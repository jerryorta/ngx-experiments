import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeScatterDataPoint, NgeScatterLayerConfig } from '../core/config';

import { clampDomain } from '../core/gesture';
import { computeScatterXDataDomain, computeScatterYDataDomain } from '../presets/scatter-chart.preset';
import { NgeScatterChartTransform } from './scatter-chart.transform';

/** Narrow the first layer to a scatter layer config for assertions. */
function scatterLayer(config: NgeChartConfig): NgeScatterLayerConfig {
  return config.layers[0] as NgeScatterLayerConfig;
}

const dimensions: NgeChartDimensions = {
  boundedHeight: 100,
  boundedWidth: 200,
  height: 130,
  margin: { bottom: 20, left: 30, right: 10, top: 10 },
  width: 240,
};

function xDomainOf(config: NgeChartConfig): number[] {
  return (config.scaleFactory!(config, dimensions).x as ScaleLinear<number, number>).domain();
}

function yDomainOf(config: NgeChartConfig): number[] {
  return (config.scaleFactory!(config, dimensions).y as ScaleLinear<number, number>).domain();
}

describe('NgeScatterChartTransform', () => {
  const a0: NgeScatterDataPoint = { seriesId: 'A', x: 1, y: 10 };
  const a1: NgeScatterDataPoint = { color: '#ff0000', seriesId: 'A', x: 2, y: 12 };
  const b0: NgeScatterDataPoint = { opacity: 0.9, seriesId: 'B', x: 3, y: 20 };
  const c0: NgeScatterDataPoint = { seriesId: 'C', x: 4, y: 30 };
  const data: NgeScatterDataPoint[] = [a0, a1, b0, c0];

  function createTransform(
    overrides: Partial<ConstructorParameters<typeof NgeScatterChartTransform>[0]> = {}
  ): NgeScatterChartTransform {
    return new NgeScatterChartTransform({ data, ...overrides });
  }

  describe('no selection (pass-through)', () => {
    it('passes the data through untouched', () => {
      const transform = createTransform();

      expect(scatterLayer(transform.config()).data).toBe(data);
      expect(transform.selectedSeries()).toBeNull();
    });

    it('forces an enabled, interactive legend with one identified item per series', () => {
      const transform = createTransform();
      const legend = transform.config().legend;

      expect(legend?.enabled).toBe(true);
      expect(legend?.interactive).toBe(true);
      expect(legend?.items.map(item => ({ id: item.id, selected: item.selected }))).toEqual([
        { id: 'A', selected: false },
        { id: 'B', selected: false },
        { id: 'C', selected: false },
      ]);
      expect(legend?.items.every(item => item.opacity === undefined)).toBe(true);
    });
  });

  describe('series selection', () => {
    it('fades non-selected series points and passes selected points through by reference', () => {
      const transform = createTransform();
      transform.selectSeries('B');

      const layerData = scatterLayer(transform.config()).data;

      // Selected series' point is the SAME object (own per-point opacity preserved)
      expect(layerData[2]).toBe(b0);
      expect(layerData[2].opacity).toBe(0.9);

      // Non-selected series' points are faded copies (default 0.15)
      expect(layerData[0]).not.toBe(a0);
      expect(layerData[0].opacity).toBe(0.15);
      expect(layerData[1].opacity).toBe(0.15);
      expect(layerData[3].opacity).toBe(0.15);

      // Fading never mutates the source data
      expect(a0.opacity).toBeUndefined();

      // Other per-point overrides survive the fade copy
      expect(layerData[1].color).toBe('#ff0000');
    });

    it('stamps legend items with selection state and fades the rest (default 0.4)', () => {
      const transform = createTransform();
      transform.selectSeries('B');

      const items = transform.config().legend!.items;

      expect(items.find(item => item.id === 'B')).toMatchObject({
        opacity: undefined,
        selected: true,
      });
      expect(items.find(item => item.id === 'A')).toMatchObject({ opacity: 0.4, selected: false });
      expect(items.find(item => item.id === 'C')).toMatchObject({ opacity: 0.4, selected: false });
    });

    it('respects custom fade opacities', () => {
      const transform = createTransform({ fadedLegendOpacity: 0.6, fadedPointOpacity: 0.05 });
      transform.selectSeries('A');

      const config = transform.config();
      expect(scatterLayer(config).data[2].opacity).toBe(0.05);
      expect(config.legend!.items.find(item => item.id === 'B')?.opacity).toBe(0.6);
    });

    it('toggles selection via onLegendItemClick (click again clears)', () => {
      const transform = createTransform();
      const itemB = transform.config().legend!.items.find(item => item.id === 'B')!;

      transform.onLegendItemClick(itemB);
      expect(transform.selectedSeries()).toBe('B');

      transform.onLegendItemClick(itemB);
      expect(transform.selectedSeries()).toBeNull();
      expect(scatterLayer(transform.config()).data).toBe(data);
    });

    it('clearSelection restores full prominence', () => {
      const transform = createTransform();
      transform.selectSeries('C');
      transform.clearSelection();

      expect(transform.selectedSeries()).toBeNull();
      expect(scatterLayer(transform.config()).data).toBe(data);
    });
  });

  describe('data refresh', () => {
    it('setData replaces the source data and regenerates the legend', () => {
      const transform = createTransform();
      const next: NgeScatterDataPoint[] = [
        { seriesId: 'X', x: 1, y: 1 },
        { seriesId: 'Y', x: 2, y: 2 },
      ];

      transform.setData(next);

      expect(scatterLayer(transform.config()).data).toBe(next);
      expect(transform.config().legend!.items.map(item => item.id)).toEqual(['X', 'Y']);
    });
  });

  describe('axis zoom (explicit domains)', () => {
    it('setXDomain drives the config scale domain; resetZoom restores data-driven', () => {
      const transform = createTransform();

      transform.setXDomain([10, 20]);
      expect(xDomainOf(transform.config())).toEqual([10, 20]);

      transform.resetZoom();
      // Data-driven again: x 1..4, padding 0.05 * 3 = 0.15 → [0.85, 4.15]
      const [min, max] = xDomainOf(transform.config());
      expect(min).toBeCloseTo(0.85);
      expect(max).toBeCloseTo(4.15);
    });

    it('zoom overrides win over constructor-provided domains', () => {
      const transform = createTransform({ xDomain: [0, 100] });

      expect(xDomainOf(transform.config())).toEqual([0, 100]);

      transform.setXDomain([40, 60]);
      expect(xDomainOf(transform.config())).toEqual([40, 60]);

      transform.setXDomain(null);
      expect(xDomainOf(transform.config())).toEqual([0, 100]);
    });
  });

  describe('range-axis focus clamps to the data extent (NGE-3 / ARCH-211)', () => {
    const wide: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 0, y: 0 },
      { seriesId: 'A', x: 300, y: 300 },
    ];
    const narrow: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 0, y: 0 },
      { seriesId: 'A', x: 100, y: 100 },
    ];

    it('re-clamps a preserved zoom inside the new full domain when the data extent shrinks', () => {
      const transform = createTransform({ data: wide, rangeAxisX: true, rangeAxisY: true });

      // Zoom into a slice valid for the WIDE extent — nothing to clamp yet.
      transform.setXDomain([200, 260]);
      transform.setYDomain([200, 260]);
      expect(xDomainOf(transform.config())).toEqual([200, 260]);
      expect(yDomainOf(transform.config())).toEqual([200, 260]);

      // The data shrinks (e.g. Randomize). The preserved focus now sits outside the
      // new extent; without the clamp the brush window would project past the ruler.
      transform.setData(narrow);

      expect(xDomainOf(transform.config())).toEqual(
        clampDomain([200, 260], computeScatterXDataDomain(narrow, 0.05))
      );
      expect(yDomainOf(transform.config())).toEqual(
        clampDomain([200, 260], computeScatterYDataDomain(narrow, 0.1, false))
      );
    });

    it('leaves an explicit out-of-extent override unclamped when no range axis is enabled', () => {
      const transform = createTransform({ data: narrow });

      // setXDomain is explicit control — a free axis-zoom honors it verbatim, even
      // outside the data extent (there is no brush window that could overflow).
      transform.setXDomain([200, 260]);
      expect(xDomainOf(transform.config())).toEqual([200, 260]);
    });
  });

  describe('external standalone legend', () => {
    it('exposes selection-stamped legendItems even when the chart legend is disabled', () => {
      const transform = createTransform({ legend: { enabled: false } });
      transform.selectSeries('B');

      // Chart-internal legend suppressed…
      expect(transform.config().legend).toBeUndefined();

      // …but the external feed stays populated with selection state
      const items = transform.legendItems();
      expect(items.map(item => item.id)).toEqual(['A', 'B', 'C']);
      expect(items.find(item => item.id === 'B')?.selected).toBe(true);
      expect(items.find(item => item.id === 'A')?.opacity).toBe(0.4);
    });

    it('mirrors the config legend items when the chart legend is enabled', () => {
      const transform = createTransform();
      transform.selectSeries('A');

      expect(transform.config().legend?.items).toEqual(transform.legendItems());
    });
  });

  describe('updateOptions', () => {
    it('merges partial options while preserving selection and zoom state', () => {
      const transform = createTransform();
      transform.selectSeries('B');
      transform.setXDomain([5, 6]);

      transform.updateOptions({ seriesColors: ['#123456'], xAxisLabel: 'Updated' });

      expect(transform.selectedSeries()).toBe('B');
      expect(xDomainOf(transform.config())).toEqual([5, 6]);
      expect(transform.legendItems()[0].color).toBe('#123456');
      expect(transform.config().base?.xAxisLabel).toBe('Updated');
    });
  });

  describe('onChartGesture', () => {
    // Gesture MATH is exercised against an explicit full domain so the clamp bound
    // is a clean [0, 100] (an explicit xDomain/yDomain wins over the padded data
    // extent in the transform's clamp). Events stay inside it, so these assertions
    // read the raw gesture math; the clamp itself is covered by the "caps"/"stops"
    // tests below and the clampDomain unit tests.
    const bounded = (): NgeScatterChartTransform =>
      createTransform({ xDomain: [0, 100], yDomain: [0, 100] });

    it('zoom halves the span around the focus (factor 2) and suppresses animation', () => {
      const transform = bounded();

      transform.onChartGesture({
        factor: 2,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      const config = transform.config();
      expect(xDomainOf(config)).toEqual([25, 75]);
      expect(scatterLayer(config).animationMs).toBe(0);
    });

    it('zoom keeps an off-center focus anchored', () => {
      const transform = bounded();

      transform.onChartGesture({
        factor: 2,
        focus: { x: 20, y: 80 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      // [f - (f - d0)/k, f + (d1 - f)/k]
      expect(xDomainOf(transform.config())).toEqual([10, 60]);
    });

    it('pan shifts both domains against the drag delta (content follows cursor)', () => {
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

      const config = transform.config();
      expect(xDomainOf(config)).toEqual([10, 50]);
      expect(scatterLayer(config).animationMs).toBe(0);
    });

    it('reset restores data-driven domains and re-enables animation', () => {
      const transform = createTransform();
      transform.onChartGesture({
        factor: 2,
        focus: { x: 50, y: 50 },
        kind: 'zoom',
        xDomain: [0, 100],
        yDomain: [0, 100],
      });

      transform.onChartGesture({ kind: 'reset' });

      const config = transform.config();
      // Data-driven again: x 1..4, padding 0.05 * 3 = 0.15 → [0.85, 4.15]
      const [min, max] = xDomainOf(config);
      expect(min).toBeCloseTo(0.85);
      expect(max).toBeCloseTo(4.15);
      expect(scatterLayer(config).animationMs).toBeUndefined();
    });

    it('selection changes re-enable animation after a gesture', () => {
      const transform = createTransform();
      transform.onChartGesture({
        kind: 'pan',
        xDelta: 1,
        xDomain: [0, 100],
        yDelta: 0,
        yDomain: [0, 100],
      });
      expect(scatterLayer(transform.config()).animationMs).toBe(0);

      transform.selectSeries('A');

      expect(scatterLayer(transform.config()).animationMs).toBeUndefined();
    });

    it('zoom-rect sets both domains to the brushed extents and ANIMATES (discrete action)', () => {
      const transform = bounded();
      // Prior continuous gesture left animation suppressed
      transform.onChartGesture({
        kind: 'pan',
        xDelta: 1,
        xDomain: [0, 100],
        yDelta: 0,
        yDomain: [0, 100],
      });
      expect(scatterLayer(transform.config()).animationMs).toBe(0);

      transform.onChartGesture({ kind: 'zoom-rect', xExtent: [20, 60], yExtent: [30, 70] });

      const config = transform.config();
      expect(xDomainOf(config)).toEqual([20, 60]);
      expect(scatterLayer(config).animationMs).toBeUndefined();
    });

    it('ignores zoom events that would collapse the domain to a degenerate span', () => {
      const transform = createTransform();
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

      // clamped back to the edge, span (20) preserved
      expect(xDomainOf(transform.config())).toEqual([80, 100]);
    });

    it('range-zoom (x) sets the x focus, suppresses animation, and leaves y untouched', () => {
      const transform = bounded();
      transform.setYDomain([5, 95]); // seed a y override to prove it survives

      transform.onChartGesture({ axis: 'x', domain: [10, 40], kind: 'range-zoom' });

      const config = transform.config();
      expect(xDomainOf(config)).toEqual([10, 40]);
      expect(yDomainOf(config)).toEqual([5, 95]); // untouched
      expect(scatterLayer(config).animationMs).toBe(0);
    });

    it('range-zoom (y) sets the y focus and leaves a seeded x override untouched', () => {
      const transform = bounded();
      transform.setXDomain([0, 100]); // seed an x override to prove it survives

      transform.onChartGesture({ axis: 'y', domain: [20, 80], kind: 'range-zoom' });

      const config = transform.config();
      expect(yDomainOf(config)).toEqual([20, 80]);
      expect(xDomainOf(config)).toEqual([0, 100]); // untouched
      expect(scatterLayer(config).animationMs).toBe(0);
    });

    it('reset (dbl-click) clears a range-zoom focus back to the data-driven domain', () => {
      const transform = createTransform();
      // Within the data-driven full extent [0.85, 4.15] so the focus is unclamped
      transform.onChartGesture({ axis: 'x', domain: [1.5, 3.5], kind: 'range-zoom' });
      expect(xDomainOf(transform.config())).toEqual([1.5, 3.5]);

      transform.onChartGesture({ kind: 'reset' });

      // Data-driven again: x 1..4, padding 0.05 * 3 = 0.15 → [0.85, 4.15]
      const [min, max] = xDomainOf(transform.config());
      expect(min).toBeCloseTo(0.85);
      expect(max).toBeCloseTo(4.15);
      expect(scatterLayer(transform.config()).animationMs).toBeUndefined();
    });
  });
});
