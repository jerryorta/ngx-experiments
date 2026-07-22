import { scaleLinear, scalePoint } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeOverlayDataPoint, NgeOverlayLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeOverlayLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderOverlayLayer } from './render-overlay-layer';

type OverlayContext = NgeChartLayerContext<
  NgeOverlayDataPoint,
  NgeOverlayLayerConfig,
  NgeOverlayLayerTheme | undefined
>;

interface ContextOptions {
  /** Use a categorical (point) x-scale — no `invert`, so trend / fan must no-op. */
  categoricalX?: boolean;
  fit?: NgeOverlayLayerConfig['fit'];
  intervals?: number[];
  onTooltip?: jest.Mock;
  seriesId?: string;
  showControlBand?: boolean;
  showFitLine?: boolean;
  tooltip?: boolean;
}

/**
 * Build a jsdom SVG bounds group + a layer context for the overlay renderer. Every
 * mode places its marks' geometry synchronously on enter, so mark presence / counts are
 * observable immediately (no transition flush needed) — this is a SMOKE harness that
 * asserts which marks exist, never their pixel geometry.
 */
function createContext(
  mode: NgeOverlayLayerConfig['mode'],
  data: NgeOverlayDataPoint[],
  options: ContextOptions = {}
): { context: OverlayContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeOverlayLayerConfig = {
    data,
    fit: options.fit,
    intervals: options.intervals,
    mode,
    renderer: renderOverlayLayer,
    seriesId: options.seriesId,
    showControlBand: options.showControlBand,
    showFitLine: options.showFitLine,
    tooltip: options.tooltip ? { enabled: true } : undefined,
    type: 'overlay',
  };

  const context: OverlayContext = {
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
      x: options.categoricalX
        ? scalePoint<string>().domain(['a', 'b', 'c']).range([0, 500])
        : scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    },
    theme: undefined,
    tooltipConfig: options.tooltip
      ? { enabled: true, height: 56, position: 'above', width: 160 }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** A continuous-x series with a clear upward trend (fits + fans need >= 2 points). */
const TREND_DATA: NgeOverlayDataPoint[] = [
  { x: 0, y: 5 },
  { x: 25, y: 28 },
  { x: 50, y: 52 },
  { x: 75, y: 74 },
  { x: 100, y: 96 },
];

/** A categorical-x series — a point scale has no `invert`, so trend / fan no-op. */
const CATEGORICAL_DATA: NgeOverlayDataPoint[] = [
  { x: 'a', y: 10 },
  { x: 'b', y: 20 },
  { x: 'c', y: 15 },
];

describe('renderOverlayLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext('trendline', []);

      expect(() => renderOverlayLayer(context)).not.toThrow();
      expect(g.querySelectorAll("[class*='nge-overlay']")).toHaveLength(0);
    });

    it('removes marks and does not throw when data empties on a re-render', () => {
      const { context, g } = createContext('trendline', TREND_DATA);

      renderOverlayLayer(context);
      expect(g.querySelectorAll('.nge-overlay-fit').length).toBeGreaterThan(0);

      context.data = [];
      context.config.data = [];
      expect(() => renderOverlayLayer(context)).not.toThrow();
      expect(g.querySelectorAll("[class*='nge-overlay']")).toHaveLength(0);
    });
  });

  describe('trendline mode', () => {
    it('renders a single fit path for a continuous-x series', () => {
      const { context, g } = createContext('trendline', TREND_DATA);

      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-series')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-overlay-fit')).toHaveLength(1);
      expect(g.querySelector('.nge-overlay-fit')!.getAttribute('d')).toMatch(/^M/);
    });

    it('renders a loess fit path too', () => {
      const { context, g } = createContext('trendline', TREND_DATA, { fit: 'loess' });

      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-fit')).toHaveLength(1);
    });

    it('no-ops (no fit path, no throw) on a categorical x-scale', () => {
      const { context, g } = createContext('trendline', CATEGORICAL_DATA, { categoricalX: true });

      expect(() => renderOverlayLayer(context)).not.toThrow();
      expect(g.querySelectorAll('.nge-overlay-fit')).toHaveLength(0);
    });
  });

  describe('control mode', () => {
    it('renders the mean rule and both ±σ limit rules', () => {
      const { context, g } = createContext('control', TREND_DATA);

      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-mean')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-overlay-limit')).toHaveLength(2);
    });

    it('omits the shaded band by default and draws it when showControlBand is true', () => {
      const off = createContext('control', TREND_DATA);
      renderOverlayLayer(off.context);
      expect(off.g.querySelectorAll('.nge-overlay-control-band')).toHaveLength(0);

      const on = createContext('control', TREND_DATA, { showControlBand: true });
      renderOverlayLayer(on.context);
      expect(on.g.querySelectorAll('.nge-overlay-control-band')).toHaveLength(1);
    });
  });

  describe('fan mode', () => {
    it('renders one band path per interval level', () => {
      const { context, g } = createContext('fan', TREND_DATA, { intervals: [0.5, 0.9] });

      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-fan-band')).toHaveLength(2);
      expect(g.querySelector('.nge-overlay-fan-band')!.getAttribute('d')).toMatch(/^M/);
    });

    it('defaults to three bands when no intervals are given', () => {
      const { context, g } = createContext('fan', TREND_DATA);

      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-fan-band')).toHaveLength(3);
    });

    it('no-ops (no bands, no throw) on a categorical x-scale', () => {
      const { context, g } = createContext('fan', CATEGORICAL_DATA, { categoricalX: true });

      expect(() => renderOverlayLayer(context)).not.toThrow();
      expect(g.querySelectorAll('.nge-overlay-fan-band')).toHaveLength(0);
    });
  });

  describe('mode switching', () => {
    it('removes the previous mode marks when the mode changes', () => {
      const { context, g } = createContext('trendline', TREND_DATA);

      renderOverlayLayer(context);
      expect(g.querySelectorAll('.nge-overlay-fit').length).toBeGreaterThan(0);

      context.config.mode = 'control';
      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-series')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-overlay-fit')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-overlay-mean')).toHaveLength(1);

      context.config.mode = 'fan';
      renderOverlayLayer(context);

      expect(g.querySelectorAll('.nge-overlay-mean')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-overlay-limit')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-overlay-fan-band').length).toBeGreaterThan(0);
    });
  });

  describe('tooltip wiring', () => {
    it('emits a visible tooltip with the interval level on fan-band hover', () => {
      const { context, g, onTooltip } = createContext('fan', TREND_DATA, {
        intervals: [0.9],
        tooltip: true,
      });

      renderOverlayLayer(context);
      g.querySelector<SVGPathElement>('.nge-overlay-fan-band')!.dispatchEvent(
        new MouseEvent('mouseenter')
      );

      expect(onTooltip).toHaveBeenCalled();
      const event = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe('90%');
    });

    it('leaves fan bands pointer-transparent when no tooltip is wired', () => {
      const { context, g } = createContext('fan', TREND_DATA, { intervals: [0.9] });

      renderOverlayLayer(context);

      expect(styleOf(g.querySelector('.nge-overlay-fan-band')!, 'pointer-events')).toBe('none');
    });
  });
});
