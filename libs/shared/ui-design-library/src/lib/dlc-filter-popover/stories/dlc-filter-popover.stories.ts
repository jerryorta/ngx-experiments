import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcFilterPopoverComponent } from '../dlc-filter-popover.component';
import { DlcFilterPopoverStoriesComponent } from './dlc-filter-popover-stories.component';

const meta: Meta<DlcFilterPopoverStoriesComponent> = {
  argTypes: {
    active: { control: 'boolean' },
    clearable: { control: 'boolean' },
    label: { control: 'text' },
    valueLabel: { control: 'text' },
  },
  component: DlcFilterPopoverStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Filter Popover',
};

export default meta;
type Story = StoryObj<DlcFilterPopoverStoriesComponent>;

export const primary: Story = {
  args: {
    active: false,
    clearable: true,
    label: 'Beds',
    valueLabel: '',
  },
  name: 'Filter Popover',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcFilterPopoverComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Status" valueLabel="Active" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Status" valueLabel="Active" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Type" valueLabel="Residential" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.75rem">
          <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
          <dlc-filter-popover label="Type" valueLabel="Residential" [active]="true"><span>body</span></dlc-filter-popover>
        </div>
      </div>`,
  }),
};
