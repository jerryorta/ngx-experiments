import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

interface TokenSwatch {
  label: string;
  token: string;
  value: string;
}

interface CalendarView {
  name: string;
  story: string;
}

/**
 * Overview / smoke story for the shared calendar library.
 *
 * It renders the token swatches rather than a calendar, on purpose: this is the
 * page that shows the `--nge-calendar-*` → literal theming bridge in isolation,
 * swapping live with the theme toolbar, with no view's layout in the way. The
 * running calendars live in the per-view story sets
 * (`nge-calendar/stories/<view>/{usage,theming,interaction}/`), which are
 * authored on this same harness.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'calendar-overview-stories',
  },
  imports: [NgeStorybookReviewContainerComponent],
  selector: 'nge-calendar-overview-stories',
  standalone: true,
  styleUrl: './calendar-overview-stories.component.scss',
  templateUrl: './calendar-overview-stories.component.html',
})
export class CalendarOverviewStoriesComponent {
  readonly reviewStatus = REVIEW_STATUS.DRAFT;
  readonly storybookFilePath = 'libs/shared/calendar/src/lib/nge-calendar/stories/overview';

  /**
   * Core tokens previewed in the swatch grid. Each `value` is the same chained
   * fallback the views use, so a swatch renders un-themed and upgrades live under
   * a host theme. The full contract is this library's `theme/`.
   */
  readonly tokenSwatches: readonly TokenSwatch[] = [
    {
      label: 'Surface',
      token: '--nge-calendar-surface',
      value: 'var(--nge-calendar-surface, #ffffff)',
    },
    {
      label: 'Surface container',
      token: '--nge-calendar-surface-container',
      value: 'var(--nge-calendar-surface-container, #f1f1f1)',
    },
    {
      label: 'Accent',
      token: '--nge-calendar-accent',
      value: 'var(--nge-calendar-accent, #2563eb)',
    },
    {
      label: 'On surface',
      token: '--nge-calendar-on-surface',
      value: 'var(--nge-calendar-on-surface, #1a1a1a)',
    },
    {
      label: 'Outline',
      token: '--nge-calendar-outline',
      value: 'var(--nge-calendar-outline, #79747e)',
    },
  ];

  /**
   * The four views the shell hosts, each chip naming where that view's stories
   * sit in the Storybook sidebar so a reader can go straight to a running one.
   */
  readonly views: readonly CalendarView[] = [
    { name: 'Month', story: 'Views / Month' },
    { name: 'Week', story: 'Views / Week' },
    { name: 'Day', story: 'Views / Day' },
    { name: 'Year', story: 'Views / Year' },
  ];
}
