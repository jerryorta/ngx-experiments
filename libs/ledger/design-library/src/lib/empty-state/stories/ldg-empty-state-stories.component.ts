import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import { LdgEmptyStateComponent } from '../ldg-empty-state.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ldg-empty-state-stories',
  },
  imports: [LdgEmptyStateComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-empty-state-stories',
  standalone: true,
  styleUrl: './ldg-empty-state-stories.component.scss',
  templateUrl: './ldg-empty-state-stories.component.html',
})
export class LdgEmptyStateStoriesComponent {
  readonly headingSig: WritableSignal<string> = signal('No transactions yet');
  readonly iconSig: WritableSignal<string> = signal('receipt_long');
  readonly messageSig: WritableSignal<string> = signal(
    'Add your first transaction to get started.',
  );

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/empty-state/stories';

  @Input()
  set heading(v: string) {
    this.headingSig.set(v);
  }

  @Input()
  set icon(v: string) {
    this.iconSig.set(v);
  }

  @Input()
  set message(v: string) {
    this.messageSig.set(v);
  }
}
