import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcBadgeComponent } from '../dlc-badge/dlc-badge.component';
import { DlcCheckboxComponent } from '../dlc-checkbox/dlc-checkbox.component';

/**
 * Favorites filter (REX-493) — a single "Favorites only" checkbox that
 * narrows the property-search results to the current user's starred
 * properties, with a count badge showing how many of the current results are
 * favorites. No Material — composes the shared `dlc-checkbox` (per the REX-488
 * checkbox convention) + `dlc-badge`.
 *
 * Controlled component: the consuming page store owns `enabled` and receives
 * every toggle via `enabledChange`; `count` drives the badge (pass `null` to
 * hide it). Emissions are live — the page store applies the post-search
 * narrowing synchronously (no Algolia round-trip).
 *
 * v1 is "my favorites" only. A by-user / mutual-favorites dropdown is
 * deliberately deferred: the property-search surface carries no task/contact
 * context to define "mutual", and an org-level mutual would expose other
 * users' private stars (a per-uid privacy gate that hasn't shipped). Tracked
 * as a REX-385 follow-up child.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-favorites-filter' },
  imports: [DlcBadgeComponent, DlcCheckboxComponent],
  selector: 'dlc-favorites-filter',
  styleUrl: './dlc-favorites-filter.component.scss',
  templateUrl: './dlc-favorites-filter.component.html',
})
export class DlcFavoritesFilterComponent {
  /** Favorites in the current result set; drives the count badge. `null` hides it. */
  readonly count = input<null | number>(null);

  /** Controlled toggle state — `true` narrows results to favorites. */
  readonly enabled = input(false);

  /** Emits the next enabled value on every user toggle. */
  readonly enabledChange = output<boolean>();
}
