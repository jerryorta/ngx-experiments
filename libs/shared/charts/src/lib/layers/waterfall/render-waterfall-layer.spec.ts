import type { ScaleBand, ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  NgeChartConfig,
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeWaterfallLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { createWaterfallChartScales } from '../../nge-chart/nge-chart.waterfall.helpers';
import { renderWaterfallLayer } from './render-waterfall-layer';

type WaterfallContext = NgeChartLayerContext<
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
  NgeWaterfallLayerTheme | undefined
>;

interface ContextOptions {
  connectors?: boolean;
  fallColor?: string;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  riseColor?: string;
  showLabels?: boolean;
  theme?: NgeWaterfallLayerTheme;
  tooltip?: boolean;
  totalColor?: string;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Open +100, Gain +40, Loss -60 (falling), Close total (running 80). */
const WATERFALL: NgeWaterfallDataPoint[] = [
  { label: 'Open', value: 100 },
  { label: 'Gain', value: 40 },
  { label: 'Loss', value: -60 },
  { kind: 'total', label: 'Close', value: 0 },
];

/**
 * Build a jsdom SVG bounds group + a layer context for the waterfall renderer,
 * with scales from the real factory so band widths / value domain match
 * production. Geometry is applied synchronously so it can be read back verbatim.
 */
function createContext(
  data: NgeWaterfallDataPoint[],
  options: ContextOptions = {}
): { context: WaterfallContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeWaterfallLayerConfig = {
    connectors: options.connectors,
    data,
    fallColor: options.fallColor,
    onClick: options.onClick,
    renderer: renderWaterfallLayer,
    riseColor: options.riseColor,
    showLabels: options.showLabels,
    totalColor: options.totalColor,
    type: 'waterfall',
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createWaterfallChartScales(chartConfig, DIMENSIONS);

  const context: WaterfallContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeWaterfallDataPoint) => ({ label: d.label, value: d.value }),
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

/** Numeric value of an attribute. */
function num(el: Element, attr: string): number {
  return Number(el.getAttribute(attr));
}

/** The bar rect for a label. */
function barRect(g: SVGGElement, label: string): SVGRectElement {
  const rect = g.querySelector<SVGRectElement>(`.nge-waterfall-bar[data-label="${label}"]`);
  if (!rect) {
    throw new Error(`No waterfall bar for label "${label}"`);
  }
  return rect;
}

describe('renderWaterfallLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderWaterfallLayer(context);

      expect(g.querySelectorAll('.nge-waterfall-bar')).toHaveLength(0);
    });
  });

  describe('bar structure + geometry', () => {
    it('renders one rect per datum, tagged with label + kind', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      const bars = Array.from(g.querySelectorAll('.nge-waterfall-bar'));
      expect(bars.map(b => b.getAttribute('data-label'))).toEqual([
        'Open',
        'Gain',
        'Loss',
        'Close',
      ]);
      expect(bars.map(b => b.getAttribute('data-kind'))).toEqual([
        'delta',
        'delta',
        'delta',
        'total',
      ]);
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);
      renderWaterfallLayer(context);

      expect(g.querySelectorAll('.nge-waterfall-bar')).toHaveLength(4);
    });

    it('floats each delta bar on the running total with band-width rects', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      const valueScale = context.scales.y as ScaleLinear<number, number>;
      const bandScale = context.scales.x as ScaleBand<string>;

      // Gain floats [100, 140]: top at scale(140), height scale(100) - scale(140).
      const gain = barRect(g, 'Gain');
      expect(num(gain, 'x')).toBeCloseTo(bandScale('Gain')!, 6);
      expect(num(gain, 'width')).toBeCloseTo(bandScale.bandwidth(), 6);
      expect(num(gain, 'y')).toBeCloseTo(valueScale(140), 6);
      expect(num(gain, 'height')).toBeCloseTo(valueScale(100) - valueScale(140), 6);
    });

    it('anchors a total bar at the zero baseline', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      const valueScale = context.scales.y as ScaleLinear<number, number>;
      // Close is a total bar spanning [0, 80] (the running total after Loss).
      const close = barRect(g, 'Close');
      expect(num(close, 'y') + num(close, 'height')).toBeCloseTo(valueScale(0), 6);
      expect(num(close, 'y')).toBeCloseTo(valueScale(80), 6);
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors rising, falling, and total bars from the theme defaults', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      expect(styleOf(barRect(g, 'Open'), 'fill')).toBe('#4caf50'); // rising delta
      expect(styleOf(barRect(g, 'Loss'), 'fill')).toBe('#f44336'); // falling delta
      expect(styleOf(barRect(g, 'Close'), 'fill')).toBe('var(--chart-primary)'); // total
    });

    it('honors config rise / fall / total color overrides', () => {
      const { context, g } = createContext(WATERFALL, {
        fallColor: 'var(--fall)',
        riseColor: 'var(--rise)',
        totalColor: 'var(--total)',
      });

      renderWaterfallLayer(context);

      expect(styleOf(barRect(g, 'Open'), 'fill')).toBe('var(--rise)');
      expect(styleOf(barRect(g, 'Loss'), 'fill')).toBe('var(--fall)');
      expect(styleOf(barRect(g, 'Close'), 'fill')).toBe('var(--total)');
    });

    it('honors a per-datum color override above the role color', () => {
      const { context, g } = createContext([{ color: 'var(--override)', label: 'A', value: 10 }]);

      renderWaterfallLayer(context);

      expect(styleOf(barRect(g, 'A'), 'fill')).toBe('var(--override)');
    });
  });

  describe('step connectors', () => {
    it('draws one connector path with a segment per gap', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      const path = g.querySelector('.nge-waterfall-connector');
      expect(path).not.toBeNull();
      const d = path!.getAttribute('d') ?? '';
      // 4 bars → 3 connector segments (one "M...L..." each).
      expect((d.match(/M/g) ?? []).length).toBe(3);
    });

    it('omits connectors when connectors is false', () => {
      const { context, g } = createContext(WATERFALL, { connectors: false });

      renderWaterfallLayer(context);

      expect(g.querySelector('.nge-waterfall-connector')).toBeNull();
    });
  });

  describe('labels', () => {
    it('draws one label per bar when showLabels is set, using the total for total bars', () => {
      const { context, g } = createContext(WATERFALL, { showLabels: true });

      renderWaterfallLayer(context);

      const labels = Array.from(g.querySelectorAll('.nge-waterfall-label'));
      expect(labels).toHaveLength(4);
      // A delta shows its signed value; a total shows the running total (80).
      expect(labels.some(l => l.textContent === '100')).toBe(true);
      expect(labels.some(l => l.textContent === '80')).toBe(true);
    });

    it('renders no labels by default', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      expect(g.querySelectorAll('.nge-waterfall-label')).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('leaves bars non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(WATERFALL);

      renderWaterfallLayer(context);

      expect(styleOf(barRect(g, 'Open'), 'cursor')).toBe('default');
    });

    it('routes the hovered bar to the tooltip with its datum value', () => {
      const { context, g, onTooltip } = createContext(WATERFALL, { tooltip: true });

      renderWaterfallLayer(context);
      barRect(g, 'Gain').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(40);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(WATERFALL, { tooltip: true });

      renderWaterfallLayer(context);
      const rect = barRect(g, 'Open');
      rect.dispatchEvent(new MouseEvent('mouseenter'));
      rect.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(WATERFALL, { onClick });

      renderWaterfallLayer(context);
      barRect(g, 'Loss').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(WATERFALL[2]);
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });
  });
});
