import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcPricingCardComponent } from '../dlc-pricing-card.component';
import { DlcPricingCardStoriesComponent } from './dlc-pricing-card-stories.component';

const meta: Meta<DlcPricingCardStoriesComponent> = {
  component: DlcPricingCardStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Pricing Card',
};
export default meta;
type Story = StoryObj<DlcPricingCardStoriesComponent>;

export const primary: Story = { name: 'Pricing Card' };

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcPricingCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Solo" [price]="29" billingPeriod="monthly" [features]="['1 agent','CRM','25 listings']" ctaLabel="Get started"></dlc-pricing-card></div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Team" [price]="79" billingPeriod="monthly" [features]="['5 agents','CRM','Unlimited listings']" ctaLabel="Get started" [featured]="true"></dlc-pricing-card></div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Solo" [price]="29" billingPeriod="annual" [features]="['1 agent','CRM','25 listings']" ctaLabel="Get started"></dlc-pricing-card></div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Team" [price]="79" billingPeriod="annual" [features]="['5 agents','CRM','Unlimited listings']" ctaLabel="Get started" [featured]="true"></dlc-pricing-card></div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Basic" [price]="19" billingPeriod="monthly" [features]="['Job board','5 bids/mo']" ctaLabel="Get started"></dlc-pricing-card></div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-pricing-card planName="Pro" [price]="49" billingPeriod="monthly" [features]="['Unlimited bids','Priority placement']" ctaLabel="Get started" [featured]="true"></dlc-pricing-card></div>
      </div>`,
  }),
};
