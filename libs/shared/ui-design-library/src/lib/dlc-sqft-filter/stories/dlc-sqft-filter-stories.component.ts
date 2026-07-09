import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcSqftRange } from '../dlc-sqft-filter.component';

import { DlcSqftFilterComponent } from '../dlc-sqft-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sqft-filter-stories' },
  imports: [DlcSqftFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-sqft-filter-stories',
  standalone: true,
  styleUrl: './dlc-sqft-filter-stories.component.scss',
  templateUrl: './dlc-sqft-filter-stories.component.html',
})
export class DlcSqftFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-sqft-filter/stories';

  /** Live value backing the interactive instance — fed by its emissions. */
  readonly interactiveMax = signal<null | number>(null);
  readonly interactiveMin = signal<null | number>(null);

  onInteractiveRangeChange(range: DlcSqftRange): void {
    this.interactiveMax.set(range.max);
    this.interactiveMin.set(range.min);
  }
}
