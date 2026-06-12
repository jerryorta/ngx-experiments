export interface ChartTooltipConfig {
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
  divotHeight: number;
  /**
   * Position of the divot pointer
   * - 'bottom': Divot points down (tooltip above element)
   * - 'top': Divot points up (tooltip below element)
   */
  divotPosition: 'bottom' | 'top';
  /**
   * Horizontal offset of the divot tip from center.
   * - 0: Symmetric isosceles triangle (default)
   * - Positive: Tip shifts right (left side becomes vertical)
   * - Negative: Tip shifts left (right side becomes vertical)
   * This allows the divot to always point at the data point even when
   * the tooltip is clamped to the chart bounds.
   */
  divotTipOffset?: number;
  divotWidth: number;
  height: number;
  hover: boolean;
  reversed: boolean;
  rx: number;
  tooltipHoverClosed?: boolean;
  translateDivotX?: number;
  visible: boolean;
  width: number;
}

export const defaultChartTooltipConfig: ChartTooltipConfig = {
  divotHeight: 12,
  divotPosition: 'bottom',
  divotWidth: 24,
  height: 65,
  hover: false,
  reversed: true,
  rx: 4,
  tooltipHoverClosed: false,
  visible: true,
  width: 62,
};

export interface ChartTooltipState {
  /** Background color of the tooltip bubble */
  backgroundColor?: string;
  /** Border color of the tooltip bubble */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Height of the bubble portion (excluding divot) */
  bubbleHeight: number;
  /** The complete SVG path for the tooltip bubble with divot */
  bubblePath: string;
  divotHeight: number;
  /** Position of the divot pointer */
  divotPosition: 'bottom' | 'top';
  /** Horizontal offset of the divot tip from center */
  divotTipOffset: number;
  divotWidth: number;
  /** X position of divot left edge */
  divotX: number;
  hover: boolean;
  reversed: boolean;
  rx: number;
  svgHeight: number;
  svgWidth: number;
  tooltipHoverClosed: boolean;
  viewBox: string;
  visible: boolean;
}

/**
 * Generate an SVG path for a rounded rectangle with a triangular divot at the bottom.
 * The path traces: top-left corner → top → top-right corner → right → bottom-right corner
 * → bottom to divot → divot triangle → bottom from divot → bottom-left corner → left → close
 *
 * @param divotTipOffset - Horizontal offset of the tip from center. When the tooltip is
 *   clamped to the left edge, this is positive (tip shifts right, left side becomes vertical).
 *   When clamped to the right, this is negative (tip shifts left, right side becomes vertical).
 */
export function generateBubblePath(
  width: number,
  height: number,
  bubbleHeight: number,
  rx: number,
  divotWidth: number,
  divotX: number,
  divotTipOffset = 0
): string {
  // Clamp divot position to stay within bounds
  const minDivotX = rx;
  const maxDivotX = width - rx - divotWidth;
  const clampedDivotX = Math.max(minDivotX, Math.min(maxDivotX, divotX));

  const divotLeft = clampedDivotX;
  const divotCenter = clampedDivotX + divotWidth / 2;
  const divotRight = clampedDivotX + divotWidth;

  // Calculate the actual tip position with offset
  // Clamp the tip to stay within the divot base (between divotLeft and divotRight)
  const halfWidth = divotWidth / 2;
  const clampedOffset = Math.max(-halfWidth, Math.min(halfWidth, divotTipOffset));
  const divotTipX = divotCenter + clampedOffset;

  // Build path using SVG commands
  // M = moveto, L = lineto, A = arc, Z = close
  return [
    // Start at top-left, after the corner radius
    `M ${rx} 0`,
    // Top edge
    `L ${width - rx} 0`,
    // Top-right corner (arc)
    `A ${rx} ${rx} 0 0 1 ${width} ${rx}`,
    // Right edge
    `L ${width} ${bubbleHeight - rx}`,
    // Bottom-right corner (arc)
    `A ${rx} ${rx} 0 0 1 ${width - rx} ${bubbleHeight}`,
    // Bottom edge to divot
    `L ${divotRight} ${bubbleHeight}`,
    // Divot: down to tip (with offset)
    `L ${divotTipX} ${height}`,
    // Divot: up from tip
    `L ${divotLeft} ${bubbleHeight}`,
    // Bottom edge from divot
    `L ${rx} ${bubbleHeight}`,
    // Bottom-left corner (arc)
    `A ${rx} ${rx} 0 0 1 0 ${bubbleHeight - rx}`,
    // Left edge
    `L 0 ${rx}`,
    // Top-left corner (arc)
    `A ${rx} ${rx} 0 0 1 ${rx} 0`,
    // Close path
    'Z',
  ].join(' ');
}

/**
 * Generate an SVG path for a rounded rectangle with a triangular divot at the TOP.
 * Used when tooltip is positioned below the element.
 * The path traces: top-left corner → top to divot → divot triangle → top from divot
 * → top-right corner → right → bottom-right corner → bottom → bottom-left corner → left → close
 *
 * @param divotTipOffset - Horizontal offset of the tip from center.
 */
export function generateBubblePathDivotTop(
  width: number,
  height: number,
  divotHeight: number,
  rx: number,
  divotWidth: number,
  divotX: number,
  divotTipOffset = 0
): string {
  // Clamp divot position to stay within bounds
  const minDivotX = rx;
  const maxDivotX = width - rx - divotWidth;
  const clampedDivotX = Math.max(minDivotX, Math.min(maxDivotX, divotX));

  const divotLeft = clampedDivotX;
  const divotCenter = clampedDivotX + divotWidth / 2;
  const divotRight = clampedDivotX + divotWidth;

  // Calculate the actual tip position with offset
  // Clamp the tip to stay within the divot base
  const halfWidth = divotWidth / 2;
  const clampedOffset = Math.max(-halfWidth, Math.min(halfWidth, divotTipOffset));
  const divotTipX = divotCenter + clampedOffset;

  // The bubble starts at divotHeight from top (divot is at top)
  const bubbleTop = divotHeight;
  const bubbleBottom = height;

  // Build path using SVG commands
  // M = moveto, L = lineto, A = arc, Z = close
  return [
    // Start at top-left of bubble, after the corner radius
    `M ${rx} ${bubbleTop}`,
    // Top edge to divot left
    `L ${divotLeft} ${bubbleTop}`,
    // Divot: up to tip (with offset)
    `L ${divotTipX} 0`,
    // Divot: down from tip
    `L ${divotRight} ${bubbleTop}`,
    // Top edge from divot to top-right corner
    `L ${width - rx} ${bubbleTop}`,
    // Top-right corner (arc)
    `A ${rx} ${rx} 0 0 1 ${width} ${bubbleTop + rx}`,
    // Right edge
    `L ${width} ${bubbleBottom - rx}`,
    // Bottom-right corner (arc)
    `A ${rx} ${rx} 0 0 1 ${width - rx} ${bubbleBottom}`,
    // Bottom edge
    `L ${rx} ${bubbleBottom}`,
    // Bottom-left corner (arc)
    `A ${rx} ${rx} 0 0 1 0 ${bubbleBottom - rx}`,
    // Left edge
    `L 0 ${bubbleTop + rx}`,
    // Top-left corner (arc)
    `A ${rx} ${rx} 0 0 1 ${rx} ${bubbleTop}`,
    // Close path
    'Z',
  ].join(' ');
}

export const defaultChartTooltipState: ChartTooltipState = {
  bubbleHeight: 53,
  bubblePath: generateBubblePath(120, 65, 53, 4, 24, 48, 0),
  divotHeight: 12,
  divotPosition: 'bottom',
  divotTipOffset: 0,
  divotWidth: 24,
  divotX: 48, // Centered: (120 - 24) / 2
  hover: false,
  reversed: true,
  rx: 4,
  svgHeight: 65,
  svgWidth: 120,
  tooltipHoverClosed: false,
  viewBox: '0 0 120 65',
  visible: false,
};
