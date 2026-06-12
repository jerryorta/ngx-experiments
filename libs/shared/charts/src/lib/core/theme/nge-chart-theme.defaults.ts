import type {
  NgeBarLayerTheme,
  NgeBulletLayerTheme,
  NgeChartBaseTheme,
  NgeChartTheme,
  NgeDivergingBarLayerTheme,
  NgeGroupedBarLayerTheme,
  NgeLineLayerTheme,
} from './nge-chart-theme.models';

/**
 * Default base theme using Material Design CSS variables
 */
export const DEFAULT_CHART_BASE_THEME: Required<NgeChartBaseTheme> = {
  axis: {
    labelColor: 'var(--chart-on-surface-variant)',
    labelFontSize: 14,
    labelFontWeight: 500,
    lineColor: 'var(--chart-outline-variant)',
    lineWidth: 2,
    tickColor: 'var(--chart-on-surface)',
    tickFontSize: 12,
  },
  grid: {
    lineColor: 'var(--chart-outline-variant)',
    lineDash: '2 2',
    lineWidth: 1,
  },
};

/**
 * Default bar layer theme using Material Design CSS variables
 */
export const DEFAULT_BAR_LAYER_THEME: Required<NgeBarLayerTheme> = {
  bar: {
    color: 'var(--chart-primary)',
    hoverColor: 'var(--chart-primary-container)',
    padding: 0.2,
    radius: 2,
  },
  categoryLabel: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 12,
    fontWeight: 500,
  },
  statistical: {
    labelColor: 'var(--chart-on-surface)',
    labelFontSize: 12,
    labelFontWeight: 500,
    meanLineColor: 'var(--chart-tertiary)',
    meanLineDash: '6 3',
    meanLineWidth: 2,
    medianLineColor: 'var(--chart-secondary)',
    medianLineDash: '3 3',
    medianLineWidth: 2,
  },
};

/**
 * Default line layer theme using Material Design CSS variables
 */
export const DEFAULT_LINE_LAYER_THEME: Required<NgeLineLayerTheme> = {
  area: {
    fillColor: 'var(--chart-primary)',
    fillOpacity: 0.15,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  line: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    dash: '',
    hoverOpacity: 0.7,
    width: 2,
  },
  point: {
    color: 'var(--chart-surface)',
    hoverRadius: 6,
    radius: 4,
    strokeColor: 'var(--chart-primary)',
    strokeWidth: 2,
  },
};

/**
 * Default bullet chart layer theme using Material Design CSS variables
 */
export const DEFAULT_BULLET_LAYER_THEME: Required<NgeBulletLayerTheme> = {
  backgroundBar: {
    color: 'var(--chart-surface-container-highest)',
    height: 10,
  },
  limitIndicator: {
    color: 'var(--chart-on-surface-variant)',
    height: 30,
    width: 2,
  },
  progressBar: {
    color: 'var(--chart-primary)',
    height: 10,
  },
  progressIndicator: {
    color: 'var(--chart-primary)',
    height: 30,
    width: 5,
  },
};

/**
 * Default diverging bar chart layer theme using Material Design CSS variables
 */
export const DEFAULT_DIVERGING_BAR_LAYER_THEME: Required<NgeDivergingBarLayerTheme> = {
  backgroundBar: {
    color: 'var(--chart-surface-container-highest)',
    height: 10,
  },
  centerIndicator: {
    color: 'var(--chart-on-surface-variant)',
    height: 30,
    width: 3,
  },
  limitIndicator: {
    color: 'var(--chart-on-surface-variant)',
    height: 30,
    width: 2,
  },
  negativeBar: {
    color: '#f44336', // Red for negative/buyer's market
  },
  positiveBar: {
    color: '#4caf50', // Green for positive/seller's market
  },
  valueIndicator: {
    color: 'var(--chart-on-surface)',
    height: 30,
    width: 5,
  },
};

/**
 * Default grouped bar chart layer theme using Material Design CSS variables
 */
export const DEFAULT_GROUPED_BAR_LAYER_THEME: Required<NgeGroupedBarLayerTheme> = {
  bar: {
    color: 'var(--chart-primary)',
    hoverColor: 'var(--chart-primary-container)',
    radius: 2,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 11,
    fontWeight: 500,
  },
};

/**
 * Default complete chart theme
 */
export const DEFAULT_CHART_THEME: NgeChartTheme = {
  ...DEFAULT_CHART_BASE_THEME,
  bar: DEFAULT_BAR_LAYER_THEME,
  bullet: DEFAULT_BULLET_LAYER_THEME,
  divergingBar: DEFAULT_DIVERGING_BAR_LAYER_THEME,
  'grouped-bar': DEFAULT_GROUPED_BAR_LAYER_THEME,
  line: DEFAULT_LINE_LAYER_THEME,
};
