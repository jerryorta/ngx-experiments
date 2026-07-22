import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartLayerDefinition } from '../core/config';
import type { NgeChartLayerContext } from '../core/layer';
import type { NgeChartTheme } from '../core/theme';
import type { NgeTooltipConfig, NgeTooltipHandlers } from '../core/tooltip';

import { resolveAnimation } from '../core/animation';
import { mergeTooltipConfig } from '../core/tooltip';

/**
 * Context required for rendering layers
 */
export interface RenderLayersContext {
  /** Chart-wide animation default (`config.animation`); resolved per-layer. */
  animation?: NgeChartAnimationConfig;
  bounds: NgeChartLayerContext<any, any, any>['bounds'];
  dimensions: NgeChartLayerContext<any, any, any>['dimensions'];
  margins: { bottom: number; left: number; right: number; top: number };
  scales: NgeChartLayerContext<any, any, any>['scales'];
  tooltipElement?: HTMLElement | null;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render all layers. Each layer must have a renderer function.
 */
export function renderLayers(
  layers: NgeChartLayerDefinition[],
  baseContext: RenderLayersContext,
  theme?: NgeChartTheme
): void {
  for (const layer of layers) {
    const layerTheme = theme?.[layer.type as keyof NgeChartTheme];
    const layerTooltip = (layer as { tooltip?: Partial<NgeTooltipConfig<unknown>> }).tooltip;
    const tooltipConfig = layerTooltip ? mergeTooltipConfig(layerTooltip) : undefined;

    // Resolve the standard enter/update/exit animation for this layer: chart-wide
    // default ← per-layer `animationMs` shorthand ← per-layer `animation` override.
    const animation = resolveAnimation(
      baseContext.animation,
      (layer as { animation?: NgeChartAnimationConfig }).animation,
      (layer as { animationMs?: number }).animationMs
    );

    (layer.renderer as any)({
      animation,
      bounds: baseContext.bounds,
      config: layer,
      data: layer.data,
      dimensions: baseContext.dimensions,
      margins: baseContext.margins,
      scales: baseContext.scales,
      theme: layerTheme,
      tooltipConfig,
      tooltipElement: baseContext.tooltipElement,
      tooltipHandlers: baseContext.tooltipHandlers,
    });
  }
}
