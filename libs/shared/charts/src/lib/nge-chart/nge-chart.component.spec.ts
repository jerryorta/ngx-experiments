import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeChartConfig } from '../core/config';

// Imported from the preset FILE, not the `../presets` barrel: the barrel also pulls in
// the bullet + diverging-bar layers, which import the pure-ESM `d3` umbrella package
// that this project's `transformIgnorePatterns` does not transform.
import { createLineChartConfig } from '../presets/line-chart.preset';
import { NgeChartComponent } from './nge-chart.component';

/**
 * Plot box the stubbed container reports. Margins are pinned to zero below so plot
 * pixels, svg pixels and `clientX`/`clientY` all coincide — the same 1:1 mapping
 * `nge-chart-crosshair.spec.ts` sets up, since jsdom's own rects are all-zero.
 */
const PLOT_WIDTH = 500;
const PLOT_HEIGHT = 300;

/** Pointer position used to raise the crosshair's shared tooltip (mid-plot). */
const POINTER_X = 250;
const POINTER_Y = 150;

const ZERO_MARGIN = { bottom: 0, left: 0, right: 0, top: 0 };

/** Where the tooltip element ended up, in host coords (its `left`/`top`). */
interface TooltipXY {
  left: number;
  top: number;
}

/**
 * A line host with the shared crosshair on and a legend — the tooltip the chart
 * positions is the crosshair's, so the assertions do not depend on any layer's own
 * per-mark placement.
 */
function crosshairConfig(position: 'bottom' | 'left' | 'top'): NgeChartConfig {
  const config = createLineChartConfig({
    data: [0, 25, 50, 75, 100].map(x => ({ seriesId: 'A', x, y: x })),
    legend: { enabled: true, position },
    margin: ZERO_MARGIN,
  });

  return { ...config, base: { ...config.base, crosshair: { shared: true, x: true } } };
}

/** jsdom (Jest 29) lacks PointerEvent; a MouseEvent reaches the same registration. */
function movePointer(svg: SVGSVGElement): void {
  svg.dispatchEvent(new MouseEvent('pointermove', { clientX: POINTER_X, clientY: POINTER_Y }));
}

/**
 * Mount a chart whose plot container sits at `offset` inside the host, drive the
 * crosshair, and report where the tooltip landed.
 *
 * The offset is defined AFTER the first render (the container only exists once the
 * view is created) and picked up by the debounced render that advancing the timers
 * releases — which is precisely the pass that re-measures it in production.
 */
function tooltipXYAt(offset: { x: number; y: number }): TooltipXY {
  // Keep the config coherent with the offset being simulated, even though jsdom does
  // no layout and it is the stubbed offset that drives the assertion.
  const position = offset.x > 0 ? 'left' : offset.y > 0 ? 'top' : 'bottom';

  const fixture: ComponentFixture<NgeChartComponent> = TestBed.createComponent(NgeChartComponent);
  fixture.componentRef.setInput('config', crosshairConfig(position));
  fixture.detectChanges();

  const host = fixture.nativeElement as HTMLElement;
  const container = host.querySelector('.nge-chart-container') as HTMLElement;
  Object.defineProperty(container, 'offsetLeft', { configurable: true, value: offset.x });
  Object.defineProperty(container, 'offsetTop', { configurable: true, value: offset.y });

  // Release the debounced render (16ms) so the offset above is measured. This repo is
  // zoneless, so the render pipeline's `debounceTime(16)` is driven with Jest's fake
  // timers rather than `fakeAsync`/`tick`, which require zone.js.
  jest.advanceTimersByTime(20);

  const svg = container.shadowRoot?.querySelector('svg');
  expect(svg).toBeTruthy();
  movePointer(svg as SVGSVGElement);

  const tooltip = host.querySelector('nge-chart-tooltip') as HTMLElement;
  expect(tooltip.style.display).toBe('block');

  return { left: parseFloat(tooltip.style.left), top: parseFloat(tooltip.style.top) };
}

describe('NgeChartComponent tooltip positioning', () => {
  let boundingRect: jest.SpyInstance;

  beforeEach(async () => {
    // Every rect the chart reads (container for its size, svg for pointer math) is
    // the same box at the viewport origin. Without this the container measures 0×0
    // and `renderNgeChart` skips the render entirely.
    boundingRect = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: PLOT_HEIGHT,
      height: PLOT_HEIGHT,
      left: 0,
      right: PLOT_WIDTH,
      toJSON: () => ({}),
      top: 0,
      width: PLOT_WIDTH,
      x: 0,
      y: 0,
    } as DOMRect);

    await TestBed.configureTestingModule({ imports: [NgeChartComponent] }).compileComponents();

    // Installed AFTER compileComponents so component resolution is never waiting on a
    // clock this spec controls.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    boundingRect.mockRestore();
  });

  it('positions the tooltip at the emitted coordinates when the plot starts at the host origin', () => {
    const { left, top } = tooltipXYAt({ x: 0, y: 0 });

    // A bottom legend leaves the container at (0,0), so container coords ARE host
    // coords — the case that always worked, pinned so the offset cannot regress it.
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(PLOT_WIDTH);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThanOrEqual(PLOT_HEIGHT);
  });

  it('shifts the tooltip down by the offset a top legend puts above the plot', () => {
    const legendHeight = 48;
    const base = tooltipXYAt({ x: 0, y: 0 });
    const shifted = tooltipXYAt({ x: 0, y: legendHeight });

    expect(shifted.top - base.top).toBe(legendHeight);
    expect(shifted.left).toBe(base.left);
  });

  it('shifts the tooltip right by the offset a left legend puts beside the plot', () => {
    const legendWidth = 90;
    const base = tooltipXYAt({ x: 0, y: 0 });
    const shifted = tooltipXYAt({ x: legendWidth, y: 0 });

    expect(shifted.left - base.left).toBe(legendWidth);
    expect(shifted.top).toBe(base.top);
  });
});
