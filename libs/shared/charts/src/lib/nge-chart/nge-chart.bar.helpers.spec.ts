import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';

import { renderBarLayer } from '../layers/bar';
import { createBarChartScales } from './nge-chart.bar.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Build a minimal single-bar-layer chart config (vertical by default). */
function barConfig(data: NgeBarDataPoint[]): NgeChartConfig {
  const layer: NgeBarLayerConfig = { data, renderer: renderBarLayer, type: 'bar' };
  return { layers: [layer] };
}

/** The (vertical) value scale is `scales.y`; narrow it for domain/range assertions. */
function valueScale(config: NgeChartConfig): ScaleLinear<number, number> {
  return createBarChartScales(config, DIMENSIONS).y as ScaleLinear<number, number>;
}

describe('createBarChartScales — value-scale domain', () => {
  // The two guarantees the win-loss feature + the render-bar backward-compat test
  // both ride on: the value domain ALWAYS spans zero.

  it('all-positive data → domain starts at 0, so valueScale(0) === boundedHeight', () => {
    const scale = valueScale(
      barConfig([
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 15 },
      ])
    );

    // domainMin pinned to 0 (never floats above it) with 1.1 headroom on the max.
    expect(scale.domain()[0]).toBe(0);
    expect(scale.domain()[1]).toBeCloseTo(22); // 20 * 1.1
    expect(scale.range()).toEqual([300, 0]); // [boundedHeight, 0]
    // The exact premise the render-bar backward-compat test depends on:
    expect(scale(0)).toBe(300);
  });

  it('mixed-sign data → symmetric zero-spanning domain (wins up / losses down)', () => {
    const scale = valueScale(
      barConfig([
        { label: 'W', value: 1 },
        { label: 'L', value: -1 },
      ])
    );

    expect(scale.domain()[0]).toBeCloseTo(-1.1); // -1 * 1.1
    expect(scale.domain()[1]).toBeCloseTo(1.1); // 1 * 1.1
    // Symmetric about zero, so the baseline sits at the vertical midpoint.
    expect(scale.domain()[0]).toBeCloseTo(-scale.domain()[1]);
    expect(scale(0)).toBeCloseTo(150); // midpoint of [300, 0]
  });

  it('all-negative data → domain ends at 0 (top pinned to the baseline)', () => {
    const scale = valueScale(
      barConfig([
        { label: 'A', value: -2 },
        { label: 'B', value: -4 },
      ])
    );

    expect(scale.domain()[0]).toBeCloseTo(-4.4); // -4 * 1.1
    expect(scale.domain()[1]).toBe(0);
    expect(scale(0)).toBe(0); // zero sits at the top (range end)
  });
});
