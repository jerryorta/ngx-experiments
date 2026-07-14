import type { Signal, WritableSignal } from '@angular/core';

import { computed, signal } from '@angular/core';

import type { NgeChartConfig, NgeGroupedBarDataPoint } from '../core/config';
import type { NgeBandWindow, NgeChartGestureEvent } from '../core/gesture';
import type { GroupedBarChartPresetOptions } from '../presets/grouped-bar-chart.preset';

import { applyBandWindowOp, orderedBandCategories } from '../core/gesture';
import { createGroupedBarChartConfig } from '../presets/grouped-bar-chart.preset';

/**
 * Coordinates interaction state → grouped bar chart config (ARCH-174).
 *
 * A plain class (no DI — same idiom as NgeScatterChartTransform) that owns the
 * SEMANTICS of plot gestures for a grouped bar chart. The outer group (category)
 * axis is a band axis with no continuous `invert()`, so it WINDOWS by whole
 * categories: wheel-zoom narrows/widens the visible window, drag-pan shifts it by
 * whole categories, brush-zoom selects a category range, dblclick-reset restores
 * the full domain. The value axis AUTO-FITS to the visible window (bars never
 * clip their zero baseline). The window is `[startIndex, endIndex]` into the
 * ordered category (`label`) list.
 *
 * @example
 * // Component
 * readonly transform = new NgeGroupedBarChartTransform({
 *   data: myGroupedBars, // { groupId, label, value }
 *   gestures: { brushZoom: true, pan: true, zoom: true },
 * });
 *
 * // Template
 * <nge-chart
 *   [config]="transform.config()"
 *   (chartGesture)="transform.onChartGesture($event)"
 * />
 */
export class NgeGroupedBarChartTransform {
  /** Derived chart config — bind to `<nge-chart [config]="transform.config()">`. */
  readonly config: Signal<NgeChartConfig>;

  private readonly bandWindowOverride = signal<NgeBandWindow | null>(null);
  private readonly options: WritableSignal<GroupedBarChartPresetOptions>;
  /** True while a zoom/pan gesture drives renders — suppresses transitions (animationMs 0). */
  private readonly suppressAnimation = signal(false);

  constructor(options: GroupedBarChartPresetOptions) {
    this.options = signal(options);
    this.config = computed(() => this.buildConfig());
  }

  /**
   * Consume a semantic gesture event — wire to `(chartGesture)`. Only the
   * `band-window` and `reset` events act on a grouped bar chart (its group axis
   * has no continuous zoom). Continuous zoom/pan ops suppress transitions; the
   * discrete brush + reset animate.
   */
  onChartGesture(event: NgeChartGestureEvent): void {
    if (event.kind === 'reset') {
      this.resetZoom();
      return;
    }

    if (event.kind === 'band-window') {
      this.suppressAnimation.set(event.op.type !== 'brush');
      const count = this.categoryCount();
      const current = this.bandWindowOverride() ?? [0, Math.max(0, count - 1)];
      this.bandWindowOverride.set(applyBandWindowOp(event.op, current, count));
    }
    // Continuous events don't apply to a band axis.
  }

  /** Reset the category window back to the full data-driven domain. */
  resetZoom(): void {
    this.suppressAnimation.set(false);
    this.bandWindowOverride.set(null);
  }

  /** Replace the source data (window state is preserved). */
  setData(data: NgeGroupedBarDataPoint[]): void {
    this.options.update(current => ({ ...current, data }));
  }

  /** Merge a partial options update (window state is preserved). */
  updateOptions(options: Partial<GroupedBarChartPresetOptions>): void {
    this.options.update(current => ({ ...current, ...options }));
  }

  private buildConfig(): NgeChartConfig {
    const options = this.options();
    const window = this.bandWindowOverride();

    // A band window narrows the config to the visible categories — the group axis
    // shows exactly those, the value axis auto-fits, and no off-window bars pile
    // up at the origin (the renderer joins on this data).
    const data = window ? this.windowedData(options.data, window) : options.data;

    return createGroupedBarChartConfig({
      ...options,
      animationMs: this.suppressAnimation() ? 0 : options.animationMs,
      data,
    });
  }

  /** Number of distinct categories (labels) — the window's upper bound. */
  private categoryCount(): number {
    return orderedBandCategories(this.options().data, d => d.label).length;
  }

  /** The data points whose category (label) falls inside the visible window. */
  private windowedData(
    data: NgeGroupedBarDataPoint[],
    window: NgeBandWindow
  ): NgeGroupedBarDataPoint[] {
    const visible = new Set(
      orderedBandCategories(data, d => d.label).slice(window[0], window[1] + 1)
    );
    return data.filter(d => visible.has(d.label));
  }
}
