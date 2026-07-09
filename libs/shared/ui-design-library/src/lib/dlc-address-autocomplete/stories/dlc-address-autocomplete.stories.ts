import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcAddressAutocompleteComponent } from '../dlc-address-autocomplete.component';
import {
  DlcAddressAutocompleteStoriesComponent,
  STORY_PREDICTIONS,
} from './dlc-address-autocomplete-stories.component';

const meta: Meta<DlcAddressAutocompleteStoriesComponent> = {
  component: DlcAddressAutocompleteStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Address Autocomplete',
};

export default meta;
type Story = StoryObj<DlcAddressAutocompleteStoriesComponent>;

export const primary: Story = {
  name: 'Address Autocomplete',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcAddressAutocompleteComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: { predictions: STORY_PREDICTIONS },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"      style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
        <div class="dlc-professional-light"     style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
        <div class="dlc-home-dark"              style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
        <div class="dlc-home-light"             style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-address-autocomplete [predictions]="predictions" />
        </div>
      </div>`,
  }),
};
