import type { ChartTooltipConfig } from '../charts-tooltip/charts-tooltip.model';

export interface NgeD3CanvasMargins {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface NgeD3CanvasDimension {
  height: number;
  margin: NgeD3CanvasMargins;
  width: number;
}

// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry
//
export interface NgeResizeObserverEntry {
  contentRect: DOMRectReadOnly;
}

export interface NgeChartConfigBase {
  height?: number;
  margin?: {
    bottom?: number;
    left?: number;
    right?: number;
    top?: number;
  };
  tooltipConfig?: Partial<ChartTooltipConfig>;

  /**
   * Height is calculated based data
   */
  // heightBasedOnData?: boolean;
  width?: number;
}

export interface NgeCommonChartConfig extends NgeChartConfigBase {
  showXAxis?: boolean;
  showYAxis?: boolean;
}

export interface NgeJSONDOMRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

export interface NgeChartDimensions {
  boundedHeight: number;
  boundedWidth: number;
  height: null | number;
  margin: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  // CSS width is 100% unless overridden by config
  width: null | number;
}

/**
 * Functions to aggregate chart config and dimensions
 */

export interface NgeSizeConfig {
  config: NgeCommonChartConfig;
  size: NgeJSONDOMRect;
}

export interface NgeSizeConfigDimensions {
  config: NgeCommonChartConfig;
  dimensions: NgeChartDimensions;
  size: NgeJSONDOMRect;
}

export interface NgeElSizeConfigDimensions {
  config: NgeCommonChartConfig;
  dimensions: NgeChartDimensions;
  el: HTMLElement;
  size: NgeJSONDOMRect;
}

export interface NgeElSizeConfigDimensionsData<Data> {
  config: NgeCommonChartConfig;
  data: Data[];
  dimensions: NgeChartDimensions;
  el: HTMLElement;
  size: NgeJSONDOMRect;
}

export interface NgeCommonTooltip<ChartData> {
  data: ChartData;
  hover: boolean;
  maxX: number;
  /* provided by d3-scale invert function to
  give x pixel values of min and max */
  minX: number;
  /**
   * Horizontal offset of the divot tip from center.
   * Used when tooltip is clamped to bounds to make
   * the divot point at the actual data location.
   */
  tooltipDivotTipOffset?: number;
  tooltipDivotX: number;
  width: number;

  x: number;
  y: number;
}

/**
 * Show state of data
 */
export declare type NgeChartStatus = 'error' | 'none' | 'success' | 'warn';
