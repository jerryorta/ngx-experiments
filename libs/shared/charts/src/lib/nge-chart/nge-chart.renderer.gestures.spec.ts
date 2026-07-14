import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartGestureEvent, NgeChartGesturesConfig } from '../core/gesture';

import { attachRangeAxisBrush } from '../core/gesture';
import { attachGestureListeners } from './nge-chart.renderer';

const zeroMarginDimensions: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 300,
  margin: { bottom: 0, left: 0, right: 0, top: 0 },
  width: 500,
};

/**
 * Direct tests for attachGestureListeners with a hand-built svg + linear scales.
 * Zero margins so clientX/Y map 1:1 to plot pixels (jsdom rects are all-zero).
 */
function setup(gestures: NgeChartGesturesConfig | undefined): {
  bounds: SVGGElement;
  events: NgeChartGestureEvent[];
  svg: SVGSVGElement;
} {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(bounds);
  document.body.appendChild(svg);

  const scales: NgeChartScales = {
    x: scaleLinear().domain([0, 100]).range([0, 500]),
    y: scaleLinear().domain([0, 100]).range([300, 0]),
  };

  const events: NgeChartGestureEvent[] = [];

  attachGestureListeners(
    select(svg),
    select(bounds),
    { bottom: 0, left: 0, right: 0, top: 0 },
    zeroMarginDimensions,
    scales,
    gestures,
    { onGesture: event => events.push(event) }
  );

  return { bounds, events, svg };
}

function wheel(svg: SVGSVGElement, deltaY: number, clientX: number, clientY: number): WheelEvent {
  const event = new WheelEvent('wheel', { cancelable: true, clientX, clientY, deltaY });
  svg.dispatchEvent(event);
  return event;
}

function pointerEvent(svg: SVGSVGElement, type: string, clientX: number, clientY: number): void {
  // jsdom (Jest 29) lacks PointerEvent — a MouseEvent with the pointer type name
  // reaches the same addEventListener('pointerdown'|...) registrations.
  svg.dispatchEvent(new MouseEvent(type, { button: 0, clientX, clientY }));
}

describe('attachGestureListeners', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('wheel zoom', () => {
    it('emits a zoom event with inverted focus, clamped factor, and current domains', () => {
      const { events, svg } = setup({ zoom: true });

      // deltaY -500 → 2^(1) = 2 (exactly the clamp boundary)
      const event = wheel(svg, -500, 250, 150);

      expect(events).toEqual([
        {
          factor: 2,
          focus: { x: 50, y: 50 }, // invert(250 of 500) / invert(150 of 300, flipped)
          kind: 'zoom',
          xDomain: [0, 100],
          yDomain: [0, 100],
        },
      ]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('clamps extreme wheel deltas to the [0.5, 2] factor range', () => {
      const { events, svg } = setup({ zoom: true });

      wheel(svg, -5000, 0, 0); // would be 2^10 without the clamp
      wheel(svg, 5000, 0, 0); // would be 2^-10 without the clamp

      expect(events.map(e => (e.kind === 'zoom' ? e.factor : NaN))).toEqual([2, 0.5]);
    });

    it('does not emit when zoom is disabled', () => {
      const { events, svg } = setup({ pan: true });

      const event = wheel(svg, -500, 250, 150);

      expect(events).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('drag pan', () => {
    it('honors the 3px threshold, then emits data-space deltas per move', () => {
      const { events, svg } = setup({ pan: true });

      pointerEvent(svg, 'pointerdown', 100, 100);
      pointerEvent(svg, 'pointermove', 101, 100); // < 3px — swallowed
      expect(events).toEqual([]);

      pointerEvent(svg, 'pointermove', 110, 100); // passes threshold
      pointerEvent(svg, 'pointermove', 120, 130); // second move

      // px→data: x is 500px over 100 units (÷5); y is 300px over 100 units, inverted (÷3, negated)
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        kind: 'pan',
        xDelta: 2,
        xDomain: [0, 100],
        yDelta: 0,
        yDomain: [0, 100],
      });
      const second = events[1] as Extract<NgeChartGestureEvent, { kind: 'pan' }>;
      expect(second.kind).toBe('pan');
      expect(second.xDelta).toBeCloseTo(2);
      expect(second.yDelta).toBeCloseTo(-10); // float precision from the ÷3 y-scale
    });

    it('prevents native selection: pointerdown defaultPrevented + user-select none', () => {
      const { svg } = setup({ pan: true });

      const down = new MouseEvent('pointerdown', {
        button: 0,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      });
      svg.dispatchEvent(down);

      expect(down.defaultPrevented).toBe(true);
      expect(svg.style.getPropertyValue('user-select')).toBe('none');
    });

    it('leaves selection alone when pan is disabled (zoom-only)', () => {
      const { svg } = setup({ zoom: true });

      const down = new MouseEvent('pointerdown', {
        button: 0,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      });
      svg.dispatchEvent(down);

      expect(down.defaultPrevented).toBe(false);
      expect(svg.style.getPropertyValue('user-select')).toBe('');
    });

    it('stops emitting after pointerup', () => {
      const { events, svg } = setup({ pan: true });

      pointerEvent(svg, 'pointerdown', 100, 100);
      pointerEvent(svg, 'pointermove', 110, 100);
      pointerEvent(svg, 'pointerup', 110, 100);
      pointerEvent(svg, 'pointermove', 200, 200);

      expect(events).toHaveLength(1);
    });

    it('does not emit when pan is disabled', () => {
      const { events, svg } = setup({ zoom: true });

      pointerEvent(svg, 'pointerdown', 100, 100);
      pointerEvent(svg, 'pointermove', 200, 200);

      expect(events).toEqual([]);
    });

    it('starts a plot drag only inside the plot area (margin pointerdowns are ignored)', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(bounds);
      document.body.appendChild(svg);
      const events: NgeChartGestureEvent[] = [];
      const dims: NgeChartDimensions = {
        boundedHeight: 300,
        boundedWidth: 500,
        height: 360,
        margin: { bottom: 40, left: 40, right: 10, top: 20 },
        width: 550,
      };
      attachGestureListeners(
        select(svg),
        select(bounds),
        { bottom: 40, left: 40, right: 10, top: 20 },
        dims,
        {
          x: scaleLinear().domain([0, 100]).range([0, 500]),
          y: scaleLinear().domain([0, 100]).range([300, 0]),
        },
        { pan: true },
        { onGesture: event => events.push(event) }
      );

      // Client (20, 340) → plot point (-20, 320): left of AND below the plot → no drag.
      pointerEvent(svg, 'pointerdown', 20, 340);
      pointerEvent(svg, 'pointermove', 120, 340);
      pointerEvent(svg, 'pointerup', 120, 340);
      expect(events).toEqual([]);

      // Client (100, 340) → plot point (60, 320): inside the plot horizontally but
      // BELOW the plot floor (the X range-axis strip). Only point[1] > boundedHeight
      // is true here, so this isolates the below-plot gate clause — drop it and the
      // drag would start. Still no drag.
      pointerEvent(svg, 'pointerdown', 100, 340);
      pointerEvent(svg, 'pointermove', 160, 340);
      pointerEvent(svg, 'pointerup', 160, 340);
      expect(events).toEqual([]);

      // Client (100, 120) → plot point (60, 100): inside the plot → pans.
      pointerEvent(svg, 'pointerdown', 100, 120);
      pointerEvent(svg, 'pointermove', 160, 120);
      pointerEvent(svg, 'pointerup', 160, 120);
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('pan');
    });
  });

  describe('reset + teardown', () => {
    it('emits reset on double-click when any gesture is enabled', () => {
      const { events, svg } = setup({ zoom: true });

      svg.dispatchEvent(new MouseEvent('dblclick'));

      expect(events).toEqual([{ kind: 'reset' }]);
    });

    it('detaches all listeners when gestures are disabled on a later render', () => {
      const { bounds, events, svg } = setup({ pan: true, zoom: true });

      // Re-attach with gestures off (same svg node — simulates a config change)
      attachGestureListeners(
        select(svg as SVGSVGElement),
        select(bounds as SVGGElement),
        { bottom: 0, left: 0, right: 0, top: 0 },
        zeroMarginDimensions,
        {
          x: scaleLinear().domain([0, 100]).range([0, 500]),
          y: scaleLinear().domain([0, 100]).range([300, 0]),
        },
        undefined,
        { onGesture: event => events.push(event) }
      );

      wheel(svg, -500, 250, 150);
      pointerEvent(svg, 'pointerdown', 100, 100);
      pointerEvent(svg, 'pointermove', 200, 200);
      svg.dispatchEvent(new MouseEvent('dblclick'));

      expect(events).toEqual([]);
    });
  });

  describe('brush zoom', () => {
    function brushPointer(
      svg: SVGSVGElement,
      type: string,
      clientX: number,
      clientY: number,
      shiftKey = false
    ): void {
      svg.dispatchEvent(new MouseEvent(type, { button: 0, clientX, clientY, shiftKey }));
    }

    it('shift+drag draws the rectangle and emits sorted data extents on release', () => {
      const { bounds, events, svg } = setup({ brushZoom: true, pan: true });

      // Drag from (100,240) to (300,60) with shift — up-left in data space
      brushPointer(svg, 'pointerdown', 100, 240, true);
      brushPointer(svg, 'pointermove', 300, 60, true);

      // Rectangle visible mid-drag with min/max geometry
      const rect = bounds.querySelector('.nge-chart-brush-rect');
      expect(rect?.getAttribute('x')).toBe('100');
      expect(rect?.getAttribute('y')).toBe('60');
      expect(rect?.getAttribute('width')).toBe('200');
      expect(rect?.getAttribute('height')).toBe('180');

      brushPointer(svg, 'pointerup', 300, 60, true);

      // Rect removed; zoom-rect emitted with data extents (x: /5, y inverted /3)
      expect(bounds.querySelector('.nge-chart-brush-rect')).toBeNull();
      expect(events).toHaveLength(1);
      const event = events[0] as Extract<NgeChartGestureEvent, { kind: 'zoom-rect' }>;
      expect(event.kind).toBe('zoom-rect');
      expect(event.xExtent).toEqual([20, 60]);
      expect(event.yExtent[0]).toBeCloseTo(20); // float precision from the ÷3 y-scale
      expect(event.yExtent[1]).toBeCloseTo(80);
    });

    it('plain drag still pans when both pan and brushZoom are enabled', () => {
      const { events, svg } = setup({ brushZoom: true, pan: true });

      brushPointer(svg, 'pointerdown', 100, 100);
      brushPointer(svg, 'pointermove', 150, 100);
      brushPointer(svg, 'pointerup', 150, 100);

      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('pan');
    });

    it('plain drag brushes when pan is disabled (brush-only mode)', () => {
      const { events, svg } = setup({ brushZoom: true });

      brushPointer(svg, 'pointerdown', 0, 0);
      brushPointer(svg, 'pointermove', 250, 150);
      brushPointer(svg, 'pointerup', 250, 150);

      expect(events).toEqual([{ kind: 'zoom-rect', xExtent: [0, 50], yExtent: [50, 100] }]);
      expect(svg.style.cursor).toBe('crosshair');
    });

    it('ignores selections smaller than the minimum brush size', () => {
      const { events, svg } = setup({ brushZoom: true });

      brushPointer(svg, 'pointerdown', 100, 100);
      brushPointer(svg, 'pointermove', 104, 104); // moved (>3px) but < 5px min
      brushPointer(svg, 'pointerup', 104, 104);

      expect(events).toEqual([]);
    });

    it('clamps the brush extents to the plot area', () => {
      const { events, svg } = setup({ brushZoom: true });

      brushPointer(svg, 'pointerdown', 400, 200);
      brushPointer(svg, 'pointermove', 900, 500); // way past the plot edges
      brushPointer(svg, 'pointerup', 900, 500);

      // Clamped to (500,300): x 400..500 → data 80..100; y 200..300 → data 0..33.3
      expect(events).toHaveLength(1);
      const event = events[0] as Extract<NgeChartGestureEvent, { kind: 'zoom-rect' }>;
      expect(event.xExtent).toEqual([80, 100]);
      expect(event.yExtent[0]).toBeCloseTo(0);
      expect(event.yExtent[1]).toBeCloseTo(100 / 3);
    });
  });
});

describe('attachGestureListeners + attachRangeAxisBrush coexistence', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Margined 500×300 plot inside a 550×360 svg — the X range axis owns the bottom
  // strip (alongY 300..340), a distinct hit area from the plot. jsdom rects are
  // all-zero, so alongX = clientX - 40 and alongY = clientY - 20.
  const marginedDimensions: NgeChartDimensions = {
    boundedHeight: 300,
    boundedWidth: 500,
    height: 360,
    margin: { bottom: 40, left: 40, right: 10, top: 20 },
    width: 550,
  };

  it('does not double-fire: a bottom-strip drag emits only range-zoom, a plot drag only pan', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(bounds);
    document.body.appendChild(svg);

    const scales: NgeChartScales = {
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    };
    const events: NgeChartGestureEvent[] = [];

    // Both handlers wired on the SAME svg, exactly as renderChart wires them.
    attachGestureListeners(
      select(svg),
      select(bounds),
      marginedDimensions.margin,
      marginedDimensions,
      scales,
      { pan: true },
      { onGesture: event => events.push(event) }
    );
    attachRangeAxisBrush(
      select(svg),
      select(bounds),
      marginedDimensions,
      scales,
      { xRangeAxis: { fullDomain: [0, 100] } },
      { onGesture: event => events.push(event) }
    );

    // Drag the X bottom strip: grab handle-hi at alongX=500 (client 540); client
    // y=340 → alongY=320 (in the strip). The plot gate rejects this same point
    // (point[1]=320 > boundedHeight), so only the range brush responds.
    pointerEvent(svg, 'pointerdown', 540, 340);
    pointerEvent(svg, 'pointermove', 290, 340); // alongX=250
    pointerEvent(svg, 'pointerup', 290, 340);
    expect(events).toEqual([{ axis: 'x', domain: [0, 50], kind: 'range-zoom' }]);

    // Drag inside the plot: client (240,170) → plot (200,150). The range brush's
    // strip hit-test rejects it, so only the plot pan responds (no new range-zoom).
    pointerEvent(svg, 'pointerdown', 240, 170);
    pointerEvent(svg, 'pointermove', 290, 170); // dx=50 → passes the 3px threshold
    pointerEvent(svg, 'pointerup', 290, 170);
    expect(events).toHaveLength(2);
    expect(events[1].kind).toBe('pan');
  });
});
