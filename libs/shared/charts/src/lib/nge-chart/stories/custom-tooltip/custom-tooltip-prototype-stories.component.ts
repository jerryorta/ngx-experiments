import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../core/config';
import type { NgeTooltipContent } from '../../../core/tooltip';

import { createLineChartConfig } from '../../../presets';
import { NgeChartComponent } from '../../nge-chart.component';

/** 3-series palette + labels shared by the chart lines and the custom tooltip swatches. */
const SERIES = [
  { color: '#1E88E5', id: 'Product A' },
  { color: '#43A047', id: 'Product B' },
  { color: '#FB8C00', id: 'Product C' },
];
const PALETTE = SERIES.map(s => s.color);
const COLOR_BY_SERIES: Record<string, string> = Object.fromEntries(
  SERIES.map(s => [s.id, s.color])
);

/** Points per series over a categorical daily x. */
const POINT_COUNT = 10;

function buildData(): NgeLineDataPoint[] {
  return SERIES.flatMap((series, si) =>
    Array.from({ length: POINT_COUNT }, (_, i) => ({
      seriesId: series.id,
      x: `Jan ${i + 1}`,
      y: Math.round(42 + si * 6 + 16 * Math.sin(i * 0.7 + si)),
    }))
  );
}

/** Inset the categorical (point) x-scale so end nodes/labels aren't flush to the edges. */
function withInsetPointX(cfg: NgeChartConfig): NgeChartConfig {
  const inner = cfg.scaleFactory;
  if (!inner) {
    return cfg;
  }
  return {
    ...cfg,
    scaleFactory: (config, dimensions) => {
      const scales = inner(config, dimensions);
      const x = scales.x as { padding?: (outer: number) => void };
      x.padding?.(0.5);
      return scales;
    },
  };
}

/**
 * Prototype harness demonstrating a CUSTOM Angular tooltip replacing the default
 * one (ARCH-213 follow-up). The chart's per-mark tooltip is projected through the
 * `#ngeChartTooltip` template slot; the `chromeless` toggle drops the built-in
 * bubble (`[chromelessTooltip]`) so the custom template becomes the entire tooltip
 * with its own chrome.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'custom-tooltip-prototype-stories' },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'custom-tooltip-prototype-stories',
  standalone: true,
  styleUrl: './custom-tooltip-prototype-stories.component.scss',
  templateUrl: './custom-tooltip-prototype-stories.component.html',
})
export class CustomTooltipPrototypeStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/custom-tooltip';

  /** Drop the default bubble so the custom `#ngeChartTooltip` template is the whole tooltip. */
  readonly chromeless = input<boolean>(false);

  private readonly data = buildData();

  readonly config = computed<NgeChartConfig>(() =>
    withInsetPointX(
      createLineChartConfig({
        curveType: 'monotone',
        data: this.data,
        legend: { enabled: true, position: 'bottom' },
        seriesColors: PALETTE,
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
        tooltip: {
          enabled: true,
          formatContent: (d: NgeLineDataPoint): NgeTooltipContent => ({
            extra: {
              color: COLOR_BY_SERIES[d.seriesId ?? ''] ?? 'var(--chart-primary)',
              x: String(d.x),
            },
            label: d.seriesId ?? 'Value',
            value: d.y,
          }),
          width: 150,
        },
        xAxisLabel: 'Date',
        yAxisLabel: 'Value',
      })
    )
  );

  /** Swatch colour carried on the tooltip content's `extra` bag. */
  colorOf(content: NgeTooltipContent | null): string {
    return (content?.extra?.['color'] as string) ?? 'var(--chart-primary)';
  }

  /** The x label carried on `extra`. */
  xOf(content: NgeTooltipContent | null): string {
    return (content?.extra?.['x'] as string) ?? '';
  }
}
