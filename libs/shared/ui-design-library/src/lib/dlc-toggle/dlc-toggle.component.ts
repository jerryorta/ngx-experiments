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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-toggle--checked]': '_checked()',
    '[class.dlc-toggle--disabled]': '_isDisabled()',
    class: 'dlc-toggle',
  },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DlcToggleComponent),
    },
  ],
  selector: 'dlc-toggle',
  styleUrl: './dlc-toggle.component.scss',
  templateUrl: './dlc-toggle.component.html',
})
export class DlcToggleComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly checkedChange = output<boolean>();

  protected readonly _checked = signal(false);
  private readonly _disabledByForm = signal(false);
  protected readonly _isDisabled = computed(() => this._disabledByForm() || this.disabled());

  private _onChange: (v: boolean) => void = (_v: boolean) => {
    // noop — replaced by registerOnChange
  };

  private _onTouched: () => void = () => {
    // noop — replaced by registerOnTouched
  };

  writeValue(val: boolean): void {
    this._checked.set(!!val);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabledByForm.set(isDisabled);
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this._isDisabled()) return;
    const next = !this._checked();
    this._checked.set(next);
    this._onChange(next);
    this._onTouched();
    this.checkedChange.emit(next);
  }
}
