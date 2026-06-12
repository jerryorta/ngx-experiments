import type { Selection } from 'd3-selection';

import type { NgeChartBaseLayoutInstance, NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions, NgeJSONDOMRect } from '../core/chart.models';
import type { NgeChartConfig } from '../core/config';
import type { NgeTooltipHandlers } from '../core/tooltip';

import { renderLayers } from '../layers/layer-registry';
import { createBarChartScales } from './nge-chart.bar.helpers';

/**
 * Context required to render a chart.
 * Framework-agnostic - can be used with Angular, React, Vue, or vanilla JS.
 */
export interface RenderChartContext {
  /**
   * The chart configuration including layers, theme, and base settings.
   */
  config: NgeChartConfig;

  /**
   * The container element to render the chart into.
   * Used to get dimensions via getBoundingClientRect().
   */
  container: HTMLElement;

  /**
   * The base layout instance created via createBaseLayout().
   * Manages the SVG structure and axes.
   */
  layout: NgeChartBaseLayoutInstance;

  /**
   * Direct reference to tooltip DOM element for synchronized D3 animation.
   */
  tooltipElement?: HTMLElement | null;

  /**
   * Generic tooltip handler. Called by layers when tooltip state changes.
   */
  tooltipHandler?: NgeTooltipHandlers;
}

/**
 * Result returned from a successful chart render.
 * Contains computed state that may be useful for interactions or debugging.
 */
export interface RenderChartResult {
  /**
   * The D3 selection for the bounded chart area.
   */
  bounds: Selection<SVGGElement, unknown, null, undefined>;

  /**
   * The computed dimensions of the chart area.
   */
  dimensions: NgeChartDimensions;

  /**
   * The D3 scales used for positioning elements.
   */
  scales: NgeChartScales;

  /**
   * The container's bounding rect at render time.
   */
  size: NgeJSONDOMRect;
}

/**
 * Pure function to render a chart.
 *
 * This function is framework-agnostic and handles all chart rendering logic:
 * 1. Gets container dimensions
 * 2. Resizes the layout
 * 3. Creates scales (custom or default)
 * 4. Renders axes
 * 5. Renders all layers
 *
 * @param context - The render context containing container, config, and layout
 * @returns The render result with computed state, or null if render was skipped
 *
 * @example
 * ```typescript
 * // Vanilla JS usage
 * const container = document.getElementById('chart');
 * const layout = createBaseLayout(container);
 * const config: NgeChartConfig = { layers: [...] };
 *
 * const result = renderChart({ container, config, layout });
 * if (result) {
 *   console.log('Rendered at dimensions:', result.dimensions);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // React usage (in useEffect)
 * useEffect(() => {
 *   if (!containerRef.current || !layoutRef.current) return;
 *   renderChart({
 *     container: containerRef.current,
 *     config,
 *     layout: layoutRef.current
 *   });
 * }, [config]);
 * ```
 */
export function renderChart(context: RenderChartContext): null | RenderChartResult {
  const { config, container, layout, tooltipElement, tooltipHandler } = context;

  const rect = container.getBoundingClientRect();

  // Skip render if container has no size
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const size: NgeJSONDOMRect = {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };

  // Resize layout to fit container
  const layoutState = layout.resize(size, config.base);

  if (!layoutState) {
    return null;
  }

  const { bounds, dimensions } = layoutState;

  // Get margins (with defaults)
  const margins = {
    bottom: config.base?.margin?.bottom ?? 25,
    left: config.base?.margin?.left ?? 45,
    right: config.base?.margin?.right ?? 15,
    top: config.base?.margin?.top ?? 15,
  };

  // Create scales - use custom factory if provided, otherwise use default bar chart scales
  const scales = config.scaleFactory
    ? config.scaleFactory(config, dimensions)
    : createBarChartScales(config, dimensions);

  // Render axes with theme
  layout.renderAxes(scales, config.theme);

  // Render all layers with theme and tooltip handlers
  // Flatten layers to support nested arrays from combined presets
  renderLayers(
    config.layers.flat(),
    { bounds, dimensions, margins, scales, tooltipElement, tooltipHandlers: tooltipHandler },
    config.theme
  );

  return {
    bounds,
    dimensions,
    scales,
    size,
  };
}
