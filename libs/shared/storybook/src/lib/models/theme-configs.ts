import { getDefaultThemeConfig, type ThemeConfig } from './theme-config.models';

// ============================================================================
// CG THEMES (Concierge personas — the migrated @nge/themes `dlc-` themes)
// ============================================================================
export const CG_THEME_CONFIGS: ThemeConfig[] = [
  {
    cssClass: 'dlc-professional-light',
    isDark: false,
    isDefault: false,
    name: 'CG Professional Light',
  },
  {
    cssClass: 'dlc-professional-dark',
    isDark: true,
    isDefault: true,
    name: 'CG Professional Dark',
  },
  {
    cssClass: 'dlc-home-light',
    isDark: false,
    isDefault: false,
    name: 'CG Home Light',
  },
  {
    cssClass: 'dlc-home-dark',
    isDark: true,
    isDefault: false,
    name: 'CG Home Dark',
  },
  {
    cssClass: 'dlc-service-provider-light',
    isDark: false,
    isDefault: false,
    name: 'CG Service Provider Light',
  },
  {
    cssClass: 'dlc-service-provider-dark',
    isDark: true,
    isDefault: false,
    name: 'CG Service Provider Dark',
  },
];

// ============================================================================
// STORYBOOK THEMES — only the migrated CG (dlc) personas.
// MW / NGE / COG / GY themes were never migrated to ngx and were removed.
// ============================================================================
export const STORYBOOK_THEME_CONFIGS: ThemeConfig[] = [...CG_THEME_CONFIGS];

// ============================================================================
// THEME GROUPS (per-domain) — scope the Storybook theme picker per story
// ============================================================================

/** Domain key a story can declare via `parameters: { themeGroup }` to scope themes. */
export type ThemeGroupKey = 'cg';

/** Maps each domain key to the themes valid for that domain. */
export const THEME_GROUP_CONFIGS: Record<ThemeGroupKey, ThemeConfig[]> = {
  cg: CG_THEME_CONFIGS,
};

/**
 * Themes available for a given group. With no group (`undefined`), all themes are
 * returned — so shared / cross-domain stories (e.g. Charts, Calendar, UI Design
 * Library) keep the full picker.
 */
export function getThemesForGroup(group?: ThemeGroupKey): ThemeConfig[] {
  return group ? THEME_GROUP_CONFIGS[group] : STORYBOOK_THEME_CONFIGS;
}

/**
 * Resolve the theme css class to apply for a story scoped to `group`, given the
 * currently-selected toolbar theme. The selection is kept when it belongs to the
 * group; otherwise the group's default theme is used.
 */
export function resolveThemeForGroup(selectedCssClass: string, group?: ThemeGroupKey): string {
  const themes = getThemesForGroup(group);
  return themes.some(theme => theme.cssClass === selectedCssClass)
    ? selectedCssClass
    : getDefaultThemeConfig(themes).cssClass;
}
