import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import type { DlcStarRating } from '../dlc-star-rating/dlc-star-rating.component';

import { DlcBadgeComponent } from '../dlc-badge/dlc-badge.component';
import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcCheckboxComponent } from '../dlc-checkbox/dlc-checkbox.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/** Per-bucket result count for each star rating; missing keys render as `0`. */
export type DlcRatingsFilterCounts = Partial<Record<DlcStarRating, number>>;

/** Top-down checklist row order — five stars at the top, one star at the bottom. */
const CG_RATINGS_FILTER_ROWS: DlcStarRating[] = [5, 4, 3, 2, 1];

/**
 * Post-search ratings checklist (REX-494) — narrows the property-search
 * result set to properties whose persisted user rating matches one of the
 * selected star buckets. One `dlc-checkbox` row per star rating (5★ → 1★)
 * with a filled-stars visual + an optional count badge showing how many of
 * the CURRENT results carry that rating, plus Select All / Clear All bulk
 * actions. No Material — composes the shared `dlc-checkbox` (per the REX-488
 * checkbox convention) + `dlc-badge` + `dlc-button`, mirroring `dlc-status-filter`.
 *
 * Controlled component: the consuming page store owns `selected` and
 * receives every change via `selectedChange`; `counts` drives the per-row
 * badge values (omitted keys render as `0`). Emissions are live — the page
 * store applies the post-search narrowing synchronously (no Algolia
 * round-trip), so the displayed list updates the same tick the user toggles.
 *
 * Property-search is a self-rating surface — the page store reads ratings
 * keyed to the SIGNED-IN USER's `contactId`, so the filter narrows by the
 * user's own ratings; other contacts' ratings are deliberately invisible
 * here (matches the REX-475 `ratingsByPropertyId` contract).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-ratings-filter' },
  imports: [DlcBadgeComponent, DlcButtonComponent, DlcCheckboxComponent, DlcIconDirective],
  selector: 'dlc-ratings-filter',
  styleUrl: './dlc-ratings-filter.component.scss',
  templateUrl: './dlc-ratings-filter.component.html',
})
export class DlcRatingsFilterComponent {
  /**
   * Per-bucket result counts driving each row's badge. Missing keys render as
   * `0`; pass `{}` (the default) to hide live counts entirely while the
   * consumer hasn't computed them yet.
   */
  readonly counts = input<DlcRatingsFilterCounts>({});

  /** Currently selected star ratings; `[]` = no rating narrowing. */
  readonly selected = input<DlcStarRating[]>([]);

  /** Emits the full selection on every user change (row toggle or preset). */
  readonly selectedChange = output<DlcStarRating[]>();

  /** Top-down checklist row order; stable reference for template `@for`. */
  protected readonly _rows = CG_RATINGS_FILTER_ROWS;

  /** Selection as a Set for O(1) row-checked lookups. */
  protected readonly _selectedSet = computed<Set<DlcStarRating>>(() => new Set(this.selected()));

  protected readonly _selectedCount = computed(() => this._selectedSet().size);

  /** Filled-star icon indexes for a row's `rating` value. */
  protected filledStars(rating: DlcStarRating): number[] {
    return Array.from({ length: rating }, (_, i) => i + 1);
  }

  /** Empty-star icon indexes — the complement of `filledStars` up to 5. */
  protected emptyStars(rating: DlcStarRating): number[] {
    return Array.from({ length: 5 - rating }, (_, i) => i + 1);
  }

  protected isSelected(rating: DlcStarRating): boolean {
    return this._selectedSet().has(rating);
  }

  /** Reads the per-row count from the `counts` map, falling back to `0`. */
  protected countFor(rating: DlcStarRating): number {
    return this.counts()[rating] ?? 0;
  }

  protected selectAll(): void {
    this.selectedChange.emit([...CG_RATINGS_FILTER_ROWS]);
  }

  protected clearAll(): void {
    // dlc-button disables the inner <button> but the (click) sits on the host,
    // so guard the disabled state here too.
    if (this._selectedCount() === 0) return;
    this.selectedChange.emit([]);
  }

  /** Adds or removes one rating, preserving the 5→1 descending emit order. */
  protected toggle(rating: DlcStarRating): void {
    const next = new Set(this._selectedSet());
    if (next.has(rating)) {
      next.delete(rating);
    } else {
      next.add(rating);
    }
    this.selectedChange.emit(CG_RATINGS_FILTER_ROWS.filter(r => next.has(r)));
  }
}
