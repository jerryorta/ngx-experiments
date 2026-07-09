import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcFavoritesFilterComponent } from '../dlc-favorites-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-favorites-filter-stories' },
  imports: [DlcFavoritesFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-favorites-filter-stories',
  standalone: true,
  styleUrl: './dlc-favorites-filter-stories.component.scss',
  templateUrl: './dlc-favorites-filter-stories.component.html',
})
export class DlcFavoritesFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-favorites-filter/stories';

  /** Live toggle state backing the interactive instance — fed by its emissions. */
  readonly interactiveEnabled = signal(false);

  onInteractiveEnabledChange(enabled: boolean): void {
    this.interactiveEnabled.set(enabled);
  }
}
