import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcSortDirection, DlcSortField, DlcSortSelection } from '../dlc-sort-control.component';

import { DlcSortControlComponent } from '../dlc-sort-control.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sort-control-stories' },
  imports: [DlcSortControlComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-sort-control-stories',
  standalone: true,
  styleUrl: './dlc-sort-control-stories.component.scss',
  templateUrl: './dlc-sort-control-stories.component.html',
})
export class DlcSortControlStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-sort-control/stories';

  /** Live value backing the interactive instance — fed by its emissions. */
  readonly interactiveDirection = signal<DlcSortDirection>('asc');
  readonly interactiveField = signal<DlcSortField | null>(null);

  onInteractiveSortChange(sort: DlcSortSelection): void {
    this.interactiveDirection.set(sort.direction);
    this.interactiveField.set(sort.field);
  }
}
