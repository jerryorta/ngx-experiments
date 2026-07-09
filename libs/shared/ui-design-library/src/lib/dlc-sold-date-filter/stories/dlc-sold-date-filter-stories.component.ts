import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcSoldDateRange } from '../dlc-sold-date-filter.component';

import { DlcSoldDateFilterComponent } from '../dlc-sold-date-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sold-date-filter-stories' },
  imports: [DlcSoldDateFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-sold-date-filter-stories',
  standalone: true,
  styleUrl: './dlc-sold-date-filter-stories.component.scss',
  templateUrl: './dlc-sold-date-filter-stories.component.html',
})
export class DlcSoldDateFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-sold-date-filter/stories';

  /** Live value backing the interactive instance — fed by its emissions. */
  readonly interactiveMax = signal<null | string>(null);
  readonly interactiveMin = signal<null | string>(null);

  onInteractiveRangeChange(range: DlcSoldDateRange): void {
    this.interactiveMax.set(range.maxDate);
    this.interactiveMin.set(range.minDate);
  }
}
