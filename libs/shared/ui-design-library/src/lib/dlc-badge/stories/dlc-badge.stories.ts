import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcBadgeComponent } from '../dlc-badge.component';
import { DlcBadgeStoriesComponent } from './dlc-badge-stories.component';

const meta: Meta<DlcBadgeStoriesComponent> = {
  argTypes: {
    count: { control: 'number' },
    variant: {
      control: { type: 'select' },
      options: ['error', 'accent', 'surface'],
    },
    visible: { control: 'boolean' },
  },
  component: DlcBadgeStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Badge',
};

export default meta;
type Story = StoryObj<DlcBadgeStoriesComponent>;

export const primary: Story = {
  args: {
    count: 5,
    variant: 'error',
    visible: true,
  },
  name: 'Badge',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcBadgeComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-badge variant="error" [count]="5"></dlc-badge>
          <dlc-badge variant="accent" [count]="12"></dlc-badge>
        </div>
      </div>`,
  }),
};
