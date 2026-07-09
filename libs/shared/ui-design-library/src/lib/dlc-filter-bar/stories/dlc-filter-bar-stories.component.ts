import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcFilterPopoverComponent } from '../../dlc-filter-popover/dlc-filter-popover.component';
import { DlcFilterBarComponent } from '../dlc-filter-bar.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-filter-bar-stories',
  },
  imports: [DlcFilterBarComponent, DlcFilterPopoverComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-filter-bar-stories',
  standalone: true,
  styleUrl: './dlc-filter-bar-stories.component.scss',
  templateUrl: './dlc-filter-bar-stories.component.html',
})
export class DlcFilterBarStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-filter-bar/stories';
}
