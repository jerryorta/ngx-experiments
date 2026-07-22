import type { ScaleBand, ScaleTime } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeTimelineDataPoint,
  NgeTimelineLayerConfig,
} from '../core/config';

import { renderTimelineLayer } from '../layers/timeline';
import {
  computeTimelineXDataDomain,
  createTimelineChartScales,
} from './nge-chart.timeline.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a minimal single-timeline-layer chart config. */
function timelineConfig(data: NgeTimelineDataPoint[], rowPadding?: number): NgeChartConfig {
  const layer: NgeTimelineLayerConfig = {
    data,
    renderer: renderTimelineLayer,
    rowPadding,
    type: 'timeline',
  };
  return { layers: [layer] };
}

describe('createTimelineChartScales', () => {
  it('builds a time x-scale spanning [minStart, maxEnd] across the bounded width', () => {
    const start1 = new Date('2024-01-01');
    const end2 = new Date('2024-01-20');
    const scales = createTimelineChartScales(
      timelineConfig([
        { end: new Date('2024-01-10'), rowId: 'A', start: start1 },
        { end: end2, rowId: 'B', start: new Date('2024-01-05') },
      ]),
      DIMENSIONS
    );

    const x = scales.x as ScaleTime<number, number>;
    expect(x.domain()[0]).toEqual(start1); // earliest start
    expect(x.domain()[1]).toEqual(end2); // latest end
    expect(x.range()).toEqual([0, 500]);
    expect(x(start1)).toBeCloseTo(0);
    expect(x(end2)).toBeCloseTo(500);
  });

  it('builds a band y-scale with one row per unique rowId (first-seen order)', () => {
    const scales = createTimelineChartScales(
      timelineConfig([
        { end: 10, rowId: 'Design', start: 0 },
        { end: 20, rowId: 'Build', start: 10 },
        { end: 30, rowId: 'Design', start: 20 }, // duplicate row
      ]),
      DIMENSIONS
    );

    const y = scales.y as ScaleBand<string>;
    expect(y.domain()).toEqual(['Design', 'Build']);
    expect(y.range()).toEqual([0, 300]);
  });

  it('coerces string dates into the time domain', () => {
    const scales = createTimelineChartScales(
      timelineConfig([{ end: '2024-03-31', rowId: 'A', start: '2024-03-01' }]),
      DIMENSIONS
    );

    const x = scales.x as ScaleTime<number, number>;
    expect(x.domain()[0]).toEqual(new Date('2024-03-01'));
    expect(x.domain()[1]).toEqual(new Date('2024-03-31'));
  });

  it('lets milestones contribute only their start to the time extent', () => {
    const scales = createTimelineChartScales(
      timelineConfig([
        { end: new Date('2024-01-10'), milestone: true, rowId: 'A', start: new Date('2024-01-10') },
        { end: new Date('2024-01-05'), rowId: 'A', start: new Date('2024-01-01') },
      ]),
      DIMENSIONS
    );

    const x = scales.x as ScaleTime<number, number>;
    expect(x.domain()[0]).toEqual(new Date('2024-01-01'));
    expect(x.domain()[1]).toEqual(new Date('2024-01-10'));
  });

  it('pads a zero-width extent (single instant) by a day so marks stay visible', () => {
    const instant = new Date('2024-06-15').getTime();
    const scales = createTimelineChartScales(
      timelineConfig([{ end: instant, milestone: true, rowId: 'A', start: instant }]),
      DIMENSIONS
    );

    const x = scales.x as ScaleTime<number, number>;
    expect((x.domain()[0] as Date).getTime()).toBe(instant - DAY_MS);
    expect((x.domain()[1] as Date).getTime()).toBe(instant + DAY_MS);
  });

  it('applies the layer rowPadding to the band scale', () => {
    const scales = createTimelineChartScales(
      timelineConfig([{ end: 10, rowId: 'A', start: 0 }], 0.5),
      DIMENSIONS
    );

    const y = scales.y as ScaleBand<string>;
    expect(y.padding()).toBe(0.5);
  });

  it('uses an explicit xDomain focus window instead of the data extent', () => {
    const focusLo = new Date('2024-01-10').getTime();
    const focusHi = new Date('2024-01-20').getTime();
    const scales = createTimelineChartScales(
      timelineConfig([{ end: '2024-03-01', rowId: 'A', start: '2024-01-01' }]),
      DIMENSIONS,
      { xDomain: [focusLo, focusHi] }
    );

    const x = scales.x as ScaleTime<number, number>;
    expect((x.domain()[0] as Date).getTime()).toBe(focusLo);
    expect((x.domain()[1] as Date).getTime()).toBe(focusHi);
  });
});

describe('computeTimelineXDataDomain', () => {
  it('returns [minStart, maxEnd] epoch ms; milestones contribute only their start', () => {
    const [lo, hi] = computeTimelineXDataDomain([
      { end: new Date('2024-01-10'), rowId: 'A', start: new Date('2024-01-01') },
      { end: new Date('2024-01-05'), milestone: true, rowId: 'A', start: new Date('2024-01-20') },
    ]);

    expect(lo).toBe(new Date('2024-01-01').getTime());
    expect(hi).toBe(new Date('2024-01-20').getTime()); // milestone start, not its ignored end
  });

  it('pads a zero-width extent by a day', () => {
    const instant = new Date('2024-06-15').getTime();

    expect(
      computeTimelineXDataDomain([{ end: instant, milestone: true, rowId: 'A', start: instant }])
    ).toEqual([instant - 86_400_000, instant + 86_400_000]);
  });

  it('falls back to a unit day for empty data', () => {
    expect(computeTimelineXDataDomain([])).toEqual([0, 86_400_000]);
  });
});
