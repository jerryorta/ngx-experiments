import type { Signal, WritableSignal } from '@angular/core';

import { computed, signal } from '@angular/core';

import type { NgeChartConfig, NgeScatterDataPoint } from '../core/config';
import type { NgeChartGestureEvent } from '../core/gesture';
import type { NgeLegendItem } from '../core/legend';
import type { ScatterChartPresetOptions } from '../presets/scatter-chart.preset';

import { clampDomain, isDegenerateSpan, panDomain, zoomDomain } from '../core/gesture';
import { extractScatterChartLegendItems } from '../core/legend';
import {
  computeScatterXDataDomain,
  computeScatterYDataDomain,
  createScatterChartConfig,
} from '../presets/scatter-chart.preset';

/**
 * Options for NgeScatterChartTransform — the scatter preset options plus the
 * transform's fade policy.
 */
export interface NgeScatterTransformOptions extends ScatterChartPresetOptions {
  /**
   * Opacity applied to NON-selected series' legend entries while a series is
   * selected. Higher than the point fade for label readability.
   * @default 0.4
   */
  fadedLegendOpacity?: number;

  /**
   * Opacity applied to NON-selected series' points while a series is selected.
   * Opacity (not color math) is the fade primitive because series colors may be
   * unresolved `var(--chart-*)` strings.
   * @default 0.15
   */
  fadedPointOpacity?: number;
}

/**
 * Coordinates interaction state → scatter chart config.
 *
 * A plain class (no DI — same idiom as ChartsTooltipCalc) that owns the
 * *semantics* of chart interactivity while the chart itself stays dumb:
 * every interaction produces a new `NgeChartConfig`, and `<nge-chart>`
 * re-renders it (D3 update-joins animate the change).
 *
 * v1 scope: legend series selection (selected series stays prominent, all
 * other series fade) and programmatic axis zoom via explicit domains.
 * Chart-emitted pan/zoom gestures are the planned follow-on — when the chart
 * emits them, feed the ranges into `setXDomain`/`setYDomain` here.
 *
 * @example
 * // Component
 * readonly transform = new NgeScatterChartTransform({
 *   data: myPoints, // points carry seriesId
 *   tooltip: { enabled: true },
 * });
 *
 * // Template
 * <nge-chart
 *   [config]="transform.config()"
 *   (legendItemClick)="transform.onLegendItemClick($event)"
 * />
 */
export class NgeScatterChartTransform {
  /** Derived chart config — bind to `<nge-chart [config]="transform.config()">`. */
  readonly config: Signal<NgeChartConfig>;

  /**
   * Selection-stamped legend items — the feed for an EXTERNAL standalone
   * `<nge-chart-legend>` (custom placement). Stays populated even when the
   * chart-internal legend is suppressed via `legend: { enabled: false }`.
   */
  readonly legendItems: Signal<NgeLegendItem[]>;

  /** Currently selected seriesId, or null when nothing is selected. */
  readonly selectedSeries: Signal<null | string>;

  private readonly options: WritableSignal<NgeScatterTransformOptions>;
  private readonly selectedSeriesId = signal<null | string>(null);
  /** True while a zoom/pan gesture drives renders — suppresses transitions (animationMs 0). */
  private readonly suppressAnimation = signal(false);
  private readonly xDomainOverride = signal<[number, number] | null>(null);
  private readonly yDomainOverride = signal<[number, number] | null>(null);

  constructor(options: NgeScatterTransformOptions) {
    this.options = signal(options);
    this.selectedSeries = this.selectedSeriesId.asReadonly();
    this.legendItems = computed(() => this.buildLegendItems());
    this.config = computed(() => this.buildConfig());
  }

  /** Clear the series selection (all series back to full prominence). */
  clearSelection(): void {
    this.suppressAnimation.set(false);
    this.selectedSeriesId.set(null);
  }

  /**
   * Consume a semantic gesture event from the chart — wire to
   * `(chartGesture)="transform.onChartGesture($event)"`.
   *
   * Pure math on the STATELESS event payload (it carries the current rendered
   * domains): pan shifts both domains by the data-space delta; zoom rescales
   * around the cursor focus; range-zoom sets a SINGLE axis's focus from a
   * range-axis brush drag (the other axis untouched); dblclick reset restores
   * data-driven domains. Pan/zoom/range-zoom renders suppress transitions
   * (animationMs 0) so per-frame re-renders don't smear; reset re-enables them
   * for a smooth zoom-out.
   */
  onChartGesture(event: NgeChartGestureEvent): void {
    if (event.kind === 'reset') {
      this.suppressAnimation.set(false);
      this.resetZoom();
      return;
    }

    if (event.kind === 'band-window') {
      return; // a continuous (scatter) chart has no band axis to window
    }

    // Every remaining gesture writes a focus domain — clamp each to the full data
    // extent so zoom-out floors at 100% and pan stops at the data bounds (the
    // continuous mirror of the band-window clamp; also keeps the range-axis
    // window from overflowing its ruler).
    const full = this.fullDomains();

    if (event.kind === 'zoom-rect') {
      // Brush release is a DISCRETE action — animate the zoom-in (unlike
      // continuous wheel/pan, which suppress transitions per frame)
      this.suppressAnimation.set(false);
      this.xDomainOverride.set(clampDomain(event.xExtent, full.x));
      this.yDomainOverride.set(clampDomain(event.yExtent, full.y));
      return;
    }

    if (event.kind === 'range-zoom') {
      // Continuous drag on a range-axis brush → instant per-frame renders (like
      // pan). Sets ONLY the named axis's focus override; the other axis is left
      // as-is. resetZoom() (dbl-click) clears it → the brush snaps back to full.
      this.suppressAnimation.set(true);
      if (event.axis === 'x') {
        this.xDomainOverride.set(clampDomain(event.domain, full.x));
      } else {
        this.yDomainOverride.set(clampDomain(event.domain, full.y));
      }
      return;
    }

    this.suppressAnimation.set(true);

    if (event.kind === 'pan') {
      // Content follows the cursor: dragging right shifts the domain left
      this.xDomainOverride.set(clampDomain(panDomain(event.xDomain, event.xDelta), full.x));
      this.yDomainOverride.set(clampDomain(panDomain(event.yDomain, event.yDelta), full.y));
      return;
    }

    // Zoom around the focus point (shared continuous math)
    const nextX = zoomDomain(event.xDomain, event.focus.x, event.factor);
    const nextY = zoomDomain(event.yDomain, event.focus.y, event.factor);

    // Guard degenerate spans (extreme programmatic factors)
    if (isDegenerateSpan(nextX, event.xDomain) || isDegenerateSpan(nextY, event.yDomain)) {
      return;
    }

    this.xDomainOverride.set(clampDomain(nextX, full.x));
    this.yDomainOverride.set(clampDomain(nextY, full.y));
  }

  /**
   * Toggle selection from a legend click — wire to the chart's
   * `(legendItemClick)`. Clicking the selected series again clears it.
   */
  onLegendItemClick(item: NgeLegendItem): void {
    this.suppressAnimation.set(false);
    const seriesId = item.id ?? item.label;
    this.selectedSeriesId.update(current => (current === seriesId ? null : seriesId));
  }

  /** Reset both axis-domain overrides back to the data-driven domains. */
  resetZoom(): void {
    this.suppressAnimation.set(false);
    this.xDomainOverride.set(null);
    this.yDomainOverride.set(null);
  }

  /** Select a series programmatically (null clears). */
  selectSeries(seriesId: null | string): void {
    this.suppressAnimation.set(false);
    this.selectedSeriesId.set(seriesId);
  }

  /** Replace the source data (selection and zoom state are preserved). */
  setData(data: NgeScatterDataPoint[]): void {
    this.options.update(current => ({ ...current, data }));
  }

  /**
   * Merge a partial options update (selection and zoom state are preserved).
   * For option-driven consumers — e.g. Storybook controls or app filters that
   * change axis labels, tooltip config, or data together.
   */
  updateOptions(options: Partial<NgeScatterTransformOptions>): void {
    this.options.update(current => ({ ...current, ...options }));
  }

  /** Zoom the X axis to an explicit `[min, max]` domain (null resets). */
  setXDomain(domain: [number, number] | null): void {
    this.xDomainOverride.set(domain);
  }

  /** Zoom the Y axis to an explicit `[min, max]` domain (null resets). */
  setYDomain(domain: [number, number] | null): void {
    this.yDomainOverride.set(domain);
  }

  /**
   * The full, un-zoomed data extent per axis — the SAME domain the scale factory
   * renders by default (an explicit `xDomain`/`yDomain` wins, else the shared
   * `computeScatter*DataDomain`), so "100%" is exactly the initial view and the
   * range-axis ruler and the plot agree. The clamp bound for every gesture.
   */
  private fullDomains(): { x: [number, number]; y: [number, number] } {
    const {
      data,
      xDomain,
      xDomainPadding = 0.05,
      yDomain,
      yDomainPadding = 0.1,
      yStartAtZero = false,
    } = this.options();

    return {
      x: xDomain ?? computeScatterXDataDomain(data, xDomainPadding),
      y: yDomain ?? computeScatterYDataDomain(data, yDomainPadding, yStartAtZero),
    };
  }

  /**
   * Regenerate legend items from the ORIGINAL data and stamp selection state.
   * Shared by the internal chart legend (via buildConfig) and any external
   * standalone legend (via the `legendItems` signal).
   */
  private buildLegendItems(): NgeLegendItem[] {
    const { fadedLegendOpacity = 0.4, ...presetOptions } = this.options();
    const selected = this.selectedSeriesId();

    const baseItems =
      presetOptions.legend?.items ??
      extractScatterChartLegendItems(presetOptions.data, presetOptions.seriesColors);

    return baseItems.map(item => {
      const id = item.id ?? item.label;
      const isSelected = selected !== null && id === selected;
      return {
        ...item,
        opacity: selected === null || isSelected ? undefined : fadedLegendOpacity,
        selected: isSelected,
      };
    });
  }

  /**
   * Derive the chart config from the current interaction state:
   * - selection → non-selected series' points fade via per-point `opacity`
   *   (selected series' points pass through untouched, keeping their own
   *   per-point overrides); legend entries mirror the fade + carry `selected`
   * - zoom → explicit `xDomain`/`yDomain` overrides
   */
  private buildConfig(): NgeChartConfig {
    const { fadedLegendOpacity, fadedPointOpacity = 0.15, ...presetOptions } = this.options();
    void fadedLegendOpacity; // consumed by buildLegendItems
    const selected = this.selectedSeriesId();

    // Fade every point whose series is not the selected one
    const data =
      selected === null
        ? presetOptions.data
        : presetOptions.data.map(point =>
            (point.seriesId ?? '__default__') === selected
              ? point
              : { ...point, opacity: fadedPointOpacity }
          );

    return createScatterChartConfig({
      ...presetOptions,
      animationMs: this.suppressAnimation() ? 0 : presetOptions.animationMs,
      data,
      legend: {
        enabled: true,
        interactive: true,
        ...presetOptions.legend,
        items: this.legendItems(),
      },
      xDomain: this.xDomainOverride() ?? presetOptions.xDomain,
      yDomain: this.yDomainOverride() ?? presetOptions.yDomain,
    });
  }
}
