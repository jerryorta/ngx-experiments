import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcAvatarComponent } from '../dlc-avatar.component';
import { DlcAvatarStoriesComponent } from './dlc-avatar-stories.component';

const meta: Meta<DlcAvatarStoriesComponent> = {
  argTypes: {
    imageUrl: { control: 'text' },
    initials: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    status: {
      control: { type: 'select' },
      options: ['online', 'busy', 'offline', null],
    },
  },
  component: DlcAvatarStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Avatar',
};

export default meta;
type Story = StoryObj<DlcAvatarStoriesComponent>;

export const primary: Story = {
  args: {
    initials: 'AB',
    size: 'md',
    status: null,
  },
  name: 'Avatar',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcAvatarComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="PD" status="online"></dlc-avatar>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="PL" status="online"></dlc-avatar>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="HD" status="busy"></dlc-avatar>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="HL" status="busy"></dlc-avatar>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="SD" status="offline"></dlc-avatar>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-avatar size="md" initials="SL" status="offline"></dlc-avatar>
        </div>
      </div>`,
  }),
};
