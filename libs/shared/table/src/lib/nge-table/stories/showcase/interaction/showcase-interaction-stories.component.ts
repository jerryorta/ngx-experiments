import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID } from '../../../store';
import { NgeTableShowcaseDemoComponent } from '../showcase-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * The pinning assignment the showcase renders with at rest — a config flag
 * switches the capability on, this state names which columns take it.
 *
 * ⚠️ **The two INJECTED columns are pinned explicitly, and leaving them out is
 * the composition defect this story found.** `applyInjectedColumnOrder` puts
 * expansion then selection at the front of the *column order*, but pinning is a
 * separate axis resolved afterwards and the two know nothing about each other —
 * so pinning any data column left drops the chevron and the checkbox into the
 * scrolling **centre** lane. The row's own controls then scroll off-screen while
 * a data column stays put, which is precisely backwards. Every table that
 * combines pinning with selection or expansion has to name them here.
 */
function showcaseInitialState(): NgeTableState {
  return createNgeTableState({
    columnPinning: {
      left: [NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID, 'name'],
      right: ['createdAt'],
    },
  });
}

/**
 * Every shipped NgeTable feature, on one table, driven — the primary facet,
 * because virtualization, pinning, resize, range drag, the fill handle and
 * inline editing are only verifiable by *doing* them; jsdom lays nothing out.
 *
 * ⚠️ **Construction-time addons (cell highlighting, cell range) are never
 * controls here** — `provideNgeCellHighlighting()` / `provideNgeCellRange()`
 * are fixed on `NgeTableShowcaseDemoComponent`'s own providers, so only the
 * config-gated CAPABILITIES are exposed as `argTypes`. Toggling one off
 * withdraws that capability alone; the marking addons stay live throughout.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-showcase-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableShowcaseDemoComponent],
  selector: 'nge-table-showcase-interaction-stories',
  standalone: true,
  styleUrl: './showcase-interaction-stories.component.scss',
  templateUrl: './showcase-interaction-stories.component.html',
})
export class NgeTableShowcaseInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/showcase/interaction';

  // ── The six config-gated flags — Storybook controls over the demo's own inputs ──

  readonly enableColumnResizing = input<boolean>(true);

  readonly enablePinning = input<boolean>(true);

  readonly enableRowExpansion = input<boolean>(true);

  readonly enableRowSelection = input<boolean>(true);

  readonly enableStriping = input<boolean>(true);

  readonly enableVirtualization = input<boolean>(true);

  readonly rows = signal<NgeTableFixtureRow[]>(rows);

  readonly state = signal<NgeTableState>(showcaseInitialState());

  /** Show the state as JSON — the controlled-state contract is the thing every interaction story demonstrates. */
  readonly stateJson = computed(() => JSON.stringify(this.state(), null, 2));

  /**
   * Open a row the virtualized window has not rendered, from OUTSIDE the table.
   *
   * Host-pushed state is deliberately silent: it emits no `NgeTableEvent`, so
   * this proves the round trip a click on the chevron never shows. Row 6000 of
   * 10,000 is well past the ~30-row window, so the band is already open the
   * moment the user scrolls to it.
   */
  openFarRowFromHost(): void {
    const target = this.rows()[6000];

    this.state.update(current => ({ ...current, expanded: { [target.id]: true } }));
  }

  /** Select the first three rows from outside the table — the other half of the selection round trip. */
  selectFirstThreeFromHost(): void {
    const ids = this.rows()
      .slice(0, 3)
      .map(row => row.id);

    this.state.update(current => ({
      ...current,
      rowSelection: Object.fromEntries(ids.map(id => [id, true])),
    }));
  }

  /** Back to the pinning assignment the table renders with at rest — everything else the user did is dropped. */
  resetState(): void {
    this.state.set(showcaseInitialState());
  }
}
