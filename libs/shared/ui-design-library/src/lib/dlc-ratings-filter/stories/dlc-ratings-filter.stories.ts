import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcRatingsFilterComponent } from '../dlc-ratings-filter.component';
import { DlcRatingsFilterStoriesComponent } from './dlc-ratings-filter-stories.component';

const meta: Meta<DlcRatingsFilterStoriesComponent> = {
  component: DlcRatingsFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Ratings Filter',
};

export default meta;
type Story = StoryObj<DlcRatingsFilterStoriesComponent>;

export const primary: Story = {
  name: 'Ratings Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcRatingsFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-ratings-filter [selected]="[5, 4]" [counts]="{ 5: 4, 4: 12, 3: 7, 2: 3, 1: 1 }" />
        </div>
      </div>`,
  }),
};
