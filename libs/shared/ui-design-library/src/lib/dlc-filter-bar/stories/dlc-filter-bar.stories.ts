import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcFilterPopoverComponent } from '../../dlc-filter-popover/dlc-filter-popover.component';
import { DlcFilterBarComponent } from '../dlc-filter-bar.component';
import { DlcFilterBarStoriesComponent } from './dlc-filter-bar-stories.component';

const meta: Meta<DlcFilterBarStoriesComponent> = {
  component: DlcFilterBarStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Filter Bar',
};

export default meta;
type Story = StoryObj<DlcFilterBarStoriesComponent>;

export const primary: Story = {
  name: 'Filter Bar',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcFilterBarComponent, DlcFilterPopoverComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
        <div class="dlc-professional-light" style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
        <div class="dlc-home-dark"          style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
        <div class="dlc-home-light"         style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
        <div class="dlc-service-provider-light" style="padding:1.5rem;background:var(--dlc-surface)">
          <div style="max-width:360px">
            <dlc-filter-bar>
              <dlc-filter-popover label="Price" valueLabel="$300k–$800k" [active]="true"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Type"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Status"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Beds"><span>body</span></dlc-filter-popover>
              <dlc-filter-popover label="Baths"><span>body</span></dlc-filter-popover>
            </dlc-filter-bar>
          </div>
        </div>
      </div>`,
  }),
};
