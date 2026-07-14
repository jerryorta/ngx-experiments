import type {
  NgeChartXScale,
  NgeChartYScale,
} from '../base-layout/nge-chart-base-layout.models';
import type { AxisTick } from './nge-axis.models';

/** Structural view of a d3 band/point scale (categorical axis). */
interface BandScaleShape {
  bandwidth(): number;
  domain(): unknown[];
}

/** Structural view of a d3 continuous scale (linear/time axis). */
interface ContinuousScaleShape {
  ticks(count?: number): unknown[];
}

/** Structural view of any d3 scale exposing its domain. */
interface DomainScaleShape {
  domain(): unknown[];
}

/** Structural view of a scale that can format its own tick values. */
interface FormattableScaleShape {
  tickFormat?(count?: number): (value: unknown) => string;
}

/**
 * Builds the label formatter for a scale, mirroring d3-axis: use the scale's own
 * `tickFormat` (honoring the tick count, as d3 passes its tick arguments) when it
 * exposes one — linear/time scales do — otherwise fall back to `String`, which is
 * how d3-axis's `identity` formatter renders a categorical (band/point) value.
 */
function makeLabeler(
  scale: NgeChartXScale | NgeChartYScale,
  tickCount?: number
): (value: unknown) => string {
  const formattable = scale as unknown as FormattableScaleShape;
  if (typeof formattable.tickFormat === 'function') {
    const format =
      tickCount === undefined ? formattable.tickFormat() : formattable.tickFormat(tickCount);
    return (value: unknown) => String(format(value));
  }
  return (value: unknown) => String(value);
}

/**
 * Computes the full tick model for an axis — value, pixel position, and label —
 * for the forked nge-axis renderer and the gridline consumer. Reproduces the
 * exact positions d3-axis would draw so gridlines land on the marks, and adds the
 * domain value + formatted label the renderer needs to draw text.
 *
 * @remarks
 * Positions are the raw scale projections (band centers / `scale.ticks()` values),
 * which align exactly with the data marks. This intentionally omits d3-axis's
 * crisp-edge `offset` — a ≤0.5px `devicePixelRatio`-gated anti-aliasing nudge d3
 * applies to tick glyphs on non-retina displays — because replicating it would
 * shift gridlines off the marks they annotate. The difference is sub-pixel.
 *
 * @param scale - The x or y scale whose ticks to derive.
 * @param tickCount - Optional tick-count hint; honored by linear/time scales,
 *   ignored by band/point scales (which emit one tick per domain entry).
 * @returns One {@link AxisTick} per rendered tick, in domain order.
 */
export function computeAxisTicks(
  scale: NgeChartXScale | NgeChartYScale,
  tickCount?: number
): AxisTick[] {
  // Every d3 scale is callable: it maps a domain value to a pixel offset.
  const project = scale as unknown as (value: unknown) => number | undefined;
  const label = makeLabeler(scale, tickCount);

  // Band/point scale (bar/grouped-bar categorical axis): one tick per domain
  // entry, centered in the band. Point scales report bandwidth 0 → exact point.
  if (typeof (scale as { bandwidth?: unknown }).bandwidth === 'function') {
    const bandScale = scale as unknown as BandScaleShape;
    const half = bandScale.bandwidth() / 2;
    return bandScale.domain().map(value => ({
      label: label(value),
      position: (project(value) ?? 0) + half,
      value,
    }));
  }

  // Linear/time scale: the identical values d3-axis picks, honoring the tick count.
  if (typeof (scale as { ticks?: unknown }).ticks === 'function') {
    const contScale = scale as unknown as ContinuousScaleShape;
    const values = tickCount === undefined ? contScale.ticks() : contScale.ticks(tickCount);
    return values.map(value => ({
      label: label(value),
      position: project(value) ?? 0,
      value,
    }));
  }

  // Fallback: map every domain entry directly (bandwidth-less, tick-less scales).
  const domainScale = scale as unknown as DomainScaleShape;
  return domainScale.domain().map(value => ({
    label: label(value),
    position: project(value) ?? 0,
    value,
  }));
}

/**
 * Computes just the pixel positions where axis ticks fall — the gridline
 * consumer's contract. A thin projection of {@link computeAxisTicks} so gridlines
 * and axis ticks can never disagree on tick placement.
 *
 * @param scale - The x or y scale whose tick positions to derive.
 * @param tickCount - Optional tick-count hint (see {@link computeAxisTicks}).
 * @returns Pixel offsets along the scale's range, one per rendered tick.
 */
export function computeAxisTickPositions(
  scale: NgeChartXScale | NgeChartYScale,
  tickCount?: number
): number[] {
  return computeAxisTicks(scale, tickCount).map(tick => tick.position);
}
