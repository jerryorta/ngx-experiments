import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgEmptyStateComponent } from '../ldg-empty-state.component';
import { LdgEmptyStateStoriesComponent } from './ldg-empty-state-stories.component';

const meta: Meta<LdgEmptyStateStoriesComponent> = {
  argTypes: {
    heading: { control: 'text' },
    icon: { control: 'text' },
    message: { control: 'text' },
  },
  component: LdgEmptyStateStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Empty State',
};

export default meta;
type Story = StoryObj<LdgEmptyStateStoriesComponent>;

export const primary: Story = {
  args: {
    heading: 'No transactions yet',
    icon: 'receipt_long',
    message: 'Add your first transaction to get started.',
  },
  name: 'Empty State',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgEmptyStateComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Professional Dark" message="No transactions yet."></ldg-empty-state>
        </div>
        <div class="dlc-professional-light" style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Professional Light" message="No transactions yet."></ldg-empty-state>
        </div>
        <div class="dlc-home-dark"          style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Home Dark" message="No transactions yet."></ldg-empty-state>
        </div>
        <div class="dlc-home-light"         style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Home Light" message="No transactions yet."></ldg-empty-state>
        </div>
        <div class="dlc-service-provider-dark"  style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Service Provider Dark" message="No transactions yet."></ldg-empty-state>
        </div>
        <div class="dlc-service-provider-light" style="background:var(--dlc-surface)">
          <ldg-empty-state icon="receipt_long" heading="Service Provider Light" message="No transactions yet."></ldg-empty-state>
        </div>
      </div>`,
  }),
};
