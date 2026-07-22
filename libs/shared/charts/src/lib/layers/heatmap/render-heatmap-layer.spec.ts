import type { ScaleBand } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  NgeChartConfig,
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  HeatmapColorScheme,
  HeatmapMark,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeHeatmapLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { createHeatmapChartScalesFactory } from '../../nge-chart/nge-chart.heatmap.helpers';
import { renderHeatmapLayer } from './render-heatmap-layer';

type HeatmapContext = NgeChartLayerContext<
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  NgeHeatmapLayerTheme | undefined
>;

interface ContextOptions {
  bubbleMaxRatio?: number;
  domain?: [number, number];
  labelFormat?: (value: number) => string;
  mark?: HeatmapMark;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  scheme?: HeatmapColorScheme;
  showValues?: boolean;
  theme?: NgeHeatmapLayerTheme;
  tooltip?: boolean;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const MARGINS = { bottom: 25, left: 45, right: 15, top: 15 };

/**
 * 2 rows (X / Y) × 3 cols (A / B / C). Cell X-C is empty (`null`). Non-null values
 * span 1 (X-A, the domain min) → 9 (Y-A, the domain max) so colour / radius scales
 * have a real range to encode.
 */
const GRID_DATA: NgeHeatmapDataPoint[] = [
  { col: 'A', row: 'X', value: 1 },
  { col: 'B', row: 'X', value: 5 },
  { col: 'C', row: 'X', value: null },
  { col: 'A', row: 'Y', value: 9 },
  { col: 'B', row: 'Y', value: 3 },
  { col: 'C', row: 'Y', value: 7 },
];

/**
 * Build a jsdom SVG bounds group + a layer context for the heatmap renderer, with
 * scales from the real factory so band positions match production. Cell geometry +
 * fill are applied synchronously so they read back verbatim without flushing.
 */
function createContext(
  data: NgeHeatmapDataPoint[],
  options: ContextOptions = {}
): { context: HeatmapContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeHeatmapLayerConfig = {
    bubbleMaxRatio: options.bubbleMaxRatio,
    data,
    domain: options.domain,
    labelFormat: options.labelFormat,
    mark: options.mark,
    onClick: options.onClick,
    renderer: renderHeatmapLayer,
    scheme: options.scheme,
    showValues: options.showValues,
    tooltip: options.tooltip
      ? {
          enabled: true,
          formatContent: (point: NgeHeatmapDataPoint) => ({
            label: `${point.row} · ${point.col}`,
            value: point.value ?? 0,
          }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    type: 'heatmap',
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createHeatmapChartScalesFactory({})(chartConfig, DIMENSIONS);

  const context: HeatmapContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: MARGINS,
    scales,
    theme: options.theme,
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

/** Count elements matching a mark class. */
function count(g: SVGGElement, className: string): number {
  return g.querySelectorAll(`.${className}`).length;
}

/** The cell rect for a (row, col). */
function cell(g: SVGGElement, row: string, col: string): SVGRectElement {
  const rect = g.querySelector<SVGRectElement>(
    `.nge-heatmap-cell[data-row="${row}"][data-col="${col}"]`
  );
  if (!rect) {
    throw new Error(`No heatmap cell for ${row} ${col}`);
  }
  return rect;
}

/** The bubble circle for a (row, col). */
function bubble(g: SVGGElement, row: string, col: string): SVGCircleElement {
  const circle = g.querySelector<SVGCircleElement>(
    `.nge-heatmap-bubble[data-row="${row}"][data-col="${col}"]`
  );
  if (!circle) {
    throw new Error(`No heatmap bubble for ${row} ${col}`);
  }
  return circle;
}

/**
 * Real-timer wait so d3 transitions run to completion. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env, so geometry that animates (bubble `r`)
 * and exit-removal are only observable after a real delay past the duration.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderHeatmapLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderHeatmapLayer(context);

      expect(count(g, 'nge-heatmap-cell')).toBe(0);
    });

    it('removes stale marks when the data empties', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);
      expect(count(g, 'nge-heatmap-cell')).toBe(6);

      context.data = [];
      renderHeatmapLayer(context);

      expect(count(g, 'nge-heatmap-cell')).toBe(0);
      expect(count(g, 'nge-heatmap-bubble')).toBe(0);
      expect(count(g, 'nge-heatmap-label')).toBe(0);
    });
  });

  describe('cell mode', () => {
    it('draws one cell per datum (including the empty cell) and no bubbles', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      expect(count(g, 'nge-heatmap-cell')).toBe(6);
      expect(count(g, 'nge-heatmap-bubble')).toBe(0);
    });

    it('sizes each cell to its band cell on the row/col scales', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      const xScale = context.scales.x as ScaleBand<string>;
      const yScale = context.scales.y as ScaleBand<string>;
      const rect = cell(g, 'X', 'A');
      expect(num(rect, 'x')).toBeCloseTo(xScale('A')!, 6);
      expect(num(rect, 'y')).toBeCloseTo(yScale('X')!, 6);
      expect(num(rect, 'width')).toBeCloseTo(xScale.bandwidth(), 6);
      expect(num(rect, 'height')).toBeCloseTo(yScale.bandwidth(), 6);
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);
      renderHeatmapLayer(context);

      expect(count(g, 'nge-heatmap-cell')).toBe(6);
    });
  });

  describe('color resolution (via .style)', () => {
    it('fills cells with a concrete color and differs min vs max (ramp resolved + interpolated)', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      // Under jsdom getComputedStyle→'' so the ramp endpoints resolve to concrete
      // hex fallbacks; a leftover var() here would prove the interpolation threw.
      const lowFill = styleOf(cell(g, 'X', 'A'), 'fill'); // value 1 (domain min)
      const highFill = styleOf(cell(g, 'Y', 'A'), 'fill'); // value 9 (domain max)
      expect(lowFill).toMatch(/^#|^rgb|^hsl/);
      expect(highFill).toMatch(/^#|^rgb|^hsl/);
      expect(lowFill).not.toBe(highFill);
    });

    it('fills an empty (null-value) cell with the resolved empty color', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      // var(--chart-surface-container-highest) → jsdom fallback #e0e0e0
      expect(styleOf(cell(g, 'X', 'C'), 'fill')).toBe('#e0e0e0');
    });

    it('honours a per-cell color override verbatim', () => {
      const data: NgeHeatmapDataPoint[] = [{ col: 'A', color: '#123456', row: 'X', value: 2 }];
      const { context, g } = createContext(data);

      renderHeatmapLayer(context);

      expect(styleOf(cell(g, 'X', 'A'), 'fill')).toBe('#123456');
    });

    it('uses a named scheme with distinct fills per value', () => {
      const { context, g } = createContext(GRID_DATA, { scheme: 'viridis' });

      renderHeatmapLayer(context);

      const lowFill = styleOf(cell(g, 'X', 'A'), 'fill'); // value 1
      const highFill = styleOf(cell(g, 'Y', 'A'), 'fill'); // value 9
      expect(lowFill).toMatch(/^#|^rgb|^hsl/);
      expect(highFill).toMatch(/^#|^rgb|^hsl/);
      expect(lowFill).not.toBe(highFill);
    });
  });

  describe('data-change recolor', () => {
    it('recolors survivor cells via the update transition (not a synchronous snap)', async () => {
      const { context, g } = createContext(
        [
          { col: 'A', row: 'X', value: 1 },
          { col: 'B', row: 'X', value: 9 },
        ],
        { domain: [1, 9] }
      );

      renderHeatmapLayer(context);
      await settle();
      const before = styleOf(cell(g, 'X', 'A'), 'fill'); // value 1 → ramp min

      // Same keys, swapped values → every cell is a survivor (no enter/exit). The new
      // fill must arrive via the update transition: immediately after the re-render the
      // cell still shows the OLD color (a synchronous snap would already be the new one).
      context.data = [
        { col: 'A', row: 'X', value: 9 },
        { col: 'B', row: 'X', value: 1 },
      ];
      renderHeatmapLayer(context);
      expect(styleOf(cell(g, 'X', 'A'), 'fill')).toBe(before);

      await settle();
      // …then transitions to value 9's ramp color.
      expect(styleOf(cell(g, 'X', 'A'), 'fill')).not.toBe(before);
    });
  });

  describe('bubble mode', () => {
    it('draws one bubble per non-null datum and no cells', async () => {
      const { context, g } = createContext(GRID_DATA, { mark: 'bubble' });

      renderHeatmapLayer(context);
      await settle();

      // Five non-null cells → five bubbles; the empty cell is omitted.
      expect(count(g, 'nge-heatmap-bubble')).toBe(5);
      expect(count(g, 'nge-heatmap-cell')).toBe(0);
    });

    it('grows a larger radius for a larger value', async () => {
      const { context, g } = createContext(GRID_DATA, { mark: 'bubble' });

      renderHeatmapLayer(context);
      await settle();

      const low = bubble(g, 'Y', 'B'); // value 3
      const high = bubble(g, 'Y', 'A'); // value 9
      expect(num(high, 'r')).toBeGreaterThan(num(low, 'r'));
      expect(num(low, 'r')).toBeGreaterThan(0);
    });

    it('leaves no leaked cells after toggling from cell to bubble', async () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);
      expect(count(g, 'nge-heatmap-cell')).toBe(6);
      // Let the initial paint settle (as it would across frames) before toggling.
      await settle();

      context.config = { ...context.config, mark: 'bubble' };
      renderHeatmapLayer(context);
      await settle();

      // The now-inactive cell join exits cleanly — no leaked cells.
      expect(count(g, 'nge-heatmap-cell')).toBe(0);
      expect(count(g, 'nge-heatmap-bubble')).toBe(5);
    });
  });

  describe('value labels', () => {
    it('renders a value label per non-null cell when showValues is set', () => {
      const { context, g } = createContext(GRID_DATA, { showValues: true });

      renderHeatmapLayer(context);

      // Five non-null cells → five labels (the empty cell has no value to show).
      expect(count(g, 'nge-heatmap-label')).toBe(5);
      const labels = Array.from(g.querySelectorAll('.nge-heatmap-label')).map(
        node => node.textContent
      );
      expect(labels).toContain('9');
      expect(labels).toContain('1');
    });

    it('omits labels by default', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      expect(count(g, 'nge-heatmap-label')).toBe(0);
    });

    it('auto-contrasts the label color: light text on dark cells, dark on light', () => {
      // Domain [0, 100]: value 0 → pale rampFrom (light cell) → dark label; value 100 →
      // saturated rampTo (dark cell) → light label. Keeps values legible across the ramp.
      const data: NgeHeatmapDataPoint[] = [
        { col: 'A', row: 'X', value: 0 },
        { col: 'B', row: 'X', value: 100 },
      ];
      const { context, g } = createContext(data, { domain: [0, 100], showValues: true });

      renderHeatmapLayer(context);

      const labels = Array.from(g.querySelectorAll<SVGTextElement>('.nge-heatmap-label'));
      const onLightCell = labels.find(node => node.textContent === '0')!;
      const onDarkCell = labels.find(node => node.textContent === '100')!;
      expect(styleOf(onLightCell, 'fill')).toBe('var(--chart-on-surface)');
      expect(styleOf(onDarkCell, 'fill')).toBe('var(--chart-on-primary)');
    });
  });

  describe('interaction', () => {
    it('leaves cells non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);

      expect(styleOf(cell(g, 'X', 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered cell to the tooltip with its row·col / value', () => {
      const { context, g, onTooltip } = createContext(GRID_DATA, { tooltip: true });

      renderHeatmapLayer(context);
      cell(g, 'Y', 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(3);
      expect(event.content.label).toBe('Y · B');
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(GRID_DATA, { tooltip: true });

      renderHeatmapLayer(context);
      const rect = cell(g, 'X', 'A');
      rect.dispatchEvent(new MouseEvent('mouseenter'));
      rect.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked cell and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(GRID_DATA, { onClick });

      renderHeatmapLayer(context);
      cell(g, 'Y', 'A').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      // 'Y','A' is index 3 in GRID_DATA, value 9.
      expect(onClick.mock.calls[0][0].index).toBe(3);
      expect(onClick.mock.calls[0][0].data.value).toBe(9);
    });
  });

  describe('negative values', () => {
    it('maps color by signed value (negative differs from positive of equal magnitude)', () => {
      const signed: NgeHeatmapDataPoint[] = [
        { col: 'A', row: 'X', value: -8 },
        { col: 'B', row: 'X', value: 0 },
        { col: 'C', row: 'X', value: 8 },
      ];
      const { context, g } = createContext(signed);

      renderHeatmapLayer(context);

      // Signed color mapping: -8 (domain min) and +8 (domain max) resolve differently.
      expect(styleOf(cell(g, 'X', 'A'), 'fill')).not.toBe(styleOf(cell(g, 'X', 'C'), 'fill'));
    });

    it('sizes bubbles by |value| (equal magnitude → equal radius)', async () => {
      const signed: NgeHeatmapDataPoint[] = [
        { col: 'A', row: 'X', value: -8 },
        { col: 'B', row: 'X', value: 8 },
        { col: 'C', row: 'X', value: 2 },
      ];
      const { context, g } = createContext(signed, { mark: 'bubble' });

      renderHeatmapLayer(context);
      await settle();

      const neg = bubble(g, 'X', 'A'); // |-8| = 8
      const pos = bubble(g, 'X', 'B'); // 8
      const small = bubble(g, 'X', 'C'); // 2
      expect(num(neg, 'r')).toBeCloseTo(num(pos, 'r'), 6);
      expect(num(pos, 'r')).toBeGreaterThan(num(small, 'r'));
    });
  });

  describe('color scale edge cases', () => {
    it('threads a rampMid 3-stop ramp distinct from the 2-stop ramp', () => {
      const data: NgeHeatmapDataPoint[] = [
        { col: 'A', row: 'X', value: 0 },
        { col: 'B', row: 'X', value: 5 },
        { col: 'C', row: 'X', value: 10 },
      ];

      const twoStop = createContext(data);
      renderHeatmapLayer(twoStop.context);
      const twoStopMid = styleOf(cell(twoStop.g, 'X', 'B'), 'fill'); // domain midpoint

      const threeStop = createContext(data, { theme: { cell: { rampMid: '#00c853' } } });
      renderHeatmapLayer(threeStop.context);
      const threeStopMid = styleOf(cell(threeStop.g, 'X', 'B'), 'fill');

      expect(threeStopMid).toMatch(/^#|^rgb|^hsl/);
      expect(threeStopMid).not.toBe(twoStopMid);
    });

    it('clamps the color mapping to an explicit domain override', () => {
      const data: NgeHeatmapDataPoint[] = [
        { col: 'A', row: 'X', value: 10 },
        { col: 'B', row: 'X', value: 20 }, // beyond the domain max → clamps to 10's color
        { col: 'C', row: 'X', value: 0 },
      ];
      const { context, g } = createContext(data, { domain: [0, 10] });

      renderHeatmapLayer(context);

      expect(styleOf(cell(g, 'X', 'B'), 'fill')).toBe(styleOf(cell(g, 'X', 'A'), 'fill'));
      expect(styleOf(cell(g, 'X', 'C'), 'fill')).not.toBe(styleOf(cell(g, 'X', 'A'), 'fill'));
    });

    it('falls back to the ramp for bubble fill when theme.bubble.color is empty', () => {
      const { context, g } = createContext(GRID_DATA, { mark: 'bubble' });

      renderHeatmapLayer(context);

      // Default theme.bubble.color is '' → bubble fill is the per-value ramp color.
      const lowFill = styleOf(bubble(g, 'X', 'A'), 'fill'); // value 1
      const highFill = styleOf(bubble(g, 'Y', 'A'), 'fill'); // value 9
      expect(lowFill).toMatch(/^#|^rgb|^hsl/);
      expect(highFill).toMatch(/^#|^rgb|^hsl/);
      expect(lowFill).not.toBe(highFill);
    });
  });

  describe('rapid mark re-toggle', () => {
    it('recovers survivor opacity to 1 (no cells stranded washed-out)', async () => {
      const { context, g } = createContext(GRID_DATA);

      renderHeatmapLayer(context);
      await settle(); // initial cell paint fully opaque

      // Toggle to bubble → the 6 cells begin exiting (fade over exitMs 200ms)…
      context.config = { ...context.config, mark: 'bubble' };
      renderHeatmapLayer(context);
      await settle(120); // …interrupt them mid-exit-fade (120ms < exitMs 200)

      // Toggle back before the exit completes → the frozen cells match by key as
      // survivors; the update path must re-assert full opacity, not leave them washed out.
      context.config = { ...context.config, mark: 'cell' };
      renderHeatmapLayer(context);
      await settle();

      const cells = Array.from(g.querySelectorAll<SVGRectElement>('.nge-heatmap-cell'));
      expect(cells).toHaveLength(6);
      cells.forEach(rect => expect(styleOf(rect, 'opacity')).toBe('1'));
    });
  });
});
