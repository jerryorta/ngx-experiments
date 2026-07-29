import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type {
  NgeWordCloudDataPoint,
  NgeWordCloudLayerConfig,
  NgeWordCloudScale,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeWordCloudLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderWordCloudLayer } from './render-wordcloud-layer';

type WordCloudContext = NgeChartLayerContext<
  NgeWordCloudDataPoint,
  NgeWordCloudLayerConfig,
  NgeWordCloudLayerTheme | undefined
>;

interface ContextOptions {
  fontFamily?: string;
  formatLabel?: (d: NgeWordCloudDataPoint) => string;
  maxFontSize?: number;
  minFontSize?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padding?: number;
  rotations?: number[];
  scale?: NgeWordCloudScale;
  seriesColors?: string[];
  theme?: NgeWordCloudLayerTheme;
  tooltip?: boolean;
}

// 300x300 bounds — round numbers throughout.
const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 300,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 320,
};

/**
 * Values chosen as perfect squares so the default `'sqrt'` scale lands on round font sizes:
 * √16=4, √36=6, √64=8, √100=10 over a [10, 64] range.
 */
const WORDS: NgeWordCloudDataPoint[] = [
  { label: 'alpha', value: 100 },
  { label: 'beta', value: 64 },
  { label: 'gamma', value: 36 },
  { label: 'delta', value: 16 },
];

/**
 * jsdom does not lay SVG text out, so `measureLabelWidth` falls back to its analytic
 * approximation. Mirroring the ratio here lets the spec recompute exactly the boxes the
 * layout collided, which is what makes the overlap assertion meaningful rather than circular.
 */
const GLYPH_RATIO = 0.6;

/**
 * Rendered glyph-box height as a multiple of the font size — mirrors the layer's own
 * `GLYPH_BOX_RATIO`, since a `<text>` element is taller than its font size (ascenders +
 * descenders). The layout collides these boxes, so the spec has to reconstruct the same ones.
 */
const GLYPH_BOX_RATIO = 1.2;

function createContext(
  data: NgeWordCloudDataPoint[],
  options: ContextOptions = {}
): { context: WordCloudContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeWordCloudLayerConfig = {
    data,
    fontFamily: options.fontFamily,
    formatLabel: options.formatLabel,
    maxFontSize: options.maxFontSize,
    minFontSize: options.minFontSize,
    onClick: options.onClick,
    padding: options.padding,
    renderer: renderWordCloudLayer,
    rotations: options.rotations,
    scale: options.scale,
    seriesColors: options.seriesColors,
    type: 'wordcloud',
  };

  // The layer ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: WordCloudContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 10, left: 10, right: 10, top: 10 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeWordCloudDataPoint) => ({ label: d.label, value: d.value }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/**
 * Real-timer wait so d3 transitions run to completion. Enter applies position and font size
 * synchronously; the UPDATE pass animates them, so a survivor's new geometry is only
 * observable after a real delay past the update duration (300ms).
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function words(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-wordcloud-word'));
}

function wordFor(g: SVGGElement, label: string): SVGTextElement {
  const node = g.querySelector<SVGTextElement>(`.nge-wordcloud-word[data-label="${label}"]`);
  if (!node) {
    throw new Error(`No word cloud mark for label "${label}"`);
  }
  return node;
}

function fontSizeOf(node: SVGTextElement): number {
  return Number.parseFloat(styleOf(node, 'font-size'));
}

interface WordBox {
  cx: number;
  cy: number;
  height: number;
  rotation: number;
  width: number;
}

/** Recompute a rendered word's axis-aligned bounding box from its transform + font size. */
function boxOf(node: SVGTextElement): WordBox {
  const transform = node.getAttribute('transform') ?? '';
  const match = /^translate\(([-\d.]+),([-\d.]+)\) rotate\(([-\d.]+)\)$/.exec(transform);
  if (!match) {
    throw new Error(`Unparsable word transform: "${transform}"`);
  }

  const rotation = Number(match[3]);
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const fontSize = fontSizeOf(node);
  const textWidth = (node.textContent ?? '').length * fontSize * GLYPH_RATIO;
  const textHeight = fontSize * GLYPH_BOX_RATIO;

  return {
    cx: Number(match[1]),
    cy: Number(match[2]),
    height: textWidth * sin + textHeight * cos,
    rotation,
    width: textWidth * cos + textHeight * sin,
  };
}

/** Whether two bounding boxes intersect (ignoring padding — a conservative assertion). */
function overlaps(a: WordBox, b: WordBox): boolean {
  return (
    Math.abs(a.cx - b.cx) * 2 < a.width + b.width && Math.abs(a.cy - b.cy) * 2 < a.height + b.height
  );
}

describe('renderWordCloudLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('placement', () => {
    it('draws one text mark per datum', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      expect(words(g)).toHaveLength(WORDS.length);
      expect(
        words(g)
          .map(node => node.getAttribute('data-label'))
          .sort()
      ).toEqual(['alpha', 'beta', 'delta', 'gamma']);
    });

    it('never overlaps two words', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      const boxes = words(g).map(boxOf);
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          expect(overlaps(boxes[i], boxes[j])).toBe(false);
        }
      }
    });

    it('keeps every word inside the plot bounds', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      for (const box of words(g).map(boxOf)) {
        expect(box.cx - box.width / 2).toBeGreaterThanOrEqual(0);
        expect(box.cx + box.width / 2).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
        expect(box.cy - box.height / 2).toBeGreaterThanOrEqual(0);
        expect(box.cy + box.height / 2).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
      }
    });

    it('is deterministic — the same data lays out identically on a fresh render', () => {
      const first = createContext(WORDS);
      const second = createContext(WORDS);

      renderWordCloudLayer(first.context);
      renderWordCloudLayer(second.context);

      const transforms = (g: SVGGElement): string[] =>
        words(g).map(
          node => `${node.getAttribute('data-label')}:${node.getAttribute('transform')}`
        );

      expect(transforms(second.g)).toEqual(transforms(first.g));
    });

    it('places the largest word first, at the centre of the plot', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      // The spiral starts at the centre, so the first word placed takes it unconditionally.
      const alpha = boxOf(wordFor(g, 'alpha'));
      expect(alpha.cx).toBeCloseTo(DIMENSIONS.boundedWidth / 2, 5);
      expect(alpha.cy).toBeCloseTo(DIMENSIONS.boundedHeight / 2, 5);
    });

    it('drops a word too large for the plot rather than overflowing it', () => {
      const { context, g } = createContext(
        [
          { label: 'fits', value: 10 },
          { label: 'a-word-far-too-long-to-ever-be-placed', value: 100 },
        ],
        { maxFontSize: 80, minFontSize: 40 }
      );

      renderWordCloudLayer(context);

      expect(words(g).map(node => node.getAttribute('data-label'))).toEqual(['fits']);
    });

    it('renders nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderWordCloudLayer(context);

      expect(words(g)).toHaveLength(0);
    });
  });

  describe('font size', () => {
    it.each<[NgeWordCloudScale, number, number]>([
      ['sqrt', 10, 64],
      ['linear', 10, 64],
      ['log', 10, 64],
    ])('maps the value extent onto the font-size range (%s)', (scale, min, max) => {
      const { context, g } = createContext(WORDS, {
        maxFontSize: max,
        minFontSize: min,
        scale,
      });

      renderWordCloudLayer(context);

      expect(fontSizeOf(wordFor(g, 'alpha'))).toBeCloseTo(max, 5);
      expect(fontSizeOf(wordFor(g, 'delta'))).toBeCloseTo(min, 5);
    });

    it('scales by the square root of the value by default', () => {
      const { context, g } = createContext(WORDS, { maxFontSize: 64, minFontSize: 10 });

      // domain [√16, √100] = [4, 10] over range [10, 64]; √64 = 8 sits at (8-4)/6 = ⅔.
      expect(renderWordCloudLayer(context)).toBeUndefined();
      expect(fontSizeOf(wordFor(g, 'beta'))).toBeCloseTo(10 + (2 / 3) * 54, 5);
    });

    it('falls back to sqrt when a log scale meets a non-positive value', () => {
      const data: NgeWordCloudDataPoint[] = [
        { label: 'zero', value: 0 },
        { label: 'four', value: 4 },
      ];
      const { context, g } = createContext(data, {
        maxFontSize: 40,
        minFontSize: 10,
        scale: 'log',
      });

      renderWordCloudLayer(context);

      // A log domain cannot hold 0 — the endpoints still resolve, which is the fallback working.
      expect(fontSizeOf(wordFor(g, 'zero'))).toBeCloseTo(10, 5);
      expect(fontSizeOf(wordFor(g, 'four'))).toBeCloseTo(40, 5);
    });

    it('draws every word at the maximum when all values are equal', () => {
      const data: NgeWordCloudDataPoint[] = [
        { label: 'one', value: 5 },
        { label: 'two', value: 5 },
      ];
      const { context, g } = createContext(data, { maxFontSize: 30, minFontSize: 10 });

      renderWordCloudLayer(context);

      for (const node of words(g)) {
        expect(fontSizeOf(node)).toBeCloseTo(30, 5);
      }
    });
  });

  describe('rotation', () => {
    it('draws every word horizontally by default', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      expect(words(g).map(node => boxOf(node).rotation)).toEqual([0, 0, 0, 0]);
    });

    it('cycles the configured rotations across the words by placement order', () => {
      // Sized down so all four words fit — a 64px 'alpha' plus a quarter-turned 'beta' does
      // not leave room in a 300x300 plot, and the drop would mask the cycling this asserts.
      const { context, g } = createContext(WORDS, { maxFontSize: 32, rotations: [0, 90] });

      renderWordCloudLayer(context);

      // Placement order is descending value: alpha, beta, gamma, delta.
      expect(boxOf(wordFor(g, 'alpha')).rotation).toBe(0);
      expect(boxOf(wordFor(g, 'beta')).rotation).toBe(90);
      expect(boxOf(wordFor(g, 'gamma')).rotation).toBe(0);
      expect(boxOf(wordFor(g, 'delta')).rotation).toBe(90);
    });

    it('swaps the bounding box of a quarter-turned word', () => {
      const { context, g } = createContext([{ label: 'alpha', value: 10 }], {
        maxFontSize: 20,
        minFontSize: 20,
        rotations: [90],
      });

      renderWordCloudLayer(context);

      const box = boxOf(wordFor(g, 'alpha'));
      // 'alpha' is 5 chars at 20px → 60px of text on a 24px glyph box; turned, they trade places.
      expect(box.width).toBeCloseTo(24, 5);
      expect(box.height).toBeCloseTo(60, 5);
    });
  });

  describe('theming', () => {
    it('cycles the theme palette across the words by placement order', () => {
      const { context, g } = createContext(WORDS, {
        theme: { word: { colors: ['#111111', '#222222'] } },
      });

      renderWordCloudLayer(context);

      expect(styleOf(wordFor(g, 'alpha'), 'fill')).toBe('#111111');
      expect(styleOf(wordFor(g, 'beta'), 'fill')).toBe('#222222');
      expect(styleOf(wordFor(g, 'gamma'), 'fill')).toBe('#111111');
    });

    it('prefers config seriesColors over the theme palette', () => {
      const { context, g } = createContext(WORDS, {
        seriesColors: ['#abcdef'],
        theme: { word: { colors: ['#111111'] } },
      });

      renderWordCloudLayer(context);

      expect(styleOf(wordFor(g, 'alpha'), 'fill')).toBe('#abcdef');
    });

    it('prefers a per-datum color over every palette', () => {
      const data = [{ ...WORDS[0], color: '#fedcba' }, WORDS[1]];
      const { context, g } = createContext(data, { seriesColors: ['#abcdef'] });

      renderWordCloudLayer(context);

      expect(styleOf(wordFor(g, 'alpha'), 'fill')).toBe('#fedcba');
      expect(styleOf(wordFor(g, 'beta'), 'fill')).toBe('#abcdef');
    });

    it('applies the theme font weight and the config font family', () => {
      const { context, g } = createContext(WORDS, {
        fontFamily: 'Georgia, serif',
        theme: { word: { fontWeight: 800 } },
      });

      renderWordCloudLayer(context);

      const alpha = wordFor(g, 'alpha');
      expect(styleOf(alpha, 'font-weight')).toBe('800');
      expect(styleOf(alpha, 'font-family')).toBe('Georgia, serif');
    });

    it('leaves no measurement probe behind', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      expect(g.querySelectorAll('.nge-wordcloud-measure')).toHaveLength(0);
    });
  });

  describe('labels', () => {
    it('draws the datum label by default', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);

      expect(wordFor(g, 'alpha').textContent).toBe('alpha');
    });

    it('draws the formatted label when formatLabel is supplied', () => {
      const { context, g } = createContext(WORDS, {
        formatLabel: d => d.label.toUpperCase(),
      });

      renderWordCloudLayer(context);

      // The join key stays the raw label; only the rendered text changes.
      expect(wordFor(g, 'alpha').textContent).toBe('ALPHA');
    });
  });

  describe('enter / update / exit', () => {
    it('keeps a survivor node identity across a data change', async () => {
      const { context, g } = createContext(WORDS);
      renderWordCloudLayer(context);
      const before = wordFor(g, 'alpha');

      const next = [WORDS[0], WORDS[1], { label: 'epsilon', value: 50 }];
      renderWordCloudLayer({ ...context, config: { ...context.config, data: next }, data: next });
      await settle();

      expect(wordFor(g, 'alpha')).toBe(before);
      expect(wordFor(g, 'epsilon')).toBeTruthy();
    });

    it('removes words that leave the data', async () => {
      const { context, g } = createContext(WORDS);
      renderWordCloudLayer(context);

      const next = [WORDS[0]];
      renderWordCloudLayer({ ...context, config: { ...context.config, data: next }, data: next });
      await settle();

      expect(words(g).map(node => node.getAttribute('data-label'))).toEqual(['alpha']);
    });

    it('removes every word when the data empties', async () => {
      const { context, g } = createContext(WORDS);
      renderWordCloudLayer(context);
      expect(words(g)).toHaveLength(4);

      renderWordCloudLayer({ ...context, config: { ...context.config, data: [] }, data: [] });
      await settle();

      expect(words(g)).toHaveLength(0);
    });

    it('restores full opacity on survivors synchronously', () => {
      const { context, g } = createContext(WORDS);
      renderWordCloudLayer(context);

      // Re-render immediately, mid-fade — the survivor must not be stranded part-way.
      renderWordCloudLayer(context);

      expect(styleOf(wordFor(g, 'alpha'), 'opacity')).toBe('1');
    });

    it('reuses the single container group across re-renders', () => {
      const { context, g } = createContext(WORDS);

      renderWordCloudLayer(context);
      renderWordCloudLayer(context);

      expect(g.querySelectorAll('.nge-wordcloud-container')).toHaveLength(1);
    });
  });

  describe('interaction', () => {
    it('emits a tooltip event on hover and hides it on leave', () => {
      const { context, g, onTooltip } = createContext(WORDS, { tooltip: true });
      renderWordCloudLayer(context);

      wordFor(g, 'alpha').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledWith(
        expect.objectContaining({
          content: { label: 'alpha', value: 100 },
          visible: true,
        })
      );

      wordFor(g, 'alpha').dispatchEvent(new MouseEvent('mouseleave'));

      expect(onTooltip).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    });

    it('keeps the tooltip bubble on the canvas', () => {
      const { context, g, onTooltip } = createContext(WORDS, { tooltip: true });
      renderWordCloudLayer(context);

      wordFor(g, 'delta').dispatchEvent(new MouseEvent('mouseenter'));

      const { position } = onTooltip.mock.calls[0][0];
      expect(position.x).toBeGreaterThanOrEqual(context.margins.left);
      expect(position.x).toBeLessThanOrEqual(context.margins.left + DIMENSIONS.boundedWidth - 120);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('calls onClick with the datum and its placement index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(WORDS, { onClick });
      renderWordCloudLayer(context);

      wordFor(g, 'beta').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ data: WORDS[1], index: 1 }));
    });

    it('marks words as interactive only when a handler is configured', () => {
      const plain = createContext(WORDS);
      renderWordCloudLayer(plain.context);
      expect(styleOf(wordFor(plain.g, 'alpha'), 'cursor')).toBe('default');

      const clickable = createContext(WORDS, { onClick: jest.fn() });
      renderWordCloudLayer(clickable.context);
      expect(styleOf(wordFor(clickable.g, 'alpha'), 'cursor')).toBe('pointer');
    });
  });
});
