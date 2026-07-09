import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcPersonaCardComponent } from '../dlc-persona-card.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-persona-card-stories' },
  imports: [DlcPersonaCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-persona-card-stories',
  standalone: true,
  styleUrl: './dlc-persona-card-stories.component.scss',
  templateUrl: './dlc-persona-card-stories.component.html',
})
export class DlcPersonaCardStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-persona-card/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/926243577450245138';
}
