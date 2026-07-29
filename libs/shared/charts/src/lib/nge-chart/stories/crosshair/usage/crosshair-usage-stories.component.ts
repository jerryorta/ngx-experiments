import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';
import type { NgeTooltipContent, NgeTooltipRow } from '../../../../core/tooltip';

import {
  createAreaChartConfig,
  createLineChartConfig,
  createScatterChartConfig,
} from '../../../../presets';
import { NgeChartComponent } from '../../../nge-chart.component';
import {
  buildContinuousCrosshairData,
  buildCrosshairData,
  buildScatterCrosshairData,
  CROSSHAIR_PALETTE,
  withCrosshair,
  withInsetPointX,
  withXAxisTicks,
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
    class: 'nge-crosshair-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-crosshair-usage-stories',
  standalone: true,
  styleUrl: './crosshair-usage-stories.component.scss',
  templateUrl: './crosshair-usage-stories.component.html',
})
export class NgeCrosshairUsageStoriesComponent {
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

  /** 3-series dataset on a CONTINUOUS numeric x — ticks and data deliberately disagree. */
  private readonly continuousData = buildContinuousCrosshairData(3);

  /**
   * A fresh continuous-x LINE config for the snapping comparison. Built per call so
   * the two charts below differ ONLY by `crosshair.snap`, sharing no object identity.
   */
  private continuousLineConfig(): NgeChartConfig {
    return withXAxisTicks(
      createLineChartConfig({
        curveType: 'monotone',
        data: this.continuousData,
        legend: { enabled: true, position: 'bottom' },
        seriesColors: CROSSHAIR_PALETTE,
        showPoints: true,
        showXAxis: true,
        showXGrid: true,
        showYAxis: true,
        xAxisLabel: 'Day',
        yAxisLabel: 'Value',
      }),
      10
    );
  }

  /** `snap: 'datum'` on a continuous x — the guide lands BETWEEN the gridlines. */
  readonly snapDatumConfig = withCrosshair(this.continuousLineConfig(), {
    shared: true,
    snap: 'datum',
    x: true,
    y: false,
  });

  /** `snap: 'tick'` on the SAME data — the guide locks onto the gridlines instead. */
  readonly snapTickConfig = withCrosshair(this.continuousLineConfig(), {
    shared: true,
    snap: 'tick',
    x: true,
    y: false,
  });

  /** 3-series 2-D cloud on a continuous x/y — no two series share an x. */
  private readonly scatterData = buildScatterCrosshairData(3);

  /**
   * A fresh scatter config for the two 2-D demos.
   *
   * ⚠️ `tooltip: { enabled: false }` is load-bearing, not a style choice. The scatter
   * layer's own Voronoi overlay is built only when its tooltip is enabled, and it
   * writes to the SAME Angular tooltip host the crosshair uses — leave both on and
   * the two fight over the card.
   */
  private scatterConfig(): NgeChartConfig {
    return createScatterChartConfig({
      data: this.scatterData,
      legend: { enabled: true, position: 'bottom' },
      pointRadius: 4,
      seriesColors: CROSSHAIR_PALETTE,
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      showYGrid: true,
      tooltip: { enabled: false },
      xAxisLabel: 'Day',
      yAxisLabel: 'Value',
    });
  }

  /** SCATTER host — the anchor is the nearest POINT in 2-D, not the nearest x. */
  readonly scatterConfigX = withCrosshair(this.scatterConfig(), {
    shared: true,
    x: true,
    y: false,
  });

  /** The same host with both guides on, so the full crosshair rides the point. */
  readonly scatterConfigXY = withCrosshair(this.scatterConfig(), {
    shared: true,
    x: true,
    y: true,
  });

  /** Type-safe accessor for the shared tooltip rows in the `#ngeChartTooltip` template. */
  rowsOf(content: NgeTooltipContent | null): NgeTooltipRow[] {
    return content?.rows ?? [];
  }
}
