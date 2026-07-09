import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcToggleComponent } from '../dlc-toggle.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-toggle-stories' },
  imports: [DlcToggleComponent, FormsModule, NgeStorybookReviewContainerComponent],
  selector: 'dlc-toggle-stories',
  standalone: true,
  styleUrl: './dlc-toggle-stories.component.scss',
  templateUrl: './dlc-toggle-stories.component.html',
})
export class DlcToggleStoriesComponent {
  readonly checkedSig: WritableSignal<boolean> = signal(false);
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-toggle/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/18054905358317064309';

  @Input() set checked(v: boolean) {
    this.checkedSig.set(v);
  }
}
