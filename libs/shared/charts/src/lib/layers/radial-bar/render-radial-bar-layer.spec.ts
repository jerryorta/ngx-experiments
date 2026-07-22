import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeRadialBarDataPoint, NgeRadialBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeRadialBarLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderRadialBarLayer } from './render-radial-bar-layer';

type RadialBarContext = NgeChartLayerContext<
  NgeRadialBarDataPoint,
  NgeRadialBarLayerConfig,
  NgeRadialBarLayerTheme | undefined
>;

interface ContextOptions {
  endAngle?: number;
  innerRadius?: number;
  mark?: NgeRadialBarLayerConfig['mark'];
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  seriesColors?: string[];
  startAngle?: number;
  theme?: NgeRadialBarLayerTheme;
  tooltip?: boolean;
  wedge?: NgeRadialBarLayerConfig['wedge'];
}

// Square bounds → cx = cy = 100, outerRadius = 100.
const DIMENSIONS = {
  boundedHeight: 200,
  boundedWidth: 200,
  height: 220,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 220,
};

/** Three bars summing to 100 (input order A, B, C; C is the max → its bar reaches outerRadius). */
const BARS: NgeRadialBarDataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 20 },
  { label: 'C', value: 50 },
];

function createContext(
  data: NgeRadialBarDataPoint[],
  options: ContextOptions = {}
): { context: RadialBarContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeRadialBarLayerConfig = {
    data,
    endAngle: options.endAngle,
    innerRadius: options.innerRadius,
    mark: options.mark,
    onClick: options.onClick,
    padAngle: options.padAngle,
    renderer: renderRadialBarLayer,
    seriesColors: options.seriesColors,
    startAngle: options.startAngle,
    type: 'radial-bar',
    wedge: options.wedge,
  };

  // Radial-bar ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: RadialBarContext = {
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
          formatContent: (d: NgeRadialBarDataPoint) => ({ label: d.label, value: d.value }),
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

/** The arc mark d3 bound to a bar / cell element. */
function markOf<T>(node: Element): T {
  return (node as unknown as { __data__: T }).__data__;
}

/** The `.nge-radial-bar-arc` bound to a specific bar label. */
function barByLabel(g: SVGGElement, label: string): SVGPathElement {
  const match = Array.from(g.querySelectorAll<SVGPathElement>('.nge-radial-bar-arc')).find(
    node => markOf<{ label: string }>(node).label === label
  );
  if (!match) {
    throw new Error(`No radial bar for label "${label}"`);
  }
  return match;
}

/**
 * The endpoint radii of a d3 `arc()` path — the min / max distance from the container
 * origin (0,0) across the path's command endpoints (mirrors the sunburst spec helper). For
 * a zero-inner-radius wedge the inner edge collapses to `L0,0`, so `inner` rounds to 0.
 */
function arcRadii(d: string): { inner: number; outer: number } {
  const radii = Array.from(d.matchAll(/([MLA])([^MLAZ]+)/g)).map(match => {
    const nums = match[2].split(',').map(Number);
    const [x, y] = match[1] === 'A' ? [nums[5], nums[6]] : [nums[0], nums[1]];
    return Math.hypot(x, y);
  });
  return { inner: Math.min(...radii), outer: Math.max(...radii) };
}

/**
 * Real-timer wait so d3 transitions run to completion. Bar `d` is applied via `attrTween`
 * (never synchronously), so the arc path string is only observable after a real delay past
 * the enter duration (300ms). Fills / handlers / bound data apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderRadialBarLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(0);
    });

    it('sweeps stale marks when data becomes empty', async () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(3);

      context.config.data = [];
      context.data = [];
      renderRadialBarLayer(context);
      await settle();

      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(0);
    });
  });

  describe('structure (bar)', () => {
    it('renders one arc path per datum', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(3);
    });

    it('centers the container in the bounded area', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      const container = g.querySelector('.nge-radial-bar-container');
      expect(container?.getAttribute('transform')).toBe('translate(100,100)');
    });

    it('re-renders idempotently (keyed by label)', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(3);
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('exits a removed bar on re-render', async () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(3);

      const reduced = BARS.slice(0, 2);
      context.config.data = reduced;
      context.data = reduced;
      renderRadialBarLayer(context);
      await settle();

      const remaining = Array.from(g.querySelectorAll('.nge-radial-bar-arc')).map(
        node => markOf<{ label: string }>(node).label
      );
      expect(remaining).toEqual(['A', 'B']);
    });

    it('updates a bar in place (same label keeps the same element)', async () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      await settle();
      const before = barByLabel(g, 'A');

      const changed: NgeRadialBarDataPoint[] = [
        { label: 'A', value: 5 },
        { label: 'B', value: 20 },
        { label: 'C', value: 50 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderRadialBarLayer(context);
      await settle();

      expect(barByLabel(g, 'A')).toBe(before);
    });
  });

  describe('wedge angular math', () => {
    it('gives every bar an equal angular slot (wedge: equal, default)', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      const spans = Array.from(g.querySelectorAll('.nge-radial-bar-arc')).map(node => {
        const mark = markOf<{ a0: number; a1: number }>(node);
        return mark.a1 - mark.a0;
      });
      const third = (2 * Math.PI) / 3;
      for (const span of spans) {
        expect(span).toBeCloseTo(third, 6);
      }
    });

    it('makes each wedge proportional to value (wedge: value)', () => {
      const { context, g } = createContext(BARS, { wedge: 'value' });

      renderRadialBarLayer(context);

      // Values 30/20/50 of 100 → spans 0.6π / 0.4π / 1.0π.
      const spanOf = (label: string): number => {
        const mark = markOf<{ a0: number; a1: number }>(barByLabel(g, label));
        return mark.a1 - mark.a0;
      };
      expect(spanOf('A')).toBeCloseTo(0.6 * Math.PI, 6);
      expect(spanOf('B')).toBeCloseTo(0.4 * Math.PI, 6);
      expect(spanOf('C')).toBeCloseTo(Math.PI, 6);
    });
  });

  describe('radial geometry (innerRadius + value → radius)', () => {
    it('grows bars from the center and reaches outerRadius for the max value', async () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      await settle();

      // innerRadius 0 → every bar starts at the center.
      expect(arcRadii(barByLabel(g, 'A').getAttribute('d') ?? '').inner).toBeCloseTo(0, 1);
      // C is the max value (50) → its bar reaches the outer radius (min(w,h) / 2 = 100).
      expect(arcRadii(barByLabel(g, 'C').getAttribute('d') ?? '').outer).toBeCloseTo(100, 0);
    });

    it('carves an inner hole sized to innerRadius (ratio of the outer radius)', async () => {
      const { context, g } = createContext(BARS, { innerRadius: 0.5 });

      renderRadialBarLayer(context);
      await settle();

      // innerRadius 0.5 · outerRadius(100) = 50 → every bar starts at radius ≈ 50.
      expect(arcRadii(barByLabel(g, 'A').getAttribute('d') ?? '').inner).toBeCloseTo(50, 0);
    });
  });

  describe('semi-circle (startAngle / endAngle)', () => {
    it('spans exactly the configured angular sweep (mark: bar)', () => {
      const { context, g } = createContext(BARS, { endAngle: Math.PI, startAngle: 0 });

      renderRadialBarLayer(context);

      const marks = Array.from(g.querySelectorAll('.nge-radial-bar-arc')).map(node =>
        markOf<{ a0: number; a1: number }>(node)
      );
      const minStart = Math.min(...marks.map(m => m.a0));
      const maxEnd = Math.max(...marks.map(m => m.a1));
      expect(minStart).toBeCloseTo(0, 6);
      expect(maxEnd).toBeCloseTo(Math.PI, 6);
      // No bar reaches beyond the requested half-turn.
      for (const m of marks) {
        expect(m.a1).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    });
  });

  describe('non-finite / negative / zero value hardening', () => {
    it('collapses negative + NaN bars to zero length (NaN-free d) and scales valid bars against the real max', async () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', value: 30 },
        { label: 'B', value: -10 },
        { label: 'C', value: NaN },
        { label: 'D', value: 50 },
      ];
      const { context, g } = createContext(data);

      renderRadialBarLayer(context);
      await settle();

      // (a) No arc path contains NaN.
      for (const arc of Array.from(g.querySelectorAll('.nge-radial-bar-arc'))) {
        expect(arc.getAttribute('d') ?? '').not.toContain('NaN');
      }
      // (b) The negative + NaN bars collapse to zero radial length (outer ≈ inner ≈ 0).
      expect(arcRadii(barByLabel(g, 'B').getAttribute('d') ?? '').outer).toBeCloseTo(0, 1);
      expect(arcRadii(barByLabel(g, 'C').getAttribute('d') ?? '').outer).toBeCloseTo(0, 1);
      // (c) Valid bars scale against the real max (50), NOT the all-zero [0, 1] fallback:
      // D (the max) reaches outerRadius (100); A (30 of 50) reaches 60. A [0, 1] domain
      // (the bug the sanitizer prevents) would blow A's radius far past the outer radius.
      expect(arcRadii(barByLabel(g, 'D').getAttribute('d') ?? '').outer).toBeCloseTo(100, 0);
      expect(arcRadii(barByLabel(g, 'A').getAttribute('d') ?? '').outer).toBeCloseTo(60, 0);
    });

    it('keeps the area + line paths NaN-free when a series carries a negative / NaN vertex (mark: area)', () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', value: 30 },
        { label: 'B', value: -10 },
        { label: 'C', value: NaN },
        { label: 'D', value: 50 },
      ];
      const { context, g } = createContext(data, { mark: 'area' });

      renderRadialBarLayer(context);

      const area = g.querySelector('.nge-radial-bar-area');
      const line = g.querySelector('.nge-radial-bar-line');
      expect((area?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
      expect(area?.getAttribute('d') ?? '').not.toContain('NaN');
      expect(line?.getAttribute('d') ?? '').not.toContain('NaN');
    });

    it('renders all-zero data without throwing, NaN-free (domainMax falls back to 1)', async () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
        { label: 'C', value: 0 },
      ];
      const { context, g } = createContext(data);

      expect(() => renderRadialBarLayer(context)).not.toThrow();
      await settle();

      const arcs = Array.from(g.querySelectorAll('.nge-radial-bar-arc'));
      expect(arcs).toHaveLength(3);
      for (const arc of arcs) {
        expect(arc.getAttribute('d') ?? '').not.toContain('NaN');
      }
    });
  });

  describe('padAngle (bar)', () => {
    it('applies the configured padAngle gap to the bar arcs', async () => {
      const { context: base, g: gBase } = createContext(BARS);
      renderRadialBarLayer(base);
      await settle();
      const dNoPad = barByLabel(gBase, 'A').getAttribute('d') ?? '';

      const { context: padded, g: gPad } = createContext(BARS, { padAngle: 0.2 });
      renderRadialBarLayer(padded);
      await settle();
      const dPad = barByLabel(gPad, 'A').getAttribute('d') ?? '';

      // The pad inset changes the drawn wedge geometry (and never produces NaN).
      expect(dPad).not.toBe(dNoPad);
      expect(dPad).not.toContain('NaN');
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors bars from the theme palette by input index', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      expect(styleOf(barByLabel(g, 'A'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(barByLabel(g, 'B'), 'fill')).toBe('var(--chart-secondary)');
      expect(styleOf(barByLabel(g, 'C'), 'fill')).toBe('var(--chart-tertiary)');
    });

    it('honors a per-datum color override above the palette', () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', value: 30 },
        { color: 'var(--override)', label: 'B', value: 20 },
      ];
      const { context, g } = createContext(data);

      renderRadialBarLayer(context);

      expect(styleOf(barByLabel(g, 'B'), 'fill')).toBe('var(--override)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(BARS, {
        seriesColors: ['#111111', '#222222', '#333333'],
      });

      renderRadialBarLayer(context);

      expect(styleOf(barByLabel(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(barByLabel(g, 'B'), 'fill')).toBe('#222222');
    });
  });

  describe('mark: area', () => {
    it('draws a series group with a filled area + outline path', () => {
      const { context, g } = createContext(BARS, { mark: 'area' });

      renderRadialBarLayer(context);

      // Single series (no seriesId) → one series group.
      expect(g.querySelectorAll('.nge-radial-bar-series')).toHaveLength(1);
      const area = g.querySelector('.nge-radial-bar-area');
      const line = g.querySelector('.nge-radial-bar-line');
      expect((area?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
      expect((line?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
      // No bar arcs / cells when the mark is area.
      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(0);
    });

    it('draws one series group per seriesId (multi-series)', () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', seriesId: 's1', value: 30 },
        { label: 'B', seriesId: 's1', value: 20 },
        { label: 'A', seriesId: 's2', value: 10 },
        { label: 'B', seriesId: 's2', value: 40 },
      ];
      const { context, g } = createContext(data, { mark: 'area' });

      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-series')).toHaveLength(2);
    });

    it('colors a single area series with the first palette entry', () => {
      const { context, g } = createContext(BARS, { mark: 'area' });

      renderRadialBarLayer(context);

      expect(styleOf(g.querySelector('.nge-radial-bar-area')!, 'fill')).toBe(
        'var(--chart-primary)'
      );
    });

    it('assigns each area series a stable palette color by series order (multi-series)', () => {
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', seriesId: 's1', value: 30 },
        { label: 'B', seriesId: 's1', value: 20 },
        { label: 'A', seriesId: 's2', value: 10 },
        { label: 'B', seriesId: 's2', value: 40 },
      ];
      const { context, g } = createContext(data, { mark: 'area' });

      renderRadialBarLayer(context);

      const areaFill = (seriesId: string): string =>
        styleOf(
          g.querySelector(
            `.nge-radial-bar-series[data-series-id="${seriesId}"] .nge-radial-bar-area`
          )!,
          'fill'
        );
      // Series order (s1 then s2) → palette[0], palette[1] — stable by series index.
      expect(areaFill('s1')).toBe('var(--chart-primary)');
      expect(areaFill('s2')).toBe('var(--chart-secondary)');
    });

    it('renders an invisible hover/click target per vertex when interactive', () => {
      const { context, g } = createContext(BARS, { mark: 'area', tooltip: true });

      renderRadialBarLayer(context);

      // One `.nge-radial-bar-point` per category vertex (single series → 3).
      expect(g.querySelectorAll('.nge-radial-bar-point')).toHaveLength(3);
      // The target is invisible — the visible area fill keeps pointer-events: none.
      expect(styleOf(g.querySelector('.nge-radial-bar-point')!, 'fill')).toBe('transparent');
    });

    it('builds no interaction targets when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(BARS, { mark: 'area' });

      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-point')).toHaveLength(0);
    });

    it('routes a hovered area vertex to the tooltip with its datum', () => {
      const { context, g, onTooltip } = createContext(BARS, { mark: 'area', tooltip: true });

      renderRadialBarLayer(context);
      // Vertices are joined in category order (A, B, C) → index 1 is category B.
      const points = g.querySelectorAll<SVGCircleElement>('.nge-radial-bar-point');
      points[1].dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('B');
    });

    it('invokes area onClick with the vertex datum and its WITHIN-series index (not the config.data index)', () => {
      const onClick = jest.fn();
      const data: NgeRadialBarDataPoint[] = [
        { label: 'A', seriesId: 's1', value: 30 },
        { label: 'B', seriesId: 's1', value: 20 },
        { label: 'A', seriesId: 's2', value: 10 },
        { label: 'B', seriesId: 's2', value: 40 },
      ];
      const { context, g } = createContext(data, { mark: 'area', onClick });

      renderRadialBarLayer(context);

      // s2's 2nd vertex is config.data index 3, but the area click index is the WITHIN-series
      // position (`series.points.indexOf(v)`) → 1, NOT the flat input index the bar/cell use.
      const s2Points = g
        .querySelector('.nge-radial-bar-series[data-series-id="s2"]')!
        .querySelectorAll<SVGCircleElement>('.nge-radial-bar-point');
      s2Points[1].dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(data[3]);
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });
  });

  describe('mark: cell (circular heat map)', () => {
    const CELLS: NgeRadialBarDataPoint[] = [
      { band: 'r1', label: 'A', value: 100 },
      { band: 'r1', label: 'B', value: 0 },
    ];

    it('draws one cell arc per datum', () => {
      const { context, g } = createContext(CELLS, { mark: 'cell' });

      renderRadialBarLayer(context);

      expect(g.querySelectorAll('.nge-radial-bar-cell')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(0);
    });

    it('encodes value as fill opacity (max → 1, min → the opacity floor)', () => {
      const { context, g } = createContext(CELLS, { mark: 'cell' });

      renderRadialBarLayer(context);

      const cellByLabel = (label: string): SVGPathElement =>
        Array.from(g.querySelectorAll<SVGPathElement>('.nge-radial-bar-cell')).find(
          node => markOf<{ datum: NgeRadialBarDataPoint }>(node).datum.label === label
        )!;

      // Max value (100) → fill-opacity 1; min value (0) → the 0.1 floor.
      expect(Number(styleOf(cellByLabel('A'), 'fill-opacity'))).toBeCloseTo(1, 6);
      expect(Number(styleOf(cellByLabel('B'), 'fill-opacity'))).toBeCloseTo(0.1, 6);
    });
  });

  describe('mark switch at runtime', () => {
    it('swaps bar arcs for cells when the mark flips', async () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);
      expect(g.querySelectorAll('.nge-radial-bar-arc').length).toBeGreaterThan(0);

      context.config.mark = 'cell';
      renderRadialBarLayer(context);
      await settle();

      expect(g.querySelectorAll('.nge-radial-bar-cell').length).toBeGreaterThan(0);
      expect(g.querySelectorAll('.nge-radial-bar-arc')).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('leaves bars non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      expect(styleOf(barByLabel(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered bar to the tooltip with its datum', () => {
      const { context, g, onTooltip } = createContext(BARS, { tooltip: true });

      renderRadialBarLayer(context);
      barByLabel(g, 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('B');
      expect(event.content.value).toBe(20);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(BARS, { tooltip: true });

      renderRadialBarLayer(context);
      const bar = barByLabel(g, 'A');
      bar.dispatchEvent(new MouseEvent('mouseenter'));
      bar.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its input index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(BARS, { onClick });

      renderRadialBarLayer(context);
      barByLabel(g, 'C').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(BARS[2]);
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });
  });
});
