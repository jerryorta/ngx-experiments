import type {
  NgeAreaLayerTheme,
  NgeBarLayerTheme,
  NgeBulletLayerTheme,
  NgeBumpLayerTheme,
  NgeChartBaseTheme,
  NgeChartTheme,
  NgeChordLayerTheme,
  NgeDistributionLayerTheme,
  NgeDivergingBarLayerTheme,
  NgeFinancialLayerTheme,
  NgeFunnelLayerTheme,
  NgeGaugeLayerTheme,
  NgeGroupedBarLayerTheme,
  NgeHeatmapLayerTheme,
  NgeHistogramLayerTheme,
  NgeLineLayerTheme,
  NgeLollipopLayerTheme,
  NgeNetworkLayerTheme,
  NgeOverlayLayerTheme,
  NgeParallelCoordsLayerTheme,
  NgePieLayerTheme,
  NgeProportionalLayerTheme,
  NgeRadarLayerTheme,
  NgeRadialBarLayerTheme,
  NgeSankeyLayerTheme,
  NgeScatterLayerTheme,
  NgeStackedBarLayerTheme,
  NgeSunburstLayerTheme,
  NgeTimelineLayerTheme,
  NgeTreeLayerTheme,
  NgeTreemapLayerTheme,
  NgeWaterfallLayerTheme,
  NgeWordCloudLayerTheme,
  ResolvedNgeAreaLayerTheme,
  ResolvedNgeBarLayerTheme,
  ResolvedNgeBulletLayerTheme,
  ResolvedNgeBumpLayerTheme,
  ResolvedNgeChordLayerTheme,
  ResolvedNgeDistributionLayerTheme,
  ResolvedNgeDivergingBarLayerTheme,
  ResolvedNgeFinancialLayerTheme,
  ResolvedNgeFunnelLayerTheme,
  ResolvedNgeGaugeLayerTheme,
  ResolvedNgeGroupedBarLayerTheme,
  ResolvedNgeHeatmapLayerTheme,
  ResolvedNgeHistogramLayerTheme,
  ResolvedNgeLineLayerTheme,
  ResolvedNgeLollipopLayerTheme,
  ResolvedNgeNetworkLayerTheme,
  ResolvedNgeOverlayLayerTheme,
  ResolvedNgeParallelCoordsLayerTheme,
  ResolvedNgePieLayerTheme,
  ResolvedNgeProportionalLayerTheme,
  ResolvedNgeRadarLayerTheme,
  ResolvedNgeRadialBarLayerTheme,
  ResolvedNgeSankeyLayerTheme,
  ResolvedNgeScatterLayerTheme,
  ResolvedNgeStackedBarLayerTheme,
  ResolvedNgeSunburstLayerTheme,
  ResolvedNgeTimelineLayerTheme,
  ResolvedNgeTreeLayerTheme,
  ResolvedNgeTreemapLayerTheme,
  ResolvedNgeWaterfallLayerTheme,
  ResolvedNgeWordCloudLayerTheme,
} from './nge-chart-theme.models';

import {
  DEFAULT_AREA_LAYER_THEME,
  DEFAULT_BAR_LAYER_THEME,
  DEFAULT_BULLET_LAYER_THEME,
  DEFAULT_BUMP_LAYER_THEME,
  DEFAULT_CHORD_LAYER_THEME,
  DEFAULT_DISTRIBUTION_LAYER_THEME,
  DEFAULT_DIVERGING_BAR_LAYER_THEME,
  DEFAULT_FINANCIAL_LAYER_THEME,
  DEFAULT_FUNNEL_LAYER_THEME,
  DEFAULT_GAUGE_LAYER_THEME,
  DEFAULT_NGE_CHART_BASE_THEME,
  DEFAULT_GROUPED_BAR_LAYER_THEME,
  DEFAULT_HEATMAP_LAYER_THEME,
  DEFAULT_HISTOGRAM_LAYER_THEME,
  DEFAULT_LINE_LAYER_THEME,
  DEFAULT_LOLLIPOP_LAYER_THEME,
  DEFAULT_NETWORK_LAYER_THEME,
  DEFAULT_OVERLAY_LAYER_THEME,
  DEFAULT_PARALLEL_COORDS_LAYER_THEME,
  DEFAULT_PIE_LAYER_THEME,
  DEFAULT_PROPORTIONAL_LAYER_THEME,
  DEFAULT_RADAR_LAYER_THEME,
  DEFAULT_RADIAL_BAR_LAYER_THEME,
  DEFAULT_SANKEY_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
  DEFAULT_STACKED_BAR_LAYER_THEME,
  DEFAULT_SUNBURST_LAYER_THEME,
  DEFAULT_TIMELINE_LAYER_THEME,
  DEFAULT_TREE_LAYER_THEME,
  DEFAULT_TREEMAP_LAYER_THEME,
  DEFAULT_WATERFALL_LAYER_THEME,
  DEFAULT_WORDCLOUD_LAYER_THEME,
} from './nge-chart-theme.defaults';

/**
 * Remove undefined values from an object so they don't override defaults during spread
 */
function filterUndefined<T extends Record<string, unknown>>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * Deep merge user base theme with defaults
 */
export function mergeBaseTheme(
  userTheme?: Partial<NgeChartBaseTheme>
): Required<NgeChartBaseTheme> {
  if (!userTheme) {
    return DEFAULT_NGE_CHART_BASE_THEME;
  }

  return {
    axis: {
      ...DEFAULT_NGE_CHART_BASE_THEME.axis,
      ...filterUndefined(userTheme.axis),
      group: {
        ...DEFAULT_NGE_CHART_BASE_THEME.axis.group,
        ...filterUndefined(userTheme.axis?.group),
      },
    },
    grid: { ...DEFAULT_NGE_CHART_BASE_THEME.grid, ...filterUndefined(userTheme.grid) },
  };
}

/**
 * Deep merge user area layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeAreaLayerTheme(
  userTheme?: Partial<NgeAreaLayerTheme>
): ResolvedNgeAreaLayerTheme {
  if (!userTheme) {
    return DEFAULT_AREA_LAYER_THEME as ResolvedNgeAreaLayerTheme;
  }

  return {
    fill: { ...DEFAULT_AREA_LAYER_THEME.fill, ...filterUndefined(userTheme.fill) },
    label: { ...DEFAULT_AREA_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    line: { ...DEFAULT_AREA_LAYER_THEME.line, ...filterUndefined(userTheme.line) },
  } as ResolvedNgeAreaLayerTheme;
}

/**
 * Deep merge user bar layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeBarLayerTheme(
  userTheme?: Partial<NgeBarLayerTheme>
): ResolvedNgeBarLayerTheme {
  if (!userTheme) {
    return DEFAULT_BAR_LAYER_THEME as ResolvedNgeBarLayerTheme;
  }

  return {
    bar: { ...DEFAULT_BAR_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    categoryLabel: {
      ...DEFAULT_BAR_LAYER_THEME.categoryLabel,
      ...filterUndefined(userTheme.categoryLabel),
    },
    label: { ...DEFAULT_BAR_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    statistical: {
      ...DEFAULT_BAR_LAYER_THEME.statistical,
      ...filterUndefined(userTheme.statistical),
    },
  } as ResolvedNgeBarLayerTheme;
}

/**
 * Deep merge user heatmap layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeHeatmapLayerTheme(
  userTheme?: Partial<NgeHeatmapLayerTheme>
): ResolvedNgeHeatmapLayerTheme {
  if (!userTheme) {
    return DEFAULT_HEATMAP_LAYER_THEME as ResolvedNgeHeatmapLayerTheme;
  }

  return {
    bubble: { ...DEFAULT_HEATMAP_LAYER_THEME.bubble, ...filterUndefined(userTheme.bubble) },
    cell: { ...DEFAULT_HEATMAP_LAYER_THEME.cell, ...filterUndefined(userTheme.cell) },
    label: { ...DEFAULT_HEATMAP_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
  } as ResolvedNgeHeatmapLayerTheme;
}

/**
 * Deep merge user histogram layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeHistogramLayerTheme(
  userTheme?: Partial<NgeHistogramLayerTheme>
): ResolvedNgeHistogramLayerTheme {
  if (!userTheme) {
    return DEFAULT_HISTOGRAM_LAYER_THEME as ResolvedNgeHistogramLayerTheme;
  }

  return {
    bar: { ...DEFAULT_HISTOGRAM_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    curve: { ...DEFAULT_HISTOGRAM_LAYER_THEME.curve, ...filterUndefined(userTheme.curve) },
    label: { ...DEFAULT_HISTOGRAM_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    node: { ...DEFAULT_HISTOGRAM_LAYER_THEME.node, ...filterUndefined(userTheme.node) },
    zeroLine: {
      ...DEFAULT_HISTOGRAM_LAYER_THEME.zeroLine,
      ...filterUndefined(userTheme.zeroLine),
    },
  } as ResolvedNgeHistogramLayerTheme;
}

/**
 * Deep merge user line layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeLineLayerTheme(
  userTheme?: Partial<NgeLineLayerTheme>
): ResolvedNgeLineLayerTheme {
  if (!userTheme) {
    return DEFAULT_LINE_LAYER_THEME as ResolvedNgeLineLayerTheme;
  }

  return {
    area: { ...DEFAULT_LINE_LAYER_THEME.area, ...filterUndefined(userTheme.area) },
    label: { ...DEFAULT_LINE_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    line: { ...DEFAULT_LINE_LAYER_THEME.line, ...filterUndefined(userTheme.line) },
    point: { ...DEFAULT_LINE_LAYER_THEME.point, ...filterUndefined(userTheme.point) },
  } as ResolvedNgeLineLayerTheme;
}

/**
 * Deep merge user bump layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeBumpLayerTheme(
  userTheme?: Partial<NgeBumpLayerTheme>
): ResolvedNgeBumpLayerTheme {
  if (!userTheme) {
    return DEFAULT_BUMP_LAYER_THEME as ResolvedNgeBumpLayerTheme;
  }

  return {
    label: { ...DEFAULT_BUMP_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    line: { ...DEFAULT_BUMP_LAYER_THEME.line, ...filterUndefined(userTheme.line) },
    point: { ...DEFAULT_BUMP_LAYER_THEME.point, ...filterUndefined(userTheme.point) },
  } as ResolvedNgeBumpLayerTheme;
}

/**
 * Deep merge user lollipop layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeLollipopLayerTheme(
  userTheme?: Partial<NgeLollipopLayerTheme>
): ResolvedNgeLollipopLayerTheme {
  if (!userTheme) {
    return DEFAULT_LOLLIPOP_LAYER_THEME as ResolvedNgeLollipopLayerTheme;
  }

  return {
    label: { ...DEFAULT_LOLLIPOP_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    marker: { ...DEFAULT_LOLLIPOP_LAYER_THEME.marker, ...filterUndefined(userTheme.marker) },
    stem: { ...DEFAULT_LOLLIPOP_LAYER_THEME.stem, ...filterUndefined(userTheme.stem) },
  } as ResolvedNgeLollipopLayerTheme;
}

/**
 * Deep merge user overlay layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeOverlayLayerTheme(
  userTheme?: Partial<NgeOverlayLayerTheme>
): ResolvedNgeOverlayLayerTheme {
  if (!userTheme) {
    return DEFAULT_OVERLAY_LAYER_THEME as ResolvedNgeOverlayLayerTheme;
  }

  return {
    band: { ...DEFAULT_OVERLAY_LAYER_THEME.band, ...filterUndefined(userTheme.band) },
    fitLine: { ...DEFAULT_OVERLAY_LAYER_THEME.fitLine, ...filterUndefined(userTheme.fitLine) },
    limitLine: {
      ...DEFAULT_OVERLAY_LAYER_THEME.limitLine,
      ...filterUndefined(userTheme.limitLine),
    },
    meanLine: { ...DEFAULT_OVERLAY_LAYER_THEME.meanLine, ...filterUndefined(userTheme.meanLine) },
  } as ResolvedNgeOverlayLayerTheme;
}

/**
 * Deep merge user pie layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergePieLayerTheme(
  userTheme?: Partial<NgePieLayerTheme>
): ResolvedNgePieLayerTheme {
  if (!userTheme) {
    return DEFAULT_PIE_LAYER_THEME as ResolvedNgePieLayerTheme;
  }

  return {
    label: { ...DEFAULT_PIE_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    labelOutside: {
      ...DEFAULT_PIE_LAYER_THEME.labelOutside,
      ...filterUndefined(userTheme.labelOutside),
    },
    leaderLine: {
      ...DEFAULT_PIE_LAYER_THEME.leaderLine,
      ...filterUndefined(userTheme.leaderLine),
    },
    slice: { ...DEFAULT_PIE_LAYER_THEME.slice, ...filterUndefined(userTheme.slice) },
  } as ResolvedNgePieLayerTheme;
}

/**
 * Deep merge user sunburst layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeSunburstLayerTheme(
  userTheme?: Partial<NgeSunburstLayerTheme>
): ResolvedNgeSunburstLayerTheme {
  if (!userTheme) {
    return DEFAULT_SUNBURST_LAYER_THEME as ResolvedNgeSunburstLayerTheme;
  }

  return {
    label: { ...DEFAULT_SUNBURST_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    segment: { ...DEFAULT_SUNBURST_LAYER_THEME.segment, ...filterUndefined(userTheme.segment) },
  } as ResolvedNgeSunburstLayerTheme;
}

/**
 * Deep merge user proportional-area / waffle layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeProportionalLayerTheme(
  userTheme?: Partial<NgeProportionalLayerTheme>
): ResolvedNgeProportionalLayerTheme {
  if (!userTheme) {
    return DEFAULT_PROPORTIONAL_LAYER_THEME as ResolvedNgeProportionalLayerTheme;
  }

  return {
    emptyCell: {
      ...DEFAULT_PROPORTIONAL_LAYER_THEME.emptyCell,
      ...filterUndefined(userTheme.emptyCell),
    },
    label: { ...DEFAULT_PROPORTIONAL_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    mark: { ...DEFAULT_PROPORTIONAL_LAYER_THEME.mark, ...filterUndefined(userTheme.mark) },
  } as ResolvedNgeProportionalLayerTheme;
}

/**
 * Deep merge user radar / polar (spider / star) layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeRadarLayerTheme(
  userTheme?: Partial<NgeRadarLayerTheme>
): ResolvedNgeRadarLayerTheme {
  if (!userTheme) {
    return DEFAULT_RADAR_LAYER_THEME as ResolvedNgeRadarLayerTheme;
  }

  return {
    axis: { ...DEFAULT_RADAR_LAYER_THEME.axis, ...filterUndefined(userTheme.axis) },
    grid: { ...DEFAULT_RADAR_LAYER_THEME.grid, ...filterUndefined(userTheme.grid) },
    label: { ...DEFAULT_RADAR_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    series: { ...DEFAULT_RADAR_LAYER_THEME.series, ...filterUndefined(userTheme.series) },
  } as ResolvedNgeRadarLayerTheme;
}

/**
 * Deep merge user radial-bar (polar) layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeRadialBarLayerTheme(
  userTheme?: Partial<NgeRadialBarLayerTheme>
): ResolvedNgeRadialBarLayerTheme {
  if (!userTheme) {
    return DEFAULT_RADIAL_BAR_LAYER_THEME as ResolvedNgeRadialBarLayerTheme;
  }

  return {
    area: { ...DEFAULT_RADIAL_BAR_LAYER_THEME.area, ...filterUndefined(userTheme.area) },
    bar: { ...DEFAULT_RADIAL_BAR_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    cell: { ...DEFAULT_RADIAL_BAR_LAYER_THEME.cell, ...filterUndefined(userTheme.cell) },
    label: { ...DEFAULT_RADIAL_BAR_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    labelOutside: {
      ...DEFAULT_RADIAL_BAR_LAYER_THEME.labelOutside,
      ...filterUndefined(userTheme.labelOutside),
    },
  } as ResolvedNgeRadialBarLayerTheme;
}

/**
 * Deep merge user scatter layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeScatterLayerTheme(
  userTheme?: Partial<NgeScatterLayerTheme>
): ResolvedNgeScatterLayerTheme {
  if (!userTheme) {
    return DEFAULT_SCATTER_LAYER_THEME as ResolvedNgeScatterLayerTheme;
  }

  return {
    point: { ...DEFAULT_SCATTER_LAYER_THEME.point, ...filterUndefined(userTheme.point) },
  } as ResolvedNgeScatterLayerTheme;
}

/**
 * Deep merge user bullet layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeBulletLayerTheme(
  userTheme?: Partial<NgeBulletLayerTheme>
): ResolvedNgeBulletLayerTheme {
  if (!userTheme) {
    return DEFAULT_BULLET_LAYER_THEME as ResolvedNgeBulletLayerTheme;
  }

  return {
    backgroundBar: {
      ...DEFAULT_BULLET_LAYER_THEME.backgroundBar,
      ...filterUndefined(userTheme.backgroundBar),
    },
    limitIndicator: {
      ...DEFAULT_BULLET_LAYER_THEME.limitIndicator,
      ...filterUndefined(userTheme.limitIndicator),
    },
    progressBar: {
      ...DEFAULT_BULLET_LAYER_THEME.progressBar,
      ...filterUndefined(userTheme.progressBar),
    },
    progressIndicator: {
      ...DEFAULT_BULLET_LAYER_THEME.progressIndicator,
      ...filterUndefined(userTheme.progressIndicator),
    },
  } as ResolvedNgeBulletLayerTheme;
}

/**
 * Deep merge user distribution layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeDistributionLayerTheme(
  userTheme?: Partial<NgeDistributionLayerTheme>
): ResolvedNgeDistributionLayerTheme {
  if (!userTheme) {
    return DEFAULT_DISTRIBUTION_LAYER_THEME as ResolvedNgeDistributionLayerTheme;
  }

  return {
    box: { ...DEFAULT_DISTRIBUTION_LAYER_THEME.box, ...filterUndefined(userTheme.box) },
    mean: { ...DEFAULT_DISTRIBUTION_LAYER_THEME.mean, ...filterUndefined(userTheme.mean) },
    median: { ...DEFAULT_DISTRIBUTION_LAYER_THEME.median, ...filterUndefined(userTheme.median) },
    outlier: {
      ...DEFAULT_DISTRIBUTION_LAYER_THEME.outlier,
      ...filterUndefined(userTheme.outlier),
    },
    point: { ...DEFAULT_DISTRIBUTION_LAYER_THEME.point, ...filterUndefined(userTheme.point) },
    violin: { ...DEFAULT_DISTRIBUTION_LAYER_THEME.violin, ...filterUndefined(userTheme.violin) },
    whisker: {
      ...DEFAULT_DISTRIBUTION_LAYER_THEME.whisker,
      ...filterUndefined(userTheme.whisker),
    },
  } as ResolvedNgeDistributionLayerTheme;
}

/**
 * Deep merge user diverging bar layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeDivergingBarLayerTheme(
  userTheme?: Partial<NgeDivergingBarLayerTheme>
): ResolvedNgeDivergingBarLayerTheme {
  if (!userTheme) {
    return DEFAULT_DIVERGING_BAR_LAYER_THEME as ResolvedNgeDivergingBarLayerTheme;
  }

  return {
    backgroundBar: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.backgroundBar,
      ...filterUndefined(userTheme.backgroundBar),
    },
    centerIndicator: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.centerIndicator,
      ...filterUndefined(userTheme.centerIndicator),
    },
    limitIndicator: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.limitIndicator,
      ...filterUndefined(userTheme.limitIndicator),
    },
    negativeBar: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.negativeBar,
      ...filterUndefined(userTheme.negativeBar),
    },
    positiveBar: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.positiveBar,
      ...filterUndefined(userTheme.positiveBar),
    },
    valueIndicator: {
      ...DEFAULT_DIVERGING_BAR_LAYER_THEME.valueIndicator,
      ...filterUndefined(userTheme.valueIndicator),
    },
  } as ResolvedNgeDivergingBarLayerTheme;
}

/**
 * Deep merge user financial layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeFinancialLayerTheme(
  userTheme?: Partial<NgeFinancialLayerTheme>
): ResolvedNgeFinancialLayerTheme {
  if (!userTheme) {
    return DEFAULT_FINANCIAL_LAYER_THEME as ResolvedNgeFinancialLayerTheme;
  }

  return {
    down: { ...DEFAULT_FINANCIAL_LAYER_THEME.down, ...filterUndefined(userTheme.down) },
    kagi: { ...DEFAULT_FINANCIAL_LAYER_THEME.kagi, ...filterUndefined(userTheme.kagi) },
    up: { ...DEFAULT_FINANCIAL_LAYER_THEME.up, ...filterUndefined(userTheme.up) },
    wick: { ...DEFAULT_FINANCIAL_LAYER_THEME.wick, ...filterUndefined(userTheme.wick) },
  } as ResolvedNgeFinancialLayerTheme;
}

/**
 * Deep merge user funnel / pyramid layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeFunnelLayerTheme(
  userTheme?: Partial<NgeFunnelLayerTheme>
): ResolvedNgeFunnelLayerTheme {
  if (!userTheme) {
    return DEFAULT_FUNNEL_LAYER_THEME as ResolvedNgeFunnelLayerTheme;
  }

  return {
    band: { ...DEFAULT_FUNNEL_LAYER_THEME.band, ...filterUndefined(userTheme.band) },
    label: { ...DEFAULT_FUNNEL_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    labelOutside: {
      ...DEFAULT_FUNNEL_LAYER_THEME.labelOutside,
      ...filterUndefined(userTheme.labelOutside),
    },
  } as ResolvedNgeFunnelLayerTheme;
}

/**
 * Deep merge user gauge (single-value meter) layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeGaugeLayerTheme(
  userTheme?: Partial<NgeGaugeLayerTheme>
): ResolvedNgeGaugeLayerTheme {
  if (!userTheme) {
    return DEFAULT_GAUGE_LAYER_THEME as ResolvedNgeGaugeLayerTheme;
  }

  return {
    label: { ...DEFAULT_GAUGE_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    needle: { ...DEFAULT_GAUGE_LAYER_THEME.needle, ...filterUndefined(userTheme.needle) },
    threshold: {
      ...DEFAULT_GAUGE_LAYER_THEME.threshold,
      ...filterUndefined(userTheme.threshold),
    },
    track: { ...DEFAULT_GAUGE_LAYER_THEME.track, ...filterUndefined(userTheme.track) },
    value: { ...DEFAULT_GAUGE_LAYER_THEME.value, ...filterUndefined(userTheme.value) },
  } as ResolvedNgeGaugeLayerTheme;
}

/**
 * Deep merge user grouped bar layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeGroupedBarLayerTheme(
  userTheme?: Partial<NgeGroupedBarLayerTheme>
): ResolvedNgeGroupedBarLayerTheme {
  if (!userTheme) {
    return DEFAULT_GROUPED_BAR_LAYER_THEME as ResolvedNgeGroupedBarLayerTheme;
  }

  return {
    bar: { ...DEFAULT_GROUPED_BAR_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    label: { ...DEFAULT_GROUPED_BAR_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
  } as ResolvedNgeGroupedBarLayerTheme;
}

/**
 * Deep merge user stacked-bar layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeStackedBarLayerTheme(
  userTheme?: Partial<NgeStackedBarLayerTheme>
): ResolvedNgeStackedBarLayerTheme {
  if (!userTheme) {
    return DEFAULT_STACKED_BAR_LAYER_THEME as ResolvedNgeStackedBarLayerTheme;
  }

  return {
    bar: { ...DEFAULT_STACKED_BAR_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    label: { ...DEFAULT_STACKED_BAR_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
  } as ResolvedNgeStackedBarLayerTheme;
}

/**
 * Deep merge user waterfall layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeWaterfallLayerTheme(
  userTheme?: Partial<NgeWaterfallLayerTheme>
): ResolvedNgeWaterfallLayerTheme {
  if (!userTheme) {
    return DEFAULT_WATERFALL_LAYER_THEME as ResolvedNgeWaterfallLayerTheme;
  }

  return {
    connector: {
      ...DEFAULT_WATERFALL_LAYER_THEME.connector,
      ...filterUndefined(userTheme.connector),
    },
    fall: { ...DEFAULT_WATERFALL_LAYER_THEME.fall, ...filterUndefined(userTheme.fall) },
    label: { ...DEFAULT_WATERFALL_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    rise: { ...DEFAULT_WATERFALL_LAYER_THEME.rise, ...filterUndefined(userTheme.rise) },
    total: { ...DEFAULT_WATERFALL_LAYER_THEME.total, ...filterUndefined(userTheme.total) },
  } as ResolvedNgeWaterfallLayerTheme;
}

/**
 * Deep merge user timeline layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeTimelineLayerTheme(
  userTheme?: Partial<NgeTimelineLayerTheme>
): ResolvedNgeTimelineLayerTheme {
  if (!userTheme) {
    return DEFAULT_TIMELINE_LAYER_THEME as ResolvedNgeTimelineLayerTheme;
  }

  return {
    bar: { ...DEFAULT_TIMELINE_LAYER_THEME.bar, ...filterUndefined(userTheme.bar) },
    label: { ...DEFAULT_TIMELINE_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    milestone: {
      ...DEFAULT_TIMELINE_LAYER_THEME.milestone,
      ...filterUndefined(userTheme.milestone),
    },
  } as ResolvedNgeTimelineLayerTheme;
}

/**
 * Deep merge user word cloud layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeWordCloudLayerTheme(
  userTheme?: Partial<NgeWordCloudLayerTheme>
): ResolvedNgeWordCloudLayerTheme {
  if (!userTheme) {
    return DEFAULT_WORDCLOUD_LAYER_THEME as ResolvedNgeWordCloudLayerTheme;
  }

  return {
    word: { ...DEFAULT_WORDCLOUD_LAYER_THEME.word, ...filterUndefined(userTheme.word) },
  } as ResolvedNgeWordCloudLayerTheme;
}

/**
 * Deep merge user parallel coordinates layer theme with defaults
 */
export function mergeParallelCoordsLayerTheme(
  userTheme?: Partial<NgeParallelCoordsLayerTheme>
): ResolvedNgeParallelCoordsLayerTheme {
  if (!userTheme) {
    return DEFAULT_PARALLEL_COORDS_LAYER_THEME as ResolvedNgeParallelCoordsLayerTheme;
  }

  return {
    axis: { ...DEFAULT_PARALLEL_COORDS_LAYER_THEME.axis, ...filterUndefined(userTheme.axis) },
    brush: { ...DEFAULT_PARALLEL_COORDS_LAYER_THEME.brush, ...filterUndefined(userTheme.brush) },
    label: { ...DEFAULT_PARALLEL_COORDS_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    line: { ...DEFAULT_PARALLEL_COORDS_LAYER_THEME.line, ...filterUndefined(userTheme.line) },
    tick: { ...DEFAULT_PARALLEL_COORDS_LAYER_THEME.tick, ...filterUndefined(userTheme.tick) },
  } as ResolvedNgeParallelCoordsLayerTheme;
}

/**
 * Deep merge user treemap layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeTreemapLayerTheme(
  userTheme?: Partial<NgeTreemapLayerTheme>
): ResolvedNgeTreemapLayerTheme {
  if (!userTheme) {
    return DEFAULT_TREEMAP_LAYER_THEME as ResolvedNgeTreemapLayerTheme;
  }

  return {
    cell: { ...DEFAULT_TREEMAP_LAYER_THEME.cell, ...filterUndefined(userTheme.cell) },
    label: { ...DEFAULT_TREEMAP_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
  } as ResolvedNgeTreemapLayerTheme;
}

/**
 * Deep merge user sankey layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeSankeyLayerTheme(
  userTheme?: Partial<NgeSankeyLayerTheme>
): ResolvedNgeSankeyLayerTheme {
  if (!userTheme) {
    return DEFAULT_SANKEY_LAYER_THEME as ResolvedNgeSankeyLayerTheme;
  }

  return {
    label: { ...DEFAULT_SANKEY_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    link: { ...DEFAULT_SANKEY_LAYER_THEME.link, ...filterUndefined(userTheme.link) },
    node: { ...DEFAULT_SANKEY_LAYER_THEME.node, ...filterUndefined(userTheme.node) },
  } as ResolvedNgeSankeyLayerTheme;
}

/**
 * Deep merge user chord layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeChordLayerTheme(
  userTheme?: Partial<NgeChordLayerTheme>
): ResolvedNgeChordLayerTheme {
  if (!userTheme) {
    return DEFAULT_CHORD_LAYER_THEME as ResolvedNgeChordLayerTheme;
  }

  return {
    label: { ...DEFAULT_CHORD_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    link: { ...DEFAULT_CHORD_LAYER_THEME.link, ...filterUndefined(userTheme.link) },
    node: { ...DEFAULT_CHORD_LAYER_THEME.node, ...filterUndefined(userTheme.node) },
  } as ResolvedNgeChordLayerTheme;
}

/**
 * Deep merge user network layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeNetworkLayerTheme(
  userTheme?: Partial<NgeNetworkLayerTheme>
): ResolvedNgeNetworkLayerTheme {
  if (!userTheme) {
    return DEFAULT_NETWORK_LAYER_THEME as ResolvedNgeNetworkLayerTheme;
  }

  return {
    axis: { ...DEFAULT_NETWORK_LAYER_THEME.axis, ...filterUndefined(userTheme.axis) },
    label: { ...DEFAULT_NETWORK_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    link: { ...DEFAULT_NETWORK_LAYER_THEME.link, ...filterUndefined(userTheme.link) },
    node: { ...DEFAULT_NETWORK_LAYER_THEME.node, ...filterUndefined(userTheme.node) },
  } as ResolvedNgeNetworkLayerTheme;
}

/**
 * Deep merge user tree layer theme with defaults.
 * Returns a fully resolved theme with all nested properties required.
 */
export function mergeTreeLayerTheme(
  userTheme?: Partial<NgeTreeLayerTheme>
): ResolvedNgeTreeLayerTheme {
  if (!userTheme) {
    return DEFAULT_TREE_LAYER_THEME as ResolvedNgeTreeLayerTheme;
  }

  return {
    label: { ...DEFAULT_TREE_LAYER_THEME.label, ...filterUndefined(userTheme.label) },
    link: { ...DEFAULT_TREE_LAYER_THEME.link, ...filterUndefined(userTheme.link) },
    node: { ...DEFAULT_TREE_LAYER_THEME.node, ...filterUndefined(userTheme.node) },
  } as ResolvedNgeTreeLayerTheme;
}

/**
 * Deep merge complete chart theme with defaults
 */
export function mergeNgeChartTheme(userTheme?: Partial<NgeChartTheme>): NgeChartTheme {
  if (!userTheme) {
    return {
      ...DEFAULT_NGE_CHART_BASE_THEME,
      area: DEFAULT_AREA_LAYER_THEME,
      bar: DEFAULT_BAR_LAYER_THEME,
      bullet: DEFAULT_BULLET_LAYER_THEME,
      bump: DEFAULT_BUMP_LAYER_THEME,
      chord: DEFAULT_CHORD_LAYER_THEME,
      distribution: DEFAULT_DISTRIBUTION_LAYER_THEME,
      'diverging-bar': DEFAULT_DIVERGING_BAR_LAYER_THEME,
      financial: DEFAULT_FINANCIAL_LAYER_THEME,
      funnel: DEFAULT_FUNNEL_LAYER_THEME,
      gauge: DEFAULT_GAUGE_LAYER_THEME,
      'grouped-bar': DEFAULT_GROUPED_BAR_LAYER_THEME,
      heatmap: DEFAULT_HEATMAP_LAYER_THEME,
      histogram: DEFAULT_HISTOGRAM_LAYER_THEME,
      line: DEFAULT_LINE_LAYER_THEME,
      lollipop: DEFAULT_LOLLIPOP_LAYER_THEME,
      network: DEFAULT_NETWORK_LAYER_THEME,
      overlay: DEFAULT_OVERLAY_LAYER_THEME,
      'parallel-coords': DEFAULT_PARALLEL_COORDS_LAYER_THEME,
      pie: DEFAULT_PIE_LAYER_THEME,
      proportional: DEFAULT_PROPORTIONAL_LAYER_THEME,
      radar: DEFAULT_RADAR_LAYER_THEME,
      'radial-bar': DEFAULT_RADIAL_BAR_LAYER_THEME,
      sankey: DEFAULT_SANKEY_LAYER_THEME,
      scatter: DEFAULT_SCATTER_LAYER_THEME,
      'stacked-bar': DEFAULT_STACKED_BAR_LAYER_THEME,
      sunburst: DEFAULT_SUNBURST_LAYER_THEME,
      timeline: DEFAULT_TIMELINE_LAYER_THEME,
      tree: DEFAULT_TREE_LAYER_THEME,
      treemap: DEFAULT_TREEMAP_LAYER_THEME,
      waterfall: DEFAULT_WATERFALL_LAYER_THEME,
      wordcloud: DEFAULT_WORDCLOUD_LAYER_THEME,
    };
  }

  return {
    area: userTheme.area ? mergeAreaLayerTheme(userTheme.area) : DEFAULT_AREA_LAYER_THEME,
    axis: {
      ...DEFAULT_NGE_CHART_BASE_THEME.axis,
      ...filterUndefined(userTheme.axis),
      group: {
        ...DEFAULT_NGE_CHART_BASE_THEME.axis.group,
        ...filterUndefined(userTheme.axis?.group),
      },
    },
    bar: mergeBarLayerTheme(userTheme.bar),
    bullet: userTheme.bullet ? mergeBulletLayerTheme(userTheme.bullet) : DEFAULT_BULLET_LAYER_THEME,
    bump: userTheme.bump ? mergeBumpLayerTheme(userTheme.bump) : DEFAULT_BUMP_LAYER_THEME,
    chord: userTheme.chord ? mergeChordLayerTheme(userTheme.chord) : DEFAULT_CHORD_LAYER_THEME,
    distribution: userTheme.distribution
      ? mergeDistributionLayerTheme(userTheme.distribution)
      : DEFAULT_DISTRIBUTION_LAYER_THEME,
    'diverging-bar': userTheme['diverging-bar']
      ? mergeDivergingBarLayerTheme(userTheme['diverging-bar'])
      : DEFAULT_DIVERGING_BAR_LAYER_THEME,
    financial: userTheme.financial
      ? mergeFinancialLayerTheme(userTheme.financial)
      : DEFAULT_FINANCIAL_LAYER_THEME,
    funnel: userTheme.funnel ? mergeFunnelLayerTheme(userTheme.funnel) : DEFAULT_FUNNEL_LAYER_THEME,
    gauge: userTheme.gauge ? mergeGaugeLayerTheme(userTheme.gauge) : DEFAULT_GAUGE_LAYER_THEME,
    grid: { ...DEFAULT_NGE_CHART_BASE_THEME.grid, ...filterUndefined(userTheme.grid) },
    'grouped-bar': userTheme['grouped-bar']
      ? mergeGroupedBarLayerTheme(userTheme['grouped-bar'])
      : DEFAULT_GROUPED_BAR_LAYER_THEME,
    heatmap: userTheme.heatmap
      ? mergeHeatmapLayerTheme(userTheme.heatmap)
      : DEFAULT_HEATMAP_LAYER_THEME,
    histogram: userTheme.histogram
      ? mergeHistogramLayerTheme(userTheme.histogram)
      : DEFAULT_HISTOGRAM_LAYER_THEME,
    line: userTheme.line ? mergeLineLayerTheme(userTheme.line) : DEFAULT_LINE_LAYER_THEME,
    lollipop: userTheme.lollipop
      ? mergeLollipopLayerTheme(userTheme.lollipop)
      : DEFAULT_LOLLIPOP_LAYER_THEME,
    network: userTheme.network
      ? mergeNetworkLayerTheme(userTheme.network)
      : DEFAULT_NETWORK_LAYER_THEME,
    overlay: userTheme.overlay
      ? mergeOverlayLayerTheme(userTheme.overlay)
      : DEFAULT_OVERLAY_LAYER_THEME,
    'parallel-coords': userTheme['parallel-coords']
      ? mergeParallelCoordsLayerTheme(userTheme['parallel-coords'])
      : DEFAULT_PARALLEL_COORDS_LAYER_THEME,
    pie: userTheme.pie ? mergePieLayerTheme(userTheme.pie) : DEFAULT_PIE_LAYER_THEME,
    proportional: userTheme.proportional
      ? mergeProportionalLayerTheme(userTheme.proportional)
      : DEFAULT_PROPORTIONAL_LAYER_THEME,
    radar: userTheme.radar ? mergeRadarLayerTheme(userTheme.radar) : DEFAULT_RADAR_LAYER_THEME,
    'radial-bar': userTheme['radial-bar']
      ? mergeRadialBarLayerTheme(userTheme['radial-bar'])
      : DEFAULT_RADIAL_BAR_LAYER_THEME,
    sankey: userTheme.sankey ? mergeSankeyLayerTheme(userTheme.sankey) : DEFAULT_SANKEY_LAYER_THEME,
    scatter: userTheme.scatter
      ? mergeScatterLayerTheme(userTheme.scatter)
      : DEFAULT_SCATTER_LAYER_THEME,
    'stacked-bar': userTheme['stacked-bar']
      ? mergeStackedBarLayerTheme(userTheme['stacked-bar'])
      : DEFAULT_STACKED_BAR_LAYER_THEME,
    sunburst: userTheme.sunburst
      ? mergeSunburstLayerTheme(userTheme.sunburst)
      : DEFAULT_SUNBURST_LAYER_THEME,
    timeline: userTheme.timeline
      ? mergeTimelineLayerTheme(userTheme.timeline)
      : DEFAULT_TIMELINE_LAYER_THEME,
    tree: userTheme.tree ? mergeTreeLayerTheme(userTheme.tree) : DEFAULT_TREE_LAYER_THEME,
    treemap: userTheme.treemap
      ? mergeTreemapLayerTheme(userTheme.treemap)
      : DEFAULT_TREEMAP_LAYER_THEME,
    waterfall: userTheme.waterfall
      ? mergeWaterfallLayerTheme(userTheme.waterfall)
      : DEFAULT_WATERFALL_LAYER_THEME,
    wordcloud: userTheme.wordcloud
      ? mergeWordCloudLayerTheme(userTheme.wordcloud)
      : DEFAULT_WORDCLOUD_LAYER_THEME,
  };
}
