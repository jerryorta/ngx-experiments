import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgAccountCardComponent } from '../ldg-account-card.component';
import { LdgAccountCardStoriesComponent } from './ldg-account-card-stories.component';

const meta: Meta<LdgAccountCardStoriesComponent> = {
  argTypes: {
    balanceCents: { control: 'number' },
    institution: { control: 'text' },
    last4: { control: 'text' },
    name: { control: 'text' },
    selected: { control: 'boolean' },
    type: {
      control: { type: 'select' },
      options: ['checking', 'savings', 'credit', 'investment', 'cash'],
    },
  },
  component: LdgAccountCardStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Account Card',
};

export default meta;
type Story = StoryObj<LdgAccountCardStoriesComponent>;

export const primary: Story = {
  args: {
    balanceCents: 542350,
    institution: 'Chase',
    last4: '4412',
    name: 'Checking',
    selected: false,
    type: 'checking',
  },
  name: 'Account Card',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgAccountCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      account: {
        balanceCents: 542350,
        currency: 'USD',
        id: 'acc-checking',
        institution: 'Chase',
        last4: '4412',
        name: 'Checking',
        type: 'checking',
      },
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-account-card [account]="account"></ldg-account-card>
        </div>
      </div>`,
  }),
};
