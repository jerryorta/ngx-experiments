import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeTimelineDataPoint } from '../../../../core/config';

import { createTimelineChartConfig } from '../../../../presets/timeline-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'timeline-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'timeline-chart-theming',
  standalone: true,
  styleUrl: './timeline-chart-theming.component.scss',
  templateUrl: './timeline-chart-theming.component.html',
})
export class TimelineChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/timeline-chart/theming';

  // Shared project plan — Design / Build / QA / Launch, two bars on the Build row,
  // and a Launch milestone.
  sampleData: NgeTimelineDataPoint[] = [
    { end: '2024-01-22', label: 'Design', rowId: 'Design', start: '2024-01-01' },
    { end: '2024-02-20', label: 'Build', rowId: 'Build', start: '2024-01-18' },
    { end: '2024-03-08', label: 'Refactor', rowId: 'Build', start: '2024-02-22' },
    { end: '2024-03-15', label: 'QA', rowId: 'QA', start: '2024-02-15' },
    { end: '2024-03-18', label: 'Launch', milestone: true, rowId: 'Launch', start: '2024-03-18' },
  ];

  // Default theme (no overrides)
  defaultConfig = createTimelineChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  // Green bars via config.theme.timeline.bar
  greenConfig: NgeChartConfig = {
    ...createTimelineChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      timeline: {
        bar: { color: '#4CAF50', hoverColor: '#81C784' },
      },
    },
  };

  // Blue bars
  blueConfig: NgeChartConfig = {
    ...createTimelineChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      timeline: {
        bar: { color: '#2196F3', hoverColor: '#64B5F6' },
      },
    },
  };

  // Red bars
  redConfig: NgeChartConfig = {
    ...createTimelineChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      timeline: {
        bar: { color: '#F44336', hoverColor: '#E57373' },
      },
    },
  };

  // Custom milestone diamond styling via config.theme.timeline.milestone
  milestoneThemedConfig: NgeChartConfig = {
    ...createTimelineChartConfig({
      data: this.sampleData,
      showLabels: true,
      showMilestones: true,
    }),
    theme: {
      timeline: {
        milestone: { color: '#FF9800', size: 8, stroke: '#FFF3E0', strokeWidth: 2 },
      },
    },
  };

  // Custom on-bar label styling via config.theme.timeline.label
  labelStyledConfig: NgeChartConfig = {
    ...createTimelineChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      timeline: {
        bar: { color: '#5C6BC0' },
        label: { color: '#FFFFFF', fontSize: 12, fontWeight: 700 },
      },
    },
  };
}
