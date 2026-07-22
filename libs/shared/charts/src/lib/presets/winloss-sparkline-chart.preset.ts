import type { NgeBarDataPoint, NgeChartConfig } from '../core/config';
import type { BarChartPresetOptions } from './bar-chart.preset';

import { createBarChartConfig } from './bar-chart.preset';

/**
 * Compact win-loss margin — a few pixels so the marks fill the cell almost
 * edge-to-edge (a sparkline lives inline, not in a full chart frame).
 */
const DEFAULT_WINLOSS_MARGIN = { bottom: 2, left: 2, right: 2, top: 2 };

/** Gap between period marks — enough to separate them, tight enough to stay dense. */
const DEFAULT_WINLOSS_BAR_PADDING = 0.2;

/** Win mark colour — the primary accent token. */
const DEFAULT_WIN_COLOR = 'var(--chart-primary)';

/** Loss mark colour — the error/failure accent token. */
const DEFAULT_LOSS_COLOR = 'var(--chart-error)';

/** Tie mark colour — a muted on-surface token (ties render as a zero-height mark). */
const DEFAULT_TIE_COLOR = 'var(--chart-on-surface-variant)';

/**
 * One period's outcome for a win-loss sparkline: a `label` and a signed `value`.
 * Only the SIGN is used — magnitude is discarded so every win (and every loss) is
 * an equal-height mark. `value > 0` is a win, `value < 0` a loss, `value === 0` a tie.
 */
export interface WinLossDataPoint {
  /** Period / category label — one mark per period. */
  label: string;
  /** Signed outcome; only its sign matters (magnitude is normalised away). */
  value: number;
}

/**
 * Options for the win-loss sparkline preset — every {@link BarChartPresetOptions}
 * field except `data` (replaced by the lean {@link WinLossDataPoint} shape) and
 * `orientation` (fixed vertical — see {@link createWinLossSparklineChartConfig}),
 * plus the three sign colours.
 */
export interface WinLossSparklineChartPresetOptions extends Omit<
  BarChartPresetOptions,
  'data' | 'orientation'
> {
  /** One entry per period; only each `value`'s sign is used. */
  data: WinLossDataPoint[];
  /** Colour for loss marks (`value < 0`). @default var(--chart-error) */
  lossColor?: string;
  /** Colour for tie marks (`value === 0`, rendered as a zero-height mark). @default var(--chart-on-surface-variant) */
  tieColor?: string;
  /** Colour for win marks (`value > 0`). @default var(--chart-primary) */
  winColor?: string;
}

/**
 * Normalise one period into an equal-magnitude, sign-coloured bar datum: win → `+1`,
 * loss → `-1`, tie → `0`, with the fill chosen by sign. The magnitude is discarded so
 * every win (and every loss) renders the same height.
 */
function toWinLossBar(
  point: WinLossDataPoint,
  colors: { lossColor: string; tieColor: string; winColor: string }
): NgeBarDataPoint {
  const sign = Math.sign(point.value);
  const color = sign > 0 ? colors.winColor : sign < 0 ? colors.lossColor : colors.tieColor;

  return { color, label: point.label, value: sign };
}

/**
 * Compact **win-loss sparkline** — a run of equal-height marks, one per period,
 * coloured by outcome and diverging from a central zero line: wins rise above it,
 * losses drop below, ties collapse to nothing. Only each datum's SIGN matters
 * (magnitude is normalised to `±1`), so it answers "how often, and in what streaks,
 * did we win vs lose?" rather than "by how much?".
 *
 * This is a thin preset — it introduces no new layer `type`, config-union entry, or
 * theme slice. It normalises the data to sign-coloured `±1` bars and delegates to
 * {@link createBarChartConfig} with vertical bars. Because the bar helper's value
 * domain always spans zero (`Math.max(…, 0)` / `Math.min(…, 0)`), a mixed win/loss
 * run auto-fits to a symmetric `[-1·headroom, 1·headroom]` domain, so wins render up
 * from the midline and losses down — no manual domain pinning required.
 *
 * @example
 * const config = createWinLossSparklineChartConfig({
 *   data: [
 *     { label: 'G1', value: 1 },   // win  → up
 *     { label: 'G2', value: -1 },  // loss → down
 *     { label: 'G3', value: 1 },   // win  → up
 *     { label: 'G4', value: 0 },   // tie  → nothing
 *     { label: 'G5', value: 1 },   // win  → up
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createWinLossSparklineChartConfig(
  options: WinLossSparklineChartPresetOptions
): NgeChartConfig {
  const {
    barPadding = DEFAULT_WINLOSS_BAR_PADDING,
    data,
    lossColor = DEFAULT_LOSS_COLOR,
    margin = DEFAULT_WINLOSS_MARGIN,
    showLabels = false,
    showZeroLine = true,
    tieColor = DEFAULT_TIE_COLOR,
    winColor = DEFAULT_WIN_COLOR,
    ...rest
  } = options;

  const bars = data.map(point => toWinLossBar(point, { lossColor, tieColor, winColor }));

  return createBarChartConfig({
    ...rest,
    barPadding,
    data: bars,
    margin,
    orientation: 'vertical',
    showLabels,
    // A visible midline disambiguates wins (above) from losses (below); overridable.
    showZeroLine,
  });
}
