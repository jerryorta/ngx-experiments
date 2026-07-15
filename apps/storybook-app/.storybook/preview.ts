import { applicationConfig, type Preview } from '@storybook/angular';
import { provideZonelessChangeDetection } from '@angular/core';

import {
  resolveThemeForGroup,
  STORYBOOK_THEME_CONFIGS,
  type ThemeGroupKey,
} from '@nge/storybook';

const ALL_THEME_CLASSES = STORYBOOK_THEME_CONFIGS.map(t => t.cssClass);

// Load persona + icon fonts once at startup (dlc personas: Manrope/DM Sans,
// Literata/Nunito Sans, Epilogue/IBM Plex Sans) plus Material Symbols for dlc-icon.
for (const href of [
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400..700&family=Nunito+Sans:wght@400..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Epilogue:wght@400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
]) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const preview: Preview = {
  decorators: [
    // The app is zoneless (no zone.js); render every story with zoneless CD.
    applicationConfig({ providers: [provideZonelessChangeDetection()] }),
    (storyFn, context) => {
      const selected =
        (context.globals as Record<string, string>)['theme'] ?? 'dlc-home-light';

      // Scope the theme to the story's group: a story declares
      // `parameters: { themeGroup: 'cg' }` to restrict which themes apply.
      const themeGroup = (context.parameters as { themeGroup?: ThemeGroupKey }).themeGroup;
      const theme = resolveThemeForGroup(selected, themeGroup);

      // Apply the selected theme class to document.body; NgeStorybookReviewContainer
      // reads it directly. CSS-var tokens (--dlc-*) cascade from @nge/themes.
      document.body.classList.remove(...ALL_THEME_CLASSES);
      document.body.classList.add(theme);

      return storyFn();
    },
  ],
  globalTypes: {
    // The theme global default; the SWITCHER UI is the custom manager toolbar
    // (.storybook/manager.tsx → ThemeSelectorTool), so no `toolbar` here.
    theme: {
      defaultValue: 'dlc-home-light',
      name: 'Theme',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default preview;
