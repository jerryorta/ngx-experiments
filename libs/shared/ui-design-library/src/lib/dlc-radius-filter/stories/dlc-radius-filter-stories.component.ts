import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcSearchAreaMode } from '../dlc-radius-filter.component';

import { DlcRadiusFilterComponent } from '../dlc-radius-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-radius-filter-stories' },
  imports: [DlcRadiusFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-radius-filter-stories',
  standalone: true,
  styleUrl: './dlc-radius-filter-stories.component.scss',
  templateUrl: './dlc-radius-filter-stories.component.html',
})
export class DlcRadiusFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-radius-filter/stories';

  /** Live values backing the interactive instance — fed by its emissions. */
  readonly interactiveMode = signal<DlcSearchAreaMode>(null);
  readonly interactiveMiles = signal<null | number>(null);

  onInteractiveModeChange(mode: DlcSearchAreaMode): void {
    this.interactiveMode.set(mode);
  }

  onInteractiveMilesChange(miles: number): void {
    this.interactiveMiles.set(miles);
  }
}
