import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcTextareaComponent } from '../dlc-textarea.component';
import { DlcTextareaStoriesComponent } from './dlc-textarea-stories.component';

const meta: Meta<DlcTextareaStoriesComponent> = {
  argTypes: {
    disabled: { control: 'boolean' },
    errorText: { control: 'text' },
    helperText: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
  },
  component: DlcTextareaStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Textarea',
};

export default meta;
type Story = StoryObj<DlcTextareaStoriesComponent>;

export const primary: Story = {
  args: {
    disabled: false,
    errorText: null,
    helperText: null,
    label: 'Label',
    placeholder: 'Placeholder text',
    rows: 4,
  },
  name: 'Textarea',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcTextareaComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Professional Dark" placeholder="Enter text" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Professional Light" placeholder="Enter text" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Home Dark" placeholder="Enter text" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Home Light" placeholder="Enter text" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Service Provider Dark" placeholder="Enter text" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-textarea label="Service Provider Light" placeholder="Enter text" />
        </div>
      </div>`,
  }),
};
