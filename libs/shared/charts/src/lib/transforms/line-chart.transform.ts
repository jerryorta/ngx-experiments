import type { Signal, WritableSignal } from '@angular/core';

import { computed, signal } from '@angular/core';

import type { NgeChartConfig, NgeLineDataPoint } from '../core/config';
import type { NgeBandWindow, NgeChartGestureEvent } from '../core/gesture';
import type { LineChartPresetOptions } from '../presets/line-chart.preset';

import {
  applyBandWindowOp,
  clampDomain,
  isDegenerateSpan,
  orderedBandCategories,
  panDomain,
  zoomDomain,
} from '../core/gesture';
import {
  computeLineXDataDomain,
  computeLineYDataDomain,
} from '../nge-chart/nge-chart.line.helpers';
import { createLineChartConfig } from '../presets/line-chart.preset';

/**
 * Coordinates interaction state → line chart config (ARCH-174).
 *
 * A plain class (no DI — same idiom as NgeScatterChartTransform) that owns the
 * SEMANTICS of continuous plot gestures for a line chart: every wheel-zoom /
 * drag-pan / brush-zoom / dblclick-reset produces a new `NgeChartConfig`, and
 * `<nge-chart>` re-renders it. The zoom/pan/brush math is the SHARED continuous
 * domain math ({@link zoomDomain} / {@link panDomain}) — it works for linear
 * AND time x (time domains flow as epoch ms; the scale factory maps them back
 * to `Date`s). Categorical (point-scale) x is not continuously zoomable — leave
 * `gestures` off for those; band-window zoom is a separate mechanism.
 *
 * @example
 * // Component
 * readonly transform = new NgeLineChartTransform({
 *   data: mySeriesPoints, // { x: Date | number, y, seriesId? }
 *   gestures: { brushZoom: true, pan: true, zoom: true },
 * });
 *
 * // Template
 * <nge-chart
 *   [config]="transform.config()"
 *   (chartGesture)="transform.onChartGesture($event)"
 * />
 */
export class NgeLineChartTransform {
  /** Derived chart config — bind to `<nge-chart [config]="transform.config()">`. */
  readonly config: Signal<NgeChartConfig>;

  private readonly bandWindowOverride = signal<NgeBandWindow | null>(null);
  private readonly options: WritableSignal<LineChartPresetOptions>;
  /** True while a zoom/pan gesture drives renders — suppresses transitions (animationMs 0). */
  private readonly suppressAnimation = signal(false);
  private readonly xDomainOverride = signal<[number, number] | null>(null);
  private readonly yDomainOverride = signal<[number, number] | null>(null);

  constructor(options: LineChartPresetOptions) {
    this.options = signal(options);
    this.config = computed(() => this.buildConfig());
  }

  /**
   * Consume a semantic gesture event from the chart — wire to
   * `(chartGesture)="transform.onChartGesture($event)"`.
   *
   * Pure math on the STATELESS payload (shared with scatter): pan shifts both
   * domains by the data-space delta; zoom rescales around the cursor focus;
   * brush-zoom sets both to the brushed extents; range-zoom sets a single axis;
   * dblclick reset restores the data-driven domains. Continuous gestures
   * suppress transitions (animationMs 0) so per-frame re-renders don't smear;
   * brush + reset re-enable them for a smooth discrete zoom.
   */
  onChartGesture(event: NgeChartGestureEvent): void {
    if (event.kind === 'reset') {
      this.resetZoom();
      return;
    }

    if (event.kind === 'band-window') {
      // Categorical (point-scale) x windows by whole categories; the value axis
      // auto-fits to the visible window (via the windowed data in buildConfig).
      this.suppressAnimation.set(event.op.type !== 'brush');
      const count = this.categoryCount();
      const current = this.bandWindowOverride() ?? [0, Math.max(0, count - 1)];
      this.bandWindowOverride.set(applyBandWindowOp(event.op, current, count));
      return;
    }

    // Every remaining gesture writes a continuous focus domain — clamp each to
    // the full data extent so zoom-out floors at 100% and pan stops at the data
    // bounds. `full.x` is null for categorical x (handled by band-window above),
    // so the x-clamp no-ops in that case.
    const full = this.fullDomains();
    const clampX = (domain: [number, number]): [number, number] =>
      full.x ? clampDomain(domain, full.x) : domain;
    const clampY = (domain: [number, number]): [number, number] => clampDomain(domain, full.y);

    if (event.kind === 'zoom-rect') {
      // Brush release is a DISCRETE action — animate the zoom-in
      this.suppressAnimation.set(false);
      this.xDomainOverride.set(clampX(event.xExtent));
      this.yDomainOverride.set(clampY(event.yExtent));
      return;
    }

    if (event.kind === 'range-zoom') {
      // Continuous drag on a range-axis brush → sets ONLY the named axis's focus
      this.suppressAnimation.set(true);
      if (event.axis === 'x') {
        this.xDomainOverride.set(clampX(event.domain));
      } else {
        this.yDomainOverride.set(clampY(event.domain));
      }
      return;
    }

    this.suppressAnimation.set(true);

    if (event.kind === 'pan') {
      this.xDomainOverride.set(clampX(panDomain(event.xDomain, event.xDelta)));
      this.yDomainOverride.set(clampY(panDomain(event.yDomain, event.yDelta)));
      return;
    }

    // Zoom around the focus point (shared continuous math)
    const nextX = zoomDomain(event.xDomain, event.focus.x, event.factor);
    const nextY = zoomDomain(event.yDomain, event.focus.y, event.factor);

    // Guard degenerate spans (extreme programmatic factors)
    if (isDegenerateSpan(nextX, event.xDomain) || isDegenerateSpan(nextY, event.yDomain)) {
      return;
    }

    this.xDomainOverride.set(clampX(nextX));
    this.yDomainOverride.set(clampY(nextY));
  }

  /** Reset both axis-domain overrides back to the data-driven domains. */
  resetZoom(): void {
    this.suppressAnimation.set(false);
    this.bandWindowOverride.set(null);
    this.xDomainOverride.set(null);
    this.yDomainOverride.set(null);
  }

  /** Replace the source data (zoom state is preserved). */
  setData(data: NgeLineDataPoint[]): void {
    this.options.update(current => ({ ...current, data }));
  }

  /** Zoom the X axis to an explicit `[min, max]` domain (null resets). */
  setXDomain(domain: [number, number] | null): void {
    this.xDomainOverride.set(domain);
  }

  /** Zoom the Y axis to an explicit `[min, max]` domain (null resets). */
  setYDomain(domain: [number, number] | null): void {
    this.yDomainOverride.set(domain);
  }

  /** Merge a partial options update (zoom state is preserved). */
  updateOptions(options: Partial<LineChartPresetOptions>): void {
    this.options.update(current => ({ ...current, ...options }));
  }

  /**
   * Derive the chart config from the current interaction state: zoom overrides
   * feed the preset's `xDomain`/`yDomain` (captured in its scale-factory
   * closure), and continuous gestures pin `animationMs` to 0 for instant renders.
   */
  private buildConfig(): NgeChartConfig {
    const options = this.options();
    const window = this.bandWindowOverride();

    // Categorical x: narrow to the visible window's data so the point axis shows
    // exactly those categories and the value axis auto-fits. Continuous x uses
    // the xDomain/yDomain overrides instead — the two never apply at once.
    const data = window ? this.windowedData(options.data, window) : options.data;

    return createLineChartConfig({
      ...options,
      animationMs: this.suppressAnimation() ? 0 : options.animationMs,
      data,
      xDomain: this.xDomainOverride() ?? options.xDomain,
      yDomain: this.yDomainOverride() ?? options.yDomain,
    });
  }

  /** Distinct categorical (string) x values — the window's upper bound. */
  private categoryCount(): number {
    return orderedBandCategories(this.options().data, d => String(d.x)).length;
  }

  /**
   * The full, un-zoomed continuous data extent per axis — the SAME domain the
   * scale factory renders by default (an explicit `xDomain`/`yDomain` wins, else
   * the shared `computeLine*DataDomain`), so "100%" is the initial view. `x` is
   * `null` for categorical x (which windows by category via `band-window`), so
   * the caller no-ops the x-clamp in that case.
   */
  private fullDomains(): { x: [number, number] | null; y: [number, number] } {
    const { data, xDomain, yDomain } = this.options();

    return {
      x: xDomain ?? computeLineXDataDomain(data),
      y: yDomain ?? computeLineYDataDomain(data),
    };
  }

  /** The points whose categorical x falls inside the visible window. */
  private windowedData(data: NgeLineDataPoint[], window: NgeBandWindow): NgeLineDataPoint[] {
    const visible = new Set(
      orderedBandCategories(data, d => String(d.x)).slice(window[0], window[1] + 1)
    );
    return data.filter(d => visible.has(String(d.x)));
  }
}
