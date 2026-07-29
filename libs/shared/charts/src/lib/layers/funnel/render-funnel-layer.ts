import { interpolate } from 'd3-interpolate';
import 'd3-transition';

import type { NgeFunnelDataPoint, NgeFunnelLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeFunnelLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeFunnelLayerTheme, resolveLabelColor, toCssFontSize } from '../../core/theme';

/** One resolved funnel band: pixel geometry plus the source datum (tooltip/click payload). */
interface FunnelBand {
  /** Bottom-edge width in pixels. */
  botW: number;
  /** Source datum — kept by reference so click/tooltip payloads carry datum identity. */
  datum: NgeFunnelDataPoint;
  /** Input-order index — the palette / click-payload index. */
  index: number;
  /** Top-edge width in pixels. */
  topW: number;
  /** Top y (pixels). */
  y0: number;
  /** Bottom y (pixels). */
  y1: number;
}

/** Numeric-only slice of `FunnelBand` interpolated by the enter/update tween. */
type FunnelBandGeom = Pick<FunnelBand, 'botW' | 'topW' | 'y0' | 'y1'>;

/**
 * A funnel band `<path>` node caches its last-drawn geometry (`_current`) so the
 * enter/update transition can interpolate widths + y-extent smoothly (grow-in +
 * reshape), mirroring the pie layer's `_current` arc-datum cache.
 */
type FunnelBandNode = SVGPathElement & { _current?: FunnelBandGeom };

/** Horizontal breathing room between the funnel edge and an outside label (px). */
const LABEL_GUTTER_PADDING = 12;

/** Build the quadrilateral (trapezoid) path for one band. */
function trapezoidPath(
  topW: number,
  botW: number,
  y0: number,
  y1: number,
  align: 'center' | 'left',
  boundedWidth: number
): string {
  if (align === 'left') {
    return `M0,${y0} L${topW},${y0} L${botW},${y1} L0,${y1} Z`;
  }
  const cx = boundedWidth / 2;
  return `M${cx - topW / 2},${y0} L${cx + topW / 2},${y0} L${cx + botW / 2},${y1} L${cx - botW / 2},${y1} Z`;
}

/**
 * Resolve each datum to pixel geometry. Widths are self-scaled from the data's own
 * max value (`widthFor`); the vertical extent divides `boundedHeight` into `n` equal
 * slots, each carved down by `gap` px of vertical spacing. Band *i*'s "inner" edge
 * (nearer its own value) reads `value[i]`; its "outer" edge (nearer the next value in
 * sequence) reads `value[i + 1]`, except for the LAST band, which has no successor —
 * its outer edge reads `neckRatio` as a ratio of the widest band width (the width a
 * value of `maxValue` produces, i.e. `boundedWidth`) when set, else falls back to its
 * own inner width (a flat-bottomed funnel). `direction: 'down'` places the inner edge
 * at the TOP of each band's slot (band 0's slot at the very top) — widest-at-top,
 * narrowing toward the sequence's tail. `direction: 'up'` places the inner edge at the
 * BOTTOM of each slot AND reverses the slot order (band 0's slot at the very bottom) —
 * widest-at-bottom, narrowing toward the sequence's tail at the top.
 */
function computeFunnelBands(
  data: NgeFunnelDataPoint[],
  boundedWidth: number,
  boundedHeight: number,
  maxValue: number,
  gap: number,
  neckRatio: number | undefined,
  direction: 'down' | 'up'
): FunnelBand[] {
  const n = data.length;
  const bandSlot = boundedHeight / n;
  const bandHeight = Math.max(0, bandSlot - gap);
  const widthFor = (v: number): number => (Math.max(0, v) / maxValue) * boundedWidth;

  return data.map((datum, index) => {
    const innerWidth = widthFor(datum.value);
    const isLast = index === n - 1;
    const outerWidth = isLast
      ? neckRatio !== undefined
        ? neckRatio * boundedWidth
        : innerWidth
      : widthFor(data[index + 1].value);

    const topW = direction === 'up' ? outerWidth : innerWidth;
    const botW = direction === 'up' ? innerWidth : outerWidth;
    const slotIndex = direction === 'up' ? n - 1 - index : index;

    const y0 = slotIndex * bandSlot + gap / 2;
    const y1 = y0 + bandHeight;

    return { botW, datum, index, topW, y0, y1 };
  });
}

/**
 * Render the funnel / pyramid layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (each band's width from its own
 * value, its height slot from `boundedHeight / n`) and IGNORES the injected cartesian
 * `scales` — the same self-scaled contract as the `pie` layer. Bands join by `label`
 * (keyed enter/update/exit, VARIABLE mark count) and reshape via a width/y-extent tween.
 *
 * Outside labels (`labelPosition: 'edge' | 'right'`) narrow the funnel to
 * `boundedWidth - labelGutter` and draw into the reclaimed strip — `'edge'` following
 * each band's own sloped edge, `'right'` in one straight column. The gutter has to come
 * out of the plot area rather than the margin because the layers group is clipped to the
 * plot rect, so anything drawn past `boundedWidth` would be cut off. Those labels are styled
 * from `theme.labelOutside` (surface-tracking, no contrast derivation), not from the in-band
 * `theme.label`.
 */
export function renderFunnelLayer(
  context: NgeChartLayerContext<
    NgeFunnelDataPoint,
    NgeFunnelLayerConfig,
    NgeFunnelLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  if (!(maxValue > 0)) {
    return;
  }

  // Merge theme with defaults
  const theme = mergeFunnelLayerTheme(context.theme);

  const align = config.align ?? 'center';
  const direction = config.direction ?? 'down';
  const { boundedHeight, boundedWidth } = dimensions;

  // Outside labels are drawn INSIDE the plot area — the layers group is clipped to it,
  // so the strip they occupy has to be taken off the funnel's own width.
  const labelPosition = config.labelPosition ?? 'inside';
  const labelGutter = labelPosition === 'inside' ? 0 : Math.max(0, config.labelGutter ?? 96);
  const funnelWidth = Math.max(0, boundedWidth - labelGutter);

  const bands = computeFunnelBands(
    data,
    funnelWidth,
    boundedHeight,
    maxValue,
    config.gap ?? 0,
    config.neckRatio,
    direction
  );

  // Band palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.band.colors;

  // Interrupt any running transitions (mirrors pie/bullet/bar) before recomputing the join.
  bounds.selectAll('.nge-funnel-band').interrupt();

  // Container group — created once, like pie's container.
  let container = bounds.select<SVGGElement>('.nge-funnel-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-funnel-container', true);
  }

  // Resolve a band fill: per-datum color → palette by input index → the single-band fallback.
  const fillFor = (d: FunnelBand): string =>
    d.datum.color ?? palette[d.index % palette.length] ?? theme.band.color;

  // Label typography + colour come from whichever theme slice matches the placement, because
  // the two placements have opposite backdrops.
  //
  // Only an INSIDE label sits on the band's own fill — a range drawn from the palette, so one
  // flat colour cannot read on every band, and `theme.label` is an absolute black/white
  // contrast pair for it to derive between. An 'edge' / 'right' label sits on the plot surface
  // instead, so it must NOT derive AND must not inherit that absolute pair: it reads
  // `theme.labelOutside`, which tracks `--nge-chart-on-surface` and declares no `colorOnDark`
  // (the missing pair is what switches derivation off). Before ARCH-267 both placements shared
  // `theme.label`, so an outside label fell through to absolute black and was invisible on a
  // dark surface. Passing an empty fill keeps the intent explicit at the call site.
  const labelTheme = labelPosition === 'inside' ? theme.label : theme.labelOutside;
  const node = bounds.node();
  const labelFillFor = (d: FunnelBand): string =>
    resolveLabelColor({
      configColor: config.labelColor,
      datumColor: d.datum.labelColor,
      fill: labelPosition === 'inside' ? fillFor(d) : '',
      node,
      theme: labelTheme,
    });

  // Reshape tween: interpolate the cached `_current` geometry → the target geometry so a
  // band grows in from a zero-width collapse (enter) and morphs smoothly (update). `this`
  // is the `<path>` node; cache the interpolated geometry PER FRAME so an interrupted
  // transition (rapid updates) resumes from the visible position instead of snapping.
  function bandTween(this: SVGPathElement, d: FunnelBand): (t: number) => string {
    const node = this as FunnelBandNode;
    const target: FunnelBandGeom = { botW: d.botW, topW: d.topW, y0: d.y0, y1: d.y1 };
    const start = node._current ?? { ...target, botW: 0, topW: 0 };
    const interpolator = interpolate(start, target);
    return (t: number) => {
      const interpolated = interpolator(t) as FunnelBandGeom;
      node._current = interpolated;
      return trapezoidPath(
        interpolated.topW,
        interpolated.botW,
        interpolated.y0,
        interpolated.y1,
        align,
        funnelWidth
      );
    };
  }

  // Keyed enter/update/exit join by band label.
  const bandSel = container
    .selectAll<SVGPathElement, FunnelBand>('.nge-funnel-band')
    .data(bands, d => d.datum.label);

  // EXIT — fade out and remove.
  bandSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // ENTER — append + cache a collapsed (zero-width) start geometry, then grow in.
  const entered = bandSel
    .enter()
    .append('path')
    .classed('nge-funnel-band', true)
    .attr('data-label', d => d.datum.label)
    .each(function (d) {
      (this as FunnelBandNode)._current = { botW: 0, topW: 0, y0: d.y0, y1: d.y1 };
    });

  entered.transition().duration(animation.enterMs).ease(animation.easing).attrTween('d', bandTween);

  // UPDATE — morph existing bands to the new geometry.
  bandSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attrTween('d', bandTween);

  // Merged selection (new + existing bands).
  const merged = entered.merge(bandSel);

  // Re-apply ALL styles every render so a runtime theme change (palette / stroke /
  // opacity) reaches already-rendered bands. Exiting bands are excluded from the merge,
  // so their fade-out is unaffected.
  merged
    .style('fill', fillFor)
    .style('stroke', theme.band.stroke)
    .style('stroke-width', theme.band.strokeWidth)
    .style('opacity', theme.band.opacity);

  // Horizontal centroid of a band — used by inside labels and the tooltip anchor.
  const centerXFor = (d: FunnelBand): number =>
    align === 'left' ? (d.topW + d.botW) / 4 : funnelWidth / 2;

  // A band's right edge at its own mid-height — the trapezoid's width halfway down is
  // the mean of its top and bottom widths, so an 'edge' label tracks the taper.
  const edgeXFor = (d: FunnelBand): number => {
    const midWidth = (d.topW + d.botW) / 2;
    return align === 'left' ? midWidth : funnelWidth / 2 + midWidth / 2;
  };

  // 'edge' hugs each band's own sloped edge (labels step inward as the funnel narrows);
  // 'right' pins every label to one x for a straight column; 'inside' uses the centroid.
  const labelXFor = (d: FunnelBand): number => {
    switch (labelPosition) {
      case 'edge':
        return edgeXFor(d) + LABEL_GUTTER_PADDING;
      case 'right':
        return funnelWidth + LABEL_GUTTER_PADDING;
      default:
        return centerXFor(d);
    }
  };
  const labelAnchor = labelPosition === 'inside' ? 'middle' : 'start';

  // Optional in-band labels — a SEPARATE keyed join for <text> marks (mirrors the
  // histogram layer's independent sub-mark joins), so labels can enter/update/exit on
  // their own schedule without disturbing the band path join above.
  const labelData = config.showLabels ? bands : [];

  // Interrupt in-flight label transitions before joining — same reason the band join
  // does it. Labels fade in from opacity 0, so a re-render (resize, config change) that
  // lands mid-fade would otherwise leave the transition killed part-way and the label
  // stuck semi-transparent or fully invisible.
  container.selectAll('.nge-funnel-label').interrupt();

  const labelSel = container
    .selectAll<SVGTextElement, FunnelBand>('.nge-funnel-label')
    .data(labelData, d => d.datum.label);

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
    .classed('nge-funnel-label', true)
    .attr('data-label', d => d.datum.label)
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', labelXFor)
    .attr('y', d => (d.y0 + d.y1) / 2);

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  // Survivors re-assert full opacity SYNCHRONOUSLY (entering labels are excluded — they
  // are still fading in above). Without this, a label whose fade was interrupted by a
  // re-render keeps whatever partial opacity it was killed at, and never recovers.
  labelSel.style('opacity', 1);

  // Re-apply anchor + styles to the merged selection so a runtime `labelPosition` /
  // theme change reaches already-rendered labels, not just freshly-entered ones.
  enteredLabels
    .merge(labelSel)
    .attr('text-anchor', labelAnchor)
    .style('fill', labelFillFor)
    .style('font-size', toCssFontSize(labelTheme.fontSize))
    .style('font-weight', labelTheme.fontWeight)
    .text(d => config.formatLabel?.(d.datum) ?? d.datum.label);

  labelSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', labelXFor)
    .attr('y', d => (d.y0 + d.y1) / 2);

  // Tooltip event at the band centroid, positioned in full-SVG coords (margin offset)
  // and clamped to the chart bounds — mirrors the pie layer's clamp/divot math exactly.
  const computeTooltipEvent = (d: FunnelBand): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const bandCenterX = margins.left + centerXFor(d);
    const bandCenterY = margins.top + (d.y0 + d.y1) / 2;

    // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const idealTooltipX = bandCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y sits above the centroid, clamped to the canvas (mirrors the X clamp).
    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = bandCenterY - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    // Divot points at the band centroid (clamped within the bubble like pie).
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = bandCenterX - tooltipX;
    const idealDivotX = targetTipX - divotWidth / 2;
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    const content = tooltipConfig.formatContent(d.datum);

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

  // Cursor: pointer when the band is interactive.
  merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Hover interactions for tooltip (re-attached on ALL bands to handle config changes).
  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, d: FunnelBand) => {
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
    merged.on('click', (event: PointerEvent, d: FunnelBand) => {
      config.onClick!({ data: d.datum, event, index: d.index });
    });
  } else {
    merged.on('click', null);
  }
}
