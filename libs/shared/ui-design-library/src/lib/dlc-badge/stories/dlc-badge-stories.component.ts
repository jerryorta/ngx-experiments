import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcBadgeVariant } from '../dlc-badge.component';

import { DlcBadgeComponent } from '../dlc-badge.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-badge-stories',
  },
  imports: [DlcBadgeComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-badge-stories',
  standalone: true,
  styleUrl: './dlc-badge-stories.component.scss',
  templateUrl: './dlc-badge-stories.component.html',
})
export class DlcBadgeStoriesComponent {
  readonly countSig: WritableSignal<null | number> = signal(null);
  readonly variantSig: WritableSignal<DlcBadgeVariant> = signal('error');
  readonly visibleSig: WritableSignal<boolean> = signal(true);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-badge/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input()
  set count(v: null | number) {
    this.countSig.set(v);
  }

  @Input()
  set variant(v: DlcBadgeVariant) {
    this.variantSig.set(v);
  }

  @Input()
  set visible(v: boolean) {
    this.visibleSig.set(v);
  }
}
