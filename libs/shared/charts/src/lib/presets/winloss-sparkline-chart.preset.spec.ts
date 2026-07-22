import type { NgeBarLayerConfig } from '../core/config';

import { renderBarLayer } from '../layers/bar';
import {
  createWinLossSparklineChartConfig,
  type WinLossDataPoint,
} from './winloss-sparkline-chart.preset';

/** Narrow the first layer to a bar layer config for assertions. */
function barLayer(
  config: ReturnType<typeof createWinLossSparklineChartConfig>
): NgeBarLayerConfig {
  return config.layers[0] as NgeBarLayerConfig;
}

describe('createWinLossSparklineChartConfig', () => {
  // A mix of wins, a loss, and a tie so every sign branch is covered.
  const outcomes: WinLossDataPoint[] = [
    { label: 'G1', value: 5 }, // win
    { label: 'G2', value: -3 }, // loss
    { label: 'G3', value: 0 }, // tie
    { label: 'G4', value: 1 }, // win
  ];

  it('reuses the shipped bar layer (exactly one layer, bar renderer, no new type)', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });
    const layer = barLayer(config);

    expect(config.layers).toHaveLength(1);
    expect(layer.type).toBe('bar');
    expect(layer.renderer).toBe(renderBarLayer);
  });

  it('normalises every outcome to an equal-magnitude ±1 / 0 bar by sign', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(barLayer(config).data.map(d => d.value)).toEqual([1, -1, 0, 1]);
  });

  it('colours each mark by sign using the default --chart-* tokens', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(barLayer(config).data.map(d => d.color)).toEqual([
      'var(--chart-primary)', // win
      'var(--chart-error)', // loss
      'var(--chart-on-surface-variant)', // tie
      'var(--chart-primary)', // win
    ]);
  });

  it('honours custom win/loss/tie colours', () => {
    const config = createWinLossSparklineChartConfig({
      data: outcomes,
      lossColor: '#loss0',
      tieColor: '#tie00',
      winColor: '#win00',
    });

    expect(barLayer(config).data.map(d => d.color)).toEqual([
      '#win00',
      '#loss0',
      '#tie00',
      '#win00',
    ]);
  });

  it('preserves the period labels in order', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(barLayer(config).data.map(d => d.label)).toEqual(['G1', 'G2', 'G3', 'G4']);
  });

  it('renders vertically so wins rise and losses drop from the zero baseline', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(barLayer(config).orientation).toBe('vertical');
  });

  it('shows the zero baseline by default, and lets it be turned off', () => {
    expect(barLayer(createWinLossSparklineChartConfig({ data: outcomes })).showZeroLine).toBe(true);

    const off = createWinLossSparklineChartConfig({ data: outcomes, showZeroLine: false });
    expect(barLayer(off).showZeroLine).toBe(false);
  });

  it('leaves scale derivation to the bar helper (its value domain auto-spans zero)', () => {
    // No custom scaleFactory: mapping outcomes to ±1 lets the bar helper auto-fit a
    // symmetric [-1·headroom, 1·headroom] domain, so wins render up and losses down.
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(config.scaleFactory).toBeUndefined();
  });

  it('applies compact defaults (tight margin, no labels, axes off)', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });

    expect(config.base?.margin).toEqual({ bottom: 2, left: 2, right: 2, top: 2 });
    expect(barLayer(config).showLabels).toBe(false);
    expect(config.base?.showXAxis).toBeFalsy();
    expect(config.base?.showYAxis).toBeFalsy();
  });

  it('introduces no layer type beyond the reused bar', () => {
    const config = createWinLossSparklineChartConfig({ data: outcomes });
    const types = config.layers.flat().map(layer => layer.type);

    expect(new Set(types)).toEqual(new Set(['bar']));
  });
});
