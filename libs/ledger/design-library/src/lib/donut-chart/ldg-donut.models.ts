import type { NgeChartLayerRenderFn } from '@nge/charts';

/**
 * One slice of a donut — a labeled value and, optionally, the exact color to
 * fill it with. When `color` is omitted the render fn falls back to the theme's
 * `--chart-*` series palette (see {@link LdgDonutLayerTheme}).
 */
export interface LdgDonutSegment {
  color?: string;
  label: string;
  value: number;
}

/**
 * Theme slice for the donut layer. Defaults live in `--chart-*` tokens (NOT
 * domain `--ldg-*`) so the layer is promotion-ready into `@nge/charts` — a
 * consumer that wants domain colors passes them per-segment via
 * {@link LdgDonutSegment.color}.
 */
export interface LdgDonutLayerTheme {
  /** Uppercase center-label text color. */
  centerLabelColor: string;
  /** Center-value text color. */
  centerValueColor: string;
  /** Stroke color for the empty-state ring (drawn when every value is ≤ 0). */
  emptyRingColor: string;
  /** Ordered fallback palette for segments without an explicit `color`. */
  seriesColors: string[];
}

/**
 * Donut layer config — the promotable shape the `<nge-chart>` layer registry
 * renders. `type: 'donut'` is a domain-incubated layer type (not yet in the
 * shared `NgeChartLayerType` union), so the preset casts it into `config.layers`;
 * the registry still calls `renderer` generically. Promoting it upstream is a
 * file move + a `type` registration — see `docs/architecture/charts.md`.
 */
export interface LdgDonutLayerConfig {
  /** Center label drawn in the donut hole, e.g. 'Total'. */
  centerLabel?: string;
  /** Center value drawn in the donut hole, e.g. '$4,231' — pre-formatted by the caller. */
  centerValue?: string;
  /** Slices, in order — arcs preserve this order rather than sorting by value. */
  data: LdgDonutSegment[];
  /** Emitted when a slice is clicked (or activated via keyboard). */
  onSegmentClick?: (segment: LdgDonutSegment) => void;
  /** The layer's own render fn — `renderLdgDonutLayer`. */
  renderer: NgeChartLayerRenderFn<LdgDonutSegment, LdgDonutLayerConfig, LdgDonutLayerTheme | undefined>;
  /** Inner-radius ratio: 0 renders a filled pie, closer to 1 a thinner ring. */
  thickness?: number;
  /** Discriminator. */
  type: 'donut';
}
