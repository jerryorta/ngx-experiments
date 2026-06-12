import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import type { NgeChartStatus, NgeCommonTooltip } from '../core/chart.models';
import type { ChartTooltipConfig, ChartTooltipState } from './charts-tooltip.model';

import {
  defaultChartTooltipConfig,
  defaultChartTooltipState,
  generateBubblePath,
  generateBubblePathDivotTop,
} from './charts-tooltip.model';

export class ChartsTooltipCalc<TooltipData> {
  tooltipData$: ReplaySubject<NgeCommonTooltip<TooltipData>> = new ReplaySubject<
    NgeCommonTooltip<TooltipData>
  >(1);

  tooltipStyle$: Observable<string> = this.tooltipData$.pipe(
    map((data: NgeCommonTooltip<TooltipData>) => {
      return `transform: translate(${data.x}px, ${data.y}px);`;
    }),
    distinctUntilChanged()
  );

  tooltipStyle: Signal<string> = <Signal<string>>toSignal(this.tooltipStyle$);

  status$: BehaviorSubject<NgeChartStatus> = new BehaviorSubject<NgeChartStatus>('none');

  chartTooltipState$: BehaviorSubject<ChartTooltipState> = new BehaviorSubject<ChartTooltipState>(
    defaultChartTooltipState
  );

  reversed$: Observable<boolean> = this.chartTooltipState$.pipe(
    map((state: ChartTooltipState) => state.reversed),
    distinctUntilChanged()
  );

  tooltipHoverClosed$: Observable<boolean> = this.chartTooltipState$.pipe(
    map((state: ChartTooltipState) => state.tooltipHoverClosed),
    distinctUntilChanged()
  );

  /** Current divot X position (left edge of divot) */
  divotX$: BehaviorSubject<number> = new BehaviorSubject<number>(48);

  showTooltipHover$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  visible$: Observable<boolean> = this.chartTooltipState$.pipe(
    map((state: ChartTooltipState) => state.visible),
    distinctUntilChanged()
  );

  hover$: Observable<boolean> = this.chartTooltipState$.pipe(
    map((state: ChartTooltipState) => state.hover),
    distinctUntilChanged()
  );

  chartTooltipState: Signal<ChartTooltipState> = <Signal<ChartTooltipState>>(
    toSignal(this.chartTooltipState$)
  );

  calculateParams(config: Partial<ChartTooltipConfig>): void {
    const width = config.width || defaultChartTooltipConfig.width;
    const height = config.height || defaultChartTooltipConfig.height;
    const rx = config.rx || defaultChartTooltipConfig.rx;
    const divotWidth = config.divotWidth || defaultChartTooltipConfig.divotWidth;
    const divotHeight = config.divotHeight || defaultChartTooltipConfig.divotHeight;
    const divotPosition = config.divotPosition || defaultChartTooltipConfig.divotPosition;
    const divotTipOffset = config.divotTipOffset ?? 0;

    // Styling properties
    const backgroundColor = config.backgroundColor;
    const borderColor = config.borderColor;
    const borderWidth = config.borderWidth;

    const viewBox = `0 0 ${width} ${height}`;
    const svgWidth = width;
    const svgHeight = height;
    const bubbleHeight = height - divotHeight;

    // Get divot X position (left edge of divot)
    // translateDivotX from config represents where the divot should be positioned
    const divotX =
      config.translateDivotX !== undefined ? config.translateDivotX : (width - divotWidth) / 2; // Default to centered

    const reversed: boolean =
      config.reversed !== undefined ? config.reversed : defaultChartTooltipConfig.reversed;
    const tooltipHoverClosed =
      config.tooltipHoverClosed !== undefined
        ? config.tooltipHoverClosed
        : defaultChartTooltipState.tooltipHoverClosed;

    const visible =
      config.visible !== undefined ? config.visible : defaultChartTooltipState.visible;

    const hover = config.hover !== undefined ? config.hover : defaultChartTooltipConfig.hover;

    // Generate the complete bubble path with divot based on position
    const bubblePath =
      divotPosition === 'top'
        ? generateBubblePathDivotTop(
            width,
            height,
            divotHeight,
            rx,
            divotWidth,
            divotX,
            divotTipOffset
          )
        : generateBubblePath(width, height, bubbleHeight, rx, divotWidth, divotX, divotTipOffset);

    this.divotX$.next(divotX);

    this.chartTooltipState$.next({
      backgroundColor,
      borderColor,
      borderWidth,
      bubbleHeight,
      bubblePath,
      divotHeight,
      divotPosition,
      divotTipOffset,
      divotWidth,
      divotX,
      hover,
      reversed,
      rx,
      svgHeight,
      svgWidth,
      tooltipHoverClosed,
      viewBox,
      visible,
    });
  }

  setConfig(config: null | Partial<ChartTooltipConfig> | undefined): ChartTooltipConfig {
    let _config: ChartTooltipConfig = defaultChartTooltipConfig;

    if (config) {
      _config = {
        ...defaultChartTooltipConfig,
        ...config,
      };
    }

    this.calculateParams(_config);

    return _config;
  }

  setDivotX(x: number, tipOffset = 0): void {
    this.divotX$.next(x);
    // Regenerate bubble path with new divot position and tip offset
    const currentState = this.chartTooltipState$.value;
    const bubblePath =
      currentState.divotPosition === 'top'
        ? generateBubblePathDivotTop(
            currentState.svgWidth,
            currentState.svgHeight,
            currentState.divotHeight,
            currentState.rx,
            currentState.divotWidth,
            x,
            tipOffset
          )
        : generateBubblePath(
            currentState.svgWidth,
            currentState.svgHeight,
            currentState.bubbleHeight,
            currentState.rx,
            currentState.divotWidth,
            x,
            tipOffset
          );
    this.chartTooltipState$.next({
      ...currentState,
      bubblePath,
      divotTipOffset: tipOffset,
      divotX: x,
    });
  }

  setTooltipHover(s: boolean): void {
    this.showTooltipHover$.next(s);
  }

  setTooltipData(d: NgeCommonTooltip<TooltipData>): void {
    this.tooltipData$.next(d);
    this.setDivotX(d.tooltipDivotX, d.tooltipDivotTipOffset ?? 0);
  }

  /**
   * Set only the tooltip position (x, y) without regenerating the bubble path.
   * Use this when the divot position has already been set via setConfig().
   */
  setTooltipPosition(x: number, y: number): void {
    this.tooltipData$.next({
      data: {} as TooltipData,
      hover: true,
      maxX: 0,
      minX: 0,
      tooltipDivotX: this.divotX$.value,
      width: this.chartTooltipState$.value.svgWidth,
      x,
      y,
    });
  }

  setStatus(s: NgeChartStatus): void {
    this.status$.next(s);
  }

  setReversed(r: boolean): void {
    this.calculateParams({
      ...this.chartTooltipState$.value,
      reversed: r,
    });
  }
}
