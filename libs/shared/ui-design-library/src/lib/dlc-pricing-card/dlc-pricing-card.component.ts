import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

export type DlcPricingCardBillingPeriod = 'annual' | 'monthly';
export type DlcPricingCardPrice = 'custom' | 'free' | number;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-pricing-card--featured]': 'featured()',
    class: 'dlc-pricing-card',
  },
  imports: [],
  selector: 'dlc-pricing-card',
  styleUrl: './dlc-pricing-card.component.scss',
  templateUrl: './dlc-pricing-card.component.html',
})
export class DlcPricingCardComponent {
  readonly planName = input('');
  readonly price = input<DlcPricingCardPrice>(0);
  readonly billingPeriod = input<DlcPricingCardBillingPeriod>('monthly');
  readonly features = input<string[]>([]);
  readonly ctaLabel = input('Get started');
  readonly featured = input(false);

  readonly ctaClick = output<void>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
