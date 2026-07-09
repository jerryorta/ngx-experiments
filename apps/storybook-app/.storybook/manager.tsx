import React from 'react';
import { addons, types } from 'storybook/manager-api';

import managerTheme from './manager-theme';
import { ThemeSelectorTool } from './theme-selector-tool';

const ADDON_ID = 'nge/theme-selector';
const TOOL_ID = `${ADDON_ID}/tool`;

addons.setConfig({
  theme: managerTheme,
});

// Register the custom per-story theme switcher (see theme-selector-tool.tsx). It
// lists only the current story's themeGroup (the dlc personas for `themeGroup: 'cg'`).
addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    match: () => true,
    render: () => <ThemeSelectorTool />,
    title: 'Theme',
    type: types.TOOL,
  });
});
