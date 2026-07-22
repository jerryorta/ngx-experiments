import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeLineDataPoint } from '../../../../core/config';
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
 * Usage examples for the shared crosshair + shared multi-series tooltip (ARCH-213).
 * Doc-style: a LINE host and an AREA host over a categorical daily x, single- and
 * multi-series, each with `crosshair: { x, shared }` enabled. The shared tooltip
 * is a real Angular tooltip — the chart runs `[chromelessTooltip]="true"` and each
 * `<nge-chart>` projects a `#ngeChartTooltip` template that renders the card from
 * `content.rows`.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'crosshair-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'crosshair-usage-stories',
  standalone: true,
  styleUrl: './crosshair-usage-stories.component.scss',
  templateUrl: './crosshair-usage-stories.component.html',
})
export class CrosshairUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/crosshair/usage';

  /** 3-series dataset shared by the line + area multi-series hosts. */
  private readonly multiData = buildCrosshairData(3);

  /** Single-series dataset (no `seriesId`) — the shared tooltip shows one "Value" row. */
  private readonly singleData: NgeLineDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
    x: `Jan ${i + 1}`,
    y: Math.round(58 + 16 * Math.sin(i * 0.55)),
  }));

  /** LINE host, 3 series, vertical guide + shared tooltip. */
  readonly lineMultiConfig = withCrosshair(
    withInsetPointX(
      createLineChartConfig({
        curveType: 'monotone',
        data: this.multiData,
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
    { shared: true, snap: 'datum', x: true, y: false }
  );

  /** AREA host, same 3 series — proves the crosshair is host-agnostic. */
  readonly areaMultiConfig = withCrosshair(
    withInsetPointX(
      createAreaChartConfig({
        curveType: 'monotone',
        data: this.multiData,
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
    { shared: true, snap: 'datum', x: true, y: false }
  );

  /** Single-series LINE host — the shared tooltip degrades to one row. */
  readonly lineSingleConfig = withCrosshair(
    withInsetPointX(
      createLineChartConfig({
        curveType: 'monotone',
        data: this.singleData,
        showPoints: true,
        showXAxis: true,
        showXGrid: true,
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
