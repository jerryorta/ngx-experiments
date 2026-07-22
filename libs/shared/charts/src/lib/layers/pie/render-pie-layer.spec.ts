import type { PieArcDatum } from 'd3-shape';

import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgePieDataPoint, NgePieLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgePieLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderPieLayer } from './render-pie-layer';

type PieContext = NgeChartLayerContext<
  NgePieDataPoint,
  NgePieLayerConfig,
  NgePieLayerTheme | undefined
>;

interface ContextOptions {
  endAngle?: number;
  innerRadius?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  seriesColors?: string[];
  startAngle?: number;
  theme?: NgePieLayerTheme;
  tooltip?: boolean;
}

// Square bounds → cx = cy = 100, outerRadius = 100 (matches the arc radii asserted below).
const DIMENSIONS = {
  boundedHeight: 200,
  boundedWidth: 200,
  height: 220,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 220,
};

/** Three slices summing to 100 (input order A, B, C — preserved by sort(null)). */
const PIE: NgePieDataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 20 },
  { label: 'C', value: 50 },
];

function createContext(
  data: NgePieDataPoint[],
  options: ContextOptions = {}
): { context: PieContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgePieLayerConfig = {
    data,
    endAngle: options.endAngle,
    innerRadius: options.innerRadius,
    onClick: options.onClick,
    padAngle: options.padAngle,
    renderer: renderPieLayer,
    seriesColors: options.seriesColors,
    startAngle: options.startAngle,
    type: 'pie',
  };

  // Pie ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: PieContext = {
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
          formatContent: (d: NgePieDataPoint) => ({ label: d.label, value: d.value }),
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

/** The arc datum d3 bound to a slice node. */
function datumOf(node: Element): PieArcDatum<NgePieDataPoint> {
  return (node as unknown as { __data__: PieArcDatum<NgePieDataPoint> }).__data__;
}

/** The `.nge-pie-slice` path bound to a specific slice label. */
function sliceByLabel(g: SVGGElement, label: string): SVGPathElement {
  const match = Array.from(g.querySelectorAll<SVGPathElement>('.nge-pie-slice')).find(
    node => datumOf(node).data.label === label
  );
  if (!match) {
    throw new Error(`No pie slice for label "${label}"`);
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. The `d` attribute is applied via
 * an `attrTween` (never synchronously), so the arc path string is only observable after
 * a real delay past the enter duration (300ms). Fills / handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderPieLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderPieLayer(context);

      expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(0);
    });
  });

  describe('structure', () => {
    it('renders one slice path per datum', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);

      expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(3);
    });

    it('centers the slice container in the bounded area', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);

      const container = g.querySelector('.nge-pie-container');
      expect(container?.getAttribute('transform')).toBe('translate(100,100)');
    });

    it('re-renders idempotently (keyed by label)', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);
      renderPieLayer(context);

      expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(3);
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('exits a removed slice on re-render', async () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);
      expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(3);

      // Drop 'C' and re-render into the same bounds.
      const reduced = PIE.slice(0, 2);
      context.config.data = reduced;
      context.data = reduced;
      renderPieLayer(context);
      await settle();

      const remaining = Array.from(g.querySelectorAll('.nge-pie-slice')).map(
        node => datumOf(node).data.label
      );
      expect(remaining).toEqual(['A', 'B']);
    });

    it('morphs a slice arc when its value changes (update)', async () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);
      await settle();
      const before = sliceByLabel(g, 'A').getAttribute('d');

      // Shrink A: the total (and thus every slice's angles) shifts, so A's arc changes.
      const changed: NgePieDataPoint[] = [
        { label: 'A', value: 5 },
        { label: 'B', value: 20 },
        { label: 'C', value: 50 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderPieLayer(context);
      await settle();

      expect(sliceByLabel(g, 'A').getAttribute('d')).not.toBe(before);
    });
  });

  describe('value + padAngle handling', () => {
    it('clamps a negative value to a valid zero-sweep arc (no NaN)', async () => {
      const data: NgePieDataPoint[] = [
        { label: 'A', value: -10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 30 },
      ];
      const { context, g } = createContext(data);

      renderPieLayer(context);
      await settle();

      const slice = sliceByLabel(g, 'A');
      expect(slice.getAttribute('d') ?? '').not.toContain('NaN');
      // value -10 → Math.max(0, -10) = 0 → a zero-sweep arc (start == end angle).
      const arcA = datumOf(slice);
      expect(arcA.endAngle).toBeCloseTo(arcA.startAngle, 6);
    });

    it('stamps the configured padAngle onto every slice (visual separation)', () => {
      const { context, g } = createContext(PIE, { padAngle: 0.05 });

      renderPieLayer(context);

      const arcs = Array.from(g.querySelectorAll('.nge-pie-slice')).map(datumOf);
      expect(arcs.every(a => Math.abs(a.padAngle - 0.05) < 1e-9)).toBe(true);
    });
  });

  describe('donut vs pie geometry (innerRadius)', () => {
    it('draws a full pie (wedge to center) when innerRadius is 0', async () => {
      const { context, g } = createContext(PIE, { innerRadius: 0 });

      renderPieLayer(context);
      await settle();

      // A zero-inner-radius wedge closes through the center point (0,0).
      expect(sliceByLabel(g, 'A').getAttribute('d')).toContain('L0,0');
    });

    it('carves a center hole (no line to center) when innerRadius > 0 (donut)', async () => {
      const { context, g } = createContext(PIE, { innerRadius: 0.6 });

      renderPieLayer(context);
      await settle();

      const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
      // An annular sector never returns to the center — it has an inner arc instead.
      expect(d).not.toContain('L0,0');
      expect(d.match(/A/g)?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('semi-circle (startAngle / endAngle)', () => {
    it('spans exactly the configured angular sweep', () => {
      const { context, g } = createContext(PIE, {
        endAngle: Math.PI / 2,
        startAngle: -Math.PI / 2,
      });

      renderPieLayer(context);

      const arcs = Array.from(g.querySelectorAll('.nge-pie-slice')).map(datumOf);
      const minStart = Math.min(...arcs.map(a => a.startAngle));
      const maxEnd = Math.max(...arcs.map(a => a.endAngle));
      expect(minStart).toBeCloseTo(-Math.PI / 2, 6);
      expect(maxEnd).toBeCloseTo(Math.PI / 2, 6);
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors slices from the theme palette by input index', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'A'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(sliceByLabel(g, 'B'), 'fill')).toBe('var(--chart-secondary)');
      expect(styleOf(sliceByLabel(g, 'C'), 'fill')).toBe('var(--chart-tertiary)');
    });

    it('honors a per-slice color override above the palette', () => {
      const data: NgePieDataPoint[] = [
        { label: 'A', value: 30 },
        { color: 'var(--override)', label: 'B', value: 20 },
      ];
      const { context, g } = createContext(data);

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'B'), 'fill')).toBe('var(--override)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(PIE, {
        seriesColors: ['#111111', '#222222', '#333333'],
      });

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(sliceByLabel(g, 'B'), 'fill')).toBe('#222222');
    });
  });

  describe('interaction', () => {
    it('leaves slices non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered slice to the tooltip with its datum', () => {
      const { context, g, onTooltip } = createContext(PIE, { tooltip: true });

      renderPieLayer(context);
      sliceByLabel(g, 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('B');
      expect(event.content.value).toBe(20);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(PIE, { tooltip: true });

      renderPieLayer(context);
      const slice = sliceByLabel(g, 'A');
      slice.dispatchEvent(new MouseEvent('mouseenter'));
      slice.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its input index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(PIE, { onClick });

      renderPieLayer(context);
      sliceByLabel(g, 'C').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(PIE[2]);
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });
  });
});
