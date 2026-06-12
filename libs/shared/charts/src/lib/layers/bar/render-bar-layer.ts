import type { EnterElement, Selection } from 'd3-selection';

import { select } from 'd3-selection';
import 'd3-transition';

import type { NgeBarDataPoint, NgeBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeBarLayerTheme, ResolvedNgeBarLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';

import { mergeBarLayerTheme } from '../../core/theme';

/**
 * Render bar layer into the provided bounds with theme support.
 * Pure function - no side effects outside of D3 DOM manipulation.
 */
export function renderBarLayer(
  context: NgeChartLayerContext<
    NgeBarDataPoint,
    NgeBarLayerConfig,
    NgeBarLayerTheme | undefined
  >
): void {
  const {
    bounds,
    config,
    data,
    dimensions,
    margins,
    scales,
    theme,
    tooltipConfig,
    tooltipHandlers,
  } = context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // Merge theme with defaults
  const mergedTheme = mergeBarLayerTheme(theme);

  const orientation = config.orientation ?? 'vertical';
  const showLabels = config.showLabels ?? false;
  const isVertical = orientation === 'vertical';

  const categoryScale = isVertical ? scales.x : scales.y;
  const valueScale = isVertical ? scales.y : scales.x;

  // Interrupt any running transitions
  bounds.selectAll('.nge-bar-group').interrupt();

  // D3 join pattern - use explicit typing for compatibility
  const groups = bounds
    .selectAll<SVGGElement, NgeBarDataPoint>('.nge-bar-group')
    .data(data, d => d.label);

  const labelFormat = config.labelFormat;

  // Enter
  const enterGroups = enterBars(groups.enter(), {
    categoryScale,
    config,
    data,
    dimensions,
    isVertical,
    labelFormat,
    margins,
    showLabels,
    theme: mergedTheme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  });

  // Update
  updateBars(groups, {
    categoryScale,
    dimensions,
    isVertical,
    labelFormat,
    showLabels,
    theme: mergedTheme,
    valueScale,
  });

  // Exit
  groups.exit().transition().duration(200).style('opacity', 0).remove();

  // Merge for future updates
  const allGroups = enterGroups.merge(groups);

  // Update event handlers on ALL bars (not just entered ones) to handle config changes
  updateBarEventHandlers(allGroups, {
    categoryScale,
    config,
    data,
    dimensions,
    isVertical,
    margins,
    showLabels,
    theme: mergedTheme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  });

  // Update all label styles directly (handles theme-only changes)
  // Use both .attr() and .style() to ensure SVG text styling applies correctly
  if (showLabels) {
    bounds
      .selectAll<SVGTextElement, NgeBarDataPoint>('.nge-bar-label')
      .attr('fill', d => d.labelColor ?? mergedTheme.label.color)
      .attr('font-size', mergedTheme.label.fontSize)
      .attr('font-weight', mergedTheme.label.fontWeight);
  }

  // Render statistical lines if enabled
  if (config.showMeanLine || config.showMedianLine) {
    renderStatisticalLines(bounds, data, dimensions, valueScale, isVertical, config, mergedTheme);
  } else {
    // Clean up statistical lines if not enabled
    bounds.select('.nge-bar-mean-line').remove();
    bounds.select('.nge-bar-mean-label').remove();
    bounds.select('.nge-bar-median-line').remove();
    bounds.select('.nge-bar-median-label').remove();
  }
}

interface BarRenderParams {
  categoryScale: any;
  config?: NgeBarLayerConfig;
  data?: NgeBarDataPoint[];
  dimensions: NgeChartLayerContext<any, any, any>['dimensions'];
  isVertical: boolean;
  labelFormat?: (value: number) => string;
  margins?: { bottom: number; left: number; right: number; top: number };
  showLabels: boolean;
  theme: ResolvedNgeBarLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeBarDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: any;
}

function enterBars(
  enter: Selection<EnterElement, NgeBarDataPoint, SVGGElement, unknown>,
  params: BarRenderParams
): Selection<SVGGElement, NgeBarDataPoint, SVGGElement, unknown> {
  const {
    categoryScale,
    config,
    data,
    dimensions,
    isVertical,
    labelFormat,
    margins: marginsParam,
    showLabels,
    theme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  } = params;

  // Default margins for tooltip calculations
  const margins = marginsParam ?? { bottom: 25, left: 45, right: 15, top: 15 };

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  const barGroup = enter
    .append('g')
    .classed('nge-bar-group', true)
    .style('cursor', config?.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Click handler
  if (config?.onClick) {
    barGroup.on('click', function (event: PointerEvent, d: NgeBarDataPoint) {
      const index = data?.indexOf(d) ?? -1;
      config.onClick!({ data: d, event, index });
    });
  }

  // Helper to compute tooltip event
  const computeTooltipEvent = (
    event: PointerEvent,
    d: NgeBarDataPoint,
    element: SVGGElement
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    // Get bar position
    let barCenterX: number;
    let barTopY: number;

    if (isVertical) {
      barCenterX = (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2;
      barTopY = valueScale(d.value);
    } else {
      barCenterX = valueScale(d.value);
      barTopY = (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2;
    }

    // Get mouse Y relative to bounds (for follow-mouse mode)
    let mouseY = barTopY;
    const boundsNode = select(element.parentNode as SVGGElement).node();
    const point = boundsNode?.ownerSVGElement?.createSVGPoint();
    if (point && boundsNode) {
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = boundsNode.getScreenCTM();
      if (ctm) {
        const transformed = point.matrixTransform(ctm.inverse());
        mouseY = transformed.y;
      }
    }

    // Calculate tooltip position
    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    // X position: centered on bar, clamped to container bounds
    const containerWidth = dimensions.boundedWidth + margins.left + margins.right;
    let tooltipX = margins.left + barCenterX - tooltipWidth / 2;
    const minX = 0;
    const maxX = containerWidth - tooltipWidth;
    tooltipX = Math.max(minX, Math.min(maxX, tooltipX));

    // Y position based on strategy
    let tooltipY: number;
    switch (tooltipConfig.position) {
      case 'above':
        tooltipY = margins.top + barTopY - tooltipHeight - 10;
        break;
      case 'below':
        tooltipY = margins.top + dimensions.boundedHeight + 10;
        break;
      case 'follow-mouse':
      default:
        tooltipY = margins.top + mouseY - tooltipHeight - 10;
        break;
    }

    // Calculate divot position (centered, adjusted for clamping)
    const divotWidth = 24;
    const baseDivotX = (tooltipWidth - divotWidth) / 2;
    const idealCenterX = margins.left + barCenterX;
    const tooltipCenterX = tooltipX + tooltipWidth / 2;
    const clampOffset = idealCenterX - tooltipCenterX;
    const divotX = baseDivotX + clampOffset;

    // Determine divot position based on tooltip position
    // 'below' means tooltip is below the element, so divot should be on top
    const divotPosition: 'bottom' | 'top' = tooltipConfig.position === 'below' ? 'top' : 'bottom';

    // Get formatted content
    const content = tooltipConfig.formatContent(d);

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition,
      position: { divotX, x: tooltipX, y: tooltipY },
      style: tooltipConfig.style,
      visible: true,
    };
  };

  // Hover handlers with theme colors and tooltip support
  barGroup
    .on('mouseenter', function (event: PointerEvent, d: NgeBarDataPoint) {
      const barEl = select(this).select('.nge-bar');
      if (d.color) {
        barEl.style('opacity', 0.8);
      } else {
        barEl.style('fill', theme.bar.hoverColor);
      }

      // Emit tooltip event
      if (tooltipEnabled) {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mousemove', function (event: PointerEvent, d: NgeBarDataPoint) {
      // Update tooltip position on mouse move (for follow-mouse mode)
      if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mouseleave', function (_event: PointerEvent, d: NgeBarDataPoint) {
      const barEl = select(this).select('.nge-bar');
      barEl.style('opacity', 1);
      if (!d.color) {
        barEl.style('fill', theme.bar.color);
      }

      // Hide tooltip
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      }
    });

  // Bar rect with theme styles
  if (isVertical) {
    barGroup
      .append('rect')
      .classed('nge-bar', true)
      .attr('x', d => categoryScale(d.label) ?? 0)
      .attr('width', categoryScale.bandwidth())
      .attr('y', dimensions.boundedHeight)
      .attr('height', 0)
      .attr('rx', theme.bar.radius)
      .attr('ry', theme.bar.radius)
      .style('fill', d => d.color ?? theme.bar.color)
      .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out')
      .transition()
      .duration(300)
      .attr('y', d => valueScale(d.value))
      .attr('height', d => dimensions.boundedHeight - valueScale(d.value));
  } else {
    // For horizontal bars, calculate zero point for proper negative value handling
    const zeroX = valueScale(0);
    barGroup
      .append('rect')
      .classed('nge-bar', true)
      .attr('x', zeroX)
      .attr('width', 0)
      .attr('y', d => categoryScale(d.label) ?? 0)
      .attr('height', categoryScale.bandwidth())
      .attr('rx', theme.bar.radius)
      .attr('ry', theme.bar.radius)
      .style('fill', d => d.color ?? theme.bar.color)
      .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out')
      .transition()
      .duration(300)
      .attr('x', d => (d.value >= 0 ? zeroX : valueScale(d.value)))
      .attr('width', d => Math.abs(valueScale(d.value) - zeroX));
  }

  // Value labels with theme styles
  if (showLabels) {
    if (isVertical) {
      barGroup
        .append('text')
        .classed('nge-bar-label', true)
        .attr('x', d => (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2)
        .attr('y', d => valueScale(d.value) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .style('pointer-events', 'none')
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)));
    } else {
      barGroup
        .append('text')
        .classed('nge-bar-label', true)
        .attr('x', d => valueScale(d.value) + 6)
        .attr('y', d => (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .style('pointer-events', 'none')
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)));
    }
  }

  return barGroup;
}

function updateBars(
  update: Selection<SVGGElement, NgeBarDataPoint, SVGGElement, unknown>,
  params: Omit<BarRenderParams, 'config' | 'data'>
): Selection<SVGGElement, NgeBarDataPoint, SVGGElement, unknown> {
  const { categoryScale, dimensions, isVertical, labelFormat, showLabels, theme, valueScale } =
    params;

  // Update all position attributes regardless of orientation to handle orientation changes
  if (isVertical) {
    update
      .select('.nge-bar')
      .attr('rx', theme.bar.radius)
      .attr('ry', theme.bar.radius)
      .style('fill', d => d.color ?? theme.bar.color)
      .transition()
      .duration(300)
      .attr('x', d => categoryScale(d.label) ?? 0)
      .attr('width', categoryScale.bandwidth())
      .attr('y', d => valueScale(d.value))
      .attr('height', d => dimensions.boundedHeight - valueScale(d.value));
  } else {
    // For horizontal bars, calculate zero point for proper negative value handling
    const zeroX = valueScale(0);
    update
      .select('.nge-bar')
      .attr('rx', theme.bar.radius)
      .attr('ry', theme.bar.radius)
      .style('fill', d => d.color ?? theme.bar.color)
      .transition()
      .duration(300)
      .attr('x', d => (d.value >= 0 ? zeroX : valueScale(d.value)))
      .attr('y', d => categoryScale(d.label) ?? 0)
      .attr('height', categoryScale.bandwidth())
      .attr('width', d => Math.abs(valueScale(d.value) - zeroX));
  }

  if (showLabels) {
    // Update label styles and positions with animation
    if (isVertical) {
      update
        .select('.nge-bar-label')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', null)
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)))
        .transition()
        .duration(300)
        .attr('x', d => (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2)
        .attr('y', d => valueScale(d.value) - 6);
    } else {
      update
        .select('.nge-bar-label')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .attr('text-anchor', null)
        .attr('dominant-baseline', 'middle')
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)))
        .transition()
        .duration(300)
        .attr('x', d => valueScale(d.value) + 6)
        .attr('y', d => (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2);
    }
  }

  return update;
}

/**
 * Update event handlers on all bar groups to handle config changes.
 * This ensures tooltip config changes take effect without requiring a full re-render.
 */
function updateBarEventHandlers(
  groups: Selection<SVGGElement, NgeBarDataPoint, SVGGElement, unknown>,
  params: BarRenderParams
): void {
  const {
    categoryScale,
    config,
    data,
    dimensions,
    isVertical,
    margins: marginsParam,
    theme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  } = params;

  // Default margins for tooltip calculations
  const margins = marginsParam ?? { bottom: 25, left: 45, right: 15, top: 15 };

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Helper to compute tooltip event
  const computeTooltipEvent = (
    event: PointerEvent,
    d: NgeBarDataPoint,
    element: SVGGElement
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    // Get bar position
    let barCenterX: number;
    let barTopY: number;

    if (isVertical) {
      barCenterX = (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2;
      barTopY = valueScale(d.value);
    } else {
      barCenterX = valueScale(d.value);
      barTopY = (categoryScale(d.label) ?? 0) + categoryScale.bandwidth() / 2;
    }

    // Get mouse Y relative to bounds (for follow-mouse mode)
    let mouseY = barTopY;
    const boundsNode = select(element.parentNode as SVGGElement).node();
    const point = boundsNode?.ownerSVGElement?.createSVGPoint();
    if (point && boundsNode) {
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = boundsNode.getScreenCTM();
      if (ctm) {
        const transformed = point.matrixTransform(ctm.inverse());
        mouseY = transformed.y;
      }
    }

    // Calculate tooltip position
    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    // X position: centered on bar, clamped to container bounds
    const containerWidth = dimensions.boundedWidth + margins.left + margins.right;
    let tooltipX = margins.left + barCenterX - tooltipWidth / 2;
    const minX = 0;
    const maxX = containerWidth - tooltipWidth;
    tooltipX = Math.max(minX, Math.min(maxX, tooltipX));

    // Y position based on strategy
    let tooltipY: number;
    switch (tooltipConfig.position) {
      case 'above':
        tooltipY = margins.top + barTopY - tooltipHeight - 10;
        break;
      case 'below':
        tooltipY = margins.top + dimensions.boundedHeight + 10;
        break;
      case 'follow-mouse':
      default:
        tooltipY = margins.top + mouseY - tooltipHeight - 10;
        break;
    }

    // Calculate divot position (centered, adjusted for clamping)
    const divotWidth = 24;
    const baseDivotX = (tooltipWidth - divotWidth) / 2;
    const idealCenterX = margins.left + barCenterX;
    const tooltipCenterX = tooltipX + tooltipWidth / 2;
    const clampOffset = idealCenterX - tooltipCenterX;
    const divotX = baseDivotX + clampOffset;

    // Determine divot position based on tooltip position
    const divotPosition: 'bottom' | 'top' = tooltipConfig.position === 'below' ? 'top' : 'bottom';

    // Get formatted content
    const content = tooltipConfig.formatContent(d);

    // Merge bar color as border color with existing style
    const barColor = d.color ?? theme.bar.color;
    const mergedStyle = {
      ...tooltipConfig.style,
      borderColor: tooltipConfig.style?.borderColor ?? barColor,
    };

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition,
      position: { divotX, x: tooltipX, y: tooltipY },
      style: mergedStyle,
      visible: true,
    };
  };

  // Update cursor style
  groups.style('cursor', config?.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Re-attach event handlers with current config
  groups
    .on('mouseenter', function (event: PointerEvent, d: NgeBarDataPoint) {
      const barEl = select(this).select('.nge-bar');
      if (d.color) {
        barEl.style('opacity', 0.8);
      } else {
        barEl.style('fill', theme.bar.hoverColor);
      }

      // Emit tooltip event
      if (tooltipEnabled) {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mousemove', function (event: PointerEvent, d: NgeBarDataPoint) {
      // Update tooltip position on mouse move (for follow-mouse mode)
      if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mouseleave', function (_event: PointerEvent, d: NgeBarDataPoint) {
      const barEl = select(this).select('.nge-bar');
      barEl.style('opacity', 1);
      if (!d.color) {
        barEl.style('fill', theme.bar.color);
      }

      // Hide tooltip
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      }
    });

  // Update click handler
  if (config?.onClick) {
    groups.on('click', function (event: PointerEvent, d: NgeBarDataPoint) {
      const index = data?.indexOf(d) ?? -1;
      config.onClick!({ data: d, event, index });
    });
  } else {
    groups.on('click', null);
  }
}

function renderStatisticalLines(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  data: NgeBarDataPoint[],
  dimensions: { boundedHeight: number; boundedWidth: number },

  valueScale: any,
  isVertical: boolean,
  config: NgeBarLayerConfig,
  theme: ResolvedNgeBarLayerTheme
): void {
  const values = data.map(d => d.value);
  if (values.length === 0) return;

  // Calculate both values first to detect overlap
  let mean: null | number = null;
  let median: null | number = null;

  if (config.showMeanLine) {
    mean = values.reduce((a, b) => a + b, 0) / values.length;
  }

  if (config.showMedianLine) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Calculate label offset to prevent overlap
  const minLabelDistance = theme.statistical.labelFontSize * 1.5;
  let meanLabelOffset = 0;
  let medianLabelOffset = 0;

  if (mean !== null && median !== null) {
    const meanPos = valueScale(mean);
    const medianPos = valueScale(median);
    const distance = Math.abs(meanPos - medianPos);

    if (distance < minLabelDistance) {
      const offset = (minLabelDistance - distance) / 2 + 2;
      // In vertical charts, lower value = higher y position (inverted scale)
      // In horizontal charts, lower value = lower x position
      if (isVertical) {
        if (mean > median) {
          meanLabelOffset = -offset;
          medianLabelOffset = offset;
        } else {
          meanLabelOffset = offset;
          medianLabelOffset = -offset;
        }
      } else {
        if (mean > median) {
          meanLabelOffset = offset;
          medianLabelOffset = -offset;
        } else {
          meanLabelOffset = -offset;
          medianLabelOffset = offset;
        }
      }
    }
  }

  // Mean line
  if (mean !== null) {
    renderStatLine(bounds, 'mean', mean, dimensions, valueScale, isVertical, {
      color: theme.statistical.meanLineColor,
      dash: theme.statistical.meanLineDash,
      labelColor: theme.statistical.labelColor,
      labelFontSize: theme.statistical.labelFontSize,
      labelFontWeight: theme.statistical.labelFontWeight,
      labelOffset: meanLabelOffset,
      width: theme.statistical.meanLineWidth,
    });
  } else {
    bounds.select('.nge-bar-mean-line').remove();
    bounds.select('.nge-bar-mean-label').remove();
  }

  // Median line
  if (median !== null) {
    renderStatLine(bounds, 'median', median, dimensions, valueScale, isVertical, {
      color: theme.statistical.medianLineColor,
      dash: theme.statistical.medianLineDash,
      labelColor: theme.statistical.labelColor,
      labelFontSize: theme.statistical.labelFontSize,
      labelFontWeight: theme.statistical.labelFontWeight,
      labelOffset: medianLabelOffset,
      width: theme.statistical.medianLineWidth,
    });
  } else {
    bounds.select('.nge-bar-median-line').remove();
    bounds.select('.nge-bar-median-label').remove();
  }
}

interface StatLineStyle {
  color: string;
  dash: string;
  labelColor: string;
  labelFontSize: number;
  labelFontWeight: number;
  labelOffset: number;
  width: number;
}

function renderStatLine(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  type: 'mean' | 'median',
  value: number,
  dimensions: { boundedHeight: number; boundedWidth: number },

  valueScale: any,
  isVertical: boolean,
  style: StatLineStyle
): void {
  const lineClass = `nge-bar-${type}-line`;
  const labelClass = `nge-bar-${type}-label`;
  const labelPrefix = type === 'mean' ? 'μ' : 'M';

  let line = bounds.select<SVGLineElement>(`.${lineClass}`);
  let label = bounds.select<SVGTextElement>(`.${labelClass}`);

  if (line.empty()) {
    line = bounds.append('line').classed(lineClass, true);
  }
  if (label.empty()) {
    label = bounds.append('text').classed(labelClass, true);
  }

  line
    .style('stroke', style.color)
    .style('stroke-width', `${style.width}px`)
    .style('stroke-dasharray', style.dash)
    .style('pointer-events', 'none');

  label
    .style('fill', style.labelColor)
    .style('font-size', `${style.labelFontSize}px`)
    .style('font-weight', style.labelFontWeight)
    .style('pointer-events', 'none')
    .text(`${labelPrefix} ${value.toFixed(1)}`);

  if (isVertical) {
    line
      .attr('x1', 0)
      .attr('x2', dimensions.boundedWidth)
      .attr('y1', valueScale(value))
      .attr('y2', valueScale(value));
    label
      .attr('x', dimensions.boundedWidth + 4)
      .attr('y', valueScale(value) + style.labelOffset)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'start');
  } else {
    line
      .attr('x1', valueScale(value))
      .attr('x2', valueScale(value))
      .attr('y1', 0)
      .attr('y2', dimensions.boundedHeight);
    label
      .attr('x', valueScale(value) + style.labelOffset)
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto');
  }
}
