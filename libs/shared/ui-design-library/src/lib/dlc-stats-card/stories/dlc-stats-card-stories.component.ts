import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcStatsCardComponent } from '../dlc-stats-card.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-stats-card-stories',
  },
  imports: [DlcStatsCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-stats-card-stories',
  standalone: true,
  styleUrl: './dlc-stats-card-stories.component.scss',
  templateUrl: './dlc-stats-card-stories.component.html',
})
export class DlcStatsCardStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-stats-card/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';
}
