import { easeCubicInOut, interpolateNumber, scaleLinear, select } from 'd3';
import 'd3-transition';

import type { NgeBulletDataPoint, NgeBulletLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeBulletLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeBulletLayerTheme } from '../../core/theme';

/**
 * Persistent state for bullet layer (tracks last progress for animation)
 */
let lastProgress = 0;

/**
 * Clamp a value to be within min and max range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Render bullet chart layer into the provided bounds.
 * Pure function - no side effects outside of D3 DOM manipulation.
 */
export function renderBulletLayer(
  context: NgeChartLayerContext<
    NgeBulletDataPoint,
    NgeBulletLayerConfig,
    NgeBulletLayerTheme | undefined
  >
): void {
  const { bounds, config, dimensions, margins, tooltipConfig, tooltipElement, tooltipHandlers } =
    context;

  // Bullet chart data comes from config.data (single object, not array)
  const datum = config.data;

  if (!bounds || !datum) {
    return;
  }

  const { color, max, min, progress: rawProgress, units = '' } = datum;

  // Clamp progress to be within min/max
  const progress = clamp(rawProgress, min, max);

  // Capture the starting progress for animation, then immediately update lastProgress
  // This prevents "backwards animation" when transitions are interrupted by rapid updates
  const animateFromProgress = lastProgress;
  lastProgress = progress; // Update immediately so next render won't restart from stale value

  // Merge theme with defaults
  const theme = mergeBulletLayerTheme(context.theme);

  // Get dimensions from theme
  const barHeight = config.barHeight ?? theme.backgroundBar.height;
  const progressIndicatorHeight = config.progressIndicatorHeight ?? theme.progressIndicator.height;
  const progressIndicatorWidth = config.progressIndicatorWidth ?? theme.progressIndicator.width;
  const limitIndicatorWidth = config.limitIndicatorWidth ?? theme.limitIndicator.width;
  const limitIndicatorHeight = config.limitIndicatorHeight ?? theme.limitIndicator.height;

  // Calculate vertical centering
  const barY = (progressIndicatorHeight - barHeight) / 2;

  // Create scale
  const xScale = scaleLinear().domain([min, max]).range([0, dimensions.boundedWidth]);

  // Get colors from data or theme (like bar/line layers)
  const progressBarColor = color ?? theme.progressBar.color;
  const progressIndicatorColor = color ?? theme.progressIndicator.color;

  // Interrupt any running transitions
  bounds.selectAll('.nge-bullet-container').interrupt();
  bounds.selectAll('.nge-bullet-progress-bar').interrupt();
  bounds.selectAll('.nge-bullet-progress-indicator').interrupt();

  // Tooltip helper
  const computeTooltipEvent = (
    event: PointerEvent,
    currentProgress: number
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4; // Corner radius of tooltip bubble

    // Progress indicator center in container coordinates
    const progressCenterX = margins.left + xScale(currentProgress);

    // Tooltip bounds match the chart bounds exactly
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;

    // Ideal tooltip position (centered on progress indicator)
    const idealTooltipX = progressCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y position (above the chart)
    const tooltipY = margins.top - tooltipHeight - 10;

    // Where should the divot tip point? (relative to tooltip left edge)
    const targetTipX = progressCenterX - tooltipX;

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
      color,
      max,
      min,
      progress: currentProgress,
      units,
    });

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
      // Round all position values to avoid subpixel jitter during animation
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

  // Interpolate progress for smooth animation
  function interpolateProgress(from: number, to: number, t: number): number {
    const i = interpolateNumber(from, to);
    return parseFloat(i(t).toFixed(2));
  }

  // Check if container exists
  let container = bounds.select<SVGGElement>('.nge-bullet-container');

  if (container.empty()) {
    // Create new container with all elements
    container = bounds.append('g').classed('nge-bullet-container', true);

    // Background bar
    container
      .append('rect')
      .classed('nge-bullet-background-bar', true)
      .attr('width', dimensions.boundedWidth - limitIndicatorWidth * 2)
      .attr('height', barHeight)
      .attr('y', barY)
      .attr('x', limitIndicatorWidth)
      .style('fill', theme.backgroundBar.color);

    // Progress bar
    container
      .append('rect')
      .classed('nge-bullet-progress-bar', true)
      .attr('height', barHeight)
      .attr('y', barY)
      .attr('x', 0)
      .attr('width', 0)
      .style('fill', progressBarColor)
      .transition()
      .duration(300)
      .attr('width', xScale(progress));

    // Left limit indicator
    container
      .append('rect')
      .classed('nge-bullet-limit-left', true)
      .attr('width', limitIndicatorWidth)
      .attr('height', limitIndicatorHeight)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', theme.limitIndicator.color);

    // Right limit indicator
    container
      .append('rect')
      .classed('nge-bullet-limit-right', true)
      .attr('width', limitIndicatorWidth)
      .attr('height', limitIndicatorHeight)
      .attr('x', xScale(max) - limitIndicatorWidth)
      .attr('y', 0)
      .style('fill', theme.limitIndicator.color);

    // Progress indicator
    container
      .append('rect')
      .classed('nge-bullet-progress-indicator', true)
      .attr('width', progressIndicatorWidth)
      .attr('height', progressIndicatorHeight)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', progressIndicatorColor)
      .transition()
      .duration(300)
      .attr('x', xScale(progress) - progressIndicatorWidth / 2)
      .tween('tooltip-content', () => {
        // Only animate tooltip content if showDuringAnimation is true (default)
        if (tooltipConfig?.showDuringAnimation === false)
          return () => {
            /* no-op tween: tooltip content stays frozen during the animation */
          };
        // Tween only updates content (value shown), position is animated separately
        return (t: number) => {
          const currentProgress = interpolateProgress(animateFromProgress, progress, t);
          const tooltipEvent = computeTooltipEvent(
            new PointerEvent('pointermove'),
            currentProgress
          );
          if (tooltipEvent && tooltipHandlers?.onTooltip) {
            // Skip position - it's being animated by separate D3 transition
            tooltipHandlers.onTooltip({ ...tooltipEvent, skipPosition: true });
          }
        };
      });

    // Animate tooltip position using separate D3 transition (native interpolation)
    // Use same easing as indicator for synchronized animation feel
    // Only show tooltip during animation if showDuringAnimation is true (default)
    if (tooltipElement && tooltipConfig?.showDuringAnimation !== false) {
      const finalTooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), progress);
      if (finalTooltipEvent) {
        select(tooltipElement)
          .style('display', 'block')
          .transition()
          .duration(300)
          .ease(easeCubicInOut)
          .style('left', `${finalTooltipEvent.position.x}px`)
          .style('top', `${finalTooltipEvent.position.y}px`);
      }
    }
  } else {
    // Update existing elements
    container
      .select('.nge-bullet-background-bar')
      .attr('width', dimensions.boundedWidth - limitIndicatorWidth * 2)
      .attr('x', limitIndicatorWidth)
      .style('fill', theme.backgroundBar.color);

    container
      .select('.nge-bullet-progress-bar')
      .style('fill', progressBarColor)
      .transition()
      .duration(300)
      .attr('width', xScale(progress));

    container
      .select('.nge-bullet-limit-right')
      .attr('x', xScale(max) - limitIndicatorWidth)
      .style('fill', theme.limitIndicator.color);

    container
      .select('.nge-bullet-progress-indicator')
      .style('fill', progressIndicatorColor)
      .transition()
      .duration(300)
      .attr('x', xScale(progress) - progressIndicatorWidth / 2)
      .tween('tooltip-content', () => {
        // Only animate tooltip content if showDuringAnimation is true (default)
        if (tooltipConfig?.showDuringAnimation === false)
          return () => {
            /* no-op tween: tooltip content stays frozen during the animation */
          };
        // Tween only updates content (value shown), position is animated separately
        return (t: number) => {
          const currentProgress = interpolateProgress(animateFromProgress, progress, t);
          const tooltipEvent = computeTooltipEvent(
            new PointerEvent('pointermove'),
            currentProgress
          );
          if (tooltipEvent && tooltipHandlers?.onTooltip) {
            // Skip position - it's being animated by separate D3 transition
            tooltipHandlers.onTooltip({ ...tooltipEvent, skipPosition: true });
          }
        };
      });

    // Animate tooltip position using separate D3 transition (native interpolation)
    // Use same easing as indicator for synchronized animation feel
    // Only show tooltip during animation if showDuringAnimation is true (default)
    if (tooltipElement && tooltipConfig?.showDuringAnimation !== false) {
      const finalTooltipEvent = computeTooltipEvent(new PointerEvent('pointermove'), progress);
      if (finalTooltipEvent) {
        select(tooltipElement)
          .style('display', 'block')
          .transition()
          .duration(300)
          .ease(easeCubicInOut)
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
        const tooltipEvent = computeTooltipEvent(event, progress);
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
        data: { color, max, min, progress, units },
        event,
        index: 0,
      });
    });
  }
}
