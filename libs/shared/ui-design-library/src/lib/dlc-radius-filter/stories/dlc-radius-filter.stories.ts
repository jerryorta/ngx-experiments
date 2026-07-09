import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcRadiusFilterComponent } from '../dlc-radius-filter.component';
import { DlcRadiusFilterStoriesComponent } from './dlc-radius-filter-stories.component';

const meta: Meta<DlcRadiusFilterStoriesComponent> = {
  component: DlcRadiusFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Radius Filter',
};

export default meta;
type Story = StoryObj<DlcRadiusFilterStoriesComponent>;

export const primary: Story = {
  name: 'Radius Filter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcRadiusFilterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-radius-filter mode="radius" [radiusMiles]="5" />
        </div>
      </div>`,
  }),
};
