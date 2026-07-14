import type { NgeScatterDataPoint } from '../config/nge-chart-config.models';

import { DEFAULT_SCATTER_LAYER_THEME } from '../theme/nge-chart-theme.defaults';
import { extractScatterChartLegendItems } from './nge-chart-legend.helpers';

describe('extractScatterChartLegendItems', () => {
  const defaultColors = DEFAULT_SCATTER_LAYER_THEME.point.colors ?? [];

  it('returns an empty array when no point has a seriesId', () => {
    const data: NgeScatterDataPoint[] = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];

    expect(extractScatterChartLegendItems(data)).toEqual([]);
  });

  it('returns one item per unique seriesId in first-seen order', () => {
    const data: NgeScatterDataPoint[] = [
      { seriesId: 'Alpha', x: 1, y: 1 },
      { seriesId: 'Beta', x: 2, y: 2 },
      { seriesId: 'Alpha', x: 3, y: 3 },
    ];

    expect(extractScatterChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'Alpha', label: 'Alpha' },
      { color: defaultColors[1], id: 'Beta', label: 'Beta' },
    ]);
  });

  it('prefers seriesColors positionally over the theme palette', () => {
    const data: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 1, y: 1 },
      { seriesId: 'B', x: 2, y: 2 },
    ];

    expect(extractScatterChartLegendItems(data, ['#111111', '#222222'])).toEqual([
      { color: '#111111', id: 'A', label: 'A' },
      { color: '#222222', id: 'B', label: 'B' },
    ]);
  });

  it('cycles seriesColors with modulo, matching the renderer (legend↔renderer parity)', () => {
    const data: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 1, y: 1 },
      { seriesId: 'B', x: 2, y: 2 },
      { seriesId: 'C', x: 3, y: 3 },
    ];

    // seriesColors shorter than series count: series C (i=2, 2%2=0) reuses '#f00',
    // matching the renderer's `palette[i % palette.length]` — NOT a fall-through to theme.
    expect(extractScatterChartLegendItems(data, ['#f00', '#00f'])).toEqual([
      { color: '#f00', id: 'A', label: 'A' },
      { color: '#00f', id: 'B', label: 'B' },
      { color: '#f00', id: 'C', label: 'C' },
    ]);
  });

  it('uses an explicit theme palette when no seriesColors are supplied', () => {
    const data: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 1, y: 1 },
      { seriesId: 'B', x: 2, y: 2 },
    ];

    expect(extractScatterChartLegendItems(data, undefined, ['#aaaaaa', '#bbbbbb'])).toEqual([
      { color: '#aaaaaa', id: 'A', label: 'A' },
      { color: '#bbbbbb', id: 'B', label: 'B' },
    ]);
  });

  it('cycles the palette with modulo when there are more series than colors', () => {
    const data: NgeScatterDataPoint[] = [
      { seriesId: 'A', x: 1, y: 1 },
      { seriesId: 'B', x: 2, y: 2 },
      { seriesId: 'C', x: 3, y: 3 },
    ];

    expect(extractScatterChartLegendItems(data, undefined, ['#a', '#b'])).toEqual([
      { color: '#a', id: 'A', label: 'A' },
      { color: '#b', id: 'B', label: 'B' },
      { color: '#a', id: 'C', label: 'C' },
    ]);
  });

  it('falls back to the scatter theme palette head by default', () => {
    const data: NgeScatterDataPoint[] = [{ seriesId: 'Solo', x: 1, y: 1 }];

    expect(extractScatterChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'Solo', label: 'Solo' },
    ]);
  });
});
