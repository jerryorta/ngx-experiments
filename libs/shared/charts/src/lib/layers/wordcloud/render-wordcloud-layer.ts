import { interpolate } from 'd3-interpolate';
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale';
import 'd3-transition';

import type {
  NgeWordCloudDataPoint,
  NgeWordCloudLayerConfig,
  NgeWordCloudScale,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeWordCloudLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { measureLabelWidth, mergeWordCloudLayerTheme } from '../../core/theme';

/** Font size (px) of the highest-valued word when no `maxFontSize` is supplied. */
const DEFAULT_MAX_FONT_SIZE = 64;

/** Font size (px) of the lowest-valued word when no `minFontSize` is supplied. */
const DEFAULT_MIN_FONT_SIZE = 10;

/** Clearance (px) kept between adjacent word boxes when no `padding` is supplied. */
const DEFAULT_PADDING = 2;

/** Every word horizontal — the default orientation set. */
const DEFAULT_ROTATIONS = [0];

/**
 * Rendered glyph-box height as a multiple of the font size.
 *
 * A `<text>` element is TALLER than its font size — ascenders and descenders reach past the em
 * square. Measured across the shipped story set, `getBBox().height / fontSize` runs 1.10–1.17
 * (mean 1.134); 1.2 is the conventional `normal` line-height and clears the observed maximum.
 * Collide the em square instead and every word bleeds 1–3px into the one above it, which reads
 * as touching glyphs rather than as a layout bug.
 */
const GLYPH_BOX_RATIO = 1.2;

/**
 * Angular step (radians) walked along the placement spiral. Small enough that a word does
 * not skip over a gap it would have fitted in, large enough to reach the outer turns within
 * {@link MAX_PLACEMENT_ATTEMPTS}.
 */
const SPIRAL_ANGLE_STEP = 0.35;

/** Radial growth (px) per full turn of the spiral — the spacing between successive turns. */
const SPIRAL_TURN_STEP = 6;

/**
 * Candidate positions tried before a word is abandoned. At the step sizes above this walks
 * roughly 67 turns, i.e. ~400px out from the centre — past the corner of any plot the layer
 * is asked to fill, so hitting the cap means the cloud is genuinely full rather than that
 * the search was too short.
 */
const MAX_PLACEMENT_ATTEMPTS = 1200;

/** One word resolved to pixel geometry, ready to draw. */
interface WordCloudMark {
  /** Centre x (px) — the rotation origin, the text anchor, and the tooltip anchor. */
  cx: number;
  /** Centre y (px). */
  cy: number;
  /** Source datum — kept by reference so click / tooltip payloads carry datum identity. */
  datum: NgeWordCloudDataPoint;
  /** Rendered font size (px), derived from `value` through the configured scale. */
  fontSize: number;
  /** Height (px) of the word's axis-aligned bounding box, rotation included. */
  height: number;
  /** Placement order — the palette index and the click-payload index. */
  index: number;
  /** Join key — the datum's own label, stable across re-renders. */
  key: string;
  /** Rotation (degrees) applied about the centre. */
  rotation: number;
  /** The string actually drawn (`formatLabel` applied). */
  text: string;
  /** Width (px) of the word's axis-aligned bounding box, rotation included. */
  width: number;
}

/** Numeric-only slice of {@link WordCloudMark} interpolated by the update tween. */
type WordCloudGeom = Pick<WordCloudMark, 'cx' | 'cy' | 'rotation'>;

/**
 * A word `<text>` node caches its last-drawn placement (`_current`) so the update transition
 * can interpolate the centre + rotation itself, mirroring the proportional layer's `_current`
 * mark cache.
 *
 * Interpolating the numbers by hand — rather than handing d3 the `transform` attribute and
 * letting it diff two transform strings — is what keeps this layer renderable under jsdom:
 * `d3-interpolate`'s transform parser reads `SVGElement.transform.baseVal`, which jsdom does
 * not implement, so a transitioned `transform` attribute throws there.
 */
type WordCloudNode = SVGTextElement & { _current?: WordCloudGeom };

/**
 * Build the `value` → font-size mapping.
 *
 * A degenerate domain (one word, or every word the same weight) has no spread to encode, so
 * every word is drawn at the maximum rather than collapsed to the minimum. `'log'` needs a
 * strictly positive domain, so a zero or negative value demotes it to `'sqrt'` instead of
 * producing an infinite range.
 */
function createFontSizeScale(
  values: number[],
  scale: NgeWordCloudScale,
  minFontSize: number,
  maxFontSize: number
): (value: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!(max > min)) {
    return () => maxFontSize;
  }

  if (scale === 'linear') {
    const linear = scaleLinear().domain([min, max]).range([minFontSize, maxFontSize]);
    return value => linear(value);
  }

  if (scale === 'log' && min > 0) {
    const log = scaleLog().domain([min, max]).range([minFontSize, maxFontSize]);
    return value => log(value);
  }

  const sqrt = scaleSqrt().domain([min, max]).range([minFontSize, maxFontSize]);
  return value => sqrt(value);
}

/**
 * The axis-aligned bounding box of a `width × height` box turned through `rotation` degrees.
 * Placement collides boxes rather than glyphs, so a rotated word has to report the upright
 * box that contains it — for the common 90° case this is simply the swap.
 */
function rotatedExtent(
  width: number,
  height: number,
  rotation: number
): { height: number; width: number } {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    height: width * sin + height * cos,
    width: width * cos + height * sin,
  };
}

/** Whether two marks' padded bounding boxes intersect. */
function collides(a: WordCloudMark, candidate: WordCloudMark, padding: number): boolean {
  return (
    Math.abs(a.cx - candidate.cx) * 2 < a.width + candidate.width + padding * 2 &&
    Math.abs(a.cy - candidate.cy) * 2 < a.height + candidate.height + padding * 2
  );
}

/**
 * Walk the archimedean spiral out from the plot centre and return the first position whose
 * bounding box clears every word already placed and stays inside the plot, or `null` when
 * the budget runs out.
 *
 * The x component is stretched by the plot's aspect ratio so a wide plot fills edge to edge
 * instead of leaving a circular cloud marooned in a letterbox.
 */
function placeOnSpiral(
  mark: WordCloudMark,
  placed: WordCloudMark[],
  boundedWidth: number,
  boundedHeight: number,
  padding: number
): null | WordCloudMark {
  const centerX = boundedWidth / 2;
  const centerY = boundedHeight / 2;
  const aspect = boundedHeight > 0 ? boundedWidth / boundedHeight : 1;
  const growth = SPIRAL_TURN_STEP / (2 * Math.PI);

  const halfWidth = mark.width / 2;
  const halfHeight = mark.height / 2;

  // A word wider or taller than the plot itself can never be placed — bail before walking.
  if (mark.width > boundedWidth || mark.height > boundedHeight) {
    return null;
  }

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
    const theta = attempt * SPIRAL_ANGLE_STEP;
    const radius = growth * theta;
    const candidate: WordCloudMark = {
      ...mark,
      cx: centerX + radius * Math.cos(theta) * aspect,
      cy: centerY + radius * Math.sin(theta),
    };

    const insideBounds =
      candidate.cx - halfWidth >= 0 &&
      candidate.cx + halfWidth <= boundedWidth &&
      candidate.cy - halfHeight >= 0 &&
      candidate.cy + halfHeight <= boundedHeight;

    if (insideBounds && !placed.some(other => collides(other, candidate, padding))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Render the word cloud layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` and IGNORES the injected cartesian
 * `scales` — the same self-scaled contract as the `pie`, `funnel` and `proportional` layers.
 * Each word's `value` maps to a font size, and the words are placed largest-first along an
 * archimedean spiral out from the plot centre, each taking the first position whose bounding
 * box clears every word already placed.
 *
 * **Placement is deterministic**: no random start angle, no random rotation. A chart re-renders
 * on resize, theme change and data update, and a randomised layout would reshuffle every word
 * each time — which both looks broken and defeats the keyed enter/update/exit join below.
 *
 * The text IS the mark here, so there is no on-fill contrast derivation (`resolveLabelColor`)
 * and no `label` theme slice — a word takes its colour from the categorical palette exactly
 * as any other mark does.
 */
export function renderWordCloudLayer(
  context: NgeChartLayerContext<
    NgeWordCloudDataPoint,
    NgeWordCloudLayerConfig,
    NgeWordCloudLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds) {
    return;
  }

  const theme = mergeWordCloudLayerTheme(context.theme);
  const { boundedHeight, boundedWidth } = dimensions;
  const padding = Math.max(0, config.padding ?? DEFAULT_PADDING);
  const rotations = config.rotations?.length ? config.rotations : DEFAULT_ROTATIONS;
  const fontFamily = config.fontFamily ?? theme.word.fontFamily;

  // Interrupt in-flight transitions before recomputing the join (mirrors proportional/funnel):
  // words fade in, so a re-render landing mid-fade would otherwise strand one part-way.
  bounds.selectAll('.nge-wordcloud-word').interrupt();

  // Container group — created once, like the funnel's and proportional's.
  let container = bounds.select<SVGGElement>('.nge-wordcloud-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-wordcloud-container', true);
  }

  const words = Array.isArray(data) ? data : [];
  const marks: WordCloudMark[] = [];

  // Empty data falls through to the join with an empty array so any previously-drawn words
  // exit properly instead of being stranded on screen by an early return.
  if (words.length > 0 && boundedWidth > 0 && boundedHeight > 0) {
    const fontSizeFor = createFontSizeScale(
      words.map(word => Math.max(0, word.value)),
      config.scale ?? 'sqrt',
      Math.max(0, config.minFontSize ?? DEFAULT_MIN_FONT_SIZE),
      Math.max(0, config.maxFontSize ?? DEFAULT_MAX_FONT_SIZE)
    );

    // One hidden probe measures every word. Font styles must match what the marks are drawn
    // with, or the boxes collided here describe text that is not what ends up on screen.
    const probe = container
      .append('text')
      .classed('nge-wordcloud-measure', true)
      .style('font-family', fontFamily)
      .style('font-weight', theme.word.fontWeight)
      .style('visibility', 'hidden');
    const probeNode = probe.node() as SVGTextElement;

    // Largest first: the big words claim the centre, the small ones fill the gaps around
    // them. Ties break on label so the order — and therefore the picture — is stable.
    const ordered = [...words].sort(
      (a, b) => Math.max(0, b.value) - Math.max(0, a.value) || a.label.localeCompare(b.label)
    );

    ordered.forEach((datum, order) => {
      const fontSize = fontSizeFor(Math.max(0, datum.value));
      const text = config.formatLabel?.(datum) ?? datum.label;
      const rotation = rotations[order % rotations.length];

      probe.style('font-size', `${fontSize}px`);
      const textWidth = measureLabelWidth(probeNode, text, fontSize);
      const extent = rotatedExtent(textWidth, fontSize * GLYPH_BOX_RATIO, rotation);

      const placement = placeOnSpiral(
        {
          cx: 0,
          cy: 0,
          datum,
          fontSize,
          height: extent.height,
          index: order,
          key: datum.label,
          rotation,
          text,
          width: extent.width,
        },
        marks,
        boundedWidth,
        boundedHeight,
        padding
      );

      // A word with nowhere to go is dropped rather than overlapped — the same rule the
      // `minLabelSize` thresholds apply to labels that cannot be drawn cleanly.
      if (placement) {
        marks.push(placement);
      }
    });

    probe.remove();
  }

  // Word palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.word.colors;
  const fillFor = (d: WordCloudMark): string =>
    d.datum.color ?? palette[d.index % palette.length] ?? theme.word.color;
  const transformOf = (geometry: WordCloudGeom): string =>
    `translate(${geometry.cx},${geometry.cy}) rotate(${geometry.rotation})`;

  // Reflow tween: interpolate the cached `_current` placement → the target so a survivor
  // slides to its new spot instead of snapping. `this` is the `<text>` node; cache the
  // interpolated placement PER FRAME so an interrupted transition (rapid updates) resumes
  // from the visible position.
  function transformTween(this: SVGTextElement, d: WordCloudMark): (t: number) => string {
    const textNode = this as WordCloudNode;
    const target: WordCloudGeom = { cx: d.cx, cy: d.cy, rotation: d.rotation };
    const interpolator = interpolate(textNode._current ?? target, target);

    return (t: number) => {
      const interpolated = interpolator(t) as WordCloudGeom;
      textNode._current = interpolated;
      return transformOf(interpolated);
    };
  }

  // Keyed enter/update/exit join — a word cloud draws one mark per datum, so the mark count
  // is variable and the singleton idiom does not apply.
  const wordSel = container
    .selectAll<SVGTextElement, WordCloudMark>('.nge-wordcloud-word')
    .data(marks, d => d.key);

  // EXIT — fade out and remove.
  wordSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // ENTER — append at the final position (no reflow to animate yet), fade in.
  const entered = wordSel
    .enter()
    .append('text')
    .classed('nge-wordcloud-word', true)
    .attr('data-label', d => d.datum.label)
    .attr('dominant-baseline', 'central')
    .attr('text-anchor', 'middle')
    .attr('transform', d => transformOf(d))
    .style('font-size', d => `${d.fontSize}px`)
    .style('opacity', 0)
    .each(function (d) {
      (this as WordCloudNode)._current = { cx: d.cx, cy: d.cy, rotation: d.rotation };
    });

  entered
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.word.opacity);

  // Survivors re-assert full opacity SYNCHRONOUSLY (entering words are excluded — they are
  // still fading in above). Without this, a word whose fade was interrupted by a re-render
  // keeps whatever partial opacity it was killed at, and never recovers.
  wordSel.style('opacity', theme.word.opacity);

  // UPDATE — reflow survivors to their new position and size.
  wordSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attrTween('transform', transformTween)
    .style('font-size', d => `${d.fontSize}px`);

  const merged = entered.merge(wordSel);

  // Re-apply ALL styles every render so a runtime theme change (palette / weight / family)
  // reaches already-rendered words. Exiting words are excluded from the merge, so their
  // fade-out is unaffected.
  merged
    .style('fill', fillFor)
    .style('font-family', fontFamily)
    .style('font-weight', theme.word.fontWeight)
    .text(d => d.text);

  // Match DOM order to placement order so paint order is stable across updates too.
  merged.order();

  // Tooltip event at the word centre, positioned in full-SVG coords (margin offset) and
  // clamped to the chart bounds — mirrors the proportional layer's clamp/divot math exactly.
  const computeTooltipEvent = (d: WordCloudMark): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const wordCenterX = margins.left + d.cx;
    const wordCenterY = margins.top + d.cy;

    // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const idealTooltipX = wordCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y sits above the centre, clamped to the canvas (mirrors the X clamp).
    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = wordCenterY - d.height / 2 - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    // Divot points at the word centre (clamped within the bubble like funnel / pie).
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = wordCenterX - tooltipX;
    const idealDivotX = targetTipX - divotWidth / 2;
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    return {
      content: tooltipConfig.formatContent(d.datum),
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

  merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Hover interactions for tooltip (re-attached on ALL words to handle config changes).
  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, d: WordCloudMark) => {
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
    merged.on('click', (event: PointerEvent, d: WordCloudMark) => {
      config.onClick!({ data: d.datum, event, index: d.index });
    });
  } else {
    merged.on('click', null);
  }
}
