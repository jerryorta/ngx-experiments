/**
 * A single legend entry — color swatch + label.
 * Chart-type-agnostic; any preset can produce these.
 */
export interface NgeLegendItem {
  /** Swatch color (CSS color value) */
  color: string;
  /**
   * Stable identity for interactivity (e.g. the seriesId). The label stays
   * display-only; click handlers should match on `id ?? label`.
   */
  id?: string;
  /** Display label */
  label: string;
  /** Presentation opacity (0-1) — used to fade non-selected entries */
  opacity?: number;
  /** Whether this entry is currently selected (drives aria-pressed + styling) */
  selected?: boolean;
}

/**
 * Legend configuration for NgeChartConfig.
 * When enabled, the chart renders a legend automatically.
 */
export interface NgeChartLegendConfig {
  /** Whether the legend is visible */
  enabled: boolean;
  /**
   * Render entries as clickable buttons; the chart emits `legendItemClick`.
   * Pair with a transform (e.g. NgeScatterChartTransform) for series selection.
   */
  interactive?: boolean;
  /** Legend items to display. Presets populate this from layer data. */
  items: NgeLegendItem[];
  /** Position relative to the chart. Default: 'bottom' */
  position?: 'bottom' | 'left' | 'right' | 'top';
  /**
   * Swatch shape matching the layer's mark ('circle' scatter points,
   * 'line' line series, 'square' bars). Presets default this per chart type.
   */
  swatchShape?: 'circle' | 'line' | 'square';
}
