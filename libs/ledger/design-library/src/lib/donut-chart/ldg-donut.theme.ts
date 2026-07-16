import type { LdgDonutLayerTheme } from './ldg-donut.models';

/**
 * Default donut theme — `--chart-*` series/content tokens so the layer renders
 * correctly with no theme applied and stays promotion-ready. Values are applied
 * as D3 `.style()` strings (which the browser resolves in context), never as a
 * `seriesColors` array fed through a d3 scale — an unresolved `var()` fails
 * there (see `docs/architecture/charts.md`).
 */
export const DEFAULT_LDG_DONUT_LAYER_THEME: LdgDonutLayerTheme = {
  centerLabelColor: 'var(--chart-on-surface-variant)',
  centerValueColor: 'var(--chart-on-surface)',
  emptyRingColor: 'var(--chart-surface-container-highest)',
  seriesColors: [
    'var(--chart-primary)',
    'var(--chart-secondary)',
    'var(--chart-tertiary)',
    'var(--chart-primary-container)',
    'var(--chart-secondary-container)',
    'var(--chart-error)',
  ],
};

/** Merge a partial donut theme over the defaults (undefined keys don't override). */
export function mergeLdgDonutLayerTheme(userTheme?: Partial<LdgDonutLayerTheme>): LdgDonutLayerTheme {
  if (!userTheme) return DEFAULT_LDG_DONUT_LAYER_THEME;
  const defined = Object.fromEntries(Object.entries(userTheme).filter(([, value]) => value !== undefined));
  return { ...DEFAULT_LDG_DONUT_LAYER_THEME, ...defined };
}
