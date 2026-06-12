import type { Selection } from 'd3-selection';

import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { select } from 'd3-selection';

import type { NgeChartDimensions, NgeJSONDOMRect } from '../chart.models';
import type { NgeChartBaseTheme } from '../theme/nge-chart-theme.models';
import type {
  NgeChartBaseConfig,
  NgeChartLayoutState,
  NgeChartScales,
  ResolvedNgeChartBaseConfig,
} from './nge-chart-base-layout.models';

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

/**
 * Factory function to create a base chart layout instance.
 * Handles SVG creation, margins, dimensions, and shared axes.
 *
 * @param target - HTMLElement or ShadowRoot to render the chart into
 *
 * @example
 * const layout = createBaseLayout(containerEl);
 * const { bounds, dimensions } = layout.resize(size, config);
 * layout.renderAxes(scales);
 * // ... render layers ...
 * layout.destroy();
 */
export function createBaseLayout(target: HTMLElement | ShadowRoot): NgeChartBaseLayoutInstance {
  // Private state (closure)
  let svg: null | Selection<SVGSVGElement, unknown, null, undefined> = null;
  let bounds: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let xAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let yAxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
  let y2AxisGroup: null | Selection<SVGGElement, unknown, null, undefined> = null;
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

    bounds = svg.append('g').classed('nge-chart-bounds', true);
  }

  function resize(
    size: NgeJSONDOMRect,
    config?: Partial<NgeChartBaseConfig>
  ): NgeChartLayoutState | null {
    if (!svg || !bounds) {
      return null;
    }

    const mergedConfig = mergeBaseConfig(config);
    currentConfig = mergedConfig;

    const margin = mergedConfig.margin;
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

    return { bounds, dimensions };
  }

  function renderAxes(scales: NgeChartScales, theme?: Partial<NgeChartBaseTheme>): void {
    if (!bounds || !currentConfig || !currentDimensions) {
      return;
    }

    const config = currentConfig;
    const dimensions = currentDimensions;
    const mergedTheme = mergeBaseTheme(theme);

    // X axis
    if (config.showXAxis) {
      if (!xAxisGroup) {
        xAxisGroup = bounds.append('g').classed('nge-chart-x-axis', true);
      }

      let xAxis = axisBottom(scales.x as any)
        .tickSize(0)
        .tickPadding(8);
      // Apply tick count limit if specified (only works for linear/time scales, not band)
      if (config.xAxisTicks !== undefined) {
        xAxis = xAxis.ticks(config.xAxisTicks);
      }
      if (config.xAxisTickFormat) {
        xAxis = xAxis.tickFormat(config.xAxisTickFormat as any);
      }
      xAxisGroup.attr('transform', `translate(0, ${dimensions.boundedHeight})`).call(xAxis);

      // Apply theme styles to X axis
      const axisTheme = mergedTheme.axis;
      xAxisGroup
        .select('.domain')
        .style('stroke', axisTheme.lineColor ?? 'var(--chart-outline-variant)')
        .style('stroke-width', `${axisTheme.lineWidth ?? 1}px`);

      // Apply rotation to tick labels if configured
      const tickRotation = config.xAxisTickRotation;
      if (tickRotation !== 0) {
        xAxisGroup
          .selectAll('.tick text')
          .style('fill', axisTheme.tickColor ?? 'var(--chart-on-surface)')
          .style('font-size', `${axisTheme.tickFontSize ?? 10}px`)
          .attr('transform', `rotate(${tickRotation})`)
          .attr('text-anchor', tickRotation < 0 ? 'end' : 'start')
          .attr('dx', tickRotation < 0 ? '-0.5em' : '0.5em')
          .attr('dy', tickRotation < 0 ? '0.25em' : '0.5em');
      } else {
        xAxisGroup
          .selectAll('.tick text')
          .style('fill', axisTheme.tickColor ?? 'var(--chart-on-surface)')
          .style('font-size', `${axisTheme.tickFontSize ?? 10}px`);
      }

      xAxisGroup.selectAll('.tick line').style('stroke', 'none');
    } else if (xAxisGroup) {
      xAxisGroup.remove();
      xAxisGroup = null;
    }

    // Y axis
    if (config.showYAxis) {
      if (!yAxisGroup) {
        yAxisGroup = bounds.append('g').classed('nge-chart-y-axis', true);
      }

      let yAxis = axisLeft(scales.y as any)
        .tickSize(0)
        .tickPadding(8);
      // Apply tick count limit if specified (only works for linear scales, not band)
      if (config.yAxisTicks !== undefined) {
        yAxis = yAxis.ticks(config.yAxisTicks);
      }
      if (config.yAxisTickFormat) {
        yAxis = yAxis.tickFormat(config.yAxisTickFormat as any);
      }
      yAxisGroup.call(yAxis);

      // Apply theme styles to Y axis
      const yAxisTheme = mergedTheme.axis;
      yAxisGroup
        .select('.domain')
        .style('stroke', yAxisTheme.lineColor ?? 'var(--chart-outline-variant)')
        .style('stroke-width', `${yAxisTheme.lineWidth ?? 1}px`);

      yAxisGroup
        .selectAll('.tick text')
        .style('fill', yAxisTheme.tickColor ?? 'var(--chart-on-surface)')
        .style('font-size', `${yAxisTheme.tickFontSize ?? 10}px`);

      yAxisGroup.selectAll('.tick line').style('stroke', 'none');
    } else if (yAxisGroup) {
      yAxisGroup.remove();
      yAxisGroup = null;
    }

    // Secondary Y axis (right side)
    if (config.showY2Axis && scales.y2) {
      if (!y2AxisGroup) {
        y2AxisGroup = bounds.append('g').classed('nge-chart-y2-axis', true);
      }

      const y2Axis = axisRight(scales.y2 as any)
        .ticks(5)
        .tickSize(0)
        .tickPadding(8);
      y2AxisGroup.attr('transform', `translate(${dimensions.boundedWidth}, 0)`).call(y2Axis);

      // Apply theme styles to Y2 axis
      const y2AxisTheme = mergedTheme.axis;
      y2AxisGroup
        .select('.domain')
        .style('stroke', y2AxisTheme.lineColor ?? 'var(--chart-outline-variant)')
        .style('stroke-width', `${y2AxisTheme.lineWidth ?? 1}px`);

      y2AxisGroup
        .selectAll('.tick text')
        .style('fill', y2AxisTheme.tickColor ?? 'var(--chart-on-surface)')
        .style('font-size', `${y2AxisTheme.tickFontSize ?? 10}px`);

      y2AxisGroup.selectAll('.tick line').style('stroke', 'none');
    } else if (y2AxisGroup) {
      y2AxisGroup.remove();
      y2AxisGroup = null;
    }

    // X axis label
    const labelTheme = mergedTheme.axis;
    if (config.xAxisLabel) {
      if (!xAxisLabelEl) {
        xAxisLabelEl = bounds.append('text').classed('nge-chart-x-axis-label', true);
      }
      xAxisLabelEl
        .attr('x', dimensions.boundedWidth / 2)
        .attr('y', dimensions.boundedHeight + config.margin.bottom - 2)
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
      yAxisLabelEl
        .attr('transform', 'rotate(-90)')
        .attr('x', -dimensions.boundedHeight / 2)
        .attr('y', -config.margin.left + 10)
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
    xAxisGroup = null;
    yAxisGroup = null;
    y2AxisGroup = null;
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
