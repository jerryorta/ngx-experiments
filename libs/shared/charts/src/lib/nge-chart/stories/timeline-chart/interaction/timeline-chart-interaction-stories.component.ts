import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
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
    class: 'timeline-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'timeline-chart-interaction-stories',
  standalone: true,
  styleUrl: './timeline-chart-interaction-stories.component.scss',
  templateUrl: './timeline-chart-interaction-stories.component.html',
})
export class TimelineChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/timeline-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(45);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(80);

  // Layer config inputs — layout
  readonly barRadius = input<number>(2);
  readonly rowPadding = input<number>(0.2);
  readonly milestoneSize = input<number>(6);

  // Layer config inputs — visibility
  readonly showLabels = input<boolean>(true);
  readonly showMilestones = input<boolean>(true);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly showXGrid = input<boolean>(true);

  // Layer config inputs — tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');

  // Theme inputs — bar styling
  readonly barColor = input<string>('');
  readonly barHoverColor = input<string>('');

  // Theme inputs — milestone styling
  readonly milestoneColor = input<string>('');

  // Theme inputs — label styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);

  // Bumped by "Randomize Data" to re-roll the generated spans.
  private readonly randomizeSeed = signal(0);

  // A four-phase project plan, rebuilt whenever the seed bumps.
  readonly sampleData = computed<NgeTimelineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildData();
  });

  // Re-roll the generated spans.
  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  // A four-phase project plan (Jan–Mar 2024) with random-ish span lengths, two bars
  // sharing the Build row, and a trailing Launch milestone.
  private buildData(): NgeTimelineDataPoint[] {
    const day = 86_400_000;
    const jan1 = new Date('2024-01-01').getTime();
    const rand = (min: number, max: number): number =>
      Math.floor(Math.random() * (max - min)) + min;
    const span = (
      rowId: string,
      label: string,
      startDay: number,
      lengthDays: number
    ): NgeTimelineDataPoint => ({
      end: new Date(jan1 + (startDay + lengthDays) * day),
      label,
      rowId,
      start: new Date(jan1 + startDay * day),
    });
    const buildStart = rand(14, 20);
    const refactorStart = buildStart + rand(38, 46);
    const qaStart = rand(44, 50);
    const launchDay = qaStart + rand(28, 34);
    return [
      span('Design', 'Design', 0, rand(16, 24)),
      span('Build', 'Build', buildStart, rand(28, 36)),
      span('Build', 'Refactor', refactorStart, rand(8, 14)),
      span('QA', 'QA', qaStart, rand(24, 30)),
      {
        end: new Date(jan1 + launchDay * day),
        label: 'Launch',
        milestone: true,
        rowId: 'Launch',
        start: new Date(jan1 + launchDay * day),
      },
    ];
  }

  // The control-driven timeline config, rebuilt when any input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createTimelineChartConfig({
      barRadius: this.barRadius(),
      data: this.sampleData(),
      milestoneSize: this.milestoneSize(),
      rowPadding: this.rowPadding(),
      showLabels: this.showLabels(),
      showMilestones: this.showMilestones(),
      showXAxis: this.showXAxis(),
      showXGrid: this.showXGrid(),
      showYAxis: this.showYAxis(),
      tooltip: this.showTooltip() ? { enabled: true, position: this.tooltipPosition() } : undefined,
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        timeline: {
          bar: {
            color: this.barColor() || undefined,
            hoverColor: this.barHoverColor() || undefined,
            radius: this.barRadius(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
          milestone: {
            color: this.milestoneColor() || undefined,
            size: this.milestoneSize(),
          },
        },
      },
    };
  });
}
