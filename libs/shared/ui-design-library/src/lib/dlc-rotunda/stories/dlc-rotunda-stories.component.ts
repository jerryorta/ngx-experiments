import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { RotundaDoorway } from '../dlc-rotunda.component';

import { DlcRotundaComponent } from '../dlc-rotunda.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-rotunda-stories' },
  imports: [DlcRotundaComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-rotunda-stories',
  standalone: true,
  templateUrl: './dlc-rotunda-stories.component.html',
})
export class DlcRotundaStoriesComponent {
  readonly coachMark = input<boolean>(false);
  readonly doorways = input<RotundaDoorway[]>([]);
  readonly open = input<boolean>(false);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/cognition/design-library/src/lib/dlc-rotunda/stories';

  /** The five halls every reader has — Material Symbols names. */
  readonly coreHalls: RotundaDoorway[] = [
    { accent: '#d4a843', icon: 'note', id: 'notes', label: 'Notes' },
    { accent: '#2dd4bf', icon: 'quiz', id: 'quizzes', label: 'Quiz' },
    {
      accent: '#a78bfa',
      icon: 'group',
      id: 'study-groups',
      label: 'Groups',
    },
    {
      accent: '#60a5fa',
      icon: 'school',
      id: 'classrooms',
      label: 'Class',
    },
    { accent: '#d4a843', icon: 'book', id: 'journal', label: 'Journal' },
  ];

  /** The core five plus the three gated halls — the widest bloom the app can ask for. */
  readonly allHalls: RotundaDoorway[] = [
    ...this.coreHalls,
    {
      accent: '#4ade80',
      icon: 'work',
      id: 'projects',
      label: 'Projects',
    },
    {
      accent: '#fb923c',
      icon: 'search',
      id: 'investigations',
      label: 'Inquiry',
    },
    {
      accent: '#f87171',
      icon: 'science',
      id: 'research',
      label: 'Research',
    },
  ];

  /** The alternate serif-monogram treatment the input still supports. */
  readonly monogramHalls: RotundaDoorway[] = [
    { accent: '#d4a843', id: 'notes', label: 'Notes', monogram: 'N' },
    { accent: '#2dd4bf', id: 'quizzes', label: 'Quiz', monogram: 'Q' },
    { accent: '#a78bfa', id: 'study-groups', label: 'Groups', monogram: 'G' },
    { accent: '#60a5fa', id: 'classrooms', label: 'Class', monogram: 'C' },
    { accent: '#d4a843', id: 'journal', label: 'Journal', monogram: 'J' },
  ];
}
