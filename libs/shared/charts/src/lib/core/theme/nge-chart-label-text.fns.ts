/**
 * Average glyph width as a fraction of the font size, used when the DOM cannot measure.
 * Close enough for layout decisions across the proportional faces charts render in.
 */
const AVERAGE_GLYPH_RATIO = 0.6;

/**
 * Measure `text`'s rendered width (px) on `node`, guarded for environments that do not lay
 * SVG text out.
 *
 * `getComputedTextLength` needs real layout, so it is absent under jsdom and returns 0 for a
 * node that has not been laid out yet. Either would read as "this text is zero-wide", which
 * downstream turns into "it fits" — an axis label that never elides, or a word cloud that
 * stacks every word on one spot. The fallback approximates a glyph as
 * {@link AVERAGE_GLYPH_RATIO}·fontSize so callers still get a sane, monotonic width.
 *
 * Callers must have applied the font to `node` (or its ancestors) before measuring, since the
 * real branch measures whatever the DOM has actually resolved.
 */
export function measureLabelWidth(node: SVGTextElement, text: string, fontSize: number): number {
  if (typeof node.getComputedTextLength === 'function') {
    node.textContent = text;
    const measured = node.getComputedTextLength();
    if (Number.isFinite(measured) && measured > 0) {
      return measured;
    }
  }

  return text.length * fontSize * AVERAGE_GLYPH_RATIO;
}

/**
 * Trim `text` on `node` until it fits within `maxWidth`, appending an ellipsis.
 *
 * A data label drawn ON its own mark is bounded by that mark — a sunburst ring's radial
 * thickness, an icicle rect's width, a radial bar's length — and unlike a pie there is no
 * surrounding space to spill into. Suppression thresholds drop the marks that can hold no
 * text at all; this handles the ones that can hold *some*.
 *
 * Measurement needs layout, so this degrades to the untrimmed text wherever
 * `getComputedTextLength` is unavailable or returns nothing — notably jsdom, which does not
 * lay SVG text out. A non-positive `maxWidth` means "do not bound this label" and returns
 * the text as-is, which is how a placement with no natural bound (an outside label sitting
 * on the plot surface) opts out. Trimming from the end one character at a time keeps the
 * result exact; label strings are short enough that the extra measurements do not matter.
 */
export function elideLabelText(node: SVGTextElement, text: string, maxWidth: number): void {
  node.textContent = text;

  if (maxWidth <= 0 || typeof node.getComputedTextLength !== 'function') {
    return;
  }

  let length = node.getComputedTextLength();
  if (!Number.isFinite(length) || length <= 0 || length <= maxWidth) {
    return;
  }

  for (let chars = text.length - 1; chars >= 0 && length > maxWidth; chars--) {
    node.textContent = chars > 0 ? `${text.slice(0, chars)}…` : '';
    length = node.getComputedTextLength();
  }
}
