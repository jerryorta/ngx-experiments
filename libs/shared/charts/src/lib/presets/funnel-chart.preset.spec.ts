import type { NgeChartConfig, NgeFunnelDataPoint, NgeFunnelLayerConfig } from '../core/config';

import { renderFunnelLayer } from '../layers/funnel';
import { createFunnelChartConfig } from './funnel-chart.preset';

const DATA: NgeFunnelDataPoint[] = [
  { label: 'Visitors', value: 10000 },
  { label: 'Signups', value: 4200 },
  { label: 'Customers', value: 650 },
];

/** Narrow the funnel layer the preset always emits. */
function funnelLayerOf(config: NgeChartConfig): NgeFunnelLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'funnel') as NgeFunnelLayerConfig;
}

describe('createFunnelChartConfig', () => {
  it('wires the funnel renderer and type', () => {
    const config = createFunnelChartConfig({ data: DATA });

    const layer = funnelLayerOf(config);
    expect(layer.type).toBe('funnel');
    expect(layer.renderer).toBe(renderFunnelLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (self-scaled layout)', () => {
    const config = createFunnelChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('does not expose a gestures option (single-view geometric chart)', () => {
    const config = createFunnelChartConfig({ data: DATA });

    expect(config.gestures).toBeUndefined();
  });

  it('applies a default all-around margin', () => {
    const config = createFunnelChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (direction / align / neckRatio / palette) through to the layer', () => {
    const onClick = jest.fn();
    const layer = funnelLayerOf(
      createFunnelChartConfig({
        align: 'left',
        data: DATA,
        direction: 'up',
        gap: 4,
        neckRatio: 0,
        onClick,
        seriesColors: ['#111', '#222'],
        showLabels: true,
      })
    );

    expect(layer.align).toBe('left');
    expect(layer.direction).toBe('up');
    expect(layer.neckRatio).toBe(0);
    expect(layer.gap).toBe(4);
    expect(layer.showLabels).toBe(true);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('builds the pyramid variant via direction: up + neckRatio: 0', () => {
    const layer = funnelLayerOf(
      createFunnelChartConfig({ data: DATA, direction: 'up', neckRatio: 0 })
    );

    expect(layer.direction).toBe('up');
    expect(layer.neckRatio).toBe(0);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = funnelLayerOf(
      createFunnelChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Signups', value: 4200 })).toEqual({
      label: 'Signups',
      value: '4200',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(funnelLayerOf(createFunnelChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
