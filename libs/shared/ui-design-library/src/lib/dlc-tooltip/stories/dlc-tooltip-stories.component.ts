import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcTooltipDirective } from '../dlc-tooltip.directive';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-tooltip-stories',
  },
  imports: [DlcTooltipDirective, NgeStorybookReviewContainerComponent],
  selector: 'dlc-tooltip-stories',
  standalone: true,
  styleUrl: './dlc-tooltip-stories.component.scss',
  templateUrl: './dlc-tooltip-stories.component.html',
})
export class DlcTooltipStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-tooltip/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';
}
