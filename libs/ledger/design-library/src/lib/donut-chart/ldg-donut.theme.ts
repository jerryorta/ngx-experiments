import type { LdgDonutLayerTheme } from './ldg-donut.models';

/**
 * Default donut theme — `--nge-chart-*` series/content tokens so the layer renders
 * correctly with no theme applied and stays promotion-ready. Values are applied
 * as D3 `.style()` strings (which the browser resolves in context), never as a
 * `seriesColors` array fed through a d3 scale — an unresolved `var()` fails
 * there (see `docs/architecture/charts.md`).
 */
export const DEFAULT_LDG_DONUT_LAYER_THEME: LdgDonutLayerTheme = {
  centerLabelColor: 'var(--nge-chart-on-surface-variant)',
  centerValueColor: 'var(--nge-chart-on-surface)',
  emptyRingColor: 'var(--nge-chart-surface-container-highest)',
  seriesColors: [
    'var(--nge-chart-primary)',
    'var(--nge-chart-secondary)',
    'var(--nge-chart-tertiary)',
    'var(--nge-chart-primary-container)',
    'var(--nge-chart-secondary-container)',
    'var(--nge-chart-error)',
  ],
};

/** Merge a partial donut theme over the defaults (undefined keys don't override). */
export function mergeLdgDonutLayerTheme(userTheme?: Partial<LdgDonutLayerTheme>): LdgDonutLayerTheme {
  if (!userTheme) return DEFAULT_LDG_DONUT_LAYER_THEME;
  const defined = Object.fromEntries(Object.entries(userTheme).filter(([, value]) => value !== undefined));
  return { ...DEFAULT_LDG_DONUT_LAYER_THEME, ...defined };
}
