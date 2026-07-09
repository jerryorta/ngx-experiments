import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcAnalyticsCardComponent } from '../dlc-analytics-card.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-analytics-card-stories' },
  imports: [DlcAnalyticsCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-analytics-card-stories',
  standalone: true,
  styleUrl: './dlc-analytics-card-stories.component.scss',
  templateUrl: './dlc-analytics-card-stories.component.html',
})
export class DlcAnalyticsCardStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-analytics-card/stories';
}
