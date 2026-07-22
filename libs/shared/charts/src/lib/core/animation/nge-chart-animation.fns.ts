import type {
  NgeChartAnimationConfig,
  ResolvedNgeChartAnimation,
} from './nge-chart-animation.models';

import { NGE_CHART_ANIMATION_DEFAULTS } from './nge-chart-animation.defaults';

/**
 * Resolve the standard enter / update / exit animation for a single layer.
 *
 * Per-phase precedence (first defined wins):
 *   per-layer `animation.<phase>Ms` → per-layer `animationMs` shorthand →
 *   chart-wide `animation.<phase>Ms` → {@link NGE_CHART_ANIMATION_DEFAULTS}.
 *
 * `animationMs` is the legacy single-scalar knob every layer config still accepts; it
 * sets enter = update = exit = that value. `animationMs: 0` (or `enabled: false`)
 * collapses every phase to 0 — instant, no transitions — which is the contract the
 * zoom/pan transforms depend on for smear-free per-frame renders.
 *
 * @param chartAnimation Chart-wide `config.animation`, applied to every layer.
 * @param layerAnimation Per-layer `layer.animation` override (wins over the shorthand).
 * @param layerAnimationMs Per-layer `layer.animationMs` legacy shorthand.
 */
export function resolveAnimation(
  chartAnimation?: NgeChartAnimationConfig,
  layerAnimation?: NgeChartAnimationConfig,
  layerAnimationMs?: number
): ResolvedNgeChartAnimation {
  const enabled = layerAnimation?.enabled ?? chartAnimation?.enabled ?? true;

  if (!enabled) {
    return { ...NGE_CHART_ANIMATION_DEFAULTS, enterMs: 0, exitMs: 0, updateMs: 0 };
  }

  const phase = (
    layerMs: number | undefined,
    chartMs: number | undefined,
    fallback: number
  ): number => layerMs ?? layerAnimationMs ?? chartMs ?? fallback;

  return {
    easing:
      layerAnimation?.easing ?? chartAnimation?.easing ?? NGE_CHART_ANIMATION_DEFAULTS.easing,
    enterMs: phase(
      layerAnimation?.enterMs,
      chartAnimation?.enterMs,
      NGE_CHART_ANIMATION_DEFAULTS.enterMs
    ),
    exitMs: phase(
      layerAnimation?.exitMs,
      chartAnimation?.exitMs,
      NGE_CHART_ANIMATION_DEFAULTS.exitMs
    ),
    updateMs: phase(
      layerAnimation?.updateMs,
      chartAnimation?.updateMs,
      NGE_CHART_ANIMATION_DEFAULTS.updateMs
    ),
  };
}
