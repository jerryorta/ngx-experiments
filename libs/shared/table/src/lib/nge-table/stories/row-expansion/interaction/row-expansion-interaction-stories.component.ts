import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableEvent } from '../../../../events';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where a detail band's cost to the window becomes visible. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Row expansion, driven — and example 2 is the one the feature is shaped around.
 *
 * Wave 0 shipped the `row-detail` slot and left `state.expanded` for a host to
 * write, on the principle that a slot is a place rather than a state. What was
 * missing was an affordance a *user* could touch, and an answer to what an
 * expanded band costs a virtualized table. The second question is the interesting
 * one: rows are positioned from sizes the virtualizer was given, so a band the
 * arithmetic does not know about puts its row on top of the next one — and the
 * failure is visual rather than thrown, so nothing in jsdom can see it.
 *
 * The answer taken here is a **declared** band height rather than a measured one.
 * Virtualization needs every row's size to be computable before it is rendered;
 * measuring the band would make row height variable, which is a much larger
 * feature and one ARCH-289's frozen scroll baseline would have to be re-read
 * against. The cost is a number a consumer keeps true, and example 2 is where you
 * can see both halves of that bargain at once.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-expansion-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent, NgeTableSlotDirective],
  selector: 'nge-table-row-expansion-interaction-stories',
  standalone: true,
  styleUrl: './row-expansion-interaction-stories.component.scss',
  templateUrl: './row-expansion-interaction-stories.component.html',
})
export class NgeTableRowExpansionInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-expansion/interaction';

  /** The type carrier every `let-` binding below infers its row shape from. */
  readonly rows = rows;

  readonly largeRows = largeRows;

  // ============================================
  // EXAMPLE 1: The flag, on and off
  // ============================================
  //
  // With `enableRowExpansion` off the table must render exactly as it did before
  // the feature existed — no injected column, no chevron, nothing in the tab
  // order. Toggle the control and only the leading column appears.

  readonly enableRowExpansion = input<boolean>(true);

  readonly toggleConfig = computed(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      enableRowExpansion: this.enableRowExpansion(),
      getRowId: row => row.id,
    })
  );

  readonly toggleState = signal<NgeTableState>(createNgeTableState());

  // ============================================
  // EXAMPLE 2: A detail band in a virtualized table
  // ============================================
  //
  // ⚠️ THE EXAMPLE THIS STORY EXISTS FOR. Ten thousand rows at 40px, with a band
  // declared at 160px — four times a row's height, so an overlap would be
  // unmistakable rather than a subtle seam.
  //
  // Open a row near the top and watch the row beneath it move DOWN by the band's
  // height rather than being covered by it. Then scroll: the band travels with
  // its row, the scrollbar has grown by exactly one band, and the rows below stay
  // correctly spaced the whole way. Open several and the effect accumulates.
  //
  // What proves it rather than merely suggesting it: expand a row, scroll to the
  // very bottom, and confirm the last row is still fully reachable. A window
  // whose total size had not grown would end one band short.

  readonly virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableRowExpansion: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 160,
  });

  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  readonly virtualOpenCount = computed(() => {
    const { expanded } = this.virtualState();

    return expanded === true ? largeRows.length : Object.keys(expanded).length;
  });

  // ============================================
  // EXAMPLE 3: Expand-all writes a shorthand, not ten thousand keys
  // ============================================
  //
  // ⚠️ `state.expanded` is `Record<string, boolean> | true`, and the `true` is not
  // a convenience — it is what makes expand-all affordable at this size. Press the
  // header chevron and read the state below: one boolean, not a map with ten
  // thousand entries in it.
  //
  // The consequence every reader has to carry: a predicate that treats this slice
  // as a `Record` is wrong for exactly the gesture most likely to produce a large
  // payload. The band arithmetic, the chevron rendering and the emitted event all
  // handle the shorthand.

  readonly expandAllConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly expandAllState = signal<NgeTableState>(createNgeTableState());

  readonly expandAllJson = computed(() => JSON.stringify(this.expandAllState().expanded, null, 2));

  // ============================================
  // EXAMPLE 4: Disabled, never absent
  // ============================================
  //
  // `enableRowExpansion` takes a predicate over the row DATUM, so only some rows
  // can be opened. The rows it rejects keep their chevron and render it disabled:
  // a control that silently vanished would read as a rendering bug, where a
  // disabled one reads as a rule.
  //
  // The threshold is the fixture's midpoint (`quantity` is `int(1, 500)`), so
  // roughly half the rows are gated. A threshold that rejected one row in
  // twenty-five would demonstrate the rule about as well as no threshold at all.

  readonly gatedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: row => row.quantity > 250,
    getRowId: row => row.id,
  });

  readonly gatedState = signal<NgeTableState>(createNgeTableState());

  readonly gatedOpenableCount = computed(() => rows.filter(row => row.quantity > 250).length);

  // ============================================
  // EXAMPLE 5: The band collapses itself
  // ============================================
  //
  // ⚠️ A projected `ng-template` resolves DI from its DECLARATION injector — the
  // consumer's — so a detail band cannot inject the table and ask it to close.
  // `toggleExpanded` therefore rides on `NgeRowContext` alongside `isExpanded`,
  // the same arrangement ARCH-278's selection control and ARCH-292's editing
  // callbacks use. The close button inside the band below is calling it.

  readonly selfCloseConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
    rowDetailHeight: 140,
  });

  readonly selfCloseState = signal<NgeTableState>(createNgeTableState());

  // ============================================
  // EXAMPLE 6: A domain's own disclosure control
  // ============================================
  //
  // The native chevron is the DEFAULT, not the only option. Project `expand-cell`
  // and `expand-header` and the table wears the consuming app's control instead —
  // the seam ARCH-278 opened for checkboxes, applied to disclosure.
  //
  // ⚠️ The projected control is consulted FIRST and the native one is the `@else`.
  // Written the other way round, a consumer's template would be silently ignored,
  // which is precisely the central-switch-in-front-of-a-seam the epic's
  // extensibility gate audits for.

  readonly projectedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly projectedState = signal<NgeTableState>(createNgeTableState());

  // ============================================
  // EXAMPLE 7: The host drives it, and the table stays quiet
  // ============================================
  //
  // Expansion is ordinary controlled state, so a host can write the slice with no
  // gesture at all — which is exactly what Wave 0 shipped and what a restored
  // saved view does. The buttons below write `state.expanded` from outside.
  //
  // ⚠️ Host-driven state emits NOTHING. Only changes the engine routed announce
  // themselves, or restoring a saved layout would replay as user activity in a
  // consumer's log. Watch the event list: it moves for a chevron and stays still
  // for a button.

  readonly hostDrivenConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly hostDrivenState = signal<NgeTableState>(createNgeTableState());

  readonly hostDrivenEvents = signal<string[]>([]);

  // ============================================
  // EXAMPLE 8: All of it at once
  // ============================================
  //
  // Expansion, selection, pinning and virtualization composed over ten thousand
  // rows — every axis a band has to survive. ⚠️ Note the column order: the
  // chevron leads the checkbox, because it describes the row's own shape where a
  // checkbox describes its membership in a set the user is building. Both are
  // injected, and they agree on the order rather than each forcing itself first.
  //
  // Open a few rows near the top, select some, sort by Name, then scroll: the
  // bands stay with their records, the ticks stay with theirs, and the pinned
  // lanes keep sliding over the center lane without either coming apart.

  readonly composedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enablePinning: true,
    enableRowExpansion: true,
    enableRowSelection: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 120,
  });

  readonly composedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  readonly composedSelectedCount = computed(
    () => Object.keys(this.composedState().rowSelection).length
  );

  // ============================================
  // EXAMPLE 9: The band animates; the rows beneath do not
  // ============================================
  //
  // ⚠️ THE SECTION THAT CANNOT BE CHECKED ANYWHERE BUT A BROWSER, and the pair is
  // the point — the same gesture in the two regimes, side by side.
  //
  // LEFT, in normal flow: the band animates open AND closed, and the rows beneath
  // follow it the whole way. That comes free from the layout, not from any code
  // here — a band in flow pushes its siblings as it grows.
  //
  // RIGHT, in a window: the rows take their new positions in ONE frame and the
  // band grows into the space they made. Closing is instant, deliberately. A row
  // is absolutely positioned at the running total of the sizes the virtualizer was
  // given, so on collapse the row beneath arrives back at its closed offset
  // immediately; a band still animating would go on painting underneath it.
  //
  // Neither table animates the ROWS, and that is ARCH-300's decision rather than
  // an omission. Animating them means transitioning `top` — `transform` is banned
  // in this library because it breaks the sticky pinned lanes (ARCH-245), which is
  // also what rules out GSAP's FLIP plugin, since FLIP animates by applying
  // transforms. `top` transitions layout rather than the compositor, on every
  // rendered row, against the budget ARCH-289 froze.
  //
  // Drive the duration control to `0ms` for the consumer-facing escape, and
  // DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" for
  // the accessibility one. They are independent switches: either alone stops it.

  /** Milliseconds the band takes to open, published as `--nge-table-row-detail-duration`. */
  readonly durationMs = input<number>(180);

  readonly durationCss = computed(() => `${this.durationMs()}ms`);

  readonly flowAnimationConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
    rowDetailHeight: 140,
  });

  readonly flowAnimationState = signal<NgeTableState>(createNgeTableState());

  readonly windowAnimationConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableRowExpansion: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 140,
  });

  readonly windowAnimationState = signal<NgeTableState>(createNgeTableState());

  onToggleState(next: NgeTableState): void {
    this.toggleState.set(next);
  }

  onVirtualState(next: NgeTableState): void {
    this.virtualState.set(next);
  }

  onExpandAllState(next: NgeTableState): void {
    this.expandAllState.set(next);
  }

  onGatedState(next: NgeTableState): void {
    this.gatedState.set(next);
  }

  onSelfCloseState(next: NgeTableState): void {
    this.selfCloseState.set(next);
  }

  onProjectedState(next: NgeTableState): void {
    this.projectedState.set(next);
  }

  onHostDrivenState(next: NgeTableState): void {
    this.hostDrivenState.set(next);
  }

  onComposedState(next: NgeTableState): void {
    this.composedState.set(next);
  }

  onFlowAnimationState(next: NgeTableState): void {
    this.flowAnimationState.set(next);
  }

  onWindowAnimationState(next: NgeTableState): void {
    this.windowAnimationState.set(next);
  }

  /** Log only the expansion kind, so the silence of a host write is legible. */
  onHostDrivenEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'expansion-change') {
      return;
    }

    const open = event.expanded === true ? 'all' : Object.keys(event.expanded).length;

    this.hostDrivenEvents.update(log => [`expansion-change → ${open} open`, ...log].slice(0, 6));
  }

  /** Open the first two rows from outside the table. */
  openFirstTwo(): void {
    this.hostDrivenState.update(state => ({
      ...state,
      expanded: Object.fromEntries(rows.slice(0, 2).map(row => [row.id, true])),
    }));
  }

  /** Write the shorthand directly — the same value expand-all produces. */
  openEverything(): void {
    this.hostDrivenState.update(state => ({ ...state, expanded: true }));
  }

  closeAllHostDriven(): void {
    this.hostDrivenState.update(state => ({ ...state, expanded: {} }));
  }

  clearHostDrivenEvents(): void {
    this.hostDrivenEvents.set([]);
  }
}
