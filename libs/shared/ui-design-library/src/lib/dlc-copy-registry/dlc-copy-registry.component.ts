import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import type { DlcCopyRegistryItem } from './dlc-copy-registry.model';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcCheckboxComponent } from '../dlc-checkbox/dlc-checkbox.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/**
 * Copy Registry (REX-499) — a clipboard accumulator panel. Each item the user
 * copies (MLS#, address, etc.) lands here so they can review the running set
 * and either flush the whole batch to the system clipboard (`Copy All`) or
 * walk it down individually.
 *
 * Composition lock: dlc-* only — `dlc-button` for actions, `dlc-checkbox` for the
 * auto-clear toggle, `dlc-icon` glyphs. NO Angular Material (the legacy
 * `dlc-copy-registry-panel` referenced `mat-button` / `mat-slide-toggle` / etc.
 * — this rebuild drops them per the REX-385 architectural lock).
 *
 * Controlled component: the consuming page's component-scoped SignalStore (or
 * the page store) owns `items` and `autoClearAfterPaste` and reacts to every
 * emission — `copyAll` / `clearAll` / `removeItem` / `autoClearChange`. The
 * leaf does the actual clipboard write itself via `@angular/cdk/clipboard` so
 * it is fully demonstrable in Storybook with only a local items signal in the
 * stories component; the consumer's job is to mutate state in response.
 *
 * Auto-clear is a hint, not an action: the leaf does NOT clear its own input
 * (it can't — the input is owned upstream); it just emits `copyAll` after the
 * clipboard write so the consumer can call `clearAll()` itself when the flag
 * is set. Keeping the policy outside the leaf means the consumer can layer
 * confirmation / undo without the leaf knowing.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-copy-registry' },
  imports: [DlcButtonComponent, DlcCheckboxComponent, DlcIconDirective],
  selector: 'dlc-copy-registry',
  styleUrl: './dlc-copy-registry.component.scss',
  templateUrl: './dlc-copy-registry.component.html',
})
export class DlcCopyRegistryComponent {
  private readonly clipboard = inject(Clipboard);

  /** Controlled auto-clear flag; mirrored back via {@link autoClearChange}. */
  readonly autoClearAfterPaste = input(false);

  /** Hint shown beneath the empty-state heading. */
  readonly emptyHint = input('Items you copy will appear here');

  /** Heading shown in the empty state when {@link items} is empty. */
  readonly emptyMessage = input('No copied items yet');

  /**
   * The registry contents, newest-first by convention (the leaf does not sort
   * — the consumer's store decides ordering). Empty array shows the empty
   * state and disables the toolbar actions.
   */
  readonly items = input<readonly DlcCopyRegistryItem[]>([]);

  /** Header label; lets a consumer rebrand the panel in another surface. */
  readonly title = input('Copy Registry');

  /** Emits the next auto-clear value on every user toggle. */
  readonly autoClearChange = output<boolean>();

  /** Emits when the user invokes Clear All (only when {@link items} is non-empty). */
  readonly clearAll = output<void>();

  /**
   * Fires AFTER the leaf has written the joined item texts to the system
   * clipboard. The consumer applies auto-clear here.
   */
  readonly copyAll = output<void>();

  /**
   * Fires AFTER the leaf has written a single item's text to the system
   * clipboard. Payload is the item id.
   */
  readonly copyItem = output<string>();

  /** Emits the id of the item the user dismissed with the × button. */
  readonly removeItem = output<string>();

  protected readonly isEmpty = computed(() => this.items().length === 0);
  protected readonly itemCount = computed(() => this.items().length);

  protected onCopyAll(): void {
    // dlc-button disables the inner <button> but the (click) sits on the host,
    // so guard the disabled state here too.
    const list = this.items();
    if (list.length === 0) return;
    const text = list.map(item => item.text).join('\n');
    this.clipboard.copy(text);
    this.copyAll.emit();
  }

  protected onClearAll(): void {
    if (this.isEmpty()) return;
    this.clearAll.emit();
  }

  protected onCopyItem(item: DlcCopyRegistryItem): void {
    this.clipboard.copy(item.text);
    this.copyItem.emit(item.id);
  }

  protected onRemoveItem(id: string): void {
    this.removeItem.emit(id);
  }
}
