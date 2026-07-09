import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcNotesFilterComponent } from '../dlc-notes-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-notes-filter-stories' },
  imports: [DlcNotesFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-notes-filter-stories',
  standalone: true,
  styleUrl: './dlc-notes-filter-stories.component.scss',
  templateUrl: './dlc-notes-filter-stories.component.html',
})
export class DlcNotesFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-notes-filter/stories';

  /** Live toggle state backing the interactive instance — fed by its emissions. */
  readonly interactiveEnabled = signal(false);

  onInteractiveEnabledChange(enabled: boolean): void {
    this.interactiveEnabled.set(enabled);
  }
}
