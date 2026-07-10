import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcSelectOption } from '../dlc-select.component';

import { DlcSelectComponent } from '../dlc-select.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-select-stories' },
  imports: [DlcSelectComponent, FormsModule, NgeStorybookReviewContainerComponent],
  selector: 'dlc-select-stories',
  standalone: true,
  styleUrl: './dlc-select-stories.component.scss',
  templateUrl: './dlc-select-stories.component.html',
})
export class DlcSelectStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-select/stories';
  uxUrl = '';

  selectedActionStatus: null | string = 'follow-up-needed';
  selectedRole: null | string = null;

  readonly actionStatusOptions: DlcSelectOption[] = [
    { label: 'Power — Must-Do Today', value: 'power' },
    { label: 'Follow-Up Needed', value: 'follow-up-needed' },
    { label: 'Pending Call', value: 'pending-call' },
    { label: 'Waiting for Info', value: 'waiting-for-info' },
    { label: 'Active Negotiation', value: 'active-negotiation' },
    { label: 'Pending Documents', value: 'pending-documents' },
    { label: 'Signal — Growth Opportunity', value: 'signal' },
  ];

  readonly roleOptions: DlcSelectOption[] = [
    { label: 'Buyer', value: 'buyer' },
    { label: 'Seller', value: 'seller' },
    { label: 'Investor', value: 'investor' },
    { label: 'Pre-Approved Buyer', value: 'pre-approved' },
  ];

  // A longer list (~2x the others) so the panel exceeds its 280px max-height
  // and scrolls (~7 of 14 visible at a time). Pre-selected to a mid-list value.
  selectedMarket: null | string = 'lubbock';

  readonly marketOptions: DlcSelectOption[] = [
    { label: 'Austin, TX', value: 'austin' },
    { label: 'Dallas, TX', value: 'dallas' },
    { label: 'Houston, TX', value: 'houston' },
    { label: 'San Antonio, TX', value: 'san-antonio' },
    { label: 'Fort Worth, TX', value: 'fort-worth' },
    { label: 'El Paso, TX', value: 'el-paso' },
    { label: 'Arlington, TX', value: 'arlington' },
    { label: 'Corpus Christi, TX', value: 'corpus-christi' },
    { label: 'Plano, TX', value: 'plano' },
    { label: 'Laredo, TX', value: 'laredo' },
    { label: 'Lubbock, TX', value: 'lubbock' },
    { label: 'Garland, TX', value: 'garland' },
    { label: 'Irving, TX', value: 'irving' },
    { label: 'Frisco, TX', value: 'frisco' },
  ];
}
