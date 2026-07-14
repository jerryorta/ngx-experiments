import type { Selection } from 'd3-selection';

import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import { select } from 'd3-selection';

import type { AxisGroupTheme, AxisTierConfig } from './nge-axis.models';

import {
  renderAxisTiers,
  resolveCategoryBands,
  resolveIntervalBands,
  resolveRangeBands,
  resolveTierBands,
} from './axis-groups';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'];
const monthToQuarter = (month: string): string =>
  ['feb', 'jan', 'mar'].includes(month) ? 'Q1' : 'Q2';

function makeGroup(): {
  group: Selection<SVGGElement, unknown, null, undefined>;
  node: SVGGElement;
} {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const node = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  svg.appendChild(node);
  document.body.appendChild(svg);
  return { group: select(node), node };
}

describe('resolveRangeBands', () => {
  it('projects numeric ranges to start/end/center in pixel space', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    expect(
      resolveRangeBands(scale, [
        { from: 0, label: 'low', to: 50 },
        { from: 50, label: 'high', to: 100 },
      ])
    ).toEqual([
      { center: 125, end: 250, label: 'low', start: 0 },
      { center: 375, end: 500, label: 'high', start: 250 },
    ]);
  });

  it('normalizes reversed pixel order for inverted (y) scales', () => {
    const scale = scaleLinear().domain([0, 100]).range([500, 0]); // inverted

    // from=0 → pixel 500, to=50 → pixel 250; result must have start < end.
    expect(resolveRangeBands(scale, [{ from: 0, label: 'low', to: 50 }])).toEqual([
      { center: 375, end: 500, label: 'low', start: 250 },
    ]);
  });

  it('clamps bands that spill past the scale range', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    expect(resolveRangeBands(scale, [{ from: -50, label: 'all', to: 200 }])).toEqual([
      { center: 250, end: 500, label: 'all', start: 0 },
    ]);
  });
});

describe('resolveIntervalBands', () => {
  it('tiles a large domain into one band per interval', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2021, 0, 1)])
      .range([0, 1200]);

    const bands = resolveIntervalBands(scale, 'month');
    expect(bands).toHaveLength(12);
    expect(bands.map(b => b.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
  });

  it('keeps partial leading/trailing bands when the domain is smaller than the span', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 10), new Date(2020, 1, 20)])
      .range([0, 400]);

    const bands = resolveIntervalBands(scale, 'month');
    expect(bands).toHaveLength(2); // partial Jan + partial Feb
    expect(bands.map(b => b.label)).toEqual(['Jan', 'Feb']);
    // First band starts at the domain start (pixel 0), last ends at the domain end (pixel 400).
    expect(bands[0].start).toBe(0);
    expect(bands[bands.length - 1].end).toBe(400);
  });

  it('labels quarters Q1..Q4 (timeMonth.every(3))', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2021, 0, 1)])
      .range([0, 1200]);

    const bands = resolveIntervalBands(scale, 'quarter');
    expect(bands).toHaveLength(4);
    expect(bands.map(b => b.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('returns no bands for a non-time scale', () => {
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    expect(resolveIntervalBands(scale, 'month')).toEqual([]);
  });
});

describe('resolveCategoryBands', () => {
  it('coalesces adjacent categories sharing a group value', () => {
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]); // bandwidth 100

    expect(resolveCategoryBands(scale, monthToQuarter)).toEqual([
      { center: 150, end: 300, label: 'Q1', start: 0 },
      { center: 450, end: 600, label: 'Q2', start: 300 },
    ]);
  });

  it('does not merge non-adjacent categories that map to the same group', () => {
    // Distinct categories a, b, c (scaleBand de-dupes its domain, so a repeated
    // 'a' would collapse to two bands and prove nothing). a → X, b → Y, c → X:
    // the two non-adjacent 'X' categories must NOT merge across the 'Y' band.
    const scale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 300]);

    const bands = resolveCategoryBands(scale, category => (category === 'b' ? 'Y' : 'X'));
    expect(bands.map(b => b.label)).toEqual(['X', 'Y', 'X']);
  });
});

describe('resolveTierBands (dispatcher)', () => {
  it('routes ranges → resolveRangeBands', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);
    const ranges = [{ from: 0, label: 'low', to: 50 }];

    expect(resolveTierBands(scale, { ranges })).toEqual(resolveRangeBands(scale, ranges));
  });

  it('routes interval → resolveIntervalBands', () => {
    const scale = scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2021, 0, 1)])
      .range([0, 1200]);

    expect(resolveTierBands(scale, { interval: 'month' })).toEqual(
      resolveIntervalBands(scale, 'month')
    );
  });

  it('routes groupBy → resolveCategoryBands', () => {
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    expect(resolveTierBands(scale, { groupBy: monthToQuarter })).toEqual(
      resolveCategoryBands(scale, monthToQuarter)
    );
  });
});

describe('renderAxisTiers', () => {
  const groupTheme: AxisGroupTheme = {
    labelColor: '#000000',
    labelFontSize: 11,
    separatorColor: '#333333',
    separatorWidth: 1,
    tint: '#eeeeee',
  };

  it('draws one row per tier with separators, tints, and centered labels', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    renderAxisTiers(group, [{ groupBy: monthToQuarter }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    const rows = node.querySelectorAll('g.nge-axis-tier');
    expect(rows.length).toBe(1);

    // 2 bands → 2 tint rects, 3 separators (leading edges + final trailing edge).
    expect(node.querySelectorAll('rect.nge-axis-tier-tint').length).toBe(2);
    expect(node.querySelectorAll('line.nge-axis-tier-separator').length).toBe(3);

    const labels = Array.from(node.querySelectorAll('text.nge-axis-tier-label')).map(
      t => t.textContent
    );
    expect(labels).toEqual(['Q1', 'Q2']); // survives jsdom (no getComputedTextLength)

    const firstRect = node.querySelector('rect.nge-axis-tier-tint') as SVGRectElement;
    expect(firstRect.getAttribute('fill')).toBe('#eeeeee');
    expect(firstRect.getAttribute('height')).toBe('22');
  });

  it('stacks a second tier one tierHeight further out', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);
    const tiers: AxisTierConfig[] = [{ groupBy: monthToQuarter }, { groupBy: () => 'all' }];

    renderAxisTiers(group, tiers, { groupTheme, orient: 'bottom', scale, tierHeight: 22 });

    const rows = node.querySelectorAll('g.nge-axis-tier');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('transform')).toBe('translate(0,0)');
    expect(rows[1].getAttribute('transform')).toBe('translate(0,22)');
  });

  it('omits tint rects when no tint is themed', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    renderAxisTiers(group, [{ groupBy: monthToQuarter }], {
      groupTheme: { separatorColor: '#333333', separatorWidth: 1 },
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    expect(node.querySelectorAll('rect.nge-axis-tier-tint').length).toBe(0);
    expect(node.querySelectorAll('line.nge-axis-tier-separator').length).toBe(3);
  });

  it('offsets vertical-axis tiers along x (left stacks outward, away from the plot)', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([300, 0]);

    renderAxisTiers(group, [{ ranges: [{ from: 0, label: 'low', to: 100 }] }], {
      groupTheme,
      orient: 'left',
      scale,
      tierHeight: 22,
    });

    // Left tier row 0 sits one row-width to the left of the origin.
    const row = node.querySelector('g.nge-axis-tier');
    expect(row?.getAttribute('transform')).toBe('translate(-22,0)');
  });
});

describe('renderAxisTiers label collision handling', () => {
  // jsdom (26.x) implements neither SVGTextElement nor getComputedTextLength — SVG
  // text nodes fall back to the generic SVGElement wrapper — so the measurement is
  // stubbed on SVGElement.prototype to exercise the hide/ellipsize + re-show paths.
  type Measurable = { getComputedTextLength?: () => number };

  const groupTheme: AxisGroupTheme = { labelColor: '#000000', labelFontSize: 11 };

  afterEach(() => {
    delete (SVGElement.prototype as Measurable).getComputedTextLength;
  });

  it('hides a band label that cannot fit even a single character plus ellipsis', () => {
    // Force every measurement to overflow the available band width.
    (SVGElement.prototype as Measurable).getComputedTextLength = () => 10000;

    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    renderAxisTiers(group, [{ groupBy: monthToQuarter }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    const labels = Array.from(node.querySelectorAll<SVGTextElement>('text.nge-axis-tier-label'));
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach(label => expect(label.style.display).toBe('none'));
  });

  it('re-shows a previously-hidden label once it fits again (zoom re-widen)', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);
    const options = { groupTheme, orient: 'bottom' as const, scale, tierHeight: 22 };

    // First pass: force overflow → every label hides.
    (SVGElement.prototype as Measurable).getComputedTextLength = () => 10000;
    renderAxisTiers(group, [{ groupBy: monthToQuarter }], options);
    const hidden = Array.from(node.querySelectorAll<SVGTextElement>('text.nge-axis-tier-label'));
    expect(hidden.every(label => label.style.display === 'none')).toBe(true);

    // Second pass on the SAME nodes: everything now fits → labels re-show and the
    // full (non-ellipsized) text is restored.
    (SVGElement.prototype as Measurable).getComputedTextLength = () => 0;
    renderAxisTiers(group, [{ groupBy: monthToQuarter }], options);
    const shown = Array.from(node.querySelectorAll<SVGTextElement>('text.nge-axis-tier-label'));
    expect(shown.length).toBeGreaterThan(0);
    shown.forEach(label => expect(label.style.display).not.toBe('none'));
    expect(shown.map(label => label.textContent)).toEqual(['Q1', 'Q2']);
  });
});

describe('renderAxisTiers pill style', () => {
  type Measurable = { getComputedTextLength?: () => number };

  const groupTheme: AxisGroupTheme = {
    labelColor: '#000000',
    labelFontSize: 11,
    pillBackground: '#ffffff',
    pillPaddingX: 8,
    separatorColor: '#333333',
    separatorWidth: 1,
  };

  afterEach(() => {
    delete (SVGElement.prototype as Measurable).getComputedTextLength;
  });

  it('draws a baseline, two end ticks, a rounded pill, and a centered label per band', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderAxisTiers(group, [{ ranges: [{ from: 0, label: 'All', to: 100 }], style: 'pill' }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    // One band → one baseline, two end ticks (leading + trailing), one pill, one label.
    expect(node.querySelectorAll('line.nge-axis-tier-baseline').length).toBe(1);
    expect(node.querySelectorAll('line.nge-axis-tier-endtick').length).toBe(2);
    expect(node.querySelectorAll('rect.nge-axis-tier-pill').length).toBe(1);
    expect(node.querySelectorAll('text.nge-axis-tier-label').length).toBe(1);

    // The pill is a rounded, opaque-filled rect stroked with the separator color.
    const pill = node.querySelector('rect.nge-axis-tier-pill') as SVGRectElement;
    expect(pill.getAttribute('rx')).not.toBeNull();
    expect(Number(pill.getAttribute('rx'))).toBeGreaterThan(0);
    expect(pill.getAttribute('fill')).toBe('#ffffff');
    expect(pill.getAttribute('stroke')).toBe('#333333');

    const label = node.querySelector('text.nge-axis-tier-label') as SVGTextElement;
    expect(label.getAttribute('text-anchor')).toBe('middle');
    expect(label.textContent).toBe('All');

    // The pill style replaces — never co-renders — the separators geometry.
    expect(node.querySelectorAll('rect.nge-axis-tier-tint').length).toBe(0);
    expect(node.querySelectorAll('line.nge-axis-tier-separator').length).toBe(0);
  });

  it('draws a horizontal baseline spanning the band with end ticks reaching the row top', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderAxisTiers(group, [{ ranges: [{ from: 0, label: 'All', to: 100 }], style: 'pill' }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    const baseline = node.querySelector('line.nge-axis-tier-baseline') as SVGLineElement;
    expect(baseline.getAttribute('x1')).toBe('0');
    expect(baseline.getAttribute('x2')).toBe('500');
    // Horizontal: both endpoints share the baseline y (in the lower row portion).
    expect(baseline.getAttribute('y1')).toBe(baseline.getAttribute('y2'));
    expect(Number(baseline.getAttribute('y1'))).toBeGreaterThan(11);

    const ticks = Array.from(node.querySelectorAll<SVGLineElement>('line.nge-axis-tier-endtick'));
    expect(ticks.map(t => t.getAttribute('x1')).sort()).toEqual(['0', '500']);
    // Each tick rises from the baseline to the near-axis edge (row top, y=0).
    ticks.forEach(tick => expect(tick.getAttribute('y2')).toBe('0'));
  });

  it('leaves the separators output unchanged when no style is set', () => {
    const { group, node } = makeGroup();
    const scale = scaleBand<string>().domain(MONTHS).range([0, 600]);

    renderAxisTiers(group, [{ groupBy: monthToQuarter }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    // Default path still emits separators; none of the pill geometry appears.
    expect(node.querySelectorAll('line.nge-axis-tier-separator').length).toBe(3);
    expect(node.querySelectorAll('line.nge-axis-tier-baseline').length).toBe(0);
    expect(node.querySelectorAll('line.nge-axis-tier-endtick').length).toBe(0);
    expect(node.querySelectorAll('rect.nge-axis-tier-pill').length).toBe(0);
  });

  it('hides both the label and its pill when not even an ellipsis fits (stubbed measurement)', () => {
    // Every measurement overflows → nothing, not even "…", fits the band.
    (SVGElement.prototype as Measurable).getComputedTextLength = () => 10000;

    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderAxisTiers(
      group,
      [{ ranges: [{ from: 0, label: 'Overflowing', to: 100 }], style: 'pill' }],
      { groupTheme, orient: 'bottom', scale, tierHeight: 22 }
    );

    const label = node.querySelector('text.nge-axis-tier-label') as SVGTextElement;
    const pill = node.querySelector('rect.nge-axis-tier-pill') as SVGRectElement;
    expect(label.style.display).toBe('none');
    expect(pill.style.display).toBe('none');
  });

  it('ellipsizes an overflowing pill label rather than hiding it (stubbed measurement)', () => {
    // Width scales with character count (20px/char), so trimming eventually fits.
    (SVGElement.prototype as Measurable).getComputedTextLength = function (this: SVGElement) {
      return (this.textContent?.length ?? 0) * 20;
    };

    const { group, node } = makeGroup();
    // 1 domain unit = 5px, so the 0..12 band is 60px wide (fits "A…" but not "ABCDE").
    const scale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderAxisTiers(group, [{ ranges: [{ from: 0, label: 'ABCDE', to: 12 }], style: 'pill' }], {
      groupTheme,
      orient: 'bottom',
      scale,
      tierHeight: 22,
    });

    const label = node.querySelector('text.nge-axis-tier-label') as SVGTextElement;
    expect(label.style.display).not.toBe('none');
    expect(label.textContent?.endsWith('…')).toBe(true);
  });

  it('renders a rotated bracket for a vertical (left) axis: baseline, ticks, pill, label', () => {
    const { group, node } = makeGroup();
    const scale = scaleLinear().domain([0, 100]).range([300, 0]);

    renderAxisTiers(group, [{ ranges: [{ from: 0, label: 'Low', to: 100 }], style: 'pill' }], {
      groupTheme,
      orient: 'left',
      scale,
      tierHeight: 22,
    });

    const baseline = node.querySelector('line.nge-axis-tier-baseline') as SVGLineElement;
    // Baseline runs ALONG the (vertical) axis: constant x, spanning the normalized
    // y range (band start=0 .. end=300 after the inverted scale is normalized).
    expect(baseline.getAttribute('x1')).toBe(baseline.getAttribute('x2'));
    expect(baseline.getAttribute('y1')).toBe('0');
    expect(baseline.getAttribute('y2')).toBe('300');

    expect(node.querySelectorAll('line.nge-axis-tier-endtick').length).toBe(2);
    expect(node.querySelectorAll('rect.nge-axis-tier-pill').length).toBe(1);
    expect(node.querySelector('text.nge-axis-tier-label')?.textContent).toBe('Low');
  });
});
