import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcPersonaRole } from '../dlc-role-switcher.component';

import { DlcRoleSwitcherComponent } from '../dlc-role-switcher.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-role-switcher-stories',
  },
  imports: [DlcRoleSwitcherComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-role-switcher-stories',
  standalone: true,
  styleUrl: './dlc-role-switcher-stories.component.scss',
  templateUrl: './dlc-role-switcher-stories.component.html',
})
export class DlcRoleSwitcherStoriesComponent {
  readonly activeRoleSig: WritableSignal<DlcPersonaRole> = signal('professional');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-role-switcher/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  onRoleChange(role: DlcPersonaRole): void {
    this.activeRoleSig.set(role);
  }

  @Input()
  set activeRole(v: DlcPersonaRole) {
    this.activeRoleSig.set(v);
  }
}
