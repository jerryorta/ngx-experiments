import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import { LdgPageContentComponent } from '../ldg-page-content.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ldg-page-content-stories',
  },
  imports: [LdgPageContentComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-page-content-stories',
  standalone: true,
  styleUrl: './ldg-page-content-stories.component.scss',
  templateUrl: './ldg-page-content-stories.component.html',
})
export class LdgPageContentStoriesComponent {
  readonly paddedSig: WritableSignal<boolean> = signal(true);
  readonly rows = Array.from({ length: 12 }, (_, i) => i + 1);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/page-content/stories';

  @Input()
  set padded(v: boolean) {
    this.paddedSig.set(v);
  }
}
