import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcStatusFilterComponent } from '../dlc-status-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-status-filter-stories' },
  imports: [DlcStatusFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-status-filter-stories',
  standalone: true,
  styleUrl: './dlc-status-filter-stories.component.scss',
  templateUrl: './dlc-status-filter-stories.component.html',
})
export class DlcStatusFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-status-filter/stories';

  /** Live selection backing the interactive instance — fed by its emissions. */
  readonly interactiveSelection = signal<string[]>(['Active', 'Pending']);

  onInteractiveSelectionChange(selection: string[]): void {
    this.interactiveSelection.set(selection);
  }
}
