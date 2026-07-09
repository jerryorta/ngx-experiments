import React, { useEffect } from 'react';
import { IconButton, TooltipLinkList, WithTooltip } from 'storybook/internal/components';
import { useGlobals, useParameter } from 'storybook/manager-api';

import {
  getThemesForGroup,
  resolveThemeForGroup,
  type ThemeGroupKey,
} from '../../../libs/shared/storybook/src/lib/models/theme-configs';

const THEME_GLOBAL = 'theme';

/**
 * Custom manager-side theme switcher. Reads the current story's `themeGroup`
 * parameter and lists ONLY that group's themes (e.g. `themeGroup: 'cg'` shows the
 * dlc personas). Stories with no `themeGroup` show every theme.
 */
export const ThemeSelectorTool = () => {
  const [globals, updateGlobals] = useGlobals();
  const themeGroup = useParameter<ThemeGroupKey | undefined>('themeGroup', undefined);

  const themes = getThemesForGroup(themeGroup);
  const selected = (globals as Record<string, string | undefined>)[THEME_GLOBAL];

  // If the active theme isn't valid for this story's group, snap to the group's
  // default so the toolbar selection and the rendered story agree.
  useEffect(() => {
    const effective = resolveThemeForGroup(selected ?? '', themeGroup);
    if (effective !== selected) {
      updateGlobals({ [THEME_GLOBAL]: effective });
    }
  }, [selected, themeGroup, updateGlobals]);

  const active = themes.find(theme => theme.cssClass === selected) ?? themes[0];

  return (
    <WithTooltip
      placement="top"
      trigger="click"
      tooltip={({ onHide }: { onHide: () => void }) => (
        <TooltipLinkList
          links={themes.map(theme => ({
            active: theme.cssClass === active?.cssClass,
            id: theme.cssClass,
            onClick: () => {
              updateGlobals({ [THEME_GLOBAL]: theme.cssClass });
              onHide();
            },
            title: theme.name,
          }))}
        />
      )}
    >
      <IconButton key="nge-theme" title="Theme">
        <span aria-hidden style={{ marginRight: 6 }}>
          🎨
        </span>
        {active?.name ?? 'Theme'}
      </IconButton>
    </WithTooltip>
  );
};
