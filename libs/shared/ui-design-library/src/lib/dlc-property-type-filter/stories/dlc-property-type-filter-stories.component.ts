import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcPropertyTypeFilterComponent } from '../dlc-property-type-filter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-property-type-filter-stories' },
  imports: [DlcPropertyTypeFilterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-property-type-filter-stories',
  standalone: true,
  styleUrl: './dlc-property-type-filter-stories.component.scss',
  templateUrl: './dlc-property-type-filter-stories.component.html',
})
export class DlcPropertyTypeFilterStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-property-type-filter/stories';

  /** Live selection backing the interactive instance — fed by its emissions. */
  readonly interactiveSelection = signal<string[]>(['Residential']);

  onInteractiveSelectionChange(selection: string[]): void {
    this.interactiveSelection.set(selection);
  }
}
