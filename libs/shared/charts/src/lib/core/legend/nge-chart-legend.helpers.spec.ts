import type {
  NgeAreaDataPoint,
  NgeHierarchyDatum,
  NgePieDataPoint,
  NgeScatterDataPoint,
} from '../config/nge-chart-config.models';

import {
  DEFAULT_AREA_LAYER_THEME,
  DEFAULT_PIE_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
  DEFAULT_SUNBURST_LAYER_THEME,
} from '../theme/nge-chart-theme.defaults';
import {
  extractAreaChartLegendItems,
  extractPieChartLegendItems,
  extractScatterChartLegendItems,
  extractSunburstChartLegendItems,
} from './nge-chart-legend.helpers';

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

describe('extractAreaChartLegendItems', () => {
  const defaultColors = DEFAULT_AREA_LAYER_THEME.fill.colors ?? [];

  it('returns an empty array when no point has a seriesId', () => {
    const data: NgeAreaDataPoint[] = [
      { x: 0, y: 2 },
      { x: 1, y: 4 },
    ];

    expect(extractAreaChartLegendItems(data)).toEqual([]);
  });

  it('returns one item per unique seriesId in first-seen order', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'Alpha', x: 0, y: 1 },
      { seriesId: 'Beta', x: 1, y: 2 },
      { seriesId: 'Alpha', x: 2, y: 3 },
    ];

    expect(extractAreaChartLegendItems(data)).toEqual([
      { color: defaultColors[0], label: 'Alpha' },
      { color: defaultColors[1], label: 'Beta' },
    ]);
  });

  it('prefers seriesColors positionally over the theme palette', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 1 },
      { seriesId: 'B', x: 1, y: 2 },
    ];

    expect(extractAreaChartLegendItems(data, ['#111111', '#222222'])).toEqual([
      { color: '#111111', label: 'A' },
      { color: '#222222', label: 'B' },
    ]);
  });

  it('cycles seriesColors with modulo, matching the renderer (legend↔renderer parity)', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 1 },
      { seriesId: 'B', x: 1, y: 2 },
      { seriesId: 'C', x: 2, y: 3 },
    ];

    // seriesColors shorter than series count: series C (i=2, 2%2=0) reuses 'red',
    // matching seriesColorFor's `palette[i % palette.length]` — NOT a fall-through
    // to the theme palette.
    expect(extractAreaChartLegendItems(data, ['red', 'blue'])).toEqual([
      { color: 'red', label: 'A' },
      { color: 'blue', label: 'B' },
      { color: 'red', label: 'C' },
    ]);
  });

  it('cycles the theme palette with modulo when there are more series than colors', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 1 },
      { seriesId: 'B', x: 1, y: 2 },
      { seriesId: 'C', x: 2, y: 3 },
    ];

    expect(extractAreaChartLegendItems(data, undefined, ['#a', '#b'])).toEqual([
      { color: '#a', label: 'A' },
      { color: '#b', label: 'B' },
      { color: '#a', label: 'C' },
    ]);
  });

  it('falls back to the area theme palette head by default', () => {
    const data: NgeAreaDataPoint[] = [{ seriesId: 'Solo', x: 0, y: 1 }];

    expect(extractAreaChartLegendItems(data)).toEqual([{ color: defaultColors[0], label: 'Solo' }]);
  });
});

describe('extractPieChartLegendItems', () => {
  const defaultColors = DEFAULT_PIE_LAYER_THEME.slice.colors ?? [];

  it('returns one item per slice (id + label), colored by input index', () => {
    const data: NgePieDataPoint[] = [
      { label: 'Rent', value: 1800 },
      { label: 'Food', value: 600 },
    ];

    expect(extractPieChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'Rent', label: 'Rent' },
      { color: defaultColors[1], id: 'Food', label: 'Food' },
    ]);
  });

  it('prefers seriesColors positionally over the theme palette', () => {
    const data: NgePieDataPoint[] = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ];

    expect(extractPieChartLegendItems(data, ['#111111', '#222222'])).toEqual([
      { color: '#111111', id: 'A', label: 'A' },
      { color: '#222222', id: 'B', label: 'B' },
    ]);
  });

  it('cycles the theme palette with modulo when there are more slices than colors', () => {
    const data: NgePieDataPoint[] = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
      { label: 'C', value: 3 },
    ];

    // Slice C (i=2, 2%2=0) reuses '#a', matching the renderer's `palette[d.index % length]`.
    expect(extractPieChartLegendItems(data, undefined, ['#a', '#b'])).toEqual([
      { color: '#a', id: 'A', label: 'A' },
      { color: '#b', id: 'B', label: 'B' },
      { color: '#a', id: 'C', label: 'C' },
    ]);
  });

  it('honors a per-slice color override above the palette', () => {
    const data: NgePieDataPoint[] = [
      { label: 'A', value: 1 },
      { color: 'var(--override)', label: 'B', value: 2 },
    ];

    expect(extractPieChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'A', label: 'A' },
      { color: 'var(--override)', id: 'B', label: 'B' },
    ]);
  });

  it('dedups repeated labels (first-seen wins)', () => {
    const data: NgePieDataPoint[] = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
      { label: 'A', value: 3 },
    ];

    const items = extractPieChartLegendItems(data);
    expect(items).toHaveLength(2);
    expect(items.map(i => i.label)).toEqual(['A', 'B']);
  });

  it('treats an empty seriesColors as unset (falls through to the theme palette)', () => {
    const data: NgePieDataPoint[] = [{ label: 'Solo', value: 1 }];

    expect(extractPieChartLegendItems(data, [])).toEqual([
      { color: defaultColors[0], id: 'Solo', label: 'Solo' },
    ]);
  });
});

describe('extractSunburstChartLegendItems', () => {
  const defaultColors = DEFAULT_SUNBURST_LAYER_THEME.segment.colors ?? [];

  it('returns one item per top-level branch (id + label), colored by branch index', () => {
    const data: NgeHierarchyDatum[] = [
      {
        children: [
          { label: 'Rent', value: 1800 },
          { label: 'Utilities', value: 300 },
        ],
        label: 'Housing',
      },
      {
        children: [{ label: 'Groceries', value: 520 }],
        label: 'Food',
      },
    ];

    expect(extractSunburstChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'Housing', label: 'Housing' },
      { color: defaultColors[1], id: 'Food', label: 'Food' },
    ]);
  });

  it('prefers seriesColors positionally over the theme palette', () => {
    const data: NgeHierarchyDatum[] = [
      { children: [{ label: 'a', value: 1 }], label: 'A' },
      { children: [{ label: 'b', value: 2 }], label: 'B' },
    ];

    expect(extractSunburstChartLegendItems(data, ['#111111', '#222222'])).toEqual([
      { color: '#111111', id: 'A', label: 'A' },
      { color: '#222222', id: 'B', label: 'B' },
    ]);
  });

  it('cycles the theme palette with modulo when there are more branches than colors', () => {
    const data: NgeHierarchyDatum[] = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
      { label: 'C', value: 3 },
    ];

    // Branch C (i=2, 2%2=0) reuses '#a', matching the renderer's `colors[index % length]`.
    expect(extractSunburstChartLegendItems(data, undefined, ['#a', '#b'])).toEqual([
      { color: '#a', id: 'A', label: 'A' },
      { color: '#b', id: 'B', label: 'B' },
      { color: '#a', id: 'C', label: 'C' },
    ]);
  });

  it('honors a per-branch color override above the palette', () => {
    const data: NgeHierarchyDatum[] = [
      { label: 'A', value: 1 },
      { color: 'var(--override)', label: 'B', value: 2 },
    ];

    expect(extractSunburstChartLegendItems(data)).toEqual([
      { color: defaultColors[0], id: 'A', label: 'A' },
      { color: 'var(--override)', id: 'B', label: 'B' },
    ]);
  });

  it('ignores descendants — only top-level branches produce items', () => {
    const data: NgeHierarchyDatum[] = [
      {
        children: [
          { label: 'Rent', value: 1800 },
          {
            children: [
              { label: 'Electric', value: 180 },
              { label: 'Water', value: 120 },
            ],
            label: 'Utilities',
          },
        ],
        label: 'Housing',
      },
      {
        children: [{ label: 'Groceries', value: 520 }],
        label: 'Food',
      },
    ];

    const items = extractSunburstChartLegendItems(data);
    expect(items).toHaveLength(2);
    expect(items.map(i => i.label)).toEqual(['Housing', 'Food']);
  });

  it('treats an empty seriesColors as unset (falls through to the theme palette)', () => {
    const data: NgeHierarchyDatum[] = [{ children: [{ label: 'leaf', value: 1 }], label: 'Solo' }];

    expect(extractSunburstChartLegendItems(data, [])).toEqual([
      { color: defaultColors[0], id: 'Solo', label: 'Solo' },
    ]);
  });
});
