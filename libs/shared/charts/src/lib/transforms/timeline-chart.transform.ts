import type { Signal, WritableSignal } from '@angular/core';

import { computed, signal } from '@angular/core';

import type { NgeChartConfig, NgeTimelineDataPoint } from '../core/config';
import type { NgeChartGestureEvent } from '../core/gesture';
import type { TimelineChartPresetOptions } from '../presets/timeline-chart.preset';

import { clampDomain } from '../core/gesture';
import { computeTimelineXDataDomain } from '../nge-chart/nge-chart.timeline.helpers';
import { createTimelineChartConfig } from '../presets/timeline-chart.preset';

/**
 * Coordinates interaction state → timeline / Gantt chart config.
 *
 * A plain class (no DI — same idiom as {@link NgeLineChartTransform}) that owns the
 * semantics of the **time-scrub range-axis brush**: every drag on the bottom full-range
 * ruler produces a new `NgeChartConfig` whose plot renders just the brushed time
 * window, and `<nge-chart>` re-renders it. Because a timeline's y is a BAND (rows)
 * axis, continuous plot pan/zoom doesn't apply (those window the rows) — the ONLY
 * continuous interaction is the range-axis X brush, so this transform handles just
 * `range-zoom` (axis `'x'`) + `reset`. The window math is the SHARED {@link clampDomain}
 * (time domains flow as epoch ms; the scale factory maps them back to `Date`s).
 *
 * @example
 * // Component — the range-axis brush is forced on by the transform.
 * readonly transform = new NgeTimelineChartTransform({
 *   data: myTasks, // { rowId, start, end, milestone? }
 *   showLabels: true,
 * });
 *
 * // Template
 * <nge-chart
 *   [config]="transform.config()"
 *   (chartGesture)="transform.onChartGesture($event)"
 * />
 * // + a "Reset view" button → transform.resetZoom()
 */
export class NgeTimelineChartTransform {
  /** Derived chart config — bind to `<nge-chart [config]="transform.config()">`. */
  readonly config: Signal<NgeChartConfig>;

  private readonly options: WritableSignal<TimelineChartPresetOptions>;
  /** True while a brush drag drives renders — suppresses transitions (animationMs 0). */
  private readonly suppressAnimation = signal(false);
  private readonly xDomainOverride = signal<[number, number] | null>(null);

  constructor(options: TimelineChartPresetOptions) {
    this.options = signal(options);
    this.config = computed(() => this.buildConfig());
  }

  /**
   * Consume a semantic gesture event from the chart — wire to
   * `(chartGesture)="transform.onChartGesture($event)"`.
   *
   * Only the range-axis X brush (`range-zoom`, axis `'x'`) and `reset` apply to a
   * band-y timeline; every other gesture is ignored. The brushed domain is clamped to
   * the full data extent so zoom-out floors at 100% and pan stops at the data bounds.
   */
  onChartGesture(event: NgeChartGestureEvent): void {
    if (event.kind === 'reset') {
      this.resetZoom();
      return;
    }

    if (event.kind === 'range-zoom' && event.axis === 'x') {
      this.suppressAnimation.set(true);
      this.xDomainOverride.set(clampDomain(event.domain, this.fullXDomain()));
    }
  }

  /** Reset the scrub window back to the full data extent. */
  resetZoom(): void {
    this.suppressAnimation.set(false);
    this.xDomainOverride.set(null);
  }

  /** Replace the source data (the scrub window is preserved). */
  setData(data: NgeTimelineDataPoint[]): void {
    this.options.update(current => ({ ...current, data }));
  }

  /** Scrub the plot to an explicit `[min, max]` time window (epoch ms; null resets). */
  setXDomain(domain: [number, number] | null): void {
    this.xDomainOverride.set(domain);
  }

  /** Merge a partial options update (the scrub window is preserved). */
  updateOptions(options: Partial<TimelineChartPresetOptions>): void {
    this.options.update(current => ({ ...current, ...options }));
  }

  /**
   * Derive the chart config: force the range-axis brush on and feed the current scrub
   * window as the preset's `xDomain` (captured in its scale-factory closure);
   * `xRangeAxis.fullDomain` stays the full extent so the ruler is always full-width.
   * A live drag pins `animationMs` to 0 for instant per-frame renders.
   */
  private buildConfig(): NgeChartConfig {
    const options = this.options();

    return createTimelineChartConfig({
      ...options,
      animationMs: this.suppressAnimation() ? 0 : options.animationMs,
      rangeAxisX: true,
      xDomain: this.xDomainOverride() ?? options.xDomain,
    });
  }

  /**
   * The full, un-zoomed time extent (epoch ms) — the SAME domain the range-axis ruler
   * renders (the preset's `xRangeAxis.fullDomain` also calls this), so "100%" is the
   * initial view and the clamp bound and the ruler never disagree.
   */
  private fullXDomain(): [number, number] {
    return computeTimelineXDataDomain(this.options().data);
  }
}
