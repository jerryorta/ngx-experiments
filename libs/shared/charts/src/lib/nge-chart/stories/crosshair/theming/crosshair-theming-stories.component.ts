import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTooltipContent, NgeTooltipRow } from '../../../../core/tooltip';

import { createLineChartConfig } from '../../../../presets';
import { NgeChartComponent } from '../../../nge-chart.component';
import {
  buildCrosshairData,
  CROSSHAIR_PALETTE,
  withCrosshair,
  withInsetPointX,
} from '../crosshair-demo-data';

/**
 * Theming examples for the shared crosshair (ARCH-213). The chart config is
 * identical across all three — only CSS changes: each `.chart-container` variant
 * recolours the GUIDE via the `--chart-crosshair-guide` token (falling back to
 * `--chart-on-surface`) and restyles the shared tooltip CARD via `--chart-*`
 * tokens and/or the template's own `crosshair-tip--*` classes.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'crosshair-theming-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'crosshair-theming-stories',
  standalone: true,
  styleUrl: './crosshair-theming-stories.component.scss',
  templateUrl: './crosshair-theming-stories.component.html',
})
export class CrosshairThemingStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/crosshair/theming';

  private readonly data = buildCrosshairData(3);

  /** One shared config — theming is applied entirely in CSS, not the chart config. */
  readonly config = withCrosshair(
    withInsetPointX(
      createLineChartConfig({
        curveType: 'monotone',
        data: this.data,
        legend: { enabled: true, position: 'bottom' },
        seriesColors: CROSSHAIR_PALETTE,
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
        xAxisLabel: 'Date',
        yAxisLabel: 'Value',
      })
    ),
    { shared: true, snap: 'datum', x: true, y: false }
  );

  /** Type-safe accessor for the shared tooltip rows in the `#ngeChartTooltip` template. */
  rowsOf(content: NgeTooltipContent | null): NgeTooltipRow[] {
    return content?.rows ?? [];
  }
}
