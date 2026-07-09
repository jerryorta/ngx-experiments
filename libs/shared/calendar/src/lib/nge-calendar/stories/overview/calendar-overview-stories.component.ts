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

interface UpcomingView {
  name: string;
  story: string;
}

/**
 * Overview / smoke story for the shared calendar library.
 *
 * ARCH-72 (S3b) stands up the Storybook harness EARLY — before the
 * `<nge-calendar>` shell (S5 / ARCH-65) and views (S6+) exist. This story
 * therefore renders a static token-preview placeholder, NOT a real calendar. It:
 *   1. proves the harness composes (a "Calendar" section appears in Storybook),
 *   2. demonstrates the `--nge-calendar-*` → literal theming bridge swapping
 *      live with the theme toolbar, and
 *   3. is the copy-template for the per-view story sets
 *      (`nge-calendar/stories/<view>/{usage,theming,interaction}/`) authored in
 *      S6-S10 on top of this harness.
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
   * Core tokens previewed in the swatch grid. Each `value` is the chained
   * fallback the real components will use, so the swatch renders un-themed and
   * upgrades live under a host theme. The complete token contract ships in S5.
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

  /** Views that land in later ARCH-60 stories — shown as "coming soon" chips. */
  readonly upcomingViews: readonly UpcomingView[] = [
    { name: 'Month', story: 'S6 · ARCH-66' },
    { name: 'Week', story: 'S7 · ARCH-67' },
    { name: 'Day', story: 'S7 · ARCH-67' },
    { name: 'Year', story: 'S8 · ARCH-68' },
  ];
}
