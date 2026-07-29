import type { HierarchyCircularNode, HierarchyNode } from 'd3-hierarchy';

import { hierarchy, pack } from 'd3-hierarchy';
import { interpolate } from 'd3-interpolate';
import 'd3-transition';

import type {
  NgeHierarchyDatum,
  NgeProportionalLayerConfig,
  NgeProportionalMark,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeProportionalLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import {
  elideLabelText,
  mergeProportionalLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';

/**
 * The three primitives every mark reduces to. A waffle cell is a `'square'` and a packed leaf
 * is a `'circle'`, so the five public `mark` values share one path builder and one join.
 */
type ProportionalShape = 'circle' | 'half-circle' | 'square';

/** Placeholder datum for a waffle's unfilled remainder cells, which name no category. */
const EMPTY_DATUM: NgeHierarchyDatum = { label: '', value: 0 };

/** Default waffle grid — 10 x 10 reads each cell as one percentage point. */
const DEFAULT_GRID_ROWS = 10;
const DEFAULT_GRID_COLUMNS = 10;

/** Default separation between marks (px) — grid gutter, pack padding, row slot inset. */
const DEFAULT_PADDING = 2;

/** Default smallest mark width (px) that still earns a label. */
const DEFAULT_MIN_LABEL_SIZE = 24;

/** Fraction of a mark's width a label may occupy before it is elided. */
const LABEL_WIDTH_RATIO = 0.9;

/**
 * A half-circle's label sits in the band above its flat edge, which is shorter than the
 * shape's full width — so it gets a tighter text budget than a circle or square.
 */
const HALF_CIRCLE_LABEL_WIDTH_RATIO = 0.8;

/** One resolved mark: pixel geometry plus the source datum (tooltip / click payload). */
interface ProportionalMark {
  /** Centroid x (px) — the label anchor and the tooltip anchor. */
  cx: number;
  /**
   * Centroid y (px). For `'half-circle'` this is the FLAT EDGE, which the shape bulges up
   * from; for `'circle'` / `'square'` it is the true centre.
   */
  cy: number;
  /** Source datum — kept by reference so click/tooltip payloads carry datum identity. */
  datum: NgeHierarchyDatum;
  /** A waffle remainder cell: drawn from `theme.emptyCell`, never interactive, never labelled. */
  empty: boolean;
  /** Top-level input index — the palette / click-payload index. */
  index: number;
  /** Join key — stable across re-renders so survivors keep their identity. */
  key: string;
  /** Whether this mark carries its datum's label (one mark per datum does). */
  labelled: boolean;
  /** The datum's own magnitude, summed over its subtree — the formatter / tooltip value. */
  magnitude: number;
  /** Which primitive to draw. */
  shape: ProportionalShape;
  /**
   * The mark's linear dimension in px: a circle's / half-circle's diameter, a square's side.
   * Scaled as `√(value / max)` so AREA — not width — is proportional to the value.
   */
  size: number;
}

/** Numeric-only slice of `ProportionalMark` interpolated by the enter/update tween. */
type ProportionalGeom = Pick<ProportionalMark, 'cx' | 'cy' | 'size'>;

/**
 * A mark `<path>` node caches its last-drawn geometry (`_current`) so the enter/update
 * transition can interpolate centroid + size smoothly (grow-in + reflow), mirroring the
 * funnel layer's `_current` band cache.
 */
type ProportionalNode = SVGPathElement & { _current?: ProportionalGeom };

/** Build the path for one mark. `size` is the full width in every case. */
function markPath(shape: ProportionalShape, cx: number, cy: number, size: number): string {
  const half = size / 2;

  if (shape === 'square') {
    return `M${cx - half},${cy - half} h${size} v${size} h${-size} Z`;
  }

  if (shape === 'half-circle') {
    // Flat edge on `cy`, bulging upward. Area is πr²/2 — still proportional to size².
    return `M${cx - half},${cy} A${half},${half} 0 0 1 ${cx + half},${cy} Z`;
  }

  // Two half-arcs, so a zero radius degenerates cleanly instead of emitting NaN.
  return `M${cx - half},${cy} a${half},${half} 0 1 0 ${size},0 a${half},${half} 0 1 0 ${-size},0 Z`;
}

/** The primitive each public `mark` value draws. */
function shapeFor(mark: NgeProportionalMark): ProportionalShape {
  switch (mark) {
    case 'grid':
      return 'square';
    case 'half-circle':
      return 'half-circle';
    case 'packed':
      return 'circle';
    case 'square':
      return 'square';
    default:
      return 'circle';
  }
}

/**
 * Lay the single-shape marks out side by side, one evenly-sized slot each. Circles and squares
 * are centred on the plot's mid-line; half-circles stand on its floor, which is what makes a
 * row of them read as rising from one baseline.
 */
function layoutRow(
  entries: { datum: NgeHierarchyDatum; magnitude: number }[],
  shape: ProportionalShape,
  boundedWidth: number,
  boundedHeight: number,
  maxMagnitude: number,
  padding: number
): ProportionalMark[] {
  const slot = boundedWidth / entries.length;
  // A half-circle is only half as tall as it is wide, so it may grow to twice the height.
  const verticalRoom = shape === 'half-circle' ? boundedHeight * 2 : boundedHeight;
  const maxSize = Math.max(0, Math.min(slot - padding, verticalRoom));

  return entries.map((entry, index) => {
    const size = maxSize * Math.sqrt(Math.max(0, entry.magnitude) / maxMagnitude);

    return {
      cx: index * slot + slot / 2,
      cy: shape === 'half-circle' ? boundedHeight : boundedHeight / 2,
      datum: entry.datum,
      empty: false,
      index,
      key: entry.datum.label,
      labelled: true,
      magnitude: entry.magnitude,
      shape,
      size,
    };
  });
}

/**
 * Stack the single-shape marks concentrically on one bottom baseline, largest first, so the
 * smaller ones sit inside the larger — the Nested Proportional Area form. Marks are emitted
 * in descending size so the DOM order (and therefore the paint order) puts the small ones on
 * top; `index` still tracks INPUT order so the palette and click payloads are unaffected.
 */
function layoutNested(
  entries: { datum: NgeHierarchyDatum; magnitude: number }[],
  shape: ProportionalShape,
  boundedWidth: number,
  boundedHeight: number,
  maxMagnitude: number
): ProportionalMark[] {
  const verticalRoom = shape === 'half-circle' ? boundedHeight * 2 : boundedHeight;
  const maxSize = Math.max(0, Math.min(boundedWidth, verticalRoom));
  const cx = boundedWidth / 2;
  const baseline = boundedHeight;

  return entries
    .map((entry, index) => {
      const size = maxSize * Math.sqrt(Math.max(0, entry.magnitude) / maxMagnitude);

      return {
        cx,
        // A half-circle already sits ON the baseline; a circle / square is tangent to it.
        cy: shape === 'half-circle' ? baseline : baseline - size / 2,
        datum: entry.datum,
        empty: false,
        index,
        key: entry.datum.label,
        labelled: true,
        magnitude: entry.magnitude,
        shape,
        size,
      };
    })
    .sort((a, b) => b.size - a.size);
}

/**
 * Fill a `rows × columns` cell grid, one category's run of cells after another, from the
 * BOTTOM-LEFT upward. Cells are kept square (the smaller of the two available cell extents)
 * and the grid is centred in the plot area, so a non-square plot leaves even margins rather
 * than stretching the cells. Any cells past the data's total are emitted as `empty` marks so
 * the remainder is drawn rather than left as a hole.
 */
function layoutGrid(
  entries: { datum: NgeHierarchyDatum; magnitude: number }[],
  boundedWidth: number,
  boundedHeight: number,
  total: number,
  rows: number,
  columns: number,
  padding: number,
  valuePerCell: number | undefined
): ProportionalMark[] {
  const totalCells = rows * columns;
  const perCell = valuePerCell && valuePerCell > 0 ? valuePerCell : total / totalCells;

  const cellWidth = (boundedWidth - (columns - 1) * padding) / columns;
  const cellHeight = (boundedHeight - (rows - 1) * padding) / rows;
  const side = Math.max(0, Math.min(cellWidth, cellHeight));
  const step = side + padding;

  // Centre the square grid in a plot area that is rarely square.
  const offsetX = (boundedWidth - (columns * side + (columns - 1) * padding)) / 2;
  const offsetY = (boundedHeight - (rows * side + (rows - 1) * padding)) / 2;

  /** Cell k, counted from the bottom-left, left to right then upward. */
  const placeCell = (k: number): { cx: number; cy: number } => {
    const row = Math.floor(k / columns);
    const column = k % columns;
    return {
      cx: offsetX + column * step + side / 2,
      cy: offsetY + (rows - 1 - row) * step + side / 2,
    };
  };

  const marks: ProportionalMark[] = [];
  let cursor = 0;

  entries.forEach((entry, index) => {
    const cells = Math.min(
      Math.max(0, Math.round(Math.max(0, entry.magnitude) / perCell)),
      totalCells - cursor
    );

    for (let cell = 0; cell < cells; cell += 1) {
      marks.push({
        ...placeCell(cursor),
        datum: entry.datum,
        empty: false,
        index,
        // Keyed within the category so a value change enters / exits cells at that
        // category's tail while the survivors slide to their new slots.
        key: `${entry.datum.label}#${cell}`,
        labelled: false,
        magnitude: entry.magnitude,
        shape: 'square',
        size: side,
      });
      cursor += 1;
    }
  });

  for (let k = cursor; k < totalCells; k += 1) {
    marks.push({
      ...placeCell(k),
      datum: EMPTY_DATUM,
      empty: true,
      index: -1,
      key: `#empty#${k}`,
      labelled: false,
      magnitude: 0,
      shape: 'square',
      size: side,
    });
  }

  return marks;
}

/**
 * Run `d3.pack()` over the tree and draw its LEAF circles. Nesting the data groups the leaves
 * into clusters; a flat array packs every datum directly. A leaf inherits the palette index of
 * its top-level ancestor, so one branch reads as one colour — the same rule the sunburst uses.
 */
function layoutPacked(
  root: HierarchyNode<NgeHierarchyDatum>,
  boundedWidth: number,
  boundedHeight: number,
  padding: number
): ProportionalMark[] {
  const packed = pack<NgeHierarchyDatum>().size([boundedWidth, boundedHeight]).padding(padding)(
    root as HierarchyNode<NgeHierarchyDatum>
  );

  // Top-level nodes sit at depth 1 — the synthetic root the layer wraps the data in is depth 0.
  const branches = packed.children ?? [];
  const indexByBranch = new Map<HierarchyCircularNode<NgeHierarchyDatum>, number>(
    branches.map((branch, index) => [branch, index])
  );

  return packed.leaves().map(leaf => {
    const branch = leaf.ancestors().find(node => node.depth === 1);

    return {
      cx: leaf.x,
      cy: leaf.y,
      datum: leaf.data,
      empty: false,
      index: branch ? (indexByBranch.get(branch) ?? 0) : 0,
      // The ancestor path (root excluded) keeps sibling labels distinct across branches.
      key: leaf
        .ancestors()
        .reverse()
        .slice(1)
        .map(node => node.data.label)
        .join('/'),
      labelled: true,
      magnitude: leaf.value ?? 0,
      shape: 'circle',
      size: leaf.r * 2,
    };
  });
}

/**
 * Render the proportional-area / waffle layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` and IGNORES the injected cartesian
 * `scales` — the same self-scaled contract as the `pie` and `funnel` layers. Every mark's AREA
 * encodes its value, so a linear dimension scales as `√(value / max)`; all five `mark` values
 * reduce to one of three primitives and therefore run through ONE keyed enter/update/exit join
 * (variable mark count) with a single centroid + size tween.
 *
 * Labels are drawn ON the mark and so read `theme.label` — the absolute black/white pair
 * `resolveLabelColor()` derives between. `mark: 'grid'` draws none at any setting: a waffle's
 * categories are named by a legend, not by text repeated across a run of cells.
 */
export function renderProportionalLayer(
  context: NgeChartLayerContext<
    NgeHierarchyDatum,
    NgeProportionalLayerConfig,
    NgeProportionalLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const theme = mergeProportionalLayerTheme(context.theme);
  const { boundedHeight, boundedWidth } = dimensions;
  const mark = config.mark ?? 'circle';
  const shape = shapeFor(mark);
  const padding = Math.max(0, config.padding ?? DEFAULT_PADDING);

  // Sum every subtree once so an internal node reports its aggregate magnitude and a leaf its
  // own value — one rule for both, and the tree `pack()` needs anyway.
  const root = hierarchy<NgeHierarchyDatum>({ children: data, label: '' }).sum(node =>
    Math.max(0, node.value ?? 0)
  );
  const entries = (root.children ?? []).map(child => ({
    datum: child.data,
    magnitude: child.value ?? 0,
  }));

  const total = root.value ?? 0;
  const maxMagnitude = Math.max(...entries.map(entry => entry.magnitude));
  if (!(maxMagnitude > 0)) {
    return;
  }

  let marks: ProportionalMark[];
  switch (mark) {
    case 'grid':
      marks = layoutGrid(
        entries,
        boundedWidth,
        boundedHeight,
        total,
        Math.max(1, Math.floor(config.rows ?? DEFAULT_GRID_ROWS)),
        Math.max(1, Math.floor(config.columns ?? DEFAULT_GRID_COLUMNS)),
        padding,
        config.valuePerCell
      );
      break;
    case 'packed':
      // `sort` runs on the same hierarchy the sums came from, so pack lays the big circles
      // out first and the result is stable across re-renders.
      marks = layoutPacked(
        root.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
        boundedWidth,
        boundedHeight,
        padding
      );
      break;
    default:
      marks =
        config.layout === 'nested'
          ? layoutNested(entries, shape, boundedWidth, boundedHeight, maxMagnitude)
          : layoutRow(entries, shape, boundedWidth, boundedHeight, maxMagnitude, padding);
  }

  // Mark palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.mark.colors;

  // Interrupt any running transitions (mirrors funnel/pie/bar) before recomputing the join.
  bounds.selectAll('.nge-proportional-mark').interrupt();

  // Container group — created once, like the funnel's container.
  let container = bounds.select<SVGGElement>('.nge-proportional-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-proportional-container', true);
  }

  // Resolve a mark fill: the waffle remainder → per-datum color → palette by top-level input
  // index → the single-mark fallback.
  const fillFor = (d: ProportionalMark): string =>
    d.empty
      ? theme.emptyCell.color
      : (d.datum.color ?? palette[d.index % palette.length] ?? theme.mark.color);

  const node = bounds.node();
  const labelFillFor = (d: ProportionalMark): string =>
    resolveLabelColor({
      configColor: config.labelColor,
      datumColor: d.datum.labelColor,
      fill: fillFor(d),
      node,
      theme: theme.label,
    });

  // Reshape tween: interpolate the cached `_current` geometry → the target so a mark grows in
  // from nothing (enter) and slides / resizes smoothly (update). `this` is the `<path>` node;
  // cache the interpolated geometry PER FRAME so an interrupted transition (rapid updates)
  // resumes from the visible position instead of snapping.
  function markTween(this: SVGPathElement, d: ProportionalMark): (t: number) => string {
    const pathNode = this as ProportionalNode;
    const target: ProportionalGeom = { cx: d.cx, cy: d.cy, size: d.size };
    const start = pathNode._current ?? { ...target, size: 0 };
    const interpolator = interpolate(start, target);

    return (t: number) => {
      const interpolated = interpolator(t) as ProportionalGeom;
      pathNode._current = interpolated;
      return markPath(d.shape, interpolated.cx, interpolated.cy, interpolated.size);
    };
  }

  // Keyed enter/update/exit join.
  const markSel = container
    .selectAll<SVGPathElement, ProportionalMark>('.nge-proportional-mark')
    .data(marks, d => d.key);

  // EXIT — fade out and remove.
  markSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // ENTER — append + cache a collapsed (zero-size) start geometry, then grow in.
  const entered = markSel
    .enter()
    .append('path')
    .classed('nge-proportional-mark', true)
    .attr('data-label', d => d.datum.label)
    .each(function (d) {
      (this as ProportionalNode)._current = { cx: d.cx, cy: d.cy, size: 0 };
    });

  entered.transition().duration(animation.enterMs).ease(animation.easing).attrTween('d', markTween);

  // UPDATE — morph existing marks to the new geometry.
  markSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attrTween('d', markTween);

  const merged = entered.merge(markSel);

  // Re-apply ALL styles every render so a runtime theme change (palette / stroke / opacity)
  // reaches already-rendered marks. Exiting marks are excluded from the merge, so their
  // fade-out is unaffected.
  merged
    .style('fill', fillFor)
    .style('stroke', theme.mark.stroke)
    .style('stroke-width', theme.mark.strokeWidth)
    .style('opacity', d => (d.empty ? theme.emptyCell.opacity : theme.mark.opacity));

  // Match DOM order to data order so the nested layout's smaller marks paint over the larger
  // ones and a packed leaf paints over its branch, on updates as well as on first render.
  merged.order();

  // Optional on-mark labels — a SEPARATE keyed join for <text> marks (mirrors the funnel's
  // independent sub-mark joins), so labels can enter/update/exit on their own schedule without
  // disturbing the mark path join above. A mark too narrow to hold text is left unlabelled.
  const minLabelSize = config.minLabelSize ?? DEFAULT_MIN_LABEL_SIZE;
  const labelWidthFor = (d: ProportionalMark): number =>
    d.size * (d.shape === 'half-circle' ? HALF_CIRCLE_LABEL_WIDTH_RATIO : LABEL_WIDTH_RATIO);
  const labelYFor = (d: ProportionalMark): number =>
    // A half-circle's mass sits above its flat edge, so its label rides up into that band.
    d.shape === 'half-circle' ? d.cy - d.size / 4 : d.cy;

  const labelData =
    config.showLabels && mark !== 'grid'
      ? marks.filter(d => d.labelled && labelWidthFor(d) >= minLabelSize)
      : [];

  // Interrupt in-flight label transitions before joining — same reason the mark join does it.
  // Labels fade in from opacity 0, so a re-render (resize, config change) that lands mid-fade
  // would otherwise leave the transition killed part-way and the label stuck invisible.
  container.selectAll('.nge-proportional-label').interrupt();

  const labelSel = container
    .selectAll<SVGTextElement, ProportionalMark>('.nge-proportional-label')
    .data(labelData, d => d.key);

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
    .classed('nge-proportional-label', true)
    .attr('data-label', d => d.datum.label)
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'middle')
    // Labels sit on top of their own mark — let hover / click fall through to it.
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', d => d.cx)
    .attr('y', labelYFor);

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  // Survivors re-assert full opacity SYNCHRONOUSLY (entering labels are excluded — they are
  // still fading in above). Without this, a label whose fade was interrupted by a re-render
  // keeps whatever partial opacity it was killed at, and never recovers.
  labelSel.style('opacity', 1);

  // Re-apply text + styles on the MERGED selection so a runtime theme / formatLabel change
  // reaches already-rendered labels. The text is set before eliding because elision measures
  // the rendered string.
  enteredLabels
    .merge(labelSel)
    .style('fill', labelFillFor)
    .style('font-size', toCssFontSize(theme.label.fontSize))
    .style('font-weight', theme.label.fontWeight)
    .each(function (d) {
      // Pass the SUMMED magnitude to the formatter so an internal node reports its aggregate
      // instead of `undefined` — the same shape the tooltip gets.
      const text = config.formatLabel?.({ ...d.datum, value: d.magnitude }) ?? d.datum.label;
      elideLabelText(this, text, labelWidthFor(d));
    });

  labelSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.cx)
    .attr('y', labelYFor);

  // Tooltip event at the mark centroid, positioned in full-SVG coords (margin offset) and
  // clamped to the chart bounds — mirrors the funnel layer's clamp/divot math exactly.
  const computeTooltipEvent = (d: ProportionalMark): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const markCenterX = margins.left + d.cx;
    const markCenterY = margins.top + labelYFor(d);

    // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const idealTooltipX = markCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y sits above the centroid, clamped to the canvas (mirrors the X clamp).
    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = markCenterY - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    // Divot points at the mark centroid (clamped within the bubble like funnel / pie).
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = markCenterX - tooltipX;
    const idealDivotX = targetTipX - divotWidth / 2;
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    // The formatter reads the SUMMED magnitude for the same reason the label formatter does.
    const content = tooltipConfig.formatContent({ ...d.datum, value: d.magnitude });

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

  // Cursor: pointer when the mark is interactive. A waffle's remainder names no datum, so it
  // stays inert whatever handlers are configured.
  merged.style('cursor', d =>
    !d.empty && (config.onClick || tooltipEnabled) ? 'pointer' : 'default'
  );

  // Hover interactions for tooltip (re-attached on ALL marks to handle config changes).
  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, d: ProportionalMark) => {
        if (d.empty) return;
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

  // Click handler.
  if (config.onClick) {
    merged.on('click', (event: PointerEvent, d: ProportionalMark) => {
      if (d.empty) return;
      config.onClick!({ data: d.datum, event, index: d.index });
    });
  } else {
    merged.on('click', null);
  }
}
