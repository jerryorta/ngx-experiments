import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcSearchInputComponent } from '../dlc-search-input.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-search-input-stories' },
  imports: [DlcSearchInputComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-search-input-stories',
  standalone: true,
  styleUrl: './dlc-search-input-stories.component.scss',
  templateUrl: './dlc-search-input-stories.component.html',
})
export class DlcSearchInputStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-search-input/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/6628093603516859183';
}
