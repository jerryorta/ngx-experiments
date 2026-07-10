import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgIconButtonComponent } from '../ldg-icon-button.component';
import { LdgIconButtonStoriesComponent } from './ldg-icon-button-stories.component';

const meta: Meta<LdgIconButtonStoriesComponent> = {
  argTypes: {
    ariaLabel: { control: 'text' },
    disabled: { control: 'boolean' },
    icon: { control: 'text' },
    variant: {
      control: { type: 'select' },
      options: ['ghost', 'solid'],
    },
  },
  component: LdgIconButtonStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Icon Button',
};

export default meta;
type Story = StoryObj<LdgIconButtonStoriesComponent>;

export const primary: Story = {
  args: {
    ariaLabel: 'Delete transaction',
    disabled: false,
    icon: 'delete',
    variant: 'ghost',
  },
  name: 'Icon Button',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgIconButtonComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <ldg-icon-button icon="delete" ariaLabel="Delete" variant="ghost"></ldg-icon-button>
          <ldg-icon-button icon="add" ariaLabel="Add" variant="solid"></ldg-icon-button>
        </div>
      </div>`,
  }),
};
