import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcBillingToggleComponent } from '../dlc-billing-toggle.component';
import { DlcBillingToggleStoriesComponent } from './dlc-billing-toggle-stories.component';

const meta: Meta<DlcBillingToggleStoriesComponent> = {
  argTypes: {
    value: { control: { type: 'select' }, options: ['monthly', 'annual'] },
  },
  component: DlcBillingToggleStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Billing Toggle',
};
export default meta;
type Story = StoryObj<DlcBillingToggleStoriesComponent>;

export const primary: Story = {
  args: { value: 'monthly' },
  name: 'Billing Toggle',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcBillingToggleComponent] })],
  name: 'Theme Showcase',
  render: args => ({
    props: args,
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="monthly"></dlc-billing-toggle></div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="annual"></dlc-billing-toggle></div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="monthly"></dlc-billing-toggle></div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="annual"></dlc-billing-toggle></div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="monthly"></dlc-billing-toggle></div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-billing-toggle value="annual"></dlc-billing-toggle></div>
      </div>`,
  }),
};
