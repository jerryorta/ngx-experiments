import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcFavoritesFilterComponent } from '../dlc-favorites-filter.component';
import { DlcFavoritesFilterStoriesComponent } from './dlc-favorites-filter-stories.component';

const meta: Meta<DlcFavoritesFilterStoriesComponent> = {
  component: DlcFavoritesFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Favorites Filter',
};

export default meta;
type Story = StoryObj<DlcFavoritesFilterStoriesComponent>;

export const primary: Story = {
  name: 'Favorites Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcFavoritesFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-favorites-filter [enabled]="true" [count]="3" />
        </div>
      </div>`,
  }),
};
