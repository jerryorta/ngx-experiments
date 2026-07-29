import { scaleBand, scaleLinear, scalePoint } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales, NgeCrosshairConfig } from '../base-layout';
import type { NgeChartDimensions } from '../chart.models';
import type { NgeChartLayerDefinition, NgeLineDataPoint, NgeScatterDataPoint } from '../config';
import type { NgeTooltipEvent } from '../tooltip';

import { clearGestureDragState, setGestureDragState } from '../gesture';
import { attachCrosshair } from './nge-chart-crosshair';

const ZERO_MARGINS = { bottom: 0, left: 0, right: 0, top: 0 };

const dimensions: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 300,
  margin: ZERO_MARGINS,
  width: 500,
};

/** Data at x = 0, 25, 50, 75, 100 → px 0, 125, 250, 375, 500 on a 0..100 → 0..500 scale. */
const DATA_XS = [0, 25, 50, 75, 100];

function lineLayer(xs: number[] = DATA_XS): NgeChartLayerDefinition {
  const data: NgeLineDataPoint[] = xs.map(x => ({ seriesId: 'A', x, y: x }));
  return { data, type: 'line' } as NgeChartLayerDefinition;
}

function linearScales(): NgeChartScales {
  return {
    x: scaleLinear().domain([0, 100]).range([0, 500]),
    y: scaleLinear().domain([0, 100]).range([300, 0]),
  };
}

/**
 * Attach the crosshair to a hand-built svg with zero margins, so `clientX` maps
 * 1:1 to plot pixels (jsdom `getBoundingClientRect` is all-zero).
 */
function setup(
  crosshair: NgeCrosshairConfig | undefined,
  options: {
    layers?: NgeChartLayerDefinition[];
    scales?: NgeChartScales;
    xAxisTicks?: number;
  } = {}
): { events: NgeTooltipEvent[]; guide: () => null | SVGGElement; svg: SVGSVGElement } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(bounds);
  document.body.appendChild(svg);

  const events: NgeTooltipEvent[] = [];

  attachCrosshair({
    bounds: select(bounds),
    clipPath: null,
    crosshair,
    dimensions,
    layers: options.layers ?? [lineLayer()],
    margins: ZERO_MARGINS,
    scales: options.scales ?? linearScales(),
    svg: select(svg),
    tooltipHandler: { onTooltip: event => events.push(event) },
    xAxisTicks: options.xAxisTicks,
  });

  return {
    events,
    guide: () => bounds.querySelector<SVGGElement>('.nge-chart-crosshair'),
    svg,
  };
}

/** jsdom (Jest 29) lacks PointerEvent; a MouseEvent reaches the same registration. */
function move(svg: SVGSVGElement, clientX: number, clientY = 150): void {
  svg.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
}

function guideLineX(guide: null | SVGGElement): null | number {
  const line = guide?.querySelector('line');
  return line ? Number(line.getAttribute('x1')) : null;
}

function focusDotXs(guide: null | SVGGElement): number[] {
  return Array.from(guide?.querySelectorAll('circle') ?? []).map(c => Number(c.getAttribute('cx')));
}

function focusDotYs(guide: null | SVGGElement): number[] {
  return Array.from(guide?.querySelectorAll('circle') ?? []).map(c => Number(c.getAttribute('cy')));
}

function focusDotFills(guide: null | SVGGElement): string[] {
  return Array.from(guide?.querySelectorAll('circle') ?? []).map(c => c.style.fill);
}

/** The horizontal guide's y — the SECOND line, since the x guide is appended first. */
function guideLineY(guide: null | SVGGElement): null | number {
  const lines = Array.from(guide?.querySelectorAll('line') ?? []);
  const horizontal = lines[lines.length - 1];
  return horizontal ? Number(horizontal.getAttribute('y1')) : null;
}

function scatterLayer(
  data: NgeScatterDataPoint[],
  seriesColors?: string[]
): NgeChartLayerDefinition {
  return { data, seriesColors, type: 'scatter' } as NgeChartLayerDefinition;
}

/**
 * A band x-scale over `categories` with no padding, so a category's rect and
 * centre are round numbers: two categories over 0..500 give bands 0..250 / 250..500
 * centred at 125 / 375.
 */
function bandScales(categories: string[]): NgeChartScales {
  return {
    x: scaleBand<string>().domain(categories).range([0, 500]).padding(0),
    y: scaleLinear().domain([0, 100]).range([300, 0]),
  };
}

function barLayer(
  data: { color?: string; label: string; value: number }[],
  orientation?: 'horizontal' | 'vertical'
): NgeChartLayerDefinition {
  return { data, orientation, type: 'bar' } as unknown as NgeChartLayerDefinition;
}

function groupedBarLayer(
  data: { color?: string; groupId: string; label: string; value: number }[]
): NgeChartLayerDefinition {
  return { data, type: 'grouped-bar' } as unknown as NgeChartLayerDefinition;
}

function stackedBarLayer(
  data: { category: string; color?: string; seriesId: string; value: number }[],
  extra: Record<string, unknown> = {}
): NgeChartLayerDefinition {
  return { data, type: 'stacked-bar', ...extra } as unknown as NgeChartLayerDefinition;
}

function overlayLayer(extra: Record<string, unknown>): NgeChartLayerDefinition {
  return { type: 'overlay', ...extra } as unknown as NgeChartLayerDefinition;
}

function lastRows(events: NgeTooltipEvent[]): { color: string; label: string; value: number }[] {
  return (events[events.length - 1].content.rows ?? []) as {
    color: string;
    label: string;
    value: number;
  }[];
}

describe('attachCrosshair', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("snap: 'datum' (default)", () => {
    it('snaps the guide to the nearest datum x', () => {
      const { guide, svg } = setup({ x: true });

      move(svg, 260); // between px 250 (x=50) and 375 (x=75) — nearer 250

      expect(guideLineX(guide())).toBe(250);
    });

    it('resolves an unset snap the same way as an explicit datum', () => {
      const implicit = setup({ x: true });
      const explicit = setup({ snap: 'datum', x: true });

      move(implicit.svg, 300);
      move(explicit.svg, 300);

      expect(guideLineX(implicit.guide())).toBe(guideLineX(explicit.guide()));
    });
  });

  describe("snap: 'tick'", () => {
    it('lands the guide on an axis tick position, not the nearest datum', () => {
      // ticks(5) over [0,100] → 0,20,40,60,80,100 → px 0,100,200,300,400,500.
      // Datum pixels are 0,125,250,375,500, so the two disagree everywhere but the ends.
      const { guide, svg } = setup({ snap: 'tick', x: true }, { xAxisTicks: 5 });

      move(svg, 260); // nearest tick px = 300; nearest datum px = 250

      expect(guideLineX(guide())).toBe(300);
    });

    it('is honoured — the same pointer yields a different guide x than datum snapping', () => {
      const datum = setup({ snap: 'datum', x: true }, { xAxisTicks: 5 });
      const tick = setup({ snap: 'tick', x: true }, { xAxisTicks: 5 });

      move(datum.svg, 260);
      move(tick.svg, 260);

      expect(guideLineX(datum.guide())).toBe(250);
      expect(guideLineX(tick.guide())).toBe(300);
    });

    it('honours the xAxisTicks hint, so the guide matches the rendered gridlines', () => {
      const coarse = setup({ snap: 'tick', x: true }, { xAxisTicks: 2 }); // 0,50,100 → px 0,250,500
      const fine = setup({ snap: 'tick', x: true }, { xAxisTicks: 10 }); // step 10 → px 0,50,...

      move(coarse.svg, 260);
      move(fine.svg, 260);

      expect(guideLineX(coarse.guide())).toBe(250);
      expect(guideLineX(fine.guide())).toBe(250);

      move(coarse.svg, 190);
      move(fine.svg, 190);

      expect(guideLineX(coarse.guide())).toBe(250);
      expect(guideLineX(fine.guide())).toBe(200);
    });

    it('keeps the focus dots and tooltip on the nearest DATUM, not the tick', () => {
      const { events, guide, svg } = setup(
        { shared: true, snap: 'tick', x: true },
        { xAxisTicks: 5 }
      );

      move(svg, 260);

      expect(guideLineX(guide())).toBe(300); // guide on the tick
      expect(focusDotXs(guide())).toEqual([250]); // dot on the datum (x=50)

      const last = events[events.length - 1];
      expect(last.visible).toBe(true);
      expect(last.content.label).toBe('50'); // header names the datum's x
      expect(last.content.rows).toEqual([{ color: expect.any(String), label: 'A', value: 50 }]);
    });

    it('coincides with datum snapping when ticks fall on the data', () => {
      // d3 picks NICE tick values, not the count it is handed: ticks(5) over [0,100]
      // steps by 20. Data on those same xs is the common real-world case.
      const onTicks = { layers: [lineLayer([0, 20, 40, 60, 80, 100])], xAxisTicks: 5 };
      const datum = setup({ shared: true, snap: 'datum', x: true }, onTicks);
      const tick = setup({ shared: true, snap: 'tick', x: true }, onTicks);

      move(datum.svg, 260);
      move(tick.svg, 260);

      expect(guideLineX(tick.guide())).toBe(guideLineX(datum.guide()));
      expect(focusDotXs(tick.guide())).toEqual(focusDotXs(datum.guide()));
    });

    it('centres on the category for a point scale, where every tick is a datum', () => {
      const scales: NgeChartScales = {
        x: scalePoint<string>().domain(['Q1', 'Q2', 'Q3', 'Q4']).range([0, 500]),
        y: scaleLinear().domain([0, 100]).range([300, 0]),
      };
      const layers = [
        {
          data: ['Q1', 'Q2', 'Q3', 'Q4'].map((x, i) => ({ seriesId: 'A', x, y: i * 10 })),
          type: 'line',
        } as NgeChartLayerDefinition,
      ];
      const { guide, svg } = setup({ snap: 'tick', x: true }, { layers, scales });

      move(svg, 180); // Q2 sits at px 166.67

      expect(guideLineX(guide())).toBeCloseTo(500 / 3, 5);
    });

    it('falls back to datum snapping when the axis yields no ticks', () => {
      const scales: NgeChartScales = {
        // An empty domain produces no ticks at all.
        x: scaleLinear().domain([]).range([0, 500]),
        y: scaleLinear().domain([0, 100]).range([300, 0]),
      };
      // Datum pixels come from this degenerate scale too, but the guide must still
      // draw rather than going inert.
      const { guide, svg } = setup({ snap: 'tick', x: true }, { scales });

      move(svg, 260);

      expect(guideLineX(guide())).not.toBeNull();
    });
  });

  describe('scatter hosts (2-D nearest point)', () => {
    // On the shared scales, x maps 0..100 → 0..500 and y maps 0..100 → 300..0.
    //   FAR_X  (x=30, y=10)  → px 150, py 270
    //   NEAR_Y (x=20, y=90)  → px 100, py 30
    // A pointer at (140, 40) is nearer FAR_X in x alone (140 → 150 beats 100) but
    // far nearer NEAR_Y in 2-D (≈41px against ≈230px). That disagreement is what
    // separates the point anchor from the bisector.
    const FAR_X: NgeScatterDataPoint = { seriesId: 'A', x: 30, y: 10 };
    const NEAR_Y: NgeScatterDataPoint = { seriesId: 'A', x: 20, y: 90 };

    it('anchors on the nearest point in 2-D, not the nearest x', () => {
      const { guide, svg } = setup({ x: true }, { layers: [scatterLayer([NEAR_Y, FAR_X])] });

      move(svg, 140, 40);

      expect(guideLineX(guide())).toBe(100); // NEAR_Y — the bisector would have said 150
    });

    it('lands BOTH guides on the resolved point', () => {
      const { guide, svg } = setup(
        { x: true, y: true },
        { layers: [scatterLayer([NEAR_Y, FAR_X])] }
      );

      move(svg, 140, 40);

      expect(guideLineX(guide())).toBe(100);
      // The point's py, not the pointer's 40 (scale interpolation lands a hair off 30).
      expect(guideLineY(guide())).toBeCloseTo(30, 5);
    });

    it('puts the focus dot on the point itself', () => {
      const { guide, svg } = setup({ x: true }, { layers: [scatterLayer([NEAR_Y, FAR_X])] });

      move(svg, 140, 40);

      expect(focusDotXs(guide())).toEqual([100]);
      expect(focusDotYs(guide())).toHaveLength(1);
      expect(focusDotYs(guide())[0]).toBeCloseTo(30, 5);
    });

    it('names the anchor point in the tooltip header and its own y in the row', () => {
      const { events, svg } = setup(
        { shared: true, x: true },
        { layers: [scatterLayer([NEAR_Y, FAR_X])] }
      );

      move(svg, 140, 40);

      const last = events[events.length - 1];
      expect(last.visible).toBe(true);
      expect(last.content.label).toBe('20');
      expect(last.content.rows).toEqual([{ color: expect.any(String), label: 'A', value: 90 }]);
    });

    it('joins other series that hold a point at the same x', () => {
      // Both series sit at x = 50 (px 250); A at py 60, B at py 240.
      const layers = [
        scatterLayer([
          { seriesId: 'A', x: 50, y: 80 },
          { seriesId: 'B', x: 50, y: 20 },
          { seriesId: 'C', x: 75, y: 30 },
        ]),
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250, 60); // right on A

      const last = events[events.length - 1];
      expect(last.content.rows?.map(r => r.label)).toEqual(['A', 'B']);
      expect(last.content.rows?.map(r => r.value)).toEqual([80, 20]);
    });

    it('emits a single row on continuous data, where no two series share an x', () => {
      const layers = [
        scatterLayer([
          { seriesId: 'A', x: 20, y: 80 },
          { seriesId: 'B', x: 21, y: 78 },
        ]),
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 100, 60);

      const last = events[events.length - 1];
      expect(last.content.rows?.map(r => r.label)).toEqual(['A']);
    });

    it('colours the swatch and dot from the palette, matching the rendered series', () => {
      const layers = [
        scatterLayer(
          [
            { seriesId: 'A', x: 20, y: 90 },
            { seriesId: 'B', x: 80, y: 90 },
          ],
          ['#111111', '#222222']
        ),
      ];
      const { events, guide, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 400, 30); // nearest is B

      expect(focusDotFills(guide())).toEqual(['#222222']);
      expect(events[events.length - 1].content.rows?.[0].color).toBe('#222222');
    });

    it("lets a per-datum colour win over the series' palette colour", () => {
      const layers = [
        scatterLayer([{ color: '#ff0000', seriesId: 'A', x: 20, y: 90 }], ['#111111']),
      ];
      const { events, guide, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 100, 30);

      expect(focusDotFills(guide())).toEqual(['#ff0000']);
      expect(events[events.length - 1].content.rows?.[0].color).toBe('#ff0000');
    });

    it("ignores snap: 'tick' — a tick is an x, and this anchor is a point", () => {
      const layers = [scatterLayer([NEAR_Y, FAR_X])];
      const datum = setup({ snap: 'datum', x: true }, { layers, xAxisTicks: 5 });
      const tick = setup({ snap: 'tick', x: true }, { layers, xAxisTicks: 5 });

      move(datum.svg, 140, 40);
      move(tick.svg, 140, 40);

      expect(guideLineX(tick.guide())).toBe(guideLineX(datum.guide()));
    });

    it('keeps the 1-D x reading when a line layer shares the chart', () => {
      // Composed hosts stay on the bisector until ARCH-263; the pointer that picks
      // NEAR_Y (px 100) on a scatter-only host must pick the nearer x here instead.
      const layers = [scatterLayer([NEAR_Y, FAR_X]), lineLayer([30])];
      const { guide, svg } = setup({ x: true }, { layers });

      move(svg, 140, 40);

      expect(guideLineX(guide())).toBe(150); // the line datum at x = 30
    });

    it('picks the exact nearest point at every position across the plot', () => {
      // A single hand-picked probe cannot tell a real 2-D anchor from an x-biased one
      // that happens to agree there, so sweep the whole plot and demand the exact
      // argmin at every position. This is the guard that would catch the anchor
      // silently degrading toward an x-only reading, or `find()` returning a merely
      // near-nearest point on some geometry.
      const data: NgeScatterDataPoint[] = [];
      for (let s = 0; s < 3; s++) {
        for (let i = 0; i < 22; i++) {
          data.push({
            seriesId: `S${s}`,
            x: ((i * 37 + s * 13) % 100) + s * 0.7,
            y: 50 + 30 * Math.sin(i * 0.9 + s * 1.4),
          });
        }
      }
      const scales = linearScales();
      const xOf = (x: number) => (scales.x as ReturnType<typeof scaleLinear>)(x) as number;
      const yOf = (y: number) => (scales.y as ReturnType<typeof scaleLinear>)(y) as number;
      const pixels = data.map(p => ({ px: xOf(p.x), py: yOf(p.y) }));

      const { guide, svg } = setup({ x: true }, { layers: [scatterLayer(data)] });

      let probes = 0;
      let mismatches = 0;
      for (let py = 5; py < dimensions.boundedHeight; py += 12) {
        for (let px = 5; px < dimensions.boundedWidth; px += 20) {
          move(svg, px, py);
          const dot = guide()?.querySelector('circle');
          if (!dot) {
            continue;
          }
          probes++;
          const gotX = Number(dot.getAttribute('cx'));
          const gotY = Number(dot.getAttribute('cy'));
          const d2 = (a: { px: number; py: number }) => (a.px - px) ** 2 + (a.py - py) ** 2;
          const best = pixels.reduce((b, p) => (d2(p) < d2(b) ? p : b));
          // Compare DISTANCES, not identity — ties are legitimately interchangeable.
          if (Math.abs(d2({ px: gotX, py: gotY }) - d2(best)) > 1e-6) {
            mismatches++;
          }
        }
      }

      expect(probes).toBeGreaterThan(500);
      expect(mismatches).toBe(0);
    });

    it('draws nothing and does not throw on an empty scatter host', () => {
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers: [scatterLayer([])] }
      );

      expect(() => move(svg, 250, 150)).not.toThrow();

      expect(focusDotXs(guide())).toEqual([]);
      expect(events[events.length - 1].visible).toBe(false);
    });
  });

  describe('shared tooltip', () => {
    it('emits one row per series that has a datum at the snapped x', () => {
      const layers = [
        {
          data: [
            { seriesId: 'A', x: 50, y: 10 },
            { seriesId: 'B', x: 50, y: 20 },
            { seriesId: 'C', x: 75, y: 30 },
          ],
          type: 'line',
        } as NgeChartLayerDefinition,
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250); // x = 50 — A and B have data here, C does not

      const last = events[events.length - 1];
      expect(last.content.rows?.map(r => r.label)).toEqual(['A', 'B']);
      expect(last.content.rows?.map(r => r.value)).toEqual([10, 20]);
    });

    it('leaves the tooltip host alone when shared is off', () => {
      const { events, svg } = setup({ x: true });
      const afterAttach = events.length;

      move(svg, 250);

      expect(events.length).toBe(afterAttach);
    });
  });

  describe('bar-family hosts (band x)', () => {
    const QUARTERS = ['Q1', 'Q2'];

    it('draws a guide and a shared tooltip on a bar-only chart', () => {
      const layers = [barLayer([{ label: 'Q1', value: 40 }])];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      // Before ARCH-263 a bar-only chart accepted the config and drew nothing.
      expect(guideLineX(guide())).toBe(125);
      expect(lastRows(events)).toEqual([
        { color: 'var(--nge-chart-primary)', label: 'Value', value: 40 },
      ]);
    });

    it('anchors on the band the pointer is over, not the nearest datum position', () => {
      const layers = [
        barLayer([
          { label: 'Q1', value: 40 },
          { label: 'Q2', value: 60 },
        ]),
      ];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 260); // just inside Q2's band (250..500)

      expect(guideLineX(guide())).toBe(375);
      expect(events[events.length - 1].content.label).toBe('Q2');
    });

    it('emits one row per group at the hovered category, in first-seen order', () => {
      const layers = [
        groupedBarLayer([
          { groupId: 'Active', label: 'Q1', value: 40 },
          { groupId: 'Closed', label: 'Q1', value: 25 },
          { groupId: 'Active', label: 'Q2', value: 10 },
        ]),
      ];
      const { events, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100); // Q1 — both groups have a bar here

      expect(lastRows(events).map(r => r.label)).toEqual(['Active', 'Closed']);
      expect(lastRows(events).map(r => r.value)).toEqual([40, 25]);
    });

    it('gives every grouped-bar series ONE colour, matching the renderer', () => {
      // The grouped-bar renderer fills from a single `theme.bar.color` — it does not
      // cycle a palette the way the stacked layer does, so neither does the swatch.
      const layers = [
        groupedBarLayer([
          { groupId: 'Active', label: 'Q1', value: 40 },
          { groupId: 'Closed', label: 'Q1', value: 25 },
        ]),
      ];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      expect(lastRows(events).map(r => r.color)).toEqual([
        'var(--nge-chart-primary)',
        'var(--nge-chart-primary)',
      ]);
      expect(focusDotFills(guide())).toEqual([
        'var(--nge-chart-primary)',
        'var(--nge-chart-primary)',
      ]);
    });

    it('lets a per-datum colour vary the swatch by category', () => {
      const layers = [
        barLayer([
          { color: '#ff0000', label: 'Q1', value: 40 },
          { label: 'Q2', value: 60 },
        ]),
      ];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100); // Q1 — the overridden bar
      expect(focusDotFills(guide())).toEqual(['#ff0000']);

      move(svg, 400); // Q2 — falls back to the layer colour
      expect(lastRows(events)[0].color).toBe('var(--nge-chart-primary)');
    });

    it('reports each stack segment its OWN value, not the running total', () => {
      const layers = [
        stackedBarLayer([
          { category: 'Q1', seriesId: 'S1', value: 30 },
          { category: 'Q1', seriesId: 'S2', value: 20 },
        ]),
      ];
      const { events, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      expect(lastRows(events).map(r => r.label)).toEqual(['S1', 'S2']);
      expect(lastRows(events).map(r => r.value)).toEqual([30, 20]);
    });

    it("puts a stack segment's focus dot at its cumulative top, not its own value", () => {
      const layers = [
        stackedBarLayer([
          { category: 'Q1', seriesId: 'S1', value: 30 },
          { category: 'Q1', seriesId: 'S2', value: 20 },
        ]),
      ];
      const { guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      // S1 spans [0,30] and S2 [30,50]; on a 0..100 → 300..0 scale that is y 210
      // and 150. Drawing S2 at its own value (20) would put it at 240, below the
      // segment it describes.
      expect(focusDotYs(guide())).toEqual([210, 150]);
    });

    it('cycles the stacked palette by series index, as the segments are filled', () => {
      const layers = [
        stackedBarLayer(
          [
            { category: 'Q1', seriesId: 'S1', value: 30 },
            { category: 'Q1', seriesId: 'S2', value: 20 },
          ],
          { seriesColors: ['#111111', '#222222'] }
        ),
      ];
      const { events, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      expect(lastRows(events).map(r => r.color)).toEqual(['#111111', '#222222']);
    });

    it('picks the band the pointer is INSIDE under variable Marimekko widths', () => {
      // Weights 80/10/10 over 500px with no padding give columns A 0..400,
      // B 400..450, C 450..500 — centres 200, 425, 475. At px 390 the pointer is
      // over A, but B's centre is nearer, so a bisector would answer B.
      const layers = [
        stackedBarLayer(
          [
            { category: 'A', seriesId: 'S1', value: 80 },
            { category: 'B', seriesId: 'S1', value: 10 },
            { category: 'C', seriesId: 'S1', value: 10 },
          ],
          { bandWidthAccessor: (_category: string, total: number) => total, barPadding: 0 }
        ),
      ];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(['A', 'B', 'C']) }
      );

      move(svg, 390);

      expect(events[events.length - 1].content.label).toBe('A');
      expect(guideLineX(guide())).toBe(200);
    });

    it('contributes nothing from a HORIZONTAL bar layer, whose categories are on y', () => {
      const layers = [barLayer([{ label: 'Q1', value: 40 }], 'horizontal')];
      const { events, guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100);

      expect(guide()?.querySelector('line')).toBeFalsy();
      expect(events[events.length - 1].visible).toBe(false);
      // The same layer read vertically DOES host — so this is orientation, not a
      // layer the crosshair simply never supported.
      const vertical = setup(
        { shared: true, x: true },
        { layers: [barLayer([{ label: 'Q1', value: 40 }])], scales: bandScales(QUARTERS) }
      );
      move(vertical.svg, 100);
      expect(guideLineX(vertical.guide())).toBe(125);
    });

    it('draws no x guide on a diverging-bar-only chart, which has no category axis', () => {
      const layers = [
        { data: { max: 100, min: -100, value: 42 }, type: 'diverging-bar' },
      ] as unknown as NgeChartLayerDefinition[];
      const { guide, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250);

      expect(guide()?.querySelector('line')).toBeFalsy();
    });

    it('keeps the 1-D band reading when a scatter layer shares the chart', () => {
      const layers = [
        barLayer([
          { label: 'Q1', value: 40 },
          { label: 'Q2', value: 60 },
        ]),
        scatterLayer([{ seriesId: 'A', x: 'Q2', y: 90 } as unknown as NgeScatterDataPoint]),
      ];
      const { guide, svg } = setup(
        { shared: true, x: true },
        { layers, scales: bandScales(QUARTERS) }
      );

      move(svg, 100, 30); // over Q1's band, but far from the only scatter point

      // A 2-D reading would jump the guide to the scatter point at Q2 (px 375).
      expect(guideLineX(guide())).toBe(125);
    });
  });

  describe('composed overlay hosts', () => {
    const TREND_SOURCE = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ];

    it('adds a Trend row carrying the FIT at the snapped x, not the source point', () => {
      const layers = [
        lineLayer(),
        overlayLayer({ data: TREND_SOURCE, fit: 'linear', mode: 'trendline' }),
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250); // x = 50

      const trend = lastRows(events).find(r => r.label === 'Trend');
      expect(trend).toBeDefined();
      expect(trend?.value).toBeCloseTo(50, 6);
    });

    it('snaps on an overlay-only chart, using its source x values', () => {
      const layers = [overlayLayer({ data: TREND_SOURCE, fit: 'linear', mode: 'trendline' })];
      const { guide, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 260); // nearest source x is 50 → px 250

      expect(guideLineX(guide())).toBe(250);
    });

    it('adds a Mean row for a control overlay', () => {
      const layers = [
        lineLayer(),
        overlayLayer({
          data: [
            { x: 0, y: 10 },
            { x: 50, y: 20 },
            { x: 100, y: 30 },
          ],
          mode: 'control',
        }),
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250);

      const mean = lastRows(events).find(r => r.label === 'Mean');
      expect(mean?.value).toBeCloseTo(20, 6);
    });

    it('rounds a derived value to 2 decimals, as the overlay layer formats its own', () => {
      // Least-squares over (0,0) (1,1) (2,4) gives slope 2, intercept -1/3 — a
      // repeating decimal, which would otherwise render as -0.3333333333333333.
      const layers = [
        lineLayer(),
        overlayLayer({
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 4 },
          ],
          fit: 'linear',
          mode: 'trendline',
        }),
      ];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 0); // x = 0 → the intercept

      const trend = lastRows(events).find(r => r.label === 'Trend');
      expect(trend?.value).toBe(-0.33);
    });

    it('adds no row for a fan overlay — a widening band has no value at an x', () => {
      const layers = [lineLayer(), overlayLayer({ data: TREND_SOURCE, mode: 'fan' })];
      const { events, svg } = setup({ shared: true, x: true }, { layers });

      move(svg, 250);

      expect(lastRows(events).map(r => r.label)).toEqual(['A']);
    });
  });

  describe('lifecycle', () => {
    it('hides the guide when the pointer leaves the plot bounds', () => {
      const { guide, svg } = setup({ x: true });

      move(svg, 250);
      expect(guide()?.style.display).toBe('');

      move(svg, 600); // beyond boundedWidth
      expect(guide()?.style.display).toBe('none');
    });

    it('removes the guide and hides the tooltip when the crosshair is disabled', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(bounds);
      document.body.appendChild(svg);

      const events: NgeTooltipEvent[] = [];
      const params = {
        bounds: select(bounds),
        clipPath: null,
        dimensions,
        layers: [lineLayer()],
        margins: ZERO_MARGINS,
        scales: linearScales(),
        svg: select(svg),
        tooltipHandler: { onTooltip: (e: NgeTooltipEvent) => events.push(e) },
      };

      attachCrosshair({ ...params, crosshair: { shared: true, x: true } });
      svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 250, clientY: 150 }));
      expect(bounds.querySelector('.nge-chart-crosshair')).not.toBeNull();

      attachCrosshair({ ...params, crosshair: undefined });

      expect(bounds.querySelector('.nge-chart-crosshair')).toBeNull();
      expect(events[events.length - 1].visible).toBe(false);
    });
  });

  describe('coexistence with plot gestures', () => {
    /**
     * A harness that can RE-ATTACH to the same svg, which `setup` cannot — the
     * per-svg pointer state is keyed by that node, so a fresh svg per attach would
     * test nothing. `attach()` stands in for a render; passing fresh scales stands
     * in for the domain a gesture frame writes.
     */
    function harness(crosshair: NgeCrosshairConfig = { shared: true, x: true }): {
      attach: (scales?: NgeChartScales) => void;
      events: NgeTooltipEvent[];
      guide: () => null | SVGGElement;
      svg: SVGSVGElement;
    } {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(bounds);
      document.body.appendChild(svg);

      const events: NgeTooltipEvent[] = [];

      return {
        attach: (scales?: NgeChartScales) =>
          attachCrosshair({
            bounds: select(bounds),
            clipPath: null,
            crosshair,
            dimensions,
            layers: [lineLayer()],
            margins: ZERO_MARGINS,
            scales: scales ?? linearScales(),
            svg: select(svg),
            tooltipHandler: { onTooltip: event => events.push(event) },
          }),
        events,
        guide: () => bounds.querySelector<SVGGElement>('.nge-chart-crosshair'),
        svg,
      };
    }

    /** A zoomed-out x scale: the same datum xs land on half their original pixels. */
    function zoomedOutScales(): NgeChartScales {
      return {
        x: scaleLinear().domain([0, 200]).range([0, 500]),
        y: scaleLinear().domain([0, 100]).range([300, 0]),
      };
    }

    /** Stand in for a live plot drag of the given mode, past the movement threshold. */
    function beginDrag(svg: SVGSVGElement, mode: 'brush' | 'pan'): void {
      setGestureDragState(svg, {
        bandAccumPx: 0,
        lastPoint: [40, 150],
        mode,
        moved: true,
        pointerId: 1,
        startPoint: [10, 150],
      });
    }

    afterEach(() => {
      // The drag state outlives the DOM (it is keyed by the node, not the tree), so
      // a test that begins a drag would otherwise leak `brushing` into the next one.
      document.querySelectorAll('svg').forEach(svg => clearGestureDragState(svg as SVGSVGElement));
    });

    it('keeps the guide drawn across a re-render, re-resolved against the new scales', () => {
      const { attach, guide, svg } = harness();
      attach();

      // Datum pixels are 0,125,250,375,500 — 40 resolves to 0.
      move(svg, 40);
      expect(guideLineX(guide())).toBe(0);

      // A gesture frame: re-render with a zoomed-out domain and NO new pointer event.
      attach(zoomedOutScales());

      // Still drawn (the flicker was this going blank until the next pointermove)...
      expect(guide()?.style.display).toBe('');
      // ...and resolved through the new scales, where the datum pixels are
      // 0,62.5,125,187.5,250 and 40 now resolves to 62.5 instead.
      expect(guideLineX(guide())).toBe(62.5);
    });

    it('re-emits the shared tooltip across a re-render rather than leaving it hidden', () => {
      const { attach, events, svg } = harness();
      attach();

      move(svg, 260);
      expect(events[events.length - 1].visible).toBe(true);

      attach();

      expect(events[events.length - 1].visible).toBe(true);
    });

    it('starts hidden when no pointer is on the plot, so a data change strands nothing', () => {
      const { attach, guide } = harness();
      attach();
      attach();

      expect(guide()?.style.display).toBe('none');
    });

    it('stays hidden across a re-render after the pointer leaves the svg', () => {
      const { attach, guide, svg } = harness();
      attach();

      move(svg, 260);
      svg.dispatchEvent(new MouseEvent('pointerleave'));
      expect(guide()?.style.display).toBe('none');

      attach();

      expect(guide()?.style.display).toBe('none');
    });

    it('stays hidden across a re-render after the pointer leaves the plot bounds', () => {
      const { attach, guide, svg } = harness();
      attach();

      move(svg, 260);
      move(svg, 600); // beyond boundedWidth
      expect(guide()?.style.display).toBe('none');

      attach();

      expect(guide()?.style.display).toBe('none');
    });

    it('draws nothing while a brush-zoom rectangle is being dragged', () => {
      const { attach, events, guide, svg } = harness();
      attach();
      beginDrag(svg, 'brush');

      move(svg, 260);

      expect(guide()?.style.display).toBe('none');
      expect(events[events.length - 1].visible).toBe(false);
    });

    it('does not re-assert on a re-render while a brush drag is live', () => {
      const { attach, guide, svg } = harness();
      attach();
      move(svg, 260);
      expect(guide()?.style.display).toBe('');

      beginDrag(svg, 'brush');
      attach();

      expect(guide()?.style.display).toBe('none');
    });

    it('comes back on the render after a brush drag ends, with no new pointer event', () => {
      const { attach, guide, svg } = harness();
      attach();
      beginDrag(svg, 'brush');
      move(svg, 260); // tracked, but suppressed
      expect(guide()?.style.display).toBe('none');

      clearGestureDragState(svg);
      attach();

      expect(guide()?.style.display).toBe('');
      expect(guideLineX(guide())).toBe(250);
    });

    it('keeps drawing through a pan drag — only the brush takes the plot', () => {
      const { attach, guide, svg } = harness();
      attach();
      beginDrag(svg, 'pan');

      move(svg, 260);

      expect(guide()?.style.display).toBe('');
      expect(guideLineX(guide())).toBe(250);
    });

    it('ignores a sub-threshold press, which is a click rather than a brush', () => {
      const { attach, guide, svg } = harness();
      attach();
      setGestureDragState(svg, {
        bandAccumPx: 0,
        lastPoint: [10, 150],
        mode: 'brush',
        moved: false,
        pointerId: 1,
        startPoint: [10, 150],
      });

      move(svg, 260);

      expect(guide()?.style.display).toBe('');
    });
  });
});
