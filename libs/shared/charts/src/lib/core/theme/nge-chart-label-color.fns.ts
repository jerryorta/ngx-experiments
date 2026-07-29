import { hcl } from 'd3-color';

/**
 * Concrete fallbacks for the `--nge-chart-*` tokens the in-JS colour maths reads, so
 * a colour computation never throws when a `var()` fails to resolve (e.g. under jsdom,
 * where `getComputedStyle` returns '' for a custom property, or in Storybook, where
 * `:root` is empty and the tokens resolve only from the theme-bridge class on `<body>`).
 *
 * Keep in sync with the literal defaults in `styles/_nge-chart-tokens.scss`.
 */
export const NGE_CHART_TOKEN_FALLBACKS: Record<string, string> = {
  '--nge-chart-black': '#000000',
  '--nge-chart-primary': '#1976d2',
  '--nge-chart-surface': '#ffffff',
  '--nge-chart-surface-container-highest': '#e0e0e0',
  '--nge-chart-white': '#ffffff',
};

/**
 * Perceptual-lightness threshold (CIE Lab L*, 0–100) separating a "dark" data fill from
 * a light one. A label drawn on a fill below this flips to the light-on-dark colour to
 * stay legible. Shared by every layer that draws text on its own mark.
 */
export const NGE_CHART_DARK_FILL_LIGHTNESS = 60;

/**
 * The two label colours derived contrast picks between. `color` is the on-LIGHT-fill
 * colour (and the flat fallback when a fill cannot be measured); `colorOnDark` is used
 * when the resolved fill is perceptually dark.
 */
export interface NgeChartLabelColorTheme {
  /** Label colour on a light fill — also the fallback for an unmeasurable fill. */
  color: string;
  /** Label colour on a perceptually dark fill (Lab L* below the threshold). */
  colorOnDark?: string;
}

/** Inputs to the label-colour resolution chain. See {@link resolveLabelColor}. */
export interface NgeChartLabelColorParams {
  /** Layer-config label colour — rung 2. Set it to force one flat colour on every mark. */
  configColor?: string;
  /** Per-datum label colour — rung 1, the highest-priority explicit override. */
  datumColor?: string;
  /** The mark's already-resolved fill, used for rung 3 (derived contrast). */
  fill: string;
  /** An element in the chart's tree, used to read `var()` tokens off the cascade. */
  node: Element | null;
  /** The layer theme's `label` slice — rung 3's two endpoints and rung 4's default. */
  theme: NgeChartLabelColorTheme;
}

/**
 * Resolve a `var(--nge-chart-*)` token to a concrete colour by reading the custom
 * property off `node` (custom properties inherit across the shadow boundary), falling
 * back to a hard-coded hex so the colour maths never throws. A concrete colour or an
 * empty string passes through untouched.
 */
export function resolveNgeChartThemeColor(
  node: Element | null,
  value: string,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }
  const match = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim());
  if (!match) {
    return value;
  }
  if (node && typeof getComputedStyle === 'function') {
    const resolved = getComputedStyle(node).getPropertyValue(match[1]).trim();
    if (resolved) {
      return resolved;
    }
  }
  return NGE_CHART_TOKEN_FALLBACKS[match[1]] ?? fallback;
}

/**
 * Pick a legible colour for a data label drawn ON TOP of its own mark's fill.
 *
 * A data fill comes from the series palette — a *range* — so no single themed colour
 * reads on every mark: white reads on a deep blue slice and vanishes on a pale yellow
 * one. Four rungs, highest priority first:
 *
 * 1. **per-datum `labelColor`** — the author decided, for this one mark.
 * 2. **layer-config `labelColor`** — the author decided, for the whole layer. Supplying
 *    it deliberately disables derived contrast (the escape hatch to one flat colour).
 * 3. **derived from the fill** — `theme.colorOnDark` when the resolved fill is
 *    perceptually dark (Lab L* below {@link NGE_CHART_DARK_FILL_LIGHTNESS}), else
 *    `theme.color`. This is the default path, and it still resolves to *theme* values,
 *    so `theme.<type>.label` stays fully themeable.
 * 4. **`theme.color`** — when the fill cannot be measured (an unparseable or unresolved
 *    `var()` override) or the theme declares no `colorOnDark`.
 *
 * Rung 3 is only correct for text drawn INSIDE a mark. A label sitting on the plot
 * surface — the bar layer's value labels (above / beside the bar), or the funnel's
 * `labelPosition: 'edge' | 'right'` — has a theme-relative backdrop and must not derive.
 * Pass `fill: ''` there: an unmeasurable fill falls through to `theme.color` while the
 * two explicit rungs keep working, so no extra flag is needed.
 */
export function resolveLabelColor(params: NgeChartLabelColorParams): string {
  const { configColor, datumColor, fill, node, theme } = params;

  if (datumColor) {
    return datumColor;
  }
  if (configColor) {
    return configColor;
  }
  if (!theme.colorOnDark) {
    return theme.color;
  }

  const lightness = hcl(resolveNgeChartThemeColor(node, fill, '')).l;
  return Number.isFinite(lightness) && lightness < NGE_CHART_DARK_FILL_LIGHTNESS
    ? theme.colorOnDark
    : theme.color;
}

/**
 * Normalise a theme font size to a CSS length. A `number` is treated as px (the
 * long-standing shape for consumers), while a string passes through verbatim so a
 * token reference (`var(--nge-chart-label-font-size, 10px)`) or any CSS length works.
 */
export function toCssFontSize(fontSize: number | string): string {
  return typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
}
