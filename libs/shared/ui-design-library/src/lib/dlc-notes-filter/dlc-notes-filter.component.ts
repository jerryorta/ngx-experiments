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
 * Notes filter (REX-495) — a single "Has notes only" checkbox that narrows the
 * property-search results to the properties the current user has a saved note
 * on (REX-503 `+property-notes`), with a count badge showing how many of the
 * current results have a note. No Material — composes the shared `dlc-checkbox`
 * (per the REX-488 checkbox convention) + `dlc-badge`, mirroring the REX-493
 * `dlc-favorites-filter` toggle.
 *
 * Controlled component: the consuming page store owns `enabled` and receives
 * every toggle via `enabledChange`; `count` drives the badge (pass `null` to
 * hide it). Emissions are live — the page store applies the post-search
 * narrowing synchronously (no Algolia round-trip), reading the already-fetched
 * results against the user's persisted `Set<propertyId>` of noted properties.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-notes-filter' },
  imports: [DlcBadgeComponent, DlcCheckboxComponent],
  selector: 'dlc-notes-filter',
  styleUrl: './dlc-notes-filter.component.scss',
  templateUrl: './dlc-notes-filter.component.html',
})
export class DlcNotesFilterComponent {
  /** Noted properties in the current result set; drives the count badge. `null` hides it. */
  readonly count = input<null | number>(null);

  /** Controlled toggle state — `true` narrows results to properties with a note. */
  readonly enabled = input(false);

  /** Emits the next enabled value on every user toggle. */
  readonly enabledChange = output<boolean>();
}
