import type { Selection } from 'd3-selection';

import type { NgeChartScales } from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartDimensions } from '../chart.models';
import type { NgeTooltipConfig, NgeTooltipHandlers } from '../tooltip';

/**
 * Context passed to layer render functions.
 * Generic types allow each layer to define its own data, config, and theme types.
 */
export interface NgeChartLayerContext<TData, TConfig, TTheme> {
  /**
   * The SVG group element to render into
   */
  bounds: Selection<SVGGElement, unknown, null, undefined>;

  /**
   * Layer-specific configuration
   */
  config: TConfig;

  /**
   * Data points for this layer
   */
  data: TData[];

  /**
   * Chart dimensions (bounded width/height after margins)
   */
  dimensions: NgeChartDimensions;

  /**
   * Chart margins (needed for tooltip position calculation)
   */
  margins: { bottom: number; left: number; right: number; top: number };

  /**
   * Shared scales for the chart
   */
  scales: NgeChartScales;

  /**
   * Layer-specific theme
   */
  theme: TTheme;

  /**
   * Tooltip configuration (if enabled)
   */
  tooltipConfig?: NgeTooltipConfig<TData>;

  /**
   * Direct reference to tooltip DOM element for synchronized D3 animation.
   * Allows layers to animate tooltip position in the same transition as chart elements.
   */
  tooltipElement?: HTMLElement | null;

  /**
   * Generic tooltip handlers
   */
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Type signature for a stateless layer render function.
 * Use this for simple layers that don't need event handlers or persistent state.
 *
 * @example
 * const renderBarLayer: NgeChartLayerRenderFn<BarData, BarConfig, BarTheme> = (context) => {
 *   const { bounds, data, config, theme, dimensions, scales } = context;
 *   // D3 rendering logic
 * };
 */
export type NgeChartLayerRenderFn<TData, TConfig, TTheme> = (
  context: NgeChartLayerContext<TData, TConfig, TTheme>
) => void;

/**
 * Instance returned by layer factory functions.
 * Use this when the layer needs event handlers or persistent state.
 */
export interface NgeChartLayerInstance<TData, TConfig, TTheme> {
  /**
   * Clean up layer elements and event listeners.
   * Called when the layer is removed or component is destroyed.
   */
  destroy: () => void;

  /**
   * Render the chart layer into the provided bounds group.
   * Called on initial render and when data/config/theme changes.
   */
  render: NgeChartLayerRenderFn<TData, TConfig, TTheme>;
}

/**
 * Type signature for a layer factory function.
 * Use this to create layer instances with event handlers.
 *
 * @example
 * const createBarLayer: NgeChartLayerFactory<BarData, BarConfig, BarTheme, BarHandlers> = (handlers) => ({
 *   render: (context) => { ... },
 *   destroy: () => { ... }
 * });
 */
export type NgeChartLayerFactory<TData, TConfig, TTheme, THandlers = void> = (
  handlers?: THandlers
) => NgeChartLayerInstance<TData, TConfig, TTheme>;

/**
 * Click event context for chart layers
 */
export interface NgeChartLayerClickEvent<TData> {
  /**
   * The data point that was clicked
   */
  data: TData;

  /**
   * Original DOM event
   */
  event: PointerEvent;

  /**
   * Index of the clicked element
   */
  index: number;
}

/**
 * Common handler types for layers with click support
 */
export interface NgeChartLayerClickHandlers<TData> {
  onClick?: (event: NgeChartLayerClickEvent<TData>) => void;
}
