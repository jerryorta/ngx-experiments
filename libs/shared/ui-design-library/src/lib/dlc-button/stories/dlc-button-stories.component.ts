import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcButtonSize, DlcButtonVariant } from '../dlc-button.component';

import { DlcButtonComponent } from '../dlc-button.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-button-stories',
  },
  imports: [DlcButtonComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-button-stories',
  standalone: true,
  styleUrl: './dlc-button-stories.component.scss',
  templateUrl: './dlc-button-stories.component.html',
})
export class DlcButtonStoriesComponent {
  readonly disabledSig: WritableSignal<boolean> = signal(false);
  readonly loadingSig: WritableSignal<boolean> = signal(false);
  readonly sizeSig: WritableSignal<DlcButtonSize> = signal('md');
  readonly variantSig: WritableSignal<DlcButtonVariant> = signal('primary');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-button/stories';

  @Input()
  set disabled(v: boolean) {
    this.disabledSig.set(v);
  }

  @Input()
  set loading(v: boolean) {
    this.loadingSig.set(v);
  }

  @Input()
  set size(v: DlcButtonSize) {
    this.sizeSig.set(v);
  }

  @Input()
  set variant(v: DlcButtonVariant) {
    this.variantSig.set(v);
  }
}
