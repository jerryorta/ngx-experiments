import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';

import { createBarChartScales } from '../nge-chart/nge-chart.bar.helpers';
import { NgeBarChartTransform } from './bar-chart.transform';

const dimensions: NgeChartDimensions = {
  boundedHeight: 100,
  boundedWidth: 200,
  height: 130,
  margin: { bottom: 20, left: 30, right: 10, top: 10 },
  width: 240,
};

function barLayer(config: NgeChartConfig): NgeBarLayerConfig {
  return config.layers[0] as NgeBarLayerConfig;
}

/** Visible categories of the vertical bar's band x-axis (from the windowed data). */
function visibleLabels(config: NgeChartConfig): string[] {
  return barLayer(config).data.map(d => d.label);
}

/** Value (y) axis domain — auto-fit to the visible window. */
function yDomain(config: NgeChartConfig): number[] {
  return (createBarChartScales(config, dimensions).y as ScaleLinear<number, number>).domain();
}

describe('NgeBarChartTransform', () => {
  const data: NgeBarDataPoint[] = [
    { label: 'a', value: 10 },
    { label: 'b', value: 20 },
    { label: 'c', value: 30 },
    { label: 'd', value: 40 },
    { label: 'e', value: 50 },
  ];

  it('shows all categories with the value axis fit to all bars by default', () => {
    const transform = new NgeBarChartTransform({ data });

    expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(yDomain(transform.config())[1]).toBeCloseTo(55); // 50 * 1.1 headroom
  });

  describe('band-window gestures', () => {
    it('wheel-zoom narrows the visible window and suppresses animation', () => {
      const transform = new NgeBarChartTransform({ data });

      // factor 2 anchored at the left edge → the first ~half of the categories
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c']);
      expect(barLayer(transform.config()).animationMs).toBe(0);
    });

    it('auto-fits the value axis to the visible window', () => {
      const transform = new NgeBarChartTransform({ data });

      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      // visible a,b,c → values 10,20,30 → max 30 * 1.1
      expect(yDomain(transform.config())[1]).toBeCloseTo(33);
    });

    it('pan shifts the window by whole categories once zoomed in', () => {
      const transform = new NgeBarChartTransform({ data });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });
      expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c']);

      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { deltaCategories: 1, type: 'pan' },
      });

      expect(visibleLabels(transform.config())).toEqual(['b', 'c', 'd']);
    });

    it('brush selects a category range and ANIMATES (discrete)', () => {
      const transform = new NgeBarChartTransform({ data });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });
      expect(barLayer(transform.config()).animationMs).toBe(0);

      // Brush is relative to the CURRENT window [0,2]: from 0 → 0, to 0.5 → round(1)=1
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { fromFraction: 0, toFraction: 0.5, type: 'brush' },
      });

      expect(visibleLabels(transform.config())).toEqual(['a', 'b']);
      expect(barLayer(transform.config()).animationMs).toBeUndefined();
    });

    it('reset restores all categories and re-enables animation', () => {
      const transform = new NgeBarChartTransform({ data });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      transform.onChartGesture({ kind: 'reset' });

      expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(barLayer(transform.config()).animationMs).toBeUndefined();
    });
  });
});
