import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcStarRating } from '../../dlc-star-rating/dlc-star-rating.component';

import { DlcRatingsFilterComponent } from '../dlc-ratings-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-ratings-filter-stories' },
  imports: [DlcRatingsFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-ratings-filter-stories',
  standalone: true,
  styleUrl: './dlc-ratings-filter-stories.component.scss',
  templateUrl: './dlc-ratings-filter-stories.component.html',
})
export class DlcRatingsFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-ratings-filter/stories';

  /** Live selection backing the interactive instance — fed by its emissions. */
  readonly interactiveSelected = signal<DlcStarRating[]>([]);

  /** Realistic per-bucket counts for the interactive + populated stories. */
  readonly interactiveCounts: Partial<Record<DlcStarRating, number>> = {
    1: 1,
    2: 3,
    3: 7,
    4: 12,
    5: 4,
  };

  /** Sparse counts story — only the 5★ bucket carries a value. */
  readonly sparseCounts: Partial<Record<DlcStarRating, number>> = { 5: 2 };

  onInteractiveSelectedChange(next: DlcStarRating[]): void {
    this.interactiveSelected.set(next);
  }
}
