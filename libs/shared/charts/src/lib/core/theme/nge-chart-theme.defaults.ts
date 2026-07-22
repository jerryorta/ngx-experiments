import type {
  NgeAreaLayerTheme,
  NgeBarLayerTheme,
  NgeBulletLayerTheme,
  NgeBumpLayerTheme,
  NgeChartBaseTheme,
  NgeChartTheme,
  NgeDistributionLayerTheme,
  NgeDivergingBarLayerTheme,
  NgeFinancialLayerTheme,
  NgeGaugeLayerTheme,
  NgeGroupedBarLayerTheme,
  NgeHeatmapLayerTheme,
  NgeHistogramLayerTheme,
  NgeLineLayerTheme,
  NgeLollipopLayerTheme,
  NgeOverlayLayerTheme,
  NgePieLayerTheme,
  NgeRadarLayerTheme,
  NgeRadialBarLayerTheme,
  NgeScatterLayerTheme,
  NgeStackedBarLayerTheme,
  NgeSunburstLayerTheme,
  NgeTimelineLayerTheme,
  NgeWaterfallLayerTheme,
} from './nge-chart-theme.models';

/**
 * Default base theme using Material Design CSS variables
 */
export const DEFAULT_CHART_BASE_THEME: Required<NgeChartBaseTheme> = {
  axis: {
    group: {
      labelColor: 'var(--chart-on-surface-variant)',
      labelFontSize: 11,
      // Opaque surface fill so a 'pill'-style badge masks the baseline it straddles.
      pillBackground: 'var(--chart-surface)',
      pillPaddingX: 8,
      separatorColor: 'var(--chart-outline-variant)',
      separatorWidth: 1,
      tint: 'var(--chart-surface-variant)',
    },
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
 * Default area layer theme using the domain-agnostic `--chart-*` tokens.
 * The 6-entry `fill.colors` palette matches the line layer so stacked/overlaid
 * area series and line series share one multi-series colour cycle.
 */
export const DEFAULT_AREA_LAYER_THEME: Required<NgeAreaLayerTheme> = {
  fill: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 0.3,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  line: {
    color: 'var(--chart-primary)',
    width: 2,
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
    zeroLineColor: 'var(--chart-on-surface-variant)',
    zeroLineDash: '',
    zeroLineWidth: 1,
  },
};

/**
 * Default heatmap layer theme using the domain-agnostic `--chart-*` tokens.
 * Cells fill from a sequential ramp that runs the neutral surface token up to the
 * primary series token (`rampMid` empty ⇒ a straight two-stop ramp), with empty
 * cells falling to the highest surface-container token and a thin surface-coloured
 * stroke separating adjacent cells. Bubbles inherit the resolved ramp colour
 * (`bubble.color` empty ⇒ per-value), ringed with a surface-coloured stroke.
 */
export const DEFAULT_HEATMAP_LAYER_THEME: Required<NgeHeatmapLayerTheme> = {
  bubble: {
    color: '',
    opacity: 0.85,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  cell: {
    emptyColor: 'var(--chart-surface-container-highest)',
    opacity: 1,
    radius: 1,
    rampFrom: 'var(--chart-surface)',
    rampMid: '',
    rampTo: 'var(--chart-primary)',
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--chart-on-surface)',
    colorOnDark: 'var(--chart-on-primary)',
    fontSize: 10,
    fontWeight: 500,
  },
};

/**
 * Default histogram layer theme using the domain-agnostic `--chart-*` tokens.
 * Bars fill with the primary series color and carry a thin surface-colored stroke
 * (so adjacent bins separate cleanly); the rootogram's fitted expected-frequency
 * curve and its per-bin nodes read the secondary series token, the nodes ringed
 * with a surface-colored stroke so they read on top of the curve.
 */
export const DEFAULT_HISTOGRAM_LAYER_THEME: Required<NgeHistogramLayerTheme> = {
  bar: {
    color: 'var(--chart-primary)',
    opacity: 1,
    radius: 0,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  curve: {
    color: 'var(--chart-secondary)',
    dash: '',
    width: 2,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  node: {
    color: 'var(--chart-secondary)',
    radius: 4,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1.5,
  },
  zeroLine: {
    color: 'var(--chart-on-surface-variant)',
    dash: '',
    width: 1,
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
 * Default bump (rank-over-time) layer theme using the domain-agnostic `--chart-*`
 * tokens. The 6-entry `line.colors` palette matches the line/area/lollipop layers so
 * rank lines share one multi-series colour cycle; the per-point circles fill with the
 * surface token and take the resolved series colour as their stroke (set per-series at
 * render time), and end labels read the on-surface token in a slightly heavier weight.
 */
export const DEFAULT_BUMP_LAYER_THEME: Required<NgeBumpLayerTheme> = {
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 11,
    fontWeight: 600,
  },
  line: {
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    dash: '',
    width: 2.5,
  },
  point: {
    color: 'var(--chart-surface)',
    hoverRadius: 7,
    radius: 5,
    strokeColor: 'var(--chart-primary)',
    strokeWidth: 2,
  },
};

/**
 * Default lollipop layer theme using the domain-agnostic `--chart-*` tokens.
 * The single-series marker reads the primary token and the 6-entry `marker.colors`
 * palette matches the line/area/stacked layers so multi-series lollipops share one
 * colour cycle; markers carry a thin surface-coloured stroke so they read on top of
 * the stem, which uses the muted outline token.
 */
export const DEFAULT_LOLLIPOP_LAYER_THEME: Required<NgeLollipopLayerTheme> = {
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  marker: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    radius: 5,
    strokeColor: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  stem: {
    color: 'var(--chart-outline-variant)',
    width: 2,
  },
};

/**
 * Default overlay (analytical-annotation) layer theme using the domain-agnostic
 * `--chart-*` tokens (no new tokens — every value reuses an existing one). The fitted
 * trend line reads the secondary series token (a reference line distinct from a
 * primary data series); the fan / control band fills with the translucent primary
 * token; the control mean line reads the tertiary token (matching the bar layer's
 * statistical mean line) and the ±σ limit rules read the error token (dashed) so an
 * out-of-control point reads as a breach.
 */
export const DEFAULT_OVERLAY_LAYER_THEME: Required<NgeOverlayLayerTheme> = {
  band: {
    fillColor: 'var(--chart-primary)',
    fillOpacity: 0.15,
  },
  fitLine: {
    color: 'var(--chart-secondary)',
    dash: '',
    width: 2,
  },
  limitLine: {
    color: 'var(--chart-error)',
    dash: '4 3',
    width: 1.5,
  },
  meanLine: {
    color: 'var(--chart-tertiary)',
    dash: '6 3',
    width: 2,
  },
};

/**
 * Default pie / donut / semi-circle layer theme using the domain-agnostic `--chart-*`
 * tokens. The 6-entry `slice.colors` palette matches the area/line/distribution layers
 * so a pie shares one multi-series colour cycle; slices carry a thin surface-coloured
 * stroke so adjacent wedges separate cleanly, and the single-slice fallback + reserved
 * on-arc label read the primary / on-surface tokens.
 */
export const DEFAULT_PIE_LAYER_THEME: Required<NgePieLayerTheme> = {
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  slice: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default sunburst / icicle layer theme using the domain-agnostic `--chart-*` tokens.
 * The 6-entry `segment.colors` palette matches the pie/area/line layers so a sunburst
 * shares one multi-series colour cycle; segments carry a thin surface-coloured stroke
 * so adjacent nodes separate cleanly, and the single-segment fallback + reserved on-arc
 * label read the primary / on-surface tokens.
 */
export const DEFAULT_SUNBURST_LAYER_THEME: Required<NgeSunburstLayerTheme> = {
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  segment: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default radar / polar (spider / star) layer theme using the domain-agnostic `--chart-*`
 * tokens. The 6-entry `series.colors` palette matches the pie/area/line layers so radar
 * polygons share one multi-series colour cycle; the filled polygon reads `series.fillOpacity`
 * under an outline of `series.lineWidth`, with small vertex dots (`series.pointRadius`). The
 * radial spokes (`axis`) and concentric value rings (`grid`) read the muted outline-variant
 * token so the web recedes behind the data, and per-dimension labels read the on-surface token.
 */
export const DEFAULT_RADAR_LAYER_THEME: Required<NgeRadarLayerTheme> = {
  axis: {
    color: 'var(--chart-outline-variant)',
    width: 1,
  },
  grid: {
    color: 'var(--chart-outline-variant)',
    width: 1,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 11,
    fontWeight: 500,
  },
  series: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    fillOpacity: 0.3,
    lineWidth: 2,
    opacity: 1,
    pointRadius: 3,
  },
};

/**
 * Default radial-bar (polar) layer theme using the domain-agnostic `--chart-*` tokens.
 * The 6-entry `bar.colors` palette matches the pie/area/line layers so radial bars and
 * radial-area series share one multi-series colour cycle; arcs carry a thin surface-
 * coloured stroke so adjacent bars/cells separate cleanly. The circular-heatmap cell
 * encodes value as fill OPACITY of the primary token (floor `minOpacity` → 1) rather
 * than a two-token ramp, so it composes with an unresolved `var(--chart-*)` fill.
 */
export const DEFAULT_RADIAL_BAR_LAYER_THEME: Required<NgeRadialBarLayerTheme> = {
  area: {
    fillOpacity: 0.3,
    lineWidth: 2,
  },
  bar: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  cell: {
    color: 'var(--chart-primary)',
    minOpacity: 0.1,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
};

/**
 * Default scatter layer theme.
 * Literal color defaults (carried over from the original scatter renderer) so
 * points render a stable blue when no theme override is supplied.
 */
export const DEFAULT_SCATTER_LAYER_THEME: Required<NgeScatterLayerTheme> = {
  point: {
    color: '#1976D2',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    hoverColor: '#1565C0',
    opacity: 0.7,
    radius: 5,
    strokeColor: '#ffffff',
    strokeWidth: 1,
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
 * Default distribution layer theme using the domain-agnostic `--chart-*` tokens.
 * The box body reads the primary token (translucent) with the median in the
 * secondary token and the mean glyph in the tertiary token; outliers use the
 * error token; the 6-entry `point.colors` palette matches the line/area/lollipop
 * layers so per-category point clouds share one colour cycle; the violin fill is a
 * softer primary and whiskers use the muted outline-variant token.
 */
export const DEFAULT_DISTRIBUTION_LAYER_THEME: Required<NgeDistributionLayerTheme> = {
  box: {
    color: 'var(--chart-primary)',
    opacity: 0.55,
    radius: 0,
    stroke: 'var(--chart-primary)',
    strokeWidth: 1.5,
  },
  mean: {
    color: 'var(--chart-tertiary)',
    radius: 3,
    strokeWidth: 1.5,
  },
  median: {
    color: 'var(--chart-secondary)',
    width: 2,
  },
  outlier: {
    color: 'var(--chart-error)',
    radius: 2.5,
    strokeWidth: 1,
  },
  point: {
    color: 'var(--chart-primary)',
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 0.7,
    radius: 3,
    strokeColor: 'var(--chart-surface)',
    strokeWidth: 0.5,
  },
  violin: {
    color: 'var(--chart-primary)',
    opacity: 0.4,
    stroke: 'var(--chart-primary)',
    strokeWidth: 1.5,
  },
  whisker: {
    capRatio: 0.5,
    color: 'var(--chart-on-surface-variant)',
    width: 1.5,
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
 * Default financial layer theme. Rise / fall (up / down) use literal semantic green /
 * red (matching the waterfall + diverging-bar positive/negative defaults) so a rising
 * vs falling period reads the same across app themes; the neutral candlestick wick
 * reads the muted `--chart-on-surface-variant` token, and the kagi yang / yin lines
 * read the primary / error tokens at distinct thick / thin widths.
 */
export const DEFAULT_FINANCIAL_LAYER_THEME: Required<NgeFinancialLayerTheme> = {
  down: {
    color: '#f44336', // Red for a falling (close < open) period / down brick
    fillOpacity: 1,
    stroke: '#f44336',
    strokeWidth: 1,
  },
  kagi: {
    yangColor: 'var(--chart-primary)',
    yangWidth: 2.5,
    yinColor: 'var(--chart-error)',
    yinWidth: 1.25,
  },
  up: {
    color: '#4caf50', // Green for a rising (close >= open) period / up brick
    fillOpacity: 1,
    stroke: '#4caf50',
    strokeWidth: 1,
  },
  wick: {
    color: 'var(--chart-on-surface-variant)',
    width: 1,
  },
};

/**
 * Default gauge (single-value meter) layer theme using the domain-agnostic `--chart-*`
 * tokens. The track reads the muted `surface-container-highest` token so the unfilled
 * arc / rail recedes; the value fill + needle read the primary / on-surface tokens; the
 * threshold palette runs primary → tertiary → error (low → high severity); and the center
 * value label reads the on-surface token in the inherited font.
 */
export const DEFAULT_GAUGE_LAYER_THEME: Required<NgeGaugeLayerTheme> = {
  label: {
    color: 'var(--chart-on-surface)',
    fontFamily: 'inherit',
    fontSize: 20,
    fontWeight: 600,
  },
  needle: {
    color: 'var(--chart-on-surface)',
    width: 2,
  },
  threshold: {
    colors: ['var(--chart-primary)', 'var(--chart-tertiary)', 'var(--chart-error)'],
  },
  track: {
    color: 'var(--chart-surface-container-highest)',
    opacity: 1,
  },
  value: {
    color: 'var(--chart-primary)',
    opacity: 1,
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
 * Default stacked-bar layer theme using the domain-agnostic `--chart-*` tokens.
 * The 6-entry `bar.colors` palette matches the area/line layers so stack series
 * share one multi-series colour cycle. A thin surface-coloured stroke separates
 * adjacent segments; radius defaults to 0 (rounded corners read oddly on stacks).
 */
export const DEFAULT_STACKED_BAR_LAYER_THEME: Required<NgeStackedBarLayerTheme> = {
  bar: {
    colors: [
      'var(--chart-primary)',
      'var(--chart-secondary)',
      'var(--chart-tertiary)',
      'var(--chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    radius: 0,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
};

/**
 * Default waterfall layer theme. Rise / fall use literal semantic green / red
 * (matching the diverging-bar positive/negative defaults); total, connector, and
 * label read the domain-agnostic `--chart-*` tokens.
 */
export const DEFAULT_WATERFALL_LAYER_THEME: Required<NgeWaterfallLayerTheme> = {
  connector: {
    color: 'var(--chart-on-surface-variant)',
    dash: '3 2',
    width: 1,
  },
  fall: {
    color: '#f44336', // Red for a falling (negative) step
  },
  label: {
    color: 'var(--chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  rise: {
    color: '#4caf50', // Green for a rising (positive) step
  },
  total: {
    color: 'var(--chart-primary)',
  },
};

/**
 * Default timeline / Gantt layer theme using the domain-agnostic `--chart-*` tokens.
 * Task-span bars fill with the primary series token (hover lightens to the primary
 * container); milestone diamonds read the secondary token ringed with a thin
 * surface-coloured stroke so they read on top of the bars; on-bar labels use the
 * on-primary token so they stay legible against the filled bar.
 */
export const DEFAULT_TIMELINE_LAYER_THEME: Required<NgeTimelineLayerTheme> = {
  bar: {
    color: 'var(--chart-primary)',
    hoverColor: 'var(--chart-primary-container)',
    opacity: 1,
    radius: 2,
  },
  label: {
    color: 'var(--chart-on-primary)',
    fontSize: 10,
    fontWeight: 500,
  },
  milestone: {
    color: 'var(--chart-secondary)',
    size: 6,
    stroke: 'var(--chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default complete chart theme
 */
export const DEFAULT_CHART_THEME: NgeChartTheme = {
  ...DEFAULT_CHART_BASE_THEME,
  area: DEFAULT_AREA_LAYER_THEME,
  bar: DEFAULT_BAR_LAYER_THEME,
  bullet: DEFAULT_BULLET_LAYER_THEME,
  bump: DEFAULT_BUMP_LAYER_THEME,
  distribution: DEFAULT_DISTRIBUTION_LAYER_THEME,
  'diverging-bar': DEFAULT_DIVERGING_BAR_LAYER_THEME,
  financial: DEFAULT_FINANCIAL_LAYER_THEME,
  gauge: DEFAULT_GAUGE_LAYER_THEME,
  'grouped-bar': DEFAULT_GROUPED_BAR_LAYER_THEME,
  heatmap: DEFAULT_HEATMAP_LAYER_THEME,
  histogram: DEFAULT_HISTOGRAM_LAYER_THEME,
  line: DEFAULT_LINE_LAYER_THEME,
  lollipop: DEFAULT_LOLLIPOP_LAYER_THEME,
  overlay: DEFAULT_OVERLAY_LAYER_THEME,
  pie: DEFAULT_PIE_LAYER_THEME,
  radar: DEFAULT_RADAR_LAYER_THEME,
  'radial-bar': DEFAULT_RADIAL_BAR_LAYER_THEME,
  scatter: DEFAULT_SCATTER_LAYER_THEME,
  'stacked-bar': DEFAULT_STACKED_BAR_LAYER_THEME,
  sunburst: DEFAULT_SUNBURST_LAYER_THEME,
  timeline: DEFAULT_TIMELINE_LAYER_THEME,
  waterfall: DEFAULT_WATERFALL_LAYER_THEME,
};
