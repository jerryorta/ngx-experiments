import type { Selection } from 'd3-selection';

import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartAxisTheme } from './nge-axis.models';

import { rangeWindowPixels, renderNgeRangeAxis } from './render-nge-range-axis';

const SVG_NS = 'http://www.w3.org/2000/svg';

const THEME: NgeChartAxisTheme = {
  lineColor: '#111111',
  lineWidth: 2,
  tickColor: '#222222',
  tickFontSize: 12,
};

/** Fresh detached <g> (in the SVG namespace so children inherit it) + a d3 selection over it. */
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

describe('rangeWindowPixels', () => {
  it('projects the focus domain onto the full scale, in focus order', () => {
    const fullScale = scaleLinear().domain([0, 100]).range([0, 500]);
    expect(rangeWindowPixels(fullScale, [30, 60])).toEqual([150, 300]);
  });

  it('returns edges in focus order even when the scale range is inverted', () => {
    // Y scales run top→bottom: domain 0 at pixel 300, 100 at pixel 0.
    const fullScale = scaleLinear().domain([0, 100]).range([300, 0]);
    // focus[0]=30 → 210, focus[1]=60 → 120 (edge0 > edge1 for an inverted range).
    expect(rangeWindowPixels(fullScale, [30, 60])).toEqual([210, 120]);
  });
});

describe('renderNgeRangeAxis', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('draws the ruler at the FULL domain with the brush window over the focus slice', () => {
    const { group, node } = makeGroup();
    // Full extent 0..100 across 500px; the plot is currently focused on 30..60.
    const fullScale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderNgeRangeAxis(group, {
      axisTheme: THEME,
      focusDomain: [30, 60],
      fullScale,
      orient: 'bottom',
      ticks: 10,
    });

    // Ruler spans the FULL range/domain (baseline 0..500, not the focus slice).
    const domain = node.querySelector('.domain');
    expect(domain?.getAttribute('d')).toBe('M0,0H500');
    // 0,10,..,100 → 11 ticks, last one projected at the full-domain edge (500px).
    const ticks = node.querySelectorAll('.tick');
    expect(ticks.length).toBe(11);
    const lastTick = ticks[ticks.length - 1];
    expect(lastTick.querySelector('text')?.textContent).toBe('100');
    expect(lastTick.getAttribute('transform')).toBe('translate(500,0)');

    // Brush window spans [fullScale(30), fullScale(60)] = [150, 300] → x=150, width=150.
    const windowRect = node.querySelector('.nge-chart-range-axis-window') as SVGRectElement;
    expect(windowRect).not.toBeNull();
    expect(windowRect.getAttribute('x')).toBe('150');
    expect(windowRect.getAttribute('width')).toBe('150');
    expect(windowRect.getAttribute('y')).toBe('0');
    // Translucent primary fill so the tick numbers read through it.
    expect(windowRect.getAttribute('fill')).toBe('var(--chart-primary)');
    // Window body drags to pan → grab cursor.
    expect(windowRect.getAttribute('cursor')).toBe('grab');
  });

  it('places the two rounded handles at the window edges (bottom axis)', () => {
    const { group, node } = makeGroup();
    const fullScale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderNgeRangeAxis(group, {
      axisTheme: THEME,
      focusDomain: [30, 60],
      fullScale,
      orient: 'bottom',
      ticks: 10,
    });

    const handles = node.querySelectorAll('.nge-chart-range-axis-handle');
    expect(handles.length).toBe(2);
    // Capsule thickness 6 → each handle is centered on its edge (edge - 3).
    const xs = Array.from(handles).map(h => h.getAttribute('x'));
    expect(xs).toEqual(['147', '297']); // edges 150 and 300
    handles.forEach(handle => {
      expect(handle.getAttribute('rx')).toBe('3'); // rounded end-handle
      expect(handle.getAttribute('width')).toBe('6');
      expect(handle.getAttribute('fill')).toBe('var(--chart-primary)');
      // Bottom (horizontal) axis → handles resize left/right.
      expect(handle.getAttribute('cursor')).toBe('ew-resize');
    });
  });

  it('rotates the window/handle geometry for a left (vertical) axis', () => {
    const { group, node } = makeGroup();
    // Inverted range (y runs top→bottom): 0 at 300px, 100 at 0px.
    const fullScale = scaleLinear().domain([0, 100]).range([300, 0]);

    renderNgeRangeAxis(group, {
      axisTheme: THEME,
      focusDomain: [30, 60],
      fullScale,
      orient: 'left',
      ticks: 10,
    });

    expect(node.querySelector('.domain')?.getAttribute('d')).toBe('M0,300V0');

    // Window runs vertically over the left tick-label column: x=-40, width=40,
    // y=min(edge0,edge1)=120, height=span=90.
    const windowRect = node.querySelector('.nge-chart-range-axis-window') as SVGRectElement;
    expect(windowRect.getAttribute('x')).toBe('-40');
    expect(windowRect.getAttribute('width')).toBe('40');
    expect(windowRect.getAttribute('y')).toBe('120');
    expect(windowRect.getAttribute('height')).toBe('90');

    // Handles are horizontal capsules centered on the two vertical edges (120, 210).
    const ys = Array.from(node.querySelectorAll('.nge-chart-range-axis-handle')).map(h =>
      h.getAttribute('y')
    );
    expect(ys).toEqual(['117', '207']); // edge - 3

    // Left (vertical) axis → handles resize up/down.
    node.querySelectorAll('.nge-chart-range-axis-handle').forEach(handle => {
      expect(handle.getAttribute('cursor')).toBe('ns-resize');
    });
  });

  it('reuses the window + handle nodes across redraws (no retained brush state)', () => {
    const { group, node } = makeGroup();
    const fullScale = scaleLinear().domain([0, 100]).range([0, 500]);

    renderNgeRangeAxis(group, {
      axisTheme: THEME,
      focusDomain: [30, 60],
      fullScale,
      orient: 'bottom',
      ticks: 10,
    });
    const firstWindow = node.querySelector('.nge-chart-range-axis-window');

    // Re-render with a new focus — the window slides but the node is reused.
    renderNgeRangeAxis(group, {
      axisTheme: THEME,
      focusDomain: [10, 20],
      fullScale,
      orient: 'bottom',
      ticks: 10,
    });

    expect(node.querySelectorAll('.nge-chart-range-axis-window').length).toBe(1);
    expect(node.querySelectorAll('.nge-chart-range-axis-handle').length).toBe(2);
    expect(node.querySelector('.nge-chart-range-axis-window')).toBe(firstWindow);
    // Window moved to [fullScale(10), fullScale(20)] = [50, 100].
    expect(firstWindow?.getAttribute('x')).toBe('50');
    expect(firstWindow?.getAttribute('width')).toBe('50');
  });
});
