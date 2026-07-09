import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcAnalyticsCardComponent } from '../dlc-analytics-card.component';
import { DlcAnalyticsCardStoriesComponent } from './dlc-analytics-card-stories.component';

const meta: Meta<DlcAnalyticsCardStoriesComponent> = {
  component: DlcAnalyticsCardStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Analytics Card',
};

export default meta;
type Story = StoryObj<DlcAnalyticsCardStoriesComponent>;

export const primary: Story = {
  name: 'Analytics Card',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcAnalyticsCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Seller's Market" accentColor="#4caf50" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">12.4%</div>
          </dlc-analytics-card>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Seller's Market" accentColor="#4caf50" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">12.4%</div>
          </dlc-analytics-card>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Balanced" accentColor="#ff9800" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">28.1%</div>
          </dlc-analytics-card>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Balanced" accentColor="#ff9800" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">28.1%</div>
          </dlc-analytics-card>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Buyer's Market" accentColor="#f44336" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">52.8%</div>
          </dlc-analytics-card>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-analytics-card label="Market health" headline="Buyer's Market" accentColor="#f44336" explainer="% with reductions">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600">52.8%</div>
          </dlc-analytics-card>
        </div>
      </div>`,
  }),
};
