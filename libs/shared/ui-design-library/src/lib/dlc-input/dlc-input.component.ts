import type { ControlValueAccessor } from '@angular/forms';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

export type DlcInputType = 'date' | 'email' | 'number' | 'password' | 'tel' | 'text' | 'url';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-input' },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DlcInputComponent),
    },
  ],
  selector: 'dlc-input',
  styleUrl: './dlc-input.component.scss',
  templateUrl: './dlc-input.component.html',
})
export class DlcInputComponent implements ControlValueAccessor {
  private static _counter = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  readonly allowVisibilityToggle = input(false);
  readonly disabled = input(false);
  readonly errorText = input<null | string>(null);
  readonly helperText = input<null | string>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input<DlcInputType>('text');

  protected readonly _inputId = `dlc-input-${++DlcInputComponent._counter}`;
  protected readonly _disabledByForm = signal(false);
  protected readonly _visible = signal(false);
  protected readonly _showVisibilityToggle = computed(
    () => this.type() === 'password' && this.allowVisibilityToggle()
  );
  protected readonly _effectiveType = computed<DlcInputType>(() =>
    this.type() === 'password' && this._visible() ? 'text' : this.type()
  );
  protected _value = '';
  protected _touched = false;

  private _onChange: (v: string) => void = (_v: string) => {
    // noop — replaced by registerOnChange
  };

  private _onTouched: () => void = () => {
    // noop — replaced by registerOnTouched
  };

  writeValue(val: string): void {
    this._value = val ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string) => void): void {
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
    this._onChange(this._value);
  }

  onBlur(): void {
    this._touched = true;
    this._onTouched();
  }

  protected toggleVisibility(): void {
    this._visible.update(v => !v);
  }
}
