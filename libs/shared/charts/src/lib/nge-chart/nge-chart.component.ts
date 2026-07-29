import type { AfterViewInit, OnDestroy, TemplateRef } from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { select } from 'd3-selection';
import { debounceTime, merge } from 'rxjs';

import type { NgeChartBaseLayoutInstance } from '../core/base-layout';
import type { NgeChartConfig } from '../core/config';
import type { NgeChartGestureEvent } from '../core/gesture';
import type { NgeLegendItem } from '../core/legend';
import type { NgeTooltipContent, NgeTooltipEvent } from '../core/tooltip';

import { createBaseLayout } from '../core/base-layout';
import { NgeChartLegendComponent } from '../nge-chart-legend/nge-chart-legend.component';
import { NgeChartTooltipCalc } from '../nge-chart-tooltip/nge-chart-tooltip.calc';
import { NgeChartTooltipComponent } from '../nge-chart-tooltip/nge-chart-tooltip.component';
import { renderNgeChart } from './nge-chart.renderer';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-chart' },
  imports: [NgeChartTooltipComponent, NgeChartLegendComponent, NgTemplateOutlet],
  selector: 'nge-chart',
  standalone: true,
  styleUrl: './nge-chart.component.scss',
  templateUrl: './nge-chart.component.html',
})
export class NgeChartComponent implements AfterViewInit, OnDestroy {
  /** Chart configuration including base settings and layers */
  readonly config = input.required<NgeChartConfig>();

  /**
   * Emitted when an interactive legend entry is clicked
   * (requires `config.legend.interactive: true`).
   */
  readonly legendItemClick = output<NgeLegendItem>();

  /**
   * Emitted when the legend's clear button is pressed
   * (requires `config.legend.showClearAction: true`). The chart holds no selection
   * state of its own — this is the caller's cue to release whatever it is tracking.
   */
  readonly legendClearAction = output<void>();

  /**
   * Semantic zoom/pan/reset gesture events (requires `config.gestures`).
   * Wire to a transform, e.g. `(chartGesture)="transform.onChartGesture($event)"`.
   */
  readonly chartGesture = output<NgeChartGestureEvent>();

  /**
   * When true, the default tooltip bubble chrome is dropped — a projected
   * `#ngeChartTooltip` template becomes the ENTIRE tooltip (bring-your-own chrome).
   * Defaults false (the built-in bubble renders as before).
   */
  readonly chromelessTooltip = input<boolean>(false);

  private readonly el = inject(ElementRef).nativeElement as HTMLElement;
  private readonly destroyRef = inject(DestroyRef);

  private layout: NgeChartBaseLayoutInstance | null = null;
  private container: HTMLElement | null = null;
  private shadowRoot: null | ShadowRoot = null;
  private tooltipElement: HTMLElement | null = null;
  private resizeObserver: null | ResizeObserver = null;
  private isDestroyed = false;

  /**
   * Offset (px) of the plot container within the chart host — the translation that
   * turns an emitted tooltip position into a tooltip `left`/`top`.
   *
   * Every producer (the crosshair and every layer renderer) emits `position` as plot
   * coords + margins, i.e. coords inside the container's svg. `<nge-chart-tooltip>`
   * is `position: absolute` against the host, so the two origins agree only while the
   * container starts at the host's own origin. A `top` or `left` legend renders as a
   * flex sibling AHEAD of the container and pushes that origin down/right, which is
   * exactly the amount the tooltip was missing its mark by (ARCH-223).
   *
   * `offsetLeft`/`offsetTop` measure from the `offsetParent` — the `position: relative`
   * host, the same box the absolute tooltip resolves against — so the two cannot drift.
   *
   * Cached per render rather than read per `pointermove`: the crosshair mutates the svg
   * immediately before emitting, so reading it on each event would force a synchronous
   * layout every frame. Both things that can move the container (a config change, and
   * the ResizeObserver that fires when a legend resizes it) come back through
   * {@link render}.
   */
  private plotOffset = { x: 0, y: 0 };

  /** Internal signal to trigger re-renders from ResizeObserver */
  private readonly resizeTrigger = signal(0);

  // Tooltip state management - for bubble shape (divot, dimensions, colors)
  readonly tooltipCalc = new NgeChartTooltipCalc<NgeTooltipContent>();

  /** Custom tooltip template provided via ng-content */
  readonly customTooltipTemplate =
    contentChild<TemplateRef<{ $implicit: NgeTooltipContent | null }>>('ngeChartTooltip');

  /** Current tooltip content (label, value, extra data) - needs signal for template binding */
  private readonly tooltipContentSignal = signal<NgeTooltipContent | null>(null);
  readonly tooltipContent = this.tooltipContentSignal.asReadonly();

  /** CSS class for the layout wrapper based on legend position */
  readonly legendLayoutClass = computed(() => {
    const pos = this.config().legend?.position;
    if (pos === 'left' || pos === 'right') return 'nge-chart-layout--row';
    return '';
  });

  /** Legend orientation derived from position */
  readonly legendOrientation = computed((): 'horizontal' | 'vertical' => {
    const pos = this.config().legend?.position;
    return pos === 'left' || pos === 'right' ? 'vertical' : 'horizontal';
  });

  /** Track last bubble shape config to avoid unnecessary updates */
  private lastBubbleConfig: null | {
    divotTipOffset: number | undefined;
    divotX: number;
    height: number;
    width: number;
  } = null;

  constructor() {
    // Convert config signal to observable for debounced rendering
    const config$ = toObservable(this.config);
    const resize$ = toObservable(this.resizeTrigger);

    // Merge config changes and resize events, debounce to batch rapid updates
    merge(config$, resize$)
      .pipe(
        debounceTime(16), // ~1 frame to batch rapid changes
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (!this.isDestroyed) {
          this.render();
        }
      });
  }

  ngAfterViewInit(): void {
    this.container = this.el.querySelector('.nge-chart-container');
    this.tooltipElement = this.el.querySelector('nge-chart-tooltip');
    if (!this.container) return;

    // Create shadow root for chart isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Inject minimal styles for SVG sizing
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; width: 100%; height: 100%; }
      svg { display: block; width: 100%; height: 100%; }
    `;
    this.shadowRoot.appendChild(style);

    // Create base layout inside shadow root
    this.layout = createBaseLayout(this.shadowRoot);

    // Setup ResizeObserver for container-specific resize detection
    // Observe the container element (not shadow root) for resize events
    this.resizeObserver = new ResizeObserver(() => {
      // Increment trigger to notify the observable stream
      this.resizeTrigger.update(v => v + 1);
    });
    this.resizeObserver.observe(this.container);

    // Initial render
    this.render();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.layout?.destroy();
    this.layout = null;
    this.shadowRoot = null;
  }

  private render(): void {
    if (!this.layout || !this.container || this.isDestroyed) return;

    // Hide tooltip on config change via D3
    if (this.tooltipElement) {
      select(this.tooltipElement).style('display', 'none');
    }
    this.tooltipContentSignal.set(null);

    // Re-measure where the plot sits inside the host (the legend above/left of it may
    // have appeared, gone, or changed size) — see the field's contract.
    this.plotOffset = { x: this.container.offsetLeft, y: this.container.offsetTop };

    renderNgeChart({
      config: this.config(),
      container: this.container,
      gestureHandler: {
        onGesture: event => this.chartGesture.emit(event),
      },
      layout: this.layout,
      tooltipElement: this.tooltipElement,
      tooltipHandler: {
        onTooltip: event => this.handleTooltipEvent(event),
      },
    });
  }

  /**
   * Handle generic tooltip event from any layer.
   * Uses D3 for direct DOM manipulation to avoid Angular change detection overhead.
   */
  private handleTooltipEvent(event: NgeTooltipEvent): void {
    const { content, dimensions, divotPosition, position, skipPosition, style, visible } = event;

    if (!this.tooltipElement) return;

    const tooltip = select(this.tooltipElement);

    if (!visible) {
      // Hide tooltip via D3
      tooltip.style('display', 'none');
      this.tooltipContentSignal.set(null);
      this.lastBubbleConfig = null;
      return;
    }

    // Update tooltip content (needs signal for Angular template binding)
    this.tooltipContentSignal.set(content);

    // Position tooltip directly via D3 (bypasses Angular change detection).
    // The emitted position is in container coords; `plotOffset` carries it into the
    // host coords this absolutely-positioned element is placed in.
    // Skip if layer is animating position directly via D3 transition
    if (!skipPosition) {
      tooltip
        .style('display', 'block')
        .style('left', `${position.x + this.plotOffset.x}px`)
        .style('top', `${position.y + this.plotOffset.y}px`);
    }

    // Only update bubble shape if it actually changed (avoids Angular change detection on every frame)
    const bubbleConfig = {
      divotTipOffset: position.divotTipOffset,
      divotX: position.divotX,
      height: dimensions.height,
      width: dimensions.width,
    };

    const shapeChanged =
      !this.lastBubbleConfig ||
      this.lastBubbleConfig.divotX !== bubbleConfig.divotX ||
      this.lastBubbleConfig.divotTipOffset !== bubbleConfig.divotTipOffset ||
      this.lastBubbleConfig.width !== bubbleConfig.width ||
      this.lastBubbleConfig.height !== bubbleConfig.height;

    if (!this.chromelessTooltip() && shapeChanged) {
      this.lastBubbleConfig = bubbleConfig;

      this.tooltipCalc.setConfig({
        backgroundColor: style?.backgroundColor,
        borderColor: style?.borderColor,
        borderWidth: style?.borderWidth,
        divotHeight: style?.divotHeight,
        divotPosition,
        divotTipOffset: position.divotTipOffset,
        divotWidth: style?.divotWidth,
        height: dimensions.height,
        translateDivotX: position.divotX,
        visible: true,
        width: dimensions.width,
      });
    }
  }
}
