import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcStatusFilterComponent } from '../dlc-status-filter.component';
import { DlcStatusFilterStoriesComponent } from './dlc-status-filter-stories.component';

const meta: Meta<DlcStatusFilterStoriesComponent> = {
  component: DlcStatusFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Status Filter',
};

export default meta;
type Story = StoryObj<DlcStatusFilterStoriesComponent>;

export const primary: Story = {
  name: 'Status Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcStatusFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-status-filter [selected]="['Active', 'Pending']" />
        </div>
      </div>`,
  }),
};
