import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../../../libs/shared/ui-design-library/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/shared/charts/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/shared/calendar/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
  ],
  addons: [],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
