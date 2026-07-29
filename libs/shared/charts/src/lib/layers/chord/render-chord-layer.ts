import type { Chord, ChordGroup, ChordSubgroup } from 'd3-chord';

import { ascending, descending } from 'd3-array';
import { chord, chordDirected, ribbon } from 'd3-chord';
import { interpolate } from 'd3-interpolate';
import { scaleSqrt } from 'd3-scale';
import { arc } from 'd3-shape';
import 'd3-transition';

import type { NgeChordLayerConfig, NgeGraphNode } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeChordLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { applyRadiusRatio, deriveGraphNodes } from '../../core/fns';
import {
  elideLabelText,
  measureLabelWidth,
  mergeChordLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';

/** A full turn, in radians — the span `d3-chord` always lays groups out across natively. */
const FULL_TURN = 2 * Math.PI;

/** Ring band thickness ratio when a layer config omits `innerRadius`. */
const DEFAULT_INNER_RADIUS = 0.9;

/** Gap (px) between a node's mark and its label when a layer config omits `labelPadding`. */
const DEFAULT_LABEL_PADDING = 6;

/**
 * Radial room (px) reserved past the ring for a circular label, before eliding. Fixed, like
 * the pie layer's outside-label gutter: the room actually available before the plot's clip
 * boundary varies by angle (a label pointing at a corner has more diagonal room than one
 * pointing along the short axis), and chasing that exactly is not worth the complexity the
 * pie layer already decided against — every label gets the same budget, and one whose natural
 * text is longer elides to fit it.
 */
const CIRCULAR_LABEL_GUTTER = 72;

/** Vertical room (px) reserved below the linear baseline for one line of label text. */
const LINEAR_LABEL_RESERVE = 16;

/**
 * Numeric font size (px) assumed when `theme.label.fontSize` is a CSS string `measureLabelWidth`
 * cannot parse into a number for its jsdom fallback (e.g. `var(--nge-chart-label-font-size,
 * 10px)`, the theme default). Matches that default's own literal fallback, so the common case
 * (no override) measures against the same number the token itself resolves to.
 */
const FALLBACK_LABEL_FONT_SIZE = 10;

/** Linear-layout node circle radius range (px) — scaled by each node's combined flow. */
const LINEAR_NODE_MIN_RADIUS = 4;
const LINEAR_NODE_MAX_RADIUS = 16;

/** Stroke width range (px) for a non-ribbon connection — circular `'edge'` or any linear arc. */
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 6;

/** `sortSubgroups` → the d3-chord comparator it selects. `'none'` leaves d3-chord's own order. */
const SORT_FNS: Record<
  'ascending' | 'descending' | 'none',
  ((a: number, b: number) => number) | null
> = {
  ascending,
  descending,
  none: null,
};

/**
 * Field the chord join key is stamped onto — read back by the key accessor on every render.
 *
 * Mirrors the sankey layer's `LINK_KEY_FIELD` idiom for the same reason: d3 evaluates the key
 * accessor against both the newly bound data AND the datum a currently-rendered element was
 * bound to on a PRIOR render. A key resolved by looking `source.index` / `target.index` up in
 * THIS render's node array would resolve an OLD Chord's indices against whatever node now sits
 * at that position — wrong the moment the node set has since changed. Stamping the resolved id
 * pair directly onto the Chord (a fresh object every render) makes the key self-contained.
 */
const CHORD_KEY_FIELD = 'ngeChordKey';

type KeyedChord = Chord & { [CHORD_KEY_FIELD]?: string };

/** A node once wrapped with its computed group angles + summed flow, for the ring-arc join. */
type ChordGroupDatum = ChordGroup & NgeGraphNode;

/** A ring-arc `<path>` node caches its last-drawn datum so enter/update can tween its angles. */
type ChordArcSvgNode = SVGPathElement & { _current?: ChordGroupDatum };

/** Where one circular label sits and how it reads — resolved once per render, tweened on update. */
interface LabelPlacement {
  /** Rotation about the anchor, in DEGREES, normalised to [0, 360). */
  rotate: number;
  /** Anchor x. */
  x: number;
  /** Anchor y. */
  y: number;
}

/** A circular label `<text>` node caches its last-drawn placement so the update tween can slide it. */
type ChordLabelSvgNode = SVGTextElement & { _current?: LabelPlacement };

/** Fold an angle in degrees into [0, 360) — `startAngle` is arbitrary, so raw degrees are too. */
function normaliseDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Compose a {@link LabelPlacement} into the `transform` attribute that realises it. */
function labelTransform(placement: LabelPlacement): string {
  return `translate(${placement.x},${placement.y}) rotate(${placement.rotate})`;
}

/**
 * A stroked semicircular connector between two baseline nodes — the Arc Diagram idiom.
 *
 * A TRUE semicircle (radius = half the x-distance) is what makes the arc's height read as "how
 * far apart these nodes sit" — the diagram's whole visual grammar. Built as a raw elliptical-arc
 * path rather than a `d3.arc()`/`d3.ribbon()` generator: neither generator draws a two-point
 * connector, and a hand-written `A` command is the standard idiom for this shape. Sweep-flag
 * `1`, going from the LEFT point to the RIGHT, is what bows the curve upward (smaller y) rather
 * than down through the plot floor.
 */
function arcLinkPath(x1: number, x2: number, baselineY: number): string {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const radius = Math.max(0.001, (right - left) / 2);
  return `M${left},${baselineY}A${radius},${radius} 0 0,1 ${right},${baselineY}`;
}

/**
 * Render a chord layer — a circular or linear diagram of weighted relationships between nodes,
 * folding three Data Viz Project catalog entries into one primitive via `layout` + `linkMark`.
 *
 * Self-scaled to `dimensions.boundedWidth × boundedHeight`; it ignores the shared cartesian
 * scales the way the sankey and radial layers do. `config.data` is a single {@link NgeGraph}
 * object rather than an array, the same shape exception the sankey layer makes — resolved to a
 * node set via `deriveGraphNodes` (shared with the legend extractor, so the two can never
 * disagree on order) and reduced to a square adjacency MATRIX, since `d3-chord` — unlike
 * `d3-sankey` — knows nothing about node or link objects, only numbers. Parallel input links
 * between the same pair sum into one matrix cell, and a link naming an unknown endpoint is
 * dropped rather than thrown on.
 *
 * `directed` selects `d3.chordDirected()` (two distinct chords for `A→B` / `B→A`) over the
 * default `d3.chord()` (one merged, asymmetric-ended chord). `layout: 'circular'` (default)
 * seats every node as a ring arc sized by its combined flow, with `linkMark` choosing filled
 * `d3.ribbon()` shapes (`'ribbon'`, the classic Chord Diagram) or thin stroked curves
 * (`'edge'`, the Non-ribbon Chord — the SAME ribbon geometry collapsed to zero width by
 * pointing both ends at their arc's own midpoint, so it traces the ribbon's centreline rather
 * than filling it). `layout: 'linear'` abandons the ring for a horizontal baseline of circles
 * (radius ∝ combined flow) joined by stroked semicircular arcs (`stroke-width` ∝ the chord's
 * own value) — the Arc Diagram, which ignores `linkMark` and always renders stroked.
 *
 * Ring arcs reshape via a sunburst-style angle tween (`attrTween('d', …)`, growing in from a
 * zero-sweep collapse); ribbons, edges, and every linear mark instead follow the sankey triad —
 * geometry written at its final position synchronously, opacity the only thing transitioned,
 * and survivors re-asserting resting opacity synchronously outside any transition (ARCH-194).
 * Nothing here transitions a `transform` directly: circular labels tween position through a
 * numeric `attrTween` exactly as the sunburst layer's labels do (AGENTS.md names chord as the
 * next layer to hit the `transform`-parsing trap sunburst / funnel / wordcloud already avoid).
 */
export function renderChordLayer(
  context: NgeChartLayerContext<
    NgeGraphNode,
    NgeChordLayerConfig,
    NgeChordLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds) {
    return;
  }

  const theme = mergeChordLayerTheme(context.theme);

  let container = bounds.select<SVGGElement>('.nge-chord-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-chord-container', true);
  }

  /** Drop every mark — the shared bail-out for empty, degenerate, or unmeasurable input. */
  const clear = (): void => {
    container.selectAll('.nge-chord-arc').interrupt().remove();
    container.selectAll('.nge-chord-node').interrupt().remove();
    container.selectAll('.nge-chord-link').interrupt().remove();
    container.selectAll('.nge-chord-label').interrupt().remove();
  };

  const graph = config.data;
  const { boundedHeight, boundedWidth } = dimensions;

  // A chart renders once before its container is measured; laying out into a zero-size extent
  // yields NaN geometry rather than an error.
  if (!graph?.links?.length || boundedWidth <= 0 || boundedHeight <= 0) {
    clear();
    return;
  }

  // `deriveGraphNodes` hands back the caller's OWN array and node objects by reference in the
  // explicit-`nodes` branch — copy before anything here writes computed geometry, so the
  // caller's config object stays reusable across re-renders (the same reason the sankey layer
  // copies before `d3-sankey` mutates its input).
  const nodeData: NgeGraphNode[] = deriveGraphNodes(graph).map(node => ({ ...node }));

  if (nodeData.length === 0) {
    clear();
    return;
  }

  const layout = config.layout ?? 'circular';
  const linkMark = config.linkMark ?? 'ribbon';
  const directed = config.directed ?? false;

  // Radial (`<path>`) and linear (`<circle>`) node marks use DIFFERENT class names (not a
  // shared one disambiguated by a `data-layout` attribute, the way the sunburst layer's radial
  // `<path>` / linear `<rect>` segments do) — the two node marks and their surrounding links
  // are different enough shapes that the story-facing selectors read clearer split out. That
  // means a runtime `layout` flip leaves the OLD layout's marks selected by nothing the new
  // layout's joins look for, so they would never enter an exit transition — stamp the rendered
  // layout and clear every mark class when it changes, before any join runs.
  if (container.attr('data-layout') !== layout) {
    container
      .selectAll('.nge-chord-arc, .nge-chord-node, .nge-chord-link, .nge-chord-label')
      .interrupt()
      .remove();
    container.attr('data-layout', layout);
  }

  // ── Matrix adapter ──────────────────────────────────────────────────────────────────────
  // `d3-chord` operates on a plain n×n matrix, oblivious to node/link identity — resolve each
  // link's endpoints against the node set and accumulate; an endpoint outside the set is
  // dropped rather than thrown on, matching the sankey layer's tolerance for a link naming an
  // unknown node.
  const indexById = new Map<string, number>(nodeData.map((node, i) => [node.id, i]));
  const n = nodeData.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  // Records the first EXPLICIT per-link `color` seen for a node pair, so an aggregated chord
  // can still honour it — `NgeGraphLink.color` is real, documented API surface, and silently
  // dropping it the moment two parallel links merge into one matrix cell would be a surprising
  // gap. First-seen wins (deterministic), matching the first-seen-order convention the rest of
  // this graph family uses for node derivation.
  const pairKey = (a: string, b: string): string =>
    directed ? `${a}->${b}` : [a, b].sort().join('<->');
  const linkColorByPair = new Map<string, string>();

  for (const link of graph.links) {
    const i = indexById.get(link.source);
    const j = indexById.get(link.target);
    if (i === undefined || j === undefined) {
      continue;
    }

    matrix[i][j] += Math.max(0, link.value);

    if (link.color) {
      const key = pairKey(link.source, link.target);
      if (!linkColorByPair.has(key)) {
        linkColorByPair.set(key, link.color);
      }
    }
  }

  const layoutFn = directed ? chordDirected() : chord();
  layoutFn.padAngle(config.padAngle ?? 0).sortSubgroups(SORT_FNS[config.sortSubgroups ?? 'none']);

  const chordsResult = layoutFn(matrix);

  // Stamp a self-contained join key onto each chord — see {@link CHORD_KEY_FIELD}.
  const counts = new Map<string, number>();
  for (const c of chordsResult as KeyedChord[]) {
    const a = nodeData[c.source.index].id;
    const b = nodeData[c.target.index].id;
    const base = pairKey(a, b);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    c[CHORD_KEY_FIELD] = seen === 0 ? base : `${base}#${seen}`;
  }
  const chordKey = (c: Chord): string => String((c as KeyedChord)[CHORD_KEY_FIELD] ?? '');

  // Remap d3-chord's native [0, 2π] group angles into the configured span — d3-chord has no
  // `.size()` / start-end option of its own (unlike `d3.pie()`), so a partial-turn span has to
  // be applied as a post-hoc linear remap. `padAngle` is set on the LAYOUT above (native
  // [0, 2π] space) rather than re-derived after the remap, so a partial span compresses the
  // whole diagram — pads included — proportionally, the same "the whole layout scales into
  // whatever span you gave it" semantics the sunburst layer's `partition().size([span, …])` has.
  const startAngle = config.startAngle ?? 0;
  const endAngle = config.endAngle ?? FULL_TURN;
  const angleSpan = endAngle - startAngle;
  const remapAngle = (angle: number): number => startAngle + (angle / FULL_TURN) * angleSpan;

  // Node fill: per-node `color` → palette by node index → the single-node fallback.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.node.colors;
  const nodeFill = (node: NgeGraphNode, index: number): string =>
    node.color ?? palette[index % palette.length] ?? theme.node.color;

  // Link fill: an explicit per-pair override → its SOURCE node's resolved colour → the theme
  // fallback. Inheriting the source forward is what lets a reader follow a flow out of where
  // it came from — the same rule the sankey layer's links use, and the rule the legend
  // extractor's node colouring has to keep matching (the whole point of ARCH-200's #14).
  const linkFill = (c: Chord): string => {
    const key = pairKey(nodeData[c.source.index].id, nodeData[c.target.index].id);
    return (
      linkColorByPair.get(key) ??
      nodeFill(nodeData[c.source.index], c.source.index) ??
      theme.link.color
    );
  };

  // Stroke width for a non-filled connection (circular 'edge', or any linear arc) scales with
  // the chord's own dominant-direction value, the same magnitude a ribbon's asymmetric ends
  // already encode as WIDTH — an undirected chord's `source.value` is, by `d3.chord()`'s own
  // contract, the larger of the two directions, so this reduces to "the" value for a directed
  // chord (which only ever has one).
  const maxChordValue = Math.max(1, ...chordsResult.map(c => c.source.value));
  const strokeWidthScale = scaleSqrt()
    .domain([0, maxChordValue])
    .range([MIN_STROKE_WIDTH, MAX_STROKE_WIDTH]);

  const labelPadding = config.labelPadding ?? DEFAULT_LABEL_PADDING;
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;
  const styleHost = bounds.node();

  /**
   * Tooltip bubble anchored above an ANCHOR point already in container-local coords, offset by
   * the container's own origin and clamped to the canvas — mirrors the pie / sunburst / sankey
   * divot + clamp structure exactly, parameterised so both layouts share it.
   */
  const buildTooltipEvent = (
    node: NgeGraphNode,
    anchorX: number,
    anchorY: number,
    originX: number,
    originY: number
  ): NgeTooltipEvent | null => {
    if (!tooltipConfig?.formatContent) {
      return null;
    }

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const centerX = margins.left + originX + anchorX;
    const centerY = originY + anchorY;

    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, centerX - tooltipWidth / 2));

    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + centerY - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = centerX - tooltipX;
    const divotX = Math.max(
      rx,
      Math.min(tooltipWidth - rx - divotWidth, targetTipX - divotWidth / 2)
    );
    const divotTipOffset = targetTipX - (divotX + divotWidth / 2);

    const content = tooltipConfig.formatContent(node);

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

  const hideTooltipEvent = (): NgeTooltipEvent => ({
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  });

  if (layout === 'circular') {
    // ── Circular geometry ──────────────────────────────────────────────────────────────────
    const cx = boundedWidth / 2;
    const cy = boundedHeight / 2;
    const labelReserve = config.showLabels ? labelPadding + CIRCULAR_LABEL_GUTTER : 0;
    // Subtracting ONE reserve from the half-dimension (rather than subtracting it from EACH
    // full dimension before halving, the way the pie layer's `labelGutter` /
    // `verticalLabelReserve` split does) is only equivalent when the reserve is the SAME on
    // every side — true here because a chord label sits at `outerRadius + padding` all the
    // way around the ring, an inherently RADIAL (isotropic) budget, unlike pie's outside
    // labels, which reserve WIDTH for side columns and HEIGHT for the ring's top/bottom
    // separately. If a future option ever made this reserve directional, this shape would
    // silently halve it — reach for pie's `Math.min(w - 2*r, h - 2*r) / 2` form instead.
    const outerRadius = applyRadiusRatio(
      Math.max(0, Math.min(boundedWidth, boundedHeight) / 2 - labelReserve),
      config.radiusRatio
    );
    const innerRadiusRatio = config.innerRadius ?? DEFAULT_INNER_RADIUS;
    const innerRadiusPx = innerRadiusRatio * outerRadius;

    container.attr('transform', `translate(${cx},${cy})`);

    const groupData: ChordGroupDatum[] = chordsResult.groups.map((g, i) => ({
      ...nodeData[i],
      ...g,
    }));

    const groupArcGen = arc<ChordGroupDatum>()
      .startAngle(g => remapAngle(g.startAngle))
      .endAngle(g => remapAngle(g.endAngle))
      .innerRadius(innerRadiusPx)
      .outerRadius(outerRadius);

    // Reshape tween: interpolate the cached `_current` datum → the target so an arc grows in
    // from a zero-sweep collapse (enter) and morphs smoothly (update) — the pie / sunburst
    // idiom. Interpolating the WHOLE datum (including its non-numeric `id` / `label`) is safe
    // because only `startAngle` / `endAngle` are ever read back out of it, exactly as the pie
    // layer's own `arcTween` does against its full `PieArcDatum`.
    function groupArcTween(this: SVGPathElement, d: ChordGroupDatum): (t: number) => string {
      const node = this as ChordArcSvgNode;
      const start = node._current ?? { ...d, endAngle: d.startAngle, startAngle: d.startAngle };
      const interpolator = interpolate(start, d);
      return (t: number) => {
        const interpolated = interpolator(t);
        node._current = interpolated;
        return groupArcGen(interpolated) ?? '';
      };
    }

    // ── Ring arcs (nodes) ──────────────────────────────────────────────────────────────────
    let arcGroup = container.select<SVGGElement>('.nge-chord-arcs');
    if (arcGroup.empty()) {
      arcGroup = container.append('g').classed('nge-chord-arcs', true);
    }

    arcGroup.selectAll('.nge-chord-arc').interrupt();

    const arcSel = arcGroup
      .selectAll<SVGPathElement, ChordGroupDatum>('.nge-chord-arc')
      .data(groupData, d => d.id);

    arcSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredArcs = arcSel
      .enter()
      .append('path')
      .classed('nge-chord-arc', true)
      .attr('data-node', d => d.id)
      .each(function (d) {
        (this as ChordArcSvgNode)._current = {
          ...d,
          endAngle: d.startAngle,
          startAngle: d.startAngle,
        };
      });

    enteredArcs
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .attrTween('d', groupArcTween);
    arcSel
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attrTween('d', groupArcTween);

    const mergedArcs = enteredArcs.merge(arcSel);

    mergedArcs
      .style('fill', (d, i) => nodeFill(d, i))
      .style('stroke', theme.node.stroke)
      .style('stroke-width', theme.node.strokeWidth)
      .style('opacity', theme.node.opacity);

    // ── Links (ribbons or edges) ───────────────────────────────────────────────────────────
    const isRibbon = linkMark === 'ribbon';

    const ribbonGen = ribbon<Chord, ChordSubgroup>()
      .radius(innerRadiusPx)
      .startAngle(sub => remapAngle(sub.startAngle))
      .endAngle(sub => remapAngle(sub.endAngle));

    // A ribbon whose start AND end angle are both the arc's own midpoint collapses to a
    // zero-width path — visually a thin curve tracing the ribbon's centreline rather than
    // filling it, so 'edge' mode reuses the exact same generator instead of a hand-rolled one.
    const edgeGen = ribbon<Chord, ChordSubgroup>()
      .radius(innerRadiusPx)
      .startAngle(sub => remapAngle((sub.startAngle + sub.endAngle) / 2))
      .endAngle(sub => remapAngle((sub.startAngle + sub.endAngle) / 2));

    // `RibbonGenerator`'s call signature is overloaded on `.context()`: unset (never called
    // here) it returns a path string, set it draws to a canvas context and returns `void`.
    // The two overloads differ ONLY in return type, so TypeScript's overload resolution — a
    // property of the declared signatures, not of strictness settings — always picks the
    // FIRST one, and depending on which `d3-chord` typings a consumer's `moduleResolution`
    // resolves (the package's own shipped types under `bundler`, vs `@types/d3-chord`'s under
    // `node`), that first overload is `void`, close enough to `string | null` for a direct
    // assertion under one and NOT the other (TS2352). Routing through `unknown` sidesteps
    // that regardless of which typings resolve — the runtime value is always a string (no
    // context is ever set here, so the draw-to-canvas branch never runs either way).
    const linkPathFn = (c: Chord): string =>
      ((isRibbon ? ribbonGen(c) : edgeGen(c)) as unknown as null | string) ?? '';

    let linkGroup = container.select<SVGGElement>('.nge-chord-links');
    if (linkGroup.empty()) {
      linkGroup = container.append('g').classed('nge-chord-links', true);
    }

    linkGroup.selectAll('.nge-chord-link').interrupt();

    const linkSel = linkGroup
      .selectAll<SVGPathElement, Chord>('.nge-chord-link')
      .data(chordsResult, chordKey);

    linkSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredLinks = linkSel
      .enter()
      .append('path')
      .classed('nge-chord-link', true)
      .attr('data-link', chordKey)
      .style('opacity', 0);

    const mergedLinks = enteredLinks.merge(linkSel);
    mergedLinks
      .attr('d', linkPathFn)
      .style('fill', (c: Chord) => (isRibbon ? linkFill(c) : 'none'))
      .style('stroke', (c: Chord) => (isRibbon ? 'none' : linkFill(c)))
      .style('stroke-width', (c: Chord) => (isRibbon ? null : strokeWidthScale(c.source.value)));

    enteredLinks
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', theme.link.opacity);

    // Survivors re-assert resting opacity SYNCHRONOUSLY (entering links excluded — still
    // fading in). Without this a link whose fade was cut short by a re-render keeps whatever
    // partial opacity it was interrupted at, permanently (ARCH-194).
    linkSel.style('opacity', theme.link.opacity);

    mergedLinks
      .on('mouseenter.nge-chord-hover', function () {
        this.style.opacity = String(theme.link.opacityHover);
      })
      .on('mouseleave.nge-chord-hover', function () {
        this.style.opacity = String(theme.link.opacity);
      });

    // ── Interaction (node arcs only — the config's `onClick` / tooltip are node-scoped) ────
    mergedArcs.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

    if (tooltipEnabled) {
      mergedArcs
        .on('mouseenter', (_event: PointerEvent, d: ChordGroupDatum) => {
          const [ax, ay] = groupArcGen.centroid(d);
          const tooltipEvent = buildTooltipEvent(d, ax, ay, cx, cy);
          if (tooltipEvent) {
            tooltipHandlers!.onTooltip(tooltipEvent);
          }
        })
        .on('mouseleave', () => tooltipHandlers!.onTooltip(hideTooltipEvent()));
    } else {
      mergedArcs.on('mouseenter', null).on('mouseleave', null);
    }

    if (config.onClick) {
      mergedArcs.on('click', (event: PointerEvent, d: ChordGroupDatum) => {
        config.onClick!({ data: d, event, index: d.index });
      });
    } else {
      mergedArcs.on('click', null);
    }

    // ── Labels ─────────────────────────────────────────────────────────────────────────────
    let labelGroup = container.select<SVGGElement>('.nge-chord-labels');
    if (labelGroup.empty()) {
      labelGroup = container.append('g').classed('nge-chord-labels', true);
    }
    labelGroup.raise();

    labelGroup.selectAll('.nge-chord-label').interrupt();

    const labelData = config.showLabels ? groupData : [];
    const labelRadius = outerRadius + labelPadding;

    /**
     * A circular label sits past the ring, rotated so it runs radially outward — the classic
     * chord-diagram idiom, `rotate(mid − 90) translate(labelRadius, 0) rotate(flip)` folded
     * into one anchor + rotation, the same shape the sunburst layer's radial labels use. The
     * left hemisphere takes a further 180° (and flips its text-anchor) so the text is never
     * upside down.
     */
    const placementFor = (d: ChordGroupDatum): LabelPlacement => {
      const midAngle = remapAngle((d.startAngle + d.endAngle) / 2);
      const deg = normaliseDegrees((midAngle * 180) / Math.PI);
      const baseline = deg - 90;
      const flip = deg < 180 ? 0 : 180;
      const radians = (baseline * Math.PI) / 180;
      return {
        rotate: normaliseDegrees(baseline + flip),
        x: labelRadius * Math.cos(radians),
        y: labelRadius * Math.sin(radians),
      };
    };
    const anchorFor = (d: ChordGroupDatum): 'end' | 'start' => {
      const midAngle = remapAngle((d.startAngle + d.endAngle) / 2);
      return normaliseDegrees((midAngle * 180) / Math.PI) < 180 ? 'start' : 'end';
    };

    const labelSel = labelGroup
      .selectAll<SVGTextElement, ChordGroupDatum>('.nge-chord-label')
      .data(labelData, d => d.id);

    labelSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredLabels = labelSel
      .enter()
      .append('text')
      .classed('nge-chord-label', true)
      .attr('data-label', d => d.id)
      .attr('dominant-baseline', 'middle')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .each(function (d) {
        (this as ChordLabelSvgNode)._current = placementFor(d);
      })
      .attr('transform', d => labelTransform(placementFor(d)));

    enteredLabels
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', 1);
    labelSel.style('opacity', 1);

    enteredLabels
      .merge(labelSel)
      .attr('text-anchor', anchorFor)
      .style('fill', d =>
        resolveLabelColor({
          configColor: config.labelColor,
          datumColor: d.labelColor,
          // A chord label never sits on a mark — see the layer config's own JSDoc — so there
          // is no fill to derive contrast against.
          fill: '',
          node: styleHost,
          theme: theme.label,
        })
      )
      .style('font-size', toCssFontSize(theme.label.fontSize))
      .style('font-weight', theme.label.fontWeight)
      .each(function (d) {
        const text = config.formatLabel?.(d) ?? d.label ?? d.id;
        elideLabelText(this, text, CIRCULAR_LABEL_GUTTER);
      });

    /** Slide a survivor to its new anchor — an explicit numeric tween, never a transitioned
     * `transform` attribute (jsdom cannot parse `transform.baseVal`; AGENTS.md names chord). */
    function placementTween(this: SVGTextElement, d: ChordGroupDatum): (t: number) => string {
      const node = this as ChordLabelSvgNode;
      const target = placementFor(d);
      const start = node._current ?? target;
      const interpolator = interpolate({ x: start.x, y: start.y }, { x: target.x, y: target.y });
      return (t: number) => {
        const { x, y } = interpolator(t);
        node._current = { rotate: target.rotate, x, y };
        return labelTransform(node._current);
      };
    }

    labelSel
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attrTween('transform', placementTween);
  } else {
    // ── Linear geometry (Arc Diagram) ──────────────────────────────────────────────────────
    container.attr('transform', 'translate(0,0)');

    const maxGroupValue = Math.max(1, ...chordsResult.groups.map(g => g.value));
    const radiusScale = scaleSqrt()
      .domain([0, maxGroupValue])
      .range([LINEAR_NODE_MIN_RADIUS, LINEAR_NODE_MAX_RADIUS]);

    const nodeRadius = (index: number): number =>
      radiusScale(chordsResult.groups[index]?.value ?? 0);
    const maxNodeRadius = Math.max(...nodeData.map((_, i) => nodeRadius(i)));

    // Reserve horizontal room for whichever ENDPOINT label (index 0 or n-1) is widest. Its
    // `text-anchor: middle` centres it on a node that otherwise sits only `maxNodeRadius` from
    // the plot edge — a middle node's neighbour-collision bound (`labelMaxWidth`, below) does
    // NOT protect against this, since a label can be nowhere near colliding with its neighbour
    // and still overhang x=0 / boundedWidth the moment its own half-width exceeds that gap.
    // Real bug (found driving the chart in a browser): "Northeast" rendered as "rtheast" — the
    // layers-group clip-path silently discards whichever end overhangs, and jsdom neither lays
    // text out nor clips, so the spec stayed green while the browser showed the truncation.
    // Measured through the shared `measureLabelWidth()` — the same helper the eliding below
    // calls — via a throwaway probe node, so jsdom's lack of real text layout degrades
    // identically here and there rather than this reserve disagreeing with the eliding bound.
    let endpointLabelHalfWidth = 0;
    if (config.showLabels) {
      const probe = bounds
        .append('text')
        .style('font-size', toCssFontSize(theme.label.fontSize))
        .node();
      if (probe) {
        const parsedFontSize =
          typeof theme.label.fontSize === 'number'
            ? theme.label.fontSize
            : parseFloat(theme.label.fontSize);
        const fallbackFontSize = Number.isFinite(parsedFontSize)
          ? parsedFontSize
          : FALLBACK_LABEL_FONT_SIZE;

        for (const i of n > 1 ? [0, n - 1] : [0]) {
          const node = nodeData[i];
          const withValue = { ...node, value: chordsResult.groups[i]?.value ?? 0 };
          const text = config.formatLabel?.(withValue) ?? node.label ?? node.id;
          const width = measureLabelWidth(probe, text, fallbackFontSize);
          endpointLabelHalfWidth = Math.max(endpointLabelHalfWidth, width / 2);
        }
        probe.remove();
      }
    }

    const xPad = Math.max(maxNodeRadius, endpointLabelHalfWidth + labelPadding);
    const usableWidth = Math.max(0, boundedWidth - 2 * xPad);
    const spacing = n > 1 ? usableWidth / (n - 1) : 0;
    const nodeX = (index: number): number => (n > 1 ? xPad + index * spacing : boundedWidth / 2);

    // The baseline sits low enough for the WIDEST arc's peak to stay in bounds, but no lower
    // than leaves room for the tallest circle plus (when shown) one line of label text below
    // it. A hemisphere taller than the plot itself clamps to the bottom reserve instead —
    // spending any shortfall on the arcs rather than clipping a node or its label, the same
    // trade-off the pie layer's outside-label overflow makes deliberately.
    const labelReserve = config.showLabels ? labelPadding + LINEAR_LABEL_RESERVE : 0;
    let maxArcRadius = 0;
    for (const c of chordsResult) {
      const distance = Math.abs(nodeX(c.target.index) - nodeX(c.source.index)) / 2;
      maxArcRadius = Math.max(maxArcRadius, distance);
    }
    const topReserve = Math.max(maxArcRadius, maxNodeRadius);
    const bottomReserve = maxNodeRadius + labelReserve;
    const baselineY = Math.max(maxNodeRadius, Math.min(topReserve, boundedHeight - bottomReserve));

    // ── Links (arcs) ───────────────────────────────────────────────────────────────────────
    let linkGroup = container.select<SVGGElement>('.nge-chord-links');
    if (linkGroup.empty()) {
      linkGroup = container.append('g').classed('nge-chord-links', true);
    }

    linkGroup.selectAll('.nge-chord-link').interrupt();

    const linkSel = linkGroup
      .selectAll<SVGPathElement, Chord>('.nge-chord-link')
      .data(chordsResult, chordKey);

    linkSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredLinks = linkSel
      .enter()
      .append('path')
      .classed('nge-chord-link', true)
      .attr('data-link', chordKey)
      .style('fill', 'none')
      .style('opacity', 0);

    const mergedLinks = enteredLinks.merge(linkSel);
    mergedLinks
      .attr('d', c => arcLinkPath(nodeX(c.source.index), nodeX(c.target.index), baselineY))
      .style('stroke', linkFill)
      .style('stroke-width', c => strokeWidthScale(c.source.value));

    enteredLinks
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', theme.link.opacity);

    linkSel.style('opacity', theme.link.opacity);

    mergedLinks
      .on('mouseenter.nge-chord-hover', function () {
        this.style.opacity = String(theme.link.opacityHover);
      })
      .on('mouseleave.nge-chord-hover', function () {
        this.style.opacity = String(theme.link.opacity);
      });

    // ── Nodes (circles) ────────────────────────────────────────────────────────────────────
    let nodeGroup = container.select<SVGGElement>('.nge-chord-nodes');
    if (nodeGroup.empty()) {
      nodeGroup = container.append('g').classed('nge-chord-nodes', true);
    }
    nodeGroup.raise();

    nodeGroup.selectAll('.nge-chord-node').interrupt();

    const nodeSel = nodeGroup
      .selectAll<SVGCircleElement, NgeGraphNode>('.nge-chord-node')
      .data(nodeData, d => d.id);

    nodeSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredNodes = nodeSel
      .enter()
      .append('circle')
      .classed('nge-chord-node', true)
      .attr('data-node', d => d.id)
      .style('opacity', 0);

    const mergedNodes = enteredNodes.merge(nodeSel);
    mergedNodes
      .attr('cx', d => nodeX(indexById.get(d.id) ?? 0))
      .attr('cy', baselineY)
      .attr('r', d => nodeRadius(indexById.get(d.id) ?? 0))
      .style('fill', (d, i) => nodeFill(d, indexById.get(d.id) ?? i))
      .style('stroke', theme.node.stroke)
      .style('stroke-width', theme.node.strokeWidth);

    // Opacity is deliberately NOT set on `mergedNodes` above — this mark follows the sankey
    // triad (synchronous geometry, opacity the only thing transitioned), so setting it there
    // too would apply the resting value to an ENTERING node before its fade-in transition
    // below ever reads a starting point, defeating the fade outright (ARCH-200, AGENTS.md).
    enteredNodes
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', theme.node.opacity);

    // Survivors re-assert resting opacity SYNCHRONOUSLY (entering nodes excluded — still
    // fading in). Without this a node whose fade was cut short by a re-render keeps whatever
    // partial opacity it was interrupted at, permanently (ARCH-194).
    nodeSel.style('opacity', theme.node.opacity);

    mergedNodes.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

    if (tooltipEnabled) {
      mergedNodes
        .on('mouseenter', (_event: PointerEvent, d: NgeGraphNode) => {
          const i = indexById.get(d.id) ?? 0;
          const withValue: NgeGraphNode = { ...d, value: chordsResult.groups[i]?.value ?? 0 };
          const tooltipEvent = buildTooltipEvent(withValue, nodeX(i), baselineY, 0, 0);
          if (tooltipEvent) {
            tooltipHandlers!.onTooltip(tooltipEvent);
          }
        })
        .on('mouseleave', () => tooltipHandlers!.onTooltip(hideTooltipEvent()));
    } else {
      mergedNodes.on('mouseenter', null).on('mouseleave', null);
    }

    if (config.onClick) {
      mergedNodes.on('click', (event: PointerEvent, d: NgeGraphNode) => {
        const i = indexById.get(d.id) ?? 0;
        config.onClick!({
          data: { ...d, value: chordsResult.groups[i]?.value ?? 0 },
          event,
          index: i,
        });
      });
    } else {
      mergedNodes.on('click', null);
    }

    // ── Labels ─────────────────────────────────────────────────────────────────────────────
    let labelGroup = container.select<SVGGElement>('.nge-chord-labels');
    if (labelGroup.empty()) {
      labelGroup = container.append('g').classed('nge-chord-labels', true);
    }
    labelGroup.raise();

    labelGroup.selectAll('.nge-chord-label').interrupt();

    const labelData = config.showLabels ? nodeData : [];
    const labelY = baselineY + maxNodeRadius + labelPadding;
    const labelMaxWidth = Math.max(0, spacing - labelPadding);

    const labelSel = labelGroup
      .selectAll<SVGTextElement, NgeGraphNode>('.nge-chord-label')
      .data(labelData, d => d.id);

    labelSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredLabels = labelSel
      .enter()
      .append('text')
      .classed('nge-chord-label', true)
      .attr('data-label', d => d.id)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    enteredLabels
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', 1);
    labelSel.style('opacity', 1);

    enteredLabels
      .merge(labelSel)
      .attr('x', d => nodeX(indexById.get(d.id) ?? 0))
      .attr('y', labelY)
      .style('fill', d =>
        resolveLabelColor({
          configColor: config.labelColor,
          datumColor: d.labelColor,
          fill: '',
          node: styleHost,
          theme: theme.label,
        })
      )
      .style('font-size', toCssFontSize(theme.label.fontSize))
      .style('font-weight', theme.label.fontWeight)
      .each(function (d) {
        const i = indexById.get(d.id) ?? 0;
        const withValue = { ...d, value: chordsResult.groups[i]?.value ?? 0 };
        const text = config.formatLabel?.(withValue) ?? d.label ?? d.id;
        elideLabelText(this, text, n > 1 ? labelMaxWidth : boundedWidth);
      });
  }
}
