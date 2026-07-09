import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcInputComponent } from '../dlc-input.component';
import { DlcInputStoriesComponent } from './dlc-input-stories.component';

const meta: Meta<DlcInputStoriesComponent> = {
  argTypes: {
    disabled: { control: 'boolean' },
    errorText: { control: 'text' },
    helperText: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    type: {
      control: { type: 'select' },
      options: ['text', 'number', 'date', 'email', 'password', 'url'],
    },
  },
  component: DlcInputStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Input',
};

export default meta;
type Story = StoryObj<DlcInputStoriesComponent>;

export const primary: Story = {
  args: {
    disabled: false,
    errorText: null,
    helperText: null,
    label: 'Label',
    placeholder: 'Placeholder text',
    type: 'text',
  },
  name: 'Input',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcInputComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Professional Dark" placeholder="Enter value" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Professional Light" placeholder="Enter value" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Home Dark" placeholder="Enter value" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Home Light" placeholder="Enter value" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Service Provider Dark" placeholder="Enter value" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-input label="Service Provider Light" placeholder="Enter value" />
        </div>
      </div>`,
  }),
};
