import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcYearBuiltFilterComponent } from '../dlc-year-built-filter.component';
import { DlcYearBuiltFilterStoriesComponent } from './dlc-year-built-filter-stories.component';

const meta: Meta<DlcYearBuiltFilterStoriesComponent> = {
  component: DlcYearBuiltFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Year Built Filter',
};

export default meta;
type Story = StoryObj<DlcYearBuiltFilterStoriesComponent>;

export const primary: Story = {
  name: 'Year Built Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcYearBuiltFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-year-built-filter [min]="1990" [max]="1999" />
        </div>
      </div>`,
  }),
};
