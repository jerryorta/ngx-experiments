import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { LdgIconButtonVariant } from '../ldg-icon-button.component';

import { LdgIconButtonComponent } from '../ldg-icon-button.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ldg-icon-button-stories',
  },
  imports: [LdgIconButtonComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-icon-button-stories',
  standalone: true,
  styleUrl: './ldg-icon-button-stories.component.scss',
  templateUrl: './ldg-icon-button-stories.component.html',
})
export class LdgIconButtonStoriesComponent {
  readonly ariaLabelSig: WritableSignal<string> = signal('Delete transaction');
  readonly disabledSig: WritableSignal<boolean> = signal(false);
  readonly iconSig: WritableSignal<string> = signal('delete');
  readonly variantSig: WritableSignal<LdgIconButtonVariant> = signal('ghost');

  lastPressed = '';

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/icon-button/stories';

  @Input()
  set ariaLabel(v: string) {
    this.ariaLabelSig.set(v);
  }

  @Input()
  set disabled(v: boolean) {
    this.disabledSig.set(v);
  }

  @Input()
  set icon(v: string) {
    this.iconSig.set(v);
  }

  @Input()
  set variant(v: LdgIconButtonVariant) {
    this.variantSig.set(v);
  }

  onPressed(label: string): void {
    this.lastPressed = label;
  }
}
