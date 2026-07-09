import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcSqftFilterComponent } from '../dlc-sqft-filter.component';
import { DlcSqftFilterStoriesComponent } from './dlc-sqft-filter-stories.component';

const meta: Meta<DlcSqftFilterStoriesComponent> = {
  component: DlcSqftFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Sqft Filter',
};

export default meta;
type Story = StoryObj<DlcSqftFilterStoriesComponent>;

export const primary: Story = {
  name: 'Sqft Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcSqftFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sqft-filter [min]="1500" [max]="2500" />
        </div>
      </div>`,
  }),
};
