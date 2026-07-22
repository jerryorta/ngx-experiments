import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeRadarDataPoint, NgeRadarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeRadarLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderRadarLayer } from './render-radar-layer';

type RadarContext = NgeChartLayerContext<
  NgeRadarDataPoint,
  NgeRadarLayerConfig,
  NgeRadarLayerTheme | undefined
>;

interface ContextOptions {
  endAngle?: number;
  fillOpacity?: number;
  innerRadius?: number;
  levels?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  render?: NgeRadarLayerConfig['render'];
  seriesColors?: string[];
  startAngle?: number;
  theme?: NgeRadarLayerTheme;
  tooltip?: boolean;
}

// Square bounds → cx = cy = 100, outerRadius = 100.
const DIMENSIONS = {
  boundedHeight: 200,
  boundedWidth: 200,
  height: 220,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 220,
};

/**
 * Single-series radar over 5 dimensions (A..E). Values map 1:1 to vertex radii under the
 * default innerRadius 0 (domainMax 100, outerRadius 100 → radialScale(v) = v): B (100) is the
 * max and reaches the outer radius; A (10) the smallest.
 */
const RADAR: NgeRadarDataPoint[] = [
  { label: 'A', value: 10 },
  { label: 'B', value: 100 },
  { label: 'C', value: 55 },
  { label: 'D', value: 30 },
  { label: 'E', value: 80 },
];

/** Two series sharing 3 dimensions — drives the join / palette / interaction assertions. */
const MULTI: NgeRadarDataPoint[] = [
  { label: 'A', seriesId: 's1', value: 30 },
  { label: 'B', seriesId: 's1', value: 20 },
  { label: 'C', seriesId: 's1', value: 50 },
  { label: 'A', seriesId: 's2', value: 10 },
  { label: 'B', seriesId: 's2', value: 40 },
  { label: 'C', seriesId: 's2', value: 25 },
];

function createContext(
  data: NgeRadarDataPoint[],
  options: ContextOptions = {}
): { context: RadarContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeRadarLayerConfig = {
    data,
    endAngle: options.endAngle,
    fillOpacity: options.fillOpacity,
    innerRadius: options.innerRadius,
    levels: options.levels,
    onClick: options.onClick,
    render: options.render,
    renderer: renderRadarLayer,
    seriesColors: options.seriesColors,
    startAngle: options.startAngle,
    type: 'radar',
  };

  // Radar ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: RadarContext = {
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
          formatContent: (d: NgeRadarDataPoint) => ({ label: d.label, value: d.value }),
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

/**
 * The distance-from-origin of every coordinate pair in a d3 radial path `d`. A `lineRadial`
 * closed polygon emits exactly its N vertices, each at `(r·sinθ, -r·cosθ)`, so `hypot(x, y)`
 * recovers the vertex radius = `radialScale(value)`.
 */
function pathRadii(d: string): number[] {
  return Array.from(d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)).map(match =>
    Math.hypot(Number(match[1]), Number(match[2]))
  );
}

/**
 * Recover each spoke's angle (radians) from its `.nge-radar-axis` line tip. The impl
 * projects a spoke tip as `x = r·sin(angle)`, `y = -r·cos(angle)`, so `atan2(x, -y)` inverts
 * it back to the angle. Spokes are in dimension order (A, B, …).
 */
function spokeAngles(g: SVGGElement): number[] {
  return Array.from(g.querySelectorAll<SVGLineElement>('.nge-radar-axis')).map(line =>
    Math.atan2(Number(line.getAttribute('x2')), -Number(line.getAttribute('y2')))
  );
}

/** The `.nge-radar-line` outline path bound to a specific series id. */
function seriesLine(g: SVGGElement, seriesId: string): SVGPathElement {
  const path = g.querySelector<SVGPathElement>(
    `.nge-radar-series[data-series-id="${seriesId}"] .nge-radar-line`
  );
  if (!path) {
    throw new Error(`No radar line for series "${seriesId}"`);
  }
  return path;
}

/**
 * Real-timer wait so d3 exit/update transitions run to completion. Series shape `d` is applied
 * synchronously, but a removed series' group is only detached after the exit duration (200ms).
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderRadarLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty (does not throw)', () => {
      const { context, g } = createContext([]);

      expect(() => renderRadarLayer(context)).not.toThrow();
      expect(g.querySelectorAll('.nge-radar-series')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(0);
    });

    it('sweeps stale marks when data becomes empty', async () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(5);

      context.config.data = [];
      context.data = [];
      renderRadarLayer(context);
      await settle();

      expect(g.querySelectorAll('.nge-radar-series')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-radar-grid')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-radar-axis-label')).toHaveLength(0);
    });
  });

  describe('structure', () => {
    it('centers the container in the bounded area', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      expect(g.querySelector('.nge-radar-container')?.getAttribute('transform')).toBe(
        'translate(100,100)'
      );
    });

    it('draws one spoke + one category label per unique dimension label', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(5);
      const labels = Array.from(g.querySelectorAll('.nge-radar-axis-label')).map(
        node => node.textContent
      );
      expect(labels).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('collapses duplicate labels (multi-series) to N spokes for N unique labels', () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);

      // 3 unique labels across 2 series → 3 spokes (not 6).
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(3);
    });

    it('re-renders idempotently (keyed by series id / label)', () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);
      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-series')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(3);
    });
  });

  describe('partial angular sweep (startAngle / endAngle)', () => {
    it('lays the spokes evenly across the configured sweep with axis 0 at startAngle', () => {
      const { context, g } = createContext(RADAR, { endAngle: Math.PI, startAngle: 0 });

      renderRadarLayer(context);

      // Axis 0 (first dimension) points at startAngle 0 → straight up: tip at (0, -outerRadius).
      const first = g.querySelector<SVGLineElement>('.nge-radar-axis')!;
      expect(Number(first.getAttribute('x2'))).toBeCloseTo(0, 6);
      expect(Number(first.getAttribute('y2'))).toBeCloseTo(-100, 6);

      // 5 dimensions over the [0, π] semicircle → evenly spaced by π/5; no spoke exceeds endAngle.
      const angles = spokeAngles(g);
      expect(angles).toHaveLength(5);
      angles.forEach((angle, i) => expect(angle).toBeCloseTo((i * Math.PI) / 5, 6));
      expect(Math.max(...angles)).toBeLessThanOrEqual(Math.PI + 1e-9);
    });
  });

  describe('grid rings (value web)', () => {
    it('draws a ring at each radial-scale tick by default', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      // domain [0,100] → ticks 20/40/60/80/100 (0 filtered out) → 5 rings.
      expect(g.querySelectorAll('.nge-radar-grid')).toHaveLength(5);
    });

    it('honors the config levels count', () => {
      const { context, g } = createContext(RADAR, { levels: 4 });

      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-grid')).toHaveLength(4);
    });
  });

  describe('radial geometry (value → radius via radialScale)', () => {
    it('maps each vertex radius to radialScale(value): higher value → larger radius', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      // innerRadius 0, domainMax 100, outerRadius 100 → radialScale(v) = v. The 5 outline
      // vertices sit at exactly their values' radii.
      const radii = pathRadii(seriesLine(g, '__default__').getAttribute('d') ?? '').map(r =>
        Math.round(r)
      );
      expect(radii).toHaveLength(5);
      expect(radii.slice().sort((a, b) => a - b)).toEqual([10, 30, 55, 80, 100]);
      // The max value (B, 100) reaches the outer radius; the min (A, 10) the smallest radius.
      expect(Math.max(...radii)).toBeCloseTo(100, 0);
      expect(Math.min(...radii)).toBeCloseTo(10, 0);
    });

    it('carves an inner hole sized to innerRadius (ratio of the outer radius)', () => {
      const { context, g } = createContext(RADAR, { innerRadius: 0.5 });

      renderRadarLayer(context);

      // innerRadius 0.5 → range [50, 100]. Every vertex radius ≥ 50; max value → 100.
      const radii = pathRadii(seriesLine(g, '__default__').getAttribute('d') ?? '');
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(50 - 1e-6);
      // radialScale(10) = 50 + (10/100)·50 = 55; radialScale(100) = 100.
      expect(Math.min(...radii)).toBeCloseTo(55, 0);
      expect(Math.max(...radii)).toBeCloseTo(100, 0);
    });

    it('keeps the outline NaN-free when a vertex is negative / NaN (clamped to 0)', () => {
      const data: NgeRadarDataPoint[] = [
        { label: 'A', value: 30 },
        { label: 'B', value: -10 },
        { label: 'C', value: NaN },
        { label: 'D', value: 50 },
      ];
      const { context, g } = createContext(data);

      renderRadarLayer(context);

      const line = seriesLine(g, '__default__').getAttribute('d') ?? '';
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toContain('NaN');
      // Vertices are in dimension order (A, B, C, D). domainMax = 50 (negatives / NaN → 0),
      // innerRadius 0 → radialScale(v) = 2v.
      const radii = pathRadii(line);
      // The negative (B) and NaN (C) vertices individually collapse to the innerRadius floor (0).
      expect(radii[1]).toBeCloseTo(0, 6);
      expect(radii[2]).toBeCloseTo(0, 6);
      // The valid mid vertex (A, 30 of 50) lands at its expected radius (60)...
      expect(radii[0]).toBeCloseTo(60, 0);
      // ...and the max valid vertex (D, 50) reaches the outer radius.
      expect(radii[3]).toBeCloseTo(100, 0);
    });

    it('renders all-zero data without throwing, NaN-free (domainMax falls back to 1)', () => {
      const data: NgeRadarDataPoint[] = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
        { label: 'C', value: 0 },
      ];
      const { context, g } = createContext(data);

      expect(() => renderRadarLayer(context)).not.toThrow();
      const line = seriesLine(g, '__default__').getAttribute('d') ?? '';
      expect(line).not.toContain('NaN');
    });
  });

  describe('render modes', () => {
    it('fills the polygon under the outline in area mode (default)', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      const area = g.querySelector('.nge-radar-area');
      const line = g.querySelector('.nge-radar-line');
      expect((area?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
      expect((line?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
      // Default fill opacity comes from theme.series.fillOpacity (0.3).
      expect(Number(styleOf(area as Element, 'fill-opacity'))).toBeCloseTo(0.3, 6);
    });

    it('strokes the outline only (no fill) in line mode', () => {
      const { context, g } = createContext(RADAR, { render: 'line' });

      renderRadarLayer(context);

      expect(g.querySelector('.nge-radar-area')).toBeNull();
      expect((g.querySelector('.nge-radar-line')?.getAttribute('d') ?? '').length).toBeGreaterThan(
        0
      );
    });

    it('drops the fill when the render mode toggles area → line at runtime', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);
      expect(g.querySelector('.nge-radar-area')).not.toBeNull();

      context.config.render = 'line';
      renderRadarLayer(context);

      expect(g.querySelector('.nge-radar-area')).toBeNull();
    });

    it('honors the config fillOpacity over the theme default (area mode)', () => {
      const { context, g } = createContext(RADAR, { fillOpacity: 0.6 });

      renderRadarLayer(context);

      expect(
        Number(styleOf(g.querySelector('.nge-radar-area') as Element, 'fill-opacity'))
      ).toBeCloseTo(0.6, 6);
    });
  });

  describe('multi-series', () => {
    it('draws one series group per seriesId', () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-series')).toHaveLength(2);
    });

    it('assigns each series a stable palette color by series order', () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);

      // Series order (s1 then s2) → palette[0], palette[1] — stable by series index.
      expect(styleOf(seriesLine(g, 's1'), 'stroke')).toBe('var(--chart-primary)');
      expect(styleOf(seriesLine(g, 's2'), 'stroke')).toBe('var(--chart-secondary)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(MULTI, { seriesColors: ['#111111', '#222222'] });

      renderRadarLayer(context);

      expect(styleOf(seriesLine(g, 's1'), 'stroke')).toBe('#111111');
      expect(styleOf(seriesLine(g, 's2'), 'stroke')).toBe('#222222');
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('exits a removed series on re-render', async () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);
      expect(g.querySelectorAll('.nge-radar-series')).toHaveLength(2);

      const reduced = MULTI.filter(point => point.seriesId === 's1');
      context.config.data = reduced;
      context.data = reduced;
      renderRadarLayer(context);
      await settle();

      const remaining = Array.from(g.querySelectorAll('.nge-radar-series')).map(node =>
        node.getAttribute('data-series-id')
      );
      expect(remaining).toEqual(['s1']);
    });

    it('updates a series in place (same id keeps the same element) and re-scales its vertices', () => {
      const { context, g } = createContext(MULTI);

      renderRadarLayer(context);
      const before = g.querySelector('.nge-radar-series[data-series-id="s1"]');
      const beforeRadii = pathRadii(seriesLine(g, 's1').getAttribute('d') ?? '');

      const changed: NgeRadarDataPoint[] = [
        { label: 'A', seriesId: 's1', value: 90 },
        { label: 'B', seriesId: 's1', value: 20 },
        { label: 'C', seriesId: 's1', value: 50 },
        ...MULTI.filter(point => point.seriesId === 's2'),
      ];
      context.config.data = changed;
      context.data = changed;
      renderRadarLayer(context);

      // Same DOM node reused (keyed by series id).
      expect(g.querySelector('.nge-radar-series[data-series-id="s1"]')).toBe(before);
      // Geometry re-scaled in place: dimension A (first vertex in axis order) grew 30 → 90 —
      // now the overall max — so its radius pushes out from 60 to the outer radius (100).
      const afterRadii = pathRadii(seriesLine(g, 's1').getAttribute('d') ?? '');
      expect(afterRadii[0]).toBeGreaterThan(beforeRadii[0]);
      expect(afterRadii[0]).toBeCloseTo(100, 0);
    });

    it('adds a spoke when a new dimension appears', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);
      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(5);

      const extended = [...RADAR, { label: 'F', value: 45 }];
      context.config.data = extended;
      context.data = extended;
      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-axis')).toHaveLength(6);
    });
  });

  describe('interaction', () => {
    it('builds no interaction targets when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-point')).toHaveLength(0);
    });

    it('renders an invisible hover/click target per vertex when interactive', () => {
      const { context, g } = createContext(RADAR, { tooltip: true });

      renderRadarLayer(context);

      // One `.nge-radar-point` per dimension vertex (single series → 5).
      expect(g.querySelectorAll('.nge-radar-point')).toHaveLength(5);
      expect(styleOf(g.querySelector('.nge-radar-point') as Element, 'fill')).toBe('transparent');
    });

    it('routes a hovered vertex to the tooltip with its datum', () => {
      const { context, g, onTooltip } = createContext(RADAR, { tooltip: true });

      renderRadarLayer(context);
      // Vertices are joined in dimension order (A..E) → index 1 is dimension B.
      const points = g.querySelectorAll<SVGCircleElement>('.nge-radar-point');
      points[1].dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('B');
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(RADAR, { tooltip: true });

      renderRadarLayer(context);
      const point = g.querySelector<SVGCircleElement>('.nge-radar-point')!;
      point.dispatchEvent(new MouseEvent('mouseenter'));
      point.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the vertex datum and its within-series index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(MULTI, { onClick });

      renderRadarLayer(context);

      // s2's 2nd vertex is config.data index 4, but the click index is the WITHIN-series
      // position (`series.points.indexOf(v)`) → 1.
      const s2Points = g
        .querySelector('.nge-radar-series[data-series-id="s2"]')!
        .querySelectorAll<SVGCircleElement>('.nge-radar-point');
      s2Points[1].dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(MULTI[4]);
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });
  });

  describe('vertex dots', () => {
    it('draws a visible vertex dot per data point (theme pointRadius > 0)', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      // Single series, 5 dimensions → 5 dots, colored with the series color.
      expect(g.querySelectorAll('.nge-radar-vertex')).toHaveLength(5);
      expect(styleOf(g.querySelector('.nge-radar-vertex') as Element, 'fill')).toBe(
        'var(--chart-primary)'
      );
    });

    it('hides the vertex dots when the theme pointRadius is 0', () => {
      const { context, g } = createContext(RADAR, { theme: { series: { pointRadius: 0 } } });

      renderRadarLayer(context);

      expect(g.querySelectorAll('.nge-radar-vertex')).toHaveLength(0);
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors a single series with the first palette entry', () => {
      const { context, g } = createContext(RADAR);

      renderRadarLayer(context);

      expect(styleOf(seriesLine(g, '__default__'), 'stroke')).toBe('var(--chart-primary)');
    });
  });
});
