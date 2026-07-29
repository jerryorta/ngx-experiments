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
} from './nge-chart-theme.models';

/**
 * Default base theme using Material Design CSS variables
 */
export const DEFAULT_NGE_CHART_BASE_THEME: Required<NgeChartBaseTheme> = {
  axis: {
    group: {
      labelColor: 'var(--nge-chart-on-surface-variant)',
      labelFontSize: 11,
      // Opaque surface fill so a 'pill'-style badge masks the baseline it straddles.
      pillBackground: 'var(--nge-chart-surface)',
      pillPaddingX: 8,
      separatorColor: 'var(--nge-chart-outline-variant)',
      separatorWidth: 1,
      tint: 'var(--nge-chart-surface-variant)',
    },
    labelColor: 'var(--nge-chart-on-surface-variant)',
    labelFontSize: 14,
    labelFontWeight: 500,
    lineColor: 'var(--nge-chart-outline-variant)',
    lineWidth: 2,
    tickColor: 'var(--nge-chart-on-surface)',
    tickFontSize: 12,
  },
  grid: {
    lineColor: 'var(--nge-chart-outline-variant)',
    lineDash: '2 2',
    lineWidth: 1,
  },
};

/**
 * Default area layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `fill.colors` palette matches the line layer so stacked/overlaid
 * area series and line series share one multi-series colour cycle.
 */
export const DEFAULT_AREA_LAYER_THEME: Required<NgeAreaLayerTheme> = {
  fill: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 0.3,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  line: {
    color: 'var(--nge-chart-primary)',
    width: 2,
  },
};

/**
 * Default bar layer theme using Material Design CSS variables
 */
export const DEFAULT_BAR_LAYER_THEME: Required<NgeBarLayerTheme> = {
  bar: {
    color: 'var(--nge-chart-primary)',
    hoverColor: 'var(--nge-chart-primary-container)',
    padding: 0.2,
    radius: 2,
  },
  categoryLabel: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 12,
    fontWeight: 500,
  },
  statistical: {
    labelColor: 'var(--nge-chart-on-surface)',
    labelFontSize: 12,
    labelFontWeight: 500,
    meanLineColor: 'var(--nge-chart-tertiary)',
    meanLineDash: '6 3',
    meanLineWidth: 2,
    medianLineColor: 'var(--nge-chart-secondary)',
    medianLineDash: '3 3',
    medianLineWidth: 2,
    zeroLineColor: 'var(--nge-chart-on-surface-variant)',
    zeroLineDash: '',
    zeroLineWidth: 1,
  },
};

/**
 * Default heatmap layer theme using the domain-agnostic `--nge-chart-*` tokens.
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
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  cell: {
    emptyColor: 'var(--nge-chart-surface-container-highest)',
    opacity: 1,
    radius: 1,
    rampFrom: 'var(--nge-chart-surface)',
    rampMid: '',
    rampTo: 'var(--nge-chart-primary)',
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    colorOnDark: 'var(--nge-chart-on-primary)',
    fontSize: 10,
    fontWeight: 500,
  },
};

/**
 * Default histogram layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * Bars fill with the primary series color and carry a thin surface-colored stroke
 * (so adjacent bins separate cleanly); the rootogram's fitted expected-frequency
 * curve and its per-bin nodes read the secondary series token, the nodes ringed
 * with a surface-colored stroke so they read on top of the curve.
 */
export const DEFAULT_HISTOGRAM_LAYER_THEME: Required<NgeHistogramLayerTheme> = {
  bar: {
    color: 'var(--nge-chart-primary)',
    opacity: 1,
    radius: 0,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  curve: {
    color: 'var(--nge-chart-secondary)',
    dash: '',
    width: 2,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  node: {
    color: 'var(--nge-chart-secondary)',
    radius: 4,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1.5,
  },
  zeroLine: {
    color: 'var(--nge-chart-on-surface-variant)',
    dash: '',
    width: 1,
  },
};

/**
 * Default line layer theme using Material Design CSS variables
 */
export const DEFAULT_LINE_LAYER_THEME: Required<NgeLineLayerTheme> = {
  area: {
    fillColor: 'var(--nge-chart-primary)',
    fillOpacity: 0.15,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  line: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    dash: '',
    hoverOpacity: 0.7,
    width: 2,
  },
  point: {
    color: 'var(--nge-chart-surface)',
    hoverRadius: 6,
    radius: 4,
    strokeColor: 'var(--nge-chart-primary)',
    strokeWidth: 2,
  },
};

/**
 * Default bump (rank-over-time) layer theme using the domain-agnostic `--nge-chart-*`
 * tokens. The 6-entry `line.colors` palette matches the line/area/lollipop layers so
 * rank lines share one multi-series colour cycle; the per-point circles fill with the
 * surface token and take the resolved series colour as their stroke (set per-series at
 * render time), and end labels read the on-surface token in a slightly heavier weight.
 */
export const DEFAULT_BUMP_LAYER_THEME: Required<NgeBumpLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 11,
    fontWeight: 600,
  },
  line: {
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    dash: '',
    width: 2.5,
  },
  point: {
    color: 'var(--nge-chart-surface)',
    hoverRadius: 7,
    radius: 5,
    strokeColor: 'var(--nge-chart-primary)',
    strokeWidth: 2,
  },
};

/**
 * Default lollipop layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The single-series marker reads the primary token and the 6-entry `marker.colors`
 * palette matches the line/area/stacked layers so multi-series lollipops share one
 * colour cycle; markers carry a thin surface-coloured stroke so they read on top of
 * the stem, which uses the muted outline token.
 */
export const DEFAULT_LOLLIPOP_LAYER_THEME: Required<NgeLollipopLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  marker: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    radius: 5,
    strokeColor: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  stem: {
    color: 'var(--nge-chart-outline-variant)',
    width: 2,
  },
};

/**
 * Default overlay (analytical-annotation) layer theme using the domain-agnostic
 * `--nge-chart-*` tokens (no new tokens — every value reuses an existing one). The fitted
 * trend line reads the secondary series token (a reference line distinct from a
 * primary data series); the fan / control band fills with the translucent primary
 * token; the control mean line reads the tertiary token (matching the bar layer's
 * statistical mean line) and the ±σ limit rules read the error token (dashed) so an
 * out-of-control point reads as a breach.
 */
export const DEFAULT_OVERLAY_LAYER_THEME: Required<NgeOverlayLayerTheme> = {
  band: {
    fillColor: 'var(--nge-chart-primary)',
    fillOpacity: 0.15,
  },
  fitLine: {
    color: 'var(--nge-chart-secondary)',
    dash: '',
    width: 2,
  },
  limitLine: {
    color: 'var(--nge-chart-error)',
    dash: '4 3',
    width: 1.5,
  },
  meanLine: {
    color: 'var(--nge-chart-tertiary)',
    dash: '6 3',
    width: 2,
  },
};

/**
 * Default pie / donut / semi-circle layer theme using the domain-agnostic `--nge-chart-*`
 * tokens. The 6-entry `slice.colors` palette matches the area/line/distribution layers
 * so a pie shares one multi-series colour cycle; slices carry a thin surface-coloured
 * stroke so adjacent wedges separate cleanly, and the single-slice fallback reads the
 * primary token.
 *
 * The two label slices carry OPPOSITE colour rules, which is why they are separate.
 *
 * The on-arc `label` is an ABSOLUTE `--nge-chart-black` / `--nge-chart-white` pair, and
 * the pair is the point: the text sits on a saturated slice fill drawn from the palette —
 * a *range* — so `resolveLabelColor` picks whichever endpoint reads on that slice's own
 * luminance (ARCH-266). Neither endpoint may be theme-relative. `--nge-chart-on-surface`
 * is near-black in light themes (which left labels unreadable on the palette), and no
 * theme-relative token holds white everywhere either — `on-primary` resolves to `#090b0d`
 * in the MW dark bridge and `inverse-on-surface` maps to each theme's own surface. That is
 * why the absolute tokens exist.
 *
 * `labelOutside` inverts it: an outside label sits on the page surface, so it tracks the
 * theme-relative `--nge-chart-on-surface` and declares NO `colorOnDark` — the missing pair
 * is what stops it deriving from a fill it is not drawn on. `leaderLine` reads the muted
 * `--nge-chart-outline` so a connector recedes behind the data. Size and weight read the
 * shared data-label typography tokens in both slices.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded — a host that pulls in
 * only its own theme bridge still gets correct labels. Consumers override any entry via
 * `theme.pie.label` / `theme.pie.labelOutside` / `theme.pie.leaderLine`.
 */
export const DEFAULT_PIE_LAYER_THEME: Required<NgePieLayerTheme> = {
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  labelOutside: {
    color: 'var(--nge-chart-on-surface, #1d1b20)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  leaderLine: {
    stroke: 'var(--nge-chart-outline, #79747e)',
    strokeWidth: 1,
  },
  slice: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    // Far enough back that the selected wedges read as the foreground at 30 slices, while a
    // dimmed slice still shows its own hue — it is receding, not disappearing.
    dimmedOpacity: 0.25,
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default sunburst / icicle layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `segment.colors` palette matches the pie/area/line layers so a sunburst
 * shares one multi-series colour cycle; segments carry a thin surface-coloured stroke
 * so adjacent nodes separate cleanly, and the single-segment fallback reads the primary
 * token.
 *
 * `label` follows the pie's on-arc slice exactly (ARCH-237): an ABSOLUTE
 * `--nge-chart-black` / `--nge-chart-white` pair, because the text sits on a node fill
 * drawn from the palette — a *range* — and `resolveLabelColor` picks whichever endpoint
 * reads on that node's own luminance. It shipped as the theme-relative
 * `--nge-chart-on-surface` while the slice was inert, which would have gone near-black in
 * light themes and been unreadable on most of the palette. Size and weight read the shared
 * data-label typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.sunburst.label` / `theme.sunburst.segment`.
 */
export const DEFAULT_SUNBURST_LAYER_THEME: Required<NgeSunburstLayerTheme> = {
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  segment: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default proportional-area / waffle layer theme using the domain-agnostic `--nge-chart-*`
 * tokens. The 6-entry `mark.colors` palette matches the pie / sunburst / area / line layers so
 * every categorical layer shares one colour cycle, and marks are separated by a hairline in the
 * surface colour so adjacent waffle cells and packed circles read as distinct.
 *
 * `label` is the ABSOLUTE `--nge-chart-black` / `--nge-chart-white` pair, because the text sits
 * on a mark fill drawn from the palette — a *range* — and `resolveLabelColor` picks whichever
 * endpoint reads on that mark's own luminance. `emptyCell` is the one entry that is NOT data: it
 * is the waffle's unfilled remainder, so it reads the muted `surface-container-highest` token the
 * gauge track and heatmap empty cell already use.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any entry
 * via `theme.proportional.mark` / `.label` / `.emptyCell`.
 */
export const DEFAULT_PROPORTIONAL_LAYER_THEME: Required<NgeProportionalLayerTheme> = {
  emptyCell: {
    color: 'var(--nge-chart-surface-container-highest, #e0e0e0)',
    opacity: 1,
  },
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  mark: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary, #1976d2)',
      'var(--nge-chart-secondary, #625b71)',
      'var(--nge-chart-tertiary, #7d5260)',
      'var(--nge-chart-error, #b3261e)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface, #ffffff)',
    strokeWidth: 1,
  },
};

/**
 * Default radar / polar (spider / star) layer theme using the domain-agnostic `--nge-chart-*`
 * tokens. The 6-entry `series.colors` palette matches the pie/area/line layers so radar
 * polygons share one multi-series colour cycle; the filled polygon reads `series.fillOpacity`
 * under an outline of `series.lineWidth`, with small vertex dots (`series.pointRadius`). The
 * radial spokes (`axis`) and concentric value rings (`grid`) read the muted outline-variant
 * token so the web recedes behind the data, and per-dimension labels read the on-surface token.
 */
export const DEFAULT_RADAR_LAYER_THEME: Required<NgeRadarLayerTheme> = {
  axis: {
    color: 'var(--nge-chart-outline-variant)',
    width: 1,
  },
  grid: {
    color: 'var(--nge-chart-outline-variant)',
    width: 1,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 11,
    fontWeight: 500,
  },
  series: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
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
 * Default radial-bar (polar) layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `bar.colors` palette matches the pie/area/line layers so radial bars and
 * radial-area series share one multi-series colour cycle; arcs carry a thin surface-
 * coloured stroke so adjacent bars/cells separate cleanly. The circular-heatmap cell
 * encodes value as fill OPACITY of the primary token (floor `minOpacity` → 1) rather
 * than a two-token ramp, so it composes with an unresolved `var(--nge-chart-*)` fill.
 *
 * The two label slices carry opposite colour rules (ARCH-238, following ARCH-267's
 * pie/funnel split). `label` is an ON-BAR placement, so it takes the ABSOLUTE
 * `--nge-chart-black` / `--nge-chart-white` pair and `resolveLabelColor` picks whichever
 * endpoint reads on that bar's own luminance — the text sits on a fill drawn from
 * `bar.colors`, a *range*. `labelOutside` sits at the chart perimeter on the plot surface,
 * so it tracks the theme-relative `--nge-chart-on-surface` and declares **no**
 * `colorOnDark`; that missing pair is what makes the resolver short-circuit instead of
 * deriving from a fill the text is not drawn on. `label` shipped as a lone
 * `--nge-chart-on-surface` while the slice was inert, which would have gone near-black in
 * light themes and been unreadable on most of the palette.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded.
 */
export const DEFAULT_RADIAL_BAR_LAYER_THEME: Required<NgeRadialBarLayerTheme> = {
  area: {
    fillOpacity: 0.3,
    lineWidth: 2,
  },
  bar: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  cell: {
    color: 'var(--nge-chart-primary)',
    minOpacity: 0.1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  labelOutside: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
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
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
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
    color: 'var(--nge-chart-surface-container-highest)',
    height: 10,
  },
  limitIndicator: {
    color: 'var(--nge-chart-on-surface-variant)',
    height: 30,
    width: 2,
  },
  progressBar: {
    color: 'var(--nge-chart-primary)',
    height: 10,
  },
  progressIndicator: {
    color: 'var(--nge-chart-primary)',
    height: 30,
    width: 5,
  },
};

/**
 * Default distribution layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The box body reads the primary token (translucent) with the median in the
 * secondary token and the mean glyph in the tertiary token; outliers use the
 * error token; the 6-entry `point.colors` palette matches the line/area/lollipop
 * layers so per-category point clouds share one colour cycle; the violin fill is a
 * softer primary and whiskers use the muted outline-variant token.
 */
export const DEFAULT_DISTRIBUTION_LAYER_THEME: Required<NgeDistributionLayerTheme> = {
  box: {
    color: 'var(--nge-chart-primary)',
    opacity: 0.55,
    radius: 0,
    stroke: 'var(--nge-chart-primary)',
    strokeWidth: 1.5,
  },
  mean: {
    color: 'var(--nge-chart-tertiary)',
    radius: 3,
    strokeWidth: 1.5,
  },
  median: {
    color: 'var(--nge-chart-secondary)',
    width: 2,
  },
  outlier: {
    color: 'var(--nge-chart-error)',
    radius: 2.5,
    strokeWidth: 1,
  },
  point: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 0.7,
    radius: 3,
    strokeColor: 'var(--nge-chart-surface)',
    strokeWidth: 0.5,
  },
  violin: {
    color: 'var(--nge-chart-primary)',
    opacity: 0.4,
    stroke: 'var(--nge-chart-primary)',
    strokeWidth: 1.5,
  },
  whisker: {
    capRatio: 0.5,
    color: 'var(--nge-chart-on-surface-variant)',
    width: 1.5,
  },
};

/**
 * Default diverging bar chart layer theme using Material Design CSS variables
 */
export const DEFAULT_DIVERGING_BAR_LAYER_THEME: Required<NgeDivergingBarLayerTheme> = {
  backgroundBar: {
    color: 'var(--nge-chart-surface-container-highest)',
    height: 10,
  },
  centerIndicator: {
    color: 'var(--nge-chart-on-surface-variant)',
    height: 30,
    width: 3,
  },
  limitIndicator: {
    color: 'var(--nge-chart-on-surface-variant)',
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
    color: 'var(--nge-chart-on-surface)',
    height: 30,
    width: 5,
  },
};

/**
 * Default financial layer theme. Rise / fall (up / down) use literal semantic green /
 * red (matching the waterfall + diverging-bar positive/negative defaults) so a rising
 * vs falling period reads the same across app themes; the neutral candlestick wick
 * reads the muted `--nge-chart-on-surface-variant` token, and the kagi yang / yin lines
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
    yangColor: 'var(--nge-chart-primary)',
    yangWidth: 2.5,
    yinColor: 'var(--nge-chart-error)',
    yinWidth: 1.25,
  },
  up: {
    color: '#4caf50', // Green for a rising (close >= open) period / up brick
    fillOpacity: 1,
    stroke: '#4caf50',
    strokeWidth: 1,
  },
  wick: {
    color: 'var(--nge-chart-on-surface-variant)',
    width: 1,
  },
};

/**
 * Default funnel / pyramid layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `band.colors` palette matches the pie/area/line layers so a funnel shares
 * one multi-series colour cycle; bands carry a thin surface-coloured stroke so adjacent
 * bands separate cleanly, and the single-band fallback reads the primary token.
 *
 * The two label slices split the same way the pie's do: in-band `label` is the ABSOLUTE
 * black/white contrast pair (the text sits on a saturated band fill, so it must not track a
 * theme-relative token), while `labelOutside` — used by `labelPosition: 'edge' | 'right'` —
 * tracks `--nge-chart-on-surface` and declares no `colorOnDark`. Before ARCH-267 the
 * outside placement reused `label`, so it fell through to the absolute black and rendered
 * black-on-dark in every dark bridge.
 */
export const DEFAULT_FUNNEL_LAYER_THEME: Required<NgeFunnelLayerTheme> = {
  band: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  labelOutside: {
    color: 'var(--nge-chart-on-surface, #1d1b20)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
};

/**
 * Default gauge (single-value meter) layer theme using the domain-agnostic `--nge-chart-*`
 * tokens. The track reads the muted `surface-container-highest` token so the unfilled
 * arc / rail recedes; the value fill + needle read the primary / on-surface tokens; the
 * threshold palette runs primary → tertiary → error (low → high severity); and the center
 * value label reads the on-surface token in the inherited font.
 */
export const DEFAULT_GAUGE_LAYER_THEME: Required<NgeGaugeLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontFamily: 'inherit',
    fontSize: 20,
    fontWeight: 600,
  },
  needle: {
    color: 'var(--nge-chart-on-surface)',
    width: 2,
  },
  threshold: {
    colors: ['var(--nge-chart-primary)', 'var(--nge-chart-tertiary)', 'var(--nge-chart-error)'],
  },
  track: {
    color: 'var(--nge-chart-surface-container-highest)',
    opacity: 1,
  },
  value: {
    color: 'var(--nge-chart-primary)',
    opacity: 1,
  },
};

/**
 * Default grouped bar chart layer theme using Material Design CSS variables
 */
export const DEFAULT_GROUPED_BAR_LAYER_THEME: Required<NgeGroupedBarLayerTheme> = {
  bar: {
    color: 'var(--nge-chart-primary)',
    hoverColor: 'var(--nge-chart-primary-container)',
    radius: 2,
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 11,
    fontWeight: 500,
  },
};

/**
 * Default stacked-bar layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `bar.colors` palette matches the area/line layers so stack series
 * share one multi-series colour cycle. A thin surface-coloured stroke separates
 * adjacent segments; radius defaults to 0 (rounded corners read oddly on stacks).
 */
export const DEFAULT_STACKED_BAR_LAYER_THEME: Required<NgeStackedBarLayerTheme> = {
  bar: {
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    radius: 0,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
};

/**
 * Default waterfall layer theme. Rise / fall use literal semantic green / red
 * (matching the diverging-bar positive/negative defaults); total, connector, and
 * label read the domain-agnostic `--nge-chart-*` tokens.
 */
export const DEFAULT_WATERFALL_LAYER_THEME: Required<NgeWaterfallLayerTheme> = {
  connector: {
    color: 'var(--nge-chart-on-surface-variant)',
    dash: '3 2',
    width: 1,
  },
  fall: {
    color: '#f44336', // Red for a falling (negative) step
  },
  label: {
    color: 'var(--nge-chart-on-surface)',
    fontSize: 10,
    fontWeight: 500,
  },
  rise: {
    color: '#4caf50', // Green for a rising (positive) step
  },
  total: {
    color: 'var(--nge-chart-primary)',
  },
};

/**
 * Default timeline / Gantt layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * Task-span bars fill with the primary series token (hover lightens to the primary
 * container); milestone diamonds read the secondary token ringed with a thin
 * surface-coloured stroke so they read on top of the bars; on-bar labels use the
 * on-primary token so they stay legible against the filled bar.
 */
export const DEFAULT_TIMELINE_LAYER_THEME: Required<NgeTimelineLayerTheme> = {
  bar: {
    color: 'var(--nge-chart-primary)',
    hoverColor: 'var(--nge-chart-primary-container)',
    opacity: 1,
    radius: 2,
  },
  label: {
    color: 'var(--nge-chart-on-primary)',
    fontSize: 10,
    fontWeight: 500,
  },
  milestone: {
    color: 'var(--nge-chart-secondary)',
    size: 6,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default word cloud layer theme using the domain-agnostic `--nge-chart-*` tokens. The
 * 6-entry `word.colors` palette matches the pie / sunburst / proportional / area / line layers
 * so every categorical layer shares one colour cycle.
 *
 * There is no `label` slice: the word IS the mark, so its colour comes from the palette rather
 * than from the on-fill contrast derivation the other text-bearing layers need. `fontWeight`
 * runs bold by default because a word cloud's small entries need the extra stroke weight to
 * stay legible, and `fontFamily` defaults to `'inherit'` — there is no `--nge-chart-font-family`
 * token, so the host chart's own typography is the right base.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.wordcloud.word`.
 */
export const DEFAULT_WORDCLOUD_LAYER_THEME: Required<NgeWordCloudLayerTheme> = {
  word: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary, #1976d2)',
      'var(--nge-chart-secondary, #625b71)',
      'var(--nge-chart-tertiary, #7d5260)',
      'var(--nge-chart-error, #b3261e)',
      '#4CAF50',
      '#FF9800',
    ],
    fontFamily: 'inherit',
    fontWeight: 600,
    opacity: 1,
  },
};

/**
 * Default parallel coordinates layer theme.
 *
 * `line.opacity` rests below 1 and `line.width` stays thin because this chart type is
 * defined by overplotting: at any realistic record count the readable signal is where the
 * lines bunch, which only emerges once they are translucent enough to accumulate.
 */
export const DEFAULT_PARALLEL_COORDS_LAYER_THEME: Required<NgeParallelCoordsLayerTheme> = {
  axis: {
    color: 'var(--nge-chart-outline, #79747e)',
    width: 1,
  },
  brush: {
    fill: 'var(--nge-chart-primary, #1976d2)',
    // Low enough that the axis line, its ticks and the records still read THROUGH the window —
    // a brush that hides what it selects defeats the filter it is driving.
    fillOpacity: 0.18,
    stroke: 'var(--nge-chart-outline, #79747e)',
    strokeWidth: 1,
    width: 18,
  },
  label: {
    color: 'var(--nge-chart-on-surface, #1d1b20)',
    fontSize: 12,
    fontWeight: 600,
  },
  line: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary, #1976d2)',
      'var(--nge-chart-secondary, #625b71)',
      'var(--nge-chart-tertiary, #7d5260)',
      'var(--nge-chart-error, #b3261e)',
      '#4CAF50',
      '#FF9800',
    ],
    dimmedOpacity: 0.12,
    opacity: 0.7,
    width: 1.5,
  },
  tick: {
    color: 'var(--nge-chart-on-surface-variant, #666666)',
    fontSize: 10,
  },
};

/**
 * Default treemap layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `cell.colors` palette matches the pie / sunburst / area / line layers so a
 * treemap shares one categorical colour cycle, and the single-cell fallback reads the
 * primary token.
 *
 * `stroke` is the surface token at 1px: a treemap tiles its box with no gaps, so without a
 * surface-coloured hairline two same-branch siblings read as one cell. `depthFade` at 6
 * HCL luminance units per level is deliberately subtle — enough that nesting is legible
 * once cells get small, not so much that a deep leaf washes out and stops carrying its
 * branch's identity.
 *
 * `label` follows the sunburst's on-mark slice exactly: an ABSOLUTE
 * `--nge-chart-black` / `--nge-chart-white` pair, because the text sits on a cell fill
 * drawn from the palette — a *range* — and `resolveLabelColor` picks whichever endpoint
 * reads on that cell's own luminance. Size and weight read the shared data-label
 * typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.treemap.cell` / `theme.treemap.label`.
 */
export const DEFAULT_TREEMAP_LAYER_THEME: Required<NgeTreemapLayerTheme> = {
  cell: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    depthFade: 6,
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
  label: {
    color: 'var(--nge-chart-black, #000000)',
    colorOnDark: 'var(--nge-chart-white, #ffffff)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
};

/**
 * Default sankey layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `node.colors` palette matches the pie / sunburst / treemap layers so a flow
 * diagram shares one categorical colour cycle, and the single-node fallback reads primary.
 *
 * `link.opacity` at 0.4 is the load-bearing default. A sankey's ribbons overlap wherever
 * flows cross, and at full opacity the diagram collapses into whichever ribbon happens to
 * paint last — translucency is what makes a crossing legible as a crossing. `opacityHover`
 * lifts the pointed-at flow to 0.75 without changing its hue, so it stays recognisably the
 * same ribbon.
 *
 * `node.stroke` is the surface token at 1px for the same reason the treemap outlines its
 * cells: adjacent same-palette rects in one column would otherwise merge into a single bar.
 *
 * `label` is theme-relative (`--nge-chart-on-surface`) and carries NO `colorOnDark` — a
 * node rect is far too narrow to seat text, so labels always sit on the plot surface and
 * the missing pair deliberately switches on-fill contrast derivation off. Size and weight
 * read the shared data-label typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.sankey.node` / `theme.sankey.link` / `theme.sankey.label`.
 */
export const DEFAULT_SANKEY_LAYER_THEME: Required<NgeSankeyLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface, #1a1c1e)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  link: {
    color: 'var(--nge-chart-on-surface-variant, #666666)',
    opacity: 0.4,
    opacityHover: 0.75,
  },
  node: {
    color: 'var(--nge-chart-primary)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default chord layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `node.colors` palette matches the pie / sunburst / treemap / sankey layers so a
 * relationship diagram shares one categorical colour cycle, and the single-node fallback
 * reads primary.
 *
 * `link.opacity` at 0.4 is the load-bearing default. Chord ribbons overlap heavily wherever
 * relationships cross, and at full opacity the diagram collapses into whichever ribbon
 * happens to paint last — translucency is what makes a crossing legible as a crossing.
 * `opacityHover` lifts the pointed-at connection to 0.75 without changing its hue, so it
 * stays recognisably the same link.
 *
 * `node.stroke` is the surface token, separating adjacent same-palette arcs / circles the
 * way the sankey layer's node rects are outlined.
 *
 * `label` is theme-relative (`--nge-chart-on-surface`) and carries NO `colorOnDark` — a
 * chord label always sits off the mark, so the missing pair deliberately switches on-fill
 * contrast derivation off. Size and weight read the shared data-label typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.chord.node` / `theme.chord.link` / `theme.chord.label`.
 */
export const DEFAULT_CHORD_LAYER_THEME: Required<NgeChordLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface, #1a1c1e)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  link: {
    color: 'var(--nge-chart-on-surface-variant, #666666)',
    opacity: 0.4,
    opacityHover: 0.75,
  },
  node: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default network layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `node.colors` palette matches the pie / sunburst / treemap / sankey / chord
 * layers so every relationship diagram shares one categorical colour cycle, and the
 * single-node fallback reads primary.
 *
 * `link.opacity` at 0.35 sits lower than the chord layer's 0.4 for the reason a network is a
 * harder drawing than a ring: a force layout has no prescribed seating, so its edges cross far
 * more often and at more angles. At full opacity the interior mats into one block of colour
 * and the structure — which is the entire finding — disappears. `opacityHover` lifts the
 * pointed-at edge to 0.8 without changing its hue, so it stays recognisably the same link.
 *
 * `node.stroke` is the surface token, separating adjacent same-palette circles the way the
 * sankey layer's node rects and the chord layer's baseline circles are outlined. The stroke
 * matters more here: a force layout routinely settles two nodes into contact.
 *
 * `axis` is hive-only chrome and reads `--nge-chart-outline` — structural, not data-bearing,
 * so it is deliberately quieter than any mark.
 *
 * `label` is theme-relative (`--nge-chart-on-surface`) and carries NO `colorOnDark` — a
 * network label always sits beside its node, so the missing pair deliberately switches on-fill
 * contrast derivation off. Size and weight read the shared data-label typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.network.node` / `theme.network.link` / `theme.network.label` /
 * `theme.network.axis`.
 */
export const DEFAULT_NETWORK_LAYER_THEME: Required<NgeNetworkLayerTheme> = {
  axis: {
    color: 'var(--nge-chart-outline, #79747e)',
    width: 1,
  },
  label: {
    color: 'var(--nge-chart-on-surface, #1a1c1e)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  link: {
    color: 'var(--nge-chart-on-surface-variant, #666666)',
    opacity: 0.35,
    opacityHover: 0.8,
    width: 1.5,
  },
  node: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default tree layer theme using the domain-agnostic `--nge-chart-*` tokens.
 * The 6-entry `node.colors` palette matches the pie / sunburst / treemap / sankey / chord /
 * network layers so every hierarchy and relationship diagram shares one categorical colour
 * cycle, and the single-node fallback reads primary.
 *
 * `link.opacity` is 0.9 — far above the network layer's 0.35, and deliberately so. A force
 * layout's edges cross constantly, which is why translucency is what keeps its interior
 * readable; a tree's edges never cross at all, so the same translucency would only wash out
 * the structure the layer exists to show. `opacityHover` takes the pointed-at edge to full.
 *
 * `node.stroke` is the surface token, separating a node circle from an edge that runs beneath
 * it — the same outline the sankey node rects and network circles carry.
 *
 * `label` is theme-relative (`--nge-chart-on-surface`) and carries NO `colorOnDark` — a tree
 * label always sits beside its node, so the missing pair deliberately switches on-fill
 * contrast derivation off. Size and weight read the shared data-label typography tokens.
 *
 * Every token carries its literal fallback because the `:root` defaults in
 * `styles/_nge-chart-tokens.scss` are not guaranteed to be loaded. Consumers override any
 * entry via `theme.tree.node` / `theme.tree.link` / `theme.tree.label`.
 */
export const DEFAULT_TREE_LAYER_THEME: Required<NgeTreeLayerTheme> = {
  label: {
    color: 'var(--nge-chart-on-surface, #1a1c1e)',
    fontSize: 'var(--nge-chart-label-font-size, 10px)',
    fontWeight: 'var(--nge-chart-label-font-weight, 600)',
  },
  link: {
    color: 'var(--nge-chart-outline, #79747e)',
    opacity: 0.9,
    opacityHover: 1,
    width: 1.5,
  },
  node: {
    color: 'var(--nge-chart-primary, #1976d2)',
    colors: [
      'var(--nge-chart-primary)',
      'var(--nge-chart-secondary)',
      'var(--nge-chart-tertiary)',
      'var(--nge-chart-error)',
      '#4CAF50',
      '#FF9800',
    ],
    opacity: 1,
    stroke: 'var(--nge-chart-surface)',
    strokeWidth: 1,
  },
};

/**
 * Default complete chart theme
 */
export const DEFAULT_NGE_CHART_THEME: NgeChartTheme = {
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
