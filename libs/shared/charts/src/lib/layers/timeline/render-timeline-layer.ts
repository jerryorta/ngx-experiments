import type { ScaleBand, ScaleTime } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';
import 'd3-transition';

import type { NgeTimelineDataPoint, NgeTimelineLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTimelineLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeTimelineLayerTheme } from '../../core/theme';

/** Coerce a timeline time value (`Date` | epoch-ms `number` | date `string`) to a `Date`. */
function toDate(value: Date | number | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Stable join key for a timeline item (explicit `id`, else derived from row + span). */
function itemKey(d: NgeTimelineDataPoint): string {
  return d.id ?? `${d.rowId}:${toDate(d.start).getTime()}:${toDate(d.end).getTime()}`;
}

/** SVG path for a diamond (rotated square) centred at the origin with half-diagonal `size`. */
function diamondPath(size: number): string {
  return `M0,${-size}L${size},0L0,${size}L${-size},0Z`;
}

/**
 * Render the timeline / Gantt layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Draws one `rect.nge-timeline-bar` per non-milestone item spanning `x(start)`→
 * `x(end)` on the time x-scale, seated on its `rowId` band; items flagged `milestone`
 * render as a `path.nge-timeline-milestone` diamond at `x(start)`. Both are reconciled
 * with a keyed enter/update/exit join and every transition is driven off
 * `context.animation` (never a hardcoded duration).
 */
export function renderTimelineLayer(
  context: NgeChartLayerContext<
    NgeTimelineDataPoint,
    NgeTimelineLayerConfig,
    NgeTimelineLayerTheme | undefined
  >
): void {
  const {
    animation,
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

  if (!bounds || !Array.isArray(data)) {
    return;
  }

  const t = mergeTimelineLayerTheme(theme);
  const xScale = scales.x as ScaleTime<number, number>;
  const yScale = scales.y as ScaleBand<string>;

  const showLabels = config.showLabels ?? false;
  const showMilestones = config.showMilestones !== false;
  const barRadius = config.barRadius ?? t.bar.radius;
  const milestoneSize = config.milestoneSize ?? t.milestone.size;
  const labelFormat = config.labelFormat;
  const bandwidth = yScale.bandwidth();

  const spans = data.filter(d => !d.milestone);
  const milestones = showMilestones ? data.filter(d => d.milestone) : [];

  const spanX = (d: NgeTimelineDataPoint): number => xScale(toDate(d.start));
  const spanWidth = (d: NgeTimelineDataPoint): number =>
    Math.max(0, xScale(toDate(d.end)) - xScale(toDate(d.start)));
  const rowY = (d: NgeTimelineDataPoint): number => yScale(d.rowId) ?? 0;
  const labelText = (d: NgeTimelineDataPoint): string =>
    labelFormat ? labelFormat(d) : (d.label ?? '');

  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);

  // Build a tooltip event anchored on a span's centre (or a milestone's point).
  const computeTooltipEvent = (
    event: PointerEvent,
    d: NgeTimelineDataPoint,
    element: SVGElement
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const anchorX = d.milestone ? spanX(d) : spanX(d) + spanWidth(d) / 2;
    const anchorY = rowY(d) + bandwidth / 2;

    // Mouse Y relative to bounds (follow-mouse mode).
    let mouseY = anchorY;
    const boundsNode = select(element.parentNode as SVGGElement).node();
    const point = boundsNode?.ownerSVGElement?.createSVGPoint();
    if (point && boundsNode) {
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = boundsNode.getScreenCTM();
      if (ctm) {
        mouseY = point.matrixTransform(ctm.inverse()).y;
      }
    }

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    // X: centred on the mark, clamped to the container.
    const containerWidth = dimensions.boundedWidth + margins.left + margins.right;
    let tooltipX = margins.left + anchorX - tooltipWidth / 2;
    tooltipX = Math.max(0, Math.min(containerWidth - tooltipWidth, tooltipX));

    let tooltipY: number;
    switch (tooltipConfig.position) {
      case 'above':
        tooltipY = margins.top + anchorY - tooltipHeight - 10;
        break;
      case 'below':
        tooltipY = margins.top + dimensions.boundedHeight + 10;
        break;
      case 'follow-mouse':
      default:
        tooltipY = margins.top + mouseY - tooltipHeight - 10;
        break;
    }

    // Divot centred on the mark, adjusted for any clamp shift.
    const divotWidth = 24;
    const baseDivotX = (tooltipWidth - divotWidth) / 2;
    const idealCenterX = margins.left + anchorX;
    const tooltipCenterX = tooltipX + tooltipWidth / 2;
    const divotX = baseDivotX + (idealCenterX - tooltipCenterX);

    const divotPosition: 'bottom' | 'top' = tooltipConfig.position === 'below' ? 'top' : 'bottom';
    const markColor = d.color ?? (d.milestone ? t.milestone.color : t.bar.color);

    return {
      content: tooltipConfig.formatContent(d),
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition,
      position: { divotX, x: tooltipX, y: tooltipY },
      style: { ...tooltipConfig.style, borderColor: tooltipConfig.style?.borderColor ?? markColor },
      visible: true,
    };
  };

  const emitHide = (): void => {
    if (!tooltipEnabled) return;
    tooltipHandlers!.onTooltip({
      content: { label: '', value: '' },
      dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
      divotPosition: 'bottom',
      position: { divotX: 0, x: 0, y: 0 },
      visible: false,
    });
  };

  // Re-bind interaction handlers on every span group (enter + update) so tooltip /
  // click config changes take effect without a full re-render.
  const attachSpanInteractions = (
    sel: Selection<SVGGElement, NgeTimelineDataPoint, SVGGElement, unknown>
  ): void => {
    sel.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');
    sel
      .on('mouseenter', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        const barEl = select(this).select('.nge-timeline-bar');
        if (d.color) {
          barEl.style('opacity', 0.8);
        } else {
          barEl.style('fill', t.bar.hoverColor);
        }
        if (tooltipEnabled) {
          const evt = computeTooltipEvent(event, d, this);
          if (evt) tooltipHandlers!.onTooltip(evt);
        }
      })
      .on('mousemove', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
          const evt = computeTooltipEvent(event, d, this);
          if (evt) tooltipHandlers!.onTooltip(evt);
        }
      })
      .on('mouseleave', function (_event: PointerEvent, d: NgeTimelineDataPoint) {
        const barEl = select(this).select('.nge-timeline-bar');
        barEl.style('opacity', t.bar.opacity);
        if (!d.color) {
          barEl.style('fill', t.bar.color);
        }
        emitHide();
      });
    if (config.onClick) {
      sel.on('click', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        config.onClick!({ data: d, event, index: data.indexOf(d) });
      });
    } else {
      sel.on('click', null);
    }
  };

  const attachMilestoneInteractions = (
    sel: Selection<SVGPathElement, NgeTimelineDataPoint, SVGGElement, unknown>
  ): void => {
    sel.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');
    sel
      .on('mouseenter', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        select(this).style('opacity', 0.8);
        if (tooltipEnabled) {
          const evt = computeTooltipEvent(event, d, this);
          if (evt) tooltipHandlers!.onTooltip(evt);
        }
      })
      .on('mousemove', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
          const evt = computeTooltipEvent(event, d, this);
          if (evt) tooltipHandlers!.onTooltip(evt);
        }
      })
      .on('mouseleave', function () {
        select(this).style('opacity', 1);
        emitHide();
      });
    if (config.onClick) {
      sel.on('click', function (event: PointerEvent, d: NgeTimelineDataPoint) {
        config.onClick!({ data: d, event, index: data.indexOf(d) });
      });
    } else {
      sel.on('click', null);
    }
  };

  // ============================ SPAN BARS ============================
  bounds.selectAll('.nge-timeline-group').interrupt();

  const groups = bounds
    .selectAll<SVGGElement, NgeTimelineDataPoint>('.nge-timeline-group')
    .data(spans, itemKey);

  const enterGroups = groups.enter().append('g').classed('nge-timeline-group', true);

  enterGroups
    .append('rect')
    .classed('nge-timeline-bar', true)
    .attr('x', spanX)
    .attr('y', rowY)
    .attr('width', 0)
    .attr('height', bandwidth)
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .style('fill', d => d.color ?? t.bar.color)
    .style('opacity', t.bar.opacity)
    .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out')
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .attr('width', spanWidth);

  if (showLabels) {
    enterGroups
      .append('text')
      .classed('nge-timeline-label', true)
      .attr('x', d => spanX(d) + 6)
      .attr('y', d => rowY(d) + bandwidth / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', t.label.color)
      .attr('font-size', t.label.fontSize)
      .attr('font-weight', t.label.fontWeight)
      .style('pointer-events', 'none')
      .text(labelText);
  }

  groups
    .select<SVGRectElement>('.nge-timeline-bar')
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .style('fill', d => d.color ?? t.bar.color)
    .style('opacity', t.bar.opacity)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', spanX)
    .attr('y', rowY)
    .attr('width', spanWidth)
    .attr('height', bandwidth);

  if (showLabels) {
    groups
      .select<SVGTextElement>('.nge-timeline-label')
      .attr('fill', t.label.color)
      .attr('font-size', t.label.fontSize)
      .attr('font-weight', t.label.fontWeight)
      .text(labelText)
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', d => spanX(d) + 6)
      .attr('y', d => rowY(d) + bandwidth / 2);
  } else {
    groups.select('.nge-timeline-label').remove();
  }

  groups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  attachSpanInteractions(enterGroups.merge(groups));

  // ============================ MILESTONES ============================
  bounds.selectAll('.nge-timeline-milestone').interrupt();

  const msMarks = bounds
    .selectAll<SVGPathElement, NgeTimelineDataPoint>('.nge-timeline-milestone')
    .data(milestones, itemKey);

  const enterMs = msMarks
    .enter()
    .append('path')
    .classed('nge-timeline-milestone', true)
    .attr('d', diamondPath(milestoneSize))
    .attr('transform', d => `translate(${spanX(d)},${rowY(d) + bandwidth / 2})`)
    .style('fill', d => d.color ?? t.milestone.color)
    .style('stroke', t.milestone.stroke)
    .style('stroke-width', t.milestone.strokeWidth)
    .style('opacity', 0)
    .style('transition', 'fill 0.15s ease-in-out, opacity 0.15s ease-in-out');

  enterMs.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  msMarks
    .attr('d', diamondPath(milestoneSize))
    .style('fill', d => d.color ?? t.milestone.color)
    .style('stroke', t.milestone.stroke)
    .style('stroke-width', t.milestone.strokeWidth)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('transform', d => `translate(${spanX(d)},${rowY(d) + bandwidth / 2})`);

  msMarks
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  attachMilestoneInteractions(enterMs.merge(msMarks));
}
