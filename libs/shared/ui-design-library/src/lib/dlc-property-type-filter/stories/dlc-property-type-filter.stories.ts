import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcPropertyTypeFilterComponent } from '../dlc-property-type-filter.component';
import { DlcPropertyTypeFilterStoriesComponent } from './dlc-property-type-filter-stories.component';

const meta: Meta<DlcPropertyTypeFilterStoriesComponent> = {
  component: DlcPropertyTypeFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Property Type Filter',
};

export default meta;
type Story = StoryObj<DlcPropertyTypeFilterStoriesComponent>;

export const primary: Story = {
  name: 'Property Type Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcPropertyTypeFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-type-filter [selected]="['Residential', 'Land']" />
        </div>
      </div>`,
  }),
};
