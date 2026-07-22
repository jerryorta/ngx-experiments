import { easeCubicInOut, easeLinear } from 'd3-ease';

import { NGE_CHART_ANIMATION_DEFAULTS } from './nge-chart-animation.defaults';
import { resolveAnimation } from './nge-chart-animation.fns';

describe('resolveAnimation', () => {
  it('applies the standard defaults when nothing is provided', () => {
    expect(resolveAnimation()).toEqual(NGE_CHART_ANIMATION_DEFAULTS);
  });

  it('fills unspecified phases from the defaults (partial chart-wide config)', () => {
    expect(resolveAnimation({ exitMs: 999 })).toEqual({
      ...NGE_CHART_ANIMATION_DEFAULTS,
      exitMs: 999,
    });
  });

  it('lets a per-layer animation override win over the chart-wide one', () => {
    const result = resolveAnimation({ enterMs: 500 }, { enterMs: 800 });
    expect(result.enterMs).toBe(800);
  });

  it('treats animationMs as an enter = update = exit shorthand', () => {
    const result = resolveAnimation(undefined, undefined, 120);
    expect(result.enterMs).toBe(120);
    expect(result.updateMs).toBe(120);
    expect(result.exitMs).toBe(120);
  });

  it('ranks the per-layer animationMs shorthand above chart-wide durations', () => {
    const result = resolveAnimation({ enterMs: 900 }, undefined, 120);
    expect(result.enterMs).toBe(120);
  });

  it('lets the per-layer animation object win over the animationMs shorthand', () => {
    const result = resolveAnimation(undefined, { exitMs: 50 }, 120);
    expect(result.exitMs).toBe(50);
    expect(result.enterMs).toBe(120);
    expect(result.updateMs).toBe(120);
  });

  it('collapses every phase to 0 when the animationMs shorthand is 0 (gesture suppression)', () => {
    const result = resolveAnimation({ enterMs: 500 }, undefined, 0);
    expect(result.enterMs).toBe(0);
    expect(result.updateMs).toBe(0);
    expect(result.exitMs).toBe(0);
  });

  it('collapses every phase to 0 when enabled is false, keeping the default easing', () => {
    const result = resolveAnimation({ enabled: false, enterMs: 500 });
    expect(result.enterMs).toBe(0);
    expect(result.updateMs).toBe(0);
    expect(result.exitMs).toBe(0);
    expect(result.easing).toBe(NGE_CHART_ANIMATION_DEFAULTS.easing);
  });

  it('lets a per-layer enabled flag re-enable animation over a chart-wide disable', () => {
    const result = resolveAnimation({ enabled: false }, { enabled: true, enterMs: 400 });
    expect(result.enterMs).toBe(400);
  });

  it('applies a custom easing function and defaults to easeCubicInOut', () => {
    expect(resolveAnimation({ easing: easeLinear }).easing).toBe(easeLinear);
    expect(resolveAnimation().easing).toBe(easeCubicInOut);
  });
});
