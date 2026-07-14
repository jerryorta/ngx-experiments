import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartGestureEvent, NgeChartGesturesConfig } from '../core/gesture';

import { attachGestureListeners } from './nge-chart.renderer';

const dimensions: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 300,
  margin: { bottom: 0, left: 0, right: 0, top: 0 },
  width: 500,
};

/**
 * Band x (10 categories over 500px → step 50) + linear y — the vertical-bar
 * shape. Zero margins so clientX/Y map 1:1 to plot pixels (jsdom rects are zero).
 */
function setup(gestures: NgeChartGesturesConfig | undefined): {
  events: NgeChartGestureEvent[];
  svg: SVGSVGElement;
} {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(bounds);
  document.body.appendChild(svg);

  const scales: NgeChartScales = {
    x: scaleBand<string>()
      .domain(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
      .range([0, 500]),
    y: scaleLinear().domain([0, 100]).range([300, 0]),
  };

  const events: NgeChartGestureEvent[] = [];
  attachGestureListeners(
    select(svg),
    select(bounds),
    { bottom: 0, left: 0, right: 0, top: 0 },
    dimensions,
    scales,
    gestures,
    { onGesture: event => events.push(event) }
  );

  return { events, svg };
}

function wheel(svg: SVGSVGElement, deltaY: number, clientX: number, clientY: number): void {
  svg.dispatchEvent(new WheelEvent('wheel', { cancelable: true, clientX, clientY, deltaY }));
}

function pointer(svg: SVGSVGElement, type: string, clientX: number, clientY: number): void {
  svg.dispatchEvent(new MouseEvent(type, { button: 0, clientX, clientY }));
}

describe('attachGestureListeners — band/categorical axis', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('wheel emits a band-window zoom with the cursor anchor fraction', () => {
    const { events, svg } = setup({ zoom: true });

    wheel(svg, -500, 250, 150); // factor 2; cursor at x=250 of 500 → anchor 0.5

    expect(events).toEqual([
      { axis: 'x', kind: 'band-window', op: { anchorFraction: 0.5, factor: 2, type: 'zoom' } },
    ]);
  });

  it('drag pan emits a whole-category step once a band boundary is crossed', () => {
    const { events, svg } = setup({ pan: true });

    // Drag right 60px (> one 50px step); content follows the cursor, so the
    // window shifts toward earlier categories (deltaCategories -1).
    pointer(svg, 'pointerdown', 100, 100);
    pointer(svg, 'pointermove', 160, 100);

    expect(events).toEqual([
      { axis: 'x', kind: 'band-window', op: { deltaCategories: -1, type: 'pan' } },
    ]);
  });

  it('does not emit a pan step until a full category width is dragged', () => {
    const { events, svg } = setup({ pan: true });

    pointer(svg, 'pointerdown', 100, 100);
    pointer(svg, 'pointermove', 130, 100); // 30px (> 3px threshold, < 50px step)

    expect(events).toEqual([]);
  });

  it('brush emits a band-window brush with from/to fractions along the band axis', () => {
    const { events, svg } = setup({ brushZoom: true });

    pointer(svg, 'pointerdown', 0, 0);
    pointer(svg, 'pointermove', 250, 150);
    pointer(svg, 'pointerup', 250, 150);

    expect(events).toEqual([
      { axis: 'x', kind: 'band-window', op: { fromFraction: 0, toFraction: 0.5, type: 'brush' } },
    ]);
  });

  it('double-click still emits a reset', () => {
    const { events, svg } = setup({ zoom: true });

    svg.dispatchEvent(new MouseEvent('dblclick'));

    expect(events).toEqual([{ kind: 'reset' }]);
  });
});
