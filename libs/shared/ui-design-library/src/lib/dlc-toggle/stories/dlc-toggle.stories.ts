import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcToggleComponent } from '../dlc-toggle.component';
import { DlcToggleStoriesComponent } from './dlc-toggle-stories.component';

const meta: Meta<DlcToggleStoriesComponent> = {
  argTypes: {
    checked: { control: { type: 'boolean' } },
  },
  component: DlcToggleStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Toggle',
};

export default meta;
type Story = StoryObj<DlcToggleStoriesComponent>;

export const primary: Story = {
  args: { checked: false },
  name: 'Toggle',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcToggleComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:1rem;align-items:center">
          <dlc-toggle [ngModel]="false" ariaLabel="off" /> <dlc-toggle [ngModel]="true" ariaLabel="on" />
        </div>
      </div>`,
  }),
};
