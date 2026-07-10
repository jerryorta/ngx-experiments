import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgDonutChartComponent } from '../ldg-donut-chart.component';
import { LdgDonutChartStoriesComponent } from './ldg-donut-chart-stories.component';

const meta: Meta<LdgDonutChartStoriesComponent> = {
  argTypes: {
    centerLabel: { control: 'text' },
    centerValue: { control: 'text' },
    showLegend: { control: 'boolean' },
    thickness: { control: { max: 0.9, min: 0, step: 0.05, type: 'range' } },
  },
  component: LdgDonutChartStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Donut Chart',
};

export default meta;
type Story = StoryObj<LdgDonutChartStoriesComponent>;

export const primary: Story = {
  args: {
    centerLabel: 'Total',
    centerValue: '$4,121.00',
    showLegend: true,
    thickness: 0.55,
  },
  name: 'Donut Chart',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgDonutChartComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      segments: [
        { color: 'var(--ldg-category-3)', label: 'Housing', value: 1850 },
        { color: 'var(--ldg-category-1)', label: 'Groceries', value: 624 },
        { color: 'var(--ldg-category-4)', label: 'Transportation', value: 412 },
        { color: 'var(--ldg-category-2)', label: 'Dining', value: 381 },
      ],
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Professional Dark" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Professional Light" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Home Dark" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Home Light" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Service Provider Dark" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-donut-chart [segments]="segments" centerLabel="Service Provider Light" centerValue="$32.67" [showLegend]="false"></ldg-donut-chart>
        </div>
      </div>`,
  }),
};
