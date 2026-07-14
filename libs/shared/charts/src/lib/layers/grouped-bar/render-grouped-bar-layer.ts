import type { Selection } from 'd3-selection';

import { scaleBand } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';

import type { NgeGroupedBarDataPoint, NgeGroupedBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeGroupedBarLayerTheme, ResolvedNgeGroupedBarLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';

import { mergeGroupedBarLayerTheme } from '../../core/theme';

/**
 * Internal params shared between enter/update helpers.
 */
interface GroupedBarRenderParams {
  animationMs: number;
  barPadding: number;
  /** Data grouped by label (category). Each entry: [label, dataPoints[]] */
  categoryData: Map<string, NgeGroupedBarDataPoint[]>;
  config?: NgeGroupedBarLayerConfig;
  data?: NgeGroupedBarDataPoint[];
  dimensions: NgeChartLayerContext<any, any, any>['dimensions'];
  innerScale: ReturnType<typeof scaleBand<string>>;
  isVertical: boolean;
  labelFormat?: (value: number) => string;
  margins?: { bottom: number; left: number; right: number; top: number };
  outerScale: any;
  showLabels: boolean;
  theme: ResolvedNgeGroupedBarLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeGroupedBarDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: any;
}

/**
 * Render grouped bar layer into the provided bounds with theme support.
 *
 * Categories (label) are on the axis; series (groupId) are side-by-side bars
 * within each category. E.g., X axis shows "Avg $/sqft", "Min", "Max" and
 * each has Active + Closed bars next to each other.
 */
export function renderGroupedBarLayer(
  context: NgeChartLayerContext<
    NgeGroupedBarDataPoint,
    NgeGroupedBarLayerConfig,
    NgeGroupedBarLayerTheme | undefined
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

  const mergedTheme = mergeGroupedBarLayerTheme(theme);

  const orientation = config.orientation ?? 'vertical';
  const showLabels = config.showLabels ?? false;
  const isVertical = orientation === 'vertical';
  const barPadding = config.barPadding ?? 0.05;
  const labelFormat = config.labelFormat;
  const animationMs = config.animationMs ?? 300;

  const outerScale = isVertical ? scales.x : scales.y;
  const valueScale = isVertical ? scales.y : scales.x;

  // Group data by label (category) — each category gets a cluster of bars
  const categoryData = new Map<string, NgeGroupedBarDataPoint[]>();
  for (const d of data) {
    const existing = categoryData.get(d.label);
    if (existing) {
      existing.push(d);
    } else {
      categoryData.set(d.label, [d]);
    }
  }

  // Compute unique groupIds (series) — these become the inner bars
  const uniqueGroupIds: string[] = [];
  for (const d of data) {
    if (!uniqueGroupIds.includes(d.groupId)) {
      uniqueGroupIds.push(d.groupId);
    }
  }

  // Inner scale: series bars within each category
  const innerScale = scaleBand<string>()
    .domain(uniqueGroupIds)
    .range([0, (outerScale as any).bandwidth()])
    .padding(barPadding);

  // Interrupt running transitions
  bounds.selectAll('.nge-grouped-bar-group').interrupt();

  const categoryEntries = Array.from(categoryData.entries());

  // D3 join on category containers
  const groups = bounds
    .selectAll<SVGGElement, [string, NgeGroupedBarDataPoint[]]>('.nge-grouped-bar-group')
    .data(categoryEntries, d => d[0]);

  // Enter groups — one <g> per category, translated to outerScale(label)
  const enterGroups = groups
    .enter()
    .append('g')
    .classed('nge-grouped-bar-group', true)
    .attr('transform', d => {
      const pos = (outerScale as any)(d[0]) ?? 0;
      return isVertical ? `translate(${pos}, 0)` : `translate(0, ${pos})`;
    });

  const renderParams: GroupedBarRenderParams = {
    animationMs,
    barPadding,
    categoryData,
    config,
    data,
    dimensions,
    innerScale,
    isVertical,
    labelFormat,
    margins,
    outerScale,
    showLabels,
    theme: mergedTheme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  };

  // Enter bars within groups
  enterGroupedBars(enterGroups, renderParams);

  // Update groups position
  groups
    .transition()
    .duration(300)
    .attr('transform', d => {
      const pos = (outerScale as any)(d[0]) ?? 0;
      return isVertical ? `translate(${pos}, 0)` : `translate(0, ${pos})`;
    });

  // Update bars within existing groups
  updateGroupedBars(groups, renderParams);

  // Exit
  groups.exit().transition().duration(300).style('opacity', 0).remove();

  // Merge enter + update groups for event handler attachment
  const allGroups = enterGroups.merge(groups);

  // Update event handlers on ALL bars (both entered and updated)
  // Follows the same pattern as updateBarEventHandlers in the bar layer
  updateGroupedBarEventHandlers(allGroups, renderParams);
}

/**
 * Append bar rects and optional labels to an enter selection of bar items.
 * Shared between enterGroupedBars and updateGroupedBars to avoid duplication.
 */
function appendGroupedBarElements(
  barEnter: Selection<SVGGElement, NgeGroupedBarDataPoint, SVGGElement, unknown>,
  params: {
    animationMs: number;
    barRadius: number;
    dimensions: GroupedBarRenderParams['dimensions'];
    innerScale: GroupedBarRenderParams['innerScale'];
    isVertical: boolean;
    labelFormat?: (value: number) => string;
    showLabels: boolean;
    theme: ResolvedNgeGroupedBarLayerTheme;
    valueScale: any;
  }
): void {
  const {
    animationMs,
    barRadius,
    dimensions,
    innerScale,
    isVertical,
    labelFormat,
    showLabels,
    theme,
    valueScale,
  } = params;

  if (isVertical) {
    barEnter
      .append('rect')
      .classed('nge-grouped-bar-rect', true)
      .attr('x', d => innerScale(d.groupId) ?? 0)
      .attr('width', innerScale.bandwidth())
      .attr('y', dimensions.boundedHeight)
      .attr('height', 0)
      .attr('rx', barRadius)
      .attr('ry', barRadius)
      .style('fill', d => d.color ?? theme.bar.color)
      .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out')
      .transition()
      .duration(animationMs)
      .attr('y', d => valueScale(d.value))
      .attr('height', d => dimensions.boundedHeight - valueScale(d.value));
  } else {
    const zeroX = valueScale(0);
    barEnter
      .append('rect')
      .classed('nge-grouped-bar-rect', true)
      .attr('x', zeroX)
      .attr('width', 0)
      .attr('y', d => innerScale(d.groupId) ?? 0)
      .attr('height', innerScale.bandwidth())
      .attr('rx', barRadius)
      .attr('ry', barRadius)
      .style('fill', d => d.color ?? theme.bar.color)
      .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out')
      .transition()
      .duration(animationMs)
      .attr('x', d => (d.value >= 0 ? zeroX : valueScale(d.value)))
      .attr('width', d => Math.abs(valueScale(d.value) - zeroX));
  }

  if (showLabels) {
    if (isVertical) {
      barEnter
        .append('text')
        .classed('nge-grouped-bar-label', true)
        .attr('x', d => (innerScale(d.groupId) ?? 0) + innerScale.bandwidth() / 2)
        .attr('y', d => valueScale(d.value) - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .style('pointer-events', 'none')
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)));
    } else {
      barEnter
        .append('text')
        .classed('nge-grouped-bar-label', true)
        .attr('x', d => valueScale(d.value) + 4)
        .attr('y', d => (innerScale(d.groupId) ?? 0) + innerScale.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', d => d.labelColor ?? theme.label.color)
        .attr('font-size', theme.label.fontSize)
        .attr('font-weight', theme.label.fontWeight)
        .style('pointer-events', 'none')
        .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)));
    }
  }
}

function enterGroupedBars(
  groupSelection: Selection<SVGGElement, [string, NgeGroupedBarDataPoint[]], SVGGElement, unknown>,
  params: GroupedBarRenderParams
): void {
  const {
    animationMs,
    config,
    dimensions,
    innerScale,
    isVertical,
    labelFormat,
    showLabels,
    theme,
    valueScale,
  } = params;

  const barRadius = config?.barRadius ?? theme.bar.radius;

  groupSelection.each(function ([_label, categoryPoints]) {
    const groupG = select(this);

    // Join bars within this category — keyed by groupId (series)
    const bars = groupG
      .selectAll<SVGGElement, NgeGroupedBarDataPoint>('.nge-grouped-bar-item')
      .data(categoryPoints, d => d.groupId);

    const barEnter = bars.enter().append('g').classed('nge-grouped-bar-item', true);

    // Render bar rects and labels
    appendGroupedBarElements(barEnter, {
      animationMs,
      barRadius,
      dimensions,
      innerScale,
      isVertical,
      labelFormat,
      showLabels,
      theme,
      valueScale,
    });
  });
}

function updateGroupedBars(
  groupSelection: Selection<SVGGElement, [string, NgeGroupedBarDataPoint[]], SVGGElement, unknown>,
  params: GroupedBarRenderParams
): void {
  const {
    animationMs,
    dimensions,
    innerScale,
    isVertical,
    labelFormat,
    showLabels,
    theme,
    valueScale,
  } = params;
  const barRadius = theme.bar.radius;

  groupSelection.each(function ([_label, categoryPoints]) {
    const groupG = select(this);

    const bars = groupG
      .selectAll<SVGGElement, NgeGroupedBarDataPoint>('.nge-grouped-bar-item')
      .data(categoryPoints, d => d.groupId);

    // Enter new bars (e.g., Closed group appearing after initial Active-only render)
    const barEnter = bars.enter().append('g').classed('nge-grouped-bar-item', true);

    // Render bar rects and labels using shared helper
    appendGroupedBarElements(barEnter, {
      animationMs,
      barRadius,
      dimensions,
      innerScale,
      isVertical,
      labelFormat,
      showLabels,
      theme,
      valueScale,
    });

    // Update existing bar rects — positioned by innerScale(groupId)
    if (isVertical) {
      bars
        .select('.nge-grouped-bar-rect')
        .attr('rx', barRadius)
        .attr('ry', barRadius)
        .style('fill', d => d.color ?? theme.bar.color)
        .transition()
        .duration(animationMs)
        .attr('x', d => innerScale(d.groupId) ?? 0)
        .attr('width', innerScale.bandwidth())
        .attr('y', d => valueScale(d.value))
        .attr('height', d => dimensions.boundedHeight - valueScale(d.value));
    } else {
      const zeroX = valueScale(0);
      bars
        .select('.nge-grouped-bar-rect')
        .attr('rx', barRadius)
        .attr('ry', barRadius)
        .style('fill', d => d.color ?? theme.bar.color)
        .transition()
        .duration(animationMs)
        .attr('x', d => (d.value >= 0 ? zeroX : valueScale(d.value)))
        .attr('y', d => innerScale(d.groupId) ?? 0)
        .attr('height', innerScale.bandwidth())
        .attr('width', d => Math.abs(valueScale(d.value) - zeroX));
    }

    // Update labels — positioned by innerScale(groupId)
    if (showLabels) {
      if (isVertical) {
        bars
          .select('.nge-grouped-bar-label')
          .attr('fill', d => d.labelColor ?? theme.label.color)
          .attr('font-size', theme.label.fontSize)
          .attr('font-weight', theme.label.fontWeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', null)
          .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)))
          .transition()
          .duration(animationMs)
          .attr('x', d => (innerScale(d.groupId) ?? 0) + innerScale.bandwidth() / 2)
          .attr('y', d => valueScale(d.value) - 4);
      } else {
        bars
          .select('.nge-grouped-bar-label')
          .attr('fill', d => d.labelColor ?? theme.label.color)
          .attr('font-size', theme.label.fontSize)
          .attr('font-weight', theme.label.fontWeight)
          .attr('text-anchor', null)
          .attr('dominant-baseline', 'middle')
          .text(d => (labelFormat ? labelFormat(d.value) : String(d.value)))
          .transition()
          .duration(animationMs)
          .attr('x', d => valueScale(d.value) + 4)
          .attr('y', d => (innerScale(d.groupId) ?? 0) + innerScale.bandwidth() / 2);
      }
    }

    // Exit bars
    bars.exit().transition().duration(300).style('opacity', 0).remove();
  });
}

/**
 * Update event handlers on all grouped bar items.
 * Applied to merged enter+update category groups to ensure both newly entered
 * and updated bars get consistent hover, tooltip, and click behavior.
 * Follows the same pattern as updateBarEventHandlers in the bar layer.
 */
function updateGroupedBarEventHandlers(
  allGroups: Selection<SVGGElement, [string, NgeGroupedBarDataPoint[]], SVGGElement, unknown>,
  params: GroupedBarRenderParams
): void {
  const {
    config,
    data,
    dimensions,
    innerScale,
    isVertical,
    margins: marginsParam,
    outerScale,
    theme,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  } = params;

  const margins = marginsParam ?? { bottom: 25, left: 45, right: 15, top: 15 };
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Tooltip helper
  const computeTooltipEvent = (
    event: PointerEvent,
    d: NgeGroupedBarDataPoint,
    element: SVGGElement
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    // Outer position is by label (category), inner position is by groupId (series)
    const categoryPos = (outerScale as any)(d.label) ?? 0;
    const innerPos = innerScale(d.groupId) ?? 0;

    let barCenterX: number;
    let barTopY: number;

    if (isVertical) {
      barCenterX = categoryPos + innerPos + innerScale.bandwidth() / 2;
      barTopY = valueScale(d.value);
    } else {
      barCenterX = valueScale(d.value);
      barTopY = categoryPos + innerPos + innerScale.bandwidth() / 2;
    }

    let mouseY = barTopY;
    const boundsNode = select((element.parentNode as SVGGElement).parentNode as SVGGElement).node();
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

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;
    const containerWidth = dimensions.boundedWidth + margins.left + margins.right;
    let tooltipX = margins.left + barCenterX - tooltipWidth / 2;
    tooltipX = Math.max(0, Math.min(containerWidth - tooltipWidth, tooltipX));

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

    const divotWidth = 24;
    const baseDivotX = (tooltipWidth - divotWidth) / 2;
    const idealCenterX = margins.left + barCenterX;
    const tooltipCenterX = tooltipX + tooltipWidth / 2;
    const clampOffset = idealCenterX - tooltipCenterX;
    const divotX = baseDivotX + clampOffset;
    const divotPosition: 'bottom' | 'top' = tooltipConfig.position === 'below' ? 'top' : 'bottom';

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

  // Select all bar items within all category groups
  const allBars = allGroups.selectAll<SVGGElement, NgeGroupedBarDataPoint>(
    '.nge-grouped-bar-item'
  );

  // Update cursor style
  allBars.style('cursor', config?.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Click handler
  if (config?.onClick) {
    allBars.on('click', function (event: PointerEvent, d: NgeGroupedBarDataPoint) {
      const index = data?.indexOf(d) ?? -1;
      config.onClick!({ data: d, event, index });
    });
  } else {
    allBars.on('click', null);
  }

  // Hover + tooltip handlers
  allBars
    .on('mouseenter', function (event: PointerEvent, d: NgeGroupedBarDataPoint) {
      const barEl = select(this).select('.nge-grouped-bar-rect');
      if (d.color) {
        barEl.style('opacity', 0.8);
      } else {
        barEl.style('fill', theme.bar.hoverColor);
      }

      if (tooltipEnabled) {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mousemove', function (event: PointerEvent, d: NgeGroupedBarDataPoint) {
      if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
        const tooltipEvent = computeTooltipEvent(event, d, this);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mouseleave', function (_event: PointerEvent, d: NgeGroupedBarDataPoint) {
      const barEl = select(this).select('.nge-grouped-bar-rect');
      barEl.style('opacity', 1);
      if (!d.color) {
        barEl.style('fill', theme.bar.color);
      }

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
}
