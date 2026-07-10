import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { LdgThemeSwitcherComponent } from '@nge/ledger-design-library';
import { LedgerFacade } from '@nge/ledger-store';
import { STORYBOOK_THEME_CONFIGS } from '@nge/storybook';
import { DlcIconDirective } from '@nge/ui-design-library';

import { ThemeStore } from './theme.store';

/** Every persona class, so the `<body>` mirror can clear the previous one before adding the next. */
const ALL_THEME_CSS_CLASSES: string[] = STORYBOOK_THEME_CONFIGS.map(theme => theme.cssClass);

interface NavLink {
  /** Material Symbol name for `[dlcIcon]`. */
  icon: string;
  label: string;
  path: string;
}

const NAV_LINKS: NavLink[] = [
  { icon: 'dashboard', label: 'Overview', path: '/overview' },
  { icon: 'receipt_long', label: 'Transactions', path: '/transactions' },
  { icon: 'savings', label: 'Budgets', path: '/budgets' },
];

/**
 * The Ledger app shell — global nav chrome, the persona theme-switcher
 * showpiece, and the router outlet. Owns the two app-root concerns: it fires
 * the one-shot mock `load()` and mirrors the active persona class onto `<body>`
 * so EVERY surface (including CDK overlays that mount outside this component)
 * re-themes when the user switches personas.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DlcIconDirective, LdgThemeSwitcherComponent],
  providers: [ThemeStore],
  selector: 'ldg-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly facade = inject(LedgerFacade);

  protected readonly themeStore = inject(ThemeStore);
  protected readonly navLinks = NAV_LINKS;
  protected readonly themeConfigs = STORYBOOK_THEME_CONFIGS;

  constructor() {
    // One-shot mock "backend" load — populates every LedgerFacade signal the
    // screens read. Fired once here since AppComponent is the single root.
    this.facade.load();

    // Mirror the active persona onto <body>: CDK overlays (dialogs, drawers,
    // selects, date-pickers) render in a container appended to <body>, so the
    // persona class must live there — not just on ldg-root — for the overlay's
    // --dlc-*/--ldg-* tokens to resolve. Swap (remove-all-then-add) rather than
    // overwrite className, to preserve runtime classes CDK adds to <body>.
    effect(() => {
      const active = this.themeStore.activeCssClass();
      const body = this.document.body;
      body.classList.remove(...ALL_THEME_CSS_CLASSES);
      body.classList.add(active);
    });
  }
}
