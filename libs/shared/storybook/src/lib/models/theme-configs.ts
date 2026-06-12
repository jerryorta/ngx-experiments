import { getDefaultThemeConfig, type ThemeConfig } from './theme-config.models';

// ============================================================================
// MW THEMES (Media Workbench)
// ============================================================================
export const MW_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'mw-dark',
    isDark: true,
    isDefault: true,
    name: 'MW Dark',
  },
  {
    cssClass: 'mw-light',
    isDark: false,
    isDefault: false,
    name: 'MW Light',
  },
];

// ============================================================================
// CG THEMES (Concierge)
// ============================================================================
export const CG_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'cg-professional-light',
    isDark: false,
    isDefault: false,
    name: 'CG Professional Light',
  },
  {
    cssClass: 'cg-professional-dark',
    isDark: true,
    isDefault: false,
    name: 'CG Professional Dark',
  },
  {
    cssClass: 'cg-home-light',
    isDark: false,
    isDefault: false,
    name: 'CG Home Light',
  },
  {
    cssClass: 'cg-home-dark',
    isDark: true,
    isDefault: false,
    name: 'CG Home Dark',
  },
  {
    cssClass: 'cg-service-provider-light',
    isDark: false,
    isDefault: false,
    name: 'CG Service Provider Light',
  },
  {
    cssClass: 'cg-service-provider-dark',
    isDark: true,
    isDefault: false,
    name: 'CG Service Provider Dark',
  },
];

// ============================================================================
// NGE THEMES (Nge Marketing)
// ============================================================================
export const NGE_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'nge-light',
    isDark: false,
    isDefault: false,
    name: 'Nge Light',
  },
];

// ============================================================================
// COG THEMES (Cognition — Digital Atheneum)
// ============================================================================
export const COG_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'cog-dark',
    isDark: true,
    isDefault: false,
    name: 'COG Dark',
  },
  {
    cssClass: 'cog-light',
    isDark: false,
    isDefault: false,
    name: 'COG Light',
  },
];

// ============================================================================
// GY THEMES (Got You) — light-primary; dark deferred
// ============================================================================
export const GY_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'gy-light',
    isDark: false,
    isDefault: true,
    name: 'GY Light',
  },
];

// ============================================================================
// STORYBOOK THEMES (MW + CG + NGE + COG + GY)
// ============================================================================
export const STORYBOOK_THEME_CONFIGS: ThemeConfig[] = [
  ...MW_THEME_CONFIGS,
  ...CG_THEME_CONFIGS,
  ...NGE_THEME_CONFIGS,
  ...COG_THEME_CONFIGS,
  ...GY_THEME_CONFIGS,
];

// ============================================================================
// THEME GROUPS (per-domain) — scope the Storybook theme picker per story
// ============================================================================

/** Domain key a story can declare via `parameters: { themeGroup }` to scope themes. */
export type ThemeGroupKey = 'cg' | 'cog' | 'nge' | 'gy' | 'mw';

/** Maps each domain key to the themes valid for that domain. */
export const THEME_GROUP_CONFIGS: Record<ThemeGroupKey, ThemeConfig[]> = {
  cg: CG_THEME_CONFIGS,
  cog: COG_THEME_CONFIGS,
  nge: NGE_THEME_CONFIGS,
  gy: GY_THEME_CONFIGS,
  mw: MW_THEME_CONFIGS,
};

/**
 * Themes available for a given group. With no group (`undefined`), all themes are
 * returned — so shared / cross-domain stories (e.g. Charts, UI Design Library)
 * keep the full picker.
 */
export function getThemesForGroup(group?: ThemeGroupKey): ThemeConfig[] {
  return group ? THEME_GROUP_CONFIGS[group] : STORYBOOK_THEME_CONFIGS;
}

/**
 * Resolve the theme css class to apply for a story scoped to `group`, given the
 * currently-selected toolbar theme. The selection is kept when it belongs to the
 * group; otherwise the group's default theme is used (e.g. after navigating from a
 * story in another domain whose theme isn't valid here).
 */
export function resolveThemeForGroup(selectedCssClass: string, group?: ThemeGroupKey): string {
  const themes = getThemesForGroup(group);
  return themes.some(theme => theme.cssClass === selectedCssClass)
    ? selectedCssClass
    : getDefaultThemeConfig(themes).cssClass;
}
