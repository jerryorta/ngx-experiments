import { easeCubicInOut } from 'd3-ease';

import type { ResolvedNgeChartAnimation } from './nge-chart-animation.models';

/**
 * The standard animation every layer gets when nothing overrides it:
 * **300ms enter / 300ms update / 200ms exit**, eased with `easeCubicInOut` (which is
 * also D3's own `.transition()` default). Single source of truth — layers no longer
 * scatter their own `?? 300` / `?? 200` fallbacks or hardcode `.duration(300)`.
 */
export const NGE_CHART_ANIMATION_DEFAULTS: ResolvedNgeChartAnimation = {
  easing: easeCubicInOut,
  enterMs: 300,
  exitMs: 200,
  updateMs: 300,
};
