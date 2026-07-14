import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';

import type { NgeChartBaseLayoutInstance, NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions, NgeJSONDOMRect } from '../core/chart.models';
import type { NgeChartConfig } from '../core/config';
import type { NgeChartGestureHandlers, NgeChartGesturesConfig } from '../core/gesture';
import type { NgeTooltipHandlers } from '../core/tooltip';

import { attachRangeAxisBrush } from '../core/gesture';
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
   * Gesture handler. Called with semantic zoom/pan/reset events when
   * `config.gestures` enables gesture capture.
   */
  gestureHandler?: NgeChartGestureHandlers;

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
  const { config, container, gestureHandler, layout, tooltipElement, tooltipHandler } = context;

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

  const { bounds, dimensions, layers } = layoutState;

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
  // Flatten layers to support nested arrays from combined presets.
  // Layers draw into the CLIPPED layers group (plot area only) so marks never
  // spill over axes/margins when zoomed or panned; axes stay unclipped in bounds.
  renderLayers(
    config.layers.flat(),
    {
      bounds: layers,
      dimensions,
      margins,
      scales,
      tooltipElement,
      tooltipHandlers: tooltipHandler,
    },
    config.theme
  );

  // Attach (or detach) gesture capture on the persistent svg wrapper
  const svgNode = bounds.node()?.ownerSVGElement;
  if (svgNode) {
    attachGestureListeners(
      select(svgNode),
      bounds,
      margins,
      dimensions,
      scales,
      config.gestures,
      gestureHandler
    );
    // Range/slider-axis brush interaction — a sibling of the plot gestures,
    // hit-testing the margin strips where the range axes render. Independent of
    // the plot's own pan/zoom; detaches itself when no range axis is configured.
    attachRangeAxisBrush(
      select(svgNode),
      bounds,
      dimensions,
      scales,
      config.base ?? {},
      gestureHandler
    );
  }

  return {
    bounds,
    dimensions,
    scales,
    size,
  };
}

/** Per-svg drag state — persists across re-renders (listeners are re-attached per render). */
interface GestureDragState {
  /** Sub-step pixel accumulator for band-axis pan — emits whole-category steps. */
  bandAccumPx: number;
  lastPoint: [number, number];
  /** 'pan' shifts domains per move; 'brush' draws a zoom-to rectangle */
  mode: 'brush' | 'pan';
  /** True once the drag passed the movement threshold */
  moved: boolean;
  pointerId: number;
  startPoint: [number, number];
}

const dragStateBySvg = new WeakMap<SVGSVGElement, GestureDragState>();

/** Pixel movement required before a drag is treated as a pan/brush (protects point clicks). */
const PAN_THRESHOLD_PX = 3;

/** Minimum brush rectangle size (px, each dimension) — avoids accidental micro-zooms. */
const BRUSH_MIN_PX = 5;

/**
 * Attach wheel-zoom / drag-pan / brush-zoom / dblclick-reset listeners to the
 * chart's persistent svg wrapper and emit STATELESS semantic gesture events.
 *
 * Brush-zoom (`gestures.brushZoom`) draws a rectangle over the plot and emits
 * a `zoom-rect` event with its data-space extents on release: Shift+drag when
 * `pan` is also enabled, plain drag otherwise.
 *
 * Called on every render with fresh scale closures — d3's namespaced `.on()`
 * replaces listeners idempotently, and drag state survives re-renders in a
 * WeakMap keyed by the (persistent) svg node. Events carry the CURRENT
 * rendered domains + data-space deltas so consumers accumulate with pure math
 * (deliberately NOT d3-zoom — see NgeChartGestureEvent).
 *
 * Exported for direct unit testing.
 */
export function attachGestureListeners(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  margins: { bottom: number; left: number; right: number; top: number },
  dimensions: NgeChartDimensions,
  scales: NgeChartScales,
  gestures: NgeChartGesturesConfig | undefined,
  handler: NgeChartGestureHandlers | undefined
): void {
  const svgNode = svg.node();
  if (!svgNode) return;

  const brushEnabled = !!gestures?.brushZoom && !!handler;
  const panEnabled = !!gestures?.pan && !!handler;
  const zoomEnabled = !!gestures?.zoom && !!handler;
  const dragEnabled = brushEnabled || panEnabled;

  if (!dragEnabled && !zoomEnabled) {
    svg
      .on('wheel.ngeGesture', null)
      .on('pointerdown.ngeGesture', null)
      .on('pointermove.ngeGesture', null)
      .on('pointerup.ngeGesture', null)
      .on('pointercancel.ngeGesture', null)
      .on('dblclick.ngeGesture', null)
      .style('cursor', null)
      .style('user-select', null)
      .style('-webkit-user-select', null);
    bounds.select('.nge-chart-brush-rect').remove();
    dragStateBySvg.delete(svgNode);
    return;
  }

  const xScale = scales.x as ScaleLinear<number, number>;
  const yScale = scales.y as ScaleLinear<number, number>;

  // Normalize an inverted axis value to a number so the STATELESS event model
  // stays `[number, number]`: identity for linear scales, epoch ms for time
  // scales (whose `invert()` returns a Date). The scale factory maps the number
  // back (e.g. `new Date(ms)`).
  const asNumber = (value: Date | number): number => +value;

  // A band/point axis (bar family, categorical-x line) has no `invert()`. When
  // one is present the chart WINDOWS that axis by whole categories instead of
  // rescaling (the value axis auto-fits on the next render). Detect which axis,
  // if any, is band, plus its pixel geometry for the fraction/step math.
  const isBandScale = (scale: unknown): boolean =>
    typeof (scale as { invert?: unknown }).invert !== 'function';
  const bandAxis: 'x' | 'y' | null = isBandScale(scales.x)
    ? 'x'
    : isBandScale(scales.y)
      ? 'y'
      : null;
  const bandScale = (bandAxis === 'y' ? scales.y : scales.x) as { step?: () => number };
  const bandLengthPx = bandAxis === 'y' ? dimensions.boundedHeight : dimensions.boundedWidth;
  const bandPosOf = (point: [number, number]): number => (bandAxis === 'y' ? point[1] : point[0]);
  const bandFractionOf = (point: [number, number]): number =>
    bandLengthPx <= 0 ? 0 : Math.max(0, Math.min(1, bandPosOf(point) / bandLengthPx));

  // Pointer position relative to the plot origin (svg rect + margins) — avoids
  // d3.pointer's SVG CTM machinery, which jsdom lacks, and the bounds <g>'s
  // bounding box, which is skewed by axis tick labels.
  const toBoundsPoint = (event: MouseEvent): [number, number] => {
    const rect = svgNode.getBoundingClientRect();
    return [event.clientX - rect.left - margins.left, event.clientY - rect.top - margins.top];
  };

  // Clamp a bounds-relative point to the plot area (brush must not leave it)
  const clampToPlot = (point: [number, number]): [number, number] => [
    Math.max(0, Math.min(dimensions.boundedWidth, point[0])),
    Math.max(0, Math.min(dimensions.boundedHeight, point[1])),
  ];

  const currentDomains = (): {
    xDomain: [number, number];
    yDomain: [number, number];
  } => ({
    xDomain: (xScale.domain() as (Date | number)[]).map(asNumber) as [number, number],
    yDomain: (yScale.domain() as (Date | number)[]).map(asNumber) as [number, number],
  });

  const removeBrushRect = (): void => {
    bounds.select('.nge-chart-brush-rect').remove();
  };

  // Listeners are always (re)attached with fresh closures per render; the
  // gesture flags gate INSIDE — d3's .on() typings reject `listener | null`
  // unions, and the everything-disabled case detaches above.
  svg.on('wheel.ngeGesture', (event: WheelEvent) => {
    if (!zoomEnabled) return;
    event.preventDefault();
    // 2^(-deltaY * 0.002): ~100 wheel units ≈ ×1.15, clamped per event
    const factor = Math.min(2, Math.max(0.5, Math.pow(2, -event.deltaY * 0.002)));
    if (factor === 1) return;
    const [px, py] = toBoundsPoint(event);
    if (bandAxis) {
      handler!.onGesture({
        axis: bandAxis,
        kind: 'band-window',
        op: { anchorFraction: bandFractionOf([px, py]), factor, type: 'zoom' },
      });
      return;
    }
    handler!.onGesture({
      ...currentDomains(),
      factor,
      focus: { x: asNumber(xScale.invert(px)), y: asNumber(yScale.invert(py)) },
      kind: 'zoom',
    });
  });

  svg.on('pointerdown.ngeGesture', (event: PointerEvent) => {
    if (!dragEnabled || event.button !== 0) return;
    const point = toBoundsPoint(event);
    // Only start a plot drag INSIDE the plot area. Pointerdowns on the axis
    // margins/strips belong to the range-axis brush (or nothing), so plot
    // pan/brush-zoom never double-fires with it.
    if (
      point[0] < 0 ||
      point[0] > dimensions.boundedWidth ||
      point[1] < 0 ||
      point[1] > dimensions.boundedHeight
    ) {
      return;
    }
    // Stop the browser from starting a text/element selection drag — without
    // this, dragging paints the native blue selection over axis tick labels.
    event.preventDefault();
    try {
      svgNode.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom / detached nodes — capture is a nicety, not a requirement
    }
    dragStateBySvg.set(svgNode, {
      bandAccumPx: 0,
      lastPoint: point,
      // Shift+drag brushes when pan is also on; brush-only charts brush on plain drag
      mode: brushEnabled && (event.shiftKey || !panEnabled) ? 'brush' : 'pan',
      moved: false,
      pointerId: event.pointerId,
      startPoint: point,
    });
  });

  svg.on('pointermove.ngeGesture', (event: PointerEvent) => {
    if (!dragEnabled) return;
    const state = dragStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;

    const point = toBoundsPoint(event);
    if (!state.moved) {
      const dx = point[0] - state.startPoint[0];
      const dy = point[1] - state.startPoint[1];
      if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
      state.moved = true;
      svg.style('cursor', state.mode === 'brush' ? 'crosshair' : 'grabbing');
    }

    if (state.mode === 'brush') {
      // Draw/update the selection rectangle (token-styled, clamped to the plot)
      const [x0, y0] = clampToPlot(state.startPoint);
      const [x1, y1] = clampToPlot(point);
      let rect = bounds.select<SVGRectElement>('.nge-chart-brush-rect');
      if (rect.empty()) {
        rect = bounds
          .append('rect')
          .attr('class', 'nge-chart-brush-rect')
          .style('fill', 'var(--chart-primary)')
          .style('fill-opacity', 0.08)
          .style('stroke', 'var(--chart-primary)')
          .style('stroke-width', 1)
          .style('stroke-dasharray', '4 3')
          .style('pointer-events', 'none');
      }
      rect
        .attr('x', Math.min(x0, x1))
        .attr('y', Math.min(y0, y1))
        .attr('width', Math.abs(x1 - x0))
        .attr('height', Math.abs(y1 - y0));
      return;
    }

    if (bandAxis) {
      // Whole-category pan: accumulate sub-step pixels and emit ±N category steps
      // as boundaries are crossed. Content follows the cursor — dragging toward
      // the +axis reveals EARLIER categories (window shifts to lower indices).
      const step = bandScale.step?.() ?? 0;
      state.bandAccumPx += bandPosOf(point) - bandPosOf(state.lastPoint);
      state.lastPoint = point;
      if (step > 0) {
        let deltaCategories = 0;
        while (state.bandAccumPx >= step) {
          deltaCategories -= 1;
          state.bandAccumPx -= step;
        }
        while (state.bandAccumPx <= -step) {
          deltaCategories += 1;
          state.bandAccumPx += step;
        }
        if (deltaCategories !== 0) {
          handler!.onGesture({
            axis: bandAxis,
            kind: 'band-window',
            op: { deltaCategories, type: 'pan' },
          });
        }
      }
      return;
    }

    const xDelta = asNumber(xScale.invert(point[0])) - asNumber(xScale.invert(state.lastPoint[0]));
    const yDelta = asNumber(yScale.invert(point[1])) - asNumber(yScale.invert(state.lastPoint[1]));
    state.lastPoint = point;

    handler!.onGesture({ ...currentDomains(), kind: 'pan', xDelta, yDelta });
  });

  const endDrag = (event: PointerEvent): void => {
    if (!dragEnabled) return;
    const state = dragStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateBySvg.delete(svgNode);
    try {
      if (svgNode.hasPointerCapture?.(event.pointerId)) {
        svgNode.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore — releasing capture is best-effort
    }

    if (state.mode === 'brush' && state.moved) {
      removeBrushRect();
      const [x0, y0] = clampToPlot(state.startPoint);
      const [x1, y1] = clampToPlot(toBoundsPoint(event));
      // Ignore accidental micro-selections
      if (bandAxis) {
        // Band brush: only the band-axis extent matters (the value axis auto-fits)
        const bandSpanPx = bandAxis === 'y' ? Math.abs(y1 - y0) : Math.abs(x1 - x0);
        if (bandSpanPx >= BRUSH_MIN_PX) {
          handler!.onGesture({
            axis: bandAxis,
            kind: 'band-window',
            op: {
              fromFraction: bandFractionOf([x0, y0]),
              toFraction: bandFractionOf([x1, y1]),
              type: 'brush',
            },
          });
        }
      } else if (Math.abs(x1 - x0) >= BRUSH_MIN_PX && Math.abs(y1 - y0) >= BRUSH_MIN_PX) {
        const dataX = [asNumber(xScale.invert(x0)), asNumber(xScale.invert(x1))].sort(
          (a, b) => a - b
        );
        const dataY = [asNumber(yScale.invert(y0)), asNumber(yScale.invert(y1))].sort(
          (a, b) => a - b
        );
        handler!.onGesture({
          kind: 'zoom-rect',
          xExtent: [dataX[0], dataX[1]],
          yExtent: [dataY[0], dataY[1]],
        });
      }
    }

    if (state.moved) {
      // Swallow the click that follows a drag so point onClick handlers don't fire
      svgNode.addEventListener('click', clickEvent => clickEvent.stopPropagation(), {
        capture: true,
        once: true,
      });
    }
    svg.style('cursor', panEnabled ? 'grab' : 'crosshair');
  };

  svg.on('pointerup.ngeGesture', endDrag);
  svg.on('pointercancel.ngeGesture', endDrag);

  // Double-click resets to data-driven domains (active when any gesture is on)
  svg.on('dblclick.ngeGesture', () => handler!.onGesture({ kind: 'reset' }));

  if (dragEnabled) {
    // user-select none (belt to pointerdown preventDefault's suspenders) keeps
    // drags from ever highlighting axis/tick text inside the svg
    svg
      .style('cursor', panEnabled ? 'grab' : 'crosshair')
      .style('user-select', 'none')
      .style('-webkit-user-select', 'none');
  } else {
    svg.style('cursor', null).style('user-select', null).style('-webkit-user-select', null);
  }
}
