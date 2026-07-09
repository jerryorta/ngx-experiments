import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcPropertyPreviewCardData } from '../dlc-property-preview-card.model';

import { DlcPropertyPreviewCardComponent } from '../dlc-property-preview-card.component';

/** REX-509 — fully-populated fixture (photo + both address lines + all specs). */
export const STORY_PROPERTY_WITH_PHOTO: DlcPropertyPreviewCardData = {
  addressLine1: '4821 Elmwood Terrace',
  addressLine2: 'Austin, TX 78745',
  baths: 3,
  beds: 4,
  id: 'mls-501',
  photoUrl: 'https://placehold.co/640x360/1f2937/e5e7eb?text=Front+Elevation',
  price: 875000,
  sqft: 2640,
};

/** REX-509 — no-photo fixture: the graceful fallback should render. */
export const STORY_PROPERTY_NO_PHOTO: DlcPropertyPreviewCardData = {
  addressLine1: '900 Congress Ave #12',
  addressLine2: 'Austin, TX 78701',
  baths: 2,
  beds: 2,
  id: 'mls-502',
  photoUrl: null,
  price: 910000,
  sqft: 1450,
};

/** REX-509 — sparse fixture: no specs, single address line. */
export const STORY_PROPERTY_SPARSE: DlcPropertyPreviewCardData = {
  addressLine1: '321 Maple Drive, Walnut Creek, CA',
  baths: null,
  beds: null,
  id: 'mls-503',
  photoUrl: 'https://placehold.co/640x360/374151/e5e7eb?text=Bungalow',
  price: 620000,
  sqft: null,
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-property-preview-card-stories' },
  imports: [DlcPropertyPreviewCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-property-preview-card-stories',
  standalone: true,
  styleUrl: './dlc-property-preview-card-stories.component.scss',
  templateUrl: './dlc-property-preview-card-stories.component.html',
})
export class DlcPropertyPreviewCardStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-property-preview-card/stories';

  readonly noPhotoProperty = STORY_PROPERTY_NO_PHOTO;
  readonly sparseProperty = STORY_PROPERTY_SPARSE;
  readonly withPhotoProperty = STORY_PROPERTY_WITH_PHOTO;

  /** Intent log — proves the leaf emits, since the overlay host is REX-507. */
  readonly lastIntent = signal('none yet');

  onClosed(id: string): void {
    this.lastIntent.set(`closed (${id})`);
  }

  onSeeDetails(id: string): void {
    this.lastIntent.set(`seeDetails → ${id}`);
  }
}
