import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type {
  NgeParallelCoordsBrushExtents,
  NgeParallelCoordsCurve,
  NgeParallelCoordsDataPoint,
  NgeParallelCoordsLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeParallelCoordsLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderParallelCoordsLayer } from './render-parallel-coords-layer';

type ParallelCoordsContext = NgeChartLayerContext<
  NgeParallelCoordsDataPoint,
  NgeParallelCoordsLayerConfig,
  NgeParallelCoordsLayerTheme | undefined
>;

interface ContextOptions {
  brushExtents?: NgeParallelCoordsBrushExtents;
  colorBy?: string;
  curve?: NgeParallelCoordsCurve;
  dimensions?: string[];
  onBrush?: jest.Mock;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  seriesColors?: string[];
  theme?: NgeParallelCoordsLayerTheme;
  tickCount?: number;
  tooltip?: boolean;
}

// 300x300 bounds — with three dimensions the axes land on 0 / 150 / 300.
const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 300,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 320,
};

/**
 * The axes stop short of the bounded edges by the layer's own chrome reserves — 24px at the
 * top for the dimension names, 8px at the bottom for the lowest tick's descenders. Mirrored
 * here because every y assertion is against this span, not against `boundedHeight`.
 */
const AXIS_TOP = 24;
const AXIS_BOTTOM = DIMENSIONS.boundedHeight - 8;

/**
 * Two records over two numeric dimensions an order of magnitude apart plus one categorical
 * dimension. The magnitudes are deliberately mismatched: `price` 10–20 against `weight`
 * 100–200 is what makes the per-axis-scale assertion meaningful — under one shared domain
 * the whole price axis would collapse into the bottom of the plot.
 *
 * Both numeric domains are already "nice", so `.nice()` leaves them alone and the extremes
 * land exactly on y=300 (min) and y=0 (max).
 */
const RECORDS: NgeParallelCoordsDataPoint[] = [
  { label: 'price', seriesId: 'a', value: 10 },
  { label: 'weight', seriesId: 'a', value: 100 },
  { label: 'origin', seriesId: 'a', value: 'eu' },
  { label: 'price', seriesId: 'b', value: 20 },
  { label: 'weight', seriesId: 'b', value: 200 },
  { label: 'origin', seriesId: 'b', value: 'us' },
];

function createContext(
  data: NgeParallelCoordsDataPoint[],
  options: ContextOptions = {}
): {
  context: ParallelCoordsContext;
  g: SVGGElement;
  onTooltip: jest.Mock;
  svg: SVGSVGElement;
} {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeParallelCoordsLayerConfig = {
    brushExtents: options.brushExtents,
    colorBy: options.colorBy,
    curve: options.curve,
    data,
    dimensions: options.dimensions,
    onBrush: options.onBrush,
    onClick: options.onClick,
    renderer: renderParallelCoordsLayer,
    seriesColors: options.seriesColors,
    tickCount: options.tickCount,
    type: 'parallel-coords',
  };

  // The layer ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: ParallelCoordsContext = {
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
          formatContent: (d: NgeParallelCoordsDataPoint) => ({
            label: d.label,
            value: String(d.value),
          }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip, svg };
}

/** Real-timer wait so d3 exit transitions run to completion (exit default is 200ms). */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function axisLines(g: SVGGElement): SVGLineElement[] {
  return Array.from(g.querySelectorAll<SVGLineElement>('.nge-parallel-coords-axis'));
}

function axisLabels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-parallel-coords-axis-label'));
}

function ticks(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-parallel-coords-tick'));
}

function recordGroups(g: SVGGElement): SVGGElement[] {
  return Array.from(g.querySelectorAll<SVGGElement>('.nge-parallel-coords-record'));
}

function recordFor(g: SVGGElement, id: string): SVGGElement {
  const found = recordGroups(g).find(node => node.getAttribute('data-series-id') === id);
  if (!found) {
    throw new Error(`no record group for "${id}"`);
  }
  return found;
}

function lineOf(group: SVGGElement): SVGPathElement {
  return group.querySelector<SVGPathElement>('.nge-parallel-coords-line') as SVGPathElement;
}

function hitOf(group: SVGGElement): SVGPathElement {
  return group.querySelector<SVGPathElement>('.nge-parallel-coords-hit') as SVGPathElement;
}

function brushGroups(g: SVGGElement): SVGGElement[] {
  return Array.from(g.querySelectorAll<SVGGElement>('.nge-parallel-coords-brush'));
}

function brushFor(g: SVGGElement, dimension: string): SVGGElement {
  const found = brushGroups(g).find(node => node.getAttribute('data-dimension') === dimension);
  if (!found) {
    throw new Error(`no brush group for "${dimension}"`);
  }
  return found;
}

function bandOf(group: SVGGElement): SVGRectElement {
  return group.querySelector<SVGRectElement>('.nge-parallel-coords-brush-band') as SVGRectElement;
}

function windowOf(group: SVGGElement): null | SVGRectElement {
  return group.querySelector<SVGRectElement>('.nge-parallel-coords-brush-window');
}

function handlesOf(group: SVGGElement): SVGRectElement[] {
  return Array.from(group.querySelectorAll<SVGRectElement>('.nge-parallel-coords-brush-handle'));
}

/**
 * Drive one brush drag: press on the dimension's grab band, move, release.
 *
 * jsdom implements neither `PointerEvent` nor `setPointerCapture`, so the events are plain
 * `MouseEvent`s of the pointer types — which is all the handlers read (`button`, `pointerId`,
 * `clientX/Y`), and `pointerId` matching still holds with `undefined` on both sides. `d3.pointer`
 * falls back to `getBoundingClientRect`, which jsdom zeroes, so `clientY` IS the bounds-local y.
 */
function dragBrush(
  g: SVGGElement,
  svg: SVGSVGElement,
  dimension: string,
  fromY: number,
  toY: number
): void {
  pressBrush(g, dimension, fromY);
  svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: toY }));
  svg.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: toY }));
}

/** Press on a dimension's grab band without releasing — leaves the drag live. */
function pressBrush(g: SVGGElement, dimension: string, y: number): void {
  bandOf(brushFor(g, dimension)).dispatchEvent(
    new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: y })
  );
}

/**
 * Parse a linear `d3.line()` path into its [x, y] vertices. Matching coordinate pairs rather
 * than splitting on the commands keeps the trailing `Z` out of the numbers — d3's
 * `curveLinear` closes a one-point line, so a record that reaches only a single axis emits
 * `M<x>,<y>Z`.
 */
function vertices(path: SVGPathElement): [number, number][] {
  const pairs = (path.getAttribute('d') ?? '').match(/-?[\d.]+,-?[\d.]+/g) ?? [];
  return pairs.map(pair => {
    const [x, y] = pair.split(',').map(Number);
    return [x, y] as [number, number];
  });
}

describe('renderParallelCoordsLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('axes', () => {
    it('draws one axis per unique dimension, evenly spaced across the bounded width', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const lines = axisLines(g);
      expect(lines).toHaveLength(3);
      expect(lines.map(line => Number(line.getAttribute('x1')))).toEqual([0, 150, 300]);
      // Each axis spans the plot height minus the layer's own chrome reserves.
      expect(lines.map(line => Number(line.getAttribute('y1')))).toEqual([24, 24, 24]);
      expect(lines.map(line => Number(line.getAttribute('y2')))).toEqual([292, 292, 292]);
    });

    it('labels each axis with its dimension name, anchored inward at the outer axes', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const labels = axisLabels(g);
      expect(labels.map(label => label.textContent)).toEqual(['price', 'weight', 'origin']);
      // The end labels would otherwise overflow the plot, since their axes sit on its edges.
      expect(labels.map(label => label.getAttribute('text-anchor'))).toEqual([
        'start',
        'middle',
        'end',
      ]);
    });

    it('scales every dimension independently', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const [price, weight] = vertices(lineOf(recordFor(g, 'b')));
      // price=20 and weight=200 are each their own dimension's maximum, so both sit at the
      // top of the axis span despite differing by an order of magnitude.
      expect(price[1]).toBe(AXIS_TOP);
      expect(weight[1]).toBe(AXIS_TOP);

      const [minPrice, minWeight] = vertices(lineOf(recordFor(g, 'a')));
      expect(minPrice[1]).toBe(AXIS_BOTTOM);
      expect(minWeight[1]).toBe(AXIS_BOTTOM);
    });

    it('puts a categorical dimension on a point scale, one tick per category', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const originTicks = ticks(g).filter(tick => Number(tick.getAttribute('x')) > 200);
      expect(originTicks.map(tick => tick.textContent)).toEqual(['eu', 'us']);

      const ys = originTicks.map(tick => Number(tick.getAttribute('y')));
      // Point-scale categories are padded off both ends of the axis span, and the range is
      // inverted so the first category sits lower than the second.
      expect(ys[0]).toBeGreaterThan(ys[1]);
      ys.forEach(y => {
        expect(y).toBeGreaterThan(AXIS_TOP);
        expect(y).toBeLessThan(AXIS_BOTTOM);
      });
    });

    it('honours the requested tick count on a numeric axis', () => {
      const { context, g } = createContext(RECORDS, { tickCount: 2 });
      renderParallelCoordsLayer(context);

      const priceTicks = ticks(g).filter(tick => tick.getAttribute('text-anchor') === 'start');
      expect(priceTicks.length).toBeLessThanOrEqual(3);
      expect(priceTicks.length).toBeGreaterThan(0);
    });

    it("flips the first axis's tick labels inward so the clip cannot swallow them", () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const [first, ...rest] = ticks(g);
      // The first axis sits on x=0, so left-hung ticks would land at a negative x — outside
      // the layer group's clip-path, and silently dropped.
      expect(first.getAttribute('text-anchor')).toBe('start');
      expect(Number(first.getAttribute('x'))).toBeGreaterThan(0);
      expect(rest.some(tick => tick.getAttribute('text-anchor') === 'end')).toBe(true);
    });

    it('gives a single-valued dimension a non-degenerate scale', () => {
      const flat: NgeParallelCoordsDataPoint[] = [
        { label: 'price', seriesId: 'a', value: 5 },
        { label: 'price', seriesId: 'b', value: 5 },
      ];
      const { context, g } = createContext(flat);
      renderParallelCoordsLayer(context);

      const [point] = vertices(lineOf(recordFor(g, 'a')));
      expect(Number.isFinite(point[1])).toBe(true);
      // The widened domain puts the shared value mid-axis rather than at an edge.
      expect(point[1]).toBeGreaterThan(AXIS_TOP);
      expect(point[1]).toBeLessThan(AXIS_BOTTOM);
    });

    it('takes axis order and subset from config.dimensions', () => {
      const { context, g } = createContext(RECORDS, { dimensions: ['origin', 'price'] });
      renderParallelCoordsLayer(context);

      expect(axisLabels(g).map(label => label.textContent)).toEqual(['origin', 'price']);
      expect(axisLines(g)).toHaveLength(2);
    });

    it('keeps every mark inside the bounded plot rect', () => {
      // The layer draws into `g.nge-chart-layers`, which the base layout clips to the plot
      // rect — so a mark at a negative coordinate is DISCARDED, not merely tight. jsdom does
      // not clip, so nothing else in this file would notice; this is the guard for it. It
      // first caught the dimension names hung above the plot and the leading axis's ticks
      // hung to its left, both of which rendered as simply absent in the browser.
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const xs = [
        ...ticks(g).map(t => Number(t.getAttribute('x'))),
        ...axisLabels(g).map(l => Number(l.getAttribute('x'))),
        ...axisLines(g).map(l => Number(l.getAttribute('x1'))),
      ];
      const ys = [
        ...ticks(g).map(t => Number(t.getAttribute('y'))),
        ...axisLabels(g).map(l => Number(l.getAttribute('y'))),
        ...axisLines(g).flatMap(l => [Number(l.getAttribute('y1')), Number(l.getAttribute('y2'))]),
        ...recordGroups(g).flatMap(group => vertices(lineOf(group)).map(([, y]) => y)),
      ];

      xs.forEach(x => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
      });
      ys.forEach(y => {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
      });
    });

    it('centres a lone axis instead of pinning it to the left edge', () => {
      const single: NgeParallelCoordsDataPoint[] = [
        { label: 'price', seriesId: 'a', value: 10 },
        { label: 'price', seriesId: 'b', value: 20 },
      ];
      const { context, g } = createContext(single);
      renderParallelCoordsLayer(context);

      expect(Number(axisLines(g)[0].getAttribute('x1'))).toBe(150);
    });
  });

  describe('records', () => {
    it('draws one polyline per seriesId, visiting every axis', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      expect(recordGroups(g)).toHaveLength(2);
      expect(vertices(lineOf(recordFor(g, 'a')))).toHaveLength(3);
    });

    it('gives every record an invisible wide-stroke hit twin on the same path', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const group = recordFor(g, 'a');
      expect(hitOf(group).getAttribute('d')).toBe(lineOf(group).getAttribute('d'));
      expect(styleOf(hitOf(group), 'stroke')).toBe('transparent');
      expect(Number(styleOf(hitOf(group), 'stroke-width'))).toBeGreaterThan(
        Number(styleOf(lineOf(group), 'stroke-width'))
      );
    });

    it('skips an axis a record has no value for rather than dropping the record', () => {
      const sparse: NgeParallelCoordsDataPoint[] = [
        ...RECORDS,
        { label: 'price', seriesId: 'c', value: 15 },
        { label: 'origin', seriesId: 'c', value: 'eu' },
      ];
      const { context, g } = createContext(sparse);
      renderParallelCoordsLayer(context);

      expect(vertices(lineOf(recordFor(g, 'c')))).toHaveLength(2);
    });

    it('skips a non-finite reading instead of collapsing it to zero', () => {
      const broken: NgeParallelCoordsDataPoint[] = [
        { label: 'price', seriesId: 'a', value: 10 },
        { label: 'weight', seriesId: 'a', value: Number.NaN },
        { label: 'price', seriesId: 'b', value: 20 },
        { label: 'weight', seriesId: 'b', value: 200 },
      ];
      const { context, g } = createContext(broken);
      renderParallelCoordsLayer(context);

      const points = vertices(lineOf(recordFor(g, 'a')));
      expect(points).toHaveLength(1);
      expect(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    });

    it('curves the polyline when configured to', () => {
      const { context, g } = createContext(RECORDS, { curve: 'monotone' });
      renderParallelCoordsLayer(context);

      expect(lineOf(recordFor(g, 'a')).getAttribute('d')).toContain('C');
    });

    it('groups points with no seriesId into a single record', () => {
      const unkeyed: NgeParallelCoordsDataPoint[] = [
        { label: 'price', value: 10 },
        { label: 'weight', value: 100 },
      ];
      const { context, g } = createContext(unkeyed);
      renderParallelCoordsLayer(context);

      expect(recordGroups(g)).toHaveLength(1);
    });
  });

  describe('color', () => {
    it('cycles the palette by record index by default', () => {
      const { context, g } = createContext(RECORDS, { seriesColors: ['#111111', '#222222'] });
      renderParallelCoordsLayer(context);

      expect(styleOf(lineOf(recordFor(g, 'a')), 'stroke')).toBe('#111111');
      expect(styleOf(lineOf(recordFor(g, 'b')), 'stroke')).toBe('#222222');
    });

    it('colors by a named dimension when colorBy is set', () => {
      const shared: NgeParallelCoordsDataPoint[] = [
        ...RECORDS,
        // A third record repeating record a's origin — it must take a's color, not a new one.
        { label: 'price', seriesId: 'c', value: 15 },
        { label: 'origin', seriesId: 'c', value: 'eu' },
      ];
      const { context, g } = createContext(shared, {
        colorBy: 'origin',
        seriesColors: ['#111111', '#222222', '#333333'],
      });
      renderParallelCoordsLayer(context);

      expect(styleOf(lineOf(recordFor(g, 'a')), 'stroke')).toBe('#111111');
      expect(styleOf(lineOf(recordFor(g, 'b')), 'stroke')).toBe('#222222');
      expect(styleOf(lineOf(recordFor(g, 'c')), 'stroke')).toBe('#111111');
    });

    it('lets a per-datum color win over colorBy and the palette', () => {
      const tinted = RECORDS.map(datum =>
        datum.seriesId === 'b' ? { ...datum, color: '#abcdef' } : datum
      );
      const { context, g } = createContext(tinted, {
        colorBy: 'origin',
        seriesColors: ['#111111', '#222222'],
      });
      renderParallelCoordsLayer(context);

      expect(styleOf(lineOf(recordFor(g, 'b')), 'stroke')).toBe('#abcdef');
    });
  });

  describe('theme', () => {
    it('applies the resolved defaults', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      expect(styleOf(lineOf(recordFor(g, 'a')), 'stroke-width')).toBe('1.5');
      expect(styleOf(axisLines(g)[0], 'stroke')).toContain('--nge-chart-outline');
    });

    it('merges a partial user theme over the defaults', () => {
      const { context, g } = createContext(RECORDS, {
        theme: { line: { width: 4 }, tick: { fontSize: 22 } },
      });
      renderParallelCoordsLayer(context);

      expect(styleOf(lineOf(recordFor(g, 'a')), 'stroke-width')).toBe('4');
      expect(styleOf(ticks(g)[0], 'font-size')).toBe('22px');
      // Untouched slices keep their defaults.
      expect(styleOf(axisLines(g)[0], 'stroke-width')).toBe('1');
    });
  });

  describe('re-render', () => {
    it('reconciles rather than redrawing, keeping the same nodes for surviving records', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);
      const first = lineOf(recordFor(g, 'a'));

      renderParallelCoordsLayer(context);

      expect(recordGroups(g)).toHaveLength(2);
      expect(lineOf(recordFor(g, 'a'))).toBe(first);
    });

    it('re-places a survivor when its data changes', () => {
      // Two records hold the domain at [10, 20] so moving `a` inside it is a genuine
      // re-place; without them, moving the extreme record would just shift the domain and
      // leave the mark where it was.
      const pinned: NgeParallelCoordsDataPoint[] = [
        { label: 'price', seriesId: 'a', value: 10 },
        { label: 'price', seriesId: 'floor', value: 10 },
        { label: 'price', seriesId: 'ceiling', value: 20 },
      ];
      const { context, g } = createContext(pinned);
      renderParallelCoordsLayer(context);
      expect(vertices(lineOf(recordFor(g, 'a')))[0][1]).toBe(AXIS_BOTTOM);

      const moved = pinned.map(datum => (datum.seriesId === 'a' ? { ...datum, value: 15 } : datum));
      renderParallelCoordsLayer({
        ...context,
        config: { ...context.config, data: moved },
        data: moved,
      });

      expect(vertices(lineOf(recordFor(g, 'a')))[0][1]).toBe((AXIS_TOP + AXIS_BOTTOM) / 2);
    });

    it('removes a dropped record after its exit transition', async () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      const fewer = RECORDS.filter(datum => datum.seriesId === 'a');
      renderParallelCoordsLayer({
        ...context,
        config: { ...context.config, data: fewer },
        data: fewer,
      });
      await settle();

      expect(recordGroups(g)).toHaveLength(1);
    });

    it('sweeps every mark when the data empties', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      renderParallelCoordsLayer({ ...context, config: { ...context.config, data: [] }, data: [] });

      expect(recordGroups(g)).toHaveLength(0);
      expect(axisLines(g)).toHaveLength(0);
      expect(ticks(g)).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('emits a tooltip for the datum on the axis nearest the pointer', () => {
      const { context, g, onTooltip } = createContext(RECORDS, { tooltip: true });
      renderParallelCoordsLayer(context);

      // clientX 150 lands on the middle axis, so the payload is the weight reading.
      hitOf(recordFor(g, 'b')).dispatchEvent(
        new MouseEvent('mousemove', { clientX: 150, clientY: 0 })
      );

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0];
      expect(event.visible).toBe(true);
      expect(event.content).toEqual({ label: 'weight', value: '200' });
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(RECORDS, { tooltip: true });
      renderParallelCoordsLayer(context);

      const hit = hitOf(recordFor(g, 'a'));
      hit.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
      hit.dispatchEvent(new MouseEvent('mouseleave'));

      expect(onTooltip.mock.calls.at(-1)?.[0].visible).toBe(false);
    });

    it('dims the other records while one is hovered, and restores them after', () => {
      const { context, g } = createContext(RECORDS, { tooltip: true });
      renderParallelCoordsLayer(context);

      const hovered = recordFor(g, 'a');
      hitOf(hovered).dispatchEvent(new MouseEvent('mouseenter'));

      expect(styleOf(hovered, 'opacity')).toBe('1');
      expect(styleOf(recordFor(g, 'b'), 'opacity')).toBe('0.12');

      hitOf(hovered).dispatchEvent(new MouseEvent('mouseleave'));

      expect(styleOf(recordFor(g, 'b'), 'opacity')).toBe('0.7');
    });

    it('reports the nearest-axis datum and the record index on click', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(RECORDS, { onClick });
      renderParallelCoordsLayer(context);

      hitOf(recordFor(g, 'b')).dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0 }));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toMatchObject({ label: 'price', value: 20 });
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });

    it('leaves the marks inert when neither a tooltip nor a click handler is configured', () => {
      const { context, g, onTooltip } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      hitOf(recordFor(g, 'a')).dispatchEvent(
        new MouseEvent('mousemove', { clientX: 0, clientY: 0 })
      );

      expect(onTooltip).not.toHaveBeenCalled();
      expect(styleOf(hitOf(recordFor(g, 'a')), 'cursor')).toBe('default');
    });
  });

  /**
   * Brush geometry against the fixture: the axes span y 24–292, so `price` and `weight` both
   * map their minimum to 292 and their maximum to 24, and the `origin` point scale (padding
   * 0.5, two categories) seats `eu` at 225 and `us` at 91 with a 134px step.
   */
  describe('brush', () => {
    /** `price` 15–20 — the upper half of that axis, i.e. the pixel band [24, 158]. */
    const PRICE_UPPER: NgeParallelCoordsBrushExtents = {
      price: { kind: 'range', range: [15, 20] },
    };

    it('draws no brush chrome when neither an extent nor a sink is configured', () => {
      const { context, g } = createContext(RECORDS);
      renderParallelCoordsLayer(context);

      expect(brushGroups(g)).toHaveLength(0);
    });

    it('gives every axis a full-span grab band once a sink is wired', () => {
      const { context, g } = createContext(RECORDS, { onBrush: jest.fn() });
      renderParallelCoordsLayer(context);

      expect(brushGroups(g).map(node => node.getAttribute('data-dimension'))).toEqual([
        'price',
        'weight',
        'origin',
      ]);

      const band = bandOf(brushFor(g, 'price'));
      expect(band.getAttribute('y')).toBe(`${AXIS_TOP}`);
      expect(band.getAttribute('height')).toBe(`${AXIS_BOTTOM - AXIS_TOP}`);
      expect(styleOf(band, 'pointer-events')).toBe('all');
      // No extent yet, so there is chrome to grab but nothing drawn.
      expect(windowOf(brushFor(g, 'price'))).toBeNull();
    });

    it('emits an ascending data range for a drag on a linear axis', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, { onBrush });
      renderParallelCoordsLayer(context);

      dragBrush(g, svg, 'price', AXIS_TOP, 158);

      expect(onBrush).toHaveBeenCalledTimes(1);
      const event = onBrush.mock.calls[0][0];
      expect(event.dimension).toBe('price');
      expect(event.extent.kind).toBe('range');
      expect(event.extent.range[0]).toBeCloseTo(15);
      expect(event.extent.range[1]).toBeCloseTo(20);
      // The whole map comes back, so the consumer can feed it straight to `brushExtents`.
      expect(event.extents).toEqual({ price: event.extent });
    });

    it('emits the categories inside the band on a point axis, in domain order', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, { onBrush });
      renderParallelCoordsLayer(context);

      // 24–158 reaches `us` (91) but stops short of `eu` (225).
      dragBrush(g, svg, 'origin', AXIS_TOP, 158);
      expect(onBrush.mock.calls[0][0].extent).toEqual({ categories: ['us'], kind: 'categories' });

      onBrush.mockClear();
      dragBrush(g, svg, 'origin', AXIS_TOP, AXIS_BOTTOM);
      expect(onBrush.mock.calls[0][0].extent).toEqual({
        categories: ['eu', 'us'],
        kind: 'categories',
      });
    });

    it('selects nothing when a point-axis drag lands between two categories', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, { onBrush });
      renderParallelCoordsLayer(context);

      // The gap between `us` (91) and `eu` (225).
      dragBrush(g, svg, 'origin', 140, 150);

      expect(onBrush.mock.calls[0][0].extent).toBeNull();
      expect(onBrush.mock.calls[0][0].extents).toEqual({});
    });

    it('draws the window and its two grips from a controlled extent', () => {
      const { context, g } = createContext(RECORDS, { brushExtents: PRICE_UPPER });
      renderParallelCoordsLayer(context);

      const window = windowOf(brushFor(g, 'price'));
      expect(window?.getAttribute('y')).toBe(`${AXIS_TOP}`);
      expect(window?.getAttribute('height')).toBe('134');

      expect(handlesOf(brushFor(g, 'price')).map(node => node.getAttribute('y'))).toEqual([
        '22',
        '156',
      ]);
    });

    it('dims the records outside an extent and holds the matching ones at rest', async () => {
      const { context, g } = createContext(RECORDS, { brushExtents: PRICE_UPPER });
      renderParallelCoordsLayer(context);
      await settle();

      // `a` sits at price 10, outside 15–20; `b` at 20 is inside. Dimmed, never removed.
      expect(recordGroups(g)).toHaveLength(2);
      expect(Number(styleOf(recordFor(g, 'a'), 'opacity'))).toBeCloseTo(0.12);
      expect(Number(styleOf(recordFor(g, 'b'), 'opacity'))).toBeCloseTo(0.7);
    });

    it('composes extents as AND, and fails a record missing a brushed dimension', async () => {
      // `c` carries only a price reading — it cannot be shown to cross the `origin` axis.
      const data = [...RECORDS, { label: 'price', seriesId: 'c', value: 20 }];
      const { context, g } = createContext(data, {
        brushExtents: {
          ...PRICE_UPPER,
          origin: { categories: ['us'], kind: 'categories' },
        },
      });
      renderParallelCoordsLayer(context);
      await settle();

      expect(Number(styleOf(recordFor(g, 'a'), 'opacity'))).toBeCloseTo(0.12);
      expect(Number(styleOf(recordFor(g, 'b'), 'opacity'))).toBeCloseTo(0.7);
      expect(Number(styleOf(recordFor(g, 'c'), 'opacity'))).toBeCloseTo(0.12);
    });

    it('ignores an extent naming a dimension that is not drawn', async () => {
      const { context, g } = createContext(RECORDS, {
        brushExtents: { origin: { categories: ['us'], kind: 'categories' } },
        dimensions: ['price', 'weight'],
      });
      renderParallelCoordsLayer(context);
      await settle();

      expect(brushGroups(g).map(node => node.getAttribute('data-dimension'))).toEqual([
        'price',
        'weight',
      ]);
      // A filter with no axis to explain it would read as a bug, so it does not apply.
      expect(Number(styleOf(recordFor(g, 'a'), 'opacity'))).toBeCloseTo(0.7);
      expect(Number(styleOf(recordFor(g, 'b'), 'opacity'))).toBeCloseTo(0.7);
    });

    it('resizes from a grabbed handle without moving the opposite edge', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, {
        brushExtents: PRICE_UPPER,
        onBrush,
      });
      renderParallelCoordsLayer(context);

      // Grab the window's bottom edge (158) and pull it down to 225.
      dragBrush(g, svg, 'price', 158, 225);

      const extent = onBrush.mock.calls.at(-1)?.[0].extent;
      expect(extent.range[0]).toBeCloseTo(12.5);
      expect(extent.range[1]).toBeCloseTo(20);
    });

    it('pans the window body, pushed back rather than squashed at the axis end', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, {
        brushExtents: PRICE_UPPER,
        onBrush,
      });
      renderParallelCoordsLayer(context);

      // Grab inside the window and drag far past the bottom of the axis.
      dragBrush(g, svg, 'price', 100, 300);

      // The 134px window keeps its height and comes to rest against the axis end.
      const extent = onBrush.mock.calls.at(-1)?.[0].extent;
      expect(extent.range[0]).toBeCloseTo(10);
      expect(extent.range[1]).toBeCloseTo(15);
    });

    it('clears the dimension when a press away from the window never moves', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, {
        brushExtents: PRICE_UPPER,
        onBrush,
      });
      renderParallelCoordsLayer(context);

      pressBrush(g, 'price', 250);
      svg.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: 250 }));

      expect(onBrush).toHaveBeenCalledWith({ dimension: 'price', extent: null, extents: {} });
    });

    it('leaves an existing window alone when a grab on it never moves', () => {
      const onBrush = jest.fn();
      const { context, g, svg } = createContext(RECORDS, {
        brushExtents: PRICE_UPPER,
        onBrush,
      });
      renderParallelCoordsLayer(context);

      pressBrush(g, 'price', 100);
      svg.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: 100 }));

      expect(onBrush).not.toHaveBeenCalled();
    });

    it('restores the brush-aware resting opacity after a hover, not a flat one', () => {
      const { context, g } = createContext(RECORDS, {
        brushExtents: PRICE_UPPER,
        tooltip: true,
      });
      renderParallelCoordsLayer(context);

      const hovered = recordFor(g, 'b');
      hitOf(hovered).dispatchEvent(new MouseEvent('mouseenter'));
      expect(styleOf(recordFor(g, 'a'), 'opacity')).toBe('0.12');

      hitOf(hovered).dispatchEvent(new MouseEvent('mouseleave'));

      // `a` is brushed OUT, so leaving the hover must drop it back to the dim — restoring a
      // flat `line.opacity` here would silently wipe the filter's whole visual effect.
      expect(styleOf(recordFor(g, 'a'), 'opacity')).toBe('0.12');
      expect(styleOf(recordFor(g, 'b'), 'opacity')).toBe('0.7');
    });

    it('does not let the hover highlight fire while a brush drag is live', async () => {
      const { context, g, svg } = createContext(RECORDS, { onBrush: jest.fn(), tooltip: true });
      renderParallelCoordsLayer(context);
      await settle();

      pressBrush(g, 'price', 100);
      hitOf(recordFor(g, 'a')).dispatchEvent(new MouseEvent('mouseenter'));

      // Without the guard the two would fight over the same opacity, which reads as flicker.
      expect(Number(styleOf(recordFor(g, 'b'), 'opacity'))).toBeCloseTo(0.7);

      svg.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: 100 }));
    });

    it('keeps every brush mark inside the bounded plot rect', () => {
      const { context, g } = createContext(RECORDS, {
        brushExtents: {
          ...PRICE_UPPER,
          origin: { categories: ['eu', 'us'], kind: 'categories' },
        },
        onBrush: jest.fn(),
      });
      renderParallelCoordsLayer(context);

      // ⚠️ The layers group is clipped to the plot rect and jsdom does NOT clip, so a band
      // centred on the first axis (x = 0) would silently vanish in a browser while every other
      // assertion here still passed. The outer axes keep their chrome flush to the edge.
      const rects = Array.from(g.querySelectorAll<SVGRectElement>('rect'));
      expect(rects.length).toBeGreaterThan(0);
      for (const rect of rects) {
        const x = Number(rect.getAttribute('x'));
        const y = Number(rect.getAttribute('y'));
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + Number(rect.getAttribute('width'))).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
        expect(y + Number(rect.getAttribute('height'))).toBeLessThanOrEqual(
          DIMENSIONS.boundedHeight
        );
      }
    });

    it('renders read-only chrome when extents are set with no sink', () => {
      const { context, g, svg } = createContext(RECORDS, { brushExtents: PRICE_UPPER });
      renderParallelCoordsLayer(context);

      expect(windowOf(brushFor(g, 'price'))).not.toBeNull();
      expect(styleOf(bandOf(brushFor(g, 'price')), 'cursor')).toBe('default');

      // The gesture is unarmed, so a drag changes nothing.
      expect(() => dragBrush(g, svg, 'price', AXIS_TOP, 158)).not.toThrow();
      expect(windowOf(brushFor(g, 'price'))?.getAttribute('height')).toBe('134');
    });
  });
});
