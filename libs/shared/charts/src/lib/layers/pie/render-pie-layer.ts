import type { PieArcDatum } from 'd3-shape';

import { interpolate } from 'd3-interpolate';
import { arc, pie } from 'd3-shape';
import 'd3-transition';

import type { NgePieDataPoint, NgePieLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgePieLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { applyRadiusRatio } from '../../core/fns';
import { mergePieLayerTheme, resolveLabelColor, toCssFontSize } from '../../core/theme';

/**
 * A pie slice `<path>` node caches its last-drawn arc datum (`_current`) so the
 * enter/update transition can interpolate angles smoothly (grow-in + reshape).
 */
type PieSliceNode = SVGPathElement & { _current?: PieArcDatum<NgePieDataPoint> };

/**
 * Narrowest slice sweep (radians) that still earns an ON-ARC label when no
 * `minLabelAngle` is supplied — ≈ 8.6°, i.e. ~2.4% of a full turn. Below it a label
 * would be wider than the wedge it names and would spill across its neighbours.
 *
 * Outside labels default to `0` instead: they are not drawn inside the wedge, so its width
 * stops being a constraint and a sliver can be labelled perfectly well.
 */
const DEFAULT_MIN_LABEL_ANGLE = 0.15;

/** Width (px) reserved on EACH side of the pie for outside labels when none is configured. */
const DEFAULT_OUTSIDE_LABEL_GUTTER = 96;

/** Minimum vertical spacing (px) between two adjacent outside labels when none is configured. */
const DEFAULT_OUTSIDE_LABEL_LINE_HEIGHT = 14;

/**
 * Radial distance (px) from the arc's outer edge out to the label ring / column when none is
 * configured. Raising it is the lever for pushing labels clear of the arc — and under
 * `labelLayout: 'perimeter'` (the default) it also SHRINKS the pie, because the ring it defines
 * has to fit inside the plot's height (see `verticalLabelReserve` below).
 */
const DEFAULT_OUTSIDE_LABEL_OFFSET = 12;

/** Horizontal gap (px) between the leader elbow and the start of the label text. */
const OUTSIDE_LABEL_TEXT_GAP = 4;

/**
 * Vertical slack (px) within which a resolved label still counts as sitting at its natural
 * anchor. Below it no leader line is drawn — only a label that collision resolution actually
 * displaced earns one.
 *
 * Height is the ONLY axis this measures, in both layouts, and that is the whole test rather
 * than an approximation of a fuller one: within a hemisphere `naturalY` is one-to-one with the
 * slice's mid-angle, `'perimeter'` derives x from the resolved y, and `'columns'` gives every
 * label the same x. So a label still at its own height still names its own wedge. (`charts.md`
 * § Radial labels carries the full argument — ARCH-283 settled it.)
 */
const OUTSIDE_LABEL_DISPLACEMENT_EPSILON = 0.5;

/** One outside label's resolved placement — the output of the collision pass. */
interface PieOutsideLabel {
  /**
   * `text-anchor` — how the glyphs sit relative to the anchor point, so the text always
   * reads AWAY from the pie. `'middle'` only where a perimeter label lands at dead top or
   * bottom and there is no outward direction to tip toward.
   */
  anchor: 'end' | 'middle' | 'start';
  /** The arc this label names. Kept by reference so the join key stays the slice label. */
  arc: PieArcDatum<NgePieDataPoint>;
  /** True when collision resolution moved the label off the height that names its wedge. */
  displaced: boolean;
  /** `1` on the right hemisphere (text reads outward from `start`), `-1` on the left. */
  hemisphere: -1 | 1;
  /**
   * Final x of the TEXT anchor in container coords. Fixed per hemisphere under
   * `'columns'`; follows the label ring under `'perimeter'`.
   */
  x: number;
  /** Final y in container coords (the container is already translated to the pie center). */
  y: number;
}

/**
 * Half-width (px) below which a perimeter label counts as sitting at dead top / bottom,
 * where the ring has no outward direction and the text centers instead of tipping.
 */
const OUTSIDE_LABEL_RING_POLE_EPSILON = 1e-6;

/**
 * Place every outside label and push apart the ones that collide.
 *
 * Each label starts at its slice's mid-angle projected out to `labelRadius`, then the arcs
 * split into left / right hemispheres by the sign of that anchor's x — only labels on the
 * same side of the pie can collide. Within a hemisphere: sort by natural y, run a forward
 * pass pushing each label at least `lineHeight` below its predecessor, clamp the tail to
 * `maxY`, then relax backwards so the separation survives that clamp. The pass is already
 * minimal in y — a label with enough natural clearance is left exactly where its wedge
 * points, and reports `displaced: false` so it earns no leader.
 *
 * `layout` decides only where an uncrowded label RESTS, not whether it separates:
 *
 * - `'perimeter'` (default) maps the resolved y back onto the label ring —
 *   `x = ±√(labelRadius² − y²)`. A label the pass left alone lands exactly on its mid-angle
 *   projection, so the ring follows the pie's curve; a nudged one slides ALONG that ring
 *   instead of collapsing to a column. Past the ring's own height the root would go
 *   imaginary, so it clamps to 0 (dead top / bottom), where the text centers rather than
 *   tipping either way.
 * - `'columns'` pins every label to a fixed `hemisphere × (labelRadius + gap)`. Separation is
 *   guaranteed, but the x is a ruler line: even a label the y-pass never touched is pulled
 *   off its slice's own bearing, so its connector has to reach back across the plot as a long
 *   diagonal. Note this does NOT change WHICH labels are leadered: `displaced` is decided by
 *   the y-pass above, which both layouts share, so the same slices qualify and only the
 *   length differs (mean 185px against the ring's 45px on the 30-country reference). A column
 *   x names no wedge, so surrendering it costs a label nothing it needs a connector to say.
 *   The layout's use is the density ceiling: the ring is crossing-free to ~20 categories and
 *   tangles sharply past it, where a column's shared terminal x keeps the leaders nested.
 *
 * Separation is guaranteed; fitting is not. A hemisphere taller than `maxY - minY` (more
 * categories on one side than the plot height can seat at `lineHeight` apiece) ends up with
 * its topmost labels above `minY`, where the plot clip-path cuts them off. That is the
 * deliberate trade — ARCH-267 locks "labels must never overlap", so the overflow is spent on
 * visibility rather than on collisions.
 *
 * Pure function of numbers: the caller does the DOM.
 */
function resolveOutsideLabels(
  arcs: PieArcDatum<NgePieDataPoint>[],
  labelRadius: number,
  lineHeight: number,
  minY: number,
  maxY: number,
  layout: 'columns' | 'perimeter'
): PieOutsideLabel[] {
  const resolved: PieOutsideLabel[] = [];

  for (const hemisphere of [-1, 1] as const) {
    const column = arcs
      .map(arc => {
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        return {
          // d3 arc angles start at 12 o'clock and run clockwise.
          anchorX: Math.sin(midAngle),
          arc,
          naturalY: -Math.cos(midAngle) * labelRadius,
        };
      })
      .filter(entry => (entry.anchorX >= 0 ? 1 : -1) === hemisphere)
      .sort((a, b) => a.naturalY - b.naturalY);

    if (column.length === 0) {
      continue;
    }

    // Forward pass — separate downward, with the plot ceiling as the floor of the column.
    const ys = column.map(entry => entry.naturalY);
    ys[0] = Math.max(ys[0], minY);
    for (let i = 1; i < ys.length; i++) {
      ys[i] = Math.max(ys[i], ys[i - 1] + lineHeight);
    }

    // Backward pass — pull the tail back inside the plot floor. Each step re-establishes the
    // gap with its successor, so lowering one label cannot re-collide it with the one above.
    ys[ys.length - 1] = Math.min(ys[ys.length - 1], maxY);
    for (let i = ys.length - 2; i >= 0; i--) {
      ys[i] = Math.min(ys[i], ys[i + 1] - lineHeight);
    }

    column.forEach((entry, i) => {
      // The ring's own x at this height, or the fixed column. Both then step one text gap
      // further out so the glyphs clear the ring rather than sitting on it.
      const isPerimeter = layout === 'perimeter';
      const ringX = Math.sqrt(Math.max(0, labelRadius * labelRadius - ys[i] * ys[i]));
      const x = hemisphere * ((isPerimeter ? ringX : labelRadius) + OUTSIDE_LABEL_TEXT_GAP);

      resolved.push({
        anchor:
          isPerimeter && ringX < OUTSIDE_LABEL_RING_POLE_EPSILON
            ? 'middle'
            : hemisphere > 0
              ? 'start'
              : 'end',
        arc: entry.arc,
        displaced: Math.abs(ys[i] - entry.naturalY) > OUTSIDE_LABEL_DISPLACEMENT_EPSILON,
        hemisphere,
        x,
        y: ys[i],
      });
    });
  }

  return resolved;
}

/**
 * Render the pie / donut / semi-circle layer into the provided bounds with theme
 * support. Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius) and IGNORES
 * the injected cartesian `scales`: `innerRadius` is a ratio (0 → pie, >0 → donut) of
 * the self-sized outer radius, and `startAngle`/`endAngle` sweep a semi-circle / gauge.
 * Slices join by `label` (keyed enter/update/exit) and reshape via a classic arc-tween.
 *
 * Opt-in labels (`showLabels`) ride a SECOND join on the same key. `labelPosition: 'inside'`
 * (default) anchors each at its slice's arc centroid, styled from `theme.label` with automatic
 * on-fill contrast; a slice narrower than `minLabelAngle` is left unlabelled rather than given
 * text wider than the wedge it names.
 *
 * `labelPosition: 'outside'` instead reserves `labelGutter` px on each side — taken off the
 * pie's own radius, because the layers group is clipped to the plot rect, so anything drawn
 * past `boundedWidth` would be cut off — and pushes the labels apart so none overlap.
 * `labelLayout` picks where an uncrowded one rests: `'perimeter'` (default) on a ring that
 * follows the pie's curve at the slice's own mid-angle, `'columns'` on a fixed per-hemisphere
 * x for densities past the ring's ~20-category ceiling. Leader polylines ride a THIRD keyed
 * join, running arc edge → the same mid-angle
 * at the label ring → the label, so the segment leaving the wedge is radial. `leaderLines`
 * chooses who gets one: `'displaced'` (default) only the labels whose height no longer names
 * their wedge, `'all'` every label, `'none'` no connectors. Outside labels are styled from
 * `theme.labelOutside`, which tracks the plot surface instead of deriving from a slice fill
 * they no longer sit on.
 *
 * `highlightedLabels` dims every slice it does not name to `theme.slice.dimmedOpacity`,
 * leaving the named ones at `theme.slice.opacity`. Opacity is the ONLY thing it changes —
 * the arcs come from the full data regardless, so emphasising a slice never moves one. That
 * is the whole reason to dim rather than filter: dropping a slice re-runs `d3.pie()` and
 * regrows every survivor, so the wedge being compared against changes size mid-comparison.
 */
export function renderPieLayer(
  context: NgeChartLayerContext<
    NgePieDataPoint,
    NgePieLayerConfig,
    NgePieLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // Merge theme with defaults
  const theme = mergePieLayerTheme(context.theme);

  // Outside labels are drawn INSIDE the plot area — the layers group is clipped to it, so the
  // strip they occupy has to come off the pie's own radius (the funnel layer's `labelGutter`
  // solves the same problem the same way). Reserved on BOTH sides: a pie's labels form a left
  // and a right column. Keyed off `labelPosition` alone, not `showLabels`, so toggling labels
  // never resizes the pie.
  const labelPosition = config.labelPosition ?? 'inside';
  const isOutsideLabels = labelPosition === 'outside';
  const labelLayout = config.labelLayout ?? 'perimeter';
  const labelLineHeight = Math.max(1, config.labelLineHeight ?? DEFAULT_OUTSIDE_LABEL_LINE_HEIGHT);
  const labelOffset = Math.max(0, config.labelOffset ?? DEFAULT_OUTSIDE_LABEL_OFFSET);
  // How far the leader's elbow sits off the arc. Defaults to `labelOffset` — the elbow on the
  // label ring — so a chart that never sets it is byte-identical to before the option existed.
  // Setting it shorter is the point: a stubby radial tick off the wedge with the text further
  // out, instead of one knob dragging both.
  const leaderElbowOffset = Math.max(0, config.leaderElbowOffset ?? labelOffset);
  const labelGutter = isOutsideLabels
    ? Math.max(0, config.labelGutter ?? DEFAULT_OUTSIDE_LABEL_GUTTER)
    : 0;

  // The gutter reserves WIDTH, which is all a hemisphere column needs — its labels sit beside
  // the pie and are clamped inside the plot vertically. A perimeter ring is different: it
  // crosses the top and bottom edges too, so its radial extent has to come off the HEIGHT as
  // well or the 12-o'clock label is drawn past `boundedHeight` and the clip-path cuts it.
  // The collision clamp hides that failure rather than fixing it — it shoves a whole band of
  // labels off their own bearing to keep them in frame, which is what turns a crowded arc
  // into a fan of long crossing leaders. Only the ring's own extent is reserved (offset plus
  // half a line of text), NOT the full gutter: at dead top the text runs horizontally, so it
  // needs a line's height of room, not a label's width. (`charts.md` § Radial labels.)
  // Whichever of the two rides furthest out is what has to fit: normally the label ring
  // (offset + half a line of text), but an elbow pushed past the labels would otherwise sit
  // outside the reserve and be clipped at 12 o'clock — the exact failure this reserve exists
  // to prevent. `max` keeps the guarantee without changing the default case at all.
  const verticalLabelReserve =
    isOutsideLabels && labelLayout === 'perimeter'
      ? Math.max(labelOffset + labelLineHeight / 2, leaderElbowOffset)
      : 0;

  // Self-scaled geometry: center in the bounded area, size the outer radius to the
  // smaller half-dimension, and read innerRadius as a ratio of it (0 → pie).
  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = applyRadiusRatio(
    Math.max(
      0,
      Math.min(
        dimensions.boundedWidth - 2 * labelGutter,
        dimensions.boundedHeight - 2 * verticalLabelReserve
      ) / 2
    ),
    config.radiusRatio
  );
  const innerRadius = (config.innerRadius ?? 0) * outerRadius;

  // Slice palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.slice.colors;

  // Interrupt any running transitions (mirrors bullet/bar) before recomputing the join.
  bounds.selectAll('.nge-pie-slice').interrupt();

  // Container group, centered in the bounded area.
  let container = bounds.select<SVGGElement>('.nge-pie-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-pie-container', true);
  }
  container.attr('transform', `translate(${cx},${cy})`);

  const pieGen = pie<NgePieDataPoint>()
    .value(d => Math.max(0, d.value))
    .sort(null)
    .startAngle(config.startAngle ?? 0)
    .endAngle(config.endAngle ?? 2 * Math.PI)
    .padAngle(config.padAngle ?? 0);

  const arcGen = arc<PieArcDatum<NgePieDataPoint>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const arcs = pieGen(data);

  // Resolve a slice fill: per-datum color → palette by input index (`d.index`, stable
  // under sort(null)) → the single-slice fallback.
  const fillFor = (d: PieArcDatum<NgePieDataPoint>): string =>
    d.data.color ?? palette[d.index % palette.length] ?? theme.slice.color;

  // Label typography + colour come from whichever slice matches the placement, because the
  // two have opposite backdrops.
  //
  // ON-ARC: the text sits on a slice fill drawn from the palette — a RANGE — so one flat
  // colour cannot read on every slice. Resolve per slice against its own fill: per-datum →
  // layer config → derived from the fill's luminance → theme default.
  //
  // OUTSIDE: the text sits on the plot surface, so it must NOT derive. `theme.labelOutside`
  // declares no `colorOnDark`, which makes `resolveLabelColor` short-circuit to its `color`
  // (a surface-tracking token) while leaving both explicit rungs working — passing an empty
  // fill on top of that keeps the intent obvious at the call site.
  const labelTheme = isOutsideLabels ? theme.labelOutside : theme.label;
  const node = bounds.node();
  const labelFillFor = (d: PieArcDatum<NgePieDataPoint>): string =>
    resolveLabelColor({
      configColor: config.labelColor,
      datumColor: d.data.labelColor,
      fill: isOutsideLabels ? '' : fillFor(d),
      node,
      theme: labelTheme,
    });

  // Reshape tween: interpolate the cached `_current` arc → the target arc so a slice
  // grows in from a zero-sweep collapse (enter) and morphs smoothly (update). `this`
  // is the `<path>` node; cache the interpolated angles PER FRAME so an interrupted
  // transition (rapid updates) resumes from the visible position instead of snapping.
  function arcTween(this: SVGPathElement, d: PieArcDatum<NgePieDataPoint>): (t: number) => string {
    const node = this as PieSliceNode;
    const start = node._current ?? { ...d, endAngle: d.startAngle, startAngle: d.startAngle };
    const interpolator = interpolate(start, d);
    return (t: number) => {
      const interpolated = interpolator(t);
      node._current = interpolated;
      return arcGen(interpolated) ?? '';
    };
  }

  // Selection emphasis. An EMPTY (or absent) set means "nothing is selected", which is not
  // the same as "everything is deselected" — with no selection every slice keeps its normal
  // opacity, so a chart that never sets the option is byte-identical to before it existed.
  // Only the opacity varies: the arcs themselves are computed from the full data either way,
  // so selecting never moves a wedge (filtering the data would, which is the point of doing
  // it this way — see `highlightedLabels` in the config JSDoc).
  const highlighted = new Set(config.highlightedLabels ?? []);
  const opacityFor = (d: PieArcDatum<NgePieDataPoint>): number =>
    highlighted.size === 0 || highlighted.has(d.data.label)
      ? theme.slice.opacity
      : theme.slice.dimmedOpacity;

  // Keyed enter/update/exit join by slice label.
  const slices = container
    .selectAll<SVGPathElement, PieArcDatum<NgePieDataPoint>>('.nge-pie-slice')
    .data(arcs, d => d.data.label);

  // EXIT — fade out and remove.
  slices
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // ENTER — append + cache a collapsed (zero-sweep) start arc, then grow in.
  const entered = slices
    .enter()
    .append('path')
    .classed('nge-pie-slice', true)
    .each(function (d) {
      (this as PieSliceNode)._current = { ...d, endAngle: d.startAngle, startAngle: d.startAngle };
    });

  entered.transition().duration(animation.enterMs).ease(animation.easing).attrTween('d', arcTween);

  // UPDATE — morph existing slices to the new angles.
  slices.transition().duration(animation.updateMs).ease(animation.easing).attrTween('d', arcTween);

  // Merged selection (new + existing slices).
  const merged = entered.merge(slices);

  // Re-apply ALL styles every render so a runtime theme change (palette / stroke /
  // opacity) reaches already-rendered slices, not just freshly-entered ones. Exiting
  // slices are excluded from the merge, so their fade-out is unaffected.
  merged
    .style('fill', fillFor)
    .style('stroke', theme.slice.stroke)
    .style('stroke-width', theme.slice.strokeWidth)
    .style('opacity', opacityFor);

  // Optional labels — a SEPARATE keyed join for <text> marks (mirrors the funnel layer's
  // label join), so labels enter/update/exit on their own schedule without disturbing the arc
  // join above. Both joins key on the same slice label, so a slice and its label keep a single
  // shared identity across data changes.
  //
  // Small-slice rule: a wedge narrower than `minLabelAngle` is dropped from the label data
  // entirely rather than drawn with text spilling over its neighbours. It exits cleanly
  // when the data shrinks it and re-enters when the data widens it again.
  //
  // The threshold only defaults to a non-zero angle for ON-ARC labels, where the text has to
  // fit inside the wedge. Outside placement removes that constraint — the reference chart
  // labels a 36-of-3000 sliver perfectly well — so it defaults to 0 there. An explicit config
  // value is honoured in BOTH modes, so slivers can still be suppressed deliberately. The
  // separate `> 0` guard keeps a zero-sweep slice unlabelled either way: a threshold of 0 must
  // not put text on a slice nobody can see.
  const minLabelAngle = config.minLabelAngle ?? (isOutsideLabels ? 0 : DEFAULT_MIN_LABEL_ANGLE);
  const labelData = config.showLabels
    ? arcs.filter(d => {
        const sweep = d.endAngle - d.startAngle;
        return sweep > 0 && sweep >= minLabelAngle;
      })
    : [];

  // Resolve outside placement + collisions once per render, keyed by slice label so the joins
  // below can look a placement up from their bound arc datum. The label column sits one elbow
  // offset beyond the arc, and the plot's own top / bottom edges in container coords are
  // ±cy — the container is translated to the pie center.
  const labelRadius = outerRadius + labelOffset;
  // Where the leader bends. Same radius as the label ring by default; shorter when
  // `leaderElbowOffset` decouples the stub from the label distance.
  const elbowRadius = outerRadius + leaderElbowOffset;
  const placements = new Map<string, PieOutsideLabel>(
    isOutsideLabels
      ? resolveOutsideLabels(
          labelData,
          labelRadius,
          labelLineHeight,
          -cy + labelLineHeight / 2,
          cy - labelLineHeight / 2,
          labelLayout
        ).map(placement => [placement.arc.data.label, placement])
      : []
  );

  // Interrupt in-flight label transitions before joining — same reason the arc join does
  // it. Labels fade in from opacity 0, so a re-render (resize, config change) that lands
  // mid-fade would otherwise leave the transition killed part-way and the label stuck
  // semi-transparent or fully invisible.
  container.selectAll('.nge-pie-label').interrupt();

  const labelSel = container
    .selectAll<SVGTextElement, PieArcDatum<NgePieDataPoint>>('.nge-pie-label')
    .data(labelData, d => d.data.label);

  labelSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // The container is already translated to the pie center, so an on-arc label's coordinates
  // are the raw arc centroid — the same anchor the tooltip points at. An outside label takes
  // the placement the collision pass resolved wholesale: x on its column or on the ring, y
  // after separation, and a `text-anchor` pointing the text away from the pie.
  const labelXFor = (d: PieArcDatum<NgePieDataPoint>): number =>
    placements.get(d.data.label)?.x ?? arcGen.centroid(d)[0];
  const labelYFor = (d: PieArcDatum<NgePieDataPoint>): number =>
    placements.get(d.data.label)?.y ?? arcGen.centroid(d)[1];
  const labelAnchorFor = (d: PieArcDatum<NgePieDataPoint>): string =>
    placements.get(d.data.label)?.anchor ?? 'middle';

  const enteredLabels = labelSel
    .enter()
    .append('text')
    .classed('nge-pie-label', true)
    .attr('data-label', d => d.data.label)
    .attr('dominant-baseline', 'middle')
    // Labels sit on top of their own slice — let hover / click fall through to the arc.
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', labelXFor)
    .attr('y', labelYFor);

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  // Survivors re-assert full opacity SYNCHRONOUSLY (entering labels are excluded — they
  // are still fading in above). Without this, a label whose fade was interrupted by a
  // re-render keeps whatever partial opacity it was killed at, and never recovers.
  labelSel.style('opacity', 1);

  // Re-apply anchor + text + styles to the merged selection so a runtime theme /
  // labelPosition / formatLabel change reaches already-rendered labels, not just
  // freshly-entered ones.
  enteredLabels
    .merge(labelSel)
    .attr('text-anchor', labelAnchorFor)
    .style('fill', labelFillFor)
    .style('font-size', toCssFontSize(labelTheme.fontSize))
    .style('font-weight', labelTheme.fontWeight)
    .text(d => config.formatLabel?.(d.data) ?? d.data.label);

  // Survivors slide to their new anchor as the slice they name reshapes.
  labelSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', labelXFor)
    .attr('y', labelYFor);

  // Leader lines — a THIRD keyed join, on the same slice label.
  //
  // `leaderLines` picks which outside labels earn one. The default `'displaced'` draws a
  // connector only where collision resolution moved a label off its natural anchor, so the
  // leaders appear exactly where the eye needs help tracing a label back to a thin wedge —
  // the rule the reference chart follows. `'all'` instead treats the connector as part of the
  // chart's grammar and draws one everywhere (a label at its natural anchor gets a short,
  // near-straight radial tick rather than an elbow); `'none'` suppresses them entirely.
  //
  // Three points: the arc's outer edge at the slice mid-angle → that SAME mid-angle carried
  // out to the label ring (a radial stub, so the connector leaves along the wedge's own
  // bearing) → the label's own attachment point. Interrupt + re-assert opacity for the same
  // reason the label join does (ARCH-194): a leader stranded half-faded by an interrupted
  // transition is the same bug class — and a runtime `leaderLines` switch is exactly the
  // re-render that would strand one.
  container.selectAll('.nge-pie-leader').interrupt();

  const leaderLines = config.leaderLines ?? 'displaced';
  const leaderData =
    isOutsideLabels && leaderLines !== 'none'
      ? labelData.filter(d => {
          const placement = placements.get(d.data.label);
          return !!placement && (leaderLines === 'all' || placement.displaced);
        })
      : [];

  const leaderPointsFor = (d: PieArcDatum<NgePieDataPoint>): string => {
    const placement = placements.get(d.data.label);
    if (!placement) {
      return '';
    }
    const midAngle = (d.startAngle + d.endAngle) / 2;
    const sin = Math.sin(midAngle);
    const cos = Math.cos(midAngle);
    return [
      // p0 — the slice's own outer edge, at its mid-angle.
      `${sin * outerRadius},${-cos * outerRadius}`,
      // p1 — the SAME mid-angle carried out to the elbow radius. Keeping the elbow on the
      // slice's own bearing (rather than jumping straight to the column x) is what makes the
      // first segment radial, so the connector visibly leaves the wedge it names instead of
      // reading as one long diagonal across the chart.
      `${sin * elbowRadius},${-cos * elbowRadius}`,
      // p2 — the label's attachment point. At the default elbow radius `naturalY` IS p1's y,
      // so a label the collision pass never moved gets a perfectly horizontal final segment
      // for free; a displaced one gets the run out to wherever it was pushed. A shorter
      // `leaderElbowOffset` trades that horizontal for a straight radial run instead — the
      // three points stay collinear on the slice's own bearing.
      `${placement.x},${placement.y}`,
    ].join(' ');
  };

  const leaderSel = container
    .selectAll<SVGPolylineElement, PieArcDatum<NgePieDataPoint>>('.nge-pie-leader')
    .data(leaderData, d => d.data.label);

  leaderSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredLeaders = leaderSel
    .enter()
    .append('polyline')
    .classed('nge-pie-leader', true)
    .attr('data-label', d => d.data.label)
    // A leader crosses its own slice — let hover / click fall through to the arc.
    .style('pointer-events', 'none')
    .style('fill', 'none')
    .style('opacity', 0)
    .attr('points', leaderPointsFor);

  enteredLeaders
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Survivors re-assert full opacity SYNCHRONOUSLY — see the label join above.
  leaderSel.style('opacity', 1);

  enteredLeaders
    .merge(leaderSel)
    .style('stroke', theme.leaderLine.stroke)
    .style('stroke-width', theme.leaderLine.strokeWidth);

  // Survivors follow their label to the new elbow as the slice reshapes.
  leaderSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('points', leaderPointsFor);

  // Tooltip event at the arc centroid, positioned in full-SVG coords (center offset +
  // margins) and clamped to the chart bounds — mirrors the bullet divot/clamp structure.
  const computeTooltipEvent = (d: PieArcDatum<NgePieDataPoint>): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const [mx, my] = arcGen.centroid(d);
    const sliceCenterX = margins.left + cx + mx;

    // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
    const idealTooltipX = sliceCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y sits above the centroid, clamped to the canvas so a top-edge slice's bubble
    // isn't clipped above the chart (mirrors the X clamp).
    const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + cy + my - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    // Divot points at the slice centroid (clamped within the bubble like bullet).
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = sliceCenterX - tooltipX;
    const idealDivotX = targetTipX - divotWidth / 2;
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    const content = tooltipConfig.formatContent(d.data);

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
      // Round all position values to avoid subpixel jitter.
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

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Cursor: pointer when the slice is interactive.
  merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Hover interactions for tooltip (re-attached on ALL slices to handle config changes).
  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, d: PieArcDatum<NgePieDataPoint>) => {
        const tooltipEvent = computeTooltipEvent(d);
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
  } else {
    merged.on('mouseenter', null).on('mouseleave', null);
  }

  // Click handler. Use the datum's own input-order index (`d.index`, stable under
  // sort(null)) — the same value the fill path uses.
  if (config.onClick) {
    merged.on('click', (event: PointerEvent, d: PieArcDatum<NgePieDataPoint>) => {
      config.onClick!({ data: d.data, event, index: d.index });
    });
  } else {
    merged.on('click', null);
  }
}
