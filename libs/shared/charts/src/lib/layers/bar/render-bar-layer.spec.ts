import type { ScaleLinear } from 'd3-scale';

import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeBarDataPoint, NgeBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeBarLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderBarLayer } from './render-bar-layer';

type BarContext = NgeChartLayerContext<
  NgeBarDataPoint,
  NgeBarLayerConfig,
  NgeBarLayerTheme | undefined
>;

interface ContextOptions {
  labelColor?: string;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showZeroLine?: boolean;
  theme?: NgeBarLayerTheme;
  /** Explicit value-scale domain (defaults to a symmetric, zero-spanning [-1.1, 1.1]). */
  valueDomain?: [number, number];
}

const BOUNDED_WIDTH = 500;
const BOUNDED_HEIGHT = 300;

/**
 * Build a jsdom SVG bounds group + a layer context for the bar renderer. Fill colors
 * are applied via `.style` synchronously and read back verbatim; the rect geometry
 * (`y`/`height` for vertical, `x`/`width` for horizontal), however, is applied on a
 * d3 transition, so it is only final after `settle()`.
 */
function createContext(
  data: NgeBarDataPoint[],
  options: ContextOptions = {}
): { context: BarContext; g: SVGGElement } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const orientation = options.orientation ?? 'vertical';
  const isVertical = orientation === 'vertical';

  const config: NgeBarLayerConfig = {
    data,
    labelColor: options.labelColor,
    orientation,
    renderer: renderBarLayer,
    showLabels: options.showLabels ?? false,
    showZeroLine: options.showZeroLine ?? false,
    type: 'bar',
  };

  const labels = data.map(d => d.label);
  const valueDomain = options.valueDomain ?? [-1.1, 1.1];
  const bandScale = scaleBand<string>()
    .domain(labels)
    .range([0, isVertical ? BOUNDED_WIDTH : BOUNDED_HEIGHT])
    .padding(0.2);
  const valueScale = scaleLinear()
    .domain(valueDomain)
    .range(isVertical ? [BOUNDED_HEIGHT, 0] : [0, BOUNDED_WIDTH]);

  const context: BarContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: {
      boundedHeight: BOUNDED_HEIGHT,
      boundedWidth: BOUNDED_WIDTH,
      height: BOUNDED_HEIGHT + 40,
      margin: { bottom: 25, left: 45, right: 15, top: 15 },
      width: BOUNDED_WIDTH + 60,
    },
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales: {
      x: isVertical ? bandScale : valueScale,
      y: isVertical ? valueScale : bandScale,
    },
    theme: options.theme,
    tooltipConfig: undefined,
    tooltipHandlers: undefined,
  };

  return { context, g };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** The `.nge-bar` rect bound to a specific source datum (via d3's __data__). */
function rectForDatum(g: SVGGElement, datum: NgeBarDataPoint): SVGRectElement {
  const match = Array.from(g.querySelectorAll<SVGRectElement>('.nge-bar')).find(
    node => (node as unknown as { __data__: NgeBarDataPoint }).__data__ === datum
  );
  if (!match) {
    throw new Error('No bar rect bound to the given datum');
  }
  return match;
}

const numAttr = (el: Element, attr: string): number => parseFloat(el.getAttribute(attr) ?? 'NaN');

/**
 * Real-timer wait so d3 transitions run to completion. The bar renderer applies the
 * rect geometry via a transition (never synchronously), so `y`/`height` are only
 * observable after a real delay past the enter duration. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderBarLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderBarLayer(context);

      expect(g.querySelectorAll('.nge-bar-group')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-bar')).toHaveLength(0);
    });
  });

  describe('structure & color', () => {
    const data: NgeBarDataPoint[] = [
      { color: 'var(--win)', label: 'A', value: 1 },
      { color: 'var(--loss)', label: 'B', value: -1 },
    ];

    it('renders one group + one rect per datum', () => {
      const { context, g } = createContext(data);

      renderBarLayer(context);

      expect(g.querySelectorAll('.nge-bar-group')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-bar')).toHaveLength(2);
    });

    it('fills each rect with its per-datum color (via .style)', () => {
      const { context, g } = createContext(data);

      renderBarLayer(context);

      expect(styleOf(rectForDatum(g, data[0]), 'fill')).toBe('var(--win)');
      expect(styleOf(rectForDatum(g, data[1]), 'fill')).toBe('var(--loss)');
    });
  });

  describe('vertical zero-anchoring (win-loss)', () => {
    it('draws positive bars above the zero line and negative bars below it', async () => {
      const data: NgeBarDataPoint[] = [
        { label: 'win', value: 1 },
        { label: 'loss', value: -1 },
        { label: 'tie', value: 0 },
      ];
      const { context, g } = createContext(data, { valueDomain: [-1.1, 1.1] });
      const valueScale = context.scales.y as ScaleLinear<number, number>;
      const zeroY = valueScale(0);

      renderBarLayer(context);
      await settle();

      const win = rectForDatum(g, data[0]);
      const loss = rectForDatum(g, data[1]);
      const tie = rectForDatum(g, data[2]);

      // Win: sits ABOVE the midline — top above zero, bottom edge resting on zero.
      expect(numAttr(win, 'y')).toBeLessThan(zeroY);
      expect(numAttr(win, 'y') + numAttr(win, 'height')).toBeCloseTo(zeroY);

      // Loss: sits BELOW the midline — top edge on zero, bottom extending down.
      expect(numAttr(loss, 'y')).toBeCloseTo(zeroY);
      expect(numAttr(loss, 'y') + numAttr(loss, 'height')).toBeGreaterThan(zeroY);

      // Win and loss are mirror images — equal height around the baseline.
      expect(numAttr(win, 'height')).toBeCloseTo(numAttr(loss, 'height'));

      // Tie: a zero-height mark on the baseline.
      expect(numAttr(tie, 'height')).toBeCloseTo(0);
    });
  });

  describe('zero baseline rule (showZeroLine)', () => {
    const data: NgeBarDataPoint[] = [
      { label: 'win', value: 1 },
      { label: 'loss', value: -1 },
    ];

    it('draws a labelless rule at valueScale(0) across the plot when enabled', () => {
      const { context, g } = createContext(data, { showZeroLine: true, valueDomain: [-1.1, 1.1] });
      const valueScale = context.scales.y as ScaleLinear<number, number>;

      renderBarLayer(context);

      const zeroLine = g.querySelector<SVGLineElement>('.nge-bar-zero-line');
      expect(zeroLine).not.toBeNull();
      expect(numAttr(zeroLine!, 'y1')).toBeCloseTo(valueScale(0));
      expect(numAttr(zeroLine!, 'y2')).toBeCloseTo(valueScale(0));
      expect(numAttr(zeroLine!, 'x1')).toBe(0);
      expect(numAttr(zeroLine!, 'x2')).toBe(BOUNDED_WIDTH);
      expect(zeroLine!.textContent).toBe(''); // labelless
    });

    it('keeps the rule behind the bars (lowered to first child)', () => {
      const { context, g } = createContext(data, { showZeroLine: true });

      renderBarLayer(context);

      expect(g.querySelector('.nge-bar-zero-line')).toBe(g.firstElementChild);
    });

    it('renders no rule when showZeroLine is falsy', () => {
      const { context, g } = createContext(data, { showZeroLine: false });

      renderBarLayer(context);

      expect(g.querySelector('.nge-bar-zero-line')).toBeNull();
    });

    it('removes an existing rule when re-rendered with the flag off', () => {
      const { context, g } = createContext(data, { showZeroLine: true });
      renderBarLayer(context);
      expect(g.querySelector('.nge-bar-zero-line')).not.toBeNull();

      context.config.showZeroLine = false;
      renderBarLayer(context);
      expect(g.querySelector('.nge-bar-zero-line')).toBeNull();
    });
  });

  describe('backward compatibility (all-positive is unchanged)', () => {
    it('reproduces the old bottom-anchored geometry when the domain starts at zero', async () => {
      // The bar helper's value domain always spans zero, so all-positive data yields a
      // [0, max*headroom] domain where valueScale(0) === boundedHeight. The new
      // zero-anchored formula must reduce IDENTICALLY to the pre-change output
      // (y = valueScale(value), height = boundedHeight − valueScale(value)).
      const data: NgeBarDataPoint[] = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 15 },
      ];
      const { context, g } = createContext(data, { valueDomain: [0, 22] });
      const valueScale = context.scales.y as ScaleLinear<number, number>;

      renderBarLayer(context);
      await settle();

      for (const datum of data) {
        const rect = rectForDatum(g, datum);
        const expectedY = valueScale(datum.value);
        const expectedHeight = BOUNDED_HEIGHT - valueScale(datum.value); // old formula
        expect(numAttr(rect, 'y')).toBeCloseTo(expectedY);
        expect(numAttr(rect, 'height')).toBeCloseTo(expectedHeight);
      }
    });
  });

  describe('horizontal orientation still zero-anchors (no regression)', () => {
    it('extends negative bars to the left of the zero line', async () => {
      const data: NgeBarDataPoint[] = [
        { label: 'pos', value: 1 },
        { label: 'neg', value: -1 },
      ];
      const { context, g } = createContext(data, {
        orientation: 'horizontal',
        valueDomain: [-1.1, 1.1],
      });
      const valueScale = context.scales.x as ScaleLinear<number, number>;
      const zeroX = valueScale(0);

      renderBarLayer(context);
      await settle();

      const neg = rectForDatum(g, data[1]);
      // Negative bar starts left of zero and runs up to the baseline.
      expect(numAttr(neg, 'x')).toBeLessThan(zeroX);
      expect(numAttr(neg, 'x') + numAttr(neg, 'width')).toBeCloseTo(zeroX);
    });
  });

  describe('label placement follows the bar direction', () => {
    it('puts a positive label above the midline and a negative label below it', () => {
      const data: NgeBarDataPoint[] = [
        { label: 'win', value: 1 },
        { label: 'loss', value: -1 },
      ];
      const { context, g } = createContext(data, {
        showLabels: true,
        valueDomain: [-1.1, 1.1],
      });
      const valueScale = context.scales.y as ScaleLinear<number, number>;
      const zeroY = valueScale(0);

      renderBarLayer(context);

      // Enter labels are positioned synchronously (no transition), so read immediately.
      const labels = Array.from(g.querySelectorAll<SVGTextElement>('.nge-bar-label'));
      const winLabel = labels.find(l => l.textContent === '1');
      const lossLabel = labels.find(l => l.textContent === '-1');

      expect(winLabel).toBeDefined();
      expect(lossLabel).toBeDefined();
      expect(numAttr(winLabel!, 'y')).toBeLessThan(zeroY);
      expect(numAttr(lossLabel!, 'y')).toBeGreaterThan(zeroY);
    });
  });

  describe('label colour resolution (ARCH-266)', () => {
    // Bar value labels are drawn on the PLOT SURFACE just outside the bar, not on its
    // fill, so this layer deliberately has no derived on-fill contrast rung — only the
    // two explicit ones over the theme default.
    const DARK = '#101820';
    const LIGHT = '#fff3c4';

    function labelWithText(g: SVGGElement, text: string): SVGTextElement {
      const match = Array.from(g.querySelectorAll<SVGTextElement>('.nge-bar-label')).find(
        node => node.textContent === text
      );
      if (!match) {
        throw new Error(`No bar label with text "${text}"`);
      }
      return match;
    }

    it('rung 1 — a per-datum labelColor wins over the layer config', () => {
      const { context, g } = createContext([{ label: 'A', labelColor: '#ff0000', value: 1 }], {
        labelColor: '#00ff00',
        showLabels: true,
      });

      renderBarLayer(context);

      expect(labelWithText(g, '1').getAttribute('fill')).toBe('#ff0000');
    });

    it('rung 2 — a layer-config labelColor applies to every bar', () => {
      const { context, g } = createContext(
        [
          { color: DARK, label: 'A', value: 1 },
          { color: LIGHT, label: 'B', value: 0.5 },
        ],
        { labelColor: '#00ff00', showLabels: true }
      );

      renderBarLayer(context);

      expect(labelWithText(g, '1').getAttribute('fill')).toBe('#00ff00');
      expect(labelWithText(g, '0.5').getAttribute('fill')).toBe('#00ff00');
    });

    it('does NOT derive from the bar fill — opposite-luminance bars share one label colour', () => {
      const { context, g } = createContext(
        [
          { color: DARK, label: 'A', value: 1 },
          { color: LIGHT, label: 'B', value: 0.5 },
        ],
        { showLabels: true, theme: { label: { color: '#0000ff' } } }
      );

      renderBarLayer(context);

      expect(labelWithText(g, '1').getAttribute('fill')).toBe('#0000ff');
      expect(labelWithText(g, '0.5').getAttribute('fill')).toBe('#0000ff');
    });
  });
});
