import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcLotSizeRange, DlcLotSizeUnit } from '../dlc-lot-size-filter.component';

import { DlcLotSizeFilterComponent } from '../dlc-lot-size-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-lot-size-filter-stories' },
  imports: [DlcLotSizeFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-lot-size-filter-stories',
  standalone: true,
  styleUrl: './dlc-lot-size-filter-stories.component.scss',
  templateUrl: './dlc-lot-size-filter-stories.component.html',
})
export class DlcLotSizeFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-lot-size-filter/stories';

  /** Live values backing the interactive instance — fed by its emissions. */
  readonly interactiveMax = signal<null | number>(null);
  readonly interactiveMin = signal<null | number>(null);
  readonly interactiveUnit = signal<DlcLotSizeUnit>('sqft');

  onInteractiveRangeChange(range: DlcLotSizeRange): void {
    this.interactiveMax.set(range.max);
    this.interactiveMin.set(range.min);
  }

  onInteractiveUnitChange(unit: DlcLotSizeUnit): void {
    this.interactiveUnit.set(unit);
  }
}
