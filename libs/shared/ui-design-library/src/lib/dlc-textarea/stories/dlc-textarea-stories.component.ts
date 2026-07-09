import { Component, Input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcTextareaComponent } from '../dlc-textarea.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-textarea-stories' },
  imports: [DlcTextareaComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-textarea-stories',
  standalone: true,
  styleUrl: './dlc-textarea-stories.component.scss',
  templateUrl: './dlc-textarea-stories.component.html',
})
export class DlcTextareaStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-textarea/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input() label = 'Label';
  @Input() placeholder = 'Placeholder text';
  @Input() helperText: null | string = null;
  @Input() errorText: null | string = null;
  @Input() rows = 4;
  @Input() disabled = false;
}
