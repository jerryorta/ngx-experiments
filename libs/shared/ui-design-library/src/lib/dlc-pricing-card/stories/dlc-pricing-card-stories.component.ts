import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcPricingCardComponent } from '../dlc-pricing-card.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-pricing-card-stories' },
  imports: [DlcPricingCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-pricing-card-stories',
  standalone: true,
  styleUrl: './dlc-pricing-card-stories.component.scss',
  templateUrl: './dlc-pricing-card-stories.component.html',
})
export class DlcPricingCardStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-pricing-card/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/926243577450245138';
}
