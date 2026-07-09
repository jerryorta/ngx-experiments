import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcCheckboxComponent } from '../dlc-checkbox.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-checkbox-stories' },
  imports: [DlcCheckboxComponent, FormsModule, NgeStorybookReviewContainerComponent],
  selector: 'dlc-checkbox-stories',
  standalone: true,
  styleUrl: './dlc-checkbox-stories.component.scss',
  templateUrl: './dlc-checkbox-stories.component.html',
})
export class DlcCheckboxStoriesComponent {
  readonly checkedSig: WritableSignal<boolean> = signal(false);
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-checkbox/stories';

  @Input() set checked(v: boolean) {
    this.checkedSig.set(v);
  }
}
