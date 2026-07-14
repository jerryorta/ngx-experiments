import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';

import type { NgeChartDimensions, NgeJSONDOMRect } from '../chart.models';
import type { NgeChartBaseTheme } from '../theme/nge-chart-theme.models';
import type {
  NgeChartBaseConfig,
  NgeChartLayoutState,
  NgeChartScales,
  NgeChartXScale,
  NgeChartYScale,
  ResolvedNgeChartBaseConfig,
} from './nge-chart-base-layout.models';

import {
  AXIS_TIER_HEIGHT,
  computeAxisTickPositions,
  renderAxisTiers,
  renderNgeAxis,
  renderNgeRangeAxis,
} from '../axis';
import { mergeBaseTheme } from '../theme/nge-chart-theme.fns';
import { mergeBaseConfig } from './nge-chart-base-layout.models';

/**
 * Instance returned by createBaseLayout factory.
 */
export interface NgeChartBaseLayoutInstance {
  /**
   * Clean up all elements.
   */
  destroy: () => void;

  /**
   * Get the bounds group for chart layers to render into.
   */
  getBounds: () => null | Selection<SVGGElement, unknown, null, undefined>;

  /**
   * Get the current dimensions.
   */
  getDimensions: () => NgeChartDimensions | null;

  /**
   * Render shared axes based on current config, scales, and theme.
   * @param scales - The x and y scales for the chart
   * @param theme - Optional theme overrides for axis styling
   */
  renderAxes: (scales: NgeChartScales, theme?: Partial<NgeChartBaseTheme>) => void;

  /**
   * Resize the layout based on container dimensions.
   * @returns Layout state with dimensions and bounds reference
   */
  resize: (
    size: NgeJSONDOMRect,
    config?: Partial<NgeChartBaseConfig>
  ) => NgeChartLayoutState | null;
}

/** Unique clipPath ids per layout instance (charts can coexist on one page). */
let clipPathIdCounter = 0;

/**
 * Vertical gap (px) below the X-axis baseline reserved for the tick-label row
 * before the first grouping tier — tickPadding (8) + ~12px label height — so
 * tier 0 clears the tick text.
 */
const X_TICK_LABEL_BAND = 20;

/**
 * Horizontal gap (px) left of the Y-axis reserved for the tick-label column
 * before the first grouping tier. Y tick labels run wider than X tick labels,
 * so this allowance is larger than {@link X_TICK_LABEL_BAND}.
 */
const Y_TICK_LABEL_BAND = 40;

/**
 * Extra horizontal room (px) reserved beyond the Y grouping-tier stack for the
 * rotated Y-axis title, so the title clears the outermost tier instead of
 * overprinting it. Only budgeted (and only applied to the title's position)
 * when at least one Y tier is present.
 */
const Y_LABEL_ALLOWANCE = 18;

/**
 * Minimum TOP margin (px) reserved when an `xRangeAxis` is set, so the opposite-
 * edge X FOCUS axis (the zoomed values, above the plot) has a tick-label row.
 * Applied as a floor (`max`) so a caller's larger top margin is preserved.
 */
const FOCUS_AXIS_TOP_MARGIN = 24;

/**
 * Minimum RIGHT margin (px) reserved when a `yRangeAxis` is set, for the right-edge
 * Y FOCUS axis. Wider than {@link FOCUS_AXIS_TOP_MARGIN} because Y tick labels run
 * wider than the single-line X labels.
 */
const FOCUS_AXIS_RIGHT_MARGIN = 36;

/**
 * Fade duration (ms) for the opposite-edge focus axes as they cross the 100%
 * (focus == full) boundary — hidden at full extent, faded in once zoomed. CSS-
 * driven so it survives the per-frame gesture re-renders that keep marks instant.
 */
const FOCUS_AXIS_FADE_MS = 200;

/**
 * Structural view of a d3 scale that can be duplicated, re-domained, and read
 * back — enough to build the range axis's full-range scale from a layer scale
 * without importing every d3 scale type or resorting to `any`.
 */
interface CopyableScale {
  copy(): CopyableScale;
  domain(): unknown[];
  domain(domain: [number, number]): CopyableScale;
}

/**
 * Derives the two scales a range/slider axis needs from a layer scale: the current
 * FOCUS domain (what the layers render — the zoomed slice) and a same-type, same-
 * pixel-range `fullScale` re-domained to the whole data extent (what the ruler and
 * brush window render). Structurally typed to avoid `any`; the caller guarantees an
 * invertible (linear/time) scale, per the range-axis contract.
 *
 * @param scale - The dimension's layer scale (its range is preserved).
 * @param fullDomain - The full data extent the ruler spans, `[min, max]`.
 * @returns The layers' current focus domain and the full-extent scale.
 */
function rangeAxisScales(
  scale: NgeChartXScale | NgeChartYScale,
  fullDomain: [number, number]
): { focusDomain: [number, number]; fullScale: NgeChartXScale | NgeChartYScale } {
  const copyable = scale as unknown as CopyableScale;
  return {
    focusDomain: copyable.domain() as [number, number],
    fullScale: copyable.copy().domain(fullDomain) as unknown as NgeChartXScale | NgeChartYScale,
  };
}

/**
 * True when the plot is zoomed/panned off its full extent — the current focus
 * domain differs from the range axis's full domain beyond a proportional epsilon.
 * Drives the focus axes' fade: hidden at 100% (focus == full), faded in once
 * zoomed. Domain values are coerced to numbers so a time scale's `Date` domain
 * compares against the numeric `fullDomain`.
 */
function isFocusZoomed(focusDomain: unknown[], fullDomain: [number, number]): boolean {
  const lo = Number(focusDomain[0]);
  const hi = Number(focusDomain[1]);
  const eps = (Math.abs(fullDomain[1] - fullDomain[0]) || 1) * 1e-6;
  return Math.abs(lo - fullDomain[0]) > eps || Math.abs(hi - fullDomain[1]) > eps;
}

/**
 * Factory function to create a base chart layout instance.
 * Handles SVG creation, margins, dimensions, shared axes, and the clipped
 * layers group all chart marks render into.
 *
 * @param target - HTMLElement or ShadowRoot to render the chart into
 *
 * @example
 * const layout = createBaseLayout(containerEl);
 * const { layers, dimensions } = layout.resize(size, config);
 * layout.renderAxes(scales);
 * // ... render layers into `layers` (clipped to the plot area) ...
 * layout.destroy();
 */
export function createBaseLayout(target: HTMLElement | ShadowRoot): NgeChartBaseLayoutInstance {
  // Private state (closure)
  let svg: null | Selection<SVGSVGElement, unknown, null, undefined> = null;
  let bounds: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let layers: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let clipRect: null | Selection<SVGRectElement, unknown, null, undefined> = null;
  let xAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let y2AxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  // Range/slider axis groups — each REPLACES its standard axis when configured.
  let xRangeAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yRangeAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  // Opposite-edge FOCUS axis groups (top X / right Y) — the zoomed values a range
  // axis adds so the plot still shows its current scale opposite the brush ruler.
  let xFocusAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yFocusAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  // Always-on plot-frame borders for the focus-axis edges (top / right) — kept
  // visible even while the focus axis's labels fade out at 100%, so the frame stays
  // complete.
  let xTopBorder: null | Selection<SVGLineElement, unknown, null, undefined> = null;
  let yRightBorder: null | Selection<SVGLineElement, unknown, null, undefined> = null;
  let xTierGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yTierGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let xGridGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yGridGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let xAxisLabelEl: null | Selection<SVGTextElement, unknown, null, undefined> = null;
  let yAxisLabelEl: null | Selection<SVGTextElement, unknown, null, undefined> = null;
  let y2AxisLabelEl: null | Selection<SVGTextElement, unknown, null, undefined> = null;
  let currentConfig: null | ResolvedNgeChartBaseConfig = null;
  let currentDimensions: NgeChartDimensions | null = null;

  // Create SVG structure immediately
  const existingSvg = select(target as any).select('svg.nge-chart-wrapper');
  if (existingSvg.empty()) {
    svg = select(target as any)
      .append('svg')
      .classed('nge-chart-wrapper', true)
      .style('display', 'block')
      .style('width', '100%')
      .style('height', '100%');

    // Plot-area clip: marks must not spill over axes/margins when zoomed/panned.
    // Unique id per instance; url(#id) resolves within each chart's shadow tree.
    const clipPathId = `nge-chart-clip-${++clipPathIdCounter}`;
    clipRect = svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipPathId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0);

    bounds = svg.append('g').classed('nge-chart-bounds', true);

    // All chart layers render inside this clipped group; axes are inserted
    // BEFORE it (see renderAxes) so marks keep rendering above axis lines.
    layers = bounds
      .append('g')
      .classed('nge-chart-layers', true)
      .attr('clip-path', `url(#${clipPathId})`);
  }

  function resize(
    size: NgeJSONDOMRect,
    config?: Partial<NgeChartBaseConfig>
  ): NgeChartLayoutState | null {
    if (!svg || !bounds || !layers || !clipRect) {
      return null;
    }

    const mergedConfig = mergeBaseConfig(config);
    currentConfig = mergedConfig;

    // Reserve extra margin for grouping-tier rows (below X, left of Y) WITHOUT
    // mutating the shared default margin — each tier row adds AXIS_TIER_HEIGHT.
    const nXTiers = mergedConfig.xAxisGroups?.length ?? 0;
    const nYTiers = mergedConfig.yAxisGroups?.length ?? 0;
    const margin = {
      ...mergedConfig.margin,
      bottom: mergedConfig.margin.bottom + nXTiers * AXIS_TIER_HEIGHT,
      left:
        mergedConfig.margin.left +
        nYTiers * AXIS_TIER_HEIGHT +
        (nYTiers > 0 ? Y_LABEL_ALLOWANCE : 0),
      // A range axis pins its own edge to the full-range ruler and adds a FOCUS
      // axis on the OPPOSITE edge (top for X, right for Y) showing the zoomed
      // values — reserve room there so those tick labels aren't clipped.
      right: mergedConfig.yRangeAxis
        ? Math.max(mergedConfig.margin.right, FOCUS_AXIS_RIGHT_MARGIN)
        : mergedConfig.margin.right,
      top: mergedConfig.xRangeAxis
        ? Math.max(mergedConfig.margin.top, FOCUS_AXIS_TOP_MARGIN)
        : mergedConfig.margin.top,
    };
    const boundedWidth = Math.max(0, size.width - margin.left - margin.right);
    const boundedHeight = Math.max(0, size.height - margin.top - margin.bottom);

    const dimensions: NgeChartDimensions = {
      boundedHeight,
      boundedWidth,
      height: size.height,
      margin,
      width: size.width,
    };

    currentDimensions = dimensions;

    svg.attr('width', size.width).attr('height', size.height);
    bounds.attr('transform', `translate(${margin.left}, ${margin.top})`);
    clipRect.attr('width', boundedWidth).attr('height', boundedHeight);

    return { bounds, dimensions, layers };
  }

  function renderAxes(scales: NgeChartScales, theme?: Partial<NgeChartBaseTheme>): void {
    if (!bounds || !currentConfig || !currentDimensions) {
      return;
    }

    const config = currentConfig;
    const dimensions = currentDimensions;
    const mergedTheme = mergeBaseTheme(theme);

    // X gridlines (vertical, at the X-axis tick positions). Inserted before the
    // clipped layers group so they render behind both the marks and the axes.
    if (config.showXGrid) {
      if (!xGridGroup) {
        xGridGroup = bounds.insert('g', '.nge-chart-layers').classed('nge-chart-x-grid', true);
      }
      const xPositions = computeAxisTickPositions(scales.x, config.xAxisTicks);
      const xLines = xGridGroup.selectAll<SVGLineElement, number>('line').data(xPositions);
      xLines
        .enter()
        .append('line')
        .merge(xLines)
        .attr('x1', d => d)
        .attr('x2', d => d)
        .attr('y1', 0)
        .attr('y2', dimensions.boundedHeight)
        .style('stroke', mergedTheme.grid.lineColor ?? 'var(--chart-outline-variant)')
        .style('stroke-width', mergedTheme.grid.lineWidth ?? 1)
        .style('stroke-dasharray', mergedTheme.grid.lineDash ?? '2 2');
      xLines.exit().remove();
    } else if (xGridGroup) {
      xGridGroup.remove();
      xGridGroup = null;
    }

    // Y gridlines (horizontal, at the Y-axis tick positions). Inserted before the
    // clipped layers group so they render behind both the marks and the axes.
    if (config.showYGrid) {
      if (!yGridGroup) {
        yGridGroup = bounds.insert('g', '.nge-chart-layers').classed('nge-chart-y-grid', true);
      }
      const yPositions = computeAxisTickPositions(scales.y, config.yAxisTicks);
      const yLines = yGridGroup.selectAll<SVGLineElement, number>('line').data(yPositions);
      yLines
        .enter()
        .append('line')
        .merge(yLines)
        .attr('x1', 0)
        .attr('x2', dimensions.boundedWidth)
        .attr('y1', d => d)
        .attr('y2', d => d)
        .style('stroke', mergedTheme.grid.lineColor ?? 'var(--chart-outline-variant)')
        .style('stroke-width', mergedTheme.grid.lineWidth ?? 1)
        .style('stroke-dasharray', mergedTheme.grid.lineDash ?? '2 2');
      yLines.exit().remove();
    } else if (yGridGroup) {
      yGridGroup.remove();
      yGridGroup = null;
    }

    // X axis (inserted before the clipped layers group so marks render above).
    // A configured range/slider axis REPLACES the standard axis (precedence over
    // showXAxis): it renders the FULL data range with a brush window over the
    // layers' current focus slice. renderNgeAxis / renderNgeRangeAxis own the
    // group's internal DOM; the caller owns only its transform to the plot floor.
    if (config.xRangeAxis) {
      if (xAxisGroup) {
        xAxisGroup.remove();
        xAxisGroup = null;
      }
      if (!xRangeAxisGroup) {
        xRangeAxisGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-x-range-axis', true);
      }
      xRangeAxisGroup.attr('transform', `translate(0, ${dimensions.boundedHeight})`);
      const { focusDomain, fullScale } = rangeAxisScales(scales.x, config.xRangeAxis.fullDomain);
      renderNgeRangeAxis(xRangeAxisGroup, {
        axisTheme: mergedTheme.axis,
        focusDomain,
        fullScale,
        orient: 'bottom',
        tickFormat: config.xAxisTickFormat,
        ticks: config.xAxisTicks,
      });
    } else {
      if (xRangeAxisGroup) {
        xRangeAxisGroup.remove();
        xRangeAxisGroup = null;
      }
      if (config.showXAxis) {
        if (!xAxisGroup) {
          xAxisGroup = bounds.insert('g', '.nge-chart-layers').classed('nge-chart-x-axis', true);
        }

        xAxisGroup.attr('transform', `translate(0, ${dimensions.boundedHeight})`);
        renderNgeAxis(xAxisGroup, {
          axisTheme: mergedTheme.axis,
          orient: 'bottom',
          scale: scales.x,
          tickFormat: config.xAxisTickFormat,
          tickRotation: config.xAxisTickRotation,
          ticks: config.xAxisTicks,
        });
      } else if (xAxisGroup) {
        xAxisGroup.remove();
        xAxisGroup = null;
      }
    }

    // Top X FOCUS axis: when a range axis pins the bottom ruler to the full extent,
    // this opposite-edge axis (at the plot top) shows the plot's CURRENT (zoomed/
    // panned) X values — rendered from scales.x, the focus scale the layers use, so
    // it tracks every wheel/pan/brush. Automatic whenever xRangeAxis is set.
    if (config.xRangeAxis) {
      if (!xFocusAxisGroup) {
        xFocusAxisGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-x-focus-axis', true)
          .style('transition', `opacity ${FOCUS_AXIS_FADE_MS}ms ease-out`);
      }
      xFocusAxisGroup.attr('transform', 'translate(0, 0)');
      // Hidden at 100% (focus == full); fades in once the plot is zoomed/panned.
      const xZoomed = isFocusZoomed(
        (scales.x as unknown as CopyableScale).domain(),
        config.xRangeAxis.fullDomain
      );
      xFocusAxisGroup.style('opacity', xZoomed ? '1' : '0');
      renderNgeAxis(xFocusAxisGroup, {
        axisTheme: mergedTheme.axis,
        orient: 'top',
        scale: scales.x,
        tickFormat: config.xAxisTickFormat,
        ticks: config.xAxisTicks,
      });
    } else if (xFocusAxisGroup) {
      xFocusAxisGroup.remove();
      xFocusAxisGroup = null;
    }

    // X grouping tiers (rows of bands below the X tick labels, e.g. months under
    // days). Inserted before the layers group; positioned at the axis baseline
    // offset by the tick-label allowance so tier 0 clears the tick text.
    if (config.xAxisGroups && config.xAxisGroups.length) {
      if (!xTierGroup) {
        xTierGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-x-axis-groups', true);
      }
      xTierGroup.attr('transform', `translate(0, ${dimensions.boundedHeight + X_TICK_LABEL_BAND})`);
      renderAxisTiers(xTierGroup, config.xAxisGroups, {
        groupTheme: mergedTheme.axis.group ?? {},
        orient: 'bottom',
        scale: scales.x,
        tierHeight: AXIS_TIER_HEIGHT,
      });
    } else if (xTierGroup) {
      xTierGroup.remove();
      xTierGroup = null;
    }

    // Y axis (inserted before the clipped layers group so marks render above). As
    // with X, a configured range/slider axis REPLACES the standard Y axis
    // (precedence over showYAxis). Both sit at the plot origin (no transform).
    if (config.yRangeAxis) {
      if (yAxisGroup) {
        yAxisGroup.remove();
        yAxisGroup = null;
      }
      if (!yRangeAxisGroup) {
        yRangeAxisGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-y-range-axis', true);
      }
      const { focusDomain, fullScale } = rangeAxisScales(scales.y, config.yRangeAxis.fullDomain);
      renderNgeRangeAxis(yRangeAxisGroup, {
        axisTheme: mergedTheme.axis,
        focusDomain,
        fullScale,
        orient: 'left',
        tickFormat: config.yAxisTickFormat,
        ticks: config.yAxisTicks,
      });
    } else {
      if (yRangeAxisGroup) {
        yRangeAxisGroup.remove();
        yRangeAxisGroup = null;
      }
      if (config.showYAxis) {
        if (!yAxisGroup) {
          yAxisGroup = bounds.insert('g', '.nge-chart-layers').classed('nge-chart-y-axis', true);
        }

        renderNgeAxis(yAxisGroup, {
          axisTheme: mergedTheme.axis,
          orient: 'left',
          scale: scales.y,
          tickFormat: config.yAxisTickFormat,
          ticks: config.yAxisTicks,
        });
      } else if (yAxisGroup) {
        yAxisGroup.remove();
        yAxisGroup = null;
      }
    }

    // Y grouping tiers (columns of bands left of the Y tick labels). Symmetric to
    // the X tiers; each tier row stacks leftward from the tick-label allowance.
    if (config.yAxisGroups && config.yAxisGroups.length) {
      if (!yTierGroup) {
        yTierGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-y-axis-groups', true);
      }
      yTierGroup.attr('transform', `translate(-${Y_TICK_LABEL_BAND}, 0)`);
      renderAxisTiers(yTierGroup, config.yAxisGroups, {
        groupTheme: mergedTheme.axis.group ?? {},
        orient: 'left',
        scale: scales.y,
        tierHeight: AXIS_TIER_HEIGHT,
      });
    } else if (yTierGroup) {
      yTierGroup.remove();
      yTierGroup = null;
    }

    // Secondary Y axis (right side, inserted before the clipped layers group).
    if (config.showY2Axis && scales.y2) {
      if (!y2AxisGroup) {
        y2AxisGroup = bounds.insert('g', '.nge-chart-layers').classed('nge-chart-y2-axis', true);
      }

      y2AxisGroup.attr('transform', `translate(${dimensions.boundedWidth}, 0)`);
      renderNgeAxis(y2AxisGroup, {
        axisTheme: mergedTheme.axis,
        orient: 'right',
        scale: scales.y2,
        ticks: 5,
      });
    } else if (y2AxisGroup) {
      y2AxisGroup.remove();
      y2AxisGroup = null;
    }

    // Right Y FOCUS axis: the vertical counterpart of the top X focus axis — shows
    // the plot's CURRENT (zoomed/panned) Y values at the plot's right edge, from
    // scales.y. Automatic whenever yRangeAxis is set. (Shares the right edge with
    // the y2 axis; the two are mutually exclusive in practice — a range-brushed Y
    // chart has no secondary Y data axis.)
    if (config.yRangeAxis) {
      if (!yFocusAxisGroup) {
        yFocusAxisGroup = bounds
          .insert('g', '.nge-chart-layers')
          .classed('nge-chart-y-focus-axis', true)
          .style('transition', `opacity ${FOCUS_AXIS_FADE_MS}ms ease-out`);
      }
      yFocusAxisGroup.attr('transform', `translate(${dimensions.boundedWidth}, 0)`);
      // Hidden at 100% (focus == full); fades in once the plot is zoomed/panned.
      const yZoomed = isFocusZoomed(
        (scales.y as unknown as CopyableScale).domain(),
        config.yRangeAxis.fullDomain
      );
      yFocusAxisGroup.style('opacity', yZoomed ? '1' : '0');
      renderNgeAxis(yFocusAxisGroup, {
        axisTheme: mergedTheme.axis,
        orient: 'right',
        scale: scales.y,
        tickFormat: config.yAxisTickFormat,
        ticks: config.yAxisTicks,
      });
    } else if (yFocusAxisGroup) {
      yFocusAxisGroup.remove();
      yFocusAxisGroup = null;
    }

    // Plot-frame borders on the focus-axis edges — always opaque (independent of
    // the focus axis's fade), so the top/right frame lines stay visible at 100%
    // when the focus axis labels are hidden. When the focus axis IS visible the
    // border coincides with its baseline (identical line → no doubling).
    const borderStroke = mergedTheme.axis.lineColor ?? 'var(--chart-outline-variant)';
    const borderWidth = `${mergedTheme.axis.lineWidth ?? 1}px`;

    if (config.xRangeAxis) {
      if (!xTopBorder) {
        xTopBorder = bounds
          .insert('line', '.nge-chart-layers')
          .classed('nge-chart-x-top-border', true);
      }
      xTopBorder
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', dimensions.boundedWidth)
        .attr('y2', 0)
        .style('stroke', borderStroke)
        .style('stroke-width', borderWidth);
    } else if (xTopBorder) {
      xTopBorder.remove();
      xTopBorder = null;
    }

    if (config.yRangeAxis) {
      if (!yRightBorder) {
        yRightBorder = bounds
          .insert('line', '.nge-chart-layers')
          .classed('nge-chart-y-right-border', true);
      }
      yRightBorder
        .attr('x1', dimensions.boundedWidth)
        .attr('y1', 0)
        .attr('x2', dimensions.boundedWidth)
        .attr('y2', dimensions.boundedHeight)
        .style('stroke', borderStroke)
        .style('stroke-width', borderWidth);
    } else if (yRightBorder) {
      yRightBorder.remove();
      yRightBorder = null;
    }

    // Axis labels shift outward past any grouping tiers so they clear the tier
    // rows; with no tiers the offset is 0 (parity with the pre-tier layout).
    const xLabelTierOffset = (config.xAxisGroups?.length ?? 0) * AXIS_TIER_HEIGHT;
    const nYTiers = config.yAxisGroups?.length ?? 0;

    // X axis label
    const labelTheme = mergedTheme.axis;
    if (config.xAxisLabel) {
      if (!xAxisLabelEl) {
        xAxisLabelEl = bounds.append('text').classed('nge-chart-x-axis-label', true);
      }
      xAxisLabelEl
        .attr('x', dimensions.boundedWidth / 2)
        .attr('y', dimensions.boundedHeight + config.margin.bottom - 2 + xLabelTierOffset)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'auto')
        .style('fill', labelTheme.labelColor ?? 'var(--chart-on-surface-variant)')
        .style('font-size', `${labelTheme.labelFontSize ?? 11}px`)
        .style('font-weight', String(labelTheme.labelFontWeight ?? 500))
        .style('pointer-events', 'none')
        .text(config.xAxisLabel);
    } else if (xAxisLabelEl) {
      xAxisLabelEl.remove();
      xAxisLabelEl = null;
    }

    // Y axis label
    if (config.yAxisLabel) {
      if (!yAxisLabelEl) {
        yAxisLabelEl = bounds.append('text').classed('nge-chart-y-axis-label', true);
      }
      // With Y tiers present, seat the rotated title just beyond the tier stack
      // (whose outer edge is at -(Y_TICK_LABEL_BAND + nYTiers*AXIS_TIER_HEIGHT));
      // its center clears the stack by half the reserved label allowance. With no
      // tiers the position is byte-identical to the pre-tier layout.
      const yLabelX =
        nYTiers > 0
          ? -(Y_TICK_LABEL_BAND + nYTiers * AXIS_TIER_HEIGHT + Y_LABEL_ALLOWANCE / 2)
          : -config.margin.left + 10;
      yAxisLabelEl
        .attr('transform', 'rotate(-90)')
        .attr('x', -dimensions.boundedHeight / 2)
        .attr('y', yLabelX)
        .attr('text-anchor', 'middle')
        .style('fill', labelTheme.labelColor ?? 'var(--chart-on-surface-variant)')
        .style('font-size', `${labelTheme.labelFontSize ?? 11}px`)
        .style('font-weight', String(labelTheme.labelFontWeight ?? 500))
        .style('pointer-events', 'none')
        .text(config.yAxisLabel);
    } else if (yAxisLabelEl) {
      yAxisLabelEl.remove();
      yAxisLabelEl = null;
    }

    // Secondary Y axis label (right side)
    if (config.y2AxisLabel && scales.y2) {
      if (!y2AxisLabelEl) {
        y2AxisLabelEl = bounds.append('text').classed('nge-chart-y2-axis-label', true);
      }
      // Use custom y2 axis label color if specified, otherwise fall back to theme
      const y2LabelColor =
        config.y2AxisLabelColor || labelTheme.labelColor || 'var(--chart-on-surface-variant)';
      y2AxisLabelEl
        .attr('transform', 'rotate(90)')
        .attr('x', dimensions.boundedHeight / 2)
        .attr('y', -dimensions.boundedWidth - config.margin.right + 10)
        .attr('text-anchor', 'middle')
        .style('fill', y2LabelColor)
        .style('font-size', `${labelTheme.labelFontSize ?? 11}px`)
        .style('font-weight', String(labelTheme.labelFontWeight ?? 500))
        .style('pointer-events', 'none')
        .text(config.y2AxisLabel);
    } else if (y2AxisLabelEl) {
      y2AxisLabelEl.remove();
      y2AxisLabelEl = null;
    }
  }

  function getBounds() {
    return bounds;
  }

  function getDimensions() {
    return currentDimensions;
  }

  function destroy() {
    svg?.remove();
    svg = null;
    bounds = null;
    layers = null;
    clipRect = null;
    xAxisGroup = null;
    yAxisGroup = null;
    y2AxisGroup = null;
    xRangeAxisGroup = null;
    yRangeAxisGroup = null;
    xFocusAxisGroup = null;
    yFocusAxisGroup = null;
    xTopBorder = null;
    yRightBorder = null;
    xTierGroup = null;
    yTierGroup = null;
    xGridGroup = null;
    yGridGroup = null;
    xAxisLabelEl = null;
    yAxisLabelEl = null;
    y2AxisLabelEl = null;
    currentConfig = null;
    currentDimensions = null;
  }

  return {
    destroy,
    getBounds,
    getDimensions,
    renderAxes,
    resize,
  };
}
