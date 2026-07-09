import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcProgressBarMode } from '../dlc-progress-bar.component';

import { DlcProgressBarComponent } from '../dlc-progress-bar.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-progress-bar-stories',
  },
  imports: [DlcProgressBarComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-progress-bar-stories',
  standalone: true,
  styleUrl: './dlc-progress-bar-stories.component.scss',
  templateUrl: './dlc-progress-bar-stories.component.html',
})
export class DlcProgressBarStoriesComponent {
  readonly labelSig: WritableSignal<null | string> = signal(null);
  readonly modeSig: WritableSignal<DlcProgressBarMode> = signal('determinate');
  readonly valueSig: WritableSignal<number> = signal(50);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-progress-bar/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input()
  set label(v: null | string) {
    this.labelSig.set(v);
  }

  @Input()
  set mode(v: DlcProgressBarMode) {
    this.modeSig.set(v);
  }

  @Input()
  set value(v: number) {
    this.valueSig.set(v);
  }
}
