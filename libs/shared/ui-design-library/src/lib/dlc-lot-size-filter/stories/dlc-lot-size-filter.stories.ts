import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcLotSizeFilterComponent } from '../dlc-lot-size-filter.component';
import { DlcLotSizeFilterStoriesComponent } from './dlc-lot-size-filter-stories.component';

const meta: Meta<DlcLotSizeFilterStoriesComponent> = {
  component: DlcLotSizeFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Lot Size Filter',
};

export default meta;
type Story = StoryObj<DlcLotSizeFilterStoriesComponent>;

export const primary: Story = {
  name: 'Lot Size Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcLotSizeFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-lot-size-filter unit="acres" [min]="10890" [max]="43560" />
        </div>
      </div>`,
  }),
};
