import type { Signal, WritableSignal } from '@angular/core';

import { computed, signal } from '@angular/core';

import type { NgeBarDataPoint, NgeChartConfig } from '../core/config';
import type { NgeBandWindow, NgeChartGestureEvent } from '../core/gesture';
import type { BarChartPresetOptions } from '../presets/bar-chart.preset';

import { applyBandWindowOp, orderedBandCategories } from '../core/gesture';
import { createBarChartConfig } from '../presets/bar-chart.preset';

/**
 * Coordinates interaction state → bar chart config (ARCH-174).
 *
 * A plain class (no DI — same idiom as NgeScatterChartTransform) that owns the
 * SEMANTICS of plot gestures for a bar chart. The category (band) axis has no
 * continuous `invert()`, so it WINDOWS by whole categories: wheel-zoom
 * narrows/widens the visible window, drag-pan shifts it by whole categories,
 * brush-zoom selects a category range, dblclick-reset restores the full domain.
 * The value axis is NOT zoomed here — it AUTO-FITS to the visible window on each
 * render (so bars never clip their zero baseline). Window math is the shared
 * {@link applyBandWindowOp}; the window is `[startIndex, endIndex]` into the
 * ordered category list.
 *
 * @example
 * // Component
 * readonly transform = new NgeBarChartTransform({
 *   data: myBars, // { label, value }
 *   gestures: { brushZoom: true, pan: true, zoom: true },
 * });
 *
 * // Template
 * <nge-chart
 *   [config]="transform.config()"
 *   (chartGesture)="transform.onChartGesture($event)"
 * />
 */
export class NgeBarChartTransform {
  /** Derived chart config — bind to `<nge-chart [config]="transform.config()">`. */
  readonly config: Signal<NgeChartConfig>;

  private readonly bandWindowOverride = signal<NgeBandWindow | null>(null);
  private readonly options: WritableSignal<BarChartPresetOptions>;
  /** True while a zoom/pan gesture drives renders — suppresses transitions (animationMs 0). */
  private readonly suppressAnimation = signal(false);

  constructor(options: BarChartPresetOptions) {
    this.options = signal(options);
    this.config = computed(() => this.buildConfig());
  }

  /**
   * Consume a semantic gesture event — wire to `(chartGesture)`. Only the
   * `band-window` and `reset` events act on a bar chart (its band axis has no
   * continuous zoom); the band-window op is applied to the current category
   * window via the shared band math. Continuous zoom/pan/brush ops suppress
   * transitions (animationMs 0); the discrete brush + reset animate.
   */
  onChartGesture(event: NgeChartGestureEvent): void {
    if (event.kind === 'reset') {
      this.resetZoom();
      return;
    }

    if (event.kind === 'band-window') {
      // Continuous ops (zoom/pan) suppress transitions; brush is discrete → animate
      this.suppressAnimation.set(event.op.type !== 'brush');
      const count = this.categoryCount();
      const current = this.bandWindowOverride() ?? [0, Math.max(0, count - 1)];
      this.bandWindowOverride.set(applyBandWindowOp(event.op, current, count));
    }
    // Continuous events (zoom/pan/zoom-rect/range-zoom) don't apply to a band axis.
  }

  /** Reset the category window back to the full data-driven domain. */
  resetZoom(): void {
    this.suppressAnimation.set(false);
    this.bandWindowOverride.set(null);
  }

  /** Replace the source data (window state is preserved). */
  setData(data: NgeBarDataPoint[]): void {
    this.options.update(current => ({ ...current, data }));
  }

  /** Merge a partial options update (window state is preserved). */
  updateOptions(options: Partial<BarChartPresetOptions>): void {
    this.options.update(current => ({ ...current, ...options }));
  }

  private buildConfig(): NgeChartConfig {
    const options = this.options();
    const window = this.bandWindowOverride();

    // A band window narrows the config to the visible categories: the band axis
    // shows exactly those and the value axis auto-fits to them — and no
    // off-window bars pile up at the origin (the renderer joins on this data).
    const data = window ? this.windowedData(options.data, window) : options.data;

    return createBarChartConfig({
      ...options,
      animationMs: this.suppressAnimation() ? 0 : options.animationMs,
      data,
    });
  }

  /** Number of distinct categories in the source data — the window's upper bound. */
  private categoryCount(): number {
    return orderedBandCategories(this.options().data, d => d.label).length;
  }

  /** The data points whose category falls inside the visible window. */
  private windowedData(data: NgeBarDataPoint[], window: NgeBandWindow): NgeBarDataPoint[] {
    const visible = new Set(
      orderedBandCategories(data, d => d.label).slice(window[0], window[1] + 1)
    );
    return data.filter(d => visible.has(d.label));
  }
}
