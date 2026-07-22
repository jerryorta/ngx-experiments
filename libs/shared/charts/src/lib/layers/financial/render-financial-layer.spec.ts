import type { ScaleBand, ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  FinancialVariant,
  NgeChartConfig,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeFinancialLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { createFinancialChartScalesFactory } from '../../nge-chart/nge-chart.financial.helpers';
import { renderFinancialLayer } from './render-financial-layer';

type FinancialContext = NgeChartLayerContext<
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
  NgeFinancialLayerTheme | undefined
>;

interface ContextOptions {
  brickSize?: number;
  candleWidth?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  reversalThreshold?: number;
  theme?: NgeFinancialLayerTheme;
  tooltip?: boolean;
  variant?: FinancialVariant;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const MARGINS = { bottom: 25, left: 45, right: 15, top: 15 };

/** Three candles: up (close 13 ≥ open 10), down (close 11 < open 13), up (15 ≥ 11). */
const CANDLE_DATA: NgeFinancialDataPoint[] = [
  { close: 13, date: '2024-01-01', high: 14, low: 9, open: 10 },
  { close: 11, date: '2024-01-02', high: 15, low: 11, open: 13 },
  { close: 15, date: '2024-01-03', high: 16, low: 10, open: 11 },
];

/** A close series with a clean reversal: kagi turns [10,12,9,12] → 3 segments. */
const KAGI_CLOSES = [10, 11, 12, 10, 9, 12];

/** A close series that emits up, up, then a reversal-down renko brick. */
const RENKO_CLOSES = [10, 13, 16, 9];

/** OHLC points from a `close` series (kagi/renko read only `close`). */
function ohlc(closes: number[]): NgeFinancialDataPoint[] {
  return closes.map((close, index) => ({
    close,
    date: index,
    high: close + 1,
    low: close - 1,
    open: close,
  }));
}

/**
 * Build a jsdom SVG bounds group + a layer context for the financial renderer, with
 * scales from the real factory so band positions / price domain match production.
 * Enter geometry is applied synchronously so it reads back verbatim.
 */
function createContext(
  data: NgeFinancialDataPoint[],
  options: ContextOptions = {}
): { context: FinancialContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeFinancialLayerConfig = {
    brickSize: options.brickSize,
    candleWidth: options.candleWidth,
    data,
    onClick: options.onClick,
    renderer: renderFinancialLayer,
    reversalThreshold: options.reversalThreshold,
    tooltip: options.tooltip
      ? {
          enabled: true,
          formatContent: (point: NgeFinancialDataPoint) => ({
            label: String(point.date),
            value: point.close,
          }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    type: 'financial',
    variant: options.variant,
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createFinancialChartScalesFactory({})(chartConfig, DIMENSIONS);

  const context: FinancialContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: MARGINS,
    scales,
    theme: options.theme,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** Numeric value of an attribute. */
function num(el: Element, attr: string): number {
  return Number(el.getAttribute(attr));
}

/** Count elements matching a sub-mark class. */
function count(g: SVGGElement, className: string): number {
  return g.querySelectorAll(`.${className}`).length;
}

/** All elements of a sub-mark class, in document order. */
function all(g: SVGGElement, className: string): SVGElement[] {
  return Array.from(g.querySelectorAll<SVGElement>(`.${className}`));
}

/**
 * Real-timer wait so d3 transitions run to completion. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env, so exit-removal (marks fading out on a
 * variant toggle) is only observable after a real delay past the exit duration.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderFinancialLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderFinancialLayer(context);

      expect(count(g, 'nge-financial-body')).toBe(0);
    });

    it('removes stale marks when the data empties', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);
      expect(count(g, 'nge-financial-body')).toBe(3);

      context.data = [];
      renderFinancialLayer(context);

      expect(count(g, 'nge-financial-body')).toBe(0);
      expect(count(g, 'nge-financial-wick')).toBe(0);
    });
  });

  describe('candlestick variant', () => {
    it('draws a wick + body per candle', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);

      expect(count(g, 'nge-financial-wick')).toBe(3);
      expect(count(g, 'nge-financial-body')).toBe(3);
    });

    it('sizes each body to its [open, close] span, centered in the slot', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const xScale = context.scales.x as ScaleBand<string>;
      const center = (xScale('0') ?? 0) + xScale.bandwidth() / 2;
      const width = 0.6 * xScale.bandwidth();

      const body = all(g, 'nge-financial-body')[0];
      // Candle 0: open 10, close 13 → top at close (higher price = smaller y).
      expect(num(body, 'x')).toBeCloseTo(center - width / 2, 6);
      expect(num(body, 'width')).toBeCloseTo(width, 6);
      expect(num(body, 'y')).toBeCloseTo(yScale(13), 6);
      expect(num(body, 'height')).toBeCloseTo(Math.abs(yScale(10) - yScale(13)), 6);
    });

    it('clamps a doji (open === close) body to the MIN_BODY_HEIGHT floor and resolves it up', () => {
      // open === close → zero raw [open, close] span; the render fn clamps the body
      // height to the ~1px MIN_BODY_HEIGHT floor, and the close >= open equality
      // boundary resolves the direction up.
      const doji: NgeFinancialDataPoint[] = [
        { close: 12, date: '2024-02-01', high: 14, low: 10, open: 12 },
      ];
      const { context, g } = createContext(doji);

      renderFinancialLayer(context);

      const body = all(g, 'nge-financial-body')[0];
      expect(num(body, 'height')).toBeCloseTo(1, 6);
      expect(body.getAttribute('data-direction')).toBe('up');
    });

    it('spans each wick from low to high', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const wick = all(g, 'nge-financial-wick')[0];
      // Candle 0: low 9, high 14.
      expect(num(wick, 'y1')).toBeCloseTo(yScale(14), 6);
      expect(num(wick, 'y2')).toBeCloseTo(yScale(9), 6);
    });

    it('colors up bodies green and down bodies red (via .style)', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);

      const bodies = all(g, 'nge-financial-body');
      // Candle 0 up, candle 1 down.
      expect(styleOf(bodies[0], 'fill')).toBe('#4caf50');
      expect(bodies[0].getAttribute('data-direction')).toBe('up');
      expect(styleOf(bodies[1], 'fill')).toBe('#f44336');
      expect(bodies[1].getAttribute('data-direction')).toBe('down');
    });

    it('honours a theme up-color override', () => {
      const { context, g } = createContext(CANDLE_DATA, { theme: { up: { color: 'var(--up)' } } });

      renderFinancialLayer(context);

      expect(styleOf(all(g, 'nge-financial-body')[0], 'fill')).toBe('var(--up)');
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);
      renderFinancialLayer(context);

      expect(count(g, 'nge-financial-body')).toBe(3);
      expect(count(g, 'nge-financial-wick')).toBe(3);
    });
  });

  describe('kagi variant', () => {
    it('draws one kagi segment per turning leg plus a connector path', () => {
      const { context, g } = createContext(ohlc(KAGI_CLOSES), {
        reversalThreshold: 2,
        variant: 'kagi',
      });

      renderFinancialLayer(context);

      // turns [10,12,9,12] → 3 segments.
      expect(count(g, 'nge-financial-kagi')).toBe(3);
      expect(count(g, 'nge-financial-connector')).toBe(1);
      expect(count(g, 'nge-financial-body')).toBe(0);
    });

    it('carries the yang / yin style per segment', () => {
      const { context, g } = createContext(ohlc(KAGI_CLOSES), {
        reversalThreshold: 2,
        variant: 'kagi',
      });

      renderFinancialLayer(context);

      const lines = all(g, 'nge-financial-kagi');
      expect(lines.map(line => line.getAttribute('data-line'))).toEqual(['yang', 'yin', 'yin']);
      // Yang lines are thicker than yin lines.
      expect(styleOf(lines[0], 'stroke-width')).toBe('2.5px');
      expect(styleOf(lines[1], 'stroke-width')).toBe('1.25px');
      expect(styleOf(lines[0], 'stroke')).toBe('var(--chart-primary)');
      expect(styleOf(lines[1], 'stroke')).toBe('var(--chart-error)');
    });
  });

  describe('renko variant', () => {
    it('draws one brick per emitted brick, colored by direction', () => {
      const { context, g } = createContext(ohlc(RENKO_CLOSES), {
        brickSize: 3,
        variant: 'renko',
      });

      renderFinancialLayer(context);

      const bricks = all(g, 'nge-financial-brick');
      // up[10,13], up[13,16], reversal down[10,13].
      expect(bricks).toHaveLength(3);
      expect(bricks.map(brick => brick.getAttribute('data-direction'))).toEqual([
        'up',
        'up',
        'down',
      ]);
      expect(styleOf(bricks[0], 'fill')).toBe('#4caf50');
      expect(styleOf(bricks[2], 'fill')).toBe('#f44336');
    });

    it('sizes each brick to one brickSize on the price axis', () => {
      const { context, g } = createContext(ohlc(RENKO_CLOSES), {
        brickSize: 3,
        variant: 'renko',
      });

      renderFinancialLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const brick = all(g, 'nge-financial-brick')[0];
      // Brick 0 spans [10, 13].
      expect(num(brick, 'y')).toBeCloseTo(yScale(13), 6);
      expect(num(brick, 'height')).toBeCloseTo(Math.abs(yScale(10) - yScale(13)), 6);
    });
  });

  describe('variant switch', () => {
    it('exits the candlestick marks when switching to kagi', async () => {
      const { context, g } = createContext(ohlc(KAGI_CLOSES), { reversalThreshold: 2 });

      renderFinancialLayer(context);
      expect(count(g, 'nge-financial-body')).toBe(6);
      // Let the initial paint settle (as it would across frames) before toggling.
      await settle();

      context.config.variant = 'kagi';
      context.scales = createFinancialChartScalesFactory({})(
        { layers: [context.config] },
        DIMENSIONS
      );
      renderFinancialLayer(context);
      await settle();

      // The now-inactive candlestick joins exit cleanly — no leaked wicks / bodies.
      expect(count(g, 'nge-financial-body')).toBe(0);
      expect(count(g, 'nge-financial-wick')).toBe(0);
      expect(count(g, 'nge-financial-kagi')).toBeGreaterThan(0);
    });
  });

  describe('interaction (candlestick)', () => {
    it('leaves bodies non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(CANDLE_DATA);

      renderFinancialLayer(context);

      expect(styleOf(all(g, 'nge-financial-body')[0], 'cursor')).toBe('default');
    });

    it('routes the hovered candle to the tooltip with its close price', () => {
      const { context, g, onTooltip } = createContext(CANDLE_DATA, { tooltip: true });

      renderFinancialLayer(context);
      all(g, 'nge-financial-body')[0].dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(13);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(CANDLE_DATA, { tooltip: true });

      renderFinancialLayer(context);
      const body = all(g, 'nge-financial-body')[0];
      body.dispatchEvent(new MouseEvent('mouseenter'));
      body.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked candle and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(CANDLE_DATA, { onClick });

      renderFinancialLayer(context);
      all(g, 'nge-financial-body')[1].dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].index).toBe(1);
      expect(onClick.mock.calls[0][0].data.close).toBe(11);
    });
  });
});
