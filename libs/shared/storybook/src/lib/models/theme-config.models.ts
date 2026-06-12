/**
 * Theme configuration interface.
 * Defines the structure for theme configurations used across the application.
 */
export interface ThemeConfig {
  /** CSS class name applied to body/container element for this theme */
  cssClass: string;
  /** Whether this is a dark theme */
  isDark: boolean;
  /** Whether this is the default theme for the application */
  isDefault: boolean;
  /** Human-readable display name for the theme */
  name: string;
}

/**
 * Get the default theme configuration from a list of themes.
 * Falls back to the first theme if no default is explicitly marked.
 */
export function getDefaultThemeConfig(themes: ThemeConfig[]): ThemeConfig {
  return themes.find(theme => theme.isDefault) || themes[0];
}
