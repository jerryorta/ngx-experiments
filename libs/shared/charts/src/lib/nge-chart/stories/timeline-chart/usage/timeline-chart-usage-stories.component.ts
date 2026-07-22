import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTimelineDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createTimelineChartConfig } from '../../../../presets/timeline-chart.preset';
import { NgeTimelineChartTransform } from '../../../../transforms/timeline-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'timeline-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'timeline-chart-usage-stories',
  standalone: true,
  styleUrl: './timeline-chart-usage-stories.component.scss',
  templateUrl: './timeline-chart-usage-stories.component.html',
})
export class TimelineChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/timeline-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Gantt
  //   Rows Design / Build / QA / Launch, overlapping spans, two bars sharing the
  //   Build row, and a Launch milestone (rendered as a diamond).
  // ============================================
  basicData: NgeTimelineDataPoint[] = [
    { end: '2024-01-22', label: 'Design', rowId: 'Design', start: '2024-01-01' },
    { end: '2024-02-20', label: 'Build', rowId: 'Build', start: '2024-01-18' },
    { end: '2024-03-08', label: 'Refactor', rowId: 'Build', start: '2024-02-22' },
    { end: '2024-03-15', label: 'QA', rowId: 'QA', start: '2024-02-15' },
    { end: '2024-03-18', label: 'Launch', milestone: true, rowId: 'Launch', start: '2024-03-18' },
  ];

  basicConfig = createTimelineChartConfig({
    data: this.basicData,
  });

  // ============================================
  // EXAMPLE 2: On-Bar Labels
  // ============================================
  labeledConfig = createTimelineChartConfig({
    data: this.basicData,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 3: Milestones
  // ============================================
  milestoneConfig = createTimelineChartConfig({
    data: this.basicData,
    showLabels: true,
    showMilestones: true,
  });

  // ============================================
  // EXAMPLE 4: Tooltip on Hover
  // ============================================
  tooltipConfig = createTimelineChartConfig({
    data: this.basicData,
    tooltip: {
      enabled: true,
      position: 'follow-mouse', // 'above' | 'below' | 'follow-mouse'
    },
  });

  // ============================================
  // EXAMPLE 5: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createTimelineChartConfig({
    data: this.basicData,
    onClick: (event: NgeChartLayerClickEvent<NgeTimelineDataPoint>) => {
      this.lastClicked.set(event.data.label ?? event.data.rowId);
    },
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeTimelineDataPoint[]>([
    { end: '2024-01-15', label: 'Research', rowId: 'Research', start: '2024-01-01' },
    { end: '2024-02-10', label: 'Prototype', rowId: 'Prototype', start: '2024-01-12' },
    { end: '2024-03-01', label: 'Ship', milestone: true, rowId: 'Ship', start: '2024-03-01' },
  ]);

  readonly dynamicConfig = computed(() =>
    createTimelineChartConfig({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    const day = 86_400_000;
    const jan1 = new Date('2024-01-01').getTime();
    const rand = (min: number, max: number): number =>
      Math.floor(Math.random() * (max - min)) + min;
    const researchStart = rand(0, 6);
    const researchLen = rand(10, 18);
    const prototypeStart = researchStart + researchLen - rand(2, 5);
    const prototypeLen = rand(16, 26);
    const shipDay = prototypeStart + prototypeLen + rand(2, 8);
    this.dynamicData.set([
      {
        end: new Date(jan1 + (researchStart + researchLen) * day),
        label: 'Research',
        rowId: 'Research',
        start: new Date(jan1 + researchStart * day),
      },
      {
        end: new Date(jan1 + (prototypeStart + prototypeLen) * day),
        label: 'Prototype',
        rowId: 'Prototype',
        start: new Date(jan1 + prototypeStart * day),
      },
      {
        end: new Date(jan1 + shipDay * day),
        label: 'Ship',
        milestone: true,
        rowId: 'Ship',
        start: new Date(jan1 + shipDay * day),
      },
    ]);
  }

  // ============================================
  // EXAMPLE 7: Time Axis Label + Gridlines
  // ============================================
  axisConfig = createTimelineChartConfig({
    data: this.basicData,
    showLabels: true,
    showXGrid: true,
    xAxisLabel: 'Project Timeline',
    xAxisTickFormat: d => new Date(d).toLocaleDateString('en-US', { month: 'short' }),
  });

  // ============================================
  // EXAMPLE 8: Day-Level Timeline with Gridlines
  //   A short-span sprint (Apr 1-8): daily x-axis ticks + vertical gridlines align
  //   each task to the day. Pass a day-granularity `xAxisTickFormat` — the default
  //   ~monthly tick target is tuned for multi-month spans, not a single week.
  // ============================================
  sprintData: NgeTimelineDataPoint[] = [
    { end: '2024-04-04', label: 'Auth API', rowId: 'Backend', start: '2024-04-01' },
    { end: '2024-04-06', label: 'Migration', rowId: 'Backend', start: '2024-04-04' },
    { end: '2024-04-05', label: 'Login UI', rowId: 'Frontend', start: '2024-04-02' },
    { end: '2024-04-08', label: 'Dashboard', rowId: 'Frontend', start: '2024-04-05' },
    { end: '2024-04-08', label: 'Regression', rowId: 'QA', start: '2024-04-06' },
    { end: '2024-04-08', label: 'Ship v2', milestone: true, rowId: 'Release', start: '2024-04-08' },
  ];

  sprintConfig = createTimelineChartConfig({
    data: this.sprintData,
    showLabels: true,
    showXGrid: true,
    xAxisTickFormat: d =>
      new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    xAxisTicks: 8,
  });

  // ============================================
  // EXAMPLE 9: Scrubbable Timeline (range-axis brush)
  //   A year-long roadmap. NgeTimelineChartTransform turns the bottom axis into a
  //   full-range ruler + draggable brush: drag a handle to zoom to a slice, drag the
  //   window to scrub across past → future. The plot renders just the brushed window
  //   while the ruler always shows the full range; "Reset view" snaps back to 100%.
  // ============================================
  readonly scrubTransform = new NgeTimelineChartTransform({
    data: [
      { end: '2024-03-15', label: 'Auth revamp', rowId: 'Platform', start: '2024-01-08' },
      { end: '2024-07-01', label: 'Billing v2', rowId: 'Platform', start: '2024-04-01' },
      { end: '2024-06-01', label: 'iOS rewrite', rowId: 'Mobile', start: '2024-02-01' },
      { end: '2024-10-01', label: 'Android parity', rowId: 'Mobile', start: '2024-06-15' },
      { end: '2024-09-01', label: 'Warehouse', rowId: 'Data', start: '2024-03-01' },
      { end: '2024-12-15', label: 'ML pipeline', rowId: 'Data', start: '2024-09-01' },
      {
        end: '2024-11-01',
        label: 'GA launch',
        milestone: true,
        rowId: 'Release',
        start: '2024-11-01',
      },
    ],
    showLabels: true,
  });
}
