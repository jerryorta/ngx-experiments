import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcCheckboxComponent } from '../dlc-checkbox.component';
import { DlcCheckboxStoriesComponent } from './dlc-checkbox-stories.component';

const meta: Meta<DlcCheckboxStoriesComponent> = {
  argTypes: {
    checked: { control: { type: 'boolean' } },
  },
  component: DlcCheckboxStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Checkbox',
};

export default meta;
type Story = StoryObj<DlcCheckboxStoriesComponent>;

export const primary: Story = {
  args: { checked: false },
  name: 'Checkbox',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcCheckboxComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface-container);display:flex;gap:1rem;align-items:center">
          <dlc-checkbox ariaLabel="unchecked" /> <dlc-checkbox [checked]="true" ariaLabel="checked" />
        </div>
      </div>`,
  }),
};
