import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcPersonaCardComponent } from '../dlc-persona-card.component';
import { DlcPersonaCardStoriesComponent } from './dlc-persona-card-stories.component';

const meta: Meta<DlcPersonaCardStoriesComponent> = {
  component: DlcPersonaCardStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync(), provideRouter([])] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Persona Card',
};
export default meta;
type Story = StoryObj<DlcPersonaCardStoriesComponent>;

export const primary: Story = { name: 'Persona Card' };

/**
 * REX-514 — contact-mode variant: listing-agent card on the property-search
 * detail panel. Renders the same leaf with `brokerage`/`directPhone`/
 * `officePhone`/`email`/`license` inputs populated and no `ctaRoute`, so the
 * contact-info block shows and the CTA link is suppressed. The "Sparse" and
 * "Name only" rows in the stories container also exercise the per-row
 * suppression contract.
 */
export const ListingAgentContact: Story = {
  decorators: [moduleMetadata({ imports: [DlcPersonaCardComponent] })],
  name: 'Listing Agent Contact (REX-514)',
  render: () => ({
    template: `
      <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);max-width:360px">
        <dlc-persona-card
          persona="broker"
          title="Marcus Webb"
          brokerage="Heritage Realty Group"
          directPhone="(512) 555-0142"
          officePhone="(512) 555-2100"
          email="marcus.webb@heritage-realty.example"
          license="TX-RE-739201"
        ></dlc-persona-card>
      </div>`,
  }),
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcPersonaCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="broker" title="For Brokers & Agents" description="Manage listings, clients, and transactions." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="broker" title="For Brokers & Agents" description="Manage listings, clients, and transactions." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="buyer" title="For Buyers & Sellers" description="Find your perfect home with confidence." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="buyer" title="For Buyers & Sellers" description="Find your perfect home with confidence." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="service-provider" title="For Service Providers" description="Grow your contracting business." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-persona-card persona="service-provider" title="For Service Providers" description="Grow your contracting business." ctaLabel="Learn more →" ctaRoute="#"></dlc-persona-card></div>
      </div>`,
  }),
};
