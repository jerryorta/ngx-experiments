import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type {
  NgeHierarchyDatum,
  NgeProportionalLayerConfig,
  NgeProportionalLayout,
  NgeProportionalMark,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeProportionalLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderProportionalLayer } from './render-proportional-layer';

type ProportionalContext = NgeChartLayerContext<
  NgeHierarchyDatum,
  NgeProportionalLayerConfig,
  NgeProportionalLayerTheme | undefined
>;

interface ContextOptions {
  columns?: number;
  formatLabel?: (d: NgeHierarchyDatum) => string;
  labelColor?: string;
  layout?: NgeProportionalLayout;
  mark?: NgeProportionalMark;
  minLabelSize?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padding?: number;
  rows?: number;
  seriesColors?: string[];
  showLabels?: boolean;
  theme?: NgeProportionalLayerTheme;
  tooltip?: boolean;
  valuePerCell?: number;
}

// 300x300 bounds — round numbers throughout.
const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 300,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 320,
};

/** A=100 (max), B=25 — a 4:1 value ratio, so a 2:1 linear ratio if AREA is proportional. */
const AREAS: NgeHierarchyDatum[] = [
  { label: 'A', value: 100 },
  { label: 'B', value: 25 },
];

function createContext(
  data: NgeHierarchyDatum[],
  options: ContextOptions = {}
): { context: ProportionalContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeProportionalLayerConfig = {
    columns: options.columns,
    data,
    formatLabel: options.formatLabel,
    labelColor: options.labelColor,
    layout: options.layout,
    mark: options.mark,
    minLabelSize: options.minLabelSize,
    onClick: options.onClick,
    padding: options.padding,
    renderer: renderProportionalLayer,
    rows: options.rows,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    type: 'proportional',
    valuePerCell: options.valuePerCell,
  };

  // The layer ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: ProportionalContext = {
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
          formatContent: (d: NgeHierarchyDatum) => ({ label: d.label, value: d.value ?? 0 }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/**
 * Real-timer wait so d3 transitions run to completion. The `d` attribute is applied via an
 * `attrTween` (never synchronously), so a mark's path string is only observable after a real
 * delay past the enter duration (300ms). Fills / handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function marks(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-proportional-mark'));
}

function marksFor(g: SVGGElement, label: string): SVGPathElement[] {
  return Array.from(
    g.querySelectorAll<SVGPathElement>(`.nge-proportional-mark[data-label="${label}"]`)
  );
}

function markFor(g: SVGGElement, label: string): SVGPathElement {
  const [first] = marksFor(g, label);
  if (!first) {
    throw new Error(`No proportional mark for label "${label}"`);
  }
  return first;
}

function labels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-proportional-label'));
}

/**
 * The linear size a circle path encodes. `markPath` writes a circle as two half-arcs whose
 * radius is the first arc parameter, so the diameter is twice that.
 */
function circleDiameterOf(path: SVGPathElement): number {
  const match = /^M[-\d.]+,[-\d.]+ a([\d.]+),/.exec(path.getAttribute('d') ?? '');
  if (!match) {
    throw new Error(`Not a circle path: ${path.getAttribute('d')}`);
  }
  return Number(match[1]) * 2;
}

/**
 * The linear size a half-circle path encodes. `markPath` writes it as one absolute arc whose
 * radius is the first arc parameter, so the diameter is twice that.
 */
function halfCircleDiameterOf(path: SVGPathElement): number {
  const match = /^M[-\d.]+,[-\d.]+ A([\d.]+),/.exec(path.getAttribute('d') ?? '');
  if (!match) {
    throw new Error(`Not a half-circle path: ${path.getAttribute('d')}`);
  }
  return Number(match[1]) * 2;
}

/** The side length a square path encodes — the horizontal run of its first edge. */
function squareSideOf(path: SVGPathElement): number {
  const match = /^M[-\d.]+,[-\d.]+ h([\d.]+)/.exec(path.getAttribute('d') ?? '');
  if (!match) {
    throw new Error(`Not a square path: ${path.getAttribute('d')}`);
  }
  return Number(match[1]);
}

describe('renderProportionalLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data / zero-max guards', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderProportionalLayer(context);

      expect(marks(g)).toHaveLength(0);
    });

    it('is a no-op when every value is zero or negative', () => {
      const { context, g } = createContext([
        { label: 'A', value: -5 },
        { label: 'B', value: 0 },
      ]);

      renderProportionalLayer(context);

      expect(marks(g)).toHaveLength(0);
    });

    it('clamps a negative value to a zero-size mark (no NaN)', async () => {
      const { context, g } = createContext([
        { label: 'A', value: -10 },
        { label: 'B', value: 50 },
      ]);

      renderProportionalLayer(context);
      await settle();

      const d = markFor(g, 'A').getAttribute('d') ?? '';
      expect(d).not.toContain('NaN');
      expect(circleDiameterOf(markFor(g, 'A'))).toBe(0);
    });
  });

  describe('area-proportional sizing', () => {
    // 300px wide / 2 marks = 150px slots; minus 2px padding → a 148px max diameter, which is
    // under the 300px height, so width binds. A is the max value and takes it in full.
    it.each([
      ['circle' as const, circleDiameterOf],
      ['half-circle' as const, halfCircleDiameterOf],
      ['square' as const, squareSideOf],
    ])('sizes %s marks by the square root of the value ratio', async (mark, measure) => {
      const { context, g } = createContext(AREAS, { mark });

      renderProportionalLayer(context);
      await settle();

      const a = measure(markFor(g, 'A'));
      const b = measure(markFor(g, 'B'));

      expect(a).toBeCloseTo(148, 5);
      // value ratio 4:1 → AREA ratio 4:1 → linear ratio 2:1.
      expect(a / b).toBeCloseTo(2, 5);
    });

    it('sums an internal node’s children into its own magnitude', async () => {
      const { context, g } = createContext(
        [
          {
            children: [
              { label: 'A1', value: 60 },
              { label: 'A2', value: 40 },
            ],
            label: 'A',
          },
          { label: 'B', value: 25 },
        ],
        { mark: 'circle' }
      );

      renderProportionalLayer(context);
      await settle();

      // A sums to 100, so it behaves exactly like the flat 100 in AREAS.
      expect(circleDiameterOf(markFor(g, 'A')) / circleDiameterOf(markFor(g, 'B'))).toBeCloseTo(
        2,
        5
      );
    });

    it('draws a half-circle as a single arc rising from the plot floor', async () => {
      const { context, g } = createContext(AREAS, { mark: 'half-circle' });

      renderProportionalLayer(context);
      await settle();

      // Flat edge on the floor (y = boundedHeight), one arc, closed.
      expect(markFor(g, 'A').getAttribute('d')).toBe('M1,300 A74,74 0 0 1 149,300 Z');
    });
  });

  describe('layout', () => {
    it('spaces row marks evenly across the plot width', async () => {
      const { context, g } = createContext(AREAS, { mark: 'square' });

      renderProportionalLayer(context);
      await settle();

      // Slot centres at 75 and 225; each square is centred on its own slot.
      expect(markFor(g, 'A').getAttribute('d')).toBe('M1,76 h148 v148 h-148 Z');
      expect(markFor(g, 'B').getAttribute('d')).toBe('M188,113 h74 v74 h-74 Z');
    });

    it('stacks nested marks on a shared centre and bottom baseline', async () => {
      const { context, g } = createContext(AREAS, { layout: 'nested', mark: 'square' });

      renderProportionalLayer(context);
      await settle();

      // maxSize = min(300, 300) = 300 for A; B is half that. Both bottom edges sit at y = 300.
      expect(markFor(g, 'A').getAttribute('d')).toBe('M0,0 h300 v300 h-300 Z');
      expect(markFor(g, 'B').getAttribute('d')).toBe('M75,150 h150 v150 h-150 Z');
    });

    it('emits nested marks largest-first so the smaller ones paint on top', () => {
      const { context, g } = createContext(
        [
          { label: 'small', value: 1 },
          { label: 'big', value: 100 },
        ],
        { layout: 'nested', mark: 'circle' }
      );

      renderProportionalLayer(context);

      expect(marks(g).map(m => m.getAttribute('data-label'))).toEqual(['big', 'small']);
    });
  });

  describe('grid (waffle)', () => {
    it('fills one cell per percentage point and pads the remainder', () => {
      const { context, g } = createContext(
        [
          { label: 'A', value: 60 },
          { label: 'B', value: 30 },
        ],
        { mark: 'grid' }
      );

      renderProportionalLayer(context);

      // Total 90 over 100 cells ⇒ 0.9 per cell ⇒ A takes 67, B takes 33 — the grid fills
      // exactly, because valuePerCell defaults to total / (rows * columns).
      expect(marks(g)).toHaveLength(100);
      expect(marksFor(g, 'A')).toHaveLength(67);
      expect(marksFor(g, 'B')).toHaveLength(33);
      expect(marksFor(g, '')).toHaveLength(0);
    });

    it('honours an explicit valuePerCell and leaves the surplus empty', () => {
      const { context, g } = createContext([{ label: 'A', value: 40 }], {
        mark: 'grid',
        valuePerCell: 1,
      });

      renderProportionalLayer(context);

      expect(marksFor(g, 'A')).toHaveLength(40);
      // The 60 unfilled cells are drawn, not left as holes.
      expect(marksFor(g, '')).toHaveLength(60);
    });

    it('styles the unfilled remainder from theme.emptyCell', () => {
      const { context, g } = createContext([{ label: 'A', value: 10 }], {
        mark: 'grid',
        theme: { emptyCell: { color: '#eeeeee', opacity: 0.5 } },
        valuePerCell: 1,
      });

      renderProportionalLayer(context);

      const [empty] = marksFor(g, '');
      expect(styleOf(empty, 'fill')).toBe('#eeeeee');
      expect(styleOf(empty, 'opacity')).toBe('0.5');
      expect(styleOf(empty, 'cursor')).toBe('default');
    });

    it('respects custom rows / columns and keeps the cells square', async () => {
      const { context, g } = createContext([{ label: 'A', value: 10 }], {
        columns: 5,
        mark: 'grid',
        padding: 0,
        rows: 2,
      });

      renderProportionalLayer(context);
      await settle();

      expect(marks(g)).toHaveLength(10);
      // 300/5 = 60 wide, 300/2 = 150 tall → the smaller extent wins so cells stay square.
      expect(squareSideOf(markFor(g, 'A'))).toBe(60);
    });

    it('fills from the bottom-left upward', async () => {
      const { context, g } = createContext([{ label: 'A', value: 1 }], {
        columns: 2,
        mark: 'grid',
        padding: 0,
        rows: 2,
        valuePerCell: 1,
      });

      renderProportionalLayer(context);
      await settle();

      // Cell 0 is the bottom-left: a 150px cell whose top edge sits at y = 150.
      expect(markFor(g, 'A').getAttribute('d')).toBe('M0,150 h150 v150 h-150 Z');
    });

    it('never exceeds the cell budget when the data overflows it', () => {
      const { context, g } = createContext([{ label: 'A', value: 500 }], {
        mark: 'grid',
        valuePerCell: 1,
      });

      renderProportionalLayer(context);

      expect(marks(g)).toHaveLength(100);
      expect(marksFor(g, 'A')).toHaveLength(100);
    });
  });

  describe('packed', () => {
    it('draws one circle per leaf, inside the plot bounds', async () => {
      const { context, g } = createContext(
        [
          { label: 'A', value: 100 },
          { label: 'B', value: 50 },
          { label: 'C', value: 25 },
        ],
        { mark: 'packed' }
      );

      renderProportionalLayer(context);
      await settle();

      const drawn = marks(g);
      expect(drawn).toHaveLength(3);
      for (const path of drawn) {
        const diameter = circleDiameterOf(path);
        expect(diameter).toBeGreaterThan(0);
        expect(diameter).toBeLessThanOrEqual(300);
      }
      // Area is proportional to value, so the 4:1 pair is a 2:1 pair of diameters.
      expect(circleDiameterOf(markFor(g, 'A')) / circleDiameterOf(markFor(g, 'C'))).toBeCloseTo(
        2,
        5
      );
    });

    it('draws only leaves and colours them by their top-level branch', () => {
      const { context, g } = createContext(
        [
          {
            children: [
              { label: 'A1', value: 60 },
              { label: 'A2', value: 40 },
            ],
            label: 'A',
          },
          { children: [{ label: 'B1', value: 30 }], label: 'B' },
        ],
        { mark: 'packed', seriesColors: ['#111111', '#222222'] }
      );

      renderProportionalLayer(context);

      // Three leaves; the two internal nodes are not drawn.
      expect(marks(g)).toHaveLength(3);
      expect(styleOf(markFor(g, 'A1'), 'fill')).toBe('#111111');
      expect(styleOf(markFor(g, 'A2'), 'fill')).toBe('#111111');
      expect(styleOf(markFor(g, 'B1'), 'fill')).toBe('#222222');
    });
  });

  describe('keyed join reconciliation', () => {
    it('keeps a survivor’s DOM node across a re-render', async () => {
      const { context, g } = createContext(AREAS, { mark: 'circle' });

      renderProportionalLayer(context);
      await settle();
      const before = markFor(g, 'A');

      renderProportionalLayer(context);
      await settle();

      expect(markFor(g, 'A')).toBe(before);
    });

    it('enters a new datum and exits a removed one', async () => {
      const { context, g } = createContext(AREAS, { mark: 'circle' });

      renderProportionalLayer(context);
      await settle();

      const next: NgeHierarchyDatum[] = [
        { label: 'A', value: 100 },
        { label: 'C', value: 25 },
      ];
      renderProportionalLayer({
        ...context,
        config: { ...context.config, data: next },
        data: next,
      });
      await settle();

      expect(marksFor(g, 'C')).toHaveLength(1);
      expect(marksFor(g, 'B')).toHaveLength(0);
    });

    it('resizes a survivor when its value changes', async () => {
      const { context, g } = createContext(AREAS, { mark: 'circle' });

      renderProportionalLayer(context);
      await settle();
      const before = circleDiameterOf(markFor(g, 'B'));

      const next: NgeHierarchyDatum[] = [
        { label: 'A', value: 100 },
        { label: 'B', value: 100 },
      ];
      renderProportionalLayer({
        ...context,
        config: { ...context.config, data: next },
        data: next,
      });
      await settle();

      expect(circleDiameterOf(markFor(g, 'B'))).toBeGreaterThan(before);
    });

    it('adds and removes waffle cells at the changed category’s tail', async () => {
      const { context, g } = createContext([{ label: 'A', value: 10 }], {
        mark: 'grid',
        valuePerCell: 1,
      });

      renderProportionalLayer(context);
      await settle();

      const next: NgeHierarchyDatum[] = [{ label: 'A', value: 15 }];
      renderProportionalLayer({
        ...context,
        config: { ...context.config, data: next },
        data: next,
      });
      await settle();

      expect(marksFor(g, 'A')).toHaveLength(15);
      expect(marks(g)).toHaveLength(100);
    });
  });

  describe('fill resolution', () => {
    it('prefers a per-datum color over seriesColors and the theme palette', () => {
      const data: NgeHierarchyDatum[] = [
        { color: '#ff0000', label: 'A', value: 100 },
        { label: 'B', value: 25 },
      ];
      const { context, g } = createContext(data, {
        seriesColors: ['#00ff00', '#0000ff'],
      });

      renderProportionalLayer(context);

      expect(styleOf(markFor(g, 'A'), 'fill')).toBe('#ff0000');
      expect(styleOf(markFor(g, 'B'), 'fill')).toBe('#0000ff');
    });

    it('cycles the palette when there are more marks than colors', () => {
      const data: NgeHierarchyDatum[] = [
        { label: 'A', value: 10 },
        { label: 'B', value: 10 },
        { label: 'C', value: 10 },
      ];
      const { context, g } = createContext(data, { seriesColors: ['#111111', '#222222'] });

      renderProportionalLayer(context);

      expect(styleOf(markFor(g, 'C'), 'fill')).toBe('#111111');
    });

    it('re-applies theme styles to already-rendered marks', () => {
      const { context, g } = createContext(AREAS);

      renderProportionalLayer(context);
      renderProportionalLayer({
        ...context,
        theme: { mark: { opacity: 0.25, stroke: '#123456', strokeWidth: 3 } },
      });

      const a = markFor(g, 'A');
      expect(styleOf(a, 'opacity')).toBe('0.25');
      expect(styleOf(a, 'stroke')).toBe('#123456');
      expect(styleOf(a, 'stroke-width')).toBe('3');
    });
  });

  describe('labels', () => {
    it('draws one label per mark when showLabels is set', async () => {
      const { context, g } = createContext(AREAS, { showLabels: true });

      renderProportionalLayer(context);
      await settle();

      expect(labels(g).map(l => l.textContent)).toEqual(['A', 'B']);
    });

    it('draws none when showLabels is unset', () => {
      const { context, g } = createContext(AREAS);

      renderProportionalLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('draws none for the grid mark at any setting', () => {
      const { context, g } = createContext([{ label: 'A', value: 100 }], {
        mark: 'grid',
        showLabels: true,
      });

      renderProportionalLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('suppresses a label on a mark narrower than minLabelSize', () => {
      // B's diameter is 74px, so a 100px floor drops it while A (148px) keeps its label.
      const { context, g } = createContext(AREAS, { minLabelSize: 100, showLabels: true });

      renderProportionalLayer(context);

      expect(labels(g).map(l => l.textContent)).toEqual(['A']);
    });

    it('re-asserts full opacity on a survivor synchronously', () => {
      const { context, g } = createContext(AREAS, { showLabels: true });

      renderProportionalLayer(context);
      // Second render lands mid-fade: survivors must be fully opaque without a transition.
      renderProportionalLayer(context);

      for (const label of labels(g)) {
        expect(styleOf(label, 'opacity')).toBe('1');
      }
    });

    it('formats the label with the summed magnitude', async () => {
      const { context, g } = createContext(
        [
          {
            children: [
              { label: 'A1', value: 60 },
              { label: 'A2', value: 40 },
            ],
            label: 'A',
          },
        ],
        { formatLabel: d => `${d.label}: ${d.value}`, showLabels: true }
      );

      renderProportionalLayer(context);
      await settle();

      expect(labels(g)[0].textContent).toBe('A: 100');
    });

    it('honours the layer-config label color over the theme', () => {
      const { context, g } = createContext(AREAS, { labelColor: '#abcdef', showLabels: true });

      renderProportionalLayer(context);

      expect(styleOf(labels(g)[0], 'fill')).toBe('#abcdef');
    });

    it('lets a per-datum labelColor win over the layer config', () => {
      const data: NgeHierarchyDatum[] = [
        { label: 'A', labelColor: '#fedcba', value: 100 },
        { label: 'B', value: 25 },
      ];
      const { context, g } = createContext(data, { labelColor: '#abcdef', showLabels: true });

      renderProportionalLayer(context);

      expect(styleOf(labels(g)[0], 'fill')).toBe('#fedcba');
    });
  });

  describe('tooltip', () => {
    it('emits a tooltip event on mouseenter, anchored at the mark', () => {
      const { context, g, onTooltip } = createContext(AREAS, { tooltip: true });

      renderProportionalLayer(context);
      markFor(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content).toEqual({ label: 'A', value: 100 });
      // Mark centre is x=75 in plot coords, +10 margin, centred under a 120px bubble.
      expect(event.position.x).toBe(25);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(AREAS, { tooltip: true });

      renderProportionalLayer(context);
      markFor(g, 'A').dispatchEvent(new MouseEvent('mouseleave'));

      expect((onTooltip.mock.calls[0][0] as NgeTooltipEvent).visible).toBe(false);
    });

    it('stays silent for a waffle’s empty cells', () => {
      const { context, g, onTooltip } = createContext([{ label: 'A', value: 10 }], {
        mark: 'grid',
        tooltip: true,
        valuePerCell: 1,
      });

      renderProportionalLayer(context);
      marksFor(g, '')[0].dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).not.toHaveBeenCalled();
    });

    it('sets a pointer cursor only on interactive marks', () => {
      const { context, g } = createContext(AREAS, { tooltip: true });

      renderProportionalLayer(context);

      expect(styleOf(markFor(g, 'A'), 'cursor')).toBe('pointer');
    });
  });

  describe('click', () => {
    it('reports the datum and its input index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(AREAS, { onClick });

      renderProportionalLayer(context);
      markFor(g, 'B').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0]).toMatchObject({
        data: { label: 'B', value: 25 },
        index: 1,
      });
    });

    it('ignores clicks on a waffle’s empty cells', () => {
      const onClick = jest.fn();
      const { context, g } = createContext([{ label: 'A', value: 10 }], {
        mark: 'grid',
        onClick,
        valuePerCell: 1,
      });

      renderProportionalLayer(context);
      marksFor(g, '')[0].dispatchEvent(new MouseEvent('click'));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('detaches the handler when onClick is removed', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(AREAS, { onClick });

      renderProportionalLayer(context);
      renderProportionalLayer({ ...context, config: { ...context.config, onClick: undefined } });
      markFor(g, 'A').dispatchEvent(new MouseEvent('click'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
