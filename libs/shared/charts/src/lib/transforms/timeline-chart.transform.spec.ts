import type { ScaleTime } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeTimelineDataPoint } from '../core/config';

import { NgeTimelineChartTransform } from './timeline-chart.transform';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const JAN1 = new Date('2024-01-01').getTime();
const JAN31 = new Date('2024-01-31').getTime();

const DATA: NgeTimelineDataPoint[] = [
  { end: new Date('2024-01-10'), rowId: 'A', start: new Date('2024-01-01') },
  { end: new Date('2024-01-31'), rowId: 'B', start: new Date('2024-01-20') },
];

/** The x scale's `[lo, hi]` epoch-ms domain from the transform's current config. */
function xDomainMs(transform: NgeTimelineChartTransform): [number, number] {
  const config = transform.config();
  const x = config.scaleFactory!(config, DIMENSIONS).x as ScaleTime<number, number>;
  const [lo, hi] = x.domain();
  return [(lo as Date).getTime(), (hi as Date).getTime()];
}

describe('NgeTimelineChartTransform', () => {
  it('forces the range-axis brush on with the full data extent as the ruler domain', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });

    expect(transform.config().base?.xRangeAxis?.fullDomain).toEqual([JAN1, JAN31]);
    // No scrub yet → the plot renders the full extent.
    expect(xDomainMs(transform)).toEqual([JAN1, JAN31]);
  });

  it('scrubs the plot to the brushed window on a range-zoom(x) gesture (ruler stays full)', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });
    const focus: [number, number] = [
      new Date('2024-01-05').getTime(),
      new Date('2024-01-15').getTime(),
    ];

    transform.onChartGesture({ axis: 'x', domain: focus, kind: 'range-zoom' });

    expect(xDomainMs(transform)).toEqual(focus);
    expect(transform.config().base?.xRangeAxis?.fullDomain).toEqual([JAN1, JAN31]);
  });

  it('clamps a window wider than the data back to the full extent (zoom-out floor)', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });

    transform.onChartGesture({
      axis: 'x',
      domain: [JAN1 - 999_999_999, JAN31 + 999_999_999],
      kind: 'range-zoom',
    });

    expect(xDomainMs(transform)).toEqual([JAN1, JAN31]);
  });

  it('reset restores the full extent after a scrub', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });
    transform.onChartGesture({
      axis: 'x',
      domain: [new Date('2024-01-05').getTime(), new Date('2024-01-15').getTime()],
      kind: 'range-zoom',
    });

    transform.resetZoom();

    expect(xDomainMs(transform)).toEqual([JAN1, JAN31]);
  });

  it('ignores a range-zoom on the y (band) axis — time-scrub is x-only', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });

    transform.onChartGesture({ axis: 'y', domain: [0, 1], kind: 'range-zoom' });

    expect(xDomainMs(transform)).toEqual([JAN1, JAN31]);
  });

  it('preserves the scrub window when the data is replaced', () => {
    const transform = new NgeTimelineChartTransform({ data: DATA });
    const focus: [number, number] = [
      new Date('2024-01-05').getTime(),
      new Date('2024-01-15').getTime(),
    ];
    transform.onChartGesture({ axis: 'x', domain: focus, kind: 'range-zoom' });

    transform.setData([{ end: new Date('2024-02-10'), rowId: 'C', start: new Date('2024-02-01') }]);

    expect(xDomainMs(transform)).toEqual(focus);
  });
});
