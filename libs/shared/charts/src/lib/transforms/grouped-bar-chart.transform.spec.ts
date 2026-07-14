import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgeGroupedBarLayerConfig,
} from '../core/config';

import { NgeGroupedBarChartTransform } from './grouped-bar-chart.transform';

function groupedLayer(config: NgeChartConfig): NgeGroupedBarLayerConfig {
  return config.layers[0] as NgeGroupedBarLayerConfig;
}

/** Distinct visible categories (labels) of the outer band axis, in order. */
function visibleLabels(config: NgeChartConfig): string[] {
  return [...new Set(groupedLayer(config).data.map(d => d.label))];
}

describe('NgeGroupedBarChartTransform', () => {
  // 4 categories (a..d), each with an X and Y series bar.
  const data: NgeGroupedBarDataPoint[] = ['a', 'b', 'c', 'd'].flatMap((label, i) => [
    { groupId: 'X', label, value: (i + 1) * 10 },
    { groupId: 'Y', label, value: (i + 1) * 5 },
  ]);

  it('shows all categories by default', () => {
    const transform = new NgeGroupedBarChartTransform({ data });
    expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c', 'd']);
  });

  describe('band-window gestures', () => {
    it('wheel-zoom narrows the visible window and suppresses animation', () => {
      const transform = new NgeGroupedBarChartTransform({ data });

      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      expect(visibleLabels(transform.config())).toEqual(['a', 'b']);
      expect(groupedLayer(transform.config()).animationMs).toBe(0);
    });

    it('pan shifts the window by whole categories once zoomed in', () => {
      const transform = new NgeGroupedBarChartTransform({ data });
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

      expect(visibleLabels(transform.config())).toEqual(['b', 'c']);
    });

    it('reset restores all categories and re-enables animation', () => {
      const transform = new NgeGroupedBarChartTransform({ data });
      transform.onChartGesture({
        axis: 'x',
        kind: 'band-window',
        op: { anchorFraction: 0, factor: 2, type: 'zoom' },
      });

      transform.onChartGesture({ kind: 'reset' });

      expect(visibleLabels(transform.config())).toEqual(['a', 'b', 'c', 'd']);
      expect(groupedLayer(transform.config()).animationMs).toBeUndefined();
    });
  });
});
