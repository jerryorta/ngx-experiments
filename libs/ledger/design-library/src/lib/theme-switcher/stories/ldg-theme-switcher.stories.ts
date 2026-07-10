import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { LdgThemeSwitcherStoriesComponent } from './ldg-theme-switcher-stories.component';

const meta: Meta<LdgThemeSwitcherStoriesComponent> = {
  argTypes: {
    activeCssClass: {
      control: { type: 'select' },
      options: [
        'dlc-professional-light',
        'dlc-professional-dark',
        'dlc-home-light',
        'dlc-home-dark',
        'dlc-service-provider-light',
        'dlc-service-provider-dark',
      ],
    },
  },
  component: LdgThemeSwitcherStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Theme Switcher',
};

export default meta;
type Story = StoryObj<LdgThemeSwitcherStoriesComponent>;

export const primary: Story = {
  args: {
    activeCssClass: 'dlc-professional-dark',
  },
  name: 'Theme Switcher',
};
