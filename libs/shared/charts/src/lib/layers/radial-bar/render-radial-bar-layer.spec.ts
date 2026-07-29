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
  formatLabel?: NgeRadialBarLayerConfig['formatLabel'];
  innerRadius?: number;
  labelColor?: string;
  labelGutter?: number;
  labelPosition?: NgeRadialBarLayerConfig['labelPosition'];
  mark?: NgeRadialBarLayerConfig['mark'];
  minLabelAngle?: number;
  minLabelSize?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  radiusRatio?: number;
  seriesColors?: string[];
  showLabels?: boolean;
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
    formatLabel: options.formatLabel,
    innerRadius: options.innerRadius,
    labelColor: options.labelColor,
    labelGutter: options.labelGutter,
    labelPosition: options.labelPosition,
    mark: options.mark,
    minLabelAngle: options.minLabelAngle,
    minLabelSize: options.minLabelSize,
    onClick: options.onClick,
    padAngle: options.padAngle,
    radiusRatio: options.radiusRatio,
    renderer: renderRadialBarLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
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

/** Every rendered bar label, in document order. */
function labels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-radial-bar-label'));
}

/** The `.nge-radial-bar-label` drawn for a specific bar. */
function labelByBar(g: SVGGElement, label: string): SVGTextElement {
  const match = labels(g).find(node => node.getAttribute('data-label') === label);
  if (!match) {
    throw new Error(`No radial-bar label for "${label}"`);
  }
  return match;
}

/**
 * Parse a label's `translate(x,y) rotate(deg)` transform back into numbers. jsdom does not
 * implement `transform.baseVal`, so the attribute string is the only readable form.
 */
function placementOf(node: SVGTextElement): { rotate: number; x: number; y: number } {
  const transform = node.getAttribute('transform') ?? '';
  const translate = /translate\(([^,]+),([^)]+)\)/.exec(transform);
  const rotate = /rotate\(([^)]+)\)/.exec(transform);
  return {
    rotate: Number(rotate?.[1] ?? NaN),
    x: Number(translate?.[1] ?? NaN),
    y: Number(translate?.[2] ?? NaN),
  };
}

/**
 * Real-timer wait so d3 transitions run to completion. Bar `d` is applied via `attrTween`
 * (never synchronously), so the arc path string is only observable after a real delay past
 * the enter duration (300ms). Fills / handlers / bound data apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderRadialBarLayer', () => {
  describe('radiusRatio', () => {
    /**
     * The largest magnitude in an arc's own path data is its outer radius — every coordinate
     * and every `A rx,ry` on a centered arc is bounded by it. A blunt probe, but it needs no
     * layout (jsdom has none) and it moves exactly with the radius.
     */
    const maxExtent = (g: SVGGElement, selector: string): number => {
      const magnitudes = Array.from(g.querySelectorAll<SVGPathElement>(selector)).flatMap(
        node =>
          (node.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)?.map(n => Math.abs(Number(n))) ??
          []
      );
      // Without this a mistyped selector yields `Math.max()` === -Infinity, and -Infinity/2
      // is still -Infinity — so the ratio assertion below would pass while measuring nothing.
      if (magnitudes.length === 0) {
        throw new Error(`No marks matched "${selector}" — the probe would measure nothing`);
      }
      return Math.max(...magnitudes);
    };

    it('scales the mark down without distorting it', async () => {
      const full = createContext(BARS);
      const small = createContext(BARS, { radiusRatio: 0.5 });

      renderRadialBarLayer(full.context);
      renderRadialBarLayer(small.context);
      await settle();

      // Half the ratio, half the radius — and because `innerRadius` is a ratio OF the outer
      // radius, the rings/hole scale with it rather than the shape warping.
      expect(maxExtent(small.g, '.nge-radial-bar-arc')).toBeCloseTo(
        maxExtent(full.g, '.nge-radial-bar-arc') / 2,
        4
      );
    });

    it('fills the plot when omitted', async () => {
      const omitted = createContext(BARS);
      const explicit = createContext(BARS, { radiusRatio: 1 });

      renderRadialBarLayer(omitted.context);
      renderRadialBarLayer(explicit.context);
      await settle();

      expect(maxExtent(omitted.g, '.nge-radial-bar-arc')).toBeCloseTo(
        maxExtent(explicit.g, '.nge-radial-bar-arc'),
        6
      );
    });
  });

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

      expect(styleOf(barByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(barByLabel(g, 'B'), 'fill')).toBe('var(--nge-chart-secondary)');
      expect(styleOf(barByLabel(g, 'C'), 'fill')).toBe('var(--nge-chart-tertiary)');
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
        'var(--nge-chart-primary)'
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
      expect(areaFill('s1')).toBe('var(--nge-chart-primary)');
      expect(areaFill('s2')).toBe('var(--nge-chart-secondary)');
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

  describe('labels', () => {
    it('draws none until showLabels is set', () => {
      const { context, g } = createContext(BARS);

      renderRadialBarLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('draws one label per bar', () => {
      const { context, g } = createContext(BARS, { showLabels: true });

      renderRadialBarLayer(context);

      expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['A', 'B', 'C']);
    });

    it('lets hover and click fall through to the bar underneath', () => {
      const { context, g } = createContext(BARS, { showLabels: true });

      renderRadialBarLayer(context);

      expect(styleOf(labelByBar(g, 'A'), 'pointer-events')).toBe('none');
    });

    it('keeps the label group last so a new bar cannot paint over a label', () => {
      const { context, g } = createContext(BARS, { showLabels: true });

      renderRadialBarLayer(context);

      const container = g.querySelector('.nge-radial-bar-container');
      expect(container?.lastElementChild?.classList.contains('nge-radial-bar-labels')).toBe(true);
    });

    it('draws no labels for a mark that has no per-datum bar', async () => {
      // `cell` encodes value as fill-opacity, so on-mark contrast derivation cannot read it;
      // `area` has no per-datum mark at all. Both are excluded from the label join.
      const { context, g } = createContext(BARS, { mark: 'cell', showLabels: true });

      renderRadialBarLayer(context);
      await settle();

      expect(labels(g)).toHaveLength(0);
    });

    it('exits every label when the mark switches away from bar', async () => {
      const { context, g } = createContext(BARS, { showLabels: true });

      renderRadialBarLayer(context);
      expect(labels(g)).toHaveLength(3);

      context.config.mark = 'area';
      renderRadialBarLayer(context);
      await settle();

      expect(labels(g)).toHaveLength(0);
    });

    describe('placement (inside — along the radius, flipped on the left)', () => {
      it('anchors each label at the middle of its own bar', () => {
        // Bar A sweeps [0, 2π/3] (mid 60°) and reaches r=60, so its anchor sits at r=30
        // along the 60° direction: (30·cos(−30°), 30·sin(−30°)).
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);

        const { x, y } = placementOf(labelByBar(g, 'A'));
        expect(Math.hypot(x, y)).toBeCloseTo(30, 5);
        expect(x).toBeCloseTo(25.98, 2);
        expect(y).toBeCloseTo(-15, 2);
      });

      it('re-centers the anchor between the inner and outer radius of a donut', () => {
        // innerRadius 0.5 → bars run [50, 100]; A (30 of 50) ends at 80, so its label
        // anchors at r=65 rather than at half its outer radius.
        const { context, g } = createContext(BARS, { innerRadius: 0.5, showLabels: true });

        renderRadialBarLayer(context);

        const { x, y } = placementOf(labelByBar(g, 'A'));
        expect(Math.hypot(x, y)).toBeCloseTo(65, 5);
      });

      it('turns each label along its own radius', () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);

        // A's mid-angle is 60°, so the baseline runs at 60 − 90 = −30° ⇒ 330°.
        expect(placementOf(labelByBar(g, 'A')).rotate).toBeCloseTo(330, 5);
      });

      it('flips the left hemisphere so no label reads upside down', () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);

        // B (mid 180°) and C (mid 300°) both sit at or past the hemisphere boundary, so each
        // takes a further 180°: 90 + 180 = 270, and 210 + 180 = 390 ⇒ 30.
        expect(placementOf(labelByBar(g, 'B')).rotate).toBeCloseTo(270, 5);
        expect(placementOf(labelByBar(g, 'C')).rotate).toBeCloseTo(30, 5);
      });

      it('normalises an arbitrary startAngle before the hemisphere test', () => {
        // Same geometry one full turn along: raw degrees run 360–720, which would put every
        // label on the "right" side of an un-normalised comparison.
        const { context, g } = createContext(BARS, {
          endAngle: 4 * Math.PI,
          showLabels: true,
          startAngle: 2 * Math.PI,
        });

        renderRadialBarLayer(context);

        expect(placementOf(labelByBar(g, 'A')).rotate).toBeCloseTo(330, 5);
        expect(placementOf(labelByBar(g, 'C')).rotate).toBeCloseTo(30, 5);
      });
    });

    describe('placement (outside — a horizontal ring past the perimeter)', () => {
      it('seats every label on one ring, whatever its bar is worth', () => {
        // Default gutter 48 shrinks the outer radius to 52; the ring sits one elbow past it.
        const { context, g } = createContext(BARS, {
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);

        for (const label of ['A', 'B', 'C']) {
          const { x, y } = placementOf(labelByBar(g, label));
          expect(Math.hypot(x, y)).toBeCloseTo(64, 5);
        }
      });

      it('leaves the text horizontal', () => {
        const { context, g } = createContext(BARS, {
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);

        expect(placementOf(labelByBar(g, 'A')).rotate).toBeCloseTo(0, 5);
      });

      it('anchors the text away from the chart, centering it at dead top / bottom', () => {
        const { context, g } = createContext(BARS, {
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);

        expect(labelByBar(g, 'A').getAttribute('text-anchor')).toBe('start');
        expect(labelByBar(g, 'C').getAttribute('text-anchor')).toBe('end');
        // B's mid-angle is exactly 180° — 6 o'clock, with no horizontal direction to lean.
        expect(labelByBar(g, 'B').getAttribute('text-anchor')).toBe('middle');
      });

      it('shrinks the outer radius by the label gutter so the ring stays inside the plot', async () => {
        const { context, g } = createContext(BARS, {
          labelGutter: 20,
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);
        await settle();

        // C is the max value, so its bar reaches the (now reduced) outer radius.
        expect(arcRadii(barByLabel(g, 'C').getAttribute('d') ?? '').outer).toBeCloseTo(80, 0);

        const { x, y } = placementOf(labelByBar(g, 'C'));
        expect(Math.hypot(x, y)).toBeCloseTo(92, 5);
      });

      it('reserves the gutter from labelPosition alone, so toggling labels never resizes', async () => {
        const { context, g } = createContext(BARS, {
          labelGutter: 20,
          labelPosition: 'outside',
        });

        renderRadialBarLayer(context);
        await settle();

        expect(labels(g)).toHaveLength(0);
        expect(arcRadii(barByLabel(g, 'C').getAttribute('d') ?? '').outer).toBeCloseTo(80, 0);
      });
    });

    describe('suppression', () => {
      it('drops bars narrower than minLabelAngle', () => {
        // wedge: 'value' makes the sweeps proportional — A 1.885, B 1.257, C 3.142 rad.
        const { context, g } = createContext(BARS, {
          minLabelAngle: 1.5,
          showLabels: true,
          wedge: 'value',
        });

        renderRadialBarLayer(context);

        expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['A', 'C']);
      });

      it('never labels a zero-sweep bar, even with the thresholds turned off', () => {
        const data: NgeRadialBarDataPoint[] = [
          { label: 'Zero', value: 0 },
          { label: 'All', value: 50 },
        ];
        const { context, g } = createContext(data, {
          minLabelAngle: 0,
          minLabelSize: 0,
          showLabels: true,
          wedge: 'value',
        });

        renderRadialBarLayer(context);

        expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['All']);
      });

      it('drops a bar too short to seat text along its radius', () => {
        // innerRadius 0.8 → bars run [80, 100]. "Thin" is only 0.4px long, well under the
        // 12px default, while its arc (≈168px at r≈80) sails past the same threshold — so
        // the radial half of the rule is doing the work on its own.
        const data: NgeRadialBarDataPoint[] = [
          { label: 'Tall', value: 50 },
          { label: 'Also', value: 50 },
          { label: 'Thin', value: 1 },
        ];
        const { context, g } = createContext(data, { innerRadius: 0.8, showLabels: true });

        renderRadialBarLayer(context);

        expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['Tall', 'Also']);
      });

      it('keeps that same thin bar once the label moves off the mark', () => {
        const data: NgeRadialBarDataPoint[] = [
          { label: 'Tall', value: 50 },
          { label: 'Also', value: 50 },
          { label: 'Thin', value: 1 },
        ];
        const { context, g } = createContext(data, {
          innerRadius: 0.8,
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);

        expect(labels(g).map(node => node.getAttribute('data-label'))).toContain('Thin');
      });

      it('drops a bar with too little arc even when its radius is generous', () => {
        // Twelve equal slots (0.524 rad each). The short bars clear the radial half of the
        // rule exactly (20px extent vs a 20px threshold) but hold only ≈5px of arc at their
        // mid-radius, so only the full-height bar keeps its label.
        const data: NgeRadialBarDataPoint[] = Array.from({ length: 12 }, (_, index) => ({
          label: `c${index}`,
          value: index === 0 ? 50 : 10,
        }));
        const { context, g } = createContext(data, { minLabelSize: 20, showLabels: true });

        renderRadialBarLayer(context);

        expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['c0']);
      });

      it('exits a label whose bar shrinks past the threshold and re-enters it when it grows back', async () => {
        const full: NgeRadialBarDataPoint[] = [
          { label: 'Tall', value: 50 },
          { label: 'Also', value: 50 },
          { label: 'Swing', value: 50 },
        ];
        const { context, g } = createContext(full, { innerRadius: 0.8, showLabels: true });

        renderRadialBarLayer(context);
        await settle();
        expect(labels(g)).toHaveLength(3);

        const shrunk = [full[0], full[1], { label: 'Swing', value: 1 }];
        context.config.data = shrunk;
        context.data = shrunk;
        renderRadialBarLayer(context);
        await settle();
        expect(labels(g).map(node => node.getAttribute('data-label'))).toEqual(['Tall', 'Also']);

        context.config.data = full;
        context.data = full;
        renderRadialBarLayer(context);
        await settle();
        expect(labels(g)).toHaveLength(3);
      });
    });

    describe('text', () => {
      it('defaults to the bar label', () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);

        expect(labelByBar(g, 'A').textContent).toBe('A');
      });

      it('passes the bar datum to formatLabel', () => {
        const { context, g } = createContext(BARS, {
          formatLabel: d => `${d.label}: ${d.value}`,
          showLabels: true,
        });

        renderRadialBarLayer(context);

        expect(labelByBar(g, 'C').textContent).toBe('C: 50');
      });

      it('re-runs formatLabel on already-rendered labels', async () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);
        await settle();
        expect(labelByBar(g, 'A').textContent).toBe('A');

        context.config.formatLabel = d => String(d.value);
        renderRadialBarLayer(context);

        expect(labelByBar(g, 'A').textContent).toBe('30');
      });
    });

    describe('join contract', () => {
      it('keeps the same element for an unchanged bar', async () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);
        await settle();
        const before = labelByBar(g, 'A');

        const changed: NgeRadialBarDataPoint[] = [
          { label: 'A', value: 30 },
          { label: 'B', value: 45 },
          { label: 'C', value: 50 },
        ];
        context.config.data = changed;
        context.data = changed;
        renderRadialBarLayer(context);
        await settle();

        expect(labelByBar(g, 'A')).toBe(before);
      });

      it('restores full opacity on a survivor whose fade was interrupted', () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);
        // Re-render immediately — mid-fade for every entering label.
        renderRadialBarLayer(context);
        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'A'), 'opacity')).toBe('1');
      });

      it('exits every label when showLabels is switched off', async () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);
        await settle();
        expect(labels(g)).toHaveLength(3);

        context.config.showLabels = false;
        renderRadialBarLayer(context);
        await settle();

        expect(labels(g)).toHaveLength(0);
      });
    });

    describe('colour + typography', () => {
      it('flips to the light colour on a perceptually dark bar fill', () => {
        const data: NgeRadialBarDataPoint[] = [{ color: '#000080', label: 'Navy', value: 10 }];
        const { context, g } = createContext(data, { showLabels: true });

        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'Navy'), 'fill')).toBe('var(--nge-chart-white, #ffffff)');
      });

      it('keeps the dark colour on a light bar fill', () => {
        const data: NgeRadialBarDataPoint[] = [{ color: '#ffff00', label: 'Yellow', value: 10 }];
        const { context, g } = createContext(data, { showLabels: true });

        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'Yellow'), 'fill')).toBe('var(--nge-chart-black, #000000)');
      });

      it('lets a per-datum labelColor beat the derived contrast', () => {
        const data: NgeRadialBarDataPoint[] = [
          { color: '#000080', label: 'Navy', labelColor: '#ff00ff', value: 10 },
        ];
        const { context, g } = createContext(data, { showLabels: true });

        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'Navy'), 'fill')).toBe('#ff00ff');
      });

      it('lets a layer-config labelColor pin one flat colour across every bar', () => {
        const { context, g } = createContext(BARS, { labelColor: '#123456', showLabels: true });

        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'A'), 'fill')).toBe('#123456');
        expect(styleOf(labelByBar(g, 'C'), 'fill')).toBe('#123456');
      });

      it('reads on-bar typography from the label slice', () => {
        const { context, g } = createContext(BARS, {
          showLabels: true,
          theme: { label: { fontSize: 18, fontWeight: 700 } },
        });

        renderRadialBarLayer(context);

        const label = labelByBar(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('18px');
        expect(styleOf(label, 'font-weight')).toBe('700');
      });

      it('never derives an OUTSIDE label from the fill it is not drawn on (ARCH-267)', () => {
        // The regression the funnel shipped: an outside label that reuses the in-mark slice
        // falls through to the ABSOLUTE black and vanishes on a dark surface. Neither a dark
        // nor a light bar may move it off the surface-tracking token.
        const data: NgeRadialBarDataPoint[] = [
          { color: '#000080', label: 'Navy', value: 10 },
          { color: '#ffff00', label: 'Yellow', value: 10 },
        ];
        const { context, g } = createContext(data, {
          labelPosition: 'outside',
          showLabels: true,
        });

        renderRadialBarLayer(context);

        expect(styleOf(labelByBar(g, 'Navy'), 'fill')).toBe('var(--nge-chart-on-surface)');
        expect(styleOf(labelByBar(g, 'Yellow'), 'fill')).toBe('var(--nge-chart-on-surface)');
      });

      it('reads outside typography from labelOutside, not from label', () => {
        const { context, g } = createContext(BARS, {
          labelPosition: 'outside',
          showLabels: true,
          theme: { label: { fontSize: 18 }, labelOutside: { fontSize: 24, fontWeight: 400 } },
        });

        renderRadialBarLayer(context);

        const label = labelByBar(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('24px');
        expect(styleOf(label, 'font-weight')).toBe('400');
      });

      it('applies a runtime theme change to already-rendered labels', async () => {
        const { context, g } = createContext(BARS, { showLabels: true });

        renderRadialBarLayer(context);
        await settle();

        context.theme = { label: { color: '#0f0f0f', colorOnDark: '#f0f0f0', fontSize: 22 } };
        renderRadialBarLayer(context);

        const label = labelByBar(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('22px');
        // The palette fill (`var(--nge-chart-primary)`) is unmeasurable in jsdom beyond its
        // token fallback (#1976d2, dark) → the new dark-fill endpoint.
        expect(styleOf(label, 'fill')).toBe('#f0f0f0');
      });
    });
  });
});
