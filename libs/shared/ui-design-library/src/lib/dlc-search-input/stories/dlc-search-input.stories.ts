import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcSearchInputComponent } from '../dlc-search-input.component';
import { DlcSearchInputStoriesComponent } from './dlc-search-input-stories.component';

const meta: Meta<DlcSearchInputStoriesComponent> = {
  component: DlcSearchInputStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Search Input',
};
export default meta;
type Story = StoryObj<DlcSearchInputStoriesComponent>;

export const primary: Story = { name: 'Search Input' };

export const ThemeShowcase: Story = {
  decorators: [
    moduleMetadata({
      imports: [DlcSearchInputComponent],
    }),
  ],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem">
        <div class="dlc-professional-dark"  style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
        <div class="dlc-professional-light" style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
        <div class="dlc-home-dark"          style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
        <div class="dlc-home-light"         style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
        <div class="dlc-service-provider-dark"  style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
        <div class="dlc-service-provider-light" style="background:var(--dlc-surface);padding:1rem"><dlc-search-input placeholder="Search…" /></div>
      </div>`,
  }),
};
