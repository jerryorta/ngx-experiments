import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeJSONDOMRect } from '../chart.models';

import { computeAxisTickPositions } from '../axis';
import { createBaseLayout } from './nge-chart-base-layout';
import { mergeBaseConfig } from './nge-chart-base-layout.models';

const size: NgeJSONDOMRect = {
  bottom: 400,
  height: 400,
  left: 0,
  right: 600,
  top: 0,
  width: 600,
  x: 0,
  y: 0,
};

function createHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

describe('createBaseLayout — plot-area clipping', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a clipPath-ed layers group inside bounds', () => {
    const host = createHost();
    createBaseLayout(host);

    const clipPath = host.querySelector('svg.nge-chart-wrapper defs clipPath');
    const layers = host.querySelector('.nge-chart-bounds > .nge-chart-layers');

    expect(clipPath?.id).toMatch(/^nge-chart-clip-\d+$/);
    expect(clipPath?.querySelector('rect')).toBeTruthy();
    expect(layers?.getAttribute('clip-path')).toBe(`url(#${clipPath?.id})`);
  });

  it('assigns a unique clipPath id per instance (multiple charts per page)', () => {
    const first = createHost();
    const second = createHost();
    createBaseLayout(first);
    createBaseLayout(second);

    const firstId = first.querySelector('clipPath')?.id;
    const secondId = second.querySelector('clipPath')?.id;

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
  });

  it('sizes the clip rect to the bounded plot area on resize and returns the layers group', () => {
    const host = createHost();
    const layout = createBaseLayout(host);

    const state = layout.resize(size, {
      margin: { bottom: 40, left: 50, right: 10, top: 20 },
    });

    const rect = host.querySelector('clipPath rect');
    expect(rect?.getAttribute('width')).toBe('540'); // 600 - 50 - 10
    expect(rect?.getAttribute('height')).toBe('340'); // 400 - 20 - 40
    expect(state?.layers.node()).toBe(host.querySelector('.nge-chart-layers'));
  });

  it('inserts axis groups BEFORE the layers group so marks render above axes', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    layout.resize(size, { showXAxis: true, showYAxis: true });
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    });

    const children = Array.from(host.querySelector('.nge-chart-bounds')?.children ?? []).map(
      child => child.getAttribute('class')
    );

    expect(children.indexOf('nge-chart-x-axis')).toBeGreaterThanOrEqual(0);
    expect(children.indexOf('nge-chart-x-axis')).toBeLessThan(
      children.indexOf('nge-chart-layers')
    );
    expect(children.indexOf('nge-chart-y-axis')).toBeLessThan(
      children.indexOf('nge-chart-layers')
    );
  });
});

describe('createBaseLayout — range-axis focus axes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders top X + right Y focus axes showing the zoomed domain when range axes are set', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const state = layout.resize(size, {
      xRangeAxis: { fullDomain: [0, 100] },
      yRangeAxis: { fullDomain: [0, 100] },
    });
    // A zoomed focus slice (20..60) — the layer scales the plot renders against.
    layout.renderAxes({
      x: scaleLinear().domain([20, 60]).range([0, 500]),
      y: scaleLinear().domain([20, 60]).range([300, 0]),
    });

    const xFocus = host.querySelector('.nge-chart-x-focus-axis');
    const yFocus = host.querySelector('.nge-chart-y-focus-axis');
    expect(xFocus).not.toBeNull();
    expect(yFocus).not.toBeNull();

    // Top axis: horizontal baseline with labels ABOVE the line (y = -8).
    expect(xFocus?.querySelector('.domain')?.getAttribute('d')).toBe('M0,0H500');
    expect(xFocus?.querySelector('.tick text')?.getAttribute('y')).toBe('-8');
    // It shows the ZOOMED (focus) values, not the full [0, 100] extent.
    expect(xFocus?.querySelector('.tick text')?.textContent).toBe('20');

    // Right Y focus axis sits at the plot's right edge (boundedWidth).
    expect(yFocus?.getAttribute('transform')).toBe(
      `translate(${state?.dimensions.boundedWidth}, 0)`
    );

    // Zoomed (focus 20..60 ⊂ full 0..100) → the focus axes are faded IN (opacity 1).
    expect((xFocus as SVGGElement).style.opacity).toBe('1');
    expect((yFocus as SVGGElement).style.opacity).toBe('1');
  });

  it('hides the focus axes at 100% (focus == full domain) with zero opacity', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    layout.resize(size, {
      xRangeAxis: { fullDomain: [0, 100] },
      yRangeAxis: { fullDomain: [0, 100] },
    });
    // Focus domain == full domain → not zoomed.
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    });

    // The groups still render (so they can fade in on zoom) but stay transparent.
    const xFocus = host.querySelector('.nge-chart-x-focus-axis') as SVGGElement;
    const yFocus = host.querySelector('.nge-chart-y-focus-axis') as SVGGElement;
    expect(xFocus).not.toBeNull();
    expect(yFocus).not.toBeNull();
    expect(xFocus.style.opacity).toBe('0');
    expect(yFocus.style.opacity).toBe('0');
  });

  it('always renders the top + right frame borders, even at 100% when the focus axes are hidden', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const state = layout.resize(size, {
      xRangeAxis: { fullDomain: [0, 100] },
      yRangeAxis: { fullDomain: [0, 100] },
    });
    // At 100% (focus == full) the focus axes are hidden…
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    });

    const bw = String(state?.dimensions.boundedWidth);
    const bh = String(state?.dimensions.boundedHeight);

    // …but the frame borders stay so the plot keeps a complete box.
    const top = host.querySelector('.nge-chart-x-top-border') as SVGLineElement;
    const right = host.querySelector('.nge-chart-y-right-border') as SVGLineElement;
    expect(top).not.toBeNull();
    expect(right).not.toBeNull();

    // Top border spans the plot width at y = 0.
    expect(top.getAttribute('x1')).toBe('0');
    expect(top.getAttribute('y1')).toBe('0');
    expect(top.getAttribute('x2')).toBe(bw);
    expect(top.getAttribute('y2')).toBe('0');

    // Right border spans the plot height at x = boundedWidth.
    expect(right.getAttribute('x1')).toBe(bw);
    expect(right.getAttribute('y1')).toBe('0');
    expect(right.getAttribute('x2')).toBe(bw);
    expect(right.getAttribute('y2')).toBe(bh);
  });

  it('reserves top + right margin so the focus-axis labels are not clipped', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    // No explicit margin → defaults (top 20, right 10) are floored up for the focus axes.
    const state = layout.resize(size, {
      xRangeAxis: { fullDomain: [0, 100] },
      yRangeAxis: { fullDomain: [0, 100] },
    });

    expect(state?.dimensions.margin.top).toBe(24); // max(20, FOCUS_AXIS_TOP_MARGIN)
    expect(state?.dimensions.margin.right).toBe(36); // max(10, FOCUS_AXIS_RIGHT_MARGIN)
  });

  it('removes the focus axes when the range axes are turned off and re-rendered', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const scales = {
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    };

    layout.resize(size, { xRangeAxis: { fullDomain: [0, 100] } });
    layout.renderAxes(scales);
    expect(host.querySelector('.nge-chart-x-focus-axis')).not.toBeNull();

    layout.resize(size, {});
    layout.renderAxes(scales);
    expect(host.querySelector('.nge-chart-x-focus-axis')).toBeNull();
    expect(host.querySelector('.nge-chart-x-top-border')).toBeNull();
  });
});

describe('createBaseLayout — gridlines', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('inserts the x-grid and y-grid groups BEFORE the layers group (behind marks)', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    layout.resize(size, { showXGrid: true, showYGrid: true });
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    });

    const children = Array.from(host.querySelector('.nge-chart-bounds')?.children ?? []).map(
      child => child.getAttribute('class')
    );

    expect(children.indexOf('nge-chart-x-grid')).toBeGreaterThanOrEqual(0);
    expect(children.indexOf('nge-chart-y-grid')).toBeGreaterThanOrEqual(0);
    expect(children.indexOf('nge-chart-x-grid')).toBeLessThan(
      children.indexOf('nge-chart-layers')
    );
    expect(children.indexOf('nge-chart-y-grid')).toBeLessThan(
      children.indexOf('nge-chart-layers')
    );
  });

  it('draws one vertical x-grid and one horizontal y-grid line per axis tick', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const xScale = scaleLinear().domain([0, 100]).range([0, 540]);
    const yScale = scaleLinear().domain([0, 100]).range([340, 0]);
    layout.resize(size, { showXGrid: true, showYGrid: true });
    layout.renderAxes({ x: xScale, y: yScale });

    const dimensions = layout.getDimensions();
    const xLines = Array.from(host.querySelectorAll<SVGLineElement>('.nge-chart-x-grid line'));
    const yLines = Array.from(host.querySelectorAll<SVGLineElement>('.nge-chart-y-grid line'));

    // one line per tick position (config leaves the tick count undefined → d3 default)
    expect(xLines.length).toBeGreaterThan(0);
    expect(yLines.length).toBeGreaterThan(0);
    expect(xLines.length).toBe(xScale.ticks().length);
    expect(yLines.length).toBe(yScale.ticks().length);

    // x-grid lines are vertical spanning the plot height; y-grid lines are horizontal
    // spanning the plot width
    expect(xLines[0].getAttribute('x1')).toBe(xLines[0].getAttribute('x2'));
    expect(xLines[0].getAttribute('y2')).toBe(String(dimensions?.boundedHeight));
    expect(yLines[0].getAttribute('y1')).toBe(yLines[0].getAttribute('y2'));
    expect(yLines[0].getAttribute('x2')).toBe(String(dimensions?.boundedWidth));
  });

  it('removes the grid groups when the flags are turned off and re-rendered', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const scales = {
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    };
    layout.resize(size, { showXGrid: true, showYGrid: true });
    layout.renderAxes(scales);

    expect(host.querySelector('.nge-chart-x-grid')).toBeTruthy();
    expect(host.querySelector('.nge-chart-y-grid')).toBeTruthy();

    layout.resize(size, { showXGrid: false, showYGrid: false });
    layout.renderAxes(scales);

    expect(host.querySelector('.nge-chart-x-grid')).toBeNull();
    expect(host.querySelector('.nge-chart-y-grid')).toBeNull();
  });

  it('places grid lines exactly at the computed axis tick positions', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const xScale = scaleLinear().domain([0, 100]).range([0, 540]);
    const yScale = scaleLinear().domain([0, 100]).range([340, 0]);
    layout.resize(size, { showXGrid: true, showYGrid: true });
    layout.renderAxes({ x: xScale, y: yScale });

    const xPositions = Array.from(
      host.querySelectorAll<SVGLineElement>('.nge-chart-x-grid line')
    ).map(line => Number(line.getAttribute('x1')));
    const yPositions = Array.from(
      host.querySelectorAll<SVGLineElement>('.nge-chart-y-grid line')
    ).map(line => Number(line.getAttribute('y1')));

    // the core AC: gridlines land on the same positions the axis ticks use
    expect(xPositions).toEqual(computeAxisTickPositions(xScale));
    expect(yPositions).toEqual(computeAxisTickPositions(yScale));
  });

  it('keeps grid lines in sync with an explicit xAxisTicks / yAxisTicks count', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const xScale = scaleLinear().domain([0, 100]).range([0, 540]);
    const yScale = scaleLinear().domain([0, 100]).range([340, 0]);
    layout.resize(size, { showXGrid: true, showYGrid: true, xAxisTicks: 4, yAxisTicks: 4 });
    layout.renderAxes({ x: xScale, y: yScale });

    const xPositions = Array.from(
      host.querySelectorAll<SVGLineElement>('.nge-chart-x-grid line')
    ).map(line => Number(line.getAttribute('x1')));
    const yPositions = Array.from(
      host.querySelectorAll<SVGLineElement>('.nge-chart-y-grid line')
    ).map(line => Number(line.getAttribute('y1')));

    expect(xPositions).toEqual(computeAxisTickPositions(xScale, 4));
    expect(yPositions).toEqual(computeAxisTickPositions(yScale, 4));
  });

  it('renders no grid groups by default (flags never set)', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    layout.resize(size, { showXAxis: true, showYAxis: true });
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    });

    expect(host.querySelector('.nge-chart-x-grid')).toBeNull();
    expect(host.querySelector('.nge-chart-y-grid')).toBeNull();
  });

  it('defaults showXGrid / showYGrid to false in mergeBaseConfig and passes them through when set', () => {
    expect(mergeBaseConfig({}).showXGrid).toBe(false);
    expect(mergeBaseConfig({}).showYGrid).toBe(false);
    expect(mergeBaseConfig({ showXGrid: true, showYGrid: true }).showXGrid).toBe(true);
    expect(mergeBaseConfig({ showXGrid: true, showYGrid: true }).showYGrid).toBe(true);
  });

  it('centers vertical grid lines on a band x-scale (bar / grouped-bar shape)', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const xScale = scaleBand<string>().domain(['a', 'b', 'c']).range([0, 540]);
    const yScale = scaleLinear().domain([0, 100]).range([340, 0]);
    layout.resize(size, { showXGrid: true });
    layout.renderAxes({ x: xScale, y: yScale });

    const xLines = Array.from(host.querySelectorAll<SVGLineElement>('.nge-chart-x-grid line'));
    // one line per band, centered in the band
    expect(xLines.length).toBe(3);
    expect(xLines.map(line => Number(line.getAttribute('x1')))).toEqual(
      computeAxisTickPositions(xScale)
    );
  });

  it('styles grid lines from theme.grid (defaults) and reflects a custom override', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    const scales = {
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    };
    layout.resize(size, { showXGrid: true, showYGrid: true });

    // default grid dash from nge-chart-theme.defaults.ts
    layout.renderAxes(scales);
    const defaultLine = host.querySelector<SVGLineElement>('.nge-chart-x-grid line');
    expect(defaultLine?.style.strokeDasharray).toBe('2 2');

    // a consumer-set theme.grid override is written onto the rendered line
    layout.renderAxes(scales, { grid: { lineColor: '#ff0000', lineDash: '4 4' } });
    const themedLine = host.querySelector<SVGLineElement>('.nge-chart-x-grid line');
    expect(themedLine?.style.stroke).toBe('#ff0000');
    expect(themedLine?.style.strokeDasharray).toBe('4 4');
  });

  it('draws no gridlines for the secondary y2 axis', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    layout.resize(size, { showXGrid: true, showY2Axis: true, showYGrid: true });
    layout.renderAxes({
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
      y2: scaleLinear().domain([0, 1]).range([340, 0]),
    });

    expect(host.querySelector('.nge-chart-x-grid')).toBeTruthy();
    expect(host.querySelector('.nge-chart-y-grid')).toBeTruthy();
    expect(host.querySelector('.nge-chart-y2-grid')).toBeNull();
  });
});

describe('createBaseLayout — range axis (replaces the standard axis)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Linear (invertible) scales — the range axis re-domains a copy to fullDomain.
  function linearScales() {
    return {
      x: scaleLinear().domain([0, 100]).range([0, 540]),
      y: scaleLinear().domain([0, 100]).range([340, 0]),
    };
  }

  it('renders the X range axis in place of the standard X axis (xRangeAxis wins over showXAxis)', () => {
    const host = createHost();
    const layout = createBaseLayout(host);
    // showXAxis is on, yet the range axis takes precedence and REPLACES it.
    layout.resize(size, { showXAxis: true, xRangeAxis: { fullDomain: [0, 100] } });
    layout.renderAxes(linearScales());

    expect(host.querySelector('.nge-chart-x-range-axis')).toBeTruthy();
    expect(host.querySelector('.nge-chart-x-axis')).toBeNull();
  });

  it('restores the standard X axis when the range axis is removed on a later render', () => {
    const host = createHost();
    const layout = createBaseLayout(host);

    layout.resize(size, { showXAxis: true, xRangeAxis: { fullDomain: [0, 100] } });
    layout.renderAxes(linearScales());
    expect(host.querySelector('.nge-chart-x-range-axis')).toBeTruthy();

    // Drop the range axis (still showing the standard X axis) and re-render.
    layout.resize(size, { showXAxis: true });
    layout.renderAxes(linearScales());

    expect(host.querySelector('.nge-chart-x-range-axis')).toBeNull();
    expect(host.querySelector('.nge-chart-x-axis')).toBeTruthy();
  });

  it('renders the Y range axis in place of the standard Y axis and restores it when removed', () => {
    const host = createHost();
    const layout = createBaseLayout(host);

    layout.resize(size, { showYAxis: true, yRangeAxis: { fullDomain: [0, 100] } });
    layout.renderAxes(linearScales());
    expect(host.querySelector('.nge-chart-y-range-axis')).toBeTruthy();
    expect(host.querySelector('.nge-chart-y-axis')).toBeNull();

    // Drop the range axis (still showing the standard Y axis) and re-render.
    layout.resize(size, { showYAxis: true });
    layout.renderAxes(linearScales());

    expect(host.querySelector('.nge-chart-y-range-axis')).toBeNull();
    expect(host.querySelector('.nge-chart-y-axis')).toBeTruthy();
  });
});
