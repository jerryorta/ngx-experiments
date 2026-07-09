import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

export type DlcBillingToggleValue = 'annual' | 'monthly';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-billing-toggle--annual]': 'value() === "annual"',
    class: 'dlc-billing-toggle',
  },
  imports: [],
  selector: 'dlc-billing-toggle',
  styleUrl: './dlc-billing-toggle.component.scss',
  templateUrl: './dlc-billing-toggle.component.html',
})
export class DlcBillingToggleComponent {
  readonly annualDiscountLabel = input('Save ~20%');
  readonly value = input<DlcBillingToggleValue>('monthly');
  readonly valueChange = output<DlcBillingToggleValue>();

  select(option: DlcBillingToggleValue): void {
    this.valueChange.emit(option);
  }
}
