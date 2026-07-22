import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeAreaDataPoint, NgeAreaLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeAreaLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderAreaLayer } from './render-area-layer';

type AreaContext = NgeChartLayerContext<
  NgeAreaDataPoint,
  NgeAreaLayerConfig,
  NgeAreaLayerTheme | undefined
>;

interface ContextOptions {
  animationMs?: number;
  curveType?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  seriesColors?: string[];
  showLine?: boolean;
  stackOffset?: NgeAreaLayerConfig['stackOffset'];
  theme?: NgeAreaLayerTheme;
  tooltip?: boolean;
}

/**
 * Build a jsdom SVG bounds group + a layer context for the area renderer.
 * Fill / opacity / geometry are set synchronously so they can be read back
 * verbatim without flushing d3 transitions.
 */
function createContext(
  data: NgeAreaDataPoint[],
  options: ContextOptions = {}
): { context: AreaContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeAreaLayerConfig = {
    animationMs: options.animationMs,
    curveType: options.curveType,
    data,
    fillOpacity: options.fillOpacity,
    onClick: options.onClick,
    renderer: renderAreaLayer,
    seriesColors: options.seriesColors,
    showLine: options.showLine,
    stackOffset: options.stackOffset,
    type: 'area',
  };

  const context: AreaContext = {
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
          formatContent: (d: NgeAreaDataPoint) => ({ label: `x ${String(d.x)}`, value: d.y }),
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

/** The `.nge-area-fill` path of a series group. */
function fillPath(group: Element): SVGPathElement {
  return group.querySelector<SVGPathElement>('.nge-area-fill')!;
}

/** The interaction circle bound to a specific source datum (via d3's __data__). */
function pointForDatum(g: SVGGElement, datum: NgeAreaDataPoint): SVGCircleElement {
  const match = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-area-point')).find(
    node => (node as unknown as { __data__: { datum: NgeAreaDataPoint } }).__data__.datum === datum
  );
  if (!match) {
    throw new Error('No interaction point bound to the given datum');
  }
  return match;
}

describe('renderAreaLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-series')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-area-fill')).toHaveLength(0);
    });
  });

  describe('series structure', () => {
    it('renders one default series + one fill for single-series data', () => {
      const data: NgeAreaDataPoint[] = [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 },
      ];
      const { context, g } = createContext(data);

      renderAreaLayer(context);

      const series = g.querySelectorAll('.nge-area-series');
      expect(series).toHaveLength(1);
      expect(series[0].getAttribute('data-series-id')).toBe('__default__');
      expect(g.querySelectorAll('.nge-area-fill')).toHaveLength(1);
      // Geometry is applied synchronously.
      expect(fillPath(series[0]).getAttribute('d')).toMatch(/^M/);
    });

    it('renders one fill per series for multi-series overlaid data', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'A', x: 1, y: 20 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'B', x: 1, y: 8 },
      ];
      const { context, g } = createContext(data);

      renderAreaLayer(context);

      const series = Array.from(g.querySelectorAll('.nge-area-series'));
      expect(series.map(s => s.getAttribute('data-series-id'))).toEqual(['A', 'B']);
      expect(g.querySelectorAll('.nge-area-fill')).toHaveLength(2);
    });

    it('re-renders idempotently, keeping one fill per series', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'A', x: 1, y: 12 },
        { seriesId: 'B', x: 1, y: 7 },
      ];
      const { context, g } = createContext(data);

      renderAreaLayer(context);
      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-series')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-area-fill')).toHaveLength(2);
    });
  });

  describe('stackOffset variants', () => {
    const stacked: NgeAreaDataPoint[] = [
      { seriesId: 'A', x: 0, y: 10 },
      { seriesId: 'A', x: 1, y: 10 },
      { seriesId: 'B', x: 0, y: 20 },
      { seriesId: 'B', x: 1, y: 5 },
    ];

    it.each(['none', 'expand', 'wiggle', 'diverging'] as const)(
      'renders two filled bands with a valid path for stackOffset "%s"',
      stackOffset => {
        const { context, g } = createContext(stacked, { stackOffset });

        renderAreaLayer(context);

        const fills = Array.from(g.querySelectorAll<SVGPathElement>('.nge-area-fill'));
        expect(fills).toHaveLength(2);
        for (const fill of fills) {
          expect(fill.getAttribute('d')).toMatch(/^M/);
        }
      }
    );

    it('gives a stacked series with a missing point one fewer interaction target', () => {
      // A has points at x=0,1,2; B only at x=0,2. The stacked pivot fills (B,x=1)
      // with 0 (a synthetic zero segment), and the renderer excludes segments with
      // no source datum — so B gets one fewer `.nge-area-point` than A.
      const asymmetric: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 10 },
        { seriesId: 'A', x: 1, y: 12 },
        { seriesId: 'A', x: 2, y: 8 },
        { seriesId: 'B', x: 0, y: 5 },
        { seriesId: 'B', x: 2, y: 7 },
      ];
      const { context, g } = createContext(asymmetric, { stackOffset: 'none', tooltip: true });

      renderAreaLayer(context);

      const groups = Array.from(g.querySelectorAll('.nge-area-series'));
      const aGroup = groups.find(gr => gr.getAttribute('data-series-id') === 'A')!;
      const bGroup = groups.find(gr => gr.getAttribute('data-series-id') === 'B')!;
      expect(aGroup.querySelectorAll('.nge-area-point')).toHaveLength(3);
      expect(bGroup.querySelectorAll('.nge-area-point')).toHaveLength(2);
    });
  });

  describe('range mode (y0)', () => {
    it('renders a single band with a valid path', () => {
      const data: NgeAreaDataPoint[] = [
        { x: 0, y: 14, y0: 8 },
        { x: 1, y: 16, y0: 9 },
        { x: 2, y: 15, y0: 7 },
      ];
      const { context, g } = createContext(data);

      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-fill')).toHaveLength(1);
      expect(fillPath(g.querySelector('.nge-area-series')!).getAttribute('d')).toMatch(/^M/);
    });
  });

  describe('showLine', () => {
    const data: NgeAreaDataPoint[] = [
      { x: 0, y: 10 },
      { x: 1, y: 20 },
    ];

    it('draws a top stroke path when showLine is true', () => {
      const { context, g } = createContext(data, { showLine: true });

      renderAreaLayer(context);

      const linePath = g.querySelector<SVGPathElement>('.nge-area-line');
      expect(linePath).not.toBeNull();
      expect(linePath!.getAttribute('d')).toMatch(/^M/);
      expect(styleOf(linePath!, 'fill')).toBe('none');
    });

    it('omits the top stroke when showLine is false', () => {
      const { context, g } = createContext(data, { showLine: false });

      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-line')).toHaveLength(0);
    });

    it('removes a previously drawn top stroke when toggled off on re-render', () => {
      const { context, g } = createContext(data, { showLine: true });

      renderAreaLayer(context);
      expect(g.querySelectorAll('.nge-area-line')).toHaveLength(1);

      context.config.showLine = false;
      renderAreaLayer(context);
      expect(g.querySelectorAll('.nge-area-line')).toHaveLength(0);
    });
  });

  describe('color resolution (via .style)', () => {
    it('maps series index to the config palette, cycling with modulo', () => {
      const data: NgeAreaDataPoint[] = [
        { seriesId: 'A', x: 0, y: 1 },
        { seriesId: 'B', x: 1, y: 2 },
        { seriesId: 'C', x: 2, y: 3 },
      ];
      const { context, g } = createContext(data, { seriesColors: ['var(--c0)', 'var(--c1)'] });

      renderAreaLayer(context);

      const fills = Array.from(g.querySelectorAll('.nge-area-fill'));
      expect(styleOf(fills[0], 'fill')).toBe('var(--c0)');
      expect(styleOf(fills[1], 'fill')).toBe('var(--c1)');
      // Series index 2 wraps: 2 % 2 -> c0.
      expect(styleOf(fills[2], 'fill')).toBe('var(--c0)');
    });

    it('defaults a single series to the theme palette head (var(--chart-primary))', () => {
      const { context, g } = createContext([{ x: 0, y: 10 }]);

      renderAreaLayer(context);

      expect(styleOf(fillPath(g.querySelector('.nge-area-series')!), 'fill')).toBe(
        'var(--chart-primary)'
      );
    });

    it('applies config.fillOpacity over the theme default', () => {
      const { context, g } = createContext([{ x: 0, y: 10 }], { fillOpacity: 0.65 });

      renderAreaLayer(context);

      expect(styleOf(fillPath(g.querySelector('.nge-area-series')!), 'fill-opacity')).toBe('0.65');
    });
  });

  describe('interaction targets', () => {
    const data: NgeAreaDataPoint[] = [
      { x: 0, y: 10 },
      { x: 1, y: 20 },
    ];

    it('renders no interaction points when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(data);

      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-point')).toHaveLength(0);
    });

    it('renders one interaction point per real datum when a tooltip is enabled', () => {
      const { context, g } = createContext(data, { tooltip: true });

      renderAreaLayer(context);

      expect(g.querySelectorAll('.nge-area-point')).toHaveLength(2);
    });

    it('routes the hovered datum to the tooltip with the resolved series border color', () => {
      const { context, g, onTooltip } = createContext(data, {
        seriesColors: ['var(--series-a)'],
        tooltip: true,
      });

      renderAreaLayer(context);
      pointForDatum(g, data[1]).dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(20);
      expect(event.style?.borderColor).toBe('var(--series-a)');
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(data, { tooltip: true });

      renderAreaLayer(context);
      const point = pointForDatum(g, data[0]);
      point.dispatchEvent(new MouseEvent('mouseenter'));
      point.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(data, { onClick });

      renderAreaLayer(context);
      pointForDatum(g, data[1]).dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(data[1]);
    });
  });
});
