import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcPhotoCarouselComponent } from '../dlc-photo-carousel.component';
import { DlcPhotoCarouselStoriesComponent } from './dlc-photo-carousel-stories.component';

const meta: Meta<DlcPhotoCarouselStoriesComponent> = {
  component: DlcPhotoCarouselStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Photo Carousel',
};

export default meta;
type Story = StoryObj<DlcPhotoCarouselStoriesComponent>;

export const primary: Story = {
  name: 'Photo Carousel',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcPhotoCarouselComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="Professional dark" [photos]="['https://placehold.co/1280x720/1f2937/e5e7eb?text=Pro+Dark+1','https://placehold.co/1280x720/374151/e5e7eb?text=Pro+Dark+2']" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="Professional light" [photos]="['https://placehold.co/1280x720/e5e7eb/1f2937?text=Pro+Light+1','https://placehold.co/1280x720/d1d5db/1f2937?text=Pro+Light+2']" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="Home dark" [photos]="['https://placehold.co/1280x720/1f2937/e5e7eb?text=Home+Dark+1','https://placehold.co/1280x720/374151/e5e7eb?text=Home+Dark+2']" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="Home light" [photos]="['https://placehold.co/1280x720/e5e7eb/1f2937?text=Home+Light+1','https://placehold.co/1280x720/d1d5db/1f2937?text=Home+Light+2']" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="SP dark" [photos]="['https://placehold.co/1280x720/1f2937/e5e7eb?text=SP+Dark+1','https://placehold.co/1280x720/374151/e5e7eb?text=SP+Dark+2']" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-photo-carousel altText="SP light" [photos]="['https://placehold.co/1280x720/e5e7eb/1f2937?text=SP+Light+1','https://placehold.co/1280x720/d1d5db/1f2937?text=SP+Light+2']" />
        </div>
      </div>`,
  }),
};
