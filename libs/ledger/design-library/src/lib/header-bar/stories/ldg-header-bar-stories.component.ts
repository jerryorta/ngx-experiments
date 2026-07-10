import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';
import { DlcIconDirective } from '@nge/ui-design-library';

import { LdgHeaderBarComponent } from '../ldg-header-bar.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ldg-header-bar-stories',
  },
  imports: [DlcIconDirective, LdgHeaderBarComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-header-bar-stories',
  standalone: true,
  styleUrl: './ldg-header-bar-stories.component.scss',
  templateUrl: './ldg-header-bar-stories.component.html',
})
export class LdgHeaderBarStoriesComponent {
  readonly subtitleSig: WritableSignal<string> = signal('July 2026');
  readonly titleSig: WritableSignal<string> = signal('Accounts');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/header-bar/stories';

  @Input()
  set subtitle(v: string) {
    this.subtitleSig.set(v);
  }

  @Input()
  set title(v: string) {
    this.titleSig.set(v);
  }
}
