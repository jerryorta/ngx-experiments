import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { RotundaDoorway } from '../dlc-rotunda.component';

import { DlcRotundaComponent } from '../dlc-rotunda.component';

/** The five halls every reader has — Material Symbols names. */
export const DLC_ROTUNDA_CORE_HALLS: RotundaDoorway[] = [
  { accent: '#d4a843', icon: 'note', id: 'notes', label: 'Notes' },
  { accent: '#2dd4bf', icon: 'quiz', id: 'quizzes', label: 'Quiz' },
  { accent: '#a78bfa', icon: 'group', id: 'study-groups', label: 'Groups' },
  { accent: '#60a5fa', icon: 'school', id: 'classrooms', label: 'Class' },
  { accent: '#d4a843', icon: 'book', id: 'journal', label: 'Journal' },
];

/** The core five plus three gated halls — the widest bloom the fan is asked for. */
export const DLC_ROTUNDA_ALL_HALLS: RotundaDoorway[] = [
  ...DLC_ROTUNDA_CORE_HALLS,
  { accent: '#4ade80', icon: 'work', id: 'projects', label: 'Projects' },
  { accent: '#fb923c', icon: 'search', id: 'investigations', label: 'Inquiry' },
  { accent: '#f87171', icon: 'science', id: 'research', label: 'Research' },
];

/** The alternate serif-monogram treatment the input still supports. */
export const DLC_ROTUNDA_MONOGRAM_HALLS: RotundaDoorway[] = [
  { accent: '#d4a843', id: 'notes', label: 'Notes', monogram: 'N' },
  { accent: '#2dd4bf', id: 'quizzes', label: 'Quiz', monogram: 'Q' },
  { accent: '#a78bfa', id: 'study-groups', label: 'Groups', monogram: 'G' },
  { accent: '#60a5fa', id: 'classrooms', label: 'Class', monogram: 'C' },
  { accent: '#d4a843', id: 'journal', label: 'Journal', monogram: 'J' },
];

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
    'libs/shared/ui-design-library/src/lib/dlc-rotunda/stories';

  /** Names what the single frame is showing, so the hall count is stated as well as drawn. */
  readonly heading = computed(() => {
    const count = this.doorways().length;
    const halls = `${count} ${count === 1 ? 'hall' : 'halls'}`;

    if (this.coachMark() && !this.open()) {
      return `First run — the oculus teaches its own gesture (${halls})`;
    }

    return this.open()
      ? `Bloomed — ${halls} (controlled by Storybook args)`
      : `Closed — the resting oculus (${halls}, tap to bloom)`;
  });
}
