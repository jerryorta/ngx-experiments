/**
 * A single legend entry — color swatch + label.
 * Chart-type-agnostic; any preset can produce these.
 */
export interface NgeLegendItem {
  /** Swatch color (CSS color value) */
  color: string;
  /** Display label */
  label: string;
}

/**
 * Legend configuration for NgeChartConfig.
 * When enabled, the chart renders a legend automatically.
 */
export interface NgeChartLegendConfig {
  /** Whether the legend is visible */
  enabled: boolean;
  /** Legend items to display. Presets populate this from layer data. */
  items: NgeLegendItem[];
  /** Position relative to the chart. Default: 'bottom' */
  position?: 'bottom' | 'left' | 'right' | 'top';
}
