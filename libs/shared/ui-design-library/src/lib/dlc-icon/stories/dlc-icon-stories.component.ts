import { Component, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import { DlcIconDirective } from '../dlc-icon.directive';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-icon-stories' },
  imports: [DlcIconDirective, NgeStorybookReviewContainerComponent],
  selector: 'dlc-icon-stories',
  standalone: true,
  styleUrl: './dlc-icon-stories.component.scss',
  templateUrl: './dlc-icon-stories.component.html',
})
export class DlcIconStoriesComponent {
  readonly icon = input<string>('home');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-icon/stories';

  readonly sizes = [
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
  ];

  readonly commonIcons = [
    'home',
    'visibility',
    'settings',
    'notifications',
    'person',
    'search',
    'add',
    'close',
    'check',
    'chevron_right',
    'arrow_forward',
    'edit',
    'delete',
    'chat_bubble',
    'call',
    'send',
    'receipt',
    'photo',
    'payments',
    'trending_up',
    'auto_graph',
    'assignment',
    'apartment',
    'event',
  ];
}
