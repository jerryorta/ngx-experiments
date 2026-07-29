import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig } from '../../../../core/config';
import type { NgeTooltipContent, NgeTooltipRow } from '../../../../core/tooltip';

import {
  createAreaChartConfig,
  createBarChartConfig,
  createGroupedBarChartConfig,
  createLineChartConfig,
  createOverlayConfig,
  createStackedBarChartConfig,
} from '../../../../presets';
import { NgeLineChartTransform } from '../../../../transforms/line-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';
import {
  buildBarCrosshairData,
  buildContinuousCrosshairData,
  buildCrosshairData,
  buildGroupedBarCrosshairData,
  buildMarimekkoCrosshairData,
  buildOverlayCrosshairData,
  buildStackedBarCrosshairData,
  CROSSHAIR_PALETTE,
  withCrosshair,
  withInsetPointX,
  withLayer,
  withLegendPosition,
} from '../crosshair-demo-data';

/** Every host layer the interaction harness can put the crosshair on. */
export type CrosshairInteractionHost =
  'area' | 'bar' | 'grouped-bar' | 'line' | 'marimekko' | 'overlay' | 'stacked-bar';

/**
 * Interaction harness for the shared crosshair (ARCH-213). The Storybook controls
 * (`host`, `crosshairX`, `crosshairY`, `sharedTooltip`, `legendPosition`) drive
 * `input()` signals; a computed rebuilds the config with the opt-in crosshair merged
 * onto a LINE or AREA host. The shared tooltip renders through the chromeless
 * `#ngeChartTooltip` template. Move the pointer over the plot to snap the guide +
 * read the card.
 *
 * `legendPosition` is ARCH-223's harness as well as a control: `top` and `left` move
 * the plot's origin inside the chart host, which is what the tooltip's placement has
 * to be measured through.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-crosshair-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-crosshair-interaction-stories',
  standalone: true,
  styleUrl: './crosshair-interaction-stories.component.scss',
  templateUrl: './crosshair-interaction-stories.component.html',
})
export class NgeCrosshairInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/crosshair/interaction';

  /**
   * Which host layer the crosshair reads. `line` / `area` resolve a datum x on a
   * continuous scale; the bar family resolves the CATEGORY the pointer is over;
   * `overlay` composes an analytical annotation onto the line host and contributes
   * its derived value as an extra row (ARCH-263).
   */
  readonly host = input<CrosshairInteractionHost>('line');
  /** Draw the vertical guide that snaps to the nearest datum x. */
  readonly crosshairX = input<boolean>(true);
  /** Draw the horizontal guide at the pointer y. */
  readonly crosshairY = input<boolean>(false);
  /** Render the single shared tooltip listing every series' value at the snapped x. */
  readonly sharedTooltip = input<boolean>(true);
  /**
   * Enable wheel-zoom / drag-pan / shift-drag brush-zoom on the plot (double-click
   * resets). Switches the host to the CONTINUOUS-x series driven by
   * {@link transform}, since pan and zoom move a continuous domain.
   */
  readonly enableGestures = input<boolean>(false);
  /**
   * Which edge the legend sits on. `top` and `left` push the plot's origin down/right
   * inside the chart host, so they are what the shared tooltip's placement has to be
   * measured through (ARCH-223) — flip through all four and the card stays beside the
   * guide.
   */
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');

  /** The shared 3-series dataset (both continuous hosts consume the same data). */
  private readonly data = buildCrosshairData(3);

  /** Band-x datasets — one per bar-family host, over the same categories. */
  private readonly barData = buildBarCrosshairData();
  private readonly groupedBarData = buildGroupedBarCrosshairData();
  private readonly stackedBarData = buildStackedBarCrosshairData();
  /** Lopsided totals, so the Marimekko columns differ enough to be worth pointing at. */
  private readonly marimekkoData = buildMarimekkoCrosshairData();

  /** Source series the composed analytical overlay is fitted from. */
  private readonly overlayData = buildOverlayCrosshairData();

  /**
   * Owns the gesture interaction state and derives the config from it — each frame
   * writes a new domain and pins `animationMs: 0`, so the chart re-renders
   * continuously while the pointer is down. That is exactly the re-render the
   * crosshair has to survive, which makes this story ARCH-222's harness rather
   * than only its demo.
   */
  readonly transform = new NgeLineChartTransform({
    curveType: 'monotone',
    data: buildContinuousCrosshairData(3),
    gestures: { brushZoom: true, pan: true, zoom: true },
    legend: { enabled: true, position: 'bottom' },
    seriesColors: CROSSHAIR_PALETTE,
    showPoints: true,
    showXAxis: true,
    showXGrid: true,
    showYAxis: true,
    xAxisLabel: 'Day',
    yAxisLabel: 'Value',
  });

  /** Chart config with the opt-in crosshair merged onto the selected host preset. */
  readonly config = computed<NgeChartConfig>(() => {
    const crosshair = {
      shared: this.sharedTooltip(),
      snap: 'datum' as const,
      x: this.crosshairX(),
      y: this.crosshairY(),
    };

    const legendPosition = this.legendPosition();

    // The gesture host reads its config from the transform, which re-derives it on
    // every frame of a pan/zoom. `host` does not apply here — the transform builds
    // a line preset.
    if (this.enableGestures()) {
      return withCrosshair(withLegendPosition(this.transform.config(), legendPosition), crosshair);
    }

    // Band hosts: the anchor is the CATEGORY the pointer is over, so no point-scale
    // inset (that is for a point scale's flush first/last nodes — a band already
    // occupies width).
    if (this.host() === 'bar') {
      return withCrosshair(
        createBarChartConfig({
          data: this.barData,
          showXAxis: true,
          showYAxis: true,
          showYGrid: true,
          xAxisLabel: 'Month',
          yAxisLabel: 'Value',
        }),
        crosshair
      );
    }

    if (this.host() === 'grouped-bar') {
      return withCrosshair(
        createGroupedBarChartConfig({
          data: this.groupedBarData,
          legend: { enabled: true, position: legendPosition },
          showXAxis: true,
          showYAxis: true,
          showYGrid: true,
          xAxisLabel: 'Month',
          yAxisLabel: 'Value',
        }),
        crosshair
      );
    }

    if (this.host() === 'stacked-bar' || this.host() === 'marimekko') {
      const isMarimekko = this.host() === 'marimekko';
      return withCrosshair(
        createStackedBarChartConfig({
          // Marimekko weights each column's WIDTH by its group total, which is the
          // case where the band the pointer is over and the nearest band centre
          // genuinely disagree.
          bandWidthAccessor: isMarimekko ? (_category, total) => total : undefined,
          data: isMarimekko ? this.marimekkoData : this.stackedBarData,
          legend: { enabled: true, position: legendPosition },
          seriesColors: CROSSHAIR_PALETTE,
          showXAxis: true,
          showYAxis: true,
          xAxisLabel: 'Month',
          yAxisLabel: 'Value',
        }),
        crosshair
      );
    }

    // An overlay is composed ONTO a host rather than being one: it draws on the
    // line's shared scales and contributes its fitted value as an extra row.
    if (this.host() === 'overlay') {
      return withCrosshair(
        withLayer(
          createLineChartConfig({
            data: buildContinuousCrosshairData(1),
            legend: { enabled: true, position: legendPosition },
            seriesColors: CROSSHAIR_PALETTE,
            showPoints: true,
            showXAxis: true,
            showXGrid: true,
            showYAxis: true,
            xAxisLabel: 'Day',
            yAxisLabel: 'Value',
          }),
          createOverlayConfig({ data: this.overlayData, fit: 'linear', mode: 'trendline' })
        ),
        crosshair
      );
    }

    if (this.host() === 'area') {
      return withCrosshair(
        withInsetPointX(
          createAreaChartConfig({
            curveType: 'monotone',
            data: this.data,
            fillOpacity: 0.25,
            legend: { enabled: true, position: legendPosition },
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
          legend: { enabled: true, position: legendPosition },
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
