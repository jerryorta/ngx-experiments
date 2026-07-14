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
 * Diverging bar chart layer theme.
 * Namespaced under 'divergingBar' in composite themes.
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
 * Complete chart theme combining base and layer-specific themes.
 */
export interface NgeChartTheme extends NgeChartBaseTheme {
  /** Bar chart layer theme */
  bar?: NgeBarLayerTheme;
  /** Bullet chart layer theme */
  bullet?: NgeBulletLayerTheme;
  /** Diverging bar chart layer theme */
  divergingBar?: NgeDivergingBarLayerTheme;
  /** Grouped bar chart layer theme */
  'grouped-bar'?: NgeGroupedBarLayerTheme;
  /** Line chart layer theme */
  line?: NgeLineLayerTheme;
  /** Scatter chart layer theme */
  scatter?: NgeScatterLayerTheme;
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
