/**
 * `@nge/table/editors` — the table's own cell editors (ARCH-293).
 *
 * The library's **third** entry point, and a secondary one for the same reason
 * `@nge/table/testing` is: what ships from `@nge/table` should be
 * what every table needs. An editor is optional — most tables display rather than
 * edit — and keeping the controls out of the production barrel makes that
 * **structural** rather than a matter of discipline.
 *
 * ⚠️ **It also keeps a dependency out.** The core reaches nothing here, so a
 * dependency an editor needs is an editor's dependency and never the table's.
 * `entry-points.spec.ts` walks the barrel's import closure and fails if that ever
 * stops being true, because "the core does not import this" is the kind of claim
 * that decays silently the first time someone adds a convenient re-export.
 *
 * An editor is named on the column, not projected as a template:
 *
 * ```ts
 * import { NgeCellInputComponent } from '@nge/table/editors';
 *
 * { accessorKey: 'name', header: 'Name', id: 'name',
 *   meta: { ngeEdit: { editor: NgeCellInputComponent, enabled: true } } }
 * ```
 *
 * A `[ngeCell]` template for the same column still wins — these are defaults a
 * consumer's own control shadows, never a fixture it has to work around.
 *
 * ⚠️ **`@angular/cdk` enters the workspace's table library HERE and nowhere else**
 * (ARCH-294). `<nge-cell-select>` and `<nge-cell-textarea>` need an overlay because
 * a panel has to escape `.nge-table__cell`'s `overflow: hidden`; the core needs
 * nothing of the sort, and `entry-points.spec.ts` asserts the production barrel never
 * reaches it — the exact claim this entry point exists to make structural.
 *
 * `nge-cell-editor-focus.ts` and `nge-cell-editor-panel.ts` are deliberately NOT
 * exported. They hold rules the editors share — when to focus, which tokens a
 * body-level panel must be handed — and a consumer has no editor of ours to apply
 * them to. Exporting them would turn two internal invariants into surface to keep
 * compatible.
 */
export * from './nge-cell-checkbox.component';
export * from './nge-cell-input.component';
export * from './nge-cell-select-option';
export * from './nge-cell-select.component';
export * from './nge-cell-textarea.component';
