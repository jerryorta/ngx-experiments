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
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { select } from 'd3';
import { debounceTime, merge } from 'rxjs';

import type { NgeChartBaseLayoutInstance } from '../core/base-layout';
import type { NgeChartConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipEvent } from '../core/tooltip';

import { ChartsTooltipCalc } from '../charts-tooltip/charts-tooltip.calc';
import { ChartsTooltipComponent } from '../charts-tooltip/charts-tooltip.component';
import { createBaseLayout } from '../core/base-layout';
import { NgeChartLegendComponent } from '../nge-chart-legend/nge-chart-legend.component';
import { renderChart } from './nge-chart.renderer';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-chart' },
  imports: [ChartsTooltipComponent, NgeChartLegendComponent, NgTemplateOutlet],
  selector: 'nge-chart',
  standalone: true,
  styleUrl: './nge-chart.component.scss',
  templateUrl: './nge-chart.component.html',
})
export class NgeChartComponent implements AfterViewInit, OnDestroy {
  /** Chart configuration including base settings and layers */
  readonly config = input.required<NgeChartConfig>();

  private readonly el = inject(ElementRef).nativeElement as HTMLElement;
  private readonly destroyRef = inject(DestroyRef);

  private layout: NgeChartBaseLayoutInstance | null = null;
  private container: HTMLElement | null = null;
  private shadowRoot: null | ShadowRoot = null;
  private tooltipElement: HTMLElement | null = null;
  private resizeObserver: null | ResizeObserver = null;
  private isDestroyed = false;

  /** Internal signal to trigger re-renders from ResizeObserver */
  private readonly resizeTrigger = signal(0);

  // Tooltip state management - for bubble shape (divot, dimensions, colors)
  readonly tooltipCalc = new ChartsTooltipCalc<NgeTooltipContent>();

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
    this.tooltipElement = this.el.querySelector('nge-charts-tooltip');
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

    renderChart({
      config: this.config(),
      container: this.container,
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

    // Position tooltip directly via D3 (bypasses Angular change detection)
    // Skip if layer is animating position directly via D3 transition
    if (!skipPosition) {
      tooltip
        .style('display', 'block')
        .style('left', `${position.x}px`)
        .style('top', `${position.y}px`);
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

    if (shapeChanged) {
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
