import type { ScaleTime } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeTimelineDataPoint, NgeTimelineLayerConfig } from '../core/config';

import { renderTimelineLayer } from '../layers/timeline';
import { createTimelineChartConfig } from './timeline-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeTimelineDataPoint[] = [
  { end: new Date('2024-01-10'), label: 'Design', rowId: 'Design', start: new Date('2024-01-01') },
  { end: new Date('2024-01-25'), label: 'Build', rowId: 'Build', start: new Date('2024-01-08') },
];

/** Narrow the first layer to the timeline config it always is for this preset. */
function timelineLayerOf(
  config: ReturnType<typeof createTimelineChartConfig>
): NgeTimelineLayerConfig {
  return config.layers.flat()[0] as NgeTimelineLayerConfig;
}

describe('createTimelineChartConfig', () => {
  it('wires the timeline renderer, type, and a scale factory', () => {
    const config = createTimelineChartConfig({ data: DATA });
    const layer = timelineLayerOf(config);

    expect(layer.type).toBe('timeline');
    expect(layer.renderer).toBe(renderTimelineLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('defaults both axes ON (standalone analytical chart)', () => {
    const config = createTimelineChartConfig({ data: DATA });

    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('defaults the time x-axis tick target to 5 (anti-collision) and respects an override', () => {
    expect(createTimelineChartConfig({ data: DATA }).base?.xAxisTicks).toBe(5);
    expect(createTimelineChartConfig({ data: DATA, xAxisTicks: 12 }).base?.xAxisTicks).toBe(12);
  });

  it('defaults to a wide left margin so text row labels fit (override-able)', () => {
    expect(createTimelineChartConfig({ data: DATA }).base?.margin?.left).toBe(80);
    expect(createTimelineChartConfig({ data: DATA, margin: { left: 120 } }).base?.margin).toEqual({
      left: 120,
    });
  });

  it('defaults showLabels off and showMilestones on', () => {
    const layer = timelineLayerOf(createTimelineChartConfig({ data: DATA }));

    expect(layer.showLabels).toBe(false);
    expect(layer.showMilestones).toBe(true);
  });

  it('passes bar / row / milestone options through to the layer', () => {
    const layer = timelineLayerOf(
      createTimelineChartConfig({
        barRadius: 4,
        data: DATA,
        milestoneSize: 8,
        rowPadding: 0.4,
        showLabels: true,
      })
    );

    expect(layer.barRadius).toBe(4);
    expect(layer.rowPadding).toBe(0.4);
    expect(layer.milestoneSize).toBe(8);
    expect(layer.showLabels).toBe(true);
  });

  it('forwards base axis flags and maps rowGroups to yAxisGroups', () => {
    const config = createTimelineChartConfig({
      data: DATA,
      rowGroups: [{ groupBy: (rowId: string) => (rowId === 'Design' ? 'Phase 1' : 'Phase 2') }],
      showXGrid: true,
      xAxisLabel: 'Timeline',
      yAxisLabel: 'Task',
    });

    expect(config.base?.showXGrid).toBe(true);
    expect(config.base?.xAxisLabel).toBe('Timeline');
    expect(config.base?.yAxisLabel).toBe('Task');
    expect(config.base?.yAxisGroups).toHaveLength(1);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = timelineLayerOf(
      createTimelineChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
  });

  it('omits the tooltip config when not enabled', () => {
    const layer = timelineLayerOf(createTimelineChartConfig({ data: DATA }));

    expect(layer.tooltip).toBeUndefined();
  });

  it('formats a milestone tooltip as a single date and a span as a range', () => {
    const layer = timelineLayerOf(
      createTimelineChartConfig({ data: DATA, tooltip: { enabled: true } })
    );
    const formatContent = layer.tooltip!.formatContent!;

    const spanContent = formatContent(DATA[0]);
    const milestoneContent = formatContent({
      end: new Date('2024-01-01'),
      label: 'Kickoff',
      milestone: true,
      rowId: 'A',
      start: new Date('2024-01-01'),
    });

    expect(String(spanContent.value)).toContain('–'); // span → date range
    expect(String(milestoneContent.value)).not.toContain('–'); // milestone → single date
    expect(milestoneContent.label).toBe('Kickoff');
  });

  it('exposes a scale factory that produces a time x-scale and a band y-scale', () => {
    const config = createTimelineChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect((scales.x as ScaleTime<number, number>).domain()[0] instanceof Date).toBe(true);
    expect(scales.y.domain()).toEqual(['Design', 'Build']);
  });

  it('adds a full-extent range/brush x-axis when rangeAxisX is set (else omits it)', () => {
    const withBrush = createTimelineChartConfig({ data: DATA, rangeAxisX: true });
    expect(withBrush.base?.xRangeAxis?.fullDomain).toEqual([
      new Date('2024-01-01').getTime(), // earliest start
      new Date('2024-01-25').getTime(), // latest end
    ]);
    expect(createTimelineChartConfig({ data: DATA }).base?.xRangeAxis).toBeUndefined();
  });

  it('renders the xDomain focus window while the ruler keeps the full extent', () => {
    const focus: [number, number] = [
      new Date('2024-01-08').getTime(),
      new Date('2024-01-16').getTime(),
    ];
    const config = createTimelineChartConfig({ data: DATA, rangeAxisX: true, xDomain: focus });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect((scales.x as ScaleTime<number, number>).domain()).toEqual([
      new Date(focus[0]),
      new Date(focus[1]),
    ]);
    expect(config.base?.xRangeAxis?.fullDomain).toEqual([
      new Date('2024-01-01').getTime(),
      new Date('2024-01-25').getTime(),
    ]);
  });

  it('forwards a plot gestures config', () => {
    expect(createTimelineChartConfig({ data: DATA, gestures: { pan: true } }).gestures).toEqual({
      pan: true,
    });
  });
});
