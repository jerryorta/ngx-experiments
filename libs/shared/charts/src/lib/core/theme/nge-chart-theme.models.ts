/**
 * Base theme shared across all chart types.
 * Controls axes, grid, and other shared elements.
 */
export interface NgeChartBaseTheme {
  axis?: {
    /**
     * Styles the scale-agnostic grouping-tier rows drawn below the tick row —
     * band label, boundary separators, and optional band tint.
     */
    group?: {
      /** Group label color */
      labelColor?: string;
      /** Group label font size (px) */
      labelFontSize?: number;
      /** Pill-style badge background fill (opaque, so the baseline doesn't strike through) */
      pillBackground?: string;
      /** Pill-style horizontal padding (px) between the label and each rounded end */
      pillPaddingX?: number;
      /** Pill-style corner radius (px); omit for a full pill (radius = pill height / 2) */
      pillRadius?: number;
      /** Group separator line color */
      separatorColor?: string;
      /** Group separator line width (px) */
      separatorWidth?: number;
      /** Group band tint (background fill) color */
      tint?: string;
    };
    /** Axis title/label color */
    labelColor?: string;
    /** Axis title/label font size (px) */
    labelFontSize?: number;
    /** Axis title/label font weight */
    labelFontWeight?: number;
    /** Axis line/domain color */
    lineColor?: string;
    /** Axis line width (px) */
    lineWidth?: number;
    /** Axis tick text color */
    tickColor?: string;
    /** Axis tick font size (px) */
    tickFontSize?: number;
  };
  grid?: {
    /** Grid line color */
    lineColor?: string;
    /** Grid line dash pattern (e.g., '2 2') */
    lineDash?: string;
    /** Grid line width (px) */
    lineWidth?: number;
  };
}

/**
 * Area chart layer theme.
 * Namespaced under 'area' in composite themes.
 */
export interface NgeAreaLayerTheme {
  fill?: {
    /** Default fill color (single series) */
    color?: string;
    /** Array of fill colors for multi-series / stacked charts */
    colors?: string[];
    /** Fill opacity (0-1) */
    opacity?: number;
  };
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  line?: {
    /** Top-edge stroke color (used when showLine is set) */
    color?: string;
    /** Top-edge stroke width (px) */
    width?: number;
  };
}

/**
 * Bar chart layer theme.
 * Namespaced under 'bar' in composite themes.
 */
export interface NgeBarLayerTheme {
  bar?: {
    /** Bar fill color */
    color?: string;
    /** Bar fill color on hover */
    hoverColor?: string;
    /** Padding between bars (0-1) */
    padding?: number;
    /** Bar corner radius (px) */
    radius?: number;
  };
  categoryLabel?: {
    /** Category label color */
    color?: string;
    /** Category label font size (px) */
    fontSize?: number;
  };
  label?: {
    /** Value label color */
    color?: string;
    /** Value label font size (px) */
    fontSize?: number;
    /** Value label font weight */
    fontWeight?: number;
  };
  statistical?: {
    /** Statistical label color */
    labelColor?: string;
    /** Statistical label font size (px) */
    labelFontSize?: number;
    /** Statistical label font weight */
    labelFontWeight?: number;
    /** Mean line color */
    meanLineColor?: string;
    /** Mean line dash pattern */
    meanLineDash?: string;
    /** Mean line width (px) */
    meanLineWidth?: number;
    /** Median line color */
    medianLineColor?: string;
    /** Median line dash pattern */
    medianLineDash?: string;
    /** Median line width (px) */
    medianLineWidth?: number;
    /** Zero baseline rule color */
    zeroLineColor?: string;
    /** Zero baseline rule dash pattern (empty ⇒ solid) */
    zeroLineDash?: string;
    /** Zero baseline rule width (px) */
    zeroLineWidth?: number;
  };
}

/**
 * Heatmap chart layer theme.
 * Namespaced under 'heatmap' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeHeatmapLayerTheme {
  /** Bubble-mark styling (bubble mode). */
  bubble?: {
    /** Bubble fill color. Empty ⇒ inherit the resolved ramp color for the cell's value. */
    color?: string;
    /** Bubble fill opacity (0-1) */
    opacity?: number;
    /** Bubble outline stroke color */
    stroke?: string;
    /** Bubble outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Cell-mark styling (cell mode) and the sequential color ramp. */
  cell?: {
    /** Fill for an empty cell (`value` is null) */
    emptyColor?: string;
    /** Cell fill opacity (0-1) */
    opacity?: number;
    /** Cell corner radius (px) */
    radius?: number;
    /** Ramp low-value endpoint color (min of the color domain) */
    rampFrom?: string;
    /** Optional ramp midpoint color. Empty ⇒ a straight two-stop from → to ramp. */
    rampMid?: string;
    /** Ramp high-value endpoint color (max of the color domain) */
    rampTo?: string;
    /** Cell outline stroke color (separates adjacent cells) */
    stroke?: string;
    /** Cell outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Per-cell value label styling (when `showValues` is set). */
  label?: {
    /** Label color on light cells (the default, legible dark text). */
    color?: string;
    /**
     * Label color used when the cell fill is perceptually dark, so values stay legible
     * across the ramp. Auto-selected per cell by the cell fill's lightness.
     */
    colorOnDark?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
}

/**
 * Histogram chart layer theme.
 * Namespaced under 'histogram' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeHistogramLayerTheme {
  /** Bin bar styling. */
  bar?: {
    /** Bar fill color */
    color?: string;
    /** Bar fill opacity (0-1) */
    opacity?: number;
    /** Bar corner radius (px) */
    radius?: number;
    /** Bar outline stroke color (separates adjacent bars) */
    stroke?: string;
    /** Bar outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Fitted expected-frequency curve styling (rootogram mode). */
  curve?: {
    /** Curve stroke color */
    color?: string;
    /** Curve dash pattern (e.g. '4 2') */
    dash?: string;
    /** Curve stroke width (px) */
    width?: number;
  };
  /** Per-bin count label styling. */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /**
   * Curve node (dot) styling (rootogram mode). Nodes mark where the fitted curve
   * threads each hanging bar's top-center. Rendered above the bars and curve.
   */
  node?: {
    /** Node fill color */
    color?: string;
    /** Node radius (px). Set 0 to hide the nodes. */
    radius?: number;
    /** Node outline stroke color */
    stroke?: string;
    /** Node outline stroke width (px) */
    strokeWidth?: number;
  };
  /**
   * Zero reference-line styling (rootogram mode, when `showZeroLine` is set). The
   * horizontal baseline the hanging bars cross.
   */
  zeroLine?: {
    /** Line stroke color */
    color?: string;
    /** Line dash pattern (e.g. '4 2') */
    dash?: string;
    /** Line stroke width (px) */
    width?: number;
  };
}

/**
 * Line chart layer theme.
 * Namespaced under 'line' in composite themes.
 */
export interface NgeLineLayerTheme {
  area?: {
    /** Area fill color (uses line color if not set) */
    fillColor?: string;
    /** Fill opacity (0-1) */
    fillOpacity?: number;
  };
  label?: {
    /** Point label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  line?: {
    /** Default line color (for single series) */
    color?: string;
    /** Array of colors for multi-series charts */
    colors?: string[];
    /** Dash pattern (e.g., '5 3' for dashed) */
    dash?: string;
    /** Line opacity on hover (0-1) */
    hoverOpacity?: number;
    /** Line stroke width (px) */
    width?: number;
  };
  point?: {
    /** Point fill color */
    color?: string;
    /** Point radius on hover (px) */
    hoverRadius?: number;
    /** Point radius (px) */
    radius?: number;
    /** Point stroke color */
    strokeColor?: string;
    /** Point stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Overlay (analytical-annotation) chart layer theme.
 * Namespaced under 'overlay' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 *
 * Slices cover the three overlay modes: `fitLine` strokes the trend line
 * (`trendline` mode); `band` fills both the fan prediction-interval bands (`fan`
 * mode) and the shaded control band; `meanLine` / `limitLine` draw the centre + ±σ
 * limit rules (`control` mode). Mode statistics (slope / R², control limits, interval
 * level) surface via the layer tooltip on hover, not as on-canvas text.
 */
export interface NgeOverlayLayerTheme {
  /** Prediction-interval / control band fill styling (`fan` + `control` modes). */
  band?: {
    /** Band fill color */
    fillColor?: string;
    /** Band fill opacity (0-1) */
    fillOpacity?: number;
  };
  /** Fitted trend-line styling (`trendline` mode). */
  fitLine?: {
    /** Line stroke color */
    color?: string;
    /** Line dash pattern (e.g. '6 3'); empty ⇒ solid */
    dash?: string;
    /** Line stroke width (px) */
    width?: number;
  };
  /** Control-limit rule styling — the upper / lower ±σ limits (`control` mode). */
  limitLine?: {
    /** Limit line stroke color */
    color?: string;
    /** Limit line dash pattern (e.g. '4 3'); empty ⇒ solid */
    dash?: string;
    /** Limit line stroke width (px) */
    width?: number;
  };
  /** Mean (centre) rule styling (`control` mode). */
  meanLine?: {
    /** Mean line stroke color */
    color?: string;
    /** Mean line dash pattern (e.g. '6 3'); empty ⇒ solid */
    dash?: string;
    /** Mean line stroke width (px) */
    width?: number;
  };
}

/**
 * Bump (rank-over-time) chart layer theme.
 * Namespaced under 'bump' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`). Mirrors the line layer's slices
 * (rank lines + points) plus the series end label.
 */
export interface NgeBumpLayerTheme {
  /** End-of-line series label styling. */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /** Rank line styling. */
  line?: {
    /** Multi-series line palette. Series index maps to colors[index % length]. */
    colors?: string[];
    /** Dash pattern (e.g., '5 3' for dashed) */
    dash?: string;
    /** Line stroke width (px) */
    width?: number;
  };
  /** Per-point circle styling (points mode). */
  point?: {
    /** Point fill color */
    color?: string;
    /** Point radius on hover (px) */
    hoverRadius?: number;
    /** Point radius (px) */
    radius?: number;
    /** Point stroke color (overridden per-series by the resolved series color) */
    strokeColor?: string;
    /** Point stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Lollipop chart layer theme.
 * Namespaced under 'lollipop' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeLollipopLayerTheme {
  /** Value label styling. */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /** Marker (end glyph) styling. */
  marker?: {
    /** Single-series marker fill color. */
    color?: string;
    /** Multi-series fill palette. `seriesId` index maps to colors[index % length]. */
    colors?: string[];
    /** Marker radius (px). */
    radius?: number;
    /** Marker outline stroke color (separates the marker from the stem / background). */
    strokeColor?: string;
    /** Marker outline stroke width (px). */
    strokeWidth?: number;
  };
  /** Stem / dumbbell-connector styling. */
  stem?: {
    /** Stem stroke color */
    color?: string;
    /** Stem stroke width (px) */
    width?: number;
  };
}

/**
 * Pie / donut / semi-circle chart layer theme.
 * Namespaced under 'pie' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgePieLayerTheme {
  /** Per-slice label styling (reserved for on-arc labels). */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /** Slice (arc) styling. */
  slice?: {
    /** Single-slice fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-slice fill palette. Slice input index maps to colors[index % length]. */
    colors?: string[];
    /** Slice fill opacity (0-1) */
    opacity?: number;
    /** Slice outline stroke color (separates adjacent slices) */
    stroke?: string;
    /** Slice outline stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Sunburst / icicle (multi-level hierarchy) chart layer theme.
 * Namespaced under 'sunburst' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeSunburstLayerTheme {
  /** Per-node label styling (reserved for on-arc / on-rect labels). */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /** Segment (a node's arc in radial / rect in linear) styling. */
  segment?: {
    /** Single-segment fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-segment fill palette. Top-level branch index maps to colors[index % length]. */
    colors?: string[];
    /** Segment fill opacity (0-1) */
    opacity?: number;
    /** Segment outline stroke color (separates adjacent segments) */
    stroke?: string;
    /** Segment outline stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Radar / polar (spider / star) chart layer theme.
 * Namespaced under 'radar' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 *
 * `series` styles the per-series radar polygons (fill + outline + vertex dots) and carries
 * the shared multi-series fill/stroke palette; `axis` styles the radial spokes (one per
 * dimension, center → rim); `grid` styles the concentric value rings; `label` styles the
 * per-dimension category labels drawn at each spoke tip. All colors read `--chart-*`
 * tokens — never `--mat-sys-*`.
 */
export interface NgeRadarLayerTheme {
  /** Angular axis (spoke) styling — one line per dimension from the center to the rim. */
  axis?: {
    /** Spoke stroke color. */
    color?: string;
    /** Spoke stroke width (px). */
    width?: number;
  };
  /** Concentric value-ring (grid web) styling — the magnitude reference rings. */
  grid?: {
    /** Ring stroke color. */
    color?: string;
    /** Ring stroke width (px). */
    width?: number;
  };
  /** Per-dimension category label styling (drawn just outside each spoke tip). */
  label?: {
    /** Label color. */
    color?: string;
    /** Label font size (px). */
    fontSize?: number;
    /** Label font weight. */
    fontWeight?: number;
  };
  /** Radar polygon styling (per-series area fill + outline + vertex dots). */
  series?: {
    /** Single-series fill/stroke color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-series fill/stroke palette. Series index maps to colors[index % length]. */
    colors?: string[];
    /** Filled-polygon fill opacity (0-1), `render: 'area'`. */
    fillOpacity?: number;
    /** Polygon outline stroke width (px). */
    lineWidth?: number;
    /** Whole-series opacity (0-1). */
    opacity?: number;
    /** Vertex dot radius (px). Set 0 to hide the dots. */
    pointRadius?: number;
  };
}

/**
 * Radial-bar (polar) chart layer theme.
 * Namespaced under 'radial-bar' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 *
 * `bar` styles the radial arcs (`mark: 'bar'`) and doubles as the shared fill palette
 * for the area/cell marks; `area` tunes the radial area fill opacity + outline width
 * (`mark: 'area'`); `cell` styles the circular-heatmap grid (`mark: 'cell'`), whose
 * value intensity is encoded as fill OPACITY of a single `--chart-*` token (opacity, not
 * color math, so it composes with an unresolved `var(--chart-*)` fill).
 */
export interface NgeRadialBarLayerTheme {
  /** Radial area fill + outline styling (`mark: 'area'`). Fill color comes from the `bar` palette by series. */
  area?: {
    /** Area fill opacity (0-1). */
    fillOpacity?: number;
    /** Outline (top-edge line) stroke width (px). */
    lineWidth?: number;
  };
  /** Radial arc (bar/wedge) styling (`mark: 'bar'`) — also the shared fill palette for area + cell. */
  bar?: {
    /** Single fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-datum / multi-series fill palette. index maps to colors[index % length]. */
    colors?: string[];
    /** Fill opacity (0-1). */
    opacity?: number;
    /** Arc outline stroke color (separates adjacent bars). */
    stroke?: string;
    /** Arc outline stroke width (px). */
    strokeWidth?: number;
  };
  /** Circular-heatmap cell styling (`mark: 'cell'`) — value → fill OPACITY intensity. */
  cell?: {
    /** Base cell fill color; value intensity is applied as fill-opacity over it. */
    color?: string;
    /** Fill opacity for the LOWEST value (the highest value fills at opacity 1). */
    minOpacity?: number;
    /** Cell outline stroke color (separates adjacent cells). */
    stroke?: string;
    /** Cell outline stroke width (px). */
    strokeWidth?: number;
  };
  /** Per-datum label styling (reserved for on-arc labels). */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
}

/**
 * Scatter chart layer theme.
 * Namespaced under 'scatter' in composite themes.
 */
export interface NgeScatterLayerTheme {
  point?: {
    /** Default point fill color */
    color?: string;
    /** Array of colors for multi-series charts */
    colors?: string[];
    /**
     * Point fill color on hover.
     * Not currently applied by the scatter renderer — multi-series hover keeps the
     * resolved series/point color and only grows the radius. Kept for API compatibility.
     */
    hoverColor?: string;
    /** Point opacity (0-1) */
    opacity?: number;
    /** Point radius (px) */
    radius?: number;
    /** Point stroke color */
    strokeColor?: string;
    /** Point stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Bullet chart layer theme.
 * Namespaced under 'bullet' in composite themes.
 */
export interface NgeBulletLayerTheme {
  /** Background bar styling */
  backgroundBar?: {
    /** Background bar fill color */
    color?: string;
    /** Background bar height (px) */
    height?: number;
  };
  /** Limit indicator styling (min/max markers) */
  limitIndicator?: {
    /** Limit indicator color */
    color?: string;
    /** Limit indicator height (px) */
    height?: number;
    /** Limit indicator width (px) */
    width?: number;
  };
  /** Progress bar styling */
  progressBar?: {
    /** Progress bar fill color */
    color?: string;
    /** Progress bar height (px) */
    height?: number;
  };
  /** Progress indicator (marker) styling */
  progressIndicator?: {
    /** Progress indicator fill color */
    color?: string;
    /** Progress indicator height (px) */
    height?: number;
    /** Progress indicator width (px) */
    width?: number;
  };
}

/**
 * Distribution chart layer theme.
 * Namespaced under 'distribution' in composite themes (the key MUST equal the
 * layer `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeDistributionLayerTheme {
  /** Box-and-whisker body styling (box mode). */
  box?: {
    /** Box fill color */
    color?: string;
    /** Box fill opacity (0-1) */
    opacity?: number;
    /** Box corner radius (px) */
    radius?: number;
    /** Box outline stroke color */
    stroke?: string;
    /** Box outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Mean-marker styling (box mode). */
  mean?: {
    /** Mean glyph fill color */
    color?: string;
    /** Mean glyph radius (px) */
    radius?: number;
    /** Mean glyph outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Median-line styling (box mode). */
  median?: {
    /** Median line color */
    color?: string;
    /** Median line width (px) */
    width?: number;
  };
  /** Outlier-point styling (box mode). */
  outlier?: {
    /** Outlier point fill color */
    color?: string;
    /** Outlier point radius (px) */
    radius?: number;
    /** Outlier point outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Raw-observation point styling (points mode). */
  point?: {
    /** Single-series point fill color */
    color?: string;
    /** Multi-series fill palette. Category index maps to colors[index % length]. */
    colors?: string[];
    /** Point fill opacity (0-1) */
    opacity?: number;
    /** Point radius (px) */
    radius?: number;
    /** Point outline stroke color */
    strokeColor?: string;
    /** Point outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Violin (KDE density) styling (violin mode). */
  violin?: {
    /** Violin fill color */
    color?: string;
    /** Violin fill opacity (0-1) */
    opacity?: number;
    /** Violin outline stroke color */
    stroke?: string;
    /** Violin outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Whisker (and cap) styling. */
  whisker?: {
    /** Whisker cap width as a fraction of the box width (0-1) */
    capRatio?: number;
    /** Whisker stroke color */
    color?: string;
    /** Whisker stroke width (px) */
    width?: number;
  };
}

/**
 * Diverging bar chart layer theme.
 * Namespaced under 'diverging-bar' in composite themes.
 */
export interface NgeDivergingBarLayerTheme {
  /** Background bar styling */
  backgroundBar?: {
    /** Background bar fill color */
    color?: string;
    /** Background bar height (px) */
    height?: number;
  };
  /** Center indicator styling (zero point marker) */
  centerIndicator?: {
    /** Center indicator color */
    color?: string;
    /** Center indicator height (px) */
    height?: number;
    /** Center indicator width (px) */
    width?: number;
  };
  /** Limit indicator styling (min/max markers) */
  limitIndicator?: {
    /** Limit indicator color */
    color?: string;
    /** Limit indicator height (px) */
    height?: number;
    /** Limit indicator width (px) */
    width?: number;
  };
  /** Negative value bar styling (left side) */
  negativeBar?: {
    /** Negative bar fill color */
    color?: string;
  };
  /** Positive value bar styling (right side) */
  positiveBar?: {
    /** Positive bar fill color */
    color?: string;
  };
  /** Value indicator (marker) styling */
  valueIndicator?: {
    /** Value indicator fill color (inherits from bar color if not set) */
    color?: string;
    /** Value indicator height (px) */
    height?: number;
    /** Value indicator width (px) */
    width?: number;
  };
}

/**
 * Financial chart layer theme.
 * Namespaced under 'financial' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 *
 * Following the waterfall precedent, up / down use LITERAL semantic green / red (a
 * rising vs falling period reads the same regardless of the app theme); the neutral
 * candlestick wick reads the muted `--chart-*` token, and the kagi yang / yin lines
 * read the primary / error tokens with distinct thick / thin widths.
 */
export interface NgeFinancialLayerTheme {
  /** Falling-period styling: candlestick down body + renko down brick (close < open / down brick). */
  down?: {
    /** Fill color */
    color?: string;
    /** Fill opacity (0-1) */
    fillOpacity?: number;
    /** Outline stroke color */
    stroke?: string;
    /** Outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Kagi line styling — the yang (thick, rising past the prior shoulder) / yin (thin) flip. */
  kagi?: {
    /** Yang (thick) line color — the line has risen above the prior shoulder. */
    yangColor?: string;
    /** Yang (thick) line stroke width (px). */
    yangWidth?: number;
    /** Yin (thin) line color — the line has fallen below the prior waist. */
    yinColor?: string;
    /** Yin (thin) line stroke width (px). */
    yinWidth?: number;
  };
  /** Rising-period styling: candlestick up body + renko up brick (close >= open / up brick). */
  up?: {
    /** Fill color */
    color?: string;
    /** Fill opacity (0-1) */
    fillOpacity?: number;
    /** Outline stroke color */
    stroke?: string;
    /** Outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Candlestick wick (high–low line) + kagi horizontal-connector styling. */
  wick?: {
    /** Wick / connector stroke color */
    color?: string;
    /** Wick / connector stroke width (px) */
    width?: number;
  };
}

/**
 * Gauge (single-value meter) chart layer theme.
 * Namespaced under 'gauge' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 *
 * `track` styles the background arc / rail; `value` the filled value arc / progress fill;
 * `needle` the angular-gauge needle; `threshold` the optional colored-band palette; and
 * `label` the center numeric value text. All colors read `--chart-*` tokens — never
 * `--mat-sys-*`.
 */
export interface NgeGaugeLayerTheme {
  /** Center value-text styling. */
  label?: {
    /** Label color. */
    color?: string;
    /** Label font family. */
    fontFamily?: string;
    /** Label font size (px). */
    fontSize?: number;
    /** Label font weight. */
    fontWeight?: number;
  };
  /** Angular-gauge needle styling (`indicator: 'needle'`). */
  needle?: {
    /** Needle stroke color. */
    color?: string;
    /** Needle stroke width (px). */
    width?: number;
  };
  /** Threshold-band palette (cycled by band index unless a per-threshold color is set). */
  threshold?: {
    /** Band fill palette. Band index maps to colors[index % length]. */
    colors?: string[];
  };
  /** Background arc / rail (the unfilled track) styling. */
  track?: {
    /** Track fill color. */
    color?: string;
    /** Track fill opacity (0-1). */
    opacity?: number;
  };
  /** Filled value arc / progress-fill styling. */
  value?: {
    /** Value fill color. */
    color?: string;
    /** Value fill opacity (0-1). */
    opacity?: number;
  };
}

/**
 * Grouped bar chart layer theme.
 * Namespaced under 'grouped-bar' in composite themes.
 */
export interface NgeGroupedBarLayerTheme {
  bar?: {
    /** Bar fill color (used when data point has no color) */
    color?: string;
    /** Bar fill color on hover */
    hoverColor?: string;
    /** Bar corner radius (px) */
    radius?: number;
  };
  label?: {
    /** Value label color */
    color?: string;
    /** Value label font size (px) */
    fontSize?: number;
    /** Value label font weight */
    fontWeight?: number;
  };
}

/**
 * Stacked bar chart layer theme.
 * Namespaced under 'stacked-bar' in composite themes (the key MUST equal the
 * layer `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeStackedBarLayerTheme {
  bar?: {
    /** Series fill palette. Series index maps to colors[index % length]. */
    colors?: string[];
    /** Segment corner radius (px) */
    radius?: number;
    /** Segment separator stroke color */
    stroke?: string;
    /** Segment separator stroke width (px) */
    strokeWidth?: number;
  };
  label?: {
    /** Value label color */
    color?: string;
    /** Value label font size (px) */
    fontSize?: number;
    /** Value label font weight */
    fontWeight?: number;
  };
}

/**
 * Waterfall chart layer theme.
 * Namespaced under 'waterfall' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeWaterfallLayerTheme {
  /** Step connector styling (bridges consecutive bars). */
  connector?: {
    /** Connector stroke color */
    color?: string;
    /** Connector dash pattern (e.g., '3 2') */
    dash?: string;
    /** Connector stroke width (px) */
    width?: number;
  };
  /** Falling (negative-delta) bar styling. */
  fall?: {
    /** Bar fill color */
    color?: string;
  };
  /** Value label styling. */
  label?: {
    /** Value label color */
    color?: string;
    /** Value label font size (px) */
    fontSize?: number;
    /** Value label font weight */
    fontWeight?: number;
  };
  /** Rising (positive-delta) bar styling. */
  rise?: {
    /** Bar fill color */
    color?: string;
  };
  /** Subtotal / total (anchored-at-zero) bar styling. */
  total?: {
    /** Bar fill color */
    color?: string;
  };
}

/**
 * Timeline / Gantt chart layer theme.
 * Namespaced under 'timeline' in composite themes (the key MUST equal the layer
 * `type`, since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeTimelineLayerTheme {
  /** Task-span bar styling. */
  bar?: {
    /** Bar fill color */
    color?: string;
    /** Bar fill color on hover */
    hoverColor?: string;
    /** Bar fill opacity (0-1) */
    opacity?: number;
    /** Bar corner radius (px) */
    radius?: number;
  };
  /** On-bar item label styling (when `showLabels` is set). */
  label?: {
    /** Label color */
    color?: string;
    /** Label font size (px) */
    fontSize?: number;
    /** Label font weight */
    fontWeight?: number;
  };
  /** Milestone (point-marker) diamond styling. */
  milestone?: {
    /** Diamond fill color */
    color?: string;
    /** Diamond size — half-diagonal in px */
    size?: number;
    /** Diamond outline stroke color */
    stroke?: string;
    /** Diamond outline stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Complete chart theme combining base and layer-specific themes.
 */
export interface NgeChartTheme extends NgeChartBaseTheme {
  /** Area chart layer theme */
  area?: NgeAreaLayerTheme;
  /** Bar chart layer theme */
  bar?: NgeBarLayerTheme;
  /** Bullet chart layer theme */
  bullet?: NgeBulletLayerTheme;
  /** Bump chart layer theme */
  bump?: NgeBumpLayerTheme;
  /** Distribution chart layer theme */
  distribution?: NgeDistributionLayerTheme;
  /** Diverging bar chart layer theme */
  'diverging-bar'?: NgeDivergingBarLayerTheme;
  /** Financial chart layer theme */
  financial?: NgeFinancialLayerTheme;
  /** Gauge (single-value meter) chart layer theme */
  gauge?: NgeGaugeLayerTheme;
  /** Grouped bar chart layer theme */
  'grouped-bar'?: NgeGroupedBarLayerTheme;
  /** Heatmap chart layer theme */
  heatmap?: NgeHeatmapLayerTheme;
  /** Histogram chart layer theme */
  histogram?: NgeHistogramLayerTheme;
  /** Line chart layer theme */
  line?: NgeLineLayerTheme;
  /** Lollipop chart layer theme */
  lollipop?: NgeLollipopLayerTheme;
  /** Overlay (analytical-annotation) chart layer theme */
  overlay?: NgeOverlayLayerTheme;
  /** Pie / donut / semi-circle chart layer theme */
  pie?: NgePieLayerTheme;
  /** Radar / polar (spider / star) chart layer theme */
  radar?: NgeRadarLayerTheme;
  /** Radial-bar (polar) chart layer theme */
  'radial-bar'?: NgeRadialBarLayerTheme;
  /** Scatter chart layer theme */
  scatter?: NgeScatterLayerTheme;
  /** Stacked bar chart layer theme */
  'stacked-bar'?: NgeStackedBarLayerTheme;
  /** Sunburst / icicle chart layer theme */
  sunburst?: NgeSunburstLayerTheme;
  /** Timeline / Gantt chart layer theme */
  timeline?: NgeTimelineLayerTheme;
  /** Waterfall chart layer theme */
  waterfall?: NgeWaterfallLayerTheme;
}

/**
 * Deep required version of NgeAreaLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeAreaLayerTheme {
  fill: Required<NonNullable<NgeAreaLayerTheme['fill']>>;
  label: Required<NonNullable<NgeAreaLayerTheme['label']>>;
  line: Required<NonNullable<NgeAreaLayerTheme['line']>>;
}

/**
 * Deep required version of NgeBarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeBarLayerTheme {
  bar: Required<NonNullable<NgeBarLayerTheme['bar']>>;
  categoryLabel: Required<NonNullable<NgeBarLayerTheme['categoryLabel']>>;
  label: Required<NonNullable<NgeBarLayerTheme['label']>>;
  statistical: Required<NonNullable<NgeBarLayerTheme['statistical']>>;
}

/**
 * Deep required version of NgeHeatmapLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeHeatmapLayerTheme {
  bubble: Required<NonNullable<NgeHeatmapLayerTheme['bubble']>>;
  cell: Required<NonNullable<NgeHeatmapLayerTheme['cell']>>;
  label: Required<NonNullable<NgeHeatmapLayerTheme['label']>>;
}

/**
 * Deep required version of NgeHistogramLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeHistogramLayerTheme {
  bar: Required<NonNullable<NgeHistogramLayerTheme['bar']>>;
  curve: Required<NonNullable<NgeHistogramLayerTheme['curve']>>;
  label: Required<NonNullable<NgeHistogramLayerTheme['label']>>;
  node: Required<NonNullable<NgeHistogramLayerTheme['node']>>;
  zeroLine: Required<NonNullable<NgeHistogramLayerTheme['zeroLine']>>;
}

/**
 * Deep required version of NgeLineLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeLineLayerTheme {
  area: Required<NonNullable<NgeLineLayerTheme['area']>>;
  label: Required<NonNullable<NgeLineLayerTheme['label']>>;
  line: Required<NonNullable<NgeLineLayerTheme['line']>>;
  point: Required<NonNullable<NgeLineLayerTheme['point']>>;
}

/**
 * Deep required version of NgeBumpLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeBumpLayerTheme {
  label: Required<NonNullable<NgeBumpLayerTheme['label']>>;
  line: Required<NonNullable<NgeBumpLayerTheme['line']>>;
  point: Required<NonNullable<NgeBumpLayerTheme['point']>>;
}

/**
 * Deep required version of NgeLollipopLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeLollipopLayerTheme {
  label: Required<NonNullable<NgeLollipopLayerTheme['label']>>;
  marker: Required<NonNullable<NgeLollipopLayerTheme['marker']>>;
  stem: Required<NonNullable<NgeLollipopLayerTheme['stem']>>;
}

/**
 * Deep required version of NgeOverlayLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeOverlayLayerTheme {
  band: Required<NonNullable<NgeOverlayLayerTheme['band']>>;
  fitLine: Required<NonNullable<NgeOverlayLayerTheme['fitLine']>>;
  limitLine: Required<NonNullable<NgeOverlayLayerTheme['limitLine']>>;
  meanLine: Required<NonNullable<NgeOverlayLayerTheme['meanLine']>>;
}

/**
 * Deep required version of NgeBulletLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeBulletLayerTheme {
  backgroundBar: Required<NonNullable<NgeBulletLayerTheme['backgroundBar']>>;
  limitIndicator: Required<NonNullable<NgeBulletLayerTheme['limitIndicator']>>;
  progressBar: Required<NonNullable<NgeBulletLayerTheme['progressBar']>>;
  progressIndicator: Required<NonNullable<NgeBulletLayerTheme['progressIndicator']>>;
}

/**
 * Deep required version of NgeDistributionLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeDistributionLayerTheme {
  box: Required<NonNullable<NgeDistributionLayerTheme['box']>>;
  mean: Required<NonNullable<NgeDistributionLayerTheme['mean']>>;
  median: Required<NonNullable<NgeDistributionLayerTheme['median']>>;
  outlier: Required<NonNullable<NgeDistributionLayerTheme['outlier']>>;
  point: Required<NonNullable<NgeDistributionLayerTheme['point']>>;
  violin: Required<NonNullable<NgeDistributionLayerTheme['violin']>>;
  whisker: Required<NonNullable<NgeDistributionLayerTheme['whisker']>>;
}

/**
 * Deep required version of NgePieLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgePieLayerTheme {
  label: Required<NonNullable<NgePieLayerTheme['label']>>;
  slice: Required<NonNullable<NgePieLayerTheme['slice']>>;
}

/**
 * Deep required version of NgeSunburstLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeSunburstLayerTheme {
  label: Required<NonNullable<NgeSunburstLayerTheme['label']>>;
  segment: Required<NonNullable<NgeSunburstLayerTheme['segment']>>;
}

/**
 * Deep required version of NgeRadarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeRadarLayerTheme {
  axis: Required<NonNullable<NgeRadarLayerTheme['axis']>>;
  grid: Required<NonNullable<NgeRadarLayerTheme['grid']>>;
  label: Required<NonNullable<NgeRadarLayerTheme['label']>>;
  series: Required<NonNullable<NgeRadarLayerTheme['series']>>;
}

/**
 * Deep required version of NgeRadialBarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeRadialBarLayerTheme {
  area: Required<NonNullable<NgeRadialBarLayerTheme['area']>>;
  bar: Required<NonNullable<NgeRadialBarLayerTheme['bar']>>;
  cell: Required<NonNullable<NgeRadialBarLayerTheme['cell']>>;
  label: Required<NonNullable<NgeRadialBarLayerTheme['label']>>;
}

/**
 * Deep required version of NgeScatterLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeScatterLayerTheme {
  point: Required<NonNullable<NgeScatterLayerTheme['point']>>;
}

/**
 * Deep required version of NgeGroupedBarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeGroupedBarLayerTheme {
  bar: Required<NonNullable<NgeGroupedBarLayerTheme['bar']>>;
  label: Required<NonNullable<NgeGroupedBarLayerTheme['label']>>;
}

/**
 * Deep required version of NgeStackedBarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeStackedBarLayerTheme {
  bar: Required<NonNullable<NgeStackedBarLayerTheme['bar']>>;
  label: Required<NonNullable<NgeStackedBarLayerTheme['label']>>;
}

/**
 * Deep required version of NgeDivergingBarLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeDivergingBarLayerTheme {
  backgroundBar: Required<NonNullable<NgeDivergingBarLayerTheme['backgroundBar']>>;
  centerIndicator: Required<NonNullable<NgeDivergingBarLayerTheme['centerIndicator']>>;
  limitIndicator: Required<NonNullable<NgeDivergingBarLayerTheme['limitIndicator']>>;
  negativeBar: Required<NonNullable<NgeDivergingBarLayerTheme['negativeBar']>>;
  positiveBar: Required<NonNullable<NgeDivergingBarLayerTheme['positiveBar']>>;
  valueIndicator: Required<NonNullable<NgeDivergingBarLayerTheme['valueIndicator']>>;
}

/**
 * Deep required version of NgeFinancialLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeFinancialLayerTheme {
  down: Required<NonNullable<NgeFinancialLayerTheme['down']>>;
  kagi: Required<NonNullable<NgeFinancialLayerTheme['kagi']>>;
  up: Required<NonNullable<NgeFinancialLayerTheme['up']>>;
  wick: Required<NonNullable<NgeFinancialLayerTheme['wick']>>;
}

/**
 * Deep required version of NgeGaugeLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeGaugeLayerTheme {
  label: Required<NonNullable<NgeGaugeLayerTheme['label']>>;
  needle: Required<NonNullable<NgeGaugeLayerTheme['needle']>>;
  threshold: Required<NonNullable<NgeGaugeLayerTheme['threshold']>>;
  track: Required<NonNullable<NgeGaugeLayerTheme['track']>>;
  value: Required<NonNullable<NgeGaugeLayerTheme['value']>>;
}

/**
 * Deep required version of NgeWaterfallLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeWaterfallLayerTheme {
  connector: Required<NonNullable<NgeWaterfallLayerTheme['connector']>>;
  fall: Required<NonNullable<NgeWaterfallLayerTheme['fall']>>;
  label: Required<NonNullable<NgeWaterfallLayerTheme['label']>>;
  rise: Required<NonNullable<NgeWaterfallLayerTheme['rise']>>;
  total: Required<NonNullable<NgeWaterfallLayerTheme['total']>>;
}

/**
 * Deep required version of NgeTimelineLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeTimelineLayerTheme {
  bar: Required<NonNullable<NgeTimelineLayerTheme['bar']>>;
  label: Required<NonNullable<NgeTimelineLayerTheme['label']>>;
  milestone: Required<NonNullable<NgeTimelineLayerTheme['milestone']>>;
}
