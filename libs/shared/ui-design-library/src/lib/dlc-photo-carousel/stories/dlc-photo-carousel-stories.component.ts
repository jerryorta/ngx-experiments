import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcPhotoCarouselComponent } from '../dlc-photo-carousel.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-photo-carousel-stories',
  },
  imports: [DlcPhotoCarouselComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-photo-carousel-stories',
  standalone: true,
  styleUrl: './dlc-photo-carousel-stories.component.scss',
  templateUrl: './dlc-photo-carousel-stories.component.html',
})
export class DlcPhotoCarouselStoriesComponent {
  /** REX-497 — multi-photo carousel sample (hover the image for prev/next, click to open the lightbox). */
  enrichedPhotoUrls = [
    'https://placehold.co/1280x720/1f2937/e5e7eb?text=Front+Elevation',
    'https://placehold.co/1280x720/374151/e5e7eb?text=Living+Room',
    'https://placehold.co/1280x720/4b5563/e5e7eb?text=Kitchen',
    'https://placehold.co/1280x720/6b7280/e5e7eb?text=Backyard',
    'https://placehold.co/1280x720/9ca3af/111827?text=Master+Bedroom',
  ];
  reviewStatus = REVIEW_STATUS.DRAFT;
  /** REX-497 — single-photo sample: no carousel controls should render. */
  singlePhotoUrl = ['https://placehold.co/1280x720/1f2937/e5e7eb?text=Condo'];
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-photo-carousel/stories';
  uxUrl = 'https://gigasoftware.atlassian.net/browse/REX-497';
}
