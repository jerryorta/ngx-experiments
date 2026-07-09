import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcPropertyPreviewCardComponent } from '../dlc-property-preview-card.component';
import { DlcPropertyPreviewCardStoriesComponent } from './dlc-property-preview-card-stories.component';

const meta: Meta<DlcPropertyPreviewCardStoriesComponent> = {
  component: DlcPropertyPreviewCardStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Property Preview Card',
};

export default meta;
type Story = StoryObj<DlcPropertyPreviewCardStoriesComponent>;

export const primary: Story = {
  name: 'Property Preview Card',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcPropertyPreviewCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      property: {
        addressLine1: '4821 Elmwood Terrace',
        addressLine2: 'Austin, TX 78745',
        baths: 3,
        beds: 4,
        id: 'mls-501',
        photoUrl: 'https://placehold.co/640x360/1f2937/e5e7eb?text=Front+Elevation',
        price: 875000,
        sqft: 2640,
      },
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-property-preview-card [property]="property" />
        </div>
      </div>`,
  }),
};
