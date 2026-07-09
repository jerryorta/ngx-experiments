import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcStatsCardComponent } from '../dlc-stats-card.component';
import { DlcStatsCardStoriesComponent } from './dlc-stats-card-stories.component';

const meta: Meta<DlcStatsCardStoriesComponent> = {
  component: DlcStatsCardStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Stats Card',
};

export default meta;
type Story = StoryObj<DlcStatsCardStoriesComponent>;

export const primary: Story = {
  name: 'Stats Card',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcStatsCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Active Listings" value="42" trend="up" trendLabel="+8 vs last month" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Total Sales" value="$3.8M" trend="up" trendLabel="+12% vs last month" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Avg Days on Market" value="18" trend="down" trendLabel="-3 days" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Close Rate" value="94%" trend="flat" trendLabel="No change" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Open Work Orders" value="7" trend="down" trendLabel="-2 vs last week" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-stats-card label="Completed Jobs" value="128" trend="up" trendLabel="+15% vs last month" />
        </div>
      </div>`,
  }),
};
