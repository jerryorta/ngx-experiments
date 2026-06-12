import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGroupedBarDataPoint } from '../../../../core/config';

import { createGroupedBarChartConfig } from '../../../../presets/grouped-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-grouped-bar-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'nge-grouped-bar-chart-interaction-stories',
  standalone: true,
  styleUrl: './grouped-bar-chart-interaction-stories.component.scss',
  templateUrl: './grouped-bar-chart-interaction-stories.component.html',
})
export class GroupedBarChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/grouped-bar-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(20);
  readonly marginLeft = input<number>(10);

  // Layer config inputs
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly showLabels = input<boolean>(true);
  readonly showXAxis = input<boolean>(false);
  readonly showYAxis = input<boolean>(false);
  readonly showTooltip = input<boolean>(false);
  readonly showLegend = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);

  // Legend inputs
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');

  // Theme inputs - Bar styling
  readonly barColor = input<string>('');
  readonly barHoverColor = input<string>('');
  readonly barRadius = input<number>(2);

  // Theme inputs - Label styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(11);

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Sample data as signal for dynamic updates
  readonly sampleData = signal<NgeGroupedBarDataPoint[]>([
    { color: '#4CAF50', groupId: 'Active', label: 'Avg', value: 185 },
    { color: '#81C784', groupId: 'Active', label: 'Min', value: 142 },
    { color: '#2E7D32', groupId: 'Active', label: 'Max', value: 225 },
    { color: '#2196F3', groupId: 'Closed', label: 'Avg', value: 178 },
    { color: '#64B5F6', groupId: 'Closed', label: 'Min', value: 135 },
    { color: '#1565C0', groupId: 'Closed', label: 'Max', value: 210 },
  ]);

  // Randomize data values
  randomizeData(): void {
    const groups = ['Active', 'Closed'];
    const labels = ['Avg', 'Min', 'Max'];
    const colors: Record<string, string[]> = {
      Active: ['#4CAF50', '#81C784', '#2E7D32'],
      Closed: ['#2196F3', '#64B5F6', '#1565C0'],
    };

    const newData: NgeGroupedBarDataPoint[] = [];
    for (const group of groups) {
      for (let i = 0; i < labels.length; i++) {
        newData.push({
          color: colors[group][i],
          groupId: group,
          label: labels[i],
          value: Math.floor(Math.random() * 200) + 100,
        });
      }
    }
    this.sampleData.set(newData);
  }

  // Computed config that rebuilds when any input changes
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createGroupedBarChartConfig({
      data: this.sampleData(),
      legend: this.showLegend()
        ? {
            enabled: true,
            position: this.legendPosition(),
          }
        : undefined,
      orientation: this.orientation(),
      showLabels: this.showLabels(),
      showXAxis: this.showXAxis(),
      showYAxis: this.showYAxis(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            position: this.tooltipPosition(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
            width: this.tooltipWidth(),
          }
        : undefined,
    });

    // Apply base and theme overrides from controls
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
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
        'grouped-bar': {
          bar: {
            color: this.barColor() || undefined,
            hoverColor: this.barHoverColor() || undefined,
            radius: this.barRadius(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
        },
      },
    };
  });
}
