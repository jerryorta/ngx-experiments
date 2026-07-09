import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcFilterPopoverComponent } from '../dlc-filter-popover.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-filter-popover-stories',
  },
  imports: [DlcFilterPopoverComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-filter-popover-stories',
  standalone: true,
  styleUrl: './dlc-filter-popover-stories.component.scss',
  templateUrl: './dlc-filter-popover-stories.component.html',
})
export class DlcFilterPopoverStoriesComponent {
  readonly activeSig: WritableSignal<boolean> = signal(false);
  readonly clearableSig: WritableSignal<boolean> = signal(true);
  readonly labelSig: WritableSignal<string> = signal('Beds');
  readonly valueLabelSig: WritableSignal<string> = signal('');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-filter-popover/stories';

  @Input()
  set active(v: boolean) {
    this.activeSig.set(v);
  }

  @Input()
  set clearable(v: boolean) {
    this.clearableSig.set(v);
  }

  @Input()
  set label(v: string) {
    this.labelSig.set(v);
  }

  @Input()
  set valueLabel(v: string) {
    this.valueLabelSig.set(v);
  }
}
