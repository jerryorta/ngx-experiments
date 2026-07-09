import type { ControlValueAccessor } from '@angular/forms';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/**
 * Checkbox with a visible unchecked state on every cg surface tone.
 *
 * The visual box is a sibling span driven by the sr-only native input's
 * `:checked`, so assistive tech and label-association semantics stay native.
 * The unchecked fill reads `--dlc-checkbox-unchecked-bg`, which every cg theme
 * defines to clear 3:1 against BOTH the popover surface
 * (`--dlc-surface-container`) and the row-hover tone
 * (`--dlc-surface-container-high`); raw `--dlc-outline` (the fallback) collides
 * with the hover tone in the dark themes. (Ad-hoc filter checkboxes
 * previously painted `--dlc-surface-container-highest`, which does not exist
 * in the cg token set and fell back to the row-hover tone — rendering
 * unchecked boxes invisible.)
 *
 * Two usage modes:
 * - **Controlled** (filter checklists): bind `checked`, listen to
 *   `checkedChange`; the consumer owns the state. Toggles the consumer does
 *   not echo back never render — the native input snaps back to `checked`.
 * - **Forms** (CVA): bind `ngModel` / `formControl`; form writes drive the
 *   box and user toggles self-apply.
 *
 * Label content (text, icons, descriptions) is projected and participates in
 * the native label's click target. Layout knobs for consumers:
 * `--dlc-checkbox-align` (label align-items, default `center`) and
 * `--dlc-checkbox-box-offset` (box top margin for first-line alignment in
 * multi-line rows, default `0`).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-checkbox--checked]': '_checked()',
    '[class.dlc-checkbox--disabled]': '_isDisabled()',
    class: 'dlc-checkbox',
  },
  imports: [DlcIconDirective],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DlcCheckboxComponent),
    },
  ],
  selector: 'dlc-checkbox',
  styleUrl: './dlc-checkbox.component.scss',
  templateUrl: './dlc-checkbox.component.html',
})
export class DlcCheckboxComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * Id(s) of element(s) describing this checkbox, rendered as
   * `aria-describedby` on the native input. Use alongside `ariaLabel` when the
   * projected content carries a description the accessible name would
   * otherwise drop (aria-label overrides the wrapping label's content).
   */
  readonly ariaDescribedby = input('');
  /** Accessible name for the native input; omit when projected text labels it visually. */
  readonly ariaLabel = input('');
  /** Controlled checked state; ignored while a form binding (CVA) is active. */
  readonly checked = input(false);
  readonly disabled = input(false);
  /** Emits the next checked value on every user toggle (controlled and form modes). */
  readonly checkedChange = output<boolean>();

  /** CVA-written state; `null` until a form writes, letting `checked` drive. */
  private readonly _formChecked = signal<boolean | null>(null);
  private readonly _disabledByForm = signal(false);
  /** True once a form registers — user toggles then self-apply instead of waiting on `checked`. */
  private _isFormBound = false;

  protected readonly _checked = computed(() => this._formChecked() ?? this.checked());
  protected readonly _isDisabled = computed(() => this._disabledByForm() || this.disabled());

  private _onChange: (v: boolean) => void = (_v: boolean) => {
    // noop — replaced by registerOnChange
  };

  private _onTouched: () => void = () => {
    // noop — replaced by registerOnTouched
  };

  writeValue(val: boolean): void {
    this._formChecked.set(!!val);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this._isFormBound = true;
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabledByForm.set(isDisabled);
    this.cdr.markForCheck();
  }

  protected onInputChange(event: Event): void {
    if (this._isDisabled()) return;
    const inputEl = event.target as HTMLInputElement;
    const next = inputEl.checked;
    if (this._isFormBound) {
      this._formChecked.set(next);
    } else {
      // Controlled mode: the click already flipped the DOM input. Snap it back
      // so a consumer that ignores/clamps the emit never shows a desynced box;
      // an accepted echo re-renders via the [checked] binding next CD pass.
      inputEl.checked = this._checked();
    }
    this._onChange(next);
    this._onTouched();
    this.checkedChange.emit(next);
  }
}
