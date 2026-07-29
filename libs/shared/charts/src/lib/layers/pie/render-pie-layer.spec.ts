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
  /** Override the square 200×200 fixture — outside-label columns need real height. */
  dimensions?: typeof DIMENSIONS;
  endAngle?: number;
  formatLabel?: (d: NgePieDataPoint) => string;
  highlightedLabels?: string[];
  innerRadius?: number;
  labelColor?: string;
  labelGutter?: number;
  labelLayout?: 'columns' | 'perimeter';
  labelLineHeight?: number;
  labelOffset?: number;
  labelPosition?: 'inside' | 'outside';
  leaderElbowOffset?: number;
  leaderLines?: 'all' | 'displaced' | 'none';
  minLabelAngle?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  radiusRatio?: number;
  seriesColors?: string[];
  showLabels?: boolean;
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
    formatLabel: options.formatLabel,
    highlightedLabels: options.highlightedLabels,
    innerRadius: options.innerRadius,
    labelColor: options.labelColor,
    labelGutter: options.labelGutter,
    labelLayout: options.labelLayout,
    labelLineHeight: options.labelLineHeight,
    labelOffset: options.labelOffset,
    labelPosition: options.labelPosition,
    leaderElbowOffset: options.leaderElbowOffset,
    leaderLines: options.leaderLines,
    minLabelAngle: options.minLabelAngle,
    onClick: options.onClick,
    padAngle: options.padAngle,
    radiusRatio: options.radiusRatio,
    renderer: renderPieLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
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
    dimensions: options.dimensions ?? DIMENSIONS,
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

/** The `.nge-pie-label` <text> drawn for a specific slice label. */
function labelByLabel(g: SVGGElement, label: string): SVGTextElement {
  const match = g.querySelector<SVGTextElement>(`.nge-pie-label[data-label="${label}"]`);
  if (!match) {
    throw new Error(`No pie label for slice "${label}"`);
  }
  return match;
}

/** Every slice label that currently has a `<text>` mark, in DOM order. */
function labelledSlices(g: SVGGElement): string[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-pie-label')).map(
    node => node.getAttribute('data-label') ?? ''
  );
}

/**
 * The arc centroid d3 places a slice's label at, computed independently of the renderer:
 * the mid-angle point on the ring midline. Radii come from the 200×200 fixture
 * (outerRadius 100), so `innerRadiusRatio` is the config's ratio, not pixels.
 */
function expectedCentroid(
  startAngle: number,
  endAngle: number,
  innerRadiusRatio = 0
): { x: number; y: number } {
  const r = (innerRadiusRatio * 100 + 100) / 2;
  const a = (startAngle + endAngle) / 2 - Math.PI / 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
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

  describe('radiusRatio', () => {
    // Pinned to 'columns' because a column's fixed x IS the measurement: every label shares
    // one |x|, so the number reads straight off the radius. The default 'perimeter' ring
    // spreads x by slice, and is covered by the sibling below.
    it('shrinks the pie without moving the labels off it', () => {
      const full = createContext(PIE, {
        labelGutter: 40,
        labelLayout: 'columns',
        labelPosition: 'outside',
        showLabels: true,
      });
      const small = createContext(PIE, {
        labelGutter: 40,
        labelLayout: 'columns',
        labelPosition: 'outside',
        radiusRatio: 0.5,
        showLabels: true,
      });

      renderPieLayer(full.context);
      renderPieLayer(small.context);

      // OUTER_R 60 at this gutter, so the label column sits at 60 + 12 + 4 = 76; halving the
      // radius puts it at 30 + 12 + 4 = 46. The labels track the arc (they stay `labelOffset`
      // off it) — the pie gets smaller, the composition does not distort.
      const columnX = (g: SVGGElement): number =>
        Math.abs(Number(labelByLabel(g, 'A').getAttribute('x')));
      expect(columnX(full.g)).toBeCloseTo(76, 6);
      expect(columnX(small.g)).toBeCloseTo(46, 6);
    });

    it('shrinks the label ring with the pie under the default perimeter layout', () => {
      const full = createContext(PIE, {
        labelGutter: 40,
        labelPosition: 'outside',
        showLabels: true,
      });
      const small = createContext(PIE, {
        labelGutter: 40,
        labelPosition: 'outside',
        radiusRatio: 0.5,
        showLabels: true,
      });

      renderPieLayer(full.context);
      renderPieLayer(small.context);

      // On the ring there is no single column x to read, so the radius is the measurement:
      // strip the 4px text gap back off and the anchor sits on the circle of `outerRadius +
      // labelOffset`. Halving the pie must halve the arc it hugs and leave the 12px offset
      // alone — which is the same "labels track the arc" claim as above, stated as a radius.
      const ringR = (g: SVGGElement): number => {
        const node = labelByLabel(g, 'A');
        const x = Math.abs(Number(node.getAttribute('x'))) - 4;
        return Math.hypot(x, Number(node.getAttribute('y')));
      };
      expect(ringR(full.g)).toBeCloseTo(72, 6);
      expect(ringR(small.g)).toBeCloseTo(42, 6);
    });

    it('scales the donut hole with it, so the shape is preserved', async () => {
      const { context, g } = createContext(PIE, { innerRadius: 0.6, radiusRatio: 0.5 });

      renderPieLayer(context);
      await settle();

      // `innerRadius` is a ratio OF the outer radius, so a shrunk donut is still a donut —
      // it must not close through the center the way a pie does.
      const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
      expect(d).not.toContain('L0,0');
      expect(d.match(/A/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('fills the plot when omitted — an existing pie is untouched', () => {
      const withOut = createContext(PIE, {});
      const explicit = createContext(PIE, { radiusRatio: 1 });

      renderPieLayer(withOut.context);
      renderPieLayer(explicit.context);

      expect(sliceByLabel(withOut.g, 'A').getAttribute('d')).toBe(
        sliceByLabel(explicit.g, 'A').getAttribute('d')
      );
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

      expect(styleOf(sliceByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(sliceByLabel(g, 'B'), 'fill')).toBe('var(--nge-chart-secondary)');
      expect(styleOf(sliceByLabel(g, 'C'), 'fill')).toBe('var(--nge-chart-tertiary)');
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

  // ARCH-284 — legend-driven emphasis. The pie holds no selection state of its own; the
  // caller supplies the set and the layer only decides how it renders.
  describe('highlightedLabels', () => {
    /** Every slice's `d`, keyed by label — the geometry fingerprint of a render. */
    function arcPaths(g: SVGGElement): Map<string, string> {
      return new Map(
        Array.from(g.querySelectorAll<SVGPathElement>('.nge-pie-slice')).map(node => [
          datumOf(node).data.label,
          node.getAttribute('d') ?? '',
        ])
      );
    }

    // THE load-bearing assertion of the feature. Filtering a slice out of the data re-runs
    // d3.pie() and regrows every survivor, so the wedge being compared against changes size
    // mid-comparison — the exact failure highlighting exists to avoid. If a future change
    // ever routes emphasis through the data instead of through opacity, this breaks first.
    it('leaves every arc byte-identical — emphasis is not filtering', () => {
      const none = createContext(PIE);
      const some = createContext(PIE, { highlightedLabels: ['B'] });

      renderPieLayer(none.context);
      renderPieLayer(some.context);

      expect(arcPaths(some.g)).toEqual(arcPaths(none.g));
    });

    it('dims only the slices it does not name', () => {
      const { context, g } = createContext(PIE, {
        highlightedLabels: ['B'],
        theme: { slice: { dimmedOpacity: 0.2, opacity: 1 } },
      });

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'B'), 'opacity')).toBe('1');
      expect(styleOf(sliceByLabel(g, 'A'), 'opacity')).toBe('0.2');
      expect(styleOf(sliceByLabel(g, 'C'), 'opacity')).toBe('0.2');
    });

    it('treats an empty set as NO selection, not as everything-deselected', () => {
      const omitted = createContext(PIE, { theme: { slice: { dimmedOpacity: 0.2 } } });
      const empty = createContext(PIE, {
        highlightedLabels: [],
        theme: { slice: { dimmedOpacity: 0.2 } },
      });

      renderPieLayer(omitted.context);
      renderPieLayer(empty.context);

      // Both render every slice at the normal opacity — a chart that clears its selection
      // must land back exactly where a chart that never had one sits.
      for (const label of ['A', 'B', 'C']) {
        expect(styleOf(sliceByLabel(empty.g, label), 'opacity')).toBe('1');
        expect(styleOf(sliceByLabel(omitted.g, label), 'opacity')).toBe('1');
      }
    });

    it('defaults the dim to 0.25 — receding, not vanishing', () => {
      const { context, g } = createContext(PIE, { highlightedLabels: ['A'] });

      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'B'), 'opacity')).toBe('0.25');
    });

    it('re-applies emphasis to already-rendered slices when the set changes', async () => {
      const { context, g } = createContext(PIE, {
        highlightedLabels: ['A'],
        theme: { slice: { dimmedOpacity: 0.2 } },
      });

      renderPieLayer(context);
      await settle();
      expect(styleOf(sliceByLabel(g, 'C'), 'opacity')).toBe('0.2');

      // The styles ride the MERGED selection, so a selection change reaches slices that
      // entered on an earlier render rather than only freshly-entered ones.
      context.config.highlightedLabels = ['C'];
      renderPieLayer(context);

      expect(styleOf(sliceByLabel(g, 'C'), 'opacity')).toBe('1');
      expect(styleOf(sliceByLabel(g, 'A'), 'opacity')).toBe('0.2');
    });

    it('ignores a label that matches no slice', () => {
      const { context, g } = createContext(PIE, {
        highlightedLabels: ['A', 'Nonexistent'],
        theme: { slice: { dimmedOpacity: 0.2 } },
      });

      renderPieLayer(context);

      // A stale selection (data changed under it) must not blank the chart — the slices it
      // does name still emphasise, and the unknown entry is simply inert.
      expect(styleOf(sliceByLabel(g, 'A'), 'opacity')).toBe('1');
      expect(styleOf(sliceByLabel(g, 'B'), 'opacity')).toBe('0.2');
    });
  });

  describe('labels', () => {
    it('renders no labels by default (opt-in — existing pies are unchanged)', () => {
      const { context, g } = createContext(PIE);

      renderPieLayer(context);

      expect(g.querySelectorAll('.nge-pie-label')).toHaveLength(0);
    });

    it('renders one label per slice with its own label text when showLabels is set', () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);

      expect(g.querySelectorAll('.nge-pie-label')).toHaveLength(3);
      expect(labelByLabel(g, 'B').textContent).toBe('B');
    });

    it('honors a custom formatLabel', () => {
      const { context, g } = createContext(PIE, {
        formatLabel: d => `${d.label}: ${d.value}%`,
        showLabels: true,
      });

      renderPieLayer(context);

      expect(labelByLabel(g, 'A').textContent).toBe('A: 30%');
    });

    it('anchors each label at its arc centroid', () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);

      const arcA = datumOf(sliceByLabel(g, 'A'));
      const expected = expectedCentroid(arcA.startAngle, arcA.endAngle);
      const label = labelByLabel(g, 'A');

      expect(Number(label.getAttribute('x'))).toBeCloseTo(expected.x, 6);
      expect(Number(label.getAttribute('y'))).toBeCloseTo(expected.y, 6);
      // Centered on the anchor point in both axes.
      expect(label.getAttribute('text-anchor')).toBe('middle');
      expect(label.getAttribute('dominant-baseline')).toBe('middle');
    });

    it('anchors donut labels on the ring midline (innerRadius shifts the centroid out)', () => {
      const { context, g } = createContext(PIE, { innerRadius: 0.6, showLabels: true });

      renderPieLayer(context);

      const arcA = datumOf(sliceByLabel(g, 'A'));
      // r = (60 + 100) / 2 = 80 px, vs 50 px for a full pie — the label rides the ring.
      const expected = expectedCentroid(arcA.startAngle, arcA.endAngle, 0.6);
      const label = labelByLabel(g, 'A');

      expect(Number(label.getAttribute('x'))).toBeCloseTo(expected.x, 6);
      expect(Number(label.getAttribute('y'))).toBeCloseTo(expected.y, 6);
    });

    it('lets hover fall through to the slice underneath (pointer-events: none)', () => {
      const { context, g } = createContext(PIE, { showLabels: true, tooltip: true });

      renderPieLayer(context);

      expect(styleOf(labelByLabel(g, 'A'), 'pointer-events')).toBe('none');
    });

    it('keeps a surviving slice its own label node across a data change', async () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);
      const labelA = labelByLabel(g, 'A');

      // Drop C, add D — A survives and must keep the SAME <text> node (keyed join).
      const changed: NgePieDataPoint[] = [
        { label: 'A', value: 30 },
        { label: 'B', value: 20 },
        { label: 'D', value: 40 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderPieLayer(context);
      await settle();

      expect(labelByLabel(g, 'A')).toBe(labelA);
      expect(labelledSlices(g).sort()).toEqual(['A', 'B', 'D']);
    });

    it('defaults to the absolute white + label-typography tokens (labels sit ON a slice, not the surface)', () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);

      const label = labelByLabel(g, 'A');
      // Each token carries its literal fallback so a host that never loaded
      // _nge-chart-tokens.scss still renders readable labels.
      expect(styleOf(label, 'fill')).toBe('var(--nge-chart-white, #ffffff)');
      expect(styleOf(label, 'font-size')).toBe('var(--nge-chart-label-font-size, 10px)');
      expect(styleOf(label, 'font-weight')).toBe('var(--nge-chart-label-font-weight, 600)');
    });

    it('applies theme.pie.label values to the text', () => {
      const { context, g } = createContext(PIE, {
        showLabels: true,
        // Both contrast endpoints are set to the same colour so this test isolates
        // typography + themeability from the on-fill contrast derivation, which picks
        // between `color` and `colorOnDark` (covered in its own describe below).
        theme: {
          label: { color: '#ff0000', colorOnDark: '#ff0000', fontSize: 18, fontWeight: 700 },
        },
      });

      renderPieLayer(context);

      const label = labelByLabel(g, 'A');
      expect(styleOf(label, 'fill')).toBe('#ff0000');
      // A numeric fontSize stays the ergonomic px form.
      expect(styleOf(label, 'font-size')).toBe('18px');
      expect(styleOf(label, 'font-weight')).toBe('700');
    });

    it('passes a string fontSize / fontWeight through to CSS verbatim (token references)', () => {
      const { context, g } = createContext(PIE, {
        showLabels: true,
        theme: {
          label: { fontSize: 'var(--brand-label-size, 1rem)', fontWeight: 'var(--brand-weight)' },
        },
      });

      renderPieLayer(context);

      const label = labelByLabel(g, 'A');
      expect(styleOf(label, 'font-size')).toBe('var(--brand-label-size, 1rem)');
      expect(styleOf(label, 'font-weight')).toBe('var(--brand-weight)');
    });

    it('re-applies a runtime theme change to already-rendered labels', () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);
      expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-white, #ffffff)');

      // Same context object, new theme — survivors must restyle, not keep what they entered with.
      // Slice 'A' takes the primary palette colour, which is perceptually dark, so the
      // derivation reads `colorOnDark` — that is the endpoint this restyle must pick up.
      context.theme = { label: { colorOnDark: '#00ff00' } };
      renderPieLayer(context);

      expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#00ff00');
    });

    describe('label colour resolution (ARCH-266)', () => {
      // A slice fill comes from the palette — a RANGE — so the four rungs are resolved
      // per slice. Under jsdom the default palette's `var()` entries resolve through the
      // shared token-fallback map, so 'A' (primary, #1976d2) is a DARK fill.
      const LIGHT = '#fff3c4';
      const DARK = '#101820';

      it('rung 1 — a per-datum labelColor wins over config, derivation and theme', () => {
        const { context, g } = createContext(
          [{ color: DARK, label: 'A', labelColor: '#ff0000', value: 30 }],
          {
            labelColor: '#00ff00',
            showLabels: true,
            theme: { label: { color: '#0000ff', colorOnDark: '#0000ff' } },
          }
        );

        renderPieLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#ff0000');
      });

      it('rung 2 — a layer-config labelColor forces one flat colour on every slice', () => {
        const { context, g } = createContext(
          [
            { color: DARK, label: 'A', value: 30 },
            { color: LIGHT, label: 'B', value: 30 },
          ],
          { labelColor: '#00ff00', showLabels: true }
        );

        renderPieLayer(context);

        // Both slices take the flat colour despite sitting on opposite-luminance fills.
        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#00ff00');
        expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#00ff00');
      });

      it('rung 3 — derives per slice from each slice OWN fill', () => {
        const { context, g } = createContext(
          [
            { color: DARK, label: 'A', value: 30 },
            { color: LIGHT, label: 'B', value: 30 },
          ],
          { showLabels: true, theme: { label: { color: '#000000', colorOnDark: '#ffffff' } } }
        );

        renderPieLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#ffffff');
        expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#000000');
      });

      it('reads the whole default palette without leaving any label on its own fill colour', () => {
        // The readability regression ARCH-236 hit: one flat colour over a 6-entry palette.
        const data: NgePieDataPoint[] = Array.from({ length: 6 }, (_, index) => ({
          label: `S${index}`,
          value: 10,
        }));
        const { context, g } = createContext(data, { showLabels: true });

        renderPieLayer(context);

        for (let index = 0; index < 6; index++) {
          const label = labelByLabel(g, `S${index}`);
          const fill = styleOf(sliceByLabel(g, `S${index}`), 'fill');
          expect(styleOf(label, 'fill')).not.toBe(fill);
        }
      });
    });

    describe('small-slice rule', () => {
      // 'Tiny' sweeps 2π × 0.5 / 100.5 ≈ 0.031 rad — well under the 0.15 rad default.
      const WITH_TINY: NgePieDataPoint[] = [...PIE, { label: 'Tiny', value: 0.5 }];

      it('leaves a slice narrower than the default threshold unlabelled', () => {
        const { context, g } = createContext(WITH_TINY, { showLabels: true });

        renderPieLayer(context);

        expect(labelledSlices(g).sort()).toEqual(['A', 'B', 'C']);
        expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(4);
      });

      it('labels the tiny slice once minLabelAngle is lowered below its sweep', () => {
        const { context, g } = createContext(WITH_TINY, {
          minLabelAngle: 0.01,
          showLabels: true,
        });

        renderPieLayer(context);

        expect(labelledSlices(g).sort()).toEqual(['A', 'B', 'C', 'Tiny']);
      });

      it('drops a previously-labelled slice when minLabelAngle is raised past its sweep', async () => {
        const { context, g } = createContext(PIE, { showLabels: true });

        renderPieLayer(context);
        expect(labelledSlices(g)).toHaveLength(3);

        // B sweeps 2π × 0.2 ≈ 1.26 rad; A ≈ 1.88 and C ≈ 3.14 stay above the new bar.
        context.config.minLabelAngle = 1.5;
        renderPieLayer(context);
        await settle();

        expect(labelledSlices(g).sort()).toEqual(['A', 'C']);
      });
    });

    it('removes every label when showLabels is turned off at runtime', async () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);
      expect(labelledSlices(g)).toHaveLength(3);

      context.config.showLabels = false;
      renderPieLayer(context);
      await settle();

      expect(g.querySelectorAll('.nge-pie-label')).toHaveLength(0);
      // The slices themselves are untouched.
      expect(g.querySelectorAll('.nge-pie-slice')).toHaveLength(3);
    });

    it('leaves surviving labels fully opaque when a re-render interrupts the fade-in', () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      // First render starts the enter fade (opacity 0 → 1).
      renderPieLayer(context);
      expect(labelByLabel(g, 'A').style.opacity).toBe('0');

      // A second render lands MID-FADE (no settle) — exactly what a resize or a control
      // change does. The interrupted transition must not strand the label part-way.
      renderPieLayer(context);

      expect(labelByLabel(g, 'A').style.opacity).toBe('1');
      expect(labelByLabel(g, 'C').style.opacity).toBe('1');
    });

    it('slides a surviving label to its new centroid when the slice reshapes', async () => {
      const { context, g } = createContext(PIE, { showLabels: true });

      renderPieLayer(context);
      await settle();
      const before = labelByLabel(g, 'C').getAttribute('x');

      // Shrink A: every downstream slice's angles shift, so C's centroid moves.
      const changed: NgePieDataPoint[] = [
        { label: 'A', value: 5 },
        { label: 'B', value: 20 },
        { label: 'C', value: 50 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderPieLayer(context);
      await settle();

      const arcC = datumOf(sliceByLabel(g, 'C'));
      const expected = expectedCentroid(arcC.startAngle, arcC.endAngle);
      expect(labelByLabel(g, 'C').getAttribute('x')).not.toBe(before);
      expect(Number(labelByLabel(g, 'C').getAttribute('x'))).toBeCloseTo(expected.x, 6);
    });

    // ARCH-267 — labelPosition: 'outside'.
    //
    // Fixture note: the shared 200×200 DIMENSIONS with the default 96px gutter would leave a
    // 4px radius, so every test here passes an explicit gutter (and the crowded ones a taller
    // fixture). GUTTER 40 ⇒ outerRadius = min(200 - 80, 200) / 2 = 60, labelRadius = 72.
    describe('outside labels (labelPosition)', () => {
      const GUTTER = 40;
      /** outerRadius under GUTTER 40 on the square 200×200 fixture. */
      const OUTER_R = 60;
      /** outerRadius + the 12px elbow offset — the leader elbow / label radius. */
      const LABEL_R = OUTER_R + 12;
      /** labelRadius + the 4px text gap — the label column's |x|. */
      const COLUMN_X = LABEL_R + 4;

      /** A tall fixture so a ~15-label hemisphere column fits without clipping. */
      const TALL = {
        boundedHeight: 400,
        boundedWidth: 400,
        height: 420,
        margin: { bottom: 10, left: 10, right: 10, top: 10 },
        width: 420,
      };

      /** The `.nge-pie-leader` polyline drawn for a slice, or null when it earned none. */
      function leaderByLabel(g: SVGGElement, label: string): null | SVGPolylineElement {
        return g.querySelector<SVGPolylineElement>(`.nge-pie-leader[data-label="${label}"]`);
      }

      /** Every slice label that currently has a leader line, in DOM order. */
      function leaderedSlices(g: SVGGElement): string[] {
        return Array.from(g.querySelectorAll<SVGPolylineElement>('.nge-pie-leader')).map(
          node => node.getAttribute('data-label') ?? ''
        );
      }

      /** Parse a polyline `points` attribute into [x, y] pairs. */
      function pointsOf(node: SVGPolylineElement): [number, number][] {
        return (node.getAttribute('points') ?? '')
          .trim()
          .split(/\s+/)
          .map(pair => {
            const [x, y] = pair.split(',').map(Number);
            return [x, y] as [number, number];
          });
      }

      describe('geometry', () => {
        it('shrinks the outer radius by the gutter on BOTH sides', async () => {
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          await settle();

          // A full pie's wedge path runs out to the outer radius and back to the center, so
          // the largest coordinate magnitude in `d` IS that radius.
          const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
          const magnitudes = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(n => Math.abs(Number(n)));
          expect(Math.max(...magnitudes)).toBeCloseTo(OUTER_R, 6);
        });

        it('leaves the radius at the full half-dimension in inside mode', async () => {
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'inside',
            showLabels: true,
          });

          renderPieLayer(context);
          await settle();

          const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
          const magnitudes = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(n => Math.abs(Number(n)));
          expect(Math.max(...magnitudes)).toBeCloseTo(100, 6);
        });

        it('reserves the gutter on labelPosition alone, not on showLabels', async () => {
          // Geometry must not jump when labels toggle — the funnel layer behaves the same way.
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: false,
          });

          renderPieLayer(context);
          await settle();

          const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
          const magnitudes = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(n => Math.abs(Number(n)));
          expect(Math.max(...magnitudes)).toBeCloseTo(OUTER_R, 6);
          expect(labelledSlices(g)).toEqual([]);
        });

        it('clamps a gutter wider than the plot to a zero radius instead of going negative', () => {
          const { context, g } = createContext(PIE, {
            labelGutter: 500,
            labelPosition: 'outside',
            showLabels: true,
          });

          expect(() => renderPieLayer(context)).not.toThrow();
          expect(sliceByLabel(g, 'A').getAttribute('d') ?? '').not.toContain('NaN');
        });

        it('defaults the gutter to 96px on each side', async () => {
          const { context, g } = createContext(PIE, {
            dimensions: TALL,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          await settle();

          // min(400 - 192, 400) / 2 = 104.
          const d = sliceByLabel(g, 'A').getAttribute('d') ?? '';
          const magnitudes = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(n => Math.abs(Number(n)));
          expect(Math.max(...magnitudes)).toBeCloseTo(104, 6);
        });
      });

      describe('hemisphere columns', () => {
        // Two slices split cleanly across the vertical axis: A sweeps 0 → π (the RIGHT
        // hemisphere, mid-angle π/2 = 3 o'clock), B sweeps π → 2π (LEFT, mid-angle 3π/2).
        const HALVES: NgePieDataPoint[] = [
          { label: 'A', value: 50 },
          { label: 'B', value: 50 },
        ];

        it('pins each label to its hemisphere column x', () => {
          const { context, g } = createContext(HALVES, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(Number(labelByLabel(g, 'A').getAttribute('x'))).toBeCloseTo(COLUMN_X, 6);
          expect(Number(labelByLabel(g, 'B').getAttribute('x'))).toBeCloseTo(-COLUMN_X, 6);
        });

        it('anchors text outward — start on the right, end on the left', () => {
          const { context, g } = createContext(HALVES, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('start');
          expect(labelByLabel(g, 'B').getAttribute('text-anchor')).toBe('end');
        });

        it('keeps text-anchor middle in inside mode', () => {
          const { context, g } = createContext(HALVES, { showLabels: true });

          renderPieLayer(context);

          expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('middle');
        });

        it('projects an uncrowded label to its own mid-angle height on the label radius', () => {
          const { context, g } = createContext(HALVES, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // Mid-angles π/2 and 3π/2 both put -cos(θ) * labelRadius at 0 (3 and 9 o'clock).
          expect(Number(labelByLabel(g, 'A').getAttribute('y'))).toBeCloseTo(0, 6);
          expect(Number(labelByLabel(g, 'B').getAttribute('y'))).toBeCloseTo(0, 6);
        });

        it('re-anchors existing labels when labelPosition flips at runtime', async () => {
          const { context, g } = createContext(HALVES, { showLabels: true });

          renderPieLayer(context);
          await settle();
          expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('middle');

          context.config.labelPosition = 'outside';
          context.config.labelGutter = GUTTER;
          renderPieLayer(context);

          // `text-anchor` is re-asserted SYNCHRONOUSLY on the update selection, so a flip is
          // never left with outward text hanging off the wrong side of the anchor point.
          expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('start');

          // x / y are animated for survivors — the same slide an inside label makes when its
          // slice reshapes — so the new column position lands after the transition. It is
          // re-targeted every render, so an interrupted slide self-heals.
          await settle();
          expect(Number(labelByLabel(g, 'A').getAttribute('x'))).toBeCloseTo(COLUMN_X, 6);
        });
      });

      describe('collision resolution', () => {
        /** 30 equal slices — the reference chart's order of magnitude. */
        const MANY: NgePieDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          label: `S${i}`,
          value: 1,
        }));

        /** Resolved label y values on one side of the pie, ascending. */
        function columnYs(g: SVGGElement, side: 'left' | 'right'): number[] {
          return Array.from(g.querySelectorAll<SVGTextElement>('.nge-pie-label'))
            .filter(node => {
              const x = Number(node.getAttribute('x'));
              return side === 'right' ? x > 0 : x < 0;
            })
            .map(node => Number(node.getAttribute('y')))
            .sort((a, b) => a - b);
        }

        it('labels all 30 slices', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(labelledSlices(g)).toHaveLength(30);
        });

        it('keeps no two labels in a column closer than the line height', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLineHeight: 14,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          for (const side of ['left', 'right'] as const) {
            const ys = columnYs(g, side);
            expect(ys.length).toBeGreaterThan(1);
            for (let i = 1; i < ys.length; i++) {
              expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(14 - 1e-6);
            }
          }
        });

        it('honours a raised line height', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLineHeight: 22,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const ys = columnYs(g, 'right');
          for (let i = 1; i < ys.length; i++) {
            expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(22 - 1e-6);
          }
        });

        it('keeps the resolved column inside the plot', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLineHeight: 14,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // Container coords: the plot spans ±boundedHeight/2 around the pie center.
          const limit = TALL.boundedHeight / 2 - 14 / 2;
          for (const y of [...columnYs(g, 'left'), ...columnYs(g, 'right')]) {
            expect(y).toBeGreaterThanOrEqual(-limit - 1e-6);
            expect(y).toBeLessThanOrEqual(limit + 1e-6);
          }
        });

        it('resolves each hemisphere independently (a left label cannot push a right one)', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // Both columns start near the top of the pie, so both must contain a label above
          // the center — impossible if the 30 labels shared one column.
          expect(Math.min(...columnYs(g, 'left'))).toBeLessThan(0);
          expect(Math.min(...columnYs(g, 'right'))).toBeLessThan(0);
        });
      });

      describe('leader lines', () => {
        const HALVES: NgePieDataPoint[] = [
          { label: 'A', value: 50 },
          { label: 'B', value: 50 },
        ];

        const MANY: NgePieDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          label: `S${i}`,
          value: 1,
        }));

        it('draws none when every label rests at its natural anchor', () => {
          const { context, g } = createContext(HALVES, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(leaderedSlices(g)).toEqual([]);
        });

        it('draws one for every displaced label on a crowded pie — and only those', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const leadered = leaderedSlices(g);
          // Crowding at 30 slices displaces most labels, but not all of them: the ones
          // nearest 3 and 9 o'clock keep their natural height.
          expect(leadered.length).toBeGreaterThan(0);
          expect(leadered.length).toBeLessThan(30);
        });

        // ARCH-275 — the elbow used to jump straight to the hemisphere column, which made the
        // whole connector one long diagonal with nothing tying it to the wedge it names. It
        // now carries the slice's OWN mid-angle out to the label ring first, so the segment
        // leaving the slice is radial.
        // Pinned to 'columns' for p2, whose x is the column's — the ring's varies per slice.
        // p0 / p1 are layout-independent and stay covered on the default by the collinearity
        // test below.
        it('runs arc edge → radial stub on the label ring → label', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'columns',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const displaced = leaderedSlices(g)[0];
          const leader = leaderByLabel(g, displaced);
          expect(leader).not.toBeNull();

          const points = pointsOf(leader as SVGPolylineElement);
          expect(points).toHaveLength(3);

          const arc = datumOf(sliceByLabel(g, displaced));
          const midAngle = (arc.startAngle + arc.endAngle) / 2;
          // min(400 - 80, 400) / 2 = 160 under GUTTER 40 on the tall fixture.
          const outerR = 160;
          const labelR = outerR + 12;
          const label = labelByLabel(g, displaced);
          const labelY = Number(label.getAttribute('y'));
          const hemisphere = Number(label.getAttribute('x')) > 0 ? 1 : -1;

          // p0 — the slice's own outer edge at its mid-angle.
          expect(points[0][0]).toBeCloseTo(Math.sin(midAngle) * outerR, 6);
          expect(points[0][1]).toBeCloseTo(-Math.cos(midAngle) * outerR, 6);
          // p1 — the SAME mid-angle carried out to the label ring.
          expect(points[1][0]).toBeCloseTo(Math.sin(midAngle) * labelR, 6);
          expect(points[1][1]).toBeCloseTo(-Math.cos(midAngle) * labelR, 6);
          // p2 — the label's own attachment point, on its hemisphere column.
          expect(points[2][0]).toBeCloseTo(hemisphere * (labelR + 4), 6);
          expect(points[2][1]).toBeCloseTo(labelY, 6);
        });

        it('leaves the slice along its own radius — p0 → p1 is collinear with the mid-angle', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            leaderLines: 'all',
            showLabels: true,
          });

          renderPieLayer(context);

          // The defining property of the radial stub, asserted on EVERY leader rather than a
          // sample: p0 and p1 both lie on the ray from the pie center at the slice mid-angle,
          // so their cross product about the origin vanishes.
          for (const sliceLabel of leaderedSlices(g)) {
            const points = pointsOf(leaderByLabel(g, sliceLabel) as SVGPolylineElement);
            const [[x0, y0], [x1, y1]] = points;

            expect(x0 * y1 - x1 * y0).toBeCloseTo(0, 6);
            // ...and p1 is strictly FURTHER out, so the stub points away from the center.
            expect(Math.hypot(x1, y1)).toBeGreaterThan(Math.hypot(x0, y0));
          }
        });

        // ARCH-272 — `leaderLines` picks WHICH outside labels earn a connector. The
        // placement + collision maths is untouched; only the emission predicate changes.
        // ARCH-279 — decoupling the stub from the label distance.
        describe('leaderElbowOffset', () => {
          it('defaults to labelOffset — the elbow stays on the label ring', () => {
            const omitted = createContext(PIE, {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });
            const explicit = createContext(PIE, {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderElbowOffset: 12,
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(omitted.context);
            renderPieLayer(explicit.context);

            // Byte-identical geometry: an existing pie cannot notice this option was added.
            expect(pointsOf(leaderByLabel(omitted.g, 'A') as SVGPolylineElement)).toEqual(
              pointsOf(leaderByLabel(explicit.g, 'A') as SVGPolylineElement)
            );
          });

          // The 'columns' half of the pair — its fixed column x is what makes "the label did
          // not move" a single number. The perimeter half is the bearing test below it.
          it('shortens the stub without moving the label', () => {
            const { context, g } = createContext(PIE, {
              labelGutter: GUTTER,
              labelLayout: 'columns',
              labelOffset: 40,
              labelPosition: 'outside',
              leaderElbowOffset: 6,
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);

            const [p0, p1, p2] = pointsOf(leaderByLabel(g, 'A') as SVGPolylineElement);
            const radiusOf = ([x, y]: [number, number]): number => Math.hypot(x, y);

            // OUTER_R 60 at this gutter. The stub now ends 6px off the arc (66) rather than at
            // the 100px label ring, while the label itself still sits out at labelOffset.
            expect(radiusOf(p0)).toBeCloseTo(60, 6);
            expect(radiusOf(p1)).toBeCloseTo(66, 6);
            expect(Math.abs(p2[0])).toBeCloseTo(60 + 40 + 4, 6);
          });

          it("keeps the stub on the slice's own bearing however short it is", () => {
            const { context, g } = createContext(PIE, {
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelOffset: 40,
              labelPosition: 'outside',
              leaderElbowOffset: 6,
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);

            // The invariant a short stub must not break: p0 and p1 stay on the same ray from
            // the center, so the connector still visibly leaves the wedge it names rather than
            // reading as a diagonal. (The final hop is NOT collinear with them — the 4px text
            // gap is applied horizontally, not radially — so the elbow is a real elbow.)
            const [p0, p1] = pointsOf(leaderByLabel(g, 'A') as SVGPolylineElement);
            const bearing = ([x, y]: [number, number]): number => Math.atan2(x, -y);
            expect(bearing(p1)).toBeCloseTo(bearing(p0), 6);
          });

          it('grows the perimeter vertical reserve when the elbow rides past the labels', () => {
            const inside = createContext(PIE, {
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });
            const beyond = createContext(PIE, {
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelPosition: 'outside',
              leaderElbowOffset: 80,
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(inside.context);
            renderPieLayer(beyond.context);

            // An elbow past the label ring has to be paid for out of the height too, or the
            // 12-o'clock connector is drawn past `boundedHeight` and the clip-path eats it —
            // the same failure the label reserve exists to prevent. The pie gives the room back.
            const radiusOf = (g: SVGGElement): number => {
              const [p0] = pointsOf(leaderByLabel(g, 'A') as SVGPolylineElement);
              return Math.hypot(p0[0], p0[1]);
            };
            expect(radiusOf(beyond.g)).toBeLessThan(radiusOf(inside.g));
          });
        });

        describe('leaderLines mode', () => {
          it("defaults to 'displaced' — the ARCH-267 behaviour, unchanged", () => {
            const { context: a, g: ga } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              showLabels: true,
            });
            const { context: b, g: gb } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'displaced',
              showLabels: true,
            });

            renderPieLayer(a);
            renderPieLayer(b);

            // Omitting the option and asking for 'displaced' must be indistinguishable —
            // this is what stops the new knob silently regressing every existing pie.
            expect(leaderedSlices(ga)).toEqual(leaderedSlices(gb));
            expect(leaderedSlices(ga).length).toBeLessThan(30);
          });

          it("'all' draws exactly one leader per outside label", () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);

            expect(leaderedSlices(g)).toHaveLength(30);
            expect(leaderedSlices(g).sort()).toEqual(labelledSlices(g).sort());
          });

          it("'all' leaders an undisplaced label too, as a near-straight radial tick", () => {
            // Two half-slices sit at 3 and 9 o'clock and never collide, so under
            // 'displaced' they earn nothing — they are the case 'all' exists for.
            const HALVES: NgePieDataPoint[] = [
              { label: 'A', value: 50 },
              { label: 'B', value: 50 },
            ];

            const { context: none, g: gNone } = createContext(HALVES, {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              showLabels: true,
            });
            renderPieLayer(none);
            expect(leaderedSlices(gNone)).toEqual([]);

            const { context, g } = createContext(HALVES, {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });
            renderPieLayer(context);

            expect(leaderedSlices(g).sort()).toEqual(['A', 'B']);

            // A's mid-angle is 3 o'clock: the three points share y = 0 and step outward
            // along x — a straight tick, not an elbow.
            const points = pointsOf(leaderByLabel(g, 'A') as SVGPolylineElement);
            expect(points).toHaveLength(3);
            expect(points[0][0]).toBeCloseTo(OUTER_R, 6);
            expect(points[1][0]).toBeCloseTo(LABEL_R, 6);
            expect(points[2][0]).toBeCloseTo(COLUMN_X, 6);
            for (const [, y] of points) {
              expect(y).toBeCloseTo(0, 6);
            }
          });

          it("'none' draws no leaders even when labels are displaced", () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'none',
              showLabels: true,
            });

            renderPieLayer(context);

            expect(leaderedSlices(g)).toEqual([]);
            // The labels themselves are untouched — only the connectors are suppressed.
            expect(labelledSlices(g)).toHaveLength(30);
          });

          it('is ignored in inside mode', () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);

            expect(leaderedSlices(g)).toEqual([]);
          });

          it("enters leaders cleanly when switched 'displaced' → 'all' at runtime", () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(context);
            const before = leaderedSlices(g);
            const survivor = before[0];
            const survivorNode = leaderByLabel(g, survivor);

            context.config.leaderLines = 'all';
            renderPieLayer(context);

            expect(leaderedSlices(g)).toHaveLength(30);
            // The already-drawn leaders keep their nodes (keyed join), and the newly
            // entered ones do not duplicate them.
            expect(leaderByLabel(g, survivor)).toBe(survivorNode);
            expect(new Set(leaderedSlices(g)).size).toBe(30);
          });

          it("exits leaders cleanly when switched 'all' → 'none' at runtime", async () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);
            expect(leaderedSlices(g)).toHaveLength(30);

            context.config.leaderLines = 'none';
            renderPieLayer(context);
            await settle();

            expect(leaderedSlices(g)).toEqual([]);
          });

          it("leaves survivors fully opaque when a re-render interrupts an 'all' fade-in", () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
            });

            renderPieLayer(context);
            // Second render lands MID-FADE — the ARCH-194 stranded-sub-mark bug class,
            // which a runtime mode switch is the most likely way to trigger.
            renderPieLayer(context);

            for (const label of leaderedSlices(g)) {
              expect((leaderByLabel(g, label) as SVGPolylineElement).style.opacity).toBe('1');
            }
          });

          it("styles an 'all' leader from theme.pie.leaderLine like any other", () => {
            const { context, g } = createContext(PIE, {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              leaderLines: 'all',
              showLabels: true,
              theme: { leaderLine: { stroke: '#ff00ff', strokeWidth: 3 } },
            });

            renderPieLayer(context);

            const leader = leaderByLabel(g, 'A') as SVGPolylineElement;
            expect(styleOf(leader, 'stroke')).toBe('#ff00ff');
            expect(styleOf(leader, 'stroke-width')).toBe('3');
          });
        });

        it('draws no leaders at all in inside mode', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            showLabels: true,
          });

          renderPieLayer(context);

          expect(leaderedSlices(g)).toEqual([]);
        });

        it('removes every leader when labelPosition flips back to inside', async () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          expect(leaderedSlices(g).length).toBeGreaterThan(0);

          context.config.labelPosition = 'inside';
          renderPieLayer(context);
          await settle();

          expect(leaderedSlices(g)).toEqual([]);
        });

        it('lets hover fall through to the slice underneath (pointer-events: none)', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const leader = leaderByLabel(g, leaderedSlices(g)[0]) as SVGPolylineElement;
          expect(styleOf(leader, 'pointer-events')).toBe('none');
          expect(styleOf(leader, 'fill')).toBe('none');
        });

        it('styles leaders from theme.pie.leaderLine', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
            theme: { leaderLine: { stroke: '#ff00ff', strokeWidth: 3 } },
          });

          renderPieLayer(context);

          const leader = leaderByLabel(g, leaderedSlices(g)[0]) as SVGPolylineElement;
          expect(styleOf(leader, 'stroke')).toBe('#ff00ff');
          expect(styleOf(leader, 'stroke-width')).toBe('3');
        });

        it('defaults leaders to the muted outline token', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const leader = leaderByLabel(g, leaderedSlices(g)[0]) as SVGPolylineElement;
          expect(styleOf(leader, 'stroke')).toBe('var(--nge-chart-outline, #79747e)');
        });

        it('leaves surviving leaders fully opaque when a re-render interrupts the fade-in', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          const first = leaderByLabel(g, leaderedSlices(g)[0]) as SVGPolylineElement;
          expect(first.style.opacity).toBe('0');

          // Second render lands MID-FADE — the ARCH-194 stranded-sub-mark bug class.
          renderPieLayer(context);

          const survivor = leaderByLabel(g, leaderedSlices(g)[0]) as SVGPolylineElement;
          expect(survivor.style.opacity).toBe('1');
        });
      });

      // ARCH-275 — where an UNCROWDED outside label rests. Collision separation is shared by
      // both layouts and unchanged; only the resting x differs.
      describe('labelLayout', () => {
        /**
         * Four equal slices with the sweep rotated a half-slice anticlockwise, so the
         * mid-angles land exactly on 12 / 3 / 6 / 9 o'clock — the only fixture that can
         * exercise the dead-top and dead-bottom anchoring cases.
         */
        const QUARTERS: NgePieDataPoint[] = [
          { label: 'Top', value: 25 },
          { label: 'Right', value: 25 },
          { label: 'Bottom', value: 25 },
          { label: 'Left', value: 25 },
        ];
        const QUARTER_SWEEP = {
          endAngle: (7 * Math.PI) / 4,
          startAngle: -Math.PI / 4,
        };

        const MANY: NgePieDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          label: `S${i}`,
          value: 1,
        }));

        /** Every outside label's resolved [x, y], keyed by slice label. */
        function anchorsOf(g: SVGGElement): Map<string, [number, number]> {
          return new Map(
            labelledSlices(g).map(slice => {
              const node = labelByLabel(g, slice);
              return [
                slice,
                [Number(node.getAttribute('x')), Number(node.getAttribute('y'))] as [
                  number,
                  number,
                ],
              ];
            })
          );
        }

        it("defaults to 'perimeter' — the ring is the pie's normal outside-label form", () => {
          const { context: a, g: ga } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });
          const { context: b, g: gb } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(a);
          renderPieLayer(b);

          // Omitting the option and asking for 'perimeter' must be indistinguishable.
          expect(anchorsOf(ga)).toEqual(anchorsOf(gb));
        });

        it("does NOT default to 'columns' — asking for it changes the placement", () => {
          const { context: a, g: ga } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });
          const { context: b, g: gb } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'columns',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(a);
          renderPieLayer(b);

          // The guard on the flip itself: columns stays reachable, and reverting the default
          // to it would collapse this pair back into equality.
          expect(anchorsOf(ga)).not.toEqual(anchorsOf(gb));
        });

        // ARCH-276 — the ring buys leader LENGTH, not leader COUNT. `displaced` is
        // `|resolvedY - naturalY| > ε` and the y-pass that decides it is shared by both
        // layouts, so `leaderLines: 'displaced'` cannot emit a different set either way. The
        // public JSDoc claimed the ring "draws far fewer connectors" from ARCH-275 until this
        // was measured in the browser (30 countries: 12 leaders either way). Pinned so the
        // claim cannot come back.
        describe('leaders: same slices, shorter lines', () => {
          function leadersOf(
            layout: 'columns' | 'perimeter',
            leaderLines: 'all' | 'displaced'
          ): { count: number; slices: string[]; totalLength: number } {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelLayout: layout,
              labelPosition: 'outside',
              leaderLines,
              showLabels: true,
            });
            renderPieLayer(context);

            const leaders = [...g.querySelectorAll('.nge-pie-leader')];
            const totalLength = leaders.reduce((sum, node) => {
              const pts = pointsOf(node as SVGPolylineElement);
              let len = 0;
              for (let i = 1; i < pts.length; i++) {
                len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
              }
              return sum + len;
            }, 0);

            return { count: leaders.length, slices: [...leaderedSlices(g)].sort(), totalLength };
          }

          it("leaders the same SLICES under 'displaced' as columns, not merely as many", () => {
            // The tripwire for ARCH-283: `displaced` reads y alone, so the layout cannot
            // change who earns a connector. A predicate that also weighed the x pull would
            // leave this identity intact on the ring and break it on the columns, where every
            // label shares one of two x values.
            expect(leadersOf('perimeter', 'displaced').slices).toEqual(
              leadersOf('columns', 'displaced').slices
            );
          });

          it('spends far less ink on them — each ends on its own bearing', () => {
            // Browser-measured on the 30-country reference: 1341px against 5556px, a 4.1x
            // reduction. Half is a deliberately loose floor so the assertion tracks the
            // property (ring connectors are short) rather than one fixture's exact ratio.
            const perimeter = leadersOf('perimeter', 'all');
            const columns = leadersOf('columns', 'all');

            expect(perimeter.count).toBe(columns.count);
            expect(perimeter.totalLength).toBeLessThan(columns.totalLength / 2);
          });
        });

        // What `displaced` measures, and why it reads y alone (settled in ARCH-283). A label
        // earns a connector exactly when its position stops naming its wedge — and y carries
        // the whole of that in BOTH layouts, so `|Δy| > ε` is the test itself rather than a
        // cheap stand-in for a fuller one. The three facts below are what make that true; a
        // predicate that also weighed the x pull would be a no-op on the ring and would
        // leader every column label, which is what `leaderLines: 'all'` is for.
        describe('what displacement measures', () => {
          /** outerRadius on the TALL fixture at GUTTER 40 — min(400 - 80, 400) / 2. */
          const TALL_OUTER_R = 160;
          /** The label ring: outerRadius plus the 12px default labelOffset. */
          const TALL_LABEL_R = TALL_OUTER_R + 12;
          /** Horizontal gap between the ring and the first glyph. */
          const TEXT_GAP = 4;
          /** The slack in `displaced` — below this a label counts as resting at its anchor. */
          const EPSILON = 0.5;

          function renderMany(layout: 'columns' | 'perimeter'): SVGGElement {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelLayout: layout,
              labelPosition: 'outside',
              showLabels: true,
            });
            renderPieLayer(context);
            return g;
          }

          /** Each labelled slice's mid-angle, read off the arc datum d3 bound to its path. */
          function midAnglesOf(g: SVGGElement): Map<string, number> {
            return new Map(
              labelledSlices(g).map(slice => {
                const { endAngle, startAngle } = datumOf(sliceByLabel(g, slice));
                return [slice, (startAngle + endAngle) / 2];
              })
            );
          }

          it("seats every 'perimeter' label at the ring x its own height implies", () => {
            const g = renderMany('perimeter');

            // The exact relation `x = hemisphere * (√(labelRadius² − y²) + gap)`: |x| is a
            // pure FUNCTION of y, so nothing about a ring label's horizontal position is
            // knowable from y. That is why weighing the x pull cannot change this layout's
            // leader set — there is no independent x to weigh.
            for (const [, [x, y]] of anchorsOf(g)) {
              expect(Math.abs(x) - TEXT_GAP).toBeCloseTo(
                Math.sqrt(Math.max(0, TALL_LABEL_R * TALL_LABEL_R - y * y)),
                6
              );
            }
          });

          it.each(['columns', 'perimeter'] as const)(
            'stacks %s labels in wedge order within a hemisphere, at distinct heights',
            layout => {
              const g = renderMany(layout);
              const mids = midAnglesOf(g);
              const anchors = anchorsOf(g);

              for (const hemisphere of [-1, 1]) {
                const column = [...anchors]
                  .filter(
                    ([slice]) => (Math.sin(mids.get(slice) ?? 0) >= 0 ? 1 : -1) === hemisphere
                  )
                  .map(([slice, [, y]]) => ({
                    naturalY: -Math.cos(mids.get(slice) ?? 0) * TALL_LABEL_R,
                    y,
                  }))
                  .sort((a, b) => a.naturalY - b.naturalY);

                expect(column.length).toBeGreaterThan(1);
                for (let i = 1; i < column.length; i++) {
                  // Hemispheres split on `sign(sin θ)`, which cuts the circle at exactly the
                  // two angles where cos turns — so within one, height is one-to-one with the
                  // mid-angle and no two labels can want the same y...
                  expect(column[i].naturalY).toBeGreaterThan(column[i - 1].naturalY);
                  // ...and the collision pass only separates, never reorders, so the resolved
                  // heights still run in wedge order. Height alone names the wedge.
                  expect(column[i].y).toBeGreaterThan(column[i - 1].y);
                }
              }
            }
          );

          it("leaves an un-leadered 'columns' label at its own wedge's height", () => {
            const g = renderMany('columns');
            const mids = midAnglesOf(g);
            const leadered = new Set(leaderedSlices(g));
            const resting = [...anchorsOf(g)].filter(([slice]) => !leadered.has(slice));

            expect(resting.length).toBeGreaterThan(0);
            for (const [slice, [, y]] of resting) {
              // The column x is a constant shared by the whole hemisphere, so being pulled to
              // it discards nothing that identified the wedge. The height survives untouched,
              // and the connector the label goes without would have been horizontal.
              expect(
                Math.abs(y - -Math.cos(mids.get(slice) ?? 0) * TALL_LABEL_R)
              ).toBeLessThanOrEqual(EPSILON);
            }
          });
        });

        it("pins every 'columns' label to the same two column x values", () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'columns',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // outerRadius 160 + the 12px elbow + the 4px text gap.
          const xs = new Set([...anchorsOf(g).values()].map(([x]) => Math.abs(x)));
          expect([...xs]).toEqual([176]);
        });

        it("seats every 'perimeter' label on the label ring at its own mid-angle", () => {
          const { context, g } = createContext(QUARTERS, {
            ...QUARTER_SWEEP,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // Strip the text gap back off and the anchor must land ON the circle of radius
          // LABEL_R — that is what "the ring follows the pie's curve" means numerically.
          for (const [, [x, y]] of anchorsOf(g)) {
            expect(Math.hypot(Math.abs(x) - 4, y)).toBeCloseTo(LABEL_R, 6);
          }
        });

        it("spreads 'perimeter' labels across many x values, not two", () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // The defect this layout fixes: 30 labels on two ruler lines. On the ring they step
          // in and out with their own bearing.
          const xs = new Set([...anchorsOf(g).values()].map(([x]) => Math.abs(x).toFixed(3)));
          expect(xs.size).toBeGreaterThan(10);
        });

        it('anchors text outward by hemisphere, and centers it at dead top / bottom', () => {
          const { context, g } = createContext(QUARTERS, {
            ...QUARTER_SWEEP,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(labelByLabel(g, 'Right').getAttribute('text-anchor')).toBe('start');
          expect(labelByLabel(g, 'Left').getAttribute('text-anchor')).toBe('end');
          // 12 and 6 o'clock have no outward horizontal direction to tip toward.
          expect(labelByLabel(g, 'Top').getAttribute('text-anchor')).toBe('middle');
          expect(labelByLabel(g, 'Bottom').getAttribute('text-anchor')).toBe('middle');
        });

        it('draws no leader for a perimeter label that nothing displaced', () => {
          const { context, g } = createContext(QUARTERS, {
            ...QUARTER_SWEEP,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // The point of the layout: a label resting on its own bearing needs no connector,
          // so the default `leaderLines: 'displaced'` draws nothing at all here.
          expect(labelledSlices(g)).toHaveLength(4);
          expect(leaderedSlices(g)).toEqual([]);
        });

        it('separates colliding perimeter labels and gives those — and only those — a leader', () => {
          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          const leadered = new Set(leaderedSlices(g));
          expect(leadered.size).toBeGreaterThan(0);
          expect(leadered.size).toBeLessThan(30);

          // Separation still holds within a hemisphere: no two labels sit closer than the
          // line height. Crowding is what earns a leader, so an un-leadered label must be one
          // the pass left alone.
          const byHemisphere = new Map<number, number[]>([
            [-1, []],
            [1, []],
          ]);
          for (const [, [x, y]] of anchorsOf(g)) {
            byHemisphere.get(x >= 0 ? 1 : -1)?.push(y);
          }
          for (const ys of byHemisphere.values()) {
            ys.sort((a, b) => a - b);
            for (let i = 1; i < ys.length; i++) {
              expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(14 - 1e-6);
            }
          }
        });

        it('re-seats existing labels when labelLayout flips at runtime', async () => {
          const { context, g } = createContext(QUARTERS, {
            ...QUARTER_SWEEP,
            labelGutter: GUTTER,
            // Explicit, because the flip under test is away from the default: starting on
            // 'columns' is what makes the second render a real change of layout.
            labelLayout: 'columns',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          await settle();
          expect(Math.abs(anchorsOf(g).get('Top')?.[0] ?? 0)).toBeCloseTo(LABEL_R + 4, 6);

          context.config.labelLayout = 'perimeter';
          renderPieLayer(context);

          // `text-anchor` is re-applied synchronously on the MERGED selection, so an
          // already-rendered label re-anchors immediately...
          expect(labelByLabel(g, 'Top').getAttribute('text-anchor')).toBe('middle');

          // ...while the anchor point itself slides there over the update transition, the way
          // a surviving label follows its slice through any other reshape.
          await settle();
          expect(Math.abs(anchorsOf(g).get('Top')?.[0] ?? 0)).toBeCloseTo(4, 6);
        });

        it('is ignored in inside mode', () => {
          const { context, g } = createContext(QUARTERS, {
            ...QUARTER_SWEEP,
            labelLayout: 'perimeter',
            showLabels: true,
          });

          renderPieLayer(context);

          // On-arc labels take the centroid regardless — the knob only governs outside
          // placement, so it must not leak into the default mode.
          expect(labelByLabel(g, 'Top').getAttribute('text-anchor')).toBe('middle');
          expect(Number(labelByLabel(g, 'Right').getAttribute('x'))).not.toBeCloseTo(
            LABEL_R + 4,
            6
          );
        });

        // The ring crosses the plot's top and bottom edges, not just its sides — so unlike a
        // hemisphere column it has to be paid for out of the HEIGHT as well. Without that the
        // 12-o'clock label is drawn past `boundedHeight` and the clip-path eats it, and the
        // collision clamp masks the failure by shoving a band of labels off their own bearing.
        describe('vertical reserve for the ring', () => {
          it('keeps the topmost perimeter label inside the plot', () => {
            const { context, g } = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(context);

            // The container is translated to the pie centre, so the plot's own edges sit at
            // ±boundedHeight/2 = ±100 on the square fixture.
            for (const [, [, y]] of anchorsOf(g)) {
              expect(Math.abs(y)).toBeLessThanOrEqual(100);
            }
          });

          it('shrinks the pie when the height, not the width, is the binding constraint', () => {
            // A WIDE, short plot: the gutter leaves width to spare, so before this reserve
            // existed the radius took the full half-height and pushed the ring off the top.
            const WIDE = {
              boundedHeight: 200,
              boundedWidth: 900,
              height: 220,
              margin: { bottom: 10, left: 10, right: 10, top: 10 },
              width: 920,
            };

            const { context: ring, g: gRing } = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              dimensions: WIDE,
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelPosition: 'outside',
              showLabels: true,
            });
            const { context: cols, g: gCols } = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              dimensions: WIDE,
              labelGutter: GUTTER,
              labelLayout: 'columns',
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(ring);
            renderPieLayer(cols);

            // The ring gave back its own extent (12px offset + half the 14px line height), so
            // the pie is smaller: 'Right' sits at 3 o'clock, where |x| is the label radius
            // plus the text gap, and that radius is the arc's plus the offset.
            const ringRight = Math.abs(anchorsOf(gRing).get('Right')?.[0] ?? 0);
            const columnRight = Math.abs(anchorsOf(gCols).get('Right')?.[0] ?? 0);
            expect(ringRight).toBeLessThan(columnRight);

            // And the payoff: the 12-o'clock label lands at its natural anchor instead of
            // being clamped into the plot edge. Both end up at |y| = 93 — but the column got
            // there by being SHOVED off its bearing (natural −112, clamped to −93), which is
            // what earns it a leader. The ring was never moved, so it draws none. That is the
            // whole failure mode: without the reserve, a band of labels is silently displaced.
            expect(leaderedSlices(gRing)).toEqual([]);
            expect(leaderedSlices(gCols)).toContain('Top');
          });

          it('leaves columns geometry untouched — the reserve is perimeter-only', () => {
            const { context: a, g: ga } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelLayout: 'columns',
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(a);

            // outerRadius 160 + 12 elbow + 4 gap, i.e. the pre-ARCH-275 column x.
            expect(new Set([...anchorsOf(ga).values()].map(([x]) => Math.abs(x)))).toEqual(
              new Set([176])
            );
          });
        });

        // `labelOffset` is the "hold the labels clear of the arc" knob. Under 'perimeter' it
        // does double duty — the ring it defines has to fit the height, so raising it shrinks
        // the pie. That is the documented way to open up a crowded chart in a fixed box.
        describe('labelOffset', () => {
          it('pushes the label ring further out and shrinks the pie to fit it', () => {
            const near = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelOffset: 12,
              labelPosition: 'outside',
              showLabels: true,
            });
            const far = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelOffset: 48,
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(near.context);
            renderPieLayer(far.context);

            // 'Right' sits at 3 o'clock, so its |x| IS the label radius plus the text gap.
            const nearX = Math.abs(anchorsOf(near.g).get('Right')?.[0] ?? 0);
            const farX = Math.abs(anchorsOf(far.g).get('Right')?.[0] ?? 0);

            // The pie is width-bound on this fixture, so a bigger offset moves the ring out.
            expect(farX).toBeGreaterThan(nearX);
            // ...and the arc it rings has to give the room back.
            const radiusOf = (x: number, offset: number) => x - offset - 4;
            expect(radiusOf(farX, 48)).toBeLessThan(radiusOf(nearX, 12));
          });

          it('defaults to 12px — the pre-ARCH-275 elbow offset', () => {
            const { context, g } = createContext(QUARTERS, {
              ...QUARTER_SWEEP,
              labelGutter: GUTTER,
              labelLayout: 'perimeter',
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(context);

            expect(Math.abs(anchorsOf(g).get('Right')?.[0] ?? 0)).toBeCloseTo(LABEL_R + 4, 6);
          });

          it('moves the columns outward too', () => {
            const { context, g } = createContext(MANY, {
              dimensions: TALL,
              labelGutter: GUTTER,
              labelLayout: 'columns',
              labelOffset: 40,
              labelPosition: 'outside',
              showLabels: true,
            });

            renderPieLayer(context);

            // Columns are NOT height-constrained by the offset, so the radius holds at 160
            // and the column simply sits further out: 160 + 40 + 4.
            expect(new Set([...anchorsOf(g).values()].map(([x]) => Math.abs(x)))).toEqual(
              new Set([204])
            );
          });
        });

        // The gutter question this layout raises — "does the ring need MORE reserved width
        // than the columns did?" — has a closed-form answer, so it is settled here rather
        // than by eye. `ringX = √(labelRadius² − y²) ≤ labelRadius`, and the column sits at
        // exactly `labelRadius`; the ring therefore touches that x only at 3 and 9 o'clock
        // and is strictly inside it everywhere else. No category count can change that, so
        // `labelGutter` never has to grow when a chart switches to 'perimeter'.
        it('never reaches further from the center than the column it replaces', () => {
          const { context: cols, g: gCols } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'columns',
            labelPosition: 'outside',
            showLabels: true,
          });
          const { context: ring, g: gRing } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelLayout: 'perimeter',
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(cols);
          renderPieLayer(ring);

          const columnAnchors = anchorsOf(gCols);
          const ringAnchors = anchorsOf(gRing);
          expect(ringAnchors.size).toBe(columnAnchors.size);

          for (const [slice, [ringX]] of ringAnchors) {
            const [columnX] = columnAnchors.get(slice) ?? [0];
            expect(Math.abs(ringX)).toBeLessThanOrEqual(Math.abs(columnX) + 1e-6);
          }
        });

        // ARCH-279 — leader crossings.
        describe('leader crossings', () => {
          /**
           * The 30-category gold-medal set the usage story charts (932 down to 36), at the
           * plot dimensions ARCH-275 settled on. Both are load-bearing: the crossing count is
           * a function of category count and plot HEIGHT, so a smaller fixture measures a
           * different problem.
           */
          const GOLD_MEDALS: NgePieDataPoint[] = [
            { label: 'USA 932', value: 932 },
            { label: 'Soviet Union 397', value: 397 },
            { label: 'Britain 211', value: 211 },
            { label: 'France 192', value: 192 },
            { label: 'Italy 191', value: 191 },
            { label: 'Germany 189', value: 189 },
            { label: 'China 163', value: 163 },
            { label: 'Hungary 160', value: 160 },
            { label: 'East Germany 153', value: 153 },
            { label: 'Sweden 140', value: 140 },
            { label: 'Australia 131', value: 131 },
            { label: 'Japan 123', value: 123 },
            { label: 'Russia 109', value: 109 },
            { label: 'Finland 100', value: 100 },
            { label: 'Romania 86', value: 86 },
            { label: 'Netherlands 73', value: 73 },
            { label: 'South Korea 68', value: 68 },
            { label: 'Cuba 66', value: 66 },
            { label: 'Poland 63', value: 63 },
            { label: 'Canada 56', value: 56 },
            { label: 'West Germany 56', value: 56 },
            { label: 'Norway 54', value: 54 },
            { label: 'Bulgaria 51', value: 51 },
            { label: 'Czechoslovakia 50', value: 50 },
            { label: 'Switzerland 45', value: 45 },
            { label: 'Unified Team 45', value: 45 },
            { label: 'Denmark 41', value: 41 },
            { label: 'Belgium 38', value: 38 },
            { label: 'Turkey 37', value: 37 },
            { label: 'New Zealand 36', value: 36 },
          ];

          /** The ARCH-275 story plot: 900px of height on a 1146px-wide plot. */
          const STORY_PLOT = {
            boundedHeight: 900,
            boundedWidth: 1146,
            height: 920,
            margin: { bottom: 10, left: 10, right: 10, top: 10 },
            width: 1166,
          };

          const CROWDED = {
            data: GOLD_MEDALS,
            dimensions: STORY_PLOT,
            labelGutter: 170,
            labelOffset: 12,
            labelPosition: 'outside' as const,
            showLabels: true,
          };

          /**
           * Sign of the cross product (p→q) × (p→r): +1 counter-clockwise, -1 clockwise,
           * 0 collinear (within a tolerance, so a floating-point hair does not read as a turn).
           */
          function orientation(
            p: [number, number],
            q: [number, number],
            r: [number, number]
          ): number {
            const v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
            return Math.abs(v) < 1e-9 ? 0 : Math.sign(v);
          }

          /**
           * Every drawn leader expanded into its individual segments, tagged with the leader
           * that owns it — two segments of the SAME polyline share an elbow by construction
           * and must never be counted against each other — and with the segment's position in
           * that polyline: `0` is the radial stub off the arc, `1` the chord out to the label.
           */
          function leaderSegments(
            g: SVGGElement
          ): { a: [number, number]; b: [number, number]; index: number; owner: number }[] {
            return Array.from(g.querySelectorAll<SVGPolylineElement>('.nge-pie-leader')).flatMap(
              (node, owner) => {
                const points = pointsOf(node);
                return points.slice(1).map((b, index) => ({ a: points[index], b, index, owner }));
              }
            );
          }

          /**
           * How many times the drawn leader lines cross each other — the number this whole
           * ticket is about. Counts PROPER intersections only (both segments strictly straddle
           * the other's line), so a shared endpoint or a collinear touch does not inflate it.
           *
           * Deterministic and jsdom-only: leader geometry is written synchronously on enter,
           * so this needs no transition settle and no browser.
           */
          function countLeaderCrossings(g: SVGGElement): number {
            const segments = leaderSegments(g);
            let crossings = 0;

            for (let i = 0; i < segments.length; i++) {
              for (let j = i + 1; j < segments.length; j++) {
                if (segments[i].owner === segments[j].owner) {
                  continue;
                }
                const { a, b } = segments[i];
                const { a: c, b: d } = segments[j];
                const d1 = orientation(a, b, c);
                const d2 = orientation(a, b, d);
                const d3 = orientation(c, d, a);
                const d4 = orientation(c, d, b);
                if (d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0 && d1 !== d2 && d3 !== d4) {
                  crossings++;
                }
              }
            }

            return crossings;
          }

          /**
           * Category counts at which the ring stays completely untangled, and the counts at
           * which it stops. Measured on this fixture with the shipped placement pass — labels
           * in wedge order, nothing reassigned:
           *
           * | categories | 5 | 8 | 12 | 16 | 20 | 25 | 30 |
           * | crossings  | 0 | 0 |  0 |  0 |  0 |  8 | 34 |
           *
           * The ring is crossing-free through 20 and degrades sharply past it. That is a
           * DENSITY ceiling, not a defect in the layout: past ~20 the labels can no longer fit
           * near their own bearings, the y-pass has to slide them a long way along the ring,
           * and the leaders it drags behind them start sweeping over their neighbours.
           */
          const MAX_UNTANGLED_CATEGORIES = 20;

          it('draws a completely untangled ring up to its density ceiling', () => {
            const measured = [5, 8, 12, 16, MAX_UNTANGLED_CATEGORIES].map(n => {
              const slice = GOLD_MEDALS.slice(0, n);
              const { context, g } = createContext(slice, {
                ...CROWDED,
                data: slice,
                labelLayout: 'perimeter',
                leaderLines: 'all',
              });
              renderPieLayer(context);
              return `n=${n}: ${countLeaderCrossings(g)}`;
            });

            // Zero, not "few" — through the whole range a perimeter pie is a sensible choice
            // for. This is the assertion that stops a future placement change from quietly
            // tangling the common case.
            expect(measured).toEqual(['n=5: 0', 'n=8: 0', 'n=12: 0', 'n=16: 0', 'n=20: 0']);
          });

          it('tangles past the ceiling — which is what `columns` is for', () => {
            const { context, g } = createContext(GOLD_MEDALS, {
              ...CROWDED,
              labelLayout: 'perimeter',
              leaderLines: 'all',
            });
            renderPieLayer(context);

            // Pinned so the ceiling is a measured fact rather than folklore. ARCH-279 explored
            // reassigning labels to slots to untangle this; it works (34 → 3) but only by
            // taking labels out of wedge order, which costs more legibility than the crossings
            // do. Do not re-open that trade — see `docs/architecture/charts.md` § Radial labels.
            expect(countLeaderCrossings(g)).toBeGreaterThan(0);
          });

          it("keeps 'columns' at zero crossings at any density", () => {
            const { context, g } = createContext(GOLD_MEDALS, {
              ...CROWDED,
              labelLayout: 'columns',
              leaderLines: 'all',
            });

            renderPieLayer(context);

            // A column terminates every leader at the same x, so preserving y-order is enough
            // to keep them nested however dense the pie gets. That is the whole reason columns
            // remain the right answer above the ring's ceiling.
            expect(countLeaderCrossings(g)).toBe(0);
          });

          it('keeps labels in wedge order around the ring', () => {
            const { context, g } = createContext(GOLD_MEDALS, {
              ...CROWDED,
              labelLayout: 'perimeter',
            });

            renderPieLayer(context);

            // The invariant ARCH-279 settled on as non-negotiable: reading the ring around
            // must read the wedges around. Within a hemisphere the ring runs monotonically in
            // y, so wedge order == y order (reversed on the left, which sweeps bottom-to-top).
            const wedgeRank = new Map(GOLD_MEDALS.map((d, i) => [d.label, i]));
            const hemispheres = new Map<number, { rank: number; y: number }[]>([
              [-1, []],
              [1, []],
            ]);
            for (const [slice, [x, y]] of anchorsOf(g)) {
              hemispheres.get(x >= 0 ? 1 : -1)?.push({ rank: wedgeRank.get(slice) ?? -1, y });
            }

            for (const entries of hemispheres.values()) {
              entries.sort((a, b) => a.y - b.y);
              const ranks = entries.map(entry => entry.rank);
              const ascending = [...ranks].sort((a, b) => a - b);
              expect(ranks).toEqual(
                ranks[0] === ascending[0] ? ascending : [...ascending].reverse()
              );
            }
          });
        });
      });

      describe('the small-slice rule in outside mode', () => {
        // 'Tiny' sweeps ~0.006 rad — far below the 0.15 inside-mode default.
        const WITH_SLIVER: NgePieDataPoint[] = [
          { label: 'A', value: 500 },
          { label: 'B', value: 500 },
          { label: 'Tiny', value: 1 },
        ];

        it('labels a sliver the inside default would have dropped', () => {
          const { context, g } = createContext(WITH_SLIVER, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          expect(labelledSlices(g)).toContain('Tiny');
        });

        it('still drops that sliver in inside mode', () => {
          const { context, g } = createContext(WITH_SLIVER, { showLabels: true });

          renderPieLayer(context);

          expect(labelledSlices(g)).not.toContain('Tiny');
        });

        it('honours an explicit minLabelAngle in outside mode', () => {
          const { context, g } = createContext(WITH_SLIVER, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            minLabelAngle: 0.5,
            showLabels: true,
          });

          renderPieLayer(context);

          expect(labelledSlices(g).sort()).toEqual(['A', 'B']);
        });

        it('never labels a zero-sweep slice, even at a threshold of 0', () => {
          // A zero value draws no wedge at all — text on it would name nothing visible.
          const { context, g } = createContext(
            [
              { label: 'A', value: 50 },
              { label: 'B', value: 50 },
              { label: 'Empty', value: 0 },
            ],
            {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              minLabelAngle: 0,
              showLabels: true,
            }
          );

          renderPieLayer(context);

          expect(labelledSlices(g)).not.toContain('Empty');
        });
      });

      describe('colour + typography', () => {
        it('defaults to the surface-tracking token, NOT the on-arc absolute pair', () => {
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);

          // The regression this guards: reusing `theme.label` would resolve every outside
          // label to the ABSOLUTE black/white pair — deliberately theme-independent, and so
          // unreadable on the surface in one theme or the other.
          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe(
            'var(--nge-chart-on-surface, #1d1b20)'
          );
        });

        it('never derives from the slice fill, however dark or light the slice', () => {
          const { context, g } = createContext(
            [
              { color: '#101820', label: 'A', value: 50 },
              { color: '#fff3c4', label: 'B', value: 50 },
            ],
            {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              showLabels: true,
              theme: {
                label: { color: '#000000', colorOnDark: '#ffffff' },
                labelOutside: { color: '#123456' },
              },
            }
          );

          renderPieLayer(context);

          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#123456');
          expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#123456');
        });

        it('still lets a per-datum labelColor win (the reference highlights one entry)', () => {
          const { context, g } = createContext(
            [
              { label: 'A', value: 50 },
              { label: 'China', labelColor: '#B71C1C', value: 50 },
            ],
            {
              labelGutter: GUTTER,
              labelPosition: 'outside',
              showLabels: true,
              theme: { labelOutside: { color: '#123456' } },
            }
          );

          renderPieLayer(context);

          expect(styleOf(labelByLabel(g, 'China'), 'fill')).toBe('#B71C1C');
          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#123456');
        });

        it('still lets a layer-config labelColor win', () => {
          const { context, g } = createContext(PIE, {
            labelColor: '#00ff00',
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
            theme: { labelOutside: { color: '#123456' } },
          });

          renderPieLayer(context);

          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#00ff00');
        });

        it('sizes outside labels from labelOutside, leaving the on-arc slice alone', () => {
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
            theme: {
              label: { fontSize: 9, fontWeight: 400 },
              labelOutside: { fontSize: 18, fontWeight: 800 },
            },
          });

          renderPieLayer(context);

          const label = labelByLabel(g, 'A');
          expect(styleOf(label, 'font-size')).toBe('18px');
          expect(styleOf(label, 'font-weight')).toBe('800');
        });

        it('re-applies a runtime labelOutside change to already-rendered labels', () => {
          const { context, g } = createContext(PIE, {
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
            theme: { labelOutside: { color: '#123456' } },
          });

          renderPieLayer(context);
          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#123456');

          context.theme = { labelOutside: { color: '#abcdef' } };
          renderPieLayer(context);

          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#abcdef');
        });
      });

      describe('join identity', () => {
        it('keeps a surviving slice its own label + leader node across a data change', () => {
          const MANY: NgePieDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
            label: `S${i}`,
            value: 1,
          }));

          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          const survivor = leaderedSlices(g)[0];
          const labelNode = labelByLabel(g, survivor);
          const leaderNode = leaderByLabel(g, survivor);

          // Re-roll every value — the whole layout shifts, but identity is keyed on label.
          const changed = MANY.map((point, i) => ({ ...point, value: 1 + (i % 4) }));
          context.config.data = changed;
          context.data = changed;
          renderPieLayer(context);

          expect(labelByLabel(g, survivor)).toBe(labelNode);
          expect(leaderByLabel(g, survivor)).toBe(leaderNode);
        });

        it('exits the label + leader of a removed slice', async () => {
          const MANY: NgePieDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
            label: `S${i}`,
            value: 1,
          }));

          const { context, g } = createContext(MANY, {
            dimensions: TALL,
            labelGutter: GUTTER,
            labelPosition: 'outside',
            showLabels: true,
          });

          renderPieLayer(context);
          const dropped = leaderedSlices(g)[0];

          const changed = MANY.filter(point => point.label !== dropped);
          context.config.data = changed;
          context.data = changed;
          renderPieLayer(context);
          await settle();

          expect(labelledSlices(g)).not.toContain(dropped);
          expect(leaderByLabel(g, dropped)).toBeNull();
        });
      });
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
