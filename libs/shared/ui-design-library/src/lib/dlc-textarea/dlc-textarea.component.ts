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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-textarea' },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DlcTextareaComponent),
    },
  ],
  selector: 'dlc-textarea',
  styleUrl: './dlc-textarea.component.scss',
  templateUrl: './dlc-textarea.component.html',
})
export class DlcTextareaComponent implements ControlValueAccessor {
  private static _counter = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  readonly disabled = input(false);
  readonly errorText = input<null | string>(null);
  readonly helperText = input<null | string>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly rows = input(4);

  protected readonly _textareaId = `dlc-textarea-${++DlcTextareaComponent._counter}`;
  protected readonly _disabledByForm = signal(false);
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
    this._value = (event.target as HTMLTextAreaElement).value;
    this._onChange(this._value);
  }

  onBlur(): void {
    this._touched = true;
    this._onTouched();
  }
}
