import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeLollipopDataPoint, NgeLollipopLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeLollipopLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderLollipopLayer } from './render-lollipop-layer';

type LollipopContext = NgeChartLayerContext<
  NgeLollipopDataPoint,
  NgeLollipopLayerConfig,
  NgeLollipopLayerTheme | undefined
>;

interface ContextOptions {
  connect?: boolean;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  orientation?: 'horizontal' | 'vertical';
  seriesColors?: string[];
  showLabels?: boolean;
  showStem?: boolean;
  theme?: NgeLollipopLayerTheme;
  tooltip?: boolean;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Three single-value categories. */
const LOLLIPOPS: NgeLollipopDataPoint[] = [
  { category: 'A', value: 10 },
  { category: 'B', value: 30 },
  { category: 'C', value: 20 },
];

/** Build band + linear scales the same way the preset does (orientation-aware). */
function makeScales(data: NgeLollipopDataPoint[], vertical: boolean): NgeChartScales {
  const categories = Array.from(new Set(data.map(d => d.category)));
  const values: number[] = [0];
  for (const d of data) {
    values.push(d.value);
    if (d.valueEnd !== undefined) {
      values.push(d.valueEnd);
    }
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const band = scaleBand<string>().domain(categories).padding(0.5);
  const linear = scaleLinear().domain([lo, hi === lo ? hi + 1 : hi]);

  return vertical
    ? {
        x: band.range([0, DIMENSIONS.boundedWidth]),
        y: linear.range([DIMENSIONS.boundedHeight, 0]),
      }
    : {
        x: linear.range([0, DIMENSIONS.boundedWidth]),
        y: band.range([0, DIMENSIONS.boundedHeight]),
      };
}

function createContext(
  data: NgeLollipopDataPoint[],
  options: ContextOptions = {}
): { context: LollipopContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();
  const vertical = (options.orientation ?? 'vertical') === 'vertical';

  const config: NgeLollipopLayerConfig = {
    connect: options.connect,
    data,
    onClick: options.onClick,
    orientation: options.orientation,
    renderer: renderLollipopLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    showStem: options.showStem,
    type: 'lollipop',
  };

  const context: LollipopContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales: makeScales(data, vertical),
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeLollipopDataPoint) => ({ label: d.category, value: d.value }),
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

/** First marker glyph for a category. */
function markerByCategory(g: SVGGElement, category: string): SVGPathElement {
  const marker = g.querySelector<SVGPathElement>(
    `.nge-lollipop-marker[data-category="${category}"]`
  );
  if (!marker) {
    throw new Error(`No lollipop marker for category "${category}"`);
  }
  return marker;
}

describe('renderLollipopLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-marker')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-lollipop-stem')).toHaveLength(0);
    });
  });

  describe('markers + stems', () => {
    it('renders one marker per single-value datum', () => {
      const { context, g } = createContext(LOLLIPOPS);

      renderLollipopLayer(context);

      const markers = Array.from(g.querySelectorAll('.nge-lollipop-marker'));
      expect(markers).toHaveLength(3);
      expect(markers.map(m => m.getAttribute('data-category'))).toEqual(['A', 'B', 'C']);
      expect(markers.every(m => m.getAttribute('data-marker') === 'start')).toBe(true);
    });

    it('draws one stem per row by default', () => {
      const { context, g } = createContext(LOLLIPOPS);

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-stem')).toHaveLength(3);
    });

    it('omits stems when showStem is false (bare dot plot)', () => {
      const { context, g } = createContext(LOLLIPOPS, { showStem: false });

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-stem')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-lollipop-marker')).toHaveLength(3);
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(LOLLIPOPS);

      renderLollipopLayer(context);
      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-marker')).toHaveLength(3);
      expect(g.querySelectorAll('.nge-lollipop-stem')).toHaveLength(3);
    });

    it('positions the single-marker stem from the baseline to the value', () => {
      const { context, g } = createContext([{ category: 'A', value: 10 }]);

      renderLollipopLayer(context);

      const valueScale = scaleLinear().domain([0, 10]).range([DIMENSIONS.boundedHeight, 0]);
      const stem = g.querySelector('.nge-lollipop-stem')!;
      // Vertical: stem runs from baseline (0) up to value (10) at the band center.
      expect(Number(stem.getAttribute('y1'))).toBeCloseTo(valueScale(0), 6);
      expect(Number(stem.getAttribute('y2'))).toBeCloseTo(valueScale(10), 6);
    });
  });

  describe('dumbbell (valueEnd)', () => {
    it('renders two markers and one connecting segment for a valueEnd row', () => {
      const { context, g } = createContext([{ category: 'Gap', value: 10, valueEnd: 40 }]);

      renderLollipopLayer(context);

      const markers = Array.from(g.querySelectorAll('.nge-lollipop-marker'));
      expect(markers).toHaveLength(2);
      expect(markers.map(m => m.getAttribute('data-marker')).sort()).toEqual(['end', 'start']);
      // The stem now connects value ↔ valueEnd (not the baseline).
      expect(g.querySelectorAll('.nge-lollipop-stem')).toHaveLength(1);
    });
  });

  describe('connect (slope)', () => {
    const SLOPE: NgeLollipopDataPoint[] = [
      { category: 'X', seriesId: 's1', value: 10 },
      { category: 'Y', seriesId: 's1', value: 25 },
      { category: 'X', seriesId: 's2', value: 30 },
      { category: 'Y', seriesId: 's2', value: 15 },
    ];

    it('draws one connect path per series when connect is set', () => {
      const { context, g } = createContext(SLOPE, { connect: true });

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-connect')).toHaveLength(2);
    });

    it('draws no connect paths by default', () => {
      const { context, g } = createContext(SLOPE);

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-connect')).toHaveLength(0);
    });

    it('orders a horizontal connect path by category band position, not data/value order', () => {
      // Band domain is A → B → C (natural category order); the series' points arrive
      // OUT of that order (C, A, B) and their values (30, 10, 50) are not monotonic
      // with band position. The horizontal slope path must still visit the markers in
      // ascending band position (A → B → C) — NOT data order and NOT value order.
      const data: NgeLollipopDataPoint[] = [
        { category: 'C', seriesId: 's1', value: 30 },
        { category: 'A', seriesId: 's1', value: 10 },
        { category: 'B', seriesId: 's1', value: 50 },
      ];

      const band = scaleBand<string>()
        .domain(['A', 'B', 'C'])
        .padding(0.5)
        .range([0, DIMENSIONS.boundedHeight]);
      const linear = scaleLinear().domain([0, 50]).range([0, DIMENSIONS.boundedWidth]);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(g);
      document.body.appendChild(svg);

      const context: LollipopContext = {
        animation: NGE_CHART_ANIMATION_DEFAULTS,
        bounds: select(g),
        config: {
          connect: true,
          data,
          orientation: 'horizontal',
          renderer: renderLollipopLayer,
          type: 'lollipop',
        },
        data,
        dimensions: DIMENSIONS,
        margins: { bottom: 25, left: 45, right: 15, top: 15 },
        scales: { x: linear, y: band },
        theme: undefined,
      };

      renderLollipopLayer(context);

      const d = g.querySelector('.nge-lollipop-connect')!.getAttribute('d')!;
      // Horizontal ⇒ category runs on y; pull each vertex's y (band) coordinate.
      const ys = Array.from(d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)).map(m => Number(m[2]));
      const expectedYs = ['A', 'B', 'C'].map(c => band(c)! + band.bandwidth() / 2);

      // The path visits three vertices in strictly ascending band position (A→B→C).
      // (Precision 2 — d3 rounds path-`d` coordinates to 3 decimal places.)
      expect(ys).toHaveLength(3);
      expect(ys).toEqual([...ys].sort((a, b) => a - b));
      ys.forEach((y, i) => expect(y).toBeCloseTo(expectedYs[i], 2));
    });
  });

  describe('color resolution (via .style)', () => {
    const MULTI: NgeLollipopDataPoint[] = [
      { category: 'A', seriesId: 's1', value: 10 },
      { category: 'B', seriesId: 's2', value: 20 },
      { category: 'C', color: 'var(--override)', value: 5 },
    ];

    it('colors markers from the theme palette by seriesId index', () => {
      const { context, g } = createContext(MULTI);

      renderLollipopLayer(context);

      expect(styleOf(markerByCategory(g, 'A'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(markerByCategory(g, 'B'), 'fill')).toBe('var(--chart-secondary)');
    });

    it('honors a per-point color override above the series color', () => {
      const { context, g } = createContext(MULTI);

      renderLollipopLayer(context);

      expect(styleOf(markerByCategory(g, 'C'), 'fill')).toBe('var(--override)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(MULTI, { seriesColors: ['#111111', '#222222'] });

      renderLollipopLayer(context);

      expect(styleOf(markerByCategory(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(markerByCategory(g, 'B'), 'fill')).toBe('#222222');
    });
  });

  describe('labels', () => {
    it('draws one label per marker when showLabels is set', () => {
      const { context, g } = createContext(LOLLIPOPS, { showLabels: true });

      renderLollipopLayer(context);

      const labels = Array.from(g.querySelectorAll('.nge-lollipop-label'));
      expect(labels).toHaveLength(3);
      expect(labels.some(l => l.textContent === '30')).toBe(true);
    });

    it('renders no labels by default', () => {
      const { context, g } = createContext(LOLLIPOPS);

      renderLollipopLayer(context);

      expect(g.querySelectorAll('.nge-lollipop-label')).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('leaves markers non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(LOLLIPOPS);

      renderLollipopLayer(context);

      expect(styleOf(markerByCategory(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered marker to the tooltip with its datum value', () => {
      const { context, g, onTooltip } = createContext(LOLLIPOPS, { tooltip: true });

      renderLollipopLayer(context);
      markerByCategory(g, 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(30);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(LOLLIPOPS, { tooltip: true });

      renderLollipopLayer(context);
      const marker = markerByCategory(g, 'A');
      marker.dispatchEvent(new MouseEvent('mouseenter'));
      marker.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its row index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(LOLLIPOPS, { onClick });

      renderLollipopLayer(context);
      markerByCategory(g, 'C').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(LOLLIPOPS[2]);
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });
  });

  describe('horizontal orientation', () => {
    it('places categories on the y (band) axis', () => {
      const { context, g } = createContext(LOLLIPOPS, { orientation: 'horizontal' });

      renderLollipopLayer(context);

      const band = scaleBand<string>()
        .domain(['A', 'B', 'C'])
        .padding(0.5)
        .range([0, DIMENSIONS.boundedHeight]);
      const marker = markerByCategory(g, 'A');
      const transform = marker.getAttribute('transform') ?? '';
      const cy = Number(transform.match(/translate\([^,]+,\s*([^)]+)\)/)![1]);
      expect(cy).toBeCloseTo(band('A')! + band.bandwidth() / 2, 6);
    });
  });
});
