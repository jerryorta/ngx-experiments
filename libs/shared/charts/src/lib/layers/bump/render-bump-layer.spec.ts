import type { ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type { NgeBumpDataPoint, NgeBumpLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeBumpLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { createBumpChartScalesFactory } from '../../nge-chart/nge-chart.bump.helpers';
import { renderBumpLayer } from './render-bump-layer';

type BumpContext = NgeChartLayerContext<
  NgeBumpDataPoint,
  NgeBumpLayerConfig,
  NgeBumpLayerTheme | undefined
>;

interface ContextOptions {
  curveType?: 'bump' | 'linear' | 'monotone';
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  pointRadius?: number;
  rankOrder?: 'asc' | 'desc';
  seriesColors?: string[];
  showLabels?: boolean;
  showPoints?: boolean;
  theme?: NgeBumpLayerTheme;
  tooltip?: boolean;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 45, left: 45, right: 24, top: 20 },
  width: 560,
};

const MARGINS = { bottom: 45, left: 45, right: 24, top: 20 };

/**
 * Three series (A, B, C) over two x-ticks. Ranks (desc):
 *   Q1 → B(30)=1, C(20)=2, A(10)=3.  Q2 → C(40)=1, A(25)=2, B(15)=3.
 */
const DATA: NgeBumpDataPoint[] = [
  { seriesId: 'A', value: 10, x: 'Q1' },
  { seriesId: 'B', value: 30, x: 'Q1' },
  { seriesId: 'C', value: 20, x: 'Q1' },
  { seriesId: 'A', value: 25, x: 'Q2' },
  { seriesId: 'B', value: 15, x: 'Q2' },
  { seriesId: 'C', value: 40, x: 'Q2' },
];

/**
 * Build a jsdom SVG bounds group + a layer context for the bump renderer, with scales
 * from the real factory so x positions / the rank domain match production. Enter
 * geometry (line `d`, point cx/cy, label x/y) is applied synchronously so it reads
 * back verbatim.
 */
function createContext(
  data: NgeBumpDataPoint[],
  options: ContextOptions = {}
): { context: BumpContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeBumpLayerConfig = {
    curveType: options.curveType,
    data,
    onClick: options.onClick,
    pointRadius: options.pointRadius,
    rankOrder: options.rankOrder,
    renderer: renderBumpLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels ?? true,
    showPoints: options.showPoints ?? true,
    type: 'bump',
  };

  const scales = createBumpChartScalesFactory({})({ layers: [config] }, DIMENSIONS);

  const context: BumpContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: MARGINS,
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (point: NgeBumpDataPoint) => ({
            label: point.seriesId,
            value: point.rank ?? point.value,
          }),
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

/** Count elements matching a sub-mark class. */
function count(g: SVGGElement, className: string): number {
  return g.querySelectorAll(`.${className}`).length;
}

/** The series group for a seriesId. */
function seriesGroup(g: SVGGElement, id: string): SVGGElement {
  return g.querySelector<SVGGElement>(`[data-series-id="${id}"]`)!;
}

/** A series' points, in document order (left-to-right x). */
function pointsOf(g: SVGGElement, id: string): SVGElement[] {
  return Array.from(seriesGroup(g, id).querySelectorAll<SVGElement>('.nge-bump-point'));
}

/**
 * Real-timer wait so d3 transitions run to completion. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env, so exit-removal (a series fading out) is
 * only observable after a real delay past the exit duration.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderBumpLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-series')).toBe(0);
    });

    it('removes stale marks when the data empties', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);
      expect(count(g, 'nge-bump-series')).toBe(3);

      context.data = [];
      renderBumpLayer(context);

      expect(count(g, 'nge-bump-series')).toBe(0);
      expect(count(g, 'nge-bump-line')).toBe(0);
      expect(count(g, 'nge-bump-point')).toBe(0);
    });
  });

  describe('rank lines', () => {
    it('draws one series group + rank line per series', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-series')).toBe(3);
      expect(count(g, 'nge-bump-line')).toBe(3);
    });

    it('applies the series line geometry synchronously on first paint', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      const path = seriesGroup(g, 'A').querySelector('.nge-bump-line')!;
      expect(path.getAttribute('d')).toMatch(/^M/);
    });

    it('colors each series line by palette index via .style (never .attr)', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      // Series order = first-seen in data (A, B, C) → primary / secondary / tertiary.
      expect(styleOf(seriesGroup(g, 'A').querySelector('.nge-bump-line')!, 'stroke')).toBe(
        'var(--chart-primary)'
      );
      expect(styleOf(seriesGroup(g, 'B').querySelector('.nge-bump-line')!, 'stroke')).toBe(
        'var(--chart-secondary)'
      );
      expect(styleOf(seriesGroup(g, 'C').querySelector('.nge-bump-line')!, 'stroke')).toBe(
        'var(--chart-tertiary)'
      );
    });

    it('honours a config seriesColors override', () => {
      const { context, g } = createContext(DATA, { seriesColors: ['#aaa', '#bbb', '#ccc'] });

      renderBumpLayer(context);

      expect(styleOf(seriesGroup(g, 'A').querySelector('.nge-bump-line')!, 'stroke')).toBe('#aaa');
      expect(styleOf(seriesGroup(g, 'B').querySelector('.nge-bump-line')!, 'stroke')).toBe('#bbb');
    });

    it('treats an empty seriesColors as unset — cycles the theme palette, not one color', () => {
      const { context, g } = createContext(DATA, { seriesColors: [] });

      renderBumpLayer(context);

      // Not all-primary: series cycle the theme palette (matching the legend swatches).
      expect(styleOf(seriesGroup(g, 'A').querySelector('.nge-bump-line')!, 'stroke')).toBe(
        'var(--chart-primary)'
      );
      expect(styleOf(seriesGroup(g, 'B').querySelector('.nge-bump-line')!, 'stroke')).toBe(
        'var(--chart-secondary)'
      );
    });

    it('honours a theme line-color override', () => {
      const { context, g } = createContext(DATA, {
        theme: { line: { colors: ['#111', '#222', '#333'] } },
      });

      renderBumpLayer(context);

      expect(styleOf(seriesGroup(g, 'A').querySelector('.nge-bump-line')!, 'stroke')).toBe('#111');
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);
      renderBumpLayer(context);

      expect(count(g, 'nge-bump-series')).toBe(3);
      expect(count(g, 'nge-bump-line')).toBe(3);
      expect(count(g, 'nge-bump-point')).toBe(6);
      expect(count(g, 'nge-bump-label')).toBe(3);
    });
  });

  describe('curve mapping', () => {
    it('produces a different line path for linear vs the default bump curve', () => {
      const bump = createContext(DATA);
      renderBumpLayer(bump.context);
      const bumpD = seriesGroup(bump.g, 'A').querySelector('.nge-bump-line')!.getAttribute('d')!;

      const linear = createContext(DATA, { curveType: 'linear' });
      renderBumpLayer(linear.context);
      const linearD = seriesGroup(linear.g, 'A')
        .querySelector('.nge-bump-line')!
        .getAttribute('d')!;

      expect(linearD).not.toBe(bumpD);
      // curveLinear emits straight line-to segments; curveBumpX emits cubic beziers.
      expect(linearD).toContain('L');
      expect(bumpD).toContain('C');
    });
  });

  describe('rank positions', () => {
    it('seats rank 1 at the top (y = 0) and the worst rank at the bottom', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      // Q1 is each series' first (left-most) point.
      const bQ1 = pointsOf(g, 'B')[0]; // rank 1
      const aQ1 = pointsOf(g, 'A')[0]; // rank 3
      expect(num(bQ1, 'cy')).toBeCloseTo(yScale(1), 6);
      expect(num(aQ1, 'cy')).toBeCloseTo(yScale(3), 6);
      expect(num(bQ1, 'cy')).toBeLessThan(num(aQ1, 'cy'));
    });
  });

  describe('points', () => {
    it('draws one point per observation when showPoints', () => {
      const { context, g } = createContext(DATA, { showPoints: true });

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-point')).toBe(6);
    });

    it('omits points when showPoints is false', () => {
      const { context, g } = createContext(DATA, { showPoints: false });

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-point')).toBe(0);
    });

    it('fills points with the theme point color and strokes with the series color (via .style)', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      const point = pointsOf(g, 'A')[0];
      expect(styleOf(point, 'fill')).toBe('var(--chart-surface)');
      expect(styleOf(point, 'stroke')).toBe('var(--chart-primary)');
    });
  });

  describe('end labels', () => {
    it('draws one end label per series, texted with the series id, when showLabels', () => {
      const { context, g } = createContext(DATA, { showLabels: true });

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-label')).toBe(3);
      expect(seriesGroup(g, 'A').querySelector('.nge-bump-label')!.textContent).toBe('A');
    });

    it('omits labels when showLabels is false', () => {
      const { context, g } = createContext(DATA, { showLabels: false });

      renderBumpLayer(context);

      expect(count(g, 'nge-bump-label')).toBe(0);
    });

    it('seats each label past its last (right-most) point and colors it via .style', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      const label = seriesGroup(g, 'A').querySelector('.nge-bump-label')!;
      const lastPoint = pointsOf(g, 'A').at(-1)!;
      // Label sits to the RIGHT of the series' last point.
      expect(num(label, 'x')).toBeGreaterThan(num(lastPoint, 'cx'));
      expect(styleOf(label, 'fill')).toBe('var(--chart-on-surface)');
    });
  });

  describe('series enter / exit', () => {
    it('exits a series that leaves the data', async () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);
      expect(count(g, 'nge-bump-series')).toBe(3);
      await settle();

      const withoutC = DATA.filter(point => point.seriesId !== 'C');
      context.data = withoutC;
      context.scales = createBumpChartScalesFactory({})({ layers: [context.config] }, DIMENSIONS);
      context.config.data = withoutC;
      renderBumpLayer(context);
      await settle();

      expect(count(g, 'nge-bump-series')).toBe(2);
      expect(seriesGroup(g, 'C')).toBeNull();
    });
  });

  describe('interaction', () => {
    it('leaves points non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(DATA);

      renderBumpLayer(context);

      expect(styleOf(pointsOf(g, 'A')[0], 'cursor')).toBe('default');
    });

    it('routes the hovered point to the tooltip with its derived rank', () => {
      const { context, g, onTooltip } = createContext(DATA, { tooltip: true });

      renderBumpLayer(context);
      // A's Q1 point → rank 3.
      pointsOf(g, 'A')[0].dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(3);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(DATA, { tooltip: true });

      renderBumpLayer(context);
      const point = pointsOf(g, 'A')[0];
      point.dispatchEvent(new MouseEvent('mouseenter'));
      point.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its data index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(DATA, { onClick });

      renderBumpLayer(context);
      pointsOf(g, 'A')[0].dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data.seriesId).toBe('A');
      expect(onClick.mock.calls[0][0].data.x).toBe('Q1');
      expect(onClick.mock.calls[0][0].index).toBe(0);
    });
  });
});
