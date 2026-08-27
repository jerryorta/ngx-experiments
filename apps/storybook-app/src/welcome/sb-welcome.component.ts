import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/** One library on the welcome page. */
interface WelcomeLibrary {
  /** What it is, in one sentence. */
  blurb: string;
  name: string;
  /** The story a first-time visitor should open, as a Storybook story id. */
  startStoryId: string;
  /** Label for that story. */
  startStoryName: string;
  /** Published stories in this section. */
  storyCount: number;
}

/**
 * The page Storybook opens on.
 *
 * Without it a visitor lands in whichever story sorts first — a single component,
 * with no statement of what this workspace is or how its 412 stories divide. That
 * is a poor first screen for someone arriving from a résumé, and it is the reason
 * the fuller catalog lives on jerryorta.com: this page orients, that one sells.
 *
 * Story links target `_top` rather than the default: a plain link inside the
 * preview iframe would navigate the iframe alone, leaving the manager's sidebar
 * and toolbar pointing at the previous story.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'sb-welcome' },
  imports: [],
  selector: 'sb-welcome',
  styleUrl: './sb-welcome.component.scss',
  templateUrl: './sb-welcome.component.html',
})
export class SbWelcomeComponent {
  protected readonly overviewHref = 'https://jerryorta.com/libraries';

  protected readonly libraries: WelcomeLibrary[] = [
    {
      blurb:
        'Thirty framework-free primitives owning their own CSS custom properties, plus two product domains composed from them.',
      name: 'UI Design Library',
      startStoryId: 'ui-design-library-button--primary',
      startStoryName: 'Button',
      storyCount: 93,
    },
    {
      blurb:
        'Thirty-three chart types on one configuration contract, with composition, annotation and tooltip content as cross-cutting layers.',
      name: 'Charts',
      startStoryId: 'charts-ngechart-composite-charts--bar-with-trend-lines',
      startStoryName: 'Composite charts',
      storyCount: 170,
    },
    {
      blurb:
        'Spreadsheet-grade editing on a virtualized grid — cell ranges, a fill handle, per-column editors and charts inside cells, at ten thousand rows.',
      name: 'Table',
      startStoryId: 'table-ngetable-showcase-usage--usage',
      startStoryName: 'Showcase',
      storyCount: 52,
    },
    {
      blurb:
        'Day, week, month, year and agenda views over one event model, with drag-and-resize and consumer-typed event payloads.',
      name: 'Calendar',
      startStoryId:
        'calendar-ngecalendar-views-week-interactions--drag-and-resize',
      startStoryName: 'Week interactions',
      storyCount: 76,
    },
    {
      blurb:
        'The domain layer of the Ledger demo — a second product built from the same primitives, bridged onto the charts tokens.',
      name: 'Ledger Design Library',
      startStoryId: 'ledger-design-library-donut-chart--primary',
      startStoryName: 'Donut chart',
      storyCount: 19,
    },
    {
      blurb:
        'A safe-area-aware mobile tab bar with roving keyboard focus — the Got You footer navigation, ported as a shared primitive.',
      name: 'Mobile Footer Nav',
      startStoryId: 'mobile-footer-nav-bottom-nav--bottom-nav',
      startStoryName: 'Bottom Nav',
      storyCount: 2,
    },
  ];

  /** The manager URL for one story id. */
  protected storyHref(storyId: string): string {
    return `?path=/story/${storyId}`;
  }
}
