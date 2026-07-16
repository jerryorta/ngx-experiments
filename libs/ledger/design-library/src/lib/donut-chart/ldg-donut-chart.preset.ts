import type { NgeChartConfig, NgeChartLayerDefinition } from '@nge/charts';

import type { LdgDonutLayerConfig, LdgDonutSegment } from './ldg-donut.models';

import { DEFAULT_LDG_DONUT_LAYER_THEME } from './ldg-donut.theme';
import { renderLdgDonutLayer } from './render-ldg-donut-layer';

/** Options for {@link createLdgDonutChartConfig}. */
export interface LdgDonutChartPresetOptions {
  /** Center label drawn in the hole (e.g. 'Total'). */
  centerLabel?: string;
  /** Center value drawn in the hole (e.g. '$4,231'), pre-formatted. */
  centerValue?: string;
  /** Slices, in order. */
  data: LdgDonutSegment[];
  /** Render the chart's built-in legend from the segment labels/colors. */
  legend?: boolean;
  /** Legend position when `legend` is true. Default: 'right'. */
  legendPosition?: 'bottom' | 'left' | 'right' | 'top';
  /** Slice-click handler. */
  onSegmentClick?: (segment: LdgDonutSegment) => void;
  /** Inner-radius ratio (0 = filled pie, →1 = thinner ring). Default 0.55. */
  thickness?: number;
}

const FALLBACK_COLORS = DEFAULT_LDG_DONUT_LAYER_THEME.seriesColors;

/**
 * Build an `NgeChartConfig` for a donut, consumed as
 * `<nge-chart [config]="createLdgDonutChartConfig({ data })" />`. Axes are off
 * (a radial chart has none); the legend, if enabled, mirrors each segment's
 * color/label. The donut layer is a domain-incubated `type: 'donut'` — not yet
 * in the shared `NgeChartLayerType` union — so it's cast into `layers` here; the
 * `<nge-chart>` layer registry still calls its `renderer` generically
 * (`docs/architecture/charts.md`).
 */
export function createLdgDonutChartConfig(options: LdgDonutChartPresetOptions): NgeChartConfig {
  const { centerLabel, centerValue, data, legend = false, legendPosition = 'right', onSegmentClick, thickness } = options;

  const donutLayer: LdgDonutLayerConfig = {
    centerLabel,
    centerValue,
    data,
    onSegmentClick,
    renderer: renderLdgDonutLayer,
    thickness,
    type: 'donut',
  };

  return {
    base: { margin: { bottom: 8, left: 8, right: 8, top: 8 }, showXAxis: false, showYAxis: false },
    // Domain-incubated layer type — cast bridges it into the shared union (see above).
    layers: [donutLayer as unknown as NgeChartLayerDefinition],
    legend: legend
      ? {
          enabled: true,
          items: data.map((segment, index) => ({
            color: segment.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
            label: segment.label,
          })),
          position: legendPosition,
        }
      : undefined,
  };
}
