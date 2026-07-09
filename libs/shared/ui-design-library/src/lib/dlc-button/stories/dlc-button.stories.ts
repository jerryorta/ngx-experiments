import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcButtonComponent } from '../dlc-button.component';
import { DlcButtonStoriesComponent } from './dlc-button-stories.component';

const meta: Meta<DlcButtonStoriesComponent> = {
  argTypes: {
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'ghost', 'danger'],
    },
  },
  component: DlcButtonStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Button',
};

export default meta;
type Story = StoryObj<DlcButtonStoriesComponent>;

export const primary: Story = {
  args: {
    disabled: false,
    loading: false,
    size: 'md',
    variant: 'primary',
  },
  name: 'Button',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcButtonComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);display:flex;flex-direction:column;gap:0.75rem">
          <dlc-button variant="primary">Primary</dlc-button>
          <dlc-button variant="ghost">Ghost</dlc-button>
          <dlc-button variant="danger">Danger</dlc-button>
        </div>
      </div>`,
  }),
};
