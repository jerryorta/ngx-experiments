import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcYearBuiltRange } from '../dlc-year-built-filter.component';

import { DlcYearBuiltFilterComponent } from '../dlc-year-built-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-year-built-filter-stories' },
  imports: [DlcYearBuiltFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-year-built-filter-stories',
  standalone: true,
  styleUrl: './dlc-year-built-filter-stories.component.scss',
  templateUrl: './dlc-year-built-filter-stories.component.html',
})
export class DlcYearBuiltFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-year-built-filter/stories';

  /** Live value backing the interactive instance — fed by its emissions. */
  readonly interactiveMax = signal<null | number>(null);
  readonly interactiveMin = signal<null | number>(null);

  onInteractiveRangeChange(range: DlcYearBuiltRange): void {
    this.interactiveMax.set(range.max);
    this.interactiveMin.set(range.min);
  }
}
