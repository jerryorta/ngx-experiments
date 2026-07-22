import { interpolateNumber, scaleLinear, select } from 'd3';
import 'd3-transition';

import type { NgeDivergingBarDataPoint, NgeDivergingBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeDivergingBarLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeDivergingBarLayerTheme } from '../../core/theme';

/**
 * Persistent state for diverging bar layer (tracks last value for animation)
 */
let lastValue = 0;

/**
 * Clamp a value to be within min and max range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Render diverging bar chart layer into the provided bounds.
 * Shows a bar that extends from center (0) toward negative (left) or positive (right).
 * Pure function - no side effects outside of D3 DOM manipulation.
 */
export function renderDivergingBarLayer(
  context: NgeChartLayerContext<
    NgeDivergingBarDataPoint,
    NgeDivergingBarLayerConfig,
    NgeDivergingBarLayerTheme | undefined
  >
): void {
  const {
    animation,
    bounds,
    config,
    dimensions,
    margins,
    tooltipConfig,
    tooltipElement,
    tooltipHandlers,
  } = context;

  // Diverging bar data comes from config.data (single object, not array)
  const datum = config.data;

  if (!bounds || !datum) {
    return;
  }

  const { max, min, negativeColor, positiveColor, units = '', value: rawValue } = datum;

  // Clamp value to be within min/max
  const value = clamp(rawValue, min, max);

  // Capture the starting value for animation, then immediately update lastValue
  const animateFromValue = lastValue;
  lastValue = value;

  // Merge theme with defaults
  const theme = mergeDivergingBarLayerTheme(context.theme);

  // Get dimensions from theme or config
  const barHeight = config.barHeight ?? theme.backgroundBar.height;
  const valueIndicatorHeight = config.valueIndicatorHeight ?? theme.valueIndicator.height;
  const valueIndicatorWidth = config.valueIndicatorWidth ?? theme.valueIndicator.width;
  const centerIndicatorHeight = config.centerIndicatorHeight ?? theme.centerIndicator.height;
  const centerIndicatorWidth = config.centerIndicatorWidth ?? theme.centerIndicator.width;
  const limitIndicatorWidth = config.limitIndicatorWidth ?? theme.limitIndicator.width;
  const limitIndicatorHeight = config.limitIndicatorHeight ?? theme.limitIndicator.height;

  // Calculate vertical centering (center everything around the tallest element)
  const maxHeight = Math.max(
    barHeight,
    valueIndicatorHeight,
    centerIndicatorHeight,
    limitIndicatorHeight
  );
  const barY = (maxHeight - barHeight) / 2;
  const valueIndicatorY = (maxHeight - valueIndicatorHeight) / 2;
  const centerIndicatorY = (maxHeight - centerIndicatorHeight) / 2;
  const limitIndicatorY = (maxHeight - limitIndicatorHeight) / 2;

  // Create scale: maps [min, max] to [0, boundedWidth]
  // Center (0) maps to the middle of the chart
  const xScale = scaleLinear().domain([min, max]).range([0, dimensions.boundedWidth]);
  const centerX = xScale(0);

  // Get colors from data or theme
  const posBarColor = positiveColor ?? theme.positiveBar.color;
  const negBarColor = negativeColor ?? theme.negativeBar.color;
  const currentBarColor = value >= 0 ? posBarColor : negBarColor;

  // Interrupt any running transitions
  bounds.selectAll('.nge-diverging-bar-container').interrupt();
  bounds.selectAll('.nge-diverging-bar-value-bar').interrupt();
  bounds.selectAll('.nge-diverging-bar-value-indicator').interrupt();

  // Tooltip helper
  const computeTooltipEvent = (
    event: PointerEvent,
    currentValue: number
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4; // Corner radius of tooltip bubble

    // Value indicator center in container coordinates
    const valueCenterX = margins.left + xScale(currentValue);

    // Tooltip bounds match the chart bounds exactly
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;

    // Ideal tooltip position (centered on value indicator)
    const idealTooltipX = valueCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y position (above the chart)
    const tooltipY = margins.top - tooltipHeight - 10;

    // Where should the divot tip point? (relative to tooltip left edge)
    const targetTipX = valueCenterX - tooltipX;

    // Calculate ideal divot base position (centered on target)
    const idealDivotX = targetTipX - divotWidth / 2;

    // Divot base must stay within tooltip bounds (accounting for rounded corners)
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));

    // If divotX was clamped, offset the tip to still point at the target
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    // Format content
    const content = tooltipConfig.formatContent({
      max,
      min,
      negativeColor,
      positiveColor,
      units,
      value: currentValue,
    });

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
      position: {
        divotTipOffset: Math.round(divotTipOffset),
        divotX: Math.round(divotX),
        x: Math.round(tooltipX),
        y: Math.round(tooltipY),
      },
      style: tooltipConfig.style,
      visible: true,
    };
  };

  // Interpolate value for smooth animation
  function interpolateValue(from: number, to: number, t: number): number {
    const i = interpolateNumber(from, to);
    return parseFloat(i(t).toFixed(2));
  }

  // Calculate bar width and position for a given value
  function getBarGeometry(val: number): { width: number; x: number } {
    if (val >= 0) {
      // Positive: bar goes from center to right
      return {
        width: xScale(val) - centerX,
        x: centerX,
      };
    } else {
      // Negative: bar goes from value position to center
      return {
        width: centerX - xScale(val),
        x: xScale(val),
      };
    }
  }

  const barGeometry = getBarGeometry(value);

  // Check if container exists
  let container = bounds.select<SVGGElement>('.nge-diverging-bar-container');

  if (container.empty()) {
    // Create new container with all elements
    container = bounds.append('g').classed('nge-diverging-bar-container', true);

    // Background bar (full width)
    container
      .append('rect')
      .classed('nge-diverging-bar-background', true)
      .attr('width', dimensions.boundedWidth - limitIndicatorWidth * 2)
      .attr('height', barHeight)
      .attr('y', barY)
      .attr('x', limitIndicatorWidth)
      .style('fill', theme.backgroundBar.color);

    // Value bar (extends from center)
    const initialBarGeom = getBarGeometry(animateFromValue);
    container
      .append('rect')
      .classed('nge-diverging-bar-value-bar', true)
      .attr('height', barHeight)
      .attr('y', barY)
      .attr('x', initialBarGeom.x)
      .attr('width', initialBarGeom.width)
      .style('fill', currentBarColor)
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .attr('x', barGeometry.x)
      .attr('width', barGeometry.width)
      .style('fill', currentBarColor);

    // Left limit indicator (min)
    container
      .append('rect')
      .classed('nge-diverging-bar-limit-left', true)
      .attr('width', limitIndicatorWidth)
      .attr('height', limitIndicatorHeight)
      .attr('x', 0)
      .attr('y', limitIndicatorY)
      .style('fill', theme.limitIndicator.color);

    // Right limit indicator (max)
    container
      .append('rect')
      .classed('nge-diverging-bar-limit-right', true)
      .attr('width', limitIndicatorWidth)
      .attr('height', limitIndicatorHeight)
      .attr('x', dimensions.boundedWidth - limitIndicatorWidth)
      .attr('y', limitIndicatorY)
      .style('fill', theme.limitIndicator.color);

    // Center indicator (zero point)
    container
      .append('rect')
      .classed('nge-diverging-bar-center-indicator', true)
      .attr('width', centerIndicatorWidth)
      .attr('height', centerIndicatorHeight)
      .attr('x', centerX - centerIndicatorWidth / 2)
      .attr('y', centerIndicatorY)
      .style('fill', theme.centerIndicator.color);

    // Center label bubble (permanent tooltip-like label)
    const labelText = config.centerLabel ?? 'Balanced';
    const labelPadding = { x: 8, y: 4 };
    const divotSize = 6;
    const labelFontSize = 10;

    const centerLabelGroup = container.append('g').classed('nge-diverging-bar-center-label', true);

    // Add text first to measure it
    const textElement = centerLabelGroup
      .append('text')
      .attr('font-size', labelFontSize)
      .attr('font-family', 'inherit')
      .attr('fill', 'var(--chart-on-surface-variant)')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(labelText);

    // Get text dimensions
    const textBBox = textElement.node()?.getBBox() ?? { height: 12, width: 50 };
    const bubbleWidth = textBBox.width + labelPadding.x * 2;
    const bubbleHeight = textBBox.height + labelPadding.y * 2;
    const bubbleX = centerX - bubbleWidth / 2;
    const bubbleY = centerIndicatorY - bubbleHeight - divotSize - 2;

    // Create bubble path with divot pointing down
    const bubbleRadius = 4;
    const divotX = bubbleWidth / 2 - divotSize;
    const bubblePath = `
      M ${bubbleRadius} 0
      H ${bubbleWidth - bubbleRadius}
      Q ${bubbleWidth} 0 ${bubbleWidth} ${bubbleRadius}
      V ${bubbleHeight - bubbleRadius}
      Q ${bubbleWidth} ${bubbleHeight} ${bubbleWidth - bubbleRadius} ${bubbleHeight}
      H ${divotX + divotSize * 2}
      L ${divotX + divotSize} ${bubbleHeight + divotSize}
      L ${divotX} ${bubbleHeight}
      H ${bubbleRadius}
      Q 0 ${bubbleHeight} 0 ${bubbleHeight - bubbleRadius}
      V ${bubbleRadius}
      Q 0 0 ${bubbleRadius} 0
      Z
    `;

    // Insert bubble behind text
    centerLabelGroup
      .insert('path', 'text')
      .classed('nge-diverging-bar-center-label-bubble', true)
      .attr('d', bubblePath)
      .attr('transform', `translate(${bubbleX}, ${bubbleY})`)
      .style('fill', 'var(--chart-surface-container)')
      .style('stroke', 'var(--chart-outline-variant)')
      .style('stroke-width', 1);

    // Position text in center of bubble
    textElement.attr('x', centerX).attr('y', bubbleY + bubbleHeight / 2);

    // Value indicator (marker at current value)
    container
      .append('rect')
      .classed('nge-diverging-bar-value-indicator', true)
      .attr('width', valueIndicatorWidth)
      .attr('height', valueIndicatorHeight)
      .attr('x', xScale(animateFromValue) - valueIndicatorWidth / 2)
      .attr('y', valueIndicatorY)
      .style('fill', currentBarColor)
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .attr('x', xScale(value) - valueIndicatorWidth / 2)
      .style('fill', currentBarColor)
      .tween('tooltip-content', () => {
        // Only animate tooltip content if showDuringAnimation is true (default)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        if (tooltipConfig?.showDuringAnimation === false) return () => {};
        return (t: number) => {
          const currentValue = interpolateValue(animateFromValue, value, t);
          const tooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), currentValue);
          if (tooltipEvent && tooltipHandlers?.onTooltip) {
            tooltipHandlers.onTooltip({ ...tooltipEvent, skipPosition: true });
          }
        };
      });

    // Animate tooltip position
    // Only show tooltip during animation if showDuringAnimation is true (default)
    if (tooltipElement && tooltipConfig?.showDuringAnimation !== false) {
      const finalTooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), value);
      if (finalTooltipEvent) {
        select(tooltipElement)
          .style('display', 'block')
          .transition()
          .duration(animation.enterMs)
          .ease(animation.easing)
          .style('left', `${finalTooltipEvent.position.x}px`)
          .style('top', `${finalTooltipEvent.position.y}px`);
      }
    }
  } else {
    // Update existing elements
    container
      .select('.nge-diverging-bar-background')
      .attr('width', dimensions.boundedWidth - limitIndicatorWidth * 2)
      .attr('x', limitIndicatorWidth)
      .style('fill', theme.backgroundBar.color);

    container
      .select('.nge-diverging-bar-value-bar')
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', barGeometry.x)
      .attr('width', barGeometry.width)
      .style('fill', currentBarColor);

    container
      .select('.nge-diverging-bar-limit-right')
      .attr('x', dimensions.boundedWidth - limitIndicatorWidth)
      .style('fill', theme.limitIndicator.color);

    container
      .select('.nge-diverging-bar-center-indicator')
      .attr('x', centerX - centerIndicatorWidth / 2)
      .style('fill', theme.centerIndicator.color);

    container
      .select('.nge-diverging-bar-value-indicator')
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', xScale(value) - valueIndicatorWidth / 2)
      .style('fill', currentBarColor)
      .tween('tooltip-content', () => {
        // Only animate tooltip content if showDuringAnimation is true (default)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        if (tooltipConfig?.showDuringAnimation === false) return () => {};
        return (t: number) => {
          const currentValue = interpolateValue(animateFromValue, value, t);
          const tooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), currentValue);
          if (tooltipEvent && tooltipHandlers?.onTooltip) {
            tooltipHandlers.onTooltip({ ...tooltipEvent, skipPosition: true });
          }
        };
      });

    // Animate tooltip position
    // Only show tooltip during animation if showDuringAnimation is true (default)
    if (tooltipElement && tooltipConfig?.showDuringAnimation !== false) {
      const finalTooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), value);
      if (finalTooltipEvent) {
        select(tooltipElement)
          .style('display', 'block')
          .transition()
          .duration(animation.updateMs)
          .ease(animation.easing)
          .style('left', `${finalTooltipEvent.position.x}px`)
          .style('top', `${finalTooltipEvent.position.y}px`);
      }
    }
  }

  // Hover interactions for tooltip
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;
  if (tooltipEnabled) {
    bounds
      .on('mouseenter', (event: PointerEvent) => {
        const tooltipEvent = computeTooltipEvent(event, value);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      })
      .on('mouseleave', () => {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      });
  }

  // Click handler
  if (config.onClick) {
    bounds.style('cursor', 'pointer').on('click', (event: PointerEvent) => {
      config.onClick!({
        data: { max, min, negativeColor, positiveColor, units, value },
        event,
        index: 0,
      });
    });
  }
}
