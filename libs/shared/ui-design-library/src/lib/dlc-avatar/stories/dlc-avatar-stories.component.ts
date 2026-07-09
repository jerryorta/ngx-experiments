import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcAvatarSize, DlcAvatarStatus } from '../dlc-avatar.component';

import { DlcAvatarComponent } from '../dlc-avatar.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-avatar-stories',
  },
  imports: [DlcAvatarComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-avatar-stories',
  standalone: true,
  styleUrl: './dlc-avatar-stories.component.scss',
  templateUrl: './dlc-avatar-stories.component.html',
})
export class DlcAvatarStoriesComponent {
  readonly imageUrlSig: WritableSignal<null | string> = signal(null);
  readonly initialsSig: WritableSignal<string> = signal('AB');
  readonly sizeSig: WritableSignal<DlcAvatarSize> = signal('md');
  readonly statusSig: WritableSignal<DlcAvatarStatus> = signal(null);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-avatar/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input()
  set imageUrl(v: null | string) {
    this.imageUrlSig.set(v);
  }

  @Input()
  set initials(v: string) {
    this.initialsSig.set(v);
  }

  @Input()
  set size(v: DlcAvatarSize) {
    this.sizeSig.set(v);
  }

  @Input()
  set status(v: DlcAvatarStatus) {
    this.statusSig.set(v);
  }
}
