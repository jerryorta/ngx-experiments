import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type {
  NgeChartBaseConfig,
  NgeChartScales,
} from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartDimensions } from '../chart.models';
import type { NgeChartGestureEvent } from './nge-chart-gesture.models';

import { attachRangeAxisBrush } from './range-axis-brush';

/**
 * Margined dimensions: 500×300 plot inside a 550×360 svg. jsdom's
 * getBoundingClientRect is all-zero, so alongX = clientX - margin.left (40) and
 * alongY = clientY - margin.top (20).
 */
const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 360,
  margin: { bottom: 40, left: 40, right: 10, top: 20 },
  width: 550,
};

/** Linear x ([0,500]) + inverted linear y ([300,0]) scales domained to the given focus. */
function makeScales(xFocus: [number, number], yFocus: [number, number]): NgeChartScales {
  return {
    x: scaleLinear().domain(xFocus).range([0, 500]),
    y: scaleLinear().domain(yFocus).range([300, 0]),
  };
}

function setup(
  base: NgeChartBaseConfig,
  xFocus: [number, number] = [0, 100],
  yFocus: [number, number] = [0, 100]
): { bounds: SVGGElement; events: NgeChartGestureEvent[]; svg: SVGSVGElement } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(bounds);
  document.body.appendChild(svg);

  const events: NgeChartGestureEvent[] = [];
  attachRangeAxisBrush(select(svg), select(bounds), DIMENSIONS, makeScales(xFocus, yFocus), base, {
    onGesture: event => events.push(event),
  });
  return { bounds, events, svg };
}

/** jsdom (Jest) lacks PointerEvent — a MouseEvent of the same name reaches the handler. */
function pointer(svg: SVGSVGElement, type: string, clientX: number, clientY: number): void {
  svg.dispatchEvent(new MouseEvent(type, { button: 0, clientX, clientY }));
}

describe('attachRangeAxisBrush', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('x range axis (bottom strip)', () => {
    it('drags handle-hi inward and emits the sorted new focus domain', () => {
      // Full window (focus 0..100 → pixels 0..500). Grab the right handle at 500.
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 540, 340); // alongX=500 (win1), alongY=320 (in strip)
      pointer(svg, 'pointermove', 290, 340); // alongX=250

      expect(events).toEqual([{ axis: 'x', domain: [0, 50], kind: 'range-zoom' }]);
    });

    it('drags handle-lo inward and emits the sorted new focus domain', () => {
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 40, 340); // alongX=0 (win0), in strip
      pointer(svg, 'pointermove', 290, 340); // alongX=250

      expect(events).toEqual([{ axis: 'x', domain: [50, 100], kind: 'range-zoom' }]);
    });

    it('grabs the left handle from just LEFT of it at 100% (extreme edge, alongX < 0)', () => {
      // Full window: the left handle sits at pixel 0. A click on its grab-zone just
      // left of the axis (alongX < 0) must still grab it — the hit area is padded by
      // HANDLE_GRAB_PX so the extreme handle isn't stuck until the user zooms first.
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 36, 340); // alongX=-4 (just left of win0=0), alongY=320 (in strip)
      pointer(svg, 'pointermove', 290, 340); // alongX=250

      expect(events).toEqual([{ axis: 'x', domain: [50, 100], kind: 'range-zoom' }]);
    });

    it('pans the window body, shifting the focus by the drag delta', () => {
      // Focus 20..60 → window pixels 100..300; grab the body at 200.
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } }, [20, 60]);

      pointer(svg, 'pointerdown', 240, 340); // alongX=200 (between 100 and 300)
      pointer(svg, 'pointermove', 290, 340); // alongX=250 → delta +50

      expect(events).toEqual([{ axis: 'x', domain: [30, 70], kind: 'range-zoom' }]);
    });

    it('clamps a handle to the minimum window width', () => {
      // Focus 20..60 → window 100..300; drag handle-hi PAST the fixed left edge.
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } }, [20, 60]);

      pointer(svg, 'pointerdown', 340, 340); // alongX=300 (win1)
      pointer(svg, 'pointermove', 90, 340); // alongX=50 — well past win0 (100)

      expect(events).toHaveLength(1);
      const event = events[0] as Extract<NgeChartGestureEvent, { kind: 'range-zoom' }>;
      // Clamped to win0 + MIN_PX (108px) → the window can't collapse.
      expect(event.domain[0]).toBe(20);
      expect(event.domain[1]).toBeCloseTo(21.6); // 108 / 5
    });

    it('stops emitting after pointerup releases the drag', () => {
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 540, 340);
      pointer(svg, 'pointermove', 290, 340);
      pointer(svg, 'pointerup', 290, 340);
      pointer(svg, 'pointermove', 200, 340); // after release — ignored

      expect(events).toHaveLength(1);
    });
  });

  describe('y range axis (left strip)', () => {
    it('drags the top handle down and emits the sorted focus domain', () => {
      // Inverted y: focus 0..100 → pixels win0=300 (bottom), win1=0 (top).
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 20, 20); // alongX=-20 (left strip), alongY=0 (win1)
      pointer(svg, 'pointermove', 20, 170); // alongY=150

      expect(events).toEqual([{ axis: 'y', domain: [0, 50], kind: 'range-zoom' }]);
    });

    it('grabs the top handle from just ABOVE it at 100% (extreme edge, alongY < 0)', () => {
      // Full window (focus == full): the top handle sits at pixel 0. A click on its
      // grab-zone ABOVE the axis (alongY < 0) must still grab it — the hit area is
      // padded by HANDLE_GRAB_PX so the extreme handle isn't stuck until the user
      // first zooms via another handle or the wheel (the reported bug).
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 20, 16); // alongX=-20 (left strip), alongY=-4 (just above win1=0)
      pointer(svg, 'pointermove', 20, 170); // alongY=150

      expect(events).toEqual([{ axis: 'y', domain: [0, 50], kind: 'range-zoom' }]);
    });

    it('drags handle-lo (bottom edge) inward and emits the sorted focus domain', () => {
      // Inverted y: focus 0..100 → win0=300 (bottom), win1=0 (top). Grab the
      // bottom handle at win0 and drag it up toward the middle.
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 20, 320); // alongX=-20 (left strip), alongY=300 (win0)
      pointer(svg, 'pointermove', 20, 170); // alongY=150

      // invert(150)=50 (moving edge), invert(0)=100 (fixed win1 edge).
      expect(events).toEqual([{ axis: 'y', domain: [50, 100], kind: 'range-zoom' }]);
    });

    it('clamps handle-lo to the minimum window width (inverted axis)', () => {
      // From win0 (bottom), drag PAST win1 (top). On the inverted axis the moving
      // edge clamps to win1 + MIN_PX = 8px so the window can't collapse/invert.
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 20, 320); // alongY=300 (win0)
      pointer(svg, 'pointermove', 20, 20); // alongY=0 — well past win1 (top)

      expect(events).toHaveLength(1);
      const event = events[0] as Extract<NgeChartGestureEvent, { kind: 'range-zoom' }>;
      expect(event.domain[0]).toBeCloseTo(97.333); // invert(8) = (300 - 8) / 3
      expect(event.domain[1]).toBe(100); // fixed win1 edge, invert(0)
    });

    it('clamps handle-hi to the minimum window width (inverted axis)', () => {
      // Grab the top handle (win1) and drag DOWN past win0; the moving edge clamps
      // to win0 - MIN_PX = 292px, mirroring the handle-lo floor on the other end.
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 20, 20); // alongY=0 (win1, top)
      pointer(svg, 'pointermove', 20, 320); // alongY=300 — well past win0 (bottom)

      expect(events).toHaveLength(1);
      const event = events[0] as Extract<NgeChartGestureEvent, { kind: 'range-zoom' }>;
      expect(event.domain[0]).toBe(0); // fixed win1 edge, invert(300)
      expect(event.domain[1]).toBeCloseTo(2.667); // invert(292) = (300 - 292) / 3
    });

    it('pans the window body and clamps it within the axis (inverted axis)', () => {
      // Focus 25..75 → window pixels win0=225, win1=75 (inverted). Grab the body
      // at 150, shift it, then over-drag to prove it clamps within [0, bh].
      const { events, svg } = setup({ yRangeAxis: { fullDomain: [0, 100] } }, [0, 100], [25, 75]);

      pointer(svg, 'pointerdown', 20, 170); // alongY=150 (between win1=75 and win0=225)
      pointer(svg, 'pointermove', 20, 200); // alongY=180 → delta +30, window shifts
      pointer(svg, 'pointermove', 20, 260); // alongY=240 → delta +90, clamps at the bottom edge

      expect(events).toHaveLength(2);
      // Shifted: window slid +30px → focus [15, 65] (float noise from the inverted scale).
      const shifted = events[0] as Extract<NgeChartGestureEvent, { kind: 'range-zoom' }>;
      expect(shifted.axis).toBe('y');
      expect(shifted.domain[0]).toBeCloseTo(15);
      expect(shifted.domain[1]).toBeCloseTo(65);
      // Clamped: the window can't slide past the bottom edge → focus [0, 50] within [0, bh].
      expect(events[1]).toEqual({ axis: 'y', domain: [0, 50], kind: 'range-zoom' });
    });
  });

  describe('isolation from plot gestures', () => {
    it('emits nothing for a pointerdown inside the plot area', () => {
      const { events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      pointer(svg, 'pointerdown', 290, 170); // alongX=250, alongY=150 — inside the plot
      pointer(svg, 'pointermove', 340, 170);

      expect(events).toEqual([]);
    });

    it('emits nothing in the strip once the range axis is removed (detach)', () => {
      const { bounds, events, svg } = setup({ xRangeAxis: { fullDomain: [0, 100] } });

      // Re-attach with no range axis — handlers must detach.
      attachRangeAxisBrush(
        select(svg),
        select(bounds),
        DIMENSIONS,
        makeScales([0, 100], [0, 100]),
        {},
        { onGesture: event => events.push(event) }
      );

      pointer(svg, 'pointerdown', 540, 340);
      pointer(svg, 'pointermove', 290, 340);

      expect(events).toEqual([]);
    });
  });
});
