import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { STORYBOOK_THEME_CONFIGS, type ThemeConfig } from '@nge/storybook';

/** The demo's opening persona — the shared default (`dlc-professional-dark`). */
const DEFAULT_THEME: ThemeConfig = STORYBOOK_THEME_CONFIGS.find(theme => theme.isDefault) ?? STORYBOOK_THEME_CONFIGS[0];

interface ThemeState {
  activeTheme: ThemeConfig;
}

const initialThemeState: ThemeState = {
  activeTheme: DEFAULT_THEME,
};

/**
 * App-shell store for the persona theme selection — the demo's "prove the token
 * architecture" showpiece. Holds only which of the six shared
 * `.dlc-{persona}-{mode}` personas is active; `AppComponent` mirrors
 * `activeCssClass` onto `<body>` so every surface (incl. CDK overlays) re-themes.
 * Provide on the shell (`providers: [ThemeStore]`), never `providedIn: 'root'`.
 */
export const ThemeStore = signalStore(
  withState(initialThemeState),
  withComputed(store => ({
    /** The active persona's body class, e.g. `'dlc-home-light'`. */
    activeCssClass: computed(() => store.activeTheme().cssClass),
  })),
  withMethods(store => ({
    setTheme(theme: ThemeConfig): void {
      patchState(store, { activeTheme: theme });
    },
  }))
);
