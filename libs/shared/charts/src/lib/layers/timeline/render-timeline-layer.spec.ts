import type { ScaleBand, ScaleTime } from 'd3-scale';

import { scaleBand, scaleTime } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeTimelineDataPoint, NgeTimelineLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTimelineLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderTimelineLayer } from './render-timeline-layer';

type TimelineContext = NgeChartLayerContext<
  NgeTimelineDataPoint,
  NgeTimelineLayerConfig,
  NgeTimelineLayerTheme | undefined
>;

interface ContextOptions {
  domain?: [Date, Date];
  showLabels?: boolean;
  showMilestones?: boolean;
  theme?: NgeTimelineLayerTheme;
}

const BOUNDED_WIDTH = 500;
const BOUNDED_HEIGHT = 300;

/**
 * Build a jsdom SVG bounds group + a layer context for the timeline renderer. Fills
 * are applied via `.style` synchronously and read back verbatim; the bar `width`,
 * however, is applied on a d3 transition (grows from 0), so it is only final after
 * `settle()`. The bar `x`/`y`/`height` are set synchronously and read immediately.
 */
function createContext(
  data: NgeTimelineDataPoint[],
  options: ContextOptions = {}
): { context: TimelineContext; g: SVGGElement } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const config: NgeTimelineLayerConfig = {
    data,
    renderer: renderTimelineLayer,
    showLabels: options.showLabels ?? false,
    showMilestones: options.showMilestones ?? true,
    type: 'timeline',
  };

  const rowIds: string[] = [];
  for (const d of data) {
    if (!rowIds.includes(d.rowId)) rowIds.push(d.rowId);
  }

  const domain = options.domain ?? [new Date('2024-01-01'), new Date('2024-02-01')];
  const xScale = scaleTime().domain(domain).range([0, BOUNDED_WIDTH]);
  const yScale = scaleBand<string>().domain(rowIds).range([0, BOUNDED_HEIGHT]).padding(0.2);

  const context: TimelineContext = {
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
    scales: { x: xScale, y: yScale },
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

const numAttr = (el: Element, attr: string): number => parseFloat(el.getAttribute(attr) ?? 'NaN');

/** The `.nge-timeline-bar` rect bound to a specific source datum (via d3's __data__). */
function barForDatum(g: SVGGElement, datum: NgeTimelineDataPoint): SVGRectElement {
  const match = Array.from(g.querySelectorAll<SVGRectElement>('.nge-timeline-bar')).find(
    node => (node as unknown as { __data__: NgeTimelineDataPoint }).__data__ === datum
  );
  if (!match) {
    throw new Error('No timeline bar bound to the given datum');
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. The bar `width` grows from 0 on
 * an enter transition, so it is only observable after a real delay past the enter
 * duration. Fake timers do NOT drive d3-transition in this zone-based jsdom env.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderTimelineLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const spanData: NgeTimelineDataPoint[] = [
    {
      color: 'var(--a)',
      end: new Date('2024-01-10'),
      label: 'Design',
      rowId: 'Design',
      start: new Date('2024-01-01'),
    },
    {
      color: 'var(--b)',
      end: new Date('2024-01-25'),
      label: 'Build',
      rowId: 'Build',
      start: new Date('2024-01-08'),
    },
  ];

  describe('empty-data guard', () => {
    it('renders no marks for empty data', () => {
      const { context, g } = createContext([]);

      renderTimelineLayer(context);

      expect(g.querySelectorAll('.nge-timeline-bar')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-timeline-milestone')).toHaveLength(0);
    });
  });

  describe('span bars', () => {
    it('renders one group + one bar per span datum', () => {
      const { context, g } = createContext(spanData);

      renderTimelineLayer(context);

      expect(g.querySelectorAll('.nge-timeline-group')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-timeline-bar')).toHaveLength(2);
    });

    it('fills each bar with its per-datum color (via .style)', () => {
      const { context, g } = createContext(spanData);

      renderTimelineLayer(context);

      expect(styleOf(barForDatum(g, spanData[0]), 'fill')).toBe('var(--a)');
      expect(styleOf(barForDatum(g, spanData[1]), 'fill')).toBe('var(--b)');
    });

    it('falls back to the theme bar color when no per-datum color is set', () => {
      const data: NgeTimelineDataPoint[] = [
        { end: new Date('2024-01-06'), rowId: 'A', start: new Date('2024-01-02') },
      ];
      const { context, g } = createContext(data, { theme: { bar: { color: 'var(--themed)' } } });

      renderTimelineLayer(context);

      expect(styleOf(barForDatum(g, data[0]), 'fill')).toBe('var(--themed)');
    });

    it('spans each bar from x(start) with width x(end) - x(start), seated on its row', async () => {
      const { context, g } = createContext(spanData);
      const xScale = context.scales.x as ScaleTime<number, number>;
      const yScale = context.scales.y as ScaleBand<string>;

      renderTimelineLayer(context);
      await settle();

      const bar = barForDatum(g, spanData[0]);
      const start = spanData[0].start as Date;
      const end = spanData[0].end as Date;
      expect(numAttr(bar, 'x')).toBeCloseTo(xScale(start));
      expect(numAttr(bar, 'width')).toBeCloseTo(xScale(end) - xScale(start));
      expect(numAttr(bar, 'y')).toBeCloseTo(yScale('Design') ?? 0);
      expect(numAttr(bar, 'height')).toBeCloseTo(yScale.bandwidth());
    });
  });

  describe('milestones', () => {
    const data: NgeTimelineDataPoint[] = [
      { end: new Date('2024-01-05'), milestone: true, rowId: 'A', start: new Date('2024-01-05') },
      { end: new Date('2024-01-10'), rowId: 'A', start: new Date('2024-01-01') },
    ];

    it('renders a diamond marker for milestone items and excludes them from the bars', () => {
      const { context, g } = createContext(data);

      renderTimelineLayer(context);

      expect(g.querySelectorAll('.nge-timeline-milestone')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-timeline-bar')).toHaveLength(1); // only the span
    });

    it('positions the milestone at x(start) on its row centre', () => {
      const { context, g } = createContext(data);
      const xScale = context.scales.x as ScaleTime<number, number>;
      const yScale = context.scales.y as ScaleBand<string>;

      renderTimelineLayer(context);

      const marker = g.querySelector<SVGPathElement>('.nge-timeline-milestone');
      const cx = xScale(data[0].start as Date);
      const cy = (yScale('A') ?? 0) + yScale.bandwidth() / 2;
      expect(marker?.getAttribute('transform')).toBe(`translate(${cx},${cy})`);
    });

    it('hides milestones when showMilestones is false', () => {
      const { context, g } = createContext(data, { showMilestones: false });

      renderTimelineLayer(context);

      expect(g.querySelectorAll('.nge-timeline-milestone')).toHaveLength(0);
    });
  });

  describe('labels', () => {
    it('draws an on-bar label per span when showLabels is set', () => {
      const { context, g } = createContext(spanData, { showLabels: true });

      renderTimelineLayer(context);

      const labels = Array.from(g.querySelectorAll<SVGTextElement>('.nge-timeline-label'));
      expect(labels.map(l => l.textContent)).toEqual(['Design', 'Build']);
    });

    it('draws no labels by default', () => {
      const { context, g } = createContext(spanData);

      renderTimelineLayer(context);

      expect(g.querySelectorAll('.nge-timeline-label')).toHaveLength(0);
    });
  });
});
