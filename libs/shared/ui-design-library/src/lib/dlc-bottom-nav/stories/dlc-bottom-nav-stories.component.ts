import {
  Component,
  input,
  linkedSignal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcNavItem } from '../dlc-bottom-nav.component';

import { DlcBottomNavComponent } from '../dlc-bottom-nav.component';

/** Demo navigation — Home, Calendar, Care, Messages, Profile. */
export const DLC_DEMO_NAV_ITEMS: DlcNavItem[] = [
  { icon: 'home', id: 'home', label: 'Home' },
  { icon: 'calendar_month', id: 'calendar', label: 'Calendar' },
  { icon: 'favorite', id: 'care', label: 'Care' },
  { icon: 'chat_bubble', id: 'messages', label: 'Messages' },
  { icon: 'person', id: 'profile', label: 'Profile' },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-bottom-nav-stories' },
  imports: [DlcBottomNavComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-bottom-nav-stories',
  standalone: true,
  styleUrl: './dlc-bottom-nav-stories.component.scss',
  templateUrl: './dlc-bottom-nav-stories.component.html',
})
export class DlcBottomNavStoriesComponent {
  /** The Storybook control; a tap in the interactive frame overrides it until the control changes again. */
  readonly activeId = input('home');
  readonly items: DlcNavItem[] = DLC_DEMO_NAV_ITEMS;

  /** Writable local selection that snaps back to the control's value whenever the control changes. */
  readonly selectedId = linkedSignal(() => this.activeId());

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/ui-design-library/src/lib/dlc-bottom-nav/stories';

  onItemSelect(item: DlcNavItem): void {
    this.selectedId.set(item.id);
  }
}
