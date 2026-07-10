import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FormsModule } from '@angular/forms';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgAmountInputComponent } from '../ldg-amount-input.component';
import { LdgAmountInputStoriesComponent } from './ldg-amount-input-stories.component';

const meta: Meta<LdgAmountInputStoriesComponent> = {
  argTypes: {
    allowNegative: { control: 'boolean' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
  },
  component: LdgAmountInputStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Amount Input',
};

export default meta;
type Story = StoryObj<LdgAmountInputStoriesComponent>;

export const primary: Story = {
  args: {
    allowNegative: false,
    label: 'Amount',
    placeholder: '0.00',
  },
  name: 'Amount Input',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [FormsModule, LdgAmountInputComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Professional Dark" [ngModel]="1999"></ldg-amount-input>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Professional Light" [ngModel]="1999"></ldg-amount-input>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Home Dark" [ngModel]="1999"></ldg-amount-input>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Home Light" [ngModel]="1999"></ldg-amount-input>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Service Provider Dark" [ngModel]="1999"></ldg-amount-input>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-amount-input label="Service Provider Light" [ngModel]="1999"></ldg-amount-input>
        </div>
      </div>`,
  }),
};
