import { Component, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';
import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../../../core/base-layout';
import type { NgeChartDimensions } from '../../../core/chart.models';
import type { NgeBarDataPoint, NgeChartConfig, NgeLineDataPoint } from '../../../core/config';
import type { NgeTooltipContent } from '../../../core/tooltip';

import { extractLineChartLegendItems } from '../../../core/legend';
import { createBarChartConfig } from '../../../presets/bar-chart.preset';
import { createLineChartConfig } from '../../../presets/line-chart.preset';
import { NgeChartComponent } from '../../nge-chart.component';

/**
 * Line series data for tooltip display
 */
interface LineSeriesValue {
  color: string;
  name: string;
  value: number;
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-composite-chart-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-composite-chart-stories',
  standalone: true,
  styleUrl: './composite-chart-stories.component.scss',
  templateUrl: './composite-chart-stories.component.html',
})
export class CompositeChartStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/composite';

  // Series colors for line layers (must match config)
  private readonly lineSeriesColors = ['#D32F2F', '#1976D2', '#7B1FA2']; // Red, Blue, Purple

  // ============================================
  // Bar + Line Composite Chart
  // ============================================

  // Bar data - Monthly revenue
  barData: NgeBarDataPoint[] = [
    { color: '#42A5F5', label: 'Jan', value: 120 },
    { color: '#66BB6A', label: 'Feb', value: 150 },
    { color: '#FFA726', label: 'Mar', value: 180 },
    { color: '#EF5350', label: 'Apr', value: 140 },
    { color: '#AB47BC', label: 'May', value: 200 },
    { color: '#26C6DA', label: 'Jun', value: 175 },
  ];

  // Line data - Multiple trend lines
  lineData: NgeLineDataPoint[] = [
    // Target line
    { seriesId: 'Target', x: 'Jan', y: 160 },
    { seriesId: 'Target', x: 'Feb', y: 165 },
    { seriesId: 'Target', x: 'Mar', y: 170 },
    { seriesId: 'Target', x: 'Apr', y: 175 },
    { seriesId: 'Target', x: 'May', y: 180 },
    { seriesId: 'Target', x: 'Jun', y: 185 },
    // Moving Average line
    { seriesId: 'Avg', x: 'Jan', y: 120 },
    { seriesId: 'Avg', x: 'Feb', y: 135 },
    { seriesId: 'Avg', x: 'Mar', y: 150 },
    { seriesId: 'Avg', x: 'Apr', y: 148 },
    { seriesId: 'Avg', x: 'May', y: 167 },
    { seriesId: 'Avg', x: 'Jun', y: 171 },
    // Forecast line
    { seriesId: 'Forecast', x: 'Jan', y: 115 },
    { seriesId: 'Forecast', x: 'Feb', y: 140 },
    { seriesId: 'Forecast', x: 'Mar', y: 165 },
    { seriesId: 'Forecast', x: 'Apr', y: 155 },
    { seriesId: 'Forecast', x: 'May', y: 190 },
    { seriesId: 'Forecast', x: 'Jun', y: 195 },
  ];

  /**
   * Get line series values for a given month label
   */
  private getLineSeriesForMonth(label: string): LineSeriesValue[] {
    // Get unique series IDs in order of first appearance
    const seriesIds: string[] = [];
    for (const point of this.lineData) {
      if (point.seriesId && !seriesIds.includes(point.seriesId)) {
        seriesIds.push(point.seriesId);
      }
    }

    // Get value for each series at this x position
    return seriesIds.map((seriesId, index) => {
      const point = this.lineData.find(p => p.seriesId === seriesId && p.x === label);
      return {
        color: this.lineSeriesColors[index % this.lineSeriesColors.length],
        name: seriesId,
        value: point?.y ?? 0,
      };
    });
  }

  /**
   * Format bar data point for tooltip, including line series data
   */
  private formatBarTooltip = (d: NgeBarDataPoint): NgeTooltipContent => {
    const lineSeries = this.getLineSeriesForMonth(d.label);
    return {
      extra: {
        barColor: d.color,
        barValue: d.value,
        lineSeries,
      },
      label: d.label,
      value: `$${d.value}K`,
    };
  };

  /**
   * Format line data point for tooltip
   */
  private formatLineTooltip = (d: NgeLineDataPoint): NgeTooltipContent => {
    const seriesName = d.seriesId ?? 'Value';
    const seriesIndex = this.getSeriesIndex(d.seriesId);
    const seriesColor = this.lineSeriesColors[seriesIndex % this.lineSeriesColors.length];

    return {
      extra: {
        seriesColor,
        seriesName,
      },
      label: String(d.x),
      value: `$${d.y}K`,
    };
  };

  /**
   * Get the index of a series by its ID
   */
  private getSeriesIndex(seriesId?: string): number {
    if (!seriesId) return 0;
    const seriesIds: string[] = [];
    for (const point of this.lineData) {
      if (point.seriesId && !seriesIds.includes(point.seriesId)) {
        seriesIds.push(point.seriesId);
      }
    }
    return seriesIds.indexOf(seriesId);
  }

  // Create bar layer config using preset (renderer injected automatically)
  private barLayerConfig = createBarChartConfig({
    barPadding: 0.3,
    barRadius: 4,
    data: this.barData,
    tooltip: {
      enabled: true,
      formatContent: this.formatBarTooltip,
      height: 170,
      position: 'above',
      width: 160,
    },
  });

  // Create line layer config using preset (renderer injected automatically)
  private lineLayerConfig = createLineChartConfig({
    curveType: 'monotone',
    data: this.lineData,
    lineWidth: 2,
    pointRadius: 5,
    seriesColors: this.lineSeriesColors,
    showPoints: true,
    tooltip: {
      enabled: true,
      formatContent: this.formatLineTooltip,
      height: 70,
      position: 'above',
      width: 160,
    },
  });

  // Combine layers into a composite config
  compositeConfig: NgeChartConfig = {
    base: {
      margin: { bottom: 50, left: 60, right: 20, top: 20 },
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Month',
      yAxisLabel: 'Revenue ($K)',
    },
    // Combine layers from presets (bar rendered first/back, line second/front)
    layers: [...this.barLayerConfig.layers, ...this.lineLayerConfig.layers],
    legend: {
      enabled: true,
      items: extractLineChartLegendItems(this.lineData, this.lineSeriesColors),
      position: 'bottom',
    },
    scaleFactory: (_config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
      // Collect all labels from bar data
      const labels = this.barData.map(d => d.label);

      // Collect all values from both bar and line data
      const barValues = this.barData.map(d => d.value);
      const lineValues = this.lineData.map(d => d.y);
      const allValues = [...barValues, ...lineValues];
      const maxValue = Math.max(...allValues) * 1.1;

      // Create scales
      const xScale = scaleBand<string>()
        .domain(labels)
        .range([0, dimensions.boundedWidth])
        .padding(0.2);

      const yScale = scaleLinear().domain([0, maxValue]).range([dimensions.boundedHeight, 0]);

      return { x: xScale, y: yScale };
    },
  };
}
