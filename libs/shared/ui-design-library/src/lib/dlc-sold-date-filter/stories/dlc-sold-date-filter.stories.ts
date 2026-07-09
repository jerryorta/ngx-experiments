import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcSoldDateFilterComponent } from '../dlc-sold-date-filter.component';
import { DlcSoldDateFilterStoriesComponent } from './dlc-sold-date-filter-stories.component';

const meta: Meta<DlcSoldDateFilterStoriesComponent> = {
  component: DlcSoldDateFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Sold Date Filter',
};

export default meta;
type Story = StoryObj<DlcSoldDateFilterStoriesComponent>;

export const primary: Story = {
  name: 'Sold Date Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcSoldDateFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sold-date-filter [minDate]="'2024-01-01'" [maxDate]="'2024-06-15'" />
        </div>
      </div>`,
  }),
};
