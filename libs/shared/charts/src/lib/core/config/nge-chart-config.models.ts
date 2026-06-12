import type {
  NgeChartBaseConfig,
  NgeChartScales,
} from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartDimensions } from '../chart.models';
import type {
  NgeChartLayerClickEvent,
  NgeChartLayerRenderFn,
} from '../layer/nge-chart-layer.types';
import type { NgeChartLegendConfig } from '../legend/nge-chart-legend.models';
import type { NgeChartTheme } from '../theme/nge-chart-theme.models';
import type { NgeTooltipConfig } from '../tooltip';

/**
 * Factory function type for creating chart scales.
 * Allows custom scale creation logic to be injected.
 */
export type NgeChartScaleFactory = (
  config: NgeChartConfig,
  dimensions: NgeChartDimensions
) => NgeChartScales;

/**
 * Supported layer types.
 * Each type maps to a specific render function.
 */
export type NgeChartLayerType =
  | 'area'
  | 'bar'
  | 'bullet'
  | 'diverging-bar'
  | 'grouped-bar'
  | 'line'
  | 'scatter';

/**
 * Bar layer configuration
 */
export interface NgeBarLayerConfig {
  barPadding?: number;
  barRadius?: number;
  data: NgeBarDataPoint[];
  /** Format function for value labels displayed on bars */
  labelFormat?: (value: number) => string;
  onClick?: (event: NgeChartLayerClickEvent<NgeBarDataPoint>) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeBarDataPoint, NgeBarLayerConfig, any>;
  showLabels?: boolean;
  showMeanLine?: boolean;
  showMedianLine?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeBarDataPoint>>;
  type: 'bar';
}

/**
 * Line layer configuration
 */
export interface NgeLineLayerConfig {
  /** Area fill opacity (0-1). Only applies when showArea is true */
  areaOpacity?: number;
  /** Curve interpolation type */
  curveType?: 'linear' | 'monotone' | 'step';
  /** Data points to render */
  data: NgeLineDataPoint[];
  /** Line stroke width in pixels */
  lineWidth?: number;
  /** Click handler for data points */
  onClick?: (event: NgeChartLayerClickEvent<NgeLineDataPoint>) => void;
  /** Radius of data points in pixels */
  pointRadius?: number;
  /** Renderer function. Import `renderLineLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeLineDataPoint, NgeLineLayerConfig, any>;
  /** Color palette for multi-series. Series index maps to colors[index % length] */
  seriesColors?: string[];
  /** Fill area under the line */
  showArea?: boolean;
  /** Show circles at data points */
  showPoints?: boolean;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeLineDataPoint>>;
  type: 'line';
  /**
   * Use secondary Y axis (y2) for this layer.
   * When true, the line will be scaled against scales.y2 instead of scales.y.
   * Requires scales.y2 to be defined in the chart's scaleFactory.
   * @default false
   */
  useSecondaryAxis?: boolean;
}

/**
 * Area layer configuration (extends line)
 */
export interface NgeAreaLayerConfig {
  curveType?: 'linear' | 'monotone' | 'step';
  data: NgeLineDataPoint[];
  fillOpacity?: number;
  /** Renderer function. Import `renderAreaLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeLineDataPoint, NgeAreaLayerConfig, any>;
  showLine?: boolean;
  type: 'area';
}

/**
 * Scatter layer configuration
 */
export interface NgeScatterLayerConfig {
  data: NgeScatterDataPoint[];
  onClick?: (event: NgeChartLayerClickEvent<NgeScatterDataPoint>) => void;
  pointRadius?: number;
  /** Renderer function. Import `renderScatterLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeScatterDataPoint, NgeScatterLayerConfig, any>;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeScatterDataPoint>>;
  type: 'scatter';
}

/**
 * Bullet chart layer configuration
 */
export interface NgeBulletLayerConfig {
  /** Height of the main progress bar in pixels */
  barHeight?: number;
  /** Data point to render (single value) */
  data: NgeBulletDataPoint;
  /** Height of the min/max limit indicators in pixels */
  limitIndicatorHeight?: number;
  /** Width of the min/max limit indicators in pixels */
  limitIndicatorWidth?: number;
  /** Click handler for the bullet chart */
  onClick?: (event: NgeChartLayerClickEvent<NgeBulletDataPoint>) => void;
  /** Height of the progress marker in pixels */
  progressIndicatorHeight?: number;
  /** Width of the progress marker in pixels */
  progressIndicatorWidth?: number;
  /** Renderer function. Import `renderBulletLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeBulletDataPoint, NgeBulletLayerConfig, any>;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeBulletDataPoint>>;
  type: 'bullet';
}

/**
 * Diverging bar chart layer configuration.
 * Used for showing positive/negative values from a center point (e.g., Price Momentum).
 */
export interface NgeDivergingBarLayerConfig {
  /** Height of the main progress bar in pixels */
  barHeight?: number;
  /** Height of the center marker in pixels */
  centerIndicatorHeight?: number;
  /** Width of the center marker in pixels */
  centerIndicatorWidth?: number;
  /** Label text for the center indicator bubble. Defaults to 'Balanced'. */
  centerLabel?: string;
  /** Data point to render (single value) */
  data: NgeDivergingBarDataPoint;
  /** Height of the min/max limit indicators in pixels */
  limitIndicatorHeight?: number;
  /** Width of the min/max limit indicators in pixels */
  limitIndicatorWidth?: number;
  /** Click handler for the diverging bar chart */
  onClick?: (event: NgeChartLayerClickEvent<NgeDivergingBarDataPoint>) => void;
  /** Renderer function. Import `renderDivergingBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeDivergingBarDataPoint, NgeDivergingBarLayerConfig, any>;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeDivergingBarDataPoint>>;
  type: 'diverging-bar';
  /** Height of the value marker in pixels */
  valueIndicatorHeight?: number;
  /** Width of the value marker in pixels */
  valueIndicatorWidth?: number;
}

/**
 * Grouped bar chart layer configuration.
 * Used for showing side-by-side bars grouped by category (e.g., Active vs Closed with Avg/Min/Max bars).
 */
export interface NgeGroupedBarLayerConfig {
  /** Padding between bars within a group (0-1) */
  barPadding?: number;
  /** Bar corner radius (px) */
  barRadius?: number;
  /** Data points to render */
  data: NgeGroupedBarDataPoint[];
  /** Padding between groups (0-1) */
  groupPadding?: number;
  /** Format function for value labels displayed on bars */
  labelFormat?: (value: number) => string;
  /** Click handler for individual bars */
  onClick?: (event: NgeChartLayerClickEvent<NgeGroupedBarDataPoint>) => void;
  /** Bar orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderGroupedBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeGroupedBarDataPoint, NgeGroupedBarLayerConfig, any>;
  /** Show value labels on bars */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGroupedBarDataPoint>>;
  type: 'grouped-bar';
}

/**
 * Union of all layer configs.
 * Discriminated by 'type' field.
 */
export type NgeChartLayerDefinition =
  | NgeAreaLayerConfig
  | NgeBarLayerConfig
  | NgeBulletLayerConfig
  | NgeDivergingBarLayerConfig
  | NgeGroupedBarLayerConfig
  | NgeLineLayerConfig
  | NgeScatterLayerConfig;

/**
 * Data point types for each layer
 */
export interface NgeBarDataPoint {
  /** Optional color override for the bar */
  color?: string;
  label: string;
  /**
   * Optional: Color for the value label text.
   * If not provided, uses theme.label.color.
   */
  labelColor?: string;
  /**
   * Optional: Maximum value of range (for filter interaction)
   */
  rangeMax?: number;
  /**
   * Optional: Minimum value of range (for filter interaction)
   */
  rangeMin?: number;
  value: number;
}

export interface NgeGroupedBarDataPoint {
  /** Optional color override for the bar */
  color?: string;
  /** Group identifier — e.g., "Active", "Closed" */
  groupId: string;
  /** Bar label within group — e.g., "Avg $/sqft", "Min", "Max" */
  label: string;
  /** Optional: Color for the value label text */
  labelColor?: string;
  value: number;
}

export interface NgeLineDataPoint {
  /** Optional per-point color override */
  color?: string;
  /** Optional series identifier for multi-series charts */
  seriesId?: string;
  x: Date | number | string;
  y: number;
}

export interface NgeScatterDataPoint {
  color?: string;
  size?: number;
  x: number;
  y: number;
}

export interface NgeBulletDataPoint {
  /** Optional color override for progress bar and indicator */
  color?: string;
  /** Maximum value of the range */
  max: number;
  /** Minimum value of the range */
  min: number;
  /** Current progress value */
  progress: number;
  /** Units suffix (e.g., 'Kb', 'MHz', '%') */
  units?: string;
}

/**
 * Data point for diverging bar chart.
 * Value range is typically symmetric around 0 (e.g., -100 to +100).
 * Bar extends from center (0) toward the value.
 */
export interface NgeDivergingBarDataPoint {
  /** Maximum value of the range (typically positive, e.g., 100) */
  max: number;
  /** Minimum value of the range (typically negative, e.g., -100) */
  min: number;
  /** Color for negative values (left side). Defaults to theme color. */
  negativeColor?: string;
  /** Color for positive values (right side). Defaults to theme color. */
  positiveColor?: string;
  /** Units suffix (e.g., '%', 'pts') */
  units?: string;
  /** Current value. Positive extends right, negative extends left from center. */
  value: number;
}

/**
 * Unified chart configuration.
 * Single config object for the <nge-chart> component.
 */
export interface NgeChartConfig {
  /**
   * Base layout configuration (margins, axes, scale types)
   */
  base?: NgeChartBaseConfig;

  /**
   * Array of layer definitions to render.
   * Layers are rendered in order (first = back, last = front).
   *
   * Supports nested arrays (flattened during rendering) for grouping:
   * ```typescript
   * layers: [
   *   [barLayer1, barLayer2],  // Group of bar layers
   *   lineLayer,               // Single layer
   * ]
   * ```
   *
   * When combining presets, use spread to preserve types:
   * ```typescript
   * layers: [...barConfig.layers, ...lineConfig.layers]
   * ```
   */
  layers: (NgeChartLayerDefinition | NgeChartLayerDefinition[])[];

  /**
   * Legend configuration. When enabled, renders a legend above or below the chart.
   * Presets auto-populate items from layer data.
   */
  legend?: NgeChartLegendConfig;

  /**
   * Custom scale factory function.
   * If provided, this function will be called to create scales instead of the default.
   * Useful for custom scale types, domains, or advanced configurations.
   *
   * @example
   * ```typescript
   * scaleFactory: (config, dimensions) => ({
   *   x: scaleTime().domain([startDate, endDate]).range([0, dimensions.boundedWidth]),
   *   y: scaleLinear().domain([0, 100]).range([dimensions.boundedHeight, 0])
   * })
   * ```
   */
  scaleFactory?: NgeChartScaleFactory;

  /**
   * Theme overrides (see P4 for theme models)
   */
  theme?: NgeChartTheme;
}

// NgeChartTheme is now imported from '../theme/nge-chart-theme.models'
// Re-export for convenience
export type { NgeChartTheme } from '../theme/nge-chart-theme.models';
