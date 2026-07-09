import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcPersonaCardPersona = 'broker' | 'buyer' | 'service-provider';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-persona-card--broker]': 'persona() === "broker"',
    '[class.dlc-persona-card--buyer]': 'persona() === "buyer"',
    '[class.dlc-persona-card--service-provider]': 'persona() === "service-provider"',
    class: 'dlc-persona-card',
  },
  imports: [DlcIconDirective, RouterLink],
  selector: 'dlc-persona-card',
  styleUrl: './dlc-persona-card.component.scss',
  templateUrl: './dlc-persona-card.component.html',
})
export class DlcPersonaCardComponent {
  readonly persona = input<DlcPersonaCardPersona>('broker');
  readonly title = input('');
  readonly description = input('');
  readonly ctaLabel = input('Learn more');
  readonly ctaRoute = input('');

  /**
   * Contact-mode inputs (REX-514) — when any are populated, the card renders
   * an inline contact-info block (brokerage / phones / email / license). All
   * default to `null` so existing marketing-mode usages (broker / buyer /
   * service-provider) keep their current presentation unchanged.
   */
  readonly brokerage = input<null | string>(null);
  readonly directPhone = input<null | string>(null);
  readonly officePhone = input<null | string>(null);
  readonly email = input<null | string>(null);
  readonly license = input<null | string>(null);

  readonly iconName = computed(() => {
    const map: Record<DlcPersonaCardPersona, string> = {
      broker: 'real_estate_agent',
      buyer: 'diversity_3',
      'service-provider': 'handshake',
    };
    return map[this.persona()];
  });

  /**
   * `true` when any contact-mode attribute is populated — gates the
   * contact-info block in the template so marketing-mode renders stay clean.
   * (REX-514)
   */
  readonly hasContactInfo = computed(
    () =>
      this.brokerage() !== null ||
      this.directPhone() !== null ||
      this.officePhone() !== null ||
      this.email() !== null ||
      this.license() !== null
  );

  /**
   * `true` when a CTA route is configured. Marketing-mode usages always set
   * one; contact-mode renders (REX-514 listing-agent card) typically don't,
   * so the leaf suppresses the link rather than rendering a dead `href=""`.
   */
  readonly hasCta = computed(() => this.ctaRoute().length > 0);
}
