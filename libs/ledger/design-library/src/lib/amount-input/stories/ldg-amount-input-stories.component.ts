import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import { LdgAmountInputComponent } from '../ldg-amount-input.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-amount-input-stories' },
  imports: [FormsModule, LdgAmountInputComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-amount-input-stories',
  standalone: true,
  styleUrl: './ldg-amount-input-stories.component.scss',
  templateUrl: './ldg-amount-input-stories.component.html',
})
export class LdgAmountInputStoriesComponent {
  // Bound via ngModel — exercises the real ControlValueAccessor, not a
  // stand-in `value` input (the component has none; CVA only).
  readonly centsSig: WritableSignal<null | number> = signal(123456);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/amount-input/stories';

  @Input() label = 'Amount';
  @Input() placeholder = '0.00';
  @Input() allowNegative = false;
}
