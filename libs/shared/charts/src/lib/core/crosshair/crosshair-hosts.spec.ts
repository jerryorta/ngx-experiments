import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../base-layout';
import type { NgeChartLayerDefinition } from '../config';
import type { CrosshairXEntry } from './crosshair-hosts';

import {
  bandEntryAt,
  collectBandEntries,
  CROSSHAIR_HOST_SUPPORT,
  isBandHost,
  isOneDimensionalHost,
} from './crosshair-hosts';

function bandScales(categories: string[]): NgeChartScales {
  return {
    x: scaleBand<string>().domain(categories).range([0, 500]).padding(0),
    y: scaleLinear().domain([0, 100]).range([300, 0]),
  };
}

function entry(key: string, start: number, width: number): CrosshairXEntry {
  return { key, px: start + width / 2, raw: key, start, width };
}

describe('CROSSHAIR_HOST_SUPPORT', () => {
  const entries = Object.entries(CROSSHAIR_HOST_SUPPORT);

  it('classifies every layer type', () => {
    // The `Record<NgeChartLayerType, …>` type already fails the build on an
    // unclassified layer; this guards the runtime shape alongside it.
    expect(entries.length).toBeGreaterThan(0);
    for (const [type, support] of entries) {
      expect(typeof support.kind).toBe('string');
      expect(type).not.toBe('');
    }
  });

  it('gives every non-participating layer a reason — no unannounced skips', () => {
    const silent = entries
      .filter(([, support]) => support.kind === 'none')
      .filter(([, support]) => !support.reason?.trim());

    expect(silent.map(([type]) => type)).toEqual([]);
  });

  it('leaves participating layers without a reason, which would be meaningless', () => {
    const explained = entries
      .filter(([, support]) => support.kind !== 'none')
      .filter(([, support]) => support.reason !== undefined);

    expect(explained.map(([type]) => type)).toEqual([]);
  });

  it('marks eligible-but-unwired layers separately from impossible ones', () => {
    // `eligible` means "cartesian, could host, not yet built" — it must never sit
    // on a layer that already participates, or on one that structurally cannot.
    for (const [, support] of entries) {
      if (support.eligible) {
        expect(support.kind).toBe('none');
      }
    }
    expect(CROSSHAIR_HOST_SUPPORT.waterfall.eligible).toBe(true);
    expect(CROSSHAIR_HOST_SUPPORT.pie.eligible).toBeUndefined();
  });

  it('keeps the bar family and the overlay as hosts, and diverging-bar out', () => {
    expect(CROSSHAIR_HOST_SUPPORT.bar.kind).toBe('band');
    expect(CROSSHAIR_HOST_SUPPORT['grouped-bar'].kind).toBe('band');
    expect(CROSSHAIR_HOST_SUPPORT['stacked-bar'].kind).toBe('band');
    expect(CROSSHAIR_HOST_SUPPORT.overlay.kind).toBe('derived');
    expect(CROSSHAIR_HOST_SUPPORT['diverging-bar'].kind).toBe('none');
    expect(CROSSHAIR_HOST_SUPPORT['diverging-bar'].reason).toContain('single datum');
  });
});

describe('bandEntryAt', () => {
  const entries = [entry('A', 0, 400), entry('B', 400, 50), entry('C', 450, 50)];

  it('returns the band containing the pointer', () => {
    expect(bandEntryAt(entries, 100)?.key).toBe('A');
    expect(bandEntryAt(entries, 420)?.key).toBe('B');
    expect(bandEntryAt(entries, 470)?.key).toBe('C');
  });

  it('prefers containment over the nearest centre when widths differ', () => {
    // Centres are 200 / 425 / 475. At 390 the nearest centre is B's, but the
    // pointer is still inside A's column — the reading a Marimekko reader expects.
    expect(bandEntryAt(entries, 390)?.key).toBe('A');
  });

  it('falls back to the nearest centre outside every band', () => {
    expect(bandEntryAt(entries, -40)?.key).toBe('A');
    expect(bandEntryAt(entries, 900)?.key).toBe('C');
  });

  it('falls back to the nearest centre for zero-width (point-scale) entries', () => {
    const points = [
      { key: 'P1', px: 100, raw: 'P1', start: 100, width: 0 },
      { key: 'P2', px: 300, raw: 'P2', start: 300, width: 0 },
    ];

    expect(bandEntryAt(points, 260)?.key).toBe('P2');
  });

  it('returns null for an empty host', () => {
    expect(bandEntryAt([], 100)).toBeNull();
  });
});

describe('band host detection', () => {
  it('treats a vertical bar layer as a band host', () => {
    const layer = { data: [], type: 'bar' } as unknown as NgeChartLayerDefinition;

    expect(isBandHost(layer)).toBe(true);
    expect(isOneDimensionalHost(layer)).toBe(true);
  });

  it('drops a horizontal bar layer, whose categories sit on the y scale', () => {
    const layer = {
      data: [],
      orientation: 'horizontal',
      type: 'bar',
    } as unknown as NgeChartLayerDefinition;

    expect(isBandHost(layer)).toBe(false);
    expect(isOneDimensionalHost(layer)).toBe(false);
  });

  it('keeps a Marimekko stacked layer vertical even when orientation says otherwise', () => {
    // Mirrors the renderer: `isMarimekko || orientation !== 'horizontal'`.
    const layer = {
      bandWidthAccessor: () => 1,
      data: [],
      orientation: 'horizontal',
      type: 'stacked-bar',
    } as unknown as NgeChartLayerDefinition;

    expect(isBandHost(layer)).toBe(true);
  });

  it('counts an overlay as a 1-D host but not a band one', () => {
    const layer = {
      data: [],
      mode: 'trendline',
      type: 'overlay',
    } as unknown as NgeChartLayerDefinition;

    expect(isBandHost(layer)).toBe(false);
    expect(isOneDimensionalHost(layer)).toBe(true);
  });

  it('counts scatter as neither — it is resolved in 2-D', () => {
    const layer = { data: [], type: 'scatter' } as unknown as NgeChartLayerDefinition;

    expect(isOneDimensionalHost(layer)).toBe(false);
  });
});

describe('collectBandEntries', () => {
  it('reads band geometry from the shared scale', () => {
    const layers = [
      {
        data: [
          { label: 'Q1', value: 1 },
          { label: 'Q2', value: 2 },
        ],
        type: 'bar',
      },
    ] as unknown as NgeChartLayerDefinition[];

    expect(collectBandEntries(layers, bandScales(['Q1', 'Q2']), 500)).toEqual([
      { key: 'Q1', px: 125, raw: 'Q1', start: 0, width: 250 },
      { key: 'Q2', px: 375, raw: 'Q2', start: 250, width: 250 },
    ]);
  });

  it('reads Marimekko geometry from the columns, not the shared band scale', () => {
    const layers = [
      {
        bandWidthAccessor: (_category: string, total: number) => total,
        barPadding: 0,
        data: [
          { category: 'A', seriesId: 'S1', value: 80 },
          { category: 'B', seriesId: 'S1', value: 20 },
        ],
        type: 'stacked-bar',
      },
    ] as unknown as NgeChartLayerDefinition[];

    expect(collectBandEntries(layers, bandScales(['A', 'B']), 500)).toEqual([
      { key: 'A', px: 200, raw: 'A', start: 0, width: 400 },
      { key: 'B', px: 450, raw: 'B', start: 400, width: 100 },
    ]);
  });

  it('orders entries left to right and de-duplicates a shared category', () => {
    const layers = [
      { data: [{ label: 'Q2', value: 1 }], type: 'bar' },
      {
        data: [
          { groupId: 'G', label: 'Q1', value: 2 },
          { groupId: 'G', label: 'Q2', value: 3 },
        ],
        type: 'grouped-bar',
      },
    ] as unknown as NgeChartLayerDefinition[];

    expect(collectBandEntries(layers, bandScales(['Q1', 'Q2']), 500).map(e => e.key)).toEqual([
      'Q1',
      'Q2',
    ]);
  });

  it('returns nothing when no layer is a band host', () => {
    const layers = [{ data: [], type: 'line' }] as unknown as NgeChartLayerDefinition[];

    expect(collectBandEntries(layers, bandScales(['Q1']), 500)).toEqual([]);
  });
});
