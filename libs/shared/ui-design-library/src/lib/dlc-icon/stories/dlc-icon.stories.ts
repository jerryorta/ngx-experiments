import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcIconDirective } from '../dlc-icon.directive';
import { DlcIconStoriesComponent } from './dlc-icon-stories.component';

const meta: Meta<DlcIconStoriesComponent> = {
  argTypes: {
    icon: { control: 'text' },
  },
  component: DlcIconStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Icon',
};

export default meta;
type Story = StoryObj<DlcIconStoriesComponent>;

export const primary: Story = {
  args: {
    icon: 'home',
  },
  name: 'Icon',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcIconDirective] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
        <div class="dlc-home-dark" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
        <div class="dlc-home-light" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
        <div class="dlc-service-provider-dark" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;flex-wrap:wrap;gap:1.5rem;align-content:start">
          <span dlcIcon="home" style="font-size:24px"></span>
          <span dlcIcon="visibility" style="font-size:24px"></span>
          <span dlcIcon="settings" style="font-size:24px"></span>
          <span dlcIcon="notifications" style="font-size:24px"></span>
        </div>
      </div>`,
  }),
};
