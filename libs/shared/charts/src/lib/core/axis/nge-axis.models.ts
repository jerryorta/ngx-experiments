import type {
  NgeChartXScale,
  NgeChartYScale,
} from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartBaseTheme } from '../theme/nge-chart-theme.models';

/**
 * Which edge of the plot an axis is drawn against. Drives every orientation
 * decision in the forked renderer (tick offset direction, baseline geometry,
 * label anchoring). `'bottom'` / `'left'` are the standard X / Y axes; `'top'` and
 * `'right'` render the opposite-edge FOCUS axes a range/slider axis adds — the
 * zoomed values, opposite the full-range brush ruler on the bottom/left.
 */
export type AxisOrient = 'bottom' | 'left' | 'right' | 'top';

/**
 * A single resolved axis tick: the domain value it represents, the pixel offset
 * along the scale range where it lands, and the text drawn for it. Decoupling
 * position from value lets gridlines (which need only `position`) and the axis
 * renderer (which needs all three) share one computation.
 */
export interface AxisTick {
  /** Formatted tick label as rendered (scale's `tickFormat`, else `String(value)`). */
  label: string;
  /** Pixel offset along the scale range where the tick is drawn. */
  position: number;
  /** The domain value this tick annotates (category string, number, or Date). */
  value: unknown;
}

/**
 * A grouping band expressed in DOMAIN units (e.g. `{ from: 'Jan', to: 'Mar' }`
 * or `{ from: new Date(2020,0,1), to: new Date(2020,2,1) }`). Authors describe
 * tiers in the data's own vocabulary; the resolver projects them to pixels.
 */
export interface AxisTierBand {
  /** Inclusive start of the band in domain units. */
  from: unknown;
  /** Human-readable label rendered centered within the band. */
  label: string;
  /** Inclusive end of the band in domain units. */
  to: unknown;
}

/**
 * How a grouping tier's row is drawn. `'separators'` (the default) tints each band
 * and rules a full-height line at every boundary; `'pill'` draws an open-top
 * bracket per band — a baseline with end ticks plus a centered rounded-pill badge
 * around the label — for a lighter, more editorial treatment. Purely a render
 * choice: it never changes how a tier resolves to bands.
 */
export type AxisTierStyle = 'pill' | 'separators';

/**
 * One grouping tier's source definition. A tier is resolved to pixel bands by
 * exactly one of three strategies — explicit domain ranges, a calendar interval
 * (time scales), or a category-to-group mapping (band scales) — so the same tier
 * machinery serves every scale kind without the caller pre-computing pixels. Each
 * variant also carries an optional {@link AxisTierStyle} `style` selecting how the
 * resolved bands are rendered (default `'separators'`).
 */
export type AxisTierConfig =
  | { groupBy: (category: string) => string; style?: AxisTierStyle }
  | { interval: 'day' | 'month' | 'quarter' | 'week' | 'year'; style?: AxisTierStyle }
  | { ranges: AxisTierBand[]; style?: AxisTierStyle };

/**
 * A grouping band after projection into PIXEL space, ready to render. `center`
 * is precomputed so the label renderer stays trivial and every consumer agrees
 * on where the label sits.
 */
export interface ResolvedBand {
  /** Pixel midpoint between `start` and `end`; where the band label is centered. */
  center: number;
  /** Pixel offset of the band's trailing edge (always >= `start`). */
  end: number;
  /** Label rendered centered within the band. */
  label: string;
  /** Pixel offset of the band's leading edge (always <= `end`). */
  start: number;
}

/**
 * Styling for a grouping-tier row. Kept separate from the core axis theme so a
 * chart can tint/label its group bands independently of its tick styling. Added
 * to the base theme's `axis` block (as `group?`) by the theme layer, which
 * imports THIS type — the tier system owns its own theme shape.
 */
export interface AxisGroupTheme {
  /** Tier label text color. */
  labelColor?: string;
  /** Tier label font size (px). */
  labelFontSize?: number;
  /**
   * `style: 'pill'` badge background fill. Opaque by intent so the baseline never
   * strikes through the label sitting on it. Ignored by the `'separators'` style.
   */
  pillBackground?: string;
  /** `style: 'pill'` horizontal padding (px) between the label and each rounded end. */
  pillPaddingX?: number;
  /**
   * `style: 'pill'` corner radius (px). Omit for a full pill (radius = pill
   * height / 2); set a smaller literal for a softened-rectangle badge.
   */
  pillRadius?: number;
  /** Band boundary separator color. */
  separatorColor?: string;
  /** Band boundary separator width (px). */
  separatorWidth?: number;
  /** Optional band background fill (subtle tint behind each band). */
  tint?: string;
}

/**
 * The resolved `axis` block of the base chart theme. Derived via indexed access
 * so it tracks the theme model automatically — including the `group` field the
 * theme layer adds — and never drifts from a hand-maintained copy.
 */
export type NgeChartAxisTheme = NonNullable<NgeChartBaseTheme['axis']>;

/**
 * Everything {@link renderNgeAxis} needs for one axis. The caller supplies the
 * already-positioned `<g>` and the resolved theme; the renderer owns only the
 * axis's internal DOM (baseline + tick labels).
 */
export interface RenderNgeAxisOptions {
  /** Resolved `theme.axis` block driving line/tick colors and sizes. */
  axisTheme: NgeChartAxisTheme;
  /** Which plot edge the axis is drawn against. */
  orient: AxisOrient;
  /** The scale whose ticks are rendered. */
  scale: NgeChartXScale | NgeChartYScale;
  /** Optional override formatter for tick labels (wins over the scale's own). */
  tickFormat?: (d: any) => string;
  /**
   * X-axis tick-label rotation in degrees. Only meaningful for `orient: 'bottom'`;
   * ignored for vertical axes. Use negative angles to read bottom-to-top.
   */
  tickRotation?: number;
  /** Tick-count hint; honored by linear/time scales, ignored by band/point. */
  ticks?: number;
}

/**
 * Everything {@link renderAxisTiers} needs to render grouping rows beneath (or
 * beside) an axis. The caller positions the `<g>` at the axis baseline offset by
 * its tick-label allowance so tier 0 clears the tick text.
 */
export interface RenderAxisTiersOptions {
  /** Resolved `theme.axis.group` block driving tint/separator/label styling. */
  groupTheme: AxisGroupTheme;
  /** Which plot edge the parent axis is drawn against (sets tier stack direction). */
  orient: AxisOrient;
  /** The scale the tiers group, shared with the parent axis. */
  scale: NgeChartXScale | NgeChartYScale;
  /** Height (px) of each tier row; also the outward stacking step per tier. */
  tierHeight: number;
}

/**
 * Default height (px) of one grouping-tier row. Shared with base-layout margin
 * budgeting so the layout reserves exactly `tiers.length * AXIS_TIER_HEIGHT`
 * beyond the tick labels.
 */
export const AXIS_TIER_HEIGHT = 22;
