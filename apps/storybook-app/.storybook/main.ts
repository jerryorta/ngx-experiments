import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    // The Welcome page, which lives in this app rather than in a library because it
    // describes all of them. Listed first for readability; its sidebar position is
    // set by `options.storySort` in preview.ts, not by this order.
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../libs/shared/ui-design-library/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/shared/charts/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/shared/table/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/shared/calendar/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/ledger/design-library/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
  ],
  addons: [],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
