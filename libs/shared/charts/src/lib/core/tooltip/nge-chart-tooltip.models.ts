/**
 * Tooltip styling options
 */
export interface NgeTooltipStyle {
  /**
   * Background color of the tooltip bubble
   */
  backgroundColor?: string;

  /**
   * Border color of the tooltip bubble
   */
  borderColor?: string;

  /**
   * Border width in pixels
   */
  borderWidth?: number;

  /**
   * Height of the divot pointer in pixels
   */
  divotHeight?: number;

  /**
   * Width of the divot pointer in pixels
   */
  divotWidth?: number;
}

/**
 * Generic tooltip configuration - used by presets and layer configs
 */
export interface NgeTooltipConfig<TData = unknown> {
  /**
   * Enable/disable tooltip
   */
  enabled: boolean;

  /**
   * Format function to transform layer data into tooltip content.
   * If not provided, uses default formatting based on data structure.
   */
  formatContent?: (data: TData) => NgeTooltipContent;

  /**
   * Tooltip height in pixels
   */
  height: number;

  /**
   * Positioning strategy
   * - 'above': Fixed position above the element
   * - 'below': Fixed position below the element
   * - 'follow-mouse': Follows mouse vertically, centered on element horizontally
   */
  position: 'above' | 'below' | 'follow-mouse';

  /**
   * Whether to show tooltip during initial animation (e.g., bullet chart progress animation).
   * Defaults to true for backward compatibility.
   * Set to false to only show tooltip on hover interaction.
   */
  showDuringAnimation?: boolean;

  /**
   * Visual styling options for the tooltip
   */
  style?: NgeTooltipStyle;

  /**
   * Tooltip width in pixels
   */
  width: number;
}

/**
 * One row of a SHARED / multi-series tooltip: a colour swatch, a series label,
 * and that series' value at the shared x. Populated on {@link NgeTooltipContent.rows}
 * (e.g. by the crosshair, which lists every series' value at the snapped x).
 */
export interface NgeTooltipRow {
  /** Swatch colour — matches the series' line/area colour. */
  color: string;

  /** Series label (e.g. the `seriesId`). */
  label: string;

  /** The series' value at the shared x. */
  value: number | string;
}

/**
 * Tooltip content - what gets displayed
 */
export interface NgeTooltipContent {
  /**
   * Optional additional data for custom tooltip templates
   */
  extra?: Record<string, unknown>;

  /**
   * Primary label (e.g., category name)
   */
  label: string;

  /**
   * Optional multi-series rows for a SHARED tooltip (e.g. the crosshair). When
   * present, a custom `#ngeChartTooltip` template renders one row per series
   * (swatch + label + value); single-series tooltips omit it and use
   * `label`/`value` as before.
   */
  rows?: NgeTooltipRow[];

  /**
   * Primary value (e.g., data value)
   */
  value: number | string;
}

/**
 * Computed tooltip position
 */
export interface NgeTooltipPosition {
  /**
   * Horizontal offset of the divot tip from center.
   * Used when tooltip is clamped to bounds to make
   * the divot point at the actual data location.
   * - Positive: tip shifts right (left side becomes vertical)
   * - Negative: tip shifts left (right side becomes vertical)
   */
  divotTipOffset?: number;

  /**
   * Divot X position within tooltip (for pointer alignment)
   */
  divotX: number;

  /**
   * X position for tooltip container (pixels from left)
   */
  x: number;

  /**
   * Y position for tooltip container (pixels from top)
   */
  y: number;
}

/**
 * Generic tooltip event - emitted by all layers, consumed by Angular component
 */
export interface NgeTooltipEvent {
  /**
   * Formatted content to display
   */
  content: NgeTooltipContent;

  /**
   * Tooltip dimensions
   */
  dimensions: {
    height: number;
    width: number;
  };

  /**
   * Position of the divot pointer
   * - 'bottom': Divot points down (tooltip above element)
   * - 'top': Divot points up (tooltip below element)
   */
  divotPosition: 'bottom' | 'top';

  /**
   * Computed position
   */
  position: NgeTooltipPosition;

  /**
   * Skip position update - set when layer is animating position directly via D3 transition.
   * When true, handler should only update content and shape, not position.
   */
  skipPosition?: boolean;

  /**
   * Visual styling options
   */
  style?: NgeTooltipStyle;

  /**
   * Whether tooltip should be visible
   */
  visible: boolean;
}

/**
 * Generic tooltip handler interface - used by all layers
 */
export interface NgeTooltipHandlers {
  onTooltip: (event: NgeTooltipEvent) => void;
}

/**
 * Default tooltip config factory
 */
export function createDefaultTooltipConfig<TData>(): NgeTooltipConfig<TData> {
  return {
    enabled: false,
    height: 65,
    position: 'follow-mouse',
    width: 120,
  };
}

/**
 * Merge user tooltip config with defaults
 */
export function mergeTooltipConfig<TData>(
  config?: Partial<NgeTooltipConfig<TData>>
): NgeTooltipConfig<TData> {
  const defaults = createDefaultTooltipConfig<TData>();
  if (!config) return defaults;

  return {
    ...defaults,
    ...config,
  };
}
