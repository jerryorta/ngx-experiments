/**
 * The standard enter / update / exit animation contract shared by every chart layer.
 *
 * A render fn never reads a raw config value — the renderer resolves the standard
 * (merging chart-wide `config.animation`, the per-layer `animationMs` shorthand, and
 * any per-layer `animation` override against `NGE_CHART_ANIMATION_DEFAULTS`) and
 * injects a fully-resolved {@link ResolvedNgeChartAnimation} onto the layer render
 * context as `context.animation`. Layers read `context.animation.{enterMs,updateMs,
 * exitMs,easing}` and NEVER hardcode a transition duration. See
 * `docs/architecture/charts.md` § Rendering discipline.
 *
 * All fields are optional here (the configurable surface); every gap falls back to
 * the standard default.
 */
export interface NgeChartAnimationConfig {
  /**
   * Easing applied to all three phases — the d3-ease signature
   * `(t: number) => number` (e.g. `easeCubicInOut`, `easeCubicOut`). Default
   * `easeCubicInOut` (also D3's own transition default).
   */
  easing?: (normalizedTime: number) => number;
  /**
   * Master switch. `false` makes renders instant (every phase collapses to 0ms, no
   * transitions) regardless of the durations below — a semantic alias for the
   * `animationMs: 0` gesture-suppression knob. Default `true`.
   */
  enabled?: boolean;
  /** Enter (birth) transition duration in ms — new marks growing / fading in. Default 300. */
  enterMs?: number;
  /** Exit transition duration in ms — removed marks fading out before `.remove()`. Default 200. */
  exitMs?: number;
  /**
   * Update (survivor) transition duration in ms — existing marks repositioning /
   * re-theming after a data, theme or resize change. Default 300.
   */
  updateMs?: number;
}

/**
 * A fully-resolved animation — every field required. What the renderer injects onto
 * the layer render context (`context.animation`); produced by `resolveAnimation`.
 */
export interface ResolvedNgeChartAnimation {
  /** Easing function applied to every phase transition. */
  easing: (normalizedTime: number) => number;
  /** Enter (birth) transition duration in ms. */
  enterMs: number;
  /** Exit (fade-out before remove) transition duration in ms. */
  exitMs: number;
  /** Update (survivor reposition / re-theme) transition duration in ms. */
  updateMs: number;
}
