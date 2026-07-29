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
  /**
   * Per-slice ON-ARC label styling — `labelPosition: 'inside'` only. Outside labels have
   * their own slice (`labelOutside`) because their backdrop is the plot surface, not a
   * slice fill.
   */
  label?: {
    /**
     * Label color on a LIGHT slice fill — and the flat fallback when the fill cannot be
     * measured. Defaults to the absolute `--nge-chart-black` token. Paired with
     * `colorOnDark`, this is one endpoint of the automatic on-fill contrast derivation.
     */
    color?: string;
    /**
     * Label color on a perceptually DARK slice fill. Defaults to the absolute
     * `--nge-chart-white` token. Set it to the same value as `color` to opt the whole
     * theme out of contrast derivation.
     */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /**
   * Per-slice OUTSIDE label styling — `labelPosition: 'outside'` only.
   *
   * A separate slice from `label`, not a variant of it, because the two have opposite
   * colour rules: an on-arc label sits on a saturated slice fill and needs the ABSOLUTE
   * black/white contrast pair, while an outside label sits on the page surface and must
   * track `--nge-chart-on-surface` instead. Deliberately declares NO `colorOnDark` — the
   * absence of the pair is what switches automatic on-fill contrast off
   * (`resolveLabelColor` short-circuits to `color`), so an outside label can never derive
   * from a fill it is not drawn on. Per-datum and layer-config `labelColor` still win.
   */
  labelOutside?: {
    /**
     * Outside label color. Defaults to `--nge-chart-on-surface` — theme-relative,
     * because the backdrop is the plot surface.
     */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works. Raise the layer's `labelLineHeight` to match.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /**
   * Leader-line styling — the polyline joining a COLLISION-DISPLACED outside label back to
   * its slice. A label resting at its natural anchor draws no leader, so this slice only
   * shows up on crowded pies.
   */
  leaderLine?: {
    /** Leader stroke color. Defaults to the muted `--nge-chart-outline` token. */
    stroke?: string;
    /** Leader stroke width (px). Default 1. */
    strokeWidth?: number;
  };
  /** Slice (arc) styling. */
  slice?: {
    /** Single-slice fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-slice fill palette. Slice input index maps to colors[index % length]. */
    colors?: string[];
    /**
     * Opacity (0-1) for slices NOT named in `highlightedLabels` — how far a slice recedes
     * when something else is selected. Only consulted while a selection is active; with no
     * selection every slice uses `opacity`.
     */
    dimmedOpacity?: number;
    /** Slice fill opacity (0-1) */
    opacity?: number;
    /** Slice outline stroke color (separates adjacent slices) */
    stroke?: string;
    /** Slice outline stroke width (px) */
    strokeWidth?: number;
  };
}

/**
 * Funnel / pyramid chart layer theme.
 * Namespaced under 'funnel' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeFunnelLayerTheme {
  /** Band (trapezoid) styling. */
  band?: {
    /** Single-band fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-band fill palette. Band input index maps to colors[index % length]. */
    colors?: string[];
    /** Band fill opacity (0-1) */
    opacity?: number;
    /** Band outline stroke color (separates adjacent bands) */
    stroke?: string;
    /** Band outline stroke width (px) */
    strokeWidth?: number;
  };
  /** Per-band IN-BAND label styling — `labelPosition: 'inside'` only. */
  label?: {
    /**
     * Label color on a LIGHT band fill — and the flat fallback when the fill cannot be
     * measured. Paired with `colorOnDark` for on-fill contrast.
     */
    color?: string;
    /** Label color on a perceptually DARK band fill. */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)`) or any CSS length
     * works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)`) works.
     */
    fontWeight?: number | string;
  };
  /**
   * Per-band OUTSIDE label styling — `labelPosition: 'edge' | 'right'` only.
   *
   * A separate slice from `label` for the same reason as the pie's `labelOutside`: an
   * in-band label sits on a saturated band fill and needs the ABSOLUTE black/white
   * contrast pair, while an outside label sits on the page surface and must track
   * `--nge-chart-on-surface`. Before ARCH-267 both read `label`, so an outside label fell
   * through to the absolute black — invisible on a dark surface. Declares NO `colorOnDark`:
   * the absence of the pair is what switches on-fill derivation off.
   */
  labelOutside?: {
    /**
     * Outside label color. Defaults to `--nge-chart-on-surface` — theme-relative,
     * because the backdrop is the plot surface.
     */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)`) or any CSS length
     * works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)`) works.
     */
    fontWeight?: number | string;
  };
}

/**
 * Sunburst / icicle (multi-level hierarchy) chart layer theme.
 * Namespaced under 'sunburst' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeSunburstLayerTheme {
  /**
   * Per-node ON-ARC / ON-RECT label styling.
   *
   * The label sits on the node's own fill — a value drawn from the segment palette, i.e. a
   * RANGE — so one flat colour cannot read on every node. `color` / `colorOnDark` are the
   * two endpoints `resolveLabelColor()` derives between per node, which is why they are the
   * ABSOLUTE black / white tokens rather than theme-relative ones.
   *
   * There is no `labelOutside` counterpart: this layer only draws labels inside the mark.
   * A future outside placement must add that second slice (no `colorOnDark`, tracking
   * `--nge-chart-on-surface`) rather than reuse this one — see
   * `docs/architecture/charts.md` § *A placement that leaves the mark needs its OWN theme slice*.
   */
  label?: {
    /**
     * Label color on a LIGHT node fill — and the flat fallback when the fill cannot be
     * measured. Defaults to the absolute `--nge-chart-black` token. Paired with
     * `colorOnDark`, this is one endpoint of the automatic on-fill contrast derivation.
     */
    color?: string;
    /**
     * Label color on a perceptually DARK node fill. Defaults to the absolute
     * `--nge-chart-white` token. Set it to the same value as `color` to opt the whole
     * theme out of contrast derivation.
     */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
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
 * Proportional-area / waffle chart layer theme.
 * Namespaced under 'proportional' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 *
 * `mark` styles every area-encoded shape — a circle, half-circle, square, waffle cell or
 * packed leaf are one mark family drawn from one palette. `emptyCell` styles the waffle's
 * unfilled remainder, which is chrome rather than data and so reads a muted surface token.
 */
export interface NgeProportionalLayerTheme {
  /**
   * Unfilled waffle cell styling (`mark: 'grid'` only) — the remainder between the data's
   * total and `rows × columns`. It is the grid's backdrop rather than a value, so it reads a
   * muted surface token instead of a palette entry.
   */
  emptyCell?: {
    /** Unfilled cell fill color. */
    color?: string;
    /** Unfilled cell fill opacity (0-1). */
    opacity?: number;
  };
  /**
   * Per-datum ON-MARK label styling.
   *
   * The label sits on the mark's own fill — a value drawn from the mark palette, i.e. a
   * RANGE — so one flat colour cannot read on every mark. `color` / `colorOnDark` are the
   * two endpoints `resolveLabelColor()` derives between per mark, which is why they are the
   * ABSOLUTE black / white tokens rather than theme-relative ones.
   *
   * There is no `labelOutside` counterpart: this layer only draws labels inside the mark.
   * A future outside placement must add that second slice (no `colorOnDark`, tracking
   * `--nge-chart-on-surface`) rather than reuse this one — see
   * `docs/architecture/charts.md` § *A placement that leaves the mark needs its OWN theme slice*.
   */
  label?: {
    /**
     * Label color on a LIGHT mark fill — and the flat fallback when the fill cannot be
     * measured. Defaults to the absolute `--nge-chart-black` token. Paired with
     * `colorOnDark`, this is one endpoint of the automatic on-fill contrast derivation.
     */
    color?: string;
    /**
     * Label color on a perceptually DARK mark fill. Defaults to the absolute
     * `--nge-chart-white` token. Set it to the same value as `color` to opt the whole
     * theme out of contrast derivation.
     */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /** Mark (circle / half-circle / square / waffle cell / packed leaf) styling. */
  mark?: {
    /** Single-mark fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-mark fill palette. Top-level input index maps to colors[index % length]. */
    colors?: string[];
    /** Mark fill opacity (0-1) */
    opacity?: number;
    /** Mark outline stroke color (separates adjacent marks) */
    stroke?: string;
    /** Mark outline stroke width (px) */
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
 * per-dimension category labels drawn at each spoke tip. All colors read `--nge-chart-*`
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
 * value intensity is encoded as fill OPACITY of a single `--nge-chart-*` token (opacity, not
 * color math, so it composes with an unresolved `var(--nge-chart-*)` fill).
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
  /**
   * Per-bar ON-BAR label styling — `labelPosition: 'inside'` only (`mark: 'bar'`).
   *
   * The label sits on the bar's own fill — a value drawn from the `bar` palette, i.e. a
   * RANGE — so one flat colour cannot read on every bar. `color` / `colorOnDark` are the
   * two endpoints `resolveLabelColor()` derives between per datum, which is why they are
   * the ABSOLUTE black / white tokens rather than theme-relative ones.
   */
  label?: {
    /**
     * Label color on a LIGHT bar fill — and the flat fallback when the fill cannot be
     * measured. Defaults to the absolute `--nge-chart-black` token. Paired with
     * `colorOnDark`, this is one endpoint of the automatic on-fill contrast derivation.
     */
    color?: string;
    /**
     * Label color on a perceptually DARK bar fill. Defaults to the absolute
     * `--nge-chart-white` token. Set it to the same value as `color` to opt the whole
     * theme out of contrast derivation.
     */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /**
   * Per-bar OUTSIDE label styling — `labelPosition: 'outside'` only.
   *
   * A separate slice from `label` for the same reason as the pie's `labelOutside`: an
   * on-bar label sits on a saturated bar fill and needs the ABSOLUTE black/white contrast
   * pair, while an outside label sits at the chart perimeter on the plot surface and must
   * track `--nge-chart-on-surface`. Deliberately declares NO `colorOnDark` — the absence
   * of the pair is what switches automatic on-fill contrast off (`resolveLabelColor`
   * short-circuits to `color`), so an outside label can never derive from a fill it is
   * not drawn on. Per-datum and layer-config `labelColor` still win.
   */
  labelOutside?: {
    /**
     * Outside label color. Defaults to `--nge-chart-on-surface` — theme-relative,
     * because the backdrop is the plot surface.
     */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
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
 * candlestick wick reads the muted `--nge-chart-*` token, and the kagi yang / yin lines
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
 * `label` the center numeric value text. All colors read `--nge-chart-*` tokens — never
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
    /**
     * Value label color on a LIGHT segment fill — and the flat fallback when the fill
     * cannot be measured. Paired with `colorOnDark` for automatic on-fill contrast.
     */
    color?: string;
    /** Value label color on a perceptually DARK segment fill. */
    colorOnDark?: string;
    /**
     * Value label font size. A `number` is treated as px; a string is passed to CSS
     * verbatim, so a token reference or any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Value label font weight — a numeric weight, or a string passed to CSS verbatim so
     * a token reference works.
     */
    fontWeight?: number | string;
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
 * Word cloud layer theme.
 *
 * Namespaced under 'wordcloud' in composite themes (the key MUST equal the layer `type`,
 * which is how `renderLayers` hands a layer its slice).
 *
 * ONE slice, `word`, because the text IS the mark here. Every other text-bearing layer
 * declares a separate `label` slice for text drawn on a data fill, resolved through
 * `resolveLabelColor()`'s on-fill contrast derivation — a word cloud has no fill under its
 * text, so it takes its colour straight from the categorical palette like any other mark.
 */
export interface NgeWordCloudLayerTheme {
  /** Word (text mark) styling. */
  word?: {
    /** Single-word text color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-word text palette. Placement order maps to colors[index % length]. */
    colors?: string[];
    /**
     * Font family the words are drawn AND measured in. Defaults to `'inherit'` — there is
     * no `--nge-chart-font-family` token, so the chart's own typography is the sane base.
     */
    fontFamily?: string;
    /**
     * Word font weight — a numeric weight, or a string passed to CSS verbatim so a token
     * reference works.
     */
    fontWeight?: number | string;
    /** Word text opacity (0-1) */
    opacity?: number;
  };
}

/**
 * Parallel coordinates layer theme.
 *
 * Namespaced under 'parallel-coords' in composite themes (the key MUST equal the layer
 * `type`, which is how `renderLayers` hands a layer its slice).
 *
 * The layer draws its own axes, so it carries the `axis` / `tick` / `label` chrome slices a
 * cartesian layer would otherwise inherit from the shared axis renderer. There is no
 * `labelOutside` counterpart to the pie's and funnel's: every text this layer draws sits on
 * the plot surface rather than on a data fill, so nothing goes through `resolveLabelColor()`
 * and there is no absolute-black rung to disambiguate.
 */
export interface NgeParallelCoordsLayerTheme {
  /** Vertical dimension-axis line styling — one per dimension, spanning the plot height. */
  axis?: {
    /** Axis stroke color. */
    color?: string;
    /** Axis stroke width (px). */
    width?: number;
  };
  /** Per-axis brush chrome: the selection window and its two edge handles. */
  brush?: {
    /** Selection-window fill. */
    fill?: string;
    /** Selection-window fill opacity (0-1) — the axis and its ticks read through it. */
    fillOpacity?: number;
    /** Window + handle stroke color. */
    stroke?: string;
    /** Window + handle stroke width (px). */
    strokeWidth?: number;
    /**
     * Drawn window width (px), centred on the axis. The invisible grab band is at least this
     * wide, so a narrow window can never leave the drag target smaller than what is painted.
     */
    width?: number;
  };
  /** Dimension-name label styling (drawn above each axis). */
  label?: {
    /** Label color. */
    color?: string;
    /** Label font size (px). */
    fontSize?: number;
    /** Label font weight. */
    fontWeight?: number;
  };
  /** Record polyline styling. */
  line?: {
    /** Single-record stroke color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-record stroke palette. Record (or `colorBy` category) index maps to colors[index % length]. */
    colors?: string[];
    /**
     * Opacity the OTHER lines drop to while one is hovered (0-1). The point of the highlight
     * is to trace one record through a thicket of overlapping ones, so this wants to be low
     * enough to read as background but not invisible.
     */
    dimmedOpacity?: number;
    /**
     * Resting line opacity (0-1). Below 1 by default: this chart type overplots heavily, and
     * partial transparency is what turns a mass of lines into readable density.
     */
    opacity?: number;
    /** Line stroke width (px). */
    width?: number;
  };
  /** Per-axis tick label styling (the value scale printed alongside each axis). */
  tick?: {
    /** Tick label color. */
    color?: string;
    /** Tick label font size (px). */
    fontSize?: number;
  };
}

/**
 * Treemap (nested proportional rectangles / convex polygons) chart layer theme.
 * Namespaced under 'treemap' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeTreemapLayerTheme {
  /** Cell (a node's rectangle, or its convex polygon under `tiling: 'voronoi'`) styling. */
  cell?: {
    /** Single-cell fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-cell fill palette. Top-level branch index maps to colors[index % length]. */
    colors?: string[];
    /**
     * How much lighter each level of nesting draws, as an HCL luminance step per depth.
     *
     * A treemap's whole structure is nesting, and nesting is invisible when every
     * descendant of a branch shares one flat fill — the stroke alone cannot carry it once
     * cells get small. Fading by depth keeps a branch reading as one family while still
     * separating its levels. `0` disables the derivation and paints every depth the
     * branch's base color.
     *
     * Applies only to palette-derived fills. A node carrying its own `color` is returned
     * untouched — an explicitly named colour opts out, the same way a per-datum
     * `labelColor` opts out of automatic on-fill contrast.
     */
    depthFade?: number;
    /** Cell fill opacity (0-1) */
    opacity?: number;
    /** Cell outline stroke color (separates adjacent cells) */
    stroke?: string;
    /** Cell outline stroke width (px) */
    strokeWidth?: number;
  };
  /**
   * Per-cell IN-CELL label styling.
   *
   * The label sits on the cell's own fill — a value drawn from the palette and then
   * depth-faded, i.e. a RANGE — so one flat colour cannot read on every cell.
   * `color` / `colorOnDark` are the two endpoints `resolveLabelColor()` derives between
   * per cell, which is why they are the ABSOLUTE black / white tokens rather than
   * theme-relative ones.
   *
   * There is no `labelOutside` counterpart: a treemap label is always inside its cell.
   * A future outside placement must add that second slice (no `colorOnDark`, tracking
   * `--nge-chart-on-surface`) rather than reuse this one — see
   * `docs/architecture/charts.md` § *A placement that leaves the mark needs its OWN theme slice*.
   */
  label?: {
    /**
     * Label color on a LIGHT cell fill — and the flat fallback when the fill cannot be
     * measured. Defaults to the absolute `--nge-chart-black` token.
     */
    color?: string;
    /**
     * Label color on a perceptually DARK cell fill. Defaults to the absolute
     * `--nge-chart-white` token. Set it to the same value as `color` to opt the whole
     * theme out of contrast derivation.
     */
    colorOnDark?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
}

/**
 * Sankey (weighted flow between staged nodes) chart layer theme.
 * Namespaced under 'sankey' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeSankeyLayerTheme {
  /**
   * Node label styling.
   *
   * A node rect is `nodeWidth` wide — 16px by default — so a label never fits inside one
   * and always sits on the plot surface beside it. One placement means nothing to
   * disambiguate, so this slice is theme-relative and carries NO `colorOnDark`: the
   * missing pair is what switches on-fill contrast derivation off, the same shape bar
   * value labels use. See `docs/architecture/charts.md` § *A placement that leaves the
   * mark needs its OWN theme slice*.
   */
  label?: {
    /** Label color. Defaults to `--nge-chart-on-surface` — the backdrop is the plot surface. */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /** Link (the flow ribbon between two node rects) styling. */
  link?: {
    /**
     * Ribbon fill used when a link names no `color` AND its source node has none either
     * — the flat fallback for an unpalettised graph.
     */
    color?: string;
    /**
     * Resting ribbon opacity. Ribbons overlap heavily wherever flows cross, so this sits
     * well below 1: translucency is what lets a reader see the crossings rather than
     * whichever ribbon happens to paint last.
     */
    opacity?: number;
    /**
     * Ribbon opacity under the pointer. Raising opacity rather than changing hue is what
     * keeps a hovered flow identifiable while still reading as the same colour it had at
     * rest.
     */
    opacityHover?: number;
  };
  /** Node (the rect at each end of a flow) styling. */
  node?: {
    /** Single-node fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-node fill palette. Node index maps to colors[index % length]. */
    colors?: string[];
    /** Node fill opacity (0-1). */
    opacity?: number;
    /** Node outline stroke color. */
    stroke?: string;
    /** Node outline stroke width (px). */
    strokeWidth?: number;
  };
}

/**
 * Chord (circular / linear relationship diagram) chart layer theme.
 * Namespaced under 'chord' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeChordLayerTheme {
  /**
   * Node label styling.
   *
   * A chord label always sits off the mark — past the ring in the circular layout, beneath
   * the node circle in the linear layout — so one placement means nothing to disambiguate.
   * This slice is theme-relative and carries NO `colorOnDark`: the missing pair is what
   * switches on-fill contrast derivation off, the same shape the sankey layer's node label
   * uses. See `docs/architecture/charts.md` § *A placement that leaves the mark needs its
   * OWN theme slice*.
   */
  label?: {
    /** Label color. Defaults to `--nge-chart-on-surface` — the backdrop is the plot surface. */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /** Link (the ribbon or edge connecting two node arcs / circles) styling. */
  link?: {
    /**
     * Ribbon / edge color used when a link names no `color` AND its source node has none
     * either — the flat fallback for an unpalettised graph.
     */
    color?: string;
    /**
     * Resting link opacity. Ribbons overlap heavily wherever relationships cross, so this
     * sits well below 1: translucency is what lets a reader see the crossings rather than
     * whichever ribbon happens to paint last.
     */
    opacity?: number;
    /**
     * Link opacity under the pointer. Raising opacity rather than changing hue is what
     * keeps a hovered connection identifiable while still reading as the same link it had
     * at rest.
     */
    opacityHover?: number;
  };
  /** Node (the ring arc in the circular layout, or the baseline circle in the linear layout) styling. */
  node?: {
    /** Single-node fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-node fill palette. Node index maps to colors[index % length]. */
    colors?: string[];
    /** Node fill opacity (0-1). */
    opacity?: number;
    /** Node outline stroke color. */
    stroke?: string;
    /** Node outline stroke width (px). */
    strokeWidth?: number;
  };
}

/**
 * Network (force / clustered / hive node-link graph) chart layer theme.
 * Namespaced under 'network' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeNetworkLayerTheme {
  /**
   * Hive axis styling — the straight spokes the `'hive'` layout radiates from the centre and
   * seats its nodes along. Chrome the layer draws itself, so unlike the shared x/y axes it
   * takes its colour from here rather than from `theme.axis`. Inert in the force layouts,
   * which draw no axes at all.
   */
  axis?: {
    /** Axis line color. Defaults to `--nge-chart-outline` — structural chrome, not data. */
    color?: string;
    /** Axis line width (px). */
    width?: number;
  };
  /**
   * Node label styling.
   *
   * A network label always sits BESIDE its node circle, never on it, so there is one placement
   * and nothing to disambiguate. This slice is theme-relative and carries NO `colorOnDark`:
   * the missing pair is what switches on-fill contrast derivation off, the same shape the
   * sankey and chord layers' node labels use. See `docs/architecture/charts.md` § *A placement
   * that leaves the mark needs its OWN theme slice*.
   */
  label?: {
    /** Label color. Defaults to `--nge-chart-on-surface` — the backdrop is the plot surface. */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /** Link (the edge connecting two nodes) styling. */
  link?: {
    /**
     * Edge color used when a link names no `color` AND its source node has none either —
     * the flat fallback for an unpalettised graph.
     */
    color?: string;
    /**
     * Resting link opacity. A network's edges cross far more often than a flow diagram's, so
     * this sits below 1: translucency is what keeps a dense interior readable instead of
     * matting into a single block of colour.
     */
    opacity?: number;
    /**
     * Link opacity under the pointer. Raising opacity rather than changing hue is what keeps
     * a hovered connection identifiable while still reading as the same link it had at rest.
     */
    opacityHover?: number;
    /** Edge stroke width (px). Flat, not data-driven — a graph's weight reads as layout distance. */
    width?: number;
  };
  /** Node (the circle seated by the layout) styling. */
  node?: {
    /** Single-node fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-node fill palette. Node index maps to colors[index % length]. */
    colors?: string[];
    /** Node fill opacity (0-1). */
    opacity?: number;
    /** Node outline stroke color. */
    stroke?: string;
    /** Node outline stroke width (px). */
    strokeWidth?: number;
  };
}

/**
 * Tree / dendrogram (hierarchy link-diagram) chart layer theme.
 * Namespaced under 'tree' in composite themes (the key MUST equal the layer `type`,
 * since `renderLayers` looks up `theme[layer.type]`).
 */
export interface NgeTreeLayerTheme {
  /**
   * Node label styling.
   *
   * A tree label always sits BESIDE its node circle, never on it, so there is one placement
   * and nothing to disambiguate. This slice is theme-relative and carries NO `colorOnDark`:
   * the missing pair is what switches on-fill contrast derivation off, the same shape the
   * sankey, chord and network layers' node labels use. See `docs/architecture/charts.md`
   * § *A placement that leaves the mark needs its OWN theme slice*.
   */
  label?: {
    /** Label color. Defaults to `--nge-chart-on-surface` — the backdrop is the plot surface. */
    color?: string;
    /**
     * Label font size. A `number` is treated as px; a string is passed to CSS verbatim,
     * so a token reference (`var(--nge-chart-label-font-size, 10px)` — the default) or
     * any CSS length works.
     */
    fontSize?: number | string;
    /**
     * Label font weight — a numeric weight, or a string passed to CSS verbatim so a
     * token reference (`var(--nge-chart-label-font-weight, 600)` — the default) works.
     */
    fontWeight?: number | string;
  };
  /** Link (the parent→child edge) styling. */
  link?: {
    /**
     * Edge color used when the child node names no `color` — the flat fallback for an
     * unpalettised tree.
     */
    color?: string;
    /**
     * Resting link opacity. A tree's edges never cross, so this sits well above the
     * network layer's 0.35: translucency buys nothing here and only weakens the structure
     * the layer exists to show.
     */
    opacity?: number;
    /**
     * Link opacity under the pointer. Raising opacity rather than changing hue is what keeps
     * a hovered edge identifiable while still reading as the same edge it had at rest.
     */
    opacityHover?: number;
    /** Edge stroke width (px). Flat, not data-driven — a tree encodes structure, not weight. */
    width?: number;
  };
  /** Node (the circle seated by the layout) styling. */
  node?: {
    /** Single-node fill color (fallback when the palette is exhausted / unset). */
    color?: string;
    /** Multi-node fill palette. Top-level branch index maps to colors[index % length]. */
    colors?: string[];
    /** Node fill opacity (0-1). */
    opacity?: number;
    /** Node outline stroke color. */
    stroke?: string;
    /** Node outline stroke width (px). */
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
  /** Chord / arc diagram (circular or linear relationship) chart layer theme */
  chord?: NgeChordLayerTheme;
  /** Distribution chart layer theme */
  distribution?: NgeDistributionLayerTheme;
  /** Diverging bar chart layer theme */
  'diverging-bar'?: NgeDivergingBarLayerTheme;
  /** Financial chart layer theme */
  financial?: NgeFinancialLayerTheme;
  /** Funnel / pyramid chart layer theme */
  funnel?: NgeFunnelLayerTheme;
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
  /** Network (force / clustered / hive node-link graph) chart layer theme */
  network?: NgeNetworkLayerTheme;
  /** Overlay (analytical-annotation) chart layer theme */
  overlay?: NgeOverlayLayerTheme;
  /** Parallel coordinates chart layer theme */
  'parallel-coords'?: NgeParallelCoordsLayerTheme;
  /** Pie / donut / semi-circle chart layer theme */
  pie?: NgePieLayerTheme;
  /** Proportional-area / waffle chart layer theme */
  proportional?: NgeProportionalLayerTheme;
  /** Radar / polar (spider / star) chart layer theme */
  radar?: NgeRadarLayerTheme;
  /** Radial-bar (polar) chart layer theme */
  'radial-bar'?: NgeRadialBarLayerTheme;
  /** Sankey / alluvial / parallel-sets (weighted flow) chart layer theme */
  sankey?: NgeSankeyLayerTheme;
  /** Scatter chart layer theme */
  scatter?: NgeScatterLayerTheme;
  /** Stacked bar chart layer theme */
  'stacked-bar'?: NgeStackedBarLayerTheme;
  /** Sunburst / icicle chart layer theme */
  sunburst?: NgeSunburstLayerTheme;
  /** Timeline / Gantt chart layer theme */
  timeline?: NgeTimelineLayerTheme;
  /** Tree / dendrogram (hierarchy link-diagram) chart layer theme */
  tree?: NgeTreeLayerTheme;
  /** Treemap (nested proportional) chart layer theme */
  treemap?: NgeTreemapLayerTheme;
  /** Waterfall chart layer theme */
  waterfall?: NgeWaterfallLayerTheme;
  /** Word cloud chart layer theme */
  wordcloud?: NgeWordCloudLayerTheme;
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
 * Deep required version of NgeNetworkLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeNetworkLayerTheme {
  axis: Required<NonNullable<NgeNetworkLayerTheme['axis']>>;
  label: Required<NonNullable<NgeNetworkLayerTheme['label']>>;
  link: Required<NonNullable<NgeNetworkLayerTheme['link']>>;
  node: Required<NonNullable<NgeNetworkLayerTheme['node']>>;
}

/**
 * Deep required version of NgeTreeLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeTreeLayerTheme {
  label: Required<NonNullable<NgeTreeLayerTheme['label']>>;
  link: Required<NonNullable<NgeTreeLayerTheme['link']>>;
  node: Required<NonNullable<NgeTreeLayerTheme['node']>>;
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
  labelOutside: Required<NonNullable<NgePieLayerTheme['labelOutside']>>;
  leaderLine: Required<NonNullable<NgePieLayerTheme['leaderLine']>>;
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
 * Deep required version of NgeProportionalLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeProportionalLayerTheme {
  emptyCell: Required<NonNullable<NgeProportionalLayerTheme['emptyCell']>>;
  label: Required<NonNullable<NgeProportionalLayerTheme['label']>>;
  mark: Required<NonNullable<NgeProportionalLayerTheme['mark']>>;
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
  labelOutside: Required<NonNullable<NgeRadialBarLayerTheme['labelOutside']>>;
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
 * Deep required version of NgeFunnelLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeFunnelLayerTheme {
  band: Required<NonNullable<NgeFunnelLayerTheme['band']>>;
  label: Required<NonNullable<NgeFunnelLayerTheme['label']>>;
  labelOutside: Required<NonNullable<NgeFunnelLayerTheme['labelOutside']>>;
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

/**
 * Deep required version of NgeWordCloudLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeWordCloudLayerTheme {
  word: Required<NonNullable<NgeWordCloudLayerTheme['word']>>;
}

/**
 * Deep required version of NgeParallelCoordsLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeParallelCoordsLayerTheme {
  axis: Required<NonNullable<NgeParallelCoordsLayerTheme['axis']>>;
  brush: Required<NonNullable<NgeParallelCoordsLayerTheme['brush']>>;
  label: Required<NonNullable<NgeParallelCoordsLayerTheme['label']>>;
  line: Required<NonNullable<NgeParallelCoordsLayerTheme['line']>>;
  tick: Required<NonNullable<NgeParallelCoordsLayerTheme['tick']>>;
}

/**
 * Deep required version of NgeTreemapLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeTreemapLayerTheme {
  cell: Required<NonNullable<NgeTreemapLayerTheme['cell']>>;
  label: Required<NonNullable<NgeTreemapLayerTheme['label']>>;
}

/**
 * Deep required version of NgeSankeyLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeSankeyLayerTheme {
  label: Required<NonNullable<NgeSankeyLayerTheme['label']>>;
  link: Required<NonNullable<NgeSankeyLayerTheme['link']>>;
  node: Required<NonNullable<NgeSankeyLayerTheme['node']>>;
}

/**
 * Deep required version of NgeChordLayerTheme.
 * All nested properties are required.
 */
export interface ResolvedNgeChordLayerTheme {
  label: Required<NonNullable<NgeChordLayerTheme['label']>>;
  link: Required<NonNullable<NgeChordLayerTheme['link']>>;
  node: Required<NonNullable<NgeChordLayerTheme['node']>>;
}
