import type {
  NgeBarLayerTheme,
  NgeBulletLayerTheme,
  NgeChartBaseTheme,
  NgeChartTheme,
  NgeDivergingBarLayerTheme,
  NgeGroupedBarLayerTheme,
  NgeLineLayerTheme,
  NgeScatterLayerTheme,
  ResolvedNgeBarLayerTheme,
  ResolvedNgeBulletLayerTheme,
  ResolvedNgeDivergingBarLayerTheme,
  ResolvedNgeGroupedBarLayerTheme,
  ResolvedNgeLineLayerTheme,
  ResolvedNgeScatterLayerTheme,
} from './nge-chart-theme.models';

import {
  DEFAULT_BAR_LAYER_THEME,
  DEFAULT_BULLET_LAYER_THEME,
  DEFAULT_CHART_BASE_THEME,
  DEFAULT_DIVERGING_BAR_LAYER_THEME,
  DEFAULT_GROUPED_BAR_LAYER_THEME,
  DEFAULT_LINE_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
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
    return DEFAULT_CHART_BASE_THEME;
  }

  return {
    axis: {
      ...DEFAULT_CHART_BASE_THEME.axis,
      ...filterUndefined(userTheme.axis),
      group: {
        ...DEFAULT_CHART_BASE_THEME.axis.group,
        ...filterUndefined(userTheme.axis?.group),
      },
    },
    grid: { ...DEFAULT_CHART_BASE_THEME.grid, ...filterUndefined(userTheme.grid) },
  };
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
 * Deep merge complete chart theme with defaults
 */
export function mergeChartTheme(userTheme?: Partial<NgeChartTheme>): NgeChartTheme {
  if (!userTheme) {
    return {
      ...DEFAULT_CHART_BASE_THEME,
      bar: DEFAULT_BAR_LAYER_THEME,
      bullet: DEFAULT_BULLET_LAYER_THEME,
      divergingBar: DEFAULT_DIVERGING_BAR_LAYER_THEME,
      'grouped-bar': DEFAULT_GROUPED_BAR_LAYER_THEME,
      line: DEFAULT_LINE_LAYER_THEME,
      scatter: DEFAULT_SCATTER_LAYER_THEME,
    };
  }

  return {
    axis: {
      ...DEFAULT_CHART_BASE_THEME.axis,
      ...filterUndefined(userTheme.axis),
      group: {
        ...DEFAULT_CHART_BASE_THEME.axis.group,
        ...filterUndefined(userTheme.axis?.group),
      },
    },
    bar: mergeBarLayerTheme(userTheme.bar),
    bullet: userTheme.bullet ? mergeBulletLayerTheme(userTheme.bullet) : DEFAULT_BULLET_LAYER_THEME,
    divergingBar: userTheme.divergingBar
      ? mergeDivergingBarLayerTheme(userTheme.divergingBar)
      : DEFAULT_DIVERGING_BAR_LAYER_THEME,
    grid: { ...DEFAULT_CHART_BASE_THEME.grid, ...filterUndefined(userTheme.grid) },
    'grouped-bar': userTheme['grouped-bar']
      ? mergeGroupedBarLayerTheme(userTheme['grouped-bar'])
      : DEFAULT_GROUPED_BAR_LAYER_THEME,
    line: userTheme.line ? mergeLineLayerTheme(userTheme.line) : DEFAULT_LINE_LAYER_THEME,
    scatter: userTheme.scatter
      ? mergeScatterLayerTheme(userTheme.scatter)
      : DEFAULT_SCATTER_LAYER_THEME,
  };
}
