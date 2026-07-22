import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig } from '../../../../core/config';
import type { NgeTooltipContent, NgeTooltipRow } from '../../../../core/tooltip';

import { createAreaChartConfig, createLineChartConfig } from '../../../../presets';
import { NgeChartComponent } from '../../../nge-chart.component';
import {
  buildCrosshairData,
  CROSSHAIR_PALETTE,
  withCrosshair,
  withInsetPointX,
} from '../crosshair-demo-data';

/**
 * Interaction harness for the shared crosshair (ARCH-213). The Storybook controls
 * (`host`, `crosshairX`, `crosshairY`, `sharedTooltip`) drive `input()` signals; a
 * computed rebuilds the config with the opt-in crosshair merged onto a LINE or AREA
 * host. The shared tooltip renders through the chromeless `#ngeChartTooltip`
 * template. Move the pointer over the plot to snap the guide + read the card.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'crosshair-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'crosshair-interaction-stories',
  standalone: true,
  styleUrl: './crosshair-interaction-stories.component.scss',
  templateUrl: './crosshair-interaction-stories.component.html',
})
export class CrosshairInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/crosshair/interaction';

  /** Which host layer draws the series — line or area (both continuous-x). */
  readonly host = input<'area' | 'line'>('line');
  /** Draw the vertical guide that snaps to the nearest datum x. */
  readonly crosshairX = input<boolean>(true);
  /** Draw the horizontal guide at the pointer y. */
  readonly crosshairY = input<boolean>(false);
  /** Render the single shared tooltip listing every series' value at the snapped x. */
  readonly sharedTooltip = input<boolean>(true);

  /** The shared 3-series dataset (both hosts consume the same data). */
  private readonly data = buildCrosshairData(3);

  /** Chart config with the opt-in crosshair merged onto the selected host preset. */
  readonly config = computed<NgeChartConfig>(() => {
    const crosshair = {
      shared: this.sharedTooltip(),
      snap: 'datum' as const,
      x: this.crosshairX(),
      y: this.crosshairY(),
    };

    if (this.host() === 'area') {
      return withCrosshair(
        withInsetPointX(
          createAreaChartConfig({
            curveType: 'monotone',
            data: this.data,
            fillOpacity: 0.25,
            legend: { enabled: true, position: 'bottom' },
            seriesColors: CROSSHAIR_PALETTE,
            showLine: true,
            showXAxis: true,
            showXGrid: true,
            showYAxis: true,
            xAxisLabel: 'Date',
            yAxisLabel: 'Value',
          })
        ),
        crosshair
      );
    }

    return withCrosshair(
      withInsetPointX(
        createLineChartConfig({
          curveType: 'monotone',
          data: this.data,
          legend: { enabled: true, position: 'bottom' },
          seriesColors: CROSSHAIR_PALETTE,
          showPoints: true,
          showXAxis: true,
          showXGrid: true,
          showYAxis: true,
          xAxisLabel: 'Date',
          yAxisLabel: 'Value',
        })
      ),
      crosshair
    );
  });

  /** Type-safe accessor for the shared tooltip rows in the `#ngeChartTooltip` template. */
  rowsOf(content: NgeTooltipContent | null): NgeTooltipRow[] {
    return content?.rows ?? [];
  }
}
