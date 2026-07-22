import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeLineDataPoint, NgeLineLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeLineLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderLineLayer } from './render-line-layer';

type LineContext = NgeChartLayerContext<
  NgeLineDataPoint,
  NgeLineLayerConfig,
  NgeLineLayerTheme | undefined
>;

interface ContextOptions {
  curveType?: 'basis' | 'linear' | 'monotone' | 'step';
  lineWidth?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  pointRadius?: number;
  seriesColors?: string[];
  showArea?: boolean;
  showPoints?: boolean;
  theme?: NgeLineLayerTheme;
  tooltip?: boolean;
}

/**
 * Build a jsdom SVG bounds group + a layer context for the line renderer. Series
 * structure, stroke colors (applied via `.style`), and point positions are set
 * synchronously and read back verbatim; the line path `d`, however, is applied on a
 * d3 transition (see the `curve mapping` block) so it is only final after `settle()`.
 */
function createContext(
  data: NgeLineDataPoint[],
  options: ContextOptions = {}
): { context: LineContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeLineLayerConfig = {
    curveType: options.curveType,
    data,
    lineWidth: options.lineWidth,
    onClick: options.onClick,
    pointRadius: options.pointRadius,
    renderer: renderLineLayer,
    seriesColors: options.seriesColors,
    showArea: options.showArea,
    showPoints: options.showPoints ?? true,
    type: 'line',
  };

  const context: LineContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: {
      boundedHeight: 300,
      boundedWidth: 500,
      height: 340,
      margin: { bottom: 25, left: 45, right: 15, top: 15 },
      width: 560,
    },
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales: {
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    },
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeLineDataPoint) => ({ label: `x ${String(d.x)}`, value: d.y }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** The first `.nge-line-path` in a group (single-series case). */
function linePath(g: SVGGElement): SVGPathElement {
  return g.querySelector<SVGPathElement>('.nge-line-path')!;
}

/** The point circle bound to a specific source datum (via d3's __data__). */
function pointForDatum(g: SVGGElement, datum: NgeLineDataPoint): SVGCircleElement {
  const match = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-line-point')).find(
    node => (node as unknown as { __data__: NgeLineDataPoint }).__data__ === datum
  );
  if (!match) {
    throw new Error('No point bound to the given datum');
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. The line renderer applies the
 * path `d` via a transition (never synchronously), so the curve geometry is only
 * observable after a real delay past the update duration. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Non-collinear, non-monotonic data so every curve type yields a distinct path. */
const CURVE_DATA: NgeLineDataPoint[] = [
  { x: 0, y: 10 },
  { x: 33, y: 45 },
  { x: 66, y: 20 },
  { x: 100, y: 50 },
];

describe('renderLineLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderLineLayer(context);

      expect(g.querySelectorAll('.nge-line-series')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-line-path')).toHaveLength(0);
    });
  });

  describe('series structure', () => {
    it('renders one default series + one path for single-series data', () => {
      const data: NgeLineDataPoint[] = [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 },
      ];
      const { context, g } = createContext(data, { showPoints: false });

      renderLineLayer(context);

      const series = g.querySelectorAll('.nge-line-series');
      expect(series).toHaveLength(1);
      expect(series[0].getAttribute('data-series-id')).toBe('__default__');
      expect(g.querySelectorAll('.nge-line-path')).toHaveLength(1);
    });

    it('renders one path per series for multi-series overlaid data', () => {
      const data: NgeLineDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'A', x: 1, y: 20 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'B', x: 1, y: 8 },
      ];
      const { context, g } = createContext(data, { showPoints: false });

      renderLineLayer(context);

      const series = Array.from(g.querySelectorAll('.nge-line-series'));
      expect(series.map(s => s.getAttribute('data-series-id'))).toEqual(['A', 'B']);
      expect(g.querySelectorAll('.nge-line-path')).toHaveLength(2);
    });

    it('re-renders idempotently, keeping one path per series', () => {
      const data: NgeLineDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'A', x: 1, y: 12 },
        { seriesId: 'B', x: 1, y: 7 },
      ];
      const { context, g } = createContext(data, { showPoints: false });

      renderLineLayer(context);
      renderLineLayer(context);

      expect(g.querySelectorAll('.nge-line-series')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-line-path')).toHaveLength(2);
    });
  });

  describe('curve mapping (linear | monotone | step | basis)', () => {
    it('routes each curveType to a genuinely different d3 curve factory', async () => {
      // Render every curve type; the line `d` is applied on a transition, so read it
      // only after a single settle past the update duration.
      const linear = createContext(CURVE_DATA, { curveType: 'linear', showPoints: false });
      const monotone = createContext(CURVE_DATA, { curveType: 'monotone', showPoints: false });
      const step = createContext(CURVE_DATA, { curveType: 'step', showPoints: false });
      const basis = createContext(CURVE_DATA, { curveType: 'basis', showPoints: false });
      renderLineLayer(linear.context);
      renderLineLayer(monotone.context);
      renderLineLayer(step.context);
      renderLineLayer(basis.context);

      await settle();

      const linearD = linePath(linear.g).getAttribute('d') ?? '';
      const monotoneD = linePath(monotone.g).getAttribute('d') ?? '';
      const stepD = linePath(step.g).getAttribute('d') ?? '';
      const basisD = linePath(basis.g).getAttribute('d') ?? '';

      // Every curveType yields a valid drawn path, and all four are mutually distinct —
      // proving the switch maps each value to a different factory (in particular `basis`
      // does NOT fall through to the linear default).
      for (const d of [linearD, monotoneD, stepD, basisD]) {
        expect(d).toMatch(/^M/);
      }
      expect(new Set([linearD, monotoneD, stepD, basisD]).size).toBe(4);

      // Straight-segment curves (linear, step) emit line-tos and never cubic beziers;
      // the smooth curves (monotone, basis/B-spline) emit cubic beziers.
      expect(linearD).toContain('L');
      expect(linearD).not.toContain('C');
      expect(stepD).not.toContain('C');
      expect(monotoneD).toContain('C');
      expect(basisD).toContain('C');
    });
  });

  describe('color resolution (via .style)', () => {
    it('maps series index to the config palette on the line stroke, cycling with modulo', () => {
      const data: NgeLineDataPoint[] = [
        { seriesId: 'A', x: 0, y: 1 },
        { seriesId: 'B', x: 1, y: 2 },
        { seriesId: 'C', x: 2, y: 3 },
      ];
      const { context, g } = createContext(data, {
        seriesColors: ['var(--c0)', 'var(--c1)'],
        showPoints: false,
      });

      renderLineLayer(context);

      const paths = Array.from(g.querySelectorAll('.nge-line-path'));
      expect(styleOf(paths[0], 'stroke')).toBe('var(--c0)');
      expect(styleOf(paths[1], 'stroke')).toBe('var(--c1)');
      // Series index 2 wraps: 2 % 2 -> c0.
      expect(styleOf(paths[2], 'stroke')).toBe('var(--c0)');
    });

    it('defaults a single series to the theme palette head (var(--chart-primary))', () => {
      const { context, g } = createContext([{ x: 0, y: 10 }], { showPoints: false });

      renderLineLayer(context);

      expect(styleOf(linePath(g), 'stroke')).toBe('var(--chart-primary)');
      // Empty theme dash resolves to the literal 'none'.
      expect(styleOf(linePath(g), 'stroke-dasharray')).toBe('none');
    });

    it('applies config.lineWidth over the theme default', () => {
      const { context, g } = createContext([{ x: 0, y: 10 }], { lineWidth: 5, showPoints: false });

      renderLineLayer(context);

      expect(styleOf(linePath(g), 'stroke-width')).toBe('5px');
    });
  });

  describe('points', () => {
    const data: NgeLineDataPoint[] = [
      { x: 0, y: 10 },
      { x: 1, y: 20 },
    ];

    it('draws one point per datum when showPoints is true', () => {
      const { context, g } = createContext(data, { showPoints: true });

      renderLineLayer(context);

      expect(g.querySelectorAll('.nge-line-point')).toHaveLength(2);
    });

    it('omits points when showPoints is false', () => {
      const { context, g } = createContext(data, { showPoints: false });

      renderLineLayer(context);

      expect(g.querySelectorAll('.nge-line-point')).toHaveLength(0);
    });

    it('fills points with the theme point color and strokes with the series color (via .style)', () => {
      const { context, g } = createContext(data, { showPoints: true });

      renderLineLayer(context);

      const point = pointForDatum(g, data[0]);
      expect(styleOf(point, 'fill')).toBe('var(--chart-surface)');
      expect(styleOf(point, 'stroke')).toBe('var(--chart-primary)');
    });
  });

  describe('interaction targets', () => {
    const data: NgeLineDataPoint[] = [
      { x: 0, y: 10 },
      { x: 1, y: 20 },
    ];

    it('leaves points non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(data, { showPoints: true });

      renderLineLayer(context);

      expect(styleOf(pointForDatum(g, data[0]), 'cursor')).toBe('default');
    });

    it('routes the hovered datum to the tooltip with the resolved series border color', () => {
      const { context, g, onTooltip } = createContext(data, {
        seriesColors: ['var(--series-a)'],
        showPoints: true,
        tooltip: true,
      });

      renderLineLayer(context);
      pointForDatum(g, data[1]).dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(20);
      expect(event.style?.borderColor).toBe('var(--series-a)');
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(data, { showPoints: true, tooltip: true });

      renderLineLayer(context);
      const point = pointForDatum(g, data[0]);
      point.dispatchEvent(new MouseEvent('mouseenter'));
      point.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its data index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(data, { onClick, showPoints: true });

      renderLineLayer(context);
      pointForDatum(g, data[1]).dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(data[1]);
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });
  });
});
