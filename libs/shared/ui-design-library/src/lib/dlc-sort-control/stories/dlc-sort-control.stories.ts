import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcSortControlComponent } from '../dlc-sort-control.component';
import { DlcSortControlStoriesComponent } from './dlc-sort-control-stories.component';

const meta: Meta<DlcSortControlStoriesComponent> = {
  component: DlcSortControlStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Sort Control',
};

export default meta;
type Story = StoryObj<DlcSortControlStoriesComponent>;

export const primary: Story = {
  name: 'Sort Control',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcSortControlComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-sort-control field="price" direction="desc" />
        </div>
      </div>`,
  }),
};
