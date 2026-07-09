import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcRoleSwitcherComponent } from '../dlc-role-switcher.component';
import { DlcRoleSwitcherStoriesComponent } from './dlc-role-switcher-stories.component';

const meta: Meta<DlcRoleSwitcherStoriesComponent> = {
  argTypes: {
    activeRole: {
      control: { type: 'select' },
      options: ['professional', 'home', 'service-provider'],
    },
  },
  component: DlcRoleSwitcherStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Role Switcher',
};

export default meta;
type Story = StoryObj<DlcRoleSwitcherStoriesComponent>;

export const primary: Story = {
  args: {
    activeRole: 'professional',
  },
  name: 'Role Switcher',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcRoleSwitcherComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="professional"></dlc-role-switcher></div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="professional"></dlc-role-switcher></div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="home"></dlc-role-switcher></div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="home"></dlc-role-switcher></div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="service-provider"></dlc-role-switcher></div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-role-switcher activeRole="service-provider"></dlc-role-switcher></div>
      </div>`,
  }),
};
