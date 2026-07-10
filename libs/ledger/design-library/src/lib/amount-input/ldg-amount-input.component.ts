import type { ControlValueAccessor } from '@angular/forms';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { parseMoney } from '@nge/ledger-utils';

/**
 * A money field that stores an integer-cents value — the model everything
 * else in Ledger uses — behind a plain decimal dollar string a person can
 * type normally: no thousands commas or currency symbol inside the editable
 * text, just a leading "$" adornment next to it (see the template).
 *
 * Commit behavior (on input AND on blur, via `parseMoney`):
 * - Empty text commits `null` — "no amount entered", distinct from a real
 *   $0.00 transaction.
 * - Unparseable text (mid-typing states like `"12."`/`"-"`, or outright
 *   garbage) is simply NOT committed — `onChange` isn't called and the
 *   display isn't touched while it's still being typed. On blur, if the
 *   field is left unparseable, the display reverts to the last value that
 *   DID commit, rather than silently coercing garbage into 0.
 * - When `allowNegative` is false (the default), a parsed negative amount
 *   is clamped to 0.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-amount-input' },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LdgAmountInputComponent),
    },
  ],
  selector: 'ldg-amount-input',
  styleUrl: './ldg-amount-input.component.scss',
  templateUrl: './ldg-amount-input.component.html',
})
export class LdgAmountInputComponent implements ControlValueAccessor {
  private static _counter = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  readonly label = input('');
  readonly placeholder = input('0.00');
  readonly allowNegative = input(false);

  protected readonly _inputId = `ldg-amount-input-${++LdgAmountInputComponent._counter}`;
  protected readonly _disabledByForm = signal(false);
  protected _value = '';
  private _lastCommittedCents: number | null = null;

  private _onChange: (cents: number | null) => void = () => {
    // noop — replaced by registerOnChange
  };

  private _onTouched: () => void = () => {
    // noop — replaced by registerOnTouched
  };

  writeValue(cents: number | null): void {
    this._lastCommittedCents = cents;
    this._value = cents == null ? '' : (cents / 100).toFixed(2);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (cents: number | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabledByForm.set(isDisabled);
    this.cdr.markForCheck();
  }

  onInput(event: Event): void {
    this._value = (event.target as HTMLInputElement).value;
    this._tryCommit(this._value);
  }

  onBlur(): void {
    this._onTouched();
    this._tryCommit(this._value);
    // Resync the display to whatever last committed — normalizes a valid
    // entry (e.g. "12" -> "12.00") and reverts anything left unparseable.
    this._value = this._lastCommittedCents == null ? '' : (this._lastCommittedCents / 100).toFixed(2);
    this.cdr.markForCheck();
  }

  private _tryCommit(raw: string): void {
    const trimmed = raw.trim();

    if (trimmed === '') {
      this._lastCommittedCents = null;
      this._onChange(null);
      return;
    }

    let cents: number;
    try {
      cents = parseMoney(trimmed);
    } catch {
      return; // mid-typing or invalid — leave the last committed value alone
    }

    if (!this.allowNegative() && cents < 0) {
      cents = 0;
    }

    this._lastCommittedCents = cents;
    this._onChange(cents);
  }
}
