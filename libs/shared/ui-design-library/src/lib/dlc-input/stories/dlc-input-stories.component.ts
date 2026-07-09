import { Component, Input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcInputType } from '../dlc-input.component';

import { DlcInputComponent } from '../dlc-input.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-input-stories' },
  imports: [DlcInputComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-input-stories',
  standalone: true,
  styleUrl: './dlc-input-stories.component.scss',
  templateUrl: './dlc-input-stories.component.html',
})
export class DlcInputStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-input/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input() label = 'Label';
  @Input() placeholder = 'Placeholder text';
  @Input() helperText: null | string = null;
  @Input() errorText: null | string = null;
  @Input() disabled = false;
  @Input() type: DlcInputType = 'text';
}
