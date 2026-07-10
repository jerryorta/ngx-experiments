import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import type { Category } from '@nge/ledger-models';

import { DlcIconDirective } from '@nge/ui-design-library';

/**
 * A selectable chip for one spending/income category — the category filter
 * row on Transactions and the category picker in the add/edit dialog.
 * Purely presentational: renders `category` and emits `toggled` on click;
 * the caller (a store/parent) owns which chip(s) are actually selected.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-category-chip' },
  imports: [DlcIconDirective],
  selector: 'ldg-category-chip',
  styleUrl: './ldg-category-chip.component.scss',
  templateUrl: './ldg-category-chip.component.html',
})
export class LdgCategoryChipComponent {
  readonly category = input.required<Category>();
  readonly selected = input(false);

  readonly toggled = output<Category>();

  protected onClick(): void {
    this.toggled.emit(this.category());
  }
}
